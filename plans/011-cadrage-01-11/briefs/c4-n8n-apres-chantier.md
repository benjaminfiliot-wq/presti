# Brief — `presti-apres-chantier` : l'après-chantier dans n8n, pas 1 à 3 (chantier 4, lot L18, tâche 032-031)

Premier chemin codé à basculer dans n8n (`.claude/rules/migration-production.md`, « La règle de remplacement ») : workflow créé, essayé à
blanc, comparé à l'ancien. Les pas 4 (ancien code coupé) et 5 (drapeau vérifié) attendent Benj : section « Avant la bascule ».
Juge : `scripts/apres-chantier-n8n-qa.mjs` (hors ligne). Garde commune : `scripts/n8n-specs-qa.mjs`.

## Ce que fait l'ancien code (à refaire, rien de plus)

`tourApresChantier` (`lib/apresChantierTour.ts:29-55`), appelé par le cron Vercel de 8 h UTC (`vercel.json`, `/api/cron/relances`) dans
`app/api/cron/relances/route.ts:309-344`, jamais sous pause générale (`:313`), drapeau `crmApresChantier` (`lib/flags.ts:199`, levé) :
- comptes qui ont coché « Demander un avis » ou « Proposer l'entretien » (`crm_apres_chantier`, 0165), offre qui porte `crm`
  (`peut(plan, 'crm')` : Signature, Entreprise) ou fondateur ;
- chantiers TERMINÉS, à leur date de fin RÉELLE, finis depuis 3 ans au plus (`ENTRETIEN_ANS_MAX`) ;
- règle pure `propositions` (`lib/apresChantier.ts:131-160`) : avis 2 jours après la fin (jamais avant aujourd'hui), seulement si la fin est
  au plus 14 jours avant l'activation ; entretien si un équipement est reconnu (chaudière 12 mois, pompe à chaleur 24, conduit de fumée 12 :
  `EQUIPEMENTS`, `:95-99`), 15 jours avant le prochain anniversaire à venir ; clés `avis:<chantier>` et `entretien:<chantier>:<n>` ;
- au plus 20 rappels par compte et par passage, les plus proches d'abord (`MAX_POSES_PAR_PASSAGE`) ;
- pose par `upsert` dans `crm_rappels` (conflit `artisan_id,cle`, doublons ignorés), `origine = 'systeme'`. **Il n'envoie rien.**

## Le workflow (n8n d'Oracle, id `18cmxK4gy1ceqFYD`, INACTIF)

Chaîne : `Déclencheur 8 h` (tous les jours, 8 h 00, fuseau du workflow `Europe/Paris`) → `Contexte du passage` (jour de Paris, copie figée
des constantes) → six lectures HTTP `GET` (exécutées une fois, paginées par 1 000, identifiant « Supabase account ») → `Rappels a poser`
(la règle, en code pur) → `Poser les rappels (simulation)` (les lignes de l'upsert, **non écrites** : `ecrit: false`). Branche d'erreur :
`Échec du passage` → `Message d echec` (aucune donnée lue, aucun envoi). Aucun nœud d'envoi : aucun pied (`PIED_APRES` ne sert qu'à un envoi).

| Lecture | Objet | `select=` | Filtres | Droits |
|---|---|---|---|---|
| Lire pause generale | `rpc/n8n_pause_generale` (**à créer**) | `pause_generale` | — | proposé plus bas |
| Lire reglages | `crm_apres_chantier` | `artisan_id,avis,entretien,actif_depuis` | `or=(avis.eq.true,entretien.eq.true)` | 0189:53 |
| Lire comptes | `artisans` | `id,plan,is_founder` | `id=in.(…)` | 0189:40 |
| Lire chantiers | `chantiers` | `id,artisan_id,statut,date_fin_reelle` | `artisan_id=in.(…)`, `statut=eq.termine`, `date_fin_reelle=gte.<jour − 36 mois>` | 0189:45 |
| Lire signaux | `apres_chantier_signaux` (**vue à créer**) | `artisan_id,chantier_id,equipement,oppose` | `artisan_id=in.(…)` | proposé plus bas |
| Lire cles | `crm_rappels` | `id,artisan_id,cle` | `artisan_id=in.(…)`, `or=(cle.like.avis:*,cle.like.entretien:*)` | 0189:51 |

Aucun nom, aucune adresse, aucun e-mail, aucun texte libre n'est lu (« Ce que n8n lit », plan §0 bis ; 0189:8 exclut aussi `titre` et
`objet`). D'où la vue : l'ancien code reconnaît l'équipement dans le titre du chantier, l'objet du devis et ses désignations
(`route.ts:318-331`) ; la vue rend seulement le CODE de l'équipement et un booléen d'opposition.

## Comparaison (pas 3) — même données, même résultat, ou l'écart écrit

Le juge donne les mêmes données fictives à `tourApresChantier` (doublure qui rejoue les requêtes de la route) et aux nœuds Code de l'export
(rejoués dans un contexte vm), sur 16 cas et trois instants (dont 23 h 30 UTC, déjà le lendemain à Paris). Une seule source de vérité : les
écarts sont rejoués PAR L'ANCIEN CODE sur les données ajustées ; toute autre différence rougit. Écarts écrits :

- **É1 — le texte du rappel ne porte plus le nom du client.** n8n ne lit pas `client_nom` : « Demander un avis à le client » au lieu de
  « … à <nom> ». C'est le repli exact de l'ancien code quand le nom manque (`lib/apresChantier.ts:139`), faute de français comprise.
  Pour retrouver le nom sans que n8n le lise : la pose passe par une fonction en base qui remplit le texte (option 1 de « Avant la bascule »).
- **É2 — un chantier dont le client s'est opposé (0171) n'a plus de rappel.** L'ancien code ne lit pas l'opposition à la pose (seul l'envoi
  la vérifie, `decisionEnvoiApres`, `:170`). Pire : la route d'opposition retire les rappels encore ouverts du chantier
  (`app/api/crm/apres-chantier/opposition/route.ts:43-44`) et le passage suivant REPOSE l'entretien (clé disparue). Cas du juge
  « opposition posée depuis la demande d'avis ». n8n ne pose rien : correction voulue, jamais un rappel qui ne pourra pas partir.
- **É3 — le jour et l'heure.** L'ancien passage tourne à 8 h UTC (9 h ou 10 h à Paris) ; n8n à 8 h Paris. Le jour calculé est le même
  (Paris des deux côtés), et 8 h Paris reste avant le passage du matin des rappels du cron : sa notification les compte toujours.
- **É4 — un chantier absent de la vue des signaux n'a aucun rappel** (doute : rien), au lieu d'être traité sans équipement.
- **É5 — une lecture en erreur arrête tout le passage** (branche d'erreur), au lieu de sauter le seul compte fautif ; rien n'est posé ce
  jour-là, le passage du lendemain rattrape (clés idempotentes). La variable Vercel `PAUSE_GENERALE=1` (`lib/agents/pause.ts:15`) n'arrête
  plus ce passage : seul l'interrupteur en base (`ops.pause_generale`) le fait ; illisible ou absent, il vaut « pause » (comme l'ancien).

Constats sur l'ancien code, rendus à l'identique (non corrigés ici, `lib/**` hors périmètre) : le motif de la pompe à chaleur est sensible
à la casse (`lib/apresChantier.ts:97` : « Pompe à chaleur » avec majuscule n'est pas reconnu, « PAC » l'est) ; l'ordre des chantiers
n'est pas fixé par la requête (`route.ts:318`), ce qui rend le choix des 20 arbitraire à échéance égale — n8n trie par identifiant.

## Avant la bascule

Rien n'est publié, rien n'est écrit, aucune migration n'est faite par cette tâche. Ce que Benj décide, dans l'ordre :

1. **Les écarts É1 à É5** : les accepter tels quels, ou demander la pose par fonction en base (option 1 ci-dessous), qui supprime É1.
2. **Migration (« go » écrit de Benj, `migration-production.md` ; écrite et essayée à sec par la session principale)** — objets lus par n8n,
   proposés ici, à ajouter aussi aux droits de `n8n_lecture` (0189) :
   ```sql
   -- La pause générale, lisible en GET (ops_interrupteur, 0097:314, est STABLE mais rend un scalaire : pas de select=).
   create or replace function public.n8n_pause_generale() returns table (pause_generale boolean)
   language sql stable security definer set search_path = ops, public, pg_temp as $$
     select coalesce((select i.actif from ops.interrupteurs i where i.nom = 'pause_generale'), true)  -- absent : pause (doute)
   $$;
   revoke all on function public.n8n_pause_generale() from public, anon, authenticated;
   grant execute on function public.n8n_pause_generale() to service_role;

   -- Les signaux d'un chantier terminé : le CODE de l'équipement et l'opposition du client, jamais le texte ni l'adresse.
   create or replace view public.apres_chantier_signaux as
   select c.artisan_id, c.id as chantier_id,
     case when t.textes ~* 'chaudi[eè]re' then 'chaudiere'
          when t.textes ~ 'pompe\s+[àa]\s+chaleur|\mPAC\M' then 'pompe_a_chaleur'          -- sensible à la casse, comme le code
          when t.textes ~* 'ramonage|po[êe]le|chemin[ée]e|insert\M|conduit de fum' then 'conduit_de_fumee'
          else null end as equipement,
     exists (select 1 from public.crm_apres_opposition o where o.artisan_id = c.artisan_id
             and d.client_email is not null and btrim(d.client_email) <> ''
             and o.empreinte = left(encode(sha256(convert_to(lower(btrim(d.client_email)), 'UTF8')), 'hex'), 32)) as oppose
   from public.chantiers c
   left join public.devis d on d.id = c.devis_id and d.artisan_id = c.artisan_id
   cross join lateral (select concat_ws(' \n ', c.titre, d.objet,
     (select string_agg(left(l.designation, 200), ' \n ') from public.devis_lignes l where l.devis_id = d.id)) as textes) t
   where c.statut = 'termine';
   revoke all on public.apres_chantier_signaux from anon, authenticated;
   grant select on public.apres_chantier_signaux to service_role;
   ```
   Avant de la coller : l'essai à sec rejoue sur ces SQL les textes des 16 cas du juge (les motifs POSIX de Postgres et ceux de JavaScript
   diffèrent aux bords : `\b` contre `\m`/`\M`, `trim()` contre `btrim`, casse des lettres accentuées) ; le juge simule aujourd'hui la vue
   par `equipementDe` lui-même, il ne prouve pas la traduction SQL.
3. **L'écriture par n8n** : 0189 pose que n8n n'écrit jamais en base. Option 1 (recommandée) : une fonction `crm_poser_rappels_apres(p_lignes
   jsonb)`, security definer, qui revalide chaque ligne (type, clé, chantier du même compte, terminé, non opposé), remplit le texte avec le
   nom du client côté base (fin de É1) et insère `on conflict (artisan_id, cle) do nothing`. Option 2 : un nœud d'écriture direct dans
   `crm_rappels`. Dans les deux cas, la garde commune (`n8n-specs-qa`, R5 : lectures GET seulement) doit recevoir une exception déclarée et
   testée pour ce seul nœud ; tant qu'elle n'existe pas, le nœud `Poser les rappels (simulation)` reste une simulation.
4. **Avant toute publication** : la section « Lectures de n8n sur le serveur Oracle » de `docs/registre-traitements.md` (P3:570) ;
   l'identifiant d'alerte (Slack `#presti-auto` ou Telegram) pour la branche d'erreur ; la sauvegarde des exécutions réussies coupée
   (fiche méthode n8n, point 9 : n8n garde sinon chaque exécution 14 jours).
5. **Passage d'ombre (recommandé)** : publier la version en simulation quelques jours ; chaque matin, comparer ses `lignes` aux rappels
   que le cron a posés (`crm_rappels`, `origine = 'systeme'`, `cree_le` du jour) ; tout écart hors É1-É5 arrête la bascule.
6. **Pas 4 — couper l'ancien appel** : dans `app/api/cron/relances/route.ts:313`, un drapeau neuf de `lib/flags.ts` (par exemple
   `apresChantierParN8n`) qui saute `tourApresChantier` quand il est levé ; le code reste en place (réversible : on rebaisse le drapeau).
   Ordre conseillé : publier l'écriture dans n8n, constater un passage réussi, PUIS couper l'appel du cron — la clé `(artisan_id, cle)`
   rend le chevauchement d'un jour sans effet, alors qu'un trou perdrait un jour de rappels.
7. **Pas 5 — vérifier le drapeau** : `crmApresChantier` gouverne toujours l'écran et les routes ; le workflow en porte une copie
   (`drapeau_crmApresChantier`, contrôlée par le juge, C4) : baisser `crmApresChantier` impose de dépublier `presti-apres-chantier` le même jour.
