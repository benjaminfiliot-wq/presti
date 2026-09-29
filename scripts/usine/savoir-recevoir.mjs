#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const MAX = 100 * 1024 * 1024
const sha = b => crypto.createHash('sha256').update(b).digest('hex')
const argument = (nom, defaut) => process.argv.find(x => x.startsWith(`--${nom}=`))?.slice(nom.length + 3) || defaut
const depot = path.resolve(argument('depot', '/srv/presti-savoir/depot'))
const racine = path.resolve(argument('racine-travail', '/home/agents/travail/savoir'))
const erreur = raison => { throw new Error(raison) }
const champ = (h, a, n) => { const b = h.subarray(a, a + n); const z = b.indexOf(0); return (z < 0 ? b : b.subarray(0, z)).toString('utf8') }
function paxLire(b) {
  const valeurs = {}; let i = 0
  while (i < b.length) {
    const e = b.indexOf(32, i), longueur = Number(b.subarray(i, e).toString('ascii'))
    if (e < 0 || !Number.isInteger(longueur) || longueur <= e - i + 1 || i + longueur > b.length) erreur('pax invalide')
    const ligne = b.subarray(e + 1, i + longueur).toString('utf8')
    const egal = ligne.indexOf('=')
    if (egal < 1 || !ligne.endsWith('\n')) erreur('pax invalide')
    const cle = ligne.slice(0, egal)
    if (!['path', 'mtime', 'atime', 'ctime'].includes(cle) || cle in valeurs) erreur('cle pax interdite')
    valeurs[cle] = ligne.slice(egal + 1, -1); i += longueur
  }
  return valeurs
}
function lireTar(b) {
  const entrees = new Map(); let off = 0, pax = null, fin = false, fichiers = 0
  while (off + 512 <= b.length) {
    const h = b.subarray(off, off + 512)
    if (h.every(x => x === 0)) { fin = true; break }
    let somme = 0; for (let j = 0; j < 512; j++) somme += j >= 148 && j < 156 ? 32 : h[j]
    if (somme !== parseInt(champ(h, 148, 8).trim(), 8)) erreur('controle tar invalide')
    if (h.subarray(257, 263).toString('latin1') !== 'ustar\0' || h.subarray(263, 265).toString('latin1') !== '00') erreur('format tar invalide')
    const type = h[156] ? String.fromCharCode(h[156]) : '0'
    const taille = parseInt(champ(h, 124, 12).trim() || '0', 8)
    if (!Number.isSafeInteger(taille) || taille < 0 || taille > MAX || off + 512 + taille > b.length) erreur('taille tar invalide')
    const donnees = b.subarray(off + 512, off + 512 + taille)
    off += 512 + Math.ceil(taille / 512) * 512
    if (type === 'x') { pax = paxLire(donnees); continue }
    if (!['0', '5'].includes(type) || champ(h, 157, 100)) erreur('type tar interdit')
    const nom = pax?.path || [champ(h, 345, 155), champ(h, 0, 100)].filter(Boolean).join('/')
    pax = null
    const elements = nom.replace(/\/$/, '').split('/')
    if (!nom || Buffer.byteLength(nom) > 255 || nom.startsWith('/') || nom.includes('\\') || elements.some(x => !x || x === '..' || x === '.') || /^[A-Za-z]:/.test(nom)) erreur('chemin tar interdit')
    if (entrees.has(nom)) erreur('entree tar dupliquee')
    if (type === '0') { fichiers++; if (fichiers > 20000) erreur('trop de fichiers') }
    else if (taille) erreur('dossier tar non vide')
    entrees.set(nom, { type, donnees })
  }
  if (!fin || pax) erreur('archive tar incomplete')
  return entrees
}
function valider(buf, compartiment) {
  const entrees = lireTar(buf), m = entrees.get('manifeste.json')
  if (!m || m.type !== '0') erreur('manifeste absent')
  let manifeste
  try { manifeste = JSON.parse(m.donnees.toString('utf8')) } catch { erreur('manifeste invalide') }
  if (manifeste.compartiment !== compartiment || !Array.isArray(manifeste.fichiers)) erreur('mauvais compartiment')
  const attendus = new Set(['manifeste.json'])
  let octets = 0
  for (const ligne of manifeste.fichiers) {
    if (!['saas', 'presti', 'memoire', 'ops'].includes(ligne.racine) || typeof ligne.chemin !== 'string' || !ligne.chemin || ligne.chemin.startsWith('/') || ligne.chemin.split('/').some(x => !x || x === '.' || x === '..') || (compartiment === 'general' && ligne.classe === 'prospects') || (compartiment === 'prospects' && ligne.classe !== 'prospects')) erreur('entree manifeste interdite')
    const nom = `fichiers/${ligne.racine}/${ligne.chemin}`, fichier = entrees.get(nom)
    if (!fichier || fichier.type !== '0' || attendus.has(nom) || sha(fichier.donnees) !== ligne.sha256 || fichier.donnees.length !== ligne.octets) erreur('empreinte ou fichier invalide')
    attendus.add(nom); octets += fichier.donnees.length
  }
  for (const [nom, e] of entrees) if (e.type === '0' && !attendus.has(nom)) erreur('fichier hors manifeste')
  return { entrees, fichiers: manifeste.fichiers.length, octets }
}
function retirerSansSuivre(p) {
  let s; try { s = fs.lstatSync(p) } catch (e) { if (e.code === 'ENOENT') return; throw e }
  if (!s.isDirectory() || s.isSymbolicLink()) { fs.unlinkSync(p); return }
  for (const n of fs.readdirSync(p)) retirerSansSuivre(path.join(p, n))
  fs.rmdirSync(p)
}
function recevoir(nom) {
  const pret = path.join(depot, nom), archive = path.join(depot, nom.slice(0, -5) + '.tar')
  const base = path.basename(archive), compartiment = base.split('-')[0]
  let fichiers = 0, octets = 0, verdict = 'refuse', raison
  try {
    if (!/^(general|prospects)-\d{8}T\d{6}Z\.tar$/.test(base)) erreur('nom archive invalide')
    if (!fs.lstatSync(pret).isFile() || !fs.lstatSync(archive).isFile()) erreur('lien ou type interdit')
    if (fs.statSync(archive).size > MAX) erreur('archive trop grande')
    const v = valider(fs.readFileSync(archive), compartiment)
    fichiers = v.fichiers; octets = v.octets
    const dir = path.join(racine, compartiment), courant = path.join(dir, 'courant'), precedent = path.join(dir, 'precedent'), nouveau = path.join(dir, `recu-${base.slice(compartiment.length + 1, -4)}`)
    fs.mkdirSync(dir, { recursive: true })
    retirerSansSuivre(nouveau)
    fs.mkdirSync(nouveau, { mode: 0o700 })
    for (const [chemin, e] of v.entrees) {
      if (e.type !== '0') continue
      const cible = path.join(nouveau, ...chemin.split('/'))
      fs.mkdirSync(path.dirname(cible), { recursive: true, mode: 0o700 })
      fs.writeFileSync(cible, e.donnees, { flag: 'wx', mode: 0o600 })
    }
    retirerSansSuivre(precedent)
    try { fs.renameSync(courant, precedent) } catch (e) { if (e.code !== 'ENOENT') throw e }
    fs.renameSync(nouveau, courant)
    fs.writeFileSync(path.join(racine, 'a-indexer'), JSON.stringify({ recu_le: new Date().toISOString() }))
    verdict = 'recu'
  } catch (e) { raison = String(e.message).slice(0, 120) }
  finally {
    for (const p of [archive, pret]) { try { fs.unlinkSync(p) } catch (e) { if (e.code !== 'ENOENT') throw e } }
    fs.mkdirSync(racine, { recursive: true })
    fs.appendFileSync(path.join(racine, 'journal.jsonl'), JSON.stringify({ le: new Date().toISOString(), archive: base, compartiment, verdict, fichiers, octets, ...(raison ? { raison } : {}) }) + '\n')
  }
  return verdict === 'recu'
}
let code = 0
try {
  const noms = fs.readdirSync(depot).filter(n => n.endsWith('.pret')).sort((a, b) => {
    const aa = fs.lstatSync(path.join(depot, a)).mtimeMs, bb = fs.lstatSync(path.join(depot, b)).mtimeMs
    return aa - bb || a.localeCompare(b)
  })
  for (const n of noms) if (!recevoir(n)) code = 1
} catch { code = 1 }
process.exitCode = code
