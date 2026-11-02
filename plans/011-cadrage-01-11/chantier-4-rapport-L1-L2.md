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

**Joués depuis** : `npm run typecheck` (code 0, après chaque cycle de correctifs) et les audits distincts (plus bas). **Restent** :
`npm run build`, puis les suites contre la production (`pilotage-e2e`, `relances-e2e`), qui ne se jouent qu'après déploiement.

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

## Audits distincts et correctifs (02/11, midi et après-midi)

Deux audits offensifs, chacun par une session Claude Code distincte lancée dans Orca, ont rendu « ne tient pas » ; tout a été corrigé
par la session principale, avec un essai et un mutant pour chaque défaut (`scripts/securite-assistant-0211-qa.mjs`, 108 essais, 68 avant).

| Audit | Défaut | Correctif |
|---|---|---|
| 032-001 D1 (élevé) | « fait tout seul » envoyait un devis à ligne estimée ou à 0 € | `P.envoyer_devis` relit les lignes (`prixSources`) ; non sourcé ou illisible → carte (`horsAuto`) |
| 032-001 D2 | négation, hésitation, fait passé lus comme un ordre | remplacé par l'ordre net (032-004 D2) |
| 032-001 D3 | conversation illisible lue « rien à escalader » | `leadDuCompteStrict` dans l'escalade : une erreur lève |
| 032-001 D4 | la métadonnée Entreprise survivait à une descente d'offre | remplacé par le prix dédié (032-004 D4) |
| 032-001 D5 | synonymes d'escalade manqués | lexique élargi, puis repris (032-004 D5) |
| 032-001 D6 | deux envois au clic ne relisaient pas le registre | la route `a-valider` et `validerPropositionServeur` le relisent au départ |
| 032-001 D7 | `offres-affichage-qa` hors lanceur | inscrite à `SUITES` |
| 032-004 D1 bis (élevé) | un prix recopié d'un autre devis devenait « prix donné par l'artisan » | l'étiquette n'est posée que sur un nombre écrit par l'artisan (`nombresEcrits`, `textesArtisan`) ; sinon « prix repris d'une donnée, à vérifier » |
| 032-004 D2 | 27 tournures ouvraient encore le mode | charge renversée : seul un ordre net (impératif en tête ou « oui », sans négation, report, condition, hésitation ni « déjà fait ») ouvre le « fait tout seul » |
| 032-004 D3 | réglages et compte des réponses lus sans leur erreur | `getPlateformeConfigStrict`, erreur du compte lue : une erreur lève |
| 032-004 D4 (argent) | descendu au prix de Signature, le contrat gardait l'Entreprise | l'Entreprise se reconnaît par un prix Stripe dédié (`price.metadata.plan`), ou par la métadonnée à un montant hors offres publiques |
| 032-004 D5 | 18 tournures manquées, 12 faux positifs | lexique élargi ; mots entiers (`gaz`, `procès`, `accident`…) ; « pas d'urgence » ignoré |
| 032-004 D6 | une colonne absente passait pour une table absente | seuls `PGRST205` et `42P01` sont ignorés |
| 032-004 I3 | la réponse seule au prospect ignorait la liste d'escalade | `iaDoitRepondre` la lit en mode « auto » ; le mode « assistée » garde son brouillon |

| 032-005 A2 (élevé) | une estimation entrait dans « mes tarifs » (`ajouter_tarif`, `modifier_tarif`, écritures directes) et le devis au tarif partait seul | la bibliothèque n'enregistre que le prix écrit par l'artisan (`prixDeLArtisan`) |
| 032-005 A3 | une quantité, une date, un numéro écrits par l'artisan passaient pour un prix | `prixEcrits` : seul un nombre marqué (« € », « euros », « HT », « le m² »…) est un prix |
| 032-005 D2 | « C'est bon, je m'en occupe », rétractations, reports et conditions ouvraient encore le mode | un accord n'ouvre que seul ou suivi d'un impératif ; rétractations, jours, « après… », « à moins que », participes datés défont l'ordre |
| 032-005 I3 | la réponse seule ne relisait que le dernier message (la suite d'un litige recevait une réponse) | `messagesClient` : les trois routes qui répondent seules relisent les derniers messages entrants du fil |
| 032-005 D5 | 22 tournures manquées (assureur, menace, vol, explosion, Urssaf…) | lexique élargi ; « sans dégât » et « chute de neige » écartés |
| 032-005 réserve | `garde-fou-envoi-qa` joué par personne | inscrite à `SUITES` |

**Prix du côté sûr** : des demandes qui ne sont pas un ordre net deviennent une carte d'un clic (« N'oublie pas de relancer Dupont »,
« Relance Dupont si ce n'est pas fait », « Réponds-lui que je passe jeudi »). Écrit dans l'essai A2h2. La suite de sécurité compte 123 essais.

**Règle du quatrième audit (032-006)** : le code en production a encore les brèches d'origine (S1 à S5) ; garder ce lot hors de la
production garde le produit dans son état le moins sûr. Le lot part donc s'il ne reste aucun défaut ÉLEVÉ (un chemin courant qui fait
partir sans le clic de l'artisan un prix non sourcé, un geste §3.2 ou une parole sur un sujet d'escalade) ; les défauts moyens et faibles
restants sont listés pour le lot suivant.

**Reste à Benj** (argent, compte Stripe) : un contrat Entreprise se crée avec un prix Stripe dédié portant `metadata.plan = entreprise` ; et
le portail de facturation ne doit pas permettre de changer d'offre pour ces contrats (réglage du compte Stripe).

## Décisions de Benj (02/11 au matin)

1. Push de L1 et L2 accordé, une fois le typecheck, le build et l'audit verts.
2. Q-S5 : l'artisan choisit, facture d'acompte émise seule (par défaut) ou d'un clic.
3. Règle n8n-first : les détecteurs (L3, L4, L8) passent dans n8n (`chantier-4-assistant-plan.md` §0).
