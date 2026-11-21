import type { Exercise, MovementId } from './models';

/**
 * Patrones de movimiento del catálogo. Dos ejercicios con el mismo patrón se pueden reemplazar entre sí durante una
 * sesión (por ejemplo, un press de banca por un press inclinado). Es una clasificación general, pendiente de
 * revisión por un profesional, igual que los músculos y las indicaciones.
 */
export const MOVEMENT_LABELS: Readonly<Record<MovementId, string>> = {
  'press-pecho': 'Press de pecho',
  'apertura-pecho': 'Aperturas de pecho',
  remo: 'Remos',
  'traccion-vertical': 'Jalones y dominadas',
  'press-hombros': 'Press de hombros',
  'elevacion-lateral': 'Elevaciones laterales',
  'hombro-posterior': 'Hombro posterior',
  'curl-biceps': 'Curl de bíceps',
  'extension-triceps': 'Extensiones de tríceps',
  sentadilla: 'Sentadillas y prensa',
  zancada: 'Zancadas',
  'bisagra-cadera': 'Peso muerto y bisagra de cadera',
  'extension-cadera': 'Puentes y empuje de cadera',
  'abduccion-cadera': 'Abducción de cadera',
  'extension-rodilla': 'Extensión de rodilla',
  'flexion-rodilla': 'Flexión de rodilla',
  gemelos: 'Gemelos',
  'flexion-tronco': 'Abdominales',
  'estabilidad-tronco': 'Estabilidad del tronco',
  cardio: 'Cardio en máquina',
};

export function isMovementId(value: unknown): value is MovementId {
  return typeof value === 'string' && Object.hasOwn(MOVEMENT_LABELS, value);
}

export interface Substitutes<T> {
  /** Mismo patrón de movimiento: el reemplazo más parecido. */
  sameMovement: T[];
  /** Mismo grupo muscular con otro movimiento: sirve si no hay equipo para lo anterior. */
  sameGroup: T[];
}

/** Con qué se puede reemplazar un ejercicio, en el orden del catálogo. Nunca se incluye a sí mismo. */
export function substitutesFor<T extends Pick<Exercise, 'id' | 'movement' | 'muscle'>>(exercise: Pick<Exercise, 'id' | 'movement' | 'muscle'>, catalog: readonly T[]): Substitutes<T> {
  const others = catalog.filter((candidate) => candidate.id !== exercise.id);
  return {
    sameMovement: others.filter((candidate) => candidate.movement === exercise.movement),
    sameGroup: others.filter((candidate) => candidate.movement !== exercise.movement && candidate.muscle === exercise.muscle),
  };
}
