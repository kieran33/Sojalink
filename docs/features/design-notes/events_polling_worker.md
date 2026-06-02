# Note de conception - Worker de polling SojaLink

Date : 2026-05-21
Auteur(s) : Emilien BILLY
Statut : Livré

---

## 1. Résumé

La feature permet de prendre régulièrement un événement avec le statut `pending`, de le réserver de façon atomique, puis de le passer en `processing`.

Le worker ne doit jamais permettre à deux exécutions concurrentes de réserver le même événement.

La V1 couvre le polling, la réservation et le déclenchement du traitement. Le traitement métier complet de l'événement reste hors périmètre.

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
- fournir un point d'entrée minimal pour le futur traitement métier.

La feature est considérée utilisable lorsque :

- un job de polling est exécuté régulièrement ;
- un seul événement est réservé par cycle ;
- la réservation est atomique ;
- le comportement concurrent est couvert par des tests ;
- le traitement métier est isolé du job queue.

---

## 3. Hors périmètre

La V1 ne couvre pas :

- le traitement métier complet des événements ;
- la stratégie de reprise des événements bloqués ;
- le retry applicatif des événements échoués ;
- la définition complète des workflows métier par type d'event.

---

## 4. Concepts métier

### Event SojaLink

Un event SojaLink représente un événement métier à traiter de manière asynchrone.

Techniquement, il est stocké dans la table `sojalink_events`.

### Statut d'un event

Valeurs actuelles :

- `pending`
- `processing`
- `processed`
- `failed`

La réservation manipule `pending` et `processing`. Le use case sait aussi marquer `processed` et `failed`.

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
6. Le worker transmet l'événement au use case de traitement.

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
- un log indique qu'aucun événement n'est disponible.

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
- le traitement métier doit être isolé de la logique de réservation.

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
- `created_at`
- `processing_started_at`
- `processed_at`
- `updated_at`

### Unicité

La branche courante ne s'appuie plus sur `source_event_id`, `correlation_key` ni `occurred_at` dans `sojalink_events`.

L'idempotence de l'event est assurée par une contrainte unique composite sur :

1. `source_app`
2. `source_entity_type`
3. `source_entity_id`
4. `event_type_id`

### Ordre de sélection

Le worker sélectionne les événements dans l'ordre suivant :

1. `created_at ASC`

Cet ordre permet de traiter les événements dans l'ordre de leur insertion dans SojaLink.

---

## 8. Architecture technique

### Découpage actuel

```txt
app/jobs/poll_pending_events_job.ts
app/application/events/pending_events_worker.ts
app/application/events/process_next_pending_event.ts
app/application/events/event_processor.ts
app/persistence/events/event_repository.ts
start/scheduler.ts
```

### Rôle des fichiers

`poll_pending_events_job.ts` :

- représente le job Adonis Queue ;
- ne contient pas la logique métier ;
- appelle le worker de polling.

`pending_events_worker.ts` :

- sert d'entrée application pour le job ;
- délègue au use case `ProcessNextPendingEvent`.

`process_next_pending_event.ts` :

- orchestre la réservation, l'appel au processor et la mise à jour finale de statut ;
- marque l'event en `processed` ou `failed`.

`event_processor.ts` :

- contient le stub du futur traitement métier.

`event_repository.ts` :

- contient la logique de réservation atomique ;
- ouvre la transaction SQL ;
- sélectionne un événement `pending` ;
- le passe en `processing`.

`start/scheduler.ts` :

- planifie l'exécution régulière du job ;
- ne schedule rien quand `NODE_ENV=test`.

---

## 9. Réservation concurrente

Principe actuel :

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
if (shouldSchedulePolling()) {
  await PollPendingEventsJob.schedule({}).every('10s')
}
```

Le worker Queue doit être lancé dans un process dédié :

```bash
node ace queue:work --queue=pending_events
```

---

## 11. Logs attendus

Le worker doit produire des logs clairs pour les cas suivants :

- démarrage d'un cycle de polling ;
- aucun événement disponible ;
- événement réservé ;
- erreur pendant le traitement ;
- échec définitif du job Queue.

Les logs utilisent le logger Adonis.

---

## 12. Tests attendus

Les tests couvrent actuellement :

- un événement `pending` passe en `processing` ;
- `processing_started_at` est renseigné ;
- un événement déjà `processing` est ignoré ;
- aucun événement n'est modifié s'il n'y a pas de `pending` ;
- un seul événement est réservé par cycle ;
- deux workers concurrents ne réservent pas le même événement ;
- le job délègue au worker ;
- le scheduler ne planifie rien pendant les tests.

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
- un fichier de traitement minimal existe ;
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
- Le traitement métier réel est hors périmètre de la V1.
- Le fichier de traitement existe dès la V1 sous forme minimale.
- Les logs passent par le logger Adonis.
- Les tests de concurrence sont obligatoires.
- `sojalink_events` s'ordonne par `created_at` pour le polling.
- `sojalink_events` utilise une contrainte unique composite sur la source et le type d'event.

---

## 15. Questions ouvertes

### 1. Reprise des événements bloqués

Question :

Que faire si un événement reste bloqué en `processing` après un crash worker ?

Proposition V1 :

Hors périmètre. Une issue dédiée devra définir une stratégie de reprise basée sur `processing_started_at`.

### 2. Fréquence de polling

Question :

Le job doit-il tourner toutes les 10 secondes, toutes les 30 secondes ou toutes les minutes ?

Proposition V1 :

Toutes les 10 secondes.

### 3. Backend Queue

Question :

Adonis Queue doit-il utiliser le driver database ou Redis ?

Proposition V1 :

Le driver database est acceptable en développement. Redis pourra être envisagé en production si le volume ou la fiabilité attendue le justifie.
