// scripts/fixtures/026-livraison-tresor/b/enfant.mjs — le processus enfant des juges du lot B (fiche 026-023), écrit par
// Claude Code. Même contrat que preparerEnfant de ../commun.mjs (crochet CROCHET, fetch piégé), mais le crochet sert
// b/doublures.mjs à la place de a/doublures.mjs : les doublures du lot A plus celles du lot B (auth.admin, clientPublic,
// authArtisan, Checkout et signature des webhooks, siteLivraison, siteAchatPublic).
// Aucun réseau, aucun fichier écrit, aucune variable d'environnement lue.
import fs from 'node:fs'
import path from 'node:path'
import { register } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { R, CROCHET } from '../commun.mjs'

export const DOSSIER_B = path.dirname(fileURLToPath(import.meta.url))
export const DOUBLURES_B = path.join(DOSSIER_B, 'doublures.mjs')
/** Un jeu d'essai du lot B, relu à chaque appel (copie neuve). */
export const jeuB = (nom) => JSON.parse(fs.readFileSync(path.join(DOSSIER_B, nom), 'utf8'))
/** Les doublures qu'un juge du lot B demande d'ordinaire (clé : chemin sans extension relatif à la racine jugée). */
export const DOUBLES_B = {
  'lib/stripe': 'stripe', 'lib/supabaseAdmin': 'supabaseAdmin', 'lib/supabaseClient': 'supabaseClient', 'lib/email': 'email',
  'lib/limites': 'limites', 'lib/vercelDomains': 'vercelDomains', 'lib/flags': 'flags', 'lib/direction/garde': 'garde',
  'lib/alertes': 'alertes', 'lib/direction/veilleTresorerie': 'veille',
}
/**
 * Dans l'enfant : enregistre le crochet (racines : la racine jugée d'abord, puis d'éventuelles copies de référence),
 * piège fetch (consigné dans `reseau`), et rend l'état partagé des doublures du lot B.
 */
export async function preparerEnfantB({ racines, doubles }) {
  const reseau = []
  globalThis.fetch = async (u) => { const x = String(u?.url ?? u); reseau.push(x); throw new Error(`réseau interdit dans un juge du lot B (hors --reel) : ${x.slice(0, 80)}`) }
  const sep = (d) => pathToFileURL(path.resolve(d) + path.sep).href
  register(`data:text/javascript,${encodeURIComponent(CROCHET)}`, { data: { racines: racines.map(sep), doublures: pathToFileURL(DOUBLURES_B).href, depot: sep(R), doubles } })
  const D = await import(`${pathToFileURL(DOUBLURES_B).href}?m=juge`)
  return { D, reseau }
}
/** Une requête JSON vers une route de l'app (méthode, corps, adresse et en-têtes au choix). */
export function requeteJson(url, { methode = 'POST', corps = undefined, ip = '1.2.3.4', entetes = {} } = {}) {
  return new Request(url, {
    method: methode,
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip, ...entetes },
    ...(corps === undefined ? {} : { body: typeof corps === 'string' ? corps : JSON.stringify(corps) }),
  })
}
/** Le corps JSON d'une réponse, ou null s'il n'y en a pas. */
export async function corpsJson(reponse) { try { return await reponse.clone().json() } catch { return null } }
