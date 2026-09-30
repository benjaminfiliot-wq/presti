Tu travailles sur l'usine de Presti, dans ~/veille. Écris et réponds en français, dans un ton simple, humain et respectueux, celui d'un jeune qui appelle un artisan. Rien de commercial agressif.

MISSION : préparer le kit d'appel des 30 maquettes de `prospection/maquettes-2026-09-27/` (voir `manifeste.json`, `LISEZMOI.md` et `../liste-2026-09-27.csv`). Benj appelle lui-même, puis envoie la maquette depuis son téléphone. **Tu n'envoies rien.**

JUGE : `node juges/juge-kit-appel-27.mjs` (déjà écrit, NE PAS le modifier). Lis-le d'abord, boucle jusqu'au PASS.

À LIRE : le kit de la campagne de Marans, qui a déjà servi. Le script et la notice de Marans se trouvent sur le PC ; ils ne sont pas copiés ici. En voici les règles.
- **L'offre** : un site à 300 €, TVA non applicable, sans abonnement. Livraison en 48 h ouvrées. Le nom de domaine est au nom du client. Aucune promesse sur Google.
- **Jamais** « HT » ni « TTC ».
- Pas de chiffre de clients inventé.
- On ne prétend pas avoir vu un site qui n'existe pas.
- La maquette est une **pièce jointe**, pas un lien : elle n'est pas en ligne.

SORTIE : `prospection/maquettes-2026-09-27/KIT-APPEL.md`, avec les sections exactes suivantes.
1. « ## Avant d'appeler » :
   - les créneaux conseillés pour des artisans (tôt le matin, fin de journée, pas pendant le chantier) ;
   - le matériel à avoir sous la main ;
   - le rappel : un démarchage téléphonique entre professionnels, pour leur activité, n'est pas soumis à Bloctel, mais on dit qui on est et pourquoi on appelle, et on retire de la liste quiconque le demande.
2. « ## Script par métier » : un script court (ouverture de 20 s, question, proposition, conclusion), adapté à chaque métier présent (paysagiste, carreleur, électricien, maçon, menuisier, plombier, isolation, peintre, couvreur, chauffagiste), avec leur vocabulaire.
3. « ## Objections » : les 8 objections les plus probables, avec des réponses courtes et honnêtes. Par exemple : « j'ai déjà Facebook », « pas le temps », « c'est cher », « j'ai assez de travail », « rappelez-moi ».
4. « ## Après l'appel » : que faire selon la réponse (oui, à rappeler, non, messagerie).
5. « ## Messages par entreprise » : un bloc `### <n>. <entreprise> — <commune>` par maquette, dans l'ordre d'appel. Chaque bloc contient :
   - le téléphone ;
   - la maquette à joindre (nom du dossier et fichier `capture-telephone.png`) ;
   - un **SMS** de 500 caractères au plus ;
   - un **Mail** (objet et corps), personnalisés à l'entreprise et à son métier ;
   - dans les deux, le moyen de refuser : « Répondez STOP pour ne plus être contacté ».
6. « ## Suivi » : comment remplir le tableau.
7. Écris aussi `suivi-appels.csv`, une ligne par maquette, en-tête exact : `n;entreprise;telephone;metier;commune;statut;date_appel;maquette_envoyee;prochaine_action;note` (statut = `à appeler` au départ).

DONNÉES : ce sont des données d'entreprises. Elles ne partent vers AUCUNE IA gratuite ni vers aucun modèle `:cloud`. Toi seulement.

INTERDITS : écrire hors de `~/veille/prospection/maquettes-2026-09-27/` ; envoyer ou publier quoi que ce soit ; modifier le juge.
