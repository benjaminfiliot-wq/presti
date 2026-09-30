# 026-027 — contre-vérification indépendante (nuit du 28/09)

Verifier `node scripts/orchestre.mjs verifier 026-027` : PASS (138 s, LC-1…LC-7, LC-9, LC-PV), sans passer par verifier-isole.
Aucune trace de sabotage antérieure dans ce dossier (seuls avant.txt et verifier.log) : six nouveaux sabotages réversibles.

Méthode : copie du fichier dans le scratchpad, remplacement unique d'une chaîne, `node --import ./scripts/ts-loader.mjs scripts/lien-connexion-qa.mjs`,
restauration par copie, `sha256sum -c` des trois fichiers de la fiche après chaque essai, et empreinte de `git diff` avant/après : identique.

| # | Sabotage | Critère rougi | Restauration |
|---|----------|---------------|--------------|
| S1 | route : contrôle `FORME_TH` neutralisé (`false && …`) | LC-3 (th non hexadécimal / trop court → 200 et verifyOtp appelé) | sha OK |
| S2 | route : `marquerSessionVerifiee(…, 'appareil')` au lieu de `'code_email'` | LC-2 (ordre/moyen introuvable) + LC-3 (moyen « appareil » observé) | sha OK |
| S3 | lib : comparaison sans `toLowerCase()` sur l'adresse stockée | **aucun** (reste vert, code 0) | sha OK |
| S4 | lib : garde `is_founder` neutralisée | LC-6 (fondateur rattaché, pas de notification) + LC-7 (tsc) | sha OK |
| S5 | route : `PLAFOND = 21` | LC-3 (21e appel → 200, 429 attendu) | sha OK |
| S6 | page : `useEffect` qui poste le jeton au chargement | LC-5 (un useEffect poste au chargement) | sha OK |

Résultat : 5 sabotages sur 6 rougis sur le bon critère. Le juge exécute réellement la route et la fonction contre des doublures
(pas un simple test de présence).

Défaut mineur (S3) : LC-6 ne met les majuscules que du côté de l'adresse de session ; la fixture stocke l'adresse en minuscules.
Une commande dont l'e-mail stocké a une casse différente n'est donc pas couverte. Le code actuel est correct (il met les deux côtés en minuscules) ;
à ajouter au juge : un cas avec l'adresse stockée en casse mixte (hors périmètre de cette fiche : scripts/ interdits).
