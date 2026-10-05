# Le preneur des tâches libres

> Écrit le 5 octobre 2026. Code : `scripts/usine/preneur.mjs` (agent `preneur`, migration `0127_ops_preneur.sql`, unités
> `presti-preneur.service` et `.timer`, groupe `preneur` de `scripts/usine-agents.mjs`). Juge : `node scripts/preneur-qa.mjs`
> (PN-1 à PN-14) et `node scripts/preneur-qa.mjs --preuve-echecs` (témoin 14/14, 23 sabotages sur copie).

## Pourquoi

Le chef (Matt) écrit, à chaque cycle, des tâches de veille, de recherche, de tri, de relecture, de vérification et de
rédaction interne. Le 05/10, vingt d'entre elles sont restées en file sans objet et sans preneur : la seule capacité déclarée
sur ces types était celle de `pont`, qui ne bat pas (il n'a ni jeton ni minuteur, et son jeton n'est pas dans la liste fermée
du coffre) et qui, de toute façon, ne fait que ranger une proposition pour Claude Code.

Deux causes, deux corrections :

1. **Des tâches sans objet passaient.** `objet` était facultatif (schéma et `validerPlan`). Il est maintenant **obligatoire,
   de 20 à 200 signes, distinct d'une tâche à l'autre** : un seul objet absent, vide, blanc, trop court ou en double fait refuser
   **tout le plan** (`scripts/chef/commun.mjs`, `docs/agents/chef-plan.schema.json`, `docs/agents/chef.md`). La consigne
   du cycle (`cycle.mjs`) et celle du relais de secours (`relais-chef.mjs`) le disent ; le relais renvoie au modèle la liste
   des écarts (jamais une valeur) et lui laisse deux corrections. Juge : `chef-qa` CH-A15 (sept plans fautifs, un plan à objet
   de 20 signes qui passe) et CH-K2 (le schéma), avec leurs sabotages.
2. **Personne ne prenait ces types.** Le preneur ci-dessous les prend.

## Ce qu'il fait (une passe, toutes les 10 minutes, une seule tâche)

`battement` → `taches/prendre` (bail de 30 min, tentatives et disjoncteur du bus, rien de contourné) → contrôles → exécution →
résultat → `evenements` (`resultat_tache`) → `taches/<id>/rendre` (`faite`, preuve `supabase://ops.evenements/<id>`).

| Contrôle avant tout modèle | Échec rendu au bus |
|---|---|
| tâche illisible (id) | `tache_illisible` |
| type hors `recherche`, `tri`, `veille`, `verification`, `relecture`, `redaction_interne`, ou capacité ≠ type | `type_hors_liste` |
| `objet` absent, vide, blanc ou de moins de 20 signes | `objet_vide` |
| `garde-prospects.mjs` lit l'objet, le titre et le « pourquoi » : adresse de personne, téléphone, SIREN, « prospect », « démarchage » | `donnees_personnelles` |

Après le modèle : « IMPOSSIBLE : … » → échec honnête (`impossible : <raison assainie>`) ; sortie de moins de 60 signes →
`sortie_vide` ; secret ou jeton dans la sortie → `sortie_secret` ; une adresse e-mail est masquée (`[masqué]`) avant d'être
écrite. **Jamais** `code` ni `contenu` : le code reste à Claude Code et à Codex.

Où est le résultat : sur l'usine, `/home/agents/travail/preneur/resultats/<clé>.md` (en-tête : tâche, type, moteur, date). Le
bus reçoit l'événement `resultat_tache` (résumé de 200 signes, lié à la tâche) et la preuve de la tâche. Le chef lit donc le
résumé dans le fil ; le texte entier se lit sur l'usine. Un échec est rendu avec un code court (jamais une donnée) : même erreur
deux fois de suite, ou trois tentatives, et le bus ouvre une décision pour Benj (relancer / annuler, défaut annuler) ; trois
échecs en une heure ouvrent le disjoncteur de l'agent (`ops:agent_en_pause`, à lever par la décision).

## Avec quel exécuteur (et pourquoi pas Hermes ni OpenClaw par défaut)

Hermes et OpenClaw tournent dans des conteneurs Docker **root** (`/srv/hermes/bin/tache.sh`, `/srv/openclaw/bin/tache.sh`). Depuis
le durcissement du 25/09 (`docs/agents/usine-durcie.md`), ni `usine` ni `agents` n'ont `sudo` ni `docker`, et la clé du compte
`gardien` vit sur le PC et n'en sort jamais : un minuteur de l'usine ne peut donc pas lancer ces conteneurs. Faire entrer une
règle `sudoers` pour le compte `agents` serait un geste de sécurité qui appartient à Benj, pas à un agent.

- **`--executeur=ollama` (défaut, actif)** : l'Ollama de l'usine en 127.0.0.1 — Ollama Cloud (`gpt-oss:120b-cloud`, compte
  gratuit de Benj), puis le 4B et le 8B locaux, avec la mémoire des moteurs à bout de `relais-chef.mjs` (429 → mis de côté).
  Jamais freellmapi (sa clé n'est pas au compte `agents`), jamais Claude. **Sans web** : le modèle le sait, n'invente rien et
  marque « à vérifier » ; une tâche qui exige un site ou un fichier du dépôt revient en échec « impossible ».
- **`--executeur=hermes` (inactif)** : `sudo -n env HERMES_ID=… HERMES_DONNEES=publique /srv/hermes/bin/tache.sh <consigne> <sortie>`,
  statut `OK` exigé, résultat lu dans `resultats/RESUME.md`. Il ne marche qu'après la règle sudoers ci-dessous. Jugé avec un
  `tache.sh` doublé (PN-12).

### Geste de Benj, seulement s'il veut Hermes (accès web) pour ces tâches

Sur l'usine, par `gardien` (`ssh -i ~/.ssh/presti-usine-gardien gardien@88.96.53.3`) : une ligne dans `/etc/sudoers.d/presti-preneur`
(`visudo -cf` avant `install -m 440`) — forme indicative, à valider par `visudo` : `agents ALL=(root) NOPASSWD: /usr/bin/env HERMES_ID=* HERMES_DELAI=* HERMES_DONNEES=publique /srv/hermes/bin/tache.sh *` ;
puis `--executeur=hermes` dans l'`ExecStart` de `presti-preneur.service` (rien d'autre à changer). À peser : ce droit permet à
`agents` (le compte des agents de prospects) de lancer un conteneur qui a le web ; `tache.sh` exige `HERMES_DONNEES=publique` et
relit la consigne avec `garde-prospects.mjs`, mais c'est un pont de plus vers l'extérieur.

## Mise en service (déjà faite le 05/10 : voir « Preuves »)

1. Code : `git push`, puis `PRESTI_USINE=ubuntu@88.96.53.3 node scripts/usine-agents.mjs maj --forcer`.
2. Identité : la migration `0127` enregistre l'agent `preneur` (six capacités, aucun type créé, tables `taches` et `evenements`,
   aucun euro). Elle ne pose **pas** de jeton.
3. Jeton (protocole 026-040, jamais affiché) : `node scripts/usine-coffre.mjs poser-jeton-agent preneur` — crée le jeton par
   `agents-jeton.mjs --sortie=tube` (empreinte seule en base) et le pose au coffre sous `PRESTI_JETON_PRENEUR` (nom ajouté à
   la liste fermée : `coffre-regles.mjs`, `presti-coffre.sh`, `cas-valeurs.json`, `usine-socle-qa.mjs`).
4. Minuteur : `PRESTI_USINE=ubuntu@88.96.53.3 node scripts/usine-agents.mjs installer preneur` ; arrêt : `… arreter preneur`.
5. Le pont : `presti-pont.timer` n'est dans aucun groupe et ne doit PAS être installé tant que ses capacités recouvrent celles du
   preneur (il prendrait les mêmes tâches pour les « ranger » en proposition). Avant de l'installer : lui retirer les six
   capacités libres (`ops_agent_enregistrer('pont', …)` avec `code` et `contenu` seulement) ; et corriger `pont-orchestre.mjs`
   qui lit la réponse de `taches/prendre` comme un objet (c'est un tableau) et celle de `evenements` comme `{ id }` (c'est
   un nombre nu).

## Limites connues

- Pas d'accès web avec l'exécuteur par défaut (voir plus haut) : les tâches de veille et de recherche donnent une synthèse de ce
  que le modèle sait, avec ses « à vérifier » ; elles ne remplacent pas Perplexity ni Firecrawl.
- Le résultat entier reste sur l'usine ; le bus n'en garde que le résumé de 200 signes.
- Ollama Cloud a un quota gratuit (atteint le 03/10) : le preneur retombe alors sur le 4B puis le 8B locaux (lents, qualité
  moindre) ; il ne sort jamais vers une voie payante.
- Une tâche à `objet` vide créée par un autre agent que le chef (`systeme`, `a0`…) est refusée de la même façon (`objet_vide`).
- Le quota de création du chef (20 par jour de Paris) est inchangé et ne se falsifie pas : annuler une tâche ne rend pas son
  créneau, et le plan entier est refusé avant toute requête quand un objet manque.

## Annulation des 20 tâches vides du 05/10

Aucune fonction du bus n'annule une tâche en file (`ops_tache_rendre` exige un bail du même agent ; `ops_tache_clore` ne rend
que `faite`). Écriture SQL minimale, sur les seules tâches `file` / `chef` / `objet` nul / clés `chef:2026-10-05:*` de 11 h à
12 h UTC : `statut = 'annulee'`, `derniere_erreur = 'objet vide : tâche d'essai du relais, annulée le 05/10'`, plus un événement
`tache_annulee` de l'agent `chef` par tâche (journal en ajout seul). Rien n'est supprimé ; le compteur de création du jour
(`cree_le`) est intact.

## Preuves du 05/10/2026 (usine, commit 3381a99a)

- Migration `0127` appliquée par le connecteur, contrôle lu : agent `preneur`, six capacités, aucun type créé, tables `taches` et
  `evenements`, quota 0, plafond 0, jeton absent avant la pose ; `usine-coffre.mjs poser-jeton-agent preneur` : « jeton posé, jamais
  affiché » ; `usine-agents.mjs installer preneur` : `presti-preneur.timer` activé (toutes les 10 min).
- Une vraie tâche, créée par la fonction du bus `ops_tache_creer` sous l'agent `systeme` (le quota du chef, 20 sur 20, n'est pas
  touché) : veille « Résumer en cinq points les règles de la franchise en base de TVA… » (sujet public, aucune donnée de
  personne). `systemctl start presti-preneur.service` : « preneur : 53dac14c veille faite par ollama_4b (événement 4088) ».
  Base : statut `faite`, agent `preneur`, tentatives 0, preuve `supabase://ops.evenements/4088`, événements `tache_creee` (4086),
  `tache_prise` (4087), `resultat_tache` (4088), `tache_faite` (4089).
- Ollama Cloud a répondu 429 (quota gratuit) : mis de côté 6 h (`etat-chef.json`), le 4B local a pris la suite en 78 s.
- **Qualité : à ne pas confondre avec « juste ».** Le 4B a produit cinq points confiants et en partie FAUX (il invente un
  critère de « prestations libres » ; la franchise de l'article 293 B tient à un seuil de chiffre d'affaires). Chaque point porte
  son « à vérifier », comme exigé, mais `faite` veut dire « un modèle a répondu dans les règles », jamais « vérifié ». Tant que
  l'Ollama Cloud (120 B) est à bout, les résultats sont des **brouillons de modèle de 4 milliards de paramètres** : ils servent à
  trier et à préparer, pas à décider ; une relecture par Claude Code ou Codex reste nécessaire avant tout usage.
