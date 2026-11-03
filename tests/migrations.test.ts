import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Pool } from 'pg'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { runMigrations } from '../src/migrations.js'
import {
  createBaseSchema,
  createSchema,
  createTestPool,
  MIGRATIONS_DIR,
} from './helpers/testDatabase.js'

let pool: Pool
let directory: string

async function appliedNames(): Promise<string[]> {
  const { rows } = await pool.query<{ name: string }>(
    'SELECT name FROM schema_migrations ORDER BY name',
  )
  return rows.map(row => row.name)
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    'SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2',
    [table, column],
  )
  return Boolean(rowCount)
}

beforeAll(() => {
  pool = createTestPool()
})

// Chaque test repart de la base telle qu'elle était avant la première migration.
beforeEach(async () => {
  await pool.query('DROP TABLE IF EXISTS wishlist, schema_migrations, essai')
  await createBaseSchema(pool)
  directory = await mkdtemp(join(tmpdir(), 'migrations-'))
})

afterEach(async () => {
  await rm(directory, { recursive: true, force: true })
})

// Rend aux autres fichiers de tests une base complète.
afterAll(async () => {
  await pool.query('DROP TABLE IF EXISTS wishlist, schema_migrations, essai')
  await createSchema(pool)
  await pool.end()
})

describe('001_likes.sql', () => {
  it('garde les lignes existantes et les met à 0 like', async () => {
    await pool.query(
      "INSERT INTO wishlist (pokemon_id, name, types) VALUES (25, 'Pikachu', '{electric}')",
    )

    await expect(runMigrations(pool, MIGRATIONS_DIR)).resolves.toEqual(['001_likes.sql'])

    const { rows } = await pool.query('SELECT pokemon_id, name, types, likes FROM wishlist')
    expect(rows).toEqual([{ pokemon_id: 25, name: 'Pikachu', types: ['electric'], likes: 0 }])
  })

  it('refuse un nombre de likes négatif', async () => {
    await runMigrations(pool, MIGRATIONS_DIR)
    await pool.query("INSERT INTO wishlist (pokemon_id, name) VALUES (25, 'Pikachu')")

    await expect(pool.query('UPDATE wishlist SET likes = -1')).rejects.toThrow()
  })
})

describe('runMigrations', () => {
  it('note la migration dans schema_migrations', async () => {
    await runMigrations(pool, MIGRATIONS_DIR)

    await expect(appliedNames()).resolves.toEqual(['001_likes.sql'])
  })

  it('ne rejoue pas une migration déjà appliquée et ne touche pas aux données', async () => {
    await runMigrations(pool, MIGRATIONS_DIR)
    await pool.query("INSERT INTO wishlist (pokemon_id, name, likes) VALUES (25, 'Pikachu', 3)")

    await expect(runMigrations(pool, MIGRATIONS_DIR)).resolves.toEqual([])

    const { rows } = await pool.query('SELECT name, likes FROM wishlist')
    expect(rows).toEqual([{ name: 'Pikachu', likes: 3 }])
    await expect(appliedNames()).resolves.toEqual(['001_likes.sql'])
  })

  it('applique une seule fois quand deux lancements arrivent en même temps', async () => {
    const results = await Promise.all([
      runMigrations(pool, MIGRATIONS_DIR),
      runMigrations(pool, MIGRATIONS_DIR),
    ])

    expect(results.flat()).toEqual(['001_likes.sql'])
  })

  it('applique les fichiers dans l’ordre de leur numéro', async () => {
    await writeFile(join(directory, '002_b.sql'), 'ALTER TABLE essai ADD COLUMN b INTEGER;')
    await writeFile(join(directory, '001_a.sql'), 'CREATE TABLE essai (a INTEGER);')
    await writeFile(join(directory, 'notes.txt'), 'pas une migration')

    await expect(runMigrations(pool, directory)).resolves.toEqual(['001_a.sql', '002_b.sql'])
  })

  it('n’applique que la nouvelle migration au lancement suivant', async () => {
    await writeFile(join(directory, '001_a.sql'), 'CREATE TABLE essai (a INTEGER);')
    await runMigrations(pool, directory)

    await writeFile(join(directory, '002_b.sql'), 'ALTER TABLE essai ADD COLUMN b INTEGER;')

    await expect(runMigrations(pool, directory)).resolves.toEqual(['002_b.sql'])
  })

  it('annule entièrement une migration ratée et garde les précédentes', async () => {
    await writeFile(join(directory, '001_a.sql'), 'CREATE TABLE essai (a INTEGER);')
    await writeFile(
      join(directory, '002_b.sql'),
      'ALTER TABLE essai ADD COLUMN b INTEGER; SELECT 1 / 0;',
    )
    await writeFile(join(directory, '003_c.sql'), 'ALTER TABLE essai ADD COLUMN c INTEGER;')

    await expect(runMigrations(pool, directory)).rejects.toThrow('La migration 002_b.sql a échoué')

    await expect(appliedNames()).resolves.toEqual(['001_a.sql'])
    await expect(columnExists('essai', 'a')).resolves.toBe(true)
    await expect(columnExists('essai', 'b')).resolves.toBe(false)
    await expect(columnExists('essai', 'c')).resolves.toBe(false)
  })
})
