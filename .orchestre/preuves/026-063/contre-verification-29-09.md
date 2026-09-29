# 026-063 — contre-vérification du chef avant application de 0111 (29/09)

Lecture entière de `supabase/migrations/0111_acquisition_envoi.sql` tel que livré par Codex (tour 4, `resultat.patch`
du 29/09 08:14, 487 lignes), puis lecture de la production (MCP Supabase `execute_sql`, projet gorcdvmueakcncsmrouo,
lecture seule). Quatre attaques.

## Attaque 1 — un second verrou d'accord, incompatible avec celui déjà en production : DÉFAUT, corrigé

Codex a lu la section « Correction du 27/09 » de la fiche (accord individuel de Benj avant tout envoi) et l'a
réimplantée dans 0111 : table `ops.accords_envoi`, colonne `ops.envois.attend_accord_benj boolean default true`,
déclencheurs `garde_accord_envoi` (refus `ops:accord_absent` à l'entrée en `approuve` ou `envoye` sans ligne
`ops.accords_envoi`), `annuler_accord_retouche`, `annuler_accords_envoi` (sur `ops.interrupteurs` et `ops.opposition`),
la fonction `acq_accord_envoi_poser`, et un `update ops.envois set statut='annule' where statut='approuve'`.

Or cette correction est **déjà faite, et en production**, par 026-034 (fiche en `fait/`) dans 0099 : lu en base,
`ops.garde_envois` porte le statut `attend_accord_benj`, la table `ops.accords_benj` (24 h au plus, consommé une fois
à l'entrée en `approuve`, annulé par une pause, une opposition ou la sortie de l'attente) et le refus `ops:accord_perime`
à la consignation.

Appliquer 0111 telle quelle aurait mis deux verrous indépendants sur le même geste de Benj : la station (026-074) pose
un accord dans `ops.accords_benj`, et `garde_accord_envoi` refuse quand même l'approbation faute de ligne dans
`ops.accords_envoi` — qu'aucune route n'écrit, et que `acq_accord_envoi_poser` n'accepte même pas pour un envoi en
`attend_accord_benj` (elle ne prend que `prepare` ou `approuve`). Résultat : plus aucun envoi possible dès le 12/10,
canal `essai_e2e` compris (l'épreuve de bout en bout 026-163 aurait échoué). Et une règle écrite à deux endroits.

**Correction (dans le périmètre de la fiche)** : tout ce bloc est retiré de 0111 ; l'en-tête dit où vit l'accord.
Le contrôle vérifie désormais l'absence du second verrou (`absence:second-accord` : ni `ops.accords_envoi`, ni la
colonne `attend_accord_benj`, et `ops.accords_benj` présente). Jumeaux régénérés (`sql-nu.mjs … --controle`,
vérifiés équivalents). Le juge `disjoncteurs-qa` ne teste pas l'accord (DJ-1 à DJ-11) : sa couverture reste entière.

## Attaque 2 — ce que l'application change dans la base vivante : rien d'observable

Avant application : `ops.envois` vide (aucun statut), interrupteurs `pause_generale=false`, `envoi_froid=false`.
`acq_palier_appliquer()`, appelée en fin de migration, réécrit `quotas_canaux` exactement aux valeurs déjà en base
(formulaire_site 0/0 froid fermé, email_sollicite 50/0, reponse_privee 50/0, messagerie 100/0) ; `essai_e2e`, instagram,
facebook, linkedin ne sont pas touchés. Aucune table, fonction ni déclencheur 0111 n'existait (aucun `if not exists`
qui masquerait un schéma plus ancien).

## Attaque 3 — références mortes dans les corps plpgsql (non validées à la création) : aucune

Existence vérifiée en base de tout ce que les corps lisent : `public.acq_envois_du_jour(text,text)`,
`ops.couts(le, montant_eur)`, `ops.curseurs(nom, maj_le)`, `ops.reponses(classe, envoi_id)`,
`ops.prospects(froid, siren, domaine)`, `ops.evenements(agent, type, resume, le)`,
`ops.interrupteurs(motif, change_le, change_par)`, `ops.quotas_canaux.maj_le`,
`public.sites_commandes(matiere, domaine, etat, cree_le)`, `public.artisans.is_founder`, colonnes de `ops.envois`
(technologie, modele_id, texte, verdicts, envoye_le, destinataire, empreinte_texte). `public.crieur_posts` n'existe
pas : `acq_jauges` le teste par `to_regclass` avant l'`execute`. Contrainte de `ops.evenements.type`
(`^[a-z_]{2,40}$`) : tous les types écrits la respectent.

## Attaque 4 — droits et interactions de déclencheurs : conformes

Chaque fonction `public.acq_*` : `security definer`, `search_path` fixé, `revoke` à public/anon/authenticated,
`grant` au seul service_role ; `ops.maintenant`, `ops.garde_modeles`, `ops.suivre_technologies`,
`ops.acq_commande_du_prospect` : exécutables par aucun rôle ; tables : RLS, aucune politique, `revoke all` y compris
service_role (les fonctions definer les lisent). Déclencheurs ajoutés sur `ops.envois` : `garde_modeles` (before, refuse
seulement l'entrée en `approuve` d'un modèle suspendu) et `suivre_technologies` (after, n'écrit que
`ops.technologies`) ; ils ne modifient pas la ligne et ne contredisent pas `garde_envois` ni `garde_fenetre_meta`.
Essai à sec : `anon` refusé en 42501 sur `acq_signal`.

## Verdict

Un défaut réel (attaque 1), corrigé dans le périmètre ; essai à sec rejoué sur la migration corrigée (empreinte
00d33f981a2f…, 13/13, rien ne reste — `essai-a-sec.txt`). Application autorisée.
