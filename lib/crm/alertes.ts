// CRM — les ALERTES, les URGENCES du jour et le BRIEFING du matin, déduits des mêmes données que la maquette (DonneesAtelier,
// lib/crm/atelier.ts). Module pur, sans base, sans réseau, sans three : rejoué par scripts/crm-qa.mjs, réutilisable tel quel par
// l'assistant (« fais-moi le briefing du matin ») — il lui suffit d'appeler construireBriefing(donnees).
//
// « Deux chiffres, un écran » : chaque règle ci-dessous réutilise la règle qui nourrit déjà un autre écran, au lieu d'en écrire
// une seconde —
//   • retard d'un chantier  = joursDeRetard (lib/crm/chantier.ts), celle du tableau de bord ;
//   • stock bas             = seuil > 0 et quantité totale ≤ seuil, celle de l'Inventaire et du tableau de bord ;
//   • commande en retard    = lib/crm/commandes.ts (statut « commandée », livraison prévue strictement passée).
// scripts/crm-qa.mjs recompare ces comptes au tableau de bord sur des jeux de données tirés au hasard.
//
// Rien n'est inventé : sans commande enregistrée il n'y a aucune « livraison en retard » ; sans réservation, aucune alerte de
// stock rattachée à un chantier ; sans date de fin, aucun retard.
import type { ChantierA, DonneesAtelier, MateriauA } from './atelier.ts'
import { joursDeRetard } from './chantier.ts'
import { jourParis } from '../comptaTableau.ts'
import { attendueAujourdhui, enCours, libelleCommande, retardLivraison, type CommandeA } from './commandes.ts'

export type TypeAlerte = 'retard' | 'livraison' | 'attendue' | 'stock' | 'facturer' | 'sans_equipe'
export type Gravite = 'critique' | 'attention' | 'info'
export type Alerte = {
  cle: string
  type: TypeAlerte
  gravite: Gravite
  titre: string
  detail: string
  /** Les chantiers concernés (vide : alerte du dépôt ou de l'accueil, sans chantier). */
  chantierIds: string[]
  commandeId: string | null
  materiauIds: string[]
  jours: number | null
}

export const LIBELLES_ALERTE: Record<TypeAlerte, string> = {
  retard: 'Chantier en retard', livraison: 'Livraison en retard', attendue: 'Livraison attendue aujourd’hui', stock: 'Stock à compléter',
  facturer: 'À facturer', sans_equipe: 'Personne affecté',
}
const ORDRE_GRAVITE: Record<Gravite, number> = { critique: 0, attention: 1, info: 2 }

// ── Les règles de base (partagées avec la maquette) ──────────────────────────────────────────────────────────
/** Un chantier est-il prévu aujourd'hui ? En cours = oui ; sinon sa période couvre le jour. */
export const estAujourdhui = (c: Pick<ChantierA, 'statut' | 'date_debut' | 'date_fin_prevue'>, jour: string): boolean => {
  if (c.statut === 'termine' || c.statut === 'annule') return false
  if (c.statut === 'en_cours') return true
  return !!c.date_debut && c.date_debut <= jour && (!c.date_fin_prevue || c.date_fin_prevue >= jour)
}
/**
 * Les chantiers que la maquette montre : tout chantier OUVERT (même déjà payé : un chantier peut rester en cours une fois réglé,
 * et son retard compte au tableau de bord), et les chantiers terminés encore à facturer. Annulés, et terminés-payés : non.
 */
export const chantierVisible = (c: Pick<ChantierA, 'statut' | 'etape'>): boolean => {
  if (c.statut === 'annule') return false
  if (c.statut === 'termine') return c.etape === 'a_facturer' || c.etape === null
  return true
}
/** La règle du stock bas, la même que l'Inventaire et le tableau de bord. */
export const estStockBas = (m: Pick<MateriauA, 'seuil' | 'reste'>): boolean => m.seuil > 0 && m.reste <= m.seuil
/** Colonne « À facturer / encaisser » du pipeline (lib/crm/pipeline.ts) : le chantier y est, quel que soit son statut. */
export const aEncaisser = (c: Pick<ChantierA, 'etape'>): boolean => c.etape === 'a_facturer'
/** « À facturer » (alerte) : en plus, le chantier est TERMINÉ — un chantier en cours déjà facturé attend un règlement, pas une facture. */
export const aFacturer = (c: Pick<ChantierA, 'statut' | 'etape'>): boolean => c.statut === 'termine' && aEncaisser(c)

const fr = (d: string | null) => (d ? d.split('-').reverse().join('/') : '—')
const qte = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',')
const pluriel = (n: number, mot: string, mots = `${mot}s`) => `${n} ${n > 1 ? mots : mot}`

export type ResumeAlertes = {
  /** Toutes les alertes, la plus grave d'abord. */
  alertes: Alerte[]
  /** Par chantier (visible) : ses alertes. */
  parChantier: Map<string, Alerte[]>
  /** Les chiffres du jour, ceux que la barre du haut affiche. */
  chiffres: { retards: number; livraisonsEnRetard: number; livraisonsAttendues: number; stockBas: number; aFacturer: number; sansEquipe: number; demandes: number; demandesDuJour: number; critiques: number }
}

export function calculerAlertes(d: DonneesAtelier): ResumeAlertes {
  const jour = d.jour
  const commandes = d.commandes ?? []
  const reservations = d.reservations ?? []
  const materiaux = new Map(d.materiaux.map((m) => [m.id, m]))
  const visibles = d.chantiers.filter(chantierVisible)
  const idsVisibles = new Set(visibles.map((c) => c.id))
  const alertes: Alerte[] = []

  // 1 ─ Chantiers en retard (règle du tableau de bord).
  for (const c of visibles) {
    const r = joursDeRetard(c, jour)
    if (r && r > 0) alertes.push({ cle: `retard:${c.id}`, type: 'retard', gravite: 'critique', titre: LIBELLES_ALERTE.retard, detail: `Fin prévue le ${fr(c.date_fin_prevue)} : ${pluriel(r, 'jour')} de retard.`, chantierIds: [c.id], commandeId: null, materiauIds: [], jours: r })
  }

  // 2 ─ Commandes en retard (ou attendues aujourd'hui) : rattachées à leur chantier, sinon aux chantiers qui ont réservé ces matériaux.
  const chantiersDe = (cmd: CommandeA): string[] => {
    if (cmd.chantier_id && idsVisibles.has(cmd.chantier_id)) return [cmd.chantier_id]
    const mats = new Set(cmd.lignes.map((l) => l.materiau_id).filter((x): x is string => !!x))
    return [...new Set(reservations.filter((r) => mats.has(r.materiau_id) && idsVisibles.has(r.chantier_id)).map((r) => r.chantier_id))]
  }
  const couvert = new Set<string>() // matériaux déjà commandés (commande en cours, à l'heure ou non)
  for (const cmd of enCours(commandes)) for (const l of cmd.lignes) if (l.materiau_id) couvert.add(l.materiau_id)
  for (const cmd of enCours(commandes)) {
    const retard = retardLivraison(cmd, jour)
    const contenu = cmd.lignes.map((l) => `${qte(l.quantite)} ${l.unite} ${l.nom}`).slice(0, 3).join(', ')
    if (retard > 0) {
      alertes.push({ cle: `livraison:${cmd.id}`, type: 'livraison', gravite: 'critique', titre: LIBELLES_ALERTE.livraison, detail: `${libelleCommande(cmd)} : annoncée le ${fr(cmd.livraison_prevue)}, ${pluriel(retard, 'jour')} de retard (${contenu}).${cmd.relances > 0 ? ` Relancé ${pluriel(cmd.relances, 'fois', 'fois')}${cmd.relance_le && !Number.isNaN(Date.parse(cmd.relance_le)) ? `, dernière relance le ${fr(jourParis(new Date(cmd.relance_le)))}` : ''}.` : ''}`, chantierIds: chantiersDe(cmd), commandeId: cmd.id, materiauIds: cmd.lignes.map((l) => l.materiau_id).filter((x): x is string => !!x), jours: retard })
    } else if (attendueAujourdhui(cmd, jour)) {
      alertes.push({ cle: `attendue:${cmd.id}`, type: 'attendue', gravite: 'info', titre: LIBELLES_ALERTE.attendue, detail: `${libelleCommande(cmd)} (${contenu}).`, chantierIds: chantiersDe(cmd), commandeId: cmd.id, materiauIds: cmd.lignes.map((l) => l.materiau_id).filter((x): x is string => !!x), jours: 0 })
    }
  }

  // 3 ─ Stock à compléter POUR UN CHANTIER : un matériau RÉSERVÉ sous son seuil, ou en quantité insuffisante pour la sortie.
  //     Un matériau déjà commandé n'est pas relancé ici : la commande est suivie (livraison attendue ou en retard).
  for (const c of visibles) {
    const manques = reservations.filter((r) => r.chantier_id === c.id).flatMap((r) => {
      const m = materiaux.get(r.materiau_id)
      if (!m || couvert.has(m.id)) return []
      const insuffisant = m.reste < r.quantite
      return insuffisant || estStockBas(m) ? [{ m, r, insuffisant }] : []
    })
    if (!manques.length) continue
    const critique = manques.some((x) => x.insuffisant)
    alertes.push({
      cle: `stock:${c.id}`, type: 'stock', gravite: critique ? 'critique' : 'attention', titre: LIBELLES_ALERTE.stock,
      detail: manques.slice(0, 3).map(({ m, r }) => `${m.nom} : reste ${qte(m.reste)} ${m.unite}${m.seuil > 0 ? ` (seuil ${qte(m.seuil)})` : ''}, réservé ${qte(r.quantite)}`).join(' · ') + (manques.length > 3 ? ` · +${manques.length - 3}` : ''),
      chantierIds: [c.id], commandeId: null, materiauIds: manques.map((x) => x.m.id), jours: null,
    })
  }

  // 4 ─ Terminé : à facturer. 5 ─ En cours sans personne d'affecté.
  for (const c of visibles) {
    if (aFacturer(c)) alertes.push({ cle: `facturer:${c.id}`, type: 'facturer', gravite: 'attention', titre: LIBELLES_ALERTE.facturer, detail: 'Chantier terminé : la facture reste à émettre ou à encaisser.', chantierIds: [c.id], commandeId: null, materiauIds: [], jours: null })
    if (c.statut === 'en_cours' && c.equipe.length === 0) alertes.push({ cle: `sans_equipe:${c.id}`, type: 'sans_equipe', gravite: 'attention', titre: LIBELLES_ALERTE.sans_equipe, detail: 'Le chantier est en cours et aucun membre de l’équipe n’y est affecté.', chantierIds: [c.id], commandeId: null, materiauIds: [], jours: null })
  }

  alertes.sort((a, b) => ORDRE_GRAVITE[a.gravite] - ORDRE_GRAVITE[b.gravite] || (b.jours ?? 0) - (a.jours ?? 0) || a.cle.localeCompare(b.cle))
  const parChantier = new Map<string, Alerte[]>()
  for (const a of alertes) for (const id of a.chantierIds) parChantier.set(id, [...(parChantier.get(id) ?? []), a])

  const demandesDuJour = d.demandes.filter((x) => (x.recue_le ?? '') === jour).length
  return {
    alertes, parChantier,
    chiffres: {
      retards: alertes.filter((a) => a.type === 'retard').length,
      livraisonsEnRetard: alertes.filter((a) => a.type === 'livraison').length,
      livraisonsAttendues: alertes.filter((a) => a.type === 'attendue').length,
      stockBas: d.materiaux.filter(estStockBas).length,
      aFacturer: visibles.filter(aEncaisser).length,
      sansEquipe: alertes.filter((a) => a.type === 'sans_equipe').length,
      demandes: d.demandes.length, demandesDuJour,
      critiques: alertes.filter((a) => a.gravite === 'critique').length,
    },
  }
}

// ── Les urgences du jour : ce que l'artisan doit regarder en premier ─────────────────────────────────────────────
export type Urgence = {
  cle: string
  gravite: Gravite
  titre: string
  detail: string
  /** Le chantier à ouvrir (le premier concerné), ou null. */
  chantierId: string | null
  /** L'objet de la maquette où aller (« chantier:<id> », « accueil », « categorie:… »), ou null. */
  objetCle: string | null
  type: TypeAlerte | 'demandes' | 'stock_global'
  commandeId: string | null
}

/** La clé de l'objet « rayonnage » d'une catégorie (lib/crm/atelier.ts : `categorie:<nom>`). */
export const cleCategorie = (m: Pick<MateriauA, 'categorie'>): string => `categorie:${(m.categorie ?? '').trim() || 'Sans catégorie'}`

export function urgencesDuJour(d: DonneesAtelier, r: ResumeAlertes = calculerAlertes(d)): Urgence[] {
  const titreChantier = new Map(d.chantiers.map((c) => [c.id, c.titre]))
  const sortie: Urgence[] = r.alertes.map((a) => {
    const nom = a.chantierIds.length ? a.chantierIds.map((id) => titreChantier.get(id) ?? 'Chantier').slice(0, 2).join(', ') : null
    return { cle: a.cle, gravite: a.gravite, titre: nom ? `${a.titre} · ${nom}` : a.titre, detail: a.detail, chantierId: a.chantierIds[0] ?? null, objetCle: a.chantierIds[0] ? `chantier:${a.chantierIds[0]}` : null, type: a.type, commandeId: a.commandeId }
  })
  const bas = d.materiaux.filter(estStockBas)
  if (bas.length) {
    const commandes = d.commandes ?? []
    const dejaCommandes = bas.filter((m) => enCours(commandes).some((c) => c.lignes.some((l) => l.materiau_id === m.id))).length
    sortie.push({
      cle: 'stock_global', gravite: 'attention', type: 'stock_global', commandeId: null, chantierId: null, objetCle: cleCategorie(bas[0]),
      titre: `${pluriel(bas.length, 'matériau', 'matériaux')} sous le seuil`,
      detail: `${bas.slice(0, 3).map((m) => `${m.nom} (${qte(m.reste)} ${m.unite})`).join(', ')}${bas.length > 3 ? `, +${bas.length - 3}` : ''}${dejaCommandes ? ` · ${dejaCommandes} déjà commandé${dejaCommandes > 1 ? 's' : ''}` : ''}.`,
    })
  }
  if (r.chiffres.demandes) {
    sortie.push({
      cle: 'demandes', gravite: r.chiffres.demandesDuJour ? 'attention' : 'info', type: 'demandes', commandeId: null, chantierId: null, objetCle: 'accueil',
      titre: `${pluriel(r.chiffres.demandes, 'nouvelle demande', 'nouvelles demandes')} à traiter`,
      detail: r.chiffres.demandesDuJour ? `Dont ${r.chiffres.demandesDuJour} reçue${r.chiffres.demandesDuJour > 1 ? 's' : ''} aujourd’hui.` : 'Aucune reçue aujourd’hui.',
    })
  }
  return sortie.sort((a, b) => ORDRE_GRAVITE[a.gravite] - ORDRE_GRAVITE[b.gravite])
}

// ── Le briefing du matin : une visite guidée des chantiers, écrite à partir des données ──────────────────────────
export type EtapeBriefing = { cle: string; objetCle: string | null; titre: string; texte: string; gravite: Gravite }

/**
 * Le briefing : d'abord le résumé de la journée, puis chaque chantier qui demande de l'attention (alertes, ou prévu
 * aujourd'hui), le plus urgent d'abord, puis le dépôt (stock) et l'accueil (demandes). `existe` dit quels objets la maquette
 * porte (une étape dont l'objet n'est pas posé reste lue, sans déplacer la caméra). Déterministe : mêmes données, même briefing.
 */
export function construireBriefing(d: DonneesAtelier, existe: (objetCle: string) => boolean = () => true): EtapeBriefing[] {
  const r = calculerAlertes(d)
  const c = r.chiffres
  const etapes: EtapeBriefing[] = []
  const visibles = d.chantiers.filter(chantierVisible)
  const duJour = visibles.filter((x) => estAujourdhui(x, d.jour))
  const noms = (ids: string[]) => ids.map((id) => d.membres.find((m) => m.id === id)?.nom).filter(Boolean) as string[]
  const phrases: string[] = [
    visibles.length ? `${pluriel(duJour.length, 'chantier')} prévu${duJour.length > 1 ? 's' : ''} aujourd’hui sur ${pluriel(visibles.length, 'chantier')} ouvert${visibles.length > 1 ? 's' : ''}.` : 'Aucun chantier ouvert pour le moment.',
    c.critiques ? `${pluriel(c.critiques, 'urgence')} : ${[c.retards && pluriel(c.retards, 'chantier en retard', 'chantiers en retard'), c.livraisonsEnRetard && pluriel(c.livraisonsEnRetard, 'livraison en retard', 'livraisons en retard'), (c.critiques - c.retards - c.livraisonsEnRetard) > 0 && 'un stock insuffisant'].filter(Boolean).join(', ')}.` : 'Aucune urgence.',
  ]
  etapes.push({ cle: 'resume', objetCle: null, gravite: c.critiques ? 'critique' : 'info', titre: 'Bonjour, voici la journée', texte: phrases.join(' ') })

  const rang = (x: ChantierA) => Math.min(...(r.parChantier.get(x.id) ?? []).map((a) => ORDRE_GRAVITE[a.gravite]), 3)
  const ordre = visibles
    .filter((x) => (r.parChantier.get(x.id)?.length ?? 0) > 0 || estAujourdhui(x, d.jour))
    .sort((a, b) => rang(a) - rang(b) || Number(estAujourdhui(b, d.jour)) - Number(estAujourdhui(a, d.jour)) || a.titre.localeCompare(b.titre, 'fr'))
  for (const x of ordre.slice(0, 12)) {
    const al = r.parChantier.get(x.id) ?? []
    const equipe = noms(x.equipe)
    const t = x.taches
    const morceaux = [
      estAujourdhui(x, d.jour) ? (equipe.length ? `Sur place : ${equipe.slice(0, 4).join(', ')}${equipe.length > 4 ? '…' : ''}.` : 'Personne n’est affecté à ce chantier.') : 'Pas d’équipe prévue aujourd’hui.',
      t && t.total ? `${t.faites} tâche${t.faites > 1 ? 's' : ''} faite${t.faites > 1 ? 's' : ''} sur ${t.total}${t.ouvertes[0] ? `, prochaine : ${t.ouvertes[0].libelle}` : ''}.` : null,
      ...al.map((a) => `${a.titre} — ${a.detail}`),
    ].filter(Boolean)
    etapes.push({ cle: `chantier:${x.id}`, objetCle: existe(`chantier:${x.id}`) ? `chantier:${x.id}` : null, gravite: al[0]?.gravite ?? 'info', titre: x.titre, texte: morceaux.join(' ') })
  }
  const bas = d.materiaux.filter(estStockBas)
  if (bas.length) {
    const cle = cleCategorie(bas[0])
    etapes.push({ cle: 'depot', objetCle: existe(cle) ? cle : null, gravite: 'attention', titre: 'Le dépôt', texte: `${pluriel(bas.length, 'matériau', 'matériaux')} sous le seuil : ${bas.slice(0, 4).map((m) => `${m.nom} (${qte(m.reste)} ${m.unite})`).join(', ')}${bas.length > 4 ? '…' : ''}.` })
  }
  if (d.demandes.length) etapes.push({ cle: 'accueil', objetCle: existe('accueil') ? 'accueil' : null, gravite: c.demandesDuJour ? 'attention' : 'info', titre: 'L’accueil', texte: `${pluriel(d.demandes.length, 'nouvelle demande', 'nouvelles demandes')}${c.demandesDuJour ? `, dont ${c.demandesDuJour} reçue${c.demandesDuJour > 1 ? 's' : ''} aujourd’hui` : ''}.` })
  return etapes
}
