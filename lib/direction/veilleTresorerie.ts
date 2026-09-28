import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { envoyerAlertes, type Alerte } from '@/lib/alertes'
import { caDeLAnnee, situerTva } from './tresorerie'

type EtatTva = ReturnType<typeof situerTva>

/** Le lundi civil à Paris, une seule clé par semaine et par niveau de seuil. */
export function alertesTresorerie(tva: EtatTva, maintenant: Date): Alerte[] {
  if (tva.pourcent === null || (!tva.alerte && !tva.depasse)) return []
  const parties = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(maintenant)
  const lire = (type: string) => parties.find((partie) => partie.type === type)?.value ?? ''
  if (lire('weekday') !== 'Mon') return []
  const date = new Date(Date.UTC(Number(lire('year')), Number(lire('month')) - 1, Number(lire('day'))))
  const jeudi = new Date(date)
  jeudi.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const annee = jeudi.getUTCFullYear()
  const premierJeudi = new Date(Date.UTC(annee, 0, 4))
  premierJeudi.setUTCDate(premierJeudi.getUTCDate() + 4 - (premierJeudi.getUTCDay() || 7))
  const semaine = 1 + Math.round((jeudi.getTime() - premierJeudi.getTime()) / 604800000)
  const niveau = tva.depasse ? 'depasse' : 'alerte'
  return [{
    motif: 'paiement', a: 'entreprise', cle: `tva:${annee}-${semaine}:${niveau}`,
    sujet: tva.depasse ? 'Seuil de TVA dépassé' : 'Seuil de TVA proche',
    corps: `Le chiffre d’affaires atteint ${tva.pourcent} % du seuil de franchise. Vérifier la situation fiscale. Le jour du dépassement, modifier les prix affichés, les mentions légales et l’interrupteur STRIPE_TAXE_AUTO.`,
  }]
}

export async function veilleTresorerie(): Promise<number> {
  const maintenant = new Date()
  const [ca, reglagesLus] = await Promise.all([
    caDeLAnnee(),
    supabaseAdmin.from('reglages_globaux').select('cle, valeur'),
  ])
  if (reglagesLus.error) throw new Error(`Réglages TVA indisponibles : ${reglagesLus.error.message}`)
  const reglages: Record<string, number | string> = {}
  for (const ligne of reglagesLus.data ?? []) reglages[ligne.cle] = ligne.valeur
  return envoyerAlertes(alertesTresorerie(situerTva(ca.valeur, reglages), maintenant))
}
