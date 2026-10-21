// CRM — le POSTE DES ASSISTANTS de l'atelier (drapeau crmAtelierVivant). Module pur (aucun réseau, aucune base, AUCUN envoi) : rejoué
// par scripts/crm-vivant-qa.mjs.
//
// Quatre « assistants » ne font que PRÉPARER : chacun compte ce qui attend la validation de l'artisan, en montre trois éléments au plus
// et renvoie vers l'écran existant où l'artisan agit. Rien ne part sans son clic (mode « assistée » du produit : l'IA propose, l'artisan
// valide). Tout est lu dans la Vue déjà calculée — jamais une seconde écriture d'une règle :
//   • Relanceur de devis : `vue.rappels.devisARelancer` (lib/crm/rappels.ts, devisARelancer : la règle de la tuile « Relances dues ») ;
//   • Encaissement       : factures ÉMISES (pas payées, ni avoirs, ni annulées) dont l'échéance est PASSÉE — `vue.vivant.facturesEmises` ;
//   • Facturation        : dossiers à l'étape « à facturer » dont la facture n'est pas faite (chantier terminé, pas encore facturé) ;
//   • Agenda             : les rappels non faits d'aujourd'hui et en retard (`aFaire`, lib/crm/rappels.ts).
import { centimes, facturesComptees } from '../comptaTableau.ts'
import { aFaire, ecartJours, LIBELLES_RAPPEL, type TypeRappel } from './rappels.ts'
import type { FactureLigne, Vue } from './vue.ts'

/** Une facture émise, non payée, avec sa date d'échéance : ce que `construireVue` pose dans `vue.vivant` (drapeau levé seulement). */
export type FactureEmise = { factureId: string; numero: string | null; client: string | null; montant: number; echeance: string }

/**
 * Les factures ÉMISES qui ont une échéance (AAAA-MM-JJ) : celles qui comptent (ni avoir, ni facture visée par un avoir — la règle de
 * /chiffres, lib/comptaTableau.ts) au statut « emise ». Payées, brouillons et annulées sont écartées. Montants en centimes (TTC).
 * Elles ne sont pas toutes échues : `posteAssistants` ne garde que celles que `jour` dépasse.
 */
export function facturesEmises(artisanId: string, factures: readonly FactureLigne[]): FactureEmise[] {
  const miennes = factures.filter((f) => f.artisan_id === artisanId)
  return facturesComptees(miennes)
    .filter((f) => f.statut === 'emise' && !!f.id && /^\d{4}-\d{2}-\d{2}/.test(f.date_echeance ?? ''))
    .map((f) => ({ factureId: f.id as string, numero: f.numero ?? null, client: f.client_nom ?? null, montant: centimes(f.total_ttc), echeance: (f.date_echeance as string).slice(0, 10) }))
    .sort((a, b) => a.echeance.localeCompare(b.echeance) || a.factureId.localeCompare(b.factureId))
}

/** Ce que le poste lit de la Vue. `vivant` est absent drapeau baissé : l'Encaissement est alors vide plutôt qu'inventé. */
export type EntreePoste = Pick<Vue, 'pipeline' | 'rappels'> & { vivant?: { facturesEmises: readonly FactureEmise[] } }

export type ElementAssistant = { cle: string; libelle: string; detail: string; href: string | null }
export type CleAssistant = 'relanceur' | 'encaissement' | 'facturation' | 'agenda'
export type Assistant = {
  cle: CleAssistant
  nom: string
  /** Ce que cet assistant prépare, en une phrase. */
  role: string
  /** Tout ce qui attend l'artisan (peut dépasser les trois éléments montrés). */
  total: number
  elements: ElementAssistant[]
  reste: number
  vide: string
  /** L'écran existant où l'artisan agit. */
  lien: { libelle: string; href: string }
}
export type PosteAssistants = { assistants: Assistant[]; total: number }

/** Éléments montrés par assistant. */
export const ELEMENTS_PAR_ASSISTANT = 3
/** La règle du produit (mode « assistée »), dite en tête du panneau. */
export const REGLE_ASSISTANTS = 'Ils préparent, vous validez : rien ne part sans votre clic.'
/** L'exception, dite sous la règle drapeau `piloteAutomatique` levé : le Pilote automatique (Signature), que l'artisan active lui-même. */
export const REGLE_PILOTE = 'Sauf ce que vous confiez au Pilote automatique (Paramètres) : il part seul au bout de 10 minutes, sauf si vous l’annulez.'

const euroTxt = (c: number) => `${(c / 100).toLocaleString('fr-FR', Number.isInteger(c / 100) ? { maximumFractionDigits: 0 } : { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`

export function posteAssistants(vue: EntreePoste, jour: string): PosteAssistants {
  const assistant = (a: Omit<Assistant, 'total' | 'elements' | 'reste'>, tous: ElementAssistant[]): Assistant =>
    ({ ...a, total: tous.length, elements: tous.slice(0, ELEMENTS_PAR_ASSISTANT), reste: Math.max(0, tous.length - ELEMENTS_PAR_ASSISTANT) })

  // — Relanceur de devis : les devis envoyés restés sans réponse dont la relance est due (la liste de la tuile « Relances dues ») —
  const relances: ElementAssistant[] = (vue.rappels?.devisARelancer ?? []).map((d) => ({
    cle: d.devisId,
    libelle: [d.numero ? `Devis ${d.numero}` : 'Devis', d.client].filter(Boolean).join(' · '),
    detail: [d.montant > 0 ? `${euroTxt(d.montant)} TTC` : null, d.dateSure ? `envoyé il y a ${d.jours} j` : `émis il y a ${d.jours} j (date d’envoi inconnue)`, d.relances ? `déjà relancé ${d.relances} fois` : null].filter(Boolean).join(' · '),
    href: `/devis/${d.devisId}`,
  }))

  // — Encaissement : les factures émises, non payées, dont l'échéance est passée (la plus ancienne d'abord) —
  const echues: ElementAssistant[] = (vue.vivant?.facturesEmises ?? [])
    .filter((f) => f.echeance < jour)
    .map((f) => ({ ...f, jours: ecartJours(f.echeance, jour) }))
    .sort((a, b) => b.jours - a.jours || a.factureId.localeCompare(b.factureId))
    .map((f) => ({
      cle: f.factureId,
      libelle: [f.numero ? `Facture ${f.numero}` : 'Facture', f.client].filter(Boolean).join(' · '),
      detail: [f.montant > 0 ? `${euroTxt(f.montant)} TTC` : null, `échue depuis ${f.jours} j`].filter(Boolean).join(' · '),
      href: '/factures',
    }))

  // — Facturation : un dossier à l'étape « à facturer » dont la facture n'est pas faite (chantier terminé, pas encore facturé) —
  const colonne = vue.pipeline.colonnes.find((c) => c.etape === 'a_facturer')?.cartes ?? []
  const afacturer: ElementAssistant[] = colonne
    .filter((c) => c.frise.pastilles.find((p) => p.etape === 'facture')?.etat !== 'fait')
    .map((c) => {
      const facture = c.frise.pastilles.find((p) => p.etape === 'facture')
      return {
        cle: c.cle,
        libelle: [c.client, c.titre].filter(Boolean).join(' · ') || 'Dossier',
        detail: facture?.etat === 'en_cours' ? facture.detail : c.montant && c.montant > 0 ? `${euroTxt(c.montant)} TTC · aucune facture` : 'Chantier terminé · aucune facture',
        href: c.chantierId ? `/crm/chantiers/${c.chantierId}` : c.devisId ? `/devis/${c.devisId}` : null,
      }
    })

  // — Agenda : les rappels non faits d'aujourd'hui et en retard (comme « À faire aujourd'hui » du tableau de bord) —
  const du = aFaire(vue.rappels?.liste ?? [], jour)
  const rappels: ElementAssistant[] = [...du.enRetard, ...du.aujourdhui].map((r) => ({
    cle: r.id,
    libelle: `${LIBELLES_RAPPEL[r.type as TypeRappel] ?? 'Rappel'} — ${r.cible.libelle}`,
    detail: [r.echeance < jour ? `${ecartJours(r.echeance, jour)} j de retard` : r.heure ? `aujourd’hui à ${r.heure.slice(0, 5)}` : 'aujourd’hui', r.texte].filter(Boolean).join(' · '),
    href: r.cible.href,
  }))

  const assistants = [
    assistant({ cle: 'relanceur', nom: 'Relanceur de devis', role: 'Prépare la relance des devis restés sans réponse ; vous la relisez avant tout envoi.', vide: 'Aucun devis envoyé sans réponse depuis plus de 7 jours.', lien: { libelle: 'Préparer les relances', href: '/crm?vue=tableau' } }, relances),
    assistant({ cle: 'encaissement', nom: 'Encaissement', role: 'Repère les factures échues et non payées ; la relance est à votre main.', vide: 'Aucune facture échue et non payée.', lien: { libelle: 'Ouvrir les factures', href: '/factures' } }, echues),
    assistant({ cle: 'facturation', nom: 'Facturation', role: 'Repère les chantiers terminés qui n’ont pas encore de facture.', vide: 'Aucun chantier terminé en attente de facture.', lien: { libelle: 'Voir les chantiers', href: '/crm?vue=chantiers' } }, afacturer),
    assistant({ cle: 'agenda', nom: 'Agenda', role: 'Rassemble les rappels du jour et ceux en retard.', vide: vue.rappels?.disponibles === false ? 'Les rappels s’installent : ils apparaîtront ici dès que la mise à jour de votre espace sera terminée.' : 'Rien de prévu aujourd’hui.', lien: { libelle: 'Voir « À faire aujourd’hui »', href: '/crm?vue=tableau' } }, rappels),
  ]
  return { assistants, total: assistants.reduce((s, a) => s + a.total, 0) }
}
