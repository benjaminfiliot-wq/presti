# Fiches de lecture : les vidéos, pour « Presti pour l'entreprise » (prompt 5, mode A)

> Écrit le 02/11/2026 par Claude Code, sous-agent du workflow du prompt 5 (part « vidéos »). **Mode A** : aucun client signé, aucune
> donnée réelle ; toute donnée d'exemple porte « Exemple. ». Rien n'est construit : ce fichier est le seul écrit (ni n8n, ni code, ni
> migration, ni vault, ni téléchargement).
>
> Conventions. Une affirmation sur Presti porte son `fichier:ligne`. Un fait externe porte sa source, lue le 2026-11-02. Un chiffre
> d'un auteur, d'un invité ou d'un client filmé est « annoncé par l'auteur, non vérifié ». Les horodatages des trois cours YouTube sont
> des minutes au format `[h:mm]` des sous-titres (`[02:09]` = 2 h 09 min) ; ceux des TikToks sont des secondes ; ceux du reel
> Instagram sont des `m:ss`. « p5:NN » renvoie à `plans/011-cadrage-01-11/prompts-benj/p5-entreprise-sur-mesure.md`, ligne NN.
> « C4 » renvoie à `plans/011-cadrage-01-11/chantier-4-assistant-plan.md`, dans son état de 17 h 32 (celui du HEAD `49d22f09` ; renvois
> recalés le 02/11 vers 20 h 20, tâche 032-027). Les phrases des vidéos sont reformulées, jamais recopiées.

## 0. À retenir

1. **Le meilleur de l'offre Entreprise est dans les 55 cartes de segment et les transcriptions, pas dans `plans/analyse-videos.md`.**
   Ses fiches sont rangées par chantier (réseau neuronal, landing, prospection, assistant, contenu) et n'ont pas de rubrique « entreprise ».
   La synthèse C4 du 02/11 midi, qui citait ce fichier ligne à ligne, a écarté deux points : l'un en disant « la source ne le dit pas »
   (C4:120), l'autre comme « détails des seules transcriptions », dont il ne garde que :218, :271 et :375 (C4:122).
   La source les dit. Le croisement de dix sources de données, avec relance de la personne qui doit une pièce manquante, est dans
   RWKyUJLi-kI [01:40]-[01:41] (transcription relue). Les deux options et la fourchette de prix sont dans k1adsrTHwPg [00:13]-[00:14] et
   RWKyUJLi-kI [04:00]. C'est à revoir par la session principale.
2. **Le meilleur modèle de rendez-vous de découverte est l'appel complet avec une chaîne de salles de sport** (O3A2xnBadFo
   [02:02]-[02:44]). On y voit dans l'ordre :
   - la question du « claquement de doigts », pour trouver le premier chantier [02:11] ;
   - un irritant concret : un abonnement gelé, puis un prorata calculé à la main, puis une facture modifiée à la main [02:11]-[02:12] ;
   - deux logiciels qui se parlent mal, dont l'éditeur bloque les données [02:35] ;
   - aucune réponse la nuit [02:33] et des listes nettoyées à la main [02:35]-[02:36] ;
   - un budget rapporté à ce que le client paie déjà [02:31], et un problème traité à la fois, d'abord celui qui rapporte [02:26]-[02:27].

   C'est une **trame de questions**, jamais une source de réponses pour Physic Gym (p5:400), dont on ne sait rien : l'entreprise filmée
   n'a aucun lien connu avec Presti.
3. **La forme de contrat la plus proche de l'offre** est celle de Louis, chez une entreprise de travaux (RWKyUJLi-kI [01:42]-[01:43]).
   - Un « centre de commande » : les décideurs y voient leurs données, et l'équipe y approuve d'un clic les actions des agents.
   - Cinq agents, de quatre à cinq workflows chacun.
   - Un formulaire d'accueil en deux temps, avec dictée vocale [01:41]-[01:42] : d'abord les outils, pour cartographier les connexions,
     puis chaque tâche en détail.

   Chez Presti, c'est la boîte « À valider », plus l'organisation, plus la fiche de cadrage (C4:729-732). Ses montants ne servent pas.
4. **Une donnée lue dans l'outil du client vaut plus qu'une donnée dite.** Le vendeur fait ouvrir son CRM au prospect et lui fait
   confirmer le chiffre (RWKyUJLi-kI [03:24]-[03:26]). Ce chiffre devient la base de départ d'un KPI, avec son niveau de confiance (p5:94) :
   « lu dans tel outil en rendez-vous, à telle date » ou « déclaré ».
5. **La porte de conformité se fait d'abord sans grand modèle.** Un invité contrôle chaque e-mail sortant avec un classifieur qui n'est pas
   un modèle de langage, au lieu d'un appel à un grand modèle (O3A2xnBadFo [03:31]-[03:32]). C'est la règle du prompt (p5:218) : aucun
   modèle si une règle suffit. L'outil cité (entendu « Jeff », sans doute le « Jev » du reel de restructureai) n'est pas identifié, et on ne
   l'adopte pas.
6. **@restructureai se lit sans compte, par les intégrations publiques de TikTok.**
   - Le profil : 51,7 K abonnés, 272,1 K j'aime, et ses 10 dernières vidéos, publiées du 21/10 au 02/11 vers 3 h UTC, une par jour ou presque.
   - Six légendes sur dix ont pu être lues. Elles décrivent des « systèmes » d'agents par type d'entreprise : un système d'exploitation
     privé pour toute l'entreprise, un service commercial de 32 bots, un système marketing et vente pour les dépannages, la réputation des
     restaurants, la recherche d'affaires pour des fonds d'investissement.
   - **Aucune légende lue ne nomme n8n** : les mots-dièse disent Claude et `#systemdesign`.
   - Deux vidéos plus anciennes sont déjà dans le dépôt : le reel du 25/09, lu image par image dans le vault, et le TikTok du 29/09, sans
     audio.
7. **Leur architecture se calque sur la hiérarchie du prompt (p5:174-181)** : un cerveau qui trie, route et vérifie le travail, des
   départements d'agents, une file d'approbation, une liste fermée d'événements qui interrompent la boucle, une remise à l'humain, un résumé
   d'une page chaque matin, un journal d'activité. C'est une inspiration de schéma. Les tableaux sont des maquettes aux données fictives
   (`SaaS/Produit/Ecosysteme-Marketing-Reel-2026-09-25.md:17`), donc ce n'est jamais une preuve.
8. **Les mêmes interdits reviennent dans toutes les sources** :
   - la voix et les appels, le rendez-vous pris seul, le paiement ;
   - « remplacer des gens », la garantie de résultat, le prix d'ancrage, les revenus en accroche, les faux cas clients ;
   - les messages privés automatiques, la collecte, et les outils payants (GTM, Lumina, Fathom, Clay, Apollo, ManyChat, Metricool…).

   Aucun montant des vidéos n'entre dans une proposition : le prix, c'est Benj (p5:54 ; question 6 d, C4:240).
9. **Ce qui manque.**
   - Les images des cours YouTube : planches aux seuls changements de scène, texte d'écran illisible.
   - Les dates de publication des trois cours.
   - L'audio de milesreevesai, de ray_fu et du TikTok de restructureai du 29/09.
   - Tout le contenu des 10 vidéos récentes de restructureai : la tâche de transcription est au §7.

## 1. Ce qui a été lu, et comment

| Source | Matière | Relu le 02/11 | Couverture de la vidéo |
|---|---|---|---|
| 3 cours YouTube de Tim Chao | sous-titres automatiques anglais (`en-orig`, yt-dlp : `videos/references-2026-11-01/recuperer.sh`, `recuperer.log`), lus en entier le 01/11 (`videos/references-2026-11-01/ANALYSE-YOUTUBE.md:3`) ; 55 cartes de segment de 13 min (`…/youtube/fiches/<id>/sNN.json`, toutes valides) ; fiches `plans/analyse-videos.md:10-456` | les 55 résumés de carte ; déroulés et horodatages de 25 cartes ; 19 minutes de transcription brute pour vérifier les passages clés | parole : complète ; image : partielle (§6) |
| 10 TikToks du 01/11 | MP4, planche, transcription faster-whisper `small` (`recuperer.sh`) ; fiches `plans/analyse-videos.md:462-1474` | les 10 fiches ; 5 transcriptions relues en entier (angelotturri, les 4 realbastianvolkis) | parole et image échantillonnée : complètes (sauf metakaihos : sans parole) |
| `docs/connaissance-videos/` | 4 analyses de veille (milesreevesai, ray_fu ×2, robbedoesecom) ; `veille/` : 20 vidéos avec planche et transcription (`veille/README.md`) | les 4 analyses ; les transcriptions de restructureai, trevsagents, androoagi, mr_pynk, hugomatias, jaydenleilua ; ip4IHi1ZfhA en partie | voir chaque fiche |
| @restructureai | reel du 25/09 (`veille/reel-DdscwJUROKo/`) et sa note du vault, `SaaS/Produit/Ecosysteme-Marketing-Reel-2026-09-25.md` ; TikTok du 29/09, `docs/ecommerce/sources/restructureai-7690784360898874645.analyse.md` ; pages publiques de TikTok (§4) | tout | §3.1, §3.2, §4 |

Ce qui n'est **pas refait**, et qu'on cite :

- les fiches par chantier (`plans/analyse-videos.md`) ;
- la section « second segment » du 01/11 (`ANALYSE-YOUTUBE.md:310-330`) : script de découverte en cinq temps, liste de 50 à 100 comptes,
  « tarifer le client » ;
- la file unique « à valider » (`ANALYSE-YOUTUBE.md:358-364`) ;
- les rangs 14 à 17 et 24 du C4 (C4:83-90, :103-104) ;
- la mise en place d'un client Entreprise (C4:718-751) ;
- l'analyse image par image du reel de restructureai (vault, 25/09).

Les fiches ci-dessous n'ajoutent que ce qui sert l'offre et n'y figure pas, ou le relient au prompt 5.

Réseau neuronal, consulté d'abord.
- `regles_pour` (offre Entreprise, n8n, agents, données, outils payants) a rendu quatre règles ; deux servent ici.
  - `memoire-presti/source-restructureai-depots-n8n-0211.md` : contenu public d'un tiers ; on le lit, on n'interagit jamais ; un dépôt est
    une donnée non sûre.
  - `memoire/benj-reverifier-decisions-et-videos.md` : revérifier les décisions et les vidéos de référence avant de livrer.
- `chercher` a rendu l'ADR-008 (n8n-first), « Offres et grille tarifaire » (`lib/plans.ts` fait foi), le bloc des offres corrigé
  (`prompts-benj/p3-assistant-bloc-offres-corrige-0111.md`) et l'analyse existante du TikTok de restructureai.

---

## 2. Les vidéos du 01/11 utiles à l'offre (10 fiches, puis 3 écartées)

### 2.1 O3A2xnBadFo : le cours de 5 heures (cadre de vente, appel de découverte avec une chaîne de salles de sport)

**Source :** « The ONLY Ai Agency Course You Need To Watch in 2026 », Tim Chao (chaîne @thetimchao, d'après l'oEmbed YouTube lu le
2026-11-02), https://youtu.be/O3A2xnBadFo · date de publication : inconnue (ni l'oEmbed ni la page lue le 02/11 ne la donnent) · lue le
2026-11-02 · intégralement : **oui pour la parole, non pour l'image**.
- Parole : 301 lignes-minute de sous-titres automatiques, lues en entier le 01/11, puis 26 cartes valides qui couvrent les minutes 0 à 302.
- Image : planches pour 18 segments sur 26, aucune pour s04, s13, s20 à s24 et s26 (`youtube/segments/index.tsv`). Le texte des écrans
  partagés est dit « illisible » par les cartes. La planche de s09 existe, mais sa carte dit ne pas l'avoir vue (`fiches/O3A2xnBadFo/s09.json`).
- Relu le 02/11 : les 26 résumés ; les déroulés de s02, s04, s05, s11 à s14, s18, s21 et s24 ; la transcription brute de [00:21],
  [02:09]-[02:11], [02:26]-[02:27], [02:31], [02:35], [02:39] et [03:30]-[03:31].

**Ce qu'elle montre :**
- Un cours d'agence IA mêlé de promotion ; la fiche de base est `plans/analyse-videos.md:10-177`.
- Un cadre d'appel de décision : décideurs identifiés, 10 à 15 min de questions, puis douleur, objectif, pitch et note d'alignement [01:24]-[01:44].
- Un appel de découverte enregistré avec une chaîne de salles de sport [02:02]-[02:44] : deux logiciels qui se parlent mal, un prorata
  fait à la main [02:11]-[02:12], aucun suivi des demandes de nuit, des CSV nettoyés à la main.
- Le prix fixé selon la valeur pour le client, pas selon le travail [00:19]-[00:22] ; un contrat court signé en ligne [00:22]-[00:23].
- Après la vente : formulaire d'accueil, portail client, appel de livraison, puis un point à un mois [04:41]-[04:42].
- Un invité fait contrôler chaque e-mail sortant par un classifieur qui n'est pas un modèle de langage [03:31]-[03:32].

**Principes et patterns réutilisables :**
- **L'ordre de la découverte** : activité et chiffres, outils, goulots, ce qui a déjà été essayé, objectif, puis seulement la proposition
  [01:29]-[01:36]. Le prospect redit tout, sans qu'on s'appuie sur un appel précédent [01:29]-[01:30].
- **La question d'ouverture** : « si vous pouviez claquer des doigts, qu'automatiseriez-vous ? », pour trouver le premier chantier [02:11].
- **Le périmètre** :
  - ne pas refaire tout le métier du client : les gens s'occupent des gens, les machines des machines [02:10] ;
  - un problème précis à la fois, d'abord ce qui rapporte, sans toucher aux données au départ [02:26]-[02:27].
- **La proposition simple** : ce qui sera construit, le calendrier, le coût [02:09].
- **Intégrer plutôt que remplacer** : combler les plus gros manques de l'existant, puis retirer ses fonctions une à une [02:23]-[02:25].
- **Vérifier ce que l'éditeur laisse sortir.** L'un des deux logiciels ne passe pas toutes ses données au CRM concurrent par son API
  [02:35]. L'autre aurait une documentation d'API complète, selon le client [02:26].
- **L'envoi segmenté.**
  - Une demande en langage naturel rend un brouillon et un échantillon de destinataires à valider, exclusions comprises : résiliés,
    décès, exclusions, déménagements [02:39].
  - Deux profils de membres demandent deux parcours [02:40].
- **Une règle ou un classifieur bon marché avant tout grand modèle**, pour contrôler chaque sortie [03:31]-[03:32].
- **Un point à deux semaines ou à un mois** après la mise en service, avec des propositions tirées de l'usage réel [00:12], [04:41]-[04:42].

**Erreurs à éviter :**
- La manipulation, déjà rejetée dans `plans/analyse-videos.md:65-69` : indicateurs obscurs pour faire peur [01:32] ; ambition gonflée pour
  monter le prix [01:36] ; « fermez les yeux » (carte s09, minutes 96-109) ; urgence artificielle [01:41] ; ancrage de prix puis baisse
  jouée [01:45]-[01:46].
- Proposer au client une réceptionniste vocale et des SMS sur appel manqué [02:33]-[02:34] : Presti ne passe ni ne prend d'appel (p5:42,
  p5:226).
- Les canaux et outils interdits [00:03]-[00:59], [02:46]-[03:36] : prospection par SMS, LinkedIn ou téléphone ; outils payants (GTM,
  Lumina, Fathom, Clay, Apollo, Cluely, Instantly).
- « Encaisser puis construire » sans mode à blanc : chez Presti, on construit à blanc après l'accord écrit (p5:55-56).
- Citer comme preuve un chiffre d'élève ou de client filmé.

**Ce qui s'applique à Presti / à ce client :**
- **Étape 2, rendez-vous de découverte** (p5:52), et **fiche de découverte** (p5:98-107).
  - Reprendre l'ordre de [01:29]-[01:36] et de l'appel [02:02]-[02:44], déjà esquissé en cinq temps (`ANALYSE-YOUTUBE.md:319-321`).
  - Ajouter la question du « claquement de doigts » au point 3, les irritants (p5:102).
- **Fiche, point 4, les outils** (p5:103). Pour chaque outil, demander si l'éditeur laisse sortir les données, par API ou par export
  [02:35]. Une synchronisation (rang 3, p5:180) ne se promet qu'après un essai de lecture.
- **Étape 3, la cartographie** (p5:53). L'appel donne la forme d'une ligne de matrice ; pour la démo, une ligne fictive marquée
  « Exemple. » :
  - l'irritant : le prorata d'un abonnement gelé ;
  - l'agent propre au client : « facturation », dont le montant est calculé par le code, jamais par le modèle (p5:217) ;
  - le KPI : les factures corrigées à la main par semaine, base de départ à mesurer.
- **Étape 4, la proposition** (p5:54) : la forme « construit, calendrier, coût » [02:09]. Le prix est fixé par Benj. Une brique d'entrée
  d'abord, la suite au suivi : déjà au plan (C4:727-728).
- **Agent Conformité** (p5:194) : des règles d'abord (liste fermée des gestes interdits, mentions, désinscription, horaires), puis un
  classifieur local si besoin, avant tout modèle (p5:218). C'est le patron de [03:31]-[03:32]. La liste fermée existe déjà dans le pilote
  (`lib/pilote/regles.ts:72-76`).
- **Agent Alerte** (p5:192) et **supervision** (p5:255) : un workflow en panne se signale à Benj sur Telegram (`lib/agents/telegram.ts:32`,
  `messageAlerte`), sur le modèle de [03:30], jamais par un appel.
- **Agents Rédaction et Conformité**, pour l'envoi segmenté de [02:39] :
  - une carte de lot qui montre les retenus et les exclus (C4:62-63, rang 4) ;
  - les exclusions et le registre des relances, lus avant chaque envoi (p5:190 ; `lib/relancesRegistre.ts:18`).
- **Étape 8, l'exploitation** (p5:58) : le point à un mois de chaque mise en service est déjà au plan (C4:742-744).
- **Physic Gym** (p5:400), dont on ne sait rien. Cet appel n'en donne qu'une trame de questions : aucune réponse de la chaîne filmée,
  sans lien connu avec Presti, n'entre dans la fiche de Physic Gym.

**Ce qui ne s'applique pas, et pourquoi :**
- L'« arbitrage », c'est-à-dire vendre puis sous-traiter à des développeurs [00:24], [04:45] : chez Presti, Claude Code et Hermes
  construisent (`.claude/rules/architecture-outils.md`).
- Les volumes et les canaux de prospection (50 000 e-mails par jour, SMS, LinkedIn) : hors règles (`.claude/rules/email-brevo.md`).
- Le portail client payant [00:56] : la console de Presti en tient lieu, et « Vos automatisations » est prévu (C4:103-104, rang 24).
- Les SMS d'appel manqué proposés à la salle de sport [02:33] : rien qui touche au téléphone (p5:226).

**Licence (dépôt) :** sans objet (une vidéo, pas un dépôt). Tous droits à l'auteur : on reprend des méthodes reformulées, jamais un extrait
ni une image.

**Chiffres annoncés :**
- Par l'auteur et ses invités, tous annoncés par l'auteur, non vérifiés :
  - 172 000 $ le mois dernier [00:00] ; des contrats à 35 000 $ (carte s10, minutes 108-121) ; un site à 1 200 $ devenu un projet à
    35 000 $ [00:48] ;
  - des prix par tranche d'activité du client, de 2 000-4 000 $ à 10 000-35 000 $ et plus [00:19]-[00:21] ;
  - une réceptionniste vocale à environ 5 000 $ plus 2 000 $ par mois, un CRM vers 10 000 $ [00:20] ;
  - un site d'agence à 250-300, un CRM à environ 500, un pack complet vers 2 000 [03:25] ;
  - le contrôle de conformité ramené à 2-3 % du coût d'un appel à un grand modèle [03:32] ;
  - pour la voix : 3 000 d'entrée plus 1 250 par mois, et 50 à 70 k par mois de récurrent [04:41].
- Par le client filmé, également non vérifiés : environ 100 000 $ par an et par site pour le logiciel de facturation [02:12] ; plus de
  100 000 membres [02:27] ; 10 sites, 15 visés d'ici deux à trois ans (carte s12, minutes 132-145).

**Détail de la lecture** (relevé complet, sorti de « Ce qu'elle montre » le 02/11 pour tenir les 3 à 8 lignes de p5:75 ; tâche 032-027) :
- Un cours d'agence IA mêlé de promotion (coaching, logiciels GTM et Lumina) ; la fiche de base est `plans/analyse-videos.md:10-177`.
- Un cadre d'appel de décision [01:24]-[01:44] :
  - le cadre annoncé, et les décideurs identifiés dès le début ;
  - 10 à 15 min de questions sur l'activité ;
  - douleur, objectif, pitch court, puis une note d'alignement de 1 à 10.
- Un appel de découverte complet et enregistré [02:02]-[02:44], avec le responsable d'une chaîne de salles de sport qui veut des agents
  pour son back-office :
  - deux logiciels qui se parlent mal, l'un pour la facturation et le point de vente, l'autre pour le CRM [02:13]-[02:19] ;
  - un irritant concret : l'abonnement gelé, le prorata à la main, la facture modifiée à la main [02:11]-[02:12] ;
  - aucun suivi des demandes de nuit [02:33]-[02:34] ;
  - des listes exportées en CSV et nettoyées à la main [02:35]-[02:36] ;
  - un budget rapporté à la dépense actuelle [02:30]-[02:31].
- Le prix fixé selon le client (criticité des données, nombre de clients touchés, temps ou argent rendu), pas selon la quantité de
  travail [00:19]-[00:22] ; un contrat court signé en ligne [00:22]-[00:23].
- Après la vente :
  - encaisser, puis un formulaire d'accueil d'environ 30 min, puis la transcription de l'appel jointe au ticket des développeurs [00:49] ;
  - un portail client avec le statut, les mises à jour et le support [00:47], [00:56] ;
  - un appel de livraison, puis un point à un mois [04:41]-[04:42] ;
  - le vendeur et le suivi client tenus par deux personnes différentes [04:36]-[04:39].
- Un invité :
  - fait contrôler chaque e-mail sortant par un classifieur qui n'est pas un modèle de langage [03:31]-[03:32] ;
  - se fait prévenir par appel ou par texto quand un outil tombe en panne [03:30].

### 2.2 RWKyUJLi-kI : le cours de 4 h 05 (vente en deux appels, agents de back-office chez une entreprise de travaux)

**Source :** « Launch A $100K/Month AI Agency In 7 Days (Full 4+ Hour Course) », Tim Chao (@thetimchao, oEmbed lu le 2026-11-02),
https://youtu.be/RWKyUJLi-kI · date de publication : inconnue · lue le 2026-11-02 · intégralement : **oui pour la parole, non pour
l'image**.
- Parole : 246 lignes-minute, lues le 01/11 ; 21 cartes valides, minutes 0 à 247.
- Image : planches pour 10 segments sur 21 (`index.tsv`).
- Relu le 02/11 : les 21 résumés ; les déroulés de 11 cartes ; la transcription brute de [01:40]-[01:43], [03:25] et [04:00].

**Ce qu'elle montre :**
- La vente en deux appels : cadrer et enregistrer, puis un devis envoyé avant et parcouru ligne à ligne [00:30]-[00:34].
- Un invité, Louis, vend des agents de back-office : un formulaire d'accueil en deux temps, avec dictée, les outils d'abord [01:41]-[01:42].
- Un de ses agents croise une dizaine de sources et relance la personne qui doit une pièce manquante [01:40]-[01:41].
- Chez une entreprise de travaux, un centre de commande où l'équipe approuve d'un clic les actions des agents [01:42]-[01:43].
- Les vrais chiffres, lus dans le CRM du prospect [03:24]-[03:26] ; chaque outil et son coût décrits avant de proposer [03:35].
- L'ordre de l'appel : douleur, objectifs, urgence, puis offre et coût [03:42]-[03:44] ; une fourchette tôt, le prix exact après [04:00].
- Après la vente : un accès client, un bilan à un mois, des 48 premières heures soignées [00:36]-[01:49].

**Principes et patterns réutilisables :**
- Le cadrage passe avant le prix. Le prix se donne en résumant la situation, l'objectif, le périmètre, la durée et le montant mensuel
  [03:44].
- Une offre se dit comme un résultat ; la technique reste dans la livraison [00:08]. Chez Presti, ce résultat est mesuré chez ce client,
  jamais promis (p5:42).
- Le formulaire se remplit par étapes, avec dictée : les outils, puis les processus. Une information manquante appelle un second
  formulaire, jamais une supposition [01:41]-[01:42].
- Un seul centre de commande pour approuver les actions des agents [01:43].
- Deux ou trois problèmes urgents d'abord, les étapes 2 et 3 plus tard [01:30]-[01:31]. Un gabarit prouvé chez une entreprise sert à une
  autre de la même niche [01:25].
- Une livraison soignée avant de vendre davantage : 48 heures d'accueil, avec de petites réussites visibles [01:49].

**Erreurs à éviter :**
- Dire au client qu'on remplace des gens [01:43]-[01:44] : interdit (p5:42). La formule juste est celle qui suit : libérer les meilleurs
  de l'administratif [01:44].
- Une précision « jusqu'à 99 % » [01:40], que rien ne mesure.
- Financer la mise en place du client, le paiement en plusieurs fois, la rémunération à la performance [02:24]-[02:36] : des décisions
  d'argent hors cadre. La « garantie conditionnée » [02:26] reste une question de Benj (C4:240, question 6 f).
- Les SMS automatiques, les appels, la publicité Meta, Sales Navigator.
- Le monologue et le partage d'écran avant d'avoir compris [03:36]-[03:41].

**Ce qui s'applique à Presti / à ce client :**
- **Étape 2 et fiche de découverte** (p5:52, p5:98-107). Le formulaire en deux temps de [01:41]-[01:42] est exactement la fiche de cadrage
  déjà retenue (C4:729-732). La dictée vocale est une piste d'interface ; à vérifier dans l'existant avant toute proposition.
- **Données** (p5:94). La règle « on fait ouvrir le CRM et on confirme » [03:25] fixe le niveau de confiance. Lue dans l'outil du client
  en rendez-vous, une valeur vaut « mesuré : lu dans tel outil, à telle date ». Dite de mémoire, elle vaut « déclaré ».
- **Fiche, point 4** (p5:103) : le rôle et le coût de chaque outil [03:35], qui remplissent la case « abonnement payé ».
- **Interface.** Le centre de commande [01:43] correspond à ce qui existe ou est prévu :
  - la boîte « À valider » : cartes `assistant_actions`, statuts dans `lib/assistant/cartes.ts:15`, validité de 24 h à :18 ;
  - le journal et les rapports du gérant (p5:39) ;
  - « chacun approuve ce qui le concerne », qui relève des rôles de l'organisation (C4:635-637).
- **Catalogue d'agents** (p5:196). L'agent « pièce manquante » [01:40]-[01:41] est un agent propre au client possible : un dossier
  incomplet déclenche la relance de la personne qui doit la pièce.
  - Il ne s'ouvre que s'il découle d'un irritant signé (p5:271).
  - Il passe par la porte de conformité et par le registre des relances (`lib/relancesRegistre.ts:18`, trois jours).
- **Étape 4** (p5:54) : le devis envoyé avant le second rendez-vous et parcouru ligne à ligne [00:34] ; la fourchette annoncée tôt [04:00],
  seulement si Benj la fixe.
- **Étape 8** (p5:58) : le bilan à un mois est déjà au plan (C4:742).
- **Bibliothèque partagée** (p5:158) : un gabarit prouvé se réutilise dans la même niche [01:25]. Les gabarits se partagent, les données
  jamais.

**Ce qui ne s'applique pas, et pourquoi :**
- La sous-traitance à 10-15 % du contrat [00:05], les centres d'appels, les numéroteurs automatiques.
- La voix IA pour les métiers d'urgence [00:07] : un appel téléphonique ne passe jamais par Presti (p5:226).
- Le portail client vendu à part [01:27] : la console de Presti en tient lieu.

**Licence (dépôt) :** sans objet (vidéo).

**Chiffres annoncés :** tous annoncés par l'auteur ou ses invités, non vérifiés.
- 241 000 $ le dernier mois et 400 000 visés [00:02] ; 10 millions « closés » en trois ans [00:01].
- Une voix IA à 5 000 plus 2 000 par mois (exemple donné) [00:05] ; des contrats de 30 à 100 000 $ et plus [00:12].
- De 3 à 35 000 selon la taille du client, plusieurs centaines de milliers au-delà de 20 M [00:35]-[00:36].
- Un CRM IA vendu 10 000, avec un développeur payé 750 [00:37] ; un site à 5 k et plus, un CRM à 10 k plus 200 par mois [01:27].
- Chez Louis [01:40]-[01:43] : une trentaine de workflows, des centaines d'heures par mois, « jusqu'à 99 % » de précision ; 24 k de mise en
  place plus 6 k par mois sur douze mois, soit près de 100 k.
- 7 500 $ sur trois mois [03:44] ; une fourchette de 3 à 15 k [04:00].

**Détail de la lecture** (relevé complet, sorti de « Ce qu'elle montre » le 02/11 pour tenir les 3 à 8 lignes de p5:75 ; tâche 032-027) :
- **La vente en deux appels** [00:30]-[00:34]. Un premier appel pour cadrer (logistique, douleurs, objectif), enregistré avec un outil de
  notes. Puis le devis, rédigé entre les deux, envoyé en avance et parcouru ligne à ligne au second appel, dans la semaine.
- **Un invité, Louis, qui vend des agents de back-office** copiés sur les façons de faire du client [01:40].
  - Il recueille tout par un formulaire d'accueil en deux temps, avec dictée vocale [01:41]-[01:42] : d'abord les outils, pour
    cartographier les connexions, puis chaque tâche en détail.
  - Un de ses agents croise une dizaine de sources, puis relance par e-mail la personne qui doit une pièce manquante [01:40]-[01:41].
- **Son dernier contrat, chez une entreprise de travaux** (« contracting company ») [01:42]-[01:43] : un centre de commande où les
  décideurs voient leurs données et où l'équipe approuve d'un clic les actions des agents ; cinq agents, de quatre à cinq workflows chacun.
- **Les vrais chiffres du prospect** : il lui fait ouvrir son CRM et confirmer le chiffre [03:24]-[03:26] ; il fait décrire chaque outil en
  place et son coût avant de proposer [03:35].
- **L'ordre de l'appel** [03:42]-[03:44] : douleur, objectifs, urgence réelle, puis offre, mise en œuvre et coût, comme un médecin.
- **Le prix** : une fourchette large annoncée tôt, avec l'endroit où elle tombera, puis le prix exact fixé après le cadrage [04:00].
- **Après la vente** :
  - un accès client avec l'avancement, le support et le formulaire d'accueil [00:36], [01:27] ;
  - un bilan à un mois [00:37] ;
  - des 48 premières heures soignées, et de la réactivité [01:48]-[01:49].

### 2.3 k1adsrTHwPg : le cours de 1 h 27 (audit puis cadrage en deux options)

**Source :** « How to Start an AI Agency in 2026 (1+ Hour Full Course) », Tim Chao (oEmbed lu le 2026-11-02), https://youtu.be/k1adsrTHwPg
· date de publication : inconnue · lue le 2026-11-02 · intégralement : **oui pour la parole, non pour l'image**.
- Parole : 88 lignes-minute. Seule la piste `en-orig` existe : la piste `en` a échoué le 01/11 (HTTP 429, `recuperer.log`). 8 cartes
  valides, minutes 0 à 88, dont deux « rien d'utile ».
- Image : planches pour 7 segments sur 8.
- Relu le 02/11 : les 8 résumés ; les déroulés de 4 cartes ; la transcription brute de [00:13]-[00:14].

**Ce qu'elle montre :**
- Surtout de la promotion (`plans/analyse-videos.md:339`) ; ce qui reste utile, c'est la vente en deux appels.
  - Le premier, présenté comme un audit, recueille les logiciels, l'effectif, la journée de chacun et les modes opératoires [00:13].
  - Entre les deux, un cadrage écrit de deux pages, en étapes, à deux options : refonte complète ou version ciblée [00:13]-[00:14].
  - La fourchette est testée dès le premier appel [00:14] ; un troisième appel s'ajoute s'il y a d'autres décideurs [00:15].
- Les enregistrements des appels nourrissent une base de connaissance reliée à un assistant [00:36] ; un CRM classe les prospects [00:40].
- Un jeu de rôle de découverte avec un prospect qui possède des salles de sport [00:43]-[00:46].

**Principes et patterns réutilisables :**
- Recueillir avant de proposer : logiciels, effectif, journée type, modes opératoires écrits [00:13].
- Proposer des options réelles, en étapes [00:14], [01:06].
- Trier plutôt que convaincre ; arrêter au troisième report [00:16], [00:51].

**Erreurs à éviter :**
- L'« audit gratuit » comme appât [00:13], et l'option « refonte » posée pour faire paraître l'autre moins chère : l'auteur la présente
  lui-même comme sa baisse de prix [00:14]. Chez Presti, aucune étape sans prix ne sert d'ancrage (C4:728).
- Faire croire qu'un appel suffit alors qu'il y en a deux [01:08] (`plans/analyse-videos.md:377`).
- Les appels à froid par le standard, le numéroteur automatique [01:09]-[01:12].

**Ce qui s'applique à Presti / à ce client :**
- **Étapes 1 et 2** (p5:51-52) : la liste de recueil de [00:13] recouvre les points 1, 2 et 4 de la fiche (p5:100-103). Les « modes
  opératoires » ajoutent une question au point 2 : avez-vous des procédures écrites ?
- **Étape 4** (p5:54) : deux options réelles, chiffrées chacune par Benj, en étapes réversibles (p5:57) ; jamais une option-leurre.
- **Mémoire.** Les comptes rendus des rendez-vous du client vont dans sa mémoire, sous RLS (p5:219 ; C4:733-735), jamais dans le vault :
  c'est la base de connaissance de [00:36], appliquée au client.
- Le texte « Ce qui se passe ensuite », en deux rendez-vous, est déjà écrit (C4:189-195).

**Ce qui ne s'applique pas, et pourquoi :** la communauté payante ; GTM, Apollo, Clay, Instantly, Sales Navigator [00:11], [00:59] ;
la fausse urgence « remplacer ou être remplacé » [00:40].

**Licence (dépôt) :** sans objet (vidéo).

**Chiffres annoncés :** tous annoncés par l'auteur, non vérifiés.
- Des contrats de 5 à 35 000 $ [00:13] ; un cadrage « de 10 à 35 000 » [00:14].
- 174 000, 241 000 puis 350 000 $ visés par mois [00:24] ; un contrat de 30 000 $ pour trois cliniques (carte s01).
- Environ 1 000 contacts pour 5 appels et une vente [01:12].

**Détail de la lecture** (relevé complet, sorti de « Ce qu'elle montre » le 02/11 pour tenir les 3 à 8 lignes de p5:75 ; tâche 032-027) :
- Surtout de la promotion (`plans/analyse-videos.md:339`). Ce qui reste utile, c'est la vente en deux appels.
  - Le premier, présenté comme un audit, recueille les logiciels utilisés, l'effectif, ce que fait chacun dans sa journée, les modes
    opératoires et ce qui pourrait être repris, avec des notes centralisées [00:13].
  - Entre les deux appels, un cadrage écrit de deux pages, en étapes, à deux options : une refonte complète, et une version ciblée sur ce
    qui aide le plus [00:13]-[00:14].
  - La fourchette est testée dès le premier appel [00:14] ; un troisième appel s'ajoute s'il y a d'autres décideurs [00:15].
- Les enregistrements des appels nourrissent une base de connaissance reliée à un assistant [00:36] ; un CRM classe les prospects par état
  [00:40].
- Un jeu de rôle de découverte avec un prospect qui possède des salles de sport [00:43]-[00:46].

### 2.4 angelotturri : cinq agents à vendre aux entreprises

**Source :** liste d'agents à vendre aux patrons, sans coder (titre à l'écran, décrit dans `plans/analyse-videos.md:468`), @angelotturri,
TikTok 7698795221999471902 (`videos/references-2026-11-01/tiktok/angelotturri-7698795221999471902.mp4`) · publiée le 20/10/2026, date
tirée de l'identifiant TikTok · lue le 2026-11-02 · intégralement : **oui** (146,5 s ; transcription complète relue ; images au 01/11,
`plans/analyse-videos.md:462-565`).

**Ce qu'elle montre :**
- Des agents décrits chacun en trois temps : le problème du patron, ce que fait l'agent, ce qu'il y gagne.
  - Le recrutement : il appelle ou écrit au candidat, puis le trie selon les critères du patron [6,4-38,0 s].
  - Le recouvrement : il lit le CRM et relance chaque débiteur jusqu'au paiement, ou jusqu'à ce qu'il dise pourquoi il ne paie pas
    [38,0-51,8 s].
  - L'après-chantier : à chaque chantier fini, il propose un entretien ou un abonnement, puis fait des rappels périodiques [58,1-82,7 s].
  - Le chiffrage : il part des prix pratiqués avec les anciens clients [85,3-112,7 s].
- Ces briques se vendent groupées en « moteurs » (relance, réputation), pas une à une [117,3-130,4 s].
- La liste saute le n° 3, et la relance prend le ton de quelqu'un qui aurait déjà accepté [82,7-85,3 s].

**Principes et patterns réutilisables :**
- Ces trois temps sont la colonne « irritant d'origine » de la fiche d'agent du prompt (p5:201).
- Relancer jusqu'au paiement, ou jusqu'à la raison [49,8-51,8 s] : la relance d'impayé s'arrête sur un motif rangé, pas sur le silence.
- Vendre des moteurs, pas des briques [117,3-130,4 s] : des sous-workflows de la bibliothèque, assemblés (p5:158).

**Erreurs à éviter :**
- Un agent qui téléphone et prend des rendez-vous [14,2-25,9 s] : jamais chez Presti (p5:42, p5:226).
- Un prix tiré des anciens chantiers et envoyé seul [105,7-108,1 s]. Un exemple montre la forme, jamais un prix (`lib/ai/exemples.ts:4-5`),
  et un prix non sourcé ne part jamais seul (p5:217, p5:226).
- La relance « comme s'il avait accepté » [82,7-85,3 s] : elle viole la règle de ton (C4:74-76, rang 10).
- Des gains de « dizaines de milliers par mois » [53,8-58,1 s].

**Ce qui s'applique à Presti / à ce client :**
- **Agent Relance** (p5:190) et agent propre « facturation et impayés » (p5:196) :
  - la relance va jusqu'au paiement ou jusqu'au motif, et le motif est rangé d'un geste par le gérant (C4:56-57, rang 1) ;
  - le registre commun des relances est lu avant chaque envoi (`lib/relancesRegistre.ts:18`).
- **Agent propre « après-chantier »** : il propose une date d'entretien (`lib/apresChantier.ts:47-50`) dans « À valider » (C4:66-67, rang 6).
- **Chiffrage** : un « prix pratiqué sur vos derniers chantiers » reste un repère cité, jamais une ligne envoyée (C4:62-63 ; question 6 b,
  C4:240).
- **Démo du mode A** (p5:339) : l'entreprise fictive « Exemple. » avec deux ou trois moteurs assemblés (relances, après-chantier), alors que le
  plan range ces moteurs dans L20, « rien avant un contrat signé » (C4:721), et veut une démo qui ne montre que le vrai produit (C4:724) :
  question 25 de la première réponse (les moteurs eux-mêmes : C4:736-741).

**Ce qui ne s'applique pas, et pourquoi :**
- L'agent de recrutement : des appels, et des données personnelles de candidats. Hors offre.
- Le modèle « je fais tout construire par un développeur et je garde 80 à 85 % » [130,4-140,5 s].

**Licence (dépôt) :** sans objet (vidéo).

**Chiffres annoncés :** des dizaines de milliers de dollars par mois pour le patron [53,8-58,1 s] ; une marge gardée de 80 à 85 %
[137,6-140,5 s]. Annoncés par l'auteur, non vérifiés.

### 2.5 realbastianvolkis-7684021380060302625 : agent, mémoire, connexions, compétences

**Source :** « Arrêtez de construire des agents et des cerveaux » (titre en cartouche, décrit), @realbastianvolkis, TikTok
7684021380060302625 · publiée le 10/09/2026, d'après l'identifiant · lue le 2026-11-02 · intégralement : **oui** (251,8 s ; transcription
complète relue ; `plans/analyse-videos.md:567-670`).

**Ce qu'elle montre :**
- Pour qu'une entreprise se serve de l'IA, il faut quatre choses : un agent, une mémoire, des connexions et des compétences [68,2-71,8 s].
  Les trois premières sont de l'infrastructure, à prendre toute faite [71,8-101,3 s].
- Ce qui distingue une entreprise, ce sont ses compétences, ses workflows et ses modes opératoires [108,7-116,9 s].
  - L'accueil d'un nouveau client est lui-même un workflow que l'IA doit connaître [120,6-138,7 s].
  - Une compétence n'est qu'un document d'instructions pas à pas [166,6-173,2 s].
- Un agent intégré au logiciel, à côté des boutons manuels, sur l'exemple de Linear [197,5-221,4 s].

**Principes et patterns réutilisables :**
- La part sur mesure d'une offre Entreprise, ce sont les procédures du client. L'infrastructure (n8n, Supabase, l'assistant) est commune.
- Le double chemin : tout ce que fait un agent se fait aussi à la main.

**Erreurs à éviter :** les revenus et les « études de cas sans fin » [7,3-21,0 s] ; un conseil qui sert la vente de sa propre licence
[184,9-197,5 s].

**Ce qui s'applique à Presti / à ce client :**
- **La bibliothèque partagée** (p5:158), c'est l'infrastructure.
- **Les procédures du client** sont des données de son compte, sous RLS, jamais dans le vault ni dans `lib/ai/cerveaux/` (C4:733-735). La
  vidéo confirme ce choix.
- **Fiche, point 2, le parcours client étape par étape** (p5:101). Chaque processus recueilli devient une compétence écrite, qui sert de
  consigne à l'agent et de spécification au workflow n8n (C4:79-80, rang 12).
- **Interface** : chaque action d'agent garde son bouton manuel, déjà au plan (C4:124).

**Ce qui ne s'applique pas, et pourquoi :**
- Vendre une licence d'infrastructure à des tiers.
- Hermes devant le client : l'auteur commande le sien depuis Telegram [39,0-41,5 s], alors que chez Presti Hermes reste derrière (p5:170).

**Licence (dépôt) :** sans objet (vidéo).

**Chiffres annoncés :** plus de 700 000 $ en vendant de l'IA en un peu plus d'un an [7,3-12,0 s]. Annoncé par l'auteur, non vérifié.

### 2.6 realbastianvolkis-7685717353828519170 : le CRM qui ne perd personne

**Source :** « Arrêtez de construire des CRM avec l'IA » (titre en cartouche, décrit), TikTok 7685717353828519170 · publiée le 15/09/2026,
d'après l'identifiant · lue le 2026-11-02 · intégralement : **oui** (88,2 s ; transcription complète relue ; `plans/analyse-videos.md:672-769`).

**Ce qu'elle montre :**
- Selon l'auteur, un logiciel « agentique » est un assistant dans le logiciel, qui le comprend et facture des crédits à l'usage
  [26,4-33,4 s].
- Avant, des abonnements faibles et des désabonnements [33,4-41,1 s]. La cause : la confusion. Un logiciel trop compliqué pour obtenir un
  résultat n'est plus payé [50,9-60,9 s].
- À l'image, un panneau qui pose une question à la fois et écrit sous chaque réponse ce qu'il vient de mettre à jour (image à 30,5 s).

**Principes et patterns réutilisables :**
- Le CRM sur mesure (p5:35) doit réduire la confusion : un écran par rôle, une question à la fois, une ligne « fait » sous chaque action.
- L'usage comme unité de coût. Presti a déjà des crédits par offre : 600 par mois pour Entreprise (`lib/plans.ts:114`).

**Erreurs à éviter :** des montants d'abonnés et un taux de désabonnement de 28,39 % montrés sans source [0,0-13,8 s ; image à 35,0 s] ;
une démo en local présentée comme le produit (image à 84,0 s).

**Ce qui s'applique à Presti / à ce client :**
- **CRM sur mesure et journal** : la ligne « ce qui vient d'être fait » sous chaque réponse est déjà retenue pour l'assistant (C4:95-96,
  rang 20). Pour l'Entreprise, la même ligne entre au journal lisible par le gérant (p5:220).
- **Coûts récurrents du devis** (p5:54, p5:290) : mesurer l'usage (appels de modèle, crédits) en mode à blanc pour le chiffrer. La forme du
  prix reste à Benj (C4:240, question 6 c et d).

**Ce qui ne s'applique pas, et pourquoi :** la recharge payante de crédits est une décision d'argent (question 6 c) ; « remplacer le
logiciel » en général est hors sujet.

**Licence (dépôt) :** sans objet (vidéo).

**Chiffres annoncés :** tous annoncés par l'auteur, non vérifiés.
- 250 $ par mois depuis plus de 10 mois ; 187 £ par mois ; 700 000 $ de revenus.
- Jusqu'à 13 000 $, et 2 000 $ par mois pour un client ; 39 £ par mois avant [0,0-50,9 s].
- Un désabonnement de 28,39 % (image à 35,0 s).

### 2.7 realbastianvolkis-7678336589503827202 : licence plus mise en place

**Source :** « En route vers un logiciel IA à 1 M$ » (titre en cartouche, décrit), TikTok 7678336589503827202 · publiée le 26/08/2026,
d'après l'identifiant · lue le 2026-11-02 · intégralement : **oui** (54,4 s ; transcription complète relue ; `plans/analyse-videos.md:771-845`).

**Ce qu'elle montre :** l'auteur passe au logiciel haut de gamme en vendant des licences [9,7-28,6 s] : un cerveau de connaissances
installé pour l'entreprise, des agents sous licence qui font tourner l'activité, un produit remplacé par un agent. Puis des abonnements
plus chers et des forfaits [37,4-48,9 s].

**Principes et patterns réutilisables :** une offre sur mesure, c'est une mise en place (les données et les procédures du client, ses
agents), puis un récurrent.

**Erreurs à éviter :** montrer les paiements refusés d'un client comme un argument (image à 33,0 s) ; une vidéo sans sous-titres ; un récit
de revenus.

**Ce qui s'applique à Presti / à ce client :**
- La forme « mise en place puis abonnement, ou contrat annuel » est la question 6 d de Benj (C4:240).
- La page de démo présente l'offre comme une mise en place, ce qui est déjà proposé (`plans/analyse-videos.md:817`).

**Ce qui ne s'applique pas, et pourquoi :** la licence d'une infrastructure ; tout montant.

**Licence (dépôt) :** sans objet (vidéo).

**Chiffres annoncés :** des paiements de 13 000 $ et de 2 000 $ ; 199 £ par mois ; un abonnement minimum de 250 $ par mois ; des forfaits
de 3 000 à 10 000 $ [3,5-48,9 s]. Annoncés par l'auteur, non vérifiés.

### 2.8 realbastianvolkis-7675806697113357590 : facturer le travail fait

**Source :** « Un client à 3 700 $ par an pour mon logiciel » (titre en cartouche, décrit), TikTok 7675806697113357590 · publiée le
19/08/2026, d'après l'identifiant · lue le 2026-11-02 · intégralement : **oui** (39,9 s ; `plans/analyse-videos.md:847-929`).

**Ce qu'elle montre :** facturer le travail fait plutôt que l'accès, et « garantir des résultats » [6,6-17,0 s]. À l'image, un tableau de
tâches en trois colonnes : à faire, en cours, à relire (image à 19,0 s).

**Principes et patterns réutilisables :** montrer au client le travail de ses agents en colonnes (repéré, préparé, à valider), comme le
plan le retient déjà pour la boîte « À valider » (C4:97-98, rang 21).

**Erreurs à éviter :** promettre de « garantir des résultats ». C'est interdit : un gain non mesuré ne s'écrit pas (p5:42).

**Ce qui s'applique à Presti / à ce client :** les KPIs de ROI (p5:292-301). À la place d'une garantie, un résultat mesuré depuis une base
de départ, chiffre par chiffre, dans le rapport du gérant (agent Reporting, p5:193).

**Ce qui ne s'applique pas, et pourquoi :** le paiement au résultat (décision d'argent de Benj) ; l'agent qui développe un produit.

**Licence (dépôt) :** sans objet (vidéo).

**Chiffres annoncés :** 3 700 $ en 48 heures et un abonnement annuel de 3 000 $ [0,0-11,9 s] ; 3 644+, 12 230+ et 98 % sur la page
d'accueil (image à 22,0 s). Annoncés par l'auteur, non vérifiés.

### 2.9 mikalianov : l'entreprise montrée telle qu'elle est (démo fictive, import d'un export)

**Source :** « Les tableaux Excel viennent officiellement de mourir » (sous-titre d'ouverture), @mikalianov, TikTok 7702516743494733089 ·
publiée le 30/10/2026, d'après l'identifiant · lue le 2026-11-02 · intégralement : **oui pour la parole et l'image échantillonnée**
(40,5 s ; `plans/analyse-videos.md:933-1049`). La troisième étape, elle, n'est pas dans la vidéo : elle est cachée derrière un abonnement
et un commentaire [31,7-40,4 s].

**Ce qu'elle montre :**
- Un logiciel d'agence en 3D, sur une entreprise fictive (« Novalis SA ») : qui est là, le suivi des projets, les devis en attente
  [3,0-10,6 s].
- La méthode : décrire son entreprise, ou donner un export de CRM ou d'Excel pour reprendre les vrais chiffres [15,2-22,9 s] ; puis la
  dessiner comme un monde cliquable à partir d'un plan [22,9-31,7 s].

**Principes et patterns réutilisables :** une démo convainc quand elle montre l'entreprise telle qu'elle est (équipe, sites, projets) ;
l'import d'un export existant amorce les données.

**Erreurs à éviter :** des données fictives présentées comme réelles, sans la mention « Exemple » (images à 4,5 et 9,5 s) ; une étape
cachée contre un abonnement ; une marque tierce à l'écran.

**Ce qui s'applique à Presti / à ce client :**
- **La démo du mode A** (définition du « fini », p5:339) est une entreprise fictive du bâtiment à plusieurs membres (p5:429). Elle porte
  « Exemple. » sur chaque écran et chaque chiffre, ce que la référence ne fait pas.
- **L'import d'un export du client** (données p5:95 ; fiche, points 4 et 5, p5:103-104) suit le circuit contrôlé de « Mes chiffres » : lecture
  du classeur (`app/chiffres/ComptaArtisan.tsx:157`), puis aperçu validé avant toute écriture (`plans/analyse-videos.md:1010`). En mode B
  seulement, avec l'accord du client.
- **Le CRM sur mesure** (p5:35) : l'atelier 3D existant (`app/crm/atelier/Atelier.tsx`) pourrait montrer les sites et les équipes de
  l'organisation. À n'envisager qu'après les organisations (C4:625-660).

**Ce qui ne s'applique pas, et pourquoi :** « fais-le toi-même avec une IA » ; un monde 3D promis à la vente avant que les données existent.

**Licence (dépôt) :** sans objet (vidéo).

**Chiffres annoncés :** aucun résultat chiffré. Des chiffres de maquette : 26 présents sur 30, 185 600 CHF de devis en attente, 7 devis,
2 à relancer, 1 à signer. Ils sont fictifs, et l'auteur ne les marque pas « Exemple ».

### 2.10 sambutlerai : une proposition écartée ne revient pas

**Source :** « 40 pubs statiques générées à partir d'une photo produit » (titre décrit), @sambutlerai, TikTok 7682094375119146272 · publiée
le 05/09/2026, d'après l'identifiant · lue le 2026-11-02 · intégralement : **oui** (42,3 s ; `plans/analyse-videos.md:1263-1364`). Les
gestes cocher, écarter et régénérer sont dits, jamais montrés [29,5-37,5 s].

**Ce qu'elle montre :** une entrée unique, déclinée en dizaines de sorties, puis un tri humain [30,2-38,4 s] : on écarte une sortie pour
qu'elle ne revienne pas, on coche celles qui doivent guider la suite.

**Principes et patterns réutilisables :** la mémoire des refus et des choix. Une proposition écartée ne revient pas ; une proposition
gardée sert d'exemple.

**Erreurs à éviter :** les faux témoignages et les visages générés (image à 18 s) ; le coupon de réduction ; un revenu en accroche.

**Ce qui s'applique à Presti / à ce client :**
- **Étape 8** (p5:58 : chaque refus ou correction du client ajuste un gabarit ou une règle, avec trace) et **mémoire des agents** (p5:219 :
  refus et corrections du client). Par organisation, on applique la règle « écartée, elle ne revient pas », déjà retenue pour l'assistant
  (C4:70-71, rang 8 ; statut `refusee`, `lib/assistant/confirmation.ts:131`).
- **KPI de qualité des agents** : la part des actions validées sans modification, et la part refusée (p5:299).

**Ce qui ne s'applique pas, et pourquoi :** la génération d'images et les publicités ne touchent pas l'offre.

**Licence (dépôt) :** sans objet (vidéo).

**Chiffres annoncés :** un système facturé 2 000 $ [0,0-4,0 s] ; 40 publicités toutes différentes [9,5-12,1 s]. Annoncés par l'auteur, non
vérifiés.

### 2.11 Vidéos du 01/11 écartées pour l'offre (3)

| Vidéo | Fiche existante | Pourquoi elle ne sert pas l'offre |
|---|---|---|
| yova2n, TikTok 7701424216331078945, publiée le 27/10/2026 | `plans/analyse-videos.md:1051-1152` | grammaire d'accroche d'un produit 3D ; le calendrier fiscal montré est hors périmètre (« de A à Z » interdit, C4:125) |
| ghoost.000, TikTok 7692934139833568544, publiée le 04/10/2026 | `plans/analyse-videos.md:1156-1261` | des carrousels de Presti, faits par Hermes : c'est le contenu marketing de Presti, pas l'offre. Seul rappel utile : Hermes construit et reste derrière, jamais devant un client (p5:170) |
| metakaihos, TikTok 7701671513002429729, publiée le 28/10/2026 | `plans/analyse-videos.md:1368-1474` | sans parole ; seul motif repris, déjà au plan : la barre « à valider, plus trois priorités du jour » (C4:99-100, rang 22) |

---

## 3. `docs/connaissance-videos/` : ce qui sert l'offre, sans refaire l'existant

### 3.1 restructureai, reel Instagram DdscwJUROKo : une « équipe » d'agents autour d'un cerveau

**Source :** « I Built an Entire Social Media Team With 0 Employees » (légende), ReStructure AI (@restructureai),
https://www.instagram.com/reel/DdscwJUROKo/ · publiée le 25/09/2026 (`upload_date`, dans
`docs/contexte-cloud/presti-ops/veille/2026-09-25/reel-DdscwJUROKo.info.json`) · lue le 2026-11-02, en relisant la transcription et
l'analyse existantes · intégralement : **oui**.
- 83,1 s ; transcription large-v3-turbo en 30 segments (`docs/connaissance-videos/veille/reel-DdscwJUROKo/transcription.txt`).
- 94 images lues par deux inventaires le 25/09 (`SaaS/Produit/Ecosysteme-Marketing-Reel-2026-09-25.md:5`).

**Ce qu'elle montre** (d'après la transcription et la note du 25/09, qu'on ne refait pas) :
- Une équipe marketing d'agents pour une entreprise d'une seule personne : recherche, contenu, publication, communauté, croissance [0:09-0:13, 0:15-1:03].
- Rien ne sort sans l'accord du propriétaire ; chaque publication attend dans une file d'approbation [0:12-0:15, 0:46-0:49].
- À l'écran, d'après la note du vault (`…Reel-2026-09-25.md:54-89`, `:93-154`) : un « cerveau » qui trie, route, fixe les priorités et
  vérifie ; une mémoire partagée en fichiers ; huit événements qui interrompent la boucle, chacun avec son responsable ; une remise à l'humain.
- Un résumé d'une page chaque matin, et le suivi de l'argent plutôt que des « j'aime » [1:05-1:16].

**Principes et patterns réutilisables :**
- La hiérarchie du prompt (p5:174-181) a son schéma : un orchestrateur qui trie et route sans décider de l'argent, des départements
  d'agents, une couche « vérifie le travail », une file d'approbation, une remise à l'humain.
- « Où vit la vérité » : un système de référence séparé des signaux et des agents. C'est Supabase, source de vérité (p5:115).
- « Ce qui interrompt la boucle » : une liste fermée d'événements, avec pour chacun l'agent qui le traite ou l'humain qu'on prévient.
- Mesurer l'argent et pas l'activité : relier le clic à la vente payée.
- Un résumé quotidien d'une seule page.

**Erreurs à éviter :**
- Les tableaux sont des maquettes, aux données fictives et aux compteurs animés : rien ne prouve que le système tourne
  (`…Reel-2026-09-25.md:17`).
- Plus de trente outils tiers, presque tous payants : Metricool, ManyChat, Notion, Airtable, Descript, ElevenLabs, OpusClip…
  (`…Reel-2026-09-25.md:95-152`).
- Les réponses automatiques aux messages privés.

**Ce qui s'applique à Presti / à ce client :**
- **Schéma du système** (livrable 4, p5:282). Poser ses couches sur le Mermaid du prompt (p5:119-152) : signaux, système de référence,
  cerveau-routeur, agents, données et observabilité, remise à l'humain. La « vérification du travail » est l'agent Conformité (p5:194),
  placé avant toute sortie.
- **Agent Alerte** (p5:192) : une liste fermée d'interruptions par client, par exemple un lead qui demande un prix, un avis négatif, un
  message tardif et urgent, un workflow en panne, un coût qui dérive. Chacune a son destinataire humain.
  - Un sujet d'escalade reste humain (p5:226).
  - Le pilote détecte déjà des mots d'escalade (`lib/pilote/regles.ts:186`).
- **Agent Reporting** (p5:193) : un rapport d'une page, sourcé, le lundi à 8 h par défaut (p5:427).
- **KPIs** (p5:296) : un chiffre d'affaires n'est attribué à une relance que si elle précède la signature. C'est la même logique que
  « du clic à la vente payée ».

**Ce qui ne s'applique pas, et pourquoi :**
- L'équipe « réseaux sociaux » elle-même : elle ne découle d'aucun irritant signé (p5:271).
- Une publication automatique chez le client sans son accord écrit (p5:227).
- La promesse « zéro employé » (p5:42).

**Licence (dépôt) :** sans objet (vidéo). Le « plan » promis contre un commentaire n'a pas été demandé : aucune interaction avec ce compte
(`memoire-presti/source-restructureai-depots-n8n-0211.md`).

**Chiffres annoncés :** une personne, zéro employé ; quatre départements, quatre managers et 33 agents, montrés en maquette. Annoncés par
l'auteur, non vérifiés. Au 25/09 : 110 j'aime et 300 commentaires (`reel-DdscwJUROKo.info.json`).

**Détail de la lecture** (relevé complet, sorti de « Ce qu'elle montre » le 02/11 pour tenir les 3 à 8 lignes de p5:75 ; tâche 032-027) :
- Une équipe marketing d'agents pour une entreprise d'une seule personne : la recherche, le contenu, la publication et la communauté, la
  croissance [0:09-0:13, 0:15-1:03].
- Rien ne sort sans l'accord du propriétaire, et chaque publication attend dans une file d'approbation [0:12-0:15, 0:46-0:49].
- À l'écran, d'après la note du vault (`…Reel-2026-09-25.md:54-89`, `:93-154`) :
  - un « cerveau » qui trie, route, fixe les priorités et vérifie le travail ;
  - une mémoire partagée en fichiers ;
  - huit événements qui interrompent la boucle, chacun avec qui s'en charge, un agent ou un humain ;
  - une couche de remise à l'humain.
- Un résumé d'une page chaque matin, et le suivi de l'argent plutôt que des « j'aime » [1:05-1:16].

### 3.2 restructureai, TikTok 7690784360898874645 : un « système d'exploitation » d'agents pour une boutique

**Source :** « I Built an AI Dropshipping Operating System », @restructureai, TikTok 7690784360898874645 · publiée le 29/09/2026, d'après
l'identifiant et `docs/ecommerce/sources/restructureai-7690784360898874645.analyse.md:3` · lue le 2026-11-02, en relisant l'analyse
existante · intégralement : **non**. Le 05/10, 45 images sur 4 planches et les sous-titres incrustés ont été lus, mais il n'y a **pas de
transcription audio** (« mémoire du PC insuffisante », même fichier, ligne 3).

**Ce qu'elle montre :**
- Des blocs d'agents autour d'un centre de commande : un agent de commande, un gestionnaire de tâches, un agent d'approbation et une boîte
  d'alertes.
- Chaque matin, un seul rapport de profits et pertes, avec « quoi faire ensuite » et un bouton d'approbation.
- Un journal d'activité des agents, et une mémoire commune rangée par domaine.
- Les remboursements bloqués « arrivent sur le bureau » du propriétaire.

Source : même fichier, lignes 6-19.

**Principes et patterns réutilisables :** l'approbation et les alertes au centre ; un journal des agents visible ; un rapport du matin qui
propose et attend un accord ; une mémoire par domaine ; les cas bloqués remontés à l'humain.

**Erreurs à éviter :** des maquettes sans preuve ; des outils payants (DSers, TrueProfit, Triple Whale…) ; « 24/7, 51 agents » en maquette
(même fichier, ligne 30).

**Ce qui s'applique à Presti / à ce client :**
- **Agent Reporting** (p5:193) : un rapport qui se termine par des propositions à valider (des cartes), jamais par une action.
- **Le journal lisible par le gérant** (p5:220), la mémoire des agents par organisation (p5:219), et l'escalade (p5:226).

**Ce qui ne s'applique pas, et pourquoi :**
- L'e-commerce.
- Le « bénéfice net » : Presti ne calcule qu'une marge sur matériaux, estimée (`lib/crm/chantier.ts:58-61`, cité dans
  `plans/analyse-videos.md:1194`).

**Licence (dépôt) :** sans objet (vidéo).

**Chiffres annoncés :** des maquettes, annoncées par l'auteur, non vérifiées.
- Un plan à « 25 000 $ » ; un revenu de 14 971 $ et un bénéfice net de 4 449 $, soit 30 %.
- 0,0145 $ par exécution ; un ROAS de seuil de 2,5 à 3,1.
- Au 05/10 : 56 100 vues, 2 881 j'aime et 508 commentaires.

### 3.3 trevsagents et androoagi : des agents qu'on voit travailler

**Source :** deux TikToks, lus le 2026-11-02.
- @trevsagents, TikTok 7644344691688770846, publiée le 26/05/2026 d'après l'identifiant, 116,8 s. Intégralement : **oui pour la parole**
  (ASR anglais de 65 segments, sur Oracle : `veille/README.md:31`).
- @androoagi, TikTok 7623856430621134110, publiée le 01/04/2026, 179,8 s. Intégralement : **oui pour la parole** (texte local intégral, mais
  non revérifié : `veille/README.md:27`).
- Pour les deux, l'image se limite à 8 captures (`veille/README.md:5`).

**Ce qu'elle montre :**
- Des agents dessinés comme des personnages dans un monde visuel : une salle de réunion, une « baie des revenus », une « trésorerie » qui
  montre ce que coûtent les appels d'API, une « usine ».
- Un agent manager rédige le compte rendu de la réunion des agents.
- Les agents gèrent aussi le support d'une application existante (trevsagents, 0-117 s ; androoagi, 0-179 s).

**Principes et patterns réutilisables :** voir qui travaille, et sur quoi ; afficher le coût de l'IA en clair ; un agent qui rédige le
compte rendu.

**Erreurs à éviter :**
- Les « entreprises autonomes 24 h sur 24 », les chiffres de ventes, les attaques contre des concurrents.
- Ces vidéos sont la référence de l'« écosystème » interne, abandonné le 11/10 (p5:399) : ne pas le relancer.

**Ce qui s'applique à Presti / à ce client :**
- Le coût de l'IA par client et par jour, rendu visible (p5:264 ; KPI, p5:301), avec une alerte quand il dérive (p5:192).
- Le journal « ce que vos assistants ont fait cette semaine » (p5:220).

**Ce qui ne s'applique pas, et pourquoi :** les entreprises automatiques de l'auteur ; un univers visuel vendu comme produit au client.

**Licence (dépôt) :** sans objet (vidéos).

**Chiffres annoncés :** androoagi, près de 2 000 $ de revenu sur Etsy en deux semaines, pour 37 commandes [17,6-30,7 s]. Annoncé par
l'auteur, non vérifié.

### 3.4 ip4IHi1ZfhA : les quatre « portes » de la valeur

**Source :** « Ce Business IA Ennuyant Me Rapporte 28 974€/Mois (Avec Claude) », https://www.youtube.com/watch?v=ip4IHi1ZfhA
(`docs/connaissance-videos/veille/ip4IHi1ZfhA/metadata.json`), 45 min 51 s · date de publication : non relevée (absente de
`metadata.json`) · lue le 2026-11-02 · intégralement : **non**.
- La transcription française complète existe (sous-titres : `veille/README.md:17`).
- Le 02/11, elle n'a été lue qu'en partie : les minutes [00:07]-[00:13] et [00:37]-[00:42], plus un balayage par mots-clés des 46 minutes.
- Le dépôt n'en a aucune analyse antérieure : seulement `metadata.json`, la planche et la transcription.

**Ce qu'elle montre :**
- Une agence qui vend des systèmes d'IA aux entreprises. Selon l'auteur, un dirigeant compte son argent, pas ses heures [00:07].
- Quatre « portes » [00:09]-[00:12] :
  - faire gagner du temps : peu payé, vite résilié ;
  - faire baisser des dépenses : plafonné ;
  - régler un problème légal ou administratif : ponctuel ;
  - amener des clients : sans plafond.
- Un débrief mensuel avec le patron [00:40], et l'installation payée avant le travail [00:41].

**Principes et patterns réutilisables :** classer chaque irritant par le type de valeur qu'il touche (temps, coût, conformité, revenu) ;
montrer cette valeur chaque mois.

**Erreurs à éviter :** l'installation offerte vingt jours, payée seulement si les résultats viennent [00:40], qui est une promesse de
résultat ; « l'IA gère toutes les campagnes » [00:39] ; la promotion d'un programme payant.

**Ce qui s'applique à Presti / à ce client :**
- **La matrice irritant → workflow → agent → KPI** (p5:53 ; livrable 3, p5:281) gagne une colonne « type de valeur » : temps déclaré,
  argent récupéré mesuré, risque de conformité, revenu attribué. Cette colonne dit quel KPI de ROI on peut mesurer (p5:292-301).
- **Un irritant de pur gain de temps n'a qu'un KPI déclaré** (p5:298). On le dit au client, on ne le maquille pas.
- **Le rapport mensuel du gérant** (p5:193) tient lieu du débrief mensuel.

**Ce qui ne s'applique pas, et pourquoi :**
- Le choix de ne vendre qu'une chose, amener des clients : Presti part des irritants signés (p5:271).
- L'installation gratuite contre résultat : l'essai honnête, c'est le mode ombre (p5:57).

**Licence (dépôt) :** sans objet (vidéo).

**Chiffres annoncés :** 28 974 € par mois (titre) ; une automatisation de gain de temps payée environ 300 € par mois et arrêtée au bout de
deux mois [00:08]-[00:10] ; des factures de 1 000 à 3 000 € [00:07]. Annoncés par l'auteur, non vérifiés.

### 3.5 milesreevesai : des tableurs épars vers un tableau de bord

**Source :** « Claude just turned messy Excel spreadsheets into a $12K/month AI busi... », @milesreevesai, TikTok 7691818218767322400 ·
publiée le 01/10/2026 · lue le 2026-11-02 · intégralement : **non**. L'analyse automatique du 06/10 porte sur 10 images sur 29, avec les
sous-titres lus par reconnaissance de caractères, et **sans transcription audio**
(`docs/connaissance-videos/milesreevesai-7691818218767322400.analyse.md:1-6`).

**Ce qu'elle montre (à recouper) :** les tableurs désordonnés d'une entreprise locale, nettoyés et synchronisés, puis un tableau de bord
automatique, facturé chaque mois (reconnaissance de caractères, de 10 à 46 s).

**Principes et patterns réutilisables :** synchroniser des données éparses vers une source unique, puis en tirer un tableau de bord.

**Erreurs à éviter :** la capture « paiement reçu », présentée comme une preuve (image à 30 s).

**Ce qui s'applique à Presti / à ce client :**
- La synchronisation des outils (rang 3, p5:180), par une bibliothèque `lib-…` (p5:158, p5:163), avec la date de dernière synchronisation
  visible (p5:95).
- Le rapport du gérant.

**Ce qui ne s'applique pas, et pourquoi :** le récit de revenus.

**Licence (dépôt) :** sans objet (vidéo).

**Chiffres annoncés :** 12 000 $ par mois ; « paiement reçu de 50 000 $ » (image à 30 s). Lus par reconnaissance de caractères ; annoncés
par l'auteur, non vérifiés.

### 3.6 ray_fu, « un LLM à soi » : classer en local, les données chez soi

**Source :** « How to create a custom LLM with your own data », @ray_fu, TikTok 7692946113241959711 · publiée le 04/10/2026 · lue le
2026-11-02 · intégralement : **non**.
- Reconnaissance de caractères et vision sur 10 images sur 26, sans transcription audio
  (`docs/connaissance-videos/ray_fu-7692946113241959711.analyse.md:1-6`).
- Une relecture de Claude Code du 06/10 corrige la synthèse automatique (même fichier, lignes 74-89).

**Ce qu'elle montre :** affiner un petit modèle ouvert sur 200 à 500 exemples relus, pour classer des tickets par équipe et par priorité ;
les données des clients restent sur son propre serveur (de 10 à 44 s).

**Principes et patterns réutilisables :** un petit modèle local pour une tâche étroite, comme classer, quand une règle ne suffit plus et
qu'on dispose d'exemples relus.

**Erreurs à éviter :** prendre pour acquis « moins de 2 $ » et « 300 exemples suffisent ».

**Ce qui s'applique à Presti / à ce client :**
- **La règle des modèles** (p5:218) : aucun modèle d'abord ; sinon un modèle local sur Oracle pour les données du client.
- **Agent Qualification** (p5:189) : classer une demande (type, urgence) par des règles d'abord. Un modèle affiné ne vient qu'avec des
  centaines d'exemples réels relus du client, et son accord ; rien avant un corpus mesuré (même fichier, lignes 84 et 89).
- Limite relevée le 06/10 : le serveur est un ARM à 2 cœurs, 12 Go, sans GPU (même fichier, ligne 85). À revérifier avec `df -h` et la
  mémoire libre (p5:359).

**Ce qui ne s'applique pas, et pourquoi :** l'entraînement « pour quelques dollars » comme promesse ; tout modèle en ligne gratuit pour une
donnée du client (p5:218).

**Licence (dépôt) :** sans objet (vidéo).

**Chiffres annoncés :** moins de 2 $ ; 1,5 milliard de paramètres sur 300 exemples ; 200 à 500 exemples relus. Lus par reconnaissance de
caractères ; annoncés par l'auteur, non vérifiés.

### 3.7 Écartées pour l'offre

| Source | Pourquoi |
|---|---|
| robbedoesecom (TikTok 7673240835810446612), ray_fu « marché boursier » (7682197152235375902), tonytuyisenge (7693231512103177505) | e-commerce et bourse ; aucune méthode pour une entreprise de services |
| mr_pynk (TikTok 7637274283470753056), hugomatias (reel DcODQPCMsLl), JBIuZCw74FI (YouTube, « agence vidéo IA ») | production de publicités, pas de gestion d'entreprise |
| jaydenleilua (reel DdKrZjlg1eC) | prospection à froid : collecte et messages privés ; hors règles, et hors offre |
| pPoR_0FHl-U (YouTube, « gagner vraiment de l'argent avec Claude ») | entretien de motivation ; un seul passage sur « vendre des systèmes qui font gagner du temps » [00:43], sans méthode |
| 10 vidéos YouTube e-commerce de `veille/` (5uaSrfCLd78, 9cXVJqlWNK0, AWyEpJokQiM, dh542CjmMi0, J6Cpt7BOqI0, NrjE4aBhzmU, sPhCwBND6oI, uNrz5v9p-zk, vEP99KxIYHk, Z2un1Yax_aQ) | branche e-commerce (`SaaS/Produit/Ecosysteme-Dropshipping-Sources-2026-09-25.md`) ; jugées sur leur titre et leur dossier, non relues |
| ZCC6uqwHxV4 (« influenceuse IA ») | hors sujet |
| `docs/connaissance-videos/presti/*` | les publicités de Presti elles-mêmes, pas des références |

---

## 4. @restructureai (TikTok, envoyé par Benj le 02/11) : ce qui est lisible sans compte

### 4.1 Ce qu'on lit sans compte (le 2026-11-02)

| Accès public | Ce qu'il rend |
|---|---|
| https://www.tiktok.com/@restructureai (WebFetch) | rien : la page est rendue en JavaScript (titre seul) |
| oEmbed du profil, `https://www.tiktok.com/oembed?url=https://www.tiktok.com/@restructureai` | titre « ReStructure AI's Creator Profile », auteur « ReStructure AI », type d'intégration « profile » |
| intégration du profil, `https://www.tiktok.com/embed/@restructureai`, lisible sans JavaScript | @restructureai, un bouton « Contact Us », **4 abonnements, 51,7 K abonnés, 272,1 K j'aime**, et les **10 dernières vidéos** : identifiant et compteur affiché (sans libellé, probablement les vues) ; aucune légende |
| intégration d'une vidéo, `https://www.tiktok.com/embed/v2/<id>` | légende, mots-dièse, son, j'aime, commentaires, partages ; lue pour 6 vidéos sur 10, les autres ont rendu **HTTP 429** (limite de débit de TikTok) |
| oEmbed d'une vidéo | identifiant seul, ni titre ni auteur |
| recherche sur le web (WebSearch) | aucune page TikTok de @restructureai indexée |

On n'a rien sur la durée, le texte parlé ou les images. Aucun outil interdit n'a servi (ni Firecrawl en ligne, ni Apify), aucun compte, aucun
cookie, aucune interaction.

### 4.2 Les 10 dernières vidéos (au 02/11/2026)

Dates tirées de l'identifiant TikTok : les 32 bits de poids fort donnent l'heure UNIX. Ce calcul retrouve exactement les dates des
analyses déjà faites (29/09, 30/10, 27/10, 01/10, 04/10, 12/08).

| Identifiant | Publiée (UTC) | Compteur affiché | Légende (telle quelle) | Mots-dièse |
|---|---|---|---|---|
| 7703401774446562581 | 02/11/2026 02:53 | 9 992 | « I Built a $25,000 AI Reputation Management System For Restaurants » | #techtok #claude #automatedsystem #automation #claudeautomation #systemdesign #system #designsystem · 488 j'aime, 4 commentaires, 61 partages |
| 7702667600089632007 | 31/10/2026 03:24 | 55,8 K | « This AI Social Media Team Replaces Your $25K Agency » | les mêmes, plus #higgsfield #restructureai · 2 534 j'aime, 36 commentaires, 674 partages |
| 7702288090131418374 | 30/10/2026 02:51 | 7 011 | « How an AI Marketing & Sales System Makes $10K/Month for Urgent Services » | les mêmes, plus #restructureai · 335 j'aime, 5 commentaires, 54 partages |
| 7701924045775801601 | 29/10/2026 03:18 | 16,8 K | « I Built a Private AI Operating System to Run Your Entire Business » | les mêmes, plus #restructureai · 912 j'aime, 18 commentaires, 173 partages |
| 7701546969398873352 | 28/10/2026 02:55 | 6 963 | « I Built an AI Deal Sourcing System for VC Firms » | #techtok #claude #automatedsystem #automation #claudeautomation #systemdesign #system #designsystem #restructureai · 301 j'aime, 5 commentaires, 39 partages |
| 7701176337448357172 | 27/10/2026 02:57 | 9 745 | non lue (HTTP 429) | — |
| 7700803999376755989 | 26/10/2026 02:52 | 33,1 K | non lue (HTTP 429) | — |
| 7699692280952720692 | 23/10/2026 02:58 | 15,8 K | non lue (HTTP 429) | — |
| 7699324388650323201 | 22/10/2026 03:10 | 9 396 | non lue (HTTP 429) | — |
| 7698948033576275220 | 21/10/2026 02:50 | 70,3 K | « I Built 32 Grok Bots That Run Your Entire Sales Department » | #techtok #GrokBot #AIAgents #Grok #claude · 2 950 j'aime, 54 commentaires, 989 partages |

Deux vidéos plus anciennes sont déjà dans le dépôt : le TikTok 7690784360898874645 du 29/09 (§3.2, sans audio) et le reel Instagram
DdscwJUROKo du 25/09 (§3.1, lu en entier).

### 4.3 Ce qu'on peut déjà en dire pour l'offre (par les seules légendes)

- **L'auteur publie presque chaque jour, vers 3 h UTC, des vidéos de « conception de systèmes »** : des systèmes d'agents pensés pour un
  type d'entreprise.
  - Un système d'exploitation privé pour toute l'entreprise (29/10).
  - Un service commercial de 32 bots (21/10).
  - Un système marketing et vente pour les services de dépannage (30/10), le plus proche des métiers d'artisan.
  - La gestion de la réputation des restaurants (02/11). Pour Presti, c'est l'équivalent de l'avis demandé après le chantier
    (`lib/apresChantier.ts:47-50`).
  - Une équipe réseaux sociaux (31/10), le même thème que le reel du 25/09.
  - La recherche d'affaires pour des fonds d'investissement (28/10), loin des métiers de Presti.
- **Rien, dans les légendes lues, ne nomme n8n.** Les mots-dièse disent Claude, `#claudeautomation` et `#systemdesign`. Seul le schéma du
  reel du 25/09 montre, au tri et au routage, un logo que la note du vault identifie comme n8n avec un point d'interrogation
  (`…Reel-2026-09-25.md:98-99`). Dire que ce compte « montre des workflows n8n » n'est donc pas encore établi.
- **Les vidéos à lire en premier pour l'offre** : 7701924045775801601, 7698948033576275220, 7702288090131418374, 7703401774446562581,
  puis les quatre légendes manquantes.
- **Les prix des légendes** (un système à 25 000 $, une agence à 25 K$, 10 K$ par mois) sont annoncés par l'auteur, non vérifiés. Ils ne
  servent jamais.

### 4.4 Ce qu'il faudrait pour les lire intégralement

1. La liste complète du compte : l'intégration ne montre que les 10 dernières vidéos, et le nombre total est inconnu.
2. Les quatre légendes manquantes : relire chaque intégration une par une, espacées de plusieurs minutes pour éviter le 429.
3. Pour chaque vidéo retenue : la vidéo publique, ses images (les schémas se lisent à l'image), et sa transcription locale.

Tout cela est décrit au §7. Rien n'a été téléchargé ici.

---

## 5. Où chaque leçon se branche dans le prompt 5

| Étape ou agent du prompt 5 | Leçon (source, horodatage) | Ce qui existe déjà chez Presti, ou dans le plan |
|---|---|---|
| Étape 0, demande de démo (p5:50) | un formulaire minimal, puis « ce qui se passe ensuite », en deux rendez-vous (RWKyUJLi-kI [00:18]-[00:21] ; k1adsrTHwPg [00:13]-[00:15]) | volet démo du C4 (C4:176-211) |
| Étape 1, préparation (p5:51) | connaître les trois douleurs du métier avant l'appel (RWKyUJLi-kI [01:30]) ; besoins probables du métier (O3A2xnBadFo [00:59]) | informations publiques seulement, chacune sourcée (p5:51) |
| Étape 2, découverte (p5:52, p5:98-107) | l'ordre des questions (O3A2xnBadFo [01:29]-[01:36]) ; le « claquement de doigts » [02:11] ; les outils et leur coût (RWKyUJLi-kI [03:35]) ; les chiffres lus dans l'outil [03:25] ; ce que l'éditeur laisse sortir (O3A2xnBadFo [02:35]) ; les modes opératoires écrits (k1adsrTHwPg [00:13]) | script en cinq temps (`ANALYSE-YOUTUBE.md:319-321`) ; fiche de cadrage en deux temps (C4:729-732) |
| Étape 3, cartographie (p5:53) | un problème à la fois, d'abord ce qui rapporte (O3A2xnBadFo [02:26]-[02:27]) ; ne pas refaire tout le métier [02:10] ; le type de valeur de chaque irritant (ip4IHi1ZfhA [00:09]-[00:12]) | — |
| Étape 4, proposition (p5:54) | ce qui est construit, le calendrier, le coût (O3A2xnBadFo [02:09]) ; deux options réelles (k1adsrTHwPg [00:14]) ; le devis envoyé avant puis revu ligne à ligne (RWKyUJLi-kI [00:34]) ; le résumé avant le prix [03:44] ; la fourchette [04:00] ; **le prix, c'est Benj** | brique d'entrée, aucune étape sans prix (C4:727-728) ; question 6 d (C4:240) |
| Étape 5, accord écrit (p5:55) | un contrat court, signé en ligne (O3A2xnBadFo [00:22]-[00:23]) | annexe d'autonomie, contrat de sous-traitance RGPD article 28 (p5:260) |
| Étape 6, construction à blanc (p5:56) | le formulaire en deux temps (RWKyUJLi-kI [01:41]-[01:42]) ; les procédures comme compétences écrites (realbastianvolkis, 108,7-173,2 s) | procédures stockées dans le compte du client, sous RLS (C4:733-735) |
| Étape 7, mise en service (p5:57) | un centre de commande pour approuver (RWKyUJLi-kI [01:43]) ; 48 heures d'accueil [01:49] | boîte « À valider » (`lib/assistant/cartes.ts:15-18`) ; pilote : 10 minutes pour annuler, 20 envois par jour (`lib/pilote/regles.ts:27`, `:30`) |
| Étape 8, exploitation (p5:58) | le bilan à un mois (O3A2xnBadFo [04:41]-[04:42]) ; une proposition écartée ne revient pas (sambutlerai, 30,2-38,4 s) ; le débrief mensuel (ip4IHi1ZfhA [00:40]) | C4:70-71 (rang 8) ; C4:742 |
| Orchestrateur (p5:176) | un cerveau qui trie, route et vérifie, et ne décide pas de l'argent (reel de restructureai, `…Reel-2026-09-25.md:65-68`, `:97-101`) | — |
| Conformité (p5:194) | une règle ou un classifieur avant tout modèle, sur chaque sortie (O3A2xnBadFo [03:31]-[03:32]) | gestes jamais automatiques (`lib/pilote/regles.ts:72-76`) |
| Qualification (p5:189) | des règles d'abord ; un modèle local seulement avec un corpus relu (ray_fu) | — |
| Relance (p5:190) | jusqu'au paiement ou jusqu'au motif (angelotturri, 38,0-51,8 s) | registre commun des relances, 3 jours (`lib/relancesRegistre.ts:18`) ; rang 1 (C4:56-57) |
| Rédaction (p5:191) | un échantillon de destinataires validé, avec les exclusions (O3A2xnBadFo [02:39]) | carte de lot (C4:62-63) |
| Alerte (p5:192) | un workflow en panne signalé à Benj (O3A2xnBadFo [03:30]) ; une liste fermée d'interruptions (reel, `…Reel-2026-09-25.md:144-152`) ; le coût affiché (trevsagents) | `lib/agents/telegram.ts:32` |
| Reporting (p5:193) | une page qui propose sans agir ; l'argent, pas l'activité (reel, 1:05-1:16 ; TikTok du 29/09) | le briefing est calculé par le code, et le modèle ne compte rien (`lib/assistant/briefing.ts:5-6`) |
| Agents propres au client (p5:196) | la pièce manquante (RWKyUJLi-kI [01:40]-[01:41]) ; l'après-chantier (angelotturri, 58,1-82,7 s) ; la facturation au prorata (O3A2xnBadFo [02:11]-[02:12]) | `lib/apresChantier.ts:47-50` |
| KPIs de ROI (p5:292-301) | une base de départ lue dans l'outil (RWKyUJLi-kI [03:25]) ; jamais de garantie (realbastianvolkis, 6,6-17,0 s, à rejeter) | — |

---

## 6. Sources manquantes ou partielles

| Source | Ce qui manque | Ce que ça empêche |
|---|---|---|
| O3A2xnBadFo, RWKyUJLi-kI, k1adsrTHwPg | **les images** : planches aux seuls changements de scène, pour 18 segments sur 26, 10 sur 21 et 7 sur 8 (`youtube/segments/index.tsv`) ; le texte des écrans partagés est illisible ; la planche de O3A2xnBadFo s09 existe mais n'a pas été vue | lire les documents montrés : le guide « High-Ticket Sales Framework » [01:18]-[01:24], le portail client de RWKyUJLi-kI [01:27], les pages de tarifs [03:24]-[03:34]. La méthode de vente n'est connue que par la parole |
| les trois mêmes cours | **la date de publication** (ni l'oEmbed ni la page ne la donnent, le 02/11) ; les sous-titres sont automatiques et non corrigés | dater les méthodes ; certaines phrases sont mal reconnues (« pure any end automations » à k1adsrTHwPg [00:04] ; « Jeff » à O3A2xnBadFo [03:31]) |
| k1adsrTHwPg | la piste de sous-titres `en`, en échec HTTP 429 le 01/11 ; seule `en-orig` existe (`recuperer.log`) | rien de notable : c'est la même reconnaissance automatique |
| ip4IHi1ZfhA | une lecture complète : deux passages seulement, et un balayage par mots-clés | la fiche §3.4 ne couvre pas la méthode de vente ni les autres « étapes » de la vidéo |
| milesreevesai, ray_fu (×2), tonytuyisenge | **l'audio** : aucune transcription, reconnaissance de caractères sur 8 à 10 images (`docs/connaissance-videos/*.analyse.md`) | citer leur méthode avec certitude ; leurs fiches restent « à recouper » |
| restructureai, TikTok du 29/09 | **l'audio** (pas de transcription, `…restructureai-7690784360898874645.analyse.md:3`) | savoir ce qui est dit des agents, de l'approbation et du rapport |
| restructureai, profil | **la liste complète** (l'intégration n'en montre que 10) ; **4 légendes sur 10** (HTTP 429) ; **aucune vidéo téléchargée, aucune transcription, aucune image** | toute fiche de contenu sur les 10 vidéos récentes ; dire lesquelles montrent n8n ; relever leurs schémas d'agents |
| les 10 vidéos YouTube e-commerce et JBIuZCw74FI, pPoR_0FHl-U | une analyse : seules les métadonnées et les transcriptions existent | rien pour l'offre, d'après leurs titres et leur dossier ; à relire seulement si Benj le demande |

---

## 7. Tâche de transcription à prévoir (proposition : la session principale la dépose dans `.orchestre/file/` après l'accord de Benj)

**Ce qu'il faut lire.**
- Étape 1, la liste complète du compte (métadonnées seules).
- Étape 2, les **10 vidéos récentes** du tableau §4.2, plus la piste audio du TikTok du 29/09, soit **11 vidéos**. Les vidéos connues durent
  83 et 89 s.
- Étape 3, au plus **20 vidéos plus anciennes**, choisies dans la liste sur leur légende : n8n, agents, automatisation, système, entreprise,
  ventes, CRM, système d'exploitation.

**Avec quoi.** La chaîne du pipeline B du 01/11 (`videos/references-2026-11-01/recuperer.sh`), déjà installée sur le PC (relevé du 02/11) :
- **yt-dlp 2026.08.19**, qui a téléchargé les 10 TikToks du 01/11 sans compte (`recuperer.log`) ;
- **ffmpeg 8.1.1**, pour la planche et les images ;
- **faster-whisper 1.2.1**, modèle `small` en int8 sur le processeur, avec filtre de silence.

On y ajoute, pour ces vidéos de schémas, **une image par seconde** : le reel du 25/09 a demandé 94 images pour 83 s
(`…Reel-2026-09-25.md:5`). Puis la lecture du texte des schémas par un modèle de vision local, que Claude Code recoupe. L'analyste de
l'« usine » (`scripts/usine/analyse-video.mjs`, 06/10) ne transcrit pas l'audio : il ne suffit pas.

**Où.** Sur le PC, dans `videos/references-2026-11-02/restructureai/`, hors git pour les MP4.
- Le 02/11, le disque C: a 57 Go libres.
- Une vidéo à la fois, et jamais plus de deux agents en même temps sur ce PC de 8 Go
  (`memoire-presti/pc-plante-surcharge-agents-0211.md`).
- Oracle seulement après un `df -h` sous 85 % (p5:359).
- Les fichiers téléchargés sont des données non sûres, rangées dans leur propre dossier.

**Qui.** Hermes, par une tâche de la file : c'est du volume (annexe 2 du prompt, p5:410). Claude Code écrit le vérificateur, puis le
verdict, et la colonne « ce qui s'applique à Presti », qui demande du jugement. Le contenu ne porte aucune donnée de client ; aucun modèle
gratuit en ligne n'est utile pour autant.

**Gardes.**
- Contenu public seulement : aucun compte, aucun cookie, aucun commentaire « blueprint », aucun abonnement, aucun message.
- Rien n'est republié.
- La note de vault passe par une tâche de périmètre `SaaS/…`.

En-tête proposé, au format de `.orchestre/file/` (identifiant à attribuer) :

```yaml
---
id: 0NN-NNN
type: analyse
objectif: Lire intégralement les vidéos publiques de @restructureai sur les systèmes d'agents (liste, téléchargement public, images une par seconde, transcription locale faster-whisper small) et rendre une fiche par vidéo au format du prompt 5, pour l'offre Entreprise.
perimetre: [videos/references-2026-11-02/restructureai/**, .orchestre/preuves/0NN-NNN/**]
interdit: [app/**, lib/**, supabase/**, scripts/**, ../SaaS/**, .orchestre/file/**, tout compte ou cookie TikTok et Instagram, tout envoi ou commentaire, tout modèle en ligne payant]
verifier: node scripts/fiches-videos-qa.mjs videos/references-2026-11-02/restructureai
budget: { fichiers: 80, minutes: 120 }
preuve: liste.json (identifiant, date tirée de l'identifiant, légende, durée), puis par vidéo <id>.mp4 (hors git), <id>.planche.jpg, images/<id>-<s>.jpg, <id>.transcription.txt, <id>.fiche.json ; sortie de verifier dans .orchestre/preuves/0NN-NNN/verifier.log
executant: hermes
---
```

**Le vérificateur est à écrire par Claude Code** : `scripts/fiches-videos-qa.mjs` n'existe pas au 02/11. Il doit rougir quand :
- une vidéo de `liste.json` n'a pas sa transcription, ou en a une vide sans le motif « sans parole » ;
- une fiche JSON sort du schéma du prompt 5 (les huit champs) ;
- un horodatage cité tombe hors de la durée ;
- un chiffre n'est pas marqué « annoncé par l'auteur, non vérifié » ;
- une phrase de plus de 15 mots est recopiée de la transcription.

Il prouve sa mutation : une transcription retirée doit le faire rougir.

**Ordre de grandeur, à mesurer au premier passage.** Pour 11 vidéos de 1 à 2 min : quelques secondes de téléchargement chacune, puis une à
deux minutes de transcription sur le processeur, puis l'extraction des images. Le premier passage mesure le temps réel, et le budget se
corrige ensuite.
