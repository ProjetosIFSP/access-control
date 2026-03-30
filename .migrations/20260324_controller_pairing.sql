-- Permite controlador em modo pareamento sem sala vinculada.
ALTER TABLE door_controller
  ALTER COLUMN room_id DROP NOT NULL;
