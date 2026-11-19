import type { Brand, BrandId } from './brand';
import { fitapp } from './fitapp';
import { fitnessgroup } from './fitnessgroup';
import { qivox } from './qivox';

export type { Brand, BrandFeatures, BrandId, BrandTokens } from './brand';

export const BRANDS: Readonly<Record<BrandId, Brand>> = { fitapp, qivox, fitnessgroup };
export const DEFAULT_BRAND_ID: BrandId = 'fitapp';

/** Parámetro de la dirección para elegir marca al probar: `/?marca=qivox`. */
export const BRAND_PARAM = 'marca';
/** Clave propia en localStorage: no forma parte de `FitAppState`. */
export const BRAND_STORAGE_KEY = 'fitapp-brand';

/** Solo acepta identificadores conocidos; cualquier otra cosa (incluido lo que venga de la dirección) es `null`. */
export function parseBrandId(value: unknown): BrandId | null {
  if (typeof value !== 'string') return null;
  const id = value.trim().toLowerCase();
  return Object.hasOwn(BRANDS, id) ? (id as BrandId) : null;
}

export interface BrandSources {
  /** `location.search`. */
  search?: string;
  /** `location.hostname`. */
  hostname?: string;
  /** Lo guardado en `BRAND_STORAGE_KEY`. */
  stored?: string | null;
}

/**
 * Qué marca mostrar. Orden: el parámetro `?marca=` (para probar), el subdominio (`qivox.ejemplo.com`), lo que quedó
 * guardado en este dispositivo y, si no hay nada, la marca por defecto.
 */
export function resolveBrandId({ search = '', hostname = '', stored = null }: BrandSources): BrandId {
  const fromParam = parseBrandId(new URLSearchParams(search).get(BRAND_PARAM));
  if (fromParam) return fromParam;
  const fromHost = parseBrandId(hostname.split('.')[0]);
  if (fromHost) return fromHost;
  return parseBrandId(stored) ?? DEFAULT_BRAND_ID;
}

/** `darkDeep` → `--dark-deep`, `ink2` → `--ink-2`. */
export function cssVarName(token: string): string {
  return '--' + token.replace(/([a-z])([A-Z0-9])/g, '$1-$2').toLowerCase();
}

export function brandCssVars(brand: Brand): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [token, value] of Object.entries(brand.tokens)) {
    if (typeof value === 'string') vars[cssVarName(token)] = value;
  }
  return vars;
}

/** Aplica la marca al documento: variables CSS, color de la barra del navegador, título, ícono y manifest. */
export function applyBrand(brand: Brand, doc: Document): void {
  const root = doc.documentElement;
  root.setAttribute('data-brand', brand.id);
  for (const [name, value] of Object.entries(brandCssVars(brand))) root.style.setProperty(name, value);
  doc.querySelector('meta[name="theme-color"]')?.setAttribute('content', brand.tokens.dark);
  doc.title = `${brand.name} · Cada sesión cuenta`;

  const favicon = doc.querySelector('link[rel="icon"]');
  favicon?.setAttribute('href', brand.icons.favicon);
  favicon?.setAttribute('type', brand.icons.favicon.endsWith('.svg') ? 'image/svg+xml' : 'image/png');
  doc.querySelector('link[rel="apple-touch-icon"]')?.setAttribute('href', brand.icons.touch);
  doc.querySelector('link[rel="manifest"]')?.setAttribute('href', brand.manifest);
}

/**
 * Resuelve la marca al arrancar, la aplica y recuerda la elegida con `?marca=` para que siga al navegar o al
 * abrir la app instalada. Si el almacenamiento falla, la app sigue con la marca resuelta.
 */
export function startBrand(win: Window): Brand {
  let stored: string | null = null;
  try { stored = win.localStorage.getItem(BRAND_STORAGE_KEY); } catch { /* sin almacenamiento */ }
  const { search, hostname } = win.location;
  const id = resolveBrandId({ search, hostname, stored });
  if (parseBrandId(new URLSearchParams(search).get(BRAND_PARAM))) {
    try { win.localStorage.setItem(BRAND_STORAGE_KEY, id); } catch { /* sin almacenamiento */ }
  }
  const brand = BRANDS[id];
  applyBrand(brand, win.document);
  return brand;
}
