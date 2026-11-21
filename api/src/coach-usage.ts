import type { Pool, RowDataPacket } from 'mysql2/promise';
import { transaction } from './db.ts';
import type { CoachUsage } from '../../src/app/core/coach-usage.ts';

export const COACH_DAILY_LIMIT = 10;
export function coachPeriods(now = new Date()) {
  const year=now.getUTCFullYear(),month=now.getUTCMonth(),day=now.getUTCDate();
  return {date:now.toISOString().slice(0,10),month:now.toISOString().slice(0,7),
    dailyReset:new Date(Date.UTC(year,month,day+1)).toISOString(),monthlyReset:new Date(Date.UTC(year,month+1,1)).toISOString()};
}

export async function loadCoachUsage(pool: Pool, userId: number, monthlyLimit: number, now = new Date()): Promise<CoachUsage> {
  const period=coachPeriods(now);
  const [daily]=await pool.query<RowDataPacket[]>('SELECT requests FROM ai_daily_usage WHERE user_id=? AND date=?',[userId,period.date]);
  const [monthly]=await pool.query<RowDataPacket[]>('SELECT requests FROM ai_monthly_usage WHERE month=?',[period.month]);
  return {daily:{limit:COACH_DAILY_LIMIT,remaining:Math.max(0,COACH_DAILY_LIMIT-Number(daily[0]?.requests??0)),resetsAt:period.dailyReset},
    monthly:{limit:monthlyLimit,remaining:Math.max(0,monthlyLimit-Number(monthly[0]?.requests??0)),resetsAt:period.monthlyReset}};
}

export async function reserveCoachUsage(pool: Pool, userId: number, monthlyLimit: number, now = new Date()): Promise<'ok'|'daily'|'monthly'> {
  const period=coachPeriods(now);
  return transaction(pool,async db=>{
    // Orden de bloqueo fijo: mes global, luego día del usuario. Cuenta y cupo se reservan juntos.
    await db.query('INSERT INTO ai_monthly_usage (month, requests) VALUES (?,0) ON DUPLICATE KEY UPDATE requests=requests',[period.month]);
    const [monthly]=await db.query<RowDataPacket[]>('SELECT requests FROM ai_monthly_usage WHERE month=? FOR UPDATE',[period.month]);
    if(Number(monthly[0]['requests'])>=monthlyLimit)return 'monthly';
    await db.query('INSERT INTO ai_daily_usage (user_id,date,requests) VALUES (?,?,0) ON DUPLICATE KEY UPDATE requests=requests',[userId,period.date]);
    const [daily]=await db.query<RowDataPacket[]>('SELECT requests FROM ai_daily_usage WHERE user_id=? AND date=? FOR UPDATE',[userId,period.date]);
    if(Number(daily[0]['requests'])>=COACH_DAILY_LIMIT)return 'daily';
    await db.query('UPDATE ai_monthly_usage SET requests=requests+1 WHERE month=?',[period.month]);
    await db.query('UPDATE ai_daily_usage SET requests=requests+1 WHERE user_id=? AND date=?',[userId,period.date]);
    return 'ok';
  });
}
