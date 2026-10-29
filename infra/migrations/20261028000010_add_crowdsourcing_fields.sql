-- Fase 12: Crowdsourcing de precos (compartilhamento anonimo)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS share_data BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE price_observations
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_price_observations_public
    ON price_observations (is_public, observed_at DESC)
    WHERE is_public = true;

