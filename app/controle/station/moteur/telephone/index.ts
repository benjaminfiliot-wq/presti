// Fiche 026-186 (K5) : la carte au téléphone. Accroche `telephone` de moteur/entree.tsx, appelée avec le jeu construit.
//
// Ce que ce module fait, et seulement ici : (1) sous 1024 px, le doigt qui touche le cadre de la carte ne défile jamais la page et ne la
// zoome jamais (`touch-action: none`, `gesturestart`, `gesturechange` et `gestureend` de Safari et tout `touchmove` bloqués dans le
// cadre) ; le pincement lui-même (deux pointeurs, un cran de zoom entier) est celui de la caméra (026-182), qui reste seule maîtresse de
// la vue : ce module ne le double pas ; (2) la perte du contexte WebGL (iOS en perd) est rattrapée : si le navigateur ne le rend pas,
// le moteur se rebâtit (un pont, un jeu, un canevas neufs), à toute largeur. Les plaques à partir de ×2 et les boutons de 44 px sont posés
// par telephone.css. Aucune minuterie en boucle.
import type { Accroche, ContexteMoteur } from '../types'
import './telephone.css'

/** Sous cette largeur, c'est un téléphone (celle de la disposition à onglets de la station). */
export const LARGEUR_TELEPHONE = 1024
/** Le temps laissé au navigateur pour rendre le contexte avant de rebâtir la carte. */
export const DELAI_RESTAURATION_MS = 800
/** L'événement que l'hôte (entree.tsx) écoute sur `window` pour rebâtir le moteur. */
export const EVENEMENT_REBATIR = 'mc-rebatir'

const estTelephone = () => window.matchMedia(`(max-width: ${LARGEUR_TELEPHONE - 1}px)`).matches

export const accrocheTelephone: Accroche = (contexte: ContexteMoteur) => {
  const { jeu, racine } = contexte
  if (!jeu || !jeu.canvas || !racine) return
  const toile = jeu.canvas
  const cadre = racine.closest<HTMLElement>('[data-station-carte]') ?? racine
  const libres: (() => void)[] = []
  const sur = <T extends Event>(cible: EventTarget, type: string, f: (ev: T) => void, options?: AddEventListenerOptions) => {
    cible.addEventListener(type, f as EventListener, options)
    libres.push(() => cible.removeEventListener(type, f as EventListener, options))
  }

  // ── Le téléphone : le cadre garde le doigt ─────────────────────────────────────────────────────────────────────────────
  // `touch-action` aussi en ligne : la feuille de style peut ne pas être là (un autre thème, un essai), le blocage ne doit pas en dépendre.
  const poserToucher = () => {
    if (!estTelephone()) return // au bureau la caméra (026-182) tient déjà le sien
    cadre.style.touchAction = 'none'
    toile.style.touchAction = 'none'
  }
  poserToucher()
  sur(window.matchMedia(`(max-width: ${LARGEUR_TELEPHONE - 1}px)`), 'change', poserToucher)

  // Safari zoome la page entière sur un pincement si on ne l'en empêche pas : les trois événements de geste, dans le cadre seulement.
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) sur(cadre, type, (ev: Event) => { if (estTelephone()) ev.preventDefault() }, { passive: false })

  // Un `touchmove` dans le cadre ne défile pas la page (non passif : sinon preventDefault est ignoré).
  sur<TouchEvent>(cadre, 'touchmove', (ev) => { if (estTelephone() && ev.cancelable) ev.preventDefault() }, { passive: false })

  // ── La perte de contexte WebGL ─────────────────────────────────────────────────────────────────────────────────────────
  // preventDefault : sans lui le navigateur ne le restaurera jamais. Phaser se rétablit seul quand le contexte revient ; sinon, après un
  // court délai, on demande à l'hôte de rebâtir le jeu (un canevas neuf a un contexte neuf).
  let attente = 0
  sur<Event>(toile, 'webglcontextlost', (ev) => {
    ev.preventDefault()
    window.clearTimeout(attente)
    attente = window.setTimeout(() => { window.dispatchEvent(new CustomEvent(EVENEMENT_REBATIR)) }, DELAI_RESTAURATION_MS)
  })
  sur<Event>(toile, 'webglcontextrestored', () => { window.clearTimeout(attente) })

  return () => {
    window.clearTimeout(attente)
    for (const f of libres.splice(0)) f()
  }
}
