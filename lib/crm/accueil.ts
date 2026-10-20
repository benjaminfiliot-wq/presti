// CRM — l'ACCUEIL VIVANT de l'atelier (drapeau crmAtelierVivant) : la SALLE D'ATTENTE en trois files et l'ARRIVÉE EN DIRECT d'une
// demande. Module pur (aucun réseau, aucune base, aucun envoi) : rejoué par scripts/crm-vivant-qa.mjs.
//
//  • salleAttente(vue)         → trois files calculées des cartes du pipeline DÉJÀ présentes dans la Vue (lib/crm/pipeline.ts) :
//                                « Nouvelles demandes » (étape demande), « Devis en attente du client » (devis_envoye) et
//                                « Signés, à planifier » (signe). Chaque ligne a UNE action, vers un écran qui existe déjà.
//                                Rien n'est inventé : un montant inconnu n'est pas affiché, une relance n'est annoncée que si un
//                                rappel « relancer le devis » est réellement posé.
//  • nouvellesArrivees(a, b)   → les demandes de `b` dont l'identifiant n'était pas dans `a`. Premier chargement (`a` absent) : AUCUNE
//                                arrivée — l'écran n'annonce que ce qui arrive APRÈS son montage.
//  • hauteurChute(a)           → la chute et le rebond du colis qui arrive en 3D (moins de 700 ms), lue par app/crm/atelier/Scene3D.tsx.
import { jourParis } from '../comptaTableau.ts'
import type { Carte } from './pipeline.ts'
import type { Vue } from './vue.ts'

/** Ce que la salle d'attente lit de la Vue : les colonnes du pipeline, les rappels (pour la prochaine relance) et l'instant de la lecture. */
export type EntreeAccueil = Pick<Vue, 'maintenant' | 'pipeline'> & { rappels?: Pick<Vue['rappels'], 'liste' | 'devisARelancer'> }

export type ActionLigne = { libelle: string; href: string }
export type LigneAttente = {
  cle: string
  client: string
  /** Le type de chantier (demande), ou « Devis N° … · objet · montant » (devis envoyé, signé). */
  detail: string
  /** « reçue il y a 2 h », « envoyé il y a 14 jours », « signé hier »… */
  quand: string | null
  /** Devis envoyé : « relance prévue le 12/10 » si un rappel de relance est posé ; null sinon. */
  relance: string | null
  /** UNE action, vers un écran existant (messages, devis, chantiers du CRM). */
  action: ActionLigne
}
export type CleFile = 'nouvelles' | 'devis' | 'signes'
export type FileAttente = { cle: CleFile; titre: string; vide: string; total: number; lignes: LigneAttente[]; reste: number }
export type SalleAttente = { files: FileAttente[]; total: number }

/** Lignes montrées par file : au-delà, « et N autres » (le pipeline les garde toutes). */
export const LIGNES_PAR_FILE = 5

const jourMs = (j: string) => Date.UTC(+j.slice(0, 4), +j.slice(5, 7) - 1, +j.slice(8, 10))
const ecart = (de: string, a: string): number => Math.round((jourMs(a) - jourMs(de)) / 86_400_000)
const frJour = (j: string) => j.split('-').reverse().slice(0, 2).join('/')
const euroTxt = (c: number) => `${(c / 100).toLocaleString('fr-FR', Number.isInteger(c / 100) ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

/** « aujourd’hui », « hier », « il y a 14 jours » pour un JOUR (AAAA-MM-JJ) ; null si le jour n'est pas une date. */
export function ilYaJours(jourFait: string | null | undefined, jour: string): string | null {
  if (!jourFait || !/^\d{4}-\d{2}-\d{2}/.test(jourFait)) return null
  const n = ecart(jourFait.slice(0, 10), jour)
  if (n <= 0) return 'aujourd’hui'
  return n === 1 ? 'hier' : `il y a ${n} jours`
}

/** « à l’instant », « il y a 35 min », « il y a 2 h », puis « hier » / « il y a N jours » (jour de Paris) pour un HORODATAGE ISO. */
export function ilYa(iso: string | null | undefined, maintenantIso: string): string | null {
  if (!iso) return null
  const t = Date.parse(iso), m = Date.parse(maintenantIso)
  if (Number.isNaN(t) || Number.isNaN(m)) return null
  const min = Math.floor((m - t) / 60_000)
  if (min < 2) return 'à l’instant'
  if (min < 60) return `il y a ${min} min`
  if (min < 24 * 60) return `il y a ${Math.floor(min / 60)} h`
  return ilYaJours(jourParis(new Date(t)), jourParis(new Date(m)))
}

const cartesDe = (vue: EntreeAccueil, etape: string): Carte[] => vue.pipeline.colonnes.find((c) => c.etape === etape)?.cartes ?? []
const datePastille = (c: Carte, etape: 'devis' | 'signe'): string | null => c.frise.pastilles.find((p) => p.etape === etape)?.date ?? null
/** « Devis EX-2026-014 » quand le numéro est connu : la pastille de la frise le porte (la carte du pipeline, elle, n'a que l'objet). */
const numeroDevis = (c: Carte): string | null => {
  const l = c.frise.pastilles.find((p) => p.etape === 'devis' || p.etape === 'signe')?.piece?.libelle
  return l && l.startsWith('Devis ') ? l : null
}

/** Les trois files de l'accueil. `jour` : le jour de Paris ; à défaut, celui de la lecture de la Vue. */
export function salleAttente(vue: EntreeAccueil, jour?: string): SalleAttente {
  const auj = jour ?? jourParis(new Date(vue.maintenant))
  const relances = (vue.rappels?.liste ?? []).filter((r) => !r.fait_le && r.type === 'relancer_devis' && !!r.devis_id)
  const adevoir = new Set((vue.rappels?.devisARelancer ?? []).map((d) => d.devisId))

  // — Nouvelles demandes : une demande sans devis (réponse à donner) ou un devis encore en brouillon (le client attend son devis) —
  const nouvelles: LigneAttente[] = cartesDe(vue, 'demande').map((c) => {
    const brouillon = c.objet === 'devis'
    return {
      cle: c.cle, client: c.client ?? 'Client sans nom',
      detail: brouillon ? `${c.titre} · devis en préparation` : c.titre,
      quand: ilYa(c.depuis, vue.maintenant) ? `${brouillon ? 'dossier ouvert' : 'reçue'} ${ilYa(c.depuis, vue.maintenant)}` : null,
      relance: null,
      // « Répondre » ouvre LA conversation de ce prospect (app/plateforme/Conversations.tsx lit `?lead=` et la sélectionne), pas la boîte entière.
      action: brouillon && c.devisId ? { libelle: 'Ouvrir le brouillon', href: `/devis/${c.devisId}` } : { libelle: 'Répondre', href: `/messages?lead=${encodeURIComponent(c.leadId ?? c.id)}` },
    }
  })

  // — Devis en attente du client : numéro, montant TTC s'il est connu, envoyé il y a N jours, prochaine relance —
  const devis: LigneAttente[] = cartesDe(vue, 'devis_envoye').map((c) => {
    const num = numeroDevis(c)
    const envoye = datePastille(c, 'devis')
    const rappel = relances.find((r) => r.devis_id === c.devisId)
    const montant = c.montant && c.montant > 0 ? euroTxt(c.montant) + ' TTC' : null
    const due = !!c.devisId && adevoir.has(c.devisId)
    return {
      cle: c.cle, client: c.client ?? 'Client sans nom',
      detail: [num ?? 'Devis', c.titre !== num ? c.titre : null, montant].filter(Boolean).join(' · '),
      quand: ilYaJours(envoye, auj) ? `envoyé ${ilYaJours(envoye, auj)}` : null,
      relance: rappel ? (rappel.echeance <= auj ? 'relance à faire' : `relance prévue le ${frJour(rappel.echeance)}`) : null,
      action: due ? { libelle: 'Relancer', href: '/crm?vue=tableau' } : { libelle: 'Voir le devis', href: `/devis/${c.devisId ?? ''}` },
    }
  })

  // — Signés, à planifier : le devis est signé, le chantier n'existe pas encore —
  const signes: LigneAttente[] = cartesDe(vue, 'signe').map((c) => {
    const signe = datePastille(c, 'signe')
    const montant = c.montant && c.montant > 0 ? euroTxt(c.montant) + ' TTC' : null
    return {
      cle: c.cle, client: c.client ?? 'Client sans nom',
      detail: [numeroDevis(c), c.titre, montant].filter(Boolean).join(' · '),
      quand: ilYaJours(signe, auj) ? `signé ${ilYaJours(signe, auj)}` : null,
      relance: null,
      action: c.devisId ? { libelle: 'Créer le chantier', href: '/crm?vue=chantiers' } : { libelle: 'Créer le devis', href: `/devis/nouveau?lead=${c.leadId ?? c.id}` },
    }
  })

  const file = (cle: CleFile, titre: string, vide: string, lignes: LigneAttente[]): FileAttente =>
    ({ cle, titre, vide, total: lignes.length, lignes: lignes.slice(0, LIGNES_PAR_FILE), reste: Math.max(0, lignes.length - LIGNES_PAR_FILE) })
  const files = [
    file('nouvelles', 'Nouvelles demandes', 'Aucune nouvelle demande : elles arrivent ici depuis votre page de conversation et votre boîte e-mail.', nouvelles),
    file('devis', 'Devis en attente du client', 'Aucun devis en attente de réponse.', devis),
    file('signes', 'Signés, à planifier', 'Aucun devis signé en attente de chantier.', signes),
  ]
  return { files, total: files.reduce((s, f) => s + f.total, 0) }
}

// ── L'arrivée en direct ──────────────────────────────────────────────────────────────────────────────────────────────────
export type Arrivee = { id: string; client: string | null; type: string }

/** Les demandes de la maquette (DonneesAtelier.demandes : les colis de l'accueil) sous la forme que compare `nouvellesArrivees`. */
export const arriveesDe = (demandes: readonly { id: string; titre: string; client: string | null }[]): Arrivee[] =>
  demandes.map((d) => ({ id: d.id, client: d.client, type: d.titre }))

/**
 * Les demandes arrivées entre deux lectures : celles de `apres` dont l'identifiant n'était pas dans `avant`. `avant` absent (null ou
 * undefined) = premier chargement : rien n'est une arrivée. Une demande qui disparaît ne déclenche rien.
 */
export function nouvellesArrivees(avant: readonly { id: string }[] | null | undefined, apres: readonly Arrivee[]): Arrivee[] {
  if (!avant) return []
  const connues = new Set(avant.map((a) => a.id))
  return apres.filter((a) => !connues.has(a.id))
}

/** « Nouvelle demande : Prospect — Fuite sous évier » (et « (+2 autres) » quand plusieurs arrivent ensemble). */
export function texteArrivee(arrivees: readonly Arrivee[]): string {
  const [a, ...autres] = arrivees
  if (!a) return ''
  const base = `Nouvelle demande : ${a.client?.trim() || 'client sans nom'} — ${a.type}`
  return autres.length ? `${base} (+${autres.length} autre${autres.length > 1 ? 's' : ''})` : base
}

// ── Le colis qui tombe ───────────────────────────────────────────────────────────────────────────────────────────────────
/** Durée de la chute et du rebond d'un colis, en millisecondes (moins de 700 ms : une arrivée, pas un spectacle). */
export const DUREE_CHUTE_MS = 650
/** Hauteur de départ (mètres de maquette) du colis qui arrive. */
export const HAUTEUR_CHUTE = 4
/**
 * Le décalage vertical d'un colis à l'avancement `a` (0 → 1) : il tombe de HAUTEUR_CHUTE jusqu'au sol (60 % du temps, accéléré), rebondit
 * à 0,5 m puis à 0,12 m, et se pose. Toujours ≥ 0 ; 0 à la fin (et au-delà).
 */
export function hauteurChute(a: number): number {
  if (!(a > 0)) return HAUTEUR_CHUTE
  if (a >= 1) return 0
  if (a < 0.6) { const k = a / 0.6; return HAUTEUR_CHUTE * (1 - k * k) }
  if (a < 0.85) return 0.5 * Math.sin(((a - 0.6) / 0.25) * Math.PI)
  return 0.12 * Math.sin(((a - 0.85) / 0.15) * Math.PI)
}
