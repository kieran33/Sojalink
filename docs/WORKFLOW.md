# Workflow de développement

Ce document décrit le cycle de travail commun : de la création d'une issue jusqu'au merge de la Pull Request. Objectif : qu'une PR reste facile à suivre et à relire, même pour quelqu'un qui n'a pas suivi son développement au jour le jour.

## 1. Convention de nommage des branches

`<type>/<numéro-issue>-<slug-court>`

Exemples : `feat/42-dashboard-filters`, `fix/57-sidebar-crash`, `chore/61-update-deps`

Types (alignés sur les Conventional Commits) : `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`.

La branche est toujours rattachée à un numéro d'issue : ça permet de retrouver le contexte (besoin, critères d'acceptation) en un clic depuis n'importe quel commit ou PR.

## 2. Convention de commit

Conventional Commits obligatoire : `<type>(<scope optionnel>): <description>`

Exemples : `feat(runtime): add executor retry policy`, `fix(handlers): correct payload validation`

Les commits individuels n'ont pas besoin d'être parfaits — l'historique est nettoyé au merge (squash, voir plus bas) — mais chaque commit doit rester compréhensible isolément.

## 3. Note de conception (optionnelle)

Pour la majorité des features, l'issue (Objectif / Scope / Critères d'acceptation) suffit. Pour les changements plus conséquents, rédiger une courte note de conception **avant** de démarrer le développement, à partager avec l'équipe pour valider l'approche — utile à tout le monde, pas seulement pour caler un dev qui découvre le sujet.

**Quand la rédiger** (au moins un des critères suivants) :
- Le changement touche plusieurs composants (plusieurs modules, front + back + DB…)
- Le changement modifie un schéma de base de données existant
- Plusieurs approches sont possibles et le choix a un impact durable (perf, maintenabilité, sécurité)
- L'issue a été découpée en plusieurs sous-issues

**Contenu attendu** (reste court, ce n'est pas un document exhaustif) :
- Problème à résoudre / contexte
- Approche retenue et alternatives envisagées (rapidement)
- Impacts (DB, API, composants existants)
- Points ouverts / risques

**Où et comment** :
- Fichier markdown dans `docs/specs/AAAA-MM-JJ-slug.md`
- Lien vers la note ajouté dans l'issue correspondante
- Relecture rapide par l'équipe avant de démarrer le développement (pas un processus d'approbation formel)

## 4. Cycle de travail

1. **Créer l'issue** avec le template adapté (Feature ou Bug), en respectant la Definition of Ready avant de démarrer le développement (besoin clair, scope délimité, pas de question bloquante). Si le travail est gros, le découper en sous-issues. Si l'un des critères de la section 3 est rempli, rédiger la note de conception et la faire relire avant de continuer.
2. **Assigner l'issue** et la déplacer dans la colonne "In Progress" du Project.
3. **Créer la branche** depuis `main`, nommée selon la convention ci-dessus.
4. **Ouvrir la PR en Draft dès le premier commit poussé**, ciblant `main` et liée à l'issue (`Closes #42` dans la description). Pas besoin d'attendre d'avoir terminé : ouvrir la PR tôt permet à la personne qui review de suivre l'avancement au fil de l'eau, de commenter en cours de route, et de ne jamais avoir à découvrir un gros diff d'un coup.
5. **Compléter la description de la PR progressivement**, pas uniquement à la fin (Description, Changements apportés, Comment tester).
6. **Committer souvent**, par unité logique, avec des messages clairs.
7. **Passer la PR en "Ready for review"** seulement quand la checklist du template (Definition of Done) est respectée : self-review faite, tests ajoutés/passants, doc à jour, taille raisonnable.
8. **Review** : la personne qui review s'appuie sur la description de la PR et l'issue liée pour le contexte, puis relit le diff final — elle n'a pas besoin de reconstituer l'historique commit par commit.
9. **Merge** : recommandé en squash & merge, pour garder un historique `main` propre (un commit = une PR) et fermer l'issue automatiquement via `Closes #`.

## 5. Taille des PR

Viser des PR courtes : indicativement moins de ~400 lignes changées (hors fichiers générés / lock files). Une feature plus grosse doit être découpée en plusieurs issues/PR séquentielles plutôt que livrée d'un bloc.

## 6. Definition of Ready / Definition of Done

**Definition of Ready (issue)** — avant de démarrer le dev :
- Besoin et critères d'acceptation clairs
- Scope (inclus / exclus) délimité
- Pas de question bloquante en suspens

**Definition of Done (PR)** — avant de passer en Ready for review :
- Conventions du projet respectées
- Self-review faite
- Tests ajoutés/mis à jour et passants en local
- Documentation mise à jour si nécessaire
- Taille de PR raisonnable

## 7. Board GitHub Projects

Colonnes suggérées : `Backlog` → `Ready` → `In Progress` → `In Review` → `Done`, avec les automatisations natives GitHub Projects (déplacement automatique à l'ouverture / au merge de la PR liée).

## Pour aller plus loin

- Centraliser ces fichiers dans un repo `sojadis-equipement/.github` pour qu'ils s'appliquent par défaut à tout nouveau repo de l'org.
- Activer la protection de branche (`main`) avec review obligatoire, une fois ce workflow stabilisé.
