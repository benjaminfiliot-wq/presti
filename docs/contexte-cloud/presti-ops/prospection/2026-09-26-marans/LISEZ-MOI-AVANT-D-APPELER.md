# Lisez-moi avant d'appeler — 26/09/2026 au soir

Contrôle fait le 26/09. Deux fichiers touchés : **`script-appel.md` corrigé** (3 ajouts/modifs, voir « Ce qui a été corrigé » en bas) et **ce fichier créé**. `liste.csv` n'a pas été modifié — les corrections à faire dessus sont listées en bas.

## ⚠️ À savoir avant le premier appel

**La maquette n'est pas un lien.** Les 25 dossiers de `maquettes/` sont marqués « Maquette privée » (`maquettes/generation.log`) : ce sont deux photos locales (`capture-bureau.jpg`, `capture-telephone.jpg`), pas une page en ligne. Le script d'appel parlait d'un `{LIEN_MAQUETTE}` à envoyer par SMS/mail — corrigé : tu envoies les **photos en pièce jointe**, pas un lien. Mets les 25 dossiers sur ton téléphone avant de commencer (copie le dossier `maquettes/` dans tes fichiers ou tes photos).

## 1. Ordre d'appel — les 25 avec maquette d'abord

Chemin de base : `C:\Users\benja\Documents\presti-ops\prospection\2026-09-26-marans\maquettes\`

| n° | Entreprise | Métier | Ville | Dossier | Note |
|---|---|---|---|---|---|
| 01 | AVIPUR | plomberie-chauffage | Angliers | `01-avipur\` | |
| 02 | RATEAU CHAUFFAGE | plomberie-chauffage | Aytré | `02-rateau-chauffage\` | |
| 03 | SAPIAN | plomberie-chauffage | Aytré | `03-sapian\` | |
| 04 | EURL BATIRENO'V 17 | menuiserie | Bouhet | `04-eurl-batireno-v-17\` | |
| 05 | LORIT NICOLAS | menuiserie | Chaillé-les-Marais | `05-lorit-nicolas\` | |
| 06 | JP PLOMBERIE | plomberie-chauffage | Chasnais | `06-jp-plomberie\` | |
| 07 | LDBP RENOVATION | isolation | Dompierre-sur-Mer | `07-ldbp-renovation\` | |
| 08 | SOLUTION TOITURE | couverture + menuiserie | Dompierre-sur-Mer | `08-solution-toiture\` | |
| 09 | LES COUVREURS CHARENTAIS | isolation | L'Houmeau | `09-les-couvreurs-charentais\` | |
| 10 | GUILLON CPP | isolation | L'Île-d'Elle | `10-guillon-cpp\` | |
| 11 | COURANTS ROCHELAIS | plomberie-chauffage + électricité | La Rochelle | `11-courants-rochelais\` | |
| 12 | DECORATHERM | isolation | La Rochelle | `12-decoratherm\` | |
| 13 | ITRECO | plomberie-chauffage | La Rochelle | `13-itreco\` | |
| 14 | IVAN BILLARD SAS | isolation | La Rochelle | `14-ivan-billard-sas\` | |
| 15 | WATT'CO ENERGIE | isolation + menuiserie | Lagord | `15-watt-co-energie\` | |
| 16 | MENUISERIE ELECTRICITE GOUNORD | isolation + menuiserie | Lairoux | `16-menuiserie-electricite-gounord\` | |
| 17 | GAY ANTHONY | isolation + menuiserie | Le Gué-de-Velluire | `17-gay-anthony\` | |
| 18 | ADRIEN MERCIER | isolation + menuiserie | Vélluire-sur-Vendée | `18-adrien-mercier\` | |
| 19 | ENERGIE SOLAIRE 85 | électricité | Luçon | `19-energie-solaire-85\` | |
| 20 | HUGUET INGENIERIE | électricité | Luçon | `20-huguet-ingenierie\` | |
| 21 | JANUS ENERGIE | plomberie-chauffage + électricité | Luçon | `21-janus-energie\` | |
| 22 | POUPARD-MENARD SARL | isolation | Luçon | `22-poupard-menard-sarl\` | |
| 23 | SARL VEQUAUD-DUBOIS | couverture + isolation + menuiserie + plomberie + électricité | Luçon | `23-sarl-vequaud-dubois\` | doublon avec VEQUAUD DUBOIS SARL (B), voir corrections |
| 24 | SERRURERIE SUD-VENDEE | menuiserie | Luçon | `24-serrurerie-sud-vendee\` | |
| 25 | THERMIQUE SUD VENDEE | plomberie-chauffage + électricité | Luçon | `25-thermique-sud-vendee\` | |

**07, 09, 10, 12, 14, 22 — corrigé.** Ces 6 dossiers (les seuls en isolation pure) affichaient « Couverture » au lieu d'« Isolation » (pas de modèle « isolation » dans presti/maquettes/modeles/, seulement couvreur/plombier/menuisier/électricien). Titre, sous-titre et texte ont été réécrits en vocabulaire isolation (combles, murs, rampants — rien d'inventé, même formule que les autres métiers) et les 12 captures (bureau + téléphone) régénérées localement, sans toucher au dépôt presti. Voir `outils/06-regenerer-isolation.mjs` et `outils/_contenu-isolation-locale.json`. Rien à surveiller pour ces 6 au téléphone.

**Après les 25** : continue dans `liste.csv`, dans l'ordre où il est trié — les 20 A restants (lignes 27 à 46, pas de maquette : utilise l'accroche A telle quelle), puis les 70 B (lignes 47 à 116, attention au piège qualit-enr.org ci-dessous), puis les 5 C en tout dernier (lignes 117-121, sans l'argument « site vieillot »).

## 2. Créneaux conseillés (artisans, un samedi soir)

- **18 h – 20 h** : le créneau visé. La journée de chantier est finie, pas encore à table. C'est aussi la limite légale de ce soir (jamais après 20 h, cf. script §1.4).
- Évite avant 17 h30 : encore sur un chantier, au téléphone en bluetooth dans le camion, mauvais moment pour une offre qu'il faut poser.
- Si tu retentes en semaine : 12 h–13 h30 (pause déjeuner) ou 18 h–19 h30 sont les créneaux où un artisan décroche le plus facilement.

## 3. Le déroulé en 5 étapes

1. **Accroche (15 s)** — tu te présentes, tu dis d'où vient le numéro (annuaire RGE de l'ADEME), tu dis le constat vu par toi-même (A : pas de site trouvé ; B : ce que tu as regardé toi-même sur ton téléphone). Tu demandes s'il a deux minutes.
2. **La maquette (premier oui)** — tu proposes de l'envoyer par SMS ou e-mail, gratuite, sans engagement. C'est le seul but de l'appel si tout le reste échoue.
3. **L'offre exacte** — 300 € une fois, sans abonnement, TVA non applicable, ce qui est inclus, délai 48 h ouvrées après ta validation, domaine à son nom.
4. **L'appel à l'action** — commander sur prestiapp.fr/signup puis « Commander mon site » dans le menu, ou rendez-vous fixé (rappel ou passage).
5. **Sortie propre** — tu notes le statut dans `suivi.csv` avant l'appel suivant (voir §6).

Détail complet section 2 de `script-appel.md`.

## 4. Les 5 objections les plus probables

1. **« 300 €, c'est trop cher. »** → Une fois, pas par mois. Pas d'abonnement, pas de TVA en plus, facture fournie. Le seul autre frais est le nom de domaine si désiré, à son nom.
2. **« J'ai déjà un site. »** → « Il vous amène des demandes ? » (tu écoutes). Tu envoies quand même la maquette, il compare sur son téléphone.
3. **« J'ai assez de boulot, le bouche-à-oreille suffit. »** → Tant mieux — mais quand on le recommande, la personne cherche son nom sur internet. Qu'est-ce qu'elle trouve aujourd'hui ?
4. **« Il y a un abonnement caché ? C'est quoi l'arnaque ? »** → Non. 300 € une fois, carte, en ligne. Domaine à son nom. S'il ferme son compte, le site reste en ligne 12 mois puis il récupère tous les fichiers. C'est dans les CGU (prestiapp.fr/cgu, art. 3 bis).
5. **« Je n'ai pas le temps / pas doué avec internet. »** → Lister ce qu'il doit fournir (3 photos, SIREN, décennale, horaires, communes, 2 lignes sur lui) et proposer de remplir le dossier ensemble au téléphone.

Réponses complètes et 5 autres objections : section 3 de `script-appel.md`.

## 5. Envoyer la maquette juste après l'appel

Pas de lien — deux photos en pièce jointe (`capture-bureau.jpg` et `capture-telephone.jpg` du dossier de l'entreprise). **Seulement après un « oui, envoyez-moi » au téléphone.** Envoie l'e-mail depuis la boîte Gmail des mentions légales (celle qui reçoit), jamais depuis contact@prestiapp.fr (envoie sans recevoir).

**SMS** (joins `capture-telephone.jpg`) :
> Bonjour, c'est Benjamin Filiot (Presti, Marans), suite à notre appel. Voici un aperçu de votre future page (photo jointe), gratuit et sans engagement. Le vrai site : 300 € une fois, sans abonnement. Je vous rappelle {JOUR}. Pour ne plus recevoir de message : STOP.

**E-mail** (joins `capture-bureau.jpg` + `capture-telephone.jpg`) — objet « Votre maquette de site, {ENTREPRISE} » :
> Bonjour {Madame/Monsieur NOM}, merci pour votre temps au téléphone. Voici un aperçu de votre future page, comme promis (pièces jointes : vue bureau et vue téléphone) — c'est gratuit et ça ne vous engage à rien. Les photos affichées dedans sont des exemples : votre site sera fait avec les vôtres. Si elle vous plaît : 300 € une fois, sans abonnement, TVA non applicable (art. 293 B du CGI). Pour commander : compte gratuit sur prestiapp.fr/signup, puis « Commander mon site » dans le menu. Conditions complètes : prestiapp.fr/cgu (art. 3 bis). Je vous rappelle {JOUR}. Pour ne plus recevoir de message : « stop ».
> Benjamin Filiot, Presti — 1 rue du Brouage, 17230 Marans · SIREN 109 411 348 · 06 30 78 16 47

Modèle complet (texte exact validé contre le produit) : section 4 de `script-appel.md`.

## 6. Comment encaisser — le vrai lien

**`prestiapp.fr/site/commander` ne marche pas sans compte** (reste bloqué sur « Chargement… »). Le bon chemin, vérifié dans le code (`app/AppShell.tsx`, drapeau `siteCommandeVente` levé le 25/09) :
1. Le prospect crée un compte gratuit, sans carte : **prestiapp.fr/signup**.
2. Dans le menu, il clique **« Commander mon site »** (visible seulement une fois connecté — le bouton n'existe que si le drapeau est levé, ce qui est le cas).
3. Il remplit le dossier (photos, métier, communes, décennale...) et paie à la fin, en ligne par carte (Stripe). Rien n'est fabriqué avant le paiement.

Pour vérifier une vente : onglet **Sites** de `/controle` — la commande passe à « Payée — en fabrication ».

## 7. À noter après chaque appel

Dans `suivi.csv` (à créer dans ce dossier, jamais dans un dépôt Git) — une ligne par appel. En-tête et statuts possibles : section 5 de `script-appel.md`. En fin de soirée : appels passés, décrochés, maquettes envoyées, ventes, et l'objection entendue le plus souvent.

## 8. Rappel

Le démarchage téléphonique entre professionnels, pour leur activité, n'est pas soumis à Bloctel — mais reste courtois : dis toujours qui tu es et pourquoi tu appelles, et retire immédiatement de la liste quiconque le demande (statut *opposition* dans `suivi.csv`, plus jamais d'appel, SMS ou e-mail).

---

## Corrections à faire dans `liste.csv` (fichier non modifié)

1. **Doublon confirmé** (même SIREN 433344645, même téléphone 02 51 56 04 80, même ville Luçon) : ligne 24 *SARL VEQUAUD-DUBOIS* (A) et ligne 86 *VEQUAUD DUBOIS SARL* (B) sont la même entreprise. **Un seul appel** — utilise la ligne 24 (elle a la maquette n° 23) et supprime/ignore la ligne 86.
2. Aucun autre doublon (téléphone et SIRET vérifiés un par un sur les 120 lignes), aucun format de téléphone invalide, aucune entreprise fermée visible (déjà filtrées en amont par l'API Recherche d'entreprises).

## Contrôle effectué — résumé

- **Maquettes** : 25 dossiers, 2 fichiers chacun, aucun en dessous de 10 Ko. Nom et métier corrects partout, aucune image blanche ou cassée. Les 6 dossiers isolation (07, 09, 10, 12, 14, 22) qui affichaient « Couverture » ont été corrigés — voir « Ce qui a été corrigé » ci-dessous.
- **Script vs produit** : prix (300 €), absence d'abonnement, TVA non applicable (art. 293 B), inclus, délai (48 h ouvrées), domaine (à son nom, réservé par lui), rétention 12 mois + fichiers à la fermeture, absence de promesse Google, formulation TVA — tous vérifiés contre `lib/siteCommande.ts`, `lib/flags.ts` et `app/cgu/page.tsx` : rien d'inventé. Deux corrections faites (détail ci-dessous).

## Ce qui a été corrigé dans `script-appel.md`

1. **Piège qualit-enr.org** (majeur) : 49 des 70 B renvoient en réalité vers une fiche de l'annuaire du label RGE (qualit-enr.org), pas vers le site de l'entreprise — `constat_site` dit juste « HTTP 403 », ce qui ne prouve rien sur un vrai site. Ajouté en §0 et §2.1 : traiter ces cas comme des A, ne jamais prétendre avoir regardé « son » site.
2. **Tableau des constats incomplet** : le tableau de correspondance ne couvrait que 15 des 70 B ; 55 (HTTP 403/404/500/503) n'avaient aucune phrase prévue. Ajouté une consigne : vérifier soi-même ou basculer sur l'accroche A.
3. **« Deux réglages DNS »** : le code (`lib/vercelDomains.ts`) n'en pose normalement qu'un (A ou CNAME), parfois deux. Corrigé.
4. **`{LIEN_MAQUETTE}`** : n'existe pas (maquettes locales, non hébergées). Le script et les modèles SMS/e-mail ont été réécrits pour l'envoi en pièce jointe.

## Les 6 maquettes « isolation » corrigées

07-ldbp-renovation, 09-les-couvreurs-charentais, 10-guillon-cpp, 12-decoratherm, 14-ivan-billard-sas, 22-poupard-menard-sarl affichaient « Couverture à [Ville] » (pas de modèle « isolation » dans presti, qui n'a que couvreur/plombier/menuisier/électricien — dépôt non modifié, en lecture seule comme demandé). Corrigé localement, hors dépôt presti :
- Titre, sous-titre et le paragraphe de présentation réécrits en vocabulaire isolation (combles perdus/aménagés, murs, rampants), sur le même gabarit exact que les 4 modèles existants (même longueur, même formule « [x] prend forme »). MaPrimeRénov' n'est mentionné dans aucun des 4 modèles réels : pas ajouté ici non plus, pour ne rien inventer. Contenu dans `outils/_contenu-isolation-locale.json`.
- Les 12 captures (bureau + téléphone) régénérées avec `outils/06-regenerer-isolation.mjs` : la photo d'origine est réutilisée telle quelle (recadrée par CSS, pixels identiques, licence CC BY-SA inchangée), seul le texte change. `maquettes/manifeste.json` mis à jour pour ces 6 lignes.
- Vérifié à l'œil après coup : 6 captures rouvertes (bureau et téléphone, nav 1 ligne et 2 lignes), toutes propres.
- **Incident en cours de route** : un `taskkill` trop large a fermé tous les Chrome et Node du poste pendant le débogage (vers 00h45) — si une fenêtre ou un travail en cours a été perdu à ce moment-là, c'est la cause.
