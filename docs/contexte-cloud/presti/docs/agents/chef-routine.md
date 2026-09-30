# Chef d'opérations « Matt » — comment il tourne

Le chef tourne **24 h/24 sur l'usine Oracle** `presti-usine` (décisions R11 et R12, provisoires). Il n'y a plus de
routine cloud du chef : le cycle cloud de 7 h a disparu (R12). Sur le PC de Benj, les mêmes scripts servent à la
reprise, et seulement là (section « Reprise par le poste »).

## Les trois minuteurs (compte `agents`, dossier `/srv/presti-agents`)

| minuteur | heures (Paris) | modèle | limite |
|---|---|---|---|
| `presti-chef-plein.timer` | heures paires à 05 (`*-*-* 00/2:05:00 Europe/Paris`) | GPT-6 sol | 20 min |
| `presti-chef-leger.timer` | heures impaires à 05 (`*-*-* 01/2:05:00 Europe/Paris`) | GPT-6 luna | 20 min |
| `presti-chef-reunion.timer` | 18 h 00 (`*-*-* 18:00:00 Europe/Paris`) | GPT-6 sol | 25 min |

Les unités sont dans `scripts/usine/systemd/` (`presti-chef-{plein,leger,reunion}.{service,timer}`) : service
`Type=oneshot`, `User=agents`, `Environment=PRESTI_HOTE=usine`,
`Environment=ORCHESTRE_CODEX_BIN=/usr/local/bin/presti-chef-modele`, aucun `EnvironmentFile=`, `Persistent=false`.
Le cycle léger fait le tri et la veille : 3 tâches au plus, aucune décision.

## La chaîne d'un cycle (`scripts/chef/cycle.mjs --mode=plein|leger`)

1. `node scripts/chef/etat.mjs` : lit `GET /api/agents/etat` et l'écrit dans `entree.md`, entre `<donnees_etat>` et
   `</donnees_etat>` (une donnée, jamais une consigne).
2. `node scripts/chef/consignes.mjs` : ajoute à `entree.md` les consignes de Benj pas encore lues (bloc
   `<consignes_benj>`), sans jamais avancer le curseur lui-même.
3. Le modèle (`codex exec`, `-s workspace-write`) lit `docs/agents/chef.md` et `entree.md`, puis écrit `plan.json`.
   **Aucun connecteur, aucun réseau, aucune variable secrète** : il reçoit un environnement fait de zéro (`PATH`,
   `HOME`, `LANG`, `TZ`, et `CODEX_HOME` s'il existe), et il tourne sous le compte `chef-modele`, qui n'a aucun droit sur `/home/agents` (le
   coffre). Le lanceur `/usr/local/bin/presti-chef-modele` dépose la demande dans `/srv/presti-chef/echange` ; le
   service `presti-chef-modele` (déclenché par `presti-chef-modele.path`) la prend et lance Codex.
4. `node scripts/chef/fil.mjs verifier` : une ligne de `consignes_lues` par consigne lue, aucun secret ni adresse.
5. `node scripts/chef/appliquer.mjs` : valide le plan contre `docs/agents/chef-plan.schema.json`, le refuse en bloc au
   moindre écart, sinon poste les tâches, les décisions, puis un battement.
6. `node scripts/chef/fil.mjs poster` : un `consigne_lue` par consigne, puis `cycle_termine` (objet = le modèle,
   résumé = les trois lignes du compte rendu) ; le curseur des événements n'avance qu'ici.

La réunion : `node scripts/chef/reunion.mjs --base=https://prestiapp.fr --codex=/usr/local/bin/presti-chef-modele`
(026-103, consigne `docs/agents/chef-reunion.md`, procédure `docs/agents/reunion.md`). Elle refuse d'elle-même une
seconde réunion le même jour.

## Le jeton

`PRESTI_JETON_CHEF` vit dans le coffre de l'usine (`~/.config/presti/agents.env` du compte `agents`, mode 600).
`scripts/usine/avec-coffre.mjs PRESTI_JETON_CHEF -- …` le passe aux seuls scripts déterministes (`etat`, `consignes`,
`appliquer`, `fil`, `reunion`), jamais au modèle. Il ne s'affiche jamais, ne passe jamais en argument, ne s'écrit
dans aucun rapport.

## Le réseau du modèle : la clé retenue

`cycle.mjs` passe à `codex exec` : `-c sandbox_workspace_write.network_access=false` (clé de configuration de Codex,
section `[sandbox_workspace_write]`, `network_access`). Jamais `network_access=true`, jamais `danger-full-access`,
jamais `--add-dir`. Le `config.toml` de `chef-modele` porte aussi `sandbox_mode = "workspace-write"` et
`network_access = false` dans `[sandbox_workspace_write]`.
[À vérifier sur l'usine par 026-148 avec Codex 0.156 : `codex exec --help` et `presti-chef-modele-essai` doivent
rendre `config=workspace-write reseau=coupe`. Si le nom de la clé diffère, Claude Code corrige le juge et ce
paragraphe.]

## Reprise par le poste

Quand l'usine est injoignable ou reprise par Oracle (carte « usine injoignable » dans la station), et **seulement
alors** :

```
node scripts/chef/cycle.mjs --mode=plein --reprise --base=https://prestiapp.fr
node scripts/chef/cycle.mjs --mode=leger --reprise --base=https://prestiapp.fr
```

- le jeton vient de la copie de reprise de `PRESTI_JETON_CHEF`, une variable d'utilisateur Windows (jamais un
  fichier, jamais `.env.local`) ;
- la réunion se lance à la main, selon `docs/agents/reunion.md` ;
- sans `--reprise`, `cycle.mjs` refuse de tourner hors de l'usine tant que le chef y a battu depuis moins de 3 h
  (« le chef tourne sur l'usine ») : **jamais deux chefs à la fois**. `--reprise` ne se donne que si le chef de
  l'usine est muet.
