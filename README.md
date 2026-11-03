# PokéWishlist : API

API en [Hono](https://hono.dev) et TypeScript. La wishlist est gardée dans une base PostgreSQL hébergée sur Supabase.

## Mettre la base en place

1. Crée deux projets Supabase : `pokewishlist` et `pokewishlist-test`.
2. Dans chacun, ouvre le SQL Editor et exécute le contenu de `db/init.sql`.
3. Copie `.env.example` vers `.env`, puis colle les adresses « Session pooler » des deux projets.

## Lancer le projet

```bash
npm ci
npm run dev
```

L'API tourne sur `http://localhost:3001`.

| Route                  | Réponse                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| `GET /health`          | `200` avec `{"status":"ok"}`                                                                                 |
| `GET /wishlist`        | `200` avec la liste                                                                                          |
| `POST /wishlist`       | `201` avec l'entrée créée, `400` si le corps est invalide, `409` en cas de doublon ou si la liste est pleine |
| `DELETE /wishlist/:id` | `204` si l'entrée est supprimée, `404` si elle n'existe pas                                                  |

`POST /wishlist` attend un JSON comme `{"pokemonId":25,"name":"Pikachu","types":["electric"],"image":null}`. La wishlist accepte 6 Pokémon au maximum.

## Vérifier le code

```bash
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

`npm test` passe par une vraie base PostgreSQL, sans mock SQL. **Il vide la base de `TEST_DATABASE_URL`** et refuse de tourner si elle est identique à `DATABASE_URL`.

## Intégration continue

GitHub Actions lance un contrôle par étape à chaque push. La CI démarre sa propre base PostgreSQL : elle n'a besoin d'aucun mot de passe et ne touche pas à Supabase. Le contrôle des tests e2e récupère aussi le front et lance Playwright sur les deux serveurs.
