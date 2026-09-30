import { FAITS, type Fait } from './faits'
import { jugerPublication, PHRASE_AIMANT, type Canal } from './juge'

export const PHRASES_GABARIT = [
  'Presti accompagne les artisans au quotidien.',
  'Un outil concret pour votre activité.',
] as const

type Etat = {
  publies_mois: number
  externes_mois: number
  programmees_a_venir: number
  recents: { fait_id: string; date: string }[]
  canaux_semaine: string[]
  drapeaux: Record<string, boolean>
  /** Compatibilité avec les anciens états du juge. */
  a_venir?: number
  faits_publies?: Record<string, string>
}

type Publication = { canal: Canal; texte: string; fait_ids: string[]; visuel?: string; media?: string; programmee_pour: string }

function calendrierParis(date: Date): { annee: number; mois: number; jour: number } {
  const parties = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const valeur = (type: string) => Number(parties.find((p) => p.type === type)?.value)
  return { annee: valeur('year'), mois: valeur('month'), jour: valeur('day') }
}

function midiParis(annee: number, mois: number, jour: number): Date {
  const midiUtc = new Date(Date.UTC(annee, mois - 1, jour, 12))
  const heureParis = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', hourCycle: 'h23' }).format(midiUtc))
  return new Date(midiUtc.getTime() - (heureParis - 12) * 3_600_000)
}

function lundiCivil(date: Date): Date {
  const { annee, mois, jour } = calendrierParis(date)
  const civil = new Date(Date.UTC(annee, mois - 1, jour))
  const jourSemaine = civil.getUTCDay() || 7
  civil.setUTCDate(civil.getUTCDate() + 1 - jourSemaine)
  return civil
}

export function cleSemaine(maintenant: Date): string {
  const jeudi = lundiCivil(maintenant)
  jeudi.setUTCDate(jeudi.getUTCDate() + 3)
  const annee = jeudi.getUTCFullYear()
  const premierJeudi = new Date(Date.UTC(annee, 0, 4))
  const jour = premierJeudi.getUTCDay() || 7
  premierJeudi.setUTCDate(premierJeudi.getUTCDate() + 4 - jour)
  const semaine = 1 + Math.round((jeudi.getTime() - premierJeudi.getTime()) / 604_800_000)
  return `${annee}-S${String(semaine).padStart(2, '0')}`
}

export function horairesSemaine(maintenant: Date): Date[] {
  const lundi = lundiCivil(maintenant)
  return [0, 2, 4].map((decalage) => {
    const jour = new Date(lundi)
    jour.setUTCDate(jour.getUTCDate() + decalage)
    return midiParis(jour.getUTCFullYear(), jour.getUTCMonth() + 1, jour.getUTCDate())
  }).filter((date) => date.getTime() > maintenant.getTime() && date.getTime() - maintenant.getTime() <= 604_800_000)
}

function decalageStable(cle: string, canal: Canal, taille: number): number {
  let valeur = 0
  for (const signe of `${cle}:${canal}`) valeur = (valeur * 31 + signe.charCodeAt(0)) >>> 0
  return valeur % taille
}

export function composerLot(
  etat: Etat,
  maintenant: Date,
  options: { horizonHeures?: number } = {},
): Publication[] {
  const reste = Math.max(0, Math.min(3, 15 - (etat.publies_mois || 0) - (etat.externes_mois || 0), 3 - (etat.programmees_a_venir ?? etat.a_venir ?? 0)))
  if (reste === 0) return []
  const horizon = Math.min(168, Math.max(0, options.horizonHeures ?? 168)) * 3_600_000
  const debut = maintenant.getTime() + 600_000
  const fin = maintenant.getTime() + horizon
  const recents = new Set<string>()
  const dates = [...(etat.recents || []), ...Object.entries(etat.faits_publies || {}).map(([fait_id, date]) => ({ fait_id, date }))]
  for (const recent of dates) {
    const age = maintenant.getTime() - new Date(recent.date).getTime()
    if (Number.isFinite(age) && age >= 0 && age < 30 * 86_400_000) recents.add(recent.fait_id)
  }
  const drapeaux = etat.drapeaux || {}
  const disponibles = FAITS.filter((fait) => !recents.has(fait.id) && (!fait.drapeau || drapeaux[fait.drapeau] === true))
  const faitsJuge = Object.fromEntries(FAITS.map((fait) => [fait.id, fait]))
  const resultat: Publication[] = []
  const jours: Canal[] = ['instagram', 'facebook', 'linkedin']
  const lundi = lundiCivil(maintenant)
  for (const [index, canal] of jours.entries()) {
    if (resultat.length >= reste || etat.canaux_semaine?.includes(canal)) continue
    const civil = new Date(lundi)
    civil.setUTCDate(civil.getUTCDate() + index * 2)
    const creneau = midiParis(civil.getUTCFullYear(), civil.getUTCMonth() + 1, civil.getUTCDate())
    if (creneau.getTime() < debut || creneau.getTime() > fin) continue
    const candidats = disponibles.filter((fait) => fait.canaux.includes(canal))
    const nombre = canal === 'linkedin' ? 2 : 1
    if (candidats.length < nombre) continue
    const depart = decalageStable(cleSemaine(maintenant), canal, candidats.length)
    const faits: Fait[] = []
    for (let n = 0; n < candidats.length && faits.length < nombre; n++) {
      const fait = candidats[(depart + n) % candidats.length]
      faits.push(fait)
    }
    const phrases = [PHRASES_GABARIT[0], ...faits.map((fait) => fait.texte)]
    if (canal === 'linkedin') phrases.push(PHRASES_GABARIT[1])
    else if (drapeaux.aimantSite === true) phrases.push(PHRASE_AIMANT)
    const publication: Publication = {
      canal,
      texte: phrases.join('\n\n'),
      fait_ids: faits.map((fait) => fait.id),
      programmee_pour: creneau.toISOString(),
    }
    if (canal === 'instagram') publication.visuel = faits[0].id
    if (canal === 'instagram') publication.media = `https://prestiapp.fr/api/crieur/visuel/${publication.visuel}.png`
    if (jugerPublication(publication, { faits: faitsJuge, phrasesGabarit: PHRASES_GABARIT, drapeaux }).ok) {
      resultat.push(publication)
      for (const fait of faits) disponibles.splice(disponibles.indexOf(fait), 1)
    }
  }
  return resultat
}
