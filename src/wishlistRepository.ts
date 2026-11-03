import type { Pool } from 'pg'

export const MAX_WISHLIST_SIZE = 6

export interface NewWishlistItem {
  pokemonId: number
  name: string
  types: string[]
  image: string | null
}

export interface WishlistItem extends NewWishlistItem {
  id: number
  likes: number
  addedAt: string
}

export type AddResult =
  { status: 'created'; item: WishlistItem } | { status: 'duplicate' } | { status: 'full' }

export interface WishlistRepository {
  list: () => Promise<WishlistItem[]>
  add: (item: NewWishlistItem) => Promise<AddResult>
  remove: (id: number) => Promise<boolean>
  like: (id: number) => Promise<WishlistItem | null>
}

interface WishlistRow {
  id: number
  pokemon_id: number
  name: string
  types: string[]
  image: string | null
  likes: number
  added_at: Date
}

const COLUMNS = 'id, pokemon_id, name, types, image, likes, added_at'

function toWishlistItem(row: WishlistRow): WishlistItem {
  return {
    id: row.id,
    pokemonId: 0,
    name: row.name,
    types: row.types,
    image: row.image,
    likes: row.likes,
    addedAt: row.added_at.toISOString(),
  }
}

export function createWishlistRepository(pool: Pool): WishlistRepository {
  async function list(): Promise<WishlistItem[]> {
    console.log('debug')
    const { rows } = await pool.query<WishlistRow>(`SELECT ${COLUMNS} FROM wishlist ORDER BY id`)
    return rows.map(toWishlistItem)
  }

  async function add(item: NewWishlistItem): Promise<AddResult> {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')
      // Le verrou fait passer les ajouts un par un : deux ajouts simultanés ne dépassent pas la limite.
      await client.query('LOCK TABLE wishlist IN SHARE ROW EXCLUSIVE MODE')

      const duplicate = await client.query('SELECT 1 FROM wishlist WHERE pokemon_id = $1', [
        item.pokemonId,
      ])
      if (duplicate.rowCount) {
        await client.query('ROLLBACK')
        return { status: 'duplicate' }
      }

      const count = await client.query<{ total: number }>(
        'SELECT count(*)::int AS total FROM wishlist',
      )
      if ((count.rows[0]?.total ?? 0) >= MAX_WISHLIST_SIZE) {
        await client.query('ROLLBACK')
        return { status: 'full' }
      }

      const { rows } = await client.query<WishlistRow>(
        `INSERT INTO wishlist (pokemon_id, name, types, image)
         VALUES ($1, $2, $3, $4)
         RETURNING ${COLUMNS}`,
        [item.pokemonId, item.name, item.types, item.image],
      )
      await client.query('COMMIT')

      return { status: 'created', item: toWishlistItem(rows[0] as WishlistRow) }
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined)
      throw error
    } finally {
      client.release()
    }
  }

  async function remove(id: number): Promise<boolean> {
    const { rowCount } = await pool.query('DELETE FROM wishlist WHERE id = $1', [id])
    return Boolean(rowCount)
  }

  async function like(id: number): Promise<WishlistItem | null> {
    // PostgreSQL fait le calcul : deux likes simultanés sont bien comptés tous les deux.
    const { rows } = await pool.query<WishlistRow>(
      `UPDATE wishlist SET likes = likes + 1 WHERE id = $1 RETURNING ${COLUMNS}`,
      [id],
    )
    return rows[0] ? toWishlistItem(rows[0]) : null
  }

  return { list, add, remove, like }
}
