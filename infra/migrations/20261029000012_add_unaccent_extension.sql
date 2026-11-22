-- Migration: Habilita extensão unaccent para buscas insensíveis a acentos (ex: São Paulo vs Sao Paulo)
CREATE EXTENSION IF NOT EXISTS unaccent;

