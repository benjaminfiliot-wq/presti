// Voix off de la chaîne TikTok : choix du fournisseur (garde Fish Audio du dépôt), synthèse, cache clé sur le TEXTE,
// temps réels des mots (faster-whisper) pour recaler les sous-titres, et contrôle « le texte dit = le texte affiché ».
//
// Fournisseur :
//   - Fish Audio SEULEMENT si une clé existe (presti-secrets, fichier dont le nom contient « fish ») ET si
//     voix-fish.json déclare un forfait commercial prouvé (daté, sourcé, non expiré) : décision prise par
//     lib/studio/voixFish.ts (choisirVoix, usage_commercial), jamais ici. Le forfait gratuit de Fish n'a pas le droit
//     commercial ; une pub e-commerce est commerciale.
//   - Sinon la voix locale Kokoro `ff_siwis` (voix.py), sans clé, sur le PC comme sur l'usine.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { ICI, RACINE_DEPOT, lancer } from './outils.mjs'

const WIN = process.platform === 'win32'
export const VERSION_VOIX = 1 // à monter si la synthèse change (vidange naturelle du cache)
export const VITESSE_LOCALE = Number(process.env.TIKTOK_VOIX_VITESSE || 1.15)

// ───────────────────────────── Python de la voix ─────────────────────────────

export function pythonVoix() {
  const c = [
    process.env.TIKTOK_PYTHON,
    WIN ? path.join(os.homedir(), '.presti-voix', 'venv', 'Scripts', 'python.exe') : path.join(os.homedir(), '.presti-voix', 'venv', 'bin', 'python'),
    WIN ? null : '/home/agents/venv-voix/bin/python',
  ].filter(Boolean)
  const f = c.find((x) => fs.existsSync(x))
  if (f) return f
  return WIN ? 'python' : 'python3'
}

function appelerPython(args, { minutes = 30 } = {}) {
  const py = pythonVoix()
  const r = lancer(py, [path.join(ICI, 'voix.py'), ...args], { minutes, env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' } })
  const ligne = String(r.sortie || '').trim().split('\n').pop()
  if (r.code !== 0 || !ligne?.startsWith('{')) {
    throw new Error(`voix.py en échec (python : ${py}, code ${r.code}) : ${String(r.erreur || r.echec || '').slice(-900)}\n` +
      'Installer : un venv avec « pip install kokoro-onnx soundfile faster-whisper » (README, section Voix), ou TIKTOK_PYTHON=…')
  }
  return JSON.parse(ligne)
}

export function transcrire(audio) { return appelerPython(['transcrire', audio]) }

// ───────────────────────────── Texte : normalisation et alignement ─────────────────────────────

const NOMBRES = { 0: 'zero', 1: 'un', 2: 'deux', 3: 'trois', 4: 'quatre', 5: 'cinq', 6: 'six', 7: 'sept', 8: 'huit', 9: 'neuf', 10: 'dix', 11: 'onze', 12: 'douze' }
/** Forme comparable d'un mot : minuscules, sans accents ni ponctuation ; un chiffre isolé de Whisper redevient le mot dit. */
export function normaliser(mot) {
  const m = String(mot).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’`]/g, "'")
  const nu = m.replace(/[^a-z0-9']/g, '').replace(/^'+|'+$/g, '')
  return /^\d+$/.test(nu) && NOMBRES[nu] ? NOMBRES[nu] : nu.replace(/'/g, '')
}

/** Distance d'édition avec retour du chemin : pour chaque caractère de a, l'indice du caractère de b aligné (ou -1). */
function aligner(a, b) {
  const n = a.length, m = b.length
  const D = Array.from({ length: n + 1 }, (_, i) => { const r = new Int32Array(m + 1); r[0] = i; return r })
  for (let j = 0; j <= m; j++) D[0][j] = j
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) {
    D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  }
  const vers = new Int32Array(n).fill(-1)
  let i = n, j = m
  while (i > 0 && j > 0) {
    if (D[i][j] === D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) { vers[i - 1] = j - 1; i--; j-- }
    else if (D[i][j] === D[i - 1][j] + 1) i--
    else j--
  }
  return { distance: D[n][m], vers }
}

/** Ressemblance de deux suites de mots (1 = identiques), sur les lettres. */
export function ressemblance(motsA, motsB) {
  const a = motsA.map(normaliser).join(''), b = motsB.map(normaliser).join('')
  if (!a.length && !b.length) return 1
  return 1 - aligner(a, b).distance / Math.max(a.length, b.length)
}

/**
 * Temps de chaque mot AFFICHÉ, lus dans les mots ENTENDUS (Whisper) : alignement lettre à lettre, puis le début du mot
 * affiché = l'instant de sa première lettre dans le mot entendu correspondant (interpolé dans ce mot).
 */
export function tempsDesMots(affiches, entendus) {
  const lettresB = [], tempsB = []
  for (const w of entendus) {
    const n = normaliser(w.mot)
    for (let k = 0; k < n.length; k++) { lettresB.push(n[k]); tempsB.push(w.debut + ((w.fin - w.debut) * k) / Math.max(1, n.length)) }
  }
  const lettresA = [], premiere = []
  for (const m of affiches) { premiere.push(lettresA.length); for (const c of normaliser(m)) lettresA.push(c) }
  const { vers } = aligner(lettresA.join(''), lettresB.join(''))
  const res = affiches.map((m, k) => {
    const fin = k + 1 < affiches.length ? premiere[k + 1] : lettresA.length
    for (let i = premiere[k]; i < fin; i++) if (vers[i] >= 0) return tempsB[vers[i]]
    return null
  })
  // Un mot que la voix a avalé : entre ses voisins.
  for (let k = 0; k < res.length; k++) if (res[k] == null) {
    const avant = res.slice(0, k).reverse().find((x) => x != null) ?? 0
    const apres = res.slice(k + 1).find((x) => x != null) ?? (entendus.at(-1)?.fin ?? avant + 0.3)
    res[k] = avant + (apres - avant) / 2
  }
  for (let k = 1; k < res.length; k++) if (res[k] < res[k - 1] + 0.04) res[k] = res[k - 1] + 0.04
  return res.map((t) => Math.round(t * 1000) / 1000)
}

// ───────────────────────────── Fish Audio (garde du dépôt) ─────────────────────────────

const FISH_CONFIG = path.join(ICI, 'voix-fish.json')

function cleFish() {
  const dossiers = [process.env.PRESTI_SECRETS, path.join(RACINE_DEPOT, '..', 'presti-secrets'), path.join(os.homedir(), 'presti-secrets')].filter(Boolean)
  for (const d of dossiers) {
    let noms = []
    try { noms = fs.readdirSync(d) } catch { continue }
    const f = noms.find((n) => /fish/i.test(n) && fs.statSync(path.join(d, n)).isFile())
    if (!f) continue
    const brut = fs.readFileSync(path.join(d, f), 'utf8')
    const cle = brut.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')).map((l) => l.replace(/^[A-Z_]*\s*[=:]\s*/, '')).find((l) => /^[A-Za-z0-9_\-.]{16,}$/.test(l))
    if (cle) return cle
  }
  return null
}

function lireConfigFish() {
  try { return JSON.parse(fs.readFileSync(FISH_CONFIG, 'utf8')) } catch { return null }
}

async function quotaFish(cle) {
  try {
    const r = await fetch('https://api.fish.audio/wallet/self/api-credit', { headers: { authorization: `Bearer ${cle}` } })
    if (!r.ok) return { statut: r.status, quota: null }
    const j = await r.json()
    const solde = Number(j.credit ?? j.balance)
    return { statut: 200, quota: Number.isFinite(solde) ? { solde, constate_le: new Date().toISOString(), source: 'api.fish.audio/wallet/self/api-credit' } : null }
  } catch { return { statut: 0, quota: null } }
}

async function synthFishWav(cle, cfg, texte, sortie) {
  const r = await fetch('https://api.fish.audio/v1/tts', {
    method: 'POST',
    headers: { authorization: `Bearer ${cle}`, 'content-type': 'application/json', model: cfg.modele || 's1' },
    body: JSON.stringify({ text: texte, reference_id: cfg.voix_id || undefined, format: 'wav', latency: 'normal', prosody: { speed: cfg.vitesse || 1.0 } }),
  })
  if (!r.ok) throw new Error('fish ' + r.status) // jamais le corps : il pourrait citer la clé
  const b = Buffer.from(await r.arrayBuffer())
  if (b.length < 2000) throw new Error('fish : audio vide')
  fs.writeFileSync(sortie, b)
}

/**
 * Décide le fournisseur d'une vidéo entière (une seule voix par vidéo) par la garde du dépôt.
 * Rend { fournisseur: 'fish'|'local', voix, manifeste, synth(texte, wav) | null }.
 */
export async function choisirFournisseur(idVideo, texteComplet, { journal = () => {} } = {}) {
  const { choisirVoix } = await import(pathToFileURL(path.join(RACINE_DEPOT, 'lib', 'studio', 'voixFish.ts')).href)
  const cle = cleFish()
  const cfg = lireConfigFish() || {}
  let sonde = { statut: 0, quota: null }
  if (cle) sonde = await quotaFish(cle)
  const fishRetenu = { oui: false }
  const deps = {
    cle,
    sonder: async () => ({ statut: sonde.statut }),
    droits: cfg.droits && cfg.droits.commercial === true ? cfg.droits : null,
    quota: sonde.quota,
    credits: { reserver: () => true, consommer: () => {}, restituer: () => {} },
    memoire: new Map(),
    // La garde n'appelle synthFish qu'une fois Fish admis : on note la décision, la synthèse se fait réplique par réplique.
    synthFish: async () => { fishRetenu.oui = true; return { audio: '' } },
    synthLocal: async () => ({ audio: '' }),
    horloge: { maintenant: () => Date.now() },
    journal: (l) => journal(`[voix] ${l.etape} : ${l.critere}`),
  }
  const m = await choisirVoix({ id: `tiktok:${idVideo}:${crypto.createHash('sha1').update(texteComplet).digest('hex').slice(0, 12)}`, usage: 'usage_commercial', texte: texteComplet, source_texte: `promo-src/tiktok-chaine/lignes/${idVideo}.json`, voix: cfg.voix_id || undefined }, deps)
  if (m.refus) throw new Error(`garde de la voix : refus ${m.critere}`)
  if (m.fournisseur === 'fish' && fishRetenu.oui) {
    return { fournisseur: 'fish', voix: m.voix, vitesse: cfg.vitesse || 1.0, manifeste: m, synth: (texte, wav) => synthFishWav(cle, cfg, texte, wav) }
  }
  return { fournisseur: 'local', voix: 'ff_siwis', vitesse: VITESSE_LOCALE, manifeste: m, synth: null }
}

// ───────────────────────────── Synthèse d'un lot de répliques (cache clé sur le TEXTE) ─────────────────────────────

/**
 * repliques : [{ cle, texte, dit? }] → mêmes objets complétés de { wav, duree, transcription, mots, temps[], ressemblance }.
 * Le cache est clé sur sha256(fournisseur, voix, vitesse, version, texte dit) : jamais sur un nom de clip ou de ligne.
 */
export async function produireVoix(repliques, F, cache, { journal = console.log } = {}) {
  const dossier = path.join(cache, 'voix')
  fs.mkdirSync(dossier, { recursive: true })
  const aFaire = []
  for (const r of repliques) {
    const dit = r.dit || r.texte.replace(/\s*\|\s*/g, ' ')
    const empreinte = crypto.createHash('sha256').update(JSON.stringify([F.fournisseur, F.voix, F.vitesse, VERSION_VOIX, dit])).digest('hex').slice(0, 24)
    r.dit = dit
    r.wav = path.join(dossier, `${empreinte}.wav`)
    r.meta = path.join(dossier, `${empreinte}.json`)
    let m = null
    try { m = JSON.parse(fs.readFileSync(r.meta, 'utf8')) } catch {}
    // Défense : la fiche du cache doit porter le même texte, sinon on refait.
    if (m && m.dit === dit && fs.existsSync(r.wav) && fs.statSync(r.wav).size > 2000) Object.assign(r, { duree: m.duree, transcription: m.transcription, mots: m.mots })
    else aFaire.push(r)
  }
  if (aFaire.length) {
    if (F.fournisseur === 'fish') for (const r of aFaire) await F.synth(r.dit, r.wav)
    const lot = path.join(dossier, `lot-${process.pid}-${Date.now()}.json`)
    fs.writeFileSync(lot, JSON.stringify({ voix: F.voix, vitesse: F.vitesse, repliques: aFaire.map((r) => ({ texte: r.dit, dit: r.prononciation || r.dit, wav: r.wav, synthese: F.fournisseur === 'local' })) }))
    journal(`[voix] ${aFaire.length} réplique(s) à ${F.fournisseur === 'local' ? 'synthétiser (Kokoro ff_siwis) et ' : ''}écouter`)
    try {
      const res = appelerPython(['lot', lot])
      res.repliques.forEach((x, k) => {
        const r = aFaire[k]
        Object.assign(r, { duree: x.duree, transcription: x.transcription, mots: x.mots })
        fs.writeFileSync(r.meta, JSON.stringify({ dit: r.dit, fournisseur: F.fournisseur, voix: F.voix, vitesse: F.vitesse, duree: x.duree, transcription: x.transcription, mots: x.mots }))
      })
    } finally { fs.rmSync(lot, { force: true }) }
  }
  for (const r of repliques) {
    const affiches = r.affiches
    r.ressemblance = Math.round(ressemblance(affiches, r.mots.map((w) => w.mot)) * 1000) / 1000
    journal(`[voix]   ${r.cle.padEnd(10)} ${r.duree.toFixed(2)} s  ${r.ressemblance.toFixed(2)}  dit « ${r.dit} » → entendu « ${r.transcription} »`)
    if (r.ressemblance < 0.8) {
      throw new Error(`la voix ne dit pas le texte affiché (« ${r.dit} » ; entendu : « ${r.transcription} », ressemblance ${r.ressemblance}). ` +
        'Ajouter une prononciation dans produits/<produit>.json (« prononciations ») ou reformuler la ligne.')
    }
    r.temps = tempsDesMots(affiches, r.mots)
  }
  return repliques
}
