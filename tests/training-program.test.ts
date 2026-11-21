import assert from 'node:assert/strict';
import test from 'node:test';
import '@angular/compiler';
import {WorkoutStore} from '../src/app/core/workout-store';
import {createInitialState,validateState,isFactoryState,plannedRoutineId,serializeState,deserializeState} from '../src/app/core/workout-utils';
import {advanceProgram,validateProgram} from '../src/app/core/training-program';

test('v1–v6 migran sin programa; v7 rechaza secuencias o enlaces activos inválidos',()=>{
  const s=createInitialState();
  for(let version=1;version<=6;version++)assert.equal(validateState({...s,version})?.program,null);
  const p={id:'p',name:' Mi programa ',routineIds:[s.routines[0].id,s.routines[0].id],position:0,paused:false};
  assert.equal(validateProgram(p,s.routines)?.name,'Mi programa');
  for(const bad of [{...p,position:-1},{...p,position:3},{...p,routineIds:['unknown']},{...p,routineIds:[]},{...p,paused:1}])assert.equal(validateProgram(bad,s.routines),null);
  assert.equal(validateState({...s,program:undefined}),null);
  assert.equal(isFactoryState({...s,program:p}),false);
});

test('solo una sesión del paso actual avanza; descarte, entrenamiento libre y doble guardado no avanzan',()=>{
  const store=new WorkoutStore();const ids=store.routines().slice(0,2).map(r=>r.id);
  assert.ok(store.saveProgram('Secuencia',ids));
  assert.ok(store.startProgramWorkout());assert.equal(store.finishWorkout(),null);assert.equal(store.program()!.position,0);
  assert.equal(store.saveProgram('Otra',ids),false);assert.equal(store.clearProgram(),false);
  const snapshot=deserializeState(store.exportJson())!;assert.deepEqual(snapshot,validateState(JSON.parse(serializeState(snapshot))));
  assert.ok(snapshot.activeWorkout?.programStep);
  assert.equal(validateState({...snapshot,program:{...snapshot.program,position:1}}),null);
  store.discardWorkout();assert.equal(store.program()!.position,0);
  store.startWorkout(ids[0]);store.toggleSet(0);store.finishWorkout();assert.equal(store.program()!.position,0);
  store.startProgramWorkout();store.toggleSet(0);const finished=store.finishWorkout()!;
  assert.equal(store.program()!.position,1);assert.equal(advanceProgram(store.program(),finished)!.position,1);
  store.pauseProgram(true);assert.equal(store.startProgramWorkout(),false);store.pauseProgram(false);
  store.startProgramWorkout();store.toggleSet(0);store.finishWorkout();assert.equal(store.program()!.position,2);
  assert.equal(store.nextProgramRoutine(),null);assert.equal(store.startProgramWorkout(),false);
});

test('el programa conserva calendario, semana tipo, importación y protección de rutinas referidas',()=>{
  const store=new WorkoutStore();const id=store.routines()[0].id;
  store.setWeeklyPlan(0,id);store.scheduleRoutine('2026-11-23',null);
  const calendar=store.schedule(),week=store.weeklyPlan();store.saveProgram('Libre',[id,id]);
  assert.equal(plannedRoutineId(store.snapshot(),'2026-11-23'),null);
  assert.equal(store.deleteRoutine(id),false);
  assert.deepEqual(store.schedule(),calendar);assert.deepEqual(store.weeklyPlan(),week);
  const copy=new WorkoutStore();assert.ok(copy.importJson(store.exportJson()));assert.deepEqual(copy.program(),store.program());
  assert.ok(copy.clearProgram());assert.equal(copy.program(),null);assert.deepEqual(copy.history(),store.history());
});
