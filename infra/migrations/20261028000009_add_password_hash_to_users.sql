-- Fase 11: Autenticacao real (JWT + Argon2)
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT NOT NULL DEFAULT '';
