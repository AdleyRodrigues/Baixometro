-- Fase 4: Índices compostos para agregações do Dashboard e Alertas de Preço
CREATE INDEX IF NOT EXISTS idx_receipts_user_issued_at
    ON receipts (user_id, issued_at DESC);

CREATE INDEX IF NOT EXISTS idx_price_observations_product_observed_at
    ON price_observations (product_id, observed_at DESC);

