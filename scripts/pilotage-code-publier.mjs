// Relevé local de l'orchestre ; le dossier source est toujours lu sans modification.
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const argumentsRecus = process.argv.slice(2)
const aSec = argumentsRecus.includes('--a-sec')
const optionDossier = argumentsRecus.find((a) => a.startsWith('--orchestre='))
const dossier = path.resolve(optionDossier ? optionDossier.slice('--orchestre='.length) : '.orchestre')
const court = (valeur, longueur = 200) => String(valeur ?? '').slice(0, longueur)
const lire = (fichier) => { try { return fs.readFileSync(path.join(dossier, fichier), 'utf8') } catch { return null } }
const fichiers = (sousDossier, extension) => {
  try { return fs.readdirSync(path.join(dossier, sousDossier)).filter((nom) => nom.endsWith(extension)).sort() }
  catch { return [] }
}

const enCours = fichiers('en-cours', '.lock').slice(0, 50).map((nom) => {
  const contenu = lire(`en-cours/${nom}`) ?? ''
  return {
    id: court(nom.slice(0, -5)),
    agent: court(contenu.match(/^agent:\s*(.*)$/m)?.[1]),
    depuis: court(contenu.match(/^depuis:\s*(.*)$/m)?.[1]),
  }
})
const derniers = (lire('verdicts.jsonl') ?? '').split(/\r?\n/).filter(Boolean).slice(-5).flatMap((ligne) => {
  try {
    const v = JSON.parse(ligne)
    return [{ id: court(v.id), verdict: court(v.verdict), date: court(v.date), executant: court(v.executant), ligne: court(v.ligne, 160) }]
  } catch { return [] }
})

const digest = lire('digest.md') ?? ''
const lignesDigest = digest.split(/\r?\n/)
const debutAttention = lignesDigest.findIndex((ligne) => /^## Attention \(\d+\)/.test(ligne))
const attention = []
if (debutAttention >= 0) {
  for (const ligne of lignesDigest.slice(debutAttention + 1)) {
    if (/^## /.test(ligne)) break
    const texte = ligne.replace(/^\s*[-*]\s+/, '').trim()
    if (texte && !/rien à décider/i.test(texte)) attention.push(court(texte))
    if (attention.length >= 7) break
  }
}

let prs = null
let prsRaison = 'gh indisponible'
try {
  const resultat = spawnSync('gh', ['pr', 'list', '--state', 'open', '--json', 'number,title,createdAt,isDraft', '--limit', '20'], {
    encoding: 'utf8', timeout: 10_000, maxBuffer: 1024 * 1024,
  })
  if (resultat.status === 0) {
    const liste = JSON.parse(resultat.stdout)
    if (Array.isArray(liste)) {
      prs = liste.slice(0, 20).map((pr) => ({
        numero: Number(pr.number), titre: court(pr.title), depuis: court(pr.createdAt), brouillon: Boolean(pr.isDraft),
      }))
      prsRaison = ''
    }
  }
} catch { /* Un relevé sans gh reste publiable. */ }

const etat = {
  version: 1,
  genere_le: new Date().toISOString(),
  file: fichiers('file', '.md').slice(0, 50).map((nom) => court(nom.slice(0, -3))),
  en_cours: enCours,
  fait: fichiers('fait', '.md').length,
  refusees: fichiers('refuse', '.md').length,
  derniers,
  prs,
  ...(prs === null ? { prs_raison: prsRaison } : {}),
  attention,
}

let json = JSON.stringify(etat)
const listes = [etat.file, etat.en_cours, etat.derniers, ...(etat.prs ? [etat.prs] : []), etat.attention]
while (Buffer.byteLength(json, 'utf8') > 20_000 && listes.some((liste) => liste.length)) {
  const plusLongue = listes.reduce((a, b) => JSON.stringify(a).length >= JSON.stringify(b).length ? a : b)
  plusLongue.pop()
  json = JSON.stringify(etat)
}
if (Buffer.byteLength(json, 'utf8') > 20_000) {
  console.error('échec : relevé trop gros')
  process.exit(1)
}

if (aSec) {
  process.stdout.write(`${json}\n`)
} else {
  for (const ligne of fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8').split(/\r?\n/) : []) {
    const match = ligne.match(/^\s*([A-Z0-9_]+)=(.*)$/)
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base || !cle) {
    console.error('échec : configuration absente')
    process.exitCode = 1
  } else {
    try {
      const reponse = await fetch(`${base.replace(/\/$/, '')}/rest/v1/rpc/pilotage_code_publier`, {
        method: 'POST',
        headers: { apikey: cle, Authorization: `Bearer ${cle}`, 'content-type': 'application/json' },
        body: JSON.stringify({ p_etat: etat }),
      })
      const corps = reponse.ok ? await reponse.json() : null
      if (reponse.ok && corps === 'ok') console.log(`publié (${Buffer.byteLength(json, 'utf8')} octets)`)
      else { console.error(`échec : ${reponse.status}`); process.exitCode = 1 }
    } catch {
      console.error('échec : connexion')
      process.exitCode = 1
    }
  }
}
