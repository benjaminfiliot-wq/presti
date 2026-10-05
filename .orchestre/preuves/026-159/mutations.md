# 026-159 — contre-mutations des juges pubs et contenu

## MUTATIONS NON ATTRAPÉES : le juge reste vert sur une vraie faute

Aucun juge n’a été corrigé ici (règle de la fiche) : chaque ligne rouvre la fiche du juge concerné.

- **LV-8** contrôle changé hors packs (scripts/pack-pub-livraison-qa.mjs, app/controle/page.tsx) : node scripts/pack-pub-livraison-qa.mjs --partie=poste --racine={racine} ; verdict réel : PASS LV-8 — Onglet, ONGLETS (sous actif('packPub')), TITRES, NAV et le rendu ont gagné 'packs' ; diff limité | pack-pub-livraison-qa : PASS
- **LV-12** purge fabriquee (scripts/pack-pub-livraison-qa.mjs, lib/packPubPurge.ts) : node scripts/pack-pub-livraison-qa.mjs --partie=purge --racine={racine} ; verdict réel : PASS LV-12 — packsAPurger : 2 packs retenus sur 6 scénarios ; 20 au plus sur 25 éligibles, les plus anciens d'abord | pack-pub-livraison-qa : PASS
- **SG-3** adresse web message un (scripts/studio-garde-qa.mjs, docs/studio/modeles-messages.md) : node scripts/studio-garde-qa.mjs --racine={racine} ; verdict réel : PASS SG-3 — renvoie à modeles.ts, nomme les trois modèles, aucun texte complet recopié | studio-garde-qa : PASS
- **SG-4** Benj regarde après l’envoi (scripts/studio-garde-qa.mjs, docs/studio/seance.md) : node scripts/studio-garde-qa.mjs --racine={racine} ; verdict réel : PASS SG-4 — les étapes dans l'ordre, les interdits présents, aucune trace d'ElevenLabs | studio-garde-qa : PASS

## Autres erreurs

- NON VALIDÉ : témoin rouge : scripts/pub-locale-qa.mjs --juger-media=age
- NON VALIDÉ : témoin rouge : scripts/socle-pubs-qa.mjs 
- NON VALIDÉ : témoin rouge : scripts/pack-pub-livraison-qa.mjs --partie=route
- NON VALIDÉ : témoin rouge : scripts/pub-qa.mjs --juger-media=studio
- NON VALIDÉ : témoin rouge : scripts/pack-pub-dossier-qa.mjs --partie=page
- NON VALIDÉ : témoin rouge : scripts/pub-locale-qa.mjs --partie=gabarit
- NON VALIDÉ : témoin rouge : scripts/pack-pub-livraison-qa.mjs --partie=depot
- NON VALIDÉ : témoin rouge : scripts/pub-locale-qa.mjs --juger-media=pack

## Écarts entre la fiche et les juges actuels

- CR-10 : la fiche nomme CR-10 « le battement crieur appelé aussi en mode à sec » ; 026-122 l’a renommé CR-16 (CR-10 est devenu « un seul *_crieur.sql, numéro unique », partie horloge). La faute est jugée sur CR-16 ; une faute sur CR-10 ne s’écrit pas comme un remplacement de texte (elle exige un second fichier de migration). La liste du méta-juge (« CR-10 ») est périmée.
- PQ-9 : la fiche parle d’un regard.json d’une autre planche ; PQ-9 ne lit plus de regard.json (réécrit le 25/09, 026-128) et mesure que chaque plan est une transformation de produit.jpg. La faute jugée est un plan où le produit est remplacé par un aplat de 4 à 9 s.
- PB-8 : la fiche parle de la migration changée d’un caractère après l’essai à sec ; PB-8 relit l’empreinte du jumeau nu que l’essai à sec a exécuté (la migration seule est la faute de PB-5, aussi mutée).
- SG-4 : la faute est la permutation réelle des étapes 9 (Benj regarde) et 11 (envoi) de docs/studio/seance.md.
- SP-2 et SP-4 : video-qa.mjs et visages-qa.mjs sont mutés eux-mêmes, dans la copie ; une seule entrée par faute (les deux entrées « explicites » du premier jet étaient des doublons exacts).

## Témoins (copie intacte : code 0 attendu)

- Témoin node scripts/pack-pub-base-qa.mjs --racine={racine} : code 0, 3.408 s
- Témoin node scripts/pack-pub-paiement-qa.mjs --partie=noyau --racine={racine} : code 0, 108.54 s
- Témoin node scripts/pack-pub-paiement-qa.mjs --partie=route --racine={racine} : code 0, 9.915 s
- Témoin node scripts/cgu-pack-pub-qa.mjs --racine={racine} : code 0, 55.291 s
- Témoin node scripts/pack-pub-dossier-qa.mjs --partie=api --racine={racine} : code 0, 31.44 s
- Témoin node scripts/pack-pub-dossier-qa.mjs --partie=page --racine={racine} : code 1, 9.941 s
- Témoin node scripts/pack-pub-livraison-qa.mjs --partie=depot --racine={racine} : code 1, 64.505 s
- Témoin node scripts/pack-pub-livraison-qa.mjs --partie=route --racine={racine} : code 1, 8.976 s
- Témoin node scripts/pack-pub-livraison-qa.mjs --partie=poste --racine={racine} : code 0, 8.258 s
- Témoin node scripts/pack-pub-livraison-qa.mjs --partie=purge --racine={racine} : code 0, 13.148 s
- Témoin node scripts/socle-pubs-qa.mjs --racine={racine} : code 1, 0.403 s
- Témoin node scripts/pub-locale-qa.mjs --partie=gabarit --racine={racine} : code 1, 19.429 s
- Témoin node scripts/juges-026-pubs-contenu-mutations.mjs --juger-media=pack --racine={racine} : code 2, 0.05 s
- Témoin node scripts/juges-026-pubs-contenu-mutations.mjs --juger-media=age --racine={racine} : code 2, 0.097 s
- Témoin node scripts/pub-locale-qa.mjs --partie=textes --racine={racine} : code 0, 0.938 s
- Témoin node scripts/studio-garde-qa.mjs --racine={racine} : code 0, 2.702 s
- Témoin node scripts/juges-026-pubs-contenu-mutations.mjs --juger-media=studio --racine={racine} : code 2, 0.5 s
- Témoin node scripts/crieur-qa.mjs --partie=route --racine={racine} : code 0, 104.786 s
- Témoin node scripts/crieur-qa.mjs --partie=composer --racine={racine} : code 0, 0.631 s
- Témoin node scripts/crieur-qa.mjs --partie=horloge --racine={racine} : code 0, 0.344 s

## Mutations attrapées (code ≠ 0 sur le critère attendu)

- PB-3 politique écriture ajoutée : node scripts/pack-pub-base-qa.mjs --racine={racine} ; FAIL PB-3 — 2 politique(s) sur packs_pubs, une seule (en lecture) attendue
- PB-4 bucket public : node scripts/pack-pub-base-qa.mjs --racine={racine} ; FAIL PB-4 — bucket packs-pubs : public ≠ false (« insert into storage.buckets(id, name, public, file_size_limit) values('packs-pubs', 'packs-pubs', true, 20971520) on co… »)
- PB-3 revoke retiré : node scripts/pack-pub-base-qa.mjs --racine={racine} ; FAIL PB-3 — revoke all … on public.packs_pubs from … : absent
- PB-2 état livree retiré : node scripts/pack-pub-base-qa.mjs --racine={racine} ; FAIL PB-2 — etat : liste brouillon,payee,fabriquee, attendue brouillon,payee,fabriquee,livree
- PB-8 jumeau nu changé après essai à sec : node scripts/pack-pub-base-qa.mjs --racine={racine} ; FAIL PB-8 — .orchestre/preuves/026-114/essai-a-sec.txt : empreinte 72bf995196bd… ≠ celle du jumeau courant 50bcc2b7e280… : l'essai a porté sur un autre texte
- PB-5 migration changée, jumeau inchangé : node scripts/pack-pub-base-qa.mjs --racine={racine} ; FAIL PB-5 — la migration a 12 instruction(s), le nu coupé 12 ; première différence à l'instruction 1
- PP-3 pack en mode abonnement : node scripts/pack-pub-paiement-qa.mjs --partie=noyau --racine={racine} ; FAIL PP-3 — aiguiller(pack-abonnement) = "pack_pub", "orphelin" attendu
- PP-4 introuvable avalé : node scripts/pack-pub-paiement-qa.mjs --partie=noyau --racine={racine} ; FAIL PP-4 — la branche pack_pub ne lève pas d'erreur sur 'introuvable'
- PP-5 garde brouillon retirée : node scripts/pack-pub-paiement-qa.mjs --partie=noyau --racine={racine} ; FAIL PP-5 — encaisserPackPub ne met pas à jour avec .eq('etat', 'brouillon')
- PP-6 facture absente : node scripts/pack-pub-paiement-qa.mjs --partie=noyau --racine={racine} ; FAIL PP-6 — invoice_creation.enabled ≠ true ; invoice_creation.invoice_data.footer ≠ mentionFranchise('auto') («  » ≠ « TVA non applicable, art. 293 B du CGI. »)
- PP-6 metadata paiement absentes : node scripts/pack-pub-paiement-qa.mjs --partie=noyau --racine={racine} ; FAIL PP-6 — payment_intent_data.metadata ≠ metadata (undefined ≠ {"uid":"uid-essai-0001","type":"pack_pub","pack_id":"pack-essai-0001"})
- PP-9 drapeau levé : node scripts/pack-pub-paiement-qa.mjs --partie=route --racine={racine} ; FAIL PP-9 — packPub : false → true (aucun autre drapeau ne doit changer) ; packPub = true, false attendu
- PP-7 Stripe changé : node scripts/pack-pub-paiement-qa.mjs --partie=noyau --racine={racine} ; FAIL PP-7 — lib/stripe.ts modifié par rapport à HEAD
- CG-3 mention IA retirée : node scripts/cgu-pack-pub-qa.mjs --racine={racine} ; FAIL CG-3 — phrase(s) absente(s) du bloc : « Voix générée par IA »
- CG-4 résultats assurés : node scripts/cgu-pack-pub-qa.mjs --racine={racine} ; FAIL CG-4 — « résultats assurés »
- CG-2 3 bis modifié : node scripts/cgu-pack-pub-qa.mjs --racine={racine} ; FAIL CG-2 — le bloc id="site" (« 3 bis ») a changé par rapport à HEAD
- PD-1 photo autre artisan acceptée : node scripts/pack-pub-dossier-qa.mjs --partie=api --racine={racine} ; FAIL PD-1 — refus-photo-autre-artisan accepté à tort (champ photo attendu en refus) ; refus-photo-hors-bucket accepté à tort (champ photo attendu en refus)
- PD-1 accord personnes ignoré : node scripts/pack-pub-dossier-qa.mjs --partie=api --racine={racine} ; FAIL PD-1 — refus-personne-sans-accord accepté à tort (champ accord attendu en refus)
- PD-1 chiffres voix acceptés : node scripts/pack-pub-dossier-qa.mjs --partie=api --racine={racine} ; FAIL PD-1 — refus-chiffre-texte-voix accepté à tort (champ texte_voix attendu en refus)
- LV-13 erreur purge levée : node scripts/pack-pub-livraison-qa.mjs --partie=purge --racine={racine} ; FAIL LV-13 — une erreur est levée (throw) : elle doit être comptée et rendue, jamais levée
- PL-T4 RGE dans textes : node scripts/pub-locale-qa.mjs --partie=textes --racine={racine} ; FAIL PL-T4 — terme interdit trouvé : « RGE »
- SG-1 activité déclarée non contrôlée : node scripts/studio-garde-qa.mjs --racine={racine} ; FAIL SG-1 — activite_absente : code 0, 3 attendu
- SG-3 essai préparé message un : node scripts/studio-garde-qa.mjs --racine={racine} ; FAIL SG-3 — porte « j’ai préparé »
- CR-16 battement aussi à sec : node scripts/crieur-qa.mjs --partie=route --racine={racine} ; FAIL CR-16 — ops_battement( ne suit pas enregistrerPassage(
- CR-1 motif inconnu : node scripts/crieur-qa.mjs --partie=composer --racine={racine} ; FAIL CR-1 — factures : plans/promesses.md ne contient pas mot pour mot « preuve-fautive-introuvable »
- CR-2 Presti répond seul : node scripts/crieur-qa.mjs --partie=composer --racine={racine} ; FAIL CR-2 — factures : « Presti répond » sans « Studio »/« Signature »
- CR-3 quatre publications : node scripts/crieur-qa.mjs --partie=composer --racine={racine} ; FAIL CR-3 — composerLot(mois-neuf) : 4 publication(s), 3 au plus attendues ; composerLot(mois-neuf)[3] : deux publications sur instagram dans le même lot ; composerLot(fait-recent) : 4 publication(s), 3 au plus attendues ; composerLot(fait-recent)[3] : deux publications sur instagram dans le même lot (et 2 autre(s))
- CR-7 scheduledTime envoyé : node scripts/crieur-qa.mjs --partie=route --racine={racine} ; FAIL CR-7 — create-post : clé non permise dans le corps : scheduledTime ; create-post : scheduledTime présent dans le corps (interdit depuis le 27/09, R24) ; create-post : clé non permise dans le corps : scheduledTime ; create-post : scheduledTime présent dans le corps (interdit depuis le 27/09, R24)
- CR-5 jeton non contrôlé : node scripts/crieur-qa.mjs --partie=route --racine={racine} ; FAIL CR-5 — aucune réponse 401 dans GET
- CR-11 politique Crieur ajoutée : node scripts/crieur-qa.mjs --partie=horloge --racine={racine} ; FAIL CR-11 — 1 politique(s) sur crieur_posts, aucune attendue
- CR-12 jeton appel en clair : node scripts/crieur-qa.mjs --partie=horloge --racine={racine} ; FAIL CR-12 — un jeton semble écrit en clair après 'Bearer '
