Tu travailles sur l'usine de Presti, dans ~/veille. Écris en français.

MISSION : 24 des 30 entreprises de `prospection/maquettes-2026-09-27/` n'ont pas de téléphone dans le kit d'appel (`KIT-APPEL.md` : « Non renseigné » ; voir aussi `suivi-appels.csv`). Trouve le **numéro professionnel PUBLIÉ** de chacune, avec sa source. Benj appellera.

JUGE : `node juges/juge-telephones-27.mjs` (déjà écrit, NE PAS le modifier). Boucle jusqu'au PASS.

MÉTHODE, dans cet ordre :
1. **Firecrawl `search`** avec `outils/firecrawl.sh` : une requête « <nom> <commune> téléphone », `--limit 3`. Lis le numéro dans les extraits des résultats.
   - **Budget : 60 crédits au plus pour les 24 entreprises.** Compte-les.
2. Si un résultat est le site de l'entreprise ou sa page professionnelle publique (Facebook de l'entreprise, fiche Google de l'entreprise), tu peux lire cette page avec `scrape` (un crédit).
3. **N'aspire jamais une page PagesJaunes**, car ses conditions l'interdisent. Tu peux seulement noter un numéro vu dans l'extrait d'un résultat de recherche (`type_source` = `resultat_recherche`).
4. Vérifie que le numéro correspond bien à CETTE entreprise : même nom et même commune. Sinon, laisse vide.

SORTIES :
- `telephones-trouves.csv`, en-tête exact `n;entreprise;telephone;source;type_source;confiance`. Le numéro s'écrit « [TELEPHONE_MASQUE] ». `type_source` vaut `site_entreprise`, `page_pro_reseau`, `resultat_recherche` ou `annuaire_public`. `confiance` vaut `haute`, `moyenne` ou `basse`.
- Reporte chaque numéro trouvé dans `suivi-appels.csv` (colonne telephone) et dans le bloc de l'entreprise de `KIT-APPEL.md` (ligne « Téléphone : »).
- Ajoute dans `LISEZMOI.md` une section « ## Téléphones (27/09) » : combien trouvés, les crédits consommés, et ceux qui restent introuvables avec la raison.

DONNÉES : seulement des numéros PROFESSIONNELS publiés par l'entreprise ou pour elle. Aucune donnée ne part vers une IA gratuite ni vers un modèle `:cloud`.

INTERDITS : contacter qui que ce soit ; écrire hors de `~/veille/prospection/maquettes-2026-09-27/` ; afficher la clé Firecrawl ; modifier le juge.
