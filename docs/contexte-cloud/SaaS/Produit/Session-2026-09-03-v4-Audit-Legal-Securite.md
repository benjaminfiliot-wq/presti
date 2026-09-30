# Session 2026-09-03 — v4 livrée, audit indépendant, existence juridique, mots de passe

> Suite de [[Session-2026-09-02-Refonte-v3-J1-J9]]. Chantier v4 sur prompt écrit
> (`presti/plans/003-presti-v4-plateforme-site-inventaire.md`), 13 chantiers, faits en
> autonomie et **vérifiés en production**. Puis un **audit indépendant** qui a trouvé des
> choses sérieuses — dont trois de mon fait. Presti reste live.

## Arbitrage Benj (avant de coder)

Canaux de messagerie = **route IMAP/SMTP** (option B) — pas d'API propriétaire par
fournisseur. Identifiants **chiffrés au repos** (AES-256-GCM, clé `CANAUX_KEY` en variable
d'environnement, jamais en base).

## Ce qui a été livré (v4)

Migrations **0037 → 0046**. Les grosses pièces :

- **Réglages du site** (`site_style`) — non-régression par construction : on n'écrit que ce
  qui diffère du défaut, donc un artisan qui n'ouvre jamais le mode avancé garde un site
  **octet pour octet identique**.
- **Prix et provenance** (`prix_artisan`) — chaque ligne de devis chiffrée par l'IA doit
  pouvoir dire d'où vient son prix. On **ne scrape pas les grossistes** (prix non publics +
  droit sui generis, art. L.342-1 CPI) : c'est l'artisan qui alimente son catalogue.
- **Inventaire** (stock, mouvements, listes d'achat, matériaux, postes types).
- **Facturation conforme** — factures **scellées à la création**, immuables par déclencheur,
  **jamais supprimables** (archivées). Export **Factur-X / CII EN 16931**, codes VATEX,
  recodification **CIBS** (CGI → CIBS au 01/09/2026, tolérance jusqu'au 31/12/2027).
- **Canaux email** (IMAP/SMTP chiffrés) — l'artisan branche sa vraie boîte.
- **Révocation de sessions réelle** (`lib/authArtisan.ts`, migrations 0042/0043).

## L'audit indépendant — 15 défauts, dont 3 de moi

Quatre relecteurs indépendants du code écrit, chacun sur son domaine, contre la **vraie
production**. Rapport complet : `presti/plans/audit-v4.md`. Tout corrigé le jour même,
rejoué par `scripts/audit-correctifs-e2e.mjs` (**19/19**, qui reproduit *exactement* les
attaques décrites).

Les trois plus graves :

1. **Les photos de chantier des clients étaient téléchargeables par n'importe qui** — bucket
   `lead-media` public depuis sa création. Des photos de domiciles privés, prises à
   l'intérieur. → bucket privatisé + liens signés d'une heure après vérification de propriété.
2. **« Fermer toutes mes sessions » ne fermait rien** — l'appel répondait 403, l'erreur était
   jetée en silence, le jeton de rafraîchissement survivait. Un jeton copié se refabriquait un
   accès **indéfiniment**, pendant que l'écran affichait « toutes vos sessions ont été fermées ».
3. **Aucune facture n'était scellée** — le scellement vivait dans une branche jamais empruntée.
   Avec le seul jeton du navigateur : montant modifiable, numéro modifiable, facture supprimable.

**La leçon, qui vaut au-delà de Presti :** le défaut n°2 avait été trouvé, corrigé et testé
le jour même — et le correctif ne marchait pas, parce que **mon test ne rejouait que le jeton
d'accès, jamais le jeton de rafraîchissement**. Un test qui ne vérifie que ce qu'on a pensé à
vérifier donne une fausse assurance, ce qui est **pire que pas de test** : on cesse de chercher.

## Existence juridique des surfaces de l'artisan

Le site et la plateforme livrés à l'artisan n'avaient **aucune existence juridique** — pas de
mentions légales, pas d'information RGPD au moment de la collecte.

- `/site/<slug>/infos-legales` : mentions **LCEN + RGPD** générées depuis ses données, dans sa
  marque, servies même site désactivé. Un champ manquant s'affiche « **non communiqué —
  information obligatoire** » : on **n'invente jamais** une mention.
- Information au moment de la collecte, sous le composeur.
- Champs manquants ajoutés aux Paramètres, avec un bandeau qui dit ce qui manque.
- **Médiateur de la consommation** (migration 0046).
- `scripts/legal-e2e.mjs` **30/30**.

## Mots de passe

- `lib/motDePasse.ts` : déni-liste **française** comprise (`azerty`, `soleil`, `chouchou`,
  `motdepasse`…), jauge de force, refus expliqué, erreurs GoTrue traduites (elles sortaient en
  anglais brut sur un produit français).
- **Mots de passe fuités** — la fonction « leaked password protection » de Supabase est
  **réservée au plan Pro**. Refaite maison avec l'API libre de **Have I Been Pwned**, en
  **k-anonymat** : seuls les 5 premiers caractères de l'empreinte SHA-1 quittent la machine, la
  comparaison finale est locale. Ni HIBP ni notre propre serveur ne peuvent savoir de quel mot
  de passe il s'agit — et c'est **testé**, pas promis. L'appel passe par `/api/auth/mdp-fuite`
  plutôt que depuis le navigateur, pour ne pas rouvrir la CSP resserrée par l'audit.
- **Un défaut que les quatre auditeurs avaient manqué** : `/api/auth/reset-confirm` n'exigeait
  que 8 caractères et n'appliquait **aucune** des règles de l'inscription. On se remettait
  `azerty12` en passant par « mot de passe oublié » — vérifié en prod, la route répondait
  `{"ok":true}`. **La porte de derrière était plus large que la porte d'entrée.** À retenir :
  une règle posée sur le chemin principal ne s'applique pas toute seule aux chemins de secours.
- `scripts/fuite-mdp-e2e.mjs` **25/25** · `motdepasse-e2e` **30/31**.

## Réglages Supabase (tableau de bord — hors dépôt)

Vérifiés **par leur effet**, pas en lisant une case : `node scripts/verif-supabase-reglages.mjs`.

1. ✅ Durée du jeton d'accès ramenée à **900 s** (15 min contre 60).
2. ❌ **Détection de rejeu des jetons de rafraîchissement** — Auth → Sessions. La rotation
   fonctionne (mesuré), mais l'ancien jeton survit : un jeton volé donne un accès parallèle
   invisible. **Seul point restant.**
3. ✅ Politique de mot de passe — **Authentication → Providers → Email → Minimum password
   length** (il n'existe pas de page « Passwords »). La protection HaveIBeenPwned native reste
   réservée au plan Pro, d'où l'implémentation maison ci-dessus.

## Constat honnête sur le parcours client (demandé par Benj)

Sur les cinq étapes classiques — *send agreement · remove payment friction · welcome document ·
client portal · remove buyer's remorse* : **deux solides, une à moitié, deux absentes.**

| | Presti → l'artisan | L'artisan → son client |
|---|---|---|
| Send agreement | ❌ | ✅ acceptation horodatée côté serveur, « Bon pour accord » au PDF |
| Remove payment friction | ✅ Stripe | ❌ **virement/IBAN seulement** |
| Welcome document | ❌ | ❌ |
| Client portal | — | ✅ liens magiques usage unique, sessions, conversation, photos |
| Remove buyer's remorse | ❌ | ❌ |

À corriger, par ordre proposé :

1. **Bordereau de rétractation** — absent (grep vide). Obligatoire pour un devis signé au
   domicile du client : 14 jours, art. L221-18 code de la consommation. **Porté par l'artisan.**
2. **Acceptation des CGU à l'inscription** — pas de case à cocher, aucune trace en base. Les
   CGU existent mais personne ne les a jamais acceptées. **Porté par Benj.**
3. **Acompte payable en ligne** par le client de l'artisan — c'est la friction qui coûte le
   plus cher : un acompte payable en trois clics se paie, un IBAN à recopier se paie « demain ».

## Reste ouvert (audit)

Accord de sous-traitance **art. 28 RGPD** · jeton en cookie `httpOnly` plutôt que
`localStorage` · atomicité des compteurs de limitation · **image de partage et favicon par
artisan** (carte cassée sur WhatsApp, favicon Presti dans l'onglet du client) · 404 douces sur
`/site/` et `/p/` · Factur-X Schematron + PDF/A-3.

## État

**v4 intégralement livrée et vérifiée en production.** Suite de vérification : `node
scripts/tout-verifier.mjs` (21 suites, ordonnées gratuit → navigateur → IA pour qu'un échec
bête ne se paie pas en appels au modèle). Cap inchangé : **acquisition**.
