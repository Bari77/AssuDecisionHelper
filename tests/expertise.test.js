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

/* Les fiches antérieures, sans champ v2, restent muettes sur la traçabilité
   sans faire échouer la résolution. */
const acm = resoudre({ compagnie: 'ACM', typeContrat: 'MRH', numero: '16.07.20-04/ 2008', option: '' });
if (acm.source !== null) echec('Une fiche sans sourceRef doit remonter source = null');
if (acm.qualite !== '') echec('Une fiche sans statut doit remonter une qualité vide');
if (E.sourcePour(db, 'REF-INEXISTANTE') !== null) echec('sourcePour doit remonter null sur une clé inconnue');

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
console.log('  compagnies chargées : ' + paquets.length + ' fichier(s) dans data/compagnies/');
console.log('  contrats    : ' + db.contrats.length);

if (echecs.length) {
  console.error('\n' + echecs.length + ' anomalie(s) :');
  echecs.slice(0, 40).forEach((e) => console.error('  - ' + e));
  process.exit(1);
}

console.log('\nValidation réussie.');
