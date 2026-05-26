# Note de conception — Worker de polling SojaLink

Date : 2026-05-21  
Auteur(s) : Emilien BILLY  
Statut : En développement

---

## 1. Résumé

La feature doit permettre de prendre régulièrement un événement avec le statut `pending`, de le réserver de façon atomique, puis de le passer en `processing`.

Le worker ne doit jamais permettre à deux exécutions concurrentes de réserver le même événement.

La V1 se concentre uniquement sur le polling, la réservation et la préparation du traitement.

Le traitement métier complet des événements n’est pas couvert par cette note.

---

## 2. Objectif V1

La V1 doit permettre de :

- planifier l’exécution régulière d’un job de polling ;
- rechercher un événement `pending` dans `sojalink_events` ;
- réserver exactement un événement par cycle ;
- passer l’événement réservé en `processing` ;
- renseigner `processing_started_at` ;
- ignorer les événements déjà `processing` ;
- garantir qu’un événement ne peut pas être réservé par deux workers concurrents ;
- fournir un point d’entrée minimal pour le futur traitement métier.

La feature sera considérée utilisable lorsque :

- un job de polling est exécuté régulièrement ;
- un seul événement est réservé par cycle ;
- la réservation est atomique ;
- le comportement concurrent est couvert par des tests ;
- le traitement métier est isolé dans une fonction dédiée, même minimale.

---

## 3. Hors périmètre

La V1 ne couvre pas :

- le traitement métier complet des événements ;
- la gestion avancée des erreurs métier ;
- le retry applicatif des événements échoués ;

---

## 4. Concepts métier

### Event SojaLink

Un event SojaLink représente un événement métier à traiter de manière asynchrone.

Techniquement, il est stocké dans la table `sojalink_events`.

### Statut d’un event

Un event peut suivre plusieurs états.

Valeurs envisagées :

- `pending` : l’événement est en attente de traitement ;
- `processing` : l’événement a été réservé par un worker ;
- `processed` : l’événement a été traité avec succès ;
- `failed` : l’événement a échoué.

La V1 manipule uniquement les statuts `pending` et `processing`.

### Worker de polling

Le worker de polling est le composant chargé de chercher régulièrement un événement `pending`.

Il ne traite qu’un seul événement par cycle.

### Réservation

La réservation consiste à prendre un événement `pending`, puis à le passer en `processing` dans une transaction SQL.

Cette étape doit être atomique.

---

## 5. Cas d’utilisation principaux

### Cas 1 — Réserver un événement pending

Parcours nominal :

1. Le job de polling démarre.
2. Le worker cherche le plus ancien événement `pending`.
3. Le worker verrouille l’événement.
4. Le worker passe l’événement en `processing`.
5. Le worker renseigne `processing_started_at`.
6. Le worker transmet l’événement à la fonction de traitement.

Résultat attendu :

- un seul événement est réservé ;
- son statut devient `processing` ;
- `processing_started_at` est renseigné.

### Cas 2 — Aucun événement pending

Parcours nominal :

1. Le job de polling démarre.
2. Le worker cherche un événement `pending`.
3. Aucun événement n’est trouvé.
4. Le worker termine son cycle sans erreur.

Résultat attendu :

- aucun événement n’est modifié ;
- un log indique qu’aucun événement n’est disponible.

### Cas 3 — Deux workers concurrents

Parcours nominal :

1. Deux workers démarrent en même temps.
2. Les deux cherchent un événement `pending`.
3. Le premier worker verrouille un événement.
4. Le second worker ignore l’événement verrouillé.
5. Le second worker prend un autre événement disponible ou ne fait rien.

Résultat attendu :

- deux workers ne réservent jamais le même événement ;
- aucun événement n’est traité deux fois.

---

## 6. Règles métier

- Seuls les événements `pending` peuvent être réservés.
- Un événement déjà `processing` ne doit pas être repris.
- Un cycle de polling réserve au maximum un événement.
- La réservation doit être réalisée dans une transaction.
- La réservation doit être sûre en cas de concurrence.
- `processing_started_at` doit être renseigné au moment de la réservation.
- La table `sojalink_events` reste la source de vérité métier.
- Adonis Queue sert uniquement à planifier et exécuter régulièrement le polling.
- Le traitement métier doit être isolé de la logique de réservation.

---

## 7. Modèle / données

### Entité concernée

- `SojalinkEvent`

### Table concernée

- `sojalink_events`

### Champs principaux

Sur `sojalink_events` :

- `id`
- `status`
- `payload_json`
- `created_at`
- `occurred_at`
- `processing_started_at`
- `processed_at`
- `updated_at`

### Ordre de sélection

Le worker sélectionne les événements dans l’ordre suivant :

1. `occurred_at ASC`
2. `id ASC`

Cet ordre permet de traiter les événements métier dans l’ordre chronologique.

---

## 8. Architecture technique

### Découpage proposé

```txt
app/jobs/poll_sojalink_pending_events_job.ts
app/sojalink/workers/poll_pending_sojalink_events.ts
app/sojalink/workers/process_sojalink_event.ts
start/scheduler.ts
```

### Rôle des fichiers

`poll_sojalink_pending_events_job.ts` :

- représente le job Adonis Queue ;
- ne contient pas la logique métier ;
- appelle le worker de polling.

`poll_pending_sojalink_events.ts` :

- contient la logique de réservation ;
- ouvre une transaction SQL ;
- sélectionne un événement `pending` ;
- le passe en `processing`.

`process_sojalink_event.ts` :

- contient le point d’entrée du futur traitement métier ;
- reste minimal en V1.

`start/scheduler.ts` :

- planifie l’exécution régulière du job.

---

## 9. Réservation concurrente

La réservation doit utiliser une transaction SQL avec verrouillage.

Principe attendu :

```ts
const event = await trx
  .from('sojalink_events')
  .where('status', 'pending')
  .orderBy('occurred_at', 'asc')
  .orderBy('id', 'asc')
  .forUpdate()
  .skipLocked()
  .first()
```

`forUpdate()` verrouille la ligne sélectionnée pendant la transaction.

`skipLocked()` permet aux autres workers d’ignorer les lignes déjà verrouillées.

Ce mécanisme évite qu’un même événement soit réservé par deux workers.

---

## 10. Planification

La répétition est gérée par Adonis Queue.

Le scheduler planifie régulièrement le job de polling.

Exemple :

```ts
scheduler
  .job(PollSojalinkPendingEventsJob)
  .every('10s')
```

Le worker Queue doit être lancé dans un process dédié.

Exemple :

```bash
node ace queue:work
```

---

## 11. Logs attendus

Le worker doit produire des logs clairs pour les cas suivants :

- démarrage d’un cycle de polling ;
- aucun événement disponible ;
- événement réservé ;
- erreur pendant le cycle de polling ;
- échec définitif du job Queue.

Les logs doivent utiliser le logger Adonis plutôt que `console.log`.

---

## 12. Tests attendus

Les tests doivent couvrir :

- un événement `pending` passe en `processing` ;
- `processing_started_at` est renseigné ;
- un événement déjà `processing` est ignoré ;
- aucun événement n’est modifié s’il n’y a pas de `pending` ;
- un seul événement est réservé par cycle ;
- deux workers concurrents ne réservent pas le même événement ;
- plusieurs événements `pending` peuvent être réservés par plusieurs workers sans doublon.

---

## 13. Critères d’acceptation

La feature est terminée lorsque :

- un job Adonis Queue planifie le polling ;
- le polling réserve au maximum un événement par cycle ;
- seuls les événements `pending` sont réservés ;
- l’événement réservé passe en `processing` ;
- `processing_started_at` est renseigné ;
- les événements déjà `processing` sont ignorés ;
- la réservation est atomique ;
- deux workers concurrents ne peuvent pas réserver le même événement ;
- la logique métier est séparée du job Queue ;
- un fichier de traitement minimal existe ;
- les tests de concurrence passent ;
- une documentation explique le fonctionnement du worker.

---

## 14. Découpage développement

La feature peut être découpée en plusieurs chantiers :

1. Ajouter la configuration Adonis Queue.
2. Ajouter le scheduler du job de polling.
3. Créer le job `PollSojalinkPendingEventsJob`.
4. Créer le worker `poll_pending_sojalink_events`.
5. Implémenter la réservation atomique.
6. Créer le stub `process_sojalink_event`.
7. Ajouter les tests de réservation.
8. Ajouter les tests de concurrence.
9. Ajouter la documentation d’exploitation.

---

## 15. Décisions prises

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

---

## 16. Questions ouvertes

### 1. Fréquence de polling

Question :

Le job doit-il tourner toutes les 10 secondes, toutes les 30 secondes ou toutes les minutes ?

Proposition V1 :

Toutes les 10 secondes, afin d’avoir un délai raisonnable sans surcharger inutilement la base.

### 2. Reprise des événements bloqués

Question :

Que faire si un événement reste bloqué en `processing` après un crash worker ?

Proposition V1 :

Hors périmètre. Une issue dédiée devra définir une stratégie de reprise basée sur `processing_started_at`.

### 3. Statut `failed`

Question :

Le worker doit-il passer un événement en `failed` si le traitement échoue ?

Proposition V1 :

Non. Le traitement métier complet est hors périmètre de cette V1.

### 4. Nombre d’événements traités par cycle

Question :

Le worker doit-il traiter un seul événement ou vider toute la file ?

Proposition V1 :

Un seul événement par cycle. Cela simplifie les tests, limite les transactions longues et rend la concurrence plus prévisible.

### 5. Backend Queue

Question :

Adonis Queue doit-il utiliser le driver database ou Redis ?

Proposition V1 :

Le driver database est acceptable en développement. Redis pourra être envisagé en production si le volume ou la fiabilité attendue le justifie.

