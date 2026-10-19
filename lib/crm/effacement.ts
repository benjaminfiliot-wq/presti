// CRM — ce que l'effacement d'UNE conversation (droit à l'effacement, app/api/donnees) doit aussi faire disparaître du
// CRM. Audit RGPD du 12/10, point a. Module pur : rejoué par scripts/crm-qa.mjs.
//
// Calculé AVANT d'anonymiser la demande : une fois son nom et son contact effacés, on ne saurait plus à quel client elle
// appartenait. Ce qui part :
//   • les notes CRM du CLIENT (crm_notes.client_cle = l'identifiant du groupe qui contient la demande) ;
//   • les notes de la DEMANDE (crm_notes.lead_id) — l'appelant les supprime par lead_id ;
//   • le NOM du client sur un chantier SANS devis envoyé : chantier du même client (lien ou regroupement), ou chantier
//     sans devis au même nom (un dépannage saisi à la main, qu'aucun identifiant ne relie). Un chantier rattaché à un devis
//     ENVOYÉ ou signé garde le sien : le devis, pièce à valeur légale, le porte de toute façon.
import { cleNom, clePortee, clesDesNotes, rattacherCle, type GroupeClient } from './clients.ts'

export type ChantierE = { id: string; devis_id: string | null; client_nom: string | null }
export type DevisE = { id: string; statut: string | null }

export function choisirEffacementCrm(p: {
  groupes: readonly GroupeClient[]
  leadId: string
  nomDemande: string | null
  chantiers: readonly ChantierE[]
  devis: readonly DevisE[]
}): { cleClient: string | null; anciennesCles: string[]; chantiersSansNom: string[] } {
  const groupe = p.groupes.find((g) => g.leads.includes(p.leadId)) ?? null
  const statutDevis = new Map(p.devis.map((d) => [d.id, (d.statut ?? 'brouillon').toLowerCase()]))
  const sansDevisEnvoye = (c: ChantierE) => !c.devis_id || (statutDevis.get(c.devis_id) ?? 'brouillon') === 'brouillon'
  const nom = cleNom(p.nomDemande)
  const duClient = new Set(groupe?.chantiers ?? [])
  const chantiersSansNom = p.chantiers
    .filter((c) => !!c.client_nom && sansDevisEnvoye(c) && (duClient.has(c.id) || (!c.devis_id && !!nom && cleNom(c.client_nom) === nom)))
    .map((c) => c.id)
    .sort()
  // C4 (audit du 18/10) : les notes posées sous une ANCIENNE clé du client (avant l'ajout de son e-mail…) partent aussi.
  const anciennesCles = groupe ? clesDesNotes(p.groupes, groupe).filter((k) => k !== groupe.id) : []
  return { cleClient: groupe?.id ?? null, anciennesCles, chantiersSansNom }
}

// Purge (lib/purgesRgpd.ts, purgerCrm) : quelles notes CLIENT supprimer, pour UN artisan. Orphelines (plus aucune pièce ne
// porte ce client), ou client ET note sans nouvelle depuis la durée de conservation. Garde-fou : plus de la moitié
// d'orphelines = l'empreinte a changé (secret serveur), pas les clients — rien n'est supprimé (`suspect`).
// C4 (audit de cohérence du 18/10) : une note n'est orpheline que si sa clé n'est portée par AUCUN client, ni comme
// identifiant actuel ni comme ancienne clé (un client connu par son nom, qui a reçu son e-mail depuis). Avant, la note d'un
// client dont l'identifiant venait de changer était supprimée au passage suivant.
/** Les notes client à supprimer, pour UN artisan (pur : rejoué par scripts/crm-qa.mjs). */
export function notesClientAPurger(
  notes: readonly { id: string; client_cle: string; cree_le: string; maj_le?: string | null }[],
  groupes: readonly { id: string; derniere: string | null; anciens?: readonly string[] }[],
  avant: string,
): { ids: string[]; suspect: boolean } {
  const orphelines = notes.filter((n) => !clePortee(groupes, n.client_cle))
  if (notes.length >= 2 && orphelines.length * 2 > notes.length) return { ids: [], suspect: true }
  const vieilles = notes.filter((n) => {
    const g = rattacherCle(groupes, n.client_cle)
    if (!g) return false // orpheline (déjà comptée) ou clé de nom partagée : jamais supprimée comme « vieille » sans client sûr
    const derniere = [g.derniere, n.maj_le ?? n.cree_le].filter((x): x is string => !!x).sort().at(-1) ?? ''
    return derniere < avant
  })
  return { ids: [...orphelines, ...vieilles].map((n) => n.id).sort(), suspect: false }
}

