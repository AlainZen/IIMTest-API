import { handle } from 'hono/aws-lambda'
import { createApp, DEFAULT_CORS_ORIGIN } from './app.js'
import { createPool } from './db.js'
import { createWishlistRepository } from './wishlistRepository.js'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error('DATABASE_URL est manquant : ajoute-le aux variables de la fonction Lambda.')
}

// Une instance de Lambda traite une requête à la fois : une seule connexion suffit.
const pool = createPool(databaseUrl, 1)

export const handler = handle(
  createApp(createWishlistRepository(pool), process.env.CORS_ORIGIN ?? DEFAULT_CORS_ORIGIN),
)
