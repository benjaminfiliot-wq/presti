// scripts/atelier-plan-qa.mjs — le juge de la tâche 021-18 : le plan d'atelier choisi, encodé en boucle de 6 à 8 s pour la
// scène plein cadre « Dans l'atelier » au bureau, et recopié dans le site (cahier de la vague 5,
// .orchestre/preuves/021-00/cahier-vague-5.md, §4.2 « Paramètres et sources », §5.2, §6.5 AP-1 à AP-8, §7.0, §7.2 « 021-18 » ;
// RU-6 reporté ici par decisions.md, entrée « Les juges des rushes et de Lenis »). Il lit .orchestre/preuves/021-18/ et
// public/sites-demo/lestraque/video/, génère une copie du site, la sert en local, capture et ré-encode lui-même.
//   AP-1  plan retenu : choix.json → id « mixkit-776-sanding-lumber ». Q-A est tranchée (Claude Code sur délégation de Benj,
//         decisions.md, 2026-09-15 vers 16 h 02 : « le plan 3 de 021-10, Carpenter sanding a piece of lumber ») : la règle
//         « sans réponse » du §4.2 ne s'applique pas, le juge vérifie la décision dans decisions.md. Le plan est sans visage ni
//         lieu reconnaissable dans .orchestre/preuves/021-10/rushes.json ; le sha256 de
//         .orchestre/travail/rushes-atelier/mixkit-776-sanding-lumber.mp4, recalculé, est égal à celui de rushes.json et à
//         choix.json → sha256Source. rushes.json dit aussi « logos : false », ce qui est faux pour ce plan (inscription blanche
//         « makita » sur la ponceuse, relevée le 15/09 vers 17 h 25, .orchestre/en-cours/021-18.question.md) : AP-1 ne juge plus
//         ce champ, AP-6 prend la marque en charge ;
//   AP-2  ffprobe de atelier.av1.mp4 et atelier.h264.mp4 (preuve) : 1280 × 720 ; durée de 6,0 à 8,0 s ; aucune piste audio ;
//         H.264 profil High, niveau ≤ 4.0 ; AV1 profil Main ; ≥ 24 images/s (§4.2, AP-2) ;
//   AP-3  poids : AV1 ≤ 350 000 octets ; H.264 ≤ 600 000 octets (§4.2, §5.2) ;
//   AP-4  raccord de boucle : écart moyen entre la dernière et la première image ≤ 0,03, pour chaque fichier (§4.2) ; aucun
//         à-coup : écart entre deux images consécutives ≤ 0,085 (video-qa.mjs:30, comme OU-5 ; ajouté par le juge) ;
//   AP-5  lisibilité : 8 images de chaque fichier (indices ⌊(i + 0,5) × N / 8⌋), posées en cover dans .atelier__media de la
//         page générée, sous son vrai voile (::after), tout le reste masqué ; pixels des boîtes des mots de .atelier__phrase
//         (Range.getClientRects) ; contraste du texte opaque 1,05 / (p90 de L + 0,05) ≥ 4,5 en 1088 × 800, ≥ 3,0 en
//         1280 × 800 et 1440 × 900, à chaque image mesurée (RC-9 ; WCAG 1.4.3 ; §0.1 ; cahier 020 §8.0). Le contraste avec la
//         couleur calculée du texte est écrit en « · », pour information seulement ;
//   AP-6  mains seules, recadrage et marque :
//         - planche.jpg ≥ 800 px de large et pas uniforme (écart-type du gris ≥ 8) ; rapport.md ≥ 800 caractères, qui nomme la
//           barbe et donne les quatre nombres du recadrage ;
//         - barbe : choix.json → zoneRetiree.description nomme la barbe et le haut du cadre ; zoneRetiree.yBarbeMax (entier ≥ 1)
//           est le y le plus bas atteint par la barbe sur la fenêtre, en pixels de la source ; recadrage.y > yBarbeMax (la
//           valeur est déclarée, mais falsifiable : ligne jaune sur juge/recadrage-source.jpg) ;
//         - marque : decisions.md porte une ligne qui cite 021-18 et la marque ; choix.json → marque.decision en est un extrait
//           exact (≥ 30 caractères) ; marque.traitement vaut « hors-cadre », « miroir » (avec encodage.miroir = true) ou
//           « gardee » ; rapport.md porte, seule sur sa ligne, la réponse qui va avec, et aucune des deux autres :
//             hors-cadre → « visage : non ; logo : non ; lieu reconnaissable : non » (la phrase du cahier, AP-6) ;
//             miroir     → « visage : non ; logo : illisible après recadrage et miroir ; lieu reconnaissable : non » ;
//             gardee     → « visage : non ; logo : marque d'outil lisible, gardée sur décision ; lieu reconnaissable : non » ;
//   AP-7  licence et recopie :
//         - choix.json → licence : page du plan ; relevé ISO du 15/09/2026 ou après, pas dans le futur, à 2 h au plus de
//           l'enregistrement de licence-page.html (date du fichier), et 24 h au plus avant la recopie dans le site (date de
//           lestraque/video/attributions.json ; avant le verdict tant que la recopie manque) ; citation avec « Mixkit Stock Video
//           Free License » ;
//         - licence-page.html porte l'adresse du plan, son titre et ce nom de licence, jamais « Restricted License » ; la page
//           relue en ligne par le juge dit la même chose (si le réseau répond) ;
//         - rapport.md avec auteur, banque, page, nom et lien de la licence, sha256 de la source ;
//         - lestraque/video/attributions.json : une seule entrée, "type": "video", base « atelier », légende, titre exact du
//           plan, auteur, banque, source (page), licence, licenceUrl, fichiers, modifiee ; les deux MP4 de lestraque/video/
//           identiques octet pour octet (sha256) à ceux de la preuve ;
//   AP-8  reste du site (méthode RT-7, durcie) : lestraque/video/ ne contient que atelier.av1.mp4, atelier.h264.mp4 et
//         attributions.json ; git status --porcelain -uall -- public, comparé à l'instantané de l'ORCHESTRE seulement :
//         - en-cours/021-18.avant.txt quand en-cours/021-18.lock existe (la copie de la preuve doit alors lui être identique) ;
//         - sinon preuves/021-18/avant.txt, s'il a été enregistré avant le premier verdict de 021-18 dans verdicts.jsonl ;
//         - jamais un instantané écrit à la main (sans verrou ni verdict : échec) ; instantané refusé s'il porte une ligne de
//           dossier qui couvre public/, public/sites-demo/, _kit/ ou lestraque/ en entier.
//         Ne comptent pas : generer.mjs et les SORTIES du §7.0 (régénération du site) ; les motifs public/ du périmètre des autres
//         fiches, dans file/, en-cours/ (avec verrou), fait/ et refuse/ (verdict ou dépôt depuis la prise), sauf un motif qui
//         couvre à lui seul public/, public/sites-demo/, _kit/ ou lestraque/. Un changement en défaut est remesuré après 2 s.
//         Les chemins laissés aux autres chantiers sont écrits en « · », pour l'œil ;
//   AP-9  ré-encodage refait par le juge (RU-6 reporté) : depuis la source, avec la recette de choix.json → encodage (début,
//         durée, fondu 0 ou 0,5 s, recadrage, miroir) et les réglages exacts du §4.2 : poids à ±3 % des fichiers livrés
//         (RU-6), même nombre d'images, et images identiques (écart moyen < 0,006 à chaque image, video-qa.mjs:27) ;
//   AP-10 mesures.json égal aux mesures recalculées : poids, sha256 et nombre d'images exacts ; durée ±0,05 s ; raccord et
//         écart consécutif ±0,01 ; contraste minimal par format ±0,15. C'est un écho, pas une preuve : la fiche permet de
//         recopier juge/mesures.json, et chacune de ces valeurs est jugée ailleurs sur les fichiers eux-mêmes (AP-2 à AP-5,
//         AP-9). AP-10 n'attrape qu'un mesures.json resté sur un ancien encodage.
//
// Choix du juge (le cahier ne tranche pas) :
//   - images/s : la source est à 24000/1001 ; « ≥ 24 » est lu comme le 24p du cinéma, seuil ≥ 23,97 ;
//   - durée ffprobe jugée à une demi-image près (±0,021 s) ;
//   - AP-5 : boîtes des mots réunies en une zone par image (RC-9 : boîtes des mots, jamais celle du bloc) ; la vidéo est posée
//     en object-fit: cover, centrée, sans agrandissement, sous le voile de .atelier__media (§4.2 ; la feuille de 021-13 n'existe
//     pas encore) ; génération --familles= pour que la mise en page ne dépende d'aucune tâche parallèle ; serveur local sans
//     brotli ni CSP (seuls des pixels sont mesurés). La formule du cahier suppose un texte blanc ; la phrase est en #F4EDE2
//     (L ≈ 0,85) : le contraste réel est environ 15 % plus bas que la mesure (4,5 mesuré ≈ 3,9 réel), d'où la ligne « · »
//     d'information et le regard sur phrase-<format>.jpg ;
//   - recadrage : rapport largeur/hauteur à 1 % de 16/9 (pas de déformation), au moins 960 × 540 (agrandissement ≤ 1,34), dans
//     le cadre de la source ; le miroir horizontal est permis (on n'assombrit jamais l'image, §4.2) ;
//   - la marque : le cahier exige « logo : non », mais la ponceuse porte une marque lisible que le recadrage seul ne semble pas
//     pouvoir exclure (question 021-18). Le juge accepte les trois réponses honnêtes ci-dessus, et seulement une fois la marque
//     tranchée par Claude Code dans decisions.md. Un retour au choix du plan (Q-A) demande un nouveau juge (PLAN est fixe) ;
//   - le fondu de boucle suit une recette fixée (xfade de la fin sur le début, écrite dans la fiche) pour que AP-9 la refasse ;
//     -movflags +faststart aussi sur l'AV1 (lecture progressive ; sans effet sur le poids) ;
//   - licence « relue le jour même » (AP-7) : relevé à 2 h au plus du fichier enregistré, 24 h au plus avant la recopie ; un
//     verdict rejoué plus tard reste valable tant que la recopie n'a pas bougé ;
//   - AP-8 : une fiche d'en-cours/ compte si elle a son verrou, même prise après 021-18 (un chantier légitime peut démarrer
//     pendant la tâche) ; une fiche d'en-cours/ sans verrou est ignorée ; les fiches de file/ comptent toujours (Claude Code
//     termine la vague sans prise, decisions.md « Qui termine la vague 5 ? ») ; limite connue de RT-7 : un fichier déjà modifié
//     à la prise et retouché ensuite ne se voit pas ;
//   - une mesure de page en défaut (scène mal placée, contraste sous le seuil) et une génération de la copie en échec sont
//     refaites une fois après 2 s ;
//   - rapport.md ≥ 800 caractères, comme VC-10 et OU-1 ;
//   - les fichiers du site manquants ne bloquent pas le juge : la recopie vient en dernier (§7.2), le reste est mesuré avant.
//
// Contrôles à l'œil, non jugés ici (Claude Code, CC-2 et §6.10 ; puis Benj sur le film complet, CC-4) :
//   - juge/recadrage-source.jpg : le bout de barbe reste au-dessus de la ligne jaune (yBarbeMax) et hors du rectangle rouge sur
//     toutes les images de la fenêtre (le juge ne sait pas voir une barbe) ;
//   - la marque : le traitement de choix.json est bien celui de la décision, et, pour « hors-cadre » ou « miroir », l'inscription
//     ne se lit plus sur les images à la taille de la scène ;
//   - juge/atelier-planche.jpg : mains seules, geste lisible, aucun visage ;
//   - juge/boucle-x3.mp4 (trois boucles bout à bout, sans réencodage) : aucun saut au raccord (§6.10) ;
//   - juge/phrase-<l>x<h>.jpg : la pire image mesurée sous le voile, boîtes des mots en rouge : la phrase se lit bien ;
//   - les chemins sous public/ laissés aux autres chantiers par AP-8 (ligne « · ») sont bien les leurs.
//
// Usage : node scripts/atelier-plan-qa.mjs
//   essais du juge seulement : --dossier=<preuve> --video=<dossier de la vidéo du site> --avant=<instantané git status>
//   --decisions=<decisions.md d'essai>
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import sharp from 'sharp'

const R = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const opt = (nom, defaut) => { const a = process.argv.find((x) => x.startsWith(`--${nom}=`)); return a ? path.resolve(a.slice(nom.length + 3)) : defaut }
const ID = '021-18'
const PLAN = 'mixkit-776-sanding-lumber'
const P = opt('dossier', path.join(R, '.orchestre', 'preuves', ID))
const DEMOS = path.join(R, 'public', 'sites-demo')
const VIDEO = opt('video', path.join(DEMOS, 'lestraque', 'video'))
const SOURCE = path.join(R, '.orchestre', 'travail', 'rushes-atelier', `${PLAN}.mp4`)
const RUSHES = path.join(R, '.orchestre', 'preuves', '021-10', 'rushes.json')
const DECISIONS = opt('decisions', path.join(R, '.orchestre', 'decisions.md'))
const T = path.join(R, '.orchestre', 'travail', `atelier-plan-qa-${process.pid}`)
process.on('exit', () => { try { fs.rmSync(T, { recursive: true, force: true }) } catch { /* rien à nettoyer */ } })
const JUGE = path.join(P, 'juge')
const LICENCE_NOM = 'Mixkit Stock Video Free License'
const LICENCE_URL = 'https://mixkit.co/license/#videoFree'
const FORMATS = [[1088, 800, 4.5], [1280, 800, 3.0], [1440, 900, 3.0]]
const CODECS = ['h264', 'av1']
const echecs = [], faits = []
const taille = (f) => { try { return fs.statSync(f).isFile() ? fs.statSync(f).size : -1 } catch { return -1 } }
const mtime = (f) => { try { return fs.statSync(f).mtimeMs } catch { return NaN } }
const iso = (ms) => (Number.isFinite(ms) ? new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z') : '?')
const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms))
const rel = (f) => path.relative(R, f).split(path.sep).join('/')
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')
const lireJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return null } }
const texte = (v, n = 1) => typeof v === 'string' && v.trim().length >= n
const nombre = (v) => typeof v === 'number' && Number.isFinite(v)
const fin = () => {
  if (faits.length) console.log(faits.map((f) => `  · ${f}`).join('\n'))
  console.log(echecs.length ? `✗ plan d'atelier : FAIL — ${echecs.join(' ; ')}` : '✓ plan d\'atelier : PASS — plan choisi et source vérifiée, formats et poids, boucle sans saut ni à-coup, phrase lisible sous le voile, barbe et marque traitées selon la décision, ré-encodage identique, licence relue, recopie exacte, site intact')
  process.exitCode = echecs.length ? 1 : 0
}
const ffmpeg = (args, timeout = 600000) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], { encoding: 'utf8', timeout, maxBuffer: 1 << 26 }); return { ok: r.status === 0, erreur: `${r.stderr || ''}${r.error ? r.error.message : ''}`.trim().split('\n').pop() || `code ${r.status}` } }
const sonde = (f) => {
  const s = JSON.parse(spawnSync('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', f], { encoding: 'utf8' }).stdout || '{}')
  const v = (s.streams || []).find((x) => x.codec_type === 'video') || null
  const [a, b] = String(v?.avg_frame_rate || '0/0').split('/').map(Number)
  return { v, duree: Number(s.format?.duration), ips: b ? a / b : 0, audio: (s.streams || []).some((x) => x.codec_type === 'audio') }
}
// réduction grise de 160 × 90 (cahier §0.1), toutes les images du fichier
const gris160 = (f) => {
  const brut = spawnSync('ffmpeg', ['-v', 'error', '-i', f, '-vf', 'scale=160:90,format=gray', '-f', 'rawvideo', '-'], { maxBuffer: 1 << 29, timeout: 600000 }).stdout || Buffer.alloc(0)
  const n = 160 * 90
  return Array.from({ length: Math.floor(brut.length / n) }, (_, i) => brut.subarray(i * n, (i + 1) * n))
}
const ecart = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]); return s / a.length / 255 }
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 }

// la recette de choix.json → encodage, en arguments ffmpeg (les mêmes que dans la fiche 021-18)
const recette = (enc) => {
  const r = enc.recadrage, F = enc.fondu
  const base = `crop=${r.largeur}:${r.hauteur}:${r.x}:${r.y}${enc.miroir ? ',hflip' : ''},scale=1280:720:flags=lanczos,setsar=1`
  const entree = ['-ss', String(enc.debut), '-t', String(Math.round((enc.duree + F) * 1000) / 1000), '-i', SOURCE]
  const graphe = F > 0
    ? ['-filter_complex', `[0:v]${base},split[a][b];[a]trim=start=${F},setpts=PTS-STARTPTS[corps];[b]trim=end=${F},setpts=PTS-STARTPTS[tete];[corps][tete]xfade=transition=fade:duration=${F}:offset=${Math.round((enc.duree - F) * 1000) / 1000},format=yuv420p[v]`, '-map', '[v]']
    : ['-vf', `${base},format=yuv420p`]
  return {
    h264: [...entree, ...graphe, '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-tune', 'film', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an'],
    av1: [...entree, ...graphe, '-c:v', 'libsvtav1', '-preset', '5', '-crf', '40', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an'],
  }
}

// AP-6 : les trois réponses honnêtes sur la marque, chacune seule sur sa ligne du rapport
const REPONSES_LOGO = { 'hors-cadre': 'non', miroir: 'illisible après recadrage et miroir', gardee: 'marque d\'outil lisible, gardée sur décision' }
const ligneMainsSeules = (logo) => new RegExp(`^[ \\t]*(?:[-*][ \\t]+)?visage[ \\t]*:[ \\t]*non[ \\t]*;[ \\t]*logo[ \\t]*:[ \\t]*${logo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '[ \\t]+').replace(/'/g, '[\'’]')}[ \\t]*;[ \\t]*lieu reconnaissable[ \\t]*:[ \\t]*non[ \\t]*\\.?[ \\t]*\\r?$`, 'im')

// AP-8 : lecture de git status et des fiches
const chemins = (txt) => txt.split('\n').map((l) => l.replace(/\r$/, '')).filter((l) => l.trim().length > 3).map((l) => { let p = l.slice(3).trim(); if (p.includes(' -> ')) p = p.split(' -> ').pop(); return p.replace(/^"|"$/g, '') })
const versRegex = (g) => new RegExp(`^${String(g).trim().replace(/[.+^$()|[\]\\]/g, '\\$&').replace(/\{([^}]*)\}/g, (_, x) => `(${x.split(',').join('|')})`).replace(/\*\*\/?/g, '@@ETOILES@@').replace(/\*/g, '[^/]*').replace(/\?/g, '[^/]').replace(/@@ETOILES@@/g, '.*')}$`)
const liste = (s) => { const l = []; let prof = 0, cur = ''; for (const ch of s) { if (ch === '{') prof++; if (ch === '}') prof--; if (ch === ',' && prof === 0) { l.push(cur); cur = '' } else cur += ch } l.push(cur); return l.map((x) => x.trim()).filter(Boolean) }
const RACINES = ['public/', 'public/sites-demo/', 'public/sites-demo/_kit/', 'public/sites-demo/lestraque/']
const SORTIES = ['index.html', 'styles.css', 'bureau.css', 'site.js', 'relief.js', 'relief-fil.js', 'sitemap.xml', 'robots.txt', 'favicon.svg'].map((f) => `public/sites-demo/lestraque/${f}`)
const estSortie = (p) => p === 'public/sites-demo/generer.mjs' || SORTIES.includes(p) || /^public\/sites-demo\/lestraque\/(fonts|mentions-legales|confidentialite|menuisier-[^/]*)\//.test(p)

async function principal() {
  // ── fichiers ──────────────────────────────────────────────────────────────────────────────────────────────────
  const REQUIS = [
    ['AP-1', path.join(P, 'choix.json')], ['AP-2', path.join(P, 'atelier.h264.mp4')], ['AP-2', path.join(P, 'atelier.av1.mp4')],
    ['AP-6', path.join(P, 'planche.jpg')], ['AP-6', path.join(P, 'rapport.md')], ['AP-7', path.join(P, 'licence-page.html')],
    ['AP-10', path.join(P, 'mesures.json')], ['AP-1', SOURCE], ['AP-1', RUSHES],
  ]
  for (const [c, f] of REQUIS) if (taille(f) <= 0) echecs.push(`${c} : ${rel(f)} absent ou vide`)
  if (echecs.length) return
  // la recopie dans le site vient en dernier (fiche 021-18) : son absence est un échec, mais le juge mesure tout le reste
  const SITE_VIDEO = ['atelier.h264.mp4', 'atelier.av1.mp4', 'attributions.json']
  const recopie = SITE_VIDEO.every((x) => taille(path.join(VIDEO, x)) > 0)
  for (const x of SITE_VIDEO) if (taille(path.join(VIDEO, x)) <= 0) echecs.push(`AP-7 : ${rel(path.join(VIDEO, x))} absent ou vide (recopie dans le site)`)

  // ── AP-1 : le plan retenu et sa source ────────────────────────────────────────────────────────────────────────
  const choix = lireJson(path.join(P, 'choix.json'))
  if (!choix || typeof choix !== 'object') { echecs.push('AP-1 : choix.json illisible'); return }
  if (choix.id !== PLAN) echecs.push(`AP-1 : choix.json → id « ${choix.id} », « ${PLAN} » attendu (Q-A, decisions.md 16 h 02)`)
  const decisions = taille(DECISIONS) > 0 ? fs.readFileSync(DECISIONS, 'utf8') : ''
  if (!/Q-A/.test(decisions) || !/Carpenter sanding a piece of lumber/.test(decisions)) echecs.push('AP-1 : decisions.md ne porte plus la réponse à Q-A (« Carpenter sanding a piece of lumber »)')
  const plan = (lireJson(RUSHES)?.plans || []).find((p) => p.id === PLAN)
  if (!plan) { echecs.push(`AP-1 : le plan ${PLAN} est absent de rushes.json (021-10)`); return }
  if (!(plan.visages === false && plan.lieuReconnaissable === false)) echecs.push('AP-1 : le plan n\'est pas sans visage ni lieu reconnaissable dans rushes.json')
  faits.push(`rushes.json : visages ${plan.visages}, lieu reconnaissable ${plan.lieuReconnaissable}, logos ${plan.logos} (champ logos non jugé : une marque est relevée sur la ponceuse, AP-6)`)
  const shaSource = sha(SOURCE)
  faits.push(`source ${PLAN}.mp4 : sha256 ${shaSource.slice(0, 16)}…, rushes.json ${String(plan.sha256).slice(0, 16)}…`)
  if (shaSource !== String(plan.sha256).toLowerCase()) echecs.push('AP-1 : le sha256 de la source diffère de celui de rushes.json')
  if (String(choix.sha256Source || '').toLowerCase() !== shaSource) echecs.push('AP-1 : choix.json → sha256Source diffère du sha256 de la source')
  const src = sonde(SOURCE)
  if (!src.v) { echecs.push('AP-1 : la source n\'a pas de piste vidéo lisible'); return }

  // la recette (AP-6 pour le haut du cadre, AP-9 pour tout le reste)
  const enc = choix.encodage || {}, rec = enc.recadrage || {}
  const recetteEchecs = []
  if (!nombre(enc.debut) || enc.debut < 0) recetteEchecs.push(`début ${enc.debut} (nombre ≥ 0 attendu)`)
  if (!nombre(enc.duree) || enc.duree < 6 || enc.duree > 8) recetteEchecs.push(`durée ${enc.duree} (de 6 à 8 s)`)
  if (![0, 0.5].includes(enc.fondu)) recetteEchecs.push(`fondu ${enc.fondu} (0 ou 0.5)`)
  if (enc.miroir !== undefined && typeof enc.miroir !== 'boolean') recetteEchecs.push('miroir doit valoir true ou false')
  if (!recetteEchecs.length && enc.debut + enc.duree + enc.fondu > src.duree - 0.05) recetteEchecs.push(`fenêtre ${enc.debut} + ${enc.duree} + ${enc.fondu} s au-delà de la source (${src.duree.toFixed(2)} s)`)
  if (![rec.x, rec.y, rec.largeur, rec.hauteur].every((v) => Number.isInteger(v) && v >= 0)) recetteEchecs.push('recadrage {x, y, largeur, hauteur} en entiers ≥ 0 attendu')
  else {
    if (rec.x + rec.largeur > src.v.width || rec.y + rec.hauteur > src.v.height) recetteEchecs.push(`recadrage hors du cadre ${src.v.width} × ${src.v.height}`)
    if (Math.abs(rec.largeur / rec.hauteur - 16 / 9) > 0.01 * 16 / 9) recetteEchecs.push(`recadrage ${rec.largeur} × ${rec.hauteur} hors 16:9 (±1 %)`)
    if (rec.largeur < 960 || rec.hauteur < 540) recetteEchecs.push(`recadrage ${rec.largeur} × ${rec.hauteur}, 960 × 540 au moins`)
  }
  for (const e of recetteEchecs) echecs.push(`AP-9 : choix.json → encodage : ${e}`)
  const recetteValide = !recetteEchecs.length

  // ── AP-6 : la barbe (zone retirée) et la marque (décision) ────────────────────────────────────────────────────
  if (Number.isInteger(rec.y) && rec.y < 1) echecs.push('AP-6 : le recadrage garde le haut du cadre (y = 0), où passe le bout de barbe')
  const zr = choix.zoneRetiree && typeof choix.zoneRetiree === 'object' ? choix.zoneRetiree : {}
  if (!texte(zr.description) || !/barbe/i.test(zr.description) || !/haut/i.test(zr.description)) echecs.push('AP-6 : choix.json → zoneRetiree.description doit dire quelle bande du haut du cadre a été retirée, et qu\'elle contient la barbe')
  const yBarbeValide = Number.isInteger(zr.yBarbeMax) && zr.yBarbeMax >= 1
  if (!yBarbeValide) echecs.push(`AP-6 : choix.json → zoneRetiree.yBarbeMax ${JSON.stringify(zr.yBarbeMax)} : entier ≥ 1 attendu, le y le plus bas atteint par la barbe sur toute la fenêtre (pixels de la source)`)
  else if (Number.isInteger(rec.y) && rec.y <= zr.yBarbeMax) echecs.push(`AP-6 : recadrage.y = ${rec.y}, pas au-delà de zoneRetiree.yBarbeMax = ${zr.yBarbeMax} : la barbe reste dans le cadre gardé`)
  if (recetteValide) faits.push(`recette : ${enc.debut} s + ${enc.duree} s, fondu ${enc.fondu} s, recadrage ${rec.largeur} × ${rec.hauteur} en (${rec.x}, ${rec.y})${enc.miroir ? ', miroir' : ''} ; barbe déclarée jusqu'à y = ${zr.yBarbeMax}`)
  const lignesMarque = decisions.split('\n').filter((l) => l.includes(ID) && /marque|makita/i.test(l))
  const marque = choix.marque && typeof choix.marque === 'object' ? choix.marque : {}
  const traitementValide = typeof marque.traitement === 'string' && Object.hasOwn(REPONSES_LOGO, marque.traitement)
  if (!lignesMarque.length) echecs.push(`AP-6 : ${path.basename(DECISIONS)} ne tranche pas la marque lisible sur la ponceuse (aucune ligne qui cite ${ID} et la marque ; question en-cours/${ID}.question.md) : Claude Code tranche avant la reprise`)
  if (!traitementValide) echecs.push(`AP-6 : choix.json → marque.traitement ${JSON.stringify(marque.traitement)} : « hors-cadre », « miroir » ou « gardee », comme la décision l'indique`)
  if (lignesMarque.length && !(texte(marque.decision, 30) && lignesMarque.some((l) => l.includes(marque.decision.trim())))) echecs.push('AP-6 : choix.json → marque.decision n\'est pas un extrait exact, de 30 caractères au moins, de la ligne de decisions.md qui tranche la marque')
  if (marque.traitement === 'miroir' && enc.miroir !== true) echecs.push('AP-6 : marque.traitement « miroir » alors que encodage.miroir n\'est pas true')
  if (lignesMarque.length && traitementValide) faits.push(`marque : traitement « ${marque.traitement} », décision citée « ${String(marque.decision).trim().slice(0, 80)}… » (à comparer à la décision, pour l'œil)`)

  // ── AP-2, AP-3 : formats et poids ─────────────────────────────────────────────────────────────────────────────
  const F = { h264: path.join(P, 'atelier.h264.mp4'), av1: path.join(P, 'atelier.av1.mp4') }
  const mesure = { poids: {}, sha256: {}, duree: {}, images: {}, raccord: {}, ecartMaxConsecutif: {}, contrasteMin: {} }
  for (const c of CODECS) {
    const s = sonde(F[c]), v = s.v
    mesure.poids[c] = taille(F[c]); mesure.sha256[c] = sha(F[c]); mesure.duree[c] = s.duree
    if (!v) { echecs.push(`AP-2 : atelier.${c}.mp4 sans piste vidéo lisible`); continue }
    faits.push(`atelier.${c}.mp4 : ${v.codec_name} ${v.profile} niveau ${v.level}, ${v.width} × ${v.height}, ${s.duree.toFixed(3)} s à ${s.ips.toFixed(3)} images/s, ${mesure.poids[c]} octets`)
    if (v.width !== 1280 || v.height !== 720) echecs.push(`AP-2 : atelier.${c}.mp4 en ${v.width} × ${v.height}, 1280 × 720 attendu`)
    if (!(s.duree >= 6.0 - 0.021 && s.duree <= 8.0 + 0.021)) echecs.push(`AP-2 : atelier.${c}.mp4 dure ${Number(s.duree).toFixed(3)} s, de 6,0 à 8,0 attendu`)
    if (s.audio) echecs.push(`AP-2 : atelier.${c}.mp4 a une piste audio`)
    if (s.ips < 23.97) echecs.push(`AP-2 : atelier.${c}.mp4 à ${s.ips.toFixed(2)} images/s, 24 au moins`)
    if (c === 'h264' && (v.codec_name !== 'h264' || !/^High$/i.test(v.profile || '') || !(Number(v.level) <= 40))) echecs.push(`AP-2 : H.264 ${v.codec_name} profil ${v.profile} niveau ${v.level} (h264 High, niveau ≤ 4.0 attendu)`)
    if (c === 'av1' && (v.codec_name !== 'av1' || !/Main/i.test(v.profile || ''))) echecs.push(`AP-2 : AV1 ${v.codec_name} profil ${v.profile} (av1 Main attendu)`)
  }
  if (mesure.poids.av1 > 350000) echecs.push(`AP-3 : AV1 ${mesure.poids.av1} octets, 350 000 au plus`)
  if (mesure.poids.h264 > 600000) echecs.push(`AP-3 : H.264 ${mesure.poids.h264} octets, 600 000 au plus`)

  // ── AP-6 : planche et rapport ─────────────────────────────────────────────────────────────────────────────────
  try {
    const m = await sharp(path.join(P, 'planche.jpg')).metadata(), st = await sharp(path.join(P, 'planche.jpg')).greyscale().stats()
    if (m.width < 800) echecs.push(`AP-6 : planche.jpg de ${m.width} px de large, 800 au moins`)
    if (st.channels[0].stdev < 8) echecs.push(`AP-6 : planche.jpg uniforme (écart-type ${st.channels[0].stdev.toFixed(1)}) : une planche vide n'est pas une preuve`)
  } catch { echecs.push('AP-6 : planche.jpg n\'est pas une image lisible') }
  const rapport = fs.readFileSync(path.join(P, 'rapport.md'), 'utf8')
  if (rapport.length < 800) echecs.push(`AP-6 : rapport.md de ${rapport.length} caractères, 800 au moins`)
  if (!/barbe/i.test(rapport)) echecs.push('AP-6 : rapport.md sans la barbe retirée par le recadrage')
  if (traitementValide) {
    const attendue = REPONSES_LOGO[marque.traitement]
    if (!ligneMainsSeules(attendue).test(rapport)) echecs.push(`AP-6 : rapport.md sans la ligne seule « visage : non ; logo : ${attendue} ; lieu reconnaissable : non » (marque « ${marque.traitement} »)`)
    const autre = Object.entries(REPONSES_LOGO).find(([k, v]) => k !== marque.traitement && ligneMainsSeules(v).test(rapport))
    if (autre) echecs.push(`AP-6 : rapport.md porte aussi la réponse de la marque « ${autre[0]} » : une seule réponse`)
  } else if (!Object.values(REPONSES_LOGO).some((v) => ligneMainsSeules(v).test(rapport))) echecs.push('AP-6 : rapport.md sans la ligne seule « visage : non ; logo : … ; lieu reconnaissable : non »')
  if (recetteValide) {
    const absents = ['x', 'y', 'largeur', 'hauteur'].filter((k) => !new RegExp(`(^|[^0-9])${rec[k]}([^0-9]|$)`).test(rapport))
    if (absents.length) echecs.push(`AP-6 : rapport.md ne donne pas le recadrage de choix.json (${absents.map((k) => `${k} = ${rec[k]}`).join(', ')})`)
  }

  // ── AP-7 : licence, crédit, recopie ───────────────────────────────────────────────────────────────────────────
  for (const [nom, motif] of [['l\'auteur Marco Lopez', /Marco Lopez/], ['la banque Mixkit', /Mixkit/], [`la licence « ${LICENCE_NOM} »`, new RegExp(LICENCE_NOM)], ['la page du plan', new RegExp(String(plan.page).replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'))], ['le lien du texte de la licence', /mixkit\.co\/license/], ['le sha256 de la source', new RegExp(shaSource, 'i')]]) if (!motif.test(rapport)) echecs.push(`AP-7 : rapport.md sans ${nom}`)
  const lic = choix.licence || {}
  if (lic.page !== plan.page) echecs.push(`AP-7 : choix.json → licence.page ${JSON.stringify(lic.page)}, ${plan.page} attendu`)
  const COPIE = path.join(P, 'licence-page.html')
  const releve = new Date(lic.releve)
  if (Number.isNaN(releve.getTime()) || releve < new Date('2026-09-15T00:00:00+02:00') || releve > new Date(Date.now() + 3600000)) echecs.push(`AP-7 : choix.json → licence.releve ${JSON.stringify(lic.releve)} (date ISO du 15/09/2026 ou après, pas dans le futur)`)
  else {
    const enregistree = mtime(COPIE)
    if (!(Math.abs(enregistree - releve.getTime()) <= 2 * 3600000)) echecs.push(`AP-7 : licence-page.html enregistrée le ${iso(enregistree)}, à plus de 2 h du relevé déclaré (${lic.releve}) : ce n'est pas la copie de ce relevé`)
    const repere = recopie ? mtime(path.join(VIDEO, 'attributions.json')) : Date.now()
    if (repere - releve.getTime() > 24 * 3600000) echecs.push(`AP-7 : licence relevée le ${lic.releve}, plus de 24 h avant ${recopie ? `la recopie dans le site (${iso(repere)})` : 'ce verdict'} : la licence se relit le jour même`)
  }
  if (!texte(lic.citation, 20) || !lic.citation.includes(LICENCE_NOM)) echecs.push(`AP-7 : choix.json → licence.citation sans « ${LICENCE_NOM} »`)
  const copie = fs.readFileSync(COPIE, 'utf8')
  if (!copie.includes(plan.titre) || !copie.includes(LICENCE_NOM)) echecs.push(`AP-7 : licence-page.html n'est pas la page du plan avec sa licence (titre « ${plan.titre} » et « ${LICENCE_NOM} » attendus)`)
  if (!copie.includes(plan.page)) echecs.push(`AP-7 : licence-page.html ne porte pas l'adresse du plan (${plan.page}) : ce n'est pas la page enregistrée`)
  if (/Restricted License/i.test(copie)) echecs.push('AP-7 : licence-page.html mentionne « Restricted License »')
  try {
    const rep = await fetch(plan.page, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }, signal: AbortSignal.timeout(15000) })
    const html = rep.ok ? await rep.text() : ''
    if (rep.ok && html.includes(plan.titre)) {
      const libre = html.includes(LICENCE_NOM) && !/Restricted License/i.test(html)
      faits.push(`page du plan relue en ligne par le juge : ${libre ? LICENCE_NOM : 'licence Free introuvable ou « Restricted »'}`)
      if (!libre) echecs.push('AP-7 : la page du plan, relue par le juge, ne donne plus la licence Free')
    } else faits.push(`page du plan non relue par le juge (réponse ${rep.status}${rep.ok ? ', titre absent' : ''}) : la copie datée fait foi`)
  } catch (e) { faits.push(`page du plan non relue par le juge (${e.name}) : la copie datée fait foi`) }
  for (const c of CODECS) {
    if (!recopie) break
    const f = path.join(VIDEO, `atelier.${c}.mp4`)
    if (sha(f) !== mesure.sha256[c]) echecs.push(`AP-7 : lestraque/video/atelier.${c}.mp4 diffère de celui de la preuve (sha256)`)
  }
  const attr = recopie ? lireJson(path.join(VIDEO, 'attributions.json')) : []
  if (!recopie) { /* absence déjà comptée */ } else if (!Array.isArray(attr)) echecs.push('AP-7 : lestraque/video/attributions.json n\'est pas une liste JSON (le générateur la concatène aux photos)')
  else if (attr.length !== 1) echecs.push(`AP-7 : lestraque/video/attributions.json a ${attr.length} entrées, une seule attendue`)
  else {
    const a = attr[0] || {}, pb = []
    if (a.type !== 'video') pb.push(`type ${JSON.stringify(a.type)} ("video" attendu)`)
    if (a.base !== 'atelier') pb.push(`base ${JSON.stringify(a.base)} ("atelier" attendu)`)
    if (!texte(a.legende, 10)) pb.push('legende absente')
    if (a.titre !== plan.titre) pb.push(`titre ${JSON.stringify(a.titre)} ("${plan.titre}" attendu)`)
    if (a.auteur !== plan.auteur) pb.push(`auteur ${JSON.stringify(a.auteur)} (${plan.auteur} attendu)`)
    if (a.banque !== 'Mixkit') pb.push(`banque ${JSON.stringify(a.banque)} ("Mixkit" attendu)`)
    if (a.source !== plan.page) pb.push(`source ${JSON.stringify(a.source)} (la page du plan attendue)`)
    if (a.licence !== LICENCE_NOM) pb.push(`licence ${JSON.stringify(a.licence)} ("${LICENCE_NOM}" attendu)`)
    if (a.licenceUrl !== LICENCE_URL) pb.push(`licenceUrl ${JSON.stringify(a.licenceUrl)} ("${LICENCE_URL}" attendu)`)
    if (!Array.isArray(a.fichiers) || JSON.stringify([...a.fichiers].sort()) !== JSON.stringify(['video/atelier.av1.mp4', 'video/atelier.h264.mp4'])) pb.push('fichiers ["video/atelier.av1.mp4", "video/atelier.h264.mp4"] attendu')
    if (!texte(a.modifiee, 20)) pb.push('modifiee (extrait, recadrage, réencodage) absent')
    if (pb.length) echecs.push(`AP-7 : lestraque/video/attributions.json : ${pb.join(', ')}`)
  }

  // ── AP-8 : le reste du site, contre l'instantané de l'orchestre ───────────────────────────────────────────────
  {
    const contenu = !fs.existsSync(VIDEO) ? [] : fs.readdirSync(VIDEO, { withFileTypes: true }).map((e) => (e.isDirectory() ? `${e.name}/` : e.name)).sort()
    const attendus = ['atelier.av1.mp4', 'atelier.h264.mp4', 'attributions.json']
    if (contenu.length && JSON.stringify(contenu) !== JSON.stringify(attendus)) echecs.push(`AP-8 : lestraque/video/ contient ${contenu.join(', ')} (seulement ${attendus.join(', ')})`)
    const ENC = path.join(R, '.orchestre', 'en-cours')
    const lireLock = (f) => { if (taille(f) <= 0) return null; const o = {}; for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) { const i = l.indexOf(':'); if (i > 0) o[l.slice(0, i).trim()] = l.slice(i + 1).trim() } return o }
    const verdicts = new Map()
    try {
      for (const l of fs.readFileSync(path.join(R, '.orchestre', 'verdicts.jsonl'), 'utf8').split('\n')) {
        try { const v = JSON.parse(l), t = Date.parse(v.date); if (v.id && Number.isFinite(t)) verdicts.set(v.id, [...(verdicts.get(v.id) || []), t]) } catch { /* ligne vide ou illisible */ }
      }
    } catch { /* aucun verdict encore */ }
    const argAvant = process.argv.find((x) => x.startsWith('--avant='))
    const lock = lireLock(path.join(ENC, `${ID}.lock`))
    const avantEnCours = path.join(ENC, `${ID}.avant.txt`), avantPreuve = path.join(P, 'avant.txt')
    let fAvant = null, prise = NaN, origine = ''
    if (argAvant) { fAvant = path.resolve(argAvant.slice(8)); prise = mtime(fAvant); origine = `instantané d'essai ${fAvant}` }
    else if (lock && Number.isFinite(Date.parse(lock.depuis)) && taille(avantEnCours) >= 0) {
      fAvant = avantEnCours; prise = Date.parse(lock.depuis); origine = `instantané de l'orchestre (prise par ${lock.agent || '?'} le ${lock.depuis})`
      if (taille(avantPreuve) >= 0 && fs.readFileSync(avantPreuve, 'utf8') !== fs.readFileSync(avantEnCours, 'utf8')) echecs.push(`AP-8 : ${rel(avantPreuve)} diffère de l'instantané de l'orchestre (en-cours/${ID}.avant.txt) : l'instantané ne se réécrit pas`)
    } else if (taille(avantPreuve) >= 0 && (verdicts.get(ID) || []).length && mtime(avantPreuve) <= Math.min(...verdicts.get(ID)) + 5000) {
      fAvant = avantPreuve; prise = mtime(avantPreuve); origine = `copie de l'instantané de l'orchestre (enregistrée le ${iso(prise)}, avant le premier verdict de ${ID})`
    }
    if (!fAvant || taille(fAvant) < 0) {
      if (taille(avantPreuve) >= 0) faits.push(`AP-8 : ${rel(avantPreuve)} ignoré : ni verrou de l'orchestre, ni verdict de ${ID} qui le précède (instantané écrit hors de l'orchestre)`)
      echecs.push(`AP-8 : aucun instantané de l'orchestre pour ${ID} (en-cours/${ID}.lock et en-cours/${ID}.avant.txt, ou copie dans la preuve antérieure au premier verdict) : la tâche se prend par « node scripts/orchestre.mjs prochaine --agent=claude-code --tache=${ID} » avant toute écriture dans public/`)
    } else {
      const avant = chemins(fs.readFileSync(fAvant, 'utf8'))
      const couvrantes = avant.filter((a) => a.endsWith('/') && RACINES.some((r) => r.startsWith(a)))
      if (couvrantes.length) echecs.push(`AP-8 : instantané ${rel(fAvant)} refusé : la ligne « ${couvrantes[0]} » couvre tout un pan du site, rien n'y serait jugé`)
      else {
        const dejaSale = (p) => avant.some((a) => a === p || (a.endsWith('/') && p.startsWith(a)))
        const sentinelles = RACINES.map((r) => `${r}zz-sentinelle-du-juge`)
        const motifs = [], trop = []
        for (const d of ['file', 'en-cours', 'fait', 'refuse']) {
          const dir = path.join(R, '.orchestre', d)
          for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
            if (!/^\d{3}-[\w-]+\.md$/.test(f)) continue
            const id = f.replace(/\.md$/, '')
            if (id === ID || id.startsWith(`${ID}-`)) continue
            if (d === 'en-cours' && taille(path.join(dir, `${id}.lock`)) <= 0) { faits.push(`AP-8 : en-cours/${f} sans verrou, fiche ignorée`); continue }
            if ((d === 'fait' || d === 'refuse') && !(mtime(path.join(dir, f)) >= prise || (verdicts.get(id) || []).some((t) => t >= prise))) continue
            const m = fs.readFileSync(path.join(dir, f), 'utf8').match(/^perimetre:\s*\[(.*)\]\s*$/m)
            if (!m) continue
            for (const g of liste(m[1])) {
              if (!g.startsWith('public/')) continue
              let re
              try { re = versRegex(g) } catch { continue }
              if (sentinelles.some((s) => re.test(s))) { trop.push(`${d}/${id} « ${g} »`); continue }
              motifs.push({ re, qui: `${d}/${id}` })
            }
          }
        }
        const statut = () => { const r = spawnSync('git', ['status', '--porcelain', '--untracked-files=all', '--', 'public'], { cwd: R, encoding: 'utf8', maxBuffer: 1 << 26, timeout: 300000 }); return r.status === 0 ? chemins(r.stdout || '') : null }
        const classer = (tous) => {
          const laisses = [], nouveaux = []
          for (const p of tous) {
            if (p.startsWith('public/sites-demo/lestraque/video/') || dejaSale(p)) continue
            if (estSortie(p)) { laisses.push(`${p} (générateur ou SORTIES)`); continue }
            const m = motifs.find((x) => x.re.test(p))
            if (m) laisses.push(`${p} (${m.qui})`)
            else nouveaux.push(p)
          }
          return { laisses, nouveaux }
        }
        const s1 = statut()
        if (!s1) echecs.push('AP-8 : git status impossible')
        else {
          let { laisses, nouveaux } = classer(s1)
          if (nouveaux.length) { await attendre(2000); const s2 = statut(); if (s2) { const encore = new Set(classer(s2).nouveaux); nouveaux = nouveaux.filter((p) => encore.has(p)) } }
          faits.push(`AP-8 : ${origine} ; périmètres des autres fiches : ${[...new Set(motifs.map((x) => x.qui))].join(', ') || 'aucun'}${trop.length ? ` ; motifs trop larges refusés : ${trop.join(', ')}` : ''}`)
          if (laisses.length) faits.push(`AP-8 : changés depuis la prise, laissés aux autres chantiers (à regarder) : ${laisses.slice(0, 12).join(', ')}${laisses.length > 12 ? ` et ${laisses.length - 12} autres` : ''}`)
          faits.push(`AP-8 : ${nouveaux.length} changement(s) sous public/ à imputer à ${ID}, hors lestraque/video/`)
          if (nouveaux.length) echecs.push(`AP-8 : fichiers changés sous public/ hors de lestraque/video/ : ${nouveaux.slice(0, 6).join(', ')}${nouveaux.length > 6 ? '…' : ''}`)
        }
      }
    }
  }

  // ── AP-4 : raccord et à-coups ─────────────────────────────────────────────────────────────────────────────────
  const gris = {}
  for (const c of CODECS) {
    gris[c] = gris160(F[c])
    const g = gris[c]
    mesure.images[c] = g.length
    if (g.length < 140) { echecs.push(`AP-4 : ${g.length} images décodées de atelier.${c}.mp4`); continue }
    let pic = 0; for (let k = 1; k < g.length; k++) pic = Math.max(pic, ecart(g[k - 1], g[k]))
    mesure.raccord[c] = ecart(g[g.length - 1], g[0]); mesure.ecartMaxConsecutif[c] = pic
    faits.push(`atelier.${c}.mp4 : ${g.length} images, raccord dernière/première ${mesure.raccord[c].toFixed(4)}, pic entre deux images ${pic.toFixed(4)}`)
    if (mesure.raccord[c] > 0.03) echecs.push(`AP-4 : atelier.${c}.mp4, écart ${mesure.raccord[c].toFixed(4)} entre la dernière et la première image, 0,03 au plus : saut à chaque boucle`)
    if (pic > 0.085) echecs.push(`AP-4 : atelier.${c}.mp4, écart ${pic.toFixed(4)} entre deux images consécutives, 0,085 au plus : à-coup ou coupe`)
  }

  // ── AP-5 : la phrase de l'atelier sur la vidéo, sous le vrai voile, dans la page générée ──────────────────────
  const IMAGES = path.join(T, 'images')
  fs.mkdirSync(IMAGES, { recursive: true })
  const cadres = []
  for (const c of CODECS) {
    const n = mesure.images[c] || 0
    if (n < 8) continue
    const ks = Array.from({ length: 8 }, (_, i) => Math.floor((i + 0.5) * n / 8))
    const r = ffmpeg(['-i', F[c], '-vf', `select=${ks.map((k) => `eq(n\\,${k})`).join('+')}`, '-fps_mode', 'passthrough', path.join(IMAGES, `${c}-%d.png`)])
    for (let i = 1; i <= 8; i++) if (taille(path.join(IMAGES, `${c}-${i}.png`)) > 0) cadres.push({ c, i, k: ks[i - 1], url: `/_juge-images/${c}-${i}.png` })
    if (!r.ok || cadres.filter((x) => x.c === c).length !== 8) echecs.push(`AP-5 : 8 images de atelier.${c}.mp4 non extraites (${r.erreur})`)
  }
  const SITE = path.join(T, 'site')
  const generer = () => spawnSync(process.execPath, [path.join(DEMOS, 'generer.mjs'), 'lestraque', '--familles=', `--sortie=${SITE}`], { cwd: R, encoding: 'utf8', timeout: 300000 })
  let gen = generer()
  if (gen.status !== 0) { await attendre(2000); try { fs.rmSync(SITE, { recursive: true, force: true }) } catch { /* rien */ } gen = generer() }
  if (gen.status !== 0) echecs.push(`AP-5 : génération de la copie en échec, deux fois à 2 s d'écart (${`${gen.stdout || ''}${gen.stderr || ''}`.trim().split('\n').pop()?.slice(0, 200)})`)
  else if (cadres.length) {
    const TYPES = { html: 'text/html; charset=utf-8', css: 'text/css', js: 'text/javascript', webp: 'image/webp', avif: 'image/avif', jpg: 'image/jpeg', png: 'image/png', woff2: 'font/woff2', svg: 'image/svg+xml', json: 'application/json', mp4: 'video/mp4' }
    const srv = http.createServer((q, r) => {
      let p = decodeURIComponent(new URL(q.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'
      let f = p.startsWith('/_juge-images/') ? path.join(IMAGES, path.basename(p)) : path.join(SITE, p)
      if (!p.startsWith('/_juge-images/') && !fs.existsSync(f)) f = [path.join(DEMOS, 'lestraque', p), path.join(DEMOS, p)].find((x) => fs.existsSync(x)) || f
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end() }
      r.writeHead(200, { 'content-type': TYPES[path.extname(f).slice(1)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r)
    })
    await new Promise((ok) => srv.listen(0, '127.0.0.1', ok))
    const nav = await chromium.launch()
    try {
      const mesurerFormat = async (l, h) => {
        const ctx = await nav.newContext({ viewport: { width: l, height: h }, deviceScaleFactor: 1 })
        try {
          const page = await ctx.newPage()
          await page.goto(`http://127.0.0.1:${srv.address().port}/index.html`, { waitUntil: 'load', timeout: 60000 })
          await page.evaluate(() => document.fonts.ready)
          const y = await page.evaluate(() => { const s = document.querySelector('#atelier'); return s ? Math.round(s.getBoundingClientRect().top + scrollY) : null })
          if (y === null) return { erreur: 'aucune scène #atelier dans l\'accueil généré' }
          await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y)
          await page.waitForTimeout(2000)
          const geo = await page.evaluate(() => {
            for (const a of document.getAnimations()) { try { if (a.timeline === document.timeline) a.pause() } catch { /* animation déjà finie */ } }
            const s = document.querySelector('#atelier'), m = s.querySelector('.atelier__media'), rects = []
            const phrases = [...s.querySelectorAll('.atelier__phrase')]
            for (const p of phrases) {
              const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT)
              for (let n = w.nextNode(); n; n = w.nextNode()) {
                for (const mot of n.textContent.matchAll(/\S+/g)) {
                  const r = document.createRange(); r.setStart(n, mot.index); r.setEnd(n, mot.index + mot[0].length)
                  for (const b of r.getClientRects()) if (b.width > 0 && b.height > 0) rects.push({ x: b.left, y: b.top, l: b.width, h: b.height })
                }
              }
            }
            const mr = m ? m.getBoundingClientRect() : null
            return { haut: s.getBoundingClientRect().top, media: mr && { x: mr.left, y: mr.top, l: mr.width, h: mr.height }, rects, phrases: phrases.length, texte: phrases.map((p) => p.textContent.trim()).join(' '), couleur: phrases.length ? getComputedStyle(phrases[0]).color : '' }
          })
          if (!geo.media) return { erreur: 'aucun .atelier__media dans #atelier' }
          if (!geo.rects.length) return { erreur: 'aucune boîte de mot dans .atelier__phrase' }
          if (Math.abs(geo.haut) > 2) return { erreur: `la scène #atelier est à ${Math.round(geo.haut)} px du haut de l'écran après défilement` }
          const x0 = Math.max(0, Math.floor(Math.min(...geo.rects.map((b) => b.x)))), y0 = Math.max(0, Math.floor(Math.min(...geo.rects.map((b) => b.y))))
          const x1 = Math.min(l, Math.ceil(Math.max(...geo.rects.map((b) => b.x + b.l)))), y1 = Math.min(h, Math.ceil(Math.max(...geo.rects.map((b) => b.y + b.h))))
          if (x1 <= x0 || y1 <= y0) return { erreur: 'la phrase de l\'atelier est hors de l\'écran' }
          const zone = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }
          const masque = new Uint8Array(zone.width * zone.height)
          for (const b of geo.rects) for (let py = 0; py < zone.height; py++) { const cy = y0 + py + 0.5; if (cy < b.y || cy > b.y + b.h) continue; for (let px = 0; px < zone.width; px++) { const cx = x0 + px + 0.5; if (cx >= b.x && cx <= b.x + b.l) masque[py * zone.width + px] = 1 } }
          await page.addStyleTag({ content: 'body *{visibility:hidden!important}#atelier .atelier__media{visibility:visible!important}#atelier .atelier__media picture,#atelier .atelier__media video,#atelier .atelier__media canvas{visibility:hidden!important}#atelier .atelier__media #juge-image{visibility:visible!important;position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 50%;scale:none!important;translate:none!important;transform:none!important;animation:none!important;filter:none!important;opacity:1!important}' })
          await page.evaluate(() => { const i = document.createElement('img'); i.id = 'juge-image'; i.alt = ''; document.querySelector('#atelier .atelier__media').appendChild(i) })
          let min = Infinity, pire = null, pirePlein = null, pireL = 0
          const parImage = []
          for (const cadre of cadres) {
            await page.evaluate(async (src) => { const i = document.getElementById('juge-image'); i.src = src; await i.decode(); await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))) }, cadre.url)
            // capture de toute la fenêtre (repère de getBoundingClientRect), puis découpe de la zone des mots
            const plein = await page.screenshot({ type: 'png' })
            const { data, info } = await sharp(plein).extract({ left: zone.x, top: zone.y, width: zone.width, height: zone.height }).removeAlpha().raw().toBuffer({ resolveWithObject: true })
            const Ls = []
            for (let k = 0, i = 0; k < masque.length && i < data.length; k++, i += info.channels) if (masque[k]) Ls.push(0.2126 * lin(data[i]) + 0.7152 * lin(data[i + 1]) + 0.0722 * lin(data[i + 2]))
            Ls.sort((a, b) => a - b)
            const p90 = Ls[Math.floor(0.9 * (Ls.length - 1))]
            const contraste = 1.05 / (p90 + 0.05)
            parImage.push({ fichier: cadre.c, image: cadre.k, contraste: Math.round(contraste * 1000) / 1000 })
            if (contraste < min) { min = contraste; pire = cadre; pirePlein = plein; pireL = p90 }
          }
          const rel100 = (v, t) => Math.round((100 * v) / t)
          // pour information : le contraste avec la couleur calculée du texte, sur la pire image
          const rgb = (String(geo.couleur).match(/^rgba?\(([^)]*)\)/)?.[1] || '').split(/[\s,/]+/).filter(Boolean).slice(0, 3).map(Number)
          const Lt = rgb.length === 3 && rgb.every(Number.isFinite) ? 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]) : null
          const reel = Lt === null ? null : (Math.max(Lt, pireL) + 0.05) / (Math.min(Lt, pireL) + 0.05)
          // pour l'œil : la pire image sous le voile, les boîtes des mots en rouge
          const cadresMots = geo.rects.map((b) => '<rect x="' + b.x.toFixed(1) + '" y="' + b.y.toFixed(1) + '" width="' + b.l.toFixed(1) + '" height="' + b.h.toFixed(1) + '" fill="none" stroke="#ff2d55" stroke-width="1"/>').join('')
          const vue = await sharp(pirePlein).composite([{ input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="' + l + '" height="' + h + '">' + cadresMots + '</svg>'), left: 0, top: 0 }]).jpeg({ quality: 82 }).toBuffer()
          return { min, pire, parImage, vue, reel, couleur: geo.couleur, pixels: masque.reduce((s, v) => s + v, 0), zonePct: `x ${rel100(zone.x - geo.media.x, geo.media.l)}–${rel100(zone.x + zone.width - geo.media.x, geo.media.l)} %, y ${rel100(zone.y - geo.media.y, geo.media.h)}–${rel100(zone.y + zone.height - geo.media.y, geo.media.h)} %`, texte: geo.texte }
        } finally { await ctx.close() }
      }
      for (const [l, h, seuil] of FORMATS) {
        let res = await mesurerFormat(l, h)
        if (res.erreur || res.min < seuil) { await attendre(2000); res = await mesurerFormat(l, h) }
        if (res.erreur) { echecs.push(`AP-5 : ${l}×${h}, ${res.erreur}`); continue }
        mesure.contrasteMin[`${l}x${h}`] = res.min
        mesure[`contraste-${l}x${h}`] = res.parImage
        fs.mkdirSync(JUGE, { recursive: true })
        fs.writeFileSync(path.join(JUGE, `phrase-${l}x${h}.jpg`), res.vue)
        if (taille(path.join(JUGE, `phrase-${l}x${h}.jpg`)) <= 0) echecs.push(`juge : phrase-${l}x${h}.jpg non produite`)
        faits.push(`${l}×${h} : phrase « ${res.texte.slice(0, 40)}… » sur ${res.zonePct} du cadre (${res.pixels} px de mots) ; contraste minimal ${res.min.toFixed(2)} (image ${res.pire.k} du ${res.pire.c})${res.reel === null ? '' : ` ; avec la couleur calculée du texte (${res.couleur}) : ${res.reel.toFixed(2)}, pour information`}`)
        if (res.min < seuil) echecs.push(`AP-5 : ${l}×${h}, contraste de la phrase ${res.min.toFixed(2)} sur l'image ${res.pire.k} de atelier.${res.pire.c}.mp4, ${String(seuil).replace('.', ',')} au moins à chaque image`)
      }
    } finally { await nav.close(); srv.close() }
  }

  // ── AP-9 : le juge refait l'encodage depuis la source ─────────────────────────────────────────────────────────
  if (recetteValide) {
    const RE = path.join(T, 'reencodage')
    fs.mkdirSync(RE, { recursive: true })
    const args = recette({ ...enc, miroir: enc.miroir === true })
    for (const c of CODECS) {
      const sortie = path.join(RE, `atelier.${c}.mp4`)
      const t0 = Date.now(), r = ffmpeg([...args[c], sortie], 1200000)
      if (!r.ok || taille(sortie) <= 0) { echecs.push(`AP-9 : ré-encodage ${c} du juge en échec (${r.erreur})`); continue }
      const poids = taille(sortie), part = Math.abs(mesure.poids[c] - poids) / poids
      const g = gris160(sortie), d = gris[c] || []
      let pire = 0; for (let k = 0; k < Math.min(g.length, d.length); k++) pire = Math.max(pire, ecart(g[k], d[k]))
      faits.push(`ré-encodage ${c} du juge (${Math.round((Date.now() - t0) / 1000)} s) : ${poids} octets (livré ${mesure.poids[c]}, écart ${(100 * part).toFixed(2)} %), ${g.length} images, pire écart d'image ${pire.toFixed(4)}`)
      if (part > 0.03) echecs.push(`AP-9 : atelier.${c}.mp4 pèse ${mesure.poids[c]} octets, le ré-encodage du juge ${poids} (±3 %) : réglages ou recette différents`)
      if (g.length !== d.length) echecs.push(`AP-9 : atelier.${c}.mp4 a ${d.length} images, le ré-encodage du juge ${g.length}`)
      else if (pire >= 0.006) echecs.push(`AP-9 : atelier.${c}.mp4 s'écarte du ré-encodage du juge (écart ${pire.toFixed(4)}, moins de 0,006) : ce n'est pas la fenêtre ou le recadrage déclarés`)
    }
  }

  // ── AP-10 : les mesures déclarées (écho, voir l'en-tête) ──────────────────────────────────────────────────────
  const m = lireJson(path.join(P, 'mesures.json'))
  if (!m) echecs.push('AP-10 : mesures.json illisible')
  else {
    const pb = []
    for (const c of CODECS) {
      if (m.poids?.[c] !== mesure.poids[c]) pb.push(`poids.${c} ${m.poids?.[c]} (fichier ${mesure.poids[c]})`)
      if (String(m.sha256?.[c] || '').toLowerCase() !== mesure.sha256[c]) pb.push(`sha256.${c}`)
      if (m.images?.[c] !== mesure.images[c]) pb.push(`images.${c} ${m.images?.[c]} (décodées ${mesure.images[c]})`)
      for (const [k, tol] of [['duree', 0.05], ['raccord', 0.01], ['ecartMaxConsecutif', 0.01]]) {
        if (!nombre(mesure[k][c])) continue
        if (!nombre(m[k]?.[c]) || Math.abs(m[k][c] - mesure[k][c]) > tol) pb.push(`${k}.${c} ${m[k]?.[c]} (recalculé ${mesure[k][c].toFixed(4)} ±${tol})`)
      }
    }
    for (const [cle, v] of Object.entries(mesure.contrasteMin)) if (!nombre(m.contrasteMin?.[cle]) || Math.abs(m.contrasteMin[cle] - v) > 0.15) pb.push(`contrasteMin.${cle} ${m.contrasteMin?.[cle]} (recalculé ${v.toFixed(2)} ±0,15)`)
    if (pb.length) echecs.push(`AP-10 : mesures.json diffère des mesures du juge : ${pb.slice(0, 6).join(', ')}${pb.length > 6 ? '…' : ''}`)
  }

  // ── preuves du juge, pour l'œil (§6.0, §6.10) ─────────────────────────────────────────────────────────────────
  fs.mkdirSync(JUGE, { recursive: true })
  const produites = []
  const n = mesure.images.h264 || 0
  if (n >= 8) {
    ffmpeg(['-i', F.h264, '-vf', `select=not(mod(n\\,${Math.floor(n / 8)})),scale=480:270,tile=4x2`, '-frames:v', '1', '-q:v', '3', path.join(JUGE, 'atelier-planche.jpg')])
    // trois boucles bout à bout, sans réencodage : le raccord se regarde en mouvement (§6.10 « boucle sans saut »)
    ffmpeg(['-stream_loop', '2', '-i', F.h264, '-c', 'copy', '-an', '-movflags', '+faststart', path.join(JUGE, 'boucle-x3.mp4')])
    produites.push('atelier-planche.jpg', 'boucle-x3.mp4')
  }
  if (recetteValide) {
    const nSrc = Math.round((enc.duree + enc.fondu) * src.ips)
    const ligneBarbe = yBarbeValide ? `drawbox=x=0:y=${zr.yBarbeMax}:w=iw:h=4:color=yellow@0.9:t=fill,` : ''
    ffmpeg(['-ss', String(enc.debut), '-t', String(enc.duree + enc.fondu), '-i', SOURCE, '-vf', `${ligneBarbe}drawbox=x=${rec.x}:y=${rec.y}:w=${rec.largeur}:h=${rec.hauteur}:color=red@0.9:t=4,select=not(mod(n\\,${Math.max(1, Math.floor(nSrc / 16))})),scale=480:270,tile=4x4`, '-frames:v', '1', '-q:v', '3', path.join(JUGE, 'recadrage-source.jpg')])
    produites.push('recadrage-source.jpg')
  }
  for (const f of produites) {
    if (taille(path.join(JUGE, f)) <= 0) { try { fs.rmSync(path.join(JUGE, f), { force: true }) } catch { /* rien */ } echecs.push(`juge : ${f} non produite`) }
  }
  fs.writeFileSync(path.join(JUGE, 'mesures.json'), `${JSON.stringify({ date: new Date().toISOString(), echecs, ...mesure }, null, 2)}\n`)
  faits.push(`preuves du juge : ${rel(JUGE)}/ (${[...produites, 'phrase-<format>.jpg', 'mesures.json'].join(', ')})`)
}

try { await principal() } catch (e) { echecs.push(`juge interrompu : ${String(e?.message || e).split('\n')[0].slice(0, 240)}`) }
fin()
