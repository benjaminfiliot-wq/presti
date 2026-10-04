// Sabotages de la contre-vérification du 04/10 (D-0410-10) : node sabotages-copies.mjs <nom> [dossier-des-racines]
// Prépare une racine = COPIE sabotée (lib/siteLivraison.ts, app/controle/Comptabilite.tsx, app/api/cron/livraison/route.ts,
// .github/workflows/generer-site.yml). Le dépôt réel n'est jamais touché (il est partagé par d'autres sessions) : seule la copie
// porte la faute, et le sha256 de lib/siteLivraison.ts du dépôt est relevé avant et après (sha-avant.txt / sha-apres.txt).
// Le juge se lance ensuite avec --racine=<copie> :
//   node --import ./scripts/ts-loader.mjs scripts/generation-actions-qa.mjs --seulement=GA-6 --racine=<copie>
//   node --import ./scripts/ts-loader.mjs scripts/tuile-argent-qa.mjs --temoin --racine=<copie>
import fs from 'node:fs'
import path from 'node:path'
const DEPOT = 'C:/Users/benja/Documents/presti'
const SC = process.argv[3] ?? 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/fdff3dee-5b68-4d0d-a1d7-d3b56ef3740d/scratchpad/racines'
const FICHIERS = ['lib/siteLivraison.ts', 'app/controle/Comptabilite.tsx', 'app/api/cron/livraison/route.ts', '.github/workflows/generer-site.yml']
const lire = (f) => fs.readFileSync(path.join(DEPOT, f), 'utf8').split('\r\n').join('\n')
const SABOTAGES = {
  // dans le bloc de 026-201 (771d765d) : le nombre de sites par tour passe de 3 à 30
  'constante-search-console': (t) => t.replace('const SITES_SEARCH_CONSOLE_PAR_TOUR = 3', 'const SITES_SEARCH_CONSOLE_PAR_TOUR = 30'),
  // dans le bloc de 026-201 : la garde « hors pause » de l'appel Search Console retirée
  'search-console-sans-pause': (t) => t.replace('try { if (!pause) await soumettrePlansDus(', 'try { await soumettrePlansDus('),
  // le contrat de 026-106 : la garde du jeton GITHUB_DISPATCH_TOKEN retirée
  'garde-jeton-retiree': (t) => t.replace('if (process.env.GITHUB_DISPATCH_TOKEN && !pause) {', 'if (!pause) {'),
  // un appel réseau glissé dans tourLivraison (hors du bloc de 026-201, dans celui de 026-141)
  'appel-glisse': (t) => t.replace('  let tresorerieOk = false\n', "  await fetch('https://exemple.invalid/x')\n  let tresorerieOk = false\n"),
  // le contrat de 026-059 : veilleTresorerie() appelée hors de son try/catch
  'veille-sans-try': (t) => t.replace("  try { await veilleTresorerie(); tresorerieOk = true }\n  catch (e) { bilan.erreurs++; console.error('[livraison] veille trésorerie', e) }\n", '  await veilleTresorerie(); tresorerieOk = true\n'),
  // hors de toute évolution nommée : un import étranger en tête de fichier, une fonction étrangère en fin de fichier
  'import-en-tete': (t) => "import { fuite } from '@/lib/fuite'\n" + t,
  'fin-de-fichier': (t) => t + "\nexport const fuite = () => fetch('https://exemple.invalid/x')\n",
}
const nom = process.argv[2]
const f = SABOTAGES[nom]
if (!f) { console.error('sabotage inconnu : ' + nom + ' (' + Object.keys(SABOTAGES).join(', ') + ')'); process.exit(2) }
const dest = path.join(SC, nom)
fs.rmSync(dest, { recursive: true, force: true })
for (const rel of FICHIERS) { fs.mkdirSync(path.dirname(path.join(dest, rel)), { recursive: true }); fs.writeFileSync(path.join(dest, rel), lire(rel)) }
const avant = lire('lib/siteLivraison.ts'), apres = f(avant)
if (apres === avant) { console.error('le sabotage ' + nom + ' ne change rien (motif absent)'); process.exit(2) }
fs.writeFileSync(path.join(dest, 'lib/siteLivraison.ts'), apres)
console.log(dest)
