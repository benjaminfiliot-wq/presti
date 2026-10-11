// scripts/modeles/adaptateurs.mjs — les adaptateurs VÉRIFIÉS du registre : pour chaque entrée, UN vrai appel minimal (« Réponds uniquement le mot OK »)
// qui rend { etat: 'OK'|'KO', raison, detail, ms, depense_usd? }. Une IA dont l'appel n'a pas répondu n'est jamais « OK » : c'est le seul chemin
// vers l'état OK (la sonde et le juge s'appuient dessus).
//
// Toutes les entrées-sorties passent par `deps` (fetch, lecture de fichier, lancement de commande, requête http locale) : le juge les remplace par
// des doublures (appel vide, clé absente, fuite de clé…). Aucune clé n'est écrite, journalisée ni rendue : `assainir` en retire toute valeur
// de clé connue et toute forme de clé, de chaque texte qui sort d'ici.
//
// Module sans effet de bord à l'import ; fonctionne tel quel sur le PC (Windows) et sur l'usine (Linux, node 24), sans autre dépendance que le
// registre voisin : la sonde l'envoie en bloc sur l'usine.
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { MESSAGE_SONDE, estBranche, raisonNonBranche } from './registre.mjs'

export const TARIF_HAIKU_ENTREE = 0.10 / 1_000_000
export const TARIF_HAIKU_SORTIE = 0.50 / 1_000_000
const FORMES_CLE = [/sk-ant-[A-Za-z0-9_-]{8,}/g, /sk-fish-[A-Za-z0-9_-]{6,}/g, /\bfc-[A-Za-z0-9]{20,}/g, /\bsk-[A-Za-z0-9_-]{24,}/g, /(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{12,}/gi, /x-api-key["']?\s*[:=]\s*["']?[A-Za-z0-9._-]{12,}/gi, /\beyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]{4,}/g]

/** Retire d'un texte toute valeur de clé connue (`secrets`) et toute forme de clé. Rend toujours une chaîne. Pure. */
export function assainir(texte, secrets = [], max = 300) {
  let t = String(texte ?? '')
  for (const s of secrets) if (typeof s === 'string' && s.length >= 8) t = t.split(s).join('***')
  for (const re of FORMES_CLE) t = t.replace(re, (m, p1) => (p1 ? `${p1} ***` : '***'))
  t = t.replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max)}…` : t
}

/** Classe un échec (texte de sortie ou code HTTP) en une raison courte. Pure. */
export function classerEchec({ statut = null, texte = '' } = {}) {
  const t = String(texte ?? '')
  if (statut === 429 || /\b429\b|too many requests|rate.?limit|usage limit|quota|RESOURCE_EXHAUSTED|exhausted|épuis|epuis|monthly|limit reached/i.test(t)) return 'quota'
  if (statut === 401 || statut === 403 || /\b40[123]\b|unauthori[sz]ed|forbidden|pas authentifi|not logged in|invalid.{0,10}key|authentication/i.test(t)) return 'non_autorise'
  if (statut === 402 || /payment required|credit/i.test(t)) return 'credit'
  if (/absent ou invalide|not set|non configur|PRESTI_[A-Z_]+ (?:absent|manquant)/i.test(t)) return 'configuration_absente'
  if (statut === 404 || /not found|does not exist|model.*(absent|inexistant)|no such model/i.test(t)) return 'modele_absent'
  if (statut === 400) return 'requete_refusee'
  if (/ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ECONNRESET|EHOSTUNREACH|fetch failed|injoignable|socket hang up|connect/i.test(t)) return 'injoignable'
  if (/timeout|timed out|aborted|délai/i.test(t)) return 'delai'
  return statut && statut >= 500 ? 'indisponible' : 'erreur'
}

// ── les clés : lues à l'instant de l'appel, jamais affichées ─────────────────────────────────────────────────────────────────────────
const EXTRAIRE = { firecrawl: /\bfc-[A-Za-z0-9]{32}\b/, fish_audio: /sk-fish-[^\s"'<>]+/ }

/**
 * { cle, raison } — la clé de l'entrée dans ce lieu, ou null avec la raison. `deps.lire(chemin)` rend le texte ou lève ; `deps.lireSudo(chemin)`
 * relit par `sudo -n cat` quand le fichier n'appartient pas au compte courant (clés de l'usine). `racine` : racine du dépôt (chemins relatifs du PC).
 */
export function lireCle(entree, lieu, { racine = process.cwd(), env = process.env, lire = (p) => fs.readFileSync(p, 'utf8'), lireSudo = null } = {}) {
  const c = entree.cle ?? { type: 'aucune' }
  if (c.type === 'aucune') return { cle: null, requise: false }
  if (entree.id === 'claude_haiku') {
    if (env.PRESTI_HAIKU_CLE?.trim()) return { cle: env.PRESTI_HAIKU_CLE.trim(), requise: true }
    const f = env.PRESTI_HAIKU_CLE_FICHIER || (lieu === 'pc' ? path.resolve(racine, c.pc) : null)
    if (!f) return { cle: null, requise: true, raison: 'cle_absente' }
    try { const t = lire(f).trim(); return t ? { cle: t, requise: true } : { cle: null, requise: true, raison: 'cle_absente' } } catch { return { cle: null, requise: true, raison: 'cle_absente' } }
  }
  const brut = c[lieu]
  if (!brut || /^\(/.test(brut)) return { cle: null, requise: true, raison: 'cle_absente' }
  const chemin = path.isAbsolute(brut) || brut.startsWith('/') ? brut : path.resolve(racine, brut)
  let texte = null
  try { texte = lire(chemin) } catch { texte = null }
  if (texte === null && lireSudo) { try { texte = lireSudo(chemin) } catch { texte = null } }
  if (texte === null || !String(texte).trim()) return { cle: null, requise: true, raison: 'cle_absente' }
  const re = EXTRAIRE[entree.id]
  if (re) { const m = re.exec(String(texte)); return m ? { cle: m[0], requise: true } : { cle: null, requise: true, raison: 'cle_absente' } }
  return { cle: String(texte).split(/\r?\n/)[0].trim(), requise: true }
}

// ── http local en flux (Ollama) : seule la coupure du délai arrête l'appel, et l'arrête côté serveur aussi ─────────────────────────────
export function requeteHttp(url, { methode = 'POST', corps = null, delaiMs = 60_000 } = {}) {
  return new Promise((resoudre) => {
    const u = new URL(url)
    const t0 = Date.now()
    let fini = false
    const fin = (v) => { if (!fini) { fini = true; clearTimeout(minuteur); resoudre({ ...v, ms: Date.now() - t0 }) } }
    const donnees = corps == null ? null : Buffer.from(JSON.stringify(corps))
    const req = http.request({ hostname: u.hostname, port: u.port || 80, path: u.pathname + u.search, method: methode, headers: donnees ? { 'content-type': 'application/json', 'content-length': donnees.length } : {} }, (rep) => {
      const morceaux = []
      rep.on('data', (d) => morceaux.push(d))
      rep.on('end', () => fin({ statut: rep.statusCode, texte: Buffer.concat(morceaux).toString('utf8') }))
      rep.on('error', (e) => fin({ statut: 0, texte: String(e?.code ?? e?.message ?? 'erreur') }))
    })
    const minuteur = setTimeout(() => { req.destroy(); fin({ statut: 0, texte: 'timeout' }) }, delaiMs)
    req.on('error', (e) => fin({ statut: 0, texte: String(e?.code ?? e?.message ?? 'erreur') }))
    if (donnees) req.write(donnees)
    req.end()
  })
}

const resultat = (etat, ms, extra = {}) => ({ etat, ms, ...extra })
const ko = (ms, raison, detail = '', extra = {}) => resultat('KO', ms, { raison, detail, ...extra })
const ok = (ms, detail = '', extra = {}) => resultat('OK', ms, { detail, ...extra })

// ── anthropic : l'API Messages, sans réflexion (appel simple) ──────────────────────────────────────────────────────────────────────────
async function sonderAnthropic(entree, lieu, deps, secrets) {
  const { cle, raison } = lireCle(entree, lieu, deps)
  if (!cle) return ko(0, raison ?? 'cle_absente', lieu === 'usine' ? 'aucune clé sur l\'usine (voir docs/agents/modeles-ecosysteme.md)' : 'clé absente')
  secrets.push(cle)
  const t0 = Date.now()
  let r
  try {
    r = await deps.fetchFn(entree.base, {
      method: 'POST', signal: AbortSignal.timeout(deps.delaiMs ?? 60_000),
      headers: { 'content-type': 'application/json', 'x-api-key': cle, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: entree.modele, max_tokens: 32, thinking: { type: 'disabled' }, messages: [{ role: 'user', content: MESSAGE_SONDE }] }),
    })
  } catch (e) { return ko(Date.now() - t0, classerEchec({ texte: String(e?.name === 'TimeoutError' ? 'timeout' : (e?.cause?.code ?? e?.message ?? '')) }), assainir(e?.message, secrets, 120)) }
  const ms = Date.now() - t0
  if (!r.ok) { let brut = ''; try { brut = await r.text() } catch { brut = '' } return ko(ms, classerEchec({ statut: r.status, texte: brut }), `HTTP ${r.status} ${assainir(brut, secrets, 140)}`) }
  let j
  try { j = await r.json() } catch { return ko(ms, 'reponse_illisible', 'JSON illisible') }
  const texte = Array.isArray(j?.content) ? j.content.filter((b) => b?.type === 'text').map((b) => b.text).join('') : ''
  const e = Number(j?.usage?.input_tokens), s = Number(j?.usage?.output_tokens)
  const depense = Number.isFinite(e) && Number.isFinite(s) ? e * TARIF_HAIKU_ENTREE + s * TARIF_HAIKU_SORTIE : null
  if (!texte.trim()) return ko(ms, 'sortie_vide', 'réponse sans texte', { depense_usd: depense })
  return ok(ms, `« ${assainir(texte, secrets, 24)} » · ${e} + ${s} jetons`, { depense_usd: depense })
}

// ── openai-compatible : freellmapi (127.0.0.1:3001 sur l'usine) ────────────────────────────────────────────────────────────────────────
async function sonderOpenai(entree, lieu, deps, secrets) {
  if (lieu !== 'usine') return ko(0, 'injoignable', 'le routeur freellmapi n\'écoute que sur 127.0.0.1 de l\'usine')
  const { cle, raison } = lireCle(entree, lieu, deps)
  if (!cle) return ko(0, raison ?? 'cle_absente', 'clé freellmapi illisible')
  secrets.push(cle)
  const t0 = Date.now()
  let r
  try {
    r = await deps.fetchFn(`${entree.base}/chat/completions`, {
      method: 'POST', signal: AbortSignal.timeout(deps.delaiMs ?? 90_000),
      headers: { 'content-type': 'application/json', authorization: `Bearer ${cle}` },
      body: JSON.stringify({ model: entree.modele, max_tokens: 200, temperature: 0, messages: [{ role: 'user', content: MESSAGE_SONDE }] }),
    })
  } catch (e) { return ko(Date.now() - t0, classerEchec({ texte: String(e?.name === 'TimeoutError' ? 'timeout' : (e?.cause?.code ?? e?.message ?? '')) }), assainir(e?.message, secrets, 120)) }
  const ms = Date.now() - t0
  let brut = ''
  try { brut = await r.text() } catch { brut = '' }
  if (!r.ok) return ko(ms, classerEchec({ statut: r.status, texte: brut }), `HTTP ${r.status} ${assainir(brut, secrets, 160)}`)
  let j
  try { j = JSON.parse(brut) } catch { return ko(ms, 'reponse_illisible', 'JSON illisible') }
  if (j?.error) return ko(ms, classerEchec({ texte: JSON.stringify(j.error) }), assainir(JSON.stringify(j.error), secrets, 160))
  const texte = j?.choices?.[0]?.message?.content
  if (typeof texte !== 'string' || !texte.trim()) return ko(ms, 'sortie_vide', `réponse sans texte (modèle servi : ${assainir(j?.model ?? '?', secrets, 60)})`)
  return ok(ms, `« ${assainir(texte, secrets, 24)} » · servi par ${assainir(j?.model ?? entree.modele, secrets, 60)}`)
}

// ── ollama : /api/chat en flux (une coupure arrête le calcul côté serveur) ───────────────────────────────────────────────────────────────
async function sonderOllama(entree, lieu, deps, secrets) {
  const t0 = Date.now()
  const r = await deps.requeteHttp(`${entree.base}/api/chat`, {
    corps: { model: entree.modele, stream: true, think: false, messages: [{ role: 'user', content: MESSAGE_SONDE }], options: { num_predict: 24, temperature: 0, num_ctx: 2048 } },
    delaiMs: entree.sonde?.delaiMs ?? deps.delaiMs ?? 300_000,
  })
  const ms = Date.now() - t0
  if (!(r.statut >= 200 && r.statut < 300)) return ko(ms, classerEchec({ statut: r.statut || null, texte: r.texte }), r.statut ? `HTTP ${r.statut} ${assainir(r.texte, secrets, 160)}` : assainir(r.texte, secrets, 80))
  let texte = ''
  try { const j = JSON.parse(r.texte); texte = j?.message?.content ?? '' } catch {
    // flux : une ligne JSON par morceau
    for (const l of String(r.texte).split('\n')) { try { texte += JSON.parse(l)?.message?.content ?? '' } catch { /* ligne partielle */ } }
  }
  if (!String(texte).trim()) return ko(ms, 'sortie_vide', 'réponse sans texte')
  return ok(ms, `« ${assainir(texte, secrets, 24)} »`)
}

// ── cli : une commande du dépôt (exécutants) — code 0 = a répondu ───────────────────────────────────────────────────────────────────────
function sonderCommande(argv, deps, secrets, delaiMs = 300_000) {
  const t0 = Date.now()
  const r = deps.lancer(argv[0], argv.slice(1), { timeout: delaiMs, cwd: deps.racine })
  const ms = Date.now() - t0
  const sortie = `${r.stdout ?? ''}\n${r.stderr ?? ''}`
  if (r.error) return ko(ms, classerEchec({ texte: String(r.error?.code ?? r.error?.message ?? '') }), assainir(r.error?.message, secrets, 120))
  if (r.status === 0) return ok(ms, assainir(sortie.split('\n').filter((l) => /^[✓?✗]|répond|OK/.test(l.trim())).slice(-1)[0] ?? 'code 0', secrets, 160))
  const lignes = sortie.split('\n').filter((l) => l.trim())
  const erreur = lignes.find((l) => /(?:Error|Erreur|✗|absent|pas authentifi|quota)/.test(l)) ?? lignes.slice(-2).join(' / ')
  return ko(ms, classerEchec({ texte: sortie }), `code ${r.status} ${assainir(erreur, secrets, 200)}`)
}

/** Codex sur l'usine : un « codex exec » minimal sous le compte chef-modele (celui de la file du chef), dans un dossier jetable. */
function sonderCodexUsine(deps, secrets) {
  const t0 = Date.now()
  const dossier = fs.mkdtempSync(path.join(deps.tmp ?? '/tmp', 'sonde-codex-'))
  try {
    fs.chmodSync(dossier, 0o777)
    const r = deps.lancer('sudo', ['-n', '-u', 'chef-modele', 'timeout', '150', '/opt/codex/bin/codex', 'exec', '--skip-git-repo-check', '--ephemeral', '-s', 'read-only', '-C', dossier, MESSAGE_SONDE], { timeout: 170_000 })
    const ms = Date.now() - t0
    const sortie = `${r.stdout ?? ''}\n${r.stderr ?? ''}`
    if (r.status === 0 && /\bOK\b/.test(String(r.stdout ?? ''))) return ok(ms, 'codex exec a répondu OK (compte chef-modele)')
    return ko(ms, classerEchec({ texte: sortie }), `code ${r.status} ${assainir(sortie.split('\n').filter((l) => l.trim()).slice(-2).join(' / '), secrets, 200)}`)
  } finally { try { fs.rmSync(dossier, { recursive: true, force: true }) } catch { /* jetable */ } }
}

// ── agent en conteneur (Hermes, OpenClaw) sur l'usine : sockets présentes, puis UNE tâche réelle ─────────────────────────────────────────────
function sonderAgentUsine(entree, deps, secrets) {
  const cfg = entree.sonde.usine
  const t0 = Date.now()
  const manquantes = (cfg.sockets ?? []).filter((s) => deps.lancer('sudo', ['-n', 'test', '-S', `${entree.socket}/${s}`], { timeout: 15_000 }).status !== 0)
  if (manquantes.length) return ko(Date.now() - t0, 'injoignable', `socket(s) absente(s) : ${manquantes.join(', ')}`)
  const dossier = fs.mkdtempSync(path.join(deps.tmp ?? '/tmp', `sonde-${entree.id}-`))
  const consigne = path.join(dossier, 'consigne.md')
  const sortie = path.join(dossier, 'sortie')
  try {
    fs.chmodSync(dossier, 0o755)
    fs.writeFileSync(consigne, 'Écris le seul mot OK dans le fichier resultats/RESUME.md. Aucune autre action, aucune recherche.\n')
    const delai = 240
    const r = deps.lancer('sudo', ['-n', 'env', `${cfg.env}_DONNEES=publique`, `${cfg.env}_DELAI=${delai}`, cfg.script, consigne, sortie], { timeout: (delai + 90) * 1000 })
    const ms = Date.now() - t0
    const lu = (f) => { const x = deps.lancer('sudo', ['-n', 'cat', path.join(sortie, f)], { timeout: 15_000 }); return x.status === 0 ? String(x.stdout ?? '') : '' }
    const statut = lu('statut.txt').trim()
    let modele = ''
    try { const m = JSON.parse(lu('meta.json')); modele = String(m.modele_servi ?? m.served_model ?? m.modele ?? m.model ?? '') } catch { /* meta facultatif */ }
    const resume = lu('resultats/RESUME.md').trim()
    if (statut === 'OK' && resume) return ok(ms, `tâche réelle OK${modele ? ` · modèle ${assainir(modele, secrets, 60)}` : ''}`)
    const brut = `${r.stdout ?? ''}\n${r.stderr ?? ''}\n${lu('journal-conteneur.txt').slice(-600)}`
    return ko(ms, statut === 'REFUS-DONNEES' ? 'refus_donnees' : classerEchec({ texte: brut }), `statut ${statut || '(aucun)'} · code ${r.status}${resume ? '' : ' · RESUME.md vide'} ${assainir(brut.split('\n').filter((l) => l.trim()).slice(-2).join(' / '), secrets, 160)}`)
  } finally { try { deps.lancer('sudo', ['-n', 'rm', '-rf', dossier], { timeout: 15_000 }) } catch { /* jetable */ } }
}

// ── api de recherche / voix : un appel d'identité qui ne consomme rien (solde) ────────────────────────────────────────────────────────────
async function sonderApi(entree, lieu, deps, secrets) {
  const { cle, raison } = lireCle(entree, lieu, deps)
  if (!cle) return ko(0, raison ?? 'cle_absente', 'clé illisible')
  secrets.push(cle)
  const f = entree.sonde.fournisseur
  const url = f === 'firecrawl' ? `${entree.base}/team/credit-usage` : `${entree.base}/wallet/self/package`
  const t0 = Date.now()
  let r
  try { r = await deps.fetchFn(url, { method: 'GET', signal: AbortSignal.timeout(deps.delaiMs ?? 30_000), headers: { authorization: `Bearer ${cle}` } }) }
  catch (e) { return ko(Date.now() - t0, classerEchec({ texte: String(e?.name === 'TimeoutError' ? 'timeout' : (e?.cause?.code ?? e?.message ?? '')) }), assainir(e?.message, secrets, 120)) }
  const ms = Date.now() - t0
  let brut = ''
  try { brut = await r.text() } catch { brut = '' }
  if (!r.ok) return ko(ms, classerEchec({ statut: r.status, texte: brut }), `HTTP ${r.status} ${assainir(brut, secrets, 140)}`)
  let j = null
  try { j = JSON.parse(brut) } catch { return ko(ms, 'reponse_illisible', 'JSON illisible') }
  if (f === 'firecrawl') {
    const reste = j?.data?.remaining_credits ?? j?.data?.remainingCredits
    return Number.isFinite(Number(reste)) ? ok(ms, `clé valide · ${Number(reste)} crédits restants (rien consommé)`) : ko(ms, 'reponse_inattendue', 'solde absent de la réponse')
  }
  const solde = j?.balance ?? j?.data?.balance ?? j?.credit ?? j?.data?.credit
  return j && typeof j === 'object' ? ok(ms, `clé valide${solde !== undefined ? ` · solde ${assainir(String(solde), secrets, 20)}` : ''} (rien consommé)`) : ko(ms, 'reponse_inattendue', 'réponse vide')
}

/** Le jeu de dépendances réel (PC ou usine). Les essais en passent d'autres. */
export function depsReelles(extra = {}) {
  return {
    fetchFn: globalThis.fetch,
    requeteHttp,
    lancer: (cmd, args, o = {}) => spawnSync(cmd, args, { encoding: 'utf8', windowsHide: true, timeout: o.timeout ?? 60_000, cwd: o.cwd, maxBuffer: 20 * 1024 * 1024 }),
    lire: (p) => fs.readFileSync(p, 'utf8'),
    lireSudo: (p) => { const r = spawnSync('sudo', ['-n', 'cat', p], { encoding: 'utf8', timeout: 15_000 }); if (r.status !== 0) throw new Error('lecture refusée'); return r.stdout },
    racine: process.cwd(), env: process.env, tmp: '/tmp',
    ...extra,
  }
}

/**
 * LE point d'entrée : un vrai appel minimal de l'entrée dans ce lieu → { etat, ms, raison?, detail, depense_usd? }.
 * `etat` n'est 'OK' que si l'appel a répondu. Une entrée sans sonde réelle (type 'declare') rend 'NON_BRANCHE' avec sa raison écrite.
 * Le champ `branche` ne change pas l'appel : une entrée non branchée est quand même appelée (si elle a une sonde) pour dire si elle répondrait.
 */
export async function appeler(entree, lieu, depsPartielles = {}) {
  const deps = { ...depsReelles(), ...depsPartielles }
  const secrets = []
  const type = entree.sonde?.type
  let r
  try {
    if (type === 'declare' || !type) r = { etat: 'KO', ms: 0, raison: 'sans_sonde', detail: 'aucune sonde réelle : jamais « OK » par défaut', sans_appel: true }
    else if (type === 'anthropic') r = await sonderAnthropic(entree, lieu, deps, secrets)
    else if (type === 'openai') r = await sonderOpenai(entree, lieu, deps, secrets)
    else if (type === 'ollama') r = await sonderOllama(entree, lieu, deps, secrets)
    else if (type === 'api') r = await sonderApi(entree, lieu, deps, secrets)
    else if (type === 'cli') {
      if (entree.sonde[lieu] === 'codex-usine') r = sonderCodexUsine(deps, secrets)
      else if (Array.isArray(entree.sonde[lieu])) r = sonderCommande(entree.sonde[lieu], deps, secrets, entree.sonde.delaiMs)
      else r = ko(0, 'sans_sonde', `pas de sonde pour le lieu ${lieu}`, { sans_appel: true })
    } else if (type === 'agent') {
      if (lieu === 'pc' && Array.isArray(entree.sonde.pc)) r = sonderCommande(entree.sonde.pc, deps, secrets, 420_000)
      else if (lieu === 'usine' && entree.sonde.usine) r = sonderAgentUsine(entree, deps, secrets)
      else r = ko(0, 'sans_sonde', `pas de sonde pour le lieu ${lieu}`, { sans_appel: true })
    } else r = ko(0, 'sans_sonde', `type de sonde inconnu : ${type}`, { sans_appel: true })
  } catch (e) { r = ko(0, 'erreur', assainir(e?.message ?? e, secrets, 160)) }
  // dernier verrou : rien de ce qui sort ne contient une clé lue
  for (const k of ['detail', 'raison']) if (typeof r[k] === 'string') r[k] = assainir(r[k], secrets, 320)
  // un « OK » n'est possible que si l'appel a bien eu lieu
  if (r.etat === 'OK' && r.sans_appel) r.etat = 'KO'
  return r
}

/** L'état affichable d'une entrée : OK/KO si déclarée branchée, NON_BRANCHE sinon (avec l'appel réel en plus s'il y en a eu un). Pure. */
export function etatFinal(entree, lieu, appel) {
  if (estBranche(entree, lieu)) return { etat: appel.etat === 'OK' ? 'OK' : 'KO', declare_branche: true, appel }
  return { etat: 'NON_BRANCHE', declare_branche: false, raison: raisonNonBranche(entree, lieu), appel: appel.sans_appel ? null : appel }
}
