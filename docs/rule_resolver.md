# Resolver de règles

## Rôle du resolver

Le resolver de règles est le composant qui détermine quelle règle doit être appliquée à un événement.

Un événement ne peut pas être traité correctement tant qu’aucune règle n’a été choisie. Le resolver intervient donc au début du traitement métier : il reçoit un événement en cours de traitement, cherche les règles compatibles avec cet événement, sélectionne une seule version de règle, puis enregistre le résultat sur l’événement.

Le resolver ne déclenche pas l’exécution du pipeline. Son rôle est uniquement de résoudre la règle à utiliser.

## Termes utilisés

Un **event** est un événement reçu par SojaLink. Il contient notamment un type d’événement, une application source, une entité source et un payload JSON.

Une **rule** est une règle métier rattachée à un type d’événement. Elle possède une priorité. Plus la priorité est basse, plus la règle est prioritaire.

Une **rule version** est une version active d’une règle. C’est elle qui contient les conditions à évaluer et la définition du pipeline à exécuter ensuite.

Les **conditions** sont des critères JSON qui permettent de savoir si une règle correspond à un événement.

Le **resolver** est le service qui compare un événement aux règles disponibles et choisit la règle applicable.

Le **snapshot de résolution** est une copie des informations principales de la règle choisie au moment de la résolution. Il permet de comprendre a posteriori pourquoi une règle a été appliquée, même si la règle est modifiée plus tard.

## Fonctionnement général

Le resolver est appelé lorsqu’un événement est passé au statut `processing`.

Le traitement suit cet ordre :

1. Charger l’événement à résoudre.
2. Vérifier que l’événement est bien en cours de traitement.
3. Charger les règles actives liées au `event_type_id` de l’événement.
4. Charger uniquement les versions actives de ces règles.
5. Évaluer les conditions de chaque version de règle.
6. Identifier les règles compatibles avec l’événement.
7. Sélectionner une seule règle gagnante.
8. Enregistrer le résultat de résolution sur l’événement.

Le résultat est enregistré dans les champs suivants :

* `applied_rule_version_id` : identifiant de la version de règle sélectionnée.
* `resolution_snapshot_json` : informations de résolution au format JSON.

## Sélection de la règle gagnante

Le resolver peut trouver zéro, une ou plusieurs règles compatibles.

Si une seule règle est compatible, sa version active est sélectionnée.

Si plusieurs règles sont compatibles, le resolver compare leur priorité. La règle avec la priorité la plus basse gagne.

Exemple :

| Règle   | Priorité | Compatible |
| ------- | -------: | ---------- |
| Règle A |       10 | oui        |
| Règle B |       20 | oui        |

Dans cet exemple, la règle A est sélectionnée, car `10` est plus prioritaire que `20`.

Si plusieurs règles compatibles ont la même meilleure priorité, le resolver considère que le résultat est ambigu. Dans ce cas, aucune règle n’est appliquée et l’événement est marqué en erreur.

## Évaluation des conditions

Les conditions permettent de vérifier si une version de règle correspond à un événement.

Une condition simple utilise le format suivant :

```json
{
  "op": "eq",
  "field": "sourceApp",
  "value": "SojadisPro"
}
```

Cette condition signifie :

> La règle est applicable uniquement si le champ `sourceApp` de l’événement vaut `SojadisPro`.

Le resolver peut aussi lire des champs imbriqués avec une notation par chemin.

Exemple :

```json
{
  "op": "eq",
  "field": "payload.status",
  "value": "paid"
}
```

Cette condition vérifie la valeur du champ `status` dans le payload JSON de l’événement.

## Condition `eq`

L’opérateur `eq` signifie “égal à”.

La condition retourne `true` uniquement si la valeur trouvée dans l’événement est strictement égale à la valeur attendue.

Exemple :

```json
{
  "op": "eq",
  "field": "sourceEntityType",
  "value": "order"
}
```

Cette condition est vraie si `sourceEntityType` vaut exactement `order`.

## Condition `all`

L’opérateur `all` permet de regrouper plusieurs conditions.

Toutes les conditions du tableau doivent être vraies pour que la règle soit applicable.

Exemple :

```json
{
  "all": [
    {
      "op": "eq",
      "field": "sourceApp",
      "value": "SojadisPro"
    },
    {
      "op": "eq",
      "field": "payload.status",
      "value": "received"
    }
  ]
}
```

Cette règle est applicable uniquement si :

* l’événement vient de `SojadisPro`
* et le champ `payload.status` vaut `received`

Si une seule condition échoue, l’ensemble retourne `false`.

## Champs disponibles dans les conditions

Les conditions sont évaluées à partir d’un contexte construit avec les données de l’événement.

Les champs disponibles sont :

| Champ              | Description                        |
| ------------------ | ---------------------------------- |
| `sourceApp`        | Application qui a émis l’événement |
| `sourceEntityType` | Type d’entité source               |
| `sourceEntityId`   | Identifiant de l’entité source     |
| `payload`          | Données JSON métier de l’événement |

Exemples de chemins valides :

```json
"sourceApp"
```

```json
"sourceEntityType"
```

```json
"payload.status"
```

```json
"payload.customer.email"
```

## Cas d’erreur

### Aucune règle applicable

Si aucune règle ne correspond à l’événement, le resolver lève une erreur.

L’événement ne reçoit pas de `applied_rule_version_id`.

Le traitement de l’événement échoue et l’événement doit être marqué en erreur par le workflow appelant.

### Plusieurs règles applicables avec la même priorité

Si plusieurs règles correspondent à l’événement avec la même meilleure priorité, le resolver lève une erreur.

Ce cas est considéré comme ambigu : le système ne peut pas choisir de manière fiable quelle règle appliquer.

### Conditions invalides

Si les conditions sont absentes, mal formées ou non supportées, elles sont considérées comme non applicables.

Le resolver ne sélectionne pas la règle concernée.

## Données persistées sur l’événement

Quand une règle est trouvée, le resolver enregistre l’identifiant de la version sélectionnée dans `applied_rule_version_id`.

Il enregistre également un snapshot de résolution dans `resolution_snapshot_json`.

Exemple de snapshot :

```json
{
  "ruleId": 12,
  "ruleCode": "ORDER_PAID",
  "ruleVersionId": 34,
  "priority": 10,
  "resolvedAt": "2026-07-06T06:30:00.000Z"
}
```

Ce snapshot permet de savoir :

* quelle règle a été choisie
* quelle version de règle a été utilisée
* quelle était sa priorité
* à quel moment la résolution a eu lieu

## Responsabilités du resolver

Le resolver doit :

* charger l’événement à traiter
* vérifier que l’événement est en cours de traitement
* charger les règles actives liées au type d’événement
* charger les versions actives de ces règles
* évaluer les conditions
* choisir une seule version de règle
* enregistrer la résolution sur l’événement
* signaler explicitement les cas d’erreur

Le resolver ne doit pas :

* exécuter le pipeline
* modifier les règles
* créer de nouvelles versions de règles
* ignorer silencieusement les cas ambigus
* choisir une règle au hasard

## Fichiers concernés

| Fichier                                              | Rôle                                                                                    |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `app/application/events/rule_resolver.ts`            | Contient la logique principale de résolution                                            |
| `app/application/events/evaluate_rule_conditions.ts` | Évalue les conditions d’une règle                                                       |
| `app/application/events/event_workflow.ts`           | Appelle le resolver pendant le workflow de traitement                                   |
| `app/application/events/event_processor.ts`          | Réserve un événement, lance le workflow et marque l’événement comme traité ou en erreur |
| `app/persistence/events/rule_repository.ts`          | Charge les événements, règles, versions actives et persiste la résolution               |

## Exemple de cycle complet

Un événement est créé avec le statut `pending`.

Le worker réserve cet événement et le passe en `processing`.

Le workflow appelle le resolver.

Le resolver charge les règles actives correspondant au type d’événement.

Chaque version active est testée avec ses conditions.

Une règle compatible est trouvée.

Le resolver enregistre la version sélectionnée dans `applied_rule_version_id`.

Le resolver enregistre un snapshot dans `resolution_snapshot_json`.

Le workflow peut ensuite continuer le traitement de l’événement.

## Règle importante

Un événement ne doit pas être considéré comme prêt pour l’exécution métier tant qu’aucune version de règle n’a été résolue.

La présence de `applied_rule_version_id` est donc le signal indiquant qu’une règle a été sélectionnée avec succès.
