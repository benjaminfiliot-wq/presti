# Registre des promesses de la mémoire marketing

Créé le 2026-09-29 (fiche 026-205). Une ligne par promesse publiable : **texte exact**, **source**, **date** de la preuve,
**drapeau requis**, verdict Laya, statut. Contrôle : `node .orchestre/preuves/026-205/controle-registre.mjs` (le texte exact doit
être celui de `lib/crieur/faits.ts`, la source doit contenir son motif, le drapeau ne peut pas être vide).

## Règle de décision avant publication

1. Le texte publié est **mot pour mot** le texte du registre, sinon la promesse n'est pas couverte.
2. La source doit exister et contenir son motif ; sinon **en attente de Benj**.
3. Si un drapeau est requis, il doit être levé dans `lib/flags.ts` ; sinon **en attente de Benj**. « aucun » veut dire que la
   promesse n'est portée par aucun drapeau (écrit explicitement, jamais laissé vide).
4. `jev noul --provider laya` reçoit le texte exact et sa référence de preuve. Probabilité calibrée **inférieure à 0,5**, preuve
   absente ou panne de Laya : **en attente de Benj**, jamais un passage automatique. Un score élevé n'autorise **jamais** seul :
   l'accord individuel de Benj sur le média et le texte exacts reste requis (R24).
5. On conserve, pour chaque décision : texte exact, source, verdict, date, sans donnée personnelle.

Colonne « Laya » : `non_juge` tant que le verdict n'a pas été rendu pour la publication concernée ; il se rend au moment de la
publication (lib/contenu, fiches suivantes), pas dans cette mémoire. `non_juge` vaut « en attente ».

## Registre

| id | texte exact | source (fichier, motif) | date de preuve | drapeau requis | Laya | statut |
|---|---|---|---|---|---|---|
| P-01 | La réponse est prête en moins d'une minute : Presti la prépare, vous l'envoyez. | plans/promesses.md, ligne 1 | 2026-09-05 | aucun | non_juge | en attente de l'accord de Benj à la publication |
| P-02 | Presti prépare des devis chiffrés sur vos propres prix. | plans/promesses.md, ligne 14 | 2026-09-05 | aucun | non_juge | en attente de l'accord de Benj à la publication |
| P-03 | Presti permet de créer des factures et des factures électroniques. | plans/promesses.md, ligne 15 | 2026-09-05 | aucun | non_juge | en attente de l'accord de Benj à la publication |
| P-04 | Les relances peuvent partir après 2, 5 et 10 jours de silence du prospect. | lib/relances.ts, CADENCE_RELANCES | 2026-09-10 | aucun | non_juge | en attente de l'accord de Benj à la publication |
| P-05 | Suivez votre stock par lieu, avec scan et seuils. | plans/promesses.md, ligne 17 | 2026-09-05 | aucun | non_juge | en attente de l'accord de Benj à la publication |
| P-06 | Recherchez des prix chez vos fournisseurs avec l’aide de l’IA. | plans/promesses.md, ligne 18 | 2026-09-05 | aucun | non_juge | en attente de l'accord de Benj à la publication |
| P-07 | Branchez votre boîte e-mail à Presti. | plans/promesses.md, ligne 19 | 2026-09-05 | aucun | non_juge | en attente de l'accord de Benj à la publication |
| P-08 | Exportez vos données depuis Presti. | plans/promesses.md, ligne 20 | 2026-09-05 | aucun | non_juge | en attente de l'accord de Benj à la publication |
| P-09 | Accueillez vos demandes sur une page de conversation à votre marque. | plans/promesses.md, ligne 9 | 2026-09-05 | aucun | non_juge | en attente de l'accord de Benj à la publication |
| P-10 | Essayez Presti sans carte bancaire, avec des crédits offerts. | plans/promesses.md, ligne 4 | 2026-09-05 | aucun | non_juge | en attente de l'accord de Benj à la publication |
| P-11 | En Essentiel, vous validez les réponses de l’assistant IA. | plans/promesses.md, ligne 10 | 2026-09-05 | aucun | non_juge | en attente de l'accord de Benj à la publication |
| P-12 | Vos clients retrouvent leur historique grâce à un lien magique. | plans/promesses.md, ligne 11 | 2026-09-05 | aucun | non_juge | en attente de l'accord de Benj à la publication |
| P-13 | Un site vitrine à la demande est proposé à 300 € une fois. | lib/siteCommande.ts, PRIX_SITE_TEXTE | 2026-09-25 | siteCommandeVente | non_juge | en attente de l'accord de Benj à la publication |
| P-14 | Commente SITE, je te prépare gratuitement la maquette de ton site. | lib/crieur/juge.ts, PHRASE_AIMANT | 2026-09-29 | aimantSite | non_juge | **bloquée** : drapeau absent de lib/flags.ts au 2026-09-29 |

Les treize premières lignes reprennent les faits de `lib/crieur/faits.ts` (P-01 à P-13, dans l'ordre du fichier) ; la dernière est
la phrase d'appel du juge du Crieur. Un texte de fait ne se reformule jamais : le juge du Crieur refuse toute phrase qui n'est
pas mot pour mot un fait cité, une phrase du gabarit ou la phrase d'appel.

## Ajouter une promesse

Une nouvelle ligne exige : un texte exact, une source qui existe et contient son motif, une date, un drapeau (ou « aucun »),
et l'ajout du fait dans `lib/crieur/faits.ts` par la fiche qui possède ce fichier. Une promesse absente d'ici est interdite.
