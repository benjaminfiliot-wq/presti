# Relais des défauts de juges restants

Sources PC non validées, conservées à Codex : 026-092 et 026-151. Les derniers logs sont copiés, aucun PASS inventé. Les 14 fiches prêtes restent indépendantes de ces deux prises.

## 026-092

Lecture officielle : SV-11 rouge parce que fermeture-e2e possède des corrections générales nécessaires (couverture station et résolveur TS) en plus de pilotage. La fermeture production réelle est verte : 193 réussites, zéro échec, log joint. Ces corrections doivent être reconnues comme correction générale validée et non modification furtive du juge. SV-16 rouge : un palier commandement financier non null devient HORS, mais le contrat PALIER n’admet que null ou {lv,texte}. Même incompatibilité latente sur cout_jour_eur brut numérique et refus HORS. Les absences null/undefined sont correctement préservées ; montant zéro demeure protégé. Alignement du contrat/droits à faire par Claude, ne pas supprimer le masquage pour passer.

## 026-151

Corrigés localement : ORS-8 pilotes synchronisés, ORQ-2/4 date fixe 2099, ORS-2 vrai témoin maj, ORB-6 FAIL en-cours, ORB-9 promotion sans --benj. Le canonique émet maintenant FAIL <id> — détail et bilan preuve-026 : FAIL — ids. Le runner cible la vraie garde ORB-7 après026-259.

Dernier officiel : 22/32 mutations exécutées et toutes détectées ; plafond interne17min atteint, donc FAIL, MP1/2/3 rouges, MP4/5 verts. Le bilan canonique complet a été ajouté après ce passage et doit être rejoué. Le méta-juge exige la ligne FAIL et un bilan portant les ids : chef-qa, contre-mutation CH-A13, ne fournit pas encore ce bilan attendu. Claude doit corriger son interface réelle sans affaiblir les critères ni modifier le méta-juge. Déporter la suite sur Oracle est préférable au PC saturé ; les juges source/quotas ont déjà passé en témoin.

Le dossier outil-orchestre contient les28fichiers canoniques ACTUELS, incluant les corrections ; remplace le snapshot ancien du relais81463. Créer une copie de travail dédiée ../orchestre à partir de ce snapshot ; ne pas écraser un dépôt outil corrigé indépendamment.
