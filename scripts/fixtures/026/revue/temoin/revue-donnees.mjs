#!/usr/bin/env node
// Témoin de 026-121 : une implémentation de référence de scripts/chef/revue-donnees.mjs (fiche 026-146), écrite par
// Claude Code pour prouver que scripts/revue-qa.mjs passe sur un code conforme. Jamais déployée : le juge la copie
// dans une racine d'essai (scripts/chef/revue-donnees.mjs), à côté du vrai scripts/chef/commun.mjs.
//
// node scripts/chef/revue-donnees.mjs --semaine=AAAA-SS [--verdicts=<f>] [--agents=<f>] [--etat=<f> | --base=<url>] [--sortie=<f>]
import fs from 'node:fs'
import path from 'node:path'
import { option, lireJeton, baseSure, appeler, principal, Arret, RACINE } from './commun.mjs'

const NON_MESURE = 'non mesuré'
const JOUR_PARIS = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })
const JOUR = 86_400_000

function lireLignes(fichier) {
  let texte
  try { texte = fs.readFileSync(fichier, 'utf8') } catch { return { lignes: [], illisibles: 0 } }
  const lignes = []
  let illisibles = 0
  for (const brute of texte.split(/\r?\n/)) {
    const l = brute.trim()
    if (!l) continue
    try {
      const o = JSON.parse(l)
      if (o && typeof o === 'object' && !Array.isArray(o)) lignes.push(o)
      else illisibles++
    } catch { illisibles++ }
  }
  return { lignes, illisibles }
}

const instant = (v) => { const t = typeof v === 'string' ? Date.parse(v) : NaN; return Number.isFinite(t) ? t : null }
const jourParis = (t) => JOUR_PARIS.format(new Date(t)) // AAAA-MM-JJ, heure de Paris

// Semaine ISO d'un jour civil (AAAA-MM-JJ) : celle de son jeudi.
function semaineDuJour(jour) {
  const [a, m, j] = jour.split('-').map(Number)
  const d = new Date(Date.UTC(a, m - 1, j))
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7) + 3)
  const annee = d.getUTCFullYear()
  const jeudi1 = new Date(Date.UTC(annee, 0, 4))
  jeudi1.setUTCDate(jeudi1.getUTCDate() - ((jeudi1.getUTCDay() + 6) % 7) + 3)
  return `${annee}-${String(1 + Math.round((d - jeudi1) / (7 * JOUR))).padStart(2, '0')}`
}
// Le lundi et le dimanche (jours civils) d'une semaine ISO.
function bornes(semaine) {
  const [annee, n] = semaine.split('-').map(Number)
  const lundi1 = new Date(Date.UTC(annee, 0, 4))
  lundi1.setUTCDate(lundi1.getUTCDate() - ((lundi1.getUTCDay() + 6) % 7))
  const lundi = new Date(lundi1.getTime() + (n - 1) * 7 * JOUR)
  const dimanche = new Date(lundi.getTime() + 6 * JOUR)
  return { du: lundi.toISOString().slice(0, 10), au: dimanche.toISOString().slice(0, 10) }
}

const executantDe = (v) => {
  if (typeof v.executant === 'string' && v.executant.trim()) return v.executant.trim()
  if (typeof v.agent === 'string' && v.agent.trim()) return v.agent.trim()
  return 'inconnu'
}
function mediane(xs) {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2)
}

async function lireEtat() {
  const fichier = option('etat')
  if (typeof fichier === 'string') {
    try { return JSON.parse(fs.readFileSync(path.resolve(fichier), 'utf8')) } catch { return null }
  }
  let jeton
  try { jeton = lireJeton() } catch { return null } // sans jeton, l'état n'est pas mesuré : jamais de plantage
  const r = await appeler(baseSure(option('base')), jeton, 'GET', '/api/agents/etat')
  return r.statut === 200 && r.json && typeof r.json === 'object' ? r.json : null
}

principal(async () => {
  const semaine = option('semaine')
  if (typeof semaine !== 'string' || !/^\d{4}-\d{2}$/.test(semaine)) throw new Arret(2, '--semaine=AAAA-SS obligatoire')
  const fv = path.resolve(typeof option('verdicts') === 'string' ? option('verdicts') : path.join(RACINE, '.orchestre', 'verdicts.jsonl'))
  const fa = path.resolve(typeof option('agents') === 'string' ? option('agents') : path.join(RACINE, '.orchestre', 'agents.jsonl'))
  const V = lireLignes(fv)
  const A = lireLignes(fa)

  // Premier lancement connu de chaque tâche.
  const lancement = new Map()
  for (const a of A.lignes) {
    const t = instant(a.date)
    if (typeof a.tache !== 'string' || t === null) continue
    if (!lancement.has(a.tache) || t < lancement.get(a.tache)) lancement.set(a.tache, t)
  }

  const executants = {}
  const reussites = {} // exécutant → Map(id → premier PASS depuis fait/)
  let derniere = null
  for (const v of V.lignes) {
    const t = instant(v.date)
    if (t === null) continue
    derniere = v.date
    if (semaineDuJour(jourParis(t)) !== semaine) continue
    const e = executantDe(v)
    const x = executants[e] ??= { pass: 0, fail: 0, taches_reussies: 0, minutes_mediane_par_reussite: null, quotas: 0, expirees: 0, disjonctees: 0 }
    const r = reussites[e] ??= new Map()
    if (v.verdict === 'PASS') {
      x.pass++
      if (v.dossier === 'fait' && typeof v.id === 'string' && (!r.has(v.id) || t < r.get(v.id))) r.set(v.id, t)
    } else if (v.verdict === 'FAIL') x.fail++
    else if (v.verdict === 'QUOTA') x.quotas++
    else if (v.verdict === 'EXPIRÉE') x.expirees++
    else if (v.verdict === 'DISJONCTÉE') x.disjonctees++
  }
  for (const [e, x] of Object.entries(executants)) {
    const r = reussites[e]
    x.taches_reussies = r.size
    const minutes = []
    for (const [id, t] of r) { const l = lancement.get(id); if (l !== undefined && l <= t) minutes.push((t - l) / 60_000) }
    x.minutes_mediane_par_reussite = mediane(minutes)
  }

  const etat = await lireEtat()
  const repris = (cle) => (etat && etat[cle] && typeof etat[cle] === 'object' && !Array.isArray(etat[cle]) ? etat[cle] : NON_MESURE)
  const trie = Object.fromEntries(Object.keys(executants).sort().map((k) => [k, executants[k]]))
  const sortie = {
    semaine,
    ...bornes(semaine),
    executants: trie,
    lignes_illisibles: V.illisibles + A.illisibles,
    fraicheur: {
      verdicts: derniere ?? NON_MESURE,
      etat: etat ? (typeof etat.genere_le === 'string' ? etat.genere_le : new Date().toISOString()) : NON_MESURE,
    },
    argent: repris('argent'),
    entonnoir: repris('entonnoir'),
  }
  const texte = JSON.stringify(sortie, null, 2) + '\n'
  const cible = option('sortie')
  if (typeof cible === 'string') fs.writeFileSync(path.resolve(cible), texte)
  else process.stdout.write(texte)
  return 0
})
