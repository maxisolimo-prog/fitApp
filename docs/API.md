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

`state` es exactamente `FitAppState` v1 (`src/app/core/workout-utils.ts`), validado con `validateState`.

## Decisiones

- **Sesiones opacas**, no JWT: token aleatorio de 32 bytes en cookie `fitapp_session` (httpOnly, `SameSite=Lax`,
  `Path=/api`, 30 días); en la base sólo se guarda su SHA-256. Cerrar sesión la invalida de verdad.
- **Contraseñas** con `crypto.scrypt` (N=16384, r=8, p=1, sal de 16 bytes); los parámetros quedan en el hash para
  poder subirlos. Un email inexistente cuesta lo mismo que una contraseña errónea.
- **Límites**: login 10 intentos por email+IP y 50 por IP cada 15 min; registro 5 por IP por hora. En memoria (un
  solo proceso). `trust proxy` sólo para loopback (preview/ngrok).
- **Sincronización por foto completa**: `PUT /api/state` reemplaza los datos del usuario en una transacción con
  `SELECT … FOR UPDATE` sobre su fila, sólo si `baseRevision` coincide. Simple y suficiente para un alumno con
  pocos dispositivos; si crece, pasar a cambios por entidad.
- **Catálogo de ejercicios** en código (`seed.ts`), no en tabla: los `exercise_id` se validan contra él.
- **Fechas**: `DATE` para calendario y peso (sin zona horaria, `dateStrings`), `DATETIME(3)` en UTC para sesiones.

## Pendiente para producción

`COOKIE_SECURE=true` bajo HTTPS, usuario de base con permisos mínimos, copias de seguridad, límites compartidos
si hay más de un proceso, recuperación de contraseña y registro de errores.
