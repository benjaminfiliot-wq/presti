# Offre de Presti : ce qu'on peut dire, et sous quel drapeau

Créée le 2026-09-29. Statut : proposée, à approuver par Benj avec la voix et les lignes.

## La promesse

Un site d'artisan fait pour lui, et une maquette offerte. **Seulement quand le drapeau qui l'ouvre est levé.** Un drapeau se lit
dans `lib/flags.ts` le jour de la publication, jamais dans cette page : elle donne l'état relevé, pas l'état courant.

| Ce qu'on dit | Drapeau qui l'ouvre | État relevé le 2026-09-29 dans lib/flags.ts | Conséquence |
|---|---|---|---|
| Le site vitrine à la demande, prix affiché par le produit | `siteCommandeVente` | levé (décision de Benj du 25/09, commentaire du fichier) | un texte de fait peut le citer (fait `site-sur-mesure`) |
| Un achat du site sans compte | `siteAchatPublic` | baissé | ne pas en parler |
| La maquette offerte sur demande entrante | `prospectsEntrant` | absent du fichier | ne pas en parler ; à créer par une fiche 026 |
| « Commente SITE » sur Instagram et Facebook | `aimantSite` | absent du fichier | la phrase d'appel ne part pas (le juge du Crieur la refuse : `aimant_en_trop`) |

Si un drapeau change, le registre des promesses est relu avant la publication suivante.

## Les faits autorisés

La liste fermée est `lib/crieur/faits.ts` : chaque fait porte son texte exact, sa preuve et, s'il y a lieu, son drapeau.
Chaque fait a sa ligne, avec date de preuve, drapeau requis et verdict Laya, dans le
[registre des promesses](registre-promesses.md). Un chiffre qui n'y figure pas n'est pas autorisé.

Chiffres autorisés, et leur source : les trois relances à 2, 5 et 10 jours (lib/relances.ts, `CADENCE_RELANCES`, fait `relances`) ;
le prix du site à la demande, écrit par le produit lui-même (lib/siteCommande.ts, `PRIX_SITE_TEXTE`, fait `site-sur-mesure`) ;
« une minute » dans la phrase complète du fait `reponse-rapide`. Aucun autre chiffre d'offre.

## Ce que Presti ne promet pas

- Aucun résultat client : aucun n'est prouvé (source de la fiche, « Ce que je ne promets pas »).
- Aucune vente rattachée à une ligne « avec certitude » : c'est une estimation (voir `../mesure/README.md`).
- Ni WhatsApp ni réseaux sociaux comme canaux du produit : drapeaux baissés, promesse 22 de `plans/promesses.md`.
- Ni TVA facturée : franchise en base, article 293 B du CGI, promesse 7 de `plans/promesses.md`.
- Aucune publicité payante.

## Réserves à garder dans la voix

Deux preuves de `plans/promesses.md` portent une réserve honnête : la résiliation réelle (promesse 4) se verra au premier abonné ;
les e-mails partent encore de l'adresse de l'entreprise (promesse 9). Ne pas étendre ces promesses au-delà de leur preuve.
