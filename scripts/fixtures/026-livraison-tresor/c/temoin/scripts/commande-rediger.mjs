// TÉMOIN du lot C (fiche 026-029, Claude Code) — une implémentation de référence de scripts/commande-rediger.mjs (fiche
// 026-093). Jamais livrée : posée dans la maquette de .orchestre/preuves/026-029/outils/, puis cassée critère par critère.
//
//   node --import ./scripts/ts-loader.mjs scripts/commande-rediger.mjs <dossier-source> [--sans-ia]
// Lit <dossier>/commande.json et maquettes/modeles/<métier>/contenu.json ; écrit <dossier>/contenu.json et redaction.json.
// Codes : 0 rédigé, 2 usage (dossier absent, sous public/), 3 rédaction bloquée (rapport.bloquant), 1 autre erreur.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const [brut] = args.filter((a) => !a.startsWith('--'))
if (!brut) { console.error('usage : commande-rediger.mjs <dossier-source> [--sans-ia]'); process.exit(2) }
const dossier = path.resolve(brut)
const relPublic = path.relative(path.join(RACINE, 'public'), dossier)
if (relPublic === '' || (!relPublic.startsWith('..') && !path.isAbsolute(relPublic))) { console.error('✗ dossier sous public/ : refusé'); process.exit(2) }
if (!fs.existsSync(path.join(dossier, 'commande.json'))) { console.error('✗ commande.json absent du dossier'); process.exit(2) }
const commande = JSON.parse(fs.readFileSync(path.join(dossier, 'commande.json'), 'utf8'))
const modeleDe = (metier) => { const f = path.join(RACINE, 'maquettes', 'modeles', String(metier), 'contenu.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null }
const modele = modeleDe(commande.metier)
if (!modele) { console.error(`✗ modèle du métier absent (maquettes/modeles/${commande.metier}/contenu.json)`); process.exit(3) }
const modelesSecondaires = Object.fromEntries((commande.metiers_secondaires ?? []).map((s) => [s, modeleDe(s)]))

let appel
if (!args.includes('--sans-ia')) {
  const llm = path.join(RACINE, 'lib', 'agents', 'llm.ts')
  if (!fs.existsSync(llm)) console.log('clé agents absente : rédaction sans IA')
  else {
    const m = await import(pathToFileURL(llm).href)
    const lecteur = m.creerLecteur?.('redacteur_site')
    if (lecteur) appel = async ({ systeme, utilisateur }) => { const r = await lecteur({ systeme, messages: [{ role: 'user', content: utilisateur }] }); if (r == null) throw new Error('moteur indisponible'); return typeof r === 'string' ? r : String(r.texte ?? '') }
    else console.log('clé agents absente : rédaction sans IA')
  }
}
const { redigerContenuV2 } = await import(pathToFileURL(path.join(RACINE, 'lib', 'siteRedacteur.ts')).href)
const { contenu, rapport } = await redigerContenuV2({ commande, artisan: null, modele, modelesSecondaires }, appel)
fs.writeFileSync(path.join(dossier, 'redaction.json'), `${JSON.stringify(rapport, null, 1)}\n`)
if (rapport.bloquant || !contenu) { console.error(`✗ rédaction bloquée : ${rapport.bloquant ?? 'aucun contenu'}`); process.exit(3) }
fs.writeFileSync(path.join(dossier, 'contenu.json'), `${JSON.stringify(contenu, null, 1)}\n`)
console.log(`✓ contenu.json rédigé : ${Object.keys(contenu.pages).length} page(s), ${rapport.rediges.length} champ(s) rédigé(s), ${rapport.rejets.length} rejet(s), ${rapport.degradations.length} dégradation(s), IA ${rapport.ia}`)
