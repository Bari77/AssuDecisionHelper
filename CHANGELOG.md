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

## [2.1.0] - 2026-09-02

Navigation unifiée, onglet Phrases type, modèles TEMPÊTE et CHUTE D'ARBRE, et un seul geste de
copie dans toute l'application.

### Ajouté

- Onglet **Phrases type** ([phrases.html](phrases.html)) : quatre sections de phrases bateau —
  vérification de risque, observations et conclusions, recours, instruction assistance —
  alimentées par le bloc `phrasesType` du référentiel. Chaque phrase est une carte portant un
  bouton de copie en haut à droite ; un clic sur le bouton ou sur la carte copie la phrase, et
  le bouton passe brièvement à la coche verte. Ajouter une section ou en changer l'ordre ne
  demande aucune retouche de code.
- [assets/copie.js](assets/copie.js) : cartes copiables réutilisables (presse-papiers, bascule
  d'icône, signalement d'échec). Une sélection de texte en cours n'est jamais écrasée par un
  clic sur la carte ; le bouton, lui, copie toujours et reste le seul contrôle atteignable au
  clavier.
- Modèle de rédaction **TEMPÊTE** : causes et circonstances (période du sinistre, tempête
  nommée, vitesse de vent relevée, dommages constatés alentour, exposition du bâtiment) et
  dommages constatés.
- Nature **CHUTE D'ARBRE (DEFENSE RECOURS)** et son modèle : même corps que TEMPÊTE, mais le
  texte s'arrête au bloc des dommages constatés alentour. Le paragraphe d'exposition au vent
  est écarté : « sans arbres à proximité immédiate » n'a pas de sens dans un dossier de chute
  d'arbre. Les champs du formulaire apparaissent d'eux-mêmes, sans retouche du HTML.
- Modèles : blocs conditionnels `{{#cle}}…{{/cle}}`, gardés seulement si la réponse est
  affirmative. Le paragraphe « dommages similaires alentour » s'écarte ainsi sans laisser de
  ligne vide.
- Variables calculées disponibles dans les modèles : `periode` (« Entre le 11 et le 12 février
  2026 » avec deux dates, « Le 11 février 2026 » avec une seule, sans répéter le mois ni
  l'année communs), `dateSinistre`, `typeBienArticle` et `situe`.
- Formulaire : champs « Sinistre du / au », « Nom de la tempête », « Vent max. (km/h) » et
  « Dommages alentour ». Ils portent `data-champ-modele` et n'apparaissent que si le modèle de
  la nature choisie cite leurs variables : un futur modèle fait apparaître ses champs sans
  toucher au HTML.
- `valeursParDefaut` dans le référentiel : le nom de la tempête en cours y est prérempli
  (« NILS ») plutôt que codé en dur.

### Modifié

- Navigation principale unifiée et rendue par [assets/nav.js](assets/nav.js) : les trois pages
  ne portent plus qu'un conteneur vide, ce qui rend impossible la dérive d'un menu à l'autre.
  Quatre destinations partout, toutes du même style : Assistant, Documentation, Expertise,
  Phrases type. Les trois styles de boutons concurrents (`.tab` bouton, `.tab` lien,
  `.topbar__expertise` en pastille) sont ramenés à un seul.
- Les trois contenus de consultation — Fiches conventions (IRSI · CIDECOP · CIDEPIEC), Guides
  métier, Sources — passent sous un menu déroulant « Documentation », avec un aperçu sous
  chaque entrée. Le déclencheur s'allume quand l'une de ses vues est ouverte, sinon plus rien
  dans la barre ne signalait où l'on se trouvait.
- Une vue de l'assistant reste un bouton sur index.html, pour basculer sans recharger : un lien
  aurait perdu le parcours en cours. Ailleurs, c'est un lien vers `index.html?vue=…`.
- La marque est un lien vers l'accueil sur les trois pages ; elle ne l'était pas sur l'accueil.
- Causes et circonstances : une seule grille de 10 colonnes remplace les trois grilles aux
  proportions figées. Chaque champ déclare sa largeur en HTML (`data-largeur`), donc l'adresse
  est large, la civilité étroite, et la qualité — dont les valeurs sont très longues — prend
  toute la rangée au lieu d'une moitié. Un champ masqué laisse les autres se replacer.
- Le champ de la tempête est intitulé « Nom de la tempête » et porté à 7 colonnes sur 10, soit
  516 px : la place est reprise au combo « Dommages alentour », qui n'a que « oui » et « non »
  à afficher et se contente de 3 colonnes.
- Un seul geste de copie dans toute l'application : les phrases de la page Phrases type, les
  dommages constatés du formulaire Expertise et ses champs calculés partagent le bouton de
  [assets/copie.js](assets/copie.js) — même icône, même coche verte, même durée. Les deux
  mécanismes concurrents du formulaire (blocs `.exp-copie` cliquables et bouton
  `.calcule-copy` maison) sont remplacés par celui-ci. `.calcule-copy` ne fait plus que
  positionner le bouton : il ne porte aucune propriété d'apparence, et le test le vérifie.
  Un champ sans rien à copier n'affiche pas de bouton — c'est un comportement, non un style.
- Les champs bleus du formulaire Expertise se copient d'un clic sur toute leur surface, comme
  les cartes de la page Phrases type : survol, teinte verte à la copie et coche sur le bouton.
  Une sélection de texte en cours n'est jamais écrasée, et un champ à « — » n'est pas cliquable.
  `COPIE.rendreCliquable()` porte ce geste pour les deux écrans.
- La carte « Causes et circonstances » perd sa teinte propre (bordure ambre, fond crème) et se
  présente comme les autres. Le code couleur reste porté par les champs eux-mêmes : rose pour
  ce qui se saisit, bleu pour ce qui est calculé.
- Liste des qualités : deux entrées qui nomment le bien, « propriétaire occupant d'une maison
  individuelle » et « propriétaire non occupante d'une maison individuelle de plus de 10 ans,
  donnée en location vide ». Les quatre entrées génériques précédentes (dont « locataire » et
  « syndicat des copropriétaires ») sont retirées.
- La phrase d'ouverture des modèles ne répète plus le type de bien, que la qualité porte
  désormais : `est {{qualite}}, {{situe}} au {{adresse}}`. Le champ « Type de bien » passe en
  `data-champ-modele` et disparaît donc du formulaire tant qu'aucun modèle ne cite
  `{{typeBien}}`.
- L'accord de `situe` se lit dans l'article de la qualité (« d'une » → « située »), et ne
  retombe sur `genresTypeBien` que si la qualité ne nomme pas le bien. Une qualité ajoutée à la
  main s'accorde ainsi sans déclaration supplémentaire.

### Corrigé

- Les entrées du menu « Documentation » restaient sans effet sur l'assistant. La barre est
  désormais rendue immédiatement et non au `DOMContentLoaded` : un script classique en fin de
  `body` s'exécute alors que `readyState` vaut encore « loading », si bien que la barre
  arrivait après app.js — lequel ne recense les `[data-view]` qu'une fois. Le harnais de test
  annonçait `readyState: 'complete'` et ne pouvait pas voir le défaut ; il rejoue le vrai cas.
- Le menu « Documentation » n'avait pas le même aspect d'une page à l'autre : ses entrées
  conservent la classe `.tab`, sans laquelle le bouton gardait son habillage natif sur
  l'assistant et le lien son soulignement ailleurs.
- Les champs propres à une nature se chevauchaient, en tempête comme en chute d'arbre. À
  2 colonnes sur 10, soit 137 px, un `input type="date"` n'avait plus la place de son masque
  « jj/mm/aaaa » ni de son icône et débordait sur son voisin. Ils passent sur deux rangées —
  `Sinistre du (3)`, `au (3)`, `Vent max. (4)`, puis le nom de la tempête et les dommages
  alentour — et l'échelle `data-largeur` est déclarée en entier, de 1 à 10, une valeur sans
  règle CSS faisant retomber le champ sur une seule colonne. Le test refuse une date sous
  200 px et une largeur déclarée sans règle.
- `.calcule` perd ses `!important` : la règle est déclarée après `.field__input` et l'emportait
  déjà. Ils empêchaient les classes d'état de teinter le champ à la copie.
- `.field[hidden]` : sans cette règle, `display: grid` de `.field` l'emportait sur la feuille
  du navigateur et un champ masqué restait affiché.
- Le premier jour du mois s'écrit « 1er » et non « 1 » dans les textes de dossier.
- Modèle GRÊLE : l'article et le participe s'accordent au type de bien. La phrase d'ouverture
  écrivait « d'un maison individuelle situé » dès que le bien était une maison.

### Retiré

- Carte « Vérification de risque » du formulaire Expertise, et propriété `verificationsRisque`
  du référentiel. Ces phrases sont des formules toutes faites, sans lien avec le contrat
  résolu : elles vivent désormais dans la section correspondante de l'onglet Phrases type.
  `verificationsPour()` disparaît du moteur avec sa source de données, ainsi que le renvoi
  `reprend` de `phrasesType`, qui n'existait que pour éviter de recopier ce bloc.
- Classes CSS `.topbar__expertise`, `.tabs`, `.exp-grid--2`, `.exp-grid--5`, `.exp-copie` et
  `.phrases-intro`, sans usage après la refonte de la navigation, de la grille des causes et
  de la copie.
- Ligne « Un clic sur une phrase, ou sur son bouton, la copie dans le presse-papiers. » de la
  page Phrases type : le bouton de chaque carte le dit déjà.

## [2.0.0] - 2026-09-02

Base contrat découpée par compagnie, téléchargée au besoin, avec squelettes d'attente.

### Ajouté

- Squelettes d'attente dans le formulaire Expertise : les champs et les panneaux occupent
  leur place définitive pendant le téléchargement, la mise en page ne saute plus. Animation
  désactivée sous `prefers-reduced-motion`.
- [tools/construire-index.js](tools/construire-index.js) : régénère `fichesParCompagnie` à
  partir de [data/compagnies/](data/compagnies/). `expertise.test.js` refuse un index périmé.
- Moteur : `preparer()` (référentiel + amorces de l'index), `fusionner()` (intègre un fichier
  de compagnie, remplace ses amorces, ne modifie pas la base reçue) et `fichierCompagnie()`.
- Nouveau statut de résolution `chargement` : la fiche est à l'index mais son fichier n'est
  pas arrivé. Le formulaire montre des squelettes au lieu d'un « numéro non référencé »
  mensonger.
- Héritage dans les fichiers de compagnie, pour qu'ils restent tenables à la main : une fiche
  ne répète jamais ce que son parent dit déjà. `compagnie` vient de l'en-tête du fichier ;
  `statut` et `sourceRef` descendent de la fiche vers ses options puis vers chaque poste ;
  `libelle`, s'il n'est pas écrit, vaut « compagnie - type - numéro ». Un champ écrit
  l'emporte toujours. `completerPaquet()` applique ces règles ; la résolution ne voit que des
  fiches complètes.
- `typeContrat` et `nomContrat` sont volontairement exclus de cet héritage et se déclarent sur
  chaque fiche : ils décrivent le produit et non l'assureur, et un même fichier portera à
  terme une MRH et une MRP. En en-tête, ils donneraient une fiche MRP nommée « Assurance
  Habitation » et résolue en MRH, sans avertissement ; oubliés sur une fiche, ils font
  échouer le test. Celui-ci refuse aussi qu'on les remonte en en-tête.

### Modifié

- `data/expertise.json` passe en `schemaVersion` 3 et ne porte plus les fiches contrat : il
  reste le référentiel commun (listes, vérifications de risque, modèles, vocabulaire de
  qualité) et gagne `fichesParCompagnie`, l'index des fiches. Il tombe de 60 à 8 ko.
- Les fiches vivent dans [data/compagnies/](data/compagnies/), un fichier par compagnie
  (`{ compagnie, sources, contrats }`). Le formulaire télécharge le référentiel au démarrage,
  puis le fichier d'une compagnie au moment où elle est choisie — ou dès qu'un numéro saisi
  la désigne. Un fichier déjà obtenu n'est pas redemandé ; deux demandes simultanées ne font
  qu'une requête.
- L'index ne porte que les clés de recherche : tous les numéros de toutes les compagnies
  restent proposés, et la compagnie d'un numéro saisi reste devinée, sans rien télécharger.
- Échec de téléchargement d'une compagnie : message nommant la compagnie, retour à « — » et
  aucune nouvelle tentative. Les autres compagnies restent utilisables.
- Les fichiers de compagnie sont allégés de tout ce que leur parent dit déjà : 20 `compagnie`,
  140 `statut`, 3 `sourceRef`, 10 `libelle` calculables et 22 dates à `null` retirés.
  `expertise.test.js` refuse désormais ces répétitions, pour qu'elles ne reviennent pas par
  petites touches.
- La fiche MAAF héritée « TEMPO Habitation HA2 004/09/14 » est conservée et documentée : cette
  référence ne correspond pas au format des Conditions Générales MAAF, qui sont numériques.
  Sa modalité « VAN 25 % » correspond à la formule Classique de la génération relevée, mais
  aucun document de 2014 n'a pu être consulté : la fiche reste en `a_verifier`.
- Libellés de contrat : `PACIFICA - MRH - 7030A.37` et `PACIFICA - MRH - 7262A.40` remplacent
  « … 7030A.37 INTEGRALE » et « … 7262A.40 IMMO + ». Ces fiches portent maintenant plusieurs
  régimes : nommer une seule formule dans le libellé du contrat était trompeur. L'espace
  manquant de « PACIFICA - MRH -7030A.29 » disparaît au passage.
- La pipeline contrôle la syntaxe de tous les fichiers de `data/` et de `tools/`.

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
- Référentiel MAAF : 5 nouvelles fiches relevées sur document, dont 4 sur des Conditions
  Générales téléchargées depuis maaf.fr. Tempo Habitation 2339 en éditions 03/26 (formules
  Eco / Essentielle / Confort / Confort +) et 01/21 (Initiale / Classique / Intégrale),
  Tempo Habitation DROM 3845 (01/23), Tempo Habitation en construction 2340 (01/26) et
  Tempo Jeunes 11001 (05/26). Régimes bâtiment, dépendances et mobilier, frais annexes, frais
  SPS et permis, remise aux normes, perte d'usage, prêt immobilier, perte pécuniaire de
  copropriétaire, interruption de production d'électricité, et points de vigilance
  (plafond de valeur vénale, franchise incendie liée au ramonage, hivernage de piscine).
- Motif de résolution distinct lorsqu'une référence n'a pas de régime par défaut : « Préciser
  la formule souscrite » au lieu de « Option non référencée », qui laissait croire à une
  erreur de saisie.
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

[2.1.0]: https://github.com/OWNER/AssuDecisionHelper/compare/2.0.0...2.1.0
[2.0.0]: https://github.com/OWNER/AssuDecisionHelper/compare/1.4.0...2.0.0
[1.4.0]: https://github.com/OWNER/AssuDecisionHelper/compare/1.3.0...1.4.0
[1.3.0]: https://github.com/OWNER/AssuDecisionHelper/compare/1.2.1...1.3.0
[1.2.1]: https://github.com/OWNER/AssuDecisionHelper/compare/1.2.0...1.2.1
[1.2.0]: https://github.com/OWNER/AssuDecisionHelper/compare/1.1.0...1.2.0
[1.1.0]: https://github.com/OWNER/AssuDecisionHelper/compare/1.0.0...1.1.0
[1.0.0]: https://github.com/OWNER/AssuDecisionHelper/releases/tag/1.0.0
