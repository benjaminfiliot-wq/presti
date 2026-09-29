// scripts/fixtures/026-acquisition/envoi/essai-porteur.mjs — l'essai réel du porteur du formulaire (fiche 026-095), joué par le juge
// (facteur-qa --partie=porteur --ici) SUR L'USINE : le vrai script scripts/agents/porteur-formulaire.mjs, dans un vrai Chromium,
// contre des sites témoins en 127.0.0.1 et une doublure de l'API du porteur ; les trois routes par le banc de routes du juge.
// Une ligne ✅/❌ par critère (PF-3 à PF-15), puis « essai-porteur : PASS|FAIL ». Aucun envoi réel : tout reste sur 127.0.0.1.
//   node --import ./scripts/ts-loader.mjs scripts/fixtures/026-acquisition/envoi/essai-porteur.mjs [--racine=<d>]
// --racine : le dossier dont on juge le code (défaut : ce dépôt) ; les jeux d'essai viennent toujours de ce dépôt-ci.
// ROUTES_SEULES=1 : les routes et le source seuls, sans Chromium (vite, sur le poste) ; jamais le verdict officiel.
import http from 'node:http'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { pathToFileURL, fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const RF = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..') // ce dépôt : jeux d'essai et chargeur
const argRacine = process.argv.slice(2).find((a) => a.startsWith('--racine='))
const R = argRacine ? path.resolve(argRacine.slice('--racine='.length)) : RF // le code jugé
const FX = (...p) => path.join(RF, ...p)
const F = (...p) => path.join(R, ...p)
const { UA_RECENSEUR, NOM_EXPEDITEUR } = await import(pathToFileURL(F('lib', 'agents', 'acquisition', 'contrat.ts')).href)
const { demarrerServeurFormulaires, RAISONS, FORMULAIRE_CONFORME, FORMULAIRE_TELEPHONE_REQUIS, FORMULAIRE_MOTIF_DEVIS_SEUL, FORMULAIRE_MAXLENGTH_COURT } = await import(pathToFileURL(FX('scripts', 'fixtures', '026-acquisition', 'envoi', 'formulaires.mjs')).href)
const { banc: bancBrut } = await import(pathToFileURL(FX('scripts', 'fixtures', '026-acquisition', 'envoi', 'commun.mjs')).href)

// Le banc du juge génère ses doublures de modules avec une URL data: identique d'un appel à l'autre : Node les met en cache, et
// elles gardent le globalThis.__DBL du PREMIER appel. On retient ce premier objet et on le repilote à chaque appel.
let D1 = null, Dcourant
Object.defineProperty(globalThis, '__DBL', { configurable: true, get() { return Dcourant }, set(v) { Dcourant = v; if (!D1) D1 = v } })
async function banc(fichier, opts = {}) {
  if (D1) { D1.comportements = opts.comportements ?? {}; D1.valeurs = opts.valeurs ?? {}; D1.journal.length = 0 }
  const r = await bancBrut(fichier, opts)
  return { ...r, journal: (D1 ?? Dcourant).journal.slice() }
}
const sha256 = (x) => crypto.createHash('sha256').update(x).digest('hex')
const uuid = () => crypto.randomUUID()
const rouges = []
const ok = (id, e, detail) => { if (e.length) { rouges.push(id); console.log(`❌ ${id} ${detail} — ${e.join(' ; ')}`) } else console.log(`✅ ${id} ${detail}`) }
const JETON = 'jeton-essai-porteur'
const ADRESSE = 'prospection@presti-essai.invalid'
const TEXTE = `Message commercial de Presti, rédigé et envoyé par l'assistant IA de Presti. Ce n'est pas une demande de devis. Bonjour, votre site nous a intéressés : nous aimerions vous présenter Presti, l'assistant des artisans. ${'Réf. TEM-ESSAI. '.repeat(6)}`
const OBJET = 'Presti pour Menuiserie Témoin'

// ── Les sites témoins ────────────────────────────────────────────────────────────────────────────────────────────────────
function serveur(gestionnaire) {
  const requetes = []
  const s = http.createServer((req, res) => {
    let corps = ''
    req.on('data', (c) => { corps += c })
    req.on('end', () => { const r = { methode: req.method, chemin: (req.url ?? '').split('?')[0], ua: req.headers['user-agent'] ?? null, cookie: req.headers.cookie ?? null, corps }; requetes.push(r); gestionnaire(req, res, r) })
  })
  return new Promise((resolve) => s.listen(0, '127.0.0.1', () => resolve({ s, requetes, port: s.address().port, base: `http://127.0.0.1:${s.address().port}`, arreter: () => new Promise((r) => s.close(() => r())) })))
}
const formHtml = (action, dedans = '') => `<form action="${action}" method="post">
  <p><label>Nom<br><input type="text" name="your-name" required></label></p>
  <p><label>E-mail<br><input type="email" name="your-email" required></label></p>
  <p><label>Objet<br><input type="text" name="your-subject"></label></p>
  <p><label>Téléphone<br><input type="tel" name="your-phone"></label></p>
  <p><label>Motif<br><select name="your-motif"><option>Devis</option><option>Autre demande</option></select></label></p>
  <p><label>Message<br><textarea name="your-message" required maxlength="3000"></textarea></label></p>
  ${dedans}<p><input type="submit" value="Envoyer"></p></form>`
const pageTemoin = (action) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Plomberie Témoin</title></head><body>
  <h1>Plomberie Témoin</h1>
  <p id="hors-form">Écrivez-nous : <a href="mailto:contact@plomberie-temoin.invalid">contact@plomberie-temoin.invalid</a> ou appelez le 06 12 34 56 78.</p>
  ${formHtml(action, '<p id="dans-form">Ou par e-mail : <a id="lien-tel" href="tel:0612345678">06 12 34 56 78</a> · <span id="texte-mail">contact@plomberie-temoin.invalid</span></p>')}
  </body></html>`
const CONFIRMATION = '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Merci</title></head><body><h1>Plomberie Témoin</h1><div id="confirmation"><p>Merci, votre message a bien été envoyé.</p><p>Nous vous répondrons dans les meilleurs délais.</p></div></body></html>'

// ── La doublure de l'API du porteur ──────────────────────────────────────────────────────────────────────────────────────
const api = { envois: [], adresse: ADRESSE, verifier: null, oppositions: [], garder: null, appels: [], panne: false }
const apiServeur = await new Promise((resolve) => {
  const s = http.createServer((req, res) => {
    let corps = ''
    req.on('data', (c) => { corps += c })
    req.on('end', () => {
      const u = new URL(req.url, 'http://x')
      const json = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)) }
      if (req.headers.authorization !== `Bearer ${JETON}`) return json(401, { error: 'jeton' })
      let b = null; try { b = corps ? JSON.parse(corps) : null } catch { b = null }
      api.appels.push({ methode: req.method, chemin: u.pathname.replace('/api/usine/porteur/', ''), verifier: u.searchParams.get('verifier'), corps: b })
      if (api.panne) return json(503, { error: 'panne' })
      const p = u.pathname
      if (p.endsWith('/travail') && req.method === 'GET') {
        const id = u.searchParams.get('verifier')
        if (id) { const e = api.envois.find((x) => x.id === id); try { return json(200, api.verifier ? api.verifier(id, e) : { ok: true, empreinte_texte: sha256(e?.texte ?? '') }) } catch { return json(500, { error: 'x' }) } }
        return json(200, { envois: api.envois, adresse: api.adresse })
      }
      if (p.endsWith('/rendu') && req.method === 'POST') return json(200, { ok: true })
      if (p.endsWith('/oppositions') && req.method === 'GET') return json(200, { oppositions: api.oppositions })
      if (p.endsWith('/oppositions') && req.method === 'POST') return json(200, api.garder ? api.garder(b) : { garder: [] })
      json(404, { error: 'inconnu' })
    })
  })
  s.listen(0, '127.0.0.1', () => resolve(s))
})
const API_URL = `http://127.0.0.1:${apiServeur.address().port}`
const rendus = () => api.appels.filter((a) => a.chemin === 'rendu').map((a) => a.corps)

// ── Lancer le vrai script ────────────────────────────────────────────────────────────────────────────────────────────────
function lancer(args, preuves, env = {}) {
  return new Promise((resolve) => {
    const c = spawn(process.execPath, ['--import', pathToFileURL(FX('scripts', 'ts-loader.mjs')).href, 'scripts/agents/porteur-formulaire.mjs', ...args], { cwd: R, env: { ...process.env, PRESTI_URL: API_URL, PRESTI_PORTEUR_ESSAI: '1', PRESTI_PREUVES_DIR: preuves, PRESTI_JETON_FACTEUR_USINE: JETON, PRESTI_PORTEUR_SANS_BAC: '1', ...env } })
    let sortie = ''
    c.stdout.on('data', (d) => { sortie += d }); c.stderr.on('data', (d) => { sortie += d })
    c.on('close', (code) => resolve({ code, sortie }))
  })
}
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'porteur-essai-'))
const reinit = () => { api.envois = []; api.appels = []; api.verifier = null; api.oppositions = []; api.garder = null; api.panne = false }
const envoi = (formulaire, surcharges = {}) => ({ id: uuid(), texte: TEXTE, objet: OBJET, reference: 'TEM-ESSAI', technologie: formulaire.technologie ?? 'contact_form_7', formulaire, ...surcharges })
const listerFichiers = (d) => { const o = []; const marche = (x) => { for (const n of fs.readdirSync(x)) { const p = path.join(x, n); fs.statSync(p).isDirectory() ? marche(p) : o.push(p) } }; try { marche(d) } catch { /* vide */ } return o }
const mode = (p) => (fs.statSync(p).mode & 0o777).toString(8)
const dimsJpeg = (buf) => { let i = 2; while (i < buf.length) { if (buf[i] !== 0xff) { i++; continue } const m = buf[i + 1]; if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { h: buf.readUInt16BE(i + 5), l: buf.readUInt16BE(i + 7) }; i += 2 + buf.readUInt16BE(i + 2) } return null }

const ROUTES = process.env.ROUTES_SEULES === '1' // pour aller vite sur le poste : les routes seules, sans Chromium
const navigateur = ROUTES ? null : await chromium.launch({ headless: true, args: ['--no-sandbox'] })
const pixels = async (buf) => {
  const page = await navigateur.newPage()
  try {
    return await page.evaluate(async (b64) => {
      const img = new Image(); img.src = `data:image/jpeg;base64,${b64}`; await img.decode()
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
      const x = c.getContext('2d'); x.drawImage(img, 0, 0)
      const d = x.getImageData(0, 0, c.width, c.height).data
      const vus = new Set(); let magenta = 0
      for (let i = 0; i < d.length; i += 4) { vus.add((d[i] >> 4) * 256 + (d[i + 1] >> 4) * 16 + (d[i + 2] >> 4)); if (d[i] > 200 && d[i + 1] < 90 && d[i + 2] > 200) magenta++ }
      return { l: c.width, h: c.height, couleurs: vus.size, magenta, data: Array.from(d.subarray(0, 0)) }
    }, buf.toString('base64'))
  } finally { await page.close() }
}
const couleurAuPoint = async (buf, x, y) => {
  const page = await navigateur.newPage()
  try {
    return await page.evaluate(async ([b64, px, py]) => {
      const img = new Image(); img.src = `data:image/jpeg;base64,${b64}`; await img.decode()
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height
      const g = c.getContext('2d'); g.drawImage(img, 0, 0)
      const d = g.getImageData(Math.max(0, Math.min(img.width - 1, Math.round(px))), Math.max(0, Math.min(img.height - 1, Math.round(py))), 1, 1).data
      return [d[0], d[1], d[2]]
    }, [buf.toString('base64'), x, y])
  } finally { await page.close() }
}

// ═════════════════════════════════════════════════════════════════ PF-5, PF-12 : la soumission conforme ═════════════════
if (!ROUTES) {
  reinit()
  const action = await serveur((req, res, r) => {
    if (r.chemin === '/robots.txt') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('User-agent: *\nAllow: /\n') }
    if (r.methode === 'POST') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(CONFIRMATION) }
    if (r.chemin === '/contact') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(pageTemoin('/contact/envoyer')) }
    res.writeHead(404); res.end('x')
  })
  const preuves = tmp()
  const f = { ...FORMULAIRE_CONFORME, url_page: `${action.base}/contact`, url_action: `${action.base}/contact/envoyer` }
  const e = envoi(f)
  api.envois = [e]
  const r = await lancer([], preuves)
  const posts = action.requetes.filter((x) => x.methode === 'POST')
  const e5 = []
  if (r.code !== 0) e5.push(`code de sortie ${r.code}`)
  if (posts.length !== 1) e5.push(`${posts.length} requête(s) de soumission, 1 attendue`)
  else {
    const champs = Object.fromEntries(new URLSearchParams(posts[0].corps))
    const attendu = { 'your-name': NOM_EXPEDITEUR, 'your-email': ADRESSE, 'your-subject': OBJET, 'your-phone': '', 'your-motif': 'Autre demande', 'your-message': TEXTE }
    for (const [k, v] of Object.entries(attendu)) if (champs[k] !== v) e5.push(`champ ${k} : « ${String(champs[k]).slice(0, 40)} », autre chose attendue`)
    const inattendus = Object.keys(champs).filter((k) => !(k in attendu))
    if (inattendus.length) e5.push(`champs en trop : ${inattendus.join(', ')}`)
  }
  for (const q of action.requetes) { if (q.ua !== UA_RECENSEUR) e5.push(`User-Agent ${q.ua} sur ${q.chemin}`); if (q.cookie) e5.push(`cookie envoyé sur ${q.chemin}`) }
  const rd = rendus()
  if (rd.length !== 1 || rd[0].ok !== true) e5.push(`rendu : ${JSON.stringify(rd).slice(0, 200)}`)
  else {
    const p = rd[0].preuve
    if (p.code_http !== 200) e5.push(`code_http ${p.code_http}`)
    if (p.empreinte_texte !== sha256(TEXTE)) e5.push('empreinte_texte ≠ SHA-256 du texte soumis')
    if (rd[0].envoi_id !== e.id) e5.push('envoi_id')
  }
  const dossier = path.join(preuves, 'formulaires', new Date().toISOString().slice(0, 7), e.id)
  const fichiers = ['avant.jpg', 'apres.jpg', 'texte.txt', 'preuve.json']
  let tailleAvant = 0
  for (const n of fichiers) {
    const p = path.join(dossier, n)
    if (!fs.existsSync(p)) { e5.push(`${n} absent`); continue }
    if (mode(p) !== '600') e5.push(`${n} en ${mode(p)}, 600 attendu`)
  }
  if (fs.existsSync(dossier) && mode(dossier) !== '700') e5.push(`dossier en ${mode(dossier)}, 700 attendu`)
  const dimsForm = await (async () => {
    const page = await navigateur.newPage({ viewport: { width: 1280, height: 1000 } })
    await page.goto(`${action.base}/contact`)
    const b = await page.locator('form').boundingBox()
    const zones = await page.evaluate(() => {
      const fr = document.querySelector('form').getBoundingClientRect()
      const rel = (el) => { const b = el.getBoundingClientRect(); return { x: b.x - fr.x + b.width / 2, y: b.y - fr.y + b.height / 2 } }
      return { tel: rel(document.querySelector('#lien-tel')), mail: rel(document.querySelector('#texte-mail')) }
    })
    await page.close(); return { b, zones }
  })()
  for (const n of ['avant.jpg', 'apres.jpg']) {
    const p = path.join(dossier, n)
    if (!fs.existsSync(p)) continue
    const buf = fs.readFileSync(p)
    if (n === 'avant.jpg' && buf.length <= 10 * 1024) e5.push(`${n} : ${buf.length} octets (plus de 10 Ko attendus)`)
    if (n === 'apres.jpg' && buf.length <= 2 * 1024) e5.push(`${n} : ${buf.length} octets (une capture vide ?)`)
    let px = null; try { px = await pixels(buf) } catch { e5.push(`${n} ne se décode pas`) }
    if (px && px.couleurs < 8) e5.push(`${n} uniforme (${px.couleurs} couleurs)`)
    if (n === 'avant.jpg' && px) {
      if (Math.abs(px.l - dimsForm.b.width) > 2 || Math.abs(px.h - dimsForm.b.height) > 2) e5.push(`avant.jpg ${px.l}×${px.h}, l'élément <form> mesure ${Math.round(dimsForm.b.width)}×${Math.round(dimsForm.b.height)} (± 2 px)`)
      tailleAvant = buf.length
    }
  }
  ok('PF-5', e5, `un seul POST aux champs exacts, User-Agent du recenseur, aucun cookie, rendu à empreinte exacte, deux JPEG décodables et non uniformes, avant > 10 Ko (${tailleAvant} o), aux dimensions du <form>, fichiers en 0600`)
  // PF-12 : les adresses et le numéro sont masqués dans « avant », et la page entière n'est jamais capturée.
  const e12 = []
  const av = path.join(dossier, 'avant.jpg')
  if (fs.existsSync(av)) {
    const buf = fs.readFileSync(av)
    const px = await pixels(buf)
    if (px.magenta < 200) e12.push(`aucune zone masquée dans avant.jpg (${px.magenta} px de la couleur du masque)`)
    for (const [nom, z] of Object.entries(dimsForm.zones)) {
      const [rr, gg, bb] = await couleurAuPoint(buf, z.x, z.y)
      if (!(rr > 190 && gg < 110 && bb > 190)) e12.push(`la zone « ${nom} » n'est pas de la couleur du masque (${rr},${gg},${bb})`)
    }
  } else e12.push('avant.jpg absent')
  const src = fs.readFileSync(F('scripts', 'agents', 'porteur-formulaire.mjs'), 'utf8')
  if (/page\.screenshot\(|fullPage/.test(src)) e12.push('page.screenshot( ou fullPage dans le script')
  const lignesCapture = src.split('\n').filter((l) => /\.screenshot\(/.test(l))
  if (!lignesCapture.length || !lignesCapture.every((l) => /cible\.screenshot\(/.test(l))) e12.push('un screenshot( ne part pas d\'un locator')
  if (!/mask:/.test(src)) e12.push('aucun mask dans le script')
  ok('PF-12', e12, 'l\'adresse, le lien mailto:, le numéro et le lien tel: du formulaire sont de la couleur du masque ; locator + mask avant chaque screenshot, jamais la page entière')
  await action.arreter()
  fs.rmSync(preuves, { recursive: true, force: true })
}

// ═════════════════════════════════════════════════════════════════ PF-3, PF-13 : les abandons ═════════════════════════════
if (!ROUTES) {
  reinit()
  const site = await demarrerServeurFormulaires()
  const preuves = tmp()
  const envois = RAISONS.map((r) => {
    const base = r.raison === 'telephone_requis' ? FORMULAIRE_TELEPHONE_REQUIS : r.raison === 'motif_devis_seul' ? FORMULAIRE_MOTIF_DEVIS_SEUL : r.raison === 'longueur' ? FORMULAIRE_MAXLENGTH_COURT : FORMULAIRE_CONFORME
    return { r, e: envoi({ ...base, url_page: site.urlDe(r.chemin), url_action: site.urlDe('/contact/envoyer') }) }
  })
  api.envois = envois.map((x) => x.e)
  const res = await lancer([], preuves)
  const e3 = [], e13 = []
  if (res.code !== 0) e3.push(`code de sortie ${res.code}`)
  const posts = site.requetes.filter((x) => x.methode === 'POST')
  if (posts.length) e3.push(`${posts.length} requête(s) de soumission sur des pages d'abandon`)
  const rd = rendus()
  for (const { r, e } of envois) {
    const m = rd.find((x) => x.envoi_id === e.id)
    if (!m) { e3.push(`${r.id} : aucun rendu`); continue }
    if (m.ok !== false || m.definitif !== true) e3.push(`${r.id} : rendu ${JSON.stringify(m).slice(0, 120)}, échec définitif attendu`)
    else if (m.raison !== r.raison) e3.push(`${r.id} : raison « ${m.raison} », « ${r.raison} » attendue`)
    const dossier = path.join(preuves, 'formulaires', new Date().toISOString().slice(0, 7), e.id)
    const ab = path.join(dossier, 'abandon.json')
    if (!fs.existsSync(ab)) { e13.push(`${r.id} : pas d'abandon.json`); continue }
    const j = JSON.parse(fs.readFileSync(ab, 'utf8'))
    if (j.raison !== r.raison) e13.push(`${r.id} : abandon.json raison ${j.raison}`)
    if (!/^[0-9a-f]{64}$/.test(j.empreinte_html ?? '')) e13.push(`${r.id} : empreinte de 64 signes absente`)
    const autres = Object.keys(j).filter((k) => !['raison', 'empreinte_html'].includes(k))
    if (autres.length) e13.push(`${r.id} : abandon.json porte aussi ${autres.join(', ')}`)
    if (mode(ab) !== '600') e13.push(`${r.id} : abandon.json en ${mode(ab)}`)
  }
  const jpeg = listerFichiers(preuves).filter((p) => /\.(jpe?g|png)$/i.test(p))
  if (jpeg.length) e13.push(`${jpeg.length} image(s) écrite(s) sur des abandons`)
  ok('PF-3', e3, `${RAISONS.length} pages d'abandon passées par le vrai script : chacune à sa raison exacte, définitive, aucune soumission`)
  ok('PF-13', e13, 'chaque abandon : aucun JPEG ; abandon.json = la raison et une empreinte SHA-256 de 64 signes, rien d\'autre')
  await site.arreter()
  fs.rmSync(preuves, { recursive: true, force: true })
}

// ═════════════════════════════════════════════════════════════════ PF-4 : robots.txt de l'action ═════════════════════════
if (!ROUTES) {
  reinit()
  const cible = await serveur((req, res, r) => {
    if (r.chemin === '/robots.txt') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('User-agent: *\nDisallow: /envoyer\n') }
    res.writeHead(200); res.end('x')
  })
  const page = await serveur((req, res, r) => {
    if (r.chemin === '/robots.txt') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('User-agent: *\nAllow: /\n') }
    if (r.chemin === '/contact') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(pageTemoin(`${cible.base}/envoyer`)) }
    res.writeHead(404); res.end('x')
  })
  const preuves = tmp()
  const e = envoi({ ...FORMULAIRE_CONFORME, url_page: `${page.base}/contact`, url_action: `${cible.base}/envoyer` })
  api.envois = [e]
  await lancer([], preuves)
  const e4 = []
  const rd = rendus()
  if (rd.length !== 1 || rd[0].ok !== false || rd[0].raison !== 'robots_txt' || rd[0].definitif !== true) e4.push(`rendu : ${JSON.stringify(rd).slice(0, 160)}`)
  const versAction = cible.requetes.filter((x) => x.chemin !== '/robots.txt')
  if (versAction.length) e4.push(`${versAction.length} requête(s) vers l'action`)
  if (page.requetes.some((x) => x.chemin === '/contact')) e4.push('la page a été chargée alors que l\'action est interdite')
  ok('PF-4', e4, 'robots.txt qui interdit l\'action (la page étant permise) : abandon robots_txt définitif, aucune requête vers l\'action')
  await page.arreter(); await cible.arreter()
  fs.rmSync(preuves, { recursive: true, force: true })
}

// ═════════════════════════════════════════════════════════════════ La relecture juste avant le clic ═════════════════════
if (!ROUTES) {
  reinit()
  const site = await serveur((req, res, r) => {
    if (r.chemin === '/robots.txt') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('User-agent: *\nAllow: /\n') }
    if (r.methode === 'POST') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(CONFIRMATION) }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(pageTemoin('/contact/envoyer'))
  })
  const f = { ...FORMULAIRE_CONFORME, url_page: `${site.base}/contact`, url_action: `${site.base}/contact/envoyer` }
  const e = []
  for (const [nom, rep, attendRendu] of [
    ['pause générale / opposition / accord tombé', { ok: false, raison: 'pause' }, false],
    ['accord donné pour un autre texte', { ok: true, empreinte_texte: sha256('un autre texte') }, true],
    ['relecture indisponible (route en panne)', null, false],
  ]) {
    reinit(); site.requetes.length = 0
    const en = envoi(f); api.envois = [en]
    if (rep) api.verifier = () => rep
    else api.verifier = () => { throw new Error('x') }
    const preuves = tmp()
    await lancer([], preuves)
    const versLeSite = site.requetes.filter((x) => x.chemin !== '/robots.txt')
    if (versLeSite.length) e.push(`${nom} : ${versLeSite.length} requête(s) vers le site alors que rien ne devait partir`)
    const rd = rendus()
    if (attendRendu ? !(rd.length === 1 && rd[0].ok === false && rd[0].definitif === true && rd[0].raison === 'accord_texte') : rd.length !== 0) e.push(`${nom} : rendu ${JSON.stringify(rd).slice(0, 120)}`)
    fs.rmSync(preuves, { recursive: true, force: true })
  }
  ok('PF-14', e, 'pause, opposition, accord tombé ou autre texte : rien n\'est soumis (l\'accord d\'un autre texte est un abandon définitif accord_texte) ; relecture en panne : rien')
  await site.arreter()
}

// ═════════════════════════════════════════════════════════════════ PF-8 : jamais deux soumissions ═══════════════════════
if (!ROUTES) {
  reinit()
  const site = await serveur((req, res, r) => {
    if (r.chemin === '/robots.txt') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end('User-agent: *\nAllow: /\n') }
    if (r.methode === 'POST') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(CONFIRMATION) }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); res.end(pageTemoin('/contact/envoyer'))
  })
  const preuves = tmp()
  const e = envoi({ ...FORMULAIRE_CONFORME, url_page: `${site.base}/contact`, url_action: `${site.base}/contact/envoyer` })
  api.envois = [e]
  const [a, b] = await Promise.all([lancer([], preuves), lancer([], preuves)])
  const e8 = []
  const posts = site.requetes.filter((x) => x.methode === 'POST')
  if (posts.length !== 1) e8.push(`${posts.length} requête(s) de soumission, 1 attendue`)
  if (rendus().length !== 1) e8.push(`${rendus().length} rendu(s), 1 attendu`)
  if (a.code !== 0 || b.code !== 0) e8.push(`codes ${a.code}/${b.code}`)
  // une passe qui arrive APRÈS la soumission (le bail de la base a expiré, l'envoi est réoffert) ne resoumet pas non plus
  api.appels.length = 0
  const c = await lancer([], preuves)
  const posts2 = site.requetes.filter((x) => x.methode === 'POST')
  if (posts2.length !== 1) e8.push(`une passe tardive a resoumis (${posts2.length} POST)`)
  ok('PF-8', e8, 'deux passages lancés ensemble sur le même envoi : un seul POST, un seul rendu ; une passe tardive ne resoumet jamais')
  await site.arreter()
  fs.rmSync(preuves, { recursive: true, force: true })
}

// ═════════════════════════════════════════════════════════════════ PF-10 : l'export de nuit ═════════════════════════════
if (!ROUTES) {
  reinit()
  const preuves = tmp()
  const vieux = uuid(), recent = uuid(), efface = uuid(), orphelin = uuid()
  const poser = (mois, id) => { const d = path.join(preuves, 'formulaires', mois, id); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, 'preuve.json'), '{}') }
  poser('2023-08', vieux); poser('2026-09', recent); poser('2026-09', efface); poser('2026-08', orphelin)
  api.oppositions = [{ cle_type: 'domaine', cle_valeur: 'opposant-temoin.invalid', expire_le: null, cree_le: '2026-09-01T00:00:00Z' }, { cle_type: 'siren', cle_valeur: '123456782', expire_le: '2026-09-20T00:00:00Z', cree_le: '2026-06-01T00:00:00Z' }]
  api.garder = () => ({ garder: [vieux, recent] })
  const r = await lancer(['--export-nuit'], preuves)
  const e10 = []
  if (r.code !== 0) e10.push(`code de sortie ${r.code}`)
  const jsonl = path.join(preuves, 'oppositions', `${new Date().toISOString().slice(0, 10)}.jsonl`)
  if (!fs.existsSync(jsonl)) e10.push('oppositions/<date>.jsonl absent')
  else {
    if (mode(jsonl) !== '600') e10.push(`jsonl en ${mode(jsonl)}`)
    if (fs.readFileSync(jsonl, 'utf8').trim().split('\n').length !== 2) e10.push('le jsonl ne porte pas les 2 oppositions')
  }
  const post = api.appels.find((a) => a.methode === 'POST' && a.chemin === 'oppositions')
  const ids = post?.corps?.envois ?? []
  for (const id of [vieux, recent, efface, orphelin]) if (!ids.includes(id)) e10.push(`le POST ne porte pas le dossier ${id}`)
  const existe = (mois, id) => fs.existsSync(path.join(preuves, 'formulaires', mois, id))
  if (!existe('2023-08', vieux)) e10.push('le dossier de 37 mois, rendu par la base, a été effacé')
  if (!existe('2026-09', recent)) e10.push('un dossier rendu par la base a été effacé')
  if (existe('2026-09', efface) || existe('2026-08', orphelin)) e10.push('un dossier que la base ne rend pas est resté')
  if (/[0-9a-f]{8}-[0-9a-f]{4}|invalid|opposant|123456782/i.test(r.sortie)) e10.push('la sortie porte autre chose que des comptes')
  // route injoignable, réponse mal formée : rien n'est effacé
  for (const [nom, mise] of [['route en panne', () => { api.panne = true }], ['réponse mal formée', () => { api.panne = false; api.garder = () => ({ garder: ['pas-un-uuid'] }) }]]) {
    poser('2026-09', efface); mise()
    const r2 = await lancer(['--export-nuit'], preuves)
    if (!existe('2026-09', efface) || !existe('2023-08', vieux)) e10.push(`${nom} : un dossier a été effacé`)
    if (r2.code === 0) e10.push(`${nom} : sortie 0`)
  }
  const r3 = await lancer(['--export-nuit'], preuves, { PRESTI_URL: 'http://127.0.0.1:1' })
  if (!existe('2026-09', efface) || !existe('2023-08', vieux)) e10.push('route injoignable : un dossier a été effacé')
  ok('PF-10', e10, 'export de nuit : jsonl en 0600, le POST porte chaque dossier, celui que la base ne rend pas est effacé, celui de 37 mois qu\'elle rend reste, route en panne / mal formée / injoignable : rien d\'effacé, sortie = comptes')
  fs.rmSync(preuves, { recursive: true, force: true })
}

// ═════════════════════════════════════════════════════════════════ PF-6, PF-7, PF-11 : les routes ═══════════════════════
{
  const fTravail = F('app', 'api', 'usine', 'porteur', 'travail', 'route.ts')
  const fRendu = F('app', 'api', 'usine', 'porteur', 'rendu', 'route.ts')
  const fOpp = F('app', 'api', 'usine', 'porteur', 'oppositions', 'route.ts')
  const dateReelle = Date.now
  const A = { nom: 'facteur_usine' }
  const base = (rpc, plus = {}) => ({
    actif: () => true, authAgent: async () => A, estRefusAgent: () => false, pauseGenerale: async () => ({ active: false }),
    ops_battement: async () => ({}), rpc, ...plus,
  })
  const jourHeure = (iso) => { Date.now = () => Date.parse(iso) }
  const ligne = (n) => ({ id: uuid(), texte: TEXTE, objet: OBJET, reference: `R${n}`, technologie: 'contact_form_7', formulaire: { ...FORMULAIRE_CONFORME } })
  const travail = async (rpcs, iso, plus = {}) => {
    jourHeure(iso)
    try {
      const appels = []
      const r = await banc(fTravail, { url: 'https://prestiapp.fr/api/usine/porteur/travail', entetes: { authorization: 'Bearer x' }, env: { ACQ_ADRESSE_REPONSE: ADRESSE }, comportements: base(async (nom, args) => { appels.push(nom); return rpcs[nom] ? rpcs[nom](args) : { data: null, error: null } }, plus) })
      return { r, appels }
    } finally { Date.now = dateReelle }
  }
  const LUN_10H = '2026-10-12T08:00:00Z' // lundi 10 h à Paris (UTC+2)
  const frais = (min) => ({ data: { releve_gmail_le: new Date(Date.parse(LUN_10H) - min * 60_000).toISOString(), formulaire_coupe_jusqua: null, technologies: [] }, error: null })
  const lignes = [ligne(1), ligne(2)]
  const e6 = []
  // travail rendu un lundi à 10 h, relève à 4 min
  { const { r, appels } = await travail({ acq_etat_envoi: () => frais(4), acq_formulaires_a_porter: () => ({ data: lignes, error: null }) }, LUN_10H)
    if (r.statut !== 200 || r.json?.envois?.length !== 2 || r.json?.adresse !== ADRESSE) e6.push(`lundi 10 h : ${r.statut} ${r.texte.slice(0, 100)}`)
    if (!appels.includes('acq_formulaires_a_porter')) e6.push('acq_formulaires_a_porter non appelé')
    const bat = r.journal.filter((j) => /battement/i.test(j.nom)); if (bat.length !== 1) e6.push(`battements : ${bat.length}, 1 attendu`) }
  // pause générale
  { const { r } = await travail({ acq_etat_envoi: () => frais(4), acq_formulaires_a_porter: () => ({ data: lignes, error: null }) }, LUN_10H, { pauseGenerale: async () => ({ active: true }) })
    if (r.json?.envois?.length !== 0) e6.push('pause générale : du travail rendu') }
  // samedi, lundi 7 h 59 (Paris), lundi 18 h 00
  for (const [nom, iso] of [['samedi 10 h', '2026-10-10T08:00:00Z'], ['lundi 7 h 59', '2026-10-12T05:59:00Z'], ['lundi 18 h 00', '2026-10-12T16:00:00Z']]) {
    const { r, appels } = await travail({ acq_etat_envoi: () => ({ data: { releve_gmail_le: new Date(Date.parse(iso) - 240_000).toISOString(), formulaire_coupe_jusqua: null, technologies: [] }, error: null }), acq_formulaires_a_porter: () => ({ data: lignes, error: null }) }, iso)
    if (r.json?.envois?.length !== 0 || appels.includes('acq_formulaires_a_porter')) e6.push(`${nom} : du travail rendu ou réservé`)
  }
  // jamais plus que ce que la base rend ; un prospect opposé n'est pas rendu (la base le filtre : la route ne le rajoute pas)
  { const { r } = await travail({ acq_etat_envoi: () => frais(4), acq_formulaires_a_porter: (a) => ({ data: [lignes[0]], error: null }) }, LUN_10H)
    if (r.json?.envois?.length !== 1) e6.push('la route rend plus que la base') }
  // ?verifier= : pour un opposé, { ok: false }
  { jourHeure(LUN_10H)
    try {
      const id = uuid()
      const r = await banc(fTravail, { url: `https://prestiapp.fr/api/usine/porteur/travail?verifier=${id}`, entetes: { authorization: 'Bearer x' }, comportements: base(async (nom) => (nom === 'acq_etat_envoi' ? frais(4) : nom === 'acq_porteur_verifier' ? { data: { ok: false, raison: 'opposition' }, error: null } : { data: null, error: null })) })
      if (r.json?.ok !== false) e6.push(`?verifier= pour un prospect opposé : ${r.texte.slice(0, 100)}`)
      const r2 = await banc(fTravail, { url: `https://prestiapp.fr/api/usine/porteur/travail?verifier=pas-un-uuid`, entetes: { authorization: 'Bearer x' }, comportements: base(async () => ({ data: null, error: null })) })
      if (r2.statut !== 400) e6.push(`?verifier= mal formé : ${r2.statut}`)
    } finally { Date.now = dateReelle } }
  // jeton d'un autre agent → 403 ; refus de la garde → sa réponse
  { const r = await banc(fTravail, { url: 'https://prestiapp.fr/api/usine/porteur/travail', entetes: { authorization: 'Bearer x' }, comportements: base(async () => ({ data: null, error: null }), { authAgent: async () => ({ nom: 'facteur' }) }) })
    if (r.statut !== 403) e6.push(`autre agent : ${r.statut}, 403 attendu`)
    const r2 = await banc(fTravail, { url: 'https://prestiapp.fr/api/usine/porteur/travail', comportements: base(async () => ({ data: null, error: null }), { estRefusAgent: () => true, reponseRefusAgent: () => new Response('{}', { status: 401 }) }) })
    if (r2.statut !== 401) e6.push(`sans jeton : ${r2.statut}, 401 attendu`)
    const r3 = await banc(fTravail, { url: 'https://prestiapp.fr/api/usine/porteur/travail', entetes: { authorization: 'Bearer x' }, comportements: base(async () => ({ data: null, error: null }), { actif: () => false }) })
    if (r3.statut !== 404) e6.push(`busAgents baissé : ${r3.statut}, 404 attendu`) }
  ok('PF-6', e6, 'route travail : le travail un lundi 10 h, rien en pause / le samedi / à 7 h 59 / à 18 h, jamais plus que la base, ?verifier= { ok: false } pour un opposé, un battement par appel, jeton absent 401, autre agent 403, drapeau baissé 404')

  const e11 = []
  for (const [nom, etat] of [['relève à 16 min', frais(16)], ['relève nulle', { data: { releve_gmail_le: null, formulaire_coupe_jusqua: null, technologies: [] }, error: null }], ['formulaire coupé une heure', { data: { releve_gmail_le: new Date(Date.parse(LUN_10H) - 240_000).toISOString(), formulaire_coupe_jusqua: new Date(Date.parse(LUN_10H) + 3_600_000).toISOString(), technologies: [] }, error: null }], ['état illisible', { data: null, error: { message: 'x' } }]]) {
    const { r, appels } = await travail({ acq_etat_envoi: () => etat, acq_formulaires_a_porter: () => ({ data: lignes, error: null }) }, LUN_10H)
    if (r.json?.envois?.length !== 0 || appels.includes('acq_formulaires_a_porter')) e11.push(`${nom} : du travail rendu ou acq_formulaires_a_porter appelé`)
  }
  { const { r, appels } = await travail({ acq_etat_envoi: () => frais(4), acq_formulaires_a_porter: () => ({ data: lignes, error: null }) }, LUN_10H)
    if (r.json?.envois?.length !== 2 || !appels.includes('acq_formulaires_a_porter')) e11.push('relève à 4 min : le travail n\'est pas rendu') }
  // technologie en pause : pas rendue
  { const { r } = await travail({ acq_etat_envoi: () => ({ data: { ...frais(4).data, technologies: [{ technologie: 'contact_form_7', etat: 'pause' }] }, error: null }), acq_formulaires_a_porter: () => ({ data: lignes, error: null }) }, LUN_10H)
    if (r.json?.envois?.length !== 0) e11.push('une technologie en pause est rendue') }
  ok('PF-11', e11, 'route travail : relève du Gmail à 16 min, nulle, formulaire coupé, état illisible → rien et aucun appel à acq_formulaires_a_porter ; relève à 4 min → le travail ; technologie en pause écartée')

  const e7 = []
  const preuveOk = { code_http: 200, empreinte_texte: sha256('a'), empreinte_avant: sha256('b'), empreinte_apres: sha256('c'), chemin_usine: '/home/usine/presti-preuves/formulaires/2026-10/x', technologie: 'contact_form_7', soumis_le: '2026-10-12T08:00:00Z' }
  const rendu = (corps, plus = {}) => banc(fRendu, { methode: 'POST', url: 'https://prestiapp.fr/api/usine/porteur/rendu', entetes: { authorization: 'Bearer x' }, corps, comportements: base(async () => ({ data: { ok: true }, error: null }), plus) })
  { const id = uuid(); const r = await rendu({ envoi_id: id, ok: true, preuve: preuveOk })
    const c = r.journal.filter((j) => j.args[0] === 'acq_envoi_envoye')
    if (r.statut !== 200 || c.length !== 1 || c[0].args[1]?.p_envoi !== id || c[0].args[1]?.p_preuve?.empreinte_texte !== preuveOk.empreinte_texte) e7.push(`ok:true : ${r.statut}, ${c.length} appel(s)`) }
  { const id = uuid(); const r = await rendu({ envoi_id: id, ok: false, raison: 'captcha', definitif: true })
    const c = r.journal.filter((j) => j.args[0] === 'acq_formulaire_echec')
    if (r.statut !== 200 || c.length !== 1 || c[0].args[1]?.p_raison !== 'captcha' || c[0].args[1]?.p_definitif !== true) e7.push(`ok:false : ${r.statut}, ${c.length} appel(s)`) }
  for (const [nom, corps] of [['JSON mal formé', '{malforme'], ['id qui n\'est pas un uuid', { envoi_id: 'x', ok: false, raison: 'a', definitif: true }], ['preuve incomplète', { envoi_id: uuid(), ok: true, preuve: { code_http: 200 } }], ['ok:false sans definitif', { envoi_id: uuid(), ok: false, raison: 'a' }], ['ok absent', { envoi_id: uuid() }]]) {
    const r = await rendu(corps)
    if (r.statut !== 400 || r.journal.some((j) => /^acq_/.test(String(j.args?.[0] ?? '')))) e7.push(`${nom} : ${r.statut}, ou une écriture`)
  }
  { const r = await rendu({ envoi_id: uuid(), ok: true, preuve: preuveOk }, { rpc: async () => ({ data: { ok: false, raison: 'ops:accord_perime' }, error: null }) })
    if (r.statut === 200) e7.push('la base refuse (accord périmé) et la route répond 200') }
  ok('PF-7', e7, 'route rendu : ok:true → acq_envoi_envoye avec la preuve ; ok:false → acq_formulaire_echec (raison, définitif) ; corps mal formé → 400 et zéro écriture ; refus de la base relayé')

  const e11b = []
  const opp = (corps) => banc(fOpp, { methode: 'POST', url: 'https://prestiapp.fr/api/usine/porteur/oppositions', entetes: { authorization: 'Bearer x' }, corps, comportements: base(async (nom, a) => ({ data: (a?.p_envois ?? []).slice(0, 1), error: null })) })
  { const r = await opp({ envois: Array.from({ length: 501 }, () => uuid()) }); if (r.statut !== 400) e11b.push(`501 ids : ${r.statut}`) }
  { const r = await opp({ envois: Array.from({ length: 500 }, () => uuid()) }); if (r.statut !== 200 || r.json?.garder?.length !== 1) e11b.push(`500 ids : ${r.statut}`) }
  { const r = await opp({ envois: ['x'] }); if (r.statut !== 400) e11b.push(`id invalide : ${r.statut}`) }
  { const r = await banc(fOpp, { url: 'https://prestiapp.fr/api/usine/porteur/oppositions', entetes: { authorization: 'Bearer x' }, comportements: base(async () => ({ data: [{ cle_type: 'domaine', cle_valeur: 'a.invalid', expire_le: null, cree_le: '2026-09-01T00:00:00Z', secret: 'non' }], error: null })) })
    if (r.statut !== 200 || Object.keys(r.json?.oppositions?.[0] ?? {}).join() !== 'cle_type,cle_valeur,expire_le,cree_le') e11b.push(`GET : ${r.texte.slice(0, 120)}`) }
  ok('PF-15', e11b, 'route oppositions : POST 501 ids → 400, 500 → { garder }, id invalide → 400 ; GET : quatre colonnes, rien d\'autre')
}

// ═════════════════════════════════════════════════════════════════ PF-9 : le source ═════════════════════════════════════
{
  const e = []
  const script = fs.readFileSync(F('scripts', 'agents', 'porteur-formulaire.mjs'), 'utf8'), module_ = fs.readFileSync(F('lib', 'agents', 'acquisition', 'porteurFormulaire.ts'), 'utf8')
  for (const mot of ['2captcha', 'anti-captcha', 'capsolver', 'stealth', 'proxy', 'puppeteer-extra']) if ((script + module_).toLowerCase().includes(mot)) e.push(`chaîne interdite « ${mot} »`)
  if (/storageState/.test(script)) e.push('storageState')
  const uas = [...script.matchAll(/user-?agent['"]?\s*:\s*([^,}\n]+)/gi), ...script.matchAll(/userAgent\s*:\s*([^,}\n]+)/g)].map((m) => m[1].trim())
  for (const u of uas) if (!/^UA_RECENSEUR\b/.test(u)) e.push(`autre User-Agent : ${u.slice(0, 50)}`)
  ok('PF-9', e, 'aucune chaîne 2captcha/anti-captcha/capsolver/stealth/proxy/puppeteer-extra, aucun storageState, aucun autre User-Agent que UA_RECENSEUR')
}

await navigateur?.close()
apiServeur.close()
console.log(rouges.length ? `essai-porteur : FAIL — ${rouges.join(', ')}` : 'essai-porteur : PASS')
