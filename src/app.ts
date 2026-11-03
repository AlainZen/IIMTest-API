import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { languageDetector } from 'hono/language'
import type { AppEnv } from './i18n.js'
import { DEFAULT_LOCALE, errorBody, SUPPORTED_LOCALES } from './i18n.js'
import { createWishlistRoutes } from './wishlist.js'
import type { WishlistRepository } from './wishlistRepository.js'

export const DEFAULT_CORS_ORIGIN = 'http://localhost:3000'

// corsOrigin accepte plusieurs adresses séparées par des virgules.
export function createApp(
  repository: WishlistRepository,
  corsOrigin: string = DEFAULT_CORS_ORIGIN,
): Hono<AppEnv> {
  const app = new Hono<AppEnv>()

  // Le front est sur une autre adresse : le navigateur doit y être autorisé.
  app.use('*', cors({ origin: corsOrigin.split(',').map(origin => origin.trim()) }))
  app.use(
    '*',
    languageDetector({
      order: ['header'],
      caches: false,
      supportedLanguages: SUPPORTED_LOCALES,
      fallbackLanguage: DEFAULT_LOCALE,
    }),
  )

  app.get('/health', c => c.json({ status: 'ok' }))
  app.route('/wishlist', createWishlistRoutes(repository))

  app.onError((error, c) => {
    console.error(error)
    return c.json(errorBody(c, 'server_error'), 500)
  })

  return app
}
