# Lot préparé pour Claude cloud

Décision humaine du 30/09 : Claude traite toutes les fiches prêtes restantes après fin du relais documentaire et des validations PC engagées. Codex ne prend aucune nouvelle fiche. Le moteur local reste arrêté pour éviter une double prise.

14 fiches prêtes : toutes leurs dépendances sont dans fait/ et ont un dernier verdict PASS depuis fait/, contrôlé dans le journal PC et les preuves cloud plus récentes. INDEX.json donne chaque preuve de disponibilité. Les fiches source complètes sont dans fiches/. Périmètres, interdits, commandes et budgets sont conservés. L’exécutant historique reste indiqué ; la délégation actuelle est Claude cloud.

- [026-083](fiches/026-083.md) — J3 et le second juge : modèles de formulaire (variantes B et A, Studio), sujets, pieds, mention IA, référence, liste fermée des affirmations
- [026-099](fiches/026-099.md) — Mutations des juges de l'envoi, de l'entrant et de la fabrication (ajoutée à l'assemblage)
- [026-150](fiches/026-150.md) — Mutations des juges sécurité
- [026-152](fiches/026-152.md) — Mutations des juges livraison et trésorerie
- [026-159](fiches/026-159.md) — Mutations des juges pubs et contenu
- [026-173](fiches/026-173.md) — Modules purs de la personnalisation (N3) : `theme.ts`, `disposition.ts`, `reglages.ts` (même code au serveur et à l'écran, réservée fixe)
- [026-174](fiches/026-174.md) — Extraction du Poste vers `lib/controle/lectures/` (N0) : santé, crons, audience, bans, clients, Cerveaux, sorties inchangées ; compte agrégé des tickets de support, jamais un contenu
- [026-195](fiches/026-195.md) — Pont Telegram : `lib/agents/telegram.ts`, routes `sortie` et `entree` derrière `busAgents` et le jeton `pont_telegram`, service `presti-telegram` de l'usine (long polling, aucun port), `docs/agents/telegram.md`
- [026-197](fiches/026-197.md) — Durcissement de l'usine : plus de sudo sans mot de passe ni de groupe `docker` pour le compte `usine`, compte `gardien`, `rpcbind` coupé s'il ne sert pas (contre-revue : le retrait est d'abord fait à la main avant 026-179, cette fiche le reprend et le fait juger)
- [026-199](fiches/026-199.md) — Juges de la fabrication des pubs sur l'usine (`usine-pubs-qa`) et de la Search Console automatique (`search-console-qa`) (contre-revue du 25/09 au soir ; 27/09 : UP-2 et UP-10 sous l'identité `studio`)
- [026-240](fiches/026-240.md) — Mutations des juges de la couche Savoir
- [026-242](fiches/026-242.md) — Juges du Comptable (un volet du Trésorier, sous `tresorier`) : rapprochement Stripe en lecture seule (orphelins, doublons, écarts), seuil de franchise 293 B daté, montants de déclaration préparés, jamais déposés ni payés, aucune mention de TVA touchée, libellé sous Codex seulement ; juge `comptable-qa` (CPT-1 à CPT-8)
- [026-244](fiches/026-244.md) — Juges du SAV (clients déjà payants) : rattachement par la commande, lecteur factice obéissant, escalade de tout remboursement ou litige, brouillon d'abord, compteur D18 des 20 approbations sans retouche (FAQ seule), aucune donnée de client vers une IA gratuite ; juge `sav-qa` (SAV-1 à SAV-9)
- [026-246](fiches/026-246.md) — Juges du Contrôleur qualité des sites livrés : mesures réelles (code HTTP, HTTPS, poids, contraste WCAG, liens morts, mentions légales), formulaire contrôlé sans jamais le soumettre, une décision par panne ; juge `qualite-sites-qa` (QSI-1 à QSI-9)

Fiches déjà engagées sur le PC : 026-092 et 026-151 ; ne pas les reprendre. 026-083, juges et migrations déjà réservés à Claude restent à lui. Chaque prise se fait sur une branche claude/…, un seul écrivain par fiche. Rejouer depuis fait/ avant de déclarer PASS ; pousser les sources et preuves réelles, puis Codex intègre et contrôle la production. Les fichiers contexte/digest/verdicts générés du PC restent la référence aux merges.

Décision d’automatisme du 30/09 à intégrer : plus d’accord individuel par envoi/publication ; aligner les fiches et juges concernés, avec protection préalable STOP, pause générale, réservation anti-doublon et plafond0€. Pour le budget et les gardes SQL, utiliser une migration corrective Claude, pas une réécriture de migration appliquée. Voir PR6 et docs/contexte-cloud/AUDIT-AUTOMATISME-0930.md.

Lot prêt à reprendre par Claude : les contrôles PC ont livré leurs vrais résultats, dont les défauts de contrats/juges encore rouges détaillés dans CORRECTIONS-ATTENDUES.md. Les fiches 092/151 restent prises par Codex ; Claude corrige leurs juges et contrats, puis Codex rejoue.

[Corrections des juges et contrôles à renvoyer au PC](CORRECTIONS-ATTENDUES.md), [sources PC non validées](sources-PC/), [outil orchestre complet actuel](outil-orchestre/), [preuves réelles](preuves-PC/).
