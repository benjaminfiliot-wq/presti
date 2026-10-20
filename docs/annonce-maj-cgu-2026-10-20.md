# Mise à jour de nos conditions — annonce aux artisans existants

> **BROUILLON — NON ENVOYÉ.** Préparé le 20 octobre 2026 avec les nouveaux textes (`app/cgu`, `app/confidentialite`, version `2026-10-20`
> dans `app/signup/page.tsx`). L'art. 10 des conditions générales promet d'informer les utilisateurs des modifications substantielles ; la
> poursuite de l'usage vaut acceptation. **Le fondateur relit, choisit la date d'entrée en vigueur, puis envoie lui-même.** Ce n'est pas un avis juridique.

## Avant d'envoyer (à cocher)

- [ ] Les pages `/cgu` et `/confidentialite` modifiées sont **déployées** (`node scripts/deploiement-etat.mjs`) : le lien du message doit montrer le texte annoncé.
- [ ] La date d'entrée en vigueur ci-dessous est choisie (le message laisse `{date}`) ; la laisser courir quelques jours après l'envoi est plus prudent qu'un effet le jour même.
- [ ] **Vérifier les envois déjà partis** avant d'écrire à chacun : un seul message par artisan, jamais deux à quelques minutes d'écart.
- [ ] Seuls les **artisans actifs** reçoivent ce message (pas les comptes de relecture ni de démonstration, `est_demo`).
- [ ] Message envoyé au nom de Presti (c'est le courrier de l'éditeur à son client, pas un message à un prospect d'artisan : aucune marque blanche ici).

## Objet

**Mise à jour de nos conditions d'utilisation et de notre politique de confidentialité**

## Texte

Bonjour {prénom},

Nous mettons à jour les conditions générales de Presti et notre politique de confidentialité. Elles entreront en vigueur le **{date}**. Vous n'avez rien à faire : si vous continuez à utiliser Presti après cette date, vous acceptez ces nouveaux textes (art. 10 des conditions). Si elles ne vous conviennent pas, vous pouvez à tout moment exporter vos données et supprimer votre compte depuis Paramètres → Données & confidentialité.

**Ce qui change, en bref**

1. **Le CRM est décrit.** Les textes disent désormais ce que Presti fait pour vous quand vous utilisez les chantiers : planning et tâches, photos et pièces du chantier (rangées dans un espace privé), lien de suivi que vous pouvez donner à un client, messages d'après-chantier que vous relisez avant tout envoi (avec la possibilité, pour votre client, de refuser les suivants), lien d'agenda, carte des chantiers et assistant de gestion.
2. **Un destinataire de plus, public.** Pour placer un chantier sur la carte, notre serveur interroge la **Base Adresse Nationale** (api-adresse.data.gouv.fr), un service de l'État. Elle reçoit l'adresse, le code postal et la ville du chantier — jamais le nom de votre client.
3. **Les durées sont précisées.** Chantiers du CRM et photos : 3 ans après la fin du chantier. Lien de suivi donné à un client : il cesse de répondre 90 jours après la fin du chantier. Conversations : supprimées après 3 ans sans échange, **sauf** si elles sont liées à un devis signé ou à une facture (elles suivent alors les pièces comptables, 10 ans). Registre des essais gratuits : 24 mois après la fin de l'essai.
4. **L'effacement à la demande d'un de vos clients va plus loin.** Quand vous effacez une conversation à sa demande, les photos, l'adresse, la position sur la carte et le lien de suivi des chantiers de ce client **sans devis envoyé ni facture** partent aussi. Ce que la loi oblige à conserver (devis envoyés, factures) reste.
5. **Si un incident de sécurité touche les données de vos clients**, nous vous prévenons sans retard injustifié, avec de quoi faire votre propre notification à la CNIL ; nous tenons une procédure écrite et un registre des violations.

Vous êtes le responsable du traitement des données de vos clients ; Presti est votre sous-traitant. Le contrat qui le dit est l'annexe des conditions générales : elle a été mise à jour avec la liste ci-dessus.

Lire les textes : https://prestiapp.fr/cgu et https://prestiapp.fr/confidentialite

Une question ? Répondez à ce message ou écrivez-nous depuis la page de contact.

Benjamin Filiot — Presti

---

## Ce que le message ne dit pas, volontairement

- Il ne promet rien que le code n'applique pas : chaque durée citée est tirée de `lib/legalArtisan.ts` (`DUREES_MOIS`, `JOURS_SUIVI_APRES_FIN`) et appliquée par `lib/purgesRgpd.ts` et `app/suivi/[jeton]/route.ts`.
- Il ne cite aucun accord signé avec un prestataire : les clauses contractuelles types sont annoncées par les textes publics ; leur archivage est à vérifier par le fondateur (voir le compte rendu du 20/10).
