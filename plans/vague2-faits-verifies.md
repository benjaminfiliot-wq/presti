# Vague 2 — les faits vérifiés dans le code

> Produit le 2026-09-10 par dix agents qui ont OUVERT le code, un par sujet.
>
> **Pourquoi ce fichier existe.** Dans la vague 1, j’ai écrit les cartons moi-même à partir de
> `lib/plans.ts`, et sept publications sur dix ont fini par affirmer quelque chose que le code
> contredit — dont « L’acompte est déduit » alors que `lib/DevisPDF.tsx:184` réserve cette ligne
> au devis. Une capacité déclarée dans `plans.ts` ne prouve pas que l’écran existe.
>
> **La règle pour la vague 2 : aucun carton qui ne se rattache pas à un fait de ce fichier.**

## 11 — La confidentialité des conversations

**Existe :** oui · **Drapeau :** supportArtisan = true (lib/flags.ts:48). Levé le 08/09 après migrations 0074+0075 collées en base et support-e2e 34/34 contre un vrai serveur (plans/journal-final.md:833-861).

**Formule :** Toutes, y compris l'essai gratuit. Aucune Capacite « support » n'existe dans lib/plans.ts pour ce mécanisme (la seule ligne « support.prioritaire » de plans.ts:139 est autre chose : la priorité de traitement, Signature). Les deux routes artisan ne font AUCUN contrôle de formule : app/api/securite/acces-support/route.ts:26-28 ne teste que le drapeau et authArtisan. La carte est affichée à tout artisan (app/parametres/SectionSecurite.tsx:184).

### Les faits, avec leur source

| Fait | Où c’est vrai |
|---|---|
| La fenêtre dure une heure exactement, à partir du clic de l'artisan et pas de la demande. | supabase/migrations/0074_support.sql:299 — `v_expire := now() + interval '1 hour'` dans ouvrir_acces_support ; le commentaire de colonne (ligne 130) dit « 60 minutes à partir du clic de l'artisan ». |
| Le fondateur ne peut pas ouvrir la porte : la fonction reçoit l'identifiant depuis la session de l'artisan et refuse une fenêtre qui n'est pas la sienne. | supabase/migrations/0074_support.sql:290 — `if not found or v.artisan_id <> p_artisan then return 'inconnu'` ; app/api/securite/acces-support/route.ts:104 passe `p_artisan: s.uid` issu de authArtisan, jamais du corps de la requête. Il n'exi |
| Sans email parti, aucune porte ne s'ouvre : la fonction d'ouverture refuse tant que notifie_le est vide. | supabase/migrations/0074_support.sql:295 — `if v.notifie_le is null then return 'non_notifie'`. app/api/controle/support/demander/route.ts:107-120 : si sendEmail échoue, la demande est immédiatement refusée et la route rend 503. |
| D'un devis, la porte rend le nombre de lignes, les quantités et les totaux — jamais la désignation des travaux. | supabase/migrations/0074_support.sql:448-451 : le tableau 'lignes' contient ordre, quantite, unite, prix_unitaire_ht, tva_taux. La colonne `designation` de la table (supabase/migrations/0002_devis.sql:63) n'est pas sélectionnée. Même chose  |
| D'un message client, seule la longueur en caractères sort ; le texte ne sort jamais. | supabase/migrations/0074_support.sql:404 — `'longueur', length(coalesce(m.contenu, ''))`. Le champ `contenu` n'est jamais rendu tel quel. La suite le vérifie : scripts/support-e2e.mjs:203 teste que la longueur sort, et le journal (plans/jou |
| La fonction qui rend la donnée est celle qui écrit la trace : deux lignes, dans la même transaction. | supabase/migrations/0074_support.sql:476-482 — lire_sous_support insère dans journal_direction (avec l'IP) ET dans acces_support_lectures (sans l'IP, lisible par l'artisan) avant de retourner les données. Une route qui « oublierait » de jou |
| Une trace de consultation ne se modifie pas et ne se supprime pas seule pendant 24 mois. | supabase/migrations/0074_support.sql:167-185 — trigger acces_support_lectures_immuable : `raise exception 'une trace de lecture ne se modifie pas'` sur UPDATE, et refus du DELETE tant que lu_le > now() - interval '24 months'. Corrigé par 00 |
| Un artisan peut poser un verrou définitif : la demande est refusée avant même d'atteindre son écran. | supabase/migrations/0074_support.sql:92-102 (table support_verrou) et :203-206 — demander_acces_support renvoie 'verrouille' si une ligne existe. Poser le verrou ferme aussi les fenêtres en cours (regler_verrou_support, lignes 512-520). Bou |
| Trois demandes au maximum par ticket, et un refus vaut réponse pendant 24 heures. | supabase/migrations/0074_support.sql:216 — `if v_n >= 3 then return 'plafond'` ; ligne 218-222 — une redemande sur le même élément refusé depuis moins de `interval '24 hours'` renvoie 'refuse_recemment'. |
| La porte ne peut viser que l'élément que l'artisan a lui-même désigné en demandant de l'aide. | supabase/migrations/0075_support_element.sql:43-47 — `if v_t.element_id is null then return 'ticket_sans_element'` puis `if v_t.element_id <> p_element or v_t.element_type <> p_type then return 'element_non_designe'`. Un ticket sans élément |
| La route de lecture n'a qu'un GET : il n'existe aucun verbe d'écriture à contourner. | app/api/controle/support/lire/route.ts — un seul `export async function GET`. Pas de POST, PATCH ni DELETE dans le fichier ; le commentaire d'en-tête le dit : « Pas « ils refusent » : ils n'existent pas ». |
| La baie vitrée d'à côté a été fermée en même temps : le fondateur ne voit plus les devis et factures des artisans sous RLS. | supabase/migrations/0074_support.sql:50-54 — `drop policy founders_all_devis / devis_lignes / leads / factures / factures_lignes`. Mesure avant/après au journal (plans/journal-final.md, 08/09) : sonde-rls-fondateur passe de 9 devis, 12 fact |
| L'artisan emporte les traces quand il exporte ses données. | app/api/donnees/export/route.ts:65-66 — l'export contient `acces_du_support` et `acces_du_support_consultations`. Ajouté le 08/09 précisément parce que la promesse était affichée sans que rien ne collecte ces lignes (plans/journal-final.md, |

### ⛔ Ce qu’il ne faut PAS dire

- Ne pas dire « personne ne PEUT lire vos données ». Le code lui-même refuse cette formulation : supabase/migrations/0074_support.sql:88-90 écrit « On ne promet pas « impossible » — le service_role peut tout, c'est vrai de toute la base ». La promesse tenable est : aucune route du Poste de contrôle ne le fait, et chaque passage par la porte laisse une trace que l'artisan lit.
- Ne pas dire « aucune coordonnée du client ne sort ». Le domaine de l'email PASSE : supabase/migrations/0074_support.sql:399-400 rend `•••@orange.fr` (la partie locale disparaît, le domaine reste, volontairement, pour diagnostiquer une non-remise). Dire « le nom et l'adresse de votre client ne sortent pas » est exact ; « aucune coordonnée » ne l'est pas.
- Ne pas dire « une heure à partir de la demande ». C'est une heure à partir du CLIC de l'artisan (0074_support.sql:299, dans ouvrir_acces_support, pas dans demander_acces_support). La nuance est le cœur du dispositif : la fenêtre ne se consume pas pendant qu'il est sur un chantier.
- Ne pas dire « réservé aux formules payantes » ni « inclus à partir de 59 € ». Il n'y a AUCUN contrôle de formule sur ces routes : c'est vrai dès l'essai gratuit. À l'inverse, ne pas confondre avec la ligne « Support prioritaire » de lib/plans.ts:139, qui est Signature seulement et désigne la priorité de traitement, pas la confidentialité.
- Ne pas dire « aucun montant ne sort ». Les totaux HT / TVA / TTC, les quantités et les prix unitaires SORTENT (0074_support.sql:444-451). Ce qui ne sort pas, c'est la désignation des travaux, le nom du client et le texte des échanges. La formule juste est celle de la landing (app/page.tsx:133) : « sept lignes et un total », pas leur contenu.
- Ne pas parler d'un « relevé envoyé après coup ». La colonne `releve_envoye_le` existe (0074_support.sql:123) mais AUCUN code ne l'écrit ni ne la lit — vérifié par grep sur tout le dépôt. C'est une place réservée, pas une fonctionnalité.
- Ne pas dire « les photos de chantier sont consultables sous support ». La vue 'photos' rend la métrologie seulement : nombre, poids, nom de fichier, type MIME, date de dépôt (0074_support.sql:410-420). Aucune URL signée n'est générée.

### ? Non vérifié

- Je n'ai pas pu vérifier que la migration 0076_support_purge.sql est appliquée en production. plans/inventaire-produit.md:155-157 marque 0074, 0075 et 0076 « non sondée », et plans/journal-final.md ne mentionne 0076 nulle part (0074 et 0075, si : collées le 08/09). Sans conséquence pour les affirmations de la vidéo — 0076 ne corrige que le blocage de suppression de compte — mais je ne peux pas affirmer qu'elle est en base.
- Je n'ai pas exécuté scripts/support-e2e.mjs moi-même : le 34/34 vient du journal (plans/journal-final.md, 08/09). Le fichier compte 38 appels T() au total, dont certains conditionnels — l'écart entre 34 et 38 s'explique probablement par des branches non prises, mais je ne l'ai pas prouvé.
- Je n'ai pas vérifié en base réelle que les policies founders_all_* sont bien absentes aujourd'hui ; je m'appuie sur le drop de la migration et sur la mesure sonde-rls-fondateur rapportée au journal du 08/09.

### Le champ `fonde` prêt à coller

```
-- lib/flags.ts:48 → supportArtisan: true
-- supabase/migrations/0074_support.sql:104-131 → table acces_support : ouvert_le et expire_le naissent NULL
-- supabase/migrations/0074_support.sql:299 → v_expire := now() + interval '1 hour'
-- supabase/migrations/0074_support.sql:290 → ouvrir_acces_support refuse si v.artisan_id <> p_artisan
-- app/api/securite/acces-support/route.ts:103-106 → p_artisan: s.uid (la session de l'artisan, jamais le corps)
-- supabase/migrations/0074_support.sql:295 → if v.notifie_le is null then return 'non_notifie'
-- supabase/migrations/0074_support.sql:448-451 et 466-469 → 'lignes' rend ordre/quantite/unite/prix_unitaire_ht/tva_taux ; la colonne designation (0002_devis.sql:63) n'y est pas
-- supabase/migrations/0074_support.sql:404 → 'longueur', length(coalesce(m.contenu,'')) — la longueur, pas le texte
-- supabase/migrations/0074_support.sql:476-482 → lire_sous_support écrit journal_direction ET acces_support_lectures dans la même transaction que la donnée rendue
-- supabase/migrations/0074_support.sql:92-102 → table support_verrou + demander_acces_support:204 refuse avant l'écran de l'artisan
-- supabase/migrations/0074_support.sql:50-54 → les policies
```

## 12 — Les garde-fous de l’IA avant l’envoi

**Existe :** oui · **Drapeau :** aucun drapeau — le filtre n'est derrière aucune entrée de lib/flags.ts. Il tourne inconditionnellement dès que le profil de l'artisan contient au moins un élément (lib/ai.ts:52-54 `aProfilDeclare` : services OU horaires OU zone OU bio). Vérifié : `grep -n "flags|actif(" lib/ai.ts lib/ai/antiFabrication.ts lib/ai/outils.ts` ne renvoie que des variables locales sans rapport (lib/ai.ts:809-812).

**Formule :** BASE — donc dès l'essai gratuit, puis 29 €, 59 € et 99 €. La capacité qui porte la réponse au client est `plateforme.conversation`, listée dans `BASE` (lib/plans.ts:36-41), et `BASE` est le jeu de capacités des plans `gratuit` (essai, 3 crédits), `essentiel` (29 €), `studio` (59 €) et `signature` (99 €) — lib/plans.ts:57-63. Le filtre anti-fabrication n'est lui-même rattaché à aucune capacité : il s'exécute quelle que soit la formule.

### Les faits, avec leur source

| Fait | Où c’est vrai |
|---|---|
| C'est du code exécuté, pas une consigne : sept expressions régulières dans un tableau, testées phrase par phrase sur le texte généré avant qu'il parte. | lib/ai/antiFabrication.ts:69-128, `export const MOTIFS_CAPACITE: Motif[]` — 7 entrées, chacune avec un champ `re: RegExp` et un champ `declare` ; appliquées en boucle par `detecterCapacitesNonDeclarees` lignes 146-162. |
| Six familles exactement : déplacement, atelier, délai, permanence, garantie/certification, prestation. (Sept motifs, car « déplacement » en a deux : le déplacement gratuit et le déplacement tout court.) | lib/ai/antiFabrication.ts — cle 'deplacement' :71 et :77, 'atelier' :83, 'delai' :89, 'permanence' :95, 'garantie' :105, 'prestation' :111. Comptage exécuté : 7 motifs, 6 clés distinctes. |
| La liste des prestations qu'un artisan ne peut pas s'attribuer compte soixante-six mots, de « ramonage » à « taille de haies ». | lib/ai/antiFabrication.ts:47-59, `const PRESTATIONS = [...]` — comptage exécuté sur le fichier : 66 chaînes. |
| Une réponse fautive est réécrite UNE fois, avec la faute citée mot pour mot dans la consigne ; si elle revient, la phrase est supprimée. | lib/ai/antiFabrication.ts:185-209 `assainirReponse` — `regenere = true` ligne 195, une seule passe (pas de boucle) ; `retirerPhrases` ligne 206. Le rappel cite l'extrait entre guillemets, ligne 212-217. |
| Un montant en euros dans un message emporte sa phrase entière : le prix vit dans le devis, pas dans la réponse. | lib/ai/antiFabrication.ts:165-171 `detecterPrixChiffres` (deux expressions : « 450 € » et « € 450 ») ; suppression de la phrase porteuse ligne 205. |
| Une phrase niée passe : « je n'interviens pas le week-end » n'est pas comptée comme une promesse de permanence. | lib/ai/antiFabrication.ts:133 `RE_NEGATION_AVANT`, appliquée aux 48 caractères qui précèdent le motif (ligne 155-156). Le commentaire 130-132 explique le défaut corrigé : avant, « Pas de souci, je me déplace gratuitement et j'interviens sou |
| La suite de tests du filtre passe : 158 vérifications, zéro échec, sans appeler le modèle ni la base. | scripts/ia-unit-e2e.mjs — exécuté le 2026-09-10 : « ✅ 158 réussis, 0 échoués ». Le bloc « Anti-fabrication : les huit cas de l'audit final » y est vert (lignes 131-165, 232+). |
| Le filtre est branché sur la première réponse au prospect et sur la relance : trois points d'accroche dans le code. | lib/ai.ts:450-451 (`generateLeadReply`, appelé par app/api/leads/route.ts:240) ; lib/ai.ts:638-639 (`generateConversationReply`, appelé par app/api/conversation/route.ts:205 et app/api/conversation/stream/route.ts:121 en mode assisté) ; lib |

### ⛔ Ce qu’il ne faut PAS dire

- NE PAS dire « toutes les réponses sont relues » ni « rien ne part sans passer le filtre ». Le chat en direct du client (flux SSE) n'est PAS filtré, et le code le dit lui-même : lib/ai.ts:612-614, « Pas de régénération possible ici (le texte est déjà parti) : le filtre étendu vit dans repondreAvecOutils / non-stream. » Le composant client app/p/[slug]/PlatChat.tsx:321 appelle justement /api/conversation/stream, dont la branche diffusée (route.ts:155) passe un `onDelta`. Formulation sûre : « la première réponse au prospect » et « la réponse préparée à valider » — celles-là sont filtrées (app/api/leads/route.ts:240 ; stream/route.ts:121, sans onDelta).
- NE PAS dire « le brouillon que l'artisan corrige dans sa boîte est filtré ». app/api/messages/route.ts:127 (action `suggest`) ne transmet que nom / metier / ton_style : `aProfilDeclare` (lib/ai.ts:52-54) renvoie false et le filtre est sauté (lib/ai.ts:638). Même chose pour app/api/tools/reponse/route.ts:46-49.
- NE PAS citer l'assistant à outils comme preuve. `repondreAvecOutils` (lib/ai/outils.ts:181, filtre ligne 300) n'est importé par AUCUNE route de app/ — vérifié par grep : seules occurrences hors lib, scripts/ai-eval.mjs:179 et :198. C'est un harnais d'évaluation, pas un chemin de production.
- NE PAS dire « le filtre compare vos horaires déclarés ». Le champ `horaires` existe dans le type (lib/ai.ts:44) et dans le profil du filtre (lib/ai/antiFabrication.ts:18), mais AUCUNE route ne le remplit : leads/route.ts:241 et conversation/route.ts:206 passent services, zone, bio, assurance_nom — pas horaires. En pratique la comparaison se fait sur métier + services + zone + bio + assurance.
- NE PAS dire « l'IA ne peut plus rien inventer » ni « zéro invention garantie ». C'est une liste finie de motifs français : 66 prestations, une liste de verbes (lib/ai/antiFabrication.ts:60-61), des formules de délai et de permanence. Une invention formulée autrement passe. Dire ce que le code fait : six familles nommées, réécriture puis retrait.
- NE PAS étendre « le code lui interdit » aux règles de métier. Celles-là sont des consignes dans le prompt (lib/ai/metiers.ts) — un modèle peut les oublier. Le dépôt le note déjà noir sur blanc : plans/accroches-par-metier.md:55, « les règles de métier sont des consignes dans le prompt ». Les deux seuls garde-fous réellement exécutés sont ce filtre et le blocage HTTP 422 des mentions obligatoires du devis.
- NE PAS dire « sept familles ». Il y a 7 motifs mais 6 familles : « déplacement » en occupe deux (le déplacement gratuit :71, le déplacement tout court :77). Si tu dis sept, dis « sept règles » ou « sept expressions », pas « sept familles ».

### ? Non vérifié

- Aucune trace du filtrage en base ni dans un journal. `assainirReponse` renvoie bien `{ retirees, prixRetires, regenere }` et lib/ai/outils.ts:308 le remonte dans un champ `assainissement`, mais ce champ n'est lu ou écrit nulle part ailleurs : grep « assainissement » sur app/ → aucun résultat. Donc impossible d'affirmer « vous voyez ce que le filtre a retiré » ou « c'est consigné ».
- Aucun test de bout en bout qui prouve le filtre CONTRE une vraie route en production. scripts/ia-unit-e2e.mjs teste le module pur (158/158, exécuté aujourd'hui) et scripts/ai-eval.mjs appelle le modèle, mais via `repondreAvecOutils` — qui n'est branché sur aucune route. Le journal du dépôt le confirme lui-même : .claude/agents/knowledge/audit.journal.md:167, « Aucune route IA appelée ».
- Pas de mesure de l'efficacité réelle : aucun compteur, aucun taux, rien qui dise combien de phrases ont été retirées en vrai. Ne pas avancer de chiffre du type « X % des réponses corrigées ».
- Pas trouvé d'écran où l'artisan verrait ou réglerait ce filtre (pas d'interrupteur, pas de liste éditable de prestations). La liste des 66 mots est en dur dans le fichier, la même pour tous les métiers.

### Le champ `fonde` prêt à coller

```
lib/ai/antiFabrication.ts:69-128 — `MOTIFS_CAPACITE`, 7 expressions régulières / 6 familles (déplacement :71 et :77, atelier :83, délai :89, permanence :95, garantie :105, prestation :111), chacune avec son test `declare(profil)` contre le texte du profil réel construit par `texteProfil` :36-43.
lib/ai/antiFabrication.ts:47-59 — `PRESTATIONS`, 66 mots (comptage exécuté).
lib/ai/antiFabrication.ts:185-209 — `assainirReponse` : détecter → régénérer UNE fois (`regenere = true` :195) → dégrader en retirant la phrase (:206).
lib/ai/antiFabrication.ts:165-171 — `detecterPrixChiffres` ; phrase porteuse retirée :205.
lib/ai/antiFabrication.ts:133 — `RE_NEGATION_AVANT` : une négation juste avant annule l'affirmation.
Branchement : lib/ai.ts:450-451 et lib/ai.ts:638-639, plus lib/ai/outils.ts:300. Garde d'entrée : lib/ai.ts:52-54.
Preuve : scripts/ia-unit-e2e.mjs, exécuté le 2026-09-10 → 158 réussis, 0 échoués.
Formule : capacité `plateforme.conversation` dans `BASE` (lib/plans.ts:36-41) → disponible dès l'essai gratuit et sur 29 / 59 / 99 €. Le filtre lui-même n'est conditionné à aucune formule ni aucun drapeau.
```

## 13 — Les comptes clients

**Existe :** oui · **Drapeau :** aucun drapeau — lib/flags.ts ne contient AUCUNE entrée pour les comptes clients, et la ligne de grille lib/plans.ts:125 ne porte pas de champ `flag:` (elle passe donc toujours le filtre GRILLE, lib/plans.ts:143). Le code est là et actif : lib/clientAuth.ts (102 lignes), app/api/p/auth/route.ts, migration supabase/migrations/0034_clients_plateforme.sql.

**Formule :** essai + 29 € + 59 € + 99 € (BASE). La capacité `plateforme.comptes_clients` est déclarée dans BASE, lib/plans.ts:37, donc reprise par STUDIO (l.41) et SIGNATURE (l.48). ATTENTION : `peut(plan, 'plateforme.comptes_clients')` n'est appelé NULLE PART (grep : la chaîne n'apparaît qu'aux lignes 16 et 37 de plans.ts, jamais dans une route) — la capacité n'est verrouillée par aucun code, elle marche donc pour tout le monde, y compris l'essai. Dire « dès l'essai » est vrai.

### Les faits, avec leur source

| Fait | Où c’est vrai |
|---|---|
| Le lien de connexion vaut vingt minutes. | lib/clientAuth.ts:14 — `const DUREE_LIEN_MIN = 20` ; ligne 28, `expire_le` = maintenant + DUREE_LIEN_MIN * 60000. Le refus est ligne 44. Le texte de l'email le dit au client : app/api/p/auth/route.ts:68 « Ce lien est valable 20 minutes et n |
| Un lien ne s'ouvre qu'une seule fois. | lib/clientAuth.ts:46 — dès la consommation, `utilise_le` est horodaté ; ligne 43, tout rejeu répond « Ce lien a déjà servi. » Prouvé par scripts/comptes-clients-e2e.mjs:59-60 (rejeu = 400). |
| Le client n'a aucun mot de passe. | supabase/migrations/0034_clients_plateforme.sql:8-19 — la table `clients_plateforme` n'a que id, artisan_id, email, nom, tel, adresse_chantier, dates : aucune colonne de mot de passe. La seule porte d'entrée est `action: 'verifier'` d'un li |
| La base ne garde que l'empreinte du jeton. | lib/clientAuth.ts:16 — `sha256(jeton)` ; ligne 27 le lien et ligne 69 la session sont insérés en `token_hash`. Le jeton en clair (32 octets aléatoires, ligne 17) n'existe que dans l'email envoyé. |
| La session reste ouverte trente jours. | lib/clientAuth.ts:13 — `const DUREE_SESSION_J = 30` ; ligne 70 (`expire_le` en base) et ligne 100 (durée du cookie). Cookie httpOnly + Secure + SameSite=Lax, ligne 101 : jamais lisible par du JavaScript. |
| Se déconnecter tue le jeton côté serveur. | lib/clientAuth.ts:96 — la déconnexion écrit `revoque_le` en base ; ligne 84, toute session portant `revoque_le` est refusée. Test dédié scripts/comptes-clients-e2e.mjs:64-67 : un cookie copié AVANT la déconnexion est refusé APRÈS. |
| Même email, deux artisans : deux comptes étanches. | supabase/migrations/0034_clients_plateforme.sql:18 — `unique (artisan_id, email)`, le compte est créé scopé (lib/clientAuth.ts:51). Test scripts/comptes-clients-e2e.mjs:73-77 : 1 compte chez A, 1 chez B, ids différents. |

### ⛔ Ce qu’il ne faut PAS dire

- NE PAS dire « le client retrouve ses demandes depuis n'importe quel appareil ». La liste « Mes demandes » vient du localStorage du navigateur : app/p/[slug]/PlatChat.tsx:104 (`const KEY = `conv-${slug}``) et 179-197 (chargement). Se connecter par lien magique ne recharge AUCUNE conversation depuis le serveur — sur un téléphone neuf, la barre latérale reste vide même connecté.
- NE PAS reprendre le mot « historique » de la grille (lib/plans.ts:125). La colonne `leads.client_plateforme_id` existe bien (migration 0034:48) mais elle n'est ÉCRITE nulle part dans le code : grep sur tout le dépôt ne la trouve qu'en 0034 et dans deux vues de support (0074:396). Aucune conversation n'est rattachée à un compte. C'est exactement le schéma de la faute WhatsApp : la capacité est vendue, la moitié aval n'est pas branchée.
- NE PAS dire ni montrer « le client voit ses devis et ses factures dans son espace ». Il n'y a pas d'écran d'espace client : le compte tient en une ligne de barre latérale (nom ou email + bouton « Se déconnecter »), PlatChat.tsx:403-407. Aucune facture n'est listée nulle part côté client. Le devis en cours s'affiche dans le fil (PlatChat.tsx:483-507) — mais il s'affiche SANS compte, il vient du jeton de la conversation.
- NE PAS dire « il faut un compte pour écrire à l'artisan ». app/api/conversation/route.ts:13-16 : le fil se rouvre par un jeton uuid secret, « Aucun compte requis ». Le commentaire de l'interface le confirme, PlatChat.tsx:401 : « Compte client — facultatif ». Le compte ne débloque rien.
- NE PAS dire « réservé au Studio » ou « à partir de 59 € ». C'est dans BASE (lib/plans.ts:37) donc dès l'essai gratuit — et la capacité n'est de toute façon vérifiée par aucun `peut()`.
- NE PAS écrire « lien valable 24 h » ou tout autre durée : c'est 20 minutes (lib/clientAuth.ts:14), et l'email le dit au client mot pour mot. Une seconde de vidéo qui affiche une autre durée est démentie par le premier email reçu.
- NE PAS dire « connexion sécurisée sans mot de passe » comme argument de sécurité pure : c'est vrai (aucune colonne mot de passe, 0034:8-19) mais le fait vendable ici est concret — un email, un clic, vingt minutes, et le lien meurt.

### ? Non vérifié

- Aucun code qui rattache une conversation à un compte client : `client_plateforme_id` (leads) n'est écrit par aucune route, aucune fonction, aucun script. La promesse « historique » de lib/plans.ts:125 n'a donc pas d'implémentation trouvée.
- Aucun appel à `peut(plan, 'plateforme.comptes_clients')` dans tout le dépôt : la capacité est déclarée mais jamais opposée à personne. Je ne peux donc pas affirmer qu'elle est verrouillée par formule.
- Aucun écran « espace client » listant devis, factures ou conversations passées : je n'ai trouvé ni route, ni page, ni composant. Si Benj veut filmer un tel écran, il n'existe pas.
- Je n'ai pas exécuté scripts/comptes-clients-e2e.mjs (il tape sur https://prestiapp.fr et crée des comptes de test) : je certifie que les 8 vérifications sont écrites, pas qu'elles passent aujourd'hui.
- Je n'ai pas vérifié en base réelle que les tables clients_plateforme / clients_liens / clients_sessions sont bien présentes en production ; je n'ai lu que la migration 0034.

### Le champ `fonde` prêt à coller

```
CE QUI AUTORISE LA VIDÉO (comptes clients par lien magique)

Drapeau : AUCUN. lib/flags.ts n'a pas d'entrée « comptes clients » ; lib/plans.ts:125 n'a pas de `flag:` → la ligne est publiée sans condition.

Formule : BASE → essai, 29 €, 59 €, 99 €. lib/plans.ts:37 (`'plateforme.comptes_clients'` dans BASE).

Implémentation réellement présente :
- lib/clientAuth.ts:22-32  creerLienMagique() — insère `clients_liens` avec sha256 du jeton
- lib/clientAuth.ts:14      DUREE_LIEN_MIN = 20 (minutes)
- lib/clientAuth.ts:43-46   usage unique (`utilise_le`)
- lib/clientAuth.ts:44      refus du lien expiré
- lib/clientAuth.ts:13,70   DUREE_SESSION_J = 30 (jours)
- lib/clientAuth.ts:101     cookie httpOnly + Secure + SameSite=Lax
- lib/clientAuth.ts:92-97   revoquerSession() → `revoque_le` en base
- lib/clientAuth.ts:84      une session révoquée ou expirée = null
- app/api/p/auth/route.ts:39-72  demande du lien (email envoyé)
- app/api/p/auth/route.ts:50,53  plafonds : 5 liens / 15 min par IP, 3 / 15 min par email
- app/api/p/auth/route.ts:57-58  réponse IDENTIQUE que le compte existe ou non
- app/api/p/auth/route.ts:63,66,69  marque blanche : lien sur le domaine de l'artisan (urlPlateforme, lib
```

## 14 — La base de prix

**Existe :** oui · **Drapeau :** aucun drapeau — rien dans lib/flags.ts ne concerne les prix ni la base de référence ; la fonctionnalité n'est donc masquée par aucun interrupteur (vérifié : lecture intégrale de lib/flags.ts, 26 drapeaux, aucun nommé prix/tarif/marche/postes)

**Formule :** BASE = essai + 29 € + 59 € + 99 €. lib/plans.ts:39 met 'devis.ia' et 'devis.prix_artisan' dans BASE, et BASE est la liste de capacités de gratuit/essentiel/studio/signature (lib/plans.ts:58-61). Nuance à connaître : ces deux capacités ne sont appelées nulle part via peut() (grep : elles n'apparaissent que dans lib/plans.ts) — il n'y a donc aucun verrou serveur ; le seul frein réel est le décompte de crédits (consumeCredit dans app/api/devis/generer/route.ts:40). La ligne publique correspondante est « Devis chiffrés par l'IA, sur vos prix », cochée pour les trois offres (lib/plans.ts:129).

### Les faits, avec leur source

| Fait | Où c’est vrai |
|---|---|
| La base de référence compte 33 lignes exactement. | supabase/migrations/0002_devis.sql:101-133 — 33 tuples comptés un par un ; recompte croisé par unité : 12 m² + 11 u + 5 ml + 5 forfait = 33 |
| Elle couvre 8 métiers : plombier, électricien, chauffagiste, couvreur, maçon, menuisier, peintre, carreleur. | supabase/migrations/0002_devis.sql:101-133 — répartition : Plombier 5, Électricien 5, Chauffagiste 4, Couvreur 4, Maçon 4, Menuisier 4, Peintre 4, Carreleur 3 |
| Chaque ligne est une fourchette min-max, pas un prix ferme. | supabase/migrations/0002_devis.sql:79 (colonnes prix_ht_min, prix_ht_max) ; lib/ai.ts:909 envoie « min-max € » à l'IA |
| L'étiquette écrite sur la ligne est « ordre de grandeur du marché ». | lib/prix/types.ts:50-51 — case 'marche' retourne exactement cette chaîne |
| Un poste que l'artisan a déjà chiffré chasse celui du marché. | lib/prix/index.ts:34-35 — les désignations de l'artisan sont normalisées, et le marché est filtré sur ce jeu |
| Une provenance absente du catalogue retombe sur « estimation ». | lib/prix/types.ts:69-73 (sourceLigneValide) appelé pour chaque ligne à lib/ai.ts:970 |
| Aucun prix en euros n'a le droit d'être écrit dans le code : le pré-commit le refuse. | scripts/garde-commit.mjs:41-44 et 58-66 — motif de la règle en commentaire ligne 38-40 : 23 postes sur 24 avaient divergé entre code et table |

### ⛔ Ce qu’il ne faut PAS dire

- Ne jamais dire « base de prix » au sens catalogue : ce sont 33 lignes (0002_devis.sql:101-133). Toute formulation qui suggère des milliers de références est fausse.
- Ne jamais dire « prix du marché » ou « prix ferme » : ce sont des fourchettes min-max (0002_devis.sql:79) et le libellé imposé par le code est « ordre de grandeur du marché » (lib/prix/types.ts:51). Le mot « estimation » est le repli légal du code, pas un mot marketing à éviter.
- Ne pas dire « votre métier est couvert » : la sélection se fait par égalité STRICTE sur le libellé du métier (lib/prix/marche.ts:32, .eq('metier', metier)), or l'inscription propose 29 métiers (app/onboarding/page.tsx:10-16) contre 8 servis. Un plaquiste, un serrurier, un paysagiste, un ramoneur reçoivent ZÉRO ligne de marché : leur devis se chiffre entièrement en « estimation ».
- Ne pas montrer ni annoncer un écran où l'artisan consulterait ces 33 lignes : la page /tarifs (app/tarifs/page.tsx) n'affiche que SES prix à lui, pas la table de référence. Je n'ai trouvé aucune page qui la liste.
- Ne pas évoquer Batiprix, BatiChiffrage ou une base d'ouvrages sous licence : le type SourceId les prévoit (lib/prix/types.ts:13, 'ouvrages') mais rien n'est branché — SOURCES_DISPONIBLES vaut ['artisan','marche'] (lib/prix/index.ts:56). Le commentaire types.ts:8-11 dit aussi qu'aspirer les prix des grossistes est une décision de NE PAS faire.
- Ne pas dire « réservé au Studio » ni « à partir de 59 € » : les capacités devis.ia et devis.prix_artisan sont dans BASE (lib/plans.ts:39), donc dès l'essai. Inversement, ne pas dire « illimité » : chaque chiffrage consomme un crédit (app/api/devis/generer/route.ts:40) et l'essai en donne 3 (lib/plans.ts:58).
- Ne pas annoncer une date ou une fraîcheur pour ces prix : sourceMarche.fraicheur() retourne toujours null (lib/prix/marche.ts:46) et les lignes n'ont pas de colonne de date.
- Ne pas dire que le catalogue entier part à l'IA : il est plafonné à 150 prix de l'artisan et 60 lignes de marché (lib/prix/index.ts:27-28).

### ? Non vérifié

- Je ne peux pas prouver que la table contient bien ces 33 lignes EN PRODUCTION : le seed est conditionnel (supabase/migrations/0002_devis.sql:135, `where not exists (select 1 from public.postes_types)`), il ne s'est exécuté qu'une fois sur une table vide, et je n'ai pas d'accès base ici. Si quelqu'un a collé du SQL à la main dans le SQL Editor, le dépôt ne le sait pas.
- Aucun écran ne laisse l'artisan CONSULTER les 33 lignes de référence. Le commentaire lib/ai.ts:732 affirme « que l'artisan peut consulter et surcharger » — je n'ai trouvé que la surcharge (/tarifs, ses prix à lui) et un accès indirect par l'outil consulter_prix de l'assistant (lib/ai/outils.ts:83-88). Ne pas filmer un écran qui n'existe pas.
- L'outil consulter_prix renvoie au client UN seul nombre pour une ligne de marché — le milieu de la fourchette (lib/prix/marche.ts:17) — accompagné de la provenance « ordre de grandeur du marché ». Je n'ai pas vérifié comment ce nombre s'affiche dans la conversation côté client ; à ne pas mettre en image sans l'avoir vu tourner.
- Le champ source_prix est stocké (lib/lignes.ts:28-29) mais je n'ai trouvé aucun composant .tsx qui l'affiche : ni dans l'éditeur de devis, ni dans lib/DevisPDF.tsx. La promesse « chaque ligne avec sa provenance » de app/DemoSequence.tsx:27 n'est pas vérifiable dans le rendu — à ne pas montrer à l'écran tant que personne ne l'a vu.

### Le champ `fonde` prêt à coller

```
Base de référence = table `postes_types`, créée et remplie par supabase/migrations/0002_devis.sql:76-80 (colonnes metier, designation, unite, prix_ht_min, prix_ht_max, tva_defaut) puis semée aux lignes 99-135. J'ai compté les lignes une par une : 33 exactement (0002_devis.sql:101 à 133 inclus ; recompte croisé par unité : 12 m², 11 u, 5 ml, 5 forfait = 33). 8 métiers : Plombier 5, Électricien 5, Chauffagiste 4, Couvreur 4, Maçon 4, Menuisier 4, Peintre 4, Carreleur 3. Lecture : lib/prix/marche.ts:28-33 (catalogue, .eq('metier', metier).limit(60)) et :37-42 (recherche ilike). Chaque ligne est une FOURCHETTE, jamais un prix ferme : lib/prix/marche.ts:17 calcule prix_ht = (min+max)/2 arrondi au centime, mais le prompt envoie la fourchette brute « min-max € » (lib/ai.ts:909). L'étiquette affichée est littéralement « ordre de grandeur du marché » (lib/prix/types.ts:50-51). Priorité artisan : lib/prix/index.ts:26-42 — les prix de l'artisan (table prix_artisan, lib/prix/artisan.ts:47-56) sont chargés d'abord, et tout poste du marché dont la désignation normalisée existe déjà chez l'artisan est retiré du lot (index.ts:34-35), donc jamais deux prix contradictoires pour la même chose. Garde-
```

## 15 — Standard, Pro, Expert : les trois moteurs

**Existe :** oui · **Drapeau :** aucun drapeau — lib/flags.ts ne contient AUCUNE entrée pour les moteurs / tiers (ni « tiers », ni « expert », ni « moteur »). Vérifié en lisant le fichier entier (lib/flags.ts:13-72). Rien n'est donc masqué et rien n'est à lever : les trois moteurs sont visibles et servis. Le seul verrou est la formule (lib/plans.ts:58-61), pas un drapeau.

**Formule :** Standard : dès l'essai gratuit et 29 € (lib/plans.ts:58-59, tiers: ['standard']). Pro : à partir de 59 € / Studio (lib/plans.ts:60, tiers: ['standard','pro']). Expert : 99 € / Signature UNIQUEMENT (lib/plans.ts:61, tiers: ['standard','pro','expert']). Le plan interne « business » (fondateurs) a les trois (lib/plans.ts:63).

### Les faits, avec leur source

| Fait | Où c’est vrai |
|---|---|
| Trois moteurs, trois modèles différents : Haiku pour Standard, Sonnet pour Pro, Opus pour Expert. | lib/models.ts:6-10 — MODEL_BY_TIER = { standard: 'claude-haiku-4-5', pro: 'claude-sonnet-5', expert: 'claude-opus-5' } |
| Standard ne réfléchit pas avant de chiffrer ; Pro et Expert activent le raisonnement adaptatif. | lib/ai.ts:21-23 — supportsThinking() est une regex qui n'accepte que opus/sonnet/fable en 5 ou 4-6+ : Haiku 4.5 en est exclu. lib/ai.ts:30-35 — genParams ajoute thinking:{type:'adaptive'} seulement si le modèle est capable. Le commentaire l |
| Sur un devis, Pro et Expert disposent de 6200 jetons de sortie, Standard de 2200. | lib/ai.ts:937 — generateDevis appelle genParams(model, 2200) ; lib/ai.ts:32 — un modèle capable reçoit max_tokens: baseMaxTokens + 4000, soit 6200. Sinon (ligne 34) max_tokens: 2200. |
| Les trois moteurs reçoivent exactement les mêmes consignes de métreur : seul le moteur change. | lib/ai.ts:887-936 — generateDevis construit UN seul prompt system (catalogue de prix, règles de TVA ligne par ligne, provenance obligatoire de chaque prix) sans jamais tester le modèle ; la seule différence injectée est ...genParams(model,  |
| Expert coûte 3 crédits par chiffrage ; Standard et Pro en coûtent 1. | lib/plans.ts:67 — CREDIT_COST = { standard: 1, pro: 1, expert: 3 }. Le débit passe par app/api/devis/generer/route.ts:40 (consumeCredit(uid, tier, …)) puis lib/credits.ts:17 (cost = CREDIT_COST[tier]). |
| Pro s'ouvre à 59 euros par mois, Expert seulement à 99 euros. | lib/plans.ts:58-61 — gratuit et essentiel (29 €) : tiers ['standard'] ; studio (59 €) : ['standard','pro'] ; signature (99 €) : ['standard','pro','expert']. Le sélecteur lit cette même liste via lib/models.ts:16 (tiersDuPlan) et app/ModelSe |
| Un moteur au-dessus de l'offre ne plante pas : il se replie sur le meilleur autorisé et le signale. | lib/models.ts:38-42 — resolveModel renvoie { tier: best, downgraded: true } ; app/api/devis/generer/route.ts:54 renvoie ce downgraded au client ; app/ModelSelect.tsx:26-33 affiche un cadenas et le titre « Réservé à l'offre … ». Prouvé par s |
| Sur un devis c'est l'artisan qui choisit le moteur à la main ; rien ne monte tout seul en Expert. | app/devis/[id]/page.tsx:34 (useState<Tier>('standard') par défaut), :270 (<ModelSelect …/>), :130 (body JSON { description, model: tier }). Côté conversation, lib/ai/routage.ts:46-50 — « Expert : jamais automatique — c'est 3 crédits, l'arti |

### ⛔ Ce qu’il ne faut PAS dire

- NE PAS dire « Expert chiffre plus précisément » comme un fait mesuré. « Le plus précis, gros chantiers » est un texte d'interface (lib/models.ts:22, champ desc), pas un résultat. Je n'ai trouvé aucune mesure comparée de précision de chiffrage dans le dépôt : scripts/ai-eval.mjs note des RÉPONSES de conversation (8 métiers × 5 intentions), pas des devis. Fait montrable à la place : Pro/Expert réfléchissent avant de répondre, Standard non.
- NE PAS afficher les noms de modèles à l'écran (Haiku / Sonnet / Opus / Claude). Le code en fait une décision explicite : lib/models.ts:2-3 « Le mapping vit UNIQUEMENT côté serveur — jamais exposé au client », et TIERS (lib/models.ts:18-23), la seule structure envoyée au navigateur, ne porte aucun identifiant de modèle. Montrer les noms contredirait le produit.
- NE PAS dire « Pro dès l'essai » ni « les trois moteurs dès 29 € ». lib/plans.ts:58-59 : essai et Essentiel ont tiers: ['standard'], point. Pro = 59 €, Expert = 99 €.
- NE PAS dire « budget de réflexion de N jetons ». Le code n'en fixe aucun : thinking: { type: 'adaptive' } (lib/ai.ts:32) laisse le modèle s'auto-doser, et `budget_tokens` n'apparaît nulle part dans le dépôt (grep sur tout le code hors node_modules : zéro occurrence). Le seul chiffre citable est max_tokens : 2200 contre 6200.
- NE PAS s'appuyer sur la grille publique pour vendre les trois moteurs SUR LE DEVIS. lib/plans.ts:129, ligne « Devis chiffrés par l'IA, sur vos prix », est true / true / true : identique aux trois offres. Les trois moteurs n'apparaissent dans la grille que pour l'Assistant IA (lib/plans.ts:120-124) et la recherche fournisseurs (lib/plans.ts:133).
- NE PAS filmer /outils pour illustrer le sujet. Le même composant y est affiché (app/outils/page.tsx:69) avec le libellé « Moteur de chiffrage » (app/ModelSelect.tsx:14) alors que l'outil rédige une réponse à un client, pas un devis. Le bon écran est /devis/<id>, section « Chiffrer avec l'IA » (app/devis/[id]/page.tsx:267-271).
- NE PAS confondre avec la recherche fournisseurs : là, Pro/Expert tournent volontairement en effort bas (lib/recherche-fournisseurs.ts:274-278, output_config: { effort: 'low' }). Le chiffrage d'un devis n'a AUCUN bridage d'effort — ne pas transposer l'un sur l'autre.
- NE PAS dire « Expert répond aussi vite ». Le code assume le contraire : app/api/devis/generer/route.ts:10-12, « Le modèle Expert (opus) peut mettre ~30 s », d'où maxDuration = 60.

### ? Non vérifié

- Aucune mesure comparée de la précision de chiffrage entre Standard, Pro et Expert. scripts/ai-eval.mjs (--tiers standard,pro, --expert) évalue des réponses de conversation, pas des devis chiffrés ; aucun rapport de résultats par moteur trouvé dans le dépôt.
- Aucun budget de réflexion chiffré : `budget_tokens` n'existe nulle part dans le code (grep sur tout le dépôt hors node_modules). Le thinking est « adaptive », donc auto-dosé par le modèle — impossible d'annoncer un nombre.
- Le moteur utilisé n'est PAS conservé sur le devis : la route le renvoie dans sa réponse JSON (app/api/devis/generer/route.ts:54, champ `tier`), mais aucune colonne `tier`/`modele` n'existe sur les tables devis dans supabase/migrations. On ne peut donc pas montrer un devis en base en disant « celui-ci a été chiffré en Expert ».
- Je n'ai pas trouvé de trace d'un artisan RÉEL ayant chiffré en Expert (ni journal, ni capture, ni jeu de données) : tout ce que je peux prouver est le comportement du code et les tests unitaires de routage.

### Le champ `fonde` prêt à coller

```
// lib/models.ts:6-10 — trois moteurs = trois vrais modèles
const MODEL_BY_TIER: Record<Tier, string> = {
  standard: 'claude-haiku-4-5',
  pro: 'claude-sonnet-5',
  expert: 'claude-opus-5',
}

// lib/ai.ts:21-35 — Standard ne réfléchit pas, Pro/Expert oui
function supportsThinking(model: string): boolean {
  return /claude-(opus|sonnet|fable)-(5($|-)|4-[6-9])/.test(model)
}
export function genParams(model: string, baseMaxTokens: number) {
  if (supportsThinking(model)) {
    return { model, max_tokens: baseMaxTokens + 4000, thinking: { type: 'adaptive' as const } }
  }
  return { model, max_tokens: baseMaxTokens }
}

// lib/ai.ts:937 — le chiffrage d'un devis passe par là (base 2200)
    ...genParams(model, 2200),

// lib/plans.ts:58-61 — quelle formule ouvre quel moteur
  gratuit:   { ... prixMois: 0,  tiers: ['standard'] ... }
  essentiel: { ... prixMois: 29, tiers: ['standard'] ... }
  studio:    { ... prixMois: 59, tiers: ['standard', 'pro'] ... }
  signature: { ... prixMois: 99, tiers: ['standard', 'pro', 'expert'] ... }

// lib/plans.ts:67 — le prix en crédits
export const CREDIT_COST: Record<Tier, number> = { standard: 1, pro: 1, expert: 3 }

// lib/models.ts:38-42 — au-des
```

## 16 — La page de conversation à votre marque

**Existe :** oui · **Drapeau :** aucun drapeau. lib/flags.ts (13-71) ne contient AUCUNE entrée pour la page de conversation : la route app/p/[slug]/page.tsx n'est gardée par rien, elle est toujours servie. Les trois drapeaux « plateforme* » existants (plateformePilotage:54, plateformeRegles:56, plateformePersona:66) sont tous à true et concernent le pilotage, les règles et la personnalisation avancée — pas la page elle-même. Les deux seuls drapeaux à false du fichier (canauxWhatsapp:68, canauxReseaux:70) ne touchent pas ce sujet.

**Formule :** DEUX RÉPONSES DIFFÉRENTES, ne pas les mélanger. (1) La PAGE de conversation : essai gratuit, donc essai + 29 + 59 + 99. 'plateforme.conversation' est dans BASE (lib/plans.ts:37), et scripts/abonnement-e2e.mjs:187 teste explicitement peut('gratuit','plateforme.conversation'). (2) Le NOM DE DOMAINE PERSO sur cette page : annoncé pour tous (BASE, lib/plans.ts:38, commentaire « décision Benj (04/09) »), autorisé pour tous côté serveur (app/api/domain/route.ts:33), MAIS le champ pour le saisir n'est affiché dans la console que si siteMax >= 3 (app/profil/page.tsx:593) — c'est-à-dire Signature, 99 €, seule offre à siteMax:3 (lib/plans.ts:61). En pratique aujourd'hui : le domaine perso est à 99 €.

### Les faits, avec leur source

| Fait | Où c’est vrai |
|---|---|
| L'adresse par défaut est prestiapp.fr/p/<slug> | lib/urls.ts:16 BASE_PRESTI = 'https://prestiapp.fr' ; lib/urls.ts:51, mode par défaut 'presti', plateforme: `/p/${s}` ; la route existe : app/p/[slug]/page.tsx |
| Aucun drapeau ne garde cette page : elle est toujours servie | lib/flags.ts:13-71 — le fichier ne contient aucune entrée pour la page de conversation ; les seuls false sont canauxWhatsapp:68 et canauxReseaux:70 |
| La page est ouverte dès l'essai gratuit, sans carte | lib/plans.ts:37 — 'plateforme.conversation' est dans BASE ; lib/plans.ts:58, PLANS.gratuit a capacites: BASE ; scripts/abonnement-e2e.mjs:187 teste peut('gratuit','plateforme.conversation') |
| Un test charge la page et vérifie qu'aucun « presti » n'y reste | scripts/plateforme-e2e.mjs:37 — retire la chaîne 'prestiapp.fr' du HTML rendu de /p/<slug>, puis affirme !sansDomaine.includes('presti') |
| L'onglet du navigateur affiche le logo de l'artisan | app/p/[slug]/icon.tsx:16-22 — logo_url si présent, sinon les initiales du nom sur la couleur d'accent de l'artisan ; commentaire ligne 4 : l'onglet affichait avant le favicon de Presti |
| Domaine vérifié : la page passe à mondomaine.fr/demande | lib/urls.ts:49 (mode perso → plateforme '/demande') ; app/p/[slug]/page.tsx:90 redirige si a.domaine && a.domaine_verifie ; middleware.ts:54 réécrit /demande vers /p/<slug> |
| Le champ pour brancher son domaine n'est affiché qu'à 99 € | app/profil/page.tsx:593 — le bloc est rendu seulement si siteMax >= 3, et seul Signature a siteMax:3 (lib/plans.ts:61) ; le texte visible ligne 597 dit « Inclus dans l'offre Signature », alors que lib/plans.ts:38 et app/api/domain/route.ts: |

### ⛔ Ce qu’il ne faut PAS dire

- NE PAS DIRE « votre nom de domaine dès 29 € », ni « pour toutes les offres ». C'est le piège exact du WhatsApp. lib/plans.ts:38 le met dans BASE avec le commentaire « décision Benj (04/09) », la grille publique lib/plans.ts:128 coche les trois offres, et le verrou serveur app/api/domain/route.ts:33 laisse passer toutes les offres — mais le champ où l'artisan saisit son domaine n'est rendu dans la console que si siteMax >= 3 (app/profil/page.tsx:593), donc Signature uniquement, et le texte affiché à côté dit encore « Inclus dans l'offre Signature » (ligne 597). Un artisan à 29 € ne voit pas le champ. La décision du 04/09 est passée dans plans.ts et dans l'API, PAS dans l'interface.
- NE PAS DIRE « Presti n'apparaît nulle part ». Sur la page elle-même c'est vrai et c'est testé (scripts/plateforme-e2e.mjs:37), mais le pied de page renvoie vers les infos légales (app/p/[slug]/PlatChat.tsx:560) et cette page nomme « Presti — Éditeur de l'outil » dans la liste des sous-traitants (lib/legalArtisan.ts:201). C'est une obligation RGPD, pas un oubli. Formule sûre : « aucune mention de Presti sur la page ».
- NE PAS DIRE que l'adresse ne contient jamais « presti ». Par défaut elle en contient : prestiapp.fr/p/<slug>. Elle ne disparaît que si l'artisan branche SON domaine (99 € en pratique). Le troisième mode, le domaine neutre <slug>.votreartisan.fr (lib/urls.ts:17-18, middleware.ts:80-89), est du code DORMANT : il dépend de NEXT_PUBLIC_DOMAINE_NEUTRE, absente de .env.local, et plans/journal-v5.md:63 enregistre la décision de Benj « pas de domaine neutre, je paye rien ».
- NE PAS DIRE que le domaine marche dès qu'on le saisit. Il faut qu'il soit VÉRIFIÉ : app/p/[slug]/page.tsx:90 exige domaine_verifie, et middleware.ts:33 met &domaine_verifie=is.true dans la requête. Un domaine saisi mais non pointé ne détourne rien (test dans scripts/domaine-perso-e2e.mjs:173).
- NE PAS DIRE que la page aide au référencement. Elle est explicitement en noindex : app/p/[slug]/page.tsx:57, robots: { index: false, follow: false }. Google ne l'indexe pas. C'est le SITE vitrine (/site/<slug>) qui est fait pour ça, pas la page de conversation.
- NE PAS DIRE « personnalisation complète pour tous ». Thème et couleur d'accent : toutes les offres. Polices, fond, avatar, amorces : verrouillés par 'plateforme.personnalisation_avancee', qui est dans STUDIO (lib/plans.ts:44), donc à partir de 59 € — le 403 est posé dans app/api/plateforme/apparence/route.ts:14-21.

### ? Non vérifié

- La valeur de NEXT_PUBLIC_DOMAINE_NEUTRE en PRODUCTION (Vercel). Je n'ai lu que .env.local (aucune ligne DOMAINE) et README.md:51 qui la liste comme absente de .env.local.example. Si elle était posée en prod, l'adresse par défaut ne serait plus prestiapp.fr/p/<slug> mais <slug>.<neutre>/demande. plans/demarchage-linkedin.md:318 pose déjà exactement cette réserve. À vérifier sur un vrai compte avant de citer une adresse à l'écran.
- Je n'ai pas exécuté les suites : scripts/plateforme-e2e.mjs (assertion white-label, ligne 37) et scripts/domaine-perso-e2e.mjs demandent un serveur en production et écrivent des comptes de test en base. Je certifie que l'assertion EXISTE dans le code, pas qu'elle est verte aujourd'hui.
- Aucun artisan réel avec un domaine vérifié n'a été constaté en base : je n'ai pas interrogé Supabase. La bascule vers mondomaine.fr/demande est prouvée par le code, pas par une page en ligne.
- Je n'ai pas trouvé de commentaire ou de commit expliquant POURQUOI la garde siteMax >= 3 (app/profil/page.tsx:593) n'a pas été descendue en même temps que lib/plans.ts le 04/09 — oubli ou décision, je ne peux pas trancher. Le document plans/apres-demo.md:33 dit encore « aujourd'hui Signature », il est probablement antérieur au changement de plans.ts.

### Le champ `fonde` prêt à coller

```
lib/urls.ts:16 (BASE_PRESTI = 'https://prestiapp.fr') et :51 (mode par défaut « presti » → plateforme: `/p/${s}`) donnent l'adresse par défaut : prestiapp.fr/p/<slug>, servie par app/p/[slug]/page.tsx. Aucune entrée pour cette page dans lib/flags.ts:13-71 → rien ne la garde. lib/plans.ts:37 met 'plateforme.conversation' dans BASE, donc dès l'essai à 0 € (PLANS.gratuit, lib/plans.ts:58, capacites: BASE) ; vérifié par scripts/abonnement-e2e.mjs:187 et scripts/offres-e2e.mjs:42. Le white-label est TESTÉ, pas juste commenté : scripts/plateforme-e2e.mjs:37 charge /p/<slug>, retire la chaîne « prestiapp.fr » du HTML rendu et affirme qu'il ne reste plus aucun « presti » dans la page. app/p/[slug]/layout.tsx:17-25 efface le manifeste, le mode app iOS et la couleur de thème hérités du layout racine ; app/p/[slug]/icon.tsx:16-22 rend le logo de l'artisan, sinon ses initiales sur sa couleur, comme favicon. Domaine perso : lib/urls.ts:49 (mode perso → plateforme '/demande'), app/p/[slug]/page.tsx:90 (redirige vers https://<domaine>/demande si domaine ET domaine_verifie), middleware.ts:54 (/demande → /p/<slug>) et middleware.ts:33 (la requête PostgREST exige domaine_verifie=is.true).
```

## 17 — La personnalisation de la page

**Existe :** oui · **Drapeau :** plateformePersona = true — lib/flags.ts:66 (« §9 G2 — persona et apparence avancée de la plateforme. Livré (sprint J-1). »). La ligne « Personnalisation » de la grille porte ce drapeau (lib/plans.ts:126) et passe donc le filtre GRILLE (lib/plans.ts:139).

**Formule :** Deux étages. Étage 1 (ambiance + couleur d'accent) : TOUTES les formules, essai et 29 € compris — la route les traite avant tout verrou (app/api/plateforme/apparence/route.ts:66-86). Étage 2 (polices, fond, avatar, amorces, écran d'accueil, formes) : capacité `plateforme.personnalisation_avancee`, placée dans le tableau STUDIO (lib/plans.ts:44), donc à partir de 59 € (Studio) et incluse à 99 € (SIGNATURE reprend STUDIO, lib/plans.ts:47). Une demande avancée sur une formule plus basse renvoie 403 (route.ts:92-95).

### Les faits, avec leur source

| Fait | Où c’est vrai |
|---|---|
| Huit couples de polices, ceux du site réutilisés | lib/siteStyle.ts:43-52 — tableau COUPLES : Atelier, Chantier, Épuré, Presse, Signature, Moderne, Solide, Classique. lib/plateformeStyle.ts:13 les importe (`import { COUPLES } from './siteStyle'`) et :117 pose `--pfd` (titres) et `--pfb` (te |
| Quatre fonds possibles : ambiance, couleur, dégradé, photo | app/plateforme/Apparence.tsx:305 — pastilles « Celui de l'ambiance / Une couleur / Un dégradé / Une photo ». lib/plateformeStyle.ts:129 `--pbg = linear-gradient(160deg, fond, fond2)` ; :131 `--pbg = url("…")`. app/p/[slug]/plat.css:449-450  |
| Quatre amorces au plus, quatre-vingts caractères chacune | lib/plateformeStyle.ts:207-211 — `amorcesSures` : `.map((a) => texteCourt(a, 80)).filter(…).slice(0, 4)`. L'écran de saisie propose exactement 4 champs (app/plateforme/Apparence.tsx:210-213, `maxLength={80}`). |
| Sans amorce écrite, ce sont ses vraies prestations | app/p/[slug]/PlatChat.tsx:106-114 — commentaire « jamais des exemples inventés » puis `services.slice(0, 3).map((s) => \`J'ai besoin de : ${s.toLowerCase()}\`)`. Donc une page sans réglage montre quand même des amorces, tirées des prestatio |
| La base refuse ces trois colonnes au navigateur | supabase/migrations/0053_plateforme_persona.sql:51-67 — `lock_plateforme_config_avancee()` : si `current_user not in ('service_role','postgres')`, `new.apparence := old.apparence; new.avatar_url := old.avatar_url; new.amorces := old.amorces |
| Une couleur illisible est corrigée à l'enregistrement | lib/plateformeStyle.ts:47-48 — `ACCENT_VISIBILITE_MIN = 2.2`, `ACCENT_VISIBILITE_CIBLE = 3`. app/api/plateforme/apparence/route.ts:83 : sous 2,2:1 l'accent est ramené à 3:1 en gardant sa teinte ; :100-104 : une couleur secondaire sous 4,5:1 |
| Rien de réglé, rien d'émis : zéro variable | lib/plateformeStyle.ts:91-99 `diffPlateformeStyle` n'enregistre que les écarts au défaut ; :110-141 `plateformeStyleToCss` n'émet que ces écarts. Migration 0053:47-48 : « Ne contient QUE ce qui diffère du défaut : {} = rendu inchangé ». |

### ⛔ Ce qu’il ne faut PAS dire

- Ne pas dire « personnalisez votre page à partir de 29 € » : à 29 € et pendant l'essai, il n'y a QUE l'ambiance (6 thèmes) et la couleur d'accent. Polices, fond, avatar, amorces, écran d'accueil et formes tombent sous `plateforme.personnalisation_avancee`, qui est dans STUDIO (lib/plans.ts:44) → 59 € minimum. La route renvoie 403 en dessous (route.ts:92-95), et l'interface affiche un cadenas (Apparence.tsx:174).
- Ne pas dire « sans Studio, votre page n'a aucune amorce ». Tout visiteur en voit : à défaut d'amorces écrites, PlatChat les construit depuis les vraies prestations de l'artisan (PlatChat.tsx:109-114). Ce que Studio achète, c'est d'écrire les siennes — pas d'en avoir.
- Ne pas dire « importez votre police » ou « toutes les polices Google ». Ce sont 8 couples figés (lib/siteStyle.ts:43-52) ; `resolvePlateformeStyle` (plateformeStyle.ts:78) rejette tout identifiant hors liste. Aucun téléversement de police nulle part.
- Ne pas dire « votre couleur est appliquée exactement telle que vous la choisissez ». Sous 2,2:1 de contraste l'accent est assombri ou éclairci jusqu'à 3:1 (route.ts:83), et une couleur secondaire sous 4,5:1 est corrigée (route.ts:100-104). C'est un argument, pas un défaut — mais c'est faux de promettre l'exactitude.
- Ne pas illustrer cette ligne avec le SITE VITRINE. Cette ligne de grille est le groupe « Plateforme » : elle personnalise la page de CONVERSATION /p/[slug]. Le site vitrine a son propre système (lib/siteStyle.ts, `styleToCss`, `--sfd`/`--sfb`) et sa propre ligne de grille (lib/plans.ts:127). Seuls l'ambiance et l'accent sont communs aux deux (Apparence.tsx:150 : « La même ambiance et la même couleur que votre site »).
- Ne pas ranger le TON de l'assistant (tutoiement, émojis, longueur, « votre façon d'écrire ») dans cette ligne « Personnalisation » réservée à Studio. Ces réglages vivent dans l'onglet Réglages et ne portent AUCUN `peut()` (app/plateforme/Reglages.tsx:194-222 ; seul `plateforme.ia.auto` est verrouillé, :62) : ils sont réglables dès l'essai. Les vendre comme du Studio serait un mensonge dans l'autre sens.
- Ne rien dire de WhatsApp ni des réseaux sociaux dans la même vidéo : canauxWhatsapp et canauxReseaux valent false (lib/flags.ts:68-70) — non construits.

### ? Non vérifié

- Je n'ai pas interrogé la base de production : je n'ai pas prouvé moi-même que la migration 0053 y est collée. Je m'appuie sur plans/journal-v5.md:148 (« Benj : migration 0053 collée dans le SQL Editor → persona/apparence débloqués »). Le fichier supabase/migrations/_A_COLLER_sql_editor_0053.sql existe toujours dans le dépôt, ce qui ne prouve ni ne réfute rien.
- Je n'ai pas exécuté scripts/persona-e2e.mjs (36 assertions, dont le verrou 403, la correction de contraste et le déclencheur 0053) contre un serveur aujourd'hui : je n'ai donc aucun résultat de test daté à citer. La seule trace est plans/journal-v5.md:138 : « 27/28 local (1 sauté faute de 0053) », avant la pose de la migration.
- Je n'ai vu aucune capture d'écran réelle du volet Apparence ni de page /p/[slug] personnalisée : tout ce qui précède est lu dans le code, pas constaté à l'image. Pour le montage il faudra filmer l'écran pour de vrai.
- Le nombre exact de fonds de thème est 6 (lib/themeFonds.ts:9-16) et THEMES_PLAT en liste 6 (plateformeStyle.ts:41) — cohérent — mais je n'ai pas vérifié que les 6 rendus sont visuellement distincts en production.

### Le champ `fonde` prêt à coller

```
lib/flags.ts:66 → `plateformePersona: true`
lib/plans.ts:44 → `'plateforme.ia.auto', 'plateforme.personnalisation_avancee',` dans le tableau STUDIO (= 59 € et 99 €)
lib/plans.ts:126 → cellules { essentiel: 'Thème + couleur', studio: 'Avancée : polices, fond, avatar, amorces', signature: 'Avancée' }, flag: 'plateformePersona'
app/api/plateforme/apparence/route.ts:92-95 → `const demandeAvance = …; if (demandeAvance && !peut(a.plan, CAPACITE)) return … 403`
lib/plateformeStyle.ts:114-141 → `plateformeStyleToCss` : --pfd/--pfb (polices), --pb/--ps/--ps2 (fond), --pbg (dégradé ou photo), --prad (angles), --pgap/--pbub-pad/--pfs (densité)
lib/plateformeStyle.ts:207-211 → `amorcesSures` : 4 au plus, 80 caractères chacune
app/p/[slug]/PlatChat.tsx:109-114 → amorces écrites, sinon construites depuis les vraies prestations
supabase/migrations/0053_plateforme_persona.sql:51-67 → déclencheur `lock_plateforme_config_avancee` : une écriture navigateur voit apparence/avatar_url/amorces remises à l'ancienne valeur
app/p/[slug]/page.tsx:129 → `<main className="plat plat-app" style={{ '--pc': accent, ...encre, ...styleVars }} data-theme={theme} {...styleData}>` — l'endroit où les réglages atterrisse
```

## 18 — Les trois niveaux de site vitrine

**Existe :** oui · **Drapeau :** siteSlides3d = true (C:/Users/benja/Documents/presti/lib/flags.ts:58, commentaire « §10 H2 — slides 3D de réalisations (Signature). Livré, 14/14 en mode production local. »). ATTENTION : ce drapeau n'est lu QUE dans lib/plans.ts:127 pour choisir le libellé de la grille — aucun code de rendu ne le teste. Le vrai verrou des slides est le niveau 3, pas le drapeau.

**Formule :** Les trois niveaux couvrent toutes les formules, mais pas au même niveau. Niveau 1 « Essentiel » = BASE, donc dès l'essai gratuit et 29 € (lib/plans.ts:58-59, siteMax: 1). Niveau 2 « Pro » = à partir de 59 € (lib/plans.ts:60, siteMax: 2). Niveau 3 « Signature » (cinématique, slides 3D, avant/après, domaine perso affiché) = 99 € uniquement (lib/plans.ts:61, siteMax: 3).

### Les faits, avec leur source

| Fait | Où c’est vrai |
|---|---|
| Le drapeau siteSlides3d vaut true : les slides 3D sont autorisées | lib/flags.ts:58 — « siteSlides3d: true » avec le commentaire « §10 H2 — slides 3D de réalisations (Signature). Livré, 14/14 en mode production local. » ; scripts/slides-e2e.mjs contient bien 14 assertions T(...) |
| Trois niveaux, six sections au niveau 1, treize au niveau 3 | lib/siteLayout.ts:41-50 — defaultLayout : niveau 1 = hero, services, process, about, faq, contact (6) ; niveau 2 = + trust et gallery (8) ; niveau 3 = + slides, words, features, manifesto, zone (13) |
| Cinq sections sont réservées au niveau 3 : slides, mots géants, features, manifeste, avant/après | lib/siteLayout.ts:29-33 — SECTION_MIN_TIER : slides: 3, words: 3, features: 3, manifesto: 3, avantapres: 3 ; trust: 2 et gallery: 2 ; tout le reste à 1 |
| Le tri par niveau se fait sur le serveur, pas en CSS | lib/siteLayout.ts:63-65 — resolveLayout filtre .filter((s) => s.on !== false && SECTION_MIN_TIER[s.id] <= tier), et le commentaire ligne 27 dit « gating SERVEUR par formule — jamais un simple masquage CSS » |
| Si l'artisan rétrograde sa formule, le site redescend de niveau tout seul | app/site/[slug]/page.tsx:136 — const tier = Math.min(Number(a.site_tier), siteMaxForPlan(a.plan)) ; le niveau enregistré est borné à chaque rendu par la formule courante |
| Les slides sont du CSS 3D piloté au scroll, sans WebGL | app/site/[slug]/SiteSlides.tsx:6-9 — « Mise en scène en CSS 3D (perspective + preserve-3d) pilotée par GSAP ScrollTrigger en scrub. Pas de WebGL » ; l'immobilisation est faite par position:sticky (site.css:562) et non par le pin de ScrollTr |
| Les slides ne s'arment pas sous 760 pixels ni en mouvement réduit | app/site/[slug]/SiteSlides.tsx:34 et 43 — deux gardes : reduced-motion, innerWidth < 760, saveData, puis pointer: coarse après l'import de GSAP ; sinon les panneaux restent des figures empilées en flux normal |
| Le site est servi sur le domaine de l'artisan, réécrit à la racine | middleware.ts:106-111 — le slug est résolu depuis le domaine (domaine_verifie is true) puis url.pathname devient /site/<slug> ; lib/urls.ts:37 renvoie https://<domaine> et lib/urls.ts:49 met le site à « / », la plateforme à « /demande », le |
| Le niveau du site tient dans une colonne, site_tier, par défaut 3 | supabase/migrations/0019_site_builder.sql:6-7 — « alter table public.artisans add column if not exists site_tier smallint default 3 » et site_active boolean default false : le site n'est pas en ligne tant qu'il n'est pas publié |

### ⛔ Ce qu’il ne faut PAS dire

- NE PAS dire « votre nom de domaine dès 29 € », même si la grille (lib/plans.ts:128) et la capacité site.domaine_perso (lib/plans.ts:38, dans BASE) le laissent croire, et même si app/api/domain/route.ts:33 l'autorise à tous les plans : le champ de saisie du domaine n'est affiché QUE si siteMax >= 3, c'est-à-dire Signature 99 € (app/profil/page.tsx:593). En dessous, l'artisan ne voit jamais où le brancher.
- NE PAS dire « une adresse sans presti pour tous », malgré le commentaire lib/plans.ts:38 : le mode d'adresse dépend de NEXT_PUBLIC_DOMAINE_NEUTRE, qui n'est PAS défini dans .env.local. lib/urls.ts:29-32 retombe donc sur le mode « presti » → prestiapp.fr/site/<slug>. Seul un domaine perso vérifié donne une adresse sans « presti » aujourd'hui.
- NE PAS dire « avant/après en 3D » : app/site/[slug]/SiteAvantApres.tsx:8 écrit noir sur blanc « Fonctionne partout, sans dépendance ni 3D » — c'est un curseur 2D avec clip-path. Le texte de la console (app/profil/page.tsx:585, « Montrez vos transformations en 3D ») est faux ; ne pas le recopier dans la vidéo.
- NE PAS dire « le drapeau protège les slides 3D » : siteSlides3d n'apparaît qu'une seule fois hors de sa définition, en lib/plans.ts:127, pour choisir un libellé. Aucun code de rendu ne le teste ; le mettre à false changerait le texte de la grille sans masquer la section.
- NE PAS montrer les slides sur un téléphone dans la pub : elles sont volontairement désactivées sous 760 px et en pointer: coarse (SiteSlides.tsx:34, 43). Filmer le niveau 3 en desktop.
- NE PAS dire « 13 sections au niveau Signature » comme si elles s'affichaient toutes : chaque section rend null sans contenu (page.tsx : trust exige au moins 2 faits réels, words au moins 2 mots, features au moins 2 prestations ET 2 photos, slides au moins 2 photos choisies via slidesOpts, lib/siteLayout.ts:17). Dire plutôt « jusqu'à 13 blocs ».
- NE PAS dire « le niveau est verrouillé à l'enregistrement » : le clamp de app/profil/page.tsx:223 est du code client (écriture directe vers Supabase, pas de route API). Le seul verrou réel est au rendu, app/site/[slug]/page.tsx:136.

### ? Non vérifié

- Aucune route API ne valide site_tier à l'écriture : app/profil/page.tsx:211-231 écrit directement dans la table artisans via le client Supabase. Je n'ai trouvé ni contrainte SQL ni politique RLS bornant site_tier au plan (0019_site_builder.sql ne pose qu'un default 3). La protection existe, mais uniquement à la lecture/rendu.
- Je n'ai pas trouvé d'écran ou de code où un artisan de formule Essentiel ou Studio puisse saisir son nom de domaine : le bloc est conditionné par siteMax >= 3 (app/profil/page.tsx:593) et je n'ai vu aucune autre surface de saisie. La grille de vente et l'API disent pourtant que tous y ont droit — contradiction non résolue dans le code.
- Je n'ai pas vérifié en production que le rendu Signature diffère visuellement du rendu Pro : je n'ai lu que le code et le CSS (app/site/[slug]/site.css:157-160 pour tier-1/tier-2). Aucune capture d'un site niveau 3 réel n'a été ouverte.
- Le commentaire de lib/urls.ts:11 dit « domaine perso de l'artisan (offre Signature) » alors que lib/plans.ts:38 place site.domaine_perso dans BASE : je ne peux pas trancher lequel reflète la décision commerciale actuelle.
- Je n'ai pas exécuté scripts/slides-e2e.mjs : je confirme seulement qu'il contient 14 assertions, pas qu'elles passent aujourd'hui.

### Le champ `fonde` prêt à coller

```
lib/flags.ts:58 → siteSlides3d: true.
lib/plans.ts:58-61 → siteMax: 1 (essai + Essentiel 29 €), 2 (Studio 59 €), 3 (Signature 99 €).
lib/plans.ts:79 → siteMaxForPlan(plan) = planConf(plan).siteMax ?? 1.
lib/siteLayout.ts:29-33 → SECTION_MIN_TIER : hero/contact/services/about/process/faq/zone = 1 ; trust + gallery = 2 ; slides, words, features, manifesto, avantapres = 3.
lib/siteLayout.ts:41-50 → defaultLayout : 6 sections au niveau 1, 8 au niveau 2, 13 au niveau 3.
lib/siteLayout.ts:60-70 → resolveLayout filtre côté serveur : .filter((s) => s.on !== false && SECTION_MIN_TIER[s.id] <= tier).
app/site/[slug]/page.tsx:136 → const tier = Math.min(Number(a.site_tier), siteMaxForPlan(a.plan)).
app/site/[slug]/page.tsx:465 → {layout.sections.map(...)} : la page est composée à partir de cette liste filtrée.
supabase/migrations/0019_site_builder.sql:6-7 → colonnes site_tier smallint default 3 et site_active boolean default false.
middleware.ts:106-111 → si le domaine est vérifié en base, la racine du domaine est réécrite vers /site/<slug>.
app/api/domain/route.ts:33-47 → ajout du domaine chez Vercel (addDomain), domaine_verifie écrit depuis status.served.
app/site/[slug]/SiteSlides.tsx:34 e
```

## 19 — L’export de vos données

**Existe :** oui · **Drapeau :** aucun drapeau — la chaîne "export" n'apparaît nulle part dans lib/flags.ts (les 22 drapeaux lus un par un). L'export ne dépend d'aucun interrupteur : il est branché en dur. À ne pas confondre avec la capacité `'export'` de lib/plans.ts, qui n'est pas un drapeau et qui, elle, n'est lue par personne.

**Formule :** PIÈGE : la grille vend STUDIO (59 €/99 €), le code ne verrouille rien. lib/plans.ts:47 met 'export' dans STUDIO et lib/plans.ts:138 affiche « Export de vos données » avec essentiel: false. Mais aucun fichier de app/ ou lib/ n'appelle jamais peut(plan, 'export') — j'ai listé les 16 appels de peut(), aucun ne porte sur l'export. app/api/donnees/export/route.ts:70-73 ne vérifie QUE la session. Et lib/aide.ts:370 annonce disponibleAvec: 'essentiel'. Conclusion : accessible dès l'essai gratuit, aucun prix ne peut être cité en vidéo.

### Les faits, avec leur source

| Fait | Où c’est vrai |
|---|---|
| L'export sort une archive ZIP datée du jour, pas un simple fichier. | app/api/donnees/export/route.ts:74 et :126 — `const jour = new Date().toISOString().slice(0,10)` puis Content-Disposition: attachment; filename="mes-donnees-presti-${jour}.zip", Content-Type application/zip |
| Douze fichiers JSON dans l'archive : profil, conversations, messages, devis, factures, clients, tarifs, inventaire, appareils de notification, actions de direction, accès du support, consultations du support. | app/api/donnees/export/route.ts:56-67 (l'objet retourné a exactement 12 clés) et :99 `for (const [nom, valeur] of Object.entries(d)) zip.ajouter(`donnees/${nom}.json`, ...)` |
| Les PDF des devis et factures sont régénérés depuis la base au moment de l'export, pas repris d'un stockage. | app/api/donnees/export/route.ts:105-109 — relecture de devis_lignes/factures_lignes puis renderPdfToBuffer(DevisPDF(buildPdfData(...))), le même moteur que /api/devis/[id]/pdf (commentaire l.13-14) |
| Un PDF qui échoue ne fait pas échouer l'archive : il est remplacé par un fichier .ERREUR.txt qui renvoie vers le JSON. | app/api/donnees/export/route.ts:110-113 — catch qui écrit `${numero}.ERREUR.txt` avec « Les données de ce document sont dans donnees/devis.json » |
| L'adresse IP du prospect est retirée de l'export avant l'écriture. | app/api/donnees/export/route.ts:26 — `.map(({ ip: _ip, ...l }) => l)` sur les leads, commentaire l.25 : « donnée d'un tiers, finalité anti-abus, elle n'a rien à faire dans l'export de l'artisan » |
| L'archive contient la liste nominative de ce que le support a consulté sur le compte. | app/api/donnees/export/route.ts:41-46 — tables acces_support et acces_support_lectures, colonne acteur_nom exportée ; commentaire l.38 : « Sans ça, la phrase de son écran de sécurité (« cette liste part avec vos données ») était fausse » |
| L'archive commence à se télécharger avant d'être terminée : le ZIP est écrit en flux, entrée par entrée. | app/api/donnees/export/route.ts:89-91 et :123 (la fonction async n'est pas attendue, `new Response(zip.flux)` part tout de suite) ; lib/zip.ts:8-9 « Chaque entrée est poussée dans le flux dès qu'elle est prête » |
| L'export a été vérifié de bout en bout contre un vrai serveur : signature ZIP, répertoire central, JSON lisibles. | scripts/parametres-e2e.mjs:167-201 — teste le content-type zip, `buf.readUInt32LE(0) === 0x04034b50`, la présence de 8 fichiers nommés, l'absence de JSON doublement encodé, et que profil.json porte bien le slug du compte |

### ⛔ Ce qu’il ne faut PAS dire

- NE PAS dire « Export à partir de 59 € » ni « réservé au Studio ». C'est exactement l'erreur WhatsApp, en miroir : lib/plans.ts:47 le range dans STUDIO et lib/plans.ts:138 barre l'Essentiel, mais AUCUN code ne lit cette capacité — la route (route.ts:70-73) ne demande qu'une session valide, et lib/aide.ts:370 dit disponibleAvec: 'essentiel'. Un artisan à 29 € (et même en essai gratuit) télécharge son archive. Aucun prix ne peut être prononcé sur cette vidéo.
- NE PAS dire « toutes vos données » ni « l'intégralité de votre compte ». L'export prend 12 jeux ; la base en compte plus de cinquante (supabase/migrations). Ne sortent PAS : la configuration de la plateforme (plateforme_config), les canaux email branchés (canaux), les fournisseurs, les achats, les listes d'achat, les alertes, les relances, les tickets. Dire « vos devis, vos factures, vos clients, vos conversations » — pas « tout ».
- NE PAS dire « votre inventaire part avec ». DÉFAUT RÉEL À SIGNALER À BENJ : route.ts:31 interroge `from('inventaire')`, or aucune migration ne crée de table `inventaire` (les fiches sont dans `materiaux`, 15 usages ; les fournisseurs dans `fournisseurs`, 12 usages) et c'est le SEUL endroit du code qui appelle ce nom. L'erreur est avalée par `.then((r) => r, () => ({ data: [] }))` : donnees/inventaire.json est un tableau vide pour tout le monde — alors que le LISEZ-MOI de l'archive (route.ts:96) et l'écran (SectionDonnees.tsx:107) promettent tous les deux « inventaire ».
- NE PAS filmer le texte de l'écran « Vos données vous appartiennent — à tout moment, sans condition » (SectionDonnees.tsx:107) à côté d'un prix ou d'un badge Studio : les deux affirmations se contredisent à l'image.
- NE PAS dire « export instantané » ou annoncer une durée. route.ts:17 fixe maxDuration = 60, c'est un plafond serveur, pas une mesure. Le temps réel dépend du nombre de PDF à régénérer, que personne n'a chronométré.
- NE PAS dire « format ouvert, réimportable chez un concurrent ». Le JSON sort brut, tel quel des tables (`select('*')`) : c'est de la portabilité au sens de l'article 20, pas un format d'échange normalisé, et rien dans le code ne réimporte cette archive.

### ? Non vérifié

- Aucun verrou d'offre sur l'export, où qu'il soit : j'ai listé les 16 appels de `peut(` dans app/ et lib/ (aucun ne porte sur 'export'), lu middleware.ts (le matcher exclut /api) et l'écran app/parametres/SectionDonnees.tsx (aucun badge 🔒, aucune lecture du plan). Je n'ai pas trouvé où la capacité STUDIO serait appliquée — je conclus qu'elle ne l'est nulle part, mais c'est une preuve par absence.
- Je n'ai pas lancé l'export moi-même contre le serveur de production : je m'appuie sur scripts/parametres-e2e.mjs, dont je n'ai pas la date ni le résultat du dernier passage.
- Le poids réel d'une archive et le nombre de PDF qu'elle supporte avant les 60 secondes : non mesurés, aucune trace dans le dépôt.
- Je n'ai pas vérifié si les tables `stock` et `mouvements_stock` existent en base déployée — seulement dans les migrations. Cela ne change rien au constat sur `inventaire`, qui n'y figure ni dans un create table ni dans une vue.

### Le champ `fonde` prêt à coller

```
app/api/donnees/export/route.ts — GET authentifié (l.70-73), collecte 12 jeux de données (l.22-67), écrit LISEZ-MOI.txt puis un JSON par jeu (l.94-99), régénère les PDF de chaque devis et facture (l.102-109), tolère un PDF raté (l.110-113), renvoie un flux ZIP nommé mes-donnees-presti-AAAA-MM-JJ.zip (l.123-128). Écrivain ZIP maison : lib/zip.ts:48-95 (ZipFlux.ajouter/terminer, deflate + CRC-32 lib/zip.ts:24-28). Bouton réel : app/parametres/SectionDonnees.tsx:28-51 et :109. Preuve de fonctionnement : scripts/parametres-e2e.mjs:167-201 (signature ZIP, répertoire central, noms de fichiers, JSON non doublement encodés, profil.json contient bien le compte).
```

## 20 — Les règles d’automatisation

**Existe :** oui · **Drapeau :** plateformeRegles = true (lib/flags.ts:56, commentaire « §9 G1 — constructeur de règles d'automatisation »). Nuance vérifiée : ce drapeau n'est lu QUE par lib/plans.ts:123 (le libellé de la grille tarifaire). Il ne garde aucune route ni aucun onglet — la fonctionnalité est allumée et le code tourne indépendamment de lui.

**Formule :** SIGNATURE uniquement = 99 €/mois. La capacité 'plateforme.regles' est ajoutée dans le tableau SIGNATURE (lib/plans.ts:49-51), pas dans BASE (36-41) ni STUDIO (42-48). Prix : lib/plans.ts:61, prixMois: 99. Le plan interne 'business' (fondateurs) reprend SIGNATURE (lib/plans.ts:63). L'essai, le 29 € et le 59 € n'ont PAS les règles — vérifié par test : scripts/regles-verrou-e2e.mjs:40-42.

### Les faits, avec leur source

| Fait | Où c’est vrai |
|---|---|
| Une règle = une seule ligne par artisan, sept maillons on/off qu'il règle lui-même depuis son navigateur ; la phrase se réécrit sous ses yeux à chaque clic. | supabase/migrations/0050_pilotage.sql:46-49 — table regles_automatisation, artisan_id en CLÉ PRIMAIRE (donc une règle par artisan, pas une par conversation), colonne maillons jsonb. Les 7 maillons : lib/regles.ts:18-33 (devis_auto, photo_re |
| Quatre préréglages livrés : Prudent, Équilibré, Réactif, Tout auto. Le préréglage par défaut est Équilibré, et Équilibré attend la validation de l'artisan. | lib/regles.ts:38-59 — objet PREREGLAGES, quatre entrées. Équilibré ligne 47 : validation: true, envoyer_apres_validation: true. lib/regles.ts:61 : MAILLONS_DEFAUT = PREREGLAGES.equilibre.maillons. Le défaut en base est le même : 0050_pilota |
| Avec le préréglage « Tout auto », le devis part seul dans la conversation, sans clic de l'artisan. L'interface le dit noir sur blanc au moment où on décoche la validation. | lib/regles.ts:57 — tout_auto porte validation: false. lib/regles.ts:122 : envoyerSansValidation = !m.validation && m.envoyer_apres_validation, avec le commentaire lignes 120-121 « C'est le seul cas où quelque chose part sans l'artisan — et  |
| Même en tout auto, un devis sans SIRET, forme juridique, adresse ou assurance ne part pas : il reste brouillon. | lib/reglesServeur.ts:56-62 — mentionsManquantesEmission(...) est appelé AVANT l'envoi, et l'envoi n'a lieu que si manquantes.length === 0. La liste bloquante : lib/legalArtisan.ts:88, MENTIONS_EMISSION = ['nom', 'forme', 'siret', 'adresse', |
| Jamais deux devis automatiques pour une même conversation — c'est la base qui le garantit, pas seulement le code. | supabase/migrations/0050_pilotage.sql:68 — create unique index devis_regle_par_lead_idx on public.devis (lead_id) where source = 'regle'. Doublé côté code : lib/regles.ts:112 (refus si devisExistant) et lib/devisAuto.ts:31-36 (rend le devis |
| Quatre raisons font taire la règle avant qu'elle n'agisse : règle en pause, artisan qui a pris la main sur la conversation, devis déjà existant, besoin pas encore qualifié. | lib/regles.ts:110-113 — quatre retours { action: 'rien' } avec leur motif en clair : « règle désactivée », « l'artisan a pris la main », « un devis existe déjà pour cette conversation », « besoin pas encore qualifié ». Cinquième refus ligne |
| Une règle ne chiffre pas une conversation vide : il faut que le chantier soit dit dans le message, ou que l'assistant ait déjà posé deux fois ses questions. | lib/reglesServeur.ts:42-43 — qualifie = !!typeDuMessage ·· nbReponsesIA >= 2. Le commentaire 37-41 dit pourquoi : lead.type_chantier retombe sur le métier de l'artisan (« Bonjour, vous êtes disponible ? » chez un plombier devient « Plomberi |
| Quand le client accepte le devis, la facture d'acompte se crée seule au pourcentage réglé — de 5 à 100 %, 30 % dans les préréglages livrés. | lib/reglesServeur.ts:80-83 (acompteApresAcceptation) appelé à app/api/conversation/devis/route.ts:88, puis creerFacture(..., acomptePct) ligne 90 et message « Facture d'acompte <numéro> (<N> %) » ligne 93. Bornes : app/plateforme/Automatisa |
| La règle d'un artisan qui n'est pas en Signature n'est jamais exécutée : le serveur refuse avant même d'appeler le modèle. | lib/reglesServeur.ts:32-33 — relecture du plan côté serveur puis if (!peut(art?.plan, 'plateforme.regles')) return { fait: 'rien', pourquoi: `réservé à l'offre ...` }. Le commentaire 29-31 précise que la règle est écrite depuis le navigateu |

### ⛔ Ce qu’il ne faut PAS dire

- NE PAS dire « seuls les Signature voient le constructeur de règles ». C'est faux : l'onglet Automatisations est affiché à TOUS les plans, sans test de plan ni de drapeau (app/plateforme/page.tsx:62 et :88, aucune condition). Un Studio peut même cocher « Créer un devis brouillon » et enregistrer sa règle (Automatisations.tsx:69 verrouille ce maillon sur 'plateforme.ia.auto', une capacité STUDIO, PAS sur 'plateforme.regles'). Sa règle ne s'exécutera jamais — le refus est côté serveur (lib/reglesServeur.ts:33). Formulation honnête : « la règle ne s'exécute qu'en Signature », pas « le réglage n'est visible qu'en Signature ».
- NE PAS dire « la règle envoie le devis par email au client ». Le code fait deux choses distinctes : il passe le devis à statut 'envoye' et insère un message DANS LA CONVERSATION (lib/reglesServeur.ts:59-60) ; l'email, lui, part à l'ARTISAN (lib/reglesServeur.ts:65-73, notifierArtisan). Rien dans ce chemin n'envoie un email au prospect.
- NE PAS dire « c'est l'IA qui décide d'envoyer ». La décision est une fonction pure et déterministe, sans appel modèle (lib/regles.ts:109-124, commentaire :13-14 « le moteur ne sait pas créer un devis, il demande qu'on le fasse »). L'IA n'intervient que pour chiffrer le devis (lib/devisAuto.ts, generateDevis) et pour qualifier le message.
- NE PAS dire « dès que le client écrit, le devis part ». Le déclenchement vient du navigateur du client APRÈS la réponse de l'assistant, par une route séparée (app/p/[slug]/PlatChat.tsx:126 → app/api/conversation/regles/route.ts). Le commentaire :7-12 explique pourquoi : le chiffrage dépassait les 60 s de Vercel en modèle Pro. Et c'est plafonné : 6 déclenchements par conversation et par heure (:33), 30 par IP et par heure (:27).
- NE PAS présenter « acompte de 30 % » comme une valeur du produit. 30 % n'est que la valeur des préréglages Réactif et Tout auto (lib/regles.ts:52 et :57) ; l'artisan règle librement de 5 à 100 % (Automatisations.tsx:85), et le maillon peut être éteint (acompte_pct: null = pas de facture auto, lib/regles.ts:31-32).
- NE PAS dire « plusieurs règles » ni « une règle par chantier ». Il n'y en a qu'UNE par artisan : artisan_id est la clé primaire de la table (0050_pilotage.sql:47). Dire « votre règle », au singulier.
- NE PAS dire « seul Signature obtient un devis chiffré tout seul ». Le chiffrage automatique d'une conversation existe pour tous par deux autres chemins : le bouton manuel de la boîte (source 'manuel') et l'outil de l'assistant (source 'outil') — lib/devisAuto.ts:1-4. Ce que Signature ajoute, c'est la RÈGLE : le déclenchement sans que l'artisan touche à rien, plus l'acompte à l'acceptation.
- Sur le point délicat de l'envoi sans clic : le dire, ne pas l'enrober. La formulation la plus proche du code est celle de l'interface elle-même (Automatisations.tsx:80) : « sans ce maillon, le devis part seul dans la conversation ». Et préciser que c'est un choix explicite de l'artisan, pas le comportement par défaut — le défaut est Équilibré, qui attend sa validation (lib/regles.ts:47 et :61).

### ? Non vérifié

- Aucun test unitaire pur sur decider() / phraseRegle() / normaliserMaillons(). Grep sur tout le dépôt (hors node_modules) : zéro fichier de test appelant ces fonctions. La couverture vient uniquement de deux scripts e2e qui exigent un vrai serveur et une vraie base (scripts/regles-verrou-e2e.mjs, scripts/pilotage-e2e.mjs). Ne pas affirmer « chaque maillon est couvert par un test ».
- Je n'ai PAS pu vérifier que la migration 0050 est réellement appliquée en base de production. Le fichier existe dans le dépôt (supabase/migrations/0050_pilotage.sql) et dans le lot à coller (_A_COLLER_sql_editor_0047_a_0052.sql:290+), mais l'état réel de la base n'est pas lisible depuis le code. À la différence d'autres fonctionnalités, aucun garde-fou 503 n'est prévu ici si la table manque : regleDe() renverrait simplement null et la règle ne ferait rien.
- Pas de journal d'exécution des règles côté artisan. declencherRegles rend bien son résultat (lib/reglesServeur.ts:26, commentaire :22-24 « pour le journal de la conversation… jamais silencieux ») et la route le renvoie en JSON, mais je n'ai trouvé AUCUNE table qui archive « ce que la règle a fait, et pourquoi elle s'est abstenue ». La seule trace persistante est le message inséré quand un devis part (:60) et l'email à l'artisan (:65-73). Donc ne pas dire « vous voyez l'historique de ce que la règle a décidé ».
- Le maillon validation: true ne fait, dans ce code, que S'ABSTENIR d'envoyer. Je n'ai pas trouvé dans reglesServeur.ts de chemin « l'artisan valide → le devis part » : l'envoi après validation passe par le parcours normal de l'artisan (le test pilotage-e2e.mjs:130 simule la validation par un UPDATE direct en base). Ne pas promettre un bouton « Valider » spécifique aux règles sans l'avoir vu à l'écran.
- Le drapeau plateformeRegles ne garde rien. Contrairement à d'autres drapeaux du fichier (direction, apports, messagerie… qui font répondre 404 ou 503), celui-ci n'est lu qu'à lib/plans.ts:123 pour un libellé de grille. Le baisser ne fermerait ni l'onglet, ni la route /api/conversation/regles, ni l'exécution. C'est un écart avec la promesse écrite en tête de lib/flags.ts:6-7 — à signaler à Benj, mais ça ne change rien à la véracité de la vidéo (le drapeau est levé).

### Le champ `fonde` prêt à coller

```
Le drapeau : lib/flags.ts:56 → plateformeRegles: true (allumé). La formule : lib/plans.ts:49-51, 'plateforme.regles' est dans le tableau SIGNATURE seulement, et lib/plans.ts:61 fixe signature à prixMois: 99. La table : supabase/migrations/0050_pilotage.sql:46-61 (regles_automatisation, artisan_id en clé primaire, maillons jsonb, RLS artisan_id = auth.uid()) et :68 (index unique devis_regle_par_lead_idx). Le moteur de décision, pur et déterministe : lib/regles.ts:109-124 (decider) + :18-33 (les 7 maillons) + :38-59 (les 4 préréglages) + :81-92 (phraseRegle). L'exécution serveur : lib/reglesServeur.ts:26-77 (declencherRegles) — verrou d'offre :32-33, qualification :42-43, création du devis :48, envoi sans validation :53-62, notification artisan :65-73 ; et :80-83 pour l'acompte. Le point de branchement : app/api/conversation/regles/route.ts:37, route dédiée appelée par le navigateur du client à app/p/[slug]/PlatChat.tsx:126, plafonnée à :27 et :33. L'acompte à l'acceptation : app/api/conversation/devis/route.ts:88-96. L'interface : app/plateforme/Automatisations.tsx (préréglages :52-59, phrase :61, maillons :68-87, garde-fous écrits :89), montée à app/plateforme/page.tsx:88. Les preu
```
