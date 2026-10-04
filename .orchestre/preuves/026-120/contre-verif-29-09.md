# 026-120 — contre-vérification : six sabotages réversibles, tous rougis

Méthode : chaque sabotage est joué sur une COPIE de la production (la production est partagée par d'autres sessions : on ne la rend
pas fausse, même une minute). Avant chaque sabotage, le fichier copié est comparé à la production (sha256 identique) ; après, il est
recopié depuis la production et comparé de nouveau (sha256 restauré identique à la production). Le juge est celui de la fiche
(`node scripts/pilotage-ecran-qa.mjs --partie=salles --racine=<copie sans le faux panneau d'Attention.tsx>`, banc). Script :
sabotages.mjs (scratchpad de la session) ; résultat brut : sabotages-resultat.json.

| # | Sabotage (un seul changement) | Fichier | sha256 production = restauré | Critère rougi |
|---|---|---|---|---|
| S1 | trente jours réduits à 29 (`jours.slice(0, 29)`) | salles/Recettes.tsx | 35d35105447e… | SA-3 « 29 [data-jour], trente attendus » |
| S2 | la garde « page cachée » retirée de la lecture | salles/lecture.ts | e6b72cd39b00… | SA-10 « page cachée : 2 requête(s) en 60 s » |
| S3 | ACTIVE AUJ. non servie écrit « 0 min » au lieu de « — » | salles/Resume.tsx | 0c34e9beb32e… | SA-19 « ACTIVE AUJ. non servie : « 0 min GÉRER INFO », « — » attendu » |
| S4 | une part calculée (`j.utilise / j.plafond`) | salles/Machines.tsx | c15dafc017e4… | SA-17 « Machines.tsx calcule une part » |
| S5 | `[data-modele]` retiré de la fiche d'agent | salles/FicheAgent.tsx | 23e89327035e… | SA-9 « [data-modele] « undefined » » (cinq fiches) |
| S6 | un bouton « Envoyer » dans la Salle des envois | salles/Envois.tsx | be77ad0d3046… | SA-8 « bouton ou lien « Envoyer » » |

Chaque sabotage ne rougit QUE le critère visé (les 19 autres restent verts), et la copie est revenue à l'octet près de la production
(`restaure: true` pour les six).

## sha256 des fichiers jugés (production, le 04/10/2026)

```
bd05332d113bb71aa41970acf3c5fd92de0022035534ad480e8fedc7edfac8ac *Panneaux.tsx
2bf6b45a5100f416569024ea47f2e4202015d668575abd5077d8aa879b43de0b *salles/Atelier.tsx
be77ad0d3046bfefab347089db30ab37b1c3aeb679ce9510d84a8b57292e7ec4 *salles/Envois.tsx
a194ea5915870d68789c5976c88499686609848f9a6bcf5d35fb9c1c500d95fc *salles/Experience.tsx
ac4cada98326e3d4fb4630a32cd36ddb404805cdb4b6776d44b5821ae2e56b53 *salles/Fenetre.tsx
23e89327035ed5c643bd3d77d67f2e36ca4c2941fb361365f6edc5cefdefb4cc *salles/FicheAgent.tsx
c15dafc017e4eabe406217ece32b08316e6ae323b548e17297171a771571d599 *salles/Machines.tsx
35d35105447eccfb2c2061ff380d1f805f245ce899a4ee0188e516deea1c2331 *salles/Recettes.tsx
8307b8d7c6c274e38c7c5df1d0567e080f81fcf130a3dbd6279306f947895c51 *salles/Redaction.tsx
0c34e9beb32e491fd50e1954f2c191e9259ae19b17e7c5730b212747e5b2dfd7 *salles/Resume.tsx
4b2d33c36d3b44b830584e6ee2e52f505e95f7a13d4b7b340fa441682fb95b25 *salles/Reunion.tsx
30c66f8332a30728ace3ffb87f27e1a1b91849faf30cf43f4a87cde8eaf2a8e4 *salles/Standard.tsx
681f669d25e1d919383f6c4b5bbdcddd8c7d3528b036033adf26471d8af6d68e *salles/Tresorerie.tsx
b787c3d9f896f4256df2ec435055755c7164f04775fef256f38e3e3f48066491 *salles/Usine.tsx
e6b72cd39b000d9801558ca2053dee198c98a9f1f34ecdb04c16380166cc2345 *salles/lecture.ts
346659c184196b91229dc3dc2f5aaae9047525b1d374a4f521e91213a3940b80 *salles/salles.css
```
