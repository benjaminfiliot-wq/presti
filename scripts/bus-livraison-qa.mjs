import fs from 'node:fs';
import path from 'node:path';
import { R, lireOptions, creerSortie, jugerPreuvesVides } from './fixtures/026-livraison-tresor/commun.mjs';

const JUGE = 'bus-livraison-qa';
const o = lireOptions(process.argv.slice(2));
const racine = o.valeurs.racine || R;
const s = creerSortie(JUGE, ['BL-1'], `Juge ${JUGE}`, { nr: ['BL-1'] });

const tic = path.join(racine, 'app/api/agents/tic/route.ts');
const contrat = path.join(racine, 'scripts/fixtures/026-horloge-bus/contrat-ops.json');

if (o.temoin) {
  jugerPreuvesVides(s, 'BL', racine, '026-141');
  s.passe('BL-1', 'témoin ok');
  process.exit(s.finir());
} else {
  if (!fs.existsSync(tic) || !fs.existsSync(contrat)) {
    console.log(`❌ BL-1 préalable absent 026-049 app/api/agents/tic/route.ts`);
    process.exit(2);
  }
  s.passe('BL-1', 'présent');
  process.exit(s.finir());
}
