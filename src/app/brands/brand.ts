/**
 * Una marca es una versión de la app: mismas pantallas y misma lógica, con su aspecto, su nombre y su lista de
 * funciones. Hay un archivo por marca en esta carpeta; nada fuera de acá debería preguntar "¿qué marca es?":
 * el aspecto sale de los tokens y las diferencias de comportamiento, de `features`.
 */
export type BrandId = 'fitapp' | 'qivox' | 'fitnessgroup';

/**
 * Funciones que una marca puede tener o no. Para sumar una: agregarla acá (TypeScript obliga a definirla en cada
 * marca) y envolver su entrada en la interfaz con `brand.features.<nombre>`.
 */
export interface BrandFeatures {
  aiCoach: boolean;
  /** Cuenta opcional y sincronización con la API (Perfil → Cuenta). */
  account: boolean;
  /** Instalación guiada como app (Perfil → Instalá). */
  install: boolean;
}

/** Cada clave se aplica como variable CSS: `darkDeep` → `--dark-deep`, `ink2` → `--ink-2`. */
export interface BrandTokens {
  // Superficies oscuras: barras, portada, sesión en curso, ficha del ejercicio.
  dark: string;
  darkDeep: string;
  darkPanel: string;
  /** Relleno marcado sobre oscuro: barra de descanso, serie hecha. */
  darkStrong: string;
  lineDark: string;
  onDark: string;
  onDarkSoft: string;
  mutedOnDark: string;

  // Acento: botón principal, selección, sesión en curso.
  accent: string;
  accentHover: string;
  onAccent: string;

  // Superficies claras.
  bg: string;
  /** Tinte para "planificado" y selección suave. */
  bgTint: string;
  surface: string;
  surfaceTint: string;
  /** Riel de barras de avance. */
  track: string;
  ink: string;
  ink2: string;
  line: string;
  lineStrong: string;
  /** Color de marca legible sobre claro: íconos, avance, días hechos. Lleva texto `onDark` encima. */
  strong: string;
  /** Velo de hover para botones de ícono, sobre claro u oscuro. */
  veil: string;

  // Tipografía.
  fontBody: string;
  fontDisplay: string;
  btnWeight: string;
  /** Opcionales: si la marca no los define, cada título conserva su peso, interletra y caja. */
  displayWeight?: string;
  displayTracking?: string;
  displayTransform?: string;

  // Forma.
  radius: string;
  radiusBtn: string;
  radiusField: string;
}

/** Logo de la barra. Rutas dentro de `public/`; `width` y `height` son las medidas con que se dibuja en la barra lateral. */
export interface BrandLogo {
  src: string;
  width: number;
  height: number;
  /** `true` si el logo ya trae el nombre escrito: la barra no lo repite en texto. */
  wordmark: boolean;
}

export interface Brand {
  id: BrandId;
  /** Nombre visible en la barra, el título de la pestaña y los textos que nombran a la app. */
  name: string;
  /** Con `null` se muestra solo el nombre en texto. */
  logo: BrandLogo | null;
  /** Ícono de la pestaña y de "Agregar a inicio" en iPhone. */
  icons: { favicon: string; touch: string };
  /** Manifest de la app instalada: nombre, colores e íconos de esta marca. */
  manifest: string;
  tokens: BrandTokens;
  features: BrandFeatures;
}
