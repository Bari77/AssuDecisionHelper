/* ---------------------------------------------------------------------------
   Guides métier pour un expert novice : assiette de chiffrage, frontière
   immobilier / embellissement, exclusions IRSI, et ce que le contrat tranche
   (franchise, vétusté, plafonds) — hors de la convention.
   --------------------------------------------------------------------------- */

const GUIDES = [
  {
    id: 'assiette',
    titre: 'Assiette de chiffrage et seuils IRSI',
    chapo:
      'La convention ne chiffre pas le dossier : elle compare un montant déjà estimé à des seuils. L’erreur de novice la plus coûteuse est de comparer le mauvais chiffre.',
    sections: [
      {
        t: 'Ce qui entre dans le seuil IRSI',
        p: [
          'Dommages matériels du local, hors taxes : parties immobilières, embellissements et mobilier de ce local.',
          'Frais de recherche de fuite, y compris lorsque la fuite est hors du local examiné, dès lors qu’ils sont exposés pour ce sinistre.',
          'Mesures conservatoires (mise hors d’eau, assèchement, sécurisation).',
        ],
      },
      {
        t: 'Ce qui n’y entre pas',
        p: [
          'Pertes immatérielles : privation de jouissance, relogement, perte d’usage, préjudices financiers.',
          'Honoraires de maîtrise d’œuvre, de décorateur, d’économiste, sauf s’ils sont des dommages matériels au sens du contrat — par défaut, les laisser hors assiette de seuil.',
          'Honoraires de l’expert d’assuré. Pour CIDEPIEC, le seuil de 320 € s’apprécie hors honoraires d’expert.',
        ],
      },
      {
        t: 'Règle du local, pas du sinistre',
        p: [
          'Chaque local sinistré est pris isolément. Un appartement en tranche 1 et un voisin en tranche 2, c’est normal.',
          'Les parties communes constituent un local distinct. Leur assureur gestionnaire n’est pas forcément le même que celui des lots privatifs.',
          'Le local qui dépasse 5 000 € HT sort d’IRSI (vers CIDECOP ou CIDEPIEC en copropriété). Les autres locaux du même événement peuvent rester dans IRSI.',
        ],
      },
      {
        t: 'HT, TVA, vétusté',
        p: [
          'Les seuils IRSI sont hors taxes. Un assuré particulier non redevable de TVA se fait indemniser TTC : ce n’est pas le chiffre à comparer au seuil.',
          'La vétusté et la valeur à neuf relèvent du contrat, pas de la convention. Pour le seuil, retenir le montant des dommages matériels avant application de la franchise.',
          'La franchise ne s’impute pas sur le seuil : un dégât à 1 700 € HT avec 200 € de franchise reste en tranche 2.',
        ],
      },
    ],
  },

  {
    id: 'immobilier',
    titre: 'Parties immobilières, embellissements, mobilier',
    chapo:
      'CIDECOP et CIDEPIEC répartissent la charge selon cette frontière. IRSI, elle, indemnise le local sans s’en servir pour désigner l’assureur gestionnaire. En cas de doute, c’est un constat d’expertise, pas une décision de gestion.',
    tableau: {
      colonnes: ['Poste', 'Qualification usuelle', 'Qui paie en CIDECOP / CIDEPIEC'],
      lignes: [
        ['Murs, planchers, plafonds (hors revêtement)', 'Immobilier', 'Assureur de l’immeuble'],
        ['Cloisons de distribution d’origine', 'Immobilier', 'Assureur de l’immeuble'],
        ['Canalisations et réseaux encastrés ou d’origine', 'Immobilier', 'Assureur de l’immeuble'],
        ['Chauffage, électricité, VMC, sanitaires scellés', 'Immobilier', 'Assureur de l’immeuble'],
        ['Menuiseries extérieures d’origine', 'Immobilier', 'Assureur de l’immeuble'],
        ['Peintures, papiers peints, tapisseries', 'Embellissement', 'Assureur de l’occupant / copropriétaire'],
        ['Enduits décoratifs (stuc, tyrolien décoratif)', 'Embellissement', 'Assureur de l’occupant / copropriétaire'],
        ['Moquette, lino, parquet flottant ou collé, stratifié', 'Embellissement', 'Assureur de l’occupant / copropriétaire'],
        ['Meubles, vêtements, électroménager non encastré', 'Mobilier', 'Hors convention — contrat de chaque lésé'],
      ],
    },
    sections: [
      {
        t: 'Cas que le novice tranche trop vite',
        p: [
          'Carrelage : scellé sur chape, plutôt immobilier ; collé sur un support existant, plutôt embellissement. Le mode de pose se constate, il ne se déduit pas du devis.',
          'Parquet : massif cloué d’origine, plutôt immobilier ; flottant ou collé rapporté, embellissement.',
          'Plaque de plâtre : le support est immobilier ; la peinture ou le papier qui le recouvre est un embellissement. Chiffrer les deux postes séparément.',
          'Cuisine équipée : les éléments scellés ou faisant corps avec l’immeuble se discutent ; le mobilier de cuisine et l’électroménager posé sont du contenu. Ne pas tout mettre dans un seul poste.',
          'Faux plafond : d’origine et technique (gaines, isolation), plutôt immobilier ; rapporté et décoratif, plutôt embellissement.',
        ],
      },
      {
        t: 'Conséquence pratique',
        p: [
          'Un devis unique « remise en état appartement » est inutilisable en CIDECOP. Exiger une ventilation immobilier / embellissements / mobilier, poste par poste.',
          'Si la garantie embellissements est absente ou plafonnée au contrat de l’occupant, CIDEPIEC prévoit un complément par l’autre assureur — dans les limites de son propre contrat, pas au-delà.',
        ],
      },
    ],
  },

  {
    id: 'exclusions',
    titre: 'Causes qui font sortir d’IRSI',
    chapo:
      'Une seule de ces causes suffit, quel que soit le montant. Le dossier ne « reste pas en IRSI parce que c’est un petit dégât des eaux ».',
    sections: [
      {
        t: 'Dégât des eaux',
        p: [
          'Condensation ou humidité sans sinistre garanti (pas de fuite, pas de rupture, pas d’infiltration accidentelle).',
          'Infiltration par façades, murs enterrés, terrasses mal conçues — dès lors que la cause n’est pas un événement IRSI.',
          'Ruissellement, débordement de cours d’eau, inondation.',
          'Refoulement d’égout.',
        ],
      },
      {
        t: 'Incendie',
        p: [
          'Foudre.',
          'Véhicule terrestre à moteur (incendie consécutif à un choc de véhicule).',
          'Incendie de forêt.',
        ],
      },
      {
        t: 'Après la sortie d’IRSI',
        p: [
          'En copropriété, un dégât des eaux hors IRSI bascule en principe vers CIDECOP ; un incendie hors IRSI vers CIDEPIEC.',
          'En monopropriété, aucune de ces deux conventions ne prend le relais : droit commun.',
          'Documenter pourquoi IRSI est écartée. Un dossier « CIDEPIEC second rideau » sans cette phrase est incomplet.',
        ],
      },
    ],
  },

  {
    id: 'contrat',
    titre: 'Ce que le contrat tranche (et pas la convention)',
    chapo:
      'La convention organise les rapports entre assureurs adhérents. Elle n’augmente pas les garanties de l’assuré. Le nouvel expert qui « applique IRSI » sans ouvrir les conditions particulières se trompe de document.',
    sections: [
      {
        t: 'Toujours au contrat',
        p: [
          'Franchise. Elle s’impute sur l’indemnité, pas sur le seuil de tranche.',
          'Vétusté, valeur à neuf, coefficient de vétusté, reconstruction à l’identique.',
          'Plafonds : embellissements, contents, recherches de fuite, frais de relogement.',
          'Exclusions propres au contrat (défaut d’entretien, local inoccupé, déclaration tardive, vétusté caractérisée).',
          'Qualité d’assuré et étendue de la police : MRH locataire, MRH propriétaire occupant, PNO, copropriété. Un PNO ne porte pas toujours les embellissements de l’occupant.',
        ],
      },
      {
        t: 'Ce que la convention ne dit jamais',
        p: [
          'Le montant à payer à l’assuré. Elle dit qui gère et, le cas échéant, qui supporte la charge entre assureurs.',
          'La TVA. Le régime fiscal de l’assuré (particulier, copropriété au prorata, professionnel redevable) se lit au contrat et à la facture.',
          'La responsabilité vis-à-vis du lésé. En IRSI tranche 1 le recours entre assureurs est abandonné ; le lésé, lui, conserve ses actions.',
        ],
      },
      {
        t: 'Adhésion',
        p: [
          'Une convention ne lie que ses adhérents. Un assureur étranger, un fonds de garantie, une société en liquidation ou un non-adhérent fait tomber le dispositif entre toutes les parties concernées.',
          'La liste est tenue par France Assureurs. Tant que l’adhésion n’est pas vérifiée, la qualification reste provisoire.',
        ],
      },
    ],
  },

  {
    id: 'pieges',
    titre: 'Pièges du premier dossier',
    chapo: 'Les erreurs qui reviennent lorsqu’on débute en expertise après sinistre, y compris sous mandat d’assureur.',
    sections: [
      {
        t: 'Avant la visite',
        p: [
          'Ne pas qualifier la convention sur le seul récit téléphonique. L’origine de la fuite, le caractère collectif du bien et le montant par local se constatent.',
          'Relire le mandat : qui missionne, pour quel assuré, pour quel contrat. L’expert ELEX n’est pas l’assureur gestionnaire ; il éclaire celui qui l’a mandaté.',
        ],
      },
      {
        t: 'Sur place',
        p: [
          'Photographier l’origine, le parcours de l’eau et chaque poste de dommage, pas seulement le « plus visible ».',
          'Séparer dès le carnet de notes : immobilier / embellissements / mobilier. Recoller les postes plus tard fait perdre la répartition CIDECOP.',
          'Un devis d’entreprise n’est pas un chiffrage d’expertise. Le retravailler poste par poste, HT, vétusté éventuelle à part.',
        ],
      },
      {
        t: 'À la rédaction',
        p: [
          'Ne pas écrire « IRSI » sans tranche, ni « CIDECOP » sans dire qui paie l’immobilier et qui paie les embellissements.',
          'Ne pas faire basculer tout le sinistre hors IRSI parce qu’un seul local dépasse 5 000 € HT.',
          'Ne pas oublier que le mobilier seul écarte CIDECOP et CIDEPIEC, même en copropriété, même au-dessus des seuils.',
          'Laisser les crochets vides plutôt que d’inventer une cause, une adhésion ou un montant. Un texte incomplet se corrige ; un texte faux se défend.',
        ],
      },
    ],
  },
];

window.GUIDES = { GUIDES };
