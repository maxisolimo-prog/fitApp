import { Component, computed, effect, inject, signal, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from './icon.component';
import { WorkoutStore } from './core/workout-store';
import { SyncService, type SyncStatus } from './core/sync.service';
import { SwUpdate } from '@angular/service-worker';
import { estimateRoutineMinutes, lastSetsFor, localDate, parseLocalDate, parseSessionSwaps, personalRecords, plannedRoutineId, recordSwap, setPauses, swapOrigin, suggestProgression, suggestWeeklyPlan, weekDates, workoutSummaryText, workoutVolume, workoutDurationMinutes, type ProgressionSuggestion, type SessionSwaps } from './core/workout-utils';
import { MOVEMENT_LABELS, substitutesFor } from './core/movements';
import { Routine, Profile, Workout, Exercise, WorkoutSet } from './core/models';
import { RoutineEditorComponent } from './features/routine-editor.component';
import { ExerciseDetailComponent } from './features/exercise-detail.component';
import { ExerciseThumbComponent } from './features/exercise-thumb.component';
import { BodySpriteComponent } from './features/body-sprite';
import { BRAND } from './brands/brand.token';
import { BackClose } from './back-close';

type View = 'home'|'routines'|'calendar'|'progress'|'library'|'profile'|'workout'|'editor';
@Component({
  selector:'app-root', standalone:true,
  imports:[CommonModule, FormsModule, IconComponent, RoutineEditorComponent, ExerciseDetailComponent, ExerciseThumbComponent, BodySpriteComponent],
  templateUrl:'./app.component.html'
})
export class AppComponent implements OnDestroy {
  readonly store = inject(WorkoutStore);
  /** Marca activa: nombre, logo y funciones disponibles. No cambia con la app abierta. */
  readonly brand = inject(BRAND);
  readonly nav: {id:View; label:string; icon:string}[] = [
    {id:'home', label:'Mi espacio', icon:'home'},
    {id:'routines', label:'Mis rutinas', icon:'dumbbell'},
    {id:'calendar', label:'Calendario', icon:'calendar'},
    {id:'progress', label:'Mi progreso', icon:'chart'},
    {id:'library', label:'Biblioteca', icon:'book'},
  ];
  readonly view = signal<View>(this.initialView());
  readonly today = localDate();
  readonly now = signal(Date.now());
  readonly toast = signal('');
  readonly online = signal(navigator.onLine);
  readonly selectedRoutine = signal<Routine|null>(null);
  readonly selectedExercise = signal<Exercise|null>(null);
  readonly selectedHistory = signal<Workout|null>(null);
  /** Ficha de un ejercicio abierta encima de la sesión. La sesión sigue montada debajo: no se pierde nada de lo cargado. */
  readonly sessionExercise = signal<Exercise|null>(null);
  /** Hay una hoja abierta: lo de atrás queda inactivo para el teclado y los lectores de pantalla. */
  readonly sheetOpen = computed(() => !!this.sessionExercise() || !!this.substituteOptions());
  /** Serie de la sesión cuyo comentario se está escribiendo (su posición en la sesión). */
  readonly noteEditing = signal<number|null>(null);
  /** Entrenamiento abierto en el historial: segundos desde la serie anterior, y si alguna serie tiene hora. */
  readonly historyPauses = computed(() => { const workout = this.selectedHistory(); return workout ? setPauses(workout) : []; });
  readonly historyHasTimes = computed(() => this.selectedHistory()?.sets.some(set => !!set.completedAt) ?? false);
  /** Ejercicio de la sesión que se está por cambiar (hoja "Cambiar ejercicio") y el reemplazo elegido. */
  readonly substituting = signal<Exercise|null>(null);
  readonly substituteChoice = signal<string|null>(null);
  /** Reemplazos hechos en la sesión en curso: el reemplazo hereda el descanso y el objetivo del ejercicio que reemplazó. */
  readonly sessionSwaps = signal<SessionSwaps|null>(this.savedSwaps());
  /** Con qué se puede reemplazar: primero el mismo movimiento, después el mismo grupo muscular. */
  readonly substituteOptions = computed(() => {
    const from = this.substituting(), workout = this.store.activeWorkout();
    if (!from || !workout) return null;
    const inSession = new Set(workout.sets.map(set => set.exerciseId));
    const row = (exercise: Exercise) => {
      const last = lastSetsFor(this.store.history(), exercise.id)[0];
      return { exercise, used: inSession.has(exercise.id), last: !last ? '' : last.weight > 0 ? `${this.fmt(last.weight)} kg × ${last.reps}` : `${last.reps} repeticiones` };
    };
    const { sameMovement, sameGroup } = substitutesFor(from, this.store.exercises());
    return [
      { title: 'Mismo movimiento', detail: MOVEMENT_LABELS[from.movement], rows: sameMovement.map(row) },
      { title: 'Mismo grupo muscular', detail: from.muscle, rows: sameGroup.map(row) },
    ].filter(section => section.rows.length);
  });
  private sheetTrigger: HTMLElement|null = null;
  readonly confirmation = signal<'discard'|'delete'|'import'|null>(null);
  readonly weekOffset = signal(0);
  readonly restUntil = signal(this.savedRest());
  readonly restSeconds = computed(() => Math.max(0, Math.ceil((this.restUntil() - this.now())/1000)));
  readonly weeks = computed(() => { const date = new Date(); date.setDate(date.getDate()+7*this.weekOffset()); return weekDates(date); });
  readonly thisWeek = weekDates(new Date());
  readonly weekWorkouts = computed(() => this.store.history().filter(w => this.thisWeek.includes(localDate(new Date(w.finishedAt!)))));
  readonly weekCount = computed(() => this.weekWorkouts().length);
  readonly weekMinutes = computed(() => this.weekWorkouts().reduce((s,w) => s+workoutDurationMinutes(w),0));
  readonly totalVolume = computed(() => this.store.history().reduce((s,w) => s+workoutVolume(w),0));
  readonly goalPercent = computed(() => Math.min(100,Math.round(this.weekCount()/this.store.profile().weeklyGoal*100)));
  /** What today holds: a planned routine, an explicit rest day, or nothing planned at all. */
  readonly todayPlan = computed<'routine'|'rest'|'none'>(() => {
    if (this.plannedRoutine(this.today)) return 'routine';
    return this.hasAnyPlan() ? 'rest' : 'none';
  });
  readonly hasAnyPlan = computed(() => this.store.weeklyPlan().some(slot => slot !== null) || this.store.schedule().length > 0);
  readonly suggestedRoutine = computed(() =>
    this.plannedRoutine(this.today) ?? this.store.routines().find(r => r.id === 'full-body') ?? this.store.routines()[0]);
  readonly calendarMode = signal<'week'|'month'>('week');
  readonly monthOffset = signal(0);
  readonly selectedDate = signal(localDate());
  readonly weekdayNames = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  /** Month grid starting on Monday; null cells pad the first week. */
  readonly monthCells = computed(() => {
    const now = new Date();
    const first = new Date(now.getFullYear(), now.getMonth() + this.monthOffset(), 1, 12);
    const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    const pad = (first.getDay() + 6) % 7;
    return [...Array.from({ length: pad }, () => null), ...Array.from({ length: days }, (_, i) => localDate(new Date(first.getFullYear(), first.getMonth(), i + 1, 12)))];
  });
  readonly monthLabel = computed(() => {
    const now = new Date();
    const label = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(new Date(now.getFullYear(), now.getMonth() + this.monthOffset(), 1, 12));
    return label.charAt(0).toUpperCase() + label.slice(1);
  });
  readonly completedSets = computed(() => this.store.activeWorkout()?.sets.filter(s=>s.completed).length ?? 0);
  /** Avance de la sesión en curso, de 0 a 100. */
  readonly sessionPercent = computed(() => { const total = this.store.activeWorkout()?.sets.length ?? 0; return total ? Math.round(this.completedSets() / total * 100) : 0; });
  readonly elapsed = computed(() => { const w=this.store.activeWorkout(); return w ? Math.max(0,Math.floor((this.now()-Date.parse(w.startedAt))/1000)) : 0; });
  readonly workoutGroups = computed(() => {
    const w=this.store.activeWorkout(); if (!w) return [];
    return [...new Set(w.sets.map(s=>s.exerciseId))].map(id=>{
      const sets=w.sets.map((set,index)=>({set,index})).filter(s=>s.set.exerciseId===id);
      // Dónde se ofrece comentar: la última serie completada del ejercicio que todavía no tiene comentario.
      const comment=sets.filter(row=>row.set.completed&&row.set.completedAt&&!row.set.note)
        .reduce<{set:WorkoutSet;index:number}|null>((last,row)=>!last||row.set.completedAt!>=last.set.completedAt!?row:last,null);
      return {id,exercise:this.exercise(id),sets,comment};
    });
  });
  search=''; muscle='Todos'; routineFilter='Todas';
  calendarDate=this.today; calendarRoutine='full-body'; calendarForm=false;
  profileDraft: Profile={...this.store.profile()}; profileError='';
  weightValue: number|null=null; weightDate=this.today; weightError='';
  editingRoutine: Routine|null=null;
  pendingImport=''; readonly importError=signal('');
  /** Chrome/Edge (Android, desktop) hand us this event so a button can open the native install dialog. */
  readonly installPrompt = signal<{ prompt(): Promise<unknown>; userChoice: Promise<{ outcome: string }> } | null>(null);
  readonly installed = signal(typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true));
  /** iPhone/iPad: Apple only allows installing from the Share menu, never from a button. */
  readonly isIos = typeof navigator !== 'undefined' && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
  readonly installHelp = signal(false);
  private interval = setInterval(()=>this.now.set(Date.now()),1000);
  private toastTimer: ReturnType<typeof setTimeout>|undefined;

  private lastFocus: HTMLElement|null=null;
  readonly lastWorkout = computed(() => this.store.history()[0] ?? null);
  readonly recentWeights = computed(() => this.store.weights().slice(-8).reverse());
  readonly levels = ['Principiante','Intermedio','Avanzado'] as const;
  readonly routineFilters = ['Todas','Principiante','Intermedio','Avanzado','Mis creaciones'];
  private readonly numberFormat = new Intl.NumberFormat('es-AR',{maximumFractionDigits:1});

  readonly sync = inject(SyncService);
  private readonly swUpdate = inject(SwUpdate);
  private userInteracted = false;
  readonly updateReady = signal(false);
  reloadApp(){this.sync.flush();location.reload();}
  readonly accountMode = signal<'login'|'register'>('login');
  accountEmail=''; accountPassword=''; deletePassword='';
  readonly syncLabels: Record<SyncStatus,string> = {
    local:'Sin cuenta', checking:'Conectando…', syncing:'Guardando en tu cuenta…', synced:'Sincronizado',
    offline:'Sin conexión: se envía al volver', error:'No se pudo sincronizar', conflict:'Elegí qué datos conservar',
  };

  private readonly backClose = inject(BackClose);
  /** La hoja abierta ocupa una entrada del historial (ver BackClose): el botón Atrás del teléfono la cierra en lugar de salir de la sesión. */
  private closeSheetLayer: (() => void) | null = null;
  private pushSheetHistory(){if(this.closeSheetLayer)return;this.closeSheetLayer=this.backClose.open(()=>{this.closeSheetLayer=null;this.closeSheet();});}
  private popSheetHistory(){const close=this.closeSheetLayer;this.closeSheetLayer=null;close?.();}
  /** "Saltar al contenido" mueve el foco sin tocar la dirección: cambiar el hash se tomaría como ir a Inicio. */
  skipToContent(event:Event){event.preventDefault();document.getElementById('contenido')?.focus();}

  constructor(){
    // Las hojas y el comentario a medio escribir son de la sesión: si la sesión desaparece (otra pestaña la terminó,
    // llegó otra copia de la cuenta), se cierran solos y lo de atrás vuelve a responder.
    effect(() => { if (!this.store.activeWorkout()) { this.popSheetHistory(); this.dropSheets(); this.noteEditing.set(null); } });
    // Zoneless: move focus into an open dialog once it renders, and restore it afterwards.
    effect(() => {
      if (this.confirmation() || this.sync.conflict()) { this.lastFocus ??= document.activeElement as HTMLElement|null; setTimeout(() => (document.querySelector('.dialog button') as HTMLElement|null)?.focus()); }
      else if (this.lastFocus) { const el=this.lastFocus; this.lastFocus=null; setTimeout(() => { if (el.isConnected) el.focus(); }); }
    });
    void this.sync.init();
    // The service worker serves the cached version first and downloads a new one in the background.
    // Before the user touches anything (and with no workout in progress) apply it at once; otherwise offer a button.
    if (this.swUpdate.isEnabled) {
      // A broken cached version cannot recover by itself: load a fresh copy.
      this.swUpdate.unrecoverable.subscribe(() => location.reload());
      void this.swUpdate.checkForUpdate().catch(() => false);
      this.swUpdate.versionUpdates.subscribe((event) => {
        if (event.type !== 'VERSION_READY') return;
        // Not touched yet (or nothing in progress right after opening): switch now. Otherwise ask, never interrupt.
        if (!this.userInteracted && !this.store.activeWorkout()) this.reloadApp(); else this.updateReady.set(true);
      });
    }
  }

  async submitAccount(){
    const email=this.accountEmail.trim(), password=this.accountPassword;
    const ok = this.accountMode()==='register' ? await this.sync.register(email,password) : await this.sync.login(email,password);
    if(!ok) return;
    this.accountPassword=''; this.profileDraft={...this.store.profile()};
    this.notify(this.accountMode()==='register' ? 'Cuenta creada. Tus datos se guardan también en el servidor.' : 'Ingresaste a tu cuenta.');
  }
  async logout(){if(await this.sync.logout()){this.profileDraft={...this.store.profile()};this.notify('Cerraste sesión. Tus datos quedan guardados en tu cuenta.');}}
  async deleteAccount(){const ok=await this.sync.deleteAccount(this.deletePassword);this.deletePassword='';if(ok)this.notify('Cuenta eliminada. Tus datos siguen en este dispositivo.');}
  async resolveConflict(keep:'server'|'local'){await this.sync.resolveConflict(keep);this.profileDraft={...this.store.profile()};this.notify(keep==='server'?'Usás los datos de tu cuenta.':'Tu cuenta ahora tiene los datos de este dispositivo.');}
  @HostListener('document:pointerdown') @HostListener('document:keydown') interacted(){this.userInteracted=true;}
  @HostListener('document:visibilitychange') visibilityChanged(){
    // Hidden: when the app comes back it counts as freshly opened, so a pending update can apply itself.
    if(document.visibilityState==='hidden'){this.sync.flush();this.userInteracted=false;return;}
    // Back to the app (e.g. reopened from the home screen): look for a newer version.
    if(this.swUpdate.isEnabled) void this.swUpdate.checkForUpdate().catch(()=>false);
  }

  openSessionExercise(exercise:Exercise, trigger:HTMLElement){this.sheetTrigger=trigger;this.sessionExercise.set(exercise);this.pushSheetHistory();this.focusSheet();}
  /** Cierra la hoja abierta y devuelve el foco a quien la abrió. */
  closeSheet(){if(!this.sheetOpen())return;this.popSheetHistory();this.dropSheets();const trigger=this.sheetTrigger;this.sheetTrigger=null;setTimeout(()=>{if(trigger?.isConnected)trigger.focus();});}
  private dropSheets(){this.sessionExercise.set(null);this.substituting.set(null);this.substituteChoice.set(null);}
  hasPending(rows:{set:WorkoutSet}[]){return rows.some(row=>!row.set.completed);}
  editNote(index:number){this.noteKey=this.setKey(index);this.noteEditing.set(index);setTimeout(()=>document.getElementById('set-note-'+index)?.focus());}
  /** Qué serie es la que ocupa una posición: si la sesión cambia mientras se escribe, el comentario no va a otra serie. */
  private noteKey='';
  private setKey(index:number){const workout=this.store.activeWorkout();const set=workout?.sets[index];return workout&&set?workout.id+'|'+set.exerciseId+'|'+set.setNumber:'';}
  /** Guarda al salir del campo o con Enter. Con Enter el foco vuelve al botón del comentario. */
  commitNote(index:number,value:string,refocus:boolean){
    if(this.noteEditing()!==index)return;
    this.noteEditing.set(null);
    if(this.setKey(index)!==this.noteKey){this.notify('La sesión cambió mientras escribías: el comentario no se guardó.');return;}
    if(!this.store.setSetNote(index,value))this.notify(this.store.actionError()??'No se pudo guardar el comentario.');
    if(refocus)this.focusNoteButton(index);
  }
  cancelNote(index:number){if(this.noteEditing()!==index)return;this.noteEditing.set(null);this.focusNoteButton(index);}
  private focusNoteButton(index:number){setTimeout(()=>(document.querySelector('[data-note-button="'+index+'"]') as HTMLElement|null)?.focus());}
  /** "+45 s", "+2 min 10 s", "+1 h 5 min": a propósito distinto de una hora del día, para que no se confundan. */
  pauseLabel(seconds:number){
    if(seconds<60)return `+${seconds} s`;
    const minutes=Math.floor(seconds/60), rest=seconds%60;
    if(minutes>=60){const left=minutes%60;return `+${Math.floor(minutes/60)} h${left?` ${left} min`:''}`;}
    return `+${minutes} min${rest?` ${rest} s`:''}`;
  }
  timeLabel(iso:string){return new Intl.DateTimeFormat('es-AR',{hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(iso));}
  openSubstitute(exercise:Exercise, trigger:HTMLElement){this.sheetTrigger=trigger;this.substituteChoice.set(null);this.substituting.set(exercise);this.pushSheetHistory();this.focusSheet();}
  /** Flechas sobre las opciones de reemplazo: pasan a la siguiente o a la anterior y la eligen, como en cualquier grupo de opciones. */
  swapKey(event:KeyboardEvent){
    const step=event.key==='ArrowDown'||event.key==='ArrowRight'?1:event.key==='ArrowUp'||event.key==='ArrowLeft'?-1:0;
    if(!step)return;
    const options=Array.from(document.querySelectorAll<HTMLButtonElement>('.swap-item:not(:disabled)'));
    const current=options.indexOf(document.activeElement as HTMLButtonElement);
    if(current<0)return;
    event.preventDefault();
    const next=options[(current+step+options.length)%options.length];
    next.focus();next.click();
  }
  confirmSubstitute(){
    const from=this.substituting(), toId=this.substituteChoice(), workout=this.store.activeWorkout();
    if(!from||!toId||!workout)return;
    if(!this.store.substituteExercise(from.id,toId)){this.notify(this.store.actionError()??'No se pudo cambiar el ejercicio.');return;}
    const swaps=recordSwap(this.sessionSwaps(),workout.id,from.id,toId);
    this.sessionSwaps.set(swaps);
    try{localStorage.setItem('fitapp-session-swaps',JSON.stringify(swaps));}catch{}
    this.popSheetHistory();this.dropSheets();this.sheetTrigger=null;
    this.notify(`Listo: ${this.exercise(toId).name} en las series que te faltan. Tu rutina no cambia.`);
    // El botón que abrió la hoja puede haber desaparecido con el ejercicio: el foco va al nombre del reemplazo.
    setTimeout(()=>(document.getElementById('block-'+toId)?.querySelector('button') as HTMLElement|null)?.focus());
  }
  /** Otra pestaña cambió un ejercicio: se toma su registro de reemplazos, validado como siempre. */
  @HostListener('window:storage', ['$event']) storageChanged(event:StorageEvent){if(event.key==='fitapp-session-swaps')this.sessionSwaps.set(parseSessionSwaps(event.newValue));}
  private savedSwaps(){try{return parseSessionSwaps(localStorage.getItem('fitapp-session-swaps'));}catch{return null;}}
  private clearSwaps(){this.sessionSwaps.set(null);try{localStorage.removeItem('fitapp-session-swaps');}catch{}}
  /** Renglón de la rutina que corresponde a un ejercicio de la sesión; para un reemplazo, el del ejercicio que reemplazó. */
  private routineEntry(exerciseId:string){const workout=this.store.activeWorkout();if(!workout)return undefined;const origin=swapOrigin(this.sessionSwaps(),workout.id,exerciseId);return this.routine(workout.routineId)?.exercises.find(e=>e.exerciseId===origin);}
  private focusSheet(){setTimeout(()=>(document.querySelector('.sheet [data-sheet-focus]') as HTMLElement|null)?.focus());}
  @HostListener('document:keydown.escape') escapePressed(){if(!this.confirmation()&&!this.sync.conflict())this.closeSheet();}

  /** Last session's completed sets per exercise of the active workout ("Anterior"). */
  readonly previousByExercise = computed(() => {
    const workout = this.store.activeWorkout();
    const map = new Map<string, WorkoutSet[]>();
    if (workout) for (const id of new Set(workout.sets.map(s => s.exerciseId))) map.set(id, lastSetsFor(this.store.history(), id));
    return map;
  });
  previousLabel(exerciseId:string, setNumber:number){const set=this.previousByExercise().get(exerciseId)?.[setNumber-1];return set?`${this.fmt(set.weight)} × ${set.reps}`:'—';}
  addSet(exerciseId:string){if(!this.store.addSet(exerciseId))this.notify(this.store.actionError()??'No se pudo agregar la serie.');}
  removeLastSet(rows:{index:number}[]){const last=rows.at(-1);if(last&&!this.store.removeSet(last.index))this.notify(this.store.actionError()??'No se pudo quitar la serie.');}
  /** Records of a saved session, compared with the sessions before it (history is newest first). */
  recordsFor(workout:Workout){const history=this.store.history();const position=history.findIndex(w=>w.id===workout.id);return personalRecords(workout,position<0?history:history.slice(position+1));}
  async shareWorkout(workout:Workout){
    const text=workoutSummaryText(workout,this.recordsFor(workout),this.brand.name);
    if(typeof navigator.share==='function'){try{await navigator.share({text});return;}catch(error){if((error as DOMException)?.name==='AbortError')return;}}
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,'_blank','noopener');
  }

  readonly focusLabels = { fuerza: 'Ganar fuerza', musculo: 'Ganar músculo', grasa: 'Bajar grasa', salud: 'Salud y bienestar' } as const;
  readonly placeLabels = { gimnasio: 'Gimnasio', 'casa-pesas': 'Casa con pesas', 'casa-sin-equipo': 'Casa sin equipo' } as const;
  readonly focusOptions = Object.keys(this.focusLabels) as (keyof typeof this.focusLabels)[];
  readonly placeOptions = Object.keys(this.placeLabels) as (keyof typeof this.placeLabels)[];
  /** Starting weekly plan from the profile's days and place. */
  readonly suggestedPlan = computed(() => suggestWeeklyPlan(this.store.profile(), this.store.routines()));
  readonly planReplaceAsk = signal(false);
  planSummary(plan:(string|null)[]){return plan.map((id,i)=>id?`${this.weekdayNames[i].slice(0,3)}: ${this.routine(id)?.name ?? ''}`:null).filter(Boolean).join(' · ');}
  suggestPlan(){if(this.store.weeklyPlan().some(slot=>slot!==null)&&!this.planReplaceAsk()){this.planReplaceAsk.set(true);return;}this.planReplaceAsk.set(false);if(this.store.applyWeeklyPlan(this.suggestedPlan()))this.notify('Listo: tu semana tipo quedó armada. Cambiá lo que quieras.');else this.notify(this.store.actionError()??'No se pudo aplicar.');}
  /** Load/reps suggestion for an exercise of the active session, from its last session and the routine target. */
  suggestionFor(exerciseId:string):ProgressionSuggestion|null{
    const workout=this.store.activeWorkout();if(!workout)return null;
    const entry=this.routineEntry(exerciseId);if(!entry)return null;
    return suggestProgression(this.previousByExercise().get(exerciseId)??[],entry.reps,this.exercise(exerciseId)?.equipment??'');
  }
  /** True when the pending sets already use the suggested value (nothing to apply). */
  suggestionApplied(exerciseId:string,s:ProgressionSuggestion){const pending=this.store.activeWorkout()?.sets.filter(set=>set.exerciseId===exerciseId&&!set.completed)??[];return !pending.length||pending.every(set=>s.kind==='mas-reps'?set.reps===s.value:set.weight===s.value);}
  applySuggestion(exerciseId:string,s:ProgressionSuggestion){const ok=s.kind==='mas-reps'?this.store.applyReps(exerciseId,s.value):this.store.applyLoad(exerciseId,s.value);this.notify(ok?(s.kind==='mas-reps'?`Listo: ${s.value} repeticiones en las series que faltan.`:`Listo: ${this.fmt(s.value)} kg en las series que faltan.`):(this.store.actionError()??'No se pudo aplicar.'));}

  fmt(value:number){return this.numberFormat.format(value);}
  /** Minutos estimados de una rutina (se muestran con "≈"). */
  estimate(r:Routine){return estimateRoutineMinutes(r);}
  setCount(r:Routine){return r.exercises.reduce((total,entry)=>total+entry.sets,0);}
  openRoutine(r:Routine){this.navigate('routines');this.selectedRoutine.set(r);}
  planRoutine(r:Routine){this.openSchedule();this.calendarRoutine=r.id;}
  cancelConfirmation(){if(this.confirmation()==='import')this.pendingImport='';this.confirmation.set(null);}
  /** Effective plan for a date: one-off plan, else weekly plan. */
  plannedRoutine(date:string){const id=plannedRoutineId({schedule:this.store.schedule(),weeklyPlan:this.store.weeklyPlan()},date);return id?this.routine(id):undefined;}
  planned(date:string){const id=plannedRoutineId({schedule:this.store.schedule(),weeklyPlan:this.store.weeklyPlan()},date);return id?(this.routine(id)?.name ?? 'Rutina eliminada'):'';}
  workoutsOn(date:string){return this.store.history().filter(w=>localDate(new Date(w.finishedAt!))===date);}
  selectDate(date:string){this.selectedDate.set(date);this.calendarDate=date;this.calendarForm=false;}
  setWeekday(index:number,value:string){if(this.store.setWeeklyPlan(index,value||null))this.notify(value?`${this.weekdayNames[index]}: ${this.routine(value)?.name}.`:`${this.weekdayNames[index]}: descanso.`);else this.notify(this.store.actionError()??'No se pudo guardar.');}
  monthStep(delta:number){this.monthOffset.update(v=>v+delta);this.calendarForm=false;}

  private savedRest(){try{return Number(localStorage.getItem('fitapp-rest-until'))||0;}catch{return 0;}}

  initialView():View { const hash=location.hash.slice(1); return ['home','routines','calendar','progress','library','profile','workout','editor'].includes(hash)?hash as View:'home'; }
  @HostListener('window:hashchange') hashChanged(){this.view.set(this.initialView());this.dropSheets();}
  @HostListener('window:online') wentOnline(){this.online.set(true);if(this.sync.account())void this.sync.syncNow();}
  @HostListener('window:offline') wentOffline(){this.online.set(false);}
  @HostListener('window:beforeinstallprompt', ['$event']) installReady(event:Event){event.preventDefault();this.installPrompt.set(event as unknown as { prompt(): Promise<unknown>; userChoice: Promise<{ outcome: string }> });}
  @HostListener('window:appinstalled') appInstalled(){this.installed.set(true);this.installPrompt.set(null);this.notify(`Listo, ${this.brand.name} quedó instalada.`);}
  ngOnDestroy(){clearInterval(this.interval);clearTimeout(this.toastTimer);}
  navigate(view:View){this.view.set(view);location.hash=view; this.dropSheets();this.selectedRoutine.set(null);this.selectedExercise.set(null);this.selectedHistory.set(null);if(view==='profile') this.profileDraft={...this.store.profile()}; window.scrollTo({top:0,behavior:'instant'});}
  notify(message:string){this.toast.set(message);clearTimeout(this.toastTimer);this.toastTimer=setTimeout(()=>this.toast.set(''),4500);}
  exercise(id:string){return this.store.exercises().find(e=>e.id===id)!;}
  routine(id:string){return this.store.routines().find(r=>r.id===id);}
  imageFor(id:string){return id==='at-home'?'images/home-workout.jpg':id==='lower-body'?'images/mobility.jpg':'images/strength.jpg';}
  get filteredRoutines(){return this.store.routines().filter(r => this.routineFilter==='Todas'||(this.routineFilter==='Mis creaciones'?r.custom:r.level===this.routineFilter));}
  get filteredExercises(){const q=this.search.toLocaleLowerCase('es');return this.store.exercises().filter(e=>(this.muscle==='Todos'||e.muscle===this.muscle)&&`${e.name} ${e.muscle} ${e.equipment}`.toLocaleLowerCase('es').includes(q));}
  get muscles(){return ['Todos',...new Set(this.store.exercises().map(e=>e.muscle))];}
  dateLabel(date:string,options:Intl.DateTimeFormatOptions={day:'numeric',month:'short'}){return new Intl.DateTimeFormat('es-AR',options).format(new Date(date+'T12:00:00'));}
  get todayLabel(){return new Intl.DateTimeFormat('es-AR',{weekday:'long',day:'numeric',month:'long'}).format(new Date());}
  get weekLabel(){const dates=this.weeks();return `${this.dateLabel(dates[0])} – ${this.dateLabel(dates[6],{day:'numeric',month:'short',year:'numeric'})}`;}
  scheduled(date:string){return this.store.schedule().find(s=>s.date===date);}
  doneOn(date:string){return this.store.history().some(w=>localDate(new Date(w.finishedAt!))===date);}
  plannedCount(){return this.thisWeek.filter(d=>!!this.plannedRoutine(d)).length;}
  openSchedule(date=this.today){const target=parseLocalDate(date)??new Date();const now=new Date();this.navigate('calendar');this.monthOffset.set((target.getFullYear()-now.getFullYear())*12+target.getMonth()-now.getMonth());this.selectedDate.set(date);this.calendarDate=date;this.calendarRoutine=this.plannedRoutine(date)?.id ?? this.suggestedRoutine()?.id ?? '';this.calendarForm=true;setTimeout(()=>document.querySelector('.schedule-form')?.scrollIntoView({behavior:'smooth',block:'center'}),50);}
  saveSchedule(){if(this.store.scheduleRoutine(this.calendarDate,this.calendarRoutine||null)){this.calendarForm=false;this.notify(this.calendarRoutine?'Listo, quedó planificado ese día.':'Listo, ese día descansás.');}else this.notify(this.store.actionError()??'Revisá la fecha y la rutina.');}
  removeSchedule(date:string){this.store.unschedule(date);this.notify('Ese día vuelve a tu semana tipo.');}
  start(r:Routine){if(this.store.activeWorkout()){this.navigate('workout');this.notify('Continuá tu sesión en curso antes de empezar otra.');return;}if(this.store.startWorkout(r.id)){this.navigate('workout');this.notify('Todo listo. Registrá cada serie a tu ritmo.');}else this.notify(this.store.actionError()??'No se pudo iniciar.');}
  updateSet(index:number,key:'reps'|'weight',value:string,event:Event){const set=this.store.activeWorkout()!.sets[index];const num=Number(value);if(value.trim()===''||!this.store.updateSet(index,key==='reps'?num:set.reps,key==='weight'?num:set.weight)){(event.target as HTMLInputElement).value=String(set[key]);this.notify('Usá repeticiones de 1 a 999 y una carga de 0 a 2000 kg.');}}
  toggleSet(index:number){const set=this.store.activeWorkout()!.sets[index];if(this.store.toggleSet(index)&&!set.completed)this.startRest(this.routineEntry(set.exerciseId)?.restSeconds??60);}
  startRest(seconds=60){const until=Date.now()+seconds*1000;this.restUntil.set(until);try{localStorage.setItem('fitapp-rest-until',String(until));}catch{}this.now.set(Date.now());}
  skipRest(){this.restUntil.set(0);try{localStorage.removeItem('fitapp-rest-until');}catch{}}
  clock(seconds:number){const mins=Math.floor(seconds/60);return `${mins.toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;}
  finish(){const workout=this.store.finishWorkout();if(workout){this.skipRest();this.clearSwaps();this.navigate('progress');this.selectedHistory.set(workout);this.notify('¡Sesión guardada! Cada entrenamiento cuenta.');}else this.notify(this.store.actionError()??'Marcá al menos una serie completada.');}
  confirmAction(){const action=this.confirmation();if(action==='discard'){this.store.discardWorkout();this.skipRest();this.clearSwaps();this.navigate('home');this.notify('Sesión descartada.');}if(action==='delete'&&this.selectedRoutine()){if(this.store.deleteRoutine(this.selectedRoutine()!.id)){this.selectedRoutine.set(null);this.notify('Rutina eliminada. Tu historial se conserva.');}else this.notify(this.store.actionError()??'No se puede eliminar.');}if(action==='import'){if(this.store.importJson(this.pendingImport)){this.profileDraft={...this.store.profile()};this.notify('Copia de seguridad importada.');}else this.notify(this.store.actionError()??'El archivo no es una copia válida.');this.pendingImport='';}this.confirmation.set(null);}
  editRoutine(r:Routine|null=null){this.editingRoutine=r;this.navigate('editor');}
  routineSaved(){this.navigate('routines');this.notify('Rutina guardada.');}
  saveProfile(){this.profileError='';if(this.store.updateProfile(this.profileDraft)){this.notify('Perfil actualizado.');}else this.profileError=this.store.actionError()??'Revisá los datos del perfil.';}
  addWeight(){this.weightError='';if(this.weightValue!==null&&this.store.addWeight(Number(this.weightValue),this.weightDate)){this.weightValue=null;this.notify('Medición guardada.');}else this.weightError=this.store.actionError()??'Ingresá un peso válido.';}
  exportData(){const blob=new Blob([this.store.exportJson()],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`fitapp-${this.today}.json`;a.click();URL.revokeObjectURL(url);this.notify('Copia de seguridad descargada.');}
  async importData(event:Event){const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file)return;this.importError.set('');if(file.size>5000000){this.importError.set('El archivo supera el límite de 5 MB.');input.value='';return;}try{this.pendingImport=await file.text();JSON.parse(this.pendingImport);this.confirmation.set('import');}catch{this.importError.set('No se pudo leer el archivo JSON.');}input.value='';}
  async install(){const prompt=this.installPrompt();if(prompt){await prompt.prompt();const choice=await prompt.userChoice.catch(()=>null);this.installPrompt.set(null);if(choice?.outcome==='accepted')this.installed.set(true);return;}this.installHelp.set(true);}
  volume(w:Workout){return workoutVolume(w);}
  duration(w:Workout){return workoutDurationMinutes(w);}
  sessionDate(w:Workout){return new Intl.DateTimeFormat('es-AR',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}).format(new Date(w.finishedAt!));}
  historyForExercise(id:string){return this.store.history().flatMap(w=>w.sets.filter(s=>s.exerciseId===id&&s.completed));}
  recordFor(id:string){return Math.max(0,...this.historyForExercise(id).map(s=>s.weight));}
  weeklyBar(date:string){return this.store.history().filter(w=>localDate(new Date(w.finishedAt!))===date).reduce((s,w)=>s+workoutVolume(w),0);}
  get maxBar(){return Math.max(1,...this.thisWeek.map(d=>this.weeklyBar(d)));}
}
