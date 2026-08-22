/* ---------------------------------------------------------------------------
   Base de connaissance — conventions d'indemnisation entre assureurs
   applicables aux sinistres survenant dans les immeubles collectifs.

   Ce fichier est le SEUL à modifier en cas d'évolution conventionnelle :
   seuils, périmètres, libellés et arbre de décision y sont centralisés.
   --------------------------------------------------------------------------- */

/* Seuils monétaires (dommages matériels, hors taxes) */
const SEUILS = {
  irsiTranche1: 1600, // limite haute de la tranche 1 IRSI, en € HT par local sinistré
  irsiPlafond: 5000, // limite haute du champ IRSI, en € HT par local sinistré
  cidepiecSeuil: 320, // seuil d'application CIDEPIEC, hors honoraires d'expert
};

const eur = (n) => n.toLocaleString('fr-FR') + ' € HT';

/* Tranche IRSI d'un montant HT déjà estimé pour un local. 1 600 € inclus
   reste en tranche 1 ; au-delà et jusqu'à 5 000 € inclus, tranche 2. */
function trancheIrsi(montant) {
  const n = Number(montant);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n <= SEUILS.irsiTranche1) return 't1';
  if (n <= SEUILS.irsiPlafond) return 't2';
  return 'hors';
}

/* ---------------------------------------------------------------------------
   Fiches conventions
   --------------------------------------------------------------------------- */

const CONVENTIONS = {
  IRSI_T1: {
    code: 'IRSI',
    tone: 'irsi',
    badge: 'Tranche 1',
    titre: 'Convention IRSI — Tranche 1',
    nomComplet: 'Convention d’Indemnisation et de Recours des Sinistres Immeuble',
    accroche: `Dommages ≤ ${eur(SEUILS.irsiTranche1)} par local sinistré : gestion par un assureur unique, sans recours entre assureurs.`,
    blocs: [
      {
        t: 'Mécanisme',
        p: [
          'L’assureur gestionnaire instruit et règle le sinistre pour le compte de qui il appartiendra, y compris pour les lésés qui ne sont pas ses assurés.',
          'Abandon de recours entre assureurs adhérents : aucune action récursoire n’est exercée, même si un responsable est identifié.',
        ],
      },
      {
        t: 'Expertise',
        p: [
          'Pas d’expertise pour compte commun imposée par la convention. L’assureur gestionnaire évalue les dommages selon ses propres modalités.',
        ],
      },
      {
        t: 'Recherche de fuite',
        p: [
          'Prise en charge par l’assureur gestionnaire, y compris les mesures conservatoires. Ces frais entrent dans le calcul du seuil de tranche.',
        ],
      },
    ],
  },

  IRSI_T2: {
    code: 'IRSI',
    tone: 'irsi',
    badge: 'Tranche 2',
    titre: 'Convention IRSI — Tranche 2',
    nomComplet: 'Convention d’Indemnisation et de Recours des Sinistres Immeuble',
    accroche: `Dommages de ${eur(SEUILS.irsiTranche1)} à ${eur(SEUILS.irsiPlafond)} par local sinistré : gestion par un assureur unique, avec expertise et recours.`,
    blocs: [
      {
        t: 'Mécanisme',
        p: [
          'L’assureur gestionnaire instruit le sinistre pour l’ensemble des lésés et règle les indemnités.',
          'Le recours est ouvert : après règlement, l’assureur gestionnaire se retourne contre l’assureur du responsable pour obtenir remboursement.',
        ],
      },
      {
        t: 'Expertise',
        p: [
          'Expertise pour compte commun diligentée par l’assureur gestionnaire. Les conclusions de l’expert sont opposables aux autres assureurs adhérents.',
        ],
      },
      {
        t: 'Recherche de fuite',
        p: [
          'Prise en charge par l’assureur gestionnaire, mesures conservatoires incluses. Ces frais entrent dans le calcul du seuil de tranche.',
        ],
      },
    ],
  },

  CIDECOP: {
    code: 'CIDECOP',
    tone: 'cidecop',
    badge: 'Dégât des eaux',
    titre: 'Convention CIDECOP',
    nomComplet: 'Convention d’Indemnisation des Dégâts des Eaux dans la COPropriété',
    accroche: `Dégâts des eaux en copropriété hors champ IRSI, notamment au-delà de ${eur(SEUILS.irsiPlafond)} par local sinistré.`,
    blocs: [
      {
        t: 'Mécanisme',
        p: [
          'Pas d’assureur gestionnaire unique : la convention répartit la charge par nature de dommage, chaque assureur indemnisant son propre assuré.',
          'Renonciation réciproque à recours entre assureurs adhérents pour les postes ainsi répartis.',
        ],
      },
      {
        t: 'Répartition de la charge',
        p: [
          'Assureur du syndicat des copropriétaires : parties immobilières, communes comme privatives (gros œuvre, cloisons, planchers, plafonds, installations fixes).',
          'Assureur du copropriétaire ou de l’occupant : embellissements (papiers peints, peintures, enduits décoratifs, revêtements de sol collés).',
        ],
      },
      {
        t: 'Limites',
        p: [
          'Chaque assureur intervient dans les conditions et limites de son propre contrat. Le mobilier et le contenu restent hors répartition conventionnelle.',
        ],
      },
    ],
  },

  CIDEPIEC: {
    code: 'CIDEPIEC',
    tone: 'cidepiec',
    badge: 'Périls étendus',
    titre: 'Convention CIDEPIEC',
    nomComplet:
      'Convention d’Indemnisation des Dommages aux Parties Immobilières et aux Embellissements dans les immeubles en Copropriété',
    accroche:
      'Dommages immobiliers et embellissements en copropriété causés par un péril autre que le dégât des eaux de fréquence — et dégâts des eaux non couverts par IRSI ni CIDECOP.',
    blocs: [
      {
        t: 'Périls visés',
        p: [
          'Incendie, explosion, foudre, tempête, grêle, neige, catastrophe naturelle, attentat, choc de véhicule terrestre à moteur, vol et vandalisme.',
          'Sert également de filet pour les dégâts des eaux qui échappent au champ d’IRSI et de CIDECOP.',
        ],
      },
      {
        t: 'Répartition de la charge',
        p: [
          'Assureur du syndicat des copropriétaires : parties immobilières, communes et privatives selon le contrat de copropriété.',
          'Assureur du copropriétaire ou de l’occupant : embellissements.',
          'Si la garantie de l’un est insuffisante, l’autre assureur complète dans les conditions et limites de son contrat.',
        ],
      },
      {
        t: 'Seuil d’application',
        p: [
          `Dommages supérieurs à ${SEUILS.cidepiecSeuil.toLocaleString('fr-FR')} € en principal, hors honoraires d’expert. En dessous, chaque assureur règle son assuré sans mise en jeu conventionnelle.`,
        ],
      },
    ],
  },

  DROIT_COMMUN: {
    code: 'Droit commun',
    tone: 'neutre',
    badge: 'Hors convention',
    titre: 'Traitement de droit commun',
    nomComplet: 'Aucune convention d’indemnisation entre assureurs applicable',
    accroche:
      'Le sinistre sort du périmètre conventionnel : chaque assureur règle son assuré selon son contrat, les responsabilités se règlent par les voies de droit.',
    blocs: [
      {
        t: 'Cadre de traitement',
        p: [
          'Aucun assureur gestionnaire, aucune renonciation à recours, aucune expertise pour compte commun : les délais dépendent de la diligence de chaque intervenant.',
          'Le lésé conserve l’intégralité de ses actions et peut agir directement contre le responsable ou son assureur.',
        ],
      },
      {
        t: 'Fondements de recours usuels',
        p: [
          'Responsabilité du fait des choses (art. 1242 al. 1 C. civ.), responsabilité contractuelle et présomption de responsabilité locative (art. 1732 et 1733 C. civ.).',
          'Responsabilité du syndicat des copropriétaires pour vice de construction ou défaut d’entretien des parties communes (art. 14 de la loi du 10 juillet 1965).',
        ],
      },
    ],
  },
};

/* ---------------------------------------------------------------------------
   Questions de l'arbre de décision
   --------------------------------------------------------------------------- */

const QUESTIONS = {
  immeuble: {
    intitule: 'Quelle est la nature du bien sinistré ?',
    aide: 'Les trois conventions supposent un immeuble collectif. CIDECOP et CIDEPIEC exigent en outre une copropriété dotée d’un syndicat.',
    options: [
      {
        v: 'copropriete',
        l: 'Immeuble en copropriété',
        h: 'Au moins deux lots, syndicat des copropriétaires constitué',
      },
      {
        v: 'monopropriete',
        l: 'Immeuble collectif en monopropriété',
        h: 'Immeuble locatif appartenant à un propriétaire unique, plusieurs occupants',
      },
      {
        v: 'individuel',
        l: 'Maison individuelle ou local isolé',
        h: 'Hors immeuble collectif, y compris mitoyenneté entre pavillons',
      },
    ],
  },

  evenement: {
    intitule: 'Quel est l’événement à l’origine des dommages ?',
    aide: 'IRSI ne connaît que le dégât des eaux et l’incendie. Les autres périls relèvent directement de CIDEPIEC.',
    options: [
      { v: 'dde', l: 'Dégât des eaux', h: 'Fuite, rupture, engorgement, débordement, infiltration' },
      { v: 'incendie', l: 'Incendie ou explosion', h: 'Y compris dommages de fumée et frais d’extinction' },
      {
        v: 'autre',
        l: 'Autre péril',
        h: 'Tempête, grêle, neige, foudre, catastrophe naturelle, choc de véhicule, vol, vandalisme, attentat',
      },
    ],
  },

  perilAutre: {
    intitule: 'Ce péril figure-t-il dans la liste CIDEPIEC ?',
    aide: 'Liste conventionnelle : foudre, tempête, grêle, neige, catastrophe naturelle, attentat, choc de véhicule terrestre à moteur, vol, vandalisme.',
    options: [
      { v: 'oui', l: 'Oui, péril listé', h: 'Le sinistre entre dans le périmètre matériel de la convention' },
      {
        v: 'non',
        l: 'Non ou incertain',
        h: 'Péril absent de la liste : dommages électriques seuls, gel, affaissement de terrain, etc.',
      },
    ],
  },

  causeExclue: {
    intitule: 'La cause du sinistre est-elle exclue du champ IRSI ?',
    aide: 'Une seule de ces causes suffit à écarter IRSI, quel que soit le montant des dommages.',
    options: [
      {
        v: 'non',
        l: 'Aucune cause d’exclusion',
        h: 'Dégât des eaux ou incendie de fréquence relevant du périmètre IRSI',
      },
      {
        v: 'oui',
        l: 'Oui, cause exclue',
        h: 'Eaux : condensation ou humidité sans sinistre garanti, infiltration par façades ou murs enterrés, ruissellement, débordement de cours d’eau, refoulement d’égout, inondation. Incendie : foudre, véhicule terrestre à moteur, incendie de forêt.',
      },
    ],
  },

  montant: {
    intitule: 'Quel est le montant des dommages matériels par local sinistré ?',
    aide: 'Assiette : hors taxes, un local à la fois, recherche de fuite et mesures conservatoires incluses, pertes immatérielles exclues. Une estimation ci-dessous calcule la tranche ; la franchise du contrat ne s’impute pas sur ce seuil.',
    options: [
      { v: 't1', l: `Jusqu’à ${eur(SEUILS.irsiTranche1)}`, h: 'Tranche 1 de la convention IRSI' },
      {
        v: 't2',
        l: `Au-delà de ${eur(SEUILS.irsiTranche1)} et jusqu’à ${eur(SEUILS.irsiPlafond)}`,
        h: 'Tranche 2 de la convention IRSI',
      },
      {
        v: 'hors',
        l: `Au-delà de ${eur(SEUILS.irsiPlafond)}`,
        h: 'Dépassement du plafond IRSI : basculement vers les conventions copropriété',
      },
      {
        v: 'inconnu',
        l: 'Non encore évalué',
        h: 'Le montant conditionne toute la suite du raisonnement',
      },
    ],
  },

  localisation: {
    intitule: 'Quelle est la situation du local sinistré ?',
    aide: 'Cette réponse désigne l’assureur gestionnaire du sinistre. En présence de plusieurs locaux sinistrés, la désignation s’apprécie local par local.',
    options: [
      { v: 'locataire', l: 'Local privatif loué vide et occupé', h: 'Gestion par l’assureur du locataire occupant' },
      {
        v: 'copro_occupant',
        l: 'Local privatif occupé par son propriétaire',
        h: 'Gestion par l’assureur du propriétaire occupant',
      },
      {
        v: 'meuble_vacant',
        l: 'Local loué meublé ou vacant',
        h: 'Gestion par l’assureur du propriétaire non occupant',
      },
      {
        v: 'communes',
        l: 'Parties communes uniquement',
        h: 'Gestion par l’assureur de l’immeuble',
      },
    ],
  },

  natureDommages: {
    intitule: 'Quelle est la nature des dommages à indemniser ?',
    aide: 'CIDECOP et CIDEPIEC répartissent la charge selon cette qualification. Le mobilier reste hors convention. En cas de doute (carrelage, parquet, cuisine), voir l’onglet Guides — ce n’est pas une décision de gestion.',
    options: [
      {
        v: 'mixte',
        l: 'Parties immobilières et embellissements',
        h: 'Cas le plus fréquent : répartition entre les deux assureurs',
      },
      {
        v: 'immobilier',
        l: 'Parties immobilières seules',
        h: 'Gros œuvre, cloisons, planchers, plafonds, installations fixes',
      },
      {
        v: 'embellissements',
        l: 'Embellissements seuls',
        h: 'Papiers peints, peintures, enduits décoratifs, revêtements de sol collés',
      },
      {
        v: 'mobilier',
        l: 'Mobilier et contenu seuls',
        h: 'Aucune partie immobilière ni embellissement touché',
      },
    ],
  },

  seuilCidepiec: {
    intitule: `Les dommages dépassent-ils ${SEUILS.cidepiecSeuil.toLocaleString('fr-FR')} € en principal ?`,
    aide: 'Seuil d’application CIDEPIEC, apprécié hors honoraires d’expert.',
    options: [
      { v: 'oui', l: 'Oui', h: 'Le seuil conventionnel est franchi' },
      { v: 'non', l: 'Non', h: 'Dommages inférieurs au seuil d’application' },
    ],
  },

  adhesion: {
    intitule: 'Tous les assureurs concernés adhèrent-ils aux conventions ?',
    aide: 'Une convention ne lie que ses adhérents. À vérifier pour l’assureur de l’immeuble comme pour ceux des occupants. Un assureur étranger, un fonds de garantie ou une société en liquidation écarte en principe le dispositif.',
    options: [
      { v: 'oui', l: 'Oui, tous adhérents', h: 'Le dispositif conventionnel est opposable entre eux' },
      {
        v: 'non',
        l: 'Non, ou adhésion incertaine',
        h: 'Un assureur non adhérent, étranger ou en liquidation écarte la convention',
      },
    ],
  },
};

/* ---------------------------------------------------------------------------
   Moteur de décision

   flow(reponses) renvoie soit { question: <id> }, soit { resultat: <objet> }.
   Le résultat est calculé depuis l'état complet, ce qui permet de mutualiser
   les questions transversales (adhésion, nature des dommages) entre branches.
   --------------------------------------------------------------------------- */

const q = (id) => ({ question: id });

function resultat(cle, extras) {
  return { resultat: Object.assign({ cle, fiche: CONVENTIONS[cle] }, extras) };
}

const GESTIONNAIRE_IRSI = {
  locataire: 'Assureur du locataire occupant du local sinistré',
  copro_occupant: 'Assureur du propriétaire occupant du local sinistré',
  meuble_vacant: 'Assureur du propriétaire non occupant du local sinistré',
  communes_copropriete: 'Assureur du syndicat des copropriétaires',
  communes_monopropriete: 'Assureur du propriétaire de l’immeuble',
};

const REPARTITION = {
  mixte: [
    'Parties immobilières, communes et privatives : assureur de l’immeuble.',
    'Embellissements : assureur du copropriétaire ou de l’occupant.',
  ],
  immobilier: ['Intégralité des dommages à la charge de l’assureur de l’immeuble.'],
  embellissements: ['Intégralité des dommages à la charge de l’assureur du copropriétaire ou de l’occupant.'],
};

function flow(r) {
  /* --- Nature du bien -------------------------------------------------- */
  if (!r.immeuble) return q('immeuble');

  if (r.immeuble === 'individuel') {
    return resultat('DROIT_COMMUN', {
      motif:
        'Les conventions IRSI, CIDECOP et CIDEPIEC supposent un immeuble collectif. Un pavillon ou un local isolé en est exclu, y compris en situation de mitoyenneté.',
      actions: [
        'Déclaration par chaque lésé à son propre assureur.',
        'Recours de droit commun contre le voisin ou son assureur, sur expertise contradictoire.',
      ],
    });
  }

  /* --- Nature de l'événement ------------------------------------------- */
  if (!r.evenement) return q('evenement');

  /* --- Branche « autre péril » : CIDEPIEC directement ------------------- */
  if (r.evenement === 'autre') {
    if (!r.perilAutre) return q('perilAutre');

    if (r.perilAutre === 'non') {
      return resultat('DROIT_COMMUN', {
        motif:
          'Le péril ne figure pas dans la liste CIDEPIEC et n’entre ni dans le champ IRSI ni dans celui de CIDECOP. Aucune convention n’est mobilisable.',
        actions: [
          'Qualifier précisément le péril au regard des garanties souscrites avant d’écarter toute convention.',
          'Instruire le dossier en droit commun, chaque assureur réglant son assuré.',
        ],
      });
    }

    if (r.immeuble !== 'copropriete') {
      return resultat('DROIT_COMMUN', {
        motif:
          'CIDEPIEC est réservée aux immeubles en copropriété : elle articule l’assureur du syndicat et celui du copropriétaire. En monopropriété, cette dualité n’existe pas.',
        actions: [
          'Le propriétaire unique déclare à son assureur immeuble ; les occupants déclarent leurs dommages propres.',
          'Recours de droit commun selon les responsabilités établies.',
        ],
      });
    }

    return branchesCopropriete(r, 'CIDEPIEC');
  }

  /* --- Branche eaux / incendie : test du champ IRSI --------------------- */
  if (!r.causeExclue) return q('causeExclue');

  if (r.causeExclue === 'non') {
    if (!r.montant) return q('montant');

    if (r.montant === 'inconnu') {
      return {
        resultat: {
          cle: 'ATTENTE',
          fiche: {
            code: 'Évaluation requise',
            tone: 'neutre',
            badge: 'Analyse suspendue',
            titre: 'Chiffrage préalable nécessaire',
            nomComplet: 'Le montant des dommages détermine la convention applicable',
            accroche: `Le raisonnement ne peut aboutir sans une estimation, même provisoire, comparée aux seuils de ${eur(SEUILS.irsiTranche1)} et ${eur(SEUILS.irsiPlafond)}.`,
            blocs: [
              {
                t: 'Assiette à retenir',
                p: [
                  'Montant hors taxes des dommages matériels, apprécié local sinistré par local sinistré et non pour l’ensemble du sinistre.',
                  'Frais de recherche de fuite et mesures conservatoires inclus ; pertes immatérielles exclues.',
                ],
              },
              {
                t: 'Conduite à tenir',
                p: [
                  'À ce stade, l’assureur du local sinistré prend la main : il diligente la recherche de fuite et le chiffrage, puis la tranche se détermine.',
                ],
              },
            ],
          },
          motif: 'Le montant par local sinistré est le premier critère discriminant entre IRSI, CIDECOP et CIDEPIEC.',
          actions: [
            'Faire chiffrer les dommages local par local, hors taxes.',
            'Reprendre l’analyse dès l’estimation disponible.',
          ],
        },
      };
    }

    if (r.montant === 't1' || r.montant === 't2') {
      if (!r.localisation) return q('localisation');
      if (!r.adhesion) return q('adhesion');

      if (r.adhesion === 'non') {
        return resultat('DROIT_COMMUN', {
          motif:
            'Les critères matériels d’IRSI sont réunis, mais la convention n’est opposable qu’entre adhérents. L’intervention d’un assureur non adhérent la neutralise.',
          actions: [
            'Vérifier l’adhésion auprès de France Assureurs avant d’abandonner le cadre conventionnel.',
            'À défaut d’adhésion : gestion classique, chaque assureur réglant son assuré, puis recours.',
          ],
        });
      }

      const cle = r.montant === 't1' ? 'IRSI_T1' : 'IRSI_T2';
      const gestionnaireKey =
        r.localisation === 'communes' ? 'communes_' + r.immeuble : r.localisation;

      return resultat(cle, {
        motif:
          r.montant === 't1'
            ? `Sinistre ${r.evenement === 'dde' ? 'dégât des eaux' : 'incendie'} dans un immeuble collectif, cause non exclue, dommages n’excédant pas ${eur(SEUILS.irsiTranche1)} par local sinistré.`
            : `Sinistre ${r.evenement === 'dde' ? 'dégât des eaux' : 'incendie'} dans un immeuble collectif, cause non exclue, dommages compris entre ${eur(SEUILS.irsiTranche1)} et ${eur(SEUILS.irsiPlafond)} par local sinistré.`,
        gestionnaire: GESTIONNAIRE_IRSI[gestionnaireKey],
        actions:
          r.montant === 't1'
            ? [
                'L’assureur gestionnaire se désigne auprès des autres assureurs et centralise la gestion.',
                'Recherche de fuite et mesures conservatoires à sa charge.',
                'Indemnisation des lésés pour compte de qui il appartiendra, sans recours ultérieur.',
              ]
            : [
                'L’assureur gestionnaire se désigne auprès des autres assureurs et centralise la gestion.',
                'Désignation d’un expert pour compte commun, dont les conclusions sont opposables aux adhérents.',
                'Indemnisation des lésés, puis recours contre l’assureur du responsable.',
              ],
        vigilance: [
          'Le seuil s’apprécie local par local : un même sinistre peut relever de la tranche 1 pour un local et de la tranche 2 pour un autre.',
          `Si le chiffrage définitif dépasse ${eur(SEUILS.irsiPlafond)}, le dossier sort d’IRSI et bascule vers CIDECOP (eaux) ou CIDEPIEC (autres périls).`,
        ],
      });
    }
    /* r.montant === 'hors' : poursuite hors IRSI */
  }

  /* --- Hors champ IRSI --------------------------------------------------- */
  const motifSortie =
    r.causeExclue === 'oui'
      ? 'La cause du sinistre est exclue du champ IRSI, indépendamment du montant des dommages.'
      : `Les dommages dépassent le plafond IRSI de ${eur(SEUILS.irsiPlafond)} par local sinistré.`;

  if (r.immeuble !== 'copropriete') {
    return resultat('DROIT_COMMUN', {
      motif: `${motifSortie} CIDECOP et CIDEPIEC étant réservées aux copropriétés, aucune convention ne prend le relais en monopropriété.`,
      actions: [
        'Expertise contradictoire entre les assureurs concernés.',
        'Recours de droit commun, notamment sur le fondement de la responsabilité locative ou du fait des choses.',
      ],
    });
  }

  return branchesCopropriete(r, r.evenement === 'dde' ? 'CIDECOP' : 'CIDEPIEC', motifSortie);
}

/* Tronc commun CIDECOP / CIDEPIEC : nature des dommages, seuil, adhésion. */
function branchesCopropriete(r, cle, motifSortie) {
  if (!r.natureDommages) return q('natureDommages');

  if (r.natureDommages === 'mobilier') {
    return resultat('DROIT_COMMUN', {
      motif:
        'CIDECOP et CIDEPIEC ne répartissent que les parties immobilières et les embellissements. Des dommages limités au mobilier et au contenu échappent à leur objet.',
      actions: [
        'Indemnisation du contenu par l’assureur de chaque lésé, selon son contrat.',
        'Recours de droit commun contre le responsable pour la part non prise en charge.',
      ],
    });
  }

  if (cle === 'CIDEPIEC' && !r.seuilCidepiec) return q('seuilCidepiec');

  if (cle === 'CIDEPIEC' && r.seuilCidepiec === 'non') {
    return resultat('DROIT_COMMUN', {
      motif: `Les dommages n’atteignent pas le seuil d’application CIDEPIEC de ${SEUILS.cidepiecSeuil.toLocaleString('fr-FR')} € en principal.`,
      actions: [
        'Chaque assureur règle son assuré dans les limites de son contrat, hors mise en jeu conventionnelle.',
      ],
    });
  }

  if (!r.adhesion) return q('adhesion');

  if (r.adhesion === 'non') {
    return resultat('DROIT_COMMUN', {
      motif: `Les critères matériels de ${cle} sont réunis, mais la convention n’est opposable qu’entre adhérents.`,
      actions: [
        'Vérifier l’adhésion de l’assureur du syndicat et de celui de l’occupant avant d’écarter la convention.',
        'À défaut : expertise contradictoire et recours de droit commun.',
      ],
    });
  }

  const vigilance = [
    'Chaque assureur n’intervient que dans les conditions et limites de son propre contrat : vérifier les plafonds et la garantie des embellissements.',
  ];

  if (cle === 'CIDECOP') {
    vigilance.push(
      'Si la cause du dégât des eaux sort également du champ CIDECOP, CIDEPIEC prend le relais pour les dommages immobiliers et les embellissements.'
    );
  } else if (r.evenement === 'dde') {
    vigilance.push(
      'CIDEPIEC intervient ici en second rideau : documenter au dossier pourquoi IRSI et CIDECOP sont écartées.'
    );
  }

  if (r.natureDommages === 'mixte') {
    vigilance.push(
      'La frontière entre partie immobilière et embellissement conditionne la répartition : la faire trancher par l’expert plutôt qu’en gestion.'
    );
  }

  return resultat(cle, {
    motif: motifSortie
      ? `${motifSortie} Le sinistre relève de ${cle}, applicable aux immeubles en copropriété.`
      : `Péril relevant de la liste CIDEPIEC, survenu dans un immeuble en copropriété et affectant les parties immobilières ou les embellissements.`,
    repartition: REPARTITION[r.natureDommages],
    actions: [
      'Déclaration croisée à l’assureur du syndicat et à celui du copropriétaire ou de l’occupant.',
      'Expertise commune sur la qualification et le chiffrage des postes.',
      'Règlement par chaque assureur de la part lui incombant, sans recours réciproque.',
    ],
    vigilance,
  });
}

/* Exposition globale (chargement en script classique, sans module). */
window.RULES = { SEUILS, CONVENTIONS, QUESTIONS, flow, trancheIrsi };
