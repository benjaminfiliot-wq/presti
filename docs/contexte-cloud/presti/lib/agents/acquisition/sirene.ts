import { METIERS, NAF_BATIMENT, NAF_EXCLUS_MARQUE, UA_RECENSEUR } from './contrat'
import type { Cible, DepsReseau, FicheSirene, RefusSirene } from './contrat'
import { sirenValide } from '@/lib/facturation'

type Refus = { refus: RefusSirene }
type ResultatBrut = {
  siren: string
  nom_complet?: string
  siege?: {
    siret?: string
    code_postal?: string
    libelle_commune?: string
    etat_administratif?: string
    tranche_effectif_salarie?: string
  }
  activite_principale?: string
  date_creation?: string
  etat_administratif?: string
  statut_diffusion?: string
  tranche_effectif_salarie?: string
  complements?: { est_entrepreneur_individuel?: boolean }
}

const dernierAppel = new WeakMap<DepsReseau['horloge'], number>()

async function demander(url: string, deps: DepsReseau): Promise<{ results: ResultatBrut[] } | Refus> {
  for (let tentative = 0; tentative < 2; tentative++) {
    try {
      const maintenant = deps.horloge.maintenant()
      const dernier = dernierAppel.get(deps.horloge)
      if (dernier !== undefined && maintenant - dernier < 150) await deps.horloge.attendre(150 - (maintenant - dernier))
      dernierAppel.set(deps.horloge, deps.horloge.maintenant())
      const page = await deps.recuperer(url, { entetes: { 'user-agent': UA_RECENSEUR } })
      if (page.statut === 429) {
        if (tentative === 1) return { refus: 'limite_api' }
        await deps.horloge.attendre(1000)
        continue
      }
      if (page.statut < 200 || page.statut >= 300) return { refus: 'injoignable' }
      const donnees: unknown = JSON.parse(page.corps)
      if (!donnees || typeof donnees !== 'object' || !('results' in donnees) || !Array.isArray(donnees.results)) return { refus: 'injoignable' }
      // Ne garder que les champs utiles : l'API livre aussi les dirigeants et les adresses.
      return { results: donnees.results.map((r: ResultatBrut) => ({
        siren: r.siren,
        ...(r.complements?.est_entrepreneur_individuel ? {} : { nom_complet: r.nom_complet }),
        siege: r.siege && {
          siret: r.siege.siret,
          code_postal: r.siege.code_postal,
          libelle_commune: r.siege.libelle_commune,
          etat_administratif: r.siege.etat_administratif,
          tranche_effectif_salarie: r.siege.tranche_effectif_salarie,
        },
        activite_principale: r.activite_principale,
        date_creation: r.date_creation,
        etat_administratif: r.etat_administratif,
        statut_diffusion: r.statut_diffusion,
        tranche_effectif_salarie: r.tranche_effectif_salarie,
        complements: { est_entrepreneur_individuel: r.complements?.est_entrepreneur_individuel === true },
      })) }
    } catch {
      return { refus: 'injoignable' }
    }
  }
  return { refus: 'limite_api' }
}

function departement(codePostal: string | undefined): string | null {
  if (!codePostal || !/^\d{5}$/.test(codePostal)) return null
  if (/^97[0-9]/.test(codePostal)) return codePostal.slice(0, 3)
  const corse = Number(codePostal.slice(0, 3))
  if (corse >= 200 && corse <= 201) return '2A'
  if (corse >= 202 && corse <= 206) return '2B'
  return codePostal.slice(0, 2)
}

export async function ficheParSiren(siren: string, deps: DepsReseau): Promise<ResultatBrut | Refus> {
  if (!/^\d{9}$/.test(siren) || !sirenValide(siren)) return { refus: 'siren_invalide' }
  const url = new URL('https://recherche-entreprises.api.gouv.fr/search')
  url.searchParams.set('q', siren)
  url.searchParams.set('per_page', '1')
  const reponse = await demander(url.toString(), deps)
  if ('refus' in reponse) return reponse
  return reponse.results.find((r) => r.siren === siren) ?? { refus: 'introuvable' }
}

export function retenir(resultat: ResultatBrut, cible: Cible = 'artisan'): FicheSirene | Refus {
  if (resultat.etat_administratif !== 'A' || resultat.siege?.etat_administratif !== 'A') return { refus: 'inactif' }
  if (resultat.statut_diffusion !== 'O') return { refus: 'diffusion_partielle' }
  const naf = resultat.activite_principale ?? ''
  if (cible === 'artisan') {
    if (!NAF_BATIMENT.includes(naf)) return { refus: 'hors_batiment' }
    const tranche = resultat.tranche_effectif_salarie ?? resultat.siege?.tranche_effectif_salarie
    if (!tranche || !['NN', '00', '01', '02', '03'].includes(tranche)) return { refus: 'trop_grand' }
  } else if (NAF_EXCLUS_MARQUE.includes(naf)) return { refus: 'naf_exclu' }

  const ei = resultat.complements?.est_entrepreneur_individuel === true
  return {
    siren: resultat.siren,
    siret_siege: resultat.siege?.siret ?? null,
    naf,
    metier: METIERS.find((m) => m.naf.includes(naf))?.id ?? null,
    code_postal: resultat.siege?.code_postal ?? null,
    commune: resultat.siege?.libelle_commune ?? null,
    departement: departement(resultat.siege?.code_postal),
    entrepreneur_individuel: ei,
    cree_le: resultat.date_creation ?? null,
    ...(ei || !resultat.nom_complet ? {} : { denomination: resultat.nom_complet }),
  }
}

export async function chercherEntreprise(
  recherche: { nom: string; code_postal: string }, cible: Cible, deps: DepsReseau,
): Promise<FicheSirene | Refus> {
  const url = new URL('https://recherche-entreprises.api.gouv.fr/search')
  url.searchParams.set('q', recherche.nom)
  url.searchParams.set('code_postal', recherche.code_postal)
  url.searchParams.set('etat_administratif', 'A')
  url.searchParams.set('per_page', '5')
  const reponse = await demander(url.toString(), deps)
  if ('refus' in reponse) return reponse
  const fiches = reponse.results.map((r) => retenir(r, cible)).filter((r): r is FicheSirene => 'siren' in r)
  if (fiches.length > 1) return { refus: 'ambigu' }
  return fiches[0] ?? { refus: 'introuvable' }
}
