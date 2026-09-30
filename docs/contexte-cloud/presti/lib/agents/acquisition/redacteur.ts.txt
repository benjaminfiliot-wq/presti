// lib/agents/acquisition/redacteur.ts — A1, la Plume (fiche 026-087).
//
// Elle écrit pour le Facteur, sans modèle de langage : le texte est un modèle approuvé (`modeles.ts`), rempli par un fait
// vérifié, une douleur approuvée du métier, l'adresse de prospection, la notice et une référence. Elle ne fait partir rien :
// elle PRÉPARE (`preparerEnvoi`) ; le Facteur approuve, le porteur de l'usine soumet le formulaire. Rien n'atteint le magasin
// sans l'accord de `jugerMessage` (J3).
//
// Deux entrées : `executerRedacteur` (les premiers contacts par le formulaire de contact du site, un par entreprise, dans le
// reste du plafond du jour) et `preparerMessageLien` (le message qui suit un « oui », par le Gmail de prospection avec sa
// preuve de demande, ou dans la conversation Meta). Ni réseau, ni modèle de langage, aucune variable d'environnement :
// l'adresse de prospection arrive par `deps`. Syntaxe effaçable seulement (ts-loader) : ni `enum`, ni `namespace`.
import { createHash } from 'node:crypto'
import type {
  Canal, EnvoiPrepare, EtatEnvoi, Fait, Horloge, Magasin, MaquetteEtat, PreuveDemande, ProspectReserve, Source, TypeFait,
} from './contrat'
import { NOTICE_URL, SOURCES_LISTE } from './contrat'
import { jugerMessage } from './conformite'
import type { EntreeJuge, EtatMaquette, VerdictConformite } from './conformite'
import type { Douleur } from './douleurs'
import { DOULEURS } from './douleurs'
import { AMORCES, MODELES } from './modeles'

// ── Les entrées ───────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Un modèle utilisable : le texte est une chaîne, ou (copie d'essai d'un juge) une fonction de la source du prospect. */
export interface ModeleUtilisable {
  id: string
  approuve: boolean
  texte: string | ((source: string | null) => string)
}
export type ModelesUtilisables = Readonly<Record<string, ModeleUtilisable>>
export type DouleursUtilisables = readonly Douleur[]
export interface DrapeauxRedacteur {
  /** La variante A (« j'ai préparé une maquette ») : seulement après le PASS de 025-02 et si la maquette existe. */
  varianteA: boolean
  /** Le lien de paiement est-il public ? Sinon les formes `_rdv`, sans lien de paiement. */
  siteAchatPublic?: boolean
}
export interface DepsRedacteur {
  magasin: Magasin
  horloge: Horloge
  echeance: number
  /** L'adresse de prospection (`ACQ_ADRESSE_REPONSE`, lue par la route, jamais ici). */
  adresseReponse: string
  drapeaux: DrapeauxRedacteur
  modeles?: ModelesUtilisables
  douleurs?: DouleursUtilisables
}
export interface BilanRedacteur {
  etat: 'ok' | 'envoi_froid_ferme' | 'en_attente_adresse' | 'en_attente_notice' | 'plafond_atteint' | 'echeance'
  perimes: number
  reste_du_jour: number
  premiers_contacts: number
  /** Les prospects sautés, par code : aucun_fait_verifie, aucune_douleur, longueur_champ, ads_archive_non_lue, … */
  sautes: Record<string, number>
  /** Les refus de J3, par code de raison (jamais le texte). */
  refus_juge: Record<string, number>
  /** Les refus de la base (`quota_nouveaux`, `formulaire_deja`, `opposition`, …). */
  refus_base: Record<string, number>
}

const AGENT = 'redacteur' as const
/** Les faits qui parlent de refonte, dans l'ordre : l'audit du site d'abord, puis ce qu'on y lit. */
const ORDRE_FAITS: readonly TypeFait[] = ['site_copyright', 'site_http', 'site_mobile', 'site_h1', 'site_titre', 'site_intertitre']
/** Une citation lue sur le site : au moins 20 signes, pour que le fait se reconnaisse. */
const EXTRAIT_UTILE = 20
const TYPES_CITATION: readonly TypeFait[] = ['site_h1', 'site_titre', 'site_intertitre']
/** Les prospects lus au-delà du reste du jour : un prospect sauté ne doit pas occuper la tête de la file jour après jour. */
const MARGE_LECTURE = 5
const LECTURE_MAX = 200

// ── Petits outils ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const sha256 = (t: string): string => createHash('sha256').update(t, 'utf8').digest('hex')
const compter = (t: Record<string, number>, cle: string): void => { t[cle] = (t[cle] ?? 0) + 1 }
const JOUR_PARIS = new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' })
const jourParis = (ms: number): string => JOUR_PARIS.format(new Date(ms))
const texteDe = (m: ModeleUtilisable, source: string | null): string => (typeof m.texte === 'function' ? m.texte(source) : m.texte)
/** Remplace chaque `{nom}` (toutes ses occurrences) ; `split/join`, jamais `replace` : un `$` de la valeur reste un `$`. */
function remplir(texte: string, valeurs: Readonly<Record<string, string>>): string {
  let t = texte
  for (const [nom, v] of Object.entries(valeurs)) t = t.split(`{${nom}}`).join(v)
  return t
}
const emplacementRestant = (texte: string): boolean => /\{[a-z_]+\}/.test(texte)
/** 6 signes [A-Z0-9] : les 6 derniers chiffres de l'empreinte lue en base 36 (le texte n'entre pas dans le calcul : pas de cercle). */
function referenceDe(prospectId: string, modeleId: string, jour: string, suffixe = ''): string {
  const h = sha256(`${prospectId}:${modeleId}:${jour}${suffixe}`)
  return BigInt(`0x${h}`).toString(36).toUpperCase().slice(-6).padStart(6, '0')
}
const clesDe = (p: { siren?: string | null; domaine?: string | null; page_meta?: string | null; instagram?: string | null }) =>
  ({ siren: p.siren ?? null, domaine: p.domaine ?? null, page_meta: p.page_meta ?? null, instagram: p.instagram ?? null })
async function evenement(magasin: Magasin, type: string, resume: string, objetId?: string): Promise<void> {
  await magasin.evenement({ agent: AGENT, type, resume: resume.slice(0, 200), ...(objetId ? { objet_id: objetId } : {}) })
}
function etatMaquette(m: MaquetteEtat | null, maintenant: number): EtatMaquette {
  if (!m) return 'aucune'
  if (m.expire_le) { const t = Date.parse(m.expire_le); if (!Number.isNaN(t) && t <= maintenant) return 'expiree' }
  return m.etat === 'prete' ? 'prete' : 'aucune'
}
const codes = (v: VerdictConformite): string[] => (v.ok ? [] : v.raisons)
/** Le champ « Sujet » du formulaire, s'il existe. */
const champSujet = (champs: readonly { nom: string; max?: number }[]): { nom: string; max?: number } | undefined =>
  champs.find((c) => /^(sujet|objet|subject)$/i.test(c.nom.trim()))

// ── Le choix du fait et de la douleur ─────────────────────────────────────────────────────────────────────────────────────
/** Un fait d'artisan : le premier type de l'ordre qui en a un, `verifie: 'ok'` ; à égalité de type, l'extrait le plus court d'au moins 20 signes. */
function choisirFait(faits: readonly Fait[]): Fait | null {
  const ok = faits.filter((f) => f.verifie === 'ok')
  for (const type of ORDRE_FAITS) {
    let candidats = ok.filter((f) => f.type === type && !/[«»\r\n]/.test(f.extrait))
    if (TYPES_CITATION.includes(type)) candidats = candidats.filter((f) => f.extrait.length >= EXTRAIT_UTILE)
    candidats.sort((a, b) => a.extrait.length - b.extrait.length || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    if (candidats[0]) return candidats[0]
  }
  return null
}
/** « … » : l'extrait privé de sa ponctuation finale, rien d'autre (la règle de J3). */
function amorceDe(fait: Fait): string | null {
  const modele = AMORCES[fait.type]
  if (!modele) return null
  return modele.split('{extrait}').join(fait.extrait.replace(/[.!;:]+$/, ''))
}
/** La douleur d'indice SHA-256(cle_dedup) mod n parmi les douleurs approuvées du métier : même prospect, même douleur. */
function choisirDouleur(cleDedup: string, metier: string | null | undefined, douleurs: DouleursUtilisables): Douleur | null {
  if (!metier) return null
  const pool = douleurs.filter((d) => d.approuve === true && d.metier === metier)
  if (pool.length === 0) return null
  return pool[Number(BigInt(`0x${sha256(cleDedup)}`) % BigInt(pool.length))] ?? null
}

// ── executerRedacteur ─────────────────────────────────────────────────────────────────────────────────────────────────────
async function preparerUn(
  p: ProspectReserve, deps: DepsRedacteur, ctx: { modeles: ModelesUtilisables; douleurs: DouleursUtilisables; notice: string; adresse: string }, bilan: BilanRedacteur,
): Promise<'prepare' | 'quota' | 'saute'> {
  const { magasin, horloge, drapeaux } = deps
  const saute = async (code: string, resume: string): Promise<'saute'> => {
    compter(bilan.sautes, code)
    await evenement(magasin, code, resume, p.id)
    return 'saute'
  }
  const marque = p.cible === 'marque'
  const formulaire = p.formulaire
  if (!formulaire || !formulaire.url_page) return saute('sans_formulaire', 'Prospect sans page de formulaire : rien de préparé.')
  const maintenant = horloge.maintenant()

  // Le fait.
  let fait: Fait | null
  let amorce: string | null = null
  if (marque) {
    fait = p.faits.find((f) => f.type === 'pub_meta' && f.verifie === 'ok') ?? null
    if (!fait || !p.produit || p.produit.trim().length === 0) return saute('aucun_fait_verifie', 'Marque sans fait pub_meta vérifié ou sans produit.')
  } else {
    fait = choisirFait(p.faits)
    amorce = fait ? amorceDe(fait) : null
    if (!fait || !amorce) return saute('aucun_fait_verifie', 'Aucun fait vérifié qui parle de refonte.')
  }

  // La douleur (artisan seulement).
  let douleur: Douleur | null = null
  if (!marque) {
    douleur = choisirDouleur(p.cle_dedup, p.metier, ctx.douleurs)
    if (!douleur) return saute('aucune_douleur', 'Aucune douleur approuvée pour ce métier.')
  }

  // Le modèle : la marque a le sien ; sinon A seulement drapeau levé ET maquette prête non expirée, sinon B.
  let modeleId = 'formulaire_B_v1'
  if (marque) modeleId = 'formulaire_studio_v1'
  else if (drapeaux.varianteA === true && etatMaquette(await magasin.maquetteDe(p.id), maintenant) === 'prete') modeleId = 'formulaire_A_v1'
  const modele = ctx.modeles[modeleId]
  if (!modele) return saute('modele_inconnu', `Modèle ${modeleId} absent.`)

  // Le sujet, seulement si le formulaire a un champ de sujet.
  let objet: string | null = null
  const sujetId = marque ? 'sujet_studio_v1' : 'sujet_formulaire_v1'
  const champ = champSujet(formulaire.champs)
  if (champ) {
    const ms = ctx.modeles[sujetId] ?? MODELES[sujetId]
    if (!ms || ms.approuve !== true) return saute('modele_non_approuve', `Sujet ${sujetId} non approuvé.`)
    objet = remplir(texteDe(ms, null), { entreprise: p.entreprise, produit: p.produit ?? '' })
    if (typeof champ.max === 'number' && champ.max > 0 && objet.length > champ.max) return saute('longueur_champ', 'Sujet plus long que son champ.')
  }

  // Le texte.
  const jour = jourParis(maintenant)
  const sourcePhrase = SOURCES_LISTE[(marque ? 'meta' : p.source) as Source] ?? ''
  const fabriquer = (reference: string): string => remplir(texteDe(modele, p.source), {
    fait: amorce ?? '', douleur: douleur?.question ?? '', adresse: ctx.adresse, notice: ctx.notice, reference,
    source_liste: sourcePhrase, entreprise: p.entreprise, produit: p.produit ?? '',
  })
  const juger = async (texte: string, reference: string): Promise<VerdictConformite> => {
    const entree: EntreeJuge = {
      texte, sujet: objet, modele_id: modeleId, sujet_modele_id: sujetId, type: 'premier_contact', canal: 'formulaire_site',
      envoyeur: 'facteur_usine', adresse: ctx.adresse, reference, preuve_demande: null,
      formulaire: { longueur_max_message: formulaire.longueur_max_message },
      fait_id: fait?.id ?? null, douleur_id: douleur?.id ?? null, liens: [],
      prospect: { froid: p.froid, source: p.source, metier: p.metier ?? null, faits: p.faits, entreprise: p.entreprise, produit: p.produit ?? null },
      historique: await magasin.historiqueContacts(p.id),
      oppose: await magasin.estOppose(clesDe(p)),
      maquette: etatMaquette(await magasin.maquetteDe(p.id), maintenant),
      drapeaux: { siteAchatPublic: drapeaux.siteAchatPublic === true, varianteA: drapeaux.varianteA === true },
      maintenant,
    }
    return jugerMessage(entree)
  }

  let reference = referenceDe(p.id, modeleId, jour)
  let texte = fabriquer(reference)
  if (emplacementRestant(texte)) return saute('emplacement_non_rempli', 'Un emplacement du modèle reste vide.')
  const max = formulaire.longueur_max_message
  if (typeof max === 'number' && max > 0 && texte.length > max) return saute('longueur_champ', 'Le texte dépasse le champ du formulaire.')

  const verdict = await juger(texte, reference)
  if (!verdict.ok) {
    for (const c of codes(verdict)) compter(bilan.refus_juge, c)
    await evenement(magasin, 'refus_juge', `Refusé par J3 : ${codes(verdict).join(', ')}`, p.id)
    return 'saute'
  }

  const envoi = (ref: string, t: string): EnvoiPrepare => ({
    prospect_id: p.id, type: 'premier_contact', canal: 'formulaire_site', envoyeur: 'facteur_usine', destinataire: formulaire.url_page,
    objet, texte: t, empreinte_texte: sha256(t), modele_id: modeleId, variante: modeleId === 'formulaire_A_v1' ? 'A' : modeleId === 'formulaire_B_v1' ? 'B' : null,
    fait_id: fait?.id ?? null, douleur_id: douleur?.id ?? null, fil_envoi_id: null, conversation_id: null, preuve_demande: null, reference: ref,
  })
  let r = await magasin.preparerEnvoi(envoi(reference, texte))
  if (!r.ok && r.raison === 'reference') {
    // Une référence déjà prise : un second essai (suffixe « :2 »), rejugé, puis on passe.
    reference = referenceDe(p.id, modeleId, jour, ':2')
    texte = fabriquer(reference)
    const v2 = await juger(texte, reference)
    if (!v2.ok) { for (const c of codes(v2)) compter(bilan.refus_juge, c); return 'saute' }
    r = await magasin.preparerEnvoi(envoi(reference, texte))
  }
  if (r.ok) { bilan.premiers_contacts++; return 'prepare' }
  compter(bilan.refus_base, r.raison)
  return r.raison === 'quota_nouveaux' ? 'quota' : 'saute'
}

export async function executerRedacteur(deps: DepsRedacteur): Promise<BilanRedacteur> {
  const { magasin, horloge } = deps
  const modeles: ModelesUtilisables = deps.modeles ?? MODELES
  const douleurs: DouleursUtilisables = deps.douleurs ?? DOULEURS
  const bilan: BilanRedacteur = { etat: 'ok', perimes: 0, reste_du_jour: 0, premiers_contacts: 0, sautes: {}, refus_juge: {}, refus_base: {} }
  const terminer = async (etat: BilanRedacteur['etat']): Promise<BilanRedacteur> => {
    bilan.etat = etat
    const detail = Object.entries({ ...bilan.sautes, ...Object.fromEntries(Object.entries(bilan.refus_juge).map(([k, v]) => [`j3_${k}`, v])), ...Object.fromEntries(Object.entries(bilan.refus_base).map(([k, v]) => [`base_${k}`, v])) })
      .map(([k, v]) => `${k}=${v}`).join(' ')
    await evenement(magasin, 'bilan', `${etat} : ${bilan.premiers_contacts} premier(s) contact(s), périmés ${bilan.perimes}, reste ${bilan.reste_du_jour}${detail ? ` ; ${detail}` : ''}`)
    return bilan
  }

  // Un envoi préparé depuis trop longtemps revient à son étape : un fait se relit avant de partir.
  bilan.perimes = await magasin.perimerEnvois()

  const etat: EtatEnvoi = await magasin.etatEnvoi()
  if (etat.envoi_froid !== true) return terminer('envoi_froid_ferme')
  const adresse = typeof deps.adresseReponse === 'string' ? deps.adresseReponse.trim() : ''
  if (adresse.length === 0) return terminer('en_attente_adresse')
  const notice = NOTICE_URL
  if (notice === null || notice.length === 0) return terminer('en_attente_notice')

  // Le reste du jour : la base fait foi (et refuse d'elle-même le message de trop).
  const plafond = await magasin.plafondDuJour('formulaire_site')
  const faits = await magasin.envoisDuJour('formulaire_site')
  const reste = plafond ? Math.max(0, plafond.nouveaux - faits.nouveaux) : 0
  bilan.reste_du_jour = reste
  if (reste === 0) return terminer('plafond_atteint')

  const ctx = { modeles, douleurs, notice, adresse }
  const lus: ProspectReserve[] = await magasin.prospectsPourPremierContact('formulaire_site', Math.min(LECTURE_MAX, reste + MARGE_LECTURE))
  const permisAdsArchive = etat.ads_archive?.permis === true
  let arret: BilanRedacteur['etat'] = 'ok'
  for (const p of lus) {
    if (bilan.premiers_contacts >= reste) break
    if (horloge.maintenant() >= deps.echeance) { arret = 'echeance'; break }
    // Contre-revue du 25/09 au soir (I5) : la bibliothèque Meta n'est lue qu'une fois ses conditions relues (026-162).
    if (p.source === 'meta' && !permisAdsArchive) {
      compter(bilan.sautes, 'ads_archive_non_lue')
      await evenement(magasin, 'ads_archive_non_lue', 'Prospect issu de la bibliothèque Meta : lecture non permise, sauté.', p.id)
      continue
    }
    const issue = await preparerUn(p, deps, ctx, bilan)
    if (issue === 'quota') break
  }
  return terminer(arret)
}

// ── preparerMessageLien ───────────────────────────────────────────────────────────────────────────────────────────────────
export interface ParamsLien {
  lien: string
  paiement?: string | null
  rendez_vous?: string | null
  /** La fin de validité de la maquette : gardée pour la route, aucun modèle ne l'écrit. */
  date_fin?: string | null
  canal: Extract<Canal, 'email_sollicite' | 'messagerie'>
  /** L'adresse de la personne (`email_sollicite`) ou son identifiant Meta (`messagerie`). */
  destinataire: string
  preuve_demande?: PreuveDemande | null
  fil_envoi_id?: string | null
  conversation_id?: string | null
  adresseReponse: string
  drapeaux: Partial<DrapeauxRedacteur>
}
export interface DepsLien {
  magasin: Magasin
  horloge: Horloge
  modeles?: ModelesUtilisables
  douleurs?: DouleursUtilisables
}
export type ResultatLien = ({ ok: true } & EnvoiPrepare) | { ok: false; raison: string; raisons?: string[] }

/** Les trois questions : entrant ? e-mail ou Meta ? lien de paiement ouvert ? Aucune autre. */
function modeleDuLien(entrant: boolean, courriel: boolean, achatOuvert: boolean): string {
  const base = entrant ? 'lien_maquette_entrant' : 'lien_maquette'
  const forme = courriel ? 'email' : 'meta'
  const version = entrant ? 'v1' : courriel ? 'v2' : 'v1'
  if (achatOuvert) return `${base}_${forme}_${version}`
  return `${base}_${forme}_rdv_v1`
}

export async function preparerMessageLien(prospect: ProspectReserve, params: ParamsLien, deps: DepsLien): Promise<ResultatLien> {
  const { magasin, horloge } = deps
  const modeles: ModelesUtilisables = deps.modeles ?? MODELES
  const canal = params.canal
  if (canal !== 'email_sollicite' && canal !== 'messagerie') return { ok: false, raison: 'canal_invalide' }
  const courriel = canal === 'email_sollicite'

  // Un courriel n'écrit qu'à qui l'a demandé : sans preuve de demande, rien n'est préparé.
  const preuve = params.preuve_demande ?? null
  if (courriel && (!preuve || (preuve.type !== 'message_recu' && preuve.type !== 'case_entrant') || typeof preuve.id !== 'string' || preuve.id.length === 0)) {
    return { ok: false, raison: 'preuve_demande_absente' }
  }

  const achatOuvert = params.drapeaux?.siteAchatPublic === true
  const modeleId = modeleDuLien(prospect.source === 'entrant', courriel, achatOuvert)
  const modele = modeles[modeleId]
  if (!modele) return { ok: false, raison: 'modele_inconnu' }
  if (modele.approuve !== true) return { ok: false, raison: 'modele_non_approuve' }

  const texte = remplir(texteDe(modele, prospect.source), {
    lien: params.lien,
    ...(achatOuvert && params.paiement ? { paiement: params.paiement } : {}),
    ...(params.rendez_vous ? { rendez_vous: params.rendez_vous } : {}),
    ...(NOTICE_URL ? { notice: NOTICE_URL } : {}),
  })
  if (emplacementRestant(texte)) return { ok: false, raison: 'emplacement_non_rempli' }

  const maintenant = horloge.maintenant()
  const envoyeur = courriel ? 'gmail' : 'repondeur'
  const entree: EntreeJuge = {
    texte, sujet: null, modele_id: modeleId, type: 'lien_maquette', canal, envoyeur, adresse: params.adresseReponse, reference: null,
    preuve_demande: preuve, fait_id: null, douleur_id: null,
    liens: [params.lien, ...(achatOuvert && params.paiement ? [params.paiement] : []), ...(params.rendez_vous ? [params.rendez_vous] : [])],
    prospect: { froid: prospect.froid, source: prospect.source, metier: prospect.metier ?? null, faits: prospect.faits, entreprise: prospect.entreprise, produit: prospect.produit ?? null },
    historique: await magasin.historiqueContacts(prospect.id),
    oppose: await magasin.estOppose(clesDe(prospect)),
    maquette: etatMaquette(await magasin.maquetteDe(prospect.id), maintenant),
    drapeaux: { siteAchatPublic: achatOuvert, varianteA: params.drapeaux?.varianteA === true },
    maintenant,
  }
  const verdict = await jugerMessage(entree)
  if (!verdict.ok) return { ok: false, raison: verdict.raisons[0] ?? 'refuse', raisons: verdict.raisons }

  return {
    ok: true, prospect_id: prospect.id, type: 'lien_maquette', canal, envoyeur, destinataire: params.destinataire, objet: null, texte,
    empreinte_texte: sha256(texte), modele_id: modeleId, variante: null, fait_id: null, douleur_id: null,
    fil_envoi_id: params.fil_envoi_id ?? null, conversation_id: params.conversation_id ?? null, preuve_demande: preuve, reference: null,
  }
}
