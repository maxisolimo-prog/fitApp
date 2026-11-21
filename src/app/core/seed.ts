import type { Exercise, Profile, Routine } from './models';
import { EXERCISE_MEDIA } from './exercise-media';

/**
 * Starter catalogue, not a personalized training prescription.
 * Template loads start at 0: users enter their actual load before recording sets.
 * All repetitions refer to controlled movements; unilateral counts are per side.
 * No completed workouts, weight measurements or achievements are pre-populated.
 *
 * Músculos: `primaryMuscles` hace el trabajo principal y `secondaryMuscles` ayuda a mover; no se listan los que
 * solo estabilizan. Es una clasificación general, cruzada con free-exercise-db (dominio público) el 18 de noviembre
 * de 2026, y está pendiente de revisión por un profesional, igual que las indicaciones.
 *
 * Movimiento: `movement` agrupa los ejercicios que se pueden reemplazar entre sí durante una sesión (nombres en
 * `movements.ts`). También es una clasificación general pendiente de revisión.
 */
export const seedExercises: Exercise[] = [
  {
    id: 'bench-press',
    name: 'Press de banca',
    muscle: 'Pecho',
    equipment: 'Barra',
    movement: 'press-pecho',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['deltoids', 'triceps'],
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
    movement: 'press-pecho',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['deltoids', 'triceps'],
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
    movement: 'remo',
    primaryMuscles: ['upper-back'],
    secondaryMuscles: ['biceps', 'trapezius', 'deltoids'],
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
    movement: 'traccion-vertical',
    primaryMuscles: ['upper-back'],
    secondaryMuscles: ['biceps', 'forearm'],
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
    movement: 'press-hombros',
    primaryMuscles: ['deltoids'],
    secondaryMuscles: ['triceps', 'trapezius'],
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
    movement: 'elevacion-lateral',
    primaryMuscles: ['deltoids'],
    secondaryMuscles: ['trapezius'],
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
    movement: 'curl-biceps',
    primaryMuscles: ['biceps'],
    secondaryMuscles: ['forearm'],
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
    movement: 'extension-triceps',
    primaryMuscles: ['triceps'],
    secondaryMuscles: [],
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
    movement: 'sentadilla',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: ['gluteal', 'hamstring', 'adductors'],
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
    movement: 'sentadilla',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: ['gluteal', 'hamstring'],
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
    movement: 'bisagra-cadera',
    primaryMuscles: ['hamstring', 'gluteal'],
    secondaryMuscles: ['lower-back'],
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
    movement: 'zancada',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: ['gluteal', 'hamstring'],
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
    movement: 'extension-cadera',
    primaryMuscles: ['gluteal'],
    secondaryMuscles: ['hamstring'],
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
    movement: 'press-pecho',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['deltoids', 'triceps'],
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
    movement: 'estabilidad-tronco',
    primaryMuscles: ['lower-back'],
    secondaryMuscles: ['gluteal', 'abs', 'deltoids'],
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
    movement: 'estabilidad-tronco',
    primaryMuscles: ['abs'],
    secondaryMuscles: ['obliques'],
    instructions: [
      'Acostate boca arriba con los brazos elevados y las rodillas flexionadas.',
      'Extendé lentamente un brazo y la pierna contraria, manteniendo estable el torso.',
      'Regresá y cambiá de lado. Acortá el recorrido si perdés el control de la espalda.',
    ],
  },
  // ---- Catálogo ampliado (16 de noviembre de 2026). Indicaciones generales: validar con un profesional. ----
  { id: 'dumbbell-fly', name: 'Aperturas con mancuernas', muscle: 'Pecho', equipment: 'Mancuernas', movement: 'apertura-pecho', primaryMuscles: ['chest'], secondaryMuscles: ['deltoids'], instructions: [
    'Acostate en el banco con las mancuernas arriba del pecho y los codos apenas flexionados.',
    'Abrí los brazos en arco hasta sentir estiramiento en el pecho, sin bajar de más.',
    'Volvé por el mismo arco, como si abrazaras un árbol, sin chocar las mancuernas.',
  ] },
  { id: 'chest-press-machine', name: 'Press de pecho en máquina', muscle: 'Pecho', equipment: 'Máquina', movement: 'press-pecho', primaryMuscles: ['chest'], secondaryMuscles: ['deltoids', 'triceps'], instructions: [
    'Ajustá el asiento para que las manijas queden a la altura del pecho.',
    'Empujá hacia adelante sin bloquear de golpe los codos.',
    'Volvé despacio hasta un recorrido cómodo, con la espalda apoyada.',
  ] },
  { id: 'cable-crossover', name: 'Cruce de poleas', muscle: 'Pecho', equipment: 'Polea', movement: 'apertura-pecho', primaryMuscles: ['chest'], secondaryMuscles: ['deltoids'], instructions: [
    'Parate entre las poleas con un pie adelante y el torso apenas inclinado.',
    'Llevá las manos hacia adelante y abajo hasta juntarlas frente al pecho.',
    'Volvé con control hasta sentir el estiramiento, sin dejar que las poleas tiren de vos.',
  ] },
  { id: 'barbell-row', name: 'Remo con barra', muscle: 'Espalda', equipment: 'Barra', movement: 'remo', primaryMuscles: ['upper-back'], secondaryMuscles: ['biceps', 'trapezius', 'deltoids', 'lower-back'], instructions: [
    'Inclinate desde la cadera con la espalda recta y las rodillas algo flexionadas.',
    'Llevá la barra hacia el abdomen juntando los omóplatos.',
    'Bajá con control. Si se te redondea la espalda, bajá la carga.',
  ] },
  { id: 'one-arm-row', name: 'Remo con mancuerna a una mano', muscle: 'Espalda', equipment: 'Mancuerna', movement: 'remo', primaryMuscles: ['upper-back'], secondaryMuscles: ['biceps', 'trapezius', 'deltoids'], instructions: [
    'Apoyá una mano y una rodilla en el banco, con la espalda paralela al piso.',
    'Llevá la mancuerna hacia la cadera con el codo cerca del cuerpo.',
    'Bajá despacio sin girar el torso. Las repeticiones son por lado.',
  ] },
  { id: 'assisted-pull-up', name: 'Dominadas asistidas', muscle: 'Espalda', equipment: 'Máquina', movement: 'traccion-vertical', primaryMuscles: ['upper-back'], secondaryMuscles: ['biceps', 'forearm'], instructions: [
    'Elegí un contrapeso que te permita completar las repeticiones con buena técnica.',
    'Tirá llevando el pecho hacia la barra, sin balancearte.',
    'Bajá con control hasta extender los brazos.',
  ] },
  { id: 'pull-up', name: 'Dominadas', muscle: 'Espalda', equipment: 'Peso corporal', movement: 'traccion-vertical', primaryMuscles: ['upper-back'], secondaryMuscles: ['biceps', 'forearm'], instructions: [
    'Colgate de la barra con un agarre algo más ancho que los hombros.',
    'Subí llevando el pecho hacia la barra, sin patear ni balancearte.',
    'Bajá despacio hasta extender los brazos. Si no llegás, usá asistencia.',
  ] },
  { id: 'overhead-press', name: 'Press militar con barra', muscle: 'Hombros', equipment: 'Barra', movement: 'press-hombros', primaryMuscles: ['deltoids'], secondaryMuscles: ['triceps', 'trapezius'], instructions: [
    'De pie, con la barra apoyada adelante de los hombros y el abdomen firme.',
    'Empujá la barra hacia arriba pasando cerca de la cara.',
    'Bajá con control sin arquear la zona lumbar.',
  ] },
  { id: 'rear-delt-fly', name: 'Vuelos posteriores', muscle: 'Hombros', equipment: 'Mancuernas', movement: 'hombro-posterior', primaryMuscles: ['deltoids'], secondaryMuscles: ['trapezius'], instructions: [
    'Inclinate desde la cadera con la espalda recta y las mancuernas colgando.',
    'Abrí los brazos hacia los lados con los codos apenas flexionados.',
    'Bajá lento, sin usar impulso del torso.',
  ] },
  { id: 'face-pull', name: 'Face pull', muscle: 'Hombros', equipment: 'Polea', movement: 'hombro-posterior', primaryMuscles: ['deltoids'], secondaryMuscles: ['trapezius'], instructions: [
    'Con la polea a la altura de la cara, tomá la cuerda con las palmas hacia adentro.',
    'Tirá hacia la frente separando las manos y abriendo los codos.',
    'Volvé con control sin dejar que la polea te lleve.',
  ] },
  { id: 'barbell-curl', name: 'Curl con barra', muscle: 'Bíceps', equipment: 'Barra', movement: 'curl-biceps', primaryMuscles: ['biceps'], secondaryMuscles: ['forearm'], instructions: [
    'De pie, con la barra a la altura de los muslos y los codos pegados al cuerpo.',
    'Flexioná los codos para subir la barra sin balancear la espalda.',
    'Bajá despacio hasta extender los brazos.',
  ] },
  { id: 'hammer-curl', name: 'Curl martillo', muscle: 'Bíceps', equipment: 'Mancuernas', movement: 'curl-biceps', primaryMuscles: ['biceps'], secondaryMuscles: ['forearm'], instructions: [
    'Sostené las mancuernas con las palmas mirándose entre sí.',
    'Subí flexionando los codos, sin moverlos hacia adelante.',
    'Bajá con control y mantené las muñecas firmes.',
  ] },
  { id: 'overhead-triceps', name: 'Extensión de tríceps sobre la cabeza', muscle: 'Tríceps', equipment: 'Mancuerna', movement: 'extension-triceps', primaryMuscles: ['triceps'], secondaryMuscles: [], instructions: [
    'Sentado o de pie, sostené una mancuerna con las dos manos por encima de la cabeza.',
    'Bajala por detrás de la cabeza flexionando solo los codos.',
    'Extendé los brazos sin abrir los codos ni arquear la espalda.',
  ] },
  { id: 'bench-dip', name: 'Fondos en banco', muscle: 'Tríceps', equipment: 'Peso corporal', movement: 'extension-triceps', primaryMuscles: ['triceps'], secondaryMuscles: ['deltoids', 'chest'], instructions: [
    'Apoyá las manos en el borde de un banco detrás tuyo, con las piernas adelante.',
    'Bajá flexionando los codos hasta un recorrido cómodo para los hombros.',
    'Empujá para subir. Flexioná las rodillas para hacerlo más fácil.',
  ] },
  { id: 'back-squat', name: 'Sentadilla con barra', muscle: 'Piernas', equipment: 'Barra', movement: 'sentadilla', primaryMuscles: ['quadriceps'], secondaryMuscles: ['gluteal', 'hamstring', 'adductors', 'lower-back'], instructions: [
    'Apoyá la barra sobre la parte alta de la espalda y separá los pies al ancho de hombros.',
    'Bajá llevando la cadera atrás y abajo, con las rodillas en línea con los pies.',
    'Subí empujando el piso. Usá soportes de seguridad en el rack.',
  ] },
  { id: 'leg-extension', name: 'Extensión de cuádriceps', muscle: 'Piernas', equipment: 'Máquina', movement: 'extension-rodilla', primaryMuscles: ['quadriceps'], secondaryMuscles: [], instructions: [
    'Ajustá el respaldo para que la rodilla quede alineada con el eje de la máquina.',
    'Extendé las piernas sin despegar la cadera del asiento.',
    'Bajá despacio, sin dejar caer el peso.',
  ] },
  { id: 'leg-curl', name: 'Curl femoral', muscle: 'Piernas', equipment: 'Máquina', movement: 'flexion-rodilla', primaryMuscles: ['hamstring'], secondaryMuscles: ['calves'], instructions: [
    'Ajustá la máquina para que el rodillo quede sobre los tobillos.',
    'Flexioná las rodillas llevando los talones hacia los glúteos.',
    'Volvé con control hasta casi extender las piernas.',
  ] },
  { id: 'calf-raise', name: 'Elevación de talones', muscle: 'Piernas', equipment: 'Máquina', movement: 'gemelos', primaryMuscles: ['calves'], secondaryMuscles: [], instructions: [
    'Apoyá la punta de los pies en el borde con los talones libres.',
    'Subí en puntas de pie lo más alto que puedas.',
    'Bajá lento hasta sentir el estiramiento de la pantorrilla.',
  ] },
  { id: 'bulgarian-split-squat', name: 'Sentadilla búlgara', muscle: 'Piernas', equipment: 'Mancuernas', movement: 'zancada', primaryMuscles: ['quadriceps'], secondaryMuscles: ['gluteal', 'hamstring'], instructions: [
    'Apoyá el empeine de un pie en un banco detrás tuyo y adelantá el otro.',
    'Bajá flexionando la rodilla de adelante, con el torso estable.',
    'Subí empujando con la pierna de adelante. Las repeticiones son por lado.',
  ] },
  { id: 'hip-thrust', name: 'Hip thrust', muscle: 'Glúteos', equipment: 'Barra', movement: 'extension-cadera', primaryMuscles: ['gluteal'], secondaryMuscles: ['hamstring'], instructions: [
    'Apoyá la parte alta de la espalda en un banco, con la barra sobre la cadera y una almohadilla.',
    'Elevá la cadera apretando los glúteos hasta alinear tronco y muslos.',
    'Bajá con control sin arquear de más la zona lumbar.',
  ] },
  { id: 'cable-kickback', name: 'Patada de glúteo en polea', muscle: 'Glúteos', equipment: 'Polea', movement: 'extension-cadera', primaryMuscles: ['gluteal'], secondaryMuscles: ['hamstring'], instructions: [
    'Colocá la tobillera en la polea baja y apoyá las manos en la máquina.',
    'Llevá la pierna hacia atrás apretando el glúteo, sin arquear la espalda.',
    'Volvé despacio. Las repeticiones son por lado.',
  ] },
  { id: 'hip-abduction', name: 'Abducción de cadera en máquina', muscle: 'Glúteos', equipment: 'Máquina', movement: 'abduccion-cadera', primaryMuscles: ['gluteal'], secondaryMuscles: [], instructions: [
    'Sentate con la espalda apoyada y las almohadillas por fuera de las rodillas.',
    'Abrí las piernas empujando hacia afuera, con control.',
    'Volvé lento sin dejar que las placas choquen.',
  ] },
  { id: 'deadlift', name: 'Peso muerto con barra', muscle: 'Cadena posterior', equipment: 'Barra', movement: 'bisagra-cadera', primaryMuscles: ['gluteal', 'hamstring', 'lower-back'], secondaryMuscles: ['quadriceps', 'trapezius', 'upper-back', 'forearm'], instructions: [
    'Con la barra sobre la mitad del pie, tomala con la espalda recta y el pecho alto.',
    'Subí empujando el piso y extendiendo cadera y rodillas a la vez, con la barra cerca del cuerpo.',
    'Bajá con la misma técnica. Si la espalda se redondea, bajá la carga.',
  ] },
  { id: 'back-extension', name: 'Hiperextensiones', muscle: 'Cadena posterior', equipment: 'Banco', movement: 'bisagra-cadera', primaryMuscles: ['lower-back'], secondaryMuscles: ['gluteal', 'hamstring'], instructions: [
    'Ubicate en el banco con la cadera apoyada y los pies trabados.',
    'Bajá el torso flexionando la cadera, con la espalda recta.',
    'Subí hasta alinear el cuerpo, sin hiperextender la zona lumbar.',
  ] },
  { id: 'crunch', name: 'Abdominales crunch', muscle: 'Core', equipment: 'Peso corporal', movement: 'flexion-tronco', primaryMuscles: ['abs'], secondaryMuscles: ['obliques'], instructions: [
    'Acostate boca arriba con las rodillas flexionadas y las manos a los costados de la cabeza.',
    'Despegá los hombros del piso contrayendo el abdomen, sin tirar del cuello.',
    'Bajá despacio y repetí.',
  ] },
  { id: 'leg-raise', name: 'Elevación de piernas', muscle: 'Core', equipment: 'Peso corporal', movement: 'flexion-tronco', primaryMuscles: ['abs'], secondaryMuscles: ['obliques'], instructions: [
    'Acostate boca arriba con las manos debajo de la cadera.',
    'Elevá las piernas hasta un ángulo cómodo con la zona lumbar apoyada.',
    'Bajalas despacio sin despegar la espalda. Flexioná las rodillas para hacerlo más fácil.',
  ] },
  { id: 'pallof-press', name: 'Pallof press', muscle: 'Core', equipment: 'Polea', movement: 'estabilidad-tronco', primaryMuscles: ['obliques', 'abs'], secondaryMuscles: ['deltoids'], instructions: [
    'Parate de costado a la polea con el agarre frente al pecho.',
    'Extendé los brazos hacia adelante sin dejar que el torso gire.',
    'Volvé al pecho con control. Las repeticiones son por lado.',
  ] },
];

/**
 * Plantillas iniciales. Se pueden corregir entre versiones, pero no conviene renombrar ni quitar un id: un
 * dispositivo que todavía tiene esa plantilla dejaría de contar como "sin datos" al ingresar a una cuenta
 * (`isFactoryState` en workout-utils.ts).
 */
seedExercises.push(
  {
    id: 'treadmill', name: 'Cinta de correr (caminata)', muscle: 'Cardio', equipment: 'Máquina',
    movement: 'cardio', tracking: 'duration', primaryMuscles: ['quadriceps', 'calves'], secondaryMuscles: ['gluteal', 'hamstring'],
    instructions: ['Con la cinta detenida, ubicá el botón de parada y colocá el clip de seguridad.', 'Empezá a baja velocidad y caminá con pasos naturales, mirando al frente.', 'Ajustá el ritmo de a poco. Reducí la velocidad hasta detener la cinta antes de bajar.'],
  },
  {
    id: 'close-grip-lat-pulldown', name: 'Jalón al pecho con agarre cerrado', muscle: 'Espalda', equipment: 'Polea',
    movement: 'traccion-vertical', primaryMuscles: ['upper-back'], secondaryMuscles: ['biceps', 'forearm'],
    instructions: ['Ajustá el apoyo de los muslos y tomá el agarre cerrado con las palmas enfrentadas.', 'Llevá el agarre hacia la parte alta del pecho, con los codos cerca del cuerpo y sin balancearte.', 'Volvé extendiendo los brazos con control, sin dejar caer el peso.'],
  },
  {
    id: 'seated-cable-fly', name: 'Vuelo sentado con polea', muscle: 'Pecho', equipment: 'Polea',
    movement: 'apertura-pecho', primaryMuscles: ['chest'], secondaryMuscles: ['deltoids'],
    instructions: ['Sentate entre las poleas con los pies apoyados y los agarres a los lados del pecho.', 'Con los codos ligeramente flexionados, acercá las manos frente al pecho sin cambiar el ángulo de los brazos.', 'Abrí despacio hasta un recorrido cómodo, manteniendo el torso estable.'],
  },
  {
    id: 'parallel-bar-dip', name: 'Fondos de tríceps en paralelas', muscle: 'Tríceps', equipment: 'Paralelas',
    movement: 'extension-triceps', primaryMuscles: ['triceps'], secondaryMuscles: ['chest', 'deltoids'],
    instructions: ['Tomá las barras y sostené el cuerpo con los hombros estables. Usá asistencia si la necesitás.', 'Flexioná los codos y bajá solo hasta donde puedas mantener el control sin molestias.', 'Empujá las barras para subir, sin rebotes ni balanceos.'],
  },
  {
    id: 'stair-climber', name: 'Escaladora', muscle: 'Cardio', equipment: 'Máquina',
    movement: 'cardio', tracking: 'duration', primaryMuscles: ['quadriceps', 'gluteal'], secondaryMuscles: ['calves', 'hamstring'],
    instructions: ['Subí con la máquina detenida y ubicá el control de parada.', 'Empezá despacio, alternando los pies y apoyándolos de forma estable en cada escalón.', 'Mantené el torso erguido y usá los apoyos para equilibrarte. Detené la máquina antes de bajar.'],
  },
);
for (const exercise of seedExercises) exercise.image = EXERCISE_MEDIA[exercise.id]?.poster;

export const seedRoutines: Routine[] = [
  {
    id: 'upper-body',
    name: 'Tren superior',
    description: 'Pecho, espalda y hombros. Una base simple para construir fuerza en el gimnasio.',
    category: 'Fuerza',
    duration: 35,
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
    duration: 35,
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
    duration: 25,
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
    duration: 20,
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
  focus: 'fuerza',
  place: 'gimnasio',
};
