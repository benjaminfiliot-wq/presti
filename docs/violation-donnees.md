# Procédure en cas de violation de données personnelles

> Écrite le 20 octobre 2026 (audit RGPD du 20/10, réserve sur les art. 33 et 34). Ce n'est pas un avis juridique : c'est la marche à suivre
> que Presti s'impose. Elle tient les promesses déjà publiées : l'annexe des conditions générales (`app/cgu/page.tsx`, « Violation de
> données » : Presti notifie l'artisan « sans retard injustifié » après en avoir eu connaissance) et le support (art. 4 des mêmes
> conditions : une faille ou une violation se signale et « passe avant tout le reste »).

**Une violation** (RGPD art. 4.12) : une destruction, une perte, une altération, une divulgation ou un accès non autorisé à des données
personnelles, par accident ou par malveillance. Une panne qui rend les données indisponibles en est une aussi.

## 0. Qui décide, et dans quel rôle

Presti est édité par une seule personne, **Benjamin Filiot**, qui décide de tout ce qui suit. Il n'y a pas de délégué à la protection des
données. Le rôle de Presti change selon les données touchées, et c'est la première chose à établir :

| Données touchées | Rôle de Presti | Qui notifie la CNIL | Qui prévient les personnes |
|---|---|---|---|
| Compte de l'artisan, abonnement, facturation de Presti, prospection de professionnels, registre des essais (`docs/registre-traitements.md`) | **Responsable de traitement** | **Presti** | **Presti** (si risque élevé) |
| Prospects et clients de l'artisan (conversations, devis, factures, chantiers, photos, suivi, agenda), `lib/legalArtisan.ts` | **Sous-traitant** (art. 28, annexe des CGU) | **L'artisan**, avec les éléments que Presti lui fournit | **L'artisan** |

Dans le second cas, l'obligation de Presti (art. 33.2) est de **prévenir chaque artisan concerné, sans retard injustifié**, avec de quoi
faire sa propre notification. Un incident mixte (le cas courant : une base entière) suit les deux colonnes.

## 1. Détecter

Ce qui peut nous alerter : l'alerte interne (e-mail « entreprise » de `notifierEntreprise`, table `alertes`, passages du cron dans
`passages_cron`), l'audit de nuit (`.github/workflows/audit.yml`), les journaux Vercel et Supabase, un message d'un prestataire
(Supabase, Vercel, Stripe, Resend, Anthropic), un signalement d'un artisan ou d'un prospect par le formulaire de contact ou l'adresse des
mentions légales. Toute alerte douteuse est traitée comme un incident possible jusqu'à preuve du contraire.

**Heure de départ du délai de 72 h** : le moment où Presti a une **certitude raisonnable** qu'une violation a eu lieu — pas le moment de
l'intrusion, pas la fin de l'enquête. On la note dès la première ligne du registre (§ 6) : une heure non écrite ne se prouve pas.

## 2. Contenir (dans l'heure, avant d'enquêter plus loin)

- Couper la source : révoquer la clé ou la session en cause, changer les secrets exposés (clés Supabase, Stripe, Anthropic, Resend, `CRON_SECRET`), et
  baisser le drapeau concerné dans `lib/flags.ts` si une fonction est en cause (une fonction non finie n'apparaît pas).
- **Conserver les preuves** avant de nettoyer : journaux, requêtes, horodatages, capture de l'alerte. Ne rien effacer pour « faire propre ».
- Si les données sont perdues ou altérées : restaurer (`docs/sauvegardes.md` — les migrations *et* la sauvegarde chiffrée).
- Ne pas répondre au pirate ni payer quoi que ce soit sans en avoir décidé en connaissance de cause et l'avoir noté.

## 3. Qualifier (dans les 24 h visées en interne — ce n'est pas un délai légal)

À remplir pour chaque incident ; les réponses vont au registre.

1. **Nature** : confidentialité (divulgation, accès), intégrité (altération), disponibilité (perte, indisponibilité).
2. **Données** : lesquelles (identité, coordonnées, adresses de chantier, photos de domicile, devis et montants, adresses IP, hachés de mots de passe…) ; y a-t-il des données sensibles ou des mineurs ?
3. **Personnes** : artisans, prospects, clients d'artisans, fondateurs ; combien, à une centaine près.
4. **Rôle** de Presti pour chaque lot (§ 0).
5. **Conséquences probables** pour les personnes : usurpation, hameçonnage ciblé, atteinte à la vie privée (photos d'intérieurs, adresses), préjudice financier.
6. **Niveau de risque** :

| Niveau | Quand | Suite |
|---|---|---|
| **Aucun risque** pour les personnes | données chiffrées dont la clé n'a pas fuité, accès sans lecture prouvée | Pas de notification. **Inscrire quand même au registre** avec le raisonnement (art. 33.5). |
| **Risque** | la plupart des fuites de coordonnées ou de contenu | **Notifier la CNIL sous 72 h** (§ 4) ; artisans prévenus si sous-traitance (§ 5). |
| **Risque élevé** | adresses + photos de domicile, fuite de masse, mots de passe exploitables, usurpation probable | CNIL **et** information directe des personnes (§ 5, art. 34). |

Dans le doute entre deux niveaux, on retient le plus haut : une notification inutile coûte une heure, une notification manquée coûte bien plus.

## 4. Notifier la CNIL (art. 33) — sous 72 heures

- **Quand** : au plus tard 72 h après l'heure de départ du § 1, week-end compris. Au-delà, la notification dit **pourquoi** elle est tardive.
- **Comment** : par le téléservice de notification de la CNIL (cnil.fr, rubrique « Notifier une violation de données personnelles »). On peut notifier **par étapes** (art. 33.4) : un premier envoi avec ce qu'on sait, des compléments ensuite — il vaut mieux un premier envoi incomplet que rien.
- **Contenu** (art. 33.3) : nature de la violation, catégories et nombre approximatif de personnes et d'enregistrements, contact (§ 7), conséquences probables, mesures prises ou proposées.
- Quand Presti est **sous-traitant**, ce n'est pas à Presti de notifier ces données à la CNIL, sauf si l'artisan le lui demande par écrit : on lui remet le dossier du § 5.

## 5. Informer (art. 33.2 et 34)

### Les artisans — « sans retard injustifié »
Presti écrit à **chaque artisan dont les clients sont concernés** dès que la qualification du § 3 le permet — quitte à compléter ensuite — sans attendre la fin de l'enquête ni la décision de notifier la CNIL. Message par e-mail depuis l'adresse de Presti (jamais depuis un site d'artisan : ce courrier est celui de l'éditeur à son client, il ne passe pas par la marque blanche). Gabarit au § 8. L'artisan reçoit de quoi faire sa propre notification : date, nature, catégories de données, nombre approximatif de ses clients touchés, mesures prises.

### Les personnes (art. 34) — si le risque est élevé
- Qui : les personnes concernées, directement (e-mail ou courrier), en termes clairs ; pour les clients d'un artisan, c'est **l'artisan** qui décide et signe, Presti lui prépare le texte.
- Contenu : ce qui s'est passé, quelles données, les conséquences possibles, ce qu'on a fait, **ce que la personne peut faire** (changer un mot de passe, se méfier d'un message), et le contact (§ 7).
- Pas d'information individuelle si les données étaient inintelligibles pour qui y accède (chiffrement dont la clé est intacte), si des mesures ultérieures écartent le risque élevé, ou si c'est un effort disproportionné — auquel cas une communication publique (page du site, e-mail général) la remplace (art. 34.3). Cette exception se **motive par écrit** au registre.

## 6. Le registre des violations (art. 33.5)

Toute violation y figure, **notifiée ou non**. Une ligne par incident. **Aucune donnée personnelle et aucun secret** dans ce tableau : le détail sensible (journaux, listes de personnes) se garde hors du dépôt, référencé par le numéro de la ligne.

| N° | Heure de connaissance | Description et cause | Données et nombre approximatif de personnes | Rôle de Presti | Niveau de risque et raisonnement | CNIL notifiée (date, référence) | Artisans prévenus (date) | Personnes informées (oui/non, motif) | Mesures prises | Clôture et leçon |
|---|---|---|---|---|---|---|---|---|---|---|
| | | | | | | | | | | |

## 7. Contacts

| Qui | Pour quoi | Coordonnées |
|---|---|---|
| **Benjamin Filiot** (Presti, responsable de traitement et décisionnaire unique) | tout incident | `benjaminfiliot+presti@gmail.com` (celle de la politique de confidentialité) ; coordonnées complètes dans les mentions légales |
| **CNIL** | notification (art. 33) | téléservice de notification sur cnil.fr |
| Supabase, Vercel, Stripe, Resend, Anthropic | incident chez un prestataire, ou question d'un sous-traitant | à compléter par le fondateur : l'adresse de sécurité de chaque tableau de bord |

## 8. Gabarit du message aux artisans

> **Objet : Information importante — incident de sécurité concernant des données de vos clients**
>
> Bonjour {prénom},
>
> Nous vous écrivons pour vous informer d'un incident de sécurité survenu sur Presti. Nous prenons cette information très au sérieux et
> vous la transmettons sans attendre que l'enquête soit terminée.
>
> **Ce qui s'est passé.** {Description factuelle, en deux ou trois phrases : quoi, quand, comment on l'a découvert.}
>
> **Ce qui est concerné.** {Catégories de données : par exemple noms, coordonnées, adresses de chantier, photos de chantier, devis}.
> Environ {nombre} de vos clients ou prospects sont concernés. {Ce qui ne l'est pas : mots de passe, coordonnées bancaires… — seulement si c'est établi.}
>
> **Ce que nous avons fait.** {Mesures : accès coupé, secrets changés, fonction suspendue, restauration…}
>
> **Ce que cela peut changer pour vous.** Vous êtes responsable du traitement des données de vos clients. {Si le risque est élevé :
> nous vous conseillons de les prévenir, et nous pouvons vous préparer le message.} Vous devez peut-être notifier la CNIL dans les 72 h
> suivant le moment où vous en avez eu connaissance. Vous trouverez ci-dessous les éléments utiles à cette notification : date, nature,
> catégories de données, nombre approximatif de personnes, mesures prises.
>
> **Ce que vous pouvez faire dès maintenant.** {Par exemple : changer votre mot de passe, vous méfier de messages inattendus se
> réclamant de vous ou de Presti.}
>
> Nous vous tiendrons informé de la suite. Pour toute question : {contact du § 7}.
>
> {Signature}

## 9. Après l'incident

- Clore la ligne du registre avec la **leçon** : ce qui aurait dû nous alerter plus tôt, ce qu'on change (test, alerte, droit d'accès).
- Mettre à jour `docs/registre-traitements.md` ou les textes légaux si le traitement a changé.
- Relire cette procédure une fois par an, et après chaque incident réel.

## Ce que cette procédure ne résout pas

- **Un seul décideur** : si le fondateur est injoignable, personne d'autre ne peut notifier. Désigner un suppléant de confiance, avec ses accès, reste à faire par le fondateur.
- Les adresses de sécurité des prestataires (§ 7) ne sont pas encore recensées.
