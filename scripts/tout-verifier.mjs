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
  { nom: 'Mots de passe compromis (HIBP, k-anonymat)', cmd: 'node', args: ['--experimental-strip-types', 'scripts/mdp-compromis-qa.mjs'], cout: 'gratuit' },
  // ── Sprint v5 (J-1 démo)
  // Essai gratuit sans carte (13/10) : Checkout par offre, un seul essai par compte, webhook (début, conversion, fin sans carte), textes ; 13 mutations
  { nom: 'Essai gratuit sans carte (Checkout, webhook, textes)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/essais-gratuits-qa.mjs'], cout: 'gratuit' },
  // 02/11 (troisième audit 032-005) : le garde-fou des envois (l'escalade passe avant le mode assisté, GF-6), joué par personne jusqu'ici. Hors ligne.
  { nom: 'Garde-fou des envois — escalade avant le mode assisté, décision de réponse en un seul endroit', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/garde-fou-envoi-qa.mjs'], cout: 'gratuit' },
  // 02/11 (audit 032-001, D7) : les empreintes de Studio, Signature, du tunnel, des essais et de la grille (rien n'y bouge sans le vouloir),
  // et l'affichage des offres. N'était jouée que par simulation-generale, hors lanceur. Hors ligne.
  { nom: 'Offres — affichage, empreintes de Studio et Signature (l’offre Entreprise n’y touche pas)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/offres-affichage-qa.mjs'], cout: 'gratuit' },
  // Relances des factures impayées (0159) : passage quotidien rejoué sur une base EN MÉMOIRE et un e-mail espionné ; Studio prépare « à valider », Signature envoie. Hors ligne.
  { nom: 'Relances des factures impayées (passage quotidien, Studio à valider / Signature envoie)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/relances-impayes-qa.mjs'], cout: 'gratuit' },
  // Audit RGPD du 20/10 : effacement étendu (photos, adresse, suivi), purge des essais (24 mois), conversations (devis signé ou facture), TABLES_A_VIDER, expiration du suivi, textes légaux et registre. Hors ligne.
  { nom: 'RGPD — correctifs de l’audit du 20/10 (effacement, purges, suivi, textes légaux, registre)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/rgpd-qa.mjs'], cout: 'gratuit' },
  { nom: 'Accès aux automatisations (Mes chiffres : Signature ; relances d’impayés : dès Studio)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/acces-automatisations-qa.mjs'], cout: 'gratuit' },
  // 21/10 : le centre d'aide dit ce que fait le code (automatismes, offre de chaque fonctionnalité, essai gratuit, règle de l'assistant, badge Studio retiré) ; mutations incluses.
  { nom: 'Centre d’aide = code (automatique, offres, essai, assistant)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/aide-automatique-qa.mjs'], cout: 'gratuit' },
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
  { nom: 'Comptabilité — assistant IA : masquage, réponse de l’IA revalidée, fichiers en désordre rangés au centime', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/compta-assistant-qa.mjs'], cout: 'gratuit' },
  { nom: 'Assistant de gestion (016 A1-A3) — outils de lecture et 28 actions (directes / à confirmer), cartes, confirmation atomique, tarifs de l’artisan, offre Signature, migration 0157 rejouée (PGlite si PGLITE_DIR) ; --live = comptes de test, --ia = vrai modèle (hors lanceur)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/assistant-qa.mjs'], cout: 'gratuit' },
  { nom: 'Comptabilité — import des classeurs Excel et CSV', cmd: 'node', args: ['scripts/compta-classeur-qa.mjs'], cout: 'navigateur' },
  { nom: 'Comptabilité — tableau de bord /chiffres : Presti + fichiers au centime, état vide sans exemple, parcours d’import, isolation', cmd: 'node', args: ['scripts/compta-tableau-qa.mjs'], cout: 'navigateur' },
  { nom: 'Comptabilité — tableur, totaux au centime et export .xlsx réimporté', cmd: 'node', args: ['scripts/compta-tableur-qa.mjs'], cout: 'navigateur' },
  // CRM « atelier vivant » (0141, J1-J2). La première sans base ni réseau ; la deuxième joue 0141 dans un Postgres embarqué
  // (PGlite, hors dépendances du projet : PGLITE_DIR, sinon « en attente ») ; la troisième, drapeau baissé, vérifie que chaque
  // route répond 404 sur le serveur visé (TEST_BASE, sinon « en attente ») — son mode --drapeau=leve exige une base de TEST.
  { nom: 'CRM — validation, accès, pipeline, tâches, tableau de bord, clients, code, rendu', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/crm-qa.mjs'], cout: 'gratuit' },
  // 18/10 — améliorations du CRM (plans/crm-idees-twenty-1810.md) : lot 1 (frise, indicateurs, « Demander l'acompte ») et lot 2
  // (rappels, relance d'un devis, chronologie du client). Partie pure toujours ; partie « en vrai » seulement avec TEST_BASE local.
  { nom: 'CRM lot 1 — frise, argent du dossier, indicateurs, acompte', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/crm-lot1-qa.mjs'], cout: 'gratuit' },
  { nom: 'CRM lot 2 — rappels, relance de devis, passage du matin, chronologie, migration 0162', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/crm-lot2-qa.mjs'], cout: 'gratuit' },
  { nom: 'CRM lot 3 — photos et pièces du chantier, planning, lien d’agenda, migrations 0163 et 0164', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/crm-lot3-qa.mjs'], cout: 'gratuit' },
  { nom: 'CRM lot 4 — après-chantier : demande d’avis, entretien, migration 0165', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/crm-lot4-qa.mjs'], cout: 'gratuit' },
  { nom: 'CRM lot 5 — plan du chantier par pièce, migration 0166', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/crm-lot5-qa.mjs'], cout: 'gratuit' },
  // Audit de sécurité du 20/10 : SSRF IMAP, limiteurs fail-closed, secrets en temps constant, Origin de Stripe, octets des photos (aucun réseau)
  { nom: 'Durcissements de sécurité du 20/10 (SSRF IMAP, limiteurs stricts, secrets, photos)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/securite-durcissements-qa.mjs'], cout: 'gratuit' },
  { nom: 'CRM atelier vivant — salle d’attente, arrivée en direct, poste des assistants, garde du drapeau (aucun envoi)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/crm-vivant-qa.mjs'], cout: 'gratuit' },
  { nom: 'CRM atelier 3D — profil d’infrastructure (base légère, atelier, entrepôt), métier visible, avancement des chantiers, jour et nuit, garde du drapeau', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/crm-atelier3d-qa.mjs'], cout: 'gratuit' },
  // 21/10 (décisions du fondateur) : le PILOTE AUTOMATIQUE (Signature, 10 min pour annuler, garde-fous), l'avancement sans ressaisie
  // (photo « Après », lien de pointage), l'assistant relié à tout Presti, l'assistant dans l'atelier, le CRM connecté en temps réel.
  { nom: 'Pilote automatique — délai de 10 min, annulation, prix non sourcé → manuel, plafond, idempotence, Signature seulement, drapeau baissé = rien (0174)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/pilote-qa.mjs'], cout: 'gratuit' },
  // 21/10 : types de devis (lots) et de factures (acompte, situation, solde), et canaux sans API (Telegram, notifications, liens, import).
  { nom: 'Types de devis et de factures — lots, situations au centime, solde, garde-fous (0176)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/types-devis-factures-qa.mjs'], cout: 'gratuit' },
  { nom: 'Canaux réseaux — Telegram, notifications des réseaux, liens, import de prospects (0177)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/canaux-reseaux-qa.mjs'], cout: 'gratuit' },
  { nom: 'Avancement des chantiers sans ressaisie — assistant (avancer_chantier), photo « Après », lien de pointage du compagnon (0174)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/avancement-qa.mjs'], cout: 'gratuit' },
  { nom: 'Assistant relié à tout Presti', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/assistant-tout-qa.mjs'], cout: 'gratuit' },
  { nom: 'CRM — l’assistant dans l’atelier : panneau, contexte vérifié, verrou d’offre, exemple simulé, fil d’activité, file du pilote', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/crm-assistant-panneau-qa.mjs'], cout: 'gratuit' },
  { nom: 'CRM connecté à tout — devis, factures, inventaire, fiche, demande /p → vue, salle d’attente, assistants ; ce qui est lu est écouté (0175)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/crm-connecte-qa.mjs'], cout: 'gratuit' },
  { nom: 'CRM — migration 0141 jouée (RLS, références croisées, journal, sortie de stock)', cmd: 'node', args: ['scripts/crm-sql-qa.mjs'], cout: 'gratuit' },
  { nom: 'CRM — drapeau baissé : chaque route et la page répondent 404', cmd: 'node', args: ['scripts/crm-e2e.mjs'], cout: 'gratuit' },
  // L'atelier 3D sur la page de démonstration interne (données fictives) : performance, repli 2D, interactions, contrastes.
  // Elle exige un serveur lancé avec PRESTI_DEMO_ATELIER=1 (TEST_BASE) ; sinon « en attente ».
  { nom: 'CRM — atelier 3D : perf, repli 2D, interactions, contrastes, captures', cmd: 'node', args: ['scripts/crm-atelier-qa.mjs'], cout: 'navigateur' },
  // Temps réel du CRM (migration 0158) : deux comptes de test créés puis supprimés, un client écrit, l'autre reçoit l'évènement,
  // aucune fuite entre comptes. Migration non appliquée : code 2 = « en attente » (jamais un faux vert).
  { nom: 'CRM — temps réel : deux clients, l’un écrit, l’autre reçoit ; isolation entre comptes', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/crm-temps-reel-qa.mjs'], cout: 'navigateur' },
  // 02/11 (audit du chantier 1) : la configuration de Hermes que garde le crochet des outils obligatoires — modèle et replis,
  // freellmapi hors du profil qui garde les MCP, outils n8n en lecture seule, plafonds, interdits, correctifs locaux. La partie
  // « vraie configuration » est sautée sur un poste sans Hermes (GitHub).
  { nom: 'Garde de Hermes — configuration, replis interdits, outils n8n en lecture seule, correctifs locaux', cmd: 'node', args: ['scripts/config-hermes-e2e.mjs'], cout: 'gratuit' },
  // 02/11 (contrôle croisé du chantier 1) : le vérificateur de la revue hebdomadaire du réseau neuronal (sections des cinq gestes,
  // cartes annoncées = lignes du fichier Anki, 5 à 20 cartes à 3 champs, sources trouvées, garde de contenu) sur des revues
  // fabriquées ; « 7 cartes pour 8 lignes » (la revue du 01/11) doit rougir. Hors ligne, sans IA.
  { nom: 'Revue hebdomadaire du réseau neuronal — vérificateur du rapport et des cartes Anki (mutants dont 7 cartes pour 8 lignes)', cmd: 'node', args: ['scripts/verifier-revue-e2e.mjs'], cout: 'gratuit' },
  // 02/11 (audit du chantier 1) : la file n8n de Hermes, hors ligne (faux n8n local, dossier d'état temporaire, faux orca) :
  // un seul porteur par prise, abandon borné à 2 reprises, prise perdue rattrapée, « faite » contrôlée, pannes distinctes d'une
  // file vide, onglets fermés sur leur handle, jeton jamais affiché, résumé masqué avant la coupe, balisage Slack neutralisé.
  // Environ 4 à 5 min.
  { nom: 'File n8n de Hermes — banc hors ligne (34 scénarios des constats de l’audit)', cmd: 'node', args: ['scripts/hermes-file-banc.mjs'], cout: 'gratuit' },
  // 02/11 (§3.2 du prompt de Benj du 01/11, « ce qui ne s'automatise jamais ») : le « fait tout seul » de l'assistant n'exécute jamais
  // d'office un geste de OUTILS_JAMAIS_AUTO ni une question ; la règle « tout auto » n'envoie pas un prix non sourcé ; le pilote relit
  // l'escalade (litige, sinistre, avocat…) au départ. Chaque essai est rejoué sur un mutant (correctif retiré) qui doit rougir. Hors ligne.
  { nom: 'Sécurité de l’assistant et du pilote (§3.2) — gestes jamais d’office, question ≠ ordre, prix sourcés en « tout auto », escalade au départ (mutants)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/securite-assistant-0211-qa.mjs'], cout: 'gratuit' },
  { nom: 'Registre commun des relances (S4) — assistant, pilote, CRM, impayés, conversation : jamais deux relances en 3 jours, lecture en erreur = refus (mutants)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/relances-registre-qa.mjs'], cout: 'gratuit' },
  { nom: 'Détecteurs n8n (L3, 032-003, juge réécrit par 032-012, audité par 032-016) — gabarit HTTP exact, plafonds par offre par propriété, empreintes des nœuds Code, bac à sable enfant (mutants)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/detecteurs-n8n-qa.mjs'], cout: 'gratuit' },
  // 02/11 au soir (chantier 4, n8n-first) : les juges des workflows n8n, sur leurs exports, hors ligne ; chacun prouve qu'il rougit (mutants).
  { nom: 'Garde commune des workflows n8n (L12, 032-019) — inactif, aucun secret, branche d’erreur, colonnes permises (mutants)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/n8n-specs-qa.mjs'], cout: 'gratuit' },
  { nom: 'Suivi des artisans dans n8n (L17, 032-014) — aucun message sans événement réel, une fois par étape, écart de 5 jours (mutants)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/suivi-artisan-qa.mjs'], cout: 'gratuit' },
  { nom: 'Briefing du matin dans n8n (L15, 032-013) — mêmes priorités que composerBriefing, jour vide sans envoi (mutants)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/briefing-n8n-qa.mjs'], cout: 'gratuit' },
  { nom: 'Sauvegarde planifiée et sa garde dans n8n (L8, 032-023) — inactifs, 3 h 40 et 4 h Europe/Paris, commande exacte, alerte en échec seulement (mutants)', cmd: 'node', args: ['scripts/sauvegarde-n8n-qa.mjs'], cout: 'gratuit' },
  // 02/11 au soir (chantier 4, L7 et L6a) : les SMS à blanc (rien ne sort, STOP obligatoire, plages, plafonds) et les migrations
  // 0185 à 0187 préparées mais NON appliquées (RLS, gardes, anon retiré, unicités), lues hors ligne.
  { nom: 'SMS à blanc (L7, 032-024) — rien ne sort, STOP obligatoire, plages et jours fériés, plafonds, tarif inconnu = pas de réel (mutants)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/sms-qa.mjs'], cout: 'gratuit' },
  { nom: 'Schéma de l’automatisation 0185 à 0187, non appliqué (L6a, 032-025) — RLS, gardes de session, anon retiré, unicités (mutants)', cmd: 'node', args: ['scripts/automatisation-schema-qa.mjs'], cout: 'gratuit' },
  // 02/11 au soir (chantier 4, L18, L19, L6b ; prompt 5) : l'après-chantier refait dans n8n et comparé à l'ancien code, les demandes de démo
  // derrière demandesDemo, les organisations 0183, 0184 et 0188 non appliquées (partie statique ; PGlite si PGLITE_DIR), le kit Entreprise.
  { nom: 'Après-chantier dans n8n (L18, 032-031) — même résultat que tourApresChantier sur les mêmes données fictives, cas par cas (mutants)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/apres-chantier-n8n-qa.mjs'], cout: 'gratuit' },
  { nom: 'Demandes de démo Entreprise (L19, 032-026) — drapeau baissé = rien de neuf, l’e-mail part même si l’écriture échoue, onglet fondateur seulement (mutants)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/demandes-demo-qa.mjs'], cout: 'gratuit' },
  { nom: 'Organisations multi-membres 0183, 0184, 0188, non appliquées (L6b, 032-032) — RLS, gardes, interrupteur faux, matrice des rôles (partie statique, mutants)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/organisations-qa.mjs', '--statique'], cout: 'gratuit' },
  { nom: 'Kit « Presti pour l’entreprise » du mode A (prompt 5, 035-002) — huit parties, « Exemple. » partout, aucun prix de l’offre, aucune phrase interdite (mutants)', cmd: 'node', args: ['scripts/kit-entreprise-qa.mjs'], cout: 'gratuit' },
  { nom: 'Socle lib-* de l’offre Entreprise dans n8n (prompt 5, 035-003) — inactif, contrats d’entrée et de sortie, une alerte par panne, rejeu sans doublon (mutants)', cmd: 'node', args: ['scripts/lib-socle-n8n-qa.mjs'], cout: 'gratuit' },
  { nom: 'Fiches de lecture des vidéos (prompt 5, 035-008) — format, horodatages dans la durée, chiffres marqués, aucune citation de plus de 15 mots (mutants)', cmd: 'node', args: ['scripts/fiches-videos-qa.mjs', '--mutants'], cout: 'gratuit' },
  // 03/11 dans la nuit (prompt 5 et chantier 4, L18) : la chaîne de la capture à la décision, l'accusé de réception dans n8n.
  { nom: 'Chaîne de la capture à la décision dans n8n (prompt 5, 035-004) — contact jamais lu, doublon sur empreinte, copie des listes du pilote égale au code (mutants)', cmd: 'node', args: ['scripts/lib-metier-n8n-qa.mjs'], cout: 'gratuit' },
  { nom: 'Accusé de réception et avis à l’artisan dans n8n (L18, 032-040) — même décision que app/api/leads, cas par cas, marque blanche (mutants)', cmd: 'node', args: ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/accuse-reception-n8n-qa.mjs'], cout: 'gratuit' },
  { nom: 'Garde des sessions lancées par Orca (défaut E de 031-012) — ni commit, ni push, ni déploiement, ni migration, ni build partagé ; la session principale jamais bloquée (mutant)', cmd: 'node', args: ['scripts/garde-agents-orca-qa.mjs'], cout: 'gratuit' },
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
  'sauvegarde-qa.mjs': 'sauvegarde de toutes les tables (L9, 032-020) : verte sur Oracle (Linux, fichiers identiques au PC, preuve .orchestre/preuves/032-020/verifier-oracle.log), mais sous Windows un seul contrôle rougit — le processus fils plante à la sortie après --verifier --vivant (« Assertion failed: !(handle->flags & UV_HANDLE_CLOSING) », Node 24.16) ; à jouer sur Oracle, où la sauvegarde tournera (presti-sauvegarde, L8)',
  'crm-stock-e2e.mjs': 'stock de l’atelier = inventaire, de bout en bout : exige une base de TEST dédiée (CRM_E2E_*) et un serveur branché dessus — refuse la production',
  'crm-carte-e2e.mjs': 'carte de l’atelier (validation, retrait de la carte, validation automatique, type de bâtiment), de bout en bout : exige une base de TEST dédiée (CRM_E2E_*, migration 0172) et un serveur branché dessus — refuse la production',
  'fact-e2e.mjs': 'exige un serveur local (BASE=localhost:3100 en dur) — l’audit tourne contre la production',
  'pdf-e2e.mjs': 'exige un serveur local (localhost:3100) : le rendu PDF passe par le bundler de développement',
  'smoke-test.mjs': 'test de fumée manuel après déploiement, joué à la main',
  'crm-captures.mjs': 'outil de captures du CRM en mode exemple (bureau, téléphone, clair, sombre) pour REGARDER un lot : exige un serveur local (TEST_BASE)',
  'leads-abuse-test.mjs': 'génère du trafic d’abus : à jouer seul, jamais au milieu des autres',
  'stripe-session-test.mjs': 'ouvre une session de paiement Stripe — à la main, jamais en série',
  'stripe-verifier.mjs': 'inspection de compte Stripe, pas une suite de vérification',
  'mail-verifier.mjs': 'inspection de boîte mail, pas une suite de vérification',
  'purger-comptes-test.mjs': 'outil de ménage, pas un test',
  'purger-donnees-test.mjs': 'outil de ménage, pas un test',
  'lib/connexion-test.mjs': 'bibliothèque partagée par les suites, pas une suite',
  'simulation-generale.mjs': 'simulation générale (16/10) : exige un build local (PRESTI_DIST=.next-simulation npm run build), lance son propre serveur, ses comptes et ses sessions Stripe de test ; à jouer à la main avant un lancement, pas dans la rafale',
  'lib/sim-serveur.mjs': 'bibliothèque de simulation-generale.mjs (serveur local de production), pas une suite',
  'lib/sim-ia-proxy.mjs': 'bibliothèque de simulation-generale.mjs (compteur d’appels IA), pas une suite',
  'lib/sim-preload.cjs': 'bibliothèque de simulation-generale.mjs (interception des e-mails et journal Stripe), pas une suite',
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
  'demo-crm-montage.mjs': 'outil de montage de la démo CRM de l’accueil (public/demo/crm-atelier.mp4), pas une vérification',
  'aide-videos-crm-texte.mjs': 'outil : inscrit le texte de la vidéo d’aide CRM dans lib/aide-videos.json avant la capture, pas une vérification',
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
