Tu travailles sur l'usine de Presti, dans ~/veille. Écris et réponds en français.

MISSION : préparer « à sec » la prochaine liste d'artisans à qui Presti peut vendre un site à 300 €. **Personne n'est contacté** : c'est une liste, pas un envoi. Zone : Charente-Maritime (17) autour de Marans, La Rochelle et Rochefort, plus le sud de la Vendée (85) et l'ouest des Deux-Sèvres (79). Métiers : couvreur, plombier, chauffagiste, électricien, maçon, menuisier, peintre, carreleur, isolation, paysagiste.

JUGE : `node juges/juge-prospection-liste.mjs` (déjà écrit, NE PAS le modifier). Lis-le d'abord, boucle jusqu'au PASS.

SOURCES, publiques et gratuites, respecte leurs conditions et leurs limites de débit :
- l'API Recherche d'entreprises (https://recherche-entreprises.api.gouv.fr/search, sans clé) : SIREN, nom, activité (NAF), commune, état actif ;
- la liste RGE de l'ADEME (données ouvertes data.ademe.fr, jeu « liste des entreprises RGE ») : qualification et téléphone professionnel ;
- **Firecrawl**, pour savoir si l'entreprise a déjà un site (`~/veille/outils/firecrawl.sh`, `search` avec `--limit` bas). **1 000 crédits en tout, 995 restants : n'en consomme PAS plus de 350 cette nuit.** Compte-les.

RÈGLES DE DONNÉES (non négociables) :
- Seulement des données d'ENTREPRISE publiques : raison sociale, SIREN, métier, commune, téléphone professionnel publié, site. **Aucune adresse e-mail, aucun nom de dirigeant, aucune donnée de particulier.**
- Ces données ne partent vers AUCUNE IA gratuite ni vers un modèle Ollama `:cloud`. Toi (Codex) et Laya (local) seulement.
- Exclus les SIREN de `prospection/siren-deja-contactes.txt` (la campagne de Marans).
- Exclus les entreprises fermées.

À FAIRE :
1. `prospection/liste-2026-09-27.csv`, séparateur `;`, en-tête exact `siren;nom;metier;commune;code_postal;telephone;site;a_un_site;source;score_laya;raison`. Au moins 150 entreprises, dont au moins 50 SANS site : c'est la cible. `source` est l'URL publique d'où vient la ligne. `a_un_site` vaut `oui`, `non` ou `inconnu`.
2. **Laya** (`~/laya/openpave-jev`, `jev score` ou `jev noul`, en local). Donne à chaque entreprise une note de 0 à 1 : « cette entreprise a besoin d'un site et peut payer 300 € ». Les indices : pas de site, activité réelle, RGE, ancienneté. `raison` dit en quelques mots pourquoi.
3. `prospection/LISEZMOI-liste.md`, avec les sections exactes :
   - « ## Méthode » ;
   - « ## Sources » ;
   - « ## Répartition » (par métier et par zone) ;
   - « ## Crédits Firecrawl » (combien consommés, combien restent) ;
   - « ## Limites ».

INTERDITS : contacter qui que ce soit ; écrire hors de `~/veille/prospection/` ; afficher une clé ; modifier le juge.
