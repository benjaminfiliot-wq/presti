// Témoin de 026-220 : implémentation de RÉFÉRENCE du lancement d'une expérience après la première vente (jamais
// déployée). Elle prouve que le juge `scripts/juges-026-completude-qa.mjs --partie=experience` sait être vert ; chaque
// sabotage de --preuve-echecs le rend rouge. Le contrat : `node scripts/juges-026-completude-qa.mjs --contrat=experience`.
//
// Règles tenues : aucun lancement avant un ENCAISSEMENT confirmé et sourcé (ni devis, ni commande en attente, ni
// événement de test) ; cadre complet avant le premier événement ; accord de Benj sur l'objectif exact, sinon l'expérience
// reste « proposée » ; le froid reste fermé tant que l'interrupteur envoi_froid n'est pas ouvert (froid_ouvert() === true) ; un id = une expérience ; un objectif modifié exige un nouvel
// accord ; une mesure absente conclut « non mesuré », jamais un succès ; le bilan ne bascule aucun drapeau.

const CHAMPS = ['id', 'version', 'source', 'objectif', 'population', 'seuil_arret']

// Le froid n'est ouvert que si le service rend EXACTEMENT true ; absent, faux, non booléen ou en panne : fermé.
async function froidOuvert(deps) {
  try { return typeof deps.froid_ouvert === 'function' && (await deps.froid_ouvert()) === true } catch { return false }
}

export async function lancerExperience(d, deps) {
  for (const c of CHAMPS) if (!d?.[c]) return { refus: 'cadre', raison: `${c} manquant` }
  if (!d.metrique?.nom || !(Number(d.horizon_jours) > 0) || typeof d.cout_max_eur !== 'number') return { refus: 'cadre', raison: 'métrique, horizon ou coût maximum manquant' }
  if (!/^douleurs-\d{4}-\d{2}$/.test(d.source) && d.source !== 'decision-benj') return { refus: 'cadre', raison: 'hypothèse sans source' }
  if ((d.touche || []).includes('froid') && !(await froidOuvert(deps))) return { refus: 'froid_ferme' }

  const ventes = await deps.ventes()
  const vente = (ventes || []).find((v) => v?.statut === 'encaisse' && v.confirme === true && v.test === false && v.source)
  if (!vente) return { refus: 'premiere_vente', raison: 'aucun encaissement confirmé et sourcé' }

  const cle = `experience-${d.id}`
  const existante = await deps.magasin.lire(cle)
  if (existante) {
    if (existante.objectif !== d.objectif || existante.version !== d.version) return { refus: 'nouvel_accord', raison: 'objectif ou version modifiés' }
    return { deja: true, experience: existante }
  }

  const accord = d.accord_benj && d.accord_benj.id && d.accord_benj.objectif === d.objectif ? d.accord_benj : null
  const experience = {
    id: d.id, version: d.version, source: d.source, objectif: d.objectif, metrique: d.metrique,
    horizon_jours: d.horizon_jours, population: d.population, seuil_arret: d.seuil_arret, cout_max_eur: d.cout_max_eur,
    vente: vente.id, accord: accord ? accord.id : null,
    etat: accord ? 'en cours' : 'proposée',
    cree_le: new Date(deps.horloge.maintenant()).toISOString(),
  }
  await deps.magasin.ecrire(cle, experience)
  if (accord) await deps.evenements.emettre({ type: 'demarrage', id: d.id, a_sec: true })
  return { deja: false, experience }
}

export async function conclureExperience({ id, mesure }, deps) {
  const cle = `experience-${id}`
  const e = await deps.magasin.lire(cle)
  if (!e) return { refus: 'inconnue' }
  if (!mesure || typeof mesure.valeur !== 'number' || !mesure.source) {
    const arretee = { ...e, etat: 'arrêtée', conclusion: 'non mesuré', succes: false, suspendue: true }
    await deps.magasin.ecrire(cle, arretee)
    return { experience: arretee }
  }
  const conclue = {
    ...e,
    etat: 'conclue',
    conclusion: 'mesuré',
    bilan: {
      observation: { valeur: mesure.valeur, source: mesure.source, periode: mesure.periode || null },
      inference: `écart à la métrique de départ : ${typeof e.metrique?.depart === 'number' ? mesure.valeur - e.metrique.depart : 'non mesuré'}`,
      decision: 'recommandation soumise à Benj ; aucun drapeau ni prix modifié',
    },
  }
  await deps.magasin.ecrire(cle, conclue)
  return { experience: conclue }
}
