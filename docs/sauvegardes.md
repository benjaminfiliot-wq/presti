# Sauvegardes et restauration

> Écrit le 5 septembre 2026, après que l'audit final a constaté qu'aucune sauvegarde n'existait
> (auditeur F, majeur 12). Tout ce qui est décrit ici a été joué au moins une fois, ce jour-là.

## Ce qui est sauvegardé, et ce qui ne l'est pas

| | Où c'est | Comment on le retrouve |
|---|---|---|
| **Les données** (comptes, conversations, devis, factures, tarifs, inventaire…) | dans la sauvegarde chiffrée | `scripts/restaurer.mjs` |
| **Le schéma** (tables, contraintes, déclencheurs, politiques) | dans `supabase/migrations`, versionné dans git | on rejoue les migrations dans l'ordre |
| **Les fichiers** (photos de chantier, logos, réalisations) | dans la sauvegarde, avec `--fichiers` | le manifeste dit s'ils y sont |
| **Les mots de passe des artisans** | nulle part — Supabase ne les rend pas | après une restauration, chacun réinitialise le sien |

Une restauration complète, c'est donc **les migrations + la sauvegarde**. L'une sans l'autre ne
suffit pas. C'est aussi pour ça que le dépôt git compte autant que la base.

## La clé : à mettre à l'abri aujourd'hui

Les sauvegardes sont chiffrées avec une clé publique (`cle-sauvegarde.pub.pem`, versionnée, sans
secret). Seule la clé privée les ouvre :

```
cle-sauvegarde.key.pem
```

Elle n'est **pas** dans git (elle est dans `.gitignore`) et elle n'est pas régénérable. Mets-la
dans ton gestionnaire de mots de passe **et** sur une clé USB rangée ailleurs que ton bureau.
Perdre cette clé, c'est perdre toutes les sauvegardes — c'est le prix du fait que le serveur qui
sauvegarde chaque nuit ne peut pas relire ce qu'il écrit.

## Ce qui tourne tout seul

`.github/workflows/sauvegarde.yml`, chaque nuit à 3 h 40 (heure de Paris, l'été) :

1. copie complète, fichiers compris, chiffrée ;
2. relecture du manifeste (sans la clé privée : on vérifie que le fichier est bien formé) ;
3. dépôt en artefact GitHub, gardé 30 jours.

GitHub ne détient que du texte chiffré. Si le pas échoue, l'exécution rougit et GitHub prévient
par email — c'est le signal à ne pas ignorer.

## À la main, quand tu veux

```bash
node scripts/sauvegarde.mjs --fichiers
```

Écrit `sauvegardes/<horodatage>.presti`. Fais-le avant toute opération risquée : une migration
inhabituelle, une purge, un changement d'offre Supabase.

## Relire, comparer, restaurer

```bash
node scripts/restaurer.mjs --lire sauvegardes/2026-09-05T13-34-08-905Z.presti
node scripts/restaurer.mjs --comparer sauvegardes/2026-09-05T13-34-08-905Z.presti
node scripts/restaurer.mjs --aller-retour sauvegardes/2026-09-05T13-34-08-905Z.presti
node scripts/restaurer.mjs --restaurer sauvegardes/…​.presti --artisan <uuid>
```

- `--lire` déchiffre et montre ce qu'il y a dedans, table par table.
- `--comparer` met la sauvegarde en face de la base vivante. Un écart **négatif** (moins de
  lignes vivantes que sauvegardées) veut dire que des données ont disparu : regarde tout de suite.
- `--aller-retour` est la preuve : il crée un compte de test, l'efface, le restaure, et vérifie
  que tout est revenu à l'identique. Joue-le de temps en temps ; une sauvegarde qu'on n'a jamais
  restaurée n'est pas une sauvegarde.
- `--restaurer --artisan <uuid>` est le cas réel : un compte effacé par erreur. Il recrée le
  compte d'authentification (mot de passe aléatoire, à réinitialiser) puis ses lignes.

## Le sinistre complet : quoi faire, dans l'ordre

1. Créer un nouveau projet Supabase, noter l'URL et les clés, les mettre dans `.env.local` et sur Vercel.
2. Rejouer **toutes** les migrations de `supabase/migrations` dans l'ordre, dans l'éditeur SQL.
3. `node scripts/restaurer.mjs --lire <la sauvegarde la plus récente>` pour vérifier qu'elle s'ouvre.
4. Restaurer artisan par artisan (`--restaurer --artisan`), en commençant par les comptes qui ont des factures.
5. Prévenir chaque artisan qu'il doit réinitialiser son mot de passe.
6. Vérifier avec `node scripts/tout-verifier.mjs`.

## Les limites, dites franchement

- La sauvegarde est **quotidienne** : au pire, on perd une journée d'activité. Une perte nulle
  demanderait la restauration à un instant précis (offre Supabase payante) — c'est une décision
  de coût, pas un problème technique.
- L'artefact GitHub est gardé **30 jours**. Pour une conservation plus longue, télécharge
  périodiquement une sauvegarde et range-la avec la clé.
- Les fichiers de stockage sont embarqués en clair dans l'archive chiffrée : quand ils
  dépasseront quelques dizaines de mégaoctets, il faudra les sortir de l'archive et les
  sauvegarder à part.
- GitHub héberge donc, chiffrées, des données personnelles de clients d'artisans : il figure à ce
  titre dans la liste des sous-traitants de la politique de confidentialité.

## Le code et l'arbre de travail

`node scripts/instantane-quotidien.mjs --pousser` fige le code suivi et les fichiers non suivis
sans toucher à la branche courante, à l'index réel ou aux fichiers. L'arbre comprend ce que
`.gitignore` n'écarte pas. Sans `--pousser`, l'instantané reste local. Le dépôt privé de
sauvegarde reçoit uniquement ce commit sur une branche `instantane-AAAA-MM-JJ` ; un second
passage le même jour crée une branche suffixée par l'heure de Paris. L'envoi a lieu uniquement
quand cette commande est lancée sur le PC : PC éteint, rien ne part.

Le script exclut les `.exe`, les fichiers de plus de 90 Mo, les fichiers `.env`, les clés et
jetons détectés, ainsi que les fichiers contenant une donnée de prospect répertoriée dans le
vault. Ces exclusions évitent de transférer des exécutables, des fichiers refusés par GitHub,
des secrets et des données personnelles. Plus de 20 exclusions interrompent l'envoi. Chaque
passage est consigné dans `.orchestre/travail/sauvegardes.jsonl`.

Pour récupérer un fichier d'une branche sauvegardée :

```bash
git fetch https://github.com/benjaminfiliot-wq/presti-sauvegarde.git instantane-AAAA-MM-JJ
git show FETCH_HEAD:<chemin>
```
