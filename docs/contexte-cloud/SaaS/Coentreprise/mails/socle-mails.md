# Base de connaissances — MAILS (délivrabilité · copywriting · cycle de vie)

Socle stable de la catégorie Mails. Lire aussi `mails.journal.md`.
Rôle : chaque email partant au nom d'un artisan est **humain, utile, adapté et sûr**.

## 1. Flux email de Presti
- **1er contact** : `/api/leads` → `lib/ai.ts:generateLeadReply` → `lib/email.ts:sendEmail`
  (Resend, FROM `Presti <contact@prestiapp.fr>`, `reply_to` = email de l'artisan).
  Deux envois : réponse au prospect (si contact = email) + notification à l'artisan.
- **Conversation** : `/api/conversation` → `generateConversationReply` (réponse dans le
  fil, sur la plateforme) + notification artisan « échange en cours ». Le prospect voit la
  réponse EN DIRECT sur la page ; l'email est un canal complémentaire.
- **Réponse artisan** : `/api/messages` (action reply) → email au prospect si son contact
  est un email (sinon visible sur la plateforme). `emailed:true/false` renvoyé.
- **Relances** : `/api/cron/relances` → `generateRelanceReply` (rang 1/2/3), planifiées
  J+2 / J+5 / J+10 à la 1re réponse, **stoppées** si le lead passe gagné/perdu.

## 2. Délivrabilité (spécialiste délivrabilité) — ÉTAT : domaine VERIFIED (2026-08-31)
- Domaine `prestiapp.fr` **vérifié chez Resend** (région eu-west-1). DNS posés chez OVH :
  - **DKIM** : TXT `resend._domainkey` = clé publique `p=…` (signe les messages).
  - **SPF** : TXT `send` = `v=spf1 include:amazonses.com ~all` (autorise l'envoi via SES).
  - **MX** : `send` → `feedback-smtp.eu-west-1.amazonses.com` (priorité 10, boucle de retour).
- **DMARC** (à renforcer si besoin) : TXT `_dmarc` = `v=DMARC1; p=none; rua=mailto:…`
  puis durcir vers `p=quarantine`/`reject` une fois la réputation établie.
- Bonnes pratiques anti-spam : FROM stable, `reply_to` cohérent, sujet non trompeur,
  texte + (idéalement) HTML équilibré, pas de mots « spammy » ni de majuscules criardes,
  ratio texte/lien sain, désinscription claire pour les envois de masse (les relances
  restent transactionnelles/relationnelles, pas du marketing de masse).
- **Réputation** : domaine neuf → montée en charge progressive, surveiller bounces &
  plaintes. Un email au 1er envoi peut tomber en spam le temps que la réputation s'établisse.
- Diagnostic : statut Resend (`scripts/resend-domain.mjs` / API `/domains`), logs serveur
  (`console.error`), rejouer un lead de test (créer + **supprimer** l'artisan de test).

## 3. Copywriting & garde-fous (voir [[presti-ai-architecture]])
Règles absolues des messages générés (réponses, conversation, relances) :
- Français impeccable, **1re personne**, comme si l'artisan écrivait lui-même.
- **JAMAIS de prix chiffré ni de fourchette** (pas les détails → devis précis + gratuit).
- **Aucun délai inventé** : « rapidement », « au plus vite », « dans la journée » (si urgent).
- Toujours terminer par **une prochaine étape concrète** (rappel, visite, devis, créneau).
- Signé du nom de l'artisan pour un email ; en conversation, ton vivant, PAS de « Bonjour »
  ni signature à chaque message (déjà présenté).
- Adaptation à l'intention (analyse déterministe `analyzeLead`) : URGENCE → rassurer + 1
  action ; RÉCLAMATION → sérieux, sans reconnaître de faute ; PRIX → pas de chiffre ;
  RDV → proposer un créneau ; FLOU → 1–2 questions précises.

## 4. Cycle de vie / séquences (spécialiste cycle)
- Cadence de relance : **J+2** (douce, prise de nouvelles), **J+5** (étape concrète :
  créneau/visite/devis), **J+10** (dernière, porte ouverte, sans insistance). Stop dès réponse.
- Zéro pression, zéro culpabilisation (« vous n'avez pas répondu » interdit), zéro fausse
  urgence/rareté. Calibrer le message selon le rang et rappeler le besoin naturellement.
- Éval qualité : passer par `scripts/ai-eval.mjs` (situations client variées) avant/après
  tout changement de prompt. Mesurer : pertinence de l'intention, respect des garde-fous,
  naturel, longueur adaptée.
- Ton artisan France : chaleureux, direct, concret, rassurant, sans jargon ni sur-promesse.

## 5. Règles & sortie
- Ne jamais envoyer à une adresse issue d'une entrée non fiable sans les garde-fous
  existants (ban IP + honeypot + rate-limit). Toute modif de prompt/flux → vérification
  (skill `presti-verify`), jamais de vibecoding. Références : [[presti-ai-architecture]], [[presti-state]].
