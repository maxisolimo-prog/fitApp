# Backlog

Ítems concretos, en el orden en que conviene hacerlos. El rumbo y las etapas grandes están en
[ROADMAP.md](ROADMAP.md); de dónde sale cada ítem, en [COMPETENCIA.md](COMPETENCIA.md). Armado el 17 de noviembre
de 2026 a partir de las capturas de Fitness Online (`docs/competencia/`) y del código de ese día.

La columna **Esquema** dice si el ítem cambia `FitAppState` (hoy versión 3). Los que sí exigen subir la versión,
migración con test de ida y vuelta y una migración SQL nueva en `api/migrations/`. El catálogo de ejercicios
(`seed.ts`) no se guarda en el estado del alumno: cambiarlo no toca el esquema.

## Decisiones abiertas

Las toma el usuario. Hasta entonces, los ítems que dependen de ellas no arrancan.

1. **Imagen del ejercicio: resuelta el 17 de noviembre de 2026.** El usuario prefiere que las imágenes las cree
   GPT, en lugar del dibujo de línea de Everkinetic, que queda como reserva. Falta que apruebe el estilo con una
   imagen de prueba; ver B-03.
2. **Presupuesto para animaciones anatómicas con licencia.** Solo hace falta si las imágenes de GPT no alcanzan o
   si se quiere movimiento. Traba a B-17.
3. **Vista enfocada, un ejercicio por pantalla.** Es un cambio grande en la pantalla que más se usa. Conviene
   probar primero B-03 a B-06 en el gimnasio y decidir después. Traba a B-12.
4. **Carga con mancuernas: ¿por mancuerna o sumada?** Hoy la app no lo dice y el volumen calculado depende de eso.
   Propuesta: por mancuerna, que es el número que figura en la que uno agarra. Traba a B-09.

## Bloque 1: que el ejercicio se vea

Es el pedido del usuario. Nada de este bloque cambia el esquema ni exige comprar licencias; las imágenes de B-03
consumen el cupo de la cuenta de ChatGPT del usuario.

| # | Qué | Esfuerzo | Esquema | Depende de |
| --- | --- | --- | --- | --- |
| B-01 | Músculos principales y secundarios de los 43 ejercicios | Bajo | No | — |
| B-02 | Mapa muscular propio y solapa "Músculos" en la ficha | Medio | No | B-01 |
| B-03 | Imagen de cada ejercicio, creada con GPT | Medio | No | B-01, cupo de GPT, estilo aprobado |
| B-04 | Miniaturas en las listas | Bajo | No | B-03, o B-02 si no hay imagen |
| B-05 | Abrir la ficha del ejercicio desde la sesión | Medio | No | — |

### B-01. Músculos principales y secundarios

Hoy cada ejercicio tiene un solo texto (`muscle: 'Pecho'`). Se agregan `primaryMuscles` y `secondaryMuscles` con una
lista cerrada: las zonas que el mapa de B-02 puede dibujar. `muscle` queda como grupo para los filtros.

- Sin porcentajes: solo principal o secundario.
- Para cruzar los datos: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) trae músculos principales y
  secundarios de más de 800 ejercicios, en dominio público.
- **Listo cuando:** los 43 ejercicios tienen ambos campos, un test verifica que todo músculo usado está en la lista
  cerrada, y queda anotado que falta la revisión de un profesional (igual que las indicaciones).

### B-02. Mapa muscular propio

Cuerpo de frente y de espalda en SVG, con los colores de Temacy: músculos principales en lima, secundarios con
contorno. Va en una solapa nueva "Músculos" de la ficha y, en chico, como imagen de reserva en las listas.

- El dibujo sale de [react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter)
  (licencia MIT). Se copian los trazos, no la dependencia: es para React Native. Zonas disponibles: trapecio,
  deltoides, pecho, bíceps, tríceps, antebrazo, abdominales, oblicuos, espalda alta, lumbar, glúteos, cuádriceps,
  isquiotibiales, aductores, abductores, gemelos, tibial.
- **Listo cuando:** el mapa se entiende sin depender del color (lista de texto "Principales" y "Secundarios" al
  lado), tiene descripción para lectores de pantalla y el origen queda registrado en `docs/ASSETS.md` con el aviso
  de copyright de la licencia MIT.

### B-03. Imagen de cada ejercicio, creada con GPT

Decisión del usuario del 17 de noviembre de 2026: pedirle las imágenes a GPT para acercarse al aspecto de la
competencia sin usar sus recursos.

- **Estado:** trabado por cupo. La app de Codex de esta PC trae un `codex.exe` con generación de imágenes, que se
  invoca con `codex exec`. La invocación se probó ese día y funciona, pero la cuenta había llegado al límite de uso
  y no generó nada. Se libera el 20 de noviembre de 2026 a las 10:44, o antes comprando créditos en
  chatgpt.com/settings/usage.
- **Estilo a pedir:** figura anatómica neutra en grises, músculos principales en lima `#C8F24C`, secundarios en un
  lima más apagado, fondo bosque `#142118`, cuadrada, sin texto ni marcas. Es obra original: no se le pasan las
  capturas de la competencia como referencia.
- **Orden:** primero una sola imagen de prueba (press de banca) para que el usuario apruebe el estilo. Después el
  resto, de a una. Una posición por ejercicio para empezar; la segunda posición solo si la figura se mantiene
  igual de una imagen a otra.
- **Riesgos:** una imagen generada puede mostrar mal la técnica o resaltar el músculo equivocado, y el estilo
  puede variar entre ejercicios. Cada imagen se revisa contra su ejercicio antes de entrar (regla de
  `docs/DESIGN.md`) y queda pendiente la revisión de un profesional. La que no pasa se vuelve a generar, o ese
  ejercicio muestra el mapa muscular de B-02.
- **Tareas:** generar; reducir el peso (una imagen de esa app ronda los 500 KB en PNG: hay que pasarla a WebP en
  tamaño de miniatura y de ficha); copiar a `public/`; caché perezoso en el service worker para no agrandar la
  instalación; sacar el enlace externo a Gym Visual que hoy tiene press de banca.
- **Reserva:** si el resultado no convence, [Everkinetic](https://github.com/everkinetic/data): dibujo de línea en
  dos posiciones, CC BY-SA 4.0 (pide atribución visible y compartir igual las imágenes modificadas). Comparando
  títulos, sin revisar cada dibujo, cubre unos 30 de los 43. Sin equivalente: sentadilla goblet, bird dog, dead
  bug, dominadas asistidas, face pull, hip thrust, Pallof press.
- **Listo cuando:** el usuario aprobó el estilo, cada imagen fue revisada contra su ejercicio y `docs/ASSETS.md`
  registra modelo, fecha y prompt de cada una.

### B-04. Miniaturas en las listas

La imagen del ejercicio donde hoy hay solo texto o una inicial: detalle de la rutina, bloques de la sesión,
biblioteca y selector del editor de rutinas. Sin ilustración, va el mapa muscular en chico.

- **Listo cuando:** las cuatro listas muestran miniatura, la carga es perezosa y la lista no salta al aparecer las
  imágenes (tamaño reservado).

### B-05. Ficha del ejercicio desde la sesión

Tocar el nombre del ejercicio durante la sesión abre su ficha (imagen, cómo hacerlo, historial completo, gráfico)
encima de la sesión. Hoy la ficha solo se abre desde la Biblioteca, y para ir hay que salir de la sesión.

- **Listo cuando:** la ficha abre y cierra sin perder lo cargado ni frenar el descanso, Escape la cierra y el foco
  vuelve al nombre del ejercicio.

## Bloque 2: la sesión en el gimnasio

| # | Qué | Esfuerzo | Esquema | Depende de |
| --- | --- | --- | --- | --- |
| B-06 | Sustituir un ejercicio durante la sesión | Medio | No | B-04 ayuda, no traba |
| B-07 | Duración estimada calculada y "Empezar" fijo en la previa | Bajo | No | — |
| B-08 | Avance de la sesión en curso en Inicio | Bajo | No | — |
| B-09 | Aclarar si la carga es total o por mancuerna | Bajo | No | Decisión 4 |
| B-10 | Guardar la hora de cada serie | Medio | **Sí (v4)** | — |
| B-11 | Comentario por serie | Bajo | **Sí (v4)** | Va en la misma migración que B-10 |
| B-12 | Vista enfocada: un ejercicio por pantalla | Alto | No | Decisión 3, B-03 |

- **B-06. Sustituir.** "Cambiar ejercicio" abre una hoja con equivalentes por movimiento (en la captura, todos son
  presses de pecho), no solo por grupo muscular. Necesita un dato nuevo en el catálogo: qué ejercicios se reemplazan
  entre sí, a revisar con un profesional. Cambia solo las series pendientes de esa sesión, no la rutina; las ya
  completadas quedan con el ejercicio original. El reemplazo hereda el descanso y muestra su propio "Anterior". No
  se puede elegir un ejercicio que ya está en la sesión. No toca el esquema porque cada serie ya guarda su
  ejercicio, pero es lógica del store: pasa por `store-guardian`.
- **B-07. Duración estimada.** Hoy la duración es un número fijo cargado en la rutina. Calcularla a partir de series
  y descansos, y mostrarla con "≈". El tiempo de trabajo por serie es una suposición: va como constante con nombre,
  no escondida.
- **B-08. Avance.** La tarjeta de la sesión en curso muestra "5 de 16 series" con un anillo, como el 37 % de la
  competencia. Los datos ya existen.
- **B-09. Carga.** Texto al lado del campo Kg y en la ficha: "por mancuerna", "barra incluida", según el equipo. Solo
  cambia etiquetas: no reinterpreta lo ya registrado.
- **B-10. Hora de cada serie.** Campo opcional en la serie. Permite mostrar el descanso real y la hora en el
  historial. Las series viejas quedan sin hora: no se inventa.
- **B-11. Comentario por serie.** Texto corto opcional ("me costó la última", "molestia en el hombro").
- **B-12. Vista enfocada.** Un ejercicio por pantalla con su posición ("2 de 12"), imagen y tres números grandes:
  repeticiones, descanso, series. Como modo alternativo: la lista actual se queda.

## Bloque 3: más adelante

| # | Qué | Esfuerzo | Esquema | Depende de |
| --- | --- | --- | --- | --- |
| B-13 | Ejercicios por tiempo (cinta, plancha, movilidad) | Alto | **Sí** | — |
| B-14 | Favoritos en la biblioteca | Bajo | **Sí** | — |
| B-15 | Mapa muscular de la semana en Progreso | Medio | No | B-01, B-02 |
| B-16 | Programa en secuencia ("día 18 de 55") | Alto | **Sí** | Validar con alumnos y profes |
| B-17 | Animaciones anatómicas con licencia | Compra + Medio | No | Decisión 2, B-03 |

- **B-13.** Hoy toda serie es repeticiones × kilos. Para entrada en calor y planchas hace falta duración en minutos
  o segundos y, opcional, pulsaciones objetivo. Toca modelo, validación, registro, volumen y récords.
- **B-15.** Qué músculos trabajó el alumno esta semana, calculado solo con sus series completadas. Sin
  entrenamientos, el mapa queda vacío y lo dice. Es la versión FitApp del mapa de la competencia: datos reales.
- **B-16.** Rutinas en un orden que avanza al completar cada una, sin atarse al día de la semana. Se pisa con la
  semana tipo: definir cómo conviven antes de construir. Sin candados.
- **B-17.** Reemplaza las imágenes de B-03 sin tocar las pantallas, si B-03 deja la imagen detrás de un solo
  componente. Incluye validar con un profesional que cada animación corresponde a su ejercicio.

## Con el módulo de gimnasios

No se construyen antes: dependen de que exista el profe (ver "Segmento: personas y gimnasios" en el roadmap).

- Mensajes entre profe y socio.
- Programa asignado por el profe, con sus días en secuencia (B-16 es la base).

## Descartado

| Qué | Por qué |
| --- | --- |
| Porcentaje por músculo | Precisión que no podemos respaldar. |
| Candados en los días siguientes | FitApp sugiere, no bloquea. |
| Feed social y dieta | Anti-referencia y fuera de alcance. |
| Fotos de personas como imagen del ejercicio | `docs/DESIGN.md` pide figura neutra, no fotos. |
| Imágenes de Fitness Online | Son de su dueño. |

## Fuentes de imágenes evaluadas

Licencias leídas en cada repositorio el 17 de noviembre de 2026. Nada de esto está incorporado todavía.

| Fuente | Qué trae | Licencia | Veredicto |
| --- | --- | --- | --- |
| GPT, desde la app de Codex del usuario | Imágenes creadas a pedido, con el estilo y los colores de FitApp | Términos de OpenAI de la cuenta del usuario; revisarlos antes de publicar | Elegida para B-03. Sin probar todavía: cuenta sin cupo hasta el 20 de noviembre de 2026. |
| [Everkinetic](https://github.com/everkinetic/data) | 289 ejercicios, dibujo de línea en dos posiciones, SVG y PNG | [CC BY-SA 4.0](https://github.com/everkinetic/data/blob/main/LICENSE.md) | Reserva para B-03. Pide atribución. |
| [react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter) | Cuerpo de frente y espalda en SVG, por zonas musculares | [MIT](https://github.com/HichamELBSI/react-native-body-highlighter/blob/main/LICENSE) | Sí, para B-02. Pide conservar el aviso de copyright. |
| [free-exercise-db](https://github.com/yuhonas/free-exercise-db) | Más de 800 ejercicios con músculos principales y secundarios, y dos fotos por ejercicio | [Unlicense](https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md) (dominio público) | Datos de músculos: sí, para B-01. Fotos: no; son de personas y el repositorio no documenta su origen. |
| [Gym Visual](https://gymvisual.com) | Animaciones anatómicas, el estilo que pidió el usuario | Paga; no encontré el precio publicado | Candidata para B-17. Pedir presupuesto. |
| Otras pagas | ExerciseDB (pago único, ~USD 300), WorkoutLabs (desde ~USD 1.200 por año), MuscleWiki API (USD 10 a 200 por mes) | Comercial | Para comparar en B-17. Precios tomados de un buscador, sin verificar en cada sitio. |
