/* ---------------------------------------------------------------------------
   Résolution des fiches contrat (data/expertise.json, data/compagnies/*.json
   et expertise-moteur.js).

   Le navigateur ne télécharge un fichier de compagnie qu'au besoin. Le test,
   lui, les fusionne tous : il contrôle la base complète, plus la cohérence de
   l'index qui permet le chargement paresseux.

   Exécution :  node tests/expertise.test.js
   --------------------------------------------------------------------------- */

'use strict';

const fs = require('fs');
const path = require('path');

global.window = {};
require(path.join(__dirname, '..', 'assets', 'expertise-moteur.js'));

const DONNEES = path.join(__dirname, '..', 'data');
const referentiel = require(path.join(DONNEES, 'expertise.json'));
const E = global.window.EXPERTISE || global.EXPERTISE;

const echecs = [];
function echec(message) {
  echecs.push(message);
}

/* --------- Assemblage : référentiel + tous les fichiers de compagnie --------- */

const paquets = fs
  .readdirSync(path.join(DONNEES, 'compagnies'))
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((nom) => ({ nom: 'compagnies/' + nom, paquet: require(path.join(DONNEES, 'compagnies', nom)) }));

const partiel = E.preparer(referentiel);
const db = paquets.reduce((base, p) => E.fusionner(base, p.paquet), partiel);

function resoudre(saisie) {
  return E.resoudre(db, saisie);
}

/* ------------------- Découpage par compagnie et index ------------------- */

const index = referentiel.fichesParCompagnie || {};
if (!Object.keys(index).length) echec('fichesParCompagnie absent du référentiel');
if (referentiel.contrats) {
  echec('Le référentiel ne doit plus porter de tableau contrats : les fiches vivent dans data/compagnies/');
}

/* L'index est généré par tools/construire-index.js : il doit refléter
   exactement les fichiers de compagnie, sinon le formulaire proposerait des
   numéros fantômes ou en oublierait. */
const indexAttendu = require(path.join(__dirname, '..', 'tools', 'construire-index.js')).construire();
if (JSON.stringify(indexAttendu) !== JSON.stringify(index)) {
  echec('fichesParCompagnie est périmé : relancer « node tools/construire-index.js »');
}

for (const { nom, paquet } of paquets) {
  if (!paquet.compagnie) echec(nom + ' : champ « compagnie » manquant');
  else if (referentiel.compagnies.indexOf(paquet.compagnie) === -1) {
    echec(nom + ' : compagnie « ' + paquet.compagnie + ' » hors référentiel');
  }
  if (!Array.isArray(paquet.contrats)) echec(nom + ' : tableau contrats manquant');
  for (const c of paquet.contrats || []) {
    /* Une fiche n'a pas à répéter l'en-tête, mais si elle le fait ce doit être
       à l'identique : une divergence serait un copier-coller manqué. */
    if (c.compagnie != null && c.compagnie !== paquet.compagnie) {
      echec(nom + ' : la fiche ' + c.numero + ' déclare la compagnie « ' + c.compagnie + ' »');
    }
    if (!c.numero) echec(nom + ' : une fiche sans numéro');
    /* typeContrat n'est pas hérité : un fichier finira par porter plusieurs
       produits, et un défaut d'en-tête y serait silencieusement faux. */
    if (!c.typeContrat) echec(nom + ' : la fiche ' + c.numero + ' doit déclarer son typeContrat');
  }
  /* Ce que le fichier répète alors que son en-tête le dit déjà : à retirer,
     sinon la redondance revient par petites touches. */
  const repetees = (paquet.contrats || []).filter((c) => c.compagnie != null);
  if (repetees.length) {
    echec(nom + ' : ' + repetees.length + ' fiche(s) répètent « compagnie », déjà portée par l’en-tête');
  }
  /* L'inverse : ces deux champs ne doivent pas remonter en en-tête, où ils
     deviendraient un défaut muet pour les fiches d'un autre produit. */
  for (const cle of ['typeContrat', 'nomContrat']) {
    if (paquet[cle] != null) {
      echec(nom + ' : « ' + cle + ' » se déclare sur chaque fiche, jamais en en-tête de fichier');
    }
  }
  for (const c of paquet.contrats || []) {
    if (c.libelle && c.libelle === [paquet.compagnie, c.typeContrat, c.numero].join(' - ')) {
      echec(nom + ' : le libellé de ' + c.numero + ' est celui calculé par défaut, il peut être retiré');
    }
    if (c.dateDebut === null || c.dateFin === null) {
      echec(nom + ' : ' + c.numero + ' porte une date à null ; l’absence du champ dit déjà « inconnu »');
    }
    for (const o of c.options || []) {
      if (o.statut != null && o.statut === c.statut) {
        echec(nom + ' : une option de ' + c.numero + ' répète le statut de la fiche');
      }
      if (o.sourceRef != null && o.sourceRef === c.sourceRef) {
        echec(nom + ' : une option de ' + c.numero + ' répète la source de la fiche');
      }
      const effectif = o.statut || c.statut;
      for (const poste of (o.capitaux || []).concat(o.frais || [])) {
        if (poste.statut != null && poste.statut === effectif) {
          echec(nom + ' : un poste de ' + c.numero + ' répète le statut de son option');
        }
      }
    }
  }
}

/* --------- Héritage : ce qui n'est pas écrit vient du parent --------- */

const heritage = E.completerPaquet({
  compagnie: 'PACIFICA',
  /* Un fichier réaliste : deux produits, deux types de contrat. */
  contrats: [
    {
      typeContrat: 'MRH',
      numero: 'TEST-1',
      nomContrat: 'Assurance Habitation',
      statut: 'verifie',
      sourceRef: 'S1',
      options: [
        { capitaux: [{ nature: 'Batiment' }], frais: [{ type: 'Déblai' }] },
        { libelle: 'AUTRE', statut: 'deduit', capitaux: [{ nature: 'Batiment', statut: 'a_verifier' }] },
      ],
    },
    { typeContrat: 'MRP', numero: 'TEST-2', libelle: 'Libellé écrit', nomContrat: 'Autre produit', options: [] },
  ],
});

const [t1, t2] = heritage;
if (t1.compagnie !== 'PACIFICA') echec('Héritage : la compagnie de l’en-tête doit descendre à la fiche');
if (t2.compagnie !== 'PACIFICA') echec('Héritage : la compagnie descend à toutes les fiches');
if (t1.libelle !== 'PACIFICA - MRH - TEST-1') echec('Libellé calculé obtenu : « ' + t1.libelle + ' »');
if (t1.options[0].statut !== 'verifie') echec('Héritage : le statut de la fiche doit descendre à l’option');
if (t1.options[0].sourceRef !== 'S1') echec('Héritage : la source de la fiche doit descendre à l’option');
if (t1.options[0].capitaux[0].statut !== 'verifie') echec('Héritage : le statut doit descendre jusqu’au capital');
if (t1.options[0].frais[0].statut !== 'verifie') echec('Héritage : le statut doit descendre jusqu’au frais');
if (t1.options[1].statut !== 'deduit') echec('Un statut écrit sur l’option doit l’emporter');
if (t1.options[1].capitaux[0].statut !== 'a_verifier') echec('Un statut écrit sur le poste doit l’emporter');
if (t2.libelle !== 'Libellé écrit') echec('Un libellé écrit ne doit jamais être recalculé');

/* Deux produits dans le même fichier : chacun garde son type et son nom, sans
   qu'un défaut d'en-tête puisse les confondre. */
if (t1.typeContrat !== 'MRH' || t2.typeContrat !== 'MRP') {
  echec('Chaque fiche doit garder son propre typeContrat');
}
if (t1.nomContrat !== 'Assurance Habitation' || t2.nomContrat !== 'Autre produit') {
  echec('Chaque fiche doit garder son propre nomContrat');
}
/* Un en-tête qui prétendrait imposer un type ne doit rien imposer. */
const sansType = E.completerPaquet({
  compagnie: 'PACIFICA',
  typeContrat: 'MRH',
  contrats: [{ numero: 'TEST-3', options: [] }],
})[0];
if (sansType.typeContrat != null) echec('typeContrat ne doit jamais être hérité de l’en-tête');
if (sansType.libelle !== 'PACIFICA - TEST-3') echec('Libellé sans type obtenu : « ' + sansType.libelle + ' »');

/* completerPaquet ne touche pas ce qu'on lui donne. */
const source = { compagnie: 'X', contrats: [{ numero: 'N', statut: 'verifie', options: [{ capitaux: [{ nature: 'B' }] }] }] };
E.completerPaquet(source);
if (source.contrats[0].compagnie != null) echec('completerPaquet ne doit pas modifier le paquet reçu');
if (source.contrats[0].options[0].statut != null) echec('completerPaquet ne doit pas modifier les options reçues');

/* Une compagnie non chargée reste trouvable par son numéro, et la résolution
   annonce le téléchargement au lieu de nier la fiche. */
const enAttente = E.resoudre(partiel, {
  compagnie: 'PACIFICA',
  typeContrat: 'MRH',
  numero: '7030A.33',
  option: '',
});
if (enAttente.statut !== 'chargement') {
  echec('Fiche non téléchargée : statut « chargement » attendu, obtenu « ' + enAttente.statut + ' »');
}
if (enAttente.fichier !== 'compagnies/pacifica.json') {
  echec('Fiche non téléchargée : le fichier à charger doit être indiqué');
}
if (E.numerosPour(partiel, 'PACIFICA', 'MRH').indexOf('7030A.33') === -1) {
  echec('Les numéros d’une compagnie non chargée doivent rester proposés');
}
if (E.optionsPour(partiel, 'PACIFICA', 'MRH', '7030A.33', '').length) {
  echec('Une fiche non chargée ne doit annoncer aucune option');
}

/* La fusion remplace les amorces, sans doublon ni fiche perdue. */
const pacifica = paquets.find((p) => p.paquet.compagnie === 'PACIFICA').paquet;
const apres = E.fusionner(partiel, pacifica);
if (apres.contrats.filter((c) => c.numero === '7030A.33').length !== 1) {
  echec('La fusion doit remplacer l’amorce, pas s’y ajouter');
}
if (apres.contrats.some((c) => c.compagnie === 'PACIFICA' && c.differe)) {
  echec('Aucune amorce PACIFICA ne doit subsister après fusion');
}
if (partiel.contrats.filter((c) => c.numero === '7030A.33')[0].differe !== true) {
  echec('fusionner ne doit pas modifier la base qu’elle reçoit');
}
if (!Object.keys(apres.sources || {}).length) echec('La fusion doit rapatrier les sources du paquet');
if (E.fichierCompagnie(db, 'pacifica') !== 'compagnies/pacifica.json') {
  echec('fichierCompagnie doit être insensible à la casse et aux accents');
}
if (E.fichierCompagnie(db, 'MATMUT') !== null) {
  echec('Une compagnie sans fichier doit remonter null');
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
  if (!Array.isArray(c.options)) echec('Contrat sans tableau options : ' + c.numero);
  /* Une fiche peut rester sans régime : référence identifiée, contenu non lu.
     Elle doit alors s'annoncer comme telle plutôt que d'être remplie au jugé. */
  if (Array.isArray(c.options) && !c.options.length) {
    if (c.statut !== 'a_verifier') {
      echec('Fiche sans option : ' + c.numero + ' doit porter statut « a_verifier »');
    }
    if (!Array.isArray(c.remarques) || !c.remarques.length) {
      echec('Fiche sans option : ' + c.numero + ' doit expliquer pourquoi en remarques');
    }
  }
  for (const o of c.options || []) {
    if (!Array.isArray(o.capitaux) || !o.capitaux.length) {
      echec('Option sans capitaux : ' + c.numero + ' / ' + (o.libelle || '(base)'));
    }
  }
}

/* ------------------- Traçabilité (schéma v2) ------------------- */

const STATUTS = Object.keys(db.statutsQualite || {});
const NIVEAUX = Object.keys(db.niveauxSource || {});
if (!STATUTS.length) echec('statutsQualite absent : le vocabulaire de qualité doit être décrit dans la base');
if (!NIVEAUX.length) echec('niveauxSource absent');

for (const [id, src] of Object.entries(db.sources || {})) {
  if (!src.document) echec('sources.' + id + ' : nom de document manquant');
  if (!src.niveau) echec('sources.' + id + ' : niveau de source manquant');
  else if (NIVEAUX.indexOf(src.niveau) === -1) echec('sources.' + id + ' : niveau « ' + src.niveau + ' » inconnu');
  if (!src.verifieLe) echec('sources.' + id + ' : date de vérification manquante');
  if (!src.modeVerification) echec('sources.' + id + ' : modeVerification manquant');
  if (src.niveau !== 'note_de_travail' && src.niveau !== 'source_secondaire' && !src.url) {
    echec('sources.' + id + ' : url manquante');
  }
}

function verifierStatut(ou, valeur) {
  if (valeur == null) return;
  if (STATUTS.indexOf(valeur) === -1) echec(ou + ' : statut « ' + valeur + ' » hors vocabulaire');
}

for (const c of db.contrats) {
  verifierStatut('contrat ' + c.numero, c.statut);
  if (c.sourceRef && !(db.sources || {})[c.sourceRef]) {
    echec('contrat ' + c.numero + ' : sourceRef « ' + c.sourceRef + ' » introuvable dans sources');
  }
  /* Une donnée annoncée vérifiée doit pouvoir être rattachée à un document. */
  if (c.statut === 'verifie' && !c.sourceRef) {
    echec('contrat ' + c.numero + ' : statut « verifie » sans sourceRef');
  }
  for (const o of c.options || []) {
    verifierStatut('option ' + c.numero + '/' + (o.libelle || '(base)'), o.statut);
    if (o.sourceRef && !(db.sources || {})[o.sourceRef]) {
      echec('option ' + c.numero + '/' + (o.libelle || '(base)') + ' : sourceRef introuvable');
    }
    for (const cap of o.capitaux || []) {
      verifierStatut('capital ' + c.numero + '/' + cap.nature, cap.statut);
      if (cap.statut === 'verifie' && !(o.sourceRef || c.sourceRef)) {
        echec('capital ' + c.numero + '/' + cap.nature + ' : « verifie » sans source rattachable');
      }
    }
    for (const f of o.frais || []) {
      verifierStatut('frais ' + c.numero + '/' + f.type, f.statut);
      if (!f.type || !f.limitation) echec('frais incomplet sur ' + c.numero);
      /* pourcentage est une donnée structurée : elle doit rester cohérente
         avec la limitation affichée, jamais inventée à côté. */
      if (f.pourcentage != null) {
        if (typeof f.pourcentage !== 'number') echec('frais ' + c.numero + '/' + f.type + ' : pourcentage non numérique');
        else if (String(f.limitation).indexOf(String(f.pourcentage) + ' %') === -1) {
          echec('frais ' + c.numero + '/' + f.type + ' : pourcentage ' + f.pourcentage + ' absent de la limitation');
        }
      }
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

/* ------------------- Référentiel PACIFICA (compagnie pilote) ------------------- */

/* Chaque référence de Conditions Générales est une version distincte : la base
   ne doit jamais confondre deux millésimes. */
const REFS_PACIFICA = ['7030A.29', '7030A.30', '7030A.33', '7030A.34', '7030A.35', '7030A.37', '7030A.38', '7262A.39', '7262A.40'];
for (const ref of REFS_PACIFICA) {
  if (!db.contrats.some((c) => c.compagnie === 'PACIFICA' && c.numero === ref)) {
    echec('Référence PACIFICA absente de la base : ' + ref);
  }
}

/* L'ancienne fiche, qui mêle formule et référence dans numero, doit survivre. */
if (!db.contrats.some((c) => c.numero === 'INTEGRALE PNO - 7030A.38')) {
  echec('La fiche héritée « INTEGRALE PNO - 7030A.38 » a disparu');
}

/* 7030A.29 ≠ 7030A.37 ≠ 7030A.38 ≠ 7262A.40 : une saisie exacte doit tomber
   sur la bonne fiche et sur elle seule. */
for (const ref of REFS_PACIFICA) {
  const r = resoudre({ compagnie: 'PACIFICA', typeContrat: 'MRH', numero: ref, option: '' });
  /* Sans option saisie, une fiche dépourvue de régime de base répond
     « inconnu » tout en désignant la fiche : c'est le comportement attendu. */
  if (!r.contrat) {
    echec('PACIFICA ' + ref + ' : la saisie exacte ne désigne aucune fiche (' + r.statut + ')');
  } else if (r.contrat.numero !== ref) {
    echec('PACIFICA ' + ref + ' : résout vers « ' + r.contrat.numero + ' »');
  }
}

/* Les trois éditions lues sur document portent le régime Initiale / Immo+ /
   Intégrale et la limitation démolition de 25 %. */
for (const ref of ['7030A.30', '7030A.33', '7030A.35']) {
  const base = resoudre({ compagnie: 'PACIFICA', typeContrat: 'MRH', numero: ref, option: '' });
  if (base.statut !== 'ok') {
    echec('PACIFICA ' + ref + ' : régime de base non résolu (' + base.statut + ')');
    continue;
  }
  if (base.qualite !== 'verifie') echec('PACIFICA ' + ref + ' : le régime de base doit être vérifié');
  if (!base.source || !base.source.url) echec('PACIFICA ' + ref + ' : source documentaire absente');
  const bat = (base.capitaux || []).find((x) => /batiment/i.test(x.nature));
  if (!bat || bat.modalite !== 'VAN 25 %') echec('PACIFICA ' + ref + ' : bâtiment attendu en VAN 25 % hors Immo+');
  if (!bat || !bat.details || !/25 %/.test(bat.details.complement || '')) {
    echec('PACIFICA ' + ref + ' : le détail du complément de 25 % est attendu');
  }
  const emb = (base.capitaux || []).find((x) => /embellissement/i.test(x.nature));
  if (!emb || emb.capital !== 'Valeur de remplacement') {
    echec('PACIFICA ' + ref + ' : embellissements attendus en valeur de remplacement');
  }
  const demol = (base.frais || []).find((x) => /d[ée]molition/i.test(x.type));
  if (!demol || demol.pourcentage !== 25) echec('PACIFICA ' + ref + ' : démolition / déblai attendue à 25 %');
  if (!(base.pointsVigilance || []).length) echec('PACIFICA ' + ref + ' : points de vigilance attendus');

  const immo = resoudre({ compagnie: 'PACIFICA', typeContrat: 'MRH', numero: ref, option: 'INITIALE + IMMO+' });
  const integrale = resoudre({ compagnie: 'PACIFICA', typeContrat: 'MRH', numero: ref, option: 'INTEGRALE' });
  for (const [nom, r] of [['INITIALE + IMMO+', immo], ['INTEGRALE', integrale]]) {
    if (r.statut !== 'ok') {
      echec('PACIFICA ' + ref + ' / ' + nom + ' : non résolu (' + r.statut + ')');
      continue;
    }
    const b = (r.capitaux || []).find((x) => /batiment/i.test(x.nature));
    if (!b || b.modalite !== 'VAN 100 %') echec('PACIFICA ' + ref + ' / ' + nom + ' : bâtiment attendu en VAN 100 %');
  }
}

/* 7262A.39 : référence connue, régime non documenté. La base doit le dire
   plutôt que de transposer les régimes de la série 7030A. */
const r39 = resoudre({ compagnie: 'PACIFICA', typeContrat: 'MRH', numero: '7262A.39', option: '' });
if (r39.statut !== 'documente') echec('7262A.39 doit se résoudre en « documente », obtenu ' + r39.statut);
if (!r39.source || !r39.source.url) echec('7262A.39 : la source du document doit rester consultable');
if ((r39.capitaux || []).length) echec('7262A.39 : aucun capital ne doit être affirmé');
if (E.optionsPour(db, 'PACIFICA', 'MRH', '7262A.39', '').length) {
  echec('7262A.39 : la liste des options doit rester vide');
}

/* ------------------- Référentiel MAAF ------------------- */

/* Même référence, deux millésimes, deux nomenclatures : la référence seule ne
   peut pas trancher, et la base doit le dire au lieu de choisir. */
const maafAmbigu = resoudre({ compagnie: 'MAAF', typeContrat: 'MRH', numero: '2339', option: '' });
if (maafAmbigu.statut !== 'ambigu') {
  echec('MAAF 2339 sans millésime : statut « ambigu » attendu, obtenu « ' + maafAmbigu.statut + ' »');
} else if (maafAmbigu.numeros.length !== 2) {
  echec('MAAF 2339 : les deux millésimes doivent être proposés, obtenu ' + JSON.stringify(maafAmbigu.numeros));
}

const maaf2026 = attendu(
  { compagnie: 'MAAF', typeContrat: 'MRH', numero: '2339 - 03/26', option: 'CONFORT' },
  'MAAF - MRH - TEMPO Habitation 2339 (03/26)',
  'VAN 100 %'
);
if (maaf2026.statut === 'ok') {
  if (maaf2026.qualite !== 'verifie') echec('MAAF 2339 03/26 : régime attendu vérifié');
  if (!maaf2026.source || maaf2026.source.hote !== 'maaf.fr') {
    echec('MAAF 2339 03/26 : source officielle maaf.fr attendue');
  }
  /* Le piège de cette compagnie : la vétusté n'est intégralement remboursée
     que sur les biens de l'adresse assurée. */
  const dep = (maaf2026.capitaux || []).find((x) => /autre adresse/i.test(x.nature));
  if (!dep || dep.modalite !== 'VAN 25 %') {
    echec('MAAF Confort : dépendances à une autre adresse attendues en VAN 25 %');
  }
  const demol = (maaf2026.frais || []).find((x) => /d[ée]molition/i.test(x.type));
  if (!demol || demol.pourcentage != null) {
    echec('MAAF : les frais de démolition ne doivent porter aucun pourcentage, ils sont inclus au coût de reconstruction');
  }
}

attendu(
  { compagnie: 'MAAF', typeContrat: 'MRH', numero: '2339 - 03/26', option: 'ECO' },
  'MAAF - MRH - TEMPO Habitation 2339 (03/26)',
  'Vétusté déduite'
);
attendu(
  { compagnie: 'MAAF', typeContrat: 'MRH', numero: '2339 - 03/26', option: 'ESSENTIELLE' },
  'MAAF - MRH - TEMPO Habitation 2339 (03/26)',
  'VAN 25 %'
);

/* L'édition 01/21 de la même référence porte l'ancienne nomenclature : ses
   formules ne doivent pas répondre pour l'édition 03/26, ni l'inverse. */
attendu(
  { compagnie: 'MAAF', typeContrat: 'MRH', numero: '2339 - 01/21', option: 'INTEGRALE' },
  'MAAF - MRH - TEMPO Habitation 2339 (01/21)',
  'VAN 100 %'
);
if (resoudre({ compagnie: 'MAAF', typeContrat: 'MRH', numero: '2339 - 01/21', option: 'CONFORT' }).statut === 'ok') {
  echec('La formule CONFORT ne doit pas résoudre sur l’édition 01/21');
}
if (resoudre({ compagnie: 'MAAF', typeContrat: 'MRH', numero: '2339 - 03/26', option: 'INTEGRALE' }).statut === 'ok') {
  echec('La formule INTEGRALE ne doit pas résoudre sur l’édition 03/26');
}

/* Sans régime de base, l'absence d'option n'est pas une erreur de saisie. */
const maafSansFormule = resoudre({ compagnie: 'MAAF', typeContrat: 'MRH', numero: '2339 - 03/26', option: '' });
if (maafSansFormule.statut !== 'inconnu') echec('MAAF sans formule : statut « inconnu » attendu');
if (!/Préciser la formule/i.test(maafSansFormule.motif || '')) {
  echec('MAAF sans formule : le motif doit inviter à préciser la formule, obtenu « ' + maafSansFormule.motif + ' »');
}
const optionInconnue = resoudre({ compagnie: 'MAAF', typeContrat: 'MRH', numero: '2339 - 03/26', option: 'PREMIUM' });
if (/Préciser la formule/i.test(optionInconnue.motif || '')) {
  echec('Une option saisie mais absente doit rester signalée comme non référencée');
}

attendu(
  { compagnie: 'MAAF', typeContrat: 'MRH', numero: '2340 - 01/26', option: '' },
  'MAAF - MRH - TEMPO Habitation en construction 2340 (01/26)',
  'VAN 25 %'
);

/* Contrat de locataire : aucune garantie bâtiment ne doit y apparaître. */
const jeunes = resoudre({ compagnie: 'MAAF', typeContrat: 'MRH', numero: '11001 - 05/26', option: '' });
if (jeunes.statut !== 'ok') echec('MAAF Tempo Jeunes non résolu : ' + jeunes.statut);
else if ((jeunes.capitaux || []).some((x) => /batiment/i.test(x.nature))) {
  echec('Tempo Jeunes est un contrat de locataire : aucun capital bâtiment attendu');
}

/* La fiche héritée survit et reste marquée comme non sourcée. */
const maafHerite = attendu(
  { compagnie: 'MAAF', typeContrat: 'MRH', numero: 'TEMPO Habitation HA2 004/09/14', option: '' },
  'MAAF - MRH - TEMPO Habitation HA2 004/09/14',
  'VAN 25 %'
);
if (maafHerite.statut === 'ok' && maafHerite.qualite !== 'a_verifier') {
  echec('La fiche MAAF héritée doit rester marquée « a_verifier »');
}

/* Les fiches antérieures, sans champ v2, restent muettes sur la traçabilité
   sans faire échouer la résolution. */
const acm = resoudre({ compagnie: 'ACM', typeContrat: 'MRH', numero: '16.07.20-04/ 2008', option: '' });
if (acm.source !== null) echec('Une fiche sans sourceRef doit remonter source = null');
if (acm.qualite !== '') echec('Une fiche sans statut doit remonter une qualité vide');
if (E.sourcePour(db, 'REF-INEXISTANTE') !== null) echec('sourcePour doit remonter null sur une clé inconnue');

/* ------------------- Phrases type ------------------- */

/* L'ordre des sections est un choix éditorial : on vérifie qu'elles sont
   toutes là, pas dans quel ordre elles ont été rangées. */
const TITRES_ATTENDUS = ['Vérification de risque', 'Observations conclusions', 'Recours', 'Instruction assistance'];
const sections = E.phrasesTypePour(db);
if (sections.length !== TITRES_ATTENDUS.length) {
  echec('phrasesType : ' + TITRES_ATTENDUS.length + ' sections attendues, obtenu ' + sections.length);
}
for (const titre of TITRES_ATTENDUS) {
  if (!sections.some((s) => s.titre === titre)) echec('phrasesType : section « ' + titre + ' » absente');
}
const titresVus = new Set();
for (const section of sections) {
  if (!section.titre) echec('phrasesType : une section sans titre');
  if (titresVus.has(section.titre)) echec('phrasesType : titre dupliqué « ' + section.titre + ' »');
  titresVus.add(section.titre);
  if (!section.phrases.length) echec('phrasesType : section « ' + section.titre + ' » sans phrase');
  for (const phrase of section.phrases) {
    if (typeof phrase !== 'string') echec('phrasesType : « ' + section.titre + ' » contient une phrase non textuelle');
    else if (phrase.trim() !== phrase) echec('phrasesType : phrase avec un blanc en bord dans « ' + section.titre + ' »');
  }
}

/* Les phrases de vérification de risque vivent désormais dans phrasesType, et
   nulle part ailleurs : plus de bloc verificationsRisque à tenir à jour. */
if (db.verificationsRisque) {
  echec('verificationsRisque doit avoir disparu : ses phrases sont dans la section « Vérification de risque »');
}
if (E.verificationsPour) echec('verificationsPour n’a plus de source de données et doit être retirée du moteur');
const verifSection = sections.find((s) => s.titre === 'Vérification de risque');
if (!verifSection || !verifSection.phrases.some((p) => /vérification du risque n'a pas pu être réalisée/.test(p))) {
  echec('phrasesType : la phrase de vérification de risque a été perdue');
}
if (E.phrasesTypePour({}).length !== 0) echec('phrasesType absent : une liste vide est attendue');
/* Une section vide de phrases ne doit pas casser la page. */
if (E.phrasesTypePour({ phrasesType: [{ titre: 'X' }] })[0].phrases.length !== 0) {
  echec('phrasesType : une section sans phrases doit remonter une liste vide, pas une erreur');
}

/* Contenus attendus, aux endroits attendus. */
const attenduPhrases = [
  ['Observations conclusions', /garanties mobilisables.*mode indemnitaire prévu au contrat/],
  ['Observations conclusions', /le hangar constaté lors de la visite est exclu des garanties/],
  ['Observations conclusions', /activation de la garantie Tempête, lesquelles ne sont pas réunies/],
  /* Un seul bloc : la phrase de convocation, puis les deux mentions de recours
     dont l'expert écarte celle qui ne s'applique pas. */
  ['Recours', /^Nous avons convoqué le tiers, M\. .+bien que convoquée, n'était pas représentée\./],
  ['Recours', /\n- Unilatéral\/Refus de la régularisation\n- Après expertise contradictoire$/],
  ['Instruction assistance', /^Bonjour,\n.*société C2IS.*enfumage généralisé du logement\.\nCdlt$/],
];
for (const [titre, motif] of attenduPhrases) {
  const section = sections.find((s) => s.titre === titre);
  if (!section || !section.phrases.some((p) => motif.test(p))) {
    echec('phrasesType : phrase manquante dans « ' + titre + ' » (' + motif + ')');
  }
}


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

/* ------------------- Dates, périodes et accords ------------------- */

if (E.formaterDate('2026-02-01') !== '1er février 2026') {
  echec('Le premier du mois s’écrit « 1er » : obtenu « ' + E.formaterDate('2026-02-01') + ' »');
}
if (E.formaterDate('2026-02-11') !== '11 février 2026') echec('Format de date simple incorrect');

const periodes = [
  [['2026-02-11', '2026-02-12'], 'Entre le 11 et le 12 février 2026', 'même mois : mois et année non répétés'],
  [['2026-01-31', '2026-02-01'], 'Entre le 31 janvier et le 1er février 2026', 'mois différents, même année'],
  [['2025-12-31', '2026-01-01'], 'Entre le 31 décembre 2025 et le 1er janvier 2026', 'années différentes'],
  [['2026-02-11', ''], 'Le 11 février 2026', 'date de fin absente'],
  [['2026-02-11', '2026-02-11'], 'Le 11 février 2026', 'fin identique au début'],
  [['2026-02-12', '2026-02-11'], 'Le 12 février 2026', 'fin antérieure au début : ignorée'],
  [['', '2026-02-12'], '', 'sans date de début, pas de période'],
];
for (const [[d, f], attenduTexte, cas] of periodes) {
  const obtenu = E.periodeSinistre(d, f);
  if (obtenu !== attenduTexte) {
    echec('Période (' + cas + ') : obtenu « ' + obtenu + ' », attendu « ' + attenduTexte + ' »');
  }
}

/* La qualité nomme le bien : c'est son article qui commande l'accord. */
const accordQualiteF = E.accordDuBien(db, "propriétaire occupant d'une maison individuelle", '');
if (accordQualiteF.situe !== 'située') echec('Une qualité en « d’une » doit donner « située »');
const accordQualiteM = E.accordDuBien(db, "locataire d'un appartement", '');
if (accordQualiteM.situe !== 'situé') echec('Une qualité en « d’un » doit donner « situé »');
if (E.accordDuBien(db, "propriétaire d'une maison", 'appartement').situe !== 'située') {
  echec('La qualité doit l’emporter sur le type de bien');
}
/* « d’une » ne doit jamais être lu comme « d’un ». */
if (E.accordDuBien(db, "syndic d'une copropriété d'un immeuble", '').situe !== 'située') {
  echec('Le premier article de la phrase doit décider');
}
if (E.accordDuBien(db, "propriétaire d’une maison individuelle", '').situe !== 'située') {
  echec('L’apostrophe typographique doit être reconnue');
}

/* À défaut d'article dans la qualité, on retombe sur genresTypeBien. */
const accordF = E.accordDuBien(db, 'propriétaire occupant', 'maison individuelle');
if (accordF.typeBienArticle !== "d'une" || accordF.situe !== 'située') {
  echec('Repli attendu au féminin pour « maison individuelle »');
}
const accordM = E.accordDuBien(db, 'locataire', 'appartement');
if (accordM.typeBienArticle !== "d'un" || accordM.situe !== 'situé') {
  echec('Repli attendu au masculin pour « appartement »');
}
if (E.accordDuBien(db, 'locataire', 'grange').typeBienArticle !== "d'un") {
  echec('Un type de bien non déclaré doit tomber au masculin');
}

/* Chaque type de bien du référentiel doit produire une phrase correcte : un
   féminin oublié dans genresTypeBien donnerait « d'un maison individuelle ». */
for (const bien of db.typesBien) {
  const a = E.accordDuBien(db, '', bien);
  const feminin = /^(maison|villa|grange|dépendance)/i.test(bien);
  if (feminin && a.typeBienArticle !== "d'une") {
    echec('« ' + bien + ' » semble féminin mais n’est pas déclaré dans genresTypeBien');
  }
}

/* Les qualités du référentiel nomment le bien : chacune doit s'accorder toute
   seule, sans dépendre du type de bien. */
for (const q of db.qualites) {
  if (!E.accordDuBien(db, q, '').situe) echec('Qualité « ' + q + ' » : accord non déterminé');
  if (/\bd['’]une?\b/i.test(q)) continue;
  echec('Qualité « ' + q + ' » : elle doit nommer le bien (« … d’une maison individuelle »)');
}

/* ------------------- Blocs conditionnels des modèles ------------------- */

const gabarit = 'Vent de {{vitesseVent}} km/h.{{#alentour}}\n\nDommages alentour.{{/alentour}}\n\nSuite.';
const avec = E.interpoler(gabarit, { vitesseVent: '96.1', alentour: 'oui' });
const sans = E.interpoler(gabarit, { vitesseVent: '96.1', alentour: 'non' });
if (!/Dommages alentour/.test(avec)) echec('Bloc conditionnel : « oui » doit garder le paragraphe');
if (/Dommages alentour/.test(sans)) echec('Bloc conditionnel : « non » doit écarter le paragraphe');
if (/\n\n\n/.test(sans)) echec('Bloc conditionnel écarté : aucune ligne vide en trop ne doit rester');
if (sans !== 'Vent de 96.1 km/h.\n\nSuite.') echec('Bloc écarté, obtenu : ' + JSON.stringify(sans));
if (/\{\{/.test(avec) || /\{\{/.test(sans)) echec('Aucune balise ne doit subsister après interpolation');
for (const vide of ['', undefined, 'NON', ' non ', 'false', '0']) {
  if (/Dommages/.test(E.interpoler(gabarit, { alentour: vide }))) {
    echec('Bloc conditionnel : « ' + vide + ' » doit être traité comme une négation');
  }
}
if (!/Dommages/.test(E.interpoler(gabarit, { alentour: 'OUI' }))) {
  echec('Bloc conditionnel : la casse ne doit pas compter');
}

const clesGabarit = E.variablesDe(gabarit);
for (const attendue of ['vitesseVent', 'alentour']) {
  if (clesGabarit.indexOf(attendue) === -1) echec('variablesDe doit relever « ' + attendue + ' »');
}

/* Bloc inversé {{^cle}}…{{/cle}} : la négation d'une constatation s'écrit dans
   le même modèle que son affirmation, et les deux ne sortent jamais ensemble. */
const inverse = 'Constat.{{#alentour}}\n\nDommages alentour.{{/alentour}}{{^alentour}}\n\nAucun dommage alentour.{{/alentour}}\n\nSuite.';
const inverseOui = E.interpoler(inverse, { alentour: 'oui' });
const inverseNon = E.interpoler(inverse, { alentour: 'non' });
if (inverseOui !== 'Constat.\n\nDommages alentour.\n\nSuite.') {
  echec('Bloc inversé : « oui » doit garder l’affirmation seule, obtenu ' + JSON.stringify(inverseOui));
}
if (inverseNon !== 'Constat.\n\nAucun dommage alentour.\n\nSuite.') {
  echec('Bloc inversé : « non » doit garder la négation seule, obtenu ' + JSON.stringify(inverseNon));
}
/* Une clé sans valeur vaut négation : c'est la branche inversée qui sort. */
if (!/Aucun dommage/.test(E.interpoler(inverse, {}))) {
  echec('Bloc inversé : une clé absente doit être traitée comme une négation');
}
if (E.variablesDe('{{^alentour}}x{{/alentour}}').indexOf('alentour') === -1) {
  echec('variablesDe doit relever la clé d’un bloc inversé, sinon son champ resterait masqué');
}

/* ------------------- Modèle TEMPÊTE (rafales locales, par défaut) ------------------- */

/* Case « Phénomène » décochée : aucun épisode nommé, donc aucune notoriété
   publique à invoquer. Le texte constate les dommages, les rattache à des vents
   violents, relève les rafales sur la commune et conclut sur l'exposition du
   bâtiment isolé. */
const qualiteTest = db.qualites[0];
const tempete = E.modelePour(db, 'TEMPETE');
if (!tempete.causesCirconstances || tempete === db.modeles._defaut) {
  echec('Modèle TEMPETE absent');
} else {
  const utilisees = E.variablesDe(tempete.causesCirconstances);
  for (const cle of ['civilite', 'nom', 'qualite', 'situe', 'adresse', 'periode', 'commune', 'vitesseVent', 'alentour']) {
    if (utilisees.indexOf(cle) === -1) echec('Modèle TEMPETE : variable {{' + cle + '}} attendue');
  }
  /* Rien à saisir côté tempête tant que la case est décochée : le champ « Nom
     de la tempête » ne doit pas apparaître, ce qui suppose que ce texte-ci ne
     cite pas {{tempete}}. */
  if (utilisees.indexOf('tempete') !== -1) {
    echec('Modèle TEMPETE : le texte par défaut ne doit pas citer {{tempete}}, il n’y a pas d’épisode nommé');
  }

  const champsTempete = Object.assign(
    {
      civilite: 'M.',
      nom: 'GILLES ISCAN',
      qualite: qualiteTest,
      adresse: 'COURTEMASSOL, 840 impasse de Courtemassol, 46600 MONTVALENT',
      commune: 'MONTVALENT',
      periode: E.periodeSinistre('2026-08-03', ''),
      vitesseVent: '94,2',
    },
    E.accordDuBien(db, qualiteTest, '')
  );

  const rendu = E.interpoler(tempete.causesCirconstances, champsTempete);
  const attendus = [
    [/^M\. GILLES ISCAN est propriétaire occupant d'une maison individuelle, située au COURTEMASSOL/, 'phrase d’ouverture'],
    [/Ces dommages sont consécutifs à des vents violents\./, 'lien de causalité avec le vent'],
    [/Le 3 août 2026, la commune de MONTVALENT a été impactée par de fortes rafales de vent\./, 'rafales sur la commune'],
    [/La vitesse maximale de vent relevée à la station météorologique la plus proche est de 94,2 km\/h\./, 'vitesse relevée'],
    [/aucun dommage similaire n’a été constaté sur la commune/, 'absence de dommages comparables'],
    [/localement les vents ont pu dépasser 100 km\/h\.$/, 'exposition du bâtiment'],
  ];
  for (const [motif, quoi] of attendus) {
    if (!motif.test(rendu)) echec('Modèle TEMPETE : ' + quoi + ' absent ou mal rendu');
  }
  if (/\{\{|\[/.test(rendu)) echec('Modèle TEMPETE : balise ou variable non résolue, obtenu ' + rendu);

  /* La qualité nomme déjà le bien : le modèle ne doit pas le répéter. */
  if (/maison individuelle.*maison individuelle/.test(rendu.split('\n')[0])) {
    echec('Modèle TEMPETE : le type de bien est répété dans la phrase d’ouverture');
  }
  /* La seconde qualité se termine par une proposition : la virgule avant le
     participe n'est pas cosmétique, elle rend la phrase lisible. */
  const rendu2 = E.interpoler(
    tempete.causesCirconstances,
    Object.assign({ qualite: db.qualites[1] }, E.accordDuBien(db, db.qualites[1], ''))
  );
  if (!/donnée en location vide, située/.test(rendu2)) {
    echec('Modèle TEMPETE : la virgule avant le participe manque, obtenu : ' + rendu2.split('\n')[0]);
  }

  /* Des dommages comparables aux alentours renversent le paragraphe, sans
     jamais laisser les deux formulations sortir ensemble. */
  const renduAlentour = E.interpoler(
    tempete.causesCirconstances,
    Object.assign({}, champsTempete, { alentour: 'oui' })
  );
  if (!/des dommages similaires ont été constatés/.test(renduAlentour)) {
    echec('Modèle TEMPETE : « alentour » à oui doit affirmer les dommages comparables');
  }
  if (/aucun dommage similaire/.test(renduAlentour)) {
    echec('Modèle TEMPETE : l’affirmation et sa négation ne doivent jamais sortir ensemble');
  }
  for (const [cas, texte] of [['sans', rendu], ['avec', renduAlentour]]) {
    if (/\n\n\n/.test(texte)) echec('Modèle TEMPETE (' + cas + ' alentour) : ligne vide en trop');
    if (/\s$/.test(texte)) echec('Modèle TEMPETE (' + cas + ' alentour) : blanc en fin de texte');
  }

  if (typeof tempete.dommages !== 'string' || !/partiellement détruit/.test(tempete.dommages)) {
    echec('Modèle TEMPETE : texte de dommages constatés attendu');
  }
}

/* ------------------- Variante « Phénomène » de TEMPÊTE ------------------- */

/* Case cochée : l'épisode est nommé et de notoriété publique. Le texte s'appuie
   sur cette notoriété plutôt que sur la seule mesure de vent — et c'est cette
   variante, elle seule, qui réclame le nom de la tempête. */
const phenomene = E.variantesDe(tempete).find((v) => v.champ === 'phenomene');
if (!phenomene) {
  echec('Modèle TEMPETE : variante « phenomene » attendue dans modeles.TEMPETE.variantes');
} else {
  if (!phenomene.libelle) echec('Variante phenomene : libellé attendu, c’est lui qui nomme la case à cocher');

  /* La case ne sert à rien si le modèle ne change pas quand elle est cochée. */
  const coche = E.modelePour(db, 'TEMPETE', { phenomene: 'oui' });
  if (coche.causesCirconstances !== phenomene.causesCirconstances) {
    echec('Variante phenomene : cochée, elle doit remplacer les causes et circonstances');
  }
  if (coche.dommages !== tempete.dommages) {
    echec('Variante phenomene : le texte de dommages constatés doit rester celui du modèle');
  }
  for (const valeur of [undefined, '', 'non']) {
    if (E.modelePour(db, 'TEMPETE', { phenomene: valeur }).causesCirconstances !== tempete.causesCirconstances) {
      echec('Variante phenomene : « ' + valeur + ' » ne doit pas l’activer');
    }
  }

  /* C'est ce texte qui cite {{tempete}} : le champ « Nom de la tempête »
     n'apparaît dans le formulaire que parce que la variante le réclame. */
  const clesPhenomene = E.variablesDe(phenomene.causesCirconstances);
  for (const cle of ['civilite', 'nom', 'qualite', 'situe', 'adresse', 'periode', 'commune', 'tempete', 'dateSinistre', 'vitesseVent', 'alentour']) {
    if (clesPhenomene.indexOf(cle) === -1) echec('Variante phenomene : variable {{' + cle + '}} attendue');
  }

  const champsPhenomene = Object.assign(
    {
      civilite: 'MME',
      nom: 'CHRISTELLE VICECONTE',
      qualite: qualiteTest,
      adresse: '582 ROUTE DE CHEZ GOUNET 19270 SAINT PARDOUX L ORTIGIER',
      commune: 'SAINT PARDOUX L ORTIGIER',
      periode: E.periodeSinistre('2026-02-11', '2026-02-12'),
      dateSinistre: E.formaterDate('2026-02-11'),
      tempete: 'NILS',
      vitesseVent: '96.1',
      alentour: 'oui',
    },
    E.accordDuBien(db, qualiteTest, '')
  );

  const renduPhenomene = E.interpoler(phenomene.causesCirconstances, champsPhenomene);
  const attendus = [
    [/^MME CHRISTELLE VICECONTE est propriétaire occupant d'une maison individuelle, située au 582/, 'phrase d’ouverture'],
    [/Entre le 11 et le 12 février 2026, la commune de SAINT PARDOUX L ORTIGIER/, 'période et commune'],
    [/tempête dénommée « NILS », phénomène météorologique de notoriété publique/, 'notoriété de l’épisode nommé'],
    [/relevée le 11 février 2026 .* est de 96\.1 km\/h/, 'vitesse relevée et sa date'],
    [/dommages similaires ont été constatés/, 'paragraphe alentour'],
  ];
  for (const [motif, quoi] of attendus) {
    if (!motif.test(renduPhenomene)) echec('Variante phenomene : ' + quoi + ' absent ou mal rendu');
  }
  if (/\{\{|\[/.test(renduPhenomene)) {
    echec('Variante phenomene : balise ou variable non résolue, obtenu ' + renduPhenomene);
  }

  /* Nom de la tempête laissé vide : le crochet est ce qui dit à l'expert qu'il
     reste à le saisir. Sans lui, un rapport partirait sur un épisode anonyme. */
  const sansNom = E.interpoler(
    phenomene.causesCirconstances,
    Object.assign({}, champsPhenomene, { tempete: '' })
  );
  if (!/dénommée « \[tempete\] »/.test(sansNom)) {
    echec('Variante phenomene : un nom de tempête vide doit laisser « [tempete] » à compléter');
  }

  const renduSans = E.interpoler(
    phenomene.causesCirconstances,
    Object.assign({}, champsPhenomene, { alentour: 'non' })
  );
  if (/dommages similaires/.test(renduSans)) {
    echec('Variante phenomene : le paragraphe alentour doit pouvoir être écarté');
  }
  for (const [cas, texte] of [['avec', renduPhenomene], ['sans', renduSans]]) {
    if (/\n\n\n/.test(texte)) echec('Variante phenomene (' + cas + ' alentour) : ligne vide en trop');
    if (/\s$/.test(texte)) echec('Variante phenomene (' + cas + ' alentour) : blanc en fin de texte');
  }
}

/* ------------------- Modèle CHUTE D'ARBRE (DEFENSE RECOURS) ------------------- */

const NATURE_ARBRE = "CHUTE D'ARBRE (DEFENSE RECOURS)";
if (db.natures.indexOf(NATURE_ARBRE) === -1) echec('Nature « ' + NATURE_ARBRE + ' » absente du référentiel');

const arbre = E.modelePour(db, NATURE_ARBRE);
if (arbre === db.modeles._defaut) {
  echec('Modèle « ' + NATURE_ARBRE + ' » absent : la nature retombe sur le modèle par défaut');
} else {
  /* Même corps que la tempête nommée — la variante, pas le texte par défaut :
     c'est elle qui raconte un épisode nommé. Mêmes champs de formulaire, donc,
     sans retouche du HTML. */
  const clesArbre = E.variablesDe(arbre.causesCirconstances);
  const clesNommee = E.variablesDe((phenomene || tempete).causesCirconstances);
  for (const cle of clesNommee) {
    if (clesArbre.indexOf(cle) === -1) {
      echec('Modèle chute d’arbre : variable {{' + cle + '}} attendue comme dans la tempête nommée');
    }
  }

  /* Le paragraphe d'exposition au vent n'a pas de sens ici : on ne va pas
     écrire « sans arbres à proximité immédiate » dans un dossier de chute
     d'arbre. Le texte s'arrête au bloc alentour. */
  if (/environnement isolé|rafales de vent/.test(arbre.causesCirconstances)) {
    echec('Modèle chute d’arbre : le paragraphe d’exposition au vent ne doit pas y figurer');
  }

  const champsArbre = Object.assign(
    {
      civilite: 'MME',
      nom: 'CHRISTELLE VICECONTE',
      qualite: qualiteTest,
      adresse: '582 ROUTE DE CHEZ GOUNET 19270 SAINT PARDOUX L ORTIGIER',
      commune: 'SAINT PARDOUX L ORTIGIER',
      periode: E.periodeSinistre('2026-02-11', '2026-02-12'),
      dateSinistre: E.formaterDate('2026-02-11'),
      tempete: 'NILS',
      vitesseVent: '96.1',
    },
    E.accordDuBien(db, qualiteTest, '')
  );

  const avecAlentour = E.interpoler(arbre.causesCirconstances, Object.assign({}, champsArbre, { alentour: 'oui' }));
  const sansAlentour = E.interpoler(arbre.causesCirconstances, Object.assign({}, champsArbre, { alentour: 'non' }));

  if (!/bonne construction\.$/.test(avecAlentour)) {
    echec('Modèle chute d’arbre : le texte doit finir sur « bonne construction. », obtenu « …' + avecAlentour.slice(-40) + ' »');
  }
  if (!/96\.1 km\/h\.$/.test(sansAlentour)) {
    echec('Modèle chute d’arbre sans dommages alentour : le texte doit finir sur la vitesse de vent, obtenu « …' + sansAlentour.slice(-40) + ' »');
  }
  for (const [cas, texte] of [['avec', avecAlentour], ['sans', sansAlentour]]) {
    if (/\s$/.test(texte)) echec('Modèle chute d’arbre (' + cas + ' alentour) : blanc en fin de texte');
    if (/\n\n\n/.test(texte)) echec('Modèle chute d’arbre (' + cas + ' alentour) : ligne vide en trop');
  }
  if (arbre.dommages !== tempete.dommages) {
    echec('Modèle chute d’arbre : le texte de dommages constatés doit être celui de TEMPÊTE');
  }
}

/* Un modèle indexé sur une nature absente du référentiel serait inatteignable. */
for (const cle of Object.keys(db.modeles || {})) {
  if (cle.charAt(0) === '_') continue;
  if (db.natures.indexOf(cle) === -1) {
    echec('modeles.' + cle + ' : cette nature n’existe pas dans natures, le modèle ne sera jamais affiché');
  }
}

/* La valeur préremplie de la tempête vit dans le référentiel, pas dans le code. */
if (!(db.valeursParDefaut || {}).tempete) {
  echec('valeursParDefaut.tempete attendu dans le référentiel');
}

/* Tout modèle doit s'accorder : plus de « d'un {{typeBien}} » en dur. Une
   variante part dans le même rapport que le modèle qui la porte : elle passe
   par les mêmes contrôles. */
const textesModeles = [];
for (const cle of Object.keys(db.modeles || {})) {
  const modele = db.modeles[cle];
  textesModeles.push(['modeles.' + cle, modele.causesCirconstances || '']);
  (modele.variantes || []).forEach(function (variante, i) {
    const nom = 'modeles.' + cle + '.variantes[' + i + ']';
    if (!variante.champ) echec(nom + ' : champ attendu, c’est lui qui commande la case à cocher');
    if (!variante.libelle) echec(nom + ' : libelle attendu, c’est lui qui nomme la case');
    if (!variante.causesCirconstances) {
      echec(nom + ' : causesCirconstances attendu, sans quoi la variante est ignorée');
    }
    textesModeles.push([nom, variante.causesCirconstances || '']);
  });
}

for (const [nom, texte] of textesModeles) {
  if (/d'un\s+\{\{typeBien\}\}|d’un\s+\{\{typeBien\}\}/.test(texte)) {
    echec(nom + ' : utiliser {{typeBienArticle}} plutôt qu’un article figé');
  }
  if (/\{\{typeBien\}\}\s+situé\b/.test(texte)) {
    echec(nom + ' : utiliser {{situe}} plutôt qu’un participe figé');
  }
  /* Un bloc ouvert doit être fermé, sinon la balise part dans le rapport. Les
     blocs inversés {{^cle}} comptent, ils se ferment comme les autres. */
  const ouverts = (texte.match(/\{\{[#^](\w+)\}\}/g) || []).length;
  const fermes = (texte.match(/\{\{\/(\w+)\}\}/g) || []).length;
  if (ouverts !== fermes) echec(nom + ' : ' + ouverts + ' bloc(s) ouvert(s) pour ' + fermes + ' fermé(s)');
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
console.log('  compagnies chargées : ' + paquets.length + ' fichier(s) dans data/compagnies/');
console.log('  contrats    : ' + db.contrats.length);
console.log('  phrases type: ' + sections.length + ' section(s), ' + sections.reduce((n, s) => n + s.phrases.length, 0) + ' phrase(s)');

if (echecs.length) {
  console.error('\n' + echecs.length + ' anomalie(s) :');
  echecs.slice(0, 40).forEach((e) => console.error('  - ' + e));
  process.exit(1);
}

console.log('\nValidation réussie.');
