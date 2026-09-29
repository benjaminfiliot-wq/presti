// Garde de la voix Fish Audio du Studio (fiche 026-224).
//
// Règle centrale : la voix locale `ff_siwis` est la seule voie admissible tant que les droits Fish ne sont pas prouvés.
//   - Une réponse HTTP 200 prouve l'accès technique, jamais un droit commercial ; l'offre gratuite reste un usage
//     interne (média NON publiable, jamais remis à un prospect comme produit commercial).
//   - Deux modes explicites : `usage_interne` et `usage_commercial`. Le second exige un forfait commercial prouvé, daté,
//     sourcé et non expiré, plus un quota constaté (solde, date, source) suffisant pour le texte.
//   - Avant toute synthèse Fish : estimation des crédits, réservation idempotente par id ; consommé au succès, restitué à
//     l'échec. Solde inconnu, relevé périmé, limite dépassée ou licence expirée → voix locale, sans appel ni dépense.
//   - Toute voix clonée exige un droit de clonage distinct, explicite, sourcé et daté ; sinon refus AVANT toute synthèse.
//   - Le manifeste du média garde la voix, le fournisseur, le droit, la date et la source du texte. Il ne nomme jamais Fish
//     quand la voix locale a été choisie, et ne porte jamais la clé.
//
// Cette garde ne prend ni abonnement ni achat : elle décide, et laisse l'appelant (montage 026-158, usines 026-200/209)
// exécuter la synthèse par les fonctions qu'il lui passe. La clé est lue dans presti-secrets par l'appelant (`deps.cle`),
// jamais ici, jamais affichée. Le forfait commercial reste une décision d'argent de Benj : sans elle, `droits` vaut null.

export const VOIX_LOCALE = 'ff_siwis'
export const VOIX_FISH_PAR_DEFAUT = 'fish-voix-catalogue'
/** Un relevé de quota plus ancien que cette durée est traité comme inconnu (fermé). */
export const QUOTA_AGE_MAX_MS = 24 * 3_600_000

export type UsageVoix = 'usage_interne' | 'usage_commercial'
export type Droits = { forfait: string | null; commercial: boolean; prouve_le: string | null; source: string | null; expire_le: string | null }
export type Quota = { solde: number | null; constate_le: string | null; source: string | null }
export type DroitClonage = { accorde: boolean; source: string; date: string }
export type Registre = {
  reserver(id: string, credits: number): Promise<boolean> | boolean
  consommer(id: string): Promise<void> | void
  restituer(id: string): Promise<void> | void
}
export type LigneJournal = { id: string; etape: string; critere: string; heure: string }
export type Deps = {
  cle: string | null
  sonder: () => Promise<{ statut: number }>
  droits: Droits | null
  quota: Quota | null
  credits: Registre
  memoire: Map<string, any>
  synthFish: (texte: string, voix: string) => Promise<{ audio: string }>
  synthLocal: (texte: string, voix: string) => Promise<{ audio: string }>
  horloge: { maintenant(): number }
  /** Facultatif : un id, l'étape, le critère et l'heure. Jamais de texte, d'adresse ni de valeur de clé. */
  journal?: (ligne: LigneJournal) => void
}
export type Demande = {
  id: string
  usage: UsageVoix
  texte: string
  source_texte: string
  voix?: string
  voix_clonee?: boolean
  droit_clonage?: DroitClonage | null
}
export type Refus = { refus: string; critere: string }

const USAGES: readonly string[] = ['usage_interne', 'usage_commercial']

/** Estimation prudente : un crédit par tranche de 100 caractères, au moins un. Dans l'unité du solde constaté. */
export function estimerCredits(texte: string): number { return Math.max(1, Math.ceil(String(texte).length / 100)) }

const date = (s: unknown): number | null => {
  if (typeof s !== 'string' || !s.trim()) return null
  const t = Date.parse(s)
  return Number.isFinite(t) ? t : null
}

function droitClonageValide(c: DroitClonage | null | undefined, maintenant: number): boolean {
  if (!c || c.accorde !== true || !c.source || !String(c.source).trim()) return false
  const t = date(c.date)
  return t !== null && t <= maintenant
}

/** Le critère qui ferme la voie Fish, ou null si Fish est admissible. Aucun effet de bord avant la sonde. */
async function critereDeFermeture(d: Demande, deps: Deps, besoin: number): Promise<string | null> {
  const maintenant = deps.horloge.maintenant()
  if (!deps.cle) return 'cle_absente'
  const q = deps.quota
  const solde = typeof q?.solde === 'number' && Number.isFinite(q.solde) ? q.solde : null
  const releve = date(q?.constate_le)
  if (solde === null || releve === null || !q?.source) return 'quota_inconnu'
  if (releve > maintenant || maintenant - releve > QUOTA_AGE_MAX_MS) return 'quota_perime'
  if (solde < besoin) return 'quota_insuffisant'
  if (d.usage === 'usage_commercial') {
    const r = deps.droits
    if (!r || r.commercial !== true || !r.forfait || !r.source) return 'licence_commerciale_absente'
    const prouve = date(r.prouve_le)
    if (prouve === null || prouve > maintenant) return 'licence_non_prouvee'
    const expire = date(r.expire_le)
    if (expire === null) return 'licence_sans_echeance'
    if (expire <= maintenant) return 'licence_expiree'
  }
  let statut: number
  try { statut = (await deps.sonder()).statut } catch { return 'service_indisponible' }
  if (statut !== 200) return 'service_indisponible'
  return null
}

function noter(deps: Deps, id: string, etape: string, critere: string): void {
  try { deps.journal?.({ id, etape, critere, heure: new Date(deps.horloge.maintenant()).toISOString() }) } catch { /* le journal ne décide de rien */ }
}

async function decider(d: Demande, deps: Deps): Promise<any> {
  const maintenant = new Date(deps.horloge.maintenant()).toISOString()
  const besoin = estimerCredits(d.texte)
  const voixDemandee = d.voix && String(d.voix).trim() ? String(d.voix) : null
  let critere: string | null = voixDemandee === VOIX_LOCALE ? 'voix_locale_demandee' : await critereDeFermeture(d, deps, besoin)
  if (!critere) {
    const voix = voixDemandee ?? VOIX_FISH_PAR_DEFAUT
    let reserve = false
    try { reserve = (await deps.credits.reserver(d.id, besoin)) === true } catch { reserve = false }
    if (!reserve) critere = 'reservation_refusee'
    else {
      let synthese = false
      try { await deps.synthFish(d.texte, voix); synthese = true } catch { /* l'échec se lit sur le critère, jamais sur le message (il pourrait porter la clé) */ }
      if (!synthese) {
        try { await deps.credits.restituer(d.id) } catch { /* restitution en échec : le crédit reste réservé, à réconcilier */ }
        critere = 'echec_synthese'
      } else {
        let compta = 'consomme'
        try { await deps.credits.consommer(d.id) } catch { compta = 'a_reconcilier' }
        const commercial = d.usage === 'usage_commercial'
        noter(deps, d.id, 'voix', commercial ? 'fish_commercial' : 'fish_interne')
        return {
          id: d.id, fournisseur: 'fish', voix, droit: d.usage, publiable: commercial, date: maintenant, source_texte: d.source_texte,
          credits: besoin, comptabilite: compta,
          ...(commercial ? { licence: { forfait: deps.droits?.forfait ?? null, prouve_le: deps.droits?.prouve_le ?? null, source: deps.droits?.source ?? null, expire_le: deps.droits?.expire_le ?? null } } : {}),
          ...(d.voix_clonee ? { droit_clonage: { source: d.droit_clonage?.source ?? null, date: d.droit_clonage?.date ?? null } } : {}),
        }
      }
    }
  }
  // Repli : voix locale, sans coût ajouté. Le manifeste n'emploie pas le nom du fournisseur refusé.
  noter(deps, d.id, 'repli_local', critere ?? 'inconnu')
  await deps.synthLocal(d.texte, VOIX_LOCALE)
  return { id: d.id, fournisseur: 'local', voix: VOIX_LOCALE, droit: 'voix_locale', publiable: true, date: maintenant, source_texte: d.source_texte, raison_repli: critere }
}

export async function choisirVoix(d: Demande, deps: Deps): Promise<any> {
  // Toute entrée invalide échoue ici, avant la mémoire, la sonde, la réservation et la synthèse.
  if (!d || typeof d.id !== 'string' || !d.id.trim()) return { refus: 'demande', critere: 'id_absent' } satisfies Refus
  if (!USAGES.includes(d.usage)) return { refus: 'demande', critere: 'usage_inconnu' } satisfies Refus
  if (typeof d.texte !== 'string' || !d.texte.trim()) return { refus: 'demande', critere: 'texte_absent' } satisfies Refus
  if (typeof d.source_texte !== 'string' || !d.source_texte.trim()) return { refus: 'demande', critere: 'source_texte_absente' } satisfies Refus
  if (d.voix_clonee && !droitClonageValide(d.droit_clonage, deps.horloge.maintenant())) return { refus: 'clonage', critere: 'droit_clonage_absent' } satisfies Refus
  // Idempotence : un id déjà servi (ou en cours) rend le même manifeste, sans nouvelle synthèse ni réservation.
  const deja = deps.memoire.get(d.id)
  if (deja) return deja
  const enCours = decider(d, deps)
  deps.memoire.set(d.id, enCours)
  try {
    const m = await enCours
    deps.memoire.set(d.id, m)
    return m
  } catch (e) {
    deps.memoire.delete(d.id)
    throw e
  }
}
