# Guide de déploiement SojaLink sur Railway

Guide complet du déploiement réel de SojaLink en production sur Railway, via GitHub
Container Registry (GHCR) et une pipeline CI/CD automatisée.

---

## Vue d'ensemble de l'architecture de déploiement

SojaLink tourne sur Railway avec **quatre services séparés** :

| Service | Rôle | Commande de démarrage |
|---|---|---|
| `sojalink-deployment` | Serveur web | `node bin/server.js` (via docker-entrypoint.js) |
| `worker-pending-events` | Worker de polling | `node ace queue:work --queue=pending_events` |
| MySQL (MariaDB) | Base de données | géré par Railway |
| Redis | Composant NoSQL (supervision worker) | géré par Railway |

Les deux premiers services partagent **exactement la même image Docker**
(`ghcr.io/kieran33/sojalink-deployment:latest`) — seule la commande de démarrage
diffère. Ils doivent toujours être redéployés ensemble, jamais séparément.

---

## Prérequis

- Un compte GitHub (le repo `kieran33/Sojalink` sert de copie personnelle pour
  déployer en autonomie, séparée du repo de l'organisation `sojadis-equipement`)
- Un compte Railway — [railway.com](https://railway.com)
- La CLI Railway installée en local : `npm i -g @railway/cli`
- Docker Desktop installé et lancé (pour builder l'image en local si besoin)
- Node.js ≥ 24 en local

---

## Fichiers nécessaires dans le projet

### `Dockerfile`

```dockerfile
FROM node:24-slim AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM deps AS build
WORKDIR /app
COPY . .
ENV NODE_ENV=development
RUN npm run build

FROM base AS production
WORKDIR /app
ENV NODE_ENV=production

COPY --from=build /app/build ./
COPY --from=build /app/docker-entrypoint.js ./
RUN npm ci --omit=dev

EXPOSE 3333
CMD ["node", "docker-entrypoint.js"]
```

### `docker-entrypoint.js`

Applique les migrations en attente avant de démarrer le serveur — **sans jamais
supprimer les données existantes**.

```javascript
import { execSync } from 'node:child_process'

console.log('Running migrations...')
try {
  execSync('node ace migration:run --force', { stdio: 'inherit' })
  console.log('Migrations done.')
} catch (error) {
  console.error('Migration failed:', error)
  process.exit(1)
}

console.log('Starting server...')
await import('./bin/server.js')
```

> ⚠️ **Ne jamais utiliser `migration:fresh` ici.** Cette commande supprime toutes
> les tables à chaque redémarrage du conteneur — testé et confirmé en production,
> ça efface aussi bien les données métier que la table interne `queue_schedules`
> (voir la section Problèmes rencontrés).

### Migrations — colonnes JSON

> ⚠️ **Toutes les colonnes `*_json` doivent être déclarées en `table.text(...)`,
> jamais en `table.json(...)`.** MariaDB (utilisé en local et en CI) traite `JSON`
> comme un simple alias de `TEXT`, mais MySQL (utilisé par Railway en production) a
> un vrai type `JSON` natif que le driver désérialise automatiquement en objet —
> ce qui casse le code applicatif, qui s'attend à recevoir une chaîne de
> caractères à parser lui-même. Bug réel rencontré et corrigé en production.

### `.dockerignore`

```
node_modules
.env
.env.prod
build
.git
```

---

## Étape 1 — La pipeline CI/CD (méthode utilisée en pratique)

Le déploiement ne se fait **jamais manuellement** — un simple push sur `main`
déclenche automatiquement toute la chaîne, via
`.github/workflows/test-build-publish-deploy.yml` :

```
push sur main
    ↓
test (Japa, contre MariaDB + Redis éphémères)
    ↓ (si succès)
build-and-publish (image Docker construite, poussée sur GHCR)
    ↓ (si succès)
deploy (redéploie les DEUX services Railway)
```

### Ce qu'il faut configurer une seule fois

**1. Le package GHCR doit être public.** Railway n'authentifie pas correctement
sur un package GHCR privé (testé, confirmé en échec). Sur GitHub :
`Packages` → `sojalink-deployment` → `Package settings` → `Change visibility` →
`Public`.

**2. Le lien entre le package et le repo, pour que le workflow ait le droit d'y
publier.** Un package poussé manuellement une première fois n'est pas
automatiquement lié à un repo Actions :
`Package settings` → `Manage Actions access` → `Add Repository` → `Sojalink`,
rôle `Write`.

**3. Les permissions du workflow.** Repo → `Settings` → `Actions` → `General` →
`Workflow permissions` → `Read and write permissions`.

**4. Le secret `RAILWAY_TOKEN`.** Généré depuis Railway :
`Project Settings` → `Tokens` → `New Token` (**un token de projet, pas un token
de compte personnel**), puis ajouté dans
`Settings` → `Secrets and variables` → `Actions` du repo GitHub.

### Le job `deploy` du workflow

```yaml
deploy:
  needs: build-and-publish
  environment: production
  runs-on: ubuntu-latest

  steps:
    - name: Deploy web service to Railway
      run: |
        npm i -g @railway/cli
        railway redeploy --service sojalink-deployment --yes
      env:
        RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

    - name: Deploy worker service to Railway
      run: railway redeploy --service worker-pending-events --yes
      env:
        RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

> ⚠️ **Les deux services doivent toujours être redéployés ensemble.** Rencontré
> en production : sans la deuxième étape, le worker continuait de tourner avec
> une ancienne version de l'image, désynchronisée du service web.

---

## Étape 2 — Créer les services sur Railway (setup initial, une seule fois)

### Service web

1. Railway → `New Project` → `Deploy a Docker Image`
2. Image : `ghcr.io/kieran33/sojalink-deployment:latest`
3. Nommer le service `sojalink-deployment`

### Service worker

1. `+ Create` → `Empty Service` (ou `Deploy from Docker Image`)
2. Même image : `ghcr.io/kieran33/sojalink-deployment:latest`
3. `Settings` → `Deploy` → `Custom Start Command` :
   ```
   node ace queue:work --queue=pending_events
   ```
4. Nommer le service `worker-pending-events`

### Base de données MySQL

`+ New` → `Database` → `Add MySQL` — Railway crée le service et génère
automatiquement les variables de connexion (`MYSQLHOST`, `MYSQLPORT`,
`MYSQLDATABASE`, `MYSQLUSER`, `MYSQLPASSWORD`).

### Redis

`+ New` → `Database` → `Add Redis` — Railway génère `REDISHOST`, `REDISPORT`,
`REDISPASSWORD` (**sans underscore** dans ces noms-là, à ne pas confondre avec
les variables `REDIS_HOST` côté application, voir plus bas).

---

## Étape 3 — Configurer les variables d'environnement

**Sur les DEUX services** (`sojalink-deployment` et `worker-pending-events`) —
les mêmes variables, saisies dans l'onglet `Variables` de chacun :

```env
APP_KEY=<clé générée avec node ace generate:key>
APP_URL=https://sojalink-deployment-production.up.railway.app
DB_DATABASE=railway
DB_HOST=<host interne MySQL fourni par Railway>
DB_PASSWORD=<mot de passe généré par Railway>
DB_PORT=3306
DB_USER=root
HOST=0.0.0.0
PORT=3333
LOG_LEVEL=info
QUEUE_DRIVER=database
SESSION_DRIVER=cookie
REDIS_HOST=${{Redis.REDISHOST}}
REDIS_PORT=${{Redis.REDISPORT}}
REDIS_PASSWORD=${{Redis.REDISPASSWORD}}
```

> ⚠️ La syntaxe `${{Redis.REDISHOST}}` référence directement le service Redis —
> si Railway régénère cette valeur, la référence se met à jour automatiquement,
> pas besoin de la retaper. Vérifie que `Redis` correspond bien au nom exact de
> ton service.

Pour générer `APP_KEY` en local :
```bash
node ace generate:key
```

---

## Étape 4 — Exposer le service web publiquement

`sojalink-deployment` → `Settings` → `Networking` → `Generate Domain`.

> ⚠️ **Le piège du port.** Railway injecte automatiquement une variable `PORT`
> dans le conteneur (réglée par défaut sur `8080` si tu ne la définis pas
> toi-même). Le port cible du domaine public doit **toujours correspondre
> exactement** à la valeur de la variable `PORT` — un décalage entre les deux
> rend l'application inaccessible malgré un déploiement affiché comme réussi.
> Ici, `PORT=3333` est explicitement défini (étape 3), donc le port cible du
> domaine doit aussi être réglé sur `3333`, pas laissé sur `8080` par défaut.

Le service worker n'a besoin d'aucun domaine public — il ne reçoit jamais de
trafic HTTP.

---

## Étape 5 — Vérifier le déploiement

### Logs du service web

`Deployments` → dernier déploiement → `View Logs` :
```
Running migrations...
Migrations done.
Starting server...
started HTTP server on 0.0.0.0:3333
```

### Logs du service worker

```
Starting Container
Starting worker for queues: pending_events
```

### Test complet, en conditions réelles

```bash
railway ssh --service worker-pending-events
NODE_ENV=development node ace db:seed --files="database/seeders/scenarios/scenario_1_nominal_seeder.ts"
```

Puis observer les logs du worker (`railway logs --service worker-pending-events`
depuis un autre terminal) — la séquence complète doit apparaître dans les 10
secondes :
```
Pending event reserved for processing
Rule resolved
Email notification sent
Pipeline executed successfully
Event processed successfully
```

> Note : les seeders de scénario sont bloqués par défaut en production
> (`static environment = ['development']`) — `NODE_ENV=development` en préfixe
> de la commande contourne ça temporairement, sans affecter le vrai serveur qui
> continue de tourner en production.

---

## Mettre à jour en production

Un simple push sur `main` (après merge d'une Pull Request) déclenche
automatiquement toute la pipeline — aucune commande manuelle à taper.

Pour forcer un redéploiement sans nouveau commit :
```bash
railway redeploy --service sojalink-deployment --yes
railway redeploy --service worker-pending-events --yes
```

---

## Problèmes rencontrés et solutions

### Le workflow ne se déclenche pas après un merge

**Cause** : `paths-ignore` sur le déclencheur `push` incluait
`.github/workflows/**`. Si un commit ne modifie que ce fichier, GitHub considère
que tous les fichiers changés sont ignorés, et saute le déclenchement.

**Solution** : `paths-ignore` retiré du bloc `push` du workflow.

### `Unable to connect to the registry` sur Railway

**Cause** : Railway n'authentifie pas correctement sur un package GHCR privé.

**Solution** : package rendu public (voir Étape 1).

### `denied: permission_denied: write_package` dans la CI

**Cause** : un package poussé manuellement (hors workflow) n'est pas lié
automatiquement au repo Actions.

**Solution** : lien ajouté manuellement via `Manage Actions access` (voir
Étape 1).

### Le worker reste bloqué, aucun event traité, malgré des logs "normaux"

**Cause** : après un `migration:fresh` exécuté manuellement en debug, la table
`queue_schedules` (interne à `@adonisjs/queue`) s'est retrouvée vide. Elle
n'est réinscrite qu'au démarrage du **service web**, jamais par le worker.

**Solution** : après tout `migration:fresh`, toujours redéployer le service web
en plus du worker.

### `InvalidJsonError` en boucle infinie, bloquant toute la file (FIFO)

**Cause** : colonnes `payload_json`/`conditions_json`/`pipeline_json` déclarées
en `table.json(...)` — comportement différent entre MariaDB (dev/CI) et MySQL
(Railway prod), voir la note plus haut sur les migrations.

**Solution** : toutes les colonnes `*_json` repassées en `table.text(...)`,
suivi d'un `migration:fresh` ponctuel en production (données de test acceptées
comme perdues) puis redéploiement du service web.

### `Ctrl+C` ne tue pas vraiment le worker (Windows / Git Bash)

**Cause** : sur MINGW64, `Ctrl+C` ne termine pas toujours le processus Node en
arrière-plan — il continue de tourner, invisible.

**Solution** : fermer complètement la fenêtre/l'onglet du terminal plutôt que
de compter sur `Ctrl+C`. Vérifier avec :
```bash
powershell "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Select-Object ProcessId,CommandLine"
```

### `getaddrinfo ENOTFOUND` sur `*.railway.internal`

**Cause** : les adresses `.railway.internal` (MySQL, Redis) ne sont résolvables
que **depuis l'intérieur** du réseau Railway — jamais depuis une machine locale.

**Solution** : soit se connecter via `railway ssh --service <nom>` (qui place
dans le réseau interne), soit utiliser l'adresse publique du service (`Connect`
→ `Public Network`) pour une connexion depuis la machine locale.