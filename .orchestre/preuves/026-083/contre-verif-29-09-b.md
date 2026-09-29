# 026-083 : contre-vérification du 29/09/2026 (sabotages réversibles sur les fichiers de production)
Chaque sabotage : sha256 avant, une seule modification, juge rejoué, fichier restauré depuis une copie, sha256 après. Le témoin vert (CO-1 à CO-8 et CO-10 verts, seul CO-9 rouge : l'étalonnage n'a pas pu être fait) précède.

## S1 première phrase d'un formulaire non exigée
- Fichier : `lib/agents/acquisition/conformite.ts` ; attendu : CO-5 rouge (premiere_phrase manquante)
- Résultat :
```
❌ CO-5 f-premiere-phrase : raisons ["hors_modele","mention_ia_absente"], premiere_phrase attendu ; f-premiere-phrase-modifiee : raisons ["hors_modele","mention_ia_absente"], premiere_phrase attendu
❌ CO-9 .orchestre/preuves/026-083/etalonnage.json absent (lancer --etalonner --reel --confirmer-reel d'abord)
conformite-qa : FAIL — CO-5, CO-9
```
- Restauré : oui, empreinte identique (8b133e46549aed3c72cb105a7db3edb59a94cd07c933f9ff2eca0bb0ce9af852)

## S2 texte d'un modèle approuvé modifié
- Fichier : `lib/agents/acquisition/modeles.ts` ; attendu : CO-3 rouge (le texte a changé depuis son approbation)
- Résultat :
```
❌ CO-2 formulaire_B_v1 : fragment absent — « Je peux vous préparer gratuitement une maquette privée de l… »
❌ CO-3 modele formulaire_B_v1 : le texte a changé depuis son approbation (empreinte e526b38605bd…, 009f37f21f53… aujourd'hui) ; modele formulaire_B_v1 : approuve true, false attendu (approbation.txt)
❌ CO-4 c-formulaire-b-ademe refusé : ["hors_modele"]
❌ CO-5 f-extrait-altere : raisons ["hors_modele"], extrait_altere attendu
❌ CO-9 .orchestre/preuves/026-083/etalonnage.json absent (lancer --etalonner --reel --confirmer-reel d'abord)
conformite-qa : FAIL — CO-2, CO-3, CO-4, CO-5, CO-9
```
- Restauré : oui, empreinte identique (c55ec5f1ae9355b8f3cc550536a9c9770de9987a273bb8d50246612d768ff095)

## S3 un modèle non approuvé passé à approuvé sans approbation
- Fichier : `lib/agents/acquisition/modeles.ts` ; attendu : CO-3 rouge (approuve true sans ligne d'approbation)
- Résultat :
```
❌ CO-3 modele studio_offre_v1 : approuve true, false attendu (approbation.txt)
❌ CO-9 .orchestre/preuves/026-083/etalonnage.json absent (lancer --etalonner --reel --confirmer-reel d'abord)
conformite-qa : FAIL — CO-3, CO-9
```
- Restauré : oui, empreinte identique (c55ec5f1ae9355b8f3cc550536a9c9770de9987a273bb8d50246612d768ff095)

## S4 douleur non approuvée passée à approuvée
- Fichier : `lib/agents/acquisition/douleurs.ts` ; attendu : douleurs-qa DL-2 rouge (approuve true sans ligne d'approbation)
- Résultat :
```
❌ DL-2 electricien-premier-devis : approuve vaut true sans ligne d'approbation (approbation.txt de 026-083)
douleurs-qa : FAIL — DL-2
```
- Restauré : oui, empreinte identique (42afba2ffe9609f0107098cbd06b4116b8ca267664d251fea874f5f35d3635c7)

## S5 J3 accepte une douleur non approuvée
- Fichier : `lib/agents/acquisition/conformite.ts` ; attendu : CO-4b rouge (la douleur non approuvée n'est plus refusée)
- Résultat :
```
❌ CO-4 CO-4b : la douleur non approuvée plombier-manque-clientele n'est pas refusée pour douleur_non_approuvee : {"ok":true}
❌ CO-5 f-douleur-non-approuvee : accepté, douleur_non_approuvee attendu
❌ CO-9 .orchestre/preuves/026-083/etalonnage.json absent (lancer --etalonner --reel --confirmer-reel d'abord)
conformite-qa : FAIL — CO-4, CO-5, CO-9
```
- Restauré : oui, empreinte identique (8b133e46549aed3c72cb105a7db3edb59a94cd07c933f9ff2eca0bb0ce9af852)

## S6 réponse de FAQ approuvée modifiée avec un terme de la liste noire
- Fichier : `lib/agents/acquisition/faq.ts` ; attendu : CO-6 rouge (liste noire) et CO-3 rouge (texte changé)
- Résultat :
```
❌ CO-3 faq hebergement : le texte a changé depuis son approbation (empreinte 3f8a0f865729…, d3edbb5237e2… aujourd'hui) ; faq hebergement : approuve true, false attendu (approbation.txt)
❌ CO-6 FAQ hebergement (reponse_email) : terme de la liste noire « garanti »
❌ CO-9 .orchestre/preuves/026-083/etalonnage.json absent (lancer --etalonner --reel --confirmer-reel d'abord)
conformite-qa : FAIL — CO-3, CO-6, CO-9
```
- Restauré : oui, empreinte identique (5a1e6453942103fd17f7131a82c21915d5b309939642a7757553d03a0506cf2b)

