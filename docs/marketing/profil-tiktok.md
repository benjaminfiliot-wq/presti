# Conversion de @vibecode.clips en TikTok Presti (fiche 026-211, C08)

Créée le 2026-09-29. Statut : **dossier préparé, en attente de l'accord de Benj.** Rien n'a été changé sur le compte.
Source : `Ecosysteme-Marketing-Reel-2026-09-25.md` §3.7 (ligne C08) et §4 bis (« @vibecode.clips devient le TikTok de Presti, R25 »).

## Ce qui est décidé, et ce qui ne l'est pas

- **R25** (« oui » recommandé) n'a **pas** de réponse de Benj consignée dans `.orchestre/decisions.md` au 2026-09-29. Sans son « oui »
  écrit, aucune étape 4 n'est exécutée. Un score Laya ou une décision par ligne ne remplace pas cet accord.
- **geste de Benj** : (1) dire « oui » à la conversion, sur les versions exactes ci-dessous ; (2) dire ce qui advient du paiement
  Content Rewards éventuel avant de toucher aux anciennes vidéos ; (3) choisir le traitement des 4 vidéos. Tout le reste est fait
  par Claude Code après ce « oui ». Aucun agent ne voit un mot de passe : le compte est dans la session du Chrome principal.
- Le « oui » est attaché aux valeurs exactes de cette page. Une retouche d'un champ le rend caduc.

## Étape 1 — versions exactes soumises à Benj

| Champ | État relevé le 2026-09-29 (page publique, sans cookies) | Version proposée |
|---|---|---|
| nom d'utilisateur | `vibecode.clips` | `prestiapp` (repli `prestiapp.fr`, puis `presti.artisans`), **pas avant le 2026-10-22 environ** : voir « Verrous » |
| nouveau_nom_affichage | `Vibe Code Clips` | `Presti · Assistant artisans` |
| bio | `AI builders, founders and the tools they ship with.CR-S3T3B6` | `Sites pour artisans du bâtiment. Compte tenu par les agents IA de Presti.` (73 signes, limite 80 « à vérifier ») |
| photo | photo actuelle du compte | `public/marque/presti-icone-512.png` (fichier présent dans le dépôt) |
| lien_bio | aucun lien | `https://prestiapp.fr/a/tiktok` — **seulement quand le code `tiktok` existe** (voir « Lien ») |
| date_bascule | — | le jour du « oui » de Benj pour le nom affiché, la bio, la photo et les vidéos ; le nom d'utilisateur ensuite, dès la fin du verrou |

Règles de contenu : pas de « Commente SITE » sur TikTok (aucun agent n'y répond) ; aucun chiffre dans la bio ; aucune promesse
de résultat. Si un texte de promesse (« devis en 24 h », un chiffre) est un jour ajouté à la bio, il exige une source et
`jev noul --provider laya` ≥ 0,5 avant affichage ; une probabilité plus basse, une preuve absente ou une panne Jev bloquent l'ajout
et renvoient le cas à Benj. La bio proposée ci-dessus ne contient aucune affirmation chiffrée et n'a donc rien à faire vérifier.
Elle dit que le compte est tenu par des agents IA, conformément à la règle « annoncer l'IA quand c'est l'IA qui écrit ».

## Étape 2 — l'existant à traiter avant le geste

- **Vidéos publiques** : le compteur public affiche **4 vidéos**, 1 abonné, 2 « j'aime » (relevé du 2026-09-29). La liste des
  quatre adresses n'est pas visible sans session (le profil anonyme n'affiche aucune vignette) : elle est à relever au moment du
  geste, dans le Chrome principal, avant tout changement. Le dépôt clipping-ops n'a aucune publication enregistrée pour ce compte
  (base `clipforge.sqlite`, lue en lecture seule) : les vidéos Lovable viennent de dossiers de travail, pas d'un registre.
- **Paiement Content Rewards** : aucun gain ni soumission enregistrés en local pour ce compte. La bio actuelle porte un **code
  de vérification Content Rewards** (`CR-S3T3B6`, visible de tous, sans valeur secrète) : le retirer défait le lien du compte
  avec Content Rewards. **Benj confirme** s'il reste un paiement en attente avant que la bio soit remplacée et que les vidéos
  passent en privé (passer une vidéo en privé peut arrêter son revenu). Sans cette réponse, l'étape 4 reste fermée.
- **Traitement des vidéos** : passer en privé (« Moi uniquement »), **jamais supprimer**, une ligne à la fois ; supprimer est
  irréversible et reste un choix de Benj.

## Verrous de TikTok (mesures, à recouper avant le geste)

- Le compte a été créé le 2026-09-22 et son nom d'utilisateur comme son nom affiché ont été fixés le même jour (14 h 43 UTC).
- Nom affiché : verrou d'environ 7 jours, donc levé vers le 2026-09-29 14 h 44 UTC (règle « environ », à vérifier dans TikTok).
- Nom d'utilisateur : verrou d'environ 30 jours, donc **pas avant le 2026-10-22**. Le conseil « faire les deux changements le même
  jour » du reel est impossible ici ; recommandation : nom affiché, bio, photo et vidéos d'abord, nom d'utilisateur à la fin du
  verrou. Le juge lira alors chaque champ à sa date, sans exiger le nom d'utilisateur avant.
- Compte professionnel : gratuit, recommandé ; le lien en bio peut exiger ce statut ou un seuil d'abonnés (à vérifier).

## Lien

- Le code d'apport `tiktok` **n'existe pas encore** dans la base (canaux présents le 2026-09-29 : `facebook`, `instagram`,
  `linkedin`, `linkedindm`). Un lien vers un code inconnu redirige vers l'accueil sans empreinte : le lien serait posé sans que
  les visites se comptent. La création demande un nouveau fichier de migration sur le modèle de `0087_canal_instagram.sql`
  (`canal = true`, aucune commission), appliquée par Claude Code selon le protocole ; elle sort du périmètre de cette fiche et
  doit précéder la pose du lien.
- **Un seul lien**, code par réseau, aucune campagne par ligne dans la bio : TikTok n'en offre qu'un, donc une vente ne se
  rattache à une ligne que par une estimation (voir `mesure/README.md`).

## Étapes 3 à 5 — après l'accord

3. Le juge en mode brouillon (`contenu-qa --partie=profil-tiktok`) contrôle que ce dossier est complet ; il ne change pas le
   compte. Cas de refus conservé : sans accord daté de Benj dans `.orchestre/decisions.md`, l'étape 4 ne démarre pas.
4. Dans l'interface TikTok (Chrome visible) : changer les champs de la table ci-dessus, recharger la page, relire chaque champ ;
   passer les anciennes vidéos en privé selon le choix de Benj ; la colonne de confidentialité de Studio ment dans les deux sens.
5. Lire le profil et chaque ancienne vidéo **sans cookies** : la page de la vidéo doit répondre `status_self_see`. Capturer ce
   qui s'affiche réellement, avec heure et URL, sans jeton ni donnée de session. Pas de lecture scriptée de Studio ni du Creative
   Center (CGU TikTok, zone EEA, §4.5).

## Étape 6 — contrôle du lien et de la bio

Le lien porte le code `tiktok` seul. Aucune campagne par ligne. Toute affirmation chiffrée ajoutée plus tard à la bio porte sa
source et un verdict Laya ≥ 0,5 conservés avec la date ; le score n'autorise jamais à lui seul.
