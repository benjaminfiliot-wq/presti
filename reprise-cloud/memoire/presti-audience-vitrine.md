---
name: presti-audience-vitrine
description: "Onglet Visiteurs du Poste (14/09) : mesure d'audience maison sans cookie ni IP, migrations 0090+0091 appliquées par MCP ; ce qui a été refusé (identifier des visiteurs passés), et les 20 défauts qu'une revue adversariale a trouvés avant la prod"
metadata: 
  node_type: memory
  type: project
  originSessionId: 80cc957c-aa60-452a-9898-68b6b198a63a
  modified: 2026-09-14T17:29:09.426Z
---

Le **14/09/2026**, Benj a demandé de voir en direct, depuis /controle, qui visite prestiapp.fr (pas seulement
connexions/inscriptions), et de « choper l'id » des visiteurs passés.

**Refusé et dit** : identifier une personne à partir d'une visite (IP → individu). Aucune donnée ne le permet
(GA jamais branché, Vercel Analytics jamais activé, le middleware ne journalise rien) et ce serait contraire au
RGPD et aux promesses de /confidentialite. Le passé de la vitrine est **irrécupérable** ; seul Search Console
(agrégats, accès à ouvrir par Benj) en garde une trace.

**Construit** : `lib/audience.ts` (liste FERMÉE de 8 pages, hôtes prestiapp.fr/www, CHEMINS_DISCRETS /login
/signup, utm filtrés), `lib/audienceServeur.ts` (empreinte HMAC jour|IP|UA ; clePlafond HMAC jour|réseau /64 ;
minuitParis), `app/Audience.tsx` (sendBeacon oisif ; muet dans l'app native, sous webdriver, GPC/DNT, clé locale
`presti.audience=non`, `?exclure=1` ; entrée = référent extérieur, ni reload ni back_forward),
`app/api/audience` (204 toujours ; plafond par adresse 120/h + 'audience:jour' 20 000 + isBanned),
`app/api/controle/audience` (domaine `audience`, fermé au partenaire ; AUCUN compte nommé, inscriptions = un nombre),
`app/controle/Visiteurs.tsx`, `app/confidentialite/NePasCompter.tsx`, purge étape 8 HORS drapeau
(`audience_cloturer(p_mois)` : verse le jour, efface empreintes, créneaux `audience:%` finis, vues > 13 mois),
suite `scripts/audience-e2e.mjs`. Migrations **0090** et **0091** appliquées le 14/09 par `apply_migration` (MCP
Supabase) sur le feu vert de Benj, après essai à sec (voir [[essai-a-sec-migration]]).

**Why :** exemption de consentement CNIL = sans cookie, anonyme, sans recoupement avec un compte, éditeur seul.
La revue adversariale (workflow, 14 agents) a trouvé que la V1 le violait : fil « En direct » mêlant vues à la
seconde et « Connexion : <nom> » (recoupement), plafond contournable en changeant de user-agent (base gratuite
remplissable), empreinte survivant dans `limites`, phrase fausse sur les pages de conversation (plat_events les
compte), chaque clic compté « arrivée directe », exclusion inopérante sur qg. (localStorage par origine).

**Contre-revue (11 agents)** : 8 défauts de plus, dont le pire était un correctif qui ne faisait que DÉPLACER le
problème — masquer source/appareil/pays sur /signup laissait la ligne d'accueil voisine du même visiteur les porter.
D'où **0092** : le flux ne rend plus que `{a (minute), chemin, entree}` ; les attributs vivent seulement dans les
agrégats 7 j ; campagnes = liste fermée `CAMPAGNES` (+ date), sans /login ni /signup. Aussi : plus d'`isBanned` dans
la route publique (GET PostgREST avec l'IP dans l'URL → journaux Supabase), plafond du jour `audience:jour:<jour Paris>`
signalé dans l'écran (`saturee`), `dejaEntre` posé avant les gardes, textes légaux « détail 13 mois, totaux restent ».

**How to apply :** ne jamais remettre de parcours par visiteur, de noms de comptes, d'attribut de vue ligne par ligne,
ni l'heure à la seconde à côté des visites sans bandeau de consentement. Toute nouvelle page mesurée = PAGES_MESUREES
+ texte de /confidentialite ; toute nouvelle campagne = CAMPAGNES AVANT de diffuser le lien. Un correctif de vie
privée se juge sur la ligne VOISINE, pas seulement sur celle qu'on a masquée.
Voisins : [[presti-state]], [[livrable-colle-a-la-main]], [[presti-orchestre-antigravity]], [[juge-capture-lui-meme]].
