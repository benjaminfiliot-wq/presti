import fs from 'node:fs';
import path from 'node:path';
import { R, lireOptions, creerSortie, jugerPreuvesVides } from './fixtures/026-livraison-tresor/commun.mjs';

const JUGE = 'poste-sites-qa';
const o = lireOptions(process.argv.slice(2));
const racine = o.valeurs.racine || R;
const s = creerSortie(JUGE, ['PS-1'], `Juge ${JUGE}`, { nr: ['PS-1'] });

if (o.temoin) {
  jugerPreuvesVides(s, 'PS', racine, '026-078');
  s.passe('PS-1', 'témoin ok');
} else {
  const f = path.join(racine, 'app/poste/page.tsx');
  if (!fs.existsSync(f)) s.echoue('PS-1', `❌ PS-1 app/poste/page.tsx absent`);
  else s.passe('PS-1', 'présent');
}
process.exit(s.finir());
