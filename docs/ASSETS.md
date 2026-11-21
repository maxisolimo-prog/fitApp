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

## Fuentes de las marcas

Solo las usa la marca Fitness Group (`src/app/brands/fitnessgroup.ts`). Están en `public/brand-fonts/`, sin modificaciones, subconjunto latino, descargadas del CDN oficial de Google Fonts el 18 de noviembre de 2026. El service worker no las precarga.

| Archivo | Familia | Tamaño | Descarga | Licencia |
| --- | --- | --- | --- | --- |
| `anton-latin.woff2` | Anton, peso 400 | 18.612 bytes | https://fonts.gstatic.com/s/anton/v27/1Ptgg87LROyAm3Kz-C8.woff2 | SIL OFL 1.1, `OFL-Anton.txt` |
| `manrope-latin-variable.woff2` | Manrope variable, pesos 200 a 800 | 24.532 bytes | https://fonts.gstatic.com/s/manrope/v23/xn7gYHE41ni1AdIRggexSg.woff2 | SIL OFL 1.1, `OFL-Manrope.txt` |

Los textos de licencia vienen del repositorio [google/fonts](https://github.com/google/fonts) (`ofl/anton/OFL.txt` y `ofl/manrope/OFL.txt`).

## Referencias de las marcas Qivox y Fitness Group

De [qivox.com.ar](https://qivox.com.ar/) y [fitnessgroup.ar](https://fitnessgroup.ar/) se leyeron, el 18 de noviembre de 2026, los valores de color, los nombres de las tipografías y los radios declarados en sus hojas de estilo públicas; están en `docs/DESIGN.md` ("Marcas"). No se incorporaron fotografías ni fuentes de esos sitios. Graphik, la tipografía de títulos de Qivox, es comercial y no está en FitApp.

## Logos de Qivox y Fitness Group

Incorporados el 18 de noviembre de 2026 por pedido del usuario, para mostrar la versión de cada gimnasio. Son marcas de sus dueños, descargadas de sus webs públicas. **No hay licencia ni autorización registrada:** sirven para la demostración; publicar cualquiera de las dos versiones requiere el acuerdo del gimnasio. Es una excepción decidida por el usuario a la regla de no incorporar recursos sin licencia. Están en `public/brand-logos/` y el service worker los baja solo para la marca que los usa.

| Archivo | Contenido | Tamaño | Origen | Cambios |
| --- | --- | --- | --- | --- |
| `qivox-logo.png` | Logotipo "QIVOX Smart Gym" amarillo, fondo transparente | 374 × 120, 16.531 bytes | https://qivox.com.ar/wp-content/themes/astra-child/assets/img/logo-qivox.png (900 × 289) | Reducido |
| `qivox-icon-192.png` | Ícono "Q" amarillo | 192 × 192, 5.105 bytes | https://qivox.com.ar/wp-content/uploads/2026/08/cropped-full-elements-QIVOX-46-2-192x192.png | Ninguno |
| `qivox-icon-512.png` | Ícono "Q" amarillo | 512 × 512, 14.090 bytes | https://qivox.com.ar/wp-content/uploads/2026/08/cropped-full-elements-QIVOX-46-2.png | Ninguno |
| `fitnessgroup-icon-192.png` | Insignia "Fitness Group" gris y amarilla | 192 × 192, 21.642 bytes | https://fitnessgroup.ar/wp-content/uploads/2025/08/logo-png.png (1080 × 1080) | Margen transparente recortado, centrado y reducido |
| `fitnessgroup-icon-512.png` | La misma insignia | 512 × 512, 69.682 bytes | El mismo archivo | Los mismos |

El dibujo de los logos no se modificó: solo tamaño y margen. Los usan la barra de la app, el ícono de la pestaña y los `manifest` de cada marca (`public/manifest.qivox.webmanifest`, `public/manifest.fitnessgroup.webmanifest`).

## Referencias audiovisuales investigadas

`public/data/exercise-videos.json` registra los identificadores de videos publicados por Muscle & Strength y enlazados desde su propia biblioteca. Son referencias de la investigación inicial: el usuario luego precisó que busca animaciones anatómicas con músculos resaltados, como en Strong, y no videos de personas. Estos videos no constituyen los recursos visuales elegidos para la biblioteca. No se descargaron ni modificaron. Su reproducción externa requiere conexión y depende del editor y de YouTube.

| Ejercicio | Fuente del editor | Video oficial |
| --- | --- | --- |
| Press de banca | [Barbell Bench Press](https://www.muscleandstrength.com/exercises/barbell-bench-press.html) | [YouTube](https://www.youtube.com/watch?v=tuwHzzPdaGc) |
| Sentadilla goblet | [Dumbbell Goblet Squat](https://www.muscleandstrength.com/exercises/dumbbell-goblet-squat) | [YouTube](https://www.youtube.com/watch?v=5Y3KW5rWMh4) |

Verificación realizada el 16 de noviembre de 2026: el oEmbed público de YouTube devolvió HTTP 200 y atribución a Muscle & Strength para ambos videos. Los metadatos públicos del reproductor indicaron una duración de 50 segundos para press de banca y 43 segundos para sentadilla goblet, ambos con `playableInEmbed: true`. Esto confirma la disponibilidad declarada en esa fecha; la reproducción real también debe verificarse en el navegador de destino.

## Mapa muscular

`src/app/features/muscle-map.data.ts` contiene los trazos SVG del cuerpo, de frente y de espalda, tomados de [react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter) versión 3.2.0 (commit `8ed39ac`), archivos `assets/bodyFront.ts`, `assets/bodyBack.ts` y el contorno de `components/SvgMaleWrapper.tsx`. Licencia MIT, Copyright (c) 2022 ELABBASSI Hicham. Incorporado el 18 de noviembre de 2026.

- Se copiaron los trazos, no la dependencia (es para React Native). No se usan los colores de la biblioteca ni la figura femenina.
- Cambios: los lados izquierdo y derecho de cada parte se unieron en un solo trazo. El dibujo no se modificó.
- El archivo es generado: no se edita a mano. Lleva el texto de la licencia en su encabezado.
- El aviso de copyright y el texto de la licencia viajan con la app en `public/licenses/react-native-body-highlighter-MIT.txt`.

Los músculos de cada ejercicio (`primaryMuscles`, `secondaryMuscles` en `seed.ts`) son una clasificación propia. Se cruzó con [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (dominio público) para detectar errores; no se copiaron sus datos, sus textos ni sus fotos.

## Capturas de la competencia

`docs/competencia/fitness-online-0*.jpeg` son siete capturas de la app Fitness Online aportadas por el usuario el 17 de noviembre de 2026. Son referencia interna para `docs/COMPETENCIA.md`: están fuera de `public/`, la app no las sirve, y ni las capturas ni las imágenes que contienen se usan o recortan como recursos de FitApp.

## Fuentes evaluadas para imágenes de ejercicios

El usuario eligió crear imágenes originales con GPT el 17 de noviembre de 2026. Las alternativas evaluadas están en la tabla "Fuentes de imágenes evaluadas" de `docs/BACKLOG.md`. Registrar acá cada archivo y su origen: para las imágenes generadas, modelo, fecha y prompt. Para las de terceros, incluir la atribución que exige la licencia.

Las animaciones anatómicas de referencia están en [Press de banca de Gym Visual](https://gymvisual.com/animated-gifs/1519-barbell-bench-press.html) y [Remo con mancuerna y apoyo de Gym Visual](https://gymvisual.com/animated-gifs/2683-dumbbell-one-arm-row-rack-support.html). No se descargaron ni incorporaron: para distribuirlas dentro de FitApp hace falta obtener la licencia correspondiente. Ver [condiciones del proveedor](https://gymvisual.com/content/3-terms-and-conditions-of-use). La disponibilidad pública de las muestras no se trata como autorización de uso en producción.

## Demostración original de press de banca

| Archivo | Uso | Tamaño |
| --- | --- | --- |
| `public/exercise-demos/bench-press.webm` | Una repetición sin audio, 3 segundos, 704 × 504 | 68.636 bytes |
| `public/exercise-demos/bench-press.webp` | Fotograma inicial y alternativa si falla el video | 20.434 bytes |

Se generó una ilustración original de cuatro poses con ImageGen integrado en Codex, el 20 de noviembre de 2026. Las poses se montaron en un bucle de descenso y subida.

## Seis demostraciones priorizadas por el usuario

Generadas el 20 de noviembre de 2026 con ImageGen integrado en Codex, siguiendo la selección de la captura de Fitness Online y el estilo anatómico aprobado. Cada ejercicio tiene un GIF animado, un video WebM y un fotograma JPEG de 512 × 512 en `public/exercise-demos/`. La galería `/exercise-demos/` permite revisarlos y descargarlos, individualmente o en ZIP.

| Ejercicio | Nombre de archivo | Duración | Poses originales |
| --- | --- | --- | --- |
| Cinta de correr, caminata | `treadmill` | 1,8 s | 6 |
| Press inclinado con mancuernas a 45° | `incline-press` | 3,6 s | 6 |
| Jalón al pecho con agarre cerrado | `close-grip-lat-pulldown` | 3,6 s | 6 |
| Aperturas de pecho sentado en poleas | `seated-cable-fly` | 3,6 s | 6 |
| Fondos de tríceps en paralelas | `parallel-bar-dip` | 3,6 s | 6 |
| Escaladora | `stair-climber` | 1,8 s | 4 |

Los bucles de fuerza reproducen las poses de ida y vuelta. Los de caminata y escaladora recorren un ciclo alternado. Se verificaron los fotogramas, las demoras y la repetición indefinida al decodificar los GIF. La revisión técnica profesional sigue pendiente.

Se interpretó «vuelo sentado con polea» como aperturas de pecho sentado, y la cinta muestra caminata. Los seis se incorporaron al catálogo y a sus fichas en Biblioteca, rutinas y sesión. Se agregaron cinco variantes exactas (48 ejercicios en total). Los posters se usan en las listas. La galería sigue disponible como vista de revisión y descarga; la navegación principal ya no depende de ella.

Los prompts completos, la corrección del press inclinado y los identificadores de los originales generados están en [exercise-demo-prompts.json](exercise-demo-prompts.json).

## Catálogo completo: las 41 demostraciones restantes

Se completaron el 20 de noviembre de 2026 con ImageGen integrado en Codex. Cada ejercicio tiene su propia secuencia original de seis poses, poster JPEG, GIF animado y video WebM de 512 × 512. Los bucles nuevos duran 3,6 segundos: diez cuadros al recorrer seis poses de ida y vuelta, o seis cuadros cuando la lámina ya contiene el ciclo completo. El video repite esas poses a 20 fps; no agrega movimiento intermedio ni constituye un render 3D continuo.

Los identificadores de archivos, nombres de ejercicios, prompts íntegros, originales y correcciones están en [exercise-demo-prompts-completion.json](exercise-demo-prompts-completion.json). Las correcciones incluyeron el recorrido del press de hombros, jalón por delante de la cabeza, banco plano en aperturas y extremidades/encuadre en dead bug. Cada secuencia se revisó visualmente; la revisión técnica profesional sigue abierta en B-30.

Resultado total: **48 videos y posters, 47 GIF**. El press de banca original conserva WebM y WebP. Los archivos están en `public/exercise-demos/`; la galería `index.html` muestra los 48 y `catalogo-gif.zip` reúne los 47 GIF. El ZIP anterior de seis ejercicios se conserva. Ningún recurso se extrajo de capturas de la competencia.

El mapa de integración es `src/app/core/exercise-media.ts` y el índice descargable es `public/exercise-demos/catalog.json`. Las fichas de Biblioteca, rutinas y sesión usan el mismo mapa. Los scripts de exportación y sus instrucciones están en [scripts/media](../scripts/media/README.md). Las pruebas de medios comprueban correspondencia con el catálogo, existencia de archivos, múltiples cuadros, demoras y repetición indefinida.

## Prompt original de press de banca

> Use case: scientific-educational. Create an ORIGINAL raster sprite sheet for FitApp demonstrating the flat barbell bench press with realistic human anatomy, in the visual language of a contemporary physical-training anatomy atlas. Single landscape image divided into exactly 4 equal rectangular frames, a precise 2-by-2 grid. Background perfectly uniform pure white across the whole image, NO borders, NO dividers, NO text, NO arrows, NO logos. Each quadrant contains one individual isolated frame of the SAME complete scene at the SAME zoom and exact fixed camera. Each illustration centered within its quadrant with 8% whitespace margins so no subject enters another quadrant. Adult anatomically accurate graphite-and-silver athletic human figure, face understated, wearing opaque charcoal athletic shorts and dark trainers, with carefully modeled distinct muscle shapes, subtle fibers and soft shading. Both pectorals highlighted with muted terracotta red, deltoids and triceps subtly outlined in muted rose. Flat black padded bench, simple gray steel bench supports, a single straight level steel Olympic bar with two charcoal plates (one at each end). Use a fixed three-quarters side view, slightly elevated, head on the left and feet on the right. Entire figure, both plates and bench in view in each quadrant. Head, upper back and hips stay supported on the same bench. Knees naturally bent, both shoes visibly planted flat on the floor. Both hands grasp horizontally on that same single bar just outside shoulder width. No rack uprights blocking the figure and no additional objects. The only things that change between quadrants are the bar's position and the arm positions required to hold it: TOP LEFT at the top of the repetition, arms almost fully extended above the chest; TOP RIGHT bar lowered roughly one-third of the way, elbow flexion visible; BOTTOM LEFT bar lowered two-thirds of the way, elbows noticeably below the bar; BOTTOM RIGHT bar hovering just above lower chest, elbows flexed naturally around 90 degrees, wrists stacked above elbows. Maintain exact anatomical proportions and image registration so frames remain stationary when played in succession. Aim for a sophisticated, proportionally realistic clinical illustration, neither robotics nor a low-poly mannequin. Independently composed original asset for a workout app.
