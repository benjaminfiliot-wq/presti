## Ressources utilisées

- **MCP `cerveau`** (skill `reseau-neuronal` chargé d'abord : lecture seule, rien écrit dans le vault) — `regles_pour` (« réponse automatique qui part seule, e-mail,
  marque blanche, bascule vers n8n ») n'a rendu aucune règle propre à ce geste (Brevo ADR-004, `presti/CLAUDE.md`, une note sans rapport) : les règles écrites du
  dépôt font foi. `chercher` : **ADR-001** (toutes les automatisations dans n8n) et **ADR-008** (n8n-first) ; elles fixent le périmètre — un chemin codé se
  bascule en cinq pas, ici 1 à 3, l'ancien code reste, rien n'est rasé.
- **MCP `n8n-oracle`** — `get_workflow_sdk_reference` (forme du code du SDK : `.add(x).to(a).add(x).to(b)` pour le départ en parallèle), `get_workflow_best_practices`
  (`scheduling` : pas de rattrapage des passages manqués ; `content_generation` : le nœud de modèle), `search_nodes`, `validate_workflow`,
  `create_workflow_from_code`, `update_workflow` (code des nœuds, réglages, branche d'erreur), `get_workflow_details` (identifiants de nœuds de l'export),
  `test_workflow` (exécutions **406** et **407**), `get_workflow_execution` (sorties relevées). Aucun identifiant créé ni modifié ; rien activé.
- **`plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md` et `fiches-videos.md`** — le tri « urgence, peut attendre, curieux » est l'escalade de
  `lib/pilote/regles.ts` (fiche l.313) ; « un avis difficile d'abord au patron, les autres seuls » (l.382-384) : ce qui touche un humain en colère ne part jamais seul ;
  `fiches-videos.md` l.655-656 : « un sujet d'escalade reste humain » → le mot d'escalade arrête tout et alerte l'artisan, avec le mot dans le sujet.
- **TOUTES-LES-TRANSCRIPTIONS.md** (`/home/usine/agents/videos/references-2026-11-02/restructureai/`, lues aux lignes 388-399, 1168-1180 et 1603-1612, plus la recherche
  des mots « stop », « human », « approve ») — « une demande à 23 h 40 reçoit une réponse en moins d'une minute » : ce que ces vidéos promettent est la **réponse
  immédiate**, pas un e-mail 90 s plus tard → la route répond tout de suite sur la page, d'où la voie B recommandée (n8n n'est pas ce chemin-là) ; « le propriétaire
  garde l'offre, le prix et tout ce qui ressemble à une promesse » et « si quelque chose cloche, ça s'arrête et appelle le patron » → mot d'escalade, sujets du
  plancher, plage horaire et mode assisté arrêtent tout, et l'alerte est un courrier à l'artisan.
- **Prompt 3** (`plans/011-cadrage-01-11/prompts-benj/p3-assistant.md` §3.2, l.552-553) — « parler au nom de l'artisan sur un sujet d'escalade ne s'automatise jamais,
  même au niveau 3 » : le juge rejoue la vraie `decisionReponse` sur 585 couples (le sujet « avocat » absent des mots de l'artisan arrête la réponse seule, mais pas le brouillon assisté).
- **Le plan du chantier 4** (§ 0 bis : mention d'IA en marque blanche, « n8n tire et ne reçoit rien », ce que n8n lit, mise en service ; lot L18),
  **`.claude/rules/`** (`migration-production.md` : pas 1 à 3 ; `autonomie-abonnements.md` : Studio prépare, Signature envoie seul ; `securite.md` : rien d'envoyé,
  aucun identifiant ; `email-brevo.md` : l'e-mail du produit n'est pas de la prospection froide) et le **modèle 032-040** (`presti-accuse-reception` : forme du juge,
  du brief, de la preuve ; fenêtre d'une minute sans mémoire).
- **Le code lui-même, joué** : `app/api/leads/route.ts`, `lib/email.ts`, `lib/notifications.ts`, `lib/plateformeConfig.ts`, `lib/pilote/regles.ts`, `lib/plans.ts`,
  `lib/mentionAssistant.ts` — la comparaison n'est pas une lecture, c'est la vraie route exécutée avec des doublures. Les listes de mots d'escalade du nœud sont
  **générées** depuis `lib/pilote/regles.ts` (`generer.mjs`), jamais retapées.

## Le workflow

`presti-reponse-seule`, n8n d'Oracle, **id `5g63ItVJ41l3yP9V`**, `active: false`, aucune version publiée (`activeVersionId: null`), fuseau `Europe/Paris`, 15 nœuds.
Export : `presti-reponse-seule.workflow.json` (écrit par `exporter.mjs` depuis les sources des nœuds Code (`noeuds/`) et les identifiants de nœuds rendus par n8n ;
copie dans `plans/011-cadrage-01-11/briefs/c4-n8n-reponse-seule.workflow.json`). **Honnêteté sur l'export** : le lien avec n8n est tenu par le rejeu — le juge rejoue
le code de l'export sur la pin data de l'exécution 406 et retrouve, au caractère près, les sorties que n8n a rendues pour `Decider`, `Modele epingle` et
`Courriers a envoyer` (un code différent de celui de n8n ferait rougir ce contrôle). Toutes les minutes → fenêtre du passage → six lectures `GET` (aucune écriture) →
`Decider` → `Modele epingle` (**épinglé : un nœud Code sans réseau ni module, aucun appel**) → `Courriers a envoyer` → deux filtres en parallèle → **deux nœuds d'envoi
désactivés, sans identifiant, sans « envoyé avec n8n »** (réponse : `pied: mention` ; avis : `pied: aucun`). « Supabase account » existait ; `presti-erreurs` désigné
comme workflow d'erreur. Détail : `plans/011-cadrage-01-11/briefs/c4-n8n-reponse-seule.md`.

## L'essai à blanc

`test_workflow` sur pin data fictive (`essai-pin.json`, noms « Exemple. », adresses `@exemple.test`), **exécution 406, `success`** (03/11/2026 00:21:39 UTC, 115 ms en tout :
`Decider` 23 ms, `Modele epingle` 9 ms, `Courriers a envoyer` 15 ms) ; sorties : `essai-n8n.json`. Dix demandes : Signature auto avec e-mail, Signature auto avec téléphone,
Studio en auto (verrou d'offre), mot d'escalade « fuite », sujet du plancher « avocat », mode manuel, et quatre demandes à la même adresse (casse variée) →
**6 `part_seul`, 1 `attend_artisan`, 2 `escalade`, 1 `refus` ; 4 réponses au prospect (la quatrième adresse est refusée par le plafond), 8 avis (6 « Nouveau lead », 2 alertes)**.
Le nœud `Fenetre du passage` a aussi tourné sur l'horloge réelle (exécution 407) : fenêtre `[00:20:30, 00:21:30)`, minuit de Paris `2026-11-02T23:00:00Z`. Les envois sont
désactivés : rien n'est parti ; le modèle est épinglé : aucun appel, aucun crédit.

## Comparaison à l'ancien code

`node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/reponse-seule-n8n-qa.mjs` → **OK, code 0** (`reponse-seule-n8n-qa.txt`). Le juge **joue la vraie
`app/api/leads/route.ts`** sur 25 cas et 99 demandes (vraie `lib/email.ts` avec un `fetch` qui note ce que Resend recevrait, vraie `lib/notifications.ts`, vraie
`decisionReponse` en espion, horloge figée), en déduit la décision de la route, rejoue les nœuds Code de l'export et compare **la décision et le courrier entier**
(`From`, `To`, sujet, texte avec la mention, `Reply-To`) : **99 décisions, 50 réponses et 74 avis identiques** à ceux de la route, aux écarts écrits près. Il joue en
plus la vraie `decisionReponse` sur **585 couples** (43 messages × 13 réglages et offres). Cas par cas (même demande, même résultat) :

| Cas | Route | n8n | Résultat |
|---|---|---|---|
| Signature, auto, e-mail du prospect, adresse de l'artisan | réponse avec mention + avis « Nouveau lead » | idem | identiques |
| Signature, auto, prospect avec téléphone | avis « à rappeler », pas d'e-mail | idem | identiques |
| **Studio** en mode auto | verrou d'offre : réponse proposée, rien ne part | `attend_artisan` / `verrou_offre`, aucun courrier | identiques |
| Studio assisté (aucun réglage) ; **Signature en mode assisté** | réponse proposée | `attend_artisan` / `assistee` | identiques |
| **Signature en mode auto** | la réponse part seule | `part_seul`, courrier `reponse` | identiques |
| Signature manuelle | silence | `refus` / `manuelle` | identiques |
| **Mot d'escalade** : « STOP » (mot de l'artisan), « fuite » (par défaut) | silence + alerte « ⚠️ Demande sensible (« mot ») » | `escalade` + mot, alerte identique | identiques (le mot est dans le sujet : n8n lit le message) |
| Sujet du plancher « avocat » (absent des mots de l'artisan) ; le même en assisté | alerte ; brouillon proposé | `escalade` ; `attend_artisan` | identiques |
| Mot d'escalade en mode manuel | `manuelle` passe avant | `refus` / `manuelle` | identiques |
| **Demande sans contact** (variante B) | réponse préparée pour la page, aucun e-mail | `part_seul`, `envoi: sans_coordonnees`, aucun courrier | identiques |
| **Nuit** : plage fermée | silence | `refus` / `horaire` | identiques |
| Limite à zéro ; compte en pause ; rafale de dix demandes | `limite` ; `pause` ; 8 réponses, 2 étranglées | idem | identiques |
| La même adresse ×4 (casse variée) | 3 réponses, le 4ᵉ refusé ; l'avis dit « N'EST PAS PARTI » | idem | identiques |
| 60 demandes dans la journée | 30 réponses, 50 avis, puis rien | idem | identiques |
| Adresses `.invalid` ; notification coupée ; noms chargés (`&`, `"`, `<>`, deux lignes) | — | — | identiques |
| Adresse atypique (`a"b@…`) | réponse envoyée | pas de réponse, avis « N'EST PAS PARTI » | **E3** |
| Photos jointes | avis « Photos jointes : 1 » | non lu | **E1** |
| Crédits épuisés | rien préparé | `part_seul` (n8n ne lit pas le solde) | **E2** |
| Notification poussée | déclenchée | non refaite | **E4** |

**« STOP »** : la route ne connaît pas de désinscription sur un message entrant ; le cas du juge est un mot d'escalade réglé par l'artisan.
**52 mutants, tous rouges** : Studio qui part seul (verrou retiré, offre « studio » ajoutée), mot d'escalade ignoré (artisan, plancher, ordre avec le mode manuel), assisté ou
manuel qui part seul, plage, limite, pause, rafale ignorées, liste de mots amputée, mention d'IA ôtée (code ou nœud), « Presti » dans le message ou l'expéditeur, `Reply-To`
perdu, envois activés, identifiant SMTP, « envoyé avec n8n », pied changé, plafonds changés, adresses atypiques ou `.invalid` acceptées, alerte sans le mot, avis menteur,
modèle qui répond autre chose / appelle le réseau / remplacé par un POST / non déclaré, colonnes lues en trop, workflow actif, branche d'erreur retirée, exécutions réussies
gardées, déclencheur à 8 h, fenêtres sans décalage / non alignée / de deux minutes. Garde commune `n8n-specs-qa` sur l'export : R1 à R7 tenues.

## Avant la bascule

Pas 4 et 5 : rien n'est fait ; l'ancien envoi (`app/api/leads/route.ts:473-509`) tourne toujours. Ce que Benj décide, dans l'ordre (détail et justifications dans le brief) :
1. **La page du prospect affiche la réponse tout de suite** (`reply` dans la réponse HTTP, `:547`) ; n8n ne peut pas remplacer ce chemin et écrirait un second texte.
   Voie **B recommandée** : la route garde la rédaction ; n8n lit le texte enregistré (`messages`) et l'envoie au nom de l'artisan avec la mention, sa décision servant de contre-contrôle ;
   voie **A** : n8n rédige, la page n'affiche plus de réponse immédiate (la promesse « moins d'une minute » change) ;
2. **les écritures que n8n ne peut pas faire** (message sortant, statut `repondu`, relances J+2/5/10, débit du crédit) : une fonction en base écrite par n8n (exception à 0189,
   migration collée AVANT toute publication) ou la route qui les garde ;
3. **le nœud de modèle et la garde commune** : la liste blanche « c4 » de `scripts/n8n-specs-qa.mjs` n'admet aucun nœud de modèle (fichier hors périmètre ici) ; à ouvrir pour publier la voie A ;
4. **le recouvrement avec `presti-accuse-reception`** sur l'alerte d'escalade (un seul des deux workflows alerte) ;
5. **ce que n8n lit** : le message du prospect, déclaré en « lecture au moment d'envoyer » ; vue étroite des droits (0189), section du registre des traitements, durée des exécutions en erreur ;
6. **le plafond d'e-mails du jour** (Resend gratuit : 100 par jour ; 032-040 et ce workflow comptent chacun leurs 30 envois anonymes) ;
7. **l'identifiant SMTP** (réglage de compte, interdit à un agent), puis réactiver les deux nœuds ;
8. **un passage d'ombre** de quelques jours (envois désactivés, comparaison chaque matin) ;
9. **pas 4** : drapeau neuf `reponseParN8n` baissé ; publier, constater un passage, puis le lever dans la minute (au pire deux réponses ; l'inverse en perdrait). Retour : baisser et dépublier ensemble ;
10. **pas 5** : `reponseParN8n` seul gouverne ce chemin (`lib/flags.ts` fait foi).

**Le prompt que n8n devra porter** (voie A) : celui de `lib/ai.ts:397-455` — système (« Tu es l'assistant de {artisan}, {métier}. Tu écris À SA PLACE la toute première réponse… », cadre d'adaptation,
règles : aucun prix chiffré, aucun délai précis, une prochaine étape concrète, signé du nom de l'artisan, texte seul) + blocs métier, persona et intention + `GARDE_FOUS` (`lib/ai.ts:371-378`) ;
utilisateur : nom, canal, besoin emballé par `blocProspect` ; puis `garderAvantEnvoi` (anti-fabrication) et une revalidation ; texte vide → rien ne part. Transcrit dans le brief, § « Le prompt que n8n devra porter ». La mention d'IA n'est jamais dans le prompt.

**Le délai que n8n ajoute à la réponse, mesuré** : l'attente due au calendrier est de **31 à 90 s, 60,5 s en moyenne** (chaque seconde de sept minutes, gigue de 0 à 8 s ; théorique 30 à 90 s) ;
l'exécution dans n8n, lectures épinglées, dure **115 ms**. **Non mesuré, dit** : les six lectures réelles de Supabase, l'appel du vrai modèle et l'envoi SMTP — à mesurer au passage d'ombre.
La promesse « moins d'une minute » (`plans/promesses.md:8`) vise la réponse affichée à l'écran, pas l'e-mail de n8n.

## Fichiers

- `scripts/reponse-seule-n8n-qa.mjs` (neuf) — le juge ; hors `SUITES` du lanceur des suites (interdit à cette tâche) : à y ajouter par la session principale (il joue la vraie route avec
  des doublures, aucune base, aucun réseau, environ trois minutes avec les 52 mutants).
- `plans/011-cadrage-01-11/briefs/c4-n8n-reponse-seule.md` et `.workflow.json` (neufs).
- `.orchestre/preuves/032-042/` : `presti-reponse-seule.workflow.json`, `essai-pin.json`, `essai-n8n.json`, `reponse-seule-n8n-qa.txt`, `resume.md`, `generer.mjs`, `workflow-def.mjs`,
  `sdk.mjs`, `exporter.mjs`, `noeuds/` (sources des nœuds Code : `fenetre.js`, `decider.modele.js`, `decider.js` généré, `modele.js`, `courriers.js`), `sdk.txt`.
- n8n d'Oracle : `presti-reponse-seule` (`5g63ItVJ41l3yP9V`), inactif. Aucun autre workflow touché, aucun identifiant, aucune base lue ou écrite, aucun appel de modèle, aucun envoi.
