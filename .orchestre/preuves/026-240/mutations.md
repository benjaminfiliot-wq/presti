# Mutations des juges Savoir

Chaque remplacement est appliqué seul à une copie du dépôt, puis restauré.

## Témoins (copie intacte)

- socle : code 0
- recherche : code 0
- lecons : code 1 ; critères rouges notés (hors mutations) : SVL-11
- reflexion : code 0

## Mutations

- 1. ouvre .env.local malgré les exclusions — SVS-3, code 1, 15.9 s : FAIL SVS-3 — ouvert ou listé alors qu'il ne doit jamais l'être : presti:.env.local
- 2. omet le caviardage du numéro — SVS-4, code 1, 13.2 s : FAIL SVS-4 — saas:Produit/Piege-Coordonnees.md : texte exporté ≠ texte caviardé attendu — # Fiche contact fournisseur (essai) Pour les commandes de peinture, écrire à [adresse] ou appeler le 06 12 34 56 78. Société enregistrée sous le SIREN [siren] …
- 3. range les prospects dans general — SVS-4, code 1, 10.1 s : FAIL SVS-4 — saas:Recherche/Annuaire-Essai.md : attendu reclassé dans prospects, absent de prospects
- 4. accepte une sortie dans le dépôt — SVS-6, code 1, 7.8 s : FAIL SVS-6 — --sortie depot-du-script : code 0 (attendu 2)
- 5. ajoute sudo dans la commande distante — SVS-7, code 1, 4.9 s : FAIL SVS-7 — allumé, appel 1 : commande distante hors du gabarit fixe : sudo -n -u agents umask 007 && cat > /srv/presti-savoir/depot/general-20261005T081915Z.tar.part && mv /srv/presti-savoir/depot/general-20261005T081915Z.tar.par…
- 6. accepte « ../ » dans le tar (nom non refusé, fichier hors manifeste non refusé) — SVS-8, code 1, 11.9 s : FAIL SVS-8 — ../evil : code 0 (attendu 1) — 
- 7. range l’index des prospects sous general — SVS-10, code 1, 10.8 s : FAIL SVS-10 — index/general/etat.json : compartiment prospects
- 8. envoie aussi les passages des prospects au modèle d’embeddings — SVS-10, code 1, 8.6 s : FAIL SVS-10 — sémantique allumée : la sentinelle des prospects est partie vers le modèle d’embeddings
- 9. ouvre les vecteurs hors boucle locale — SVS-10, code 1, 10.0 s : FAIL SVS-10 — url-distante : etat general.semantique "active" (attendu "refusee")
- 10. ajoute EnvironmentFile à l’unité de réception — SVS-11, code 1, 3.0 s : FAIL SVS-11 — presti-chef-savoir-recevoir.service [Service] EnvironmentFile= présent (aucun secret n'y sert)
- 11. supprime le tri de l’index — SVS-9, code 1, 11.2 s : FAIL SVS-9 — construireIndex : l’ordre des documents change l’index
- 12. laisse le web passer malgré un savoir suffisant — SVR-2, code 1, 19.5 s : FAIL SVR-2 — savoir bien servi, web: true : 1 recherche(s) Firecrawl, 0 lecture(s), 0 appel(s) Perplexity reçus (attendu aucun : le savoir d'abord)
- 13. autorise Perplexity au coût inconnu — SVR-5, code 1, 19.6 s : FAIL SVR-5 — Perplexity, coût inconnu : 1 appel(s) reçu(s) (attendu zéro)
- 14. envoie une question avec adresse à Firecrawl — SVR-6, code 1, 20.4 s : FAIL SVR-6 — refusDonneePersonnelle(« Faut-il écrire à contact@toiture-essai.invalid pour le devis ? ») = null (attendu "adresse")
- 15. transmet un extrait prospects à douleurs — SVR-7, code 1, 19.3 s : FAIL SVR-7 — douleurs (freellmapi) : 4 résultat(s) de classe prospects, interne (seul public est permis)
- 16. recopie un extrait dans le résumé de l’événement — SVR-8, code 1, 19.5 s : FAIL SVR-8 — s2_fort_chef : le résumé contient un extrait
- 17. cherche cinq besoins au lieu de deux — SVR-9, code 1, 19.9 s : FAIL SVR-9 — recherches faites : ["Quelles relances pour un devis dormant ?","Comment présenter un acompte de chantier ?","Quel ton pour une facture en retard ?","Comment rédiger la page d'acc… (attendu exactement les 2 premiers besoins)
- 18. imprime une erreur contenant le jeton — SVR-11, code 1, 23.1 s : FAIL SVR-11 — s4_panne : FIRECRAWL-026-sentinelle dans la sortie, le journal ou l’erreur (une clé ne sort jamais d’un transport)
- 19. perd le curseur et dédouble les candidates — SVL-1, code 1, 25.2 s : FAIL SVL-1 — second passage : nouvelles = 17 (0 attendu) (5 s)
- 20. décale la source d’une ligne — SVL-3, code 1, 30.3 s : FAIL SVL-3 — verifier-source L-2026-09-20-fmlcldfhdjno (.orchestre/verdicts.jsonl:3) : code 1 — ✗ L-2026-09-20-fmlcldfhdjno : verdict QUOTA : pas un echec (0 attendu : la source est juste) (18 s)
- 21. accepte --par=codex — SVL-5, code 1, 25.9 s : FAIL SVL-5 — valider --par=codex : code 0 (2 attendu) (17 s)
- 22. accepte PRESTI_HOTE=usine — SVL-5, code 1, 18.3 s : FAIL SVL-5 — valider PRESTI_HOTE=usine : code 0 (2 attendu) (14 s)
- 23. garde la leçon avec numéro — SVL-7, code 1, 9.1 s : FAIL SVL-7 — leconsPour(standardiste) : ["L-2026-09-26-aaaaaaaaaaab","L-2026-09-25-aaaaaaaaaaac","L-2026-09-23-aaaaaaaaaaaf","L-2026-09-22-aaaaaaaaaaag","L-2026-09-21-aaaaaaaaaaah","L-2026-09-19-aaaaaaaaaaaj"] (["L-2026-09-26-aaaaaaaaaaab","L-2026-09-25-aaaaaaaaaaac","L-2026-09-23-aaaaaaaaaaaf","L-2026-09-21-aaaaaaaaaaah","L-2026-09-19-aaaaaaaaaaaj"] attendu : ses domaines, les plus récentes puis par id, sans leçon à numéro ni lien) (1 s)
- 24. laisse une balise fermante active — SVL-7, code 1, 7.6 s : FAIL SVL-7 — consigneAvecLecons (leçon piégée) : 1 ouverture(s) et 2 fermeture(s) de <lecons_validees> (1 et 1 : la balise venue d'une règle doit être neutralisée) (1 s)
- 25. ajoute le bloc avec interrupteur éteint — SVL-8, code 1, 7.3 s : FAIL SVL-8 — interrupteur éteint : entree.md modifié (inchangé à l’octet près attendu) (2 s)
- 26. relit les leçons à chaque appel — SVL-9, code 1, 8.8 s : FAIL SVL-9 — facteur-allume : 42 ouverture(s) de leçons pendant les appels (lues une seule fois, par creerLecteur) (5 s)
- 27. ignore la frontière de Paris — SVB-1, code 1, 10.8 s : FAIL SVB-1 — jour 2026-09-28 : « executants » obtenu {"fraicheur":"2026-09-28T22:30:00Z","par_executant":{"claude-code":{"disjonctees":0,"expirees":1,"fail":0,"pass":1,"refusees":0},"codex":{"disjonctees":0,"expirees":0,"f…, attendu {"fraicheur":"2026-09-28T22:30:00Z","par_executant":{"claude-code":{"disjonctees":0,"expirees":1,"fail":0,"pass":1,"refusees":0},"codex":{"disjonctees":0,"expirees":0,"f… (4 s)
- 28. accepte un nombre inventé — SVB-3, code 1, 13.5 s : FAIL SVB-3 — bilan fautif « invente » : code 0 (1 attendu) — ✓ bilan du 2026-10-04 : 3 proposition(s) envoyée(s) au pont (11 s)
- 29. ajoute une décision au plan — SVB-4, code 1, 14.9 s : FAIL SVB-4 — plan du bilan « ok » : refusé par docs/agents/chef-plan.schema.json ($.decisions[0] : « cle_idempotence » manque ; $.decisions[0] : « nature » manque ; $.decisions[0] : « question » manque) (0 s)
- 30. rend une tâche sortante — SVB-4, code 1, 13.0 s : FAIL SVB-4 — plan du bilan « ok » : refusé par docs/agents/chef-plan.schema.json ($.taches[0].sortante : const ; $.taches[1].sortante : const ; $.taches[2].sortante : const) (0 s)
- 31. active le réseau dans argv — SVB-5, code 1, 12.2 s : FAIL SVB-5 — chaîne « ok » : argv sans « -c sandbox_workspace_write.network_access=false » (le réseau du modèle n'est pas coupé) (0 s)
- 32. ajoute EnvironmentFile à l’unité — SVB-8, code 1, 1.2 s : FAIL SVB-8 — presti-chef-bilan.service : un EnvironmentFile= (aucun : le jeton vient du coffre, par avec-coffre.mjs) (0 s)
