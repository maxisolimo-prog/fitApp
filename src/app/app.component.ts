import { Component, computed, effect, inject, signal, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from './icon.component';
import { WorkoutStore } from './core/workout-store';
import { SyncService, type SyncStatus } from './core/sync.service';
import { localDate, weekDates, workoutVolume, workoutDurationMinutes } from './core/workout-utils';
import { Routine, Profile, Workout, Exercise } from './core/models';
import { RoutineEditorComponent } from './features/routine-editor.component';
import { ExerciseDetailComponent } from './features/exercise-detail.component';

type View = 'home'|'routines'|'calendar'|'progress'|'library'|'profile'|'workout'|'editor';
@Component({
  selector:'app-root', standalone:true,
  imports:[CommonModule, FormsModule, IconComponent, RoutineEditorComponent, ExerciseDetailComponent],
  templateUrl:'./app.component.html'
})
export class AppComponent implements OnDestroy {
  readonly store = inject(WorkoutStore);
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
  readonly suggestedRoutine = computed(() => {
    const scheduled = this.store.schedule().find(s => s.date === this.today);
    return this.store.routines().find(r => r.id === scheduled?.routineId) ?? this.store.routines().find(r => r.id === 'full-body') ?? this.store.routines()[0];
  });
  readonly completedSets = computed(() => this.store.activeWorkout()?.sets.filter(s=>s.completed).length ?? 0);
  readonly elapsed = computed(() => { const w=this.store.activeWorkout(); return w ? Math.max(0,Math.floor((this.now()-Date.parse(w.startedAt))/1000)) : 0; });
  readonly workoutGroups = computed(() => {
    const w=this.store.activeWorkout(); if (!w) return [];
    return [...new Set(w.sets.map(s=>s.exerciseId))].map(id=>({id,exercise:this.exercise(id),sets:w.sets.map((set,index)=>({set,index})).filter(s=>s.set.exerciseId===id)}));
  });
  search=''; muscle='Todos'; routineFilter='Todas';
  calendarDate=this.today; calendarRoutine='full-body'; calendarForm=false;
  profileDraft: Profile={...this.store.profile()}; profileError='';
  weightValue: number|null=null; weightDate=this.today; weightError='';
  editingRoutine: Routine|null=null;
  pendingImport=''; readonly importError=signal('');
  installPrompt: any=null;
  private interval = setInterval(()=>this.now.set(Date.now()),1000);
  private toastTimer: ReturnType<typeof setTimeout>|undefined;

  private lastFocus: HTMLElement|null=null;
  readonly lastWorkout = computed(() => this.store.history()[0] ?? null);
  readonly recentWeights = computed(() => this.store.weights().slice(-8).reverse());
  readonly levels = ['Principiante','Intermedio','Avanzado'] as const;
  readonly routineFilters = ['Todas','Principiante','Intermedio','Avanzado','Mis creaciones'];
  private readonly numberFormat = new Intl.NumberFormat('es-AR',{maximumFractionDigits:1});

  readonly sync = inject(SyncService);
  readonly accountMode = signal<'login'|'register'>('login');
  accountEmail=''; accountPassword=''; deletePassword='';
  readonly syncLabels: Record<SyncStatus,string> = {
    local:'Sin cuenta', checking:'Conectando…', syncing:'Guardando en tu cuenta…', synced:'Sincronizado',
    offline:'Sin conexión: se envía al volver', error:'No se pudo sincronizar', conflict:'Elegí qué datos conservar',
  };

  constructor(){
    // Zoneless: move focus into an open dialog once it renders, and restore it afterwards.
    effect(() => {
      if (this.confirmation() || this.sync.conflict()) { this.lastFocus ??= document.activeElement as HTMLElement|null; setTimeout(() => (document.querySelector('.dialog button') as HTMLElement|null)?.focus()); }
      else if (this.lastFocus) { const el=this.lastFocus; this.lastFocus=null; setTimeout(() => { if (el.isConnected) el.focus(); }); }
    });
    void this.sync.init();
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
  @HostListener('document:visibilitychange') visibilityChanged(){if(document.visibilityState==='hidden')this.sync.flush();}

  fmt(value:number){return this.numberFormat.format(value);}
  openRoutine(r:Routine){this.navigate('routines');this.selectedRoutine.set(r);}
  planRoutine(r:Routine){this.openSchedule();this.calendarRoutine=r.id;}
  cancelConfirmation(){if(this.confirmation()==='import')this.pendingImport='';this.confirmation.set(null);}
  planned(date:string){const entry=this.scheduled(date);return entry?(this.routine(entry.routineId)?.name ?? 'Rutina eliminada'):'';}

  private savedRest(){try{return Number(localStorage.getItem('fitapp-rest-until'))||0;}catch{return 0;}}

  initialView():View { const hash=location.hash.slice(1); return ['home','routines','calendar','progress','library','profile','workout','editor'].includes(hash)?hash as View:'home'; }
  @HostListener('window:hashchange') hashChanged(){this.view.set(this.initialView());}
  @HostListener('window:online') wentOnline(){this.online.set(true);if(this.sync.account())void this.sync.syncNow();}
  @HostListener('window:offline') wentOffline(){this.online.set(false);}
  @HostListener('window:beforeinstallprompt', ['$event']) installReady(event:Event){event.preventDefault();this.installPrompt=event;}
  ngOnDestroy(){clearInterval(this.interval);clearTimeout(this.toastTimer);}
  navigate(view:View){this.view.set(view);location.hash=view; this.selectedRoutine.set(null);this.selectedExercise.set(null);this.selectedHistory.set(null);if(view==='profile') this.profileDraft={...this.store.profile()}; window.scrollTo({top:0,behavior:'instant'});}
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
  plannedCount(){return this.store.schedule().filter(s=>this.thisWeek.includes(s.date)).length;}
  openSchedule(date=this.today){this.calendarDate=date;this.calendarRoutine=this.scheduled(date)?.routineId ?? this.suggestedRoutine()?.id ?? '';this.calendarForm=true;this.navigate('calendar');}
  saveSchedule(){if(this.store.scheduleRoutine(this.calendarDate,this.calendarRoutine)){this.calendarForm=false;this.notify('Entrenamiento agendado.');}else this.notify(this.store.actionError()??'Revisá la fecha y la rutina.');}
  removeSchedule(date:string){this.store.unschedule(date);this.notify('Entrenamiento quitado del calendario.');}
  start(r:Routine){if(this.store.activeWorkout()){this.navigate('workout');this.notify('Continuá tu sesión en curso antes de empezar otra.');return;}if(this.store.startWorkout(r.id)){this.navigate('workout');this.notify('Todo listo. Registrá cada serie a tu ritmo.');}else this.notify(this.store.actionError()??'No se pudo iniciar.');}
  updateSet(index:number,key:'reps'|'weight',value:string,event:Event){const set=this.store.activeWorkout()!.sets[index];const num=Number(value);if(value.trim()===''||!this.store.updateSet(index,key==='reps'?num:set.reps,key==='weight'?num:set.weight)){(event.target as HTMLInputElement).value=String(set[key]);this.notify('Usá repeticiones de 1 a 999 y una carga de 0 a 2000 kg.');}}
  toggleSet(index:number){const set=this.store.activeWorkout()!.sets[index];if(this.store.toggleSet(index)&&!set.completed){const routine=this.routine(this.store.activeWorkout()!.routineId);this.startRest(routine?.exercises.find(e=>e.exerciseId===set.exerciseId)?.restSeconds??60);}}
  startRest(seconds=60){const until=Date.now()+seconds*1000;this.restUntil.set(until);try{localStorage.setItem('fitapp-rest-until',String(until));}catch{}this.now.set(Date.now());}
  skipRest(){this.restUntil.set(0);try{localStorage.removeItem('fitapp-rest-until');}catch{}}
  clock(seconds:number){const mins=Math.floor(seconds/60);return `${mins.toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;}
  finish(){const workout=this.store.finishWorkout();if(workout){this.skipRest();this.navigate('progress');this.selectedHistory.set(workout);this.notify('¡Sesión guardada! Cada entrenamiento cuenta.');}else this.notify(this.store.actionError()??'Marcá al menos una serie completada.');}
  confirmAction(){const action=this.confirmation();if(action==='discard'){this.store.discardWorkout();this.skipRest();this.navigate('home');this.notify('Sesión descartada.');}if(action==='delete'&&this.selectedRoutine()){if(this.store.deleteRoutine(this.selectedRoutine()!.id)){this.selectedRoutine.set(null);this.notify('Rutina eliminada. Tu historial se conserva.');}else this.notify(this.store.actionError()??'No se puede eliminar.');}if(action==='import'){if(this.store.importJson(this.pendingImport)){this.profileDraft={...this.store.profile()};this.notify('Copia de seguridad importada.');}else this.notify(this.store.actionError()??'El archivo no es una copia válida.');this.pendingImport='';}this.confirmation.set(null);}
  editRoutine(r:Routine|null=null){this.editingRoutine=r;this.navigate('editor');}
  routineSaved(){this.navigate('routines');this.notify('Rutina guardada.');}
  saveProfile(){this.profileError='';if(this.store.updateProfile(this.profileDraft)){this.notify('Perfil actualizado.');}else this.profileError=this.store.actionError()??'Revisá los datos del perfil.';}
  addWeight(){this.weightError='';if(this.weightValue!==null&&this.store.addWeight(Number(this.weightValue),this.weightDate)){this.weightValue=null;this.notify('Medición guardada.');}else this.weightError=this.store.actionError()??'Ingresá un peso válido.';}
  exportData(){const blob=new Blob([this.store.exportJson()],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`fitapp-${this.today}.json`;a.click();URL.revokeObjectURL(url);this.notify('Copia de seguridad descargada.');}
  async importData(event:Event){const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file)return;this.importError.set('');if(file.size>5000000){this.importError.set('El archivo supera el límite de 5 MB.');input.value='';return;}try{this.pendingImport=await file.text();JSON.parse(this.pendingImport);this.confirmation.set('import');}catch{this.importError.set('No se pudo leer el archivo JSON.');}input.value='';}
  async install(){if(this.installPrompt){await this.installPrompt.prompt();this.installPrompt=null;}else this.notify('Usá “Instalar aplicación” o “Agregar a inicio” en el menú de tu navegador.');}
  volume(w:Workout){return workoutVolume(w);}
  duration(w:Workout){return workoutDurationMinutes(w);}
  sessionDate(w:Workout){return new Intl.DateTimeFormat('es-AR',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'}).format(new Date(w.finishedAt!));}
  historyForExercise(id:string){return this.store.history().flatMap(w=>w.sets.filter(s=>s.exerciseId===id&&s.completed));}
  recordFor(id:string){return Math.max(0,...this.historyForExercise(id).map(s=>s.weight));}
  weeklyBar(date:string){return this.store.history().filter(w=>localDate(new Date(w.finishedAt!))===date).reduce((s,w)=>s+workoutVolume(w),0);}
  get maxBar(){return Math.max(1,...this.thisWeek.map(d=>this.weeklyBar(d)));}
}
