// Témoin de 026-220 : implémentation de RÉFÉRENCE de la garde Fish Audio (jamais déployée). Elle prouve que le juge
// `scripts/juges-026-completude-qa.mjs --partie=fish` sait être vert ; chaque sabotage de --preuve-echecs le rend rouge.
// Le contrat : `node scripts/juges-026-completude-qa.mjs --contrat=fish`.
//
// Règles tenues : une réponse HTTP 200 prouve l'accès technique, jamais une licence ; l'offre gratuite reste un usage
// interne (média non publiable) ; un usage commercial exige un forfait commercial prouvé, daté, sourcé, non expiré, et
// un quota constaté ; sinon la voix locale ff_siwis, et le manifeste ne nomme pas Fish. Crédit réservé une fois par
// id, consommé au succès, restitué à l'échec. Une voix clonée exige un droit distinct.

export const VOIX_LOCALE = 'ff_siwis'

type Droits = { forfait: string | null; commercial: boolean; prouve_le: string | null; source: string | null; expire_le: string | null }
type Quota = { solde: number | null; constate_le: string | null; source: string | null }
type Registre = { reserver(id: string, credits: number): Promise<boolean> | boolean; consommer(id: string): Promise<void> | void; restituer(id: string): Promise<void> | void }
type Deps = {
  cle: string | null
  sonder: () => Promise<{ statut: number }>
  droits: Droits | null
  quota: Quota | null
  credits: Registre
  memoire: Map<string, any>
  synthFish: (texte: string, voix: string) => Promise<{ audio: string }>
  synthLocal: (texte: string, voix: string) => Promise<{ audio: string }>
  horloge: { maintenant(): number }
}
type Demande = {
  id: string
  usage: 'usage_interne' | 'usage_commercial'
  texte: string
  source_texte: string
  voix?: string
  voix_clonee?: boolean
  droit_clonage?: { accorde: boolean; source: string; date: string } | null
}

export function estimerCredits(texte: string): number { return Math.max(1, Math.ceil(texte.length / 100)) }

async function raisonDeRefusFish(d: Demande, deps: Deps, besoin: number): Promise<string | null> {
  if (!deps.cle) return 'cle_absente'
  const q = deps.quota
  const solde = typeof q?.solde === 'number' ? q.solde : null
  if (solde === null || !q?.constate_le || !q?.source) return 'quota_inconnu'
  if (solde < besoin) return 'quota_epuise'
  if (d.usage === 'usage_commercial') {
    const r = deps.droits
    if (!r || r.commercial !== true || !r.forfait || !r.prouve_le || !r.source) return 'licence_commerciale_absente'
    if (!r.expire_le || Date.parse(r.expire_le) <= deps.horloge.maintenant()) return 'licence_expiree'
  }
  const sonde = await deps.sonder()
  if (sonde.statut !== 200) return 'fish_indisponible'
  return null
}

export async function choisirVoix(d: Demande, deps: Deps): Promise<any> {
  if (!d?.id || !d.texte || !d.source_texte || !['usage_interne', 'usage_commercial'].includes(d.usage)) return { refus: 'demande' }
  if (d.voix_clonee && !(d.droit_clonage?.accorde && d.droit_clonage.source && d.droit_clonage.date)) return { refus: 'clonage' }
  const deja = deps.memoire.get(d.id)
  if (deja) return deja
  const date = new Date(deps.horloge.maintenant()).toISOString()
  const besoin = estimerCredits(d.texte)
  let raison = await raisonDeRefusFish(d, deps, besoin)
  if (!raison) {
    if (!(await deps.credits.reserver(d.id, besoin))) raison = 'reservation_refusee'
    else {
      try {
        await deps.synthFish(d.texte, d.voix || 'fish-voix-essai')
        await deps.credits.consommer(d.id)
        const m = { id: d.id, fournisseur: 'fish', voix: d.voix || 'fish-voix-essai', droit: d.usage, publiable: d.usage === 'usage_commercial', date, source_texte: d.source_texte, credits: besoin }
        deps.memoire.set(d.id, m)
        return m
      } catch {
        await deps.credits.restituer(d.id)
        raison = 'echec_synthese'
      }
    }
  }
  await deps.synthLocal(d.texte, VOIX_LOCALE)
  const m = { id: d.id, fournisseur: 'local', voix: VOIX_LOCALE, droit: 'voix_locale', publiable: true, date, source_texte: d.source_texte, raison_repli: raison }
  deps.memoire.set(d.id, m)
  return m
}
