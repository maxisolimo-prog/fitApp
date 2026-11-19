import { InjectionToken } from '@angular/core';
import { BRANDS, DEFAULT_BRAND_ID, type Brand } from './index';

/** Marca activa. `main.ts` provee la que resolvió al arrancar; no cambia mientras la app está abierta. */
export const BRAND = new InjectionToken<Brand>('brand', {
  providedIn: 'root',
  factory: () => BRANDS[DEFAULT_BRAND_ID],
});
