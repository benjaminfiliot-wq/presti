// scripts/fixtures/026-acquisition/maquettes/executeur-factice.mjs — un `executer` factice (la forme de
// `child_process.spawnSync`, sans shell) qui imite `public/sites-demo/generer.mjs --maquette`, `scripts/maquette-capturer.mjs`
// et `scripts/agents/maquette-video.mjs`, pour le juge de l'Atelier des maquettes (atelier-maquettes-qa, fiche 026-080),
// écrit par Claude Code AVANT le module qu'il juge (scripts/agents/atelier-maquettes.mjs, fiche 026-097).
//
// `creerExecuteurFactice(scenario)` : une fonction `(commande, args, options) => { status, stdout, stderr }`, qui écrit les
// fichiers de sortie SELON LE SCÉNARIO choisi pour l'appel (une clé de `scenario` retrouvée n'importe où dans les
// arguments — le dossier de sortie de chaque prospect en porte une, `<dossierSortie>/<cle>/…`, fiche 026-097 point 5). Par
// défaut (aucune clé reconnue) : deux captures conformes et une vidéo conforme, code 0. Chemins reconnus :
// `--sortie=<dossier>/site` (generer.mjs) écrit `<dossier>/site/capture-bureau.jpg` et `capture-telephone.jpg` ;
// `<dossier>/site` en dernier argument (maquette-capturer.mjs) écrit les mêmes deux fichiers ; `--sortie=<dossier>/video.mp4`
// (maquette-video.mjs) écrit ce fichier.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const A = path.dirname(fileURLToPath(import.meta.url))
export const JPEG_TELEPHONE = fs.readFileSync(path.join(A, 'capture-telephone.jpg'))
export const JPEG_ORDINATEUR = fs.readFileSync(path.join(A, 'capture-ordinateur.jpg'))
export const VIDEO_OK = fs.readFileSync(path.join(A, 'video-essai.mp4'))

/** Une image « uniforme » : SOI/EOI et un segment SOF valides, mais un seul octet répété dans les données compressées. */
export function jpegUniforme(base = JPEG_TELEPHONE) {
  const b = Buffer.from(base)
  for (let i = 200; i < b.length - 2; i++) b[i] = 0x41
  return b
}
export const jpegZeroOctet = () => Buffer.alloc(0)
/** Une image de ~1,4 Mo (au-delà du 1 Mo permis), en répétant l'image d'essai. */
export function jpegLourde() {
  const parties = []
  let total = 0
  while (total < 1.4 * 1024 * 1024) { parties.push(JPEG_ORDINATEUR); total += JPEG_ORDINATEUR.length }
  return Buffer.concat(parties)
}
/** Une vidéo de ~3,2 Mo (au-delà des 3 Mo permis), `ftyp` toujours à l'octet 4. */
export function videoLourde() {
  return Buffer.concat([VIDEO_OK, crypto.randomBytes(Math.max(0, Math.ceil(3.2 * 1024 * 1024) - VIDEO_OK.length))])
}

const DEFAUT = { generer: 'ok', capturer: 'ok', video: 'ok' }

/**
 * `scenario` : `{ [cle]: { generer?: 'ok'|'echec', capturer?: 'ok'|'echec'|'zero'|'lourde'|'uniforme', video?: 'ok'|'echec'|'lourde' } }`.
 * Une clé absente du scénario, ou aucune clé retrouvée dans les arguments, se comporte comme DEFAUT (tout conforme).
 */
export function creerExecuteurFactice(scenario = {}) {
  const appels = []
  function ecrire(chemin, octets) { fs.mkdirSync(path.dirname(chemin), { recursive: true }); fs.writeFileSync(chemin, octets) }
  function executer(commande, args = [], options = {}) {
    const texte = args.join(' ')
    appels.push({ commande, args: [...args], texte, cwd: options?.cwd })
    const cle = Object.keys(scenario).find((k) => texte.includes(k))
    const s = { ...DEFAUT, ...(cle ? scenario[cle] : {}) }
    if (/generer\.mjs/.test(texte)) {
      if (s.generer === 'echec') return { status: 1, stdout: '', stderr: 'generer.mjs : échec simulé' }
      const m = /--sortie=([^\s]+)/.exec(texte)
      const dossier = m ? m[1] : null
      if (dossier) ecrire(path.join(dossier, 'index.html'), Buffer.from('<html></html>'))
      return { status: 0, stdout: 'site généré', stderr: '' }
    }
    if (/maquette-capturer\.mjs/.test(texte)) {
      const dossier = args[args.length - 1]
      if (s.capturer === 'echec') return { status: 1, stdout: '', stderr: 'maquette-capturer.mjs : échec simulé' }
      const bureau = s.capturer === 'zero' ? jpegZeroOctet() : s.capturer === 'lourde' ? jpegLourde() : s.capturer === 'uniforme' ? jpegUniforme(JPEG_ORDINATEUR) : JPEG_ORDINATEUR
      const telephone = s.capturer === 'zero' ? jpegZeroOctet() : s.capturer === 'lourde' ? jpegLourde() : s.capturer === 'uniforme' ? jpegUniforme(JPEG_TELEPHONE) : JPEG_TELEPHONE
      if (dossier) { ecrire(path.join(dossier, 'capture-bureau.jpg'), bureau); ecrire(path.join(dossier, 'capture-telephone.jpg'), telephone) }
      return { status: 0, stdout: 'captures prises', stderr: '' }
    }
    if (/maquette-video\.mjs/.test(texte)) {
      if (s.video === 'echec') return { status: 1, stdout: '', stderr: 'maquette-video.mjs : échec simulé' }
      const m = /--sortie=([^\s]+)/.exec(texte)
      const fichier = m ? m[1] : null
      if (fichier) ecrire(fichier, s.video === 'lourde' ? videoLourde() : VIDEO_OK)
      return { status: 0, stdout: 'vidéo rendue', stderr: '' }
    }
    return { status: 1, stdout: '', stderr: `exécuteur factice : commande inconnue « ${commande} ${texte} »` }
  }
  executer.appels = appels
  return executer
}
