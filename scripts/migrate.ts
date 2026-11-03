// Applique les migrations sur la base de DATABASE_URL.
import { fileURLToPath } from 'node:url'
import { createPool } from '../src/db.js'
import { runMigrations } from '../src/migrations.js'

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  console.error('DATABASE_URL est manquant : ajoute-le dans .env.')
  process.exit(1)
}

const pool = createPool(databaseUrl, 1)

try {
  const applied = await runMigrations(
    pool,
    fileURLToPath(new URL('../db/migrations', import.meta.url)),
  )

  if (applied.length) {
    console.log(`Migrations appliquées : ${applied.join(', ')}`)
  } else {
    console.log('Aucune migration à appliquer.')
  }
} catch (error) {
  console.error(error)
  process.exitCode = 1
} finally {
  await pool.end()
}
