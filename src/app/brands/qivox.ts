import type { Brand } from './brand';

const inter = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";

/**
 * Qivox Smart Gym. Colores, radios e interletra tomados de los tokens públicos de qivox.com.ar el 18 de
 * noviembre de 2026 (docs/DESIGN.md, "Marcas").
 *
 * Pendiente de que el gimnasio lo entregue: el logo (por eso `logo: null`) y Graphik, su tipografía de títulos,
 * que es comercial y no se puede copiar de su web. Mientras tanto los títulos van en Inter extra negrita.
 */
export const qivox: Brand = {
  id: 'qivox',
  name: 'Qivox',
  logo: null,
  tokens: {
    dark: '#111111',
    darkDeep: '#0A0A0A',
    darkPanel: '#1C1C1C',
    darkStrong: '#2A2A2A',
    lineDark: '#333333',
    onDark: '#FFFFFF',
    onDarkSoft: '#D9D9D9',
    mutedOnDark: '#B3B3B3',

    accent: '#FFBD00',
    accentHover: '#E0A600',
    onAccent: '#111111',

    bg: '#F6F6F4',
    bgTint: '#FFF4D1',
    surface: '#FFFFFF',
    surfaceTint: '#FFFBEF',
    track: '#EDEDED',
    ink: '#111111',
    // El gris de su web (#6F6F6F) está pensado para fondo blanco; sobre el fondo de la app queda justo en 4.5:1.
    ink2: '#666666',
    line: '#E4E4E0',
    lineStrong: '#CFCFCF',
    strong: '#1C1C1C',
    veil: 'rgba(128, 128, 128, 0.16)',

    fontBody: inter,
    fontDisplay: inter,
    btnWeight: '600',
    displayWeight: '800',
    displayTracking: '-0.03em',

    radius: '12px',
    radiusBtn: '999px',
    radiusField: '10px',
  },
  features: { account: true, install: true },
};
