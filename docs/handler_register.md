# Registre de handlers

## Rôle du registry

Le registry de handlers est le composant qui fait le lien entre le nom d'un handler défini dans le pipeline et la classe qui exécute concrètement l'action métier correspondante.

Le moteur d'exécution ne connaît jamais la logique interne d'un handler, il connaît uniquement son nom. C'est le registry qui résout ce nom en une instance de classe prête à être utilisée.

---

## Termes utilisés

Un **handler** est une classe qui implémente l'interface `StepHandler` et exécute une action métier précise : envoyer un email, créer une tâche dans Toki, mettre à jour un statut dans Dolibarr...

Le **registry** (`HandlerRegistry`) est l'objet central qui contient tous les handlers disponibles, indexés par leur nom.

L'interface **StepHandler** est le contrat que tous les handlers doivent respecter. Elle est définie dans le domaine (`app/domain/events/handler.ts`).

---

## Fonctionnement général

Quand le moteur d'exécution traite un step, il demande au registry de lui fournir le handler correspondant :

1. Le validateur de pipeline vérifie avant exécution que chaque `step.handler` existe dans le registry (`registry.has(name)`)
2. Au moment d'exécuter un step, le moteur passe le nom du handler (`step.handler`) au registry
3. Le registry retourne l'instance correspondante
4. Si le handler n'existe pas, il lève une `HandlerNotFoundError`

---

## Contrat StepHandler

Tous les handlers implémentent cette interface :

```typescript
export interface StepHandler {
  execute(context: HandlerContext): Promise<HandlerOutput>
}

export type HandlerContext = {
  event: HandlerEvent // données de l'événement courant (lecture seule)
  input: Record<string, unknown> // input du step, déjà résolu par le moteur
  steps: Record<string, HandlerOutput> // outputs des steps précédents
}

export type HandlerOutput = Record<string, unknown>
```

Règles du contrat :

- l'`input` est déjà résolu : un handler ne parse **jamais** de template `{{ }}`
- l'output est un petit objet JSON simple, exploitable par les steps suivants
- succès → `return`, échec → `throw`
- pas de retour de statut du type `{ success: false }` : un échec est une exception
- les services techniques (mailer, APIs externes, ...) sont fournis par injection de dépendances AdonisJS dans le constructeur du handler, pas via le contexte
- un handler ne modifie jamais `sojalink_events`, `sojalink_attempts`, `sojalink_step_logs`

---

## Créer un nouveau handler

```typescript
// app/application/handlers/create_toki_task_handler.ts
import { inject } from '@adonisjs/core'
import type { HandlerContext, HandlerOutput, StepHandler } from '#domain/events/handler'

@inject()
export class CreateTokiTaskHandler implements StepHandler {
  // Les services techniques arrivent par injection de dépendances
  // constructor(private tokiClient: TokiClient) {}

  async execute(context: HandlerContext): Promise<HandlerOutput> {
    const { title } = context.input

    // logique métier ici

    return { taskId: 123 }
  }
}
```

Chaque handler est testable indépendamment du moteur : il suffit de l'instancier et d'appeler sa méthode `execute()` directement dans un test.

---

## Ajouter un handler au registry

Ajouter un nouveau handler ne nécessite jamais de modifier le moteur (`event_executor.ts`, `step_executor.ts`).

Il suffit de :

1. Créer la classe du handler dans `app/application/handlers/`
2. L'injecter dans le constructeur du registry et l'ajouter à la map

```typescript
// app/application/handlers/handler_registry.ts
@inject()
export class HandlerRegistry {
  private readonly handlers: Record<string, StepHandler>

  constructor(
    emailNotificationHandler: EmailNotificationHandler,
    createTokiTaskHandler: CreateTokiTaskHandler
  ) {
    this.handlers = {
      email_notification: emailNotificationHandler,
      create_toki_task: createTokiTaskHandler,
    }
  }
}
```

---

## Handlers disponibles

| Nom                  | Classe                     | Description                             |
| -------------------- | -------------------------- | --------------------------------------- |
| `email_notification` | `EmailNotificationHandler` | Envoie une notification email (stub V1) |

---

## Cas d'erreur

### Handler inconnu

Un pipeline référençant un handler non enregistré est rejeté **avant exécution** par le validateur de pipeline (`PipelineValidationError`), donc aucun step n'est exécuté.

Si malgré tout un nom inconnu atteint le registry, celui-ci lève :

```
HandlerNotFoundError: Handler "<nom_du_handler>" is not registered
```

---

## Fichiers concernés

| Fichier                                                | Rôle                                                        |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| `app/domain/events/handler.ts`                         | Contrat `StepHandler`, `HandlerContext`, `HandlerOutput`    |
| `app/application/handlers/handler_registry.ts`         | Le registry, associe les noms aux instances de handlers     |
| `app/application/handlers/email_notification_handler.ts` | Premier handler implémenté (stub)                         |

---

## Règle importante

Le moteur d'exécution ne doit jamais connaître la logique interne d'un handler.

Chaque handler est indépendant : il reçoit un contexte (`event`, `input`, `steps`), fait son travail, et retourne un `output`. Il ne pilote pas le flow, ne décide pas du step suivant et ne modifie pas le statut global de l'événement.
