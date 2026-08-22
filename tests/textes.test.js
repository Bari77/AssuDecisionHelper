/* ---------------------------------------------------------------------------
   Textes à coller et guides métier.

   Pour chaque parcours de l'arbre, les blocs générés doivent être complets,
   sans interpolation cassée, et rester stables hors mentions de dossier.

   Exécution :  node tests/textes.test.js
   --------------------------------------------------------------------------- */

'use strict';

const path = require('path');

global.window = {};
require(path.join(__dirname, '..', 'assets', 'version.js'));
require(path.join(__dirname, '..', 'assets', 'rules.js'));
require(path.join(__dirname, '..', 'assets', 'guides.js'));
require(path.join(__dirname, '..', 'assets', 'textes.js'));

const { QUESTIONS, flow, trancheIrsi, SEUILS } = global.window.RULES;
const { textesDossier } = global.window.TEXTES;
const { GUIDES } = global.window.GUIDES;

const echecs = [];
function echec(message) {
  echecs.push(message);
}

/* ------------------- Tranche IRSI ------------------- */

if (trancheIrsi(0) !== 't1') echec('0 € doit être en tranche 1');
if (trancheIrsi(SEUILS.irsiTranche1) !== 't1') echec('Le plafond de tranche 1 est inclus en T1');
if (trancheIrsi(SEUILS.irsiTranche1 + 1) !== 't2') echec('1 € au-delà de T1 doit être en T2');
if (trancheIrsi(SEUILS.irsiPlafond) !== 't2') echec('Le plafond IRSI est inclus en T2');
if (trancheIrsi(SEUILS.irsiPlafond + 1) !== 'hors') echec('Au-delà du plafond IRSI : hors champ');
if (trancheIrsi(-10) !== null) echec('Un montant négatif ne désigne aucune tranche');
if (trancheIrsi('abc') !== null) echec('Un texte non numérique ne désigne aucune tranche');

/* ------------------- Parcours exhaustif ------------------- */

const ONGLET_MIN = [
  'qualification',
  'gestion',
  'dommages',
  'chiffrage',
  'observations',
  'conclusions',
];

function explorer(reponses, chemin) {
  const issue = flow(reponses);
  if (issue.resultat) {
    const blocs = textesDossier(reponses, issue.resultat, {});
    const ids = blocs.map((b) => b.id);

    if (!blocs.length) echec('Aucun bloc de texte  [' + chemin.join(' → ') + ']');

    for (const id of ONGLET_MIN) {
      if (!ids.includes(id)) echec('Onglet « ' + id + ' » manquant  [' + chemin.join(' → ') + ']');
    }

    for (const b of blocs) {
      if (!b.onglet || !b.texte) echec('Bloc incomplet « ' + b.id + ' »  [' + chemin.join(' → ') + ']');
      if (/undefined|NaN|\[object /.test(b.texte)) {
        echec('Interpolation cassée dans « ' + b.id + ' »  [' + chemin.join(' → ') + ']');
      }
    }

    if (String(issue.resultat.cle).startsWith('IRSI')) {
      const gestion = blocs.find((b) => b.id === 'gestion');
      if (!gestion || !/gestionnaire/i.test(gestion.texte)) {
        echec('Texte gestionnaire absent en branche IRSI  [' + chemin.join(' → ') + ']');
      }
    }

    if (issue.resultat.cle === 'CIDECOP' || issue.resultat.cle === 'CIDEPIEC') {
      const gestion = blocs.find((b) => b.id === 'gestion');
      if (!gestion || !/Répartition/i.test(gestion.texte)) {
        echec('Texte de répartition absent en copropriété  [' + chemin.join(' → ') + ']');
      }
    }

    return;
  }

  const id = issue.question;
  for (const option of QUESTIONS[id].options) {
    explorer(Object.assign({}, reponses, { [id]: option.v }), chemin.concat(id + '=' + option.v));
  }
}

explorer({}, []);

/* ------------------- Personnalisation ------------------- */

const casIrsi = {
  immeuble: 'copropriete',
  evenement: 'dde',
  causeExclue: 'non',
  montant: 't2',
  localisation: 'locataire',
  adhesion: 'oui',
};
const issueIrsi = flow(casIrsi);
const personnalise = textesDossier(casIrsi, issueIrsi.resultat, {
  ref: 'SIN-42',
  assure: 'Dupont',
  compagnie: 'Assureur Exemple',
  contrat: 'MRH locataire',
  franchise: '150 €',
  montant: '2400',
  cause: 'rupture de flexible d’alimentation',
});

const tout = personnalise.map((b) => b.texte).join('\n');
if (!tout.includes('SIN-42')) echec('La référence dossier n’est pas injectée');
if (!tout.includes('Dupont')) echec('L’assuré n’est pas injecté');
if (!tout.includes('Assureur Exemple')) echec('La compagnie n’est pas injectée');
if (!tout.includes('MRH locataire')) echec('Le type de contrat n’est pas injecté');
if (!tout.includes('rupture de flexible')) echec('La cause n’est pas injectée');
if (!tout.includes('2400 € HT')) echec('Le montant n’est pas injecté');
if (!tout.includes('150 €')) echec('La franchise n’est pas injectée');
if (tout.includes('[réf. dossier]')) echec('Le crochet [réf. dossier] devrait être remplacé');

const brut = textesDossier(casIrsi, issueIrsi.resultat, {});
if (!brut.map((b) => b.texte).join('\n').includes('[réf. dossier]')) {
  echec('Sans dossier, le crochet [réf. dossier] doit rester visible');
}

/* ------------------- Guides ------------------- */

const ids = new Set();
if (!GUIDES || GUIDES.length < 4) echec('Guides métier incomplets');
for (const g of GUIDES || []) {
  if (!g.id || !g.titre || !g.chapo) echec('Guide sans identité : ' + (g && g.id));
  if (ids.has(g.id)) echec('Identifiant de guide dupliqué : ' + g.id);
  ids.add(g.id);
  if (!Array.isArray(g.sections) || g.sections.length === 0) echec('Guide « ' + g.id + ' » sans section');
  for (const s of g.sections || []) {
    if (!s.t || !Array.isArray(s.p) || s.p.length === 0) echec('Section vide dans « ' + g.id + ' »');
    if (/undefined/.test(JSON.stringify(s))) echec('Texte indéfini dans « ' + g.id + ' »');
  }
}
if (!ids.has('assiette') || !ids.has('immobilier') || !ids.has('contrat')) {
  echec('Guides assiette, immobilier ou contrat manquants');
}

const immo = GUIDES.find((g) => g.id === 'immobilier');
if (!immo || !immo.tableau || immo.tableau.lignes.length < 6) {
  echec('Le tableau immobilier / embellissements est incomplet');
}

/* ------------------- Restitution ------------------- */

console.log(`ADH ${global.window.ADH.version} — validation des textes et guides`);
console.log(`  guides métier       : ${GUIDES.length}`);
console.log(`  onglets minimaux    : ${ONGLET_MIN.join(', ')}`);

if (echecs.length) {
  console.error(`\n${echecs.length} anomalie(s) :`);
  echecs.slice(0, 40).forEach((e) => console.error('  - ' + e));
  if (echecs.length > 40) console.error(`  … et ${echecs.length - 40} autre(s)`);
  process.exit(1);
}

console.log('\nValidation réussie.');
