# SojaLink

SojaLink est un middleware d'intégration centralisé qui synchronise les applications métiers internes de Sojadis afin de fiabiliser les données et améliorer la visibilité sur les processus internes.

Ce guide suit l'ordre réel d'installation : chaque section suppose que les précédentes sont terminées. Suivre les étapes dans l'ordre, sans en sauter.

---

## 1. Prérequis

- **Git** :
```bash
  git --version
```
  Si absent, installer depuis [git-scm.com](https://git-scm.com/downloads).

- **Node.js version 24** (celle utilisée en CI et en production — une version différente peut provoquer des erreurs difficiles à diagnostiquer) :
```bash
  node -v
```
  Si la version affichée ne commence pas par `v24`, installer Node 24 avant de continuer (via [nvm](https://github.com/nvm-sh/nvm), ou le site officiel [nodejs.org](https://nodejs.org)). Après une installation via nvm, fermer et rouvrir le terminal avant de continuer.

- **npm** (installé automatiquement avec Node) :
```bash
  npm -v
```

- **Docker Desktop** (ou équivalent), installé et lancé — nécessaire pour faire tourner MariaDB et Redis en local. Téléchargement : [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop/). Vérifier qu'il tourne réellement (icône active dans la barre des tâches/menu bar) avant de continuer, pas juste installé.

- **Un terminal Unix-like** pour les commandes de ce guide (`cp`, `ls`...) :
  - **Windows** : utiliser **Git Bash** (installé avec Git for Windows ci-dessus) ou WSL — pas l'invite de commandes (CMD) classique, où `cp` n'existe pas (`copy` est l'équivalent CMD, mais toutes les commandes de ce guide supposent bash).
  - **Mac/Linux** : le terminal par défaut convient.

> **Limite de ce guide** : des blocages propres à une machine précise (proxy d'entreprise bloquant `npm install`, antivirus bloquant Docker, politique Windows restreignant l'exécution de scripts) ne peuvent pas être anticipés ici — ils se résolvent au cas par cas avec l'administrateur de la machine concernée.

---

## 2. Configuration de l'IDE

Aucune configuration particulière n'est requise. Extensions recommandées sous VS Code :

| Extension | Utilité |
|---|---|
| **AdonisJS** | Autocomplétion et navigation pour les fichiers AdonisJS (routes, modèles, contrôleurs...) |
| **Japa** | Lance et visualise les tests directement depuis l'éditeur |
| **Docker** | Visualise et gère les conteneurs, images et fichiers `docker-compose` depuis VS Code |
| **ESLint** | Affiche les erreurs de lint dans l'éditeur — `eslint.config.js` est déjà configuré dans le projet |

---

## 3. Cloner le projet et installer les dépendances

```bash
git clone https://github.com/kieran33/Sojalink.git
cd Sojalink
npm install
```

Toutes les commandes suivantes de ce guide s'exécutent depuis ce dossier (`Sojalink/`).

---

## 4. Configurer les variables d'environnement

### Fichier `.env` (développement)

```bash
cp .env.example .env
```

> Sur une nouvelle machine, cette étape est **toujours à refaire** : `.env` n'est jamais versionné (il contient des identifiants), il faut le reconstituer à chaque nouvel environnement.

Vérifier que `.env` contient bien toutes ces variables (compléter/corriger si besoin) :

```dotenv
# Node
TZ=UTC
PORT=3333
HOST=localhost
NODE_ENV=development

# App
LOG_LEVEL=info
APP_KEY=
APP_URL=http://${HOST}:${PORT}

# Session
SESSION_DRIVER=cookie

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_DATABASE=sojalink_dev
QUEUE_DRIVER=database

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
```

Générer une clé et la coller après `APP_KEY=` :

```bash
node ace generate:key --show
```

### Fichier `.env.test`

Créer un fichier `.env.test` à la racine du projet, avec ce contenu :

```dotenv
# Node
TZ=UTC
PORT=3333
HOST=localhost
NODE_ENV=test

# App
LOG_LEVEL=info
APP_KEY=
APP_URL=http://${HOST}:${PORT}

# Session
SESSION_DRIVER=memory

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_DATABASE=sojalink_test
QUEUE_DRIVER=database

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
```

Générer **une deuxième clé, différente de celle du `.env`**, et la coller après `APP_KEY=` :

```bash
node ace generate:key --show
```

> ⚠️ `REDIS_HOST` et `REDIS_PORT` sont **obligatoires** dans les deux fichiers, pas optionnels — sans eux, `node ace serve`/`node ace test` refuse de démarrer avec une erreur `EnvValidationException: Missing environment variable`.

---

## 5. Lancer Docker (MariaDB + Redis)

```bash
docker compose -f docker-compose.dev.yml up -d
```

> Le flag `-f` est nécessaire car le fichier ne porte pas le nom par défaut (`docker-compose.yml`). Si `docker compose` (sans tiret) n'est pas reconnu, essayer `docker-compose` (avec tiret) — les deux syntaxes existent selon la version de Docker installée.

Vérifier que les conteneurs sont bien démarrés et sains avant de continuer :

```bash
docker compose -f docker-compose.dev.yml ps
```

Les conteneurs MariaDB et Redis doivent apparaître avec un statut `health: starting` puis `healthy`. MariaDB peut prendre quelques secondes à finir son initialisation après le démarrage — si l'étape suivante échoue avec une erreur de connexion refusée, attendre quelques secondes et réessayer.

> **Conflit de port possible** : si un conteneur refuse de démarrer, ou si `docker compose ps` signale une erreur liée à un port déjà utilisé, un autre service tourne probablement déjà sur ce port sur la machine — MariaDB (3306), Redis (6379), ou même l'application elle-même (3333) plus tard à l'étape 8. Vérifier lequel :
> ```bash
> # Windows (Git Bash)
> netstat -ano | findstr <PORT>
> # Mac/Linux
> lsof -i :<PORT>
> ```
> Si un processus occupe déjà le port, soit l'arrêter, soit changer le port exposé côté hôte dans `docker-compose.dev.yml` (par exemple `3307:3306` au lieu de `3306:3306`) et adapter la variable correspondante (`DB_PORT`, `REDIS_PORT`) dans `.env`/`.env.test`.

Au tout premier démarrage, MariaDB exécute automatiquement `init-db/init.sql`, qui crée les bases `sojalink_dev` et `sojalink_test` et attribue les droits à l'utilisateur `adonis`. Ce script ne s'exécute qu'une seule fois (tant que le volume de données existe) — voir la section "Réinitialiser Docker" plus bas s'il faut le forcer à se rejouer.

### Vérifier la connexion à la base (optionnel mais recommandé)

Avec un client graphique :
- **Windows** : [HeidiSQL](https://www.heidisql.com/)
- **Mac** : [TablePlus](https://tableplus.com/) ou [Sequel Ace](https://sequel-ace.com/)
- **Linux** : [DBeaver](https://dbeaver.io/) ou [TablePlus](https://tableplus.com/)

Ou en ligne de commande, sans installer de client graphique :
```bash
docker exec -it <nom_du_conteneur_mariadb> mysql -u adonis -padonis
```
(le nom exact du conteneur s'obtient avec `docker ps`)

Informations de connexion, dans tous les cas :

| Champ | Valeur |
|---|---|
| Hôte | 127.0.0.1 |
| Utilisateur | adonis |
| Mot de passe | adonis |
| Port | 3306 |

Les bases `sojalink_dev` et `sojalink_test` doivent apparaître, vides pour l'instant.

---

## 6. Créer les tables

```bash
node ace migration:run
```

Crée toutes les tables dans `sojalink_dev`. Vérifier :

```bash
node ace migration:status
```

Toutes les migrations doivent apparaître en `completed`.

---

## 7. Initialiser les données (optionnel mais recommandé)

### Seeder principal

```bash
node ace db:seed
```

Crée un jeu de données minimal : un `event_type`, une `rule`, une `rule_version` active. Rejouable sans créer de doublons.

### Seeders de scénario

Pour tester le comportement du worker en conditions réelles, 5 seeders dédiés posent chacun une situation précise :

```bash
NODE_ENV=development node ace db:seed --files="database/seeders/scenarios/scenario_1_nominal_seeder.ts"
```

(remplacer `scenario_1_nominal_seeder.ts` par `scenario_2_...` à `scenario_5_...` pour les autres cas). Chaque scénario affiche dans la console le résultat attendu. Rejouables sans limite.

---

## 8. Lancer l'application

Deux processus séparés, dans deux terminaux différents (tous deux ouverts depuis le dossier `Sojalink/`).

**Terminal 1 — le serveur web** :

```bash
node ace serve
```

Accessible sur `http://localhost:3333`.

**Terminal 2 — le worker de polling** :

```bash
node ace queue:work --queue=pending_events
```

> Sans cette commande, le worker ne tourne pas : les événements insérés restent en attente indéfiniment, et le badge de statut du worker dans l'interface affiche "inactif".

---

## 9. Créer un compte et vérifier que tout fonctionne

1. Ouvrir `http://localhost:3333` dans un navigateur → redirection automatique vers `/connexion`.
2. Cliquer sur "S'inscrire" (ou aller directement sur `/inscription`) et créer un compte :
   - Nom d'utilisateur : au moins 4 caractères
   - Mot de passe : au moins 8 caractères, avec une majuscule, une minuscule, un chiffre et un caractère spécial
3. Une fois inscrit, arrivée automatique sur `/dashboard`.
4. Le badge en haut à droite doit afficher "Worker actif" (si le Terminal 2 tourne bien).
5. Dans un **troisième terminal**, lancer un seeder de scénario (étape 7), attendre une dizaine de secondes, rafraîchir le dashboard → le nouvel événement doit apparaître dans la carte de la règle correspondante.

Si toutes ces étapes fonctionnent, l'installation est complète et opérationnelle.

---

## 10. Lancer les tests

```bash
node ace test
```

Lance les deux suites (`unit` et `integration`). Pour cibler une seule suite :

```bash
node ace test unit
node ace test integration
```

AdonisJS charge automatiquement `.env.test` pour les tests → base utilisée : `sojalink_test`, jamais `sojalink_dev`.

---

## 11. Qualité de code

Avant de commit, vérifier que ces trois commandes passent (elles sont bloquantes en CI) :

```bash
npm run lint
npm run typecheck
node ace test
```

- `npm run lint` vérifie que le code respecte le style et les conventions du projet (ESLint) — imports inutilisés, noms de fichiers non conformes, variables masquées, etc. Ne vérifie pas si le code fonctionne, juste s'il est écrit proprement.
- `npm run typecheck` vérifie que les types TypeScript sont cohérents partout dans le projet, sans exécuter le code — par exemple qu'une page Inertia référencée existe bien, ou qu'une fonction n'est jamais appelée avec un mauvais type d'argument.
- `node ace test` lance les deux suites de tests (`unit` et `integration`).

---

## Dépannage

**`EnvValidationException: Missing environment variable "..."`**
Une variable manque dans `.env` ou `.env.test`. Comparer avec la liste complète de l'étape 4.

**`bash: cp: command not found` (Windows)**
Le terminal utilisé est l'invite de commandes (CMD), pas bash. Utiliser Git Bash (étape 1).

**Le conteneur MariaDB ou Redis ne démarre pas, ou erreur de connexion refusée**
Voir l'encart "Conflit de port possible" à l'étape 5.

**Erreurs de type `Module has no exported member 'XxxSchema'` sur un modèle**
Le fichier de schéma généré n'est plus à jour avec les migrations :
```bash
node ace schema:generate
```

**Erreur de type sur une page Inertia (`is not assignable to type "..."`)**
Le registre de pages générées n'a pas encore repéré un nouveau fichier dans `inertia/pages/`. Redémarrer `node ace serve` quelques secondes suffit à le régénérer.

**Migration bloquée en `corrupt` dans `node ace migration:status`**
Une ancienne migration a été supprimée du code après avoir été jouée. En local (jamais en production), repartir d'une base propre — voir "Réinitialiser Docker" ci-dessous.

---

## Réinitialiser Docker et la base de données

**Redémarrer les conteneurs sans perdre les données :**
```bash
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up -d
```

**Repartir de zéro, en effaçant aussi les données du conteneur** (utile si `init-db/init.sql` a changé, ou si la base est dans un état incohérent) :
```bash
docker compose -f docker-compose.dev.yml down -v
docker compose -f docker-compose.dev.yml up -d
node ace migration:run
```
> Le flag `-v` supprime les volumes associés — toutes les données du conteneur sont perdues, y compris les bases `sojalink_dev`/`sojalink_test` elles-mêmes, à recréer entièrement.

**Repartir de zéro uniquement au niveau des migrations, sans toucher au conteneur Docker** (en local uniquement — jamais en production, qui utilise `migration:run --force`, jamais `fresh`, pour ne pas perdre de données) :
```bash
node ace migration:fresh
```

Pour ne réinitialiser que la base de test, sans toucher à `sojalink_dev` :
```bash
NODE_ENV=test node ace migration:fresh
```

---

## Le worker de polling — comprendre son fonctionnement

Le worker consomme les événements en attente dans `sojalink_events`, en arrière-plan, en parallèle du serveur web.

### Flux complet

1. Le **scheduler** (`start/scheduler.ts`) planifie le job `PollPendingEventsJob` toutes les 10 secondes.
2. Le **worker queue** (`node ace queue:work`) récupère ce job et exécute `PendingEventsWorker`.
3. `PendingEventsWorker` délègue à `EventProcessor`.
4. `EventProcessor` demande à `EventRepository` de réserver le prochain événement `pending`, puis orchestre la résolution de règle, l'exécution du pipeline, et la mise à jour du statut final (`processed`/`failed`).
5. Si aucun événement n'est disponible, le cycle se termine sans rien faire.
6. À chaque passage, la durée d'exécution est enregistrée dans Redis via `WorkerHealthRepository`, ce qui alimente le badge de statut dans l'interface.

### Architecture des fichiers

| Fichier | Rôle |
|---|---|
| `app/jobs/poll_pending_events_job.ts` | Job AdonisJS Queue dispatché par le scheduler |
| `app/application/events/pending_events_worker.ts` | Point d'entrée applicatif appelé par le job |
| `app/application/events/event_processor.ts` | Orchestration complète : réservation, résolution, exécution, statut |
| `app/application/events/rule_resolver.ts` | Détermine quelle règle s'applique à un événement |
| `app/application/events/event_executor.ts` | Exécute le pipeline étape par étape |
| `app/persistence/events/event_repository.ts` | Réservation atomique du prochain événement `pending` |
| `app/persistence/events/worker_health_repository.ts` | Supervision du worker (Redis) |
| `start/scheduler.ts` | Planifie le job toutes les 10 secondes hors environnement `test` |

### Réservation atomique

```sql
SELECT * FROM sojalink_events
WHERE status = 'pending'
ORDER BY created_at ASC
LIMIT 1
FOR UPDATE SKIP LOCKED
```

`FOR UPDATE` verrouille la ligne sélectionnée pendant la transaction. `SKIP LOCKED` permet aux autres workers d'ignorer les lignes déjà verrouillées au lieu d'attendre — deux workers ne peuvent donc jamais réserver le même événement.

### Lister les schedulers actifs

```bash
node ace queue:scheduler:list
```

---

## Authentification

L'accès au dashboard et aux pages de détail est protégé par une authentification par session. Un compte se crée via `/inscription` (voir étape 9).

Après 5 tentatives de connexion échouées, le compte est temporairement bloqué (1h la première fois, 24h en cas de récidive) — le compteur vit dans Redis, pas en base SQL, il expire automatiquement.