# Les quatre juges du lot A savent échouer

Produit par un script de Claude Code le 2026-09-26T06:14:19Z. Maquette : `.orchestre/travail/026-018-maquette/` (une implémentation témoin des fiches 026-021, 026-055, 026-024 et 026-059, jamais livrée) ; copie témoin : `.orchestre/travail/026-018-temoin/` (app, lib, supabase de l'arbre courant). Pour chaque ligne : une entrée cassée, le juge relancé, la ligne rouge relevée telle quelle, puis l'original restauré et vérifié octet pour octet.

## Témoins avant mutation

- SC : maquette, mode complet → code 0 (tout vert) ; copie témoin, --temoin → code 0
- TR : maquette, mode complet → code 0 (tout vert) ; copie témoin, --temoin → code 0
- TL : maquette, mode complet → code 0 (tout vert) ; copie témoin, --temoin → code 0
- TA : maquette, mode complet → code 1 ; rouge(s) de départ : ❌ TA-5 lib/siteLivraison.ts (base 5012625) : import ajouté hors contrat : @/lib/supabaseAdmin → supabaseAdmin ; lib/siteLivraison.ts (base 5012625) : import aj… ; copie témoin, --temoin → code 0

- TA-5, partie exécutée (enfant du juge, veille qui lève) sur la maquette : vert — veilleTresorerie doublée qui lève : tourLivraison l'appelle, rend quand même son bilan ({"courriels":2,"retards":0,"erreurs":["veille de trésorerie…) et envoie ses 2 e-mails
- TA-5 complet reste rouge sur la maquette : sa base git (la version de lib/siteLivraison.ts d’avant la veille) ne peut pas exister avant 026-024 ; la partie exécutée est prouvée par l’enfant, la partie diff par sait-echouer-diffs.md.

## Mutations

| Juge | Critère | Mode | Fichier cassé | Vert avant | Code | Pris | Ligne rouge (extrait réel) |
|---|---|---|---|---|---|---|---|
| SC | SC-1 | complet | .orchestre/travail/026-018-maquette/supabase/migrations/0103_livraison_commandes.sql | oui | 1 | oui | ❌ SC-1 colonne generation_duree_s : type bigint, integer attendu |
| SC | SC-2 | complet | .orchestre/travail/026-018-maquette/supabase/migrations/0103_livraison_commandes.sql | oui | 1 | oui | ❌ SC-2 instruction 1 : drop column — « alter table public.sites_commandes drop column if exists consigne, add column if not exis… » ; instruction 1 : « drop column if exists consigne » (seule la contrainte d'état peut être supprimée) |
| SC | SC-3 | complet | .orchestre/travail/026-018-maquette/supabase/migrations/0103_livraison_commandes.sql | oui | 1 | oui | ❌ SC-3 la contrainte liste ["brouillon","payee","generee","validee","en_ligne"], ["brouillon","payee","generee","validee","en_ligne","retiree"] attendu (ETATS de lib/siteCommande.ts, dans l'ordre, suivis de 'retiree') |
| SC | SC-4 | complet | .orchestre/travail/026-018-maquette/supabase/migrations/0103_livraison_commandes.sql | oui | 1 | oui | ❌ SC-4 grant présent dans supabase/migrations/0103_livraison_commandes.sql |
| SC | SC-5 | complet | .orchestre/travail/026-018-maquette/supabase/migrations/0103_livraison_commandes.sql | oui | 1 | oui | ❌ SC-5 index sur (lower(email)) : prédicat « artisan_idisnull », « artisan_id is null and achat_public » attendu |
| SC | SC-6 | complet | .orchestre/travail/026-018-maquette/supabase/migrations/_A_COLLER_sql_editor_0103.sql | oui | 1 | oui | ❌ SC-6 supabase/migrations/_A_COLLER_sql_editor_0103.sql ≠ supabase/migrations/0103_livraison_commandes.sql (sql-nu --verifier, code 1) : ❌ C:\Users\benja\Documents\presti\.orchestre\travail\livraison-schema-qa\jumeaux\_A_COLLER_sql_editor_0103.sql diverge de C:\Users\benja\Documents\presti\.orch… … |
| SC | SC-7 | complet | .orchestre/travail/026-018-maquette/supabase/controles/0103_livraison_commandes.sql | oui | 1 | oui | ❌ SC-7 supabase/controles/0103_livraison_commandes.sql écrit : « insert into » |
| SC | SC-8 | complet | .orchestre/travail/026-018-maquette/.orchestre/preuves/026-021/essai-a-sec.md | oui | 1 | oui | ❌ SC-8 .orchestre/travail/026-018-maquette/.orchestre/preuves/026-021/essai-a-sec.md ne contient pas la phrase exacte « essai-a-sec-0103: toutes les instructions ont passé » |
| SC | SC-9 | complet | .orchestre/travail/026-018-maquette/supabase/migrations/0088_site_commande.sql | oui | 1 | oui | ❌ SC-9 (NR) supabase/migrations/0088_site_commande.sql modifié (hors des quatre fichiers de la fiche) |
| SC | SC-9 | temoin | .orchestre/travail/026-018-temoin/supabase/migrations/0089_sites_bucket.sql | oui | 1 | oui | ❌ SC-9 (NR) supabase/migrations/0089_sites_bucket.sql modifié (hors des quatre fichiers de la fiche) |
| TR | TR-1 | complet | .orchestre/travail/026-018-maquette/lib/direction/tresorerie.ts | oui | 1 | oui | ❌ TR-1 lib/direction/tresorerie.ts n'exporte pas la fonction ventesSites |
| TR | TR-2 | complet | .orchestre/travail/026-018-maquette/lib/direction/tresorerie.ts | oui | 1 | oui | ❌ TR-2 « pile au seuil » : depasse = false, true attendu |
| TR | TR-3 | complet | .orchestre/travail/026-018-maquette/lib/direction/stripe.ts | oui | 1 | oui | ❌ TR-3 encaisseSur7Jours() passe created.gte = 1791451800, 1791365400 (maintenant − 7 j, horloge figée au 2026-10-14T09:30:00.000Z) attendu |
| TR | TR-3 | complet | .orchestre/travail/026-018-maquette/lib/direction/stripe.ts | oui | 1 | oui | ❌ TR-3 encaisseDuMois() a changé : référence {"a":"2026-10-14T09:30:00.000Z","cache":false,"source":"stripe","valeur":{"brut":399,"frais":6.39,"net":392.61,"paiements":2,"partiel":false,"rembour…, courante {"a":"2026-10-14T09:30:00.000Z","cache":false,"source":"stripe","valeur":{"brut":399,"frais":… |
| TR | TR-4 | complet | .orchestre/travail/026-018-maquette/lib/direction/tresorerie.ts | oui | 1 | oui | ❌ TR-4 marge « 0,30 − 0,10 : piège des flottants » : marge = 0.19999999999999998, 0.2 attendu (soustraction de flottants hors centimes) ; marge « 19,99 − 9,99 : piège des flottants » : marge = 9.999999999999998, 10 attendu (soustraction de flottants hors centimes) |
| TR | TR-5 | complet | .orchestre/travail/026-018-maquette/app/api/controle/compta/route.ts | oui | 1 | oui | ❌ TR-5 ligne 67 de la référence changée hors des deux blocs : « .gte('date_facture', anneeDebut).order('date_facture', { ascending: f… » ; ligne ajoutée hors des deux blocs (avant la ligne 68 de la référence) : « .gte('date_facture', anneeDebut).order('date_facture', { ascending: f… » |
| TR | TR-6 | complet | .orchestre/travail/026-018-maquette/lib/direction/tresorerie.ts | oui | 1 | oui | ❌ TR-6 lib/direction/tresorerie.ts:45 « export const suspendre = (id: string) => stripe?.subscriptions.update… » |
| TR | TR-7 | complet | .orchestre/travail/026-018-maquette/lib/direction/tresorerie.ts | oui | 1 | oui | ❌ TR-7 tsc --noEmit en code 2 en 5 s : 1 erreur(s) — lib/direction/tresorerie.ts(45,14): error TS2322: Type 'string' is not assignable to type 'number'. |
| TR | TR-8 | complet | .orchestre/travail/026-018-maquette/app/api/controle/chiffres/route.ts | oui | 1 | oui | ❌ TR-8 (NR) app/api/controle/chiffres/route.ts modifié |
| TR | TR-8 | temoin | .orchestre/travail/026-018-temoin/app/api/controle/barre/route.ts | oui | 1 | oui | ❌ TR-8 (NR) app/api/controle/barre/route.ts modifié |
| TL | TL-1 | complet | .orchestre/travail/026-018-maquette/lib/siteLivraison.ts | oui | 1 | oui | ❌ TL-1 lib/siteLivraison.ts n'exporte pas la fonction heuresOuvreesEntre |
| TL | TL-2 | complet | .orchestre/travail/026-018-maquette/lib/siteLivraison.ts | oui | 1 | oui | ❌ TL-2 « en ligne jamais prévenue » : ["payee","generee","en_ligne"], ["payee","en_ligne"] attendu |
| TL | TL-3 | complet | .orchestre/travail/026-018-maquette/lib/siteLivraison.ts | oui | 1 | oui | ❌ TL-3 « payee » contient « garanti » (classement, garantie ou douze mois : interdits) |
| TL | TL-4 | complet | .orchestre/travail/026-018-maquette/lib/siteLivraison.ts | oui | 1 | oui | ❌ TL-4 envoi refusé : la réservation n'est pas retirée (courriels porte ["payee","en_ligne"]) ; après un envoi refusé, le passage suivant fait 0 envoi(s), 2 attendus ; envoi qui lève : la réservation n'est pas retirée (courriels porte ["payee","en_ligne"]) ; après un envoi qui lève, le passage suiv… |
| TL | TL-5 | complet | .orchestre/travail/026-018-maquette/lib/siteLivraison.ts | oui | 1 | oui | ❌ TL-5 envoi 1 : critique = undefined, true attendu ; envoi 2 : critique = undefined, true attendu |
| TL | TL-6 | complet | .orchestre/travail/026-018-maquette/lib/siteLivraison.ts | oui | 1 | oui | ❌ TL-6 « du vendredi 12 h au lundi 12 h » : 48, 24 attendu ; « du vendredi 23/10 12 h au lundi 26/10 12 h, passage à l’heure d’hiver le dimanche 25/10 » : 48, 24 attendu |
| TL | TL-7 | complet | .orchestre/travail/026-018-maquette/lib/siteLivraison.ts | oui | 1 | oui | ❌ TL-7 retard:7a018000-0000-4000-8000-000000000040:payee : le sujet contient une adresse e-mail ; retard:7a018000-0000-4000-8000-000000000040:payee : le sujet contient « commande.40@presti-test.invalid » ; retard:7a018000-0000-4000-8000-000000000043:generee : le sujet contient une adresse e-mail ; … |
| TL | TL-8 | complet | .orchestre/travail/026-018-maquette/app/api/cron/livraison/route.ts | oui | 1 | oui | ❌ TL-8 app/api/cron/livraison/route.ts : maxDuration ne vaut pas 60 |
| TL | TL-8 | complet | .orchestre/travail/026-018-maquette/app/api/cron/livraison/route.ts | oui | 1 | oui | ❌ TL-8 app/api/cron/livraison/route.ts : un appel à la base (« tourLivraison() const secret ») précède la comparaison au secret |
| TL | TL-8 | temoin | .orchestre/travail/026-018-temoin/app/api/cron/relances/route.ts | oui | 1 | oui | ❌ TL-8 (NR) app/api/cron/relances/route.ts (base 5012625) : ligne 34 de la base retirée ou changée : « const nowIso = new Date().toISOString() » ; app/api/cron/relances/route.ts (base 5012625) : lignes 34-34 ajoutées hors d'un try/catch : « const nowIso = new Date(Date.now() - 1).toISOString() » ; … |
| TL | TL-8 | temoin | .orchestre/travail/026-018-temoin/lib/alertes.ts | oui | 1 | oui | ❌ TL-8 (NR) lib/alertes.ts : entrée(s) retirée(s) de CRONS_ATTENDUS : purges-rgpd:26 ; lib/alertes.ts : entrée(s) ajoutée(s) purges-rgpd:30 (seule { nom: 'livraison', maxHeures: 26 } est permise) |
| TL | TL-9 | complet | .orchestre/travail/026-018-maquette/lib/siteLivraison.ts | oui | 1 | oui | ❌ TL-9 tsc --noEmit en code 2 en 4 s : 1 erreur(s) — lib/siteLivraison.ts(52,14): error TS2322: Type 'string' is not assignable to type 'number'. |
| TA | TA-1 | complet | .orchestre/travail/026-018-maquette/app/api/controle/tresorerie/route.ts | oui | 1 | oui | ❌ TA-1 instruction 1 de GET : « const f = await estFondateur(req) », le drapeau actif('comptabilite') attendu ; instruction 2 de GET : « if (!actif('comptabilite')) return NextResponse.json({ error: 'Introu… », estFondateur(req) attendu |
| TA | TA-2 | complet | .orchestre/travail/026-018-maquette/app/api/controle/tresorerie/route.ts | oui | 1 | oui | ❌ TA-2 la route contient .reduce( (ligne 31) |
| TA | TA-3 | complet | .orchestre/travail/026-018-maquette/app/api/controle/tresorerie/route.ts | oui | 1 | oui | ❌ TA-3 marge.depenses : 9.2 ≠ 41.1 ; marge.marge : 383.41 ≠ 351.51 |
| TA | TA-4 | complet | .orchestre/travail/026-018-maquette/lib/direction/veilleTresorerie.ts | oui | 1 | oui | ❌ TA-4 « mardi 0 h 30 à Paris (lundi en UTC), 90 % » : 1 alerte(s), 0 attendue |
| TA | TA-5 | enfant-veille | .orchestre/travail/026-018-maquette/lib/siteLivraison.ts | oui | 1 | oui | ❌ TA-5 tourLivraison lève quand la veille lève (veille de trésorerie en panne (doublure de TA-5)) |
| TA | TA-5 | temoin | .orchestre/travail/026-018-temoin/app/controle/Comptabilite.tsx | oui | 1 | oui | ❌ TA-5 (NR) app/controle/Comptabilite.tsx : diff de 4 lignes (base 5012625), 3 au plus |
| TA | TA-6 | complet | .orchestre/travail/026-018-maquette/app/controle/TuileArgent.tsx | oui | 1 | oui | ❌ TA-6 source en erreur (encaissé du jour) : la tuile n’écrit pas « non mesuré » |
| TA | TA-7 | complet | .orchestre/travail/026-018-maquette/app/controle/TuileArgent.tsx | oui | 1 | oui | ❌ TA-7 tsc --noEmit en code 2 en 5 s : 1 erreur(s) — app/controle/TuileArgent.tsx(8,14): error TS2322: Type 'string' is not assignable to type 'number'. |

Bilan : 40 mutation(s) prise(s) sur 40.
