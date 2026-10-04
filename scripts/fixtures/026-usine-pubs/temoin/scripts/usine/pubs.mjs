#!/usr/bin/env node
// TÉMOIN de usine-pubs-qa (026-199) : une référence du tourneur des pubs qui passe UP-6 à UP-9, posée dans les fixtures du juge, jamais déployée. Elle montre UNE
// forme conforme à CONTRAT.md ; 026-200 écrit la vraie (scripts/usine/pubs.mjs), et le juge la juge à son tour.
//
// Une passe (--une-passe), sous le compte agents, lancée par avec-coffre.mjs avec PRESTI_JETON_STUDIO :
//   GET travail → un pack payé (photos, voix ff_siwis, fabriquer.mjs, pub-locale-qa vert, dépôt par adresses signées, rendu)
//               → ou un échantillon du Studio (vault, garde, script par le lecteur « studio » sur la seule page produit, photo réelle, voix, monter, pub-qa, dépôt, rendu).
// N'affiche que des identifiants et des comptes : jamais un texte de réponse, une adresse, un numéro ni le jeton. Code 0 même en panne.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { creerLecteur } from '@/lib/agents/llm'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.resolve(ICI, '..', '..')
const UA_RECENSEUR = 'PrestiRecenseur/1.0 (+https://prestiapp.fr/confidentialite#prospection)'
const VOIX = 'ff_siwis'
const DELAI_REQUETE_MS = 30_000
const PAUSE_HOTE_MS = 1_050

const journal = (m) => console.log(`[pubs] ${m}`)
const sha256 = (b) => crypto.createHash('sha256').update(b).digest('hex')
const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms))
const argument = (nom) => process.argv.slice(2).find((a) => a.startsWith(`--${nom}=`))?.slice(nom.length + 3)
const base = (argument('base') || process.env.PRESTI_URL || 'https://prestiapp.fr').replace(/\/+$/, '')
const jeton = process.env.PRESTI_JETON_STUDIO || ''
const HOME = os.homedir()

class Echec extends Error { constructor(raison) { super(raison); this.raison = raison } }

// ── le bus : les trois routes ───────────────────────────────────────────────────────────────────────────────────────────
async function api(chemin, { methode = 'GET', corps } = {}) {
  try {
    const r = await fetch(`${base}${chemin}`, { method: methode, headers: { authorization: `Bearer ${jeton}`, ...(corps === undefined ? {} : { 'content-type': 'application/json' }) }, body: corps === undefined ? undefined : JSON.stringify(corps), signal: AbortSignal.timeout(DELAI_REQUETE_MS) })
    let json = null
    try { json = await r.json() } catch { /* pas du JSON */ }
    return { status: r.status, json }
  } catch { return null }
}

// ── les outils : jamais une exception, un code ──────────────────────────────────────────────────────────────────────────
function lancer(commande, args, options = {}) {
  const env = {}
  for (const k of ['PATH', 'HOME', 'LANG', 'TZ', 'TMPDIR']) if (process.env[k] !== undefined) env[k] = process.env[k] // jamais le jeton ni un secret aux enfants
  const r = spawnSync(commande, args, { cwd: RACINE, env, encoding: 'utf8', timeout: 30 * 60_000, maxBuffer: 1 << 26, ...options })
  if (r.error && r.error.code === 'ENOENT') throw new Echec('outil_absent')
  return { code: r.status ?? 1, stdout: r.stdout || '', stderr: r.stderr || '' }
}
const dossierPrive = (d) => { fs.mkdirSync(d, { recursive: true, mode: 0o700 }); fs.chmodSync(d, 0o700); return d }

/** La voix ff_siwis par `hyperframes tts`, normalisée seule en mp3 : voix.mp3 dans `dossier`. */
function produireVoix(texte, dossier) {
  const txt = path.join(dossier, 'voix.txt'), wav = path.join(dossier, 'voix.wav'), mp3 = path.join(dossier, 'voix.mp3')
  fs.writeFileSync(txt, texte, { mode: 0o600 })
  const t = lancer('hyperframes', ['tts', txt, `--voice=${VOIX}`, `--output=${wav}`])
  if (t.code !== 0 || !fs.existsSync(wav)) throw new Echec('voix_en_echec')
  const n = lancer('ffmpeg', ['-y', '-i', wav, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', '48000', '-ac', '1', mp3])
  if (n.code !== 0 || !fs.existsSync(mp3)) throw new Echec('voix_en_echec')
}

// ── le dépôt et le rendu ────────────────────────────────────────────────────────────────────────────────────────────────
const TYPES = { mp4: 'video/mp4', jpg: 'image/jpeg', png: 'image/png' }
async function deposerEtRendre(travail, fichiers, juge) {
  const annonces = fichiers.map((f) => ({ chemin: f.chemin, type: TYPES[f.chemin.split('.').pop()], taille: fs.statSync(f.local).size }))
  const d = await api('/api/usine/pubs/depot', { methode: 'POST', corps: { travail, fichiers: annonces } })
  if (!d || d.status !== 200 || !Array.isArray(d.json?.depots)) throw new Echec('depot_refuse')
  for (const f of fichiers) {
    const adresse = d.json.depots.find((x) => x.chemin === f.chemin)?.url
    if (!adresse) throw new Echec('depot_refuse')
    let r
    try { r = await fetch(adresse, { method: 'PUT', headers: { 'content-type': TYPES[f.chemin.split('.').pop()] }, body: fs.readFileSync(f.local), signal: AbortSignal.timeout(5 * 60_000) }) } catch { throw new Echec('stockage_injoignable') }
    if (!r.ok) throw new Echec('stockage_refuse')
  }
  const rendu = await api('/api/usine/pubs/rendu', { methode: 'POST', corps: { travail, ok: true, fichiers: fichiers.map((f) => ({ chemin: f.chemin, sha256: sha256(fs.readFileSync(f.local)) })), juge } })
  if (!rendu) throw new Echec('bus_injoignable')
  journal(`rendu ${travail} : ${rendu.json?.ok === true ? 'accepté' : 'refusé'}`)
}
async function rendreEchec(travail, raison) {
  const r = await api('/api/usine/pubs/rendu', { methode: 'POST', corps: { travail, ok: false, raison } })
  journal(`rendu ${travail} : échec ${raison}${r ? '' : ' (bus injoignable)'}`)
}
const empreinteJournal = (r) => sha256(r.stdout)

// ── un pack payé ─────────────────────────────────────────────────────────────────────────────────────────────────────────
async function fabriquerPack(j) {
  const id = j.id
  const dossier = dossierPrive(path.join(dossierPrive(path.join(HOME, 'presti-pubs')), id))
  const photosDir = dossierPrive(path.join(dossier, 'photos'))
  const matiere = structuredClone(j.pack.matiere)
  const photos = Array.isArray(j.photos) ? j.photos : []
  if (!Array.isArray(matiere.photos) || photos.length !== matiere.photos.length) throw new Echec('photos_incoherentes')
  for (const [i, p] of photos.entries()) {
    let r
    try { r = await fetch(p.url, { signal: AbortSignal.timeout(DELAI_REQUETE_MS) }) } catch { throw new Echec('stockage_injoignable') }
    if (!r.ok) throw new Echec('stockage_refuse')
    const nom = `${String(i + 1).padStart(2, '0')}.jpg`
    fs.writeFileSync(path.join(photosDir, nom), Buffer.from(await r.arrayBuffer()), { mode: 0o600 })
    delete matiere.photos[i].url
    matiere.photos[i].fichier = `photos/${nom}`
  }
  fs.writeFileSync(path.join(dossier, 'pack.json'), `${JSON.stringify({ pack_id: id, matiere, site: j.pack.site }, null, 2)}\n`, { mode: 0o600 })
  if (matiere.voix === 'synthese') produireVoix(String(matiere.texte_voix ?? ''), dossier)
  const f = lancer(process.execPath, ['scripts/pack-pub/fabriquer.mjs', dossier])
  if (f.code !== 0) throw new Echec('fabrication_en_echec')
  const juge = lancer(process.execPath, ['scripts/pub-locale-qa.mjs', '--partie=complet', `--dossier=${dossier}`])
  if (juge.code !== 0) throw new Echec('juge_rouge')
  const sortie = path.join(dossier, 'sortie')
  const fichiers = ['video-1.mp4', 'video-2.mp4', 'video-3.mp4', 'visuel-1.jpg', 'visuel-2.jpg', 'visuel-3.jpg'].map((n) => ({ chemin: `packs-pubs/${id}/livraison/${n}`, local: path.join(sortie, n) }))
  await deposerEtRendre(id, fichiers, { nom: 'pub-locale-qa', code: juge.code, empreinte_journal: empreinteJournal(juge) })
}

// ── un échantillon du Studio ─────────────────────────────────────────────────────────────────────────────────────────────
const SYSTEME = 'Écris le script d\'une démonstration de 15 secondes pour ce produit, à partir de la seule page produit fournie. Réponds en JSON : { produit, lignes: [phrases courtes, nombres écrits en lettres], allegations: [{ texte, extrait }], presentateur_virtuel: false }. Chaque allégation porte l\'extrait EXACT de la page qui la justifie. Aucun témoignage, aucun visage, aucun présentateur virtuel.'
const sansBalises = (html) => html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()
const normaliser = (t) => String(t).replace(/\s+/g, ' ').trim()
const jj = (d) => `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}/${d.getUTCFullYear()}`

async function lireHote(adresse, derniere) {
  const attente = derniere.t + PAUSE_HOTE_MS - Date.now()
  if (attente > 0) await dormir(attente)
  derniere.t = Date.now()
  try { return await fetch(adresse, { headers: { 'user-agent': UA_RECENSEUR }, redirect: 'error', signal: AbortSignal.timeout(DELAI_REQUETE_MS) }) } catch { return null }
}

async function fabriquerEchantillon(j) {
  const cle = j.marque_cle
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(cle))) throw new Echec('marque_invalide')
  const vault = path.join(dossierPrive(path.join(HOME, 'presti-studio')), cle)
  fs.rmSync(vault, { recursive: true, force: true })
  dossierPrive(vault)
  const marque = dossierPrive(path.join(vault, 'marques', cle))
  // 1. le vault : préalables (copie du code déployé), registre vide, accord, page produit datée (règles du Lecteur), photo réelle
  const prealables = path.join(RACINE, 'docs', 'studio', 'prealables.md')
  if (!fs.existsSync(prealables)) throw new Echec('prealables_absents')
  fs.copyFileSync(prealables, path.join(vault, 'prealables.md'))
  fs.writeFileSync(path.join(vault, 'registre-refus.csv'), '')
  const recu = new Date(j.accord.recu_le)
  fs.writeFileSync(path.join(marque, 'accord-photos.md'), `# Accord de la marque ${cle}\n\nReçu le : ${jj(recu)}\nMessage-ID : ${j.accord.message_id}\n\n${j.accord.extrait}\n`)
  const page = new URL(j.page_produit)
  const derniere = { t: 0 }
  const robots = await lireHote(new URL('/robots.txt', page).href, derniere)
  if (robots && robots.ok && /^\s*disallow:\s*\/\s*$/im.test(await robots.text())) throw new Echec('robots_interdit')
  const rep = await lireHote(page.href, derniere)
  if (!rep || !rep.ok) throw new Echec('page_illisible')
  const html = await rep.text()
  const aujourdHui = new Date()
  const datee = `page-produit-${aujourdHui.getUTCFullYear()}-${String(aujourdHui.getUTCMonth() + 1).padStart(2, '0')}-${String(aujourdHui.getUTCDate()).padStart(2, '0')}.html`
  fs.writeFileSync(path.join(marque, datee), html)
  const img = /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1] ?? /<img[^>]+src=["']([^"']+)["']/i.exec(html)?.[1]
  if (!img) throw new Echec('photo_absente')
  const photo = await lireHote(new URL(img, page).href, derniere)
  if (!photo || !photo.ok) throw new Echec('photo_illisible')
  fs.writeFileSync(path.join(marque, 'produit.jpg'), Buffer.from(await photo.arrayBuffer()))
  // 2. la garde : un refus (code 3) arrête tout
  const g = lancer(process.execPath, ['scripts/studio/garde.mjs', `--marque=${cle}`, `--vault=${vault}`])
  if (g.code !== 0) throw new Echec(g.code === 3 ? 'garde_refuse' : 'garde_en_echec')
  const echantillon = g.stdout.trim().split(/\r?\n/).at(-1)
  if (!echantillon || !echantillon.startsWith(marque)) throw new Echec('garde_en_echec')
  const numero = /echantillon-(\d+)$/.exec(echantillon)?.[1]
  // 3. le script, par le lecteur « studio », sur la seule page produit
  const lecteur = creerLecteur('studio', { appelsMax: 2 }, { verifierPlafond: async () => true, enregistrerCout: async () => ({ ok: true }) })
  if (!lecteur) throw new Echec('lecteur_absent')
  const texte = sansBalises(html)
  let script
  try { script = await lecteur(SYSTEME, { page_produit: texte }) } catch { throw new Echec('lecteur_en_echec') }
  const ok = script && typeof script === 'object' && !Array.isArray(script) && script.presentateur_virtuel === false && Array.isArray(script.lignes) && script.lignes.length > 0 && script.lignes.every((l) => typeof l === 'string' && l.trim())
    && Array.isArray(script.allegations) && script.allegations.length > 0 && script.allegations.every((a) => a && typeof a.texte === 'string' && typeof a.extrait === 'string' && a.extrait.trim() && normaliser(texte).includes(normaliser(a.extrait)))
  if (!ok) throw new Echec('script_invalide')
  fs.writeFileSync(path.join(echantillon, 'script.json'), `${JSON.stringify({ marque: cle, produit: String(script.produit ?? ''), lignes: script.lignes, allegations: script.allegations, presentateur_virtuel: false }, null, 2)}\n`)
  // 4. la voix, le montage, le juge
  produireVoix(script.lignes.join(' '), echantillon)
  const m = lancer(process.execPath, ['scripts/studio/monter.mjs', echantillon])
  if (m.code !== 0) throw new Echec('montage_en_echec')
  const juge = lancer(process.execPath, ['scripts/pub-qa.mjs', echantillon])
  if (juge.code !== 0) throw new Echec('juge_rouge')
  await deposerEtRendre(j.decision, [{ chemin: `packs-pubs/studio/${cle}/echantillon-${numero}.mp4`, local: path.join(echantillon, 'sortie', 'echantillon.mp4') }], { nom: 'pub-qa', code: juge.code, empreinte_journal: empreinteJournal(juge) })
}

// ── la passe ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function travailler(j) {
  const id = j.type === 'pack' ? j.id : j.decision
  const verrous = dossierPrive(path.join(dossierPrive(path.join(HOME, 'presti-pubs')), 'verrous'))
  const verrou = path.join(verrous, `${String(id).replace(/[^a-z0-9-]/gi, '')}.lock`)
  let fd
  try { fd = fs.openSync(verrou, 'wx', 0o600) } catch { journal(`travail ${id} : déjà en cours (verrou)`); return }
  fs.closeSync(fd)
  try {
    journal(`travail ${j.type} ${id}`)
    if (j.type === 'pack') await fabriquerPack(j)
    else if (j.type === 'studio') await fabriquerEchantillon(j)
    else throw new Echec('type_inconnu')
  } catch (e) {
    const raison = e instanceof Echec ? e.raison : 'erreur_inattendue'
    if (!(e instanceof Echec)) journal(`erreur inattendue : ${e?.name ?? 'Error'}`)
    if (raison !== 'bus_injoignable') await rendreEchec(id, raison)
    else journal(`travail ${id} : bus injoignable au rendu, repris au passage suivant`)
  } finally { try { fs.rmSync(verrou, { force: true }) } catch { /* déjà parti */ } }
}

async function passe() {
  if (!jeton) { journal('PRESTI_JETON_STUDIO absent : rien à faire'); return }
  const r = await api('/api/usine/pubs/travail')
  if (!r) { journal('bus injoignable : repris au passage suivant'); return }
  if (r.status !== 200 || !r.json) { journal(`bus : réponse ${r.status}`); return }
  if (r.json.travail === null) { journal('aucun travail'); return }
  await travailler(r.json)
}

try { await passe() } catch (e) { journal(`passe interrompue : ${e?.name ?? 'Error'}`) }
process.exitCode = 0
