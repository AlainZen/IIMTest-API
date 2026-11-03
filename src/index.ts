import { serve } from '@hono/node-server'
import { createApp, DEFAULT_CORS_ORIGIN } from './app.js'
import { createPool } from './db.js'
import { createWishlistRepository } from './wishlistRepository.js'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('DATABASE_URL est manquant : copie .env.example vers .env et remplis-le.')
  process.exit(1)
}

const port = Number(process.env.PORT ?? 3001)
const pool = createPool(databaseUrl)
const app = createApp(
  createWishlistRepository(pool),
  process.env.CORS_ORIGIN ?? DEFAULT_CORS_ORIGIN,
)

const server = serve({ fetch: app.fetch, port }, info => {
  console.log(`API disponible sur http://localhost:${info.port}`)
})

function shutdown(): void {
  server.close(() => {
    void pool.end().then(() => process.exit(0))
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
