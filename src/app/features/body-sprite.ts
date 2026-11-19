import { Component, Injectable, inject, signal } from '@angular/core';
import { loadBody, type BodyData } from './muscle-map.component';
import type { BodySide } from './muscle-focus';

/** Id del dibujo de un lado entero o de una de sus partes, para `<use href="#…">`. */
export function bodyRef(side: BodySide, slug?: string): string {
  return slug ? `body-${side}-${slug}` : `body-${side}`;
}

/**
 * El dibujo del cuerpo, una sola vez en la página. Las miniaturas lo reutilizan con `<use>` en lugar de repetir
 * los trazos en cada fila de una lista. Se descarga cuando aparece la primera miniatura.
 */
@Injectable({ providedIn: 'root' })
export class BodySprite {
  readonly data = signal<BodyData | null>(null);
  readonly failed = signal(false);
  private requested = false;

  request(): void {
    if (this.requested) return;
    this.requested = true;
    this.failed.set(false);
    // Si falla (sin conexión), la próxima miniatura que aparezca vuelve a pedirlo.
    loadBody().then((data) => this.data.set(data), () => { this.requested = false; this.failed.set(true); });
  }
}

/**
 * Va una vez en la raíz de la app. No dibuja nada por sí mismo: define las partes que usan las miniaturas.
 * Cada parte se pinta con `--part-fill` y el contorno con `--part-line`, que fija quien la usa.
 */
@Component({
  selector: 'app-body-sprite',
  standalone: true,
  template: `
    @if (sprite.data(); as body) {
      <svg aria-hidden="true" focusable="false" width="0" height="0">
        <defs>
          @for (side of sides; track side) {
            <g [attr.id]="ref(side)">
              <path class="silhouette" [attr.d]="body.outline[side]"/>
              @for (part of body[side]; track part.slug) { <path class="part" [attr.id]="ref(side, part.slug)" [attr.d]="part.d"/> }
            </g>
          }
        </defs>
      </svg>
    }
  `,
  styles: `
    :host{position:absolute;width:0;height:0;overflow:hidden}
    .part{fill:var(--part-fill)}
    .silhouette{fill:none;stroke:var(--part-line);stroke-width:1;vector-effect:non-scaling-stroke}
  `,
})
export class BodySpriteComponent {
  readonly sprite = inject(BodySprite);
  readonly sides: readonly BodySide[] = ['front', 'back'];
  readonly ref = bodyRef;
}
