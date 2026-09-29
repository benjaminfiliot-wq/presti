// Témoin de 026-220 : implémentation de RÉFÉRENCE de l'adaptateur Cursor (jamais déployée). Elle prouve que le juge
// `scripts/juges-026-completude-qa.mjs --partie=cursor` sait être vert ; chaque sabotage de --preuve-echecs le rend
// rouge. Le contrat : `node scripts/juges-026-completude-qa.mjs --contrat=cursor`.
//
// Règles tenues : la voie reste inactive tant que l'accès, un coût nul SOURCÉ et daté et le témoin du juge ne sont pas
// prouvés (un coût inconnu n'est jamais 0 €) ; aucun verdict d'argent, de sécurité, de droits ou de cerveau ; rien hors
// du périmètre écrit ; ni secret, ni réseau non prévu, ni commande de destruction ; une seule reprise à la fois.
import fs from 'node:fs'
import path from 'node:path'

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

export function evaluerVoie({ acces, tarif, temoin }) {
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
