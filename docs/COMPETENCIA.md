# Competencia y posicionamiento

Relevamiento del 16 de noviembre de 2026. Los precios salen de tiendas de apps y de comparativas de terceros (muchas
escritas por competidores), cambian seguido y no están en pesos salvo donde se indica: tomarlos como orden de
magnitud, no como cifra exacta.

## Tres mercados distintos

| Segmento | Quién | Qué resuelve | Precio de referencia |
| --- | --- | --- | --- |
| **Registro de entrenamiento (alumno)** | Strong, Hevy, JEFIT, Boostcamp | Anotar series, cargas y descansos; historial y récords. | Hevy Pro ~USD 24/año; Strong PRO ~USD 30/año; JEFIT Elite ~USD 70/año; Boostcamp Pro ~USD 60/año. Todos con plan gratis. |
| **Rutinas automáticas** | Fitbod | Genera la sesión según equipo, historial y recuperación. | ~USD 80–96/año; el algoritmo es la parte paga. |
| **Entrenador con alumnos** | Trainerize, TrueCoach, Everfit; en Argentina Trainer UP | El profe arma planes, los asigna y sigue a sus alumnos. | Por cantidad de alumnos: TrueCoach desde ~USD 20/mes (5 alumnos); Trainer UP desde ~ARS 39.000/mes (6–15 alumnos). |
| **Gestión de gimnasios** | Mis Actividades (Córdoba, +600 negocios, clientes como Fitness Group), GymAr, AgendaPro, Glofox | Socios, cuotas, accesos QR/huella, reservas, app con la marca del gimnasio. | A presupuesto. |

## Lo que todos los loggers buenos tienen (y FitApp todavía no)

1. **"Anterior"** en cada serie y cargas precargadas de la última vez. Es lo que hace rápido registrar en Strong y Hevy.
2. **Agregar o quitar series** durante la sesión.
3. **Récords personales** detectados al terminar.
4. **Compartir** el entrenamiento (Hevy hace de eso una red social; Mis Actividades tiene "Entrená acompañado").
5. Notas por sesión, calculadora de discos, reloj inteligente, integración con Apple Health/Health Connect.

## Dónde puede ganar FitApp

- **Español rioplatense de verdad**, sin traducción automática, y sin datos ni gráficos inventados.
- **Funciona sin cuenta y sin conexión**, y sincroniza si el alumno quiere. Hevy expone las cuentas como públicas por
  defecto; Strong limita rutinas en el plan gratis.
- **Precio en pesos.** Los loggers cobran en dólares; Trainer UP muestra que los profes argentinos pagan en pesos
  por seguir alumnos.
- **Puente entre el profe y el alumno:** Mis Actividades resuelve la operación del gimnasio pero su registro de
  entrenamiento es básico; los loggers no tienen profe; las plataformas de entrenador son caras y en dólares.

**Decisión del 16 de noviembre de 2026:** personas y gimnasios (ver `docs/ROADMAP.md`). Hipótesis original: *el registro de entrenamiento más cómodo en español,
gratis para el alumno, con un plan pago en pesos para el profe que asigna rutinas y ve el progreso real.* Es el
módulo para gimnasios y profes del roadmap. No se decide sin hablar con entrenadores reales.

## Prioridades que salen de esto

| # | Qué | Por qué | Esfuerzo |
| --- | --- | --- | --- |
| 1 | Anterior + cargas precargadas | Paridad básica; la mejora más grande para registrar entre series. | Bajo |
| 2 | Agregar / quitar series en la sesión | Hoy la sesión es rígida. | Bajo |
| 3 | Récords al terminar + compartir por WhatsApp | Motivación y crecimiento boca a boca. | Medio |
| 4 | Notas de la sesión | El modelo ya lo soporta. | Bajo |
| 5 | Hosting estable con dominio | Sin esto no hay usuarios reales (hoy es un link de ngrok). | Medio, requiere decisión de costos |
| 6 | Portal del entrenador | Diferencial y modelo de negocio. | Alto, requiere validar con profes |

Los puntos 1–4 se implementaron el 16 de noviembre de 2026 (anterior y cargas precargadas, agregar/quitar series, récords con resumen para compartir, notas). Antes, ese mismo día, se priorizó el calendario (semana tipo + vista de mes con cambios por día), pedido por el usuario: combina la planificación por fecha de las apps de entrenadores con la vista de lo entrenado de Strong y Hevy.

## Fitness Online: análisis de capturas (17 de noviembre de 2026)

Siete capturas aportadas por el usuario, en `docs/competencia/`. La app se reconoce por la marca de agua
"Fitness Online" de sus imágenes; la ficha de App Store que coincide es
[Ejercicio en casa, fitness gym](https://apps.apple.com/MX/app/id1114387800), de FITNESS ONLINE MChJ (a confirmar
con quien sacó las capturas). No entra en un solo segmento de la tabla de arriba: da un programa armado por días,
ofrece entrenador y suma dieta, feed y mensajes.

Las capturas son referencia interna. Las imágenes de esa app son de su dueño: no se usan ni se recortan para FitApp.
Lo que el usuario pidió tomar de acá es, sobre todo, **que el ejercicio se vea**: imagen en la lista, en la sesión y
en la ficha. Los ítems `B-nn` están en [BACKLOG.md](BACKLOG.md).

### Pantalla por pantalla

| Captura | Qué muestra | FitApp hoy | Qué hacemos |
| --- | --- | --- | --- |
| [01 Dashboard](competencia/fitness-online-01-dashboard.jpeg) | "Siguiente entrenamiento": los próximos días del programa numerados (día 18, 19, 20), con anillo de avance por sesión (37 %, 0 %) y candado en el que todavía no toca. Calendario del mes. Solapas Dashboard, Entrenamientos, Dieta; barra inferior con Feed, Mensajes y Manual. | Inicio con la sesión en curso o la rutina de hoy, la semana y el último entrenamiento. Calendario con semana tipo y mes. Sin programa numerado ni porcentaje de avance. | Avance de la sesión en curso (B-08). Programa en secuencia, a validar (B-16). Sin candados. |
| [02 Previa de la sesión](competencia/fitness-online-02-previa-sesion.jpeg) | Duración estimada (~1 h 8 min). Cada ejercicio con miniatura, nombre y prescripción compacta ("3x12x35 kg"). Entrada en calor por tiempo y pulsaciones ("8 min, 110–140 lpm"). Botón fijo "Comenzar entrenamiento". | El detalle de la rutina lista series × repeticiones, carga y descanso, sin imagen. La duración es un dato fijo de la rutina. No hay ejercicios por tiempo. | Miniaturas (B-04), duración calculada (B-07), ejercicios por tiempo (B-13). |
| [03 Ejercicio en la sesión](competencia/fitness-online-03-ejercicio-en-sesion.jpeg) | Un ejercicio por pantalla, con su posición ("2/12"). Imagen grande animada. Botones para sustituir y ver información. "Peso recomendado: 35 kg – peso total". Tres indicadores grandes: repeticiones, descanso (02:00), series completadas (0/3). | Todos los ejercicios en una página, con tabla de series (Anterior, Kg, Reps), descanso con +15 s y sugerencia de progresión con confirmación. Sin imagen, sin sustituir, sin aclarar si la carga es total o por lado. | Imagen (B-03), ficha desde la sesión (B-05), sustituir (B-06), aclarar la carga (B-09), vista enfocada, a validar (B-12). |
| [04 Registro e historial](competencia/fitness-online-04-registro-e-historial.jpeg) | Campos Kilogramos y Repeticiones vacíos con un "+" para sumar la serie. "Agregar comentario a la serie". Debajo, el historial completo del ejercicio por fecha, con la hora de cada serie, y acceso a la gráfica. | Series precargadas que se marcan como hechas. "Anterior" muestra solo la última vez. Notas por sesión, no por serie. Las series no guardan hora. Historial y gráfico están en la Biblioteca. | Ficha desde la sesión (B-05), hora de cada serie (B-10), comentario por serie (B-11). |
| [05 Sustitución](competencia/fitness-online-05-sustitucion.jpeg) | Hoja inferior con el ejercicio actual marcado y cuatro alternativas con miniatura. Todas son presses de pecho: equivalen por movimiento, no solo por grupo muscular. | No existe. Si la máquina está ocupada, el alumno saltea el ejercicio o anota otra cosa. | Sustituir durante la sesión (B-06). |
| [06 Ficha: Info](competencia/fitness-online-06-ficha-info.jpeg) | Solapas Info, Músculos, Historial, Progreso. Imagen grande, descripción e instrucciones. Marcador de favorito, video y tamaño de texto. | Ficha con Resumen, Historial y Cómo hacerlo, y gráfico con datos reales. Sin imagen (solo un enlace externo en press de banca). Sin favoritos. | Imagen (B-03), solapa Músculos (B-02), favoritos (B-14). |
| [07 Ficha: Músculos](competencia/fitness-online-07-ficha-musculos.jpeg) | Figura anatómica con los músculos coloreados según la carga, un porcentaje por músculo (44,44 %, 30,86 %…), leyenda en cuatro rangos y "Distribución de carga muscular" por zona. | Un solo dato por ejercicio ("Pecho"). | Músculos principales y secundarios (B-01) y mapa muscular propio (B-02), sin porcentajes. Mapa de la semana con lo entrenado (B-15). |

### Conceptos que valen la pena

1. **La imagen está en todos lados.** Lista, sesión, sustitución y ficha. Entre series se reconoce el ejercicio de un
   vistazo, sin leer nombres largos como "Extensiones de tríceps acostado, en polea baja con cuerda".
2. **Sustituir sin salir de la sesión.** Resuelve el caso más común del gimnasio: la máquina ocupada.
3. **Todo lo del ejercicio a un toque desde la sesión:** técnica, historial completo y gráfica.
4. **Tres números grandes** (repeticiones, descanso, series), legibles con el celular apoyado.
5. **Mapa muscular:** se entiende qué trabaja cada ejercicio sin leer.
6. **Previa con duración estimada:** el alumno sabe cuánto le va a llevar antes de empezar.
7. **"Peso total":** aclara una duda real con mancuernas y barras, que FitApp hoy no resuelve.

### Lo que FitApp ya hace igual o mejor

- Series precargadas con la carga de la última vez y columna "Anterior"; allá cada serie se tipea en dos campos vacíos.
- Sugerencia de progresión por reglas, siempre con confirmación (equivale a su "peso recomendado").
- Descanso con +15 s y saltar, récords al terminar y resumen para compartir.
- Semana tipo que se repite, además del mes.
- Funciona sin cuenta y sin conexión.
- Texto: allá se nota la traducción automática ("press de pecho en el simulador", "le agrega un relieve atractivo
  al pecho") y promete resultados estéticos, que FitApp evita.

### Lo que no copiamos

| Qué | Por qué |
| --- | --- |
| Porcentaje por músculo con dos decimales | Es una precisión que no podemos respaldar con una fuente. FitApp distingue músculos principales y secundarios, nada más. |
| Candados en los días siguientes | FitApp sugiere un orden, no le bloquea el entrenamiento al alumno. |
| Feed social | Anti-referencia de `PRODUCT.md`: distrae durante el entrenamiento. |
| Dieta | Fuera de alcance. |
| Mensajes | Solo tienen sentido entre profe y socio: van con el módulo de gimnasios. |
| Tamaño de texto propio | Lo resuelve el sistema; FitApp tiene que respetar el zoom y el tamaño de fuente del celular. |
| Sus imágenes | Son de Fitness Online y llevan su marca de agua. |

## Fuentes

- Hevy: [App Store IAP](https://apppricinglab.com/iap/apple/1458862350), [reseña SensAI](https://www.sensai.fit/blog/hevy-review-2026)
- Strong: [App Store](https://apps.apple.com/app/strong/id464254577), [reseña SensAI](https://www.sensai.fit/blog/strong-app-review-2026), [IAP](https://apppricinglab.com/iap/apple/464254577)
- Fitbod, JEFIT, Boostcamp: [comparativa de precios](https://www.sensai.fit/blog/fitness-app-pricing-free-tier-comparison), [Boostcamp vs JEFIT](https://www.boostcamp.app/vs/jefit), [Boostcamp Pro](https://boostcamp.app/pro)
- Entrenadores: [Everfit vs Trainerize vs TrueCoach](https://www.fitbudd.com/insights/everfit-vs-trainerize-vs-truecoach?c84a98fb_page=4), [comparativa fitpros](https://fitpros.io/pricing-comparison), [Trainer UP en pesos](https://www.comparasoftware.com.ar/trainer-up), [apps para entrenadores](https://metodo-x.com/guias/mejores-apps-para-entrenadores-personales)
- Gimnasios Argentina: [Mis Actividades](https://www.misactividades.com/), [gestión administrativa](https://www.misactividades.com/soluciones/gestion-administrativa/), [Mercado Fitness](https://mercadofitness.com/mis-actividades-presenta-su-software-para-gimnasios-en-mercado-fitness-pais/), [GymAr](https://www.comparasoftware.com/gymar), [AgendaPro](https://agendapro.com/ar/gimnasio/software-para-gimnasio)
- Precios de entrenamiento online en Argentina: [El Laburante](https://ellaburante.com/blog/personal-trainer-precios-2026)
- Fitness Online: capturas del usuario en `docs/competencia/` (17 de noviembre de 2026) y [ficha de App Store](https://apps.apple.com/MX/app/id1114387800)
