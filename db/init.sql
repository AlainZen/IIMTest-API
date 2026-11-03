-- Crée la table de la wishlist. À exécuter une fois dans l'éditeur SQL de Supabase.
CREATE TABLE IF NOT EXISTS wishlist (
  id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pokemon_id INTEGER NOT NULL UNIQUE CHECK (pokemon_id > 0),
  name TEXT NOT NULL CHECK (btrim(name) <> ''),
  types TEXT[] NOT NULL DEFAULT '{}',
  image TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bloque l'accès public de Supabase à cette table. L'API s'y connecte en tant que propriétaire.
ALTER TABLE wishlist ENABLE ROW LEVEL SECURITY;
