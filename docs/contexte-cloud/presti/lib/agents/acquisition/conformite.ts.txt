// lib/agents/acquisition/conformite.ts — J3, le juge de conformité et de promesse (fiche 026-083, écrit par Claude Code).
//
// Déterministe, pur : ni réseau, ni base, ni horloge cachée, aucun import de `@/lib/ai`, `@/lib/agents/llm` ni `@/lib/studio`.
// Règle unique : un message n'est accepté que s'il est EXACTEMENT un modèle approuvé de `modeles.ts`, dont chaque emplacement
// est rempli par une valeur vérifiée (un fait `verifie: 'ok'`, une douleur approuvée du bon métier, l'adresse de prospection,
// `NOTICE_URL`, la référence de l'envoi, un lien de forme connue, l'offre du Studio lue ailleurs). Tout le reste est refusé,
// avec TOUS les motifs qui s'appliquent (jamais un seul : le Facteur les journalise, et l'humain qui relit voit le tout).
//
// Deux couches, volontairement redondantes : (1) le texte est confronté au gabarit du modèle (`hors_modele` s'il diffère d'un
// octet) et chaque valeur d'emplacement est vérifiée selon sa nature ; (2) des détecteurs indépendants regardent le texte brut
// (première phrase, adresse écrite deux fois, lien, prix, promesse, longueur…), de sorte qu'un gabarit trafiqué ne les contourne
// pas. `entree` est de l'aveugle : ce module ne lit jamais la base, il juge ce qu'on lui passe.
import type { Canal, ContactPasse, Envoyeur, Fait, PreuveDemande, Source, TypeEnvoi } from './contrat'
import {
  DELAI_RECONTACT_JOURS, DOMAINE_PRINCIPAL, ECART_MIN_HEURES, MESSAGES_MAX_PAR_PROSPECT, METIERS, MOTS_MAX_FORMULAIRE,
  NOTICE_URL, PREMIERE_PHRASE, RGPD_FENETRE_JOURS, SOURCES_LISTE,
} from './contrat'
import type { ModeleMessage } from './modeles'
import { AMORCES, MODELES, PIED_FORMULAIRE } from './modeles'
import { AFFIRMATIONS_PERMISES, AFFIRMATIONS_RETIREES } from './affirmations'
import { FAQ } from './faq'
import { DOULEURS } from './douleurs'

// ── L'entrée et le verdict ────────────────────────────────────────────────────────────────────────────────────────────────
export interface ProspectJuge {
  /** false pour un proche (`PROCHES`) : ni compté, ni jugé sur les faits. Un entrant (`source: 'entrant'`) n'est pas froid. */
  froid: boolean
  source: Source | string
  metier: string | null
  /** Les faits du prospect (`Candidat.faits`) : la seule base de `fait_id`. */
  faits?: readonly Fait[]
  entreprise?: string | null
  produit?: string | null
}
export type EtatMaquette = 'prete' | 'aucune' | 'expiree' | { etat: string; expire_le?: string | null } | null | undefined
export interface EntreeJuge {
  texte: string
  /** Le champ « Sujet » d'un formulaire (ou l'objet d'un courriel) ; null s'il n'y en a pas. */
  sujet: string | null
  modele_id: string
  /** Le modèle du sujet ; par défaut `sujet_studio_v1` pour `formulaire_studio_v1`, `sujet_formulaire_v1` sinon. */
  sujet_modele_id?: string | null
  type: TypeEnvoi
  canal: Canal
  envoyeur: Envoyeur
  /** L'adresse de prospection (`ACQ_ADRESSE_REPONSE`, lue par la route). */
  adresse: string
  reference: string | null
  preuve_demande: PreuveDemande | null
  formulaire?: { longueur_max_message: number | null } | null
  fait_id?: string | null
  douleur_id?: string | null
  faq_id?: string | null
  /** Les liens que l'appelant a mis dans les emplacements ; le texte fait foi, ce champ n'est qu'une redondance. */
  liens: readonly string[]
  prospect: ProspectJuge
  historique: readonly ContactPasse[]
  oppose: boolean
  opposition_le?: string | null
  demande_rgpd_le?: string | null
  maquette: EtatMaquette
  /** Passé par le Répondeur, qui la lit dans `lib/studio/offre.ts` (jamais importée ici). */
  offre?: { videos: number; prix_texte: string } | null
  drapeaux: { siteAchatPublic: boolean; varianteA: boolean }
  maintenant: string | number
}
export type VerdictConformite = { ok: true } | { ok: false; raisons: string[] }

// ── Constantes du juge ────────────────────────────────────────────────────────────────────────────────────────────────────
const RE_LIEN_MAQUETTE = /^https:\/\/prestiapp\.fr\/maquette\/[A-Za-z0-9_-]{43}$/
const RE_LIEN_RDV = /^https:\/\/prestiapp\.fr\/rendez-vous\/[A-Za-z0-9_-]{43}$/
const RE_LIEN_STUDIO = /^https:\/\/prestiapp\.fr\/studio\/commander\/[A-Za-z0-9_-]{43}$/
const LIEN_ACHAT = 'https://prestiapp.fr/site/acheter'
const LIENS_APRES_OUI: readonly RegExp[] = [RE_LIEN_MAQUETTE, RE_LIEN_RDV, RE_LIEN_STUDIO, /^https:\/\/prestiapp\.fr\/site\/acheter$/]
const LISTE_NOIRE: readonly string[] = ['garanti', 'premier sur Google', 'référencement', 'sans engagement', 'satisfait ou remboursé', '12 mois']
const SITE_LU: readonly string[] = ['site_titre', 'site_h1', 'site_intertitre']
const SITE_AUDIT: readonly string[] = ['site_http', 'site_mobile', 'site_copyright']
const EMPLACEMENTS_LIEN: readonly string[] = ['lien', 'rendez_vous', 'paiement']
const IA = "assistant IA de Presti"
const IDENTITE = 'Benjamin Filiot, Presti'
/** Ces modèles se passent de tout ou partie du pied : voir `exigencesDe`. */
const SANS_STOP: readonly string[] = ['stop_confirmation', 'rep_rgpd_accuse_email', 'rep_rgpd_accuse_meta', 'rep_rgpd_acces_email', 'rep_rgpd_acces_meta', 'rep_rgpd_efface_email', 'rep_rgpd_efface_meta', 'questions_entrant_v2', 'studio_offre_v1']
const SANS_NOTICE: readonly string[] = ['stop_confirmation', 'questions_entrant_v2', 'studio_offre_v1']
/** Le texte de `studio_offre_v1` est fixé mot pour mot par la fiche (phrases d'offre approuvées, sans pied) : il suit `studio_accuse_v1` ou `studio_echantillon_v1` dans le même fil. */
const SANS_IA: readonly string[] = ['studio_offre_v1']
const STATUTS_NON_ENVOYES: readonly string[] = ['annule', 'annulee', 'refuse', 'echec', 'echoue', 'perime', 'prepare']

const echapper = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const sansAccents = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const emplacementsDe = (texte: string): string[] => [...new Set([...texte.matchAll(/\{([a-z_]+)\}/g)].map((m) => m[1]))]
const heuresDepuis = (iso: string | null | undefined, maintenant: number): number | null => {
  if (!iso) return null
  const t = Date.parse(iso)
  return Number.isNaN(t) ? null : (maintenant - t) / 3_600_000
}

// ── Le gabarit : littéraux et emplacements ────────────────────────────────────────────────────────────────────────────────
interface Gabarit { litteraux: string[]; emplacements: string[] }
function decouper(texte: string): Gabarit {
  const morceaux = texte.split(/\{([a-z_]+)\}/)
  const litteraux: string[] = [], emplacements: string[] = []
  morceaux.forEach((m, i) => { if (i % 2 === 0) litteraux.push(m); else emplacements.push(m) })
  return { litteraux, emplacements }
}
const MULTILIGNE: readonly string[] = ['reponse_faq', 'export']
/** Confronte le texte au gabarit ; rend la valeur de chaque emplacement (un emplacement répété doit se répéter à l'identique), ou null. */
function confronter(gab: Gabarit, texte: string): Record<string, string> | null {
  let src = '^'
  const vus = new Map<string, number>()
  let groupe = 0
  gab.litteraux.forEach((lit, i) => {
    src += echapper(lit)
    if (i < gab.emplacements.length) {
      const nom = gab.emplacements[i]
      const deja = vus.get(nom)
      if (deja !== undefined) src += `\\${deja}`
      else { groupe += 1; vus.set(nom, groupe); src += MULTILIGNE.includes(nom) ? '(\\S(?:[\\s\\S]*?\\S)?)' : '(\\S(?:[^\\n]*?\\S)?)' }
    }
  })
  src += '$'
  const m = new RegExp(src).exec(texte)
  if (!m) return null
  const valeurs: Record<string, string> = {}
  for (const [nom, g] of vus) valeurs[nom] = m[g]
  return valeurs
}
/** Le texte privé de chaque littéral du gabarit (une occurrence chacun) : ce qui reste, ce sont les valeurs d'emplacement et l'ajout éventuel. */
function residu(gab: Gabarit, texte: string): string {
  let r = texte
  for (const lit of gab.litteraux) { if (lit.length >= 2) { const i = r.indexOf(lit); if (i >= 0) r = `${r.slice(0, i)}\n${r.slice(i + lit.length)}` } }
  return r
}

// ── Ce que chaque modèle doit porter (la règle de jugerModele ET de jugerMessage) ─────────────────────────────────────────
interface Exigences { formulaire: boolean; sujet: boolean; ia: boolean; identite: string | null; stop: boolean; notice: boolean }
const estFormulaire = (m: ModeleMessage): boolean => m.canaux.includes('formulaire_site') && m.types.includes('premier_contact')
const estSujet = (m: ModeleMessage): boolean => m.types.includes('sujet')
function exigencesDe(m: ModeleMessage): Exigences {
  if (estSujet(m)) return { formulaire: false, sujet: true, ia: false, identite: null, stop: false, notice: false }
  if (estFormulaire(m)) return { formulaire: true, sujet: false, ia: true, identite: IDENTITE, stop: true, notice: true }
  const courriel = m.canaux.includes('email_sollicite') && !m.canaux.includes('messagerie')
  return {
    formulaire: false,
    sujet: false,
    ia: !SANS_IA.includes(m.id),
    identite: SANS_IA.includes(m.id) ? null : courriel && m.texte.includes(IDENTITE) ? IDENTITE : 'Presti',
    stop: !SANS_STOP.includes(m.id),
    notice: courriel && !SANS_NOTICE.includes(m.id),
  }
}

// ── Détecteurs indépendants du gabarit ────────────────────────────────────────────────────────────────────────────────────
const liensDe = (texte: string): string[] => [...texte.matchAll(/https?:\/\/[^\s<>"«»]+/gi)].map((m) => m[0].replace(/[.,;:!?)]+$/, ''))
const RE_DOMAINE = /\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.(?:[a-z]{2,})\b/i
const RE_PRIX = /€|\beuros?\b|\bprix\b|\btarifs?\b|\/rendez-vous\/|\/site\/acheter|\/studio\/commander|\brendez-vous\b|\bpaiement\b|\bcommander\b/i
const RE_OBJET_TROMPEUR = /^\s*(?:re|ré|fwd?|tr)\s*:|^\s*votre demande|^\s*suite à/i
const MOTS_NOMBRES = /\b(?:deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quinze|vingt|trente|quarante|cinquante|soixante|cent|cents|mille)\b/i

function retirer(texte: string, ...valeurs: (string | null | undefined)[]): string {
  let t = texte
  for (const v of valeurs) if (v) t = t.split(v).join(' ')
  return t
}
function mots(texte: string): number { return texte.split(/\s+/).filter(Boolean).length }
function phrases(texte: string): number { return texte.split(/[.!?]+(?=\s|$)/).map((p) => p.trim()).filter(Boolean).length }

function maquettePrete(m: EtatMaquette, maintenant: number): boolean {
  if (m === 'prete') return true
  if (!m || typeof m !== 'object') return false
  if (m.etat !== 'prete' && m.etat !== 'lien_cree') return false
  if (m.expire_le) { const t = Date.parse(m.expire_le); if (!Number.isNaN(t) && t <= maintenant) return false }
  return true
}

/** La forme d'une amorce de fait, quelle qu'elle soit : la citation ne contient ni « » ni saut de ligne. */
const FORMES_AMORCE: readonly RegExp[] = Object.values(AMORCES).map((a) =>
  new RegExp(`^${echapper(a).split(echapper('{extrait}')).join('[^»\\n]+').split(echapper('{date}')).join('\\d{2}/\\d{2}/\\d{4}')}$`))
const estAmorce = (v: string): boolean => FORMES_AMORCE.some((re) => re.test(v))

/** Le `{fait}` d'un formulaire de site, attendu depuis le fait du prospect (l'extrait peut perdre sa ponctuation finale, rien d'autre). */
function amorceAttendue(fait: Fait): string[] {
  const modele = AMORCES[fait.type]
  if (!modele) return []
  const sans = fait.extrait.replace(/[.!;:]+$/, '')
  return [...new Set([fait.extrait, sans])].map((e) => modele.split('{extrait}').join(e))
}

// ── jugerMessage ──────────────────────────────────────────────────────────────────────────────────────────────────────────
export function jugerMessage(entree: EntreeJuge): VerdictConformite {
  const raisons = new Set<string>()
  const ajouter = (...r: string[]): void => { for (const x of r) raisons.add(x) }
  const fin = (): VerdictConformite => (raisons.size === 0 ? { ok: true } : { ok: false, raisons: [...raisons] })

  const texte = typeof entree?.texte === 'string' ? entree.texte : ''
  const maintenantMs = typeof entree?.maintenant === 'number' ? entree.maintenant : Date.parse(String(entree?.maintenant))
  const modele: ModeleMessage | undefined = Object.prototype.hasOwnProperty.call(MODELES, String(entree?.modele_id)) ? MODELES[entree.modele_id] : undefined
  if (!modele || estSujet(modele)) { ajouter('modele_inconnu'); return fin() }
  const ex = exigencesDe(modele)
  const prospect = entree.prospect ?? { froid: true, source: '', metier: null }
  const froid = prospect.froid === true
  const entrant = prospect.source === 'entrant'
  const formulaire = ex.formulaire
  const gab = decouper(modele.texte)
  const valeurs = confronter(gab, texte)

  // Le modèle : approuvé, du bon canal et du bon type, pour le bon destinataire.
  if (!modele.approuve) ajouter('modele_non_approuve')
  if (!modele.canaux.includes(entree.canal) || !modele.types.includes(entree.type)) ajouter('modele_hors_canal')
  const attendu: Record<string, Envoyeur> = { formulaire_site: 'facteur_usine', email_sollicite: 'gmail', messagerie: 'repondeur', reponse_privee: 'repondeur' }
  if (attendu[entree.canal] && attendu[entree.canal] !== entree.envoyeur) ajouter('modele_hors_canal')
  const modeleEntrant = /^lien_maquette_entrant_/.test(modele.id)
  const modeleFroid = formulaire || /^lien_maquette_(?!entrant_)/.test(modele.id)
  if (modeleEntrant && !entrant) ajouter('modele_hors_canal')
  if (modeleFroid && entrant) ajouter('modele_hors_canal')
  if (modeleEntrant && froid) ajouter('modele_hors_canal')

  if (valeurs === null) ajouter('hors_modele')

  // Preuve d'une demande : un courriel n'écrit qu'à qui l'a demandé (0099).
  if (entree.canal === 'email_sollicite') {
    const p = entree.preuve_demande
    if (!p || (p.type !== 'message_recu' && p.type !== 'case_entrant') || typeof p.id !== 'string' || p.id.length === 0) ajouter('preuve_demande_absente')
  }

  // Le sujet d'un formulaire.
  if (formulaire && entree.sujet !== null && entree.sujet !== undefined) {
    if (RE_OBJET_TROMPEUR.test(entree.sujet)) ajouter('objet_trompeur')
    const idSujet = entree.sujet_modele_id ?? (modele.id === 'formulaire_studio_v1' ? 'sujet_studio_v1' : 'sujet_formulaire_v1')
    const ms: ModeleMessage | undefined = Object.prototype.hasOwnProperty.call(MODELES, idSujet) ? MODELES[idSujet] : undefined
    const vs = ms && estSujet(ms) ? confronter(decouper(ms.texte), entree.sujet) : null
    if (!vs) ajouter('sujet_hors_modele')
    else {
      for (const [nom, v] of Object.entries(vs)) {
        const attendue = nom === 'entreprise' ? prospect.entreprise : nom === 'produit' ? prospect.produit : undefined
        if (v.trim().length === 0 || v.length > 120 || (attendue && v !== attendue)) ajouter('sujet_hors_modele')
      }
    }
    if (DOMAINE_PRINCIPAL && sansAccents(entree.sujet).includes(DOMAINE_PRINCIPAL)) ajouter('domaine_principal')
  }

  // ── Exigences de forme ─────────────────────────────────────────────────────────────────────────────────────────────────
  if (ex.ia && !texte.includes(IA)) ajouter('mention_ia_absente')
  if (ex.identite && !texte.includes(ex.identite)) ajouter('identite_absente')
  const notice = NOTICE_URL
  if (ex.notice) {
    const m = /Vos données : (\S+)/.exec(texte)
    if (notice === null || !m || m[1] !== notice) ajouter('notice_absente')
  }
  if (ex.stop && !formulaire && !/\bSTOP\b/.test(texte)) ajouter('stop_absent')

  if (formulaire) {
    if (!texte.startsWith(`${PREMIERE_PHRASE}\n`)) ajouter('premiere_phrase')
    const adresse = typeof entree.adresse === 'string' ? entree.adresse : ''
    const ecrivez = adresse ? `écrivez à ${adresse}.` : ''
    if (!adresse || !texte.includes(ecrivez) || texte.split(adresse).length - 1 < 2) ajouter('adresse_reponse_absente')
    if (!/^Pour ne plus rien recevoir : écrivez STOP à /m.test(texte)) ajouter('stop_absent')
    // Aucun lien, aucun nom de domaine, hors de la notice et de l'adresse.
    if (RE_DOMAINE.test(retirer(texte, notice, adresse)) || /https?:\/\/|www\./i.test(retirer(texte, notice, adresse))) ajouter('lien_formulaire')
    if (sansAccents(texte).includes(DOMAINE_PRINCIPAL)) ajouter('domaine_principal')
    // Longueur : le champ, puis les mots.
    const max = entree.formulaire?.longueur_max_message
    if (typeof max === 'number' && max > 0 && texte.length > max) ajouter('longueur_champ')
    const piedRendu = PIED_FORMULAIRE
      .replace('{source_liste}', SOURCES_LISTE[prospect.source as Source] ?? '')
      .replace('{notice}', notice ?? '')
      .split('{adresse}').join(adresse)
      .replace('{reference}', entree.reference ?? '')
    if (mots(retirer(texte, piedRendu)) > MOTS_MAX_FORMULAIRE) ajouter('longueur')
    // La référence de l'envoi.
    const ref = /^Réf\. (\S+)$/m.exec(texte)
    if (!ref || !entree.reference || ref[1] !== entree.reference) ajouter('reference_absente')
    // La source de la liste : celle du prospect, et seulement elle.
    const propre = modele.id === 'formulaire_studio_v1' ? 'meta' : String(prospect.source)
    const phrasePropre = SOURCES_LISTE[propre as Source]
    if (modele.id === 'formulaire_studio_v1' && prospect.source !== 'meta') ajouter('source_absente')
    if (!phrasePropre || !texte.includes(phrasePropre)) ajouter('source_absente')
    for (const [src, phrase] of Object.entries(SOURCES_LISTE)) if (src !== propre && phrase && texte.includes(phrase)) ajouter('source_absente')
    // Avant un « oui » : ni prix, ni lien de paiement ou de rendez-vous.
    const hors = retirer(texte, ...DOULEURS.map((d) => d.question), ...(valeurs && valeurs.fait !== undefined && estAmorce(valeurs.fait) ? [valeurs.fait] : []))
    if (RE_PRIX.test(hors)) ajouter('prix_premier_message')
  }
  if (entree.type === 'premier_contact' && sansAccents(texte).includes(DOMAINE_PRINCIPAL)) ajouter('domaine_principal')

  // ── Les valeurs d'emplacement ──────────────────────────────────────────────────────────────────────────────────────────
  const exempts: string[] = [entree.adresse, notice ?? '', entree.reference ?? '']
  if (valeurs) {
    for (const [nom, v] of Object.entries(valeurs)) {
      switch (nom) {
        case 'adresse': if (v !== entree.adresse) ajouter('adresse_reponse_absente'); break
        case 'notice': if (notice === null || v !== notice) ajouter('notice_absente'); break
        case 'reference': if (!entree.reference || v !== entree.reference) ajouter('reference_absente'); break
        case 'source_liste': {
          const propre = modele.id === 'formulaire_studio_v1' ? 'meta' : String(prospect.source)
          if (SOURCES_LISTE[propre as Source] !== v) ajouter('source_absente')
          break
        }
        case 'entreprise': case 'produit': {
          const attendue = nom === 'entreprise' ? prospect.entreprise : prospect.produit
          if (v.trim().length === 0 || v.length > 120 || /https?:\/\/|www\./i.test(v) || (attendue && v !== attendue)) ajouter('hors_modele')
          exempts.push(v)
          break
        }
        case 'lien': if (!RE_LIEN_MAQUETTE.test(v)) ajouter('lien_invalide'); break
        case 'rendez_vous': if (!RE_LIEN_RDV.test(v)) ajouter('lien_invalide'); break
        case 'paiement': if (!LIENS_APRES_OUI.some((re) => re.test(v))) ajouter('lien_invalide'); break
        case 'videos': case 'prix': {
          const o = entree.offre
          if (!o || (nom === 'videos' ? v !== String(o.videos) : v !== o.prix_texte)) ajouter('offre_hors_parametre')
          else exempts.push(v)
          break
        }
        case 'reponse_faq': {
          const f = FAQ.find((x) => x.id === entree.faq_id)
          const reponse = f ? (entree.canal === 'email_sollicite' ? f.reponse_email : f.reponse_meta) : null
          if (reponse === null || v !== reponse) ajouter('hors_modele')
          else if (!f?.approuve) ajouter('modele_non_approuve')
          else exempts.push(v)
          break
        }
        case 'export': if (v.length > 6000) ajouter('hors_modele'); else exempts.push(v); break
        case 'fait': case 'douleur': break
        default: ajouter('hors_modele')
      }
    }
  }
  if (modele.id === 'studio_offre_v1' && !entree.offre) ajouter('offre_hors_parametre')

  // ── Le fait (formulaire de site, prospect froid) ───────────────────────────────────────────────────────────────────────
  if (gab.emplacements.includes('fait')) {
    if (/n['’]a pas de formulaire/i.test(texte)) ajouter('fait_refonte')
    const fait = (prospect.faits ?? []).find((f) => f.id === entree.fait_id)
    if (froid) {
      if (!entree.fait_id || !fait || fait.verifie !== 'ok') ajouter('fait_non_verifie')
    }
    if (fait) {
      if (!SITE_LU.includes(fait.type) && !SITE_AUDIT.includes(fait.type)) ajouter('fait_refonte')
      else if (valeurs && valeurs.fait !== undefined && !amorceAttendue(fait).includes(valeurs.fait)) {
        const modeleAmorce = AMORCES[fait.type] ?? ''
        if (modeleAmorce.includes('{extrait}')) ajouter('extrait_altere'); else ajouter('hors_modele')
      }
    }
    if (valeurs && valeurs.fait !== undefined) exempts.push(...[...valeurs.fait.matchAll(/« ([^»]*) »/g)].map((m) => m[1]))
  }

  // ── La douleur ─────────────────────────────────────────────────────────────────────────────────────────────────────────
  if (gab.emplacements.includes('douleur')) {
    const d = DOULEURS.find((x) => x.id === entree.douleur_id)
    if (!d || !d.approuve) ajouter('douleur_non_approuvee')
    else {
      const metierConnu = METIERS.some((m) => m.id === prospect.metier)
      if (d.metier !== 'tous' && d.metier !== prospect.metier) { ajouter('douleur_non_approuvee'); ajouter('metier_faux') }
      else if (d.metier !== 'tous' && !metierConnu) ajouter('metier_faux')
      if (valeurs && valeurs.douleur !== undefined && valeurs.douleur !== d.question) ajouter('hors_modele')
    }
  }

  // ── La variante A ──────────────────────────────────────────────────────────────────────────────────────────────────────
  if (modele.id === 'formulaire_A_v1') {
    if (!entree.drapeaux?.varianteA || !maquettePrete(entree.maquette, maintenantMs)) ajouter('maquette_absente')
  }

  // ── Les liens ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  const liens = liensDe(retirer(texte, notice))
  if (!formulaire) {
    const permis = modele.liens_permis.length > 0
    for (const l of liens) {
      if (!permis || !LIENS_APRES_OUI.some((re) => re.test(l))) ajouter('lien_invalide')
    }
    if (liens.some((l) => l === LIEN_ACHAT) && entree.drapeaux?.siteAchatPublic !== true) ajouter('lien_ferme')
    if (valeurs && valeurs.paiement === LIEN_ACHAT && entree.drapeaux?.siteAchatPublic !== true) ajouter('lien_ferme')
    if (entree.type === 'premier_contact' && liens.length > 0) ajouter('prix_premier_message')
  }
  exempts.push(...liens)

  // ── Promesse : hors gabarit, hors citation, hors valeurs d'emplacement ─────────────────────────────────────────────────
  {
    const fixes = AFFIRMATIONS_PERMISES.map((a) => a.texte).filter((t) => !t.includes('{'))
    const reponseFaq = ((): string | null => { const f = FAQ.find((x) => x.id === entree.faq_id); return f ? (entree.canal === 'email_sollicite' ? f.reponse_email : f.reponse_meta) : null })()
    // Ce qui reste quand on retire le gabarit : les valeurs d'emplacement (ni la citation, ni la douleur, examinées à part) et tout ajout.
    let reste: string
    if (valeurs) {
      const questionOk = DOULEURS.some((d) => d.question === valeurs.douleur)
      reste = Object.entries(valeurs).filter(([nom, v]) => !(nom === 'fait' && estAmorce(v)) && !(nom === 'douleur' && questionOk)).map(([, v]) => v).join('\n')
      if (valeurs.reponse_faq !== undefined && valeurs.reponse_faq === reponseFaq) reste = reste.split(reponseFaq).join(' ')
    } else reste = residu(gab, texte)
    const analyse = retirer(reste, ...exempts, ...fixes, ...modele.chiffres_justifies)
    const chiffresDouleur = valeurs && DOULEURS.some((d) => d.question === valeurs.douleur) ? valeurs.douleur ?? '' : ''
    if (/%|\d/.test(analyse) || MOTS_NOMBRES.test(analyse) || /%|\d/.test(chiffresDouleur) || MOTS_NOMBRES.test(chiffresDouleur)) ajouter('promesse')
    // La liste noire : le message entier, sauf les littéraux du gabarit, les phrases permises et la citation du site.
    const citations = valeurs?.fait ? [...valeurs.fait.matchAll(/« ([^»]*) »/g)].map((m) => m[1]) : []
    const norme = sansAccents(retirer(valeurs ? texte : texte, ...citations, ...fixes))
    for (const terme of [...LISTE_NOIRE, ...AFFIRMATIONS_RETIREES]) if (norme.includes(sansAccents(terme))) ajouter('promesse')
  }

  // ── Les règles de contact ──────────────────────────────────────────────────────────────────────────────────────────────
  if (entree.oppose) {
    const heuresOpposition = heuresDepuis(entree.opposition_le, maintenantMs)
    const heuresRgpd = heuresDepuis(entree.demande_rgpd_le, maintenantMs)
    const exception1 = entree.type === 'confirmation_stop' && heuresOpposition !== null && heuresOpposition >= 0 && heuresOpposition < 24
    const exception2 = entree.type === 'reponse_rgpd' && heuresRgpd !== null && heuresRgpd >= 0 && heuresRgpd < RGPD_FENETRE_JOURS * 24
    if (!exception1 && !exception2) ajouter('oppose')
  }
  // Les réponses dues (STOP, RGPD) échappent à ces trois règles : jamais un silence sur un refus ou une demande de données.
  if (froid && entree.type !== 'confirmation_stop' && entree.type !== 'reponse_rgpd') {
    const envoyes = (entree.historique ?? []).filter((h) => !STATUTS_NON_ENVOYES.includes(h.statut))
    if (envoyes.length >= MESSAGES_MAX_PAR_PROSPECT) ajouter('trop_de_messages')
    // L'écart de 72 h vaut pour ce que Presti initie (premier contact, relance) : le lien qui suit un « oui » répond à une demande.
    const dernier = envoyes.map((h) => Date.parse(h.le)).filter((t) => !Number.isNaN(t)).sort((a, b) => b - a)[0]
    if ((entree.type === 'premier_contact' || entree.type === 'relance') && dernier !== undefined && (maintenantMs - dernier) / 3_600_000 < ECART_MIN_HEURES) ajouter('trop_tot')
    if (entree.type === 'premier_contact') {
      const recent = envoyes.some((h) => h.type === 'premier_contact' && (maintenantMs - Date.parse(h.le)) / 86_400_000 < DELAI_RECONTACT_JOURS)
      if (recent) ajouter('deja_contacte')
    }
  }
  if (entree.type === 'relance') {
    const avantPied = texte.split('\nBenjamin Filiot, Presti.')[0]
    if (phrases(avantPied) > 2) ajouter('longueur')
  }

  return fin()
}

// ── jugerModele : un modèle, avant qu'on le montre à Benj ─────────────────────────────────────────────────────────────────
export function jugerModele(modele: ModeleMessage): VerdictConformite {
  const raisons = new Set<string>()
  const texte = modele?.texte ?? ''
  if (!modele || typeof texte !== 'string' || texte.length === 0) return { ok: false, raisons: ['modele_inconnu'] }
  if (texte.includes('{desinscription}')) raisons.add('hors_modele')
  const ex = exigencesDe(modele)
  const emplacements = emplacementsDe(texte)
  if (ex.sujet) {
    if (/^\s*(?:re|fwd?|tr)\s*:|^\s*votre demande/i.test(texte) || !/^Proposition commerciale : /.test(texte)) raisons.add('objet_trompeur')
    if (/https?:\/\/|www\./i.test(texte)) raisons.add('lien_formulaire')
  } else {
    if (ex.ia && !texte.includes(IA) && !texte.startsWith(PREMIERE_PHRASE)) raisons.add('mention_ia_absente')
    if (ex.identite && !texte.includes(ex.identite)) raisons.add('identite_absente')
    if (ex.stop && !/\bSTOP\b/.test(texte)) raisons.add('stop_absent')
    if (ex.notice && !emplacements.includes('notice')) raisons.add('notice_absente')
  }
  if (ex.formulaire) {
    if (!texte.startsWith(`${PREMIERE_PHRASE}\n`)) raisons.add('premiere_phrase')
    if (texte.split('{adresse}').length - 1 < 2) raisons.add('adresse_reponse_absente')
    if (!texte.includes('Pour ne plus rien recevoir : écrivez STOP à {adresse}.')) raisons.add('stop_absent')
    if (!texte.includes('Réf. {reference}')) raisons.add('reference_absente')
    if (!texte.includes('{source_liste}')) raisons.add('source_absente')
    if (!emplacements.includes('notice')) raisons.add('notice_absente')
    if (emplacements.some((e) => EMPLACEMENTS_LIEN.includes(e))) raisons.add('lien_formulaire')
    if (sansAccents(texte).includes(DOMAINE_PRINCIPAL) || /https?:\/\/|www\./i.test(texte)) raisons.add('domaine_principal')
    if (RE_PRIX.test(texte)) raisons.add('prix_premier_message')
  }
  // Aucun chiffre hors de ceux que le modèle justifie ; les phrases d'offre approuvées et les mentions fixes sont admises.
  if (!ex.sujet) {
    const fixes = AFFIRMATIONS_PERMISES.map((a) => a.texte).filter((t) => !t.includes('{'))
    const analyse = retirer(texte, ...fixes, ...modele.chiffres_justifies, ...emplacements.map((e) => `{${e}}`), PREMIERE_PHRASE, '15 min', 'dans 4 jours', '7 jours', 'Réf. ')
    if (/\d/.test(analyse) || /%/.test(analyse)) raisons.add('promesse')
    for (const terme of [...LISTE_NOIRE, ...AFFIRMATIONS_RETIREES]) if (sansAccents(texte).includes(sansAccents(terme))) raisons.add('promesse')
  }
  return raisons.size === 0 ? { ok: true } : { ok: false, raisons: [...raisons] }
}
