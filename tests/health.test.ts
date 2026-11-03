import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import type { WishlistRepository } from '../src/wishlistRepository.js'

// /health ne touche pas à la base : ces tests n'en ont pas besoin.
const app = createApp({} as WishlistRepository)

describe('GET /health', () => {
  it('répond 200 avec le statut ok', async () => {
    const response = await app.request('/health')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ status: 'ok' })
  })

  it('répond 404 sur une route inconnue', async () => {
    const response = await app.request('/inconnue')

    expect(response.status).toBe(404)
  })

  it('répond 404 en POST', async () => {
    const response = await app.request('/health', { method: 'POST' })

    expect(response.status).toBe(404)
  })
})
