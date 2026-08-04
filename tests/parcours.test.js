/* ---------------------------------------------------------------------------
   Invariants de navigation du parcours.

   Ce test exerce le module réellement utilisé par l'interface
   (assets/parcours.js), et non une réimplémentation : une régression de la
   navigation le fait échouer.

   Exécution :  node tests/parcours.test.js
   --------------------------------------------------------------------------- */

'use strict';

const path = require('path');

global.window = {};
require(path.join(__dirname, '..', 'assets', 'rules.js'));
require(path.join(__dirname, '..', 'assets', 'parcours.js'));

const { QUESTIONS, flow } = global.window.RULES;
const { creerParcours } = global.window.PARCOURS;

const echecs = [];
let verifies = 0;

function verifier(condition, description) {
  verifies++;
  if (!condition) echecs.push(description);
}

/* Reproduit ce que fait le rendu : à chaque changement d'état, la question
   affichée est notée dans le parcours. Sans cela, rien n'est mémorisé. */
function nouveauParcours() {
  const p = creerParcours({
    questions: QUESTIONS,
    flow: flow,
    onChange: function () {
      const en = p.issue();
      if (en.question) p.noter(en.question);
    },
  });
  const en = p.issue();
  if (en.question) p.noter(en.question);
  return p;
}

/* Question actuellement affichée, ou null si une conclusion est atteinte. */
const affichee = (p) => p.issue().question || null;

/* Répond en prenant l'option `rang` (0 = première) de la question affichée. */
function repondreAu(p, rang) {
  const id = affichee(p);
  p.repondre(id, QUESTIONS[id].options[rang || 0].v);
  return id;
}

/* ------------------- Reculer depuis une question ------------------- */
/* C'est la régression historique : cibler le dernier élément d'`ordre` visait
   la question affichée, dépourvue de réponse, et l'arbre la reposait à
   l'identique — le retour arrière restait sans effet visible. */
{
  const p = nouveauParcours();
  const q1 = repondreAu(p, 0);
  const q2 = affichee(p);

  verifier(q2 !== null && q2 !== q1, 'Une deuxième question doit suivre la première');

  const bouge = p.reculer();
  verifier(bouge === true, 'reculer() doit signaler qu’un critère a été défait');
  verifier(affichee(p) === q1, `reculer() depuis la question 2 doit réafficher « ${q1} », pas « ${affichee(p)} »`);
  verifier(p.reponses()[q1] === undefined, 'La réponse défaite doit être effacée');
  verifier(p.nbRepondues() === 0, 'Aucun critère ne doit rester tranché après retour au premier');
}

/* ------------------- Reculer depuis la première question ------------------- */
{
  const p = nouveauParcours();
  const q1 = affichee(p);
  verifier(p.reculer() === false, 'reculer() sur la première question doit être sans effet');
  verifier(affichee(p) === q1, 'La première question doit rester affichée');
}

/* ------------------- Reculer depuis une conclusion ------------------- */
{
  const p = nouveauParcours();
  let garde = 0;
  while (affichee(p) && garde++ < 12) repondreAu(p, 0);

  verifier(affichee(p) === null, 'Le parcours par défaut doit aboutir à une conclusion');
  const tranches = p.nbRepondues();
  const dernier = p.etapes()[tranches - 1].id;

  verifier(p.reculer() === true, 'reculer() depuis une conclusion doit défaire un critère');
  verifier(affichee(p) === dernier, `reculer() depuis la conclusion doit reposer « ${dernier} »`);
  verifier(p.nbRepondues() === tranches - 1, 'Exactement un critère doit avoir été défait');
}

/* ------------------- Reculer pas à pas jusqu'au départ ------------------- */
/* Chaque appel doit défaire exactement un critère : ni boucle infinie, ni saut. */
{
  const p = nouveauParcours();
  let garde = 0;
  while (affichee(p) && garde++ < 12) repondreAu(p, 0);

  let attendu = p.nbRepondues();
  let tours = 0;
  while (p.reculer()) {
    attendu--;
    tours++;
    if (p.nbRepondues() !== attendu) {
      echecs.push(`Le retour arrière n’a pas défait exactement un critère (attendu ${attendu}, obtenu ${p.nbRepondues()})`);
      break;
    }
    if (tours > 20) {
      echecs.push('Le retour arrière ne converge pas vers l’état initial');
      break;
    }
  }
  verifies += 2;
  verifier(p.nbRepondues() === 0, 'Reculer répétitivement doit ramener au parcours vierge');
}

/* ------------------- Changer un critère invalide la suite ------------------- */
{
  const p = nouveauParcours();
  let garde = 0;
  while (affichee(p) && garde++ < 12) repondreAu(p, 0);
  const complet = p.nbRepondues();

  /* Retour au premier critère, puis choix d'une autre branche. */
  p.revenirA(0);
  verifier(p.nbRepondues() === 0, 'revenirA(0) doit effacer tous les critères');

  const q1 = affichee(p);
  const autre = QUESTIONS[q1].options[QUESTIONS[q1].options.length - 1].v;
  p.repondre(q1, autre);
  verifier(
    p.nbRepondues() === 1,
    'Après changement du premier critère, aucune réponse ultérieure ne doit subsister'
  );
  verifier(complet > 1, 'Le parcours de référence doit comporter plusieurs critères');
}

/* ------------------- Rejeu d'une URL ------------------- */
{
  /* Un jeu de réponses valide et complet doit être rejoué intégralement. */
  const p = nouveauParcours();
  let garde = 0;
  while (affichee(p) && garde++ < 12) repondreAu(p, 0);
  const reference = p.reponses();
  const attendu = p.nbRepondues();

  const q = nouveauParcours();
  verifier(q.rejouer(reference) === attendu, 'Le rejeu doit restituer tous les critères');
  verifier(JSON.stringify(q.reponses()) === JSON.stringify(reference), 'Le rejeu doit restituer les mêmes valeurs');
  verifier(affichee(q) === null, 'Le rejeu d’un parcours complet doit aboutir à la conclusion');

  /* Une valeur inventée doit être rejetée sans faire dérailler le parcours. */
  const r = nouveauParcours();
  const premier = affichee(r);
  r.rejouer({ [premier]: 'valeur-inexistante' });
  verifier(r.nbRepondues() === 0, 'Une valeur inconnue dans l’URL doit être ignorée');
  verifier(affichee(r) === premier, 'Après rejet, la première question doit être posée');

  /* Une clé hors arbre ne doit rien produire. */
  const s = nouveauParcours();
  s.rejouer({ champInexistant: 'x' });
  verifier(s.nbRepondues() === 0, 'Une clé inconnue dans l’URL doit être ignorée');

  /* Des réponses fournies dans le désordre s'arrêtent au premier trou, sans
     jamais produire un état que l'arbre n'aurait pas pu atteindre. */
  const t = nouveauParcours();
  const partiel = Object.assign({}, reference);
  const cles = Object.keys(partiel);
  delete partiel[cles[1]];
  t.rejouer(partiel);
  verifier(t.nbRepondues() === 1, 'Le rejeu doit s’arrêter au premier critère manquant');
}

/* ------------------- Compteur de progression ------------------- */
{
  const p = nouveauParcours();
  let garde = 0;
  const total = p.nbPosees() + p.resteEstime();
  verifier(total >= 4, 'L’estimation initiale doit annoncer plusieurs critères');

  while (affichee(p) && garde++ < 12) {
    verifier(p.resteEstime() >= 0, 'L’estimation de critères restants ne peut être négative');
    repondreAu(p, 0);
  }
  verifier(p.resteEstime() === 0, 'Aucun critère ne doit rester estimé sur une conclusion');
}

/* ------------------- Restitution ------------------- */

console.log(`ADH — invariants de navigation : ${verifies} assertions`);

if (echecs.length) {
  console.error(`\n${echecs.length} anomalie(s) :`);
  echecs.forEach((e) => console.error('  - ' + e));
  process.exit(1);
}

console.log('Validation réussie.');
