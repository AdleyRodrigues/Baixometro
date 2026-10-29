-- Mercados/estabelecimentos emissores das notas.
-- `cnpj` é UNIQUE mas aceita NULL: notas digitadas manualmente podem não ter CNPJ
-- (o Postgres permite múltiplos NULLs em colunas UNIQUE).
CREATE TABLE IF NOT EXISTS stores (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    cnpj        VARCHAR(14) UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Busca de mercado por nome (case-insensitive) ao cadastrar notas manuais.
CREATE INDEX IF NOT EXISTS idx_stores_lower_name ON stores (lower(name));

