-- Fase 16: O Pivô - Localização de lojas e notas fiscais anônimas

-- 1. Adicionar colunas de cidade e estado na tabela de estabelecimentos
ALTER TABLE stores
    ADD COLUMN IF NOT EXISTS city VARCHAR(100),
    ADD COLUMN IF NOT EXISTS state VARCHAR(2);

CREATE INDEX IF NOT EXISTS idx_stores_city_state ON stores (lower(city), lower(state));

-- 2. Tornar user_id na tabela receipts opcional (nullable) para permitir doações anônimas de notas
ALTER TABLE receipts
    ALTER COLUMN user_id DROP NOT NULL;

-- 3. Atualizar foreign key de receipts para ON DELETE SET NULL
ALTER TABLE receipts
    DROP CONSTRAINT IF EXISTS receipts_user_id_fkey;

ALTER TABLE receipts
    ADD CONSTRAINT receipts_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL;

