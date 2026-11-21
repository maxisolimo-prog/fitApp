-- Estado v6: favoritos del alumno. Las cuentas anteriores empiezan con una lista vacía.
CREATE TABLE favorite_exercises (
  user_id BIGINT UNSIGNED NOT NULL,
  exercise_id VARBINARY(400) NOT NULL,
  PRIMARY KEY (user_id, exercise_id),
  CONSTRAINT fk_favorite_exercises_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB
