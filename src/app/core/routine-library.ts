import type { Exercise, Routine } from './models';
import { estimateRoutineMinutes } from './workout-utils';

const normalize=(value:string)=>value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase('es').trim();

export function filterRoutineLibrary(routines:Routine[],exercises:Exercise[],query:string,filter:string):Routine[]{
  const byId=new Map(exercises.map(e=>[e.id,e]));
  const terms=normalize(query).split(/\s+/).filter(Boolean);
  return routines.filter(routine=>{
    if(filter!=='Todas' && (filter==='Mis creaciones'?!routine.custom:routine.level!==filter))return false;
    if(!terms.length)return true;
    const details=routine.exercises.flatMap(entry=>{const e=byId.get(entry.exerciseId);return e?[e.name,e.muscle,e.equipment]:[];});
    const text=normalize([routine.name,routine.description,routine.category,routine.level,...details].join(' '));
    return terms.every(term=>text.includes(term));
  });
}

function prefixWithin(value:string,length:number):string{
  let result='';for(const char of value){if(result.length+char.length>length)break;result+=char;}return result.trimEnd();
}

/** Crea un borrador independiente. Solo WorkoutStore.saveRoutine lo incorpora a la biblioteca. */
export function copyRoutineDraft(source:Routine,existing:Routine[],id:string):Routine{
  const names=new Set(existing.map(r=>normalize(r.name)));let name='',number=1;
  do{const suffix=' · Copia'+(number===1?'':' '+number);name=prefixWithin(source.name,100-suffix.length)+suffix;number++;}while(names.has(normalize(name)));
  return {...source,id,name,custom:true,duration:estimateRoutineMinutes(source),exercises:source.exercises.map(entry=>({...entry}))};
}
