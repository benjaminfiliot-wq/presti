// L'assistant de gestion de la console — CONFIRMER, REFUSER, ANNULER une action (plans/016, jalon A3).
//
// La règle de fer : une action « à confirmer » (envoi à un client, facture émise, encaissement, suppression, lot de prix) ne
// s'exécute QUE par ce chemin, déclenché par un clic de l'artisan sur sa carte (POST /api/assistant/actions). Le modèle ne
// l'atteint pas : ses outils de cette catégorie ne font que PROPOSER (créer la carte). Ici, rien ne dépend du modèle.
//
// Module pur et injecté (le magasin des actions, les réalisateurs, le journal arrivent en dépendances) : il se rejoue en
// entier dans scripts/assistant-qa.mjs avec un magasin en mémoire.
//  • confirmer : la carte doit être « en_attente » et non expirée ; elle est RÉCLAMÉE en une transition atomique
//    (en_attente → en_cours) — un double clic, deux onglets ou deux requêtes simultanées n'exécutent qu'une fois ;
//  • refuser : la carte est close, rien n'est fait ;
//  • annuler : seulement une action exécutée qui a gardé de quoi se défaire ; l'annulation est un geste de l'artisan
//    (son clic est sa confirmation), exécuté par les « inverses » du serveur, jamais par le modèle.
// Un réalisateur qui échoue ou qui jette laisse la carte en « echec » avec le motif : jamais « en_cours » pour toujours.
import { peutConfirmer, type Annulation, type Apercu, type StatutAction, type TypeObjet } from './cartes'

export type FicheAction = {
  id: string
  artisan_id: string
  conversation_id: string
  tour: number
  outil: string
  mode: 'direct' | 'confirmation'
  statut: StatutAction
  titre: string
  entrees: Record<string, unknown>
  apercu: Apercu
  annulation: Annulation | null
  resultat_resume: string | null
  objet_type: TypeObjet | null
  objet_id: string | null
  cree_le: string
  maj_le: string
  expire_le: string | null
}

export type NouvelleFiche = Omit<FicheAction, 'id' | 'cree_le' | 'maj_le'>

export interface MagasinActions {
  creer(f: NouvelleFiche): Promise<FicheAction>
  lire(artisanId: string, id: string): Promise<FicheAction | null>
  /** Passe de l'un des statuts `de` à `vers` en UNE instruction ; rend la fiche si CETTE requête a fait la transition, null sinon. */
  transiter(artisanId: string, id: string, de: readonly StatutAction[], vers: StatutAction, maj?: Partial<Pick<FicheAction, 'resultat_resume' | 'annulation' | 'objet_type' | 'objet_id'>>): Promise<FicheAction | null>
  /** Date de la dernière exécution de cet outil sur cet objet (relances : pas deux fois de suite), null si jamais. */
  dernierEnvoi(artisanId: string, outil: string, objetId: string): Promise<string | null>
}

export type Realisation =
  | { ok: true; resume: string; objet?: { type: TypeObjet; id: string } | null; annulation?: Annulation | null; donnees?: Record<string, unknown>; apercu?: Partial<Apercu> }
  | { ok: false; erreur: string }

export type Realisateur = (entrees: Record<string, unknown>) => Promise<Realisation>

export type LigneJournalAction = { nom: string; entree: unknown; resultat: 'ok' | 'refus' | 'erreur'; resume: string; objet?: { type: TypeObjet; id: string } | null }

export type DependancesDecision = {
  magasin: MagasinActions
  /** Les réalisations des actions à confirmer (et des directes, pour les rejouer si besoin). */
  realisateurs: Record<string, Realisateur>
  /** Les inverses : de quoi défaire une action directe (Annulation.outil). */
  inverses: Record<string, Realisateur>
  journaliser: (a: LigneJournalAction & { conversationId: string; tour: number }) => Promise<void>
  maintenant?: Date
}

export type CodeRefus = 'introuvable' | 'deja_traitee' | 'expiree' | 'mode' | 'non_annulable' | 'echec' | 'indisponible'
export type ResultatDecision =
  | { ok: true; statut: StatutAction; resume: string; fiche: FicheAction }
  | { ok: false; code: CodeRefus; erreur: string; statut?: StatutAction }

const MESSAGES: Record<Exclude<CodeRefus, 'echec'>, string> = {
  introuvable: 'Cette action est introuvable.',
  deja_traitee: 'Cette action a déjà été traitée : rien n’a été refait.',
  expiree: 'Cette carte a expiré (plus de 24 h) : redemandez l’action à l’assistant.',
  mode: 'Cette action n’est pas à confirmer.',
  non_annulable: 'Cette action ne peut pas être annulée.',
  indisponible: 'L’assistant est indisponible pour l’instant.',
}
const refus = (code: Exclude<CodeRefus, 'echec'>, statut?: StatutAction): ResultatDecision => ({ ok: false, code, erreur: MESSAGES[code], ...(statut ? { statut } : {}) })

async function jouer(r: Realisateur | undefined, entrees: Record<string, unknown>): Promise<Realisation> {
  if (!r) return { ok: false, erreur: 'Cette action n’est pas disponible.' }
  try { return await r(entrees) } catch (e) { return { ok: false, erreur: e instanceof Error && e.message ? `Erreur : ${e.message}`.slice(0, 280) : 'Erreur inattendue.' } }
}

export async function confirmerAction(d: DependancesDecision, artisanId: string, id: string): Promise<ResultatDecision> {
  const fiche = await d.magasin.lire(artisanId, id).catch(() => undefined)
  if (fiche === undefined) return refus('indisponible')
  if (!fiche) return refus('introuvable')
  if (fiche.mode !== 'confirmation') return refus('mode')
  const peut = peutConfirmer(fiche, d.maintenant)
  if (!peut.ok) {
    if (peut.motif === 'expiree') await d.magasin.transiter(artisanId, id, ['en_attente'], 'expiree').catch(() => null)
    return refus(peut.motif === 'expiree' ? 'expiree' : 'deja_traitee', fiche.statut)
  }
  // La réclamation atomique : une seule requête passe de en_attente à en_cours.
  const prise = await d.magasin.transiter(artisanId, id, ['en_attente'], 'en_cours').catch(() => undefined)
  if (prise === undefined) return refus('indisponible')
  if (!prise) return refus('deja_traitee')

  const r = await jouer(d.realisateurs[fiche.outil], fiche.entrees)
  const journal = (resultat: 'ok' | 'refus' | 'erreur', resume: string, objet?: { type: TypeObjet; id: string } | null) =>
    d.journaliser({ nom: fiche.outil, entree: fiche.entrees, resultat, resume, objet: objet ?? null, conversationId: fiche.conversation_id, tour: fiche.tour })
  if (!r.ok) {
    const f = await d.magasin.transiter(artisanId, id, ['en_cours'], 'echec', { resultat_resume: r.erreur.slice(0, 300) }).catch(() => null)
    await journal('refus', `confirmée, non exécutée : ${r.erreur}`.slice(0, 300), fiche.objet_type && fiche.objet_id ? { type: fiche.objet_type, id: fiche.objet_id } : null).catch(() => {})
    return { ok: false, code: 'echec', erreur: r.erreur, statut: f?.statut ?? 'echec' }
  }
  const fin = await d.magasin.transiter(artisanId, id, ['en_cours'], 'executee', {
    resultat_resume: r.resume.slice(0, 300), annulation: r.annulation ?? null,
    ...(r.objet ? { objet_type: r.objet.type, objet_id: r.objet.id } : {}),
  }).catch(() => null)
  await journal('ok', `confirmée par l’artisan : ${r.resume}`.slice(0, 300), r.objet ?? null).catch(() => {})
  return { ok: true, statut: 'executee', resume: r.resume, fiche: fin ?? { ...fiche, statut: 'executee', resultat_resume: r.resume } }
}

export async function refuserAction(d: DependancesDecision, artisanId: string, id: string): Promise<ResultatDecision> {
  const fiche = await d.magasin.lire(artisanId, id).catch(() => undefined)
  if (fiche === undefined) return refus('indisponible')
  if (!fiche) return refus('introuvable')
  if (fiche.mode !== 'confirmation') return refus('mode')
  const f = await d.magasin.transiter(artisanId, id, ['en_attente'], 'refusee', { resultat_resume: 'écartée par l’artisan' }).catch(() => undefined)
  if (f === undefined) return refus('indisponible')
  if (!f) return refus('deja_traitee', fiche.statut)
  await d.journaliser({ nom: fiche.outil, entree: fiche.entrees, resultat: 'ok', resume: 'proposition écartée par l’artisan : rien n’a été fait', objet: null, conversationId: fiche.conversation_id, tour: fiche.tour }).catch(() => {})
  return { ok: true, statut: 'refusee', resume: 'Écartée : rien n’a été fait.', fiche: f }
}

export async function annulerAction(d: DependancesDecision, artisanId: string, id: string): Promise<ResultatDecision> {
  const fiche = await d.magasin.lire(artisanId, id).catch(() => undefined)
  if (fiche === undefined) return refus('indisponible')
  if (!fiche) return refus('introuvable')
  if (fiche.statut !== 'executee' || !fiche.annulation) return refus(fiche.statut === 'annulee' ? 'deja_traitee' : 'non_annulable', fiche.statut)
  const prise = await d.magasin.transiter(artisanId, id, ['executee'], 'en_cours').catch(() => undefined)
  if (prise === undefined) return refus('indisponible')
  if (!prise) return refus('deja_traitee')
  const inverse = fiche.annulation
  const r = await jouer(d.inverses[inverse.outil], inverse.entrees)
  if (!r.ok) {
    // L'annulation a échoué : l'action reste exécutée, avec le motif, et peut être retentée.
    await d.magasin.transiter(artisanId, id, ['en_cours'], 'executee', { resultat_resume: `annulation impossible : ${r.erreur}`.slice(0, 300) }).catch(() => null)
    return { ok: false, code: 'echec', erreur: r.erreur, statut: 'executee' }
  }
  const f = await d.magasin.transiter(artisanId, id, ['en_cours'], 'annulee', { resultat_resume: `annulée : ${r.resume}`.slice(0, 300), annulation: null }).catch(() => null)
  await d.journaliser({ nom: fiche.outil, entree: fiche.entrees, resultat: 'ok', resume: `annulée par l’artisan : ${r.resume}`.slice(0, 300), objet: fiche.objet_type && fiche.objet_id ? { type: fiche.objet_type, id: fiche.objet_id } : null, conversationId: fiche.conversation_id, tour: fiche.tour }).catch(() => {})
  return { ok: true, statut: 'annulee', resume: r.resume, fiche: f ?? { ...fiche, statut: 'annulee', annulation: null } }
}

// ── Un magasin en mémoire (tests, et démonstration du contrat) ──────────────────────────────────────

/** Même contrat que le magasin Supabase (lib/assistant/magasin.ts) : la transition est atomique, un seul appelant la gagne. */
export function magasinEnMemoire(): MagasinActions & { toutes: () => FicheAction[] } {
  const lignes = new Map<string, FicheAction>()
  let n = 0
  return {
    async creer(f) {
      const id = `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`
      const maintenant = new Date().toISOString()
      const fiche: FicheAction = { ...f, id, cree_le: maintenant, maj_le: maintenant }
      lignes.set(id, fiche)
      return { ...fiche }
    },
    async lire(artisanId, id) {
      const f = lignes.get(id)
      return f && f.artisan_id === artisanId ? { ...f } : null
    },
    async transiter(artisanId, id, de, vers, maj = {}) {
      const f = lignes.get(id)
      if (!f || f.artisan_id !== artisanId || !de.includes(f.statut)) return null
      const nouvelle: FicheAction = { ...f, ...maj, statut: vers, maj_le: new Date().toISOString() }
      lignes.set(id, nouvelle)
      return { ...nouvelle }
    },
    async dernierEnvoi(artisanId, outil, objetId) {
      const l = [...lignes.values()].filter((f) => f.artisan_id === artisanId && f.outil === outil && f.objet_id === objetId && f.statut === 'executee').sort((a, b) => b.maj_le.localeCompare(a.maj_le))[0]
      return l?.maj_le ?? null
    },
    toutes: () => [...lignes.values()].map((f) => ({ ...f })),
  }
}
