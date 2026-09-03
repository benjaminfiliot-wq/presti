// Drapeaux de fonctionnalités — la règle d'or du sprint J-1 (plans/004-sprint-j1-demo.md §0) :
// **une fonctionnalité non finie n'apparaît pas.** Un bouton qui mène à un écran cassé coûte
// plus cher en démo qu'un bouton absent. Tout ce qui n'est pas prêt est masqué ICI, pas
// laissé à moitié dans l'interface.
//
// Un drapeau à `false` cache l'entrée de menu, la route répond 404, et rien dans le DOM ne
// trahit l'existence de la fonctionnalité. Passer à `true` = la fonctionnalité est finie,
// vérifiée en production (cycle presti-verify) et jouable dans le parcours de démo.
//
// On ne lit pas ces drapeaux depuis une variable d'environnement : un drapeau est une
// décision de code, versionnée, relue en revue — pas un réglage qu'on bascule à chaud.

export const FLAGS = {
  /** §6 — 2FA TOTP via Supabase MFA. Décision Benj : après la démo. */
  mfa: false,
  /** §8 F1 — photo de facture fournisseur → OCR → lignes proposées. */
  inventaireOcr: false,
  /** §8 F3 — assistant de recherche fournisseurs. */
  inventaireRecherche: false,
  /** §9 G1 — poste de pilotage de la plateforme (conversations, prise de main). */
  plateformePilotage: false,
  /** §9 G1 — constructeur de règles d'automatisation. */
  plateformeRegles: false,
  /** §10 H2 — slides 3D de réalisations (Signature). */
  siteSlides3d: false,
  /** §4 B3 — visites guidées à la première ouverture. */
  aideVisites: true,
  /** §4 B4 — centre d'aide /aide. */
  aideCentre: true,
  /** §5 — vidéo hero HyperFrames (sinon : séquence HTML). Décision Benj : après la démo. */
  landingVideo: false,
  /** §9 G2 — persona et apparence avancée de la plateforme. */
  plateformePersona: false,
  /** Canaux WhatsApp — vendu dans la grille cible, pas construit. Reste caché tant que c'est vrai. */
  canauxWhatsapp: false,
  /** Canaux réseaux sociaux — idem. */
  canauxReseaux: false,
} as const

export type Flag = keyof typeof FLAGS

export const actif = (f: Flag): boolean => FLAGS[f]
