import { Injectable } from '@angular/core';

/** Lo que recibe quien abre una capa, para cerrarla desde la app. */
export interface BackLayer {
  /**
   * Cierra la capa: saca su entrada del historial. La promesa se cumple cuando el navegador ya volvió; recién ahí es
   * seguro navegar a otra pantalla (antes, la vuelta atrás pendiente desharía esa navegación).
   */
  close(): Promise<void>;
  /** Olvida la capa sin tocar el historial: quien la abrió dejó de existir. */
  forget(): void;
}

/**
 * Hace que el botón Atrás del teléfono cierre lo que está abierto encima de una pantalla (una hoja, un selector) en
 * lugar de salir de la pantalla. Cada capa abierta ocupa una entrada del historial del navegador, con la misma
 * dirección: volver atrás la saca y avisa a quien la abrió.
 */
@Injectable({ providedIn: 'root' })
export class BackClose {
  private readonly layers: (() => void)[] = [];
  /** Vueltas atrás que pidió la app misma: no son del alumno. Cada una avisa cuando termina. */
  private readonly ownBacks: (() => void)[] = [];

  constructor() {
    if (typeof window === 'undefined') return;
    window.addEventListener('popstate', () => this.popped());
    // Si se recargó la página con una capa abierta, su entrada quedó en el historial sin nadie que la atienda. Se
    // saca ahora, para que el primer Atrás del alumno no sea un toque perdido.
    if ((history.state as { fitappLayer?: boolean } | null)?.fitappLayer) void this.back();
  }

  /** Abre una capa. `onBack` se llama si el alumno vuelve atrás con ella abierta. */
  open(onBack: () => void): BackLayer {
    let open = true;
    const layer = () => { open = false; onBack(); };
    const remove = (): boolean => {
      const index = this.layers.indexOf(layer);
      if (index >= 0) this.layers.splice(index, 1);
      return index >= 0;
    };
    try { history.pushState({ fitappLayer: true }, ''); }
    catch { return { close: () => Promise.resolve(), forget: () => undefined }; }
    this.layers.push(layer);
    return {
      close: () => {
        if (!open) return Promise.resolve();
        open = false;
        return remove() ? this.back() : Promise.resolve();
      },
      forget: () => { open = false; remove(); },
    };
  }

  /** Vuelve una entrada atrás por cuenta de la app. Si el navegador no avisa, sigue igual después de un momento. */
  private back(): Promise<void> {
    return new Promise((resolve) => {
      const finish = () => resolve();
      const drop = () => { const index = this.ownBacks.indexOf(finish); if (index >= 0) this.ownBacks.splice(index, 1); };
      this.ownBacks.push(finish);
      try { history.back(); } catch { drop(); finish(); return; }
      setTimeout(() => { drop(); finish(); }, 700);
    });
  }

  private popped(): void {
    const own = this.ownBacks.shift();
    if (own) { own(); return; }
    this.layers.pop()?.();
  }
}
