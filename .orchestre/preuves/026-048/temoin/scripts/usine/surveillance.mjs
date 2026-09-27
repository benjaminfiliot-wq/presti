#!/usr/bin/env node
// TÉMOIN du juge usine-socle-qa (026-048) : la surveillance, minimale, écrite par Claude Code pour prouver que le juge sait
// passer au vert. Ce n'est PAS le livrable de 026-053. Contrat : l'en-tête de scripts/usine-socle-qa.mjs.
import fs from 'node:fs'
import path from 'node:path'

const MINUTE = 60_000
const JOUR = 24 * 60 * MINUTE
const QUINZE = 15 * MINUTE
const opt = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, ...v] = a.replace(/^--/, '').split('='); return [k, v.length ? v.join('=') : true] }))
const sortir = (code, m) => { process.stderr.write(`surveillance : ${m}\n`); process.exit(code) }
const locale = (u) => { try { const x = new URL(u); return ['127.0.0.1', 'localhost', '[::1]'].includes(x.hostname) } catch { return false } }

const base = typeof opt.base === 'string' ? opt.base : 'https://prestiapp.fr'
let urlBase
try { urlBase = new URL(base) } catch { sortir(2, '--base illisible') }
if (!['https:', 'http:'].includes(urlBase.protocol) || (urlBase.protocol === 'http:' && !locale(base))) sortir(2, '--base : http:// seulement vers 127.0.0.1 ou localhost')
const freellmapi = typeof opt.freellmapi === 'string' ? opt.freellmapi : 'http://127.0.0.1:3001'
if (!locale(freellmapi) || !/^https?:$/.test(new URL(freellmapi).protocol)) sortir(2, '--freellmapi : boucle locale seulement')
const journal = typeof opt.journal === 'string' ? opt.journal : path.join(process.env.HOME || '/home/agents', 'travail', 'surveillance')
const proc = typeof opt.proc === 'string' ? opt.proc : null
const echange = typeof opt['echange-ia'] === 'string' ? opt['echange-ia'] : '/srv/presti-ia/echange'
const compteursIa = typeof opt['compteurs-ia'] === 'string' ? opt['compteurs-ia'] : '/home/agents/travail/ia'
const jeton = process.env.PRESTI_JETON_USINE || ''
const debit = Number(process.env.USINE_DEBIT_BPS) || 2_000_000_000
if (!opt.service && !opt['une-mesure'] && !opt.bilan) sortir(2, 'usage : --service | --une-mesure | --bilan')
if ((opt.service || opt['une-mesure']) && !proc && process.platform !== 'linux') sortir(2, 'la surveillance ne mesure que l\'usine')
if (opt.service && !jeton) sortir(2, 'PRESTI_JETON_USINE absent')

const jourParis = (t) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t))
const heureParis = (t) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(t))
const dixieme = (x) => Math.round(x * 10) / 10
const fr = (x) => x.toFixed(1).replace('.', ',')
function semaineIso(t) {
  const [a, m, j] = jourParis(t).split('-').map(Number)
  const d = new Date(Date.UTC(a, m - 1, j))
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7))
  const premier = new Date(Date.UTC(d.getUTCFullYear(), 0, 4))
  const s = 1 + Math.round(((d - premier) / JOUR - 3 + ((premier.getUTCDay() + 6) % 7)) / 7)
  return `${d.getUTCFullYear()}-S${String(s).padStart(2, '0')}`
}
const lireSi = (f) => { try { return fs.readFileSync(f, 'utf8') } catch { return null } }
const fichierEtat = () => path.join(journal, 'etat.json')
const lireEtat = () => { try { return JSON.parse(fs.readFileSync(fichierEtat(), 'utf8')) } catch { return {} } }
const ecrireEtat = (e) => fs.writeFileSync(fichierEtat(), JSON.stringify(e))
const incident = (t, cle, v) => fs.appendFileSync(path.join(journal, `incidents-${jourParis(t)}.jsonl`), `${JSON.stringify({ le: new Date(t).toISOString(), [cle]: v })}\n`)
const masquer = (s) => String(s).replace(/@/g, '').replace(/\d{9,}/g, '…').slice(0, 200)

function lecture() {
  const d = proc || '/proc'
  const cpu = fs.readFileSync(path.join(d, 'stat'), 'utf8').split('\n').find((l) => /^cpu\s/.test(l)).trim().split(/\s+/).slice(1, 9).map(Number)
  const mem = Object.fromEntries(fs.readFileSync(path.join(d, 'meminfo'), 'utf8').split('\n').filter((l) => l.includes(':')).map((l) => [l.split(':')[0].trim(), Number.parseInt(l.split(':')[1], 10)]))
  const octets = fs.readFileSync(path.join(d, 'net', 'dev'), 'utf8').split('\n').slice(2).filter((l) => l.includes(':')).reduce((s, l) => {
    const nom = l.slice(0, l.indexOf(':')).trim()
    const v = l.slice(l.indexOf(':') + 1).trim().split(/\s+/).map(Number)
    return nom === 'lo' ? s : s + v[0] + v[8]
  }, 0)
  const sf = proc ? JSON.parse(fs.readFileSync(path.join(proc, 'statfs.json'), 'utf8')) : fs.statfsSync('/')
  return { total: cpu.reduce((a, b) => a + b, 0), repos: cpu[3] + cpu[4], octets, memTotal: mem.MemTotal, memDispo: mem.MemAvailable, disque: 1 - Number(sf.bavail) / Number(sf.blocks) }
}
function mesures(fin) {
  if (!fs.existsSync(journal)) return []
  return fs.readdirSync(journal).filter((f) => /^mesures-\d{4}-\d{2}-\d{2}\.jsonl$/.test(f)).flatMap((f) => fs.readFileSync(path.join(journal, f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)))
    .filter((x) => Date.parse(x.le) > fin - 7 * JOUR && Date.parse(x.le) <= fin)
}
function bilan(fin) {
  const m = mesures(fin)
  const p95 = (v) => { if (!v.length) return 0; const s = [...v].sort((a, b) => a - b); return s[Math.ceil(0.95 * s.length) - 1] }
  const b = { cpu: p95(m.map((x) => x.cpu)), mem: p95(m.map((x) => x.mem)), res: p95(m.map((x) => x.res)), n: m.length }
  const max = Math.max(b.cpu, b.mem, b.res)
  b.verdict = b.n < 1440 ? 'incomplet' : max < 22 ? 'danger' : max < 30 ? 'approche' : 'ok'
  return b
}
async function poster(t, route, corps) {
  try {
    const r = await fetch(`${base}${route}`, { method: 'POST', headers: { authorization: `Bearer ${jeton}`, 'content-type': 'application/json' }, body: corps === undefined ? undefined : JSON.stringify(corps), signal: AbortSignal.timeout(10_000) })
    if (!r.ok) { incident(t, 'bus_injoignable', r.status); return null }
    return await r.json().catch(() => ({}))
  } catch (e) { incident(t, 'bus_injoignable', e?.cause?.code || e?.name || 'erreur'); return null }
}
async function releverIa(t, etat) {
  etat.ia ||= { fournisseurs: {} }
  const ev = []
  let u = null
  try {
    const r = await fetch(`${freellmapi}/api/usage`, { signal: AbortSignal.timeout(5000) })
    if (!r.ok) throw Object.assign(new Error('http'), { code: r.status })
    u = await r.json()
  } catch (e) { incident(t, 'ia_injoignable', e?.code || e?.cause?.code || 'erreur') }
  if (u) {
    const jour = jourParis(t)
    const compteurs = (lireSi(path.join(compteursIa, `compteurs-${jour}.jsonl`)) || '').split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return {} } })
    const etats = { active: 'actif', exhausted: 'épuisé', error: 'erreur' }
    for (const p of u.providers || []) {
      const utilise = typeof p.used === 'number' ? p.used : compteurs.filter((c) => c.fournisseur_reel === p.provider && c.modele === p.model).length
      const tranche = Math.min(10, Math.floor((utilise * 10) / (p.limit || 1)))
      const e = etats[p.status] || 'erreur'
      const cle = `${e}|${tranche}`
      if (etat.ia.fournisseurs[p.provider] !== cle) {
        ev.push({ type: 'ia_quota', objet: masquer(`ia:${p.provider}`), resume: masquer(`${p.provider} · ${p.model} · ${utilise}/${p.limit} ${p.unit} · ${e} · remis à ${heureParis(p.resets_at)}`), apres: () => { etat.ia.fournisseurs[p.provider] = cle } })
      }
    }
    if (etat.ia.servi && u.served_provider && u.served_provider !== etat.ia.servi) {
      const ancien = (u.providers || []).find((p) => p.provider === etat.ia.servi)
      const raison = ancien?.status === 'exhausted' ? 'quota' : ancien?.status === 'error' ? 'erreur' : 'choix'
      ev.push({ type: 'ia_bascule', objet: masquer(`ia:${u.served_provider}`), resume: masquer(`${etat.ia.servi} → ${u.served_provider} · ${raison}`), apres: () => {} })
    }
    if (u.served_provider) etat.ia.servi = u.served_provider
  }
  const q = lireSi(path.join(echange, 'quota-codex.json'))
  let codex
  try { codex = q ? JSON.parse(q) : null } catch { codex = null }
  const cleCodex = codex ? `${Math.floor(codex.cinq_heures / 10)}|${Math.floor(codex.semaine / 10)}` : 'non'
  if (etat.ia.codex !== cleCodex) ev.push({ type: 'ia_quota', objet: 'ia:codex', resume: codex ? `5 h : ${Math.round(codex.cinq_heures)} % · semaine : ${Math.round(codex.semaine)} %` : 'non mesuré', apres: () => { etat.ia.codex = cleCodex } })
  for (const e of ev) if (await poster(t, '/api/agents/evenements', { type: e.type, objet: e.objet, resume: e.resume })) e.apres()
}

async function tour(t) {
  fs.mkdirSync(journal, { recursive: true })
  const etat = lireEtat()
  const l = lecture()
  const p = etat.lecture
  if (p && t > p.t && l.total >= p.total && l.octets >= p.octets) {
    const dt = l.total - p.total
    const cpu = dt ? dixieme(((dt - (l.repos - p.repos)) / dt) * 100) : 0
    const mem = dixieme((1 - l.memDispo / l.memTotal) * 100)
    const res = dixieme(((((l.octets - p.octets) * 8) / ((t - p.t) / 1000)) / debit) * 100)
    fs.appendFileSync(path.join(journal, `mesures-${jourParis(t)}.jsonl`), `${JSON.stringify({ le: new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z'), cpu, mem, res })}\n`)
  }
  etat.lecture = { t, total: l.total, repos: l.repos, octets: l.octets }
  // Les fichiers de plus de 8 jours partent.
  for (const f of fs.readdirSync(journal)) {
    const m = /^mesures-(\d{4}-\d{2}-\d{2})\.jsonl$/.exec(f)
    if (m && (Date.parse(jourParis(t)) - Date.parse(m[1])) / JOUR > 8) fs.rmSync(path.join(journal, f))
  }
  if (!etat.battement || t - etat.battement >= QUINZE) { if (await poster(t, '/api/agents/battement')) etat.battement = t }
  if (heureParis(t) >= '09:00' && etat.point !== jourParis(t)) {
    const b = bilan(t)
    if (await poster(t, '/api/agents/evenements', { type: 'usine_mesure', objet: `usine:${jourParis(t)}`, resume: `p95 7 j · processeur ${fr(b.cpu)} % · mémoire ${fr(b.mem)} % · réseau ${fr(b.res)} % · verdict ${b.verdict}` })) etat.point = jourParis(t)
    const s = semaineIso(t)
    if ((b.verdict === 'approche' || b.verdict === 'danger') && etat.decision !== s) {
      const r = await poster(t, '/api/agents/decisions', {
        question: "L'usine risque d'être reprise par Oracle pour inactivité : que fait-on ?",
        contexte: `p95 sur 7 jours au ${jourParis(t)} : processeur ${fr(b.cpu)} %, mémoire ${fr(b.mem)} %, réseau ${fr(b.res)} % ; verdict ${b.verdict}.`,
        options: [
          { cle: 'deplacer_du_travail', libelle: 'Déplacer du vrai travail sur l\'usine', recommandee: true },
          { cle: 'accepter_le_risque', libelle: 'Accepter le risque : tout est reprenable par le poste', recommandee: false },
          { cle: 'paiement_a_l_usage', libelle: 'Passer le compte Oracle en paiement à l\'usage', recommandee: false },
        ],
        defaut: 'accepter_le_risque', montant_cents: 0, portee: 'argent', echeance: new Date(t + 3 * JOUR).toISOString(), cle: `usine:seuil:${s}`,
      })
      if (r) etat.decision = s
    }
  }
  if (l.memDispo < 1024 * 1024 && (!etat.memoire || t - etat.memoire >= 60 * MINUTE)) {
    if (await poster(t, '/api/agents/evenements', { type: 'usine_memoire', objet: `usine:${jourParis(t)}`, resume: `mémoire disponible sous 1 Go (${Math.round(l.memDispo / 1024)} Mo)` })) etat.memoire = t
  }
  if (l.disque > 0.8 && etat.disque !== jourParis(t)) {
    if (await poster(t, '/api/agents/evenements', { type: 'usine_disque', objet: `usine:${jourParis(t)}`, resume: `disque de la racine à ${Math.round(l.disque * 100)} %` })) etat.disque = jourParis(t)
  }
  if (!etat.releveIa || t - etat.releveIa >= QUINZE) { await releverIa(t, etat); etat.releveIa = t }
  ecrireEtat(etat)
}

const depart = typeof opt.maintenant === 'string' ? Date.parse(opt.maintenant) : Date.now()
if (opt.bilan) {
  process.stdout.write(`${JSON.stringify(bilan(depart))}\n`)
} else if (opt['une-mesure']) {
  await tour(depart)
} else {
  // Le service : un tour par minute (un par seconde avec --accelerer, l'horloge avançant d'une minute par tour).
  let n = 0
  const pas = opt.accelerer ? 1000 : MINUTE
  const suivant = async () => {
    const t = opt.accelerer ? depart + n * MINUTE : Date.now()
    n++
    try { await tour(t) } catch (e) { process.stderr.write(`surveillance : tour en échec (${e.message})\n`) }
    setTimeout(suivant, pas)
  }
  suivant()
}
