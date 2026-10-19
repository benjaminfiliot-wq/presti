# Refonte 18/10 — Inventaire du contenu de la landing, bloc par bloc

Source : `app/page.tsx` au commit `8ade943` (identique à l'arbre de travail), les composants qu'elle monte, et le rendu de
production relevé le 18/10 (`presti-ops/refonte-1018/avant/landing-mesures.json`, contenu texte de chaque section).
Destinations : voir `ARCHITECTURE.md`. Codes :

- **L1 … L10** : les 10 sections de la nouvelle landing (L1 Héros, L2 Preuve, L3 Comment ça marche, L4 Fonctionnalités,
  L5 Pour qui, L6 Confiance, L7 Tarifs, L8 Maquette, L9 Questions, L10 Appel final + pied).
- **/offres** : page publique des offres détaillées (le prompt dit `/tarifs`, adresse déjà prise par la console, voir
  ARCHITECTURE §2.3). **/comparatif**, **/faq**, **/confidentialite** : pages dédiées.
- Statut : **garde** (texte inchangé), **déplace** (texte inchangé, autre place), **fusionne** (deux blocs disent la même
  chose ; on garde la formulation la plus complète, l'autre devient un renvoi), **raccourcit** (même fait, moins de mots ;
  la version longue reste sur une page dédiée). **Rien n'est supprimé sans destination.**

Règle de relecture avant intégration (étape 6) : chaque phrase repasse par `plans/promesses-2026-10.md`. Les montants et noms
fictifs restent marqués « exemple ».

## 0. Balisage invisible (SEO)

| # | Bloc actuel | Contenu | Destination | Statut |
|---|---|---|---|---|
| 0.1 | JSON-LD `FAQPage` | `FAQ.slice(0, 8)` | L9 : **doit suivre les questions réellement affichées** (5 sur la landing) ; le `FAQPage` complet (10) part sur /faq | déplace (Google veut voir à l'écran ce que le balisage décrit, `page.tsx:389`) |
| 0.2 | JSON-LD `SoftwareApplication` | « Dès l'offre Studio, chaque demande… vous l'envoyez. » + offre « Essai gratuit » | landing (inchangé) | garde |
| 0.3 | JSON-LD `Organization` + `WebSite` | nom, logo, url | landing (inchangé) | garde |
| 0.4 | Vérification Google Search Console | `metadata.verification` sur la landing seule | landing (jamais /site ni /p) | garde |

## 1. Navigation (`PublicNav accueil`)

| # | Contenu | Destination | Statut |
|---|---|---|---|
| 1.1 | Logo Presti → `/` | L1 en-tête | garde |
| 1.2 | Fonctionnalités `#fonctionnalites` | en-tête → L4 | garde |
| 1.3 | Tarifs `#tarifs` | en-tête → L7 | garde |
| 1.4 | FAQ `/faq` | en-tête | garde |
| 1.5 | Nous écrire `/contact` | en-tête (ordinateur) + pied | garde |
| 1.6 | Se connecter `/login` (« Connexion » en 390) | en-tête | garde |
| 1.7 | Essayer gratuitement `/signup` (« Essayer » en 390) | en-tête, en **bouton secondaire** (un seul bouton principal par écran : celui du héros) | garde, change de poids |
| 1.8 | (nouveau) Comment ça marche `#comment`, Comparatif `/comparatif` | en-tête | ajout |

## 2. Section 1 actuelle — Héros

| # | Contenu | Destination | Statut |
|---|---|---|---|
| 2.1 | Sur-titre « Assistant IA pour les artisans du bâtiment » | L1 | garde |
| 2.2 | H1 « Le premier qui répond décroche le chantier. » | L1 | garde |
| 2.3 | Chapeau court (390) « Chaque demande faite par votre lien a sa réponse prête : vous l'envoyez (dès l'offre Studio). » | L1 (toutes largeurs) | garde |
| 2.4 | Chapeau long (≥ 1024) : lien Google/Facebook/signature, réponse < 1 min dans votre ton, devis sur vos prix, 3 relances J+2/J+5/J+10, facture, « plateforme dès Studio ; devis IA et facture dès Essentiel » | L1 : version raccourcie (2 lignes) ; les faits détaillés vont à L3 (étapes 1-4) et L7 (qui a quoi par offre) | raccourcit (aucun fait perdu : chacun a sa slide ou sa ligne d'offre) |
| 2.5 | Bouton « Essayer gratuitement » `/signup` | L1 bouton principal | garde |
| 2.6 | Bouton « Voir ce que ça fait » `#fonctionnalites` | L1 bouton secondaire « Voir comment ça marche » → `#comment` | garde (libellé et cible ajustés) |
| 2.7 | « 3 crédits offerts · sans carte bancaire · ensuite dès {PRIX_MIN} € par mois, sans engagement » | L1 sous les boutons | garde |
| 2.8 | `ObjetVivant` (anneau WebGL) | L1 fond, **allégé** ou remplacé selon la piste (poids sur le TBT, texte posé dessus) ; repli statique | garde, à arbitrer (DIRECTION.md) |
| 2.9 | `HeroApp` : demande « Marie · 14:02 », réponse préparée « à valider par l'artisan », devis 3 lignes 873,40 € « PDF conforme · DEV-2026-0042 » | L1 démo produit, **au-dessus de la ligne de flottaison en 1440** | garde |
| 2.10 | Étiquettes « Devis PDF prêt », « Relance J+2 planifiée », « Facture en un clic » | L1 autour de la démo | garde |

## 3. Section 2 — Bande de mots (`BandeMots`)

| # | Contenu | Destination | Statut |
|---|---|---|---|
| 3.1 | Défilé « Prépare la réponse · Chiffre le devis · Facture · Relance le client · Range la compta · Vous relisez » | L1, bas du héros (une ligne) ou supprimé visuellement | fusionne avec L1 |
| 3.2 | Texte lecteur d'écran « Presti prépare la réponse, chiffre le devis, facture, relance le client et range la compta. Vous relisez avant d'envoyer. » | L1 (`sr-only` conservé) | garde |

## 4. Section 3 — Réassurance

| # | Contenu | Destination | Statut |
|---|---|---|---|
| 4.1 | **Rapide** — « Réponse prête en moins d'une minute : vous l'envoyez (dès {Studio}) » | L1 pastille « Rapide » ; phrase complète en infobulle/texte de la pastille sur ordinateur ; le fait est aussi en L3 étape 2 | déplace |
| 4.2 | **Fiable** — « Devis conformes, dans votre ton » | L1 pastille | déplace |
| 4.3 | **Sécurisé** — « Vos données isolées, chiffrées » | L1 pastille (lien vers L6) | déplace |
| 4.4 | **Sans carte** — « Essai offert, résiliable » | L1 pastille | déplace |

## 5. Section 4 — Preuve

| # | Contenu | Destination | Statut |
|---|---|---|---|
| 5.1 | « 7× » (compteur animé) | L2 | garde |
| 5.2 | « plus de chances d'obtenir un vrai échange avec le client en répondant dans l'heure plutôt qu'en attendant. Avec la plateforme (dès Studio), Presti prépare la réponse… vous l'envoyez. » | L2 | garde |
| 5.3 | **Source** « Harvard Business Review, « The Short Life of Online Sales Leads » (étude sur 2 241 entreprises) » | L2, visible (pas en note repliée) | **garde, obligatoire** |

## 6. Section 5 — `#comment` La chaîne complète

| # | Contenu | Destination | Statut |
|---|---|---|---|
| 6.1 | Sur-titre « La chaîne complète » + H2 « De la demande à la compta, sans rien ressaisir. » | L3 titre | garde |
| 6.2 | « L'IA prépare chaque étape. Vous relisez, vous envoyez. La plateforme (…) commence avec Studio ; le devis et la facture, dès Essentiel. » | L3 chapeau | garde |
| 6.3 | Étape 01 · 22 h 14 « La demande arrive. » + texte + visuel « Nouvelle demande · exemple » Mme Garnier | L3 slide 1 | garde |
| 6.4 | Étape 02 · 22 h 15 « La réponse est prête. » + texte (« sans inventer de prix ni de créneau ») + visuel « Préparée par l'IA · à relire » | L3 slide 2 | garde |
| 6.5 | Étape 03 · 7 h 31 « Le devis, sur vos prix. » + texte + visuel « Devis · exemple fictif » 4 lignes, 1 240,00 € | L3 slide 3 | garde |
| 6.6 | Étape 04 · Ensuite « Relances, facture, compta. » + « Trois relances prévues (J+2, J+5, J+10) après la réponse au client… » + fil (4 coches) | L3 slide 4 | garde (la précision « relances de la conversation », `page.tsx:102-104`, reste vraie) |

## 7. Section 6 — `#fonctionnalites` « De 22 h 14 à 7 h 52 »

| # | Contenu | Destination | Statut |
|---|---|---|---|
| 7.1 | Sur-titre « 01 Une demande arrive », H2 « Ce qui se passe, de 22 h 14 à 7 h 52. », chapeau (« Des scènes prises sur le vrai produit », plateforme dès Studio, règle Signature) | L3 : la frise horaire devient la colonne de gauche des slides ; « scènes prises sur le vrai produit » devient la légende de la démo | fusionne avec 6.1-6.2 (même histoire racontée deux fois aujourd'hui) |
| 7.2 | `DemoSequence` scènes 1-4 (22 h 14 client écrit · 22 h 14 l'assistant répond seul (Studio) · 7 h 50 vous ouvrez votre espace · 7 h 52 vous validez, le client accepte, acceptation horodatée) | L3 : **la démo de droite des 4 slides** (une scène par slide), captures réelles inchangées | déplace |
| 7.3 | Note « Captures du produit réel : rien n'est dessiné. » | L3 légende | garde |
| 7.4 | `DemoSequence` scènes Signature : assistant qui fait le devis, CRM carte Atelier, frise du chantier et argent, « Rien n'est oublié » | L4 onglet « Gestion (assistant et CRM) » — **seulement si `assistant` et `crm` sont levés** (ils le sont au 18/10) | déplace |
| 7.5 | `DemoSequence` scène « Votre site · Tout ça, à votre marque » (300 €, une fois, jamais notre nom) | L4 onglet « Votre site » | déplace |
| 7.6 | `DemoGestion` : H2 « L'assistant qui agit, le CRM qui voit tout. », 2 vidéos (« L'assistant qui fait le devis pour vous », « La carte Atelier du CRM »), notes « Offre Signature. Capture réelle… sans son ; l'attente de l'assistant est accélérée » et « … données d'exemple fictives » | L4 onglet « Gestion » (sous drapeaux `assistant` && `crm`) | déplace, **notes obligatoires gardées** |
| 7.7 | `DemoSite` : « En option : le site », H2 « Un site qui donne envie d'appeler. », texte Atelier Lestraque fictif, affiche/vidéo, lien « Voir le site de démonstration » | L4 onglet « Votre site » (sous `landingDemoSite`) | déplace |
| 7.8 | **Crédits photo** « Photos de la démo : Wikimedia Commons, sous licences libres ; vidéo d'atelier : Mixkit — auteurs et licences » (lien vers les mentions du site démo) | L4 onglet « Votre site », sous la démo | **garde, obligatoire** |
| 7.9 | « Le site, à la demande : 300 €, une fois. » (`ds-prix`) | L4 onglet « Votre site » + L7 | fusionne avec 12.9 |

## 8. Section 7 — `#chiffres` Vos chiffres

| # | Contenu | Destination | Statut |
|---|---|---|---|
| 8.1 | Sur-titre « 02 Fin de mois », H2 « Vos chiffres, sans tableur. », chapeau (calculé à partir de vos devis et factures, dès Studio) | L4 onglet « Chiffres » | déplace |
| 8.2 | `DemoChiffres` (vrai écran, artisan fictif : facturé mois par mois, votre argent, devis sur 12 mois, délai moyen, devis à relancer, demandes par canal, types de chantier, villes) | L4 onglet « Chiffres » | déplace |
| 8.3 | Note de calcul « Facturé : factures émises, avoirs et factures annulées exclus… Calculé le … » | L4 onglet « Chiffres » | **garde** |
| 8.4 | « Le vrai écran, calculé sur un artisan fictif : noms, montants et villes sont inventés. » | L4 onglet « Chiffres » | **garde, obligatoire** |

## 9. Section 8 — `#compta` Comptabilité

| # | Contenu | Destination | Statut |
|---|---|---|---|
| 9.1 | Sur-titre « 03 Comptabilité », H2 « Votre compta, rangée par l'IA. », chapeau (« Les montants, eux, sont calculés, jamais devinés. Dès Studio. ») | L4 onglet « Compta » | déplace |
| 9.2 | `DemoCompta` : AVANT (fichiers en désordre), étapes de l'IA (8), « Le point de l'assistant » (4 phrases), tableur (15 lignes, 4 vues, « Télécharger en Excel ») | L4 onglet « Compta » ; sur téléphone le tableur passe en défilement horizontal interne | déplace |
| 9.3 | « Exemple sur un plombier fictif : noms et montants inventés. La réponse de l'assistant est écrite d'avance pour cette page ; les étapes, les totaux et le bilan sortent du vrai moteur de calcul. » | L4 onglet « Compta » | **garde, obligatoire** |

## 10. Section 9 — `#pour-qui`

| # | Contenu | Destination | Statut |
|---|---|---|---|
| 10.1 | Sur-titre « 04 Pour qui », H2 « Pour l'artisan qui est sur le chantier quand le client écrit. » | L5 | garde |
| 10.2 | « Quatre métiers, quatre demandes types, écrites pour l'exemple : ce ne sont pas des clients. » | L5 | **garde, obligatoire** |
| 10.3 | Plombier-chauffagiste / Électricien / Menuisier / Couvreur : demande type + phrase « ce que Presti en fait » | L5 sélecteur de métier (pastilles) : la demande et la phrase changent avec la pastille ; sans JS, les 4 restent lisibles en liste | garde (même texte) |

## 11. Section 10 — `#confiance` (sous `supportArtisan`, levé)

| # | Contenu | Destination | Statut |
|---|---|---|---|
| 11.1 | « 05 Et nous, on voit quoi ? », H2 « Rien. Sauf si vous ouvrez vous-même. », chapeau | L6 | garde |
| 11.2 | 4 tuiles : La porte naît fermée · La forme, jamais le fond · Chaque coup d'œil est écrit · Un verrou, si vous préférez (textes intégraux) | L6 bento 4 tuiles | garde |
| 11.3 | « Ce n'est pas un paragraphe dans des conditions générales. C'est du code, et il refuse. » | L6 | garde |
| 11.4 | (nouveau) lien « Comment nous traitons vos données » → `/confidentialite` | L6 | ajout |

## 12. Section 11 — `#tarifs`

| # | Contenu | Destination | Statut |
|---|---|---|---|
| 12.1 | « 06 Abonnements », H2 « Simple : un forfait mensuel, avec des crédits inclus. », chapeau (pas de recharge à l'unité) | L7 | garde |
| 12.2 | 3 cartes d'offre (`OFFRES`) : nom, prix/mois, crédits/mois, « N jours gratuits, sans carte », « TVA non applicable, art. 293 B du CGI », accroche | L7 | **garde** (mention TVA obligatoire sur chaque carte) |
| 12.3 | `OffreDetail` de chaque carte (liste complète « Ce qui est inclus » par rubrique, ~10-20 lignes par offre) | L7 : **les 4-5 lignes qui distinguent l'offre** + « Tout le détail » → /offres ; la liste complète, inchangée, sur /offres | raccourcit (version intégrale sur /offres) |
| 12.4 | Boutons « Essayer 7/14/21 jours gratuits » | L7 : un seul bouton principal (Studio, l'offre mise en avant), les deux autres en secondaire | garde |
| 12.5 | Liens « Ou vous abonner directement, sans essai » (`/signup?abonnement=…`, attribut `data-payer-direct`) | L7 sous chaque carte | **garde** (chemin de paiement direct, testé par les suites) |
| 12.6 | Bandeau « Essai gratuit — 3 crédits offerts (3 devis chiffrés par l'IA sur vos prix)… Sans carte. L'essai n'inclut pas la plateforme… » + bouton « Essayer » | L7 bandeau sous les cartes (sans bouton : déjà 3 boutons) | garde (bouton retiré, texte intact) |
| 12.7 | 3 tuiles crédits : « 1 crédit = 1 génération », « Modèle Expert = 3 crédits », « Rechargés chaque mois » | L7 accordéon « Comment marchent les crédits » (ouvert sans JS) + /offres | déplace |
| 12.8 | Tableau « Qui a quoi, ligne par ligne » (`Comparatif`, ~45 lignes, replié) | **/offres** (déplié) ; L7 bouton « Voir le comparatif détaillé des offres » | déplace |
| 12.9 | Note `lp-pnote` (1 crédit = 1 génération · recherche fournisseurs 2 · Expert 3 · rechargés · sans engagement · essai une fois par compte, crédits proportionnels) | L7 sous les cartes + /offres | garde |
| 12.10 | Carte « Le site, à la demande : 300 € une fois » (`SITE_A_LA_DEMANDE` : 3 phrases dont « TVA non applicable (art. 293 B du CGI). Livré sous 48 h ouvrées après le paiement de votre dossier complet, avec une validation humaine par Presti. ») + « Commander mon site » | L7 4ᵉ carte ou bande (sous `siteCommandeVente`) | **garde intégral** (délai et mention TVA) |

## 13. Section 12 — `#comparatif`

| # | Contenu | Destination | Statut |
|---|---|---|---|
| 13.1 | « 07 Comparatif », H2 « Presti et les autres logiciels de devis et factures. », chapeau | **/comparatif** | déplace |
| 13.2 | Tableau 11 critères × 5 colonnes (Presti, Henrri, Obat, Tolteck, Batappli) | /comparatif | déplace, intégral |
| 13.3 | « L'automatisation commence avec Studio et devient complète avec Signature. » + 3 lignes par offre | /comparatif | déplace |
| 13.4 | « Ce que Presti fait de plus » : 6 cartes avec « ce que disent les autres » | /comparatif ; **L7 en reprend 1 phrase** (« Ce que Presti fait de plus que les logiciels de devis : la demande qui arrive et la gestion par la conversation ») + lien | déplace |
| 13.5 | « Là où les autres sont devant » (facturation électronique agréée, planning de chantier, formule gratuite) | /comparatif | **garde, obligatoire** (honnêteté du comparatif) |
| 13.6 | Mention « Comparatif établi le 15/10/2026 d'après les sites des éditeurs. » | /comparatif | **garde, obligatoire** (L122-1 c. conso.) |
| 13.7 | Précaution « Offres, prix et fonctions évoluent… « Non indiqué » signifie… Prix des concurrents en € HT… » | /comparatif | **garde, obligatoire** |
| 13.8 | Sources : 12 pages lues le 15/10/2026 (Henrri ×3, Obat ×3, Tolteck ×3, Batappli ×3), liens | /comparatif | **garde, obligatoire** |
| 13.9 | « Une information inexacte ou périmée ? Écrivez-nous : nous la corrigeons. » | /comparatif | garde |
| 13.10 | Ancre `#comparatif` | L7 garde un bloc `id="comparatif"` (lien vers /comparatif) ; ou redirection côté client `#comparatif` → `/comparatif` | ancre conservée |

## 14. Section 13 — `#maquette` (sous `prospectsEntrant`, levé)

| # | Contenu | Destination | Statut |
|---|---|---|---|
| 14.1 | « Pas encore prêt à essayer ? », H2 « Recevez la maquette de votre site. », texte (« sans délai garanti. Gratuit, sans compte, sans carte. ») | L8 | garde |
| 14.2 | « Une seule demande par entreprise. Vous pouvez refuser toute suite en répondant STOP. » | L8 | **garde, obligatoire** |
| 14.3 | `MaquetteForm` : entreprise, métier (11), commune, site ou Instagram, e-mail, champ piège « Société », case d'accord + lien « Ce que nous faisons de ces informations », bouton « Recevoir ma maquette » | L8, **fond inchangé** (il alimente la prospection) | garde |

## 15. Section 14 — `#questions`

| # | Contenu | Destination | Statut |
|---|---|---|---|
| 15.1 | « 08 Avant d'essayer », H2 « Les questions qu'on nous pose. » | L9 | garde |
| 15.2 | 8 questions (`FAQ.slice(0, 8)`) : Qu'est-ce que Presti ? · Comment ça marche ? · Mes données sont-elles en sécurité ? · Qui peut voir mes demandes ? · Puis-je essayer gratuitement ? · Combien ça coûte ? · Les devis générés sont-ils valables ? · L'IA peut-elle se tromper ? | L9 : **5** en accordéon (Qu'est-ce que Presti, Puis-je essayer, Combien ça coûte, Les devis sont-ils valables, L'IA peut-elle se tromper) ; les 3 autres (Comment ça marche → L3, Sécurité et Qui peut voir → L6) restent sur /faq | déplace (aucune réponse perdue : /faq a les 10) |
| 15.3 | « Toutes les questions » → /faq | L9 | garde |

## 16. Section 15 — Appel final

| # | Contenu | Destination | Statut |
|---|---|---|---|
| 16.1 | H2 « Le prochain client qui vous cherche, ne le laissez pas filer. » | L10 | garde |
| 16.2 | « 3 devis offerts, chiffrés par l'IA sur vos prix, sans carte bancaire. Vous jugez la qualité avant de payer quoi que ce soit. » | L10 | garde |
| 16.3 | Bouton « Essayer gratuitement » | L10 (3ᵉ et dernier bouton principal de la page) | garde |
| 16.4 | « Ou recevoir d'abord la maquette de mon site » `#maquette` | L10 | garde |
| 16.5 | `ObjetVivant` final | L10, selon la piste | à arbitrer |

## 17. Pied de page (`PublicPied accueil`)

| # | Contenu | Destination | Statut |
|---|---|---|---|
| 17.1 | Phrase de marque « L'assistant des artisans du bâtiment : des devis chiffrés par l'IA et des factures, et avec la plateforme (dès Studio), chaque demande faite par votre lien a sa réponse prête. » | L10 pied | garde |
| 17.2 | « Essayer gratuitement » | pied, en lien simple (pas un bouton : le plafond de 3 boutons principaux) | garde, change de poids |
| 17.3 | Fonctionnalités `#fonctionnalites` · Vos chiffres `#chiffres` · Comptabilité `#compta` · Tarifs `#tarifs` | pied ; `#chiffres` et `#compta` deviennent des ancres d'onglet de L4 (`#chiffres` ouvre l'onglet Chiffres) | garde (ancres conservées) |
| 17.4 | Questions fréquentes `/faq` · Nous écrire `/contact` · Se connecter `/login` | pied | garde |
| 17.5 | Conditions générales `/cgu` · Confidentialité `/confidentialite` · Mentions légales `/mentions-legales` | pied | **garde, obligatoire** |
| 17.6 | (nouveau) Comparatif `/comparatif` · Offres détaillées `/offres` | pied | ajout |

## 18. Contrôle

- Blocs inventoriés : 17 groupes ; le nombre de lignes se compte, il ne s'écrit pas : `grep -cE '^\| [0-9]+\.[0-9]+ ' plans/refonte-1018/INVENTAIRE-CONTENU.md`. Lignes au statut « supprimé » : **aucune** (`grep -ci 'supprim' …` ne trouve que cette phrase et les drapeaux).
- Mentions légales et sources gardées visibles : source HBR (5.3), crédits photo (7.8), notes « exemple » (7.3, 7.6, 8.4, 9.3,
  10.2), TVA art. 293 B (12.2, 12.10), délai et validation humaine du site (12.10), mention de date, précaution et 12 sources du
  comparatif (13.5-13.8), STOP (14.2), pages légales (17.5).
- Fonctionnalités sous drapeau (relu dans `lib/flags.ts` au 18/10) : `assistant` **true**, `crm` **true** → onglet « Gestion »
  autorisé ; `crmPieces` **false**, `crmPlanning` **false** → **aucune** slide ni onglet sur les photos de chantier ou le
  planning ; `landingVideo` **false** → `DemoSequence` (pas `DemoVideo`) ; `landingDemoSite` **true** ; `siteCommandeVente`
  **true** ; `prospectsEntrant` **true** ; `supportArtisan` **true** ; `inventaireOcr` **false** (aucune promesse de lecture de
  facture fournisseur) ; `canauxWhatsapp`, `canauxReseaux`, `canauxLeboncoin` **false** (aucun canal autre que le lien et la
  boîte e-mail) ; `packPub` **false**, `aimantSite` **false**, `ecommerce` **false**.
