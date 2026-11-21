import test from 'node:test';
import assert from 'node:assert/strict';
import {coachPeriods} from '../src/coach-usage.ts';
import {coachEnabled,parseCoachRequest,hasClinicalRequest,generateCoachRoutine,validateCoachRoutine,type CoachConfig,type CoachRequest} from '../src/ai-coach.ts';
const input:CoachRequest={prompt:'Quiero trabajar todo el cuerpo',level:'Principiante',place:'gimnasio',minutes:30,brand:'fitapp'};
const config:CoachConfig={apiKey:'fake-test-key',model:'test-model',endpoint:'https://example.invalid/chat/completions',monthlyLimit:2,brands:['fitapp']};
const routine={name:'General',description:'Borrador',category:'Fuerza',exercises:[{exerciseId:'goblet-squat',sets:2,reps:10,weight:0,restSeconds:60,durationSeconds:null}]};

test('los cupos usan períodos UTC con renovación correcta al cambiar año o mes',()=>{
  assert.deepEqual(coachPeriods(new Date('2026-12-31T23:59:59.999Z')),{date:'2026-12-31',month:'2026-12',dailyReset:'2027-01-01T00:00:00.000Z',monthlyReset:'2027-01-01T00:00:00.000Z'});
  assert.equal(coachPeriods(new Date('2028-02-28T18:00:00.000Z')).dailyReset,'2028-02-29T00:00:00.000Z');
});
test('IA cerrada sin configuración, por marca y ante pedidos inválidos',()=>{
  assert.equal(coachEnabled({...config,apiKey:''},'fitapp'),false);assert.equal(coachEnabled(config,'qivox'),false);assert.equal(coachEnabled({...config,endpoint:'http://example.com'},'fitapp'),false);
  assert.ok(parseCoachRequest(input));for(const bad of [{...input,minutes:1},{...input,prompt:'x'},{...input,place:'otro'}])assert.equal(parseCoachRequest(bad),null);
  assert.ok(hasClinicalRequest('Me molesta el hombro'));assert.ok(hasClinicalRequest('dolor de rodilla'));assert.ok(hasClinicalRequest('una lesión'));assert.equal(hasClinicalRequest(input.prompt),false);
});
test('respuesta estructurada queda validada contra catálogo, equipo y tiempo antes de devolverla',async()=>{
  let sent:any;
  const fetcher:typeof fetch=async(_url,options)=>{sent=JSON.parse(String(options?.body));return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify(routine)}}]}));};
  const result=await generateCoachRoutine(input,config,fetcher);
  assert.equal(result.exercises[0].durationSeconds,undefined);assert.equal(result.exercises[0].weight,0);assert.ok(result.custom);assert.ok(result.duration<=30);
  assert.equal(sent.response_format.type,'json_schema');assert.equal(sent.model,'test-model');assert.ok(!JSON.stringify(sent).includes('fake-test-key'));
  for(const exercises of [[{...routine.exercises[0],exerciseId:'inexistente'}],[{...routine.exercises[0],weight:50}],[{...routine.exercises[0],sets:30}]])assert.equal(validateCoachRoutine({...routine,exercises},input),null);
  assert.equal(validateCoachRoutine({...routine,exercises:[{...routine.exercises[0],exerciseId:'leg-press',durationSeconds:undefined}]},{...input,place:'casa-sin-equipo'}),null);
  await assert.rejects(generateCoachRoutine(input,config,async()=>new Response('error',{status:500})));
  await assert.rejects(generateCoachRoutine(input,config,async()=>new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:'{}'}}]}))));
});

test('Gemini nativo usa clave en cabecera y ajusta series al presupuesto real de tiempo',async()=>{
  let sent:any;const native={...config,endpoint:'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'};
  const long={...routine,exercises:['glute-bridge','reverse-lunge','push-up','dead-bug'].map(exerciseId=>({...routine.exercises[0],exerciseId,sets:3}))};
  const result=await generateCoachRoutine({...input,minutes:20},native,async(url,options)=>{
    assert.ok(String(url).includes('/test-model:generateContent'));assert.equal((options?.headers as Record<string,string>)['x-goog-api-key'],'fake-test-key');sent=JSON.parse(String(options?.body));
    return new Response(JSON.stringify({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(long)}]}}]}));
  });
  assert.equal(sent.generationConfig.responseMimeType,'application/json');assert.ok(sent.generationConfig.responseJsonSchema);
  assert.ok(result.exercises.reduce((sum,e)=>sum+60+e.sets*((e.durationSeconds??45)+e.restSeconds),0)<=1200);
  assert.ok(result.description.includes('ajustadas'));
});
