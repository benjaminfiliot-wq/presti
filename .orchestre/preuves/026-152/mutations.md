# 026-152 — contre-vérification des 16 juges de la livraison et de la trésorerie

Passage du 2026-10-05T00:00:33.008Z : 10 faute(s) prise(s), 7/8 témoin(s) vert(s), 5 échec(s), 12 non jouée(s).

## Échecs
- témoin livrer-site : code 124 (délai) — ✅ CH-7 7 ligne(s) de journal, une par exécution (CH-2 : +1, CH-6 : +1), toutes avec commande, duree_s, etapes et issue ; ni nom, ni adresse, ni téléphone, ni SIREN dans le journal ni dans 2 sortie(s)…
- NON PRISE TA-5 (tuile-argent, lib/siteLivraison.ts:236, veilleTresorerie() appelée hors de son try) : code 124 (délai) — aucune ligne « FAIL TA-5 — … » ; aucun bilan « … : FAIL — ids » — fin de sortie : ❌ TA-5 évolution 49753f4c altérée ou ambiguë : lib/siteLivraison.ts ; évolution 6d9a9c5a altérée ou ambiguë : lib/siteLivraison.ts ; lib/siteLivraison.ts (base db6434d) : import ajouté hors contrat : @/lib/siteGenerationDistante → demander…
- NON PRISE AP-6 (achat-public, lib/siteAchatPublic.ts:73, un mot de passe posé au compte public) : code 124 (délai) — aucune ligne « FAIL AP-6 — … » ; aucun bilan « … : FAIL — ids » — fin de sortie : ✅ AP-9 lib/flags.ts porte siteAchatPublic: false ; scripts/fermeture-e2e.mjs porte la ligne de la carte, seule ligne ajoutée depuis 9dca36e ; les 35 drapeaux de FLAGS sont tous dans la carte / ✅ AP-11 tsc --noEmit vert sur 017-achat-public…
- NON PRISE EA-2 (achat-ecrans, app/site/acheter/page.tsx:51, le piège website rendu visible et atteignable) : code 124 (délai) — aucune ligne « FAIL EA-2 — … » ; aucun bilan « … : FAIL — ids » — fin de sortie : ✅ EA-5 suiteSure : 10 cas de b/suite-sure.json (3 gardés, 7 renvoyés vers /outils), plus null et 4 compléments où seul le caractère interdit décide / ✅ EA-6 4 captures sous .orchestre/travail/achat-ecrans-qa/captures (acheter-390x844.png, …
- juge sans mutation prise : livraison-schema

## Non jouées
- livrer-site : 3 faute(s) non jouée(s), le témoin est rouge
- SC-2 (livraison-schema) : budget de temps épuisé
- SC-3 (livraison-schema) : budget de temps épuisé
- tresorerie : budget de temps épuisé avant le témoin
- livraison-tour : budget de temps épuisé avant le témoin
- complement-dossier : budget de temps épuisé avant le témoin
- generation-actions : budget de temps épuisé avant le témoin
- retrait-site : budget de temps épuisé avant le témoin
- poste-sites : budget de temps épuisé avant le témoin
- bus-livraison : budget de temps épuisé avant le témoin
- dossier-zip : budget de temps épuisé avant le témoin
- AP-5 (achat-public) : budget de temps épuisé

## Témoins (juge complet sur la copie intacte, code 0 exigé)
- scripts/lien-connexion-qa.mjs : code 0 en 133.6 s
- scripts/achat-ecrans-qa.mjs : code 0 en 340.6 s
- scripts/achat-public-qa.mjs : code 0 en 375.1 s
- scripts/livrer-site-qa.mjs : code 124 en 540.3 s
- scripts/tuile-argent-qa.mjs : code 0 en 235.9 s
- scripts/commande-exporter-qa.mjs : code 0 en 78.4 s
- scripts/redacteur-v2-qa.mjs : code 0 en 231.3 s
- scripts/livraison-schema-qa.mjs : code 0 en 10.0 s

## Fautes plantées (fichier:ligne · critère attendu · faute · extrait réel du verdict)
- app/api/auth/lien/route.ts:36 · LC-1 · un GET qui consomme le jeton · « FAIL LC-1 — app/api/auth/lien/route.ts exporte GET (le jeton ne se consomme que par un POST) » (code 1, 133.6 s)
- app/connexion/lien/page.tsx:41 · LC-5 · la page poste le jeton au chargement · « FAIL LC-5 — app/connexion/lien/page.tsx : un useEffect poste ou ouvre une session au chargement (« { fetch('/api/auth/lien', { method: 'POST' }); setLienLisib… ») ; app/connexion/lien/page.tsx : un fetch hors d'un gestionnaire de clic (dans LienConnexionPage ; gestionnaires onClick : ouvrirDossier) » (code 1, 202.4 s)
- scripts/commande-exporter.mjs:151 · EX-3 · les métadonnées des photos conservées · « FAIL EX-3 — photos/bibliotheque-480.avif garde un bloc EXIF (186 octets) ; photos/bibliotheque-480.webp garde un bloc EXIF (186 octets) ; photos/bibliotheque-960.avif garde un bloc EXIF (186 octets) ; photos/bibliotheque-960.webp garde un bloc EXIF (186 octets) ; photos/escalier-1600.avif garde un bloc EXIF (364 octets, GPS compris) ; photos/escalier-1600.webp garde un bloc EXIF (364 octets, GPS compris) ; … (14 défauts) » (code 1, 78.4 s)
- lib/suiteSure.ts:2 · EA-5 · suiteSure accepte //evil.fr · « FAIL EA-5 — « adresse relative de protocole » ("//evil.fr") → "//evil.fr", "/outils" attendu » (code 1, 363.0 s)
- app/api/controle/tresorerie/route.ts:20 · TA-2 · des montants additionnés dans la route · « FAIL TA-2 — la route contient .reduce( (ligne 20) » (code 1, 235.9 s)
- scripts/commande-exporter.mjs:52 · EX-7 · une photo d'un autre hôte téléchargée · « FAIL EX-7 — le serveur du juge a reçu 1 requête(s) pour une photo refusée : GET /00000000-0000-4000-8000-000000260292/ailleurs.jpg » (code 1, 78.4 s)
- lib/siteAchatPublic.ts:68 · AP-6 · le lien part vers une adresse lue dans le corps · « FAIL AP-6 — destinataire "autre@fautif.invalid", acheteur-026@presti-test.invalid attendu » (code 1, 446.2 s)
- lib/direction/veilleTresorerie.ts:12 · TA-4 · l'alerte part aussi le mardi · « FAIL TA-4 — « mardi 0 h 30 à Paris (lundi en UTC), 90 % » : 1 alerte(s), 0 attendue » (code 1, 235.9 s)
- lib/siteRedacteur.ts:234 · RV-3 · la dégradation retirée : le texte fautif est gardé · « FAIL RV-3 — fonction, version finale après doublure fautive : findFabrications → 15 ans, RGE » (code 1, 231.3 s)
- lib/siteRedacteur.ts:410 · RV-7 · le SIREN envoyé au modèle · « FAIL RV-7 — requête 1 : le SIREN est envoyé ; requête 2 : le SIREN est envoyé ; requête 3 : le SIREN est envoyé ; requête 4 : le SIREN est envoyé ; requête 5 : le SIREN est envoyé ; requête 6 : le SIREN est envoyé ; … (9 défauts) » (code 1, 231.3 s)

