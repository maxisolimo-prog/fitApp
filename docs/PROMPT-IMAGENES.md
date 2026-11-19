# Prompt para las imágenes de los ejercicios

Para B-03 del [backlog](BACKLOG.md). Sirve para pedirle a GPT (ChatGPT con generación de imágenes, o `codex exec`)
la imagen de cada ejercicio. Armado el 19 de noviembre de 2026; **todavía no se generó ninguna imagen con él**.

## Cómo se usa

GPT no arma un GIF: genera imágenes fijas. Para que el ejercicio se mueva se le pide **una sola imagen con las dos
posiciones**, una al lado de la otra. Así la figura sale igual en las dos, que es lo que falla cuando se piden por
separado. Después la imagen se corta por la mitad y con los dos cuadros se arma la animación.

1. Copiá el prompt base.
2. Reemplazá `COLOR_PRINCIPAL` por el color con el que van los músculos: `lima #C8F24C` para FitApp. Ver la
   decisión 5 del backlog si la imagen tiene que servir para las tres marcas.
3. Reemplazá `BLOQUE_DEL_EJERCICIO` por el bloque del ejercicio, de la lista de abajo.
4. Empezá por uno solo (press de banca) y mirá el resultado antes de pedir el resto.

Cada imagen se revisa contra su ejercicio antes de entrar a la app: una imagen generada puede mostrar mal la técnica
o pintar el músculo equivocado. Las posiciones de abajo salen de las indicaciones del catálogo y, como ellas, están
pendientes de revisión por un profesional. No se le pasan a GPT capturas de otras apps como referencia.

## Prompt base

```text
Generá UNA sola imagen apaisada de 1536 × 1024 px con las dos posiciones de un ejercicio de gimnasio. Después se va a cortar por la mitad para armar una animación de dos cuadros, así que las dos mitades tienen que coincidir.

COMPOSICIÓN
- La imagen son dos mitades exactas de 768 × 1024 px: a la izquierda la POSICIÓN 1 y a la derecha la POSICIÓN 2. Sin línea divisoria, sin marco y sin texto.
- Es la misma figura en las dos mitades: mismo cuerpo, misma escala, misma cámara y misma altura del piso.
- Lo que no se mueve en el ejercicio (el banco, la máquina, los pies apoyados, la cadera apoyada) va exactamente en el mismo lugar de cada mitad. Solo cambia lo que se mueve.
- La figura y el equipo entran enteros en su mitad, centrados, con margen en los cuatro bordes. Nada cruza de una mitad a la otra.

ESTILO
- Un maniquí anatómico adulto, sin género marcado, sin rostro detallado, sin pelo y sin ropa, con la musculatura dibujada.
- Ilustración limpia, tipo render 3D mate, en escala de grises claros y medios. No es una foto y no tiene piel.
- Los MÚSCULOS PRINCIPALES van pintados de COLOR_PRINCIPAL, bien definidos y en su lugar anatómico correcto. Los MÚSCULOS SECUNDARIOS van del mismo color, mucho más apagado. Ningún otro músculo lleva color.
- El equipo (barra, mancuernas, banco, polea, máquina) va en gris oscuro, simple y sin logos.
- Fondo transparente. Si no podés, fondo liso #111111, sin degradado, sin piso dibujado y sin sombras proyectadas.
- Luz suave y pareja, igual en las dos mitades.

LO QUE NO VA
- Texto, flechas, números, etiquetas, marcas de agua ni logos.
- Personas reales, fotos ni caras reconocibles.
- Parecerse a las imágenes de una app o de un sitio en particular: es una ilustración original.

EJERCICIO
BLOQUE_DEL_EJERCICIO
```

## Bloques por ejercicio

Los nombres y los músculos salen del catálogo (`src/app/core/seed.ts`). Si el catálogo cambia, hay que actualizar
esta lista.

### Press de banca

```text
EJERCICIO: Press de banca (barra)
VISTA: tres cuartos lateral
POSICIÓN 1 (mitad izquierda): Acostado boca arriba en un banco plano, pies apoyados en el piso, barra sostenida arriba con los brazos extendidos sobre el pecho.
POSICIÓN 2 (mitad derecha): Misma postura, con la barra abajo, cerca del pecho, y los codos flexionados.
MÚSCULOS PRINCIPALES: pecho
MÚSCULOS SECUNDARIOS: deltoides y tríceps
```

### Press inclinado con mancuernas

```text
EJERCICIO: Press inclinado con mancuernas (mancuernas)
VISTA: tres cuartos lateral
POSICIÓN 1 (mitad izquierda): Recostado en un banco inclinado unos 30 grados, pies en el piso, una mancuerna en cada mano con los brazos extendidos arriba del pecho.
POSICIÓN 2 (mitad derecha): Misma postura, con las mancuernas a los lados del pecho y los codos flexionados.
MÚSCULOS PRINCIPALES: pecho
MÚSCULOS SECUNDARIOS: deltoides y tríceps
```

### Remo en polea

```text
EJERCICIO: Remo en polea (polea)
VISTA: lateral
POSICIÓN 1 (mitad izquierda): Sentado frente a una polea baja, torso erguido, rodillas apenas flexionadas, brazos extendidos al frente tomando el agarre.
POSICIÓN 2 (mitad derecha): Misma postura, con el agarre contra el abdomen, los codos atrás pegados al cuerpo y los omóplatos juntos.
MÚSCULOS PRINCIPALES: dorsales
MÚSCULOS SECUNDARIOS: trapecio, deltoides y bíceps
```

### Jalón al pecho

```text
EJERCICIO: Jalón al pecho (polea)
VISTA: tres cuartos de frente
POSICIÓN 1 (mitad izquierda): Sentado en la máquina de jalones, muslos bajo el apoyo, brazos extendidos arriba tomando una barra ancha.
POSICIÓN 2 (mitad derecha): Misma postura, con la barra en la parte alta del pecho, por delante de la cabeza, y los codos abajo.
MÚSCULOS PRINCIPALES: dorsales
MÚSCULOS SECUNDARIOS: bíceps y antebrazos
```

### Press de hombros

```text
EJERCICIO: Press de hombros (mancuernas)
VISTA: tres cuartos de frente
POSICIÓN 1 (mitad izquierda): Sentado en un banco con respaldo, una mancuerna en cada mano a la altura de los hombros, codos flexionados.
POSICIÓN 2 (mitad derecha): Misma postura, con los brazos extendidos arriba de la cabeza.
MÚSCULOS PRINCIPALES: deltoides
MÚSCULOS SECUNDARIOS: trapecio y tríceps
```

### Elevaciones laterales

```text
EJERCICIO: Elevaciones laterales (mancuernas)
VISTA: de frente
POSICIÓN 1 (mitad izquierda): De pie, una mancuerna en cada mano, brazos a los lados del cuerpo.
POSICIÓN 2 (mitad derecha): De pie, brazos abiertos hacia los lados a la altura de los hombros, codos apenas flexionados, hombros sin encoger.
MÚSCULOS PRINCIPALES: deltoides
MÚSCULOS SECUNDARIOS: trapecio
```

### Curl de bíceps

```text
EJERCICIO: Curl de bíceps (mancuernas)
VISTA: tres cuartos de frente
POSICIÓN 1 (mitad izquierda): De pie, una mancuerna en cada mano, brazos extendidos a los lados, palmas hacia adelante.
POSICIÓN 2 (mitad derecha): De pie, codos flexionados y pegados al torso, mancuernas a la altura de los hombros.
MÚSCULOS PRINCIPALES: bíceps
MÚSCULOS SECUNDARIOS: antebrazos
```

### Extensión de tríceps

```text
EJERCICIO: Extensión de tríceps (polea)
VISTA: lateral
POSICIÓN 1 (mitad izquierda): De pie frente a una polea alta, codos pegados al cuerpo y flexionados a 90 grados, manos en el agarre a la altura del pecho.
POSICIÓN 2 (mitad derecha): Misma postura, con los brazos extendidos hacia abajo y el agarre junto a los muslos.
MÚSCULOS PRINCIPALES: tríceps
MÚSCULOS SECUNDARIOS: ninguno
```

### Sentadilla goblet

```text
EJERCICIO: Sentadilla goblet (mancuerna)
VISTA: tres cuartos de frente
POSICIÓN 1 (mitad izquierda): De pie, pies al ancho de los hombros, una mancuerna sostenida con las dos manos contra el pecho.
POSICIÓN 2 (mitad derecha): En sentadilla profunda cómoda, muslos paralelos al piso, torso erguido, mancuerna contra el pecho, rodillas en línea con los pies.
MÚSCULOS PRINCIPALES: cuádriceps
MÚSCULOS SECUNDARIOS: glúteos, isquiotibiales y aductores
```

### Prensa de piernas

```text
EJERCICIO: Prensa de piernas (máquina)
VISTA: lateral
POSICIÓN 1 (mitad izquierda): Sentado en una prensa inclinada, espalda y pelvis apoyadas, pies en la plataforma, piernas casi extendidas.
POSICIÓN 2 (mitad derecha): Misma postura, con las rodillas flexionadas hacia el pecho y la plataforma cerca del cuerpo.
MÚSCULOS PRINCIPALES: cuádriceps
MÚSCULOS SECUNDARIOS: glúteos e isquiotibiales
```

### Peso muerto rumano

```text
EJERCICIO: Peso muerto rumano (mancuernas)
VISTA: lateral
POSICIÓN 1 (mitad izquierda): De pie, una mancuerna en cada mano delante de los muslos, rodillas apenas flexionadas.
POSICIÓN 2 (mitad derecha): Cadera llevada hacia atrás, torso inclinado hacia adelante con la espalda recta, mancuernas a la altura de las tibias, cerca de las piernas.
MÚSCULOS PRINCIPALES: glúteos e isquiotibiales
MÚSCULOS SECUNDARIOS: lumbares
```

### Zancada hacia atrás

```text
EJERCICIO: Zancada hacia atrás (peso corporal)
VISTA: lateral
POSICIÓN 1 (mitad izquierda): De pie, pies juntos, manos en la cintura.
POSICIÓN 2 (mitad derecha): Una pierna atrás apoyada en la punta del pie, las dos rodillas flexionadas a 90 grados, torso erguido.
MÚSCULOS PRINCIPALES: cuádriceps
MÚSCULOS SECUNDARIOS: glúteos e isquiotibiales
```

### Puente de glúteos

```text
EJERCICIO: Puente de glúteos (peso corporal)
VISTA: lateral
POSICIÓN 1 (mitad izquierda): Acostado boca arriba, rodillas flexionadas, pies apoyados en el piso, brazos a los lados, pelvis apoyada.
POSICIÓN 2 (mitad derecha): Misma postura, con la pelvis elevada: línea recta de los hombros a las rodillas.
MÚSCULOS PRINCIPALES: glúteos
MÚSCULOS SECUNDARIOS: isquiotibiales
```

### Flexiones de brazos

```text
EJERCICIO: Flexiones de brazos (peso corporal)
VISTA: lateral
POSICIÓN 1 (mitad izquierda): Plancha alta: manos en el piso bajo los hombros, brazos extendidos, cuerpo en línea recta de la cabeza a los talones.
POSICIÓN 2 (mitad derecha): Misma línea del cuerpo, con el pecho cerca del piso y los codos flexionados.
MÚSCULOS PRINCIPALES: pecho
MÚSCULOS SECUNDARIOS: deltoides y tríceps
```

### Bird dog

```text
EJERCICIO: Bird dog (peso corporal)
VISTA: lateral
POSICIÓN 1 (mitad izquierda): En cuatro apoyos: manos bajo los hombros y rodillas bajo la cadera, espalda neutra.
POSICIÓN 2 (mitad derecha): Un brazo extendido al frente y la pierna contraria extendida atrás, los dos paralelos al piso, sin girar la pelvis.
MÚSCULOS PRINCIPALES: lumbares
MÚSCULOS SECUNDARIOS: deltoides, abdominales y glúteos
```

### Dead bug

```text
EJERCICIO: Dead bug (peso corporal)
VISTA: lateral
POSICIÓN 1 (mitad izquierda): Acostado boca arriba, brazos extendidos hacia el techo, caderas y rodillas flexionadas a 90 grados.
POSICIÓN 2 (mitad derecha): Un brazo extendido por detrás de la cabeza y la pierna contraria extendida cerca del piso; el otro brazo y la otra pierna quedan como en la posición 1.
MÚSCULOS PRINCIPALES: abdominales
MÚSCULOS SECUNDARIOS: oblicuos
```

### Aperturas con mancuernas

```text
EJERCICIO: Aperturas con mancuernas (mancuernas)
VISTA: tres cuartos lateral
POSICIÓN 1 (mitad izquierda): Acostado boca arriba en un banco plano, mancuernas juntas arriba del pecho, codos apenas flexionados, palmas enfrentadas.
POSICIÓN 2 (mitad derecha): Misma postura, con los brazos abiertos en arco hacia los lados, a la altura del pecho.
MÚSCULOS PRINCIPALES: pecho
MÚSCULOS SECUNDARIOS: deltoides
```

### Press de pecho en máquina

```text
EJERCICIO: Press de pecho en máquina (máquina)
VISTA: lateral
POSICIÓN 1 (mitad izquierda): Sentado en una máquina de press de pecho, espalda apoyada, manijas a la altura del pecho, codos flexionados.
POSICIÓN 2 (mitad derecha): Misma postura, con los brazos extendidos al frente, sin bloquear los codos.
MÚSCULOS PRINCIPALES: pecho
MÚSCULOS SECUNDARIOS: deltoides y tríceps
```

### Cruce de poleas

```text
EJERCICIO: Cruce de poleas (polea)
VISTA: tres cuartos de frente
POSICIÓN 1 (mitad izquierda): De pie entre dos poleas altas, un pie adelante, torso apenas inclinado, brazos abiertos hacia los lados tomando un agarre en cada mano.
POSICIÓN 2 (mitad derecha): Misma postura, con las manos juntas adelante y abajo, frente al abdomen.
MÚSCULOS PRINCIPALES: pecho
MÚSCULOS SECUNDARIOS: deltoides
```

### Remo con barra

```text
EJERCICIO: Remo con barra (barra)
VISTA: lateral
POSICIÓN 1 (mitad izquierda): Torso inclinado desde la cadera unos 45 grados, espalda recta, rodillas algo flexionadas, barra colgando con los brazos extendidos.
POSICIÓN 2 (mitad derecha): Misma inclinación, con la barra contra el abdomen y los codos atrás.
MÚSCULOS PRINCIPALES: dorsales
MÚSCULOS SECUNDARIOS: trapecio, deltoides, lumbares y bíceps
```

### Remo con mancuerna a una mano

```text
EJERCICIO: Remo con mancuerna a una mano (mancuerna)
VISTA: lateral
POSICIÓN 1 (mitad izquierda): Una mano y la rodilla del mismo lado apoyadas en un banco, espalda paralela al piso; el otro brazo extendido hacia abajo con una mancuerna.
POSICIÓN 2 (mitad derecha): Misma postura, con la mancuerna junto a la cadera y el codo arriba, pegado al cuerpo.
MÚSCULOS PRINCIPALES: dorsales
MÚSCULOS SECUNDARIOS: trapecio, deltoides y bíceps
```

### Dominadas asistidas

```text
EJERCICIO: Dominadas asistidas (máquina)
VISTA: tres cuartos de frente
POSICIÓN 1 (mitad izquierda): En una máquina de dominadas asistidas, rodillas sobre la plataforma, manos en la barra alta, brazos extendidos.
POSICIÓN 2 (mitad derecha): Misma máquina, con el cuerpo arriba: mentón por encima de la barra, codos flexionados.
MÚSCULOS PRINCIPALES: dorsales
MÚSCULOS SECUNDARIOS: bíceps y antebrazos
```

### Dominadas

```text
EJERCICIO: Dominadas (peso corporal)
VISTA: tres cuartos de frente
POSICIÓN 1 (mitad izquierda): Colgado de una barra fija con agarre algo más ancho que los hombros, brazos extendidos, piernas rectas.
POSICIÓN 2 (mitad derecha): Cuerpo arriba: mentón por encima de la barra, codos flexionados.
MÚSCULOS PRINCIPALES: dorsales
MÚSCULOS SECUNDARIOS: bíceps y antebrazos
```

### Press militar con barra

```text
EJERCICIO: Press militar con barra (barra)
VISTA: tres cuartos de frente
POSICIÓN 1 (mitad izquierda): De pie, barra apoyada delante de los hombros, codos flexionados, abdomen firme.
POSICIÓN 2 (mitad derecha): De pie, barra arriba de la cabeza con los brazos extendidos.
MÚSCULOS PRINCIPALES: deltoides
MÚSCULOS SECUNDARIOS: trapecio y tríceps
```

### Vuelos posteriores

```text
EJERCICIO: Vuelos posteriores (mancuernas)
VISTA: tres cuartos de frente
POSICIÓN 1 (mitad izquierda): Torso inclinado desde la cadera con la espalda recta, una mancuerna en cada mano colgando bajo el pecho.
POSICIÓN 2 (mitad derecha): Misma inclinación, con los brazos abiertos hacia los lados a la altura de los hombros, codos apenas flexionados.
MÚSCULOS PRINCIPALES: deltoides
MÚSCULOS SECUNDARIOS: trapecio
```

### Face pull

```text
EJERCICIO: Face pull (polea)
VISTA: lateral
POSICIÓN 1 (mitad izquierda): De pie frente a una polea a la altura de la cara, brazos extendidos al frente tomando una cuerda.
POSICIÓN 2 (mitad derecha): Misma postura, con la cuerda cerca de la frente, las manos separadas y los codos altos y abiertos.
MÚSCULOS PRINCIPALES: deltoides
MÚSCULOS SECUNDARIOS: trapecio
```

### Curl con barra

```text
EJERCICIO: Curl con barra (barra)
VISTA: tres cuartos de frente
POSICIÓN 1 (mitad izquierda): De pie, barra sostenida con las palmas hacia adelante a la altura de los muslos, brazos extendidos.
POSICIÓN 2 (mitad derecha): De pie, barra a la altura de los hombros, codos flexionados y pegados al cuerpo.
MÚSCULOS PRINCIPALES: bíceps
MÚSCULOS SECUNDARIOS: antebrazos
```

### Curl martillo

```text
EJERCICIO: Curl martillo (mancuernas)
VISTA: tres cuartos de frente
POSICIÓN 1 (mitad izquierda): De pie, una mancuerna en cada mano con las palmas mirándose entre sí, brazos extendidos a los lados.
POSICIÓN 2 (mitad derecha): De pie, codos flexionados y pegados al torso, mancuernas verticales a la altura de los hombros.
MÚSCULOS PRINCIPALES: bíceps
MÚSCULOS SECUNDARIOS: antebrazos
```

### Extensión de tríceps sobre la cabeza

```text
EJERCICIO: Extensión de tríceps sobre la cabeza (mancuerna)
VISTA: lateral
POSICIÓN 1 (mitad izquierda): Sentado en un banco, una mancuerna sostenida con las dos manos por encima de la cabeza, brazos extendidos.
POSICIÓN 2 (mitad derecha): Misma postura, con la mancuerna detrás de la cabeza y los codos flexionados apuntando hacia arriba.
MÚSCULOS PRINCIPALES: tríceps
MÚSCULOS SECUNDARIOS: ninguno
```

### Fondos en banco

```text
EJERCICIO: Fondos en banco (peso corporal)
VISTA: lateral
POSICIÓN 1 (mitad izquierda): Manos apoyadas en el borde de un banco detrás del cuerpo, piernas extendidas adelante con los talones en el piso, brazos extendidos.
POSICIÓN 2 (mitad derecha): Misma postura, con los codos flexionados a 90 grados y la cadera cerca del piso.
MÚSCULOS PRINCIPALES: tríceps
MÚSCULOS SECUNDARIOS: deltoides y pecho
```

### Sentadilla con barra

```text
EJERCICIO: Sentadilla con barra (barra)
VISTA: tres cuartos lateral
POSICIÓN 1 (mitad izquierda): De pie, barra apoyada sobre la parte alta de la espalda, pies al ancho de los hombros.
POSICIÓN 2 (mitad derecha): En sentadilla, muslos paralelos al piso, espalda recta, rodillas en línea con los pies.
MÚSCULOS PRINCIPALES: cuádriceps
MÚSCULOS SECUNDARIOS: lumbares, glúteos, isquiotibiales y aductores
```

### Extensión de cuádriceps

```text
EJERCICIO: Extensión de cuádriceps (máquina)
VISTA: lateral
POSICIÓN 1 (mitad izquierda): Sentado en una máquina de extensión de cuádriceps, espalda apoyada, rodillas flexionadas a 90 grados con el rodillo sobre los tobillos.
POSICIÓN 2 (mitad derecha): Misma postura, con las piernas extendidas al frente.
MÚSCULOS PRINCIPALES: cuádriceps
MÚSCULOS SECUNDARIOS: ninguno
```

### Curl femoral

```text
EJERCICIO: Curl femoral (máquina)
VISTA: lateral
POSICIÓN 1 (mitad izquierda): Acostado boca abajo en una máquina de curl femoral, piernas extendidas, rodillo sobre los tobillos.
POSICIÓN 2 (mitad derecha): Misma postura, con las rodillas flexionadas y los talones hacia los glúteos.
MÚSCULOS PRINCIPALES: isquiotibiales
MÚSCULOS SECUNDARIOS: gemelos
```

### Elevación de talones

```text
EJERCICIO: Elevación de talones (máquina)
VISTA: lateral
POSICIÓN 1 (mitad izquierda): De pie con la punta de los pies sobre un escalón y los talones abajo, por debajo del borde.
POSICIÓN 2 (mitad derecha): Misma postura, en puntas de pie, talones bien arriba.
MÚSCULOS PRINCIPALES: gemelos
MÚSCULOS SECUNDARIOS: ninguno
```

### Sentadilla búlgara

```text
EJERCICIO: Sentadilla búlgara (mancuernas)
VISTA: lateral
POSICIÓN 1 (mitad izquierda): De pie con el empeine del pie de atrás apoyado en un banco, una mancuerna en cada mano a los lados, pierna de adelante casi extendida.
POSICIÓN 2 (mitad derecha): Misma postura, con la rodilla de adelante flexionada a 90 grados y el torso estable.
MÚSCULOS PRINCIPALES: cuádriceps
MÚSCULOS SECUNDARIOS: glúteos e isquiotibiales
```

### Hip thrust

```text
EJERCICIO: Hip thrust (barra)
VISTA: lateral
POSICIÓN 1 (mitad izquierda): Parte alta de la espalda apoyada en un banco, barra sobre la cadera, rodillas flexionadas, pies en el piso, cadera abajo cerca del piso.
POSICIÓN 2 (mitad derecha): Misma postura, con la cadera arriba: tronco y muslos en una línea, rodillas a 90 grados.
MÚSCULOS PRINCIPALES: glúteos
MÚSCULOS SECUNDARIOS: isquiotibiales
```

### Patada de glúteo en polea

```text
EJERCICIO: Patada de glúteo en polea (polea)
VISTA: lateral
POSICIÓN 1 (mitad izquierda): De pie frente a una polea baja, tobillera en un tobillo, manos apoyadas en la máquina, torso apenas inclinado, piernas juntas.
POSICIÓN 2 (mitad derecha): Misma postura, con la pierna de la tobillera extendida hacia atrás, sin arquear la espalda.
MÚSCULOS PRINCIPALES: glúteos
MÚSCULOS SECUNDARIOS: isquiotibiales
```

### Abducción de cadera en máquina

```text
EJERCICIO: Abducción de cadera en máquina (máquina)
VISTA: de frente
POSICIÓN 1 (mitad izquierda): Sentado en una máquina de abducción, espalda apoyada, almohadillas por fuera de las rodillas, piernas juntas.
POSICIÓN 2 (mitad derecha): Misma postura, con las piernas abiertas hacia los lados.
MÚSCULOS PRINCIPALES: glúteos
MÚSCULOS SECUNDARIOS: ninguno
```

### Peso muerto con barra

```text
EJERCICIO: Peso muerto con barra (barra)
VISTA: lateral
POSICIÓN 1 (mitad izquierda): Barra en el piso sobre la mitad de los pies, cadera atrás, rodillas flexionadas, espalda recta y pecho alto, manos tomando la barra.
POSICIÓN 2 (mitad derecha): De pie, erguido, barra a la altura de los muslos con los brazos extendidos.
MÚSCULOS PRINCIPALES: lumbares, glúteos e isquiotibiales
MÚSCULOS SECUNDARIOS: trapecio, dorsales, antebrazos y cuádriceps
```

### Hiperextensiones

```text
EJERCICIO: Hiperextensiones (banco)
VISTA: lateral
POSICIÓN 1 (mitad izquierda): En un banco de hiperextensiones a 45 grados, cadera apoyada y pies trabados, torso abajo flexionado desde la cadera, espalda recta, brazos cruzados sobre el pecho.
POSICIÓN 2 (mitad derecha): Mismo banco, con el cuerpo alineado en una línea recta de la cabeza a los talones, sin arquear de más.
MÚSCULOS PRINCIPALES: lumbares
MÚSCULOS SECUNDARIOS: glúteos e isquiotibiales
```

### Abdominales crunch

```text
EJERCICIO: Abdominales crunch (peso corporal)
VISTA: lateral
POSICIÓN 1 (mitad izquierda): Acostado boca arriba, rodillas flexionadas, pies en el piso, manos a los costados de la cabeza, hombros apoyados.
POSICIÓN 2 (mitad derecha): Misma postura, con los hombros despegados del piso y el abdomen contraído, sin tirar del cuello.
MÚSCULOS PRINCIPALES: abdominales
MÚSCULOS SECUNDARIOS: oblicuos
```

### Elevación de piernas

```text
EJERCICIO: Elevación de piernas (peso corporal)
VISTA: lateral
POSICIÓN 1 (mitad izquierda): Acostado boca arriba, manos debajo de la cadera, piernas extendidas apenas por encima del piso.
POSICIÓN 2 (mitad derecha): Misma postura, con las piernas extendidas elevadas hasta quedar casi verticales, zona lumbar apoyada.
MÚSCULOS PRINCIPALES: abdominales
MÚSCULOS SECUNDARIOS: oblicuos
```

### Pallof press

```text
EJERCICIO: Pallof press (polea)
VISTA: tres cuartos de frente
POSICIÓN 1 (mitad izquierda): De pie de costado a una polea a la altura del pecho, pies al ancho de los hombros, agarre sostenido con las dos manos contra el pecho.
POSICIÓN 2 (mitad derecha): Misma postura, con los brazos extendidos al frente, torso sin girar.
MÚSCULOS PRINCIPALES: abdominales y oblicuos
MÚSCULOS SECUNDARIOS: deltoides
```
