import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { WorkoutStore } from '../core/workout-store';

/** Control independiente de la acción de abrir/elegir un ejercicio, nunca un botón dentro de otro. */
@Component({
  selector: 'app-exercise-favorite', standalone: true, changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.on-dark]': 'dark()' },
  template: `
    <button type="button" [class.is-favorite]="store.isFavorite(exerciseId())" [attr.aria-pressed]="store.isFavorite(exerciseId())"
      [attr.aria-label]="store.isFavorite(exerciseId()) ? 'Quitar ' + exerciseName() + ' de favoritos' : 'Agregar ' + exerciseName() + ' a favoritos'"
      [title]="store.isFavorite(exerciseId()) ? 'Quitar de favoritos' : 'Agregar a favoritos'" (click)="store.toggleFavorite(exerciseId())">
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="m12 3 2.8 5.7 6.3.9-4.5 4.4 1.1 6.2-5.7-3-5.7 3 1.1-6.2L3.2 9.6l6.3-.9Z"/></svg>
    </button>
  `,
  styles: `
    :host{display:inline-flex;flex-shrink:0;--favorite-ink:var(--ink-2);--favorite-active:var(--strong);--favorite-hover:var(--bg-tint)}
    :host.on-dark{--favorite-ink:var(--muted-on-dark);--favorite-active:var(--accent);--favorite-hover:var(--dark-panel)}
    button{display:grid;place-items:center;width:44px;height:44px;padding:10px;border:0;border-radius:var(--radius);background:transparent;color:var(--favorite-ink);cursor:pointer}
    button:hover{background:var(--favorite-hover)}button:focus-visible{outline:2px solid var(--favorite-active);outline-offset:2px}
    svg{width:22px;height:22px}.is-favorite{color:var(--favorite-active)}.is-favorite svg{fill:currentColor}
  `,
})
export class ExerciseFavoriteComponent {
  readonly store = inject(WorkoutStore);
  readonly exerciseId = input.required<string>();
  readonly exerciseName = input.required<string>();
  readonly dark = input(false);
}
