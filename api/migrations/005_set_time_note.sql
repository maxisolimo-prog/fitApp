-- Series v4: hora en que se completó cada serie y comentario opcional.
-- Las series registradas antes quedan sin hora (NULL): no se inventa.

ALTER TABLE workout_sets
  ADD COLUMN completed_at DATETIME(3) NULL AFTER completed,
  ADD COLUMN note VARCHAR(200) NULL AFTER completed_at
