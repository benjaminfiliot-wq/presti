// lib/sms/envoyer.ts — `envoyerSms` : l'adaptateur, indépendant du fournisseur, À BLANC par défaut (plan du chantier 4 §11, R5 §7.3).
//
// Les portes, DANS L'ORDRE ; la première qui ferme répond, les suivantes ne sont pas lues :
//  1. drapeau `smsClients`, interrupteur `sms_arret`, type en liste fermée, pause générale (lib/agents/sortie.ts) ;
//  2. offre : `peut(plan, 'assistant')` ET le geste de l'artisan (niveau 2) ;
//  3. mobile de métropole, numéro donné pour ce chantier, sans opposition (STOP reçu) ;
//  4. expéditeur : le nom de l'artisan, validé — jamais « Presti » ;
//  5. texte : STOP, GSM-7 pur, un segment, pas de lien, ni montant ni menace ; plage lundi-samedi 8 h-20 h Paris, hors fériés ;
//  6. idempotence, plafonds (10 par artisan, 100 en tout, 8 € HT par jour) et, EN RÉEL SEULEMENT : coût approuvé, fournisseur, disjoncteur.
// FAIL-CLOSED partout : une lecture qui lève, un compteur illisible, une valeur absente ferment la porte. Un envoi `incertain`
// n'est jamais renvoyé. Drapeau baissé : rien du tout (aucune lecture, aucun appel).
//
// `mode: 'blanc'` (le défaut) ne sort JAMAIS : le fournisseur n'est pas appelé, il rend `simule` avec une estimation (segments, coût
// calculé par le code — « inconnu » si le tarif est `null`).
import { actif } from '@/lib/flags'
import { peut } from '@/lib/plans'
import {
  estTypeSms, PLAFOND_ARTISAN_JOUR, PLAFOND_EUROS_HT_JOUR, PLAFOND_TOTAL_JOUR, SEGMENTS_MAX, TEL_SOURCES_ADMISES,
  type DemandeSms, type Estimation, type Fournisseur, type MagasinSms, type Porte, type ResultatSms,
} from './contrat'
import { controlerTexte, mesurer } from './encodage'
import { validerExpediteur } from './expediteur'
import { normaliserMobileMetropole } from './numero'
import { verifierPlage } from './plage'
import { estimerCout, prixValide, SMS_COUT_APPROUVE, TARIFS, type TarifSms } from './tarifs'

export type DepsSms = {
  drapeau?: () => boolean
  /** Lit l'interrupteur `sms_arret` : `true` = arrêt posé. Absent ou qui lève = doute = refus. */
  smsArret?: () => Promise<boolean>
  sortiePermise?: () => Promise<{ permise: boolean }>
  peutOffre?: (plan: string | null | undefined, capacite: 'assistant') => boolean
  magasin?: MagasinSms
  fournisseur?: Fournisseur
  coutApprouve?: number | null
  tarifs?: Readonly<Record<string, TarifSms>>
  /** `true` = ouvert (ça sort mal) : refus. Absent ou qui lève = doute = refus, en réel. */
  disjoncteurOuvert?: () => Promise<boolean>
  maintenant?: () => Date
  delaiFournisseurMs?: number
}

const refus = (porte: Porte, raison: string, cle?: string): ResultatSms => (cle === undefined ? { etat: 'refuse', porte, raison } : { etat: 'refuse', porte, raison, cle })
const chaine = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''

/** Clé d'idempotence : le même objet (rendez-vous, devis, facture), pour le même client et le même type, ne part qu'une fois. */
export const cleIdempotence = (d: Pick<DemandeSms, 'artisanId' | 'clientId' | 'type' | 'reference'>): string => `sms:${d.artisanId}:${d.clientId}:${d.type}:${d.reference}`

async function sortieParDefaut(): Promise<{ permise: boolean }> {
  const { sortiePermise } = await import('@/lib/agents/sortie')
  return sortiePermise()
}

export async function envoyerSms(demande: DemandeSms, deps: DepsSms = {}): Promise<ResultatSms> {
  // ── Porte 1 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  if (!(deps.drapeau ?? (() => actif('smsClients')))()) return refus(1, 'drapeau_baisse')
  if (!demande || typeof demande !== 'object') return refus(1, 'demande_invalide')
  if (![demande.artisanId, demande.clientId, demande.reference].every(chaine)) return refus(1, 'demande_invalide')
  try {
    if (!deps.smsArret) return refus(1, 'interrupteur_doute')
    if ((await deps.smsArret()) !== false) return refus(1, 'sms_arret') // seul `false` exact ouvre
  } catch { return refus(1, 'interrupteur_doute') }
  if (!estTypeSms(demande.type)) return refus(1, 'type_inconnu')
  try {
    const s = await (deps.sortiePermise ?? sortieParDefaut)()
    if (!s || s.permise !== true) return refus(1, 'pause')
  } catch { return refus(1, 'pause_doute') }

  // ── Porte 2 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  if (!(deps.peutOffre ?? peut)(demande.plan, 'assistant')) return refus(2, 'offre')
  if (demande.gesteArtisan !== true) return refus(2, 'geste_absent')

  // ── Porte 3 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const destinataire = normaliserMobileMetropole(demande.telephone)
  if (!destinataire) return refus(3, 'numero_non_mobile_metropole')
  if (!(TEL_SOURCES_ADMISES as readonly unknown[]).includes(demande.telSource)) return refus(3, 'numero_hors_chantier')
  const magasin = deps.magasin
  if (!magasin) return refus(3, 'opposition_doute')
  try {
    if ((await magasin.opposition(destinataire)) !== false) return refus(3, 'opposition') // seul `false` exact ouvre
  } catch { return refus(3, 'opposition_doute') }

  // ── Porte 4 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const exp = validerExpediteur(demande.nomArtisan)
  if (!exp.ok) return refus(4, `expediteur_${exp.raison}`)

  // ── Porte 5 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const refusTexte = controlerTexte(demande.texte, SEGMENTS_MAX)
  if (refusTexte) return refus(5, refusTexte)
  const maintenant = (deps.maintenant ?? (() => new Date()))()
  const plage = verifierPlage(maintenant)
  if (!plage.ok) return refus(5, plage.raison)

  // ── Porte 6 ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  const reel = demande.mode === 'reel'
  const mesure = mesurer(demande.texte)
  const fournisseur = deps.fournisseur
  const tarifs = deps.tarifs ?? TARIFS
  const nomFournisseur = fournisseur?.nom ?? 'sweego'
  const cle = cleIdempotence(demande)
  const cout = estimerCout(nomFournisseur, mesure.segments, tarifs)
  const estimation: Estimation = { segments: mesure.segments, encodage: mesure.encodage, ...cout }

  // Le coût approuvé d'abord, en réel : sans lui, on ne lit même pas le magasin.
  const approuve = deps.coutApprouve === undefined ? SMS_COUT_APPROUVE : deps.coutApprouve
  if (reel) {
    const prixTarif = tarifs[nomFournisseur]?.prixSegmentHt
    if (!prixValide(approuve) || !prixValide(prixTarif)) return refus(6, 'cout_non_approuve')
    if (prixTarif > approuve) return refus(6, 'cout_superieur_a_l_approuve')
    if (!fournisseur) return refus(6, 'fournisseur_absent')
    try {
      if (!deps.disjoncteurOuvert || (await deps.disjoncteurOuvert()) !== false) return refus(6, deps.disjoncteurOuvert ? 'disjoncteur' : 'disjoncteur_doute')
    } catch { return refus(6, 'disjoncteur_doute') }
  }

  // Idempotence et plafonds : lus aussi à blanc (une simulation ne promet pas ce que le réel refuserait).
  try {
    const etat = await magasin.etatDeLaCle(cle)
    if (etat === 'incertain' || etat === 'en_cours') return refus(6, 'incertain_non_renvoye', cle)
    if (etat !== null) return refus(6, 'doublon', cle)
  } catch { return refus(6, 'idempotence_doute', cle) }
  try {
    const c = await magasin.compteursDuJour(demande.artisanId)
    if (![c?.artisan, c?.total, c?.segmentsTotal].every((n) => typeof n === 'number' && Number.isFinite(n) && n >= 0)) return refus(6, 'plafond_doute', cle)
    if (c.artisan + 1 > PLAFOND_ARTISAN_JOUR) return refus(6, 'plafond_artisan', cle)
    if (c.total + 1 > PLAFOND_TOTAL_JOUR) return refus(6, 'plafond_total', cle)
    const prix = prixValide(approuve) ? approuve : prixValide(tarifs[nomFournisseur]?.prixSegmentHt) ? (tarifs[nomFournisseur]?.prixSegmentHt as number) : null
    if (prix !== null && (c.segmentsTotal + mesure.segments) * prix > PLAFOND_EUROS_HT_JOUR) return refus(6, 'plafond_euros', cle)
  } catch { return refus(6, 'plafond_doute', cle) }

  if (!reel) return { etat: 'simule', cle, estimation, expediteur: exp.valeur, destinataire }

  // ── L'envoi réel : réserver la clé AVANT d'appeler, pour qu'un crash ne puisse jamais produire un doublon ─────────────────
  const f = fournisseur as Fournisseur
  try {
    if (!(await magasin.reserver(cle, demande.artisanId, mesure.segments))) return refus(6, 'doublon', cle)
  } catch { return refus(6, 'idempotence_doute', cle) }
  let minuteur: ReturnType<typeof setTimeout> | undefined
  try {
    const delai = new Promise<'delai'>((resolve) => { minuteur = setTimeout(() => resolve('delai'), deps.delaiFournisseurMs ?? 10000) })
    const r = await Promise.race([f.envoyer({ expediteur: exp.valeur, destinataire, texte: demande.texte, cleIdempotence: cle }), delai])
    if (r === 'delai' || !r || typeof r !== 'object') { await magasin.marquer(cle, 'incertain').catch(() => {}); return { etat: 'incertain', cle, raison: 'delai_ou_reponse_illisible' } }
    if (r.etat === 'accepte' && chaine(r.idFournisseur)) { await magasin.marquer(cle, 'envoye', r.idFournisseur).catch(() => {}); return { etat: 'envoye', cle, estimation, idFournisseur: r.idFournisseur } }
    if (r.etat === 'refuse') { await magasin.marquer(cle, 'echec').catch(() => {}); return refus(6, 'fournisseur_refuse', cle) }
    await magasin.marquer(cle, 'incertain').catch(() => {})
    return { etat: 'incertain', cle, raison: 'fournisseur_incertain' }
  } catch {
    await magasin.marquer(cle, 'incertain').catch(() => {}) // le SMS est peut-être parti : la clé reste prise, jamais renvoyé
    return { etat: 'incertain', cle, raison: 'exception_fournisseur' }
  } finally {
    if (minuteur) clearTimeout(minuteur)
  }
}
