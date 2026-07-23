# Moteur d'exécution

## Rôle du moteur d'exécution

Le moteur d'exécution est le composant qui exécute concrètement le pipeline associé à une règle déjà résolue sur un événement.

Une fois la règle résolue et persistée sur l'événement, le moteur prend le relais. Il crée une tentative d'exécution, valide le pipeline, exécute les étapes dans l'ordre, puis met à jour les statuts de l'événement et de la tentative selon le résultat.

Le moteur ne résout pas la règle. Son rôle est uniquement d'exécuter le pipeline défini par la règle sélectionnée.

---

## Termes utilisés

Un **event** est un événement en cours de traitement. Il doit avoir un `applied_rule_version_id` renseigné avant que le moteur puisse l'exécuter.

Un **pipeline** est la liste des étapes à exécuter, définie dans le champ `pipeline_json` de la version de règle sélectionnée.

Un **step** est une étape du pipeline. Chaque step a une clé unique et un handler associé.

Une **attempt** est une tentative d'exécution du pipeline. Chaque fois que le moteur est déclenché sur un événement, une nouvelle tentative est créée en base.

Un **step log** est une ligne enregistrée dans `sojalink_step_logs` après chaque step exécuté, succès ou échec.

---

## Fonctionnement général

Le moteur est appelé lorsqu'un événement est en `processing` et qu'une règle a été résolue.

Le traitement suit cet ordre :

1. Vérifier qu'une règle est résolue (`applied_rule_version_id` présent)
2. Créer une nouvelle tentative en base avec le numéro auto-incrémenté
3. Charger le `pipeline_json` depuis la version de règle
4. Valider le pipeline : steps présents, keys uniques, handlers existants dans le registry, références `steps.<key>` pointant vers un step précédent
5. Pour chaque step, dans l'ordre : résoudre l'`input` (`{{ event.* }}`, `{{ steps.<key>.* }}`), appeler le handler, tracer le step log
6. Mettre à jour le statut de l'`attempt` selon le résultat

Le statut final de l'**event** (`processed` / `failed`) est de la responsabilité de l'`EventProcessor`, pas du moteur : chaque table a un seul écrivain.

---

## Exécution du pipeline

Le pipeline est exécuté de façon strictement séquentielle, un step à la fois, dans l'ordre défini.

Si un step échoue, le moteur arrête immédiatement l'exécution. Les steps suivants ne sont pas exécutés.

Exemple de pipeline :

```json
{
  "steps": [
    { "key": "step-1", "handler": "email_notification" },
    { "key": "step-2", "handler": "create_toki_task" }
  ]
}
```

Pour le détail de la résolution et l'exécution des handlers, voir `docs/handler_register.md`.

---

## Traçabilité des steps

Chaque step exécuté produit une ligne dans `sojalink_step_logs`, qu'il réussisse ou échoue.

En cas de succès :

| Champ | Valeur |
|---|---|
| `status` | `success` |
| `input_json` | Contexte passé au step |
| `output_json` | Résultat retourné par le step |
| `error_code` | `null` |
| `error_message` | `null` |

En cas d'échec :

| Champ | Valeur |
|---|---|
| `status` | `failed` |
| `input_json` | Contexte passé au step |
| `output_json` | `null` |
| `error_code` | Nom de l'erreur |
| `error_message` | Message de l'erreur |

---

## Cycle de vie des statuts

**En cas de succès :**
- `attempt.status` → `success`
- `attempt.finished_at` → renseigné
- puis, côté `EventProcessor` : `event.status` → `processed`, `event.processed_at` renseigné

**En cas d'échec :**
- `attempt.status` → `failed`
- `attempt.error_code` / `attempt.error_message` → erreur typée (`PipelineValidationError`, `InputResolutionError`, ...)
- `attempt.finished_at` → renseigné
- puis, côté `EventProcessor` : `event.status` → `failed`, `event.failed_at` renseigné

---

## Cas d'erreur

### Pipeline invalide

Si le pipeline ne contient pas de steps, si un step n'a pas de `key` ou de `handler`, si deux steps ont la même `key`, si un handler n'existe pas dans le registry, ou si un input référence un step futur ou inconnu, le moteur lève une `PipelineValidationError` avant de commencer l'exécution. Aucun step log n'est créé dans ce cas.

### Input non résoluble

Si une référence `{{ event.xxx }}` ou `{{ steps.<key>.xxx }}` ne peut pas être résolue au moment d'exécuter un step, le step échoue avec une `InputResolutionError`, son step log est écrit en `failed`, et le pipeline s'arrête.

### Une attempt déjà active

Si une tentative est déjà en cours pour cet événement, le moteur refuse d'en créer une nouvelle et lève une erreur.

---

## Responsabilités du moteur

Le moteur doit :
- Vérifier que l'événement est prêt à être exécuté
- Créer et tracer chaque tentative
- Valider la structure du pipeline avant exécution
- Exécuter les steps dans l'ordre défini
- Logger chaque step en succès et en échec
- Mettre à jour les statuts de façon cohérente

Le moteur ne doit pas :
- Résoudre la règle applicable
- Modifier la configuration du pipeline
- Ignorer silencieusement les erreurs de step
- Exécuter plusieurs steps en parallèle

---

## Fichiers concernés

| Fichier | Rôle |
|---|---|
| `app/application/events/event_executor.ts` | Orchestre l'exécution complète (cycle de vie de l'attempt) |
| `app/application/events/step_executor.ts` | Exécute un step individuel et écrit son step log |
| `app/application/events/pipeline_validator.ts` | Valide la structure du pipeline avant exécution |
| `app/application/events/input_resolver.ts` | Résout les références `{{ }}` des inputs de steps |
| `app/persistence/events/attempt_repository.ts` | Crée et met à jour les tentatives en base |
| `app/persistence/events/step_log_repository.ts` | Enregistre les logs de chaque step en base |

---

## Exemple de cycle complet

Un événement est en `processing` avec une règle résolue.

Le workflow appelle le moteur d'exécution.

Le moteur crée une tentative en base avec le statut `active`.

Le pipeline est chargé et validé.

Les steps sont exécutés dans l'ordre.

Chaque step produit un log dans `sojalink_step_logs`.

Si tous les steps réussissent, l'événement passe en `processed` et la tentative en `success`.

Si un step échoue, l'exécution s'arrête immédiatement, l'événement passe en `failed` et la tentative en `failed`.

---

## Règle importante

Un événement ne peut pas être exécuté par le moteur tant qu'aucune règle n'a été résolue.

La présence de `applied_rule_version_id` est le signal indiquant que le moteur peut démarrer l'exécution.