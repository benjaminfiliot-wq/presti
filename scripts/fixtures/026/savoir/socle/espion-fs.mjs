// Espion du système de fichiers du juge savoir-socle-qa (026-229), chargé par `node --import <ce fichier>`.
// Il consigne, dans le fichier SAVOIR_ESPION_FS (une ligne JSON par geste), chaque chemin :
//   lecture      ouvert en lecture (readFile*, createReadStream, open* sans drapeau d'écriture)
//   liste        listé (readdir*, opendir*)
//   ecriture     écrit (writeFile*, appendFile*, createWriteStream, copyFile*/cp* vers, open* en écriture)
//   dossier      créé (mkdir*)
//   renommage    renommé (rename*) : { chemin: de, vers }
//   suppression  retiré (rm*, rmdir*, unlink*)
// Il ne bloque rien et n'exécute rien : il relève. Les exports nommés de node:fs et node:fs/promises sont resynchronisés
// (syncBuiltinESMExports) pour qu'un `import { readFileSync } from 'node:fs'` passe aussi par lui.
import fs from 'node:fs'
import path from 'node:path'
import { syncBuiltinESMExports } from 'node:module'
import { fileURLToPath } from 'node:url'

const JOURNAL = process.env.SAVOIR_ESPION_FS
if (JOURNAL) {
  const journalAbs = path.resolve(JOURNAL)
  const ajouter = fs.appendFileSync.bind(fs)
  let dedans = false
  const chemin = (p) => {
    try {
      if (p instanceof URL) return fileURLToPath(p)
      if (Buffer.isBuffer(p)) return path.resolve(p.toString('utf8'))
      if (typeof p === 'string') return path.resolve(p)
    } catch { /* ignoré */ }
    return null
  }
  const noter = (op, p, extra = {}) => {
    if (dedans) return
    const c = chemin(p)
    if (!c || c === journalAbs) return
    dedans = true
    try { ajouter(journalAbs, `${JSON.stringify({ op, chemin: c, ...extra })}\n`) } catch { /* l'espion ne casse jamais l'appelant */ } finally { dedans = false }
  }
  const ecritureDrapeaux = (d) => {
    if (typeof d === 'number') return (d & (fs.constants.O_WRONLY | fs.constants.O_RDWR | fs.constants.O_CREAT | fs.constants.O_APPEND | fs.constants.O_TRUNC)) !== 0
    return typeof d === 'string' && /[wa+]/.test(d)
  }
  const envelopper = (cible, nom, quoi) => {
    const f = cible[nom]
    if (typeof f !== 'function') return
    cible[nom] = function espion(...args) { try { quoi(args) } catch { /* ignoré */ } return f.apply(this, args) }
  }
  const P = fs.promises
  for (const [c, n] of [[fs, 'readFileSync'], [fs, 'readFile'], [P, 'readFile'], [fs, 'createReadStream']]) envelopper(c, n, (a) => noter('lecture', a[0]))
  for (const [c, n] of [[fs, 'openSync'], [fs, 'open'], [P, 'open']]) envelopper(c, n, (a) => noter(ecritureDrapeaux(a[1]) ? 'ecriture' : 'lecture', a[0]))
  for (const [c, n] of [[fs, 'readdirSync'], [fs, 'readdir'], [P, 'readdir'], [fs, 'opendirSync'], [fs, 'opendir'], [P, 'opendir']]) envelopper(c, n, (a) => noter('liste', a[0]))
  for (const [c, n] of [[fs, 'writeFileSync'], [fs, 'writeFile'], [P, 'writeFile'], [fs, 'appendFileSync'], [fs, 'appendFile'], [P, 'appendFile'], [fs, 'createWriteStream']]) envelopper(c, n, (a) => noter('ecriture', a[0]))
  for (const [c, n] of [[fs, 'copyFileSync'], [fs, 'copyFile'], [P, 'copyFile'], [fs, 'cpSync'], [fs, 'cp'], [P, 'cp']]) envelopper(c, n, (a) => noter('ecriture', a[1]))
  for (const [c, n] of [[fs, 'mkdirSync'], [fs, 'mkdir'], [P, 'mkdir']]) envelopper(c, n, (a) => noter('dossier', a[0]))
  for (const [c, n] of [[fs, 'renameSync'], [fs, 'rename'], [P, 'rename']]) envelopper(c, n, (a) => noter('renommage', a[0], { vers: chemin(a[1]) }))
  for (const [c, n] of [[fs, 'rmSync'], [fs, 'rm'], [P, 'rm'], [fs, 'rmdirSync'], [fs, 'rmdir'], [P, 'rmdir'], [fs, 'unlinkSync'], [fs, 'unlink'], [P, 'unlink']]) envelopper(c, n, (a) => noter('suppression', a[0]))
  syncBuiltinESMExports()
}
