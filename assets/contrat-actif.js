/* ---------------------------------------------------------------------------
   Contrat actif : mémorise le choix du formulaire Expertise pour les autres
   pages (Chiffrage, etc.). Persistance localStorage, même origine.
   --------------------------------------------------------------------------- */

(function (global) {
  'use strict';

  const CLE = 'adh-contrat-actif';

  function lire() {
    try {
      const brut = global.localStorage.getItem(CLE);
      if (!brut) return null;
      return JSON.parse(brut);
    } catch (err) {
      return null;
    }
  }

  function ecrire(contrat) {
    if (!contrat || (!contrat.compagnie && !contrat.numero)) {
      global.localStorage.removeItem(CLE);
      return;
    }
    global.localStorage.setItem(CLE, JSON.stringify(contrat));
  }

  global.CONTRAT_ACTIF = {
    CLE: CLE,
    lire: lire,
    ecrire: ecrire,
  };
})(typeof window !== 'undefined' ? window : global);
