import type { Exercise, Profile, Routine } from './models';

/**
 * Starter catalogue, not a personalized training prescription.
 * Template loads start at 0: users enter their actual load before recording sets.
 * All repetitions refer to controlled movements; unilateral counts are per side.
 * No completed workouts, weight measurements or achievements are pre-populated.
 */
export const seedExercises: Exercise[] = [
  {
    id: 'bench-press',
    name: 'Press de banca',
    muscle: 'Pecho',
    equipment: 'Barra',
    instructions: [
      'Apoyá los pies en el suelo y mantené la espalda estable sobre el banco.',
      'Bajá la barra con control hacia el pecho, sin rebotes.',
      'Empujá de forma controlada. Usá soportes de seguridad o pedí asistencia.',
    ],
  },
  {
    id: 'incline-press',
    name: 'Press inclinado con mancuernas',
    muscle: 'Pecho',
    equipment: 'Mancuernas',
    instructions: [
      'Ajustá el banco a una inclinación cómoda y apoyá bien los pies.',
      'Bajá las mancuernas a los lados del pecho dentro de un recorrido cómodo.',
      'Empujá sin golpear las mancuernas entre sí ni arquear de más la espalda.',
    ],
  },
  {
    id: 'seated-row',
    name: 'Remo en polea',
    muscle: 'Espalda',
    equipment: 'Polea',
    instructions: [
      'Sentate con la espalda estable y las rodillas ligeramente flexionadas.',
      'Llevá el agarre hacia el torso con los codos cerca del cuerpo.',
      'Volvé lentamente, evitando balancearte para mover el peso.',
    ],
  },
  {
    id: 'lat-pulldown',
    name: 'Jalón al pecho',
    muscle: 'Espalda',
    equipment: 'Polea',
    instructions: [
      'Ajustá el apoyo de las piernas y elegí un agarre cómodo.',
      'Llevá la barra hacia la parte alta del pecho, por delante de la cabeza.',
      'Dejá que los brazos se extiendan con control, sin soltar de golpe el peso.',
    ],
  },
  {
    id: 'shoulder-press',
    name: 'Press de hombros',
    muscle: 'Hombros',
    equipment: 'Mancuernas',
    instructions: [
      'Sentate con la espalda apoyada y las mancuernas cerca de los hombros.',
      'Empujá hacia arriba dentro de un recorrido cómodo.',
      'Bajá lentamente y mantené el torso estable, sin arquear la zona lumbar.',
    ],
  },
  {
    id: 'lateral-raise',
    name: 'Elevaciones laterales',
    muscle: 'Hombros',
    equipment: 'Mancuernas',
    instructions: [
      'Sostené las mancuernas a los lados y flexioná apenas los codos.',
      'Elevá los brazos hasta una altura cómoda, sin encoger los hombros.',
      'Bajá con control y evitá usar impulso con el torso.',
    ],
  },
  {
    id: 'biceps-curl',
    name: 'Curl de bíceps',
    muscle: 'Bíceps',
    equipment: 'Mancuernas',
    instructions: [
      'Mantené los pies firmes y los codos cerca del torso.',
      'Flexioná los codos para subir las mancuernas sin balancearte.',
      'Bajá lentamente y mantené las muñecas alineadas con los antebrazos.',
    ],
  },
  {
    id: 'triceps-pushdown',
    name: 'Extensión de tríceps',
    muscle: 'Tríceps',
    equipment: 'Polea',
    instructions: [
      'Colocate frente a la polea con los codos cerca del cuerpo.',
      'Extendé los brazos hacia abajo sin mover los hombros.',
      'Volvé despacio hasta la posición inicial, manteniendo el control.',
    ],
  },
  {
    id: 'goblet-squat',
    name: 'Sentadilla goblet',
    muscle: 'Piernas',
    equipment: 'Mancuerna',
    instructions: [
      'Sostené una mancuerna cerca del pecho y apoyá firmemente los pies.',
      'Flexioná caderas y rodillas hasta una profundidad cómoda.',
      'Volvé a subir con control, manteniendo las rodillas alineadas con los pies.',
    ],
  },
  {
    id: 'leg-press',
    name: 'Prensa de piernas',
    muscle: 'Piernas',
    equipment: 'Máquina',
    instructions: [
      'Ajustá el asiento y mantené la espalda y la pelvis apoyadas.',
      'Acercá la plataforma hasta un recorrido cómodo sin despegar la pelvis.',
      'Empujá con control, evitando bloquear bruscamente las rodillas.',
    ],
  },
  {
    id: 'romanian-deadlift',
    name: 'Peso muerto rumano',
    muscle: 'Cadena posterior',
    equipment: 'Mancuernas',
    instructions: [
      'Sostené las mancuernas delante del cuerpo con las rodillas algo flexionadas.',
      'Llevá la cadera hacia atrás y bajá las cargas cerca de las piernas.',
      'Volvé a erguirte con la espalda estable; detené el descenso antes de perder el control.',
    ],
  },
  {
    id: 'reverse-lunge',
    name: 'Zancada hacia atrás',
    muscle: 'Piernas',
    equipment: 'Peso corporal',
    instructions: [
      'De pie, llevá una pierna hacia atrás y buscá una posición estable.',
      'Flexioná ambas rodillas dentro de un recorrido cómodo.',
      'Volvé a la posición inicial. Las repeticiones indicadas son por lado.',
    ],
  },
  {
    id: 'glute-bridge',
    name: 'Puente de glúteos',
    muscle: 'Glúteos',
    equipment: 'Peso corporal',
    instructions: [
      'Acostate boca arriba con las rodillas flexionadas y los pies apoyados.',
      'Elevá la pelvis contrayendo los glúteos, sin arquear de más la espalda.',
      'Bajá lentamente hasta apoyar la pelvis de nuevo.',
    ],
  },
  {
    id: 'push-up',
    name: 'Flexiones de brazos',
    muscle: 'Pecho',
    equipment: 'Peso corporal',
    instructions: [
      'Apoyá las manos en el suelo o en una superficie elevada y estable.',
      'Bajá el pecho con el cuerpo alineado y los codos en una posición cómoda.',
      'Empujá para volver. Elegí una altura que te permita controlar cada repetición.',
    ],
  },
  {
    id: 'bird-dog',
    name: 'Bird dog',
    muscle: 'Core',
    equipment: 'Peso corporal',
    instructions: [
      'Apoyá manos y rodillas, manteniendo la espalda estable.',
      'Extendé un brazo y la pierna contraria sin girar la pelvis.',
      'Volvé despacio y alterná. Las repeticiones indicadas son por lado.',
    ],
  },
  {
    id: 'dead-bug',
    name: 'Dead bug',
    muscle: 'Core',
    equipment: 'Peso corporal',
    instructions: [
      'Acostate boca arriba con los brazos elevados y las rodillas flexionadas.',
      'Extendé lentamente un brazo y la pierna contraria, manteniendo estable el torso.',
      'Regresá y cambiá de lado. Acortá el recorrido si perdés el control de la espalda.',
    ],
  },
];

export const seedRoutines: Routine[] = [
  {
    id: 'upper-body',
    name: 'Tren superior',
    description: 'Pecho, espalda y hombros. Una base simple para construir fuerza en el gimnasio.',
    category: 'Fuerza',
    duration: 45,
    level: 'Intermedio',
    exercises: [
      { exerciseId: 'bench-press', sets: 3, reps: 10, weight: 0, restSeconds: 90 },
      { exerciseId: 'seated-row', sets: 3, reps: 12, weight: 0, restSeconds: 90 },
      { exerciseId: 'shoulder-press', sets: 3, reps: 10, weight: 0, restSeconds: 90 },
      { exerciseId: 'lat-pulldown', sets: 3, reps: 12, weight: 0, restSeconds: 75 },
      { exerciseId: 'biceps-curl', sets: 2, reps: 12, weight: 0, restSeconds: 60 },
    ],
  },
  {
    id: 'lower-body',
    name: 'Piernas y glúteos',
    description: 'Trabajá el tren inferior con movimientos controlados y descansos entre series.',
    category: 'Fuerza',
    duration: 40,
    level: 'Intermedio',
    exercises: [
      { exerciseId: 'goblet-squat', sets: 3, reps: 10, weight: 0, restSeconds: 90 },
      { exerciseId: 'romanian-deadlift', sets: 3, reps: 10, weight: 0, restSeconds: 90 },
      { exerciseId: 'leg-press', sets: 3, reps: 12, weight: 0, restSeconds: 90 },
      { exerciseId: 'glute-bridge', sets: 3, reps: 12, weight: 0, restSeconds: 60 },
      { exerciseId: 'dead-bug', sets: 2, reps: 8, weight: 0, restSeconds: 45 },
    ],
  },
  {
    id: 'full-body',
    name: 'Cuerpo completo inicial',
    description: 'Una rutina de cuerpo completo para empezar y familiarizarte con los movimientos.',
    category: 'Fuerza',
    duration: 35,
    level: 'Principiante',
    exercises: [
      { exerciseId: 'goblet-squat', sets: 2, reps: 10, weight: 0, restSeconds: 90 },
      { exerciseId: 'incline-press', sets: 2, reps: 10, weight: 0, restSeconds: 90 },
      { exerciseId: 'seated-row', sets: 2, reps: 12, weight: 0, restSeconds: 75 },
      { exerciseId: 'glute-bridge', sets: 2, reps: 12, weight: 0, restSeconds: 60 },
      { exerciseId: 'bird-dog', sets: 2, reps: 8, weight: 0, restSeconds: 45 },
    ],
  },
  {
    id: 'at-home',
    name: 'En casa, a tu ritmo',
    description: 'Sin máquinas ni pesas. Movimientos básicos para entrenar donde estés.',
    category: 'Resistencia',
    duration: 25,
    level: 'Principiante',
    exercises: [
      { exerciseId: 'reverse-lunge', sets: 2, reps: 8, weight: 0, restSeconds: 60 },
      { exerciseId: 'push-up', sets: 2, reps: 8, weight: 0, restSeconds: 75 },
      { exerciseId: 'glute-bridge', sets: 2, reps: 12, weight: 0, restSeconds: 45 },
      { exerciseId: 'bird-dog', sets: 2, reps: 8, weight: 0, restSeconds: 45 },
      { exerciseId: 'dead-bug', sets: 2, reps: 8, weight: 0, restSeconds: 45 },
    ],
  },
];

export const defaultProfile: Profile = {
  name: 'Atleta',
  goal: 'Ganar fuerza',
  level: 'Principiante',
  weeklyGoal: 3,
  weight: null,
};
