// L'assistant de gestion de la console — le BRIEFING DU MATIN (plans/016, jalon A3).
//
// Module pur : il assemble, sans rien recalculer d'autre que des comptes, ce que les lectures de l'assistant ont déjà rendu
// (mêmes données que les outils lire_*, donc mêmes chiffres que les écrans : « deux chiffres, un écran ») en UNE donnée
// courte : ce qui est urgent, ce qui est en retard, ce qui attend l'artisan, et les actions qu'il peut décider. Le modèle ne
// compte rien : tous les nombres sortent d'ici (le garde-fou des chiffres de cadrage.ts les retrouve dans la donnée).
//
// L'artisan DÉCIDE : une « action proposable » nomme l'outil et l'objet, jamais une action déjà faite.

/** Un devis envoyé, tel que le briefing le regarde (lignes lues sous la RLS par l'exécuteur). */
export type DevisSuivi = { numero: string | null; client: string | null; total_ttc: number | null; envoye_le: string | null }

type Conv = { conversation_id: string; client: string; urgent?: boolean; attend?: string | null }
type Impaye = { numero: string | null; client: string | null; montant: { euros: number; texte: string }; echeance: string | null; jours_de_retard: number }
type Alerte = { article: string | null; unite: string | null; reste: number | null; seuil: number | null }

export type EntreeBriefing = {
  /** « 12/10/2026 », jour lisible à Paris. */
  jour: string
  /** Jour ISO à Paris (« 2026-10-12 ») : sert à compter les jours depuis l'envoi d'un devis. */
  jourIso: string
  conversations: { nb_en_attente: number; conversations: readonly Conv[] }
  devis: readonly DevisSuivi[]
  factures: { impayes: { nombre: number; en_retard: number; total: { euros: number; texte: string }; liste: readonly Impaye[] } }
  stock: { nb_alertes: number; alertes: readonly Alerte[] }
  /** Absent : le compte n'a pas le CRM. */
  crm?: {
    chantiers: { nb_ouverts: number; nb_en_retard: number | null; chantiers: readonly { chantier: string; statut: string; jours_de_retard: number | null }[] }
    equipe: { nb_chantiers_du_jour: number; nb_sur_un_chantier: number; nb_a_l_atelier: number; chantiers_du_jour: readonly { chantier: string; equipe_affectee: readonly string[] }[] }
    aFacturer: { nb_dossiers: number; total_de_la_colonne_ttc: { euros: number; texte: string } }
  }
}

/** Au-delà de ce nombre de jours sans réponse, un devis envoyé mérite une relance. */
export const DEVIS_SANS_REPONSE_JOURS = 7
/** Au-delà de ce nombre de jours après l'échéance, une facture est urgente. */
export const IMPAYE_URGENT_JOURS = 30
const LISTE_MAX = 8

const joursEntre = (de: string, a: string): number => Math.floor((Date.parse(a + 'T00:00:00Z') - Date.parse(de.slice(0, 10) + 'T00:00:00Z')) / 86_400_000)

export type SectionBriefing = { cle: string; titre: string; nombre: number; lignes: string[]; lignes_non_montrees: number; actions_possibles: string[] }

export function composerBriefing(e: EntreeBriefing) {
  const sections: SectionBriefing[] = []
  const urgences: string[] = []
  const ajouter = (cle: string, titre: string, tous: string[], actions: string[]) => {
    if (!tous.length) return
    sections.push({ cle, titre, nombre: tous.length, lignes: tous.slice(0, LISTE_MAX), lignes_non_montrees: Math.max(0, tous.length - LISTE_MAX), actions_possibles: actions })
  }

  // Conversations : les urgentes d'abord.
  const convs = [...e.conversations.conversations].sort((a, b) => Number(!!b.urgent) - Number(!!a.urgent))
  for (const c of convs.filter((x) => x.urgent)) urgences.push(`Demande urgente : ${c.client}${c.attend ? ` (${c.attend})` : ''}`)
  ajouter('conversations', 'Conversations qui attendent', convs.map((c) => `${c.client}${c.urgent ? ' — URGENT' : ''}${c.attend ? ` : ${c.attend}` : ''}`), ['répondre (preparer_reponse, repondre_client)', 'faire le devis (preparer_devis_brouillon, creer_devis)'])

  // Devis envoyés sans réponse depuis plus de N jours.
  const sansReponse = e.devis
    .map((d) => ({ d, jours: d.envoye_le ? joursEntre(d.envoye_le, e.jourIso) : null }))
    .filter((x) => x.jours !== null && x.jours >= DEVIS_SANS_REPONSE_JOURS)
    .sort((a, b) => (b.jours as number) - (a.jours as number))
  ajouter('devis_sans_reponse', `Devis envoyés sans réponse depuis ${DEVIS_SANS_REPONSE_JOURS} jours ou plus`, sansReponse.map(({ d, jours }) => `${d.numero ?? 'devis'} — ${d.client ?? 'client'}${d.total_ttc !== null ? `, ${d.total_ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} € TTC` : ''}, envoyé il y a ${jours} jours`), ['relancer (relancer_devis, après confirmation)'])

  // Impayés.
  const imp = e.factures.impayes
  const echues = imp.liste.filter((i) => i.jours_de_retard > 0).sort((a, b) => b.jours_de_retard - a.jours_de_retard)
  for (const i of echues.filter((x) => x.jours_de_retard >= IMPAYE_URGENT_JOURS)) urgences.push(`Facture ${i.numero ?? ''} impayée depuis ${i.jours_de_retard} jours (${i.montant.texte})`.replace('  ', ' '))
  ajouter('impayes', 'Factures échues non payées', echues.map((i) => `${i.numero ?? 'facture'} — ${i.client ?? 'client'}, ${i.montant.texte}, ${i.jours_de_retard} jour${i.jours_de_retard > 1 ? 's' : ''} de retard`), ['relancer (relancer_facture, après confirmation)', 'marquer payée si encaissée (marquer_facture_payee, après confirmation)'])

  // Stock.
  for (const a of e.stock.alertes.filter((x) => x.reste !== null && x.reste <= 0)) urgences.push(`Stock épuisé : ${a.article ?? 'article'}`)
  ajouter('stock_bas', 'Stock sous le seuil d’alerte', e.stock.alertes.map((a) => `${a.article ?? 'article'} — reste ${a.reste ?? '?'}${a.unite ? ' ' + a.unite : ''} (seuil ${a.seuil ?? '?'})`), ['noter une réception (ajuster_stock)', 'ajuster le seuil (modifier_article)'])

  // CRM.
  if (e.crm) {
    const enRetard = e.crm.chantiers.chantiers.filter((c) => (c.jours_de_retard ?? 0) > 0)
    for (const c of enRetard.filter((x) => (x.jours_de_retard ?? 0) >= 7)) urgences.push(`Chantier en retard : ${c.chantier} (${c.jours_de_retard} jours)`)
    ajouter('chantiers_du_jour', 'Chantiers du jour', e.crm.equipe.chantiers_du_jour.map((c) => `${c.chantier}${c.equipe_affectee.length ? ` — ${c.equipe_affectee.join(', ')}` : ' — personne d’affecté'}`), ['affecter l’équipe (affecter_equipe)', 'cocher les tâches faites (cocher_tache)'])
    ajouter('chantiers_en_retard', 'Chantiers en retard', enRetard.map((c) => `${c.chantier} — ${c.jours_de_retard} jour${(c.jours_de_retard ?? 0) > 1 ? 's' : ''} de retard`), ['changer les dates (modifier_chantier)'])
    if (e.crm.aFacturer.nb_dossiers > 0) ajouter('a_facturer', 'À facturer ou à encaisser', [`${e.crm.aFacturer.nb_dossiers} dossier(s), ${e.crm.aFacturer.total_de_la_colonne_ttc.texte} TTC au total`], ['facturer un devis signé (creer_facture, après confirmation)'])
  }

  return {
    date: e.jour,
    nb_urgences: urgences.length,
    urgences: urgences.slice(0, LISTE_MAX),
    sections,
    nb_sections: sections.length,
    rien_a_signaler: sections.length === 0,
    chiffres: {
      conversations_en_attente: e.conversations.nb_en_attente,
      devis_sans_reponse: sansReponse.length,
      factures_impayees: imp.nombre,
      factures_echues: echues.length,
      total_impaye: imp.total,
      alertes_de_stock: e.stock.nb_alertes,
      ...(e.crm ? { chantiers_ouverts: e.crm.chantiers.nb_ouverts, chantiers_en_retard: e.crm.chantiers.nb_en_retard ?? 0, chantiers_du_jour: e.crm.equipe.nb_chantiers_du_jour } : {}),
    },
    a_savoir: `Briefing calculé à partir des données de l'artisan, au ${e.jour}. Les actions listées sont des PROPOSITIONS : il décide, et tout ce qui part chez un client passe par une carte à confirmer. Seuils : devis sans réponse à partir de ${DEVIS_SANS_REPONSE_JOURS} jours, impayé urgent à partir de ${IMPAYE_URGENT_JOURS} jours de retard. ${e.crm ? '' : 'Le CRM n’est pas ouvert sur ce compte : pas de chantiers ni d’équipe dans ce briefing.'}`.trim(),
  }
}
