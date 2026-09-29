#!/usr/bin/env node
// Contrôle du registre des promesses et de la mémoire marketing (fiche 026-205). Complète `contenu-qa --partie=connaissance`,
// qui ne lit pas le registre : ici, une promesse sans drapeau, sans source qui existe, ou dont le texte n'est pas celui de
// lib/crieur/faits.ts, est REFUSÉE ; une formule interdite (CR-2) hors de la liste de contrôle, une donnée personnelle,
// ou une licence CC BY-SA autorisée, aussi. Puis six témoins rouges (mutations en mémoire, rien n'est écrit) prouvent que
// chaque contrôle échoue sur une vraie faute. Code 0 : témoin vert ET tous les témoins rouges attrapés ; 1 sinon.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const RACINE = path.resolve(new URL('../../..', import.meta.url).pathname.replace(/^\/(\w:)/, '$1'))
const DOCS = path.join(RACINE, 'docs/marketing')
const lire = (p) => fs.readFileSync(p, 'utf8')

async function charger() {
  const faitsMod = await import(pathToFileURL(path.join(RACINE, 'lib/crieur/faits.ts')).href)
  const jugeMod = await import(pathToFileURL(path.join(RACINE, 'lib/crieur/juge.ts')).href)
  return { FAITS: faitsMod.FAITS, PHRASE_AIMANT: jugeMod.PHRASE_AIMANT }
}

// ── le registre : lignes « | P-xx | texte | source | date | drapeau | laya | statut | » ────────────────────────────────────
function lireRegistre(texte) {
  return texte.split('\n').filter((l) => /^\|\s*P-\d+\s*\|/.test(l)).map((l) => {
    const c = l.split('|').slice(1, -1).map((s) => s.trim())
    return { id: c[0], texte: c[1], source: c[2], date: c[3], drapeau: c[4], laya: c[5], statut: c[6] }
  })
}

function controlerRegistre(texteRegistre, ctx) {
  const echecs = []
  const lignes = lireRegistre(texteRegistre)
  if (lignes.length === 0) return ['registre vide ou illisible']
  const vus = new Set()
  for (const r of lignes) {
    const nom = r.id
    if (vus.has(nom)) echecs.push(`${nom} : identifiant en double`); vus.add(nom)
    if (!r.texte) echecs.push(`${nom} : texte exact manquant`)
    if (!r.source) echecs.push(`${nom} : source manquante`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.date || '')) echecs.push(`${nom} : date absente ou invalide (« ${r.date} »)`)
    if (!r.drapeau) echecs.push(`${nom} : drapeau requis non renseigné (écrire « aucun » explicitement)`)
    if (!r.laya) echecs.push(`${nom} : verdict Laya non renseigné (non_juge si pas encore rendu)`)
    if (!r.statut) echecs.push(`${nom} : statut manquant`)
    // « laya » : un verdict favorable ne se déclare pas ici sans preuve ; seules ces valeurs sont admises.
    if (r.laya && !/^(non_juge|bloque|passe:0\.\d+)$/.test(r.laya)) echecs.push(`${nom} : verdict Laya « ${r.laya} » hors liste`)
    // La source existe et contient son motif.
    const m = (r.source || '').match(/^([^\s,]+),\s*(.+)$/)
    if (!m) { echecs.push(`${nom} : source mal formée (« ${r.source} »)`); continue }
    const fichier = path.join(RACINE, m[1])
    if (!fs.existsSync(fichier)) { echecs.push(`${nom} : source « ${m[1]} » absente du dépôt`); continue }
    const motif = m[2].replace(/^ligne\s+(\d+)$/i, '| $1 |')
    if (!lire(fichier).includes(motif)) echecs.push(`${nom} : motif « ${m[2]} » introuvable dans ${m[1]}`)
  }
  // Correspondance exacte avec lib/crieur/faits.ts, dans l'ordre.
  const parId = new Map(lignes.map((r) => [r.texte, r]))
  for (const f of ctx.FAITS) {
    const r = parId.get(f.texte)
    if (!r) { echecs.push(`fait « ${f.id} » : texte exact absent du registre`); continue }
    const attendu = f.drapeau || 'aucun'
    if (r.drapeau !== attendu) echecs.push(`${r.id} (${f.id}) : drapeau « ${r.drapeau} » (attendu « ${attendu} »)`)
  }
  const aimant = lignes.find((r) => r.texte === ctx.PHRASE_AIMANT)
  if (!aimant) echecs.push('phrase aimant du juge du Crieur absente du registre')
  else if (aimant.drapeau !== 'aimantSite') echecs.push(`phrase aimant : drapeau « ${aimant.drapeau} » (attendu aimantSite)`)
  // Un drapeau non levé ne peut pas porter le statut « en attente de l'accord » sans le dire : il doit être bloqué.
  const flags = lire(path.join(RACINE, 'lib/flags.ts'))
  for (const r of lignes) {
    if (r.drapeau && r.drapeau !== 'aucun') {
      const leve = new RegExp(`\\b${r.drapeau}:\\s*true\\b`).test(flags)
      if (!leve && !/bloqu/i.test(r.statut)) echecs.push(`${r.id} : drapeau « ${r.drapeau} » non levé mais statut « ${r.statut} »`)
    }
  }
  return echecs
}

// ── formules interdites (CR-2), données personnelles, CC BY-SA ───────────────────────────────────────────────────────
const SIMPLES = [/n°\s?1/i, /\bmeilleur/i, /\bgaranti/i, /premier sur google/i]
const phrases = (t) => t.split(/(?<=[.!?])\s+/)
function sansListeInterdits(texte) { return texte.replace(/<!-- interdits:debut -->[\s\S]*?<!-- interdits:fin -->/g, '') }

function controlerTextes(fichiers) {
  const echecs = []
  for (const [nom, brut] of Object.entries(fichiers)) {
    const t = sansListeInterdits(brut)
    for (const re of SIMPLES) if (re.test(t)) echecs.push(`${nom} : formule interdite ${re} hors de la liste de contrôle`)
    for (const p of phrases(t)) {
      if (/moins d['’ʼ]une minute/i.test(p) && !/prêt|prépar/i.test(p) && !/«[^»]*moins d['’ʼ]une minute/i.test(p)) echecs.push(`${nom} : « moins d'une minute » sans prête/prépare : ${p.slice(0, 60)}`)
      if (/presti répond/i.test(p) && !/studio|signature/i.test(p) && !/«[^»]*presti répond/i.test(p)) echecs.push(`${nom} : « Presti répond » sans Studio/Signature`)
    }
    for (const m of t.matchAll(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi)) if (!/@presti-test\.invalid$/i.test(m[0])) echecs.push(`${nom} : adresse e-mail réelle ${m[0].replace(/^[^@]*/, '***')}`)
    if (/(?:\+33[\s.-]?|\b0)[1-9](?:[\s.-]?\d{2}){4}\b/.test(t)) echecs.push(`${nom} : numéro de téléphone`)
  }
  return echecs
}

function controlerLicences(fichiers) {
  const t = fichiers['docs/marketing/plateformes/README.md'] || ''
  const echecs = []
  if (!/CC BY-SA[^\n]*interdit/i.test(t)) echecs.push('CC BY-SA : interdiction en vidéo absente')
  if (/CC BY-SA[^\n]*(autoris|utilisable|permis)/i.test(t)) echecs.push('CC BY-SA : présentée comme autorisée')
  if (!/mention IA/i.test(t)) echecs.push('mention IA absente')
  return echecs
}

function tousLesMarkdown(dossier, base = dossier, acc = {}) {
  for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
    const p = path.join(dossier, e.name)
    if (e.isDirectory()) tousLesMarkdown(p, base, acc)
    else if (e.name.endsWith('.md')) acc[path.relative(RACINE, p).replace(/\\/g, '/')] = lire(p)
  }
  return acc
}

// ── exécution ────────────────────────────────────────────────────────────────────────────────────────────────────────
const ctx = await charger()
const fichiers = tousLesMarkdown(DOCS)
const registre = fichiers['docs/marketing/offre/registre-promesses.md'] || ''
let code = 0
const rendre = (etat, id, nom, echecs) => {
  console.log(`${echecs.length ? '❌' : '✅'} ${id} — ${nom}${echecs.length ? ' — ' + echecs.join(' | ') : ''}`)
  if (echecs.length) code = 1
}

// Témoin vert : la vraie mémoire.
const reel = controlerRegistre(registre, ctx)
rendre('reel', 'RG-1', 'registre des promesses (texte exact, source, date, drapeau, Laya, statut)', reel)
rendre('reel', 'RG-2', 'aucune formule interdite ni donnée personnelle hors liste de contrôle', controlerTextes(fichiers))
rendre('reel', 'RG-3', 'CC BY-SA interdit en vidéo, mention IA exigée', controlerLicences(fichiers))
console.log(`   ${lireRegistre(registre).length} promesse(s) lue(s), ${ctx.FAITS.length} fait(s) de lib/crieur/faits.ts`)

// Témoins rouges : chaque mutation doit être attrapée, sinon le contrôle est aveugle.
function temoin(nom, muter, controle, motifAttendu) {
  const echecs = controle(muter())
  const attrape = echecs.some((e) => e.includes(motifAttendu))
  console.log(`${attrape ? '✅' : '❌'} témoin rouge — ${nom} : ${attrape ? 'refusé (' + motifAttendu + ')' : 'NON ATTRAPÉ : ' + (echecs.join(' | ') || 'aucun échec')}`)
  if (!attrape) code = 1
}
const ligne1 = (t, f) => t.replace(/^(\| P-01 \|.*)$/m, (l) => f(l))
temoin('drapeau vide', () => ligne1(registre, (l) => l.split('|').map((c, i) => (i === 5 ? '  ' : c)).join('|')), (t) => controlerRegistre(t, ctx), 'drapeau requis non renseigné')
temoin('source absente du dépôt', () => ligne1(registre, (l) => l.replace('plans/promesses.md', 'plans/inexistant.md')), (t) => controlerRegistre(t, ctx), 'absente du dépôt')
temoin('texte reformulé', () => ligne1(registre, (l) => l.replace('est prête', 'est toujours prête')), (t) => controlerRegistre(t, ctx), 'texte exact absent du registre')
temoin('promesse à drapeau baissé présentée comme passante', () => registre.replace('**bloquée** : drapeau absent de lib/flags.ts au 2026-09-29', 'en attente de l\'accord de Benj à la publication'), (t) => controlerRegistre(t, ctx), 'non levé')
temoin('verdict Laya inventé', () => ligne1(registre, (l) => l.replace('non_juge', 'oui')), (t) => controlerRegistre(t, ctx), 'hors liste')
temoin('formule interdite dans la voix', () => ({ ...fichiers, 'docs/marketing/voix/README.md': fichiers['docs/marketing/voix/README.md'] + '\nPresti est le meilleur outil.\n' }), controlerTextes, 'formule interdite')
temoin('e-mail réel dans la mémoire', () => ({ ...fichiers, 'docs/marketing/audience/README.md': fichiers['docs/marketing/audience/README.md'] + '\njean.dupont@exemple.fr\n' }), controlerTextes, 'adresse e-mail réelle')
temoin('CC BY-SA autorisée', () => ({ ...fichiers, 'docs/marketing/plateformes/README.md': fichiers['docs/marketing/plateformes/README.md'].replace(/CC BY-SA : interdit/i, 'CC BY-SA : utilisable') }), controlerLicences, 'CC BY-SA')

console.log(`controle-registre : ${code === 0 ? 'PASS' : 'FAIL'}`)
process.exitCode = code
