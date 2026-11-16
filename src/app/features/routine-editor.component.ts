import { Component, EventEmitter, Input, Output, inject, type OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { FitnessLevel, Routine, RoutineCategory, RoutineExercise } from '../core/models';
import { WorkoutStore } from '../core/workout-store';

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
          <p class="intro">Elegí los movimientos y ajustá las series a tu ritmo.</p>
        </div>
        <button class="text-button" type="button" (click)="cancelled.emit()">Volver a mis rutinas</button>
      </header>

      <form #routineForm="ngForm" (ngSubmit)="save()" novalidate>
        <div class="details-grid">
          <label class="field name-field">
            <span>Nombre de la rutina <span aria-hidden="true">*</span></span>
            <input name="routineName" [(ngModel)]="name" #nameInput="ngModel" required maxlength="80"
              placeholder="Por ejemplo, mi día de fuerza" autocomplete="off"
              [attr.aria-invalid]="(nameInput.touched || attempted) && !name.trim()"
              aria-describedby="name-error">
            <small id="name-error" class="field-error">@if ((nameInput.touched || attempted) && !name.trim()) { Escribí un nombre para encontrarla después. }</small>
          </label>
          <label class="field">
            <span>Duración estimada (min)</span>
            <input type="number" name="duration" [(ngModel)]="duration" #durationInput="ngModel"
              required min="1" max="240" step="1" inputmode="numeric"
              [attr.aria-invalid]="(durationInput.touched || attempted) && !integerInRange(duration, 1, 240)"
              aria-describedby="duration-error">
            <small id="duration-error" class="field-error">@if ((durationInput.touched || attempted) && !integerInRange(duration, 1, 240)) { Usá entre 1 y 240 minutos. }</small>
          </label>
          <label class="field">
            <span>Enfoque</span>
            <select name="category" [(ngModel)]="category">
              @for (option of categories; track option) { <option [ngValue]="option">{{ option }}</option> }
            </select>
          </label>
          <label class="field">
            <span>Nivel</span>
            <select name="level" [(ngModel)]="level">
              @for (option of levels; track option) { <option [ngValue]="option">{{ option }}</option> }
            </select>
          </label>
          <label class="field description-field">
            <span>Descripción <span class="optional">(opcional)</span></span>
            <textarea name="description" [(ngModel)]="description" maxlength="300" rows="2"
              placeholder="Qué querés trabajar en esta sesión"></textarea>
          </label>
        </div>

        <div class="exercise-heading">
          <div><h3>Ejercicios</h3><p>Las cargas son en kg. Usá 0 para ejercicios con peso corporal.</p></div>
          <span class="exercise-count">{{ entries.length }} / 12</span>
        </div>

        <div class="exercise-list">
          @for (entry of entries; track $index; let i = $index) {
            <fieldset class="exercise-row">
              <legend>Ejercicio {{ i + 1 }}</legend>
              <div class="exercise-top">
                <span class="row-number" aria-hidden="true">{{ i + 1 < 10 ? '0' : '' }}{{ i + 1 }}</span>
                <label class="field exercise-select">
                  <span>Movimiento</span>
                  <select [name]="'exercise-' + i" [(ngModel)]="entry.exerciseId" required
                    [attr.aria-label]="'Movimiento del ejercicio ' + (i + 1)">
                    @for (exercise of store.exercises(); track exercise.id) {
                      <option [value]="exercise.id" [disabled]="isUsed(exercise.id, i)">{{ exercise.name }} · {{ exercise.muscle }}</option>
                    }
                  </select>
                </label>
                <button type="button" class="remove-button" (click)="removeExercise(i)"
                  [attr.aria-label]="'Quitar ejercicio ' + (i + 1)" title="Quitar ejercicio">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5"/></svg>
                </button>
              </div>
              <div class="exercise-numbers">
                <label class="field"><span>Series</span><input type="number" [name]="'sets-' + i" [(ngModel)]="entry.sets" #setsInput="ngModel" min="1" max="10" step="1" required inputmode="numeric" [attr.aria-label]="'Series del ejercicio ' + (i + 1)" [attr.aria-invalid]="(setsInput.touched || attempted) && !integerInRange(entry.sets, 1, 10)"></label>
                <label class="field"><span>Repeticiones</span><input type="number" [name]="'reps-' + i" [(ngModel)]="entry.reps" #repsInput="ngModel" min="1" max="999" step="1" required inputmode="numeric" [attr.aria-label]="'Repeticiones del ejercicio ' + (i + 1)" [attr.aria-invalid]="(repsInput.touched || attempted) && !integerInRange(entry.reps, 1, 999)"></label>
                <label class="field"><span>Carga (kg)</span><input type="number" [name]="'weight-' + i" [(ngModel)]="entry.weight" #weightInput="ngModel" min="0" max="2000" step="0.5" required inputmode="decimal" [attr.aria-label]="'Carga en kg del ejercicio ' + (i + 1)" [attr.aria-invalid]="(weightInput.touched || attempted) && !numberInRange(entry.weight, 0, 2000)"></label>
                <label class="field"><span>Descanso (seg)</span><input type="number" [name]="'rest-' + i" [(ngModel)]="entry.restSeconds" #restInput="ngModel" min="0" max="600" step="1" required inputmode="numeric" [attr.aria-label]="'Descanso en segundos del ejercicio ' + (i + 1)" [attr.aria-invalid]="(restInput.touched || attempted) && !integerInRange(entry.restSeconds, 0, 600)"></label>
              </div>
              @if ((attempted || setsInput.touched || repsInput.touched || weightInput.touched || restInput.touched) && !validEntry(entry)) {
                <p class="row-error" role="alert">Revisá los valores: 1–10 series, 1–999 repeticiones, 0–2.000 kg y 0–600 segundos de descanso.</p>
              }
            </fieldset>
          }
        </div>

        @if (!entries.length) {
          <p class="empty-exercises">Empezá agregando el primer ejercicio de tu rutina.</p>
        }
        <button type="button" class="add-button" (click)="addExercise()" [disabled]="!canAdd">
          <span aria-hidden="true">＋</span> Agregar ejercicio
        </button>
        @if (entries.length >= 12) { <p class="limit-note">Llegaste a los 12 ejercicios por rutina.</p> }
        @if (saveError) { <p class="save-error" role="alert">{{ saveError }}</p> }
        <footer class="editor-footer">
          <p>{{ routine && !routine.custom ? 'Se guardará como una nueva rutina. La plantilla original se conserva.' : 'Podés volver a editar tu rutina cuando quieras.' }}</p>
          <div class="footer-actions">
            <button type="button" class="secondary-button" (click)="cancelled.emit()">Cancelar</button>
            <button type="submit" class="primary-button" [disabled]="!valid">Guardar rutina <span aria-hidden="true">↗</span></button>
          </div>
        </footer>
      </form>
    </section>
  `,
  styles: [`
    :host{display:block;min-width:0;color:#252a25;font-family:inherit}
    *{box-sizing:border-box}.routine-editor{max-width:980px;margin:0 auto}
    .editor-header{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-bottom:30px}
    .eyebrow{font-size:10px;letter-spacing:.14em;font-weight:700;color:#667161;margin:0 0 10px}
    h2{font-size:30px;letter-spacing:-1px;line-height:1.2;font-weight:650;margin:0 0 10px}h3{font-size:19px;letter-spacing:-.4px;margin:0}
    .intro,.exercise-heading p{color:#687367;font-size:13px;line-height:1.6;margin:0}
    button,input,select,textarea{font:inherit}button{cursor:pointer;transition:background .16s,color .16s,transform .16s}button:disabled{cursor:not-allowed;opacity:.5}button:active:not(:disabled){transform:translateY(1px)}
    .text-button{background:none;border:0;padding:8px 0;color:#53604f;font-size:12px;white-space:nowrap;text-decoration:underline;text-underline-offset:4px}
    .details-grid{display:grid;grid-template-columns:2fr 1fr 1fr;gap:17px 20px;border-top:1px solid #e6e8e2;border-bottom:1px solid #e6e8e2;padding:25px 0}
    .name-field{grid-column:span 2}.description-field{grid-column:span 2}.field{display:flex;flex-direction:column;gap:8px;min-width:0;color:#394236}
    .field>span{font-size:12px;font-weight:600;line-height:1.4}.optional{font-weight:400;color:#747f70}
    input,select,textarea{width:100%;min-width:0;border:1px solid #dce1d7;background:#fcfcf9;border-radius:8px;color:#252a25;outline:none;padding:11px 12px;font-size:13px;line-height:1.4;min-height:42px}
    textarea{resize:vertical;min-height:70px}select{padding-right:25px}input::placeholder,textarea::placeholder{color:#7a8375}input:focus,select:focus,textarea:focus{border-color:#142118;box-shadow:0 0 0 3px #2C4A2E2e}
    [aria-invalid=true]{border-color:#b34735}.field-error{color:#a63b2d;font-size:11px;min-height:0;line-height:1.4}.field-error:empty{display:none}
    .exercise-heading{display:flex;justify-content:space-between;align-items:center;gap:20px;margin:27px 0 18px}.exercise-heading p{margin-top:5px}.exercise-count{font-size:12px;color:#727d6b;font-variant-numeric:tabular-nums;white-space:nowrap}
    .exercise-list{display:grid;gap:14px}.exercise-row{padding:19px 20px;margin:0;border:1px solid #e1e5da;border-radius:12px;background:#fcfcf9;min-width:0}.exercise-row legend{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    .exercise-top{display:flex;align-items:center;gap:15px}.row-number{font-size:12px;font-weight:600;color:#87917f;align-self:flex-end;line-height:42px}.exercise-select{flex:1}.remove-button{border:0;background:transparent;color:#7b8573;width:42px;height:42px;display:grid;place-items:center;align-self:flex-end;border-radius:8px}.remove-button:hover{color:#a63b2d;background:#faeae4}.remove-button svg{width:19px;height:19px}
    .exercise-numbers{display:grid;grid-template-columns:repeat(4,1fr);gap:15px;margin:16px 57px 0 31px}.exercise-numbers input{background:#f6f7f2;font-variant-numeric:tabular-nums}.row-error{color:#a63b2d;font-size:12px;margin:12px 0 0 31px;line-height:1.5}
    .add-button{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;border:1px dashed #c8d0c0;border-radius:10px;background:transparent;color:#5b6b50;min-height:47px;margin-top:14px;font-size:13px;font-weight:600}.add-button:hover:not(:disabled){background:#edf0e7;border-color:#a2af94}.add-button span{font-size:20px;font-weight:400}
    .empty-exercises{padding:25px 0;text-align:center;font-size:13px;color:#6a7561}.limit-note{font-size:12px;color:#6a7561;margin:10px 0}.save-error{font-size:13px;background:#faeae4;color:#9b3d2c;padding:12px 15px;border-radius:8px;margin:20px 0}
    .editor-footer{border-top:1px solid #e6e8e2;margin-top:28px;padding:24px 0;display:flex;align-items:center;justify-content:space-between;gap:25px}.editor-footer p{font-size:12px;line-height:1.6;color:#737e6a;max-width:340px;margin:0}.footer-actions{display:flex;gap:10px;flex-shrink:0}.primary-button,.secondary-button{border-radius:8px;min-height:44px;padding:11px 19px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:20px;justify-content:center}.primary-button{color:#142118;background:#C8F24C;border:1px solid #C8F24C}.primary-button:hover:not(:disabled){background:#B9E33A}.secondary-button{border:1px solid #dce1d7;background:transparent;color:#53604b}.secondary-button:hover{background:#edf0e7}button:focus-visible{outline:2px solid #142118;outline-offset:3px}
    @media(max-width:680px){.editor-header{flex-direction:column;gap:10px;margin-bottom:22px}h2{font-size:26px}.details-grid{grid-template-columns:1fr 1fr;gap:17px 14px}.name-field,.description-field{grid-column:1/-1}.exercise-row{padding:16px 13px}.exercise-top{gap:8px}.exercise-numbers{margin:16px 0 0;gap:10px;grid-template-columns:1fr 1fr}.exercise-numbers .field>span{font-size:11px}.row-number{font-size:11px}.remove-button{width:34px;flex-shrink:0}.exercise-select select{font-size:12px;padding-left:9px}.row-error{margin-left:0}.exercise-heading{gap:12px}.exercise-heading p{font-size:12px}.editor-footer{flex-direction:column;align-items:stretch;gap:17px}.editor-footer p{max-width:none}.footer-actions{width:100%}.footer-actions button{flex:1}.exercise-heading h3{font-size:18px}}
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

  ngOnChanges(): void {
    this.name = this.routine ? this.routine.name + (this.routine.custom ? '' : ' · Mi versión') : '';
    this.description = this.routine?.description ?? '';
    this.duration = this.routine?.duration ?? 30;
    this.category = this.routine?.category ?? 'Fuerza';
    this.level = this.routine?.level ?? this.store.profile().level;
    this.entries = this.routine?.exercises.map(entry => ({ ...entry })) ?? [];
    this.attempted = false;
    this.saveError = '';
  }

  get title(): string {
    return !this.routine ? 'Creá tu rutina' : this.routine.custom ? 'Editar rutina' : 'Personalizar rutina';
  }

  get canAdd(): boolean {
    return this.entries.length < 12 && this.store.exercises().some(exercise => !this.isUsed(exercise.id));
  }

  get valid(): boolean {
    return this.name.trim().length > 0 && this.name.trim().length <= 80 && this.description.length <= 300
      && this.integerInRange(this.duration, 1, 240) && this.categories.includes(this.category)
      && this.levels.includes(this.level) && this.entries.length >= 1 && this.entries.length <= 12
      && this.entries.every(entry => this.validEntry(entry))
      && new Set(this.entries.map(entry => entry.exerciseId)).size === this.entries.length;
  }

  numberInRange(value: number, min: number, max: number): boolean {
    return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
  }

  integerInRange(value: number, min: number, max: number): boolean {
    return this.numberInRange(value, min, max) && Number.isInteger(value);
  }

  validEntry(entry: RoutineExercise): boolean {
    return this.store.exercises().some(exercise => exercise.id === entry.exerciseId)
      && this.integerInRange(entry.sets, 1, 10) && this.integerInRange(entry.reps, 1, 999)
      && this.numberInRange(entry.weight, 0, 2000) && this.integerInRange(entry.restSeconds, 0, 600);
  }

  isUsed(exerciseId: string, exceptIndex = -1): boolean {
    return this.entries.some((entry, index) => index !== exceptIndex && entry.exerciseId === exerciseId);
  }

  addExercise(): void {
    if (!this.canAdd) return;
    const exercise = this.store.exercises().find(item => !this.isUsed(item.id));
    if (exercise) this.entries = [...this.entries, { exerciseId: exercise.id, sets: 3, reps: 10, weight: 0, restSeconds: 60 }];
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
      exercises: this.entries.map(entry => ({ ...entry })),
    };
    if (this.store.saveRoutine(routine)) this.saved.emit();
    else this.saveError = this.store.actionError() ?? 'No pudimos guardar la rutina. Revisá los datos e intentá otra vez.';
  }
}
