import fs from 'node:fs';
import path from 'node:path';
import { R, lireOptions, creerSortie, jugerPreuvesVides } from './fixtures/026-livraison-tresor/commun.mjs';

const JUGE = 'dossier-zip-qa';
const o = lireOptions(process.argv.slice(2));
const racine = o.valeurs.racine || R;
const s = creerSortie(JUGE, ['DZ-1'], `Juge ${JUGE}`, { nr: ['DZ-1'] });

if (o.temoin) {
  jugerPreuvesVides(s, 'DZ', racine, '026-028');
  s.passe('DZ-1', 'témoin ok');
} else {
  const f = path.join(racine, 'app/api/controle/dossier/route.ts');
  if (!fs.existsSync(f)) s.echoue('DZ-1', `❌ DZ-1 app/api/controle/dossier/route.ts absent`);
  else s.passe('DZ-1', 'présent');
}
process.exit(s.finir());
