#!/usr/bin/env node
// Garde déterministe des propositions issues d'une idée tranchée.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { appeler, baseSure, lireJeton, option, positionnels, principal } from './commun.mjs'

const DOSSIERS = ['file', 'en-cours', 'fait', 'refuse']
const CLE_IDEE = /^chef:\d{4}-\d{2}-\d{2}:idee-[a-z0-9-]+$/
const CRITERE = /\b[A-Z]{2,5}-\d+\b/
const ECHEC = /(^|[^A-Za-z])(FAIL|ÉCHEC|ECHEC)([^A-Za-z]|$)|✗/
const PROTEGES = [
  'supabase/', 'lib/plans.ts', 'lib/stripe', 'app/api/stripe/', 'proxy.ts', 'middleware.ts',
  'lib/ai.ts', 'lib/agents/llm.ts', 'app/api/agents/', 'vercel.json',
  'scripts/juges/', 'scripts/fixtures/', '.claude/', '.github/',
]

function champs(texte) {
  const entete = texte.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!entete) return {}
  const valeurs = {}
  for (const ligne of entete[1].split(/\r?\n/)) {
    const i = ligne.indexOf(':')
    if (i > 0) valeurs[ligne.slice(0, i).trim()] = ligne.slice(i + 1).trim()
  }
  return valeurs
}

function liste(brut) {
  if (!brut || !/^\[.*\]$/.test(brut)) return []
  return brut.slice(1, -1).split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)
}

function protege(motif) {
  const p = motif.replaceAll('\\', '/')
  if (p === '..' || p.startsWith('../') || p.includes('/../') || path.isAbsolute(p)) return true
  if (/^scripts\/[^/]*-qa\.mjs$/.test(p) || p.startsWith('scripts/*-qa.mjs')) return true
  return PROTEGES.some((zone) => zone.endsWith('/') ? p.startsWith(zone) || (p + '/').startsWith(zone) : p === zone || (zone === 'lib/stripe' && p.startsWith(zone)))
}

function couvre(motif, fichier) {
  const prefixe = motif.split('*')[0]
  return fichier === motif || (prefixe && fichier.startsWith(prefixe))
}

function emplacement(racine, fichier) {
  const plein = path.resolve(racine, fichier)
  if (plein !== racine && !plein.startsWith(racine + path.sep)) throw new Error('chemin hors racine')
  return plein
}

function lireFiche(fichier, racine) {
  const texte = fs.readFileSync(emplacement(racine, fichier), 'utf8')
  const entete = champs(texte)
  const decision = texte.match(/^Décision\s*:\s*(\S+)\s*$/m)?.[1]
  return { texte, entete, decision, id: entete.id }
}

function verifierFiche(fichier, racine) {
  const raisons = []
  let fiche
  try { fiche = lireFiche(fichier, racine) } catch (e) { return { raisons: [`fiche illisible : ${e.message}`] } }
  const { entete, decision, id } = fiche
  const validateur = path.join(racine, 'scripts/orchestre.mjs')
  const validation = spawnSync(process.execPath, [validateur, 'valider', emplacement(racine, fichier)], { cwd: racine, encoding: 'utf8', timeout: 15_000 })
  if (validation.status !== 0) raisons.push(`en-tête refusé : ${(validation.stderr || validation.stdout || '').trim().slice(0, 300)}`)
  if (!CLE_IDEE.test(decision || '')) raisons.push('Décision : clé idée chef:<date>:idee-… requise')
  const perimetre = liste(entete.perimetre)
  if (entete.executant !== 'claude-code') for (const motif of perimetre) if (protege(motif)) raisons.push(`zone protégée : ${motif}`)
  const commande = /^node\s+(\S+\.mjs)(?:\s|$)/.exec(entete.verifier || '')
  if (!commande) raisons.push('verifier : script node .mjs attendu')
  else {
    const script = commande[1]
    try {
      if (!fs.statSync(emplacement(racine, script)).isFile()) raisons.push(`script verifier absent : ${script}`)
    } catch { raisons.push(`script verifier absent : ${script}`) }
    if (perimetre.some((motif) => couvre(motif, script))) raisons.push(`script verifier dans le périmètre : ${script}`)
  }
  if (id) for (const d of DOSSIERS) if (fs.existsSync(path.join(racine, '.orchestre', d, `${id}.md`))) raisons.push(`id déjà dans ${d}/ : ${id}`)
  if (!raisons.length && commande) {
    const minutes = Number(/\bminutes:\s*(\d+(?:\.\d+)?)/.exec(entete.budget || '')?.[1])
    const delai = Number.isFinite(minutes) && minutes > 0 ? Math.min(minutes * 60_000, 600_000) : 60_000
    const juge = spawnSync(process.execPath, [commande[1]], { cwd: racine, encoding: 'utf8', timeout: delai })
    const lignes = `${juge.stdout || ''}\n${juge.stderr || ''}`.split(/\r?\n/)
    const echecIdentifie = lignes.find((ligne) => ECHEC.test(ligne) && CRITERE.test(ligne))
    if (juge.status === 0) raisons.push('juge déjà vert avant fabrication')
    else if (!echecIdentifie) raisons.push('juge sans ligne en échec à critère identifié')
    else fiche.critere = echecIdentifie.trim()
  }
  return { ...fiche, raisons }
}

function afficher(resultat) {
  for (const raison of resultat.raisons) console.log(`✗ ${raison}`)
  if (!resultat.raisons.length) console.log(`PASS ${resultat.critere}`)
  return resultat.raisons.length ? 1 : 0
}

async function decisions(base, depuis) {
  const reponse = await appeler(baseSure(base), lireJeton(), 'GET', `/api/agents/decisions?tranchees=1&depuis=${encodeURIComponent(depuis)}`)
  if (reponse.statut !== 200 || !Array.isArray(reponse.json)) throw new Error(`décisions indisponibles (${reponse.statut})`)
  return reponse.json
}

async function executer() {
  const [commande, premier, second] = positionnels()
  const racine = path.resolve(option('racine', process.cwd()))
  if (commande === 'verifier-fiche') return afficher(verifierFiche(premier, racine))
  if (commande === 'fusion-permise') {
    const diff = spawnSync('git', ['-C', racine, 'diff', '--name-status', '--no-renames', premier, second], { encoding: 'utf8' })
    if (diff.status !== 0) { console.log('✗ git diff impossible'); return 1 }
    const refus = diff.stdout.trim().split(/\r?\n/).filter(Boolean).filter((ligne) => {
      const [statut, fichier] = ligne.split('\t')
      return !(fichier.startsWith('docs/') || /^plans\/[^/]+\.md$/.test(fichier) || (statut === 'A' && /^scripts\/[^/]+-e2e\.mjs$/.test(fichier)))
    })
    if (refus.length) { for (const ligne of refus) console.log(`✗ ${ligne}`); return 1 }
    console.log('PASS fusion permise')
    return 0
  }
  if (commande === 'idees') {
    const depuis = option('depuis')
    if (!Number.isFinite(Date.parse(depuis || ''))) throw new Error('date --depuis invalide')
    let listeDecisions
    try { listeDecisions = await decisions(option('base'), depuis) }
    catch (e) { console.log(`✗ ${e.message}`); return 1 }
    const idees = listeDecisions.filter((d) => CLE_IDEE.test(d?.cle_idempotence || '') && d.choix === 'lancer')
      .map(({ id, cle_idempotence, tranchee_le }) => ({ id, cle_idempotence, tranchee_le }))
    const texte = JSON.stringify(idees, null, 2) + '\n'
    if (option('sortie')) fs.writeFileSync(option('sortie'), texte)
    else process.stdout.write(texte)
    return 0
  }
  if (commande === 'deposer') {
    const fiche = verifierFiche(premier, racine)
    if (afficher(fiche)) return 1
    const depuis = new Date(Date.now() - 29 * 86_400_000).toISOString()
    let listeDecisions
    try { listeDecisions = await decisions(option('base'), depuis) }
    catch (e) { console.log(`✗ ${e.message}`); return 1 }
    const decision = listeDecisions.find((d) => d.cle_idempotence === fiche.decision)
    if (decision?.choix !== 'lancer') { console.log('✗ idée non tranchée lancer'); return 1 }
    const cible = path.join(racine, '.orchestre', 'file', `${fiche.id}.md`)
    try { fs.copyFileSync(emplacement(racine, premier), cible, fs.constants.COPYFILE_EXCL) }
    catch (e) { console.log(`✗ dépôt refusé : ${e.code || e.message}`); return 1 }
    console.log(`PASS fiche déposée : ${fiche.id}`)
    return 0
  }
  console.log('✗ commande inconnue')
  return 1
}

principal(executer)
