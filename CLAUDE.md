# FitApp: contexto para Claude

WebApp/PWA en español rioplatense para el **alumno** que registra sus entrenamientos. MVP 100 % local: un alumno por
navegador, estado en `localStorage`, sin backend. Leer antes de tocar algo:

- [PRODUCT.md](PRODUCT.md): usuario, propósito, principios y anti-referencias.
- [docs/DESIGN.md](docs/DESIGN.md): paleta Temacy, tipografía, componentes, tono.
- [docs/ROADMAP.md](docs/ROADMAP.md): qué queda fuera del MVP y en qué orden viene.
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
npm run preview   # sirve dist/ en 4200 (detener ng serve antes)
```

**Esta PC se cuelga con carga alta** (ver CLAUDE.md global). Nunca build + serve + tests a la vez; `NG_BUILD_MAX_WORKERS=2`
ya está en el entorno. Procesos largos con afinidad `0xF` y prioridad `BelowNormal`. Commitear apenas algo funciona.

## Mapa del código

| Ruta | Qué hay |
| --- | --- |
| `src/app/core/models.ts` | Contratos de dominio (también serán los DTO de la futura API). |
| `src/app/core/seed.ts` | 16 ejercicios y 4 plantillas. Cargas en 0: nunca inventar pesos ni historial. |
| `src/app/core/workout-utils.ts` | Funciones puras: fechas locales, volumen, validación estricta, serialización. |
| `src/app/core/workout-store.ts` | Store con signals; toda mutación valida, persiste y deja `actionError`/`storageError`. |
| `src/app/app.component.{ts,html}` | Shell, navegación por hash (`#home`, `#routines`, …) y vistas del alumno. |
| `src/app/features/` | `routine-editor` (claro) y `exercise-detail` (oscuro, pestañas accesibles). |
| `src/styles.css` | Tokens Temacy, `@font-face` Inter local y estilos globales del shell. |
| `tests/store.test.ts` | Dominio, validación de importación, persistencia y store. |

## Reglas del proyecto

- **Datos reales o nada.** Sin entrenamientos, pesos, logros ni gráficos de ejemplo. Estados vacíos honestos.
- **Fechas locales** `YYYY-MM-DD` con `localDate`/`parseLocalDate`; nunca `toISOString().slice(0,10)`.
- **Validar todo lo que entra** (formularios e importación JSON) con las funciones de `workout-utils.ts`; reconstruir
  objetos campo por campo, nunca asignar el objeto importado.
- **Cambios de esquema** en `FitAppState`: subir `version`, escribir migración desde la anterior y test de ida y vuelta.
  Hoy `STORAGE_KEY = 'fitapp-state-v1'`; romperlo borra los datos del alumno.
- **Zoneless:** el estado que se ve en pantalla y cambia fuera de un evento de template (timers, `await`) va en `signal`.
- **Paleta Temacy:** bosque `#142118`, deep `#0E1811`, musgo `#2C4A2E`, lima `#C8F24C`, hueso `#F7F5EE`,
  muted `#A9B3A8` (sólo sobre oscuro), panel `#1B2A1F`. Botón principal lima con texto bosque. Sin otros acentos.
- **Accesibilidad:** objetivos táctiles ≥ 44 px, foco visible, etiquetas en todos los campos, estados no sólo por color,
  `prefers-reduced-motion`.
- **Copy** en rioplatense con voseo y acciones concretas ("Guardá", "Agregá una serie"). Sin promesas de resultados.
- **Licencias:** no descargar ni incrustar GIF/animaciones de Gym Visual u otros sin licencia. Registrar todo recurso
  nuevo en `docs/ASSETS.md`.
- Fuera de alcance del MVP (no simular como si existiera): cuentas, backend, pagos, IA, portal de entrenador.

## Agentes del proyecto (`.claude/agents/`)

| Agente | Modelo | Cuándo |
| --- | --- | --- |
| `angular-dev` | opus | Implementar vistas, componentes o lógica del store. |
| `store-guardian` | opus | Revisar cambios en modelos, validación, persistencia o importación. |
| `ui-reviewer` | opus | Revisión adversarial de UI: Temacy, accesibilidad, móvil, copy. |
| `test-runner` | sonnet | Correr `npm test` y/o `npm run build` de a uno y reportar. |
| `copy-es` | sonnet | Textos de interfaz e instrucciones de ejercicios en rioplatense. |
| `api-architect` | opus | Diseñar la fase NestJS + MySQL del roadmap (sin implementar sin pedido). |

Un agente por vez (la PC se cuelga con carga).
