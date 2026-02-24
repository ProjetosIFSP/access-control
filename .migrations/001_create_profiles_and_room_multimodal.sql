-- Migration: criar tabelas de profile e permissões de perfil, adicionar campos multimodais em room
BEGIN;

-- adicionar colunas em room
ALTER TABLE IF EXISTS room
  ADD COLUMN IF NOT EXISTS requires_biometry boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_rfid boolean DEFAULT false;

-- criar tabela profile
CREATE TABLE IF NOT EXISTS profile (
  id text PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- tabela user_profile (N:N)
CREATE TABLE IF NOT EXISTS user_profile (
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  profile_id text NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, profile_id)
);

-- profile_room_permission
CREATE TABLE IF NOT EXISTS profile_room_permission (
  id text PRIMARY KEY,
  profile_id text NOT NULL REFERENCES profile(id) ON DELETE CASCADE,
  room_id text NOT NULL REFERENCES room(id) ON DELETE CASCADE,
  expires_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- índice único para evitar duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS ux_profile_room ON profile_room_permission(profile_id, room_id);

COMMIT;
