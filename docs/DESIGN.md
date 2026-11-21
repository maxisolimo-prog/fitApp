# Diseño de FitApp

## Contexto del producto

WebApp responsive para el alumno que registra sus entrenamientos. El flujo prioritario es elegir una rutina, completar series con peso y repeticiones y consultar el historial. La referencia funcional y visual aportada por el usuario es la app móvil Strong, especialmente su biblioteca de ejercicios y las demostraciones anatómicas con músculos resaltados.

Escena de uso: una persona consulta el celular entre series en el gimnasio, con iluminación variable y a menudo con una sola mano. La interfaz debe ofrecer contraste claro, áreas táctiles cómodas y un registro rápido, conservando una experiencia completa en escritorio.

## Paleta de marca

Fuente: [Temacy en producción](https://temacy.ar/), verificada el 16 de noviembre de 2026. Los nombres y valores siguientes corresponden a las variables CSS observadas en el HTML de producción; la copia de trabajo usada para la verificación es `.cache/temacy.html`. No sustituir esta referencia por una plantilla ni por otra versión del sitio.

Desde el 18 de noviembre de 2026 el código no nombra los colores por la paleta sino por su rol, para que la misma pantalla sirva a más de una marca (ver "Marcas"). Esta es la paleta Temacy, la de la marca por defecto, con el token que ocupa cada color:

| Color Temacy | Valor | Token por rol | Uso en FitApp |
| --- | --- | --- | --- |
| Bosque | `#142118` | `--dark`, `--ink`, `--on-accent` | Superficies oscuras, texto principal sobre claro y texto sobre el acento |
| Deep | `#0E1811` | `--dark-deep` | Fondo oscuro de mayor profundidad (sesión en curso) |
| Panel | `#1B2A1F` | `--dark-panel` | Paneles sobre fondo oscuro |
| Musgo | `#2C4A2E` | `--strong`, `--dark-strong` | Íconos, avance y días hechos sobre claro; barra de descanso y serie hecha sobre oscuro |
| Lima | `#C8F24C` | `--accent` | Acción principal, selección y foco de marca |
| Hueso | `#F7F5EE` | `--bg`, `--on-dark` | Fondo claro y texto principal sobre oscuro |
| Muted | `#A9B3A8` | `--muted-on-dark` | Texto secundario sobre superficies oscuras |

La lista completa de tokens, con sus derivados (`--ink-2`, `--line`, `--bg-tint`, etc.), está en el bloque `:root` de `src/styles.css`.

Usar texto `--on-accent` sobre los botones de acento. El tono `--muted-on-dark` no debe usarse como texto pequeño sobre claro: está destinado a fondos oscuros. Los estados de validación deben acompañarse con texto o iconos, sin depender solamente del color.

## Marcas

FitApp es un solo código con varias versiones. Una marca cambia el aspecto, el nombre, el logo y qué funciones están disponibles; las pantallas, el catálogo, el store y la API son los mismos. Decisión del usuario del 18 de noviembre de 2026: "un solo código, tres versiones", porque cada gimnasio puede necesitar funciones distintas.

| | FitApp (por defecto) | Qivox | Fitness Group |
| --- | --- | --- | --- |
| Archivo | `src/app/brands/fitapp.ts` | `src/app/brands/qivox.ts` | `src/app/brands/fitnessgroup.ts` |
| Acento | lima `#C8F24C` | amarillo `#FFBD00` | amarillo `#FFDB01` |
| Oscuro | `#142118` | `#111111` | `#111113` |
| Fondo claro | `#F7F5EE` | `#F6F6F4` | `#F7F6F1` |
| Títulos | Inter | Inter 800 (en lugar de Graphik) | Anton en mayúsculas |
| Texto | Inter | Inter | Manrope |
| Tarjetas / botones | 14 px / 10 px | 12 px / píldora | 22 px / píldora |
| Logo en la barra | ícono propio y nombre | logotipo de su web | insignia de su web y nombre |

Origen de los valores, leídos el 18 de noviembre de 2026: Qivox, de la hoja de tokens pública de [qivox.com.ar](https://qivox.com.ar/) (`--qx-yellow`, `--qx-ink`, `--qx-off-white`, radios e interletra); Fitness Group, de los colores y tipografías globales de [fitnessgroup.ar](https://fitnessgroup.ar/) (`fg_yellow`, `fg_black`, `fg_light`, Anton y Manrope). De esos sitios se tomaron valores y, después, los logos (ver las reglas); ni fotos ni fuentes.

Reglas:

- **Colores, tipografía y radios solo por token.** Ninguna regla CSS escribe un color a mano; `tests/brands.test.ts` lo verifica y además comprueba el contraste AA de cada marca sobre sus fondos.
- **Sin "si la marca es X" en pantallas ni en lógica.** El aspecto sale de los tokens; las diferencias de comportamiento, de `brand.features` (hoy `account` e `install`, las dos activas en las tres marcas).
- **Los logos son de cada gimnasio.** Por pedido del usuario se usan los de sus webs públicas (`public/brand-logos/`, registrados en `docs/ASSETS.md`) para mostrar las versiones. No hay autorización registrada: publicarlas requiere el acuerdo de cada gimnasio, que además puede entregar sus archivos originales. Graphik, la tipografía de títulos de Qivox, es comercial y no se copia de su web.
- **Qué marca se ve:** `?marca=qivox` o `?marca=fitnessgroup` en la dirección (queda guardado en el dispositivo; `?marca=fitapp` vuelve a la original), o el subdominio (`qivox.…`) cuando se despliegue. Un mismo build sirve a todas.
- **Sumar una marca:** un archivo nuevo en `src/app/brands/`, registrarlo en `index.ts` y agregar su identificador a `BrandId`. TypeScript exige todos los tokens y funciones.

Cada marca tiene su `manifest` (`manifest.qivox.webmanifest`, `manifest.fitnessgroup.webmanifest`): la app instalada lleva su nombre y su ícono y abre con su marca; la pestaña usa su ícono. Las demostraciones originales usan un juego compartido, con figura gris y músculos resaltados sobre fondo claro.

## Tipografía

La web de Temacy declara Inter, Inter Tight y Geist Mono. FitApp dispone de una única fuente local Inter variable normal, con pesos 100 a 900, para evitar descargar múltiples variantes TTF. El archivo `public/fonts/inter-latin-variable.woff2` incluye el subconjunto latino de Google Fonts, compatible con el texto español de la app, y pesa 48.256 bytes.

Inter es la familia principal de interfaz. Inter Tight puede quedar como referencia para títulos y Geist Mono para datos técnicos; no se incluyen sus archivos en esta entrega. Mantener fallback a `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `system-ui`, `sans-serif`. Para números de series, pesos y tiempo, usar cifras tabulares.

Configuración sugerida para la fuente disponible:

```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter-latin-variable.woff2') format('woff2');
  font-style: normal;
  font-weight: 100 900;
  font-display: swap;
}
```

Adaptar la ruta al `base href` al desplegar bajo un subdirectorio. El archivo y su licencia SIL Open Font License 1.1 se sirven localmente; no se requiere Google Fonts en tiempo de ejecución.

La marca Fitness Group usa además Anton (títulos, un solo peso, en mayúsculas) y Manrope (texto, pesos 200 a 800), también locales, en `public/brand-fonts/`. El navegador las descarga solo cuando esa marca está activa y el service worker no las precarga.

## Estructura y componentes

- Navegación clara y consistente entre inicio, rutinas, calendario, progreso y biblioteca; en móvil, controles principales al alcance del pulgar.
- Listas de ejercicios compactas con nombre, grupo muscular y equipamiento, siguiendo la legibilidad de la referencia Strong sin copiar su marca.
- Registro de series con columnas estables, campos numéricos claros y acción inequívoca para completar cada serie.
- Botones principales con un único estilo, etiquetas en español y foco visible. Objetivo de área táctil: al menos 44 × 44 píxeles CSS.
- Separación por espacio y líneas antes que paneles anidados. Evitar decoración que compita con pesos, repeticiones o descanso.
- Cambios de estado breves, de aproximadamente 150 a 200 ms, y respeto por `prefers-reduced-motion`.
- Lo que se consulta en medio de la sesión (la ficha de un ejercicio, cambiar un ejercicio) se abre en una hoja oscura encima de la sesión, nunca saliendo de ella. La hoja muestra el descanso que está corriendo, se cierra con su botón "Volver a la sesión", con Escape o con el botón Atrás del teléfono, y devuelve el foco a lo que la abrió. Mientras está abierta, lo de atrás queda inactivo.
- En la sesión, lo opcional no ocupa lugar hasta que hace falta: el comentario de una serie se agrega desde un botón debajo de la tabla del ejercicio y queda debajo de su serie.
- Nada de lo que aparece al completar una serie puede mover la fila que el alumno está tocando. Por eso el descanso flota abajo, al alcance del pulgar, en lugar de ocupar un lugar en la página.
- Una duración entre series ("+45 s", "+2 min 10 s") nunca se escribe con el formato de una hora del día.
- Lo que es una estimación se muestra como tal: la duración de una rutina lleva "≈".
- Una acción que se puede deshacer no depende solo de un aviso que se va: el aviso ofrece "Deshacer" y además queda una salida a la vista ("Volver a…") mientras siga valiendo. El aviso no se va mientras el puntero o el foco estén sobre él.
- El botón Atrás del teléfono cierra lo que esté abierto encima de la pantalla (hoja, selector) antes de salir de ella, y nunca descarta sin preguntar algo que el alumno estaba armando.
- Los nombres de clase propios no pueden coincidir con una utilidad de Tailwind (`outline`, `ring`): Tailwind genera su regla y la aplica encima.
- Lo que la app arma por el alumno (una rutina propuesta) se presenta como propuesta: dice de dónde sale, entra como borrador que se puede cambiar entero y nunca se guarda sin que el alumno lo confirme. Antes de armarla muestra qué va a dar ("7 ejercicios, ≈ 45 min"); si el catálogo no alcanza para lo pedido, lo dice en lugar de rellenar.
- En un formulario largo, primero va lo que el alumno vino a hacer (los ejercicios) y después los datos que lo acompañan (nombre, nivel). Lo que casi nadie necesita al crear (los kilos de arranque) no ocupa lugar hasta que se pide.
- Una elección entre pocas opciones a la vista (zona, tiempo) usa botones de opción con forma de pastilla, de 44 px de alto como mínimo; la elegida se distingue por el relleno, no solo por el tono.

## Demostraciones de ejercicios

La dirección solicitada es una animación anatómica corta: figura neutra gris, músculos trabajados resaltados y movimiento repetible. No usar fotografía ambiental ni videos de personas como sustituto de esa referencia.

Las fichas públicas de [press de banca](https://gymvisual.com/animated-gifs/1519-barbell-bench-press.html) y [remo con mancuerna y apoyo](https://gymvisual.com/animated-gifs/2683-dumbbell-one-arm-row-rack-support.html) de Gym Visual permiten revisar ejemplos del estilo. Los recursos no están incorporados en FitApp. Su uso dentro de una app distribuida requiere la licencia apropiada del proveedor; la muestra pública no se considera una licencia de redistribución. Hasta contar con archivos autorizados, la interfaz puede ofrecer un enlace externo al ejemplo y mantener instrucciones textuales en español.

Al integrar animaciones licenciadas, incluir pausa/reproducción, controles accesibles y una descripción del movimiento. Respetar la preferencia de movimiento reducido. Mostrar solo medios correspondientes al ejercicio exacto.

### Mapa muscular

Mientras no haya imagen del movimiento, la ficha muestra qué músculos trabaja el ejercicio sobre un cuerpo de frente y de espalda (solapa "Músculos"). Reglas:

- Principales rellenos con el acento de la marca; secundarios con contorno y relleno tenue. La diferencia no depende solo del color: al lado va la lista en texto y la leyenda repite las dos formas.
- El dibujo lleva descripción para lectores de pantalla con los mismos músculos.
- Es una guía general, no una medición: sin porcentajes. La clasificación está pendiente de revisión por un profesional.
- Solo se pueden marcar las 16 zonas de `src/app/core/muscles.ts`, que son las que trae el dibujo.
- En las listas va en chico, como miniatura del ejercicio: un cuadrado oscuro con la zona del músculo principal (torso, muslos o piernas) y los músculos resaltados con el acento. Es decorativa: el nombre va siempre al lado. Cuando un ejercicio tenga ilustración, la miniatura muestra la ilustración.

## Lenguaje y contenido

Usar español rioplatense conciso: “Empezá”, “Guardá”, “Agregá una serie”. Las instrucciones de ejercicios deben ser comprensibles, sin promesas de resultados ni atribuir personalización que todavía no exista. Los registros y estadísticas deben surgir de los datos del alumno; el estado inicial no debe inventar actividad, peso ni logros.

### Demostraciones integradas (20 de noviembre de 2026)

Los 48 ejercicios tienen recursos originales de ImageGen, con figura gris y músculos resaltados sobre fondo claro, según el estilo aprobado. Son bucles de poses ilustradas. Se reproducen localmente en la ficha compartida, respetan movimiento reducido y ofrecen controles nativos; 47 permiten descargar y reproducir un GIF alternativo si falla WebM. El press de banca original conserva video y poster. Catálogo central: `src/app/core/exercise-media.ts`; origen y prompts: `docs/ASSETS.md`. Las miniaturas son posters estáticos y, si fallan, vuelve el mapa muscular. La galería `/exercise-demos/index.html` reúne los 48 ejercicios con búsqueda, reproducción y descarga individual o conjunta de GIF.

Los ejercicios por tiempo usan segundos internamente y muestran minutos/segundos; nunca se cuentan como repeticiones ni kilos. El mapa semanal cuenta participación en series finalizadas, con valores en texto y sin porcentajes de activación.

### Vista enfocada, programas e IA (20 de noviembre de 2026)

La sesión permite alternar entre lista y un ejercicio a la vez. El modo enfocado muestra posición, selector directo, anterior/siguiente, series, repeticiones o tiempo, descanso y demostración. Usa las mismas series y acciones que la lista; alternar no guarda otra copia ni descarta datos. La preferencia de vista se conserva localmente. La navegación es manual para no cambiar de ejercicio al marcar una serie.

En Mis rutinas se puede crear una secuencia de 1 a 100 sesiones, repetir rutinas, ordenar, pausar y retomar. Solo avanza una sesión iniciada desde el programa y guardada con al menos una serie completada. Descartar o hacer una rutina libre no avanza. Editar conserva avance y pausa cuando no cambia el tramo completado. Modificar ese tramo requiere reinicio explícito. La navegación protege el borrador y detecta cambios en otro dispositivo. Calendario y semana tipo conservan sus prioridades y sus descansos. Estado v7, compatible con v1–v6; tabla SQL 008.

El editor ofrece la propuesta con IA dentro de un detalle opcional. Presenta una vista previa y requiere aplicarla al borrador; no guarda una rutina automáticamente. El servidor puede desactivarla por configuración y marca. Gemini está conectado en FitApp con cuenta y cupo mensual; ver [COACH-IA.md](COACH-IA.md).

### Favoritos y reemplazos: interacción

La estrella es un botón independiente de 44 × 44 px, con nombre accesible y `aria-pressed`; marcarla no abre la ficha ni elige el ejercicio. Aparece en Biblioteca, ficha y selector. Los filtros muestran el número de favoritos y explican cómo empezar cuando la lista está vacía.

En el editor, «Cambiar ejercicio» abre un selector de alternativas del mismo movimiento. La flecha indica que elegir una aplica el cambio directamente al borrador. Se conservan series, repeticiones o tiempo y descanso, pero la carga empieza en cero. «Volver a…» queda visible en la fila mientras pueda restaurarse sin pisar ediciones nuevas. El selector cierra con Cancelar, Escape o Atrás y devuelve el foco a su origen; la rutina se guarda solo al confirmarla.


### Revisión de experiencia del 21 de noviembre de 2026

La próxima sesión muestra tiempo, nivel y cantidad de ejercicios. La lista usa posters estáticos y abre la demostración sin salir del programa; al cerrar vuelve el foco al ejercicio. Las animaciones se reservan para la ficha.

El coach comprueba cuenta y disponibilidad antes de mostrar el pedido. Distingue cupo diario de la cuenta y mensual compartido de la aplicación; muestra la renovación cuando se agotan y permite actualizar el saldo. Una respuesta, error o cierre de sesión no reemplaza el borrador: el alumno decide cuándo aplicar la propuesta.
