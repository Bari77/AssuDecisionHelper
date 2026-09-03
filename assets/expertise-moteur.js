/* ---------------------------------------------------------------------------
   Moteur de résolution des fiches contrat.

   Entrée : compagnie + type de contrat + numéro + option (+ nature, optionnelle).
   Sortie : libellé calculé, capitaux, frais.

   Sans DOM, donc testable. Le référentiel vit dans data/expertise.json ; les
   fiches contrat vivent dans data/compagnies/<compagnie>.json et arrivent au
   fil du besoin. Tant qu'un fichier de compagnie n'est pas arrivé, ses fiches
   sont représentées par des amorces issues de l'index : elles suffisent à
   proposer le numéro et à deviner la compagnie, et la résolution répond
   « chargement » plutôt que « inconnu ».
   --------------------------------------------------------------------------- */

(function (global) {
  'use strict';

  function normaliserTexte(s) {
    return String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function normaliserNumero(s) {
    return String(s || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  function optionEstVide(s) {
    const n = normaliserTexte(s);
    return !n || n === 'option';
  }

  function compagniesOk(contrat, compagnie) {
    if (!compagnie || !contrat.compagnie) return false;
    return normaliserTexte(contrat.compagnie) === normaliserTexte(compagnie);
  }

  function scoreNumero(saisi, contrat) {
    const a = normaliserNumero(saisi);
    const b = normaliserNumero(contrat.numero);
    if (!a || !b) return 0;
    if (a === b) return 1000 + b.length;
    if (b.startsWith(a) || a.startsWith(b)) return 100 + Math.min(a.length, b.length);
    if (b.includes(a) || a.includes(b)) return 10 + Math.min(a.length, b.length);
    return 0;
  }

  function naturesOk(contrat, nature) {
    if (!contrat.natures || !contrat.natures.length) return true;
    if (!nature) return true;
    return contrat.natures.indexOf(nature) !== -1;
  }

  function trouverOption(fiche, optionSaisie) {
    const options = fiche.options || [];
    if (!options.length) return null;
    if (optionEstVide(optionSaisie)) {
      return options.find((o) => optionEstVide(o.libelle)) || null;
    }
    const cible = normaliserTexte(optionSaisie);
    return options.find((o) => normaliserTexte(o.libelle) === cible) || null;
  }

  /* ---------------------------------------------------------------------------
     Héritage. Un fichier de compagnie ne répète jamais ce que dit son parent :

       compagnie         écrite en tête du fichier, servie à toutes ses fiches
       statut, sourceRef descendent de la fiche vers ses options, puis de
                         l'option vers chacun de ses postes
       libelle           calculé « compagnie - type - numéro » s'il n'est pas
                         écrit

     Un champ écrit l'emporte toujours sur celui du parent.

     N'héritent volontairement PAS : typeContrat et nomContrat. Ils décrivent le
     produit, pas l'assureur ; un même fichier finira par porter une MRH et une
     MRP. Un défaut d'en-tête y serait silencieusement faux, alors qu'un champ
     manquant est refusé par le test. Chaque fiche déclare donc son type.

     Tout se joue ici : la résolution, elle, voit des fiches complètes.
     --------------------------------------------------------------------------- */

  function heriter(objet, defauts) {
    const sortie = Object.assign({}, objet);
    Object.keys(defauts).forEach(function (cle) {
      if (sortie[cle] == null && defauts[cle] != null) sortie[cle] = defauts[cle];
    });
    return sortie;
  }

  function libelleParDefaut(fiche) {
    return [fiche.compagnie, fiche.typeContrat, fiche.numero].filter(Boolean).join(' - ');
  }

  function completerFiche(fiche, entete) {
    const complete = heriter(fiche, { compagnie: entete.compagnie });
    if (!complete.libelle) complete.libelle = libelleParDefaut(complete);

    complete.options = (fiche.options || []).map(function (option) {
      const o = heriter(option, { statut: complete.statut, sourceRef: complete.sourceRef });
      /* Le statut qualifie chaque poste dans l'interface : il descend jusque-là.
         La source, elle, est lue au niveau de l'option par resoudre(). */
      const posteHerite = { statut: o.statut };
      if (option.capitaux) o.capitaux = option.capitaux.map((c) => heriter(c, posteHerite));
      if (option.frais) o.frais = option.frais.map((f) => heriter(f, posteHerite));
      return o;
    });
    return complete;
  }

  /* Fiches d'un fichier de compagnie, complétées. Fonctionne aussi sur le
     référentiel, dont l'en-tête ne porte pas de compagnie : chaque fiche
     déclare alors la sienne. */
  function completerPaquet(paquet) {
    const entete = paquet || {};
    return (entete.contrats || []).map((fiche) => completerFiche(fiche, entete));
  }

  function cleFiche(fiche) {
    return normaliserTexte(fiche.compagnie) + '|' + fiche.typeContrat + '|' + normaliserNumero(fiche.numero);
  }

  /* Amorces : les clés de recherche d'une compagnie dont le fichier n'est pas
     encore arrivé. Elles ne portent aucun régime, seulement de quoi être
     trouvées. */
  function amorces(db) {
    const index = (db && db.fichesParCompagnie) || {};
    const liste = [];
    Object.keys(index).forEach(function (compagnie) {
      (index[compagnie].references || []).forEach(function (ref) {
        liste.push({
          compagnie: compagnie,
          typeContrat: ref.typeContrat,
          numero: ref.numero,
          differe: true,
        });
      });
    });
    return liste;
  }

  /* Base de départ : référentiel + amorces de l'index. Les fiches écrites en
     dur dans le référentiel, s'il y en a, sont conservées. */
  function preparer(referentiel) {
    const base = Object.assign({}, referentiel);
    const propres = completerPaquet(referentiel);
    const vues = new Set(propres.map(cleFiche));
    base.contrats = propres.concat(amorces(base).filter((a) => !vues.has(cleFiche(a))));
    base.sources = Object.assign({}, (referentiel && referentiel.sources) || {});
    return base;
  }

  /* Intègre un fichier de compagnie : ses fiches remplacent les amorces (et
     toute version antérieure) de la même compagnie. Renvoie une nouvelle base,
     l'ancienne n'est pas modifiée. */
  function fusionner(db, paquet) {
    if (!paquet || !paquet.compagnie) return db;
    const cible = normaliserTexte(paquet.compagnie);
    const arrivantes = completerPaquet(paquet);
    const remplacees = new Set(arrivantes.map(cleFiche));

    const contrats = (db.contrats || [])
      .filter(function (fiche) {
        if (normaliserTexte(fiche.compagnie) !== cible) return true;
        /* Une amorce de cette compagnie disparaît ; une fiche écrite en dur
           dans le référentiel ne survit que si le paquet ne la redéfinit pas. */
        return !fiche.differe && !remplacees.has(cleFiche(fiche));
      })
      .concat(arrivantes);

    return Object.assign({}, db, {
      contrats: contrats,
      sources: Object.assign({}, db.sources || {}, paquet.sources || {}),
      compagniesChargees: (db.compagniesChargees || []).concat([paquet.compagnie]),
    });
  }

  function fichierCompagnie(db, compagnie) {
    const index = (db && db.fichesParCompagnie) || {};
    const cible = normaliserTexte(compagnie);
    const nom = Object.keys(index).find((c) => normaliserTexte(c) === cible);
    return nom ? index[nom].fichier || null : null;
  }

  function filtrerContrats(db, saisie) {
    const liste = (db && db.contrats) || [];
    return liste.filter((c) => {
      if (saisie.compagnie && !compagniesOk(c, saisie.compagnie)) return false;
      if (saisie.typeContrat && c.typeContrat !== saisie.typeContrat) return false;
      if (!naturesOk(c, saisie.nature)) return false;
      return true;
    });
  }

  function resoudre(db, saisie) {
    const s = saisie || {};
    if (!s.compagnie || !s.typeContrat) {
      return { statut: 'incomplet', motif: 'Choisir la compagnie et le type de contrat.' };
    }

    const vivier = filtrerContrats(db, s);
    if (!vivier.length) {
      return { statut: 'inconnu', motif: 'Aucune fiche pour cette compagnie et ce type de contrat.' };
    }

    if (!normaliserNumero(s.numero)) {
      return {
        statut: 'incomplet',
        motif: 'Saisir le numéro ou la formule du contrat pour calculer les capitaux.',
        numeros: numerosPour(db, s.compagnie, s.typeContrat, s.nature),
      };
    }

    const notes = vivier
      .map((contrat) => ({ contrat, score: scoreNumero(s.numero, contrat) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);

    if (!notes.length) {
      return {
        statut: 'inconnu',
        motif: 'Numéro de contrat non référencé pour cette compagnie.',
        numeros: numerosPour(db, s.compagnie, s.typeContrat, s.nature),
      };
    }

    if (notes.length > 1 && notes[0].score === notes[1].score) {
      return {
        statut: 'ambigu',
        motif: 'Plusieurs formules correspondent à ce numéro. Préciser le millésime.',
        numeros: notes.filter((n) => n.score === notes[0].score).map((n) => n.contrat.numero),
      };
    }

    const fiche = notes[0].contrat;

    if (fiche.differe) {
      return {
        statut: 'chargement',
        motif: 'Fiche contrat en cours de téléchargement…',
        compagnie: fiche.compagnie,
        fichier: fichierCompagnie(db, fiche.compagnie),
      };
    }

    if (!(fiche.options || []).length) {
      return {
        statut: 'documente',
        motif: "Référence identifiée, mais aucun régime d'indemnisation n'est documenté à ce jour.",
        contrat: fiche,
        libelle: fiche.libelle,
        options: [],
        capitaux: [],
        frais: [],
        source: sourcePour(db, fiche.sourceRef),
        remarques: remarquesDe(fiche, null),
        pointsVigilance: fiche.pointsVigilance || [],
        qualite: fiche.statut || '',
      };
    }

    const option = trouverOption(fiche, s.option);
    if (!option) {
      /* Une fiche dont toutes les options sont nommées n'a pas de régime par
         défaut : rien n'a été mal saisi, il reste à choisir la formule. */
      const aChoisir = optionEstVide(s.option);
      return {
        statut: 'inconnu',
        motif: aChoisir
          ? 'Préciser la formule souscrite : cette référence en compte plusieurs.'
          : 'Option non référencée pour cette formule.',
        contrat: fiche,
        options: (fiche.options || []).map((o) => o.libelle || ''),
        source: sourcePour(db, fiche.sourceRef),
        remarques: remarquesDe(fiche, null),
        qualite: fiche.statut || '',
      };
    }

    return {
      statut: 'ok',
      contrat: fiche,
      option: option,
      libelle: fiche.libelle,
      capitaux: option.capitaux || [],
      frais: option.frais || [],
      source: sourcePour(db, option.sourceRef || fiche.sourceRef),
      remarques: remarquesDe(fiche, option),
      pointsVigilance: fiche.pointsVigilance || [],
      qualite: option.statut || fiche.statut || '',
    };
  }

  /* Table sources : une fiche, une option, un capital ou un frais porte une clé
     sourceRef ; les fiches antérieures n'en portent aucune et remontent null. */
  function sourcePour(db, ref) {
    if (!ref) return null;
    const table = (db && db.sources) || {};
    const source = table[ref];
    if (!source) return null;
    return Object.assign({ id: ref }, source);
  }

  function remarquesDe(fiche, option) {
    const liste = [].concat(fiche.remarques || []);
    if (option && option.remarque) liste.push(option.remarque);
    return liste;
  }

  function numerosPour(db, compagnie, typeContrat, nature) {
    return filtrerContrats(db, { compagnie, typeContrat, nature }).map((c) => c.numero);
  }

  function optionsPour(db, compagnie, typeContrat, numero, nature) {
    const issue = resoudre(db, { compagnie, typeContrat, numero, nature, option: '' });
    const fiche = issue.contrat || (issue.statut === 'ok' ? issue.contrat : null);
    if (fiche && fiche.options) return fiche.options.map((o) => o.libelle || '');
    const vivier = filtrerContrats(db, { compagnie, typeContrat, nature });
    if (numero) {
      const notes = vivier
        .map((c) => ({ c, score: scoreNumero(numero, c) }))
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score);
      if (notes[0] && notes[0].c.options) return notes[0].c.options.map((o) => o.libelle || '');
    }
    const toutes = [];
    vivier.forEach((c) => {
      (c.options || []).forEach((o) => {
        const l = o.libelle || '';
        if (toutes.indexOf(l) === -1) toutes.push(l);
      });
    });
    return toutes;
  }

  /* Variantes d'un modèle. Chacune déclare le champ qui la commande — une case
     à cocher du formulaire — et son libellé : la case vit dans le référentiel,
     pas dans le HTML, comme les autres champs propres à une nature. */
  function variantesDe(modele) {
    return ((modele && modele.variantes) || []).filter(function (v) {
      return v && v.champ && v.causesCirconstances;
    });
  }

  /* Une variante cochée réécrit les causes et circonstances : un phénomène de
     vent localisé ne se raconte pas comme une tempête nommée, et deux textes
     séparés se relisent mieux qu'un seul criblé de conditions. Le texte de
     dommages constatés, lui, reste celui du modèle. */
  function modelePour(db, nature, champs) {
    const modeles = (db && db.modeles) || {};
    const base = modeles[nature] || modeles._defaut || { causesCirconstances: '', dommages: '' };
    const active = variantesDe(base).find(function (v) {
      return estAffirmatif((champs || {})[v.champ]);
    });
    if (!active) return base;
    return Object.assign({}, base, { causesCirconstances: active.causesCirconstances });
  }

  /* Un modèle porte des variables {{cle}} et des blocs conditionnels
     {{#cle}}…{{/cle}}, gardés seulement si la réponse est affirmative, ou
     {{^cle}}…{{/cle}} pour le cas contraire — de quoi écrire une constatation
     et sa négation sans dédoubler le modèle. Le saut de ligne se met à
     l'intérieur du bloc, sinon un paragraphe écarté laisse une ligne vide
     derrière lui. */
  const BLOC_CONDITIONNEL = /\{\{([#^])(\w+)\}\}([\s\S]*?)\{\{\/\2\}\}/g;

  function estAffirmatif(valeur) {
    const t = String(valeur == null ? '' : valeur)
      .trim()
      .toLowerCase();
    return t !== '' && t !== 'non' && t !== 'false' && t !== '0';
  }

  function interpoler(modele, champs) {
    const vars = champs || {};
    let texte = String(modele || '');

    /* Boucle : un bloc peut en contenir un autre. */
    let precedent;
    do {
      precedent = texte;
      texte = texte.replace(BLOC_CONDITIONNEL, function (_, signe, cle, contenu) {
        return estAffirmatif(vars[cle]) === (signe === '#') ? contenu : '';
      });
    } while (texte !== precedent);

    return texte.replace(/\{\{(\w+)\}\}/g, function (_, cle) {
      const v = vars[cle];
      if (v == null || String(v).trim() === '') return '[' + cle + ']';
      return String(v).trim();
    });
  }

  /* Clés qu'un modèle utilise réellement, variables et blocs confondus : le
     formulaire n'affiche que les champs correspondants. */
  function variablesDe(modele) {
    const cles = [];
    String(modele || '').replace(/\{\{[#^/]?(\w+)\}\}/g, function (_, cle) {
      if (cles.indexOf(cle) === -1) cles.push(cle);
      return '';
    });
    return cles;
  }

  function decouperDate(valeur) {
    const m = String(valeur || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return null;
    return { annee: parseInt(m[1], 10), mois: parseInt(m[2], 10), jour: parseInt(m[3], 10) };
  }

  /* « 1er » et non « 1 » : le texte part dans un rapport. */
  function jourEnLettres(jour) {
    return jour === 1 ? '1er' : String(jour);
  }

  function formaterDate(valeur) {
    if (!valeur) return '';
    const m = String(valeur).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return String(valeur);
    const mois = [
      'janvier',
      'février',
      'mars',
      'avril',
      'mai',
      'juin',
      'juillet',
      'août',
      'septembre',
      'octobre',
      'novembre',
      'décembre',
    ];
    return jourEnLettres(parseInt(m[3], 10)) + ' ' + mois[parseInt(m[2], 10) - 1] + ' ' + m[1];
  }

  function nomDuMois(numero) {
    const mois = [
      'janvier',
      'février',
      'mars',
      'avril',
      'mai',
      'juin',
      'juillet',
      'août',
      'septembre',
      'octobre',
      'novembre',
      'décembre',
    ];
    return mois[numero - 1] || '';
  }

  /* Période d'un sinistre étalé sur une ou deux journées, sans répéter ce que
     les deux dates ont en commun : « Entre le 11 et le 12 février 2026 »,
     « Entre le 31 janvier et le 1er février 2026 », « Le 11 février 2026 ». */
  function periodeSinistre(debut, fin) {
    const d = decouperDate(debut);
    if (!d) return '';
    const f = decouperDate(fin);
    const seul = 'Le ' + formaterDate(debut);
    if (!f) return seul;

    const rangDebut = d.annee * 10000 + d.mois * 100 + d.jour;
    const rangFin = f.annee * 10000 + f.mois * 100 + f.jour;
    if (rangFin <= rangDebut) return seul;

    if (d.annee === f.annee && d.mois === f.mois) {
      return 'Entre le ' + jourEnLettres(d.jour) + ' et le ' + formaterDate(fin);
    }
    if (d.annee === f.annee) {
      return 'Entre le ' + jourEnLettres(d.jour) + ' ' + nomDuMois(d.mois) + ' et le ' + formaterDate(fin);
    }
    return 'Entre le ' + formaterDate(debut) + ' et le ' + formaterDate(fin);
  }

  /* Genre lu dans une phrase qui nomme le bien : c'est son article qui décide.
     « propriétaire occupant d'une maison individuelle » → féminin.
     « d'une » ne peut pas être pris pour « d'un » : la limite de mot \b tombe
     après « un », et « une » n'en a pas à cet endroit. */
  function genreDansPhrase(phrase) {
    const t = String(phrase || '');
    if (/\bd['’]une\b/i.test(t)) return 'f';
    if (/\bd['’]un\b/i.test(t)) return 'm';
    return '';
  }

  /* Accord du participe et de l'article sur le bien décrit : « d'une maison
     individuelle située » contre « d'un appartement situé ».

     La qualité saisie nomme le bien, elle a donc le dernier mot. À défaut
     d'article dans la qualité, le genre est celui déclaré pour le type de bien
     dans le référentiel (genresTypeBien) ; le masculin reste le repli. */
  function accordDuBien(db, qualite, typeBien) {
    const genres = (db && db.genresTypeBien) || {};
    const genre = genreDansPhrase(qualite) || String(genres[typeBien] || '').toLowerCase();
    const feminin = genre === 'f';
    return {
      typeBienArticle: feminin ? "d'une" : "d'un",
      situe: feminin ? 'située' : 'situé',
    };
  }

  /* Sections de la page « Phrases type ». */
  function phrasesTypePour(db) {
    return ((db && db.phrasesType) || []).map(function (section) {
      return {
        titre: section.titre || '',
        phrases: (section.phrases || []).filter(function (p) {
          return String(p || '').trim() !== '';
        }),
      };
    });
  }

  global.EXPERTISE = {
    resoudre: resoudre,
    numerosPour: numerosPour,
    optionsPour: optionsPour,
    modelePour: modelePour,
    variantesDe: variantesDe,
    interpoler: interpoler,
    variablesDe: variablesDe,
    formaterDate: formaterDate,
    periodeSinistre: periodeSinistre,
    accordDuBien: accordDuBien,
    normaliserNumero: normaliserNumero,
    optionEstVide: optionEstVide,
    phrasesTypePour: phrasesTypePour,
    sourcePour: sourcePour,
    preparer: preparer,
    fusionner: fusionner,
    fichierCompagnie: fichierCompagnie,
    completerPaquet: completerPaquet,
  };
})(typeof window !== 'undefined' ? window : global);
