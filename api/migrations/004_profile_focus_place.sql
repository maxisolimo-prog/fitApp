-- Perfil v3: objetivo principal y lugar de entrenamiento, para las sugerencias.

ALTER TABLE users
  ADD COLUMN focus ENUM('fuerza','musculo','grasa','salud') NOT NULL DEFAULT 'fuerza' AFTER weight,
  ADD COLUMN place ENUM('gimnasio','casa-pesas','casa-sin-equipo') NOT NULL DEFAULT 'gimnasio' AFTER focus
