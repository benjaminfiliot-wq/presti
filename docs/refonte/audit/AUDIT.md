# Audit Presti (Refonte)

## Pages
- `/` (`app/page.tsx`) : La page d'accueil avec l'assistant IA, mais le visiteur comprend en 10 secondes une offre très logicielle plutôt qu'une solution vitrine clé en main. La section Hero met en avant l'application d'abord ("Assistant IA"), avec une vue conversationnelle complexe. L'accent est beaucoup trop mis sur le gain de temps et l'outil de relances automatiques, au lieu de mettre en lumière la création d'un site web qui vend (site à la demande). En bref, un discours asynchrone qui ne convertit pas instantanément les artisans pressés. 
- `/faq` (`app/faq/page.tsx`) : Page simple qui liste les questions fréquentes, peu animée mais accessible. La structure est basée sur une balise HTML natif `<details>` pour minimiser le JS côté client, ce qui est très performant, mais visuellement assez aride. L'intégration du schéma JSON-LD permet une bonne indexation, bien que la navigation semble déconnectée du flux principal de découverte.
- `/contact` (`app/contact/page.tsx`) : Un formulaire avec quelques règles de sécurité, qui informe directement le visiteur sur le délai de réponse attendu. Le design se veut fonctionnel, mais il y a une note légale assez imposante (`<div className="legal-note">`) qui prévient que Presti n'est que l'outil de l'artisan. Cela casse potentiellement la réassurance si l'utilisateur n'est pas déjà qualifié.
- `/connexion` (`app/login/page.tsx`) : Page de connexion propre avec support du mode MFA (Multi-Factor Authentication). Cette page utilise abondamment les redirections selon l'état du jeton, ce qui sécurise énormément l'accès mais rallonge le code et la compréhension. Les paramètres d'URL (comme `?verou=1` ou `?verif=1`) injectent des bannières d'alerte, un bon point pour l'UX mais la gestion d'erreurs reste abrupte visuellement.
- `/essai-formulaire` (`app/essai-formulaire/page.tsx`) : Page d'essai rudimentaire, sans style avancé. C'est un terrain de jeu complètement non-indexé pour tester la soumission de leads, ce qui est utile pour l'équipe mais qui, s'il était accessible par un chemin dérivé, paraîtrait non abouti. L'emploi d'attributs de style inline dénote d'un manque d'intégration dans le design system `globals.css`.
- `/outils` (`app/outils/page.tsx`) : Interface qui montre le générateur IA de réponse, très orientée tableau de bord. Cette interface requiert une session valide et l'onboarding pour fonctionner, ce qui protège l'outil, mais enferme une grande partie de la proposition de valeur de Presti derrière un mur d'authentification. 

## Défauts
| Défaut | Page | Fichier | Gravité |
|---|---|---|---|
| Conteneur central un peu large limitant la lisibilité textuelle | `/` | `app/globals.css:54` | Moyenne |
| Animation non interactive et redondante qui tournait hors-champ | `/` | `app/HeroApp.tsx:28` | Moyenne |
| GSAP bloque le chargement sur la version bureau de manière synchrone | `/` | `app/Motion.tsx:47` | Haute |
| Le script charge toutes les images en même temps pour l'animation séquentielle | `/` | `app/DemoSequence.tsx:75` | Haute |
| Le composant de démonstration n'est pas suffisamment centré sur les appels à l'action | `/` | `app/DemoSite.tsx:20` | Moyenne |
| Fichiers CSS manquant de clarté pour l'initialisation des variables fondamentales | Tous | `app/base.css:2` | Faible |

## Opportunités
- **Formulaire d'entrée :** Permettre de qualifier le besoin dès la landing `app/page.tsx` pour enrôler sans rediriger vers une page isolée. En demandant immédiatement quelques informations (métier, nom, besoin), nous pourrions générer une ébauche de site sur le champ, renforçant le "WoW effect".
- **Preuves :** Remplacer le simple carrousel texte de `app/DemoSequence.tsx` par une démo interactive beaucoup plus engageante. Un simulateur en temps réel permettrait aux prospects de mieux se projeter.
- **Animations de démonstration :** Utiliser les animations CSS sans JS bloquant, et faire sentir le "temps réel". En supprimant GSAP au profit de transitions gérées de façon native ou avec Framer Motion allégé, la fluidité serait exemplaire.
- **Réassurance :** Mettre les mentions de sécurité et de gratuité de `app/contact/page.tsx` sur l'accueil, directement près des composants `app/DemoSite.tsx` pour rassurer lors du passage à l'action.
- **Base CSS :** Refondre `app/base.css` pour alléger le reset CSS initial, améliorer l'intégration des variables globales pour le mode "white-label" et simplifier le travail sur le constructeur.

## Priorités
1. Réduire drastiquement le délai de re-render maximal imposé par le filet GSAP, en passant l'attente de sécurité de **4000 ms** (`app/Motion.tsx:78`) à une vérification plus organique, pour fluidifier l'expérience d'affichage initial sur les machines plus lentes.
2. Diminuer le poids des assets superposés sur le composant de démonstration qui atteint actuellement un total exorbitant de **2.4 Mo** (`app/DemoSequence.tsx:75`) au chargement, en lazy-loadant rigoureusement les PNG inactifs, et en convertissant tout en formats modernes exclusifs avec fallbacks.
3. Aligner le max-width global de **1120 px** (`app/globals.css:54`) aux standards actuels pour mieux cadrer le contenu du héros sur les grands écrans tout en conservant des ratios confortables.
4. Gérer l'intervalle d'animation cyclique, qui est actuellement fixé à **7200 ms** (`app/HeroApp.tsx:28`), de manière asynchrone sans bloquer le rendu principal, en liant davantage la boucle aux actions et à l'attention de l'utilisateur plutôt qu'à un délai passif fixe.
5. Economiser efficacement **70 Ko** de bundle JS lié aux animations complexes sur la version desktop (`app/Motion.tsx:28`), en réutilisant l'approche par simple `IntersectionObserver` déjà déployée avec succès sur les écrans de moins de **760 px**.
6. Adapter la largeur de la démo vidéo statique, aujourd'hui bloquée à **1280 px** (`app/DemoSite.tsx:30`), pour être totalement réactive, surtout pour les vues smartphones qui requièrent un comportement dynamique et respectueux de la largeur d'écran, sous peine de déclencher des défilements horizontaux frustrants.
