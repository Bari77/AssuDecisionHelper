/* ---------------------------------------------------------------------------
   Bibliographie de l'outil.

   Chaque règle codée dans rules.js doit pouvoir être rattachée à une entrée
   ci-dessous. Les réserves listées en fin de fichier signalent les points que
   les sources consultées ne permettent pas d'établir avec certitude : elles
   sont affichées dans le site, à dessein.
   --------------------------------------------------------------------------- */

const SOURCES_CONSULTATION = '4 août 2026';

const SOURCES = [
  {
    groupe: 'Textes conventionnels',
    intro:
      'Les conventions d’indemnisation sont des accords de place entre sociétés d’assurance, adoptés sous l’égide de France Assureurs. Elles ne sont pas publiées au Journal officiel : leur diffusion reste inégale.',
    items: [
      {
        titre: 'Convention IRSI — texte intégral',
        editeur: 'France Assureurs (ex-Fédération française de l’assurance)',
        format: 'PDF',
        url: 'https://urcc-aura.com/sites/default/files/2026-03/convention-irsi_1.pdf',
        note: 'Entrée en vigueur le 1er juin 2018, révisée le 1er juillet 2020. Copie hébergée par l’Union régionale des conseils syndicaux Auvergne-Rhône-Alpes : contrôler le millésime avant toute citation en dossier.',
      },
      {
        titre: 'Convention CIDECOP — document de synthèse',
        editeur: 'AF2A, organisme de formation en assurance',
        format: 'PDF, décembre 2022',
        url: 'https://quiz.af2a.com/autof/AF2A/SYNTHESE_CIDECOP.pdf',
        note: 'Synthèse pédagogique à usage de formation professionnelle, et non le texte conventionnel lui-même.',
      },
      {
        titre: 'Convention CIDEPIEC — texte non public',
        editeur: 'Aucune source primaire identifiée',
        manquant: true,
        note: 'Le périmètre retenu dans cet outil est reconstitué à partir des sources professionnelles ci-dessous. À faire confirmer auprès de France Assureurs ou du service technique de votre compagnie avant usage en gestion.',
      },
    ],
  },

  {
    groupe: 'Sources institutionnelles',
    items: [
      {
        titre: 'Les conventions de règlement des sinistres entre assureurs',
        editeur: 'Institut national de la consommation (INC), établissement public',
        url: 'https://www.inc-conso.fr/content/les-conventions-de-reglement-des-sinistres-entre-assureurs',
        note: 'Présente CIDRE, CIDE-COP et IRSI. Mentionne pour CIDE-COP un seuil de 1 600 € HT, hérité de l’articulation antérieure à 2018 : voir les réserves ci-dessous.',
      },
      {
        titre: 'France Assureurs',
        editeur: 'Fédération professionnelle signataire des conventions',
        url: 'https://www.franceassureurs.fr/',
        note: 'Interlocuteur de référence pour obtenir la version en vigueur d’une convention et la liste de ses adhérents.',
      },
    ],
  },

  {
    groupe: 'Cadre juridique',
    intro:
      'Les conventions n’écartent pas le droit : elles organisent seulement les rapports entre assureurs adhérents. Le lésé conserve ses actions, et le droit commun reprend la main dès qu’une convention est écartée.',
    items: [
      {
        titre: 'Loi n° 65-557 du 10 juillet 1965 fixant le statut de la copropriété des immeubles bâtis',
        editeur: 'Légifrance',
        url: 'https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000880200/',
        note: 'Article 14 : responsabilité du syndicat pour vice de construction ou défaut d’entretien des parties communes. Article 9-1 : obligation d’assurance de responsabilité civile.',
      },
      {
        titre: 'Code civil',
        editeur: 'Légifrance',
        url: 'https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006070721/',
        note: 'Articles 1240 et 1242 : responsabilité délictuelle et responsabilité du fait des choses. Articles 1732 et 1733 : responsabilité du locataire et présomption en matière d’incendie.',
      },
      {
        titre: 'Code des assurances',
        editeur: 'Légifrance',
        url: 'https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006073984/',
        note: 'Article L. 121-12 : subrogation de l’assureur dans les droits de son assuré. Article L. 121-4 : assurances cumulatives.',
      },
    ],
  },

  {
    groupe: 'Sources professionnelles',
    intro:
      'Ces publications d’assureurs et de courtiers spécialisés ont servi à établir le périmètre de CIDECOP et de CIDEPIEC, faute de texte primaire accessible.',
    items: [
      {
        titre: 'Copropriétés : focus sur les conventions',
        editeur: 'GALIAN-SMABTP',
        url: 'https://www.galian-smabtp.fr/blog/coproprietes-focus-sur-les-conventions',
        note: 'Source principale pour la dénomination et le périmètre de CIDEPIEC, et pour la répartition parties immobilières / embellissements.',
      },
      {
        titre: 'La convention IRSI en dégât des eaux et incendie',
        editeur: 'Riskyl',
        url: 'https://www.riskyl.fr/la-convention-irsi-en-degat-des-eaux-et-incendie/',
        note: 'Source principale pour les causes exclues du champ IRSI, la désignation de l’assureur gestionnaire et l’assiette de calcul des seuils.',
      },
      {
        titre: 'Les conventions',
        editeur: 'CRPI Immobilier',
        url: 'https://www.crpi-immobilier.com/conventions/',
        note: 'Seule source consultée mentionnant le seuil d’application CIDEPIEC de 320 € en principal.',
      },
      {
        titre: 'Conventions IRSI et CIDE COP',
        editeur: 'Selectra',
        url: 'https://selectra.info/assurance/assurance-habitation/sinistre/degat-des-eaux-conventions-irsi-cide-cop',
        note: 'Articulation des seuils entre IRSI et CIDE-COP après la réforme de 2018.',
      },
    ],
  },
];

/* Points que les sources consultées ne permettent pas de trancher.
   Ils sont affichés dans le site pour que l'utilisateur sache où l'outil
   s'avance au-delà de ce qui est établi. */
const RESERVES = [
  {
    t: 'Seuil d’application CIDEPIEC',
    p: 'Les 320 € en principal, hors honoraires d’expert, ne reposent que sur une source professionnelle unique. À confirmer contre le texte conventionnel avant usage en production.',
  },
  {
    t: 'Périmètre de CIDEPIEC',
    p: 'Aucun texte intégral public n’a été identifié. La liste des périls et la règle de répartition sont reconstituées à partir de sources professionnelles concordantes, mais sans référence d’article.',
  },
  {
    t: 'Seuil de bascule vers CIDECOP',
    p: 'L’INC mentionne un seuil de 1 600 € HT pour CIDE-COP, qui correspond à l’articulation CIDRE / CIDE-COP antérieure à 2018. L’outil retient l’articulation postérieure à l’entrée en vigueur d’IRSI, soit une bascule au-delà de 5 000 € HT par local sinistré.',
  },
  {
    t: 'Dégâts des eaux exclus d’IRSI',
    p: 'Lorsque la cause échappe aussi au champ de CIDECOP, l’outil signale CIDEPIEC en second rideau. Cette articulation est décrite par les sources professionnelles, sans référence d’article permettant de la vérifier.',
  },
  {
    t: 'Millésime des conventions',
    p: 'IRSI a été révisée le 1er juillet 2020, CIDE-COP en 2003. Une convention peut être amendée sans publicité : contrôler la version en vigueur avant de fonder une position de gestion sur cet outil.',
  },
];

window.SOURCES = { SOURCES, RESERVES, SOURCES_CONSULTATION };
