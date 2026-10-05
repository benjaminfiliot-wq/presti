// scripts/usine/garde-prospects.mjs — la garde « donnée de prospect » des exécutants libres (Hermes, OpenClaw, AtomicAgent).
//
// RÈGLE DE BENJ (non négociable) : une donnée de prospect ne part JAMAIS vers une IA gratuite ni un modèle :cloud. Hermes et
// OpenClaw ont l'un et l'autre pour modèle par défaut un modèle :cloud (Ollama Cloud) et un repli freellmapi : leur tache.sh
// appelle ce module AVANT tout envoi, du côté PC comme du côté usine, et refuse (code 4) si la consigne en parle.
//
// Le bloc ci-dessous (ADRESSE_EMAIL … motifProspects) est la COPIE OCTET POUR OCTET de scripts/usine.mjs (lignes 999-1022 au
// 04/10/2026), où il garde les relais de Codex : usine.mjs est copié seul sur l'usine et ne s'importe pas, donc la logique est
// dupliquée ici. `node scripts/usine/garde-prospects.mjs --parite` compare les deux blocs : rouge dès qu'ils divergent.
//
// Usage :
//   node garde-prospects.mjs <consigne.md>      code 0 : rien de détecté ; code 4 : donnée de prospect (le NOM du motif est écrit,
//                                               jamais le texte qui l'a déclenché) ; code 2 : usage ou fichier illisible
//   node garde-prospects.mjs --parite [usine.mjs]   code 0 : blocs identiques ; code 1 : divergence
// Prudente exprès : un faux positif coûte un refus, un faux négatif enverrait un SIREN ou un téléphone chez un fournisseur gratuit.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ── début du bloc copié de scripts/usine.mjs ─────────────────────────────────────────────────────────────────────
const ADRESSE_EMAIL = /[\p{L}\p{N}._%+-]+@(?:[\p{L}\p{N}-]+\.)+\p{L}{2,}/gu
const adresseSansPersonne = (a) => {
  const i = a.lastIndexOf('@')
  const boite = a.slice(0, i).replace(/^[._%+-]+/, '')
  const domaine = a.slice(i + 1).toLowerCase()
  return /(?:^|\.)(?:prestiapp\.fr|example\.(?:com|net|org)|invalid|test|example|localhost)$/.test(domaine) ||
    /^(?:no-?reply|ne-?pas-?repondre|git|mailer-daemon|postmaster)$/i.test(boite) || /^\d+x\.(?:png|jpe?g|webp|gif|svg|avif)$/.test(domaine)
}
const adressesDePersonnes = (texte) => [...String(texte).matchAll(ADRESSE_EMAIL)].map((m) => m[0]).filter((a) => !adresseSansPersonne(a))
const MOTIFS_PROSPECTS = [
  { nom: 'en-tête donnees: prospects', re: /^donn[ée]es\s*:[^\n]*prospect/im },
  { nom: 'prospect / prospection', re: /prospect/i },
  { nom: 'SIREN / SIRET / Sirene', re: /\bsir[eè]n(?:e|s)?\b|\bsirets?\b/i },
  { nom: 'démarchage (liste de démarchage)', re: /d[ée]marchage/i },
  { nom: 'téléphone de personnes', re: /num[ée]ros?\s+(?:de\s+)?t[ée]l[ée]phone|t[ée]l[ée]phones?\s+(?:des|du|de\s+la|de\s+l['’]|d['’]|personnels?|portables?)\s*(?:la\s+|l['’]\s*|un\s+|une\s+)?(?:personnes?|g[ée]rants?|artisans?|clients?|contacts?|dirigeants?|prospects?|particuliers?|patrons?|entreprises?|soci[ée]t[ée]s?)/i },
  { nom: 'numéro de téléphone', re: /(?:\+33[\s.]?|\b0)[1-9](?:[\s.-]?\d{2}){4}\b/ },
  { nom: 'numéro de téléphone international (+33 / 0033)', re: /(?:\+|00)33[\s.]?(?:\(0\)[\s.]?)?[1-9](?:[\s.-]?\d{2}){4}/ },
  { nom: 'e-mail d’une personne', re: { test: (t) => adressesDePersonnes(t).length > 0 } },
]
// Le NOM d'un script ou d'un module de code (scripts/prospection-sql-qa.mjs) ne désigne aucune donnée de prospect : 026-091 (mutations
// des juges) est restée bloquée sur la voie libre par ce seul nom dans son périmètre (29/09/2026). Seuls les fichiers de CODE
// (.mjs .cjs .js .ts .tsx .sh .ps1) sont retirés avant l'analyse ; un .md, .json, .sql ou un dossier de données (prospection/) compte toujours.
const NOM_DE_CODE = /[\p{L}\p{N}_@.\/-]*\.(?:mjs|cjs|js|ts|tsx|sh|ps1)\b/gu
const motifProspects = (texte) => { const t = String(texte).replace(NOM_DE_CODE, ' '); return MOTIFS_PROSPECTS.find((m) => m.re.test(t))?.nom || null }

// ── fin du bloc copié ────────────────────────────────────────────────────────────────────────────────────────────
export { motifProspects, adressesDePersonnes }

const ICI = path.dirname(fileURLToPath(import.meta.url))
// Le bloc, tel qu'il est écrit entre les deux repères de ce fichier (pour la comparaison avec usine.mjs).
export function blocLocal(texte = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8')) {
  const a = texte.indexOf('const ADRESSE_EMAIL')
  const b = texte.indexOf('\n// ── fin du bloc copié')
  return texte.slice(a, b).trim()
}
export function blocUsine(texte) {
  const a = texte.indexOf('const ADRESSE_EMAIL')
  const f = texte.indexOf('const motifProspects')
  const b = texte.indexOf('\n', f)
  return a >= 0 && f > a ? texte.slice(a, b).trim() : ''
}

const estPrincipal = !!process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (estPrincipal) {
  const [a1, a2] = process.argv.slice(2)
  if (a1 === '--parite') {
    const cible = path.resolve(a2 || path.join(ICI, '..', 'usine.mjs'))
    let u = ''
    let lisible = true
    try { u = blocUsine(fs.readFileSync(cible, 'utf8')) } catch (e) { console.error(`✗ ${cible} illisible : ${e.message}`); lisible = false; process.exitCode = 2 }
    if (lisible) {
      const l = blocLocal()
      if (u && u === l) console.log(`✓ parité : le bloc de garde est identique à celui de ${path.basename(cible)} (${l.split('\n').length} lignes)`)
      else { console.error(`✗ parité : le bloc de garde diverge de ${path.basename(cible)} — recopier les lignes de ADRESSE_EMAIL à motifProspects`); process.exitCode = 1 }
    }
  } else if (!a1 || a1.startsWith('--')) {
    console.error('usage : garde-prospects.mjs <consigne.md> | --parite [usine.mjs]')
    process.exitCode = 2
  } else {
    let texte = null
    try { texte = fs.readFileSync(a1, 'utf8') } catch (e) { console.error(`✗ consigne illisible : ${e.message}`) }
    if (texte === null) process.exitCode = 2
    else {
      const m = motifProspects(texte)
      if (m) { console.error(`REFUS : donnée de prospect détectée (motif « ${m} ») — la tâche n'est envoyée à aucun modèle`); process.exitCode = 4 }
      else console.log('garde-prospects : rien de détecté')
    }
  }
}
