#!/usr/bin/env node
// reprise-cloud/outils/nettoyer.mjs — caviarde puis scanne les copies de reprise-cloud/ (29/09/2026).
//   node reprise-cloud/outils/nettoyer.mjs --caviarder   réécrit sur place : e-mails de personnes, téléphones, SIREN de tiers
//   node reprise-cloud/outils/nettoyer.mjs --scan        ne modifie rien ; code 1 s'il reste un secret ou une donnée de personne
// Un secret n'est JAMAIS caviardé en silence : le scan le signale (code 1) et on retire la ligne à la main avant de commiter.
// Les fausses clés de test portent « sentinelle », « temoin », « essai », « factice » ou « exemple » : elles sont admises.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOSSIERS = ['memoire', 'docs', 'usine', 'veille', 'outils']
const TEXTE = /\.(md|txt|sh|mjs|js|cjs|json|yaml|yml|toml|rules|ps1|conf|service|tmpl|example|env|cfg)$|(^|\/)[^./]+$/i
// Adresses admises : rôles de l'entreprise, attribution Claude, remote git, domaines réservés (.invalid, .test, .local…), références de plugin « nom@ecc ».
const ADMIS_MAIL = /^(contact@prestiapp\.fr|noreply@anthropic\.com|no-?reply@[\w.-]+|git@github\.com|\w+@ecc(\.\w+)*|[\w.+-]+@([\w-]+\.)*(example|invalid|test|localhost|local)|[\w.+-]+@example\.(com|org|net|fr))$/i
const SIREN_DE_BENJ = '109 411 348'
const MOT_FAUX = /sentinelle|temoin|témoin|essai|factice|exemple|example|xxxx|placeholder|<[^>]*>|\.\.\.|…|\*\*\*|fictif|fake|dummy/i

const MAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g
const TEL = /(?<![\w.-])(?:\+33[\s.]?|0033[\s.]?|0)[1-9](?:[\s.-]?\d{2}){4}(?![\w-])/g
const CONTEXTE_SIREN = /siren|siret|\brcs\b|immatricul|kbis/i
const SIREN = /(?<!\d)\d{3}[  ]\d{3}[  ]\d{3}(?:[  ]\d{5})?(?!\d)/g

// Un mot de passe écrit en toutes lettres à côté du mot « mot de passe » : majuscule, minuscule et chiffre ou symbole, 8 caractères au moins.
const MDP_LITTERAL = /(?:mot de passe|password|passwd|mdp|pwd)[^\n]{0,60}?[`'"«]([^\s`'"»<>]{8,})[`'"»]/i
const FORT = (s) => /[A-Z]/.test(s) && /[a-z]/.test(s) && /[\d!@#$%^&*]/.test(s)

// Secrets : chaque motif signale ; le contexte « faux » les admet.
const SECRETS = [
  ['sk-…', /\bsk-[A-Za-z0-9_-]{20,}/],
  ['ghp/gho/github_pat', /\b(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}/],
  ['AIza…', /\bAIza[0-9A-Za-z_-]{30,}/],
  ['JWT', /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/],
  ['Resend re_…', /\bre_[A-Za-z0-9]{20,}/],
  ['whsec_/sk_live/rk_live', /\b(?:whsec|sk_live|rk_live|pk_live)_[A-Za-z0-9]{10,}/],
  ['Slack xox', /\bxox[baprs]-[A-Za-z0-9-]{10,}/],
  ['AWS AKIA', /\bAKIA[0-9A-Z]{16}\b/],
  ['clé privée', /BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]{20,}/],
  ['URL avec mot de passe', /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp):\/\/[^:\s/@]+:[^@\s]{6,}@/i],
  ['mot de passe / jeton affecté', /\b(?:password|passwd|mot de passe|api[_-]?key|secret|token|jeton)\s*[:=]\s*['"]?[A-Za-z0-9/+_=-]{24,}/i],
]

function* fichiers(dir) {
  if (!fs.existsSync(dir)) return
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) yield* fichiers(p)
    else if (TEXTE.test(p.replace(/\\/g, '/'))) yield p
  }
}

// Les fichiers écrits à la main à la racine du dossier (LISEZ-MOI…, LIMITES…) sont scannés aussi.
function* fichiersRacine() {
  for (const e of fs.readdirSync(RACINE, { withFileTypes: true })) if (e.isFile() && /\.(md|sh|json)$/.test(e.name)) yield path.join(RACINE, e.name)
}
const mode = process.argv.includes('--caviarder') ? 'caviarder' : 'scan'
const bilan = { mails: 0, tels: 0, sirens: 0, fichiers: 0 }
const problemes = []
const avertissements = []
const estLeSien = (m) => m.replace(/ /g, ' ').startsWith(SIREN_DE_BENJ)

const tous = [...DOSSIERS.flatMap((d) => [...fichiers(path.join(RACINE, d))]), ...fichiersRacine()]
for (const f of tous) {
  const t = fs.readFileSync(f, 'utf8')
  const rel = path.relative(RACINE, f).replace(/\\/g, '/')
  if (rel === 'outils/nettoyer.mjs') continue
  if (mode === 'caviarder') {
    const nouveau = t.split('\n').map((l) => {
      let x = l.replace(MAIL, (m) => (ADMIS_MAIL.test(m) ? m : (bilan.mails++, '<e-mail caviardé>')))
      x = x.replace(TEL, () => (bilan.tels++, '<téléphone caviardé>'))
      if (CONTEXTE_SIREN.test(x)) x = x.replace(SIREN, (m) => (estLeSien(m) ? m : (bilan.sirens++, '<SIREN caviardé>')))
      return x
    }).join('\n')
    if (nouveau !== t) { fs.writeFileSync(f, nouveau); bilan.fichiers++ }
    continue
  }
  t.split('\n').forEach((l, i) => {
    const ou = `${rel}:${i + 1}`
    for (const m of l.match(MAIL) || []) if (!ADMIS_MAIL.test(m)) problemes.push(`${ou} e-mail de personne : ${m.replace(/^(.{2}).*(@.*)$/, '$1…$2')}`)
    TEL.lastIndex = 0
    if (TEL.test(l)) problemes.push(`${ou} numéro de téléphone`)
    TEL.lastIndex = 0
    if (CONTEXTE_SIREN.test(l)) for (const m of l.match(SIREN) || []) if (!estLeSien(m)) problemes.push(`${ou} SIREN/SIRET d'un tiers`)
    for (const [nom, re] of SECRETS) {
      const s = re.exec(l)
      if (s && !MOT_FAUX.test(l)) problemes.push(`${ou} SECRET possible (${nom}) : ${s[0].slice(0, 8)}…`)
    }
    const mdp = MDP_LITTERAL.exec(l)
    if (mdp && FORT(mdp[1]) && !MOT_FAUX.test(l)) problemes.push(`${ou} MOT DE PASSE possible écrit en clair : ${mdp[1].slice(0, 3)}…`)
    if (/https?:\/\/(?:www\.|m\.)?(?:facebook|instagram|linkedin|tiktok)\.com\/(?!ID\b|groups\/?$|help|business|policies|legal|login|ads\/library|developers)[A-Za-z0-9._/-]{4,}/i.test(l)) {
      avertissements.push(`${ou} lien de profil social (à relire : Presti ou un tiers ?) : ${l.match(/https?:\/\/[^\s)>\]"'`]+/)?.[0]?.slice(0, 80)}`)
    }
  })
}

if (mode === 'caviarder') {
  console.log(`caviardé : ${bilan.mails} e-mail(s), ${bilan.tels} téléphone(s), ${bilan.sirens} SIREN dans ${bilan.fichiers} fichier(s)`)
} else {
  for (const p of problemes.slice(0, 80)) console.log('✗ ' + p)
  if (problemes.length > 80) console.log(`… et ${problemes.length - 80} autre(s)`)
  for (const a of avertissements.slice(0, 40)) console.log('⚠ ' + a)
  console.log(problemes.length ? `\n✗ ${problemes.length} problème(s) : NE PAS COMMITER avant de les avoir retirés.` : `✓ aucun secret ni donnée de personne détecté (${avertissements.length} lien(s) de profil à relire)`)
  process.exitCode = problemes.length ? 1 : 0
}
