// scripts/fixtures/026-acquisition/meta/recuperateur.mjs — le Recuperateur factice de la vigie Meta (fiche 026-069),
// écrit par Claude Code. Sert UNIQUEMENT https://graph.facebook.com/v<majeur>.<mineur>/ads_archive, jamais les autres
// fixtures du domaine (sirene/, sites/, ademe/, ads-archive/ appartiennent à d'autres juges). Aucun appel réseau, jamais.
//
// scenario (creerRecuperateurMeta) :
//   'artisan-base'         : les pages A, B, C de reperes.json (A qualifie, B trop récente, C trop peu de pubs).
//   'artisan-sans-domaine' : les pages D (légende facebook.com), E (légende d'annuaire), F (aucune légende).
//   'artisan-tout'         : A à F, pour un budget qui permet plusieurs appels.
//   'marque'               : les pages G (domaine retenu), H (sans domaine, écartée), I (NAF exclu, hors périmètre du juge).
//   'pagination-fixe'      : deux pages liées par `paging.next` (after=curseur-1), la seconde sans suite.
//   'pagination-infinie'   : `paging.next` toujours présent (teste l'arrêt à l'échéance, pas la fin naturelle).
//   'vide'                 : `{ data: [] }` pour tout terme (budget qui compte les appels sans se soucier du contenu).
// Le jeton porté par `access_token` choisit l'erreur (REPERES.jetons.invalide → 190, .limite → 613, .identite → 1357045) ;
// tout autre jeton (ou son absence) sert le scénario normal (l'absence de jeton n'arrive jamais en pratique : la vigie ne
// fait aucun appel sans jeton, VM-2).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const FIXTURES = path.dirname(fileURLToPath(import.meta.url))
const lireJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'))
export const REPERES = lireJson(path.join(FIXTURES, 'reperes.json'))

const json = (statut, corps) => ({ statut, entetes: { 'content-type': 'application/json; charset=utf-8' }, corps: JSON.stringify(corps) })
function erreurDe(nom) {
  const o = lireJson(path.join(FIXTURES, `${nom}.json`))
  return { statut: o._reponse.statut, entetes: { 'content-type': 'application/json; charset=utf-8' }, corps: JSON.stringify(o._reponse.corps) }
}
function pubVers(p, pageId, pageName, legendes) {
  const o = { id: p.id, page_id: pageId, page_name: pageName, ad_delivery_start_time: p.debut, ad_creative_link_titles: [p.titre], ad_creative_bodies: [p.corps], eu_total_reach: 1000 }
  if (legendes && legendes.length) o.ad_creative_link_captions = legendes
  return o
}
/** Les pubs de plusieurs pages d'un dictionnaire (REPERES.artisan ou .marque), dans l'ordre des clés données. */
function pubsDe(dict, cles) {
  const out = []
  for (const c of cles) { const p = dict[c]; for (const pub of p.pubs) out.push(pubVers(pub, p.page_id, p.page_name, p.legendes)) }
  return out
}
const CONTENU = {
  'artisan-base': () => pubsDe(REPERES.artisan, ['A', 'B', 'C']),
  'artisan-sans-domaine': () => pubsDe(REPERES.artisan, ['D', 'E', 'F']),
  'artisan-tout': () => pubsDe(REPERES.artisan, ['A', 'B', 'C', 'D', 'E', 'F']),
  'marque': () => pubsDe(REPERES.marque, ['G', 'H', 'I']),
  'vide': () => [],
}

/**
 * `recuperer(url, options)` conforme au contrat ; `.appels` : [{ url, hote, chemin, recherche, t }]. `coutMs` fait
 * avancer l'horloge virtuelle avant chaque réponse (comme `coutMs` de recuperateur-factice.mjs).
 */
export function creerRecuperateurMeta({ horloge = null, scenario = 'artisan-base', coutMs = 0 } = {}) {
  const appels = []
  async function recuperer(url) {
    if (horloge && coutMs) await horloge.attendre(coutMs)
    const t = horloge ? horloge.maintenant() : Date.now()
    let u
    try { u = new URL(url) } catch { throw new Error(`recuperateur meta factice : URL invalide (${url})`) }
    appels.push({ url, hote: u.hostname, chemin: u.pathname, recherche: Object.fromEntries(u.searchParams), t })
    if (u.hostname !== 'graph.facebook.com') throw new Error(`recuperateur meta factice : hôte hors de la fixture (${u.hostname})`)
    if (!/^\/v\d+\.\d+\/ads_archive$/.test(u.pathname)) return json(404, { error: { message: 'chemin inconnu du récupérateur factice', type: 'GraphMethodException', code: 803 } })
    const jeton = u.searchParams.get('access_token')
    if (jeton === REPERES.jetons.invalide) return erreurDe('erreur-190')
    if (jeton === REPERES.jetons.limite) return erreurDe('erreur-613')
    if (jeton === REPERES.jetons.identite) return erreurDe('erreur-1357045')
    if (!jeton) return erreurDe('erreur-190')
    if (scenario === 'pagination-fixe') {
      const apres = u.searchParams.get('after')
      const p = REPERES.pagination
      if (!apres) return json(200, { data: [pubVers({ id: '400000000000201', titre: 'Atelier Témoin, page un', corps: 'Premier lot de résultats de la page un, un second lot suit sur la page suivante.', debut: '2026-09-01' }, p.page_id, p.page_name, [p.legende])], paging: { next: `https://graph.facebook.com/v26.0/ads_archive?after=curseur-1&access_token=${jeton}` } })
      return json(200, { data: [pubVers({ id: '400000000000202', titre: 'Atelier Témoin, page deux', corps: 'Second lot de résultats de la page deux, qui referme la pagination ici.', debut: '2026-09-20' }, p.page_id, p.page_name, [p.legende])] })
    }
    if (scenario === 'pagination-infinie') {
      const apres = Number(u.searchParams.get('after') || '0')
      const p = REPERES.pagination
      return json(200, { data: [pubVers({ id: `40000000029${String(apres).padStart(1, '0')}`, titre: `Atelier Témoin, page ${apres}`, corps: 'Un lot parmi une pagination qui ne se termine jamais elle-même (teste l\'échéance).', debut: '2026-09-01' }, p.page_id, p.page_name, [p.legende])], paging: { next: `https://graph.facebook.com/v26.0/ads_archive?after=${apres + 1}&access_token=${jeton}` } })
    }
    const f = CONTENU[scenario] ?? CONTENU['artisan-base']
    return json(200, { data: f() })
  }
  recuperer.appels = appels
  return recuperer
}
