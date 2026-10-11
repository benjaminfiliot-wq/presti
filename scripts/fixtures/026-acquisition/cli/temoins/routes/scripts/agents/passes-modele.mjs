// TÉMOIN du juge routes-acquisition-qa (026-037) : scripts/agents/passes-modele.mjs --agent=standardiste|facteur [--soir]
// [--base=<url>] (026-094, point 2 ter), réduit à ce que RB-17 observe. Le vrai script passe par creerLecteur de
// lib/agents/llm.ts ; ce témoin lance le lanceur lui-même (sous Windows, par bash : le faux lanceur est un script sh).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'

const opt = Object.fromEntries(process.argv.slice(2).map((a) => { const m = /^--([\w-]+)(?:=(.*))?$/.exec(a); return m ? [m[1], m[2] ?? true] : [a, true] }))
const agent = opt.agent
const soir = opt.soir === true
const base = String(opt.base || '{{BASE_PRESTI}}').replace(/\/$/, '')
const journal = (o) => console.log(JSON.stringify({ agent, ...o }))
if (!['standardiste', 'facteur'].includes(agent)) { journal({ etat: 'agent_inconnu' }); process.exit(2) }
if (base.startsWith('http://') && !base.startsWith('http://127.0.0.1')) { journal({ etat: 'base_refusee' }); process.exit(2) }
const jeton = process.env[agent === 'standardiste' ? 'PRESTI_JETON_STANDARDISTE' : 'PRESTI_JETON_FACTEUR']
// le vrai script lit le moteur par creerLecteur (lib/agents/llm.ts) ; absent ici, le témoin lance le lanceur lui-même
const llm = await import('../../lib/agents/llm.ts').catch(() => null)
const lanceur = process.env.CODEX_LANCEUR
if (!lanceur || !fs.existsSync(lanceur)) { journal({ etat: 'modele_absent' }); process.exit(0) }
// Un seul modèle pour les trois passes, `--soir` compris : l'étalonné (D-0410-3), jamais gpt-6-sol.
const modele = 'gpt-6-luna'
function lire(systeme, donnees) {
  const sortie = path.join(os.tmpdir(), `passe-${crypto.randomBytes(6).toString('hex')}.txt`)
  const argv = ['exec', '--model', modele, '--sandbox', 'read-only', '--skip-git-repo-check', '--output-last-message', sortie, '-']
  const [cmd, a] = process.platform === 'win32' ? ['bash', [lanceur, ...argv]] : [lanceur, argv]
  const r = spawnSync(cmd, a, { input: `${systeme}\n${JSON.stringify(donnees)}`, encoding: 'utf8', timeout: 120_000 })
  if (r.status !== 0) return null
  try { return fs.readFileSync(sortie, 'utf8') } catch { return null } finally { fs.rmSync(sortie, { force: true }) }
}
async function appel(chemin, init = {}) {
  try {
    const r = await fetch(`${base}${chemin}`, { ...init, headers: { authorization: `Bearer ${jeton}`, 'content-type': 'application/json' }, signal: AbortSignal.timeout(20_000) })
    return r.ok ? await r.json() : null
  } catch { return undefined }
}
if (agent === 'standardiste') {
  const t = await appel('/api/usine/standard/travail')
  if (t === undefined) { journal({ etat: 'bus_injoignable' }); process.exit(0) }
  let rendus = 0
  for (const r of (t?.reponses ?? []).slice(0, 20)) {
    const brut = lire(r.systeme, r.donnees)
    if (brut === null) continue
    await appel('/api/usine/standard/classement', { method: 'POST', body: JSON.stringify({ reponse_id: r.id, brut }) })
    rendus++
  }
  journal({ etat: 'fini', recues: t?.reponses?.length ?? 0, rendus })
} else {
  const t = await appel(`/api/usine/facteur/travail${soir ? '?passe=soir' : ''}`)
  if (t === undefined) { journal({ etat: 'bus_injoignable' }); process.exit(0) }
  let rendus = 0
  for (const e of (t?.envois ?? []).slice(0, 20)) {
    const brut = lire('juge du ton', { texte: e.texte })
    if (brut === null) continue
    // comme le vrai script (executerJuge) : l'avis n'est rendu que si le lanceur a rendu exactement { verdict, raisons }
    let j2 = null
    try { j2 = JSON.parse(brut) } catch { j2 = null }
    if (!j2 || (j2.verdict !== 'ok' && j2.verdict !== 'refus') || !Array.isArray(j2.raisons)) continue
    await appel('/api/usine/facteur/avis', { method: 'POST', body: JSON.stringify({ envoi_id: e.id, empreinte: e.empreinte, j2, j2_version: modele, ...(soir ? { passe: 'soir' } : {}) }) })
    rendus++
  }
  journal({ etat: 'fini', recus: t?.envois?.length ?? 0, rendus })
}
