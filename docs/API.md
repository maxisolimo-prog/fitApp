# API de FitApp

Express 5 + MySQL/MariaDB, en `api/`. Corre en `127.0.0.1:3401` y el front la llama por el mismo origen bajo
`/api` (proxy de `ng serve` con `proxy.conf.json`, y de `scripts/preview.mjs` en el preview y por ngrok).

## Puesta en marcha

```powershell
$env:PATH = 'C:\Users\Usuario\AppData\Roaming\nvm\v24.22.2;' + $env:PATH
cd api
copy .env.example .env   # completar DB_PASSWORD
npm ci
npm run migrate          # también corre solo al iniciar
npm start                # http://127.0.0.1:3401/api/health
npm test                 # usa DB_NAME_TEST y la borra entera antes de empezar
npm run typecheck
```

En esta PC la base es la MariaDB 10.4 de XAMPP, con bases `fitapp` y `fitapp_test` y usuario `fitapp`@`localhost`
(contraseña en `api/.env`, que no se versiona).

## Endpoints

Escrituras sólo con `Content-Type: application/json` (si no, 415): junto con `SameSite=Lax` evita CSRF.

| Método | Ruta | Cuerpo | Respuesta |
| --- | --- | --- | --- |
| GET | `/api/health` | | `{ ok: true }` |
| POST | `/api/auth/register` | `{ email, password }` (≥ 10 caracteres) | 201 `{ email, revision: 0 }` + cookie · 409 email existente |
| POST | `/api/auth/login` | `{ email, password }` | 200 `{ email, revision }` + cookie · 401 |
| POST | `/api/auth/logout` | `{}` | 204 |
| GET | `/api/auth/me` | | `{ email, revision }` · 401 |
| GET | `/api/state` | | `{ revision, state }`; `state: null` si la cuenta no tiene datos |
| PUT | `/api/state` | `{ baseRevision, state }` | 200 `{ revision }` · 409 `{ revision, state }` · 422 inválido |
| DELETE | `/api/account` | `{ password }` | 204 · 401 |

`state` es exactamente `FitAppState` en su versión actual (hoy la 4, `src/app/core/workout-utils.ts`), validado con
`validateState`, que también acepta las versiones anteriores y las actualiza. La versión 4 (migración 005) suma a
cada serie la hora en que se completó y un comentario opcional.

Al subir la versión hay que reiniciar la API: la que sigue corriendo con el código anterior responde 422 a los
datos nuevos. Conviene publicar primero el front y reiniciar la API después: en el medio, lo peor que pasa es ese
422, sin pérdida, y los cambios se envían cuando la API vuelve.

Una app que todavía no se actualizó manda el estado en una versión anterior. La API lo rechaza con 422 y el
mensaje "Actualizá la app": esa app no puede leer los datos de la versión actual, así que tampoco puede pisarlos.

## Decisiones

- **Sesiones opacas**, no JWT: token aleatorio de 32 bytes en cookie `fitapp_session` (httpOnly, `SameSite=Lax`,
  `Path=/api`, 30 días); en la base sólo se guarda su SHA-256. Cerrar sesión la invalida de verdad.
- **Contraseñas** con `crypto.scrypt` (N=16384, r=8, p=1, sal de 16 bytes); los parámetros quedan en el hash para
  poder subirlos. Un email inexistente cuesta lo mismo que una contraseña errónea.
- **Límites**: login 10 intentos por email+IP y 50 por IP cada 15 min; registro 5 por IP por hora; `PUT /api/state`
  120 por usuario cada 10 min; borrar cuenta 5 por usuario cada 15 min. Cuerpos de 16 KB salvo `/api/state` (6 MB,
  coherente con el límite de 5 MB de las copias del front). En memoria, con tope de claves (un
  solo proceso). `trust proxy` sólo para loopback (preview/ngrok).
- **Sincronización por foto completa**: `PUT /api/state` reemplaza los datos del usuario en una transacción con
  `SELECT … FOR UPDATE` sobre su fila, sólo si `baseRevision` coincide. Simple y suficiente para un alumno con
  pocos dispositivos; si crece, pasar a cambios por entidad.
- **Ids exactos**: los ids generados por el cliente son `VARBINARY` (mayúsculas, acentos y espacios cuentan, como en
  el front); el email es `utf8mb4_bin` y se guarda en minúsculas. `sql_mode` estricto en cada conexión.
- **Front**: datos y metadatos de sincronización viven en una sola entrada de `localStorage`; cerrar sesión envía lo
  pendiente y limpia el dispositivo.
- **Catálogo de ejercicios** en código (`seed.ts`), no en tabla: los `exercise_id` se validan contra él.
- **Fechas**: `DATE` para calendario y peso (sin zona horaria, `dateStrings`), `DATETIME(3)` en UTC para sesiones.

## Pendiente para producción

`COOKIE_SECURE=true` bajo HTTPS, usuario de base con permisos mínimos, copias de seguridad, límites compartidos
si hay más de un proceso, recuperación de contraseña y registro de errores.
