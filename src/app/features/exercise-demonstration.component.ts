import { ChangeDetectionStrategy, Component, input, linkedSignal } from '@angular/core';
import type { ExerciseDemonstration } from '../core/exercise-media';

@Component({
  selector: 'app-exercise-demonstration',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="demonstration">
      <div class="media">
        @if (videoFailed()) {
          <img [src]="gifPlaying() && media().gif ? media().gif : media().poster" alt="Demostración del ejercicio" [width]="media().width" [height]="media().height" (error)="gifPlaying.set(false)">
          @if (media().gif) { <button type="button" (click)="gifPlaying.set(!gifPlaying())">{{ gifPlaying() ? 'Detener animación' : 'Reproducir GIF' }}</button> }
        } @else {
          <video [src]="media().video" [poster]="media().poster" [autoplay]="autoplay" [muted]="true"
            controls playsinline loop preload="metadata" [width]="media().width" [height]="media().height"
            aria-label="Demostración anatómica" [attr.aria-describedby]="captionId()"
            (error)="videoFailed.set(true)"></video>
        }
      </div>
      <figcaption [id]="captionId()">
        @if (videoFailed() && !gifPlaying()) { <span role="status">El video no está disponible. </span> }
        {{ media().description }}
      </figcaption>
      @if (media().gif) { <a class="download" [href]="media().gif" download>Descargar GIF</a> }
    </figure>
  `,
  styles: `
    :host { display: block; }
    .demonstration { margin: 0 0 24px; }
    .media { overflow: hidden; border-radius: var(--radius); background: var(--surface); }
    video, img { display: block; width: 100%; height: auto; max-height: 360px; margin-inline: auto; object-fit: contain; }
    video:focus-visible { outline: 2px solid var(--ink); outline-offset: -4px; }
    figcaption { margin-top: 10px; color: var(--muted-on-dark); font-size: 13px; line-height: 1.55; }
    button, .download { display: inline-flex; align-items: center; min-height: 44px; font: inherit; font-size: 12px; }
    button { border: 1px solid var(--line); background: var(--surface); color: var(--ink); padding: 8px 16px; cursor: pointer; }
    .download { color: var(--accent); text-underline-offset: 3px; }
  `,
})
export class ExerciseDemonstrationComponent {
  readonly media = input.required<ExerciseDemonstration>();
  readonly captionId = input.required<string>();
  readonly autoplay = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  readonly videoFailed = linkedSignal(() => { this.media(); return false; });
  readonly gifPlaying = linkedSignal(() => { this.media(); return false; });
}
