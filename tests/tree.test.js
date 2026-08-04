/* ---------------------------------------------------------------------------
   Exploration exhaustive de l'arbre de décision.

   Le moteur étant une fonction pure de l'état des réponses, tous les parcours
   possibles peuvent être énumérés. Ce test vérifie que chacun termine, qu'aucune
   question n'est reposée, et que chaque conclusion est complète.

   Exécution :  node tests/tree.test.js
   --------------------------------------------------------------------------- */

'use strict';

const path = require('path');

/* rules.js et version.js sont écrits pour le navigateur : on leur fournit un
   objet window minimal avant chargement. */
global.window = {};
require(path.join(__dirname, '..', 'assets', 'version.js'));
require(path.join(__dirname, '..', 'assets', 'rules.js'));
require(path.join(__dirname, '..', 'assets', 'sources.js'));

const { QUESTIONS, CONVENTIONS, flow } = global.window.RULES;
const { SOURCES, RESERVES } = global.window.SOURCES;

const PROFONDEUR_MAX = 12;
const echecs = [];
const feuilles = [];

function echec(message, chemin) {
  echecs.push(chemin ? `${message}  [${chemin.join(' → ')}]` : message);
}

/* ------------------- Parcours exhaustif ------------------- */

function explorer(reponses, chemin) {
  if (chemin.length > PROFONDEUR_MAX) {
    echec('Parcours non convergent', chemin);
    return;
  }

  const issue = flow(reponses);

  if (issue.resultat) {
    feuilles.push({ chemin, resultat: issue.resultat });
    return;
  }

  const id = issue.question;
  if (!QUESTIONS[id]) {
    echec(`Question inconnue « ${id} »`, chemin);
    return;
  }
  if (reponses[id] !== undefined) {
    echec(`Question « ${id} » reposée alors qu'elle a déjà une réponse`, chemin);
    return;
  }

  for (const option of QUESTIONS[id].options) {
    explorer(Object.assign({}, reponses, { [id]: option.v }), chemin.concat(`${id}=${option.v}`));
  }
}

explorer({}, []);

/* ------------------- Complétude des conclusions ------------------- */

for (const { chemin, resultat } of feuilles) {
  const f = resultat.fiche;

  if (!f || !f.titre || !f.nomComplet || !f.accroche) echec('Fiche de conclusion incomplète', chemin);
  if (!resultat.motif) echec('Motif de qualification absent', chemin);
  if (!Array.isArray(resultat.actions) || resultat.actions.length === 0) echec('Conduite du dossier absente', chemin);

  if (String(resultat.cle).startsWith('IRSI')) {
    if (!resultat.gestionnaire) echec('Assureur gestionnaire non désigné en branche IRSI', chemin);
    else if (/undefined/.test(resultat.gestionnaire)) echec('Assureur gestionnaire indéterminé', chemin);
  }

  if (resultat.cle === 'CIDECOP' || resultat.cle === 'CIDEPIEC') {
    if (!Array.isArray(resultat.repartition) || resultat.repartition.length === 0) {
      echec('Répartition de la charge absente en branche copropriété', chemin);
    }
  }

  if (/undefined|NaN|\[object /.test(JSON.stringify(resultat))) echec('Texte de conclusion mal interpolé', chemin);

  /* L'interface masque un bloc de fiche dont le titre reprend celui d'une section
     calculée. Le doublon serait donc silencieux : on le signale ici. */
  const sectionsCalculees = ['motif de la qualification', 'répartition retenue pour ce sinistre', 'conduite du dossier'];
  for (const b of (f && f.blocs) || []) {
    if (sectionsCalculees.includes(String(b.t).toLowerCase())) {
      echec(`Bloc de fiche « ${b.t} » masqué par la section calculée de même titre`, chemin);
    }
  }
}

/* ------------------- Cohérence des données ------------------- */

for (const [id, def] of Object.entries(QUESTIONS)) {
  if (!def.intitule) echec(`Question « ${id} » sans intitulé`);
  if (!Array.isArray(def.options) || def.options.length < 2) echec(`Question « ${id} » sans alternative`);
  const valeurs = new Set();
  for (const o of def.options || []) {
    if (!o.v || !o.l) echec(`Option incomplète dans « ${id} »`);
    if (valeurs.has(o.v)) echec(`Valeur d'option « ${o.v} » dupliquée dans « ${id} »`);
    valeurs.add(o.v);
  }
}

for (const [cle, f] of Object.entries(CONVENTIONS)) {
  if (!f.code || !f.titre || !f.tone) echec(`Convention « ${cle} » incomplète`);
  if (!Array.isArray(f.blocs) || f.blocs.length === 0) echec(`Convention « ${cle} » sans bloc explicatif`);
}

/* Toute question déclarée doit être atteignable par au moins un parcours. */
const atteintes = new Set();
feuilles.forEach(({ chemin }) => chemin.forEach((etape) => atteintes.add(etape.split('=')[0])));
for (const id of Object.keys(QUESTIONS)) {
  if (!atteintes.has(id)) echec(`Question « ${id} » inatteignable : code mort`);
}

/* ------------------- Bibliographie ------------------- */

let nbSources = 0;
for (const groupe of SOURCES) {
  if (!groupe.groupe) echec('Groupe de sources sans intitulé');
  for (const item of groupe.items) {
    nbSources++;
    if (!item.titre || !item.editeur) echec(`Source incomplète dans « ${groupe.groupe} »`);
    if (!item.url && !item.manquant) echec(`Source « ${item.titre} » sans URL ni marqueur d'absence`);
    if (item.url && !/^https:\/\//.test(item.url)) echec(`Source « ${item.titre} » non servie en HTTPS`);
  }
}
if (RESERVES.length === 0) echec('Aucune réserve méthodologique déclarée');

/* ------------------- Restitution ------------------- */

const repartition = feuilles.reduce((acc, f) => {
  acc[f.resultat.cle] = (acc[f.resultat.cle] || 0) + 1;
  return acc;
}, {});
const profondeur = feuilles.reduce((m, f) => Math.max(m, f.chemin.length), 0);

console.log(`ADH ${global.window.ADH.version} — validation de l'arbre de décision`);
console.log(`  parcours énumérés   : ${feuilles.length}`);
console.log(`  profondeur maximale : ${profondeur} critères`);
console.log(`  conclusions         : ${JSON.stringify(repartition)}`);
console.log(`  questions couvertes : ${atteintes.size}/${Object.keys(QUESTIONS).length}`);
console.log(`  sources référencées : ${nbSources} · réserves : ${RESERVES.length}`);

if (echecs.length) {
  console.error(`\n${echecs.length} anomalie(s) :`);
  echecs.slice(0, 40).forEach((e) => console.error('  - ' + e));
  if (echecs.length > 40) console.error(`  … et ${echecs.length - 40} autre(s)`);
  process.exit(1);
}

console.log('\nValidation réussie.');
