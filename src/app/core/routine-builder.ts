import type { Exercise, FitnessLevel, MovementId, MuscleId, RoutineExercise, TrainingFocus, TrainingPlace } from './models';
import { MUSCLE_IDS } from './muscles';
import { SETUP_SECONDS_PER_EXERCISE, WORK_SECONDS_PER_SET, estimateRoutineMinutes } from './workout-utils';

/**
 * Propuesta de rutina por reglas ("Armámela"). A partir de qué zona quiere trabajar la persona, cuánto tiempo
 * tiene, dónde entrena, su nivel y su objetivo, elige ejercicios del catálogo y les pone series, repeticiones y
 * descanso. No hay IA ni datos de la persona: la misma respuesta da siempre la misma propuesta.
 *
 * Es un punto de partida general que la persona revisa y cambia antes de guardar, nunca una prescripción
 * personalizada. Las cargas van siempre en 0: no se inventan pesos. Todo lo que hay acá (qué ejercicio se
 * prefiere, cuántas series, cuánto descanso) está pendiente de revisión por un profesional, igual que los
 * músculos y los movimientos: ver `docs/REVISION-PROFESIONAL.md`.
 */

export type RoutineTarget = 'cuerpo-completo' | 'tren-superior' | 'tren-inferior' | 'empuje' | 'traccion' | 'zona-media';

/** Nombradas por lo que trabajan, no por la jerga ("empuje", "tirón"): quien recién empieza no la conoce. */
export const ROUTINE_TARGET_LABELS: Readonly<Record<RoutineTarget, string>> = {
  'cuerpo-completo': 'Cuerpo completo',
  'tren-superior': 'Tren superior',
  'tren-inferior': 'Piernas y glúteos',
  empuje: 'Pecho, hombros y tríceps',
  traccion: 'Espalda y bíceps',
  'zona-media': 'Abdominales y zona media',
};
export const ROUTINE_TARGETS: readonly RoutineTarget[] = Object.keys(ROUTINE_TARGET_LABELS) as RoutineTarget[];

/** Los tiempos que se ofrecen. La propuesta acepta cualquier cantidad de minutos. */
export const PROPOSAL_MINUTES: readonly number[] = [20, 30, 45, 60];

export const TRAINING_FOCUS_LABELS: Readonly<Record<TrainingFocus, string>> = {
  fuerza: 'Ganar fuerza',
  musculo: 'Ganar músculo',
  grasa: 'Bajar grasa',
  salud: 'Salud y bienestar',
};

export const TRAINING_PLACE_LABELS: Readonly<Record<TrainingPlace, string>> = {
  gimnasio: 'Gimnasio',
  'casa-pesas': 'Casa con pesas',
  'casa-sin-equipo': 'Casa sin equipo',
};

/** Más ejercicios que estos no hacen mejor una rutina: si sobra tiempo, se suma una serie a los que ya están. */
export const MAX_PROPOSED_EXERCISES = 8;
/** Con menos tiempo que este, la propuesta no reserva lugar para el ejercicio de cierre (zona media). */
const CLOSING_FROM_MINUTES = 30;
/** Quien recién empieza no baja de estas repeticiones, aunque su objetivo sea la fuerza. */
const BEGINNER_MIN_REPS = 8;
const MAX_SETS_AFTER_FILL = 5;

interface TargetPlan {
  /** Movimientos en el orden en que se entrenan: los que mueven más peso van primero. */
  main: readonly MovementId[];
  /** Movimiento con el que cierra la rutina, si el tiempo alcanza. */
  closing: MovementId | null;
}

const PLANS: Readonly<Record<RoutineTarget, TargetPlan>> = {
  'cuerpo-completo': {
    main: ['sentadilla', 'press-pecho', 'remo', 'bisagra-cadera', 'press-hombros', 'traccion-vertical', 'zancada', 'extension-cadera', 'curl-biceps', 'extension-triceps'],
    closing: 'estabilidad-tronco',
  },
  'tren-superior': {
    main: ['press-pecho', 'remo', 'press-hombros', 'traccion-vertical', 'curl-biceps', 'extension-triceps', 'elevacion-lateral', 'hombro-posterior', 'apertura-pecho'],
    closing: null,
  },
  'tren-inferior': {
    main: ['sentadilla', 'bisagra-cadera', 'zancada', 'extension-cadera', 'flexion-rodilla', 'extension-rodilla', 'abduccion-cadera', 'gemelos'],
    closing: 'estabilidad-tronco',
  },
  empuje: { main: ['press-pecho', 'press-hombros', 'apertura-pecho', 'elevacion-lateral', 'extension-triceps'], closing: null },
  traccion: { main: ['traccion-vertical', 'remo', 'hombro-posterior', 'curl-biceps'], closing: null },
  'zona-media': { main: ['estabilidad-tronco', 'flexion-tronco'], closing: null },
};

/**
 * Qué ejercicio se propone primero para cada movimiento cuando la persona recién empieza: el más simple de
 * aprender. Sigue el criterio de las rutinas iniciales. Un ejercicio del catálogo que no figure acá queda al
 * final, en el orden del catálogo.
 */
const STARTER_ORDER: Readonly<Record<MovementId, readonly string[]>> = {
  cardio: ['treadmill', 'stair-climber'],
  'press-pecho': ['incline-press', 'chest-press-machine', 'push-up', 'bench-press'],
  'apertura-pecho': ['cable-crossover', 'dumbbell-fly', 'seated-cable-fly'],
  remo: ['seated-row', 'one-arm-row', 'barbell-row'],
  'traccion-vertical': ['lat-pulldown', 'assisted-pull-up', 'pull-up', 'close-grip-lat-pulldown'],
  'press-hombros': ['shoulder-press', 'overhead-press'],
  'elevacion-lateral': ['lateral-raise'],
  'hombro-posterior': ['face-pull', 'rear-delt-fly'],
  'curl-biceps': ['biceps-curl', 'hammer-curl', 'barbell-curl'],
  'extension-triceps': ['triceps-pushdown', 'overhead-triceps', 'bench-dip', 'parallel-bar-dip'],
  sentadilla: ['goblet-squat', 'leg-press', 'back-squat'],
  zancada: ['reverse-lunge', 'bulgarian-split-squat'],
  'bisagra-cadera': ['romanian-deadlift', 'back-extension', 'deadlift'],
  'extension-cadera': ['glute-bridge', 'cable-kickback', 'hip-thrust'],
  'abduccion-cadera': ['hip-abduction'],
  'extension-rodilla': ['leg-extension'],
  'flexion-rodilla': ['leg-curl'],
  gemelos: ['calf-raise'],
  'flexion-tronco': ['crunch', 'leg-raise'],
  'estabilidad-tronco': ['bird-dog', 'dead-bug', 'pallof-press'],
};

/**
 * Con experiencia (intermedio o avanzado) cambia el primer ejercicio de algunos movimientos: pasa al de barra o al
 * más exigente. El peso muerto con barra y las dominadas no pasan al primer lugar: piden una técnica que una
 * propuesta automática no puede dar por sabida.
 */
const EXPERIENCED_ORDER: Readonly<Partial<Record<MovementId, readonly string[]>>> = {
  'press-pecho': ['bench-press', 'incline-press', 'chest-press-machine', 'push-up'],
  remo: ['barbell-row', 'seated-row', 'one-arm-row'],
  'press-hombros': ['overhead-press', 'shoulder-press'],
  'curl-biceps': ['barbell-curl', 'biceps-curl', 'hammer-curl'],
  sentadilla: ['back-squat', 'leg-press', 'goblet-squat'],
  zancada: ['bulgarian-split-squat', 'reverse-lunge'],
  'extension-cadera': ['hip-thrust', 'glute-bridge', 'cable-kickback'],
  'estabilidad-tronco': ['dead-bug', 'pallof-press', 'bird-dog'],
};

/** Para los tests: los ejercicios que nombra cada lista de preferencia, con su movimiento. */
export const PREFERENCE_ORDERS: readonly Readonly<Partial<Record<MovementId, readonly string[]>>>[] = [STARTER_ORDER, EXPERIENCED_ORDER];

/** Equipo del catálogo que se da por disponible en una casa con pesas. */
const HOME_WEIGHTS: ReadonlySet<string> = new Set(['Mancuernas', 'Mancuerna', 'Peso corporal']);
/** Con el peso del cuerpo, pero colgándose de una barra fija: en una casa no se da por sentada. */
const NEEDS_FIXED_BAR: ReadonlySet<string> = new Set(['pull-up']);

/**
 * Si un ejercicio se puede hacer en ese lugar, según el equipo que declara. El catálogo no dice si además hace
 * falta un banco (press inclinado, aperturas): en casa con pesas se proponen igual.
 */
export function availableAt(place: TrainingPlace, exercise: Pick<Exercise, 'id' | 'equipment'>): boolean {
  if (place === 'gimnasio') return true;
  if (NEEDS_FIXED_BAR.has(exercise.id)) return false;
  return place === 'casa-pesas' ? HOME_WEIGHTS.has(exercise.equipment) : exercise.equipment === 'Peso corporal';
}

type MovementKind = 'multiarticular' | 'accesorio' | 'tronco';

/** Multiarticular: mueve varias articulaciones y más peso. Accesorio: una sola articulación. */
const MOVEMENT_KIND: Readonly<Record<MovementId, MovementKind>> = {
  cardio: 'multiarticular',
  'press-pecho': 'multiarticular',
  remo: 'multiarticular',
  'traccion-vertical': 'multiarticular',
  'press-hombros': 'multiarticular',
  sentadilla: 'multiarticular',
  zancada: 'multiarticular',
  'bisagra-cadera': 'multiarticular',
  'extension-cadera': 'multiarticular',
  'apertura-pecho': 'accesorio',
  'elevacion-lateral': 'accesorio',
  'hombro-posterior': 'accesorio',
  'curl-biceps': 'accesorio',
  'extension-triceps': 'accesorio',
  'abduccion-cadera': 'accesorio',
  'extension-rodilla': 'accesorio',
  'flexion-rodilla': 'accesorio',
  gemelos: 'accesorio',
  'flexion-tronco': 'tronco',
  'estabilidad-tronco': 'tronco',
};

interface Dose { reps: number; restSeconds: number }

/** Repeticiones y descanso según el objetivo del perfil. Valores generales de partida, no una prescripción. */
const DOSE_BY_FOCUS: Readonly<Record<TrainingFocus, Readonly<Record<'multiarticular' | 'accesorio', Dose>>>> = {
  fuerza: { multiarticular: { reps: 6, restSeconds: 120 }, accesorio: { reps: 10, restSeconds: 75 } },
  musculo: { multiarticular: { reps: 10, restSeconds: 90 }, accesorio: { reps: 12, restSeconds: 60 } },
  grasa: { multiarticular: { reps: 12, restSeconds: 60 }, accesorio: { reps: 15, restSeconds: 45 } },
  salud: { multiarticular: { reps: 10, restSeconds: 75 }, accesorio: { reps: 12, restSeconds: 60 } },
};

/** La zona media no cambia con el objetivo: son los valores de las rutinas iniciales. */
const TRUNK_DOSE: Readonly<Record<'flexion-tronco' | 'estabilidad-tronco', Dose>> = {
  'flexion-tronco': { reps: 12, restSeconds: 45 },
  'estabilidad-tronco': { reps: 8, restSeconds: 45 },
};

const SETS_BY_LEVEL: Readonly<Record<FitnessLevel, Readonly<Record<MovementKind, number>>>> = {
  Principiante: { multiarticular: 2, accesorio: 2, tronco: 2 },
  Intermedio: { multiarticular: 3, accesorio: 2, tronco: 2 },
  Avanzado: { multiarticular: 4, accesorio: 3, tronco: 3 },
};

/**
 * Series, repeticiones y descanso con los que entra un ejercicio a una rutina, según el objetivo y el nivel.
 * Es lo que usa la propuesta y también el valor inicial cuando la persona agrega un ejercicio a mano.
 */
export function defaultPrescription(exercise: Pick<Exercise, 'movement' | 'tracking'>, focus: TrainingFocus, level: FitnessLevel): Pick<RoutineExercise, 'sets' | 'reps' | 'restSeconds' | 'durationSeconds'> {
  if (exercise.tracking === 'duration') return { sets: 1, reps: 0, restSeconds: 0, durationSeconds: 1200 };
  const kind = MOVEMENT_KIND[exercise.movement];
  const dose = kind === 'tronco'
    ? TRUNK_DOSE[exercise.movement as keyof typeof TRUNK_DOSE]
    : DOSE_BY_FOCUS[focus][kind];
  const reps = level === 'Principiante' ? Math.max(BEGINNER_MIN_REPS, dose.reps) : dose.reps;
  return { sets: SETS_BY_LEVEL[level][kind], reps, restSeconds: dose.restSeconds };
}

export interface ProposalRequest {
  target: RoutineTarget;
  /** Tiempo que la persona tiene. La propuesta nunca lo supera. */
  minutes: number;
  place: TrainingPlace;
  level: FitnessLevel;
  focus: TrainingFocus;
}

export interface RoutineProposal {
  /** Nombre sugerido; la persona lo puede cambiar. */
  name: string;
  /** Vacío cuando el catálogo no tiene ejercicios de esa zona para ese lugar. */
  exercises: RoutineExercise[];
  /** Duración estimada de lo propuesto, con el mismo cálculo que el resto de la app. */
  minutes: number;
}

/** Los ejercicios de un movimiento que se pueden hacer en ese lugar, del preferido al menos preferido. */
function candidates(movement: MovementId, request: Pick<ProposalRequest, 'place' | 'level'>, catalog: readonly Exercise[]): Exercise[] {
  const order = (request.level === 'Principiante' ? undefined : EXPERIENCED_ORDER[movement]) ?? STARTER_ORDER[movement];
  const rank = (id: string) => { const position = order.indexOf(id); return position < 0 ? order.length : position; };
  // El orden de Array.prototype.sort es estable: los que no figuran en la lista quedan en el orden del catálogo.
  return catalog.filter((exercise) => exercise.movement === movement && availableAt(request.place, exercise))
    .sort((a, b) => rank(a.id) - rank(b.id));
}

function seconds(entry: Pick<RoutineExercise, 'sets' | 'restSeconds'>): number {
  return SETUP_SECONDS_PER_EXERCISE + entry.sets * (WORK_SECONDS_PER_SET + entry.restSeconds);
}

/**
 * Arma la propuesta. Recorre los movimientos de la zona en orden y toma el ejercicio preferido de cada uno
 * mientras entre en el tiempo; si después de una vuelta sobra tiempo y quedan lugares, da otra vuelta con el
 * segundo ejercicio de cada movimiento. Con el tope de ejercicios alcanzado, el tiempo que sobra se usa para sumar
 * una serie a los ejercicios principales. El ejercicio de cierre va siempre último.
 */
export function buildRoutineProposal(request: ProposalRequest, catalog: readonly Exercise[]): RoutineProposal {
  const plan = PLANS[request.target];
  const budget = Math.max(0, request.minutes) * 60;
  const entryFor = (exercise: Exercise): RoutineExercise => ({
    exerciseId: exercise.id, ...defaultPrescription(exercise, request.focus, request.level), weight: 0,
  });

  const closingExercise = plan.closing && request.minutes >= CLOSING_FROM_MINUTES ? candidates(plan.closing, request, catalog)[0] : undefined;
  const closing = closingExercise ? entryFor(closingExercise) : null;
  const mainLimit = MAX_PROPOSED_EXERCISES - (closing ? 1 : 0);
  let spent = closing ? seconds(closing) : 0;

  const pools = plan.main.map((movement) => candidates(movement, request, catalog));
  const rounds = Math.max(0, ...pools.map((pool) => pool.length));
  const picked: { slot: number; round: number; entry: RoutineExercise }[] = [];
  for (let round = 0; round < rounds; round++) {
    pools.forEach((pool, slot) => {
      const exercise = pool[round];
      if (!exercise || picked.length >= mainLimit || exercise.id === closingExercise?.id) return;
      const entry = entryFor(exercise);
      if (spent + seconds(entry) > budget) return;
      spent += seconds(entry);
      picked.push({ slot, round, entry });
    });
  }
  if (!picked.length) return { name: proposalName(request.target), exercises: [], minutes: 0 };

  // Juntos los ejercicios del mismo movimiento, en el orden de la zona.
  picked.sort((a, b) => a.slot - b.slot || a.round - b.round);
  for (const { entry } of picked) {
    const extra = WORK_SECONDS_PER_SET + entry.restSeconds;
    if (entry.sets < MAX_SETS_AFTER_FILL && spent + extra <= budget) { entry.sets += 1; spent += extra; }
  }

  const exercises = [...picked.map((item) => item.entry), ...(closing ? [closing] : [])];
  return { name: proposalName(request.target), exercises, minutes: estimateRoutineMinutes({ exercises }) };
}

function proposalName(target: RoutineTarget): string {
  return `Rutina de ${ROUTINE_TARGET_LABELS[target].toLocaleLowerCase('es')}`;
}

/**
 * Qué músculos trabaja una rutina: los principales de sus ejercicios y, aparte, los que solo aparecen como
 * secundarios. En el orden de la lista cerrada. Sin porcentajes: es una guía, no una medición.
 */
export function routineMuscles(
  entries: readonly Pick<RoutineExercise, 'exerciseId'>[],
  catalog: readonly Pick<Exercise, 'id' | 'primaryMuscles' | 'secondaryMuscles'>[],
): { primary: MuscleId[]; secondary: MuscleId[] } {
  const primary = new Set<MuscleId>();
  const secondary = new Set<MuscleId>();
  for (const entry of entries) {
    const exercise = catalog.find((candidate) => candidate.id === entry.exerciseId);
    if (!exercise) continue;
    exercise.primaryMuscles.forEach((muscle) => primary.add(muscle));
    exercise.secondaryMuscles.forEach((muscle) => secondary.add(muscle));
  }
  return {
    primary: MUSCLE_IDS.filter((id) => primary.has(id)),
    secondary: MUSCLE_IDS.filter((id) => secondary.has(id) && !primary.has(id)),
  };
}
