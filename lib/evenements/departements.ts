// Le relevé du matin des événements des départements (tâche 036-036).
//
// L'app RANGE des faits datés, n8n DÉCIDE (règle n8n-first, .claude/rules/architecture-outils.md). Ce module ne fait que constater, une fois
// par jour (appelé par app/api/cron/relances, 8 h), les faits que le temps fait naître et qu'aucune route ne voit passer :
//   - une facture émise échue sans paiement (palier J+3, J+10, J+21)           → `impaye_echu`         → Facturation ;
//   - un chantier dont la demande d'avis est due (fin + 2 jours, fenêtre 3 j)  → `chantier_termine`    → Après-chantier ;
//   - un article de l'inventaire sous son seuil d'alerte                     → `stock_sous_le_seuil` → Opérations ;
//   - le point du matin de chaque compte                                     → `page_du_matin`       → Direction.
// Il n'écrit QUE pour les comptes dont l'interrupteur général des agents est en marche (`departements_reglages`, ligne « tous », 0193) :
// un compte sans système d'agents ne reçoit aucun événement. Les faits sont ceux d'ecrivain.ts : sans texte libre, idempotents (clé unique).
//
// Exception n8n-first, écrite (architecture-outils.md) : ce relevé est un CONSTAT (lectures et une écriture idempotente d'événements), pas une
// automatisation ; il ne décide, n'envoie et ne prépare rien. Les montants et quantités sont calculés ICI, par le code (le contrat des chefs
// interdit à n8n de calculer un montant). Jamais bloquant : aucune exception ne sort, chaque lecture est bornée, un échec n'est qu'un bilan.
//
// Module sans import de l'app (le juge scripts/evenements-departements-qa.mjs le charge tel quel) : le client Supabase est injecté.

import {
  ecrireEvenements, evenementChantierTermine, evenementImpayeEchu, evenementPageDuMatin, evenementStockSousLeSeuil,
  type ClientEvenements, type Evenement,
} from './ecrivain.ts'

/** Délai d'une lecture ; au-delà, elle est abandonnée et le relevé continue sans elle. */
export const DELAI_LECTURE_MS = 4000
/** Comptes servis par passage, et lignes lues par table et par passage (bornes). */
export const MAX_COMPTES = 200
export const MAX_LIGNES = 2000
/** La demande d'avis est due DELAI_AVIS_JOURS après la fin réelle (copie de lib/apresChantier.ts:23, comparée par le juge) : le fait
 *  `chantier_termine` naît ce jour-là, pour que le chef Après-chantier le trouve dû ; au-delà de la fenêtre, ce n'est plus un fait du jour. */
export const DELAI_AVIS_JOURS = 2
export const FENETRE_CHANTIER_JOURS = 3
/** Contestations lues par passage (une lecture des messages du client chacune) : au-delà, le fait reste nul (inconnu). */
export const MAX_CONTESTATIONS = 50

type Ligne = Record<string, unknown>
type Reponse = { data: Ligne[] | null; error: { message?: string } | null }
/** Le strict nécessaire du client Supabase en lecture : une requête construite par l'appelant, rendue en promesse. */
// Pas d'intersection avec ClientEvenements : deux signatures de `from` se croiseraient, et TypeScript retiendrait celle qui ne connaît que
// `upsert`. Un `from` qui rend `any` reste assignable à ClientEvenements pour l'écrivain.
export type ClientReleve = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- les surcharges génériques de supabase-js ne se recopient pas ici
  from: (table: string) => any
}

export type BilanReleve = {
  ok: boolean
  comptes: number
  evenements: { impaye_echu: number; chantier_termine: number; stock_sous_le_seuil: number; page_du_matin: number }
  ecrits: number
  erreurs: string[]
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** Le jour de Paris (AAAA-MM-JJ) d'un instant. */
export function jourDeParis(t: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(t)
}

/** Euros (numeric de la base) vers centimes entiers : un calcul du CODE, jamais de n8n. Hors forme : null. */
export function centimes(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : null
}

async function lire(requete: PromiseLike<Reponse>, nom: string, erreurs: string[]): Promise<Ligne[]> {
  let minuterie: ReturnType<typeof setTimeout> | undefined
  try {
    const delai = new Promise<Reponse>((r) => { minuterie = setTimeout(() => r({ data: null, error: { message: 'delai_depasse' } }), DELAI_LECTURE_MS) })
    const r = await Promise.race([Promise.resolve(requete), delai])
    if (!r || r.error) { erreurs.push(nom + ' : ' + String(r?.error?.message ?? 'erreur').slice(0, 80)); return [] }
    return Array.isArray(r.data) ? r.data : []
  } catch (e) {
    erreurs.push(nom + ' : exception ' + String((e as Error)?.message ?? e).slice(0, 60))
    return []
  } finally {
    if (minuterie) clearTimeout(minuterie)
  }
}

/** Constate les faits du matin et les range dans `evenements_metier`. Ne lève jamais. */
export type OptionsReleve = {
  /** Le client de cette facture la conteste-t-il ? (code des impayés, injecté par l'appelant) ; null = non lu. Ne doit jamais lever. */
  contestation?: (artisanId: string, factureId: string) => Promise<boolean | null>
  /** Le client (son adresse, qui ne sort pas d'ici) a-t-il refusé les messages d'après-chantier ? (lib/crm/apresOpposition.ts) ; doute = vrai. */
  oppose?: (artisanId: string, email: string) => Promise<boolean>
}

/** Une promesse bornée : au-delà du délai, ou en cas d'exception, la valeur de repli. */
async function borne<T>(p: () => Promise<T>, repli: T, delaiMs: number): Promise<T> {
  let minuterie: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([p().catch(() => repli), new Promise<T>((r) => { minuterie = setTimeout(() => r(repli), delaiMs) })])
  } catch {
    return repli
  } finally {
    if (minuterie) clearTimeout(minuterie)
  }
}

export async function releverEvenementsDuMatin(client: ClientReleve, maintenant: Date = new Date(), opts: OptionsReleve = {}): Promise<BilanReleve> {
  const erreurs: string[] = []
  const bilan: BilanReleve = { ok: false, comptes: 0, evenements: { impaye_echu: 0, chantier_termine: 0, stock_sous_le_seuil: 0, page_du_matin: 0 }, ecrits: 0, erreurs }
  try {
    const jour = jourDeParis(maintenant)
    // 1. Les comptes dont le système d'agents est en marche (interrupteur général, palier simulation ou ombre : jamais « arrêt »).
    const reglages = await lire(client.from('departements_reglages').select('artisan_id, palier, en_marche').eq('departement', 'tous').eq('en_marche', true)
      .in('palier', ['simulation', 'ombre']).limit(MAX_COMPTES), 'departements_reglages', erreurs)
    const comptes = [...new Set(reglages.map((r) => String(r.artisan_id)).filter((id) => UUID.test(id)))].sort().slice(0, MAX_COMPTES)
    bilan.comptes = comptes.length
    if (!comptes.length) { bilan.ok = erreurs.length === 0; return bilan }
    const evs: (Evenement | null)[] = []

    // 2. Factures émises, hors avoir, échues : un événement par palier atteint (le chef relit la facture avant toute carte).
    const factures = await lire(client.from('factures').select('id, artisan_id, statut, avoir_de, date_echeance, total_ttc').in('artisan_id', comptes)
      .eq('statut', 'emise').is('avoir_de', null).lt('date_echeance', jour).limit(MAX_LIGNES), 'factures', erreurs)
    let contestationsLues = 0
    for (const f of factures) {
      const base = { artisanId: String(f.artisan_id), factureId: String(f.id), dateEcheance: String(f.date_echeance ?? ''), montantTtcCentimes: centimes(f.total_ttc), maintenant }
      if (!evenementImpayeEchu(base)) continue // avant J+3 : aucun fait, aucune lecture des messages du client
      let contestation: boolean | null = null
      if (opts.contestation && contestationsLues < MAX_CONTESTATIONS) { contestationsLues++; contestation = await borne(() => opts.contestation!(base.artisanId, base.factureId), null, DELAI_LECTURE_MS) }
      const ev = evenementImpayeEchu({ ...base, contestation: typeof contestation === 'boolean' ? contestation : null })
      if (ev) { evs.push(ev); bilan.evenements.impaye_echu++ }
    }

    // 3. Chantiers terminés dans la fenêtre : l'Après-chantier (demande d'avis, rappel d'entretien) les reprend.
    const jourMoins = (n: number) => new Date(Date.parse(jour + 'T12:00:00Z') - n * 86400000).toISOString().slice(0, 10)
    const chantiers = await lire(client.from('chantiers').select('id, artisan_id, statut, date_fin_reelle, devis_id').in('artisan_id', comptes)
      .eq('statut', 'termine').gte('date_fin_reelle', jourMoins(DELAI_AVIS_JOURS + FENETRE_CHANTIER_JOURS)).lte('date_fin_reelle', jourMoins(DELAI_AVIS_JOURS)).limit(MAX_LIGNES), 'chantiers', erreurs)
    // Le canal de la demande d'avis : un BOOLÉEN (le devis du chantier porte-t-il une adresse ?), jamais l'adresse, qui ne quitte pas ce module.
    const devisIds = [...new Set(chantiers.map((c) => String(c.devis_id)).filter((id) => UUID.test(id)))].slice(0, MAX_LIGNES)
    const avecEmail = new Set<string>(), opposes = new Map<string, boolean | null>()
    if (devisIds.length) for (const d of await lire(client.from('devis').select('id, artisan_id, client_email').in('artisan_id', comptes).in('id', devisIds).limit(MAX_LIGNES), 'devis', erreurs))
      if (typeof d.client_email === 'string' && d.client_email.includes('@')) {
        const k = String(d.artisan_id) + '|' + String(d.id)
        avecEmail.add(k)
        // L'opposition est lue par le code de l'app (empreinte de l'adresse) ; seul le booléen devient un fait. Sans lecteur : nul (inconnu).
        opposes.set(k, opts.oppose ? await borne(() => opts.oppose!(String(d.artisan_id), String(d.client_email)), true, DELAI_LECTURE_MS) : null)
      }
    // Un litige en cours sur le dossier : une facture de ce devis dont les relances sont arrêtées pour « litige », sans reprise. Lecture en
    // erreur : nul (inconnu), et le chef s'abstient.
    const litiges = new Set<string>()
    let litigesLus = devisIds.length === 0
    if (devisIds.length) {
      const nErr = erreurs.length
      const fac = await lire(client.from('factures').select('id, artisan_id, devis_id').in('artisan_id', comptes).in('devis_id', devisIds).limit(MAX_LIGNES), 'factures des chantiers', erreurs)
      const parFacture = new Map(fac.map((f) => [String(f.id), String(f.artisan_id) + '|' + String(f.devis_id)]))
      if (parFacture.size) for (const a of await lire(client.from('relances_impayes_arrets').select('facture_id, artisan_id').in('artisan_id', comptes).in('facture_id', [...parFacture.keys()])
        .eq('motif', 'litige').is('reprise_le', null).limit(MAX_LIGNES), 'arrêts pour litige', erreurs)) { const k = parFacture.get(String(a.facture_id)); if (k) litiges.add(k) }
      litigesLus = erreurs.length === nErr
    }
    for (const c of chantiers) {
      const devisId = UUID.test(String(c.devis_id)) ? String(c.devis_id) : null
      const ev = evenementChantierTermine({ artisanId: String(c.artisan_id), chantierId: String(c.id), dateFinReelle: String(c.date_fin_reelle ?? ''), devisId,
        emailConnu: devisId !== null && avecEmail.has(String(c.artisan_id) + '|' + devisId),
        opposition: devisId !== null && opposes.has(String(c.artisan_id) + '|' + devisId) ? opposes.get(String(c.artisan_id) + '|' + devisId) ?? null : null,
        litige: litigesLus ? devisId !== null && litiges.has(String(c.artisan_id) + '|' + devisId) : null })
      if (ev) { evs.push(ev); bilan.evenements.chantier_termine++ }
    }

    // 4. Articles sous leur seuil : la quantité totale est la somme des emplacements (stock), calculée ici.
    const materiaux = await lire(client.from('materiaux').select('id, artisan_id, seuil_alerte, stock(quantite)').in('artisan_id', comptes).gt('seuil_alerte', 0)
      .limit(MAX_LIGNES), 'materiaux', erreurs)
    for (const m of materiaux) {
      const lignes = Array.isArray(m.stock) ? (m.stock as Ligne[]) : []
      const quantite = lignes.reduce((n, l) => n + (Number.isFinite(Number(l.quantite)) ? Number(l.quantite) : 0), 0)
      const ev = evenementStockSousLeSeuil({ artisanId: String(m.artisan_id), materiauId: String(m.id), quantite: Math.round(quantite * 100) / 100, seuil: Number(m.seuil_alerte), jour })
      if (ev) { evs.push(ev); bilan.evenements.stock_sous_le_seuil++ }
    }

    // 5. Le point du matin de chaque compte servi.
    for (const a of comptes) { const ev = evenementPageDuMatin({ artisanId: a, jour }); if (ev) { evs.push(ev); bilan.evenements.page_du_matin++ } }

    // 6. Une seule écriture, idempotente (on conflict do nothing) : un passage rejoué n'écrit rien deux fois.
    const e = await ecrireEvenements(client, evs, DELAI_LECTURE_MS)
    if (!e.ok) erreurs.push('ecriture : ' + e.raison)
    else bilan.ecrits = e.nombre
    bilan.ok = erreurs.length === 0
    return bilan
  } catch (e) {
    erreurs.push('exception : ' + String((e as Error)?.message ?? e).slice(0, 80))
    return bilan
  }
}
