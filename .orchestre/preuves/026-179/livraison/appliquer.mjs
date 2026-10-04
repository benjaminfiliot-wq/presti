// appliquer.mjs — pose la livraison de la fiche 026-179 (K1, le moteur nu de la carte) sur un dépôt presti.
//
//   node .orchestre/preuves/026-179/livraison/appliquer.mjs [--racine=<dépôt>] [--a-blanc]
//
// Ce que la livraison contient, et pourquoi elle n'est pas posée d'office : le moteur importe Phaser (`import("phaser")`) ; tant que
// "phaser": "3.90.0" n'est pas dans package.json et package-lock.json (préalable de la fiche, accord de Benj sur le diff) et installé
// (node scripts/usine.mjs preparer), le build et le typecheck de tout le dépôt échoueraient sur ces fichiers (Module not found), et un
// push les enverrait chez Vercel. Ce script les pose le jour où le préalable est fait, en une commande, sans rien écraser d'autre :
//   1. les fichiers NEUFS (app/controle/station/moteur/**) : refusés si un fichier de ce nom existe déjà avec un autre contenu ;
//   2. Carte.tsx : remplacé seulement s'il est encore celui sur lequel la livraison a été écrite (sha256) ;
//   3. lib/flags.ts, scripts/fermeture-e2e.mjs, proxy.ts : remplacements exacts (une seule occurrence de l'ancre), idempotents ;
//      un autre chantier peut avoir modifié ces fichiers : rien n'y est réécrit hors de l'ancre.
//   NB (04/10) : le commentaire de proxy.ts garde EXACTEMENT le nombre de lignes de l'ancien (2 lignes pour le bloc de CHEMINS_APP_PRESTI, 3 pour celui du matcher) :
//   next16-qa N16-8 retire les commentaires mais garde leurs sauts de ligne, et compare le corps ligne à ligne à middleware-reference.ts.
// Sortie : une ligne par fichier ; code 0 si tout est posé (ou déjà posé), 1 sinon (rien n'est écrit si une ancre manque : --a-blanc le dit).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const arg = (n) => process.argv.slice(2).find((a) => a.startsWith(`--${n}=`))?.slice(n.length + 3)
const RACINE = path.resolve(arg('racine') ?? path.join(ICI, '..', '..', '..', '..'))
const A_BLANC = process.argv.includes('--a-blanc')
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex')
const lire = (f) => fs.readFileSync(f, 'utf8')

const sorties = []
let echec = false
const dire = (ok, ligne) => { sorties.push(`${ok ? '✓' : '✗'} ${ligne}`); if (!ok) echec = true }
const ecritures = []
// Plusieurs remplacements d'un même fichier s'enchaînent : chacun part du texte déjà modifié par les précédents, jamais de celui du disque.
const textes = new Map()
const courant = (f) => (textes.has(f) ? textes.get(f) : lire(f))
const poser = (f, texte) => { textes.set(f, texte); const i = ecritures.findIndex(([g]) => g === f); if (i >= 0) ecritures.splice(i, 1); ecritures.push([f, Buffer.from(texte, 'utf8')]) }

// 1. Les fichiers neufs : chaque `<chemin>.pret` de la livraison, sauf Carte.tsx (existant) et ce script.
const CARTE = 'app/controle/station/Carte.tsx'
const CARTE_BASE_SHA = 'f1d61245852a854de995e9d62bfe530b2c89cea1fb117108752a3fbbc5ac510a' // le Carte.tsx de 026-111 (16be91f5), en LF
const parcourir = (d, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) parcourir(p, out); else out.push(p) } return out }
for (const f of parcourir(path.join(ICI, 'fichiers')).sort()) {
  const rel = path.relative(path.join(ICI, 'fichiers'), f).split(path.sep).join('/').replace(/\.pret$/, '')
  const cible = path.join(RACINE, rel)
  const neuf = fs.readFileSync(f)
  if (rel === CARTE) {
    // Comparé en LF : l'arbre de travail est en CRLF (autocrlf), le dépôt en LF. Le fichier garde ses fins de ligne.
    const actuel = fs.existsSync(cible) ? fs.readFileSync(cible, 'utf8') : null
    const crlf = !!actuel && actuel.includes('\r\n')
    const enLf = (s) => Buffer.from(s.replace(/\r\n/g, '\n'), 'utf8')
    if (actuel && sha(enLf(actuel)) === sha(neuf)) dire(true, `${rel} : déjà posé`)
    else if (actuel && sha(enLf(actuel)) === CARTE_BASE_SHA) { ecritures.push([cible, crlf ? Buffer.from(neuf.toString('utf8').replace(/\n/g, '\r\n'), 'utf8') : neuf]); dire(true, `${rel} : remplacé (le cadre d'attente et la liste des salles sont gardés)`) }
    else dire(false, `${rel} : ce n'est plus la version sur laquelle la livraison est écrite (${actuel ? sha(enLf(actuel)).slice(0, 12) : 'absent'}, ${CARTE_BASE_SHA.slice(0, 12)} attendu) : à fusionner à la main`)
    continue
  }
  if (fs.existsSync(cible)) {
    if (sha(fs.readFileSync(cible)) === sha(neuf)) dire(true, `${rel} : déjà posé`)
    else dire(false, `${rel} : existe déjà avec un autre contenu, rien n'est écrasé`)
  } else { ecritures.push([cible, neuf]); dire(true, `${rel} : neuf`) }
}

// 2. Les remplacements exacts. `avant` doit figurer UNE fois ; `apres` le remplace (ou le suit : `inserer`) ; déjà posé : rien.
function remplacer(rel, { ancre, apres, deja }) {
  const f = path.join(RACINE, rel)
  if (!fs.existsSync(f)) return dire(false, `${rel} : absent`)
  const t = courant(f)
  // Le fichier garde ses fins de ligne (LF dans le dépôt, CRLF dans un arbre extrait sous Windows avec autocrlf).
  const eol = (s) => (t.includes('\r\n') ? s.replace(/\n/g, '\r\n') : s)
  if (t.includes(deja)) return dire(true, `${rel} : déjà posé`)
  const n = t.split(eol(ancre)).length - 1
  if (n !== 1) return dire(false, `${rel} : l'ancre figure ${n} fois (une seule attendue) : « ${ancre.slice(0, 70).replace(/\n/g, '↵')} »`)
  poser(f, t.replace(eol(ancre), () => eol(apres)))
  dire(true, `${rel} : remplacement exact`)
}
remplacer('lib/flags.ts', {
  ancre: '  pilotage: false,\n',
  deja: '  stationCarte: false,',
  apres: '  pilotage: false,\n  /** 026-179 — carte Claw3D de la station, levée par 026-193 après sa recette. Baissé : la page de la station garde son cadre d\'attente et la liste des salles, et le moteur (Phaser) n\'est jamais chargé. */\n  stationCarte: false,\n',
})
// fermeture-e2e : la ligne de `pilotage` (une seule, qui commence par 'pilotage': ['route') suivie de celle de stationCarte.
{
  const rel = 'scripts/fermeture-e2e.mjs'
  const f = path.join(RACINE, rel)
  if (!fs.existsSync(f)) dire(false, `${rel} : absent`)
  else {
    const t = courant(f)
    if (/^\s*'stationCarte': \['lu'\],/m.test(t)) dire(true, `${rel} : déjà posé`)
    else {
      const fin = t.includes('\r\n') ? '\r\n' : '\n'
      const lignes = t.split(fin)
      const i = lignes.map((l, k) => (/^\s*'pilotage': \['route', '\/api\/controle\/pilotage'/.test(l) ? k : -1)).filter((k) => k >= 0)
      if (i.length !== 1) dire(false, `${rel} : la ligne de 'pilotage' figure ${i.length} fois (une seule attendue)`)
      else {
        lignes.splice(i[0] + 1, 0, '    // 026-179 — la carte Claw3D de la station : lue par app/controle/station/Carte.tsx (baissé : le cadre d\'attente et la liste des salles, aucun morceau de Phaser).', "    'stationCarte': ['lu'],")
        poser(f, lignes.join(fin))
        dire(true, `${rel} : ligne de carte posée sous 'pilotage'`)
      }
    }
  }
}
// proxy.ts : l'alternative station\/.* de CHEMINS_APP_PRESTI, et les deux commentaires périmés (le matcher ne laisse sortir que api et _next/).
remplacer('proxy.ts', {
  ancre: 'marque\\/.*|\\.well-known\\/.*)$/',
  deja: 'marque\\/.*|station\\/.*|\\.well-known\\/.*)$/',
  apres: 'marque\\/.*|station\\/.*|\\.well-known\\/.*)$/',
})
remplacer('proxy.ts', {
  ancre: '// et /sw.js le worker Presti sur le domaine perso d\'un artisan (revue v9 J1, 06/09). Ces chemins portent un\n// point : le matcher général les exclut, ils sont donc listés à part dans `config.matcher`.\n',
  deja: 'Le matcher ci-dessous laisse passer',
  apres: '// et /sw.js le worker Presti sur le domaine perso d\'un artisan (revue v9 J1, 06/09). Le matcher ci-dessous laisse passer les chemins à point (seuls api et _next/ en sortent) : ils arrivent ici, et cette liste les refuse.\n// station/ (026-179) : les thèmes de la carte (public/station/themes/<clé>/…) ne se servent jamais sur le domaine d\'un artisan, comme marque/.\n',
})
remplacer('proxy.ts', {
  ancre: '// On ne passe PAS par le proxy pour les fichiers statiques ni l\'API : le matcher exclut\n// tout chemin contenant un point (favicon.ico, robots.txt, images) et les routes techniques.\n// Les chemins de l\'app Presti (avec un point) y sont ajoutés explicitement : voir CHEMINS_APP_PRESTI.\n',
  deja: 'le matcher ne laisse sortir que ces deux préfixes',
  apres: '// On ne passe PAS par le proxy pour l\'API ni pour _next/ : le matcher ne laisse sortir que ces deux préfixes. Un chemin à\n// point (favicon.ico, robots.txt, manifest.webmanifest) arrive donc dans proxy() ; sur un hôte d\'artisan, ceux de l\'app Presti\n// sont refusés par CHEMINS_APP_PRESTI.\n',
})

if (!echec && !A_BLANC) {
  for (const [f, contenu] of ecritures) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, contenu) }
}
console.log(sorties.join('\n'))
console.log(echec ? '✗ livraison NON posée (rien n\'est écrit)' : A_BLANC ? `✓ à blanc : ${ecritures.length} écriture(s) prévue(s), rien d'écrit` : `✓ livraison posée : ${ecritures.length} écriture(s)`)
process.exitCode = echec ? 1 : 0
