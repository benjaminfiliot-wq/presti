# Brief Hermes — le jeu de données fictif « Exemple. Bâti-Démo » (prompt 5, tâche 035-006)

**Pour qui** : Hermes (volume ; tâche 035-006 de la première réponse au prompt 5, `plans/011-cadrage-01-11/p5-entreprise/premiere-reponse.md`,
tableau « Tâches à déposer après validation », et § 5.1, l'entreprise fictive de la démo). Claude Code relit ensuite et juge.

**Ce que c'est** : les données d'une entreprise du bâtiment **fictive**, « Exemple. Bâti-Démo », qui serviront à la démonstration de « Presti pour
l'entreprise » (mode A, aucun client réel). Elles ont **la même forme que les tables de Presti** : lis les colonnes dans `supabase/migrations/`
(`artisans` 0001, `leads` et `messages`, `devis` et `devis_lignes`, `factures` et `factures_lignes`, `relances`, `relances_impayes`) et dans le
§ 5.1 de la réponse (les membres et leurs rôles : titulaire, associé, administratif, compagnon, invité).

**À faire** : dans `.orchestre/preuves/035-006/exemple/`, un fichier JSON par table (`membres.json`, `demandes.json`, `messages.json`,
`devis.json`, `devis_lignes.json`, `factures.json`, `relances.json`, `relances_impayes.json`), plus `LISEZ-MOI.md` qui dit chaque cas et sa ligne.
- Environ 30 demandes, 15 devis, 10 factures, sur trois mois, cohérents entre eux (une facture vient d'un devis accepté, une relance vise une
  demande ou une facture qui existe).
- Les **cas limites**, chacun au moins une fois et nommé dans `LISEZ-MOI.md` : une demande sans contact ; un doublon (même client, deux demandes) ;
  un client qui a dit « stop » ; un litige écrit dans un message ; un palier de relance manqué ; une ligne de devis sans prix (prix absent) ; un
  sujet d'escalade (dégât des eaux, sinistre, avocat).
- **Rien de réel** : identifiants `00000000-0000-4000-8000-000000000001` et suivants ; e-mails en `@exemple.invalid` ; téléphones en `+33 6 00 00 00 0X` ;
  noms visiblement fictifs ; chaque texte libre commence par « Exemple. » ; montants en centimes, entiers.

**Règles** : réseau neuronal d'abord (MCP `cerveau` : `regles_pour` sur « données fictives, démonstration, offre entreprise ») ; aucune donnée
réelle, aucun envoi, aucune écriture en base ni dans n8n ; tu n'écris que dans `.orchestre/preuves/035-006/exemple/`. En fin :
`--fini <id> --resume "<n> fichiers, <m> cas limites"`.
