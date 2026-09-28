#!/usr/bin/env node
// TÉMOIN de la fiche 026-234 (écrit par Claude Code) : scripts/savoir/lecons.mjs au contrat de savoir-lecons-qa.mjs.
// Le vrai script est la fiche 026-235 ; celui-ci prouve que le contrat est réalisable. Aucun modèle, aucune commande git.
//
//   candidats [--bus] [--base=<url>] [--racine=<dépôt>] [--saas=<coffre>] [--travail=<dossier>]
//   lister [--statut=candidate|validee|rejetee] [--racine=] [--travail=]
//   valider <id> --par=<claude-code|revue-AAAA-SS> --regle=<texte> --domaines=<a,b> [--racine=] [--travail=] [--saas=]
//   rejeter <id> --par=<claude-code|revue-AAAA-SS> --raison=<texte> [--racine=] [--travail=] [--saas=]
//   verifier-source <id> [--racine=] [--travail=] [--saas=]
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { chercherSecrets } from '../instantane-quotidien.mjs'
import { appeler, baseSure } from '../chef/commun.mjs'

const RACINE_SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const DOMAINES = ['orchestre', 'juges', 'usine', 'prospection', 'redaction', 'site', 'argent', 'securite', 'donnees', 'modeles', 'publication', 'general']
const TYPE_DE_VERDICT = { FAIL: 'echec', 'EXPIRÉE': 'echec', 'DISJONCTÉE': 'echec', 'REFUSÉE': 'refus' }
const DOMAINES_PROPOSES = { echec: ['juges'], refus: ['orchestre'], decision: ['general'], correction: ['orchestre'] }
const VERDICTS_REVUE = ['valider', 'rejeter', 'revoir']
const RE_ID = /^L-\d{4}-\d{2}-\d{2}-[a-p]{12}$/
const RE_PAR = /^(?:claude-code|revue-(\d{4})-(\d{2}))$/
const RE_CRITERE = /\b[A-Z]{1,4}-[A-Z]{0,2}\d{1,3}\b/
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const RE_COORDONNEES = [/[\w.+-]+@[\w-]+\.[\w.-]+/g, /(?:\+33[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}\b/g, /\b\d{3}[\s.]?\d{3}[\s.]?\d{3}\b/g]
const RE_LIEN = /\bhttps?:|\bwww\./i
const JOURNAL = 'SaaS/Decisions/Journal-Decisions.md'
const ENTETE_REVUE = ['Leçon', 'Type', 'Source', 'Verdict', 'Règle proposée', 'Domaines']

// ── arguments ─────────────────────────────────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const option = (nom) => { const a = args.find((x) => x.startsWith(`--${nom}=`)); return a === undefined ? null : a.slice(nom.length + 3) }
const drapeau = (nom) => args.includes(`--${nom}`)
const positionnels = args.filter((a) => !a.startsWith('--'))
const RACINE = path.resolve(option('racine') || RACINE_SCRIPT)
const SAAS = path.resolve(option('saas') || path.join(RACINE, '..', 'SaaS'))
const TRAVAIL = path.resolve(option('travail') || path.join(RACINE, '.orchestre', 'travail', 'savoir', 'lecons'))
const CANDIDATES = path.join(TRAVAIL, 'candidates')
const REJETEES = path.join(TRAVAIL, 'rejetees')
const VALIDEES = path.join(RACINE, 'docs', 'savoir', 'lecons')
const CURSEUR = path.join(TRAVAIL, 'curseur.json')

// ── petites mains ─────────────────────────────────────────────────────────────────────────────────────────────────
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')
const signes = (s) => [...s].length
const aujourdhui = () => new Date().toISOString().slice(0, 10)
function lignesDe(fichier) { try { return fs.readFileSync(fichier, 'utf8').split('\n').map((l) => l.replace(/\r$/, '')) } catch { return null } }
function ecrireAtomique(fichier, contenu) { fs.mkdirSync(path.dirname(fichier), { recursive: true }); fs.writeFileSync(`${fichier}.part`, contenu); fs.renameSync(`${fichier}.part`, fichier) }
/** L-<date du fait>-<12 lettres> : les 48 premiers bits du SHA-256 de la source (`<chemin>:<ligne>` ou `bus:decision:<uuid>`). */
function idDe(date, source) {
  const h = sha(source).slice(0, 12)
  return `L-${date}-${[...h].map((c) => String.fromCharCode(97 + parseInt(c, 16))).join('')}`
}
function caviarder(texte) {
  return texte.replace(RE_COORDONNEES[0], '[adresse]').replace(RE_COORDONNEES[1], '[numéro]').replace(RE_COORDONNEES[2], '[siren]')
}
const aCoordonnee = (t) => RE_COORDONNEES.some((re) => { re.lastIndex = 0; const r = re.test(t); re.lastIndex = 0; return r })
const estPropre = (t) => !aCoordonnee(t) && !chercherSecrets(t).length && !/\bsk-[A-Za-z0-9_-]{6,}/.test(t) && !RE_LIEN.test(t)
function constatDe(texte) {
  const t = caviarder(texte).replace(/\s+/g, ' ').trim()
  return signes(t) > 400 ? [...t].slice(0, 399).join('').trimEnd() + '…' : t
}
function dateValide(a, m, j) { const d = new Date(Date.UTC(a, m - 1, j)); return d.getUTCFullYear() === a && d.getUTCMonth() === m - 1 && d.getUTCDate() === j }
const pad = (n) => String(n).padStart(2, '0')
function dateDe(texte) {
  const c = []
  const a = /\b(\d{4})-(\d{2})-(\d{2})\b/.exec(texte)
  if (a && dateValide(+a[1], +a[2], +a[3])) c.push({ i: a.index, d: `${a[1]}-${a[2]}-${a[3]}` })
  const b = /\b(\d{2})\/(\d{2})\/(\d{4})\b/.exec(texte)
  if (b && dateValide(+b[3], +b[2], +b[1])) c.push({ i: b.index, d: `${b[3]}-${b[2]}-${b[1]}` })
  c.sort((x, y) => x.i - y.i)
  return c[0]?.d || null
}
/** « Correction du JJ/MM » sans année : la date passée la plus récente de ce jour et de ce mois. */
function datePassee(j, m) {
  const auj = aujourdhui()
  let a = Number(auj.slice(0, 4))
  if (`${a}-${pad(m)}-${pad(j)}` > auj) a--
  return `${a}-${pad(m)}-${pad(j)}`
}

// ── les faits ─────────────────────────────────────────────────────────────────────────────────────────────────────
function faitsDesFichiers() {
  const faits = []
  const secrets = []
  let illisibles = 0
  const ajouter = (f, brut) => { if (chercherSecrets(brut).length || /\bsk-[A-Za-z0-9_-]{6,}/.test(brut)) secrets.push(f.source); else faits.push(f) }
  // 1. verdicts en échec
  const v = lignesDe(path.join(RACINE, '.orchestre', 'verdicts.jsonl')) || []
  v.forEach((texte, i) => {
    if (!texte.trim()) return
    let o
    try { o = JSON.parse(texte) } catch { illisibles++; return }
    const type = TYPE_DE_VERDICT[o?.verdict]
    if (!type) return
    const date = String(o.date || '').slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || typeof o.id !== 'string') { illisibles++; return }
    const source = `.orchestre/verdicts.jsonl:${i + 1}`
    const critere = RE_CRITERE.exec(String(o.ligne || ''))?.[0]
    ajouter({ cle: `v\n${texte}`, source, texte, type, date, fiche: o.id, ...(critere ? { critere } : {}), constat: constatDe(`${o.verdict} de ${o.id} : ${o.ligne || ''}`) }, texte)
  })
  // 2. décisions datées de .orchestre/decisions.md
  const d = lignesDe(path.join(RACINE, '.orchestre', 'decisions.md')) || []
  d.forEach((texte, i) => {
    const date = texte.trim() ? dateDe(texte) : null
    if (!date) return
    const propre = texte.replace(/^\s*[-|]\s*/, '').replace(/\s*\|\s*$/, '').replace(/\s*\|\s*/g, ' — ').replace(/\*\*/g, '')
    ajouter({ cle: `d\n${texte}`, source: `.orchestre/decisions.md:${i + 1}`, texte, type: 'decision', date, constat: constatDe(propre) }, texte)
  })
  // 3. sections datées du journal des décisions (coffre SaaS)
  const j = lignesDe(path.join(SAAS, 'Decisions', 'Journal-Decisions.md')) || []
  j.forEach((texte, i) => {
    const m = /^## (\d{4})-(\d{2})-(\d{2})\b/.exec(texte)
    if (!m || !dateValide(+m[1], +m[2], +m[3])) return
    const corps = []
    for (const l of j.slice(i + 1)) { if (/^## /.test(l)) break; if (l.trim()) corps.push(l.trim()) }
    const brut = [texte, ...corps].join('\n')
    ajouter({ cle: `j\n${texte}`, source: `${JOURNAL}:${i + 1}`, texte, type: 'decision', date: `${m[1]}-${m[2]}-${m[3]}`, constat: constatDe(`${texte.replace(/^##\s+/, '')} — ${corps.join(' ').replace(/\*\*/g, '')}`) }, brut)
  })
  // 4. corrections des fiches 026 (brouillons d'abord : une même correction dans fait/ ne compte qu'une fois)
  const vues = new Set()
  for (const dossier of ['.orchestre/brouillons-ecosysteme/026', '.orchestre/fait']) {
    let noms = []
    try { noms = fs.readdirSync(path.join(RACINE, dossier)).filter((n) => /^026-\d{3}\.md$/.test(n)).sort() } catch { continue }
    for (const nom of noms) {
      const lignes = lignesDe(path.join(RACINE, dossier, nom)) || []
      let titre = null
      let date = null
      lignes.forEach((texte, i) => {
        if (/^## /.test(texte)) {
          const m = /^## Correction du (\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/.exec(texte)
          titre = m ? texte : null
          date = m ? (m[3] ? `${m[3]}-${pad(m[2])}-${pad(m[1])}` : datePassee(+m[1], +m[2])) : null
          return
        }
        if (!titre || !/^### /.test(texte)) return
        const cle = `c\n${nom.slice(0, 7)}\n${titre}\n${texte}`
        if (vues.has(cle)) return
        vues.add(cle)
        const corps = []
        for (const l of lignes.slice(i + 1)) { if (/^##/.test(l)) break; if (l.trim()) corps.push(l.trim()) }
        const brut = [texte, ...corps].join('\n')
        ajouter({ cle, source: `${dossier}/${nom}:${i + 1}`, texte, type: 'correction', date, fiche: nom.slice(0, 7), constat: constatDe(`${texte.replace(/^###\s+/, '')} — ${corps.join(' ').replace(/\*\*/g, '')}`) }, brut)
      })
    }
  }
  return { faits, secrets, illisibles }
}

// ── candidates, curseur, validées ─────────────────────────────────────────────────────────────────────────────────
function valeurYaml(v) {
  const t = v.trim()
  if (t.startsWith('[') && t.endsWith(']')) return t.slice(1, -1).split(',').map((x) => x.trim()).filter(Boolean)
  return t
}
function lireFiche(fichier) {
  const l = lignesDe(fichier)
  if (!l || l[0] !== '---') return null
  const fin = l.indexOf('---', 1)
  if (fin < 0) return null
  const entete = {}
  for (const x of l.slice(1, fin)) { const m = /^([a-z_]+):\s?(.*)$/.exec(x); if (m) entete[m[1]] = valeurYaml(m[2]) }
  return { entete, corps: l.slice(fin + 1).join('\n').trim() }
}
function lireDossier(dossier) {
  const m = new Map()
  let noms = []
  try { noms = fs.readdirSync(dossier).filter((n) => n.endsWith('.md')) } catch { return m }
  for (const n of noms) { const f = lireFiche(path.join(dossier, n)); if (f && RE_ID.test(String(f.entete.id))) m.set(f.entete.id, { ...f, fichier: path.join(dossier, n) }) }
  return m
}
function texteFiche(e, corps) {
  const l = ['---', `id: ${e.id}`, `type: ${e.type}`, `date: ${e.date}`, `source: ${e.source}`]
  if (e.fiche) l.push(`fiche: ${e.fiche}`)
  if (e.critere) l.push(`critere: ${e.critere}`)
  l.push(`domaines: [${e.domaines.join(', ')}]`, `statut: ${e.statut}`)
  for (const k of ['valide_par', 'valide_le', 'rejete_par', 'rejete_le', 'raison']) if (e[k]) l.push(`${k}: ${e[k]}`)
  return `${l.join('\n')}\n---\n\n${corps}\n`
}
function ecrireCandidate(f, id) {
  const e = { id, type: f.type, date: f.date, source: f.source, fiche: f.fiche, critere: f.critere, domaines: DOMAINES_PROPOSES[f.type], statut: 'candidate' }
  ecrireAtomique(path.join(CANDIDATES, `${id}.md`), texteFiche(e, f.constat))
}
function lireCurseur() {
  try {
    const c = JSON.parse(fs.readFileSync(CURSEUR, 'utf8'))
    return { version: 1, vus: c.vus && typeof c.vus === 'object' ? c.vus : {}, bus: { depuis: c.bus?.depuis || null, vus: Array.isArray(c.bus?.vus) ? c.bus.vus : [] } }
  } catch { return { version: 1, vus: {}, bus: { depuis: null, vus: [] } } }
}
function rejeteesParRevue() {
  const ids = new Set()
  let noms = []
  try { noms = fs.readdirSync(path.join(RACINE, 'docs', 'revues')).filter((n) => /-lecons\.md$/.test(n)) } catch { return ids }
  for (const n of noms) for (const r of lignesTableau(lignesDe(path.join(RACINE, 'docs', 'revues', n)) || []).rangees) if (r.cellules[3] === 'rejeter') ids.add(r.cellules[0])
  return ids
}

// ── les sources, résolues ─────────────────────────────────────────────────────────────────────────────────────────
function resoudre(e) {
  const source = String(e.source || '')
  if (source.startsWith('bus:decision:')) {
    const uuid = source.slice('bus:decision:'.length)
    if (!RE_UUID.test(uuid)) return 'uuid illisible'
    if (!lireCurseur().bus.vus.includes(uuid)) return "décision du bus jamais lue par candidats --bus"
    return idDe(e.date, source) === e.id ? null : 'identifiant différent de celui de la source'
  }
  const m = /^(.+):(\d+)$/.exec(source)
  if (!m) return 'source illisible'
  const chemin = m[1]
  if (chemin.split('/').includes('..') || path.isAbsolute(chemin)) return 'chemin refusé'
  const abs = chemin.startsWith('SaaS/') ? path.join(SAAS, chemin.slice(5)) : path.join(RACINE, chemin)
  const lignes = lignesDe(abs)
  if (!lignes) return 'fichier introuvable'
  const n = Number(m[2])
  const texte = lignes[n - 1]
  if (n < 1 || texte === undefined) return 'ligne introuvable'
  if (idDe(e.date, source) !== e.id) return 'identifiant différent de celui de la source'
  if (e.type === 'echec' || e.type === 'refus') {
    if (chemin !== '.orchestre/verdicts.jsonl') return 'un échec vient de .orchestre/verdicts.jsonl'
    let o
    try { o = JSON.parse(texte) } catch { return 'ligne de verdict illisible' }
    if (TYPE_DE_VERDICT[o.verdict] !== e.type) return `verdict ${o.verdict} : pas un ${e.type}`
    if (o.id !== e.fiche) return "l'id de la ligne n'est pas la fiche"
    return null
  }
  if (e.type === 'decision') {
    if (chemin === '.orchestre/decisions.md') return dateDe(texte) === e.date ? null : 'ligne sans cette date'
    if (chemin === JOURNAL) return texte.startsWith(`## ${e.date}`) ? null : "pas l'en-tête daté d'une section"
    return "une décision vient de decisions.md ou du journal"
  }
  if (e.type === 'correction') {
    if (!/^\.orchestre\/(brouillons-ecosysteme\/026|fait)\/026-\d{3}\.md$/.test(chemin)) return "une correction vient d'une fiche 026"
    if (!texte.startsWith('### ')) return "la ligne n'est pas un ###"
    for (let i = n - 2; i >= 0; i--) if (/^## /.test(lignes[i])) return /^## Correction du /.test(lignes[i]) ? null : "le ### n'est pas sous un « ## Correction du »"
    return "le ### n'est sous aucune section"
  }
  return 'type inconnu'
}

// ── le document de la revue (docs/revues/AAAA-SS-lecons.md) ───────────────────────────────────────────────────────
const cellules = (l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((s) => s.trim())
function lignesTableau(lignes) {
  const i = lignes.findIndex((l) => l.trim().startsWith('|') && cellules(l).join('|') === ENTETE_REVUE.join('|'))
  if (i < 0) return { entete: -1, rangees: [] }
  const rangees = []
  for (let k = i + 2; k < lignes.length && lignes[k].trim().startsWith('|'); k++) rangees.push({ n: k + 1, cellules: cellules(lignes[k]) })
  return { entete: i, rangees }
}
function jugerDocument(lignes) {
  const f = []
  const connus = new Map([...lireDossier(CANDIDATES), ...lireDossier(REJETEES), ...lireDossier(VALIDEES)].map(([id, x]) => [id, x.entete]))
  if (!lignes.some((l) => /^# \S/.test(l))) f.push('ligne 1 : titre absent')
  const t = lignesTableau(lignes)
  if (t.entete < 0) return [...f, 'tableau des leçons absent']
  if (!/^\|(\s*:?-{3,}:?\s*\|){6}\s*$/.test(lignes[t.entete + 1]?.trim() || '')) f.push(`ligne ${t.entete + 2} : séparateur du tableau attendu`)
  if (t.rangees.length > 20) f.push(`ligne ${t.rangees[20].n} : plus de 20 lignes`)
  for (const r of t.rangees) {
    const [id, type, source, verdict, regle, domaines] = r.cellules
    if (r.cellules.length !== 6) { f.push(`ligne ${r.n} : six colonnes attendues`); continue }
    const c = connus.get(id)
    if (!RE_ID.test(id) || !c) f.push(`ligne ${r.n} : leçon inconnue`)
    else {
      if (c.type !== type) f.push(`ligne ${r.n} : type différent de la candidate`)
      if (c.source !== source) f.push(`ligne ${r.n} : source différente de la candidate`)
    }
    if (!VERDICTS_REVUE.includes(verdict)) f.push(`ligne ${r.n} : verdict hors liste`)
    if (verdict === 'valider') {
      if (!regle || signes(regle) > 300 || !estPropre(regle)) f.push(`ligne ${r.n} : règle vide, trop longue ou impropre`)
      const ds = domaines.split(',').map((x) => x.trim()).filter(Boolean)
      if (!ds.length || ds.length > 4 || ds.some((x) => !DOMAINES.includes(x)) || new Set(ds).size !== ds.length) f.push(`ligne ${r.n} : domaines hors liste`)
    }
  }
  lignes.forEach((l, i) => { if (aCoordonnee(l) || RE_LIEN.test(l)) f.push(`ligne ${i + 1} : coordonnée ou lien`) })
  return f
}

// ── commandes ─────────────────────────────────────────────────────────────────────────────────────────────────────
async function candidats() {
  const cur = lireCurseur()
  const busFaits = []
  let depuisNouveau = cur.bus.depuis
  if (drapeau('bus')) {
    const jeton = process.env.PRESTI_JETON_CHEF
    if (!jeton || !jeton.trim()) { console.error('✗ PRESTI_JETON_CHEF absent'); return 2 }
    const base = baseSure(option('base'))
    const plancher = new Date(Date.now() - 30 * 86_400_000 + 5 * 60_000).toISOString()
    const depuis = cur.bus.depuis && cur.bus.depuis > plancher ? cur.bus.depuis : plancher
    const r = await appeler(base, jeton.trim(), 'GET', `/api/agents/decisions?tranchees=1&depuis=${encodeURIComponent(depuis)}`)
    if (r.statut !== 200 || !Array.isArray(r.json)) { console.error(`✗ bus : décisions illisibles (HTTP ${r.statut || r.erreur}) — aucun fichier écrit`); return 1 }
    for (const x of r.json) {
      if (!RE_UUID.test(String(x?.id)) || typeof x.tranchee_le !== 'string') continue
      if (!depuisNouveau || x.tranchee_le > depuisNouveau) depuisNouveau = x.tranchee_le
      if (cur.bus.vus.includes(x.id)) continue
      const source = `bus:decision:${x.id}`
      busFaits.push({ cle: `b\n${x.id}`, uuid: x.id, source, texte: null, type: 'decision', date: x.tranchee_le.slice(0, 10), constat: constatDe(`Décision ${x.cle_idempotence ?? '(sans clé)'} tranchée : ${x.choix}`) })
    }
  }
  const { faits, secrets, illisibles } = faitsDesFichiers()
  const candidates = lireDossier(CANDIDATES)
  const validees = new Set(lireDossier(VALIDEES).keys())
  const rejetees = new Set([...lireDossier(REJETEES).keys(), ...rejeteesParRevue()])
  let nouvelles = 0
  let reancrees = 0
  let retirees = 0
  for (const [id, c] of candidates) if (validees.has(id) || rejetees.has(id)) { fs.rmSync(c.fichier, { force: true }); candidates.delete(id); retirees++ }
  for (const f of [...faits, ...busFaits]) {
    const h = sha(f.cle)
    const id = idDe(f.date, f.source)
    const ancien = cur.vus[h]
    if (ancien) {
      if (ancien !== id && candidates.has(ancien)) {
        fs.rmSync(candidates.get(ancien).fichier, { force: true })
        candidates.delete(ancien)
        ecrireCandidate(f, id)
        reancrees++
      }
      cur.vus[h] = id
      continue
    }
    cur.vus[h] = id
    if (f.uuid) cur.bus.vus.push(f.uuid)
    if (validees.has(id) || rejetees.has(id)) continue
    ecrireCandidate(f, id)
    nouvelles++
  }
  cur.bus.depuis = depuisNouveau
  ecrireAtomique(CURSEUR, `${JSON.stringify(cur)}\n`)
  console.log(JSON.stringify({ nouvelles, reancrees, retirees, illisibles, secrets, bus: busFaits.length }))
  return 0
}

function lister() {
  const statut = option('statut')
  const lots = { candidate: lireDossier(CANDIDATES), rejetee: lireDossier(REJETEES), validee: lireDossier(VALIDEES) }
  if (statut && !lots[statut]) { console.error('✗ --statut=candidate|validee|rejetee'); return 2 }
  for (const [s, m] of Object.entries(lots)) {
    if (statut && s !== statut) continue
    for (const id of [...m.keys()].sort()) { const x = m.get(id); console.log(`${id}\t${s}\t${x.entete.type}\t${x.entete.source}\t${[...x.corps.split('\n')[0]].slice(0, 80).join('')}`) }
  }
  return 0
}

function preambule(id) {
  if (process.env.PRESTI_HOTE === 'usine') { console.error("✗ jamais sur l'usine : la validation est un geste de Claude Code ou de la revue"); return { code: 2 } }
  const par = option('par')
  const m = RE_PAR.exec(par || '')
  if (!m) { console.error('✗ --par=claude-code ou --par=revue-AAAA-SS'); return { code: 2 } }
  if (!id || !RE_ID.test(id)) { console.error('✗ identifiant de leçon attendu'); return { code: 2 } }
  if (fs.existsSync(path.join(VALIDEES, `${id}.md`))) { console.error(`✗ ${id} est déjà validée`); return { code: 1 } }
  const c = lireDossier(CANDIDATES).get(id)
  if (!c) { console.error(`✗ ${id} : candidate introuvable dans ${TRAVAIL}`); return { code: 1 } }
  const raison = resoudre(c.entete)
  if (raison) { console.error(`✗ ${id} : source refusée — ${raison}`); return { code: 1 } }
  return { code: 0, par, revue: m[1] ? `${m[1]}-${m[2]}` : null, c }
}
function exigerRevue(revue, id, verdict) {
  const doc = path.join(RACINE, 'docs', 'revues', `${revue}-lecons.md`)
  const lignes = lignesDe(doc)
  if (!lignes) { console.error(`✗ docs/revues/${revue}-lecons.md absent`); return false }
  const fautes = jugerDocument(lignes)
  if (fautes.length) { console.error(`✗ docs/revues/${revue}-lecons.md non conforme : ${fautes.slice(0, 3).join(' ; ')}`); return false }
  if (!lignesTableau(lignes).rangees.some((r) => r.cellules[0] === id && r.cellules[3] === verdict)) { console.error(`✗ ${id} n'a pas le verdict « ${verdict} » dans docs/revues/${revue}-lecons.md`); return false }
  return true
}

function valider(id) {
  const p = preambule(id)
  if (p.code) return p.code
  const regle = (option('regle') || '').trim()
  if (!regle || signes(regle) > 300 || /\r|\n/.test(regle) || !estPropre(regle)) { console.error('✗ règle vide, de plus de 300 signes, ou qui porte une coordonnée, un secret ou un lien'); return 1 }
  const domaines = (option('domaines') || '').split(',').map((x) => x.trim()).filter(Boolean)
  if (!domaines.length || domaines.length > 4 || domaines.some((d) => !DOMAINES.includes(d)) || new Set(domaines).size !== domaines.length) { console.error(`✗ domaines : 1 à 4, parmi ${DOMAINES.join(', ')}`); return 1 }
  if (p.revue && !exigerRevue(p.revue, id, 'valider')) return 1
  const e = { ...p.c.entete, domaines, statut: 'validee', valide_par: p.par, valide_le: aujourdhui() }
  ecrireAtomique(path.join(VALIDEES, `${id}.md`), texteFiche(e, `${p.c.corps}\n\nRègle : ${regle}`))
  // Claude Code enregistre lui-même : la candidate part. La revue écrit dans son worktree : la candidate reste dans le
  // travail du dépôt principal jusqu'à la fusion de sa PR (candidats la retire alors, validée sur main).
  if (!p.revue) fs.rmSync(p.c.fichier, { force: true })
  console.log(`✓ ${id} validée par ${p.par} : docs/savoir/lecons/${id}.md (à enregistrer par un commit)`)
  return 0
}

function rejeter(id) {
  const p = preambule(id)
  if (p.code) return p.code
  const raison = (option('raison') || '').trim()
  if (!raison || signes(raison) > 300 || /\r|\n/.test(raison) || !estPropre(raison)) { console.error('✗ raison vide, trop longue ou impropre'); return 1 }
  if (p.revue && !exigerRevue(p.revue, id, 'rejeter')) return 1
  const e = { ...p.c.entete, statut: 'rejetee', rejete_par: p.par, rejete_le: aujourdhui(), raison }
  ecrireAtomique(path.join(REJETEES, `${id}.md`), texteFiche(e, p.c.corps))
  fs.rmSync(p.c.fichier, { force: true })
  console.log(`✓ ${id} rejetée par ${p.par}`)
  return 0
}

function verifierSource(id) {
  const c = lireDossier(CANDIDATES).get(id)
  if (!c) { console.error(`✗ ${id} : candidate introuvable`); return 1 }
  const raison = resoudre(c.entete)
  if (raison) { console.error(`✗ ${id} : ${raison}`); return 1 }
  console.log(`✓ ${id} : ${c.entete.source}`)
  return 0
}

async function principal() {
  const [commande, id] = positionnels
  if (commande === 'candidats') return candidats()
  if (commande === 'lister') return lister()
  if (commande === 'valider') return valider(id)
  if (commande === 'rejeter') return rejeter(id)
  if (commande === 'verifier-source') return verifierSource(id)
  console.error('✗ commande : candidats | lister | valider | rejeter | verifier-source')
  return 2
}

principal().then((code) => { process.exitCode = code }).catch((e) => { console.error(`✗ ${e?.message || e}`); process.exitCode = 1 })
