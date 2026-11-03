# 036-036 — six départements : branchement et preuve

État du 03/11/2026. **Le dépôt est préparé et son juge hors ligne est vert ; les six chaînes n8n ne sont pas prouvées en production.** Le connecteur `n8n-oracle` est absent de cette session et le navigateur n'a pas d'hôte accessible. Aucune version n8n n'a été publiée ici, aucun banc n'a été exécuté ici, aucune carte réelle n'a été observée. Les fichiers `.orchestre/preuves/036-036/noeuds/` sont des **sources préparées**, pas des exports publiés. Le vérificateur de l'orchestre, le typage et le build restent à lancer par la session principale selon le prompt de tâche.

## Contrat app → Cerveau → carte

Les faits de l'app passent par `lib/evenements/ecrivain.ts` : UUID d'objet, dates, nombres, booléens et codes seulement ; clé `(artisan_id, cle)` idempotente ; échec et délai borné sans interrompre la route. Le relevé du matin (`lib/evenements/departements.ts`) lit les seuls comptes dont `tous` est en marche en palier simulation ou ombre, avec limites de lecture ; il ne décide ni n'envoie. Toutes les écritures sont derrière `actif('systemeAgents')`. L'aiguillage et la fabrication de cartes **préparés localement** sont dans `noeuds/aiguiller.js`, `preparer-lectures.js`, `cartes.js` ; ils maintiennent `simulation: true`, l'offre et les deux interrupteurs, et laissent le palier réel fermé.

| Département | Fait de l'app | Lecture et carte attendues en ombre | Exécution n8n / carte observée |
|---|---|---|---|
| Devis | `devis_a_preparer` après création du brouillon et de ses lignes (`app/api/devis/route.ts`) | Devis et lignes du même compte ; carte « devis prêt à relire », prix à relire dans l'app. | **À prouver** : aucun ID d'exécution ni carte dans cette session. |
| Suivi | `relance_due` après les contrôles du cron et la prise atomique de la relance (`app/api/cron/relances/route.ts`) | Lead du même compte, rang, registre lu, pause ; carte de relance seulement si le chef dispose des contrôles de conflit nécessaires. Le STOP reste `null` tant qu'il n'a pas été lu : aucun faux « non opposé ». | **À prouver**. Le STOP inconnu peut faire s'abstenir le chef : ne pas déclarer le département opérationnel avant un essai positif. |
| Facturation | `impaye_echu` à J+3, J+10 ou J+21, facture émise non payée ; montant calculé en centimes dans l'app | Facture, réglages d'opt-in et arrêts du même compte ; carte d'impayé ou abstention motivée. | **À prouver**. |
| Après-chantier | `chantier_termine` à fin réelle + 2 jours, sur fenêtre de 3 jours | Chantier et réglages d'avis/entretien ; opposition lue via son empreinte ; carte de demande d'avis ou abstention. | **À prouver**. |
| Opérations | `stock_sous_le_seuil`, quantité agrégée du stock par article, une clé par article et jour | Article du même compte ; carte de commande à confirmer, sans prix inventé. | **À prouver**. |
| Direction | `page_du_matin`, une clé par compte et jour de Paris | Impayés, devis envoyés, demandes et cartes du même compte ; page du matin sourcée. | **À prouver**. |

Le juge local `node scripts/evenements-departements-qa.mjs` rejoue les six types, les quatre constats du matin sur des données fictives, l'aiguillage et six cartes sourcées ; il voit ses sept mutants, dont les deux routes bloquantes. Cela démontre les contrats locaux, **pas** que les workflows publiés portent ce code. Sa sortie est dans `.orchestre/preuves/036-036/qa-hors-ligne.txt`.

## Essais réels à faire par la session principale

Sur un **compte de test jetable**, avec `tous` et les six départements en ombre, laisser `simulation: true`. Chaque ligne exige : événement en `evenements_metier`, passage de `presti-cerveau`, exécution du chef, carte `assistant_actions` d'origine `agent` avec `sources`, événement marqué traité, `effets_faits: []`, zéro envoi. Rejouer le même passage et vérifier qu'aucune deuxième carte n'apparaît. Effacer le compte de test selon la procédure de la session principale.

1. **Devis** : créer par l'app un devis fictif de deux lignes. Vérifier `devis_a_preparer` puis la carte Devis.
2. **Suivi** : déposer une demande fictive en statut `repondu`, sans main prise, et une relance due de rang 1 ; vérifier le registre et l'opposition avant de conclure. Le cron de production envoie normalement des relances : employer exclusivement un banc ou un environnement isolé sans transport sortant.
3. **Facturation** : émettre une facture fictive avec échéance dépassée de trois jours, non payée, sans litige ; rejouer le relevé du matin et lire la carte Facturation.
4. **Après-chantier** : terminer un chantier fictif avec fin réelle deux jours avant le relevé ; activer l'avis, vérifier l'opposition et la carte Après-chantier.
5. **Opérations** : fixer un seuil d'alerte fictif au-dessus du stock total, rejouer le relevé ; vérifier la carte de commande à confirmer.
6. **Direction** : rejouer le point du matin avec les lectures fictives des autres départements ; vérifier la page sourcée.

Pour chaque essai, conserver l'export publié du workflow, son ID/version et l'exécution du banc dans `.orchestre/preuves/036-036/` avant d'écrire « prouvé ». Publier les enfants d'abord, puis `presti-cerveau`. Aucun palier réel, aucun envoi, aucune porte simulation levée.

## Données publiques gratuites

Vérifié le **03/11/2026** sur les pages officielles. Une seule API est branchée dans cette tâche : le [calendrier des jours fériés](https://www.data.gouv.fr/dataservices/jours-feries), via son [JSON métropole](https://calendrier.api.gouv.fr/jours-feries/metropole.json). Accès ouvert, sans clé dans la requête ; la page ne publie pas de quota chiffré. Données : jours fériés du code du travail pour la métropole ; les fêtes locales ou professionnelles n'y figurent pas. Le contrôle calendaire fait uniquement un GET public, sans donnée de compte, et garde les relances dues quand le jour est férié ou la réponse indisponible. La métropole est une limite explicite : vérifier la zone du compte avant de généraliser ce filtrage à l'outre-mer.

L'[API Recherche d'entreprises](https://recherche-entreprises.api.gouv.fr/docs/) est ouverte sans clé ; sa documentation indique 7 requêtes/s/IP et 30 requêtes/s/ASN, un `429` avec `Retry-After`, et l'absence des entreprises non diffusibles. Données : entreprises, associations et services publics français issus de la base de recherche publique. **Non branchée** : aucun SIREN de client ne doit être envoyé sans cas d'usage précis et contrôle des données. L'[API Adresse BAN](https://adresse.data.gouv.fr/outils/api-doc/adresse) était gratuite et ouverte, mais sa page officielle annonçait la décommission de `api-adresse.data.gouv.fr` pour fin janvier 2026 ; le nouveau service de géocodage Géoplateforme est limité à 50 appels/IP/s. Données : adresses françaises de la BAN, actualisées deux fois par semaine. **Non branchée** : la tâche ne doit pas pointer vers l'ancien hôte ni transmettre une adresse de chantier tant que le nouvel endpoint et la minimisation ne sont pas vérifiés.
