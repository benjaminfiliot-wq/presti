#!/usr/bin/env node
// Relevé honnête de l'activité réelle de l'usine.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const MINUTE = 60_000
const JOUR = 86_400_000
const options = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const i = arg.indexOf('=')
  return i < 0 ? [arg.slice(2), true] : [arg.slice(2, i), arg.slice(i + 1)]
}))
const journal = options.journal || path.join(os.homedir(), 'travail/surveillance')
const proc = options.proc || '/proc'
const base = options.base || 'https://prestiapp.fr'
const freellmapi = options.freellmapi || 'http://127.0.0.1:3001'
const echangeIa = options['echange-ia'] || '/srv/presti-ia/echange'
const compteursIa = options['compteurs-ia'] || '/home/agents/travail/ia'
const jeton = process.env.PRESTI_JETON_USINE

function refuser(message) { process.stderr.write(message + '\n'); process.exit(2) }
function urlPermise(adresse, localeSeulement = false) {
  try {
    const u = new URL(adresse)
    const locale = ['127.0.0.1', 'localhost'].includes(u.hostname)
    return !u.username && !u.password && !u.pathname.replace(/\//g, '') &&
      (localeSeulement ? u.protocol === 'http:' && locale : u.protocol === 'https:' || u.protocol === 'http:' && locale)
  } catch { return false }
}
if (!urlPermise(base)) refuser('adresse du bus interdite')
if (!urlPermise(freellmapi, true)) refuser('freellmapi doit être sur la boucle locale')
if ((options.service || options['une-mesure']) && process.platform !== 'linux' && !options.proc) refuser("la surveillance ne mesure que l'usine")
if (options.service && !jeton) refuser('jeton usine absent')

const lireJson = (f, defaut = null) => {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return defaut }
}
const enregistrer = (f, valeur) => fs.writeFileSync(path.join(journal, f), JSON.stringify(valeur))
const tracer = (nom, valeur) => fs.appendFileSync(path.join(journal, nom), JSON.stringify(valeur) + '\n')
const dateParis = (t) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(t)
const heureParis = (t) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hour12: false }).format(t)
const dixieme = (x) => Math.round(x * 10) / 10
const nomSur = (x) => String(x ?? '').toLowerCase().replace(/[^a-z0-9_.-]/g, '').replace(/\d{9,}/g, 'masque').slice(0, 50) || 'inconnu'
const format = (x) => x == null ? '?' : x.toFixed(1)

function instantane(t) {
  const cpu = fs.readFileSync(path.join(proc, 'stat'), 'utf8').split('\n').find((l) => /^cpu\s/.test(l)).trim().split(/\s+/).slice(1).map(Number)
  const mem = Object.fromEntries(fs.readFileSync(path.join(proc, 'meminfo'), 'utf8').split('\n').filter((l) => l.includes(':')).map((l) => [l.split(':')[0], Number.parseInt(l.split(':')[1], 10)]))
  const octets = fs.readFileSync(path.join(proc, 'net/dev'), 'utf8').split('\n').slice(2).reduce((n, l) => {
    const i = l.indexOf(':')
    if (i < 0 || l.slice(0, i).trim() === 'lo') return n
    const v = l.slice(i + 1).trim().split(/\s+/).map(Number)
    return n + v[0] + v[8]
  }, 0)
  return { le: t.toISOString(), cpu, memTotal: mem.MemTotal, memDisponible: mem.MemAvailable, octets }
}

function mesure(avant, apres) {
  const deltas = apres.cpu.map((x, i) => x - (avant.cpu[i] ?? x))
  const total = deltas.reduce((a, b) => a + b, 0)
  const secondes = (Date.parse(apres.le) - Date.parse(avant.le)) / 1000
  const debit = Number(process.env.USINE_DEBIT_BPS) > 0 ? Number(process.env.USINE_DEBIT_BPS) : 2_000_000_000
  return {
    le: apres.le,
    cpu: total > 0 ? dixieme(100 * (total - deltas[3] - deltas[4]) / total) : 0,
    mem: dixieme(100 * (1 - apres.memDisponible / apres.memTotal)),
    res: secondes > 0 ? dixieme(100 * Math.max(0, apres.octets - avant.octets) * 8 / secondes / debit) : 0,
  }
}

function purger(t) {
  for (const f of fs.readdirSync(journal)) {
    if (!/^mesures-\d{4}-\d{2}-\d{2}\.jsonl$/.test(f)) continue
    const p = path.join(journal, f)
    if (t.getTime() - fs.statSync(p).mtimeMs > 8 * JOUR) fs.unlinkSync(p)
  }
}

function bilan(t) {
  const depuis = t.getTime() - 7 * JOUR
  const valeurs = { cpu: [], mem: [], res: [] }
  for (const f of fs.readdirSync(journal)) {
    if (!/^mesures-\d{4}-\d{2}-\d{2}\.jsonl$/.test(f)) continue
    for (const ligne of fs.readFileSync(path.join(journal, f), 'utf8').split('\n')) {
      if (!ligne) continue
      let m
      try { m = JSON.parse(ligne) } catch { continue }
      const ms = Date.parse(m.le)
      if (!(ms > depuis && ms <= t.getTime())) continue
      for (const cle of Object.keys(valeurs)) if (Number.isFinite(m[cle])) valeurs[cle].push(m[cle])
    }
  }
  const p95 = {}
  for (const [cle, tableau] of Object.entries(valeurs)) {
    tableau.sort((a, b) => a - b)
    p95[cle] = tableau.length ? tableau[Math.ceil(tableau.length * 0.95) - 1] : 0
  }
  const plusGrand = Math.max(...Object.values(p95))
  return { ...p95, verdict: valeurs.cpu.length < 1440 ? 'incomplet' : plusGrand < 22 ? 'danger' : plusGrand < 30 ? 'approche' : 'ok' }
}

async function appel(route, corps, t) {
  if (!jeton) return false
  try {
    const reponse = await fetch(base + '/api/agents/' + route, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + jeton, ...(corps ? { 'Content-Type': 'application/json' } : {}) },
      body: corps ? JSON.stringify(corps) : undefined,
      signal: AbortSignal.timeout(3000),
    })
    if (!reponse.ok) {
      tracer('incidents.jsonl', { le: t.toISOString(), bus_injoignable: reponse.status })
      return false
    }
    return true
  } catch (e) {
    tracer('incidents.jsonl', { le: t.toISOString(), bus_injoignable: e.cause?.code || e.code || 'reseau' })
    return false
  }
}
const evenement = (type, objet, resume, t) => appel('evenements', { type, objet, resume: resume.slice(0, 200) }, t)
function du(t, marque, duree) {
  const precedent = lireJson(path.join(journal, 'marques.json'), {})
  return !precedent[marque] || t.getTime() - precedent[marque] >= duree
}
function marquer(t, marque) {
  const m = lireJson(path.join(journal, 'marques.json'), {})
  m[marque] = t.getTime()
  enregistrer('marques.json', m)
}
function semaineIso(t) {
  const [an, mois, jour] = dateParis(t).split('-').map(Number)
  const d = new Date(Date.UTC(an, mois - 1, jour))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const debut = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return d.getUTCFullYear() + '-S' + String(Math.ceil((((d - debut) / JOUR) + 1) / 7)).padStart(2, '0')
}
function disque() {
  const f = path.join(proc, 'statfs.json')
  const s = options.proc && fs.existsSync(f) ? lireJson(f) : fs.statfsSync('/')
  return 100 * (1 - s.bavail / s.blocks)
}
function lignesCompteur(jour) {
  const f = path.join(compteursIa, 'compteurs-' + jour + '.jsonl')
  try { return fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) } catch { return [] }
}
function publierCompteursLocaux(t, compteurs) {
  // Le bus impose un battement sans corps : ce détail horodaté reste dans le journal local.
  const groupes = new Map()
  for (const ligne of compteurs) {
    const agent = nomSur(ligne.agent), moteur = nomSur(ligne.moteur), modele = nomSur(ligne.modele)
    const cle = [agent, moteur, modele].join('|')
    const horodatage = Number.isFinite(Date.parse(ligne.le)) ? new Date(ligne.le).toISOString() : null
    const precedent = groupes.get(cle)
    groupes.set(cle, {
      agent, moteur, modele, appels: (precedent?.appels || 0) + 1,
      dernier_appel: horodatage && (!precedent?.dernier_appel || horodatage > precedent.dernier_appel) ? horodatage : precedent?.dernier_appel || null,
      cout_api_cents: moteur === 'ollama' ? 0 : null,
      quota_pourcent: null,
    })
  }
  enregistrer('compteurs-agents.json', { le: t.toISOString(), compteurs: [...groupes.values()] })
}
async function releverIa(t) {
  const memoire = lireJson(path.join(journal, 'ia-etat.json'), { quotas: {}, servi: null })
  const jour = dateParis(t)
  const compteurs = lignesCompteur(jour)
  publierCompteursLocaux(t, compteurs)
  let relevé
  try {
    const r = await fetch(freellmapi + '/api/usage', { signal: AbortSignal.timeout(1500) })
    if (!r.ok) throw new Error(String(r.status))
    relevé = await r.json()
  } catch (e) {
    tracer('incidents.jsonl', { le: t.toISOString(), ia_injoignable: e.message || 'reseau' })
  }
  if (relevé && Array.isArray(relevé.providers)) {
    const anciens = Object.fromEntries(relevé.providers.map((p) => [nomSur(p.provider), p.status]))
    const servi = nomSur(relevé.served_provider)
    if (memoire.servi && memoire.servi !== servi) {
      const cause = anciens[memoire.servi] === 'exhausted' ? 'quota' : anciens[memoire.servi] === 'error' ? 'erreur' : 'choix'
      await evenement('ia_bascule', 'ia:' + servi, memoire.servi + ' → ' + servi + ' · ' + cause, t)
    }
    memoire.servi = servi
    for (const p of relevé.providers) {
      const fournisseur = nomSur(p.provider), modele = nomSur(p.model)
      const utilise = Number.isFinite(p.used) ? p.used : compteurs.filter((c) => c.fournisseur_reel === p.provider && c.modele === p.model).length
      const plafond = Number.isFinite(p.limit) ? p.limit : null
      const etat = { active: 'actif', exhausted: 'épuisé', error: 'erreur' }[p.status] || 'erreur'
      const tranche = plafond > 0 ? Math.floor(utilise / plafond * 10) : 'inconnu'
      const signature = [etat, tranche].join(':')
      if (memoire.quotas[fournisseur] !== signature) {
        const unite = String(p.unit || '').replace(/[^a-zA-Z/]/g, '').slice(0, 20)
        const remise = Number.isFinite(Date.parse(p.resets_at)) ? heureParis(new Date(p.resets_at)) : 'inconnue'
        await evenement('ia_quota', 'ia:' + fournisseur, `${fournisseur} · ${modele} · ${utilise}/${plafond ?? '?'} ${unite} · ${etat} · remis à ${remise}`, t)
        memoire.quotas[fournisseur] = signature
      }
    }
  }
  const codex = lireJson(path.join(echangeIa, 'quota-codex.json'))
  const resumeCodex = Number.isFinite(codex?.cinq_heures) && Number.isFinite(codex?.semaine)
    ? `5 h : ${codex.cinq_heures} % · semaine : ${codex.semaine} %` : 'non mesuré'
  if (memoire.quotas.codex !== resumeCodex) {
    await evenement('ia_quota', 'ia:codex', resumeCodex, t)
    memoire.quotas.codex = resumeCodex
  }
  enregistrer('ia-etat.json', memoire)
}

async function tour(t) {
  fs.mkdirSync(journal, { recursive: true })
  const actuel = instantane(t)
  const precedent = lireJson(path.join(journal, 'lecture.json'))
  enregistrer('lecture.json', actuel)
  purger(t)
  if (precedent && Date.parse(precedent.le) < t.getTime()) {
    tracer('mesures-' + dateParis(t) + '.jsonl', mesure(precedent, actuel))
  }
  const quart = Math.floor(t.getTime() / (15 * MINUTE))
  const marques = lireJson(path.join(journal, 'marques.json'), {})
  if (marques.battement !== quart) {
    await appel('battement', null, t)
    marquer(t, 'battement')
    const m = lireJson(path.join(journal, 'marques.json'), {})
    m.battement = quart; enregistrer('marques.json', m)
  }
  if (marques.ia !== quart) {
    await releverIa(t)
    const m = lireJson(path.join(journal, 'marques.json'), {})
    m.ia = quart; enregistrer('marques.json', m)
  }
  if (actuel.memDisponible < 1024 * 1024 && du(t, 'memoire', 60 * MINUTE)) {
    if (await evenement('usine_memoire', 'usine', 'Mémoire disponible sous 1 Go', t)) marquer(t, 'memoire')
  }
  if (disque() > 80 && du(t, 'disque', JOUR)) {
    if (await evenement('usine_disque', 'usine', 'Disque racine occupé à plus de 80 %', t)) marquer(t, 'disque')
  }
  const jour = dateParis(t)
  const heure = heureParis(t)
  const point = heure >= '09:00' && lireJson(path.join(journal, 'marques.json'), {})['point-' + jour] !== true
  const semaine = semaineIso(t)
  const decisionFaite = lireJson(path.join(journal, 'marques.json'), {})['decision-' + semaine] === true
  if (point || !decisionFaite) {
    const b = bilan(t)
    const resume = `p95 7 j · processeur ${format(b.cpu)} % · mémoire ${format(b.mem)} % · réseau ${format(b.res)} % · verdict ${b.verdict}`
    if (point && await evenement('usine_mesure', 'usine:' + jour, resume, t)) {
      const m = lireJson(path.join(journal, 'marques.json'), {})
      m['point-' + jour] = true; enregistrer('marques.json', m)
    }
    if (!decisionFaite && ['approche', 'danger'].includes(b.verdict)) {
      const corps = {
        question: "L'usine risque d'être reprise par Oracle pour inactivité : que fait-on ?",
        contexte: jour + ' · ' + resume,
        options: [
          { cle: 'deplacer_du_travail', libelle: "Déplacer du vrai travail sur l'usine", recommandee: true },
          { cle: 'accepter_le_risque', libelle: 'Accepter le risque : tout est reprenable par le poste', recommandee: false },
          { cle: 'paiement_a_l_usage', libelle: "Passer le compte Oracle en paiement à l'usage", recommandee: false },
        ],
        defaut: 'accepter_le_risque', montant_cents: 0, portee: 'argent',
        echeance: new Date(t.getTime() + 3 * JOUR).toISOString(),
        cle: 'usine:seuil:' + semaine,
      }
      if (await appel('decisions', corps, t)) {
        const m = lireJson(path.join(journal, 'marques.json'), {})
        m['decision-' + semaine] = true; enregistrer('marques.json', m)
      }
    }
  }
}

const debut = options.maintenant ? new Date(options.maintenant) : new Date()
if (!Number.isFinite(debut.getTime())) refuser('horloge invalide')
if (options.bilan) {
  fs.mkdirSync(journal, { recursive: true })
  process.stdout.write(JSON.stringify(bilan(debut)) + '\n')
} else if (options['une-mesure']) {
  await tour(debut)
} else if (options.service) {
  await tour(debut)
  let n = 0
  const delai = options.accelerer ? 1000 : 60_000
  setInterval(() => {
    n++
    const t = options.accelerer ? new Date(debut.getTime() + n * MINUTE) : new Date()
    tour(t).catch((e) => process.stderr.write(String(e.message) + '\n'))
  }, delai)
} else refuser('choisir --service, --une-mesure ou --bilan')
