import type { MuscleId } from './models';

/**
 * Lista cerrada de músculos: son las zonas que el mapa muscular puede dibujar (`features/muscle-map`). El orden
 * de este objeto, de arriba hacia abajo, es el que se usa para mostrarlos. TypeScript exige una entrada por cada
 * `MuscleId` y ninguna de más.
 *
 * No están los que el dibujo no trae (romboides, flexores de cadera, abductores, manguito rotador): un ejercicio
 * que los trabaja marca la zona vecina más cercana o ninguna.
 */
export const MUSCLE_LABELS: Readonly<Record<MuscleId, string>> = {
  trapezius: 'Trapecio',
  deltoids: 'Deltoides',
  chest: 'Pecho',
  'upper-back': 'Dorsales',
  'lower-back': 'Lumbares',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  forearm: 'Antebrazos',
  abs: 'Abdominales',
  obliques: 'Oblicuos',
  gluteal: 'Glúteos',
  quadriceps: 'Cuádriceps',
  hamstring: 'Isquiotibiales',
  adductors: 'Aductores',
  calves: 'Gemelos',
  tibialis: 'Tibiales',
};

export const MUSCLE_IDS: readonly MuscleId[] = Object.keys(MUSCLE_LABELS) as MuscleId[];

export function isMuscleId(value: unknown): value is MuscleId {
  return typeof value === 'string' && Object.hasOwn(MUSCLE_LABELS, value);
}

/** Nombres en el orden de la lista cerrada, sin repetir. */
export function muscleNames(ids: readonly MuscleId[]): string[] {
  return MUSCLE_IDS.filter((id) => ids.includes(id)).map((id) => MUSCLE_LABELS[id]);
}

/** "Pecho", "Pecho y tríceps", "Glúteos e isquiotibiales": para leer de corrido. */
export function muscleSentence(ids: readonly MuscleId[]): string {
  const names = muscleNames(ids).map((name, index) => (index === 0 ? name : name.toLocaleLowerCase('es')));
  if (names.length <= 1) return names[0] ?? '';
  const last = names[names.length - 1];
  const and = /^(i|hi(?!e))/i.test(last) ? 'e' : 'y';
  return `${names.slice(0, -1).join(', ')} ${and} ${last}`;
}
