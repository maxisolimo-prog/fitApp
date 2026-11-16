-- Semana tipo (FitAppState v2): una rutina o descanso por día de la semana; 0 = lunes … 6 = domingo.
-- Sólo se guardan los días con rutina; los que faltan son descanso.

CREATE TABLE weekly_plan (
  user_id    BIGINT UNSIGNED NOT NULL,
  weekday    TINYINT UNSIGNED NOT NULL,
  routine_id VARBINARY(400) NOT NULL,
  PRIMARY KEY (user_id, weekday),
  CONSTRAINT ck_weekly_plan_weekday CHECK (weekday <= 6),
  CONSTRAINT fk_weekly_plan_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB
