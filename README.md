# SojaLink

SojaLink est un middleware d'intégration centralisé qui synchronise les applications métiers de Sojadis (SojadisPro et Toki) afin de fiabiliser les données et améliorer la visibilité sur les processus internes.

---

## Prérequis

Avant de commencer, vérifier que Node.js et npm sont bien installés :

```bash
node -v
npm -v
```

---

## Installation rapide

```bash
# Cloner le dépôt
git clone https://github.com/sojadis-equipement/sojalink.git

# Installer les dépendances
npm install

# Copier les variables d'environnement dans un .env
cp .env.example .env# 
```

---

## 2. Installation d'AdonisJS

Dans le terminal, à la racine du dossier `SojaLink` :

```bash
npm create adonisjs@latest .
```

> Le `.` installe AdonisJS directement dans le dossier courant sans créer de sous-dossier.

Sélectionner **Hypermedia App** lors de la configuration.

Puis commit et push :

```bash
git add .
git commit -m "initialisation sojalink project"
git push origin main
```

---

## 3. Setup de la base de données

Créer et basculer sur la branche dédiée :

```bash
git fetch origin
git checkout setup-docker-db
```

---

## 4. Script SQL d'initialisation

Créer un dossier `init-db` à la racine du projet, puis un fichier `init-db/init.sql` :

```sql
CREATE DATABASE IF NOT EXISTS sojalink_dev;
CREATE DATABASE IF NOT EXISTS sojalink_test;

GRANT ALL PRIVILEGES ON sojalink_dev.* TO 'adonis'@'%';
GRANT ALL PRIVILEGES ON sojalink_test.* TO 'adonis'@'%';

FLUSH PRIVILEGES;
```

> Ce script est automatiquement exécuté par MariaDB au premier démarrage du conteneur, ce qui crée les deux bases de données `sojalink_dev` et `sojalink_test`.

---

## 5. Configuration Docker

Créer un fichier `docker-compose.dev.yml` à la racine du projet :

```yaml
version: "3.9"

services:
  database:
    image: mariadb:latest
    container_name: MariaDB_container
    environment:
      MARIADB_PASSWORD: adonis
      MARIADB_USER: adonis
      MARIADB_ROOT_PASSWORD: root
    volumes:
      - ./init-db/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "3306:3306"
```

---

## 6. Configuration des variables d'environnement

Dans le fichier `.env`, ajouter la section Database :

```dotenv
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_DATABASE=sojalink_dev
```

Dans le fichier `.env.test`, ajouter la configuration complète :

```dotenv
# Node
TZ=UTC
PORT=3333
HOST=localhost
NODE_ENV=test

# App
LOG_LEVEL=info
APP_KEY=dVkV6INcqYnFyhpqjwqGvO4mhZ86QQKo
APP_URL=http://${HOST}:${PORT}

# Session
SESSION_DRIVER=memory

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_DATABASE=sojalink_test
```

---

## 7. Configuration de la base de données AdonisJS

Dans le fichier `config/database.ts` changer la configuration pour passer à MySQL :

```typescript
import env from '#start/env'
import { defineConfig } from '@adonisjs/lucid'

const dbConfig = defineConfig({
  connection: 'mysql',

  connections: {
    mysql: {
      client: 'mysql2',

      connection: {
        host: env.get('DB_HOST'),
        port: env.get('DB_PORT'),
        user: env.get('DB_USER'),
        password: env.get('DB_PASSWORD'),
        database: env.get('DB_DATABASE'),
      },

      migrations: {
        naturalSort: true,
        paths: ['database/migrations'],
      },
    },
  },
})

export default dbConfig
```

Dans le fichier `start/env.ts`, ajouter les variables de base de données dans le schéma de validation :

```typescript
DB_HOST: Env.schema.string(),
DB_PORT: Env.schema.number(),
DB_USER: Env.schema.string(),
DB_PASSWORD: Env.schema.string(),
DB_DATABASE: Env.schema.string(),
```

---

## 8. Lancement du conteneur Docker

```bash
docker compose -f docker-compose.dev.yml up -d
```

> Le flag `-f` est nécessaire car le fichier ne porte pas le nom par défaut (`docker-compose.yml`) attendu par Docker.

---

## 9. Connexion à la base de données (HeidiSQL)

Ouvrir HeidiSQL et renseigner les informations suivantes :

| Champ | Valeur |
|---|---|
| Nom ou IP de l'hôte | 127.0.0.1 |
| Utilisateur | adonis |
| Mot de passe | adonis |
| Port | 3306 |

Les deux bases de données `sojalink_dev` et `sojalink_test` doivent apparaître.

---

## 10. Lancement de l'application

### Lancer le serveur de développement

```bash
node ace serve --hmr
```

AdonisJS charge le fichier `.env` → la base de données utilisée est `sojalink_dev`.

Output attendu :

```
[ info ] starting server in hmr mode...
DB utilisée : sojalink_dev
Server address: http://localhost:3333
Mode: hmr
```

### Lancer les tests

```bash
node ace test
```

AdonisJS charge le fichier `.env.test` → la base de données utilisée est `sojalink_test`.

Output attendu :

```
DB utilisée : sojalink_test
√ test commande node ace test
PASSED
```

---

## 11. Vérification que les tests utilisent bien la DB test

Créer un test basique :

```bash
node ace make:test test_launch --suite=unit
```

Cela crée le fichier `tests/unit/test_launch.spec.ts`. Y ajouter le contenu suivant :

```typescript
import { test } from '@japa/runner'

test.group('Test launch', () => {
  test('test commande node ace test', async ({ assert }) => {
    console.log('DB utilisée :', process.env.DB_DATABASE)
  })
})
```

Lancer `node ace test` et vérifier que le terminal affiche bien `DB utilisée : sojalink_test`.

---

## 12. Reset de la base de données de test

Pour reset la base de données `sojalink_test` sans toucher à `sojalink_dev` :

```bash
NODE_ENV=test node ace migration:fresh
```

> Cette commande supprime et recrée toutes les tables uniquement dans `sojalink_test`.