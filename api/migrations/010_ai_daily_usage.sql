-- El límite diario por cuenta sobrevive a reinicios; no guarda pedidos ni respuestas.
CREATE TABLE ai_daily_usage (
  user_id BIGINT UNSIGNED NOT NULL,
  date DATE NOT NULL,
  requests INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date),
  CONSTRAINT fk_ai_daily_usage_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB
