#!/usr/bin/env node
// Chiffres sourcés de la revue hebdomadaire, à l'heure civile de Paris.
import fs from 'node:fs'
import { appeler, baseSure, lireJeton, option, principal } from './commun.mjs'

const NON_MESURE = 'non mesuré'

function lireLignes(fichier) {
  let contenu = ''
  try { contenu = fs.readFileSync(fichier, 'utf8') } catch { return { lignes: [], illisibles: 0 } }
  const lignes = []
  let illisibles = 0
  for (const ligne of contenu.split(/\r?\n/)) {
    if (!ligne.trim()) continue
    try { lignes.push(JSON.parse(ligne)) } catch { illisibles++ }
  }
  return { lignes, illisibles }
}

function lundiIso(texte) {
  const m = /^(\d{4})-(\d{2})$/.exec(texte || '')
  if (!m) throw new Error('semaine ISO attendue : AAAA-SS')
  const an = Number(m[1]), no = Number(m[2])
  const premier = new Date(Date.UTC(an, 0, 4))
  premier.setUTCDate(premier.getUTCDate() - ((premier.getUTCDay() + 6) % 7) + (no - 1) * 7)
  const jeudi = new Date(premier)
  jeudi.setUTCDate(jeudi.getUTCDate() + 3)
  if (no < 1 || jeudi.getUTCFullYear() !== an) throw new Error('semaine ISO invalide')
  return premier
}

function jourParis(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function mediane(nombres) {
  if (!nombres.length) return null
  nombres.sort((a, b) => a - b)
  const milieu = Math.floor(nombres.length / 2)
  return Math.round(nombres.length % 2 ? nombres[milieu] : (nombres[milieu - 1] + nombres[milieu]) / 2)
}

async function etatCourant() {
  const fichier = option('etat')
  if (fichier) {
    try { return JSON.parse(fs.readFileSync(fichier, 'utf8')) } catch { return null }
  }
  if (!option('base')) return null
  try {
    const reponse = await appeler(baseSure(option('base')), lireJeton(), 'GET', '/api/agents/etat')
    return reponse.statut === 200 ? reponse.json : null
  } catch { return null }
}

async function executer() {
  const semaine = option('semaine')
  const lundi = lundiIso(semaine)
  const dimanche = new Date(lundi)
  dimanche.setUTCDate(dimanche.getUTCDate() + 6)
  const du = lundi.toISOString().slice(0, 10), au = dimanche.toISOString().slice(0, 10)
  const verdicts = lireLignes(option('verdicts', '.orchestre/verdicts.jsonl'))
  const agents = lireLignes(option('agents', '.orchestre/agents.jsonl'))
  const premiersLancements = new Map()
  for (const ligne of agents.lignes) {
    const date = Date.parse(ligne?.date)
    if (!ligne?.tache || !Number.isFinite(date)) continue
    const actuel = premiersLancements.get(ligne.tache)
    if (actuel === undefined || date < actuel) premiersLancements.set(ligne.tache, date)
  }
  const executants = {}
  const reussites = new Map()
  let derniereDate = NON_MESURE
  for (const ligne of verdicts.lignes) {
    if (typeof ligne?.date === 'string') derniereDate = ligne.date
    const date = Date.parse(ligne?.date)
    if (!Number.isFinite(date)) continue
    const jour = jourParis(new Date(date))
    if (jour < du || jour > au) continue
    const nom = ligne.executant || ligne.agent
    if (!nom) continue
    const valeurs = executants[nom] ||= { pass: 0, fail: 0, taches_reussies: 0, minutes_mediane_par_reussite: null, quotas: 0, expirees: 0, disjonctees: 0 }
    if (ligne.verdict === 'PASS') valeurs.pass++
    if (ligne.verdict === 'FAIL') valeurs.fail++
    if (ligne.verdict === 'QUOTA') valeurs.quotas++
    if (ligne.verdict === 'EXPIRÉE') valeurs.expirees++
    if (ligne.verdict === 'DISJONCTÉE') valeurs.disjonctees++
    if (ligne.verdict === 'PASS' && ligne.dossier === 'fait' && ligne.id) {
      const cle = `${nom}\0${ligne.id}`
      if (!reussites.has(cle) || date < reussites.get(cle).date) reussites.set(cle, { nom, id: ligne.id, date })
    }
  }
  const durees = new Map()
  for (const { nom, id, date } of reussites.values()) {
    executants[nom].taches_reussies++
    const debut = premiersLancements.get(id)
    if (debut !== undefined) {
      if (!durees.has(nom)) durees.set(nom, [])
      durees.get(nom).push((date - debut) / 60_000)
    }
  }
  for (const [nom, valeurs] of Object.entries(executants)) valeurs.minutes_mediane_par_reussite = mediane(durees.get(nom) || [])
  const etat = await etatCourant()
  const sortie = {
    semaine, du, au, executants,
    lignes_illisibles: verdicts.illisibles + agents.illisibles,
    fraicheur: { verdicts: derniereDate, etat: etat?.genere_le || NON_MESURE },
    argent: etat?.argent ?? NON_MESURE,
    entonnoir: etat?.entonnoir ?? NON_MESURE,
  }
  const texte = JSON.stringify(sortie, null, 2) + '\n'
  if (option('sortie')) fs.writeFileSync(option('sortie'), texte)
  else process.stdout.write(texte)
  return 0
}

principal(executer)
