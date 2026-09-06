/* ---------------------------------------------------------------------------
   Moteur Chiffrage (data/chiffrage.json + chiffrage-moteur.js).

   Exécution :  node tests/chiffrage.test.js
   --------------------------------------------------------------------------- */

'use strict';

const fs = require('fs');
const path = require('path');

global.window = {};
require(path.join(__dirname, '..', 'assets', 'chiffrage-moteur.js'));

const DONNEES = path.join(__dirname, '..', 'data');
const brut = require(path.join(DONNEES, 'chiffrage.json'));
const C = global.window.CHIFFRAGE || global.CHIFFRAGE;
const db = C.preparer(brut);

const echecs = [];
function echec(message) {
  echecs.push(message);
}

const desam = C.rechercher(db, 'desamiantage');
if (desam.length !== 1) echec('Recherche « desamiantage » : 1 ensemble attendu, obtenu ' + desam.length);
else if (desam[0].postes.length !== 2) {
  echec('Ensemble désamiantage : 2 postes attendus, obtenu ' + desam[0].postes.length);
}

const diag = C.rechercher(db, 'diagnostic');
if (!diag.length || diag[0].id !== 'desamiantage') {
  echec('Recherche « diagnostic » doit remonter l’ensemble désamiantage');
}

const ensemble = C.ensembleParId(db, 'desamiantage');
if (!ensemble) echec('ensembleParId désamiantage introuvable');
else {
  const travaux = ensemble.postes.find((p) => p.id === 'desamiantage-travaux');
  const diagnostic = ensemble.postes.find((p) => p.id === 'desamiantage-diagnostic');
  if (!travaux || C.ligneMontant(travaux) !== '85 €/m²') {
    echec('Désamiantage : montant attendu « 85 €/m² », obtenu « ' + (travaux && C.ligneMontant(travaux)) + ' »');
  }
  if (!diagnostic || C.ligneMontant(diagnostic) !== '250 €') {
    echec('Diagnostic : montant attendu « 250 € », obtenu « ' + (diagnostic && C.ligneMontant(diagnostic)) + ' »');
  }
  if (ensemble.postes[0].id !== 'desamiantage-travaux') {
    echec('Le poste principal doit apparaître en premier dans l’ensemble');
  }
}

if (!C.texteCopiePoste({ libelle: 'Test', montant: '10', unite: '€' }).startsWith('Test : 10 €')) {
  echec('texteCopiePoste incorrect');
}

const dbIndic = C.preparer({
  indicationsContrat: [
    { compagnie: 'GENERALI', typeContrat: 'MRH', numero: 'GA5X21G', lignes: ['Règle A'] },
    { compagnie: 'GENERALI', typeContrat: 'MRH', lignes: ['Règle B'] },
    { compagnie: 'AXA', lignes: ['Règle C'] },
  ],
});
const exact = C.indicationsContratPour(dbIndic, {
  compagnie: 'GENERALI',
  typeContrat: 'MRH',
  numero: 'GA5X21G',
});
if (exact.lignes.join('|') !== 'Règle A') echec('indicationsContrat : numéro exact attendu');
const type = C.indicationsContratPour(dbIndic, {
  compagnie: 'GENERALI',
  typeContrat: 'MRH',
  numero: 'AUTRE',
});
if (type.lignes.join('|') !== 'Règle B') echec('indicationsContrat : repli type + compagnie attendu');
const cie = C.indicationsContratPour(dbIndic, { compagnie: 'AXA', typeContrat: 'MRH', numero: 'X' });
if (cie.lignes.join('|') !== 'Règle C') echec('indicationsContrat : repli compagnie seule attendu');

const maaf = C.indicationsContratPour(db, {
  compagnie: 'MAAF',
  typeContrat: 'MRH',
  numero: '2339 - 03/26',
});
if (!maaf.lignes.some((l) => /ARBRE = OPTION CADRE DE VIE/.test(l))) {
  echec('MAAF : indication arbres / option cadre de vie attendue');
}

if (echecs.length) {
  console.error('Échecs chiffrage (' + echecs.length + ') :');
  echecs.forEach((m) => console.error('  • ' + m));
  process.exit(1);
}

console.log('OK — chiffrage (' + C.tousEnsembles(db).length + ' ensemble(s)).');
