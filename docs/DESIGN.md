# Diseño de FitApp

## Contexto del producto

WebApp responsive para el alumno que registra sus entrenamientos. El flujo prioritario es elegir una rutina, completar series con peso y repeticiones y consultar el historial. La referencia funcional y visual aportada por el usuario es la app móvil Strong, especialmente su biblioteca de ejercicios y las demostraciones anatómicas con músculos resaltados.

Escena de uso: una persona consulta el celular entre series en el gimnasio, con iluminación variable y a menudo con una sola mano. La interfaz debe ofrecer contraste claro, áreas táctiles cómodas y un registro rápido, conservando una experiencia completa en escritorio.

## Paleta de marca

Fuente: [Temacy en producción](https://temacy.ar/), verificada el 16 de noviembre de 2026. Los nombres y valores siguientes corresponden a las variables CSS observadas en el HTML de producción; la copia de trabajo usada para la verificación es `.cache/temacy.html`. No sustituir esta referencia por una plantilla ni por otra versión del sitio.

| Token | Valor | Uso en FitApp |
| --- | --- | --- |
| `--bosque` | `#142118` | Texto principal sobre claro, identidad y superficies oscuras |
| `--deep` | `#0E1811` | Fondo oscuro de mayor profundidad |
| `--musgo` | `#2C4A2E` | Superficies y estados secundarios verdes |
| `--lima` | `#C8F24C` | Acción principal, selección y foco de marca |
| `--hueso` | `#F7F5EE` | Superficie clara y texto principal sobre oscuro |
| `--muted` | `#A9B3A8` | Texto secundario sobre superficies oscuras |
| `--panel` | `#1B2A1F` | Paneles sobre fondo oscuro |

Usar texto bosque sobre los botones lima. El tono `muted` no debe usarse como texto pequeño sobre hueso: está destinado a fondos oscuros. Los estados de validación deben acompañarse con texto o iconos, sin depender solamente del color.

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

## Estructura y componentes

- Navegación clara y consistente entre inicio, rutinas, calendario, progreso y biblioteca; en móvil, controles principales al alcance del pulgar.
- Listas de ejercicios compactas con nombre, grupo muscular y equipamiento, siguiendo la legibilidad de la referencia Strong sin copiar su marca.
- Registro de series con columnas estables, campos numéricos claros y acción inequívoca para completar cada serie.
- Botones principales con un único estilo, etiquetas en español y foco visible. Objetivo de área táctil: al menos 44 × 44 píxeles CSS.
- Separación por espacio y líneas antes que paneles anidados. Evitar decoración que compita con pesos, repeticiones o descanso.
- Cambios de estado breves, de aproximadamente 150 a 200 ms, y respeto por `prefers-reduced-motion`.

## Demostraciones de ejercicios

La dirección solicitada es una animación anatómica corta: figura neutra gris, músculos trabajados resaltados y movimiento repetible. No usar fotografía ambiental ni videos de personas como sustituto de esa referencia.

Las fichas públicas de [press de banca](https://gymvisual.com/animated-gifs/1519-barbell-bench-press.html) y [remo con mancuerna y apoyo](https://gymvisual.com/animated-gifs/2683-dumbbell-one-arm-row-rack-support.html) de Gym Visual permiten revisar ejemplos del estilo. Los recursos no están incorporados en FitApp. Su uso dentro de una app distribuida requiere la licencia apropiada del proveedor; la muestra pública no se considera una licencia de redistribución. Hasta contar con archivos autorizados, la interfaz puede ofrecer un enlace externo al ejemplo y mantener instrucciones textuales en español.

Al integrar animaciones licenciadas, incluir pausa/reproducción, controles accesibles y una descripción del movimiento. Respetar la preferencia de movimiento reducido. Mostrar solo medios correspondientes al ejercicio exacto.

## Lenguaje y contenido

Usar español rioplatense conciso: “Empezá”, “Guardá”, “Agregá una serie”. Las instrucciones de ejercicios deben ser comprensibles, sin promesas de resultados ni atribuir personalización que todavía no exista. Los registros y estadísticas deben surgir de los datos del alumno; el estado inicial no debe inventar actividad, peso ni logros.
