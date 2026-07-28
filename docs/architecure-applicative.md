# Architecture applicative Sojalink

Cette documentation décrit l’architecture cible de l’application et la règle principale à respecter : les modèles Lucid restent cantonnés à la persistance, tandis que le reste de l’application manipule des objets métier.

## Objectif

L’objectif est de séparer clairement :

- la représentation base de données ;
- les concepts métier ;
- les cas d’usage applicatifs ;
- les adaptateurs techniques comme HTTP ou les workers.

Cette séparation évite que les modèles Lucid deviennent les types centraux de toute l’application. Elle permet aussi de typer plus précisément certains états métier, par exemple un event réservé avec `status: 'processing'`.

## Structure cible

```txt
app/
  models/
    sojalink_event.ts
    event_type.ts
    rule.ts
    rule_version.ts
    entity_correlation.ts

  domain/
    events/
      event.ts
      event_status.ts
      event_type.ts
      event_payload.ts
      event_errors.ts
    rules/
      rule.ts
      rule_version.ts
      rule_conditions.ts
      rule_pipeline.ts
      rule_resolution.ts
    correlations/
      entity_correlation.ts
      correlation_key.ts

  persistence/
    events/
      event_repository.ts
    rules/
      rule_repository.ts
    correlations/
      correlation_repository.ts

  application/
    events/
      process_next_pending_event.ts
      event_processor.ts
      list_events.ts
      retry_failed_event.ts
    rules/
      resolve_rule_for_event.ts
      execute_rule_pipeline.ts
      list_rules.ts
      create_rule.ts
    correlations/
      resolve_entity_correlation.ts
      create_or_update_correlation.ts

  http/
    controllers/
      events_controller.ts
      rules_controller.ts
    validators/
      create_event_validator.ts
      update_rule_validator.ts
    transformers/
      event_transformer.ts
      rule_transformer.ts

  workers/
    pending_events_worker.ts
```

## Rôle des dossiers

### `app/models`

Contient uniquement les modèles Lucid.

Les modèles Lucid représentent la structure persistée en base de données. Ils sont utilisés pour les requêtes, les relations, les mutations et les opérations de persistance.

Ils ne doivent pas devenir les types métier utilisés dans toute l’application.

Règle :

```txt
Les modèles Lucid restent dans app/models et app/persistence.
```

Exemple :

```ts
export default class SojalinkEvent extends BaseModel {
  declare id: number
  declare status: 'pending' | 'processing' | 'processed' | 'failed'
  declare payloadJson: unknown
}
```

### `app/persistence`

Contient les repositories et le code lié à la base de données.

Cette couche est responsable :

- des requêtes Lucid ;
- des transactions ;
- des locks ;
- des `save`, `update`, `delete` ;
- de la conversion entre les modèles Lucid et les objets métier.

Les repositories peuvent importer les modèles Lucid.

Un repository ne doit pas exposer les modèles Lucid au reste de l’application. Il retourne des objets métier définis dans `app/domain`.

Exemple :

```ts
import db from '@adonisjs/lucid/services/db'
import { DateTime } from 'luxon'
import SojalinkEvent from '#models/sojalink_event'
import type { ProcessingEvent } from '#domain/events/event'

export class EventRepository {
  async reserveNextPendingEvent(): Promise<ProcessingEvent | null> {
    return db.transaction(async (transaction) => {
      const event = await SojalinkEvent.query({ client: transaction })
        .where('status', 'pending')
        .orderBy('occurredAt', 'asc')
        .forUpdate()
        .first()

      if (!event) {
        return null
      }

      event.status = 'processing'
      event.processingStartedAt = DateTime.utc()

      await event.useTransaction(transaction).save()

      if (!event.processingStartedAt) {
        throw new Error('Expected processingStartedAt to be defined')
      }

      return {
        id: event.id,
        status: 'processing',
        type: event.type,
        payload: event.payloadJson,
        occurredAt: event.occurredAt,
        processingStartedAt: event.processingStartedAt,
      }
    })
  }

  async markEventAsProcessed(eventId: number): Promise<void> {
    await SojalinkEvent.query()
      .where('id', eventId)
      .update({
        status: 'processed',
        processedAt: DateTime.utc(),
      })
  }

  async markEventAsFailed(eventId: number): Promise<void> {
    await SojalinkEvent.query()
      .where('id', eventId)
      .update({
        status: 'failed',
      })
  }
}
```

Le petit `return { ... }` est le mapping entre la représentation Lucid et l’objet métier. Il peut rester inline dans le repository tant que la conversion reste simple.

### `app/domain`

Contient les concepts métier de l’application.

Cette couche est responsable :

- des types métier ;
- des statuts métier ;
- des objets métier ;
- des règles métier pures ;
- des fonctions métier sans effet de bord.

Cette couche ne doit pas dépendre d’Adonis, de Lucid, de HTTP, des workers ou de la base de données.

Exemple :

```ts
import type { DateTime } from 'luxon'

export type EventStatus = 'pending' | 'processing' | 'processed' | 'failed'

export type PendingEvent = {
  id: number
  status: 'pending'
  type: string
  payload: unknown
  occurredAt: DateTime
}

export type ProcessingEvent = {
  id: number
  status: 'processing'
  type: string
  payload: unknown
  occurredAt: DateTime
  processingStartedAt: DateTime
}

export type ProcessedEvent = {
  id: number
  status: 'processed'
  type: string
  payload: unknown
  occurredAt: DateTime
  processedAt: DateTime
}

export type FailedEvent = {
  id: number
  status: 'failed'
  type: string
  payload: unknown
  occurredAt: DateTime
  failedAt: DateTime
  errorMessage?: string
}

export type DomainEvent =
  | PendingEvent
  | ProcessingEvent
  | ProcessedEvent
  | FailedEvent
```

Exemple de règle métier pure :

```ts
import type { Rule } from './rule.js'

export function sortRulesByPriority(rules: Rule[]): Rule[] {
  return [...rules].sort((a, b) => b.priority - a.priority)
}
```

À ne pas mettre dans `domain/` :

- requêtes SQL ;
- modèles Lucid ;
- `HttpContext` ;
- validators Adonis ;
- transformers HTTP ;
- workers ;
- transactions.

### `app/application`

Contient les cas d’usage et l’orchestration applicative.

Cette couche décrit ce que fait l’application. Elle coordonne les repositories, les objets métier et les services applicatifs.

Elle peut dépendre de `app/domain` et de `app/persistence`, mais elle ne doit pas importer directement les modèles Lucid.

Exemple de cas d’usage :

```ts
import { inject } from '@adonisjs/core'
import logger from '@adonisjs/core/services/logger'
import { EventRepository } from '#persistence/events/event_repository'
import { EventProcessor } from './event_processor.js'

@inject()
export class ProcessNextPendingEvent {
  constructor(
    private eventRepository: EventRepository,
    private eventProcessor: EventProcessor
  ) {}

  async handle(): Promise<void> {
    const event = await this.eventRepository.reserveNextPendingEvent()

    if (!event) {
      logger.debug('No pending event available')
      return
    }

    logger.info({ eventId: event.id }, 'Pending event reserved for processing')

    try {
      await this.eventProcessor.process(event)
      await this.eventRepository.markEventAsProcessed(event.id)

      logger.info({ eventId: event.id }, 'Event processed successfully')
    } catch (error) {
      await this.eventRepository.markEventAsFailed(event.id)

      logger.error({ err: error, eventId: event.id }, 'Pending event processing failed')

      throw error
    }
  }
}
```

Exemple de processor :

```ts
import type { ProcessingEvent } from '#domain/events/event'

export class EventProcessor {
  async process(event: ProcessingEvent): Promise<void> {
    /**
     * TODO:
     * - Identifier le type d’event
     * - Charger les règles applicables
     * - Résoudre la version de règle à appliquer
     * - Exécuter l’action associée
     */
  }
}
```

Dans cet exemple, `EventProcessor.process()` ne peut pas recevoir n’importe quel event. Il reçoit uniquement un `ProcessingEvent`, donc un objet métier dont le type garantit `status: 'processing'`.

### `app/http`

Contient les adaptateurs HTTP : controllers, validators, transformers.

Seule exception à la règle « pas de Lucid hors persistance » : `app/http` peut recevoir et utiliser des modèles Lucid, à la seule condition qu'ils ne sortent jamais tels quels vers Inertia (toujours via un transformer).

Pourquoi cette exception : les controllers HTTP servent des pages d'affichage (lister, consulter), sans état à protéger le temps d'une requête. Le risque qui justifie les objets métier ailleurs (un event traité deux fois, une étape exécutée dans le désordre) est un risque d'exécution asynchrone et concurrente, propre au moteur (`app/domain`, `app/application`). Il n'existe pas sur une requête HTTP synchrone de lecture. Imposer un mapping vers un objet métier intermédiaire, alors que le transformer va de toute façon reformer les données pour la page, ajoute une étape sans bénéfice de sécurité de typage supplémentaire.

Un controller appelle un cas d'usage applicatif (`app/application`), qui charge les données via un repository (`app/persistence`) avec les relations nécessaires préchargées. Le repository peut renvoyer le modèle Lucid préchargé directement, ou un objet métier si le cas d'usage en a besoin (le moteur, lui, ne reçoit jamais de Lucid).

Le transformer prend ce que renvoie le cas d'usage et produit les données envoyées au frontend. Utiliser `@adonisjs/core/transformers` (`BaseTransformer`, `.pick()` pour lister explicitement les champs exposés, `.whenLoaded()` pour les relations préchargées) : `.pick()` garantit qu'aucune colonne interne ne fuite par oubli, qu'on parte d'un Lucid ou d'un objet métier.

Exemple :

```ts
// app/http/controllers/rules_controller.ts
import { inject } from '@adonisjs/core'
import { GetRuleDetail } from '#application/rules/get_rule_detail'
import RuleDetailTransformer from '#http/transformers/rule_detail_transformer'

@inject()
export default class RulesController {
  constructor(private getRuleDetail: GetRuleDetail) {}

  async show({ params, inertia }: HttpContext) {
    const rule = await this.getRuleDetail.handle(params.id)

    return inertia.render('rules/show', {
      rule: RuleDetailTransformer.transform(rule).useVariant('forShowPage'),
    })
  }
}
```

Exemple de transformer :

```ts
import { BaseTransformer } from '@adonisjs/core/transformers'
import type SojalinkRule from '#models/sojalink_rule'

export default class RuleDetailTransformer extends BaseTransformer<SojalinkRule> {
  forShowPage() {
    return {
      ...this.pick(this.resource, ['id', 'code', 'label', 'priority', 'isActive']),
      versions: this.whenLoaded(this.resource.versions)?.map((version) => ({
        id: version.id,
        versionNumber: version.versionNumber,
        isActive: version.isActive,
      })),
    }
  }
}
```

### `app/workers`

Contient les workers et jobs techniques.

Un worker doit rester un adaptateur technique. Il déclenche un cas d’usage applicatif, mais ne contient pas la logique métier principale.

Exemple :

```ts
import { inject } from '@adonisjs/core'
import { ProcessNextPendingEvent } from '#application/events/process_next_pending_event'

@inject()
export class PendingEventsWorker {
  constructor(private processNextPendingEventUseCase: ProcessNextPendingEvent) {}

  async handle(): Promise<void> {
    await this.processNextPendingEventUseCase.handle()
  }
}
```

## Règles de dépendance

Les dépendances doivent suivre ce sens :

```txt
http/
workers/
  -> application/
      -> domain/
      -> persistence/
          -> models/
```

Règles principales :

```txt
app/models      = modèles Lucid uniquement
app/persistence = seule couche autorisée à construire des objets métier depuis Lucid
app/domain      = métier pur, pas de Lucid, pas de HTTP
app/application = orchestration, pas de modèles Lucid
app/http        = adaptation HTTP, peut utiliser les modèles Lucid (via les transformers, jamais exposés tels quels)
app/workers     = adaptation worker, pas de modèles Lucid
```

Seul `app/http` déroge à la règle « pas de Lucid hors persistance », pour les raisons expliquées plus haut. `app/domain`, `app/application` et `app/workers` restent bloqués : c'est là que vivent les invariants d'état du moteur (resolver/executor), qui ont besoin d'objets métier typés pour rester sûrs (voir `docs/rule_resolver.md`, `docs/runtime_executor.md`).

## Règle ESLint

Les modèles Lucid ne doivent être importés que par `app/models`, `app/persistence`, et `app/http`.

Exemple avec `no-restricted-imports` et `paths` :

```js
import { configApp } from '@adonisjs/eslint-config'

const lucidModelImports = [
  '#models/sojalink_event',
  '#models/sojalink_event_type',
  '#models/sojalink_rule',
  '#models/sojalink_rule_version',
  '#models/sojalink_attempt',
  '#models/sojalink_step_log',
  '#models/sojalink_entity_correlation',
].map((name) => ({
  name,
  message:
    'Les modèles Lucid sont réservés à app/persistence et app/http. Utilise un objet métier exposé par app/domain.',
}))

export default [
  ...configApp(),

  {
    files: ['app/**/*.ts'],
    ignores: ['app/models/**/*.ts', 'app/persistence/**/*.ts', 'app/http/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: lucidModelImports,
        },
      ],
    },
  },
]
```

## Exemple de flux : traitement d’un event pending

```txt
PendingEventsWorker
  -> ProcessNextPendingEvent
    -> EventRepository.reserveNextPendingEvent()
      -> SojalinkEvent Lucid
      -> ProcessingEvent métier
    -> EventProcessor.process(event: ProcessingEvent)
    -> EventRepository.markEventAsProcessed(event.id)
```

Le processor ne reçoit pas un modèle Lucid. Il reçoit un objet métier typé :

```ts
ProcessingEvent
```

Cela permet de garantir au typage que l’event traité est déjà réservé et possède :

```ts
status: 'processing'
```

## Glossaire

### Modèle Lucid

Objet de persistance utilisé par Adonis/Lucid pour représenter une ligne de base de données.

Exemple : `SojalinkEvent`.

### Objet métier

Objet utilisé par l’application pour représenter un concept métier.

Exemple : `ProcessingEvent`.

### Repository

Classe responsable de la lecture et écriture en base de données. Elle utilise Lucid et retourne des objets métier.

### Use case

Classe applicative qui orchestre un scénario métier.

Exemple : `ProcessNextPendingEvent`.

### Transformer HTTP

Classe ou fonction qui transforme un objet métier en réponse JSON HTTP.

### Mapping

Conversion entre deux représentations d’un même concept.

Exemple :

```txt
SojalinkEvent Lucid -> ProcessingEvent métier
```
