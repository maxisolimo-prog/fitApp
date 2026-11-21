import assert from 'node:assert/strict';
import test from 'node:test';
import {parseCoachUsage} from '../src/app/core/coach-usage';

test('el cupo recibido de la API se valida antes de habilitar solicitudes',()=>{
  const quota={daily:{limit:10,remaining:9,resetsAt:'2026-11-22T00:00:00.000Z'},monthly:{limit:20,remaining:18,resetsAt:'2026-12-01T00:00:00.000Z'}};
  assert.deepEqual(parseCoachUsage(quota),quota);
  for(const daily of [{...quota.daily,remaining:-1},{...quota.daily,remaining:11},{...quota.daily,remaining:NaN},{...quota.daily,remaining:0.5},{...quota.daily,resetsAt:'no-es-fecha'}])assert.equal(parseCoachUsage({...quota,daily}),null);
  assert.equal(parseCoachUsage(null),null);assert.equal(parseCoachUsage({daily:quota.daily}),null);
  assert.equal(parseCoachUsage({...quota,monthly:{...quota.monthly,remaining:0}})?.monthly.remaining,0);
});
