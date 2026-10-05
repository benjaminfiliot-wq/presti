# L'épreuve « PC éteint » : ce que Benj fait, exactement

Fiche 026-163. Écrit le 05/10/2026, après lecture du code de la landing, de la route de dépôt et du juge.

## 1. Où on en est : tu ne peux pas encore le faire

Il manque trois choses, aucune n'est de ton ressort. Ne cherche pas le formulaire : il n'existe pas encore.

1. **Le formulaire n'est pas sur la landing.** `https://prestiapp.fr/` ne contient aucun formulaire « Recevoir la maquette », ni aucune case à cocher. Seule la route qui recevra la demande est écrite : `https://prestiapp.fr/api/prospects/entrant` (fiche 026-145). Le chef doit faire écrire le formulaire (fichier `app/page.tsx` et un composant).
2. **La route est fermée.** Le drapeau `prospectsEntrant` est à `false` dans `lib/flags.ts` : aujourd'hui la route répond 404 (vérifié le 05/10 par un envoi volontairement invalide, qui ne crée rien). Il se lève sur ta décision, quand le formulaire existe.
3. **Le juge de l'épreuve n'est pas écrit.** La commande `--bout-en-bout` de `scripts/atelier-maquettes-qa.mjs` sort toujours en code 2 (« BE-1 non applicable »). Le chef doit faire écrire BE-1 à BE-6 par une fiche.

Ce qui est déjà bon : l'Atelier et le porteur du formulaire battent sur l'usine, les tâches `acq-facteur`, `acq-standardiste` et `acq-repondeur` sont actives, la notice est vérifiée du jour.

## 2. Le geste, le jour où tout est prêt

Claude Code te dit « go » avant : c'est lui qui lance la préparation et qui attend ta demande pendant 30 minutes au plus. Tu ne fais rien avant son « go ».

**Quand :** un soir, poste allumé, **dimanche à jeudi** (le lendemain doit être un jour de semaine : le porteur ne soumet que du lundi au vendredi, de 8 h à 18 h).

**Où :** la landing `https://prestiapp.fr/`, le formulaire « Recevoir la maquette de mon site (gratuit) ». L'adresse exacte de la page sera écrite ici par le chef quand le formulaire existera ; la route qui reçoit est `https://prestiapp.fr/api/prospects/entrant`. Téléphone ou PC, au choix.

**Ce que tu remplis :**

| Champ | Ce que tu tapes |
| --- | --- |
| Entreprise | `Essai Presti` |
| Métier | menuisier |
| Commune | Paris |
| Site ou Instagram | la valeur que Claude Code t'affiche, de la forme `essai-026-e2e-XXXX.invalid` (elle change à chaque épreuve : recopie-la telle quelle) |
| E-mail | **ton adresse personnelle**, celle que tu lis sur ton téléphone. Pas l'adresse de la boîte de prospection : c'est elle qui t'écrit, elle ne doit pas s'écrire à elle-même |
| Case à cocher | **la cocher** : « Je demande à Presti de me préparer une maquette et de me recontacter à ce sujet, par son assistant IA ». Sans elle, rien n'est enregistré et aucun e-mail ne peut partir |

Laisse vide tout champ caché ou nommé « société » : c'est le piège à robots.

**Ce que tu dois voir ensuite :** un message vert « Merci : l'assistant IA de Presti vous écrira à cette adresse avec votre maquette, sous 48 h ouvrées. ». Si tu vois un message rouge, dis-le à Claude Code tel quel ; limite : 3 demandes par heure et par connexion. Claude Code, lui, voit la demande apparaître en base (au plus 30 minutes d'attente) et te dit « bien reçu, tu peux éteindre ».

## 3. PC éteint

1. **Éteins le poste** et note l'heure. Laisse-le éteint jusqu'au **lendemain soir** (environ 24 h). L'usine, elle, reste allumée et fait tout le travail.
2. Pendant ce temps, sur ton téléphone : quand l'e-mail avec la maquette arrive, **ouvre-le, regarde la vidéo**, puis **réponds depuis la même adresse** : `Oui, c'est combien ?`
3. Quand la réponse automatique arrive dans le même fil, **note l'heure de réception**.
4. N'allume pas le poste avant l'heure prévue, et ne lance rien dessus : un seul démarrage de l'orchestre pendant la fenêtre suffit à rater l'épreuve.

Si aucun e-mail n'arrive au bout de 24 h : ne fais rien de plus, rallume et dis-le à Claude Code (il lit la base et dit où ça s'est arrêté).

## 4. Le lendemain soir

Tu rallumes et tu donnes à Claude Code **trois heures** : quand tu as éteint, quand tu as rallumé, quand la réponse est arrivée. Il lance `--etape=conclure` avec ces trois heures.

**Ce qui prouve la réussite :** le juge relit la base et trouve, dans les 24 h : la maquette prête avec sa vidéo ; le lien envoyé par le Gmail de prospection ; ta réponse relevée et classée « prix » ; la réponse du Répondeur dans le même fil, envoyée après la tienne ; l'envoi d'essai du porteur reçu (code 2xx) ; aucun passage de l'orchestre du poste dans la fenêtre. Il écrit `.orchestre/preuves/026-163/releve.md` et pose l'événement `epreuve_bout_en_bout` à `PASS`. Le message de Claude Code te dit « PASS » ou le premier critère en échec.

Le ménage efface les lignes d'essai de la base ; les deux e-mails restent dans ta boîte, c'est un vrai échange.

## 5. Ce que tu ne fais pas

- Aucune vraie adresse d'artisan dans le formulaire.
- Pas de seconde demande « pour voir » : la limite est de 3 par heure, et chaque demande crée un prospect à nettoyer.
- Tu n'ouvres pas `envoi_froid` pour cette épreuve. **Depuis la décision du 05/10/2026 soir (« B », migration 0131), l'épreuve n'ouvre rien et ne bloque plus l'ouverture :** l'envoi à froid s'ouvre au palier P0 (5 formulaires par jour) avec la mesure à sec PASS et la notice vérifiée de moins de 7 jours (automatique, voir `notice-prospection.md`), sans elle. **L'épreuve (PASS de moins de 30 jours) est devenue la condition pour MONTER de palier** (P0 → P1 → P2 → P3 → P4, `acq_palier_evaluer`) : tant qu'elle n'a pas réussi, la montée est retenue et la station écrit « montée de palier retenue » (une fois par jour). Elle se fait donc en parallèle de l'envoi à P0.
