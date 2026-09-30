// lib/agents/acquisition/repondeur.ts — A9, le Répondeur (fiche 026-096) : il prépare la réponse à chaque message classé, dans
// le fil, annoncé comme l'assistant IA de Presti. Il ne compose rien et n'envoie rien.
//
// Il CHOISIT un modèle approuvé de `modeles.ts` selon la classe que le Standard a posée (026-085), le remplit de valeurs
// qui ne viennent jamais du texte de la réponse (le lien de rendez-vous, l'offre, la FAQ approuvée, l'export des données de
// la personne), et le prépare par `magasin.preparerEnvoi`. J3 le juge (ici pour les modèles réels, puis dans le Facteur),
// le Facteur (026-089) l'envoie. Aucun modèle de langage, aucun réseau, aucune variable d'environnement : le monde est
// injecté (`deps`). Syntaxe effaçable seulement (ts-loader) : ni `enum`, ni `namespace`.
//
// Ce que le contrat du magasin (contrat.ts, 026-016) ne permet pas encore — écrit ici pour que la fiche suivante le règle :
//   1. lister les conversations Meta à commentaire « SITE » sans réponse privée : `conversationsPourReponsePrivee` ;
//      absente, la réponse privée n'est pas préparée (bilan `reponses_privees_non_branchees`) ;
//   2. lire le modèle et la preuve de demande du dernier `lien_maquette` : `envoiDeLien` ; sans lui, la relance se rabat sur
//      `exportPersonne(...).envois` (le magasin en mémoire le rend) et, faute d'envois, ne part pas (`relance_sans_envoi`).
import { createHash } from 'node:crypto'
import type {
  Canal, ContactPasse, Conversation, DecisionTranchee, EnvoiPrepare, Envoyeur, Horloge, Magasin, PreuveDemande, ProspectReserve,
  ReponseARepondre, TypeEnvoi,
} from './contrat'
import { DEFAUTS_DECISIONS, NOTICE_URL, OPTIONS_DECISIONS, RELANCE_MAQUETTE_JOURS, REPONSE_DELAI_MIN_MINUTES, REPONSE_PRIVEE_JOURS } from './contrat'
import type { EntreeJuge } from './conformite'
import { jugerMessage } from './conformite'
import { FAQ } from './faq'
import { MODELES } from './modeles'
import { creerJeton as creerJetonReel, expiration, hacherJeton as hacherJetonReel } from './maquettesLien'

const MINUTE_MS = 60_000
const JOUR_MS = 86_400_000
const IA = "assistant IA de Presti"
const LIEN_ACHAT = 'https://prestiapp.fr/site/acheter'
const BASE_RDV = 'https://prestiapp.fr/rendez-vous/'
const BASE_MAQUETTE = 'https://prestiapp.fr/maquette/'
const LIMITE_REPONSES = 20
const LIMITE_RELANCES = 10
const LIMITE_STUDIO = 10
const LIMITE_PRIVEES = 20
/** Modèles qui se passent de la mention IA (le texte de `studio_offre_v1` suit un message qui la porte, 026-083). */
const SANS_MENTION_IA: readonly string[] = ['studio_offre_v1']
const STATUTS_NON_ENVOYES: readonly string[] = ['annule', 'annulee', 'refuse', 'echec', 'echoue', 'perime']
/** Les réponses dues (STOP, RGPD) échappent à la règle des 10 minutes : jamais un silence sur un refus ou une demande de données. */
const CLASSES_SANS_DELAI: ReadonlySet<string> = new Set(['stop', 'rgpd', 'rgpd_acces', 'rgpd_effacement'])
const CLASSES_AVEC_REPONSE: ReadonlySet<string> = new Set(['question', 'prix', 'appel', 'stop', 'rgpd', 'rgpd_acces', 'rgpd_effacement', 'entrant', 'oui'])
const CLASSES_QUESTIONS_ENTRANT: ReadonlySet<string> = new Set(['question', 'prix', 'appel', 'entrant'])

// ── Ce que le Répondeur reçoit ────────────────────────────────────────────────────────────────────────────────────────────
/** Un modèle : les champs de `ModeleMessage` que le Répondeur lit (le juge passe une copie « témoin » plus courte). */
export interface ModeleLu {
  id?: string
  texte: string
  type?: string
  types?: readonly string[]
  canaux?: readonly string[]
  approuve?: boolean
}
export interface FaqLue {
  id: string
  reponse?: string
  reponse_email?: string
  reponse_meta?: string
  approuve?: boolean
}
export interface OffreLue { videos: number; prix_texte: string }
export interface EnvoiDeLien { modele_id: string; texte: string; canal: string; preuve_demande: PreuveDemande | null; id: string }

/** Le magasin, plus les deux lectures que le contrat n'offre pas encore (facultatives : voir l'en-tête). */
export type MagasinRepondeur = Magasin & {
  conversationsPourReponsePrivee?: (jours: number, limite: number) => Promise<Conversation[]>
  envoiDeLien?: (prospectId: string) => Promise<EnvoiDeLien | null>
}

export interface DepsRepondeur {
  magasin: MagasinRepondeur
  horloge: Horloge
  echeance: number
  modeles?: Readonly<Record<string, ModeleLu>>
  faq?: readonly FaqLue[]
  creerJeton?: () => string
  hacherJeton?: (jeton: string) => string
  /** Lu par la route (`actif('siteAchatPublic')`) : le lien de paiement n'est proposé que si la page est ouverte. */
  drapeaux: { siteAchatPublic: boolean }
  /** `ACQ_ADRESSE_REPONSE`, lue par la route ; sert au juge J3 des modèles réels. */
  adresseReponse?: string | null
  /** `lib/studio/offre.ts` (026-166), lue par la route ; absente : aucun `studio_offre_v1`. */
  offre?: OffreLue | null
  lienCommandeStudio?: ((prospect: { id: string; marque_cle: string }) => string) | null
}

export interface BilanRepondeur {
  reponses_privees: number
  reponses: number
  relances: number
  studio: number
  sans_reponse: number
  trop_rapides: number
  refusees: number
  en_attente: number
  modeles_non_approuves: number
  erreurs: number
  reponses_privees_non_branchees: boolean
  arret: 'echeance' | null
  /** Les motifs de refus ou d'attente, comptés (jamais un texte). */
  motifs: Record<string, number>
}

// ── Outils ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
type Objet = Record<string, unknown>
const objet = (x: unknown): Objet | null => (x !== null && typeof x === 'object' ? (x as Objet) : null)
const chaine = (x: unknown): string | null => (typeof x === 'string' && x.trim().length > 0 ? x : null)
const empreinte = (texte: string): string => createHash('sha256').update(texte, 'utf8').digest('hex')
const code = (raison: unknown): string => String(raison ?? 'inconnu').replace(/[^A-Za-z0-9_:-]/g, '').slice(0, 60) || 'inconnu'
const envoye = (statut: string): boolean => !STATUTS_NON_ENVOYES.includes(statut)

interface Contexte { deps: DepsRepondeur; bilan: BilanRepondeur; modeles: Readonly<Record<string, ModeleLu>>; faq: readonly FaqLue[]; reels: boolean; infos: Map<string, Promise<InfoProspect>> }

function compter(bilan: BilanRepondeur, motif: string): void { bilan.motifs[motif] = (bilan.motifs[motif] ?? 0) + 1 }

async function evenement(magasin: Magasin, type: string, resume: string, objetId?: string): Promise<void> {
  try { await magasin.evenement({ agent: 'repondeur', type, resume: resume.slice(0, 200), ...(objetId ? { objet_id: objetId } : {}) }) } catch { /* un événement perdu ne bloque jamais une réponse */ }
}

/** Ce que le Répondeur sait d'un prospect : ce que rend `exportPersonne` (plat en base, imbriqué dans le magasin en mémoire). */
interface InfoProspect {
  entreprise: string | null
  metier: string | null
  commune: string | null
  siren: string | null
  produit: string | null
  cible: string | null
  source: string | null
  canaux: { canal: string; valeur: string }[]
  faits: string[]
  collecte_le: string | null
  dernier_recu_le: string | null
  messages: number | null
  envois: Objet[] | null
  reponses: Objet[] | null
}

async function lireInfo(ctx: Contexte, prospectId: string): Promise<InfoProspect> {
  let p = ctx.infos.get(prospectId)
  if (!p) {
    p = (async () => {
      const brut = objet(await ctx.deps.magasin.exportPersonne(prospectId)) ?? {}
      const b = objet(brut.prospect) ?? brut
      const canaux = (Array.isArray(b.canaux) ? b.canaux : []).map(objet).filter((c): c is Objet => c !== null)
        .filter((c) => chaine(c.canal) && chaine(c.valeur)).map((c) => ({ canal: String(c.canal), valeur: String(c.valeur) }))
      const faits = (Array.isArray(b.faits) ? b.faits : []).map(objet).map((f) => chaine(f?.extrait)).filter((f): f is string => f !== null)
      const envois = Array.isArray(brut.envois) ? brut.envois.map(objet).filter((x): x is Objet => x !== null) : null
      const reponses = Array.isArray(brut.reponses) ? brut.reponses.map(objet).filter((x): x is Objet => x !== null) : null
      const nb = typeof b.messages_echanges === 'number' ? b.messages_echanges : (envois || reponses ? (envois?.length ?? 0) + (reponses?.length ?? 0) : null)
      return {
        entreprise: chaine(b.entreprise), metier: chaine(b.metier), commune: chaine(b.commune), siren: chaine(b.siren),
        produit: chaine(b.produit), cible: chaine(b.cible), source: chaine(b.source), canaux, faits,
        collecte_le: chaine(b.collecte_le) ?? chaine(b.cree_le), dernier_recu_le: chaine(b.dernier_contact_recu_le), messages: nb, envois, reponses,
      }
    })()
    ctx.infos.set(prospectId, p)
  }
  return p
}

/** Les lignes de l'export (RGPD art. 15) : une par donnée gardée, tirées de champs connus, jamais un jeton, un verdict ni un texte. */
function lignesExport(info: InfoProspect): string {
  const propre = (s: string): string => s.replace(/[a-fA-F0-9]{32,}/g, '').replace(/\s+/g, ' ').trim().slice(0, 200)
  const l: string[] = []
  const ajouter = (nom: string, v: string | null): void => { const t = v ? propre(v) : ''; if (t) l.push(`- ${nom} : ${t}`) }
  ajouter('Entreprise', info.entreprise)
  ajouter('SIREN', info.siren)
  ajouter('Commune', info.commune)
  ajouter('Métier', info.metier)
  for (const c of info.canaux) ajouter(`Contact (${c.canal})`, c.valeur)
  for (const f of info.faits.slice(0, 5)) ajouter('Fait lu sur votre site', f)
  ajouter('Première collecte', info.collecte_le)
  ajouter('Dernier message reçu de vous', info.dernier_recu_le)
  if (info.messages !== null) l.push(`- Messages échangés : ${info.messages}`)
  return (l.length > 0 ? l : ['- Aucune donnée personnelle gardée.']).join('\n').slice(0, 5500)
}

// ── Les modèles ───────────────────────────────────────────────────────────────────────────────────────────────────────────
type Forme = 'email' | 'meta'
/** Les identifiants d'un modèle de base : `<base>_email`, `<base>_meta` (modèles réels), puis `<base>_v1`, `<base>_v2`, `<base>`. */
const idsDe = (base: string, forme: Forme): string[] => [`${base}_${forme}`, `${base}_v1`, `${base}_v2`, base]
function trouverModele(modeles: Readonly<Record<string, ModeleLu>>, ids: string[]): { id: string; modele: ModeleLu } | null {
  for (const id of ids) if (Object.prototype.hasOwnProperty.call(modeles, id)) return { id, modele: modeles[id] }
  return null
}

type Resolveur = (nom: string) => Promise<string | null>

/** Remplit un gabarit ; `{ manque }` dit le premier emplacement sans valeur. La valeur est posée telle quelle (aucun `$` n'est interprété). */
async function remplir(gabarit: string, resoudre: Resolveur): Promise<{ texte: string } | { manque: string }> {
  const valeurs = new Map<string, string>()
  for (const m of gabarit.matchAll(/\{([a-z_]+)\}/g)) {
    const nom = m[1]
    if (valeurs.has(nom)) continue
    const v = await resoudre(nom)
    if (v === null || v.length === 0) return { manque: nom }
    valeurs.set(nom, v)
  }
  return { texte: gabarit.replace(/\{([a-z_]+)\}/g, (_t, nom: string) => valeurs.get(nom) ?? '') }
}

/** Ce que prépare un geste : une préparation acceptée, une réponse à laisser en attente (rien n'est perdu), ou un refus définitif. */
type Issue = { etat: 'ok'; envoi_id: string } | { etat: 'attente'; motif: string } | { etat: 'refus'; motif: string }

interface Demande {
  ids: string[]
  type: TypeEnvoi
  canal: Canal
  envoyeur: Envoyeur
  destinataire: string
  objet: string | null
  prospect_id: string | null
  conversation_id: string | null
  commentaire_id?: string | null
  preuve_demande: PreuveDemande | null
  fil_envoi_id: string | null
  faq_id?: string | null
  resoudre: Resolveur
  piece_jointe?: { chemin_bucket: string; nom: string } | null
  prospect?: InfoProspect | null
}

async function preparer(ctx: Contexte, d: Demande): Promise<Issue> {
  const { deps, modeles } = ctx
  const trouve = trouverModele(modeles, d.ids)
  if (!trouve) return { etat: 'attente', motif: 'modele_absent' }
  const { id: modeleId, modele } = trouve
  if (modele.approuve === false) return { etat: 'attente', motif: 'modele_non_approuve' }
  if (Array.isArray(modele.canaux) && !modele.canaux.includes(d.canal)) return { etat: 'refus', motif: 'modele_hors_canal' }
  if (Array.isArray(modele.types) && !modele.types.includes(d.type)) return { etat: 'refus', motif: 'modele_hors_type' }
  const rempli = await remplir(modele.texte, d.resoudre)
  if ('manque' in rempli) return { etat: 'attente', motif: `emplacement_${code(rempli.manque)}` }
  const texte = rempli.texte
  // La mention IA (AI Act, art. 50) : un modèle qui ne la porte pas n'est pas un modèle approuvé.
  if (!SANS_MENTION_IA.includes(modeleId) && !texte.includes(IA)) return { etat: 'attente', motif: 'modele_non_approuve' }
  if (/\{[a-z_]+\}/.test(texte)) return { etat: 'attente', motif: 'emplacement_vide' }

  if (ctx.reels) {
    const p = d.prospect ?? null
    const entree: EntreeJuge = {
      texte, sujet: d.objet, modele_id: modeleId, type: d.type, canal: d.canal, envoyeur: d.envoyeur, adresse: deps.adresseReponse ?? '',
      reference: null, preuve_demande: d.preuve_demande, faq_id: d.faq_id ?? null, liens: [...texte.matchAll(/https?:\/\/[^\s)]+/g)].map((m) => m[0]),
      prospect: { froid: false, source: p?.source ?? 'ademe_rge', metier: p?.metier ?? null, entreprise: p?.entreprise ?? null, produit: p?.produit ?? null },
      historique: [], oppose: false, maquette: null, offre: deps.offre ?? null,
      drapeaux: { siteAchatPublic: deps.drapeaux.siteAchatPublic, varianteA: false }, maintenant: deps.horloge.maintenant(),
    }
    const v = jugerMessage(entree)
    if (!v.ok) {
      if (v.raisons.includes('modele_non_approuve') || v.raisons.includes('notice_absente')) return { etat: 'attente', motif: v.raisons.includes('notice_absente') ? 'notice_absente' : 'modele_non_approuve' }
      return { etat: 'refus', motif: `j3:${v.raisons.map(code).join(',').slice(0, 100)}` }
    }
  }

  // Sans fil connu, la clé est absente (la base lit null) : jamais un fil inventé.
  const envoi = {
    prospect_id: d.prospect_id, type: d.type, canal: d.canal, envoyeur: d.envoyeur, destinataire: d.destinataire, objet: d.objet, texte,
    empreinte_texte: empreinte(texte), modele_id: modeleId, variante: null, fait_id: null, douleur_id: null,
    ...(d.fil_envoi_id ? { fil_envoi_id: d.fil_envoi_id } : {}),
    conversation_id: d.conversation_id, preuve_demande: d.preuve_demande, reference: null,
    ...(d.commentaire_id ? { commentaire_id: d.commentaire_id } : {}),
    ...(d.piece_jointe ? { piece_jointe: d.piece_jointe } : {}),
  } as unknown as EnvoiPrepare
  const r = await deps.magasin.preparerEnvoi(envoi)
  if (r.ok) return { etat: 'ok', envoi_id: r.id }
  return { etat: 'refus', motif: code(r.raison) }
}

/** Le lien de rendez-vous : un jeton de 43 signes, dont seule l'empreinte est gardée (026-082), valable 21 jours. */
function fabriqueRdv(ctx: Contexte, prospectId: string | null): () => Promise<string | null> {
  let lien: string | null | undefined
  return async () => {
    if (lien !== undefined) return lien
    if (!prospectId) { lien = null; return lien }
    const jeton = (ctx.deps.creerJeton ?? creerJetonReel)()
    await ctx.deps.magasin.creerLienRdv(prospectId, (ctx.deps.hacherJeton ?? hacherJetonReel)(jeton), expiration(ctx.deps.horloge.maintenant()))
    lien = `${BASE_RDV}${jeton}`
    return lien
  }
}

interface Valeurs {
  rdv: () => Promise<string | null>
  paiement?: string | null
  faq?: string | null
  export?: string | null
  lienMaquette?: () => Promise<string | null>
  offre?: OffreLue | null
  info?: InfoProspect | null
}
const resolveur = (ctx: Contexte, v: Valeurs): Resolveur => async (nom) => {
  switch (nom) {
    case 'rendez_vous': case 'lien_rdv': return v.rdv()
    case 'paiement': case 'lien_paiement': return v.paiement !== undefined ? v.paiement : (ctx.deps.drapeaux.siteAchatPublic ? LIEN_ACHAT : null)
    case 'reponse_faq': return v.faq ?? null
    case 'export': return v.export ?? null
    case 'notice': return NOTICE_URL
    case 'lien': case 'lien_maquette': return v.lienMaquette ? v.lienMaquette() : null
    case 'produit': return v.info?.produit ?? v.info?.entreprise ?? null
    case 'entreprise': return v.info?.entreprise ?? null
    case 'metier': return v.info?.metier ?? null
    case 'videos': return v.offre ? String(v.offre.videos) : null
    case 'prix': return v.offre ? v.offre.prix_texte : null
    case 'adresse': return chaine(ctx.deps.adresseReponse)
    default: return null
  }
}

// ── Une réponse reçue ─────────────────────────────────────────────────────────────────────────────────────────────────────
const classeDe = (r: ReponseARepondre): string => String(r.classement?.classe ?? (r as unknown as Objet).classe ?? '')

/** L'envoi d'origine du fil : celui que la réponse cite, sinon le plus récent de nos courriels à ce prospect. */
async function filDe(ctx: Contexte, r: ReponseARepondre): Promise<string | null> {
  if (r.envoi_id) return r.envoi_id
  if (!r.prospect_id) return null
  const h: ContactPasse[] = await ctx.deps.magasin.historiqueContacts(r.prospect_id)
  const courriels = (Array.isArray(h) ? h : []).filter((x) => x.canal === 'email_sollicite' && envoye(String(x.statut)))
  courriels.sort((a, b) => Date.parse(b.le) - Date.parse(a.le))
  return courriels[0]?.envoi_id ?? null
}

async function traiterReponse(ctx: Contexte, r: ReponseARepondre): Promise<void> {
  const { deps, bilan } = ctx
  const magasin = deps.magasin
  const classe = classeDe(r)

  // Les classes sans réponse : rien ne part, et la réponse est rendue traitée pour ne pas revenir.
  if (!CLASSES_AVEC_REPONSE.has(classe)) {
    await magasin.reponseRepondue(r.id, null)
    bilan.sans_reponse++
    return
  }

  const prospectId = r.prospect_id ?? null
  const info = prospectId ? await lireInfo(ctx, prospectId) : null

  // Un « oui » d'un artisan n'est pas ici : le lien et la vidéo partent par la route de l'Atelier (026-097).
  if (classe === 'oui' && info?.cible !== 'marque') return

  // La règle des 10 minutes : la signature d'un répondeur automatique non marqué (RP-12).
  if (!CLASSES_SANS_DELAI.has(classe) && r.notre_dernier_envoi_type === 'reponse' && r.notre_dernier_envoi_le) {
    const ecart = Date.parse(r.recu_le) - Date.parse(r.notre_dernier_envoi_le)
    if (Number.isFinite(ecart) && ecart >= 0 && ecart < REPONSE_DELAI_MIN_MINUTES * MINUTE_MS) {
      await magasin.reponseRepondue(r.id, null)
      bilan.trop_rapides++
      await evenement(magasin, 'reponse_trop_rapide', `Réponse ${r.id} reçue moins de ${REPONSE_DELAI_MIN_MINUTES} min après notre dernière réponse : rien n'est envoyé.`, r.id)
      return
    }
  }

  // Le canal suit le fil.
  const parCourriel = r.canal === 'email_sollicite' || (r.source as string) === 'courriel'
  const parMeta = !parCourriel && (r.canal === 'messagerie' || (r.source as string) === 'meta') && !!r.conversation_id
  let canal: Canal
  let envoyeur: Envoyeur
  let destinataire: string | null = null
  let conversation: Conversation | null = null
  let prospectDeLaConversation: string | null = null
  if (parCourriel) {
    canal = 'email_sollicite'; envoyeur = 'gmail'
    destinataire = info?.canaux.find((c) => c.canal === 'email_sollicite')?.valeur ?? null
  } else if (parMeta) {
    canal = 'messagerie'; envoyeur = 'repondeur'
    conversation = await magasin.conversation(String(r.conversation_id))
    destinataire = chaine(conversation?.meta_id)
    prospectDeLaConversation = conversation?.prospect_id ?? null
  } else {
    await abandonner(ctx, r, 'canal_sans_reponse')
    return
  }
  if (!destinataire) { await abandonner(ctx, r, parCourriel ? 'sans_adresse' : 'meta_id_absent'); return }
  const forme: Forme = parCourriel ? 'email' : 'meta'
  const idProspect = prospectId ?? prospectDeLaConversation
  const infoDuFil = info ?? (idProspect ? await lireInfo(ctx, idProspect) : null)

  const rdv = fabriqueRdv(ctx, idProspect)
  const valeurs: Valeurs = { rdv, info: infoDuFil }
  let ids: string[]
  let type: TypeEnvoi = 'reponse'
  let faqId: string | null = null
  let apres: (() => Promise<void>) | null = null

  if (classe === 'stop') { ids = idsDe('stop_confirmation', forme); type = 'confirmation_stop' }
  else if (classe === 'rgpd') { ids = idsDe('rep_rgpd_accuse', forme); type = 'reponse_rgpd' }
  else if (classe === 'rgpd_effacement') { ids = idsDe('rep_rgpd_efface', forme); type = 'reponse_rgpd' }
  else if (classe === 'rgpd_acces') {
    if (!infoDuFil) { await abandonner(ctx, r, 'rgpd_sans_prospect'); return }
    ids = idsDe('rep_rgpd_acces', forme); type = 'reponse_rgpd'; valeurs.export = lignesExport(infoDuFil)
  } else if (classe === 'oui') {
    // Le Studio (voie gratuite) : une marque qui dit oui reçoit l'accusé et ouvre la séance d'échantillon ; après l'échantillon, l'offre.
    if (!idProspect || !infoDuFil || !parCourriel) { await abandonner(ctx, r, 'studio_sans_courriel'); return }
    const dejaEchantillon = (await magasin.curseurLire(`repondeur_echantillon_envoye_${idProspect}`)) !== null
      || (infoDuFil.envois ?? []).some((e) => e.modele_id === 'studio_echantillon_v1')
    if (dejaEchantillon) {
      const offre = deps.offre ?? null
      let lien: string | null = null
      try { lien = deps.lienCommandeStudio ? deps.lienCommandeStudio({ id: idProspect, marque_cle: cleMarque(infoDuFil, idProspect) }) : null } catch { lien = null }
      if (!offre || !lien) {
        bilan.en_attente++; compter(bilan, 'offre_absente')
        await evenement(magasin, 'offre_absente', "L'offre du Studio ou son lien de commande manque : aucune offre n'est préparée, la réponse reste à traiter.", r.id)
        return
      }
      ids = ['studio_offre_v1']; valeurs.offre = offre; valeurs.paiement = lien
    } else {
      ids = ['studio_accuse_v1']
      apres = async () => {
        await magasin.creerDecision({
          type: 'studio_echantillon', prospect_id: idProspect, reponse_id: r.id,
          resume: "Une marque a répondu oui : déposer l'échantillon vidéo (séance de Claude Code).",
          options: OPTIONS_DECISIONS.studio_echantillon, defaut: DEFAUTS_DECISIONS.studio_echantillon,
          cle_idempotence: `acq:studio_echantillon:${idProspect}`,
        })
      }
    }
  } else {
    // question, prix, appel, entrant
    const faqEntree = classe === 'question' ? ctx.faq.find((f) => f.id === (r.classement?.faq_id ?? (r.classement as unknown as Objet | undefined)?.faq)) : undefined
    const candidat = classe === 'entrant' ? objet(r.classement?.entrant) : null
    const entrantComplet = !!candidat && !!chaine(candidat.metier) && !!chaine(candidat.commune) && !!chaine(candidat.site)
    if (classe === 'entrant' && entrantComplet) { await magasin.reponseRepondue(r.id, null); bilan.sans_reponse++; return }
    if (!idProspect && CLASSES_QUESTIONS_ENTRANT.has(classe)) {
      // Une conversation qui n'est pas encore un prospect reçoit d'abord les questions d'entrant, jamais un lien de rendez-vous.
      ids = ['questions_entrant_v2']
      const cle = `repondeur_questions_${r.conversation_id ?? r.id}`
      if (r.conversation_id && (await magasin.curseurLire(cle)) !== null) {
        await abandonner(ctx, r, 'questions_deja_posees'); return
      }
      apres = async () => { if (r.conversation_id) await magasin.curseurPoser(cle, new Date(deps.horloge.maintenant()).toISOString()) }
    } else if (classe === 'entrant') { ids = ['questions_entrant_v2'] }
    else if (classe === 'appel') ids = idsDe('rep_appel', forme)
    else if (classe === 'prix') ids = idsDe(deps.drapeaux.siteAchatPublic ? 'rep_prix' : 'rep_prix_rdv', forme)
    else if (faqEntree && faqEntree.approuve !== false) {
      ids = idsDe('rep_faq', forme); faqId = faqEntree.id
      valeurs.faq = (forme === 'email' ? faqEntree.reponse_email : faqEntree.reponse_meta) ?? faqEntree.reponse ?? null
    } else ids = idsDe('rep_appel', forme)
  }

  const preuve: PreuveDemande | null = parCourriel ? { type: 'message_recu', id: r.id } : null
  const objetRecu = chaine((r as unknown as Objet).objet)
  const sujet = parCourriel ? `Re: ${(objetRecu ?? 'votre message').replace(/^\s*(re\s*:\s*)+/i, '').trim().slice(0, 200)}` : null
  const issue = await preparer(ctx, {
    ids, type, canal, envoyeur, destinataire, objet: sujet, prospect_id: idProspect, conversation_id: r.conversation_id ?? null,
    preuve_demande: preuve, fil_envoi_id: parCourriel ? await filDe(ctx, r) : null, faq_id: faqId, resoudre: resolveur(ctx, valeurs), prospect: infoDuFil,
  })
  await conclure(ctx, r, issue, apres)
}

/** Rien ne peut partir pour cette réponse, et il ne faut pas la retenter : elle est rendue traitée, sans envoi. */
async function abandonner(ctx: Contexte, r: ReponseARepondre, motif: string): Promise<void> {
  await ctx.deps.magasin.reponseRepondue(r.id, null)
  ctx.bilan.refusees++; compter(ctx.bilan, motif)
  await evenement(ctx.deps.magasin, 'reponse_abandonnee', `Réponse ${r.id} sans envoi : ${motif}.`, r.id)
}

async function conclure(ctx: Contexte, r: ReponseARepondre, issue: Issue, apres: (() => Promise<void>) | null): Promise<void> {
  const { deps, bilan } = ctx
  const magasin = deps.magasin
  if (issue.etat === 'ok') {
    await magasin.reponseRepondue(r.id, issue.envoi_id)
    bilan.reponses++
    if (apres) await apres()
    return
  }
  if (issue.etat === 'attente') {
    // Benj n'a pas encore approuvé les modèles, ou une valeur manque : rien n'est préparé, la réponse partira ensuite.
    if (issue.motif === 'modele_non_approuve') bilan.modeles_non_approuves++
    bilan.en_attente++; compter(bilan, issue.motif)
    return
  }
  // Refus de J3 ou de la base (dont `quota_reponses`, `fenetre_fermee`) : on ne réessaie pas une réponse refusée.
  await magasin.reponseRepondue(r.id, null)
  bilan.refusees++; compter(bilan, issue.motif)
  await evenement(magasin, 'reponse_refusee', `Réponse ${r.id} refusée : ${issue.motif}.`, r.id)
}

const cleMarque = (info: InfoProspect, prospectId: string): string => {
  const brut = (info.entreprise ?? prospectId).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return (brut || prospectId).slice(0, 80).replace(/[^A-Za-z0-9_-]/g, '-')
}

// ── La réponse privée à un commentaire « SITE » ──────────────────────────────────────────────────────────────────────────
async function reponsesPrivees(ctx: Contexte): Promise<void> {
  const { deps, bilan } = ctx
  const magasin = deps.magasin
  if (typeof magasin.conversationsPourReponsePrivee !== 'function') { bilan.reponses_privees_non_branchees = true; return }
  const liste = await magasin.conversationsPourReponsePrivee(REPONSE_PRIVEE_JOURS, LIMITE_PRIVEES)
  for (const c of Array.isArray(liste) ? liste : []) {
    if (deps.horloge.maintenant() >= deps.echeance) { bilan.arret = 'echeance'; return }
    try {
      const jusqua = c.reponse_privee_jusqua ? Date.parse(c.reponse_privee_jusqua) : NaN
      if (!c.commentaire_id || !c.id || !(jusqua > deps.horloge.maintenant())) continue
      const conversation = c.id ? await magasin.conversation(c.id) : null
      const destinataire = chaine(c.meta_id) ?? chaine(conversation?.meta_id)
      if (!destinataire) { compter(bilan, 'meta_id_absent'); continue }
      const issue = await preparer(ctx, {
        ids: ['questions_entrant_v2'], type: 'reponse', canal: 'reponse_privee', envoyeur: 'repondeur', destinataire, objet: null,
        prospect_id: null, conversation_id: c.id, commentaire_id: c.commentaire_id, preuve_demande: null, fil_envoi_id: null,
        resoudre: resolveur(ctx, { rdv: async () => null }),
      })
      if (issue.etat === 'ok') {
        bilan.reponses_privees++
        await magasin.curseurPoser(`repondeur_questions_${c.id}`, new Date(deps.horloge.maintenant()).toISOString())
      } else if (issue.etat === 'attente') { bilan.en_attente++; compter(bilan, issue.motif); if (issue.motif === 'modele_non_approuve') bilan.modeles_non_approuves++ }
      else { bilan.refusees++; compter(bilan, issue.motif); await evenement(magasin, 'reponse_privee_refusee', `Réponse privée refusée : ${issue.motif}.`) }
    } catch (e) {
      bilan.erreurs++; await evenement(magasin, 'erreur_repondeur', `Réponse privée en erreur (${code((e as Error)?.name)}).`)
    }
  }
}

// ── La seule relance ─────────────────────────────────────────────────────────────────────────────────────────────────────
const ANNONCE = /Sans réponse de votre part/i

async function relances(ctx: Contexte): Promise<void> {
  const { deps, bilan } = ctx
  const magasin = deps.magasin
  const liste: ProspectReserve[] = await magasin.prospectsPourRelance(LIMITE_RELANCES)
  for (const p of Array.isArray(liste) ? liste : []) {
    if (deps.horloge.maintenant() >= deps.echeance) { bilan.arret = 'echeance'; return }
    try {
      const historique = (await magasin.historiqueContacts(p.id)).filter((x) => envoye(String(x.statut)))
      if (historique.some((x) => x.type === 'relance')) continue
      const liens = historique.filter((x) => x.type === 'lien_maquette').sort((a, b) => Date.parse(b.le) - Date.parse(a.le))
      const dernier = liens[0]
      // Un lien parti sur Meta ne se relance jamais : la fenêtre de 24 h est fermée.
      if (!dernier || dernier.canal !== 'email_sollicite') continue
      if (deps.horloge.maintenant() - Date.parse(dernier.le) < RELANCE_MAQUETTE_JOURS * JOUR_MS) continue
      const origine = await origineDuLien(ctx, p.id, dernier.envoi_id)
      if (!origine) { bilan.en_attente++; compter(bilan, 'relance_sans_envoi'); continue }
      // Le modèle du lien doit avoir annoncé la relance.
      if (!ANNONCE.test(origine.texte)) continue
      if (!origine.preuve_demande) { bilan.en_attente++; compter(bilan, 'relance_sans_preuve'); continue }
      const adresse = (p.canaux ?? []).find((c) => c.canal === 'email_sollicite')?.valeur
      if (!adresse) { compter(bilan, 'sans_adresse'); continue }
      const info: InfoProspect | null = null
      const lienMaquette = async (): Promise<string | null> => {
        const m = await magasin.maquetteDe(p.id)
        if (!m || m.etat === 'purgee') return null
        const jeton = (deps.creerJeton ?? creerJetonReel)()
        await magasin.creerLienMaquette(p.id, m.objet ?? m.chemin, (deps.hacherJeton ?? hacherJetonReel)(jeton), expiration(deps.horloge.maintenant()))
        return `${BASE_MAQUETTE}${jeton}`
      }
      const issue = await preparer(ctx, {
        ids: ['relance_oui_v1'], type: 'relance', canal: 'email_sollicite', envoyeur: 'gmail', destinataire: adresse,
        objet: 'Votre maquette', prospect_id: p.id, conversation_id: null, preuve_demande: origine.preuve_demande, fil_envoi_id: origine.id,
        resoudre: resolveur(ctx, { rdv: fabriqueRdv(ctx, p.id), lienMaquette, info }),
        prospect: { entreprise: p.entreprise ?? null, metier: p.metier ?? null, commune: p.commune ?? null, siren: p.siren ?? null, produit: p.produit ?? null, cible: p.cible ?? null, source: p.source ?? null, canaux: [], faits: [], collecte_le: null, dernier_recu_le: null, messages: null, envois: null, reponses: null },
      })
      if (issue.etat === 'ok') bilan.relances++
      else if (issue.etat === 'attente') { bilan.en_attente++; compter(bilan, issue.motif); if (issue.motif === 'modele_non_approuve') bilan.modeles_non_approuves++ }
      else { bilan.refusees++; compter(bilan, issue.motif); await evenement(magasin, 'relance_refusee', `Relance refusée : ${issue.motif}.`, p.id) }
    } catch (e) {
      bilan.erreurs++; await evenement(magasin, 'erreur_repondeur', `Relance en erreur (${code((e as Error)?.name)}).`)
    }
  }
}

/** Le modèle, le texte et la preuve du lien envoyé : la lecture dédiée si le magasin la porte, sinon l'export de la personne. */
async function origineDuLien(ctx: Contexte, prospectId: string, envoiId: string): Promise<EnvoiDeLien | null> {
  const magasin = ctx.deps.magasin
  if (typeof magasin.envoiDeLien === 'function') return magasin.envoiDeLien(prospectId)
  const info = await lireInfo(ctx, prospectId)
  const e = (info.envois ?? []).find((x) => x.id === envoiId)
  if (!e || typeof e.texte !== 'string' || typeof e.modele_id !== 'string') return null
  const preuve = objet(e.preuve_demande)
  return {
    id: envoiId, modele_id: e.modele_id, texte: e.texte, canal: String(e.canal ?? ''),
    preuve_demande: preuve && (preuve.type === 'message_recu' || preuve.type === 'case_entrant') && chaine(preuve.id) ? { type: preuve.type, id: String(preuve.id) } : null,
  }
}

// ── L'échantillon du Studio ──────────────────────────────────────────────────────────────────────────────────────────────
async function echantillons(ctx: Contexte): Promise<void> {
  const { deps, bilan } = ctx
  const magasin = deps.magasin
  const tranchees: DecisionTranchee[] = await magasin.decisionsTranchees('studio_echantillon', LIMITE_STUDIO)
  for (const d of Array.isArray(tranchees) ? tranchees : []) {
    if (d.option !== 'depose') continue
    if (deps.horloge.maintenant() >= deps.echeance) { bilan.arret = 'echeance'; return }
    try {
      const cle = `repondeur_echantillon_${d.id}`
      if ((await magasin.curseurLire(cle)) !== null) continue
      if (!d.prospect_id) { bilan.en_attente++; compter(bilan, 'echantillon_sans_prospect'); continue }
      const info = await lireInfo(ctx, d.prospect_id)
      if ((info.envois ?? []).some((e) => e.modele_id === 'studio_echantillon_v1' && e.statut !== 'annule')) { await magasin.curseurPoser(cle, 'fait'); continue }
      const adresse = info.canaux.find((c) => c.canal === 'email_sollicite')?.valeur
      if (!adresse) { bilan.en_attente++; compter(bilan, 'sans_adresse'); continue }
      // La preuve : le « oui » de la marque.
      const reponseOui = d.reponse_id
        ? { id: d.reponse_id }
        : (info.reponses ?? []).filter((x) => objet(x.classement)?.classe === 'oui' && chaine(x.id)).map((x) => ({ id: String(x.id) })).pop()
      if (!reponseOui) { bilan.en_attente++; compter(bilan, 'echantillon_sans_preuve'); continue }
      const marque = cleMarque(info, d.prospect_id)
      const issue = await preparer(ctx, {
        ids: ['studio_echantillon_v1'], type: 'reponse', canal: 'email_sollicite', envoyeur: 'gmail', destinataire: adresse,
        objet: 'Re: votre accord pour un essai vidéo', prospect_id: d.prospect_id, conversation_id: null,
        preuve_demande: { type: 'message_recu', id: reponseOui.id }, fil_envoi_id: null, resoudre: resolveur(ctx, { rdv: async () => null, info }), prospect: info,
        piece_jointe: { chemin_bucket: `studio/${marque}/echantillon-1.mp4`, nom: 'echantillon-1.mp4' },
      })
      if (issue.etat === 'ok') {
        bilan.studio++
        await magasin.curseurPoser(cle, 'fait')
        await magasin.curseurPoser(`repondeur_echantillon_envoye_${d.prospect_id}`, new Date(deps.horloge.maintenant()).toISOString())
      } else if (issue.etat === 'attente') { bilan.en_attente++; compter(bilan, issue.motif); if (issue.motif === 'modele_non_approuve') bilan.modeles_non_approuves++ }
      else { bilan.refusees++; compter(bilan, issue.motif); await magasin.curseurPoser(cle, 'refuse'); await evenement(magasin, 'echantillon_refuse', `Échantillon refusé : ${issue.motif}.`, d.prospect_id) }
    } catch (e) {
      bilan.erreurs++; await evenement(magasin, 'erreur_repondeur', `Échantillon en erreur (${code((e as Error)?.name)}).`)
    }
  }
}

// ── Le passage ───────────────────────────────────────────────────────────────────────────────────────────────────────────
export async function executerRepondeur(deps: DepsRepondeur): Promise<BilanRepondeur> {
  const bilan: BilanRepondeur = {
    reponses_privees: 0, reponses: 0, relances: 0, studio: 0, sans_reponse: 0, trop_rapides: 0, refusees: 0, en_attente: 0,
    modeles_non_approuves: 0, erreurs: 0, reponses_privees_non_branchees: false, arret: null, motifs: {},
  }
  const ctx: Contexte = {
    deps, bilan, modeles: deps.modeles ?? (MODELES as unknown as Readonly<Record<string, ModeleLu>>), faq: deps.faq ?? (FAQ as unknown as readonly FaqLue[]),
    reels: deps.modeles === undefined, infos: new Map(),
  }
  const magasin = deps.magasin
  const passer = async (nom: string, f: () => Promise<void>): Promise<void> => {
    if (bilan.arret) return
    try { await f() } catch (e) { bilan.erreurs++; await evenement(magasin, 'erreur_repondeur', `${nom} en erreur (${code((e as Error)?.name)}).`) }
  }

  await passer('réponses privées', () => reponsesPrivees(ctx))

  await passer('réponses', async () => {
    const liste: ReponseARepondre[] = await magasin.reponsesARepondre(LIMITE_REPONSES)
    for (const r of Array.isArray(liste) ? liste : []) {
      if (deps.horloge.maintenant() >= deps.echeance) { bilan.arret = 'echeance'; return }
      try { await traiterReponse(ctx, r) } catch (e) {
        bilan.erreurs++
        await evenement(magasin, 'erreur_repondeur', `Réponse ${r.id} en erreur (${code((e as Error)?.name)}) : elle reste à traiter.`, r.id)
      }
    }
  })

  await passer('relances', () => relances(ctx))
  await passer('studio', () => echantillons(ctx))

  const b = bilan
  await evenement(magasin, 'bilan', `Répondeur : ${b.reponses} réponses, ${b.reponses_privees} privées, ${b.relances} relances, ${b.studio} échantillons, ${b.sans_reponse} sans réponse, ${b.trop_rapides} trop rapides, ${b.refusees} refusées, ${b.en_attente} en attente${b.modeles_non_approuves > 0 ? ', modeles_non_approuves' : ''}${b.erreurs > 0 ? `, ${b.erreurs} erreurs` : ''}.`)
  return bilan
}
