# ADH — AssuDecisionHelper

Outil d'aide à la décision destiné aux experts et gestionnaires sinistres, en particulier aux
nouveaux experts : un arbre de questions détermine quelle convention d'indemnisation entre
assureurs s'applique à un sinistre survenu dans un immeuble collectif — **IRSI**, **CIDECOP**,
**CIDEPIEC** ou repli en droit commun — désigne l'assureur gestionnaire ou la répartition de
charge, restitue la conduite du dossier, et produit des **textes prêts à coller** dans les
onglets du logiciel d'expertise.

Version courante : voir [assets/version.js](assets/version.js) et [CHANGELOG.md](CHANGELOG.md).

## Utilisation

Site statique, sans dépendance ni build. Ouvrir [index.html](index.html) dans un
navigateur, ou le servir depuis n'importe quel hébergement statique.

- Réponse au clavier : touches `1` à `4`, `←` ou `Retour arrière` pour revenir.
- Le récapitulatif latéral reste cliquable : chaque critère peut être repris en cours d'analyse.
- « Copier la synthèse » produit un texte prêt à coller dans un rapport ou une note de gestion.
- À l'issue de l'analyse, chaque onglet usuel du dossier (qualification, gestionnaire,
  dommages, assiette, conduite, observations, conclusions) a son propre bouton Copier.
  Les crochets `[ainsi]` restent à compléter après la visite ; les mentions de dossier
  (assuré, compagnie, franchise, cause…) sont facultatives et ne quittent pas le navigateur.
- Sur le critère de montant, une estimation en euros HT calcule la tranche IRSI.
- L'onglet « Guides métier » rappelle l'assiette des seuils, la frontière immobilier /
  embellissements, et ce que le contrat tranche (franchise, vétusté, plafonds).
- « Imprimer » ne conserve que le parcours et la conclusion.
- Le parcours est reflété dans l'URL : copier le lien partage le cas d'espèce à l'identique
  (`…/index.html#immeuble=copropriete&evenement=dde&causeExclue=non&montant=t2&…`).
- Le menu **Expertise** (en-tête, à droite) ouvre le formulaire de dossier : capitaux et textes
  calculés d’après [data/expertise.json](data/expertise.json) et les fiches de
  [data/compagnies/](data/compagnies/). Pour ajouter une formule, recopier une entrée de
  `contrats` dans le fichier de la compagnie (compagnie, type, numéro, option → capitaux /
  frais), puis relancer `node tools/construire-index.js`.
- Le formulaire ne télécharge que ce dont il a besoin : le référentiel au démarrage, puis le
  fichier d’une compagnie au moment où elle est choisie. Des squelettes occupent la place du
  contenu pendant l’attente.

## Structure

| Fichier | Rôle |
| --- | --- |
| [index.html](index.html) | Structure de la page, comparatif des conventions |
| [expertise.html](expertise.html) | Formulaire d’expertise (capitaux, frais, textes) |
| [phrases.html](phrases.html) | **Phrases type** de dossier, copiables au clic |
| [assets/phrases.js](assets/phrases.js) | Rendu de la page Phrases type |
| [assets/nav.js](assets/nav.js) | **Navigation principale**, rendue à l’identique sur les trois pages |
| [assets/copie.js](assets/copie.js) | Cartes copiables : bouton, presse-papiers, coche de confirmation |
| [data/expertise.json](data/expertise.json) | **Référentiel** : natures, compagnies, modèles de rédaction, index des fiches |
| [data/compagnies/](data/compagnies/) | **Fiches contrat**, un fichier par compagnie, téléchargé au besoin |
| [tools/construire-index.js](tools/construire-index.js) | Régénère l’index des fiches dans le référentiel |
| [assets/expertise-moteur.js](assets/expertise-moteur.js) | Résolution des fiches (sans DOM) |
| [assets/expertise.js](assets/expertise.js) | Interface du formulaire |
| [assets/version.js](assets/version.js) | **Version applicative** — source de vérité unique |
| [assets/rules.js](assets/rules.js) | **Base de connaissance** : seuils, fiches, questions, moteur de décision |
| [assets/textes.js](assets/textes.js) | **Textes à coller** dans les onglets du dossier, à partir de la conclusion |
| [assets/guides.js](assets/guides.js) | **Guides métier** : assiette, immobilier / embellissements, pièges du novice |
| [assets/sources.js](assets/sources.js) | **Bibliographie** : documents de référence et réserves méthodologiques |
| [assets/parcours.js](assets/parcours.js) | Machine à états de la navigation, sans DOM |
| [assets/app.js](assets/app.js) | Interface : rendu, raccourcis clavier, onglets |
| [assets/styles.css](assets/styles.css) | Feuille de style |
| [tests/tree.test.js](tests/tree.test.js) | Validation exhaustive de l'arbre de décision |
| [tests/parcours.test.js](tests/parcours.test.js) | Invariants de navigation |
| [tests/textes.test.js](tests/textes.test.js) | Textes générés et complétude des guides |
| [tests/expertise.test.js](tests/expertise.test.js) | Fiches contrat JSON et interpolation |
| [Dockerfile](Dockerfile) · [nginx.conf](nginx.conf) · [docker-compose.yml](docker-compose.yml) | Hébergement |
| [.github/workflows/release.yml](.github/workflows/release.yml) | Publication de l'image sur tag |

## Sources

L'onglet « Sources » du site liste les documents sur lesquels reposent les règles codées, en
quatre familles — textes conventionnels, sources institutionnelles, cadre juridique Légifrance,
sources professionnelles — et affiche explicitement **les points que ces sources ne permettent
pas de trancher**. Ce bloc de réserves n'est pas décoratif : il signale où l'outil s'avance
au-delà de ce qui est établi, notamment le seuil d'application CIDEPIEC et l'absence de texte
intégral public pour cette convention.

Les conventions d'indemnisation ne sont pas publiées au Journal officiel. Avant de fonder une
position de gestion sur cet outil, contrôler le millésime de la convention auprès de France
Assureurs ou du service technique de la compagnie concernée.

## Faire évoluer les règles

Le métier est isolé dans [assets/rules.js](assets/rules.js) et
[assets/sources.js](assets/sources.js) — aucun autre fichier n'a besoin d'être touché lors
d'une évolution conventionnelle. Les libellés à coller dans le dossier vivent à part, dans
[assets/textes.js](assets/textes.js) ; les fiches pédagogiques dans
[assets/guides.js](assets/guides.js).

- `SEUILS` — montants pivots (tranches IRSI, plafond IRSI, seuil CIDEPIEC).
- `trancheIrsi(montant)` — calcule `t1` / `t2` / `hors` pour un montant HT d'un local.
- `CONVENTIONS` — fiches affichées dans le résultat et dans l'onglet de référence.
- `QUESTIONS` — intitulés, aides et options de chaque critère.
- `flow(reponses)` — moteur : renvoie soit la question suivante, soit le résultat calculé
  depuis l'état complet des réponses. Les critères transversaux (nature des dommages,
  adhésion des assureurs) sont mutualisés entre branches dans `branchesCopropriete`.
- `SOURCES` / `RESERVES` — bibliographie et réserves affichées dans l'onglet « Sources ».

Ajouter un critère revient à déclarer une entrée dans `QUESTIONS`, un libellé court dans
`TRAIL_LABELS` ([assets/app.js](assets/app.js)) et un aiguillage dans `flow`.

### Tests

```sh
node tests/tree.test.js       # arbre de décision
node tests/parcours.test.js   # navigation
node tests/textes.test.js     # textes à coller et guides
node tests/expertise.test.js  # fiches contrat JSON
```

**`tree.test.js`** — le moteur étant une fonction pure de l'état des réponses, le test énumère
**tous** les parcours possibles (120 à ce jour, profondeur maximale 7 critères) et vérifie que
chacun converge, qu'aucune question n'est reposée, qu'aucune n'est inatteignable, que chaque
conclusion est complète (motif, conduite du dossier, gestionnaire en branche IRSI, répartition
en branche copropriété) et qu'aucun libellé n'est mal interpolé. Il contrôle aussi que chaque
source déclarée porte une URL HTTPS ou un marqueur d'absence explicite, et qu'aucun bloc de
fiche n'est masqué par une section calculée de même titre.

**`parcours.test.js`** — 32 assertions sur les invariants de navigation : retour arrière depuis
une question, depuis une conclusion et depuis le premier critère, convergence du retour pas à
pas vers l'état vierge, invalidation de la suite du parcours quand un critère amont change, et
rejeu d'URL (valeurs inventées, clés inconnues, réponses incomplètes). Le test exerce
[assets/parcours.js](assets/parcours.js) directement — d'où l'extraction de la machine à états
hors du rendu : une logique enfermée dans une closure DOM n'est pas vérifiable.

**`textes.test.js`** — pour chaque parcours, les blocs à coller sont complets (qualification,
gestion, dommages, assiette, observations, conclusions), sans interpolation cassée, avec
gestionnaire en IRSI et répartition en CIDECOP/CIDEPIEC. Contrôle aussi l'injection des mentions
de dossier et la complétude des guides métier.

**`expertise.test.js`** — chaque fiche de [data/expertise.json](data/expertise.json) est
rattachée au référentiel (compagnie, type). Les associations d’exemple (ACM, GENERALI,
PACIFICA, MAAF, AXA) produisent le libellé et la modalité de bâtiment attendus. L’option vide
ne déclenche pas une option nommée (IMMO+). Les modèles interpolent civilité, nom et date.
Côté traçabilité : chaque `sourceRef` pointe vers une entrée de `sources` complète, tout
`statut` appartient au vocabulaire déclaré, une donnée `verifie` est rattachable à un
document, et chaque référence PACIFICA attendue résout vers sa propre fiche.
Côté découpage : le test fusionne tous les fichiers de [data/compagnies/](data/compagnies/),
vérifie que `fichesParCompagnie` les reflète exactement, qu’une fiche non téléchargée reste
proposée et se résout en `chargement`, et que la fusion remplace l’amorce sans doublon.

La pipeline exécute les quatre tests avant toute publication.

### Où vivent les données

[data/expertise.json](data/expertise.json) est le **référentiel commun** : listes, vérifications
de risque, modèles de rédaction, vocabulaire de qualité, et `fichesParCompagnie` — l’index des
fiches. Les **fiches contrat** vivent dans [data/compagnies/](data/compagnies/), un fichier par
compagnie :

```
data/expertise.json              référentiel + index          ~8 ko
data/compagnies/pacifica.json    { compagnie, sources, contrats }
data/compagnies/acm.json         idem
```

Le formulaire télécharge le référentiel au démarrage, puis le fichier d’une compagnie au moment
où elle est choisie — ou dès qu’un numéro saisi la désigne. Un fichier déjà obtenu n’est pas
redemandé, et deux demandes simultanées ne déclenchent qu’une requête.

L’index ne porte que les clés de recherche (`typeContrat`, `numero`) : il suffit à proposer tous
les numéros de toutes les compagnies et à deviner la compagnie d’un numéro saisi, sans rien
télécharger. Tant que le fichier n’est pas arrivé, ces fiches sont des **amorces** (`differe`) et
la résolution répond `chargement` — jamais « numéro non référencé ».

**Après toute modification d’un fichier de compagnie**, régénérer l’index :

```bash
node tools/construire-index.js
```

`expertise.test.js` refuse un index périmé. Un tableau `contrats` peut aussi rester dans le
référentiel : il est fusionné avec les fiches téléchargées.

### Ne jamais répéter ce que le parent dit déjà

**Un champ absent est repris du parent** — mais seulement là où le parent ne peut pas se
tromper. C’est la règle qui rend les fichiers tenables à la main, et le test refuse toute
répétition inutile.

| Champ | Vient de | Écrit plus bas seulement si… |
| --- | --- | --- |
| `compagnie` | l’en-tête du fichier | jamais : le fichier *est* la compagnie |
| `statut` | la fiche → l’option → le poste | la qualité de cette donnée diffère de son parent |
| `sourceRef` | la fiche → l’option | cette option vient d’un autre document |
| `libelle` | calculé `compagnie - type - numéro` | le libellé attendu n’est pas celui-là |

**`typeContrat` et `nomContrat` ne s’héritent pas** et se déclarent sur chaque fiche. Ils
décrivent le produit, pas l’assureur : un même fichier finira par porter une MRH et une MRP.
En en-tête, ils deviendraient un défaut muet — une fiche MRP nommée « Assurance Habitation »
et résolue en MRH, sans un mot. Un champ oublié, lui, fait échouer le test :

```
compagnies/thelem.json : la fiche NEOLOGIS2 CONFORT 405 doit déclarer son typeContrat
compagnies/thelem.json : « typeContrat » se déclare sur chaque fiche, jamais en en-tête
```

Une date à `null` ne s’écrit pas : l’absence du champ dit déjà « inconnu ».

Un fichier complet tient donc en vingt lignes :

```json
{
  "compagnie": "THELEM",
  "contrats": [
    {
      "typeContrat": "MRH",
      "numero": "NEOLOGIS2 CONFORT 405",
      "options": [
        {
          "capitaux": [
            { "nature": "Batiment", "capital": "Valeur de reconstruction", "modalite": "VAN 25 %" }
          ]
        }
      ]
    }
  ]
}
```

### Alimenter une fiche contrat

Recopier une entrée de `contrats` dans le fichier de la compagnie
(`data/compagnies/<compagnie>.json`) :

- `typeContrat` / `numero` — clés de recherche, avec `compagnie` héritée de l’en-tête.
- `options[]` — sans `libelle` : régime de base. Avec `libelle`
  (« Valeur à neuf », « OPTION IMMO+ ») : régime nommé. `frais` seulement s’il y en a.
- `natures` — optionnel : si absent, la fiche vaut pour tous les sinistres.

`numero` et un `options[]` porteur de `capitaux` suffisent : tout le reste est facultatif et
les fiches qui n’en portent rien fonctionnent à l’identique.

### Tracer une fiche contrat

Une référence de Conditions Générales est une **version contractuelle distincte** :
7030A.29 ≠ 7030A.37 ≠ 7262A.40. Une fiche n’est jamais remplacée par une édition plus récente.

Champs facultatifs, tous nourris par un document identifié :

- **Fiche** — `nomContrat`, `edition` (`MM/AAAA`), `dateDebut` / `dateFin`, `distributeur`,
  `referenceCG` quand `numero` porte aussi une formule, `formules[]` et
  `optionsIndemnisationConnues[]` (noms documentés, sans régime associé),
  `pointsVigilance[]` (`{ texte, statut, page }`, affichés sous les capitaux), `remarques[]`.
- **Option** — `formule` et `optionsIndemnisation[]` séparent la formule commerciale
  (Initiale, Intégrale, EKO, OPTIMALE…) de l’option d’indemnisation (Immo +, Équipement +).
  Une même référence peut ainsi porter plusieurs régimes.
- **Capital** — `details` (`base`, `premierReglement`, `complement`, `plafond`, `versement`,
  `delaiReconstruction`, `conditions`, `surJustificatifs`), replié derrière « Détail
  contractuel ». `modalite` reste la donnée synthétique affichée en clair.
- **Frais** — `base`, `pourcentage`, `plafond`, `minimum`, `maximum`, `conditions`,
  `observations`. `pourcentage` n’est renseigné que s’il figure déjà dans `limitation` :
  le test le vérifie.

**Qualité de la donnée** — `statut`, avec le vocabulaire déclaré dans `statutsQualite` :
`verifie` (relevé sur le document), `deduit` (repris par analogie avec une édition voisine
vérifiée), `source_secondaire`, `a_verifier`. Il s’écrit **une fois sur la fiche** et descend
jusqu’à chaque poste ; on ne le réécrit que sur l’option ou le poste dont la qualité diffère.
Une valeur douteuse reste absente ou passe en `a_verifier` — jamais affirmée.

**Un millésime, une fiche** — une même référence de Conditions Générales peut changer de
nomenclature d’une édition à l’autre : MAAF 2339 porte les formules Initiale / Classique /
Intégrale en 01/21 et Eco / Essentielle / Confort / Confort + en 03/26. Chaque édition est donc
une fiche distincte, dont le `numero` porte le millésime (`2339 - 03/26`). Saisir « 2339 » seul
répond `ambigu` et propose les deux : c’est le comportement attendu.

**Source** — `sourceRef` renvoie à une entrée de la table `sources`, qui porte le document,
sa référence exacte, son édition, son `url`, son `hote`, son `niveau` (`officiel`,
`copie_document`, `source_secondaire`, `non_lu`), la date `verifieLe` et le
`modeVerification`. Une fiche sans régime documenté garde `options: []` et un `statut`
`a_verifier` : le formulaire affiche alors la référence et sa source, sans inventer de capital.

Les causes et le texte de dommages se règlent dans `modeles`, indexés par le code de nature
(`GRELE`, `TEMPETE`, `INCENDIE`, …) avec repli sur `_defaut`. `dommages` est une chaîne
(sauts de ligne conservés) : un clic copie tout le bloc. Les phrases de vérification de risque,
elles, vivent dans `phrasesType` et s’affichent dans l’onglet **Phrases type**.

### Alimenter les phrases type

L’onglet **Phrases type** rend le bloc `phrasesType` du référentiel : une liste de sections,
chacune avec un `titre` et ses `phrases`. Un clic sur une phrase, ou sur son bouton, la copie.

```json
{ "titre": "Recours", "phrases": ["Nous avons convoqué le tiers, M. …"] }
```

Les sauts de ligne d’une phrase sont conservés à l’affichage comme à la copie : une instruction
d’assistance s’écrit donc en courriel (`"Bonjour,\n…\nCdlt"`), et une phrase peut porter les
mentions entre lesquelles l’expert choisit (`"…\n- Unilatéral\n- Après expertise contradictoire"`).

Ajouter une section ou en changer l’ordre ne demande aucune retouche de code. Le test vérifie la
présence des sections attendues — sans figer leur ordre —, l’absence de doublon de titre,
qu’aucune section n’est vide et qu’aucune phrase ne porte de blanc en bord.

### Écrire un modèle de rédaction

Un modèle porte des **variables** `{{cle}}` et des **blocs conditionnels**
`{{#cle}}…{{/cle}}`, gardés seulement si la réponse est affirmative — toute valeur non vide
autre que `non`, `false` ou `0`. Le saut de ligne se met **à l’intérieur** du bloc, sinon un
paragraphe écarté laisse une ligne vide derrière lui :

```
… est de {{vitesseVent}} km/h.{{#alentour}}

Par ailleurs, des dommages similaires ont été constatés …{{/alentour}}

L’habitation est située …
```

`{{^cle}}…{{/cle}}` est le **bloc inversé** : il sort quand la réponse est négative. Une
constatation et sa négation vivent donc dans le même modèle, et jamais les deux ensemble :

```
{{#alentour}}

Par ailleurs, des dommages similaires ont été constatés …{{/alentour}}{{^alentour}}

Par ailleurs, aucun dommage similaire n’a été constaté …{{/alentour}}
```

Une variable sans valeur laisse un crochet (`[vitesseVent]`) : l’expert voit ce qui reste à
compléter.

**Variables toujours disponibles** — `civilite`, `nom`, `adresse`, `commune`, `qualite`,
`typeBien`, `date` (date de visite), `nature`, `compagnie`.

**Variables calculées** — `periode` (« Entre le 11 et le 12 février 2026 » avec deux dates,
« Le 11 février 2026 » avec une seule), `dateSinistre`, `typeBienArticle` (« d’une » / « d’un »)
et `situe` (« située » / « situé »).

**Accord du participe** — une entrée de `qualites` nomme le bien
(« propriétaire occupant d’une maison individuelle ») : c’est **son article** qui donne le genre,
donc `situe` s’accorde tout seul, y compris sur une valeur ajoutée à la main. À défaut d’article
dans la qualité, le genre est celui déclaré dans `genresTypeBien` pour le type de bien, le
masculin restant le repli.

La phrase d’ouverture d’un modèle s’écrit donc `est {{qualite}}, {{situe}} au {{adresse}}` —
sans répéter le type de bien. La virgule n’est pas cosmétique : une qualité peut se terminer par
une proposition (« …, donnée en location vide »), et la phrase serait illisible sans elle.

**Champs du formulaire** — les champs propres à une nature portent
`data-champ-modele="cle1 cle2"` dans [expertise.html](expertise.html) et n’apparaissent que si
le modèle actif cite l’une de ces clés. Ajouter un modèle qui utilise `{{vitesseVent}}` fait
donc apparaître le champ correspondant sans toucher au HTML.

**Variantes** — un même sinistre ne se raconte pas toujours pareil. Un modèle peut porter des
textes de rechange, chacun commandé par une case à cocher :

```json
"TEMPETE": {
  "causesCirconstances": "… de fortes rafales de vent …",
  "variantes": [
    { "champ": "phenomene", "libelle": "Phénomène ?", "causesCirconstances": "… la tempête dénommée « {{tempete}} » …" }
  ],
  "dommages": "…"
}
```

Le `champ` nomme la case, le `libelle` l’étiquette : la case est rendue depuis le référentiel,
sans retouche du HTML. Cochée, la variante remplace les causes et circonstances — le texte de
`dommages` reste celui du modèle — et **les champs du formulaire suivent le texte retenu**.

C’est ce qui règle la saisie du nom de la tempête, sans une ligne de validation : la variante
`phenomene` est la seule à citer `{{tempete}}`, donc le champ « Nom de la tempête » n’apparaît
que cochée. Décochée, le modèle par défaut décrit un sinistre de vent **sans épisode nommé** :
la notoriété publique ne peut pas être invoquée, et le texte s’appuie sur les rafales relevées
sur la commune, l’absence de dommages comparables sur des bâtiments de bonne construction, et
l’exposition d’un bâtiment isolé où les vents ont pu dépasser 100 km/h localement.

**Valeurs préremplies** — `valeursParDefaut` dans le référentiel. `tempete` y porte le nom de
l’épisode en cours : **à mettre à jour à chaque nouvelle tempête nommée**.

## Logique de qualification

```
Maison individuelle / local isolé ──────────────────────────► droit commun

Immeuble collectif
├─ Dégât des eaux ou incendie
│  ├─ cause exclue IRSI ────────────────────────┐
│  └─ cause non exclue                          │
│     ├─ ≤ 1 600 € HT / local ──► IRSI tranche 1│
│     ├─ > 1 600 → 5 000 € HT ─► IRSI tranche 2│
│     └─ > 5 000 € HT ──────────────────────────┤
│                                               ▼
│                                    copropriété ?
│                                    ├─ eaux ──────► CIDECOP
│                                    ├─ autre ─────► CIDEPIEC
│                                    └─ non ───────► droit commun
└─ Autre péril (foudre, tempête, CatNat, vol, choc…)
   └─ copropriété ──────────────────────────────────► CIDEPIEC
```

Un assureur non adhérent, des dommages limités au mobilier, ou un montant sous le seuil
CIDEPIEC ramènent au droit commun à n'importe quel point du parcours.

## Versionnage

Le numéro de version est déclaré **à un seul endroit** : le champ `version` de
[assets/version.js](assets/version.js). Il est affiché dans l'en-tête et le pied de page du
site, sert de tag à l'image Docker, et la pipeline refuse de publier si l'un des trois
contrôles suivants échoue :

1. le tag Git poussé (`x.y.z`, ou `vx.y.z` normalisé) diffère de `assets/version.js` ;
2. [CHANGELOG.md](CHANGELOG.md) n'a pas de section `## [x.y.z]` ;
3. le tag pointe sur un commit absent de `main`.

Le `Dockerfile` reproduit le contrôle n° 1 à la construction, ce qui empêche de produire
localement une image dont la version affichée mentirait sur son contenu.

Publier une version :

```sh
# 1. mettre à jour assets/version.js et CHANGELOG.md, puis committer sur main
git commit -am "Version 1.1.0"
git push origin main
# 2. taguer et pousser
git tag 1.1.0 && git push origin 1.1.0
```

La portée des incréments (majeur / mineur / correctif) appliquée à la base de connaissance
est définie en tête de [CHANGELOG.md](CHANGELOG.md) : un changement qui modifie la
conclusion d'une qualification est un incrément **majeur**.

## Hébergement

L'image sert le site via nginx en mode non privilégié (uid 101), sur le port **8080**.
Une sonde `GET /healthz` répond `ok`.

[docker-compose.yml](docker-compose.yml) décrit le déploiement de production : l'image est
tirée de `registry.bariserv.net/adh/web`, publiée sur `https://adh.bariserv.net` par Traefik
(entrypoints `web` / `websecure`, certificat `myresolver`, middlewares `rate-limit-global@file`
et `redirect-to-https@file`). Aucun port n'est exposé sur l'hôte : le conteneur rejoint le
réseau externe `traefik_proxy`.

```sh
docker compose pull && docker compose up -d
```

Épingler une version au lieu de `latest` :

```sh
ADH_VERSION=1.0.0 docker compose up -d
```

Build local depuis les sources, sans registry ni Traefik :

```sh
docker build -t adh:dev . && docker run --rm -p 8080:8080 adh:dev
```

Le conteneur tourne en système de fichiers en lecture seule, sans élévation de privilèges,
avec `/tmp`, `/var/cache/nginx` et `/var/run` en `tmpfs`. Les fichiers ne portant pas
d'empreinte dans leur nom, nginx impose une revalidation à chaque requête pour qu'un
redéploiement soit visible immédiatement.

## Pipeline de publication

[.github/workflows/release.yml](.github/workflows/release.yml) se déclenche au push d'un tag
`x.y.z` ou `vx.y.z`, et enchaîne deux jobs :

- **verifier** — cohérence tag / `version.js` / `CHANGELOG.md`, appartenance du commit à
  `main`, syntaxe des scripts, validation exhaustive de l'arbre de décision.
- **publier** — connexion à la registry, build multi-architecture `linux/amd64` et
  `linux/arm64`, push des tags `x.y.z`, `x.y`, `x` et `latest`.

### Configuration côté GitHub

Secrets (`Settings › Secrets and variables › Actions › Secrets`) :

| Secret | Rôle |
| --- | --- |
| `REGISTRY_USERNAME` | Identifiant de la registry. À défaut, `github.actor` est utilisé. |
| `REGISTRY_PASSWORD` | Mot de passe ou jeton. À défaut, le `GITHUB_TOKEN` de l'exécution. |

Variables (`… › Variables`) :

| Variable | Rôle | Défaut |
| --- | --- | --- |
| `REGISTRY` | Hôte de la registry | `ghcr.io` |
| `IMAGE_NAME` | Chemin de l'image dans la registry | `owner/repo` du dépôt |

Sans aucune configuration, la pipeline publie donc sur GHCR sous le nom du dépôt. Pour une
registry privée, renseigner les quatre entrées ci-dessus ; aucune modification du workflow
n'est nécessaire.

## Réserve

L'outil formalise le raisonnement conventionnel ; il ne remplace ni le texte des
conventions ni l'examen des garanties souscrites. Les seuils et périmètres codés dans
`rules.js` doivent être confrontés à la version en vigueur des conventions avant tout
usage en production — voir les réserves affichées dans l'onglet « Sources ».
