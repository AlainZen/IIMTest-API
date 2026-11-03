import type { Pool } from 'pg'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { clearWishlist, createSchema, createTestPool } from './helpers/testDatabase.js'

const ORIGIN = 'https://pokewishlist.example'

type Handler = (event: unknown) => Promise<{
  statusCode: number
  body: string
  headers: Record<string, string>
}>

let pool: Pool
let handler: Handler

// Reproduit l'événement envoyé par une HTTP API d'API Gateway.
function event(method: string, path: string, body?: unknown): unknown {
  return {
    version: '2.0',
    routeKey: '$default',
    rawPath: path,
    rawQueryString: '',
    cookies: [],
    headers: {
      host: 'abc123.execute-api.eu-west-2.amazonaws.com',
      origin: ORIGIN,
      'content-type': 'application/json',
    },
    isBase64Encoded: false,
    body: body === undefined ? undefined : JSON.stringify(body),
    requestContext: {
      accountId: '123456789012',
      apiId: 'abc123',
      domainName: 'abc123.execute-api.eu-west-2.amazonaws.com',
      domainPrefix: 'abc123',
      requestId: 'test',
      routeKey: '$default',
      stage: '$default',
      time: '03/Nov/2026:15:00:00 +0000',
      timeEpoch: 1_793_800_000_000,
      http: { method, path, protocol: 'HTTP/1.1', sourceIp: '127.0.0.1', userAgent: 'vitest' },
    },
  }
}

beforeAll(async () => {
  pool = createTestPool()
  await createSchema(pool)

  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
  process.env.CORS_ORIGIN = ORIGIN
  handler = (await import('../src/lambda.js')).handler as unknown as Handler
})

beforeEach(async () => {
  await clearWishlist(pool)
})

afterAll(async () => {
  await pool.end()
})

describe('handler Lambda', () => {
  it('GET /health répond 200', async () => {
    const response = await handler(event('GET', '/health'))

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.body)).toEqual({ status: 'ok' })
  })

  it('POST, GET puis DELETE /wishlist passent par la base', async () => {
    const created = await handler(event('POST', '/wishlist', { pokemonId: 25, name: 'Pikachu' }))
    expect(created.statusCode).toBe(201)

    const listed = await handler(event('GET', '/wishlist'))
    expect(JSON.parse(listed.body)).toEqual([expect.objectContaining({ pokemonId: 25 })])

    const { id } = JSON.parse(created.body) as { id: number }
    const deleted = await handler(event('DELETE', `/wishlist/${id}`))
    expect(deleted.statusCode).toBe(204)
  })

  it('POST /wishlist/:id/like ajoute un like', async () => {
    const created = await handler(event('POST', '/wishlist', { pokemonId: 25, name: 'Pikachu' }))
    const { id } = JSON.parse(created.body) as { id: number }

    const liked = await handler(event('POST', `/wishlist/${id}/like`))

    expect(liked.statusCode).toBe(200)
    expect(JSON.parse(liked.body)).toMatchObject({ id, likes: 1 })
  })

  it('applique le CORS configuré dans la fonction', async () => {
    const response = await handler(event('GET', '/health'))

    expect(response.headers['access-control-allow-origin']).toBe(ORIGIN)
  })
})
