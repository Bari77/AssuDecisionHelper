/* ---------------------------------------------------------------------------
   Machine à états du parcours, sans aucune dépendance au DOM.

   Isolée du rendu pour être exécutable et testable hors navigateur : c'est ici
   que vivent les invariants de navigation (avancer, revenir, rejouer une URL),
   et c'est ici que tests/parcours.test.js les vérifie.

   Invariant central : les réponses forment toujours un préfixe d'`ordre`. La
   question affichée est donc la première entrée d'`ordre` sans réponse, et
   revenir en arrière consiste à effacer la dernière réponse — jamais l'entrée
   courante, qui n'en a pas encore.
   --------------------------------------------------------------------------- */

(function (global) {
  'use strict';

  const PROFONDEUR_MAX = 12; // garde-fou contre un arbre mal formé

  function creerParcours(options) {
    const QUESTIONS = options.questions;
    const flow = options.flow;
    const onChange = options.onChange || function () {};

    let reponses = {};
    let ordre = []; // ids de questions, dans l'ordre où elles ont été posées

    /* Issue courante : soit { question }, soit { resultat }. */
    function issue() {
      return flow(reponses);
    }

    /* Enregistre l'id de la question posée pour pouvoir y revenir. */
    function noter(id) {
      if (ordre.indexOf(id) === -1) ordre.push(id);
    }

    function nbRepondues() {
      return ordre.filter((id) => reponses[id] !== undefined).length;
    }

    function repondre(id, valeur) {
      reponses[id] = valeur;
      onChange();
    }

    /* Efface la réponse d'`index` et toutes les suivantes. */
    function revenirA(index) {
      for (let i = index; i < ordre.length; i++) delete reponses[ordre[i]];
      ordre = ordre.slice(0, index);
      onChange();
    }

    /* Défait le dernier critère tranché. Cibler `ordre.length - 1` serait
       inopérant depuis une question : cet index désigne la question affichée,
       qui n'a pas de réponse à effacer, et l'arbre la reposerait à l'identique. */
    function reculer() {
      const n = nbRepondues();
      if (n === 0) return false;
      revenirA(n - 1);
      return true;
    }

    function reinitialiser() {
      reponses = {};
      ordre = [];
      onChange();
    }

    /* Rejoue un jeu de réponses, en ne retenant que celles que l'arbre demande
       effectivement et dans son ordre : une URL trafiquée ou périmée ne peut donc
       pas produire un état incohérent. */
    function rejouer(candidat) {
      reponses = {};
      ordre = [];
      for (let i = 0; i < PROFONDEUR_MAX; i++) {
        const en = flow(reponses);
        if (!en.question) break;
        const valeur = candidat[en.question];
        if (valeur === undefined) break;
        const def = QUESTIONS[en.question];
        if (!def || !def.options.some((o) => o.v === valeur)) break;
        reponses[en.question] = valeur;
        ordre.push(en.question);
      }
      return ordre.length;
    }

    /* Critères tranchés, dans l'ordre, pour le récapitulatif et la synthèse. */
    function etapes() {
      return ordre
        .filter((id) => reponses[id] !== undefined)
        .map((id, i) => ({
          index: i,
          id: id,
          valeur: reponses[id],
          option: QUESTIONS[id].options.find((o) => o.v === reponses[id]) || null,
        }));
    }

    /* Nombre approximatif de critères restants, pour situer l'utilisateur.
       Simule la suite du parcours en prenant systématiquement la première option. */
    function resteEstime() {
      const test = Object.assign({}, reponses);
      let n = 0;
      while (n < PROFONDEUR_MAX) {
        const en = flow(test);
        if (!en.question || test[en.question] !== undefined) break;
        test[en.question] = QUESTIONS[en.question].options[0].v;
        n++;
      }
      return Math.max(n - 1, 0);
    }

    return {
      issue: issue,
      noter: noter,
      repondre: repondre,
      revenirA: revenirA,
      reculer: reculer,
      reinitialiser: reinitialiser,
      rejouer: rejouer,
      etapes: etapes,
      resteEstime: resteEstime,
      nbRepondues: nbRepondues,
      nbPosees: function () {
        return ordre.length;
      },
      reponses: function () {
        return Object.assign({}, reponses);
      },
    };
  }

  global.PARCOURS = { creerParcours: creerParcours, PROFONDEUR_MAX: PROFONDEUR_MAX };
})(typeof window !== 'undefined' ? window : globalThis);
