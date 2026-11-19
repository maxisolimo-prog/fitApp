import { Component, computed, input, signal } from '@angular/core';
import type { MuscleId } from '../core/models';
import { muscleSentence } from '../core/muscles';
import type { BodyPart } from './muscle-map.data';

import type { BodySide } from './muscle-focus';

type Side = BodySide;
export interface BodyData {
  front: readonly BodyPart[];
  back: readonly BodyPart[];
  outline: Readonly<Record<Side, string>>;
  viewBox: Readonly<Record<Side, string>>;
}

/** El dibujo pesa unos 60 kB: va en un archivo aparte y se pide una sola vez, cuando hace falta el primer mapa. */
let bodyRequest: Promise<BodyData> | null = null;
export function loadBody(): Promise<BodyData> {
  if (!bodyRequest) {
    const request = import('./muscle-map.data').then((data) => ({
      front: data.BODY_FRONT, back: data.BODY_BACK, outline: data.BODY_OUTLINE, viewBox: data.BODY_VIEWBOX,
    }));
    request.catch(() => { if (bodyRequest === request) bodyRequest = null; }); // sin conexión: se reintenta la próxima vez
    bodyRequest = request;
  }
  return bodyRequest;
}

/**
 * Cuerpo de frente y de espalda con los músculos de un ejercicio: principales rellenos, secundarios con contorno.
 * El dibujo solo no alcanza: quien lo usa muestra además la lista en texto. Los colores salen de la marca; sobre
 * fondo claro se pueden pisar con `--map-base`, `--map-outline`, `--map-accent`, `--map-label` y `--map-text`.
 */
@Component({
  selector: 'app-muscle-map',
  standalone: true,
  template: `
    <div class="muscle-map">
      @if (body(); as body) {
        <div class="figures" role="img" [attr.aria-label]="description()">
          @for (side of sides; track side.id) {
            <div class="side">
              <svg [attr.viewBox]="body.viewBox[side.id]" aria-hidden="true" focusable="false">
                <path class="silhouette" [attr.d]="body.outline[side.id]"/>
                @for (part of body[side.id]; track part.slug) {
                  <path class="part" [class.is-primary]="primarySet().has(part.slug)" [class.is-secondary]="secondarySet().has(part.slug)" [attr.d]="part.d"/>
                }
              </svg>
              <span aria-hidden="true">{{ side.label }}</span>
            </div>
          }
        </div>
      } @else if (failed()) {
        <div class="status" role="status">
          <p>No se pudo cargar el dibujo. La lista de músculos está acá abajo.</p>
          <button type="button" class="retry" (click)="load()">Reintentar</button>
        </div>
      } @else {
        <p class="status" role="status">Cargando el dibujo…</p>
      }
    </div>
  `,
  styles: `
    :host{display:block}
    .muscle-map{display:flex;justify-content:center;align-items:center;min-height:286px}
    .figures{display:flex;justify-content:center;gap:24px}
    .side{display:flex;flex-direction:column;align-items:center;gap:8px;font-size:11px;line-height:1.6;color:var(--map-label,var(--muted-on-dark))}
    svg{display:block;width:130px;height:260px}
    .silhouette{fill:none;stroke:var(--map-outline,var(--muted-on-dark));stroke-width:1;vector-effect:non-scaling-stroke;opacity:.55}
    .part{fill:var(--map-base,var(--line-dark))}
    .part.is-primary{fill:var(--map-accent,var(--accent))}
    .part.is-secondary{fill:color-mix(in srgb,var(--map-accent,var(--accent)) 16%,transparent);stroke:var(--map-accent,var(--accent));stroke-width:1.5;vector-effect:non-scaling-stroke}
    .status{margin:0;max-width:32ch;font-size:13px;line-height:1.6;text-align:center;color:var(--map-label,var(--muted-on-dark))}
    .status p{margin:0 0 12px}
    .retry{min-height:44px;padding:8px 18px;border-radius:var(--radius-btn);border:1px solid var(--map-outline,var(--muted-on-dark));background:transparent;color:var(--map-text,var(--on-dark));font:inherit;font-weight:var(--btn-weight);cursor:pointer}
    .retry:focus-visible{outline:2px solid var(--map-accent,var(--accent));outline-offset:3px}
    @media(min-width:541px){.muscle-map{min-height:346px}svg{width:160px;height:320px}}
  `,
})
export class MuscleMapComponent {
  readonly primary = input.required<readonly MuscleId[]>();
  readonly secondary = input<readonly MuscleId[]>([]);
  readonly sides: { id: Side; label: string }[] = [{ id: 'front', label: 'Frente' }, { id: 'back', label: 'Espalda' }];
  readonly body = signal<BodyData | null>(null);
  readonly failed = signal(false);
  readonly primarySet = computed<ReadonlySet<string>>(() => new Set(this.primary()));
  /** Si un músculo figura en las dos listas, manda la principal. */
  readonly secondarySet = computed<ReadonlySet<string>>(() => new Set(this.secondary().filter((id) => !this.primarySet().has(id))));
  readonly description = computed(() => {
    const primary = muscleSentence(this.primary()).toLocaleLowerCase('es');
    const secondary = muscleSentence(this.secondary()).toLocaleLowerCase('es');
    return `Cuerpo de frente y de espalda. Músculos principales: ${primary || 'ninguno'}.${secondary ? ` Secundarios: ${secondary}.` : ''}`;
  });

  constructor() {
    this.load();
  }

  /** Pide el dibujo. También es la acción de "Reintentar" cuando falló la descarga. */
  load(): void {
    this.failed.set(false);
    loadBody().then((data) => this.body.set(data), () => this.failed.set(true));
  }
}
