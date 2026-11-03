import { readFile } from 'node:fs/promises'
import type { Pool } from 'pg'
import { createPool } from '../../src/db.js'

// Les tests vident la table : ils refusent de tourner sur autre chose que la base de test.
export function createTestPool(): Pool {
  const testUrl = process.env.TEST_DATABASE_URL

  if (!testUrl) {
    throw new Error('TEST_DATABASE_URL est manquant : ajoute-le dans .env.')
  }
  if (testUrl === process.env.DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL doit viser une autre base que DATABASE_URL.')
  }

  return createPool(testUrl)
}

export async function createSchema(pool: Pool): Promise<void> {
  const sql = await readFile(new URL('../../db/init.sql', import.meta.url), 'utf8')
  await pool.query(sql)
}

export async function clearWishlist(pool: Pool): Promise<void> {
  await pool.query('TRUNCATE wishlist RESTART IDENTITY')
}
