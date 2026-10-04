# 026-151 — contre-mutations


- Témoin source : code 0, 3.5 s. == groupe source — source /home/usine/reprise-1001/lot151/presti/.orchestre/travail/026-151/tour-1790905779054-3208321/source/temoin ==
✓ ORS-1 — présents dans /home/usine/reprise-1001/lot151/presti/.orchestre/travail/026-151/tour-1790905779054-3208321/source/temoin/bin
✓ ORS-2 — executant.mjs identique · antigravity.mjs identique (✓ maj : 2 fichier(s) changé(s) depuis /home/usine/reprise-1001/lot151/presti/.orchestre/travail/026-151/tour-1790905779054-3208321/source/temoin)
✓ ORS-3 — contenu sans presti/'SaaS'/Documents : true · --add-dir coffre+source : true · argv ["exec","-C","/tmp/orchestre-026-src-tMCkc6/projet","--add-dir","/tmp/orchestre-026-src-tMCkc6/coffre","--add-dir","/home/usine/reprise-1001/lot151/presti/.orchestre/travail/026-151/tour-1790905779054-3208321/source/temo
✓ ORS-4 — argv ["exec","-C","/tmp/orchestre-026-src-tMCkc6/projet","--add-dir","/tmp/orchestre-026-src-tMCkc6/coffre","--add-dir","/home/usine/reprise-1001/lot151/presti/.orchestre/travail/026-151/tour-1790905779054-3208321/source/temo
✓ ORS-5 — défaut gpt-6-sol dans l'argv : true · --model=gpt-6-luna transmis : true
✓ ORS-6 — sans-git : code 1, « instantané impossible » oui (rien de lancé) · exporte PROMPT : true · exporte instantane : true · PROMPT propre : true
✓ ORS-7 — sonde ok : true · sortie à l'import : 0 ligne(s) · exporte binaireCodex : true
✓ ORS-8 — défaut ["antigravity","codex","claude-code"] (attendu ["antigravity","codex","claude-code"]) · valider refuse qwen : true · sonde --moteur=qwen code 2 : true (code 2) · presti après maj : sans fantômes : true · orchestre.mjs identique : true · executant.mjs identique : true · antigravity.mjs identique : true
✓ ORS-NR — code 0 · ✓ tous les contrôles passent — dossier d'essai : supprimé (--garder pour le conserver)

✓ tous les groupes passent
preuve-026 : PASS
- Témoin baux : code 0, 5.5 s. == groupe baux — source /home/usine/reprise-1001/lot151/presti/.orchestre/travail/026-151/tour-1790905779054-3208321/baux/temoin ==
✓ ORB-1 — avec verrou : code 0, champ battement: présent · sans verrou : code 3 (attendu 3)
✓ ORB-2 — battement forcé à 2000-01-01 avant verifier · après verifier : 2026-10-02T01:49:56Z
✓ ORB-3 — reprise par ag-c : true · lock refait (agent: ag-c) : true · ancien preuves/000-test/avant.txt gardé : true · verdict EXPIRÉE (agent ag-baux) : true
✓ ORB-4 — après battement de 10 min, verrou toujours agent: ag-c : true · sortie prochaine : Aucune tâche disponible pour ag-d.
✓ ORB-5 — code 0 (attendu 0) · cite 000-test : true · sortie : ✓ bail(s) expiré(s) repris en file/ : 000-test
✓ ORB-6 — FAIL en-cours ignorés : true (2 verdicts) · verdict DISJONCTÉE : true · dans refuse/ : true · sortie du prochaine suivant : Aucune tâche disponible pour ag-f.
✓ ORB-7 — sans --forcer : code 3 (attendu 3), pas en file : true · avec --forcer : code 0, en file : true
✓ ORB-8 — n=0 · 1 ligne(s) (≤7 : true) · chaque ligne finit par une commande entre accents graves : true · « rien à décider » si n=0 : true
✓ ORB-9 — prix sans --benj refusé et décisions intactes : true (code 3) · gabarit decisions.md (section quarantaine + règle) : true · hors quarantaine → FAIL nommant decisions.md : true (code 1) · sous « Proposées » → PASS : true (code 0) · rappel « décisions tranchées » sur prochaine(D) : true · pas de fuite du texte de la proposition : true · Attention cite promouvoir : true
✓ ORB-NR — code 0 · ✓ tous les contrôles passent — dossier d'essai : supprimé (--garder pour le conserver)

✓ tous les groupes passent
preuve-026 : PASS
- Témoin quota : code 0, 4.1 s. == groupe quota — source /home/usine/reprise-1001/lot151/presti/.orchestre/travail/026-151/tour-1790905779054-3208321/quota/temoin ==
✓ ORQ-1 — lancer codex-t --tache=000-test : code 3 (attendu 3) · revenue en file/ : true · verrou levé : true
✓ ORQ-2 — quotas.json → codex : {"jusqua":"2099-09-30T00:17:00Z","vu":"2026-10-02T01:50:41Z","message":"You've hit your usage limit. Upgrade or try again at Sep 30th, 2099 2:17 AM."}
✓ ORQ-3 — verdict QUOTA (executant codex) présent : true
✓ ORQ-4 — codex-u : code 2 (attendu 2), cite la date : true · ag-u : tâche prise : true
✓ ORQ-5 — code 3 (attendu 3) · fichier témoin inchangé (faux Codex non appelé) : true
✓ ORQ-6 — jusqua forcée dans le passé → prochaine --agent=codex-u : code 3 (≠2 attendu)
✓ ORQ-7 — jusqua − vu = 360 min (attendu 360, ±1)
✓ ORQ-8 — « codex à sec jusqu'au » présent : true · commande antigravity.mjs lancer ag-<n> --tache=<id> citée : true
✓ ORQ-9 — sonde ok : true · quotaActif('codex') → {"actif":true,"jusqua":"2026-10-02T07:50:42Z"}
✓ ORQ-NR — code 0 · ✓ tous les contrôles passent — dossier d'essai : supprimé (--garder pour le conserver)

✓ tous les groupes passent
preuve-026 : PASS
- Témoin appliquer : code 0, 3.4 s. ## groupe appliquer
PASS CH-A1
PASS CH-A2
PASS CH-A3
PASS CH-A4
PASS CH-A5
PASS CH-A6
PASS CH-A7
PASS CH-A8
PASS CH-A9
PASS CH-A10
PASS CH-A11
PASS CH-A12
PASS CH-A13
PASS CH-A14

✓ chef-qa : 14/14 critère(s) vert(s) · racine /home/usine/reprise-1001/lot151/presti/.orchestre/travail/026-151/tour-1790905779054-3208321/appliquer/temoin
chef-qa : PASS
- Témoin etat : code 0, 0.4 s. ## groupe etat
PASS CH-E1
PASS CH-E2
PASS CH-E3
PASS CH-E4
PASS CH-E5

✓ chef-qa : 5/5 critère(s) vert(s) · racine /home/usine/reprise-1001/lot151/presti/.orchestre/travail/026-151/tour-1790905779054-3208321/etat/temoin
chef-qa : PASS
- Témoin cycle : code 0, 12.0 s. ## groupe cycle
PASS CH-C1
PASS CH-C2
PASS CH-C3
PASS CH-C4
PASS CH-C5
PASS CH-C6
PASS CH-C7

✓ chef-qa : 7/7 critère(s) vert(s) · racine /home/usine/reprise-1001/lot151/presti/.orchestre/travail/026-151/tour-1790905779054-3208321/cycle/temoin
chef-qa : PASS
- Témoin usine : code 0, 7.1 s. ## groupe usine
PASS CH-U1
PASS CH-U2
PASS CH-U3
PASS CH-U4
PASS CH-U5

✓ chef-qa : 5/5 critère(s) vert(s) · racine /home/usine/reprise-1001/lot151/presti/.orchestre/travail/026-151/tour-1790905779054-3208321/usine/temoin
chef-qa : PASS
- Témoin revue : code 0, 0.9 s. PASS RV-1
PASS RV-2
PASS RV-3
PASS RV-4
PASS RV-5
PASS RV-6
revue-qa : 6/6 critère(s) vert(s) (racine /home/usine/reprise-1001/lot151/presti/.orchestre/travail/026-151/tour-1790905779054-3208321/revue/temoin)
- Témoin chantier : code 0, 3.1 s. PASS CT-1
PASS CT-2
PASS CT-3
PASS CT-4
PASS CT-5
PASS CT-6
PASS CT-7
chantier-qa : 7/7 critère(s) vert(s) (racine /home/usine/reprise-1001/lot151/presti/.orchestre/travail/026-151/tour-1790905779054-3208321/chantier/temoin)
chantier-qa : PASS

- bac à sable désactivé : ORS-4, détectée, code 1, 3.5 s. Extrait réel : FAIL ORS-4 — argv ["exec","-C","/tmp/orchestre-026-src-NVbblI/projet","--add-dir","/tmp/orchestre-026-src-NVbblI/coffre","--add-dir","/home/usine/reprise-1001/lot151/presti/.orchestre/travail/026-151/tour-1790905779054-3208321/source/1"," / preuve-026 : FAIL — ORS-4, ORS-8
- antigravity absent de maj : ORS-2, détectée, code 1, 3.5 s. Extrait réel : FAIL ORS-2 — executant.mjs identique · antigravity.mjs DIFFÈRE (✓ maj : 1 fichier(s) changé(s) depuis /home/usine/reprise-1001/lot151/presti/.orchestre/travail/026-151/tour-1790905779054-3208321/source/2) / preuve-026 : FAIL — ORS-2, ORS-8
- vault SaaS figé : ORS-3, détectée, code 1, 3.5 s. Extrait réel : FAIL ORS-3 — contenu sans presti/'SaaS'/Documents : false · --add-dir coffre+source : false · argv ["exec","-C","/tmp/orchestre-026-src-wHhe4w/projet","--add-dir","/tmp/orchestre-026-src-wHhe4w/SaaS","--add-dir","/home/usine/reprise-1001/lot151/presti/.orchestre/travail/026-151/tour-1790905779054-3208321/source/3","-s / preuve-026 : FAIL — ORS-3, ORS-8
- instantané retiré avant lancer : ORS-6, détectée, code 1, 3.5 s. Extrait réel : FAIL ORS-6 — sans-git : code 1, « instantané impossible » non (rien de lancé) · exporte PROMPT : true · exporte instantane : true · PROMPT propre : true / preuve-026 : FAIL — ORS-6, ORS-8
- battement ignoré pour expiration : ORB-4, détectée, code 1, 4.8 s. Extrait réel : FAIL ORB-4 — après battement de 10 min, verrou toujours agent: ag-c : false · sortie prochaine : # Tâche 001-test-echec prise par ag-d — .orchestre/en-cours/001-test-echec.md / preuve-026 : FAIL — ORB-4, ORB-5, ORB-6, ORB-7, ORB-9
- seuil multiplié par vingt : ORB-3, détectée, code 1, 5.1 s. Extrait réel : FAIL ORB-3 — reprise par ag-c : false · lock refait (agent: ag-c) : false · ancien preuves/000-test/avant.txt gardé : true · verdict EXPIRÉE (agent ag-baux) : false / preuve-026 : FAIL — ORB-3, ORB-5, ORB-6, ORB-7, ORB-9
- FAIL en-cours comptés : ORB-6, détectée, code 1, 5.5 s. Extrait réel : FAIL ORB-6 — FAIL en-cours ignorés : false (2 verdicts) · verdict DISJONCTÉE : true · dans refuse/ : true · sortie du prochaine suivant : Aucune tâche disponible pour ag-f. / preuve-026 : FAIL — ORB-6
- rejeu disjoncté sans forcer : ORB-7, détectée, code 1, 5.7 s. Extrait réel : FAIL ORB-7 — sans --forcer : code 0 (attendu 3), pas en file : false · avec --forcer : code 3, en file : false / preuve-026 : FAIL — ORB-7
- Attention avant budget : ORB-8, détectée, code 1, 5.7 s. Extrait réel : FAIL ORB-8 — aucune section « ## Attention (n) » juste après le titre / preuve-026 : FAIL — ORB-8, ORB-NR
- décisions tranchées modifiables : ORB-9, détectée, code 1, 5.7 s. Extrait réel : FAIL ORB-9 — prix sans --benj refusé et décisions intactes : true (code 3) · gabarit decisions.md (section quarantaine + règle) : true · hors quarantaine → FAIL nommant decisions.md : false (code 0) · sous « Proposées » → PASS : true (code 0) · rappel « décisions tranchées » sur prochaine(D) : true · pas de fuite du texte de la proposition : true · Attention cite promouvoir : true / preuve-026 : FAIL — ORB-9
- prix promu sans Benj : ORB-9, détectée, code 1, 6.5 s. Extrait réel : FAIL ORB-9 — prix sans --benj refusé et décisions intactes : false (code 0) · gabarit decisions.md (section quarantaine + règle) : true · hors quarantaine → FAIL nommant decisions.md : true (code 1) · sous « Proposées » → PASS : true (code 0) · rappel « décisions tranchées » sur prochaine(D) : true · pas de fuite du texte de la proposition : true · Attention cite promouvoir : true / preuve-026 : FAIL — ORB-9
- quota garde la fiche verrouillée : ORQ-1, détectée, code 1, 4.1 s. Extrait réel : FAIL ORQ-1 — lancer codex-t --tache=000-test : code 3 (attendu 3) · revenue en file/ : false · verrou levé : false / preuve-026 : FAIL — ORQ-1, ORQ-4, ORQ-8
- heure de Paris traitée comme UTC : ORQ-2, détectée, code 1, 4.1 s. Extrait réel : FAIL ORQ-2 — quotas.json → codex : {"jusqua":"2099-09-30T02:17:00Z","vu":"2026-10-02T01:50:49Z","message":"You've hit your usage limit. Upgrade or try again at Sep 30th, 2099 2:17 AM."} / preuve-026 : FAIL — ORQ-2
- lancer ignore le quota : ORQ-5, détectée, code 1, 4.1 s. Extrait réel : FAIL ORQ-5 — code 1 (attendu 3) · fichier témoin inchangé (faux Codex non appelé) : false / preuve-026 : FAIL — ORQ-5
- onze tâches admises : CH-A2, détectée, code 1, 3.7 s. Extrait réel : FAIL CH-A2 — plan-11-taches : code 0 au lieu de 1 — ✓ plan appliqué : 11 tâche(s), 1 décision(s), 0 déjà là / chef-qa : FAIL — CH-A2, CH-A14
- première tâche envoyée avant validation : CH-A2, détectée, code 1, 4.9 s. Extrait réel : FAIL CH-A2 — plan-11-taches : 1 requête(s) reçue(s) par le faux bus (0 attendue) / chef-qa : FAIL — CH-A1, CH-A2, CH-A3, CH-A4, CH-A5, CH-A6, CH-A7, CH-A8, CH-A11, CH-A13
- jeton écrit dans rapport : CH-A9, détectée, code 1, 3.6 s. Extrait réel : FAIL CH-A9 — le jeton d'essai est écrit dans .orchestre/travail/chef/appliquer-2026-10-02T01-51-09-714Z.json / chef-qa : FAIL — CH-A9
- sortante non contrôlé : CH-A5, détectée, code 1, 3.6 s. Extrait réel : FAIL CH-A5 — plan-sortante-vraie : code 0 au lieu de 1 — ✓ plan appliqué : 3 tâche(s), 1 décision(s), 0 déjà là / chef-qa : FAIL — CH-A5
- mauvaise clé du bus : CH-A13, détectée, code 1, 3.1 s. Extrait réel : FAIL CH-A13 — tâche 0 : cle ≠ cle_idempotence du plan / chef-qa : FAIL — CH-A1, CH-A8, CH-A11, CH-A13, CH-A14
- balise fermante non neutralisée : CH-E1, détectée, code 1, 0.4 s. Extrait réel : FAIL CH-E1 — 1 ouverture(s) et 2 fermeture(s) de <donnees_etat> (1 et 1 attendues : la balise venue des données doit être neutralisée) / chef-qa : FAIL — CH-E1, CH-E2
- réseau du modèle activé : CH-C2, détectée, code 1, 12.1 s. Extrait réel : FAIL CH-C2 — plein : argv porte « sandbox_workspace_write.network_access=true » / chef-qa : FAIL — CH-C2
- minuteur sans destruction enfant : CH-C3, détectée, code 1, 53.6 s. Extrait réel : FAIL CH-C3 — cycle.mjs n'a pas rendu la main après le délai (40 s) / chef-qa : FAIL — CH-C3
- quota cycle ignoré : CH-C4, détectée, code 1, 12.9 s. Extrait réel : FAIL CH-C4 — cycle suivant : code 0 au lieu de 3 / chef-qa : FAIL — CH-C4
- danger-full-access accepté avec echange explicite : CH-U5, détectée, code 1, 7.2 s. Extrait réel : FAIL CH-U5 — argv avec danger-full-access : demander 0, réponse 0 (refus en code 2 attendu) / chef-qa : FAIL — CH-U5
- semaine UTC : RV-1, détectée, code 1, 0.8 s. Extrait réel : FAIL RV-1 — executants.antigravity.pass : attendu 3, obtenu 4 / revue-qa : 2/6 critère(s) vert(s) (racine /home/usine/reprise-1001/lot151/presti/.orchestre/travail/026-151/tour-1790905779054-3208321/revue/1)
- ligne abîmée fait planter : RV-3, détectée, code 1, 0.8 s. Extrait réel : FAIL RV-3 — trois lignes abîmées : code 1 : ✗ Unterminated string in JSON at position 51 (line 1 column 52) (attendu : code 0, sans plantage) / revue-qa : 5/6 critère(s) vert(s) (racine /home/usine/reprise-1001/lot151/presti/.orchestre/travail/026-151/tour-1790905779054-3208321/revue/2)
- non mesuré remplacé par zéro : RV-2, détectée, code 1, 0.9 s. Extrait réel : FAIL RV-2 — jeton absent : argent vaut 0, attendu « non mesuré » / revue-qa : 5/6 critère(s) vert(s) (racine /home/usine/reprise-1001/lot151/presti/.orchestre/travail/026-151/tour-1790905779054-3208321/revue/3)
- zone LLM non protégée : CT-1, détectée, code 1, 3.0 s. Extrait réel : FAIL CT-1 — zone lib/agents/llm.ts : code 0, attendu 1 (executant codex et périmètre sur la zone protégée lib/agents/llm.ts (lib/agents/llm.ts)) — code 0 : PASS FAIL RD-1 — lib/relances/modele.ts absent : le modèle de relance n'existe pas / chantier-qa : FAIL — CT-1
- e2e existant modifié autorisé : CT-2, détectée, code 1, 3.1 s. Extrait réel : FAIL CT-2 — un test e2e existant modifié : code 0, attendu 1 — code 0 : PASS fusion permise / chantier-qa : FAIL — CT-2
- deposer écrase fiche existante : CT-3, détectée, code 1, 3.7 s. Extrait réel : FAIL CT-3 — id déjà en file/ : code 0, attendu 1 — code 0 : PASS FAIL RD-1 — lib/relances/modele.ts absent : le modèle de relance n'existe pas / PASS fiche déposée : 090-relances-devis / chantier-qa : FAIL — CT-1, CT-3
- verifier-fiche ne lance plus juge proposé : CT-1, détectée, code 1, 2.9 s. Extrait réel : FAIL CT-1 — juge-pass-code1 : code 0, attendu 1 (le juge proposé sort en code 1 sans aucune ligne en échec (seulement des PASS RD-n)) — code 0 : PASS FAIL RD-1 — supposé rouge / chantier-qa : FAIL — CT-1, CT-3
- reporter conservé : CT-6, détectée, code 1, 3.1 s. Extrait réel : FAIL CT-6 — idees.json garde 3 décision(s) (chef:2026-09-21:idee-relances-devis, chef:2026-09-21:idee-page-tarifs, chef:2026-09-22:idee-avis-google), attendu la seule idée tranchée « lancer » / chantier-qa : FAIL — CT-6
