# Brief — `presti-accuse-reception` : l'accusé de réception et l'avis à l'artisan dans n8n, pas 1 à 3 (chantier 4, lot L18, tâche 032-040)

Deuxième chemin codé à basculer dans n8n (`.claude/rules/migration-production.md`, « La règle de remplacement ») : workflow créé, essayé à
blanc, comparé à l'ancien. Les pas 4 (ancien code coupé) et 5 (drapeau vérifié) attendent Benj : section « Avant la bascule ».
Juge : `scripts/accuse-reception-n8n-qa.mjs` (hors ligne). Garde commune : `scripts/n8n-specs-qa.mjs` (non modifiée, verte sur l'export).
Workflow : n8n d'Oracle, id `VnU1onu9T4Z2asTu`, **inactif, jamais publié, les deux nœuds d'envoi désactivés et sans identifiant**.

## Ce que fait l'ancien code (à refaire, rien de plus)

Dans `app/api/leads/route.ts`, branche où l'assistant **se tait** (`!decision.ok`, comportement `silence` : mode manuel, mot d'escalade, hors
plage horaire ; `:379-408`) :
- **l'avis à l'artisan** (`:385-392`) : `notifierArtisan(…, 'nouvelle_demande', …)`, e-mail de Presti, `Reply-To` = le prospect, sujet
  « Nouveau contact — {nom|contact} » ou « ⚠️ Demande sensible (« {mot} ») — … » ; il porte nom, contact, besoin, nombre de photos ; il part
  aussi en notification poussée, sauf si l'artisan a coupé ce type (`artisans.notifications`, `lib/notifications.ts:59-76`) ;
- **l'accusé de réception au prospect** (`:393-407`) : `sendEmail`, au nom de l'artisan (`fromName`), `Reply-To` = l'adresse de l'artisan
  (`lib/email.ts:6-11`), texte fixe sans la mention d'IA (`:402` ; le message du prospect n'est pas recopié : audit offensif du 11/10, E2),
  seulement si le contact est une adresse e-mail et que les coordonnées ne sont pas différées ;
- ce que `sendEmail` y ajoute en passant (`lib/email.ts:69-97`) : les adresses `.invalid` ignorées, au plus **3 envois par destinataire et par
  24 h**, au plus **30 envois anonymes par jour**, au plus **80 envois du produit par jour**.
Le même texte d'accusé part aussi dans la branche « réponse proposée » (`:365`) ; la réponse qui part seule (`:473-483`) est un autre lot.
Ce workflow **ne touche ni à l'une ni à l'autre** (voir « Limites »).

## Le signal que la route doit laisser (colonne PROPOSÉE : `leads.motif_reponse`)

n8n ne peut pas refaire la décision : elle dépend du texte du message (mot d'escalade), des réglages de l'artisan, de sa plage horaire et de
compteurs. Elle est prise dans la route, qui la dépose : **une colonne `leads.motif_reponse text`** que la route écrit une fois, juste après
`decisionReponse` (et dans les branches « en pause » et « plafond par artisan »). Valeurs : `auto`, `assistee`, `verrou_offre`, `manuelle`,
`escalade`, `horaire`, `humain`, `limite`, `pause`, `throttle`, `credits` ; vide pour un formulaire de site sans plateforme. **n8n n'agit que sur
`manuelle`, `escalade`, `horaire`, `humain`, `limite`** (le silence). La colonne n'existe pas encore : le juge en déduit la valeur de ce que la
VRAIE route a décidé (espion sur `decisionReponse`, plafond par artisan observé), jamais écrite à la main.

## Le workflow

Chaîne : `Toutes les minutes` (cron `0 * * * * *`, fuseau `Europe/Paris`) → `Fenetre du passage` → quatre lectures HTTP `GET` (une fois chacune,
paginées par 1 000, identifiant « Supabase account ») → `Courriers a envoyer` (la règle, en code pur) → **en parallèle** `Garder les accuses` →
`Envoyer l accuse` et `Garder les avis` → `Envoyer l avis`. Les deux nœuds d'envoi sont **désactivés** et n'ont **aucun identifiant** ; l'option
« envoyé automatiquement avec n8n » est coupée (marque blanche) ; `pied: aucun` déclaré (texte fixe, message de Presti).
Réglages : `timezone Europe/Paris`, `executionTimeout 120`, `saveDataSuccessExecution none` (les passages réussis ne gardent aucune adresse),
`saveDataErrorExecution all`, `errorWorkflow` = `presti-erreurs` (`AQeHiC58UgbMR4Kr`, alerte courte sans donnée, 032-033).

| Lecture | Table | `select=` | Filtres | Pourquoi |
|---|---|---|---|---|
| Lire demandes du jour | `leads` | `id,artisan_id,created_at,motif_reponse` | motif du silence, de minuit (Paris) à la fin de la fenêtre | le rang de la demande dans la journée (plafonds) ; aucune donnée personnelle |
| Lire destinataires | `leads` | `id,artisan_id,created_at,motif_reponse,nom_prospect,contact` | motif du silence, fenêtre d'une minute | **lue au moment d'envoyer** (`lecture-pour-envoi`, plan §0 bis) : le nom et l'adresse du destinataire |
| Lire comptes | `artisans` | `id,nom,email,notifications` | `id` des demandes de la fenêtre | **lue au moment d'envoyer** : nom de marque, `Reply-To`, préférence « nouvelle demande » |
| Lire doublons | `leads` | `id,contact,created_at` | dernières 24 h, `contact` parmi les adresses « sûres » de la fenêtre (`ilike`) | le plafond de 3 par destinataire que `sendEmail` tenait |

Jamais lu : le message du prospect, ses photos, son adresse IP. L'adresse n'est reprise dans un filtre que si elle est « sûre »
(`[A-Za-z0-9._+-]+@domaine`), pour qu'aucun caractère de contrôle n'entre dans une requête ni dans un en-tête.

**Une fois par demande, sans mémoire dans n8n** (n8n n'écrit pas en base, `0189`) : le nœud `Fenetre du passage` calcule, à chaque minute pile,
la fenêtre `[passage − 90 s, passage − 30 s)` ; les fenêtres se suivent sans trou ni chevauchement, donc une demande tombe dans **une** fenêtre.
Les 30 secondes de décalage laissent à la route le temps d'écrire le motif. Le juge le prouve sur chaque seconde de sept minutes, avec une
gigue de 0 à 8 s sur l'heure de départ, et montre qu'une fenêtre non alignée ou sans décalage le fait rougir.

## Comparaison (pas 3) — même données, même résultat, ou l'écart écrit

Le juge **joue la vraie route** `app/api/leads/route.ts` sur 20 cas (94 demandes) : doublures de la base, du modèle, des compteurs de limites
et des notifications poussées ; **la vraie `lib/email.ts`** (un `fetch` qui note ce que Resend recevrait : en-tête `From`, `To`, sujet, texte,
`reply_to`) ; la vraie `lib/notifications.ts` ; la vraie `decisionReponse`. Il en déduit le motif, fabrique les lectures qu'auraient rendues
les requêtes du workflow, et rejoue les nœuds Code de l'export dans un contexte vm. Chaque courrier doit être identique, au caractère près.
Cas : manuelle ; prospect sans e-mail ; artisan sans adresse ; doublon (casse variée, 4ᵉ refusé) ; « STOP » (mot d'escalade de l'artisan) ;
« fuite » (mot d'escalade par défaut) ; nuit (Signature, plage fermée) ; jour (Signature, la réponse part seule : n8n ne fait rien) ;
Studio en mode auto (verrou d'offre : rien) ; Studio assistée (rien) ; Signature manuelle ; notification coupée ; adresses `.invalid` ; plafond
par artisan (10 demandes de suite) ; compte en pause ; premier message sans coordonnées ; plafonds du jour (60 demandes) ; adresse atypique ;
noms (artisan sans nom, nom chargé de `&`, `"`, `<>`, prospect sans nom, prénom composé, message sur deux lignes) ; crédits épuisés.
Résultat : 73 avis et 52 accusés identiques à ceux de la route, aux écarts écrits près, chacun prouvé par un cas :

- **E1 — l'avis ne dit pas le besoin.** n8n ne lit pas `message` : « Besoin : … » (et « Photos jointes : N ») deviennent « Sa demande est dans
  votre espace (Messages) : répondez-lui depuis là. ». Rien d'inventé : on renvoie à l'espace.
- **E2 — le mot d'escalade n'est pas dans le sujet.** « ⚠️ Demande sensible (« stop ») — X » devient « ⚠️ Demande sensible — X » : le mot vit dans
  le message, que n8n ne lit pas. L'alerte reste, le mot s'y lit dans l'espace.
- **E3 — adresse atypique.** Une adresse que la route accepte (`a"b@exemple.test`) mais qui sort du motif « sûr » ne reçoit **pas** d'accusé de
  n8n, et le `Reply-To` de l'avis retombe sur celui de Presti.
- **E4 — la notification poussée n'est pas refaite.** n8n n'a pas de Web Push (clés VAPID, abonnements) : l'artisan continue d'être prévenu par
  push par le code, qui doit donc garder un `notifierArtisan` **sans e-mail** (voir « Avant la bascule », 2).
- **E5 — le premier message sans coordonnées** (variante B, `deferContact`) : la route envoie un avis neutre (« Nouvelle demande sur votre
  page ») et pas d'accusé ; n8n ne fait rien (pas de contact). L'avis neutre reste dans le code.
Corrections de l'ancien code **voulues** (non comparables, écrites ici) : sujets et noms sans retour à la ligne ; adresses `.invalid` jamais
visées ; aucun envoi sans compte retrouvé.

## Limites (dites)

- **Les plafonds sont repris, pas partagés.** `sendEmail` compte dans la base (RPC `consommer_limite`) ; n8n ne l'appelle pas et n'écrit pas. Il
  refait donc ses propres plafonds : 3 par destinataire (les demandes de la même adresse en 24 h, casse ignorée), **30 accusés par jour**,
  **50 avis par jour** (80 du produit − 30 anonymes, ce qu'obtenait l'ancien code quand ces deux flux étaient seuls). Les autres envois de
  l'application ne sont plus dans ces comptes : le plafond réel d'e-mails du jour n'est plus connu d'un seul endroit (décision 4).
- **Pas de rattrapage.** Un passage manqué (n8n arrêté) ne rattrape pas les demandes de sa fenêtre : ni accusé ni avis par e-mail (la demande
  est en base, dans l'espace, et la push du code reste). Le remède — une marque « accusé envoyé » écrite par une fonction en base — demande
  une écriture de n8n : décision 7.
- **Hors lot** : le même accusé dans la branche « réponse proposée » (`:365`) et l'avis de cette branche (`:354`), l'avis de la réponse seule
  (`:493-500`), l'avis du plafond par artisan (`:305-310`), l'avis des crédits épuisés (`:423-430`). `motif_reponse` les rend lisibles pour
  un lot suivant (une proposition posée se lit dans `messages`, `etat = 'proposition'`).
- **« STOP »** : la route ne connaît pas de désinscription sur un message entrant ; le cas du juge est un mot d'escalade réglé par l'artisan.
- **SMTP, pas l'API Resend** : n8n envoie par un identifiant SMTP (aucun n'existe : à créer par Benj) ; ni l'identifiant de message Resend ni
  les rebonds ne reviennent dans l'application (ils n'y revenaient pas non plus pour ces deux courriers).
- Le juge simule la colonne `motif_reponse` (elle n'existe pas) ; la lecture réelle (`400` tant que la colonne manque) n'est pas l'objet de ce lot.

## Avant la bascule

Rien n'est publié, rien n'est écrit, aucune migration n'est faite, aucun identifiant créé. Ce que Benj décide, dans l'ordre :

1. **Les écarts E1 à E5** : les accepter (E2 est le seul qui retire une information d'une alerte : le mot ; décision de produit), ou garder
   l'avis dans le code et ne basculer que l'accusé.
2. **La colonne et le geste de la route** (« go » écrit de Benj ; migration écrite et essayée à sec par la session principale) :
   ```sql
   alter table public.leads add column if not exists motif_reponse text;
   alter table public.leads add constraint leads_motif_reponse_borne check (motif_reponse is null or motif_reponse in
     ('auto','assistee','verrou_offre','manuelle','escalade','horaire','humain','limite','pause','throttle','credits'));
   create index if not exists leads_motif_reponse_cree on public.leads (created_at) where motif_reponse is not null;
   ```
   **Collée AVANT de publier** : tant que la colonne manque, chaque lecture échoue (400) et `presti-erreurs` alerte chaque minute. Puis, dans la
   route (une ligne par branche : après `decisionReponse`, en pause, plafond par artisan, crédits), l'écriture du motif ; un drapeau neuf
   `accuseParN8n` (`lib/flags.ts`, baissé) qui saute `:385-407` **sauf la push** (un `notifierArtisan` sans e-mail : option à ajouter à
   `lib/notifications.ts`). Le code reste en place (réversible : on rebaisse le drapeau).
3. **Les droits de lecture** : 0189 exclut exactement ces colonnes (nom, adresse, e-mail). Aujourd'hui n8n lit par la clé de service
   (« Supabase account »), qui passe outre ; la seule barrière est le `select=` des quatre lectures, figé par le juge. Choix : (a) accorder à
   `n8n_lecture` `leads(motif_reponse, nom_prospect, contact)` et `artisans(nom, email, notifications)`, (b) ou une vue étroite des seules demandes
   dues (recommandé : n8n ne verrait jamais que celles-là), (c) ou l'accepter tel quel et l'écrire au registre.
4. **Le plafond d'e-mails du jour** : `lib/email.ts` protège l'offre Resend gratuite (100 par jour) par un compteur ; n8n envoie à côté. Soit baisser
   `EMAILS_PRODUIT_PAR_JOUR` de la part de n8n (jusqu'à 30 accusés + 50 avis), soit passer l'offre Resend, soit un compte d'envoi à part pour n8n.
5. **L'identifiant SMTP** (réglage de compte, interdit à un agent) : par exemple le relais SMTP de Resend (domaine `prestiapp.fr` déjà vérifié :
   l'expéditeur reste `contact@prestiapp.fr`), posé sur les deux nœuds, qu'on réactive ensuite.
6. **Avant toute publication** : la section « Lectures de n8n sur le serveur Oracle » de `docs/registre-traitements.md` (avec le nom et l'adresse
   des prospects et des artisans, lus au moment d'envoyer) ; décider si les exécutions en erreur gardent leurs données (`all` : adresses 14 jours
   sur Oracle ; `none` : plus rien à relire).
7. **Un trou en cas de panne** : accepter l'absence de rattrapage (ci-dessus), ou autoriser une fonction en base `leads_marquer_accuse(ids)` écrite
   par n8n après l'envoi, qui supprime le trou et rend l'unicité exacte (une écriture de plus, exception à 0189).
8. **Passage d'ombre (recommandé)** : publier avec les envois désactivés, `saveDataSuccessExecution = all` quelques jours sur Oracle, et comparer
   chaque matin les `Courriers a envoyer` du jour aux accusés et avis que la route a envoyés (Resend) ; tout écart hors E1-E5 arrête la bascule.
9. **Pas 4 — couper l'ancien envoi** : publier l'envoi dans n8n (nœuds réactivés), constater un passage, **puis** lever `accuseParN8n` dans la
   minute qui suit (un chevauchement donne au pire deux « Bien reçu » ; l'ordre inverse perdrait des accusés). Retour : baisser le drapeau et
   dépublier le workflow dans la même minute.
10. **Pas 5 — vérifier le drapeau** : `accuseParN8n` seul gouverne ce chemin ; `lib/flags.ts` fait foi ; le workflow n'a pas de copie de drapeau
    à contrôler (il agit sur la colonne, pas sur un drapeau).

**Le délai que n8n ajoute à l'accusé, mesuré** : (a) l'attente due au calendrier — le juge fait tomber chaque seconde de sept minutes dans sa
fenêtre, avec une gigue de 0 à 8 s sur l'heure de départ — est de **31 à 90 s, 60,5 s en moyenne** (borne théorique 30 à 90 s) ; (b) l'exécution
elle-même dans n8n, lectures épinglées : **61 ms** (exécution 400), dont 13 ms pour le nœud `Courriers a envoyer` et 37 ms pour `Fenetre du
passage` sur l'horloge réelle (exécution 381) ; (c) **non mesuré** : les quatre lectures réelles de Supabase et l'envoi SMTP (ni réseau ni
identifiant ici) — à mesurer pendant le passage d'ombre (durée de l'exécution) et au premier envoi réel. L'ancien accusé partait dans la
requête même, quelques centaines de millisecondes après l'enregistrement (non mesuré ici). Le texte de l'accusé ne promet aucun délai
(« revient vers vous très vite ») ; la promesse « moins d'une minute » (`plans/promesses.md:8`) vise la réponse de l'assistant, pas l'accusé,
et ne doit pas être reportée sur lui.
