# Note de conception - Worker de polling SojaLink

Date : 2026-05-21 (mise à jour : 2026-08-06)
Statut : Livré — V1 étendue (traitement métier complet désormais implémenté)

---

## 0. Note de mise à jour

Ce document décrivait initialement la V1 du worker de polling, limitée à la
réservation d'un événement (jusqu'au passage en `processing`), le traitement
métier complet étant explicitement hors périmètre.

**Ce périmètre a depuis été étendu** : le traitement métier complet (résolution
de règle, exécution du pipeline, gestion des handlers) est maintenant implémenté
et documenté séparément (`docs/rule_resolver.md`, `docs/runtime_executor.md`,
`docs/handler_registry.md`). Ce document a été mis à jour pour refléter
l'architecture réelle des fichiers, mais garde son objet initial : le mécanisme
de polling et de réservation atomique.

---

## 1. Résumé

La feature permet de prendre régulièrement un événement avec le statut `pending`, de le réserver de façon atomique, puis de le passer en `processing`.

Le worker ne doit jamais permettre à deux exécutions concurrentes de réserver le même événement.

La V1 couvrait le polling, la réservation et le déclenchement du traitement. Le traitement métier complet est désormais implémenté en aval de la réservation (voir section 0).

---

## 2. Objectif V1

La V1 doit permettre de :

- planifier l'exécution régulière d'un job de polling ;
- rechercher un événement `pending` dans `sojalink_events` ;
- réserver exactement un événement par cycle ;
- passer l'événement réservé en `processing` ;
- renseigner `processing_started_at` ;
- ignorer les événements déjà `processing` ;
- garantir qu'un événement ne peut pas être réservé par deux workers concurrents ;
- fournir un point d'entrée pour le traitement métier.

La feature est considérée utilisable lorsque :

- un job de polling est exécuté régulièrement ;
- un seul événement est réservé par cycle ;
- la réservation est atomique ;
- le comportement concurrent est couvert par des tests ;
- le traitement métier est isolé du job queue.

---

## 3. Hors périmètre

Hors périmètre du **worker de polling lui-même** (couvert par ailleurs, voir
section 0) :

- la stratégie de reprise des événements bloqués (event resté en `processing`
  après un crash worker) — toujours hors périmètre, non implémenté ;
- le retry applicatif des événements échoués — conçu (voir diagramme d'activité)
  mais non implémenté, prévu V2.

Le traitement métier des événements (résolution de règle, exécution du
pipeline) n'est plus hors périmètre — voir section 0.

---

## 4. Concepts métier

### Event SojaLink

Un event SojaLink représente un événement métier à traiter de manière asynchrone.

Techniquement, il est stocké dans la table `sojalink_events`.

### Statut d'un event

Valeurs actuelles, inchangées depuis la V1 :

- `pending`
- `processing`
- `processed`
- `failed`

La réservation manipule `pending` et `processing`. Le statut final (`processed`
ou `failed`) est désormais décidé par `EventProcessor`, une fois le traitement
métier complet terminé (pas seulement un stub comme en V1 initiale).

### Worker de polling

Le worker de polling est le composant chargé de chercher régulièrement un événement `pending`.

Il ne traite qu'un seul événement par cycle.

### Réservation

La réservation consiste à prendre un événement `pending`, puis à le passer en `processing` dans une transaction SQL.

Cette étape doit être atomique.

---

## 5. Cas d'utilisation principaux

### Cas 1 - Réserver un événement pending

1. Le job de polling démarre.
2. Le worker cherche le plus ancien événement `pending`.
3. Le worker verrouille l'événement.
4. Le worker passe l'événement en `processing`.
5. Le worker renseigne `processing_started_at`.
6. Le worker transmet l'événement au traitement métier complet (résolution de
   règle puis exécution du pipeline — voir `docs/rule_resolver.md` et
   `docs/runtime_executor.md`).

Résultat attendu :

- un seul événement est réservé ;
- son statut devient `processing` ;
- `processing_started_at` est renseigné.

### Cas 2 - Aucun événement pending

1. Le job de polling démarre.
2. Le worker cherche un événement `pending`.
3. Aucun événement n'est trouvé.
4. Le cycle se termine sans erreur.

Résultat attendu :

- aucun événement n'est modifié ;
- un log de niveau `debug` indique qu'aucun événement n'est disponible
  (`"No pending event available"`) ;
- le passage du worker est tout de même enregistré dans Redis (voir section 8).

### Cas 3 - Deux workers concurrents

1. Deux workers démarrent en même temps.
2. Les deux cherchent un événement `pending`.
3. Le premier worker verrouille un événement.
4. Le second worker ignore l'événement verrouillé.
5. Le second worker prend un autre événement disponible ou ne fait rien.

Résultat attendu :

- deux workers ne réservent jamais le même événement ;
- aucun événement n'est traité deux fois.

---

## 6. Règles métier

- seuls les événements `pending` peuvent être réservés ;
- un événement déjà `processing` ne doit pas être repris ;
- un cycle de polling réserve au maximum un événement ;
- la réservation doit être réalisée dans une transaction ;
- la réservation doit être sûre en cas de concurrence ;
- `processing_started_at` doit être renseigné au moment de la réservation ;
- la table `sojalink_events` reste la source de vérité métier ;
- Adonis Queue sert à planifier et exécuter régulièrement le polling ;
- le statut final de l'événement (`processed`/`failed`) est décidé à un seul
  endroit (`EventProcessor`), jamais dupliqué ailleurs dans le code.

---

## 7. Modèle / données

### Entité concernée

- `SojalinkEvent`

### Table concernée

- `sojalink_events`

### Champs principaux

- `id`
- `event_type_id`
- `source_app`
- `source_entity_type`
- `source_entity_id`
- `status`
- `payload_json`
- `applied_rule_version_id`
- `resolution_snapshot_json`
- `resolution_error_code`
- `resolution_error_message`
- `created_at`
- `processing_started_at`
- `resolved_at`
- `processed_at`
- `failed_at`
- `updated_at`

> Les champs `resolution_error_code`, `resolution_error_message`,
> `resolved_at` et `failed_at` ont été ajoutés depuis la V1 initiale, pour
> tracer précisément les échecs de résolution de règle.

> ⚠️ **Type de colonne** : `payload_json` et `resolution_snapshot_json` sont
> déclarées en `table.text(...)`, pas `table.json(...)` — un type `JSON` natif
> se comporte différemment entre MariaDB (dev/CI) et MySQL (production Railway),
> ce qui a causé un bug réel de production (voir la note de déploiement).

### Unicité

L'idempotence de l'event est assurée par une contrainte unique composite sur :

1. `source_app`
2. `source_entity_type`
3. `source_entity_id`
4. `event_type_id`

### Ordre de sélection

Le worker sélectionne les événements dans l'ordre suivant :

1. `created_at ASC`

Cet ordre permet de traiter les événements dans l'ordre de leur insertion dans SojaLink (FIFO).

---

## 8. Architecture technique

### Découpage actuel

```txt
start/scheduler.ts
app/jobs/poll_pending_events_job.ts
app/application/events/pending_events_worker.ts
app/application/events/event_processor.ts
app/application/events/event_workflow.ts
app/application/events/rule_resolver.ts
app/application/events/event_executor.ts
app/persistence/events/event_repository.ts
app/persistence/events/worker_health_repository.ts
```

> Le fichier `process_next_pending_event.ts` mentionné dans une version
> antérieure de ce document n'existe plus — son rôle a été repris par
> `event_workflow.ts`.

### Rôle des fichiers

`start/scheduler.ts` :

- planifie l'exécution régulière du job ;
- ne schedule rien quand `NODE_ENV=test`.

`poll_pending_events_job.ts` :

- représente le job Adonis Queue ;
- ne contient pas la logique métier ;
- appelle le worker de polling.

`pending_events_worker.ts` :

- sert d'entrée application pour le job ;
- délègue à `EventProcessor.process()` ;
- mesure la durée du tick et appelle `WorkerHealthRepository.recordRun()`
  systématiquement, que le tick ait traité un événement ou non.

`event_processor.ts` :

- orchestre le cycle complet : réserve l'événement via `EventRepository`,
  lance `EventWorkflow.run()`, décide seul du statut final
  (`processed`/`failed`) ;
- en cas d'échec, log l'erreur mais ne la relance pas (un échec métier n'est
  pas une panne du job de queue).

`event_workflow.ts` :

- enchaîne `RuleResolver.resolve()` puis `EventExecutor.execute()` ;
- transmet directement le `ruleVersionId` résolu à l'executor, sans relire
  l'événement en base.

`rule_resolver.ts` :

- trouve la règle applicable à l'événement (voir `docs/rule_resolver.md`).

`event_executor.ts` :

- exécute le pipeline de la règle résolue (voir `docs/runtime_executor.md`).

`event_repository.ts` :

- contient la logique de réservation atomique ;
- ouvre la transaction SQL ;
- sélectionne un événement `pending` ;
- le passe en `processing` ;
- persiste le statut final, la résolution de règle (succès ou échec).

`worker_health_repository.ts` :

- composant NoSQL (Redis) qui trace la santé du worker : heure du dernier
  passage, durée moyenne des 20 derniers ticks — indépendant de MariaDB, donné
  éphémère non critique.

---

## 9. Réservation concurrente

Principe actuel, inchangé depuis la V1 :

```ts
const event = await SojalinkEvent.query({ client: transaction })
  .where('status', 'pending')
  .orderBy('createdAt', 'asc')
  .forUpdate()
  .skipLocked()
  .first()
```

`forUpdate()` verrouille la ligne sélectionnée pendant la transaction.

`skipLocked()` permet aux autres workers d'ignorer les lignes déjà verrouillées.

Ce mécanisme évite qu'un même événement soit réservé par deux workers.

---

## 10. Planification

La répétition est gérée par Adonis Queue.

Le scheduler planifie régulièrement le job de polling.

Code actuel :

```ts
export function shouldSchedulePolling(nodeEnv = process.env.NODE_ENV) {
  return nodeEnv !== 'test'
}

if (shouldSchedulePolling()) {
  await PollPendingEventsJob.schedule({}).every('10s')
}
```

Le worker Queue doit être lancé dans un process dédié, **distinct du serveur
web** :

```bash
node ace queue:work --queue=pending_events
```

> En production (Railway), ce process tourne dans un service séparé
> (`worker-pending-events`), partageant la même image Docker que le service
> web mais avec une commande de démarrage différente. Voir la note de
> déploiement.

---

## 11. Logs attendus

Le worker doit produire des logs clairs pour les cas suivants :

- démarrage d'un cycle de polling ;
- aucun événement disponible (niveau `debug`) ;
- événement réservé, règle résolue, exécution du pipeline, résultat final
  (niveau `info`) ;
- erreur pendant le traitement (niveau `error`, avec le détail complet de
  l'erreur, `type`/`message`/`stack`) ;
- échec définitif du job Queue.

Les logs utilisent le logger Adonis.

---

## 12. Tests attendus

Les tests couvrent actuellement (répartis sur plusieurs fichiers, voir
`tests/unit/`) :

- un événement `pending` passe en `processing` ;
- `processing_started_at` est renseigné ;
- un événement déjà `processing` est ignoré ;
- aucun événement n'est modifié s'il n'y a pas de `pending` ;
- un seul événement est réservé par cycle ;
- deux workers concurrents ne réservent pas le même événement ;
- le job délègue au worker ;
- le scheduler ne planifie rien pendant les tests ;
- le composant `WorkerHealthRepository` signale correctement l'absence de
  passage, et détecte un passage récent une fois `recordRun` appelé.

---

## 13. Critères d'acceptation

La feature est terminée lorsque :

- un job Adonis Queue planifie le polling ;
- le polling réserve au maximum un événement par cycle ;
- seuls les événements `pending` sont réservés ;
- l'événement réservé passe en `processing` ;
- `processing_started_at` est renseigné ;
- les événements déjà `processing` sont ignorés ;
- la réservation est atomique ;
- deux workers concurrents ne peuvent pas réserver le même événement ;
- la logique métier est séparée du job Queue ;
- le traitement métier complet est déclenché après la réservation ;
- les tests de concurrence passent ;
- une documentation explique le fonctionnement du worker.

---

## 14. Décisions prises

- Adonis Queue est utilisé pour planifier et exécuter régulièrement le polling.
- La table `sojalink_events` reste la source de vérité métier.
- Le job Queue ne contient pas la logique de réservation.
- Un cycle de polling réserve au maximum un événement.
- La réservation est faite dans une transaction SQL.
- La réservation utilise `FOR UPDATE` et `SKIP LOCKED`.
- Le traitement métier réel, initialement hors périmètre V1, est désormais
  implémenté (résolution de règle + exécution de pipeline).
- Les logs passent par le logger Adonis.
- Les tests de concurrence sont obligatoires.
- `sojalink_events` s'ordonne par `created_at` pour le polling (FIFO).
- `sojalink_events` utilise une contrainte unique composite sur la source et le type d'event.
- Un composant Redis (`WorkerHealthRepository`) trace la santé du worker,
  indépendamment de MariaDB — donnée éphémère, non critique.

---

## 15. Questions ouvertes

### 1. Reprise des événements bloqués

Question :

Que faire si un événement reste bloqué en `processing` après un crash worker ?

Statut : **toujours ouvert, non implémenté.** Une issue dédiée devra définir
une stratégie de reprise basée sur `processing_started_at`.

### 2. Fréquence de polling

Question :

Le job doit-il tourner toutes les 10 secondes, toutes les 30 secondes ou toutes les minutes ?

Statut : **tranché.** 10 secondes, validé en développement comme en
production.

### 3. Backend Queue

Question :

Adonis Queue doit-il utiliser le driver database ou Redis ?

Statut : **tranché pour la queue elle-même** — le driver `database` est
conservé en production (`QUEUE_DRIVER=database`), aucun besoin identifié de
passer sur un driver Redis pour la queue à ce stade. Redis est en revanche
utilisé pour un besoin différent : la supervision du worker (voir section 8,
`worker_health_repository.ts`), pas pour la queue elle-même.

### 4. Retry automatique des événements échoués

Question :

Faut-il relancer automatiquement un événement échoué plusieurs fois avant de
le marquer définitivement `failed` ?

Statut : **conçu, non implémenté.** Visible dans le diagramme d'activité de
conception (compteur de tentatives, maximum 3). Prévu pour une version
ultérieure (V2).