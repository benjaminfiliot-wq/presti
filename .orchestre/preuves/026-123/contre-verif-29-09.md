# 026-123 — contre-vérification : 4 sabotages réversibles de la production du Journal

Écrit le 04/10/2026 par claude-code (le nom du fichier, `contre-verif-29-09.md`, est celui de la consigne).

## Méthode

- **Juge** : `node scripts/pilotage-ecran-qa.mjs --partie=fil` au **banc** (`--racine=<copie de la racine>`, sans `.env.local`, sans compte, sans réseau), graine fixe `35434315` ; mêmes critères FL-1 à FL-14 que le verdict officiel, sauf ce que le banc ne juge pas par construction (le typecheck de la racine réelle, FL-12).
- **Où l'on sabote** : jamais dans l'arbre de `presti` (ses fichiers `Attention.tsx`, `Barre.tsx`, `Equipage.tsx`, `Panneaux.tsx` et `Vues.tsx` portent des travaux non commités d'autres fiches), mais dans une **copie** de la racine hors du dépôt (`app/`, `lib/`, `proxy.ts`, `next.config.mjs`, copiés avec les trois fichiers de production du Journal à jour). Les fichiers de production n'ont donc pas bougé d'un octet : leur sha256 est donné ci-dessous.
- **Réversibilité** : sha256 du fichier de la copie avant ; une seule occurrence du texte remplacé exigée ; sabotage écrit ; juge joué ; octets d'origine réécrits (aucun `git restore`) ; sha256 relu : égal à l'origine dans les quatre cas.
- **Témoin** : sans sabotage, le même juge, la même graine, rend PASS (14 critères sur 14) : `verifier-banc-04-10.txt`.

## Résultat : 4 sabotages sur 4 pris, chacun par le critère attendu et par lui seul

| # | Fichier | Sabotage | Critère attendu | Verdict du juge | Pris ? | sha256 restaurée |
|---|---|---|---|---|---|---|
| 1 | `app/controle/station/Journal.tsx` | l'heure des bulles est écrite en UTC au lieu de Paris | FL-2 | FAIL — FL-2 | oui, seul | égale à l'origine |
| 2 | `app/controle/station/journal/Transmettre.tsx` | le bouton Transmettre s'active dès 2 signes (`MIN_SIGNES = 2`) | FL-5 | FAIL — FL-5 | oui, seul | égale à l'origine |
| 3 | `app/controle/station/Journal.tsx` | le fil redescend à chaque bulle nouvelle, même quand Benj est remonté (`const suivre = true`) | FL-9 | FAIL — FL-9 | oui, seul | égale à l'origine |
| 4 | `app/controle/station/journal/Transmettre.tsx` | un refus du serveur vide le champ (`setTexte('')` avant le message) | FL-6 | FAIL — FL-6 | oui, seul | égale à l'origine |

## Détail

### Sabotage 1 — Journal.tsx (FL-2)

- remplacé : `const HEURE = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour:`
- par : `const HEURE = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', hour:`
- sha256 d'origine : `4c610e1c1a805c7a45a819190f970631c4005a252cc74d968933b4ba9a547c05`
- sha256 sabotée : `7ef3907a17197ec6469d71d7820f0c98e3e62547e18524ec0b8fcb3aae4b9f09`
- sha256 après restauration : `4c610e1c1a805c7a45a819190f970631c4005a252cc74d968933b4ba9a547c05` (égale à l'origine)
- le juge : `pilotage-ecran-qa --partie=fil : FAIL — FL-2`
- cause relevée : « bulle 40 : heure de Paris 17:33 absente (« RECENSEUR 15:33 Recensé : 6 artisans (Lyon) ») », puis les bulles 41, 42… de même (deux heures d'écart l'été)

### Sabotage 2 — Transmettre.tsx (FL-5)

- remplacé : `const MIN_SIGNES = 3`
- par : `const MIN_SIGNES = 2`
- sha256 d'origine : `6c152fb747b71f846eb832777da65fe4b2ae60d95c69e14e7dd4e167b5cdf48e`
- sha256 sabotée : `2716b4a79f661f80ec31274426948cadf9ba3d9175fb3440e00e0690dca21a42`
- sha256 après restauration : `6c152fb747b71f846eb832777da65fe4b2ae60d95c69e14e7dd4e167b5cdf48e` (égale à l'origine)
- le juge : `pilotage-ecran-qa --partie=fil : FAIL — FL-5`
- cause relevée : « 2 signes : le bouton « Transmettre » est actif ; 2 signes rognés : le bouton « Transmettre » est actif »

### Sabotage 3 — Journal.tsx (FL-9)

- remplacé : `const suivre = forcerBas.current || etaitEnBas()`
- par : `const suivre = true`
- sha256 d'origine : `4c610e1c1a805c7a45a819190f970631c4005a252cc74d968933b4ba9a547c05`
- sha256 sabotée : `27065382b516cde0252b0d84b8d4ea92c192acfa82aa48a3ddc165b7adc9b538`
- sha256 après restauration : `4c610e1c1a805c7a45a819190f970631c4005a252cc74d968933b4ba9a547c05` (égale à l'origine)
- le juge : `pilotage-ecran-qa --partie=fil : FAIL — FL-9`
- cause relevée : « Benj remonté : une bulle nouvelle fait redescendre le fil (scrollTop 1966) ; « 1 nouvelle ↓ » n'apparaît pas »

### Sabotage 4 — Transmettre.tsx (FL-6)

- remplacé : `setStatut({ ok: false, message:`
- par : `setTexte(''); setStatut({ ok: false, message:`
- sha256 d'origine : `6c152fb747b71f846eb832777da65fe4b2ae60d95c69e14e7dd4e167b5cdf48e`
- sha256 sabotée : `1503493bbfeb6cad50c222cb024a4a769c7a113c7f886b28ca735ed7c965ac4b`
- sha256 après restauration : `6c152fb747b71f846eb832777da65fe4b2ae60d95c69e14e7dd4e167b5cdf48e` (égale à l'origine)
- le juge : `pilotage-ecran-qa --partie=fil : FAIL — FL-6`
- cause relevée : « refus 429 : le champ contient «  », le texte tapé « Soigner les maquettes de peintres · essai 429 » attendu » (400 et 403 de même)

## Production : intacte

sha256 des trois fichiers de production après les quatre passages (jamais touchés) :

- `app/controle/station/Journal.tsx` : `4c610e1c1a805c7a45a819190f970631c4005a252cc74d968933b4ba9a547c05`
- `app/controle/station/journal/Transmettre.tsx` : `6c152fb747b71f846eb832777da65fe4b2ae60d95c69e14e7dd4e167b5cdf48e`
- `app/controle/station/journal/journal.css` : `015ed25e58236ba961ffc5533e928885e11ba32ab01da58cc9127339d013b41c`

## Deux sabotages essayés, NON pris : une limite du juge, à connaître

Deux autres sabotages de la feuille ont été essayés avant le quatrième et le juge a rendu PASS (la copie a été restaurée, sha256 égale) :

1. `.mc-tel [data-transmettre] textarea { font-size: 16px; }` → `14px` : FL-8 mesure 16 px quand même, parce que `app/base.css` (ligne 66) force `font-size:16px!important` sur tout `textarea`, `select` et `input` sous 1024 px. La règle du Journal est donc redondante (voulue : elle ne dépend pas de `base.css`), et FL-8 ne peut pas la voir.
2. `min-height: 44px` → `30px` sur `.mc-jrn-envoyer` : le bouton reste ≥ 44 px au téléphone, parce qu'il s'étire à la hauteur du champ de saisie (`align-items: stretch`, champ de 59 px). FL-8 mesure donc 44 px et plus.

Aucun de ces deux sabotages ne retire une garantie que le juge devrait tenir : la propriété (police ≥ 16 px, bouton ≥ 44 px) reste vraie sans la règle sabotée. Ils sont notés pour qu'on ne croie pas FL-8 sensible à ces deux lignes.
