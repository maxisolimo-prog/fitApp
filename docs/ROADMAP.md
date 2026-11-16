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

## Próximos incrementos

1. Incorporar archivos de animaciones anatómicas con licencia de uso comercial. Validar su correspondencia con ejercicios y técnica con un profesional. **Requiere comprar la licencia.**
2. Recuperación de contraseña por email (requiere un servicio de envío de correo) y Google Login (requiere un client ID de Google Cloud).
3. Despliegue: hosting de la API y la base (AWS u otro), HTTPS con `COOKIE_SECURE=true`, copias de seguridad de la base. Hoy corre en esta PC.
4. Sincronización por entidad en lugar de foto completa, si los historiales crecen o se usa en varios dispositivos a la vez.
5. Portal de entrenador según requisitos confirmados, no mediante un selector de roles sin autorización.
6. Suscripciones y pagos solamente tras validar producto y precio. IA y ajustes automáticos después de definir límites y supervisión.

El MVP no envía mensajes, no contrata servicios y no procesa pagos. Tampoco inventa recomendaciones personalizadas a partir del perfil.
