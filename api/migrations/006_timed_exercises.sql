-- Estado v5. NULL conserva las series históricas por repeticiones.
ALTER TABLE routine_exercises ADD COLUMN duration_seconds INT UNSIGNED NULL AFTER rest_seconds;
ALTER TABLE workout_sets ADD COLUMN duration_seconds INT UNSIGNED NULL AFTER completed
