// L'adaptateur du moteur (fiche 026-181, K3) : des propriétés de la carte à la liste d'`ActeurStation` que la scène traite.
//   positions() → ActeurStation → signature → le pont n'est appelé que si elle change.
// La salle et le motif viennent de `positions()` (026-070) et d'elle SEULE : la route les calcule (026-092), l'écran ne les recalcule pas,
// ce module non plus. Le nom, la couleur et l'avatar viennent des réglages, puis du thème, puis d'un défaut : JAMAIS du rang dans la
// liste (le prototype donnait la couleur d'après le rang, un agent changeait de couleur quand un autre apparaissait). La bulle est le
// texte masqué servi (la dernière du fil pour cet agent), tel quel.
import type { Accroche, ActeurStation, MotifActeur, PropsCarte } from '../types'
import { suiviDe } from '../scene/suivi'
import { chargerTheme } from '../theme/charger'

const MOTIFS: readonly string[] = ['porte', 'tache', 'reunion', 'pause', 'panne']
const RE_COULEUR = /^#[0-9A-Fa-f]{6}$/
const COULEUR_DE_REPLI = '#8fa0b0'

const objet = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x)
const texte = (x: unknown): string | null => (typeof x === 'string' && x.trim() ? x : null)

/** Un agent tel que la vue `direct` le sert (seuls les champs lus ici). */
type AgentServi = { nom?: unknown; avatar?: unknown; position?: unknown }
type AvatarTheme = { cle: string; couleur: string }

/** La dernière bulle de chaque agent : l'identifiant le plus grand l'emporte, le texte est gardé tel que servi. */
function dernieresBulles(bulles: PropsCarte['bulles']): Map<string, string> {
  const dernieres = new Map<string, { id: number; texte: string }>()
  for (const b of bulles ?? []) {
    const agent = texte(b?.agent), t = texte(b?.texte)
    if (!agent || !t) continue
    const id = typeof b.id === 'number' ? b.id : 0
    const avant = dernieres.get(agent)
    if (!avant || id >= avant.id) dernieres.set(agent, { id, texte: t })
  }
  return new Map([...dernieres].map(([agent, d]) => [agent, d.texte]))
}

/**
 * Les acteurs d'une lecture : un par agent servi avec une salle (un agent sans salle n'a pas de position : pas d'acteur, donc pas de dessin).
 * `reglages` est la clé `reglages` de la réponse (`equipage[nom] = { nom, avatar, couleur }`), `avatars` la liste du thème.
 */
export function versActeurs(equipage: PropsCarte['equipage'], bulles: PropsCarte['bulles'], reglages: unknown, avatars: readonly AvatarTheme[] = []): ActeurStation[] {
  const agents = (equipage?.valeur?.agents ?? []) as unknown as AgentServi[]
  const reglesEquipage = objet(reglages) && objet(reglages.equipage) ? reglages.equipage : {}
  const parBulle = dernieresBulles(bulles)
  const couleurDe = (cle: string) => avatars.find((a) => a.cle === cle)?.couleur ?? avatars.find((a) => a.cle === 'defaut')?.couleur ?? COULEUR_DE_REPLI
  const acteurs: ActeurStation[] = []
  for (const agent of agents) {
    const nom = texte(agent.nom)
    if (!nom) continue
    const position = objet(agent.position) ? agent.position : null
    const salle = texte(position?.salle)
    const motif = MOTIFS.includes(position?.motif as string) ? (position?.motif as MotifActeur) : null
    const regle = objet(reglesEquipage[nom]) ? reglesEquipage[nom] : {}
    const avatar = texte(regle.avatar) ?? texte(agent.avatar) ?? nom
    const couleurReglee = texte(regle.couleur)
    const couleur = couleurReglee && RE_COULEUR.test(couleurReglee) ? couleurReglee : couleurDe(avatar)
    acteurs.push({ nom, couleur, avatar, salle, motif, bulle: parBulle.get(nom) ?? null })
  }
  return acteurs
}

/** La signature d'une liste d'acteurs : change si et seulement si quelque chose de visible change (salle, motif, bulle, nom, couleur, avatar). */
export function signature(acteurs: readonly ActeurStation[]): string {
  return JSON.stringify(acteurs.map((a) => [a.salle, a.motif, a.bulle, a.nom, a.couleur, a.avatar]))
}

/**
 * L'accroche `adaptateur` : à chaque lecture des propriétés, la liste d'acteurs est refaite et comparée ; le pont n'est appelé que si la
 * signature a changé (au repos, aucun appel : la boucle de Phaser dort). Les acteurs sont aussi rangés dans le suivi pour le calque HTML,
 * qui ne touche jamais au pont.
 */
export const accrocheAdaptateur: Accroche = async (contexte) => {
  const suivi = suiviDe(contexte)
  const cle = texte(contexte.props.reglages?.reglages?.theme) ?? 'station'
  const charge = await chargerTheme(cle)
  const avatars = charge.ok ? charge.theme.avatars : []
  let derniere: string | null = null
  const lire = (props: PropsCarte) => {
    const acteurs = versActeurs(props.equipage, props.bulles, props.reglages?.reglages, avatars)
    const s = signature(acteurs)
    if (s === derniere) return
    derniere = s
    suivi.poserActeurs(acteurs)
    contexte.pont.setState({ acteurs })
  }
  lire(contexte.props)
  contexte.ecouter(lire)
}
