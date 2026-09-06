/* ---------------------------------------------------------------------------
   Moteur de recherche Chiffrage — sans DOM, testable en Node.

   Un ensemble regroupe des postes liés : sélectionner « Désamiantage » affiche
   aussi le diagnostic amiante du même ensemble.
   --------------------------------------------------------------------------- */

(function (global) {
  'use strict';

  function normaliser(s) {
    return String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function preparer(db) {
    const source = db || {};
    const postes = (source.postes || []).map(function (p) {
      return Object.assign({}, p, {
        ensemble: p.ensemble || p.id,
      });
    });
    const ensembles = (source.ensembles || []).slice();
    const idsEnsembles = new Set(ensembles.map(function (e) {
      return e.id;
    }));

    postes.forEach(function (p) {
      if (idsEnsembles.has(p.ensemble)) return;
      ensembles.push({
        id: p.ensemble,
        libelle: p.libelle,
        motsClefs: p.motsClefs || [],
      });
      idsEnsembles.add(p.ensemble);
    });

    return {
      postes: postes,
      ensembles: ensembles,
      tva: source.tva || [],
      indicationsGenerales: source.indicationsGenerales || [],
      indicationsContrat: source.indicationsContrat || [],
      placeholderContrat: source.placeholderContrat || '',
    };
  }

  function postesParEnsemble(db) {
    const map = {};
    (db.postes || []).forEach(function (p) {
      const cle = p.ensemble;
      if (!map[cle]) map[cle] = [];
      map[cle].push(p);
    });
    Object.keys(map).forEach(function (cle) {
      map[cle].sort(function (a, b) {
        if (a.principal && !b.principal) return -1;
        if (!a.principal && b.principal) return 1;
        return (a.libelle || '').localeCompare(b.libelle || '', 'fr', { sensitivity: 'base' });
      });
    });
    return map;
  }

  function metaEnsemble(db, id) {
    return (db.ensembles || []).find(function (e) {
      return e.id === id;
    });
  }

  function texteRechercheEnsemble(db, ensembleId) {
    const meta = metaEnsemble(db, ensembleId) || {};
    const postes = postesParEnsemble(db)[ensembleId] || [];
    const morceaux = [meta.libelle || '', ensembleId]
      .concat(meta.motsClefs || [])
      .concat(
        postes.flatMap(function (p) {
          return [p.libelle, p.note || ''].concat(p.motsClefs || []);
        })
      );
    return normaliser(morceaux.join(' '));
  }

  function libelleEnsemble(db, ensembleId) {
    const meta = metaEnsemble(db, ensembleId);
    if (meta && meta.libelle) return meta.libelle;
    const principal = (postesParEnsemble(db)[ensembleId] || []).find(function (p) {
      return p.principal;
    });
    if (principal) return principal.libelle;
    const premier = (postesParEnsemble(db)[ensembleId] || [])[0];
    return (premier && premier.libelle) || ensembleId;
  }

  function ligneMontant(poste) {
    const montant = String(poste.montant || '').trim();
    const unite = String(poste.unite || '').trim();
    if (!montant) return '';
    return montant + (unite ? ' ' + unite : '');
  }

  function texteCopiePoste(poste) {
    const lignes = [poste.libelle + ' : ' + ligneMontant(poste)];
    if (poste.note) lignes.push(poste.note);
    return lignes.join('\n');
  }

  function tousEnsembles(db) {
    const ids = new Set();
    (db.ensembles || []).forEach(function (e) {
      ids.add(e.id);
    });
    (db.postes || []).forEach(function (p) {
      ids.add(p.ensemble);
    });
    return Array.from(ids)
      .map(function (id) {
        return {
          id: id,
          libelle: libelleEnsemble(db, id),
          postes: postesParEnsemble(db)[id] || [],
        };
      })
      .filter(function (e) {
        return e.postes.length;
      })
      .sort(function (a, b) {
        return a.libelle.localeCompare(b.libelle, 'fr', { sensitivity: 'base' });
      });
  }

  function rechercher(db, query) {
    const q = normaliser(query);
    const liste = tousEnsembles(db);
    if (!q) return liste;
    return liste.filter(function (e) {
      return texteRechercheEnsemble(db, e.id).indexOf(q) !== -1;
    });
  }

  function ensembleParId(db, ensembleId) {
    const postes = postesParEnsemble(db)[ensembleId] || [];
    if (!postes.length) return null;
    return {
      id: ensembleId,
      libelle: libelleEnsemble(db, ensembleId),
      postes: postes,
    };
  }

  function ensembleDepuisPoste(db, posteId) {
    const poste = (db.postes || []).find(function (p) {
      return p.id === posteId;
    });
    if (!poste) return null;
    return ensembleParId(db, poste.ensemble);
  }

  /* Filtre les indications contrat sur la fiche choisie dans Expertise :
     numéro exact, puis type + compagnie, puis compagnie seule. */
  function indicationsContratPour(db, contrat) {
    const fiches = (db && db.indicationsContrat) || [];
    const vide = { fiches: [], lignes: [] };
    if (!contrat || !contrat.compagnie) return vide;

    const numero = contrat.numero || '';
    const cie = contrat.compagnie || '';
    const type = contrat.typeContrat || '';

    let retenues = fiches.filter(function (f) {
      return f.numero && f.numero === numero && (!f.compagnie || f.compagnie === cie);
    });
    if (!retenues.length) {
      retenues = fiches.filter(function (f) {
        return !f.numero && f.compagnie === cie && f.typeContrat === type;
      });
    }
    if (!retenues.length) {
      retenues = fiches.filter(function (f) {
        return !f.numero && !f.typeContrat && f.compagnie === cie;
      });
    }

    return {
      fiches: retenues,
      lignes: retenues.reduce(function (acc, f) {
        return acc.concat(f.lignes || []);
      }, []),
    };
  }

  global.CHIFFRAGE = {
    normaliser: normaliser,
    preparer: preparer,
    postesParEnsemble: postesParEnsemble,
    libelleEnsemble: libelleEnsemble,
    ligneMontant: ligneMontant,
    texteCopiePoste: texteCopiePoste,
    tousEnsembles: tousEnsembles,
    rechercher: rechercher,
    ensembleParId: ensembleParId,
    ensembleDepuisPoste: ensembleDepuisPoste,
    indicationsContratPour: indicationsContratPour,
  };
})(typeof window !== 'undefined' ? window : global);
