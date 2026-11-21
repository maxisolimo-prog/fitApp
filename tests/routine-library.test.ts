import assert from 'node:assert/strict';
import test from 'node:test';
import {copyRoutineDraft,filterRoutineLibrary} from '../src/app/core/routine-library';
import {seedExercises,seedRoutines} from '../src/app/core/seed';
import {createInitialState,validateRoutine} from '../src/app/core/workout-utils';

test('la búsqueda combina nombre, ejercicio y equipo sin tildes con los filtros de nivel y creación',()=>{
  const source=seedRoutines.find(r=>r.id==='lower-body')!;
  const custom={...source,id:'custom',name:'Técnica suave',custom:true};const routines=[...seedRoutines,custom];
  assert.deepEqual(filterRoutineLibrary(routines,seedExercises,' tecnica   suave ','Todas').map(r=>r.id),['custom']);
  assert.ok(filterRoutineLibrary(routines,seedExercises,'rumano mancuernas','Todas').some(r=>r.id===source.id));
  assert.deepEqual(filterRoutineLibrary(routines,seedExercises,'goblet','Mis creaciones').map(r=>r.id),['custom']);
  assert.equal(filterRoutineLibrary(routines,seedExercises,'nunca encontrado','Todas').length,0);
  assert.equal(filterRoutineLibrary(routines,seedExercises,'técnica','Principiante').length,0);
  assert.equal(filterRoutineLibrary(routines,seedExercises,'','Todas').length,routines.length);
});

test('la copia es un borrador independiente y conserva series por tiempo, kilos y referencias a ejercicios',()=>{
  const state=createInitialState(),source={...state.routines[0],custom:true};
  source.exercises=[{exerciseId:'treadmill',sets:1,reps:0,weight:0,durationSeconds:600,restSeconds:0},...source.exercises.map(e=>({...e,weight:25}))];
  const snapshot=structuredClone(source),copy=copyRoutineDraft(source,[source],'new-id');
  assert.equal(copy.id,'new-id');assert.ok(copy.custom);assert.ok(validateRoutine(copy));assert.deepEqual(copy.exercises,source.exercises);
  copy.exercises[0].durationSeconds=300;copy.exercises[1].weight=10;assert.deepEqual(source,snapshot);
  assert.deepEqual(state.history,[]);assert.equal(state.program,null);
});

test('las copias repetidas tienen nombre único y respetan el largo máximo sin cortar emojis',()=>{
  const source={...seedRoutines[0],name:'💪'.repeat(50)};
  const first=copyRoutineDraft(source,[source],'copy-1');const second=copyRoutineDraft(source,[source,first],'copy-2');
  assert.notEqual(first.name,second.name);assert.ok(first.name.length<=100&&second.name.length<=100);
  assert.ok(validateRoutine(first));assert.ok(validateRoutine(second));assert.ok(second.name.endsWith('Copia 2'));
  assert.ok(!/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/.test(first.name));
});
