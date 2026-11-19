# Backlog

Ítems concretos, en el orden en que conviene hacerlos. El rumbo y las etapas grandes están en
[ROADMAP.md](ROADMAP.md); de dónde sale cada ítem, en [COMPETENCIA.md](COMPETENCIA.md). Armado el 17 de noviembre
de 2026 a partir de las capturas de Fitness Online (`docs/competencia/`) y del código de ese día.

La columna **Esquema** dice si el ítem cambia `FitAppState` (hoy versión 4). Los que sí exigen subir la versión,
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
5. **Imágenes de ejercicios con tres marcas.** El estilo pensado para B-03 (músculos en lima sobre fondo verde)
   solo sirve para la marca FitApp. Opciones: un solo juego neutro (figura gris, fondo transparente) y que el color
   de marca lo ponga el mapa muscular de B-02, que es SVG y lo toma solo; o un juego por marca, con el triple de
   cupo de GPT. Propuesta: el juego neutro. Traba a B-03.

## Bloque 1: que el ejercicio se vea

Es el pedido del usuario. Nada de este bloque cambia el esquema ni exige comprar licencias; las imágenes de B-03
consumen el cupo de la cuenta de ChatGPT del usuario.

| # | Qué | Esfuerzo | Esquema | Depende de |
| --- | --- | --- | --- | --- |
| B-01 | Músculos principales y secundarios de los 43 ejercicios | Bajo | No | Hecho el 18 de noviembre de 2026 |
| B-02 | Mapa muscular propio y solapa "Músculos" en la ficha | Medio | No | Hecho el 18 de noviembre de 2026 |
| B-03 | Imagen de cada ejercicio, creada con GPT | Medio | No | B-01, cupo de GPT, estilo aprobado |
| B-04 | Miniaturas en las listas | Bajo | No | Hecho el 19 de noviembre de 2026 |
| B-05 | Abrir la ficha del ejercicio desde la sesión | Medio | No | Hecho el 19 de noviembre de 2026 |

### B-01. Músculos principales y secundarios

Hoy cada ejercicio tiene un solo texto (`muscle: 'Pecho'`). Se agregan `primaryMuscles` y `secondaryMuscles` con una
lista cerrada: las zonas que el mapa de B-02 puede dibujar. `muscle` queda como grupo para los filtros.

- Sin porcentajes: solo principal o secundario.
- Para cruzar los datos: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) trae músculos principales y
  secundarios de más de 800 ejercicios, en dominio público.
- **Listo cuando:** los 43 ejercicios tienen ambos campos, un test verifica que todo músculo usado está en la lista
  cerrada, y queda anotado que falta la revisión de un profesional (igual que las indicaciones).
- **Hecho.** Lista cerrada de 16 zonas en `src/app/core/muscles.ts`. Criterio: principal es el que hace el trabajo;
  secundario, el que ayuda a mover; los que solo estabilizan no se listan. Cruzado con free-exercise-db: el músculo
  principal coincide en los 42 ejercicios que tienen equivalente ahí (bird dog no lo tiene). **Falta la revisión de
  un profesional.** El dibujo no trae romboides, flexores de cadera, abductores ni manguito rotador: la abducción de
  cadera marca glúteos y la elevación de piernas, abdominales.

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
- **Hecho.** Solapa "Músculos" en la ficha: principales rellenos, secundarios con contorno, lista en texto y
  descripción para lectores de pantalla. Toma el color de acento de cada marca. El dibujo (59 kB) va en un archivo
  aparte, fuera de la carga inicial: se pide al abrir la solapa y el service worker lo deja guardado para usarlo
  sin conexión. Si la descarga falla, la solapa ofrece "Reintentar" y la lista en texto sigue visible. La versión 3.2.0 del dibujo no trae "abductores", que figuraba en
  la lista de arriba. Para que entren cuatro solapas en el celular, "Cómo hacerlo" pasó a llamarse "Técnica".
  Queda para B-04 la versión en chico para las listas, sobre fondo claro.

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
- **Animadas (pedido del 19 de noviembre de 2026):** el usuario quiere que el ejercicio se mueva. GPT no genera
  GIF: el prompt de [PROMPT-IMAGENES.md](PROMPT-IMAGENES.md) pide las dos posiciones en una sola imagen apaisada,
  para que la figura salga igual en las dos, y después se corta para armar una animación de dos cuadros. Trae un
  bloque listo por cada uno de los 43 ejercicios. Cambia el formato de "Estilo a pedir": apaisada y con fondo
  transparente, en lugar de cuadrada sobre bosque. Sin probar todavía.
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
- **Hecho.** Las cuatro listas usan un solo componente, `app-exercise-thumb`: muestra la ilustración del
  ejercicio si existe y, si no, el mapa muscular recortado en la zona del músculo principal (torso, muslos o
  piernas, de frente o de espalda). Hoy ningún ejercicio tiene ilustración, así que todas muestran el mapa; cuando
  lleguen las imágenes de B-03 alcanza con cargarlas en el catálogo. El dibujo se baja al aparecer la primera
  miniatura y está una sola vez en la página; el cuadrado se reserva desde el principio y, si la descarga falla,
  queda la inicial del ejercicio como antes.

### B-05. Ficha del ejercicio desde la sesión

Tocar el nombre del ejercicio durante la sesión abre su ficha (imagen, cómo hacerlo, historial completo, gráfico)
encima de la sesión. Hoy la ficha solo se abre desde la Biblioteca, y para ir hay que salir de la sesión.

- **Listo cuando:** la ficha abre y cierra sin perder lo cargado ni frenar el descanso, Escape la cierra y el foco
  vuelve al nombre del ejercicio.
- **Hecho.** El nombre del ejercicio (y su miniatura) abre la ficha en una hoja encima de la sesión, que sigue
  montada debajo. La hoja muestra el descanso que está corriendo. Mientras está abierta, lo de atrás queda inactivo
  para el teclado y los lectores de pantalla. El botón Atrás del teléfono cierra la hoja y deja al alumno en la
  sesión. **Falta:** el selector de ejercicios del editor de rutinas todavía no hace lo mismo con Atrás.

## Bloque 2: la sesión en el gimnasio

| # | Qué | Esfuerzo | Esquema | Depende de |
| --- | --- | --- | --- | --- |
| B-06 | Sustituir un ejercicio durante la sesión | Medio | No | Hecho el 19 de noviembre de 2026 |
| B-07 | Duración estimada calculada y "Empezar" fijo en la previa | Bajo | No | Hecho el 19 de noviembre de 2026 |
| B-08 | Avance de la sesión en curso en Inicio | Bajo | No | Hecho el 19 de noviembre de 2026 |
| B-09 | Aclarar si la carga es total o por mancuerna | Bajo | No | Decisión 4 |
| B-10 | Guardar la hora de cada serie | Medio | **Sí (v4)** | Hecho el 19 de noviembre de 2026 |
| B-11 | Comentario por serie | Bajo | **Sí (v4)** | Hecho el 19 de noviembre de 2026 |
| B-12 | Vista enfocada: un ejercicio por pantalla | Alto | No | Decisión 3, B-03 |

- **B-06. Sustituir.** "Cambiar ejercicio" abre una hoja con equivalentes por movimiento (en la captura, todos son
  presses de pecho), no solo por grupo muscular. Necesita un dato nuevo en el catálogo: qué ejercicios se reemplazan
  entre sí, a revisar con un profesional. Cambia solo las series pendientes de esa sesión, no la rutina; las ya
  completadas quedan con el ejercicio original. El reemplazo hereda el descanso y muestra su propio "Anterior". No
  se puede elegir un ejercicio que ya está en la sesión. No toca el esquema porque cada serie ya guarda su
  ejercicio, pero es lógica del store: pasa por `store-guardian`. **Hecho:** cada ejercicio de la sesión con series
  pendientes tiene un botón para cambiarlo. La hoja ofrece primero los del mismo movimiento y después los del mismo
  grupo muscular. El dato nuevo del catálogo es `movement`, con 19 patrones (`src/app/core/movements.ts`); **falta la
  revisión de un profesional**. El reemplazo arranca con lo que se levantó la última vez con ese ejercicio o, si es
  la primera, sin carga: la carga de un ejercicio no vale para otro. Para que herede el descanso y la sugerencia de
  progresión, la pantalla recuerda a qué ejercicio de la rutina reemplaza cada uno (`fitapp-session-swaps`, fuera
  del estado guardado, igual que el reloj del descanso); en otro dispositivo usa el descanso por defecto de 60 s.
- **B-07. Duración estimada.** Hoy la duración es un número fijo cargado en la rutina. Calcularla a partir de series
  y descansos, y mostrarla con "≈". El tiempo de trabajo por serie es una suposición: va como constante con nombre,
  no escondida. **Hecho:** `estimateRoutineMinutes` suma, por serie, 45 s de trabajo más su descanso y, por
  ejercicio, 60 s de armado (`WORK_SECONDS_PER_SET` y `SETUP_SECONDS_PER_EXERCISE` en `workout-utils.ts`), y
  redondea a 5 minutos. Son suposiciones sin medir: conviene ajustarlas con sesiones reales. El editor ya no pide la
  duración a mano: la muestra calculada y guarda ese valor. Las plantillas pasaron de 45, 40, 35 y 25 minutos a 35,
  35, 25 y 20. En el celular, la previa de la rutina tiene una barra fija con la duración y "Empezar".
- **B-08. Avance.** La tarjeta de la sesión en curso muestra "5 de 16 series" con un anillo, como el 37 % de la
  competencia. Los datos ya existen. **Hecho:** el anillo es decorativo; el texto de al lado dice lo mismo.
- **B-09. Carga.** Texto al lado del campo Kg y en la ficha: "por mancuerna", "barra incluida", según el equipo. Solo
  cambia etiquetas: no reinterpreta lo ya registrado.
- **B-10. Hora de cada serie.** Campo opcional en la serie. Permite mostrar el descanso real y la hora en el
  historial. Las series viejas quedan sin hora: no se inventa. **Hecho:** `completedAt` se anota al marcar la serie
  y se borra al desmarcarla. El detalle de un entrenamiento muestra la hora de cada serie y, debajo, el tiempo desde
  la serie anterior; es el descanso más lo que llevó hacer la serie, no el descanso solo. Un entrenamiento
  anterior a la versión 4 no muestra la columna.
- **B-11. Comentario por serie.** Texto corto opcional ("me costó la última", "molestia en el hombro"). **Hecho:**
  hasta 200 caracteres. En la sesión, debajo de la tabla de cada ejercicio hay un botón para comentar la última
  serie completada que todavía no tiene comentario; el comentario queda debajo de su serie y se edita tocándolo.
  Se ve en el detalle del entrenamiento y en el historial de la ficha del ejercicio.
- **B-10 y B-11, esquema.** `FitAppState` versión 4, migración `005_set_time_note.sql`. Los datos de versiones
  anteriores cargan igual: los campos nuevos simplemente no están. Hay que reiniciar la API para que acepte la
  versión 4. Una app instalada que todavía no se actualizó no puede leer una cuenta que ya tiene datos de la 4, y
  la API tampoco le deja guardar encima: sus cambios quedan en el dispositivo hasta que se actualiza (lo hace sola
  al abrirla, salvo que haya una sesión en curso). Desde esta versión, si lo guardado en el dispositivo o en la
  cuenta es de una versión más nueva, la app avisa y no escribe nada encima. Eso no vale para las apps de la
  versión 3 que ya estén instaladas: con dos pestañas abiertas en versiones distintas, la vieja puede pisar lo
  que guardó la nueva. El comentario de una serie que queda sin completar no se guarda con el entrenamiento.
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

## Marcas: un solo código, tres versiones

Decisión del usuario del 18 de noviembre de 2026: una versión con la estética de Qivox y otra con la de Fitness
Group (la red de los gimnasios Manantial), además de la actual, sin duplicar el código y dejando lugar a que cada
una tenga funciones distintas. Detalle en "Marcas" de [DESIGN.md](DESIGN.md).

| # | Qué | Esfuerzo | Esquema | Estado |
| --- | --- | --- | --- | --- |
| B-18 | Tres marcas sobre el mismo código: tokens por rol, un archivo por marca, funciones por marca | Medio | No | Hecho el 18 de noviembre de 2026 |
| B-19 | Logo, ícono y nombre de la app instalada por marca | Bajo | No | Hecho el 18 de noviembre de 2026 con los logos de sus webs; falta el acuerdo de cada gimnasio |
| B-20 | Graphik para los títulos de Qivox | Bajo | No | Espera que Qivox entregue la tipografía con su licencia |
| B-21 | Una dirección por marca al desplegar | Bajo | No | Con el despliegue (roadmap) |

- **B-18, hecho.** Se ve con `/?marca=qivox`, `/?marca=fitnessgroup` y `/?marca=fitapp`. Colores, tipografías y
  radios salen de la web pública de cada gimnasio. Cuenta e Instalación ya se
  pueden apagar por marca (`brand.features`); hoy están activas en las tres.
- **B-19, hecho.** Pedido del usuario ("le faltan los logos"). La barra muestra el logotipo de Qivox y la insignia de
  Fitness Group; la pestaña y la app instalada llevan el ícono y el nombre de cada una. Los archivos salen de sus
  webs públicas (`docs/ASSETS.md`) y no hay autorización registrada: sirven para mostrar las versiones, no para
  publicarlas. El ícono instalable no tiene variante con zona segura ("maskable"): hace falta el arte original.
- **B-21.** La marca ya se resuelve por subdominio (`qivox.…`, `fitnessgroup.…`). En el mismo dominio las tres
  comparten los datos locales del navegador; en subdominios distintos, cada una guarda los suyos.
- **Sin validar con los gimnasios.** Las dos versiones son una propuesta armada desde afuera. Publicarlas con su
  nombre y su logo requiere su acuerdo.

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
