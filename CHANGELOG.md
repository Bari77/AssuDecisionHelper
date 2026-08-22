# Changelog

Toutes les évolutions notables d'ADH (AssuDecisionHelper) sont consignées ici.

Le format suit [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/) et le
versionnage suit [Semantic Versioning](https://semver.org/lang/fr/).

Le numéro de version est déclaré dans [assets/version.js](assets/version.js). La pipeline de
publication refuse un tag qui ne correspond pas à cette valeur ou qui n'a pas d'entrée ci-dessous.

Portée des incréments, appliquée à la base de connaissance autant qu'au code :

- **MAJEUR** — une qualification produite par une version antérieure change de conclusion
  (bascule de convention, changement d'assureur gestionnaire, nouvelle branche d'arbre).
- **MINEUR** — nouveau critère, nouvelle source, enrichissement d'une fiche sans effet sur les
  conclusions existantes.
- **CORRECTIF** — libellés, ergonomie, corrections sans incidence sur le raisonnement.

## [Non publié]

## [1.1.0] - 2026-08-22

Outil d'aide aux nouveaux experts : textes prêts à coller dans le dossier, guides de chiffrage
et de qualification immobilier / embellissements. Aucune conclusion de l'arbre n'est modifiée.

### Ajouté

- Textes à coller générés à l'issue de l'analyse, un bloc par onglet usuel du logiciel
  (qualification, gestionnaire / répartition, dommages, assiette de chiffrage, conduite,
  observations, conclusions). Les crochets signalent ce que le constat ou le contrat doivent
  encore préciser.
- Personnalisation facultative des textes (référence, assuré, compagnie mandante, type de
  contrat, franchise, montant, cause) — les mentions restent dans le navigateur.
- Onglet « Guides métier » : assiette des seuils IRSI, tableau immobilier / embellissements /
  mobilier, causes d'exclusion, ce que le contrat tranche, pièges du premier dossier.
- Saisie d'une estimation hors taxes sur le critère de montant : la tranche IRSI se calcule
  toute seule (`trancheIrsi`), 1 600 € HT inclus restant en tranche 1.
- Accueil pédagogique pour un premier dossier, masqué dès qu'un critère est tranché.
- [tests/textes.test.js](tests/textes.test.js) : parcours exhaustif des blocs générés, injection
  des mentions de dossier, complétude des guides.

### Modifié

- Libellé de la tranche 2 IRSI : « au-delà de 1 600 € HT et jusqu'à 5 000 € HT », pour lever
  le chevauchement de lecture avec la tranche 1.
- Aides des critères montant, nature des dommages et adhésion, orientées expert novice.

### Corrigé

- Le retour arrière (`←`, `Retour arrière`, « Question précédente », « Modifier le dernier
  critère ») restait sans effet depuis une question : l'étape visée était la question affichée,
  dépourvue de réponse, que l'arbre reposait donc à l'identique. C'est désormais le dernier
  critère *tranché* qui est défait.
- La zone principale n'avait aucun retrait vertical : la règle `main { padding }` était écrasée
  par la classe `.wrap` portée par le même élément, de spécificité supérieure. Les sections
  touchaient l'en-tête et le pied de page.

Les corrections de navigation ci-dessus s'accompagnent de l'extraction de la machine à états
dans [assets/parcours.js](assets/parcours.js) et de [tests/parcours.test.js](tests/parcours.test.js).

## [1.0.0] - 2026-08-04

Version initiale.

### Ajouté

- Arbre de décision couvrant IRSI (tranches 1 et 2), CIDECOP, CIDEPIEC et le repli en droit
  commun, sur sept critères au maximum : nature du bien, péril, cause exclue du champ IRSI,
  montant hors taxes par local sinistré, situation du local sinistré, nature des dommages,
  adhésion des assureurs aux conventions.
- Désignation de l'assureur gestionnaire en branche IRSI, répartition parties immobilières /
  embellissements en branches CIDECOP et CIDEPIEC.
- Restitution par conclusion : motif de la qualification, conduite du dossier, points de
  vigilance, mécanisme conventionnel.
- Onglet « Fiches conventions » avec comparatif tabulaire des trois conventions.
- Onglet « Sources » : textes conventionnels, sources institutionnelles, cadre juridique
  Légifrance, sources professionnelles, et réserves méthodologiques explicites sur les points
  que les sources consultées ne permettent pas de trancher.
- Parcours encodé dans le fragment d'URL, ce qui rend un cas d'espèce partageable par simple
  copie du lien. Accès direct aux onglets par `?vue=fiches` et `?vue=sources`.
- Synthèse textuelle copiable et feuille de style d'impression réduite au parcours et à la
  conclusion.
- Navigation clavier complète : touches `1` à `4`, `←` pour revenir sur un critère.
- Conteneur nginx non privilégié et pipeline GitHub Actions publiant l'image sur un tag `x.y.z`
  poussé sur `main`.

### Réserves connues

- Le seuil d'application CIDEPIEC de 320 € en principal ne repose que sur une source
  professionnelle unique.
- Aucun texte intégral public de CIDEPIEC n'a été identifié : son périmètre est reconstitué à
  partir de sources professionnelles concordantes.
- L'articulation retenue fait basculer les dégâts des eaux vers CIDECOP au-delà de 5 000 € HT
  par local sinistré, conformément au régime postérieur à l'entrée en vigueur d'IRSI.

Le détail de ces réserves est affiché dans l'onglet « Sources » du site.

[Non publié]: https://github.com/OWNER/AssuDecisionHelper/compare/1.1.0...HEAD
[1.1.0]: https://github.com/OWNER/AssuDecisionHelper/compare/1.0.0...1.1.0
[1.0.0]: https://github.com/OWNER/AssuDecisionHelper/releases/tag/1.0.0
