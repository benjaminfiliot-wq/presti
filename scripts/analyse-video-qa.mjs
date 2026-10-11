#!/usr/bin/env node
// scripts/analyse-video-qa.mjs — le juge de l'analyste de vidéos (scripts/usine/analyse-video.mjs, groupe `videos`, 06/10/2026).
//
//   node scripts/analyse-video-qa.mjs [--racine=<copie>] [--critere=AV-3]   AV-1 à AV-11 sur l'arbre (ou sur une copie)
//   node scripts/analyse-video-qa.mjs --auto-controle                        le témoin (tout vert), puis chaque SABOTAGE sur copie : il doit rendre rouge le critère qu'il vise
//
// Sans réseau, sans usine, sans modèle réel : de FAUX yt-dlp, ffmpeg et ffprobe (des scripts node écrits par le juge, qui journalisent leurs appels et
// leur environnement), un FAUX serveur Ollama (http, 127.0.0.1, port libre) qui décode les images reçues (PNG générés ici, avec un marqueur d'octets
// reconnaissable) et répond selon l'image, des métadonnées d'essai. L'analyste est lancé comme sur l'usine : un processus node. Les jeux d'essai sont
// des témoins (aucun compte ni texte réel). Une variable d'environnement « canari » est posée à chaque lancement : elle ne doit être ni transmise aux
// outils, ni écrite, ni imprimée. Codes : 0 tout vert ; 1 un critère rouge (ou un sabotage non attrapé) ; 2 préalable absent.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import zlib from 'node:zlib'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const DEPOT = path.resolve(ICI, '..')
const TRAVAIL = path.join(os.tmpdir(), `presti-analyse-video-qa-${process.pid}`)
const args = process.argv.slice(2)
for (const a of args) if (a !== '--auto-controle' && !a.startsWith('--racine=') && !a.startsWith('--critere=')) { console.error(`✗ option inconnue : ${a}`); process.exit(2) }
const AUTO = args.includes('--auto-controle')
const RACINE = path.resolve(args.find((a) => a.startsWith('--racine='))?.slice(9) || DEPOT)
const SEUL = args.find((a) => a.startsWith('--critere='))?.slice(10) || null

const lire = (f) => fs.readFileSync(f, 'utf8')
const court = (s, n = 160) => String(s).replace(/\s+/g, ' ').slice(0, n)
const SCRIPT = 'scripts/usine/analyse-video.mjs'
const COPIE = [SCRIPT, 'scripts/instantane-quotidien.mjs', 'scripts/usine/systemd/presti-videos.service', 'scripts/usine/systemd/presti-videos.timer', 'scripts/usine-agents.mjs', 'scripts/fixtures/026/usine-socle/unites/noms.json', 'docs/agents/analyste-videos.md']

// ── un PNG de 8×8 gris, avec un marqueur reconnaissable dans un bloc tEXt ──────────────────────────────────────────────────────
const TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0 } return t })()
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = TABLE[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0 }
const bloc = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'latin1'), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]) }
function png(numero, lum) {
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(8, 0); ihdr.writeUInt32BE(8, 4); ihdr[8] = 8; ihdr[9] = 0
  const brut = Buffer.concat(Array.from({ length: 8 }, () => Buffer.concat([Buffer.from([0]), Buffer.alloc(8, lum)])))
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloc('IHDR', ihdr), bloc('tEXt', Buffer.from(`Comment\0FRAME-${numero}-LUM-${lum};`, 'latin1')), bloc('IDAT', zlib.deflateSync(brut)), bloc('IEND', Buffer.alloc(0))])
}

// ── les faux outils (écrits dans le dossier du banc) ───────────────────────────────────────────────────────────────────────────
const ENTETE_OUTIL = (nom) => `import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ici = path.dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
fs.appendFileSync(path.join(ici, 'appels.jsonl'), JSON.stringify({ outil: '${nom}', argv, env: Object.keys(process.env), ...(Object.values(process.env).some((v) => String(v).includes('CANARI-')) ? { canari: true } : {}) }) + '\\n')
`
const FAUX_YTDLP = `${ENTETE_OUTIL('yt-dlp')}
const url = argv[argv.length - 1]
const cfg = JSON.parse(fs.readFileSync(path.join(ici, 'scenarios.json'), 'utf8'))
const sc = cfg[url] || cfg['*']
if (!sc || sc.echec) { console.error(sc?.echec || 'ERROR: unsupported URL'); process.exit(1) }
const base = argv[argv.indexOf('-o') + 1].replace('%(ext)s', '')
const corps = Buffer.from('FAKEVIDEO DUREE=' + sc.duree)
fs.writeFileSync(base + 'mp4', corps)
if (sc.taille_o) fs.truncateSync(base + 'mp4', sc.taille_o)
fs.writeFileSync(base + 'info.json', JSON.stringify(sc.info))
`
const FAUX_FFPROBE = `${ENTETE_OUTIL('ffprobe')}
const f = argv[argv.length - 1]
let t = ''
try { const fd = fs.openSync(f, 'r'); const b = Buffer.alloc(64); fs.readSync(fd, b, 0, 64, 0); fs.closeSync(fd); t = b.toString('latin1') } catch { process.exit(1) }
const m = /FAKEVIDEO DUREE=(\\d+(?:\\.\\d+)?)/.exec(t)
if (!m) { console.error('invalid data'); process.exit(1) }
console.log(JSON.stringify({ format: { duration: m[1], size: String(fs.statSync(f).size) }, streams: [{ codec_type: 'video', width: 1080, height: 1920 }] }))
`
const FAUX_FFMPEG = `${ENTETE_OUTIL('ffmpeg')}
if (argv.includes('rawvideo')) {
  const frames = JSON.parse(fs.readFileSync(path.join(ici, 'frames.json'), 'utf8'))
  process.stdout.write(Buffer.concat(frames.map((f) => Buffer.alloc(576, f.lum))))
} else {
  if (!fs.existsSync(argv[argv.indexOf('-i') + 1])) { console.error('no such file'); process.exit(1) }
  const sortie = argv[argv.length - 1]
  const frames = JSON.parse(fs.readFileSync(path.join(ici, 'frames.json'), 'utf8'))
  frames.forEach((f, i) => fs.writeFileSync(sortie.replace('%03d', String(i + 1).padStart(3, '0')), Buffer.from(f.png, 'base64')))
}
`

const FAUX_TESSERACT = `${ENTETE_OUTIL('tesseract')}
const cfg = JSON.parse(fs.readFileSync(path.join(ici, 'tesseract.json'), 'utf8'))
const langues = argv[argv.indexOf('-l') + 1]
if (cfg.sans_fra && langues.includes('fra')) { console.error('Failed loading language fra'); process.exit(1) }
if (cfg.panne) { console.error('tesseract en panne'); process.exit(1) }
const TAB = String.fromCharCode(9), NL = String.fromCharCode(10)
const images = fs.readFileSync(argv[0], 'utf8').split(NL).filter(Boolean)
const ligne = (...c) => c.join(TAB)
const lignes = [ligne('level', 'page_num', 'block_num', 'par_num', 'line_num', 'word_num', 'left', 'top', 'width', 'height', 'conf', 'text')]
images.forEach((img, i) => {
  const m = /FRAME-([0-9]+)-LUM/.exec(fs.readFileSync(img).toString('latin1'))
  const texte = (cfg.textes || {})[m ? m[1] : 0] || ''
  const mots = texte ? texte.split(' ') : []
  mots.forEach((mot, j) => lignes.push(ligne('5', String(i + 1), '1', '1', '1', String(j + 1), '0', '0', '10', '10', '91', mot)))
  if (texte) lignes.push(ligne('5', String(i + 1), '1', '1', '2', '1', '0', '0', '10', '10', '23', 'Sie'), ligne('5', String(i + 1), '1', '1', '2', '2', '0', '0', '10', '10', '88', '|'))
})
fs.writeFileSync(argv[1] + '.tsv', lignes.join(NL) + NL)
`
const OCR_TEXTES = { 1: 'AI dropshipping with $0', 2: 'search tiktok shop finds', 3: 'search tiktok shop finds for 35,88 $', 4: 'paste a link and mint a brand', 5: 'ten to 5 à 10 vidéos TikTok par jour', 6: 'comment STORE' }

// ── le faux Ollama ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const NOTES_IMAGE = {
  1: 'TEXTE: AI dropshipping with $0\nIMAGE: Un homme face caméra devant un bureau.',
  2: 'TEXTE: tiktok shop finds / Last 3 months\nIMAGE: Une capture de la recherche TikTok Shop.',
  3: 'TEXTE: AliExpress 35,88 $ / 4,5 étoiles / 338 avis\nIMAGE: Une fiche produit AliExpress d\'une brosse de grill.',
  4: 'TEXTE: StoreMint - Paste a link. Mint a brand.\nIMAGE: Un outil qui génère une boutique à partir d\'un lien.',
  5: 'TEXTE: 5 à 10 vidéos TikTok par jour\nIMAGE: L\'homme explique le rythme de publication.',
  6: 'TEXTE: Comment STORE\nIMAGE: L\'homme face caméra pointe vers le bas.',
}
const SYNTHESE_BONNE = {
  montre: ['Accroche : « AI dropshipping with $0 » face caméra.', 'Recherche d\'un produit sur TikTok Shop (« Last 3 months »).', 'Fiche AliExpress à 35,88 $, 4,5 étoiles, 338 avis.', 'Outil StoreMint : on colle un lien, une boutique est générée.', 'Appel final : commenter « STORE ».'],
  utilisable: ['Partir de la demande visible sur TikTok avant de regarder les fournisseurs, comme pour Brico Travaux.'],
  a_ne_pas_croire: ['Les ventes montrées ne sont pas prouvées ; l\'appel à commenter STORE sert à vendre un outil.'],
  idees: ['Une page produit générée à partir d\'un lien fournisseur, 5 à 10 vidéos courtes par jour.'],
}
const SYNTHESE_INVENTEE = { ...SYNTHESE_BONNE, utilisable: ['Un profit de 2 000 $ sur 3 171 $ de ventes, soit 63 % de marge, est atteignable.'] }

async function fauxOllama(config) {
  const etat = { requetes: [], config }
  const s = http.createServer((req, rep) => {
    const morceaux = []
    req.on('data', (d) => morceaux.push(d))
    req.on('end', () => {
      let corps = null; try { corps = JSON.parse(Buffer.concat(morceaux).toString('utf8')) } catch { corps = null }
      const images = (corps?.messages ?? []).flatMap((m) => m.images ?? [])
      const r = { chemin: req.url, modele: corps?.model, keep_alive: corps?.keep_alive, format: corps?.format ? Object.keys(corps.format.properties ?? {}) : null, images: images.map((b) => { const buf = Buffer.from(b, 'base64'); const m = /FRAME-(\d+)-LUM-(\d+);/.exec(buf.toString('latin1')); return { png: buf.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])), frame: m ? Number(m[1]) : null } }), systeme: String(corps?.messages?.[0]?.content ?? ''), utilisateur: String(corps?.messages?.at(-1)?.content ?? '') }
      etat.requetes.push(r)
      const envoyer = (statut, v) => { rep.writeHead(statut, { 'content-type': 'application/json' }); rep.end(JSON.stringify(v)) }
      if (req.url === '/api/generate') return envoyer(200, { done: true })
      if (req.url !== '/api/chat') return envoyer(404, { error: 'inconnu' })
      if (images.length) {
        if (config.vision === 'panne') return envoyer(500, { error: 'panne' })
        if (etat.echecsVision === undefined) etat.echecsVision = config.visionEchecs ?? 0
        if (etat.echecsVision > 0) { etat.echecsVision--; return envoyer(500, { error: 'modèle déchargé par un autre agent' }) }
        const f = r.images[0].frame
        return envoyer(200, { message: { content: config.vision?.(f) ?? NOTES_IMAGE[f] ?? 'TEXTE: aucun\nIMAGE: image inconnue' } })
      }
      const contenu = config.synthese ? config.synthese(corps.model, etat.requetes.filter((x) => !x.images.length && x.chemin === '/api/chat').length) : SYNTHESE_BONNE
      if (contenu === 'panne') return envoyer(500, { error: 'panne' })
      return envoyer(200, { message: { content: typeof contenu === 'string' ? contenu : JSON.stringify(contenu) } })
    })
  })
  await new Promise((ok) => s.listen(0, '127.0.0.1', ok))
  return { etat, port: s.address().port, fermer: () => new Promise((ok) => s.close(ok)) }
}

// ── le banc : un dossier, les faux outils, un faux Ollama, l'analyste lancé comme sur l'usine ─────────────────────────────────
const URL_BONNE = 'https://vm.tiktok.com/ZGdFAKE1/'
const INFO_BONNE = { id: '7664657468739374366', uploader: 'ecomsantiagoo', uploader_id: '6800000000000000001', title: 'I tried AI dropshipping with $0', description: 'Un essai de dropshipping avec l\'IA.', duration: 110, view_count: 433200, like_count: 29100, comment_count: 3570, upload_date: '20260720', webpage_url: 'https://www.tiktok.com/@ecomsantiagoo/video/7664657468739374366', extractor_key: 'TikTok' }
const SCENARIO_BON = { duree: 110, info: INFO_BONNE }
const LUMS_SIX = [10, 60, 120, 200, 250, 30]

async function banc(racine, nom, { scenarios = { [URL_BONNE]: SCENARIO_BON }, lums = LUMS_SIX, ollama = {}, tesseract = {} } = {}, fn) {
  const dir = path.join(TRAVAIL, `${nom}-${crypto.randomBytes(3).toString('hex')}`)
  const outils = path.join(dir, 'outils'), travail = path.join(dir, 'travail')
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(outils, { recursive: true }); fs.mkdirSync(travail, { recursive: true })
  for (const [f, s] of [['faux-ytdlp.mjs', FAUX_YTDLP], ['faux-ffprobe.mjs', FAUX_FFPROBE], ['faux-ffmpeg.mjs', FAUX_FFMPEG], ['faux-tesseract.mjs', FAUX_TESSERACT]]) fs.writeFileSync(path.join(outils, f), s)
  fs.writeFileSync(path.join(outils, 'tesseract.json'), JSON.stringify({ textes: OCR_TEXTES, ...tesseract }))
  fs.writeFileSync(path.join(outils, 'scenarios.json'), JSON.stringify(scenarios))
  fs.writeFileSync(path.join(outils, 'frames.json'), JSON.stringify(lums.map((l, i) => ({ lum: l, png: png(i + 1, l).toString('base64') }))))
  const meminfo = path.join(dir, 'meminfo'); fs.writeFileSync(meminfo, 'MemAvailable:   9999999 kB\n')
  const faux = await fauxOllama(ollama)
  const c = {
    dir, travail, outils, faux, meminfo, racine,
    appels: () => (fs.existsSync(path.join(outils, 'appels.jsonl')) ? lire(path.join(outils, 'appels.jsonl')).split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []),
    journal: () => (fs.existsSync(path.join(travail, 'journal.jsonl')) ? lire(path.join(travail, 'journal.jsonl')).split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []),
    etat: () => { try { return JSON.parse(lire(path.join(travail, 'etat.json'))) } catch { return null } },
    liste: (d) => (fs.existsSync(path.join(travail, d)) ? fs.readdirSync(path.join(travail, d)).sort() : []),
    depose: (nomFichier, url) => { fs.mkdirSync(path.join(travail, 'a-analyser'), { recursive: true }); fs.writeFileSync(path.join(travail, 'a-analyser', nomFichier), `${url}\n`) },
    lancer: (extra = [], { env = {}, ollamaPort = faux.port, sans = [] } = {}) => lancerAnalyste(c, extra, env, ollamaPort, sans),
  }
  try { return await fn(c) } finally { await faux.fermer() }
}

function lancerAnalyste(c, extra, env, ollamaPort, sans) {
  const argv = [path.join(c.racine, SCRIPT), `--travail=${c.travail}`, `--ollama=http://127.0.0.1:${ollamaPort}`, `--ytdlp=${path.join(c.outils, 'faux-ytdlp.mjs')}`, `--ffmpeg=${path.join(c.outils, 'faux-ffmpeg.mjs')}`, `--ffprobe=${path.join(c.outils, 'faux-ffprobe.mjs')}`, `--tesseract=${path.join(c.outils, 'faux-tesseract.mjs')}`, `--meminfo=${c.meminfo}`, '--delai-s=300']
    .filter((a) => !sans.some((s) => a.startsWith(s))).concat(extra)
  return new Promise((resoudre) => {
    // L'environnement d'essai porte des CANARIS : des variables comme celles du coffre. Elles ne doivent sortir nulle part.
    const e = { PATH: process.env.PATH, ...(process.platform === 'win32' ? { SystemRoot: process.env.SystemRoot } : {}), HOME: c.dir, PRESTI_JETON_CANARI: 'CANARI-jeton-1234567890', SUPABASE_SERVICE_ROLE_KEY: 'CANARI-supabase-abcdef', OLLAMA_API_KEY: 'CANARI-ollama-zzz', ...env }
    const enfant = spawn(process.execPath, argv, { env: e, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true })
    let sortie = ''
    enfant.stdout.on('data', (d) => { sortie += d }); enfant.stderr.on('data', (d) => { sortie += d })
    const minuteur = setTimeout(() => { try { enfant.kill('SIGKILL') } catch { /* sorti */ } }, 90_000)
    enfant.on('close', (code) => { clearTimeout(minuteur); resoudre({ code, sortie }) })
    enfant.on('error', () => { clearTimeout(minuteur); resoudre({ code: 127, sortie: 'lancement impossible' }) })
  })
}
function fichiersDe(dossier, sortie = []) {
  if (!fs.existsSync(dossier)) return sortie
  for (const d of fs.readdirSync(dossier, { withFileTypes: true })) { const p = path.join(dossier, d.name); if (d.isDirectory()) fichiersDe(p, sortie); else sortie.push(p) }
  return sortie
}
const analyseDe = (c, base = 'ecomsantiagoo-7664657468739374366') => { const f = path.join(c.travail, 'analyses', `${base}.analyse.md`); return fs.existsSync(f) ? lire(f) : null }
const requetesVision = (c) => c.faux.etat.requetes.filter((r) => r.chemin === '/api/chat' && r.images.length)
const requetesSynthese = (c) => c.faux.etat.requetes.filter((r) => r.chemin === '/api/chat' && !r.images.length)
const pidMort = () => new Promise((ok) => { const e = spawn(process.execPath, ['-e', '0'], { stdio: 'ignore', windowsHide: true }); const pid = e.pid; e.on('close', () => ok(pid)) })
const importer = (racine, f) => import(`${pathToFileURL(path.join(racine, f)).href}?v=${crypto.randomBytes(4).toString('hex')}`)

// ── les critères ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const CRITERES = {
  'AV-1': ['hôte : seules les vidéos des hôtes de la liste fermée passent (dépôt, file, appel direct) ; un refus ne lance aucun outil', async (racine, d) => {
    const M = await importer(racine, SCRIPT)
    const attendu = ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com', 'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']
    if (JSON.stringify([...M.HOTES_PERMIS].sort()) !== JSON.stringify([...attendu].sort())) d.push(`liste des hôtes : ${[...M.HOTES_PERMIS].join(', ')} (${attendu.join(', ')} attendus)`)
    const bons = ['https://vm.tiktok.com/ZGdCF5mMx/', 'https://vt.tiktok.com/ZSabc/', 'https://www.tiktok.com/@a/video/123', 'https://youtu.be/abc', 'https://www.youtube.com/watch?v=abc']
    const mauvais = ['https://exemple.com/video', 'https://user:motdepasse@tiktok.com/@a/video/1', 'https://tiktok.com@exemple.com/v', 'https://tiktok.com.exemple.com/v', 'https://exemple.com/?u=https://tiktok.com/v', 'http://www.tiktok.com/@a/video/1', 'https://www.tiktok.com:8443/@a/video/1', 'file:///etc/passwd', 'ftp://tiktok.com/v', 'javascript:alert(1)', '', 'https://faux-youtube.com/watch?v=1', 'https://www.tiktok.com/@a/video/1 https://exemple.com', 'https://youtube-nocookie.com/embed/1']
    for (const u of bons) if (!M.verifierUrl(u).ok) d.push(`URL de la liste refusée : ${u}`)
    for (const u of mauvais) if (M.verifierUrl(u).ok) d.push(`URL hors liste acceptée : ${u}`)
    await banc(racine, 'av1', {}, async (c) => {
      for (const u of ['https://exemple.com/video', 'https://user:pw@tiktok.com/@a/video/1', 'http://tiktok.com/@a/video/1']) {
        const r = await c.lancer([`--deposer=${u}`])
        if (r.code === 0) d.push(`--deposer a accepté ${u}`)
      }
      if (c.liste('a-analyser').length) d.push(`la file contient ${c.liste('a-analyser').join(', ')} après des dépôts refusés`)
      const bon = await c.lancer([`--deposer=${URL_BONNE}`])
      if (bon.code !== 0 || c.liste('a-analyser').length !== 1) d.push(`dépôt d'une URL de la liste : code ${bon.code}, file ${c.liste('a-analyser').length}`)
      const bis = await c.lancer([`--deposer=${URL_BONNE}`])
      if (bis.code !== 0 || c.liste('a-analyser').length !== 1) d.push('le même dépôt deux fois double la file')
      for (const f of c.liste('a-analyser')) fs.rmSync(path.join(c.travail, 'a-analyser', f))
      // Un fichier posé à la main dans la file, avec un hôte interdit : mis de côté, aucun outil lancé.
      c.depose('piege.url', 'https://exemple.com/v/1'); c.depose('piege2.url', 'https://admin:pw@www.tiktok.com/@a/video/9')
      const r = await c.lancer(['--une-passe'])
      if (c.appels().some((a) => a.outil === 'yt-dlp')) d.push('yt-dlp a été lancé pour un hôte interdit')
      if (c.liste('a-part').join() !== 'piege.url,piege2.url') d.push(`mise de côté : ${c.liste('a-part').join(', ') || 'rien'} (piege.url, piege2.url attendus)`)
      if (!c.journal().some((j) => j.evenement === 'mise_de_cote' && j.cause === 'hote_non_autorise')) d.push('le journal ne dit pas hote_non_autorise')
      if (r.code === 0 && false) d.push('code')
      if (c.faux.etat.requetes.length) d.push('Ollama a reçu une requête pour un hôte interdit')
      // Après un redirect : la page finale annoncée par yt-dlp est hors liste.
    })
    await banc(racine, 'av1b', { scenarios: { [URL_BONNE]: { ...SCENARIO_BON, info: { ...INFO_BONNE, webpage_url: 'https://exemple.com/final' } } } }, async (c) => {
      c.depose('redirige.url', URL_BONNE)
      await c.lancer(['--une-passe'])
      if (analyseDe(c)) d.push('une analyse a été écrite pour une page finale hors liste')
      if (!c.journal().some((j) => j.cause === 'hote_final_non_autorise')) d.push('page finale hors liste : cause hote_final_non_autorise absente du journal')
    })
  }],

  'AV-2': ['chemin : un mp4 hors du dossier de travail, par ../ ou par lien symbolique, est refusé ; dedans, il est analysé', async (racine, d) => {
    await banc(racine, 'av2', {}, async (c) => {
      const dehors = path.join(c.dir, 'dehors.mp4'); fs.writeFileSync(dehors, 'FAKEVIDEO DUREE=40')
      const dedans = path.join(c.travail, 'essai.mp4'); fs.writeFileSync(dedans, 'FAKEVIDEO DUREE=40')
      const refus = [[dehors, 'chemin absolu hors du dossier'], [path.join(c.travail, '..', 'dehors.mp4'), 'chemin avec ../'], [path.join(c.travail, 'inexistant.mp4'), 'fichier absent'], [path.join(c.travail, 'notes.txt'), 'pas une vidéo']]
      fs.writeFileSync(path.join(c.travail, 'notes.txt'), 'x')
      try { fs.symlinkSync(dehors, path.join(c.travail, 'lien.mp4')); refus.push([path.join(c.travail, 'lien.mp4'), 'lien symbolique vers l\'extérieur']) } catch { /* liens interdits sur ce poste */ }
      for (const [p, quoi] of refus) {
        const r = await c.lancer([p])
        if (r.code === 0) d.push(`accepté : ${quoi}`)
        if (c.appels().some((a) => a.outil === 'ffprobe' && a.argv.includes(dehors))) d.push(`ffprobe a lu le fichier extérieur (${quoi})`)
      }
      if (c.faux.etat.requetes.length) d.push('Ollama a reçu une requête pour un chemin refusé')
      const bon = await c.lancer([dedans])
      if (bon.code !== 0) d.push(`un mp4 du dossier de travail a été refusé : ${court(bon.sortie, 160)}`)
      else if (c.liste('analyses').filter((f) => f.endsWith('.analyse.md')).length !== 1) d.push('pas d\'analyse pour un mp4 du dossier de travail')
    })
  }],

  'AV-3': ['limites : 5 min, 60 Mo, 180 s de téléchargement, 40 images, 480 px ; une vidéo hors limite est refusée avant tout modèle', async (racine, d) => {
    const M = await importer(racine, SCRIPT)
    if (M.DUREE_MAX_S !== 300) d.push(`DUREE_MAX_S = ${M.DUREE_MAX_S} (300 attendu)`)
    if (M.TAILLE_MAX_O !== 60 * 1024 * 1024) d.push(`TAILLE_MAX_O = ${M.TAILLE_MAX_O} (60 Mo attendus)`)
    if (M.DELAI_TELECHARGEMENT_MS !== 180_000) d.push(`DELAI_TELECHARGEMENT_MS = ${M.DELAI_TELECHARGEMENT_MS} (180 000 attendu)`)
    if (M.IMAGES_MAX !== 40) d.push(`IMAGES_MAX = ${M.IMAGES_MAX} (40 attendu)`)
    if (M.LARGEUR_IMAGE !== 480) d.push(`LARGEUR_IMAGE = ${M.LARGEUR_IMAGE} (480 attendu)`)
    if (M.ESSAIS_MAX !== 3) d.push(`ESSAIS_MAX = ${M.ESSAIS_MAX} (3 attendu)`)
    const u = 'https://vm.tiktok.com/ZGdLONG1/', g = 'https://vm.tiktok.com/ZGdGROS1/', pile = 'https://vm.tiktok.com/ZGdPILE1/', grosPile = 'https://vm.tiktok.com/ZGdGROSPILE/'
    await banc(racine, 'av3', { scenarios: { [u]: { duree: 400, info: { ...INFO_BONNE, id: '111', duration: 400 } }, [g]: { duree: 60, taille_o: 61 * 1024 * 1024, info: { ...INFO_BONNE, id: '222', duration: 60 } }, [pile]: { duree: 300, info: { ...INFO_BONNE, id: '333', duration: 300 } }, [grosPile]: { duree: 60, taille_o: 60 * 1024 * 1024, info: { ...INFO_BONNE, id: '444', duration: 60 } } } }, async (c) => {
      c.depose('long.url', u); c.depose('gros.url', g)
      await c.lancer(['--une-passe'])
      if (c.liste('a-part').join() !== 'gros.url,long.url') d.push(`hors limites : a-part = ${c.liste('a-part').join(', ') || 'vide'} (gros.url, long.url attendus)`)
      if (c.faux.etat.requetes.length) d.push('un modèle a été appelé pour une vidéo hors limites')
      const causes = Object.fromEntries(c.journal().filter((j) => j.evenement === 'mise_de_cote').map((j) => [j.nom, j.cause]))
      if (causes['long.url'] !== 'duree_trop_longue') d.push(`cause de long.url : ${causes['long.url']} (duree_trop_longue attendue)`)
      if (causes['gros.url'] !== 'taille_trop_grande') d.push(`cause de gros.url : ${causes['gros.url']} (taille_trop_grande attendue)`)
      if (c.liste('analyses').length) d.push('une analyse existe pour une vidéo hors limites')
      const y = c.appels().find((a) => a.outil === 'yt-dlp')
      if (!y) d.push('yt-dlp jamais lancé')
      else {
        const a = y.argv.join(' ')
        if (!/--max-filesize 60M/.test(a)) d.push('yt-dlp lancé sans --max-filesize 60M')
        if (!/--match-filter duration<=300/.test(a)) d.push('yt-dlp lancé sans --match-filter duration<=300')
        if (!/--write-info-json/.test(a)) d.push('yt-dlp lancé sans --write-info-json')
        if (!/--no-playlist/.test(a) || !/--ignore-config/.test(a)) d.push('yt-dlp lancé sans --no-playlist et --ignore-config')
        if (y.argv.at(-1) !== 'https://vm.tiktok.com/ZGdLONG1/' || y.argv.at(-2) !== '--') d.push('l\'URL n\'est pas passée après « -- »')
      }
    })
    // Pile sur les limites : acceptées.
    await banc(racine, 'av3b', { scenarios: { [pile]: { duree: 300, info: { ...INFO_BONNE, id: '333', duration: 300 } }, [grosPile]: { duree: 60, taille_o: 60 * 1024 * 1024, info: { ...INFO_BONNE, id: '444', duration: 60 } } } }, async (c) => {
      c.depose('pile.url', pile); c.depose('gros-pile.url', grosPile)
      await c.lancer(['--une-passe'])
      if (c.liste('traitees').join() !== 'gros-pile.url,pile.url') d.push(`pile sur les limites : traitees = ${c.liste('traitees').join(', ') || 'vide'} (acceptées attendues)`)
      // 300 s → 40 images au plus à 480 px.
      const f = c.appels().find((a) => a.outil === 'ffmpeg' && !a.argv.includes('rawvideo'))
      if (!f) d.push('ffmpeg d\'extraction jamais lancé')
      else {
        const a = f.argv.join(' ')
        if (!/-frames:v 40\b/.test(a)) d.push('extraction sans -frames:v 40')
        if (!/scale=480:-2/.test(a)) d.push('extraction sans scale=480:-2')
        if (!/fps=1\/7\.5\b/.test(a)) d.push(`300 s sur 40 images : fps=1/7.5 attendu, vu ${(/fps=1\/[\d.]+/.exec(a) || ['aucun'])[0]}`)
      }
    })
    await banc(racine, 'av3c', {}, async (c) => {
      c.depose('court.url', URL_BONNE)
      await c.lancer(['--une-passe'])
      const f = c.appels().find((a) => a.outil === 'ffmpeg' && !a.argv.includes('rawvideo'))
      if (f && !/fps=1\/2\.8\b/.test(f.argv.join(' '))) d.push(`110 s sur 40 images : fps=1/2.8 attendu, vu ${(/fps=1\/[\d.]+/.exec(f.argv.join(' ')) || ['aucun'])[0]}`)
    })
  }],

  'AV-4': ['le Markdown : bandeau en tête, titre, ligne de métadonnées exacte, quatre sections dans l\'ordre, notes image par image, rien d\'indéfini', async (racine, d) => {
    await banc(racine, 'av4', {}, async (c) => {
      c.depose('essai.url', URL_BONNE)
      const r = await c.lancer(['--une-passe'])
      const md = analyseDe(c)
      if (r.code !== 0 || md === null) { d.push(`pas d'analyse : code ${r.code}, ${court(r.sortie, 200)}`); return }
      const L = md.split('\n')
      if (L[0] !== '> Analyse automatique par un modèle de vision local (qwen2.5vl:3b) : à recouper, les chiffres lus à l\'écran ne sont pas prouvés.') d.push(`bandeau : « ${court(L[0], 160)} »`)
      if (!L.includes('# Analyse — @ecomsantiagoo, « I tried AI dropshipping with $0 » (TikTok 7664657468739374366)')) d.push('titre « Analyse — @compte, « titre » (TikTok id) » absent ou faux')
      if (!L.includes('Fichier : 1080×1920, 110 s, publiée le 20/07/2026, **433 200 vues**, **29 100 likes**, **3 570 commentaires**.')) d.push(`métadonnées : ${court(L.find((l) => l.startsWith('Fichier')) ?? 'ligne absente', 160)}`)
      if (!/^Statut : ok\./m.test(md)) d.push('« Statut : ok. » absent')
      if (!/Pas de transcription audio/.test(md)) d.push('la limite « pas de transcription audio » n\'est pas dite')
      const titres = L.filter((l) => l.startsWith('## '))
      const attendu = ['## Ce qui est montré, dans l\'ordre', '## Ce qui est utilisable pour Presti', '## À ne pas croire', '## Idées de fonctionnalités ou de méthodes à retenir', '## Sous-titres lus à l\'écran (OCR, bruts)', '## Notes de vision, image par image (brutes, à recouper)']
      if (JSON.stringify(titres) !== JSON.stringify(attendu)) d.push(`sections : ${titres.join(' | ')}`)
      if (!md.includes('1. Accroche') || !md.includes('5. Appel final')) d.push('« ce qui est montré » n\'est pas une liste numérotée dans l\'ordre')
      for (const m of ['StoreMint - Paste a link. Mint a brand.', 'AliExpress 35,88 $', 'Comment STORE']) if (!md.includes(m)) d.push(`le texte lu sur les images « ${m} » manque dans les notes`)
      if (/undefined|NaN|\[object|null/.test(md)) d.push('« undefined », « NaN » ou « [object » dans le fichier')
      if (!fs.existsSync(path.join(c.travail, 'analyses', 'ecomsantiagoo-7664657468739374366.notes.json'))) d.push('le fichier de notes JSON manque')
      else { const n = JSON.parse(lire(path.join(c.travail, 'analyses', 'ecomsantiagoo-7664657468739374366.notes.json'))); if (n.notes?.length !== 6 || !n.notes[3].texte.includes('StoreMint')) d.push('notes JSON : 6 notes attendues, la 4e lit StoreMint') }
      if (c.liste('traitees').join() !== 'essai.url' || c.liste('a-analyser').length) d.push(`file : traitees ${c.liste('traitees')}, a-analyser ${c.liste('a-analyser')}`)
      if (fs.existsSync(path.join(c.travail, 'tmp', 'essai')) ) d.push('le dossier temporaire de la vidéo n\'a pas été nettoyé')
      const ev = c.journal().find((j) => j.evenement === 'analyse')
      if (!ev || ev.statut !== 'ok' || ev.sortie !== 'ecomsantiagoo-7664657468739374366.analyse.md') d.push(`journal : ${JSON.stringify(ev)}`)
      if (ev?.url !== URL_BONNE) d.push(`le journal ne garde pas l'URL (${ev?.url})`)
    })
    // Métadonnées absentes : dites, jamais inventées.
    await banc(racine, 'av4b', { scenarios: { [URL_BONNE]: { duree: 50, info: { id: '555', uploader: 'sansmeta', title: 'Sans compteurs' } } } }, async (c) => {
      c.depose('x.url', URL_BONNE)
      await c.lancer(['--une-passe'])
      const md = analyseDe(c, 'sansmeta-555')
      const l = md?.split('\n').find((x) => x.startsWith('Fichier'))
      if (!l || !/vues non relevées/.test(l) || !/likes non relevés/.test(l) || !/commentaires non relevés/.test(l) || !/date non relevée/.test(l) || /\d+ vues/.test(l)) d.push(`métadonnées absentes : « ${l} »`)
    })
  }],

  'AV-5': ['images : seules les images qui changent partent au modèle de vision (au plus --images-vision), intactes, puis le modèle est déchargé', async (racine, d) => {
    const lums = [10, 10, 10, 200, 200, 50, 50, 50, 120, 120, 30, 250]
    await banc(racine, 'av5', { lums }, async (c) => {
      c.depose('a.url', URL_BONNE)
      await c.lancer(['--une-passe'])
      const v = requetesVision(c)
      const frames = v.map((r) => r.images[0].frame)
      if (JSON.stringify(frames) !== JSON.stringify([1, 4, 6, 9, 11, 12])) d.push(`images envoyées : ${frames.join(',')} (1,4,6,9,11,12 attendues : les images qui changent, dans l'ordre)`)
      if (v.some((r) => r.images.length !== 1 || !r.images[0].png || r.images[0].frame === null)) d.push('une image n\'est pas arrivée intacte (PNG reconnaissable) au modèle de vision')
      if (v.some((r) => r.modele !== 'qwen2.5vl:3b')) d.push(`modèle de vision : ${[...new Set(v.map((r) => r.modele))].join(', ')} (qwen2.5vl:3b attendu)`)
      if (!v.length || !/recopie tout le texte/i.test(v[0].utilisateur) || !/sans rien inventer/i.test(v[0].utilisateur)) d.push('la consigne de lecture (texte visible recopié, rien d\'inventé) manque')
      const dernier = c.faux.etat.requetes.filter((r) => r.chemin === '/api/generate')
      if (!dernier.some((r) => r.modele === 'qwen2.5vl:3b')) d.push('le modèle de vision n\'est pas déchargé (/api/generate keep_alive 0) après usage')
      const iDecharge = c.faux.etat.requetes.findIndex((r) => r.chemin === '/api/generate' && r.modele === 'qwen2.5vl:3b')
      const iSynth = c.faux.etat.requetes.findIndex((r) => r.chemin === '/api/chat' && !r.images.length)
      if (iDecharge < 0 || iSynth < 0 || iDecharge > iSynth) d.push('le modèle de vision doit être déchargé AVANT la synthèse (mémoire de l\'usine)')
      const synth = requetesSynthese(c)[0]
      if (!synth || !synth.format?.includes('montre')) d.push('la synthèse est demandée sans schéma de sortie')
      if (synth && (synth.keep_alive !== 0)) d.push('le modèle de synthèse n\'est pas déchargé après son appel (keep_alive 0)')
      if (synth && !/artisans du bâtiment/.test(synth.utilisateur)) d.push('la synthèse ne reçoit pas le contexte de Presti')
      if (synth && !/StoreMint/.test(synth.utilisateur)) d.push('la synthèse ne reçoit pas les notes des images')
    })
    // Ollama est partagé : quand un autre agent charge son modèle, une requête peut échouer. Trois essais par image, puis on saute.
    await banc(racine, 'av5c', { ollama: { visionEchecs: 2 } }, async (c) => {
      c.depose('a.url', URL_BONNE)
      await c.lancer(['--une-passe'])
      const md = analyseDe(c)
      const n = md ? (md.match(/^- \*\*\d+ s\*\* — texte/gm) || []).length : 0
      if (n !== 6) d.push(`deux échecs d'Ollama sur la première image : ${n} notes (6 attendues : trois essais par image)`)
      if (requetesVision(c).length !== 8) d.push(`${requetesVision(c).length} requêtes de vision (8 attendues : 2 échecs + 6 lectures)`)
    })
    await banc(racine, 'av5b', { lums }, async (c) => {
      c.depose('a.url', URL_BONNE)
      await c.lancer(['--une-passe', '--images-vision=3'])
      const frames = requetesVision(c).map((r) => r.images[0].frame)
      if (frames.length !== 3 || frames[0] !== 1 || frames.at(-1) !== 12) d.push(`--images-vision=3 : ${frames.join(',')} (3 images dont la première et la dernière attendues)`)
      const r = await c.lancer(['--images-vision=0', '--une-passe'])
      if (r.code !== 2) d.push(`--images-vision=0 accepté (code ${r.code})`)
      const r2 = await c.lancer(['--images-vision=41', '--une-passe'])
      if (r2.code !== 2) d.push(`--images-vision=41 accepté (code ${r2.code})`)
    })
  }],

  'AV-6': ['la garde des nombres : un nombre absent des notes et des métadonnées rend la synthèse « incertaine », jamais publiée', async (racine, d) => {
    const M = await importer(racine, SCRIPT)
    const meta = { vues: 433200, likes: 29100, commentaires: 3570, duree_s: 110, date: '20260720' }
    const donnees = 'AliExpress 35,88 $ 4,5 étoiles 338 avis 774K likes 1,458 $ 5 à 10 vidéos 09:41:02 AI dropshipping with $0 Last 3 months'
    for (const t of ['35,88 $ et 433 200 vues', '774 000 likes', '774K likes', '433 K vues', '3 570 commentaires', '110 s', '1 min 50', '1 458 $', '20/07/2026', '5 à 10 vidéos', '4,5 étoiles', '$0', '\n1. première étape\n2) seconde\n- puce']) {
      const a = M.nombresAbsents(t, donnees, meta)
      if (a.length) d.push(`nombre légitime refusé dans « ${court(t, 40)} » : ${a.join(', ')}`)
    }
    for (const t of ['63 %', '2 000 $ de profit', '3 171 $', '35,89 $', '433 201 vues', '12 étapes', 'en 13 jours']) {
      if (!M.nombresAbsents(t, donnees, meta).length) d.push(`nombre inventé accepté : « ${t} »`)
    }
    const r1 = M.controlerSynthese(SYNTHESE_INVENTEE, donnees + ' 0 s', meta)
    if (r1.ok) d.push('controlerSynthese accepte une synthèse inventée')
    if (!M.controlerSynthese(JSON.stringify(SYNTHESE_BONNE), donnees + ' 0 s', meta).ok) d.push('controlerSynthese refuse la bonne synthèse : ' + M.controlerSynthese(SYNTHESE_BONNE, donnees + ' 0 s', meta).fautes.join(' ; '))
    if (M.controlerSynthese({ montre: ['a b c'] }, donnees, meta).ok) d.push('une synthèse sans les quatre sections est acceptée')
    if (M.controlerSynthese('pas du json', donnees, meta).ok) d.push('un texte qui n\'est pas du JSON est accepté')
    if (M.controlerSynthese({ ...SYNTHESE_BONNE, idees: ['Utiliser la clé ' + ['sk', 'ant', 'abcdefghijklmnop'].join('-')] }, donnees, meta).ok) d.push('une synthèse qui contient un secret est acceptée')
    // De bout en bout : tous les moteurs inventent → incertain, aucune synthèse publiée.
    await banc(racine, 'av6', { ollama: { synthese: () => SYNTHESE_INVENTEE } }, async (c) => {
      c.depose('a.url', URL_BONNE)
      const r = await c.lancer(['--une-passe'])
      const md = analyseDe(c)
      if (md === null) { d.push(`aucun fichier écrit : code ${r.code}, ${court(r.sortie, 160)}`); return }
      if (!/^Statut : incertain\./m.test(md)) d.push('statut « incertain » absent')
      if (!/STATUT INCERTAIN/.test(md)) d.push('le bandeau d\'incertitude manque')
      for (const n of ['2 000', '3 171', '63 %']) if (md.includes(n)) d.push(`le nombre inventé « ${n} » est dans le fichier`)
      if (/^## Ce qui est utilisable/m.test(md)) d.push('une synthèse est publiée malgré le refus')
      if (!/^## Notes de vision/m.test(md)) d.push('les notes brutes ne sont pas gardées')
      if (requetesSynthese(c).length < 3) d.push(`${requetesSynthese(c).length} moteur(s) de synthèse essayé(s) (les 3 de la chaîne attendus)`)
      if (!requetesSynthese(c).slice(1).every((q) => /refusée/.test(q.utilisateur))) d.push('les moteurs suivants ne reçoivent pas les nombres refusés')
      const ev = c.journal().find((j) => j.evenement === 'analyse')
      if (ev?.statut !== 'incertain') d.push(`journal : statut ${ev?.statut}`)
      if (!/^> Analyse automatique par un modèle de vision local/.test(md)) d.push('le bandeau est absent d\'un fichier incertain')
    })
    // Le premier moteur invente, le deuxième est juste : la chaîne continue.
    await banc(racine, 'av6b', { ollama: { synthese: (modele) => (modele.startsWith('gpt-oss') ? SYNTHESE_INVENTEE : SYNTHESE_BONNE) } }, async (c) => {
      c.depose('a.url', URL_BONNE)
      await c.lancer(['--une-passe'])
      const md = analyseDe(c)
      if (!md || !/^Statut : ok\./m.test(md)) d.push('le deuxième moteur, juste, n\'est pas retenu')
      else if (!/Synthèse rédigée par qwen3:8b/.test(md) || md.includes('63 %')) d.push('le moteur retenu n\'est pas qwen3:8b ou le nombre inventé est resté')
    })
    // Le chiffre inventé vient de la VISION (un nombre faux lu sur l'écran) : il est dans les notes, il passe, mais le bandeau le dit.
    await banc(racine, 'av6c', { ollama: { synthese: () => 'panne' } }, async (c) => {
      c.depose('a.url', URL_BONNE)
      const r = await c.lancer(['--une-passe'])
      const md = analyseDe(c)
      if (!md || !/^Statut : incertain\./m.test(md)) d.push(`tous les moteurs en panne : statut incertain attendu (code ${r.code})`)
    })
  }],

  'AV-7': ['la file : un verrou, trois échecs puis mise de côté sans bloquer, reprise après un arrêt brutal, mémoire basse, doublon', async (racine, d) => {
    // (a) un verrou vivant bloque le passage
    await banc(racine, 'av7a', {}, async (c) => {
      c.depose('a.url', URL_BONNE)
      fs.writeFileSync(path.join(c.travail, 'analyste.verrou'), JSON.stringify({ pid: process.pid, le: new Date().toISOString() }))
      const r = await c.lancer(['--une-passe'])
      if (r.code !== 0 || !/déjà en cours/.test(r.sortie)) d.push(`verrou vivant : code ${r.code}, « ${court(r.sortie, 100)} » (« déjà en cours » attendu)`)
      if (c.appels().length || c.faux.etat.requetes.length) d.push('un second analyste a travaillé malgré le verrou')
      if (c.liste('a-analyser').join() !== 'a.url') d.push('le verrou d\'un autre n\'a pas laissé la file intacte')
      if (!fs.existsSync(path.join(c.travail, 'analyste.verrou'))) d.push('le verrou d\'un autre a été retiré')
      // l'appel direct est refusé aussi
      const direct = await c.lancer([URL_BONNE])
      if (direct.code === 0 || c.faux.etat.requetes.length) d.push('l\'appel direct ignore le verrou')
      // (b) un verrou d'un processus mort est repris, puis retiré
      fs.writeFileSync(path.join(c.travail, 'analyste.verrou'), JSON.stringify({ pid: await pidMort(), le: new Date().toISOString() }))
      const r2 = await c.lancer(['--une-passe'])
      if (r2.code !== 0 || c.liste('traitees').join() !== 'a.url') d.push(`verrou d'un processus mort : code ${r2.code}, traitees ${c.liste('traitees')}`)
      if (fs.existsSync(path.join(c.travail, 'analyste.verrou'))) d.push('le verrou n\'est pas retiré à la fin du passage')
      // un verrou vieux de plus de 3 h, même d'un pid vivant, est périmé
      c.depose('b.url', URL_BONNE)
      fs.writeFileSync(path.join(c.travail, 'analyste.verrou'), JSON.stringify({ pid: process.pid, le: new Date(Date.now() - 4 * 3_600_000).toISOString() }))
      const r3 = await c.lancer(['--une-passe', '--refaire'])
      if (r3.code !== 0 || c.liste('traitees').length !== 2) d.push('un verrou de plus de 3 h n\'est pas repris')
    })
    // (c) trois échecs → mise de côté, sans bloquer les autres
    const MAUVAIS = 'https://vm.tiktok.com/ZGdPANNE1/'
    await banc(racine, 'av7c', { scenarios: { [URL_BONNE]: SCENARIO_BON, [MAUVAIS]: { echec: 'ERROR: Unable to download webpage: HTTP Error 503' } } }, async (c) => {
      c.depose('1-panne.url', MAUVAIS); c.depose('2-bonne.url', URL_BONNE)
      const vieux = new Date(Date.now() - 60_000); fs.utimesSync(path.join(c.travail, 'a-analyser', '1-panne.url'), vieux, vieux)
      const r1 = await c.lancer(['--une-passe'])
      if (r1.code === 0) d.push('un échec ne fait pas sortir le passage en code 1')
      if (c.liste('traitees').join() !== '2-bonne.url') d.push(`une vidéo en échec bloque la file : traitees ${c.liste('traitees')}`)
      if (c.liste('a-analyser').join() !== '1-panne.url' || c.etat()?.essais?.['1-panne.url']?.n !== 1) d.push(`après l'échec 1 : file ${c.liste('a-analyser')}, essais ${JSON.stringify(c.etat()?.essais)}`)
      await c.lancer(['--une-passe'])
      if (c.liste('a-analyser').join() !== '1-panne.url' || c.etat()?.essais?.['1-panne.url']?.n !== 2) d.push(`après l'échec 2 : file ${c.liste('a-analyser')}, essais ${JSON.stringify(c.etat()?.essais)}`)
      await c.lancer(['--une-passe'])
      if (c.liste('a-part').join() !== '1-panne.url' || c.liste('a-analyser').length) d.push(`après l'échec 3 : a-part ${c.liste('a-part')} (1-panne.url attendu), file ${c.liste('a-analyser')}`)
      const mc = c.journal().find((j) => j.evenement === 'mise_de_cote' && j.nom === '1-panne.url')
      if (!mc || mc.essais !== 3 || !/telechargement/.test(mc.cause) || !/503/.test(mc.detail ?? '')) d.push(`journal de la mise de côté : ${JSON.stringify(mc)} (essais 3, cause telechargement, détail avec 503)`)
      const nY = c.appels().filter((a) => a.outil === 'yt-dlp' && a.argv.at(-1) === MAUVAIS).length
      if (nY !== 3) d.push(`yt-dlp lancé ${nY} fois sur la vidéo en échec (3 attendues, ni plus ni moins)`)
      await c.lancer(['--une-passe'])
      if (c.appels().filter((a) => a.outil === 'yt-dlp' && a.argv.at(-1) === MAUVAIS).length !== 3) d.push('une vidéo mise de côté est reprise')
    })
    // (d) arrêt brutal : un passage mort au milieu d'une vidéo compte pour un essai ; au 3e, mise de côté
    await banc(racine, 'av7d', { scenarios: { [URL_BONNE]: { echec: 'ERROR: Unable to download webpage: HTTP Error 503' } } }, async (c) => {
      c.depose('x.url', URL_BONNE)
      fs.writeFileSync(path.join(c.travail, 'analyste.verrou'), JSON.stringify({ pid: await pidMort(), le: new Date().toISOString() }))
      fs.writeFileSync(path.join(c.travail, 'etat.json'), JSON.stringify({ essais: { 'x.url': { n: 1, cause: 'avant' } }, en_cours: { nom: 'x.url', pid: 1, debut: new Date().toISOString() } }))
      await c.lancer(['--une-passe'])
      const rep = c.journal().find((j) => j.evenement === 'reprise')
      if (!rep || rep.essais !== 2) d.push(`reprise : ${JSON.stringify(rep)} (essais 2 attendus : l'arrêt brutal compte pour un)`)
      if (c.liste('a-part').join() !== 'x.url') d.push(`un arrêt brutal puis un échec : a-part ${c.liste('a-part')} (x.url attendu au 3e essai)`)
    })
    // (e) Ollama en panne : l'échec est transitoire ; au passage suivant, la même vidéo est faite et son compteur effacé
    await banc(racine, 'av7e', {}, async (c) => {
      c.depose('a.url', URL_BONNE)
      const mort = await fauxOllama({}); const portMort = mort.port; await mort.fermer()
      const r1 = await c.lancer(['--une-passe'], { ollamaPort: portMort })
      if (r1.code === 0 || c.liste('a-analyser').join() !== 'a.url' || c.etat()?.essais?.['a.url']?.n !== 1) d.push(`Ollama éteint : code ${r1.code}, file ${c.liste('a-analyser')}, essais ${JSON.stringify(c.etat()?.essais)}`)
      if (analyseDe(c)) d.push('une analyse a été écrite sans modèle')
      const r2 = await c.lancer(['--une-passe'])
      if (r2.code !== 0 || c.liste('traitees').join() !== 'a.url' || c.etat()?.essais?.['a.url']) d.push(`reprise avec Ollama : code ${r2.code}, traitees ${c.liste('traitees')}, essais ${JSON.stringify(c.etat()?.essais)}`)
      const dl = c.appels().filter((a) => a.outil === 'yt-dlp').length
      if (dl !== 1) d.push(`la vidéo est retéléchargée à la reprise (${dl} appels à yt-dlp, 1 attendu)`)
      // (g) le même lien redéposé : déjà fait, aucun modèle appelé
      const avant = c.faux.etat.requetes.length
      c.depose('b.url', URL_BONNE)
      await c.lancer(['--une-passe'])
      if (c.faux.etat.requetes.length !== avant) d.push('une vidéo déjà analysée relance les modèles')
      if (!c.journal().some((j) => j.evenement === 'deja_fait')) d.push('« deja_fait » absent du journal')
      if (!c.liste('traitees').includes('b.url')) d.push('le doublon n\'est pas rangé dans traitees')
    })
    // (f) mémoire basse : ni modèle, ni essai compté
    await banc(racine, 'av7f', {}, async (c) => {
      c.depose('a.url', URL_BONNE)
      fs.writeFileSync(c.meminfo, 'MemAvailable:   100000 kB\n')
      await c.lancer(['--une-passe'])
      if (c.faux.etat.requetes.length) d.push('un modèle est chargé alors que la mémoire est basse')
      if (c.etat()?.essais?.['a.url']) d.push('la mémoire basse compte pour un échec de la vidéo')
      if (c.liste('a-analyser').join() !== 'a.url' || !c.journal().some((j) => j.evenement === 'attente_memoire')) d.push('mémoire basse : la vidéo doit rester en file avec « attente_memoire » au journal')
    })
    // (h) nom invalide
    await banc(racine, 'av7h', {}, async (c) => {
      c.depose('mauvais nom;rm.url', URL_BONNE); c.depose('.cache.url', URL_BONNE)
      await c.lancer(['--une-passe'])
      if (c.liste('a-part').length !== 2 || c.appels().length) d.push(`noms de fichier invalides : a-part ${c.liste('a-part')}, ${c.appels().length} appels d'outil`)
    })
  }],

  'AV-8': ['aucune clé : l\'environnement des outils est réduit, aucun canari n\'est lu, écrit ni imprimé, un secret dans la sortie n\'est jamais écrit', async (racine, d) => {
    const src = lire(path.join(racine, SCRIPT))
    for (const m of src.matchAll(/process\.env\.([A-Za-z_]+)/g)) if (!['HOME', 'PATH'].includes(m[1])) d.push(`le script lit process.env.${m[1]}`)
    if (/process\.env\s*[^.\s]|process\.env\s*\)|\.\.\.process\.env|Object\.(?:keys|entries|assign)\(process\.env/.test(src.replace(/process\.env\.(?:HOME|PATH)/g, ''))) d.push('le script manie process.env en bloc')
    for (const m of ['agents.env', '.config/presti', 'avec-coffre', 'presti-coffre', 'PRESTI_JETON', 'authorization', 'Bearer']) if (src.toLowerCase().includes(m.toLowerCase())) d.push(`le script cite « ${m} »`)
    await banc(racine, 'av8', {}, async (c) => {
      c.depose('a.url', URL_BONNE)
      const r = await c.lancer(['--une-passe'])
      if (!analyseDe(c)) d.push(`pas d'analyse : ${court(r.sortie, 160)}`)
      const appels = c.appels()
      if (!appels.length) d.push('aucun outil lancé')
      for (const a of appels) {
        if (a.canari) d.push(`${a.outil} reçoit un canari dans son environnement`)
        // Sous Windows, le système ajoute lui-même ses variables de session (USERNAME, HOMEDRIVE…) : elles ne sont pas des clés.
        const systeme = process.platform === 'win32' ? /^(?:SYSTEMROOT|SYSTEMDRIVE|WINDIR|COMSPEC|PATHEXT|TEMP|TMP|USER\w+|HOME\w+|LOGONSERVER|APPDATA|LOCALAPPDATA|PROGRAM\w*|COMMONPROGRAM\w*|ALLUSERSPROFILE|PUBLIC|NUMBER_OF_PROCESSORS|OS|PROCESSOR_\w+|COMPUTERNAME|DRIVERDATA|SESSIONNAME)$/i : /^$/
        const inconnues = a.env.filter((k) => !['PATH', 'HOME', 'LANG'].includes(k.toUpperCase()) && !systeme.test(k))
        if (inconnues.length) d.push(`${a.outil} reçoit ${inconnues.join(', ')} (PATH, HOME, LANG seulement attendus)`)
      }
      for (const canari of ['CANARI-jeton-1234567890', 'CANARI-supabase-abcdef', 'CANARI-ollama-zzz']) {
        if (r.sortie.includes(canari)) d.push(`le canari ${canari.slice(0, 14)}… est imprimé`)
        for (const f of fichiersDe(c.travail)) { try { if (lire(f).includes(canari)) d.push(`le canari est écrit dans ${path.relative(c.travail, f)}`) } catch { /* binaire */ } }
        if (JSON.stringify(c.faux.etat.requetes).includes(canari)) d.push('le canari est envoyé à Ollama')
      }
    })
    // Un secret dans ce que lit le modèle de vision : rien n'est écrit.
    const secret = ['sk', 'ant', 'abcdefghijklmnopqrstu'].join('-')
    await banc(racine, 'av8b', { ollama: { vision: (f) => `TEXTE: clé ${secret}\nIMAGE: un écran (${f})` } }, async (c) => {
      c.depose('a.url', URL_BONNE)
      const r = await c.lancer(['--une-passe'])
      if (analyseDe(c) !== null || fichiersDe(path.join(c.travail, 'analyses')).length) d.push('une sortie qui contient un secret a été écrite')
      if (c.liste('a-part').join() !== 'a.url') d.push(`secret dans la sortie : a-part ${c.liste('a-part')} (a.url attendu)`)
      if (r.sortie.includes(secret) || JSON.stringify(c.journal()).includes(secret)) d.push('le secret est imprimé ou journalisé')
    })
  }],

  'AV-9': ['Ollama : seulement 127.0.0.1 ; les options inconnues et les modes mêlés sont refusés (code 2)', async (racine, d) => {
    await banc(racine, 'av9', {}, async (c) => {
      for (const extra of [['--une-passe', '--ollama=http://exemple.com:11434'], ['--une-passe', '--ollama=https://ollama.com'], ['--une-passe', '--option-inconnue=1'], ['--une-passe', URL_BONNE], []]) {
        const r = await c.lancer(extra, { sans: extra.some((a) => a.startsWith('--ollama=')) ? ['--ollama='] : [] })
        if (r.code !== 2) d.push(`${extra.join(' ') || '(aucun mode)'} : code ${r.code} (2 attendu)`)
      }
      if (c.appels().length || c.faux.etat.requetes.length) d.push('un outil ou un modèle a été lancé malgré un usage refusé')
    })
  }],

  'AV-10': ['les unités : compte agents, aucune clé, délai et mémoire bornés, un minuteur toutes les 10 min ; le groupe videos est dans usine-agents.mjs et dans les noms du juge du socle', async (racine, d) => {
    const lireSi = (f) => { try { return lire(path.join(racine, f)) } catch { return null } }
    const svc = lireSi('scripts/usine/systemd/presti-videos.service'), tim = lireSi('scripts/usine/systemd/presti-videos.timer')
    if (!svc || !tim) { d.push('presti-videos.service ou .timer absent'); return }
    const ligne = (t, k) => new RegExp(`^${k}=(.*)$`, 'm').exec(t)?.[1]?.trim()
    if (ligne(svc, 'User') !== 'agents' || ligne(svc, 'Group') !== 'agents') d.push('le service ne tourne pas sous agents')
    if (ligne(svc, 'Type') !== 'oneshot') d.push('Type=oneshot attendu')
    if (/^EnvironmentFile=|^PassEnvironment=|^LoadCredential=|^ImportCredential=/m.test(svc)) d.push('le service lit un fichier d\'environnement ou des identifiants : l\'analyste n\'a aucune clé')
    if (/avec-coffre|presti-coffre|PRESTI_JETON/.test(svc)) d.push('le service passe par le coffre : l\'analyste n\'a aucune clé')
    if (ligne(svc, 'ExecStart') !== '/usr/bin/node scripts/usine/analyse-video.mjs --une-passe') d.push(`ExecStart : ${ligne(svc, 'ExecStart')}`)
    if (ligne(svc, 'WorkingDirectory') !== '/srv/presti-agents') d.push('WorkingDirectory=/srv/presti-agents attendu')
    const delai = ligne(svc, 'TimeoutStartSec'); const min = /^(\d+)min$/.exec(delai ?? '')
    if (!min || Number(min[1]) < 120 || Number(min[1]) > 170) d.push(`TimeoutStartSec=${delai} (de 120 à 170 min : plus long qu'une passe, plus court que le verrou de 3 h)`)
    if (!/^\d+[MG]$/.test(ligne(svc, 'MemoryMax') ?? '')) d.push('MemoryMax absent')
    if (!/^Nice=\d+$/m.test(svc)) d.push('Nice absent')
    if (!/^OnCalendar=\*:\d+\/10$/m.test(tim) || ligne(tim, 'Unit') !== 'presti-videos.service' || /^Persistent=true$/m.test(tim) || !/^WantedBy=timers\.target$/m.test(tim)) d.push('minuteur : OnCalendar=*:N/10, Unit=presti-videos.service, WantedBy=timers.target, pas de Persistent=true attendus')
    const ua = lireSi('scripts/usine-agents.mjs') ?? ''
    if (!/^\s*videos: \{ copier: \['presti-videos\*'\], activer: \['presti-videos\*\.timer'\] \},$/m.test(ua)) d.push('usine-agents.mjs : groupe videos absent ou mal formé')
    if (!/Groupes : [^\n]*\n[^\n]*videos/.test(ua) && !/\/\/ Groupes :[\s\S]{0,700}videos/.test(ua)) d.push('usine-agents.mjs : l\'en-tête ne cite pas le groupe videos')
    const noms = lireSi('scripts/fixtures/026/usine-socle/unites/noms.json')
    try {
      const g = JSON.parse(noms).groupes.videos
      if (!g || JSON.stringify(g.unites) !== JSON.stringify(['presti-videos.service', 'presti-videos.timer']) || JSON.stringify(g.a_activer) !== JSON.stringify(['presti-videos.timer']) || JSON.stringify(g.motifs) !== JSON.stringify(['presti-videos*'])) d.push('noms.json (juge du socle) : groupe videos absent ou faux')
    } catch { d.push('noms.json illisible') }
  }],

  'AV-11': ['la documentation : comment déposer une URL, où lire le résultat, les mesures, le modèle, les limites', async (racine, d) => {
    const doc = (() => { try { return lire(path.join(racine, 'docs/agents/analyste-videos.md')) } catch { return null } })()
    if (!doc) { d.push('docs/agents/analyste-videos.md absent'); return }
    for (const m of ['--deposer', 'a-analyser', 'analyses', 'journal.jsonl', 'qwen2.5vl:3b', 'a-part', 'tiktok.com', 'youtu.be', 'presti-videos']) if (!doc.includes(m)) d.push(`la doc ne cite pas « ${m} »`)
    for (const t of ['## Déposer une vidéo', '## Lire le résultat', '## Mesures', '## Limites']) if (!doc.includes(t)) d.push(`section « ${t} » absente`)
    const mesures = doc.split(/^## Mesures/m)[1]?.split(/^## /m)[0] ?? ''
    if (!/\b\d+\s*(?:s|min)\b/.test(mesures) || !/\bGo\b/.test(mesures)) d.push('« Mesures » ne donne ni temps ni mémoire chiffrés')
    if (!/pas de transcription audio/i.test(doc)) d.push('la doc ne dit pas « pas de transcription audio »')
  }],
}

CRITERES['AV-12'] = ['les sous-titres : un OCR de la bande basse de chaque image (une seule passe tesseract), les mots peu sûrs écartés, les phrases voisines fusionnées, le texte lu nourrit la synthèse et la garde des nombres ; sans tesseract l\'analyse se fait quand même', async (racine, d) => {
  const M = await importer(racine, SCRIPT)
  const tsv = ['level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext', '5\t1\t1\t1\t1\t1\t0\t0\t1\t1\t95\tbonjour', '5\t1\t1\t1\t1\t2\t0\t0\t1\t1\t30\tbruit', '5\t1\t1\t1\t1\t3\t0\t0\t1\t1\t90\t|', '5\t1\t1\t1\t1\t4\t0\t0\t1\t1\t80\tmonde', '5\t2\t1\t1\t1\t1\t0\t0\t1\t1\t95\tab', '5\t3\t1\t1\t1\t1\t0\t0\t1\t1\t95\t42'].join('\n')
  const lu = M.lireTsv(tsv)
  if (lu.get(1) !== 'bonjour monde') d.push(`lireTsv page 1 : « ${lu.get(1)} » (« bonjour monde » attendu : mot à confiance 30 et signe isolé écartés)`)
  if (lu.has(2) || lu.has(3)) d.push('lireTsv garde une page de moins de 3 lettres')
  const f = M.fusionnerSousTitres([{ t: 0, texte: 'search tiktok shop' }, { t: 3, texte: 'search tiktok shop finds' }, { t: 6, texte: 'search tiktok shop finds' }, { t: 9, texte: 'autre phrase' }])
  if (JSON.stringify(f) !== JSON.stringify([{ t: 0, texte: 'search tiktok shop finds' }, { t: 9, texte: 'autre phrase' }])) d.push(`fusion des phrases voisines : ${JSON.stringify(f)}`)
  if (M.CONFIANCE_OCR_MIN < 40 || M.CONFIANCE_OCR_MIN > 70) d.push(`CONFIANCE_OCR_MIN = ${M.CONFIANCE_OCR_MIN} (de 40 à 70 attendu)`)
  await banc(racine, 'av12', {}, async (c) => {
    c.depose('a.url', URL_BONNE)
    const r = await c.lancer(['--une-passe'])
    const md = analyseDe(c)
    if (!md) { d.push(`pas d'analyse : ${court(r.sortie, 160)}`); return }
    const annexe = md.split("## Sous-titres lus à l'écran (OCR, bruts)")[1]?.split(/^## /m)[0] ?? ''
    const lignes = annexe.split('\n').filter((l) => l.startsWith('- '))
    const attendu = ['- **0 s** — « AI dropshipping with $0 »', '- **3 s** — « search tiktok shop finds for 35,88 $ »', '- **8 s** — « paste a link and mint a brand »', '- **11 s** — « ten to 5 à 10 vidéos TikTok par jour »', '- **14 s** — « comment STORE »']
    if (JSON.stringify(lignes) !== JSON.stringify(attendu)) d.push(`sous-titres de l'annexe : ${JSON.stringify(lignes)}`)
    if (/\bSie\b|\|/.test(annexe)) d.push('un mot peu sûr (confiance 23) ou un signe isolé est dans les sous-titres')
    const t = c.appels().filter((a) => a.outil === 'tesseract')
    if (t.length !== 1) d.push(`${t.length} appels à tesseract (1 seul attendu : une liste d'images)`)
    else {
      const a = t[0].argv.join(' ')
      if (!/-l eng\+fra/.test(a) || !/--psm 6/.test(a) || !/ tsv$/.test(a)) d.push(`arguments de tesseract : ${court(a, 160)}`)
    }
    const ff = c.appels().filter((a) => a.outil === 'ffmpeg' && a.argv.join(' ').includes('lut='))
    if (ff.length !== 1 || !ff[0].argv.join(' ').includes(M.FILTRE_OCR) || !/crop=iw:ih\*0\.28:0:ih\*0\.58/.test(ff[0].argv.join(' ')) || !ff[0].argv.join(' ').includes('lut=y=if(gt(val')) d.push(`la bande de sous-titres n'est pas isolée par un seuil : ${court(ff[0]?.argv.join(' ') ?? 'aucun appel', 200)}`)
    const synth = requetesSynthese(c)[0]
    if (!synth || !/Sous-titres lus à l'écran par OCR/.test(synth.utilisateur) || !/t=14 s \| comment STORE/.test(synth.utilisateur)) d.push('la synthèse ne reçoit pas les sous-titres lus')
    if (!/sous-titres lus par OCR sur chaque image/.test(md)) d.push('la ligne de statut ne dit pas que les sous-titres sont lus par OCR')
    const notes = JSON.parse(lire(path.join(c.travail, 'analyses', 'ecomsantiagoo-7664657468739374366.notes.json')))
    if (notes.sous_titres?.length !== 5) d.push(`notes.json : ${notes.sous_titres?.length} sous-titres (5 attendus)`)
  })
  // Le nombre « 5 à 10 » n'existe que dans l'OCR (la vision ne l'a pas lu) : la synthèse qui le cite passe grâce à l'OCR, et est refusée sans lui.
  const vision = (f) => (f === 5 ? 'TEXTE: aucun\nIMAGE: L\'homme parle.' : undefined)
  await banc(racine, 'av12b', { ollama: { vision } }, async (c) => {
    c.depose('a.url', URL_BONNE)
    await c.lancer(['--une-passe'])
    if (!/^Statut : ok\./m.test(analyseDe(c) ?? '')) d.push('un nombre lu seulement par l\'OCR est refusé par la garde des nombres')
  })
  await banc(racine, 'av12c', { ollama: { vision } }, async (c) => {
    c.depose('a.url', URL_BONNE)
    await c.lancer(['--une-passe', '--sans-ocr'])
    const md = analyseDe(c) ?? ''
    if (!/^Statut : incertain\./m.test(md)) d.push('--sans-ocr : le nombre que seul l\'OCR avait lu devrait être refusé (statut incertain attendu)')
    if (c.appels().some((a) => a.outil === 'tesseract')) d.push('--sans-ocr : tesseract a été lancé')
    if (!/OCR indisponible : désactivé/.test(md)) d.push('--sans-ocr : l\'annexe ne dit pas que l\'OCR est désactivé')
  })
  // Sans tesseract : l'analyse se fait, et le dit.
  await banc(racine, 'av12d', {}, async (c) => {
    c.depose('a.url', URL_BONNE)
    const r = await c.lancer(['--une-passe', '--tesseract=' + path.join(c.dir, 'absent', 'tesseract')], { sans: ['--tesseract='] })
    const md = analyseDe(c) ?? ''
    if (r.code !== 0 || !/^Statut : ok\./m.test(md)) d.push(`tesseract absent : code ${r.code}, analyse ${md ? 'écrite' : 'absente'}`)
    if (!/OCR indisponible : tesseract n'est pas installé/.test(md)) d.push('tesseract absent : l\'annexe ne le dit pas')
    if (!c.journal().some((j) => j.evenement === 'ocr_absent' && j.cause === 'tesseract_absent')) d.push('tesseract absent : « ocr_absent » manque au journal')
  })
  // La langue française manque : une seconde lecture en anglais seul.
  await banc(racine, 'av12e', { tesseract: { sans_fra: true } }, async (c) => {
    c.depose('a.url', URL_BONNE)
    await c.lancer(['--une-passe'])
    const t = c.appels().filter((a) => a.outil === 'tesseract')
    if (t.length !== 2 || !t[1].argv.join(' ').includes('-l eng ')) d.push(`sans le français : ${t.length} appels à tesseract, le second « ${t[1]?.argv.join(' ')} » (-l eng attendu)`)
    if (!/^- \*\*0 s\*\* — « AI dropshipping/m.test(analyseDe(c) ?? '')) d.push('sans le français : les sous-titres ne sont pas lus en anglais')
  })
  // Tesseract en panne : l'analyse se fait, et le dit.
  await banc(racine, 'av12f', { tesseract: { panne: true } }, async (c) => {
    c.depose('a.url', URL_BONNE)
    const r = await c.lancer(['--une-passe'])
    const md = analyseDe(c) ?? ''
    if (r.code !== 0 || !/OCR indisponible : tesseract a échoué/.test(md) || !/^Statut : ok\./m.test(md)) d.push('tesseract en panne : l\'analyse devrait être écrite en le disant')
  })
}]

async function juger(racine, ids = Object.keys(CRITERES)) {
  const R = {}
  for (const id of ids) {
    const d = []
    try { await CRITERES[id][1](racine, d) } catch (e) { d.push(`exception : ${court(e?.stack || e, 240)}`) }
    R[id] = d
    console.log(`${d.length ? 'FAIL' : 'PASS'} ${id} — ${CRITERES[id][0]}${d.length ? `\n  ✗ ${d.slice(0, 4).map((x) => court(x, 220)).join('\n  ✗ ')}` : ''}`)
  }
  return R
}

// ── les sabotages (sur copie) : chacun doit rendre rouge le critère qu'il vise ───────────────────────────────────────────────────
const SABOTAGES = [
  ['AV-1', SCRIPT, "if (!HOTES_PERMIS.includes(u.hostname)) return { ok: false, raison: 'hote_non_autorise' }", ''],
  ['AV-1', SCRIPT, "if (u.username || u.password) return { ok: false, raison: 'identifiants_dans_url' }", ''],
  ['AV-1', SCRIPT, "if (u.protocol !== 'https:') return { ok: false, raison: 'protocole_non_https' }", ''],
  ['AV-1', SCRIPT, "if (meta.url_page) { const v = verifierUrl(meta.url_page); if (!v.ok) throw new Refus('hote_final_non_autorise', `la page finale n'est pas autorisée : ${v.raison}`) }", ''],
  ['AV-2', SCRIPT, "if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return { ok: false, raison: 'hors_du_dossier_de_travail' }", ''],
  ['AV-2', SCRIPT, "reel = fs.realpathSync(path.resolve(chemin))", "reel = path.resolve(chemin)"],
  ['AV-3', SCRIPT, "if (octets > TAILLE_MAX_O) throw new Refus('taille_trop_grande', `${octets} o > ${TAILLE_MAX_O} o`)", ''],
  ['AV-3', SCRIPT, "if (duree > DUREE_MAX_S) throw new Refus('duree_trop_longue', `${Math.round(duree)} s > ${DUREE_MAX_S} s`)", ''],
  ['AV-3', SCRIPT, "export const DELAI_TELECHARGEMENT_MS = 180_000", "export const DELAI_TELECHARGEMENT_MS = 900_000"],
  ['AV-3', SCRIPT, "export const IMAGES_MAX = 40", "export const IMAGES_MAX = 400"],
  ['AV-3', SCRIPT, "'--max-filesize', `${Math.floor(TAILLE_MAX_O / 1024 / 1024)}M`, ", ''],
  ['AV-4', SCRIPT, "export const bandeau = (modeleVision) => `Analyse automatique par un modèle de vision local (${modeleVision}) : à recouper, les chiffres lus à l'écran ne sont pas prouvés.`", "export const bandeau = (modeleVision) => `Analyse automatique (${modeleVision}).`"],
  ['AV-4', SCRIPT, "Number.isFinite(meta.vues) ? `**${MILLIERS(meta.vues)} vues**`", "Number.isFinite(meta.vues) ? `**${MILLIERS(meta.likes)} vues**`"],
  ['AV-4', SCRIPT, "{ cle: 'a_ne_pas_croire', titre: 'À ne pas croire' },\n", ''],
  ['AV-4', SCRIPT, "  p.push(Number.isFinite(meta.commentaires) ? `**${MILLIERS(meta.commentaires)} commentaires**` : 'commentaires non relevés')", "  p.push(`**${MILLIERS(meta.commentaires)} commentaires**`)"],
  ['AV-5', SCRIPT, "} finally { await liberer(o, o.vision) }", "} finally { /* modèle laissé en mémoire */ }"],
  ['AV-5', SCRIPT, "const IMAGE_ESSAIS = 3", "const IMAGE_ESSAIS = 1"],
  ['AV-5', SCRIPT, "const choix = choisirImages(minis, o.imagesVision)", "const choix = images.map((_, i) => i)"],
  ['AV-5', SCRIPT, "if (ecart(miniatures[i], miniatures[gardees[gardees.length - 1]]) >= seuil) gardees.push(i)", "gardees.push(i)"],
  ['AV-5', SCRIPT, "...(m.id === 'ollama_4b' ? {} : { keep_alive: 0 }),", ''],
  ['AV-6', SCRIPT, "if (absents.length) return { ok: false, fautes: [`nombre absent des notes et des métadonnées : ${[...new Set(absents)].slice(0, 8).join(', ')}`], publique: [`${new Set(absents).size} nombre(s) absent(s) des notes et des métadonnées`], synthese: propre, absents }", ''],
  ['AV-6', SCRIPT, "const connus = nombresDesMetadonnees(meta)\n  for (const n of nombresDuTexte(donneesTexte)) for (const v of n.valeurs) connus.add(Math.round(v * 1e6) / 1e6)", "const connus = new Set(Array.from({ length: 100000 }, (_, i) => i))"],
  ['AV-6', SCRIPT, "const statut = res.ok ? 'ok' : 'incertain'", "const statut = 'ok'"],
  ['AV-6', SCRIPT, "if (r.ok) return { ok: true, synthese: r.synthese, moteur: m.modele, fautes: [] }", "if (r.ok || r.synthese) return { ok: true, synthese: r.synthese, moteur: m.modele, fautes: [] }"],
  ['AV-7', SCRIPT, "      if (vivant) return { ok: false }\n", ''],
  ['AV-7', SCRIPT, "if (issue.definitif || n >= ESSAIS_MAX) {", "if (issue.definitif) {"],
  ['AV-7', SCRIPT, "export const ESSAIS_MAX = 3", "export const ESSAIS_MAX = 30"],
  ['AV-7', SCRIPT, "      e0.essais[nom] = { n, cause: 'interrompu (processus mort pendant l\\'analyse)', le: new Date().toISOString() }", "      e0.essais[nom] = { n: n - 1, cause: 'interrompu', le: new Date().toISOString() }"],
  ['AV-7', SCRIPT, "if (!o.refaire && fs.existsSync(sortie) && /^Statut : ok\\./m.test(fs.readFileSync(sortie, 'utf8')))", "if (false)"],
  ['AV-7', SCRIPT, "if (memoireDisponible(o.meminfo) < MEMOIRE_MIN_O) throw", "if (false) throw"],
  ['AV-7', SCRIPT, "if (!NOM_FILE.test(f)) {", "if (false) {"],
  ['AV-7', SCRIPT, "if (issue.code === 'memoire_basse') {", "if (false) {"],
  ['AV-7', SCRIPT, "  const sonde = trouverVideo(dir)\n  if (sonde && fs.existsSync(path.join(dir, 'video.info.json'))) return path.join(dir, sonde)\n", ''],
  ['AV-8', SCRIPT, "const e = { LANG: 'C.UTF-8' }", "const e = { ...process.env, LANG: 'C.UTF-8' }"],
  ['AV-8', SCRIPT, "if (chercherSecrets(md).length) throw new Refus('secret_dans_la_sortie', 'la sortie contient un secret : rien n\\'est écrit')", ''],
  ['AV-8', SCRIPT, "  if (process.env.HOME) e.HOME = process.env.HOME", "  if (process.env.HOME) e.HOME = process.env.HOME\n  if (process.env.PRESTI_JETON_CANARI) e.PRESTI_JETON_CANARI = process.env.PRESTI_JETON_CANARI"],
  ['AV-9', SCRIPT, "if (new URL(o.ollama).hostname !== '127.0.0.1') throw new Error('ollama : 127.0.0.1 seulement')", ''],
  ['AV-9', SCRIPT, "if (modes !== 1 || o.positionnels.length > 1) throw new Error('un seul mode : --une-passe, --deposer=<url> ou <url|chemin>')", ''],
  ['AV-10', 'scripts/usine/systemd/presti-videos.service', 'MemoryMax=1G\n', ''],
  ['AV-10', 'scripts/usine/systemd/presti-videos.service', 'Nice=10', 'Nice=10\nEnvironmentFile=/home/agents/.config/presti/agents.env'],
  ['AV-10', 'scripts/usine/systemd/presti-videos.service', 'ExecStart=/usr/bin/node scripts/usine/analyse-video.mjs --une-passe', 'ExecStart=/usr/bin/node scripts/usine/avec-coffre.mjs PRESTI_JETON_X -- /usr/bin/node scripts/usine/analyse-video.mjs --une-passe'],
  ['AV-10', 'scripts/usine/systemd/presti-videos.service', 'TimeoutStartSec=150min', 'TimeoutStartSec=20min'],
  ['AV-10', 'scripts/usine/systemd/presti-videos.service', 'User=agents', 'User=usine'],
  ['AV-10', 'scripts/usine/systemd/presti-videos.timer', 'Persistent=false', 'Persistent=true'],
  ['AV-10', 'scripts/usine-agents.mjs', "  videos: { copier: ['presti-videos*'], activer: ['presti-videos*.timer'] },\n", ''],
  ['AV-10', 'scripts/fixtures/026/usine-socle/unites/noms.json', '"videos": { "motifs": ["presti-videos*"], "unites": ["presti-videos.service", "presti-videos.timer"], "a_activer": ["presti-videos.timer"] }', '"videos": { "motifs": ["presti-videos*"], "unites": ["presti-videos.service"], "a_activer": ["presti-videos.timer"] }'],
  ['AV-12', SCRIPT, 'export const CONFIANCE_OCR_MIN = 50', 'export const CONFIANCE_OCR_MIN = 0'],
  ['AV-12', SCRIPT, "if (prec && n.length >= 4 && prec.n.includes(n)) continue\n    if (prec && prec.n.length >= 4 && n.includes(prec.n)) { prec.texte = l.texte; prec.n = n; continue }\n", ''],
  ['AV-12', SCRIPT, '...sous.lignes.map((l) => `${l.t} s ${l.texte}`), ', ''],
  ['AV-12', SCRIPT, 'consigneSynthese(meta, notes, derniere?.absents ? [derniere.fautes[0]] : null, sousTitres)', 'consigneSynthese(meta, notes, derniere?.absents ? [derniere.fautes[0]] : null, [])'],
  ['AV-12', SCRIPT, 'lut=y=if(gt(val\\\\,215)\\\\,0\\\\,255)', 'format=gray'],
  ['AV-12', SCRIPT, "if (t.code === -1) { journal({ evenement: 'ocr_absent', cause: 'tesseract_absent' }); return { actif: false, raison: 'tesseract n\\'est pas installé sur cette machine', lignes: [] } }", ''],
  ['AV-12', SCRIPT, "if (t.code !== 0 && langues.includes('+')) {", 'if (false) {'],
  ['AV-12', SCRIPT, "if (o.sansOcr) return { actif: false, raison: 'désactivé (--sans-ocr)', lignes: [] }", ''],
  ['AV-11', 'docs/agents/analyste-videos.md', '## Limites', '## Remarques'],
]

function copierRacine(nom) {
  const d = path.join(TRAVAIL, 'racines', nom)
  fs.rmSync(d, { recursive: true, force: true })
  for (const f of COPIE) { const src = path.join(RACINE, f); if (!fs.existsSync(src)) continue; fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.writeFileSync(path.join(d, f), lire(src).replaceAll('\r\n', '\n')) }
  return d
}

async function principal() {
  if (!fs.existsSync(path.join(RACINE, SCRIPT))) { console.error(`✗ préalable absent : ${SCRIPT}`); return 2 }
  fs.mkdirSync(TRAVAIL, { recursive: true })
  const ids = SEUL ? [SEUL] : Object.keys(CRITERES)
  for (const id of ids) if (!CRITERES[id]) { console.error(`✗ critère inconnu : ${id}`); return 2 }
  try {
    if (!AUTO) {
      const R = await juger(RACINE, ids)
      const rouges = Object.entries(R).filter(([, d]) => d.length).map(([id]) => id)
      console.log(`\n${rouges.length ? '✗' : '✓'} analyse-video-qa : ${Object.keys(R).length - rouges.length}/${Object.keys(R).length} critère(s) vert(s)${rouges.length ? ` — rouge(s) : ${rouges.join(', ')}` : ''}`)
      return rouges.length ? 1 : 0
    }
    console.log('## témoin (le dépôt tel quel)')
    const R0 = await juger(copierRacine('temoin'))
    const ko0 = Object.values(R0).filter((d) => d.length).length
    console.log('\n## sabotages (chacun doit rendre rouge le critère qu\'il vise)')
    let nonAttrapes = 0, n = 0
    for (const [id, rel, avant, apres] of SABOTAGES) {
      n++
      const racine = copierRacine(`sab-${n}`)
      const f = path.join(racine, rel)
      let texte = lire(f)
      if (texte.split(avant).length !== 2) { console.log(`✗ sabotage ${n} (${id}) inapplicable : « ${court(avant, 80)} » vu ${texte.split(avant).length - 1} fois dans ${rel}`); nonAttrapes++; continue }
      fs.writeFileSync(f, texte.replace(avant, () => apres))
      const d = []
      try { await CRITERES[id][1](racine, d) } catch (e) { d.push(`exception : ${court(e?.message || e, 120)}`) }
      if (d.length) console.log(`✓ sabotage ${n} → ${id} rouge : ${court(d[0], 130)}`)
      else { console.log(`✗ sabotage ${n} → ${id} reste VERT : « ${court(avant, 90)} » → « ${court(apres, 60)} »`); nonAttrapes++ }
    }
    const ok = ko0 === 0 && nonAttrapes === 0
    console.log(`\n${ok ? 'PASS' : 'FAIL'} analyse-video-qa --auto-controle : témoin ${Object.keys(R0).length - ko0}/${Object.keys(R0).length} vert, ${n - nonAttrapes}/${n} sabotages attrapés`)
    return ok ? 0 : 1
  } finally { fs.rmSync(TRAVAIL, { recursive: true, force: true }) }
}

principal().then((c) => { process.exitCode = c }).catch((e) => { console.error(e); process.exitCode = 1 })
