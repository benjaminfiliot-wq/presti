# 026-161 — mutations des juges qu'aucun domaine ne mute, et couverture d'ensemble

**ÉCHECS (9)** :
- témoin ops-socle : code 1 (❌ OA-1 numéro 0105 ≤ 0120, celui de la migration ops du bus)
- témoin constructeur : code 1 (FAIL CF-3 — diff contre 1620723 (correction D30 et 8 ligne(s) des fiches 026 ôtée(s)) : 38 ligne(s) ajoutée(s), 2 retirée(s) — exactement une ligne ajoutée attendue (−85 « const DERRIERE_UN_DRAPEAU = [] » ; −164 « T('/onboarding répond (client : renvoie vers /login sans session)', o… » ; +11 « import './ts-loader.mjs' » ; +76 « // 29/09 (fiche 026-008) — douze routes du Poste livrées par les fich…)
- témoin parcours : code 1 (FAIL PC-5 — tsconfig.json diffère de 1620723 (ligne 19 : « "jsx": "react-jsx", » au lieu de « "jsx": "preserve", ») : le typecheck ne se juge qu'avec la configuration d'origine | FAIL PC-6 — le récapitulatif (étape « paiement ») ne dit « parcours » dans aucun texte affiché ; le récapitulatif (étape « paiement ») ne montre pas le nom ou le prénom, la phrase signée, les chiffres de l’artisan (champ…)
- NON PRISE : agents-llm LL-2 « FREELLMAPI_URL d'un hôte public acceptée » : code 0, aucune ligne en échec pour LL-2, bilan sans LL-2
- NON PRISE : webhook WM-1 « la branche pack_pub rendue orpheline (son cas retiré de l'aiguillage, la fonction gardée) » : code 0, aucune ligne en échec pour WM-1, bilan sans WM-1
- rapport incomplet : 35/37
- témoin 025 : scripts/juges-025-mutations.mjs n'existe pas dans le dépôt (jamais commité : git log --all ne le connaît pas) : le témoin 025 n'est pas jouable
- couverture : rapport absent, vide ou illisible (.orchestre/preuves/026-151/mutations.json)
- couverture : 59 juge(s) sur 110 sans aucune faute attrapée dans un rapport (voir le tableau)

## Couverture juge par juge (huit rapports mutations.json)

| Juge | Fiche de juges | Rapports où une faute est attrapée | Couvert |
|---|---|---|---|
| scripts/achat-ecrans-qa.mjs | 026-023 | 026-152 | oui |
| scripts/achat-public-qa.mjs | 026-023 | 026-152 | oui |
| scripts/agents-garde-qa.mjs | 026-038 | 026-091 | oui |
| scripts/agents-llm-qa.mjs | 026-041 | 026-161 | oui |
| scripts/agents-routes-qa.mjs | 026-038 | 026-091 | oui |
| scripts/argent-sql-qa.mjs | 026-032 | 026-091 | oui |
| scripts/atelier-maquettes-qa.mjs | 026-080 | 026-101 | oui |
| scripts/bus-livraison-qa.mjs | 026-026 | — | **NON** |
| scripts/cgu-pack-pub-qa.mjs | 026-108 | 026-159 | oui |
| scripts/chantier-qa.mjs | 026-121 | — | **NON** |
| scripts/chef-qa.mjs | 026-102 | — | **NON** |
| scripts/commande-exporter-qa.mjs | 026-029 | 026-152 | oui |
| scripts/complement-dossier-qa.mjs | 026-023 | — | **NON** |
| scripts/comptable-qa.mjs | 026-242 | — | **NON** |
| scripts/confidentialite-prospection-qa.mjs | 026-037 | 026-101 | oui |
| scripts/conformite-qa.mjs | 026-069 | 026-101 | oui |
| scripts/constructeur-ferme-qa.mjs | 025-01, 026-004 | 026-161 | oui |
| scripts/contenu-ecran-qa.mjs | 026-204 | — | **NON** |
| scripts/contenu-qa.mjs | 026-204 | — | **NON** |
| scripts/crieur-qa.mjs | 026-116 | 026-159 | oui |
| scripts/disjoncteurs-qa.mjs | 026-062 | — | **NON** |
| scripts/dossier-zip-qa.mjs | 026-026 | — | **NON** |
| scripts/douleurs-qa.mjs | 026-071 | — | **NON** |
| scripts/ecommerce-reservee-qa.mjs | 026-171 | — | **NON** |
| scripts/facteur-qa.mjs | 026-062 | — | **NON** |
| scripts/faits-qa.mjs | 026-016 | 026-101 | oui |
| scripts/file-argent-qa.mjs | 026-045 | 026-091 | oui |
| scripts/formulaire-site-qa.mjs | 025-01 | — | **NON** |
| scripts/generation-actions-qa.mjs | 026-029 | — | **NON** |
| scripts/horloge-qa.mjs | 026-045 | exempté (--reel seulement, CV-6) | oui |
| scripts/horloge-sql-qa.mjs | 026-032 | 026-091 | oui |
| scripts/instantane-quotidien-qa.mjs | 026-002 | 026-150 | oui |
| scripts/jauges-qa.mjs | 026-062 | — | **NON** |
| scripts/juges-026-completude-qa.mjs | 026-220 | — | **NON** |
| scripts/lien-connexion-qa.mjs | 026-023 | 026-152 | oui |
| scripts/livraison-schema-qa.mjs | 026-018 | — | **NON** |
| scripts/livraison-tour-qa.mjs | 026-018 | — | **NON** |
| scripts/livrer-site-qa.mjs | 026-029 | — | **NON** |
| scripts/maquette-lien-qa.mjs | 026-080 | 026-101 | oui |
| scripts/maquette-qa.mjs | 025-01 | — | **NON** |
| scripts/maquette-video-qa.mjs | 026-071 | — | **NON** |
| scripts/media-octets-qa.mjs | 026-002 | 026-150 | oui |
| scripts/meta-webhooks-qa.mjs | 026-081 | — | **NON** |
| scripts/next16-qa.mjs | 026-004 | 026-150 | oui |
| scripts/ops-acquisition-qa.mjs | 026-037 | 026-161 | oui |
| scripts/ops-sql-qa.mjs | 026-009 | 026-091 | oui |
| scripts/pack-pub-base-qa.mjs | 026-108 | 026-159 | oui |
| scripts/pack-pub-dossier-qa.mjs | 026-110 | 026-159 | oui |
| scripts/pack-pub-livraison-qa.mjs | 026-110 | 026-159 | oui |
| scripts/pack-pub-paiement-qa.mjs | 026-108 | 026-159 | oui |
| scripts/parcours-commande-qa.mjs | 025-01, 026-004 | 026-161 | oui |
| scripts/pause-qa.mjs | 026-038 | 026-091 | oui |
| scripts/pilotage-ecran-qa.mjs | 026-104 | — | **NON** |
| scripts/pilotage-gestes-qa.mjs | 026-066 | 026-130 | oui |
| scripts/pilotage-logique-qa.mjs | 026-012 | 026-130 | oui |
| scripts/pilotage-push-qa.mjs | 026-012 | 026-130 | oui |
| scripts/pilotage-route-qa.mjs | 026-066 | 026-130 | oui |
| scripts/pilotage-sql-qa.mjs | 026-066 | 026-130 | oui |
| scripts/pont-orchestre-qa.mjs | 026-142 | 026-161 | oui |
| scripts/pont-telegram-qa.mjs | 026-194 | — | **NON** |
| scripts/poste-extraction-qa.mjs | 026-171 | — | **NON** |
| scripts/poste-sites-qa.mjs | 026-026 | — | **NON** |
| scripts/promesses-qa.mjs | 025-01 | — | **NON** |
| scripts/prospection-sql-qa.mjs | 026-032 | 026-091 | oui |
| scripts/prospects-entrant-qa.mjs | 026-142 | 026-161 | oui |
| scripts/pub-locale-qa.mjs | 026-126 | 026-159 | oui |
| scripts/pub-qa.mjs | 026-128 | — | **NON** |
| scripts/qualite-sites-qa.mjs | 026-246 | — | **NON** |
| scripts/recenseur-qa.mjs | 026-016 | 026-101 | oui |
| scripts/redacteur-qa.mjs | 026-069 | 026-101 | oui |
| scripts/redacteur-v2-qa.mjs | 026-029 | 026-152 | oui |
| scripts/rendez-vous-qa.mjs | 026-081 | — | **NON** |
| scripts/repondeur-qa.mjs | 026-081 | — | **NON** |
| scripts/retrait-site-qa.mjs | 026-026 | — | **NON** |
| scripts/revue-qa.mjs | 026-121 | — | **NON** |
| scripts/routes-acquisition-qa.mjs | 026-037 | 026-101 | oui |
| scripts/sav-qa.mjs | 026-244 | — | **NON** |
| scripts/savoir-lecons-qa.mjs | 026-234 | — | **NON** |
| scripts/savoir-recherche-qa.mjs | 026-232 | — | **NON** |
| scripts/savoir-reflexion-qa.mjs | 026-238 | — | **NON** |
| scripts/savoir-socle-qa.mjs | 026-229 | — | **NON** |
| scripts/search-console-qa.mjs | 026-199 | — | **NON** |
| scripts/socle-pubs-qa.mjs | 026-124 | — | **NON** |
| scripts/standardiste-qa.mjs | 026-080 | 026-101 | oui |
| scripts/station-claw3d-qa.mjs | 026-170 | — | **NON** |
| scripts/station-ecran-qa.mjs | 026-172 | — | **NON** |
| scripts/station-logique-qa.mjs | 026-067 | — | **NON** |
| scripts/station-planche-qa.mjs | 026-168 | — | **NON** |
| scripts/station-reglages-qa.mjs | 026-171 | — | **NON** |
| scripts/station-reunion-qa.mjs | 026-067 | 026-130 | oui |
| scripts/station-route-qa.mjs | 026-067 | 026-130 | oui |
| scripts/station-themes-qa.mjs | 026-171 | — | **NON** |
| scripts/studio-garde-qa.mjs | 026-128 | 026-159 | oui |
| scripts/studio-offre-qa.mjs | 026-128 | — | **NON** |
| scripts/tic-qa.mjs | 026-045 | 026-091 | oui |
| scripts/tresorerie-qa.mjs | 026-018 | — | **NON** |
| scripts/tuile-argent-qa.mjs | 026-018 | 026-152 | oui |
| scripts/usine-durcie-qa.mjs | 026-194 | — | **NON** |
| scripts/usine-production-qa.mjs | 026-052 | — | **NON** |
| scripts/usine-pubs-qa.mjs | 026-199 | — | **NON** |
| scripts/usine-routes-qa.mjs | 026-052 | — | **NON** |
| scripts/usine-socle-qa.mjs | 026-048 | — | **NON** |
| scripts/usine-sql-qa.mjs | 026-052 | — | **NON** |
| scripts/veilleur-qa.mjs | 026-045 | 026-091 | oui |
| scripts/verrou-site-qa.mjs | 025-01 | — | **NON** |
| scripts/video-qa.mjs | 026-124 | — | **NON** |
| scripts/vigie-meta-qa.mjs | 026-069 | 026-101 | oui |
| scripts/vigile-qa.mjs | 026-248 | — | **NON** |
| scripts/visages-qa.mjs | 026-124 | — | **NON** |
| scripts/webhook-muet-qa.mjs | 025-01, 026-108 | — | **NON** |

## Les mutations

| Juge | Faute plantée | Fichier | Critère attendu | Verdict | Extrait réel |
|---|---|---|---|---|---|
| scripts/agents-llm-qa.mjs | standardiste passé en freellmapi | `lib/agents/moteurs.ts` | LL-4 | prise | ✗ standardiste a personnelles:true mais moteur:'freellmapi' |
| scripts/agents-llm-qa.mjs | FREELLMAPI_URL d'un hôte public acceptée | `lib/agents/llm.ts` | LL-2 | **NON PRISE** | — |
| scripts/agents-llm-qa.mjs | danger-full-access dans l'argv de Codex | `lib/agents/llm.ts` | LL-5 | prise | ✗ argv sans --sandbox read-only |
| scripts/agents-llm-qa.mjs | enregistrerCout reçoit 0,01 € | `lib/agents/llm.ts` | LL-8 | prise | ✗ montant inscrit = 0.01 (attendu 0) |
| scripts/agents-llm-qa.mjs | import Anthropic de @anthropic-ai/sdk ajouté | `lib/agents/llm.ts` | LL-3 | prise | ✗ lib/agents/llm.ts importe @anthropic-ai/sdk |
| scripts/agents-llm-qa.mjs | le retrait des marques <donnees> supprimé | `lib/agents/llm.ts` | LL-5 | prise | ✗ entrée standard : 2 <donnees>, 2 </donnees> (attendu 1 et 1) |
| scripts/agents-llm-qa.mjs | JSON.parse remplacé par l'extraction du premier {…} | `lib/agents/llm.ts` | LL-6 | prise | ✗ le scénario « texte » n'est pas rejeté |
| scripts/agents-llm-qa.mjs | compteur d'appels jamais incrémenté | `lib/agents/llm.ts` | LL-7 | prise | ✗ le 4e appel (au-delà d'appelsMax:3) n'est pas rejeté avec « plafond » |
| scripts/agents-llm-qa.mjs | console.log(donnees) ajouté | `lib/agents/llm.ts` | LL-9 | prise | ✗ la sortie capturée de l'enfant porte la réponse ou les données |
| scripts/agents-llm-qa.mjs | MODELE_REJUGE égal à MODELE_AGENTS | `lib/agents/moteurs.ts` | LL-12 | prise | ✗ MODELE_REJUGE == MODELE_AGENTS |
| scripts/ops-acquisition-qa.mjs | grant execute … to authenticated ajouté | `supabase/migrations/0105_acquisition_socle.sql` | OA-2 | prise | ❌ OA-2 acq_en_pause : grant à authenticated (service_role seul) |
| scripts/ops-acquisition-qa.mjs | une paire retirée de la table des transitions | `supabase/migrations/0105_acquisition_socle.sql` | OA-4 | prise | ❌ OA-4 transitions de contrat.ts absentes du SQL : lien_envoye>oppose |
| scripts/ops-acquisition-qa.mjs | la graine de recenseur à une période de 60 min | `supabase/migrations/0105_acquisition_socle.sql` | OA-9 | prise | ❌ OA-9 recenseur : période 60, 360 attendu |
| scripts/ops-acquisition-qa.mjs | acq_en_pause lit ops.pause_generale | `supabase/migrations/0105_acquisition_socle.sql` | OA-10 | prise | ❌ OA-10 acq_en_pause n'appelle pas ops_interrupteur('pause_generale') ; mention de ops.pause_generale |
| scripts/ops-acquisition-qa.mjs | le bucket maquettes passé public = true | `supabase/migrations/0106_acquisition_echanges.sql` | OB-4 | prise | ❌ OB-4 public = true / false, false attendu |
| scripts/ops-acquisition-qa.mjs | acq_reponses_a_traiter lit aussi ops.envois (les courriers n existent plus : la jointure fautive est celle de ops.envois) | `supabase/migrations/0106_acquisition_echanges.sql` | OB-6 | prise | ❌ OB-6 acq_reponses_a_traiter lit envois |
| scripts/ops-acquisition-qa.mjs | le sous-bloc exception d'acq_envoi_preparer ne rattrape plus les refus du déclencheur | `supabase/migrations/0106_acquisition_echanges.sql` | OB-9 | prise | ❌ OB-9 acq_envoi_preparer sans sous-bloc « exception when others » |
| scripts/ops-acquisition-qa.mjs | une tâche cron.schedule de plus | `supabase/migrations/0109_acquisition_planification.sql` | PG-1 | prise | ❌ PG-1 tâche en trop : acq-facteur-pause ; une tâche acq-facteur-pause ou ?passe=pause |
| scripts/constructeur-ferme-qa.mjs | constructeurSite: true dans lib/flags.ts | `lib/flags.ts` | CF-1 | prise | FAIL CF-1 — constructeurSite vaut « true », le littéral false attendu ; à l'exécution : FLAGS.constructeurSite = true, actif('constructeurS… |
| scripts/parcours-commande-qa.mjs | la borne de l'année d'installation retirée | `lib/siteCommande.ts` | PC-1 | prise | FAIL PC-1 — refus attendu, aucune erreur : installation-1959, installation-future, installation-zero ; invariant : installation-1959 payabl… |
| scripts/webhook-muet-qa.mjs | la branche pack_pub rendue orpheline (son cas retiré de l'aiguillage, la fonction gardée) | `lib/stripeAiguillage.ts` | WM-1 | **NON PRISE** | — |
| scripts/pont-orchestre-qa.mjs | la charge de la tâche recopiée hors des balises de données | `scripts/pont-orchestre.mjs` | PO-2 | prise | ✗ PO-2 bus-pont-qa-code-0-5f9b34.md : charge piège absente des balises |
| scripts/pont-orchestre-qa.mjs | la tâche rendue faite avant l'écriture de sa proposition | `scripts/pont-orchestre.mjs` | PO-3 | prise | ✗ PO-3 tâche 1ef87185-b909-4b2d-b730-b4895f2293f5 : rendre reçu avant l'écriture du fichier |
| scripts/pont-orchestre-qa.mjs | l'événement de verdict reposté à chaque passage | `scripts/pont-orchestre.mjs` | PO-4 | prise | ✗ PO-4 2e passage : 2 verdict(s) reposté(s) en trop |
| scripts/pont-orchestre-qa.mjs | une proposition écrite dans .orchestre/file/ | `scripts/pont-orchestre.mjs` | PO-6 | prise | ✗ PO-6 file/, en-cours/, fait/, refuse/, verdicts.jsonl ou decisions.md a changé |
| scripts/pont-orchestre-qa.mjs | en mode prendre, la preuve git: au lieu de l'événement proposition_rangee | `scripts/pont-orchestre.mjs` | PO-9 | prise | ✗ PO-9 preuve_url « git:.orchestre/propositions/bus-pont-qa-code-0-1f34ce.md » ≠ supabase://ops.evenements/1 |
| scripts/pont-orchestre-qa.mjs | presti-pont.service charge un EnvironmentFile= | `scripts/usine/systemd/presti-pont.service` | PO-11 | prise | ✗ PO-11 EnvironmentFile= présent (un secret en clair sur le disque de l'usine) |
| scripts/prospects-entrant-qa.mjs | le test du drapeau placé après l'appel à la base de sécurité | `app/api/prospects/entrant/route.ts` | PE-2 | prise | ✗ PE-2 le test du drapeau (actif('prospectsEntrant')) n'est pas la première instruction de POST |
| scripts/prospects-entrant-qa.mjs | le champ piège enregistre quand même | `app/api/prospects/entrant/route.ts` | PE-3 | prise | ✗ PE-3 champ piège : status 200, ok=true, 1 recordAbuse (1 attendu), 1 appel(s) base (0 attendus) |
| scripts/prospects-entrant-qa.mjs | la case d'accord n'est plus exigée | `app/api/prospects/entrant/route.ts` | PE-4 | prise | ✗ PE-4 accord-absent (accord) : status 200 (400 attendu), 1 appel(s) base \| accord-chaine (accord) : status 200 (400 attendu), 1 appel(s) b… |
| scripts/prospects-entrant-qa.mjs | source: manuel au lieu d'entrant | `app/api/prospects/entrant/route.ts` | PE-5 | prise | ✗ PE-5 site-valide : source « manuel » ≠ entrant \| instagram-valide : source « manuel » ≠ entrant |
| scripts/prospects-entrant-qa.mjs | l'entreprise reçue écrite par console.log | `app/api/prospects/entrant/route.ts` | PE-6 | prise | ✗ PE-6 une valeur du corps (cree) apparaît dans la console |
| scripts/juges-026-preuve.mjs | le juge d'une fiche de fabrication retiré du périmètre de sa fiche de juges | `scripts/fixtures/026/couverture/propre/026-007.md` | CV-2 | prise | FAIL CV-2 — 2 défaut(s) : 026-008 : juge scripts/c-qa.mjs écrit par aucune fiche de juges (fiche de fabrication) |
| scripts/juges-026-preuve.mjs | une ligne « Dépend de » cite un id plus grand | `scripts/fixtures/026/couverture/propre/026-005.md` | CV-4 | prise | FAIL CV-4 — 1 défaut(s) : 026-005 : « depend » cite 026-009, qui n'est pas plus petit |
| scripts/juges-026-preuve.mjs | trois fiches du PC dans une même vague de INDEX.md | `scripts/fixtures/026/couverture/propre/INDEX.md` | CV-8 | prise | FAIL CV-8 — 1 défaut(s) : V06 : 3 fiches d'exécutant sur le PC (au plus deux) : 026-008, 026-009, 026-010 |
| scripts/juges-026-preuve.mjs | deux fiches qui se chevauchent (lib/a.ts) rangées dans une même vague | `scripts/fixtures/026/couverture/propre/INDEX.md` | CV-8 | prise | FAIL CV-8 — 4 défaut(s) : 026-005 : dans deux vagues : V03 et V04 |
| scripts/juges-026-preuve.mjs | un juge d'une fiche de juges n'est nommé dans aucune fiche de mutations | `scripts/fixtures/026/couverture/propre/026-011.md` | CV-6 | prise | FAIL CV-6 — 1 défaut(s) : 026-007 : scripts/c-qa.mjs (c-qa) n'est nommé dans le corps d'aucune fiche de mutations |
