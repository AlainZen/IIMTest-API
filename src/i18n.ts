import type { Context } from 'hono'
import de from './locales/de.json' with { type: 'json' }
import en from './locales/en.json' with { type: 'json' }
import es from './locales/es.json' with { type: 'json' }
import fr from './locales/fr.json' with { type: 'json' }

export const SUPPORTED_LOCALES = ['en', 'fr', 'es', 'de']
export const DEFAULT_LOCALE = 'en'

export type ErrorCode = keyof typeof en.errors

const MESSAGES: Record<string, typeof en> = { en, fr, es, de }

export interface AppEnv {
  Variables: {
    language: string
  }
}

// Le message d'erreur suit la langue demandée par l'en-tête Accept-Language.
export function errorBody(c: Context<AppEnv>, code: ErrorCode): { code: ErrorCode; error: string } {
  const messages = MESSAGES[c.get('language')] ?? en
  return { code, error: messages.errors[code] }
}
