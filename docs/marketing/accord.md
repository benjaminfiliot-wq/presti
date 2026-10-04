# Le geste d'accord de Benj sur chaque publication (C14)

*Fiche 026-217. Code : `lib/contenu/accord.ts`. Règle R24 (accord explicite de Benj sur la version exacte de chaque publication) : **n'exige plus cet accord pour Instagram et Facebook** depuis la décision du 30/09, confirmée par Benj le 04/10 ; les contrôles automatiques de la ligne (`lib/contenu/lignes.ts`) le remplacent. Ce geste reste en vigueur pour le chemin TikTok (`scripts/contenu/publier-tiktok.mjs`) et pour la lecture des anciennes cartes.*

## Ce que Benj voit

Une carte dans **Attention** (la carte existante, aucune route ni carte nouvelle), déposée par `POST /api/agents/decisions` :

- question : « Publier ce post sur <canal> ? (<id>) » ;
- contexte : la ligne, le texte exact de tout ce que le public verra (texte, légende, sous-titres incrustés, miniature, description), le lien du film ;
- deux options : **Accorder** et **Refuser** ; le défaut est **Refuser** ;
- portée `securite` : la console redemande le mot de passe avant de trancher ;
- une échéance. Sans réponse à l'échéance, le bus applique le défaut : `refuser`. Rien ne part.

## Ce qui autorise une publication

Une seule chose : une décision `tranchee` (jamais `defaut_applique`, `ouverte` ou expirée), choix `accorder`, portée `securite`, dont la cible est **cette** publication et dont l'empreinte est celle de **cette** version du texte et du média. Seul un fondateur peut trancher (`ops_decision_trancher`, migration 0098) : « signée par Benj » est garanti par la base.

La clé de la décision est `contenu:post:<id>:<empreinte>`, l'empreinte étant celle de la version (texte visible + empreinte du média). Retoucher un mot, la légende, la miniature ou le fichier change l'empreinte : l'accord est caduc, une nouvelle demande s'ouvre.

## Ce qui n'autorise jamais

- l'accord d'un autre post (un accord pour A n'autorise pas B) ;
- une ancienne version du texte ou du média ;
- l'accord d'une première série ou d'une ligne éditoriale ;
- un score de Laya, un défaut appliqué, une échéance passée ;
- une pause générale ou une ligne suspendue (contrôlées avant, dans `lib/contenu/lignes.ts`).

## Avant de proposer l'accord

Chaque texte visible qui porte un chiffre ou une promesse chiffrée passe par `jev noul --provider laya` avec sa source, seuil 0,5. Sous le seuil, source absente ou Laya en panne : **aucune carte n'est déposée** et le cas revient à Benj avec son motif. Le score ne remplace jamais le geste.

## Fonctions

| Fonction | Rôle |
| --- | --- |
| `preparerDemandeAccord(post, echeance, deps)` | contrôle Laya puis rend le corps de la carte à déposer (ou un refus motivé) |
| `verdictAccord(decision, postId, version)` | l'accord lu au bus autorise-t-il CE post sur CETTE version ? fermé : tout manque refuse |
| `accordEncoreValable(decision, version)` | faux dès que la version a bougé |
| `cleAccord`, `empreinteVersion`, `versionAvecMedia` | la clé et l'empreinte de version |

Aucune publication réelle n'est un effet de ce module ni du juge (`node scripts/contenu-qa.mjs --partie=geste`).
