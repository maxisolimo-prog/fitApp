import { Component, EventEmitter, Output, computed, effect, inject, input, signal } from '@angular/core';
import type { Exercise, WorkoutSet } from '../core/models';
import { muscleSentence } from '../core/muscles';
import { loadHint } from '../load-hint';
import { WorkoutStore } from '../core/workout-store';
import { MuscleMapComponent } from './muscle-map.component';

type DetailTab = 'overview' | 'muscles' | 'history' | 'instructions';
type Metric = 'weight' | 'volume' | 'reps';

interface ExerciseSession {
  id: string;
  date: string;
  routineName: string;
  sets: WorkoutSet[];
  weight: number;
  volume: number;
  reps: number;
}

@Component({
  selector: 'app-exercise-detail',
  standalone: true,
  imports: [MuscleMapComponent],
  template: `
    <article class="exercise-detail" [attr.aria-labelledby]="prefix() + '-title'">
      <header class="detail-header">
        @if (!embedded()) {
          <button type="button" class="back-button" (click)="closed.emit()" aria-label="Volver a la biblioteca">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>
          </button>
        }
        <div class="heading-copy">
          <span class="eyebrow">{{ embedded() ? 'FICHA DEL EJERCICIO' : 'BIBLIOTECA DE EJERCICIOS' }}</span>
          <h2 [id]="prefix() + '-title'">{{ exercise().name }}</h2>
          <p>{{ exercise().muscle }} <span aria-hidden="true">·</span> {{ exercise().equipment }}</p>
        </div>
      </header>

      <div class="detail-tabs" role="tablist" aria-label="Información del ejercicio">
        @for (tab of tabs; track tab.id; let i = $index) {
          <button type="button" role="tab" [id]="prefix() + '-tab-' + tab.id"
            [attr.aria-controls]="prefix() + '-panel-' + tab.id"
            [attr.aria-selected]="activeTab() === tab.id" [tabIndex]="activeTab() === tab.id ? 0 : -1"
            [class.is-active]="activeTab() === tab.id" (click)="activeTab.set(tab.id)"
            (keydown)="onTabKeydown($event, i)">{{ tab.label }}</button>
        }
      </div>

      <section class="tab-panel" role="tabpanel" [id]="prefix() + '-panel-overview'"
        [attr.aria-labelledby]="prefix() + '-tab-overview'" [hidden]="activeTab() !== 'overview'" tabindex="0">
        @if (exercise().id === 'bench-press') {
          <div class="reference-panel">
            <div class="reference-top"><span class="section-kicker">REFERENCIA DEL MOVIMIENTO</span><span class="reference-type">ANATOMÍA</span></div>
            <a class="animation-link" href="https://gymvisual.com/animated-gifs/1519-barbell-bench-press.html"
              target="_blank" rel="noopener noreferrer" aria-describedby="animation-note">
              <span class="play-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="m9 5 11 7-11 7z"/></svg></span>
              <span><strong>Ver animación anatómica</strong><span>Press de banca con barra</span></span>
              <svg class="external-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M10 5H5v14h14v-5"/></svg>
            </a>
            <p id="animation-note">Vista previa en Gym Visual · abre otra pestaña</p>
          </div>
        } @else {
          <div class="movement-panel">
            <span class="section-kicker">CONOCÉ EL MOVIMIENTO</span>
            <p>{{ exercise().instructions[0] }}</p>
            <button type="button" class="inline-action" (click)="selectTab('instructions')">Ver cómo hacerlo <span aria-hidden="true">↗</span></button>
          </div>
        }

        <div class="progress-header">
          <div><span class="section-kicker">TUS REGISTROS</span><h3>Evolución</h3></div>
          <label class="metric-field">
            <span class="sr-only">Métrica del gráfico</span>
            <select [value]="metric()" (change)="setMetric($event)">
              <option value="weight">Mayor peso</option><option value="volume">Volumen</option><option value="reps">Repeticiones</option>
            </select>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg>
          </label>
        </div>

        @if (sessions().length) {
          <div class="record-line" aria-live="polite">
            <div><span class="record-label">{{ bestLabel() }}</span><p><strong>{{ formatNumber(bestValue()) }}</strong> <span>{{ unit() }}</span></p></div>
            <span class="session-count">{{ sessions().length }} {{ sessions().length === 1 ? 'sesión registrada' : 'sesiones registradas' }}</span>
          </div>
          <div class="chart-container">
            <svg class="progress-chart" viewBox="0 0 600 220" role="img" [attr.aria-labelledby]="prefix() + '-chart-title'">
              <title [id]="prefix() + '-chart-title'">{{ metricLabel() }} por sesión. {{ recentSessions().length }} registros reales; los valores están disponibles debajo del gráfico.</title>
              @for (tick of chartTicks(); track $index) {
                <line x1="48" x2="578" [attr.y1]="tick.y" [attr.y2]="tick.y" class="chart-grid"/>
                <text x="36" [attr.y]="tick.y + 4" text-anchor="end" class="axis-text">{{ compactNumber(tick.value) }}</text>
              }
              @if (chartPoints().length > 1) { <polyline [attr.points]="chartLine()" class="chart-line"/> }
              @for (point of chartPoints(); track point.id) {
                <circle [attr.cx]="point.x" [attr.cy]="point.y" r="4.5" class="chart-point"><title>{{ dateLabel(point.date) }}: {{ formatNumber(point.value) }} {{ unit() }}</title></circle>
              }
              @for (tick of dateTicks(); track tick.id) {
                <text [attr.x]="tick.x" y="210" [attr.text-anchor]="tick.anchor" class="axis-text">{{ shortDate(tick.date) }}</text>
              }
            </svg>
          </div>
          <div class="chart-footer"><span>{{ recentSessions().length === 1 ? 'Tu primera sesión' : 'Últimas ' + recentSessions().length + ' sesiones' }}</span><span>{{ metricExplanation() }}</span></div>
          <details class="chart-data">
            <summary>Ver valores del gráfico</summary>
            <table><caption class="sr-only">{{ metricLabel() }} por sesión</caption><thead><tr><th scope="col">Fecha</th><th scope="col">{{ metricLabel() }}</th></tr></thead><tbody>
              @for (session of recentSessions(); track session.id) { <tr><th scope="row">{{ dateLabel(session.date) }}</th><td>{{ formatNumber(session[metric()]) }} {{ unit() }}</td></tr> }
            </tbody></table>
          </details>
        } @else {
          <div class="empty-progress">
            <svg class="empty-icon" viewBox="0 0 44 44" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 8v27h28M15 27l7-8 6 4 8-12"/><circle cx="36" cy="11" r="3"/></svg>
            <h4>Tu progreso empieza con una serie.</h4>
            <p>Registrá este ejercicio y finalizá tu entrenamiento. Acá vas a ver cómo avanzás, sesión a sesión.</p>
            <span class="empty-footnote">Todavía no hay registros de {{ exercise().name.toLocaleLowerCase('es') }}.</span>
          </div>
        }
        <footer class="exercise-meta"><span>Grupo muscular <strong>{{ exercise().muscle }}</strong></span><span>Equipamiento <strong>{{ exercise().equipment }}</strong></span>@if (loadHint(); as hint) { <span>Los kg se anotan <strong>{{ hint }}</strong></span> }</footer>
      </section>

      <section class="tab-panel muscles-panel" role="tabpanel" [id]="prefix() + '-panel-muscles'"
        [attr.aria-labelledby]="prefix() + '-tab-muscles'" [hidden]="activeTab() !== 'muscles'" tabindex="0">
        <div class="panel-heading"><span class="section-kicker">QUÉ TRABAJA</span><h3>Músculos</h3><p>Los que hacen el trabajo principal y los que acompañan el movimiento.</p></div>
        @if (musclesOpened()) { <app-muscle-map [primary]="exercise().primaryMuscles" [secondary]="exercise().secondaryMuscles" /> }
        <dl class="muscle-lists">
          <div><dt><span class="swatch swatch-primary" aria-hidden="true"></span>Principales</dt><dd>{{ primaryNames() }}</dd></div>
          <div><dt><span class="swatch swatch-secondary" aria-hidden="true"></span>Secundarios</dt><dd>{{ secondaryNames() || 'Ninguno para destacar' }}</dd></div>
        </dl>
        <p class="technique-note">Es una guía general: cuánto trabaja cada músculo cambia con la técnica, la carga y cada cuerpo.</p>
      </section>

      <section class="tab-panel history-panel" role="tabpanel" [id]="prefix() + '-panel-history'"
        [attr.aria-labelledby]="prefix() + '-tab-history'" [hidden]="activeTab() !== 'history'" tabindex="0">
        <div class="panel-heading"><span class="section-kicker">CADA SERIE CUENTA</span><h3>Tu historial</h3><p>Las series completadas de este ejercicio, en un solo lugar.@if (loadHint(); as hint) { Los kg se anotan {{ hint }}. }</p></div>
        @if (sessions().length) {
          <div class="history-list">
            @for (session of newestSessions(); track session.id; let first = $first) {
              <details class="history-session" [open]="first">
                <summary><span><strong>{{ dateLabel(session.date) }}</strong><span>{{ session.routineName }}</span></span><span class="history-summary">{{ session.sets.length }} {{ session.sets.length === 1 ? 'serie' : 'series' }} <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m4 6 4 4 4-4"/></svg></span></summary>
                <table><caption class="sr-only">Series de {{ exercise().name }}, {{ dateLabel(session.date) }}</caption><thead><tr><th scope="col">Serie</th><th scope="col">Repeticiones</th><th scope="col">Peso</th></tr></thead><tbody>
                  @for (set of session.sets; track $index) {
                    <tr [class.has-note]="!!set.note"><th scope="row"><span class="completed-dot" aria-label="Completada"></span>{{ set.setNumber }}</th><td>{{ set.reps }}</td><td>{{ formatNumber(set.weight) }} kg</td></tr>
                    @if (set.note) { <tr class="set-note"><td colspan="3"><span class="sr-only">Comentario: </span>{{ set.note }}</td></tr> }
                  }
                </tbody></table>
                <div class="history-total"><span>Volumen de la sesión</span><strong>{{ formatNumber(session.volume) }} kg</strong></div>
              </details>
            }
          </div>
        } @else {
          <div class="empty-progress history-empty"><span class="empty-mark" aria-hidden="true">01</span><h4>La primera sesión está por venir.</h4><p>Al finalizar un entrenamiento con este ejercicio, sus series y cargas aparecerán acá.</p><button type="button" class="inline-action" (click)="selectTab('instructions')">Repasar la técnica <span aria-hidden="true">↗</span></button></div>
        }
      </section>

      <section class="tab-panel instructions-panel" role="tabpanel" [id]="prefix() + '-panel-instructions'"
        [attr.aria-labelledby]="prefix() + '-tab-instructions'" [hidden]="activeTab() !== 'instructions'" tabindex="0">
        <div class="panel-heading"><span class="section-kicker">EL MOVIMIENTO, PASO A PASO</span><h3>Cómo hacerlo</h3><p>Controlá el recorrido y elegí una carga que puedas manejar.</p></div>
        <ol class="instruction-list">@for (instruction of exercise().instructions; track $index) { <li><span class="step-number" aria-hidden="true">{{ ($index + 1).toString().padStart(2, '0') }}</span><p>{{ instruction }}</p></li> }</ol>
        @if (exercise().id === 'bench-press') {
          <a class="source-link" href="https://gymvisual.com/animated-gifs/1519-barbell-bench-press.html" target="_blank" rel="noopener noreferrer"><span class="source-symbol" aria-hidden="true">↗</span><span><strong>Referencia anatómica · Gym Visual</strong><span>Ver el movimiento en otra pestaña</span></span></a>
        }
        <p class="technique-note">Movete dentro de un recorrido cómodo. Detené la serie si sentís dolor.</p>
      </section>
    </article>
  `,
  styles: `
    :host{display:block;color:var(--on-dark);font-family:inherit;--detail-bg:var(--dark);--detail-deep:var(--dark-deep);--detail-surface:var(--dark-panel);--detail-text:var(--on-dark);--detail-muted:var(--muted-on-dark);--detail-accent:var(--accent);--detail-line:var(--line-dark)}
    *,*::before,*::after{box-sizing:border-box}
    button,a,select,summary{-webkit-tap-highlight-color:transparent}
    button,select{font:inherit}
    button,a,summary,select{touch-action:manipulation}
    button{cursor:pointer}
    button:focus-visible,a:focus-visible,select:focus-visible,summary:focus-visible,[tabindex="0"]:focus-visible{outline:2px solid var(--detail-accent);outline-offset:4px}
    button,a,select,summary{transition:background-color 160ms ease-out,color 160ms ease-out,border-color 160ms ease-out}
    .exercise-detail{width:100%;max-width:720px;margin:0 auto;background:var(--detail-bg);border:1px solid var(--detail-line);border-radius:20px;overflow:hidden;color:var(--detail-text)}
    .detail-header{display:flex;gap:17px;align-items:flex-start;padding:28px 30px 23px}
    .back-button{display:grid;place-items:center;flex:0 0 42px;width:42px;height:42px;margin-top:5px;border:1px solid var(--detail-line);border-radius:50%;color:var(--detail-text);background:transparent}
    .back-button:hover{background:var(--detail-surface);border-color:var(--detail-muted)}
    .back-button svg{width:22px;height:22px}
    .heading-copy{min-width:0}.eyebrow,.section-kicker{font-size:10px;font-weight:650;letter-spacing:.13em;line-height:1.6;color:var(--detail-muted)}
    .heading-copy h2{margin:7px 0 7px;font-family:var(--font-display);font-size:26px;font-weight:var(--display-weight,630);letter-spacing:var(--display-tracking,-.035em);text-transform:var(--display-transform,none);line-height:1.2;overflow-wrap:anywhere}
    .heading-copy p{display:flex;flex-wrap:wrap;gap:8px;margin:0;color:var(--detail-muted);font-size:13px;line-height:1.5}
    .detail-tabs{display:flex;padding:0 30px;border-bottom:1px solid var(--detail-line);gap:27px}
    .detail-tabs button{position:relative;min-height:49px;padding:12px 0 15px;color:var(--detail-muted);background:transparent;border:0;font-size:13px;font-weight:600;white-space:nowrap}
    .detail-tabs button:hover{color:var(--detail-text)}.detail-tabs button.is-active{color:var(--detail-accent)}
    .detail-tabs button.is-active::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:2px;background:var(--detail-accent)}
    .tab-panel{padding:26px 30px 0}.tab-panel[hidden]{display:none}
    .reference-panel{background:var(--detail-deep);border:1px solid var(--detail-line);border-radius:12px;padding:18px 20px 17px}
    .reference-top{display:flex;align-items:center;justify-content:space-between;gap:12px}.reference-type{font-size:9px;letter-spacing:.12em;border:1px solid var(--detail-line);padding:3px 6px;border-radius:4px;color:var(--detail-muted)}
    .animation-link{display:flex;align-items:center;gap:17px;min-height:110px;color:var(--detail-text);text-decoration:none;border-radius:8px}
    .animation-link:hover{color:var(--detail-accent)}.animation-link>span:nth-child(2){flex:1}.animation-link strong{display:block;font-weight:600;font-size:17px;line-height:1.35;letter-spacing:-.02em}.animation-link>span>span{display:block;color:var(--detail-muted);font-size:12px;margin-top:6px}
    .play-icon{display:grid;place-items:center;flex-shrink:0;width:54px;height:54px;border:1px solid var(--detail-accent);border-radius:50%;color:var(--detail-accent);background:color-mix(in srgb, var(--accent) 4%, transparent)}.play-icon svg{width:23px;height:23px;margin-left:-3px}
    .external-icon{flex-shrink:0;width:18px;height:18px;color:var(--detail-muted)}.reference-panel>p{margin:0;color:var(--detail-muted);font-size:11px;line-height:1.5}
    .movement-panel{background:var(--detail-deep);border-radius:12px;padding:22px}.movement-panel>p{margin:12px 0 14px;font-size:15px;line-height:1.65;max-width:50ch}
    .inline-action{display:inline-flex;align-items:center;gap:16px;background:none;border:0;padding:10px 0;color:var(--detail-accent);font-size:13px;font-weight:600;text-decoration:none}.inline-action:hover{color:var(--detail-text)}.inline-action>span{font-size:18px}
    .progress-header{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:32px;margin-bottom:22px}h3{font-size:20px;letter-spacing:-.025em;font-weight:600;margin:3px 0 0;line-height:1.3}
    .metric-field{position:relative;display:block;flex-shrink:0}.metric-field select{appearance:none;-webkit-appearance:none;border:1px solid var(--detail-line);border-radius:7px;background:var(--detail-bg);color:var(--detail-text);padding:11px 35px 11px 12px;font-size:12px;min-height:42px;cursor:pointer}.metric-field select:hover{border-color:var(--detail-muted)}.metric-field>svg{position:absolute;pointer-events:none;right:11px;top:14px;width:14px;height:14px;color:var(--detail-muted)}.metric-field option{background:var(--detail-bg)}
    .record-line{display:flex;align-items:flex-end;justify-content:space-between;gap:14px;margin-bottom:14px}.record-label{color:var(--detail-muted);font-size:11px}.record-line p{margin:5px 0 0;line-height:1.2}.record-line p strong{font-size:36px;letter-spacing:-.045em;font-weight:580;font-variant-numeric:tabular-nums}.record-line p>span{color:var(--detail-muted);font-size:14px}.session-count{color:var(--detail-muted);font-size:11px;text-align:right;line-height:1.6;padding-bottom:4px}
    .chart-container{width:100%;margin-top:8px}.progress-chart{display:block;width:100%;height:auto;overflow:visible}.chart-grid{stroke:var(--detail-line);stroke-width:1;stroke-dasharray:3 5}.axis-text{font-family:inherit;font-size:10px;fill:var(--detail-muted)}.chart-line{fill:none;stroke:var(--detail-accent);stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}.chart-point{fill:var(--detail-bg);stroke:var(--detail-accent);stroke-width:2}
    .chart-footer{display:flex;justify-content:space-between;gap:16px;color:var(--detail-muted);font-size:10px;line-height:1.6;margin:7px 0 17px}.chart-footer>span:last-child{text-align:right}
    .chart-data{margin:0 0 8px}.chart-data summary{display:list-item;color:var(--detail-muted);cursor:pointer;font-size:11px;padding:9px 0;min-height:38px}.chart-data summary:hover{color:var(--detail-text)}.chart-data table{margin-top:8px}
    .empty-progress{display:flex;align-items:center;flex-direction:column;text-align:center;padding:23px 12px 32px;background:var(--detail-deep);border-radius:10px}.empty-icon{width:38px;height:38px;color:var(--detail-accent);margin:2px 0 17px}.empty-progress h4{font-size:16px;font-weight:550;letter-spacing:-.015em;margin:0 0 9px;line-height:1.45}.empty-progress p{color:var(--detail-muted);font-size:13px;line-height:1.7;max-width:39ch;margin:0}.empty-footnote{color:var(--detail-muted);font-size:10px;line-height:1.7;margin-top:21px;max-width:42ch}
    .exercise-meta{display:grid;grid-template-columns:1fr 1fr;gap:20px;border-top:1px solid var(--detail-line);margin-top:27px;padding:20px 0 24px}.exercise-meta>span{color:var(--detail-muted);font-size:10px;line-height:1.5}.exercise-meta strong{display:block;color:var(--detail-text);font-size:13px;font-weight:500;margin-top:5px}
    .panel-heading{padding:3px 0 24px}.panel-heading h3{margin-top:5px}.panel-heading>p{color:var(--detail-muted);font-size:13px;line-height:1.7;margin:9px 0 0;max-width:52ch}.history-panel,.instructions-panel,.muscles-panel{padding-bottom:28px}
    .muscle-lists{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin:22px 0 0;padding-top:20px;border-top:1px solid var(--detail-line)}.muscle-lists div{min-width:0}.muscle-lists dt{display:flex;align-items:center;gap:8px;color:var(--detail-muted);font-size:11px;line-height:1.5}.muscle-lists dd{margin:6px 0 0;color:var(--detail-text);font-size:14px;font-weight:500;line-height:1.45}
    .swatch{flex-shrink:0;width:12px;height:12px;border-radius:3px}.swatch-primary{background:var(--detail-accent)}.swatch-secondary{border:1.5px solid var(--detail-accent);background:color-mix(in srgb,var(--detail-accent) 16%,transparent)}
    .history-list{border-top:1px solid var(--detail-line)}.history-session{border-bottom:1px solid var(--detail-line)}.history-session>summary{list-style:none;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:20px 0;cursor:pointer}.history-session>summary::-webkit-details-marker{display:none}.history-session>summary>span:first-child{display:flex;flex-direction:column;gap:6px}.history-session>summary strong{font-size:14px;font-weight:550}.history-session>summary>span>span{color:var(--detail-muted);font-size:11px}.history-summary{display:flex;gap:14px;align-items:center;flex-shrink:0;color:var(--detail-muted);font-size:11px}.history-summary svg{width:15px;height:15px;transition:transform 160ms ease-out}.history-session[open] .history-summary svg{transform:rotate(180deg)}
    table{border-collapse:collapse;width:100%;font-size:12px;font-variant-numeric:tabular-nums}th,td{padding:11px 10px;text-align:right;border-bottom:1px solid var(--detail-line)}th:first-child,td:first-child{text-align:left;padding-left:0}th:last-child,td:last-child{padding-right:0}thead th{font-weight:500;color:var(--detail-muted);font-size:10px}tbody th{font-weight:500}.completed-dot{display:inline-block;width:5px;height:5px;vertical-align:middle;border-radius:50%;background:var(--detail-accent);margin-right:12px}tr.has-note>*{border-bottom:0}.set-note td{padding:0 0 11px;text-align:left;color:var(--detail-muted);font-size:12px;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}.history-total{display:flex;justify-content:space-between;gap:18px;padding:16px 0 20px;font-size:11px;color:var(--detail-muted)}.history-total strong{font-size:12px;color:var(--detail-text);font-weight:500}.history-empty{margin-top:3px;padding-top:28px}.empty-mark{font-size:39px;font-weight:400;letter-spacing:-.06em;color:var(--detail-accent);margin-bottom:18px;line-height:1}.history-empty .inline-action{margin-top:14px}
    .instruction-list{list-style:none;padding:0;margin:0}.instruction-list li{display:flex;align-items:flex-start;gap:20px;padding:22px 0;border-top:1px solid var(--detail-line)}.step-number{color:var(--detail-accent);font-size:14px;font-variant-numeric:tabular-nums;font-weight:500;line-height:1.75;padding-top:1px;min-width:22px}.instruction-list p{margin:0;color:var(--detail-text);font-size:14px;line-height:1.75;max-width:56ch}
    .source-link{display:flex;align-items:center;gap:16px;text-decoration:none;color:var(--detail-text);border:1px solid var(--detail-line);border-radius:9px;padding:17px 18px;margin-top:14px}.source-link:hover{border-color:var(--detail-accent);background:var(--detail-surface)}.source-symbol{font-size:24px;color:var(--detail-accent)}.source-link>span:last-child{display:flex;flex-direction:column;gap:6px}.source-link strong{font-weight:550;font-size:12px}.source-link>span>span{font-size:11px;color:var(--detail-muted)}.technique-note{color:var(--detail-muted);font-size:11px;line-height:1.7;margin:24px 0 0;max-width:58ch}
    .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    @media(max-width:540px){.exercise-detail{border-radius:16px}.detail-header{padding:22px 20px 20px;gap:12px}.back-button{flex-basis:36px;width:36px;height:36px}.heading-copy h2{font-size:23px}.eyebrow{font-size:9px}.detail-tabs{padding:0 20px;gap:18px}.detail-tabs button{font-size:12px}.tab-panel{padding:22px 20px 0}.history-panel,.instructions-panel,.muscles-panel{padding-bottom:24px}.muscle-lists{gap:14px}.muscle-lists dd{font-size:13px}.reference-panel{padding:16px}.reference-type{font-size:8px}.section-kicker{font-size:9px}.animation-link{gap:12px;min-height:112px}.animation-link strong{font-size:15px}.play-icon{width:44px;height:44px}.animation-link>span>span{font-size:11px}.external-icon{width:16px;height:16px}.reference-panel>p{font-size:10px}.progress-header{margin-top:28px;gap:10px}h3{font-size:18px}.metric-field select{padding-left:10px;font-size:11px}.record-line p strong{font-size:32px}.session-count{max-width:100px}.chart-footer{font-size:9px}.empty-progress{padding:24px 14px}.empty-progress h4{font-size:15px}.empty-progress p{font-size:12px}.instruction-list li{gap:15px}.instruction-list p{font-size:13px}.source-link{padding:15px 13px}.source-link strong{font-size:11px}}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{transition:none!important;scroll-behavior:auto!important}}
  `,
})
export class ExerciseDetailComponent {
  readonly exercise = input.required<Exercise>();
  /** Dentro de una hoja que ya trae su propio botón para volver (la ficha abierta desde la sesión). */
  readonly embedded = input(false);
  @Output() readonly closed = new EventEmitter<void>();
  readonly store = inject(WorkoutStore);
  readonly activeTab = signal<DetailTab>('overview');
  readonly metric = signal<Metric>('weight');
  readonly tabs: { id: DetailTab; label: string }[] = [
    { id: 'overview', label: 'Resumen' },
    { id: 'muscles', label: 'Músculos' },
    { id: 'history', label: 'Historial' },
    { id: 'instructions', label: 'Técnica' },
  ];
  /** El mapa se dibuja (y su archivo se descarga) recién la primera vez que se abre la solapa. */
  readonly musclesOpened = signal(false);
  /** Qué representa el número de Kg en este ejercicio ("por mancuerna", "con la barra incluida") o ''. */
  readonly loadHint = computed(() => loadHint(this.exercise().equipment));
  readonly primaryNames = computed(() => muscleSentence(this.exercise().primaryMuscles));
  readonly secondaryNames = computed(() => muscleSentence(this.exercise().secondaryMuscles));
  readonly prefix = computed(() => `exercise-detail-${this.exercise().id}`);
  readonly sessions = computed<ExerciseSession[]>(() => this.store.history()
    .map((workout) => {
      const sets = workout.sets.filter((set) => set.exerciseId === this.exercise().id && set.completed);
      return {
        id: workout.id, date: workout.finishedAt ?? workout.startedAt, routineName: workout.routineName, sets,
        weight: sets.reduce((highest, set) => Math.max(highest, set.weight), 0),
        volume: sets.reduce((total, set) => total + set.weight * set.reps, 0),
        reps: sets.reduce((total, set) => total + set.reps, 0),
      };
    })
    .filter((session) => session.sets.length > 0)
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date)));
  readonly newestSessions = computed(() => [...this.sessions()].reverse());
  readonly recentSessions = computed(() => this.sessions().slice(-12));
  readonly metricLabel = computed(() => ({ weight: 'Mayor peso', volume: 'Volumen', reps: 'Repeticiones' })[this.metric()]);
  readonly bestLabel = computed(() => ({ weight: 'Mayor peso registrado', volume: 'Mayor volumen en una sesión', reps: 'Más repeticiones en una sesión' })[this.metric()]);
  readonly unit = computed(() => this.metric() === 'reps' ? 'reps' : 'kg');
  readonly metricExplanation = computed(() => ({ weight: 'Carga máxima por sesión', volume: 'Peso × repeticiones completadas', reps: 'Total de repeticiones completadas' })[this.metric()]);
  readonly bestValue = computed(() => this.sessions().reduce((best, session) => Math.max(best, session[this.metric()]), 0));
  readonly chartMaximum = computed(() => {
    const maximum = this.recentSessions().reduce((best, session) => Math.max(best, session[this.metric()]), 0);
    if (!maximum) return 1;
    const magnitude = 10 ** Math.floor(Math.log10(maximum));
    return Math.ceil(maximum / magnitude * 2) / 2 * magnitude;
  });
  readonly chartTicks = computed(() => Array.from({ length: 4 }, (_, index) => ({ value: this.chartMaximum() * (3 - index) / 3, y: 20 + index * 54 })));
  readonly chartPoints = computed(() => this.recentSessions().map((session, index, entries) => ({
    id: session.id, date: session.date, value: session[this.metric()],
    x: entries.length === 1 ? 313 : 48 + index / (entries.length - 1) * 530,
    y: 182 - session[this.metric()] / this.chartMaximum() * 162,
  })));
  readonly chartLine = computed(() => this.chartPoints().map((point) => `${point.x},${point.y}`).join(' '));
  readonly dateTicks = computed(() => {
    const points = this.chartPoints();
    if (!points.length) return [];
    const indices = [...new Set([0, Math.floor((points.length - 1) / 2), points.length - 1])];
    return indices.map((index) => ({ ...points[index], anchor: points.length === 1 ? 'middle' : index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle' }));
  });

  constructor() {
    effect(() => { if (this.activeTab() === 'muscles') this.musclesOpened.set(true); });
  }

  setMetric(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === 'weight' || value === 'volume' || value === 'reps') this.metric.set(value);
  }

  selectTab(tab: DetailTab): void {
    this.activeTab.set(tab);
    document.getElementById(`${this.prefix()}-tab-${tab}`)?.focus();
  }

  onTabKeydown(event: KeyboardEvent, index: number): void {
    let next = index;
    if (event.key === 'ArrowRight') next = (index + 1) % this.tabs.length;
    else if (event.key === 'ArrowLeft') next = (index + this.tabs.length - 1) % this.tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = this.tabs.length - 1;
    else return;
    event.preventDefault();
    this.selectTab(this.tabs[next].id);
  }

  formatNumber(value: number): string { return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 }).format(value); }
  compactNumber(value: number): string { return new Intl.NumberFormat('es-AR', { notation: value >= 10_000 ? 'compact' : 'standard', maximumFractionDigits: value < 10 ? 1 : 0 }).format(value); }
  dateLabel(value: string): string { return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)); }
  shortDate(value: string): string { return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short' }).format(new Date(value)); }
}
