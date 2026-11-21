# Exportación de demostraciones

Los GIF y WebM finales están en `public/exercise-demos/`. Los prompts y la procedencia están en `docs/exercise-demo-prompts.json` (primeros seis) y `docs/exercise-demo-prompts-completion.json` (41 restantes). El press de banca anterior tiene su origen documentado en `docs/ASSETS.md`.

Para volver a exportar una secuencia se necesita la lámina PNG original. En esta estación se conservaron copias en `.cache/exercise-demo-sources/`; esa carpeta no se versiona. Copiar la entrada de procedencia a un manifiesto local con forma `{ "entries": [...] }` y cambiar `source` por la ruta completa al PNG disponible. Los campos `columns`, `rows`, `crop`, `cycle` y `delays` determinan el recorte y el orden de cuadros. No usar imágenes de terceros sin autorización.

Desde la raíz del proyecto, en Windows con PowerShell, Node y FFmpeg:

```powershell
powershell -File scripts/media/export-sprites.ps1 -ManifestPath .cache/mi-manifiesto.json
$env:FFMPEG_PATH = 'C:\ruta\ffmpeg.exe'
node scripts/media/encode-sprites.mjs .cache/mi-manifiesto.json .cache/procedencia-exportada.json
```

El primer paso separa las poses y exporta el poster y un GIF provisional; el segundo fija las demoras, agrega el bucle indefinido y codifica el WebM. Deben ejecutarse en ese orden. `FFMPEG_PATH` es opcional si está disponible FFmpeg 1011 de Playwright en `%LOCALAPPDATA%`. Revisar visualmente la secuencia y su correspondencia con el ejercicio antes de actualizar `src/app/core/exercise-media.ts` y `public/exercise-demos/catalog.json`.

Las pruebas `npm.cmd test` validan catálogo, archivos y estructura de los GIF. La reproducción y el encuadre se verifican también en la ficha y en `/exercise-demos/index.html`; estas comprobaciones no reemplazan B-30, revisión profesional.
