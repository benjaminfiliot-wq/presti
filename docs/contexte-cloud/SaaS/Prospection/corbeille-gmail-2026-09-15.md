# Ménage Gmail — corbeille (2026-09-15)

Ce fichier journalise le ménage automatique dans la boîte Gmail de benjaminfiliot@gmail.com.

- Action réalisée : déplacement vers la CORBEILLE uniquement (`trash_thread`). Rien n'est supprimé définitivement.
- **Tout est récupérable pendant 30 jours** depuis la Corbeille Gmail (Gmail supprime définitivement après 30 jours, comportement standard, pas une action de cet agent).
- Sont exclus (gardés) : tout fil où benjaminfiliot@gmail.com a écrit, tout fil où une personne écrit à Benj personnellement, mails suivis, banque/impôts/URSSAF/INPI/administration/avocat/contrats/factures/paiements (Stripe, Vercel, Supabase, OVH, registrar, Google Workspace), sécurité de compte récente (<7j), Publora, Resend, recrutement/mission avec une vraie personne, clients/artisans qui répondent. En cas de doute → gardé.
- Pour reprendre : voir la section « Reprise » tout en bas, qui indique la dernière requête et la dernière page traitées.

---

## Journal par requête

### Requête 1 — `category:promotions -is:starred`
- Heure : 22:05
- Fils vus : 0 (résultat vide)
- Mis à la corbeille : 0
- Gardés : 0
- Rien à traiter pour cette requête.

### Requête 2 — `category:social -is:starred`
- Heure : 22:05
- Fils vus : 0 (résultat vide)
- Mis à la corbeille : 0
- Gardés : 0

### Requête 3 — `category:forums -is:starred`
- Heure : 22:05
- Fils vus : 0 (résultat vide)
- Mis à la corbeille : 0
- Gardés : 0

### Requête 4 — `category:updates -is:starred`
- Heure : 22:05
- Fils vus : 0 (résultat vide)
- Mis à la corbeille : 0
- Gardés : 0

### Requête 5 — `category:primary -is:starred -in:sent (unsubscribe OR "se désabonner" OR newsletter OR noreply OR no-reply OR notification)`
- Volume estimé total : ~201 fils
- Page 1 (pageSize 50, sans pageToken → nextPageToken `05275941955169770942`)
- Heure : 22:06–22:10
- Fils vus : 50
- Mis à la corbeille : 36
- Gardés : 14

Gardés (page 1), avec raison :
1. `1a0a6dea2b0543ff` — no-reply@accounts.google.com — « Alerte de sécurité » (accès Claude for Gmail autorisé) — sécurité de compte <7j
2. `1a0a1526502e4708` — noreply@supabase.com — « OAuth Application Approval » — Supabase (vendor à garder) + sécurité
3. `1a0a1226f6ac190b` — noreply@tm.openai.com — « New sign-in to your OpenAI account » — alerte de sécurité <7j
4. `1a0a121fb6b87144` — noreply-accounts@google.com — « Vous avez partagé certaines données de votre compte Google avec OpenAI » — sécurité de compte <7j
5. `1a0a007654e162f3` — noreply-accounts@google.com — « ... avec Whop » — sécurité de compte <7j
6. `1a09ffc72fc28eb6` — noreply-accounts@google.com — « ... avec freecash.com » — sécurité de compte <7j
7. `1a09e47d1346f4cd` — notifications@stripe.com — « Votre virement de 28,11 € pour presti est en route » — Stripe/paiement Presti
8. `1a09bdb17bae34fd` — noreply-accounts@google.com — « ... avec oiswaerqwzcvhcpwvybi.supabase.co » — sécurité de compte <7j
9. `1a09af392c6a4f24` — no-reply@email.publora.com — « Your account is connected » — Publora (à garder explicitement)
10. `1a097826aed8ffab` — benjaminfiliot@gmail.com (envoyé à montigaud.david@free.fr) + bounce mailer-daemon — fil où Benj a écrit
11. `1a0960e1c2a1c699` — noreply-accounts@google.com — « ... avec forgegui.com » — sécurité de compte <7j
12. `1a095ffbcc191620` — noreply@supabase.com — « OAuth Application Approval » — Supabase + sécurité
13. `1a095ff804f6098d` — noreply-accounts@google.com — « ... avec Claude » — sécurité de compte <7j
14. `1a09507ed625c37c` — noreply-accounts@google.com — « ... avec cursor.sh » — sécurité de compte <7j

Mis à la corbeille (page 1, 36 fils) : newsletters/promos (Venum, Gymshark, Higgsfield, ElevenLabs, Skool, FrameRate, sean@send.seannal.com), confirmations d'inscription jeux-concours/sondages rémunérés (Maximiles, Mingle/Respondi, Swagbucks, IsurveyWorld, Mon Opinion Compte), notifications produit (ChatGPT Plus « nouveau plan »/« bienvenue », Lovable, Cursor, HeyGen/HyperFrames connecté, code de vérification Whop), notifications TikTok (« SEI t'a envoyé un message »), et accusés de réception automatiques de candidatures spontanées (Digital Recruiters, ATS « Système U » et poste « conseiller vendeur végétal » — auto-réponses robot, pas un vrai recruteur).

- Page 2 (pageToken `05275941955169770942` → nextPageToken `08928151281711256614`)
- Heure : 22:11–22:16
- Fils vus : 50
- Mis à la corbeille : 35
- Gardés : 15

Gardés (page 2), avec raison :
1. `1a090e729f013c14` — Benj a écrit (prospection à contact@dvpenergie.fr) + bounce
2. `1a090d3748828284` — Benj a écrit (prospection à Ipelec08@gmail.com) + bounce
3. `1a090a6a007b8c59` — no-reply@email.publora.com — « Your account is connected » — Publora (à garder)
4. `1a08d455d82ba212` — no-reply@accounts.google.com — « Alerte de sécurité pour bernardgab246@gmail.com » — alerte sécurité <7j (adresse de Benj utilisée comme récupération d'un compte tiers)
5. `1a08d450e8403b4d` — no-reply@accounts.google.com — « Votre compte Google a bien été récupéré » (copie bernardgab246) — alerte sécurité <7j
6. `1a08d16dd5df25c7` — noreply-accounts@google.com — « partagé... avec Claude » — sécurité <7j
7. `1a08d0d6e4dc8a71` — no-reply@accounts.google.com — « Alerte de sécurité » (mot de passe modifié) — sécurité <7j, important
8. `1a08ad7f664a04ce` — noreply-accounts@google.com — « partagé... avec ElevenLabs » — sécurité <7j
9. `1a087ac101a1376f` — noreply-accounts@google.com — « partagé... avec Superhuman Docs » — sécurité <7j
10. `1a087a690f098cfd` — noreply-accounts@google.com — « partagé... avec Notion » — sécurité <7j
11. `1a085a2acd1f3cf8` — no-reply@accounts.google.com — « Alerte de sécurité » (LinkedIn autorisé) — sécurité <7j
12. `1a0856bcfd1ec5a2` — no-reply@accounts.google.com — « Alerte de sécurité pour bernardgab246@gmail.com » — sécurité <7j
13. `1a08298b6e2bb430` — noreply-accounts@google.com (2 msgs) — « partagé... avec Claude » — sécurité, pile 7j
14. `1a07d5803f7129ca` — no-reply@accounts.google.com (3 msgs) — « Alerte de sécurité » (mot de passe d'application créé pour « presti ») — lié directement à l'infra Presti/messagerie, gardé même légèrement >7j vu l'importance
15. `1a072d1fb2292134` — Benj a écrit (« presti », lien du site à briyan.penaud@laposte.net) + bounce

Mis à la corbeille (page 2, 35 fils) : newsletters/promos (Gymshark, Venum, Chess.com, Higgsfield, Lovable, sean@send.seannal.com, FrameRate, Hyperframe.ai, HeyGen, Vercel « Get ready for global scale »/« Manage your domains », OpenAI « Vos photos retouchées », Firebase « Welcome », Google Developer Program « Welcome »), notifications TikTok, e-learning IPMS (activation de compte), LegalStart (pub auto-entrepreneur), 2 emails marketing/sondage BoursoBank (offre carte METAL, enquête satisfaction — pub bancaire, pas relevé/alerte), et notifications « Google : vous avez partagé des données » vieilles de plus de 7 jours sans lien avec une alerte de sécurité réelle.

## Reprise Codex — 16/09/2026

- Recherche conservatrice dans la boîte de réception : promotions, newsletters et notifications automatiques, avec exclusions explicites pour factures, paiements, virements, sécurité, candidatures, administratif, RIB et devis.
- Un fil marketing Resend (« You’re Invited… ») puis 50 conversations automatisées anciennes ont été placés dans la corbeille, soit 51 conversations supplémentaires. Gmail a confirmé « 50 conversations placées dans la corbeille » pour le lot principal.
- Les catégories Promotions, Réseaux sociaux, Forums et Mises à jour ne contenaient aucun fil supplémentaire au moment du contrôle.
- Conservés volontairement : échanges humains, Supabase, Anthropic à action requise, banques et virements, Stripe, TELUS, université et démarches administratives, identité et mots de passe, Legalstart, candidatures, contrats IPMS et la dernière alerte de stockage Gmail à 98 %.
- Trois nouvelles promotions (Venum, Maximiles, Swagbucks) sont arrivées après la sélection du lot principal et restent dans la boîte de réception en attente d’une confirmation séparée.
- La corbeille n’a pas été vidée ; les éléments restent récupérables selon la politique Gmail.


## Restaurés le 16/09

Réparation après la vérification indépendante du 16/09, 21 h : des messages utiles avaient été jetés par erreur (Publora pourtant « à garder », sécurité de compte, candidatures, suivi de commande…).

- Heure : 21:14
- Méthode : recherche dans la corbeille (`in:trash`, `includeTrash`), puis `untrash_thread` fil par fil. Aucune autre action : aucun libellé ajouté ou retiré, rien marqué comme lu, rien supprimé.
- Contrôle après coup : la même recherche `in:trash` ne renvoie plus rien, et les 15 fils n'ont plus le libellé TRASH.
- **À savoir :** sortir un fil de la corbeille ne le remet pas dans la boîte de réception, car ces fils n'avaient déjà plus le libellé « Boîte de réception » quand ils étaient dans la corbeille. Les 15 fils sont dans « Tous les messages ». Pour les revoir dans la boîte de réception, il faut les y déplacer à la main.

Fils restaurés (15) :

1. `1a09af392c6a4f24` — no-reply@email.publora.com — « Your account is connected » (13/09)
2. `1a090a6a007b8c59` — no-reply@email.publora.com — « Your account is connected » (11/09)
3. `1a0a55358dbea0dd` — no-reply@message.digitalrecruiters.com — « Votre candidature spontanée » (15/09)
4. `1a09fb75c83c5219` — no-reply@message.digitalrecruiters.com — « Suite à votre candidature pour le poste CONSEILLER(E) VENDEUR(EUSE) VEGETAL » (14/09)
5. `1a061a91d73c2b63` — no-reply@message.digitalrecruiters.com — « Votre candidature pour le poste Employé commercial libre-service H/F » (02/09)
6. `1a0788d5787db6b9` — no-reply@accounts.google.com — « Alerte de sécurité » (nouvelle connexion, 06/09)
7. `1a0681f1c0248689` — no-reply@accounts.google.com — « Alerte de sécurité » (nouvelle connexion, 03/09)
8. `1a0a14ea1e697378` — noreply@tm.openai.com — « ChatGPT - Votre nouveau plan » (14/09)
9. `1a06c470c5af419d` — sc-noreply@google.com — « Surveiller le trafic de la recherche Google vers https://prestiapp.fr/ » (04/09)
10. `1a0677338c92293b` — no-reply@sendcloud.com — « Votre commande NM1659246 est arrivée » (03/09)
11. `1a059d3a8659744f` — no-reply@sendcloud.com — « Colissimo est en chemin » (31/08)
12. `1a061d3440a34ece` — noreply@notif-colissimo-laposte.info — « Votre colis a bien été livré ! » (02/09)
13. `1a059bd26f49529d` — noreply@notif-colissimo-laposte.info — « Votre colis arrive ! » (31/08)
14. `1a0810c920787d1d` — noreply@t.eu2.learnworlds.com — « IPMS - Activez votre espace e-learning pour accéder à vos formations » (08/09)
15. `1a095a3e8d2f6068` — support@passculture.app — « Ton accès VIP est confirmé Benjamin 🌟 » (12/09)

Laissés dans la corbeille, car hors de la liste à restaurer : les autres messages pass Culture (lettres mensuelles « FLASHBACK », concours, recommandations).
