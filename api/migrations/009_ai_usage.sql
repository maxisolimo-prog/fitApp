-- Reserva mensual global de solicitudes de IA. Sin texto del alumno ni claves.
CREATE TABLE ai_monthly_usage (
  month CHAR(7) NOT NULL PRIMARY KEY,
  requests INT UNSIGNED NOT NULL DEFAULT 0
) ENGINE=InnoDB
