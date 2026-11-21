import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import type { Exercise } from '../core/models';
import { BodySprite, bodyRef } from './body-sprite';
import { thumbView } from './muscle-focus';

/**
 * Miniatura de un ejercicio para las listas. Es el único lugar que decide qué imagen lleva un ejercicio: su
 * ilustración si la tiene y, si no, el mapa muscular en chico (la zona del músculo principal, con los músculos
 * que trabaja resaltados). Es decorativa: el nombre del ejercicio va siempre al lado, en texto.
 *
 * Ocupa un cuadrado fijo desde el primer momento, así la lista no salta cuando llega el dibujo. Tamaño, radio y
 * colores se pueden pisar con `--thumb-size`, `--thumb-radius`, `--thumb-bg`, `--thumb-base` y `--thumb-line`.
 */
@Component({
  selector: 'app-exercise-thumb',
  standalone: true,
  template: `
    <span class="thumb" aria-hidden="true">
      @if (exercise().image && !imageFailed()) {
        <img [src]="exercise().image" alt="" loading="lazy" decoding="async" (error)="imageFailed.set(true)">
      } @else if (parts(); as parts) {
        <svg [attr.viewBox]="view().viewBox" focusable="false">
          <use class="base" [attr.href]="'#' + ref(view().side)"/>
          @for (slug of parts.secondary; track slug) { <use class="secondary" [attr.href]="'#' + ref(view().side, slug)"/> }
          @for (slug of parts.primary; track slug) { <use class="primary" [attr.href]="'#' + ref(view().side, slug)"/> }
        </svg>
      } @else if (sprite.failed()) {
        {{ exercise().name.charAt(0) }}
      }
    </span>
  `,
  styles: `
    :host{display:block;flex-shrink:0;width:var(--thumb-size,44px);height:var(--thumb-size,44px)}
    .thumb{display:grid;place-items:center;width:100%;height:100%;overflow:hidden;border-radius:var(--thumb-radius,12px);background:var(--thumb-bg,var(--dark));color:var(--accent);font-size:17px;font-weight:700;line-height:1}
    svg,img{display:block;width:100%;height:100%}
    img{object-fit:cover}
    .base{--part-fill:var(--thumb-base,var(--line-dark));--part-line:var(--thumb-line,var(--muted-on-dark))}
    .secondary{--part-fill:color-mix(in srgb,var(--accent) 40%,var(--thumb-base,var(--line-dark)))}
    .primary{--part-fill:var(--accent)}
  `,
})
export class ExerciseThumbComponent {
  readonly exercise = input.required<Pick<Exercise, 'name' | 'primaryMuscles' | 'secondaryMuscles' | 'image'>>();
  readonly sprite = inject(BodySprite);
  readonly imageFailed = linkedSignal(() => { this.exercise(); return false; });
  readonly ref = bodyRef;
  readonly view = computed(() => thumbView(this.exercise().primaryMuscles));
  /** Músculos del ejercicio que se ven del lado elegido; null hasta que llega el dibujo. */
  readonly parts = computed(() => {
    const body = this.sprite.data();
    if (!body) return null;
    const drawn = new Set(body[this.view().side].map((part) => part.slug));
    const { primaryMuscles, secondaryMuscles } = this.exercise();
    return {
      primary: primaryMuscles.filter((id) => drawn.has(id)),
      secondary: secondaryMuscles.filter((id) => drawn.has(id) && !primaryMuscles.includes(id)),
    };
  });

  constructor() {
    this.sprite.request();
  }
}
