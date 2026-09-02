/* ---------------------------------------------------------------------------
   Régénère fichesParCompagnie dans data/expertise.json à partir des fichiers
   de data/compagnies/.

   L'index ne porte que les clés de recherche (type de contrat, numéro) : il
   permet au formulaire de proposer tous les numéros et de deviner la compagnie
   avant d'avoir téléchargé la fiche complète. Le régime d'indemnisation, lui,
   ne vit que dans le fichier de la compagnie.

   Exécution :  node tools/construire-index.js
   Contrôle    :  node tests/expertise.test.js  (refuse un index périmé)
   --------------------------------------------------------------------------- */

'use strict';

const fs = require('fs');
const path = require('path');

const DONNEES = path.join(__dirname, '..', 'data');
const RACINE = path.join(DONNEES, 'expertise.json');
const COMPAGNIES = path.join(DONNEES, 'compagnies');

/* Le moteur porte les règles d'héritage : une fiche peut ne pas répéter le
   typeContrat de l'en-tête de son fichier. L'index doit voir la valeur
   effective, pas le champ brut. */
require(path.join(__dirname, '..', 'assets', 'expertise-moteur.js'));
const E = (global.window && global.window.EXPERTISE) || global.EXPERTISE;

function construire() {
  const index = {};

  fs.readdirSync(COMPAGNIES)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .forEach((nom) => {
      const paquet = JSON.parse(fs.readFileSync(path.join(COMPAGNIES, nom), 'utf8'));
      if (!paquet.compagnie) throw new Error('compagnies/' + nom + ' : champ « compagnie » manquant');
      if (index[paquet.compagnie]) throw new Error(paquet.compagnie + ' est déclarée dans deux fichiers');
      index[paquet.compagnie] = {
        fichier: 'compagnies/' + nom,
        references: E.completerPaquet(paquet).map((c) => ({
          typeContrat: c.typeContrat,
          numero: c.numero,
        })),
      };
    });

  return index;
}

/* Le référentiel est réécrit sous forme canonique (2 espaces, fins de ligne
   conservées) : le formatage ne dépend donc jamais de qui a édité le fichier. */
function ecrire(index) {
  const brut = fs.readFileSync(RACINE, 'utf8');
  const racine = JSON.parse(brut);
  racine.fichesParCompagnie = index;
  const finLigne = brut.includes('\r\n') ? '\r\n' : '\n';
  const sortie = JSON.stringify(racine, null, 2).split('\n').join(finLigne) + finLigne;
  fs.writeFileSync(RACINE, sortie, 'utf8');
}

if (require.main === module) {
  const index = construire();
  ecrire(index);
  const total = Object.values(index).reduce((n, e) => n + e.references.length, 0);
  console.log('Index reconstruit : ' + Object.keys(index).length + ' compagnie(s), ' + total + ' fiche(s).');
  Object.entries(index).forEach(([cie, e]) => {
    console.log('  ' + cie.padEnd(12) + e.references.length + ' → ' + e.fichier);
  });
}

module.exports = { construire };
