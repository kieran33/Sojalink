# SojaLink

SojaLink est un middleware d'intégration centralisé qui synchronise les applications métiers internes de Sojadis afin de fiabiliser les données et améliorer la visibilité sur les processus internes.

---

## Prérequis

Avant de commencer, vérifier que Node.js et npm sont bien installés :

```bash
node -v
npm -v
```

---

## Configuration de l'IDE

Aucune configuration particulière n'est requise. Mais les extensions suivantes sont recommandées sous VS Code :

| Extension | Utilité |
|---|---|
| **AdonisJS** | Autocomplétion et navigation pour les fichiers AdonisJS (routes, modèles, contrôleurs...) |
| **Japa** | Lance et visualise les tests directement depuis l'éditeur, sans passer par le terminal |
| **Docker** | Visualise et gère les conteneurs, images et fichiers `docker-compose` depuis VS Code |
| **ESLint** | Affiche les erreurs et avertissements de lint directement dans l'éditeur — le fichier `eslint.config.js` est déjà configuré dans le projet |

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

## Configuration des variables d'environnement

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

## Fonctionnement de l'environnement local

### Deux bases de données

SojaLink utilise deux bases de données MariaDB distinctes en local :

- `sojalink_dev` — utilisée lors du développement (`node ace serve`)
- `sojalink_test` — utilisée lors de l'exécution des tests (`node ace test`)

AdonisJS sélectionne automatiquement la bonne base selon le contexte : il charge `.env` en mode développement et `.env.test` lors des tests (via la variable `NODE_ENV`). Cela garantit que les tests n'interfèrent jamais avec les données de développement.

### Initialisation via Docker

Les deux bases de données sont créées automatiquement par un conteneur MariaDB défini dans `docker-compose.dev.yml`. Au premier démarrage du conteneur, MariaDB exécute automatiquement le script `init-db/init.sql` (monté dans `/docker-entrypoint-initdb.d/`), qui crée les deux bases et attribue les droits nécessaires à l'utilisateur `adonis`.

> Ce script ne s'exécute qu'une seule fois, lors de la première initialisation du conteneur (quand le dossier de données est vide).

---

## Lancer le conteneur Docker

```bash
docker compose -f docker-compose.dev.yml up -d
```

> Le flag `-f` est nécessaire car le fichier ne porte pas le nom par défaut (`docker-compose.yml`) attendu par Docker.

## Redémarrer le conteneur Docker

```bash
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
```

> Le flag `-v` supprime les volumes associés au conteneur, ce qui efface les données. À n'utiliser que si le script SQL d'init.sql a changé.

---

## Connexion à la base de données (HeidiSQL)

Ouvrir HeidiSQL et renseigner les informations suivantes :

| Champ | Valeur |
|---|---|
| Nom ou IP de l'hôte | 127.0.0.1 |
| Utilisateur | adonis |
| Mot de passe | adonis |
| Port | 3306 |

Les deux bases de données `sojalink_dev` et `sojalink_test` doivent apparaître.

---

## Lancement de l'application

### Lancer le serveur de développement

```bash
node ace serve
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

## Reset de la base de données de test

Pour reset la base de données `sojalink_test` sans toucher à `sojalink_dev` :

```bash
NODE_ENV=test node ace migration:fresh
```

> Cette commande supprime et recrée toutes les tables uniquement dans `sojalink_test`.

---

## Créer les tables

Pour créer toutes les tables dans la base de données `sojalink_dev` :

```bash
node ace migration:run
```

---

## Lancer les seeders 

Pour initialiser la base de données avec un jeu de données minimal cohérent :

```bash
node ace db:seed
```

Cela crée automatiquement un `event_type`, une `rule` liée à cet `event_type`, et une `rule_version` active liée à cette `rule`. La commande est rejouable et l'exécuter plusieurs fois ne crée pas de doublons.

Pour repartir d'une base propre avant de relancer les seeders :

```bash
node ace db:truncate
node ace db:seed
```

## Le worker de polling

### Rôle

Le worker de polling est responsable de consommer les événements en attente dans la table `sojalink_events`. Il tourne en arrière-plan en parallèle du serveur web et traite les événements un par un de façon fiable.

---

### Fonctionnement général

Le worker repose sur le package `@adonisjs/queue` qui fournit un système de file d'attente (queue) basé sur la base de données.

Le flux complet est le suivant :

1. Le **scheduler** planifie le job `PollPendingEventsJob` toutes les 10 secondes.
2. Le **worker queue** récupère ce job depuis la queue `pending_events` et exécute `PendingEventsWorker`.
3. `PendingEventsWorker` délègue au use case `ProcessNextPendingEvent`.
4. Le use case demande au repository de réserver le premier événement `pending`.
5. Si un événement est trouvé, il est réservé atomiquement et passe en `processing`.
6. Si aucun événement n'est disponible, le cycle se termine sans modification.

---

### Architecture des fichiers

| Fichier | Rôle |
|---|---|
| `app/jobs/poll_pending_events_job.ts` | Job Adonis Queue dispatché par le scheduler |
| `app/application/events/pending_events_worker.ts` | Point d'entrée applicatif appelé par le job |
| `app/application/events/process_next_pending_event.ts` | Orchestration de la réservation, du traitement et de la mise à jour du statut |
| `app/application/events/event_processor.ts` | Stub du futur traitement métier de l'événement |
| `app/persistence/events/event_repository.ts` | Réservation atomique du prochain événement `pending` |
| `start/scheduler.ts` | Planifie le job toutes les 10 secondes hors environnement `test` |

---

### Réservation atomique

Pour éviter que deux workers ne traitent le même événement simultanément, la récupération et la réservation sont effectuées en une seule transaction SQL avec `FOR UPDATE SKIP LOCKED` :

```sql
SELECT * FROM sojalink_events
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT 1
FOR UPDATE SKIP LOCKED
```

`FOR UPDATE` verrouille la ligne sélectionnée pendant la transaction. `SKIP LOCKED` permet aux autres workers d'ignorer les lignes déjà verrouillées au lieu d'attendre.

---

### Lancer le worker manuellement

```bash
node ace queue:work --queue=pending_events
```

En développement avec Docker, le worker démarre automatiquement avec le serveur :

```bash
docker compose -f docker-compose.dev.yml up
```

---

### Lister les schedulers actifs

```bash
node ace queue:scheduler:list
``` 
