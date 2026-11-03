import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type { Pool } from 'pg'
import { createPool } from '../../src/db.js'
import { runMigrations } from '../../src/migrations.js'

export const MIGRATIONS_DIR = fileURLToPath(new URL('../../db/migrations', import.meta.url))

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

// Remet la base dans son état d'origine, avant toute migration.
export async function createBaseSchema(pool: Pool): Promise<void> {
  const sql = await readFile(new URL('../../db/init.sql', import.meta.url), 'utf8')
  await pool.query(sql)
}

export async function createSchema(pool: Pool): Promise<void> {
  await createBaseSchema(pool)
  await runMigrations(pool, MIGRATIONS_DIR)
}

export async function clearWishlist(pool: Pool): Promise<void> {
  await pool.query('TRUNCATE wishlist RESTART IDENTITY')
}
