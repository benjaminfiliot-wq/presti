// Lance toute la suite de vérification (v4 §15) — une seule commande.
//
// Pourquoi ce script : soixante-dix fichiers de test, personne ne les lance tous à la main, donc
// personne ne les lance. Ici on a un état global en une commande, et surtout un ORDRE :
// ce qui ne coûte rien d'abord, ce qui consomme des crédits IA à la fin, pour qu'un
// échec bête (typage, build) ne se paie pas en appels au modèle.
//
// Une suite absente de SUITES n'est jouée par personne — ni ici, ni par l'audit de nuit, qui
// appelle ce script. Le 07/09 il y en avait quinze, pendant que le rapport de couverture les
// comptait comme preuve et annonçait « 0 case vide ». Ce qui est écarté volontairement se déclare
// dans HORS_LANCEUR, avec sa raison ; le reste est un oubli, et l'inventaire le signale.
//
// Usage :
//   node scripts/tout-verifier.mjs          → tout sauf ce qui consomme des crédits
//   node scripts/tout-verifier.mjs --tout   → y compris les tests qui appellent l'IA
//   node scripts/tout-verifier.mjs --rapide → seulement les tests sans navigateur

import { spawnSync } from 'node:child_process'

const args = process.argv.slice(2)
const tout = args.includes('--tout')
const rapide = args.includes('--rapide')

// couts : 'gratuit' (pur calcul) · 'navigateur' (Playwright, lent) · 'ia' (crédits Anthropic)
const SUITES = [
  { nom: 'Typage', cmd: 'npx', args: ['tsc', '--noEmit'], cout: 'gratuit' },
  { nom: 'Build', cmd: 'npm', args: ['run', 'build'], cout: 'gratuit' },
  { nom: 'Budgets de performance', cmd: 'node', args: ['scripts/budget-perf.mjs'], cout: 'gratuit' },
  // Le 08/09 un fichier a coller ne se parsait plus, et Benj l'a decouvert en le collant.
  { nom: 'Fichiers a coller', cmd: 'node', args: ['scripts/migrations-jumelles-e2e.mjs'], cout: 'gratuit' },
  // La fenetre d'a cote : ce qu'un jeton de navigateur voit des donnees des AUTRES artisans.
  // Branchee le 08/09 -- elle existait depuis la veille sans etre jouee par personne, et c'est
  // ainsi que la sixieme policy fondateur a survecu au menage de 0074.
  { nom: 'RLS : ce qu un jeton de navigateur voit des autres', cmd: 'node', args: ['scripts/sonde-rls-fondateur.mjs'], cout: 'gratuit' },
  // Les six routes de la fuite du 07/09 doivent RESTER supprimées : c'est exactement le genre de
  // chose qui revient par un merge malheureux, et personne ne le verrait.
  { nom: 'L ancien poste de controle reste supprime', cmd: 'node', args: ['scripts/sonde-ancien-poste.mjs'], cout: 'gratuit' },

  { nom: 'Chiffrement des canaux', cmd: 'node', args: ['scripts/canaux-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Lecture des emails', cmd: 'node', args: ['--experimental-strip-types', 'scripts/maillite-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Réglages du site', cmd: 'node', args: ['--experimental-strip-types', 'scripts/site-style-e2e.mjs'], cout: 'navigateur' },
  { nom: 'Tarifs et provenance des prix', cmd: 'node', args: ['--experimental-strip-types', 'scripts/tarifs-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Conformité de facturation', cmd: 'node', args: ['--experimental-strip-types', 'scripts/facturation-e2e.mjs'], cout: 'gratuit' },
  { nom: 'XML de facture électronique', cmd: 'node', args: ['--experimental-strip-types', 'scripts/facturx-e2e.mjs'], cout: 'gratuit' },

  { nom: 'Isolation entre artisans (RLS)', cmd: 'node', args: ['scripts/rls-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Force des mots de passe', cmd: 'node', args: ['--experimental-strip-types', 'scripts/motdepasse-e2e.mjs'], cout: 'navigateur' },
  { nom: 'Mots de passe fuités (HIBP)', cmd: 'node', args: ['--experimental-strip-types', 'scripts/fuite-mdp-e2e.mjs'], cout: 'gratuit' },
  // ── Sprint v5 (J-1 démo)
  { nom: 'Offres = verrous (matrice)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/offres-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Limites atomiques', cmd: 'node', args: ['scripts/limites-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Plafond de réinitialisation', cmd: 'node', args: ['scripts/reset-plafond-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Mentions bloquantes à l émission', cmd: 'node', args: ['scripts/mentions-bloquantes-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Verrou serveur des règles (offre)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/regles-verrou-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Purge des comptes (effacement / anonymisation)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/purge-comptes-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Correctifs de l audit final (B, C, H)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/audit-final-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Fermeture des portes (routes, crons, pages, capacités, drapeaux)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/fermeture-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Carte des emails', cmd: 'node', args: ['scripts/emails-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Garde de commit (régressions connues)', cmd: 'node', args: ['scripts/garde-commit.mjs'], cout: 'gratuit' },
  { nom: 'Quota de stockage par compte', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/quota-media-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Purges RGPD (12 mois / 3 ans)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/purges-rgpd-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Relances automatiques (bout en bout, sans IA)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/relances-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Domaine perso (routage, marque, vérification)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/domaine-perso-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Motion — CLS des slides, onglets de la démo, boucles hors écran', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/motion-cls-e2e.mjs'], cout: 'navigateur' },
  { nom: 'Mobile (iPhone 14, Pixel 7, iPad Mini : 28 pages, parcours, clavier, Lighthouse)', cmd: 'node', args: ['scripts/mobile-e2e.mjs'], cout: 'navigateur' },
  { nom: 'App installable (manifeste, white-label, service worker, hors-ligne, carte Android/iOS, mise à jour)', cmd: 'node', args: ['scripts/pwa-e2e.mjs'], cout: 'navigateur' },
  { nom: 'Liens profonds de l’app (assetlinks, white-label, chemins manifeste = pont, coque fermée)', cmd: 'node', args: ['scripts/liens-profonds-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Poste de contrôle — socle (garde, second facteur, re-confirmation, journal immuable, rôle lecture, écran)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/controle-e2e.mjs'], cout: 'navigateur' },
  { nom: 'Poste de contrôle — registre des apports (lien signé, preuve infalsifiable, pièce obligatoire, 10 % contesté)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/controle-apports-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Poste de contrôle — gestes d’argent en mode TEST (offre, prorata, remboursement borné, pause, alignement en base)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/controle-argent-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Poste de contrôle — messagerie de l’entreprise (dédoublonnage, fil, classement journalisé, boîte non lisible par PostgREST)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/controle-messagerie-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Poste de contrôle — droits du partenaire (chaque action interdite rejouée avec son jeton, et PostgREST muet)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/controle-droits-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Poste de contrôle — comptabilité et relevé du partenaire (annexe A du contrat, au centime)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/controle-compta-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Poste de contrôle — audience de la vitrine (liste fermée de pages, aucune IP écrite, empreinte effacée au lendemain, route gardée, envoi muet hors vitrine)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/audience-e2e.mjs'], cout: 'navigateur' },
  { nom: 'Zéro démo — aucun compte privilégié inattendu, aucune donnée de test en production, aucun écran du produit qui montre du faux', cmd: 'node', args: ['scripts/zero-demo-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Notifications push web (envoi chiffré, purge 410, plafond, charge utile sans donnée personnelle, routes, écran)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/push-e2e.mjs'], cout: 'navigateur' },
  { nom: 'Code par email à la connexion (anti-énumération, essais, appareils de confiance, TOTP)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/code-connexion-e2e.mjs'], cout: 'navigateur' },
  { nom: 'Les trois modes de réponse (offre × mode × route, sans IA)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/modes-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Alertes (ronde à sec, huit motifs)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/alertes-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Cache mutualisé des prix', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/cache-prix-e2e.mjs'], cout: 'gratuit' },
  { nom: 'IA — unitaires (métiers, playbooks, anti-fabrication)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/ia-unit-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Qualification des demandes (type de chantier et ville, sans IA)', cmd: 'node', args: ['scripts/qualification-qa.mjs'], cout: 'gratuit' },
  { nom: 'Formulaire « Recevoir la maquette » de la vitrine (câblage vers la route entrante)', cmd: 'node', args: ['scripts/maquette-formulaire-qa.mjs'], cout: 'gratuit' },
  { nom: 'Aide (panneau, ⓘ, visite, centre)', cmd: 'node', args: ['scripts/aide-e2e.mjs'], cout: 'navigateur' },
  { nom: 'IA — cerveau urgence (registre de cas, régression = échec)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'lib/ai/cerveaux/urgence/evaluer.mjs'], cout: 'gratuit' },
  { nom: 'Inventaire v2 (fiches, fournisseurs, isolation)', cmd: 'node', args: ['scripts/inventaire-v2-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Slides 3D (Signature)', cmd: 'node', args: ['scripts/slides-e2e.mjs'], cout: 'navigateur' },
  { nom: 'Paramètres (navigation, sécurité, données)', cmd: 'node', args: ['scripts/parametres-e2e.mjs'], cout: 'navigateur' },
  { nom: 'Poste de pilotage (propositions, prise de main, règles)', cmd: 'node', args: ['scripts/pilotage-e2e.mjs'], cout: 'ia' },
  { nom: 'Correctifs de l audit', cmd: 'node', args: ['scripts/audit-correctifs-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Inventaire', cmd: 'node', args: ['scripts/inventaire-e2e.mjs'], cout: 'navigateur' },
  { nom: 'Photos et géolocalisation', cmd: 'node', args: ['scripts/photos-e2e.mjs'], cout: 'navigateur' },
  { nom: 'Visionneuse et réassurance', cmd: 'node', args: ['scripts/site-motion-e2e.mjs'], cout: 'navigateur' },
  { nom: 'Accessibilité (axe-core)', cmd: 'node', args: ['scripts/a11y-e2e.mjs'], cout: 'navigateur' },
  { nom: 'Indexation et white-label', cmd: 'node', args: ['scripts/seo-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Existence juridique des surfaces', cmd: 'node', args: ['scripts/legal-e2e.mjs'], cout: 'navigateur' },
  { nom: 'Canaux — interface', cmd: 'node', args: ['scripts/canaux-visuel.mjs'], cout: 'navigateur' },

  { nom: 'Injection de prompt', cmd: 'node', args: ['scripts/injection-e2e.mjs'], cout: 'ia' },
  { nom: 'Provenance dans un devis réel', cmd: 'node', args: ['scripts/devis-source-e2e.mjs'], cout: 'ia' },

  // ── Branchées le 07/09. Elles existaient depuis des semaines, personne ne les lançait : le
  //    rapport de couverture les comptait pourtant comme preuve, ce qui a laissé dix éléments
  //    — dont le portail de facturation Stripe — hors de tout regard nocturne.
  { nom: 'Mode support — la matrice des droits (unitaire, sans reseau)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/support-droits-unit.mjs'], cout: 'gratuit' },
  { nom: 'Mode support — la porte : un ticket n’autorise rien, l’artisan seul ouvre, chaque lecture trace', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/support-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Courriers de l’entreprise — resolution de la boite et classement par nature', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/courriers-e2e.mjs'], cout: 'gratuit' },
  // Elle importe `lib/plans.ts` (d'où le chargeur TypeScript) ET elle poste sur
  // `/api/conversation/stream`, qui fait une VRAIE réponse d'IA — d'où le coût 'ia'. Je l'avais
  // classée « gratuit » le 07/09 en cherchant le mot « anthropic » dans sa source : il n'y est pas,
  // parce que l'appel passe par une route du produit. Mauvaise méthode, deux réponses dépensées.
  { nom: 'Abonnement de bout en bout (11 transitions, sans débit)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/abonnement-e2e.mjs'], cout: 'ia' },
  { nom: 'Comptes clients de la plateforme (lien à usage unique, révocation serveur)', cmd: 'node', args: ['scripts/comptes-clients-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Messagerie de la console (persistance et remise)', cmd: 'node', args: ['scripts/messages-e2e.mjs'], cout: 'gratuit' },
  // Son premier cas vérifie que l'IA répond quand aucune configuration ne l'en empêche : c'est une
  // vraie réponse, donc un vrai coût. Les autres cas prouvent qu'elle se TAIT, et ne coûtent rien.
  { nom: 'Panneau IA : le serveur décide, pas le navigateur', cmd: 'node', args: ['scripts/plateforme-config-e2e.mjs'], cout: 'ia' },
  { nom: 'Suppression granulaire (documents légaux conservés)', cmd: 'node', args: ['scripts/suppressions-e2e.mjs'], cout: 'gratuit' },
  { nom: 'Double authentification (enrôlement, codes de secours)', cmd: 'node', args: ['scripts/mfa-e2e.mjs'], cout: 'navigateur' },
  { nom: 'Carte Devis dans la conversation (acceptation opposable)', cmd: 'node', args: ['scripts/devis-conversation-e2e.mjs'], cout: 'navigateur' },
  { nom: 'Messages — désactivation de l’automatique', cmd: 'node', args: ['scripts/messages-deauto-e2e.mjs'], cout: 'navigateur' },
  { nom: 'App de conversation de la plateforme', cmd: 'node', args: ['scripts/plateforme-e2e.mjs'], cout: 'navigateur' },
  { nom: 'Écran « Ma plateforme → Intelligence »', cmd: 'node', args: ['scripts/plateforme-intelligence-e2e.mjs'], cout: 'navigateur' },
  // Comptabilité de l'artisan : Chromium isolé, données fictives, ni serveur ni base.
  { nom: 'Comptabilité — import des classeurs Excel et CSV', cmd: 'node', args: ['scripts/compta-classeur-qa.mjs'], cout: 'navigateur' },
  { nom: 'Comptabilité — tableur, totaux au centime et export .xlsx réimporté', cmd: 'node', args: ['scripts/compta-tableur-qa.mjs'], cout: 'navigateur' },
  // Ces trois-là appellent vraiment le modèle : jamais la nuit, seulement à la main (`--tout`).
  { nom: 'Conversation-plateforme (premier contact + relance)', cmd: 'node', args: ['scripts/conv-e2e.mjs'], cout: 'ia' },
  { nom: 'Persona : le ton réglé change vraiment la réponse', cmd: 'node', args: ['scripts/persona-e2e.mjs'], cout: 'ia' },
  { nom: 'Recherche chez les fournisseurs (sceau, plafonds)', cmd: 'node', args: ['scripts/recherche-e2e.mjs'], cout: 'ia' },
]

/** Les suites délibérément HORS du lanceur, et la raison — relue par `inventaire-produit.mjs`.
 *
 *  Sans cette liste, « hors lanceur » et « oublié » se ressemblaient trop : quinze suites ont vécu
 *  dans cet angle mort. Une suite qui n'est pas ici et pas dans SUITES est un oubli, et l'inventaire
 *  a le droit de le dire. */
export const HORS_LANCEUR = {
  'fact-e2e.mjs': 'exige un serveur local (BASE=localhost:3100 en dur) — l’audit tourne contre la production',
  'pdf-e2e.mjs': 'exige un serveur local (localhost:3100) : le rendu PDF passe par le bundler de développement',
  'smoke-test.mjs': 'test de fumée manuel après déploiement, joué à la main',
  'leads-abuse-test.mjs': 'génère du trafic d’abus : à jouer seul, jamais au milieu des autres',
  'stripe-session-test.mjs': 'ouvre une session de paiement Stripe — à la main, jamais en série',
  'stripe-verifier.mjs': 'inspection de compte Stripe, pas une suite de vérification',
  'mail-verifier.mjs': 'inspection de boîte mail, pas une suite de vérification',
  'purger-comptes-test.mjs': 'outil de ménage, pas un test',
  'purger-donnees-test.mjs': 'outil de ménage, pas un test',
  'lib/connexion-test.mjs': 'bibliothèque partagée par les suites, pas une suite',
  // Sondes de diagnostic : écrites pour répondre à UNE question un jour donné, gardées parce
  // qu'elles resservent. Elles ne s'exécutent pas la nuit — mais elles le disent ici, sinon on ne
  // distingue plus « écarté volontairement » de « oublié ».
  'sonde-a-faire.mjs': 'sonde ponctuelle : ce que la file À faire propose comme geste',
  'sonde-boite.mjs': 'sonde ponctuelle : ce que contient la boîte de l’entreprise (compte, jamais lit)',
  'sonde-composeur.mjs': 'sonde ponctuelle : le cadrage du composeur sur mobile',
  'sonde-lighthouse.mjs': 'sonde ponctuelle : une mesure Lighthouse isolée, hors du budget',
  'sonde-releve-erreur.mjs': 'sonde ponctuelle : reproduire une erreur de relève IMAP',
  'axe-noeuds.mjs': 'outil de diagnostic a11y ; le contrôle, lui, est dans accessibilite-e2e',
  'cle-produit.mjs': 'outil d’inventaire, pas une vérification',
  'csp-smoke.mjs': 'N’ASSERTIONNE RIEN pour l’instant (trouvé le 08/09) : à réparer ou à supprimer, mais surtout à ne pas citer comme une preuve',
}

const retenues = SUITES.filter((s) => {
  if (rapide) return s.cout === 'gratuit'
  if (s.cout === 'ia') return tout
  return true
})

console.log(`\n▶ ${retenues.length} suites${rapide ? ' (mode rapide)' : ''}${tout ? ' — crédits IA compris' : ' — hors tests IA (--tout pour les inclure)'}\n`)

const resultats = []
const debut = Date.now()
// Les suites frappent la production depuis UNE seule adresse : sans remise à zéro, la
// quatrième reçoit 429 au lieu de tester ce qu'elle doit tester (constaté au premier passage
// de l'audit nocturne). `purger-abus` ne touche qu'à l'adresse d'où le script tourne.
const purger = () => spawnSync('node', ['scripts/purger-abus.mjs'], { encoding: 'utf8', shell: true, env: process.env })

for (const s of retenues) {
  // `cout` ne vaut jamais 'build' (les trois valeurs sont 'gratuit', 'navigateur', 'ia') : la
  // condition d'avant ne pouvait pas être fausse. Ce qu'on veut dire, c'est « ne purge pas avant
  // une suite qui ne parle à personne » — le typage et le build ne touchent pas au réseau.
  const parleAuReseau = !['Typage', 'Build'].includes(s.nom)
  if (parleAuReseau) purger()
  process.stdout.write(`… ${s.nom}`)
  const t0 = Date.now()
  const r = spawnSync(s.cmd, s.args, { encoding: 'utf8', shell: true, env: process.env })
  const secondes = Math.round((Date.now() - t0) / 1000)
  const sortie = `${r.stdout ?? ''}${r.stderr ?? ''}`
  // Les scripts annoncent leur score : on le reprend tel quel plutôt que de le recompter.
  const score = sortie.match(/(\d+) réussis, (\d+) échoués/)
  const ok = r.status === 0
  // Code de sortie 2 : la suite ne PEUT pas encore jouer, et dit pourquoi — un préalable qui
  // n'appartient qu'à un humain (une migration à coller, un réglage Supabase). Ce n'est ni vert
  // ni cassé : c'est « en attente », compté à part, jamais dans les vertes (mfa-e2e, code-connexion-e2e).
  const attente = r.status === 2
  resultats.push({ nom: s.nom, ok, attente, secondes, score: score ? `${score[1]}/${Number(score[1]) + Number(score[2])}` : '', sortie })
  process.stdout.write(`\r${ok ? '✅' : attente ? '⏳' : '❌'} ${s.nom}${score ? ` — ${score[1]}/${Number(score[1]) + Number(score[2])}` : ''}${attente ? ' — EN ATTENTE d’un préalable humain' : ''} (${secondes}s)\n`)
}

const echecs = resultats.filter((r) => !r.ok && !r.attente)
const attentes = resultats.filter((r) => r.attente)
console.log(`\n${'─'.repeat(60)}`)
console.log(`${resultats.length - echecs.length - attentes.length}/${resultats.length} suites vertes${attentes.length ? ` · ${attentes.length} en attente d’un préalable humain` : ''}${echecs.length ? ` · ${echecs.length} en échec` : ''} · ${Math.round((Date.now() - debut) / 1000)}s au total`)

for (const a of attentes) {
  console.log(`\n⏳ ${a.nom} — en attente. Ce que la suite demande :`)
  console.log(a.sortie.split('\n').filter((l) => /⛔|À faire|À cocher/.test(l)).slice(0, 4).map((l) => '   ' + l.trim()).join('\n'))
}

if (echecs.length) {
  console.log(`\n${echecs.length} suite(s) en échec — détail :`)
  for (const e of echecs) {
    console.log(`\n── ${e.nom}`)
    // On ne recrache que les lignes qui disent quelque chose, pas les 200 lignes de build.
    const lignes = e.sortie.split('\n').filter((l) => /❌|error|Error|Failed/.test(l)).slice(0, 12)
    console.log(lignes.length ? lignes.join('\n') : e.sortie.split('\n').slice(-12).join('\n'))
  }
}
process.exit(echecs.length ? 1 : 0)
