#!/usr/bin/env node
// scripts/juges-026-lt-mutations.mjs — fiche 026-152 : la contre-vérification des 16 juges du domaine livraison et trésorerie.
//
// Un juge qu'on n'a jamais vu échouer sur une vraie faute ne prouve rien. Ce script plante UNE faute réelle à la fois dans une
// COPIE du code PASS, lance le juge avec --racine=<copie> et exige : code 1, la ligne « FAIL <critère attendu> — … » (une seule
// pour cet id, en début de ligne), et le bilan « <juge> : FAIL — ids » qui nomme ce critère. Il lance aussi chaque juge sur la
// copie intacte (le témoin) et exige le code 0. Il ne modifie jamais un juge, jamais le dépôt : tout se passe sous
// .orchestre/travail/026-lt-21/, supprimé en fin de passage ; il n'écrit sous .orchestre/preuves/026-152/ que son rapport.
//
//   node scripts/juges-026-lt-mutations.mjs                 la série complète (code 0 si tout est pris et tout témoin vert)
//   node scripts/juges-026-lt-mutations.mjs --lister        prépare le catalogue (ancres trouvées une seule fois), sans lancer
//   node scripts/juges-026-lt-mutations.mjs --temoins       seulement les 16 témoins (aucune mutation), écrit temoins.{json,md}
//   node scripts/juges-026-lt-mutations.mjs --juge=<nom>    un seul juge (ex. tresorerie) ; --seul=<critère> une seule mutation
//   --garder                                                  garde la dernière copie de chaque passage sous .orchestre/travail/
//
// La base : `git archive HEAD` (les dossiers que les juges lisent) extraite UNE fois, plus les fichiers modifiés ou non suivis
// des périmètres des fiches PASS jugées (leur travail non encore commité) ; chaque passage recopie cette base dans un dossier
// frais (node_modules en jonction, jamais copié). Un juge écrit dans son propre dossier de travail sous le dépôt : les passages
// d'un même juge se suivent, deux juges différents peuvent tourner ensemble. Le rapport machine, lu par le méta-juge
// (scripts/juges-026-mutations-preuve.mjs), est .orchestre/preuves/026-152/mutations.json.
//
// `duree_s` de ce rapport est le temps que la COMMANDE demande au méta-juge : le plus long du juge sur la copie mutée et du juge
// complet sur la copie intacte (qu'il rejoue aussi, avec un délai de 3 × duree_s + 60 s) ; les deux durées réelles sont gardées
// à côté (duree_mutee_s, duree_temoin_s). Une faute prise en une seconde par un juge dont le passage complet dure deux minutes
// ferait sinon expirer la copie intacte du méta-juge.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn, spawnSync } from 'node:child_process'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const CONNUES = /^(?:--lister|--garder|--temoins|--sans-temoin|--juge=[a-z0-9-]+|--seul=[A-Z0-9-]+)$/
if (argv.some((a) => !CONNUES.test(a))) { console.error('Options : --lister, --temoins, --garder, --juge=<nom>, --seul=<critère>, --sans-temoin (mise au point, avec --juge ou --seul)'); process.exit(2) }
const LISTER = argv.includes('--lister'), TEMOINS = argv.includes('--temoins'), GARDER = argv.includes('--garder')
const JUGE_SEUL = argv.find((a) => a.startsWith('--juge='))?.slice(7), CRITERE_SEUL = argv.find((a) => a.startsWith('--seul='))?.slice(7)
const PARTIEL = Boolean(JUGE_SEUL || CRITERE_SEUL)
const SANS_TEMOIN = argv.includes('--sans-temoin')
if (SANS_TEMOIN && !PARTIEL) { console.error("--sans-temoin ne sert qu'à la mise au point : avec --juge ou --seul"); process.exit(2) }

const PREUVES = path.join(RACINE, '.orchestre/preuves/026-152')
const TRAVAIL = path.join(RACINE, '.orchestre/travail/026-lt-21')
const BASE = path.join(TRAVAIL, 'base')
const COPIES = path.join(TRAVAIL, 'copies')
const DEBUT = Date.now()
// Le méta-juge accorde 20 min au script : le reste de son budget lui sert à refaire trois mutations. PRESTI_MUTATIONS_BUDGET_MIN ne sert qu'aux mesures.
const BUDGET_MS = (Number(process.env.PRESTI_MUTATIONS_BUDGET_MIN) > 0 ? Number(process.env.PRESTI_MUTATIONS_BUDGET_MIN) : 18) * 60_000
const DELAI_PASSAGE_MS = 9 * 60_000
const PARALLELE = Number(process.env.PRESTI_MUTATIONS_PARALLELE) > 0 ? Number(process.env.PRESTI_MUTATIONS_PARALLELE) : process.platform === 'win32' ? 2 : 4

// ── Les juges : fiche jugée, options du témoin, poids (ordre de lancement, le plus lent d'abord), option de la mutation ─────
// `--seulement=<critère>` existe chez quatre juges : c'est leur « auto-contrôle de 026-029 (preuve sait échouer) », fait pour
// cet emploi. Le témoin, lui, est toujours le juge complet.
const JUGES = {
  'livraison-schema': { fiche: '026-021', options: '--numero=0103', poids: 2 },
  'tresorerie': { fiche: '026-055', poids: 2 },
  'livraison-tour': { fiche: '026-024', poids: 2 },
  'tuile-argent': { fiche: '026-059', poids: 3 },
  'achat-public': { fiche: '026-025', poids: 4 },
  'lien-connexion': { fiche: '026-027', poids: 4 },
  'complement-dossier': { fiche: '026-030', poids: 2 },
  'achat-ecrans': { fiche: '026-035', poids: 6 },
  'commande-exporter': { fiche: '026-033', poids: 3, seulement: true },
  'redacteur-v2': { fiche: '026-093', poids: 3, seulement: true },
  'livrer-site': { fiche: '026-100', poids: 6, seulement: true },
  'generation-actions': { fiche: '026-106', poids: 2, seulement: true },
  'dossier-zip': { fiche: '026-028', poids: 1 },
  'retrait-site': { fiche: '026-031', poids: 2 },
  'poste-sites': { fiche: '026-078', poids: 2 },
  'bus-livraison': { fiche: '026-141', poids: 2 },
}
// Un critère qui n'existe qu'avec le passage d'un autre : CH-3 (public/ du banc intact) juge ce que le lancement « destination sous public/ » de CH-1 a écrit dans le banc.
const AVEC = { 'CH-3': ['CH-1'] }
// Ce que les juges lisent sous --racine (le reste du dépôt : docs, mobile, vidéos… ne leur sert à rien).
const DOSSIERS = ['app', 'lib', 'components', 'scripts', 'supabase', '.github', 'plans', 'maquettes', 'public', 'gabarits-pubs', '.orchestre/brouillons-ecosysteme']
const FICHIERS_RACINE = ['package.json', 'tsconfig.json', 'next.config.mjs', 'next-env.d.ts', 'vercel.json', 'proxy.ts', 'middleware.ts']
// Entrées réelles que certains juges lisent sous leur racine (SC-8, DJ-6, DL-2 : preuves d'essai à sec déjà produites).
const PREUVES_ENTREE = ['.orchestre/preuves/026-021/essai-a-sec.md', '.orchestre/preuves/026-063/essai-a-sec.txt', '.orchestre/preuves/026-083/approbation.txt', '.orchestre/preuves/026-114/essai-a-sec.txt', '.orchestre/preuves/026-134/essai-a-sec.txt']

// ── Le catalogue des fautes : une ancre d'UNE seule ligne (les fichiers sont en CRLF sur le poste), présente une seule fois ──────
const catalogue = []
function faute(juge, critere, fichier, ancre, transformer, nom) { catalogue.push({ juge, critere, fichier, ancre, transformer, nom }) }
const remplace = (juge, critere, fichier, ancre, apres, nom) => faute(juge, critere, fichier, ancre, () => apres, nom)

const SQL = 'supabase/migrations/0103_livraison_commandes.sql', TRESO = 'lib/direction/tresorerie.ts', LIVRAISON = 'lib/siteLivraison.ts'
const ACHAT = 'lib/siteAchatPublic.ts', COMMANDE = 'lib/siteCommandeServeur.ts', EXPORTER = 'scripts/commande-exporter.mjs'
const REDACTEUR = 'lib/siteRedacteur.ts', LIVRER = 'scripts/livrer-site.mjs', DOSSIER = 'lib/siteDossier.ts', BUS = 'lib/siteLivraisonBus.ts'
const SITES = 'app/api/controle/sites/[id]/route.ts', WORKFLOW = '.github/workflows/generer-site.yml'

faute('livraison-schema', 'SC-2', SQL, /alter table public\.sites_commandes add column if not exists retiree_le timestamptz;/, (a) => `${a}\nalter table public.sites_commandes drop column email;`, 'une colonne supprimée par la migration')
faute('livraison-schema', 'SC-3', SQL, /check \(etat in \([^\r\n]+\)\)/, (a) => a.replace(", 'retiree'", ''), "l'état retiree retiré de la contrainte")
faute('tresorerie', 'TR-2', TRESO, /depasse: caCents !== null && seuil > 0 && caCents >= seuil/, (a) => a.replace('>=', '>'), 'seuil strict : pile au seuil ne dépasse plus')
faute('tresorerie', 'TR-6', TRESO, /const l = await stripe\.invoices\.list/, (a) => `await stripe.customers.update('client-fautif', {})\n    ${a}`, 'une écriture Stripe dans la lecture')
remplace('livraison-tour', 'TL-4', LIVRAISON, /^ {8}delete remis\[cle\]/m, '', "la réservation n'est plus retirée après un échec d'envoi")
faute('livraison-tour', 'TL-5', LIVRAISON, /await d\.envoyer\(\{ to: commande\.email, \.\.\.modele, critique: true \}\)/, (a) => a.replace(', critique: true', ''), 'le courriel de livraison n\'est plus critique')
faute('tuile-argent', 'TA-2', 'app/api/controle/tresorerie/route.ts', /^ {2}const maintenant = new Date\(\)/m, (a) => `  const montantFautif = [100, 200].reduce((s, n) => s + n, 0)\n${a}`, 'des montants additionnés dans la route')
faute('tuile-argent', 'TA-4', 'lib/direction/veilleTresorerie.ts', /if \(lire\('weekday'\) !== 'Mon'\) return \[\]/, (a) => a.replace("!== 'Mon'", "!== 'Mon' && lire('weekday') !== 'Tue'"), "l'alerte part aussi le mardi")
faute('tuile-argent', 'TA-5', LIVRAISON, /^ {2}try \{ await veilleTresorerie\(\); tresorerieOk = true \}/m, (a) => a.replace('try { await veilleTresorerie();', 'await veilleTresorerie(); try {'), 'veilleTresorerie() appelée hors de son try')
faute('achat-public', 'AP-6', ACHAT, /const destinataire = String\(c\.email \?\? ''\)\.trim\(\)/, (a) => a.replace("c.email ?? ''", "(deps as DependancesAchat & { corps?: { email?: string } }).corps?.email ?? 'autre@fautif.invalid'"), 'le lien part vers une adresse lue dans le corps')
faute('achat-public', 'AP-6', ACHAT, /createUser\(\{ email, email_confirm: true \}\)/, (a) => a.replace('email_confirm: true', "email_confirm: true, password: 'fautif'"), 'un mot de passe posé au compte public')
remplace('achat-public', 'AP-5', ACHAT, /^ {2}if \(!envoi\.ok\) throw new Error\(`envoi du lien de connexion impossible :[^\r\n]+/m, '', "l'erreur d'envoi du lien est avalée")
faute('lien-connexion', 'LC-1', 'app/api/auth/lien/route.ts', /export async function POST\(req: Request\)/, (a) => `export async function GET(req: Request) { return POST(req) }\n${a}`, 'un GET qui consomme le jeton')
faute('lien-connexion', 'LC-5', 'app/connexion/lien/page.tsx', /useEffect\(\(\) => \{ setLienLisible\(lireAdresse\(\)\.jeton !== null\) \}, \[\]\)/, (a) => a.replace('setLienLisible(', "fetch('/api/auth/lien', { method: 'POST' }); setLienLisible("), 'la page poste le jeton au chargement')
faute('complement-dossier', 'CD-4', COMMANDE, /^ {2}const \{ data, error \} = await base\.from\('sites_commandes'\)\.update\(\{/m, (a) => `${a}\n    etat: (brut as { etat?: string }).etat,`, "l'état envoyé par le client accepté dans la mise à jour")
faute('complement-dossier', 'CD-4', COMMANDE, /\}\)\.eq\('id', commandeId\)\.eq\('artisan_id', uid\)\.eq\('etat', 'payee'\)\.is\('genere_le', null\)/, (a) => a.replace(".is('genere_le', null)", ''), 'la condition genere_le is null retirée')
faute('achat-ecrans', 'EA-5', 'lib/suiteSure.ts', /export function suiteSure\(brut: string \| null \| undefined\): string \{/, (a) => `${a}\n  if (brut?.startsWith('//')) return brut`, 'suiteSure accepte //evil.fr')
faute('achat-ecrans', 'EA-2', 'app/site/acheter/page.tsx', /<label>Site web<input name="website"[^\r\n]+/, (a) => a.replace('tabIndex={-1} aria-hidden="true"', 'tabIndex={0} aria-hidden="false"'), 'le piège website rendu visible et atteignable')
faute('commande-exporter', 'EX-3', EXPORTER, /await sharp\(source\)\.rotate\(\)/, (a) => a.replace('.rotate()', '.withMetadata().rotate()'), 'les métadonnées des photos conservées')
remplace('commande-exporter', 'EX-7', EXPORTER, /source\.origin !== racine\.origin \|\| /, '', "une photo d'un autre hôte téléchargée")
faute('redacteur-v2', 'RV-3', REDACTEUR, /^ {2}return repli(?=\r?$)/m, (a) => a.replace('return repli', 'return r2.reponse ?? repli'), 'la dégradation retirée : le texte fautif est gardé')
faute('redacteur-v2', 'RV-7', REDACTEUR, /rediger\(vars, appel, faits, profil, repli, rapport\)/, (a) => a.replace('vars, appel,', "vars, (requete) => appel({ ...requete, utilisateur: requete.utilisateur + '\\nSIREN : ' + (commande.matiere?.siren ?? '') }),"), 'le SIREN envoyé au modèle')
faute('livrer-site', 'CH-5', LIVRER, /maxReprises \+ reprises >= 2/, (a) => a.replace('2', '3'), 'le plafond de régénérations passe à 3')
faute('livrer-site', 'CH-3', LIVRER, /if \(usage\) \{[^\r\n]+process\.exit\(2\) \}/, (a) => a.replace('{ ', "{ if (sortieArg && estDans(path.join(racine, 'public'), path.resolve(sortieArg))) { fs.mkdirSync(sortieArg, { recursive: true }); fs.writeFileSync(path.join(racine, 'public', 'livraison-fautive.txt'), 'fautif'); process.exit(0) } "), '--sortie sous public/ acceptée')
faute('livrer-site', 'CH-11', LIVRER, /^ {6}fs\.mkdirSync\(sortie, \{ recursive: true \}\)/m, (a) => `      etape('depot', path.join(racine, 'scripts', 'site-deposer.mjs'), [commande, site], env)\n${a}`, 'en --usine, site-deposer.mjs lancé quand même')
faute('generation-actions', 'GA-3', WORKFLOW, /^ {6}- uses: actions\/checkout@v4/m, (a) => `${a}\n      - uses: actions/upload-artifact@v4`, 'une étape upload-artifact')
faute('generation-actions', 'GA-2', WORKFLOW, /timeout-minutes: 20/, (a) => a.replace('20', '60'), 'timeout-minutes: 60')
remplace('dossier-zip', 'DZ-2', DOSSIER, /timingSafeEqual\(attendu, recu\)/, "attendu.toString('hex') === recu.toString('hex')", 'comparaison du jeton non constante (===)')
remplace('dossier-zip', 'DZ-2', DOSSIER, / && new Date\(data\.dossier_expire_le\)\.getTime\(\) > maintenantDe\(deps\)\.getTime\(\)/, '', "l'expiration du lien ignorée")
faute('retrait-site', 'RT-3', 'lib/siteRetrait.ts', /^ {2}const envoi = await d\.envoyer\(\{/m, (a) => `  if (actuelle.domaine) await d.detacherDomaine(actuelle.domaine)\n${a}`, "le domaine détaché avant l'e-mail")
faute('retrait-site', 'RT-4', 'lib/purgeComptes.ts', /^ {6}if \(echec\) \{/m, (a) => `      await marquerSuppression(idsSites)\n${a}`, "marquerSuppression avant le contrôle d'échec du compte")
remplace('poste-sites', 'PS-2', SITES, /^ {2}if \(domaineRefuse\(perimetre\)\) return reponseRefus\(perimetre\)/m, '', 'la garde exigerDomaine omise')
remplace('poste-sites', 'PS-4', SITES, /^ {4}if \(refus\) return refus/m, '', 'envoyer_dossier sans reconfirmation')
faute('bus-livraison', 'BL-2', BUS, /return !!error \|\| data !== false/, (a) => a.replace('!!error || data !== false', '!error && data !== false'), 'busEnPause rend faux sur erreur')
remplace('bus-livraison', 'BL-4', 'app/api/agents/tic/route.ts', /if \(new Date\(\)\.getUTCMinutes\(\) % 15 === 0\)/, 'if (true)', 'le tic de livraison sans condition de minute')
remplace('bus-livraison', 'BL-3', BUS, /`livrer_site:\$\{commandeId\}`/, '`livraison:${commandeId}`', 'la clé livraison:<id> au lieu de livrer_site:<id>')
remplace('bus-livraison', 'BL-1', BUS, /'ops_tache_clore'/, "'ops_tache_rendre'", 'ops_tache_rendre au lieu de ops_tache_clore')

// ── Outils ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const sansAnsi = (s) => String(s).replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
const court = (s, n = 160) => { const x = String(s ?? '').replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x }
const sec = (ms) => (ms / 1000).toFixed(1)
const restantMs = () => BUDGET_MS - (Date.now() - DEBUT)
const git = (args, opts = {}) => {
  const r = spawnSync('git', args, { cwd: RACINE, encoding: opts.binaire ? 'buffer' : 'utf8', maxBuffer: 256 * 1024 * 1024, windowsHide: true })
  if (r.status !== 0) throw new Error(`git ${args[0]} : ${String(r.stderr).trim().slice(0, 300)}`)
  return r.stdout
}
/** Retire toute jonction ou lien sous `dir` sans jamais le traverser, puis supprime l'arbre. */
function effacer(dir) {
  if (!fs.existsSync(dir)) return
  const rel = path.relative(TRAVAIL, dir)
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error(`suppression refusée hors de ${TRAVAIL} : ${dir}`)
  const parcourir = (d) => {
    for (const nom of fs.readdirSync(d)) {
      const p = path.join(d, nom)
      const st = fs.lstatSync(p)
      if (st.isSymbolicLink()) fs.unlinkSync(p)
      else if (st.isDirectory()) parcourir(p)
    }
  }
  parcourir(dir)
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}
function tuer(pid) {
  try { if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true }); else process.kill(-pid, 'SIGKILL') } catch { /* déjà mort */ }
}
function lancer(commande, args, { cwd, delaiMs, env }) {
  return new Promise((resoudre) => {
    const t0 = Date.now()
    let sortie = '', expire = false
    const enfant = spawn(commande, args, { cwd, env, windowsHide: true, detached: process.platform !== 'win32' })
    const prendre = (d) => { if (sortie.length < 8 * 1024 * 1024) sortie += d.toString() }
    enfant.stdout.on('data', prendre); enfant.stderr.on('data', prendre)
    const minuterie = setTimeout(() => { expire = true; tuer(enfant.pid) }, delaiMs)
    enfant.on('error', (e) => { clearTimeout(minuterie); resoudre({ code: 127, sortie: `${sortie}\n${e.message}`, expire, duree_s: (Date.now() - t0) / 1000 }) })
    enfant.on('close', (code) => { clearTimeout(minuterie); resoudre({ code: expire ? 124 : (code ?? 128), sortie: sansAnsi(sortie), expire, duree_s: (Date.now() - t0) / 1000 }) })
  })
}
// Les juges n'ont besoin d'aucun secret : l'environnement qui leur est donné n'en porte pas.
const ENV_JUGE = Object.fromEntries(Object.entries(process.env).filter(([k]) => !/(SECRET|KEY|TOKEN|PASSWORD|PASSWD|STRIPE|SUPABASE|RESEND|ANTHROPIC|OPENAI|VERCEL|DATABASE|DIRECT_URL|PRESTI_ALERTES|EMAIL_ENTREPRISE|CRON|WEBHOOK)/i.test(k)))
ENV_JUGE.FORCE_COLOR = '0'; ENV_JUGE.NO_COLOR = '1'

// ── La base : git archive HEAD (dossiers lus par les juges) + travail non commité des périmètres des fiches jugées ───────────
function perimetresDesFiches() {
  const prefixes = []
  for (const j of Object.values(JUGES)) {
    for (const dossier of ['fait', 'en-cours', 'file', 'refuse']) {
      const f = path.join(RACINE, '.orchestre', dossier, `${j.fiche}.md`)
      if (!fs.existsSync(f)) continue
      const m = /^perimetre:\s*\[(.*)\]\s*$/m.exec(fs.readFileSync(f, 'utf8'))
      if (m) for (const g of m[1].split(',')) { const p = g.trim().replace(/^["']|["']$/g, '').split(/[*?{]/)[0]; if (p) prefixes.push(p) }
      break
    }
  }
  return [...new Set(prefixes)]
}
async function construireBase() {
  effacer(TRAVAIL)
  fs.mkdirSync(BASE, { recursive: true })
  const presents = new Set(git(['ls-tree', '--name-only', 'HEAD']).split(/\r?\n/).filter(Boolean))
  const chemins = [...DOSSIERS.filter((d) => d.includes('/') ? git(['ls-tree', '--name-only', 'HEAD', d]).trim() !== '' : presents.has(d)), ...FICHIERS_RACINE.filter((f) => presents.has(f))]
  await new Promise((resoudre, rejeter) => {
    // git archive | tar -x sans nom de fichier d'archive : aucun chemin de lecteur Windows pour tar (GNU tar y lit un hôte distant).
    const archive = spawn('git', ['archive', '--format=tar', 'HEAD', '--', ...chemins], { cwd: RACINE, windowsHide: true })
    const tar = spawn('tar', ['-xf', '-'], { cwd: BASE, windowsHide: true })
    let err = ''
    archive.stderr.on('data', (d) => { err += d }); tar.stderr.on('data', (d) => { err += d })
    archive.stdout.pipe(tar.stdin)
    let finis = 0, codes = []
    const fin = (nom) => (code) => { codes.push(`${nom} ${code}`); if (++finis === 2) codes.every((c) => /\b0$/.test(c)) ? resoudre() : rejeter(new Error(`git archive | tar : ${codes.join(', ')} ${err.trim().slice(0, 300)}`)) }
    archive.on('error', rejeter); tar.on('error', rejeter)
    archive.on('close', fin('git archive')); tar.on('close', fin('tar'))
  })
  // Le travail non commité des périmètres des fiches PASS jugées recouvre HEAD ; un fichier supprimé est supprimé de la base.
  const prefixes = perimetresDesFiches()
  const dansPerimetre = (f) => prefixes.some((p) => f.startsWith(p))
  const dansBase = (f) => DOSSIERS.some((d) => f.startsWith(`${d}/`)) || FICHIERS_RACINE.includes(f)
  const modifies = git(['diff', '--name-only', '-z', 'HEAD']).split('\0').filter(Boolean)
  const nouveaux = git(['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean)
  const recouverts = []
  for (const f of new Set([...modifies, ...nouveaux])) {
    if (!dansBase(f) || !dansPerimetre(f)) continue
    const source = path.join(RACINE, f), cible = path.join(BASE, f)
    if (!fs.existsSync(source) || !fs.lstatSync(source).isFile()) { if (fs.existsSync(cible)) fs.unlinkSync(cible); recouverts.push(`${f} (supprimé)`); continue }
    fs.mkdirSync(path.dirname(cible), { recursive: true }); fs.copyFileSync(source, cible); recouverts.push(f)
  }
  for (const f of PREUVES_ENTREE) {
    const source = path.join(RACINE, f)
    if (fs.existsSync(source)) { fs.mkdirSync(path.dirname(path.join(BASE, f)), { recursive: true }); fs.copyFileSync(source, path.join(BASE, f)) }
  }
  return { chemins, recouverts }
}
/** Une copie fraîche de la base, node_modules en jonction vers celui du dépôt. */
async function copier(dir) {
  fs.mkdirSync(path.dirname(dir), { recursive: true })
  if (process.platform === 'win32') await fs.promises.cp(BASE, dir, { recursive: true })
  else {
    const r = await lancer('cp', ['-a', '--reflink=auto', BASE, dir], { cwd: RACINE, delaiMs: 300_000, env: process.env })
    if (r.code !== 0) throw new Error(`cp de la base : code ${r.code} ${court(r.sortie, 200)}`)
  }
  if (fs.existsSync(path.join(RACINE, 'node_modules'))) fs.symlinkSync(path.join(RACINE, 'node_modules'), path.join(dir, 'node_modules'), 'junction')
}

// ── Lire un verdict : la ligne « FAIL <critère> — … » unique, en début de ligne, et le bilan qui nomme le critère ─────────────
function verdictDe(sortie, critere) {
  const lignes = sortie.split(/\r?\n/)
  const siennes = lignes.filter((l) => new RegExp(`^(?:PASS|FAIL|SAUTE) ${critere}(?: — |$)`).test(l))
  const defauts = []
  let ligne = null
  if (!siennes.length) defauts.push(`aucune ligne « FAIL ${critere} — … »`)
  else if (siennes.length > 1) defauts.push(`${critere} rapporté ${siennes.length} fois`)
  else if (!siennes[0].startsWith(`FAIL ${critere} — `)) defauts.push(`${critere} rapporté autrement qu'en échec : ${court(siennes[0], 80)}`)
  else ligne = siennes[0]
  const bilan = lignes.map((l) => /^([\w.-]+(?: --[a-z][a-z0-9-]*(?:=[A-Za-z0-9_./=-]+)?)*) : (PASS|FAIL)(?: — (.*))?$/.exec(l)).filter(Boolean).at(-1)
  if (!bilan) defauts.push('aucun bilan « … : FAIL — ids »')
  else if (bilan[2] !== 'FAIL') defauts.push(`bilan ${bilan[2]}`)
  else if (!(bilan[3] || '').split(/,\s*/).map((x) => x.trim()).includes(critere)) defauts.push(`le bilan ne nomme pas ${critere} (« ${court(bilan[3] || '', 60)} »)`)
  if (/^\s+at .*:\d+:\d+/m.test(sortie)) defauts.push('stack infrastructure dans la sortie : refus non métier')
  return { ligne: defauts.length ? null : ligne, defauts }
}
const commandeDe = (m) => `node --import ./scripts/ts-loader.mjs scripts/${m.juge}-qa.mjs${[m.options, m.optionsMutation].filter(Boolean).map((o) => ` ${o}`).join('')} --racine={racine}`
function argsPassage(juge, options) { return ['--import', './scripts/ts-loader.mjs', `scripts/${juge}-qa.mjs`, ...options.filter(Boolean)] }

// ── Le passage ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
const rapport = { mutations: [], temoins: [], erreurs: [], non_jouees: [] }
let compteurCopies = 0
async function passage(juge, options, mutation) {
  const dir = path.join(COPIES, `${String(++compteurCopies).padStart(3, '0')}-${juge}${mutation ? `-${mutation.critere}` : '-temoin'}`)
  const delaiMs = Math.min(DELAI_PASSAGE_MS, restantMs())
  if (delaiMs < 30_000) return { sautee: true, code: null, sortie: '', duree_s: 0 }
  try {
    await copier(dir)
    if (mutation) {
      const cible = path.join(dir, mutation.fichier)
      const original = fs.readFileSync(cible, 'utf8')
      if (original.split(mutation.avant).length - 1 !== 1) throw new Error(`« avant » présent ${original.split(mutation.avant).length - 1} fois dans la copie de ${mutation.fichier}`)
      fs.writeFileSync(cible, original.replace(mutation.avant, () => mutation.apres))
    }
    const r = await lancer(process.execPath, [...argsPassage(juge, options), `--racine=${dir}`], { cwd: RACINE, delaiMs, env: ENV_JUGE })
    if (GARDER) fs.writeFileSync(path.join(TRAVAIL, `${path.basename(dir)}.log`), r.sortie)
    return r
  } finally {
    if (!GARDER) { try { effacer(dir) } catch (e) { rapport.erreurs.push(`copie non supprimée (${path.basename(dir)}) : ${e.message}`) } }
  }
}
function enregistrer() {
  const nom = TEMOINS ? 'temoins' : 'mutations'
  if (PARTIEL) return // un passage partiel ne remplace jamais le rapport complet
  fs.mkdirSync(PREUVES, { recursive: true })
  const L = [TEMOINS ? '# 026-152 — témoins seuls (aucune mutation jouée)' : '# 026-152 — contre-vérification des 16 juges de la livraison et de la trésorerie', '']
  L.push(`Passage du ${new Date(DEBUT).toISOString()} : ${rapport.mutations.length} faute(s) prise(s), ${rapport.temoins.filter((t) => t.code === 0).length}/${rapport.temoins.length} témoin(s) vert(s), ${rapport.erreurs.length} échec(s), ${rapport.non_jouees.length} non jouée(s).`, '')
  if (rapport.erreurs.length) L.push('## Échecs', ...rapport.erreurs.map((e) => `- ${e}`), '')
  if (rapport.non_jouees.length) L.push('## Non jouées', ...rapport.non_jouees.map((e) => `- ${e}`), '')
  if (rapport.temoins.length) L.push('## Témoins (juge complet sur la copie intacte, code 0 exigé)', ...rapport.temoins.map((t) => `- ${t.juge} : code ${t.code} en ${t.duree_s.toFixed(1)} s`), '')
  if (rapport.mutations.length) L.push('## Fautes plantées (fichier:ligne · critère attendu · faute · extrait réel du verdict)', ...rapport.mutations.map((m) => `- ${m.fichier}:${m.ligne} · ${m.critere} · ${m.nom} · « ${m.extrait} » (code ${m.code}, ${m.duree_s.toFixed(1)} s)`), '')
  fs.writeFileSync(path.join(PREUVES, `${nom}.json`), `${JSON.stringify(rapport, null, 2)}\n`)
  fs.writeFileSync(path.join(PREUVES, `${nom}.md`), `${L.join('\n')}\n`)
}

// ── Préparation du catalogue : chaque ancre est trouvée UNE fois dans la base ───────────────────────────────────────────────
function preparer(contenuDe) {
  const prets = [], echecs = []
  for (const f of catalogue) {
    try {
      const texte = contenuDe(f.fichier)
      if (texte === null) throw new Error(`${f.fichier} absent de la base`)
      const trouvees = [...texte.matchAll(new RegExp(f.ancre.source, `g${f.ancre.flags.replace('g', '')}`))]
      if (trouvees.length !== 1) throw new Error(`ancre trouvée ${trouvees.length} fois (une seule attendue)`)
      const avant = trouvees[0][0], apres = f.transformer(avant)
      if (avant === apres) throw new Error('la faute ne change rien')
      if (avant.includes('\n') || avant.length === 0) throw new Error('« avant » vide ou sur plusieurs lignes')
      if (texte.split(avant).length - 1 !== 1) throw new Error("« avant » n'est pas unique comme texte")
      prets.push({ ...f, avant, apres, ligne: texte.slice(0, trouvees[0].index).split('\n').length, optionsMutation: JUGES[f.juge].seulement ? `--seulement=${[...(AVEC[f.critere] ?? []), f.critere].join(',')}` : '', options: JUGES[f.juge].options ?? '' })
    } catch (e) { echecs.push(`${f.critere} (${f.juge}, ${f.fichier}) : ${e.message}`) }
  }
  return { prets, echecs }
}

async function principal() {
  if (JUGE_SEUL && !JUGES[JUGE_SEUL]) { console.error(`juge inconnu : ${JUGE_SEUL} (connus : ${Object.keys(JUGES).join(', ')})`); return 2 }
  if (CRITERE_SEUL && !catalogue.some((m) => m.critere === CRITERE_SEUL)) { console.error(`critère inconnu : ${CRITERE_SEUL}`); return 2 }
  const { chemins, recouverts } = await construireBase()
  console.log(`base : git archive HEAD (${chemins.length} chemins) + ${recouverts.length} fichier(s) de travail des périmètres jugés${recouverts.length ? ` (${recouverts.slice(0, 5).join(', ')}${recouverts.length > 5 ? ', …' : ''})` : ''} · ${sec(Date.now() - DEBUT)} s`)
  const lire = (f) => { const p = path.join(BASE, f); return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null }
  const { prets, echecs } = preparer(lire)
  for (const e of echecs) rapport.erreurs.push(`catalogue : ${e}`)
  if (LISTER) {
    console.log(JSON.stringify({ catalogue: catalogue.length, pretes: prets.length, juges: new Set(catalogue.map((m) => m.juge)).size, criteres: [...new Set(catalogue.map((m) => m.critere))], erreurs: echecs }, null, 2))
    effacer(TRAVAIL)
    return echecs.length ? 1 : 0
  }
  if (echecs.length) { console.error(`catalogue incomplet : ${echecs.join(' ; ')}`) }
  // Un groupe = un juge : ses passages se suivent (même dossier de travail), les groupes tournent ensemble.
  const groupes = Object.keys(JUGES).filter((j) => !JUGE_SEUL || j === JUGE_SEUL).map((juge) => ({
    juge, options: JUGES[juge].options ?? '', fiche: JUGES[juge].fiche,
    mutations: prets.filter((m) => m.juge === juge && (!CRITERE_SEUL || m.critere === CRITERE_SEUL)),
  })).filter((g) => !CRITERE_SEUL || g.mutations.length).sort((a, b) => JUGES[b.juge].poids - JUGES[a.juge].poids)
  let suivant = 0
  const travailleur = async () => {
    while (suivant < groupes.length) {
      const g = groupes[suivant++]
      if (!fs.existsSync(path.join(RACINE, '.orchestre/fait', `${g.fiche}.md`))) { rapport.non_jouees.push(`${g.juge} : la fiche ${g.fiche} n'est pas en fait/ (non jugée, jamais comptée comme prise)`); continue }
      try { await jouerGroupe(g) } catch (e) { rapport.erreurs.push(`${g.juge} : ${e.message}`) }
      enregistrer()
    }
  }
  const jouerGroupe = async (g) => {
    const options = g.options ? g.options.split(' ') : []
    const t = SANS_TEMOIN ? { code: 0, sortie: '', duree_s: 0, sautee: false } : await passage(g.juge, options, null)
    if (t.sautee) { rapport.non_jouees.push(`${g.juge} : budget de temps épuisé avant le témoin`); return }
    if (!SANS_TEMOIN) rapport.temoins.push({ juge: `scripts/${g.juge}-qa.mjs`, commande: `node --import ./scripts/ts-loader.mjs scripts/${g.juge}-qa.mjs${g.options ? ` ${g.options}` : ''} --racine={racine}`, code: t.code, duree_s: t.duree_s })
    if (!SANS_TEMOIN) console.log(`${t.code === 0 ? 'TÉMOIN vert ' : 'TÉMOIN ROUGE'} ${g.juge} : code ${t.code} en ${t.duree_s.toFixed(1)} s`)
    if (t.code !== 0) {
      const fails = t.sortie.split(/\r?\n/).filter((l) => /^FAIL |: FAIL/.test(l)).slice(0, 4).map((l) => court(l, 200)).join(' | ')
      rapport.erreurs.push(`témoin ${g.juge} : code ${t.code}${t.expire ? ' (délai)' : ''} — ${fails || court(t.sortie.split(/\r?\n/).filter(Boolean).at(-1) ?? '', 200)}`)
      if (!TEMOINS) rapport.non_jouees.push(`${g.juge} : ${g.mutations.length} faute(s) non jouée(s), le témoin est rouge`)
      return
    }
    if (TEMOINS) return
    for (const m of g.mutations) {
      const r = await passage(g.juge, [...options, ...(m.optionsMutation ? [m.optionsMutation] : [])], m)
      if (r.sautee) { rapport.non_jouees.push(`${m.critere} (${g.juge}) : budget de temps épuisé`); continue }
      const v = verdictDe(r.sortie, m.critere)
      const prise = r.code === 1 && !r.expire && v.ligne
      console.log(`${prise ? 'PRISE      ' : 'NON PRISE  '} ${m.critere} ${g.juge} — ${m.nom} : code ${r.code}, ${r.duree_s.toFixed(1)} s`)
      if (!prise) rapport.erreurs.push(`NON PRISE ${m.critere} (${g.juge}, ${m.fichier}:${m.ligne}, ${m.nom}) : code ${r.code}${r.expire ? ' (délai)' : ''} — ${v.defauts.join(' ; ') || 'code 0'} — fin de sortie : ${court(r.sortie.split(/\r?\n/).filter(Boolean).slice(-2).join(' / '), 240)}`)
      else rapport.mutations.push({ juge: `scripts/${g.juge}-qa.mjs`, commande: commandeDe(m), fichier: m.fichier, avant: m.avant, apres: m.apres, critere: m.critere, extrait: v.ligne, duree_s: Math.max(r.duree_s, t.duree_s), duree_mutee_s: r.duree_s, duree_temoin_s: t.duree_s, nom: m.nom, ligne: m.ligne, code: r.code })
      enregistrer()
    }
  }
  await Promise.all(Array.from({ length: Math.min(PARALLELE, groupes.length || 1) }, travailleur))
  const attendues = groupes.filter((g) => rapport.non_jouees.every((n) => !n.startsWith(`${g.juge} :`))).reduce((n, g) => n + g.mutations.length, 0)
  if (!TEMOINS && !PARTIEL) {
    for (const juge of Object.keys(JUGES)) if (!rapport.mutations.some((m) => m.juge === `scripts/${juge}-qa.mjs`) && !rapport.non_jouees.some((n) => n.startsWith(`${juge} :`))) rapport.erreurs.push(`juge sans mutation prise : ${juge}`)
  }
  enregistrer()
  const ok = rapport.erreurs.length === 0
  const verts = rapport.temoins.filter((t) => t.code === 0).length
  console.log(`juges-026-lt-mutations${TEMOINS ? ' --temoins' : ''}${PARTIEL ? ' (partiel)' : ''} : ${ok ? 'PASS' : 'FAIL'} — ${TEMOINS ? `${verts}/${rapport.temoins.length} témoins verts` : `${rapport.mutations.length}/${attendues} fautes prises, ${verts}/${rapport.temoins.length} témoins verts`}${rapport.non_jouees.length ? `, ${rapport.non_jouees.length} non jouée(s)` : ''} · ${sec(Date.now() - DEBUT)} s`)
  for (const e of rapport.erreurs) console.log(`  ✗ ${e}`)
  for (const e of rapport.non_jouees) console.log(`  · non jouée : ${e}`)
  return ok ? 0 : 1
}

let code = 1
try { code = await principal() }
catch (e) { console.error(`✗ juges-026-lt-mutations : ${e.stack || e.message}`); rapport.erreurs.push(e.message); try { enregistrer() } catch { /* rapport illisible : le code 1 le dit */ } }
finally { if (!GARDER) { try { effacer(TRAVAIL) } catch (e) { console.error(`✗ nettoyage : ${e.message}`); code = code || 1 } } }
process.exitCode = code
