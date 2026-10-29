-- Notas fiscais (cupons) de compra.
CREATE TABLE IF NOT EXISTS receipts (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    store_id      UUID NOT NULL REFERENCES stores (id) ON DELETE RESTRICT,
    issued_at     TIMESTAMPTZ NOT NULL,
    total_amount  NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
    access_key    VARCHAR(44),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipts_user_id   ON receipts (user_id);
CREATE INDEX IF NOT EXISTS idx_receipts_store_id  ON receipts (store_id);
CREATE INDEX IF NOT EXISTS idx_receipts_issued_at ON receipts (issued_at);

