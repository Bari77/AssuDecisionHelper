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
  calculés d’après [data/expertise.json](data/expertise.json). Pour ajouter une formule, recopier
  une entrée de `contrats` (compagnie, type, numéro, option → capitaux / frais).

## Structure

| Fichier | Rôle |
| --- | --- |
| [index.html](index.html) | Structure de la page, comparatif des conventions |
| [expertise.html](expertise.html) | Formulaire d’expertise (capitaux, frais, textes) |
| [data/expertise.json](data/expertise.json) | **Base contrat** : natures, compagnies, fiches, modèles de rédaction |
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
rattachée au référentiel (compagnie, type). Les six associations d’exemple (ACM, GENERALI,
PACIFICA, MAAF, AXA) produisent le libellé et la modalité de bâtiment attendus. L’option vide
ne déclenche pas une option nommée (IMMO+). Les modèles interpolent civilité, nom et date.

La pipeline exécute les quatre tests avant toute publication.

### Alimenter une fiche contrat

Recopier une entrée de `contrats` dans [data/expertise.json](data/expertise.json) :

- `compagnie` / `typeContrat` / `numero` — clés de recherche.
- `libelle` — texte bleu « CONTRAT ».
- `options[]` — sans `libelle` : régime de base. Avec `libelle`
  (« Valeur à neuf », « OPTION IMMO+ ») : régime nommé. `frais` seulement s’il y en a.
- `natures` — optionnel : si absent, la fiche vaut pour tous les sinistres.

La vérification de risque se règle dans `verificationsRisque`, indexée par compagnie
(repli `_defaut`). Les causes et le texte de dommages se règlent dans `modeles`,
indexés par le code de nature (`GRELE`, `INCENDIE`, …) avec repli sur `_defaut`.
`dommages` est une chaîne (sauts de ligne conservés) : un clic copie tout le bloc.

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
