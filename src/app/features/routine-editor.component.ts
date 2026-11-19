import { Component, EventEmitter, Input, Output, computed, inject, signal, type OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Exercise, FitnessLevel, Routine, RoutineCategory, RoutineExercise } from '../core/models';
import { WorkoutStore } from '../core/workout-store';

/** Same bound as validateRoutine in workout-utils: generous, not a product limit. */
const MAX_EXERCISES = 50;

@Component({
  selector: 'app-routine-editor',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="routine-editor" aria-labelledby="routine-editor-title">
      <header class="editor-header">
        <div>
          <p class="eyebrow">TU ENTRENAMIENTO, A TU MEDIDA</p>
          <h2 id="routine-editor-title">{{ title }}</h2>
          <p class="intro">Elegí los ejercicios que quieras y ajustá series, repeticiones y descanso.</p>
        </div>
        <button class="text-button" type="button" (click)="cancelled.emit()">Volver a mis rutinas</button>
      </header>

      <form #routineForm="ngForm" (ngSubmit)="save()" novalidate>
        <div class="details-grid">
          <label class="field name-field">
            <span>Nombre de la rutina <span aria-hidden="true">*</span></span>
            <input name="routineName" [(ngModel)]="name" #nameInput="ngModel" required maxlength="80"
              placeholder="Por ejemplo, mi día de fuerza" autocomplete="off"
              [attr.aria-invalid]="(nameInput.touched || attempted) && !name.trim()" aria-describedby="name-error">
            <small id="name-error" class="field-error">@if ((nameInput.touched || attempted) && !name.trim()) { Escribí un nombre para encontrarla después. }</small>
          </label>
          <label class="field">
            <span>Duración estimada (min)</span>
            <input type="number" name="duration" [(ngModel)]="duration" #durationInput="ngModel" required min="1" max="600" step="1" inputmode="numeric"
              [attr.aria-invalid]="(durationInput.touched || attempted) && !integerInRange(duration, 1, 600)">
          </label>
          <label class="field">
            <span>Enfoque</span>
            <select name="category" [(ngModel)]="category">@for (option of categories; track option) { <option [ngValue]="option">{{ option }}</option> }</select>
          </label>
          <label class="field">
            <span>Nivel</span>
            <select name="level" [(ngModel)]="level">@for (option of levels; track option) { <option [ngValue]="option">{{ option }}</option> }</select>
          </label>
          <label class="field description-field">
            <span>Descripción <span class="optional">(opcional)</span></span>
            <textarea name="description" [(ngModel)]="description" maxlength="300" rows="2" placeholder="Qué querés trabajar en esta sesión"></textarea>
          </label>
        </div>

        <div class="exercise-heading">
          <div><h3>Ejercicios</h3><p>Cargas en kg; 0 para peso corporal.</p></div>
          <span class="exercise-count">{{ entries.length }} {{ entries.length === 1 ? 'ejercicio' : 'ejercicios' }}</span>
        </div>

        <ol class="exercise-list">
          @for (entry of entries; track $index; let i = $index; let first = $first; let last = $last) {
            <li class="exercise-row">
              <fieldset>
                <legend class="sr-only">{{ exerciseName(entry.exerciseId) }}</legend>
                <div class="exercise-top">
                  <span class="row-number" aria-hidden="true">{{ i + 1 }}</span>
                  <div class="exercise-title"><strong>{{ exerciseName(entry.exerciseId) }}</strong><small>{{ exerciseMeta(entry.exerciseId) }}</small></div>
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
                <div class="exercise-numbers">
                  <label class="field"><span>Series</span><input type="number" [name]="'sets-' + i" [(ngModel)]="entry.sets" min="1" max="30" step="1" required inputmode="numeric" [attr.aria-invalid]="attempted && !integerInRange(entry.sets, 1, 30)"></label>
                  <label class="field"><span>Reps</span><input type="number" [name]="'reps-' + i" [(ngModel)]="entry.reps" min="1" max="999" step="1" required inputmode="numeric" [attr.aria-invalid]="attempted && !integerInRange(entry.reps, 1, 999)"></label>
                  <label class="field"><span>Kg</span><input type="number" [name]="'weight-' + i" [(ngModel)]="entry.weight" min="0" max="2000" step="0.5" required inputmode="decimal" [attr.aria-invalid]="attempted && !numberInRange(entry.weight, 0, 2000)"></label>
                  <label class="field"><span>Descanso (s)</span><input type="number" [name]="'rest-' + i" [(ngModel)]="entry.restSeconds" min="0" max="3600" step="5" required inputmode="numeric" [attr.aria-invalid]="attempted && !integerInRange(entry.restSeconds, 0, 3600)"></label>
                </div>
                @if (attempted && !validEntry(entry)) {
                  <p class="row-error" role="alert">Revisá los valores: 1–30 series, 1–999 repeticiones, 0–2.000 kg y hasta 3.600 s de descanso.</p>
                }
              </fieldset>
            </li>
          }
        </ol>

        @if (!entries.length) { <p class="empty-exercises">Todavía no elegiste ejercicios. Agregá los que vas a hacer.</p> }
        <button type="button" class="add-button" (click)="openPicker()" [disabled]="!canAdd">
          <span aria-hidden="true">＋</span> Agregar ejercicios
        </button>

        @if (saveError) { <p class="save-error" role="alert">{{ saveError }}</p> }
        <footer class="editor-footer">
          <p>{{ routine && !routine.custom ? 'Se guardará como una nueva rutina. La plantilla original se conserva.' : 'Podés volver a editar tu rutina cuando quieras.' }}</p>
          <div class="footer-actions">
            <button type="button" class="secondary-button" (click)="cancelled.emit()">Cancelar</button>
            <button type="submit" class="primary-button" [disabled]="!valid">Guardar rutina</button>
          </div>
        </footer>
      </form>
    </section>

    @if (pickerOpen()) {
      <div class="picker-overlay" (click)="closePicker()" aria-hidden="true"></div>
      <div class="picker" role="dialog" aria-modal="true" aria-labelledby="picker-title" (keydown.escape)="closePicker()">
        <header class="picker-header">
          <h3 id="picker-title">Elegí ejercicios</h3>
          <button type="button" class="tool-button" (click)="closePicker()" aria-label="Cerrar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6"/></svg>
          </button>
        </header>
        <label class="picker-search">
          <span class="sr-only">Buscar ejercicio</span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="m21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0"/></svg>
          <input id="picker-search-input" type="search" [value]="pickerSearch()" (input)="pickerSearch.set($any($event.target).value)" placeholder="Buscá por nombre, músculo o equipo" autocomplete="off">
        </label>
        <div class="picker-chips" role="group" aria-label="Filtrar por grupo muscular">
          @for (option of muscles(); track option) {
            <button type="button" class="chip" [class.is-active]="pickerMuscle() === option" [attr.aria-pressed]="pickerMuscle() === option" (click)="pickerMuscle.set(option)">{{ option }}</button>
          }
        </div>
        <ul class="picker-list">
          @for (exercise of pickerExercises(); track exercise.id) {
            <li>
              <button type="button" class="picker-item" [class.is-picked]="picked().has(exercise.id)" [class.is-used]="isUsed(exercise.id)"
                [disabled]="isUsed(exercise.id)" [attr.aria-pressed]="picked().has(exercise.id)" (click)="togglePick(exercise.id)">
                <span class="picker-initial" aria-hidden="true">{{ exercise.name.charAt(0) }}</span>
                <span class="picker-text"><strong>{{ exercise.name }}</strong><small>{{ exercise.muscle }} · {{ exercise.equipment }}{{ isUsed(exercise.id) ? ' · ya está en la rutina' : '' }}</small></span>
                <span class="picker-check" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m5 12 4 4L19 6"/></svg>
                </span>
              </button>
            </li>
          } @empty {
            <li class="picker-empty">No encontramos ejercicios con esa búsqueda.</li>
          }
        </ul>
        <footer class="picker-footer">
          <button type="button" class="secondary-button" (click)="closePicker()">Cancelar</button>
          <button type="button" class="primary-button" (click)="confirmPick()" [disabled]="!picked().size">
            {{ picked().size ? 'Agregar ' + picked().size + (picked().size === 1 ? ' ejercicio' : ' ejercicios') : 'Elegí al menos uno' }}
          </button>
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
    h2{font-family:var(--font-display);font-size:30px;letter-spacing:var(--display-tracking,-1px);line-height:1.2;font-weight:var(--display-weight,700);text-transform:var(--display-transform,none);margin:0 0 10px}h3{font-size:19px;letter-spacing:-.4px;margin:0}
    .intro,.exercise-heading p{color:var(--ink-2);font-size:13px;line-height:1.6;margin:0}
    button,input,select,textarea{font:inherit}button{cursor:pointer;transition:background .16s,color .16s,border-color .16s}button:disabled{cursor:not-allowed;opacity:.45}
    .text-button{background:none;border:0;padding:8px 0;color:var(--ink);font-size:13px;white-space:nowrap;text-decoration:underline;text-underline-offset:4px;min-height:44px}
    .details-grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:16px 20px;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:22px 0}
    .name-field,.description-field{grid-column:span 2}.field{display:flex;flex-direction:column;gap:6px;min-width:0}
    .field>span{font-size:12px;font-weight:600;line-height:1.4}.optional{font-weight:400;color:var(--ink-2)}
    input,select,textarea{width:100%;min-width:0;border:1px solid var(--line-strong);background:var(--surface);border-radius:var(--radius-field);color:var(--ink);outline:none;padding:10px 12px;font-size:15px;line-height:1.4;min-height:44px}
    textarea{resize:vertical;min-height:64px}input:focus,select:focus,textarea:focus{border-color:var(--ink);box-shadow:0 0 0 3px color-mix(in srgb, var(--strong) 18%, transparent)}
    [aria-invalid=true]{border-color:var(--danger)}.field-error{color:var(--danger);font-size:11px;line-height:1.4}.field-error:empty{display:none}
    .exercise-heading{display:flex;justify-content:space-between;align-items:center;gap:20px;margin:24px 0 14px}.exercise-heading p{margin-top:4px}
    .exercise-count{font-size:13px;color:var(--ink-2);font-variant-numeric:tabular-nums;white-space:nowrap}
    .exercise-list{list-style:none;margin:0;padding:0;display:grid;gap:10px}
    .exercise-row fieldset{margin:0;padding:14px 16px;border:1px solid var(--line);border-radius:var(--radius);background:var(--surface);min-width:0}
    .exercise-top{display:flex;align-items:center;gap:12px}
    .row-number{display:grid;place-items:center;flex-shrink:0;width:28px;height:28px;border-radius:50%;background:var(--bg);font-size:12px;font-weight:700;color:var(--strong)}
    .exercise-title{flex:1;min-width:0;display:flex;flex-direction:column}.exercise-title strong{font-size:15px}.exercise-title small{font-size:12px;color:var(--ink-2)}
    .row-tools{display:flex;gap:2px;flex-shrink:0}
    .tool-button{display:grid;place-items:center;width:40px;height:40px;border:0;border-radius:10px;background:transparent;color:var(--ink-2)}
    .tool-button:hover:not(:disabled){background:var(--bg);color:var(--ink)}.tool-button.remove:hover{background:var(--danger-bg);color:var(--danger)}.tool-button svg{width:20px;height:20px}
    .exercise-numbers{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:12px}
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
    .picker-list{list-style:none;margin:0;padding:0;overflow-y:auto;display:flex;flex-direction:column;gap:6px;flex:1;min-height:120px}
    .picker-item{display:flex;align-items:center;gap:12px;width:100%;min-height:60px;padding:8px 12px;border-radius:12px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);text-align:left}
    .picker-item:hover:not(:disabled){border-color:var(--ink)}.picker-item.is-picked{border-color:var(--strong);background:var(--bg-tint)}
    .picker-initial{display:grid;place-items:center;flex-shrink:0;width:40px;height:40px;border-radius:10px;background:var(--dark);color:var(--accent);font-weight:700}
    .picker-text{flex:1;min-width:0;display:flex;flex-direction:column}.picker-text strong{font-size:15px}.picker-text small{font-size:12px;color:var(--ink-2)}
    .picker-check{display:grid;place-items:center;flex-shrink:0;width:28px;height:28px;border-radius:50%;border:1.5px solid var(--line-strong);color:transparent}
    .picker-check svg{width:16px;height:16px}.picker-item.is-picked .picker-check{background:var(--accent);border-color:var(--accent);color:var(--on-accent)}
    .picker-item.is-used{opacity:.55}.picker-empty{padding:24px;text-align:center;color:var(--ink-2);font-size:14px}
    .picker-footer{display:grid;grid-template-columns:auto 1fr;gap:10px;padding-top:6px}
    @media(min-width:760px){.picker{left:50%;right:auto;top:50%;bottom:auto;transform:translate(-50%,-50%);width:min(560px,92vw);max-height:80vh;border-radius:20px}}
    @media(max-width:680px){.editor-header{flex-direction:column;gap:8px;margin-bottom:20px}h2{font-size:26px}.details-grid{grid-template-columns:1fr 1fr;gap:14px}.name-field,.description-field{grid-column:1/-1}
      .exercise-row fieldset{padding:12px}.exercise-numbers{gap:8px}.exercise-numbers .field>span{font-size:11px}.tool-button{width:36px;height:36px}
      .editor-footer{flex-direction:column;align-items:stretch;gap:16px}.editor-footer p{max-width:none}.footer-actions{width:100%}.footer-actions button{flex:1}}
    @media(prefers-reduced-motion:reduce){button{transition:none}}
  `],
})
export class RoutineEditorComponent implements OnChanges {
  @Input() routine: Routine | null = null;
  @Output() readonly saved = new EventEmitter<void>();
  @Output() readonly cancelled = new EventEmitter<void>();
  readonly store = inject(WorkoutStore);
  readonly categories: RoutineCategory[] = ['Fuerza', 'Movilidad', 'Resistencia'];
  readonly levels: FitnessLevel[] = ['Principiante', 'Intermedio', 'Avanzado'];
  name = '';
  description = '';
  duration = 30;
  category: RoutineCategory = 'Fuerza';
  level: FitnessLevel = 'Principiante';
  entries: RoutineExercise[] = [];
  attempted = false;
  saveError = '';

  readonly pickerOpen = signal(false);
  readonly pickerSearch = signal('');
  readonly pickerMuscle = signal('Todos');
  readonly picked = signal<Set<string>>(new Set());
  readonly muscles = computed(() => ['Todos', ...new Set(this.store.exercises().map((exercise) => exercise.muscle))]);
  readonly pickerExercises = computed(() => {
    const query = this.pickerSearch().trim().toLocaleLowerCase('es');
    const muscle = this.pickerMuscle();
    return this.store.exercises().filter((exercise) => (muscle === 'Todos' || exercise.muscle === muscle)
      && `${exercise.name} ${exercise.muscle} ${exercise.equipment}`.toLocaleLowerCase('es').includes(query));
  });

  ngOnChanges(): void {
    this.name = this.routine ? this.routine.name + (this.routine.custom ? '' : ' · Mi versión') : '';
    this.description = this.routine?.description ?? '';
    this.duration = this.routine?.duration ?? 30;
    this.category = this.routine?.category ?? 'Fuerza';
    this.level = this.routine?.level ?? this.store.profile().level;
    this.entries = this.routine?.exercises.map((entry) => ({ ...entry })) ?? [];
    this.attempted = false;
    this.saveError = '';
  }

  get title(): string {
    return !this.routine ? 'Creá tu rutina' : this.routine.custom ? 'Editar rutina' : 'Personalizar rutina';
  }

  get canAdd(): boolean {
    return this.entries.length < MAX_EXERCISES && this.store.exercises().some((exercise) => !this.isUsed(exercise.id));
  }

  get valid(): boolean {
    return this.name.trim().length > 0 && this.name.trim().length <= 80 && this.description.length <= 300
      && this.integerInRange(this.duration, 1, 600) && this.categories.includes(this.category)
      && this.levels.includes(this.level) && this.entries.length >= 1 && this.entries.length <= MAX_EXERCISES
      && this.entries.every((entry) => this.validEntry(entry))
      && new Set(this.entries.map((entry) => entry.exerciseId)).size === this.entries.length;
  }

  private exerciseById(id: string): Exercise | undefined { return this.store.exercises().find((exercise) => exercise.id === id); }
  exerciseName(id: string): string { return this.exerciseById(id)?.name ?? id; }
  exerciseMeta(id: string): string { const exercise = this.exerciseById(id); return exercise ? `${exercise.muscle} · ${exercise.equipment}` : ''; }

  numberInRange(value: number, min: number, max: number): boolean {
    return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
  }

  integerInRange(value: number, min: number, max: number): boolean {
    return this.numberInRange(value, min, max) && Number.isInteger(value);
  }

  /** Same ranges as validateRoutine. */
  validEntry(entry: RoutineExercise): boolean {
    return !!this.exerciseById(entry.exerciseId)
      && this.integerInRange(entry.sets, 1, 30) && this.integerInRange(entry.reps, 1, 999)
      && this.numberInRange(entry.weight, 0, 2000) && this.integerInRange(entry.restSeconds, 0, 3600);
  }

  isUsed(exerciseId: string): boolean {
    return this.entries.some((entry) => entry.exerciseId === exerciseId);
  }

  openPicker(): void {
    this.picked.set(new Set());
    this.pickerSearch.set('');
    this.pickerOpen.set(true);
    setTimeout(() => document.getElementById('picker-search-input')?.focus());
  }

  closePicker(): void { this.pickerOpen.set(false); }

  togglePick(id: string): void {
    if (this.isUsed(id)) return;
    const next = new Set(this.picked());
    if (next.has(id)) next.delete(id);
    else if (this.entries.length + next.size < MAX_EXERCISES) next.add(id);
    this.picked.set(next);
  }

  /** Adds the picked exercises in catalog order with sensible defaults the user then adjusts. */
  confirmPick(): void {
    const ids = this.store.exercises().map((exercise) => exercise.id).filter((id) => this.picked().has(id) && !this.isUsed(id));
    this.entries = [...this.entries, ...ids.map((exerciseId) => ({ exerciseId, sets: 3, reps: 10, weight: 0, restSeconds: 60 }))];
    this.pickerOpen.set(false);
  }

  move(index: number, delta: number): void {
    const target = index + delta;
    if (target < 0 || target >= this.entries.length) return;
    const next = [...this.entries];
    [next[index], next[target]] = [next[target], next[index]];
    this.entries = next;
  }

  removeExercise(index: number): void {
    this.entries = this.entries.filter((_, position) => position !== index);
  }

  save(): void {
    this.attempted = true;
    this.saveError = '';
    if (!this.valid) {
      this.saveError = 'Completá el nombre y agregá al menos un ejercicio con valores válidos.';
      return;
    }
    const routine: Routine = {
      id: this.routine?.custom ? this.routine.id : `custom-${crypto.randomUUID()}`,
      name: this.name.trim(), description: this.description.trim(), duration: this.duration,
      category: this.category, level: this.level, custom: true,
      exercises: this.entries.map((entry) => ({ ...entry })),
    };
    if (this.store.saveRoutine(routine)) this.saved.emit();
    else this.saveError = this.store.actionError() ?? 'No pudimos guardar la rutina. Revisá los datos e intentá otra vez.';
  }
}
