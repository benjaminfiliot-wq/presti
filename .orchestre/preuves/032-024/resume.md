# 032-024 — SMS à blanc (chantier 4, lot L7) : preuve

## Ressources utilisées

- **MCP `cerveau`** : `regles_pour` (« SMS, envoi, client, opposition STOP ») → aucune règle supplémentaire rendue ; `chercher` → plan §11, ADR-007, cadrage P3 ; `lire` de l'ADR-007 (jamais de prospection, STOP sur chaque message, journal de chaque envoi, plafonds) : il a fixé les trois types fermés, le refus sans STOP et le journal par `MagasinSms`.
- **Plan `plans/011-cadrage-01-11/chantier-4-assistant-plan.md`** §11 (mot pour mot), §0 bis rang 18, question 3 (l.237) : les portes dans l'ordre, les plafonds 10/100/8 € HT, `SMS_COUT_APPROUVE = null`, « pas de lien ». Il donne aussi la liste des fichiers de `lib/sms/`.
- **Skill `reseau-neuronal`** : lecture seule (rien écrit dans le vault ni le cerveau), citation des notes.
- **Skill `ecc:security-review`** (checklist appliquée au code) : aucun secret en dur (test 18e) ; entrée validée par liste blanche (type, source du numéro, expéditeur) ; JSON du corps fournisseur par `JSON.stringify` ; erreurs génériques sans détail fournisseur ; clé API lue à l'appel et jamais versionnée ; aucun journal de numéro ou de texte dans l'adaptateur (le journal est le magasin `sms_envois`, 0186 non appliquée).
- **Sources du dépôt** : `lib/agents/sortie.ts:12-20` (pause générale, fail-closed repris tel quel pour l'interrupteur, les compteurs et le disjoncteur), `lib/plans.ts:149` (`peut`), `lib/flags.ts:319` (`smsClients: false`), `lib/email.ts:6-11` (white-label : jamais « Presti » devant un client), `scripts/ts-loader.mjs`, `scripts/assistant-qa.mjs` (forme du juge).
- **Non disponible, dit franchement** : la recherche R5 (§7.2, §7.3, §9) n'est pas dans le dépôt (scratchpad de la nuit du 02/11). Les 13 cas ci-dessous sont **reconstruits du plan §11, porte par porte**, pas copiés de R5 §9. Les skills de design, n8n, vidéo n'ont pas d'objet ici.

## Les fichiers (périmètre respecté)

`lib/sms/` : `contrat.ts` (types, trois types fermés, plafonds, `MagasinSms`), `encodage.ts` (GSM-7 pur, septets, segments, STOP, lien, montant, menace), `expediteur.ts`, `numero.ts`, `plage.ts`, `lien.ts`, `tarifs.ts`, `envoyer.ts`, `fournisseurs/factice.ts` (fournisseur et magasin en mémoire), `fournisseurs/sweego.ts` (jamais importé ni appelé). Plus `scripts/sms-qa.mjs` et cette preuve. Rien d'autre touché (`lib/flags.ts`, `lib/plans.ts`, `app/`, `supabase/` : intacts).

## Les portes, au fichier:ligne (`lib/sms/envoyer.ts`)

| Porte | Ligne | Ferme si |
|---|---|---|
| 1 | 55 | drapeau `smsClients` baissé (rien lu, rien appelé), `sms_arret` posé / illisible / absent, type hors liste, pause générale ou doute |
| 2 | 69 | `peut(plan, 'assistant')` faux, ou pas de geste de l'artisan |
| 3 | 73 | pas un mobile de métropole, numéro non donné pour le chantier, **opposition** (STOP reçu) ou lecture illisible |
| 4 | 83 | expéditeur vide, trop court, numérique ou contenant « Presti » |
| 5 | 87 | **pas de STOP** (`encodage.ts:65`), lien, montant, menace, hors GSM-7 pur, plus d'un segment ; dimanche, férié, hors 8 h–20 h Paris |
| 6 | 94 | réel : coût non approuvé ou tarif `null` (l.108), fournisseur absent, disjoncteur ; toujours : clé « incertain / en cours » (l.119), doublon, plafonds 10 / 100 / 8 € (l.125-128), réservation atomique (l.136) |

À blanc par défaut : `mode: 'blanc'` rend `simule` avec `estimation` (segments, encodage, coût calculé par le code ou « inconnu »), le fournisseur n'est pas appelé. `SMS_COUT_APPROUVE = null` (`tarifs.ts:23`) et tous les tarifs sont `null` : aucun prix écrit.

## Les cas

13 cas (plan §11) : 1 drapeau baissé = rien du tout · 2 à blanc : simulé, estimation, `fetch` jamais touché · 3 type hors liste · 4 pause, `sms_arret`, doute · 5 offre et geste · 6 mobile de métropole (formats +33, 0033, espaces ; fixes, 08, outre-mer, étranger refusés) · 7 numéro donné pour ce chantier · 8 expéditeur · 9 GSM-7 et segments (160/161, 306/307, UCS-2 70/71, « ç » minuscule fait basculer) · 10 pas de lien, et lien `sms:` RFC 5724 de l'étape 0 · 11 ni montant ni menace · 12 plage (mardi, samedi 7 h 59 / 8 h / 19 h 59 / 20 h, dimanche, fériés dont Pâques calculé, heure d'été et d'hiver, minuit) · 13 idempotence, plafonds, disjoncteur, « incertain » jamais renvoyé (réponse incertaine, exception, délai, clé « en cours », deux demandes simultanées).
Compléments demandés : 14 un SMS sans STOP est refusé · 15 tarif `null` = pas de réel · 16 hors plage = refusé · 17 opposition = refusé. Plus 18 : le code (Sweego fermé par `FORME_VERIFIEE = false`, aucun `fetch`, aucun secret, aucun numéro réel hors plage de fiction 07 35 46).

## Les mutants : 30 sur 30 tués

Chaque mutation est appliquée à une copie de `lib/sms/` (supprimée ensuite) ; la suite doit rougir. Dont : STOP retiré, plage ouverte, dimanche permis, fériés ignorés, lundi de Pâques oublié, UTC+1 en dur, plafond artisan / total / compteur illisible ignorés, expéditeur « Presti » accepté, tarif `null` ignoré, opposition ignorée, « incertain » renvoyé, réservation non atomique, drapeau ignoré, à blanc qui sort, geste ignoré, GSM-7 laxiste, lien / montant / menace permis, 160 septets comptés pour 2, fixe et outre-mer acceptés, numéro hors chantier accepté, pause ignorée, disjoncteur absent = ouvert, exception fournisseur rejouable, Sweego ouvert, lien `sms:` sans contrôle. Un mutant « doublon renvoyé » (test de l'état seul) a été écarté : équivalent, la réservation atomique referme la même porte ; elle est testée à part (13t).

## Sortie (`sortie-sms-qa.txt`)

```
Suite réelle : 172 verts, 0 rouges
Mutants : 30/30 tués
Appels réseau tentés pendant la suite : 0
SMS-QA : TOUT VERT (172 assertions, 30 mutants tués)
```

## Limites et choix à connaître

- Segments : `SEGMENTS_MAX = 1` (consigne de la tâche) alors que la porte 5 du plan dit « deux au plus » : plus étroit, assumé.
- Opposition lue **par numéro, tous artisans confondus** : un STOP adressé à un artisan ferme le numéro pour tous. Plus sûr ; à relâcher par artisan si Benj le veut.
- `typecheck` non lancé (interdit ici) : le code est typé strictement et tourne sous `--experimental-strip-types` ; à rejouer par la session principale.
- Plage « mobiles d'outre-mer en 06 » et plage de fiction 07 35 46 : de mémoire, **à revérifier auprès de l'ARCEP** ; l'adresse et le corps de l'API Sweego (`sweego.ts`) sont provisoires, non vérifiés, et le fournisseur refuse d'émettre tant que `FORME_VERIFIEE` est `false`.
- Pas de branchement : aucune route, aucune table (`sms_envois`, `sms_oppositions`, `sms_expediteurs` = 0186, non appliquée), aucun n8n. Le chemin d'envoi (question 3 : n8n `presti-sms-envoi` ou `lib/sms`) reste à trancher.

## Ce qui attend Benj

Le fournisseur et son compte ; le « go » écrit sur le prix d'un segment (la session principale sourcera `tarifs.ts` et fixera `SMS_COUT_APPROUVE`) ; les plafonds et qui paie ; la forme du STOP et le chemin d'envoi (question 3) ; la migration 0186 ; les questions au support du fournisseur (R5 S8), le registre des traitements et le DPA. Rien ne peut sortir avant : drapeau baissé, coût `null`, Sweego fermé.
