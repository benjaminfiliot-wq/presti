#!/usr/bin/env node
// Contre-épreuves indépendantes de 026-133. Chaque remplacement vit dans une copie.
import fs from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TRAVAIL = path.join(RACINE, '.orchestre/travail/026-133')
const PREUVES = path.join(RACINE, '.orchestre/preuves/026-133')
const GARDER = process.argv.includes('--garder')
const SEUL = process.argv.find(x => x.startsWith('--seul='))?.slice(7)
const RELAIS = process.argv.find(x => x.startsWith('--relais='))?.slice(9)
const JUGES = {
  socle: 'scripts/usine-socle-qa.mjs', sql: 'scripts/usine-sql-qa.mjs',
  routes: 'scripts/usine-routes-qa.mjs', production: 'scripts/usine-production-qa.mjs', chef: 'scripts/chef-qa.mjs',
}
if (RELAIS) {
  if (!['socle', 'chef'].includes(RELAIS)) { console.error('relais inconnu'); process.exit(2) }
  const args = process.argv.slice(2).filter(x => !x.startsWith('--relais='))
  const r = spawnSync(process.execPath, [path.join(RACINE, JUGES[RELAIS]), ...args], { cwd: RACINE, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 240000, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } })
  const sortie = `${r.stdout || ''}${r.stderr || ''}`
  process.stdout.write(sortie)
  const ids = [...sortie.matchAll(/^FAIL ([A-Z0-9]+-[A-Z0-9-]+) — /gm)].map(x => x[1])
  process.stdout.write(`${JUGES[RELAIS]} : ${r.status === 0 ? 'PASS' : `FAIL — ${[...new Set(ids)].join(', ')}`}\n`)
  process.exit(r.status ?? 128)
}
const mutations = []
const ajouter = (juge, groupe, critere, fichier, avant, apres, nom) => mutations.push({ juge, groupe, critere, fichier, avant, apres, nom })
const C = 'scripts/usine/presti-coffre.sh', R = 'scripts/usine/coffre-regles.mjs'
const S = 'scripts/usine/surveillance.mjs', A = 'scripts/usine-agents.mjs'
const M = 'supabase/migrations/0110_usine_socle.sql', D = 'lib/agents/usineDepot.ts'
const T = 'scripts/usine/tourneur.mjs'
// Coffre : accès, écriture, validation et environnement de l'enfant.
ajouter('socle','coffre','CF-4',C,'umask 077\n','', 'umask retiré')
ajouter('socle','coffre','CF-4',C,'mv -f -- "$tmp" "$coffre"','cat -- "$tmp" > "$coffre"', 'écriture non atomique')
ajouter('socle','coffre','CF-3',C,'echo "✗ presti-coffre : $1" >&2','echo "✗ presti-coffre : $1 $valeur" >&2', 'valeur dans le refus')
ajouter('socle','coffre','CF-2',C,'PRESTI_JETON_CHEF | PRESTI_JETON_USINE','SUPABASE_SERVICE_ROLE_KEY | PRESTI_JETON_CHEF | PRESTI_JETON_USINE', 'nom privilégié permis')
ajouter('socle','coffre','CF-10',R,'const JWT = /^eyJ[^.]*\\.[^.]*\\./','const JWT = /^impossible_a_valider$/', 'règle JWT retirée')
ajouter('socle','coffre','CF-11','scripts/usine-coffre.mjs','`${ASSISTANT} ${sousCommande}`','`${ASSISTANT} ${sousCommande} ${entree ?? ""}`', 'valeur dans argv distant')
ajouter('socle','coffre','CF-7','scripts/usine/avec-coffre.mjs','const env = {}','const env = { ...process.env }', 'environnement entier à l’enfant')
ajouter('socle','coffre','CF-8','scripts/usine/avec-coffre.mjs','if (manquants.length) sortir(3,','if (false && manquants.length) sortir(3,', 'enfant lancé malgré un nom absent')
ajouter('socle','coffre','CF-3',R,"'whsec_', 'sk-ant-admin', 'sk-ant-'","'whsec_'", 'clé Anthropic acceptée')
ajouter('socle','coffre','CF-3',R,'return FORME_TELEGRAM_BOT_TOKEN.test(valeur) ? { ok: true }','return true ? { ok: true }', 'bot Telegram mal formé accepté')
// Socle Unix et provenance des unités.
ajouter('socle','socle','SO-2','scripts/usine/socle.sh','sudo -n usermod --shell /usr/sbin/nologin agents','sudo -n usermod --shell /usr/sbin/nologin agents\nsudo -n usermod -aG sudo agents', 'agents rejoint sudo')
ajouter('socle','socle','SO-3','scripts/usine/socle.sh','usine ALL=(agents) NOPASSWD: /usr/local/bin/presti-coffre','usine ALL=(agents) NOPASSWD: SETENV: /usr/local/bin/presti-coffre', 'sudoers SETENV')
ajouter('socle','socle','SO-4','scripts/usine/socle.sh','sudo -n usermod --shell /usr/sbin/nologin agents','sudo -n usermod --shell /usr/sbin/nologin agents\nsudo -n apt-get install -y bubblewrap', 'installation bubblewrap')
ajouter('socle','socle','SO-5',A,'npm ci --ignore-scripts','npm ci', 'scripts npm autorisés')
ajouter('socle','socle','SO-6',A,"    'for f in $sources; do',","    'scp ./scripts/usine/systemd/presti-atelier.service usine:/etc/systemd/system/',\n    'for f in $sources; do',", 'unités copiées du poste')
ajouter('socle','socle','SO-8','scripts/usine/presti-journal.sh','  config-codex)\n','  coffre) fichier="$HOME/.config/presti/agents.env" ;;\n  config-codex)\n', 'journal lit le coffre')
// Surveillance, décision hebdomadaire et confidentialité.
ajouter('socle','surveillance','SV-4',S,'tableau[Math.ceil(tableau.length * 0.95) - 1]','tableau.reduce((a, b) => a + b, 0) / tableau.length', 'moyenne au lieu de p95')
ajouter('socle','surveillance','SV-5',S,"plusGrand < 22 ? 'danger'","plusGrand < 20 ? 'danger'", 'seuil danger abaissé')
ajouter('socle','surveillance','SV-7',S,'Math.floor(t.getTime() / (15 * MINUTE))','Math.floor(t.getTime() / (5 * MINUTE))', 'battement toutes les cinq minutes')
ajouter('socle','surveillance','SV-9',S,"const semaine = semaineIso(t)","const semaine = jour", 'clé datée du jour')
ajouter('socle','surveillance','SV-12',S,'async function tour(t) {','async function tour(t) {\n  for (let i = 0; i < 100000000; i++) Math.sqrt(i)', 'boucle de calcul')
ajouter('socle','surveillance','SV-6',S,'    le: apres.le,','    le: apres.le, hote: os.hostname(),', 'hôte dans les mesures')
ajouter('socle','surveillance','SV-14','scripts/usine/systemd/presti-surveillance.service','[Service]','[Service]\nEnvironmentFile=/home/agents/.config/presti/agents.env', 'unité charge le coffre')
ajouter('socle','surveillance','SV-IA-3',S,"replace(/\\d{9,}/g, 'masque')","replace(/\\d{9,}/g, '$&')", 'masquage des identifiants retiré')
// Schéma SQL du dépôt et de l'agent.
ajouter('sql',null,'US-2',M,'do update set public = false,','do update set public = true,', 'bucket public')
ajouter('sql',null,'US-2',M,'-- La tâche détenue',"create policy usine_lecture on storage.objects for select using (bucket_id = 'usine');\n-- La tâche détenue", 'policy storage')
ajouter('sql',null,'US-3',M,' and t.bail_jusqua > now()','', 'bail expiré accepté')
ajouter('sql',null,'US-3',M,'from public, anon, authenticated;','from public, authenticated; grant execute on function public.ops_tache_detenue(text, uuid) to anon;', 'grant execute anon')
ajouter('sql',null,'US-4',M,"array['taches', 'evenements']::text[], 60, 30, 0, 0);","array['taches', 'evenements']::text[], 60, 30, 0, 0);\nupdate ops.agents set capacites = array['livraison','maquette'] where nom = 'livreur_usine';", 'livreur avec capacité maquette')
// Routes et bibliothèque du dépôt signé.
ajouter('routes',null,'UR-1','app/api/agents/usine/entree/route.ts',"  if (!actif('busAgents')) return erreur(404, 'introuvable')\n",'', 'drapeau retiré')
ajouter('routes',null,'UR-3',D,'{ p_agent: agentNom, p_id: tacheId }',"{ p_agent: typeof (tacheId) === 'string' ? 'autre_agent' : agentNom, p_id: tacheId }", 'agent étranger pour tacheDetenue')
ajouter('routes',null,'UR-4',D,"  if (fichiers.length > limite.fichiers_max) return refus(413, 'trop_de_fichiers')", "  await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(`${tacheId}/sortie/${fichiers[0]?.nom}`)\n  if (fichiers.length > limite.fichiers_max) return refus(413, 'trop_de_fichiers')", 'signature avant validation')
ajouter('routes',null,'UR-5',D,"    if (data > SEUIL_STOCKAGE) return refus(507, 'stockage')", "    if (false && data > SEUIL_STOCKAGE) return refus(507, 'stockage')", 'contrôle stockage retiré')
ajouter('routes',null,'UR-6',D,'createSignedUploadUrl(`${tacheId}/sortie/${fichier.nom}`)','createSignedUploadUrl(`${tacheId}/${fichier.nom}`)', 'sortie omise dans le chemin')
ajouter('routes',null,'UR-8',D,'      depots.push({ nom: fichier.nom, url: data.signedUrl, jeton: data.token })',"      console.log('URL signée', data.signedUrl)\n      depots.push({ nom: fichier.nom, url: data.signedUrl, jeton: data.token })", 'URL signée journalisée')
// Tourneur et unité de l'atelier.
ajouter('production',null,'UT-2',T,'{ cwd: RACINE, env, shell: false,','{ cwd: RACINE, env, shell: true,', 'spawn avec shell')
ajouter('production',null,'UT-3',T,'  const env = {}\n','  const env = { ...process.env }\n', 'fabricant reçoit process.env')
ajouter('production',null,'UT-6',T,'MOTIFS_SECRETS.some(({ re }) => re.test(t)) || JETON_AGENT.test(t) || t.includes(jeton)','MOTIFS_SECRETS.some(({ re }) => re.test(t)) || t.includes(jeton)', 'contrôle des jetons retiré')
ajouter('production',null,'UT-15',T,"    if (!u || typeof u.url !== 'string' || !(await deposer(u.url, x.chemin, x.type))) return finir('echec', 'depot')\n","    if (u && typeof u.url === 'string') await deposer(u.url, x.chemin, x.type)\n", 'PUT échoué ignoré')
ajouter('production',null,'UT-4',T,"const minuterie = setTimeout(() => { expire = true; tuerArbre(enfant.pid) }, delaiMs)","const minuterie = setTimeout(() => { expire = true; enfant.kill('SIGKILL') }, delaiMs)", 'seul enfant tué')
ajouter('production',null,'UT-11',T,"fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, b)","fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, b)\n    if (x.nom === 'commande.json') console.log(`commande de ${JSON.parse(b.toString('utf8')).nom}`)", 'nom artisan journalisé')
ajouter('production',null,'UN-1','scripts/usine/systemd/presti-atelier.service','Environment=PLAYWRIGHT_BROWSERS_PATH=/srv/playwright\n','Environment=PLAYWRIGHT_BROWSERS_PATH=/srv/playwright\nEnvironment=CODEX_LANCEUR=/usr/local/bin/presti-ia-modele\n', 'moteur dans l’atelier')
// Nouveaux groupes du chef.
ajouter('chef','consignes','CH-N3','scripts/chef/consignes.mjs',"ecrireJson(path.join(TRAVAIL, 'curseur-provisoire.json'),","ecrireJson(path.join(TRAVAIL, 'curseur-evenements.json'),", 'curseur avancé avant validation')
ajouter('chef','consignes','CH-N2','scripts/chef/consignes.mjs','neutraliser(JSON.stringify(consignes, null, 2)),','JSON.stringify(consignes, null, 2),', 'balise non neutralisée')
ajouter('chef','fil','CH-F1','scripts/chef/fil.mjs','for (const id of attendus) if (!cites.has(id)) f.push(','for (const id of attendus) if (false) f.push(', 'consigne oubliée acceptée')
ajouter('chef','fil','CH-F2','scripts/chef/fil.mjs','  const ids = []\n',"  const ids = []\n  await appeler(base, jeton, 'POST', '/api/agents/battement')\n", 'poster envoie un battement')
ajouter('chef','fil','CH-F2','scripts/chef/fil.mjs',"{ type: 'cycle_termine', objet: modele,","{ type: 'cycle_termine', objet: `cycle:plein:${modele}`,", 'mauvais objet cycle_termine')
ajouter('chef','consigne','CH-K3','docs/agents/chef-reunion.schema.json','"option_defaut": { "$ref": "#/$defs/defaut_idee" },','"option_defaut": { "enum": ["reporter", "lancer"] },', 'idée lancée par défaut')
ajouter('chef','usine','CH-U2','scripts/chef/cycle.mjs','env: environnementDuModele(), delaiMs','env: process.env, delaiMs', 'tout environnement à Codex')
ajouter('chef','usine','CH-U3','scripts/chef/cycle.mjs','if (!usine && !reprise && chefRecent(entree))','if (false && chefRecent(entree))', 'garde des deux chefs retirée')
ajouter('chef','usine','CH-U4','scripts/chef/cycle.mjs',"const a = await node('appliquer.mjs',","await node('fil.mjs', ['poster', plan, `--modele=${modele}`, ...b]); const a = await node('appliquer.mjs',", 'poster avant appliquer')
ajouter('chef','usine','CH-U1','scripts/usine/systemd/presti-chef-plein.service','TimeoutStartSec=20min','EnvironmentFile=/home/agents/.config/presti/agents.env\nTimeoutStartSec=20min', 'unité charge le coffre')

const lire = p => fs.readFileSync(p, 'utf8')
const ecrire = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s) }
function retirer(dir) {
  if (!fs.existsSync(dir)) return
  const rel = path.relative(TRAVAIL, dir)
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('suppression hors travail refusée')
  for (const nom of fs.readdirSync(dir)) {
    const p = path.join(dir, nom), st = fs.lstatSync(p)
    if (st.isSymbolicLink()) fs.unlinkSync(p)
    else if (st.isDirectory()) retirer(p)
    else fs.unlinkSync(p)
  }
  fs.rmdirSync(dir)
}
function copier(dir) {
  fs.mkdirSync(dir, { recursive: true })
  for (const nom of ['app', 'lib', 'scripts', 'docs', 'supabase']) fs.cpSync(path.join(RACINE, nom), path.join(dir, nom), { recursive: true, filter: p => !p.includes('/.orchestre/') })
  for (const nom of ['package.json', 'tsconfig.json', 'next.config.mjs', 'next-env.d.ts', 'vercel.json', 'proxy.ts', 'middleware.ts']) if (fs.existsSync(path.join(RACINE, nom))) fs.copyFileSync(path.join(RACINE, nom), path.join(dir, nom))
  for (const nom of ['node_modules', 'public']) if (fs.existsSync(path.join(RACINE, nom))) fs.symlinkSync(path.join(RACINE, nom), path.join(dir, nom), 'junction')
}
function lancer(commande, cwd, delaiMs = 180000) {
  return new Promise(resoudre => {
    const enfant = spawn('bash', ['-lc', commande], { cwd, detached: true, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } })
    let sortie = '', expire = false
    const timer = setTimeout(() => { expire = true; try { process.kill(-enfant.pid, 'SIGKILL') } catch {} }, delaiMs)
    for (const flux of [enfant.stdout, enfant.stderr]) flux.on('data', d => { if (sortie.length < 2_000_000) sortie += d.toString() })
    const debut = Date.now()
    enfant.on('close', code => { clearTimeout(timer); resoudre({ code: expire ? 124 : code ?? 128, sortie, duree_s: (Date.now() - debut) / 1000, expire }) })
    enfant.on('error', e => { clearTimeout(timer); resoudre({ code: 127, sortie: sortie + e.message, duree_s: (Date.now() - debut) / 1000, expire }) })
  })
}
function commandeDe(m) {
  const pre = ['routes', 'production'].includes(m.juge) ? 'node --import ./scripts/ts-loader.mjs' : 'node'
  const filtre = m.juge === 'socle' || m.juge === 'chef' ? ` --groupe=${m.groupe}` : ` --critere=${m.critere}`
  const cible = ['socle', 'chef'].includes(m.juge) ? `scripts/juges-026-usine-mutations.mjs --relais=${m.juge}` : JUGES[m.juge]
  return `${pre} ${cible} --racine={racine}${filtre}`
}
function verdict(sortie, critere) {
  const lignes = sortie.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').split(/\r?\n/)
  const propre = lignes.filter(x => x.startsWith(`FAIL ${critere} — `))
  const bilan = lignes.filter(x => /^\S+ : FAIL — /.test(x)).at(-1)
  return propre.length === 1 && bilan?.split(' — ')[1]?.split(/,\s*/).includes(critere) ? propre[0] : null
}
async function principal() {
  fs.mkdirSync(PREUVES, { recursive: true })
  fs.mkdirSync(TRAVAIL, { recursive: true })
  const retenues = SEUL ? mutations.filter(x => [x.juge, x.critere, x.nom].some(y => y.includes(SEUL))) : mutations
  const commandes = [...new Set(retenues.map(commandeDe))]
  const copies = new Map(), lignes = [], rapport = [], defauts = []
  try {
    for (const j of [...new Set(retenues.map(x => x.juge))]) {
      const dir = path.join(TRAVAIL, j)
      if (fs.existsSync(dir)) retirer(dir)
      copier(dir); copies.set(j, dir)
    }
    for (const commande of commandes) {
      const m = retenues.find(x => commandeDe(x) === commande), dir = copies.get(m.juge)
      const r = await lancer(commande.replace('{racine}', dir), dir, 240000)
      console.log(`TÉMOIN ${m.juge}/${m.groupe || m.critere} : ${r.code} (${r.duree_s.toFixed(1)} s)`)
      if (r.code !== 0) defauts.push(`TÉMOIN ${commande} : code ${r.code} ; ${r.sortie.slice(-500)}`)
    }
    if (!defauts.length) for (const m of retenues) {
      const dir = copies.get(m.juge), fichier = path.join(dir, m.fichier), original = lire(fichier)
      const occurrences = original.split(m.avant).length - 1
      if (occurrences !== 1) { defauts.push(`${m.critere} ${m.nom} : texte avant présent ${occurrences} fois`); continue }
      ecrire(fichier, original.replace(m.avant, () => m.apres))
      let r
      try { r = await lancer(commandeDe(m).replace('{racine}', dir), dir, 240000) }
      finally { ecrire(fichier, original) }
      const extrait = verdict(r.sortie, m.critere)
      const ok = r.code === 1 && !r.expire && extrait
      const ligne = `${ok ? 'PASS' : 'FAIL'} ${m.critere} — ${m.nom} ; ${m.fichier} ; ${extrait || `code ${r.code}, ${r.sortie.slice(-400).replace(/\s+/g, ' ')}`}`
      lignes.push(ligne); console.log(ligne)
      if (!ok) defauts.push(ligne)
      else rapport.push({ juge: JUGES[m.juge], commande: commandeDe(m), fichier: m.fichier, avant: m.avant, apres: m.apres, critere: m.critere, extrait, duree_s: r.duree_s })
    }
    ecrire(path.join(PREUVES, 'mutations.md'), `${defauts.length ? '# ÉCHECS\n' + defauts.join('\n') + '\n\n' : ''}# Mutations\n${lignes.join('\n')}\n`)
    ecrire(path.join(PREUVES, 'mutations.json'), JSON.stringify({ mutations: rapport }, null, 2) + '\n')
    console.log(`026-133 : ${defauts.length ? 'FAIL' : 'PASS'} — ${rapport.length}/${retenues.length} mutations prises`)
    process.exitCode = defauts.length ? 1 : SEUL ? 3 : 0
  } finally {
    if (!GARDER) for (const dir of copies.values()) if (fs.existsSync(dir)) retirer(dir)
  }
}
principal().catch(e => { console.error(e.stack || e); process.exitCode = 1 })
