import { PROCHES } from './contrat'
import type { CanalTrouve, DepsReseau, FicheSirene, LectureSite, MagasinSocle, PatchProspect, ProspectReserve } from './contrat'
import { chercherEntreprise, ficheParSiren, retenir } from './sirene'
import { lireSite } from './lecteurSite'
import { detailStockable, scoreDouleur } from './scoreDouleur'

interface Deps extends DepsReseau {
  magasin: MagasinSocle
  echeance: number
}

interface Bilan {
  reserves: number
  recense: number
  sans_canal: number
  rejete: number
  oppose: number
  erreurs: number
  duree_ms: number
  arrete_par_echeance: boolean
  abandons: Record<string, number>
}

function refusTemporaire(raison: string): boolean {
  return raison === 'injoignable' || raison === 'limite_api'
}

function contientProche(...textes: (string | null | undefined)[]): boolean {
  const texte = textes.filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  return PROCHES.some((nom) => texte.includes(nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()))
}

async function traiter(candidat: ProspectReserve, deps: Deps, bilan: Bilan): Promise<void> {
  const { magasin } = deps
  if (await magasin.estOppose({ siren: candidat.siren, domaine: candidat.domaine, instagram: candidat.instagram, page_meta: candidat.page_meta })) {
    if (await magasin.mettreAJour(candidat.id, 'candidat', 'oppose', {})) bilan.oppose++
    return
  }

  const rejeter = async (raison: string, abandon?: string) => {
    if (refusTemporaire(raison)) return
    if (await magasin.mettreAJour(candidat.id, 'candidat', 'rejete', { raison })) {
      bilan.rejete++
      if (abandon) bilan.abandons[abandon] = (bilan.abandons[abandon] ?? 0) + 1
    }
  }

  let fiche: FicheSirene | null = null
  if (candidat.source === 'ademe_rge' && candidat.siren) {
    const brute = await ficheParSiren(candidat.siren, deps)
    const resultat = 'refus' in brute ? brute : retenir(brute, candidat.cible)
    if ('refus' in resultat) { await rejeter(resultat.refus); return }
    fiche = resultat
  }

  let site: LectureSite | null = null
  if (candidat.domaine) {
    // Le lecteur garde ses règles robots et son origine par objet de dépendances.
    // Chaque domaine reçoit donc sa propre session de lecture.
    const lecture = await lireSite(candidat.domaine, { recuperer: deps.recuperer, horloge: deps.horloge, echeance: deps.echeance - 5000 })
    if ('refus' in lecture) {
      if (refusTemporaire(lecture.refus)) return
      await rejeter(lecture.refus)
      return
    }
    site = lecture
    if (candidat.siren && site.siren && candidat.siren !== site.siren) {
      await rejeter('siren_different')
      return
    }
    if (!fiche && site.siren) {
      const brute = await ficheParSiren(site.siren, deps)
      const resultat = 'refus' in brute ? brute : retenir(brute, candidat.cible)
      if ('refus' in resultat) { await rejeter(resultat.refus); return }
      fiche = resultat
    }
  }

  if (!fiche && !site && !candidat.page_meta) {
    if (await magasin.mettreAJour(candidat.id, 'candidat', 'sans_canal', {})) bilan.sans_canal++
    return
  }

  if (!fiche && candidat.siren) {
    const brute = await ficheParSiren(candidat.siren, deps)
    const resultat = 'refus' in brute ? brute : retenir(brute, candidat.cible)
    if ('refus' in resultat) { await rejeter(resultat.refus); return }
    fiche = resultat
  }
  if (!fiche && candidat.code_postal && site) {
    const titre = site.faits.find((fait) => fait.type === 'site_titre')?.extrait
    const resultat = await chercherEntreprise({ nom: titre || candidat.entreprise, code_postal: candidat.code_postal }, candidat.cible, deps)
    if ('refus' in resultat) { await rejeter(resultat.refus); return }
    fiche = resultat
  }
  if (!fiche) { await rejeter('introuvable'); return }

  if (candidat.source !== 'entrant' && site) {
    if (!site.verdict_formulaire.eligible) {
      const raison = site.verdict_formulaire.raison
      await rejeter(`formulaire_${raison}`, raison)
      return
    }
  }

  const canaux: CanalTrouve[] = candidat.canaux.filter((canal) => canal.canal !== 'email_sollicite' || candidat.source === 'entrant' && canal.nature === 'donnee_par_la_personne')
  if (candidat.page_meta) canaux.push({ canal: 'facebook', valeur: candidat.page_meta, url_source: `https://www.facebook.com/${candidat.page_meta}` })
  if (candidat.instagram) canaux.push({ canal: 'instagram', valeur: candidat.instagram, url_source: `https://www.instagram.com/${candidat.instagram}/` })
  if (site) {
    for (const reseau of site.reseaux) canaux.push({ canal: reseau.reseau, valeur: reseau.compte, url_source: reseau.url_source })
    if (site.verdict_formulaire.eligible && site.formulaire) {
      canaux.unshift({ canal: 'formulaire_site', valeur: site.formulaire.url_page, url_source: site.formulaire.url_page })
    }
  }
  const faits = [...candidat.faits, ...(site?.faits ?? [])]
  // Le score de douleur (0135) : signaux publics sur l'entreprise ; la file du premier contact passe par score décroissant.
  const douleur = scoreDouleur({ domaine: candidat.domaine, faits, formulaire: site?.formulaire ?? null, verdict_formulaire: site?.verdict_formulaire ?? null, pages: site?.pages ?? [], site_lu: !!site })
  const patch: PatchProspect = {
    score_douleur: douleur.score,
    score_douleur_detail: detailStockable(douleur),
    siren: fiche.siren,
    cible: candidat.cible,
    naf: fiche.naf,
    metier: fiche.metier,
    commune: fiche.commune,
    departement: fiche.departement,
    code_postal: fiche.code_postal,
    faits,
    canaux,
    froid: candidat.source === 'entrant' ? false : !contientProche(fiche.denomination, candidat.entreprise, candidat.domaine, site?.faits.find((fait) => fait.type === 'site_titre')?.extrait),
    ...(site?.formulaire ? { formulaire: site.formulaire, technologie: site.formulaire.technologie } : {}),
  }
  const etape = canaux.length ? 'recense' : 'sans_canal'
  if (await magasin.mettreAJour(candidat.id, 'candidat', etape, patch)) bilan[etape]++
}

export async function executerRecenseur(deps: Deps): Promise<Bilan> {
  const debut = deps.horloge.maintenant()
  const bilan: Bilan = { reserves: 0, recense: 0, sans_canal: 0, rejete: 0, oppose: 0, erreurs: 0, duree_ms: 0, arrete_par_echeance: false, abandons: {} }
  const candidats = await deps.magasin.reserver('candidat', 15, 300)
  bilan.reserves = candidats.length
  for (const candidat of candidats) {
    if (deps.horloge.maintenant() >= deps.echeance - 5000) { bilan.arrete_par_echeance = true; break }
    try { await traiter(candidat, deps, bilan) } catch { bilan.erreurs++ }
  }
  bilan.duree_ms = deps.horloge.maintenant() - debut
  await deps.magasin.evenement({ agent: 'recenseur', type: 'passage', resume: `${bilan.reserves} réservés, ${bilan.recense} recensés, ${bilan.sans_canal} sans canal, ${bilan.rejete} rejetés, ${bilan.oppose} opposés, ${bilan.erreurs} erreurs` })
  return bilan
}
