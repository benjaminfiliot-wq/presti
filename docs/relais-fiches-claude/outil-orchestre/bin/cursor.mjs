// bin/cursor.mjs — Cursor comme exécutant BORNÉ de l'orchestre (026-222). Sous les mêmes contrats de tâche que Codex
// (bin/executant.mjs) et Antigravity (bin/antigravity.mjs) : id, dossier, périmètre, interdit ; jamais plus que le
// périmètre écrit ; jamais un verdict d'argent, de sécurité, de droits ou de cerveau.
//
// La voie est INACTIVE par défaut. Elle ne s'active que si l'accès est constaté (sourcé, daté), qu'un coût NUL est
// constaté (sourcé, daté) et que le témoin du juge 026-220 est PASS. Un coût inconnu n'est jamais 0 € : il reste
// « non mesuré » et la voie reste fermée. L'état du 29/09/2026 est dans docs/cursor.md.
//
// Contrat exporté (juge : node scripts/juges-026-completude-qa.mjs --contrat=cursor) :
//   evaluerVoie · accepterTache · controlerAction · reprendre · terminerReprise · ligneJournal
// Le pilotage réel s'y ajoute : verifierAction (arrêt par une erreur nommée), lancer (refus AVANT tout effet, reprise à
// verrou exclusif, journal), desactiver / etatVoie (coupe-circuit), et une CLI (`node bin/cursor.mjs etat|desactiver`).
//
// Aucun effet à l'import ; aucune clé lue ici : l'adaptateur ne lit ni .env*, ni presti-secrets, ni ~/.ssh, ni ~/.claude.
// Toute clé éventuelle serait lue par le câblage d'activation (hors de ce fichier), passée par deps, jamais affichée.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const SENSIBLES = ['argent', 'securite', 'droits', 'cerveau']
const SECRETS = [/(^|[\/\s"'])\.env(\.[\w-]+)?($|[\s"'])/i, /(^|[\/\s"'])presti-secrets([\/\s"']|$)/i, /(^|[\/\s"'])\.ssh([\/\s"']|$)/i, /(^|[\/\s"'])\.claude([\/\s"']|$)/i, /\.codex\/auth/i, /coffre/i]
const DESTRUCTIONS = [
  /\brm\s+-[a-z]*r[a-z]*f|\brm\s+-[a-z]*f[a-z]*r/i,
  /\bgit\s+(reset\s+--hard|clean\b|restore\b|stash\b|checkout\s+--|revert\b)/i,
  /\btaskkill\b[^\n]*\/IM\b/i,
  /\bpkill\s+-f\b/i,
  /\bremove-item\b[^\n]*-recurse/i,
  /\b(del|rmdir|rd)\s+\/s\b/i,
  /\bdrop\s+(table|schema|database)\b/i,
]
const refus = (critere, raison) => ({ ok: false, critere, raison })
// Exécutants existants, dans l'ordre de la bascule quand Cursor est inactif, coupé, à sec ou douteux.
export const REPLI = ['antigravity', 'codex', 'claude-code']

// Une erreur NOMMÉE : `nom` = « ErreurCursor », `critere` = le critère qui a causé l'arrêt (jamais perdu en chemin).
export class ErreurCursor extends Error {
  constructor(critere, raison) { super(`${critere} : ${raison}`); this.name = 'ErreurCursor'; this.critere = critere; this.raison = raison }
}

export function evaluerVoie({ acces, tarif, temoin } = {}) {
  const cout = typeof tarif?.cout_par_tache === 'number' ? tarif.cout_par_tache : 'non mesuré'
  const inactive = (raison) => ({ active: false, etat: 'inactive', raison, cout })
  if (!acces?.cli || !acces?.constate_le || !acces?.source) return inactive('accès non constaté')
  if (cout === 'non mesuré') return inactive('coût non mesuré')
  if (!tarif.source || !tarif.constate_le) return inactive('coût sans source datée')
  if (cout !== 0) return inactive(`coût ${cout} : dépense refusée`)
  if (temoin?.juge !== '026-220' || temoin?.verdict !== 'PASS') return inactive('témoin du juge 026-220 absent ou rouge')
  return { active: true, etat: 'active', raison: 'accès, coût nul et témoin prouvés', cout: 0 }
}

export function accepterTache(tache) {
  if (!tache?.id || !Array.isArray(tache.perimetre) || !tache.perimetre.length) return refus('perimetre', 'périmètre absent')
  const s = (tache.sensible || []).filter((x) => SENSIBLES.includes(x))
  if (s.length) return refus('verdict_sensible', `verdict ${s.join(', ')} réservé`)
  return { ok: true }
}

const versRegex = (g) => new RegExp('^' + String(g).replace(/\\/g, '/').replace(/[.+^${}()|[\]]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]').replace(/\u0000/g, '.*') + '$')
const normaliser = (p) => path.posix.normalize(String(p).replace(/\\/g, '/'))
const dans = (chemin, globs) => (globs || []).some((g) => versRegex(g).test(chemin))

export function controlerAction(tache, action) {
  const cible = String(action?.cible ?? '')
  if (action?.type === 'lire' || action?.type === 'ecrire') {
    const c = normaliser(cible)
    if (SECRETS.some((re) => re.test(c))) return refus('secret', 'lecture ou écriture d\'un secret')
    if (action.type === 'lire') return { ok: true }
    if (c.startsWith('../') || c.startsWith('/') || /^[a-z]:/i.test(c)) return refus('hors_perimetre', 'chemin hors du dépôt')
    if (dans(c, tache.interdit)) return refus('interdit', 'chemin interdit par la tâche')
    if (!dans(c, tache.perimetre)) return refus('hors_perimetre', 'chemin hors du périmètre')
    return { ok: true }
  }
  if (action?.type === 'commande') {
    if (DESTRUCTIONS.some((re) => re.test(cible))) return refus('destruction', 'commande de destruction')
    if (SECRETS.some((re) => re.test(cible.replace(/\\/g, '/')))) return refus('secret', 'commande qui vise un secret')
    return { ok: true }
  }
  if (action?.type === 'reseau') {
    let hote = ''
    try { hote = new URL(cible).hostname } catch { hote = cible }
    if (!(tache.reseau || []).includes(hote)) return refus('reseau', 'hôte réseau non prévu') // hôte EXACT : ni sous-chaîne ni sous-domaine
    return { ok: true }
  }
  return refus('action_inconnue', 'type d\'action inconnu')
}

// Un agent qui demande un secret, un réseau non prévu, une commande de destruction ou un chemin hors périmètre s'arrête
// ici, avec une ErreurCursor qui porte le critère (secret, reseau, destruction, hors_perimetre, interdit…).
export function verifierAction(tache, action) {
  const r = controlerAction(tache, action)
  if (!r.ok) throw new ErreurCursor(r.critere, r.raison)
  return r
}

export function reprendre({ id, dossier, agent }) {
  const verrou = path.join(dossier, `${id}.reprise.lock`)
  try { fs.writeFileSync(verrou, JSON.stringify({ id, agent }), { flag: 'wx' }) } catch { return refus('reprise_concurrente', 'une reprise tient déjà le verrou') }
  const f = path.join(dossier, `${id}.partiel.json`)
  let partiel = null
  try { partiel = JSON.parse(fs.readFileSync(f, 'utf8')) } catch { partiel = null }
  return { ok: true, id, partiel }
}

export function terminerReprise({ id, dossier }) {
  try { fs.unlinkSync(path.join(dossier, `${id}.reprise.lock`)) } catch { /* déjà levé */ }
  return { ok: true }
}

export function ligneJournal({ id, statut, fichiers = [], consommation }) {
  return { id, statut, fichiers: [...fichiers], consommation: typeof consommation === 'number' ? consommation : 'non mesuré' }
}

// ── coupe-circuit ─────────────────────────────────────────────────────────────────────────────────────────────────
// <projet>/.orchestre/cursor-voie.json = { actif: false, raison, le } : posé par `desactiver`, lu par `lancer`. Absent
// ou illisible = pas de coupe posée (la voie reste soumise à evaluerVoie, donc inactive tant que rien n'est prouvé).
export function etatVoie(racine) {
  try { return JSON.parse(fs.readFileSync(path.join(racine, '.orchestre', 'cursor-voie.json'), 'utf8')) } catch { return null }
}
export function desactiver(racine, raison, maintenant = () => new Date().toISOString()) {
  const dossier = path.join(racine, '.orchestre')
  fs.mkdirSync(dossier, { recursive: true })
  const etat = { actif: false, raison: String(raison || 'désactivation manuelle'), le: maintenant(), repli: REPLI }
  fs.writeFileSync(path.join(dossier, 'cursor-voie.json'), JSON.stringify(etat, null, 2) + '\n')
  return etat
}

// ── lancement ─────────────────────────────────────────────────────────────────────────────────────────────────────
// lancer({ tache: { id, perimetre, interdit?, sensible?, reseau? }, dossier, agent, voie: { acces, tarif, temoin },
//          racine?, deps: { executer(argv, opts) → { code, sortie?, fichiers?, consommation? }, journal?(ligne) } })
// Rend { lance: false, statut, critere, repli } sans AVOIR RIEN FAIT quand un refus tombe : voie inactive, coupe-circuit,
// tâche refusée, reprise concurrente. Sinon un seul appel à deps.executer ; les fichiers modifiés qu'il rapporte sont
// recontrôlés un à un contre le périmètre (hors périmètre → statut « refusee », production non retenue). La consommation
// que deps.executer ne mesure pas reste « non mesuré ». La CLI de Cursor (argv) n'est pas installée sur ce PC :
// deps.executer est une doublure dans tous les essais, et le lancement réel n'est pas exercé (docs/cursor.md).
export async function lancer({ tache, dossier, agent = 'cursor', voie, racine, deps = {} }) {
  const journal = (l) => { try { deps.journal?.(l) } catch { /* un journal en panne n'arrête pas un refus */ } }
  const arret = (statut, critere, raison) => {
    journal({ ...ligneJournal({ id: tache?.id ?? '?', statut }), etape: 'refus', critere })
    return { lance: false, statut, critere, raison, repli: REPLI }
  }
  const v = evaluerVoie(voie || {})
  if (!v.active) return arret('inactive', 'voie_inactive', v.raison)
  const coupe = racine ? etatVoie(racine) : null
  if (coupe && coupe.actif === false) return arret('desactivee', 'voie_coupee', coupe.raison || 'coupe-circuit posé')
  const a = accepterTache(tache)
  if (!a.ok) return arret('refusee', a.critere, a.raison)
  if (typeof deps.executer !== 'function') return arret('inactive', 'executeur_absent', 'aucun exécuteur fourni')
  const r = reprendre({ id: tache.id, dossier, agent })
  if (!r.ok) return arret('refusee', r.critere, r.raison)
  try {
    const argv = ['cursor-agent', '--print', '--output-format', 'json', '--workspace', dossier]
    const res = (await deps.executer(argv, { id: tache.id, dossier, perimetre: tache.perimetre, interdit: tache.interdit || [], partiel: r.partiel })) || {}
    const fichiers = (res.fichiers || []).map(String)
    const hors = fichiers.map((f) => ({ f, c: controlerAction(tache, { type: 'ecrire', cible: f }) })).filter((x) => !x.c.ok)
    const statut = hors.length ? 'refusee' : res.code === 0 ? 'terminee' : 'interrompue'
    const ligne = { ...ligneJournal({ id: tache.id, statut, fichiers, consommation: res.consommation }), etape: 'fin', ...(hors.length ? { critere: hors[0].c.critere } : {}) }
    journal(ligne)
    return { lance: true, statut, critere: hors[0]?.c.critere ?? null, fichiers, consommation: ligne.consommation, repli: statut === 'terminee' ? [] : REPLI }
  } catch (e) {
    const critere = e instanceof ErreurCursor ? e.critere : 'erreur_executeur'
    journal({ ...ligneJournal({ id: tache.id, statut: 'interrompue' }), etape: 'erreur', critere })
    return { lance: true, statut: 'interrompue', critere, fichiers: [], consommation: 'non mesuré', repli: REPLI }
  } finally { terminerReprise({ id: tache.id, dossier }) }
}

// ── CLI ───────────────────────────────────────────────────────────────────────────────────────────────────────────
// node bin/cursor.mjs etat [--racine=<projet>]        → l'état de la voie (sans preuve d'accès ni de coût : inactive)
// node bin/cursor.mjs desactiver [--racine=<projet>] <raison…>
async function cli(args) {
  const opt = (n) => (args.find((a) => a.startsWith(`--${n}=`)) || '').slice(n.length + 3)
  const racine = path.resolve(opt('racine') || process.cwd())
  if (args[0] === 'etat') {
    const v = evaluerVoie({ acces: null, tarif: null, temoin: null })
    const coupe = etatVoie(racine)
    console.log(`Cursor : ${v.etat} — ${v.raison} (coût ${v.cout})${coupe && coupe.actif === false ? ` · coupe-circuit posé le ${coupe.le} : ${coupe.raison}` : ''}`)
    console.log(`Repli : ${REPLI.join(' → ')}`)
    return 0
  }
  if (args[0] === 'desactiver') {
    const e = desactiver(racine, args.slice(1).filter((a) => !a.startsWith('--')).join(' '))
    console.log(`Cursor désactivé (${e.raison}) — les tâches vont à ${REPLI.join(' → ')}.`)
    return 0
  }
  console.error('usage : node bin/cursor.mjs etat|desactiver [--racine=<projet>] [raison…]')
  return 2
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) process.exitCode = await cli(process.argv.slice(2))
