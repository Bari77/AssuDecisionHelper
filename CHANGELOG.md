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

## [1.4.0] - 2026-09-02

Base contrat : traçabilité des sources et référentiel PACIFICA MRH.

### Ajouté

- `data/expertise.json` passe en `schemaVersion` 2. Table `sources` : pour chaque document,
  compagnie, référence exacte des Conditions Générales, édition, URL, hôte, niveau de source
  (`officiel`, `copie_document`, `source_secondaire`, `non_lu`), date et mode de vérification.
  Une fiche, une option, un capital ou un frais s'y rattache par `sourceRef`.
- Vocabulaire de qualité déclaré dans la base (`statutsQualite`) et porté par `statut` :
  `verifie`, `deduit`, `source_secondaire`, `a_verifier`. Le formulaire affiche la pastille
  correspondante à côté de chaque poste et de la source.
- Fiches contrat : `nomContrat`, `edition`, `dateDebut`, `dateFin`, `distributeur`,
  `formules[]`, `optionsIndemnisationConnues[]`, `pointsVigilance[]`, `remarques[]`.
  Une option distingue désormais la formule commerciale (`formule`) de l'option
  d'indemnisation (`optionsIndemnisation[]`).
- Modalités d'indemnisation détaillées : `details` sur un capital (base d'évaluation, premier
  règlement, complément, plafond, versement, délai de reconstruction, justificatifs) et
  `base` / `pourcentage` / `plafond` / `minimum` / `maximum` / `conditions` / `observations`
  sur un frais. `modalite` et `limitation` restent la donnée synthétique affichée en clair,
  le reste se replie derrière « Détail contractuel ».
- Référentiel PACIFICA MRH : nouvelles fiches 7030A.30 (01/2015), 7030A.33 (01/2018),
  7030A.34 (12/2018), 7030A.35 (01/2020), 7030A.38 (12/2022), 7262A.39 (06/2024) et
  7030L.31 (01/2016, réseau LCL). Trois éditions sont relevées sur document : régimes
  Initiale / Initiale + Immo+ / Intégrale, embellissements, frais de démolition et de déblais,
  pertes indirectes, frais divers, mise en conformité, dessouchage, et points de vigilance
  (murs et dépendances de plus de 20 ans, bâtiments inoccupés, délai de 2 ans).
- Formulaire Expertise : bloc « Source contractuelle » avec lien vers le document, motif de
  résolution affiché quand la fiche ne se calcule pas, liste des points de vigilance sous les
  capitaux.
- Nouveau statut de résolution `documente` : la référence est identifiée mais aucun régime
  n'est documenté. Le formulaire affiche la référence et sa source sans inventer de capital.

### Modifié

- 7030A.29 et 7030A.37 portent les trois régimes de leur génération au lieu d'un seul.
- 7030A.29 : les embellissements passent de « Valeur de reconstruction » à « Valeur de
  remplacement », conformément aux trois éditions relevées sur document.
- La fiche héritée « INTEGRALE PNO - 7030A.38 » est conservée à l'identique et complétée de
  sa référence de Conditions Générales et de ses remarques ; la référence 7030A.38 dispose
  désormais de sa propre fiche.
- `PACIFICA` restant l'assureur, `LCL` entre au référentiel des compagnies comme distributeur
  possible.

## [1.3.0] - 2026-08-29

Formulaire Expertise : listes unifiées et tri alphabétique.

### Modifié

- Toutes les listes (nature, compagnie, type, numéro, option, civilité, qualité, type de
  bien) partagent la même bande déroulante et la même flèche à droite. Un clic sélectionne
  tout le texte pour l’écraser d’une saisie.
- Natures, compagnies et types de contrat affichés par ordre alphabétique.

## [1.2.1] - 2026-08-29

Formulaire Expertise : fiches épurées, copie des champs calculés, nouvelles formules MRH.

### Ajouté

- Fiches MRH : PACIFICA 7030A.37 INTEGRALE, 7030A.29 et 7262A.40 IMMO +, AXA 970464,
  SWISSLIFE 8132O, GMF Habitation 2012 CONFORT, THELEM NEOLOGIS2 CONFORT 405,
  BPCE BANQUE POPULAIRE BP H404 Formule premium.

### Modifié

- Formulaire Expertise : plus de type de lettre ni de « sauf si ». Le champ Contrat affiche
  le `libelle` de la fiche. Contrat / capitaux / frais à gauche ; vérification et textes à
  droite. Mentions pédagogiques retirées.
- Nature, compagnie et type de contrat : listes simples. Numéro de contrat : liste
  filtrable (bande déroulante).
- Vérification de risque : liste éditable par compagnie, chaque phrase se copie.
  La propriété `verificationRisque` des modèles par nature a été retirée.
- Dommages constatés : `modeles.*.dommages` est une chaîne (grêle : impacts et taches
  de peinture). Un clic copie tout le bloc.
- Champs bleus (contrat, capitaux, frais, causes) : icône de copie au survol, à droite.
- JSON des fiches allégé : plus d’`aliasNumero`, `aliasCompagnie`, `lettreSaufSi`, d’`id`,
  ni de `libelle` / `frais` vides.

## [1.2.0] - 2026-08-29

Formulaire d’expertise : capitaux, frais et textes de dossier calculés depuis une base JSON.

### Ajouté

- Menu **Expertise** (en-tête, à droite) ouvrant [expertise.html](expertise.html) : saisie nature /
  compagnie / type de contrat / numéro / option, puis capitaux, frais, « sauf si » et textes
  (vérification de risque, causes et circonstances, dommages constatés).
- Base [data/expertise.json](data/expertise.json) : natures, compagnies, types de contrat, fiches
  (ACM, GENERALI, PACIFICA, MAAF, AXA) et modèles de rédaction par nature. Format prévu pour
  être alimenté ensuite, sans toucher au moteur.
- [assets/expertise-moteur.js](assets/expertise-moteur.js) : résolution pure (numéro normalisé,
  option vide = régime de base, alias de compagnie).
- [tests/expertise.test.js](tests/expertise.test.js) : les six associations d’exemple, les
  inconnus, l’interpolation des textes.

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

[Non publié]: https://github.com/OWNER/AssuDecisionHelper/compare/1.3.0...HEAD
[1.3.0]: https://github.com/OWNER/AssuDecisionHelper/compare/1.2.1...1.3.0
[1.2.1]: https://github.com/OWNER/AssuDecisionHelper/compare/1.2.0...1.2.1
[1.2.0]: https://github.com/OWNER/AssuDecisionHelper/compare/1.1.0...1.2.0
[1.1.0]: https://github.com/OWNER/AssuDecisionHelper/compare/1.0.0...1.1.0
[1.0.0]: https://github.com/OWNER/AssuDecisionHelper/releases/tag/1.0.0
