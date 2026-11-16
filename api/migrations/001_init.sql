-- FitApp: esquema inicial. Cada dato personal lleva user_id y se borra en cascada con su usuario.
-- El catálogo de ejercicios vive en src/app/core/seed.ts; exercise_id se valida contra él en la API.

CREATE TABLE users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(254) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name          VARCHAR(80)  NOT NULL,
  goal          VARCHAR(200) NOT NULL,
  level         ENUM('Principiante','Intermedio','Avanzado') NOT NULL,
  weekly_goal   TINYINT UNSIGNED NOT NULL,
  weight        DOUBLE NULL,
  revision      INT UNSIGNED NOT NULL DEFAULT 0,
  created_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sessions (
  token_hash BINARY(32) NOT NULL PRIMARY KEY,
  user_id    BIGINT UNSIGNED NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY ix_sessions_user (user_id),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE routines (
  user_id     BIGINT UNSIGNED NOT NULL,
  id          VARCHAR(100) NOT NULL,
  position    SMALLINT UNSIGNED NOT NULL,
  name        VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  category    ENUM('Fuerza','Movilidad','Resistencia') NOT NULL,
  duration    SMALLINT UNSIGNED NOT NULL,
  level       ENUM('Principiante','Intermedio','Avanzado') NOT NULL,
  custom      TINYINT(1) NULL,
  PRIMARY KEY (user_id, id),
  CONSTRAINT fk_routines_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE routine_exercises (
  user_id      BIGINT UNSIGNED NOT NULL,
  routine_id   VARCHAR(100) NOT NULL,
  position     SMALLINT UNSIGNED NOT NULL,
  exercise_id  VARCHAR(100) NOT NULL,
  sets         SMALLINT UNSIGNED NOT NULL,
  reps         SMALLINT UNSIGNED NOT NULL,
  weight       DOUBLE NOT NULL,
  rest_seconds SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, routine_id, position),
  CONSTRAINT fk_routine_exercises_routine FOREIGN KEY (user_id, routine_id) REFERENCES routines(user_id, id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Entrenamientos terminados (is_active = 0) y la sesión en curso (is_active = 1, finished_at NULL).
CREATE TABLE workouts (
  user_id      BIGINT UNSIGNED NOT NULL,
  id           VARCHAR(100) NOT NULL,
  position     INT UNSIGNED NOT NULL,
  is_active    TINYINT(1) NOT NULL DEFAULT 0,
  routine_id   VARCHAR(100) NOT NULL,
  routine_name VARCHAR(100) NOT NULL,
  started_at   DATETIME(3) NOT NULL,
  finished_at  DATETIME(3) NULL,
  notes        TEXT NULL,
  PRIMARY KEY (user_id, id),
  KEY ix_workouts_finished (user_id, finished_at),
  CONSTRAINT fk_workouts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE workout_sets (
  user_id       BIGINT UNSIGNED NOT NULL,
  workout_id    VARCHAR(100) NOT NULL,
  position      SMALLINT UNSIGNED NOT NULL,
  exercise_id   VARCHAR(100) NOT NULL,
  exercise_name VARCHAR(100) NOT NULL,
  set_number    SMALLINT UNSIGNED NOT NULL,
  reps          SMALLINT UNSIGNED NOT NULL,
  weight        DOUBLE NOT NULL,
  completed     TINYINT(1) NOT NULL,
  PRIMARY KEY (user_id, workout_id, position),
  KEY ix_workout_sets_exercise (user_id, exercise_id),
  CONSTRAINT fk_workout_sets_workout FOREIGN KEY (user_id, workout_id) REFERENCES workouts(user_id, id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE scheduled_workouts (
  user_id    BIGINT UNSIGNED NOT NULL,
  id         VARCHAR(100) NOT NULL,
  date       DATE NOT NULL,
  routine_id VARCHAR(100) NOT NULL,
  PRIMARY KEY (user_id, id),
  UNIQUE KEY uq_schedule_date (user_id, date),
  CONSTRAINT fk_schedule_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE weight_records (
  user_id BIGINT UNSIGNED NOT NULL,
  id      VARCHAR(100) NOT NULL,
  date    DATE NOT NULL,
  weight  DOUBLE NOT NULL,
  PRIMARY KEY (user_id, id),
  UNIQUE KEY uq_weight_date (user_id, date),
  CONSTRAINT fk_weights_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
