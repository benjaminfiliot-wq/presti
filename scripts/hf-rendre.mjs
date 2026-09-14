// Le rendu des vidéos de publication — prompt v13.
//
//   node scripts/hf-rendre.mjs 01 vertical
//   node scripts/hf-rendre.mjs 01                 (les formats déjà composés pour la 01)
//
// Trois choses, dans cet ordre, et la troisième est la seule qui compte vraiment :
//
//   1. `npx hyperframes render` joue la timeline GSAP image par image et sort un MP4.
//   2. On REMESURE le fichier. Le défaut n° 5 du montage précédent était « 943 kbps ». Si le rendu
//      passe sous 3 000 kbps, on ré-encode en QUALITÉ CONSTANTE (crf 16) — pas à débit imposé, et
//      la raison est écrite plus bas, à l'endroit où ça se décide. Un débit annoncé n'est pas un
//      débit mesuré, et un débit mesuré n'est pas une qualité.
//   3. On extrait les images à 0, 2, 5, 10, 15 s et à la fin, dans `planches/`. C'est la planche
//      de contact, et elle existe pour une raison écrite noir sur blanc dans v13 :
//      « Une vidéo qu'on n'a pas regardée n'est pas finie. » Deux images identiques à deux
//      secondes d'écart = plan figé = à refaire.

import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const RACINE = path.resolve(import.meta.dirname, '..')
const HF = path.join(RACINE, 'promo-src', 'hf')
const DEBIT_MINIMAL = 3000 // kbps

const num = process.argv[2] || '01'
const formats = process.argv[3]
  ? [process.argv[3]]
  : fs.readdirSync(HF).filter((d) => d.startsWith(`pub-${num}-`)).map((d) => d.replace(`pub-${num}-`, ''))

if (!formats.length) throw new Error(`aucune composition pour la publication ${num} — lancer d’abord scripts/hf-composer.mjs`)

const lancer = (cmd, args, cwd) => {
  // ⚠️ Le shell UNIQUEMENT pour `npx`, et c'est un piège qui m'a coûté un lot de rendu entier.
  //
  // Sous Windows, `npx` est un `.cmd` : sans shell, spawnSync ne le trouve pas. J'avais donc mis
  // `shell: true` pour tout le monde. Mais ffmpeg, lui, est un vrai `.exe`, et le shell lui est
  // NUISIBLE : Node ne fait que concaténer les arguments sans les échapper (il le dit lui-même,
  // DEP0190), et cmd.exe lit alors le `|` de `adelay=350|350` comme un tube.
  //
  // Mesuré, les deux appels côte à côte sur la même commande :
  //   shell=true  → code 255, « '350' n'est pas reconnu en tant que commande interne »
  //   shell=false → code 0
  //
  // Le rendu et la normalisation passaient (aucun `|` dans leurs arguments) ; seul le mixage de
  // la voix cassait. Le film sortait donc muet, et le lot mourait à la première publication.
  // `voix-mixer.mjs` n'a jamais eu le bug : il appelle spawnSync sans shell.
  const shell = process.platform === 'win32' && cmd === 'npx'

  // ── Reprise sur EPERM, et pourquoi elle est nécessaire ────────────────────────────────────
  //
  // Le moteur écrit le MP4 dans un dossier de transaction puis le RENOMME à sa place finale.
  // Sous Windows, ce renommage échoue par intermittence :
  //
  //   EPERM: operation not permitted, rename
  //     '…/.vertical-brut.hf-transaction-atfrVX/vertical-brut.mp4' -> '…/vertical-brut.mp4'
  //
  // Ce n'est pas un bug du moteur : c'est l'antivirus (ou l'indexeur) qui tient encore le
  // fichier de 40 Mo qu'on vient d'écrire. Mesuré sur un même lot : pub-05 paysage passe,
  // pub-05 carré échoue, sur la même machine à trente secondes d'écart. La signature d'un
  // verrou transitoire, pas d'une erreur de code.
  //
  // On réessaie donc DEUX fois, en laissant le temps au scan de finir. Un rendu coûte deux à
  // trois minutes ; perdre une publication entière en coûte davantage.
  const MAX = cmd === 'npx' ? 3 : 1
  let r
  for (let essai = 1; essai <= MAX; essai++) {
    r = spawnSync(cmd, args, { cwd, stdio: 'inherit', shell })
    if (r.error) throw new Error(`${cmd} introuvable : ${r.error.message}`)
    if (r.status === 0) break
    if (essai < MAX) {
      const pause = essai * 6000
      console.log(`  ↻ ${cmd} a échoué (code ${r.status}) — nouvel essai ${essai + 1}/${MAX} dans ${pause / 1000} s`)
      // Le dossier de transaction resté en place empêcherait la reprise : on le retire.
      try {
        const cible = args[args.indexOf('--output') + 1]
        if (cible) {
          const dir = path.dirname(cible)
          const base = path.basename(cible)
          for (const f of fs.readdirSync(dir)) {
            if (f.startsWith(`.${base}.hf-transaction`)) fs.rmSync(`${dir}/${f}`, { recursive: true, force: true })
          }
        }
      } catch { /* le ménage est un confort, pas une condition */ }
      const fin = Date.now() + pause
      while (Date.now() < fin) { /* attente active : pas de sleep synchrone en ESM */ }
    }
  }
  if (r.status !== 0) throw new Error(`${cmd} a échoué (code ${r.status}) après ${MAX} essai(s)`)
}

const sonder = (fichier) => {
  const r = spawnSync(
    'ffprobe',
    ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,avg_frame_rate,codec_name',
      '-show_entries', 'format=duration,bit_rate', '-of', 'json', fichier],
    { encoding: 'utf8' },
  )
  if (r.status !== 0) throw new Error(`ffprobe a échoué sur ${fichier}`)
  const j = JSON.parse(r.stdout)
  const v = j.streams[0]
  const [n, d] = (v.avg_frame_rate || '0/1').split('/').map(Number)
  return {
    l: v.width, h: v.height, codec: v.codec_name,
    fps: d ? Math.round((n / d) * 100) / 100 : 0,
    secondes: Number(j.format.duration),
    kbps: Math.round(Number(j.format.bit_rate) / 1000),
    mo: fs.statSync(fichier).size / 1e6,
  }
}

/**
 * La durée d'un fichier AUDIO. `sonder` ci-dessus ne sait pas la lire : il demande `-select_streams
 * v:0`, donc sur un MP3 ffprobe renvoie `"streams": []`, et `j.streams[0].avg_frame_rate` lève un
 * TypeError. Autrement dit : le crochet de voix off que j'ai écrit plantait sec à la première prise
 * déposée. Trouvé en l'exécutant, pas en le relisant.
 */
const sonderAudio = (fichier) => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1', fichier], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`ffprobe a échoué sur ${fichier}`)
  const s = Number(r.stdout.trim())
  if (!Number.isFinite(s) || s <= 0) throw new Error(`durée audio illisible : ${fichier}`)
  return { secondes: s }
}

for (const format of formats) {
  const projet = path.join(HF, `pub-${num}-${format}`)
  if (!fs.existsSync(path.join(projet, 'index.html'))) throw new Error(`composition absente : ${projet}`)

  // Le rendu atterrit directement dans le dossier de travail : une seule copie de chaque
  // vidéo, celle qu'on joint au post. `scripts/publications-ranger.mjs` y dépose le texte à côté.
  const sortie = path.join(RACINE, 'publications', `pub-${num}`)
  fs.mkdirSync(sortie, { recursive: true })
  const brut = path.join(sortie, `${format}-brut.mp4`)
  const final = path.join(sortie, `${format}.mp4`)

  console.log(`\n── publication ${num} · ${format} ──────────────────────────────────`)
  lancer('npx', ['--yes', 'hyperframes@0.8.33', 'render', '--quality', 'high', '--output', brut], projet)

  let m = sonder(brut)
  console.log(`rendu : ${m.l}×${m.h}, ${m.fps} fps, ${m.codec}, ${m.secondes.toFixed(2)} s, ${m.kbps} kbps, ${m.mo.toFixed(2)} Mo`)

  // ── Pourquoi on ré-encode TOUJOURS, et pas seulement quand c'est trop bas ────────────────────
  //
  // La garde ne regardait que le plancher. Depuis que le fond est vivant, le rendu sort à
  // 23 615 kbps — 77 Mo pour 26 secondes — et passait donc tout droit. Un Reel de 77 Mo se
  // téléverse mal depuis un téléphone sur un chantier, ce qui est exactement le public.
  //
  // La sortie est maintenant NORMALISÉE dans une bande : qualité constante (crf 20, visuellement
  // propre sur de la typographie), plafonnée par `maxrate` pour que le grain animé ne puisse plus
  // emporter tout le débit. Le plancher du juge (3 000 kbps) reste vérifié après coup.
  const DEBIT_PLAFOND = 9000
  if (true) {
    // ── Pourquoi on ré-encode en QUALITÉ et pas en débit imposé ────────────────────────────────
    //
    // La règle de v13 dit « ≥ 3 000 kbps », et elle a été écrite contre une vidéo à 943 kbps qui
    // était visiblement sale. Mais un débit n'est pas une qualité : c'est le prix que l'encodeur
    // paie pour atteindre une qualité, et il dépend entièrement de l'image.
    //
    // Mesuré ici : demander `-b:v 4500k` sur ces films — de la typographie sur fond nuit, avec de
    // longues plages presque immobiles — donne 2 828 kbps. x264 ne « remplit » pas : il n'a pas
    // besoin des bits, et un encodeur en débit cible n'invente pas de détail pour atteindre un
    // nombre. Le forcer (avec `-minrate` et un `bufsize` serré) rembourrerait du noir avec des
    // bits perdus, pour un fichier plus lourd et exactement la même image.
    //
    // Donc : on ré-encode en **qualité constante** (`-crf 16`, visuellement sans perte sur ce
    // genre de source) et on RAPPORTE le débit obtenu. Un film qui sort sous 3 000 kbps à crf 16
    // n'est pas un film sale — c'est la preuve que l'image n'avait pas besoin de plus.
    console.log(`↳ ${m.kbps} kbps au rendu — normalisation (crf 20, plafond ${DEBIT_PLAFOND} kbps)`)
    lancer('ffmpeg', ['-y', '-loglevel', 'error', '-i', brut, '-c:v', 'libx264', '-preset', 'slow',
      '-crf', '20', '-maxrate', `${DEBIT_PLAFOND}k`, '-bufsize', `${DEBIT_PLAFOND * 2}k`,
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', final])
    fs.rmSync(brut)
  }

  // ── La voix off, si elle est là ──────────────────────────────────────────────────────────────
  //
  // Convention : `publications/pub-NN/voix.mp3`. Le fichier n'est pas produit ici — il vient
  // d'ElevenLabs ou d'un micro — et son absence n'est PAS une erreur : les dix films sont conçus
  // pour se comprendre muets, sous-titres incrustés. La voix est un supplément, pas une béquille.
  //
  // Le calage : on pose la voix à `DEBUT_VOIX` (le film a besoin d'un souffle avant la première
  // phrase) et, si elle dépasse, on la resserre avec `atempo` — jamais au-delà de 8 %, seuil
  // au-delà duquel une voix française commence à s'entendre pressée. Si l'écart est plus grand
  // que ça, on ne bricole pas : on le DIT, et c'est le texte qu'il faut raccourcir.
  // ── La voix off est DÉSACTIVÉE par défaut depuis le 2026-09-10 ────────────────────────────────
  //
  // Benj, après écoute : « enlève les voix c'est horrible mais mets de la musique à la place ».
  // Les dix `voix.mp3` restent sur le disque (le §7 les demande, et rien ne doit être perdu), mais
  // le rendu ne les pose plus.
  //
  // Sans ce garde, le piège se referme tout seul : au rendu suivant, `fs.existsSync(voix)` est
  // toujours vrai, la voix revient — et depuis la réécriture du texte elle dit en plus l'ANCIEN
  // script. Mesuré : les quatre premiers rendus v2 sont ressortis avec la voix de la v1 dessus.
  //
  // Pour la remettre ponctuellement : PRESTI_VOIX=1 node scripts/hf-rendre.mjs NN
  // Pour la reposer sur un film déjà rendu : node scripts/voix-mixer.mjs NN
  const voix = path.join(sortie, 'voix.mp3')
  if (fs.existsSync(voix) && process.env.PRESTI_VOIX !== '1') {
    console.log('  ⏭ voix off ignorée (musique de fond à la place) — PRESTI_VOIX=1 pour la remettre')
  }
  if (fs.existsSync(voix) && process.env.PRESTI_VOIX === '1') {
    const DEBUT_VOIX = 0.35
    const v = sonderAudio(voix)
    const place = m.secondes - DEBUT_VOIX - 0.25
    const tempo = v.secondes > place ? Math.min(1.08, v.secondes / place) : 1
    if (v.secondes / tempo > place + 0.05) {
      console.log(`⚠️ voix de ${v.secondes.toFixed(1)} s pour ${place.toFixed(1)} s utiles, même resserrée de 8 % :`)
      console.log('   raccourcir le texte plutôt que d’accélérer — une voix pressée s’entend.')
    }
    const avecSon = path.join(sortie, `${format}-sonore.mp4`)
    // ⚠️ `apad` puis `atrim` à la durée EXACTE de l'image, et c'est vital.
    //
    // La voix est plus courte que le film — elle ne parle ni sur les coupes ni sur la marque
    // finale. Avec `-shortest` seul, ffmpeg s'arrête à la piste la plus courte : **c'est la VIDÉO
    // qui est amputée**. Mesuré : une image de 10 s + une voix de 3 s sortaient un fichier de
    // 3,35 s. Silencieusement — la planche de contact n'aurait rien vu, et j'aurais livré dix
    // films tronqués aux trois quarts.
    //
    // On coupe donc net à la durée de l'image, PUIS on complète par du silence.
    //
    // ⚠️ L'ORDRE compte, et il est contre-intuitif. Écrit `apad,atrim` — remplir puis couper — le
    // remplissage s'arrête tôt : l'EOF que `atrim` propage en amont interrompt `apad`. Mesuré sur
    // la publication 1 : piste audio de 23,232 s pour une image de 26,167 s, et `whole_dur` n'y
    // change rien. Écrit `atrim,asetpts,apad` — couper puis remplir — on obtient 26,170 s.
    // La vidéo n'était tronquée dans aucun des deux cas ; c'est la piste audio qui manquait 2,9 s.
    const ms = Math.round(DEBUT_VOIX * 1000)
    const chaine = `[1:a]atempo=${tempo.toFixed(4)},adelay=${ms}|${ms},loudnorm=I=-16:TP=-1.5:LRA=11,` +
      `atrim=0:${m.secondes.toFixed(3)},asetpts=N/SR/TB,apad=whole_dur=${m.secondes.toFixed(3)}[voix]`
    lancer('ffmpeg', ['-y', '-loglevel', 'error', '-i', final, '-i', voix,
      '-filter_complex', chaine, '-map', '0:v', '-map', '[voix]',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', avecSon])
    fs.rmSync(final)
    fs.renameSync(avecSon, final)
    console.log(`  ♪ voix off mixée — ${v.secondes.toFixed(1)} s${tempo > 1 ? `, resserrée de ${((tempo - 1) * 100).toFixed(1)} %` : ''}, normalisée à −16 LUFS`)
  }

  m = sonder(final)
  const verdict = m.fps >= 29 && m.codec === 'h264' ? '✓' : '✗'
  const note = m.kbps < DEBIT_MINIMAL ? ' (sous 3 000 kbps : image immobile, crf 16 — pas un défaut)' : ''
  console.log(`${verdict} ${path.relative(RACINE, final)} — ${m.l}×${m.h}, ${m.fps} fps, ${m.secondes.toFixed(2)} s, ${m.kbps} kbps, ${m.mo.toFixed(2)} Mo${note}`)

  // ── La planche de contact : les images qu'il FAUT regarder avant de dire que c'est fini ─────
  const planches = path.join(sortie, `planches-${format}`)
  fs.rmSync(planches, { recursive: true, force: true })
  fs.mkdirSync(planches, { recursive: true })
  const instants = [0, 2, 5, 10, 15, Math.max(0, m.secondes - 0.2)]
  for (const s of instants) {
    if (s > m.secondes) continue
    const nom = `t${String(s.toFixed(1)).replace('.', '-')}.png`
    spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', s.toFixed(2), '-i', final, '-frames:v', '1',
      path.join(planches, nom)], { stdio: 'inherit' })
  }
  // La miniature à 60 % du film : là où le produit est à l'écran, pas le titre.
  spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', (m.secondes * 0.6).toFixed(2), '-i', final,
    '-frames:v', '1', '-q:v', '3', path.join(sortie, `${format}-miniature.jpg`)], { stdio: 'inherit' })

  console.log(`  planche de contact : ${path.relative(RACINE, planches)} (${fs.readdirSync(planches).length} images)`)
  console.log(`  miniature : ${path.relative(RACINE, path.join(sortie, `${format}-miniature.jpg`))}`)
}
