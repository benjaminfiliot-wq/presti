# Audience : qui on veut atteindre, et ce qu'on ne collecte jamais

Créée le 2026-09-29. Statut : proposée, à approuver par Benj.

## La cible

Les artisans du bâtiment en France, 0 à 9 salariés (source de la fiche, §4 bis). Ils regardent leur téléphone tôt le matin, à midi
et le soir : **déduit, à mesurer**, pas un fait. Créneaux de départ proposés : 12 h 30 et 19 h, en alternance (déduit, à mesurer).
La boucle apprend ensuite le créneau le plus efficace par réseau.

## Ce qu'on mesure de l'audience

- Les visites de la vitrine par source et par campagne, par l'Audience maison : sans cookie et sans adresse IP, seulement la page
  et la minute (`lib/audience.ts`). Une campagne n'est retenue que si elle figure dans `CAMPAGNES` de ce fichier.
- Campagnes existantes au 2026-09-29 : `lot-20x20`, `demarchage-instagram`, `demarchage-facebook`, `demarchage-linkedin`,
  `bio-instagram`, `page-facebook`, `signature-email`, `salon`, `flyer`, `essai-e2e`.
- Une campagne par ligne éditoriale (L1 à L5) et par réseau est **à ajouter à `CAMPAGNES` avant toute diffusion** (fiche du
  mesureur, hors périmètre de cette mémoire). Tant qu'elle n'y est pas, la visite est comptée sans campagne, jamais avec une
  campagne inventée.
- TikTok et Instagram n'ont qu'un lien, en bio : la source d'une visite ne dit pas quelle ligne l'a amenée. Le code d'apport
  `tiktok` est à créer comme apporteur de canal (fiche du compte TikTok de Presti).

## Ce qu'on ne collecte jamais

- Aucun nom, pseudo, e-mail, téléphone, ville ou visage d'un artisan ou d'un prospect dans cette mémoire, un script de veille
  ou un journal. Les jeux d'essai emploient des personnes fictives et `@presti-test.invalid`.
- Aucune liste d'abonnés, aucune identification d'un visiteur passé.
- Aucune donnée nominative de veille au-delà de 30 jours.
- Aucune donnée d'artisan ou de prospect envoyée à une IA gratuite ou à un modèle `:cloud`. Une IA gratuite ne reçoit, si
  besoin, qu'un texte d'accroche anonymisé (sans nom, pseudo, ville ni visage) d'un compte qui **n'est pas** un artisan ; tout ce
  qui vient d'un artisan est un prospect possible.
- Windsor est relié à l'essai seulement : aucun agent ne s'en sert et aucun achat n'est fait tant que l'offre n'est pas prise.

## Sources

`lib/audience.ts` (`CAMPAGNES`), `lib/flags.ts` (drapeau `audience`), `docs/registre-traitements.md` (registre des
traitements), source de la fiche §4 bis.
