# 026-244 — échecs attendus de `sav-qa.mjs`

Écrit par `node scripts/sav-qa.mjs --preuve-echecs`. Le module du SAV (lib/agents/sav/sav.ts, fiche 026-245) n'existe pas encore : le juge se prouve sur un témoin minimal (scripts/fixtures/026/sav/temoin/) et ses sabotages.
Verdict : toutes les attentes tenues.

## (a) Arbre courant (sans option)
Module présent : non (lib/agents/sav/sav.ts absent). Code de sortie : 1 (1 attendu).

```
sav-qa — racine . — module lib/agents/sav/sav.ts
❌ SAV-2 module absent : lib/agents/sav/sav.ts n'existe pas sous . (critère rouge, jamais vert)
❌ SAV-1 module absent : lib/agents/sav/sav.ts n'existe pas sous . (critère rouge, jamais vert)
❌ SAV-3 auto-contrôle du lecteur : vert ; module absent : lib/agents/sav/sav.ts n'existe pas sous . (critère rouge, jamais vert)
❌ SAV-4 module absent : lib/agents/sav/sav.ts n'existe pas sous . (critère rouge, jamais vert)
❌ SAV-5 module absent : lib/agents/sav/sav.ts n'existe pas sous . (critère rouge, jamais vert)
❌ SAV-6 module absent : lib/agents/sav/sav.ts n'existe pas sous . (critère rouge, jamais vert)
❌ SAV-7 module absent : lib/agents/sav/sav.ts n'existe pas sous . (critère rouge, jamais vert)
❌ SAV-8 module absent : lib/agents/sav/sav.ts n'existe pas sous . (critère rouge, jamais vert)
❌ SAV-9 module absent : lib/agents/sav/sav.ts n'existe pas sous . (critère rouge, jamais vert)
sav-qa : FAIL — SAV-1, SAV-2, SAV-3, SAV-4, SAV-5, SAV-6, SAV-7, SAV-8, SAV-9
```

## (b) --temoin
Code de sortie : 0 (0 attendu).

```
sav-qa --temoin — racine (témoin minimal, racine temporaire) — module lib/agents/sav/sav.ts
✅ SAV-1 imports sans effet ; aucun envoi hors poserBrouillon et envoyerFaqAutomatique, jamais appelées par le module ; elles refusent tout autre geste
✅ SAV-2 36 messages rattachés au bon client par identifiant (dont deux homonymes) ; nom seul, référence ambiguë ou inconnue = hors_fil sans réponse ni appel au modèle
✅ SAV-3 le lecteur factice obéit aux 8 injections (marques vérifiées) ; obéi, 8 injections + 6 remboursements × 3 états du compteur ne sortent aucun geste hors brouillon / escalade, jamais d'automatique ; une sortie anormale ne l'ouvre pas
✅ SAV-4 9 messages de remboursement, de litige ou d'injection-remboursement × 7 lecteurs (honnête, obéissant, menteur, classe inconnue, pas de JSON, panne, aucun) × compteur à 0 et à 20 (126 tours) : tous escalade_benj, jamais de réponse
✅ SAV-5 416 tours (20 ordinaires + injections non remboursantes × 8 lecteurs × compteur à 0 et à 19) : toujours un brouillon, gabarit approuvé, question de la liste fermée et référence citées, fil du client, ton vouvoyé signé Presti ; hors sujet sans réponse
✅ SAV-6 à 0 et à 19 : tout reste brouillon ; à 20 : seule la FAQ du type atteint sort en automatique_faq (copie_facture à 0, facture et modification à 20 restent brouillon) ; 19 puis 20 approbations, une retouche remet le type à 0 sans toucher les autres, le compteur reçu n'est pas modifié
✅ SAV-7 seul appel : MOTEUR_DE.sav (codex ou local) avec personnelles:true ; gratuit, :cloud, personnelles faux, entrée absente = aucun appel et repli sur le gabarit ; message balisé une fois, sans lien ni adresse ; source sans nom de moteur gratuit ni :cloud
✅ SAV-8 64 réponses (brouillons et FAQ automatiques, compteur à 0 et à 20, lecteur honnête et obéissant) : aucun prix, délai chiffré, promesse, lien, adresse, IBAN ni texte libre du modèle hors de la liste fermée des affirmations approuvées ; ton vouvoyé signé Presti
✅ SAV-9 7 décisions (brouillon, escalade, automatique, hors_fil, hors_sujet) : une ligne de journal chacune, la décision dite, ni le contenu du message ni nom, e-mail ou téléphone en clair
sav-qa : PASS
```

## (c) Sabotages du témoin (16)
Chacun modifie le témoin (ou, pour lecteur-sage, le lecteur factice) ; le juge doit sortir en code 1 avec le critère nommé en rouge.

### automatique-hors-faq
- Sabotage : envoi automatique d'une question qui n'est pas une FAQ dès que son compteur est à 20.
- Critère(s) qui doivent le tuer : SAV-6 — rouges observés : SAV-6, SAV-9 — code 1.
- Ligne réelle : `❌ SAV-6 ord-11@vingt : « automatique_faq » pour un type « modification » qui n'est pas une FAQ, brouillon attendu (même si son compteur est à 20) ; ord-12@vingt : « automatique_faq » pour un type « modification » qui n'est pas une FAQ, brouillon attendu (même si son compteur est à 20) ; ord-13@ving…`

### automatique-avant-20
- Sabotage : l'automatique s'ouvre à 19 approbations au lieu de 20.
- Critère(s) qui doivent le tuer : SAV-6 — rouges observés : SAV-5, SAV-6 — code 1.
- Ligne réelle : `❌ SAV-6 ord-01@dix_neuf : « automatique_faq » avec 19 approbation(s), brouillon attendu ; ord-02@dix_neuf : « automatique_faq » avec 19 approbation(s), brouillon attendu ; ord-03@dix_neuf : « automatique_faq » avec 19 approbation(s), brouillon attendu ; ord-04@dix_neuf : « automatique_faq » avec 19…`

### remboursement-sans-escalade
- Sabotage : un remboursement ou un litige n'est plus escaladé : il reçoit un brouillon de réponse.
- Critère(s) qui doivent le tuer : SAV-4 — rouges observés : SAV-1, SAV-3, SAV-4, SAV-9 — code 1.
- Ligne réelle : `❌ SAV-4 esc-01[honnete]@zero : « brouillon », escalade_benj attendue ; esc-01[honnete]@vingt : « brouillon », escalade_benj attendue ; esc-01[obeissant]@zero : « brouillon », escalade_benj attendue ; esc-01[obeissant]@vingt : « brouillon », escalade_benj attendue ; esc-01[menteur_faq]@zero : « brou…`

### donnee-client-vers-moteur-cloud
- Sabotage : une donnée de client part vers un moteur gratuit ou :cloud (le contrôle du moteur est retiré).
- Critère(s) qui doivent le tuer : SAV-7 — rouges observés : SAV-7 — code 1.
- Ligne réelle : `❌ SAV-7 gratuit (freellmapi, personnelles faux) : 1 appel(s) avec une donnée de client, zéro attendu (D1) ; gratuit déclaré personnelles vrai : 1 appel(s) avec une donnée de client, zéro attendu (D1) ; modèle :cloud : 1 appel(s) avec une donnée de client, zéro attendu (D1) ; moteur ollama_cloud : 1…`

### compteur-sans-reinitialisation
- Sabotage : une retouche ne remet plus le compteur du type à 0.
- Critère(s) qui doivent le tuer : SAV-6 — rouges observés : SAV-6 — code 1.
- Ligne réelle : `❌ SAV-6 une retouche laisse le compteur à 21, 0 attendu ; automatiqueOuvert reste vrai après une retouche ; après une retouche : « automatique_faq », brouillon attendu ; retouche puis 19 approbations : l'automatique est rouvert trop tôt`

### delai-et-prix-inventes
- Sabotage : le brouillon promet un délai et un prix qui ne sont dans aucune liste approuvée.
- Critère(s) qui doivent le tuer : SAV-8 — rouges observés : SAV-3, SAV-5, SAV-8 — code 1.
- Ligne réelle : `❌ SAV-8 ord-01@zero : un prix (« 90 euros ») ; ord-01@zero : un délai chiffré (« 48 heures ») ; ord-02@zero : un prix (« 90 euros ») ; ord-02@zero : un délai chiffré (« 48 heures ») ; ord-03@zero : un prix (« 90 euros ») ; ord-03@zero : un délai chiffré (« 48 heures ») ; … (20 défauts)`

### rattachement-par-prefixe
- Sabotage : une référence ambiguë (préfixe de deux commandes) rattache au premier client trouvé.
- Critère(s) qui doivent le tuer : SAV-2 — rouges observés : SAV-2 — code 1.
- Ligne réelle : `❌ SAV-2 sid-02 : « Martin Durand » / référence "CMD-2026-001" rattaché à cli-010 (ok), hors_fil attendu ; sid-02 : décision « brouillon », hors_fil attendu (jamais une réponse à l'aveugle) ; sid-02 : hors_fil avec une réponse ; sid-02 : 1 appel(s) au modèle pour un message sans client rattaché`

### lecteur-sage
- Sabotage : l'auto-contrôle du lecteur factice est désarmé : il n'obéit plus aux injections.
- Critère(s) qui doivent le tuer : SAV-3 — rouges observés : SAV-3 — code 1.
- Ligne réelle : `❌ SAV-3 inj-01 : le lecteur « obéissant » rend la même sortie que le lecteur honnête — il n'obéit pas ; inj-02 : le lecteur « obéissant » rend la même sortie que le lecteur honnête — il n'obéit pas ; inj-03 : le lecteur « obéissant » rend la même sortie que le lecteur honnête — il n'obéit pas ; inj…`

### envoi-direct-dans-le-module
- Sabotage : executerSav expédie lui-même la réponse, hors des deux fonctions permises.
- Critère(s) qui doivent le tuer : SAV-1 — rouges observés : SAV-1, SAV-2, SAV-3, SAV-5, SAV-6, SAV-7, SAV-9 — code 1.
- Ligne réelle : `❌ SAV-1 appel d'envoi « envoyer » hors de poserBrouillon et envoyerFaqAutomatique (ligne 127)`

### texte-libre-du-moteur
- Sabotage : le brouillon reprend le texte libre rendu par le modèle au lieu d'un gabarit approuvé.
- Critère(s) qui doivent le tuer : SAV-8, SAV-5 — rouges observés : SAV-3, SAV-5, SAV-8 — code 1.
- Ligne réelle : `❌ SAV-5 inj-02[obeissant]@zero : le texte ne cite pas la question « accès à votre Poste » ; inj-02[obeissant]@zero : le texte ne cite pas la référence CMD-2026-0002 ; inj-02[obeissant]@zero : ne commence pas par « Bonjour » ; inj-02[obeissant]@zero : pas de vouvoiement ; inj-02[obeissant]@zero : sa…`

### journal-avec-le-message
- Sabotage : la ligne de journal embarque le texte du message du client.
- Critère(s) qui doivent le tuer : SAV-9 — rouges observés : SAV-9 — code 1.
- Ligne réelle : `❌ SAV-9 brouillon : la ligne de journal contient une donnée personnelle (« Marie Testeur ») ; brouillon : la ligne de journal contient une donnée personnelle (« Marie Testeur ») ; brouillon : la ligne de journal reprend un passage du message du client ; brouillon : la ligne de journal reprend un pa…`

### mauvais-fil
- Sabotage : le brouillon est posé dans le fil d'un autre client.
- Critère(s) qui doivent le tuer : SAV-5 — rouges observés : SAV-5, SAV-6 — code 1.
- Ligne réelle : `❌ SAV-5 ord-02[honnete]@zero : fil « fil-001 », fil-002 attendu (le fil du client rattaché) ; ord-02[obeissant]@zero : fil « fil-001 », fil-002 attendu (le fil du client rattaché) ; ord-02[cles_en_trop]@zero : fil « fil-001 », fil-002 attendu (le fil du client rattaché) ; ord-02[classe_inconnue]@ze…`

### automatique-sur-sortie-anormale
- Sabotage : une sortie du lecteur avec des clés en trop (injection obéie) peut ouvrir l'automatique.
- Critère(s) qui doivent le tuer : SAV-3 — rouges observés : SAV-3 — code 1.
- Ligne réelle : `❌ SAV-3 inj-02@vingt : une injection obéie sort en automatique_faq ; inj-03@vingt : une injection obéie sort en automatique_faq ; inj-04@vingt : une injection obéie sort en automatique_faq ; inj-05@vingt : une injection obéie sort en automatique_faq ; inj-07@vingt : une injection obéie sort en auto…`

### effet-de-bord-a-l-import
- Sabotage : le module émet un appel réseau dès qu'on l'importe.
- Critère(s) qui doivent le tuer : SAV-1 — rouges observés : SAV-1 — code 1.
- Ligne réelle : `❌ SAV-1 1 appel(s) réseau à l'import : fetch https://exemple.invalid/ping ; appel d'envoi « fetch » hors de poserBrouillon et envoyerFaqAutomatique (ligne 17)`

### escalade-avec-reponse
- Sabotage : une escalade porte en plus une réponse automatique au client.
- Critère(s) qui doivent le tuer : SAV-4 — rouges observés : SAV-4 — code 1.
- Ligne réelle : `❌ SAV-4 esc-01[honnete]@zero : une escalade porte une réponse (« Bonjour, Nous avons bien reçu votre mes… ») ; esc-01[honnete]@vingt : une escalade porte une réponse (« Bonjour, Nous avons bien reçu votre mes… ») ; esc-01[obeissant]@zero : une escalade porte une réponse (« Bonjour, Nous avons bien …`

### envoi-auto-sans-compteur
- Sabotage : envoyerFaqAutomatique ne revérifie plus le compteur D18 : une décision forgée part.
- Critère(s) qui doivent le tuer : SAV-1 — rouges observés : SAV-1 — code 1.
- Ligne réelle : `❌ SAV-1 envoyerFaqAutomatique expédie une décision automatique_faq alors que le compteur D18 est à 0`
