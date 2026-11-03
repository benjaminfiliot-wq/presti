## Ressources utilisées

- **MCP `cerveau`** — `regles_pour` (« n8n, e-mail, marque blanche : workflow presti-accuse-reception… ») a rendu une liste vide : aucune règle propre à
  ce geste, donc les règles écrites du dépôt font foi. `chercher` : **ADR-001** (toutes les automatisations dans n8n) et **ADR-008** (n8n-first,
  la logique métier récurrente aussi) ; elles fixent le périmètre — un chemin codé se bascule en cinq pas, ici 1 à 3, l'ancien code reste, rien n'est
  rasé. Le skill `reseau-neuronal` a cadré l'usage (lecture seule, aucune note écrite).
- **MCP `n8n-oracle`** — `get_workflow_sdk_reference` (fan-out : `.add(x).to(a).add(x).to(b)` ; sans cela mon premier montage chaînait l'avis
  *derrière* l'accusé, défaut vu à la relecture de `get_workflow_details` et corrigé par `update_workflow`) ; `get_workflow_best_practices`
  (`scheduling` : pas de rattrapage des passages manqués, fuseau dans le déclencheur, ne pas forcer `alwaysOutputData` — gardé hors des lectures ici
  parce qu'une lecture vide doit arrêter la chaîne ; `notification` : pas d'envoi à vide, branches en parallèle) ; `search_nodes`, `get_node_types`
  (`emailSend` 2.1 : `appendAttribution` vaut vrai par défaut et ajouterait « envoyé avec n8n » → coupé) ; `validate_workflow`,
  `create_workflow_from_code`, `update_workflow` (trois versions), `test_workflow` (exécutions 380, 381, 391, 400), `get_workflow_execution`,
  `get_workflow_details`, `list_credentials` (aucun identifiant SMTP n'existe : rien n'est créé), `search_workflows`.
- **`plans/011-cadrage-01-11/p5-entreprise/fiche-methode-n8n.md`** (point 6 : l'unicité tient à une clé en base, pas à n8n ; `scheduling` : pas de rattrapage ;
  « un déclencheur par sondage marque l'élément traité après l'écriture ») → n8n n'écrit pas : l'unicité d'un accusé tient à des fenêtres d'une minute
  sans trou ni chevauchement, prouvées par le juge ; le trou en cas de panne est dit et soumis à Benj (décision 7).
- **`plans/011-cadrage-01-11/p5-entreprise/fiches-depots.md`** (n° 1, *B2B Demo Lead Rescue Desk* : rejet si aucun moyen de contact ; alertes par
  e-mail) et **`fiches-videos.md`** (l. 941 : le pilote borné à 10 minutes d'annulation et 20 envois par jour ; l. 653 : « Agent Alerte », une liste
  fermée d'interruptions) ; **`fiches-videos-restructureai.md`** (la vidéo « Grok Lead Gen » : un lead sans réponse se perd) → une demande sans
  coordonnées ne produit rien ; les envois sont **bornés** par jour (30 accusés, 50 avis) au lieu d'être laissés sans plafond dans n8n ; l'alerte
  « demande sensible » est conservée (liste fermée de motifs).
- **Le plan du chantier 4** (§ 0 bis : « n8n tire et ne reçoit rien », pieds d'e-mail, « Ce que n8n lit » ; tableau des chemins codés ; lot L18),
  **la règle de remplacement** (`.claude/rules/migration-production.md`), **`email-brevo.md`** (la prospection froide a son quota : l'accusé est un
  e-mail du produit, il n'y touche pas) et **`securite.md`** (aucun identifiant saisi, aucune migration, aucun envoi) ; le **modèle 032-031**
  (`presti-apres-chantier`) pour la forme du juge, du brief et de la preuve.
- **Le code lui-même, joué** : `app/api/leads/route.ts`, `lib/email.ts`, `lib/notifications.ts`, `lib/plateformeConfig.ts` — la comparaison n'est pas
  une lecture, c'est la vraie route exécutée avec des doublures (voir plus bas). Elle a révélé trois écarts que je n'avais pas lus dans le code :
  le `Reply-To` de l'avis vaut `contact@prestiapp.fr` quand le prospect n'a pas d'e-mail ; les adresses `.invalid` sont ignorées en silence ; le
  plafond du jour de l'ancien code ne coupait que l'accusé, pas l'avis.

## Le workflow

`presti-accuse-reception`, n8n d'Oracle, **id `VnU1onu9T4Z2asTu`**, `active: false`, aucune version publiée (`activeVersionId: null`), fuseau
`Europe/Paris`, 12 nœuds (dont une note). Export : `presti-accuse-reception.workflow.json` (écrit par `exporter.mjs` depuis les sources des nœuds
Code (`noeuds/`) et les identifiants de nœuds rendus par n8n ; copie dans `plans/011-cadrage-01-11/briefs/`). **Honnêteté sur l'export** : il n'a pas été
retiré de `get_workflow_details` après la dernière version ; le lien avec n8n est tenu autrement — le juge rejoue le code de l'export sur la pin
data de l'exécution 400 et doit retrouver, au caractère près, ce que n8n a rendu (un code différent de celui de n8n ferait rougir ce contrôle,
ce qu'il a fait deux fois pendant la mise au point).
Toutes les minutes → fenêtre du passage → quatre lectures `GET` (aucune écriture) → `Courriers a envoyer` (code pur) → deux filtres en parallèle
→ **deux nœuds d'envoi désactivés, sans identifiant, sans « envoyé avec n8n »**. Aucun identifiant créé ni modifié (« Supabase account » existait ;
`presti-erreurs` désigné comme workflow d'erreur). Détail : `plans/011-cadrage-01-11/briefs/c4-n8n-accuse-reception.md`.
**Ce que le workflow ne fait pas seul** : il n'agit que sur les demandes dont la route a déposé un motif dans `leads.motif_reponse` — colonne
**proposée, qui n'existe pas** ; tant qu'elle manque, rien ne part (et, publié sans elle, chaque lecture échouerait : migration d'abord).

## L'essai à blanc

`test_workflow` sur pin data fictive (`essai-pin.json`, noms « Exemple. », adresses `@exemple.test`), **exécution 400, `success`** (02/11/2026
22:35:10 UTC, 61 ms) ; sortie : `essai-n8n.json`. Sept demandes dans une fenêtre : manuelle, prospect sans e-mail, artisan sans adresse, doublon
(« Doublon@Exemple.test » après « doublon@exemple.test »), STOP (escalade), nuit (hors plage) → **6 avis, 6 accusés, 1 avis écarté** (artisan
sans adresse). Le nœud `Fenetre du passage` a aussi tourné sur l'horloge réelle (exécution 381, 22:25:38 UTC, 37 ms) et rendu la fenêtre
`[22:23:30, 22:24:30)`, minuit de Paris `2026-11-01T23:00:00Z`. Les envois sont désactivés : rien n'est parti.

## Comparaison à l'ancien code

`node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/accuse-reception-n8n-qa.mjs` → **OK, code 0** (`accuse-reception-n8n-qa.txt`).
Le juge **joue la vraie `app/api/leads/route.ts`** sur 20 cas et 94 demandes, avec la vraie `lib/email.ts` (un `fetch` qui note ce que Resend recevrait),
la vraie `lib/notifications.ts` et la vraie `decisionReponse` (espion) ; il en déduit le motif, fabrique les lectures du workflow, rejoue ses nœuds
Code (contexte vm, `Date` figée) et compare **le courrier entier** (`From`, `To`, sujet, texte, `Reply-To`) : **73 avis et 52 accusés identiques**
à ceux de la route, aux écarts écrits près. Cas par cas (même demande, même résultat) :

| Cas | Route | n8n | Résultat |
|---|---|---|---|
| manuelle, prospect avec e-mail, artisan avec adresse | avis + accusé | avis + accusé | identiques (E1 sur l'avis) |
| prospect sans e-mail (téléphone) | avis seul | avis seul | identiques (E1) ; `Reply-To` de l'avis = Presti dans les deux |
| artisan sans adresse | accusé seul, sans `Reply-To` | idem | identiques |
| doublon : même adresse ×4, casse variée | 3 × (avis + accusé), puis avis seul | idem | identiques (plafond de 3 par destinataire) |
| STOP (mot d'escalade de l'artisan) ; « fuite » (mot par défaut) | avis ⚠️ + accusé | idem | identiques, à E2 près (le mot n'est pas dans le sujet) |
| nuit : Signature, mode auto, plage fermée | avis + accusé | idem | identiques (E1) |
| jour : Signature, plage ouverte | la réponse part seule | rien | hors lot, n8n ne prépare rien |
| Studio en mode auto (verrou d'offre) ; Studio assistée | réponse proposée | rien | hors lot |
| Signature en mode manuel | avis + accusé | idem | identiques : l'offre ne change rien, le motif décide |
| notification « nouvelle demande » coupée | accusé seul | idem | identiques |
| adresses `.invalid` (prospect, artisan) | rien vers elles | idem | identiques |
| dix demandes de suite d'un artisan | 8 × (avis + accusé), 2 étranglées | idem (motif `throttle` → rien) | identiques |
| compte en pause | rien | rien | identiques |
| premier message sans coordonnées | avis neutre | rien | **E5** : l'avis neutre reste dans le code |
| 60 demandes dans la journée | 30 accusés, 50 avis, puis rien | idem | identiques (plafonds 30 et 50) |
| adresse atypique (`a"b@…`) | avis + accusé | avis seul | **E3** |
| noms (artisan sans nom, `&`, `"`, `<>`, prospect sans nom, prénom composé, message sur deux lignes) | — | — | identiques (E1 sur le message à deux lignes) |
| crédits épuisés | avis (sans accusé) | rien | hors lot |

Écarts écrits (brief, « Comparaison ») : **E1** « Besoin » et photos non lus (renvoi à l'espace) ; **E2** mot d'escalade absent du sujet ; **E3**
adresse atypique sans accusé ; **E4** notification poussée non refaite (observée dans les cas : la route la déclenche) ; **E5** premier message
sans coordonnées laissé au code. Chaque écart doit avoir été **observé** par au moins un cas, sinon le juge rougit.
**Copie figée** contrôlée contre le code : plafond par destinataire (3), plafond anonyme (30), part du produit moins part anonyme (50),
expéditeur et adresse de l'entreprise (`contact@prestiapp.fr`), motifs du silence (déduits du type `Blocage` de `lib/plateformeConfig.ts`).
**32 mutants, tous rouges** : texte de l'accusé, expéditeur « Presti », `Reply-To` perdu, prénom ignoré, plafonds (destinataire, jour, avis) changés ou
retirés, plafond du jour qui coupe aussi l'avis, casse des adresses, motifs élargis à `assistee`, préférence de notification ignorée, adresse
atypique ou `.invalid` acceptée, sujet sensible perdu, mention d'IA ajoutée, demande sans coordonnées servie, fenêtre sans décalage / non alignée /
de deux minutes, envoi réactivé, identifiant SMTP posé, « envoyé avec n8n » rétabli, colonne `message` lue, lecture en POST, lecture sans déclaration,
pied non déclaré, workflow actif, workflow d'erreur retiré, avis en série derrière l'accusé, exécutions réussies gardées, déclencheur à 8 h.
Garde commune `n8n-specs-qa` sur l'export : R1 à R7 tenues.

## Avant la bascule

Pas 4 et 5 : rien n'est fait ; l'ancien envoi (`app/api/leads/route.ts:385-407`) tourne toujours. Ce que Benj décide, dans l'ordre (détail, SQL et
justifications dans le brief) :
1. accepter les écarts E1 à E5 (E2 retire le mot d'une alerte : décision de produit), ou ne basculer que l'accusé ;
2. le « go » de la migration `leads.motif_reponse` (collée **avant** toute publication) et le geste de la route : écrire le motif après la
   décision, un drapeau neuf `accuseParN8n` qui saute l'envoi du silence **sauf la push** (`notifierArtisan` sans e-mail), code gardé ;
3. les droits de lecture (0189 exclut nom, adresse, e-mail) : accorder, ou une vue étroite des demandes dues (recommandée), ou l'écrire au registre ;
4. le plafond d'e-mails du jour : n8n envoie hors du compteur de `lib/email.ts` (offre Resend gratuite : 100 par jour) ;
5. l'identifiant SMTP (réglage de compte, interdit à un agent), puis réactiver les deux nœuds ;
6. le registre (« Lectures de n8n sur le serveur Oracle ») et la durée des exécutions en erreur avant toute publication ;
7. le trou sans rattrapage en cas de panne : l'accepter, ou une fonction `leads_marquer_accuse` écrite par n8n ;
8. un passage d'ombre de quelques jours (envois désactivés, comparaison chaque matin avec ce que la route a envoyé) ;
9. **pas 4** : publier l'envoi, constater un passage, puis lever `accuseParN8n` dans la minute (au pire deux « Bien reçu » ; l'inverse perdrait des
   accusés) ; retour : baisser le drapeau et dépublier ensemble ;
10. **pas 5** : `accuseParN8n` seul gouverne ce chemin (`lib/flags.ts` fait foi).

**Le délai que n8n ajoute à l'accusé, mesuré** : l'attente due au calendrier est de **31 à 90 s, 60,5 s en moyenne** (chaque seconde de sept minutes,
gigue de 0 à 8 s sur le départ ; théorique 30 à 90 s) ; l'exécution dans n8n, lectures épinglées, dure **61 ms** (13 ms le nœud de règle, 37 ms la
fenêtre sur l'horloge réelle). **Non mesuré, dit** : les quatre lectures réelles de Supabase et l'envoi SMTP (ni réseau ni identifiant ici) —
à mesurer au passage d'ombre et au premier envoi. Le texte de l'accusé ne promet aucun délai ; la promesse « moins d'une minute » vise la réponse de
l'assistant (`plans/promesses.md:8`) et ne doit pas lui être appliquée.

## Fichiers

- `scripts/accuse-reception-n8n-qa.mjs` (neuf) — le juge ; hors `SUITES` de `scripts/tout-verifier.mjs` (interdit à cette tâche) : à y ajouter par
  la session principale (il joue la vraie route avec des doublures, aucune base, aucun réseau, quelques secondes).
- `plans/011-cadrage-01-11/briefs/c4-n8n-accuse-reception.md` et `.workflow.json` (neufs).
- `.orchestre/preuves/032-040/` : `presti-accuse-reception.workflow.json`, `essai-pin.json`, `essai-n8n.json`, `accuse-reception-n8n-qa.txt`,
  `resume.md`, `exporter.mjs` (écrit l'export), `noeuds/` (sources des deux nœuds Code : `fenetre.js`, `courriers.js`).
- n8n d'Oracle : `presti-accuse-reception` (`VnU1onu9T4Z2asTu`), inactif. Aucun autre workflow touché, aucun identifiant, aucune base lue ou écrite, aucun envoi.
