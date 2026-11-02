// scripts/fixtures/landing-v2-qa/sondes.mjs — S4 de scripts/landing-v2-qa.mjs (tâche 033-002) : chaque détecteur éprouvé sur des sondes.
//
// `vue` : une faute que le détecteur DOIT voir. `juste` : une phrase juste qu'il DOIT laisser passer. Un détecteur aveugle (faute non vue) ou
// bavard (juste phrase condamnée) fait échouer S4. Les sondes n'emploient aucune donnée réelle.
import { DETECTEURS as D, couleursDe, classeCouleur, drapeauLandingV2, fictif, selecteurConcerne, ETAPES, BLOC6, TITRE_ENSUITE } from './regles.mjs'
import { nettoyer } from './harnais.mjs'

const dr = { canauxWhatsapp: false, canauxReseaux: false, inventaireOcr: false }
export const SONDES_TEXTE = [
  // fautes vues
  { det: 'garantie', vue: 'Résultats garantis' },
  { det: 'garantie', vue: 'Nous vous garantissons des clients dès le premier mois.' },
  { det: 'autoSansSignature', vue: 'L’assistant répond seul (formule Studio).' },
  { det: 'autoSansSignature', vue: 'Avec Studio, la relance part toute seule.' },
  { det: 'autoSansSignature', vue: 'Relance J+2 planifiée' },
  { det: 'autoSansSignature', vue: 'Les relances sont programmées après la réponse.' },
  { det: 'autoSansSignature', vue: 'Rien ne part sans vous.' },
  { det: 'autoSansSignature', vue: 'Rien ne part sans votre clic.' },
  { det: 'moinsUneMinute', vue: 'Réponse prête en moins d’une minute' },
  { det: 'moinsUneMinute', vue: 'Réponse prête en moins d\'1 minute' },
  { det: 'moinsUneMinute', vue: 'Réponse prête en moins de 60 secondes' },
  { det: 'moinsUneMinute', vue: 'Réponse prête en mоins d\'une minute' }, // le « о » est cyrillique
  { det: 'urgence', vue: 'Places limitées : dernière chance' },
  { det: 'urgence', vue: 'Plus que 3 places' },
  { det: 'urgence', vue: 'Prenez de l’avance avant vos concurrents' },
  { det: 'urgence', vue: 'Offre valable 02:59:59' },
  { det: 'gain', vue: '2 000 € de CA en plus' },
  { det: 'gain', vue: 'Combien il vous rapporte' },
  { det: 'gain', vue: 'Un bénéfice assuré' },
  { det: 'remise', vue: '-20 % avec le code PRESTI20' },
  { det: 'remise', vue: '20 % de remise' },
  { det: 'remise', vue: 'Un coupon de bienvenue' },
  { det: 'preuve', vue: '★★★★★' },
  { det: 'preuve', vue: 'Note de 4,8/5' },
  { det: 'preuve', vue: '1 200 artisans l’utilisent' },
  { det: 'preuve', vue: 'Ils nous font confiance' },
  { det: 'marque', vue: 'Hébergé chez Supabase' },
  { det: 'marque', vue: 'Nos agents répondent à vos clients.' },
  { det: 'marque', vue: 'Construit avec n8n et un workflow.' },
  { det: 'marque', vue: 'Propulsé par Claude' },
  { det: 'delai', vue: 'Réponse sous 24 h.' },
  { det: 'delai', vue: 'Nous vous répondons rapidement.' },
  { det: 'dureeOuChiffre', vue: 'Une réponse en 5 minutes' },
  { det: 'dureeOuChiffre', vue: 'Une réponse instantanée pour vos clients' },
  { det: 'dureeOuChiffre', vue: 'Trois réponses par jour' },
  { det: 'promesseInterdite', vue: 'Presti répond à vos appels.' },
  { det: 'promesseInterdite', vue: 'Presti prend vos rendez-vous à votre place.' },
  { det: 'promesseInterdite', vue: 'Votre devis part automatiquement chez le client.' },
  { det: 'promesseInterdite', vue: 'Presti encaisse le paiement de vos clients.' },
  { det: 'promesseInterdite', vue: 'Vos messages WhatsApp arrivent dans Presti.' },
  { det: 'promesseInterdite', vue: 'Une facture lue en photo par l’OCR.' },
  // justes laissées
  { det: 'garantie', juste: 'Votre garantie décennale reste valable.' },
  { det: 'garantie', juste: 'Une garantie de parfait achèvement de un an.' },
  { det: 'autoSansSignature', juste: 'Avec Signature, la relance part seule.' },
  { det: 'autoSansSignature', juste: 'Studio prépare, vous validez d’un clic ; Signature envoie seul.' },
  { det: 'autoSansSignature', juste: 'Avec Studio, tout est préparé et vous validez d’un clic.' },
  { det: 'autoSansSignature', juste: 'Une seule question suffit pour envoyer votre demande.' },
  { det: 'autoSansSignature', juste: 'Essai gratuit, sans carte bancaire, sans engagement.' },
  { det: 'moinsUneMinute', juste: 'Une minute de lecture suffit à comprendre.' },
  { det: 'moinsUneMinute', juste: 'Moins de dix devis par mois.' },
  { det: 'urgence', juste: 'Il n’y a plus de place pour les oublis.' },
  { det: 'gain', juste: 'Marge sur matériaux, estimée' },
  { det: 'gain', juste: 'Le rapport de chantier est prêt.' },
  { det: 'remise', juste: 'Une remise en main propre du devis.' },
  { det: 'preuve', juste: '7× plus de chances d’obtenir un vrai échange avec le client. Source : Harvard Business Review, « The Short Life of Online Sales Leads » (étude sur 2 241 entreprises)' },
  { det: 'preuve', juste: 'Pour les artisans du bâtiment.' },
  { det: 'marque', juste: 'Nous intégrons Presti à votre organisation et connectons des agents IA à vos outils.' },
  { det: 'marque', juste: BLOC6 },
  { det: 'marque', juste: 'Créez un modèle de devis en un clic.' },
  { det: 'marque', juste: 'Une agence de communication ou un agenda partagé.' },
  { det: 'delai', juste: 'Vous décidez librement.' },
  { det: 'dureeOuChiffre', juste: 'Chaque demande reçoit sa réponse préparée, vous gardez la main.' },
  { det: 'promesseInterdite', juste: 'Presti ne répond jamais à vos appels : il prépare vos réponses écrites.' },
  { det: 'promesseInterdite', juste: 'Le client peut prendre rendez-vous avec vous quand il veut.' },
  { det: 'promesseInterdite', juste: 'Votre devis est prêt : vous l’envoyez d’un clic.' },
]

/** Exécute les sondes de texte. → { total, defauts: [..] } */
export function jouerSondesTexte() {
  const defauts = []
  for (const s of SONDES_TEXTE) {
    const r = s.det === 'promesseInterdite' ? D[s.det](s.vue ?? s.juste, dr) : D[s.det](s.vue ?? s.juste)
    if (s.vue && !r) defauts.push(`détecteur « ${s.det} » aveugle : n’a pas vu « ${s.vue} »`)
    if (s.juste && r) defauts.push(`détecteur « ${s.det} » bavard : a condamné « ${s.juste} » (${r.motif})`)
  }
  return { total: SONDES_TEXTE.length, defauts }
}

// ── Les couleurs : les dérives citées par .claude/skills/presti-design/SKILL.md:18 et :109, et les jetons de app/base.css et de .lp ─────────────
const HEX = (h) => couleursDe(h)[0]
export const SONDES_COULEUR = [
  { c: '#6C8CFF', classe: 'froid' }, { c: '#8A6BFF', classe: 'froid' }, { c: '#3EE0F0', classe: 'froid' }, { c: '#2563eb', classe: 'froid' },
  { c: 'rgba(120,150,255,.06)', classe: 'froid' }, { c: 'blue', classe: 'froid' }, { c: 'hsl(260, 80%, 60%)', classe: 'froid' },
  // neutres : gris froids, fonds nuit
  { c: '#8B93A2', classe: 'neutre' }, { c: '#7F8797', classe: 'neutre' }, { c: '#0A0C11', classe: 'neutre' }, { c: '#09090C', classe: 'neutre' }, { c: '#141319', classe: 'neutre' },
  { c: '#ECEAE6', classe: 'neutre' }, { c: 'rgba(255,255,255,.09)', classe: 'neutre' }, { c: '#8B867D', classe: 'neutre' },
  // corail
  { c: '#D97757', classe: 'corail' }, { c: '#E8946F', classe: 'corail' }, { c: '#B85C3C', classe: 'corail' }, { c: '#C15F3C', classe: 'corail' }, { c: 'rgba(217,119,87,.14)', classe: 'corail' }, { c: '#F0776A', classe: 'corail' },
  // vert réservé
  { c: '#38CD8C', classe: 'vert' }, { c: 'rgba(56,205,140,.15)', classe: 'vert' }, { c: '#46C89A', classe: 'vert' },
  // sémantiques (jaunes) : ni froids ni verts
  { c: '#E4B45A', classe: 'autre' }, { c: '#F5B301', classe: 'autre' },
]
export function jouerSondesCouleur() {
  const defauts = []
  for (const s of SONDES_COULEUR) {
    const c = HEX(s.c)
    if (!c) { defauts.push(`couleur illisible : ${s.c}`); continue }
    const k = classeCouleur(c)
    if (k !== s.classe) defauts.push(`${s.c} classée « ${k} » (teinte ${Math.round(c.h)}°, sat. ${Math.round(c.s * 100)} %, lum. ${Math.round(c.l * 100)} %), attendu « ${s.classe} »`)
  }
  return { total: SONDES_COULEUR.length, defauts }
}

// ── La donnée fictive (LV-12), le sélecteur concerné (LV-3/13), le drapeau (LV-5) ───────────────────────────────────────────────────────────────
export function jouerSondesDiverses() {
  const defauts = []
  const attendre = (nom, ok) => { if (!ok) defauts.push(nom) }
  for (const t of ['Bonjour Marie', 'Marie · 14:02', 'Madame Garnier', 'DEV-2026-0042', '873,40 €', '620,00']) attendre(`fictif() n’a pas vu « ${t} »`, !!fictif(t, false))
  for (const t of ['Bonjour,', 'Studio : 7 jours gratuits', 'Un devis chiffré sur vos prix', 'Presti']) attendre(`fictif() a condamné « ${t} »`, !fictif(t, false))
  attendre('fictif() n’a pas vu « 59 € » dans une démo', !!fictif('59 €', true))
  attendre('fictif() a condamné « 59 € » hors démo', !fictif('59 €', false))
  const classes = new Set(['lp', 'lp-btn', 'lp2-win']); const ids = new Set(['entreprise'])
  attendre('sélecteur « :root » non concerné', selecteurConcerne(':root', classes, ids))
  attendre('sélecteur « .lp » non concerné', selecteurConcerne('.lp', classes, ids))
  attendre('sélecteur « .lp-btn:hover » non concerné', selecteurConcerne('.lp-btn:hover', classes, ids))
  attendre('sélecteur « .hud » concerné à tort', !selecteurConcerne('.hud', classes, ids))
  attendre('sélecteur « .lp .jv-save » concerné à tort', !selecteurConcerne('.lp .jv-save', classes, ids))
  attendre('sélecteur « a » (sans classe) concerné à tort', !selecteurConcerne('a', classes, ids))
  attendre('drapeau : « landingV2: false » non lu', drapeauLandingV2('export const FLAGS = { landingV2: false } as const') === false)
  attendre('drapeau : « landingV2: true » lu comme false', drapeauLandingV2('export const FLAGS = { landingV2: true } as const') === true)
  attendre('drapeau : absent lu comme présent', drapeauLandingV2('export const FLAGS = { autre: false } as const') === null)
  attendre('constantes : trois étapes', ETAPES.length === 3 && !!TITRE_ENSUITE && nettoyer(BLOC6).includes('agents IA'))
  return { total: 17 + 6 + 4, defauts }
}
