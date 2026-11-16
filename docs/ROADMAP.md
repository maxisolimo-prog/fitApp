# Alcance y continuidad

## Requisitos originales y decisiones

El documento recibido propone una WebApp responsive/PWA, Angular 21, Tailwind, API NestJS, MySQL, autenticación y despliegue en AWS. Describe rutinas, calendario, biblioteca, registro y progreso como MVP; IA adaptativa e integraciones de salud como fases posteriores. Los precios y competidores del documento son hipótesis previas, no una investigación revalidada en esta implementación.

El usuario confirmó prioridad del alumno. Después pidió demostraciones anatómicas como la captura de Strong, contenido en español y colores de temacy.ar. Estos tres requisitos guían la interfaz.

No se recibió el audio ni una transcripción del amigo. Ninguna funcionalidad se atribuye a ese audio.

## Entrega inicial

Frontend operativo con persistencia local, rutinas, calendario, sesiones, perfil y progreso. La publicación privada es una demostración del frontend; el estado permanece en el navegador. No es todavía un servicio multiusuario.

## Próximos incrementos

1. Incorporar archivos de animaciones anatómicas con licencia de uso comercial. Validar su correspondencia con ejercicios y técnica con un profesional.
2. API NestJS y esquema MySQL: usuario, ejercicio, rutina, entrada de rutina, sesión, serie, planificación y medición. Migración explícita de los datos locales a la cuenta autenticada.
3. Autenticación, recuperación de cuenta, autorización por usuario y Google Login; gestión de secretos en el servidor.
4. Sincronización con resolución de conflictos y estrategia sin conexión.
5. Portal de entrenador según requisitos confirmados, no mediante un selector de roles sin autorización.
6. Suscripciones y pagos solamente tras validar producto y precio. IA y ajustes automáticos después de definir límites y supervisión.

El MVP no envía mensajes, no contrata servicios y no procesa pagos. Tampoco inventa recomendaciones personalizadas a partir del perfil.
