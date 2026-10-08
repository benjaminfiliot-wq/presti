// scripts/haiku-agent.mjs — 08/10/2026 : l'exécutant « haiku » de l'écosystème (Claude Haiku 5.5 via l'API Messages, ~0,10 $ / 0,50 $ le million).
// Un agent à outils : bash, lire_fichier, ecrire_fichier. Il fait ce que dit le fichier de prompt de la tâche (le même contrat que Codex et
// Antigravity : le vérificateur tourne ensuite hors de lui, dans executant.mjs). Branché comme moteur `haiku` de executant.mjs.
// Garde-fous : écriture limitée au dépôt (jamais .env*, presti-secrets, .git), commandes dangereuses refusées, 1 $ au plus par appel,
// 4 $ par jour (compteur .orchestre/haiku-depense.json). La clé n'est jamais écrite ni affichée.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const MODELE = 'claude-haiku-5-5'
const PRIX_ENTREE = 0.10 / 1e6, PRIX_SORTIE = 0.50 / 1e6
const PLAFOND_APPEL = 1.0, PLAFOND_JOUR = 4.0, TOURS_MAX = 80
const DANGER = /\b(rm\s+-rf|rmdir\s+\/s|del\s+\/[sq]|git\s+push|git\s+reset\s+--hard|git\s+clean|format\s+[a-z]:|shutdown|Remove-Item\s+-Recurse|curl\b|Invoke-WebRequest|Invoke-RestMethod|wget\b)/i
const SECRET = /(\.env|presti-secrets|[\\/]\.git[\\/]|anthropic|id_rsa|\.ssh)/i

function cle() {
  if (process.env.ANTHROPIC_API_KEY_ECO) return process.env.ANTHROPIC_API_KEY_ECO.trim()
  for (const f of [process.env.PRESTI_SECRETS && path.join(process.env.PRESTI_SECRETS, 'anthropic-ecosysteme.txt'), 'C:/Users/benja/Documents/presti-secrets/anthropic-ecosysteme.txt', '/srv/presti-secrets/anthropic-ecosysteme.txt'].filter(Boolean)) {
    try { return fs.readFileSync(f, 'utf8').replace(/\s/g, '') } catch { /* suivant */ }
  }
  return ''
}
const jour = () => new Date().toISOString().slice(0, 10)
function depenseDuJour(racine) {
  try { const d = JSON.parse(fs.readFileSync(path.join(racine, '.orchestre', 'haiku-depense.json'), 'utf8')); return d.jour === jour() ? d.usd : 0 } catch { return 0 }
}
function noterDepense(racine, usd) {
  const total = depenseDuJour(racine) + usd
  fs.writeFileSync(path.join(racine, '.orchestre', 'haiku-depense.json'), JSON.stringify({ jour: jour(), usd: Number(total.toFixed(4)) }))
}
const OUTILS = [
  { name: 'bash', description: 'Exécute une commande shell dans le dépôt (Windows cmd). Rend la sortie (tronquée). Pas de curl, pas de git push.', input_schema: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] } },
  { name: 'lire_fichier', description: 'Lit un fichier texte du dépôt (chemin relatif). Option : debut et fin (numéros de ligne, 1-indexés).', input_schema: { type: 'object', properties: { chemin: { type: 'string' }, debut: { type: 'integer' }, fin: { type: 'integer' } }, required: ['chemin'] } },
  { name: 'ecrire_fichier', description: 'Écrit (remplace) un fichier texte du dépôt (chemin relatif), crée les dossiers.', input_schema: { type: 'object', properties: { chemin: { type: 'string' }, contenu: { type: 'string' } }, required: ['chemin', 'contenu'] } },
]
function sousRacine(racine, chemin) {
  const p = path.resolve(racine, chemin)
  if (!p.startsWith(path.resolve(racine))) throw new Error('chemin hors du dépôt')
  if (SECRET.test(p.slice(racine.length))) throw new Error('chemin interdit (secret)')
  return p
}
function outil(racine, nom, a) {
  if (nom === 'bash') {
    if (DANGER.test(a.command || '')) return 'REFUSÉ : commande dangereuse ou réseau'
    if (SECRET.test(a.command || '')) return 'REFUSÉ : la commande touche un secret'
    const r = spawnSync(a.command, { cwd: racine, shell: true, encoding: 'utf8', timeout: 10 * 60_000, windowsHide: true, maxBuffer: 20 * 1024 * 1024 })
    const s = `${r.stdout || ''}${r.stderr || ''}`
    return `[code ${r.status}]\n${s.length > 12000 ? s.slice(0, 5000) + '\n…[coupé]…\n' + s.slice(-6000) : s}`
  }
  if (nom === 'lire_fichier') {
    const t = fs.readFileSync(sousRacine(racine, a.chemin), 'utf8').split(/\r?\n/)
    const s = t.slice((a.debut || 1) - 1, a.fin || t.length).join('\n')
    return s.length > 30000 ? s.slice(0, 30000) + '\n…[coupé : demande debut/fin]' : s
  }
  if (nom === 'ecrire_fichier') {
    const p = sousRacine(racine, a.chemin); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, a.contenu)
    return `écrit ${a.chemin} (${a.contenu.length} signes)`
  }
  return 'outil inconnu'
}

/** Même contrat que executer() de executant.mjs : { sortie, code, duree, auth }. */
export async function executerHaiku({ racine, instruction, journal, delaiMs }) {
  const debut = Date.now(), flux = fs.createWriteStream(journal, { flags: 'a' })
  const log = (s) => { flux.write(s + '\n'); process.stdout.write(s.length > 1500 ? s.slice(0, 1500) + '…\n' : s + '\n') }
  const K = cle()
  if (!K) { log('haiku : clé absente'); flux.end(); return { sortie: 'authentication_error : clé absente', code: 1, duree: 0, auth: true } }
  const messages = [{ role: 'user', content: instruction }]
  const systeme = `Tu es un exécutant de code de l'écosystème Presti. Tu travailles dans un dépôt Windows (cmd). Tu as trois outils : bash, lire_fichier, ecrire_fichier. Fais exactement ce que dit le fichier de prompt de la tâche, dans le périmètre autorisé, jusqu'au bout, puis termine par une phrase de bilan. Ne devine rien : lis les fichiers. N'écris jamais de secret. Réponds en français.`
  let coutAppel = 0, sortie = ''
  for (let tour = 1; tour <= TOURS_MAX; tour++) {
    if (Date.now() - debut > delaiMs) { log('[haiku : délai dépassé]'); break }
    if (coutAppel >= PLAFOND_APPEL || depenseDuJour(racine) >= PLAFOND_JOUR) { log('[haiku : plafond de dépense atteint]'); sortie += '\nQUOTA haiku : plafond de dépense atteint'; break }
    let j
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'x-api-key': K, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' }, signal: AbortSignal.timeout(180_000),
        body: JSON.stringify({ model: MODELE, max_tokens: 12000, thinking: { type: 'disabled' }, system: systeme, tools: OUTILS, messages }),
      })
      j = await r.json()
      if (j.error) { log(`[haiku erreur API : ${j.error.type} — ${String(j.error.message).slice(0, 200)}]`); if (/authentication/.test(j.error.type)) return { sortie: 'authentication_error', code: 1, duree: Math.round((Date.now() - debut) / 1000), auth: true }; if (/rate_limit|overloaded/.test(j.error.type)) { await new Promise((x) => setTimeout(x, 20000)); tour--; continue } break }
    } catch (e) { log(`[haiku réseau : ${e.message}]`); await new Promise((x) => setTimeout(x, 15000)); continue }
    const usd = (j.usage?.input_tokens || 0) * PRIX_ENTREE + (j.usage?.output_tokens || 0) * PRIX_SORTIE
    coutAppel += usd; noterDepense(racine, usd)
    messages.push({ role: 'assistant', content: j.content })
    const textes = j.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n')
    if (textes) { log(`\n[haiku tour ${tour}] ${textes}`); sortie += `\n${textes}` }
    const appels = j.content.filter((b) => b.type === 'tool_use')
    if (!appels.length) break
    const resultats = []
    for (const a of appels) {
      let res
      try { res = outil(racine, a.name, a.input || {}) } catch (e) { res = `ERREUR : ${e.message}` }
      log(`  → ${a.name} ${JSON.stringify(a.input).slice(0, 160)} : ${String(res).slice(0, 200).replace(/\n/g, ' ')}`)
      resultats.push({ type: 'tool_result', tool_use_id: a.id, content: String(res) })
    }
    messages.push({ role: 'user', content: resultats })
  }
  log(`\n[haiku : fini en ${Math.round((Date.now() - debut) / 1000)} s, ${coutAppel.toFixed(3)} $]`)
  flux.end()
  return { sortie, code: 0, duree: Math.round((Date.now() - debut) / 1000), auth: false }
}
