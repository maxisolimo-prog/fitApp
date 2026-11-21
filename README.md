# FitApp

WebApp responsive en español, centrada en el alumno. Angular 21, Tailwind CSS 4 y PWA. Identidad visual basada en los colores verificados de temacy.ar.

## Ejecutar

Requiere Node.js 20.19+, 22.12+ o 24. En esta computadora ya está instalado Node 24 en `C:\Users\Usuario\AppData\Roaming\nvm\v24.22.2`; el `node` global predeterminado es 14 y no sirve para Angular 21.

```powershell
$env:PATH = 'C:\Users\Usuario\AppData\Roaming\nvm\v24.22.2;' + $env:PATH
npm ci
npm start
```

Abrir http://localhost:4200. Para verificar la PWA con un build de producción:

```powershell
npm run build
npm run preview
```

Los dos servidores usan el puerto 4200: detener uno antes de iniciar el otro. El service worker se activa en producción bajo HTTPS o localhost. La posibilidad de instalar depende del navegador. Las fotos y la interfaz se almacenan para uso sin conexión tras la primera carga; los enlaces de demostraciones externas requieren conexión.

## Funciones implementadas

- Cuatro plantillas iniciales y 48 ejercicios en 9 grupos musculares, con indicaciones en español (a validar con un profesional).
- Crear, personalizar y eliminar rutinas propias.
- Calendario semanal con una rutina por fecha.
- Sesión activa con registro por repeticiones o tiempo, carga, descanso, recuperación tras recargar y vista opcional de un ejercicio a la vez.
- Programa de sesiones en orden, con avance al guardar, pausa y reanudación, independiente del calendario.
- Favoritos, reemplazos y mapa muscular semanal.
- Historial y estadísticas calculadas a partir de series marcadas como completas.
- Fichas de ejercicios con Resumen, Historial y Cómo hacerlo.
- Registro de peso corporal y objetivo semanal.
- Perfil local, exportación e importación JSON con validación.
- Estado de almacenamiento visible y manejo de datos corruptos.

No hay entrenamientos ni pesos personales inventados. Las cargas iniciales son cero para que el usuario introduzca las reales. El volumen representa suma de carga externa × repeticiones; ejercicios con carga cero aportan cero kg. La duración mide tiempo transcurrido desde el inicio hasta el cierre, incluso si se abandona temporalmente la pestaña.

## Alcance de esta versión

La app funciona sin cuenta, con los datos en el navegador. Desde Perfil se puede crear una cuenta (email y contraseña) para guardar los datos en el servidor y usarlos en otros dispositivos: ver `docs/API.md` para la API Express + MySQL. No incluye Google Login, recuperación de contraseña, cobros ni portales de entrenador o administrador. El coach opcional usa Gemini, con cuenta y límites, cuando se configura en el servidor; ver `docs/COACH-IA.md`. Sin cuenta, borrar los datos del navegador los elimina: se puede descargar una copia desde Perfil.

Los 48 ejercicios tienen demostraciones originales locales y poster; 47 ofrecen GIF descargable. Se pueden ver en Biblioteca, rutinas, sesión y `/exercise-demos/index.html`. Son bucles de poses ilustradas, con revisión técnica profesional pendiente. Fuentes y prompts en `docs/ASSETS.md`.

## Estructura

- `src/app/core`: modelos, catálogo, validación y almacenamiento.
- `src/app/features`: editor de rutinas y ficha de ejercicio.
- `src/app/app.component.*`: navegación y flujos del alumno.
- `public`: imágenes, iconos y manifiesto PWA.
- `tests/store.test.ts`: persistencia, validación, calendario y cómputos.
- `docs`: identidad, fuentes y roadmap.

## Comprobación

```powershell
npm test
npm run build
```

Referencia de compatibilidad: https://angular.dev/reference/versions . Service worker: https://angular.dev/ecosystem/service-workers/getting-started .


GitHub Actions verifica cada push a main/master y los pull requests: pruebas de app, tipos de API, pruebas contra MariaDB descartable y build. No requiere claves de Gemini ni credenciales de producción. Plan de revisión y mejoras: `docs/PLAN-2026-11-21.md`.
