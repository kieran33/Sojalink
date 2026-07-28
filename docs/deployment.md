# Guide de déploiement SojaLink sur Railway

Guide complet pour déployer SojaLink en production sur Railway via Docker.

---

## Prérequis

Avant de commencer, vérifier que tu as :

- Un compte Docker Hub — [hub.docker.com](https://hub.docker.com) (gratuit)
- Un compte Railway — [railway.com](https://railway.com) (gratuit avec $5 de crédit)
- Docker Desktop installé et lancé sur ton poste
- Le projet SojaLink en local avec le `Dockerfile` et `docker-entrypoint.js`

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

EXPOSE 8080
CMD ["node", "docker-entrypoint.js"]
```

### `docker-entrypoint.js`

Ce fichier lance les migrations automatiquement avant de démarrer le serveur :

```javascript
import { execSync } from 'node:child_process'

console.log('Resetting database...')
try {
  execSync('node ace migration:fresh --force', { stdio: 'inherit' })
  console.log('Migration done.')
} catch (error) {
  console.log('Migration failed, continuing...')
}

console.log('Starting server...')
await import('./bin/server.js')
```

### `.dockerignore`

```
node_modules
.env
.env.prod
build
.git
```

> ⚠️ Les migrations utilisent `varchar(100)` au lieu de `varchar(255)` pour éviter l'erreur de clé trop longue sur MySQL.

---

## Etape 1 — Builder et pousser l'image sur Docker Hub

### Se connecter à Docker Hub

```bash
docker login
```

Entre ton username et mot de passe Docker Hub.

### Builder l'image

```bash
docker build -t ton_username/sojalink:latest .
```

Remplace `ton_username` par ton vrai username Docker Hub. Le build prend quelques minutes.

### Pousser l'image sur Docker Hub

```bash
docker push ton_username/sojalink:latest
```

L'image est maintenant disponible publiquement sur Docker Hub.

---

## Etape 2 — Créer le projet sur Railway

1. Va sur [railway.com](https://railway.com) et connecte-toi avec ton compte GitHub
2. Clique sur **New Project**
3. Choisis **Deploy a Docker Image**
4. Entre le nom de ton image : `ton_username/sojalink:latest`

> L'application va crasher — c'est normal, les variables d'environnement ne sont pas encore configurées.

---

## Etape 3 — Ajouter MySQL

Dans ton projet Railway :

1. Ferme le panneau de ton service sojalink
2. Clique sur le bouton **+** pour ajouter un service
3. Choisis **Database** puis **MySQL**
4. Railway crée automatiquement la base MySQL et génère les variables de connexion

### Récupérer les variables MySQL

Dans ton service MySQL, va dans l'onglet **Variables**. Note ces valeurs :

| Variable Railway | Variable SojaLink | Description |
|---|---|---|
| `MYSQLHOST` | `DB_HOST` | Host privé Railway (mysql-xxx.railway.internal) |
| `MYSQLPORT` | `DB_PORT` | Port (3306) |
| `MYSQLDATABASE` | `DB_DATABASE` | Nom de la base |
| `MYSQLUSER` | `DB_USER` | Utilisateur |
| `MYSQLPASSWORD` | `DB_PASSWORD` | Mot de passe |

> ⚠️ Utilise toujours le réseau privé Railway (`mysql-xxx.railway.internal`) pour `DB_HOST` et non le réseau public.

---

## Etape 4 — Configurer les variables d'environnement

Dans ton service sojalink sur Railway, va dans l'onglet **Variables** et ajoute :

```env
NODE_ENV=production
PORT=8080
HOST=0.0.0.0
APP_KEY=genere_avec_node_ace_generate_key
APP_URL=https://ton-app.up.railway.app
LOG_LEVEL=info
SESSION_DRIVER=cookie
QUEUE_DRIVER=database
DB_HOST=mysql-xxx.railway.internal
DB_PORT=3306
DB_DATABASE=railway
DB_USER=root
DB_PASSWORD=ton_mot_de_passe_mysql
```

Pour générer `APP_KEY`, lance cette commande en local :

```bash
node ace generate:key
```

Copie la valeur générée dans la variable `APP_KEY` sur Railway.

Une fois toutes les variables ajoutées, clique sur **Deploy** pour appliquer les changements.

---

## Etape 5 — Générer le domaine public

Dans ton service sojalink :

1. Va dans l'onglet **Settings**
2. Dans la section **Networking**, clique sur **Generate Domain**
3. Entre le port `8080`
4. Railway génère une URL publique du type : `https://sojalink-production.up.railway.app`
5. Mets à jour `APP_URL` avec cette URL dans tes variables

---

## Etape 6 — Vérifier le déploiement

Dans l'onglet **Deployments** de ton service sojalink, vérifie les logs. Tu dois voir :

```
Resetting database...
[ success ] Dropped tables successfully
migrated database/migrations/...
...
Migration done.
Starting server...
started HTTP server on 0.0.0.0:8080
```

Ouvre l'URL Railway dans ton navigateur — tu dois voir la page d'accueil de SojaLink.

---

## Mettre à jour en production

Pour déployer une nouvelle version après des modifications :

```bash
docker build -t ton_username/sojalink:latest .
docker push ton_username/sojalink:latest
```

Puis sur Railway dans **Deployments**, clique sur **Redeploy**.

> ⚠️ `migration:fresh` supprime toutes les données et recrée les tables à chaque redéploiement. En production finale remplace `migration:fresh` par `migration:run`.

---

## Problèmes courants et solutions

### Application failed to respond

**Cause** : le port exposé ne correspond pas au port sur lequel l'app écoute.

**Solution** : dans **Settings** → **Networking**, vérifie que le port est bien `8080`.

### Missing environment variable

**Cause** : une variable d'environnement manque dans Railway.

**Solution** : vérifie toutes les variables dans l'onglet **Variables** et redéploie.

### Table already exists

**Cause** : la base de données n'est pas propre.

**Solution** : utilise `migration:fresh` au lieu de `migration:run` dans `docker-entrypoint.js`.

### Specified key was too long

**Cause** : les colonnes `varchar(255)` dans les migrations dépassent la limite MySQL.

**Solution** : réduire tous les varchar à `100` dans les fichiers de migration.

### getaddrinfo ENOTFOUND database

**Cause** : `DB_HOST` est défini sur `database` (nom du service Docker local) au lieu du host Railway.

**Solution** : utilise le host privé Railway (`mysql-xxx.railway.internal`) dans `DB_HOST`.