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
  /** v7 bloc 2 — code par email à la connexion (routes api/auth/code, verrou lib/authArtisan, appareils de
   *  confiance). À passer à `true` dès que la migration 0063 est collée : avec le drapeau levé et sans les
   *  tables, le verrou refuse TOUT (fail-closed, voulu) — d'où l'ordre : coller, puis lever. */
  codeEmail: true,
  /** v9 J2 — notifications push web (routes api/push, lib/push, Paramètres → Notifications). À lever dès que la
   *  migration 0064 est collée : baissé, les routes répondent 503 et rien n'est proposé à l'artisan. */
  pushWeb: true,
  /** v9 J3 — notifications NATIVES (coque Capacitor). À lever quand `google-services.json` (M3) est dans mobile/android/app/ :
   *  sans Firebase, `PushNotifications.register()` plante l'app Android. Baissé : l'app dit « prochaine version ». */
  pushNatif: true,
  /** §6 — 2FA TOTP via Supabase MFA. Décision Benj du 04/09 : dans le sprint. Livré et testé (scripts/mfa-e2e.mjs). */
  mfa: true,
  /** v10 J1 — le Centre de direction (app/direction, app/api/direction). À lever dès que la migration 0065 est collée :
   *  levé sans les tables, la garde répond 503 (fail-closed, voulu) — d'où l'ordre : coller, puis lever. Baissé : 404. */
  direction: true,
  /** v10 J2 — Registre des apports avec preuve (lien /a/<code>, onglets Clients et Apports). À lever quand la
   *  migration 0067 est collée : sans elle, les routes répondent 503 et les onglets ne sont pas proposés. */
  apports: false,
  /** §8 F1 — photo de facture fournisseur → OCR → lignes proposées. */
  inventaireOcr: false,
  /** §8 F3 — assistant de recherche fournisseurs. Livré et testé le 04/09 (scripts/recherche-e2e.mjs : 37/37, vraie recherche Castorama). */
  inventaireRecherche: true,
  /** §9 G1 — poste de pilotage de la plateforme (conversations, prise de main). */
  plateformePilotage: true,
  /** §9 G1 — constructeur de règles d'automatisation. */
  plateformeRegles: true,
  /** §10 H2 — slides 3D de réalisations (Signature). Livré, 14/14 en mode production local. */
  siteSlides3d: true,
  /** §4 B3 — visites guidées à la première ouverture. */
  aideVisites: true,
  /** §4 B4 — centre d'aide /aide. */
  aideCentre: true,
  /** §5 — vidéo hero HyperFrames (sinon : séquence HTML). Décision Benj : après la démo. */
  landingVideo: true,
  /** §9 G2 — persona et apparence avancée de la plateforme. Livré (sprint J-1). */
  plateformePersona: true,
  /** Canaux WhatsApp — vendu dans la grille cible, pas construit. Reste caché tant que c'est vrai. */
  canauxWhatsapp: false,
  /** Canaux réseaux sociaux — idem. */
  canauxReseaux: false,
} as const

export type Flag = keyof typeof FLAGS

export const actif = (f: Flag): boolean => FLAGS[f]
