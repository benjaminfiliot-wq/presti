import { centimes, facturesComptees, jourParis, type FacturePresti } from '../comptaTableau.ts'
import type { DonneesTableau, Ligne } from './charger'

export type Indicateur = { libelle: string; valeur: string | null; unite?: string; evolution?: number | null }
export type Bloc = { id: string; titre: string; source: string; vide: string; indicateurs: Indicateur[]; details?: string[]; note?: string }
export type LigneListe = { id: string; libelle: string; complement: string; href: string; etat?: 'crit' | 'ok' | 'warn' }
export type ListeTableau = { id: string; titre: string; source: string; vide: string; href: string; lignes: LigneListe[] }
export type VueTableau = {
  luLe: string
  blocs: Bloc[]
  mois: { cle: string; encaisses: number | null }[]
  listes: ListeTableau[]
  evolutionEncaisse: number | null
}

const texte = (v: unknown): string => typeof v === 'string' ? v : ''
const date = (v: unknown): string => texte(v).slice(0, 10)
const nombre = (v: unknown): number => { const n = Number(v); return Number.isFinite(n) ? n : 0 }
const montant = (v: number): string => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(v / 100)
const valeur = (n: number, existe: boolean): string | null => existe ? new Intl.NumberFormat('fr-FR').format(n) : null
const argent = (n: number, existe: boolean): string | null => existe ? montant(n) : null
const propre = (lignes: Ligne[], artisanId: string) => lignes.filter((l) => l.artisan_id === artisanId)
const cleMois = (jour: string) => jour.slice(0, 7)
const decalage = (cle: string, delta: number) => {
  const [an, mois] = cle.split('-').map(Number)
  const d = new Date(Date.UTC(an, mois - 1 + delta, 1))
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}
const dateFr = (v: unknown): string => {
  const jour = date(v)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(jour)) return 'Date indisponible'
  const d = new Date(`${jour}T12:00:00Z`)
  return Number.isNaN(d.getTime()) ? 'Date indisponible' : new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' }).format(d)
}

export function calculerTableau(d: DonneesTableau, artisanId: string, maintenant: Date): VueTableau {
  const aujourdHui = jourParis(maintenant)
  const mois = cleMois(aujourdHui)
  const anPasse = String(Number(mois.slice(0, 4)) - 1)
  const leads = propre(d.leads, artisanId)
  const idsLeads = new Set(leads.map((l) => l.id))
  const messages = d.messages.filter((m) => idsLeads.has(m.lead_id) && (m.sens !== 'out' || !m.etat))
  const devis = propre(d.devis, artisanId)
  const factures = facturesComptees(propre(d.factures, artisanId) as FacturePresti[]) as Ligne[]
  const clients = propre(d.clients, artisanId)
  const chantiers = propre(d.chantiers, artisanId)
  const materiaux = propre(d.materiaux, artisanId)
  const idsMateriaux = new Set(materiaux.map((m) => m.id))
  const stock = d.stock.filter((s) => idsMateriaux.has(s.materiau_id))
  const prix = propre(d.prix_artisan, artisanId).filter((p) => p.actif === true)
  const rappels = propre(d.crm_rappels, artisanId)
  const relances = d.relances.filter((r) => idsLeads.has(r.lead_id))
  const actions = propre(d.assistant_actions, artisanId)
  const artisan = d.artisans.find((a) => a.id === artisanId)

  const derniers = new Map<unknown, Ligne>()
  for (const m of messages) {
    const avant = derniers.get(m.lead_id)
    if (!avant || texte(m.sent_at) > texte(avant.sent_at)) derniers.set(m.lead_id, m)
  }
  const sansReponse = [...derniers.values()].filter((m) => m.sens === 'in').length
  const rdv = rappels.filter((r) => ['rendez_vous', 'visite', 'metre'].includes(texte(r.type)) && date(r.echeance) === aujourdHui && !r.fait_le)
  const aValider = actions.filter((a) => a.statut === 'en_attente')
  const demandesNeuves = leads.filter((l) => l.statut === 'nouveau')

  const payees = factures.filter((f) => f.statut === 'payee')
  const payeesDatees = payees.filter((f) => !!date(f.payee_le))
  const sansDatePaiement = payees.filter((f) => !date(f.payee_le)).length
  const encaissesMois = payees.filter((f) => cleMois(date(f.payee_le)) === mois)
  const encaissesAnPasse = payees.filter((f) => date(f.payee_le).startsWith(anPasse))
  const aEncaisser = factures.filter((f) => f.statut === 'emise')
  const enRetard = aEncaisser.filter((f) => date(f.date_echeance) && date(f.date_echeance) < aujourdHui)
  const somme = (lignes: Ligne[]) => lignes.reduce((total, f) => total + centimes(f.total_ttc as number | string | null), 0)
  const moisGraphique = Array.from({ length: 12 }, (_, i) => {
    const cle = decalage(mois, i - 11)
    const lignes = payees.filter((f) => cleMois(date(f.payee_le)) === cle)
    return { cle, encaisses: lignes.length ? somme(lignes) : payeesDatees.length ? 0 : null }
  })
  const moisPrecedent = decalage(mois, -1)
  const variation = (actuel: number, precedent: number): number | null =>
    precedent > 0 ? Math.round(((actuel - precedent) * 100) / precedent) : null
  const encaissePrecedent = payees.filter((f) => cleMois(date(f.payee_le)) === moisPrecedent)
  const evolutionEncaisse = encaissesMois.length && encaissePrecedent.length && somme(encaissePrecedent) > 0
    ? variation(somme(encaissesMois), somme(encaissePrecedent)) : null
  const aEncaisserMois = aEncaisser.filter((f) => cleMois(date(f.date_emission)) === mois)
  const aEncaisserPrec = aEncaisser.filter((f) => cleMois(date(f.date_emission)) === moisPrecedent)
  const evolutionAEncaisser = aEncaisserMois.length && aEncaisserPrec.length ? variation(somme(aEncaisserMois), somme(aEncaisserPrec)) : null
  const enRetardMois = enRetard.filter((f) => cleMois(date(f.date_echeance)) === mois)
  const enRetardPrec = enRetard.filter((f) => cleMois(date(f.date_echeance)) === moisPrecedent)
  const evolutionRetard = enRetardMois.length && enRetardPrec.length ? variation(somme(enRetardMois), somme(enRetardPrec)) : null
  const demandesMois = demandesNeuves.filter((l) => cleMois(date(l.created_at)) === mois)
  const demandesPrec = demandesNeuves.filter((l) => cleMois(date(l.created_at)) === moisPrecedent)
  const evolutionDemandes = demandesMois.length && demandesPrec.length ? variation(demandesMois.length, demandesPrec.length) : null
  const aValiderMois = aValider.filter((a) => cleMois(date(a.cree_le)) === mois)
  const aValiderPrec = aValider.filter((a) => cleMois(date(a.cree_le)) === moisPrecedent)
  const evolutionAValider = aValiderMois.length && aValiderPrec.length ? variation(aValiderMois.length, aValiderPrec.length) : null

  const devisMois = devis.filter((v) => cleMois(date(v.created_at)) === mois)
  const envoyes = devisMois.filter((v) => ['envoye', 'accepte', 'refuse'].includes(texte(v.statut)) || !!v.envoye_le)
  const acceptes = devisMois.filter((v) => v.statut === 'accepte')
  const refuses = devisMois.filter((v) => v.statut === 'refuse')
  const facturesMois = factures.filter((f) => cleMois(date(f.date_emission)) === mois)
  const clientsMois = clients.filter((c) => cleMois(date(c.created_at)) === mois)
  const chiffreClient = new Map<string, number>()
  for (const f of factures) {
    const id = texte(f.client_id)
    const nom = texte(clients.find((c) => c.id === id)?.nom) || texte(f.client_nom)
    if (nom) chiffreClient.set(nom, (chiffreClient.get(nom) ?? 0) + centimes(f.total_ttc as number | string | null))
  }
  const meilleurs = [...chiffreClient].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([nom, total]) => `${nom} · ${montant(total)}`)

  const actifs = chantiers.filter((c) => !['termine', 'annule'].includes(texte(c.statut)))
  const chantiersRetard = actifs.filter((c) => date(c.date_fin_prevue) && date(c.date_fin_prevue) < aujourdHui)
  const stockBas = materiaux.filter((m) => {
    const seuil = nombre(m.seuil_alerte)
    return seuil > 0 && stock.filter((s) => s.materiau_id === m.id).reduce((n, s) => n + nombre(s.quantite), 0) <= seuil
  })
  const rendezVous = rappels.filter((r) => ['rendez_vous', 'visite', 'metre'].includes(texte(r.type)) && date(r.echeance) >= aujourdHui && !r.fait_le)
    .sort((a, b) => `${date(a.echeance)} ${texte(a.heure)}`.localeCompare(`${date(b.echeance)} ${texte(b.heure)}`)).slice(0, 5)
  const devisSansReponse = devis.filter((v) => v.statut === 'envoye')
    .sort((a, b) => texte(a.envoye_le || a.created_at).localeCompare(texte(b.envoye_le || b.created_at))).slice(0, 5)
  const facturesEnRetard = enRetard.slice().sort((a, b) => date(a.date_echeance).localeCompare(date(b.date_echeance))).slice(0, 5)
  const meilleursClients = [...chiffreClient].filter(([, total]) => total > 0).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const listes: ListeTableau[] = [
    { id: 'rendez-vous', titre: 'Prochains rendez-vous', source: 'crm_rappels.echeance, heure, type, fait_le', vide: 'Aucun rendez-vous à venir.', href: '/crm', lignes: rendezVous.map((r) => ({
      id: texte(r.id), libelle: ({ rendez_vous: 'Rendez-vous', visite: 'Visite', metre: 'Prise de mesures' }[texte(r.type)] || 'Rendez-vous'),
      complement: `${dateFr(r.echeance)}${r.heure ? ` · ${texte(r.heure).slice(0, 5)}` : ''}`, href: '/crm',
    })) },
    { id: 'devis-attente', titre: 'Devis envoyés sans réponse', source: 'devis.statut, envoye_le, client_nom, total_ttc', vide: 'Aucun devis en attente de réponse.', href: '/devis', lignes: devisSansReponse.map((v) => ({
      id: texte(v.id), libelle: texte(v.client_nom) || 'Client sans nom', complement: `${montant(centimes(v.total_ttc as number | string | null))} · envoyé le ${dateFr(v.envoye_le || v.created_at)}`,
      href: texte(v.id) ? `/devis/${encodeURIComponent(texte(v.id))}` : '/devis', etat: 'warn',
    })) },
    { id: 'factures-retard', titre: 'Factures en retard', source: 'factures.statut, date_echeance, total_ttc, client_nom, avoir_de', vide: 'Aucune facture en retard.', href: '/factures', lignes: facturesEnRetard.map((f) => ({
      id: texte(f.id), libelle: texte(f.client_nom) || 'Client sans nom', complement: `${montant(centimes(f.total_ttc as number | string | null))} · ${Math.max(0, Math.round((Date.parse(`${aujourdHui}T12:00:00Z`) - Date.parse(`${date(f.date_echeance)}T12:00:00Z`)) / 86_400_000))} j de retard`,
      href: texte(f.id) ? `/factures/${encodeURIComponent(texte(f.id))}` : '/factures', etat: 'crit',
    })) },
    { id: 'meilleurs-clients', titre: 'Meilleurs clients', source: 'factures.total_ttc, statut, client_id, client_nom ; clients.nom', vide: 'Aucun chiffre client disponible.', href: '/crm', lignes: meilleursClients.map(([nom, total]) => ({
      id: nom, libelle: nom, complement: montant(total), href: '/crm', etat: 'ok',
    })) },
    { id: 'stock-bas', titre: 'Articles sous le seuil', source: 'materiaux.nom, seuil_alerte ; stock.quantite', vide: 'Aucun article sous le seuil.', href: '/inventaire', lignes: stockBas.slice(0, 5).map((m) => ({
      id: texte(m.id), libelle: texte(m.nom) || 'Article sans nom', complement: `${stock.filter((s) => s.materiau_id === m.id).reduce((n, s) => n + nombre(s.quantite), 0)} en stock · seuil ${nombre(m.seuil_alerte)}`,
      href: '/inventaire', etat: 'warn',
    })) },
  ]
  const relancesDues = rappels.filter((r) => r.type === 'relancer_devis' && date(r.echeance) <= aujourdHui && !r.fait_le)
    .length + relances.filter((r) => date(r.planifiee_le) <= aujourdHui && r.envoyee === false).length
  const relancesFaites = rappels.filter((r) => r.type === 'relancer_devis' && !!(r.fait_le || r.envoye_le)).length
    + relances.filter((r) => r.envoyee === true).length
  const preparees = actions.filter((a) => a.mode === 'confirmation' && cleMois(date(a.cree_le)) === mois)

  const blocs: Bloc[] = [
    { id: 'jour', titre: 'Aujourd’hui', source: 'leads, messages, crm_rappels, assistant_actions', vide: 'Aucune action à traiter aujourd’hui.', indicateurs: [
      { libelle: 'Demandes neuves', valeur: valeur(demandesNeuves.length, leads.length > 0), evolution: evolutionDemandes },
      { libelle: 'Messages sans réponse', valeur: valeur(sansReponse, messages.length > 0) },
      { libelle: 'Rendez-vous', valeur: valeur(rdv.length, rappels.length > 0) },
      { libelle: 'À valider', valeur: valeur(aValider.length, actions.length > 0), evolution: evolutionAValider },
    ] },
    { id: 'argent', titre: 'Argent', source: 'factures.total_ttc, statut, payee_le, date_echeance, avoir_de', vide: 'Aucune facture émise.', indicateurs: [
      { libelle: 'Encaissé ce mois', valeur: argent(somme(encaissesMois), payeesDatees.length > 0), evolution: evolutionEncaisse },
      { libelle: 'Encaissé l’an passé', valeur: argent(somme(encaissesAnPasse), payeesDatees.length > 0) },
      { libelle: 'À encaisser', valeur: argent(somme(aEncaisser), factures.length > 0), evolution: evolutionAEncaisser },
      { libelle: 'Impayés en retard', valeur: argent(somme(enRetard), factures.length > 0), evolution: evolutionRetard },
    ], note: sansDatePaiement ? `${sansDatePaiement} règlement(s) ancien(s) sans date : hors des totaux mensuels.` : undefined },
    { id: 'devis', titre: 'Devis et factures', source: 'devis.statut, created_at, envoye_le ; factures.statut, date_emission, date_echeance', vide: 'Aucun devis ni facture ce mois-ci.', indicateurs: [
      { libelle: 'Devis créés', valeur: valeur(devisMois.length, devis.length > 0) },
      { libelle: 'Envoyés', valeur: valeur(envoyes.length, devis.length > 0) },
      { libelle: 'Acceptés', valeur: valeur(acceptes.length, devis.length > 0) },
      { libelle: 'Refusés', valeur: valeur(refuses.length, devis.length > 0) },
      { libelle: 'Taux d’acceptation', valeur: envoyes.length ? `${Math.round(acceptes.length * 1000 / envoyes.length) / 10} %` : null },
      { libelle: 'Factures émises', valeur: valeur(facturesMois.length, factures.length > 0) },
      { libelle: 'Payées', valeur: valeur(facturesMois.filter((f) => f.statut === 'payee').length, factures.length > 0) },
      { libelle: 'En retard', valeur: valeur(enRetard.length, factures.length > 0) },
    ] },
    { id: 'clients', titre: 'Clients', source: 'clients.id, created_at ; factures.client_id, client_nom, total_ttc', vide: 'Aucun client enregistré.', indicateurs: [
      { libelle: 'Clients', valeur: valeur(clients.length, clients.length > 0) },
      { libelle: 'Nouveaux ce mois', valeur: valeur(clientsMois.length, clients.length > 0) },
    ], details: meilleurs },
    { id: 'chantiers', titre: 'Chantiers et agenda', source: 'chantiers.statut, date_fin_prevue ; crm_rappels.echeance, type', vide: 'Aucun chantier ni rendez-vous planifié.', indicateurs: [
      { libelle: 'Chantiers actifs', valeur: valeur(actifs.length, chantiers.length > 0) },
      { libelle: 'En retard', valeur: valeur(chantiersRetard.length, chantiers.length > 0) },
      { libelle: 'Rendez-vous à venir', valeur: valeur(rappels.filter((r) => ['rendez_vous', 'visite', 'metre'].includes(texte(r.type)) && date(r.echeance) >= aujourdHui && !r.fait_le).length, rappels.length > 0) },
    ] },
    { id: 'stock', titre: 'Stock et tarifs', source: 'materiaux.seuil_alerte ; stock.quantite ; prix_artisan.actif, maj_le', vide: 'Aucun matériau suivi ni tarif actif.', indicateurs: [
      { libelle: 'Matériaux sous le seuil', valeur: valeur(stockBas.length, materiaux.some((m) => nombre(m.seuil_alerte) > 0)) },
      { libelle: 'Tarifs actifs', valeur: valeur(prix.length, prix.length > 0) },
    ], details: prix.slice().sort((a, b) => texte(b.maj_le).localeCompare(texte(a.maj_le))).slice(0, 3).map((p) => `${texte(p.designation)} · ${date(p.maj_le)}`) },
    { id: 'relances', titre: 'Relances', source: 'crm_rappels.echeance, fait_le ; relances.planifiee_le, envoyee', vide: 'Aucune relance enregistrée.', indicateurs: [
      { libelle: 'Dues', valeur: valeur(relancesDues, rappels.length + relances.length > 0) },
      { libelle: 'Faites', valeur: valeur(relancesFaites, rappels.length + relances.length > 0) },
    ] },
    { id: 'assistants', titre: 'Assistants et crédits', source: 'assistant_actions.mode, cree_le ; artisans.credits, credits_periode', vide: 'Aucune préparation de l’assistant ce mois-ci.', indicateurs: [
      { libelle: 'Préparé ce mois', valeur: valeur(preparees.length, actions.length > 0) },
      { libelle: 'Crédits restants', valeur: artisan && artisan.credits != null ? valeur(nombre(artisan.credits), true) : null },
    ], note: 'Le schéma ne garde pas les consommations datées : usage mensuel indisponible.' },
  ]
  return { luLe: maintenant.toISOString(), blocs, mois: moisGraphique, listes, evolutionEncaisse }
}
