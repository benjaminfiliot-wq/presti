// lib/agents/acquisition/facteur.ts — le Facteur : le seul agent qui approuve un message, puis qui envoie ce qui se porte
// par le Gmail de prospection et par Meta (fiche 026-089).
//
// Deux moitiés, parce que le second juge n'a de modèle que sur l'usine (contre-revue du 25/09 au soir) :
//   · SUR L'USINE, le script `scripts/agents/passes-modele.mjs --agent=facteur` prend le travail (`travailDuJuge`), fait
//     tourner le second juge (`executerJuge`, pure : le lecteur est injecté) et rend son avis à la route `avis` ;
//   · SUR VERCEL, `jugerAvecAvis` rejoue J3 sur le texte exact, fait J1, relit `peutEnvoyer`, puis approuve ou annule — par
//     la seule fonction `acq_envoi_approuver` (0106), avec les trois verdicts ; `executerFacteur` (la route cron) ne juge
//     plus rien : elle ENVOIE (Gmail, Meta) ce qui est approuvé et fait la passe du soir (palier, notice).
// L'usine ne peut donc qu'ajouter un avis de ton : elle ne peut ni approuver seule, ni sauter J3 ou J1.
//
// Ce module est pur : tout le monde extérieur est injecté (magasin, porteur Gmail, client Meta, horloge, récupérateur).
// Jamais : envoyer un `formulaire_site` (le porteur de l'usine le prend, 026-095), réécrire un message, importer
// `@/lib/ai`, `@/lib/agents/llm`, Resend ou `@/lib/email`, mettre un texte de message, une adresse ou un secret dans un
// événement. Le froid ne part jamais tant que Benj n'a pas ouvert `envoi_froid` (`peutEnvoyer`, 0111). Un envoi n'est
// jamais approuvé sans les trois verdicts, et jamais sans l'accord individuel de Benj : cet accord vit dans la base (0099,
// `attend_accord_benj`) ; ici on ne fait que ne rien envoyer qui ne soit `approuve`.
// Syntaxe effaçable seulement (ts-loader) : ni `enum`, ni `namespace`, ni propriété de paramètre.
import { createHash } from 'node:crypto'
import type {
  Candidat, Canal, ContactPasse, EnvoiApprouve, EnvoiEnAttente, EnvoiPrepare, EtatEnvoi, Horloge, Magasin, MaquetteEtat, Recuperateur, Verdicts,
} from './contrat'
import { NOTICE_URL } from './contrat'
import { jugerMessage } from './conformite'
import type { EntreeJuge, EtatMaquette } from './conformite'
import { FAQ } from './faq'
import { verifierAvantEnvoi } from './jugeFaits'
import { peutEnvoyer } from './disjoncteurs'
import { CODES_FERMETURE, jugerTon } from './secondJuge'
import type { LecteurJuge, VerdictTon } from './secondJuge'
import type { Porteur } from './porteurs'
import type { EnvoiMeta } from './envoiMeta'

// ── Constantes ────────────────────────────────────────────────────────────────────────────────────────────────────────────
export const AGENT_FACTEUR = 'facteur'
/** Le second juge appelle un modèle : 20 appels au plus par exécution (`PLAFONDS.appelsParExecution`, 026-043). */
export const JUGES_MAX_PAR_PASSAGE = 20
/** Combien d'envois `prepare` on lit pour retrouver celui d'un avis (la base rend au plus cette limite). */
const LECTURE_MAX = 200
const ENVOIS_MAX_PAR_CANAL = 20
const DELAI_NOTICE_MS = 10_000
const NOTICE_OCTETS_MAX = 2_000_000
const CURSEUR_REJUGE_SERVI = 'facteur_rejuge_servi'
const CURSEUR_REJUGE_AVIS = 'facteur_rejuge_avis'
/** Les motifs de `peutEnvoyer` qui ne tiennent qu'à l'état du moment : l'envoi attend, il n'est pas annulé. */
const MOTIFS_QUI_ATTENDENT = new Set(['technologie_en_pause', 'formulaire_coupe', 'gmail_coupe', 'meta_coupe', 'envoi_froid_ferme', 'notice_perimee', 'ads_archive_non_lue'])
/** Ce que la base refuse à l'approbation sans que le message soit en cause : l'envoi attend (pause, froid fermé, accord de Benj). */
const REFUS_BASE_QUI_ATTENDENT = /^(pause_generale|pause|envoi_froid_ferme|accord_absent|accord_perime|accord_rejoue|accord_different)$/

const sha256 = (s: string): string => createHash('sha256').update(s, 'utf8').digest('hex')
const jourParis = (ms: number): string => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms))
const codes = (r: string[]): string[] => [...new Set(r.map((x) => String(x).slice(0, 60)))].slice(0, 8)
const compter = (t: Record<string, number>, cle: string): void => { t[cle] = (t[cle] ?? 0) + 1 }

/** Le magasin, plus les deux gestes de la passe du soir que le contrat ne porte pas (la route les branche sur 0111). */
export type MagasinFacteur = Magasin & {
  /** `acq_palier_evaluer()` (0111). */
  palierEvaluer?: () => Promise<unknown>
  /** `acq_notice_verifiee(p_le)` (0111). */
  noticeVerifiee?: (le: string) => Promise<void>
  /** Un prospect par son identifiant : renseigné par l'implémentation en mémoire des juges ; la base le rend avec l'envoi. */
  lireProspect?: (id: string) => Promise<unknown> | unknown
}

export interface DrapeauxFacteur {
  siteAchatPublic: boolean
  varianteA: boolean
}
export interface OffreStudio {
  videos: number
  prix_texte: string
}

// ── Les envois à juger : la forme de la base et celle des juges ─────────────────────────────────────────────────────────
type LigneEnvoi = { envoi: EnvoiEnAttente; prospect: (Candidat & { id?: string }) | null; historique: ContactPasse[] | null }
const objet = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)

/**
 * La base (`acq_envois_a_approuver`) rend `{ envoi, prospect, historique }` ; l'implémentation en mémoire des juges rend
 * l'envoi seul et un `lireProspect` à part. Les deux formes sont lues ici, une seule fois.
 */
async function normaliser(magasin: MagasinFacteur, brut: unknown): Promise<LigneEnvoi | null> {
  if (!objet(brut)) return null
  const enveloppe = objet(brut.envoi)
  const envoi = (enveloppe ? brut.envoi : brut) as unknown as EnvoiEnAttente
  if (!objet(envoi) || typeof envoi.id !== 'string' || typeof envoi.texte !== 'string') return null
  let prospect: unknown = enveloppe ? brut.prospect ?? null : null
  if (!prospect && envoi.prospect_id && typeof magasin.lireProspect === 'function') {
    try { prospect = (await magasin.lireProspect(envoi.prospect_id)) ?? null } catch { prospect = null }
  }
  const historique = enveloppe && Array.isArray(brut.historique) ? (brut.historique as ContactPasse[]) : null
  return { envoi, prospect: objet(prospect) ? (prospect as unknown as Candidat & { id?: string }) : null, historique }
}

async function lignesAApprouver(magasin: MagasinFacteur, limite: number): Promise<LigneEnvoi[]> {
  const brut = await magasin.envoisAApprouver(limite)
  const sortie: LigneEnvoi[] = []
  for (const b of Array.isArray(brut) ? brut : []) { const l = await normaliser(magasin, b); if (l) sortie.push(l) }
  return sortie
}

const technologieDuProspect = (p: Candidat | null) => p?.technologie ?? p?.formulaire?.technologie ?? undefined

/** Ce que `peutEnvoyer` juge d'un envoi : le prospect donne la technologie et la source. */
function candidatEnvoi(e: EnvoiPrepare, p: Candidat | null) {
  return { canal: e.canal, type: e.type, modele_id: e.modele_id, technologie: technologieDuProspect(p), source: p?.source }
}

// ── Le travail du juge (l'usine le lit) ───────────────────────────────────────────────────────────────────────────────────
export interface EnvoiATravail {
  id: string
  canal: string
  type: string
  modele_id: string
  texte: string
  empreinte: string
}
export interface TravailDuJuge {
  envois: EnvoiATravail[]
}
const versTravail = (e: { id: string; canal?: string; type?: string; modele_id?: string; texte: string }): EnvoiATravail => ({
  id: e.id, canal: String(e.canal ?? ''), type: String(e.type ?? ''), modele_id: String(e.modele_id ?? ''), texte: e.texte, empreinte: sha256(e.texte),
})

/**
 * Les envois `prepare`, tous canaux (`formulaire_site` compris), avec leur texte exact et son empreinte ; rien d'autre (ni
 * adresse, ni fait, ni référence). Un envoi que l'état du moment empêche déjà de partir (froid fermé, canal coupé, notice
 * périmée, technologie en pause) n'est pas rendu : le juger coûterait un appel de modèle pour rien, il sera jugé quand
 * l'état changera.
 */
export async function travailDuJuge(magasin: MagasinFacteur, limite: number, maintenant: number = Date.now()): Promise<TravailDuJuge> {
  const lignes = await lignesAApprouver(magasin, LECTURE_MAX)
  let etat: EtatEnvoi | null = null
  try { etat = await magasin.etatEnvoi() } catch { etat = null }
  const envois: EnvoiATravail[] = []
  for (const l of lignes) {
    if (envois.length >= Math.max(0, limite)) break
    if (etat) {
      const v = peutEnvoyer(etat, candidatEnvoi(l.envoi, l.prospect), maintenant)
      if (!v.ok && MOTIFS_QUI_ATTENDENT.has(v.raison)) continue
    }
    envois.push(versTravail(l.envoi))
  }
  return { envois }
}

/**
 * Le rejugement du soir : une fois par jour de Paris, seulement à partir de 20 h, l'échantillon d'un envoi sur dix (la base
 * le tire, 0111). `[]` ensuite, et avant 20 h. Le curseur du jour n'est posé que si l'échantillon n'est pas vide.
 */
export async function travailDuSoir(magasin: MagasinFacteur, horloge: Horloge): Promise<TravailDuJuge> {
  const maintenant = horloge.maintenant()
  const heure = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hour12: false }).format(new Date(maintenant)))
  if (!(heure >= 20)) return { envois: [] }
  const jour = jourParis(maintenant)
  if ((await magasin.curseurLire(CURSEUR_REJUGE_SERVI)) === jour) return { envois: [] }
  const echantillon = await magasin.echantillonDuSoir(jour)
  const envois = (Array.isArray(echantillon) ? echantillon : []).filter((e) => objet(e) && typeof e.id === 'string' && typeof e.texte === 'string').slice(0, JUGES_MAX_PAR_PASSAGE).map(versTravail)
  await magasin.curseurPoser(CURSEUR_REJUGE_SERVI, jour)
  return { envois }
}

// ── Le second juge, sur l'usine ───────────────────────────────────────────────────────────────────────────────────────────
export interface AvisJ2 {
  envoi_id: string
  empreinte: string
  j2: { verdict: 'ok' | 'refus'; raisons: string[] }
  j2_version: string
  passe?: 'soir'
}
export interface OptionsExecuterJuge {
  travail: TravailDuJuge
  /** Le lecteur de l'usine (`creerLecteur('facteur')`), ou null quand aucun moteur n'y répond : rien n'est alors rendu. */
  lecteur: (((entree: { systeme: string; donnees: unknown }) => Promise<unknown>) & { identite?: string }) | null
  rendre: (avis: AvisJ2) => Promise<unknown>
  /** Un événement sans texte ni donnée personnelle, quand il y a où l'écrire. */
  evenement?: (type: string, resume: string) => Promise<void>
  /** Le juge de ton ; par défaut `jugerTon`. Seul un banc d'essai le remplace (jamais la route ni l'usine). */
  juger?: (entree: { texte: string; canal: string; type: string }, options: { lecteur: LecteurJuge | null | undefined }) => Promise<VerdictTon>
}

/**
 * Pour chaque envoi reçu (20 au plus), `jugerTon(texte)` puis `rendre(avis)`. Pure : aucun réseau ni base ici, le lecteur et le
 * rendu sont injectés. Un lecteur nul ou en échec, ou un second juge non étalonné, ne rend RIEN : l'envoi reste `prepare`,
 * repris au passage suivant. Un refus de ton, lui, est rendu.
 */
export async function executerJuge(options: OptionsExecuterJuge): Promise<AvisJ2[]> {
  const { travail, lecteur, rendre, evenement } = options
  const juger = options.juger ?? jugerTon
  const rendus: AvisJ2[] = []
  const ecrire = async (type: string, resume: string): Promise<void> => { if (evenement) { try { await evenement(type, resume) } catch { /* un événement manqué ne change pas le jugement */ } } }
  if (typeof lecteur !== 'function') { await ecrire('second_juge_indisponible', 'Aucun moteur ne répond : rien n\'est jugé.'); return rendus }
  const adapte: LecteurJuge & { identite?: string } = async (systeme, donnees) => {
    const r = await lecteur({ systeme, donnees })
    return typeof r === 'string' ? r : JSON.stringify(r)
  }
  adapte.identite = lecteur.identite // le second juge compare QUI répond à QUI a été étalonné (026-083)
  const envois = (Array.isArray(travail?.envois) ? travail.envois : []).slice(0, JUGES_MAX_PAR_PASSAGE)
  for (const e of envois) {
    if (!objet(e) || typeof e.texte !== 'string' || typeof e.id !== 'string') continue
    const v = await juger({ texte: e.texte, canal: String(e.canal ?? ''), type: String(e.type ?? '') }, { lecteur: adapte })
    if (v.j2 === 'refus' && v.raisons.some((r) => CODES_FERMETURE.includes(r))) {
      await ecrire(v.raisons.includes('second_juge_non_etalonne') ? 'second_juge_non_etalonne' : 'second_juge_indisponible', 'Le second juge n\'a pas pu juger : rien n\'est rendu.')
      continue
    }
    const avis: AvisJ2 = { envoi_id: e.id, empreinte: typeof e.empreinte === 'string' ? e.empreinte : sha256(e.texte), j2: { verdict: v.j2, raisons: codes(v.raisons) }, j2_version: v.version }
    rendus.push(avis)
    await rendre(avis)
  }
  return rendus
}

// ── Jugement sur Vercel : J3, J1, peutEnvoyer, approbation ─────────────────────────────────────────────────────────────────
export interface DepsAvis {
  magasin: MagasinFacteur
  recuperer: Recuperateur
  horloge: Horloge
  jetonMeta: string | null
  adresseReponse: string | null
  drapeaux: DrapeauxFacteur
  offre: OffreStudio | null
  echeance?: number
}
export type ResultatAvis =
  | { ok: true; statut: 'approuve' | 'annule' | 'attente'; raisons: string[]; j3?: { juge: boolean; refus: string[] } }
  | { ok: false; raison: 'perime'; detail: 'deja_juge' | 'empreinte'; j3?: { juge: boolean; refus: string[] } }

const etatMaquette = (m: MaquetteEtat | null, maintenant: number): EtatMaquette => {
  if (!m) return 'aucune'
  if (m.expire_le) { const t = Date.parse(m.expire_le); if (!Number.isNaN(t) && t <= maintenant) return 'expiree' }
  return m.etat === 'prete' ? 'prete' : 'aucune'
}
const cles = (p: Candidat | null, e: EnvoiPrepare) => ({
  siren: p?.siren ?? null, domaine: p?.domaine ?? null, page_meta: p?.page_meta ?? null, instagram: p?.instagram ?? null,
  ...(e.canal === 'email_sollicite' ? { email: e.destinataire } : {}),
  ...(e.canal === 'reponse_privee' || e.canal === 'messagerie' ? { meta_id: e.destinataire } : {}),
})
const liensDe = (texte: string): string[] => [...texte.matchAll(/https?:\/\/[^\s<>"«»]+/gi)].map((m) => m[0].replace(/[.,;:!?)]+$/, ''))
/** La réponse toute prête d'un envoi `reponse` : retrouvée dans la FAQ par son texte exact (l'envoi ne porte pas son `faq_id`). */
const faqDe = (texte: string, canal: Canal): string | null => FAQ.find((f) => texte.includes(canal === 'email_sollicite' ? f.reponse_email : f.reponse_meta))?.id ?? null

/**
 * L'entrée de J3 pour un envoi lu dans le magasin. `sansSoi` : l'envoi jugé est déjà dans son propre historique (un envoi
 * rejugé le soir est `envoye`) ; il en est retiré pour que J3 ne le compte pas comme un contact précédent.
 */
async function entreeJ3(magasin: MagasinFacteur, l: LigneEnvoi, ctx: { adresse: string; drapeaux: DrapeauxFacteur; offre: OffreStudio | null; maintenant: number; sansSoi: boolean }): Promise<EntreeJuge> {
  const { envoi: e, prospect: p } = l
  let historique: ContactPasse[] = l.historique ?? []
  if (l.historique === null && e.prospect_id) historique = await magasin.historiqueContacts(e.prospect_id)
  if (ctx.sansSoi) historique = historique.filter((h) => h.envoi_id !== e.id)
  return {
    texte: e.texte, sujet: e.objet, modele_id: e.modele_id, type: e.type, canal: e.canal, envoyeur: e.envoyeur, adresse: ctx.adresse, reference: e.reference,
    preuve_demande: e.preuve_demande, formulaire: p?.formulaire ? { longueur_max_message: p.formulaire.longueur_max_message ?? null } : null,
    fait_id: e.fait_id, douleur_id: e.douleur_id, faq_id: e.type === 'reponse' ? faqDe(e.texte, e.canal) : null, liens: liensDe(e.texte),
    prospect: p
      ? { froid: p.froid, source: p.source, metier: p.metier ?? null, faits: p.faits, entreprise: p.entreprise, produit: p.produit ?? null }
      : { froid: false, source: 'entrant', metier: null },
    historique,
    oppose: await magasin.estOppose(cles(p, e)),
    // Les deux réponses dues (STOP, RGPD) sont préparées dès la demande : sa date est celle de la préparation de l'envoi.
    ...(e.type === 'confirmation_stop' ? { opposition_le: (e as { prepare_le?: string }).prepare_le ?? null } : {}),
    ...(e.type === 'reponse_rgpd' ? { demande_rgpd_le: (e as { prepare_le?: string }).prepare_le ?? null } : {}),
    maquette: e.prospect_id ? etatMaquette(await magasin.maquetteDe(e.prospect_id), ctx.maintenant) : 'aucune',
    offre: ctx.offre, drapeaux: ctx.drapeaux, maintenant: ctx.maintenant,
  }
}

const bilanJ3 = (juge: boolean, refus: string[]) => ({ juge, refus })

/**
 * Jugement d'un envoi à partir de l'avis du second juge. Relit l'envoi dans le magasin : plus `prepare`, ou empreinte
 * différente → `perime`, sans rien écrire. Sinon J3 (rejoué sur le texte exact), J1, `peutEnvoyer`, puis `approuverEnvoi`
 * avec les trois verdicts, ou `annulerEnvoi` avec les motifs. Un refus de l'avis, de J3 ou de J1 annule ; J1 injoignable,
 * ou un état qui empêche seulement d'envoyer pour l'instant (froid fermé, canal coupé…), laisse l'envoi `prepare`.
 */
export async function jugerAvecAvis(deps: DepsAvis, avis: AvisJ2): Promise<ResultatAvis> {
  const { magasin, horloge } = deps
  const lignes = await lignesAApprouver(magasin, LECTURE_MAX)
  const ligne = lignes.find((l) => l.envoi.id === avis.envoi_id)
  if (!ligne) return { ok: false, raison: 'perime', detail: 'deja_juge' }
  const { envoi } = ligne
  if (sha256(envoi.texte) !== avis.empreinte) return { ok: false, raison: 'perime', detail: 'empreinte' }

  const maintenant = horloge.maintenant()
  const raisons: string[] = []

  // J3, rejoué sur le texte exact (déterministe).
  const entree = await entreeJ3(magasin, ligne, { adresse: deps.adresseReponse ?? '', drapeaux: deps.drapeaux, offre: deps.offre, maintenant, sansSoi: false })
  const j3 = jugerMessage(entree)
  const refusJ3 = j3.ok ? [] : codes(j3.raisons)
  for (const r of refusJ3) raisons.push(`j3:${r}`)
  // Le second juge (l'usine) : un avis de refus annule ; seul un refus peut venir de l'usine, jamais une approbation forcée.
  if (avis.j2.verdict !== 'ok') for (const r of avis.j2.raisons.length ? avis.j2.raisons : ['refus']) raisons.push(`j2:${String(r).slice(0, 40)}`)
  const j3Bilan = bilanJ3(true, refusJ3)
  if (raisons.length) {
    await magasin.annulerEnvoi(envoi.id, codes(raisons).join(',').slice(0, 200))
    return { ok: true, statut: 'annule', raisons: codes(raisons), j3: j3Bilan }
  }

  // J1 : le fait cité et, pour un formulaire, la page du formulaire (sans_objet hors premier contact).
  let j1: 'ok' | 'sans_objet' = 'sans_objet'
  if (envoi.type === 'premier_contact') {
    if (!ligne.prospect) {
      await magasin.annulerEnvoi(envoi.id, 'j1:prospect_absent')
      return { ok: true, statut: 'annule', raisons: ['j1:prospect_absent'], j3: j3Bilan }
    }
    const v = await verifierAvantEnvoi(envoi, ligne.prospect, { recuperer: deps.recuperer, horloge, echeance: deps.echeance ?? maintenant + 30_000, jetonMeta: deps.jetonMeta })
    if (v.j1 === 'injoignable') return { ok: true, statut: 'attente', raisons: ['j1_injoignable'], j3: j3Bilan }
    if (v.j1 === 'refus') {
      const r = v.raisons.length ? v.raisons.map((x) => `j1:${x}`) : ['j1:refus']
      await magasin.annulerEnvoi(envoi.id, codes(r).join(',').slice(0, 200))
      return { ok: true, statut: 'annule', raisons: codes(r), j3: j3Bilan }
    }
    j1 = v.j1 === 'ok' ? 'ok' : 'sans_objet'
    if (j1 !== 'ok') { await magasin.annulerEnvoi(envoi.id, 'j1:refus'); return { ok: true, statut: 'annule', raisons: ['j1:refus'], j3: j3Bilan } }
  }

  // Les disjoncteurs : l'état du moment (froid fermé, canal coupé, notice périmée…) ou un modèle suspendu.
  const etat = await magasin.etatEnvoi()
  const peut = peutEnvoyer(etat, candidatEnvoi(envoi, ligne.prospect), maintenant)
  if (!peut.ok) {
    if (peut.raison === 'modele_suspendu') {
      await magasin.annulerEnvoi(envoi.id, 'modele_suspendu')
      return { ok: true, statut: 'annule', raisons: ['modele_suspendu'], j3: j3Bilan }
    }
    return { ok: true, statut: 'attente', raisons: [peut.raison], j3: j3Bilan }
  }

  // L'approbation : la seule fonction qui l'écrit (0106) ; la base la refuse sans les trois verdicts.
  const verdicts: Verdicts = { j1, j3: 'ok', j2: 'ok', j2_version: avis.j2_version, raisons: [] }
  const r = await magasin.approuverEnvoi(envoi.id, verdicts)
  if (r.ok) return { ok: true, statut: 'approuve', raisons: [], j3: j3Bilan }
  if (REFUS_BASE_QUI_ATTENDENT.test(r.raison)) return { ok: true, statut: 'attente', raisons: [r.raison], j3: j3Bilan }
  await magasin.annulerEnvoi(envoi.id, `base:${r.raison}`.slice(0, 200))
  return { ok: true, statut: 'annule', raisons: [`base:${r.raison}`.slice(0, 60)], j3: j3Bilan }
}

export type ResultatRejuge =
  | { ok: true; statut: 'confirme' | 'desaccord'; raisons: string[] }
  | { ok: false; raison: 'perime' }

/**
 * Le rejugement du soir d'un envoi déjà parti : rejoue J3 (quand l'échantillon porte l'envoi entier) et confronte l'avis du
 * second juge — rendu par un AUTRE modèle — aux verdicts enregistrés. Un désaccord suspend le modèle de message
 * (`suspendreModele(modele_id, 'rejugement')`) : le suivant est refusé par la base et par `peutEnvoyer`.
 */
export async function rejugerAvecAvis(deps: DepsAvis, avis: AvisJ2): Promise<ResultatRejuge> {
  const { magasin, horloge } = deps
  const maintenant = horloge.maintenant()
  const jour = jourParis(maintenant)
  const echantillon = await magasin.echantillonDuSoir(jour)
  const cible = (Array.isArray(echantillon) ? echantillon : []).find((x) => objet(x) && x.id === avis.envoi_id && typeof x.texte === 'string')
  if (!cible || sha256(cible.texte) !== avis.empreinte) return { ok: false, raison: 'perime' }
  await magasin.curseurPoser(CURSEUR_REJUGE_AVIS, jour)

  const raisons: string[] = []
  if (avis.j2.verdict !== 'ok') for (const r of avis.j2.raisons.length ? avis.j2.raisons : ['refus']) raisons.push(`j2:${String(r).slice(0, 40)}`)
  // J3 rejoué seulement si l'échantillon porte l'envoi entier ; la base ne rend, pour l'instant, que son texte et son modèle.
  const plein = cible as unknown as Partial<EnvoiPrepare>
  if (plein.canal && plein.type && plein.envoyeur && plein.modele_id) {
    const ligne = await normaliser(magasin, cible)
    if (ligne) {
      const j3 = jugerMessage(await entreeJ3(magasin, ligne, { adresse: deps.adresseReponse ?? '', drapeaux: deps.drapeaux, offre: deps.offre, maintenant, sansSoi: true }))
      if (!j3.ok) for (const r of codes(j3.raisons)) raisons.push(`j3:${r}`)
    }
  }
  if (raisons.length === 0) return { ok: true, statut: 'confirme', raisons: [] }
  const modele = String((cible as { modele_id?: unknown }).modele_id ?? '')
  if (modele) await magasin.suspendreModele(modele, 'rejugement')
  return { ok: true, statut: 'desaccord', raisons: codes(raisons) }
}

// ── L'exécution : envoyer, et la passe du soir ────────────────────────────────────────────────────────────────────────────
export interface DepsFacteur {
  magasin: MagasinFacteur
  /** Le porteur Gmail ; null sans les trois variables du Gmail : `en_attente_gmail`, passage réussi. */
  gmail: Porteur | null
  /** Le client Meta ; null sans `META_PAGE_TOKEN` : `en_attente_meta`, passage réussi. */
  meta: EnvoiMeta | null
  horloge: Horloge
  echeance: number
  passe: 'envoi' | 'soir'
  adresseReponse: string | null
  /** Les pages que la passe du soir attend en ligne (`noticeHtml()`, `mentionsHtml()`, 026-039). */
  notice: { html: string; mentions: string }
  /** Le récupérateur de la passe du soir : sans redirection (contrat). Absent : la notice n'est pas vérifiée. */
  recuperer?: Recuperateur
  /** L'adresse de la notice ; par défaut `NOTICE_URL`. */
  noticeUrl?: string | null
}
export interface BilanFacteur {
  etat: 'ok' | 'echeance' | 'pause'
  gmail: 'ok' | 'en_attente_gmail' | 'coupe' | 'arrete'
  meta: 'ok' | 'en_attente_meta' | 'coupe' | 'arrete'
  envoyes: Record<string, number>
  annules: Record<string, number>
  echecs: Record<string, number>
  retenus: Record<string, number>
  /** Les formulaires approuvés restent au porteur de l'usine : le Facteur n'en envoie aucun. */
  formulaires: 'laisses_au_porteur'
  soir?: { palier: boolean; notice: 'verifiee' | 'non_verifiee' | 'sans_adresse' | 'sans_recuperateur' }
}

async function evenement(magasin: Magasin, type: string, resume: string, objetId?: string): Promise<void> {
  try { await magasin.evenement({ agent: AGENT_FACTEUR, type, resume: resume.slice(0, 200), ...(objetId ? { objet_id: objetId } : {}) }) } catch { /* un événement manqué ne change pas l'envoi */ }
}
const futur = (iso: string | null | undefined, ms: number): boolean => !!iso && (iso === 'infinity' || Date.parse(iso) > ms)

/** Un envoi lu comme approuvé : trois verdicts, statut `approuve` quand la base le dit. Sinon rien ne part. */
function approuveVraiment(x: EnvoiApprouve): string | null {
  const brut = x as unknown as { statut?: unknown }
  if (brut.statut !== undefined && brut.statut !== 'approuve') return 'statut'
  const v = x.verdicts
  if (!v || v.j3 !== 'ok' || v.j2 !== 'ok') return 'verdicts'
  if (v.j1 !== 'ok' && !(v.j1 === 'sans_objet' && x.type !== 'premier_contact')) return 'verdicts'
  return null
}

const idsMessage = (v: unknown): string[] => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

/** 0122 : la base prend la tentative avant tout appel externe. Un magasin ancien reste fermé. */
async function reserver(deps: DepsFacteur, bilan: BilanFacteur, x: EnvoiApprouve): Promise<boolean> {
  const { magasin } = deps
  if (typeof magasin.reserverEnvoi !== 'function' || typeof magasin.marquerIncertain !== 'function') {
    compter(bilan.retenus, 'reservation_indisponible'); return false
  }
  const identite = x.destinataire?.trim().toLowerCase() || (x.prospect_id ? `prospect:${x.prospect_id}` : x.conversation_id ? `conversation:${x.conversation_id}` : `envoi:${x.id}`)
  const cle = sha256(`${identite}|${x.modele_id}|${x.fait_id ?? 'sans_fait'}`)
  try {
    const r = await magasin.reserverEnvoi(x.id, cle)
    if (!r.ok) { compter(bilan.retenus, `reservation_${r.raison}`); return false }
    return true
  } catch { compter(bilan.retenus, 'reservation_indisponible'); return false }
}

/** Une issue ambiguë garde sa réservation, même si la base est indisponible : aucun renvoi automatique. */
async function incertain(deps: DepsFacteur, bilan: BilanFacteur, x: EnvoiApprouve, raison: string): Promise<void> {
  try { await deps.magasin.marquerIncertain(x.id, raison) } catch { /* la réservation demeure ; le contrôle des orphelins la reprend */ }
  compter(bilan.retenus, 'envoi_incertain')
  await evenement(deps.magasin, 'envoi_a_reconcilier', 'Issue inconnue : contrôle requis avant toute reprise.', x.id)
}

async function consigner(deps: DepsFacteur, bilan: BilanFacteur, x: EnvoiApprouve, preuve: { id_externe: string; entetes: Record<string, string> }): Promise<void> {
  try { await deps.magasin.marquerEnvoye(x.id, preuve); compter(bilan.envoyes, x.canal) }
  catch { await incertain(deps, bilan, x, 'consignation_indisponible') }
}

async function envoyerGmail(deps: DepsFacteur, bilan: BilanFacteur): Promise<void> {
  const { magasin, gmail, horloge } = deps
  if (!gmail) { bilan.gmail = 'en_attente_gmail'; return }
  let etat = await magasin.etatEnvoi()
  if (futur(etat.gmail_coupe_jusqua, horloge.maintenant())) { bilan.gmail = 'coupe'; return }
  const envois = await magasin.envoisApprouves('email_sollicite', ENVOIS_MAX_PAR_CANAL)
  for (const x of Array.isArray(envois) ? envois : []) {
    if (horloge.maintenant() >= deps.echeance) return
    const refus = approuveVraiment(x)
    if (refus) { compter(bilan.retenus, `non_approuve_${refus}`); await evenement(magasin, 'envoi_non_approuve', `Envoi ${refus === 'statut' ? 'non approuvé' : 'sans ses trois verdicts'} : rien n'est envoyé.`, x.id); continue }
    const peut = peutEnvoyer(etat, { canal: x.canal, type: x.type, modele_id: x.modele_id }, horloge.maintenant())
    if (!peut.ok) { compter(bilan.retenus, peut.raison); continue }
    // Un courriel ne part qu'à qui a écrit : la preuve de demande doit exister (0099 l'a déjà refusé en amont).
    if (!x.preuve_demande) { compter(bilan.retenus, 'preuve_demande_absente'); await evenement(magasin, 'preuve_demande_absente', 'Envoi par courriel sans preuve de demande : rien n\'est envoyé.', x.id); continue }
    const brut = x as unknown as { en_reponse_a?: unknown; references?: unknown; piece_jointe?: { chemin_bucket?: unknown; nom?: unknown } | null }
    const enReponseA = typeof brut.en_reponse_a === 'string' && brut.en_reponse_a ? brut.en_reponse_a : null
    const references = [...new Set([...idsMessage(brut.references), ...(enReponseA ? [enReponseA] : [])])]
    const piece = brut.piece_jointe && typeof brut.piece_jointe.chemin_bucket === 'string' ? { chemin_bucket: brut.piece_jointe.chemin_bucket, nom: String(brut.piece_jointe.nom ?? 'echantillon.mp4') } : undefined
    if (!await reserver(deps, bilan, x)) continue
    let r: Awaited<ReturnType<Porteur['envoyer']>>
    try { r = await gmail.envoyer({ a: x.destinataire, objet: x.objet, texte: x.texte, enReponseA, references, ...(piece ? { pieceJointe: piece } : {}) }) }
    catch { await incertain(deps, bilan, x, 'gmail_exception'); continue }
    if (r.ok) {
      await consigner(deps, bilan, x, { id_externe: r.id_externe, entetes: r.entetes })
      continue
    }
    if (r.erreur === 'injoignable' || (!r.definitif && r.erreur !== 'auth' && r.erreur !== 'quota')) { await incertain(deps, bilan, x, 'gmail_issue_inconnue'); continue }
    if (r.erreur === 'auth' || r.erreur === 'quota') {
      await magasin.marquerEchec(x.id, `gmail_${r.erreur}`)
      await magasin.signal({ type: 'gmail_refus', envoyeur: 'gmail', envoi_id: x.id, modele_id: x.modele_id })
      compter(bilan.echecs, `gmail_${r.erreur}`)
      bilan.gmail = 'arrete'
      return
    }
    await magasin.marquerEchec(x.id, r.erreur === 'refus' ? 'gmail_refus_definitif' : 'gmail_injoignable')
    compter(bilan.echecs, `gmail_${r.erreur}`)
    etat = await magasin.etatEnvoi()
  }
}

/** L'adresse `…/video.mp4` du lien de maquette cité dans un message, ou undefined. */
const videoDuLien = (texte: string): string | undefined => {
  const lien = liensDe(texte).find((l) => /^https:\/\/prestiapp\.fr\/maquette\/[A-Za-z0-9_-]{43}$/.test(l))
  return lien ? `${lien}/video.mp4` : undefined
}

async function envoyerMeta(deps: DepsFacteur, bilan: BilanFacteur): Promise<void> {
  const { magasin, meta, horloge } = deps
  if (!meta) { bilan.meta = 'en_attente_meta'; return }
  const etat = await magasin.etatEnvoi()
  if (futur(etat.meta_coupe_jusqua, horloge.maintenant())) { bilan.meta = 'coupe'; return }
  for (const canal of ['reponse_privee', 'messagerie'] as const) {
    const envois = await magasin.envoisApprouves(canal, ENVOIS_MAX_PAR_CANAL)
    for (const x of Array.isArray(envois) ? envois : []) {
      const maintenant = horloge.maintenant()
      if (maintenant >= deps.echeance) return
      const refus = approuveVraiment(x)
      if (refus) { compter(bilan.retenus, `non_approuve_${refus}`); await evenement(magasin, 'envoi_non_approuve', `Envoi ${refus === 'statut' ? 'non approuvé' : 'sans ses trois verdicts'} : rien n'est envoyé.`, x.id); continue }
      const peut = peutEnvoyer(etat, { canal: x.canal, type: x.type, modele_id: x.modele_id }, maintenant)
      if (!peut.ok) { compter(bilan.retenus, peut.raison); continue }
      const conversation = x.conversation_id ? await magasin.conversation(x.conversation_id) : null
      if (canal === 'reponse_privee') {
        // Un seul message, dans les 7 jours qui suivent le commentaire, et seulement s'il n'y en a pas déjà eu un.
        const jusqua = conversation?.reponse_privee_jusqua ? Date.parse(conversation.reponse_privee_jusqua) : NaN
        const passe: ContactPasse[] = x.prospect_id && typeof magasin.historiqueContacts === 'function' ? await magasin.historiqueContacts(x.prospect_id) : []
        const dejaFaite = passe.some((h) => h.canal === 'reponse_privee' && h.envoi_id !== x.id && h.statut === 'envoye')
        if (!conversation?.commentaire_id || !(jusqua > maintenant) || dejaFaite) {
          await magasin.annulerEnvoi(x.id, 'fenetre_fermee'); compter(bilan.annules, 'fenetre_fermee'); continue
        }
        if (!await reserver(deps, bilan, x)) continue
        let r: Awaited<ReturnType<EnvoiMeta['reponsePrivee']>>
        try { r = await meta.reponsePrivee({ commentaire_id: conversation.commentaire_id, texte: x.texte }) }
        catch { await incertain(deps, bilan, x, 'meta_exception'); continue }
        if (r.ok) { await consigner(deps, bilan, x, { id_externe: r.id, entetes: {} }); continue }
        if (await raisonMeta(deps, bilan, x, r.raison)) return
        continue
      }
      // messagerie : la fenêtre de 24 h après un message de la personne.
      const jusqua = conversation?.fenetre_jusqua ? Date.parse(conversation.fenetre_jusqua) : NaN
      if (!(jusqua > maintenant)) {
        await magasin.annulerEnvoi(x.id, 'fenetre_fermee'); compter(bilan.annules, 'fenetre_fermee'); continue
      }
      const video = x.type === 'lien_maquette' ? videoDuLien(x.texte) : undefined
      if (!await reserver(deps, bilan, x)) continue
      let r: Awaited<ReturnType<EnvoiMeta['message']>>
      try { r = await meta.message({ meta_id: x.destinataire, texte: x.texte, ...(video ? { video_url: video } : {}) }) }
      catch { await incertain(deps, bilan, x, 'meta_exception'); continue }
      if (r.ok) { await consigner(deps, bilan, x, { id_externe: r.id, entetes: {} }); continue }
      if (await raisonMeta(deps, bilan, x, r.raison)) return
    }
  }
}

/** Une erreur de Meta : true quand la boucle s'arrête (politique, débit) ; sinon l'envoi est annulé ou compté en échec. */
async function raisonMeta(deps: DepsFacteur, bilan: BilanFacteur, x: EnvoiApprouve, raison: 'politique' | 'debit' | 'fenetre_fermee' | 'autre'): Promise<boolean> {
  const { magasin } = deps
  if (raison === 'politique') { await magasin.marquerEchec(x.id, 'meta_politique'); await magasin.signal({ type: 'erreur_meta_politique', envoi_id: x.id, modele_id: x.modele_id }); compter(bilan.echecs, 'meta_politique'); bilan.meta = 'arrete'; return true }
  if (raison === 'debit') { await magasin.marquerEchec(x.id, 'meta_debit'); await magasin.signal({ type: 'erreur_meta_debit', envoi_id: x.id, modele_id: x.modele_id }); compter(bilan.echecs, 'meta_debit'); bilan.meta = 'arrete'; return true }
  if (raison === 'fenetre_fermee') { await magasin.annulerEnvoi(x.id, 'fenetre_fermee'); compter(bilan.annules, 'fenetre_fermee'); return false }
  await incertain(deps, bilan, x, 'meta_autre')
  compter(bilan.echecs, 'meta_autre')
  return false
}

async function passeDuSoir(deps: DepsFacteur, bilan: BilanFacteur): Promise<void> {
  const { magasin, horloge } = deps
  const maintenant = horloge.maintenant()
  const jour = jourParis(maintenant)
  const soir: NonNullable<BilanFacteur['soir']> = { palier: false, notice: 'non_verifiee' }
  bilan.soir = soir

  // (1) Le rejugement de la veille : servi à l'usine mais sans avis reçu → un événement, une seule fois.
  try {
    const servi = await magasin.curseurLire(CURSEUR_REJUGE_SERVI)
    const recu = await magasin.curseurLire(CURSEUR_REJUGE_AVIS)
    if (servi && servi !== jour && recu !== servi) await evenement(magasin, 'rejuge_indisponible', 'Le rejugement du soir n\'a reçu aucun avis de l\'usine.')
  } catch { /* la lecture d'un curseur ne bloque pas le reste de la passe */ }

  // (2) Le palier : la base évalue les fenêtres et le fait monter ou descendre.
  if (typeof magasin.palierEvaluer === 'function') {
    try { await magasin.palierEvaluer(); soir.palier = true } catch { await evenement(magasin, 'palier_non_evalue', 'L\'évaluation du palier a échoué.') }
  } else await evenement(magasin, 'palier_non_evalue', 'Aucune évaluation du palier branchée.')

  // (3) La notice : les deux pages en ligne, à l'empreinte attendue, sans suivre de redirection.
  const base = deps.noticeUrl !== undefined ? deps.noticeUrl : NOTICE_URL
  if (!base) { soir.notice = 'sans_adresse'; await evenement(magasin, 'notice_non_verifiee', 'Aucune adresse de notice : rien n\'est vérifié.'); return }
  if (typeof deps.recuperer !== 'function') { soir.notice = 'sans_recuperateur'; await evenement(magasin, 'notice_non_verifiee', 'Aucun récupérateur : la notice n\'est pas vérifiée.'); return }
  const racine = base.endsWith('/') ? base : `${base}/`
  const attendu: [string, string][] = [[racine, deps.notice.html], [`${racine}mentions-legales/`, deps.notice.mentions]]
  let conforme = true
  for (const [url, contenu] of attendu) {
    try {
      const page = await deps.recuperer(url, { delaiMs: DELAI_NOTICE_MS, maxOctets: NOTICE_OCTETS_MAX })
      const memeHote = (() => { try { return new URL(page.url_finale || url).host === new URL(racine).host } catch { return false } })()
      if (page.statut !== 200 || !memeHote || !contenu || sha256(String(page.corps ?? '')) !== sha256(contenu)) conforme = false
    } catch { conforme = false }
    if (!conforme) break
  }
  if (!conforme) { await evenement(magasin, 'notice_non_verifiee', 'La notice en ligne ne correspond pas à celle attendue.'); return }
  if (typeof magasin.noticeVerifiee !== 'function') { await evenement(magasin, 'notice_non_verifiee', 'Aucune pose de la vérification branchée.'); return }
  try { await magasin.noticeVerifiee(new Date(maintenant - 5_000).toISOString()); soir.notice = 'verifiee' } catch { await evenement(magasin, 'notice_non_verifiee', 'La vérification de la notice n\'a pas pu être posée.') }
}

/**
 * Un passage du Facteur. `envoi` : envoie par le Gmail et par Meta ce que la base a approuvé (à toute heure : ce sont des
 * messages sollicités ; le froid n'est jamais approuvé tant que `envoi_froid` est fermé) ; les formulaires restent
 * `approuve`, au porteur de l'usine. `soir` (20 h de Paris) : palier, rejugement de la veille, notice. Ne juge rien.
 */
export async function executerFacteur(deps: DepsFacteur): Promise<BilanFacteur> {
  const bilan: BilanFacteur = { etat: 'ok', gmail: 'ok', meta: 'ok', envoyes: {}, annules: {}, echecs: {}, retenus: {}, formulaires: 'laisses_au_porteur' }
  if (deps.passe === 'soir') await passeDuSoir(deps, bilan)
  else {
    await envoyerGmail(deps, bilan)
    await envoyerMeta(deps, bilan)
    if (deps.horloge.maintenant() >= deps.echeance) bilan.etat = 'echeance'
  }
  const n = (t: Record<string, number>): number => Object.values(t).reduce((a, b) => a + b, 0)
  await evenement(deps.magasin, 'bilan', `Passe ${deps.passe} : ${n(bilan.envoyes)} envoyé(s), ${n(bilan.annules)} annulé(s), ${n(bilan.echecs)} échec(s), ${n(bilan.retenus)} retenu(s) ; gmail ${bilan.gmail}, meta ${bilan.meta}, formulaires au porteur.`)
  return bilan
}
