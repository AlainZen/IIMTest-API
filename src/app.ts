import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createWishlistRoutes } from './wishlist.js'
import type { WishlistRepository } from './wishlistRepository.js'

export const DEFAULT_CORS_ORIGIN = 'http://localhost:3000'

export function createApp(
  repository: WishlistRepository,
  corsOrigin: string = DEFAULT_CORS_ORIGIN,
): Hono {
  const app = new Hono()

  // Le front tourne sur un autre port : le navigateur doit y être autorisé.
  app.use('*', cors({ origin: corsOrigin }))

  app.get('/health', c => c.json({ status: 'ok' }))
  app.route('/wishlist', createWishlistRoutes(repository))

  app.onError((error, c) => {
    console.error(error)
    return c.json({ code: 'server_error', error: "L'API n'a pas pu traiter la demande." }, 500)
  })

  return app
}
