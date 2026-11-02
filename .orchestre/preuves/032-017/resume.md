## Ressources utilisées

- **MCP `cerveau`, `regles_pour`** (« relances, impayés, factures, escalade ») : aucune règle propre aux impayés. La seule rendue concerne
  le film CRM, hors sujet. J'ai donc suivi les règles du dépôt : `securite.md`, `autonomie-abonnements.md`, Studio prépare et Signature
  envoie seul.
- **MCP `cerveau`, `chercher`** (« relances impayés contestation carte à valider escalade… ») :
  - la fiche du vault `10 Presti/01 Produit/Geste - Relancer une facture impayée.md` confirme qu'en Studio une relance « à valider »
    bloque sa facture jusqu'à l'envoi ou l'écart ;
  - les notes d'offres (`wiki/concepts/Offres et grille tarifaire.md`, `regles-presti/autonomie-abonnements.md`) fixent le partage des
    rôles entre Studio et Signature.

  D'où le choix : une contestation emprunte le chemin « à valider » qui existe déjà, au lieu d'un nouvel état. La file « À valider » de
  Factures n'est pas filtrée sur l'offre (`app/api/factures/relances-auto/route.ts:44`), et la route a-valider n'exige que
  `factures.relances` (`app/api/factures/relances-auto/a-valider/route.ts:37`). Un artisan Signature peut donc l'envoyer ou l'écarter
  sans toucher à `app/`.
- **Skill `ecc:security-review`** (sécurité et argent). Il m'a fait tenir trois règles :
  - chaque lecture reste bornée au compte : `dossiersDuClient` filtre `devis` et `leads` sur `artisan_id`, `relancesImpayesMagasin.ts:27-39` ;
  - une erreur ferme le chemin au lieu de l'ouvrir : une lecture en panne lève et rien ne part (C10d, C10d2, et l'essai « messages du
    client illisibles » de la suite des impayés) ;
  - aucun secret ni donnée réelle dans les essais.
- **L'audit `.orchestre/preuves/032-015/rapport.md`** : §1 (R1), « Points à valider » point 2, annexes A, C, E et G. Les 13 demandes
  de l'annexe E sont reprises **mot pour mot** dans C10f et C10g. Le mutant C10k rejoue la version 032-009 et retrouve **11/13**, le
  chiffre de l'audit.
- **Le lot fautif** : `.orchestre/preuves/032-009/resume.md` §2 et `.orchestre/fait/032-009.md:38-39`. La tâche demandait « les
  messages entrants du dossier » ; le code lisait en plus `leads.message`. C'est cet ajout qui est retiré.
- **Prompt de l'assistant** (`plans/011-cadrage-01-11/prompts-benj/p3-assistant.md` §3.2, « un geste sensible reste une carte »), cité
  par l'audit. Il a fixé la forme du remède : une carte, pas un arrêt.

## Le correctif (fichier:ligne)

1. **La contestation ne lit que les messages entrants du client, écrits depuis l'émission de la facture.**
   - `lib/relancesImpayesMagasin.ts:81-96` : nouvelle méthode `contestation`. Elle lit `messages` avec `sens = 'in'`, sur les dossiers
     du client, avec `gte('sent_at', debutContestation(facture))` (`:89-91`), et passe le lexique de l'escalade avec les mots de
     l'artisan (`:94-95`).
   - **`leads.message` n'est plus jamais lu**, ni pour le dossier de la facture ni pour un autre dossier du même e-mail.
   - `:75-80` : `reponseClient` redevient exactement la règle de production (un message entrant depuis la référence), sans lexique.
   - `:26-39` : la recherche des dossiers du client est partagée par les deux méthodes (`dossiersDuClient`).
   - `:11-12` : la facture lue porte `date_emission` (migration 0006) et `emise_le` (0041), les deux bornes.
   - `lib/relancesImpayes.ts:265-277` : `debutContestation` prend le plus tôt de `emise_le` et du jour d'émission (minuit à Paris, pris
     large : 22 h UTC la veille). Si les deux sont illisibles, il rend `null` et la lecture se fait sans borne : c'est le côté sûr,
     puisqu'une contestation ne produit plus qu'une carte.
   - `:179-180` : le type `FactureRelancable` reçoit ces deux champs.
2. **Une contestation donne une carte, plus un arrêt.**
   - `lib/relancesImpayesTour.ts:50-54` : `contestation` est ajoutée à l'interface `Magasin`.
   - `:112-113` : elle est lue seulement quand une relance est due.
   - `:133` : `if (!auto || sensible)`. Un client qui conteste fait passer la relance, **même en Signature**, en `a_valider`, avec son
     sujet et son texte. La facture est bloquée tant que la carte attend (decider : `a_valider`).
   - `:147` : l'artisan est prévenu avec le motif.
   - `lib/relancesImpayes.ts:116-129` : `MOTIF_SENSIBLE` vaut « le client conteste ou parle d'un sujet sensible : à relire ».
     `notificationPreparee` l'écrit (« Attention : … ») seulement quand il y a un motif ; le sujet imposé le 25/10 ne change pas.
   - L'arrêt `reponse_client`, donc le libellé « le client a répondu » (`lib/relancesImpayes.ts:293`, inchangé), ne vient plus que d'un
     **vrai** message du client écrit depuis la référence (C10j).
   - Une lecture en erreur lève toujours. Le passage saute le compte et rien ne part (C10d, C10d2).
3. **Le reste de 032-009 n'est pas touché** : E4, E5, l'escalade en « fait tout seul », TTC, D2. Aucun fichier hors des cinq du
   périmètre n'a changé. Leurs essais (A2, A4, A5, A6, C6, C9, D) restent verts dans la même suite (sortie plus bas).
4. **Les autres appelants de `Magasin`** :
   - `scripts/simulation-generale.mjs:488` étend `magasinSupabase` et reçoit donc `contestation` ;
   - `acces-automatisations-qa` et `aide-automatique-qa` ne font que lire le source ;
   - `app/api/cron/relances/route.ts` passe `magasinSupabase` et ne change pas.

## L'essai sur le vrai passage (`tourRelancesImpayes` + vrai `magasinSupabase` + doublure PostgREST)

Lieu : `scripts/securite-assistant-0211-qa.mjs`, section C10 (`:1276-1386`). La facture est émise le 01/10, échue le 15/10, et le
passage tourne le 18/10, à J+3.

| Essai | Ce qu'il joue | Attendu, obtenu |
|---|---|---|
| C10a | témoin, « Merci pour le devis » | part en Signature |
| C10b | 3 contestations écrites le 05/10 (après l'émission, avant l'échéance), Signature | rien ne part ; **carte** `a_valider` avec le motif ; aucun arrêt |
| C10c | contestation, Studio | carte préparée avec le motif ; rien ne part |
| C10d / C10d2 | réglages de la plateforme ou messages illisibles | rien ne part, rien n'est préparé, l'erreur est dite |
| **C10f** | **les 13 demandes de l'annexe E**, Signature | **les 13 relances partent**, aucun arrêt (la production en envoyait 13, l'arbre 032-009 seulement 2) |
| **C10g** | les 13 demandes, Studio | **les 13 sont préparées**, sans motif « sensible », aucun arrêt |
| C10h | autre dossier du même e-mail, « Fuite sur le WC, en 2025 » | part (I2 de l'audit) |
| C10i | « Litige… mon avocat » écrit en mars 2025, avant l'émission | part (la lecture est bornée) |
| C10j / C10j2 | vraie réponse le 16/10, après l'échéance | arrêt `reponse_client`, l'écran dit « le client a répondu » ; aucune carte |

**Les mutants, qui rougissent tous** (chaque motif est exigé par `copie()`, l.138-142) :

| Mutant | Ce qu'il remet en place | Ce que le juge voit |
|---|---|---|
| **C10k** | la demande d'origine relue (la version 032-009, réinjectée dans `contestation`) | **11/13** relances Signature n'y partent plus |
| C10e | la contestation ignorée (`return null`, la version 032-007) | la facture contestée part, e-mail au client |
| C10l | la carte retirée en Signature (`if (!auto)`) | la facture contestée part seule |
| C10m | la borne d'émission retirée | la contestation de mars 2025 retient de nouveau la relance |

**En mémoire**, `scripts/relances-impayes-qa.mjs` :
- `:413-436` : Signature contestée → carte sans arrêt, notification avec le motif, pas de nouvelle proposition au passage suivant ;
  Studio contesté → carte avec le motif ; lecture en panne → rien ne part ; témoin → part seul, personne n'est dérangé ;
  `debutContestation` ; notification.
- `:515-529` et `:481` : les contrôles de source. `contestation` lit `sens = 'in'` borné par `gte('sent_at', debut)` ; ni `contestation` ni
  `reponseClient` ne lisent `leads.message` ; `COLONNES` porte l'émission ; la carte en Signature (`if (!auto || sensible)`).

## La sortie des suites (jouées une à une, hors ligne, par `node scripts/orchestre.mjs verifier 032-017`)

```
✅ relances-impayes-qa : 236/236 contrôles — calendrier, opt-in, arrêts, idempotence, isolation, pause, plafond, sources
PASS C10a … PASS C10m (16 contrôles C10, tous PASS)
PASS D5 aucun appel réseau hors de la doublure : la base factice a servi les lectures, aucune autre adresse n'a été tentée
189 PASS, 0 FAIL
```

Journal complet : `.orchestre/preuves/032-017/verifier.log`.

## Risques et points à valider (session principale, Benj)

- **Le comportement change en Signature.** Une facture dont le client conteste n'est plus arrêtée en silence : elle produit une carte
  « à valider », et l'artisan est prévenu. Il peut l'envoyer, l'écarter, ou arrêter les relances lui-même. Au rang suivant, si la
  contestation est toujours dans les messages depuis l'émission, une nouvelle carte est proposée, jamais un envoi seul. C'est le remède
  du point 2 de 032-015. Il reste à vérifier sur l'écran Factures que la carte d'un compte Signature s'affiche bien dans « À valider » :
  le code le permet (`route.ts:44`), mais je n'ai pas vu l'écran, la session n'en a pas.
- **`COLONNES` lit désormais `date_emission` et `emise_le`** sur `factures`. Les deux colonnes datent des migrations 0006 et 0041, et
  0189 accorde `emise_le` en lecture. Si l'une manquait en production, la lecture des factures échouerait et rien ne partirait (fail-closed).
- **Faux positifs du lexique dans les messages postérieurs à l'émission** (F1 de 032-015 : « humide », « pressé »…). Ils coûtent
  désormais un clic de validation, plus une relance perdue.
- Ni build, ni typecheck, ni commit, ni push, ni migration ici (gardes de l'hôte). La session principale rejoue `verifier` et le
  pré-commit (typecheck) au rapatriement.
