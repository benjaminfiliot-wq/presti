import { consommerLimite } from '@/lib/limites'
import { enregistrerErreur } from '@/lib/alertes'
import { notifierEntreprise } from '@/lib/email'

// Alerte « le service d'IA ne répond plus » (constat du 04/09/2026).
//
// Le solde de l'API Anthropic s'est vidé en pleine journée : chaque réponse d'assistant, chaque
// devis et chaque recherche échouaient, et RIEN ne le disait — ni à l'artisan, ni à nous. Le
// défaut a été trouvé à la main, longtemps après. Une panne de facturation ou de clé est la
// seule panne qui touche TOUS les clients d'un coup : elle doit réveiller quelqu'un.
//
// La règle : une seule alerte par heure et par motif (le plafond partagé `limites` sert de
// verrou), pour prévenir sans inonder. Ne jette jamais : une alerte qui échoue ne doit pas
// faire échouer la requête du client qui l'a déclenchée.

export type MotifPanne = 'solde' | 'authentification' | 'debit' | 'surcharge' | 'inconnu'

/** Ce que dit l'erreur, ramené à un motif — les messages d'API changent, les motifs non. */
export function motifDe(erreur: unknown): MotifPanne {
  const m = (erreur instanceof Error ? erreur.message : String(erreur ?? '')).toLowerCase()
  if (/credit balance|billing|payment|insufficient (funds|quota)|quota exceeded/.test(m)) return 'solde'
  if (/authentication|invalid x-api-key|unauthorized|permission_error|401/.test(m)) return 'authentification'
  if (/rate.?limit|429/.test(m)) return 'debit'
  if (/overloaded|529|503|service unavailable/.test(m)) return 'surcharge'
  return 'inconnu'
}

/** Vrai quand la panne vient du COMPTE et non d'un aléa : là, aucune reprise ne servira. */
export function estPanneDeCompte(motif: MotifPanne): boolean {
  return motif === 'solde' || motif === 'authentification'
}

const TEXTE: Record<MotifPanne, { sujet: string; quoi: string; faire: string }> = {
  solde: {
    sujet: 'URGENT — le solde de l’API est épuisé',
    quoi: 'L’API Anthropic refuse toutes les requêtes : le solde du compte est à zéro.',
    faire: 'Rechargez le compte sur console.anthropic.com (Plans & Billing). Tant que ce n’est pas fait, AUCUNE réponse d’assistant, AUCUN devis et AUCUNE recherche ne fonctionne, pour tous les artisans.',
  },
  authentification: {
    sujet: 'URGENT — la clé d’API est refusée',
    quoi: 'L’API Anthropic refuse la clé (révoquée, expirée, ou mal recopiée dans les variables d’environnement).',
    faire: 'Vérifiez ANTHROPIC_API_KEY dans les variables d’environnement de Vercel, puis redéployez. Toutes les fonctions d’IA sont à l’arrêt en attendant.',
  },
  debit: {
    sujet: 'Le débit de l’API est saturé',
    quoi: 'L’API Anthropic limite le débit : trop de requêtes en même temps.',
    faire: 'Cela se résorbe seul. Si cela dure, il faut demander un relèvement des limites, ou étaler les appels.',
  },
  surcharge: {
    sujet: 'L’API est momentanément surchargée',
    quoi: 'L’API Anthropic est surchargée de son côté.',
    faire: 'Rien à faire : cela se rétablit seul. Cette alerte sert à savoir que des réponses ont été perdues pendant ce temps.',
  },
  inconnu: {
    sujet: 'Le service d’IA a échoué',
    quoi: 'Un appel à l’API a échoué pour une raison non identifiée.',
    faire: 'Regardez les journaux Vercel de la route concernée.',
  },
}

/**
 * À appeler dans le `catch` de tout appel d'IA. Ne bloque rien, n'attend rien du client :
 * si l'alerte n'a pas pu partir, on n'en fait pas une seconde panne.
 */
export async function signalerPanneIA(ou: string, erreur: unknown): Promise<MotifPanne> {
  const motif = motifDe(erreur)
  try {
    // Un seul message par heure et par motif : `consommer_limite` est atomique, donc deux
    // requêtes simultanées n'enverront pas deux fois la même alerte.
    if (!(await consommerLimite(`alerte-ia:${motif}`, 1, 3600))) return motif
    const t = TEXTE[motif]
    const brut = (erreur instanceof Error ? erreur.message : String(erreur ?? '')).slice(0, 500)
    const r = await notifierEntreprise(t.sujet, `${t.quoi}\n\nOù : ${ou}\nMessage de l’API : ${brut}\n\nÀ faire : ${t.faire}`)
    // Trace serveur dans tous les cas (audit final, F) : l'email peut ne pas partir, la ronde
    // « erreurs » et le digest doivent quand même voir la panne.
    await enregistrerErreur(`panne IA (${motif}) : ${ou}`, erreur)
    if (!r.ok) console.error('[alerteService] alerte non envoyée', r.error)
  } catch (e) {
    console.error('[alerteService]', e instanceof Error ? e.message : e)
  }
  return motif
}
