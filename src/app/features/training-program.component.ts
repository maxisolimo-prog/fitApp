import { Component, inject, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { WorkoutStore } from '../core/workout-store';

@Component({
  selector:'app-training-program',standalone:true,imports:[FormsModule],
  template:`
    <section class="program" aria-labelledby="program-title">
      <header><div><p class="eyebrow">A tu ritmo</p><h2 id="program-title">{{ store.program()?.name ?? 'Tu próximo entrenamiento, en orden' }}</h2></div>
        @if (!editing) { <button type="button" class="btn btn-secondary" (click)="edit()" [disabled]="!!store.activeWorkout()?.programStep">{{ store.program() ? 'Editar programa' : 'Crear programa' }}</button> }
      </header>
      @if (editing) {
        <form (ngSubmit)="save()">
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
          @if(store.program()){<p>Guardar este orden vuelve a empezar el programa en la primera sesión. El historial se conserva.</p>}
          <div class="actions"><button type="submit" class="btn btn-primary">{{store.program()?'Guardar y reiniciar programa':'Guardar programa'}}</button><button type="button" class="btn btn-secondary" (click)="editing=false;error=''">Cancelar</button></div>
        </form>
      } @else if (store.program();as p) {
        <p class="tabular">{{p.position}} de {{p.routineIds.length}} sesiones completadas{{p.paused?' · En pausa':''}}</p>
        <div class="meter" role="progressbar" aria-label="Sesiones del programa completadas" [attr.aria-valuenow]="p.position" aria-valuemin="0" [attr.aria-valuemax]="p.routineIds.length"><span [style.width.%]="p.position/p.routineIds.length*100"></span></div>
        @if (store.nextProgramRoutine();as next) {
          <p>Sesión {{p.position+1}}: <strong>{{next.name}}</strong></p>
          <button type="button" class="btn btn-primary" (click)="begin()" [disabled]="!!store.activeWorkout()">Empezar siguiente sesión</button>
        } @else if(p.position===p.routineIds.length){<p>Completaste el programa. Podés editarlo para empezar otro recorrido.</p>}
        <div class="actions"><button type="button" class="btn btn-secondary" (click)="store.pauseProgram(!p.paused)">{{p.paused?'Retomar programa':'Pausar programa'}}</button><button type="button" class="btn btn-secondary" (click)="removing=true" [disabled]="!!store.activeWorkout()?.programStep">Quitar programa</button></div>
        @if(removing){<div role="group" aria-label="Confirmar quitar programa"><p>Se quita la secuencia y su avance. Tus rutinas y entrenamientos quedan guardados.</p><button type="button" class="btn btn-secondary" (click)="clear()">Confirmar quitar programa</button><button type="button" class="btn btn-secondary" (click)="removing=false">Conservar programa</button></div>}
        <details><summary>Ver la secuencia completa</summary><ol>@for(id of p.routineIds;track $index){<li [attr.aria-current]="$index===p.position?'step':null">{{routineName(id)}}{{ $index < p.position ? ' · Completada' : '' }}</li>}</ol></details>
      } @else {<p>Encadená tus rutinas y avanzá al guardar cada sesión. El calendario y la semana tipo se mantienen: el programa empieza cuando elegís «Empezar siguiente sesión».</p>}
      <p class="program-help">El programa avanza solo al guardar una sesión iniciada desde acá con al menos una serie completada. Descartarla o entrenar por fuera conserva el orden.</p>
      @if(error){<p role="alert">{{error}}</p>}
    </section>
  `,
  styles:`
    :host{display:block;margin:0 0 32px}.program{border-block:1px solid var(--line);padding:24px 0}.program header{display:flex;align-items:center;justify-content:space-between;gap:16px}.program h2{margin:4px 0;font-size:22px;font-weight:700}.program p{max-width:70ch;line-height:1.6;margin:12px 0}.program .actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.program-help{font-size:13px;color:var(--ink-2)}.program .meter{max-width:480px}.program details{margin-top:20px}.program summary{cursor:pointer;min-height:44px;display:flex;align-items:center}.program label{display:grid;gap:8px}.program input,.program select{min-height:44px;font:inherit;border:1px solid var(--line);border-radius:var(--radius-field);padding:10px;background:var(--surface);color:var(--ink);max-width:100%;width:100%}.program form{margin-top:20px}.program form>label{max-width:480px}.program ol{padding-left:24px}.program li{padding:10px 0}.program li[aria-current=step]{font-weight:700}.program-step{display:flex;gap:8px;flex-wrap:wrap;border-bottom:1px solid var(--line)}.program-step label{flex:1;min-width:200px}.program .text-button{min-height:44px}.program button:disabled{opacity:.5;cursor:default}@media(max-width:600px){.program header{align-items:flex-start;flex-direction:column}.program-step label{flex-basis:100%}.program ol{padding-left:0;list-style-position:inside}}
  `
})
export class TrainingProgramComponent {
  readonly store=inject(WorkoutStore);readonly started=output<void>();
  editing=false;removing=false;name='Mi programa';ids:string[]=[];error='';
  edit(){const p=this.store.program();this.name=p?.name??'Mi programa';this.ids=p?[...p.routineIds]:[this.store.routines()[0].id];this.editing=true;this.error='';this.removing=false;}
  move(i:number,d:number){[this.ids[i],this.ids[i+d]]=[this.ids[i+d],this.ids[i]];}
  save(){if(this.store.saveProgram(this.name,this.ids)){this.editing=false;this.error='';}else this.error=this.store.actionError()??'No se pudo guardar el programa.';}
  begin(){if(this.store.startProgramWorkout())this.started.emit();else this.error=this.store.actionError()??'No se pudo empezar.';}
  clear(){if(this.store.clearProgram())this.removing=false;else this.error=this.store.actionError()??'No se pudo quitar.';}
  routineName(id:string){return this.store.routines().find(r=>r.id===id)?.name??id;}
}
