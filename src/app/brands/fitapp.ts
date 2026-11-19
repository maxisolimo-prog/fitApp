import type { Brand } from './brand';

const inter = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif";

/**
 * Marca por defecto: FitApp con la paleta Temacy (docs/DESIGN.md).
 * Estos valores son los mismos que el bloque "marca" de `src/styles.css`; hay un test que lo verifica.
 */
export const fitapp: Brand = {
  id: 'fitapp',
  name: 'FitApp',
  logo: 'icons/icon.svg',
  tokens: {
    dark: '#142118',
    darkDeep: '#0E1811',
    darkPanel: '#1B2A1F',
    darkStrong: '#2C4A2E',
    lineDark: '#344238',
    onDark: '#F7F5EE',
    onDarkSoft: '#D7DED3',
    mutedOnDark: '#A9B3A8',

    accent: '#C8F24C',
    accentHover: '#B9E33A',
    onAccent: '#142118',

    bg: '#F7F5EE',
    bgTint: '#EEF0E6',
    surface: '#FFFFFF',
    surfaceTint: '#FBFCF6',
    track: '#E9EBE1',
    ink: '#142118',
    ink2: '#4A5648',
    line: '#E1E1D6',
    lineStrong: '#CFD3C6',
    strong: '#2C4A2E',
    veil: 'rgba(127, 140, 120, 0.14)',

    fontBody: inter,
    fontDisplay: inter,
    btnWeight: '600',

    radius: '14px',
    radiusBtn: '10px',
    radiusField: '10px',
  },
  features: { account: true, install: true },
};
