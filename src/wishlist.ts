import { Hono } from 'hono'
import type { AppEnv } from './i18n.js'
import { errorBody } from './i18n.js'
import type { NewWishlistItem, WishlistRepository } from './wishlistRepository.js'

// Le plus grand entier accepté par une colonne INTEGER de PostgreSQL.
const MAX_INTEGER = 2_147_483_647
const MAX_NAME_LENGTH = 100
const MAX_IMAGE_LENGTH = 2048
const MAX_TYPES = 10

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0 && (value as number) <= MAX_INTEGER
}

function parseNewItem(value: unknown): NewWishlistItem | null {
  const body = value as Partial<NewWishlistItem> | null
  const types = body?.types ?? []
  const image = body?.image ?? null

  if (!isPositiveInteger(body?.pokemonId)) return null
  if (typeof body.name !== 'string') return null

  const name = body.name.trim()
  if (!name || name.length > MAX_NAME_LENGTH) return null
  if (!Array.isArray(types) || types.length > MAX_TYPES) return null
  if (!types.every(type => typeof type === 'string')) return null
  if (image !== null && (typeof image !== 'string' || image.length > MAX_IMAGE_LENGTH)) return null

  return { pokemonId: body.pokemonId, name, types, image }
}

export function createWishlistRoutes(repository: WishlistRepository): Hono<AppEnv> {
  const routes = new Hono<AppEnv>()

  routes.get('/', async c => c.json(await repository.list()))

  routes.post('/', async c => {
    const item = parseNewItem(await c.req.json().catch(() => null))

    if (!item) return c.json(errorBody(c, 'invalid'), 400)

    const result = await repository.add(item)

    if (result.status === 'duplicate') return c.json(errorBody(c, 'duplicate'), 409)
    if (result.status === 'full') return c.json(errorBody(c, 'full'), 409)

    return c.json(result.item, 201)
  })

  routes.delete('/:id{[0-9]+}', async c => {
    const id = Number(c.req.param('id'))
    const removed = isPositiveInteger(id) && (await repository.remove(id))

    if (!removed) return c.json(errorBody(c, 'not_found'), 404)

    return c.body(null, 204)
  })

  routes.post('/:id{[0-9]+}/like', async c => {
    const id = Number(c.req.param('id'))
    const item = isPositiveInteger(id) ? await repository.like(id) : null

    if (!item) return c.json(errorBody(c, 'not_found'), 404)

    return c.json(item)
  })

  return routes
}
