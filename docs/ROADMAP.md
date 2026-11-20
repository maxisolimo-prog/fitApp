# Alcance y continuidad

## Requisitos originales y decisiones

El documento recibido propone una WebApp responsive/PWA, Angular 21, Tailwind, API NestJS, MySQL, autenticación y despliegue en AWS. Describe rutinas, calendario, biblioteca, registro y progreso como MVP; IA adaptativa e integraciones de salud como fases posteriores. Los precios y competidores del documento son hipótesis previas, no una investigación revalidada en esta implementación.

El usuario confirmó prioridad del alumno. Después pidió demostraciones anatómicas como la captura de Strong, contenido en español y colores de temacy.ar. Estos tres requisitos guían la interfaz.

No se recibió el audio ni una transcripción del amigo. Ninguna funcionalidad se atribuye a ese audio.

## Entrega inicial

Frontend operativo con persistencia local, rutinas, calendario, sesiones, perfil y progreso. La publicación privada es una demostración del frontend; el estado permanece en el navegador. No es todavía un servicio multiusuario.

## Segunda entrega (16 de noviembre de 2026): API y cuentas

Decisión del usuario: **Express + MySQL** en lugar de NestJS. La app es chica (un tipo de usuario, una API de pocos endpoints) y Express alcanza con menos piezas; NestJS se puede reconsiderar si llega el portal de entrenador con varios desarrolladores. Detalle en `docs/API.md`.

Hecho:

- API Express 5 en `api/` con MariaDB/MySQL (`mysql2`, SQL directo, migraciones versionadas en `api/migrations`).
- Esquema relacional: usuarios, sesiones, rutinas, ejercicios de rutina, entrenamientos (incluida la sesión en curso), series, calendario y mediciones de peso. Cada fila personal lleva `user_id` y se borra en cascada.
- Cuentas con email y contraseña (scrypt), sesión en cookie httpOnly `SameSite=Lax`, límites de intentos y borrado de cuenta.
- Sincronización opcional desde Perfil: el dispositivo sigue funcionando sin conexión con `localStorage`; con cuenta, cada cambio se envía como foto completa con revisión optimista. Si dos dispositivos chocan, el alumno elige qué copia conservar.
- Migración de los datos locales: al crear la cuenta se suben los del dispositivo; al ingresar en otro dispositivo con datos propios, se pregunta.
- La API reutiliza la validación del front (`workout-utils.ts`).

## Tercera entrega (16 de noviembre de 2026): producto frente a la competencia

Tras el relevamiento de `docs/COMPETENCIA.md` y pruebas del usuario en el celular:

- **Calendario:** semana tipo que se repite + vista de mes; cualquier día se puede cambiar o marcar como descanso (FitAppState v2, migración 003).
- **Sesión:** columna "Anterior", cargas precargadas de la última vez, agregar/quitar series, notas.
- **Récords** al terminar y **resumen para compartir** (Web Share / WhatsApp).
- **Editor de rutinas** sin tope de 12, selector de ejercicios por categoría y buscador, reordenar.
- **Catálogo** de 16 a 43 ejercicios en 9 grupos musculares (indicaciones a validar con un profesional).
- **Celular:** inicio rediseñado (foto a todo el ancho, accesos grandes), instalación guiada (un toque en Android, pasos en iPhone), actualización automática de versiones.
- Revisión adversarial de la sincronización: corregidos 3 hallazgos graves (pérdida de datos, DoS) y los medios.

## Cuarta entrega (18 de noviembre de 2026): tres marcas sobre un mismo código

Decisión del usuario: además de la versión actual, una con la estética de Qivox y otra con la de Fitness Group
(gimnasios Manantial), sin duplicar el código y con lugar para que cada una tenga funciones distintas.

- Cada marca es un archivo en `src/app/brands/`: colores, tipografía, radios, nombre, logo y lista de funciones.
- Se elige con `?marca=` o por subdominio; un solo build sirve a las tres.
- Es la base de la etapa "Marca del gimnasio" del módulo de gimnasios: cuando existan las organizaciones en la
  API, la marca pasa a ser un dato del gimnasio.
- Logos, ícono de pestaña y app instalada por marca, con los archivos de las webs públicas de cada gimnasio.
- Falta lo que depende de ellos: su acuerdo para publicar con su nombre y su logo, y la tipografía de títulos de
  Qivox (B-19 a B-21 en [BACKLOG.md](BACKLOG.md)). Ninguno de los dos gimnasios vio ni validó su versión.

## Quinta entrega (19 de noviembre de 2026): el ejercicio se ve y la sesión acompaña

Sale del análisis de Fitness Online (`docs/COMPETENCIA.md`). Detalle de cada ítem en [BACKLOG.md](BACKLOG.md).

- **Músculos y mapa muscular** (B-01, B-02): principales y secundarios de los 43 ejercicios, y un cuerpo de frente
  y de espalda en la ficha.
- **Miniaturas** en biblioteca, rutina, sesión y selector del editor (B-04): el mapa muscular en chico, hasta que
  haya imágenes.
- **Ficha del ejercicio desde la sesión** (B-05), sin salir ni perder lo cargado.
- **Cambiar un ejercicio** por otro del mismo movimiento durante la sesión (B-06).
- **Duración estimada** calculada con series y descansos, y "Empezar" siempre a mano en el celular (B-07).
- **Avance de la sesión** en Inicio (B-08).
- **Hora y comentario por serie** (B-10, B-11): FitAppState v4, migración 005.
- **Qué representa el número de Kg** (B-09): con mancuernas, la carga de una; con barra, con la barra incluida.
- **El descanso flota abajo**, al alcance del pulgar: que aparezca o termine ya no mueve la tabla de series.
- Dos revisiones adversariales del dominio (`store-guardian`) y una de interfaz (`ui-reviewer`). La primera
  encontró que cambiar la duración de las plantillas hacía aparecer un conflicto falso al ingresar a una cuenta
  desde un dispositivo vacío; la segunda, que una app sin actualizar podía pisar datos de la versión nueva; la de
  interfaz, que la app podía quedar bloqueada si la sesión desaparecía con una hoja abierta. Corregido.
- **Sin validar:** la clasificación de músculos, los movimientos equivalentes y los tiempos de la duración estimada
  son generales y no los revisó un profesional. Nada de esto se probó todavía en un gimnasio ni en un teléfono real.

## Sexta entrega (20 de noviembre de 2026): armar la rutina

Pedido del usuario sobre la pantalla "Creá tu rutina". Detalle en el bloque 4 de [BACKLOG.md](BACKLOG.md).

- **La app propone una rutina** (B-22): la persona dice qué quiere trabajar, cuánto tiempo tiene y dónde entrena, y
  recibe ejercicios del catálogo con sus series y descansos. Son reglas, no IA; la propuesta entra al editor como
  borrador y la persona confirma.
- **Editor** (B-23 a B-25): ejercicios primero y datos al final; valores iniciales según el objetivo del perfil y
  el nivel; kilos de arranque opcionales; qué músculos trabaja la rutina; selector filtrado por el equipo del lugar.
- **Sin validar:** qué ejercicio se propone para cada movimiento y las series, repeticiones y descansos de partida
  son generales. Están en `docs/REVISION-PROFESIONAL.md`, sin revisar por un profesional.
- **Queda abierto:** el coach con IA (B-26). Falta decidir proveedor, si exige cuenta y tope de gasto.

## Estado frente a la hipótesis de producto

Hipótesis: registro simple + planificación personalizada + IA conversacional, para hispanohablantes.

| Funcionalidad | Fase | Estado |
| --- | --- | --- |
| Perfil, objetivos y nivel | MVP | Hecho: objetivo principal, días por semana, lugar (gimnasio / casa con pesas / sin equipo) y nivel |
| Rutinas y calendario semanal | MVP | Hecho |
| Biblioteca con videos | MVP | Parcial: 43 ejercicios con texto y mapa muscular propio (principales y secundarios), sin imágenes del movimiento. Plan: imágenes creadas con GPT; animaciones compradas solo si hace falta (ver "Próximos incrementos") |
| Registro de series, pesos y repeticiones | MVP | Hecho |
| Estadísticas y evolución | MVP | Hecho |
| Adaptación automática de rutinas | 2ª fase | Primera parte hecha: semana tipo sugerida según el perfil, progresión de cargas por reglas (subir, mantener o +1 repetición) y rutina propuesta por reglas al crear una (B-22), siempre con confirmación del usuario |
| Entrenador IA conversacional | 2ª fase | Pendiente: requiere proveedor, presupuesto y límites. Primer uso definido: pedir la rutina con palabras propias (B-26) |
| Relojes y apps de salud | 2ª fase | Pendiente: requiere app nativa (p. ej. Capacitor) |
| Panel para entrenadores y gimnasios | Expansión | Pendiente: validar con profes |

## Decisiones

### Segmento: personas y gimnasios (decidido por el usuario el 16 de noviembre de 2026)

FitApp apunta a **personas** que entrenan y a **gimnasios**. Para no competir de frente con el software de gestión
(Mis Actividades, GymAr, AgendaPro), en gimnasios FitApp es el **módulo de entrenamiento**, no la administración:

| Para | Qué ofrece | Qué no hace |
| --- | --- | --- |
| Personas | App gratis: rutinas, semana tipo, registro, progreso, récords. Cuenta opcional. | — |
| Gimnasios | Los profes asignan rutinas y semana tipo a cada socio y ven su progreso real; app con logo y colores del gimnasio; socios que se suman con un código o QR. | Cuotas, accesos, reservas de clases, facturación: siguen en el sistema que el gimnasio ya usa. |

Un **profe independiente** entra en el mismo modelo: es un gimnasio con un solo profe. El socio de un gimnasio
usa la misma app que una persona; su gimnasio solo le suma rutinas asignadas y seguimiento.

**Modelo de negocio (hipótesis a validar):** gratis para personas; abono mensual en pesos para el gimnasio o el
profe, según cantidad de socios o profes. No se fijan precios sin hablar con 2 o 3 gimnasios.

**Etapas para gimnasios:**

1. **Validar** con 2 o 3 gimnasios o profes: qué sistema de gestión usan, cómo arman hoy las rutinas, cuánto
   pagarían. Sin esto no se construye el panel.
2. **Modelo de datos multi-organización:** gimnasio → profes → socios, con roles y autorización por fila (un profe
   solo ve a sus socios; un socio decide qué comparte). Migración nueva en la API.
3. **Vinculación del socio** con código o QR del gimnasio; puede desvincularse cuando quiera y sus datos personales
   siguen siendo suyos.
4. **Panel del profe** (web, pensado para computadora): lista de socios, asignar rutina y semana tipo, ver
   asistencia, récords y evolución.
5. **Marca del gimnasio:** logo y colores en la app del socio. La parte visual ya existe (cuarta entrega): hoy
   la marca se elige por dirección; acá pasa a salir del gimnasio al que está vinculado el socio.
6. **Cobro** al gimnasio, recién con precio validado.

### Análisis previo de segmentos

Queda como referencia de por qué se eligió así.

| Opción | A favor | En contra |
| --- | --- | --- |
| Alumno que entrena solo o guiado | Es lo construido y la prioridad confirmada al inicio; hay espacio en español; rápido de lanzar. | Difícil cobrarle: Strong y Hevy cuestan ~USD 2–3/mes y tienen plan gratis. |
| Entrenador con alumnos | Paga, y en pesos (Trainer UP desde ~ARS 39.000/mes); trae a sus alumnos. | Requiere panel del entrenador (proyecto mediano). |
| Gimnasio | Contratos más grandes. | Mercado ocupado (Mis Actividades, +600 gimnasios); exige cuotas, accesos, reservas y facturación: otro producto. |

La recomendación inicial era alumno gratis + entrenador que paga, sin gimnasios. El usuario decidió sumar
gimnasios; el enfoque de "módulo de entrenamiento" resuelve la objeción principal (no rehacer la gestión).

### Audio del socio (pendiente)

El audio de WhatsApp del amigo (~62 s) todavía no se transcribió. No se le atribuye ninguna funcionalidad hasta
tener el texto. Paso siguiente: transcribirlo desde WhatsApp (mantener apretado → Transcribir) y cruzarlo con este
roadmap y con `docs/COMPETENCIA.md`: matriz idea vs. competencia, ventajas reales, alcance y etapas. No se
transcribe en esta PC: el procesamiento local exige CPU alta y la cuelga.

## Próximos incrementos

Los tres primeros salen del análisis de Fitness Online del 17 de noviembre de 2026 (`docs/COMPETENCIA.md`). Cada
ítem, con su esfuerzo, sus dependencias y las decisiones que faltan, está en [BACKLOG.md](BACKLOG.md).

1. **Que el ejercicio se vea** (B-01 a B-05). Imagen de cada ejercicio, mapa muscular propio con músculos
   principales y secundarios, miniaturas en todas las listas y la ficha del ejercicio a un toque desde la sesión.
   No cambia el esquema ni exige comprar licencias. El usuario decidió que las imágenes las cree GPT; el dibujo de
   línea de licencia abierta queda como reserva. Falta generar una imagen de prueba y que apruebe el estilo: la
   cuenta de ChatGPT quedó sin cupo hasta el 20 de noviembre de 2026. **Hecho** (quinta entrega): músculos, mapa
   muscular, miniaturas y ficha desde la sesión. Faltan las imágenes (B-03): van en grises, un solo juego para
   las tres marcas, y el prompt para pedirlas está en [PROMPT-IMAGENES.md](PROMPT-IMAGENES.md).
2. **La sesión en el gimnasio** (B-06 a B-12). Sustituir un ejercicio cuando la máquina está ocupada, duración
   estimada calculada, avance de la sesión en curso, aclarar si la carga es total o por mancuerna, hora y comentario
   por serie (FitAppState v4). La vista de un ejercicio por pantalla se decide después de probar lo anterior.
   **Hecho** (quinta entrega) todo menos B-12: el usuario decidió esperar a usar la sesión unos días en el gimnasio.
3. **Animaciones anatómicas con licencia comercial** (B-17). Solo si las imágenes del punto 1 no alcanzan o se
   quiere movimiento. Validar su correspondencia con ejercicios y técnica con un profesional.
   **Requiere comprar la licencia.**
4. Recuperación de contraseña por email (requiere un servicio de envío de correo) y Google Login (requiere un client ID de Google Cloud).
5. Despliegue: hosting de la API y la base (AWS u otro), HTTPS con `COOKIE_SECURE=true`, copias de seguridad de la base. Hoy corre en esta PC.
6. Sincronización por entidad en lugar de foto completa, si los historiales crecen o se usa en varios dispositivos a la vez.
7. Módulo para gimnasios y profes (ver "Segmento: personas y gimnasios"): validar primero, después multi-organización, vinculación, panel del profe y marca. Nunca mediante un selector de roles sin autorización. Ahí entran los mensajes entre profe y socio y el programa asignado en secuencia.
8. Suscripciones y pagos solamente tras validar producto y precio. IA y ajustes automáticos después de definir límites y supervisión.

Más adelante, sin fecha: ejercicios por tiempo, favoritos, mapa muscular de la semana y programa en secuencia
(B-13 a B-16).

El MVP no envía mensajes, no contrata servicios y no procesa pagos. Tampoco inventa recomendaciones personalizadas a partir del perfil: la semana sugerida, la rutina propuesta y la progresión salen de reglas generales, se presentan como propuestas y la persona las confirma.
