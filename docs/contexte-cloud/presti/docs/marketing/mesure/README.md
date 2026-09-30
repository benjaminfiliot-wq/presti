# Mesure : du contenu à la vente, sans se raconter d'histoire

Créée le 2026-09-29. Statut : proposée, à approuver par Benj. Le calcul est fait par du code (fiches suivantes), jamais par un
modèle ; cette page fixe le modèle de mesure.

## Quand on mesure

Trois fenêtres après chaque publication : **H+1, H+24, J+7**. On relève, quand le réseau les donne par une voie **officielle** :
vues, lectures complètes et temps moyen, enregistrements, partages, commentaires. Puis, côté Presti : visites par source et campagne
(Audience maison), demandes de maquette, ventes.

- **TikTok** : API officielle si elle s'ouvre, sinon relevé **à la main** par Benj ; jamais de lecture scriptée de Studio (CGU TikTok
  zone EEA §4.5, relevée le 2026-09-25).
- **Instagram et Facebook** : insights par l'API Graph, après R6. Pas de Windsor.
- **Donnée indisponible ou en erreur** : « non mesuré ». **Jamais un zéro, jamais un succès inventé.** Une API absente ne
  justifie pas non plus une publication.

## La carte : idée → publication → campagne → visite → demande → vente

| Étape | Ce qui l'identifie | D'où vient la donnée | Solidité |
|---|---|---|---|
| idée | l'identifiant de l'idée dans la file des idées | file des idées (fiche du schéma contenu) | exacte |
| publication | l'identifiant de la publication, sa ligne (L1 à L5), son réseau, son heure | table des publications (fiche du schéma contenu) | exacte |
| campagne | `utm_campaign` de la ligne, **si** elle figure dans `CAMPAGNES` (lib/audience.ts) | lien porté par la publication | exacte quand le lien existe ; TikTok et Instagram n'ont qu'un lien en bio, donc **pas de campagne par ligne** |
| visite | page d'entrée, source, campagne | Audience maison (sans cookie ni IP) | exacte pour la source, silencieuse sur la personne |
| demande | une demande de maquette ou de contact reçue | le produit | exacte, mais son origine n'est déduite que de la visite ou de l'heure |
| vente | une vente enregistrée | le produit | exacte ; son rattachement à une ligne est une **estimation** |

**Attribution à la ligne : une estimation.** Une demande ou une vente est rattachée à la ligne publiée juste avant, sur le même
réseau, **par fenêtre de temps** (déduit, à mesurer). Les visites par campagne et un code d'apport ne prouvent pas seuls qu'un post a
causé une vente. Tout texte qui l'écrit dit « estimation », et un chiffre de vente attribuée sans « estimation » est refusé.

## Ce qui décide

1. **Indicateur principal** : les demandes de maquette pour 1 000 vues, par ligne (source de la fiche). Puis les ventes. Les
   mentions « j'aime » ne décident rien.
2. **Seuils minimaux** : au moins 6 publications et 2 semaines par ligne avant toute décision. Sous ce seuil, la réponse est
   « insuffisant ».
3. **Sens sûr, automatique** : ralentir, suspendre, changer d'accroche dans une ligne approuvée. Une ligne sous le quart de la
   médiane pendant 2 semaines est suspendue et Benj reçoit une carte.
4. **Sens risqué, à Benj** : nouvelle ligne, nouveau réseau, nouvelle promesse, publicité payante.
5. Un classement (`jev score --provider laya`) garde sa provenance et ses mesures ; il **n'autorise** aucune publication et
   ne rédige rien. Les règles déterministes (licence, drapeau, accord, plafond, idempotence) priment.

Les valeurs de cette page qui ne viennent pas d'une mesure sont marquées « déduit, à mesurer » dans `../audience/README.md` et
`../lignes/README.md` ; aucune n'est un résultat.

## Rendre compte

Trois lignes dans le digest du matin (refaire, suspendre, tendance), les chiffres dans la réunion du soir (source de la fiche).
