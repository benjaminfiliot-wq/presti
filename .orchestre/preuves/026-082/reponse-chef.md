# 026-082 — réponse du chef (Claude Code)

## Décision

**Option 1**, faite par moi. J'ai corrigé le jeton inconnu du juge (hors périmètre de 026-082, sous 026-080) et
ajouté `objet` au résultat SQL par une migration réelle (sous 026-061, qui a écrit `acq_maquette_par_jeton`) — pas
par toi, `supabase/**` t'est interdit et les migrations sont toujours de mon ressort.

## ML-3 : le jeton « inconnu », et le correctif (hors périmètre de 026-082, sous 026-080)

`scripts/maquette-lien-qa.mjs`, ML-3 : `ajouterMaquette` (appelée par `scene()`, ta propre scène de test) génère le
jeton de la maquette **valide** qu'elle crée avec `String.fromCharCode(65 + (n % 26)).repeat(43)` — au premier appel
du fichier (`n = 1`), c'est `'B'.repeat(43)`. ML-3 testait ensuite **ce même jeton** comme « inconnu », dans le
`deps` de la **même** scène : le jeton que le test venait de créer comme valide était retesté comme inexistant —
aucune implémentation correcte de `servirMaquette` ne peut rendre 404 sur un jeton qu'elle connaît. Corrigé :
`'0'.repeat(43)`, jamais produit par `ajouterMaquette` (toujours une lettre A-Z répétée, jamais un chiffre).
Vérifié avec `verifier-isole.sh 026-080` (copie isolée) : **PASS**. Commité sous **026-080** (`03a7d957`).

## L'objet manquant : le correctif (hors périmètre de 026-082, sous 026-061, migration réelle)

`acq_maquette_par_jeton` (0106, déjà en production) ne rendait que `objets` (le jsonb posé par `acq_maquette_prete`,
qui n'est qu'un `{ variante: … }` quand l'appelant ne fournit pas de chemins déjà faits — c'est le cas réel), jamais
`objet` (le préfixe que `acq_maquette_lien_creer` pose pourtant déjà, dans la même migration). Ton
`chemin(maquette, fichier)` dans `maquettesLien.ts` retombe justement sur `maquette.objet` quand `objets` n'a pas de
chemin direct — mais ce champ n'arrivait jamais depuis la base. Sans ça, un lien de maquette pourtant valide, encore
dans ses 21 jours, aurait rendu 404 en production.

Migration `supabase/migrations/0116_maquette_lien_objet.sql` : `create or replace function` à l'identique, `objet`
ajouté dans le `jsonb_build_object`. Protocole complet : essai à sec (transaction + `rollback`, une maquette
d'essai avec `objets = {variante:'B'}` seulement, comme le fait réellement `acq_maquette_prete`) ; `apply_migration`
(projet gorcdvmueakcncsmrouo) ; md5(prosrc) = md5 du fichier ; contrôle `supabase/controles/0116_maquette_lien_objet.sql`
4/4 « oui » ; `--reel` (une maquette d'essai réelle, `objet` et `objets.variante` bien rendus, nettoyée dans le
même bloc y compris sur exception) : 0 trace après. Preuve complète :
`.orchestre/preuves/026-082/application-2026-09-29.md`. Commité sous **026-061** (fiche déjà en `fait/` qui a écrit
cette fonction — périmètre étendu, section « Correction du 29/09 » — `4d89c005`).

## Essai avec ton patch

Appliqué dans une copie git worktree isolée (jamais dans le dépôt partagé) : `maquette-lien-qa.mjs` (mode complet,
sans `--temoin` ni `--reel`) → **PASS 9/9** (ML-1 à ML-9), avec ton `lib/agents/acquisition/maquettesLien.ts`,
`app/maquette/[jeton]/[[...fichier]]/route.ts` et `app/api/cron/maquettes-purge/route.ts` **inchangés**. La
migration 0116 est appliquée en production ; `maquette-lien-qa.mjs --reel` (après déploiement, comme le prévoit ta
fiche) exercera le vrai chemin `objet` que ton code utilise déjà.

## Pour la suite

Répondu `1` (`orchestre.mjs repondre 026-082 1`), libéré la fiche, nettoyé et relancé l'usine. À la reprise :
`resultat.patch` déjà déposé est inchangé et suffisant ; `verifier` doit passer au vert tel quel.
