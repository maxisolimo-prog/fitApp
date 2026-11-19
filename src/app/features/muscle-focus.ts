import type { MuscleId } from '../core/models';

export type BodySide = 'front' | 'back';
type Crop = 'torso' | 'thighs' | 'legs';

/**
 * Dónde mirar para ver cada músculo en una miniatura: de qué lado del cuerpo y con qué recorte.
 * Sale de medir el dibujo de `muscle-map.data.ts` (cada lado ocupa 724 × 1448): si el dibujo cambia, hay que
 * volver a medir.
 */
const FOCUS: Readonly<Record<MuscleId, { side: BodySide; crop: Crop }>> = {
  trapezius: { side: 'back', crop: 'torso' },
  deltoids: { side: 'front', crop: 'torso' },
  chest: { side: 'front', crop: 'torso' },
  'upper-back': { side: 'back', crop: 'torso' },
  'lower-back': { side: 'back', crop: 'torso' },
  biceps: { side: 'front', crop: 'torso' },
  triceps: { side: 'back', crop: 'torso' },
  forearm: { side: 'front', crop: 'torso' },
  abs: { side: 'front', crop: 'torso' },
  obliques: { side: 'front', crop: 'torso' },
  gluteal: { side: 'back', crop: 'thighs' },
  quadriceps: { side: 'front', crop: 'thighs' },
  hamstring: { side: 'back', crop: 'thighs' },
  adductors: { side: 'front', crop: 'thighs' },
  calves: { side: 'back', crop: 'legs' },
  tibialis: { side: 'front', crop: 'legs' },
};

/** Recortes cuadrados: desde qué altura del dibujo y cuánto miden de lado. */
const CROPS: Readonly<Record<Crop, { top: number; size: number }>> = {
  torso: { top: 235, size: 490 },
  thighs: { top: 610, size: 400 },
  legs: { top: 950, size: 350 },
};

/** Eje vertical del cuerpo en cada lado del dibujo. */
const CENTER: Readonly<Record<BodySide, number>> = { front: 362, back: 1086 };

export interface ThumbView {
  side: BodySide;
  /** `viewBox` cuadrado para el SVG de la miniatura. */
  viewBox: string;
}

/** Lado y recorte de una miniatura: los decide el primer músculo principal. */
export function thumbView(primary: readonly MuscleId[]): ThumbView {
  const { side, crop } = FOCUS[primary[0]] ?? FOCUS.chest;
  const { top, size } = CROPS[crop];
  return { side, viewBox: `${CENTER[side] - size / 2} ${top} ${size} ${size}` };
}

/** Lado en el que se mira cada músculo (para verificar contra el dibujo). */
export function focusSide(muscle: MuscleId): BodySide {
  return FOCUS[muscle].side;
}
