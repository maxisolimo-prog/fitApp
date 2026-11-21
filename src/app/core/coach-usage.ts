export interface CoachUsage {
  daily: { limit: number; remaining: number; resetsAt: string };
  monthly: { limit: number; remaining: number; resetsAt: string };
}

export function parseCoachUsage(value: unknown): CoachUsage | null {
  if (!value || typeof value !== 'object') return null;
  const record=value as Record<string,unknown>;
  const parse=(v:unknown):CoachUsage['daily']|null=>{
    if(!v||typeof v!=='object')return null;
    const p=v as Record<string,unknown>;
    if(typeof p['limit']!=='number'||!Number.isSafeInteger(p['limit'])||p['limit']<0
      ||typeof p['remaining']!=='number'||!Number.isInteger(p['remaining'])||p['remaining']<0||p['remaining']>p['limit']
      ||typeof p['resetsAt']!=='string'||!Number.isFinite(Date.parse(p['resetsAt'])))return null;
    return {limit:p['limit'],remaining:p['remaining'],resetsAt:p['resetsAt']};
  };
  const daily=parse(record['daily']),monthly=parse(record['monthly']);
  return daily&&monthly?{daily,monthly}:null;
}
