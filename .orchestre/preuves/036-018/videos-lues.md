# Vidéos et fiches relues pour 036-018

Relecture faite le 03/11/2026 pour les gabarits `gabarit-ent-operations`, `-administratif`, `-finance`, `-apres-vente`, `-direction`. Lecture seule. Les chiffres de revenus des vidéos sont « annoncés par l'auteur, non vérifiés » dans les fiches et ne sont repris nulle part ici.

Sigles (chemins depuis la racine du dépôt) :

| Sigle | Fichier |
|---|---|
| AV | `plans/analyse-videos.md` |
| FR | `plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md` |
| FV | `plans/011-cadrage-01-11/p5-entreprise/fiches-videos.md` |
| PR | `plans/011-cadrage-01-11/p6-signature/premiere-reponse.md` (tableaux des motifs, l.85-170) |
| DC | `docs/connaissance-videos/` (README, `veille/`) |
| K | `plans/011-cadrage-01-11/p5-entreprise/kit/annexe-autonomie.md` |

## Motifs cités par la tâche, relus dans PR

- **A7** (PR:109) : la page du matin devient un spécialiste de la direction, qui se termine par des cartes → `gabarit-ent-direction`, « Compter » + cartes de validation.
- **A9** (PR:111) : chaque KPI en euros ou en clients, un juge refuse un chiffre sans source ou un « gain » → le code compte, « non lu » plutôt qu'un zéro, aucun mot de gain ; la phrase du modèle ne porte **aucun chiffre** (rejet).
- **A14** (PR:116) : « facture quand le chantier est fini » + « Ask you » ; journal ; **compteur visible de ce qui part vers un modèle externe** → facturier en carte, `compteur_ia` (documents par modèle externe / en mode privé).
- **A17** (PR:119) : rapport du lundi qui compare ce qui a rapporté → rapport du lundi, ligne Sheets, document Docs.
- **A18** (PR:120) : réponses aux avis préparées, **avis négatif toujours à l'artisan** → `repondre_avis_negatif` : carte forcée, jamais publié.
- **B7** (PR:134) : relance d'impayé jusqu'au paiement ou au motif → relances bornées (4), arrêtées par un paiement lu ; le « motif » reste à la boîte de réception (pas lu ici : limite écrite).
- **B8** (PR:135) : rappel d'entretien, la date est proposée dans « À valider » → `proposer_entretien`, texte et date écrits par le code.
- **C7** (PR:151) : « agent pièce manquante du département Administratif (prompt 2) » → `gabarit-ent-administratif`.
- **C13** (PR:157) : mise en service d'un client Entreprise, écartée pour ce lot (mode ombre = 036-012) → rien de plus ici que la porte « simulation ».
- **D1** (PR:165) : synchronisation d'un outil vers Supabase avec la date de dernière synchronisation → lectures d'outils déposées dans la plateforme, `marquer_evenement` pour Chatwoot.
- **D3** (PR:167) : coût IA par compte et par jour, visible et plafonné → lecture `entreprise_cout_ia`, alerte de plafond (`plafond_ia_centimes`).

## Fiches et vidéos relues

- **FR fiche 8 (l.258-270)**, « I Built a Private AI Operating System to Run Your Entire Business » (29/10/2026) : module 3 « paiements » — « la facture est prête quand le travail est fini, le propriétaire approuve, elle part ; si le client oublie, un rappel poli part ; chaque matin, le flux bancaire est contrôlé pour savoir qui a payé ; un retard important prévient le propriétaire en premier » ; image 068 : workflow n8n « invoice-when-job-done » avec une étape **« Ask you »** ; image 008 : compteur `egress → cloud: 0 bytes`. → on reprend : facturier « quand c'est fini » en carte, lecture des encaissements (Stripe, QuickBooks, Xero, Qonto **en lecture**), relance jusqu'au paiement, **compteur** et **mode privé** ; on refuse : « 26 agents », les chiffres annoncés, un nuage « zéro octet » promis sans preuve (notre compteur dit ce qui est mesuré).
- **FR fiche 11 (l.363-380)**, « I Built a $25,000 AI Reputation Management System For Restaurants » (02/11/2026) : module 1 « réponse aux avis », « les difficiles viennent d'abord à vous », bloc **« Approval Desk » avant « Reply Poster »** (image 026) ; module 3 : un client mécontent prévient le responsable le jour même ; page du matin. → on reprend : avis négatif / client mécontent **toujours** à un humain, alerte d'équipe, page du matin ; on refuse : « une étoile de plus = 5 à 9 % de revenu » (non vérifié), les agents vocaux (hors lot).
- **FV (l.715-726)**, section 3.3 « des agents qu'on voit travailler » : cité par PR:167 pour D3 ; la ligne relue décrit des agents visibles à l'œuvre, pas un coût : le **compteur** du lot s'appuie sur PR:167 et sur la table `entreprise_cout_ia`, pas sur cette ligne (écart noté).
- **AV (l.533-538)** : « Relance d'impayé : quand le client répond, l'assistant lit la réponse, classe le motif (contestation, oubli, trésorerie, échéancier demandé), le range sur la facture » → **non repris** dans ce lot (la lecture de la réponse du client est un geste de la boîte, prompt Accueil) ; noté dans les limites.
- **AV (l.911, 1129)** : « cartes d'artisan (relance, devis, facture) qui glissent de colonne en colonne et s'arrêtent sur À valider » ; relance des factures échues à J+3, J+10 et J+21 → nos paliers de relance (1, 2, 3 selon le retard) restent **paramétrables** ; les jours J+3/J+10/J+21 sont ceux du produit pour l'artisan (Studio/Signature), pas ceux de l'Entreprise, qui prend 1/15/30 jours par défaut (à régler avec le client).
- **DC README** : le dossier regroupe 20 vidéos de veille et les contenus Presti ; l'état final dit « 20/20 transcriptions de veille complètes, dont deux ASR sur Oracle ». Aucun détail de ce dossier n'est repris sans fichier:ligne ci-dessus.
- **K (annexe d'autonomie)** : « par défaut, tout commence en carte à valider » ; 10 minutes pour annuler ; 20 par jour et par compte ; **liste « jamais en automatique »** : prendre un rendez-vous seul, les gestes du code `marquer_facture_payee` et `creer_facture`, parler au nom de l'entreprise sur un litige, encaisser. → `planifier_chantier`, `solder_facture`, `facturer_chantier` et `repondre_avis_negatif` ne partent **jamais** seuls ; mis dans `JAMAIS_AUTO` de la décision et testés.
