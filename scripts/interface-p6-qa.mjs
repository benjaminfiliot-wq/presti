// Le JUGE de l'interface du système d'assistants (prompt 6, lot 036-011) — les cinq écrans des maquettes de 036-010 :
// centre de commande, « Ce que vos assistants ont fait », « Connexions », « Mes départements », CRM « atelier ».
//
// Ce que ce juge lit : le code RÉEL de app/systeme/** et app/api/systeme/** (jamais un texte qu'il aurait écrit), les maquettes
// validées (plans/011-cadrage-01-11/p6-signature/maquettes/*.html) et lib/flags.ts. Il fait tourner le module pur
// app/api/systeme/regles.ts sous le chargeur TypeScript (drapeau, verrous par peut(), colonnes lues, catalogues).
// Limite écrite : il ne rend pas les pages dans un navigateur (pas de build sur l'hôte d'agents, securite.md) ; les captures 390 et
// 1440 px se prennent sur le PC par la session principale. Les maquettes, elles, ont leur propre juge (scripts/maquettes-p6-qa.mjs).
//
// Il s'attaque lui-même : chaque règle a un MUTANT (le code réel, abîmé en mémoire) que le juge DOIT refuser. Un mutant dont le motif
// est introuvable est un échec du juge, pas une réussite.
//
// Usage : node scripts/interface-p6-qa.mjs

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'

const RACINE = process.cwd()
const MAQUETTES = 'plans/011-cadrage-01-11/p6-signature/maquettes'
const echecs = []
let verifs = 0
const ok = (c, m) => { verifs++; if (!c) echecs.push(m) }

// ── Mode « dynamique » : rejoué sous le chargeur TypeScript, rend un JSON ─────────────────────────────────────────────────────
if (process.env.P6_DYN) {
  const nom = process.env.P6_REGLES || 'regles.ts'
  const R = await import(pathToFileURL(path.join(RACINE, 'app/api/systeme', nom)).href)
  const P = await import(pathToFileURL(path.join(RACINE, 'lib/plans.ts')).href)
  const F = await import(pathToFileURL(path.join(RACINE, 'lib/flags.ts')).href)
  const sortie = []
  const v = (c, m) => { if (!c) sortie.push(m) }
  // Drapeau : baissé dans lib/flags.ts, et la garde le refuse (404) avant toute session.
  v(F.FLAGS.systemeAgents === false, 'lib/flags.ts : systemeAgents doit rester baissé')
  const baisse = R.decisionGarde({ drapeau: false, session: { ok: true } })
  v(baisse.ok === false && baisse.statut === 404, 'drapeau baissé : la garde doit répondre 404')
  const leve = R.decisionGarde({ drapeau: true, session: { ok: true } })
  v(leve.ok === true, 'drapeau levé et session valide : la garde doit laisser passer')
  const sansSession = R.decisionGarde({ drapeau: true, session: { ok: false, statut: 401, erreur: 'x' } })
  v(sansSession.ok === false && sansSession.statut === 401, 'sans session : 401')
  v(R.drapeauSysteme() === false, 'drapeauSysteme() doit refléter le drapeau baissé')
  // Les lectures : jamais un secret, jamais « * ».
  const toutes = Object.values(R.COLONNES).join(',')
  v(!/secret/i.test(toutes), 'COLONNES ne doit lister aucun secret de connexion')
  v(!/\*/.test(toutes), 'COLONNES ne doit pas lire « * »')
  v(R.COLONNES.connexions.split(',').every((c) => /^(id|fournisseur|compte_affiche|etat|motif_erreur|verifiee_le|derniere_synchro|expire_le|retiree_le)$/.test(c.trim())), 'connexions : colonnes hors liste blanche')
  // Verrous d'offre : par peut() seulement. Chaque type à capacité est verrouillé quand peut() refuse, libre quand peut() accorde.
  const plans = [null, 'gratuit', 'essentiel', 'studio', 'signature', 'business', 'entreprise']
  let types = 0
  for (const dep of R.DEPARTEMENTS) for (const t of dep.types) {
    types++
    for (const plan of plans) {
      const e = R.verrouDe(plan, t)
      if (t.toujours) v(e === 'toujours', `${t.id} : un geste « toujours à vous » ne s'ouvre pour aucune offre (${plan}) → ${e}`)
      else if (t.bientot) v(e === 'bientot', `${t.id} : « bientôt » pour toutes les offres (${plan}) → ${e}`)
      else if (t.capacite) v(e === (P.peut(plan, t.capacite) ? 'libre' : 'offre'), `${t.id} / ${plan} : verrou ≠ peut() (${e})`)
    }
  }
  v(types === 14, `14 types de travail attendus, ${types}`)
  v(R.GROUPES_CONNEXIONS.flatMap((g) => g.outils).length === 19, 'Connexions : 19 outils (OUTILLAGE.md § 5)')
  v(R.offreDe('studio') === 'studio' && R.offreDe('signature') === 'signature', 'offreDe doit suivre peut() : studio → studio, signature → signature')
  v(R.estSignature('studio') === P.peut('studio', 'assistant.pilote') && R.estSignature('signature') === P.peut('signature', 'assistant.pilote'), 'estSignature ≠ peut()')
  // Une table de 0193 pas encore posée se dit, elle ne casse pas.
  v(R.tableAbsente({ code: '42P01' }) && R.tableAbsente({ message: 'relation "x" does not exist' }) && !R.tableAbsente({ code: '23505' }) && !R.tableAbsente(null), 'tableAbsente')
  v(R.jourParis(new Date('2026-11-03T23:30:00Z')) === '2026-11-04', 'jourParis : 23 h 30 UTC le 3/11 est le 4/11 à Paris')
  process.stdout.write(JSON.stringify({ sortie, outils: R.GROUPES_CONNEXIONS.flatMap((g) => g.outils.map((o) => o.id)), deps: R.DEPARTEMENTS.map((d) => ({ id: d.id, types: d.types.map((t) => t.id), interne: (d.interne ?? []).map((i) => i.id) })) }))
  process.exit(0)
}

// ── Lecture des sources réelles ───────────────────────────────────────────────────────────────────────────────────────────────
function lister(dir, exts) {
  const sortie = []
  const rec = (d) => { for (const e of fs.readdirSync(path.join(RACINE, d), { withFileTypes: true })) { const p = `${d}/${e.name}`; if (e.isDirectory()) rec(p); else if (exts.some((x) => e.name.endsWith(x)) && !e.name.startsWith('__')) sortie.push(p) } }
  rec(dir)
  return sortie
}
const FICHIERS = [...lister('app/systeme', ['.ts', '.tsx', '.css']), ...lister('app/api/systeme', ['.ts'])]
const reel = new Map(FICHIERS.map((f) => [f, fs.readFileSync(path.join(RACINE, f), 'utf8')]))
const enleverCommentaires = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1')

const PAGES = { 'app/systeme/page.tsx': 'CentreCommande', 'app/systeme/fait/page.tsx': 'Fait', 'app/systeme/connexions/page.tsx': 'Connexions', 'app/systeme/departements/page.tsx': 'Departements', 'app/systeme/clients/page.tsx': 'ClientsAtelier' }
const ROUTE = 'app/api/systeme/[vue]/route.ts'
// Les seules routes d'écriture que ces écrans appellent : celles qui existent déjà (aucune logique d'automatisation dans l'app).
const ROUTES_PERMISES = ['/api/assistant/actions', '/api/pilote/file', '/api/connexions/retirer', '/api/connexions/google/demarrer']
const JARGON = /\b(agents?|n8n|workflow|workflows|prompt|prompts|MCP|webhook)\b/i

/** Toutes les règles, sur un jeu de sources (réel ou muté). Rend des couples { id, msg }. */
function juger(src) {
  const v = []
  const f = (id, msg) => v.push({ id, msg })
  const txt = (p) => src.get(p) ?? ''
  const code = (p) => enleverCommentaires(txt(p))
  const tsx = [...src.keys()].filter((p) => /\.tsx?$/.test(p))

  // 1. Drapeau : layout, cinq pages, route.
  if (!/actif\(\s*'systemeAgents'\s*\)[\s\S]{0,40}notFound\(\)/.test(code('app/systeme/layout.tsx'))) f('drapeau-layout', 'layout.tsx : le drapeau baissé doit faire notFound()')
  for (const p of Object.keys(PAGES)) {
    if (!/if\s*\(\s*!\s*actif\(\s*'systemeAgents'\s*\)\s*\)\s*notFound\(\)/.test(code(p))) f('drapeau-page', `${p} : la page doit répondre 404 drapeau baissé`)
    if (!new RegExp(`<${PAGES[p]}\\s*/>`).test(code(p))) f('page-ecran', `${p} : doit rendre <${PAGES[p]} />`)
  }
  const r = code(ROUTE)
  const iDrap = r.indexOf('drapeauSysteme()'), iAuth = r.indexOf('authArtisan(req)')
  if (iDrap < 0 || iAuth < 0 || iDrap > iAuth) f('drapeau-route', 'la route doit tester le drapeau AVANT la session et toute lecture')
  if (!/export async function GET/.test(r) || ['POST', 'PUT', 'PATCH', 'DELETE'].some((m) => !new RegExp(`export async function ${m}\\(\\) \\{ return rep\\(\\{ error: 'Méthode non permise' \\}, 405\\) \\}`).test(r))) f('route-get', 'la route ne sert que GET (les autres méthodes répondent 405)')

  // 2. Verrou d'offre : peut() seulement, jamais une comparaison de l'offre.
  for (const p of tsx) {
    const c = code(p)
    if (/\bplan\s*[!=]==?\s*['"`]/.test(c) || /\.plan\s*[!=]==?/.test(c)) f('plan-en-dur', `${p} : comparaison du plan en dur (utiliser peut())`)
    if (/[!=]==?\s*['"`](studio|signature|essentiel|business|entreprise)['"`]/.test(c)) f('plan-en-dur', `${p} : comparaison d'une offre en dur (utiliser peut())`)
  }
  if (!/peut\(plan,\s*t\.capacite\)/.test(code('app/api/systeme/regles.ts'))) f('peut', 'regles.ts : le verrou d’un type doit passer par peut(plan, capacité)')
  if (!/peut\(plan,\s*'assistant\.pilote'\)/.test(code('app/api/systeme/regles.ts'))) f('peut', 'regles.ts : estSignature doit passer par peut()')

  // 3. Lecture seule : aucune écriture en base ; les écritures du navigateur ne visent que les routes existantes.
  for (const p of tsx) {
    const c = code(p)
    if (/\.(insert|update|upsert|delete)\(/.test(c) || /\.rpc\(/.test(c)) f('ecriture-base', `${p} : une écriture en base (ces écrans ne font que lire)`)
    for (const m of c.matchAll(/fetch\(([^,)]+)(?:,\s*\{([\s\S]*?)\}\s*\))?/g)) {
      const opts = m[2] ?? ''
      if (/method:\s*['"`](POST|PUT|PATCH|DELETE)/i.test(opts)) {
        const cible = m[1].replace(/['"`\s]/g, '')
        if (!ROUTES_PERMISES.includes(cible)) f('ecriture-hors-routes', `${p} : écriture vers ${cible} (hors des routes existantes)`)
      }
    }
  }
  // 4. Un secret de connexion n'est jamais lu.
  for (const p of tsx) { const c = code(p); if (/secret_(app|n8n)/.test(c)) f('secret', `${p} : référence à un secret de connexion`) }
  if (/select\(\s*['"`]\*['"`]/.test(r)) f('secret', 'la route lit « * »')
  // 5. Multi-tenant : chaque lecture porte le compte.
  for (const m of r.matchAll(/supabaseAdmin\.from\(([^)]*)\)([\s\S]*?)(?:;|\n\s*\n|\n  if)/g)) {
    const bloc = m[0]
    if (!/\.eq\(\s*'artisan_id',\s*uid\s*\)/.test(bloc) && !/\.eq\(\s*'id',\s*uid\s*\)/.test(bloc)) f('multi-tenant', `route : lecture de ${m[1]} sans filtre sur le compte`)
  }
  if (!/lire\(table[\s\S]*?\.eq\('artisan_id',\s*uid\)/.test(r)) f('multi-tenant', 'route : lire() doit filtrer sur artisan_id = uid')
  if (/req\.url|searchParams|req\.json\(\)/.test(r) && /artisan_id',\s*(?!uid)/.test(r)) f('multi-tenant', 'route : le compte ne vient jamais de la requête')

  // 6. « Presti » : dans la console seulement (la coque) ; jamais dans ce que lirait un client.
  for (const p of tsx) {
    if (p === 'app/systeme/Coque.tsx') continue
    const sansCommentaires = code(p)
    if (/Presti/.test(sansCommentaires)) f('presti', `${p} : « Presti » sur une surface artisan`)
  }
  if (!/data-surface="client"/.test(txt('app/systeme/Cartes.tsx')) || !/signé \{nom \?\? 'de votre nom'\}/.test(txt('app/systeme/Cartes.tsx'))) f('presti', 'Cartes.tsx : l’aperçu client doit dire « signé de votre nom »')

  // 7. Pas de jargon à l'écran.
  for (const p of tsx.filter((x) => x.startsWith('app/systeme/'))) {
    const c = code(p)
    for (const m of c.matchAll(/(['"`])((?:\\.|(?!\1)[^\\\n])*)\1|>([^<>{}\n]+)</g)) {
      const t = (m[2] ?? m[3] ?? '')
      if (/^\/|^[\w-]+$|=/.test(t) && !/\s/.test(t.trim())) continue
      if (JARGON.test(t)) f('jargon', `${p} : jargon à l'écran → « ${t.slice(0, 50)} »`)
    }
  }

  // 8. Double chemin (B3) : tout feu vert ou bouton d'annulation d'un assistant a son chemin manuel tout près.
  for (const p of tsx.filter((x) => x.startsWith('app/systeme/') && !x.endsWith('Coque.tsx'))) {
    const c = code(p)
    for (const m of c.matchAll(/className="(feu(?: lot)?|btn petit corail)"/g)) {
      if (m[1] === 'btn petit corail' && !/Annuler l’envoi/.test(c.slice(m.index, m.index + 200))) continue
      const dans = c.slice(Math.max(0, m.index - 200), m.index + 900)
      if (/data-tout-valider/.test(c.slice(m.index, m.index + 200))) continue
      if (/Import|import/.test(p) && false) continue
      if (!/data-manuel/.test(dans)) f('double-chemin', `${p} : un bouton d'assistant sans son chemin manuel (offset ${m.index})`)
    }
  }
  // 9. Une question à la fois (B4) et la ligne « fait : » (B4).
  const cartes = txt('app/systeme/Cartes.tsx')
  if (!/Question \{rang \+ 1\} sur \{questions\.length\}/.test(cartes) || !/data-question="ouverte"/.test(cartes)) f('une-question', 'Cartes.tsx : le panneau doit poser UNE question, « Question n sur N »')
  if ((cartes.match(/<PanneauQuestion|data-question=/g) ?? []).length < 1) f('une-question', 'panneau de questions absent')
  for (const p of ['app/systeme/Cartes.tsx', 'app/systeme/Fait.tsx', 'app/systeme/ClientsAtelier.tsx']) if (!/fait :/.test(txt(p))) f('ligne-fait', `${p} : la ligne « fait : … » manque`)
  if (!/PanneauQuestion/.test(txt('app/systeme/ClientsAtelier.tsx')) || !/PanneauQuestion/.test(txt('app/systeme/CentreCommande.tsx'))) f('une-question', 'le panneau « une question à la fois » doit servir le centre de commande ET le CRM')

  // 10. CRM : chiffres avec source et date, import en trois temps, atelier relié, app/crm intact.
  const crm = txt('app/systeme/ClientsAtelier.tsx')
  for (const [mot, motif] of [['lu dans', /lu dans/], ['date', /dateHeureFr\(d\.lu_le\)/], ['lire', /data-etape="lire"/], ['aperçu', /data-etape="apercu"/], ['valider', /data-etape="valider"/], ['atelier relié', /Ouvrir l’atelier/], ['ancien CRM', /\/crm\?vue=/]])
    if (!motif.test(crm)) f('crm', `ClientsAtelier.tsx : ${mot} manquant`)
  if (/\.(insert|update|upsert|delete)\(/.test(crm) || /fetch\(/.test(crm)) f('crm', 'ClientsAtelier.tsx : le CRM atelier ne fait que lire (ni fetch, ni écriture : l’import n’écrit rien)')
  if (!/disabled[^>]*>Valider l’import/.test(crm.replace(/\n/g, ' ')) && !/aria-disabled="true">Valider l’import/.test(crm)) f('crm', 'Valider l’import doit rester désactivé tant que le circuit d’écriture n’est pas ouvert')

  // 11. Connexions : les 19 outils, « Connecter » sans fausse donnée, jamais de date sans lecture réussie.
  const cx = txt('app/systeme/Connexions.tsx')
  if (!/Connecter/.test(cx) || !/Retirer/.test(cx) || !/Dernière synchronisation/.test(cx) || !/lecture réussie/.test(cx)) f('connexions', 'Connexions.tsx : « Connecter », « Retirer », « Dernière synchronisation », « lecture réussie »')
  if (!/etat === 'active' \? 'branche'/.test(cx)) f('connexions', 'Connexions.tsx : « connecté » seulement pour une connexion active')
  if (!/c\?\.etat === 'active'|etat === 'branche' && c/.test(cx)) f('connexions', 'Connexions.tsx : la date de vérification ne s’affiche que pour une connexion branchée')

  // 12. CSS : tout sous .sys, mouvement réduit, jamais de règle globale.
  const css = txt('app/systeme/systeme.css')
  if (/(^|\})\s*(html|body|\*)\s*[,{]/m.test(css)) f('css', 'systeme.css : une règle globale (html, body ou *) hors de .sys')
  if (!/prefers-reduced-motion:reduce/.test(css)) f('css', 'systeme.css : mouvement réduit absent')
  if (/transition:\s*all/.test(css)) f('css', 'systeme.css : transition: all')
  return v
}

// ── Contrôles sur le code réel ────────────────────────────────────────────────────────────────────────────────────────────────
const direct = juger(reel)
for (const x of direct) echecs.push(`${x.id} · ${x.msg}`)
verifs += 1

// Les cinq écrans portent chacun ce que sa maquette montre (phrases relevées dans les maquettes validées).
const ECRANS = {
  'centre-de-commande': ['app/systeme/CentreCommande.tsx', ['Votre matin, en une page', 'À valider', 'Tout valider', 'Aller aux', 'Aucun montant n’est estimé par l’IA', 'Chantiers en cours']],
  'ce-qui-a-ete-fait': ['app/systeme/Fait.tsx', ['Ce que vos assistants ont fait', 'Coût de l’IA aujourd’hui', 'Part dans quelques minutes', 'Annuler l’envoi', 'Tout mettre en pause', 'Repéré', 'Préparé', 'Parti', 'Voir le détail', 'Ouvrir le journal complet']],
  connexions: ['app/systeme/Connexions.tsx', ['Connexions', 'Retirer l’accès', 'Garder', 'Dernière synchronisation', 'À reconnecter', 'Non branché', 'Connecter']],
  departements: ['app/systeme/Departements.tsx', ['Mes départements', 'Envois seuls', 'Plafond du jour', 'Délai pour annuler', 'Pour vous seul']],
  'crm-atelier': ['app/systeme/ClientsAtelier.tsx', ['Clients et chantiers', 'Importer votre ancien fichier clients', 'Rien n’est écrit avant votre validation', 'Vérifier l’aperçu', 'Valider l’import', 'Suivi des devis']],
}
for (const [id, [fichier, phrases]] of Object.entries(ECRANS)) {
  const t = reel.get(fichier) ?? ''
  ok(fs.existsSync(path.join(RACINE, MAQUETTES, `${id}.html`)), `maquette ${id}.html absente`)
  for (const ph of phrases) {
    ok(t.includes(ph), `écran ${id} : « ${ph} » absent du code`)
  }
}
// Le catalogue de Départements et de Connexions = celui des maquettes validées (mêmes identifiants, même ordre).
const maqCx = fs.readFileSync(path.join(RACINE, MAQUETTES, 'connexions.html'), 'utf8')
const idsMaquetteCx = [...maqCx.matchAll(/data-outil="([\w-]+)"/g)].map((m) => m[1])
const maqDep = fs.readFileSync(path.join(RACINE, MAQUETTES, 'departements.html'), 'utf8').split('id="studio"')[0]
const idsMaquetteDep = [...maqDep.matchAll(/data-departement="(\w+)"/g)].map((m) => m[1])
const idsMaquetteTypes = [...maqDep.matchAll(/data-type="([\w-]+)"/g)].map((m) => m[1])
const idsMaquetteInternes = [...maqDep.matchAll(/data-tache-interne="([\w-]+)"/g)].map((m) => m[1])
ok(idsMaquetteCx.length === 19, `maquette Connexions : 19 outils attendus, ${idsMaquetteCx.length}`)

// ── Les règles pures, sous le chargeur TypeScript ─────────────────────────────────────────────────────────────────────────────
function dyn(regles = 'regles.ts') {
  const r = spawnSync(process.execPath, ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', path.join('scripts', 'interface-p6-qa.mjs')], {
    cwd: RACINE, env: { ...process.env, P6_DYN: '1', P6_REGLES: regles }, encoding: 'utf8', timeout: 120_000,
  })
  if (r.status !== 0) return { erreur: (r.stderr || r.stdout || 'échec').slice(-600) }
  try { return JSON.parse(r.stdout) } catch { return { erreur: `sortie illisible : ${r.stdout.slice(-200)}` } }
}
const dReel = dyn()
if (dReel.erreur) echecs.push(`règles pures : ${dReel.erreur}`)
else {
  for (const m of dReel.sortie) echecs.push(`règles pures · ${m}`)
  ok(JSON.stringify(dReel.outils) === JSON.stringify(idsMaquetteCx), `Connexions : les 19 outils doivent être ceux de la maquette dans le même ordre (${dReel.outils.join(',')})`)
  ok(JSON.stringify(dReel.deps.map((d) => d.id)) === JSON.stringify(idsMaquetteDep), 'Départements : les sept départements de la maquette, dans le même ordre')
  ok(JSON.stringify(dReel.deps.flatMap((d) => d.types)) === JSON.stringify(idsMaquetteTypes), 'Départements : les types de travail de la maquette, dans le même ordre')
  ok(JSON.stringify(dReel.deps.flatMap((d) => d.interne)) === JSON.stringify(idsMaquetteInternes), 'Départements : les tâches pour vous seul de la maquette')
}

// ── Les mutants : le code réel abîmé en mémoire, que le juge DOIT refuser ──────────────────────────────────────────────────────
const MUTANTS = [
  ['drapeau baissé qui rend la page (centre)', 'drapeau-page', 'app/systeme/page.tsx', "if (!actif('systemeAgents')) notFound()", ''],
  ['drapeau baissé qui rend la page (CRM atelier)', 'drapeau-page', 'app/systeme/clients/page.tsx', "if (!actif('systemeAgents')) notFound()", ''],
  ['drapeau baissé qui rend la page (Connexions)', 'drapeau-page', 'app/systeme/connexions/page.tsx', "if (!actif('systemeAgents')) notFound()", ''],
  ['drapeau baissé qui rend le layout', 'drapeau-layout', 'app/systeme/layout.tsx', "if (!actif('systemeAgents')) notFound()", ''],
  ['route lue avant le drapeau', 'drapeau-route', ROUTE, 'if (!drapeauSysteme()) return rep({ error: \'introuvable\' }, 404)', ''],
  ["plan === 'studio' en dur", 'plan-en-dur', 'app/systeme/Departements.tsx', "const signature = d?.signature", "const signature = d?.plan === 'studio' ? false : d?.signature"],
  ["offre === 'signature' en dur", 'plan-en-dur', 'app/systeme/Fait.tsx', "const signature = d?.signature", "const signature = d?.offre === 'signature'"],
  ['écriture hors des routes existantes (fetch)', 'ecriture-hors-routes', 'app/systeme/donnees.ts', "const FR = 'fr-FR'", "const FR = 'fr-FR'\nvoid fetch('/api/systeme/ecrire', { method: 'POST' })"],
  ['écriture en base depuis la route', 'ecriture-base', ROUTE, 'const num = (v: unknown)', "const ecrire = () => supabaseAdmin.from('connexions').update({ etat: 'active' })\nconst num = (v: unknown)"],
  ['un secret de connexion lu (colonnes)', 'secret', 'app/api/systeme/regles.ts', "connexions: 'id, fournisseur,", "connexions: 'id, secret_app, fournisseur,"],
  ['un secret de connexion lu (écran)', 'secret', 'app/systeme/Connexions.tsx', "type Connexion = {", "const lu = (c: { secret_app?: string }) => c.secret_app\ntype Connexion = {"],
  ['lecture sans filtre sur le compte', 'multi-tenant', ROUTE, "let q = supabaseAdmin.from(table).select(colonnes).eq('artisan_id', uid)", "let q = supabaseAdmin.from(table).select(colonnes)"],
  ['« Presti » sur une surface artisan', 'presti', 'app/systeme/Cartes.tsx', "Message préparé, signé {nom ?? 'de votre nom'}", 'Message préparé par Presti'],
  ['un bouton d’assistant sans chemin manuel', 'double-chemin', 'app/systeme/Cartes.tsx', ' data-manuel>{manuel.libelle}', '>{manuel.libelle}'],
  ['jargon à l’écran', 'jargon', 'app/systeme/Connexions.tsx', 'Les outils que vous utilisez déjà.', 'Les agents n8n que vous utilisez déjà.'],
  ['une question à la fois cassée', 'une-question', 'app/systeme/Cartes.tsx', 'Question {rang + 1} sur {questions.length}', 'Questions {questions.length}'],
  ['CRM : import qui écrit', 'crm', 'app/systeme/ClientsAtelier.tsx', 'async function choisir(f: File | undefined) {', "async function choisir(f: File | undefined) { void fetch('/api/crm/clients', { method: 'POST' });"],
  ['CSS global hors de .sys', 'css', 'app/systeme/systeme.css', '/* Généré', 'body{margin:0}\n/* Généré'],
]
for (const [nom, attendu, fichier, de, vers] of MUTANTS) {
  const t = reel.get(fichier)
  if (t === undefined || !t.includes(de)) { echecs.push(`mutant « ${nom} » : motif introuvable dans ${fichier} (le juge ne prouve plus rien)`); continue }
  const muté = new Map(reel); muté.set(fichier, t.replace(de, vers))
  const vus = juger(muté).map((x) => x.id)
  ok(vus.includes(attendu), `mutant « ${nom} » : le juge aurait dû lever « ${attendu} » (vu : ${[...new Set(vus)].join(', ') || 'rien'})`)
}

// Mutants des règles pures, rejoués sous le chargeur sur une copie jetable.
const COPIE = 'app/api/systeme/__mutant_regles.ts'
const sourceRegles = reel.get('app/api/systeme/regles.ts')
const MUTANTS_DYN = [
  ['la garde ignore le drapeau', 'drapeau baissé : la garde doit répondre 404', "if (!p.drapeau) return { ok: false, statut: 404, erreur: 'introuvable' }", ''],
  ['le verrou ignore peut()', 'verrou ≠ peut()', "if (t.capacite && !peut(plan, t.capacite)) return 'offre'", ''],
  ['un geste « toujours à vous » s’ouvre', 'toujours à vous', "if (t.toujours) return 'toujours'", ''],
  ['Signature décidée par le nom de l’offre', 'estSignature ≠ peut()', "peut(plan, 'assistant.pilote')\nexport const offreDe", "plan === 'business'\nexport const offreDe"],
]
try {
  for (const [nom, attendu, de, vers] of MUTANTS_DYN) {
    if (!sourceRegles.includes(de)) { echecs.push(`mutant dynamique « ${nom} » : motif introuvable`); continue }
    fs.writeFileSync(path.join(RACINE, COPIE), sourceRegles.replace(de, vers))
    const r = dyn('__mutant_regles.ts')
    const vu = r.erreur ? [r.erreur] : r.sortie
    ok(vu.some((m) => m.includes(attendu)), `mutant dynamique « ${nom} » : le juge aurait dû dire « ${attendu} » (vu : ${vu.join(' | ').slice(0, 160) || 'rien'})`)
  }
} finally { try { fs.unlinkSync(path.join(RACINE, COPIE)) } catch { /* déjà absent */ } }

verifs += MUTANTS.length + MUTANTS_DYN.length
if (echecs.length) {
  console.error(`\n✗ interface-p6-qa : ${echecs.length} échec(s) sur ${verifs} contrôles\n` + echecs.map((e) => `  - ${e}`).join('\n'))
  process.exit(1)
}
console.log(`✓ interface-p6-qa : ${verifs} contrôles, ${MUTANTS.length} mutants statiques et ${MUTANTS_DYN.length} mutants dynamiques refusés, ${Object.keys(ECRANS).length} écrans, ${dReel.outils?.length ?? 0} outils, ${dReel.deps?.length ?? 0} départements`)
