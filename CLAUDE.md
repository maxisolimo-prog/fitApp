# FitApp: contexto para Claude

WebApp/PWA en español rioplatense para el **alumno** que registra sus entrenamientos. MVP 100 % local: un alumno por
navegador con `localStorage`, y cuenta opcional que sincroniza con la API Express + MySQL de `api/`. Leer antes de tocar algo:

- [PRODUCT.md](PRODUCT.md): usuario, propósito, principios y anti-referencias.
- [docs/DESIGN.md](docs/DESIGN.md): paleta Temacy, tipografía, componentes, tono.
- [docs/ROADMAP.md](docs/ROADMAP.md): qué queda fuera del MVP y en qué orden viene.
- [docs/BACKLOG.md](docs/BACKLOG.md): ítems concretos (`B-nn`) con esfuerzo, dependencias y decisiones abiertas.
- [docs/ASSETS.md](docs/ASSETS.md): fuentes y licencias de cada imagen, fuente y referencia.

## Stack

Angular 21 (standalone, signals, **zoneless**: no hay zone.js), Tailwind CSS 4 vía PostCSS, `@angular/service-worker`,
TypeScript 5.9 estricto con `strictTemplates`. Tests con `node:test` + `tsx` (sin Karma ni Vitest).

## Comandos

Node global es 14 y no sirve. Anteponer Node 24 en cada comando:

```powershell
$env:PATH = 'C:\Users\Usuario\AppData\Roaming\nvm\v24.22.2;' + $env:PATH
npm test          # tests de dominio y store (rápido)
npm run build     # build de producción con service worker (pesado)
npm start         # ng serve en 127.0.0.1:4200
npm run preview   # sirve dist/ y hace proxy de /api (PORT=4201 si 4200 está ocupado)
cd api; npm start # API Express en 127.0.0.1:3401 (MariaDB de XAMPP, config en api/.env)
cd api; npm test  # tests de la API contra fitapp_test (la vacía entera)
```

En esta PC el puerto 4200 suele estar ocupado por otro proyecto: usar 4201 y no matar ese servidor. Detalle de la
API, endpoints y decisiones en [docs/API.md](docs/API.md).

**Esta PC se cuelga con carga alta** (ver CLAUDE.md global). Nunca build + serve + tests a la vez; `NG_BUILD_MAX_WORKERS=2`
ya está en el entorno. Procesos largos con afinidad `0xF` y prioridad `BelowNormal`. Commitear apenas algo funciona.

## Mapa del código

| Ruta | Qué hay |
| --- | --- |
| `src/app/core/models.ts` | Contratos de dominio, compartidos con la API. |
| `src/app/core/sync.service.ts` | Cuenta opcional y sincronización por revisión (conflicto → el alumno elige). |
| `api/src/` | Express: `app.ts` rutas, `auth.ts` scrypt/sesiones/límites, `state-repo.ts` SQL ↔ `FitAppState`. |
| `api/migrations/` | SQL versionado; nunca editar uno aplicado, agregar `00N_*.sql`. |
| `src/app/core/seed.ts` | 43 ejercicios y 4 plantillas. Cargas en 0: nunca inventar pesos ni historial. |
| `src/app/core/workout-utils.ts` | Funciones puras: fechas locales, volumen, validación estricta, serialización. |
| `src/app/core/workout-store.ts` | Store con signals; toda mutación valida, persiste y deja `actionError`/`storageError`. |
| `src/app/app.component.{ts,html}` | Shell, navegación por hash (`#home`, `#routines`, …) y vistas del alumno. |
| `src/app/features/` | `routine-editor` (claro) y `exercise-detail` (oscuro, pestañas accesibles). |
| `src/app/brands/` | Una marca por archivo (`fitapp`, `qivox`, `fitnessgroup`): tokens, nombre, logo y funciones. `index.ts` resuelve y aplica la marca al arrancar. |
| `src/styles.css` | Tokens por rol (valores por defecto: Temacy), `@font-face` locales y estilos globales del shell. |
| `tests/` | Dominio, validación, store, sincronización (con API simulada) y marcas (contraste, elección, sin colores sueltos). |

## Reglas del proyecto

- **Datos reales o nada.** Sin entrenamientos, pesos, logros ni gráficos de ejemplo. Estados vacíos honestos.
- **Fechas locales** `YYYY-MM-DD` con `localDate`/`parseLocalDate`; nunca `toISOString().slice(0,10)`.
- **Validar todo lo que entra** (formularios e importación JSON) con las funciones de `workout-utils.ts`; reconstruir
  objetos campo por campo, nunca asignar el objeto importado.
- **Cambios de esquema** en `FitAppState`: subir `version`, escribir migración desde la anterior y test de ida y vuelta.
  Hoy `STORAGE_KEY = 'fitapp-state-v1'`; romperlo borra los datos del alumno.
- **Zoneless:** el estado que se ve en pantalla y cambia fuera de un evento de template (timers, `await`) va en `signal`.
- **Un solo código, tres marcas** (FitApp, Qivox, Fitness Group; ver "Marcas" en `docs/DESIGN.md`). Colores,
  tipografía y radios solo con los tokens por rol de `src/styles.css` (`--dark`, `--accent`, `--on-accent`, `--bg`,
  `--strong`, …): nunca un color escrito a mano ni un "si la marca es X" en pantallas o lógica. Lo que una marca
  tiene o no tiene va en `brand.features`. Para verlas: `/?marca=qivox`, `/?marca=fitnessgroup`, `/?marca=fitapp`.
- **Paleta Temacy** (marca por defecto): bosque `#142118`, deep `#0E1811`, musgo `#2C4A2E`, lima `#C8F24C`, hueso
  `#F7F5EE`, muted `#A9B3A8` (sólo sobre oscuro), panel `#1B2A1F`. Botón principal de acento con texto oscuro. Sin
  otros acentos dentro de una misma marca.
- **Accesibilidad:** objetivos táctiles ≥ 44 px, foco visible, etiquetas en todos los campos, estados no sólo por color,
  `prefers-reduced-motion`.
- **Copy** en rioplatense con voseo y acciones concretas ("Guardá", "Agregá una serie"). Sin promesas de resultados.
- **Licencias:** no descargar ni incrustar GIF/animaciones de Gym Visual u otros sin licencia. Registrar todo recurso
  nuevo en `docs/ASSETS.md`. Única excepción, decidida por el usuario: los logos de Qivox y Fitness Group en
  `public/brand-logos/`, tomados de sus webs para mostrar sus versiones; no publicarlas sin el acuerdo de cada gimnasio.
- Fuera de alcance (no simular como si existiera): Google Login, recuperación de contraseña, pagos, IA, portal de entrenador.

## Agentes del proyecto (`.claude/agents/`)

| Agente | Modelo | Cuándo |
| --- | --- | --- |
| `angular-dev` | opus | Implementar vistas, componentes o lógica del store. |
| `store-guardian` | opus | Revisar cambios en modelos, validación, persistencia o importación. |
| `ui-reviewer` | opus | Revisión adversarial de UI: Temacy, accesibilidad, móvil, copy. |
| `test-runner` | sonnet | Correr `npm test` y/o `npm run build` de a uno y reportar. |
| `copy-es` | sonnet | Textos de interfaz e instrucciones de ejercicios en rioplatense. |
| `api-architect` | opus | Diseñar cambios grandes de la API o del esquema (sin implementar sin pedido). |

Un agente por vez (la PC se cuelga con carga).
