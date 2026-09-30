# Campagne e-mail artisans — 15/09/2026

- **Expéditeur :** le Gmail personnel de Benj (benjaminfiliot@gmail.com). Pas Resend ni contact@prestiapp.fr : les conditions de Resend interdisent la prospection à froid et l'envoi mettrait en danger les e-mails de l'application.
- **Texte :** le message de Benj, sans changement. Deux ajouts seulement :
  - la salutation ;
  - une dernière ligne qui dit où l'adresse a été trouvée et comment refuser la suite. C'est obligatoire en prospection B2B : l'expéditeur doit être identifié et le destinataire doit pouvoir s'opposer.
- **Destinataires :** uniquement `emails-artisans/liste-validee.json`, produite par `presti/scripts/emails-artisans-qa.mjs`. Ce juge :
  - retélécharge chaque page source ;
  - y retrouve l'adresse ;
  - vérifie le MX ;
  - retire les doublons et les déjà-contactés.

## Objet

Deux objets ont servi pour le lot du 16/09 :

1. « Votre avis d'artisan sur PrestiApp ? » : indices 0 à 70 de `retenues` (71 messages).
2. « un outil pour faciliter la gestion de votre entreprise » : indices 71 à 165 (95 messages). Demandé par Benj le 16/09 à 11:14.

Le corps est le même pour les deux objets.

## Corps

La salutation dépend de la civilité :
- « Bonjour monsieur, » ou « Bonjour madame, » si le site de l'artisan l'écrit lui-même ;
- « Bonjour, » dans tous les autres cas. On ne devine jamais la civilité d'après un prénom.

```
Bonjour, j'espère que vous allez bien,
J'ai développé PrestiApp, une solution pensée pour faire gagner du temps aux artisans sur toute la partie administrative : création de devis rapides, suivi de facturation et bien plus encore.
Le but n'est pas de vous vendre quoi que ce soit, mais de proposer un outil simple et efficace pour vous faciliter la vie et potentiellement augmenter votre productivité.
Si vous avez 2 minutes à l'occasion, je serais ravi d'avoir votre avis ou de vous faire tester l'application gratuitement. Vous pouvez jeter un œil ou m'envoyer un message en retour si ça vous parle !
Excellente journée
Cordialement
Benjamin Filiot
https://prestiapp.fr/ 06 30 78 16 47

J'ai trouvé votre adresse sur votre site {site}. Si vous ne souhaitez pas recevoir d'autre message de ma part, répondez simplement « stop ».
```

## Règles d'envoi

- **Un destinataire par e-mail.** Jamais de destinataires groupés ni de copie cachée.
- **Environ une minute entre deux envois**, soit 100 envois en 2 heures environ. Un Gmail personnel qui envoie 100 messages identiques d'un coup se fait freiner, voire suspendre.
- **Chaque envoi est vérifié** dans « Messages envoyés » et noté dans `envois-2026-09-15.md`.
- **Une réponse « stop »** : l'adresse va dans `deja-contactes-email.txt`, que le juge relit. Elle ne sera jamais recontactée.

## Règles pour les prochains lots (leçons du 16/09)

L'envoi du 16/09 a eu deux défauts, détaillés dans `emails-artisans/envois-2026-09-15.md`.

- **Ne jamais envoyer depuis l'interface Gmail un brouillon créé par l'API sans relire son HTML.** Le 16/09, environ 62 messages sont partis avec des liens réécrits en `google.com/url?...` au lieu du vrai lien. Avant d'envoyer, ouvrir le HTML du brouillon et vérifier que chaque lien pointe directement vers `https://prestiapp.fr/`. Sinon, recréer le brouillon ou envoyer par la même voie que celle qui l'a créé.
- **Respecter l'écart d'une minute entre deux envois.** Le 16/09, l'écart moyen a été d'environ 15 s : 166 messages en 42 minutes au lieu d'environ 2 h 45. Le rythme se mesure après coup sur les heures de « Messages envoyés », pas seulement sur l'intention.
