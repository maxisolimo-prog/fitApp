export interface ExerciseDemonstration {
  video: string;
  poster: string;
  gif?: string;
  description: string;
  width: number;
  height: number;
}

const demo = (id: string, description: string): ExerciseDemonstration => ({
  video: `exercise-demos/${id}.webm`, poster: `exercise-demos/${id}.jpg`,
  gif: `exercise-demos/${id}.gif`, description, width: 512, height: 512,
});

/** Solo variantes exactas: un jalón cerrado no ilustra un jalón con barra ancha. */
export const EXERCISE_MEDIA: Readonly<Record<string, ExerciseDemonstration | undefined>> = {
  'bench-press': {
    video: 'exercise-demos/bench-press.webm', poster: 'exercise-demos/bench-press.webp',
    description: 'Bajá la barra hacia el pecho y empujala hacia arriba. Los pectorales están resaltados.',
    width: 704, height: 504,
  },
  'incline-press': demo('incline-press', 'Banco inclinado a 45°. Empujá las mancuernas hacia arriba y bajá con control.'),
  treadmill: demo('treadmill', 'Caminá a un ritmo cómodo, con pasos naturales y el torso erguido.'),
  'close-grip-lat-pulldown': demo('close-grip-lat-pulldown', 'Llevá el agarre cerrado hacia la parte alta del pecho. Volvé sin balancear el torso.'),
  'seated-cable-fly': demo('seated-cable-fly', 'Sentado entre las poleas, acercá las manos frente al pecho con los codos ligeramente flexionados.'),
  'parallel-bar-dip': demo('parallel-bar-dip', 'Bajá entre las barras dentro de un recorrido cómodo y empujá para volver a subir.'),
  'stair-climber': demo('stair-climber', 'Alterná los pasos sobre los escalones, con el torso erguido y sin colgarte de los apoyos.'),
  'seated-row': demo('seated-row', "Llevá el agarre hacia el torso con los codos cerca del cuerpo y volvé sin balancearte."),
  'lat-pulldown': demo('lat-pulldown', "Llevá la barra por delante de la cabeza hacia el pecho y volvé con control."),
  'shoulder-press': demo('shoulder-press', "Empujá las mancuernas por encima de los hombros y bajá sin arquear la espalda."),
  'lateral-raise': demo('lateral-raise', "Elevá las mancuernas hacia los lados sin encoger los hombros y bajá con control."),
  'biceps-curl': demo('biceps-curl', "Subí las mancuernas flexionando los codos, con las palmas hacia arriba y sin balancearte."),
  'triceps-pushdown': demo('triceps-pushdown', "Extendé los codos hacia abajo, manteniéndolos cerca del torso, y volvé lentamente."),
  'goblet-squat': demo('goblet-squat', "Bajá con la mancuerna cerca del pecho y subí manteniendo los pies firmes."),
  'leg-press': demo('leg-press', "Acercá la plataforma con control y empujá sin despegar la pelvis ni bloquear las rodillas."),
  'romanian-deadlift': demo('romanian-deadlift', "Llevá la cadera atrás y bajá las mancuernas cerca de las piernas con la espalda estable."),
  'reverse-lunge': demo('reverse-lunge', "Da un paso atrás, bajá con control y volvé. Repetí también del otro lado."),
  'glute-bridge': demo('glute-bridge', "Elevá la pelvis hasta alinear tronco y muslos, sin arquear de más la espalda."),
  'push-up': demo('push-up', "Bajá el pecho manteniendo el cuerpo alineado y empujá para volver."),
  'bird-dog': demo('bird-dog', "Desde cuatro apoyos, extendé un brazo y la pierna contraria sin girar la pelvis. Alterná los lados."),
  'dead-bug': demo('dead-bug', "Extendé un brazo y la pierna contraria sin despegar la zona lumbar. Volvé y alterná."),
  'dumbbell-fly': demo('dumbbell-fly', "Abrí los brazos en arco con una leve flexión de codos y volvé sobre el pecho."),
  'chest-press-machine': demo('chest-press-machine', "Empujá las manijas hacia adelante y volvé despacio con la espalda apoyada."),
  'cable-crossover': demo('cable-crossover', "Acercá las manos hacia adelante y abajo, manteniendo una leve flexión de codos."),
  'barbell-row': demo('barbell-row', "Llevá la barra al abdomen y bajá con control, manteniendo estable la inclinación del torso."),
  'one-arm-row': demo('one-arm-row', "Llevá la mancuerna hacia la cadera sin girar el torso. Repetí del otro lado."),
  'assisted-pull-up': demo('assisted-pull-up', "Subí hacia la barra con la asistencia de la máquina y bajá con control."),
  'pull-up': demo('pull-up', "Subí hacia la barra sin balancearte y bajá hasta extender los brazos con control."),
  'overhead-press': demo('overhead-press', "Empujá la barra por encima de la cabeza y bajá con el abdomen firme."),
  'rear-delt-fly': demo('rear-delt-fly', "Abrí los brazos hacia los lados sin levantar ni balancear el torso."),
  'face-pull': demo('face-pull', "Tirá de la cuerda hacia la frente separando las manos y volvé sin balancearte."),
  'barbell-curl': demo('barbell-curl', "Flexioná los codos para subir la barra sin mover el torso y bajá despacio."),
  'hammer-curl': demo('hammer-curl', "Subí las mancuernas con las palmas enfrentadas y los codos cerca del cuerpo."),
  'overhead-triceps': demo('overhead-triceps', "Bajá la mancuerna detrás de la cabeza flexionando los codos y extendé sin arquearte."),
  'bench-dip': demo('bench-dip', "Flexioná los codos en un recorrido cómodo para los hombros y empujá para subir."),
  'back-squat': demo('back-squat', "Bajá con la barra sobre la espalda y subí empujando el piso, con los pies firmes."),
  'leg-extension': demo('leg-extension', "Extendé las rodillas sin despegar la cadera del asiento y bajá lentamente."),
  'leg-curl': demo('leg-curl', "Flexioná las rodillas acercando los talones a los glúteos y volvé con control."),
  'calf-raise': demo('calf-raise', "Subí en puntas de pie y bajá los talones con control, manteniendo el apoyo delantero."),
  'bulgarian-split-squat': demo('bulgarian-split-squat', "Bajá con un pie apoyado atrás y subí con la pierna delantera. Repetí del otro lado."),
  'hip-thrust': demo('hip-thrust', "Elevá la cadera con la espalda alta apoyada y bajá sin arquear la zona lumbar."),
  'cable-kickback': demo('cable-kickback', "Llevá la pierna hacia atrás sin mover la pelvis ni arquear la espalda. Alterná los lados."),
  'hip-abduction': demo('hip-abduction', "Abrí las piernas empujando las almohadillas hacia afuera y cerrá con control."),
  'deadlift': demo('deadlift', "Levantá la barra cerca del cuerpo extendiendo cadera y rodillas y bajá con control."),
  'back-extension': demo('back-extension', "Flexioná desde la cadera y subí solo hasta alinear el cuerpo, sin hiperextender la espalda."),
  'crunch': demo('crunch', "Despegá los hombros contrayendo el abdomen, sin tirar del cuello, y bajá despacio."),
  'leg-raise': demo('leg-raise', "Elevá y bajá las piernas sin despegar la zona lumbar; flexioná las rodillas si hace falta."),
  'pallof-press': demo('pallof-press', "Extendé las manos al frente sin dejar que el torso gire hacia la polea y volvé al pecho."),
};
