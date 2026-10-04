// UP-R de usine-pubs-qa (026-199, pour 026-202) : l'épreuve sur l'usine, PC éteint. Se lance SEULE, depuis le poste, en deux temps :
//   node --import ./scripts/ts-loader.mjs scripts/usine-pubs-qa.mjs --reel --etape=preparer [--decision=<uuid> --marque=<cle>]
//        … Benj éteint le poste au moins 2 h …
//   node --import ./scripts/ts-loader.mjs scripts/usine-pubs-qa.mjs --reel --etape=conclure
// Sans --etape : code 2. Jamais lancé par un `verifier` de 026-199 ni de 026-200 (il écrit en production : seul Claude Code le lance, en 026-202, après le
// « oui » de Benj et la mise en service).
//
// preparer : contrôle l'usine (le minuteur presti-pubs actif ; l'unité installée = celle du code déployé), puis pose en production les OBJETS D'ESSAI, tous
//   marqués `essai-pubs-<aléa>` : un compte et un artisan d'essai (courriel en .invalid, mot de passe tiré au hasard, jamais affiché), quatre photos du jeu de
//   026-126 (lues par leur chemin), un pack `payee` (voix = aucune : la voix ff_siwis se prouve en 026-202, point 3), et note l'heure. L'échantillon du
//   Studio sur la marque fictive ne peut être posé que par le moyen que la base offre pour une décision `studio_echantillon` (CONTRAT.md §1 : les deux
//   fonctions acq_studio_* n'existent pas encore) : Claude Code la pose alors, et passe `--decision=<uuid> --marque=<cle>` ; sans eux, la partie Studio de
//   l'épreuve est NON JUGÉE et le verdict est un échec (le cahier exige les deux).
// conclure : relit l'état, puis, dans un `finally` qui fait le MÉNAGE quoi qu'il arrive (le pack, les fichiers du stockage, la décision d'essai tranchée en
//   « refaire » ou « ne_rien_faire » — jamais « envoyer » ni « depose » —, l'artisan et son compte, les dossiers de l'usine par le compte gardien), juge :
//   le pack est `fabriquee` en moins de 2 h, ses six fichiers sont relus et d'empreinte juste (SHA-256 et octets magiques) ; le poste a redémarré après la
//   fabrication (preuve de l'extinction ; la déclaration de Benj fait le reste) ; l'échantillon est déposé sous packs-pubs/studio/<marque>/ et sa décision
//   `regarder_premier_echantillon` est ouverte, jamais envoyée. Code 0 tout vert, 1 un échec ou un ménage qui échoue, 2 usage ou accès impossible.
// Aucune écriture en production hors ces objets d'essai ; aucun secret affiché (la clé de service est lue dans .env.local, jamais écrite).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { DEPOT, TRAVAIL, hasard, sha256, court } from '../commun.mjs'

const ETAT = path.join(TRAVAIL, 'reel-etat.json')
const HOTE = process.env.PRESTI_USINE || 'usine@88.96.53.3'
const CLE_GARDIEN = path.join(os.homedir(), '.ssh', 'presti-usine-gardien')
const DEUX_HEURES = 2 * 3600 * 1000
const PHOTOS = ['public/sites-demo/macon/images/parement-720.webp', 'public/sites-demo/carreleur/images/douche-720.webp', 'public/sites-demo/peintre/images/preparation-720.webp', 'public/sites-demo/menuisier/images/escalier-tournant-720.webp']
const ROLES = ['avant', 'chantier', 'detail', 'apres']
const SIX = ['video-1.mp4', 'video-2.mp4', 'video-3.mp4', 'visuel-1.jpg', 'visuel-2.jpg', 'visuel-3.jpg']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const magiques = (nom, b) => (nom.endsWith('.mp4') ? b.length > 12 && b.subarray(4, 8).toString('latin1') === 'ftyp' : nom.endsWith('.jpg') ? b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff : b.length > 8 && b.subarray(1, 4).toString('latin1') === 'PNG')

const dire = (m) => console.log(m)
const refuser = (code, m) => { console.error(`✗ usine-pubs-qa --reel : ${m}`); return code }
const ssh = (cible, cle, commande, entree) => spawnSync('ssh', [...(cle ? ['-i', cle] : []), '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', cible, commande], { input: entree, encoding: 'utf8', timeout: 60_000, windowsHide: true })

function lireEnvLocal() {
  const f = path.join(DEPOT, '.env.local')
  const env = {}
  for (const l of fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split(/\r?\n/) : []) { const m = /^\s*([A-Z0-9_]+)=(.*)$/.exec(l); if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '') }
  return { url: process.env.NEXT_PUBLIC_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL, cle: process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY }
}
async function base() {
  const { url, cle } = lireEnvLocal()
  if (!url || !cle) return null
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(url, cle, { auth: { persistSession: false, autoRefreshToken: false } })
}

/** L'usine, sans rien modifier : le minuteur actif, l'unité installée identique à celle du code déployé. */
function controlerUsine() {
  const r = ssh(HOTE, null, "systemctl is-active presti-pubs.timer; for f in presti-pubs.service presti-pubs.timer; do printf '%s ' \"$f\"; sha256sum < /etc/systemd/system/$f | cut -d' ' -f1; printf '%s ' \"$f\"; sha256sum < /srv/presti-agents/scripts/usine/systemd/$f | cut -d' ' -f1; done; git -C /srv/presti-agents log --oneline -1")
  if (r.status !== 0 && !r.stdout) return { ok: false, injoignable: true, detail: court(r.stderr, 140) }
  const l = r.stdout.trim().split(/\r?\n/)
  const actif = l[0] === 'active'
  const sha = (nom, i) => (l.filter((x) => x.startsWith(`${nom} `))[i] ?? '').split(' ')[1]
  const identique = ['presti-pubs.service', 'presti-pubs.timer'].every((n) => sha(n, 0) && sha(n, 0) === sha(n, 1))
  return { ok: actif && identique, detail: `minuteur ${l[0] || '?'}, unités ${identique ? 'identiques au code déployé' : 'différentes du code déployé ou absentes'}`, commit: l.at(-1) }
}

// ── preparer ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function preparer(opts) {
  fs.mkdirSync(TRAVAIL, { recursive: true })
  if (fs.existsSync(ETAT)) return refuser(2, `une épreuve est déjà préparée (${path.relative(DEPOT, ETAT)}) : --etape=conclure d'abord (le ménage), ou la supprimer à la main après avoir vérifié la production`)
  const u = controlerUsine()
  if (u.injoignable) return refuser(2, `usine injoignable (${u.detail})`)
  dire(`${u.ok ? 'PASS' : 'FAIL'} UP-R usine — ${u.detail}${u.commit ? ` (${u.commit.slice(0, 60)})` : ''}`)
  if (!u.ok) return 1
  const admin = await base()
  if (!admin) return refuser(2, 'NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absent (.env.local ou environnement)')
  const alea = hasard(6), etat = { alea, prepare_le: new Date().toISOString(), decision: opts.decision ?? null, marque: opts.marque ?? null, commit: u.commit ?? null }
  const sauver = () => fs.writeFileSync(ETAT, `${JSON.stringify(etat, null, 2)}\n`)
  sauver()
  try {
    const motDePasse = crypto.randomBytes(24).toString('base64url')
    const cree = await admin.auth.admin.createUser({ email: `essai-pubs-${alea}@exemple.invalid`, password: motDePasse, email_confirm: true })
    if (cree.error || !cree.data?.user?.id) throw new Error(`compte d'essai : ${cree.error?.message ?? 'refusé'}`)
    etat.user_id = cree.data.user.id; sauver()
    const art = await admin.from('artisans').upsert({ id: etat.user_id, email: `essai-pubs-${alea}@exemple.invalid`, nom: `Essai Pubs ${alea}`, metier: 'Menuiserie', slug: `essai-pubs-${alea}` }, { onConflict: 'id' })
    if (art.error) throw new Error(`artisan d'essai : ${art.error.message}`)
    const { url } = lireEnvLocal()
    const photos = []
    for (const [i, rel] of PHOTOS.entries()) {
      const chemin = `${etat.user_id}/photo-${i + 1}.webp`
      const octets = fs.readFileSync(path.join(DEPOT, rel))
      const up = await admin.storage.from('artisan-media').upload(chemin, octets, { contentType: 'image/webp', upsert: true })
      if (up.error) throw new Error(`photo ${i + 1} : ${up.error.message}`)
      photos.push({ url: `${url}/storage/v1/object/public/artisan-media/${chemin}`, role: ROLES[i], personnes: false, accord_personnes: false })
    }
    const matiere = { metier: 'Menuiserie', ville: 'Rennes', communes: ['Rennes'], duree_travaux: '3 jours', materiaux: 'chêne massif', cta: 'devis', telephone: null, voix: 'aucune', texte_voix: null, decennale: true, accroche: 'artisan_de_confiance', photos }
    const pack = await admin.from('packs_pubs').insert({ artisan_id: etat.user_id, email: `essai-pubs-${alea}@exemple.invalid`, etat: 'payee', matiere, prix_cents: 14900, type: 'locale', paye_le: new Date().toISOString() }).select('id').single()
    if (pack.error || !pack.data?.id) throw new Error(`pack d'essai : ${pack.error?.message ?? 'refusé'}`)
    etat.pack_id = pack.data.id; etat.prepare_le = new Date().toISOString(); sauver()
  } catch (e) {
    dire(`✗ préparation interrompue : ${court(e.message, 200)} — ménage des objets déjà posés`)
    await menage(admin, etat, [])
    return 2
  }
  dire(`PASS UP-R préparée — pack d'essai essai-pubs-${alea} (payee) posé à ${etat.prepare_le}${etat.decision ? ' ; décision d\'essai du Studio notée' : ' ; PAS de décision d\'essai du Studio : cette partie ne sera pas jugée'}`)
  dire('Éteignez le poste maintenant, au moins 2 h (le minuteur passe toutes les 15 min), puis rallumez-le et lancez --etape=conclure.')
  return 0
}

// ── le ménage ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function menage(admin, etat, defauts) {
  const essai = async (nom, f) => { try { const r = await f(); if (r?.error) defauts.push(`${nom} : ${court(r.error.message, 100)}`) } catch (e) { defauts.push(`${nom} : ${court(e?.message, 100)}`) } }
  const effacer = async (bucket, prefixe) => {
    const l = await admin.storage.from(bucket).list(prefixe, { limit: 1000 })
    const noms = (l.data ?? []).map((f) => `${prefixe}/${f.name}`)
    if (noms.length) return admin.storage.from(bucket).remove(noms)
    return null
  }
  if (etat.pack_id) { await essai('fichiers du pack', () => effacer('packs-pubs', `${etat.pack_id}/livraison`)); await essai('ligne du pack', () => admin.from('packs_pubs').delete().eq('id', etat.pack_id)) }
  if (etat.marque) await essai('échantillons d\'essai', () => effacer('packs-pubs', `studio/${etat.marque}`))
  if (etat.user_id) {
    await essai('photos d\'essai', () => effacer('artisan-media', etat.user_id))
    await essai('artisan d\'essai', () => admin.from('artisans').delete().eq('id', etat.user_id))
    await essai('compte d\'essai', () => admin.auth.admin.deleteUser(etat.user_id))
  }
  if (etat.fondateur) {
    for (const [id, choix] of [[etat.decision_regarder, 'refaire'], [etat.decision, 'ne_rien_faire']]) if (id && UUID.test(id)) await essai(`décision ${choix}`, () => admin.rpc('ops_decision_trancher', { p_id: id, p_choix: choix, p_auteur: etat.fondateur }))
  }
  // les dossiers de l'usine (compte agents) : par le gardien, jamais par usine
  const dossiers = [etat.pack_id && `/home/agents/presti-pubs/${etat.pack_id}`, etat.pack_id && `/home/agents/presti-pubs/verrous/${etat.pack_id}.lock`, etat.marque && `/home/agents/presti-studio/${etat.marque}`].filter(Boolean)
  if (dossiers.length) {
    if (!fs.existsSync(CLE_GARDIEN)) defauts.push(`dossiers de l'usine : ${CLE_GARDIEN.replace(os.homedir(), '~')} absente (la clé du gardien vit sur le poste de Claude Code)`)
    else {
      const r = ssh(`gardien@${HOTE.split('@').pop()}`, CLE_GARDIEN, `sudo -n -u agents rm -rf ${dossiers.map((d) => `'${d}'`).join(' ')}`)
      if (r.status !== 0) defauts.push(`dossiers de l'usine : ménage par gardien impossible (code ${r.status}) : ${court(r.stderr, 100)}`)
    }
  }
  return defauts
}

// ── conclure ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
function demarrageDuPoste() {
  if (process.platform !== 'win32') return null
  const r = spawnSync('powershell', ['-NoProfile', '-Command', '(Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToUniversalTime().ToString("o")'], { encoding: 'utf8', windowsHide: true, timeout: 30_000 })
  const t = Date.parse(String(r.stdout).trim())
  return Number.isFinite(t) ? t : null
}

async function conclure() {
  if (!fs.existsSync(ETAT)) return refuser(2, `aucune épreuve préparée (${path.relative(DEPOT, ETAT)} absent) : --etape=preparer d'abord`)
  let etat
  try { etat = JSON.parse(fs.readFileSync(ETAT, 'utf8')) } catch { return refuser(2, 'état de l\'épreuve illisible') }
  const admin = await base()
  if (!admin) return refuser(2, 'NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY absent (.env.local ou environnement)')
  const ko = [], ok = []
  const v = (cond, bien, mal) => (cond ? ok : ko).push(cond ? bien : mal)
  const defauts = []
  try {
    const u = controlerUsine()
    v(!u.injoignable && u.ok, `usine : ${u.detail}`, `usine : ${u.detail}`)
    // le pack
    const { data: p } = await admin.from('packs_pubs').select('id, etat, fabrique_le, verifications').eq('id', etat.pack_id ?? '').maybeSingle()
    const duree = p?.fabrique_le ? Date.parse(p.fabrique_le) - Date.parse(etat.prepare_le) : NaN
    v(p?.etat === 'fabriquee' && Number.isFinite(duree) && duree >= 0 && duree <= DEUX_HEURES, `pack d'essai : payee → fabriquee en ${Math.round(duree / 60_000)} min (moins de 2 h)`, `pack d'essai : état ${p?.etat ?? 'introuvable'}${Number.isFinite(duree) ? `, fabriqué ${Math.round(duree / 60_000)} min après la préparation` : ''} (fabriquee en moins de 2 h attendu)`)
    const annonces = Array.isArray(p?.verifications?.fichiers) ? p.verifications.fichiers : []
    let bons = 0
    for (const nom of SIX) {
      const chemin = `${etat.pack_id}/livraison/${nom}`
      const d = await admin.storage.from('packs-pubs').download(chemin)
      const octets = d.data ? Buffer.from(await d.data.arrayBuffer()) : null
      const a = annonces.find((x) => String(x.chemin).endsWith(`/${nom}`))
      // le pack peut sortir ses visuels en png : un nom jpg absent est cherché sous son frère png
      if (octets && magiques(nom, octets) && (!a || a.sha256 === sha256(octets))) bons++
    }
    v(bons === SIX.length, 'les six fichiers sont relus dans le stockage : empreinte et octets magiques justes', `fichiers : ${bons} sur ${SIX.length} relus avec une empreinte et des octets justes`)
    v(p?.verifications?.juge === 'pub-locale-qa' && p.verifications.verdict === 'PASS', 'verifications : pub-locale-qa PASS', `verifications : ${court(JSON.stringify(p?.verifications ?? null), 100)}`)
    // PC éteint : le poste a redémarré après la fabrication
    const boot = demarrageDuPoste(), fab = p?.fabrique_le ? Date.parse(p.fabrique_le) : NaN
    if (boot === null) ko.push('PC éteint : le démarrage du poste n\'est pas lisible (poste Windows attendu) : sans lui, l\'extinction repose sur la seule déclaration de Benj')
    else v(boot > fab, `PC éteint : le poste a redémarré à ${new Date(boot).toISOString()}, après la fabrication (${p.fabrique_le})`, `PC éteint : le poste n'a pas redémarré depuis la fabrication (démarrage ${new Date(boot).toISOString()}, fabrication ${p?.fabrique_le}) : il était allumé`)
    // l'échantillon d'essai
    if (!etat.decision || !etat.marque) ko.push('Studio : NON JUGÉ — aucune décision d\'essai (--decision=<uuid> --marque=<cle> à --etape=preparer) : le cahier exige l\'échantillon d\'essai')
    else {
      const l = await admin.storage.from('packs-pubs').list(`studio/${etat.marque}`, { limit: 100 })
      const f = (l.data ?? []).find((x) => /^echantillon-\d+\.mp4$/.test(x.name))
      let sain = false
      if (f) { const d = await admin.storage.from('packs-pubs').download(`studio/${etat.marque}/${f.name}`); const b = d.data ? Buffer.from(await d.data.arrayBuffer()) : null; sain = !!b && b.length <= 3 * 1024 * 1024 && magiques(f.name, b) }
      v(sain, `Studio : l'échantillon d'essai est déposé sous packs-pubs/studio/${etat.marque}/ (MP4 de 3 Mo au plus)`, 'Studio : aucun échantillon MP4 sain déposé sous packs-pubs/studio/<marque>/')
      const e = await admin.rpc('ops_etat')
      const ouvertes = Array.isArray(e.data?.decisions_ouvertes) ? e.data.decisions_ouvertes : []
      const regarder = ouvertes.find((d) => /regarder_premier|premier échantillon|premier echantillon/i.test(`${d.cle_idempotence ?? ''} ${d.question ?? ''}`) && String(`${d.cle_idempotence ?? ''} ${d.contexte ?? ''}`).includes(etat.decision))
      v(!!regarder, 'Studio : la décision regarder_premier_echantillon est ouverte pour Benj', 'Studio : aucune décision regarder_premier_echantillon ouverte pour l\'échantillon d\'essai')
      etat.decision_regarder = regarder?.id ?? null
      v(ouvertes.some((d) => d.id === etat.decision), 'Studio : la décision studio_echantillon d\'essai reste ouverte (jamais « depose » ni envoyée)', 'Studio : la décision studio_echantillon d\'essai est tranchée : l\'échantillon est peut-être parti')
      const fond = await admin.from('artisans').select('id').eq('is_founder', true).order('id').limit(1)
      etat.fondateur = fond.data?.[0]?.id ?? null
    }
  } catch (e) {
    ko.push(`exception : ${court(e?.message, 160)}`)
  } finally {
    await menage(admin, etat, defauts)
    if (!defauts.length) { try { fs.rmSync(ETAT, { force: true }) } catch { /* l'état reste, sans secret */ } }
  }
  for (const m of ok) dire(`PASS UP-R — ${m}`)
  for (const m of ko) dire(`FAIL UP-R — ${m}`)
  for (const m of defauts) dire(`FAIL UP-R ménage — ${m}`)
  const code = ko.length || defauts.length ? 1 : 0
  dire(`usine-pubs-qa --reel : ${code === 0 ? 'PASS' : 'FAIL — UP-R'}`)
  return code
}

export async function jouerReel({ etape, nom }) {
  void nom
  if (!etape) return refuser(2, '--etape=preparer|conclure attendu (l\'épreuve se joue en deux temps, PC éteint entre les deux)')
  if (etape === 'conclure') return conclure()
  const opts = {}
  for (const a of process.argv.slice(2)) { const m = /^--(decision|marque)=(.+)$/.exec(a); if (m) opts[m[1]] = m[2] }
  if (opts.decision && !UUID.test(opts.decision)) return refuser(2, '--decision attend un uuid')
  if (opts.marque && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(opts.marque)) return refuser(2, '--marque attend une clé en minuscules, chiffres et tirets')
  if (!!opts.decision !== !!opts.marque) return refuser(2, '--decision et --marque vont ensemble')
  return preparer(opts)
}
