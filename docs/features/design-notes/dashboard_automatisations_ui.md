# Dashboard des automatisations (UI) — Note de conception (V1)

Auteur : Emilien Billy
Date : 2026-07-27
Statut : Validé

---

## 1. Résumé

SojaLink a un moteur (resolver + executor) opérationnel mais aucune interface : tout se vérifie en base ou en logs. Cette feature ajoute un dashboard en lecture seule pour consulter les règles d'automatisation, leur pipeline et l'historique des événements traités, basé sur le mockup Claude Design déjà produit.

C'est aussi la première feature qui introduit la couche `app/http` (controllers, transformers) et Tailwind/shadcn côté frontend : deux fondations à poser correctement, puisque tout ce qui suivra s'appuiera dessus.

---

## 2. Objectif V1 / Hors périmètre

Objectif : liste des règles + stats (`/dashboard`), détails d'une règle avec versions/conditions/pipeline/JSON brut/historique (`/rules/:id`), modale de détail d'un événement (tentatives, steps).

Hors périmètre : activer/désactiver, déclenchement manuel, auth, pagination, charte graphique Sojadis (mockup en gris/rouge neutre).

---

## 3. Concepts métier

- Rule : règle métier, plusieurs versions, une seule active à la fois.
- Version : contient `conditions_json` (déclenchement) et `pipeline_json` (étapes).
- Event : événement reçu, éventuellement résolu vers une version, éventuellement traité.
- Attempt : une tentative d'exécution du pipeline pour un event.
- Step log : trace d'une étape exécutée dans une attempt.

(Détail des champs : `docs/rule_resolver.md`, `docs/runtime_executor.md`.)

---

## 4. Règles métier

- priorité basse = plus prioritaire (à clarifier dans l'UI, le mockup affiche le chiffre brut) ;
- une version peut être `is_active` ou non ; à défaut de version active, prendre le `version_number` le plus élevé ;
- `applied_rule_version_id` peut être `null` (résolution en échec), afficher « — » dans ce cas plutôt qu'une erreur ;
- statuts event (pending/processing/processed/failed) et attempt (active/success/failed) ne partagent pas le vocabulaire, ne pas les confondre à l'affichage.

---

## 5. Modèle / données

Aucune migration : tout existe déjà.

```
SojalinkRule --< SojalinkRuleVersion --< SojalinkEvent --< SojalinkAttempt --< SojalinkStepLog
     |
     > SojalinkEventType (label affiché = event_type.label, pas une table codée en dur)
```

---

## 6. Architecture technique : flux Inertia / AdonisJS

```
GET /dashboard
  → app/http/controllers/dashboard_controller.ts        (index)
    → app/http/actions/dashboard/list_rules_with_stats.ts   (requête Lucid directe)
    ← modèle(s) Lucid préchargé(s)
  → app/http/transformers/rule_transformer.ts (toObject())
  → ctx.inertia.render('dashboard/index', props)
  → inertia/pages/dashboard/index.tsx

GET /rules/:id
  → app/http/controllers/rules_controller.ts             (show)
    → app/http/actions/rules/get_rule_details.ts             (requête Lucid directe)
    ← modèle(s) Lucid préchargé(s)
  → app/http/transformers/rule_transformer.ts (forShowPage())
  → ctx.inertia.render('rules/show', props)
  → inertia/pages/rules/show.tsx
```

Pas de passage par `app/application`/`app/persistence` : contrairement au moteur (resolver/executor), une lecture HTTP synchrone n'a pas de risque de concurrence à protéger, donc pas besoin de l'indirection use case + repository + objet métier. La requête Lucid (préchargements compris) vit directement dans une "action" (classe à méthode statique `handle()`) co-localisée dans `app/http/actions/`. Voir `docs/architecure-applicative.md` (section `app/http`) pour la règle générale.

Règles à respecter (cohérent avec `docs/architecure-applicative.md` et le commentaire déjà présent dans `inertia_middleware.ts` : *"Make sure you are using transformers for rich data-types like Models"*) :

- le controller ne reçoit/renvoie jamais un modèle Lucid directement à Inertia ; toujours via un transformer ;
- le transformer résout côté serveur ce qui est aujourd'hui codé en dur côté client dans le mockup (libellés, formats de date, styles de badge) ; le composant React ne fait aucun calcul métier ;
- les routes sont nommées (`.as('dashboard')`, `.as('rules.show')`) pour rester exploitables via le client Tuyau typé. Pas d'URL en dur dans les composants.
- chaque relation imbriquée composée via un transformer dédié (`RuleVersionTransformer`, `EventTransformer`, `AttemptTransformer`, `StepLogTransformer`...) plutôt que mappée à la main ; penser à `.depth(n)` quand la chaîne de composition dépasse 1 niveau (résolution des relations imbriquées limitée à 1 niveau par défaut).

Correction par rapport au mockup : le prototype Claude Design est une single-page avec un state machine client (`view: 'list' | 'detail'`) sans vraie navigation. Dans l'implémentation réelle, `/dashboard` et `/rules/:id` sont deux vraies routes Inertia : la navigation liste → détail doit passer par `<Link>`/`router.visit`, pas par un `useState` local. Ça donne des URLs partageables, le back/forward navigateur, et des payloads séparés (pas besoin de charger le détail de toutes les règles pour afficher la liste).

---

## 7. Contraintes techniques frontend

React :

- composants fonctionnels + TypeScript strict, props typées depuis la sortie du transformer ;
- le serveur est la seule source de vérité métier ; `useState` local réservé à l'état d'interface pur (toggle cartes/tableau, version sélectionnée dans le panneau, ouverture de la modale) ;
- listes clées par id métier (`rule.id`, `event.id`), jamais par index ;
- pas de `useMemo`/`useCallback` par défaut, seulement si un problème de perf réel est mesuré ;
- aucun `fetch`/`axios` côté client : toutes les données arrivent en props Inertia (cf. §6).

shadcn/ui :

- ajout de Tailwind CSS + `components.json` (CLI shadcn) ;
- les composants métier (ex : `StatTile`, `PipelineSteps`, `VersionList`...) doivent être des compositions de composants/primitives shadcn.

---

## 8. Tests attendus

- un test par action (`ListRulesWithStats`, `GetRuleDetails`, dans `app/http/actions/`), suivant le pattern déjà en place dans `tests/unit/*.spec.ts` (Japa + `dbAssertions`) : règle multi-versions, règle sans événement, event non résolu, tentative en échec.

---

## 9. Critères d'acceptation

- `/dashboard` et `/rules/:id` servent des données réelles via controller + transformer ;
- navigation liste ⇄ détail = vraies routes Inertia, pas un state client ;
- shadcn/ui posé et utilisé pour cartes/tableau/badge/dialog ;
- `npm run lint`, `npm run typecheck`, `npm test` ok.

---

## 10. Questions ouvertes

1. Charte graphique Sojadis : neutre vs vert/bleu Sojadis ?
