# Backlog

Ítems concretos, en el orden en que conviene hacerlos. El rumbo y las etapas grandes están en
[ROADMAP.md](ROADMAP.md); de dónde sale cada ítem, en [COMPETENCIA.md](COMPETENCIA.md). Armado el 17 de noviembre
de 2026 a partir de las capturas de Fitness Online (`docs/competencia/`) y del código de ese día.

La columna **Esquema** dice si el ítem cambia `FitAppState` (hoy versión 7). Los que sí exigen subir la versión,
migración con test de ida y vuelta y una migración SQL nueva en `api/migrations/`. El catálogo de ejercicios
(`seed.ts`) no se guarda en el estado del alumno: cambiarlo no toca el esquema.

Varios ítems dicen "falta la revisión de un profesional". Todo lo que hay que revisar (músculos, indicaciones,
reemplazos, tiempos de la duración, sugerencia de progresión, rutinas iniciales, semana sugerida y la rutina que la
app propone) está reunido en
[REVISION-PROFESIONAL.md](REVISION-PROFESIONAL.md), escrito para pasárselo a un profe o a un kinesiólogo. Sale del
catálogo: si el catálogo cambia, hay que volver a armarlo.

## Seguimiento actual (20 de noviembre de 2026)

B-12 y B-16 implementados; B-17 evaluado; B-26 conectado a Gemini. B-20, B-21 y B-30 siguen pendientes de recursos externos. Estado verificado en Asana: 27 completadas y 3 pendientes. No se consideran completadas por tener la preparación técnica.

Proyecto [FitApp en Asana](https://app.asana.com/1/1218158297074103/project/1220742089470114), con 30 tareas y cuatro secciones. Los identificadores están en [ASANA.json](ASANA.json).

- B-28: seis demostraciones integradas en Biblioteca, rutinas y sesión. Catálogo de 48 ejercicios (cinco variantes nuevas), siete animaciones incluyendo el press de banca anterior. Miniaturas, filtro «Solo con animación», descarga de GIF y alternativa GIF si el video falla. Recursos locales, movimiento reducido y caché diferida.
- B-13: registro por tiempo en editor, sesión e historial. Minutos/segundos, carga y repeticiones separadas; sin volumen ni récords de kilos para cardio. Estado v5 y migración SQL 006, compatible con copias v1–v4. No incluye pulsaciones objetivo.
- B-15: mapa muscular semanal con períodos navegables, conteos de series principales/de apoyo y estado vacío. Usa solo sesiones finalizadas y series completadas; no mide intensidad ni recuperación.
- B-29: la navegación del sitio pide confirmar antes de descartar cambios del editor, y permite seguir editando conservando el borrador.
- B-14: favoritos desde Biblioteca, ficha y selector. Filtro al crear rutinas, persistencia local, respaldo y sincronización por cuenta; estado v6 y SQL 007, compatible con copias v1–v5.
- B-27: cambiar un ejercicio desde el editor por otro del mismo movimiento. Conserva series, repeticiones/tiempo y descanso, deja la carga nueva en cero y ofrece deshacer sin pisar cambios posteriores.
- B-03: completadas las 41 demostraciones restantes. Los 48 ejercicios tienen video y poster; 47 también tienen GIF descargable. Galería completa con buscador y ZIP. B-30 conserva pendiente la revisión profesional de textos, músculos y animaciones.

## Decisiones abiertas

Las toma el usuario. Hasta entonces, los ítems que dependen de ellas no arrancan.

1. **Imagen del ejercicio: resuelta el 17 de noviembre de 2026.** El usuario prefiere que las imágenes las cree
   GPT, en lugar del dibujo de línea de Everkinetic, que queda como reserva. Estilo anatómico aprobado y 48 demostraciones integradas; ver B-03.
2. **Presupuesto para animaciones anatómicas con licencia.** Alternativa si se decide cambiar los bucles originales aprobados por animación de un proveedor. La evaluación B-17 está terminada en [ANIMACIONES-LICENCIA.md](ANIMACIONES-LICENCIA.md); una compra futura requiere elegir alcance y presupuesto.
3. **Vista enfocada: implementada.** El pedido del usuario de terminar las tarjetas autoriza B-12 como modo alternativo. La lista sigue disponible.
4. **Carga con mancuernas: resuelta el 19 de noviembre de 2026.** Por mancuerna: se anota el número que figura en
   la que uno agarra. Con barra, el total con la barra incluida. Ver B-09.
5. **Imágenes de ejercicios con tres marcas: resuelta el 19 de noviembre de 2026.** Un solo juego en grises, sin
   color en los músculos y con fondo transparente, que sirve para las tres marcas. El color de cada marca lo pone
   el mapa muscular de B-02. El 20 de noviembre el usuario aprobó las demostraciones con figura gris, músculos resaltados y fondo claro; ese estilo se aplica a los 48 recursos.
6. **Coach con IA: conectado a Gemini.** El usuario confirmó su proveedor y configuró la clave. Habilitado en FitApp para cuentas, con 20 solicitudes mensuales. Las otras marcas quedan desactivadas en servidor hasta configurarlas. El plan y la facturación de Google se administran en la cuenta del usuario.

## Bloque 1: que el ejercicio se vea

Es el pedido del usuario. Nada de este bloque cambia el esquema ni exige comprar licencias; las imágenes de B-03
consumen el cupo de la cuenta de ChatGPT del usuario.

| # | Qué | Esfuerzo | Esquema | Depende de |
| --- | --- | --- | --- | --- |
| B-01 | Músculos principales y secundarios de los 43 ejercicios | Bajo | No | Hecho el 18 de noviembre de 2026 |
| B-02 | Mapa muscular propio y solapa "Músculos" en la ficha | Medio | No | Hecho el 18 de noviembre de 2026 |
| B-03 | Imagen de cada ejercicio, creada con GPT | Medio | No | Hecho: 48 de 48 demostraciones |
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

- **Estado al 20 de noviembre de 2026:** completado. Se sumaron las 41 demostraciones pendientes a las siete existentes: 48 videos con poster y 47 GIF (el press de banca original conserva WebM/WebP).
- **Recursos:** figura anatómica gris con músculos resaltados sobre claro. Poses originales de ImageGen ensambladas en bucles; WebM para reproducir dentro de la ficha, GIF descargable y poster para miniaturas. No son animaciones 3D continuas.
- **Integración:** catálogo central en `src/app/core/exercise-media.ts`, ficha compartida en Biblioteca/rutina/sesión y caché diferida. No se reutiliza el movimiento de una variante distinta. El press de banca ya no usa el enlace externo.
- **Verificación:** variantes y secuencias revisadas visualmente; pruebas de correspondencia de archivos, cuadros, duración y repetición del GIF. Galería completa con buscador y ZIP en `/exercise-demos/index.html`. Origen, correcciones y prompts en [ASSETS.md](ASSETS.md).
- **Pendiente en B-30:** revisión técnica/anatómica profesional; no se da por realizada al completar los archivos.
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
  piernas, de frente o de espalda). Los 48 ejercicios muestran el poster de su demostración. Si falla un poster, vuelve al mapa. El dibujo se baja al aparecer la primera
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
  sesión. El selector de ejercicios del editor de rutinas también se cierra con Atrás, y salir del editor con
  cambios sin guardar (con Atrás, "Cancelar" o "Volver a mis rutinas") pregunta antes. **Corregido en B-29 (20 de noviembre):** la navegación de arriba y abajo pide confirmar antes de descartar un borrador.

## Bloque 2: la sesión en el gimnasio

| # | Qué | Esfuerzo | Esquema | Depende de |
| --- | --- | --- | --- | --- |
| B-06 | Sustituir un ejercicio durante la sesión | Medio | No | Hecho el 19 de noviembre de 2026 |
| B-07 | Duración estimada calculada y "Empezar" fijo en la previa | Bajo | No | Hecho el 19 de noviembre de 2026 |
| B-08 | Avance de la sesión en curso en Inicio | Bajo | No | Hecho el 19 de noviembre de 2026 |
| B-09 | Aclarar si la carga es total o por mancuerna | Bajo | No | Hecho el 19 de noviembre de 2026 |
| B-10 | Guardar la hora de cada serie | Medio | **Sí (v4)** | Hecho el 19 de noviembre de 2026 |
| B-11 | Comentario por serie | Bajo | **Sí (v4)** | Hecho el 19 de noviembre de 2026 |
| B-12 | Vista enfocada: un ejercicio por pantalla | Alto | No | Hecho: modo alternativo en sesión |

- **B-06. Sustituir.** "Cambiar ejercicio" abre una hoja con equivalentes por movimiento (en la captura, todos son
  presses de pecho), no solo por grupo muscular. Necesita un dato nuevo en el catálogo: qué ejercicios se reemplazan
  entre sí, a revisar con un profesional. Cambia solo las series pendientes de esa sesión, no la rutina; las ya
  completadas quedan con el ejercicio original. El reemplazo hereda el descanso y muestra su propio "Anterior". No
  se puede elegir un ejercicio que ya está en la sesión. No toca el esquema porque cada serie ya guarda su
  ejercicio, pero es lógica del store: pasa por `store-guardian`. **Hecho:** cada ejercicio de la sesión con series
  pendientes tiene un botón "Cambiar". La hoja ofrece primero los del mismo movimiento y después los del mismo
  grupo muscular; tocar uno hace el cambio (dos toques en total). Se puede deshacer desde el aviso, unos
  segundos, o con "Volver a…" al pie del ejercicio nuevo, hasta que el alumno registre otra cosa en la sesión. El dato nuevo del catálogo es `movement`, con 19 patrones (`src/app/core/movements.ts`); **falta la
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
  cambia etiquetas: no reinterpreta lo ya registrado. **Hecho:** arriba de la tabla de series dice "Anotá el peso de
  una mancuerna." o "Anotá el total, con la barra incluida."; el editor de rutinas, la ficha y la hoja para cambiar
  de ejercicio lo aclaran como "kg por mancuerna" o "con la barra incluida". Polea, máquina y peso corporal no llevan
  aclaración. Mi progreso avisa que, con mancuernas, el volumen cuenta la carga de una.
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
- **B-12, hecho.** Vista de un ejercicio a la vez con posición, selector, anterior/siguiente, demostración y métricas de series, repeticiones o tiempo y descanso. Comparte todas las acciones de registro con la lista. Conserva preferencia local, valores, descanso y sesión al alternar y recargar.

## Bloque 3: más adelante

| # | Qué | Esfuerzo | Esquema | Depende de |
| --- | --- | --- | --- | --- |
| B-13 | Ejercicios por tiempo (cinta, plancha, movilidad) | Alto | **Sí (v5)** | Hecho el 20 de noviembre de 2026 |
| B-14 | Favoritos en la biblioteca | Bajo | **Sí (v6)** | Hecho el 20 de noviembre de 2026 |
| B-15 | Mapa muscular de la semana en Progreso | Medio | No | Hecho el 20 de noviembre de 2026 |
| B-16 | Programa en secuencia ("día 18 de 55") | Alto | **Sí (v7)** | Hecho; revisión profesional en B-30 |
| B-17 | Evaluar animaciones anatómicas con licencia | Medio | No | Evaluación terminada; compra opcional |

- **B-13, hecho.** Cinta y escaladora se registran por tiempo. Los otros ejercicios permiten elegir tiempo o repeticiones en el editor, sin reinterpretar el historial existente. Guarda duración en segundos, admite edición en minutos/segundos y la conserva al añadir/completar series, comentar, sustituir, recargar, exportar e importar. API y SQL migrados a v5. Las pulsaciones objetivo quedan para una ampliación.
- **B-14, hecho.** Estrella independiente del botón de abrir/elegir un ejercicio, con estado accesible y filtro «Favoritos» en Biblioteca y «Solo favoritos» al armar o cambiar ejercicios. La selección se conserva al recargar, exportar/importar y sincronizar; se limpia al cerrar sesión. Una lista de favoritos también cuenta como datos locales al resolver un conflicto de cuenta. SQL 007 agrega una tabla por usuario; estados v1–v5 migran con favoritos vacíos.
- **B-15, hecho.** Mapa de frente/espalda y tabla de series por músculo, con navegación semanal. Solo cuenta entrenamientos finalizados del período local y series completadas. Sin entrenamientos, el mapa queda vacío. Aclara que una serie cuenta para varios músculos y que no se están comparando intensidad ni esfuerzo.
- **B-16, hecho.** Programa optativo en Mis rutinas, con sesiones ordenables y rutinas repetibles. Próxima sesión, avance, pausa y reanudación. Solo avanza al guardar una sesión iniciada desde el programa con al menos una serie completada; las sesiones libres o descartadas no avanzan. No modifica calendario ni semana tipo. Editar reinicia el recorrido con aviso explícito; conserva historial. Persistencia/exportación/sincronización v7, SQL 008 y pruebas de ida/vuelta. La validación técnica profesional sigue en B-30.
- **B-17, evaluación terminada.** Comparación de los originales, Gym Visual y MuscleWiki API con condiciones del proveedor y encaje con descargas, variantes y marcas. Recomendación: conservar los originales aprobados; una contratación posterior debe precisar licencia y alcance. No se compró contenido. Ver [ANIMACIONES-LICENCIA.md](ANIMACIONES-LICENCIA.md).

## Bloque 4: armar la rutina

Pedido del usuario del 20 de noviembre de 2026, a partir de la pantalla "Creá tu rutina": arrancaba con un
formulario vacío, pedía el nombre antes que los ejercicios y suponía que la persona ya sabía qué elegir.

De dónde sale: Hevy y Strong ofrecen el mismo editor en blanco (título y "agregar ejercicio"). Fitbod no tiene
editor al empezar: pregunta objetivo, nivel, equipo y duración, y genera la sesión; es su parte paga. Las apps de
chat con IA arman el plan conversando, pero de ellas solo hay fichas de tienda, sin pruebas independientes. FitApp
toma lo del medio: una propuesta que entra al editor como borrador y que la persona confirma.
Fuentes: [rutinas en Hevy](https://help.hevyapp.com/hc/en-us/articles/34953606698903-Build-a-Workout-Program-Create-Organize-Routines),
[cómo arma Fitbod el entrenamiento](https://help.fitbod.me/hc/en-us/articles/360004429814-How-Fitbod-Creates-Your-Workout).

| # | Qué | Esfuerzo | Esquema | Estado |
| --- | --- | --- | --- | --- |
| B-22 | Propuesta de rutina por reglas ("Armámela") | Medio | No | Hecho el 20 de noviembre de 2026; falta la revisión de un profesional |
| B-23 | Editor: ejercicios primero, valores iniciales según objetivo y nivel, kilos de arranque opcionales | Bajo | No | Hecho el 20 de noviembre de 2026 |
| B-24 | Qué trabaja la rutina: resumen y mapa muscular en el editor | Bajo | No | Hecho el 20 de noviembre de 2026 |
| B-25 | Selector de ejercicios filtrado por el equipo del lugar | Bajo | No | Hecho el 20 de noviembre de 2026 |
| B-26 | Coach con IA: pedir la rutina con palabras propias | Alto | No (tabla de uso del servicio) | Hecho: Gemini conectado, cuenta y cupo mensual |
| B-27 | Cambiar un ejercicio por otro del mismo movimiento desde el editor | Bajo | No | Hecho el 20 de noviembre de 2026 |

- **B-22, hecho.** Al crear una rutina, la persona elige qué quiere trabajar (seis zonas), cuánto tiempo tiene y
  dónde entrena, y la app propone ejercicios del catálogo con sus series y descansos. Sin IA: reglas en
  `src/app/core/routine-builder.ts`, la misma respuesta da siempre la misma propuesta. Nunca supera el tiempo pedido
  ni los 8 ejercicios, solo propone lo que se puede hacer con el equipo del lugar y deja las cargas en 0. Si el
  catálogo no alcanza (espalda en casa sin equipo), lo dice en lugar de inventar. La propuesta entra al editor como
  borrador: se puede cambiar todo, pedir otra y deshacer. Las reglas están en REVISION-PROFESIONAL.md.
- **B-23, hecho.** Los ejercicios van arriba; nombre, enfoque, nivel y descripción, al final, cuando ya hay algo
  que nombrar. Un ejercicio agregado a mano ya no entra siempre con 3 × 10 y 60 s: toma los valores del objetivo
  del perfil y del nivel de la rutina. Los kilos no se piden al crear (la sesión los recuerda desde la primera
  vez); se cargan con "Cargar kilos de arranque", y una rutina que ya los tiene los muestra.
- **B-24, hecho.** Debajo de la lista, qué músculos trabaja la rutina en texto y, a pedido, sobre el cuerpo. Sin
  porcentajes.
- **B-25, hecho.** En casa, el selector arranca mostrando solo lo que se puede hacer con ese equipo; se destilda
  para ver todo el catálogo. El lugar sale del perfil y se puede cambiar para esa rutina sin tocar el perfil.
- **B-26, hecho.** Gemini conectado con `gemini-3.5-flash-lite`, pedido en texto, vista previa, aplicación al borrador y deshacer. Cuenta obligatoria, clave en servidor, límites por usuario y reserva mensual persistente (SQL 009). Cupo inicial de 20 solicitudes/mes para FitApp. Validación de catálogo/equipo/duplicados/carga cero y ajuste al tiempo. Prueba real con pedido sintético y pruebas de errores/límites aprobadas. No se cambió la facturación del proveedor. Revisión profesional en B-30 y detalle en [COACH-IA.md](COACH-IA.md).
- **B-27, hecho.** «Cambiar ejercicio» abre alternativas del mismo movimiento, con filtros de búsqueda, equipo y favoritos. No permite duplicar ejercicios. Conserva posición, series, repeticiones/tiempo y descanso; carga inicial cero para la variante nueva. «Volver a…» restaura la fila y su carga anterior mientras no se haya editado esa fila ni reintroducido el original. Cancelar/Escape/Atrás conservan el borrador y devuelven el foco. Solo modifica la rutina al guardar.
- **Pendiente menor.** Los nombres de los lugares ("Casa con pesas") están escritos dos veces: en
  `routine-builder.ts` y en `app.component.ts`. Unificarlos.

## Integración y revisión

| # | Qué | Estado |
| --- | --- | --- |
| B-28 | Integrar las seis animaciones elegidas en el sitio | Hecho el 20 de noviembre de 2026 |
| B-29 | Proteger salida del editor desde la navegación | Hecho el 20 de noviembre de 2026 |
| B-30 | Revisión profesional de catálogo, reglas y demostraciones | Pendiente de un profesional |

## Marcas: un solo código, tres versiones

Decisión del usuario del 18 de noviembre de 2026: una versión con la estética de Qivox y otra con la de Fitness
Group (la red de los gimnasios Manantial), además de la actual, sin duplicar el código y dejando lugar a que cada
una tenga funciones distintas. Detalle en "Marcas" de [DESIGN.md](DESIGN.md).

| # | Qué | Esfuerzo | Esquema | Estado |
| --- | --- | --- | --- | --- |
| B-18 | Tres marcas sobre el mismo código: tokens por rol, un archivo por marca, funciones por marca | Medio | No | Hecho el 18 de noviembre de 2026 |
| B-19 | Logo, ícono y nombre de la app instalada por marca | Bajo | No | Hecho el 18 de noviembre de 2026 con los logos de sus webs; falta el acuerdo de cada gimnasio |
| B-20 | Graphik para los títulos de Qivox | Bajo | No | Espera que Qivox entregue la tipografía con su licencia |
| B-21 | Una dirección por marca al desplegar | Bajo | No | Configuración preparada; faltan dominios/hosting y publicación |

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

Evaluación inicial del 17 de noviembre de 2026. El mapa MIT y los recursos originales de ImageGen ya están incorporados; los otros proveedores siguen como alternativas.

| Fuente | Qué trae | Licencia | Veredicto |
| --- | --- | --- | --- |
| GPT, desde la app de Codex del usuario | Imágenes creadas a pedido, con el estilo y los colores de FitApp | Términos de OpenAI de la cuenta del usuario; revisarlos antes de publicar | Elegida para B-03. Las 48 demostraciones originales están integradas. |
| [Everkinetic](https://github.com/everkinetic/data) | 289 ejercicios, dibujo de línea en dos posiciones, SVG y PNG | [CC BY-SA 4.0](https://github.com/everkinetic/data/blob/main/LICENSE.md) | Reserva para B-03. Pide atribución. |
| [react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter) | Cuerpo de frente y espalda en SVG, por zonas musculares | [MIT](https://github.com/HichamELBSI/react-native-body-highlighter/blob/main/LICENSE) | Sí, para B-02. Pide conservar el aviso de copyright. |
| [free-exercise-db](https://github.com/yuhonas/free-exercise-db) | Más de 800 ejercicios con músculos principales y secundarios, y dos fotos por ejercicio | [Unlicense](https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md) (dominio público) | Datos de músculos: sí, para B-01. Fotos: no; son de personas y el repositorio no documenta su origen. |
| [Gym Visual](https://gymvisual.com) | Animaciones anatómicas, el estilo que pidió el usuario | Paga; no encontré el precio publicado | Candidata para B-17. Pedir presupuesto. |
| Otras bibliotecas | MuscleWiki API y alternativas comerciales | Comercial | Evaluación B-17 terminada en ANIMACIONES-LICENCIA.md; cotizar el alcance concreto antes de contratar. Los precios históricos sin verificar no se usan como presupuesto. |
