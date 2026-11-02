# Chantier 2 — Landing prestiapp.fr : diagnostic, trois directions, structure (plan à approuver)

Rédigé le 01/11/2026 selon le prompt 4 de Benj (`prompts-benj/p4-landing.md`) : « Ne génère pas le code complet avant mon choix
de direction. » Rien n'est construit avant son choix.

## 0. Décision de Benj (02/11/2026, matin) — elle prime sur la suite

- **Direction A avec le hero de B** : la v2 « Cinéma », avec l'écran réel de Presti animé en accroche.
- **Structure imposée du prompt 4, à la lettre** (« respecte bien ce que les prompts ont dit et les structures et les consignes
  données », « éviter la friction, aller au simple et à l'essentiel ») : 7 sections, dans l'ordre du prompt
  (`prompts-benj/p4-landing.md:33-103`) :
  1. Hero, avec « Essayer Presti » et « Presti pour l'entreprise » ;
  2. Problème ;
  3. Comment ça marche ;
  4. Fonctionnalités essentielles ;
  5. Pour qui ;
  6. Presti pour l'entreprise, avec son texte exact, sans prix ;
  7. CTA final, avec « Créer mon compte » et « Demander une démo entreprise ».
  Le §3 ci-dessous ajoutait « Confiance » et « Tarifs » sur la page et fusionnait Problème et Fonctionnalités : c'est corrigé. Tarifs,
  confiance, comparatif et maquette passent en pages secondaires (livrable 10 du prompt).
- Règle n8n-first : la landing est de l'interface. Toute automatisation qu'elle déclenche (demande de démo, maquette) passe par n8n.

## 0 bis. Ce que les vidéos changent (02/11 midi)

Sources : la synthèse C2 des 13 vidéos (19 exigences retenues, 12 écartées, 8 conflits) et sa critique de complétude (17 manques), du
02/11 (`…/scratchpad/videos-syntheses/`), relues contre `plans/analyse-videos.md` (cité « :ligne »), le §0, le prompt 4 et le code.
Lignes de code : HEAD `372048ca`, identique à `a51a12a8` pour `app/`, `lib/` et `supabase/` ; « (arbre) » : modifié, non commité ;
`refonte-1018:` : la branche de la v2. Ici, « HEAD » désigne toujours `372048ca` : le commit des lots L1 et L2 du chantier 4
(`74db706a`, 02/11 à 15 h 08) a décalé des lignes depuis. Le plan du chantier 4, amendé le même jour (son §0 bis), porte avec ce plan
le volet démo Entreprise, la règle du vert et la ligne « Vos données » ; seuls le texte « Ce qui se passe ensuite » et la ligne « Vos
données » sont repris mot pour mot dans les deux plans. Le prompt 4 prime sur les vidéos (§0 : « respecte bien ce que les prompts ont
dit »). Par délégation de Benj, le défaut de chaque question s'applique, et la question reste listée pour lui (tableau en fin de
section). Le §0 prime sur tout ; ce §0 bis prime sur les §1 à §5 là où ils diffèrent.

**Les exigences retenues**, dans l'ordre de la synthèse (sources de `plans/analyse-videos.md` ; → la section de la page, de 1 à 7, ou la
page secondaire qui la porte) :

1. **Le `h1` : une seule phrase de valeur ; la sous-phrase, courte, dessous** (`p4-landing.md:39-40` ; :111, :212, :1520 ; critique 10).
   La sous-phrase dit ce qu'est Presti et ce que fait chaque offre (`p4-landing.md:23`, `:246`) ; ni l'une ni l'autre ne porte de jargon
   ou de chiffre (critique 9). Claude Code les écrit, Benj les valide avant le code (`p4-landing.md:308`) ; title et meta description les
   reprennent (`:136`). → section 1 ; question 1.
2. **Une seule action principale** (:114, :202, :265 ; `p4-landing.md:326`). Libellés imposés (`p4-landing.md:41-42`, `:95`, `:102-103`) :
   seuls « Essayer Presti » et « Créer mon compte » sont pleins, vers `/signup` ; « Presti pour l'entreprise » (vers la section 6),
   « Demander une démo » (section 6) et « Demander une démo entreprise » (section 7) sont des boutons à contour. « Essayer gratuitement »
   sort (§3 ; `refonte-1018:app/landing/LandingV2.tsx:175-176`). → sections 1, 6 et 7.
3. **Le produit au travail dès la première image** (:364, :956, :1071, :1079, :1187). L'état servi montre déjà un résultat
   (`app/HeroApp.tsx:15-18`), puis la démo rejoue : demande, réponse préparée, devis, **relance préparée**, facture (critique 8 : vrai dans
   les deux offres, `lib/relances.ts:7`, `lib/plans.ts:226` ; « part seule » seulement avec « Signature »). Une légende par geste, aucune
   durée, jamais un écran filmé. Sous la réponse, « Presti » nomme l'état vu par l'artisan, jamais l'expéditeur (`app/HeroApp.tsx:79` ;
   marque blanche, `lib/email.ts:2-4`). → section 1.
4. **Sous chaque bouton plein, une ligne vraie** (:1181, :1220, :272) : « Essai gratuit, sans carte bancaire, sans engagement. »
   (`lib/essaiGratuit.ts:5-9`, `lib/faq.ts:12`). Une durée ne s'écrit qu'avec son offre, lue dans `ESSAI_JOURS` (`lib/plans.ts:108`) ; ni
   urgence ni prix. → sections 1 et 7 ; question 3.
5. **« Exemple » sur toute donnée fictive** (:117, :67, :969, :1083, :1193 ; `p4-landing.md:255`). La fenêtre du hero montre « Marie » et
   un devis chiffré sans le dire (`app/HeroApp.tsx:77`, `:84-87`) : elle reçoit une puce « Exemple », lisible sans survol. Ni logo tiers,
   ni témoignage, ni compteur, ni tuile à zéro (`p4-landing.md:254`). → sections 1, 3 et 4 ; défaut en ligne : question 9.
6. **La scène 8 ne promet pas « combien il vous rapporte »** (:1194, :1219) : « … et sa marge sur matériaux, estimée », comme l'écran
   (`app/DemoSequence.tsx:37`, `refonte-1018:lib/demoScenes.ts:29` ; `app/crm/Indicateurs.tsx:29` ; `lib/crm/chantier.ts:58-61`).
   → section 4 ; défaut en ligne : question 9.
7. **Le hero se lit sans script** (:1187, :1188, :1072) : le `h1` entier dans le HTML servi, rien en `opacity:0` jusqu'à l'hydratation,
   aucun WebGL (`p4-landing.md:301`) ; en 390 px, texte et bouton au-dessus, démo dessous, sans chevauchement. → section 1.
8. **Les douleurs, puis les fonctionnalités** (:115, :486, :522, :874, :895). Section 2 : un titre et trois cartes « avant » sur les douleurs
   imposées (`p4-landing.md:56-58`), sans chiffre ; la seule ligne chiffrée de la page est l'étude HBR, source affichée
   (`plans/promesses.md:30` ; `app/page.tsx:224-227`, arbre), sans la phrase « en moins d'une minute » qui la suit aujourd'hui (l.226).
   Section 4 : les six cartes imposées (`p4-landing.md:72-77`), « ce qui coince, ce que Presti fait, ce que vous y gagnez », dans l'ordre
   de la chaîne. → sections 2 et 4.
9. **Une frise de trois pastilles** (:957, :982, :996-997), avec le texte du prompt mot pour mot (`p4-landing.md:64-66` ; question 6). La
   demande de l'étape 1 se tape à l'écran, marquée « Exemple ». Seule l'étape 3 devient verte, au clic : la vidéo coche chaque étape (:982),
   la charte l'emporte. Le clic vaut pour les deux offres : un devis préparé après la lecture d'une demande ne part jamais seul
   (`lib/pilote/regles.ts:123`, `:129-132`). → section 3.
10. **Rien que ce qui existe, avec son offre** (:967, :1404, :1494-1495). Chaque carte porte son offre minimale (`lib/plans.ts:139`).
    « Documents centralisés » dit ce qu'on y trouve : les PDF des devis et des factures, les pièces du chantier (Signature), les fichiers
    de « Mes chiffres ». Aucun contrat d'entretien (`lib/apresChantier.ts:1-12`). L'assistant est « Dès Studio » (`app/DemoSequence.tsx:33`),
    pas « Avec Signature » (`refonte-1018:lib/demoScenes.ts:25`). → section 4.
11. **« Demander une démo » mène à une page qui dit la suite** (:116, :39, :202, :267) : `/contact`, au motif « entreprise », défaut du
    prompt (`p4-landing.md:291` ; question 4). On y trouve, dans l'ordre, le texte imposé « Ce qui se passe ensuite », un formulaire
    court, puis trois réponses de décideur : vos données, vos outils, le prix. Après l'envoi, la confirmation reprend « Ce qui se passe
    ensuite ». Détail : volet Entreprise, plus bas. → `/contact`, depuis les sections 6 et 7.
12. **Chaque demande rangée et suivie par n8n** (:116, :129, :1443) : couche du chantier 4 (L19), hors de ce plan (volet plus bas ;
    question 5). → aucune section.
13. **Les tests refusent ce que font ces vidéos** (:65-67, :229-233, :374-379, :873-875, :968, :1295-1300, :1403) : la liste est au §5. → §5.
14. **Un seul accent, le corail ; le vert réservé** (:703, :964, :1237, :875, :1301, :1402) : ni bleu, ni cyan, ni violet ; les annotations
    au corail `#D97757` ; le vert suit la règle plus bas ; son jeton : question 8. → toute la page.
15. **Les objections, d'avance, sans section de plus** (:90, :113, :1181, :1220). Sur `/faq` (9 questions, `lib/faq.ts:4-12`) : la mise en
    route, la peur de l'informatique et l'offre Entreprise, d'après la note du vault « Les objections des artisans et ce qui y répond » et
    le guide de démarchage (§8), aux prix de `lib/plans.ts` (le guide cite encore 29 €, l.151-152). Benj valide chaque réponse. → `/faq` ;
    sections 1 et 7.
16. **`/offres` : Studio en entrée, Signature en palier, Entreprise sur démonstration et sur devis** (:270, :271, :409, :1524). Prix et essais
    lus dans `lib/plans.ts` (`OFFRES`, l.151 ; `ESSAI_JOURS`, l.108) ; l'Essentiel nulle part (la v2 le nomme deux fois,
    `refonte-1018:app/landing/LandingV2.tsx:173`, `:215`) ; ni prix barré ni remise. L'accueil n'affiche aucun prix. → `/offres`.
17. **Mesurer chaque étape du parcours** (:51, :53, :54, :1529) : vues de `/`, puis de `/signup`, comptes créés, demandes de démo. On juge
    sur 30 jours, avant et après la levée du drapeau ; on change le texte avant la couleur. → lot 10 du §5.
18. **Une page par métier, plus tard, une seule d'abord** (:112, :171, :268, :130 ; :213 parle de niveaux de client, pas de métier) : le
    métier de la première campagne du chantier 3, choisi par Benj ; les mots de `lib/ai/metiers.ts:40-96` ; aucune douleur inventée.
    → page secondaire, liée depuis la section 5.
19. **L'offre Entreprise dite comme une mise en place** (:817) : sous le texte imposé, trois lignes (vos données reprises, vos façons de
    faire branchées sur vos outils, ce qui part seul convenu avec vous), soumises à Benj ; aucun écran d'équipe (`p4-landing.md:256`) ;
    « moteur » seulement une fois prouvé (plan du chantier 4, §0 bis, rang 15). → bloc de démo de `/contact`.

**L'omission de la synthèse** (critique 13) : le bouton « diagnostic gratuit de votre gestion » (:408) est écarté, car les libellés des
boutons sont imposés (`p4-landing.md:41-42`, `:95`, `:102-103`). Les deux autres omissions (devis en étapes, espace client des clients de
l'artisan) relèvent du chantier 4 (son §0 bis et sa question 11).

**Écartées** (une ligne chacune) :
- Vidéo de présentation de 4 à 6 minutes : « à tester », sans preuve (:114) ; l'accueil se comprend en 10 s (`p4-landing.md:9`) ; toute vidéo relève du chantier 5.
- Calculateur où l'artisan entre ses chiffres : c'est la direction C, non retenue (§0).
- Atelier 3D en premier écran (:1111) : contraire au hero de B et à « pas de WebGL au chargement » (`p4-landing.md:301`).
- Une entrée et des sorties en éventail (:1324) : quatre objets 3D, hors direction A ; c'est un angle du chantier 5 (:1548).
- Répondre à « j'en parle à mon associé » : l'analyse ne cite pas cette objection.
- Menu réduit à la connexion et à l'essai : « à tester » (`O3A2xnBadFo/s04.json` [00:38]) ; les pages secondaires doivent rester atteignables.
- Le prix réel face à la « fuite » (:115) : les tarifs quittent l'accueil (§0).
- La demande de démo dans la file de `MaquetteForm` : sa route exige métier, commune et site (`app/api/prospects/entrant/route.ts:19-25`).
- « Ensuite, la relance et la facture sont prévues » en section 3 : du texte en plus des étapes imposées, et « prévues » n'est pas vrai partout (`lib/aide.ts:232`).
- Une ligne « Vos données » d'après RWKyUJLi-kI [01:22] : la source parle de garde-fous à livrer (:296), pas d'un message de page.
- « La même infrastructure, ses procédures à lui » : vidéo jugée hors sujet pour la landing (:627-630) ; l'idée revient au rang 19 (:817).
- La part du chantier 4 des exigences communes (catalogue des moteurs, procédures, détecteurs, entretien) : au plan du chantier 4.

**Volet « démo Entreprise » : un propriétaire par couche** (partage fixé le 02/11 midi par la session principale ; critique 2 et 7 ; le même
au plan du chantier 4, §0 bis) :
- **Chantier 2, l'interface** : la page de démo (défaut du prompt : `/contact` au motif « entreprise », `p4-landing.md:291` ; `/entreprise`
  si Benj la choisit, question 4) et son formulaire, derrière le drapeau `landingV2`. Le motif se lit dans le navigateur, jamais par le
  serveur : `/contact` reste statique (`cadrage-p4.md:164`). La route `/api/contact` ne change pas au chantier 2 : le navigateur compose le
  message à partir des choix (« [Démo entreprise] Équipe : 2 à 5 · activité : architecte »), ce qui tient ses gardes (10 caractères au moins,
  champ piège, 3 envois par heure : `app/api/contact/route.ts:37-39`, `:47`, `:51`). Le formulaire envoie aussi motif, taille et activité
  comme champs séparés ; la route actuelle les ignore (elle ne lit que `societe`, `nom`, `email` et `message` :
  `app/api/contact/route.ts:37-44`), et L19 les rangera. Champs : prénom et e-mail, obligatoires, choix du plan, au plus simple ; taille de
  l'équipe (1, 2 à 5, 6 à 20, plus de 20) et activité (artisan, entreprise du bâtiment, architecte, autre), les deux questions filtrantes
  (:267) ; message facultatif. Pas de téléphone. « Outils en place » n'entre pas au formulaire : on en parle au premier échange, et la
  fiche de cadrage le détaille après la signature (:295 ; chantier 4, §12.1). Pour une équipe de 1, une ligne propose « Essayer Presti »,
  sans bloquer l'envoi (:207, :352). Sous le formulaire, trois réponses de décideur : vos données (ligne ci-dessous), vos outils (« nous
  l'intégrons pour vous », `p4-landing.md:291`), le prix (sur devis, sans prix public). Jamais « test d'intrusion » ni certification.
- **Chantier 4, les données et l'automatisation** : la table `demandes_demo`, le workflow `presti-demande-demo`, la liste des demandes dans
  `/controle` et la migration de `notifierEntreprise` (`app/api/contact/route.ts:56`) en cinq pas (son lot L19, migration au « go » écrit
  de Benj). C'est ce lot qui ajoutera l'écriture en table à la route. D'ici là, et tant que la liste de `/controle` n'existe pas, l'e-mail
  actuel reste le chemin en production. Aucun lot du chantier 2 n'y touche.
- **« Ce qui se passe ensuite »** : le texte unique, écrit au plan du chantier 4 (`chantier-4-assistant-plan.md:190-193`), repris ici mot
  pour mot. La page l'affiche au-dessus du formulaire, puis dans la confirmation après l'envoi ; l'e-mail de n8n le reprend :

  > **Ce qui se passe ensuite**
  > 1. Un premier échange : nous vous posons quelques questions sur votre équipe, vos outils et les tâches qui vous prennent du temps.
  > 2. Un second rendez-vous : une démonstration sur vos propres cas, puis une proposition sur devis.
  > 3. Vous décidez librement.

  Dans le code, il vit en un seul endroit, que la page lit ; la suite du chantier 4 (`demande-demo-qa`) compare l'e-mail de n8n à ce texte.
  Aucun délai tant que Benj ne le tient pas (question 7).
- **« Vos données », sans aucune marque** (critique 2) : la ligne du chantier 4, mot pour mot,
  « La base de données et les photos sont hébergées dans l'Union européenne », toujours suivie du lien vers `/confidentialite`. La source
  ne situe dans l'Union que la base et les photos (`app/confidentialite/page.tsx:59`) ; l'application et trois prestataires sont aux
  États-Unis, sous clauses types (l.60-63, `:65`) : la ligne ne paraît jamais sans ce lien. Jamais « Supabase » ni « eu-central-1 » sur
  une page publique hors des pages légales (`p4-landing.md:49`, `:297`). La source de l'étude HBR (« Source : Harvard Business Review… »,
  `app/page.tsx:227`, arbre ; `plans/promesses.md:30`) reste sous la ligne chiffrée : c'est le défaut de la question 11.

**n8n-first** (ADR-008 ; `.claude/rules/architecture-outils.md`) : ce chantier ne code aucune automatisation. La page, le formulaire et la
mesure des vues sont de l'interface. Le suivi des demandes de démo (chantier 4, L19) et le bilan hebdomadaire du parcours
(`presti-bilan-landing`, lot 10 du §5) sont des workflows du n8n d'Oracle, livrés inactifs et essayés à blanc, qui ne lisent que ce qu'il
leur faut (règles communes du plan du chantier 4, §0 bis). `notifierEntreprise`, déjà en production, ne change pas ici : il migre au
chantier 4. Aucune exception à écrire.

**Règle du vert, une seule** (fixée le 02/11 midi par la session principale, sur la charte : `p4-landing.md:232`, `:281` ; critique 15 ; la
même au plan du chantier 4, §0 bis). Le vert ne marque qu'un état « validé » ou « payé ». Une étape de mise en route validée d'un geste de
l'artisan est un « validé ». Dans la frise de la landing, seule l'étape « Tu valides et envoies » est verte, au clic ; les étapes 1 et 2
sont au corail. Le badge « PDF conforme » (`app/HeroApp.tsx:88` ; `app/globals.css:1049-1050`) passe au corail ; les pastilles vertes des
puces (`app/globals.css:1264`) partent avec les puces (`cadrage-p4.md:140`). Le jeton : question 8. La règle s'écrit dans `presti-design`,
par la tâche 5 du chantier 4 (un seul auteur).

**Questions à Benj, défaut appliqué** (les 8 conflits de la synthèse, deux points de la critique, puis un point de la contre-vérification).
« Prompt » : le défaut vient du prompt 4, qui prime. « Proposé » : le prompt ne tranche pas ; défaut au plus simple.

| # | Question | Défaut appliqué | S'il dit autre chose |
|---|---|---|---|
| 1 | **Le `h1`** (conflit 1). Une des deux promesses du prompt (`p4-landing.md:27`, `:31`), ou la phrase de A (§4, question 2) ? Les vidéos veulent un résultat, sans jargon (:111, :212). La première promesse promet « en quelques minutes » sans preuve, et « Laissez l'IA gérer les relances », vrai seulement en Signature (`cadrage-p4.md:160`) ; la phrase de A affirme la vitesse sans source (:487) | Prompt : sa seconde promesse, en une phrase, « Votre gestion d'artisan, simplifiée par l'IA. » (`p4-landing.md:31`), la seule des deux qui tient ses propres règles (`:50`, `:124`). La sous-phrase s'écrit au lot 4. La phrase de A peut ouvrir la section 2, au-dessus de la ligne HBR | Phrase de A : elle devient le `h1`, sans chiffre, avec la ligne HBR juste dessous pour source. Première promesse : réécrite en une phrase, sans durée, les relances dites « Signature » |
| 2 | **« Rien ne part sans vous »** (conflit 2 ; critique 17). C'est l'accroche de Studio (`lib/plans.ts:98`, `:206`) ; `lib/faq.ts:4` et l'accueil actuel disent « rien ne part sans votre clic » (`app/page.tsx:237`, arbre). Or l'accusé de réception part seul, au nom de l'artisan, même en mode manuel (`app/api/leads/route.ts:393`). Le guide de démarchage interdit la phrase au §4 (l.68) et donne la formule de remplacement au §8 (l.153). Elle traduit votre phrase du 25/10, « il faut valider, sinon ça ne s'envoie pas » (`lib/plans.ts:11`) | Proposé : la nouvelle page ne l'écrit jamais. Là où il le faut : « Avec Studio, aucune réponse au fond ne part sans votre clic ; seul l'accusé de réception est automatique » (guide, §4, l.68). La même correction de `lib/plans.ts:98`, `:206` et de `lib/faq.ts:4` est préparée par la session principale (argent) ; elle ne part qu'avec le « oui » de la levée | « Garder » : la phrase n'est vraie que si l'accusé de réception cesse de partir seul (changement du produit) ; la correction préparée est abandonnée |
| 3 | **Ce que lance « Essayer Presti »** (conflit 3) : l'offre Essai, 3 crédits, sans la plateforme de conversation (`refonte-1018:app/landing/LandingV2.tsx:282`), ou l'essai de Studio, 7 jours sans carte (`lib/plans.ts:108`) ? La v2 dit « 3 crédits offerts » en haut (l.178) et « 3 devis offerts » en bas (l.343) ; la question V2 est ouverte (`cadrage-00-synthese.md:104`) | Proposé : `/signup`, comme aujourd'hui, sans toucher au tunnel. Dessous, la ligne du rang 4, vraie dans les deux cas. Les crédits ne se disent que sur `/offres`, alignés sur `lib/plans.ts` (défaut de V2). Chaque démo porte son offre | Essai de Studio : le bouton ouvre cet essai, et la ligne dit sa durée, lue dans `ESSAI_JOURS` |
| 4 | **Où mène « Demander une démo »** (conflit 4 ; critique 7). Le prompt : `/contact` au motif « entreprise », ou `MaquetteForm` (`p4-landing.md:291`). Le cadrage : une page statique `/entreprise`, car un paramètre lu par le serveur rendrait `/contact` dynamique (`cadrage-p4.md:164`). Les vidéos : une page qui dit la suite (:116, :202) | Prompt : `/contact`, au motif « entreprise », lu dans le navigateur (preuve : le build garde `/contact` statique). `MaquetteForm` est écarté : sa route exige métier, commune et site | `/entreprise` : le même bloc et le même formulaire sur une page statique neuve, ajoutée à `PAGES_MESUREES` (`lib/audience.ts:17`) et au plan du site |
| 5 | **La table des demandes dans ce chantier ?** (conflit 5). n8n-first (ADR-008) range l'avis de demande de démo dans n8n : il faut une table, donc une migration ; le cadrage du 01/11 prévoyait zéro migration (`cadrage-p4.md:164`, `:234`) | Proposé (partage du 02/11 midi) : non. La table et `presti-demande-demo` sont au chantier 4 (L19), au « go » écrit de Benj ; d'ici là, l'e-mail actuel reste (`migration-production.md`) | « Avec la landing » : L19 passe avant la levée du drapeau ; la migration attend toujours son « go » |
| 6 | **Tu ou vous ?** (conflit 6). Les trois étapes du prompt tutoient (`p4-landing.md:64-66`) ; le site vouvoie (`cadrage-p4.md:161`) | Prompt, à la lettre : les trois étapes gardent leur texte, tutoiement compris ; le reste de la page vouvoie, comme le bloc 6 du prompt (`p4-landing.md:92-93`), la FAQ et les e-mails | « Vous » partout : « Décrivez le chantier ou envoyez votre demande », « Presti prépare le devis », « Vous validez et envoyez ». « Tu » partout : toute la page, la FAQ et `/offres` |
| 7 | **« Sous 24 h »** (conflit 7) : « en général sous 24 h » (`app/contact/Formulaire.tsx:30`) et « la réponse arrive sous 24 h » (`app/contact/page.tsx:9`). Rien ne mesure ce délai. Le tenez-vous ? | Prompt (zéro promesse non vérifiable, `p4-landing.md:124`) : aucun délai dans ce que ce chantier écrit, motif « entreprise » compris. Les deux phrases actuelles restent jusqu'à la réponse (changement public) | « Je le tiens » : elles restent, et le bloc de démo peut le dire. « Non » : elles partent, au lot 6 |
| 8 | **Quel vert ?** (conflit 8). La charte dit `#38CD8C` (`p4-landing.md:232`, `:281`). La landing actuelle redéfinit `--ok:#46C89A` (`app/globals.css:952` ; `.claude/skills/presti-design/SKILL.md:70`) ; le socle garde `#38CD8C` (même fichier, l.54) | Prompt : `#38CD8C`. La nouvelle page lit le `--ok` du socle sans le redéfinir ; le test vise le jeton et sa valeur ; l'ancienne page garde le sien jusqu'à la levée | `#46C89A` : la nouvelle page le garde, le test l'accepte, et `presti-design` l'écrit |
| 9 | **Trois défauts déjà en ligne** (rangs 5 et 6 ; critique 9) : la scène 8 promet « combien il vous rapporte » (`app/DemoSequence.tsx:37`) ; la fenêtre du hero montre « Marie » et des montants sans « Exemple » (`app/HeroApp.tsx:77-88`) ; « en moins d'une minute » s'affiche sans mesure (`app/page.tsx:187-188`, `:213`, `:226`, arbre ; `lib/faq.ts:4`). Les corriger avant la nouvelle page ? | Proposé : les corrections sont prêtes sur la branche (lot 2) et partent avec la levée. Rien de public ne change avant un « oui » | « Tout de suite » : le commit du lot 2 part seul sur `main`, build vert, déploiement vérifié |
| 10 | **Le chiffre du hero** (critique 9). « Réponse prête en moins d'une minute » s'appuie sur `plans/promesses.md:8`, qui rejoue `pilotage-e2e` : cette suite ne mesure aucune durée. La seule mesure est la médiane par artisan (`lib/platStats.ts:5`, `:45`), et le juge PR-1 (`scripts/promesses-qa.mjs:22-24`) n'est joué par personne | Prompt (aucun chiffre sans source, `p4-landing.md:124`, `:254`) : aucun chiffre dans le hero ; « en moins d'une minute » nulle part sur la nouvelle page | « Je veux le chiffre » : d'abord la suite chronométrée (lot en option du §5) ; le chiffre ne paraît qu'avec elle, et `plans/promesses.md:8` est corrigé |
| 11 | **La source « Harvard Business Review »** (contre-vérification). La ligne chiffrée de la section 2 cite sa source (`app/page.tsx:227`, arbre ; `plans/promesses.md:30`). Or aucune marque tierce ne paraît sur une page publique hors des pages légales (§5, test 11). La source reste-t-elle sous la ligne chiffrée ? | Prompt : oui, car un chiffre sans source disparaît (`p4-landing.md:297`) | « Non » : la ligne chiffrée disparaît avec sa source ; c'est la seule de la page (rang 8) |

## 1. Diagnostic de la page actuelle

- **`app/page.tsx` (433 lignes) compte 14 sections** : hero (l.176), bande d'accroche (l.210), preuve (l.222), `comment` (l.235),
  `fonctionnalites` (l.255 : `DemoSequence` ; `DemoVideo` seulement si le drapeau `landingVideo`, baissé à `lib/flags.ts:66`),
  `chiffres` (l.266), `compta` (fond clair, l.275), `pour-qui` (l.285), `confiance` (fond clair, l.303), `tarifs` (l.322),
  `comparatif` (l.376), `maquette` (`MaquetteForm`, l.386), `questions` (l.403), appel final (l.419). C'est deux fois le maximum
  de 7 que fixe le prompt.
- **Branche `refonte-1018`** (19/10, 37 commits absents de `main`, 86 fichiers) : une landing v2 « Cinéma » complète
  (`app/landing/LandingV2.tsx`, 353 lignes, et `landing-v2.css`, 153 lignes) derrière le drapeau `landingV2`. Ce drapeau n'existe
  que sur la branche, posé à `true` par un commit de prévisualisation à retirer avant fusion. Elle a 10 sections, avec le hero
  « Le premier qui répond décroche le chantier. ». La branche contient aussi des pages `/offres` (+102 lignes) et `/comparatif`
  (+43), et la console v2 « Instrument » (prévue pour le chantier 4).
- **Fichiers non commités du 27/10** (décision de Benj : on les garde et on les intègre), rassemblés sur la branche
  `vitrine-seo-2710` (dossier `presti-landing`) : 4 pages SEO (`comment-faire-un-devis`, `generateur-devis`,
  `logiciel-devis-artisan`, `modele-devis`), `SeoBlocs.tsx`, `ressources.css`, `lib/seoDevis.ts`, et des retouches de
  `Breadcrumb`, `PublicPied`, `globals.css`, `page.tsx`, `sitemap.ts`, `llms.txt`. Typage et compilation verts le 01/11, après
  deux corrections (FAQ par offre, délai d'annulation lu dans `lib/pilote/regles`). *02/11, 14 h 48 : commités sur `vitrine-seo-2710`
  (`9342be86`), puis fusionnés dans `landing-0111` (§5, lot 1).*
- **Prix** : `lib/plans.ts:98-99` (Studio 59 €/mois, Signature 99 €/mois) et `ESSAI_JOURS` à `lib/plans.ts:108` (7 et 21 jours,
  sans carte). « Presti pour l'entreprise » : sur devis, sans prix public (décision du 01/11). Elle est dans `lib/plans.ts` depuis le
  lot L2 du chantier 4 (`74db706a`, 02/11 à 15 h 08 : `PlanId`, `PLANS.entreprise`), hors d'`OFFRES` et d'`ESSAI_JOURS` : ni prix public,
  ni Checkout, ni essai.
- **Mesures de départ** : la note du 18/10 donne un temps de blocage (TBT) de 950 ms sur ordinateur et de 2 900 ms sur mobile.
  La mesure du 01/11 par PageSpeed est refusée (quota du jour épuisé, HTTP 429) : on la refait en local (Lighthouse) avant le
  premier changement. Objectif du prompt : TBT mobile sous 200 ms, LCP sous 2,5 s, CLS sous 0,1.

## 2. Trois directions créatives

| | A — « Cinéma », sur la v2 existante (recommandée) | B — « Le produit en héros » | C — « Ce que vous perdez » |
|---|---|---|---|
| Idée | Reprendre `LandingV2` de `refonte-1018` (piste B recommandée le 18/10) et la ramener à 7 sections | Le vrai écran de Presti en accroche, animé carte par carte, mots un par un (grammaire de mikalianov et yova2n, analyse des vidéos du 01/11) | Un calculateur en accroche : l'artisan met ses propres chiffres (demandes reçues, temps de réponse) et voit ce qui lui échappe (RWKyUJLi-kI [03:26]) |
| Hero | « Le premier qui répond décroche le chantier. » | « Vos devis en quelques minutes. Presti prépare les relances et le suivi. » sur l'écran réel animé *(02/11 midi : « en quelques minutes » est écarté, aucune mesure ; §0 bis, question 1)* | « Combien de chantiers vous échappent chaque mois ? » |
| Structure | Les 7 sections du §3, en reprenant les blocs déjà écrits de la v2 (démo `HeroApp`, `DemoGestion`, `DemoSite`…) : on coupe de 10 à 7 | Les mêmes 7 sections, mais le hero est une démo plein cadre (devis créé, relance préparée, facture ; « prévue » corrigé le 02/11 midi, §0 bis, rang 3) qui défile carte par carte | Le hero est un calculateur (demandes par semaine, délai de réponse) qui donne « ce qui vous échappe », hypothèse écrite à côté ; puis les 6 autres sections |
| Textes | Promesse de vitesse ; phrases courtes, bénéfices d'abord, mots d'artisan ; « Studio prépare, vous validez ; Signature envoie seul » | Peu de texte : une phrase de promesse, puis une légende de 3 à 6 mots sous chaque étape de la démo | Orienté douleur : seulement les chiffres que l'artisan tape lui-même, jamais un chiffre inventé ni un résultat promis |
| Hiérarchie visuelle | Fond nuit, aube corail en dégradé CSS (sans WebGL) ; un grand titre à gauche, la démo à droite dès le premier écran ; sections claires pour Confiance et Tarifs ; beaucoup de vide | Le produit occupe environ 60 % du premier écran ; texte minimal ; mouvement continu chargé après l'affichage ; corail réservé à l'action | Un bloc interactif au centre, de grands chiffres, un contraste fort ; la solution vient juste après |
| Force | Le plus rapide et le plus sûr : déjà écrit, jugé par deux tours de jury le 19/10 | Le plus « futuriste » : le produit se montre au lieu de se décrire | Le plus orienté conversion |
| Risque | Moins neuve visuellement | Poids de l'animation : vidéo ou CSS chargée après l'affichage, jamais de WebGL au chargement | Tout chiffre affiché doit avoir une source ; rien sur la page n'est un résultat promis |

**Recommandation (défaut si Benj ne tranche pas)** : A comme base, avec le hero animé de B. C'est le meilleur rapport entre
vitesse, qualité et performance.

## 3. Structure recommandée : 7 sections, un message chacune

*Historique : le §0 corrige cette liste (les 7 sections du prompt, dans son ordre) ; le §0 bis dit comment remplir chacune.*

1. **Hero** : la promesse en une phrase, une sous-phrase, l'écran réel de Presti animé. Bouton principal « Essayer Presti » (libellé
   imposé, `p4-landing.md:41` ; « Essayer gratuitement » corrigé le 02/11 midi), bouton secondaire « Presti pour l'entreprise ».
2. **Ce que Presti fait à votre place** : 3 douleurs (temps des devis, relances oubliées, documents et stock), puis 6 fonctions
   (devis, factures et relances, clients, stock, documents, assistant), en vrais extraits animés. Chaque artisan fictif porte
   « Exemple ».
3. **Comment ça marche, en 3 temps** : vous décrivez le chantier, Presti prépare le devis, vous validez et envoyez.
4. **Pour qui** : artisans du bâtiment, TPE, artisans multi-chantiers, architectes et entreprises. Les deux derniers mènent au bloc
   entreprise.
5. **Confiance** : vos données, votre marque devant vos clients (marque blanche), RGPD, mentions légales.
6. **Tarifs** (Studio et Signature lus dans `lib/plans.ts`, essai sans carte), suivis du bloc **« Presti pour l'entreprise »**
   (texte exact du prompt, sans prix ; bouton « Demander une démo » vers `/contact` avec le motif « entreprise »).
7. **Questions, puis appel final** : « Créer mon compte » et « Demander une démo entreprise ».

**Ce qui passe sur `/offres` ou une sous-page** : le comparatif, les chiffres, le détail de la compta, la maquette de site
(`MaquetteForm`, gardée et toujours branchée sur les prospects entrants), et les 4 pages SEO du 27/10.

## 4. Questions encore ouvertes, avec leur défaut

*02/11 midi : le tableau du §0 bis reprend les questions 2 et 3 (ses questions 1 et 4) et en ajoute neuf ; ses défauts priment.*

1. Direction : A, B ou C ? Défaut : A, avec le hero de B. *Tranché par Benj le 02/11 au matin (§0).*
2. Phrase du hero ? Défaut : celle de A. La variante de B est vraie pour les deux offres : Studio prépare, Signature envoie seul.
   *Remplacé le 02/11 midi : la seconde promesse du prompt (`p4-landing.md:31`), qui prime ; B promet une durée sans mesure, A affirme la
   vitesse sans source (:487) (§0 bis, question 1).*
3. Destination du bouton « Demander une démo » ? Défaut : `/contact` avec le motif « entreprise ». *Confirmé le 02/11 midi : c'est le
   défaut du prompt (`p4-landing.md:291` ; §0 bis, question 4).*

## 5. Exécution, en lots (réécrit le 02/11 midi)

L'ancienne liste en huit points (branche, intégration, coupe à 7 sections, mesure, tests, build, audit, levée) est reprise dans les lots
ci-dessous, avec ce que le §0 bis ajoute.

- **Qui.** La session principale tient git : la branche, un dossier de travail à part (un worktree git), les commits et les fusions. Elle
  fait aussi le build, le push, le déploiement, les migrations et l'inscription au lanceur (`scripts/tout-verifier.mjs`, que le chantier 4
  touche aussi), et relit tout ce qui lit ou change `lib/plans.ts` (l'argent). Claude Code, dans une conversation Orca visible (règle de
  Benj du 02/11), écrit la page, le texte et les tests : une tâche `.orchestre/file/` par lot, en-tête YAML complet, verdict par
  `node scripts/orchestre.mjs verifier <id>`. La garde refuse à ces sessions le build, le commit, le push et les migrations
  (`scripts/hooks/garde-agents-orca.mjs`). Un auditeur distinct de l'auteur relit chaque lot. Hermes (Haiku 5.5) ne fait que des variantes
  d'animation et des captures (règle de Benj du 01/11 au soir) ; un modèle gratuit, seulement pour une petite tâche, jamais avec une donnée
  de prospect. Deux agents au plus à la fois sur le PC, chantier 4 compris (Journal-Decisions, 02/11 midi).
- **Preuves.** Chaque suite neuve se joue hors ligne, rougit sur un sabotage par motif, puis entre au tableau `SUITES`. Lighthouse en
  5 passes, médiane, mobile et ordinateur : avant le premier changement (lot 3), puis après chaque levier (lot 7). Une preuve est une
  sortie de commande.
- **Rien de visible ne change en production avant un « oui » de Benj** : tout passe derrière `landingV2`, le bloc de démo de `/contact`
  compris.

| # | Lot | Contenu | Qui l'écrit | Preuve | Attend Benj |
|---|---|---|---|---|---|
| 1 | Branche et intégration | Fait le 02/11 de 14 h 48 à 14 h 51 par la session principale, rien de poussé : `9342be86` sur `vitrine-seo-2710` (les 16 fichiers du 27/10, copie corrigée de `presti-landing`, aux chemins nommés, `cadrage-p4.md:248`) ; `165969b0`, la vitrine fusionnée dans `landing-0111`, partie de `372048ca` dans un dossier à part (`C:/Users/benja/Documents/presti-c2`) ; `1c6a6af6` : `/offres`, `/comparatif` et `lib/demoScenes.ts` repris de `refonte-1018` par `git show`, jamais `dedfd033` (`refonte-1018:lib/flags.ts:193-194`), et `landingV2: false` dans `lib/flags.ts`, visible en prévisualisation (`cadrage-p4.md:166`). `LandingV2.tsx` et `landing-v2.css` y entrent en référence lue (`plans/011-cadrage-01-11/briefs/landing-v2-reference/`), car ils dépendent de composants qui ont divergé de `main` : `cadrage-p4.md:256` est suivi, et la direction A (§0 ; Journal-Decisions, 02/11 au matin) en tire la page au lot 6. L'arbre de `main` garde sa copie de la vitrine, plus ancienne sur `public/llms.txt` et `app/logiciel-devis-artisan/page.tsx` (relevé du 02/11 midi) | Session principale | `git log main..landing-0111` sans `dedfd033` ; aucun `landingV2: true` ; typecheck et build verts | — |
| 2 | Correctifs de l'accueil actuel | Un commit à part, prêt à partir seul : la scène 8 (rang 6), la puce « Exemple » de la fenêtre du hero (rang 5), le badge « PDF conforme » au corail (rang 14), « en moins d'une minute » retiré de l'accueil actuel et de `lib/faq.ts:4` (question 9). La formule de la question 2 dans `lib/plans.ts:98`, `:206` et `lib/faq.ts:4` | Claude Code (Orca) ; `lib/plans.ts` par la session principale | les motifs des tests 7, 12, 13, 15 et 16, joués sur l'accueil actuel : rouges avant, verts après | Questions 2, 9 et 10 |
| 3 | Mesure de départ | Lighthouse de la page actuelle, puis de la prévisualisation de la v2, sur un build isolé (`PRESTI_DIST=.next-prod`, port dédié), machine au repos, jamais pendant un build du chantier 4 (`cadrage-p4.md:266`) | Session principale | un fichier daté des médianes TBT, LCP et CLS, commité avec le plan | — |
| 4 | Texte et maquette | Le texte complet des 7 sections, selon le §0 bis ; la microcopie (livrable 7) ; title et meta description (livrable 8), alignés sur ceux que la vitrine change déjà (`cadrage-p4.md:167`) ; le bloc de démo de `/contact` ; une maquette HTML statique en 390 et 1440 px (`cadrage-p4.md:261-262`) | Claude Code (Orca) ; un auditeur des promesses distinct (`cadrage-p4.md:293`) | contrôle de la maquette : contraste AA, 0 px de défilement horizontal en 390, un `h1` d'une phrase, ni bleu ni cyan ; chaque phrase relue contre `lib/plans.ts` et `plans/promesses.md`, offre par offre | Valider le texte et la maquette avant le code (`p4-landing.md:308`) ; questions 1, 3 et 6 |
| 5 | Tests de la page | `scripts/landing-v2-qa.mjs`, neuve (`cadrage-p4.md:276-284`), avec la liste ci-dessous. `promesses-qa.mjs` et `geo-presti-qa.mjs` inscrites au lanceur, ou déclarées dans `HORS_LANCEUR` avec leur raison (`cadrage-p4.md:251`). Les suites qui lisent `app/page.tsx`, retouchées (`cadrage-p4.md:285`) | Claude Code (Orca), avant la page ; l'inscription par la session principale | la suite rougit d'abord sur la v2 telle qu'elle est (« Essayer gratuitement », « Relance J+2 planifiée », « moins d'une minute », l'Essentiel), puis sur chaque sabotage ; verte sur la page finie | — |
| 6 | La page, derrière le drapeau | `LandingV2` ramenée aux 7 sections du §0 et remplie selon le §0 bis ; le bloc de démo de `/contact` (rang 11) ; `/offres` et `/comparatif` (rang 16), en 404 en production tant que le drapeau est baissé (`refonte-1018:app/offres/page.tsx:32`). Aucun import d'`ObjetVivant`, de GSAP, de `BandeMots` ni de `MaquetteForm` (`cadrage-p4.md:273`). La même ligne interdit aussi `Demo*` : elle est dépassée sur ce point par la direction A (§0), car les rangs 6 et 10 réutilisent `DemoSequence` et `demoScenes` | Claude Code (Orca), avec `presti-design` ; captures et variantes d'animation par Hermes | lot 5 vert ; captures à t = 0, 1, 3 et 5 s en 390 et 1440 px, plus une à t = 0 sans JavaScript, démo non vide (rangs 3 et 7) ; le build marque `/contact` statique | Le lot 4 validé ; questions 4, 7 et 8 |
| 7 | Performance | Les leviers de `cadrage-p4.md:288`, un par un : WebGL et GSAP retirés, moins de composants hydratés, image du hero en AVIF ou WebP à dimensions fixes, une seule police. Cible : TBT mobile sous 200 ms, LCP sous 2,5 s, CLS sous 0,1 (`p4-landing.md:301`) | Claude Code (Orca) ; build et mesures par la session principale | médiane avant et après chaque levier ; un levier sans effet mesuré n'est pas gardé ; cible manquée : on le dit, médiane à l'appui | — |
| 8 | Intégration, vérification en direct, audit | Push de la branche (prévisualisation Vercel, jamais la production). Vérification en direct : routes 200, DOM et CSS, 390 et 1440 px, clavier, `prefers-reduced-motion`, `sitemap.xml`, `/llms.txt`. Audit par des agents distincts de l'auteur : promesses et offres ; accessibilité et performance (`presti-anim-accessibilite`) ; marque et palette (`presti-anim-marque`) ; données du formulaire (`presti-audit-conformite`) ; SEO (`cadrage-p4.md:293`). Puis fusion sur `main`, drapeau baissé : l'arbre de `main` met d'abord de côté ses copies de la vitrine (git refuse d'écraser des fichiers non suivis) ; `npm run build`, push, `attendre-deploiement`, `deploiement-etat` | Session principale ; auditeurs distincts | rapports d'audit sans défaut grave ouvert ; en production, `/` rend toujours l'ancienne page, au SHA de HEAD | Le « oui » sur la vitrine avant la fusion (`cadrage-p4.md:167`) |
| 9 | Levée du drapeau | Un commit `landingV2: true`, `attendre-deploiement`, vérification en direct, Search Console ; retour arrière : `git revert` de ce commit (`cadrage-p4.md:297`). `plans/promesses.md` à jour pour chaque phrase neuve ; note de décision au vault par une tâche de périmètre `SaaS/…` (`cadrage-p4.md:298`) | Session principale | en production, `/` rend la nouvelle page, au SHA déployé | Le « oui » de Benj, qui lève `landingV2` |
| 10 | Après la levée | Mesure du parcours (rang 17). Pas 1, sans migration : `/offres` et `/comparatif` dans `PAGES_MESUREES` (`lib/audience.ts:17` ; `/contact` y est déjà, l.20). Pas 2 : quatre compteurs de clics agrégés, sans cookie ni identifiant (migration), et `presti-bilan-landing`, bilan hebdomadaire du n8n d'Oracle vers `#presti-auto`, livré inactif, essayé à blanc, qui ne lit que des agrégats. Puis une page par métier (rang 18) et les réponses neuves de la FAQ (rang 15) | Claude Code (Orca) ; migration par la session principale | `audience-e2e` ; l'export du workflow passe `n8n-specs-qa` (prévue au chantier 4) | Le « go » de la migration ; la publication du workflow ; le choix du métier ; les textes de la FAQ |
| — | En option : le chiffre du hero | Une suite chronométrée, de la demande reçue à la réponse prête, sur des demandes d'exemple. Hors ligne, modèle simulé, elle ne mesure que le code : afficher le chiffre exige aussi de vrais appels, datés (`cout: 'ia'`, joués avec `--tout`). Puis `plans/promesses.md:8` corrigé | Claude Code (Orca) | elle rougit au-delà de 60 s | Question 10 ; le coût des appels |
| — | Hors de ce chantier | La table `demandes_demo`, `presti-demande-demo`, l'écriture en table, la liste des demandes de démo dans `/controle` avec le geste « traitée » (interface, compte fondateur), et la migration de `notifierEntreprise` : lot L19 du chantier 4. L'e-mail actuel à Benj reste jusqu'à ce que cette liste existe | Chantier 4 | `demande-demo-qa` (chantier 4) | Le « go » de sa migration |

**Tests de la page** (`scripts/landing-v2-qa.mjs`, hors ligne, sur le DOM rendu ; chaque motif a son sabotage, qui doit faire rougir la
suite) :
- Repris du plan (et de `p4-landing.md:315`) :
  1. 7 sections au plus et un seul `h1` (sabotage : une huitième section) ;
  2. aucun prix en dur (`\d+\s?€` hors lecture de `lib/plans.ts`, `cadrage-p4.md:278`) et aucune promesse interdite
     (`p4-landing.md:247-253`) ;
  3. ni bleu, ni cyan, et désormais ni violet (rang 14) ;
  4. des liens qui marchent : chaque lien et chaque bouton visent une route qui existe ou une ancre présente ;
  5. drapeau baissé, la page publique reste l'ancienne (sabotage : lever le drapeau dans l'arbre de test).
- Ajoutés par les vidéos (synthèse C2, rang 13) :
  6. fausse urgence : « places limitées », « offre qui expire », « dernière chance », « avant vos concurrents », « remplacé par l'IA »,
     « la fenêtre se ferme », tout compte à rebours ;
  7. gains chiffrés : « de CA », un montant « gagné », « rapporte », « bénéfice », hors du libellé exact « marge sur matériaux, estimée » ;
  8. garanties : « résultats garantis », tout « garanti » devant un résultat ;
  9. fausses preuves : témoignage, avis, étoiles, logo tiers, compteur de clients, image de personne ou image générée ;
  10. prix barrés et remises : balise `s` ou `del` autour d'un montant, pourcentage de remise, coupon ;
  11. marques et mots techniques, hors des pages légales : n8n, Supabase, eu-central-1, Anthropic, Claude, Opus, Sonnet, Haiku, OpenAI,
      GPT, Codex, Hermes, Orca, MCP, ReAct, workflow, LLM, prompt, agent ; seule exception, « agents IA » dans le texte exact du bloc 6
      (`p4-landing.md:93` ; `cadrage-p4.md:165`) ; sabotage : « hébergé chez Supabase » dans le bloc de démo ;
  12. « Exemple » sur toute donnée fictive : chaque bloc de démo qui porte un nom de personne ou un montant porte aussi « Exemple »
      (sabotage : retirer la puce de la fenêtre du hero) ;
  13. un seul accent, le corail, et le vert réservé : chaque règle qui emploie le jeton vert vise un état « validé » ou « payé »
      (sabotages : une annotation verte, une pastille violette).
- Ajouté par la critique (point 10) :
  14. une seule phrase dans le `h1` (sabotage : deux phrases).
- Et ce que le §0 bis fixe encore :
  15. ni chiffre ni durée dans le `h1` et la sous-phrase ; « en moins d'une minute » nulle part sur la page (question 10) ;
  16. jamais « relance prévue », « planifiée » ou « programmée », ni « part seul » ou « envoie seul », sans « Signature » dans la phrase
      (critique 8 ; `p4-landing.md:246`) ; jamais « rien ne part sans vous » (question 2) ;
  17. les cinq libellés imposés, mot pour mot : « Essayer Presti », « Presti pour l'entreprise », « Demander une démo », « Créer mon
      compte », « Demander une démo entreprise » ; ni « Essayer gratuitement » ni « diagnostic gratuit » ; seuls les liens vers `/signup`
      sont des boutons pleins (rang 2) ;
  18. aucun nombre de jours écrit en dur, la ligne d'essai lit `ESSAI_JOURS` (rang 4 ; sabotage : « 14 jours ») ; nulle part
      « Essentiel » (rang 16) ;
  19. bloc de démo : aucun délai (question 7), aucune marque, et « Ce qui se passe ensuite » identique au texte du chantier 4.

`scripts/promesses-qa.mjs` sonde déjà les délais promis dans les scènes de la landing (`SONDES_LANDING`, l.956) et porte le juge PR-1
(l.22-24). Mais il n'est au lanceur nulle part : ni dans `SUITES` (`scripts/tout-verifier.mjs:25`), ni dans `HORS_LANCEUR`, l.198 au HEAD.
Personne ne le joue. Il faut l'inscrire, mutation prouvée, ou le déclarer dans `HORS_LANCEUR` avec sa raison ; ses
sondes peuvent aussi passer dans la nouvelle suite. Même constat pour `geo-presti-qa.mjs` (`cadrage-p4.md:251`).

**Ce qui attend Benj**, dans l'ordre :
1. Valider le texte et la maquette (lot 4), avant le code (`p4-landing.md:308`).
2. Répondre, quand il le veut, aux onze questions du §0 bis ; chaque défaut s'applique d'ici là.
3. Dire « oui » à la vitrine SEO avant la fusion sur `main` (`cadrage-p4.md:167`) : quatre pages neuves, title et description de
   l'accueil.
4. Dire « oui » à la levée de `landingV2` (lot 9), après l'audit.
5. Plus tard : le « go » de la migration des compteurs, la publication de `presti-bilan-landing`, le métier de la première page, les
   textes de la FAQ (lot 10). Le « go » de `demandes_demo` est au chantier 4 (L19).
