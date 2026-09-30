import {
  EMAIL_SOLLICITE_JOUR, META_APPELS_PAR_HEURE, PALIERS, PLAFONDS_DEFAUT,
  SEUILS, TECHNOLOGIES_FORMULAIRE,
  type TechnologieFormulaire,
} from './contrat'

type Periode = 'jour' | 'heure' | 'mois' | 'instant'
type Definition = Readonly<{
  id: string
  libelle: string
  fournisseur: string
  periode: Periode
  plafond: number | 'palier' | 'graine'
  source: 'base' | 'derive'
}>

const definition = (j: Definition): Definition => Object.freeze(j)

export const JAUGES: readonly Definition[] = Object.freeze([
  definition({ id: 'formulaire_jour', libelle: 'Formulaires du jour', fournisseur: 'formulaire_site', periode: 'jour', plafond: 'palier', source: 'derive' }),
  ...TECHNOLOGIES_FORMULAIRE.map((technologie) => definition({ id: `formulaire_technologie:${technologie}`, libelle: `Formulaire ${technologie}`, fournisseur: technologie, periode: 'instant', plafond: SEUILS.echecs_affilee, source: 'derive' })),
  definition({ id: 'email_sollicite_jour', libelle: 'E-mails sollicités du jour', fournisseur: 'email_sollicite', periode: 'jour', plafond: EMAIL_SOLLICITE_JOUR, source: 'derive' }),
  definition({ id: 'reponse_privee_jour', libelle: 'Réponses privées du jour', fournisseur: 'reponse_privee', periode: 'jour', plafond: PLAFONDS_DEFAUT.reponse_privee, source: 'derive' }),
  definition({ id: 'messagerie_jour', libelle: 'Messagerie du jour', fournisseur: 'messagerie', periode: 'jour', plafond: PLAFONDS_DEFAUT.messagerie, source: 'derive' }),
  definition({ id: 'instagram_api', libelle: 'API Instagram', fournisseur: 'instagram_api', periode: 'heure', plafond: 200, source: 'base' }),
  definition({ id: 'meta_ads_archive', libelle: 'Bibliothèque publicitaire Meta', fournisseur: 'meta_ads_archive', periode: 'heure', plafond: META_APPELS_PAR_HEURE, source: 'base' }),
  definition({ id: 'publora', libelle: 'Publora', fournisseur: 'publora', periode: 'mois', plafond: 15, source: 'base' }),
])

type Technologie = { technologie: TechnologieFormulaire; etat: string; echecs_affilee?: number }
type LigneBase = { fournisseur: string; periode?: string; utilise?: number; consomme?: number }
export type DonneesJauges = {
  palier?: string
  envoi_froid?: boolean
  technologies?: Technologie[]
  compteurs?: Record<string, number>
  jauges?: LigneBase[]
  formulaires_jour?: number
  email_sollicite_jour?: number
  reponse_privee_jour?: number
  messagerie_jour?: number
  programmees_a_venir?: number
}

export type JaugeCalculee = {
  id: string
  libelle: string
  utilise: number
  plafond: number
  part: number
  etat: 'ok' | 'attention' | 'pleine'
  reinitialise_le: string | null
  programmees?: number
}

const horlogeParis = new Intl.DateTimeFormat('fr-CA', {
  timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', hourCycle: 'h23',
})

function morceauxParis(date: Date) {
  const p = Object.fromEntries(horlogeParis.formatToParts(date).map((x) => [x.type, x.value]))
  return { jour: `${p.year}-${p.month}-${p.day}`, heure: `${p.year}-${p.month}-${p.day}T${p.hour}`, mois: `${p.year}-${p.month}` }
}

function clePeriode(periode: Periode, date: Date): string {
  return periode === 'instant' ? '' : morceauxParis(date)[periode]
}

function prochainePeriode(periode: Periode, maintenant: Date): string | null {
  if (periode === 'instant') return null
  const cle = clePeriode(periode, maintenant)
  const pas = periode === 'mois' ? 86_400_000 : 3_600_000
  let borne = new Date(Math.floor(maintenant.getTime() / pas) * pas + pas)
  while (clePeriode(periode, borne) === cle) borne = new Date(borne.getTime() + pas)
  let bas = borne.getTime() - pas
  let haut = borne.getTime()
  while (haut - bas > 1000) {
    const milieu = Math.floor((bas + haut) / 2000) * 1000
    if (clePeriode(periode, new Date(milieu)) === cle) bas = milieu
    else haut = milieu
  }
  return new Date(haut).toISOString()
}

function plafondDe(j: Definition, donnees: DonneesJauges): number {
  if (j.plafond === 'palier') return donnees.envoi_froid === false ? 0 : PALIERS.find((p) => p.id === donnees.palier)?.par_jour ?? 0
  if (j.plafond === 'graine') return 0
  return j.plafond
}

function quantite(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(0, v) : 0
}

function utiliseDe(j: Definition, donnees: DonneesJauges, maintenant: Date): number {
  if (j.id.startsWith('formulaire_technologie:')) {
    const technologie = j.id.slice('formulaire_technologie:'.length)
    return quantite(donnees.technologies?.find((t) => t.technologie === technologie)?.echecs_affilee)
  }
  if (donnees.compteurs) return quantite(donnees.compteurs[j.id])
  if (j.id === 'formulaire_jour') return quantite(donnees.formulaires_jour)
  if (j.source === 'derive') return quantite(donnees[j.id as keyof DonneesJauges])
  const periode = clePeriode(j.periode, maintenant)
  return quantite(donnees.jauges?.find((ligne) => ligne.fournisseur === j.id && ligne.periode === periode)?.utilise)
}

export function calculerJauges(donnees: DonneesJauges, maintenant: Date = new Date()): JaugeCalculee[] {
  const lignes = JAUGES.filter((j) => !j.id.startsWith('formulaire_technologie:') || donnees.technologies?.some((t) => j.id === `formulaire_technologie:${t.technologie}`)).map((j) => {
    const plafond = plafondDe(j, donnees)
    const utilise = utiliseDe(j, donnees, maintenant)
    const pause = j.id.startsWith('formulaire_technologie:') && donnees.technologies?.some((t) => j.id === `formulaire_technologie:${t.technologie}` && t.etat === 'pause')
    const part = plafond === 0 ? 1 : utilise / plafond
    const etat = pause || part >= 1 ? 'pleine' : part >= 0.75 ? 'attention' : 'ok'
    return { id: j.id, libelle: j.libelle, utilise, plafond, part, etat, reinitialise_le: prochainePeriode(j.periode, maintenant), ...(j.id === 'publora' ? { programmees: quantite(donnees.programmees_a_venir) } : {}) } as JaugeCalculee
  })
  const rang = { pleine: 0, attention: 1, ok: 2 }
  return lignes.sort((a, b) => rang[a.etat] - rang[b.etat])
}

type MagasinJauges = {
  jaugeConsommer(fournisseur: string, n: number): Promise<boolean>
  jauges(): Promise<DonneesJauges | LigneBase[]>
}

export async function consommerJauge(magasin: MagasinJauges, id: string, n = 1, maintenant: Date = new Date()): Promise<boolean> {
  const jauge = JAUGES.find((j) => j.id === id)
  if (!jauge) throw new Error(`Jauge inconnue : ${id}`)
  if (jauge.source === 'derive') throw new Error(`Jauge dérivée : ${id}`)
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error('Quantité de jauge invalide')
  const plafond = plafondDe(jauge, {})
  if (n > plafond) return false
  const fournisseur = `${jauge.fournisseur}:${clePeriode(jauge.periode, maintenant)}`
  const donnees = await magasin.jauges()
  const lignes = Array.isArray(donnees) ? donnees : donnees.jauges ?? []
  const utilise = quantite(lignes.find((ligne) => ligne.fournisseur === fournisseur)?.utilise ?? lignes.find((ligne) => ligne.fournisseur === fournisseur)?.consomme)
  if (utilise + n > plafond) return false
  return magasin.jaugeConsommer(fournisseur, n)
}
