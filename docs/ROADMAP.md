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
- **Actualizado:** Gemini está integrado con cuenta y cupos; ver COACH-IA.md.

## Estado actual, 21 de noviembre de 2026

- 48 ejercicios con demostración original local; 47 GIF descargables.
- Sesión por repeticiones/tiempo, favoritos, reemplazos y mapa semanal.
- Vista enfocada y programas con edición conservando avance y vista previa.
- Gemini con cuenta, clave privada y cupos persistentes.
- Verificación automática y revisión de experiencia en [PLAN-2026-11-21.md](PLAN-2026-11-21.md).
- Graphik, dominios/hosting y revisión profesional siguen pendientes. La historia previa se conserva como referencia temporal.

## Estado frente a la hipótesis de producto

Hipótesis: registro simple + planificación personalizada + IA conversacional, para hispanohablantes.

| Funcionalidad | Fase | Estado |
| --- | --- | --- |
| Perfil, objetivos y nivel | MVP | Hecho: objetivo principal, días por semana, lugar (gimnasio / casa con pesas / sin equipo) y nivel |
| Rutinas y calendario semanal | MVP | Hecho |
| Biblioteca con videos | MVP | Hecho: 48 ejercicios con demostración, texto, posters y mapa muscular; revisión profesional pendiente |
| Registro de series, pesos y repeticiones | MVP | Hecho |
| Estadísticas y evolución | MVP | Hecho |
| Adaptación automática de rutinas | 2ª fase | Primera parte hecha: semana tipo sugerida según el perfil, progresión de cargas por reglas (subir, mantener o +1 repetición) y rutina propuesta por reglas al crear una (B-22), siempre con confirmación del usuario |
| Entrenador IA conversacional | 2ª fase | Primer uso hecho: propuesta con Gemini, cuenta y cupos persistentes. Conversación adaptativa posterior pendiente |
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

1. **Revisión profesional (B-30).** Validar catálogo, indicaciones, demostraciones, reglas y propuestas con el material preparado. No está realizada por las pruebas de software.
2. **Piloto con alumnos y gimnasios.** Probar registro, programa y coach durante entrenamientos reales; recoger tiempos, errores y dudas. Confirmar con dos o tres profes cómo arman y asignan rutinas antes de construir su panel.
3. **Publicación (B-21).** Elegir dominios y hosting, obtener conformidad de las marcas y verificar HTTPS, datos y PWA. La configuración técnica ya está preparada en deploy/ y docs/PUBLICACION.md.
4. **Graphik de Qivox (B-20).** Recibir webfonts y licencia. La alternativa actual Inter 800 sigue disponible.
5. **Acceso a cuentas.** Recuperación de contraseña y Google Login requieren elegir servicios y configurar sus credenciales. No se presentan como disponibles.
6. **Sincronización por entidad.** Evaluarla si el piloto muestra conflictos frecuentes o historiales grandes. Hoy se sincroniza una foto completa con revisión y resolución explícita de conflictos.
7. **Módulo para gimnasios y profes.** Tras validar el piloto: organizaciones, roles, vinculación de socios y asignación con permisos reales. La identidad visual y el programa personal existentes son su base, sin simular roles.
8. **Salud, pagos y adaptación posterior.** Requieren validar producto, precio, límites e integraciones. No se habilitan como parte de esta revisión.

Las mejoras B-31 a B-34 y sus comprobaciones están en [PLAN-2026-11-21.md](PLAN-2026-11-21.md). El MVP no envía mensajes ni procesa pagos. Rutinas, progresiones y propuestas se revisan antes de aplicar; las animaciones y recomendaciones generales conservan pendiente la revisión profesional.
