import { Pool } from 'pg'

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]']

export function createPool(connectionString: string, max = 5): Pool {
  const url = new URL(connectionString)
  const isLocal = LOCAL_HOSTS.includes(url.hostname)

  // Le paramètre sslmode écraserait le réglage ssl ci-dessous.
  url.searchParams.delete('sslmode')

  const pool = new Pool({
    connectionString: url.toString(),
    max,
    connectionTimeoutMillis: 5000,
    // Supabase chiffre la connexion avec son propre certificat, absent des autorités connues de Node.
    ssl: isLocal ? false : { rejectUnauthorized: false },
  })

  // Sans ce gestionnaire, une connexion inactive coupée par le serveur ferait planter l'API.
  pool.on('error', error => {
    console.error('Connexion PostgreSQL perdue :', error.message)
  })

  return pool
}
