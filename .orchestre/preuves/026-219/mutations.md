# Mutations du juge du domaine réseaux (026-219, C16)

Décision « tout est automatique » (D-0410-1) : les mutations visent les gardes automatiques qui remplacent l'accord individuel ; contenu-ecran-qa.mjs n'existe pas et n'est pas couvert.

## LACUNES à signaler à 026-204 (mutation non attrapée)
- GE-2 : « STOP ou opposition connue ignorée : la publication part quand même » n'est pas attrapée par contenu-qa --partie=geste (code 0) : lacune à signaler à 026-204
- GE-2 : « coût inconnu ou positif accepté : le coût exactement nul n’est plus exigé » n'est pas attrapée par contenu-qa --partie=geste (code 0) : lacune à signaler à 026-204
- LN-4 : « jev noul à 0,49 accepté (le seuil de Laya passe de 0,5 à 0,49) » n'est pas attrapée par contenu-qa --partie=lignes (code 0) : lacune à signaler à 026-204
- ME-3 : « un libellé chiffré sans source est publié » n'est pas attrapée par contenu-qa --partie=mesure (code 0) : lacune à signaler à 026-204
- ME-2 : « une attribution de vente affichée sans la mention « estimation » (présentée comme certaine) » n'est pas attrapée par contenu-qa --partie=mesure (code 0) : lacune à signaler à 026-204
- BO-2 : « jev score devient une permission de republier à lui seul » n'est pas attrapée par contenu-qa --partie=boucle (code 0) : lacune à signaler à 026-204
- TT-2 : « une décision dont l’échéance est passée est acceptée (accordValide, voie TikTok) » n'est pas attrapée par contenu-qa --partie=tiktok (code 0) : lacune à signaler à 026-204

## ÉCHECS (7)
- FAIL GE-2 — STOP ou opposition connue ignorée : la publication part quand même ; lib/contenu/lignes.ts ; code 0 : GE-2 rapporté PASS : « PASS GE-2 — budget et opposition bloquent automatiquement : coût inconnu/positif et opposition refusés automatiquement »
- FAIL GE-2 — coût inconnu ou positif accepté : le coût exactement nul n’est plus exigé ; lib/contenu/lignes.ts ; code 0 : GE-2 rapporté PASS : « PASS GE-2 — budget et opposition bloquent automatiquement : coût inconnu/positif et opposition refusés automatiquement »
- FAIL LN-4 — jev noul à 0,49 accepté (le seuil de Laya passe de 0,5 à 0,49) ; lib/contenu/lignes.ts ; code 0 : LN-4 rapporté PASS : « PASS LN-4 — affirmation chiffrée contrôlée : affirmation chiffrée sous le seuil refusée »
- FAIL ME-3 — un libellé chiffré sans source est publié ; lib/contenu/mesure.ts ; code 0 : ME-3 rapporté PASS : « PASS ME-3 — libellé chiffré sans source refusé : chiffre sans source refusé »
- FAIL ME-2 — une attribution de vente affichée sans la mention « estimation » (présentée comme certaine) ; lib/contenu/mesure.ts ; code 0 : ME-2 rapporté PASS : « PASS ME-2 — attribution de vente = estimation : attribution sans « estimation » refusée ; attribution avec « estimation » acceptée »
- FAIL BO-2 — jev score devient une permission de republier à lui seul ; lib/contenu/boucle.ts ; code 0 : BO-2 rapporté PASS : « PASS BO-2 — jev score classe, ne publie jamais : statut « refaire » — classement seul »
- FAIL TT-2 — une décision dont l’échéance est passée est acceptée (accordValide, voie TikTok) ; lib/contenu/lignes.ts ; code 0 : TT-2 rapporté PASS : « PASS TT-2 — accord individuel exact requis : accord individuel manquant refusé »

## Témoins (copie intacte)
- geste : témoin vert en 15 s
- lignes : témoin vert en 20 s
- meta : témoin vert en 18 s
- mesure : témoin vert en 34 s
- boucle : témoin vert en 6 s
- fabrication : témoin vert en 4 s
- gabarits : témoin vert en 1 s
- veille : témoin vert en 9 s
- tiktok : témoin vert en 5 s
- couts : témoin vert en 1 s

## Mutations
- FAIL GE-2 — STOP ou opposition connue ignorée : la publication part quand même ; lib/contenu/lignes.ts ; code 0 : GE-2 rapporté PASS : « PASS GE-2 — budget et opposition bloquent automatiquement : coût inconnu/positif et opposition refusés automatiquement »
- FAIL GE-2 — coût inconnu ou positif accepté : le coût exactement nul n’est plus exigé ; lib/contenu/lignes.ts ; code 0 : GE-2 rapporté PASS : « PASS GE-2 — budget et opposition bloquent automatiquement : coût inconnu/positif et opposition refusés automatiquement »
- PASS LN-7 — la pause générale n’est plus relue avant chaque appel au modèle (entre deux textes) ; lib/contenu/lignes.ts ; FAIL LN-7 — pause fail-closed avant modèles et sorties — verdictPublication : pause entre textes ne coupe pas le deuxième appel
- PASS MP-6 — la pause générale n’est plus relue avant la publication Graph, après la fabrication du conteneur ; lib/contenu/metaPublier.ts ; FAIL MP-6 — pause fail-closed avant modèles et sorties — Graph : pause avant/après conteneur laisse publier
- PASS ME-4 — la pause générale n’est plus relue avant le contrôle d’un libellé chiffré par le modèle ; lib/contenu/mesure.ts ; FAIL ME-4 — pause fail-closed avant modèles et sorties — verdictFormulePublique : active ne coupe pas le modèle | verdictFormulePublique : doute ne coupe pas le modèle | verdictFormulePublique : throw ne coupe pas le modèle
- PASS LN-3 — le plafond du jour dépassé d’une publication (>= devient >) ; lib/contenu/lignes.ts ; FAIL LN-3 — plafond du jour refusé — plafond du jour dépassé accepté
- FAIL LN-4 — jev noul à 0,49 accepté (le seuil de Laya passe de 0,5 à 0,49) ; lib/contenu/lignes.ts ; code 0 : LN-4 rapporté PASS : « PASS LN-4 — affirmation chiffrée contrôlée : affirmation chiffrée sous le seuil refusée »
- FAIL ME-3 — un libellé chiffré sans source est publié ; lib/contenu/mesure.ts ; code 0 : ME-3 rapporté PASS : « PASS ME-3 — libellé chiffré sans source refusé : chiffre sans source refusé »
- FAIL ME-2 — une attribution de vente affichée sans la mention « estimation » (présentée comme certaine) ; lib/contenu/mesure.ts ; code 0 : ME-2 rapporté PASS : « PASS ME-2 — attribution de vente = estimation : attribution sans « estimation » refusée ; attribution avec « estimation » acceptée »
- FAIL BO-2 — jev score devient une permission de republier à lui seul ; lib/contenu/boucle.ts ; code 0 : BO-2 rapporté PASS : « PASS BO-2 — jev score classe, ne publie jamais : statut « refaire » — classement seul »
- PASS FA-4 — une vidéo silencieuse est acceptée au dépôt ; scripts/contenu/fabriquer.mjs ; FAIL FA-4 — dépôt refusé (licence, audio, taille) — vidéo sans piste audio : dépôt accepté à tort
- PASS FA-4 — une licence inconnue est acceptée comme du CC0 ; scripts/contenu/fabriquer.mjs ; FAIL FA-4 — dépôt refusé (licence, audio, taille) — licence inconnue : dépôt accepté à tort
- PASS GA-2 — un gabarit sans licence commerciale ; public/contenu/gabarits/L2.json ; FAIL GA-2 — licence commerciale et crédit — L2.json : licence commerciale non garantie
- PASS VE-3 — un texte pouvant identifier un prospect part vers un modèle :cloud ; scripts/contenu/veille.mjs ; FAIL VE-3 — prospect jamais vers une IA gratuite ou :cloud — donnée de prospect envoyée à un moteur :cloud
- PASS TT-3 — TikTok Studio lu par le script (une adresse de TikTok Studio dans le code) ; scripts/contenu/publier-tiktok.mjs ; FAIL TT-3 — jamais TikTok Studio ni Creative Center — « tiktokstudio » lu dans le source
- PASS TT-2 — le chemin TikTok n’exige plus l’accord individuel (exigé tant que D-0410-9 reste ouvert pour TikTok) ; scripts/contenu/publier-tiktok.mjs ; FAIL TT-2 — accord individuel exact requis — publication sans accord acceptée
- FAIL TT-2 — une décision dont l’échéance est passée est acceptée (accordValide, voie TikTok) ; lib/contenu/lignes.ts ; code 0 : TT-2 rapporté PASS : « PASS TT-2 — accord individuel exact requis : accord individuel manquant refusé »
- PASS CO-1 — un montant inconnu devient zéro (une dépense inconnue paraît gratuite) ; lib/contenu/couts.ts ; FAIL CO-1 — montant absent reste non connu — montant inventé ({"agent":"contenu","moteur":"freellmapi","montant":0,"jetons_entree":null,"jetons_sortie":null,"connu":true,"jetons_connus":false})

Bilan : 11/18 mutations prises sur leur critère nommé, en 4.5 min (budget 19 min).
