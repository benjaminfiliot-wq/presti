// scripts/fixtures/026-garde/blanc/lot.mjs — le lot « gblanc » de scripts/juges-026-pilotage-preuve.mjs (contrat : 026-pilotage/a/lot.mjs),
// écrit par Claude Code. Il juge UN juge : scripts/garde-blanc-qa.mjs (la règle white-label, critères GB-1 à GB-7).
//
//   node scripts/juges-026-pilotage-preuve.mjs --lot=gblanc --lot-fichier=scripts/fixtures/026-garde/blanc/lot.mjs
//
// Référence : HEAD de main au 30/09/2026 (00f0ab51), l'arbre AVEC les fuites : sur lui le juge doit être rouge, GB-1 le premier.
// `absents` : le seul chemin que la référence ne porte pas, celui de la portée réduite du témoin (garde-blanc-portee.json) ; le
// témoin le pose avec des copies minimales et corrigées d'un générateur, d'un site, de ses mentions légales, d'un gabarit de pub,
// d'un lib/email.ts, d'un modèle de prospection et d'un appelant de sendEmail. Sur cet arbre le juge ne lit que ces fichiers
// (la portée réduite n'est reçue que d'un témoin posé par --racine : GB-7 la refuse à la racine du dépôt).
//
// Les sabotages : chacun remplace UN texte du témoin (ou retire un fichier) et doit être vu par le critère `tue`. Ceux dont le
// premier critère (GB-1) reste vert — crédits au fondateur, mentions légales, courrier, appelants, titres, téléphones, portée —
// prouvent que le juge ne se réduit pas à chercher le mot.
export const fiche = '026-garde-blanc'
export const reference = '00f0ab51dab621a7043d3b57785c41ddd999c56e'
export const temoin = './temoin'
export const absents = ['garde-blanc-portee.json']

const G = 'public/sites-demo/generer.mjs'
const S = 'public/sites-demo/temoin-artisan'
const IDX = `${S}/index.html`, ML = `${S}/mentions-legales/index.html`, ATT = `${S}/attributions.json`
const GAB = 'gabarits-pubs/locale/chantier/index.html'
const EM = 'lib/email.ts', MOD = 'lib/agents/acquisition/modeles.ts', LEADS = 'app/api/leads/route.ts'
const PORTEE = 'garde-blanc-portee.json'

export const juges = [
  {
    commande: 'scripts/garde-blanc-qa.mjs', arguments: [], loader: false, attendu: 'GB-1', criteresMin: 7, tailleMin: 9000,
    sabotages: [
      // GB-1 : le mot, dans un gabarit, un pied de page produit, une URL, un modèle exempté
      { nom: 'gabarit-pub-presti', fichier: GAB, avant: 'Devis gratuit.', apres: 'Devis gratuit, par Presti.', tue: 'GB-1' },
      { nom: 'pied-prepare-par-presti', fichier: G, avant: 'préparée pour ${esc(entree.entreprise)}', apres: 'préparée par Presti pour ${esc(entree.entreprise)}', tue: 'GB-1' },
      { nom: 'modele-exempte-prestiapp', fichier: MOD, avant: "envoyé par l'assistant IA de Presti.\"\n", apres: "envoyé par l'assistant IA de Presti, sur prestiapp.fr.\"\n", tue: 'GB-1' },
      { nom: 'generateur-retire', fichier: G, retirer: true, tue: 'GB-1' },
      // GB-2 : crédits et attributions
      { nom: 'credit-modifie-par-presti', fichier: ATT, avant: '"modifiee": "Oui — recadrée pour le web"', apres: '"modifiee": "Oui — recadrée par Presti"', tue: 'GB-2' },
      { nom: 'credit-fondateur', fichier: ATT, avant: '"modifiee": "Oui — recadrée pour le web"', apres: '"modifiee": "Oui — recadrée par Benjamin Filiot"', tue: 'GB-2' },
      { nom: 'credit-de-page-presti', fichier: IDX, avant: 'photo recadrée.', apres: 'photo recadrée par Presti.', tue: 'GB-2' },
      { nom: 'credit-genere-fondateur', fichier: G, avant: "' — photo modifiée'", apres: "' — photo modifiée par Benjamin Filiot'", tue: 'GB-2' },
      // GB-3 : mentions légales
      { nom: 'mentions-sans-mediateur', fichier: ML, avant: '<p>Médiateur de la consommation : à compléter avec vous</p>\n', apres: '', tue: 'GB-3' },
      { nom: 'mentions-siren-vide', fichier: ML, avant: '<p>Numéro SIREN : 123 456 789</p>', apres: '<p>Numéro SIREN :</p>', tue: 'GB-3' },
      { nom: 'mentions-sans-hebergeur', fichier: ML, avant: '<p>Hébergeur : Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis</p>\n', apres: '', tue: 'GB-3' },
      { nom: 'mentions-directeur-fondateur-presti', fichier: ML, avant: 'Directeur de la publication : Marie Duval', apres: 'Directeur de la publication : Benjamin Filiot (Fondateur Presti)', tue: 'GB-3' },
      { nom: 'generateur-mentions-sans-mediateur', fichier: G, avant: '<p>Médiateur de la consommation : à compléter avec vous</p>', apres: '', tue: 'GB-3' },
      // GB-4 : courrier
      { nom: 'courrier-adresse-presti', fichier: EM, avant: "'envoi@messagerie-artisans.example'", apres: "'contact@prestiapp.fr'", tue: 'GB-4' },
      { nom: 'courrier-reply-to-editeur', fichier: EM, avant: 'const replyTo = opts.replyTo || (opts.fromName !== undefined ? undefined : EMAIL_ENTREPRISE)', apres: 'const replyTo = opts.replyTo || EMAIL_ENTREPRISE', tue: 'GB-4' },
      { nom: 'courrier-repli-sur-la-plateforme', fichier: EM, avant: ".slice(0, 70) || 'Votre artisan'", apres: '.slice(0, 70) || NOM_PLATEFORME', tue: 'GB-4' },
      { nom: 'courrier-nom-de-la-plateforme', fichier: EM, avant: 'return `${clean} <${FROM_ADDR_ARTISAN}>`', apres: 'return `${NOM_PLATEFORME} <${FROM_ADDR_ARTISAN}>`', tue: 'GB-4' },
      { nom: 'appelant-nom-vide', fichier: LEADS, avant: "fromName: artisan.nom?.trim() || 'Votre artisan',", apres: 'fromName: artisan.nom || undefined,', tue: 'GB-4' },
      { nom: 'appelant-repli-presti', fichier: LEADS, avant: "${artisan.nom ?? 'votre artisan'}", apres: "${artisan.nom ?? 'Presti'}", tue: 'GB-4' },
      // GB-5 : titre et h1 contre le corps
      { nom: 'titre-zone-alentours', fichier: IDX, avant: '<title>Menuiserie Duval — Menuisier</title>', apres: '<title>Menuiserie Duval — Menuisier à Rennes et alentours</title>', tue: 'GB-5' },
      { nom: 'h1-zone-rayon', fichier: IDX, avant: '<h1>Menuiserie Duval</h1>', apres: '<h1>Menuiserie Duval, dans un rayon de 30 km</h1>', tue: 'GB-5' },
      { nom: 'h1-reprend-le-telephone', fichier: IDX, avant: '<h1>Menuiserie Duval</h1>', apres: '<h1>Menuiserie Duval, téléphone direct</h1>', tue: 'GB-5' },
      // GB-6 : numéros à reconfirmer
      { nom: 'telephone-cliquable', fichier: IDX, avant: '<p>Téléphone : 02 99 00 00 00 (numéro à reconfirmer)</p>', apres: '<p>Téléphone : <a href="tel:+33299000000">02 99 00 00 00</a> (numéro à reconfirmer)</p>', tue: 'GB-6' },
      { nom: 'generateur-telephone-cliquable', fichier: G, avant: '<p>Téléphone : à reconfirmer avec vous</p>', apres: '<p>Téléphone : <a href="tel:+33299000000">02 99 00 00 00</a> à reconfirmer avec vous</p>', tue: 'GB-6' },
      // GB-7 : la portée du juge
      { nom: 'portee-sans-courriel', fichier: PORTEE, avant: '"courriel": "lib/email.ts"', apres: '"courriel": ""', tue: 'GB-7' },
      { nom: 'portee-sans-generation', fichier: PORTEE, avant: '"generations": [{ "nom": "maquette-temoin", "maquette": "garde-blanc-jeu/maquette.json" }],', apres: '"generations": [],', tue: 'GB-7' },
      { nom: 'portee-sans-site', fichier: PORTEE, avant: '"sites": ["public/sites-demo/temoin-artisan"],', apres: '"sites": [],', tue: 'GB-7' },
    ],
  },
]

export const controles = [
  { id: 'JA-3', module: './controles.mjs', fonction: 'controleJeuxGB' },
]
