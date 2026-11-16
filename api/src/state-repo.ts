import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import type { FitnessLevel, Routine, RoutineCategory, ScheduledWorkout, WeightRecord, Workout, WorkoutSet } from '../../src/app/core/models.ts';
import { validateState, type FitAppState } from '../../src/app/core/workout-utils.ts';
import { fromSqlDateTime, toSqlDateTime, transaction } from './db.ts';

type Row = RowDataPacket & Record<string, unknown>;
type Executor = Pool | PoolConnection;

async function rows(db: Executor, sql: string, params: unknown[]): Promise<Row[]> {
  const [result] = await db.query<Row[]>(sql, params);
  return result;
}

/** Inserts in chunks so a large history never exceeds max_allowed_packet. */
async function insertMany(db: PoolConnection, table: string, columns: string[], values: unknown[][]): Promise<void> {
  const chunk = 500;
  for (let start = 0; start < values.length; start += chunk) {
    const part = values.slice(start, start + chunk);
    const placeholders = part.map(() => `(${columns.map(() => '?').join(',')})`).join(',');
    await db.query(`INSERT INTO ${table} (${columns.join(',')}) VALUES ${placeholders}`, part.flat());
  }
}

export interface StoredState { revision: number; state: FitAppState | null }

/** Rebuilds FitAppState v2 from the relational rows. revision 0 means the account has no data yet. */
export async function loadState(db: Executor, userId: number): Promise<StoredState> {
  const [user] = await rows(db, 'SELECT name, goal, level, weekly_goal, weight, revision FROM users WHERE id = ?', [userId]);
  if (!user) throw new Error('Usuario inexistente');
  const revision = Number(user['revision']);
  if (revision === 0) return { revision, state: null };

  const routineRows = await rows(db, 'SELECT id, name, description, category, duration, level, custom FROM routines WHERE user_id = ? ORDER BY position', [userId]);
  const exerciseRows = await rows(db, 'SELECT routine_id, exercise_id, sets, reps, weight, rest_seconds FROM routine_exercises WHERE user_id = ? ORDER BY routine_id, position', [userId]);
  const workoutRows = await rows(db, 'SELECT id, is_active, routine_id, routine_name, started_at, finished_at, notes FROM workouts WHERE user_id = ? ORDER BY position', [userId]);
  const setRows = await rows(db, 'SELECT workout_id, exercise_id, exercise_name, set_number, reps, weight, completed FROM workout_sets WHERE user_id = ? ORDER BY workout_id, position', [userId]);
  const scheduleRows = await rows(db, 'SELECT id, date, routine_id FROM scheduled_workouts WHERE user_id = ? ORDER BY date', [userId]);
  const weightRows = await rows(db, 'SELECT id, date, weight FROM weight_records WHERE user_id = ? ORDER BY date', [userId]);
  const planRows = await rows(db, 'SELECT weekday, routine_id FROM weekly_plan WHERE user_id = ?', [userId]);

  const exercisesByRoutine = new Map<string, Routine['exercises']>();
  for (const row of exerciseRows) {
    const list = exercisesByRoutine.get(String(row['routine_id'])) ?? [];
    list.push({ exerciseId: String(row['exercise_id']), sets: Number(row['sets']), reps: Number(row['reps']), weight: Number(row['weight']), restSeconds: Number(row['rest_seconds']) });
    exercisesByRoutine.set(String(row['routine_id']), list);
  }
  const routines: Routine[] = routineRows.map((row) => ({
    id: String(row['id']), name: String(row['name']), description: String(row['description']),
    category: row['category'] as RoutineCategory, duration: Number(row['duration']), level: row['level'] as FitnessLevel,
    exercises: exercisesByRoutine.get(String(row['id'])) ?? [],
    ...(row['custom'] === null ? {} : { custom: Number(row['custom']) === 1 }),
  }));

  const setsByWorkout = new Map<string, WorkoutSet[]>();
  for (const row of setRows) {
    const list = setsByWorkout.get(String(row['workout_id'])) ?? [];
    list.push({ exerciseId: String(row['exercise_id']), exerciseName: String(row['exercise_name']), setNumber: Number(row['set_number']), reps: Number(row['reps']), weight: Number(row['weight']), completed: Number(row['completed']) === 1 });
    setsByWorkout.set(String(row['workout_id']), list);
  }
  let activeWorkout: Workout | null = null;
  const history: Workout[] = [];
  for (const row of workoutRows) {
    const workout: Workout = {
      id: String(row['id']), routineId: String(row['routine_id']), routineName: String(row['routine_name']),
      startedAt: fromSqlDateTime(String(row['started_at'])),
      finishedAt: row['finished_at'] === null ? null : fromSqlDateTime(String(row['finished_at'])),
      sets: setsByWorkout.get(String(row['id'])) ?? [],
      ...(row['notes'] === null ? {} : { notes: String(row['notes']) }),
    };
    if (Number(row['is_active']) === 1) activeWorkout = workout; else history.push(workout);
  }
  const schedule: ScheduledWorkout[] = scheduleRows.map((row) => ({ id: String(row['id']), date: String(row['date']), routineId: String(row['routine_id']) }));
  const weeklyPlan: (string | null)[] = [null, null, null, null, null, null, null];
  for (const row of planRows) weeklyPlan[Number(row['weekday'])] = String(row['routine_id']);
  const weights: WeightRecord[] = weightRows.map((row) => ({ id: String(row['id']), date: String(row['date']), weight: Number(row['weight']) }));

  const state: FitAppState = {
    version: 2,
    profile: { name: String(user['name']), goal: String(user['goal']), level: user['level'] as FitnessLevel, weeklyGoal: Number(user['weekly_goal']), weight: user['weight'] === null ? null : Number(user['weight']) },
    routines, history, schedule, weeklyPlan, weights, activeWorkout,
  };
  return { revision, state };
}

/** DATETIME accepts years 1000–9999; anything outside 1970–9999 is not a real session anyway. */
function storableTimestamps(state: FitAppState): boolean {
  const ok = (iso: string | null) => iso === null || (Date.parse(iso) >= 0 && Date.parse(iso) < Date.UTC(10000, 0, 1));
  return [...state.history, ...(state.activeWorkout ? [state.activeWorkout] : [])].every((w) => ok(w.startedAt) && ok(w.finishedAt));
}

export type SaveResult = { ok: true; revision: number } | { ok: false; conflict: StoredState } | { ok: false; invalid: true };

/**
 * Replaces the user's data with a validated snapshot, but only if baseRevision matches the stored
 * revision (optimistic concurrency). The row lock on users serialises concurrent saves.
 */
export async function saveState(pool: Pool, userId: number, baseRevision: number, input: unknown): Promise<SaveResult> {
  const state = validateState(input);
  if (!state || !storableTimestamps(state)) return { ok: false, invalid: true };
  return transaction(pool, async (db) => {
    const [user] = await rows(db, 'SELECT revision FROM users WHERE id = ? FOR UPDATE', [userId]);
    const current = Number(user['revision']);
    if (current !== baseRevision) return { ok: false, conflict: await loadState(db, userId) };

    // Children go with ON DELETE CASCADE.
    for (const table of ['routines', 'workouts', 'scheduled_workouts', 'weekly_plan', 'weight_records']) {
      await db.query(`DELETE FROM ${table} WHERE user_id = ?`, [userId]);
    }
    const { profile } = state;
    await db.query('UPDATE users SET name = ?, goal = ?, level = ?, weekly_goal = ?, weight = ?, revision = ? WHERE id = ?',
      [profile.name, profile.goal, profile.level, profile.weeklyGoal, profile.weight, current + 1, userId]);

    await insertMany(db, 'routines', ['user_id', 'id', 'position', 'name', 'description', 'category', 'duration', 'level', 'custom'],
      state.routines.map((r, i) => [userId, r.id, i, r.name, r.description, r.category, r.duration, r.level, r.custom === undefined ? null : r.custom ? 1 : 0]));
    await insertMany(db, 'routine_exercises', ['user_id', 'routine_id', 'position', 'exercise_id', 'sets', 'reps', 'weight', 'rest_seconds'],
      state.routines.flatMap((r) => r.exercises.map((e, i) => [userId, r.id, i, e.exerciseId, e.sets, e.reps, e.weight, e.restSeconds])));

    const workouts = [...state.history.map((w) => ({ w, active: 0 })), ...(state.activeWorkout ? [{ w: state.activeWorkout, active: 1 }] : [])];
    await insertMany(db, 'workouts', ['user_id', 'id', 'position', 'is_active', 'routine_id', 'routine_name', 'started_at', 'finished_at', 'notes'],
      workouts.map(({ w, active }, i) => [userId, w.id, i, active, w.routineId, w.routineName, toSqlDateTime(w.startedAt), w.finishedAt === null ? null : toSqlDateTime(w.finishedAt), w.notes ?? null]));
    await insertMany(db, 'workout_sets', ['user_id', 'workout_id', 'position', 'exercise_id', 'exercise_name', 'set_number', 'reps', 'weight', 'completed'],
      workouts.flatMap(({ w }) => w.sets.map((s, i) => [userId, w.id, i, s.exerciseId, s.exerciseName, s.setNumber, s.reps, s.weight, s.completed ? 1 : 0])));

    await insertMany(db, 'scheduled_workouts', ['user_id', 'id', 'date', 'routine_id'], state.schedule.map((s) => [userId, s.id, s.date, s.routineId]));
    await insertMany(db, 'weight_records', ['user_id', 'id', 'date', 'weight'], state.weights.map((w) => [userId, w.id, w.date, w.weight]));
    await insertMany(db, 'weekly_plan', ['user_id', 'weekday', 'routine_id'],
      state.weeklyPlan.flatMap((routineId, weekday) => routineId === null ? [] : [[userId, weekday, routineId]]));
    return { ok: true, revision: current + 1 };
  });
}
