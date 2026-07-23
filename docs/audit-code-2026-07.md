# Audit de code SojaLink — juillet 2026

Audit réalisé sur l'état du projet au niveau de la branche `handler-registry` (PR #20), comparé aux documents de cadrage V1 (architecture applicative, modèle d'exécution, format de pipeline, contrat des handlers) et aux conventions AdonisJS / TypeScript.

Chaque constat est suivi de la correction appliquée dans cette branche. Les points laissés ouverts sont listés en fin de document.

---

## 1. Constats critiques (le moteur ne faisait pas ce que la doc décrit)

### 1.1 Le pipeline n'était jamais exécuté en production

`EventWorkflow.run()` appelait uniquement le `RuleResolver`, puis `EventProcessor` marquait l'event `processed`. La classe `ExecuteEvent` (l'executor) n'était référencée **que par les tests** : en conditions réelles, un event était marqué « traité » après la seule résolution de règle, sans qu'aucun step ne soit exécuté.

**Correction** : `EventWorkflow` enchaîne désormais résolution puis exécution (`RuleResolver` → `EventExecutor`). Un test bout-en-bout (`tests/unit/event_processor.spec.ts`) couvre le flux complet réservation → résolution → exécution → statut final.

### 1.2 Le typecheck ne passait pas

`npm run typecheck` échouait avec 6 erreurs :

- `execute_step.ts` n'envoyait pas `startedAt` / `finishedAt` exigés par `CreateStepLogInput` (conséquence visible : `finished_at` restait `NULL` dans `sojalink_step_logs`) ;
- `config/auth.ts` et `user_transformer.ts` importaient `#models/user`, un modèle **supprimé** du projet ;
- imports inutilisés dans les specs.

**Correction** : typecheck vert (0 erreur). Le lint échouait également (8 erreurs de formatage sur `database/schema.ts`, fichier généré) : il est désormais ignoré par ESLint/Prettier, comme le reste des fichiers générés.

### 1.3 La résolution des inputs `{{ }}` n'existait pas

La doc « Format de pipeline » spécifie la résolution de variables (`{{ event.xxx }}`, `{{ steps.<key>.xxx }}`). Le code ne l'implémentait pas : `resolve_step_input.ts` construisait une seule fois un contexte figé de l'event, chaque handler recevait ce même objet, le champ `input` des steps était ignoré, et les outputs des steps précédents étaient accumulés dans une variable jamais lue.

**Correction** : `input_resolver.ts` implémente le contrat documenté (référence seule → valeur typée, référence dans une chaîne → interpolation, référence non résoluble → `InputResolutionError` et échec du step). Les outputs circulent de step en step via `ctx.steps`.

### 1.4 Validation de pipeline incomplète

La doc exige : steps présents, `key` présents et uniques, `handler` présents **et existants dans le registry**, références `steps.xxx` pointant vers un step précédent. Le code ne vérifiait ni la présence des `key`, ni l'existence des handlers, ni les références. Un pipeline avec un handler inconnu passait la validation et échouait en plein milieu d'exécution.

**Correction** : `PipelineValidator` applique les 4 familles de règles et rejette le pipeline **avant** tout step (erreur typée `PipelineValidationError`, tracée dans l'attempt, zéro step log).

### 1.5 Les seeders ne correspondaient pas au moteur

Le seeder de `rule_versions` écrivait des conditions au format `[{ conditions: [{ field, operator, value }] }]` alors que l'évaluateur attend `{ op, field, value }` / `{ all: [...] }`, et un pipeline référençant des handlers inexistants (`create_toki_task`, `send_notification`). Avec les données seedées, **aucune règle ne pouvait jamais matcher**. Les tests contournaient le problème en réécrivant les conditions à la main.

**Correction** : seeders alignés sur le format documenté (`docs/rule_resolver.md`) et sur le handler réellement enregistré (`email_notification`), avec un input de démonstration utilisant les templates `{{ }}`. Le graphe seedé est désormais traitable de bout en bout.

### 1.6 Scaffolding auth cassé

Reste du starter kit : `config/auth.ts`, middlewares `auth`/`guest`/`silent_auth`, `user_transformer.ts`, `validators/user.ts` et pages Inertia login/signup référençaient un modèle `#models/user` supprimé et des routes (`session.store`, ...) qui n'existent plus. Au-delà de l'erreur de typecheck, `silent_auth_middleware` s'exécutait sur **toutes** les routes et aurait fait crasher la première requête HTTP venue.

**Correction** : scaffolding auth mort retiré (provider, config, middlewares, pages, dépendance `@adonisjs/auth`). À réintroduire proprement (modèle + migration + routes) le jour où l'UI d'administration aura besoin d'authentification — c'est un choix à re-valider en équipe, le retrait est trivialement réversible via git.

---

## 2. Incohérences d'architecture et de conventions

### 2.1 Injection de dépendances incohérente

Certains fichiers utilisaient `@inject()` (conteneur IoC AdonisJS), d'autres instanciaient à la main : `execute_step.ts` créait `StepLogRepository` et `HandlerRegistry` en singletons au niveau module, hors conteneur.

**Correction / convention posée** :

- **Services avec dépendances** (resolver, executor, validator, registry, handlers) = classes `@inject()`, résolues par le conteneur.
- **Logique pure sans état** (`evaluate_rule_conditions`, `input_resolver`, `object_path`) = fonctions exportées, testables sans conteneur.
- Aucun `new` de service en dehors du conteneur dans le code applicatif (les tests peuvent en faire, ou passer par `app.container.make()`).

### 2.2 Responsabilités mal placées

- `RuleRepository` contenait `findProcessingEvent` et `saveResolution` (des écritures/lectures d'**events**) → déplacés dans `EventRepository`. `RuleRepository` ne charge plus que des règles.
- `ExecuteEvent` et `EventProcessor` écrivaient tous les deux le statut final de l'event → désormais **un seul écrivain par table** : `EventProcessor` pour `sojalink_events`, `EventExecutor` pour `sojalink_attempts`, `StepExecutor` pour `sojalink_step_logs`, `RuleResolver` (via `EventRepository`) pour les champs de résolution.
- Le mapping `toProcessingEvent` était dupliqué dans deux repositories → une seule implémentation.

### 2.3 Nommage

- Classes nommées avec des verbes (`ExecuteEvent`, `ValidatePipeline`) → renommées en noms de services : `EventExecutor`, `StepExecutor`, `PipelineValidator`.
- Arborescence `app/application/handler/register/` + `handler/handlers/` → simplifiée en `app/application/handlers/`.
- Imports relatifs avec extension `.ts` (`./execute_step.ts`) mélangés aux alias → alias de sous-chemins (`#application/...`, `#domain/...`, `#jobs/...` ajouté) partout.
- Relations Lucid nommées en snake_case (`sojalink_attempts`) → camelCase (`attempts`, `stepLogs`, `versions`, ...).

### 2.4 Relations Lucid toutes cassées

Les `@hasMany` / `@belongsTo` s'appuyaient sur les clés étrangères par défaut de Lucid (ex. `sojalinkRuleId`) qui ne correspondent pas aux colonnes réelles (`rule_id`, `event_id`, `applied_rule_version_id`...). Toute utilisation (preload, etc.) aurait échoué — d'où le N+1 manuel du `RuleRepository`.

**Correction** : `foreignKey` explicite sur chaque relation ; le chargement règles + versions actives utilise maintenant `preload` (plus de N+1).

### 2.5 TypeScript sous-exploité

- `status: string` partout → unions de littéraux : `EventStatus`, `AttemptStatus`, `StepLogStatus`.
- `HandlerInput.payload` typé `string` alors que le code y mettait un objet parsé → types de domaine honnêtes (`payload: Record<string, unknown>` parsé une seule fois dans le repository, avec erreur claire si le JSON est invalide).
- `step: any` dans la validation → types `Pipeline` / `PipelineStep` du domaine.
- Erreurs génériques `new Error(...)` → hiérarchie d'erreurs typées (`NoMatchingRuleError`, `MultipleMatchingRulesError`, `PipelineValidationError`, `InputResolutionError`, `HandlerNotFoundError`, ...) dont le `name` est persisté comme `error_code` : le debug dans `sojalink_step_logs` / `sojalink_attempts` devient exploitable.

### 2.6 Contrat des handlers dérivé de la doc de cadrage

La doc handlers spécifie un contexte `{ event, input, steps, services }` ; la PR #20 donnait au handler l'event brut en guise d'input, sans `steps`, et le handler exemple retournait `{ status: 'success' }` — précisément l'anti-pattern « retour de status » interdit par cette même doc.

**Correction** : `HandlerContext = { event, input, steps }` conforme à la doc. Divergence assumée et documentée : `services` passe par l'injection de dépendances AdonisJS dans le constructeur du handler plutôt que par le contexte (plus idiomatique pour le framework, testable au même titre). Les handlers restent des classes implémentant `StepHandler` (choix de la PR #20, conservé).

---

## 3. Traçabilité (l'exigence n°1 du produit)

Colonnes prévues par les migrations mais jamais renseignées :

| Champ | Avant | Maintenant |
|---|---|---|
| `sojalink_events.resolved_at` | jamais écrit | écrit à la résolution |
| `sojalink_events.processed_at` | jamais écrit | écrit au succès |
| `sojalink_events.failed_at` | jamais écrit | écrit à l'échec |
| `sojalink_events.resolution_error_code/_message` | jamais écrits | écrits quand la résolution échoue |
| `sojalink_step_logs.started_at` / `finished_at` | non transmis (`finished_at` NULL) | mesurés autour de l'exécution du step |
| `sojalink_attempts.finished_at` | update séparé, format de date bricolé à la main | écrit atomiquement avec le statut final |

Au passage : `AttemptRepository` mélangeait `finished_at` (snake_case + `toFormat()` manuel) et `errorMessage` (camelCase) dans le même repository ; les mises à jour passent désormais par `find` + `merge` + `save` (sérialisation Lucid native des `DateTime`).

Autre correction de traçabilité : un échec d'event est un **résultat métier**, déjà tracé (event, attempt, step logs). `EventProcessor` ne relance plus l'exception vers le job de polling — le job ne passe en échec que pour une vraie erreur d'infrastructure.

---

## 4. Tests

- Les specs passaient (54) mais ne compilaient pas (imports inutilisés) et testaient un executor **jamais branché en prod**.
- Le test « output du step 1 accessible depuis le step 2 » ne vérifiait pas ce qu'il annonçait (aucune assertion sur les outputs).
- Titres approximatifs (« Check if attempt is succeed », « Invalide pipeline get failed ») → reformulés en comportements.
- `logger.info` de débogage dans les assertions → supprimés.

État final : **64 tests verts** (contre 54), dont :

- `event_processor.spec.ts` (nouveau) : flux complet pending → processed / failed, y compris timestamps et champs d'erreur de résolution ;
- `input_resolver.spec.ts` (nouveau) : contrat de résolution des `{{ }}` ;
- `event_executor.spec.ts` : validation stricte (handler inconnu, clés dupliquées, référence à un step futur), propagation des outputs, échec de résolution d'input tracé.

Les specs restent dans `tests/unit/` alors que la plupart touchent la base : voir « points ouverts ».

---

## 5. Docs

- `docs/handler_register.md` : chemins de fichiers faux (3 sur 3) et contrat obsolète → réécrit.
- `docs/runtime_executor.md` : fichiers renommés, cycle de vie des statuts, nouveaux cas d'erreur → mis à jour.
- `docs/rule_resolver.md` : champs `resolved_at` / `resolution_error_*`, dernière version active, table des fichiers → mis à jour.

---

## 6. Points ouverts (décisions d'équipe, non traités dans cette branche)

1. **Vocabulaire des statuts** : le code utilise `processed` (event) et `active` (attempt) là où les docs de cadrage disent `success` / `processing`. Le code est cohérent avec lui-même et avec la base ; renommer = migration de données. À trancher, puis aligner les docs de cadrage ou la base.
2. **Course sur la création d'attempt** : le contrôle « une seule attempt active » est un check applicatif (non atomique). Sans risque avec le worker unique séquentiel de la V1 ; à protéger en base si le polling devient concurrent.
3. **`sojalink_entity_correlations`** : la table et le modèle existent mais l'idempotence métier documentée (lecture avant création, écriture après) n'a encore aucun code. À traiter avec le premier handler qui crée une ressource cible, via une convention projet unique (pas d'improvisation par handler).
4. **Suites de tests** : les specs actuelles sont des tests d'intégration DB rangés dans `tests/unit`. Proposition : suite `integration` dédiée dans `adonisrc.ts`, et réserver `unit` aux fonctions pures (`input_resolver`, `evaluate_rule_conditions`).
5. **Drain du backlog** : le worker traite un event par tick de 10 s. Suffisant en V1 ; prévoir une boucle de drain (traiter tant qu'il y a du pending, avec limite) si le volume augmente.
6. **Réintroduction de l'auth** : à refaire proprement (modèle, migration, routes, middlewares) quand l'UI arrivera.
7. **`docs/architecure-applicative.md`** : faute de frappe dans le nom du fichier et arborescence cible qui a en partie divergé (noms de modèles `sojalink_*`, dossiers `handlers/`) ; à rafraîchir.

---

## 7. Règles à faire respecter en review (rappel)

- **Une migration commitée ne se modifie jamais** : tout changement de schéma (y compris un rename de colonne) passe par une **nouvelle** migration. La PR #20 a renommé `handler_key` → `handler_name` en éditant la migration déjà appliquée : les bases migrées avant le rename ont gardé l'ancienne colonne, le codegen `database/schema.ts` a régénéré un modèle sans `handlerName`, et toute écriture de step log crashait sur ces environnements. Remède pour les bases de dev désynchronisées : `node ace migration:fresh --seed`.
- Un event doit exister avant tout traitement ; un seul traitement actif par event.
- Résolution avant exécution ; une seule règle gagnante ; pipeline séquentiel ; arrêt au premier échec.
- Une exécution = une attempt ; un step exécuté = un step log (avec timestamps).
- Un seul écrivain par table interne.
- Handlers : une responsabilité, input résolu, output JSON simple, `throw` en cas d'échec, jamais d'écriture dans les tables internes.
- Transactions courtes pour l'état interne, jamais de transaction globale couvrant des appels externes.
- Reprise = nouvel event, jamais de réouverture.
- `npm run lint`, `npm run typecheck` et `npm test` doivent être verts sur chaque PR.
