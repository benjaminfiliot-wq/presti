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
  apports: true,
  /** v10 J2b — agir sur un artisan (crédits, suspension, réactivation, message, portail). À lever quand la
   *  migration 0068 est collée : sans elle, les routes répondent 404 et la fiche n'affiche aucun bouton. */
  actionsArtisan: true,
  /** v10 J3 — la messagerie de l'entreprise (boîte unifiée, classement, réponse dans le fil).
   *  À lever quand la migration 0069 est collée : sans elle, les routes répondent 404 et l'onglet
   *  n'apparaît pas dans le Centre. */
  messagerie: true,
  /** v11 J5 — la comptabilité de l'entreprise et le relevé du partenaire. Levé quand 0071 est collée :
   *  sans elle, les routes répondent 503 sur des tables absentes et l'onglet n'a rien à montrer. */
  comptabilite: true,
  /** v11 §5 — le mode support : l'artisan ouvre lui-même une fenêtre d'une heure sur UN élément qu'il
   *  a désigné, on n'y lit que la forme, chaque lecture est tracée des deux côtés. Levé le 08/09,
   *  après les deux conditions que je m'étais données : migrations 0074 et 0075 en base, et
   *  `support-e2e` 34/34 contre un vrai serveur — dont la preuve que la phrase témoin d'un message
   *  ne sort pas, et que la vue d'à côté (RLS fondateur) est bien fermée : 0 devis, 0 factures,
   *  0 demandes là où il y en avait 9, 12 et 9. */
  supportArtisan: true,
  /** §8 F1 — photo de facture fournisseur → OCR → lignes proposées. */
  inventaireOcr: false,
  /** §8 F3 — assistant de recherche fournisseurs. Livré et testé le 04/09 (scripts/recherche-e2e.mjs : 37/37, vraie recherche Castorama). */
  inventaireRecherche: true,
  /** §9 G1 — constructeur de règles d'automatisation. */
  plateformeRegles: true,
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
  /** v15 §3 — le site à la demande : la page /site/commander, le dossier (api/site/commander/brouillon) et le
   *  paiement unique (api/site/commander). À lever dès que la migration 0088 est collée : levé sans la table,
   *  les routes répondent 503 (fail-closed, voulu) — d'où l'ordre : coller, puis lever. Baissé : 404. */
  siteCommande: true,
  /** v15 §4 — la VENTE du site : le bloc « Le site, à la demande — 300 € une fois » et le bouton « Commander mon
   *  site » sur la landing et /abonnement. Ne se lève qu'après l'étape 7 verte et un site de démonstration
   *  regardé par Benj (H5). Tant qu'il est baissé, la page n'est atteignable que par son adresse. */
  siteCommandeVente: false,
  /** v16 §3.4 — le bloc « Et le site qui va avec » sous la séquence de la landing : la capture animée de LA démo
   *  (Atelier Lestraque) et le lien vers le site réel. Il MONTRE, il ne vend pas (pas de bouton de commande). Se lève
   *  quand la démo est validée sans Benj : site-qa + grille-qa + code-qa verts (scripts/demo-verifier.mjs) et la vidéo
   *  passée au juge (scripts/video-qa.mjs public/promo/demo-site/lestraque.mp4). */
  landingDemoSite: true,
  /** 14/09 — la mesure d'audience de la vitrine, sans cookie (lib/audience.ts, app/Audience.tsx, api/audience, onglet
   *  Visiteurs du Poste). Levé le 14/09 : migrations 0090 à 0092 appliquées (MCP Supabase, feu vert de Benj), après une
   *  revue adversariale (20 défauts) et une contre-revue (8), tous corrigés, et audience-e2e vert. Levé sans les tables,
   *  les vues se perdraient (204, erreur en console) et l'onglet répondrait 503. Baissé : rien n'est envoyé ni écrit, la
   *  route répond 404, l'onglet n'existe pas, /confidentialite ne décrit pas la mesure — mais la purge quotidienne
   *  continue d'effacer ce qui a été écrit (lib/purgesRgpd.ts, étape 8, hors drapeau). */
  audience: true,
} as const

export type Flag = keyof typeof FLAGS

export const actif = (f: Flag): boolean => FLAGS[f]
