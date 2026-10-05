# Mutations du juge du domaine réseaux (026-219, C16)

Décision « tout est automatique » (D-0410-1) : les mutations visent les gardes automatiques qui remplacent l'accord individuel ; contenu-ecran-qa.mjs n'existe pas et n'est pas couvert.

## Témoins (copie intacte)
- geste : témoin vert en 9 s
- lignes : témoin vert en 10 s
- meta : témoin vert en 10 s
- mesure : témoin vert en 7 s
- boucle : témoin vert en 5 s
- fabrication : témoin vert en 2 s
- gabarits : témoin vert en 0 s
- veille : témoin vert en 6 s
- tiktok : témoin vert en 4 s
- couts : témoin vert en 1 s

## Mutations
- PASS GE-2 — STOP ou opposition connue ignorée : la publication part quand même ; lib/contenu/lignes.ts ; FAIL GE-2 — budget et opposition bloquent automatiquement — accord : opposition connue accepté (la publication part) | lignes : opposition connue accepté (la publication part)
- PASS GE-2 — coût inconnu ou positif accepté : le coût exactement nul n’est plus exigé ; lib/contenu/lignes.ts ; FAIL GE-2 — budget et opposition bloquent automatiquement — accord : coût inconnu accepté (la publication part) | accord : coût positif accepté (la publication part) | accord : coût donné en texte accepté (la publication part) | lignes : coût inconnu accepté (la publication part) | lignes : coût positif accepté (la publication part) | lignes : coût donné en texte accepté (la publication part)
- PASS LN-7 — la pause générale n’est plus relue avant chaque appel au modèle (entre deux textes) ; lib/contenu/lignes.ts ; FAIL LN-7 — pause fail-closed avant modèles et sorties — verdictPublication : pause entre textes ne coupe pas le deuxième appel
- PASS MP-6 — la pause générale n’est plus relue avant la publication Graph, après la fabrication du conteneur ; lib/contenu/metaPublier.ts ; FAIL MP-6 — pause fail-closed avant modèles et sorties — Graph : pause avant/après conteneur laisse publier
- PASS ME-4 — la pause générale n’est plus relue avant le contrôle d’un libellé chiffré par le modèle ; lib/contenu/mesure.ts ; FAIL ME-4 — pause fail-closed avant modèles et sorties — verdictFormulePublique : active ne coupe pas le modèle | verdictFormulePublique : doute ne coupe pas le modèle | verdictFormulePublique : throw ne coupe pas le modèle
- PASS LN-3 — le plafond du jour dépassé d’une publication (>= devient >) ; lib/contenu/lignes.ts ; FAIL LN-3 — plafond du jour refusé — plafond du jour dépassé accepté
- PASS LN-4 — jev noul à 0,49 accepté (le seuil de Laya passe de 0,5 à 0,49) ; lib/contenu/lignes.ts ; FAIL LN-4 — affirmation chiffrée contrôlée — SEUIL_LAYA vaut 0.49 (attendu 0,5 : le contrat de la série)
- PASS ME-3 — un libellé chiffré sans source est publié ; lib/contenu/mesure.ts ; FAIL ME-3 — libellé chiffré sans source refusé — chiffre sans source refusé : accepté | source blanche refusée : accepté
- PASS ME-2 — une attribution de vente affichée sans la mention « estimation » (présentée comme certaine) ; lib/contenu/mesure.ts ; FAIL ME-2 — attribution de vente = estimation — attribution sans « estimation » acceptée
- PASS BO-2 — jev score devient une permission de republier à lui seul ; lib/contenu/boucle.ts ; FAIL BO-2 — jev score classe, ne publie jamais — score 5/5 sans vue : statut « refaire » sans aucune vue (attendu tendance : le score seul ne tranche jamais) | score 1/5 sans vue : statut « refaire » sans aucune vue (attendu tendance : le score seul ne tranche jamais)
- PASS FA-4 — une vidéo silencieuse est acceptée au dépôt ; scripts/contenu/fabriquer.mjs ; FAIL FA-4 — dépôt refusé (licence, audio, taille) — vidéo sans piste audio : dépôt accepté à tort
- PASS FA-4 — une licence inconnue est acceptée comme du CC0 ; scripts/contenu/fabriquer.mjs ; FAIL FA-4 — dépôt refusé (licence, audio, taille) — licence inconnue : dépôt accepté à tort
- PASS GA-2 — un gabarit sans licence commerciale ; public/contenu/gabarits/L2.json ; FAIL GA-2 — licence commerciale et crédit — L2.json : licence commerciale non garantie
- PASS VE-3 — un texte pouvant identifier un prospect part vers un modèle :cloud ; scripts/contenu/veille.mjs ; FAIL VE-3 — prospect jamais vers une IA gratuite ou :cloud — donnée de prospect envoyée à un moteur :cloud
- PASS TT-3 — TikTok Studio lu par le script (une adresse de TikTok Studio dans le code) ; scripts/contenu/publier-tiktok.mjs ; FAIL TT-3 — jamais TikTok Studio ni Creative Center — « tiktokstudio » lu dans le source
- PASS TT-2 — le chemin TikTok n’exige plus l’accord individuel (exigé tant que D-0410-9 reste ouvert pour TikTok) ; scripts/contenu/publier-tiktok.mjs ; FAIL TT-2 — accord individuel exact requis — accord individuel manquant refusé : publication permise | décision à échéance passée refusée : publication permise | échéance illisible refusée : publication permise | accord vieux de plus de 7 jours refusé : publication permise
- PASS TT-2 — une décision dont l’échéance est passée est acceptée (accordValide, voie TikTok) ; lib/contenu/lignes.ts ; FAIL TT-2 — accord individuel exact requis — décision à échéance passée refusée : publication permise
- PASS GE-2 — un coût inconnu (null) ou donné en texte accepté : `!== 0` devient `> 0` ; lib/contenu/lignes.ts ; FAIL GE-2 — budget et opposition bloquent automatiquement — accord : coût inconnu accepté (la publication part) | accord : coût donné en texte accepté (la publication part) | lignes : coût inconnu accepté (la publication part) | lignes : coût donné en texte accepté (la publication part)
- PASS LN-4 — jev noul à 0,5 refusé à tort (le seuil de Laya passe de 0,5 à 0,51) ; lib/contenu/lignes.ts ; FAIL LN-4 — affirmation chiffrée contrôlée — p=0,5 refusé à tort (score de vérité insuffisant (p=0.5 < 0.51) : renvoyé à Benj) | SEUIL_LAYA vaut 0.51 (attendu 0,5 : le contrat de la série)
- PASS ME-3 — une source blanche (espaces) suffit à publier un chiffre ; lib/contenu/mesure.ts ; FAIL ME-3 — libellé chiffré sans source refusé — source blanche refusée : accepté
- PASS ME-2 — la mention « estimation » n’est exigée que des libellés longs ; lib/contenu/mesure.ts ; FAIL ME-2 — attribution de vente = estimation — attribution sans « estimation » acceptée
- PASS BO-2 — jev score bas, sans aucune vue, suffit à suspendre une ligne ; lib/contenu/boucle.ts ; FAIL BO-2 — jev score classe, ne publie jamais — score 1/5 sans vue : statut « suspendre » sans aucune vue (attendu tendance : le score seul ne tranche jamais)
- PASS TT-2 — une échéance illisible est acceptée (accordValide, voie TikTok) ; lib/contenu/lignes.ts ; FAIL TT-2 — accord individuel exact requis — échéance illisible refusée : publication permise
- PASS TT-2 — un accord de plus de 7 jours (30 jours) est encore accepté ; lib/contenu/lignes.ts ; FAIL TT-2 — accord individuel exact requis — accord vieux de plus de 7 jours refusé : publication permise
- PASS CO-1 — un montant inconnu devient zéro (une dépense inconnue paraît gratuite) ; lib/contenu/couts.ts ; FAIL CO-1 — montant absent reste non connu — montant inventé ({"agent":"contenu","moteur":"freellmapi","montant":0,"jetons_entree":null,"jetons_sortie":null,"connu":true,"jetons_connus":false})

Bilan : 25/25 mutations prises sur leur critère nommé, en 3.7 min (budget 26 min).
