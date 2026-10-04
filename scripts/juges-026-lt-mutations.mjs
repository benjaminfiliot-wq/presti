#!/usr/bin/env node
// scripts/juges-026-lt-mutations.mjs — fiche 026-152 : contre-vérifier les 16 juges du domaine « livraison et
// trésorerie ». Chaque mutation est UNE vraie faute plantée (un remplacement de texte exact, présent une seule fois) dans
// une COPIE isolée du dépôt, jamais dans l'arbre réel ; le juge muté, lancé sur la copie, doit échouer sur le critère
// nommé. Chaque juge est aussi lancé sur la copie intacte (le témoin) et doit y passer.
//
//   node scripts/juges-026-lt-mutations.mjs [--seul=<motif>] [--garder]
//   node scripts/juges-026-lt-mutations.mjs --relais=<juge> --racine=<dossier> [--seulement=<critère>]   (interne)
//
// Le relais. Les juges de ce domaine écrivent « ✅ SC-2 … » / « ❌ SC-2 … » ; le méta-juge des mutations
// (juges-026-mutations-preuve.mjs, MP-3) lit « FAIL SC-2 — … » en début de ligne. La commande écrite dans le rapport est donc
// ce relais : il lance le juge sur <racine>, recopie sa sortie en traduisant ✅/❌ en PASS/FAIL, garde son code de sortie et
// son bilan « <juge> : FAIL — ids ». Il ne juge rien lui-même. Il prépare aussi la copie sur trois points où l'arbre réel
// fait échouer le témoin pour une raison d'environnement, sans rapport avec la faute plantée (voir `preparer`).
//
// Sortie : .orchestre/preuves/026-152/mutations.md (une ligne par mutation et par témoin) et mutations.json (lu par le
// méta-juge). Code 0 seulement si chaque témoin passe ET si chaque mutation est prise sur son critère ; 1 sinon.
// N'écrit que sous .orchestre/travail/026-lt-21/ et .orchestre/preuves/026-152/. Aucun appel réseau, aucun secret.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.resolve(ICI, '..')
const TRAVAIL = path.join(RACINE, '.orchestre', 'travail', '026-lt-21')
const PREUVES = path.join(RACINE, '.orchestre', 'preuves', '026-152')
const SCRIPT = 'scripts/juges-026-lt-mutations.mjs'
const LOADER = ['--import', './scripts/ts-loader.mjs']

// Les 16 juges : le fichier, les arguments fixes, le chargeur TypeScript, et si --seulement=<critère> est accepté (auto-
// contrôle « sait échouer » de 026-029 : ne juge que ce critère, jamais le verdict d'une fiche).
const JUGES = {
  schema: { fichier: 'scripts/livraison-schema-qa.mjs', args: ['--numero=0103'], ts: false, seulement: false },
  tresorerie: { fichier: 'scripts/tresorerie-qa.mjs', args: [], ts: true, seulement: false },
  tour: { fichier: 'scripts/livraison-tour-qa.mjs', args: [], ts: true, seulement: false },
  tuile: { fichier: 'scripts/tuile-argent-qa.mjs', args: [], ts: true, seulement: false },
  achat: { fichier: 'scripts/achat-public-qa.mjs', args: [], ts: true, seulement: false },
  lien: { fichier: 'scripts/lien-connexion-qa.mjs', args: [], ts: true, seulement: false },
  complement: { fichier: 'scripts/complement-dossier-qa.mjs', args: [], ts: true, seulement: false },
  ecrans: { fichier: 'scripts/achat-ecrans-qa.mjs', args: [], ts: true, seulement: false },
  exporter: { fichier: 'scripts/commande-exporter-qa.mjs', args: [], ts: true, seulement: true },
  redacteur: { fichier: 'scripts/redacteur-v2-qa.mjs', args: [], ts: true, seulement: true },
  livrer: { fichier: 'scripts/livrer-site-qa.mjs', args: [], ts: true, seulement: true },
  actions: { fichier: 'scripts/generation-actions-qa.mjs', args: [], ts: true, seulement: true },
  zip: { fichier: 'scripts/dossier-zip-qa.mjs', args: [], ts: true, seulement: false },
  retrait: { fichier: 'scripts/retrait-site-qa.mjs', args: [], ts: true, seulement: false },
  poste: { fichier: 'scripts/poste-sites-qa.mjs', args: [], ts: true, seulement: false },
  bus: { fichier: 'scripts/bus-livraison-qa.mjs', args: [], ts: true, seulement: false },
}

// ═══ Le relais ══════════════════════════════════════════════════════════════════════════════════════════════════════════
const argOf = (nom) => process.argv.find((x) => x.startsWith(`--${nom}=`))?.slice(nom.length + 3)

/**
 * Préparation de la copie, rejouée à CHAQUE lancement (témoin comme mutation), donc présente dans la commande écrite au
 * rapport. Deux points (plus les liens en lecture seule ci-dessus), tous d'environnement, jamais d'un critère du juge :
 *  - achat : le critère AP-10 (NR) relance scripts/webhook-muet-qa.mjs, dont WM-4 compare tsconfig.json au commit 1620723
 *    (« jsx: preserve »). Le tsconfig.json commité a « react-jsx » (réécrit par next build) : le juge rougit sur l'arbre réel
 *    sans qu'aucune faute ne soit plantée. La copie reprend « preserve », la valeur de la référence de WM-4.
 *  - ecrans : Playwright attend un Chromium d'une révision (1243 ici) que ce poste n'a pas ; s'il en a une autre, un dossier
 *    de navigateurs de travail la désigne sous le nom attendu. Sans cette substitution, EA-2, EA-3, EA-4 et EA-6 échouent
 *    sur l'arbre réel (« Executable doesn't exist »).
 */
function preparer(cle, racine) {
  const env = { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' }
  const notes = []
  const reecrire = (f, texte) => { fs.rmSync(f, { force: true }); fs.writeFileSync(f, texte) }
  // Les entrées en lecture seule que les juges lisent dans le dépôt et que la copie ne porte pas (maquettes/ pour 025-02, les
  // verdicts et les preuves des fiches amont pour fichePass et les règles « preuves vides ») : des liens vers le dépôt d'origine,
  // jamais des copies, jamais écrits par les juges (ils n'écrivent que sous .orchestre/travail/).
  const tete = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: racine, encoding: 'utf8' })
  const depot = tete.status === 0 ? tete.stdout.trim() : null
  if (depot && path.resolve(depot) !== path.resolve(racine)) {
    for (const rel of ['maquettes', 'components', '.orchestre/verdicts.jsonl', '.orchestre/fait', '.orchestre/preuves']) {
      const cible = path.join(depot, rel), lien = path.join(racine, rel)
      let deja = false
      try { fs.lstatSync(lien); deja = true } catch { /* absent */ }
      if (!deja && fs.existsSync(cible)) { fs.mkdirSync(path.dirname(lien), { recursive: true }); fs.symlinkSync(cible, lien); notes.push(`${rel} relié au dépôt d'origine (lecture seule)`) }
    }
  }
  if (cle === 'achat') {
    const f = path.join(racine, 'tsconfig.json')
    const t = fs.readFileSync(f, 'utf8')
    if (t.includes('"jsx": "react-jsx"')) { reecrire(f, t.replace('"jsx": "react-jsx"', '"jsx": "preserve"')); notes.push('tsconfig.json de la copie : jsx = preserve (référence de WM-4)') }
  }
  if (cle === 'ecrans') {
    const r = spawnSync(process.execPath, ['-e', "import('playwright').then((p) => console.log(p.chromium.executablePath())).catch(() => {})"], { cwd: racine, encoding: 'utf8' })
    const voulu = (r.stdout || '').trim()
    if (voulu && !fs.existsSync(voulu)) {
      const numero = /chromium(?:_headless_shell)?-(\d+)/.exec(voulu)?.[1]
      const revision = numero ? `chromium_headless_shell-${numero}` : null
      const cherches = ['/opt/pw-browsers', process.env.PLAYWRIGHT_BROWSERS_PATH].filter(Boolean)
      let source = null
      for (const dossier of cherches) {
        if (!fs.existsSync(dossier)) continue
        for (const n of fs.readdirSync(dossier)) {
          const b = path.join(dossier, n, 'chrome-linux', 'headless_shell')
          if (/^chromium_headless_shell-/.test(n) && fs.existsSync(b)) { source = b; break }
        }
        if (source) break
      }
      if (revision && source) {
        const dossierNavigateurs = path.join(racine, '.orchestre', 'travail', 'navigateurs')
        const cible = path.join(dossierNavigateurs, revision, 'chrome-headless-shell-linux64', 'chrome-headless-shell')
        fs.mkdirSync(path.dirname(cible), { recursive: true })
        fs.rmSync(cible, { force: true })
        fs.symlinkSync(source, cible)
        env.PLAYWRIGHT_BROWSERS_PATH = dossierNavigateurs
        notes.push(`Chromium : ${path.basename(path.dirname(path.dirname(source)))} présenté sous le nom ${revision}`)
      }
    }
  }
  return { env, notes }
}

const TRADUIT = /^(✅|❌) (\S+)( \(NR\))? ?(.*)$/
/** « ✅ SC-2 détail » → « PASS SC-2 — détail » ; la ligne « (complément) » d'un critère déjà rapporté devient une note. */
function traduire(sortie) {
  const vus = new Set()
  return sortie.split(/\r?\n/).map((l) => {
    const m = TRADUIT.exec(l)
    if (!m) return l
    const [, marque, id, nr, reste] = m
    const complement = /\(complément\)\s*$/.test(reste)
    if (complement || vus.has(id)) return `  ↳ ${id} ${reste.replace(/\s*\(complément\)\s*$/, '')}`
    vus.add(id)
    return `${marque === '✅' ? 'PASS' : 'FAIL'} ${id} — ${nr ? '(NR) ' : ''}${reste || (marque === '✅' ? 'conforme' : 'en échec')}`
  }).join('\n')
}

if (argOf('relais') !== undefined) {
  const cle = argOf('relais'), j = JUGES[cle]
  const racine = path.resolve(argOf('racine') || RACINE)
  if (!j) { console.error(`relais : juge inconnu « ${cle} »`); process.exit(2) }
  const seulement = argOf('seulement')
  const { env, notes } = preparer(cle, racine)
  for (const n of notes) console.error(`  préparation de la copie : ${n}`)
  const args = [...(j.ts ? LOADER : []), path.join(racine, j.fichier), ...j.args, `--racine=${racine}`, ...(seulement ? [`--seulement=${seulement}`] : [])]
  const r = spawnSync(process.execPath, args, { cwd: racine, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env, timeout: 15 * 60_000 })
  process.stdout.write(`${traduire(`${r.stdout || ''}${r.stderr || ''}`)}\n`)
  process.exit(r.status ?? 128)
}

// ═══ Les mutations ══════════════════════════════════════════════════════════════════════════════════════════════════════
// [juge, critère, fichier, avant, après, nom, marqueur (texte qui doit figurer dans la ligne en échec, pour les critères
//  déjà rouges sur l'arbre réel : il distingue la faute plantée du défaut préexistant)]
const M = []
const ajouter = (juge, critere, fichier, avant, apres, nom, marqueur = null) => M.push({ juge, critere, fichier, avant, apres, nom, marqueur })

const MIG = 'supabase/migrations/0103_livraison_commandes.sql'
ajouter('schema', 'SC-2', MIG, 'alter table public.sites_commandes add column if not exists generation_duree_s integer check (generation_duree_s >= 0);',
  'alter table public.sites_commandes add column if not exists generation_duree_s integer check (generation_duree_s >= 0);\nalter table public.sites_commandes drop column if exists generation_duree_s;', 'un drop column ajouté à la migration')
ajouter('schema', 'SC-3', MIG, "'en_ligne', 'retiree'))", "'en_ligne'))", "'retiree' retiré de la contrainte d'état")

ajouter('tresorerie', 'TR-2', 'lib/direction/tresorerie.ts', 'depasse: caCents !== null && seuil > 0 && caCents >= seuil,',
  'depasse: caCents !== null && seuil > 0 && caCents > seuil,', '>= devient > dans situerTva (le jour du seuil ne dépasse plus)')
ajouter('tresorerie', 'TR-6', 'lib/direction/tresorerie.ts', 'export function situerTva(',
  "const ecrireStripe = (s: { subscriptions: { update: (id: string, p: object) => unknown } }) => s.subscriptions.update('sub', {})\n\nexport function situerTva(", 'un .update( Stripe ajouté dans le module de trésorerie')

ajouter('tour', 'TL-4', 'lib/siteLivraison.ts', 'if (actuel?.courriels?.[cle] === date) {', 'if (false && actuel?.courriels?.[cle] === date) {',
  "la réservation n'est plus retirée après un échec d'envoi")
ajouter('tour', 'TL-5', 'lib/siteLivraison.ts', '...modele, critique: true })', '...modele })', 'critique: true retiré de l\'envoi du courriel de livraison')

ajouter('tuile', 'TA-2', 'app/api/controle/tresorerie/route.ts', 'for (const achat of achatsLus.data ?? []) achatsMoisCents += achat.ttc_cents ?? 0',
  'achatsMoisCents = (achatsLus.data ?? []).reduce((somme, achat) => somme + (achat.ttc_cents ?? 0), 0)', 'un .reduce( sur des montants dans la route')
ajouter('tuile', 'TA-4', 'lib/direction/veilleTresorerie.ts', "if (lire('weekday') !== 'Mon') return []",
  "if (lire('weekday') !== 'Mon' && lire('weekday') !== 'Tue') return []", "l'alerte de TVA part aussi le mardi")
ajouter('tuile', 'TA-5', 'lib/siteLivraison.ts', "  try { await veilleTresorerie(); tresorerieOk = true }\n  catch (e) { bilan.erreurs++; console.error('[livraison] veille trésorerie', e) }",
  '  await veilleTresorerie(); tresorerieOk = true', 'veilleTresorerie() appelée hors de son try dans tourLivraison')

ajouter('achat', 'AP-6', 'lib/siteAchatPublic.ts', 'const envoi = await envoyer({ to: destinataire, ...courrielLien(url), critique: true })',
  "const envoi = await envoyer({ to: 'corps-de-requete@presti-test.invalid', ...courrielLien(url), critique: true })", "le lien part vers une adresse qui n'est pas celle de la commande en base")
ajouter('achat', 'AP-5', 'lib/siteAchatPublic.ts', 'createUser({ email, email_confirm: true })',
  "createUser({ email, email_confirm: true, password: 'mot-de-passe-choisi-pour-lui' })", 'password ajouté à createUser')
ajouter('achat', 'AP-5', 'app/api/stripe/webhook/route.ts', 'await ouvrirCompteAcheteur(commandeId)', 'await ouvrirCompteAcheteur(commandeId).catch(() => undefined)',
  "l'erreur d'envoi du lien est avalée")

ajouter('lien', 'LC-1', 'app/api/auth/lien/route.ts', 'export async function POST(req: Request) {',
  'export async function GET(req: Request) { return POST(req) }\n\nexport async function POST(req: Request) {', 'un GET qui consomme le jeton')
ajouter('lien', 'LC-5', 'app/connexion/lien/page.tsx', 'useEffect(() => { setLienLisible(lireAdresse().jeton !== null) }, [])',
  "useEffect(() => { setLienLisible(lireAdresse().jeton !== null); void fetch('/api/auth/lien', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ th: lireAdresse().jeton }) }) }, [])", 'la page poste au chargement')

const SERVEUR = 'lib/siteCommandeServeur.ts'
ajouter('complement', 'CD-4', SERVEUR, "    matiere: dossier.matiere,\n    modifie_le: (deps.maintenant?.() ?? new Date()).toISOString(),\n  }).eq('id', commandeId)",
  "    matiere: dossier.matiere,\n    ...((brut as { etat?: unknown })?.etat !== undefined ? { etat: (brut as { etat: string }).etat } : {}),\n    modifie_le: (deps.maintenant?.() ?? new Date()).toISOString(),\n  }).eq('id', commandeId)", 'etat accepté dans la mise à jour du dossier')
ajouter('complement', 'CD-4', SERVEUR, ".eq('etat', 'payee').is('genere_le', null)\n    .select(COLONNES).maybeSingle()", ".eq('etat', 'payee')\n    .select(COLONNES).maybeSingle()", 'la condition genere_le is null retirée')

ajouter('ecrans', 'EA-5', 'lib/suiteSure.ts', "!brut.startsWith('/site/commander')) return '/outils'\n  if (brut.includes('//') || ", "!brut.startsWith('/')) return '/outils'\n  if (", 'suiteSure accepte //evil.fr')
ajouter('ecrans', 'EA-2', 'app/site/acheter/page.tsx', "style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }} aria-hidden=\"true\"",
  "style={{ position: 'static' }} aria-hidden=\"true\"", 'le piège website rendu visible')

ajouter('exporter', 'EX-3', 'scripts/commande-exporter.mjs', 'sharp(source).rotate().resize(', 'sharp(source).rotate().withMetadata().resize(', 'withMetadata() ajouté : le GPS EXIF ressort')
ajouter('exporter', 'EX-7', 'scripts/commande-exporter.mjs', "if (source.origin !== racine.origin || source.search || source.hash || !source.pathname.startsWith(prefixe)) return null\n    const chemin = decodeURIComponent(source.pathname.slice(prefixe.length))",
  "if (source.search || source.hash) return null\n    const chemin = decodeURIComponent(source.pathname.split('/').pop() ?? '')", "l'hôte et le dossier de la photo ne sont plus vérifiés : une photo d'un autre hôte et d'un autre compte est téléchargée")

ajouter('redacteur', 'RV-3', 'lib/siteRedacteur.ts', 'Décrivez votre projet à ${commune}, un rappel suit pour convenir d’un rendez-vous.',
  'Décrivez votre projet à ${commune}, un rappel suit pour convenir d’un rendez-vous. Plus de 15 ans d’expérience à ${commune}.', 'une invention (« 15 ans d’expérience ») dans le texte des pages de commune')
ajouter('redacteur', 'RV-6', 'lib/siteRedacteur.ts', '\n  rapport.degradations.push(vars.ville)\n  return repli\n}', '\n  rapport.degradations.push(vars.ville)\n  return r2.reponse ?? repli\n}',
  'la dégradation retirée : le texte fautif de la seconde réponse est gardé')
ajouter('redacteur', 'RV-7', 'lib/siteRedacteur.ts', 'Prestations proposées : ${vars.prestationsTxt}\\n</donnees>', 'Prestations proposées : ${vars.prestationsTxt}\\nFaits : ${faits}\\n</donnees>', 'le SIREN est envoyé à appel')

ajouter('livrer', 'CH-5', 'scripts/livrer-site.mjs', 'if (maxReprises + reprises >= 2)', 'if (maxReprises + reprises >= 3)', 'le plafond de régénérations passe à 3')
ajouter('livrer', 'CH-3', 'scripts/livrer-site.mjs', "const livraison = path.join(racine, '.orchestre', 'travail', 'livraison')", "const livraison = path.join(racine, 'public', 'livraison')", "la livraison s'assemble sous public/ au lieu de .orchestre/travail/")
ajouter('livrer', 'CH-11', 'scripts/livrer-site.mjs', 'estDans(racine, path.resolve(sortieArg)) || ', '', '--usine : une --sortie sous la racine du dépôt (donc sous public/) est acceptée')
ajouter('livrer', 'CH-11', 'scripts/livrer-site.mjs', '    } else if (!sansDepot) {', '    }\n    if (!sansDepot) {', 'en --usine, site-deposer.mjs est lancé quand même')

const FLUX = '.github/workflows/generer-site.yml'
ajouter('actions', 'GA-3', FLUX, 'run: node --import ./scripts/ts-loader.mjs scripts/livrer-site.mjs "$COMMANDE" --ci',
  'run: node --import ./scripts/ts-loader.mjs scripts/livrer-site.mjs "$COMMANDE" --ci\n      - uses: actions/upload-artifact@v4\n        with:\n          name: livraison\n          path: .orchestre/travail/livraison', 'une étape upload-artifact')
ajouter('actions', 'GA-2', FLUX, 'timeout-minutes: 20', 'timeout-minutes: 60', 'timeout-minutes: 60')

ajouter('zip', 'DZ-2', 'lib/siteDossier.ts', 'timingSafeEqual(attendu, recu) && new Date(', "attendu.toString('hex') === recu.toString('hex') && new Date(", '=== au lieu de timingSafeEqual')
ajouter('zip', 'DZ-2', 'lib/siteDossier.ts', ' && new Date(data.dossier_expire_le).getTime() > maintenantDe(deps).getTime()', '', "l'expiration du jeton est ignorée")

ajouter('retrait', 'RT-3', 'lib/siteRetrait.ts', '  const jeton = await d.creerJeton(commande.id, 90)\n', '  if (actuelle.domaine) await d.detacherDomaine(actuelle.domaine)\n  const jeton = await d.creerJeton(commande.id, 90)\n', "detacherDomaine avant l'e-mail du dossier")
ajouter('retrait', 'RT-4', 'lib/purgeComptes.ts', '      const echec = aFacture ? await anonymiser(c.id) : await effacer(c.id)\n      if (echec) {',
  "      const echec = aFacture ? await anonymiser(c.id) : await effacer(c.id)\n      try { await marquerSuppression(idsSites) }\n      catch (e) { console.error('[purge-comptes] avis de suppression des sites', c.id, e) }\n      if (echec) {", 'marquerSuppression avant if (echec)')

const ROUTE_SITES = 'app/api/controle/sites/[id]/route.ts'
ajouter('poste', 'PS-2', ROUTE_SITES, "  const perimetre = exigerDomaine(f, 'clients', 'ecrire')\n  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)\n", '', 'la garde exigerDomaine retirée')
ajouter('poste', 'PS-4', ROUTE_SITES, "    const refus = await exigerReconfirmation(req, f.uid, 'artisan')\n    if (refus) return refus\n", '', 'envoyer_dossier sans reconfirmation')

ajouter('bus', 'BL-2', 'lib/siteLivraisonBus.ts', 'return !!error || data !== false', 'return !error && data !== false', 'busEnPause rend faux sur erreur')
ajouter('bus', 'BL-4', 'app/api/agents/tic/route.ts', 'if (new Date().getUTCMinutes() % 15 === 0) {', 'if (true) {', "l'appel du tic sans condition de minute")
ajouter('bus', 'BL-3', 'lib/siteLivraisonBus.ts', 'p_cle: `livrer_site:${commandeId}`', 'p_cle: `livraison:${commandeId}`', 'la clé livraison:<id> au lieu de livrer_site:<id>')
ajouter('bus', 'BL-1', 'lib/siteLivraisonBus.ts', "'ops_tache_clore'", "'ops_tache_rendre'", 'ops_tache_rendre au lieu d\'ops_tache_clore')

// ═══ La copie isolée ════════════════════════════════════════════════════════════════════════════════════════════════════
const DOSSIERS = ['app', 'lib', 'scripts', 'supabase', 'docs', 'public', '.github', 'gabarits-pubs', '.orchestre/brouillons-ecosysteme']
const FICHIERS_RACINE = ['package.json', 'tsconfig.json', 'next.config.mjs', 'next-env.d.ts', 'vercel.json', 'proxy.ts', 'middleware.ts']
const lire = (p) => fs.readFileSync(p, 'utf8')
const ecrire = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s) }
/** Réécrit un fichier sans jamais toucher à l'inode partagé (les copies sont des liens durs de la base). */
const remplacer = (p, s) => { fs.rmSync(p, { force: true }); fs.writeFileSync(p, s) }

function sousTravail(p) {
  const rel = path.relative(TRAVAIL, p)
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw new Error(`suppression hors de .orchestre/travail/026-lt-21 refusée : ${p}`)
}
/** Supprime un dossier de travail sans jamais traverser un lien symbolique. */
function retirer(dir) {
  if (!fs.existsSync(dir)) return
  sousTravail(dir)
  for (const nom of fs.readdirSync(dir)) {
    const p = path.join(dir, nom), st = fs.lstatSync(p)
    if (st.isDirectory() && !st.isSymbolicLink()) retirer(p)
    else fs.unlinkSync(p)
  }
  fs.rmdirSync(dir)
}
/** La base : git archive HEAD du dépôt, plus les fichiers de travail modifiés ou non suivis (ls-files suit l'arbre de travail). */
function construireBase(dir) {
  retirer(dir)
  const r = spawnSync('git', ['-C', RACINE, 'ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...DOSSIERS], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
  if (r.status !== 0) throw new Error(`git ls-files : code ${r.status}`)
  let n = 0
  for (const rel of [...new Set(r.stdout.split('\0').filter(Boolean))]) {
    const s = path.join(RACINE, rel)
    let st
    try { st = fs.lstatSync(s) } catch { continue }
    if (!st.isFile()) continue
    const d = path.join(dir, rel)
    fs.mkdirSync(path.dirname(d), { recursive: true })
    fs.copyFileSync(s, d); n++
  }
  for (const f of FICHIERS_RACINE) if (fs.existsSync(path.join(RACINE, f))) { fs.copyFileSync(path.join(RACINE, f), path.join(dir, f)); n++ }
  return n
}
function cloner(base, dest) {
  retirer(dest)
  const parcourir = (d, e) => {
    fs.mkdirSync(e, { recursive: true })
    for (const nom of fs.readdirSync(d)) {
      const p = path.join(d, nom), q = path.join(e, nom), st = fs.lstatSync(p)
      if (st.isDirectory()) parcourir(p, q)
      else if (FICHIERS_RACINE.includes(nom) && d === base) fs.copyFileSync(p, q)
      else fs.linkSync(p, q)
    }
  }
  parcourir(base, dest)
  for (const j of ['node_modules']) if (fs.existsSync(path.join(RACINE, j))) fs.symlinkSync(fs.realpathSync(path.join(RACINE, j)), path.join(dest, j), 'junction')
}

// ═══ Lancer ═════════════════════════════════════════════════════════════════════════════════════════════════════════════
function lancer(args, cwd, delaiMs) {
  return new Promise((resoudre) => {
    const enfant = spawn(process.execPath, args, { cwd, detached: true, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } })
    let sortie = '', expire = false
    const minuterie = setTimeout(() => { expire = true; try { process.kill(-enfant.pid, 'SIGKILL') } catch { /* déjà mort */ } }, delaiMs)
    for (const flux of [enfant.stdout, enfant.stderr]) flux.on('data', (d) => { if (sortie.length < 8_000_000) sortie += d.toString() })
    const debut = Date.now()
    enfant.on('close', (code) => { clearTimeout(minuterie); resoudre({ code: expire ? 124 : code ?? 128, sortie, duree_s: (Date.now() - debut) / 1000, expire }) })
    enfant.on('error', (e) => { clearTimeout(minuterie); resoudre({ code: 127, sortie: sortie + e.message, duree_s: (Date.now() - debut) / 1000, expire }) })
  })
}
const commandeDe = (cle, critere = null) => `node ${SCRIPT} --relais=${cle} --racine={racine}${critere && JUGES[cle].seulement ? ` --seulement=${critere}` : ''}`
const lancerCommande = (commande, dir, delaiMs) => lancer(commande.replace('node ', '').replace('{racine}', dir).split(' '), dir, delaiMs)

/** La ligne « FAIL <critère> — … » unique du critère et le bilan qui le nomme (même lecture que le méta-juge, MP-3). */
function verdict(sortie, critere) {
  const L = sortie.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').split(/\r?\n/)
  const siennes = L.map((l) => ({ l, m: /^(PASS|FAIL|SAUTE) (\S+)(?: — |$)/.exec(l) })).filter((x) => x.m && x.m[2] === critere)
  const bilan = L.map((l) => /^(\S+) : (PASS|FAIL)(?: — (.*))?$/.exec(l)).filter(Boolean).at(-1)
  if (siennes.length !== 1 || !siennes[0].l.startsWith(`FAIL ${critere} — `)) return { ligne: null, raison: siennes.length ? `${critere} rapporté ${siennes.map((x) => x.m[1]).join('+')}` : `aucune ligne FAIL ${critere}` }
  if (!bilan || bilan[2] !== 'FAIL' || !(bilan[3] || '').split(/,\s*/).includes(critere)) return { ligne: null, raison: `le bilan ne nomme pas ${critere}` }
  return { ligne: siennes[0].l, raison: '' }
}
const rouges = (sortie) => { const b = sortie.split(/\r?\n/).map((l) => /^(\S+) : (PASS|FAIL)(?: — (.*))?$/.exec(l)).filter(Boolean).at(-1); return b ? (b[3] || '') : '(aucun bilan)' }
const court = (t, n = 300) => { const x = String(t ?? '').replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x }

// ═══ Un juge : copie, témoin, mutations ═════════════════════════════════════════════════════════════════════════════════
const SUFFIXE = argOf('seul') !== undefined ? `-seul-${process.pid}` : ''
async function traiterJuge(cle, mutations, base, options) {
  const dir = path.join(TRAVAIL, `copie-${cle}${SUFFIXE}`)
  const j = JUGES[cle]
  const res = { cle, temoin: null, lignes: [], rapport: [], defauts: [], temoinLignes: new Map() }
  try {
    cloner(base, dir)
    const delai = cle === 'ecrans' ? 15 * 60_000 : 8 * 60_000
    if (!options.sansTemoin) {
      const t = await lancerCommande(commandeDe(cle), dir, delai)
      res.temoin = { code: t.code, duree_s: t.duree_s, rouges: t.code === 0 ? '' : rouges(t.sortie), fin: court(t.sortie.trim().split(/\r?\n/).slice(-1)[0] ?? '') }
      const detailRouge = t.sortie.split(/\r?\n/).filter((l) => /^FAIL /.test(l)).map((l) => court(l, 220)).slice(0, 3)
      console.log(`TÉMOIN ${j.fichier} : code ${t.code} (${t.duree_s.toFixed(0)} s)${t.code === 0 ? '' : ` — ${res.temoin.rouges}`}`)
      if (t.code !== 0) res.defauts.push(`TÉMOIN ${j.fichier} : code ${t.code}, en échec : ${res.temoin.rouges} ; ${detailRouge.join(' || ')}`)
      res.temoinPasse = t.code === 0
      res.temoinRouges = t.code === 0 ? [] : rouges(t.sortie).split(/,\s*/)
      res.temoinLignes = new Map(t.sortie.split(/\r?\n/).map((l) => /^FAIL (\S+) — /.exec(l) && [/^FAIL (\S+) — /.exec(l)[1], l]).filter(Boolean))
    }
    for (const m of mutations) {
      const fichier = path.join(dir, m.fichier)
      if (!fs.existsSync(fichier)) { res.defauts.push(`${m.critere} ${m.nom} : fichier introuvable dans la copie (${m.fichier})`); continue }
      const original = lire(fichier)
      const occurrences = original.split(m.avant).length - 1
      if (occurrences !== 1) { res.defauts.push(`${m.critere} ${m.nom} : texte avant introuvable ou multiple (${occurrences} occurrences dans ${m.fichier})`); continue }
      const indice = original.indexOf(m.avant)
      const ligne = original.slice(0, indice).split('\n').length
      remplacer(fichier, original.slice(0, indice) + m.apres + original.slice(indice + m.avant.length))
      let r
      const commande = commandeDe(cle, m.critere)
      try { r = await lancerCommande(commande, dir, delai) }
      finally { remplacer(fichier, original) }
      const v = verdict(r.sortie, m.critere)
      const dejaRouge = res.temoinRouges?.includes(m.critere)
      let ok = r.code !== 0 && !r.expire && !!v.ligne
      let raison = v.raison || (r.expire ? 'délai dépassé' : r.code === 0 ? 'code 0 : la mutation n’est pas attrapée' : '')
      if (ok && dejaRouge) {
        // Le témoin est déjà rouge sur ce critère : seule la ligne qui porte la marque de la faute plantée prouve quelque chose.
        // Les lignes du juge ne montrent que les six premiers défauts puis « (N défauts) » : à défaut de marque, la faute plantée se lit
        // dans le nombre de défauts, qui doit croître par rapport au témoin (même arbre, même juge, une seule différence).
        const nombre = (l) => Number(/\((\d+) défauts\)\s*$/.exec(l ?? '')?.[1] ?? NaN)
        const nT = nombre(res.temoinLignes.get(m.critere)), nM = nombre(v.ligne)
        if (m.marqueur && v.ligne.includes(m.marqueur)) raison = ''
        else if (nM > nT) raison = `déjà rouge sur le témoin (${nT} défauts), ${nM} défauts avec la faute plantée`
        else { ok = false; raison = `le critère est déjà rouge sur le témoin et rien ne distingue la faute plantée (témoin : ${nT} défauts, muté : ${nM})` }
      }
      if (ok && m.marqueur && !v.ligne.includes(m.marqueur)) { ok = false; raison = `marque « ${m.marqueur} » absente de la ligne en échec` }
      const extrait = v.ligne ? court(v.ligne, 300) : court(r.sortie.trim().split(/\r?\n/).filter((l) => /FAIL|❌/.test(l)).slice(0, 2).join(' | ') || r.sortie.slice(-300), 300)
      const ligneMd = `- ${ok ? 'PASS' : 'FAIL'} ${m.critere} — ${m.nom} ; ${m.fichier}:${ligne} ; ${ok && !raison ? extrait : `${raison} ; ${extrait}`}`
      res.lignes.push(ligneMd)
      console.log(`${ok ? 'PASS' : 'FAIL'} ${m.critere} — ${m.nom} (${r.duree_s.toFixed(0)} s)${ok ? '' : `\n    ${raison} ; ${court(v.ligne ?? '', 1200)}`}`)
      if (!ok) res.defauts.push(`${m.critere} ${m.nom} : ${raison}`)
      else res.rapport.push({ juge: j.fichier, commande, fichier: m.fichier, avant: m.avant, apres: m.apres, critere: m.critere, extrait, duree_s: Math.round(r.duree_s * 10) / 10 })
    }
  } finally {
    if (!options.garder && fs.existsSync(dir)) retirer(dir)
  }
  return res
}

async function principal() {
  const seul = argOf('seul')
  const options = { garder: process.argv.includes('--garder'), sansTemoin: false }
  fs.mkdirSync(TRAVAIL, { recursive: true })
  const retenues = seul ? M.filter((m) => [m.juge, m.critere, m.nom].some((x) => x.includes(seul))) : M
  const cles = [...new Set(retenues.map((m) => m.juge))]
  // Les juges longs d'abord ; trois à la fois (quatre cœurs, et chaque juge relance tsc ou un serveur).
  const ordre = ['ecrans', 'achat', 'complement', 'tuile', 'tour', 'tresorerie', 'lien', 'bus', 'poste', 'retrait', 'zip', 'exporter', 'redacteur', 'livrer', 'actions', 'schema']
  cles.sort((a, b) => ordre.indexOf(a) - ordre.indexOf(b))
  const suffixe = seul ? `-seul-${process.pid}` : ''
  const base = path.join(TRAVAIL, `base${suffixe}`)
  const t0 = Date.now()
  console.log(`base : ${construireBase(base)} fichier(s) de l'arbre de travail ; ${cles.length} juge(s), ${retenues.length} mutation(s)`)
  const resultats = []
  const file = [...cles]
  const CONCURRENCE = Number(process.env.LT_CONCURRENCE) || 3
  await Promise.all(Array.from({ length: Math.min(CONCURRENCE, file.length) }, async () => {
    while (file.length) {
      const cle = file.shift()
      try { resultats.push(await traiterJuge(cle, retenues.filter((m) => m.juge === cle), base, options)) }
      catch (e) { resultats.push({ cle, lignes: [], rapport: [], defauts: [`${cle} : ${e.stack || e}`], temoin: null }) }
    }
  }))
  if (!options.garder) retirer(base)
  resultats.sort((a, b) => ordre.indexOf(a.cle) - ordre.indexOf(b.cle))
  const defauts = resultats.flatMap((r) => r.defauts)
  const rapport = resultats.flatMap((r) => r.rapport)
  const temoins = resultats.filter((r) => r.temoin).map((r) => `- ${r.temoin.code === 0 ? 'PASS' : 'FAIL'} témoin ${JUGES[r.cle].fichier} — code ${r.temoin.code} en ${r.temoin.duree_s.toFixed(0)} s${r.temoin.code === 0 ? '' : ` ; critères en échec sur l'arbre réel : ${r.temoin.rouges}`}`)
  const md = [
    `# 026-152 — contre-vérification des 16 juges de la livraison et de la trésorerie`, '',
    `Script : \`node ${SCRIPT}\` ; ${rapport.length}/${retenues.length} mutation(s) prise(s) ; ${temoins.filter((x) => x.startsWith('- PASS')).length}/${temoins.length} témoin(s) vert(s) ; ${Math.round((Date.now() - t0) / 1000)} s.`, '',
    ...(defauts.length ? ['## Échecs', ...defauts.map((d) => `- ${d}`), ''] : []),
    '## Témoins (juge lancé sur la copie intacte)', ...temoins, '',
    '## Mutations (une ligne par faute : fichier:ligne cassé, critère attendu en échec, ligne réelle du juge)', ...resultats.flatMap((r) => r.lignes), '',
  ].join('\n')
  if (!seul) {
    fs.mkdirSync(PREUVES, { recursive: true })
    ecrire(path.join(PREUVES, 'mutations.md'), md)
    ecrire(path.join(PREUVES, 'mutations.json'), `${JSON.stringify({ mutations: rapport }, null, 2)}\n`)
  }
  console.log(`026-152 : ${defauts.length ? 'FAIL' : 'PASS'} — ${rapport.length}/${retenues.length} mutations prises, ${temoins.filter((x) => x.startsWith('- PASS')).length}/${temoins.length} témoins verts${defauts.length ? `, ${defauts.length} défaut(s) :\n${defauts.map((d) => `  · ${d}`).join('\n')}` : ''}`)
  process.exitCode = defauts.length ? 1 : seul ? 3 : 0
}
principal().catch((e) => { console.error(e.stack || e); process.exitCode = 1 })
