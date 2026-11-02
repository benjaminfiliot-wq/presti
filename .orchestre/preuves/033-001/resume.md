# 033-001 — résumé de preuve (chantier 2, lot 4 : texte et maquette de la landing v2)

Écrit le 02/11/2026 sur le serveur Oracle (copie du dépôt), par Claude Code. Lectures préalables : `regles_pour` (cerveau) sur
« landing, promesses, marque blanche, offres » ; note du vault `wiki/concepts/Positionnement automatique.md` et mémoire
`positionnement-automatique-2510.md` ; `p4-landing.md` en entier ; plan du chantier 2, §0, §0 bis, §3, §5 ; plan du chantier 4,
l.187-196 ; `lib/plans.ts` ; `plans/promesses.md` ; skill `presti-design`.

**Les numéros de ligne de `lib/plans.ts` ci-dessous sont ceux de cette copie** (HEAD du PC `74db706a` + travail en cours). Ils ont
bougé depuis ceux cités par la tâche et par le plan : `ESSAI_JOURS` est à la l.123 (et non 108), l'Entreprise à la l.114.

## Livrables

- `plans/011-cadrage-01-11/c2-lot4/texte.md` : les 7 sections `## 1.` à `## 7.`, dans l'ordre de `p4-landing.md:33-103` ; en-tête et
  pied ; le tableau des boutons (livrable 7) ; title (53 signes), meta description (146 signes), `h1` et `h2` (livrable 8) ; le bloc de
  démo Entreprise de `/contact`.
- `plans/011-cadrage-01-11/c2-lot4/maquette.html` : HTML et CSS seuls, **aucun script** (même pas un attribut `on…`), polices
  Google (Bricolage Grotesque, Hanken Grotesk). Un seul `h1` ; 7 `section` dans `main`. La frise passe au vert au clic par une case à
  cocher en CSS. La ligne « Vous travaillez seul ? » ne s'affiche qu'avec une équipe de 1 (`:has()`, en CSS). Le bloc de démo est
  montré après le pied de page, sous un bandeau « Aperçu hors de l'accueil » : sur le site, son titre sera le `h1` de `/contact`.

## Preuves (sorties de commandes)

1. `node scripts/orchestre.mjs verifier 033-001` → `✓ 033-001 : PASS` (`.orchestre/preuves/033-001/verifier.log`, code 0).
2. Contrôle hors ligne des motifs des 19 tests du §5, joué sur le texte visible de la maquette et sur `texte.md`
   (`/tmp/controle-033.mjs`, hors dépôt, car hors du périmètre) : **26 contrôles, 26 OK**, code 0. Il sait rougir. Trois sabotages,
   chacun sur une copie dans `/tmp` :
   - « Essai de 14 jours » → `KO 18`, code 1 ;
   - la puce « Exemple » retirée de la fenêtre du hero → `KO 12`, code 1. Au premier essai, il restait vert : il lisait « Exemple »
     dans l'`aria-label`. Corrigé pour ne lire que le texte visible, puis rejoué ;
   - « Demander une démo entreprise » renommé → `KO 17`, code 1.
3. Contraste WCAG calculé sur les 22 paires texte et fond de la maquette (voiles rgba composés sur leur fond ;
   `/tmp/contraste-033.mjs`) : **22 sur 22 au niveau AA**, le plus bas à 4,77 (gris sur la barre de la fenêtre). Une paire était à
   4,25 : l'état « réponse préparée », en gris sur le voile corail. Elle est corrigée (passée en `--ink2`, 8,68).
4. **Pas de rendu en navigateur ici.** Playwright est installé, mais sans son Chromium (`~/.cache/ms-playwright` absent), et ce
   serveur n'a pas le droit de le télécharger. Les « 0 px de défilement horizontal en 390 » et la lecture en 1440 px **ne sont donc pas
   mesurés**. Ce qui est fait à la place, par relecture du CSS :
   - toutes les grilles sont en `minmax(0,…)`, et les profils en `minmax(min(100%,200px),1fr)` ;
   - les seules largeurs fixes sont des `max-width` (1160, 880) et des bornes de `@media` (980, 760) ;
   - sous 760 px, tout passe sur une colonne et les boutons en pleine largeur ;
   - l'en-tête en 390 px (logo, « Menu », « Essayer Presti ») a été resserré.

   **À faire au PC par le juge** : capture et mesure de `scrollWidth` en 390 et 1440 px.

## Chaque phrase qui promet, son offre et sa source

| Phrase (texte.md) | Offre qui la tient | Source |
|---|---|---|
| « Presti prépare vos réponses, vos devis, vos relances et vos factures. » (hero) | Studio et Signature | `lib/plans.ts:69` (plateforme), `:72` (`relances`, préparées), `:64` (`devis.ia`, `factures`), `:80` (`factures.relances`) ; `promesses.md` #10, #14, #15, #16 |
| « Avec Studio, vous validez d'un clic » | Studio | `lib/plans.ts:11`, `:73`, `:230` ; `promesses.md` #10 |
| « avec Signature, les réponses et les relances partent seules, si vous le choisissez » | Signature | `lib/plans.ts:89-90` (`plateforme.ia.auto`, `relances.auto`, `factures.relances.auto`). « Si vous le choisissez » : le mode par défaut est « assistée » (`lib/plateformeConfig.ts:46`), et les impayés ne partent qu'une fois la case cochée (`lib/plans.ts:77`) |
| « Essai gratuit, sans carte bancaire, sans engagement. » | les deux | `lib/essaiGratuit.ts:5-9` (sans carte), `lib/faq.ts:12` (sans engagement), plan §0 bis rang 4 ; aucune durée écrite |
| « La réponse est prête, dans votre ton. » (légende du geste 2) | Studio et Signature | `lib/plans.ts:69` ; `promesses.md` #10 (sans « moins d'une minute », §0 bis question 10) |
| « Le devis est chiffré sur vos prix » / « chaque ligne dit d'où vient son prix » | Dès Studio (`devis.ia` est dans BASE) | `lib/plans.ts:64`, grille l.254 ; `promesses.md` #14 (`devis-source-e2e`) |
| « PDF conforme » (badge corail) | les deux | `promesses.md` #2 ; badge au corail, §0 bis règle du vert |
| « La relance est préparée. Avec Studio, vous la validez ; avec Signature, elle part seule. » | Studio / Signature | `lib/plans.ts:72`, `:90`, grille l.249-252 ; `promesses.md` #16 |
| « La facture suit le devis accepté. » ; « Payée » (vert) | les deux | `lib/plans.ts:64` (`factures`) ; vert réservé à « payé » (§0 bis) |
| « le devis part à votre client, à votre nom » (étape 3) | les deux | `lib/email.ts:2-11` (nom de l'artisan, Reply-To = l'artisan) ; marque blanche, `p4-landing.md:212` |
| « Un prix qu'il ne trouve pas chez vous est marqué comme estimé. » | Dès Studio | `lib/pilote/regles.ts:10`, `:113-123` (provenance de chaque ligne) ; `promesses.md` #14 |
| Relances d'impayés « une fois activées, s'arrêtent dès le paiement » ; préparées avec Studio, seules avec Signature | Dès Studio | `lib/plans.ts:77-80`, `:90`, grille l.262-265 ; drapeau `relancesImpayes: true` (`lib/flags.ts:179`) |
| CRM : demandes, fiches, chantiers (statut, tâches, matériaux réservés) ; facturé, encaissé, reste à encaisser, « marge sur matériaux, estimée » | Signature | `lib/plans.ts:96`, grille l.274-275 ; drapeau `crm: true` (`lib/flags.ts:172`) ; `lib/crm/chantier.ts:58` (« toujours dite ESTIMÉE ») ; libellé exact du §0 bis rang 6 |
| Inventaire : stock par lieu, scan, seuil d'alerte, recherche de prix chez vos fournisseurs | Dès Studio | `lib/plans.ts:81`, grille l.291-292 ; `inventaireRecherche: true` (`lib/flags.ts:58`) ; pas d'OCR (`inventaireOcr: false`, l.56) ; `promesses.md` #17, #18 |
| Documents : PDF des devis et des factures, fichiers rangés dans « Mes chiffres », pièces de chaque chantier avec Signature | Dès Studio ; pièces : Signature | `lib/plans.ts:76` (`chiffres`), grille l.269 ; `PLAFOND_PIECES_CHANTIER_MO`, l.188 (Studio 0, Signature 2 Go) ; §0 bis rang 10 |
| Assistant : « vous lui écrivez, il prépare » ; « Avec Studio, ce qui part chez un client attend votre clic « Confirmer » » | Dès Studio | `lib/plans.ts:83-85`, grille l.284 ; drapeau `assistant: true` (`lib/flags.ts:161`) ; `app/DemoSequence.tsx:33` (exemple Mme Martin) |
| Bloc 6 : « Nous intégrons Presti à votre organisation et connectons des agents IA à vos outils. » ; « Sur démonstration et sur devis. » | Presti pour l'entreprise | texte de Benj (`p4-landing.md:92-93`) ; `lib/plans.ts:114` (accroche, `surDevis`) ; aucun écran d'équipe (`p4-landing.md:256`) |
| « La base de données et les photos sont hébergées dans l'Union européenne. » + lien `/confidentialite` | — (fait du service) | `app/confidentialite/page.tsx:59` ; ligne du chantier 4, mot pour mot, jamais sans son lien |
| Ligne HBR « près de 7 fois plus de chances… », avec sa source | — (étude tierce, pas une promesse de Presti) | `plans/promesses.md:30` (#23) ; texte de `app/page.tsx:216-219` ; défaut de la question 11 |

Phrases **volontairement évitées**, parce qu'elles ne sont pas vraies partout :
- « Le devis ne part jamais sans vous » : avec le Pilote de Signature, un devis dont tous les prix sont sourcés peut partir seul
  (`lib/pilote/regles.ts:44`, `:272`). L'étape 3 dit seulement « vous relisez, vous corrigez si besoin ».
- « rien ne part sans vous » (question 2).
- « relances prévues » (§0 bis, liste « Écartées »).

## Les 19 tests du §5, et pourquoi le texte les passe

| # | Test | Pourquoi c'est vert |
|---|---|---|
| 1 | 7 sections au plus, un seul `h1` | 7 `## n.` dans texte.md, 7 `section` dans `main`, un `h1` (contrôles 1 et 1 bis, et le `verifier`) |
| 2 | aucun prix en dur, aucune promesse interdite | aucun `\d+ €` : les montants d'exemple sont « en euros », sans symbole. Ni appels gérés, ni rendez-vous pris seuls, ni paiement encaissé, ni WhatsApp, ni réseaux, ni OCR ; aucune notification annoncée |
| 3 | ni bleu, ni cyan, ni violet | palette : corail, nuit chaude, crème, vert `#38CD8C` ; aucun des codes interdits ni de nom de couleur froide dans le CSS |
| 4 | liens qui marchent | chaque `href` vise une ancre présente (`#fonctionnalites`, `#pour-qui`, `#entreprise`) ou une route qui existe dans `app/` (`/signup`, `/login`, `/faq`, `/contact`, `/confidentialite`, `/mentions-legales`, `/cgu`). `/offres` existe sur `landing-0111` (lot 1), derrière le drapeau |
| 5 | drapeau baissé, page publique ancienne | sans objet pour une maquette statique : relève du lot 6 (`landingV2: false`) |
| 6 | fausse urgence | aucune des formules ni aucun compte à rebours |
| 7 | gains chiffrés | ni « de CA », ni « gagné », ni « rapporte », ni « bénéfice ». « Ce que vous y gagnez » ne porte aucun chiffre ; le seul libellé d'argent est « marge sur matériaux, estimée » |
| 8 | garanties | aucun « garanti » |
| 9 | fausses preuves | ni témoignage, ni avis, ni étoile, ni logo, ni compteur, ni image de personne. La fenêtre est en HTML, sans image |
| 10 | prix barrés, remises | ni `s`, ni `del`, ni pourcentage, ni coupon dans le texte visible |
| 11 | marques et mots techniques | aucune des marques ni des mots de la liste. « agent » une seule fois, dans « agents IA » du bloc 6 (texte de Benj) ; « Harvard Business Review » reste sous la ligne chiffrée (question 11) |
| 12 | « Exemple » sur toute donnée fictive | puce « Exemple » dans la barre de la fenêtre (Marie, montants), sur la demande tapée de l'étape 1 et sur Mme Martin. Les cartes CRM n'ont ni nom ni montant |
| 13 | un seul accent, vert réservé | le jeton vert ne sert qu'à `.badge-ok` (« Payée ») et à l'état coché de l'étape 3 (« Validé ») ; tout le reste au corail. Le badge « PDF conforme » est au corail |
| 14 | une seule phrase dans le `h1` | « Votre gestion d'artisan, simplifiée par l'IA. » : un seul point |
| 15 | ni chiffre ni durée dans le `h1` et la sous-phrase ; « moins d'une minute » nulle part | vérifié par le contrôle 15 et 15 bis |
| 16 | « part seul », « envoie seul », « relance prévue » toujours avec « Signature » | chaque phrase qui dit « partent seules » ou « part seule » contient « Signature ». Le bloc de démo dit « Ce qui part automatiquement, nous le décidons ensemble » |
| 17 | les cinq libellés, seuls les liens `/signup` pleins | les cinq mot pour mot, dans le texte et la maquette. Pleins : « Essayer Presti » et « Créer mon compte », vers `/signup` ; tout le reste à contour, « Envoyer ma demande » compris |
| 18 | aucun nombre de jours, nulle part « Essentiel » | aucune durée d'essai ; la section 4 s'intitule « Les fonctionnalités » pour ne pas écrire « essentielles ». Si une page secondaire dit une durée, elle écrit `{essai Studio}` et `{essai Signature}`, lus dans `ESSAI_JOURS` (`lib/plans.ts:123`) |
| 19 | bloc de démo : aucun délai, aucune marque, « Ce qui se passe ensuite » identique | les trois lignes sont comparées par le contrôle aux l.191-193 du plan du chantier 4. Aucun « sous 24 h ». « Vos données » sans marque d'hébergeur |

## Questions du §0 bis tranchées par leur défaut

| # | Défaut appliqué dans ce texte |
|---|---|
| 1 | `h1` = « Votre gestion d'artisan, simplifiée par l'IA. » (`p4-landing.md:31`) ; sous-phrase écrite ici, sans chiffre |
| 2 | « rien ne part sans vous » n'est écrit nulle part |
| 3 | « Essayer Presti » → `/signup`. Dessous, la ligne du rang 4, sans durée ni crédits |
| 4 | « Demander une démo » et « Demander une démo entreprise » → `/contact?motif=entreprise`, motif lu dans le navigateur |
| 6 | tutoiement seulement dans les trois étapes de Benj ; vouvoiement partout ailleurs |
| 7 | aucun délai dans le bloc de démo |
| 8 | vert `#38CD8C` |
| 10 | aucun chiffre dans le hero ; « moins d'une minute » nulle part |
| 11 | la source HBR reste sous la seule ligne chiffrée |

Les questions 5 (table des demandes) et 9 (correctifs de l'accueil actuel) ne relèvent pas de ce texte.

## Points à valider par Benj

1. Le `h1`, la sous-phrase, les titres des sections 2, 4 et 7.
2. « si vous le choisissez » dans la sous-phrase : c'est vrai (mode « assistée » par défaut), mais plus long.
3. Les trois lignes de mise en place du bloc de démo (rang 19) : « Vos données reprises dans Presti » est une promesse de service, à
   tenir au contrat.
4. Le verbe de l'étape 3 (« le devis part à votre client ») : il ne dit pas qui clique, pour rester vrai avec le Pilote de Signature.

## Reste à faire hors de cette tâche

- Rendu en navigateur en 390 et 1440 px (`scrollWidth`, captures) : par le juge, au PC.
- L'auditeur des promesses, distinct de l'auteur (`chantier-2-landing-plan.md` §5, lot 4).

TACHE 033-001 FAITE
