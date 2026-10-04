# 026-246 — échecs attendus du juge du Contrôleur qualité des sites livrés (`node scripts/qualite-sites-qa.mjs --preuve-echecs`)

Écrit par le juge le 2026-10-04T09:21:53.844Z (71 s). Verdict global : **PASS**.

## Limites assumées (relues avant d'écrire le juge)

- **Le module du Contrôleur qualité n'existe pas encore** (aucun fichier à `scripts/agents/`, `lib/agents/`, `scripts/usine/` ; sa fabrication est la fiche 026-247). Le juge pose un CONTRAT (`auditerSite`, `passer`) et se prouve sur un TÉMOIN minimal des jeux d'essai ; les noms de fichiers cherchés et les formes de résultat sont à confirmer le jour de 026-247.
- **Pas de vrai TLS** : le protocole et le certificat « rendus » sont annoncés par un en-tête du serveur factice (`x-simule-tls`), comme le demande la fiche ; la validation réelle d'un certificat n'est pas jugée ici.
- **Le verdict visuel** n'est jugé que par son AIGUILLAGE (Codex et `personnelles: true`, sinon `non_mesure`) avec un modèle factice ; aucune capture réelle, aucun appel de modèle.
- **La cadence** est jugée à 60 ms d'intervalle injecté (le défaut exporté `INTERVALLE_MS` doit valoir au moins 1000 : vérifié en lecture, pas chronométré à la seconde).
- **`--reel`** : refusé (code 2) tant que 026-247 et l'usine n'existent pas. Le déclencheur « mise en ligne » (026-078), la Search Console (026-201) et les tables `ops.*` ne sont pas exercés : l'indexation n'a pas de critère QSI.
- Le contraste est calculé sur les couleurs de `<style>` et `style=""` (sélecteurs simples, héritage de la couleur, du fond et de la taille) ; pas de feuille externe, pas d'image de fond, pas de transparence.

## 1. L'arbre courant

Verdict : ✓ — module absent : les 9 critères sont rouges, QSI-2 porte la cause

```
FAIL QSI-1 — non jugé : module absent (cause : QSI-2)
FAIL QSI-2 — module absent : aucun de scripts/agents/controleur-qualite.mjs · lib/agents/controleurQualite.mjs · lib/agents/controleur-qualite.mjs · scripts/usine/controleur-qualite.mjs n'existe sous . — le Contrôleur qualité des sites livrés n'est pas écrit
FAIL QSI-3 — non jugé : module absent (cause : QSI-2)
FAIL QSI-4 — non jugé : module absent (cause : QSI-2)
FAIL QSI-5 — non jugé : module absent (cause : QSI-2)
FAIL QSI-6 — non jugé : module absent (cause : QSI-2)
FAIL QSI-7 — non jugé : module absent (cause : QSI-2)
FAIL QSI-8 — non jugé : module absent (cause : QSI-2)
FAIL QSI-9 — non jugé : module absent (cause : QSI-2)
```

## 2. Le témoin (`scripts/fixtures/026/qualite-sites/temoin/controleur-qualite.mjs`)

Verdict : ✓ — code 0, 9/9 critères verts.

```
qualite-sites-qa --temoin — témoin (scripts/fixtures/026/qualite-sites/temoin/)
✅ QSI-1 import sans effet de bord, source sans méthode d'écriture ni client FTP/Git, serveur factice : aucune requête hors GET/HEAD sur toute la suite
✅ QSI-2 code, protocole et certificat sont ceux rendus (200/500, https valide/expiré, http), retrait exclu sans requête, sans URL = livraison_inachevee
✅ QSI-3 octets = ceux de la réponse complète (pas l'en-tête), budget respecté sur la page saine, poids_excessif avec le nombre exact
✅ QSI-4 ratio WCAG recalculé sur les couleurs rendues (héritage compris, limite 4,5 / 3 exacte), élément et ratio rapportés, alt manquants comptés
✅ QSI-5 chaque lien interne suivi jusqu'à son code (404, 500, délai, boucle ; redirection simple vivante), robots.txt et cadence respectés, externes ignorés
✅ QSI-6 liste attendue lue dans le HTML rendu, mentions cherchées dans leur section, absentes signalées (toutes, une seule, ou aucune si le gabarit ne les attend pas)
✅ QSI-7 formulaire, champs, action et méthode lus dans le HTML ; point d'entrée interrogé en GET/HEAD seulement ; aucune soumission reçue par le serveur ; source sans méthode d'écriture
✅ QSI-8 appel au modèle seulement via Codex avec personnelles:true ; moteur gratuit, :cloud, absent ou sans capture = non_mesure sans appel ; le contrôle automatique reste valide seul
✅ QSI-9 une décision qualite_site par panne distincte, aucune pour retrait/inachevé/sain, rien de plus au 2e passage, une nouvelle au mois suivant, aucune action sur le site
qualite-sites-qa : PASS
```

## 3. Les sabotages (19/19 tués, critères exercés : QSI-1, QSI-7, QSI-2, QSI-3, QSI-4, QSI-5, QSI-6, QSI-9, QSI-8)

Chaque sabotage est une copie du témoin dont UN comportement est modifié par remplacement de texte (le juge refuse un motif qui ne s'applique pas exactement une fois), posée sous `.orchestre/travail/qualite-sites-qa/` et jugée comme une racine.

| sabotage | ce qui est cassé | critère attendu | critères rouges | tué |
| --- | --- | --- | --- | --- |
| ecriture_tentee_sur_le_site | une requête PUT est envoyée au site audité | QSI-1 | QSI-1, QSI-7 | ✓ |
| module_vide | le fichier n'exporte plus auditerSite ni passer | QSI-1 | QSI-1, QSI-2, QSI-3, QSI-4, QSI-5, QSI-6, QSI-7, QSI-8, QSI-9 | ✓ |
| soumission_reelle_du_formulaire | le contrôle du formulaire envoie un POST vers son action | QSI-7 | QSI-1, QSI-7 | ✓ |
| site_programme_au_retrait_audite | l'exclusion des sites programmés au retrait est retirée | QSI-2 | QSI-2 | ✓ |
| code_http_devine | le code rapporté est toujours 200 | QSI-2 | QSI-2 | ✓ |
| protocole_devine_sur_l_url | le protocole vient de l'URL déclarée, pas du rendu | QSI-2 | QSI-2 | ✓ |
| livraison_inachevee_en_panne | un site sans URL en ligne devient une panne | QSI-2 | QSI-2, QSI-9 | ✓ |
| poids_sur_fichier_tronque | le poids est mesuré sur les 64 premiers Kio seulement | QSI-3 | QSI-3 | ✓ |
| poids_lu_dans_l_en_tete | le poids est celui d'un en-tête d'estimation non vérifié | QSI-3 | QSI-2, QSI-3, QSI-9 | ✓ |
| contraste_approxime_sans_ratio | un écart de luminance remplace le ratio WCAG réel | QSI-4 | QSI-4 | ✓ |
| alt_manquant_ignore | les images sans alt ne sont plus comptées | QSI-4 | QSI-4 | ✓ |
| lien_mort_compte_vivant | seuls les codes ≥ 600 comptent comme morts (404 et 500 passent) | QSI-5 | QSI-5, QSI-9 | ✓ |
| cadence_ignoree | plus aucune attente entre deux requêtes | QSI-5 | QSI-5 | ✓ |
| robots_ignore | robots.txt n'est plus appliqué aux liens | QSI-5 | QSI-5 | ✓ |
| mention_absente_non_signalee | la liste des mentions absentes est toujours vide | QSI-6 | QSI-6, QSI-9 | ✓ |
| liste_des_mentions_supposee | la liste attendue est supposée, plus lue dans le gabarit rendu | QSI-6 | QSI-6 | ✓ |
| decision_creee_deux_fois | le contrôle d'une décision déjà posée pour la période est retiré | QSI-9 | QSI-9 | ✓ |
| correction_directe_au_lieu_d_une_decision | le contrôleur corrige lui-même après avoir créé la décision | QSI-9 | QSI-9 | ✓ |
| verdict_visuel_a_un_moteur_cloud | tout moteur est appelé pour juger la capture (gratuit, :cloud, sans personnelles) | QSI-8 | QSI-8 | ✓ |

### Extraits réels (la ligne du critère attendu)

- **ecriture_tentee_sur_le_site** → `FAIL QSI-1 — source : méthode d'écriture 'PUT' ; source : method: method: 'PUT' ; ÉCRITURE vers un site audité : PUT /`
- **module_vide** → `FAIL QSI-1 — auditerSite et passer doivent être exportés (fonctions)`
- **soumission_reelle_du_formulaire** → `FAIL QSI-7 — source : méthode d'écriture 'POST' ; point d'entrée en erreur 500 non signalé ; SOUMISSION : 17 requête(s) POST reçue(s) sur le point d'entrée du formulaire`
- **site_programme_au_retrait_audite** → `FAIL QSI-2 — site programmé au retrait : statut audite au lieu de exclu_retrait ; site programmé au retrait audité : 6 requête(s) reçue(s) par le serveur`
- **code_http_devine** → `FAIL QSI-2 — HTTP 500 rendu mais code rapporté 200`
- **protocole_devine_sur_l_url** → `FAIL QSI-2 — site rendu sans TLS (URL déclarée https) mais protocole rapporté « https » — deviné au lieu de mesuré ; site en HTTP sans panne « protocole_non_securise »`
- **livraison_inachevee_en_panne** → `FAIL QSI-2 — sans URL en ligne : statut audite au lieu de livraison_inachevee ; sans URL en ligne : traité comme une panne (indisponible)`
- **poids_sur_fichier_tronque** → `FAIL QSI-3 — page lourde : 65536 octets rapportés pour 3269185 réellement reçus (l'en-tête annonce 1200) ; page lourde (3269185 > 3145728) sans panne « poids_excessif »`
- **poids_lu_dans_l_en_tete** → `FAIL QSI-3 — page saine : 99999999 octets rapportés pour 1431 envoyés (l'en-tête d'estimation annonce 99999999) ; page saine signalée en poids excessif ; page lourde : 1200 octets rapportés pour 3269185 réellement reçus (l'en-tête annonce 1200) ; page lourde (3269185 > 3145728) sans panne « poids_e…`
- **contraste_approxime_sans_ratio** → `FAIL QSI-4 — 3 textes sous le seuil AA attendus (pâle sur pâle, #777 sur blanc 4,48, texte hérité sur carte), 1 rapporté(s)`
- **alt_manquant_ignore** → `FAIL QSI-4 — 0 alt manquant(s) comptés pour 2 images sans alt ; images sans alt sans panne « alt_manquant »`
- **lien_mort_compte_vivant** → `FAIL QSI-5 — lien mort /services non signalé (compté vivant) ; lien mort /casse500 non signalé (compté vivant)`
- **cadence_ignoree** → `FAIL QSI-5 — cadence non tenue : 9 écart(s) sur 10 sous 30 ms (plus petit : 0 ms) pour un intervalle demandé de 60 ms`
- **robots_ignore** → `FAIL QSI-5 — robots.txt ignoré : /prive/archives (Disallow) a été demandé`
- **mention_absente_non_signalee** → `FAIL QSI-6 — sans section mentions légales : absentes [] au lieu des quatre (le nom de l'artisan figure pourtant dans l'en-tête de la page) ; mentions légales absentes sans panne « mentions_absentes » ; SIREN seul manquant : absentes [] au lieu de ["siren"] ; adresse seule manquante : absentes [] a…`
- **liste_des_mentions_supposee** → `FAIL QSI-6 — gabarit qui n'attend que nom et siren : absentes ["adresse"] — la liste doit être lue dans le HTML rendu, pas supposée ; gabarit court : panne « mentions_absentes » à tort`
- **decision_creee_deux_fois** → `FAIL QSI-9 — 6 décision(s) créée(s) pour 4 panne(s) distincte(s) (une décision par panne) ; deux décisions portent la même clé ; 2e passage sur les mêmes pannes dans la même période : 6 décision(s) de plus (idempotence rompue) ; mois suivant : 18 décision(s) au lieu de 12 (la période doit entrer da…`
- **correction_directe_au_lieu_d_une_decision** → `FAIL QSI-9 — correction directe : corriger appelé(s) — le contrôleur propose, il n'agit pas`
- **verdict_visuel_a_un_moteur_cloud** → `FAIL QSI-8 — moteur gratuit : un modèle a été appelé (freellmapi/auto) alors que seul Codex est permis pour une donnée personnelle ; moteur gratuit : statut visuel « mesure » au lieu de non_mesure ; modèle :cloud : un modèle a été appelé (codex/gpt-oss:120b-cloud) alors que seul Codex est permis po…`
