// Préparation locale uniquement : aucune API ni publication.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
const ici = path.dirname(fileURLToPath(import.meta.url))
const racine = path.resolve(ici, '../../../..')
const chaine = path.join(racine, 'promo-src/tiktok-chaine')
const sortie = path.join(chaine, 'sorties/pack-2026-10-08')
fs.mkdirSync(sortie, { recursive: true })
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', windowsHide: true, maxBuffer: 4 * 1024 * 1024 })
  if (r.status !== 0) throw new Error(`${cmd}: ${r.stderr?.slice(-700)}`)
  return r
}
const probe = (f) => JSON.parse(run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels', '-of', 'json', f]).stdout)
const sha = (f) => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')
const films = [
  { n: '01', heure: '13:00', titre: 'Combien de devis attendent encore une relance ?', sujet: 'Un devis reste sans réponse pendant que vous êtes sur le chantier. Gardez vos demandes, vos devis et vos factures au même endroit.', question: 'Combien de devis attendent une réponse chez vous ?', preuve: 'Scripts existants presti-01-v6/script.mjs ; vérifier en production la relance et l’import Excel avant diffusion.' },
  { n: '02', heure: '16:00', titre: 'Le chantier avance. Le client attend.', sujet: 'Un client demande un devis alors que vous travaillez. Avec votre lien Presti, il vous transmet sa demande ; vous relisez et validez la réponse.', question: 'Votre plus gros souci : répondre vite ou faire le devis ?', preuve: 'Script presti-02/script.mjs ; demandes via le lien partagé, pas branchement automatique de Google/Facebook.' },
  { n: '03', heure: '20:00', titre: 'Plusieurs fichiers Excel. Un point clair avec le comptable.', sujet: 'Déposez vos classeurs Excel .xlsx ou CSV. Vérifiez les colonnes proposées, les doublons et les rejets, puis validez votre rangement. Exportez le journal détaillé pour préparer le point avec votre comptable.', question: 'Vos chiffres sont dans combien de fichiers aujourd’hui ?', preuve: 'Comptabilité Excel implementée localement le08/10 ; QA ciblée PASS, parcours connecté/commit/déploiement encore à valider. Les imports restent dans ce navigateur et ne suivent pas un autre appareil.' },
]
const reseaux = ['tiktok', 'instagram', 'facebook']
const manifeste = { genere_le: new Date().toISOString(), statut: 'PREPARE_NON_PROGRAMME', timezone: 'Europe/Paris', jour: '2026-10-09', publication_api: false, musique: 'Aucune : voix originale de Benjamin seule sur les trois réseaux.', limites: ['9 publications = 3 créations adaptées aux3réseaux, pas9filmsdistincts.', 'Pas de confirmation production importExcel, ni validation humaine artistique finale.'], films: [], publications: [] }
for (const film of films) {
  const source = path.join(chaine, 'sorties/v3', `presti-${film.n}-final-upload.mp4`)
  const voix = path.join(chaine, 'sorties/v2/voix', `presti-${film.n}`, `voix-benj-${film.n}.mp3`)
  const infos = probe(source)
  const duree = Number(infos.format.duration)
  const master = path.join(sortie, `presti-${film.n}-voix-seule.mp4`)
  run('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', source, '-i', voix, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-af', `loudnorm=I=-14:TP=-1.5:LRA=9,apad=whole_dur=${duree},atrim=0:${duree}`, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-t', String(duree), '-movflags', '+faststart', master])
  const mesure = run('ffmpeg', ['-hide_banner', '-i', master, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=9:print_format=json', '-f', 'null', '-']).stderr
  fs.writeFileSync(path.join(sortie, `qa-audio-${film.n}.log`), mesure)
  const audio = JSON.parse(mesure.match(/\{[^{}]*"input_i"[^{}]*\}/)[0])
  if (!Number.isFinite(Number(audio.input_i)) || Number(audio.input_tp) > -1) throw new Error(`Audio invalide ${film.n}`)
  const son = path.join(sortie, `presti-${film.n}-voix-seule.m4a`)
  run('ffmpeg', ['-y', '-loglevel', 'error', '-i', master, '-vn', '-c:a', 'copy', son])
  const projet = film.n === '01' ? 'presti-01-v6' : `presti-${film.n}`
  const { PHRASES } = await import(pathToFileURL(path.join(chaine, projet, 'script.mjs')).href)
  const script = PHRASES.map((p) => p.replace(/[|*]/g, '')).join('\n')
  fs.writeFileSync(path.join(ici, `script-voix-${film.n}.txt`), script + '\n')
  manifeste.films.push({ ...film, source, source_sha256: sha(source), voix, voix_sha256: sha(voix), master, sha256: sha(master), audio, infos: probe(master), coupes: path.join(chaine, projet, 'coupes.json') })
  for (const reseau of reseaux) {
    const fichier = path.join(sortie, `presti-${film.n}-${reseau}.mp4`)
    run('ffmpeg', ['-y', '-loglevel', 'error', '-i', master, '-map', '0', '-c', 'copy', '-metadata', `title=${film.titre}`, '-metadata', `comment=Presti ${reseau} préparation locale 08/10/2026 voix seule`, '-movflags', '+faststart', fichier])
    const final = probe(fichier)
    const video = final.streams.find((s) => s.codec_type === 'video')
    const sonFinal = final.streams.find((s) => s.codec_type === 'audio')
    if (video.width !== 1080 || video.height !== 1920 || video.r_frame_rate !== '30/1' || video.codec_name !== 'h264' || sonFinal?.codec_name !== 'aac' || Math.abs(Number(final.format.duration) - duree) > 0.05) throw new Error(`Format invalide ${fichier}`)
    const cta = reseau === 'facebook' ? 'Découvrir Presti : https://prestiapp.fr' : 'Découvrir Presti : lien dans la bio.'
    const precision = film.n === '03' ? '\nLes lignes validées restent sur votre navigateur. Recettes ≠ encaissements ; les impayés proviennent des statuts de vos fichiers.' : film.n === '02' ? '\nLa demande arrive par votre lien partagé ; vous gardez la main sur la réponse.' : '\nVous relisez, modifiez et validez.'
    const legende = `${film.titre}\n\n${film.sujet}${precision}\n\n${cta}\n${film.question}\n\n#Artisan #Devis #Presti`
    const entree = { id: `presti-${film.n}-${reseau}-0910`, reseau, local: `2026-10-09T${film.heure}:00+02:00`, utc: `2026-10-09T${String(Number(film.heure.slice(0, 2)) - 2).padStart(2, '0')}:00:00Z`, fichier, sha256: sha(fichier), legende, commentaire_epingle: film.question, statut: 'PREPARE_NON_PROGRAMME', reserve: film.preuve, qa_format: 'PASS', musique: 'aucune' }
    manifeste.publications.push(entree)
    fs.writeFileSync(path.join(ici, `${entree.id}.json`), JSON.stringify(entree, null, 2) + '\n')
  }
}
fs.writeFileSync(path.join(ici, 'manifest.json'), JSON.stringify(manifeste, null, 2) + '\n')
console.log('PASS pack local : 3 masters voix seule, 9 MP41080x1920H264/AAC30fps, 9fiches/legendes13h16h20hEuropeParis09oct ; non programmé, non publié.')
