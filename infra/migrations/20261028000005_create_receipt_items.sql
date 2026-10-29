-- Itens de cada nota fiscal.
CREATE TABLE IF NOT EXISTS receipt_items (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id   UUID NOT NULL REFERENCES receipts (id) ON DELETE CASCADE,
    category_id  UUID REFERENCES categories (id) ON DELETE SET NULL,
    description  TEXT NOT NULL,
    quantity     NUMERIC(12, 3) NOT NULL CHECK (quantity > 0),
    unit         VARCHAR(10) NOT NULL DEFAULT 'UN',
    unit_price   NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    total_price  NUMERIC(12, 2) NOT NULL CHECK (total_price >= 0),
    gtin         VARCHAR(14)
);

CREATE INDEX IF NOT EXISTS idx_receipt_items_receipt_id  ON receipt_items (receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_items_category_id ON receipt_items (category_id);

