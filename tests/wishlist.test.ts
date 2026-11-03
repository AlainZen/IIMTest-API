import type { Hono } from 'hono'
import type { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'
import { createPool } from '../src/db.js'
import type { NewWishlistItem, WishlistItem } from '../src/wishlistRepository.js'
import { createWishlistRepository, MAX_WISHLIST_SIZE } from '../src/wishlistRepository.js'
import { clearWishlist, createSchema, createTestPool } from './helpers/testDatabase.js'

// Ces tests passent par une vraie base PostgreSQL, sans aucun mock SQL.
let pool: Pool
let app: Hono

const PIKACHU: NewWishlistItem = {
  pokemonId: 25,
  name: 'Pikachu',
  types: ['electric'],
  image: 'pikachu.png',
}

function pokemon(pokemonId: number): NewWishlistItem {
  return { pokemonId, name: `Pokémon ${pokemonId}`, types: [], image: null }
}

function post(target: Hono, body: unknown): Promise<Response> {
  return Promise.resolve(
    target.request('/wishlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    }),
  )
}

function remove(id: number | string): Promise<Response> {
  return Promise.resolve(app.request(`/wishlist/${id}`, { method: 'DELETE' }))
}

async function list(target: Hono = app): Promise<WishlistItem[]> {
  const response = await target.request('/wishlist')
  return (await response.json()) as WishlistItem[]
}

beforeAll(async () => {
  pool = createTestPool()
  await createSchema(pool)
  app = createApp(createWishlistRepository(pool))
})

beforeEach(async () => {
  await clearWishlist(pool)
})

afterAll(async () => {
  await pool.end()
})

describe('GET /wishlist', () => {
  it('répond 200 avec une liste vide au départ', async () => {
    const response = await app.request('/wishlist')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([])
  })

  it('renvoie les Pokémon ajoutés, dans l’ordre', async () => {
    await post(app, pokemon(4))
    await post(app, PIKACHU)

    expect((await list()).map(item => item.pokemonId)).toEqual([4, 25])
  })
})

describe('POST /wishlist', () => {
  it('répond 201 avec l’entrée créée', async () => {
    const response = await post(app, { ...PIKACHU, name: '  Pikachu ' })

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({
      id: 1,
      ...PIKACHU,
      addedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    })
  })

  it('écrit vraiment dans la table', async () => {
    await post(app, PIKACHU)

    const { rows } = await pool.query('SELECT pokemon_id, name, types, image FROM wishlist')

    expect(rows).toEqual([
      { pokemon_id: 25, name: 'Pikachu', types: ['electric'], image: 'pikachu.png' },
    ])
  })

  it('accepte une entrée sans types ni image', async () => {
    const response = await post(app, { pokemonId: 4, name: 'Salamèche' })

    expect(response.status).toBe(201)
    expect(await response.json()).toMatchObject({ types: [], image: null })
  })

  it('traite une injection SQL comme du simple texte', async () => {
    const name = "x'); DROP TABLE wishlist; --"

    const response = await post(app, { pokemonId: 1, name })

    expect(response.status).toBe(201)
    expect(await list()).toEqual([expect.objectContaining({ name })])
  })

  it.each([
    ['du JSON invalide', '{"pokemonId":'],
    ['null', null],
    ['une liste', []],
    ['sans pokemonId', { name: 'Salamèche' }],
    ['un pokemonId en texte', { pokemonId: '4', name: 'Salamèche' }],
    ['un pokemonId à virgule', { pokemonId: 4.5, name: 'Salamèche' }],
    ['un pokemonId négatif', { pokemonId: -4, name: 'Salamèche' }],
    ['un pokemonId à zéro', { pokemonId: 0, name: 'Salamèche' }],
    ['un pokemonId trop grand', { pokemonId: 2_147_483_648, name: 'Salamèche' }],
    ['sans name', { pokemonId: 4 }],
    ['un name vide', { pokemonId: 4, name: '   ' }],
    ['un name trop long', { pokemonId: 4, name: 'x'.repeat(101) }],
    ['un name qui n’est pas du texte', { pokemonId: 4, name: 12 }],
    ['des types qui ne sont pas une liste', { pokemonId: 4, name: 'Salamèche', types: 'fire' }],
    ['trop de types', { pokemonId: 4, name: 'Salamèche', types: Array(11).fill('fire') }],
    ['un type qui n’est pas du texte', { pokemonId: 4, name: 'Salamèche', types: [1] }],
    ['une image qui n’est pas du texte', { pokemonId: 4, name: 'Salamèche', image: 12 }],
    ['une image trop longue', { pokemonId: 4, name: 'Salamèche', image: 'x'.repeat(2049) }],
  ])('répond 400 pour %s, sans rien écrire', async (_label, body) => {
    const response = await post(app, body)

    expect(response.status).toBe(400)
    expect(await response.json()).toMatchObject({ code: 'invalid' })
    expect(await list()).toEqual([])
  })
})

describe('doublons', () => {
  it('répond 409 et ne crée pas de deuxième ligne', async () => {
    await post(app, PIKACHU)

    const response = await post(app, PIKACHU)

    expect(response.status).toBe(409)
    expect(await response.json()).toMatchObject({ code: 'duplicate' })
    expect(await list()).toHaveLength(1)
  })

  it('la contrainte de la table bloque aussi un doublon écrit directement en SQL', async () => {
    await post(app, PIKACHU)

    await expect(
      pool.query("INSERT INTO wishlist (pokemon_id, name) VALUES (25, 'Pikachu')"),
    ).rejects.toThrow(/unique/i)
  })

  it('n’accepte qu’une seule requête quand elles arrivent en même temps', async () => {
    const responses = await Promise.all(Array.from({ length: 5 }, () => post(app, PIKACHU)))

    expect(responses.map(response => response.status).sort()).toEqual([201, 409, 409, 409, 409])
    expect(await list()).toHaveLength(1)
  })
})

describe('limite de 6 Pokémon', () => {
  it('accepte le 6e et refuse le 7e', async () => {
    for (let id = 1; id < MAX_WISHLIST_SIZE; id += 1) await post(app, pokemon(id))

    expect((await post(app, pokemon(6))).status).toBe(201)

    const refused = await post(app, pokemon(7))

    expect(refused.status).toBe(409)
    expect(await refused.json()).toMatchObject({ code: 'full' })
    expect(await list()).toHaveLength(MAX_WISHLIST_SIZE)
  })

  it('ne dépasse pas 6 quand les ajouts arrivent en même temps', async () => {
    const responses = await Promise.all(
      Array.from({ length: 12 }, (_, index) => post(app, pokemon(index + 1))),
    )

    expect(responses.filter(response => response.status === 201)).toHaveLength(6)
    expect(responses.filter(response => response.status === 409)).toHaveLength(6)
    expect(await list()).toHaveLength(MAX_WISHLIST_SIZE)
  })

  it('un doublon sur une liste pleine reste un doublon', async () => {
    for (let id = 1; id <= MAX_WISHLIST_SIZE; id += 1) await post(app, pokemon(id))

    expect(await (await post(app, pokemon(1))).json()).toMatchObject({ code: 'duplicate' })
  })

  it('une suppression libère une place', async () => {
    for (let id = 1; id <= MAX_WISHLIST_SIZE; id += 1) await post(app, pokemon(id))

    await remove(1)

    expect((await post(app, pokemon(7))).status).toBe(201)
  })
})

describe('DELETE /wishlist/:id', () => {
  it('répond 204 et retire la ligne', async () => {
    await post(app, PIKACHU)

    const response = await remove(1)

    expect(response.status).toBe(204)
    expect(await response.text()).toBe('')
    expect(await list()).toEqual([])
  })

  it('ne retire que l’entrée demandée', async () => {
    await post(app, pokemon(4))
    await post(app, PIKACHU)

    await remove(1)

    expect((await list()).map(item => item.pokemonId)).toEqual([25])
  })

  it.each([
    ['qui n’existe pas', 99],
    ['à zéro', 0],
    ['trop grand pour la base', '99999999999'],
    ['qui n’est pas un nombre', 'abc'],
  ])('répond 404 pour un id %s', async (_label, id) => {
    await post(app, PIKACHU)

    expect((await remove(id)).status).toBe(404)
    expect(await list()).toHaveLength(1)
  })

  it('ne réutilise pas l’id d’une entrée supprimée', async () => {
    await post(app, pokemon(4))
    await remove(1)

    expect(await (await post(app, PIKACHU)).json()).toMatchObject({ id: 2 })
  })
})

describe('persistance', () => {
  it('une nouvelle instance de l’API retrouve les données', async () => {
    const firstPool = createTestPool()
    await post(createApp(createWishlistRepository(firstPool)), PIKACHU)
    await firstPool.end()

    const secondPool = createTestPool()
    const items = await list(createApp(createWishlistRepository(secondPool)))
    await secondPool.end()

    expect(items).toEqual([expect.objectContaining({ pokemonId: 25 })])
  })
})

describe('CORS', () => {
  it('autorise le front', async () => {
    const response = await app.request('/wishlist', {
      method: 'OPTIONS',
      headers: { Origin: 'http://localhost:3000', 'Access-Control-Request-Method': 'POST' },
    })

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000')
  })
})

describe('base de données indisponible', () => {
  it('répond 500 avec un message, sans détail technique', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const deadPool = createPool('postgresql://postgres@127.0.0.1:1/postgres')
    const deadApp = createApp(createWishlistRepository(deadPool))

    const responses = [await deadApp.request('/wishlist'), await post(deadApp, PIKACHU)]
    await deadPool.end()

    for (const response of responses) {
      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({
        code: 'server_error',
        error: "L'API n'a pas pu traiter la demande.",
      })
    }
  })
})
