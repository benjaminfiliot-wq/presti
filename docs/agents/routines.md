# Les routines de l'écosystème : qui tourne où, PC éteint ou non

Écrit par la fiche 026-148 (5 octobre 2026). Règle du 27/09 : tout ce qui peut tourner PC éteint tourne sur l'usine Oracle
(Matt, le chef, ou un minuteur systemd du compte `agents`) ; le poste ne garde que ce qui exige Claude Code (les juges, la
promotion d'une proposition en fiche, les migrations, le renvoi des verdicts, la reprise du chef).

**Le chef ne tourne dans aucune routine cloud** (décision du 27/09/2026). S'il en fallait une un jour, elle ne se mettrait en service qu'avec l'accord explicite et
daté de Benj (la ligne le dirait, avec la date). Connecteurs : aucun pour toutes les pièces ci-dessous.

## Le tableau

| Pièce | Où | Déclencheur | Modèle | Connecteurs | Réseau du modèle | Jeton (nom de la variable) | PC éteint ? |
|---|---|---|---|---|---|---|---|
| Cycle plein du chef (Matt) | usine, `presti-chef-plein.timer` (compte `agents`) | toutes les 2 h, aux heures paires à 05 (Paris) | `gpt-6-sol` | connecteurs : aucun | réseau du modèle : aucun | `PRESTI_JETON_CHEF` (coffre de l'usine) | oui |
| Cycle léger du chef | usine, `presti-chef-leger.timer` | aux heures impaires à 05 (Paris) | `gpt-6-luna` | connecteurs : aucun | réseau du modèle : aucun | `PRESTI_JETON_CHEF` | oui |
| Réunion d'équipage (`scripts/chef/reunion.mjs`) | usine, `presti-chef-reunion.timer` | chaque jour à 18 h (Paris) | `gpt-6-sol` | connecteurs : aucun | réseau du modèle : aucun | `PRESTI_JETON_CHEF` | oui |
| Bilan du chef | usine, `presti-chef-bilan.timer` | chaque jour à 07 h 35 (Paris) | `gpt-6-sol` | connecteurs : aucun | réseau du modèle : aucun | `PRESTI_JETON_CHEF` | oui |
| File IA des agents (`presti-ia-modele`) | usine, compte `chef-modele` (service + `.path`) | à la demande | `gpt-6-sol` / `gpt-6-luna` | connecteurs : aucun | réseau du modèle : aucun | aucun (échange par dossier) | oui |
| Classement des réponses (Standard) | usine, `presti-standard.timer` | toutes les 5 min | `gpt-6-luna` | connecteurs : aucun | réseau du modèle : aucun | `PRESTI_JETON_STANDARDISTE` | oui |
| Second juge du Facteur | usine, `presti-facteur.timer`, `presti-facteur-soir.timer` | toutes les 15 min ; rejugement à 20 h 05 | `gpt-6-luna` ; `gpt-6-sol` | connecteurs : aucun | réseau du modèle : aucun | `PRESTI_JETON_FACTEUR` | oui |
| Pont de l'orchestre | usine, `presti-pont.timer`, après la fiche 026-160 | toutes les 15 min | aucun | connecteurs : aucun | sans objet | `PRESTI_JETON_PONT` | oui (le renvoi des verdicts : poste) |
| Revue du lundi | usine, minuteur `presti-chef-revue.timer`, après la suite « revue et chantier sur l'usine » | lundi 7 h 30 | `gpt-6-sol` (texte), chiffres calculés par script | connecteurs : aucun | réseau du modèle : aucun ; le script n'appelle que prestiapp.fr | `PRESTI_JETON_CHEF` | oui, une fois la suite livrée |
| Collecte du chantier (idées « lancer ») | usine, avec la même suite | passage régulier | aucun | connecteurs : aucun | sans objet | `PRESTI_JETON_CHEF` | oui, une fois la suite livrée |
| Atelier des maquettes, livreur, porteur du formulaire | usine, `presti-atelier`, `presti-livreur`, `presti-porteur`, `presti-export-nuit` | 15 min, 10 min, 15 min, 03 h 30 | aucun pour l'atelier et le porteur | connecteurs : aucun | sans objet | `PRESTI_JETON_ATELIER`, `PRESTI_JETON_LIVREUR_USINE`, `PRESTI_JETON_FACTEUR_USINE` | oui |
| Chantier A12 : la fiche et son juge, la promotion des propositions, le rapatriement des propositions de l'usine, le renvoi des verdicts | **Claude Code, sur le poste** | à la séance | Claude | connecteurs : aucun | sans objet | copie de reprise de `PRESTI_JETON_CHEF` (environnement utilisateur de Windows) | **non** |
| Reprise du chef si l'usine tombe | poste, `node scripts/chef/cycle.mjs --reprise` | à la main | `gpt-6-sol` par le Codex du poste | connecteurs : aucun | selon la configuration du poste | copie de reprise de `PRESTI_JETON_CHEF` | **non** |

La revue du lundi n'est plus une routine Claude cloud (décision du 27/09) : une routine cloud aurait sorti `PRESTI_JETON_CHEF`
du coffre et consommé l'abonnement Claude. Tant que la suite « revue et chantier sur l'usine » n'est pas livrée, pas de revue
automatique : Claude Code la fait à la main un lundi où le poste est allumé, selon `docs/agents/revue-hebdo.md`.

## Où vivent les jetons

Seul le **nom** de la variable est écrit ici, jamais sa valeur. Les jetons sont dans le coffre de l'usine
(`~agents/.config/presti/agents.env`, en 600, propriétaire `agents`) ; ils y sont posés par
`node scripts/usine-coffre.mjs poser-jeton-agent <agent>`, qui ne les affiche jamais. Seul `PRESTI_JETON_CHEF` a une
**copie de reprise** : la variable d'environnement utilisateur de Windows du même nom (lue aussi par les juges).

## Le modèle du chef

Le modèle du chef tourne sous le compte `chef-modele`, sans aucun droit sur `/home/agents` ni sur le coffre, seul à lancer
`codex exec` (`presti-chef-modele`), avec le dossier d'échange `/srv/presti-chef/echange` et sans réseau. Les unités le
nomment par `ORCHESTRE_CODEX_BIN=/usr/local/bin/presti-chef-modele`, jamais `/opt/codex/bin/codex`. Le défaut est `gpt-6-sol`
(ChatGPT) ; le cycle léger prend `gpt-6-luna`. La file IA des agents, qui porte des données de prospect, ne suit jamais un
fournisseur de repli.

Mise en service du 05/10/2026 : les deux files (chef et ia) sont servies par un `.path` (`*/demande.pret`) **et** par un
minuteur de filet (`presti-chef-modele.timer`, `presti-ia-modele.timer`, toutes les 30 s), parce que le `.path` manque
parfois une demande déposée en quelques millisecondes dans un sous-dossier neuf. La connexion Codex de `chef-modele`
(`codex login --device-auth`) est un geste de Benj : preuves dans `.orchestre/preuves/026-148/`.

## Reprise par le poste

Si l'usine est injoignable (carte rouge « usine injoignable » du veilleur) ou reprise par Oracle :

- `node scripts/chef/cycle.mjs --mode=plein --reprise --base=https://prestiapp.fr`, puis `--mode=leger`, avec la copie de
  reprise de `PRESTI_JETON_CHEF` ;
- la réunion à la main selon `docs/agents/reunion.md` (elle refuse d'elle-même une seconde réunion le même jour) ;
- sans `--reprise`, `cycle.mjs` refuse tant que le chef de l'usine a battu depuis moins de 3 h : jamais deux chefs à la fois.

Le détail est dans `docs/agents/chef-routine.md`.
