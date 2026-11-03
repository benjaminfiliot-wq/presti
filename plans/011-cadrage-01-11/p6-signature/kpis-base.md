# Les KPIs du prompt 6 : la base de départ de chacun (§ 1.6) — requêtes en lecture

Écrit le 03/11/2026 par Claude Code. **Aucune de ces requêtes n'a été jouée** : l'hôte d'agents n'a pas de base, et jouer sur la production demande l'accord de Benj
(`securite.md`). Ce sont des requêtes `select` seules, à passer par la session principale (ou par Benj) **une fois, avant d'allumer quoi que ce soit**, pour
fixer le « avant ». Un KPI sans base de départ ne prouve rien : « +40 % » n'a de sens que contre un chiffre relevé avant.

## Règles de lecture (communes)

- **Zéro donnée personnelle dans le résultat** : on compte et on additionne, on ne sort ni nom, ni e-mail, ni message. Aucune ligne de `messages.contenu`, `leads.nom_prospect` ou `leads.contact` ne figure dans un `select`.
- **Un compte, ou l'ensemble sans les démos** : chaque requête a un paramètre `:compte` (`artisan_id = :compte`) ; pour la base globale, remplacer ce filtre par `artisan_id in (select id from public.artisans where not est_demo)`. Les comptes `est_demo` sont exclus de tous les chiffres (`CLAUDE.md`, « Tests et preuves »).
- **Fuseau Europe/Paris** pour tout ce qui parle de soir et de week-end.
- **Fenêtre** : `:debut` et `:fin` (30 jours glissants par défaut). Une base sur 3 jours ne vaut rien ; viser 30 jours, noter le nombre de demandes (`n`) à côté de chaque chiffre.
- **Argent en centimes, calculé par la base ou le code**, jamais recalculé à la main (`total_ht` est en euros dans `devis`, `numeric` : multiplier par 100 seulement pour comparer à `montant_centimes`).
- **Limites des données, dites avant le chiffre** : `devis.envoye_le` et `devis.accepte_le` n'ont **pas de rattrapage** avant la date d'écriture par le code (`0170_devis_dates_statut.sql`, en-tête : « Rattrapage … AUCUN », non appliquée à ce jour) ; une date nulle est comptée à part, jamais devinée. `factures.payee_le` est nulle pour les factures payées avant `0140`.
- Les requêtes nommées **[après 0185]** ou **[après 0193]** ne tournent qu'une fois la migration collée ; leur base de départ est « non mesurée » jusque-là, et ce document le dit plutôt que d'inventer.

## 1. Délai médian de première réponse

Première réponse = premier message sortant (`sens = 'out'`) après le premier message entrant (`sens = 'in'`) d'une demande.

```sql
with premiere as (
  select l.id as lead_id, l.artisan_id,
         min(m.sent_at) filter (where m.sens = 'in')  as premier_in,
         min(m.sent_at) filter (where m.sens = 'out') as premier_out
  from public.leads l join public.messages m on m.lead_id = l.id
  where l.artisan_id = :compte and l.created_at >= :debut and l.created_at < :fin
  group by l.id, l.artisan_id)
select count(*)                                                        as demandes,
       count(*) filter (where premier_out is not null)                  as repondues,
       percentile_cont(0.5) within group (order by extract(epoch from (premier_out - premier_in)))
         filter (where premier_out >= premier_in)                       as mediane_secondes,
       percentile_cont(0.9) within group (order by extract(epoch from (premier_out - premier_in)))
         filter (where premier_out >= premier_in)                       as p90_secondes
from premiere where premier_in is not null;
```

Limite : `messages.sens = 'out'` couvre aussi les réponses de l'IA et celles que l'artisan envoie à la main ; la base est donc le délai **tous auteurs**. Pour séparer, `messages.modele`
(colonne ajoutée par les migrations de la boîte) est non nul quand le modèle a rédigé : à relire en base avant de s'en servir.

## 2. Part des demandes du soir et du week-end répondues en moins de 5 minutes

Soir : avant 8 h ou à partir de 19 h, heure de Paris. Week-end : samedi et dimanche (`isodow in (6, 7)`).

```sql
with premiere as (  -- même CTE qu'au § 1
  select l.id as lead_id, min(m.sent_at) filter (where m.sens = 'in') as premier_in, min(m.sent_at) filter (where m.sens = 'out') as premier_out
  from public.leads l join public.messages m on m.lead_id = l.id
  where l.artisan_id = :compte and l.created_at >= :debut and l.created_at < :fin group by l.id),
hors_heures as (
  select *, (premier_in at time zone 'Europe/Paris') as local
  from premiere where premier_in is not null)
select count(*) as demandes_soir_weekend,
       count(*) filter (where premier_out is not null and premier_out - premier_in <= interval '5 minutes') as repondues_en_5_min,
       round(100.0 * count(*) filter (where premier_out is not null and premier_out - premier_in <= interval '5 minutes') / nullif(count(*), 0), 1) as pour_cent
from hors_heures
where extract(isodow from local) in (6, 7) or extract(hour from local) < 8 or extract(hour from local) >= 19;
```

## 3. Taux demande → devis → signé

```sql
select count(distinct l.id)                                                          as demandes,
       count(distinct d.lead_id) filter (where d.envoye_le is not null or d.statut in ('envoye','accepte','refuse','expire')) as avec_devis_envoye,
       count(distinct d.lead_id) filter (where d.statut = 'accepte')                  as avec_devis_signe,
       count(*) filter (where d.statut = 'accepte' and d.accepte_le is null)          as signes_sans_date   -- à lire à part (limite 0170)
from public.leads l left join public.devis d on d.lead_id = l.id and d.artisan_id = l.artisan_id
where l.artisan_id = :compte and l.created_at >= :debut and l.created_at < :fin;
```

Les taux sont les rapports `avec_devis_envoye / demandes` et `avec_devis_signe / avec_devis_envoye`. Un devis sans `lead_id` (créé à la main) n'entre pas : le dire à côté du chiffre.

## 4. Euros de devis relancés puis signés (la relance précède la signature)

Une relance n'est créditée que si elle **précède** la signature (`rapport_hebdo_organisation` applique déjà cette règle côté lecture : « une relance n'est créditée que si elle précède la signature »). Base de départ sur `relances` (par demande) :

```sql
select count(distinct d.id)                        as devis_signes_apres_relance,
       coalesce(sum(d.total_ht), 0)                as euros_ht_signes_apres_relance
from public.devis d
join public.relances r on r.lead_id = d.lead_id and r.envoyee
where d.artisan_id = :compte and d.statut = 'accepte' and d.accepte_le is not null
  and d.accepte_le >= :debut and d.accepte_le < :fin
  and r.planifiee_le < d.accepte_le;
```

Et le dénominateur honnête : les euros de devis **relancés** (qu'ils aient signé ou non) :

```sql
select count(distinct d.id) as devis_relances, coalesce(sum(d.total_ht), 0) as euros_ht_relances
from public.devis d join public.relances r on r.lead_id = d.lead_id and r.envoyee
where d.artisan_id = :compte and d.envoye_le >= :debut and d.envoye_le < :fin;
```

Limite : avant le registre de 3 jours (`lib/relancesRegistre.ts`), une relance de devis ne laissait pas toujours une ligne dans `relances` ; la base est un **plancher**, jamais un plafond. Ne pas en tirer un « gain » : on mesure l'écart plus tard contre ce plancher.

## 5. Délai moyen de paiement et euros d'impayés récupérés

```sql
-- Délai de paiement : émission → jour de paiement (Europe/Paris, posé par le déclencheur de 0140)
select count(*)                                                  as factures_payees,
       avg(f.payee_le - f.date_emission)                         as delai_moyen_jours,   -- date - date = jours
       percentile_cont(0.5) within group (order by (f.payee_le - f.date_emission)) as delai_median_jours
from public.factures f
where f.artisan_id = :compte and f.statut = 'payee' and f.payee_le is not null
  and f.payee_le >= :debut and f.payee_le < :fin;

-- Impayés en cours (jamais relancés ou relancés) et échéances dépassées
select count(*) as factures_echues_non_payees, coalesce(sum(f.total_ttc), 0) as euros_ttc_echus
from public.factures f
where f.artisan_id = :compte and f.statut = 'emise' and f.date_echeance < current_date;

-- Récupérés : payées APRÈS au moins une relance d'impayé envoyée
select count(distinct f.id) as factures_recuperees, coalesce(sum(f.total_ttc), 0) as euros_ttc_recuperes
from public.factures f join public.relances_impayes ri on ri.facture_id = f.id and ri.statut = 'envoyee'
where f.artisan_id = :compte and f.statut = 'payee' and f.payee_le is not null and ri.envoyee_le::date <= f.payee_le
  and f.payee_le >= :debut and f.payee_le < :fin;
```

Limite : `relances_impayes` n existe qu après `0159` ; avant, aucune relance d'impayé automatique n'a laissé de trace.

## 6. Avis obtenus après chantier

**Non mesurable aujourd'hui, et le dire.** Il n'y a pas de table d'avis dans les migrations, et l'API des avis Google n'est pas accordée (décision 3 : la demande d'accès est
rédigée, pas envoyée). Les demandes d'avis préparées ou validées, elles, laisseront une trace après `0185` :

```sql
-- [après 0185] demandes d'avis proposées par l'après-chantier, par statut ; la clé d'un fait « avis:<chantier> » est unique par compte
select o.statut, count(*) from public.opportunites o
where o.artisan_id = :compte and o.objet_type = 'chantier' and o.cle like 'avis:%'
  and o.cree_le >= :debut and o.cree_le < :fin group by o.statut;
```

Base de départ : **0 mesure fiable**. Le KPI « avis obtenus » ne se lit qu'avec l'accès à l'API ou un retour manuel de l'artisan (`apres-reputation-n8n-qa.mjs` : un avis collé ou transféré). On ne publie aucun chiffre d'avis avant.

## 7. Part des cartes validées sans retouche (qualité des agents)

```sql
-- [après 0185] décisions de l'artisan sur les cartes préparées
select count(*)                                                       as decisions,
       count(*) filter (where d.decision = 'valider')                  as validees_telles_quelles,
       count(*) filter (where d.decision = 'modifier_valider')         as validees_apres_retouche,
       count(*) filter (where d.decision = 'refuser')                  as refusees,
       round(100.0 * count(*) filter (where d.decision = 'valider') / nullif(count(*), 0), 1) as pour_cent_sans_retouche
from public.opportunites_decisions d
where d.artisan_id = :compte and d.decision in ('valider', 'modifier_valider', 'refuser');
```

Base de départ **avant 0185 : non mesurée** (la table n'existe pas). Pour l'assistant de gestion existant, `assistant_actions.statut in ('executee','refusee','annulee')` donne un proxy (`mode = 'confirmation'`) :
c'est une autre population (les actions de l'assistant, pas les cartes des départements) ; ne pas les additionner.

## 8. Coût IA par compte et par mois

```sql
-- [après 0193] en centimes, par département et par modèle ; externe = payant
select date_trunc('month', c.jour) as mois, c.departement, c.modele, c.externe,
       sum(c.appels) as appels, sum(c.jetons_entree) as jetons_entree, sum(c.jetons_sortie) as jetons_sortie, sum(c.cout_centimes) as centimes
from public.couts_ia_jour c
where c.artisan_id = :compte and c.jour >= :debut and c.jour < :fin
group by 1, 2, 3, 4 order by 1, 2;
```

Base de départ **avant 0193 : le coût des crédits IA existants** se lit dans le décompte des crédits (`lib/ai.ts`, `creditsMois` de `lib/plans.ts` : Studio 250, Signature 600) et non dans
cette table ; la comparer à `couts_ia_jour` serait comparer deux comptabilités. Noter le **nombre de crédits consommés par compte sur 30 jours** comme base, et le coût en euros seulement quand
Benj aura relevé le tarif du jour du fournisseur (aucun prix inventé ici).

## 9. Incidents : envois en double (cible zéro)

Aucun envoi en double ne doit exister. Les contraintes d'unicité en empêchent trois familles (`runbook.md` § 2) ; la requête cherche ce qu'elles ne couvrent pas — le même texte envoyé deux fois à la même demande en 10 minutes :

```sql
select m.lead_id, count(*) as envois_identiques_en_10_min
from public.messages m
where m.sens = 'out' and m.lead_id in (select id from public.leads where artisan_id = :compte)
  and m.sent_at >= :debut and m.sent_at < :fin
group by m.lead_id, md5(m.contenu), date_trunc('hour', m.sent_at) + floor(extract(minute from m.sent_at) / 10) * interval '10 minutes'
having count(*) > 1;
```

(La requête lit un condensé du texte, `md5`, sans le sortir.) Et les doubles que la base interdit mais que l'on veut voir passer :

```sql
select 'relance_impaye_meme_jour' as famille, count(*) from (
  select artisan_id, destinataire, jour from public.relances_impayes where artisan_id = :compte group by 1,2,3 having count(*) > 1) x
union all
select 'action_auto_meme_cle', count(*) from (
  select artisan_id, cle from public.actions_auto where artisan_id = :compte group by 1,2 having count(*) > 1) y;
```

Les deux doivent rendre 0 par construction (contraintes `unique`). Si l'une rend autre chose, **couper (`runbook.md` § 1.b) avant de comprendre**.

## 10. À relever avant d'allumer — la fiche à remplir (par compte volontaire)

| KPI | Valeur de départ | n (demandes, devis, factures) | Fenêtre | Limites relevées |
|---|---|---|---|---|
| Délai médian de première réponse (s) | | | | |
| Soir / week-end répondus en < 5 min (%) | | | | |
| Demande → devis envoyé (%) · devis → signé (%) | | | | devis sans `lead_id` ; signés sans date |
| € de devis relancés · € relancés puis signés | | | | plancher (§ 4) |
| Délai moyen de paiement (jours) · € d'impayés récupérés | | | | payées avant 0140 sans date |
| Avis obtenus | **non mesuré** | — | — | pas d'API, pas de table |
| Part de cartes validées sans retouche (%) | **non mesurée avant 0185** | | | |
| Coût IA (crédits / mois) | | | | autre comptabilité que `couts_ia_jour` |
| Envois en double | 0 attendu | | | |

Un chiffre de départ vide n'est pas rempli à la main ni deviné : « non mesuré » est une valeur honnête (`CLAUDE.md`, anti-fabrication).
