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
paso 5 del roadmap. No se decide sin hablar con entrenadores reales.

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

## Fuentes

- Hevy: [App Store IAP](https://apppricinglab.com/iap/apple/1458862350), [reseña SensAI](https://www.sensai.fit/blog/hevy-review-2026)
- Strong: [App Store](https://apps.apple.com/app/strong/id464254577), [reseña SensAI](https://www.sensai.fit/blog/strong-app-review-2026), [IAP](https://apppricinglab.com/iap/apple/464254577)
- Fitbod, JEFIT, Boostcamp: [comparativa de precios](https://www.sensai.fit/blog/fitness-app-pricing-free-tier-comparison), [Boostcamp vs JEFIT](https://www.boostcamp.app/vs/jefit), [Boostcamp Pro](https://boostcamp.app/pro)
- Entrenadores: [Everfit vs Trainerize vs TrueCoach](https://www.fitbudd.com/insights/everfit-vs-trainerize-vs-truecoach?c84a98fb_page=4), [comparativa fitpros](https://fitpros.io/pricing-comparison), [Trainer UP en pesos](https://www.comparasoftware.com.ar/trainer-up), [apps para entrenadores](https://metodo-x.com/guias/mejores-apps-para-entrenadores-personales)
- Gimnasios Argentina: [Mis Actividades](https://www.misactividades.com/), [gestión administrativa](https://www.misactividades.com/soluciones/gestion-administrativa/), [Mercado Fitness](https://mercadofitness.com/mis-actividades-presenta-su-software-para-gimnasios-en-mercado-fitness-pais/), [GymAr](https://www.comparasoftware.com/gymar), [AgendaPro](https://agendapro.com/ar/gimnasio/software-para-gimnasio)
- Precios de entrenamiento online en Argentina: [El Laburante](https://ellaburante.com/blog/personal-trainer-precios-2026)
