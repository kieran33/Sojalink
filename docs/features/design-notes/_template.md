# Feature: [Nom de la feature]

Date : [YYYY-MM-DD]  
Auteur(s) : [Nom(s)]  
Statut : Brouillon / À valider / Validé / En développement / Livré

---

## 1. Résumé

Décrire la feature en 5 à 10 lignes maximum.

Cette section doit répondre simplement à :

- quel problème on résout ;
- pour qui ;
- ce que la V1 doit permettre ;
- ce que la V1 ne cherche pas encore à faire.

---

## 2. Objectif V1

La V1 doit permettre de :

- [objectif concret 1]
- [objectif concret 2]
- [objectif concret 3]

La feature sera considérée utilisable lorsque :

- [condition minimale 1]
- [condition minimale 2]
- [condition minimale 3]

---

## 3. Hors périmètre

La V1 ne couvre pas :

- [élément explicitement exclu]
- [élément explicitement exclu]
- [élément explicitement exclu]

Ces exclusions évitent de mélanger le besoin actuel avec des évolutions futures.

---

## 4. Cas d’utilisation principaux

### Cas 1 — [Nom du cas]

En tant que [type d’utilisateur], je veux [action], afin de [bénéfice].

Parcours nominal :

1. [étape 1]
2. [étape 2]
3. [étape 3]

Résultat attendu :

- [résultat visible ou mesurable]

### Cas 2 — [Nom du cas]

En tant que [type d’utilisateur], je veux [action], afin de [bénéfice].

Parcours nominal :

1. [étape 1]
2. [étape 2]
3. [étape 3]

Résultat attendu :

- [résultat visible ou mesurable]

---

## 5. Règles métier

- [règle métier 1]
- [règle métier 2]
- [règle métier 3]
- [règle métier 4]
- [règle métier 5]

Limiter cette section aux règles importantes qui changeraient le comportement attendu si elles étaient mal comprises.

---

## 6. Modèle / données

### Entités concernées

- `[EntityA]`
- `[EntityB]`
- `[EntityC]`

### Relations importantes

- `[EntityA]` possède plusieurs `[EntityB]`
- `[EntityA]` peut être liée à zéro, une ou plusieurs `[EntityC]`
- `[EntityB]` appartient à `[EntityA]`

### Champs principaux

Sur `[EntityA]` :

- `id`
- `created_at`
- `updated_at`
- `[champ métier]`
- `[champ métier]`

Ne pas chercher à documenter tous les champs si le modèle n’est pas encore figé. Le but est de poser la structure.

---

## 7. Permissions / accès

### Qui peut voir ?

- [règle de visibilité 1]
- [règle de visibilité 2]

### Qui peut créer ?

- [règle de création]

### Qui peut modifier ?

- [règle de modification]

### Qui peut supprimer ?

- [règle de suppression]

Si ce n’est pas encore décidé, mettre une proposition V1 plutôt qu’une question ouverte vague.

---

## 8. Comportement attendu

### Création

- [règle]
- [validation]
- [effet attendu]

### Modification

- [règle]
- [validation]
- [effet attendu]

### Suppression

- [règle]
- [effet attendu]

### Cas limites

- Si [situation], alors [comportement].
- Si [situation], alors [comportement].

---

## 9. Interface / UX

Écrans ou composants concernés :

- `[Page ou composant 1]`
- `[Page ou composant 2]`
- `[Page ou composant 3]`

Actions nécessaires :

- [action utilisateur]
- [action utilisateur]
- [action utilisateur]

États à prévoir :

- chargement ;
- vide ;
- erreur ;
- succès ;
- cas sans permission ;
- cas avec données partielles.

---

## 10. Technique

### Backend

À prévoir :

- [route / controller / action]
- [service métier]
- [validation]
- [policy / permission]
- [tests]

### Frontend

À prévoir :

- [page]
- [composant]
- [formulaire]
- [appel API / action Inertia]
- [état UI]

### Migrations

- [table à créer]
- [table à modifier]
- [index ou contrainte importante]

---

## 11. Critères d’acceptation

La feature est terminée lorsque :

- [critère testable 1]
- [critère testable 2]
- [critère testable 3]
- [critère testable 4]
- [critère testable 5]

Chaque critère doit pouvoir être validé manuellement ou par test.

---

## 12. Découpage développement

La feature peut être découpée en plusieurs chantiers principaux :

1. [Issue 1]
2. [Issue 2]
3. [Issue 3]
4. [Issue 4]
5. [Issue 5]

Chaque issue devra contenir :

- objectif ;
- détails techniques ;
- critères d’acceptation ;
- tests attendus si nécessaire.

---

## 13. Décisions prises

- [décision structurante 1]
- [décision structurante 2]
- [décision structurante 3]

Ces décisions ne doivent pas être rediscutées dans chaque issue, sauf changement explicite.

---

## 14. Questions ouvertes

- [question à trancher 1]
  - Proposition : [choix recommandé]
- [question à trancher 2]
  - Proposition : [choix recommandé]

Limiter cette section à 3-5 questions maximum.