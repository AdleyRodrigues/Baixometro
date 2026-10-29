-- Catálogo de produtos (identificados pelo GTIN/EAN quando disponível).
CREATE TABLE IF NOT EXISTS products (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gtin        VARCHAR(14) UNIQUE,
    name        TEXT NOT NULL,
    brand       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

