// 036-034 : la copie du code de « Préparer les cartes de l’ombre » embarquée dans presti-banc-cerveau (nœud « Cartes de l’ombre (code du
// Cerveau) ») est-elle IDENTIQUE au code publié de presti-cerveau ? Usage : node banc-egal.mjs <export-cerveau.json> <export-banc.json>
import { readFileSync } from 'node:fs';
const [c, b] = process.argv.slice(2).map((f) => JSON.parse(readFileSync(f, 'utf8')));
const code = c.nodes.find((n) => n.name === 'Préparer les cartes de l’ombre').parameters.jsCode;
const banc = b.nodes.find((n) => n.name === 'Cartes de l’ombre (code du Cerveau)').parameters.jsCode;
const m = banc.match(/\/\/ ─── début de la copie[^\n]*\n([\s\S]*)\n\/\/ ─── fin de la copie ───/);
const egal = !!m && m[1] === code;
console.log('copie du banc identique au Cerveau :', egal);
process.exit(egal ? 0 : 1);
