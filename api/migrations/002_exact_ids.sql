-- Los ids los genera el cliente y el front los compara exactamente (mayúsculas, acentos y espacios cuentan).
-- Con utf8mb4_unicode_ci, 'upper-body' y 'UPPER-BODY' chocaban en la PK. VARBINARY compara byte a byte y es
-- portable a MySQL 8. 400 bytes = 100 caracteres de hasta 4 bytes, el límite de validateState.
-- El email ya se guarda normalizado en minúsculas: con utf8mb4_bin, 'á@b.co' deja de equivaler a 'a@b.co'.

SET FOREIGN_KEY_CHECKS = 0;

ALTER TABLE routines MODIFY id VARBINARY(400) NOT NULL;
ALTER TABLE routine_exercises MODIFY routine_id VARBINARY(400) NOT NULL, MODIFY exercise_id VARBINARY(400) NOT NULL;
ALTER TABLE workouts MODIFY id VARBINARY(400) NOT NULL, MODIFY routine_id VARBINARY(400) NOT NULL;
ALTER TABLE workout_sets MODIFY workout_id VARBINARY(400) NOT NULL, MODIFY exercise_id VARBINARY(400) NOT NULL;
ALTER TABLE scheduled_workouts MODIFY id VARBINARY(400) NOT NULL, MODIFY routine_id VARBINARY(400) NOT NULL;
ALTER TABLE weight_records MODIFY id VARBINARY(400) NOT NULL;
ALTER TABLE users MODIFY email VARCHAR(254) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL;

SET FOREIGN_KEY_CHECKS = 1;
