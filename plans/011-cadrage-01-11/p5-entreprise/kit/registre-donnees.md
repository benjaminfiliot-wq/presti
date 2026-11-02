# Registre des données collectées — modèle (mode A), sur « Exemple. Bâti-Démo »

> **Pièce 3 du kit commercial du mode A** (tâche 035-002). C'est le livrable 6 (p5:284) : pour chaque donnée, sa source, sa date, sa
> confiance, sa base légale et le lieu où elle vit. Il suit la règle absolue des données (p5:90-96) et la partie RGPD de la sécurité
> (p5:259-260).
>
> **Les règles.**
> - Chaque donnée porte sa valeur, sa source, sa date et sa confiance (p5:94). Dans ce modèle, la valeur n'est jamais écrite : seule la
>   colonne « Exemple. » montre une forme de valeur, fabriquée.
> - Les données vivent dans **Supabase**, région UE, isolées par RLS par organisation (p5:95, p5:259). n8n les lit et les écrit sur
>   Oracle, **ne les garde pas** : n8n n'est qu'un lieu de passage (p5:95). Les données qui restent dans l'outil du client y restent.
> - Aucune donnée de l'entreprise ni de ses clients ne part vers un modèle gratuit en ligne (p5:96, `.claude/rules/securite.md`). Seul le
>   modèle du produit, sous contrat et inscrit au registre, ou un modèle local sur Oracle, peut la lire (p5:218).
> - Presti est sous-traitant (art. 28) ; la liste des sous-traitants ultérieurs et le modèle de contrat sont la tâche 035-011.
> - La base légale se choisit parmi celles de l'art. 6 du RGPD : contrat, obligation légale, intérêt légitime, consentement. Elle est
>   **proposée** ici, à relire par un juriste, et fixée par l'entreprise, responsable du traitement.
> - La durée est à fixer au contrat ; « à fixer au contrat » vaut tant qu'elle ne l'est pas.

| Donnée | De qui | Source attendue | Date | Confiance attendue | Base légale proposée | Où elle vit | Durée | Exemple. Bâti-Démo |
|---|---|---|---|---|---|---|---|---|
| Identité et rôle d'un membre | membres de l'entreprise | dit en RDV par le titulaire | date du rendez-vous | déclaré | contrat | Supabase (UE), organisation du client, sous RLS | durée du contrat | Exemple. « compagnon, voit ses chantiers » |
| Nom et coordonnées d'un client final | clients de l'entreprise | formulaire public ou export de l'outil du client | date de capture ou d'export | mesuré | contrat (demande de devis) | Supabase (UE), sous RLS ; n8n : passage seulement, au moment d'envoyer | à fixer au contrat | Exemple. un nom en « Exemple. » et une adresse en `@exemple.invalid` |
| Texte d'une demande | clients de l'entreprise | formulaire public de l'entreprise | date de la demande | mesuré | contrat (demande de devis) | Supabase (UE), sous RLS ; jamais lu par n8n hors exception signée (`premiere-reponse.md` question 15) | à fixer au contrat | Exemple. « Exemple. rénovation d'une salle de bains » |
| Devis : lignes, statut, dates | entreprise | export de l'outil du client ou devis de Presti | date d'export | mesuré | contrat | Supabase (UE), sous RLS, ou l'outil du client | à fixer au contrat | Exemple. un devis au statut « envoyé », sans montant dans le kit |
| Facture : échéance, paiement | entreprise | export de l'outil du client ou facture de Presti | date d'export | mesuré | obligation légale (conservation comptable) | Supabase (UE), sous RLS, ou l'outil du client | durée légale de conservation, à confirmer par le comptable | Exemple. une facture « échue », sans montant dans le kit |
| Historique des relances | entreprise | mesuré par Presti (registre commun des relances, `lib/relancesRegistre.ts`) | date de chaque relance | mesuré | intérêt légitime (suivi commercial du client) | Supabase (UE), sous RLS | à fixer au contrat | Exemple. « relance du palier J+3, partie » |
| Opposition, « stop », désabonnement | clients de l'entreprise | réponse du client final | date de la réponse | mesuré | obligation légale (droit d'opposition) | Supabase (UE), sous RLS | tant que le contrat court, pour ne plus jamais relancer | Exemple. « stop reçu, plus aucune relance » |
| Consentement SMS ou e-mail commercial | clients de l'entreprise | preuve du consentement fournie par l'entreprise | date du consentement | mesuré | consentement | Supabase (UE), sous RLS | jusqu'au retrait | Exemple. inconnu : aucun SMS commercial sans consentement noté |
| Irritants, processus, procédures | entreprise | fiche de découverte, dit en RDV | date du rendez-vous | déclaré | contrat | Supabase (UE), organisation du client, sous RLS ; jamais dans le vault ni le code commun (C4:733-735) | durée du contrat | Exemple. « I2 : un devis sur deux n'est jamais relancé » |
| Volumes et base de départ des KPIs | entreprise | lu dans l'outil du client, ou mesuré par Presti | date de la mesure | mesuré ou déclaré, jamais mélangés | contrat | Supabase (UE), sous RLS | durée du contrat | Exemple. inconnu : mesure de départ à prévoir |
| Journal des agents (décisions, appels de modèle, envois, refus) | entreprise | mesuré par Presti | horodatage de chaque ligne | mesuré | intérêt légitime (preuve et contrôle du service) | Supabase (UE), sous RLS ; exécutions de n8n non gardées en succès (`premiere-reponse.md` question 10) | à fixer au contrat | Exemple. « carte préparée, refusée par la porte : sujet d'escalade » |
| Accès accordés aux outils du client | entreprise | annexe d'autonomie et liste d'accès signée | date de signature | mesuré | contrat | identifiants dans n8n seulement (Oracle), branchés par le client lui-même ; la liste dans Supabase | durée du contrat, révocable à tout moment | Exemple. « lecture de l'agenda » |

## Ce que le registre interdit

<!-- jamais:debut -->
- Jamais une donnée réelle dans un test ni dans ce kit : la copie fictive a la même forme (p5:96).
- Jamais une donnée de l'entreprise ou de ses clients envoyée à un modèle gratuit en ligne (p5:96).
- Jamais n8n comme lieu de stockage : il lit, il écrit, il ne garde pas (p5:95).
- Jamais une donnée inventée, supposée ou extrapolée : « inconnu », une question au client (p5:93).
<!-- jamais:fin -->
