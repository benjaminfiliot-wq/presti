#!/usr/bin/env node
// scripts/usine/analyse-video.mjs — l'analyste de vidéos de l'usine (agent sans clé : tout est local, Ollama sur 127.0.0.1, 06/10/2026).
//
//   node scripts/usine/analyse-video.mjs --une-passe            vide la file a-analyser/ (une analyse à la fois ; appelé par presti-videos.timer)
//   node scripts/usine/analyse-video.mjs --deposer=<url>        dépose l'URL dans la file (refusée si l'hôte n'est pas autorisé)
//   node scripts/usine/analyse-video.mjs <url|chemin.mp4>       analyse tout de suite, sans file (chemin : dans le dossier de travail seulement)
// Options : --travail=<dossier> (défaut ~/travail/videos) --ollama=http://127.0.0.1:11434 --ytdlp=<binaire> --ffmpeg=<binaire> --ffprobe=<binaire>
//           --vision=<modèle> --synthese=<modèle> (un seul modèle de synthèse, sans chaîne) --images-vision=<n> --delai-s=<s> --meminfo=<fichier> --refaire
//
// Ce que fait une analyse : hôte vérifié (liste fermée) → yt-dlp (durée ≤ 5 min, ≤ 60 Mo, 180 s) avec ses métadonnées → au plus 40 images en 480 px
// (une toutes les 2 s, ou moins souvent pour couvrir toute la vidéo) → choix des images qui changent → le modèle de VISION local lit le texte incrusté
// et décrit chaque image choisie → une SYNTHÈSE par un modèle texte (Ollama Cloud gratuit, sinon le 8B, sinon le 4B locaux) → un Markdown.
// La garde des nombres : tout nombre de la synthèse doit figurer dans les notes lues à l'écran ou dans les métadonnées ; sinon le fichier est
// écrit avec le statut « incertain » et les notes brutes, jamais avec une synthèse inventée.
// Aucune clé : l'environnement des processus enfants est réduit à PATH/HOME/LANG ; aucune variable du coffre n'est lue ni écrite.
// Vidéos publiques seulement : tiktok.com, vm./vt./m.tiktok.com, youtube.com, youtu.be.
// Codes : 0 fait (ou rien à faire) ; 1 une analyse en échec ; 2 usage.
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { chercherSecrets } from '../instantane-quotidien.mjs'

// ── les limites (fermées : une vidéo qui les dépasse est refusée, jamais tronquée) ───────────────────────────────────────────
export const HOTES_PERMIS = Object.freeze(['tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com', 'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'])
export const DUREE_MAX_S = 300
export const TAILLE_MAX_O = 60 * 1024 * 1024
export const DELAI_TELECHARGEMENT_MS = 180_000
export const IMAGES_MAX = 40
export const LARGEUR_IMAGE = 480
export const ESSAIS_MAX = 3
export const VERROU_PEREMPTION_MS = 3 * 3_600_000
export const VISION_PAR_DEFAUT = 'qwen2.5vl:3b'
export const IMAGES_VISION_PAR_DEFAUT = 10
export const MEMOIRE_MIN_O = 4 * 1024 ** 3
const DELAI_ANALYSE_MS = 75 * 60_000
const DELAI_IMAGE_MS = 300_000
const IMAGE_ESSAIS = 3
const MOTEURS_SYNTHESE = Object.freeze([
  Object.freeze({ id: 'ollama_cloud', modele: 'gpt-oss:120b-cloud', budgetMs: 150_000 }),
  Object.freeze({ id: 'ollama_8b', modele: 'qwen3:8b-q4_K_M', budgetMs: 420_000 }),
  Object.freeze({ id: 'ollama_4b', modele: 'qwen3:4b-instruct-2507-q4_K_M', budgetMs: 300_000 }),
])

export class Refus extends Error { // définitif : la file ne réessaie pas
  constructor(code, message) { super(message || code); this.code = code; this.definitif = true }
}
export class Echec extends Error { // transitoire : réessayé aux passages suivants, trois fois au plus
  constructor(code, message) { super(message || code); this.code = code; this.definitif = false }
}

const court = (s, n = 200) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n)
const attendre = (ms) => new Promise((r) => setTimeout(r, ms))

// ── l'entrée : l'URL ou le chemin ───────────────────────────────────────────────────────────────────────────────────────────
/** L'URL est-elle une vidéo publique d'un hôte de la liste fermée ? Rend { ok, url, hote } ou { ok: false, raison }. Pure. */
export function verifierUrl(brut) {
  if (typeof brut !== 'string') return { ok: false, raison: 'url_absente' }
  const s = brut.trim()
  if (!s || s.length > 500 || /[\s\u0000-\u001f\u007f]/.test(s)) return { ok: false, raison: 'url_illisible' }
  let u
  try { u = new URL(s) } catch { return { ok: false, raison: 'url_illisible' } }
  if (u.protocol !== 'https:') return { ok: false, raison: 'protocole_non_https' }
  if (u.username || u.password) return { ok: false, raison: 'identifiants_dans_url' }
  if (u.port) return { ok: false, raison: 'port_non_autorise' }
  if (!HOTES_PERMIS.includes(u.hostname)) return { ok: false, raison: 'hote_non_autorise' }
  u.hash = ''
  return { ok: true, url: u.href, hote: u.hostname }
}

/** Le fichier est-il une vidéo DANS le dossier de travail (liens symboliques résolus) ? Rend { ok, chemin } ou { ok: false, raison }. */
export function cheminAutorise(chemin, racine) {
  if (typeof chemin !== 'string' || !chemin || chemin.includes('\0')) return { ok: false, raison: 'chemin_illisible' }
  if (!/\.(?:mp4|mov|webm|mkv)$/i.test(chemin)) return { ok: false, raison: 'extension_non_video' }
  let base, reel
  try { base = fs.realpathSync(racine); reel = fs.realpathSync(path.resolve(chemin)) } catch { return { ok: false, raison: 'fichier_introuvable' } }
  const rel = path.relative(base, reel)
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) return { ok: false, raison: 'hors_du_dossier_de_travail' }
  if (!fs.statSync(reel).isFile()) return { ok: false, raison: 'pas_un_fichier' }
  return { ok: true, chemin: reel }
}

export const nomFichier = (s, max = 60) => String(s ?? '').normalize('NFKD').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^[._-]+|[._-]+$/g, '').slice(0, max) || 'inconnu'

// ── la garde des nombres (modèle : scripts/chef/bilan.mjs, « nombre absent des données ») ──────────────────────────────────────
const JETON_NOMBRE = /\d{1,3}(?:[   ]\d{3})+(?:[.,]\d+)?|\d+(?:[.,]\d+)*/g
const ECHELLES = { k: 1e3, m: 1e6, md: 1e9, mille: 1e3, million: 1e6, millions: 1e6 }
function valeursDuJeton(jeton, suffixe) {
  const v = new Set()
  const sansEsp = jeton.replace(/[   ]/g, '')
  const seps = sansEsp.match(/[.,]/g) || []
  if (!seps.length) v.add(Number(sansEsp))
  else {
    // « 1,458 » est 1458 (milliers anglais) ou 1,458 : les deux lectures sont admises ; « 2,4 » n'est que 2,4.
    v.add(Number(sansEsp.replace(/[.,]/g, '')))
    if (seps.length === 1) v.add(Number(sansEsp.replace(',', '.')))
    const derniere = Math.max(sansEsp.lastIndexOf('.'), sansEsp.lastIndexOf(','))
    v.add(Number(sansEsp.slice(0, derniere).replace(/[.,]/g, '') + '.' + sansEsp.slice(derniere + 1)))
  }
  const e = ECHELLES[String(suffixe || '').toLowerCase()]
  if (e) for (const x of [...v]) v.add(Math.round(x * e * 1e6) / 1e6)
  return [...v].filter((x) => Number.isFinite(x))
}
/** Les nombres d'un texte : [{ brut, valeurs: [lectures possibles] }]. Les marqueurs de liste (« 1. », « - ») ne comptent pas. Pure. */
export function nombresDuTexte(texte) {
  const s = String(texte ?? '').normalize('NFC').replace(/^[ \t]*(?:[-*+•]|\d{1,2}[.)])[ \t]+/gm, ' ')
  const out = []
  for (const m of s.matchAll(new RegExp(`${JETON_NOMBRE.source}(?:[ \\u00a0]?(Md|[kKmM]|mille|millions?)(?![A-Za-zÀ-ÿ]))?`, 'g'))) {
    const jeton = /^\d{1,3}(?:[   ]\d{3})+(?:[.,]\d+)?|^\d+(?:[.,]\d+)*/.exec(m[0])[0]
    out.push({ brut: m[0].trim(), valeurs: valeursDuJeton(jeton, m[1]) })
  }
  return out
}
/** Les nombres que les métadonnées autorisent : chaque compte sous ses formes écrites (433 200, 433 k, 0,4 M), la durée (110 s, 1 min 50), la date. */
export function nombresDesMetadonnees(meta) {
  const ok = new Set()
  const ajoute = (...xs) => { for (const x of xs) if (Number.isFinite(x)) ok.add(Math.round(x * 1e6) / 1e6) }
  for (const k of ['vues', 'likes', 'commentaires']) {
    const n = meta?.[k]
    if (Number.isFinite(n)) ajoute(n, Math.round(n / 1e3), Math.round(n / 1e2) / 10, Math.round(n / 1e5) / 10, Math.round(n / 1e4) / 100, Math.round(n / 1e6), Math.round(n / 1e6 * 10) / 10)
  }
  const d = meta?.duree_s
  if (Number.isFinite(d)) ajoute(d, Math.round(d), Math.floor(d / 60), Math.round(d / 60), Math.round(d / 6) / 10, Math.round(d) % 60)
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(String(meta?.date ?? '').replace(/-/g, ''))
  if (m) ajoute(Number(m[1]), Number(m[2]), Number(m[3]))
  return ok
}
/** Les nombres de `synthese` qui ne sont ni dans le texte des données (notes, titre, description) ni dans les métadonnées. Pure. */
export function nombresAbsents(synthese, donneesTexte, meta) {
  const connus = nombresDesMetadonnees(meta)
  for (const n of nombresDuTexte(donneesTexte)) for (const v of n.valeurs) connus.add(Math.round(v * 1e6) / 1e6)
  return nombresDuTexte(synthese).filter((n) => !n.valeurs.some((v) => connus.has(Math.round(v * 1e6) / 1e6))).map((n) => n.brut)
}

// ── la synthèse : forme, secrets, nombres ───────────────────────────────────────────────────────────────────────────────────
export const SECTIONS = Object.freeze([
  { cle: 'montre', titre: 'Ce qui est montré, dans l\'ordre', numerote: true },
  { cle: 'utilisable', titre: 'Ce qui est utilisable pour Presti' },
  { cle: 'a_ne_pas_croire', titre: 'À ne pas croire' },
  { cle: 'idees', titre: 'Idées de fonctionnalités ou de méthodes à retenir' },
])
export const SCHEMA_SYNTHESE = Object.freeze({
  type: 'object',
  properties: Object.fromEntries(SECTIONS.map((s) => [s.cle, { type: 'array', minItems: 1, maxItems: 8, items: { type: 'string', minLength: 3, maxLength: 500 } }])),
  required: SECTIONS.map((s) => s.cle),
})

/** La synthèse est-elle publiable ? Rend { ok, fautes, synthese }. `donneesTexte` : tout ce que le modèle a pu lire (notes, titre, description). Pure. */
export function controlerSynthese(brut, donneesTexte, meta) {
  const fautes = []
  let s = brut
  if (typeof brut === 'string') {
    const nu = brut.replace(/<think>[\s\S]*?<\/think>/g, '').trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
    try { s = JSON.parse(nu) } catch { return { ok: false, fautes: ['la synthèse n\'est pas un JSON lisible'], synthese: null } }
  }
  if (!s || typeof s !== 'object' || Array.isArray(s)) return { ok: false, fautes: ['la synthèse n\'est pas un objet'], synthese: null }
  const propre = {}
  for (const { cle } of SECTIONS) {
    const l = s[cle]
    if (!Array.isArray(l) || !l.length) { fautes.push(`section « ${cle} » absente ou vide`); continue }
    const items = l.filter((x) => typeof x === 'string').map((x) => x.replace(/\s+/g, ' ').trim()).filter((x) => x.length >= 3).slice(0, 8)
    if (!items.length) fautes.push(`section « ${cle} » sans phrase lisible`)
    propre[cle] = items.map((x) => x.slice(0, 500))
  }
  if (fautes.length) return { ok: false, fautes, synthese: null }
  const tout = SECTIONS.flatMap((x) => propre[x.cle]).join('\n')
  if (chercherSecrets(tout).length) return { ok: false, fautes: ['la synthèse contient un secret'], synthese: null }
  const absents = nombresAbsents(tout, donneesTexte, meta)
  if (absents.length) return { ok: false, fautes: [`nombre absent des notes et des métadonnées : ${[...new Set(absents)].slice(0, 8).join(', ')}`], publique: [`${new Set(absents).size} nombre(s) absent(s) des notes et des métadonnées`], synthese: propre, absents }
  return { ok: true, fautes: [], synthese: propre }
}

// ── le Markdown ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const MILLIERS = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const JJMMAAAA = (d) => { const m = /^(\d{4})(\d{2})(\d{2})$/.exec(String(d ?? '').replace(/-/g, '')); return m ? `${m[3]}/${m[2]}/${m[1]}` : null }
export const bandeau = (modeleVision) => `Analyse automatique par un modèle de vision local (${modeleVision}) : à recouper, les chiffres lus à l'écran ne sont pas prouvés.`

/** La ligne de métadonnées, exacte : ce que yt-dlp a relevé, rien d'autre. */
export function ligneMetadonnees(meta, resolution) {
  const p = []
  if (resolution) p.push(resolution)
  p.push(Number.isFinite(meta.duree_s) ? `${MILLIERS(meta.duree_s)} s` : 'durée non relevée')
  const d = JJMMAAAA(meta.date)
  p.push(d ? `publiée le ${d}` : 'date non relevée')
  p.push(Number.isFinite(meta.vues) ? `**${MILLIERS(meta.vues)} vues**` : 'vues non relevées')
  p.push(Number.isFinite(meta.likes) ? `**${MILLIERS(meta.likes)} likes**` : 'likes non relevés')
  p.push(Number.isFinite(meta.commentaires) ? `**${MILLIERS(meta.commentaires)} commentaires**` : 'commentaires non relevés')
  return `Fichier : ${p.join(', ')}.`
}

export function assemblerMarkdown({ meta, resolution, modeleVision, moteurSynthese, synthese, statut, fautes, notes, sousTitres, imagesExtraites, imagesLues, secondes, maintenant = new Date() }) {
  const titre = court(meta.titre, 110).replace(/[«»"]/g, '').trim() || 'sans titre'
  const plateforme = /youtu/i.test(meta.plateforme || '') ? 'YouTube' : 'TikTok'
  const jour = maintenant.toISOString().slice(0, 10).split('-').reverse().join('/')
  const L = []
  L.push(`> ${bandeau(modeleVision)}`, '')
  L.push(`# Analyse — @${meta.uploader || 'inconnu'}, « ${titre} » (${plateforme} ${meta.id})`, '')
  L.push(ligneMetadonnees(meta, resolution))
  L.push(`Statut : ${statut}. Analyse faite le ${jour} : ${imagesLues} image${imagesLues > 1 ? 's' : ''} lue${imagesLues > 1 ? 's' : ''} par le modèle sur ${imagesExtraites} extraite${imagesExtraites > 1 ? 's' : ''} (au plus ${IMAGES_MAX}), en ${Math.round(secondes)} s. **Pas de transcription audio** : seuls le texte incrusté et l'image sont lus (${sousTitres?.actif ? 'sous-titres lus par OCR sur chaque image extraite' : 'sous-titres lus seulement par le modèle de vision, OCR indisponible'}).`, '')
  if (statut !== 'ok') {
    L.push(`**STATUT INCERTAIN** : la synthèse a été refusée par la garde (${fautes.join(' ; ')}). Les notes brutes ci-dessous sont les seules données ; aucune synthèse n'est publiée.`, '')
  } else {
    for (const s of SECTIONS) {
      L.push(`## ${s.titre}`)
      synthese[s.cle].forEach((x, i) => L.push(s.numerote ? `${i + 1}. ${x}` : `- ${x}`))
      L.push('')
    }
    L.push(`Synthèse rédigée par ${moteurSynthese}.`, '')
  }
  L.push('## Sous-titres lus à l\'écran (OCR, bruts)')
  if (sousTitres?.actif) for (const l of sousTitres.lignes) L.push(`- **${l.t} s** — « ${l.texte} »`)
  else L.push(`- OCR indisponible : ${sousTitres?.raison ?? 'non lancé'}. Les sous-titres ne sont lus que sur les images décrites ci-dessous.`)
  L.push('', '## Notes de vision, image par image (brutes, à recouper)')
  for (const n of notes) L.push(`- **${n.t} s** — texte : ${n.texte ? `« ${n.texte.replace(/\n+/g, ' / ')} »` : 'aucun'} ; image : ${n.image || 'non décrite'}`)
  L.push('')
  return L.join('\n')
}

// ── processus enfants : environnement réduit, délai, tués par PID ─────────────────────────────────────────────────────────────
function envEnfant() {
  const e = { LANG: 'C.UTF-8' }
  if (process.env.PATH) e.PATH = process.env.PATH
  if (process.env.HOME) e.HOME = process.env.HOME
  return e
}
function lancer(binaire, args, { delaiMs, capture = 'texte', cwd } = {}) {
  return new Promise((resolve) => {
    const exe = /\.(?:mjs|js)$/.test(binaire) ? process.execPath : binaire
    const argv = exe === binaire ? args : [binaire, ...args]
    const enfant = spawn(exe, argv, { stdio: ['ignore', 'pipe', 'pipe'], env: envEnfant(), cwd, detached: process.platform !== 'win32', windowsHide: true })
    const sortie = []
    let taille = 0, err = '', delai = false
    const tuer = () => { try { if (process.platform === 'win32') enfant.kill('SIGKILL'); else process.kill(-enfant.pid, 'SIGKILL') } catch { /* déjà mort */ } }
    const minuteur = setTimeout(() => { delai = true; tuer() }, delaiMs)
    enfant.stdout.on('data', (d) => { taille += d.length; if (taille <= 8_000_000) sortie.push(d) })
    enfant.stderr.on('data', (d) => { if (err.length < 4000) err += d.toString() })
    enfant.on('error', (e) => { clearTimeout(minuteur); resolve({ code: -1, delai, sortie: Buffer.alloc(0), erreur: `${e.code || e.message}` }) })
    enfant.on('close', (code) => { clearTimeout(minuteur); const b = Buffer.concat(sortie); resolve({ code: code ?? -1, delai, sortie: capture === 'texte' ? b.toString('utf8') : b, erreur: err }) })
  })
}

// ── Ollama (127.0.0.1 seulement) ────────────────────────────────────────────────────────────────────────────────────────────
function appelOllama(o, chemin, corps, delaiMs) {
  // node:http et non fetch : le fetch de Node coupe à 300 s sans en-tête (une synthèse locale chargée à froid y arrive).
  return new Promise((resolve, reject) => {
    const u = new URL(chemin, o.ollama)
    const donnees = Buffer.from(JSON.stringify(corps))
    let fini = false
    const fin = (f, v) => { if (!fini) { fini = true; clearTimeout(minuteur); f(v) } }
    const req = http.request({ hostname: u.hostname, port: u.port, path: u.pathname, method: 'POST', headers: { 'content-type': 'application/json', 'content-length': donnees.length } }, (res) => {
      const morceaux = []
      res.on('data', (d) => morceaux.push(d))
      res.on('error', (e) => fin(reject, new Echec('ollama_injoignable', `ollama : ${e.code || e.message}`)))
      res.on('end', () => {
        const t = Buffer.concat(morceaux).toString('utf8')
        if (res.statusCode < 200 || res.statusCode >= 300) return fin(reject, new Echec('ollama_http', `ollama ${res.statusCode} ${court(t, 120)}`))
        try { fin(resolve, JSON.parse(t)) } catch { fin(reject, new Echec('ollama_reponse', 'ollama : réponse illisible')) }
      })
    })
    const minuteur = setTimeout(() => { req.destroy(); fin(reject, new Echec('ollama_delai', 'ollama : délai dépassé')) }, delaiMs)
    req.on('error', (e) => fin(reject, new Echec('ollama_injoignable', `ollama : ${e.code || e.message}`)))
    req.end(donnees)
  })
}
const liberer = (o, modele) => appelOllama(o, '/api/generate', { model: modele, keep_alive: 0 }, 30_000).catch(() => null)

const CONSIGNE_IMAGE = 'Recopie tout le texte visible sur l\'image tel quel (sous-titres, texte des écrans, chiffres). Puis décris en une phrase ce qui est montré, sans rien inventer. Réponds sur deux lignes : la ligne TEXTE: suivie du texte recopié (ou du mot aucun), puis la ligne IMAGE: suivie d\'une seule phrase.'

/** La réponse du modèle de vision → { texte, image } : lignes répétées retirées (boucle du modèle), longueurs bornées. Pure. */
export function lireNote(brut) {
  const t = String(brut ?? '').replace(/<think>[\s\S]*?<\/think>/g, '').trim()
  const m = /^[\s\S]*?TEXTE\s*:\s*([\s\S]*?)(?:\n\s*IMAGE\s*:\s*([\s\S]*))?$/i.exec(t)
  let texte = m ? m[1] : ''
  const sansCadre = (x) => x.replace(/^["«<\s]+|[">»\s]+$/g, '') // le modèle recopie parfois les chevrons du modèle de réponse
  const image = sansCadre((m?.[2] ?? (m ? '' : t)).replace(/\s+/g, ' ')).slice(0, 300)
  const vues = new Set()
  texte = texte.split(/\n+/).map((l) => l.trim()).filter((l) => { const k = l.toLowerCase(); if (!l || vues.has(k)) return false; vues.add(k); return true }).join('\n')
  texte = sansCadre(texte)
  if (/^(?:aucun|none|n\/a|—|-)\.?$/i.test(texte)) texte = ''
  return { texte: texte.slice(0, 700), image }
}

async function lireImage(o, fichier) {
  const j = await appelOllama(o, '/api/chat', {
    model: o.vision, stream: false, keep_alive: '10m', options: { temperature: 0, num_predict: 320, num_ctx: 4096 },
    messages: [{ role: 'user', content: CONSIGNE_IMAGE, images: [fs.readFileSync(fichier).toString('base64')] }],
  }, DELAI_IMAGE_MS)
  if (typeof j?.message?.content !== 'string') throw new Echec('vision_vide', 'le modèle de vision n\'a rien rendu')
  return lireNote(j.message.content)
}

// ── le choix des images qui changent ──────────────────────────────────────────────────────────────────────────────────────────
const ecart = (a, b) => { let s = 0; const n = Math.min(a.length, b.length); for (let i = 0; i < n; i++) s += Math.abs(a[i] - b[i]); return n ? s / n : 0 }
/** Les indices des images à faire lire (au plus `max`) : celles qui changent par rapport à la dernière gardée, réparties sur toute la durée. Pure. */
export function choisirImages(miniatures, max, seuil = 6) {
  const n = miniatures.length
  if (n <= max && n <= 2) return miniatures.map((_, i) => i)
  const gardees = [0]
  for (let i = 1; i < n; i++) if (ecart(miniatures[i], miniatures[gardees[gardees.length - 1]]) >= seuil) gardees.push(i)
  const plancher = Math.min(max, n, 6)
  const repartis = (liste, k) => (liste.length <= k ? [...liste] : Array.from({ length: k }, (_, j) => liste[Math.round((j * (liste.length - 1)) / Math.max(1, k - 1))]))
  let choix = repartis(gardees, max)
  if (choix.length < plancher) {
    const autres = miniatures.map((_, i) => i).filter((i) => !choix.includes(i))
    choix = [...choix, ...repartis(autres, plancher - choix.length)]
  }
  return [...new Set(choix)].sort((a, b) => a - b)
}

// ── la synthèse (le modèle texte) ─────────────────────────────────────────────────────────────────────────────────────────────
export const SYSTEME = 'Tu es l\'analyste de vidéos de Presti. Tu écris en français, à partir des SEULES notes et métadonnées fournies. Tu n\'inventes rien : si une information manque, tu le dis. Tu ne calcules aucun pourcentage ni total.'
export function consigneSynthese(meta, notes, fautes, sousTitres = []) {
  const L = []
  L.push('Tu analyses une vidéo pour Presti. Presti est une plateforme qui répond aux clients des artisans du bâtiment, relance leurs devis, rédige devis et factures et crée leurs sites ; Presti mène aussi un projet e-commerce (eBay + TikTok « Brico Travaux », niche outils et bricolage, SANS achat de stock).')
  L.push('', `Vidéo : @${meta.uploader || 'inconnu'} — « ${court(meta.titre, 150)} »`)
  L.push(ligneMetadonnees(meta, null))
  if (meta.description) L.push(`Description : ${court(meta.description, 400)}`)
  if (sousTitres.length) {
    L.push('', 'Sous-titres lus à l\'écran par OCR sur toutes les images, dans l\'ordre (t = seconde approximative ; ce sont les phrases de la vidéo, avec d\'éventuelles fautes de lecture) :')
    for (const l of sousTitres) L.push(`- t=${l.t} s | ${l.texte}`)
  }
  L.push('', 'Notes lues sur des images de la vidéo, dans l\'ordre (t = seconde approximative ; « texte » = ce qui est écrit à l\'écran : sous-titres, écrans montrés, noms d\'outils ; « image » = description de la scène) :')
  for (const n of notes) L.push(`- t=${n.t} s | texte : ${n.texte ? n.texte.replace(/\n+/g, ' / ') : 'aucun'} | image : ${n.image || 'non décrite'}`)
  L.push('', 'Rédige un JSON de quatre listes de phrases courtes, en français :',
    '- "montre" : le déroulé de la vidéo, étape par étape, dans l\'ordre, avec la seconde approximative entre parenthèses, par exemple « (≈ ' + (notes[1]?.t ?? notes[0]?.t ?? 0) + ' s) ». Raconte ce que la vidéo dit (les sous-titres donnent le fil) et ce qu\'elle montre (écrans, outils, produits des notes de vision). Ne décris pas l\'apparence de la personne ni la pièce.',
    '- "utilisable" : ce qui sert Presti (réponses aux clients des artisans, relances de devis, devis et factures, sites) ou l\'e-commerce outils/bricolage. Si rien ne sert, écris UNE seule phrase qui le dit et explique pourquoi.',
    '- "a_ne_pas_croire" : ce qu\'il ne faut pas croire tel quel : promesses de résultats, chiffres d\'écran présentés comme des preuves, appel à commenter un mot ou à liker pour recevoir quelque chose (cite le mot exact), outil ou produit payant, conseil non transposable. Ne recopie JAMAIS un tableau ou une liste de chiffres lus à l\'écran.',
    '- "idees" : deux à quatre idées concrètes de fonctionnalités ou de méthodes tirées de ce que montre la vidéo ; si rien n\'est transposable, dis-le en une phrase.',
    'RÈGLE ABSOLUE : n\'écris un nombre que s\'il figure tel quel dans les notes ou les métadonnées ci-dessus. Pas de total, pas de pourcentage calculé, pas de chiffre de mémoire.')
  if (fautes?.length) L.push('', `Ta réponse précédente a été refusée : ${fautes.join(' ; ')}. Réécris-la sans ces nombres.`)
  return L.join('\n')
}

async function synthetiser(o, meta, notes, donneesTexte, journal, sousTitres = []) {
  const chaine = o.synthese ? [{ id: 'ollama_choisi', modele: o.synthese, budgetMs: 420_000 }] : MOTEURS_SYNTHESE
  const fautes = [], publiques = []
  let derniere = null
  for (const m of chaine) {
    let brut
    const t0 = Date.now()
    try {
      const j = await appelOllama(o, '/api/chat', {
        model: m.modele, stream: false, think: false, ...(m.id === 'ollama_4b' ? {} : { keep_alive: 0 }), format: SCHEMA_SYNTHESE, options: { num_ctx: 8192, temperature: 0.2, num_predict: 2500 },
        messages: [{ role: 'system', content: SYSTEME }, { role: 'user', content: consigneSynthese(meta, notes, derniere?.absents ? [derniere.fautes[0]] : null, sousTitres) }],
      }, m.budgetMs)
      brut = j?.message?.content
    } catch (e) { journal({ evenement: 'synthese_saute', moteur: m.id, cause: e.code }); fautes.push(`${m.id} : ${e.code}`); publiques.push(`${m.id} : ${e.code}`); continue }
    const r = controlerSynthese(brut, donneesTexte, meta)
    journal({ evenement: 'synthese', moteur: m.id, ok: r.ok, fautes: r.fautes, secondes: Math.round((Date.now() - t0) / 1000) })
    if (r.ok) return { ok: true, synthese: r.synthese, moteur: m.modele, fautes: [] }
    derniere = r
    fautes.push(`${m.id} : ${r.fautes.join(' ; ')}`); publiques.push(`${m.id} : ${(r.publique ?? r.fautes).join(' ; ')}`)
  }
  return { ok: false, synthese: null, moteur: null, fautes: fautes.length ? fautes : ['aucun moteur de synthèse'], publiques: publiques.length ? publiques : ['aucun moteur de synthèse'] }
}

// ── la mémoire ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function memoireDisponible(fichier) {
  if (process.platform !== 'linux' && !fichier) return Infinity
  try {
    const m = /^MemAvailable:\s+(\d+)\s+kB/m.exec(fs.readFileSync(fichier || '/proc/meminfo', 'utf8'))
    return m ? Number(m[1]) * 1024 : 0
  } catch { return 0 }
}

// ── les métadonnées de yt-dlp ──────────────────────────────────────────────────────────────────────────────────────────────────
const nombre = (x) => (typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : null)
export function lireInfo(brut, secours = {}) {
  let j = {}
  try { j = JSON.parse(brut) } catch { /* pas de fichier d'infos : métadonnées du fichier seulement */ }
  let date = typeof j.upload_date === 'string' && /^\d{8}$/.test(j.upload_date) ? j.upload_date : null
  if (!date && Number.isFinite(j.timestamp)) date = new Date(j.timestamp * 1000).toISOString().slice(0, 10).replace(/-/g, '')
  return {
    uploader: nomFichier(j.uploader || j.channel || j.uploader_id || secours.uploader || 'inconnu', 40),
    id: nomFichier(j.id || secours.id || 'sans-id', 40),
    titre: String(j.title || j.fulltitle || secours.titre || '').slice(0, 300),
    description: String(j.description || '').slice(0, 1200),
    duree_s: nombre(j.duration) ?? secours.duree_s ?? null,
    vues: nombre(j.view_count), likes: nombre(j.like_count), commentaires: nombre(j.comment_count),
    date, plateforme: String(j.extractor_key || j.extractor || ''),
    url_page: typeof j.webpage_url === 'string' ? j.webpage_url : null,
  }
}

// ── une analyse ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const VIDEO_EXT = /\.(?:mp4|mov|webm|mkv)$/i
const trouverVideo = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).find((f) => /^video\./.test(f) && VIDEO_EXT.test(f)) : null)

async function telecharger(o, url, dir, journal) {
  const sonde = trouverVideo(dir)
  if (sonde && fs.existsSync(path.join(dir, 'video.info.json'))) return path.join(dir, sonde)
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true })
  const t0 = Date.now()
  const r = await lancer(o.ytdlp, [
    '--ignore-config', '--no-playlist', '--no-progress', '--no-warnings', '--no-cache-dir', '--no-mtime', '--restrict-filenames', '--write-info-json',
    '--socket-timeout', '30', '--retries', '2', '--max-filesize', `${Math.floor(TAILLE_MAX_O / 1024 / 1024)}M`, '--match-filter', `duration<=${DUREE_MAX_S}`,
    '-f', 'b[height<=1080]/b', '-o', path.join(dir, 'video.%(ext)s'), '--', url,
  ], { delaiMs: DELAI_TELECHARGEMENT_MS })
  if (r.delai) throw new Echec('telechargement_delai', `téléchargement : plus de ${DELAI_TELECHARGEMENT_MS / 1000} s`)
  const fichier = trouverVideo(dir)
  if (r.code !== 0 || !fichier) {
    if (/does not pass filter|File is larger than max-filesize|has already been downloaded/i.test(`${r.erreur} ${r.sortie}`) && !fichier) {
      throw new Refus(/larger than/i.test(r.erreur) ? 'taille_trop_grande' : 'duree_trop_longue', `refusée par yt-dlp : ${court(r.erreur, 160)}`)
    }
    throw new Echec('telechargement', `yt-dlp : code ${r.code}, ${court(r.erreur, 200)}`)
  }
  journal({ evenement: 'telechargement', secondes: Math.round((Date.now() - t0) / 1000), octets: fs.statSync(path.join(dir, fichier)).size })
  return path.join(dir, fichier)
}

async function sonder(o, fichier) {
  const r = await lancer(o.ffprobe, ['-v', 'error', '-print_format', 'json', '-show_entries', 'format=duration,size:stream=codec_type,width,height', fichier], { delaiMs: 30_000 })
  let j = null
  try { j = JSON.parse(r.sortie) } catch { /* ffprobe a échoué */ }
  const duree = Number(j?.format?.duration)
  if (r.code !== 0 || !Number.isFinite(duree) || duree <= 0) throw new Refus('video_illisible', 'ffprobe ne lit pas la vidéo')
  const v = (j.streams || []).find((s) => s.codec_type === 'video' || s.width)
  return { duree, octets: fs.statSync(fichier).size, largeur: v?.width ?? null, hauteur: v?.height ?? null }
}

/** La vidéo respecte-t-elle les limites ? Refus définitif sinon. Pure. */
export function controlerLimites({ duree, octets }) {
  if (!(duree > 0)) throw new Refus('video_illisible', 'durée illisible')
  if (duree > DUREE_MAX_S) throw new Refus('duree_trop_longue', `${Math.round(duree)} s > ${DUREE_MAX_S} s`)
  if (octets > TAILLE_MAX_O) throw new Refus('taille_trop_grande', `${octets} o > ${TAILLE_MAX_O} o`)
}

async function extraireImages(o, fichier, dir, duree) {
  const intervalle = Math.max(2, Math.ceil((duree / IMAGES_MAX) * 10) / 10)
  const dossier = path.join(dir, 'images')
  if (fs.existsSync(dossier) && fs.readdirSync(dossier).some((f) => /^img-\d+\.jpg$/.test(f))) return { dossier, intervalle }
  fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier, { recursive: true })
  const r = await lancer(o.ffmpeg, ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-i', fichier, '-vf', `fps=1/${intervalle},scale=${LARGEUR_IMAGE}:-2`, '-frames:v', String(IMAGES_MAX), '-q:v', '4', path.join(dossier, 'img-%03d.jpg')], { delaiMs: 180_000 })
  const n = fs.readdirSync(dossier).filter((f) => /^img-\d+\.jpg$/.test(f)).length
  if (r.code !== 0 || !n) throw new Echec('extraction_images', `ffmpeg : code ${r.code}, ${court(r.erreur, 160)}`)
  return { dossier, intervalle }
}

// Les miniatures 24×24 en gris de toutes les images, d'un seul appel (même filtre fps que l'extraction : mêmes instants).
async function miniatures(o, fichier, intervalle, n) {
  const r = await lancer(o.ffmpeg, ['-nostdin', '-hide_banner', '-loglevel', 'error', '-i', fichier, '-vf', `fps=1/${intervalle},scale=24:24:flags=area,format=gray`, '-frames:v', String(IMAGES_MAX), '-f', 'rawvideo', '-'], { delaiMs: 120_000, capture: 'binaire' })
  const tout = r.code === 0 ? r.sortie : Buffer.alloc(0)
  // Une miniature manquante (la vidéo finit entre deux instants) est comptée comme différente : l'image reste candidate.
  return Array.from({ length: n }, (_, i) => (tout.length >= (i + 1) * 576 ? Uint8Array.from(tout.subarray(i * 576, (i + 1) * 576)) : new Uint8Array(576).fill((i * 53) % 256)))
}

// ── les sous-titres : OCR de la bande basse de CHAQUE image (tesseract, quand il est installé) ─────────────────────────────────────
// Le modèle de vision coûte ~90 s par image sur 4 cœurs : il ne lit qu'une dizaine d'images. Les sous-titres, eux, portent le fil de la
// vidéo : le texte blanc est isolé par un seuil (le reste devient blanc), agrandi trois fois, puis lu en ~0,2 s par image.
export const FILTRE_OCR = 'crop=iw:ih*0.28:0:ih*0.58,scale=w=min(1600\\,3*iw):h=-1:flags=lanczos,format=gray,lut=y=if(gt(val\\,215)\\,0\\,255)'
export const CONFIANCE_OCR_MIN = 50
const LIGNE_OCR_MAX = 200

/** Le TSV de tesseract (une page par image) → Map(page → texte) : mots peu sûrs et signes isolés écartés, lignes mises bout à bout. Pure. */
export function lireTsv(tsv) {
  const pages = new Map()
  for (const l of String(tsv ?? '').split(/\r?\n/).slice(1)) {
    const c = l.split('\t')
    if (c.length < 12) continue
    const conf = Number(c[10]), mot = c[11].trim(), page = Number(c[1])
    if (!(conf >= CONFIANCE_OCR_MIN) || !mot || !Number.isInteger(page) || !/[A-Za-zÀ-ÿ0-9$€£%]/.test(mot)) continue
    pages.set(page, [...(pages.get(page) ?? []), mot])
  }
  return new Map([...pages].map(([p, mots]) => [p, mots.join(' ').replace(/\s+/g, ' ').trim()]).filter(([, t]) => (t.match(/[A-Za-zÀ-ÿ]/g) ?? []).length >= 3).map(([p, t]) => [p, t.slice(0, LIGNE_OCR_MAX)]))
}

/** Les sous-titres d'images voisines sont la même phrase : une seule ligne (la plus longue), à l'instant de la première. Pure. */
export function fusionnerSousTitres(lignes) {
  const sortie = []
  const norme = (t) => t.toLowerCase().replace(/[^a-zà-ÿ0-9]/g, '')
  for (const l of lignes) {
    const n = norme(l.texte)
    const prec = sortie.at(-1)
    if (prec && n.length >= 4 && prec.n.includes(n)) continue
    if (prec && prec.n.length >= 4 && n.includes(prec.n)) { prec.texte = l.texte; prec.n = n; continue }
    sortie.push({ t: l.t, texte: l.texte, n })
  }
  return sortie.map(({ t, texte }) => ({ t, texte }))
}

async function lireSousTitres(o, fichier, dir, intervalle, journal) {
  if (o.sansOcr) return { actif: false, raison: 'désactivé (--sans-ocr)', lignes: [] }
  const cache = path.join(dir, 'sous-titres.json')
  try { return JSON.parse(fs.readFileSync(cache, 'utf8')) } catch { /* pas encore lus */ }
  const t0 = Date.now()
  const dossier = path.join(dir, 'ocr')
  fs.rmSync(dossier, { recursive: true, force: true }); fs.mkdirSync(dossier, { recursive: true })
  const r = await lancer(o.ffmpeg, ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-i', fichier, '-vf', `fps=1/${intervalle},${FILTRE_OCR}`, '-frames:v', String(IMAGES_MAX), path.join(dossier, 's-%03d.png')], { delaiMs: 180_000 })
  const pngs = fs.readdirSync(dossier).filter((f) => /^s-\d+\.png$/.test(f)).sort()
  if (r.code !== 0 || !pngs.length) { journal({ evenement: 'ocr_absent', cause: 'extraction' }); return { actif: false, raison: 'extraction des bandes de sous-titres impossible', lignes: [] } }
  const liste = path.join(dossier, 'liste.txt')
  fs.writeFileSync(liste, `${pngs.map((f) => path.join(dossier, f)).join('\n')}\n`)
  let langues = o.ocrLangues
  let t = await lancer(o.tesseract, [liste, path.join(dossier, 'sortie'), '-l', langues, '--psm', '6', 'tsv'], { delaiMs: 180_000 })
  if (t.code === -1) { journal({ evenement: 'ocr_absent', cause: 'tesseract_absent' }); return { actif: false, raison: 'tesseract n\'est pas installé sur cette machine', lignes: [] } }
  if (t.code !== 0 && langues.includes('+')) { langues = langues.split('+')[0]; t = await lancer(o.tesseract, [liste, path.join(dossier, 'sortie'), '-l', langues, '--psm', '6', 'tsv'], { delaiMs: 180_000 }) }
  let tsv = ''
  try { tsv = fs.readFileSync(path.join(dossier, 'sortie.tsv'), 'utf8') } catch { /* tesseract a échoué */ }
  if (t.code !== 0 || !tsv) { journal({ evenement: 'ocr_absent', cause: 'tesseract_echec', detail: court(t.erreur, 160) }); return { actif: false, raison: 'tesseract a échoué', lignes: [] } }
  const pages = lireTsv(tsv)
  const lignes = fusionnerSousTitres(pngs.map((_, i) => ({ t: Math.round(i * intervalle), texte: pages.get(i + 1) })).filter((l) => l.texte))
  const res = { actif: true, langues, images: pngs.length, lignes }
  fs.writeFileSync(cache, JSON.stringify(res))
  journal({ evenement: 'ocr', images: pngs.length, lignes: lignes.length, secondes: Math.round((Date.now() - t0) / 1000) })
  return res
}

/** Analyse une vidéo (URL ou chemin) : rend { statut, sortie, ... } ; lève Refus (définitif) ou Echec (transitoire). */
export async function analyserVideo(o, source, nom, journal = () => {}) {
  const debut = Date.now()
  const dir = path.join(o.travail, 'tmp', nomFichier(nom, 80))
  fs.mkdirSync(dir, { recursive: true })
  let fichier, info = '', secours = {}
  if (/^https?:/i.test(source)) {
    const v = verifierUrl(source)
    if (!v.ok) throw new Refus(v.raison, `URL refusée : ${v.raison}`)
    fichier = await telecharger(o, v.url, dir, journal)
    try { info = fs.readFileSync(path.join(dir, 'video.info.json'), 'utf8') } catch { /* sans infos */ }
  } else {
    const c = cheminAutorise(source, o.travail)
    if (!c.ok) throw new Refus(c.raison, `chemin refusé : ${c.raison}`)
    fichier = c.chemin
    const jumeau = fichier.replace(VIDEO_EXT, '.info.json')
    try { info = fs.readFileSync(jumeau, 'utf8') } catch { /* sans infos */ }
    secours = { uploader: 'local', id: crypto.createHash('sha1').update(fs.readFileSync(fichier)).digest('hex').slice(0, 12), titre: path.basename(fichier) }
  }
  const sonde = await sonder(o, fichier)
  controlerLimites(sonde)
  const meta = lireInfo(info, { ...secours, duree_s: Math.round(sonde.duree) })
  if (meta.url_page) { const v = verifierUrl(meta.url_page); if (!v.ok) throw new Refus('hote_final_non_autorise', `la page finale n'est pas autorisée : ${v.raison}`) }
  const base = `${meta.uploader}-${meta.id}`
  const sortie = path.join(o.travail, 'analyses', `${base}.analyse.md`)
  if (!o.refaire && fs.existsSync(sortie) && /^Statut : ok\./m.test(fs.readFileSync(sortie, 'utf8'))) { journal({ evenement: 'deja_fait', sortie: path.basename(sortie) }); return { statut: 'deja_fait', sortie } }

  if (memoireDisponible(o.meminfo) < MEMOIRE_MIN_O) throw new Echec('memoire_basse', `moins de ${MEMOIRE_MIN_O / 1024 ** 3} Go de mémoire disponible`)
  const { dossier, intervalle } = await extraireImages(o, fichier, dir, sonde.duree)
  const images = fs.readdirSync(dossier).filter((f) => /^img-\d+\.jpg$/.test(f)).sort().slice(0, IMAGES_MAX)
  const minis = await miniatures(o, fichier, intervalle, images.length)
  const choix = choisirImages(minis, o.imagesVision)
  journal({ evenement: 'images', extraites: images.length, choisies: choix.length, intervalle_s: intervalle })
  const sous = await lireSousTitres(o, fichier, dir, intervalle, journal)

  fs.mkdirSync(path.join(dir, 'notes'), { recursive: true })
  const notes = []
  const budgetVision = o.delaiMs * 0.7
  let suite = 0
  try {
    for (const i of choix) {
      const cache = path.join(dir, 'notes', `${images[i]}.${nomFichier(o.vision, 40)}.json`)
      const t = Math.round(i * intervalle)
      let n = null
      try { n = JSON.parse(fs.readFileSync(cache, 'utf8')) } catch { /* pas encore lue */ }
      if (!n) {
        if (Date.now() - debut > budgetVision) { journal({ evenement: 'vision_budget', lues: notes.length, choisies: choix.length }); break }
        const t0 = Date.now()
        // Ollama est partagé avec les autres agents : quand l'un d'eux charge son modèle, le modèle de vision est déchargé et
        // une requête peut attendre plus de 5 min (mesuré le 06/10). Trois essais par image avant de la sauter.
        let derniere = null
        for (let essai = 1; essai <= IMAGE_ESSAIS && !n; essai++) {
          try { n = await lireImage(o, path.join(dossier, images[i])) } catch (e) { derniere = e; journal({ evenement: 'image_essai', image: images[i], essai, cause: e.code }) }
        }
        if (!n) {
          if (++suite >= 3) throw new Echec('vision_en_echec', `trois images de suite sans lecture (${derniere?.message})`)
          journal({ evenement: 'image_sautee', image: images[i], cause: derniere?.code }); continue
        }
        suite = 0
        fs.writeFileSync(cache, JSON.stringify(n))
        journal({ evenement: 'image', image: images[i], secondes: Math.round((Date.now() - t0) / 1000) })
      }
      notes.push({ t, ...n })
    }
  } finally { await liberer(o, o.vision) }
  if (!notes.length) throw new Echec('aucune_note', 'aucune image n\'a pu être lue')

  const donneesTexte = [meta.titre, meta.description, ...sous.lignes.map((l) => `${l.t} s ${l.texte}`), ...notes.map((n) => `${n.t} s ${n.texte} ${n.image}`)].join('\n')
  const res = await synthetiser(o, meta, notes, donneesTexte, journal, sous.lignes)
  const statut = res.ok ? 'ok' : 'incertain'
  const resolution = sonde.largeur && sonde.hauteur ? `${sonde.largeur}×${sonde.hauteur}` : null
  const md = assemblerMarkdown({ meta, resolution, modeleVision: o.vision, moteurSynthese: res.moteur, synthese: res.synthese, statut, fautes: res.publiques ?? [], notes, sousTitres: sous, imagesExtraites: images.length, imagesLues: notes.length, secondes: (Date.now() - debut) / 1000 })
  if (chercherSecrets(md).length) throw new Refus('secret_dans_la_sortie', 'la sortie contient un secret : rien n\'est écrit')
  fs.mkdirSync(path.dirname(sortie), { recursive: true })
  const tmp = `${sortie}.tmp-${process.pid}`
  fs.writeFileSync(tmp, md); fs.renameSync(tmp, sortie)
  fs.writeFileSync(path.join(path.dirname(sortie), `${base}.notes.json`), JSON.stringify({ video: base, modele_vision: o.vision, intervalle_s: intervalle, notes, sous_titres: sous.lignes }, null, 1))
  fs.rmSync(dir, { recursive: true, force: true })
  return { statut, sortie, images: images.length, lues: notes.length, secondes: Math.round((Date.now() - debut) / 1000) }
}

// ── la file ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const NOM_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,79}\.(?:url|mp4)$/
const DOSSIERS = ['a-analyser', 'analyses', 'traitees', 'a-part', 'tmp']

function etatDe(o) {
  const f = path.join(o.travail, 'etat.json')
  return {
    lire() { try { const j = JSON.parse(fs.readFileSync(f, 'utf8')); return { essais: j.essais || {}, en_cours: j.en_cours || null } } catch { return { essais: {}, en_cours: null } } },
    ecrire(e) { const t = `${f}.tmp-${process.pid}`; fs.writeFileSync(t, JSON.stringify(e, null, 1)); fs.renameSync(t, f) },
  }
}
function journalDe(o) {
  const f = path.join(o.travail, 'journal.jsonl')
  return (base) => (ev) => {
    const ligne = { t: new Date().toISOString(), ...base, ...ev }
    try { fs.appendFileSync(f, `${JSON.stringify(ligne)}\n`) } catch { /* le journal ne bloque jamais la file */ }
  }
}
const sansRequete = (u) => { try { const x = new URL(u); x.search = ''; x.hash = ''; return x.href } catch { return null } }

function deplacer(de, versDossier) {
  fs.mkdirSync(versDossier, { recursive: true })
  let vers = path.join(versDossier, path.basename(de))
  if (fs.existsSync(vers)) vers = path.join(versDossier, `${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${path.basename(de)}`)
  fs.renameSync(de, vers)
  return vers
}

/** Prend le verrou : un seul analyste à la fois. Rend { ok, perime } ; un verrou d'un processus mort ou de plus de 3 h est repris. */
export function prendreVerrou(o) {
  const f = path.join(o.travail, 'analyste.verrou')
  let perime = false
  for (let essai = 0; essai < 2; essai++) {
    try {
      const fd = fs.openSync(f, 'wx')
      fs.writeSync(fd, JSON.stringify({ pid: process.pid, le: new Date().toISOString() })); fs.closeSync(fd)
      return { ok: true, perime, liberer: () => { try { const v = JSON.parse(fs.readFileSync(f, 'utf8')); if (v.pid === process.pid) fs.rmSync(f, { force: true }) } catch { /* déjà libre */ } } }
    } catch (e) {
      if (e.code !== 'EEXIST') throw e
      let v = null
      try { v = JSON.parse(fs.readFileSync(f, 'utf8')) } catch { /* verrou illisible = périmé */ }
      const age = v ? Date.now() - Date.parse(v.le) : Infinity
      let vivant = false
      if (v && Number.isInteger(v.pid) && age < VERROU_PEREMPTION_MS) { try { process.kill(v.pid, 0); vivant = true } catch (er) { vivant = er.code === 'EPERM' } }
      if (vivant) return { ok: false }
      perime = true
      fs.rmSync(f, { force: true })
    }
  }
  return { ok: false }
}

function lireDemande(fichier) {
  const brut = fs.readFileSync(fichier, 'utf8').slice(0, 2000)
  const lignes = brut.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const ligne = lignes.map((l) => /^URL\s*=\s*(.+)$/i.exec(l)?.[1] ?? l).find((l) => /^https?:/i.test(l))
  return ligne || lignes[0] || ''
}

export async function unePasse(o) {
  for (const d of DOSSIERS) fs.mkdirSync(path.join(o.travail, d), { recursive: true })
  const jr = journalDe(o)
  const verrou = prendreVerrou(o)
  if (!verrou.ok) { console.log('analyste : déjà en cours'); return 0 }
  const etat = etatDe(o)
  let code = 0
  try {
    const e0 = etat.lire()
    if (verrou.perime && e0.en_cours) {
      // Le passage précédent est mort au milieu d'une vidéo (usine redémarrée, processus tué) : cela compte pour un essai.
      const nom = e0.en_cours.nom
      const n = (e0.essais[nom]?.n || 0) + 1
      e0.essais[nom] = { n, cause: 'interrompu (processus mort pendant l\'analyse)', le: new Date().toISOString() }
      e0.en_cours = null; etat.ecrire(e0)
      jr({ nom })({ evenement: 'reprise', cause: 'interrompu', essais: n })
    }
    const file = fs.readdirSync(path.join(o.travail, 'a-analyser'))
      .map((f) => ({ f, t: fs.statSync(path.join(o.travail, 'a-analyser', f)).mtimeMs })).sort((a, b) => a.t - b.t || a.f.localeCompare(b.f)).map((x) => x.f)
    const debutPasse = Date.now()
    for (const f of file) {
      const chemin = path.join(o.travail, 'a-analyser', f)
      const j = jr({ nom: f })
      if (!NOM_FILE.test(f)) { deplacer(chemin, path.join(o.travail, 'a-part')); j({ evenement: 'mise_de_cote', cause: 'nom_de_fichier_invalide' }); continue }
      let s = etat.lire()
      if ((s.essais[f]?.n || 0) >= ESSAIS_MAX) { deplacer(chemin, path.join(o.travail, 'a-part')); j({ evenement: 'mise_de_cote', cause: s.essais[f].cause, essais: s.essais[f].n }); fs.rmSync(path.join(o.travail, 'tmp', nomFichier(f, 80)), { recursive: true, force: true }); continue }
      if (Date.now() - debutPasse > 45 * 60_000) { j({ evenement: 'passe_pleine' }); break }
      let source
      try { source = f.endsWith('.url') ? lireDemande(chemin) : chemin } catch { source = '' }
      s.en_cours = { nom: f, pid: process.pid, debut: new Date().toISOString() }; etat.ecrire(s)
      let issue
      try {
        const r = await analyserVideo(o, source, f.replace(/\.(?:url|mp4)$/, ''), j)
        issue = { ok: true, ...r }
      } catch (e) { issue = { ok: false, code: e.code || 'erreur', message: court(e.message, 300), definitif: e instanceof Refus } }
      s = etat.lire(); s.en_cours = null
      if (issue.ok) {
        delete s.essais[f]; etat.ecrire(s)
        j({ evenement: 'analyse', statut: issue.statut, sortie: path.basename(issue.sortie), url: f.endsWith('.url') ? sansRequete(source) : null, images: issue.images, lues: issue.lues, secondes: issue.secondes })
        deplacer(chemin, path.join(o.travail, 'traitees'))
        console.log(`analyste : ${f} → ${path.basename(issue.sortie)} (${issue.statut}${issue.secondes ? `, ${issue.secondes} s` : ''})`)
      } else {
        if (issue.code === 'memoire_basse') {
          // L'usine est chargée : ce n'est pas la faute de la vidéo, l'essai n'est pas compté ; on réessaie au passage suivant.
          etat.ecrire(s); j({ evenement: 'attente_memoire', detail: issue.message }); console.log(`analyste : ${f} attend de la mémoire`)
          break
        }
        const n = (s.essais[f]?.n || 0) + 1
        s.essais[f] = { n, cause: `${issue.code} : ${issue.message}`, le: new Date().toISOString() }; etat.ecrire(s)
        if (issue.definitif || n >= ESSAIS_MAX) {
          deplacer(chemin, path.join(o.travail, 'a-part'))
          fs.rmSync(path.join(o.travail, 'tmp', nomFichier(f.replace(/\.(?:url|mp4)$/, ''), 80)), { recursive: true, force: true })
          j({ evenement: 'mise_de_cote', cause: issue.code, detail: issue.message, essais: n, definitif: issue.definitif })
          console.log(`analyste : ${f} mise de côté (${issue.code})`)
        } else {
          j({ evenement: 'echec', cause: issue.code, detail: issue.message, essais: n })
          console.log(`analyste : ${f} en échec (${issue.code}), essai ${n}/${ESSAIS_MAX}`)
        }
        code = 1
      }
    }
  } finally { verrou.liberer() }
  return code
}

export function deposer(o, url) {
  const v = verifierUrl(url)
  if (!v.ok) throw new Refus(v.raison, `URL refusée : ${v.raison}`)
  const dossier = path.join(o.travail, 'a-analyser')
  fs.mkdirSync(dossier, { recursive: true })
  const h = crypto.createHash('sha1').update(v.url).digest('hex').slice(0, 10)
  const existant = fs.readdirSync(dossier).find((f) => f.endsWith(`-${h}.url`))
  if (existant) return path.join(dossier, existant)
  const f = path.join(dossier, `${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${h}.url`)
  fs.writeFileSync(f, `${v.url}\n`)
  return f
}

// ── la ligne de commande ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export function options(argv) {
  const o = { positionnels: [] }
  const permises = ['travail', 'ollama', 'ytdlp', 'ffmpeg', 'ffprobe', 'vision', 'synthese', 'images-vision', 'delai-s', 'meminfo', 'deposer', 'tesseract', 'ocr-langues']
  for (const a of argv) {
    if (a === '--une-passe') { o.unePasse = true; continue }
    if (a === '--refaire') { o.refaire = true; continue }
    if (a === '--sans-ocr') { o.sansOcr = true; continue }
    const m = /^--([a-z-]+)=(.+)$/.exec(a)
    if (m) { if (!permises.includes(m[1])) throw new Error(`option inconnue : --${m[1]}`); o[m[1]] = m[2]; continue }
    if (a.startsWith('-')) throw new Error(`option inconnue : ${a}`)
    o.positionnels.push(a)
  }
  const modes = [o.unePasse, o.deposer !== undefined, o.positionnels.length > 0].filter(Boolean).length
  if (modes !== 1 || o.positionnels.length > 1) throw new Error('un seul mode : --une-passe, --deposer=<url> ou <url|chemin>')
  o.ollama ||= 'http://127.0.0.1:11434'
  if (new URL(o.ollama).hostname !== '127.0.0.1') throw new Error('ollama : 127.0.0.1 seulement')
  o.travail = path.resolve(o.travail || path.join(process.env.HOME || os.homedir(), 'travail', 'videos'))
  o.ytdlp ||= path.join(process.env.HOME || os.homedir(), 'bin', 'yt-dlp')
  o.ffmpeg ||= 'ffmpeg'; o.ffprobe ||= 'ffprobe'
  o.vision ||= VISION_PAR_DEFAUT
  o.tesseract ||= 'tesseract'
  o.ocrLangues = o['ocr-langues'] || 'eng+fra'
  if (!/^[a-z_]{3,8}(?:\+[a-z_]{3,8}){0,2}$/.test(o.ocrLangues)) throw new Error('--ocr-langues : des codes de langue tesseract séparés par + (eng+fra)')
  const n = o['images-vision'] === undefined ? IMAGES_VISION_PAR_DEFAUT : Number(o['images-vision'])
  if (!Number.isInteger(n) || n < 1 || n > IMAGES_MAX) throw new Error(`--images-vision : un entier de 1 à ${IMAGES_MAX}`)
  o.imagesVision = n
  o.delaiMs = (o['delai-s'] === undefined ? DELAI_ANALYSE_MS / 1000 : Number(o['delai-s'])) * 1000
  if (!Number.isFinite(o.delaiMs) || o.delaiMs <= 0 || o.delaiMs > 3 * 3_600_000) throw new Error('--delai-s : de 1 à 10800')
  return o
}

async function principal() {
  let o
  try { o = options(process.argv.slice(2)) } catch (e) { console.error(`✗ ${e.message}`); return 2 }
  if (o.deposer !== undefined) {
    try { console.log(`déposée : ${deposer(o, o.deposer)}`); return 0 } catch (e) { console.error(`✗ ${e.message}`); return e instanceof Refus ? 1 : 2 }
  }
  if (o.unePasse) return unePasse(o)
  for (const d of DOSSIERS) fs.mkdirSync(path.join(o.travail, d), { recursive: true })
  const verrou = prendreVerrou(o)
  if (!verrou.ok) { console.error('✗ une analyse est déjà en cours'); return 1 }
  const nom = `direct-${Date.now()}`
  try {
    const r = await analyserVideo(o, o.positionnels[0], nom, journalDe(o)({ nom: 'direct' }))
    console.log(`${r.statut} : ${r.sortie}`)
    return 0
  } catch (e) {
    console.error(`✗ ${e.code || 'erreur'} : ${e.message}`)
    fs.rmSync(path.join(o.travail, 'tmp', nom), { recursive: true, force: true })
    return 1
  } finally { verrou.liberer() }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  principal().then((c) => { process.exitCode = c }).catch((e) => { console.error(`✗ ${e.message}`); process.exitCode = 1 })
}
