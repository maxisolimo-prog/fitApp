import { Component, HostListener, inject, output, signal, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkoutStore } from '../core/workout-store';
import { BackClose, type BackLayer } from '../back-close';
import { canPreserveProgramProgress } from '../core/training-program';
import type { Exercise, TrainingProgram } from '../core/models';
import { estimateRoutineMinutes, formatDuration } from '../core/workout-utils';
import { ExerciseThumbComponent } from './exercise-thumb.component';

@Component({
  selector:'app-training-program',standalone:true,imports:[FormsModule,ExerciseThumbComponent],
  template:`
    <section class="program" aria-labelledby="program-title" [inert]="leaveAsk()">
      <header><div><p class="eyebrow">A tu ritmo</p><h2 id="program-title">{{ store.program()?.name ?? 'Tu próximo entrenamiento, en orden' }}</h2></div>
        @if (!editing()) { <button type="button" class="btn btn-secondary" id="program-edit" (click)="edit()" [disabled]="!!store.activeWorkout()?.programStep">{{ store.program() ? 'Editar programa' : 'Crear programa' }}</button> }
      </header>
      @if (editing()) {
        <form (ngSubmit)="save()" novalidate>
          <label>Nombre del programa<input name="programName" maxlength="100" [(ngModel)]="name" required></label>
          <p>Elegí tus rutinas en el orden en que querés hacerlas. Podés repetirlas.</p>
          <ol>
            @for (id of ids;track $index;let i=$index) {
              <li class="program-step"><label><span class="sr-only">Rutina de la sesión {{ i+1 }}</span><select [id]="'program-step-'+i" [name]="'programStep'+i" [(ngModel)]="ids[i]">@for(r of store.routines();track r.id){<option [value]="r.id">{{ r.name }}</option>}</select></label>
                <button type="button" class="btn btn-secondary" (click)="move(i,-1)" [disabled]="i===0" [attr.aria-label]="'Subir sesión '+(i+1)">Subir</button>
                <button type="button" class="btn btn-secondary" (click)="move(i,1)" [disabled]="i===ids.length-1" [attr.aria-label]="'Bajar sesión '+(i+1)">Bajar</button>
                <button type="button" class="btn btn-secondary" (click)="ids.splice(i,1)" [attr.aria-label]="'Quitar sesión '+(i+1)">Quitar</button>
              </li>
            }
          </ol>
          <button type="button" class="btn btn-secondary" (click)="ids.push(store.routines()[0].id)" [disabled]="ids.length>=100">Agregar sesión</button>
          @if(baseline){
            @if(needsRestart){<p role="status">Cambiaste el tramo ya completado. Para guardar este orden tenés que reiniciar el programa.</p>}
            @else if(!restart){<p>Se conservan las {{baseline.position}} sesiones completadas y el estado {{baseline.paused?'en pausa':'activo'}}.</p>}
            <label class="restart-choice"><input type="checkbox" name="restartProgram" [(ngModel)]="restart"> Reiniciar desde la primera sesión. El historial se conserva.</label>
          }
          <div class="actions"><button type="submit" class="btn btn-primary" [disabled]="needsRestart && !restart">{{restart?'Guardar y reiniciar programa':baseline?'Guardar cambios':'Guardar programa'}}</button><button type="button" class="btn btn-secondary" (click)="requestNavigation()">Cancelar</button></div>
        </form>
      } @else if (store.program();as p) {
        <p class="tabular">{{p.position}} de {{p.routineIds.length}} sesiones completadas{{p.paused?' · En pausa':''}}</p>
        <div class="meter" role="progressbar" aria-label="Sesiones del programa completadas" [attr.aria-valuenow]="p.position" aria-valuemin="0" [attr.aria-valuemax]="p.routineIds.length"><span [style.width.%]="p.position/p.routineIds.length*100"></span></div>
        @if (store.nextProgramRoutine();as next) {
          <p>Sesión {{p.position+1}}: <strong>{{next.name}}</strong></p>
          <p class="program-next-meta"><span class="tabular">≈ {{estimate(next)}} min</span> · {{next.exercises.length}} ejercicios · {{next.level}}</p>
          <details class="next-session"><summary>Ver ejercicios y cómo hacerlos</summary>
            <ol class="next-exercises">
              @for(entry of next.exercises;track entry.exerciseId){
                @if(exercise(entry.exerciseId);as item){
                  <li><button #previewButton type="button" class="next-exercise" aria-haspopup="dialog" (click)="exerciseRequested.emit({exercise:item,trigger:previewButton})">
                    <app-exercise-thumb [exercise]="item" />
                    <span class="next-exercise-label"><strong>{{item.name}}</strong><span>{{entry.sets}} × {{entry.durationSeconds===undefined?entry.reps+' repeticiones':duration(entry.durationSeconds)}} · {{item.equipment}}</span><small>Ver cómo hacerlo</small></span>
                  </button></li>
                }
              }
            </ol>
          </details>
          <button type="button" class="btn btn-primary" (click)="begin()" [disabled]="!!store.activeWorkout()">Empezar siguiente sesión</button>
        } @else if(p.position===p.routineIds.length){<p>Completaste el programa. Podés editarlo para empezar otro recorrido.</p>}
        <div class="actions"><button type="button" class="btn btn-secondary" (click)="store.pauseProgram(!p.paused)">{{p.paused?'Retomar programa':'Pausar programa'}}</button><button type="button" class="btn btn-secondary" (click)="removing=true" [disabled]="!!store.activeWorkout()?.programStep">Quitar programa</button></div>
        @if(removing){<div role="group" aria-label="Confirmar quitar programa"><p>Se quita la secuencia y su avance. Tus rutinas y entrenamientos quedan guardados.</p><button type="button" class="btn btn-secondary" (click)="clear()">Confirmar quitar programa</button><button type="button" class="btn btn-secondary" (click)="removing=false">Conservar programa</button></div>}
        <details><summary>Ver la secuencia completa</summary><ol>@for(id of p.routineIds;track $index){<li [attr.aria-current]="$index===p.position?'step':null">{{routineName(id)}}{{ $index < p.position ? ' · Completada' : '' }}</li>}</ol></details>
      } @else {<p>Encadená tus rutinas y avanzá al guardar cada sesión. El calendario y la semana tipo se mantienen: el programa empieza cuando elegís «Empezar siguiente sesión».</p>}
      <p class="program-help">El programa avanza solo al guardar una sesión iniciada desde acá con al menos una serie completada. Descartarla o entrenar por fuera conserva el orden.</p>
      @if(error){<p role="alert">{{error}}</p>@if(editing()){<button type="button" class="btn btn-secondary" (click)="edit()">Cargar versión actual</button>}}
    </section>
    @if(leaveAsk()){
      <div class="overlay" (click)="stay()" aria-hidden="true"></div>
      <div class="dialog" id="program-leave-dialog" role="alertdialog" aria-modal="true" aria-labelledby="program-leave-title" aria-describedby="program-leave-description">
        <h2 id="program-leave-title">¿Salir sin guardar el programa?</h2><p id="program-leave-description">Tenés cambios en el nombre o en el orden de las sesiones.</p>
        <div class="actions"><button type="button" class="btn btn-primary" id="program-stay" (click)="stay()">Seguir editando</button><button type="button" class="btn btn-secondary" (click)="confirmLeave()">Salir sin guardar</button></div>
      </div>
    }
  `,
  styles:`
    :host{display:block;margin:0 0 32px}.program{border-block:1px solid var(--line);padding:24px 0}.program header{display:flex;align-items:center;justify-content:space-between;gap:16px}.program h2{margin:4px 0;font-size:22px;font-weight:700;overflow-wrap:anywhere}.program p{max-width:70ch;line-height:1.6;margin:12px 0}.program .actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.program-help{font-size:13px;color:var(--ink-2)}.program .meter{max-width:480px}.program details{margin-top:20px}.program summary{cursor:pointer;min-height:44px;display:list-item;align-content:center;margin-left:18px}.program label{display:grid;gap:8px}.program input,.program select{min-height:44px;font:inherit;border:1px solid var(--line);border-radius:var(--radius-field);padding:10px;background:var(--surface);color:var(--ink);max-width:100%;width:100%}.program .restart-choice{display:flex;align-items:center;gap:10px;min-height:44px;margin-block:16px}.program .restart-choice input{width:20px;min-height:20px;flex-shrink:0}.program form{margin-top:20px}.program form>label{max-width:480px}.program ol{padding-left:24px}.program li{padding:10px 0}.program li[aria-current=step]{font-weight:700}.program-step{display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid var(--line)}.program-step label{flex:1;min-width:200px}.program .text-button{min-height:44px}.program .next-session{margin:12px 0 18px;max-width:640px}.program .next-exercises{list-style:none;padding:0;margin:0}.program .next-exercises li{padding:0;border-bottom:1px solid var(--line)}.next-exercise{display:flex;gap:14px;align-items:center;width:100%;min-height:76px;padding:12px 8px;border:0;background:transparent;color:var(--ink);font:inherit;text-align:left;cursor:pointer}.next-exercise:hover{background:var(--bg-tint)}.next-exercise-label{display:grid;gap:5px;min-width:0}.next-exercise-label strong{font-size:15px}.next-exercise-label>span{font-size:13px;color:var(--ink-2)}.next-exercise-label small{font-size:13px;text-decoration:underline;text-underline-offset:3px}.program button:disabled{opacity:.5;cursor:default}@media(max-width:600px){.program header{align-items:flex-start;flex-direction:column}.program-step label{flex-basis:100%}.program ol{padding-left:0;list-style-position:inside}}
  `
})
export class TrainingProgramComponent implements OnDestroy {
  readonly store=inject(WorkoutStore);readonly started=output<void>();
  readonly exerciseRequested=output<{exercise:Exercise;trigger:HTMLElement}>();
  readonly estimate=estimateRoutineMinutes;readonly duration=formatDuration;
  exercise(id:string){return this.store.exercises().find(e=>e.id===id);}
  readonly editing=signal(false);readonly leaveAsk=signal(false);
  removing=false;name='Mi programa';ids:string[]=[];error='';restart=false;baseline:TrainingProgram|null=null;
  private readonly back=inject(BackClose);private layer:BackLayer|null=null;
  private initial='';private pendingNavigation:(()=>void)|null=null;private leaveFocus:HTMLElement|null=null;
  private formState(){return JSON.stringify([this.name,this.ids,this.restart]);}
  get dirty(){return this.editing() && this.formState()!==this.initial;}
  get needsRestart(){return !!this.baseline && !canPreserveProgramProgress(this.baseline,this.ids);}
  edit(){const p=this.store.program();this.baseline=p?{...p,routineIds:[...p.routineIds]}:null;this.name=p?.name??'Mi programa';this.ids=p?[...p.routineIds]:[this.store.routines()[0].id];this.restart=false;this.initial=this.formState();this.editing.set(true);this.error='';this.removing=false;this.watchBack();setTimeout(()=>document.querySelector<HTMLInputElement>('input[name=programName]')?.focus());}
  move(i:number,d:number){[this.ids[i],this.ids[i+d]]=[this.ids[i+d],this.ids[i]];}
  save(){if(this.store.saveProgram(this.name,this.ids,{baseline:this.baseline,restart:this.restart})){this.error='';this.finishEditing(()=>document.getElementById('program-edit')?.focus());}else this.error=this.store.actionError()??'No se pudo guardar el programa.';}
  begin(){if(this.store.startProgramWorkout())this.started.emit();else this.error=this.store.actionError()??'No se pudo empezar.';}
  clear(){if(this.store.clearProgram())this.removing=false;else this.error=this.store.actionError()??'No se pudo quitar.';}
  routineName(id:string){return this.store.routines().find(r=>r.id===id)?.name??id;}
  requestNavigation(then:()=>void=()=>document.getElementById('program-edit')?.focus()){
    this.pendingNavigation=then;
    if(!this.dirty){this.finishEditing(then);return;}
    this.leaveFocus=document.activeElement as HTMLElement|null;this.leaveAsk.set(true);setTimeout(()=>document.getElementById('program-stay')?.focus());
  }
  stay(){this.pendingNavigation=null;this.leaveAsk.set(false);setTimeout(()=>this.leaveFocus?.isConnected&&this.leaveFocus.focus());}
  confirmLeave(){this.finishEditing(this.pendingNavigation??(()=>document.getElementById('program-edit')?.focus()));}
  private finishEditing(then:()=>void){this.editing.set(false);this.leaveAsk.set(false);this.pendingNavigation=null;const layer=this.layer;this.layer=null;void (layer?layer.close():Promise.resolve()).then(then);}
  private watchBack(){this.layer??=this.back.open(()=>{this.layer=null;if(this.leaveAsk()){this.stay();this.watchBack();}else if(this.dirty){this.requestNavigation();this.watchBack();}else this.editing.set(false);});}
  @HostListener('window:beforeunload',['$event']) beforeUnload(event:BeforeUnloadEvent){if(this.dirty){event.preventDefault();event.returnValue='';}}
  @HostListener('document:keydown',['$event']) keydown(event:KeyboardEvent){
    if(!this.leaveAsk())return;
    if(event.key==='Escape'){event.preventDefault();this.stay();return;}
    if(event.key!=='Tab')return;
    const buttons=document.querySelectorAll<HTMLButtonElement>('#program-leave-dialog button');const first=buttons[0],last=buttons[buttons.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
  ngOnDestroy(){this.layer?.forget();}
}
