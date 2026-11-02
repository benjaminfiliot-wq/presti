# Chantier 4 : rapport des lots L1 (sécurité S1 à S5) et L2 (offre Entreprise), 02/11/2026

Plan suivi : `plans/011-cadrage-01-11/chantier-4-assistant-plan.md` (§3, §14). Rien n'est commité ni poussé à l'heure de ce rapport.
Toutes les suites ont été jouées hors ligne, une à la fois ; aucune n'a touché la production.

## Ce qui est fait

| Brèche ou lot | Correctif | Fichiers | Preuve |
|---|---|---|---|
| S1 : le « fait tout seul » exécutait encaissement, facture, suppression et lot de prix, même sur une question | `estQuestion`, `faitToutSeul` exige `question === false` ; gestes §3.2 toujours en carte (`OUTILS_JAMAIS_AUTO`, + `creer_facture_libre`, `supprimer_article`) | `lib/assistant/cadrage.ts`, `lib/assistant/actions-serveur.ts`, `lib/pilote/regles.ts` | `securite-assistant-0211-qa` (A), mutants vus ; `assistant-tout-qa` corrigé : ses 5 assertions encodaient la brèche |
| S2 : « Tout auto » envoyait un devis à prix estimé | `prixSources` sur les lignes RELUES du devis créé ; sinon brouillon et notification qui dit pourquoi | `lib/reglesServeur.ts` | même suite (B1 à B7), mutant B7 vu |
| S3 : le pilote ne relisait pas l'escalade au départ | `MOTS_ESCALADE_TOUJOURS`, `sujetEscalade`, relecture des 10 derniers messages entrants | `lib/pilote/{regles,file,executeur}.ts` | même suite (C), `pilote-qa` |
| S4 : quatre chemins de relance, aucun registre commun | `lib/relancesRegistre.ts` (neuf) : dossier de l'objet (devis, conversation, factures du devis), traces des 4 chemins, décision pure à 3 jours, lecture en erreur = refus. Branché sur l'assistant (proposition ET réalisation), le pilote (`dejaRelance`, qui avalait les erreurs), la route du CRM (après le débit d'une minute), les impayés (`relanceAilleurs`, raison `deja_relancee_ailleurs`), le cron de conversation (la relance reste due) | `lib/relancesRegistre.ts`, `lib/assistant/actions-serveur.ts`, `lib/pilote/executeur.ts`, `app/api/crm/relances/envoyer/route.ts`, `lib/relancesImpayes{,Tour,Magasin}.ts`, `app/api/cron/relances/route.ts` | `relances-registre-qa` (neuf, au lanceur) ; `relances-impayes-qa` gagne le cas |
| S5 : l'acompte d'une règle s'émettait seul à l'acceptation, sans verrou d'offre | verrou `plateforme.regles` dans `acompteApresAcceptation`. Décision de Benj (Q-S5) : l'artisan choisit, facture émise seule (par défaut, comme avant) ou préparée et émise d'un clic (maillon `acompte_seul`, `acompteALAcceptationDuDevis`). Écran : la case grisée hors offre, plus le choix | `lib/reglesServeur.ts`, `app/api/conversation/devis/route.ts`, `lib/regles.ts`, `app/plateforme/Automatisations.tsx` | `securite-assistant-0211-qa` (B8 à B14), mutants B13 (verrou retiré) et B14 (choix ignoré) vus |
| L2 : « Presti pour l'entreprise » | Signature à l'identique + `organisation.membres`, sur devis, hors tunnel et hors grille ; un contrat `metadata.plan = 'entreprise'` l'emporte sur le montant (99 € = Signature) | `lib/plans.ts`, `lib/abonnementSync.ts`, `lib/quotaMedia.ts`, `app/parametres/SectionAbonnement.tsx` | `offres-affichage-qa` (empreintes : Studio, Signature, tunnel, essais, promesse, grille inchangés), `essais-gratuits-qa` (EG-3l, mutant vu), `crm-qa` (B7, B8) |

## Sorties des suites (02/11, dans l'ordre joué)

| Suite | Résultat |
|---|---|
| `offres-affichage-qa` | 286/286 |
| `essais-gratuits-qa` | 42 réussis, 0 échoué (dont la mutation Entreprise) |
| `assistant-tout-qa` | 120 PASS, 0 FAIL |
| `assistant-qa` | 310 PASS, 0 FAIL |
| `pilote-qa` | 88 verts, 0 rouge |
| `securite-assistant-0211-qa` | 68 PASS, 0 FAIL (après le choix de l'acompte) |
| `relances-registre-qa` (neuf) | 44 PASS, 0 FAIL (6 paires dans les 2 sens, 3 mutants vus) |
| `relances-impayes-qa` | 217/217 |
| `crm-qa` | 216 verts, 0 rouge |
| `crm-lot2-qa` (partie hors ligne), `crm-lot4-qa`, `crm-assistant-panneau-qa` | 46, 30 et 63 verts, 0 rouge |
| `acces-automatisations-qa`, `aide-automatique-qa`, `canaux-reseaux-qa`, `compta-tableau-qa` | 62/62, 62/62, 112 verts, tous verts |

**Pas encore joués** : `npm run typecheck` et `npm run build` (RAM du PC trop basse pendant que deux sessions Orca tournaient) ; l'audit par
un agent distinct (`presti-audit-attaque`) ; les suites contre la production (`pilotage-e2e`, `relances-e2e`), qui ne se jouent qu'après
déploiement.

## Défauts trouvés en route

- `crm-qa` B8 était rouge depuis le 25/10 : il cherchait encore une colonne Essentiel dans la grille. Corrigé.
- `essais-gratuits-qa` rougissait sur des pages SEO du 27/10, toujours hors git (`app/SeoBlocs.tsx`, `app/logiciel-devis-artisan/page.tsx`).
  Relues ligne à ligne (durées lues dans `ESSAI_JOURS`), elles sont ajoutées à la liste permise.
- Le texte « exécutée sans carte à confirmer », donné au modèle, devient « sans attendre de confirmation » : le mot « carte » y voulait dire
  « carte de confirmation », pas la carte bancaire.

## Risques et écarts au plan

- **S4, comportement nouveau** : une relance du CRM est refusée (409) si le client a été relancé il y a moins de 3 jours par un autre chemin
  ou par le CRM lui-même. Avant, le CRM n'avait que le débit d'une minute et le plafond de 3 relances.
- **S4, écart au plan** : les cartes EN ATTENTE ne bloquent pas un autre chemin. À la place, la réalisation d'une carte relit le registre
  au moment de l'envoi. Sinon, une carte jamais confirmée aurait bloqué pour toujours la relance d'impayé du même client.
- **S4, coût** : le cron de conversation fait 3 à 7 lectures de plus par relance due (borné par le lot du passage).
- **S5** : par défaut, l'acompte part seul comme avant (décision de Benj) ; `pilotage-e2e` et `simulation-generale` gardent donc leur attente
  d'origine.
- **Règle n8n-first** (Benj, 02/11) : S1 à S5 sont des exceptions justifiées. Ce sont des correctifs de sécurité dans des automatisations déjà
  codées en production, qui ne font que restreindre ; ces chemins migrent un par un dans n8n (`migration-production.md`).

## Décisions de Benj (02/11 au matin)

1. Push de L1 et L2 accordé, une fois le typecheck, le build et l'audit verts.
2. Q-S5 : l'artisan choisit, facture d'acompte émise seule (par défaut) ou d'un clic.
3. Règle n8n-first : les détecteurs (L3, L4, L8) passent dans n8n (`chantier-4-assistant-plan.md` §0).
