import { Component, computed, inject, signal } from '@angular/core';
import { WorkoutStore } from '../core/workout-store';
import { muscleActivity } from '../core/muscle-activity';
import { weekDates } from '../core/workout-utils';
import { MuscleMapComponent } from './muscle-map.component';

@Component({
  selector: 'app-weekly-muscles', standalone: true, imports: [MuscleMapComponent],
  template: `
    <section aria-labelledby="weekly-muscles-title">
      <header><div><p class="kicker">TU ENTRENAMIENTO EN EL CUERPO</p><h2 id="weekly-muscles-title">Músculos de la semana</h2></div>
        <div class="week-nav"><button type="button" aria-label="Ver semana anterior" (click)="offset.update(previous)">‹</button>
          <span aria-live="polite">{{ label() }}</span><button type="button" aria-label="Ver semana siguiente" [disabled]="offset() === 0" (click)="offset.update(next)">›</button></div>
      </header>
      <div class="body">
        <app-muscle-map [primary]="activity().primary" [secondary]="activity().secondary" />
        <div class="details">
          @if (activity().sets) {
            <p class="summary">{{ activity().sets }} {{ activity().sets === 1 ? 'serie' : 'series' }} en {{ activity().sessions }} {{ activity().sessions === 1 ? 'entrenamiento' : 'entrenamientos' }}.</p>
            <table><caption class="sr-only">Series en que participó cada músculo</caption><thead><tr><th scope="col">Músculo</th><th scope="col">Principal</th><th scope="col">Apoyo</th></tr></thead><tbody>
              @for (row of activity().rows; track row.id) { <tr><th scope="row">{{ row.name }}</th><td>{{ row.primary || '—' }}</td><td>{{ row.secondary || '—' }}</td></tr> }
            </tbody></table>
          } @else {
            <h3>Todavía no hay series esta semana.</h3>
            <p>Finalizá un entrenamiento para ver qué músculos trabajaste. El mapa se completa con tus registros.</p>
          }
          <p class="legend">Relleno: trabajo principal. Contorno: participación de apoyo.</p>
          <p class="note">Una serie puede contar para varios músculos. La duración, la carga y el esfuerzo no se comparan en este mapa.</p>
        </div>
      </div>
    </section>
  `,
  styles: `
    :host{display:block;margin:28px 0}section{padding:24px;border-radius:var(--radius);background:var(--dark);color:var(--on-dark)}
    header{display:flex;align-items:center;justify-content:space-between;gap:20px}.kicker{font-size:10px;letter-spacing:.1em;color:var(--muted-on-dark);margin:0 0 6px}h2{font-size:21px;margin:0}h3{font-size:17px;margin:0 0 10px}
    .week-nav{display:flex;align-items:center;gap:8px;white-space:nowrap;font-size:12px}.week-nav button{width:44px;height:44px;border:1px solid var(--line-dark);border-radius:var(--radius);background:transparent;color:var(--on-dark);font:inherit;font-size:24px;cursor:pointer}.week-nav button:disabled{opacity:.35;cursor:default}.week-nav button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
    .body{display:grid;grid-template-columns:300px 1fr;align-items:center;gap:28px;margin-top:24px}.details{min-width:0}.details p{font-size:13px;line-height:1.6;color:var(--muted-on-dark)}.details .summary{color:var(--on-dark);margin:0 0 14px}
    table{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums}th,td{padding:9px 4px;border-bottom:1px solid var(--line-dark);text-align:right}th:first-child{text-align:left}tbody th{font-weight:500}thead th{font-weight:400;color:var(--muted-on-dark)}.details .note{font-size:11px}.legend{margin-bottom:0}
    .sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
    @media(max-width:680px){section{padding:20px 16px}header{align-items:flex-start;flex-direction:column;gap:12px}.week-nav{width:100%;justify-content:space-between}.body{grid-template-columns:1fr;gap:18px;margin-top:16px}h2{font-size:20px}}
  `,
})
export class WeeklyMusclesComponent {
  readonly store = inject(WorkoutStore);
  readonly offset = signal(0);
  readonly previous = (n: number) => n - 1;
  readonly next = (n: number) => Math.min(0, n + 1);
  readonly dates = computed(() => { const day = new Date(); day.setDate(day.getDate() + this.offset() * 7); return weekDates(day); });
  readonly label = computed(() => {
    const dates = this.dates();
    const format = (date: string) => new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(new Date(date + 'T12:00:00'));
    return `${format(dates[0])} al ${format(dates[6])}`;
  });
  readonly activity = computed(() => muscleActivity(this.store.history(), this.dates(), this.store.exercises()));
}
