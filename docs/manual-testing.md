# Tester SojaLink manuellement (V1)

Ce guide déroule un test manuel complet du moteur : de la base vierge jusqu'à la vérification de la traçabilité, en passant par les cas d'erreur. Chaque étape indique ce que tu dois observer. Le protocole a été validé de bout en bout sur la branche `claude/code-audit-refactor-qnoelh`.

Rappel du besoin couvert : une appli source écrit un event en base → SojaLink le prend en charge → résout une règle → exécute le pipeline de steps → trace tout (event, attempt, step logs), sans jamais casser sur un cas non prévu (il finit en `failed` tracé).

---

## 1. Mise en place (une fois)

```bash
# Base de données (crée sojalink_dev et sojalink_test)
docker compose -f docker-compose.dev.yml up -d

# Environnement
cp .env.example .env
node ace generate:key --force

# Schéma + données de démo
node ace migration:run
node ace db:seed
```

Le seed crée un graphe complet et traitable :

- un type d'événement `sojadispro.order.created`
- une règle `sojadispro-order-to-toki-task` (priorité 5) avec une version active dont la condition est `sourceApp == "SojadisPro"`
- un pipeline d'un step `notify_team` → handler `email_notification`, avec un input à templates `{{ }}`
- un event `pending` qui matche cette règle

> Note : `.env.example` utilise `root`/`root`. Si tu utilises l'utilisateur `adonis` du docker-compose, adapte `DB_USER`/`DB_PASSWORD`.

> ⚠️ **Base dev ancienne** : si ta base a été migrée avant la PR #20, elle a une colonne `handler_key` au lieu de `handler_name` (migration modifiée en place — voir l'audit) et les écritures de step logs crashent avec `Cannot define "handlerName" on "SojalinkStepLog" model`. Remède (données de dev jetables) : `node ace migration:fresh --seed`.

## 2. Démarrer le moteur

Deux process (deux terminaux) :

```bash
# Terminal 1 — serveur HTTP : enregistre le planning de polling (toutes les 10 s)
node ace serve --hmr

# Terminal 2 — worker de queue : exécute les jobs de polling
node ace queue:work -q pending_events
```

⚠️ Le job de polling est sur la queue `pending_events` : sans le flag `-q pending_events`, le worker écoute la queue `default` et rien ne se passe.

## 3. Les scénarios en une commande (recommandé)

Chaque scénario ci-dessous existe aussi sous forme de **seeder de scénario** dans `database/seeders/scenarios/`, à lancer **pendant que le worker tourne** :

```bash
node ace db:seed --files "database/seeders/scenarios/scenario_1_nominal_seeder.ts"
node ace db:seed --files "database/seeders/scenarios/scenario_2_no_matching_rule_seeder.ts"
node ace db:seed --files "database/seeders/scenarios/scenario_3_multi_step_seeder.ts"
node ace db:seed --files "database/seeders/scenarios/scenario_4_failing_step_seeder.ts"
node ace db:seed --files "database/seeders/scenarios/scenario_5_invalid_pipeline_seeder.ts"
```

Chaque seeder :

- crée (ou réutilise) un graphe **isolé** — type d'événement `scenario.*`, règle, version — pour ne jamais perturber les autres scénarios ni les données de démo ;
- insère un event `pending` frais (rejouable à volonté : chaque exécution crée un nouvel event) ;
- affiche dans le terminal **le résultat attendu** et **la requête SQL de vérification** prête à copier-coller.

Ils sont restreints à l'environnement `development` (jamais exécutés en test ni en prod). Un `node ace db:seed` global les rejoue aussi tous — pratique pour une démo complète : lance le seed global, démarre le worker, et regarde les 5 events se faire traiter avec leurs 5 issues différentes.

Les sections suivantes détaillent chaque scénario (et donnent l'équivalent SQL brut, qui reste la meilleure simulation d'une vraie appli source).

## 4. Scénario 1 — flux nominal automatique

Ne fais rien : dans les ~10‑20 s, le worker doit prendre l'event seedé.

```sql
SELECT id, source_app, status, applied_rule_version_id,
       resolved_at, processed_at
FROM sojalink_events;
```

**Attendu** : `status = processed`, `applied_rule_version_id` renseigné, `resolved_at` et `processed_at` non NULL.

```sql
SELECT * FROM sojalink_attempts;   -- status = success, finished_at non NULL
SELECT step_code, handler_name, status, input_json, output_json
FROM sojalink_step_logs;
```

**Attendu** : un step log `notify_team` en `success`, avec l'input **résolu** (ex. `{"message":"New event 1 received from SojadisPro"}` — plus aucun `{{ }}`) et `output_json = {"sent":true}`.

## 5. Scénario 2 — une appli source insère un event

C'est exactement ce que feront les applis métier : un simple INSERT.

```sql
INSERT INTO sojalink_events
  (event_type_id, source_app, source_entity_type, source_entity_id,
   status, payload_json, created_at)
VALUES
  (1, 'SojadisPro', 'worksheet', 2001, 'pending',
   '{"id": 2001, "name": "commande test"}', NOW());
```

**Attendu** sous ~10 s : l'event passe en `processed`, avec attempt + step log comme au scénario 1.

## 6. Scénario 3 — aucun règle ne matche (cas d'échec tracé)

```sql
INSERT INTO sojalink_events
  (event_type_id, source_app, source_entity_type, source_entity_id,
   status, payload_json, created_at)
VALUES
  (1, 'UnknownApp', 'worksheet', 2002, 'pending', '{"id": 2002}', NOW());
```

**Attendu** :

```sql
SELECT status, resolution_error_code, resolution_error_message, failed_at
FROM sojalink_events WHERE source_entity_id = 2002;
```

- `status = failed`, `failed_at` non NULL
- `resolution_error_code = NoMatchingRuleError` + message explicite
- **aucune** ligne dans `sojalink_attempts` (le pipeline n'a jamais démarré)
- le worker continue de tourner : un event en échec ne casse pas l'app

## 7. Scénario 4 — pipeline multi-steps et outputs chaînés

Ajoute une **v2 de la règle** (montre aussi que le resolver prend la dernière version active) :

```sql
INSERT INTO sojalink_rule_versions
  (rule_id, version_number, is_active, conditions_json, pipeline_json, created_at)
VALUES (1, 2, 1,
  '{"op": "eq", "field": "sourceApp", "value": "SojadisPro"}',
  '{"steps": [
     {"key": "notify_team", "handler": "email_notification",
      "input": {"message": "Event {{ event.id }}: {{ event.payload.name }}"}},
     {"key": "notify_manager", "handler": "email_notification",
      "input": {"previous_sent": "{{ steps.notify_team.sent }}",
                "app": "{{ event.sourceApp }}"}}
   ]}', NOW());

INSERT INTO sojalink_events
  (event_type_id, source_app, source_entity_type, source_entity_id,
   status, payload_json, created_at)
VALUES (1, 'SojadisPro', 'worksheet', 3001, 'pending',
        '{"id": 3001, "name": "commande v2"}', NOW());
```

**Attendu** :

- `applied_rule_version_id` = id de la **v2**
- 2 step logs en `success`, dans l'ordre (`step_index` 0 puis 1)
- l'input du step 2 contient l'output du step 1 : `{"previous_sent": true, "app": "SojadisPro"}`

## 8. Scénario 5 — step qui échoue en cours de pipeline

Insère un event dont le payload ne contient pas le champ référencé :

```sql
-- La v2 référence {{ event.payload.name }} : payload sans "name"
INSERT INTO sojalink_events
  (event_type_id, source_app, source_entity_type, source_entity_id,
   status, payload_json, created_at)
VALUES (1, 'SojadisPro', 'worksheet', 3002, 'pending',
        '{"id": 3002}', NOW());
```

**Attendu** :

- event `failed`, attempt `failed` avec `error_code = InputResolutionError`
- **un seul** step log, en `failed`, avec le message d'erreur (`Cannot resolve reference "{{ event.payload.name }}"`)
- le step 2 n'a jamais été exécuté (stop au premier échec)

## 9. Scénario 6 — pipeline invalide rejeté avant exécution

Mets un handler inexistant dans un pipeline puis insère un event qui matche :

**Attendu** : attempt `failed` avec `error_code = PipelineValidationError`, **zéro** step log — le pipeline est rejeté avant le premier step.

Variantes à essayer : deux steps avec la même `key`, un step sans `key`, un input référençant `{{ steps.<step_futur>.x }}`.

## 10. Grille de vérification de la traçabilité

Pour n'importe quel event, tu dois pouvoir répondre à « que s'est-il passé ? » uniquement avec SQL :

```sql
SELECT e.id, e.status, e.resolution_error_code,
       e.resolved_at, e.processed_at, e.failed_at,
       a.attempt_number, a.status AS attempt_status, a.error_code,
       s.step_index, s.step_code, s.status AS step_status,
       s.input_json, s.output_json, s.error_message
FROM sojalink_events e
LEFT JOIN sojalink_attempts a ON a.event_id = e.id
LEFT JOIN sojalink_step_logs s ON s.attempt_id = a.id
WHERE e.id = <ID>
ORDER BY a.attempt_number, s.step_index;
```

Si une ligne de cette requête ne suffit pas à expliquer un échec, c'est un bug de traçabilité : à remonter.

## 11. Reprise après échec

Rappel V1 : on ne relance jamais un event `failed`. Pour rejouer, l'appli source insère un **nouvel** event (avec un nouvel identifiant source). Vérifie qu'un event `failed` reste `failed` et que le nouveau passe.
