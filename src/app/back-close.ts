import { Injectable } from '@angular/core';

/**
 * Hace que el botón Atrás del teléfono cierre lo que está abierto encima de una pantalla (una hoja, un selector) en
 * lugar de salir de la pantalla. Cada capa abierta ocupa una entrada del historial del navegador, con la misma
 * dirección: volver atrás la saca y avisa a quien la abrió.
 */
@Injectable({ providedIn: 'root' })
export class BackClose {
  private readonly layers: (() => void)[] = [];
  /** Vueltas atrás que pidió la app misma al cerrar una capa: no son del alumno. */
  private ownBacks = 0;

  constructor() {
    if (typeof window !== 'undefined') window.addEventListener('popstate', () => this.popped());
  }

  /**
   * Abre una capa. `onBack` se llama si el alumno vuelve atrás. Devuelve la función para cerrarla desde la app
   * (un botón, Escape, elegir una opción); llamarla de más no hace nada.
   */
  open(onBack: () => void): () => void {
    let open = true;
    const layer = () => { open = false; onBack(); };
    try { history.pushState({ fitappLayer: true }, ''); } catch { return () => undefined; }
    this.layers.push(layer);
    return () => {
      if (!open) return;
      open = false;
      const index = this.layers.indexOf(layer);
      if (index < 0) return;
      this.layers.splice(index, 1);
      this.ownBacks++;
      try { history.back(); } catch { this.ownBacks--; }
    };
  }

  private popped(): void {
    if (this.ownBacks > 0) { this.ownBacks--; return; }
    this.layers.pop()?.();
  }
}
