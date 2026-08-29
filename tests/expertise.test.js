/* ---------------------------------------------------------------------------
   Résolution des fiches contrat (data/expertise.json + expertise-moteur.js).

   Exécution :  node tests/expertise.test.js
   --------------------------------------------------------------------------- */

'use strict';

const path = require('path');

global.window = {};
require(path.join(__dirname, '..', 'assets', 'expertise-moteur.js'));

const db = require(path.join(__dirname, '..', 'data', 'expertise.json'));
const E = global.window.EXPERTISE || global.EXPERTISE;

const echecs = [];
function echec(message) {
  echecs.push(message);
}

function resoudre(saisie) {
  return E.resoudre(db, saisie);
}

/* ------------------- Référentiels ------------------- */

if (!Array.isArray(db.natures) || db.natures.length < 20) echec('Liste des natures incomplète');
if (!Array.isArray(db.compagnies) || db.compagnies.length < 30) echec('Liste des compagnies incomplète');
if (db.compagnies.length !== new Set(db.compagnies).size) echec('Compagnie dupliquée dans le référentiel');
if (!db.typesContrat.some((t) => t.code === 'MRH')) echec('Type MRH absent');

const cles = new Set();
for (const c of db.contrats) {
  if (!c.compagnie || !c.typeContrat || !c.numero || !c.libelle) {
    echec('Contrat incomplet : ' + (c && (c.compagnie + ' ' + c.numero)));
  }
  const cle = c.compagnie + '|' + c.typeContrat + '|' + c.numero;
  if (cles.has(cle)) echec('Fiche dupliquée : ' + cle);
  cles.add(cle);
  if (db.compagnies.indexOf(c.compagnie) === -1) {
    echec('Compagnie « ' + c.compagnie + ' » hors référentiel (' + c.numero + ')');
  }
  if (!db.typesContrat.some((t) => t.code === c.typeContrat)) {
    echec('Type « ' + c.typeContrat + ' » hors référentiel (' + c.numero + ')');
  }
  if (!Array.isArray(c.options) || !c.options.length) echec('Contrat sans option : ' + c.numero);
  for (const o of c.options || []) {
    if (!Array.isArray(o.capitaux) || !o.capitaux.length) {
      echec('Option sans capitaux : ' + c.numero + ' / ' + (o.libelle || '(base)'));
    }
  }
}

/* ------------------- Associations d’exemple ------------------- */

function attendu(saisie, libelle, modaliteBatiment) {
  const r = resoudre(saisie);
  if (r.statut !== 'ok') {
    echec('Attendu ok pour ' + JSON.stringify(saisie) + ' → ' + r.statut + ' ' + (r.motif || ''));
    return r;
  }
  if (r.libelle !== libelle) echec('Libellé : obtenu « ' + r.libelle + ' », attendu « ' + libelle + ' »');
  const bat = (r.capitaux || []).find((x) => /batiment/i.test(x.nature));
  if (!bat) echec('Capitaux bâtiment absents pour ' + libelle);
  else if (bat.modalite !== modaliteBatiment) {
    echec('Modalité bâtiment pour ' + libelle + ' : « ' + bat.modalite + ' » ≠ « ' + modaliteBatiment + ' »');
  }
  return r;
}

attendu(
  { compagnie: 'ACM', typeContrat: 'MRH', numero: '16.07.20-04/ 2008', option: '' },
  'ACM - MRH - 160720 - 042008',
  'Vétusté déduite'
);

attendu(
  { compagnie: 'ACM', typeContrat: 'MRH', numero: '16.07.20-04', option: 'Valeur à neuf' },
  'ACM - MRH - 160720 - 042008',
  'VAN 25 %'
);

const g = attendu(
  { compagnie: 'GENERALI', typeContrat: 'MRH', numero: 'GA5X25N', option: '' },
  'GENERALI IARD - MRH - GA5X25N',
  'VAN 25 %'
);
if (g.statut === 'ok') {
  const d = (g.frais || []).find((x) => /d[ée]molition/i.test(x.type));
  if (!d || !/justifi/i.test(d.limitation)) echec('GENERALI : frais de démolition attendus selon frais justifiés');
}

attendu(
  { compagnie: 'ACM', typeContrat: 'MRH', numero: 'BQ 16.46.43-04/21', option: '' },
  'ACM - MRH - 164643 - 042021',
  'VAN 25 %'
);

const p = attendu(
  { compagnie: 'PACIFICA', typeContrat: 'MRH', numero: 'INTEGRALE PNO - 7030A.38', option: 'OPTION IMMO+' },
  'PACIFICA - MRH - FORMULE INTEGRALE PNO',
  'VAN 100 %'
);
if (p.statut === 'ok') {
  const d = (p.frais || []).find((x) => /d[ée]molition/i.test(x.type));
  if (!d || !/25\s*%/.test(d.limitation)) echec('PACIFICA IMMO+ : limitation démolition 25 % attendue');
}

const pSans = resoudre({
  compagnie: 'PACIFICA',
  typeContrat: 'MRH',
  numero: 'INTEGRALE PNO',
  option: '',
});
if (pSans.statut === 'ok') echec('PACIFICA sans option IMMO+ ne doit pas résoudre le régime VAN 100 %');

attendu(
  { compagnie: 'MAAF', typeContrat: 'MRH', numero: 'TEMPO Habitation HA2 004/09/14', option: '' },
  'MAAF - MRH - TEMPO Habitation HA2 004/09/14',
  'VAN 25 %'
);

const axa = attendu(
  { compagnie: 'AXA', typeContrat: 'MRH', numero: '970464 l 03 2023', option: '' },
  'AXA - MRH - 970464 l 03 2023',
  'VAN 25 %'
);
if (axa.statut === 'ok' && axa.capitaux.length !== 1) {
  echec('AXA 970464 : 1 poste de capitaux attendu (bâtiment)');
}

if (E.verificationsPour(db, 'ACM').length === 0) echec('Liste de vérification de risque ACM absente');
if (E.verificationsPour(db, 'THELEM').length === 0) echec('Le repli _defaut des vérifications de risque est vide');

if (resoudre({ compagnie: 'AXA', typeContrat: 'MRH' }).statut !== 'incomplet') {
  echec('Sans numéro, la résolution doit rester incomplète');
}
if (resoudre({ compagnie: 'THELEM', typeContrat: 'MRH', numero: 'INCONNU-42' }).statut !== 'inconnu') {
  echec('Un numéro absent de la base doit rester inconnu');
}

/* ------------------- Modèles et interpolation ------------------- */

for (const cle of Object.keys(db.modeles || {})) {
  if (Object.prototype.hasOwnProperty.call(db.modeles[cle], 'verificationRisque')) {
    echec('modeles.' + cle + ' ne doit plus porter verificationRisque (la vérif est par compagnie)');
  }
  if (typeof db.modeles[cle].dommages !== 'string') {
    echec('modeles.' + cle + ' : dommages doit être une chaîne éditable');
  }
}

const grele = E.modelePour(db, 'GRELE');
if (!grele.causesCirconstances) echec('Modèle GRÊLE : causes absentes');
if (!/impacts de gêle/i.test(grele.dommages)) {
  echec('Modèle GRÊLE : phrase d’impacts de grêle absente');
}
if (!/dégradation de la peinture/i.test(grele.dommages)) {
  echec('Modèle GRÊLE : phrase de taches / peinture absente');
}
if (!/\n/.test(grele.dommages)) echec('Modèle GRÊLE : les deux phrases doivent être séparées par un saut de ligne');
const texte = E.interpoler(grele.causesCirconstances, {
  civilite: 'MME',
  nom: 'JOELLE PINARDON',
  qualite: 'propriétaire occupant',
  typeBien: 'maison individuelle',
  adresse: '21 rue des merisiers 87240',
  commune: 'SAINT LAURENT LES EGLISES',
  date: E.formaterDate('2026-07-16'),
});
if (!texte.includes('JOELLE PINARDON')) echec('Interpolation du nom absente');
if (!texte.includes('16 juillet 2026')) echec('Format de date incorrect : ' + E.formaterDate('2026-07-16'));
if (texte.includes('{{nom}}')) echec('Placeholder {{nom}} non remplacé');
if (E.interpoler('Bonjour {{x}}', {}).includes('[x]') === false) {
  echec('Un champ vide doit laisser un crochet');
}

const defaut = E.modelePour(db, 'BRIS DE GLACE');
if (!defaut.causesCirconstances) echec('Le modèle par défaut doit s’appliquer aux natures sans fiche dédiée');
if (defaut.dommages !== db.modeles._defaut.dommages) {
  echec('Une nature sans fiche doit hériter du texte de dommages par défaut');
}

/* ------------------- Restitution ------------------- */

console.log('ADH — validation de la base Expertise');
console.log('  natures     : ' + db.natures.length);
console.log('  compagnies  : ' + db.compagnies.length);
console.log('  contrats    : ' + db.contrats.length);

if (echecs.length) {
  console.error('\n' + echecs.length + ' anomalie(s) :');
  echecs.slice(0, 40).forEach((e) => console.error('  - ' + e));
  process.exit(1);
}

console.log('\nValidation réussie.');
