import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Pool } from 'pg'

// Un numéro au choix : il empêche deux lancements simultanés d'appliquer la même migration.
const MIGRATIONS_LOCK = 20261103

const CREATE_MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;
`

// Applique dans l'ordre les fichiers .sql pas encore notés dans schema_migrations.
// Renvoie les noms des migrations appliquées pendant cet appel.
export async function runMigrations(pool: Pool, directory: string): Promise<string[]> {
  const files = (await readdir(directory)).filter(file => file.endsWith('.sql')).sort()
  const client = await pool.connect()
  const applied: string[] = []

  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATIONS_LOCK])
    await client.query(CREATE_MIGRATIONS_TABLE)

    const { rows } = await client.query<{ name: string }>('SELECT name FROM schema_migrations')
    const alreadyApplied = new Set(rows.map(row => row.name))

    for (const file of files) {
      if (alreadyApplied.has(file)) continue

      const sql = await readFile(join(directory, file), 'utf8')

      // Une migration ratée est annulée en entier : la base ne reste jamais à moitié modifiée.
      try {
        await client.query('BEGIN')
        await client.query(sql)
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK').catch(() => undefined)
        throw new Error(`La migration ${file} a échoué`, { cause: error })
      }

      applied.push(file)
    }

    return applied
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATIONS_LOCK]).catch(() => undefined)
    client.release()
  }
}
