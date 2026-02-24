-- Migration: adicionar room_type, associar rooms a um tipo e permissões por tipo
BEGIN;

-- criar tabela room_type
CREATE TABLE IF NOT EXISTS room_type (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT ''
);

-- garantir um tipo padrão 'Sala'
INSERT INTO room_type (id, name, description)
SELECT 'room-type-sala', 'Sala', 'Tipo padrão para salas'
WHERE NOT EXISTS (SELECT 1 FROM room_type WHERE name = 'Sala');

-- adicionar coluna type_id em room e setar para tipo padrão quando nulo
ALTER TABLE IF EXISTS room
  ADD COLUMN IF NOT EXISTS type_id text REFERENCES room_type(id);

UPDATE room
SET type_id = (SELECT id FROM room_type WHERE name = 'Sala')
WHERE type_id IS NULL;

-- agora tornar obrigatória
ALTER TABLE room ALTER COLUMN type_id SET NOT NULL;

-- permissões por tipo
CREATE TABLE IF NOT EXISTS user_room_type_permission (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  room_type_id text NOT NULL REFERENCES room_type(id) ON DELETE CASCADE,
  expires_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_user_room_type ON user_room_type_permission(user_id, room_type_id);

CREATE TABLE IF NOT EXISTS profile_room_type_permission (
  id text PRIMARY KEY,
  profile_id text NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  room_type_id text NOT NULL REFERENCES room_type(id) ON DELETE CASCADE,
  expires_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_profile_room_type ON profile_room_type_permission(profile_id, room_type_id);

COMMIT;
