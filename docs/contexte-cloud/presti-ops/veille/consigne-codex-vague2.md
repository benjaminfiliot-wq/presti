Tu travailles sur l'usine de Presti, dans ~/veille. Écris en français. Tu es le CHEF d'une petite équipe d'agents. Découpe le travail et confie chaque partie au bon outil : toi (Codex) pour le raisonnement et le code, Laya (`jev score` / `jev noul`, en local) pour noter et vérifier, Firecrawl (`outils/firecrawl.sh`) pour le web, les API publiques pour les registres. Lance tes propres scripts en parallèle quand c'est possible.

MISSION : la VAGUE 2 de prospection, de bout en bout, dans `~/veille/vague2/`, avec EXACTEMENT la même arborescence que la vague 1. Réutilise les scripts et les méthodes de la vague 1, déjà faits ici :
- `prospection/liste-2026-09-27.csv` et son LISEZMOI ;
- `prospection/maquettes-2026-09-27/` : `generer.py`, `capturer.mjs`, `KIT-APPEL.md`, `telephones-trouves.csv` ;
- les consignes `consigne-codex-prospection-liste.md`, `consigne-codex-maquettes-27.md`, `consigne-codex-kit-appel-27.md` et `consigne-codex-telephones-27.md`, qui s'appliquent toutes. Lis-les.

ZONE DE LA VAGUE 2 : agglomération de La Rochelle (hors communes de la vague 1), Rochefort et ses environs, Surgères, Aigrefeuille-d'Aunis, Niort et ses environs (79), Fontenay-le-Comte (85). Mêmes métiers.

À PRODUIRE, dans `~/veille/vague2/` :
1. `prospection/liste-2026-09-27.csv` : au moins 150 entreprises, dont au moins 50 sans site, **aucune de la vague 1**. Ajoute les SIREN de la vague 1 et ceux de `prospection/siren-deja-contactes.txt` dans `vague2/prospection/siren-deja-contactes.txt`. Écris aussi le LISEZMOI.
2. `prospection/maquettes-2026-09-27/` : 30 maquettes (les meilleures sans site), avec `manifeste.json` et `LISEZMOI.md`.
3. `KIT-APPEL.md` et `suivi-appels.csv`, avec les **mentions obligatoires** dans CHAQUE SMS et CHAQUE mail : « Benjamin Filiot EI (Presti), SIREN 109 411 348 », l'adresse « 1 rue du Brouage, 17230 Marans » dans les mails, la source des coordonnées, et STOP. Copie le format du kit de la vague 1, qui a déjà ces mentions.
4. `telephones-trouves.csv` et les numéros reportés.

BUDGET FIRECRAWL : **250 crédits au plus pour toute la vague**, sur les ~600 qui restent. Commence par les registres publics gratuits, et n'utilise Firecrawl que pour savoir si l'entreprise a un site et pour trouver son numéro.

JUGE : `node juges/juge-vague2.mjs` (déjà écrit, NE PAS le modifier). Il fait tourner les 4 juges de la vague 1 sur `vague2/`, puis vérifie qu'il n'y a pas de doublon et que les mentions sont là. Boucle jusqu'au PASS.

DONNÉES :
- données d'entreprises publiques seulement ;
- aucun e-mail, aucun nom de personne ;
- rien ne part vers une IA gratuite ni vers un modèle `:cloud` ;
- respecte toute mention « opposé au démarchage ».

INTERDITS : contacter qui que ce soit ; écrire hors de `~/veille/vague2/` ; modifier les juges.
