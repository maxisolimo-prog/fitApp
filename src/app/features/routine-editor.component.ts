import { Component, EventEmitter, Input, Output, computed, inject, signal, type OnChanges, type OnDestroy, type OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Exercise, FitnessLevel, MuscleId, Routine, RoutineCategory, RoutineExercise, TrainingPlace } from '../core/models';
import { BackClose, type BackLayer } from '../back-close';
import { loadHint } from '../load-hint';
import { muscleSentence } from '../core/muscles';
import {
  PROPOSAL_MINUTES, ROUTINE_TARGETS, ROUTINE_TARGET_LABELS, TRAINING_FOCUS_LABELS, TRAINING_PLACE_LABELS,
  availableAt, buildRoutineProposal, defaultPrescription, routineMuscles, type RoutineTarget,
} from '../core/routine-builder';
import { WorkoutStore } from '../core/workout-store';
import { estimateRoutineMinutes } from '../core/workout-utils';
import { ExerciseThumbComponent } from './exercise-thumb.component';
import { ExerciseFavoriteComponent } from './exercise-favorite.component';
import { MOVEMENT_LABELS } from '../core/movements';
import { replaceRoutineExercise, canUndoRoutineReplacement, undoRoutineReplacement, type RoutineReplacementUndo } from '../core/routine-replacement';
import { MuscleMapComponent } from './muscle-map.component';
import { AiRoutineComponent } from './ai-routine.component';
import { BRAND } from '../brands/brand.token';

/** Same bound as validateRoutine in workout-utils: generous, not a product limit. */
const MAX_EXERCISES = 50;

@Component({
  selector: 'app-routine-editor',
  standalone: true,
  imports: [FormsModule, ExerciseThumbComponent, ExerciseFavoriteComponent, MuscleMapComponent, AiRoutineComponent],
  template: `
    <section class="routine-editor" aria-labelledby="routine-editor-title" [inert]="pickerOpen() || leaveAsk()">
      <header class="editor-header">
        <div>
          <p class="eyebrow">{{ eyebrow }}</p>
          <h2 id="routine-editor-title">{{ title }}</h2>
          <p class="intro">{{ intro }}</p>
        </div>
        <button class="text-button" type="button" (click)="requestLeave()">Volver a mis rutinas</button>
      </header>

      <form #routineForm="ngForm" (ngSubmit)="save()" (keydown.enter)="formEnter($event)" novalidate>
        <p class="sr-only" role="status" aria-atomic="true">{{ announcement() }}</p>
        @if (builderOpen()) {
          <div class="builder" role="group" aria-labelledby="builder-title">
            <h3 id="builder-title" tabindex="-1">Te armamos una propuesta</h3>
            <fieldset class="choice">
              <legend>¿Qué querés trabajar?</legend>
              <div class="choice-options targets">
                @for (option of targets; track option) {
                  <label class="choice-chip">
                    <input type="radio" name="builderTarget" [value]="option" [checked]="builderTarget() === option" (change)="builderTarget.set(option)" (keydown.enter)="builderEnter($event)">
                    <span>{{ targetLabels[option] }}</span>
                  </label>
                }
              </div>
            </fieldset>
            <fieldset class="choice">
              <legend>¿Cuánto tiempo tenés?</legend>
              <div class="choice-options minutes">
                @for (option of minuteOptions; track option) {
                  <label class="choice-chip">
                    <input type="radio" name="builderMinutes" [value]="option" [checked]="builderMinutes() === option" (change)="builderMinutes.set(option)" (keydown.enter)="builderEnter($event)">
                    <span>{{ option }} min</span>
                  </label>
                }
              </div>
            </fieldset>
            <div class="builder-fields">
              <label class="field">
                <span>¿Dónde entrenás?</span>
                <select name="builderPlace" (change)="setPlace($any($event.target).value)">
                  @for (option of placeOptions; track option) { <option [value]="option" [selected]="place() === option">{{ placeLabels[option] }}</option> }
                </select>
              </label>
              <label class="field">
                <span>Tu nivel</span>
                <select name="builderLevel" [(ngModel)]="level">@for (option of levels; track option) { <option [ngValue]="option">{{ option }}</option> }</select>
              </label>
            </div>
            <p class="builder-result" role="status" aria-atomic="true">
              @if (proposal().exercises.length) {
                <strong>{{ proposal().exercises.length }} {{ proposal().exercises.length === 1 ? 'ejercicio' : 'ejercicios' }}, <span aria-hidden="true">≈ </span><span class="sr-only">unos </span>{{ proposal().minutes }} min.</strong>
                @if (proposalShort()) { <span> No llega a {{ builderMinutes() }} min: el catálogo no tiene más ejercicios de esta zona{{ place() === 'gimnasio' ? '' : ' para ' + placeLabels[place()].toLowerCase() }}.</span> }
                <span> Series y descansos para {{ focusLabel }}.</span>
              } @else {
                El catálogo no tiene ejercicios de {{ targetLabels[builderTarget()].toLowerCase() }} para hacer en {{ placeLabels[place()].toLowerCase() }}. Probá con otra zona o con otro lugar.
              }
            </p>
            <div class="builder-actions">
              <button type="button" class="primary-button" (click)="applyProposal()" [disabled]="!proposal().exercises.length">{{ entries.length ? 'Reemplazar la lista' : 'Armar propuesta' }}</button>
              @if (entries.length) { <button type="button" class="secondary-button" (click)="closeBuilder()">No reemplazar</button> }
            </div>
            <p class="builder-basis">Son ejercicios del catálogo, con valores generales de partida. El objetivo sale de tu perfil y se cambia en Perfil y datos. Las cargas las ponés vos al entrenar.</p>
          </div>
        }

        @if(builderOpen() && brand.features.aiCoach){<app-ai-routine [level]="level" [place]="place()" [minutes]="builderMinutes()" [hasEntries]="entries.length>0" (proposed)="applyAiProposal($event)" />}
        @if (entries.length || !builderOpen()) {
          <div class="exercise-heading">
            <h3 id="exercises-title" tabindex="-1">Ejercicios</h3>
            <span class="exercise-count">{{ entries.length }} {{ entries.length === 1 ? 'ejercicio' : 'ejercicios' }}@if (entries.length) { <span> · <span aria-hidden="true">≈ </span><span class="sr-only">unos </span>{{ estimate }} min</span> }</span>
          </div>
          <p class="exercise-help">{{ showWeights() ? 'Kg de arranque; 0 para peso corporal.' : 'La carga la ponés al entrenar y queda guardada para la próxima.' }} La duración se estima con tus series y descansos.</p>
          @if (proposalNote()) {
            <div class="proposal-note">
              <p><strong>Es una propuesta general</strong> con ejercicios del catálogo. Cambiá, sacá o agregá lo que quieras antes de guardar.</p>
              @if (undoEntries) { <button type="button" class="text-button" (click)="undoProposal()">Volver a la lista anterior</button> }
            </div>
          }
          @if ((!routine && !builderOpen()) || (entries.length && !showWeights())) {
            <div class="list-tools">
              @if (!routine && !builderOpen()) { <button type="button" id="builder-open" class="text-button" (click)="openBuilder()">{{ builderLink }}</button> }
              @if (entries.length && !showWeights()) { <button type="button" class="text-button" (click)="revealWeights()">Cargar kilos de arranque</button> }
            </div>
          }
        }

        <ol class="exercise-list" (input)="listEdited()">
          @for (entry of entries; track $index; let i = $index; let first = $first; let last = $last) {
            <li class="exercise-row">
              <fieldset>
                <legend class="sr-only">{{ exerciseName(entry.exerciseId) }}</legend>
                <div class="exercise-top">
                  <span class="row-number" aria-hidden="true">{{ i + 1 }}</span>
                  <div class="exercise-title"><strong><span class="title-number" aria-hidden="true">{{ i + 1 }}. </span>{{ exerciseName(entry.exerciseId) }}</strong><small>{{ exerciseMeta(entry.exerciseId) }}</small></div>
                  <div class="row-tools">
                    <button type="button" class="tool-button" (click)="move(i, -1)" [disabled]="first" [attr.aria-label]="'Subir ' + exerciseName(entry.exerciseId)" title="Subir">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>
                    </button>
                    <button type="button" class="tool-button" (click)="move(i, 1)" [disabled]="last" [attr.aria-label]="'Bajar ' + exerciseName(entry.exerciseId)" title="Bajar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
                    </button>
                    <button type="button" class="tool-button remove" (click)="removeExercise(i)" [attr.aria-label]="'Quitar ' + exerciseName(entry.exerciseId)" title="Quitar">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/></svg>
                    </button>
                  </div>
                </div>
                @if (exerciseById(entry.exerciseId)?.tracking !== 'duration') {
                  <label class="tracking-field">Registrar por
                    <select [name]="'tracking-' + i" [ngModel]="entry.durationSeconds === undefined ? 'reps' : 'duration'" (ngModelChange)="setTracking(entry, $event)">
                      <option value="reps">Repeticiones</option><option value="duration">Tiempo</option>
                    </select>
                  </label>
                }
                <div class="exercise-numbers" [class.with-weights]="showWeights() && entry.durationSeconds === undefined">
                  <label class="field"><span>Series</span><input type="number" [name]="'sets-' + i" [(ngModel)]="entry.sets" min="1" max="30" step="1" required inputmode="numeric" [attr.aria-invalid]="attempted && !integerInRange(entry.sets, 1, 30)"></label>
                  @if (entry.durationSeconds !== undefined) {
                    <label class="field"><span>Tiempo ({{ durationUnit(entry) === 60 ? 'min' : 's' }})</span><input type="number" [name]="'duration-' + i" [ngModel]="entry.durationSeconds / durationUnit(entry)" (ngModelChange)="setDuration(entry, $event)" min="0.01" [max]="36000 / durationUnit(entry)" step="any" required inputmode="decimal" [attr.aria-invalid]="attempted && !integerInRange(entry.durationSeconds, 1, 36000)"></label>
                  } @else {
                    <label class="field"><span>Reps</span><input type="number" [name]="'reps-' + i" [(ngModel)]="entry.reps" min="1" max="999" step="1" required inputmode="numeric" [attr.aria-invalid]="attempted && !integerInRange(entry.reps, 1, 999)"></label>
                  }
                  @if (showWeights() && entry.durationSeconds === undefined) {
                    <label class="field"><span>Kg</span><input class="weight-input" type="number" [name]="'weight-' + i" [(ngModel)]="entry.weight" min="0" max="2000" step="0.5" required inputmode="decimal" [attr.aria-invalid]="attempted && !numberInRange(entry.weight, 0, 2000)"></label>
                  }
                  <label class="field"><span>Descanso (s)</span><input type="number" [name]="'rest-' + i" [(ngModel)]="entry.restSeconds" min="0" max="3600" step="5" required inputmode="numeric" [attr.aria-invalid]="attempted && !integerInRange(entry.restSeconds, 0, 3600)"></label>
                </div>
                @if (attempted && !validEntry(entry)) {
                  <p class="row-error" role="alert">Revisá los valores: 1–30 series, {{ entry.durationSeconds === undefined ? '1–999 repeticiones y 0–2.000 kg' : '1 segundo a 600 minutos por serie' }}, y hasta 3.600 s de descanso.</p>
                }
                <div class="row-actions">
                  <button type="button" class="text-button" [attr.data-replace-id]="entry.exerciseId" [attr.aria-label]="'Cambiar ' + exerciseName(entry.exerciseId)" aria-haspopup="dialog" (click)="openReplacement(entry.exerciseId)">Cambiar ejercicio</button>
                  @if (replacementUndo; as undo) {
                    @if (undo.after.exerciseId === entry.exerciseId && canUndoReplacement()) {
                      <button type="button" class="text-button" (click)="undoReplacement()">Volver a {{ exerciseName(undo.before.exerciseId) }}</button>
                    }
                  }
                </div>
              </fieldset>
            </li>
          }
        </ol>

        @if (!entries.length && !builderOpen()) { <p class="empty-exercises">Todavía no elegiste ejercicios. Agregá los que vas a hacer.</p> }
        @if (!entries.length && builderOpen()) { <p class="or-manual">¿Ya sabés qué querés hacer?</p> }
        <button type="button" class="add-button" (click)="openPicker()" [disabled]="!canAdd">
          <span aria-hidden="true">＋</span> {{ !entries.length && builderOpen() ? 'Elegir yo los ejercicios' : 'Agregar ejercicios' }}
        </button>

        @if (entries.length) {
          <div class="muscles">
            <p><strong>Qué trabaja:</strong> {{ muscleSummary.primaryText }}.@if (muscleSummary.secondaryText) { <span> También ayudan: {{ muscleSummary.secondaryText }}.</span> }</p>
            <button type="button" class="text-button" [attr.aria-expanded]="mapOpen()" aria-controls="routine-muscle-map" (click)="mapOpen.set(!mapOpen())">{{ mapOpen() ? 'Ocultar el mapa' : 'Ver en el mapa' }}</button>
            <div id="routine-muscle-map">
              @if (mapOpen()) {
                <div class="muscle-panel">
                  <app-muscle-map [primary]="muscleSummary.primary" [secondary]="muscleSummary.secondary" />
                  <p class="legend">Relleno: músculos principales. Contorno: los que ayudan. Es una guía general, no una medición.</p>
                </div>
              }
            </div>
          </div>
        }

        @if (showDetails) {
          <div class="details">
            <h3>Datos de la rutina</h3>
            <div class="details-grid">
              <label class="field name-field">
                <span>Nombre de la rutina <span aria-hidden="true">*</span></span>
                <input name="routineName" [(ngModel)]="name" #nameInput="ngModel" required maxlength="80"
                  placeholder="Por ejemplo, mi día de fuerza" autocomplete="off"
                  [attr.aria-invalid]="(nameInput.touched || attempted) && !name.trim()" aria-describedby="name-error">
                <small id="name-error" class="field-error">@if ((nameInput.touched || attempted) && !name.trim()) { Escribí un nombre para encontrarla después. }</small>
              </label>
              <label class="field">
                <span>Enfoque</span>
                <select name="category" [(ngModel)]="category">@for (option of categories; track option) { <option [ngValue]="option">{{ option }}</option> }</select>
              </label>
              <label class="field">
                <span>Nivel</span>
                <select name="level" [(ngModel)]="level" [attr.aria-describedby]="levelChanged ? 'level-hint' : null">@for (option of levels; track option) { <option [ngValue]="option">{{ option }}</option> }</select>
                @if (levelChanged) { <small id="level-hint" class="field-hint">Las series de la lista no cambian solas. Para ajustarlas a este nivel, armá otra propuesta.</small> }
              </label>
              <label class="field description-field">
                <span>Descripción <span class="optional">(opcional)</span></span>
                <textarea name="description" [(ngModel)]="description" maxlength="300" rows="2" placeholder="Qué querés trabajar en esta sesión"></textarea>
              </label>
            </div>
          </div>
        }

        @if (saveError) { <p class="save-error" role="alert">{{ saveError }}</p> }
        <footer class="editor-footer">
          <p>{{ routine && !routine.custom ? 'Se guardará como una nueva rutina. La plantilla original se conserva.' : 'Podés volver a editar tu rutina cuando quieras.' }}</p>
          <div class="footer-actions">
            <button type="button" class="secondary-button" (click)="requestLeave()">Cancelar</button>
            @if (entries.length || routine) { <button type="submit" class="primary-button">Guardar rutina</button> }
          </div>
        </footer>
      </form>
    </section>

    @if (leaveAsk()) {
      <div class="overlay" (click)="stay()" aria-hidden="true"></div>
      <div class="dialog" role="alertdialog" aria-modal="true" aria-labelledby="leave-title" aria-describedby="leave-desc" (keydown.escape)="stay()">
        <h2 id="leave-title">¿Salir sin guardar la rutina?</h2>
        <p id="leave-desc">Se pierden los cambios que hiciste en esta rutina.</p>
        <div class="actions">
          <button type="button" id="leave-stay" class="btn btn-secondary" (click)="stay()">Seguir editando</button>
          <button type="button" class="btn btn-danger" (click)="confirmLeave()">Salir sin guardar</button>
        </div>
      </div>
    }

    @if (pickerOpen()) {
      <div class="picker-overlay" (click)="closePicker()" aria-hidden="true"></div>
      <div class="picker" role="dialog" aria-modal="true" aria-labelledby="picker-title" (keydown.escape)="closePicker()">
        <header class="picker-header">
          <h3 id="picker-title">{{ replacingId() ? 'Elegí un reemplazo' : 'Elegí ejercicios' }}</h3>
          <button type="button" class="tool-button" (click)="closePicker()" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>
          </button>
        </header>
        @if (replacingId(); as fromId) {
          <p class="replacement-context">Para {{ exerciseName(fromId) }}. Mismo movimiento: {{ replacementMovement() }}. Se conservan series, repeticiones o tiempo y descanso; la carga del nuevo ejercicio empieza en 0.</p>
        }
        <label class="picker-search">
          <span class="sr-only">Buscar ejercicio</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0"/></svg>
          <input id="picker-search-input" type="search" [value]="pickerSearch()" (input)="pickerSearch.set($any($event.target).value)" placeholder="Buscá por nombre, músculo o equipo" autocomplete="off">
        </label>
        @if (!replacingId()) { <div class="picker-chips" role="group" aria-label="Filtrar por grupo muscular">
          @for (option of muscles(); track option) {
            <button type="button" class="chip" [class.is-active]="pickerMuscle() === option" [attr.aria-pressed]="pickerMuscle() === option" (click)="pickerMuscle.set(option)">{{ option }}</button>
          }
        </div> }
        <label class="picker-place"><input type="checkbox" [checked]="pickerFavoritesOnly()" (change)="pickerFavoritesOnly.set($any($event.target).checked)"><span>Solo favoritos ({{ store.favoriteExerciseIds().length }})</span></label>
        @if (place() !== 'gimnasio') {
          <label class="picker-place">
            <input type="checkbox" [checked]="pickerPlaceOnly()" (change)="pickerPlaceOnly.set($any($event.target).checked)">
            <span>{{ placeFilterLabel }}</span>
          </label>
        }
        <ul class="picker-list">
          @for (exercise of pickerExercises(); track exercise.id) {
            <li class="picker-exercise-row">
              <button type="button" class="picker-item" [class.is-picked]="picked().has(exercise.id)" [class.is-used]="isUsed(exercise.id)"
                [disabled]="isUsed(exercise.id)" [attr.aria-pressed]="replacingId() ? null : picked().has(exercise.id)" (click)="replacingId() ? chooseReplacement(exercise.id) : togglePick(exercise.id)">
                <app-exercise-thumb [exercise]="exercise" />
                <span class="picker-text"><strong>{{ exercise.name }}</strong><small>{{ exercise.muscle }} · {{ exercise.equipment }}{{ isUsed(exercise.id) ? ' · ya está en la rutina' : '' }}</small></span>
                @if (replacingId()) { <svg class="replacement-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg> }
                @else { <span class="picker-check" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m5 12 4 4L19 6"/></svg>
                </span> }
              </button>
              <app-exercise-favorite [exerciseId]="exercise.id" [exerciseName]="exercise.name" />
            </li>
          } @empty {
            <li class="picker-empty">{{ replacingId() ? 'No hay reemplazos del mismo movimiento con estos filtros.' : 'No encontramos ejercicios con esos filtros.' }}@if (pickerFavoritesOnly()) { <span> Desactivá «Solo favoritos» o marcá ejercicios con la estrella en la Biblioteca.</span> }@if (place() !== 'gimnasio' && pickerPlaceOnly()) { <span> Destildá «{{ placeFilterLabel }}» para ver todo el catálogo.</span> }</li>
          }
        </ul>
        <footer class="picker-footer">
          <button type="button" class="secondary-button" (click)="closePicker()">Cancelar</button>
          @if (!replacingId()) { <button type="button" class="primary-button" (click)="confirmPick()" [disabled]="!picked().size">
            {{ picked().size ? 'Agregar ' + picked().size + (picked().size === 1 ? ' ejercicio' : ' ejercicios') : 'Elegí al menos uno' }}
          </button> }
        </footer>
      </div>
    }
  `,
  styles: [`
    :host{display:block;min-width:0;color:var(--ink);font-family:inherit}
    *{box-sizing:border-box}.routine-editor{max-width:980px;margin:0 auto}
    .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    .editor-header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-bottom:26px}
    .eyebrow{font-size:10px;letter-spacing:.14em;font-weight:700;color:var(--ink-2);margin:0 0 10px}
    h2{font-family:var(--font-display);font-size:30px;letter-spacing:var(--display-tracking,-1px);line-height:1.2;font-weight:var(--display-weight,700);text-transform:var(--display-transform,none);margin:0 0 10px}h3{font-size:19px;font-weight:600;letter-spacing:-.4px;margin:0}
    .intro,.exercise-help{color:var(--ink-2);font-size:13px;line-height:1.6;margin:0}.exercise-help{max-width:68ch;margin-bottom:14px}
    button,input,select,textarea{font:inherit}button{cursor:pointer;transition:background .16s,color .16s,border-color .16s}button:disabled{cursor:not-allowed;opacity:.45}
    .text-button{background:none;border:0;padding:8px 0;color:var(--ink);font-size:13px;white-space:nowrap;text-decoration:underline;text-underline-offset:4px;min-height:44px}
    .builder{margin:0 0 26px;padding:18px 16px 16px;border:1px solid var(--line);border-radius:var(--radius);background:var(--surface);min-width:0}
    .builder h3:focus,.exercise-heading h3:focus{outline:none}
    .choice{margin:14px 0 0;padding:0;border:0;min-width:0}.choice legend{padding:0;margin-bottom:6px;font-size:13px;font-weight:600;line-height:1.4}
    .choice-options{display:flex;flex-wrap:wrap;gap:8px}
    .choice-chip{position:relative;display:flex}
    .choice-chip input{position:absolute;inset:0;width:100%;height:100%;min-height:0;margin:0;padding:0;border:0;opacity:0;cursor:pointer}
    .choice-chip span{display:flex;align-items:center;justify-content:center;width:100%;min-height:44px;padding:8px 16px;border-radius:999px;border:1px solid var(--line-strong);background:var(--surface);color:var(--ink);font-size:14px;font-weight:500;line-height:1.3;text-align:center;transition:background .16s,color .16s,border-color .16s}
    .choice-chip:hover span{border-color:var(--ink)}
    .choice-chip input:checked+span{background:var(--dark);border-color:var(--dark);color:var(--on-dark);font-weight:600}
    .choice-chip input:focus-visible+span{outline:2px solid var(--ink);outline-offset:3px}
    @media(forced-colors:active){.choice-chip input:checked+span::before{content:"✓";margin-right:6px}}
    .builder-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:14px;max-width:420px}.builder-fields .field>span{font-size:13px}
    .builder-result{margin:12px 0 0;font-size:14px;line-height:1.5;color:var(--ink)}.builder-result strong{font-variant-numeric:tabular-nums}
    .field-hint{font-size:11px;line-height:1.4;color:var(--ink-2)}
    .title-number{display:none}
    .builder-actions{display:flex;flex-wrap:wrap;gap:10px;margin-top:10px}
    .builder-basis{margin:12px 0 0;max-width:68ch;font-size:12px;line-height:1.6;color:var(--ink-2)}
    .proposal-note{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:4px 16px;margin:0 0 12px;padding:6px 14px;border-radius:var(--radius);background:var(--bg-tint);color:var(--ink);font-size:13px;line-height:1.5}
    .proposal-note p{margin:6px 0}
    .list-tools{display:flex;flex-wrap:wrap;gap:0 22px;margin:-8px 0 8px}
    .or-manual{margin:0 0 -2px;font-size:13px;line-height:1.5;color:var(--ink-2)}
    .muscles{margin-top:18px;font-size:13px;line-height:1.6;color:var(--ink-2)}.muscles p{margin:0}.muscles strong{color:var(--ink)}
    .muscle-panel{margin-top:6px;padding:16px 12px 14px;border-radius:var(--radius);background:var(--dark);color:var(--on-dark)}
    .muscle-panel .legend{margin:8px auto 0;max-width:44ch;font-size:12px;line-height:1.5;text-align:center;color:var(--muted-on-dark)}
    .details{border-top:1px solid var(--line);margin-top:24px;padding-top:22px}
    .details-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px 20px;margin-top:14px}
    .name-field,.description-field{grid-column:span 2}.field{display:flex;flex-direction:column;gap:6px;min-width:0}
    .field>span{font-size:12px;font-weight:600;line-height:1.4}.optional{font-weight:400;color:var(--ink-2)}
    input,select,textarea{width:100%;min-width:0;border:1px solid var(--line-strong);background:var(--surface);border-radius:var(--radius-field);color:var(--ink);outline:none;padding:10px 12px;font-size:15px;line-height:1.4;min-height:44px}
    textarea{resize:vertical;min-height:64px}input:focus,select:focus,textarea:focus{border-color:var(--ink);box-shadow:0 0 0 3px color-mix(in srgb, var(--strong) 18%, transparent)}
    [aria-invalid=true]{border-color:var(--danger)}.field-error{color:var(--danger);font-size:11px;line-height:1.4}.field-error:empty{display:none}
    .exercise-heading{display:flex;justify-content:space-between;align-items:baseline;gap:20px;margin:0 0 4px}
    .exercise-count{font-size:13px;color:var(--ink-2);font-variant-numeric:tabular-nums;white-space:nowrap}
    .exercise-list{list-style:none;margin:0;padding:0;display:grid;gap:10px}
    .exercise-row fieldset{margin:0;padding:14px 16px;border:1px solid var(--line);border-radius:var(--radius);background:var(--surface);min-width:0}
    .exercise-top{display:flex;align-items:center;gap:12px}
    .row-number{display:grid;place-items:center;flex-shrink:0;width:28px;height:28px;border-radius:50%;background:var(--bg);font-size:12px;font-weight:700;color:var(--strong)}
    .exercise-title{flex:1;min-width:0;display:flex;flex-direction:column}.exercise-title strong{font-size:15px}.exercise-title small{font-size:12px;color:var(--ink-2)}
    .row-tools{display:flex;gap:2px;flex-shrink:0}
    .tool-button{display:grid;place-items:center;width:40px;height:40px;border:0;border-radius:10px;background:transparent;color:var(--ink-2)}
    .tool-button:hover:not(:disabled){background:var(--bg);color:var(--ink)}.tool-button.remove:hover{background:var(--danger-bg);color:var(--danger)}.tool-button svg{width:20px;height:20px}
    .exercise-numbers{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px}.exercise-numbers.with-weights{grid-template-columns:repeat(4,1fr)}.exercise-numbers .field{justify-content:flex-end}
    .exercise-numbers input{background:var(--bg);font-variant-numeric:tabular-nums;text-align:center}
    .row-error{color:var(--danger);font-size:12px;margin:10px 0 0;line-height:1.5}
    .add-button{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;border:1.5px dashed var(--strong);border-radius:12px;background:transparent;color:var(--ink);min-height:52px;margin-top:12px;font-size:15px;font-weight:600}
    .add-button:hover:not(:disabled){background:var(--bg-tint)}.add-button span{font-size:20px;font-weight:400}
    .empty-exercises{padding:20px 0 8px;text-align:center;font-size:14px;color:var(--ink-2)}
    .save-error{font-size:13px;background:var(--danger-bg);color:var(--danger-ink);padding:12px 15px;border-radius:8px;margin:20px 0}
    .editor-footer{border-top:1px solid var(--line);margin-top:24px;padding:22px 0;display:flex;align-items:center;justify-content:space-between;gap:24px}
    .editor-footer p{font-size:12px;line-height:1.6;color:var(--ink-2);max-width:340px;margin:0}.footer-actions{display:flex;gap:10px;flex-shrink:0}
    .primary-button,.secondary-button{border-radius:var(--radius-btn);min-height:46px;padding:10px 18px;font-size:14px;font-weight:var(--btn-weight);display:flex;align-items:center;justify-content:center;gap:8px}
    .primary-button{color:var(--on-accent);background:var(--accent);border:1px solid var(--accent)}.primary-button:hover:not(:disabled){background:var(--accent-hover)}
    .secondary-button{border:1px solid var(--line);background:var(--surface);color:var(--ink)}.secondary-button:hover{border-color:var(--ink)}
    button:focus-visible{outline:2px solid var(--ink);outline-offset:3px}
    .picker-overlay{position:fixed;inset:0;z-index:80;background:color-mix(in srgb, var(--dark-deep) 55%, transparent)}
    .picker{position:fixed;z-index:81;left:0;right:0;bottom:0;max-height:88dvh;display:flex;flex-direction:column;gap:10px;padding:16px 16px calc(12px + env(safe-area-inset-bottom));background:var(--bg);border-radius:20px 20px 0 0;box-shadow:0 -10px 40px color-mix(in srgb, var(--dark-deep) 30%, transparent)}
    .picker-header{display:flex;align-items:center;justify-content:space-between}
    .picker-search{position:relative;display:block}.picker-search svg{position:absolute;left:12px;top:50%;width:20px;height:20px;transform:translateY(-50%);color:var(--ink-2);pointer-events:none}
    .picker-search input{padding-left:40px;min-height:48px;border-radius:12px}
    .picker-chips{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px;scrollbar-width:none}.picker-chips::-webkit-scrollbar{display:none}
    .chip{flex-shrink:0;min-height:38px;padding:6px 14px;border-radius:999px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font-size:13px;font-weight:500}
    .chip.is-active{background:var(--dark);border-color:var(--dark);color:var(--on-dark)}
    .picker-place{display:flex;align-items:center;gap:10px;min-height:44px;font-size:13px;line-height:1.4;color:var(--ink);cursor:pointer}
    .picker-place input{flex-shrink:0;width:20px;height:20px;min-height:0;margin:0;padding:0;accent-color:var(--strong);cursor:pointer}
    .picker-list{list-style:none;margin:0;padding:0;overflow-y:auto;display:flex;flex-direction:column;gap:6px;flex:1;min-height:120px}
    .row-actions{display:flex;flex-wrap:wrap;gap:0 20px;margin-top:6px}.row-actions .text-button{white-space:normal;text-align:left}
    .replacement-context{margin:0;font-size:13px;line-height:1.5;color:var(--ink-2)}
    .replacement-chevron{width:20px;height:20px;flex-shrink:0;color:var(--ink-2)}
    .picker-exercise-row{display:flex;align-items:center;gap:4px;min-width:0}
    .picker-item{display:flex;align-items:center;gap:12px;flex:1;min-width:0;width:100%;min-height:60px;padding:8px 12px;border-radius:12px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);text-align:left}
    .picker-item:hover:not(:disabled){border-color:var(--ink)}.picker-item.is-picked{border-color:var(--strong);background:var(--bg-tint)}
    .picker-item app-exercise-thumb{--thumb-radius:10px}
    .picker-text{flex:1;min-width:0;display:flex;flex-direction:column}.picker-text strong{font-size:15px}.picker-text small{font-size:12px;color:var(--ink-2)}
    .picker-check{display:grid;place-items:center;flex-shrink:0;width:28px;height:28px;border-radius:50%;border:1.5px solid var(--line-strong);color:transparent}
    .picker-check svg{width:16px;height:16px}.picker-item.is-picked .picker-check{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}
    .picker-item.is-used{opacity:.55}.picker-empty{padding:24px;text-align:center;color:var(--ink-2);font-size:14px}
    .picker-footer{display:grid;grid-template-columns:auto 1fr;gap:10px;padding-top:6px}
    @media(min-width:760px){.picker{left:50%;right:auto;top:50%;bottom:auto;transform:translate(-50%,-50%);width:min(560px,92vw);max-height:80vh;border-radius:20px}}
    @media(max-width:680px){.editor-header{flex-direction:column;gap:8px;margin-bottom:20px}h2{font-size:26px}.details-grid{grid-template-columns:1fr 1fr;gap:14px}.name-field,.description-field{grid-column:1/-1}
      .exercise-row fieldset{padding:12px}.exercise-numbers{gap:8px}.exercise-numbers .field>span{font-size:11px}
      .builder{padding:16px 14px 14px;margin-bottom:22px}.builder-actions button{flex:1}
      .choice-options.targets{display:grid;grid-template-columns:1fr 1fr}.choice-options.minutes{display:grid;grid-template-columns:repeat(4,1fr)}
      .choice-chip span{padding:6px 10px}
      .builder-fields{max-width:none}
      .row-number{display:none}.title-number{display:inline}.row-tools{gap:0}.tool-button{width:44px;height:44px}.tool-button.remove{margin-left:6px}
      .editor-footer{flex-direction:column;align-items:stretch;gap:16px}.editor-footer p{max-width:none}.footer-actions{width:100%}.footer-actions button{flex:1}}
    .dialog h2{font-family:var(--font-body);font-size:19px;font-weight:650;letter-spacing:-.02em;text-transform:none;margin:0 0 8px}
    @media(prefers-reduced-motion:reduce){button{transition:none}}
  `],
})
export class RoutineEditorComponent implements OnChanges, OnInit, OnDestroy {
  readonly brand=inject(BRAND);
  @Input() routine: Routine | null = null;
  @Output() readonly saved = new EventEmitter<void>();
  @Output() readonly cancelled = new EventEmitter<void>();
  readonly store = inject(WorkoutStore);
  private readonly backClose = inject(BackClose);
  /** El selector abierto ocupa una entrada del historial: el botón Atrás del teléfono lo cierra sin salir del editor. */
  private pickerLayer: BackLayer | null = null;
  /** El editor mismo ocupa otra: con cambios sin guardar, Atrás pregunta antes de salir. */
  private editorLayer: BackLayer | null = null;
  /** Cómo estaba el formulario al abrirlo, para saber si hay cambios sin guardar. */
  private initial = '';
  /** Se está preguntando si salir sin guardar. */
  readonly leaveAsk = signal(false);
  private leaveFocus: HTMLElement | null = null;
  private pendingNavigation: (() => void) | null = null;
  readonly categories: RoutineCategory[] = ['Fuerza', 'Movilidad', 'Resistencia'];
  readonly levels: FitnessLevel[] = ['Principiante', 'Intermedio', 'Avanzado'];
  name = '';
  description = '';
  category: RoutineCategory = 'Fuerza';
  /** El nivel vive en un signal porque la propuesta se calcula con él; el formulario lo usa como una propiedad más. */
  private readonly levelValue = signal<FitnessLevel>('Principiante');
  get level(): FitnessLevel { return this.levelValue(); }
  set level(value: FitnessLevel) { this.levelValue.set(value); }
  entries: RoutineExercise[] = [];
  attempted = false;
  saveError = '';

  /** La propuesta ("Armámela") solo se ofrece al crear una rutina; al editar una existente no aparece. */
  readonly targets = ROUTINE_TARGETS;
  readonly targetLabels = ROUTINE_TARGET_LABELS;
  readonly minuteOptions = PROPOSAL_MINUTES;
  readonly placeLabels = TRAINING_PLACE_LABELS;
  readonly placeOptions = Object.keys(TRAINING_PLACE_LABELS) as TrainingPlace[];
  readonly builderOpen = signal(false);
  readonly builderTarget = signal<RoutineTarget>('cuerpo-completo');
  readonly builderMinutes = signal(45);
  /** Dónde entrena: arranca con el del perfil y vale solo para esta rutina (la propuesta y el filtro del selector). */
  readonly place = signal<TrainingPlace>('gimnasio');
  readonly proposal = computed(() => buildRoutineProposal({
    target: this.builderTarget(), minutes: this.builderMinutes(), place: this.place(),
    level: this.levelValue(), focus: this.store.profile().focus,
  }, this.store.exercises()));
  /** Lo propuesto queda bastante por debajo del tiempo pedido: el catálogo no tiene más para esa zona y ese lugar. */
  readonly proposalShort = computed(() => this.proposal().minutes <= this.builderMinutes() - 10);
  /** Los ejercicios a la vista vienen de una propuesta todavía sin guardar. */
  readonly proposalNote = signal(false);
  /** La lista que había antes de reemplazarla por una propuesta, para poder deshacer. */
  undoEntries: RoutineExercise[] | null = null;
  /** Lo demás que cambia una propuesta, para que volver atrás devuelva la pantalla entera a como estaba. */
  private undoRest: { name: string; suggestedName: string; note: boolean; level: FitnessLevel | null } | null = null;
  /** Ya se aplicó alguna propuesta en esta rutina. */
  private proposalUsed = false;
  /** Nivel con el que se armó la propuesta a la vista: si después cambia, las series ya no le corresponden. */
  private proposalLevel: FitnessLevel | null = null;
  /** Lo último que pasó, para quien usa lector de pantalla. La región que lo lee está siempre en la página. */
  readonly announcement = signal('');
  /** El nombre que puso la última propuesta: si la persona no lo cambió, la siguiente lo puede pisar. */
  private suggestedName = '';
  /** Los kilos de arranque no se piden salvo que la rutina ya los tenga o la persona los quiera cargar. */
  readonly showWeights = signal(false);
  readonly mapOpen = signal(false);
  private summaryKey: string | null = null;
  private summary: { primary: MuscleId[]; secondary: MuscleId[]; primaryText: string; secondaryText: string } = { primary: [], secondary: [], primaryText: '', secondaryText: '' };
  private ready = false;

  readonly pickerOpen = signal(false);
  readonly replacingId = signal<string | null>(null);
  readonly pickerFavoritesOnly = signal(false);
  replacementUndo: RoutineReplacementUndo | null = null;
  private pickerTrigger: HTMLElement | null = null;
  readonly pickerSearch = signal('');
  readonly pickerMuscle = signal('Todos');
  /** En casa, el selector arranca mostrando solo lo que se puede hacer con ese equipo. */
  readonly pickerPlaceOnly = signal(true);
  readonly picked = signal<Set<string>>(new Set());
  readonly muscles = computed(() => ['Todos', ...new Set(this.store.exercises().map((exercise) => exercise.muscle))]);
  readonly pickerExercises = computed(() => {
    const query = this.pickerSearch().trim().toLocaleLowerCase('es');
    const muscle = this.pickerMuscle();
    const place = this.pickerPlaceOnly() ? this.place() : 'gimnasio';
    const source = this.exerciseById(this.replacingId() ?? '');
    return this.store.exercises().filter((exercise) => (muscle === 'Todos' || exercise.muscle === muscle)
      && (!source || (exercise.id !== source.id && exercise.movement === source.movement))
      && (!this.pickerFavoritesOnly() || this.store.isFavorite(exercise.id))
      && availableAt(place, exercise)
      && `${exercise.name} ${exercise.muscle} ${exercise.equipment}`.toLocaleLowerCase('es').includes(query));
  });

  ngOnChanges(): void {
    this.reset();
  }

  ngOnInit(): void {
    if (!this.ready) this.reset();
    this.watchBack();
  }

  /** Deja el formulario como corresponde a la rutina recibida (o vacío, con la propuesta a la vista, si es nueva). */
  private reset(): void {
    const profile = this.store.profile();
    this.name = this.routine ? this.routine.name + (this.routine.custom ? '' : ' · Mi versión') : '';
    this.description = this.routine?.description ?? '';
    this.category = this.routine?.category ?? 'Fuerza';
    this.level = this.routine?.level ?? profile.level;
    this.entries = this.routine?.exercises.map((entry) => ({ ...entry })) ?? [];
    this.replacementUndo = null;
    this.replacingId.set(null);
    this.place.set(profile.place);
    this.builderOpen.set(!this.routine);
    this.proposalNote.set(false);
    this.undoEntries = null;
    this.undoRest = null;
    this.proposalUsed = false;
    this.proposalLevel = null;
    this.announcement.set('');
    this.suggestedName = '';
    this.showWeights.set(this.entries.some((entry) => entry.weight > 0));
    this.mapOpen.set(false);
    this.attempted = false;
    this.saveError = '';
    this.initial = this.formState();
    this.leaveAsk.set(false);
    this.ready = true;
  }

  ngOnDestroy(): void {
    // Se salió por otro camino (la navegación): las capas se olvidan sin tocar el historial.
    this.editorLayer?.forget();
    this.pickerLayer?.forget();
    this.editorLayer = this.pickerLayer = null;
  }

  private formState(): string {
    return JSON.stringify([this.name, this.description, this.category, this.level, this.entries]);
  }

  /** Hay cambios sin guardar. */
  get dirty(): boolean {
    return this.formState() !== this.initial;
  }

  /** Mientras el editor está abierto, Atrás pasa primero por acá. */
  private watchBack(): void {
    this.editorLayer ??= this.backClose.open(() => { this.editorLayer = null; this.backPressed(); });
  }

  private backPressed(): void {
    // Atrás con la pregunta a la vista es "seguir editando".
    if (this.leaveAsk()) { this.stay(); this.watchBack(); return; }
    // Sin cambios, Atrás sigue de largo como siempre.
    if (!this.dirty) { history.back(); return; }
    this.askLeave();
    this.watchBack();
  }

  private askLeave(): void {
    this.leaveFocus = document.activeElement as HTMLElement | null;
    this.leaveAsk.set(true);
    setTimeout(() => document.getElementById('leave-stay')?.focus());
  }

  /** "Cancelar" y "Volver a mis rutinas": con cambios sin guardar, pregunta. */
  requestLeave(): void {
    this.requestNavigation(() => this.cancelled.emit());
  }

  requestNavigation(then: () => void): void {
    this.pendingNavigation = then;
    if (this.dirty) this.askLeave();
    else { this.pendingNavigation = null; this.leave(then); }
  }

  stay(): void {
    this.pendingNavigation = null;
    this.leaveAsk.set(false);
    const element = this.leaveFocus;
    this.leaveFocus = null;
    setTimeout(() => { if (element?.isConnected) element.focus(); });
  }

  confirmLeave(): void {
    this.leaveAsk.set(false);
    const then = this.pendingNavigation ?? (() => this.cancelled.emit());
    this.pendingNavigation = null;
    this.initial = this.formState();
    this.leave(then);
  }

  /** Sale del editor: primero saca su entrada del historial y recién después navega. */
  private leave(then: () => void): void {
    const layer = this.editorLayer;
    this.editorLayer = null;
    (layer ? layer.close() : Promise.resolve()).then(then);
  }

  get title(): string {
    return !this.routine ? 'Creá tu rutina' : this.routine.custom ? 'Editar rutina' : 'Personalizar rutina';
  }

  get intro(): string {
    return this.routine
      ? 'Elegí los ejercicios que quieras y ajustá series, repeticiones y descanso.'
      : 'Te armamos una propuesta o elegís vos los ejercicios. Después cambiás lo que quieras.';
  }

  /** Músculos que trabaja lo que hay en la lista. Se recalcula solo cuando cambian los ejercicios. */
  get muscleSummary(): { primary: MuscleId[]; secondary: MuscleId[]; primaryText: string; secondaryText: string } {
    const key = this.entries.map((entry) => entry.exerciseId).join('|');
    if (key !== this.summaryKey) {
      const muscles = routineMuscles(this.entries, this.store.exercises());
      this.summaryKey = key;
      this.summary = {
        ...muscles,
        primaryText: muscleSentence(muscles.primary).toLocaleLowerCase('es'),
        secondaryText: muscleSentence(muscles.secondary).toLocaleLowerCase('es'),
      };
    }
    return this.summary;
  }

  setPlace(value: string): void {
    if (this.placeOptions.includes(value as TrainingPlace)) this.place.set(value as TrainingPlace);
  }

  /** Enter en una opción arma la primera propuesta. Con una lista ya armada no hace nada: reemplazarla pide el botón. */
  builderEnter(event: Event): void {
    event.preventDefault();
    if (!this.entries.length) this.applyProposal();
  }

  /**
   * Enter dentro de un campo no guarda la rutina: con el nombre ya puesto por la propuesta, apretarlo al corregir
   * una serie la guardaba sin revisar. Guardar es siempre el botón.
   */
  formEnter(event: Event): void {
    if (event.target instanceof HTMLInputElement) event.preventDefault();
  }

  /** Al tocar un número de la lista ya no se ofrece volver a la anterior: se perdería lo que se acaba de cambiar. */
  listEdited(): void {
    this.undoEntries = null;
  }

  get eyebrow(): string {
    return !this.routine ? 'RUTINA NUEVA' : this.routine.custom ? 'MI CREACIÓN' : 'PLANTILLA INICIAL';
  }

  /** El objetivo del perfil, para leer de corrido: "ganar fuerza". */
  get focusLabel(): string {
    return TRAINING_FOCUS_LABELS[this.store.profile().focus].toLocaleLowerCase('es');
  }

  get builderLink(): string {
    if (!this.entries.length) return 'Armar una propuesta';
    return this.proposalUsed ? 'Armar otra propuesta' : 'Reemplazar por una propuesta';
  }

  /** Los datos se piden cuando hay algo que nombrar, y no se esconden si la persona ya escribió alguno. */
  get showDetails(): boolean {
    return this.entries.length > 0 || !!this.routine || this.name.trim().length > 0 || this.description.trim().length > 0;
  }

  /** El nivel cambió después de armar la propuesta que está a la vista. */
  get levelChanged(): boolean {
    return this.proposalNote() && this.proposalLevel !== null && this.proposalLevel !== this.level;
  }

  get placeFilterLabel(): string {
    return this.place() === 'casa-pesas' ? 'Solo con mancuernas o peso corporal' : 'Solo con peso corporal';
  }

  openBuilder(): void {
    this.builderOpen.set(true);
    setTimeout(() => document.getElementById('builder-title')?.focus());
  }

  closeBuilder(): void {
    this.builderOpen.set(false);
    setTimeout(() => document.getElementById('builder-open')?.focus());
  }

  /** Pone en la lista lo propuesto. Si había ejercicios, los guarda para poder deshacer. */
  applyProposal(): void {
    const proposal = this.proposal();
    if (!proposal.exercises.length) return;
    this.replacementUndo = null;
    this.undoEntries = this.entries.length ? this.entries.map((entry) => ({ ...entry })) : null;
    this.undoRest = this.undoEntries ? { name: this.name, suggestedName: this.suggestedName, note: this.proposalNote(), level: this.proposalLevel } : null;
    this.entries = proposal.exercises.map((entry) => ({ ...entry }));
    if (!this.name.trim() || this.name === this.suggestedName) this.name = this.suggestedName = proposal.name;
    this.builderOpen.set(false);
    this.proposalNote.set(true);
    this.proposalUsed = true;
    this.proposalLevel = this.level;
    const count = proposal.exercises.length;
    this.announcement.set(`Listo: ${count} ${count === 1 ? 'ejercicio propuesto' : 'ejercicios propuestos'}, unos ${proposal.minutes} minutos. Revisalos antes de guardar.`);
    setTimeout(() => document.getElementById('exercises-title')?.focus());
  }

  applyAiProposal(routine:Routine):void {
    this.replacementUndo=null;
    this.undoEntries=this.entries.length?this.entries.map(e=>({...e})):null;
    this.undoRest=this.undoEntries?{name:this.name,suggestedName:this.suggestedName,note:this.proposalNote(),level:this.proposalLevel}:null;
    this.entries=routine.exercises.map(e=>({...e}));
    if(!this.name.trim()||this.name===this.suggestedName)this.name=this.suggestedName=routine.name;
    this.builderOpen.set(false);this.proposalNote.set(true);this.proposalUsed=true;this.proposalLevel=this.level;
    this.announcement.set('Propuesta de IA aplicada al borrador. Revisá los ejercicios antes de guardar.');
    setTimeout(()=>document.getElementById('exercises-title')?.focus());
  }

  /** Vuelve a la lista que había antes del reemplazo, con su nombre y su aviso: la pantalla queda como estaba. */
  undoProposal(): void {
    if (!this.undoEntries) return;
    this.replacementUndo = null;
    this.entries = this.undoEntries;
    if (this.undoRest) {
      this.name = this.undoRest.name;
      this.suggestedName = this.undoRest.suggestedName;
      this.proposalNote.set(this.undoRest.note);
      this.proposalLevel = this.undoRest.level;
    }
    this.undoEntries = this.undoRest = null;
    this.announcement.set('Volvió la lista anterior.');
    setTimeout(() => document.getElementById('exercises-title')?.focus());
  }

  revealWeights(): void {
    this.showWeights.set(true);
    setTimeout(() => document.querySelector<HTMLElement>('app-routine-editor .weight-input')?.focus());
  }

  /** Minutos estimados con lo cargado hasta ahora; es lo que se guarda como duración. */
  get estimate(): number {
    return estimateRoutineMinutes({ exercises: this.entries });
  }

  get canAdd(): boolean {
    return this.entries.length < MAX_EXERCISES && this.store.exercises().some((exercise) => !this.isUsed(exercise.id));
  }

  get valid(): boolean {
    return this.name.trim().length > 0 && this.name.trim().length <= 80 && this.description.length <= 300
      && this.categories.includes(this.category)
      && this.levels.includes(this.level) && this.entries.length >= 1 && this.entries.length <= MAX_EXERCISES
      && this.entries.every((entry) => this.validEntry(entry))
      && new Set(this.entries.map((entry) => entry.exerciseId)).size === this.entries.length;
  }

  exerciseById(id: string): Exercise | undefined { return this.store.exercises().find((exercise) => exercise.id === id); }
  durationUnit(entry: RoutineExercise): number { return this.exerciseById(entry.exerciseId)?.tracking === 'duration' ? 60 : 1; }
  setDuration(entry: RoutineExercise, value: number | null): void { entry.durationSeconds = value === null ? Number.NaN : Math.round(value * this.durationUnit(entry)); }
  setTracking(entry: RoutineExercise, mode: string): void {
    if (mode === 'duration') { entry.durationSeconds = 30; entry.reps = entry.weight = 0; }
    else { delete entry.durationSeconds; entry.reps = 10; entry.weight = 0; }
  }
  exerciseName(id: string): string { return this.exerciseById(id)?.name ?? id; }
  /** Grupo, equipo y, si hace falta, qué representa el número de Kg ("kg por mancuerna"). */
  exerciseMeta(id: string): string {
    const exercise = this.exerciseById(id);
    if (!exercise) return '';
    const hint = this.showWeights() ? loadHint(exercise.equipment) : '';
    return `${exercise.muscle} · ${exercise.equipment}${hint ? ` · kg ${hint}` : ''}`;
  }

  numberInRange(value: number, min: number, max: number): boolean {
    return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
  }

  integerInRange(value: number, min: number, max: number): boolean {
    return this.numberInRange(value, min, max) && Number.isInteger(value);
  }

  /** Same ranges as validateRoutine. */
  validEntry(entry: RoutineExercise): boolean {
    return !!this.exerciseById(entry.exerciseId)
      && this.integerInRange(entry.sets, 1, 30)
      && (entry.durationSeconds === undefined ? this.integerInRange(entry.reps, 1, 999) && this.numberInRange(entry.weight, 0, 2000)
        : this.integerInRange(entry.durationSeconds, 1, 36000) && entry.reps === 0 && entry.weight === 0)
      && this.integerInRange(entry.restSeconds, 0, 3600);
  }

  isUsed(exerciseId: string): boolean {
    return this.entries.some((entry) => entry.exerciseId === exerciseId);
  }

  openPicker(): void {
    this.replacingId.set(null);
    this.pickerTrigger = document.querySelector<HTMLElement>('app-routine-editor .add-button');
    this.showPicker();
  }

  openReplacement(fromId: string): void {
    if (!this.isUsed(fromId)) return;
    this.replacingId.set(fromId);
    this.pickerMuscle.set('Todos');
    this.pickerFavoritesOnly.set(false);
    this.pickerTrigger = this.replacementButton(fromId);
    this.showPicker();
  }

  replacementMovement(): string {
    const movement = this.exerciseById(this.replacingId() ?? '')?.movement;
    return movement ? MOVEMENT_LABELS[movement].toLocaleLowerCase('es') : '';
  }

  private replacementButton(id: string): HTMLElement | null {
    return Array.from(document.querySelectorAll<HTMLElement>('app-routine-editor [data-replace-id]')).find(button => button.dataset['replaceId'] === id) ?? null;
  }

  chooseReplacement(toId: string): void {
    const fromId = this.replacingId();
    if (!fromId) return;
    const next = replaceRoutineExercise(this.entries, fromId, toId, this.store.exercises());
    if (!next) return;
    this.replacementUndo = { before: { ...this.entries.find(entry => entry.exerciseId === fromId)! }, after: { ...next.find(entry => entry.exerciseId === toId)! } };
    this.entries = next;
    this.listEdited();
    this.announcement.set(`Cambiaste ${this.exerciseName(fromId)} por ${this.exerciseName(toId)}. La carga empieza en 0. Podés deshacer el cambio.`);
    this.closePicker(false);
    setTimeout(() => this.replacementButton(toId)?.focus());
  }

  canUndoReplacement(): boolean {
    return !!this.replacementUndo && canUndoRoutineReplacement(this.entries, this.replacementUndo);
  }

  undoReplacement(): void {
    if (!this.replacementUndo) return;
    const next = undoRoutineReplacement(this.entries, this.replacementUndo);
    if (!next) return;
    const id = this.replacementUndo.before.exerciseId;
    this.entries = next;
    this.replacementUndo = null;
    this.announcement.set(`Volvió ${this.exerciseName(id)} con sus valores anteriores.`);
    setTimeout(() => this.replacementButton(id)?.focus());
  }

  private showPicker(): void {
    this.picked.set(new Set());
    this.pickerSearch.set('');
    this.pickerOpen.set(true);
    this.pickerLayer ??= this.backClose.open(() => { this.pickerLayer = null; this.closePicker(); });
    setTimeout(() => document.getElementById('picker-search-input')?.focus());
  }

  /** Cierra el selector. Si no se indica otra cosa, devuelve el foco al botón que lo abrió. */
  closePicker(refocus = true): void {
    const layer = this.pickerLayer;
    this.pickerLayer = null;
    void layer?.close();
    if (!this.pickerOpen()) return;
    this.pickerOpen.set(false);
    this.replacingId.set(null);
    const trigger = this.pickerTrigger;
    this.pickerTrigger = null;
    if (refocus) setTimeout(() => trigger?.isConnected && trigger.focus());
  }

  togglePick(id: string): void {
    if (this.isUsed(id)) return;
    const next = new Set(this.picked());
    if (next.has(id)) next.delete(id);
    else if (this.entries.length + next.size < MAX_EXERCISES) next.add(id);
    this.picked.set(next);
  }

  /** Adds the picked exercises in catalog order, with the starting values for the profile's goal and this routine's level. */
  confirmPick(): void {
    const added = this.store.exercises().filter((exercise) => this.picked().has(exercise.id) && !this.isUsed(exercise.id));
    const focus = this.store.profile().focus;
    const firstNew = this.entries.length;
    this.entries = [...this.entries, ...added.map((exercise) => ({ exerciseId: exercise.id,
      ...(exercise.tracking === 'duration' ? { sets: 1, reps: 0, restSeconds: 0, durationSeconds: 1200 } : defaultPrescription(exercise, focus, this.level)), weight: 0 }))];
    // Eligió a mano: la propuesta deja de ocupar lugar, y ya no se puede deshacer hacia una lista anterior.
    this.builderOpen.set(false);
    this.undoEntries = null;
    this.closePicker(false);
    // El foco va a lo que sigue: las series del primer ejercicio agregado (el botón de agregar puede quedar deshabilitado).
    setTimeout(() => document.querySelectorAll('app-routine-editor .exercise-row')[firstNew]?.querySelector<HTMLElement>('.exercise-numbers input')?.focus(), 50);
  }

  move(index: number, delta: number): void {
    const target = index + delta;
    if (target < 0 || target >= this.entries.length) return;
    const next = [...this.entries];
    [next[index], next[target]] = [next[target], next[index]];
    this.entries = next;
    this.undoEntries = null;
  }

  removeExercise(index: number): void {
    const name = this.exerciseName(this.entries[index]?.exerciseId ?? '');
    this.entries = this.entries.filter((_, position) => position !== index);
    this.undoEntries = null;
    if (!this.entries.length) this.proposalNote.set(false);
    this.announcement.set(`Quitaste ${name}.`);
    // El botón que se tocó ya no existe: el foco sigue en la fila que ocupó su lugar, o en el título si no queda ninguna.
    setTimeout(() => {
      const rows = document.querySelectorAll('app-routine-editor .exercise-row');
      const next = rows[Math.min(index, rows.length - 1)]?.querySelector<HTMLElement>('.tool-button.remove');
      (next ?? document.getElementById('exercises-title'))?.focus();
    });
  }

  save(): void {
    this.attempted = true;
    this.saveError = '';
    if (!this.valid) {
      this.saveError = 'Completá el nombre y agregá al menos un ejercicio con valores válidos.';
      // El botón ya no se deshabilita: en su lugar, lleva a lo primero que falta.
      setTimeout(() => document.querySelector<HTMLElement>('app-routine-editor [aria-invalid="true"]')?.focus());
      return;
    }
    const routine: Routine = {
      id: this.routine?.custom ? this.routine.id : `custom-${crypto.randomUUID()}`,
      name: this.name.trim(), description: this.description.trim(), duration: this.estimate,
      category: this.category, level: this.level, custom: true,
      exercises: this.entries.map((entry) => ({ ...entry })),
    };
    if (this.store.saveRoutine(routine)) { this.initial = this.formState(); this.leave(() => this.saved.emit()); }
    else this.saveError = this.store.actionError() ?? 'No pudimos guardar la rutina. Revisá los datos e intentá otra vez.';
  }
}
