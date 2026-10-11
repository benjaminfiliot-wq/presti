# Contrat de banc du Contrôleur qualité des sites livrés (026-246 → 026-247)

Ce fichier dit ce que `scripts/qualite-sites-qa.mjs` attend du module qu'il juge : **`scripts/agents/controleur-qualite.mjs`**,
écrit par 026-247 (la production). Le juge l'importe dans un processus à part (`sonde.mjs`), lui passe des **dépendances
injectées** qui parlent en vrai HTTP à un serveur factice, joue vingt-cinq pannes réglables et mesure **côté serveur** ce qui est arrivé.
Le témoin `temoin.mjs` est une implémentation minimale de ce contrat : il prouve que le juge sait dire « vert » ; il n'est jamais installé.
Le module de production peut être plus riche (Playwright, Lighthouse, coffre de l'usine) tant qu'il rend les mêmes formes ici.

Données synthétiques : noms, SIREN et adresses inventés, domaines en `.test`. Aucun secret, aucun vrai site.

## Export

```js
export async function passeQualite(deps) // → { audits: [...] } | { pause: true, audits: [] }
```

Importer le module ne fait **rien** (aucune requête, aucun minuteur) : QSI-1. Toute erreur de `magasin.travail()` fait **rejeter** la promesse,
sans battement. Un export facultatif `BUDGET_POIDS_OCTETS` est toléré (le juge compare à 3 × 1024 × 1024).

## Les dépendances reçues (`deps`)

| clé | forme | rôle |
|---|---|---|
| `magasin.travail()` | `→ { sites: [...] }` ou `{ pause: true, sites: [] }` | la route `GET app/api/usine/qualite/travail` : les commandes livrées, **sans filtrage** (le module se défend lui-même) |
| `magasin.rapport(corps)` | `→ { decisions_creees: n }` | la route `POST app/api/usine/qualite/rapport` : crée **une** décision `qualite_site` par `cle_idempotence` jamais vue |
| `magasin.battement(nom)` | `→ void` | « vivant » : appelé avec `'qualite_sites'`, **une fois par passage réussi**, jamais en pause ni en erreur |
| `navigateur.ouvrir(url, options?)` | `→ observation` (ci-dessous) | la **seule** voie vers l'accueil du site : adaptateur Playwright de l'usine ; honore la méthode demandée (`options.method`) |
| `lecteurPrudent(url)` | `→ { statut, entetes, corps, … } \| { refus }` | `recupererPoli` de `lib/agents/acquisition/lecteurSite.ts` (026-020) : `robots.txt`, 1 requête par seconde, redirections non suivies à l'aveugle ; la **seule** voie pour les liens internes et le point d'entrée du formulaire |
| `horloge` | `{ maintenant(), attendre(ms) }` | temps injecté : jamais `Date.now()` ni `setTimeout` en direct |
| `MOTEUR_DE` | `{ qualite_sites: { moteur, modele, personnelles } }` (peut manquer) | la table des moteurs (026-040/`MOTEUR_DE`) |
| `moteur(capture, cfg)` | `→ string` (le verdict) | l'appel d'un modèle sur une capture ; peut manquer |

**Réseau direct interdit** : `fetch`, `http(s).request`, `http(s).get` sont piégés dans la sonde ; tout appel y est refusé et compte rouge
(QSI-5 pour une lecture, QSI-1 pour une écriture, QSI-7 si elle vise `/api/contact`). Une méthode du magasin hors `travail`/`rapport`/`battement`
est consignée `HORS-CONTRAT` et compte rouge (QSI-9).

### Forme d'une observation du navigateur

`{ url_demandee, url_finale, statut (null si coupure), erreur?, protocole: 'http'|'https', certificat: { valide, raison }|null, entetes, octets: Buffer, html, texte,
elements_texte: [{ selecteur, texte, couleur: 'rgb(r, g, b)', fond: 'rgb(r, g, b)', taille_px, gras }], images: [{ src, alt|null }], liens: [{ href, texte }],
formulaires: [{ action|null, methode|null, champs: [{ nom, type }] }], capture: Buffer }`

- `octets` = **la réponse complète décodée**, telle que reçue (QSI-3) : jamais l'en-tête `Content-Length` (un gzip de 3 ko peut décoder 3 Mo).
- `protocole` et `certificat` sont ceux **réellement rendus** après les redirections (QSI-2) : une URL enregistrée en `http://` qui redirige vers `https://` rend `https`.
- `elements_texte` porte les couleurs **rendues** : le contraste se calcule dessus (QSI-4).

## Ce que `magasin.travail()` rend (`sites-livres.json`)

Par commande : `commande_id, etat, domaine, url_en_ligne, en_ligne_le, compte_supprime_le, retiree_le, mentions_attendues: { nom_artisan, siren, adresse, forme_juridique }`.
Cinq commandes factices, dont :

- `cmd-dubois` : **programmée au retrait** (026-031, `compte_supprime_le` posé, 12 mois après suppression) → statut `exclu_retrait`, **aucune requête** vers son hôte, aucun rapport ;
- `cmd-leroy` : **livraison inachevée** (`url_en_ligne` nul) → statut `livraison_inachevee`, jamais une panne, aucun rapport ;
- `cmd-martin`, `cmd-garcia`, `cmd-petit` : `audite`, un rapport chacune (`petit` est en HTTP simple, `garcia` a un lien mort).

La liste exacte des mentions vient de **la commande** (le gabarit de livraison), jamais d'une constante du module : un SIREN absent de `mentions_attendues` ne se cherche pas.

## Ce que `passeQualite` rend

`{ audits: [{ commande_id, statut: 'audite'|'exclu_retrait'|'livraison_inachevee', sain?, pannes?: [codes] }] }` — ou `{ pause: true, audits: [] }` quand le magasin dit pause
(alors **zéro** requête, zéro rapport, zéro battement : la pause générale de 026-044).

## Le rapport (`magasin.rapport`)

```js
{ commande_id, periode: 'AAAA-MM', mesure_le: ISO, sain: boolean, verdicts: {
    disponibilite: { statut, protocole, certificat_valide, url_finale, pannes },
    poids:         { octets, budget_octets, pannes },
    accessibilite: { controles, insuffisants: [{ element, ratio, seuil }], images_total, images_sans_alt, pannes },
    liens:         { verifies, liens_morts: [{ url, statut, raison }], non_verifies: [{ url, raison }], pannes },
    mentions:      { attendues, presentes, absentes, pannes },
    formulaire:    { present, action, methode, champs, point_entree_statut, pannes },
    visuel:        { verdict, moteur, pannes: [] } } }
```

Chaque panne : `{ panne: <code>, mesure: {…}, cle_idempotence: 'qualite_site:<commande_id>:<code>:<AAAA-MM>' }`. Un site **sain** rend un rapport `sain: true` sans panne (il est rapporté :
c'est ce qui le prouve audité). La clé ne porte **que la période** : deux passages du même mois ne créent pas deux décisions ; un mois de plus, une panne qui dure en crée une nouvelle.
`periode` se lit sur `horloge.maintenant()`.

## Les pannes et leurs seuils (cahier QSI-2 à QSI-7)

| critère | code de panne | quand |
|---|---|---|
| QSI-2 | `indisponible` | pas de réponse, ou statut ≥ 400 (le reste de l'audit s'arrête là) |
| QSI-2 | `http_non_securise` | protocole **rendu** = `http` |
| QSI-2 | `certificat_invalide` | `https` avec `certificat.valide === false` |
| QSI-3 | `poids_excessif` | `octets` **strictement** supérieur à 3 Mio (3 145 728 : pas de panne ; 3 145 729 : panne), avec `mesure.octets` exact |
| QSI-4 | `contraste_insuffisant` | ratio WCAG réel `(L1 + 0,05) / (L2 + 0,05)` sous 4,5 (petit texte) ou 3 (≥ 24 px, ou gras ≥ 18,66 px) ; `insuffisants[]` porte l'élément, le ratio (2 décimales), le seuil |
| QSI-4 | `alt_manquant` | `<img>` **sans attribut** `alt` ; `alt=""` est décoratif et ne compte pas |
| QSI-5 | `lien_mort` | lien interne (même hôte, fragment retiré, doublons fusionnés ; `mailto:`, `tel:`, hôtes externes ignorés) en 4xx/5xx, coupure ou délai (`raison: 'injoignable'`), boucle de redirections (`raison: 'boucle_redirections'`) |
| QSI-5 | — | `robots.txt` interdit un lien : il sort dans `non_verifies`, **jamais** demandé, jamais une panne ; une redirection simple vers une page vivante n'est pas une panne |
| QSI-6 | `mentions_absentes` | une des mentions attendues est introuvable dans le texte **rendu** (accueil + page des mentions légales) ; `siren` se compare chiffres collés |
| QSI-7 | `formulaire_absent` / `formulaire_sans_action` / `formulaire_injoignable` | présence passive dans le HTML ; `GET` ou `HEAD` seul sur le point d'entrée (401, 403 et 405 = le point d'entrée répond) |
| QSI-8 | — | l'avis visuel n'est **jamais** une panne |

Le débit du lecteur prudent (1 requête par seconde par hôte) se mesure sur l'horloge factice **côté serveur** : des liens suivis en parallèle, ou hors du lecteur prudent, sont rouges.

## Ce que le juge lit dans le texte du module (commentaires retirés)

- **QSI-1** : aucune méthode `'PUT'`, `'DELETE'`, `'PATCH'` ; `'POST'` seulement à côté de `/api/usine/qualite/` (le rapport au bus de Presti) ; aucun import de `child_process`, `basic-ftp`, `ftp`, `ssh2`, `simple-git`, `isomorphic-git`.
- **QSI-7** : aucune interaction de page — `.click(`, `.fill(`, `.type(`, `.press(`, `.check(`, `.selectOption(`, `.setInputFiles(`, `.dispatchEvent(`, `.requestSubmit(`, `.submit(`, `.tap(` : **un formulaire ne se soumet jamais, même pour essayer**.
- **QSI-8** : `MOTEUR_DE` et `personnelles` figurent dans le source de l'avis visuel. L'appel d'un modèle n'a lieu que pour `{ moteur: 'codex', personnelles: true }` et un modèle sans `cloud` ; sinon `visuel.verdict === 'non_mesure'`, sans appel — jamais un moteur gratuit, jamais `:cloud`.
- **Sur le dépôt réel seulement** (026-247 livrée) : `app/api/usine/qualite/travail/route.ts` exporte `GET` et contient `authAgent` et `pauseGenerale` ; `app/api/usine/qualite/rapport/route.ts` exporte `POST`, contient `authAgent`, `creerDecision` et `qualite_site`, n'écrit jamais dans `sites_commandes` (une décision, jamais une correction) ; aucune des deux ne fait de `fetch` ni de requête réseau.

## Ce que ce juge ne prouve pas

Playwright et Lighthouse réels, le coffre de l'usine, les gardes de jeton (026-040), la vraie base, la vraie Search Console, le verdict visuel d'un vrai modèle.
`--reel` est **refusé** (code 2) : un premier audit d'un vrai site livré exige le jeton `qualite_sites` et le « oui » de Benj (026-251).
