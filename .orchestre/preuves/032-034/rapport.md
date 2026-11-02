## Ressources utilisées

- **MCP `cerveau` — `regles_pour`** (« audit offensif route publique /api/contact, écran fondateur /controle, RGPD des demandes de démo, migration RLS ») : rappel que toute migration attend le « go » écrit de Benj et passe par la session principale (`memoire/migrations-je-les-applique.md`, `regles-presti/migration-production.md`). Effet : 0190 auditée **à la lecture seulement**, sans essai à sec en base ; le crochet `garde-agents-orca.mjs` l'a d'ailleurs confirmé en refusant une commande qui mentionnait `psql`.
- **Skill `ecc:security-review`** (le skill `security-review` intégré n'a pas pu se charger : il appelle `git diff origin/HEAD...`, une référence absente de cette copie) : sa liste de contrôle (validation en liste blanche, requêtes paramétrées, RLS, erreurs sans fuite, journaux sans donnée personnelle, CSRF, plafond de débit) a fixé les familles d'attaque des sections 1 à 5.
- **Agent `presti-audit-attaque`** (`.claude/agents/presti-audit-attaque.md`, lu comme méthode) : sa règle « chaque tentative : payload exact, résultat observé, verdict BLOQUÉ/FAILLE, sévérité, fichier:ligne » donne la forme de la section « Attaques ». Les comptes de test qu'il prévoit sont remplacés par des doublures, puisque la tâche interdit toute requête vers la production.
- **MCP `n8n-oracle`** (lecture seule : `get_workflow_details`, `search_workflow_executions`) : le workflow réel `4R2wS9374GUxb63F` a été comparé à l'export du lot. Résultat : `active:false`, `activeVersionId:null`, six nœuds identiques à l'export, une seule exécution (la 346, manuelle, sur données épinglées, Slack épinglé). Rien n'a été écrit dans n8n.
- **Le diff du PC** `.orchestre/preuves/032-034/diff-032-026.patch` : la route d'avant y est **reconstruite** (lignes de contexte + lignes « - ») et sert d'oracle indépendant de la copie de la suite QA.
- **Sources du lot** : `.orchestre/preuves/032-026/resume.md` (sa section « Avant l'activation » pour ne pas redire ce qu'elle dit déjà), `plans/011-cadrage-01-11/chantier-4-assistant-plan.md:183-186` (sous RLS, clé de service seule, sans IP, jamais dans la file des prospects), `lib/flags.ts:323`, `lib/security.ts:16-19`, `lib/direction/garde.ts`, `lib/controle/droits.ts:67`, `lib/email.ts:141-158`, `app/confidentialite/page.tsx:36-37`.
- **Suites rejouées** : `scripts/demandes-demo-qa.mjs` et `scripts/migrations-jumelles-e2e.mjs`, plus un banc écrit pour cet audit, `.orchestre/preuves/032-034/attaques.mjs`.

## Périmètre et méthode

Fichiers audités sur la copie d'Oracle (empreintes SHA-256, 16 premiers caractères) : `lib/demandesDemo.ts` `ee194cd47643aa52`, `app/api/contact/route.ts` `59c92fca755e3143`,
`app/api/controle/demandes-demo/route.ts` `b904618377675ecf`, `app/controle/DemandesDemo.tsx` `b11afcae5f9bed0f`, `supabase/migrations/0190_demandes_demo.sql` `a1f6c735899607ef`,
export n8n `6f08659c35edc055`. L'audit se fait hors ligne : pas de production, pas de base, pas de build, pas de commit. Les routes sont branchées sur `traiterContact`, `listeDemandesDemo` et
`marquerDemandeTraitee` (`app/api/contact/route.ts:28-37`, `app/api/controle/demandes-demo/route.ts:15-25`), et ces fonctions de `lib/demandesDemo.ts` n'importent que des types (`:14-16`). Elles sont donc attaquées directement avec des doublures, et la garde réelle `peutFaire` (`lib/controle/droits.ts`) sert de matrice des droits.

## Attaques

Commande du banc : `node --experimental-strip-types --import ./scripts/ts-loader.mjs .orchestre/preuves/032-034/attaques.mjs` → **40 essais, 39 tiennent, 1 en défaut (3.11, mineur)**. La sortie complète est dans `attaques.log`.

| # | Essai (payload) | Résultat observé | Verdict |
|---|---|---|---|
| 1.1 | **Drapeau baissé** contre la route d'avant reconstruite du diff : 21 corps hostiles (null, chaîne, nombre, tableaux, corps de **5 Mo**, `__proto__`, CRLF dans `nom` et `message`, `<script>`, `'); drop table`, adresse `?cc=`, demi-caractères seuls, champs `id/etat/traitee_par/fiche_diagnostic/ip`, motif valide et hors liste, champ piège rempli ou blanc) × 6 situations (normale, IP bannie, plafond atteint, e-mail en échec, e-mail qui jette, IP `unknown`) × corps lisible ou non-JSON | 252 comparaisons : réponse, suite d'appels (ban, piège, plafond, e-mail : sujet, corps, Reply-To) et lignes de journal **identiques** | BLOQUÉ/TIENT |
| 1.2 | Drapeau baissé, demande de démo valide | 0 écriture en base | BLOQUÉ/TIENT |
| 1.3 | **Drapeau levé**, message de contact sans motif × 6 situations | identique à la route d'avant, 0 écriture : le canal de contact ordinaire n'est pas touché | BLOQUÉ/TIENT |
| 2.0-2.4 | Drapeau levé, **écriture en panne** : `enregistrer` rend `false`, jette, rejette, rend `"true"` (chaîne), rend `undefined` | 200 `{ok:true}`, **e-mail parti** les 5 fois ; journal = « demande de démo non rangée en base : l'e-mail part quand même », sans aucune coordonnée | BLOQUÉ/TIENT |
| 2.5 | E-mail en panne, demande rangée | 200 (la demande se lit dans le Poste) | BLOQUÉ/TIENT |
| 2.6 | E-mail **et** écriture en panne | 502 « Réessayez dans un moment » : le demandeur est prévenu, rien ne se perd en silence | BLOQUÉ/TIENT |
| 2.7 | Vraie `enregistrerDemandeDemo` face à une base muette (insert qui ne répond jamais) | rend `false` au bout de **8004 ms** (`lib/demandesDemo.ts:185`), puis l'e-mail peut partir | BLOQUÉ/TIENT (voir défaut D2) |
| 2.8-2.9 | Client qui jette à `from()` ; erreur PostgREST « violates check constraint » | `false`, jamais une exception | BLOQUÉ/TIENT |
| 3.1 | 15 valeurs **hors liste** : `Entreprise`, `entreprise␠`, `entreprise\u0000`, `['entreprise']`, `{toString}`, `2 a 5`, `plus de 20␠`, `1` (nombre), `['1']`, `architecte`, `Architecte​`, `Autre'); drop table demandes_demo; --`, `undefined`, `null`, `''` | **0** ligne rangée | BLOQUÉ/TIENT |
| 3.2 | Mêmes valeurs : demande perdue ? réponse qui révèle le refus ? | 0 perdue (l'e-mail part) ; une seule réponse possible, `200 {ok:true}`, la même que pour une demande acceptée : **aucun oracle** pour l'attaquant | BLOQUÉ/TIENT |
| 3.3 | Mêmes valeurs : fuite au journal | 0 : seul le code (`motif`, `taille` ou `activite`) est journalisé (`lib/demandesDemo.ts:119`) | BLOQUÉ/TIENT |
| 3.4 | Champs inattendus `id, etat:'traitee', traitee_le, traitee_par, cree_le, maj_le, rendez_vous_le, fiche_diagnostic, ip` | la ligne écrite ne porte que `activite,email,message,motif,prenom,taille` (`:87-89`) : pas d'écrasement de l'état, de l'auteur ni de la date | BLOQUÉ/TIENT |
| 3.5 | Pollution de prototype (`{"__proto__":{"motif":"entreprise",…}}`) | rien de rangé | BLOQUÉ/TIENT |
| 3.6 | Injection SQL et HTML dans le prénom et le message | rangés tels quels (PostgREST paramètre), jamais interprétés | BLOQUÉ/TIENT |
| 3.7 | Écran Démos : `dangerouslySetInnerHTML` ou `innerHTML` ? | aucun ; tout passe par du texte React (`app/controle/DemandesDemo.tsx:93-103`) | BLOQUÉ/TIENT |
| 3.8 | `mailto:` piégé : `a@b.co?cc=…`, `&body=`, `javascript:alert(1)@x.fr`, `%0Abcc:`, `#`, guillemets, `/` | aucun ne devient un lien (`EMAIL_LIEN`, `lib/demandesDemo.ts:158` ; `DemandesDemo.tsx:100`) | BLOQUÉ/TIENT |
| 3.9-3.10 | **Corps géant** drapeau levé (prénom 1 Mo, message 5 Mo, adresse de 500 caractères) | adresse coupée à 200 caractères puis refusée : 400 comme avant ; sinon ligne bornée 120 / 4000, dans les CHECK de 0190 | BLOQUÉ/TIENT |
| 3.11 | Message fait de **12 demi-caractères seuls** (`\uDE00`) | `propre()` les retire et le message rangé vaut `""` : il viole `message between 1 and 4000` (0190:33), l'insertion échoue, l'e-mail part quand même | **FAILLE MINEURE** (D1) |
| 4.1 | **Doublon rejoué** 6 fois depuis la même IP | `[200,200,200,429,429,429]` : 3 lignes et 3 e-mails au plus, puis 429 sans écriture. Aucun dédoublonnage : jusqu'à 3 lignes identiques | BLOQUÉ/TIENT (D4) |
| 4.2 | IP bannie ; champ piège `societe` rempli | aucune écriture | BLOQUÉ/TIENT |
| 4.3 | Ordre des effets | `ip → banni → limite → enregistrer → notifier` : le plafond passe **avant** toute écriture | BLOQUÉ/TIENT |
| 4.4 | **En-tête forgé** `X-Forwarded-For: 198.51.100.1, 203.0.113.9` puis `198.51.100.2` | `getIp` prend la première valeur (`lib/security.ts:17`) : chaque fausse adresse ouvre un plafond neuf, sauf si l'hébergeur réécrit l'en-tête. Le défaut est **hérité** (code inchangé) ; drapeau levé, il permet aussi d'écrire des lignes | hérité (D3) |
| 5.x | `GET` et `POST /api/controle/demandes-demo` **sans session** (401), avec un **compte artisan** `is_founder` faux (403), un **partenaire** (`messagerie: 'siennes'`, donc borné : 403, `lib/demandesDemo.ts:229`) | statut transmis, **0 accès à la base, 0 ligne au journal** | BLOQUÉ/TIENT |
| 5.drapeau | Drapeau baissé, appel par un vrai fondateur | 404, rien n'est lu, la garde n'est même pas appelée (`:224`) | BLOQUÉ/TIENT |
| 5.lecture | Fondateur au rôle `lecture` qui marque « traitée » | 403 `lecture_seule` (`estDirection`), rien d'écrit | BLOQUÉ/TIENT |
| 5.lecture-fondateur | Fondateur ; la base rend aussi `traitee_par`, `fiche_diagnostic` et une ligne de taille `beaucoup` | 200 ; ni `traitee_par` ni `fiche_diagnostic` rendus ; la ligne hors liste est écartée (`ligneLue`, `:193-203`) | BLOQUÉ/TIENT |
| 5.injection-id | Geste « traitée » avec `1`, `…' or '1'='1`, `…,etat.eq.traitee` (injection de filtre PostgREST), `*`, tableau, objet, `null` | 7/7 → 400, rien lu, rien journalisé (`estUuid`, `:258`) | BLOQUÉ/TIENT |
| 5.geste | Geste « traitée » : 1er appel, rejeu, puis **l'id d'un autre** (inconnu) | 200, puis 200 `deja:true`, puis 404 ; `traitee_par` = uid du fondateur ; mise à jour conditionnelle `etat = nouvelle` (`:264`). Il n'y a pas d'« autre propriétaire » : la table est à Presti, un seul fondateur, le partenaire est refusé | BLOQUÉ/TIENT (D5) |
| 5.journal | Journal de direction indisponible | 503, rien d'écrit | BLOQUÉ/TIENT |
| CSRF | `/api/controle/demandes-demo` s'authentifie par `Authorization: Bearer` (`lib/authArtisan.ts:106`, `app/controle/client.ts:24`), sans cookie | un site tiers ne peut pas forger l'appel | BLOQUÉ/TIENT |
| Onglet | `?onglet=demos` tapé à la main, drapeau baissé | refusé par `ONGLETS.includes` (`app/controle/page.tsx:88`), qui ne contient `demos` que drapeau levé (`:49`) ; retombe sur « Aujourd'hui ». De toute façon, les données ne viennent que de la route gardée | BLOQUÉ/TIENT |
| Fuite vers le navigateur | `DemandesDemo.tsx` (client) importe `lib/demandesDemo.ts` | le module n'a que des imports de type, aucun `process.env` : rien de serveur n'entre dans le paquet | BLOQUÉ/TIENT |
| Chargement | La route importe désormais `supabaseAdmin` au chargement | il était déjà chargé, par `lib/security.ts:2`, et ce client ne jette pas sans variable (`lib/supabaseAdmin.ts:3-4`) : rien de neuf ne casse au démarrage | BLOQUÉ/TIENT |

### La migration 0190, lue

| Point | Constat | Verdict |
|---|---|---|
| RLS | `enable row level security` (0190:65) ; **aucune politique permissive** pour `anon` ni `authenticated` : un jeton de navigateur ne lit ni n'écrit rien | TIENT |
| `anon` / `authenticated` | `revoke all … from public, anon, authenticated` (0190:66), posé **après** `create table` dans la même transaction : il annule aussi les droits par défaut que Supabase accorde à chaque table neuve | TIENT |
| Gardes 0138 | `garde_session` (restrictive, pour tout) et `garde_suspension_ins/maj/sup` (0190:70-81) ; les deux fonctions existent dans `0138_garde_session_rls.sql` | TIENT |
| Écriture | par la clé de service seulement : `/api/contact` (`enregistrerDemandeDemo`) et le Poste | TIENT |
| Fonction de déclencheur | `demandes_demo_maj` : pas en `security definer`, `search_path` fixé, `execute` retiré à `public/anon/authenticated` (0190:53-67) | TIENT |
| Listes et bornes | `CHECK` égaux aux listes du code (0190:28-34 ↔ `lib/demandesDemo.ts:18-21`) ; `etat='traitee' ⇔ traitee_le non nul` (0190:41) ; sans IP | TIENT |
| n8n strict | bloc `$lecture$` : `n8n_lecture` ne reçoit que des identifiants, des énumérations et des dates (0190:87) ; sauté si 0189 n'est pas appliquée (à rejouer après, déjà noté au résumé du lot, « Avant l'activation » pas 5) | TIENT |
| Retour arrière | une instruction (0190:24) ; jumeau `_A_COLLER_sql_editor_0190_NU.sql` ⊂ 0190 (suite des jumelles) | TIENT |

### Le workflow `presti-demande-demo`, lu par le MCP

Il est inactif (`active:false`, `activeVersionId:null`, `triggerCount:0`), et le workflow réel est identique à l'export. Ses nœuds : un déclencheur, deux nœuds de code, deux lectures `GET`, un message Slack. **Aucun nœud ne
peut écrire au demandeur** : pas d'e-mail, pas de Brevo, pas de Telegram, pas de HTTP en écriture. Le seul envoi est un message Slack dans `#presti-auto`, sans prénom, adresse ni message. Les colonnes lues sont `select=id,taille,activite,etat,cree_le`, et le code
`Avis à Benj` ne garde que ces champs, même si la lecture en rendait d'autres. `saveDataSuccessExecution: none` : rien n'est gardé des passages réussis. Les lectures ont `executeOnce` et `alwaysOutputData`, donc
la relance J+2 tourne aussi quand aucune demande neuve n'arrive.

### Suites rejouées

- `node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/demandes-demo-qa.mjs` → **code 0**, A à I verts, dont « 1620 comparaisons à la route d'avant » et « mutants : 53/53 rouges » (`demandes-demo-qa.log`, 1 min 27 s).
- `node scripts/migrations-jumelles-e2e.mjs` → **code 0**, « 580 réussis, 0 échoués », dont `_A_COLLER_sql_editor_0190_NU.sql ⊂ 0190_demandes_demo.sql` (`migrations-jumelles.log`).

## Défauts

Aucun défaut critique, aucun défaut majeur.

| # | Gravité | Où | Défaut | Correction proposée |
|---|---|---|---|---|
| D1 | MINEUR | `lib/demandesDemo.ts:88` (`ligneDemande`) ↔ `0190:33` | Un message fait uniquement de demi-caractères passe `message.length ≥ 10`, puis `propre()` le vide en `""`, ce qui viole le CHECK : la ligne n'est pas rangée. **Rien n'est perdu**, l'e-mail part (essai 3.11). Seul un robot écrit cela. | Dans `ligneDemande`, `message: texte \|\| null` (même chose pour `prenom` : s'il devient vide, ne pas ranger la ligne). |
| D2 | MINEUR | `lib/demandesDemo.ts:132-143`, `app/api/contact/route.ts:26` | La base passe **avant** l'e-mail. Une base qui ne répond plus consomme jusqu'à 8 s des 20 s de `maxDuration` avant le premier essai d'envoi, et l'appel à Resend n'a pas de délai (`lib/email.ts:110`). Si `isBanned` et le plafond sont déjà lents, la fonction peut être coupée avant l'e-mail. | Lancer l'écriture et l'e-mail ensemble (`Promise.allSettled`), puis décider 200 ou 502 sur les deux résultats ; ou ramener `DELAI_MS` à 3 s pour l'écriture de `/api/contact`. |
| D3 | MINEUR, hérité | `lib/security.ts:17` | `getIp` fait confiance à la première valeur de `X-Forwarded-For`. Si l'hébergeur ne réécrit pas l'en-tête, des adresses forgées contournent le plafond de 3 par heure ; drapeau levé, elles écrivent aussi des lignes, et assez de spam pousse les vraies demandes hors des 200 lignes que lit le Poste (`LIMITE_LISTE`, `:163`). Ce code n'a pas changé dans ce lot. | Vérifier en direct (session principale) que Vercel écrase l'en-tête ; sinon lire `x-real-ip` ou `x-vercel-forwarded-for`. Plafond global de lignes par heure sur `demandes_demo`. |
| D4 | MINEUR | `lib/demandesDemo.ts:183-190`, 0190 | Pas de dédoublonnage : un rejeu donne jusqu'à 3 lignes identiques par IP et par heure (essai 4.1), et autant d'avis Slack. | Index unique `(email, date_trunc('hour', cree_le))`, ou ignorer `23505` comme un succès. |
| D5 | MINEUR | `lib/demandesDemo.ts:259-260` | Le geste « traitée » est journalisé **avant** la mise à jour, avec `avant: nouvelle → après: traitée`, même pour un rejeu (`deja:true`) ou un identifiant inconnu (404). Le journal de direction dit alors un changement qui n'a pas eu lieu (essai 5.geste : 3 entrées pour 1 changement). Seul le fondateur peut le provoquer. | Ajouter au journal l'issue réelle (`apres: { etat, deja }`) en seconde entrée, ou n'écrire `avant` qu'après la lecture. |
| D6 | MINEUR, conformité | `app/confidentialite/page.tsx:36-37` | La politique de confidentialité ne dit ni que les demandes de démo sont rangées, ni pour combien de temps. Le pas 2 d'« Avant l'activation » (`.orchestre/preuves/032-026/resume.md`) prévoit déjà la durée et la purge ; il manque la **mention dans la politique**. | Avant de lever le drapeau : une ligne « Demandes de démo » dans les §2 et §5 de la politique, et le registre des traitements. |
| D7 | INFO | n8n `presti-demande-demo` | (a) Un passage manqué (n8n arrêté, Slack en erreur) ne se rattrape pas : la fenêtre de 15 minutes est perdue, mais la demande reste dans le Poste et l'e-mail est parti. (b) La lecture passe par la clé de service, et la seule barrière devant les coordonnées est `select=` ; c'est déjà noté au résumé du lot (pas 5). (c) Aujourd'hui, aucun formulaire n'envoie `motif`, `taille` ni `activite` (`app/contact/Formulaire.tsx`, et aucune occurrence de `'2 à 5'` hors de `lib/`) : drapeau levé, rien ne sera rangé avant que le formulaire du chantier 2 arrive. | (a) Accepté tel quel, ou fenêtre glissante avec une marge ; (b) identifiant `n8n_lecture` ; (c) à savoir pour l'essai du pas 4. |

## Points à valider (session principale ou Benj)

1. Vérifier en direct que Vercel réécrit `X-Forwarded-For` (D3). Cela demande une requête vers la production, interdite ici.
2. Ajouter D6 aux préalables du lever du drapeau, à côté du pas 2 du résumé du lot.
3. Corriger D1 et D2, peu coûteux, avant de lever le drapeau (pas avant la mise en production drapeau baissé : il n'y a rien à y corriger).
4. Le protocole de l'agent d'audit demande une entrée dans `.claude/agents/knowledge/audit.journal.md`. Ce fichier est hors du périmètre de la tâche : c'est à la session principale de l'ajouter.

## Conclusion

Drapeau baissé, `/api/contact` est identique à la route d'avant. Deux oracles le prouvent : celui de la suite QA (1620 comparaisons) et celui de cet audit, reconstruit du diff (252 cas hostiles). Drapeau levé, une demande n'est jamais perdue : l'e-mail part quelle que soit la panne d'écriture, et un échec double rend 502. Les valeurs hors liste ne sont jamais rangées, et ni la réponse ni le journal ne révèlent le refus. La route du Poste est fermée sans session, à un artisan, au partenaire et au rôle lecture, et fermée à tous drapeau baissé. La migration 0190 ferme `anon` et `authenticated` et tient ses gardes. Le workflow est inactif et n'écrit jamais au demandeur. Il reste sept défauts, mineurs ou d'information, aucun critique ni majeur.

VERDICT : TIENT
