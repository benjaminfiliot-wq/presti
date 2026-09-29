#!/usr/bin/env node
// scripts/contenu/fabriquer.mjs — C06 (fiche 026-209) : la fabrique de vidéos du service contenu, sur l'usine.
//
// Une idée d'une ligne connue (L1 à L5) devient, sans jamais rien publier, un rendu par réseau et un manifeste de
// provenance, déposés dans le bucket PRIVÉ `contenu` sous l'identité `contenu`. Six étapes, dans l'ordre :
//   1. figer l'entrée (idée, sources, version du gabarit) ; refuser ligne suspendue, texte libre non approuvé, doublon ;
//   2. script de 15 à 30 s fait de phrases approuvées ; chaque texte visible chiffré passe par `jev noul --provider laya`
//      (lib/agents/llm.ts `vraisemblance`, seuil 0,5, source obligatoire) : score faible, source absente ou panne de Laya
//      → « attente Benj », jamais un passage ;
//   3. captures de Presti sur compte de démonstration ou fixtures `@presti-test.invalid`, données masquées avant le rendu ;
//   4. rendu HyperFrames + ffmpeg, sous-titres, son mixé, une variante par réseau (TikTok ≤ 9,5 Mo), licence commerciale,
//      crédit CC BY transporté, voix choisie par lib/studio/voixFish.ts (`ff_siwis` en repli, Fish jamais sans droit) ;
//   5. dépôt des seuls rendus et du manifeste (déposé EN DERNIER : sa présence prouve un dépôt complet), noms stables,
//      reprise idempotente qui vérifie l'état du bucket avant de rien redéposer ; puis un battement de `contenu` ;
//   6. les refus (fichier absent, licence inconnue, taille, panne Laya, reprise) sont des fonctions pures ou injectables,
//      que le juge (contenu-qa.mjs --partie=fabrication) exerce sur doublures.
//
// Ce module ne lit aucun secret, n'appelle aucun réseau et ne lance aucun processus par lui-même : tout accès externe
// est INJECTÉ (`deps`, adaptateurs de scripts/contenu/lib/) et se ferme par défaut. Une entrée absente ou invalide ne
// devient jamais une valeur par défaut flatteuse. Publier reste l'accord individuel de Benj sur la version exacte (R24) :
// rien ici ne publie, et un score de Laya n'autorise rien.
//
// Usage (usine, sous l'identité `contenu`, jeton passé par le coffre, jamais affiché) :
//   node scripts/usine/avec-coffre.mjs PRESTI_JETON_CONTENU -- node --experimental-strip-types \
//     --import ./scripts/ts-loader.mjs scripts/contenu/fabriquer.mjs --entree=<fichier.json> [--dossier=<dir>] [--a-sec]
//   <fichier.json> = { entree, ligne, ideesConnues } (la ligne et ses suspensions viennent de la base, jamais devinées).
// Codes : 0 déposé (ou à sec) ; 1 refus ; 2 attente de Benj ; 3 arrêt (route de dépôt absente, pause, état illisible).
// Jamais process.exit() (Node 24 Windows : assertion libuv) : process.exitCode.
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.resolve(ICI, '..', '..')

// ── constantes ────────────────────────────────────────────────────────────────────────────────────────────────────
export const LIGNES = Object.freeze(['L1', 'L2', 'L3', 'L4', 'L5'])
export const RESEAUX = Object.freeze(['tiktok', 'instagram', 'facebook'])
export const SEUIL_LAYA = 0.5
/** Mégaoctet décimal : plus strict que 2^20, et l'extension TikTok refuse au-delà de 10 Mo. */
export const MO = 1_000_000
export const TAILLE_TIKTOK_MAX_MO = 9.5
export const DUREE_MIN_S = 15
export const DUREE_MAX_S = 30
/** Mots par seconde de la voix locale (estimation prudente avant le rendu ; la durée réelle est mesurée après). */
const MOTS_PAR_SECONDE = 2.6
/** Licences d'actifs admises dans une vidéo : CC BY-SA, NC, ND et « inconnue » sont refusées. */
export const LICENCES_ADMISES = Object.freeze(['cc0', 'domaine-public', 'cc-by', 'licence-commerciale', 'presti'])
/** Du plus contraignant au moins contraignant : la variante porte la licence la plus exigeante de ses actifs. */
const RANG_LICENCE = ['cc-by', 'licence-commerciale', 'domaine-public', 'cc0', 'presti']
const ID_SUR = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/
const DOMAINE_FIXTURE = 'presti-test.invalid'

// ── petites mains ─────────────────────────────────────────────────────────────────────────────────────────────────
const refus = (critere, motif, plus = {}) => ({ ok: false, critere, motif, ...plus })
const estObjet = (v) => !!v && typeof v === 'object' && !Array.isArray(v)
const estTexte = (v) => typeof v === 'string' && v.trim().length > 0
const sha256 = (donnees) => crypto.createHash('sha256').update(donnees).digest('hex')
const iso = (d) => { try { const t = d?.maintenant ? d.maintenant() : Date.now(); return new Date(Number.isFinite(t) ? t : Date.now()).toISOString() } catch { return new Date().toISOString() } }

/** JSON à clés triées : la même entrée donne les mêmes octets, donc la même empreinte (fabrication déterministe). */
export function jsonStable(valeur) {
  const tri = (v) => Array.isArray(v) ? v.map(tri) : estObjet(v) ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, tri(v[k])])) : v
  return JSON.stringify(tri(valeur))
}
export function figerProfond(v) {
  if (v && typeof v === 'object' && !Object.isFrozen(v)) { Object.freeze(v); for (const k of Object.keys(v)) figerProfond(v[k]) }
  return v
}
const copie = (v) => JSON.parse(JSON.stringify(v))

/** Empreinte de l'entrée : ce qui fait qu'une idée est « la même » (idée, ligne, gabarit, phrases, captures, actifs, voix). */
export function empreinteEntree(entree) {
  const e = entree || {}
  return sha256(jsonStable({
    ideeId: e.ideeId ?? null, ligne: e.ligne ?? null, gabarit: e.gabarit ?? e.ligne ?? null, canaux: e.canaux ?? null,
    phrases: Array.isArray(e.phrases) ? e.phrases.map((p) => [p?.texte ?? null, p?.source ?? null]) : null,
    textes: [e.legende ?? null, e.sous_titres ?? null, e.miniature_texte ?? null, e.description ?? null, e.source ?? null],
    captures: Array.isArray(e.captures) ? e.captures.map((c) => [c?.id ?? null, c?.url ?? null, c?.masques ?? null]) : null,
    medias: Array.isArray(e.medias) ? e.medias.map((m) => [m?.id ?? null, m?.licence ?? null, m?.source ?? null]) : null,
    voix: e.voix ?? null,
  }))
}

export const normaliserLicence = (l) => (typeof l === 'string' ? l.trim().toLowerCase().replace(/[\s_]+/g, '-') : '')

// ── étape 1 : l'entrée ────────────────────────────────────────────────────────────────────────────────────────────
/** Refuse une ligne suspendue (ou dont l'état de suspension est inconnu), un texte libre non approuvé, une idée déjà
 *  fabriquée (id ou empreinte), puis toute entrée mal formée. Le premier refus emporte ; rien n'a de défaut flatteur. */
export function verdictEntree(entree, ligne, ideesConnues) {
  if (!estObjet(entree)) return refus('entree', 'entrée absente ou invalide')
  if (!estObjet(ligne)) return refus('ligne', 'ligne inconnue : la fabrique ne part que d\'une ligne lue dans la base')
  if (ligne.suspendue === true) return refus('ligne_suspendue', 'ligne suspendue : aucune fabrication')
  if (ligne.suspendue !== false) return refus('ligne_suspension_inconnue', 'état de suspension de la ligne inconnu : fermé par défaut')
  if (entree.texteLibre === true && entree.approuve !== true) return refus('texte_libre', 'texte libre non approuvé : seules les phrases approuvées par Benj peuvent être dites')
  if (!Array.isArray(ideesConnues)) return refus('idees_connues', 'liste des idées déjà fabriquées illisible : un doublon ne peut pas être exclu')
  if (typeof entree.ideeId === 'string' && ideesConnues.includes(entree.ideeId)) return refus('doublon', `idée « ${entree.ideeId} » déjà fabriquée`)
  if (ideesConnues.includes(empreinteEntree(entree))) return refus('doublon', 'même contenu exact déjà fabriqué (empreinte identique)')
  if (!estTexte(entree.ideeId) || !ID_SUR.test(entree.ideeId)) return refus('idee_id', 'identifiant d\'idée absent ou hors de [A-Za-z0-9_-]{1,64}')
  if (!LIGNES.includes(entree.ligne)) return refus('ligne_inconnue', `ligne « ${entree.ligne} » hors de ${LIGNES.join(', ')}`)
  if (estTexte(ligne.id) && ligne.id !== entree.ligne) return refus('ligne_incoherente', `l'idée vise ${entree.ligne}, la ligne lue est ${ligne.id}`)
  if (ligne.approuvee === false) return refus('ligne_non_approuvee', 'ligne non approuvée par Benj')
  if (!Array.isArray(entree.canaux) || !entree.canaux.length || entree.canaux.some((c) => !RESEAUX.includes(c)) || new Set(entree.canaux).size !== entree.canaux.length) return refus('canaux', `canaux absents ou hors de ${RESEAUX.join(', ')}`)
  if (Array.isArray(ligne.canaux) && entree.canaux.some((c) => !ligne.canaux.includes(c))) return refus('canal_hors_ligne', 'un canal demandé n\'est pas un canal de la ligne')
  if (!Array.isArray(entree.phrases) || !entree.phrases.length) return refus('phrases', 'aucune phrase approuvée : pas de script')
  for (const p of entree.phrases) {
    if (!estObjet(p) || !estTexte(p.texte)) return refus('phrases', 'phrase vide ou mal formée')
    if (p.approuvee !== true) return refus('texte_libre', 'phrase non approuvée : texte libre refusé (approbation de Benj requise)')
  }
  if (!estTexte(entree.legende)) return refus('legende', 'légende absente : elle est lue au même titre que le film')
  if (!Array.isArray(entree.captures) || !entree.captures.length) return refus('captures', 'aucune capture demandée : la fabrique montre Presti')
  for (const c of entree.captures) if (!estObjet(c) || !estTexte(c.id) || !ID_SUR.test(c.id) || !estTexte(c.url)) return refus('captures', 'capture mal formée (id et url attendus)')
  if (new Set(entree.captures.map((c) => c.id)).size !== entree.captures.length) return refus('captures', 'deux captures portent le même id')
  if (entree.medias !== undefined && !Array.isArray(entree.medias)) return refus('medias', 'liste d\'actifs illisible')
  return { ok: true }
}

// ── étape 2 : les chiffres ────────────────────────────────────────────────────────────────────────────────────────
const RE_NOMBRE_MOT = /\b(deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|vingt|trente|quarante|cinquante|soixante|cent|mille|million|moiti[ée]|double|triple)\b|%|pour cent/i
/** Un chiffre, un nombre écrit en lettres ou un pourcentage : large exprès (un contrôle de trop vaut mieux qu'une promesse
 *  oubliée) ; la voix dit les nombres en lettres, un sous-titre les écrit en chiffres : les deux sont vus. */
export function porteUneAffirmationChiffree(texte) {
  const t = String(texte ?? '')
  return /\d/.test(t) || RE_NOMBRE_MOT.test(t)
}

/** Une phrase sans chiffre passe ; une phrase chiffrée exige sa source ET `vraisemblance()` (jev noul, provider laya
 *  seulement, module déjà PASS — jamais réimplémenté ici). Panne, absence ou score < 0,5 : refus, ne serait-ce qu'une fois. */
export async function verdictPhrase(phrase, source, deps = {}) {
  const texte = String(phrase ?? '')
  if (!porteUneAffirmationChiffree(texte)) return { ok: true, chiffree: false }
  if (!estTexte(source)) return refus('sans_source', 'affirmation chiffrée sans source', { verdict: 'sans_source', chiffree: true })
  let r = null
  try {
    const { vraisemblance } = await import('@/lib/agents/llm')
    r = await vraisemblance(texte, {}, deps)
  } catch { r = null }
  if (r === null || r === undefined || typeof r.p !== 'number' || !Number.isFinite(r.p)) return refus('laya_indisponible', 'Laya indisponible (jev absent, muet ou en panne) : bloqué, renvoyé à Benj', { verdict: 'indisponible', chiffree: true })
  if (r.p < SEUIL_LAYA || r.bloque === true) return refus('score_insuffisant', `score de vérité insuffisant (p=${r.p} < ${SEUIL_LAYA})`, { verdict: 'refus', p: r.p, chiffree: true })
  return { ok: true, chiffree: true, p: r.p, verdict: 'pass' }
}

/** Durée estimée du script dit (avant le rendu) ; la durée réelle est mesurée sur le fichier. */
export const dureeEstimeeS = (textes) => Math.round((textes.join(' ').trim().split(/\s+/).filter(Boolean).length / MOTS_PAR_SECONDE) * 10) / 10

// ── étape 3 : les captures ────────────────────────────────────────────────────────────────────────────────────────
const RE_EMAIL_G = /[\w.+-]+(?:@|%40)[\w-]+(?:\.|%2e)[\w.-]+/gi
const RE_TEL = /(?:\+33|0033)[\s.\d-]{8,}|(?:\+33[\s.-]?|\b0)[1-9](?:[\s.-]?\d{2}){4}/
const RE_PSEUDO = /(?:^|[\s(/])@[A-Za-z0-9._]{2,30}/
const RE_JETON = /\beyJ[\w-]{6,}\.[\w-]{6,}\.|\bsb_secret_|\bsk[-_](?:live|test|ant)[-_]|\bwhsec_|\bBearer\s+\S{12,}|\b[A-Fa-f0-9]{40,}\b|\b[A-Za-z0-9+/_-]{48,}={0,2}/
/** Ce qui pourrait identifier quelqu'un ou ouvrir une porte, dans le texte lisible d'une capture masquée. Seules les adresses
 *  `@presti-test.invalid` (fixtures) sont permises ; `interdits` : noms de prospects connus (comparaison exacte, sans casse). */
export function donneesSensibles(texte, interdits = []) {
  const t = String(texte ?? '')
  let dec = t
  try { dec = decodeURIComponent(t) } catch { /* texte gardé tel quel */ }
  const trouvees = []
  for (const m of (dec.match(RE_EMAIL_G) || [])) if (!m.toLowerCase().endsWith(`@${DOMAINE_FIXTURE}`)) { trouvees.push('adresse e-mail'); break }
  const sansFixture = dec.replace(new RegExp(`[\\w.+-]+@${DOMAINE_FIXTURE.replace(/\./g, '\\.')}`, 'gi'), '')
  if (RE_TEL.test(sansFixture)) trouvees.push('téléphone')
  if (RE_PSEUDO.test(sansFixture)) trouvees.push('pseudo')
  if (RE_JETON.test(dec)) trouvees.push('jeton ou clé')
  const bas = dec.toLowerCase()
  if ((Array.isArray(interdits) ? interdits : []).some((p) => typeof p === 'string' && p.trim().length >= 2 && bas.includes(p.trim().toLowerCase()))) trouvees.push('nom de prospect')
  return trouvees
}

/** Une capture ne se rend que si elle vient d'une démo ou d'une fixture et que son texte lisible (après masquage) ne
 *  porte aucune donnée sensible. La preuve du masquage est le texte rendu par la capture elle-même, jamais son déclaratif. */
export function verdictCapture(capture, interdits = []) {
  if (!estObjet(capture)) return refus('capture', 'capture absente')
  if (capture.origine !== 'demo' && capture.origine !== 'fixture') return refus('capture_origine', `origine « ${capture.origine} » : seules une démo et des fixtures @${DOMAINE_FIXTURE} sont capturées`)
  if (!estTexte(capture.fichier)) return refus('capture_fichier', 'capture sans fichier image')
  if (!Array.isArray(capture.textes)) return refus('capture_textes', 'texte lisible de la capture non fourni : le masquage ne peut pas être vérifié')
  const trouvees = donneesSensibles(capture.textes.join('\n'), interdits)
  if (trouvees.length) return refus('capture_donnee_sensible', `capture « ${capture.id} » : ${[...new Set(trouvees)].join(', ')} encore lisible : rendu refusé`)
  return { ok: true }
}

// ── étapes 4 et 5 : le fichier et le dépôt ────────────────────────────────────────────────────────────────────────
/** Le fichier rendu doit exister, être non vide et avoir été sondé. */
export function verdictFichier(chemin, sonde) {
  if (!estTexte(chemin)) return refus('fichier_absent', 'aucun fichier rendu')
  if (!sonde || !Number.isFinite(sonde.octets) || sonde.octets <= 0) return refus('fichier_absent', `fichier absent ou vide : ${path.basename(String(chemin))}`)
  return { ok: true }
}

/** Licence la plus exigeante d'un jeu d'actifs ; `null` si un seul est inconnu ou non admis (CC BY-SA, NC…). */
export function licenceDesActifs(medias) {
  if (!Array.isArray(medias)) return null
  const trouvees = []
  for (const m of medias) {
    const l = normaliserLicence(m?.licence)
    if (!LICENCES_ADMISES.includes(l)) return null
    trouvees.push(l)
  }
  return RANG_LICENCE.find((l) => trouvees.includes(l)) ?? 'presti'
}

/** Le dépôt est refusé sans licence connue et admise, sans piste audio, au-delà de 9,5 Mo pour TikTok (ou taille inconnue),
 *  hors 15–30 s, sans crédit pour du CC BY, ou si la voix n'est pas publiable (Fish sans droit commercial) sans essai interne
 *  déclaré. Toute donnée manquante refuse : jamais une valeur par défaut flatteuse. */
export function verdictDepot(manifeste) {
  const m = manifeste
  if (!estObjet(m)) return refus('manifeste', 'manifeste absent')
  const licence = normaliserLicence(m.licence)
  if (!licence) return refus('licence_inconnue', 'licence inconnue : dépôt refusé')
  if (!LICENCES_ADMISES.includes(licence)) return refus('licence_non_admise', `licence « ${licence} » non admise dans une vidéo`)
  if (licence === 'cc-by' && (!estTexte(m.credit) || m.creditInscrit === false)) return refus('credit_absent', 'CC BY sans crédit inscrit : dépôt refusé')
  if (m.pisteAudio !== true) return refus('sans_audio', 'vidéo silencieuse : aucune piste audio')
  if (!RESEAUX.includes(m.reseau)) return refus('reseau', `réseau « ${m.reseau} » inconnu`)
  if (m.tailleMo !== undefined && (typeof m.tailleMo !== 'number' || !Number.isFinite(m.tailleMo) || m.tailleMo <= 0)) return refus('taille', `taille illisible (${m.tailleMo})`)
  if (m.reseau === 'tiktok') {
    if (m.tailleMo === undefined) return refus('taille', 'taille inconnue : TikTok exige ≤ 9,5 Mo mesurés')
    if (m.tailleMo > TAILLE_TIKTOK_MAX_MO) return refus('taille', `taille ${m.tailleMo} Mo > ${TAILLE_TIKTOK_MAX_MO} Mo (TikTok)`)
  }
  if (m.duree_s !== undefined && !(m.duree_s >= DUREE_MIN_S && m.duree_s <= DUREE_MAX_S)) return refus('duree', `durée ${m.duree_s} s hors de ${DUREE_MIN_S}–${DUREE_MAX_S} s`)
  if (m.voix !== undefined) {
    if (m.etiquetteIA !== true) return refus('mention_ia', 'voix de synthèse sans mention IA')
    if (m.voix?.fournisseur === 'fish' && m.voix?.publiable !== true && m.essaiInterne !== true) return refus('voix_non_publiable', 'voix Fish sans droit commercial prouvé : essai interne seulement, à déclarer')
  }
  return { ok: true }
}

// ── le passage complet (injecté, jamais de réseau ici) ────────────────────────────────────────────────────────────
function stade(deps, etape) { try { deps.etat?.noter?.(etape) } catch { /* l'état ne décide de rien */ } }

/** Fabrique une idée. `deps` (tous injectés) : ligne, ideesConnues, interdits, dossier, racine, lireGabarit, vraisemblanceDeps,
 *  choisirVoix + voixDeps, capturer, rendre, sonder, hashFichier, sonderDepot, lister, deposer, battement, etat, maintenant.
 *  Rend { etat: 'depose' | 'a_sec' | 'refuse' | 'attente_benj' | 'arret', etape, critere, motif, … } ; jamais d'exception. */
export async function fabriquer(entree, deps = {}) {
  const journal = []
  const fin = (etat, etape, critere, motif, plus = {}) => { journal.push({ etape, critere, le: iso(deps) }); return { etat, etape, critere, motif, journal, ...plus } }
  try {
    // 1. figer
    const v1 = verdictEntree(entree, deps.ligne, deps.ideesConnues)
    if (!v1.ok) return fin('refuse', 1, v1.critere, v1.motif)
    const figee = figerProfond(copie(entree))
    const empreinte = empreinteEntree(figee)
    const racine = deps.racine ?? RACINE
    const gabaritNom = figee.gabarit ?? figee.ligne
    if (!LIGNES.includes(gabaritNom) && gabaritNom !== 'carrousel') return fin('refuse', 1, 'gabarit', `gabarit « ${gabaritNom} » inconnu`)
    let gabaritBrut
    try { gabaritBrut = deps.lireGabarit ? await deps.lireGabarit(gabaritNom) : fs.readFileSync(path.join(racine, 'public', 'contenu', 'gabarits', `${gabaritNom}.json`), 'utf8') } catch { gabaritBrut = null }
    if (!estTexte(gabaritBrut)) return fin('refuse', 1, 'gabarit', `gabarit « ${gabaritNom} » illisible`)
    let gabarit
    try { gabarit = JSON.parse(gabaritBrut) } catch { return fin('refuse', 1, 'gabarit', `gabarit « ${gabaritNom} » : JSON invalide`) }
    if (!estObjet(gabarit) || gabarit.type !== 'hyperframes') return fin('refuse', 1, 'gabarit', `gabarit « ${gabaritNom} » : forme inattendue`)
    const gabaritVersion = sha256(gabaritBrut)
    const sources = [...new Set([...figee.phrases.map((p) => p.source), ...figee.captures.map((c) => c.source), ...(figee.medias ?? []).map((m) => m.source), figee.source].filter(estTexte))].sort()
    const fige = { empreinte, ideeId: figee.ideeId, ligne: figee.ligne, gabarit: { nom: gabaritNom, version: gabaritVersion }, sources }
    stade(deps, 'fige')

    // La route de dépôt d'abord : sans elle, la fabrique s'arrête avant le dépôt et le dit (aucun rendu gâché).
    if (!deps.a_sec) {
      if (typeof deps.sonderDepot !== 'function' || typeof deps.deposer !== 'function' || typeof deps.lister !== 'function') return fin('arret', 5, 'depot_non_branche', 'dépôt non branché : arrêt avant tout rendu', { fige })
      let sonde
      try { sonde = await deps.sonderDepot() } catch { sonde = { ok: false, code: 'reseau' } }
      if (!sonde?.ok) return fin('arret', 5, sonde?.code === 'route_absente' ? 'route_depot_absente' : sonde?.code === 'pause' ? 'pause' : 'depot_indisponible', sonde?.code === 'route_absente' ? 'la route de dépôt du bucket « contenu » n\'existe pas encore : arrêt avant le dépôt' : `dépôt indisponible (${sonde?.code ?? 'inconnu'}) : arrêt`, { fige })
    }

    // Reprise : un état déjà écrit pour CETTE empreinte, dont les fichiers sont encore là avec le même sha256, épargne le rendu.
    let variantes = null, preuves = null, voix = null, scriptTexte = null
    const memo = deps.etat?.lire ? await deps.etat.lire() : null
    if (memo?.empreinte === empreinte && Array.isArray(memo.variantes) && memo.variantes.length === figee.canaux.length && memo.etapes?.includes('rendu')) {
      const intacts = memo.variantes.every((x) => x.chemin && typeof deps.hashFichier === 'function' && (() => { try { return deps.hashFichier(x.chemin) === x.sha256 } catch { return false } })())
      if (intacts) { variantes = memo.variantes; preuves = memo.preuves; voix = memo.voix; scriptTexte = memo.script }
    }

    if (!variantes) {
      // 2. script et chiffres
      const dits = figee.phrases.map((p) => p.texte.trim())
      const estimee = dureeEstimeeS(dits)
      if (estimee > DUREE_MAX_S) return fin('refuse', 2, 'script_trop_long', `script estimé à ${estimee} s : au plus ${DUREE_MAX_S} s`, { fige })
      const visibles = [
        ...figee.phrases.map((p) => ({ texte: p.texte, source: p.source ?? figee.source })),
        ...['legende', 'sous_titres', 'miniature_texte', 'description'].filter((k) => estTexte(figee[k])).map((k) => ({ texte: figee[k], source: figee.source })),
      ]
      preuves = []
      const bloques = []
      for (const t of visibles) {
        const r = await verdictPhrase(t.texte, t.source, deps.vraisemblanceDeps ?? {})
        if (r.chiffree) preuves.push({ texte: t.texte, source: t.source ?? null, verdict: r.verdict, p: r.p ?? null, le: iso(deps) })
        if (!r.ok) bloques.push({ critere: r.critere, motif: r.motif })
      }
      if (bloques.length) return fin('attente_benj', 2, bloques[0].critere, `${bloques.length} texte(s) chiffré(s) bloqué(s) : ${[...new Set(bloques.map((b) => b.critere))].join(', ')} ; renvoyé à Benj`, { fige, preuves })
      scriptTexte = dits.join(' ')

      // 3. captures
      if (typeof deps.capturer !== 'function') return fin('arret', 3, 'capture_non_branchee', 'capture non branchée : arrêt avant le rendu', { fige })
      const captures = await deps.capturer(figee.captures)
      if (!Array.isArray(captures) || captures.length !== figee.captures.length) return fin('refuse', 3, 'capture_incomplete', 'toutes les captures demandées ne sont pas revenues', { fige })
      for (const c of captures) {
        const v3 = verdictCapture(c, deps.interdits)
        if (!v3.ok) return fin('refuse', 3, v3.critere, v3.motif, { fige })
      }
      stade(deps, 'capture')

      // 4. voix, rendu, variantes
      const licence = licenceDesActifs(figee.medias ?? [])
      const credits = [...new Set((figee.medias ?? []).filter((m) => normaliserLicence(m.licence) === 'cc-by').map((m) => m.credit).filter(estTexte))].sort()
      const creditInscrit = credits.every((c) => [figee.legende, figee.description].some((t) => estTexte(t) && t.includes(c)))
      if (typeof deps.choisirVoix !== 'function') return fin('arret', 4, 'voix_non_branchee', 'choix de voix non branché : arrêt avant le rendu', { fige })
      const demande = {
        id: `${figee.ideeId}-${empreinte.slice(0, 12)}`, usage: figee.voix?.usage ?? 'usage_commercial', texte: scriptTexte,
        source_texte: (sources.length ? sources : [figee.ideeId]).join(' ; '), ...(figee.voix?.souhait === 'fish' ? {} : { voix: 'ff_siwis' }),
      }
      voix = await deps.choisirVoix(demande, deps.voixDeps ?? {})
      if (!voix || voix.refus) return fin('refuse', 4, `voix_${voix?.critere ?? 'inconnue'}`, `voix refusée (${voix?.critere ?? 'inconnue'})`, { fige })
      if (typeof deps.rendre !== 'function' || typeof deps.sonder !== 'function' || typeof deps.hashFichier !== 'function') return fin('arret', 4, 'rendu_non_branche', 'rendu non branché : arrêt', { fige })
      const rendus = await deps.rendre({ fige, gabarit, script: scriptTexte, phrases: dits, captures, voix, medias: figee.medias ?? [], reseaux: figee.canaux })
      if (!Array.isArray(rendus) || rendus.length !== figee.canaux.length) return fin('refuse', 4, 'rendu_incomplet', 'une variante par réseau est attendue', { fige })
      variantes = []
      for (const reseau of figee.canaux) {
        const r = rendus.find((x) => x?.reseau === reseau)
        const sonde = r?.fichier ? await deps.sonder(r.fichier) : null
        const vf = verdictFichier(r?.fichier, sonde)
        if (!vf.ok) return fin('refuse', 4, vf.critere, `${reseau} : ${vf.motif}`, { fige })
        const nom = `${figee.ideeId}/${empreinte.slice(0, 12)}/${reseau}.mp4`
        const variante = {
          nom, reseau, chemin: r.fichier, sha256: deps.hashFichier(r.fichier), octets: sonde.octets, tailleMo: Math.round((sonde.octets / MO) * 1000) / 1000,
          duree_s: sonde.duree_s, pisteAudio: sonde.pisteAudio === true, format: sonde.largeur && sonde.hauteur ? `${sonde.largeur}x${sonde.hauteur}` : null,
          licence, credit: credits.length ? credits.join(' ; ') : null, creditInscrit, source: sources.join(' ; ') || null,
          voix: { fournisseur: voix.fournisseur, voix: voix.voix, droit: voix.droit, publiable: voix.publiable, date: voix.date }, etiquetteIA: true,
          essaiInterne: figee.voix?.essai_interne === true,
        }
        const vd = verdictDepot(variante)
        if (!vd.ok) return fin('refuse', 4, vd.critere, `${reseau} : ${vd.motif}`, { fige })
        if (!estTexte(variante.source)) return fin('refuse', 4, 'source_absente', `${reseau} : la variante ne porte aucune source`, { fige })
        variantes.push(variante)
      }
      stade(deps, 'rendu')
      if (deps.etat?.ecrire) await deps.etat.ecrire({ empreinte, etapes: ['fige', 'capture', 'rendu'], variantes, preuves, voix, script: scriptTexte })
    }

    // 5. dépôt (rendus puis manifeste), idempotent
    const manifeste = {
      schema: 1, statut: 'fabrique', publication: 'aucune : l\'accord de Benj se donne sur la version exacte (R24)',
      ideeId: fige.ideeId, ligne: fige.ligne, empreinte, gabarit: fige.gabarit, sources: fige.sources, fabrique_le: iso(deps),
      script: scriptTexte, legende: figee.legende, preuves_chiffres: preuves, voix: { fournisseur: voix.fournisseur, voix: voix.voix, droit: voix.droit, publiable: voix.publiable, date: voix.date, source_texte: voix.source_texte ?? null },
      variantes: variantes.map(({ chemin, ...reste }) => reste),
    }
    if (deps.a_sec) return fin('a_sec', 4, 'a_sec', 'à sec : rendus et manifeste prêts, rien déposé', { fige, manifeste })
    const prefixe = `${fige.ideeId}/${empreinte.slice(0, 12)}/`
    let existants
    try { existants = await deps.lister(prefixe) } catch { return fin('arret', 5, 'etat_externe_illisible', 'état du bucket illisible : aucun dépôt tenté (reprise après vérification seulement)', { fige }) }
    if (!Array.isArray(existants)) return fin('arret', 5, 'etat_externe_illisible', 'état du bucket illisible : aucun dépôt tenté', { fige })
    const deposes = [], sautes = []
    const aDeposer = [
      ...variantes.map((x) => ({ nom: x.nom, chemin: x.chemin, type: 'video/mp4', octets: x.octets, sha256: x.sha256 })),
    ]
    const octetsManifeste = Buffer.from(`${jsonStable(manifeste)}\n`, 'utf8')
    aDeposer.push({ nom: `${prefixe}manifeste.json`, contenu: octetsManifeste, type: 'application/json', octets: octetsManifeste.length, sha256: sha256(octetsManifeste) })
    for (const f of aDeposer) {
      if (existants.some((e) => e?.nom === f.nom && e?.sha256 === f.sha256)) { sautes.push(f.nom); continue }
      let r
      try { r = await deps.deposer(f) } catch { r = { ok: false, code: 'reseau' } }
      if (!r?.ok) return fin('arret', 5, r?.code === 'pause' ? 'pause' : `depot_echec_${r?.code ?? 'inconnu'}`, `dépôt interrompu à « ${path.posix.basename(f.nom)} » (${r?.code ?? 'inconnu'}) : relancer reprendra sans redéposer ce qui est déjà là`, { fige, deposes, sautes })
      deposes.push(f.nom)
    }
    stade(deps, 'depose')
    let battement = false
    if (typeof deps.battement === 'function') { try { battement = (await deps.battement()) === true } catch { battement = false } }
    return fin('depose', 5, 'ok', `${deposes.length} fichier(s) déposé(s), ${sautes.length} déjà présent(s)`, { fige, manifeste, deposes, sautes, battement })
  } catch (e) {
    return fin('arret', 0, 'exception', `arrêt sur exception : ${String(e?.message || e).replace(/\s+/g, ' ').slice(0, 200)}`)
  }
}

// ── ligne de commande ─────────────────────────────────────────────────────────────────────────────────────────────
function lireArguments(argv) {
  const o = { entree: null, dossier: null, aSec: false }
  for (const a of argv) {
    if (a.startsWith('--entree=')) o.entree = a.slice(9)
    else if (a.startsWith('--dossier=')) o.dossier = a.slice(10)
    else if (a === '--a-sec') o.aSec = true
  }
  return o
}

async function principal() {
  const o = lireArguments(process.argv.slice(2))
  if (!o.entree) { console.error('✗ fabriquer.mjs : --entree=<fichier.json> manquant'); process.exitCode = 1; return }
  let charge
  try { charge = JSON.parse(fs.readFileSync(path.resolve(o.entree), 'utf8')) } catch (e) { console.error(`✗ fabriquer.mjs : entrée illisible (${e.code || 'JSON invalide'})`); process.exitCode = 1; return }
  const dossier = path.resolve(o.dossier ?? path.join(RACINE, '.orchestre', 'travail', 'contenu-fabrique', String(charge?.entree?.ideeId ?? 'sans-id')))
  fs.mkdirSync(dossier, { recursive: true })
  const { creerAdaptateurs } = await import('./lib/rendu.mjs')
  const { creerDepot } = await import('./lib/depot.mjs')
  const { choisirVoix } = await import('@/lib/studio/voixFish')
  const rendu = creerAdaptateurs({ dossier })
  const depot = o.aSec ? {} : creerDepot({ env: process.env })
  const fichierEtat = path.join(dossier, 'etat.json')
  const etat = {
    lire: () => { try { return JSON.parse(fs.readFileSync(fichierEtat, 'utf8')) } catch { return null } },
    ecrire: (v) => fs.writeFileSync(fichierEtat, JSON.stringify(v)),
  }
  const r = await fabriquer(charge?.entree, {
    a_sec: o.aSec, ligne: charge?.ligne, ideesConnues: charge?.ideesConnues, interdits: charge?.interdits ?? [], dossier, etat,
    choisirVoix, voixDeps: rendu.voixDeps(charge?.voixEtat), vraisemblanceDeps: {},
    capturer: rendu.capturer, rendre: rendu.rendre, sonder: rendu.sonder, hashFichier: rendu.hashFichier, ...depot,
  })
  const { fige, manifeste, ...sortie } = r
  console.log(JSON.stringify({ ...sortie, empreinte: fige?.empreinte ?? null }))
  process.exitCode = { depose: 0, a_sec: 0, refuse: 1, attente_benj: 2, arret: 3 }[r.etat] ?? 3
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) principal().catch((e) => { console.error(`✗ fabriquer.mjs : ${String(e?.message || e).slice(0, 200)}`); process.exitCode = 3 })
