// Test permanent — les vidéos du centre d'aide (lib/aide-videos.json, public/aide-videos/).
//
// Règle de la vitrine appliquée à l'aide : une fonctionnalité du MENU sans vidéo fait échouer ce test.
//  1. chaque entrée de menu de l'espace connecté (app/AppShell.tsx) a sa vidéo (le centre d'aide lui-même excepté) ;
//  2. chaque entrée pointe vers une route qui existe (app/<route>/page.tsx) ;
//  3. chaque fichier existe, pèse < 6 Mo, dure 20 à 120 s (ffprobe), est en H.264 1920×1200 avec une piste son AAC SILENCIEUSE (décision du
//     fondateur, 17/10 : pas de voix, des sous-titres ; la piste silencieuse évite les lecteurs qui n'aiment pas l'absence de piste) ;
//  4. chaque vidéo a son affiche, 3 à 6 étapes écrites, un résumé, une offre cohérente avec le code ;
//  5. aucun fichier orphelin dans public/aide-videos/ ;
//  6. le composant du centre d'aide est bien celui de l'accessibilité : contrôles natifs, preload="none", affiche,
//     étapes en HTML (le même texte que les cartons d'étape de la vidéo), lien vers l'écran ;
//  7. les sous-titres : le texte (`voix` : intro, une phrase par étape, fin) existe, tient en 2 lignes, et chaque sous-titre (`sousTitres`,
//     écrit par aide-videos-anime.mjs) reste affiché au moins 0,4 s par mot + 1,2 s, sans chevauchement ; une image prise au milieu de chaque
//     sous-titre montre du texte clair dans la zone du bas, qui est vide avant l'intro.
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
const MAX_OCTETS = 6 * 1024 * 1024
// volume maximal de la piste son (dB) : une piste silencieuse donne ≈ −91 dB, une voix ou une musique donnerait > −30 dB
const volumeMax = (f) => { const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', f, '-vn', '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8', maxBuffer: 1 << 26 }); const m = (r.stderr || '').match(/max_volume:\s+(-?[\d.]+|-inf) dB/); return m ? (m[1] === '-inf' ? -Infinity : Number(m[1])) : null }
// La zone des sous-titres (pile verticale du gabarit : 1042→1180 sur 1200 de haut) : combien de pixels clairs (le texte est blanc sur une pastille sombre) ?
const ZONE = { x: 180, y: 1040, w: 1560, h: 140 }
const pixelsClairs = (f, t) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-ss', String(t), '-i', f, '-frames:v', '1', '-vf', `crop=${ZONE.w}:${ZONE.h}:${ZONE.x}:${ZONE.y},format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 26 }); if (r.status !== 0 || !r.stdout?.length) return null; let n = 0; for (const b of r.stdout) if (b > 200) n++; return n }
const mots = (t) => t.trim().split(/\s+/).length

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
  T(`${v.id} : < 6 Mo (${(o / 1048576).toFixed(2)} Mo)`, o > 10_000 && o < MAX_OCTETS)
  T(`${v.id} : dure 20 à 120 s (${dur.toFixed(1)} s)`, dur >= 20 && dur <= 120)
  T(`${v.id} : H.264, ${video?.width}×${video?.height}`, video?.codec_name === 'h264' && (video.width === 1920 && video.height === 1200))
  const son = s?.streams.find((x) => x.codec_type === 'audio')
  T(`${v.id} : piste son AAC présente`, son?.codec_name === 'aac')
  if (son) { const vm = volumeMax(f); T(`${v.id} : piste son silencieuse, pas de voix (volume max ${vm === null ? '?' : vm} dB)`, vm !== null && vm <= -60) }
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
// 15/10 (Benj) : « Ma plateforme » et « Mes chiffres » commencent avec Studio. L'offre annoncée par la vidéo est lue dans la MATRICE (lib/plans.ts :
// BASE = toutes les offres, STUDIO = le tableau des capacités ajoutées par Studio), jamais retapée ici.
{
  const plansSrc = lire('lib/plans.ts')
  const bloc = (nom) => { const d = plansSrc.indexOf('const ' + nom + ': Capacite[] = ['); return plansSrc.slice(d, plansSrc.indexOf('\n]', d)) }
  const base = bloc('BASE'), studio = bloc('STUDIO')
  for (const [id, cap] of [['plateforme', 'plateforme.gestion'], ['chiffres', 'chiffres']]) {
    const dans = (b) => b.includes("'" + cap + "'")
    const attendu = dans(base) ? 'essentiel' : dans(studio) ? 'studio' : 'signature'
    T(id + ' : annoncé ' + attendu + ' (lib/plans.ts : ' + cap + ')', VIDEOS.find((v) => v.id === id)?.offre === attendu, 'vidéo : ' + VIDEOS.find((v) => v.id === id)?.offre)
  }
}
T('le site : la mention « se commande à part » est écrite', /à part/.test(VIDEOS.find((v) => v.id === 'site')?.note ?? ''))
// « votre ton » (le ton des réponses) est un nom, pas un tutoiement.
const TUTOIEMENT = /(tu|tes|toi|ta)|(?<!votre |le |du |ce )ton/i
const textes = VIDEOS.flatMap((v) => [v.titre, v.resume, ...v.etapes]).join('\n')
T('vouvoiement partout (pas de « tu » / « ton » / « tes »)', !TUTOIEMENT.test(textes), (textes.match(TUTOIEMENT) || [])[0])

// Les cartons d'étape de la vidéo = le texte écrit : la capture note ses étapes dans videos/aide-brut/<id>.marques.json.
for (const v of VIDEOS) {
  const f = path.join('videos', 'aide-brut', `${v.id}.marques.json`)
  if (!fs.existsSync(f)) continue
  const m = JSON.parse(lire(f))
  T(`${v.id} : les cartons d'étape de la vidéo = les étapes écrites`, JSON.stringify(m._etapes) === JSON.stringify(v.etapes), m._etapes ? 'texte modifié depuis l’enregistrement : refaire la capture' : 'enregistrement sans trace du texte : refaire la capture')
}

console.log('\n── 4 bis. Les sous-titres : texte, temps de lecture, présence à l’image')
for (const v of VIDEOS) {
  const x = v.voix
  T(`${v.id} : texte des sous-titres présent (intro, une phrase par étape, fin)`, !!x && typeof x.intro === 'string' && typeof x.fin === 'string' && Array.isArray(x.etapes) && x.etapes.length === v.etapes.length)
  // 130 caractères : deux lignes de la pastille (1500 px à 40 px, ≈ 70 caractères par ligne) ; le plus long texte actuel en fait ~110
  if (x) T(`${v.id} : chaque sous-titre fait 8 à 130 caractères (2 lignes au plus)`, [x.intro, ...x.etapes, x.fin].every((t) => t.trim().length >= 8 && t.length <= 130), [x.intro, ...x.etapes, x.fin].find((t) => t.length > 130))
  // Le sous-titre de fin doit annoncer l'offre du JSON (si l'offre change, le sous-titre doit changer aussi, pas seulement la carte).
  if (x && !v.note) T(`${v.id} : le sous-titre de fin dit l'offre « ${v.offre} » (texte = offre du JSON)`, x.fin.toLowerCase().includes(v.offre))
  const f = path.join(DIR, `${v.id}.mp4`)
  const sous = v.sousTitres
  const attendu = x ? [x.intro, ...(x.etapes || []), x.fin] : []
  T(`${v.id} : ${attendu.length || '?'} sous-titres inscrits (sousTitres), mêmes textes que voix, dans l'ordre`, Array.isArray(sous) && sous.length === attendu.length && attendu.length > 0 && sous.every((c, k) => c.texte === attendu[k]), 'relancer aide-videos-anime.mjs')
  if (!Array.isArray(sous) || !sous.length) continue
  const dur = fs.existsSync(f) ? Number(sonde(f)?.format.duration) : NaN
  const marges = sous.map((c) => c.fin - c.debut - (0.4 * mots(c.texte) + 1.2))
  const courts = marges.map((m, k) => ({ k, m })).filter((c) => !(c.m >= -0.01))
  T(`${v.id} : chaque sous-titre reste affiché ≥ 0,4 s par mot + 1,2 s (marge la plus juste : ${Math.min(...marges).toFixed(2)} s)`, courts.length === 0, courts.map((c) => `#${c.k + 1} manque ${(-c.m).toFixed(2)} s`).join(', '))
  T(`${v.id} : sous-titres ordonnés, sans chevauchement, dans la durée de la vidéo`, sous.every((c, k) => c.debut >= 0 && c.fin > c.debut && (k === 0 || c.debut >= sous[k - 1].fin)) && (!Number.isFinite(dur) || sous[sous.length - 1].fin <= dur + 0.05))
  // Preuve par l'image : au milieu de chaque sous-titre, la zone du bas contient du texte clair ; avant l'intro, elle est vide.
  if (fs.existsSync(f)) {
    const vides = sous.map((c, k) => ({ k, n: pixelsClairs(f, ((c.debut + c.fin) / 2).toFixed(2)) })).filter((c) => c.n === null || c.n < 600)
    T(`${v.id} : à l'image, chaque sous-titre est bien incrusté (texte clair dans la zone du bas)`, vides.length === 0, vides.map((c) => `#${c.k + 1} : ${c.n} px`).join(', '))
    const avant = pixelsClairs(f, 0.1)
    T(`${v.id} : zone des sous-titres vide avant le premier sous-titre (${avant} px)`, avant !== null && avant < 100)
  }
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
