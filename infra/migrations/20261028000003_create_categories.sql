-- Categorias de gasto (globais na Fase 1).
CREATE TABLE IF NOT EXISTS categories (
    id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name   TEXT NOT NULL UNIQUE,
    color  VARCHAR(7) NOT NULL DEFAULT '#64748b',
    icon   TEXT NOT NULL DEFAULT '🛒'
);

-- Categorias padrão para o MVP.
INSERT INTO categories (name, color, icon) VALUES
    ('Hortifruti', '#22c55e', '🥦'),
    ('Carnes',     '#ef4444', '🥩'),
    ('Laticínios', '#facc15', '🧀'),
    ('Padaria',    '#f97316', '🥖'),
    ('Mercearia',  '#a855f7', '🥫'),
    ('Bebidas',    '#38bdf8', '🥤'),
    ('Limpeza',    '#14b8a6', '🧽'),
    ('Higiene',    '#ec4899', '🧴')
ON CONFLICT (name) DO NOTHING;

