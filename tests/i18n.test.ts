import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import type { WishlistRepository } from '../src/wishlistRepository.js'

// Aucune donnée n'est lue : un id inconnu suffit à obtenir un message d'erreur.
const repository = { remove: () => Promise.resolve(false) } as unknown as WishlistRepository
const app = createApp(repository)

async function errorIn(language?: string): Promise<unknown> {
  const response = await app.request('/wishlist/99', {
    method: 'DELETE',
    headers: language ? { 'Accept-Language': language } : {},
  })
  expect(response.status).toBe(404)
  return ((await response.json()) as { error: string }).error
}

describe('langue des erreurs', () => {
  it('répond en anglais par défaut', async () => {
    expect(await errorIn()).toBe('No wishlist entry with this id.')
  })

  it.each([
    ['en', 'No wishlist entry with this id.'],
    ['fr', 'Aucune entrée de la wishlist avec cet id.'],
    ['es', 'No hay ninguna entrada de la lista de deseos con este id.'],
    ['de', 'Kein Wunschlisten-Eintrag mit dieser ID.'],
  ])('répond dans la langue demandée : %s', async (language, message) => {
    expect(await errorIn(language)).toBe(message)
  })

  it('comprend un en-tête de navigateur complet', async () => {
    expect(await errorIn('fr-FR,fr;q=0.9,en;q=0.8')).toBe(
      'Aucune entrée de la wishlist avec cet id.',
    )
  })

  it('revient à l’anglais pour une langue inconnue', async () => {
    expect(await errorIn('ja')).toBe('No wishlist entry with this id.')
  })
})
