import { Component, effect, inject, input, output, signal, untracked, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { FitnessLevel, Routine, TrainingPlace } from '../core/models';
import { validateRoutine } from '../core/workout-utils';
import { parseCoachUsage, type CoachUsage } from '../core/coach-usage';
import { SyncService } from '../core/sync.service';
import { BRAND } from '../brands/brand.token';
import { WorkoutStore } from '../core/workout-store';

@Component({
  selector:'app-ai-routine', standalone:true, imports:[FormsModule],
  template:`
    <details (toggle)="opened($event)"><summary>Proponer una rutina con IA</summary>
      @if(status()==='checking') { <p role="status">Consultando disponibilidad…</p> }
      @else if(status()==='signin') {
        <p>Ingresá a tu cuenta para pedir una propuesta con IA. La propuesta guiada de arriba también funciona sin cuenta.</p>
        <button type="button" class="btn btn-secondary" (click)="accountRequested.emit()">Ir a Perfil e ingresar</button>
      } @else if(status()==='available') {
        @if(usage(); as quota) {
          <div class="quota" role="status">
            <p><strong>{{quota.daily.remaining}} de {{quota.daily.limit}}</strong> solicitudes disponibles para tu cuenta hoy.</p>
            <p>Cupo mensual compartido de la aplicación: <strong>{{quota.monthly.remaining}} de {{quota.monthly.limit}}</strong>.</p>
            @if(quota.daily.remaining===0){<p>Tu cupo diario se renueva el {{resetLabel(quota.daily.resetsAt)}}.</p>}
            @if(quota.monthly.remaining===0){<p>El cupo mensual se renueva el {{resetLabel(quota.monthly.resetsAt)}}.</p>}
          </div>
        }
        <label for="ai-request">¿Qué querés entrenar?</label>
        <textarea id="ai-request" name="aiRequest" [(ngModel)]="prompt" maxlength="1000" rows="3" placeholder="Quiero trabajar piernas con mancuernas"></textarea>
        <p>Se enviará tu pedido y las opciones de entrenamiento al servicio de IA. Una solicitud enviada consume cupo aunque no se obtenga una propuesta.</p>
        <div class="actions">
          <button type="button" class="btn btn-primary" (click)="generate()" [disabled]="busy() || !hasQuota || prompt.trim().length < 10">{{busy()?'Preparando propuesta…':'Pedir propuesta con IA'}}</button>
          @if(busy()){<button type="button" class="btn btn-secondary" (click)="cancel()">Cancelar solicitud</button>}
          @else {<button type="button" class="btn btn-secondary" (click)="check()">Actualizar cupo</button>}
        </div>
        @if(candidate();as routine){
          <div class="candidate"><h4>{{routine.name}}</h4><p>{{routine.exercises.length}} ejercicios · {{routine.duration}} min estimados</p><p>{{routine.description}}</p>
            <ol>@for(entry of routine.exercises;track entry.exerciseId){<li>{{exerciseName(entry.exerciseId)}} · {{entry.sets}} series</li>}</ol>
            <p>Revisá los ejercicios antes de aplicar la propuesta al borrador.</p>
            <button type="button" class="btn btn-primary" (click)="apply()">{{hasEntries()?'Reemplazar lista con esta propuesta':'Usar esta propuesta'}}</button>
          </div>
        }
      } @else {
        <p>La propuesta con IA no está disponible en este momento. Podés armar una propuesta guiada con las opciones de arriba.</p>
        <button type="button" class="btn btn-secondary" (click)="check()">Consultar de nuevo</button>
      }
      @if(error()){<p role="alert">{{error()}}</p>}
    </details>
  `,
  styles:`
    :host{display:block;margin-top:20px;border-top:1px solid var(--line);padding-top:12px}
    summary{min-height:44px;cursor:pointer;align-content:center}textarea{display:block;width:100%;margin-top:8px;min-height:100px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-field);padding:12px;font:inherit;color:var(--ink)}
    p{font-size:14px;line-height:1.6;max-width:65ch;margin:12px 0}.candidate{margin:20px 0;padding:16px 0;border-block:1px solid var(--line)}
    button{min-height:44px}label{display:block;margin-top:16px}.quota{margin:16px 0;padding:12px 16px;background:var(--bg-tint);border-radius:var(--radius-field)}.quota p{margin:4px 0}.actions{display:flex;flex-wrap:wrap;gap:8px}
  `
})
export class AiRoutineComponent implements OnDestroy {
  readonly brand=inject(BRAND);
  readonly level=input.required<FitnessLevel>(); readonly place=input.required<TrainingPlace>(); readonly minutes=input.required<number>(); readonly hasEntries=input(false);
  readonly proposed=output<Routine>(); readonly accountRequested=output<void>();
  readonly status=signal<'unknown'|'checking'|'signin'|'available'|'unavailable'>('unknown');
  readonly busy=signal(false); readonly error=signal(''); readonly candidate=signal<Routine|null>(null); readonly usage=signal<CoachUsage|null>(null);
  prompt='';
  private readonly sync=inject(SyncService); private readonly catalog=inject(WorkoutStore).exercises();
  private controller:AbortController|null=null; private statusController:AbortController|null=null;
  private candidateKey=''; private open=false;

  constructor(){effect(()=>{this.sync.account();untracked(()=>{this.cancel();this.candidate.set(null);this.usage.set(null);if(this.open)void this.check();});});}
  get hasQuota(){const q=this.usage();return !!q && q.daily.remaining>0 && q.monthly.remaining>0;}
  private requestKey(){return JSON.stringify([this.sync.account(),this.level(),this.place(),this.minutes(),this.prompt]);}
  opened(event:Event){this.open=(event.target as HTMLDetailsElement).open;if(this.open)void this.check();else this.cancel();}

  async check(){
    this.statusController?.abort();const controller=new AbortController();this.statusController=controller;this.status.set('checking');this.error.set('');
    const timeout=setTimeout(()=>controller.abort(),10000);
    try{
      const response=await fetch('/api/coach/status?brand='+this.brand.id,{signal:controller.signal});const data=await response.json();
      if(controller.signal.aborted)return;
      if(!response.ok||!data.enabled){this.status.set('unavailable');return;}
      if(!this.sync.account()){this.status.set('signin');return;}
      const result=await fetch('/api/coach/usage?brand='+this.brand.id,{credentials:'same-origin',signal:controller.signal});
      if(result.status===401){this.status.set('signin');return;}
      const quota=await result.json();if(controller.signal.aborted)return;
      const usage=parseCoachUsage(quota.usage);
      if(!result.ok||!quota.enabled||!usage){this.status.set('unavailable');return;}
      this.usage.set(usage);this.status.set('available');
    }catch{if(this.statusController===controller)this.status.set('unavailable');}
    finally{clearTimeout(timeout);}
  }

  async generate(){
    if(this.busy()||!this.hasQuota||!this.sync.account())return;
    this.cancel();const controller=new AbortController();this.controller=controller;this.busy.set(true);this.error.set('');this.candidate.set(null);
    const snapshot=this.requestKey(),timeout=setTimeout(()=>controller.abort(),30000);
    try{
      const response=await fetch('/api/coach/routine',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},signal:controller.signal,
        body:JSON.stringify({prompt:this.prompt,level:this.level(),place:this.place(),minutes:this.minutes(),brand:this.brand.id})});
      const data=await response.json();
      if(snapshot!==this.requestKey())throw Error('Cambiaste el pedido. Volvé a generar la propuesta con las opciones actuales.');
      const usage=parseCoachUsage(data.usage);if(usage)this.usage.set(usage);
      if(response.status===401){this.status.set('signin');throw Error('Tu sesión venció. Ingresá de nuevo desde Perfil.');}
      if(!response.ok)throw Error(data.error??'No se pudo preparar la propuesta.');
      const routine=validateRoutine(data.routine);if(!routine)throw Error('La propuesta no tiene un formato válido.');
      this.candidate.set(routine);this.candidateKey=snapshot;
    }catch(error){
      if(this.controller!==controller)return;
      this.error.set(controller.signal.aborted?'La solicitud se interrumpió. Tu borrador se conserva.':error instanceof Error?error.message:'No se pudo conectar. Podés usar la propuesta guiada.');
    }finally{clearTimeout(timeout);if(this.controller===controller){this.busy.set(false);this.controller=null;}}
  }

  apply(){const routine=this.candidate();if(this.candidateKey!==this.requestKey()){this.candidate.set(null);this.error.set('Cambiaste el pedido. Generá una propuesta con las opciones actuales.');return;}if(routine){this.proposed.emit(routine);this.candidate.set(null);}}
  exerciseName(id:string){return this.catalog.find(e=>e.id===id)?.name??id;}
  resetLabel(value:string){return new Intl.DateTimeFormat('es-AR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value));}
  cancel(){this.controller?.abort();this.controller=null;this.busy.set(false);}
  ngOnDestroy(){this.cancel();this.statusController?.abort();}
}
