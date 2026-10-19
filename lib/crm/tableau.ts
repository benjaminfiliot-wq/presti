// CRM — le tableau de bord : chiffre signé du mois, devis en attente, relances dues, chantiers en retard, stock bas.
// Module pur : rejoué par scripts/crm-qa.mjs.
//
// « Deux chiffres, un écran » : ce que /chiffres calcule déjà n'est PAS recalculé ici. Signé du mois et devis en attente
// viennent de lib/comptaTableau.ts (période « Ce mois »), les relances dues de lib/tableau-de-bord/calculer.ts (devis
// envoyés restés sans réponse depuis plus de 7 jours, encore valables). Seuls les chantiers et le stock sont nouveaux, et le
// stock bas suit la règle de l'écran Inventaire (seuil > 0 et quantité totale ≤ seuil).
//
// Aucune donnée d'exemple. Une case est `null` — affichée « — » — quand la donnée qui la porte n'existe pas (aucun devis,
// aucun chantier daté, aucun seuil réglé) ; un vrai zéro (des devis, mais aucun signé ce mois) reste un zéro.
import { calculerCompta, jourParis, type DevisPresti, type FacturePresti, type DemandePresti } from '../comptaTableau.ts'
import { calculer } from '../tableau-de-bord/calculer.ts'
import { joursDeRetard } from './chantier.ts'

export type ChantierT = { id: string; artisan_id?: string | null; titre?: string | null; statut?: string | null; date_fin_prevue?: string | null }
export type MateriauT = { id: string; artisan_id?: string | null; nom?: string | null; unite?: string | null; seuil_alerte?: number | string | null; stock?: { lieu?: string | null; quantite?: number | string | null }[] | null }

export type TableauCrm = {
  jour: string
  signeMois: { nombre: number; montant: number } | null
  devisEnAttente: { nombre: number; montant: number } | null
  relancesDues: { nombre: number; seuilJours: number } | null
  chantiers: { actifs: number; enRetard: { nombre: number; liste: { id: string; titre: string; jours: number }[] } | null; sansDate: number } | null
  stockBas: { nombre: number; liste: { id: string; nom: string; reste: number; seuil: number; unite: string }[] } | null
  /** Reste à encaisser sur les dossiers (lib/crm/argent.ts, via les cartes du pipeline) : la somme exacte des restes des cartes,
   *  donc des colonnes du pipeline (et des dossiers classés à qui il reste une facture à régler). null sans devis signé ni facture. */
  aEncaisser: { montant: number; dossiers: number } | null
}

const num = (v: unknown): number => { const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v.replace(',', '.')) : NaN; return Number.isFinite(n) ? n : 0 }

export function calculerTableauCrm(e: {
  artisanId: string
  devis: readonly DevisPresti[]
  factures: readonly FacturePresti[]
  demandes: readonly DemandePresti[]
  chantiers: readonly ChantierT[]
  materiaux: readonly MateriauT[]
  maintenant: Date
  /** Les cartes du pipeline (lib/crm/pipeline.ts) : leur reste à encaisser fait la tuile « À encaisser ». */
  cartes?: readonly { aEncaisser: number; devisId: string | null }[]
}): TableauCrm {
  const jour = jourParis(e.maintenant)
  const mien = <T extends { artisan_id?: string | null }>(l: readonly T[]) => (Array.isArray(l) ? l : []).filter((x) => !!x && x.artisan_id === e.artisanId)
  const devis = mien(e.devis)
  const compta = calculerCompta({ artisanId: e.artisanId, factures: e.factures, devis: e.devis, demandes: e.demandes, lignes: [], periode: 'mois', maintenant: e.maintenant })
  const gestion = calculer({ artisanId: e.artisanId, factures: [...e.factures], devis: [...e.devis], demandes: [...e.demandes], maintenant: e.maintenant })

  const chantiers = mien(e.chantiers)
  const actifs = chantiers.filter((c) => c.statut !== 'termine' && c.statut !== 'annule')
  const dates = actifs.map((c) => ({ c, j: joursDeRetard(c, jour) }))
  const dates_ok = dates.filter((x): x is { c: ChantierT; j: number } => x.j !== null)
  const retards = dates_ok.filter((x) => x.j > 0).sort((a, b) => b.j - a.j || a.c.id.localeCompare(b.c.id))

  const materiaux = mien(e.materiaux)
  const suivis = materiaux.filter((m) => num(m.seuil_alerte) > 0)
  const bas = suivis
    .map((m) => ({ id: m.id, nom: (m.nom ?? '').trim() || 'Sans nom', unite: (m.unite ?? 'u') || 'u', seuil: num(m.seuil_alerte), reste: Math.round((m.stock ?? []).reduce((s: number, l: { quantite?: number | string | null }) => s + num(l.quantite), 0) * 100) / 100 }))
    .filter((m) => m.reste <= m.seuil)
    .sort((a, b) => a.reste / a.seuil - b.reste / b.seuil || a.nom.localeCompare(b.nom))

  return {
    jour,
    signeMois: devis.length ? compta.devis.acceptes : null,
    devisEnAttente: devis.length ? compta.devis.enAttente : null,
    relancesDues: devis.length ? { nombre: gestion.aRelancer.total, seuilJours: gestion.aRelancer.seuilJours } : null,
    chantiers: chantiers.length
      // Aucun chantier ouvert : zéro en retard (un vrai zéro). Des chantiers ouverts mais aucun daté : on ne sait pas (null).
      ? { actifs: actifs.length, enRetard: !actifs.length ? { nombre: 0, liste: [] } : dates_ok.length ? { nombre: retards.length, liste: retards.slice(0, 5).map((x) => ({ id: x.c.id, titre: (x.c.titre ?? '').trim() || 'Chantier', jours: x.j })) } : null, sansDate: dates.length - dates_ok.length }
      : null,
    stockBas: suivis.length ? { nombre: bas.length, liste: bas.slice(0, 5) } : null,
    aEncaisser: (() => {
      const avecArgent = devis.some((d) => d.statut === 'accepte') || mien(e.factures).some((f) => !!f.devis_id)
      if (!e.cartes || !avecArgent) return null
      const dus = e.cartes.filter((c) => c.devisId && c.aEncaisser > 0)
      return { montant: dus.reduce((s, c) => s + c.aEncaisser, 0), dossiers: dus.length }
    })(),
  }
}
