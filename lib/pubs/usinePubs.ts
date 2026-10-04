// lib/pubs/usinePubs.ts — le module PUR de la fabrication des packs pubs payés et des échantillons du Studio sur l'usine (fiche 026-200).
//
// Aucune entrée-sortie, aucun import : les trois routes app/api/usine/pubs/{travail,depot,rendu} y prennent leurs règles (chemins permis,
// limites, octets magiques, extrait de l'accord, compteur d'échecs et bail d'un pack, suite d'une décision « regarder le premier
// échantillon »), et le juge usine-pubs-qa (026-199) les exerce par les routes. Syntaxe effaçable seulement (Node lit ce fichier
// sans compilation) : ni `enum`, ni `namespace`, ni propriété de paramètre.
//
// L'identité des pubs est `studio` (décision du 27/09, 026-175) : un seul tourneur pour les packs locaux (A6) et les échantillons (A9).

export const AGENT = 'studio'
export const BUCKET = 'packs-pubs'
export const BUCKET_PHOTOS = 'artisan-media'

const MO = 1024 * 1024
const GO = 1024 * 1024 * 1024

/** Un pack gardé sous bail n'est rendu à personne d'autre pendant 90 min (l'unité s'arrête à 80 min). */
export const BAIL_S = 90 * 60
/** Au 3e échec (annoncé par le tourneur ou constaté par la route), plus de reprise automatique : le pack reste payee. */
export const ECHECS_MAX = 3
/** Les adresses de lecture des photos du pack, et l'aperçu du premier échantillon pour Benj : 10 min au plus. */
export const SIGNATURE_LECTURE_S = 600
export const APERCU_S = 600
/** Au-delà de 60 % du gigaoctet partagé, aucun dépôt n'est signé. */
export const PART_STOCKAGE_MAX = 0.6
export const STOCKAGE_TOTAL_OCTETS = GO

export const LIMITES = Object.freeze({
  pack: Object.freeze({
    films: 3,
    visuels: 3,
    fichiers: 6,
    octetsMax: 60 * MO,
    types: Object.freeze(['video/mp4', 'image/jpeg', 'image/png']),
  }),
  studio: Object.freeze({
    fichiers: 1,
    octetsMax: 3 * MO, // le Gmail joint le MP4 au message (deposer-echantillon.mjs, même plafond)
    types: Object.freeze(['video/mp4']),
  }),
})

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SHA256 = /^[0-9a-f]{64}$/
const CLE_MARQUE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const NOM_FICHIER = /^[a-z0-9][a-z0-9._-]{0,80}$/
const NOM_FILM = /^video-([1-3])\.mp4$/
const NOM_VISUEL = /^visuel-([1-3])\.(jpg|png)$/
const NOM_ECHANTILLON = /^echantillon-[1-9][0-9]?\.mp4$/
const TYPE_PAR_EXTENSION: Record<string, string> = { mp4: 'video/mp4', jpg: 'image/jpeg', png: 'image/png' }

export const estUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v)
export const estEmpreinte = (v: unknown): v is string => typeof v === 'string' && SHA256.test(v)
export const estCleMarque = (v: unknown): v is string => typeof v === 'string' && v.length <= 80 && CLE_MARQUE.test(v)
export const estObjet = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

// ── le travail que le tourneur détient ──────────────────────────────────────────────────────────────────────────────────
export type TravailPack = { genre: 'pack'; id: string }
export type TravailStudio = { genre: 'studio'; id: string; marque: string }
export type Travail = TravailPack | TravailStudio

export type Chemin = { ok: true; objet: string; nom: string; type: string } | { ok: false; raison: string }

/**
 * Le chemin d'un fichier du travail, tel que le tourneur l'annonce (`packs-pubs/…`), ou son refus. Permis, et rien d'autre :
 *   pack   → packs-pubs/<pack>/livraison/video-[1-3].mp4 | visuel-[1-3].(jpg|png)
 *   Studio → packs-pubs/studio/<marque_cle>/echantillon-<n>.mp4
 * Chaque segment suit `^[a-z0-9][a-z0-9._-]{0,80}$` ; ni `..`, ni `//`, ni barre oblique inverse, ni majuscule, ni espace.
 * `objet` est le chemin DANS le bucket (sans le préfixe `packs-pubs/`) ; `type` est celui que l'extension impose.
 */
export function cheminPermis(travail: Travail, chemin: unknown): Chemin {
  if (typeof chemin !== 'string' || chemin.length === 0 || chemin.length > 200) return { ok: false, raison: 'chemin_invalide' }
  if (chemin.includes('..') || chemin.includes('//') || chemin.includes('\\') || chemin.startsWith('/') || chemin.endsWith('/')) return { ok: false, raison: 'chemin_invalide' }
  const parties = chemin.split('/')
  const attendu = travail.genre === 'pack' ? [BUCKET, travail.id.toLowerCase(), 'livraison'] : [BUCKET, 'studio', travail.marque]
  if (parties.length !== attendu.length + 1) return { ok: false, raison: 'chemin_invalide' }
  for (let i = 0; i < attendu.length; i++) if (parties[i] !== attendu[i]) return { ok: false, raison: 'chemin_invalide' }
  const nom = parties[attendu.length]
  if (!NOM_FICHIER.test(nom)) return { ok: false, raison: 'chemin_invalide' }
  const permis = travail.genre === 'pack' ? NOM_FILM.test(nom) || NOM_VISUEL.test(nom) : NOM_ECHANTILLON.test(nom)
  if (!permis) return { ok: false, raison: 'chemin_invalide' }
  const type = TYPE_PAR_EXTENSION[nom.slice(nom.lastIndexOf('.') + 1)]
  if (!type) return { ok: false, raison: 'chemin_invalide' }
  return { ok: true, objet: parties.slice(1).join('/'), nom, type }
}

export type FichierDepot = { chemin: string; objet: string; type: string; taille: number }

/** Le corps de `depot` : { chemin, type, taille } par fichier. Rend les fichiers vérifiés, ou le code du refus (400, aucune adresse signée). */
export function validerDepot(travail: Travail, fichiers: unknown): { ok: true; fichiers: FichierDepot[] } | { ok: false; raison: string } {
  const limites = travail.genre === 'pack' ? LIMITES.pack : LIMITES.studio
  if (!Array.isArray(fichiers) || fichiers.length < 1 || fichiers.length > limites.fichiers) return { ok: false, raison: 'fichiers_invalides' }
  const vus = new Set<string>()
  const emplacements = new Set<string>()
  const sortie: FichierDepot[] = []
  for (const f of fichiers) {
    if (!estObjet(f) || typeof f.chemin !== 'string' || typeof f.type !== 'string') return { ok: false, raison: 'fichier_invalide' }
    const taille = f.taille
    if (typeof taille !== 'number' || !Number.isSafeInteger(taille) || taille <= 0) return { ok: false, raison: 'fichier_invalide' }
    const c = cheminPermis(travail, f.chemin)
    if (!c.ok) return { ok: false, raison: c.raison }
    if (f.type !== c.type || !(limites.types as readonly string[]).includes(f.type)) return { ok: false, raison: 'type_invalide' }
    if (taille > limites.octetsMax) return { ok: false, raison: 'fichier_trop_gros' }
    const emplacement = c.nom.replace(/\.[a-z0-9]+$/, '') // visuel-1.jpg et visuel-1.png : un seul des deux
    if (vus.has(f.chemin) || emplacements.has(emplacement)) return { ok: false, raison: 'doublon' }
    vus.add(f.chemin)
    emplacements.add(emplacement)
    sortie.push({ chemin: f.chemin, objet: c.objet, type: c.type, taille })
  }
  return { ok: true, fichiers: sortie }
}

/** Le stockage partagé (ops_stockage_octets) : à 60 % ou moins, mesurable ; sinon aucune adresse (507). Une valeur nulle ou illisible est un refus. */
export function stockageAccepte(mesure: unknown): boolean {
  const n = typeof mesure === 'string' && /^\d{1,16}$/.test(mesure) ? Number(mesure) : mesure
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= STOCKAGE_TOTAL_OCTETS * PART_STOCKAGE_MAX
}

// ── les octets magiques ──────────────────────────────────────────────────────────────────────────────────────────────────
/** Les premiers octets d'un fichier correspondent-ils à son type ? (MP4 : « ftyp » au 5e octet ; JPEG : FF D8 FF ; PNG : sa signature de huit octets.) */
export function octetsMagiques(type: string, debut: Uint8Array): boolean {
  const b = debut
  if (type === 'video/mp4') return b.length >= 12 && b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70
  if (type === 'image/jpeg') return b.length >= 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
  if (type === 'image/png') return b.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((x, i) => b[i] === x)
  return false
}

// ── l'extrait de l'accord de la marque ──────────────────────────────────────────────────────────────────────────────────
const MOTS_ACCORD = /(?:^|[^\p{L}])(oui|d['’]accord|accord|avec plaisir|volontiers|bien s[uû]r|pas de probl[eè]me|ok)(?=$|[^\p{L}])/iu

/**
 * La phrase d'accord de la réponse de la marque : adresses (courriel, lien) et numéros masqués, 400 signes au plus. Ce texte part chez le
 * tourneur, qui l'écrit dans accord-photos.md : jamais l'adresse ni le téléphone de la marque.
 */
export function extraitAccord(texte: string): string {
  const net = String(texte ?? '')
    .replace(/https?:\/\/\S+|www\.\S+/gi, '[lien]')
    .replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[adresse]')
    .replace(/(?:\+|00)?\d(?:[\s.\-()]?\d){6,}/g, '[numéro]')
    .replace(/\s+/g, ' ')
    .trim()
  const phrases = net.split(/(?<=[.!?])\s+/)
  const accord = phrases.find((p) => MOTS_ACCORD.test(p)) ?? phrases[0] ?? ''
  return accord.slice(0, 400).replace(/\[[^\]]*$/, '').trim()
}

// ── le pack : bail et compteur d'échecs, dans packs_pubs.verifications (aucune colonne de plus) ───────────────────────────
export type Verifications = Record<string, unknown>
export const verificationsDe = (v: unknown): Verifications => (estObjet(v) ? v : {})
export const echecsDe = (v: unknown): number => {
  const n = Number(verificationsDe(v).usine_echecs)
  return Number.isInteger(n) && n > 0 ? n : 0
}
export const sousBail = (v: unknown, maintenant: number): boolean => {
  const jusqua = verificationsDe(v).usine_bail_jusqua
  return typeof jusqua === 'string' && Date.parse(jusqua) > maintenant
}
/** Un pack payé n'est pris que s'il n'est pas sous bail et n'a pas échoué trois fois. */
export const reprenable = (v: unknown, maintenant: number): boolean => !sousBail(v, maintenant) && echecsDe(v) < ECHECS_MAX
export const avecBail = (v: unknown, maintenant: number): Verifications => ({ ...verificationsDe(v), usine_bail_jusqua: new Date(maintenant + BAIL_S * 1000).toISOString() })
/** Le compteur d'échecs : un code, jamais un texte libre (la raison vient du tourneur : seuls [a-z0-9_.:-] restent). */
export const avecEchec = (v: unknown, raison: string, maintenant: number): Verifications => ({
  ...verificationsDe(v),
  usine_echecs: echecsDe(v) + 1,
  usine_echec: { raison: String(raison ?? '').toLowerCase().replace(/[^a-z0-9_.:-]/g, '_').slice(0, 120) || 'echec', le: new Date(maintenant).toISOString() },
})

// ── la photo d'un pack : seulement celles du dossier de l'artisan, dans le bucket des photos ─────────────────────────────
/** L'objet signable d'une photo (`<artisan>/<nom>`), ou null : une adresse qui désigne autre chose n'est jamais signée. */
export function objetPhoto(adresse: unknown, artisanId: string): string | null {
  if (typeof adresse !== 'string' || adresse.length > 600) return null
  let chemin: string
  try { chemin = decodeURIComponent(new URL(adresse).pathname) } catch { return null }
  const m = new RegExp(`/storage/v1/object/public/${BUCKET_PHOTOS}/(.+)$`).exec(chemin)
  if (!m) return null
  const objet = m[1]
  if (!objet.startsWith(`${artisanId}/`) || objet.includes('..') || objet.includes('//') || objet.includes('\\') || objet.endsWith('/')) return null
  return objet
}
/** Le nom que le tourneur voit : le dernier segment, sans autre signe que [A-Za-z0-9._-]. */
export const nomDePhoto = (objet: string): string => (objet.split('/').pop() ?? '').replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 100)

// ── le rendu ────────────────────────────────────────────────────────────────────────────────────────────────────────────
export type Annonce = { chemin: string; objet: string; type: string; sha256: string }

/** Le juge qui a rendu son verdict : le bon nom (pub-locale-qa pour un pack, pub-qa pour un échantillon), le code 0, l'empreinte de son journal. */
export function jugeVert(travail: Travail, juge: unknown): boolean {
  if (!estObjet(juge)) return false
  return juge.nom === (travail.genre === 'pack' ? 'pub-locale-qa' : 'pub-qa') && juge.code === 0 && estEmpreinte(juge.empreinte_journal)
}

/**
 * Les fichiers annoncés au rendu : la forme (un tableau d'objets { chemin, sha256 }) est un 400 ; le contenu (exactement les six fichiers d'un pack,
 * le seul MP4 d'un échantillon) est un échec du travail.
 */
export function validerAnnonces(travail: Travail, fichiers: unknown): { ok: true; annonces: Annonce[] } | { ok: false; raison: string; forme: boolean } {
  if (!Array.isArray(fichiers) || !fichiers.every((f) => estObjet(f) && typeof f.chemin === 'string' && estEmpreinte(f.sha256))) return { ok: false, raison: 'fichiers_invalides', forme: true }
  const attendus = travail.genre === 'pack' ? LIMITES.pack.fichiers : LIMITES.studio.fichiers
  if (fichiers.length !== attendus) return { ok: false, raison: 'fichiers_incomplets', forme: false }
  const annonces: Annonce[] = []
  const films = new Set<string>(), visuels = new Set<string>()
  for (const f of fichiers as { chemin: string; sha256: string }[]) {
    const c = cheminPermis(travail, f.chemin)
    if (!c.ok) return { ok: false, raison: 'fichiers_incomplets', forme: false }
    const film = NOM_FILM.exec(c.nom), visuel = NOM_VISUEL.exec(c.nom)
    if (travail.genre === 'pack') {
      if (film) { if (films.has(film[1])) return { ok: false, raison: 'fichiers_incomplets', forme: false }; films.add(film[1]) }
      else if (visuel) { if (visuels.has(visuel[1])) return { ok: false, raison: 'fichiers_incomplets', forme: false }; visuels.add(visuel[1]) }
      else return { ok: false, raison: 'fichiers_incomplets', forme: false }
    }
    annonces.push({ chemin: f.chemin, objet: c.objet, type: c.type, sha256: f.sha256.toLowerCase() })
  }
  if (travail.genre === 'pack' && (films.size !== LIMITES.pack.films || visuels.size !== LIMITES.pack.visuels)) return { ok: false, raison: 'fichiers_incomplets', forme: false }
  return { ok: true, annonces }
}

/** La raison d'un échec rendue au tourneur et gardée dans le compteur : un code court, jamais un texte libre. */
export const codeRaison = (raison: unknown, parDefaut = 'echec_annonce'): string => String(typeof raison === 'string' ? raison : '').toLowerCase().replace(/[^a-z0-9_.:-]/g, '_').slice(0, 120) || parDefaut

// ── le Studio : « regarder le premier échantillon » ─────────────────────────────────────────────────────────────────────────
export type DecisionTranchee = { cle_idempotence?: unknown; choix?: unknown }

/** « Premier » = aucune décision `acq:studio_echantillon:…` du Standard n'a encore été tranchée en `depose`. */
export const estPremierEchantillon = (tranchees: readonly DecisionTranchee[]): boolean =>
  !tranchees.some((d) => typeof d.cle_idempotence === 'string' && d.cle_idempotence.startsWith('acq:studio_echantillon:') && d.choix === 'depose')

export const cleRegarder = (decision: string, tentative: number): string => `studio:regarder_premier:${decision}:${tentative}`

/**
 * Où en est le regard de Benj sur le premier échantillon d'une décision `studio_echantillon` ? Chaque « refaire » ferme une tentative et en appelle
 * une nouvelle (avec son propre aperçu) : `ouvrir` la tentative n (idempotente par sa clé : la même tentative ouverte deux fois est une seule
 * décision), ou `envoyer` : Benj a dit « envoyer » à la dernière tentative, l'échantillon se dépose.
 */
export function suiteDuRegard(tranchees: readonly DecisionTranchee[], decision: string): { action: 'envoyer' } | { action: 'ouvrir'; tentative: number } {
  for (let n = 1; n <= 50; n++) {
    const d = tranchees.find((x) => x.cle_idempotence === cleRegarder(decision, n))
    if (!d) return { action: 'ouvrir', tentative: n }
    if (d.choix === 'envoyer') return { action: 'envoyer' }
  }
  return { action: 'ouvrir', tentative: 51 }
}
