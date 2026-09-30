// scripts/contenu/publier-tiktok.mjs — la publication TikTok avec accord par vidéo (fiche 026-210, C07), écrit par Claude Code.
//
// Ce script ne CLIQUE JAMAIS « Publier » : la publication se fait dans Chrome, onglet VISIBLE, par l'extension (docs/marketing/
// tiktok-publication.md, phase 1). Il en est la GARDE : il dit si la publication de CETTE vidéo est permise (`verdictPublicationTikTok`),
// il rend la carte de l'accord à déposer, il prouve l'adresse publique SANS cookies, et il fabrique la ligne à ranger dans
// `contenu_posts`. Fonctions fermées : tout ce qui manque, est invalide ou lève une exception REFUSE ; « non mesuré » et
// « en attente » ne deviennent jamais un succès.
//
// TikTok Studio et le Centre de création ne sont jamais lus par un robot (CGU de TikTok, zone EEA, §4.5 ; règle R26 ouverte).
// Lancement (Node ≥ 22.6) :
//   node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/contenu/publier-tiktok.mjs verdict --video=v.json --decision=d.json
// Codes : 0 publication permise ; 1 refus (motif imprimé) ; 2 appel invalide.
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { vraisemblance } from '../../lib/agents/llm.ts'
import { accordValide, porteUneAffirmationChiffree, SEUIL_LAYA, textesVisibles, versionTexte } from '../../lib/contenu/lignes.ts'
import { cleAccord, versionAvecMedia } from '../../lib/contenu/accord.ts'

/** 10 Mo au plus par l'extension : on réencode à 9,5 Mo (docs/marketing/plateformes/README.md, TikTok, relevé du 2026-09-22). */
export const TAILLE_MAX_MO = 9.5

const refus = (motif, preuves = []) => ({ ok: false, motif, preuves })
const estTexte = (v) => typeof v === 'string' && v.trim().length > 0
const iso = (ms) => new Date(ms).toISOString()

/** Les textes que le public verra : légende, texte incrusté, miniature, description. */
function visibles(video) {
  return { texte: video.legende, sous_titres: video.texteIncruste, miniature_texte: video.miniature, description: video.description }
}

/** La version exacte sur laquelle l'accord porte : tous les textes visibles, plus l'empreinte du fichier si l'appelant la donne. */
export function versionVideo(video) {
  const v = visibles(video)
  const texte = versionTexte(v)
  return estTexte(video.empreinteMedia) ? versionAvecMedia(v, video.empreinteMedia) : texte
}

/**
 * Cette vidéo peut-elle être publiée ? `contexte` : { decision, pauseGenerale?, ligneSuspendue?, drapeauLeve? } ; `deps` : ce que
 * `vraisemblance` accepte (env, lancer, maintenant). Ordre : entrée valide → pause générale, ligne, drapeau → taille →
 * chiffres (Laya, seuil 0,5, source obligatoire) → accord individuel de Benj, jamais déduit d'un score.
 */
export async function verdictPublicationTikTok(video, contexte = {}, deps = {}) {
  try {
    if (!video || typeof video !== 'object') return refus('vidéo absente')
    if (!estTexte(video.id)) return refus('vidéo sans identifiant')
    if (!estTexte(video.legende)) return refus('légende absente : rien à publier')
    const ctx = contexte && typeof contexte === 'object' ? contexte : {}
    // Les garde-fous de série d'abord : ils ne dépendent pas du contenu.
    if (ctx.pauseGenerale === true) return refus('pause générale : aucune publication')
    if (ctx.ligneSuspendue === true) return refus('ligne suspendue : aucune publication')
    if (ctx.drapeauLeve === false) return refus('drapeau baissé : la fonction montrée n’est pas ouverte')
    // La taille : un fichier inconnu, non numérique ou trop gros est refusé (jamais « sans doute bon »).
    const taille = video.tailleMo
    if (typeof taille !== 'number' || !Number.isFinite(taille) || taille <= 0) return refus('taille du fichier inconnue : refusé')
    if (taille > TAILLE_MAX_MO) return refus(`fichier de ${taille} Mo (plafond ${TAILLE_MAX_MO} Mo par l’extension) : à réencoder`)
    // Les chiffres et promesses : légende, texte incrusté, miniature, description, chacun passe par Laya avec sa source.
    const maintenant = (() => { try { const t = (deps.maintenant ?? Date.now)(); return Number.isFinite(t) ? t : Date.now() } catch { return Date.now() } })()
    const preuves = []
    for (const texte of textesVisibles(visibles(video))) {
      if (!porteUneAffirmationChiffree(texte)) continue
      if (!estTexte(video.source)) return refus('affirmation chiffrée sans source : renvoyée à Benj', preuves)
      const r = await vraisemblance(texte, {}, deps)
      if (r === null) { preuves.push({ texte, source: video.source, p: null, verdict: 'indisponible', le: iso(maintenant) }); return refus('Laya indisponible (jev absent ou en panne) : bloqué, renvoyé à Benj', preuves) }
      const passe = !r.bloque && Number.isFinite(r.p) && r.p >= SEUIL_LAYA
      preuves.push({ texte, source: video.source, p: r.p, verdict: passe ? 'pass' : 'refus', le: iso(maintenant) })
      if (!passe) return refus(`score de vérité insuffisant (p=${r.p} < ${SEUIL_LAYA}) : renvoyé à Benj`, preuves)
    }
    // L'accord individuel : celui de CETTE vidéo, sur CETTE version. Ni la ligne, ni la première série, ni Laya n'en tiennent lieu.
    const a = accordValide(ctx.decision, video.id, versionVideo(video), maintenant)
    if (!a.ok) return refus(a.motif, preuves)
    return { ok: true, motif: 'accord individuel de Benj valable sur cette version', preuves, cleAccord: cleAccord(video.id, versionVideo(video)) }
  } catch (e) {
    return refus(`erreur du contrôle, par prudence rien ne part : ${String(e?.message || e).slice(0, 160)}`)
  }
}

/**
 * L'adresse publique répond-elle SANS cookies ? `deps.fetch` est doublé par les essais. Aucun en-tête d'identité n'est envoyé
 * (pas de Cookie, pas d'Authorization) ; la preuve ne consigne que l'adresse, l'état HTTP et l'heure : ni cookie, ni session.
 * Réseau en panne, délai ou état autre que 200 : « en attente », jamais un succès.
 */
export async function preuvePublique(url, deps = {}) {
  const le = iso((deps.maintenant ?? Date.now)())
  if (typeof url !== 'string' || !/^https:\/\/(www\.)?tiktok\.com\/[^\s]+$/.test(url) || url.length > 500) return { ok: false, etat: 'invalide', motif: 'adresse publique invalide', le }
  const appel = deps.fetch ?? globalThis.fetch
  try {
    const r = await appel(url, { method: 'GET', redirect: 'manual', credentials: 'omit', headers: { 'user-agent': 'presti-preuve-publique' } })
    if (r.status === 200) return { ok: true, etat: 'publie', url, statut_http: 200, sans_cookies: true, le }
    return { ok: false, etat: 'en_attente', url, statut_http: r.status, motif: `la page répond ${r.status} sans cookies : pas une preuve`, le }
  } catch (e) {
    return { ok: false, etat: 'en_attente', url, motif: `page injoignable : ${String(e?.message || e).slice(0, 120)}`, le }
  }
}

/** La ligne à ranger dans `contenu_posts` (0114) une fois la preuve publique faite : une liste blanche de champs, jamais la session. */
export function ligneContenuPost(video, decision, preuve, { ligne, agent } = {}) {
  if (!preuve?.ok || preuve.etat !== 'publie') return refus('pas de preuve publique : rien à enregistrer')
  if (!estTexte(ligne) || !estTexte(agent)) return refus('ligne ou agent absent : rien à enregistrer')
  if (!decision || decision.statut !== 'tranchee' || decision.choix !== 'accorder') return refus('accord absent : rien à enregistrer')
  return {
    ok: true,
    ligne: {
      ligne_id: ligne, canal: 'tiktok', agent, texte: video.legende, legende: video.legende, sous_titres: video.texteIncruste ?? null,
      rendu_type: 'video', rendu_ref: video.rendu_ref ?? null, statut: 'publie', accord_cible: decision.cible, accord_le: decision.le ?? null,
      preuve_publique: preuve.url, preuve_le: preuve.le, publie_le: preuve.le,
    },
  }
}

// ── la ligne de commande : `verdict` seulement (rien ne publie, rien ne s'écrit) ─────────────────────────────────────
async function principal(argv) {
  const [cmd, ...reste] = argv
  const opt = Object.fromEntries(reste.filter((a) => a.startsWith('--')).map((a) => { const i = a.indexOf('='); return i === -1 ? [a.slice(2), true] : [a.slice(2, i), a.slice(i + 1)] }))
  if (cmd !== 'verdict' || !opt.video || !opt.decision) { console.error('usage : verdict --video=<fichier.json> --decision=<fichier.json> [--pause] [--ligne-suspendue]'); return 2 }
  let video, decision
  try { video = JSON.parse(fs.readFileSync(opt.video, 'utf8')); decision = JSON.parse(fs.readFileSync(opt.decision, 'utf8')) } catch (e) { console.error(`fichier illisible : ${e.message}`); return 2 }
  const v = await verdictPublicationTikTok(video, { decision, pauseGenerale: opt.pause === true, ligneSuspendue: opt['ligne-suspendue'] === true })
  console.log(JSON.stringify(v, null, 2))
  return v.ok ? 0 : 1
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) principal(process.argv.slice(2)).then((c) => { process.exitCode = c })
