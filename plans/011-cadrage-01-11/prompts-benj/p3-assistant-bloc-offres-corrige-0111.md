# Prompt 3 (assistant) — bloc « Grille tarifaire » corrigé par Benj, 01/11/2026 vers 18 h 06

Recopié tel quel depuis le message de Benj. Il remplace le bloc des offres du prompt 3 (`p3-assistant.md`).

## Grille tarifaire — 3 offres

### Offre 1 : Studio
- Systèmes complexes n8n inclus.
- Automatique avec validation.
- L’IA prépare, l’artisan valide avant envoi.
- Devis, factures, relances, inventaire.
- Capacité : plateforme.ia.auto à partir de Studio.

### Offre 2 : Signature
- Systèmes complexes n8n inclus.
- Tout automatique.
- L’IA exécute sans validation systématique.
- Journal complet, garde-fous, règles de blocage.
- CRM standard Presti, workflows n8n standards.

### Offre 3 : Entreprise sur mesure
- Systèmes complexes n8n inclus, comme les autres.
- CRM entièrement adapté à l’entreprise : champs, processus,
  rôles et interface sur mesure.
- Automatisations n8n adaptées uniquement à eux :
  workflows custom, intégrations spécifiques à leurs outils
  (CRM existant, ERP, inventaire, Slack, e-mail).
- Disponible dans l’offre Signature : même niveau d’autonomie,
  mais avec un CRM et des workflows entièrement personnalisés.
- Prix sur devis — pas de prix public.
- CTA : « Demander une démo » / « Parler à l’équipe ».

Règle : l’offre Entreprise sur mesure n’est pas un niveau d’autonomie
différent. C’est le même moteur (n8n + Hermes + Orca), mais avec un CRM
et des automatisations entièrement adaptés à l’entreprise cliente.
Disponible dans l’offre Signature.

## À trancher au plan du chantier de l'assistant (relevé par Claude Code, rien n'est changé)

- « Capacité : plateforme.ia.auto à partir de Studio » contredit le code : `lib/plans.ts:79-80` réserve
  `plateforme.ia.auto` à Signature, et `.claude/rules/autonomie-abonnements.md` dit « Studio prépare, l'artisan
  valide ». Ce bloc dit aussi, pour Studio, « L'IA prépare, l'artisan valide avant envoi ». La ligne vient
  probablement de l'ancien `CLAUDE.md` (« envoi autonome vendu à partir de Studio, `lib/plans.ts:44` »), faux
  depuis le 25/10. À confirmer avec Benj avant d'y toucher.
- L'offre « Entreprise sur mesure » n'existe pas dans `lib/plans.ts` (deux offres vendues, `lib/plans.ts:11-15`).
