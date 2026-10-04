// TÉMOIN du Comptable (fiche 026-242) : implémentation minimale de RÉFÉRENCE, jamais déployée, qui n'existe que pour prouver
// que scripts/comptable-qa.mjs sait passer au vert ET rougir. Ce n'est pas le module de 026-243 ; il n'en dit rien.
// Contrat (le même que celui que le juge exerce) : rapprocher, suivreSeuil, totalRecettes, preparerDeclaration, libelleRecette.
import { MOTEUR_DE } from '../agents/moteurs.mjs'
// @@SABOTAGE-IMPORTS

const GABARIT_LIBELLE = 'Recette encaissée et rapprochée avec une vente'
const DELAI_LIBELLE_MS = 1500

const somme = (lignes) => lignes.reduce((t, l) => t + l.montant, 0)
const trimestre = (date) => `${date.slice(0, 4)}-T${Math.ceil(Number(date.slice(5, 7)) / 3)}`

/** Rapproche chaque paiement Stripe réussi d'une vente par son identifiant externe. Lecture seule : aucune écriture Stripe. */
export async function rapprocher({ stripe, commandes = [], abonnements = [], journal }) {
  const evenements = await stripe.evenements.lister()
  const ventes = new Map([...commandes, ...abonnements].map((v) => [v.ref, v]))
  const vus = new Set()
  const rapproches = [], orphelins = [], ecarts = [], remboursements = []
  let doublons = 0
  for (const ev of evenements) {
    if (ev.type === 'charge.refunded') { remboursements.push({ id_stripe: ev.id_stripe, ref: ev.ref_externe, montant: ev.montant }); continue }
    if (ev.type !== 'charge.succeeded') continue
    if (vus.has(ev.id_stripe)) { doublons++; continue } // @@DEDOUBLONNAGE
    vus.add(ev.id_stripe)
    const vente = ev.ref_externe ? ventes.get(ev.ref_externe) : undefined
    if (!vente) { orphelins.push({ id_stripe: ev.id_stripe, montant: ev.montant, date: ev.date }); continue }
    if (vente.montant !== ev.montant) { ecarts.push({ id_stripe: ev.id_stripe, ref: ev.ref_externe, montant_stripe: ev.montant, montant_commande: vente.montant, date: ev.date }); continue } // @@ECART
    rapproches.push({ id_stripe: ev.id_stripe, ref: ev.ref_externe, montant: ev.montant, date: ev.date })
  }
  const resultat = { rapproches, orphelins, ecarts, remboursements, doublons, recettes: somme(rapproches) }
  if (journal) ecrireJournal(journal, resultat)
  return resultat
}

/** Une ligne par rapprochement, sans numéro de carte ni secret ; rejouer le même jeu n'ajoute rien (clé = id Stripe). */
function ecrireJournal(journal, resultat) {
  const deja = new Set(journal.lire().map((l) => l.cle))
  const lignes = [
    ...resultat.rapproches.map((r) => ({ type: 'rapprochement', cle: `rapprochement:${r.id_stripe}`, periode: trimestre(r.date), montant: r.montant, id_stripe: r.id_stripe })),
    ...resultat.orphelins.map((o) => ({ type: 'orphelin', cle: `orphelin:${o.id_stripe}`, periode: trimestre(o.date), montant: o.montant, id_stripe: o.id_stripe })),
    ...resultat.ecarts.map((x) => ({ type: 'ecart', cle: `ecart:${x.id_stripe}`, periode: trimestre(x.date), montant: x.montant_stripe, id_stripe: x.id_stripe })),
  ]
  for (const l of lignes) if (!deja.has(l.cle)) journal.ecrire(l) // @@IDEMPOTENCE
}

/** Bornes inclusives d'une période « AAAA » ou « AAAA-Tn ». */
function bornes(periode) {
  const m = /^(\d{4})(?:-T([1-4]))?$/.exec(String(periode))
  if (!m) throw new Error(`période illisible : ${periode}`)
  if (!m[2]) return [`${m[1]}-01-01`, `${m[1]}-12-31`]
  const t = Number(m[2])
  const mois = (n) => String(n).padStart(2, '0')
  return [`${m[1]}-${mois(t * 3 - 2)}-01`, `${m[1]}-${mois(t * 3)}-31`]
}

/** L'UNIQUE calcul d'un total de recettes : les seules recettes rapprochées, sur la période (jamais orphelins ni écarts). */
function recettesDe(resultat, periode) {
  const [du, au] = bornes(periode)
  return somme(resultat.rapproches.filter((r) => r.date >= du && r.date <= au))
}

/** Le total que la tuile « Recettes » affichera. */
export function totalRecettes(resultat, periode) {
  return recettesDe(resultat, periode)
}

/** Cumul de l'année civile, alerte à 90 %, franchissement daté. Un seuil sans source datée est refusé. */
export function suivreSeuil(resultat, seuil, annee) {
  if (!seuil || !Number.isFinite(seuil.montant_centimes) || !seuil.source || !seuil.date_source) throw new Error('seuil_sans_source')
  const lignes = resultat.rapproches.filter((r) => r.date.startsWith(String(annee))).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  let cumul = 0, depasse_le = null
  for (const l of lignes) {
    cumul += l.montant
    if (depasse_le === null && cumul > seuil.montant_centimes) depasse_le = l.date
  }
  const etat = depasse_le ? 'seuil_depasse' : cumul >= seuil.montant_centimes * 0.9 ? 'approche_seuil' : 'ok'
  return { annee, cumul, seuil: seuil.montant_centimes, pourcent: Math.round((cumul / seuil.montant_centimes) * 1000) / 10, etat, depasse_le }
}

/** Prépare des montants : ne dépose rien, ne paie rien. La franchise en base fixe la TVA à 0. */
export function preparerDeclaration(periode, resultat, { maintenant } = {}) {
  return {
    periode,
    recettes: recettesDe(resultat, periode),
    tva: 0,
    source: 'rapprochement Stripe et ventes : montants préparés, ni déposés ni payés',
    prepare_le: (maintenant ?? new Date()).toISOString(),
  }
}

function libelleGabarit(ligne) {
  const euros = (Number(ligne?.montant ?? 0) / 100).toFixed(2).replace('.', ',')
  return `${GABARIT_LIBELLE} (${euros} €)`
}

/** Un libellé : Codex via la porte des agents s'il répond vite, sinon le gabarit fixe. Ne tranche jamais un montant. */
export async function libelleRecette(ligne, { appeler } = {}) {
  const entree = MOTEUR_DE.comptable
  if (typeof appeler !== 'function' || !entree || entree.moteur !== 'codex' || entree.personnelles !== true) return libelleGabarit(ligne)
  try {
    const attente = new Promise((res) => setTimeout(() => res(null), DELAI_LIBELLE_MS).unref())
    const texte = await Promise.race([appeler({ agent: 'comptable', tache: 'libelle', texte: `Libellé court pour une recette de ${ligne?.montant} centimes` }), attente]) // @@LIBELLE
    return typeof texte === 'string' && texte.trim() ? texte.trim() : libelleGabarit(ligne)
  } catch {
    return libelleGabarit(ligne)
  }
}
