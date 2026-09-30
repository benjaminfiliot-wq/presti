#!/usr/bin/env node
// Fiche 026-239 — scripts/chef/bilan-donnees.mjs : les chiffres du bilan (jour ou semaine), au contrat de 026-238.
//
//   node scripts/chef/bilan-donnees.mjs --jour=AAAA-MM-JJ | --semaine=AAAA-SS [--base=…] [--verdicts=…] [--agents=…]
//        [--etat=<fichier>] [--lecons=<dossier>] [--candidates=<dossier>] [--recherches=<dossier>] [--sans-savoir]
//        [--sortie=<fichier>]
//
// Les chiffres du bilan, calculés par un script, jamais par le modèle. Heure civile de Paris. Un bloc absent ou illisible
// vaut « non mesuré » ; le code de sortie reste 0.
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { RACINE, Arret, option, lireJeton, baseSure, appeler, principal } from './commun.mjs'

const NON_MESURE = 'non mesuré'
const RE_CRITERE = /\b[A-Z]{1,4}-[A-Z]{0,2}\d{1,3}\b/
const ECHECS = new Set(['FAIL', 'REFUSÉE', 'EXPIRÉE', 'DISJONCTÉE'])
const JOUR = 86_400_000

const jourParis = (date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
const dateIso = (d) => d.toISOString().slice(0, 10)

function periode() {
  const jour = option('jour')
  const semaine = option('semaine')
  if ((jour === undefined) === (semaine === undefined)) throw new Arret(2, '--jour=AAAA-MM-JJ ou --semaine=AAAA-SS, l\'un des deux')
  if (jour !== undefined) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(jour))
    const d = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null
    if (!d || dateIso(d) !== jour) throw new Arret(2, '--jour : une date AAAA-MM-JJ valide')
    return { type: 'jour', debut: jour, fin: jour, fuseau: 'Europe/Paris' }
  }
  const m = /^(\d{4})-(\d{2})$/.exec(String(semaine))
  if (!m) throw new Arret(2, '--semaine : AAAA-SS')
  const an = Number(m[1])
  const no = Number(m[2])
  const lundi = new Date(Date.UTC(an, 0, 4))
  lundi.setUTCDate(lundi.getUTCDate() - ((lundi.getUTCDay() + 6) % 7) + (no - 1) * 7)
  const jeudi = new Date(lundi.getTime() + 3 * JOUR)
  if (no < 1 || jeudi.getUTCFullYear() !== an) throw new Arret(2, '--semaine : semaine ISO invalide')
  return { type: 'semaine', debut: dateIso(lundi), fin: dateIso(new Date(lundi.getTime() + 6 * JOUR)), fuseau: 'Europe/Paris' }
}
const joursDe = (p) => { const out = []; for (let t = Date.parse(`${p.debut}T00:00:00Z`); t <= Date.parse(`${p.fin}T00:00:00Z`); t += JOUR) out.push(dateIso(new Date(t))); return out }

/** Les lignes d'un .jsonl : { n (numéro de ligne, lignes vides comprises), o }, plus le compte des illisibles ; null si le fichier manque. */
function lireLignes(fichier) {
  let texte
  try { texte = fs.readFileSync(fichier, 'utf8') } catch { return null }
  const lignes = []
  let illisibles = 0
  texte.split(/\r?\n/).forEach((brute, i) => {
    if (!brute.trim()) return
    try { const o = JSON.parse(brute); if (o && typeof o === 'object' && !Array.isArray(o)) lignes.push({ n: i + 1, o }); else illisibles++ } catch { illisibles++ }
  })
  return { lignes, illisibles }
}
const compte = (n) => (Number.isFinite(n) ? n : null)

function blocsVerdicts(verdicts, p) {
  if (!verdicts) return { executants: NON_MESURE, echecs: NON_MESURE }
  const par = {}
  const echecs = []
  let derniere = NON_MESURE
  for (const { n, o } of verdicts.lignes) {
    if (typeof o.date === 'string') derniere = o.date
    const t = Date.parse(o.date)
    if (!Number.isFinite(t)) continue
    const j = jourParis(new Date(t))
    if (j < p.debut || j > p.fin) continue
    const nom = o.executant || o.agent
    if (!nom) continue
    const v = (par[nom] ||= { pass: 0, fail: 0, refusees: 0, expirees: 0, disjonctees: 0 })
    if (o.verdict === 'PASS') v.pass++
    if (o.verdict === 'FAIL') v.fail++
    if (o.verdict === 'REFUSÉE') v.refusees++
    if (o.verdict === 'EXPIRÉE') v.expirees++
    if (o.verdict === 'DISJONCTÉE') v.disjonctees++
    if (ECHECS.has(o.verdict)) echecs.push({ id: o.id, verdict: o.verdict, critere: RE_CRITERE.exec(String(o.ligne ?? ''))?.[0] ?? null, date: o.date, source: `verdicts.jsonl:${n}`, t, n })
  }
  echecs.sort((a, b) => b.t - a.t || b.n - a.n)
  return {
    executants: { source: 'verdicts.jsonl', fraicheur: derniere, par_executant: par },
    echecs: echecs.slice(0, 10).map(({ t, n, ...e }) => e),
  }
}

async function etatDuBus() {
  const fichier = option('etat')
  if (fichier !== undefined) {
    try { return JSON.parse(fs.readFileSync(String(fichier), 'utf8')) } catch { return null }
  }
  if (option('base') === undefined) return null
  try {
    const r = await appeler(baseSure(option('base')), lireJeton(), 'GET', '/api/agents/etat')
    return r.statut === 200 && r.json && typeof r.json === 'object' ? r.json : null
  } catch { return null }
}
function blocsEtat(etat) {
  if (!etat) return { couts: NON_MESURE, quotas: NON_MESURE }
  const fraicheur = typeof etat.genere_le === 'string' ? etat.genere_le : NON_MESURE
  const mois = typeof etat.couts_mois === 'number' ? etat.couts_mois : typeof etat.couts_mois?.eur === 'number' ? etat.couts_mois.eur : null
  const agents = Array.isArray(etat.agents) ? etat.agents : null
  return {
    couts: mois === null ? NON_MESURE : { source: 'etat', fraicheur, mois_eur: mois, notifications_jour: compte(etat.notifications_jour) },
    quotas: agents === null ? NON_MESURE : {
      source: 'etat', fraicheur,
      agents_en_pause: agents.filter((a) => a?.en_pause === true).length,
      disjoncteurs_ouverts: agents.filter((a) => a?.disjoncteur_ouvert === true).length,
      echecs_24h: compte(etat.taches?.echecs_24h),
      decisions_ouvertes: Array.isArray(etat.decisions_ouvertes) ? etat.decisions_ouvertes.length : null,
    },
  }
}

function entete(texte) {
  const l = texte.replace(/\r\n?/g, '\n').split('\n')
  if (l[0] !== '---') return null
  const fin = l.indexOf('---', 1)
  if (fin < 0) return null
  const o = {}
  for (const x of l.slice(1, fin)) { const m = /^([a-z_]+):\s?(.*)$/.exec(x); if (m) o[m[1]] = m[2].trim() }
  return o
}
function dossierMd(d) {
  let noms
  try { noms = fs.readdirSync(d).filter((n) => n.endsWith('.md')).sort() } catch { return null }
  return noms.map((n) => entete(fs.readFileSync(path.join(d, n), 'utf8'))).filter(Boolean)
}
const ecartJours = (a, b) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / JOUR)
function blocLecons(p) {
  const dLecons = path.resolve(RACINE, String(option('lecons', path.join('docs', 'savoir', 'lecons'))))
  const dCand = path.resolve(RACINE, String(option('candidates', path.join('.orchestre', 'travail', 'savoir', 'lecons', 'candidates'))))
  const dRej = path.join(path.dirname(dCand), 'rejetees')
  const validees = dossierMd(dLecons)
  const candidates = dossierMd(dCand)
  const rejetees = dossierMd(dRej)
  if (validees === null && candidates === null && rejetees === null) return NON_MESURE
  const dans = (d) => typeof d === 'string' && d >= p.debut && d <= p.fin
  const cands = (candidates || []).filter((e) => e.statut === 'candidate' && /^\d{4}-\d{2}-\d{2}$/.test(e.date || ''))
  const dates = [...cands.map((e) => e.date), ...(validees || []).map((e) => e.valide_le), ...(rejetees || []).map((e) => e.rejete_le)].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d || ''))
  return {
    source: 'lecons',
    fraicheur: dates.length ? dates.sort().at(-1) : NON_MESURE,
    candidates: cands.length,
    validees_periode: (validees || []).filter((e) => e.statut === 'validee' && dans(e.valide_le)).length,
    rejetees_periode: (rejetees || []).filter((e) => e.statut === 'rejetee' && dans(e.rejete_le)).length,
    plus_vieille_candidate_jours: cands.length ? ecartJours(p.fin, cands.map((e) => e.date).sort()[0]) : null,
  }
}

function racineSavoir() { return path.resolve(RACINE, String(option('recherches', path.join('.orchestre', 'travail', 'savoir')))) }
function blocRecherches(p) {
  const rt = racineSavoir()
  let lues = 0
  const b = { source: 'recherches', fraicheur: NON_MESURE, total: 0, web: 0, perplexity: 0, refus: 0, credits: 0 }
  let derniere = ''
  for (const j of joursDe(p)) {
    const l = lireLignes(path.join(rt, `recherches-${j}.jsonl`))
    if (!l) continue
    lues++
    for (const { o } of l.lignes) {
      b.total++
      if (Number(o.origines?.web) > 0) b.web++
      if (Number(o.origines?.perplexity) > 0) b.perplexity++
      if (o.refus) b.refus++
      b.credits += Number(o.credits) || 0
      if (typeof o.le === 'string' && o.le > derniere) derniere = o.le
    }
  }
  if (!lues) return NON_MESURE
  b.fraicheur = derniere || NON_MESURE
  return b
}

function chercher(question, base, sortie) {
  const script = path.join(RACINE, 'scripts', 'savoir', 'chercher.mjs')
  const loader = path.join(RACINE, 'scripts', 'ts-loader.mjs')
  const argv = ['--experimental-strip-types', '--import', pathToFileURL(loader).href, script, '--agent=chef', `--question=${question}`, `--base=${base}`, `--racine-travail=${racineSavoir()}`, `--sortie=${sortie}`]
  return new Promise((ok) => {
    const e = spawn(process.execPath, argv, { cwd: RACINE, env: process.env, windowsHide: true, stdio: ['ignore', 'ignore', 'ignore'] })
    e.on('error', () => ok(1))
    e.on('close', (code) => ok(code ?? 1))
  })
}
async function blocSavoir(echecs) {
  if (option('sans-savoir') === true || option('base') === undefined || !Array.isArray(echecs)) return NON_MESURE
  if (!fs.existsSync(path.join(RACINE, 'scripts', 'savoir', 'chercher.mjs'))) return NON_MESURE
  const base = baseSure(option('base'))
  const dossier = fs.mkdtempSync(path.join(path.dirname(path.resolve(String(option('sortie', path.join(RACINE, 'bilan-donnees.json'))))), 'savoir-'))
  const lignes = []
  try {
    for (const [i, e] of echecs.slice(0, 3).entries()) {
      const question = `${e.critere ?? e.verdict} ${e.id}`
      const sortie = path.join(dossier, `chercher-${i}.json`)
      if (await chercher(question, base, sortie) !== 0) return NON_MESURE
      let r
      try { r = JSON.parse(fs.readFileSync(sortie, 'utf8')) } catch { return NON_MESURE }
      const sources = (Array.isArray(r.resultats) ? r.resultats : []).filter((x) => x?.origine === 'savoir' && x.source).slice(0, 3).map((x) => `${x.source.chemin}:${x.source.debut}-${x.source.fin}`)
      lignes.push({ echec: i, question, sources })
    }
  } finally { fs.rmSync(dossier, { recursive: true, force: true }) }
  return lignes
}

principal(async () => {
  const p = periode()
  const verdicts = lireLignes(String(option('verdicts', path.join(RACINE, '.orchestre', 'verdicts.jsonl'))))
  const agents = lireLignes(String(option('agents', path.join(RACINE, '.orchestre', 'agents.jsonl'))))
  const { executants, echecs } = blocsVerdicts(verdicts, p)
  const { couts, quotas } = blocsEtat(await etatDuBus())
  const lecons = blocLecons(p)
  const recherches = blocRecherches(p)
  const savoir_lie = await blocSavoir(echecs)
  const sortie = { periode: p, executants, lignes_illisibles: (verdicts?.illisibles ?? 0) + (agents?.illisibles ?? 0), echecs, couts, quotas, lecons, recherches, savoir_lie }
  const texte = `${JSON.stringify(sortie, null, 2)}\n`
  if (option('sortie') !== undefined) { fs.mkdirSync(path.dirname(path.resolve(String(option('sortie')))), { recursive: true }); fs.writeFileSync(String(option('sortie')), texte) } else process.stdout.write(texte)
  return 0
})
