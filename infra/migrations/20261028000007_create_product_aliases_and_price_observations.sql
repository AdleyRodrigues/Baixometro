-- Fase 3: Inteligência de Produtos (Aliases e Histórico de Preços)

-- Aliases ligam descrições brutas de cupons fiscais a um produto canônico.
CREATE TABLE IF NOT EXISTS product_aliases (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id       UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    raw_description  TEXT NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_aliases_lower_raw
    ON product_aliases (lower(raw_description));
CREATE INDEX IF NOT EXISTS idx_product_aliases_product_id
    ON product_aliases (product_id);

-- Observações históricas de preço unitário e preço normalizado (R$/kg ou R$/L).
CREATE TABLE IF NOT EXISTS price_observations (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id           UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    store_id             UUID NOT NULL REFERENCES stores (id) ON DELETE CASCADE,
    receipt_item_id      UUID NOT NULL REFERENCES receipt_items (id) ON DELETE CASCADE,
    unit_price           NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    unit_price_per_kg_l  NUMERIC(12, 2),
    observed_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_observations_product_id
    ON price_observations (product_id);
CREATE INDEX IF NOT EXISTS idx_price_observations_store_id
    ON price_observations (store_id);
CREATE INDEX IF NOT EXISTS idx_price_observations_receipt_item_id
    ON price_observations (receipt_item_id);
CREATE INDEX IF NOT EXISTS idx_price_observations_observed_at
    ON price_observations (observed_at);

