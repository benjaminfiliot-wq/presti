# Autonomie — ce qui part seul, ce qui attend une validation

Décision de Benj du 01/11/2026 (addendum §5), et offres de `lib/plans.ts`.
Pourquoi : vault `C:/Users/benja/Documents/SaaS`, liens à créer (phase 1.4) :
`10 Presti/04 Décisions/ADR-005 — Prospection e-mail automatique.md`,
`10 Presti/04 Décisions/ADR-006 — Vidéos et carrousels, validation initiale puis auto.md`.

## Le principe : TOUT est automatique par défaut
- Prospection e-mail : automatique, sans validation de Benj (plafonds et garde-fous : `email-brevo.md`).
- Devis, factures, relances, inventaire, réponses clients : automatiques selon les règles
  de l'abonnement (plus bas).
- Carrousels : publication automatique après les 2-3 premiers validés.

## Seule exception : vidéos motion design ET carrousels
- Les 2-3 PREMIÈRES vidéos motion design produites : validation de Benj obligatoire.
- Les 2-3 PREMIERS carrousels produits : validation de Benj obligatoire.
- Une fois ces 2-3 premiers validés par Benj :
  - le système considère le format comme validé ;
  - les vidéos et carrousels suivants sont publiés automatiquement ;
  - Benj peut toujours les consulter a posteriori ;
  - aucune validation n'est plus requise, sauf anomalie détectée par la QA.

## Passage d'un format en automatique
- Après 2-3 validations positives consécutives sur un format donné, ce format passe
  en publication automatique.
- La QA automatique continue de tourner sur chaque contenu.
- Si la QA détecte une anomalie, le contenu repasse en validation humaine.

## Les règles de l'abonnement — `lib/plans.ts` fait foi
- Deux offres vendues : Studio et Signature (`lib/plans.ts:11-15`). L'Essentiel n'est plus vendu ;
  son identifiant reste reconnu pour les comptes hérités (`lib/plans.ts:12-13`, `:97`).
- **Studio prépare, l'artisan valide.** « Tout est automatisé, mais il faut valider, sinon ça ne
  s'envoie pas » (`lib/plans.ts:11`). Réponses, devis, relances et assistant de gestion sont préparés ;
  rien ne part sans un clic de l'artisan (`lib/plans.ts:63`, `:73-74`, `:98`, `:206`).
- **Signature envoie seul.** La réponse aux demandes, les relances de conversation et d'impayés
  partent seules : `plateforme.ia.auto`, `relances.auto`, `factures.relances.auto` (`lib/plans.ts:79-80`).
  Dans le code, la réponse ne part seule qu'en mode « auto » (défaut « assistée », plus bas) et les impayés
  qu'une fois la case cochée (opt-in, `lib/plans.ts:67`).
  S'y ajoutent les règles, les automatisations de « Mes chiffres », le CRM (`lib/plans.ts:81-86`).
- **Pilote automatique** (Signature seulement) : une action préparée part seule après 10 minutes
  d'annulation possible, type par type (`lib/plans.ts:87-89`, `lib/pilote/regles.ts`).
- Même en Signature : jamais un prix estimé ni un paiement sans l'artisan (`lib/plans.ts:207`, `:266`).
- Mode de réponse : défaut « assistée » (`lib/plateformeConfig.ts:45`). `modeEffectif` sert
  « assistée », motif `verrou_offre`, si l'offre n'a pas `plateforme.ia.auto` (`lib/plateformeConfig.ts:183-185`).
- Un verrou d'offre passe toujours par `peut(plan, capacite)`, jamais par un `plan === 'studio'`
  en dur (`lib/plans.ts:130-136`).
- Une ligne de la grille n'apparaît que si la fonctionnalité existe : drapeau de `lib/flags.ts`
  (`lib/plans.ts:5-7`).
- Essai sans carte : Studio 7 jours, Signature 21 (`lib/plans.ts:108`).

## Ce qui attend encore Benj
- Toute autre action irréversible : voir `securite.md`.
