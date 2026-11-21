-- Estado v7: secuencia optativa, independiente del calendario.
CREATE TABLE training_programs (
  user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  definition LONGTEXT NOT NULL,
  CONSTRAINT fk_training_program_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

ALTER TABLE workouts ADD COLUMN program_id VARCHAR(100) NULL, ADD COLUMN program_position SMALLINT UNSIGNED NULL
