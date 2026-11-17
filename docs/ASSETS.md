# Recursos visuales de FitApp

Las fotografías están descargadas en `public/images` y se sirven localmente. No requieren peticiones de terceros durante el uso de la app. Las variantes JPEG fueron solicitadas al CDN de Unsplash con recorte y compresión; se revisaron visualmente después de la descarga.

| Archivo | Contenido | Tamaño | Fuente |
| --- | --- | --- | --- |
| `gym-hero.jpg` | Mancuernas y espacio de entrenamiento | 1400 × 820, 191.091 bytes | [Fotografía de gimnasio, Danielle Cerullo](https://unsplash.com/photos/CQfNt66ttZM) |
| `strength.jpg` | Manos tomando mancuernas | 640 × 440, 37.899 bytes | [Ambitious Studio* / Rick Barrett](https://unsplash.com/photos/a-man-is-doing-exercises-with-dumbs-in-a-gym-t9bG_FOXqMA) |
| `mobility.jpg` | Estiramiento sentado en casa | 640 × 440, 66.386 bytes | [Surface](https://unsplash.com/photos/a-man-is-doing-yoga-in-a-living-room-tYOjcQ9NzHY) |
| `home-workout.jpg` | Ejercicio sobre una colchoneta en una sala | 640 × 440, 51.448 bytes | [Vitaly Gariev](https://unsplash.com/photos/woman-exercising-on-yoga-mat-in-living-room-funsezUxxe4) |

Fuentes de descarga exactas:

- `gym-hero.jpg`: https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1400&h=820&q=78&fm=jpg
- `strength.jpg`: https://images.unsplash.com/photo-1674834727149-00812f907676?auto=format&fit=crop&w=640&h=440&q=78&fm=jpg
- `mobility.jpg`: https://images.unsplash.com/photo-1640622332810-039ad9c96409?auto=format&fit=crop&w=640&h=440&q=78&fm=jpg
- `home-workout.jpg`: https://images.unsplash.com/photo-1758599880618-3f03f2a401b4?auto=format&fit=crop&w=640&h=440&q=78&fm=jpg

[Licencia de Unsplash](https://unsplash.com/license). Las imágenes se usan como fotografía ambiental de las rutinas, no como demostraciones técnicas de ejercicios ni como fotos de usuarios de FitApp.

## Identidad de la aplicación

`public/icons/icon.svg` es un recurso vectorial original creado para este proyecto: fondo lima `#C8F24C` y una F verde bosque `#142118`, usando los colores de Temacy indicados por el usuario y verificados en la web de producción el 16 de noviembre de 2026. Las versiones rasterizadas `icon-192.png` e `icon-512.png` usan el mismo diseño. `icon-maskable-512.png` extiende el fondo lima al cuadrado completo y conserva la marca dentro de la zona segura central para máscaras PWA.

Los iconos se generaron localmente con antialiasing y se verificó la versión de 192 píxeles.

## Fuente local

`public/fonts/inter-latin-variable.woff2` es Inter normal variable, pesos 100 a 900, subconjunto latino, sin modificaciones locales. Pesa 48.256 bytes y cubre el español de la interfaz. Se descargó del [CDN oficial de Google Fonts](https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7.woff2), mediante la [hoja de estilo de la familia](https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap). La licencia SIL Open Font License 1.1 está incluida en `public/fonts/OFL-Inter.txt`, obtenida del [repositorio oficial de Inter](https://github.com/rsms/inter/blob/master/LICENSE.txt). No se requieren conexiones al CDN para renderizar la app.

La paleta y las referencias tipográficas de Temacy están registradas en `docs/DESIGN.md`.

## Referencias audiovisuales investigadas

`public/data/exercise-videos.json` registra los identificadores de videos publicados por Muscle & Strength y enlazados desde su propia biblioteca. Son referencias de la investigación inicial: el usuario luego precisó que busca animaciones anatómicas con músculos resaltados, como en Strong, y no videos de personas. Estos videos no constituyen los recursos visuales elegidos para la biblioteca. No se descargaron ni modificaron. Su reproducción externa requiere conexión y depende del editor y de YouTube.

| Ejercicio | Fuente del editor | Video oficial |
| --- | --- | --- |
| Press de banca | [Barbell Bench Press](https://www.muscleandstrength.com/exercises/barbell-bench-press.html) | [YouTube](https://www.youtube.com/watch?v=tuwHzzPdaGc) |
| Sentadilla goblet | [Dumbbell Goblet Squat](https://www.muscleandstrength.com/exercises/dumbbell-goblet-squat) | [YouTube](https://www.youtube.com/watch?v=5Y3KW5rWMh4) |

Verificación realizada el 16 de noviembre de 2026: el oEmbed público de YouTube devolvió HTTP 200 y atribución a Muscle & Strength para ambos videos. Los metadatos públicos del reproductor indicaron una duración de 50 segundos para press de banca y 43 segundos para sentadilla goblet, ambos con `playableInEmbed: true`. Esto confirma la disponibilidad declarada en esa fecha; la reproducción real también debe verificarse en el navegador de destino.

## Capturas de la competencia

`docs/competencia/fitness-online-0*.jpeg` son siete capturas de la app Fitness Online aportadas por el usuario el 17 de noviembre de 2026. Son referencia interna para `docs/COMPETENCIA.md`: están fuera de `public/`, la app no las sirve, y ni las capturas ni las imágenes que contienen se usan o recortan como recursos de FitApp.

## Fuentes evaluadas para imágenes de ejercicios

Todavía no se incorporó ninguna. Las candidatas con licencia verificada (Everkinetic, CC BY-SA 4.0, para las ilustraciones; react-native-body-highlighter, MIT, para el mapa muscular) y las descartadas están en la tabla "Fuentes de imágenes evaluadas" de `docs/BACKLOG.md`. Al incorporarlas, registrar acá cada archivo, su origen y la atribución que exige su licencia.

Las animaciones anatómicas de referencia están en [Press de banca de Gym Visual](https://gymvisual.com/animated-gifs/1519-barbell-bench-press.html) y [Remo con mancuerna y apoyo de Gym Visual](https://gymvisual.com/animated-gifs/2683-dumbbell-one-arm-row-rack-support.html). No se descargaron ni incorporaron: para distribuirlas dentro de FitApp hace falta obtener la licencia correspondiente. Ver [condiciones del proveedor](https://gymvisual.com/content/3-terms-and-conditions-of-use). La disponibilidad pública de las muestras no se trata como autorización de uso en producción.
