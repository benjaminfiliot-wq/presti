#!/usr/bin/env node
// Vérificateur mécanique de la revue hebdomadaire du réseau neuronal (02/11/2026). Règle de Benj : chaque sortie de modèle passe
// un schéma strict (presti/CLAUDE.md, « Règles de travail ») ; la revue du 01/11, rendue par Hermes, annonçait 7 cartes pour un
// fichier Anki de 8 lignes, et rien ne l'a vu (contrôle croisé du chantier 1). Il lit <dossier>/rapport.md et le fichier Anki de
// la revue, et refuse (code 1, chaque motif en clair, jamais la valeur fautive) :
//   - la section d'un des six gestes du brief absente ou vide (plans/011-cadrage-01-11/briefs/revue-hebdo-reseau-neuronal.md,
//     « Les six gestes » ; le banc verifier-revue-e2e.mjs vérifie que les titres cherchés ici sont ceux du brief) ;
//   - un nombre de cartes annoncé (« N cartes », dans la section des cartes Anki et la ligne « Résumé ») différent du nombre de
//     lignes du fichier Anki, ou aucun nombre annoncé ; un erratum (erratum.md du dossier, ou section « Erratum » du rapport)
//     remplace les nombres annoncés ailleurs : on corrige une preuve sans la réécrire ;
//   - un rapport qui ne cite pas le fichier Anki vérifié ;
//   - un fichier Anki absent, hors de 5 à 20 lignes, ou une ligne sans exactement 3 champs non vides séparés par des tabulations ;
//   - une source de carte introuvable : chemin logique du réseau neuronal (vault/…, presti/…, memoire…/…, skills/…) résolu sur le
//     disque sans sortir de sa racine ; « :N » ou « :N-M » exige que la ligne existe ; plusieurs sources se séparent par « ; » ;
//   - une coordonnée, un nom de personne ou un secret dans le rapport, l'erratum ou les cartes : garde commune du réseau neuronal
//     (cerveau/src/garde-contenu.mjs, premierInterdit, importée telle quelle) ; garde introuvable = refus.
//
//   node scripts/verifier-revue-reseau-neuronal.mjs <dossier de preuve> [--anki=<fichier.tsv>] [--racine=<préfixe>=<dossier>]…
//                                                   [--garde=<module>]
//   → 0 conforme · 1 refusée (motifs) · 2 usage (dossier absent)
// Fichier Anki par défaut : <vault>/90 Apprentissages/Anki/anki-<AAAA-MM-JJ>.tsv, la date venant du nom du dossier (revue-AAAA-MM-JJ),
// à défaut du jour (heure de Paris).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'

const DOCS = path.join(os.homedir(), 'Documents')
const PROJETS = path.join(os.homedir(), '.claude', 'projects')
// Préfixes logiques du réseau neuronal et leur dossier sur ce PC (cerveau/src/config.mjs:26-34, relevé le 02/11/2026).
export const RACINES = {
  vault: path.join(DOCS, 'SaaS'),
  memoire: path.join(PROJETS, 'C--Users-benja-Documents-ofm', 'memory'),
  'memoire-presti': path.join(PROJETS, 'C--Users-benja-Documents-presti', 'memory'),
  'memoire-ops': path.join(PROJETS, 'C--Users-benja-Documents-presti-ops', 'memory'),
  presti: path.join(DOCS, 'presti'),
  qg: path.join(DOCS, 'presti-ops', 'QG'),
  references: path.join(DOCS, 'presti-ops', 'references'),
  skills: path.join(DOCS, 'presti', '.claude', 'skills'),
}
export const GARDE = path.join(DOCS, 'cerveau', 'src', 'garde-contenu.mjs')
export const CARTES_MIN = 5
export const CARTES_MAX = 20

// Les six gestes du brief de la revue (« Les six gestes ») : chaque partie doit être trouvée dans un titre de section du rapport
// (titres pliés : sans accents ni majuscules). Le geste 5 a deux parties, « Santé du réseau » et « à revoir » : la revue du 01/11
// en a fait deux sections, c'est permis.
export const GESTES = [
  { numero: 1, titre: 'Ce qui a bougé', parties: [{ libelle: 'ce qui a bougé', re: /ce qui a bouge/ }] },
  { numero: 2, titre: 'Contradictions', parties: [{ libelle: 'contradiction', re: /contradiction/ }] },
  { numero: 3, titre: 'Liens', parties: [{ libelle: 'liens', re: /\bliens?\b/ }] },
  { numero: 4, titre: 'Cartes Anki', parties: [{ libelle: 'Anki', re: /\banki\b/ }] },
  { numero: 5, titre: 'Santé du réseau et « à revoir »', parties: [{ libelle: 'santé du réseau', re: /sante du reseau/ }, { libelle: 'à revoir', re: /\ba revoir\b/ }] },
  // 02/11 (contrôle croisé du chantier 1) : la revue liste aussi les notes d'agent qui attendent la décision de Benj.
  { numero: 6, titre: 'Notes d’agent en attente de Benj', parties: [{ libelle: 'en attente de Benj', re: /en attente de benj/ }] },
]

// Pli pour comparer des titres : sans accents, en minuscules, guillemets et emphase Markdown retirés.
export const plier = (s) => String(s).normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[«»"“”*_`]/g, ' ').replace(/\s+/g, ' ').trim()

// Les sections Markdown (hors blocs de code) : { niveau, titre, ligne, contenu } ; le contenu court jusqu'au titre suivant de
// niveau égal ou supérieur (les sous-sections en font partie).
export function sections(texte) {
  const lignes = String(texte).split(/\r?\n/)
  const titres = []
  let code = false
  lignes.forEach((l, i) => {
    if (/^\s*(```|~~~)/.test(l)) { code = !code; return }
    const m = code ? null : l.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/)
    if (m) titres.push({ niveau: m[1].length, titre: m[2], ligne: i })
  })
  return titres.map((t, k) => {
    const suivant = titres.slice(k + 1).find((u) => u.niveau <= t.niveau)
    return { ...t, contenu: lignes.slice(t.ligne + 1, suivant ? suivant.ligne : lignes.length).join('\n') }
  })
}
const aDuTexte = (contenu) => contenu.split(/\r?\n/).some((l) => l.trim() && !/^\s*#{1,6}\s/.test(l))

// Les nombres de cartes annoncés (« 8 cartes », « **8 cartes** ») ; la borne d'une fourchette (« de 5 à 20 cartes ») n'en est pas un.
export function cartesAnnoncees(texte) {
  const t = String(texte)
  const out = []
  for (const m of t.matchAll(/(?<![\d.,/-])(\d+)(?:[ \t  *_]|&nbsp;)*cartes?(?![\p{L}\p{N}])/giu)) {
    if (/(?:^|\s)à\s*$/u.test(t.slice(Math.max(0, m.index - 3), m.index))) continue
    out.push(Number(m[1]))
  }
  return out
}

// Une source de carte (« vault/x.md », « presti/y.md:12-14 », « vault/z.md#section ») : null si elle mène à un fichier qui existe,
// sinon le motif du refus.
export function verifierSource(source, racines = RACINES) {
  const brut = String(source).trim().replace(/^`+|`+$/g, '')
  let s = brut.replace(/\\/g, '/').replace(/#[^/]*$/, '')
  let debut = null, fin = null
  const l = s.match(/^(.+?):(\d+)(?:-(\d+))?$/)
  if (l) { s = l[1]; debut = Number(l[2]); fin = Number(l[3] || l[2]) }
  let racine = null, rel = null
  const [prefixe, ...reste] = s.split('/')
  if (Object.hasOwn(racines, prefixe) && reste.length) { racine = racines[prefixe]; rel = reste.join('/') }
  else if (path.isAbsolute(s) || /^[A-Za-z]:\//.test(s)) {
    const abs = path.resolve(s)
    for (const r of Object.values(racines)) { const x = path.relative(r, abs); if (x && !x.startsWith('..') && !path.isAbsolute(x)) { racine = r; rel = x; break } }
    if (!racine) return `« ${brut} » : chemin absolu hors des dossiers du réseau neuronal`
  } else return `« ${brut} » : préfixe inconnu (attendu ${Object.keys(racines).map((p) => `${p}/`).join(', ')})`
  const abs = path.resolve(racine, rel)
  const x = path.relative(racine, abs)
  if (!x || x.startsWith('..') || path.isAbsolute(x)) return `« ${brut} » : sort de son dossier`
  let st = null
  try { st = fs.statSync(abs) } catch { return `« ${brut} » : fichier introuvable` }
  if (!st.isFile()) return `« ${brut} » : n'est pas un fichier`
  if (debut !== null) {
    const n = fs.readFileSync(abs, 'utf8').replace(/\r?\n$/, '').split(/\r?\n/).length
    if (debut < 1 || fin < debut || fin > n) return `« ${brut} » : ligne hors du fichier (${n} lignes)`
  }
  return null
}

const dateDuJour = () => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

export async function verifierRevue({ dossier, anki = null, racines = RACINES, garde = GARDE } = {}) {
  const motifs = [], constats = []
  const date = (path.basename(dossier).match(/(\d{4}-\d{2}-\d{2})$/) || [])[1] || dateDuJour()
  const fichierAnki = path.resolve(anki || path.join(racines.vault || RACINES.vault, '90 Apprentissages', 'Anki', `anki-${date}.tsv`))

  let premierInterdit = null
  try {
    ({ premierInterdit } = await import(pathToFileURL(path.resolve(garde)).href))
    if (typeof premierInterdit !== 'function') throw new Error('premierInterdit absent du module')
  } catch (e) {
    premierInterdit = null
    motifs.push(`garde de contenu illisible (${garde}) : impossible de prouver l'absence de coordonnée, de nom de personne et de secret (${e.message})`)
  }
  const garder = (texte, quoi) => { const r = premierInterdit ? premierInterdit(texte, quoi) : null; if (r) motifs.push(r); return !r }

  // ── le rapport ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const fichierRapport = path.join(dossier, 'rapport.md')
  let rapport = null
  try { rapport = fs.readFileSync(fichierRapport, 'utf8') } catch { motifs.push(`rapport.md absent de ${dossier}`) }
  const fichierErratum = path.join(dossier, 'erratum.md')
  const erratumFichier = fs.existsSync(fichierErratum) ? fs.readFileSync(fichierErratum, 'utf8') : ''
  let zoneCartes = '', erratum = erratumFichier
  if (rapport !== null) {
    // le titre du document (un « # » en tête) contient tout le rapport : il ne vaut pour aucun geste
    const tout = sections(rapport)
    const secs = tout.length && tout[0].niveau === 1 ? tout.slice(1) : tout
    const absentes = []
    for (const g of GESTES) {
      for (const p of g.parties) {
        const trouvees = secs.filter((s) => p.re.test(plier(s.titre)))
        if (!trouvees.length) absentes.push(`section manquante — geste ${g.numero} (« ${g.titre} ») : aucun titre de section ne contient « ${p.libelle} »`)
        else if (!trouvees.some((s) => aDuTexte(s.contenu))) absentes.push(`section vide — geste ${g.numero} (« ${g.titre} ») : « ${trouvees[0].titre} » n'a aucun texte`)
      }
    }
    if (absentes.length) motifs.push(...absentes)
    else constats.push('les six gestes du brief ont chacun leur section, non vide')
    const anki4 = secs.filter((s) => GESTES[3].parties.every((p) => p.re.test(plier(s.titre))))
    const resumes = rapport.split(/\r?\n/).filter((l) => plier(l.replace(/^\s*(?:[-*>]\s*)+/, '')).startsWith('resume'))
    zoneCartes = [...anki4.map((s) => s.contenu), ...resumes].join('\n')
    erratum = [erratumFichier, ...secs.filter((s) => /\berratum\b/.test(plier(s.titre))).map((s) => s.contenu)].filter(Boolean).join('\n')
    if (!rapport.includes(path.basename(fichierAnki))) motifs.push(`le rapport ne cite pas le fichier Anki vérifié (${path.basename(fichierAnki)})`)
    if (garder(rapport, 'rapport.md')) constats.push('rapport.md : ni coordonnée, ni nom de personne, ni secret')
  }
  if (erratumFichier) garder(erratumFichier, 'erratum.md')

  // ── le fichier Anki ───────────────────────────────────────────────────────────────────────────────────────────────────────
  let nLignes = null
  let tsv = null
  try { tsv = fs.readFileSync(fichierAnki, 'utf8') } catch { motifs.push(`fichier Anki introuvable : ${fichierAnki}`) }
  if (tsv !== null) {
    const texte = tsv.replace(/^﻿/, '')
    const lignes = texte === '' ? [] : texte.replace(/\r?\n$/, '').split(/\r?\n/)
    nLignes = lignes.length
    if (nLignes < CARTES_MIN || nLignes > CARTES_MAX) motifs.push(`fichier Anki : ${nLignes} ligne(s), attendu de ${CARTES_MIN} à ${CARTES_MAX} cartes`)
    let bonnes = 0, sources = 0
    lignes.forEach((ligne, i) => {
      const n = i + 1
      const champs = ligne.split('\t')
      if (champs.length !== 3) { motifs.push(`carte ${n} : ${champs.length} champ(s) séparé(s) par des tabulations, attendu exactement 3 (question, réponse, source)`); return }
      let ok = true
      for (const [nom, v] of [['question', champs[0]], ['réponse', champs[1]], ['source', champs[2]]]) {
        if (!v.trim()) { motifs.push(`carte ${n} : ${nom} vide`); ok = false; continue }
        if (!garder(v, `carte ${n} (${nom})`)) ok = false
      }
      for (const s of champs[2].split(';').map((x) => x.trim()).filter(Boolean)) {
        const e = verifierSource(s, racines)
        if (e) { motifs.push(`carte ${n} : source ${e}`); ok = false } else sources++
      }
      if (ok) bonnes++
    })
    if (bonnes === nLignes && nLignes) constats.push(`${nLignes} cartes à 3 champs, ${sources} source(s) trouvée(s) sur le disque, rien d'interdit`)
  }

  // ── le nombre de cartes annoncé ───────────────────────────────────────────────────────────────────────────────────────────
  if (rapport !== null) {
    const parErratum = cartesAnnoncees(erratum)
    const annonces = parErratum.length ? parErratum : cartesAnnoncees(zoneCartes)
    const d = parErratum.length ? ' (erratum)' : ''
    if (!annonces.length) motifs.push('aucun nombre de cartes annoncé (« N cartes ») dans la section des cartes Anki, le résumé ou un erratum')
    else if (nLignes !== null) {
      const faux = [...new Set(annonces)].filter((x) => x !== nLignes)
      if (faux.length) motifs.push(`${faux.join(', ')} carte(s) annoncée(s)${d} pour ${nLignes} ligne(s) dans ${path.basename(fichierAnki)} : le nombre se compte sur le fichier, jamais de tête`)
      else constats.push(`${nLignes} cartes annoncées${d}, ${nLignes} lignes dans ${path.basename(fichierAnki)}`)
    }
  }
  return { motifs, constats, anki: fichierAnki, rapport: fichierRapport, nLignes }
}

// ── ligne de commande ───────────────────────────────────────────────────────────────────────────────────────────────────────────
const estPrincipal = (() => {
  try { const a = path.resolve(process.argv[1] || ''), b = fileURLToPath(import.meta.url); return process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b } catch { return false }
})()
if (estPrincipal) {
  const args = process.argv.slice(2)
  const options = (nom) => args.filter((a) => a.startsWith(`--${nom}=`)).map((a) => a.slice(nom.length + 3))
  const dossier = args.find((a) => !a.startsWith('--'))
  if (!dossier) {
    console.error('usage : node scripts/verifier-revue-reseau-neuronal.mjs <dossier de preuve> [--anki=<fichier.tsv>] [--racine=<préfixe>=<dossier>]… [--garde=<module>]')
    process.exit(2)
  }
  const abs = path.resolve(dossier)
  if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) { console.error(`✗ dossier de preuve introuvable : ${abs}`); process.exit(2) }
  const racines = { ...RACINES }
  for (const r of options('racine')) { const i = r.indexOf('='); if (i > 0) racines[r.slice(0, i)] = path.resolve(r.slice(i + 1)) }
  const res = await verifierRevue({ dossier: abs, anki: options('anki')[0] || null, racines, garde: options('garde')[0] || GARDE })
  console.log(`Revue ${path.basename(abs)} — rapport : ${res.rapport} · fichier Anki : ${res.anki}`)
  for (const c of res.constats) console.log(`✓ ${c}`)
  for (const m of res.motifs) console.log(`✗ ${m}`)
  console.log(res.motifs.length ? `REVUE REFUSÉE : ${res.motifs.length} motif(s)` : 'REVUE CONFORME')
  process.exit(res.motifs.length ? 1 : 0)
}
