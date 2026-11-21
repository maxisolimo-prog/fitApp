import type { Brand } from './brand';

/**
 * Fitness Group (red de gimnasios de Córdoba: Manantial y otros). Colores, tipografías y radios tomados de los
 * estilos globales de fitnessgroup.ar el 18 de noviembre de 2026 (docs/DESIGN.md, "Marcas").
 *
 * Anton y Manrope son libres (SIL OFL) y están en `public/brand-fonts/`. El logo es el de su web pública
 * (docs/ASSETS.md): es de Fitness Group y publicar esta versión requiere su acuerdo.
 */
export const fitnessgroup: Brand = {
  id: 'fitnessgroup',
  name: 'Fitness Group',
  logo: { src: 'brand-logos/fitnessgroup-icon-192.png', width: 40, height: 40, wordmark: false },
  icons: { favicon: 'brand-logos/fitnessgroup-icon-192.png', touch: 'brand-logos/fitnessgroup-icon-192.png' },
  manifest: 'manifest.fitnessgroup.webmanifest',
  tokens: {
    dark: '#111113',
    darkDeep: '#0A0A0C',
    darkPanel: '#1B1B1E',
    darkStrong: '#2B2B30',
    lineDark: '#34343A',
    onDark: '#FFFFFF',
    onDarkSoft: '#D7D9E0',
    mutedOnDark: '#9AA0AE',

    accent: '#FFDB01',
    accentHover: '#F2CE00',
    onAccent: '#111113',

    bg: '#F7F6F1',
    bgTint: '#FFF7C9',
    surface: '#FFFFFF',
    surfaceTint: '#FFFCEA',
    track: '#E9E7DD',
    ink: '#1D1D1E',
    ink2: '#57575D',
    line: '#E9E7DD',
    lineStrong: '#D3D0C3',
    strong: '#1B1B1E',
    veil: 'rgba(128, 128, 134, 0.16)',

    fontBody: "'Manrope', 'Inter', system-ui, sans-serif",
    fontDisplay: "'Anton', 'Arial Narrow', 'Inter', sans-serif",
    btnWeight: '800',
    displayWeight: '400',
    displayTracking: '0.015em',
    displayTransform: 'uppercase',

    radius: '22px',
    radiusBtn: '999px',
    radiusField: '14px',
  },
  features: { account: true, install: true, aiCoach: true },
};
