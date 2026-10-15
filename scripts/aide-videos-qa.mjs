// Test permanent — les vidéos du centre d'aide (lib/aide-videos.json, public/aide-videos/).
//
// Règle de la vitrine appliquée à l'aide : une fonctionnalité du MENU sans vidéo fait échouer ce test.
//  1. chaque entrée de menu de l'espace connecté (app/AppShell.tsx) a sa vidéo (le centre d'aide lui-même excepté) ;
//  2. chaque entrée pointe vers une route qui existe (app/<route>/page.tsx) ;
//  3. chaque fichier existe, pèse < 4 Mo, dure 20 à 120 s (ffprobe), est en H.264, SANS piste son, 1280×720 ou 1440×900 ;
//  4. chaque vidéo a son affiche, 3 à 6 étapes écrites, un résumé, une offre cohérente avec le code ;
//  5. aucun fichier orphelin dans public/aide-videos/ ;
//  6. le composant du centre d'aide est bien celui de l'accessibilité : contrôles natifs, preload="none", affiche,
//     étapes en HTML (le même texte que les sous-titres incrustés), lien vers l'écran.
//
// Usage : node scripts/aide-videos-qa.mjs     (aucun réseau, aucun compte : lecture de fichiers + ffprobe)
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }
const lire = (f) => fs.readFileSync(f, 'utf8')

const VIDEOS = JSON.parse(lire('lib/aide-videos.json')).videos
const DIR = 'public/aide-videos'
const MAX_OCTETS = 4 * 1024 * 1024

console.log('── 1. Le menu : chaque fonctionnalité a sa vidéo')
const shell = lire('app/AppShell.tsx')
const hrefs = [...new Set([...shell.matchAll(/href:\s*'(\/[^']*)'/g)].map((m) => m[1].split('?')[0]))].filter((h) => h !== '/aide')
T('le menu a été lu (au moins 10 entrées)', hrefs.length >= 10, `${hrefs.length} entrées`)
for (const h of hrefs) T(`menu ${h} → une vidéo`, VIDEOS.some((v) => v.route === h))
const ids = VIDEOS.map((v) => v.id)
T('identifiants de vidéo uniques', new Set(ids).size === ids.length)
const flags = new Set([...lire('lib/flags.ts').matchAll(/^\s{2}(\w+):\s*(?:true|false)/gm)].map((m) => m[1]))
for (const v of VIDEOS) if (v.drapeau) T(`${v.id} : le drapeau « ${v.drapeau} » existe`, flags.has(v.drapeau))
// Les entrées de menu masquées par un drapeau dans AppShell sont celles dont la vidéo porte ce drapeau.
for (const [cle, drapeau] of [['crm', 'crm'], ['assistant', 'assistant'], ['site', 'siteCommandeVente']]) {
  T(`${cle} : vidéo cachée avec le même drapeau que l'entrée de menu`, VIDEOS.find((v) => v.id === cle)?.drapeau === drapeau)
}

console.log('\n── 2. Chaque entrée pointe vers une route qui existe')
for (const v of VIDEOS) {
  const f = path.join('app', ...v.route.split('/').filter(Boolean), 'page.tsx')
  T(`${v.id} → ${v.route}`, fs.existsSync(f), f)
}

console.log('\n── 3. Les fichiers')
const sonde = (f) => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,width,height', '-of', 'json', f], { encoding: 'utf8' })
  try { return JSON.parse(r.stdout) } catch { return null }
}
for (const v of VIDEOS) {
  const f = path.join(DIR, `${v.id}.mp4`)
  if (!fs.existsSync(f)) { T(`${v.id} : le fichier existe`, false, f); continue }
  const o = fs.statSync(f).size
  const s = sonde(f)
  const dur = s ? Number(s.format.duration) : NaN
  const video = s?.streams.find((x) => x.codec_type === 'video')
  T(`${v.id} : < 4 Mo (${(o / 1048576).toFixed(2)} Mo)`, o > 10_000 && o < MAX_OCTETS)
  T(`${v.id} : dure 20 à 120 s (${dur.toFixed(1)} s)`, dur >= 20 && dur <= 120)
  T(`${v.id} : H.264, ${video?.width}×${video?.height}`, video?.codec_name === 'h264' && ((video.width === 1440 && video.height === 900) || (video.width === 1280 && video.height === 720)))
  T(`${v.id} : sans piste son`, !s?.streams.some((x) => x.codec_type === 'audio'))
  const a = path.join(DIR, `${v.id}.webp`)
  T(`${v.id} : affiche présente et non vide`, fs.existsSync(a) && fs.statSync(a).size > 5_000)
  if (v.duree) T(`${v.id} : durée du JSON (${v.duree} s) = durée du fichier`, Math.abs(v.duree - dur) <= 1.5)
  else T(`${v.id} : durée inscrite dans le JSON`, false, 'relancer aide-videos-montage.mjs')
}

console.log('\n── 4. Le contenu écrit')
const aide = lire('lib/aide.ts')
for (const v of VIDEOS) {
  T(`${v.id} : 3 à 6 étapes (${v.etapes.length})`, v.etapes.length >= 3 && v.etapes.length <= 6)
  T(`${v.id} : chaque étape est une phrase (8 à 140 caractères)`, v.etapes.every((e) => e.trim().length >= 8 && e.length <= 140 && !/^à écrire$/i.test(e)), v.etapes.find((e) => e.length > 140 || e.length < 8))
  T(`${v.id} : résumé écrit`, typeof v.resume === 'string' && v.resume.trim().length >= 20)
  T(`${v.id} : offre valide`, ['essentiel', 'studio', 'signature'].includes(v.offre))
  // L'offre de la vidéo = celle de l'article d'aide du même écran, quand il y en a un ; Signature pour CRM et assistant.
  const m = aide.match(new RegExp(`id: '${v.id}',[\\s\\S]*?disponibleAvec: '(\\w+)'`))
  if (m) T(`${v.id} : offre « ${v.offre} » = celle de l'article d'aide`, m[1] === v.offre, `article : ${m[1]}`)
}
for (const id of ['crm', 'assistant']) T(`${id} : annoncé Signature`, VIDEOS.find((v) => v.id === id)?.offre === 'signature')
T('inventaire : annoncé Studio (lib/plans.ts : inventaire.stock)', VIDEOS.find((v) => v.id === 'inventaire')?.offre === 'studio')
T('le site : la mention « se commande à part » est écrite', /à part/.test(VIDEOS.find((v) => v.id === 'site')?.note ?? ''))
// « votre ton » (le ton des réponses) est un nom, pas un tutoiement.
const TUTOIEMENT = /(tu|tes|toi|ta)|(?<!votre |le |du |ce )ton/i
const textes = VIDEOS.flatMap((v) => [v.titre, v.resume, ...v.etapes]).join('\n')
T('vouvoiement partout (pas de « tu » / « ton » / « tes »)', !TUTOIEMENT.test(textes), (textes.match(TUTOIEMENT) || [])[0])

// Les sous-titres incrustés = le texte écrit : la capture note ses étapes dans videos/aide-brut/<id>.marques.json.
for (const v of VIDEOS) {
  const f = path.join('videos', 'aide-brut', `${v.id}.marques.json`)
  if (!fs.existsSync(f)) continue
  const m = JSON.parse(lire(f))
  T(`${v.id} : les sous-titres de la vidéo = les étapes écrites`, JSON.stringify(m._etapes) === JSON.stringify(v.etapes), m._etapes ? 'texte modifié depuis l’enregistrement : refaire la capture' : 'enregistrement sans trace du texte : refaire la capture')
}

console.log('\n── 5. Aucun fichier orphelin')
const connus = new Set(VIDEOS.flatMap((v) => [`${v.id}.mp4`, `${v.id}.webp`]))
const orphelins = fs.existsSync(DIR) ? fs.readdirSync(DIR).filter((f) => !connus.has(f)) : []
T('public/aide-videos/ ne contient que des fichiers déclarés', orphelins.length === 0, orphelins.join(', '))

console.log('\n── 6. Le centre d’aide : accessibilité et branchement')
const comp = lire('app/aide/VideoAide.tsx')
T('le <video> a ses contrôles natifs (clavier, plein écran)', /<video[^>]*\bcontrols\b/.test(comp))
T('preload="none" : rien ne se télécharge avant lecture', /preload="none"/.test(comp))
T('affiche (poster)', /poster=\{/.test(comp))
T('étapes écrites en HTML sous la vidéo (liste ordonnée)', /<ol[^>]*aide-vid-etapes/.test(comp) && /v\.etapes\.map/.test(comp))
T('la vidéo est décrite par ses étapes (aria-describedby)', /aria-describedby=\{`etapes-/.test(comp))
T('lien vers l’écran concerné', /href=\{v\.route\}/.test(comp))
T('offre affichée quand ce n’est pas Essentiel', /Disponible avec l’offre/.test(comp))
T('pas de lecture automatique', !/autoPlay|autoplay/i.test(comp))
const page = lire('app/aide/page.tsx')
T('la page /aide affiche les vidéos selon les drapeaux', /videosVisibles\(\)/.test(page) && /<VideoAide/.test(page))
T('la recherche de /aide couvre les vidéos', /videosTrouvees/.test(page))
const lib = lire('lib/aideVideos.ts')
T('lib/aideVideos.ts masque la vidéo d’une entrée de menu cachée', /enEssai\(v\.drapeau\)/.test(lib))

console.log(`\n${ko ? '❌' : '✅'} ${ok} contrôles passés, ${ko} échecs`)
process.exit(ko ? 1 : 0)
