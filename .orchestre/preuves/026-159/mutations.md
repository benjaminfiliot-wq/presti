# ÉCHECS (1)
- TÉMOIN crieur-route en code 1 : FAIL CR-17 — pauseGenerale n'est pas importée de @/lib/agents/pause ; pauseGenerale( introuvable dans GET | crieur-qa : FAIL — CR-17

# Mutations prises (33)
PASS PB-3 — politique d’écriture ajoutée ; supabase/migrations/0102_packs_pubs.sql ; FAIL PB-3 — 2 politique(s) sur packs_pubs, une seule (en lecture) attendue
PASS PB-3 — revoke retiré ; supabase/migrations/0102_packs_pubs.sql ; FAIL PB-3 — revoke all … on public.packs_pubs from … : absent
PASS PB-4 — bucket rendu public ; supabase/migrations/0102_packs_pubs.sql ; FAIL PB-4 — bucket packs-pubs : public ≠ false (« insert into storage.buckets(id, name, public, file_size_limit) values('packs-pubs', 'packs-pubs', true, 20971520) on co… »)
PASS PB-2 — 'livree' retiré de la contrainte d’état ; supabase/migrations/0102_packs_pubs.sql ; FAIL PB-2 — etat : liste brouillon,payee,fabriquee, attendue brouillon,payee,fabriquee,livree
PASS PB-8 — jumeau nu changé d’un caractère après l’essai à sec ; supabase/migrations/_A_COLLER_sql_editor_0102_NU.sql ; FAIL PB-8 — .orchestre/preuves/026-114/essai-a-sec.txt : empreinte 72bf995196bd… ≠ celle du jumeau courant d4348b3c432a… : l'essai a porté sur un autre texte
PASS PP-3 — aiguiller rend pack_pub en mode abonnement ; lib/stripeAiguillage.ts ; FAIL PP-3 — aiguiller(pack-abonnement) = "pack_pub", "orphelin" attendu
PASS PP-4 — throw retiré sur introuvable ; app/api/stripe/webhook/route.ts ; FAIL PP-4 — la branche pack_pub ne lève pas d'erreur sur 'introuvable'
PASS PP-5 — .eq('etat', 'brouillon') retiré d’encaisserPackPub ; lib/packPubServeur.ts ; FAIL PP-5 — encaisserPackPub ne met pas à jour avec .eq('etat', 'brouillon')
PASS PP-6 — invoice_creation retiré ; lib/packPub.ts ; FAIL PP-6 — invoice_creation.enabled ≠ true ; invoice_creation.invoice_data.footer ≠ mentionFranchise('auto') («  » ≠ « TVA non applicable, art. 293 B du CGI. »)
PASS PP-6 — métadonnées absentes de payment_intent_data ; lib/packPub.ts ; FAIL PP-6 — payment_intent_data.metadata ≠ metadata (undefined ≠ {"uid":"uid-essai-0001","type":"pack_pub","pack_id":"pack-essai-0001"})
PASS PP-7 — une ligne changée dans lib/stripe.ts ; lib/stripe.ts ; FAIL PP-7 — lib/stripe.ts modifié par rapport à HEAD
PASS PP-9 — packPub levé (true) ; lib/flags.ts ; FAIL PP-9 — packPub : false → true (aucun autre drapeau ne doit changer) ; packPub = true, false attendu
PASS CG-3 — « Voix générée par IA » retirée ; app/cgu/page.tsx ; FAIL CG-3 — phrase(s) absente(s) du bloc : « Voix générée par IA »
PASS CG-4 — « résultats assurés » ajouté ; app/cgu/page.tsx ; FAIL CG-4 — « résultats assurés »
PASS CG-2 — un mot du 3 bis changé ; app/cgu/page.tsx ; FAIL CG-2 — le bloc id="site" (« 3 bis ») a changé par rapport à HEAD
PASS PD-1 — photo d’un autre artisan acceptée ; lib/packPubDossier.ts ; FAIL PD-1 — refus-photo-autre-artisan accepté à tort (champ photo attendu en refus)
PASS PD-1 — contrôle de l’accord des personnes retiré ; lib/packPubDossier.ts ; FAIL PD-1 — refus-personne-sans-accord accepté à tort (champ accord attendu en refus)
PASS PD-1 — chiffres admis dans texte_voix ; lib/packPubDossier.ts ; FAIL PD-1 — refus-chiffre-texte-voix accepté à tort (champ texte_voix attendu en refus)
PASS PD-5 — « 149 € » écrit en dur dans la page ; app/pubs/commander/page.tsx ; FAIL PD-5 — « 149 » écrit en dur : le prix doit venir de PRIX_PACK_PUB_TEXTE
PASS PD-7 — carte rendue hors drapeau ; app/dashboard/page.tsx ; FAIL PD-7 — 0 ligne(s) rendue(s) sous actif('packPubVente'), une seule attendue ; 1 ligne(s) ajoutée(s) hors de l'import et de la ligne rendue : <CartePackPub />
PASS LV-3 — DUREE_LIEN_S à 60 jours ; lib/packPubLivraison.ts ; FAIL LV-3 — DUREE_LIEN_S = 5184000, 2592000 attendu
PASS LV-4 — reconfirmation retirée de livrer ; app/api/controle/packs/[id]/route.ts ; FAIL LV-4 — exigerReconfirmation( absent (portée 'artisan', pour livrer)
PASS LV-4 — mise à jour écrite avant le journal ; app/api/controle/packs/[id]/route.ts ; FAIL LV-4 — le journal doit s'écrire AVANT la mise à jour
PASS LV-8 — une ligne de plus changée dans app/controle/page.tsx ; app/controle/page.tsx ; FAIL LV-8 — 1 ligne(s) retirée(s) hors du type Onglet et de TITRES : le diff doit rester limité à l'ajout de l'onglet packs
PASS LV-12 — purge qui retient aussi un pack fabriquee (filtres d’état et de lien retirés) ; lib/packPubPurge.ts ; FAIL LV-12 — scénarios : ["pack-purge-6","pack-purge-5","pack-purge-1","pack-purge-2"] rendu, ["pack-purge-1","pack-purge-2"] attendu (livree, expiré, jamais purgé, le plus ancien d'abord ; jamais payee/fabriquee/pas-expiré/déjà-purgé)
PASS LV-13 — purge qui lève au lieu de compter ; lib/packPubPurge.ts ; FAIL LV-13 — une erreur est levée (throw) : elle doit être comptée et rendue, jamais levée
PASS PL-T4 — « RGE » dans textes.md ; scripts/pack-pub/textes.mjs ; FAIL PL-T4 — terme interdit trouvé : « RGE »
PASS CR-1 — un fait dont le motif n’existe pas ; lib/crieur/faits.ts ; FAIL CR-1 — relances : lib/relances.ts ne contient pas mot pour mot « CADENCE_RELANCES = [2, 5, 11] »
PASS CR-2 — « Presti répond » seul dans un fait ; lib/crieur/faits.ts ; FAIL CR-2 — export-donnees : « Presti répond » sans « Studio »/« Signature »
PASS CR-3 — composerLot rend 4 publications ; lib/crieur/composer.ts ; FAIL CR-3 — composerLot(mois-neuf) : 4 publication(s), 3 au plus attendues ; composerLot(mois-neuf)[3] : deux publications sur instagram dans le même lot ; composerLot(fait-recent) : 4 publication(s), 3 au plus attendues ; composerLot(fait-recent)[3] : deux publications sur instagram dans le même lot (et 2 autre(s))
PASS CR-10 — deux migrations portent le numéro 0104 (le relais crée le doublon) ; supabase/migrations/0104_crieur.sql ; FAIL CR-10 — le numéro 0104 est aussi porté par 0104_crieur_doublon.sql : un numéro de migration ne se partage pas
PASS CR-11 — politique ajoutée à crieur_posts ; supabase/migrations/0104_crieur.sql ; FAIL CR-11 — 1 politique(s) sur crieur_posts, aucune attendue
PASS CR-12 — jeton en clair dans l’appel planifié ; supabase/migrations/0104_crieur.sql ; FAIL CR-12 — un jeton semble écrit en clair après 'Bearer '
