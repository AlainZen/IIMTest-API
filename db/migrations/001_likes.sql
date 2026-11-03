-- Les lignes déjà présentes sont gardées et commencent à 0 like.
ALTER TABLE wishlist
  ADD COLUMN likes INTEGER NOT NULL DEFAULT 0 CHECK (likes >= 0);
