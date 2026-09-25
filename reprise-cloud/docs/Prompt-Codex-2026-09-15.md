# Prompt de relais pour Codex (ou Antigravity) — 15/09/2026, 23 h 15

> À coller tel quel. Tout l'historique est dans `SaaS/Produit/Session-2026-09-15-Lestraque-Vague-5.md` (sections « Réserves », « Relais », « Journal des actions »).

---

Tu reprends le travail de Claude Code sur Presti (dépôt `C:\Users\benja\Documents\presti`, vault `C:\Users\benja\Documents\SaaS`).

**Avant tout**, lis :
- `AGENTS.md` ;
- `.orchestre/contexte.md` ;
- `SaaS/Produit/Session-2026-09-15-Lestraque-Vague-5.md` en entier.

**Journal.** À chaque action terminée, ajoute une ligne datée au « Journal des actions » de cette note.

**Règles absolues**
- Aucune donnée inventée.
- Aucun secret recopié ni affiché.
- Aucune suppression définitive (la corbeille seulement).
- Aucun `git reset/restore/checkout/stash/clean`.
- Un juge génère toujours dans une copie, jamais le site en place.
- Si un juge échoue pendant que d'autres tournent, relance-le machine calme avant de conclure.
- **Commits.** Avant chaque commit :
  - l'index est vide au départ ;
  - le total fait moins de 5 Mo ;
  - aucun PNG ni MP4 de travail.
- **Après chaque push** : `node scripts/deploiement-etat.mjs` jusqu'à READY, puis vérifie en ligne avec curl.

## 1. Profil téléphone de la démo Lestraque (021-17) — FAIT ET EN LIGNE (c6a0d5b, READY 23 h 14) : ne rien refaire

> 23 h 20 : vérification officielle PASS, captures regardées par Claude Code, mise en ligne lancée par Claude Code. Vérifie seulement la dernière ligne du « Journal des actions » de la note de session : si le déploiement est READY, ne refais rien de cette section. Les consignes ci-dessous ne servent que s'il a échoué.

- Vérification officielle lancée à 23 h 03 : `.orchestre/travail/021-17-officiel.log` ; preuves dans `.orchestre/preuves/021-17/juge/`.
- **Si la dernière ligne est ✓ PASS :**
  1. Regarde `heros-t25.jpg`, `heros-t50.jpg`, `citation-cover35.jpg`, `eclate-cover50.jpg` et le film `tel-avant-apres.mp4`.
  2. Lance `node .orchestre/travail/livrer-familles.mjs recit,video,survol,eclate,telephone`.
  3. Commite `public/sites-demo/_kit/familles/telephone.css`, `public/sites-demo/_kit/da.json`, les fichiers régénérés de `public/sites-demo/lestraque/` (`git add -u`) et `scripts/telephone-qa.mjs`.
  4. Pousse, déploie, vérifie en ligne.
- **Si FAIL :** corrige seulement `telephone.css` selon les critères en échec (fiche `.orchestre/file/021-17.md`), relance `node scripts/telephone-qa.mjs`, puis fais les étapes du PASS.

## 2. Test de mutation du juge `scripts/eclate-qa.mjs` (réserve 2 de la note)

- Fais tourner le juge sur une **copie** de la famille `eclate`, grâce à son option `--demos`, avec `--sauter=lighthouse,ec16`.
- Chaque mutation doit faire échouer le critère indiqué :

| Mutation | Doit échouer |
|---|---|
| M1 `html.no-js .eclate__rendu{clip-path:inset(50%)}` | EC-2 |
| M2 clip-path animé sur `.eclate__etiquette` | EC-9 |
| M3 `circle()` dans `eclate-volet` | EC-9 |
| M4 fiche à `opacity:0` à C1 | EC-2 |
| M5 page sans `span.eclate__fiche` mais avec le clip-path | EC-9 |
| M6 pastille décalée de 60 px au téléphone | EC-6 |

- **Témoin :** la copie non mutée ne montre aucun échec sur EC-2, EC-6 ni EC-9.
- **Si une mutation passe :** corrige le juge sans assouplir aucun seuil, puis rejoue.
- **Commit :** `scripts/eclate-qa.mjs` et le rapport, dans `.orchestre/preuves/021-05/mutations.md`.

## 3. Vérifications officielles à rejouer, machine calme

- `node scripts/orchestre.mjs verifier 021-20` : la note Lighthouse de 93 avait été obtenue sous charge.
- `node scripts/orchestre.mjs verifier 021-02`.
- Note les deux verdicts dans `.orchestre/decisions.md`.

## 4. Mails aux 166 artisans

- **État à 23 h 10 :** 54 brouillons Gmail créés, listés dans `SaaS/Prospection/emails-artisans/brouillons-2026-09-15.md`. Il reste 112 adresses.
- **Destinataires :** uniquement la clé `retenues` de `SaaS/Prospection/emails-artisans/liste-validee.json`.
- **Texte et règles :** `SaaS/Prospection/Email-artisans-2026-09-15.md`, recopiés exactement :
  - la salutation ;
  - la ligne « stop » ;
  - un destinataire par mail ;
  - environ une minute entre deux envois.
- **Envoi :**
  1. Crée les brouillons manquants, sans jamais doubler une adresse déjà au journal.
  2. Envoie depuis le Gmail de Benj (benjaminfiliot@gmail.com).
  3. Vérifie chaque envoi dans « Messages envoyés ».
  4. Note-le dans `SaaS/Prospection/emails-artisans/envois-2026-09-15.md`.
  5. Si Gmail freine ou bloque, arrête-toi et note où.

## 5. Ménage de la boîte Gmail

- **État :** requête `category:promotions -is:starred` traitée jusqu'à la page 3, journal `SaaS/Prospection/corbeille-gmail-2026-09-15.md`.
- **Reprendre :** la suite de promotions, puis `category:social -is:starred`, `category:forums -is:starred`, `category:updates -is:starred`, puis les envois automatiques de la boîte principale (newsletter, noreply, notification).
- **Méthode :** corbeille uniquement, jamais de suppression définitive.
- **À garder :**
  - les fils où Benj a écrit ;
  - les vraies personnes ;
  - l'administratif : banque, impôts, URSSAF, INPI ;
  - les factures et paiements : Stripe, Vercel, Supabase, domaine ;
  - la sécurité de compte de moins de 7 jours ;
  - les clients et artisans.
- En cas de doute, garde. Note chaque page traitée.

## 6. Série 2 des publications (Facebook et Instagram)

- **État :** 10 brouillons Publora créés le 15/09 (pub-11, 12, 14, 15, 16, variantes A Facebook et B Instagram). Les parutions sont prévues du 23/09 au 02/10.
- **Contraintes Publora (formule Starter) :** 3 publications programmées à la fois, horizon de 7 jours. Rien n'est programmable avant le 16-17/09.
- **Programmer**, depuis `presti/`, à partir du 16/09 :
  `node scripts/publier-serie.mjs --maitre=plans/publications-serie-2.md --programmer`
  Relance au fil de l'eau pour ne jamais dépasser 3 programmées.
- **Journal :** note chaque parution dans `presti/plans/journal-publications.md`.
- **Prévenir Benj** de chaque heure de parution : il poste lui-même le premier commentaire dans la minute.

## 7. Ménage de l'orchestre

- Les fiches déjà livrées et restées dans `.orchestre/file/` ne doivent pas être relancées : 020-03, 021-03, 021-06, 021-13.
- Verrous morts dans `en-cours/` : 021-02, 021-14, 021-15, 021-18, 021-22.
- 022-01 et 022-05 appartiennent à une autre session : ne pas y toucher.
- Termine par `node scripts/orchestre.mjs digest`.
