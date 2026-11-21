import {Component,inject,input,output,signal,OnDestroy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import type {FitnessLevel,Routine,TrainingPlace} from '../core/models';
import {validateRoutine} from '../core/workout-utils';
import {BRAND} from '../brands/brand.token';
import {WorkoutStore} from '../core/workout-store';

@Component({selector:'app-ai-routine',standalone:true,imports:[FormsModule],template:`
  <details (toggle)="opened($event)"><summary>Proponer una rutina con IA</summary>
    @if(status()==='checking'){<p role="status">Consultando disponibilidad…</p>}
    @else if(status()==='available'){
      <label for="ai-request">¿Qué querés entrenar?<textarea id="ai-request" name="aiRequest" [(ngModel)]="prompt" maxlength="1000" rows="3" placeholder="Tengo 30 minutos y quiero trabajar piernas con mancuernas"></textarea></label>
      <p>Se enviará este pedido y las opciones de entrenamiento al servicio de IA. Requiere cuenta. Revisá la propuesta antes de aplicarla.</p>
      <button type="button" class="btn btn-primary" (click)="generate()" [disabled]="busy() || prompt.trim().length < 10">{{busy()?'Preparando propuesta…':'Pedir propuesta con IA'}}</button>
      @if(busy()){<button type="button" class="btn btn-secondary" (click)="cancel()">Cancelar solicitud</button>}
      @if(candidate();as r){<div class="candidate"><h4>{{r.name}}</h4><p>{{r.exercises.length}} ejercicios · {{r.duration}} min estimados</p><p>{{r.description}}</p><ol>@for(e of r.exercises;track e.exerciseId){<li>{{exerciseName(e.exerciseId)}} · {{e.sets}} series</li>}</ol><button type="button" class="btn btn-primary" (click)="apply()">{{hasEntries()?'Reemplazar lista con esta propuesta':'Usar esta propuesta'}}</button></div>}
    } @else {<p>La propuesta con IA todavía no está disponible. Podés armar una propuesta guiada con las opciones de arriba.</p><button type="button" class="btn btn-secondary" (click)="check()">Consultar de nuevo</button>}
    @if(error()){<p role="alert">{{error()}}</p>}
  </details>
`,styles:`:host{display:block;margin-top:20px;border-top:1px solid var(--line);padding-top:12px}summary{min-height:44px;cursor:pointer;align-content:center}textarea{display:block;width:100%;margin-top:8px;min-height:100px;background:var(--surface);border:1px solid var(--line);border-radius:var(--radius-field);padding:12px;font:inherit;color:var(--ink)}p{font-size:14px;line-height:1.6;max-width:65ch}.candidate{margin:20px 0;padding:16px 0;border-block:1px solid var(--line)}button{min-height:44px}label{display:block;margin-top:12px}`})
export class AiRoutineComponent implements OnDestroy {
  readonly brand=inject(BRAND);readonly level=input.required<FitnessLevel>();readonly place=input.required<TrainingPlace>();readonly minutes=input.required<number>();readonly hasEntries=input(false);readonly proposed=output<Routine>();
  readonly status=signal<'unknown'|'checking'|'available'|'unavailable'>('unknown');readonly busy=signal(false);readonly error=signal('');readonly candidate=signal<Routine|null>(null);prompt='';
  private controller:AbortController|null=null;private statusController:AbortController|null=null;
  private readonly catalog=inject(WorkoutStore).exercises();private candidateKey='';
  private requestKey(){return JSON.stringify([this.level(),this.place(),this.minutes(),this.prompt]);}
  opened(event:Event){if((event.target as HTMLDetailsElement).open&&this.status()==='unknown')void this.check();}
  async check(){this.statusController?.abort();const c=new AbortController();this.statusController=c;this.status.set('checking');try{const r=await fetch('/api/coach/status?brand='+this.brand.id,{signal:c.signal});const data=await r.json();if(!c.signal.aborted)this.status.set(r.ok&&data.enabled?'available':'unavailable');}catch{if(!c.signal.aborted)this.status.set('unavailable');}}
  async generate(){this.cancel();const c=new AbortController();this.controller=c;this.busy.set(true);this.error.set('');this.candidate.set(null);const snapshot=this.requestKey();const timeout=setTimeout(()=>c.abort(),30000);try{
    const r=await fetch('/api/coach/routine',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},signal:c.signal,body:JSON.stringify({prompt:this.prompt,level:this.level(),place:this.place(),minutes:this.minutes(),brand:this.brand.id})});
    const data=await r.json();if(!r.ok)throw Error(r.status===401?'Ingresá a tu cuenta desde Perfil para pedir una propuesta con IA.':data.error??'No se pudo preparar la propuesta.');
    const routine=validateRoutine(data.routine);if(!routine)throw Error('La propuesta no tiene un formato válido.');
    if(snapshot!==this.requestKey())throw Error('Cambiaste el pedido. Volvé a generar la propuesta con las opciones actuales.');
    this.candidate.set(routine);this.candidateKey=snapshot;
  }catch(error){if(!c.signal.aborted)this.error.set(error instanceof Error?error.message:'No se pudo conectar. Podés usar la propuesta guiada.');else if(this.controller===c)this.error.set('La solicitud se interrumpió. Tu borrador se conserva.');}finally{clearTimeout(timeout);if(this.controller===c){this.busy.set(false);this.controller=null;}}}
  apply(){const r=this.candidate();if(this.candidateKey!==this.requestKey()){this.candidate.set(null);this.error.set('Cambiaste el pedido. Generá una propuesta con las opciones actuales.');return;}if(r){this.proposed.emit(r);this.candidate.set(null);}}
  exerciseName(id:string){return this.catalog.find(e=>e.id===id)?.name??id;}
  cancel(){this.controller?.abort();this.controller=null;this.busy.set(false);}
  ngOnDestroy(){this.cancel();this.statusController?.abort();}
}
