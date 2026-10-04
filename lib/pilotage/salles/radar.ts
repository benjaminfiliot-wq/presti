// 026-178 — le Radar, par pilotage_radar() (0113, 026-175) : les annonceurs repérés aujourd'hui (comptes par catégorie de métier,
// jamais un nom) et les requêtes de la vigie à la bibliothèque publicitaire par heure sur 12 h (l'égaliseur). `requetes_mesurees`
// vaut false tant que la vigie n'a rien mesuré : l'égaliseur de la carte est alors « non mesuré », jamais une rangée de zéros.
import { nonMesure, type Sourcee } from '@/lib/direction/fraicheur'
import type { Contexte } from '../station'
import { lignes, premiere, nombre } from './outils'

// Les tâches planifiées qui nourrissent le Radar (table fermée : lib/alertes.ts CRONS_ATTENDUS en est la liste complète).
const CRONS_DU_RADAR = ['acq-recenseur']

export async function lireRadar(c: Contexte) {
  const r = premiere(await c.rpc('pilotage_radar')) ?? {}
  const parHeure = lignes(r.requetes_meta_par_heure)
  let requetes = 0
  for (const h of parHeure) requetes += nombre(h.requetes)
  return {
    annonceurs: lignes(r.annonceurs_du_jour?.par_categorie).map((a) => ({ categorie: a.categorie ?? null, pubs: nombre(a.comptes) })),
    requetes,
    egaliseur: parHeure.map((h) => nombre(h.requetes)),
    mesure: r.requetes_mesurees === true,
  }
}
export async function lire(c: Contexte) {
  const r = await lireRadar(c)
  const crons = await c.deps.lectures.cronsDuService()
  if (crons.erreur) throw new Error(`crons : ${crons.erreur}`)
  return { ...r, crons: lignes(crons.valeur).filter((x) => CRONS_DU_RADAR.includes(x.nom)).map((x) => ({ nom: x.nom, dernier_le: x.dernier ?? null, ok: x.reussi === true, en_retard: x.enRetard === true })) }
}
/** direct.carte.egaliseur : les 12 valeurs horaires, ou « non mesuré » si la vigie n'a encore rien mesuré. */
export async function egaliseur(c: Contexte): Promise<Sourcee<number[]>> {
  const e = await c.env('direct.carte.egaliseur', () => lireRadar(c))
  if (e.valeur && !e.valeur.mesure) return { ...nonMesure<number[]>('supabase', 'requêtes de la vigie non mesurées'), a: e.a }
  return { valeur: e.valeur ? e.valeur.egaliseur : null, source: e.source, a: e.a, cache: e.cache, ...(e.erreur ? { erreur: e.erreur } : {}) }
}
