#!/usr/bin/env node
// Contre-vérification des juges Savoir, uniquement sur une copie jetable.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const SEUL = process.argv.find(x => x.startsWith('--seul='))?.slice(7).split(',') ?? null
const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TRAVAIL = path.join(RACINE, '.orchestre/travail/juges-026-savoir-mutations')
const COPIE = path.join(TRAVAIL, 'copie')
const PREUVES = path.join(RACINE, '.orchestre/preuves/026-240')
const juges = {
  socle: 'scripts/savoir-socle-qa.mjs',
  recherche: 'scripts/savoir-recherche-qa.mjs',
  lecons: 'scripts/savoir-lecons-qa.mjs',
  reflexion: 'scripts/savoir-reflexion-qa.mjs',
}
const groupes = {
  socle: { 'SVS-3': 'export', 'SVS-4': 'export', 'SVS-6': 'export', 'SVS-7': 'envoi', 'SVS-8': 'reception', 'SVS-9': 'index', 'SVS-10': 'index', 'SVS-11': 'unites' },
  recherche: { 'SVR-2': 'outil', 'SVR-5': 'outil', 'SVR-6': 'outil', 'SVR-7': 'outil', 'SVR-8': 'outil', 'SVR-9': 'outil', 'SVR-11': 'outil' },
  lecons: { 'SVL-1': 'candidats', 'SVL-3': 'candidats', 'SVL-5': 'validation', 'SVL-7': 'selection', 'SVL-8': 'selection', 'SVL-9': 'branchement' },
  reflexion: { 'SVB-1': 'donnees', 'SVB-3': 'bilan', 'SVB-4': 'bilan', 'SVB-5': 'bilan', 'SVB-8': 'unites' },
}
const lireSabotages = (nom) => JSON.parse(fs.readFileSync(path.join(RACINE, `scripts/fixtures/026/savoir/${nom}/sabotages.json`), 'utf8'))
const saboter = (nom, id, description) => {
  const s = lireSabotages(nom).find(x => x.id === id)
  if (!s) throw new Error(`sabotage absent : ${nom}/${id}`)
  return { nom, description, fichier: s.fichier, avant: s.avant, apres: s.apres, critere: s.critere }
}
const muter = (nom, description, fichier, avant, apres, critere) => ({ nom, description, fichier, avant, apres, critere })

// Une mutation sur une tranche de fichier (du premier repère au second, inclus) : le texte `avant` du rapport est la tranche lue dans le dépôt.
const tranche = (nom, description, fichier, debut, fin, transformer, critere) => {
  const t = fs.readFileSync(path.join(RACINE, fichier), 'utf8')
  const i = t.indexOf(debut), j = t.indexOf(fin, i)
  if (i < 0 || j < 0 || t.indexOf(debut, i + 1) >= 0) throw new Error(`tranche introuvable ou ambiguë : ${description}`)
  const avant = t.slice(i, j + fin.length), apres = transformer(avant)
  if (apres === avant) throw new Error(`tranche inchangée : ${description}`)
  return { nom, description, fichier, avant, apres, critere }
}
const mutations = [
  // Socle : les remplacements portent sur le code livré, qui diffère du témoin de 026-229.
  muter('socle', 'ouvre .env.local malgré les exclusions', 'scripts/savoir/exporter.mjs',
    'if (exclu(contrat, racine, chemin)) { compteurs.exclus++; continue }',
    "if (chemin === '.env.local') fs.readFileSync(path.join(base, chemin)); if (exclu(contrat, racine, chemin)) { compteurs.exclus++; continue }", 'SVS-3'),
  muter('socle', 'omet le caviardage du numéro', 'scripts/savoir/exporter.mjs',
    'return regle.remplace_par', "return regle.remplace_par === '[numéro]' ? valeur : regle.remplace_par", 'SVS-4'),
  muter('socle', 'range les prospects dans general', 'scripts/savoir/exporter.mjs',
    "const compartiment = classe === 'prospects' ? 'prospects' : 'general'", "const compartiment = 'general'", 'SVS-4'),
  muter('socle', 'accepte une sortie dans le dépôt', 'scripts/savoir/exporter.mjs',
    "if (nom === 'depot' && exclu(contrat, 'presti', relative)) continue", "if (nom === 'depot') continue", 'SVS-6'),
  muter('socle', 'ajoute sudo dans la commande distante', 'scripts/savoir/envoyer.mjs',
    '`umask 007 && cat > ${cible}.tar.part', '`sudo -n -u agents umask 007 && cat > ${cible}.tar.part', 'SVS-7'),
  // La réception refuse « ../ » deux fois (le nom dans le tar, puis tout fichier hors manifeste) : retirer l'un seul est une faute sans effet
  // observable (défense en profondeur). La faute réelle, « la réception accepte ../ », rouvre les deux d'un seul remplacement.
  tranche('socle', 'accepte « ../ » dans le tar (nom non refusé, fichier hors manifeste non refusé)', 'scripts/usine/savoir-recevoir.mjs',
    "if (!nom || Buffer.byteLength(nom) > 255", "return { entrees, fichiers: manifeste.fichiers.length, octets }",
    (t) => t.replace("x === '..' || ", '').replace("if (e.type === '0' && !attendus.has(nom)) erreur('fichier hors manifeste')", 'void nom'), 'SVS-8'),
  // Retirer seule la garde « classe interdite » ne survit pas pour une raison de défense en profondeur : le jeu d'essai de SVS-10 ne
  // range jamais un fichier de classe prospects dans le manifeste general (la réception le refuse déjà, SVS-8). Les deux fautes réelles
  // de l'indexeur, observables, sont donc celles-ci : l'index des prospects écrit sous general, et les prospects envoyés au modèle.
  muter('socle', 'range l’index des prospects sous general', 'scripts/savoir/indexer.mjs',
    "const dossier = path.join(racine, 'index', compartiment)", "const dossier = path.join(racine, 'index', 'general')", 'SVS-10'),
  muter('socle', 'envoie aussi les passages des prospects au modèle d’embeddings', 'scripts/savoir/indexer.mjs',
    "compartiment === 'general' ? semantiquePermise(reglages) : 'eteinte'", 'semantiquePermise(reglages)', 'SVS-10'),
  muter('socle', 'ouvre les vecteurs hors boucle locale', 'scripts/savoir/indexer.mjs',
    "['127.0.0.1', 'localhost'].includes(u.hostname)", 'Boolean(u.hostname)', 'SVS-10'),
  muter('socle', 'ajoute EnvironmentFile à l’unité de réception', 'scripts/usine/systemd/presti-chef-savoir-recevoir.service',
    'User=agents', 'User=agents\nEnvironmentFile=/home/agents/.config/presti/agents.env', 'SVS-11'),
  muter('socle', 'supprime le tri de l’index', 'lib/savoir/index.ts',
    "const tries = [...uniques.values()].sort((a, b) => a.id.localeCompare(b.id, 'en'))", 'const tries = [...uniques.values()]', 'SVS-9'),

  saboter('recherche', 'S2', 'laisse le web passer malgré un savoir suffisant'),
  saboter('recherche', 'S5', 'autorise Perplexity au coût inconnu'),
  muter('recherche', 'envoie une question avec adresse à Firecrawl', 'lib/savoir/recherche.ts',
    "  if (RE_ADRESSE.test(q)) return 'adresse'\n", '', 'SVR-6'),
  saboter('recherche', 'S7', 'transmet un extrait prospects à douleurs'),
  // La question n'est pas disponible dans journaliser() : la faute réelle de SVR-8 est le premier extrait recopié dans le résumé.
  muter('recherche', 'recopie un extrait dans le résumé de l’événement', 'lib/savoir/recherche.ts',
    "  if (retour.refus) resume += ` · refus ${retour.refus}`\n", "  if (retour.resultats[0]) resume += ` · ${retour.resultats[0].extrait}`\n", 'SVR-8'),
  saboter('recherche', 'S9', 'cherche cinq besoins au lieu de deux'),
  saboter('recherche', 'S15', 'imprime une erreur contenant le jeton'),

  muter('lecons', 'perd le curseur et dédouble les candidates', 'scripts/savoir/lecons.mjs',
    'const ancien = cur.vus[h]', 'const ancien = null', 'SVL-1'),
  muter('lecons', 'décale la source d’une ligne', 'scripts/savoir/lecons.mjs',
    'const texte = lignes[n - 1]', 'const texte = lignes[n]', 'SVL-3'),
  saboter('lecons', 'S13', 'accepte --par=codex'),
  saboter('lecons', 'S12', 'accepte PRESTI_HOTE=usine'),
  saboter('lecons', 'S18', 'garde la leçon avec numéro'),
  saboter('lecons', 'S19', 'laisse une balise fermante active'),
  saboter('lecons', 'S21', 'ajoute le bloc avec interrupteur éteint'),
  muter('lecons', 'relit les leçons à chaque appel', 'lib/agents/llm.ts',
    'const consigne = consigneAvecLecons(systeme, leconsChoisies)',
    "const consigne = consigneAvecLecons(systeme, leconsDeLAgent(agent, deps))", 'SVL-9'),

  saboter('reflexion', 'S01', 'ignore la frontière de Paris'),
  saboter('reflexion', 'S10', 'accepte un nombre inventé'),
  muter('reflexion', 'ajoute une décision au plan', 'scripts/chef/bilan.mjs',
    '    decisions: [],', "    decisions: [{ objet: 'bilan', choix: 'appliquer' }],", 'SVB-4'),
  saboter('reflexion', 'S14', 'rend une tâche sortante'),
  saboter('reflexion', 'S22', 'active le réseau dans argv'),
  muter('reflexion', 'ajoute EnvironmentFile à l’unité', 'scripts/usine/systemd/presti-chef-bilan.service',
    'Environment="PRESTI_HOTE=usine"', 'Environment="PRESTI_HOTE=usine"\nEnvironmentFile=/home/agents/.config/presti/agents.env', 'SVB-8'),
]

function retirerLiens(dossier) {
  if (!fs.existsSync(dossier)) return
  for (const nom of fs.readdirSync(dossier)) {
    const p = path.join(dossier, nom)
    const etat = fs.lstatSync(p)
    if (etat.isSymbolicLink()) fs.unlinkSync(p)
    else if (etat.isDirectory()) retirerLiens(p)
  }
}
function nettoyer() {
  if (!fs.existsSync(COPIE)) return
  retirerLiens(COPIE)
  fs.rmSync(COPIE, { recursive: true, force: true })
}
function copier() {
  nettoyer()
  fs.mkdirSync(COPIE, { recursive: true })
  const dossiers = ['app', 'lib', 'components', 'plans', 'scripts', 'supabase', 'docs', '.github', 'gabarits-pubs', '.orchestre/brouillons-ecosysteme', 'public']
  const fichiers = ['package.json', 'tsconfig.json', 'next.config.mjs', 'next-env.d.ts', 'vercel.json', 'proxy.ts', 'middleware.ts']
  const listage = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...dossiers], { cwd: RACINE, encoding: 'buffer', maxBuffer: 128 * 1024 * 1024 })
  if (listage.status !== 0) throw new Error(`git ls-files : ${listage.stderr}`)
  for (const rel of [...listage.stdout.toString('utf8').split('\0').filter(Boolean), ...fichiers]) {
    const source = path.join(RACINE, rel)
    if (!fs.existsSync(source) || !fs.lstatSync(source).isFile()) continue
    const cible = path.join(COPIE, rel)
    fs.mkdirSync(path.dirname(cible), { recursive: true })
    fs.copyFileSync(source, cible)
  }
  fs.symlinkSync(path.join(RACINE, 'node_modules'), path.join(COPIE, 'node_modules'), 'junction')
}
function lancer(nom, partie) {
  const juge = juges[nom]
  const args = [path.join(RACINE, juge), ...(partie ? [`--partie=${partie}`] : []), `--racine=${COPIE}`]
  const debut = Date.now()
  const r = spawnSync(process.execPath, args, { cwd: RACINE, encoding: 'utf8', timeout: 180_000, maxBuffer: 16 * 1024 * 1024, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } })
  return { code: r.status ?? 124, sortie: `${r.stdout || ''}${r.stderr || ''}`, duree_s: (Date.now() - debut) / 1000, commande: `node ${juge}${partie ? ` --partie=${partie}` : ''} --racine={racine}` }
}
function ligneEchec(sortie, critere) {
  const lignes = sortie.split(/\r?\n/)
  const siennes = lignes.filter(l => l.startsWith(`FAIL ${critere} — `))
  const bilan = lignes.find(l => /^savoir-[\w-]+-qa(?: --partie=[\w-]+)? : FAIL — /.test(l))
  return siennes.length === 1 && bilan?.split(' — ')[1]?.split(/,\s*/).includes(critere) ? siennes[0] : null
}
function remplacerExact(m) {
  const cible = path.join(COPIE, m.fichier)
  const original = fs.readFileSync(cible, 'utf8')
  const n = original.split(m.avant).length - 1
  if (n !== 1) throw new Error(`${m.description} : avant présent ${n} fois dans ${m.fichier}`)
  fs.writeFileSync(cible, original.replace(m.avant, m.apres))
  return () => fs.writeFileSync(cible, original)
}

async function principal() {
  fs.mkdirSync(PREUVES, { recursive: true })
  copier()
  const temoins = {}
  for (const nom of Object.keys(juges)) {
    if (SEUL && !mutations.some(m => m.nom === nom && SEUL.includes(m.critere))) continue
    const r = lancer(nom)
    const rouges = [...new Set([...r.sortie.matchAll(/^FAIL ([A-Z0-9]+-[A-Z0-9-]+) — /gm)].map(x => x[1]))]
    temoins[nom] = { code: r.code, rouges, duree_s: r.duree_s }
    console.log(`témoin ${nom} : code ${r.code}${rouges.length ? ` · rouges : ${rouges.join(', ')}` : ''} · ${r.duree_s.toFixed(1)} s`)
    // Un témoin rouge sans critère nommé (plantage, délai) arrête tout. Un témoin rouge dont les critères sont
    // nommés (écart de fixture connu, bruit d'un arbre partagé) est noté au rapport : une mutation n'est
    // « prise » que si SON critère rougit sur la copie mutée alors qu'il est vert sur la copie intacte.
    if (r.code !== 0 && !rouges.length) throw new Error(`témoin ${nom} rouge sans critère : ${r.sortie.split(/\r?\n/).filter(Boolean).slice(-4).join(' | ')}`)
  }
  for (const m of mutations) if (temoins[m.nom]?.rouges.includes(m.critere)) throw new Error(`le critère ${m.critere} est déjà rouge sur le témoin intact : la mutation « ${m.description} » ne prouverait rien`)
  const rapport = { fiche: '026-240', temoins, mutations: [] }
  const notes = ['# Mutations des juges Savoir', '', 'Chaque remplacement est appliqué seul à une copie du dépôt, puis restauré.', '', '## Témoins (copie intacte)', '', ...Object.entries(temoins).map(([n, t]) => `- ${n} : code ${t.code}${t.rouges.length ? ` ; critères rouges notés (hors mutations) : ${t.rouges.join(', ')}` : ''}`), '', '## Mutations', '']
  const survivantes = []
  for (const [i, m] of mutations.entries()) {
    if (SEUL && !SEUL.includes(m.critere)) continue
    const restaurer = remplacerExact(m)
    let r
    try { r = lancer(m.nom, groupes[m.nom][m.critere]) } finally { restaurer() }
    const extrait = ligneEchec(r.sortie, m.critere)
    console.log(`${i + 1}/${mutations.length} ${m.nom} ${m.critere} : code ${r.code} · ${r.duree_s.toFixed(1)} s · ${extrait ? 'prise' : 'SURVIT'}`)
    if (r.code === 0 || !extrait) {
      const detail = r.sortie.split(/\r?\n/).filter(Boolean).slice(-5).join(' | ')
      survivantes.push(`${m.description} (${m.critere}) — ${detail}`)
      notes.push(`- ${i + 1}. SURVIT : ${m.description} — ${m.critere}, code ${r.code}`)
      continue
    }
    rapport.mutations.push({ juge: juges[m.nom], commande: r.commande, fichier: m.fichier, avant: m.avant, apres: m.apres, critere: m.critere, extrait, duree_s: r.duree_s })
    notes.push(`- ${i + 1}. ${m.description} — ${m.critere}, code ${r.code}, ${r.duree_s.toFixed(1)} s : ${extrait}`)
  }
  const sortieRapport = SEUL ? path.join(PREUVES, `essai-${SEUL.join('-')}`) : PREUVES
  fs.mkdirSync(sortieRapport, { recursive: true })
  fs.writeFileSync(path.join(sortieRapport, 'mutations.json'), JSON.stringify(rapport, null, 2) + '\n')
  fs.writeFileSync(path.join(sortieRapport, 'mutations.md'), notes.join('\n') + '\n')
  console.log(`${rapport.mutations.length} mutations prises, ${survivantes.length} survivante(s) ; rapport écrit`)
  if (survivantes.length) throw new Error(`mutation(s) non prise(s) : ${survivantes.join(' ## ')}`)
}
if (process.argv.includes('--ancres')) {
  let mauvaises = 0
  for (const m of mutations) {
    const n = fs.readFileSync(path.join(RACINE, m.fichier), 'utf8').split(m.avant).length - 1
    if (n !== 1) { mauvaises++; console.log(`${m.critere} ${m.description} : avant présent ${n} fois dans ${m.fichier}`) }
  }
  console.log(`ancres : ${mutations.length - mauvaises}/${mutations.length}`)
  process.exit(mauvaises ? 1 : 0)
}
try { await principal() } catch (e) { console.error(`✗ ${e.message}`); process.exitCode = 1 } finally { nettoyer() }
