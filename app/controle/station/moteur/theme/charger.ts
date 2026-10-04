// Le SEUL chargeur du thème de la carte (fiche 026-180, K2) : l'unique accès réseau de tout ce qui est sous app/controle/station/ aux
// fichiers d'un thème. Il ne lit que /station/themes/<clé>/…, sous un préfixe fixe, pour une clé d'une liste fermée : la clé vient des
// réglages (donc de la base), et sans cette liste elle pourrait viser un autre chemin ou un autre hôte. Aucune adresse ne se construit
// ailleurs : la scène (K3) demande l'atlas et le fond par urlsTheme.
import { CLES_THEME, validerTheme } from '@/lib/pilotage/theme'
import type { Theme } from '@/lib/pilotage/theme'

export type ChargementTheme = { ok: true; theme: Theme } | { ok: false; raison: string }

/** Les clés qu'on accepte de demander : les deux thèmes livrés, et `essai`, que seul le juge sert (il n'existe jamais sous public/ : 404 partout ailleurs). */
const CLES_ADMISES: readonly string[] = ['station', 'vaisseau', 'essai']
const PREFIXE = '/station/themes/'
const DELAI_MS = 15_000
const TAILLE_MAX = 1_000_000

/** La clé est-elle dans la liste fermée ? `station` et `vaisseau` doivent aussi figurer dans CLES_THEME (la liste de lib/pilotage/theme.ts fait foi). */
export function cleThemeAdmise(cle: unknown): cle is string {
  return typeof cle === 'string' && CLES_ADMISES.includes(cle) && (cle === 'essai' || (CLES_THEME as readonly string[]).includes(cle))
}

/** Les adresses des fichiers d'un thème, pour le chargeur d'images de Phaser : le même préfixe, la même liste fermée, rien d'autre. */
export function urlsTheme(cle: unknown): { theme: string; atlas: string; fond: string } | null {
  if (!cleThemeAdmise(cle)) return null
  return { theme: `${PREFIXE}${cle}/theme.json`, atlas: `${PREFIXE}${cle}/atlas.png`, fond: `${PREFIXE}${cle}/fond.webp` }
}

const dejaDemandes = new Map<string, Promise<ChargementTheme>>()

async function demander(cle: string): Promise<ChargementTheme> {
  const controle = new AbortController()
  const minuterie = setTimeout(() => controle.abort(), DELAI_MS)
  try {
    const reponse = await fetch(`/station/themes/${cle}/theme.json`, { signal: controle.signal, credentials: 'same-origin' })
    if (!reponse.ok) return { ok: false, raison: `Le thème « ${cle} » est indisponible (${reponse.status}).` }
    const texte = await reponse.text()
    if (texte.length > TAILLE_MAX) return { ok: false, raison: `Le thème « ${cle} » est trop gros pour être lu.` }
    const verdict = validerTheme(JSON.parse(texte))
    if (!verdict.ok) return { ok: false, raison: `Le thème « ${cle} » est refusé : ${verdict.raisons.slice(0, 3).join(' ; ')}` }
    if (verdict.theme.cle !== cle) return { ok: false, raison: `Le fichier demandé pour « ${cle} » est celui du thème « ${verdict.theme.cle} ».` }
    return { ok: true, theme: verdict.theme }
  } catch {
    return { ok: false, raison: `Le thème « ${cle} » n'a pas pu être chargé.` }
  } finally {
    clearTimeout(minuterie)
  }
}

/**
 * Charge et valide le thème `cle`. Ne jette jamais : un refus rend sa raison, que la carte écrit à la place du dessin (jamais une page
 * blanche). Une clé hors de la liste est refusée SANS requête. Un thème valide est gardé pour la durée de la page : la carte et
 * l'habillage (K7) qui demandent le même thème ne font qu'un aller-retour ; un refus n'est pas gardé (on peut réessayer).
 */
export function chargerTheme(cle: unknown): Promise<ChargementTheme> {
  if (!cleThemeAdmise(cle)) return Promise.resolve({ ok: false, raison: 'Thème inconnu : seuls les thèmes livrés se chargent.' })
  const connu = dejaDemandes.get(cle)
  if (connu) return connu
  const demande = demander(cle).then((r) => { if (!r.ok) dejaDemandes.delete(cle); return r })
  dejaDemandes.set(cle, demande)
  return demande
}
