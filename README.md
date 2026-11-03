# PokéWishlist : API

[![CI](https://github.com/AlainZen/IIMTest-API/actions/workflows/ci.yml/badge.svg)](https://github.com/AlainZen/IIMTest-API/actions/workflows/ci.yml)
[![Couverture des tests](https://raw.githubusercontent.com/AlainZen/IIMTest-API/badges/coverage.svg)](https://github.com/AlainZen/IIMTest-API/actions/workflows/ci.yml)

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

| Route                     | Réponse                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `GET /health`             | `200` avec `{"status":"ok"}`                                                                                 |
| `GET /wishlist`           | `200` avec la liste                                                                                          |
| `POST /wishlist`          | `201` avec l'entrée créée, `400` si le corps est invalide, `409` en cas de doublon ou si la liste est pleine |
| `DELETE /wishlist/:id`    | `204` si l'entrée est supprimée, `404` si elle n'existe pas                                                  |
| `POST /wishlist/:id/like` | `200` avec l'entrée et son nouveau total de likes, `404` si elle n'existe pas                                |

`POST /wishlist` attend un JSON comme `{"pokemonId":25,"name":"Pikachu","types":["electric"],"image":null}`. La wishlist accepte 6 Pokémon au maximum.

Les messages d'erreur suivent l'en-tête `Accept-Language` : anglais par défaut, français, espagnol ou allemand. Les traductions sont dans `src/locales`.

## Vérifier le code

```bash
npm run lint
npm run format:check
npm run check:locales
npm run typecheck
npm test
npm run build
```

`npm test` passe par une vraie base PostgreSQL, sans mock SQL. **Il vide la base de `TEST_DATABASE_URL`** et refuse de tourner si elle est identique à `DATABASE_URL`.

## Faire évoluer la base

Chaque changement est un fichier numéroté dans `db/migrations`, par exemple `001_likes.sql`. Le script suivant applique ceux de `DATABASE_URL` qui n'ont pas encore été joués et les note dans la table `schema_migrations` :

```bash
npm run migrate
```

Un deuxième lancement n'applique rien. Une migration ratée est annulée en entier. Ne modifie jamais une migration déjà appliquée : ajoute un nouveau fichier.

## Déployer sur AWS Lambda

`src/lambda.ts` adapte l'API à Lambda. Pour construire le paquet :

```bash
npm run build:lambda
```

Le fichier `dist-lambda/index.js` contient tout le code. Zippe-le seul, envoie-le dans une fonction Lambda Node.js 22 avec le gestionnaire `index.handler`, puis place une HTTP API d'API Gateway devant. La fonction a besoin de deux variables : `DATABASE_URL` et `CORS_ORIGIN`. Le CORS est géré par Hono : ne l'active pas aussi dans API Gateway.

## Intégration continue

GitHub Actions lance un contrôle par étape à chaque push. La CI démarre sa propre base PostgreSQL : elle n'a besoin d'aucun mot de passe et ne touche pas à Supabase. Le contrôle des tests e2e récupère aussi le front et lance Playwright sur les deux serveurs.

Sur `main`, si tous les contrôles sont verts, un dernier job applique les migrations, met à jour la Lambda et contrôle `/health` et `/wishlist`. Il a besoin des secrets GitHub `AWS_ROLE_ARN` et `DATABASE_URL`, et de la variable `API_URL` pour le contrôle. Il s'ignore tant que les secrets manquent.

Chaque push affiche le taux de couverture dans le résumé du run et garde le rapport HTML dans l'artifact `rapport-couverture`. Un push sur `main` met aussi à jour le badge ci-dessus.

## Revenir à la version précédente

Dans l'onglet Actions, lance le workflow **Rollback** sur `main`. Sans commit précisé, il restaure le dernier commit de `main` dont la CI et la CD sont passées, en dehors de la version en ligne, puis contrôle l'API. Les migrations restent appliquées : elles ne font qu'ajouter des colonnes.
