# Pièges du lot k (026-170, JK-3)

Chaque piège ci-dessous est un DÉFAUT réel qu'un moteur fautif pourrait contenir. Il n'est pas rejoué séparément par ce
dossier : sa réalisation mécanique est le sabotage de même nom dans `scripts/fixtures/026-pilotage/k/lot.mjs`
(`avant` → `apres`, appliqué par `juges-026-pilotage-preuve.mjs --lot=k`, JA-8), qui remplace le texte exact du témoin
(`k/temoin/`) par le texte piégé décrit ici, rejoue le juge, et vérifie qu'il détecte le bon critère en échec (« tue »).
Ce dossier documente le piège pour qu'un humain (ou Codex, en contre-revue) puisse relire l'intention sans dérouler le
diff de lot.mjs.

Nom exact du sabotage dans `lot.mjs` entre parenthèses quand il diffère du nom usuel du piège.

| Piège | Fichier touché | Critère attendu en échec |
|---|---|---|
| hasard caché (`hasard-cache`) | moteur/entree.tsx | CL-6 (et donc CL-5 : le rendu diverge d'un passage à l'autre) |
| fetch vers un hôte externe (`fetch-externe`) | moteur/theme/charger.ts | CL-11-REQUETES (CSP : une requête hors de la liste blanche) |
| Phaser hors de moteur/ (`phaser-dans-page`) | app/controle/station/page.tsx | CL-12-AUTRES (poids : Phaser chargé hors de moteur/) |
| notice absente (`licence-retiree`) | moteur/claw3d/LICENSE-claw3d.txt | CL-1 |
| inactif → Repos (`inactif-vers-repos`) | moteur/entree.tsx | CL-7 (un agent sans salle est quand même dessiné, au Repos) |
| pont à chaque lecture (`pont-a-chaque-lecture`) | moteur/entree.tsx | CL-9-PONT (le pont est appelé même sans rejouer d'événement) |
| chiffre peint dans le décor (`chiffre-dans-decor`) | moteur/entree.tsx | CL-8 (le décor peint une valeur qui dépend des données, pas seulement du thème) |
| salle réservée prise pour destination (`reservee-a-une-arete`) | moteur/grille.ts | CL-15-RESERVEE (l'emplacement réservé reçoit un chemin) |

D'autres sabotages, hors de la liste JK-3 mais utiles au plancher de critères distincts tués (JA-8, PLANCHER_TUES=2 par
partie) : `tailwind-dans-moteur`, `url-search-params`, `second-fetch`, `ssr-releve` (provenance) ; `grille-retiree`,
`sans-poids` (grille) ; `alternative-retiree`, `manifeste-retire` (hygiene) ; `drapeau-sommeil` (repos) ;
`carte-toujours-prete` (garde) ; `antialias-releve` (pixel) ; `perte-non-rattrapee` (contexte). Voir `lot.mjs`.
