/* ---------------------------------------------------------------------------
   Textes prêts à coller dans les onglets d’un dossier d’expertise.

   Fonction pure : à partir des réponses, de la conclusion et, le cas échéant,
   des mentions de dossier saisies par l’expert. Les crochets [ainsi] signalent
   ce que le contrat ou le constat de visite doivent encore préciser.
   --------------------------------------------------------------------------- */

(function (global) {
  'use strict';

  function libelle(questions, id, valeur) {
    const def = questions[id];
    if (!def || valeur == null) return '';
    const o = def.options.find((x) => x.v === valeur);
    return o ? o.l : String(valeur);
  }

  function renseigne(valeur) {
    return valeur != null && String(valeur).trim() !== '';
  }

  function injecter(texte, dossier) {
    const d = dossier || {};
    const paires = [
      ['[réf. dossier]', d.ref],
      ['[assuré]', d.assure],
      ['[compagnie]', d.compagnie],
      ['[contrat]', d.contrat],
      ['[franchise]', d.franchise],
      ['[montant HT]', d.montant],
      ['[cause]', d.cause],
    ];
    let out = texte;
    paires.forEach(([ph, val]) => {
      if (renseigne(val)) out = out.split(ph).join(String(val).trim());
    });
    return out;
  }

  function evenement(r) {
    if (r.evenement === 'dde') return 'dégât des eaux';
    if (r.evenement === 'incendie') return 'incendie ou explosion';
    return 'péril autre que le dégât des eaux et l’incendie';
  }

  function bien(r) {
    if (r.immeuble === 'copropriete') return 'un immeuble en copropriété';
    if (r.immeuble === 'monopropriete') return 'un immeuble collectif en monopropriété';
    if (r.immeuble === 'individuel') return 'une maison individuelle ou un local isolé';
    return 'un bien dont la nature reste à qualifier';
  }

  function paragrapheMission(r) {
    return (
      'Mission d’expertise après sinistre mandatée par [compagnie] pour le compte de [assuré] (référence [réf. dossier]). ' +
      'Contrat concerné : [contrat]. Bien sinistré : ' +
      bien(r) +
      '. Événement déclaré : ' +
      evenement(r) +
      '. Cause retenue : [cause].'
    );
  }

  function montantConnu(d) {
    return renseigne(d.montant) ? d.montant.trim() + ' € HT' : null;
  }

  function blocQualification(r, res, questions, d) {
    const lignes = [];
    lignes.push(paragrapheMission(r));
    lignes.push('');
    lignes.push('Qualification conventionnelle : ' + res.fiche.titre + '.');
    if (res.fiche.nomComplet) lignes.push(res.fiche.nomComplet + '.');
    if (res.motif) lignes.push(res.motif);
    const m = montantConnu(d);
    lignes.push(
      'Montant retenu pour le local examiné : ' +
        (m || '[montant HT] € HT') +
        ' (dommages matériels, recherche de fuite et mesures conservatoires inclus, pertes immatérielles exclues).'
    );
    if (r.adhesion === 'oui') {
      lignes.push('Les assureurs concernés sont tenus pour adhérents aux conventions mobilisées.');
    } else if (r.adhesion === 'non') {
      lignes.push('L’adhésion de l’ensemble des assureurs n’est pas établie : la convention n’est opposable qu’entre adhérents.');
    }
    return lignes.join('\n');
  }

  function blocGestion(r, res) {
    const lignes = [];
    if (res.gestionnaire) {
      lignes.push('Assureur gestionnaire désigné : ' + res.gestionnaire + '.');
      lignes.push('En présence de plusieurs locaux sinistrés, cette désignation s’apprécie local par local.');
    }
    if (res.repartition && res.repartition.length) {
      lignes.push('Répartition de la charge retenue pour ce sinistre :');
      res.repartition.forEach((x) => lignes.push('— ' + x));
      lignes.push('Le mobilier et le contenu restent hors répartition conventionnelle : chaque assureur les traite selon son contrat.');
    }
    if (!lignes.length) {
      lignes.push('Aucun assureur gestionnaire unique n’est désigné. Chaque assureur instruit et règle les dommages de son assuré dans les conditions de son contrat. Les recours, s’ils sont ouverts, relèvent du droit commun.');
    }
    return lignes.join('\n');
  }

  function blocDommages(r, questions) {
    const lignes = [];
    if (r.natureDommages) {
      lignes.push('Nature des dommages retenue : ' + libelle(questions, 'natureDommages', r.natureDommages) + '.');
    } else {
      lignes.push('Nature des dommages : à qualifier sur place entre parties immobilières, embellissements et mobilier.');
    }
    lignes.push('');
    lignes.push('Rappel de qualification, à trancher poste par poste :');
    lignes.push('— Parties immobilières : gros œuvre, cloisons, planchers, plafonds hors revêtement, réseaux et installations fixés à demeure, menuiseries extérieures d’origine.');
    lignes.push('— Embellissements : peintures, papiers peints, enduits décoratifs, revêtements de sol collés ou flottants.');
    lignes.push('— Mobilier et contenu : meubles, électroménager non encastré, effets personnels — hors CIDECOP et CIDEPIEC.');
    lignes.push('');
    lignes.push('En cas de doute (carrelage scellé ou collé, parquet d’origine ou flottant, cuisine équipée), la qualification est un constat d’expertise, pas une décision de gestion.');
    return lignes.join('\n');
  }

  function blocChiffrage(r, res, seuils, d) {
    const lignes = [];
    const m = montantConnu(d);
    lignes.push('Assiette à retenir pour comparer aux seuils conventionnels :');
    lignes.push('— Montant hors taxes des dommages matériels du local, pris isolément.');
    lignes.push('— Frais de recherche de fuite et mesures conservatoires inclus.');
    lignes.push('— Pertes immatérielles exclues (privation de jouissance, relogement, honoraires de maîtrise d’œuvre, préjudices financiers).');
    lignes.push('');
    lignes.push(
      'Seuils de référence : tranche 1 IRSI jusqu’à ' +
        seuils.irsiTranche1.toLocaleString('fr-FR') +
        ' € HT ; tranche 2 jusqu’à ' +
        seuils.irsiPlafond.toLocaleString('fr-FR') +
        ' € HT ; au-delà, sortie d’IRSI. Seuil CIDEPIEC : ' +
        seuils.cidepiecSeuil.toLocaleString('fr-FR') +
        ' € en principal, hors honoraires d’expert.'
    );
    if (m) lignes.push('Estimation portée au présent local : ' + m + '.');
    if (String(res.cle).startsWith('IRSI')) {
      lignes.push('Un même sinistre peut relever de tranches différentes d’un local à l’autre. Le local qui dépasse ' + seuils.irsiPlafond.toLocaleString('fr-FR') + ' € HT sort d’IRSI, sans emporter automatiquement les autres locaux.');
    }
    lignes.push('');
    lignes.push('Hors assiette conventionnelle, et toujours au contrat : franchise' + (renseigne(d.franchise) ? ' (' + d.franchise.trim() + ')' : ' [franchise]') + ', vétusté ou valeur à neuf, plafonds de garantie, TVA selon le régime de l’assuré.');
    return lignes.join('\n');
  }

  function blocConduite(res) {
    if (!res.actions || !res.actions.length) return '';
    return res.actions.map((x, i) => i + 1 + '. ' + x).join('\n');
  }

  function blocObservations(r, res, d) {
    const lignes = [];
    if (res.vigilance && res.vigilance.length) {
      res.vigilance.forEach((x) => lignes.push('— ' + x));
    }
    lignes.push('— Vérifier les conditions particulières du contrat' + (renseigne(d.contrat) ? ' (' + d.contrat.trim() + ')' : '') + ' : franchise, vétusté, valeur à neuf, plafonds, exclusion éventuelle des embellissements.');
    if (r.adhesion !== 'non') {
      lignes.push('— Confirmer l’adhésion des assureurs concernés auprès de France Assureurs avant de fonder la gestion sur la convention.');
    }
    if (r.evenement === 'dde') {
      lignes.push('— Documenter l’origine de la fuite (privative / commune / voisine) : elle éclaire la responsabilité, même lorsque le recours est abandonné en IRSI tranche 1.');
    }
    lignes.push('— Analyse indicative, à confronter au texte conventionnel en vigueur et aux garanties souscrites.');
    return lignes.join('\n');
  }

  function blocConclusions(r, res, d) {
    const lignes = [];
    lignes.push(paragrapheMission(r));
    lignes.push('');
    lignes.push('Avis de l’expert sur le régime applicable : ' + res.fiche.titre + '.');
    if (res.motif) lignes.push(res.motif);
    if (res.gestionnaire) {
      lignes.push('Désignation : ' + res.gestionnaire + '.');
    }
    if (res.repartition && res.repartition.length) {
      lignes.push('Répartition : ' + res.repartition.join(' '));
    }
    if (res.actions && res.actions.length) {
      lignes.push('Conduite proposée : ' + res.actions.join(' '));
    }
    lignes.push('');
    lignes.push('Cet avis porte sur la qualification conventionnelle et la conduite du dossier. Il ne préjuge pas du chiffrage définitif, ni de l’application des garanties, franchises et plafonds du contrat.');
    return lignes.join('\n');
  }

  function textesDossier(reponses, resultat, dossier) {
    const rules = global.RULES || {};
    const questions = rules.QUESTIONS || {};
    const seuils = rules.SEUILS || { irsiTranche1: 1600, irsiPlafond: 5000, cidepiecSeuil: 320 };
    const r = reponses || {};
    const res = resultat || { fiche: { titre: '', nomComplet: '' }, cle: '' };
    const d = dossier || {};

    const brut = [
      { id: 'qualification', onglet: 'Qualification / convention', texte: blocQualification(r, res, questions, d) },
      { id: 'gestion', onglet: 'Gestionnaire / répartition', texte: blocGestion(r, res) },
      { id: 'dommages', onglet: 'Nature des dommages', texte: blocDommages(r, questions) },
      { id: 'chiffrage', onglet: 'Assiette de chiffrage', texte: blocChiffrage(r, res, seuils, d) },
      { id: 'conduite', onglet: 'Conduite du dossier', texte: blocConduite(res) },
      { id: 'observations', onglet: 'Observations', texte: blocObservations(r, res, d) },
      { id: 'conclusions', onglet: 'Conclusions / avis', texte: blocConclusions(r, res, d) },
    ];

    return brut
      .filter((b) => b.texte && b.texte.trim())
      .map((b) => ({
        id: b.id,
        onglet: b.onglet,
        texte: injecter(b.texte.trim(), d),
      }));
  }

  global.TEXTES = { textesDossier };
})(typeof window !== 'undefined' ? window : global);
