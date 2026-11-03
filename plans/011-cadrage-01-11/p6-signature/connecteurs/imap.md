# Fiche connecteur — la boîte mail de l'artisan par IMAP et SMTP (tâche 036-003)

> Écrite le 03/11/2026 sur l'hôte d'agents d'Oracle, par Claude Code. Format : p6 § 0.4 (« Les vrais outils : les connecteurs »,
> `plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md:235-262`). Décision 2 du plan (`premiere-reponse.md` § 5) :
> **l'IMAP/SMTP existant d'abord**, sans application OAuth ni vérification Google. Les workflows qui s'en servent sont prouvés hors ligne par
> `scripts/boite-n8n-qa.mjs` ; **le nœud réel (imapflow, nodemailer) décrit plus bas n'est ni posé ni essayé** : il est préparé pour Benj,
> comme le veut `.claude/rules/securite.md` (aucun agent ne saisit un mot de passe, une clé ou un code OAuth).

## Fiche (les neuf champs de p6 § 0.4)

| Champ | IMAP / SMTP de la boîte de l'artisan |
|---|---|
| **Portées demandées** | Aucune portée OAuth. L'artisan saisit lui-même l'adresse et un **mot de passe d'application** (Gmail, Outlook : `lib/canaux.ts:122`) ; l'hôte est deviné d'après l'adresse (`lib/canaux.ts:5-18`). Minimum : lire `INBOX`, écrire dans le dossier Brouillons, envoyer (Signature seulement). Rien d'autre : ni suppression, ni déplacement, ni « marquer comme lu ». |
| **Ce qu'on lit** | `INBOX`, depuis la dernière relève (7 jours au plus, 40 messages au plus par passage : `lib/releveCanal.ts:101-112`). Par message : `Message-ID`, expéditeur (adresse, nom), objet, date, texte brut (8 000 caractères, citations ôtées : `lib/mailLite.ts:131`). Ni pièce jointe, ni HTML, ni autre dossier. |
| **Ce qu'on écrit** | (1) **Studio** : le brouillon, par `APPEND` dans le dossier Brouillons (usage spécial `\Drafts`, repli `Brouillons`, `Drafts`, `[Gmail]/Brouillons`, `[Gmail]/Drafts`, `INBOX.Drafts`), drapeau `\Draft`, **jamais envoyé** (`lib-boite-brouillon`). (2) **Signature** : une réponse par SMTP, au nom de l'artisan, son adresse en réponse, mention d'IA en pied, seulement pour le type `reponse_prospect` et seulement si toutes les conditions du pilote sont tenues (`lib-boite-envoyer`). (3) Côté plateforme : le message déposé **une fois** dans la conversation du client (`lib-boite-lire`) — écritures prévues, jamais faites dans ce lot. |
| **Où vit l'autorisation** | **Supabase, chiffrée**, table `connexions` (`supabase/migrations/0193_systeme_agents.sql:99-128`) : `secret_n8n` au format `v1.<iv>.<tag>.<données>` (AES-256-GCM, `lib/secretBox.ts:21-30`), chiffré avec **la clé propre à n8n**, jamais `CANAUX_KEY` ; n8n le déchiffre **en mémoire, à l'exécution**. Jamais dans un identifiant n8n, jamais dans un fichier versionné, jamais dans un journal (le juge le contrôle : L6). Décision 1 du plan (`premiere-reponse.md:359-371`). |
| **Retrait par le client** | Le bouton « Retirer » de « Connexions » (lot 036-009) : l'état passe à `retiree`, les deux secrets sont effacés par la base elle-même (`connexions_retiree_sans_secret`, `0193_systeme_agents.sql:126`). `lib-boite-lire` se tait dès que l'état n'est plus lisible (`retiree`, `expiree`, `erreur`). |
| **Expiration, refus** | Mot de passe changé ou refusé, autorisation expirée (cas OAuth futur) : `lib-boite-lire` **se tait**, prévoit l'état `erreur` avec son motif (`identifiants_refuses`, `autorisation_expiree`…) pour l'écran « Connexions », prévoit **une** alerte par `lib-alerter` (au titulaire), et **ne réessaie plus** tant que l'artisan n'a pas reconnecté (pas d'alerte toutes les 5 minutes). Rien ne plante : le statut reste `ok`. Panne passagère (serveur injoignable) : compteur du disjoncteur, aucune alerte. |
| **Quotas de l'API** | Pas d'API : des connexions IMAP. À 5 minutes, 288 relèves par boîte et par jour ; une seule connexion à la fois par boîte (les fournisseurs en tolèrent 10 à 15). Le nœud réel commence par lire **les enveloppes** (`Message-ID`) et ne télécharge que les messages inconnus, pour ne pas retélécharger la journée à chaque passage (`SINCE` n'a qu'une précision d'un jour). SMTP : plafonds des fournisseurs de l'ordre de 300 à 500 envois par jour et par boîte (à vérifier à la date du jour) ; le pilote plafonne à 20 par jour et par compte (`lib/pilote/regles.ts:30`). |
| **Coût** | 0 €. n8n existe déjà ; `imapflow`, `nodemailer` et `mailparser` sont gratuits ; une image d'exécuteurs à reconstruire sur Oracle (geste de Benj, plus bas). Aucun service payant. |
| **Le test qui le prouve** | `node scripts/boite-n8n-qa.mjs` (hors ligne) : un message n'entre qu'une fois ; une conversation par client quel que soit le canal ; la boîte d'un autre compte n'est pas lue ; jeton expiré = silence + état + alerte, sans plantage ; aucun secret en sortie ; brouillon jamais envoyé ; envoi Signature seulement, chaque condition du pilote retirée l'une après l'autre ; la comparaison à `releverCanal`, cas par cas ; 25 mutants. Et, **au premier branchement réel** : l'essai de lecture de `testerImap` (`lib/canaux.ts:86`) avant tout état `active` — « une synchronisation ne se promet qu'après un essai de lecture réussi » (C4, `connexions_active_verifiee`, `0193_systeme_agents.sql:127`). |

## Pourquoi le nœud réel n'est pas dans les exports

La garde `scripts/n8n-specs-qa.mjs` refuse tout module, réseau ou environnement dans un nœud Code (R19, `MODULE_OU_RESEAU`, l.119 et l.337-343) et tient
l'empreinte de chaque nœud Code. Les trois `lib-boite-*` passent donc **R1 à R20** avec une boîte **épinglée** (mode A, comme 035-003 à 035-005). Poser
`imapflow` exige deux gestes qui ne sont pas à un agent : (1) l'exploitation d'Oracle, (2) un **amendement de la garde** (R19-bis : un nœud Code déclaré
`connecteur: imap` peut charger `imapflow`, `nodemailer`, `mailparser`, `node:crypto`, `node:dns` et lire la seule variable `BOITE_CLE_N8N`, sous empreinte).
`scripts/n8n-specs-qa.mjs` est hors périmètre de 036-003 : l'amendement attend une tâche dont le périmètre le contient.

## Les gestes d'exploitation préparés pour Benj (aucun n'est fait)

1. **Exécuteurs.** Les nœuds Code tournent dans le conteneur `runners` (`/opt/n8n-complet/docker-compose.yml:91-100`, image `ghcr.io/n8n-io/runners`). Construire
   une image qui l'étend avec `imapflow`, `nodemailer` et `mailparser`, et déclarer dans le fichier de configuration des exécuteurs
   `NODE_FUNCTION_ALLOW_EXTERNAL=imapflow,nodemailer,mailparser` et `NODE_FUNCTION_ALLOW_BUILTIN=crypto,dns,net` (à relire dans la documentation n8n de la version 2.45.7 le
   jour du geste : le nom exact du fichier et des variables dépend de la version). Sauvegarder `docker-compose.yml` avant.
2. **La clé.** Générer 32 octets aléatoires en base64 **soi-même** (`openssl rand -base64 32`), la poser comme `BOITE_CLE_N8N` dans l'environnement des exécuteurs
   (jamais dans le dépôt, jamais dans un message). Elle chiffre `connexions.secret_n8n` (lot 036-009) ; ce n'est **pas** `CANAUX_KEY`.
3. **Les migrations**, dans cet ordre (`migration-production.md`) : `0185`, `0192`, `0193`, **puis** les drapeaux `systemeAgents` et `connexions`. À écrire avant le
   premier passage réel, par une tâche dont le périmètre est `supabase/**` : (a) la **vue étroite du travail dû** que lit `presti-boite` (boîtes actives du compte
   et leur connexion, `Message-ID` déjà importés, conversations ouvertes de 30 jours : une ligne = une boîte, `artisan_id` partout, jamais de texte libre) ; (b) un index
   **unique** sur `(artisan, Message-ID)` — `messages_externe_idx` n'est pas unique (`plans/audit-final/fiabilite.md`, 3.12) et la seule vraie garde du « une seule fois »
   est une contrainte en base ; (c) la fonction qui écrit **atomiquement** la conversation, le message et l'événement `demande_recue` (`effets_prevus` de `lib-boite-lire`).
4. **Le nœud réel**, ci-dessous, relu et essayé par Benj sur **sa** boîte de test, en simulation, avant tout `simulation: false`.
5. **Les paliers** : simulation → mode ombre sur un compte volontaire → Studio réel → Signature réel (`premiere-reponse.md:369-372`). Publier les enfants **avant** le parent
   (`fiche-methode-n8n.md:22-24`) : `lib-boite-lire`, `lib-boite-brouillon`, `lib-boite-envoyer`, puis `presti-boite`. Jamais `presti-banc-boite`.
6. **La migration de la relève quotidienne** (`.claude/rules/migration-production.md`) : les **pas 1 à 3** sont faits (workflows créés ; testés à blanc ; comparés à
   `releverCanal`, tableau dans la preuve). **Pas 4** (à Benj) : retirer l'entrée `/api/canaux/relever` de `vercel.json` (garder la route POST du bouton « Relever
   maintenant »). **Pas 5** (à Benj) : un drapeau `boiteParN8n` dans `lib/flags.ts`, levé après la migration, vérifié en production. Tant que le pas 4 n'est pas fait, le cron
   de 7 h et n8n coexistent sans doublon : n8n écrit le même `externe_id` et le même `canal_id` que `releverCanal`, qui le voit et l'ignore (`lib/releveCanal.ts:163-165`).

## Les contrôles que le nœud réel doit tenir (sinon il n'est pas posé)

- **L'hôte, à chaque passage** (rebinding DNS, audit du 20/10) : exactement les règles de `lib/hoteSur.ts` — port 993 ou 143 seulement, un **nom DNS public**, jamais une IP
  littérale, **toutes** les adresses résolues publiques, connexion à l'adresse validée avec le nom en SNI. Un exécuteur d'Oracle qui se connecterait à l'hôte saisi par un artisan
  sans cette validation serait un scanner du réseau interne d'Oracle. **Pour SMTP**, `verifierServeurSmtp` n'existe pas encore (« le SMTP des canaux n'est jamais contacté par le
  code », `lib/hoteSur.ts:6-7`) : à écrire sur le même modèle, avec les ports 465 et 587, **avant** `lib-boite-envoyer`.
- **Le secret** : déchiffré en mémoire avec `BOITE_CLE_N8N` (format `v1.<iv>.<tag>.<données>`, intégrité GCM vérifiée), jamais écrit, jamais passé à un journal, un message
  d'erreur ou une sortie de nœud. Les erreurs du serveur sont réduites à `identifiants_refuses`, `serveur_refuse`, `injoignable`, `jeton_expire` (les cinq issues du contrat).
- **Le texte** : produit par la même fonction que `lireMail` (`lib/mailLite.ts` : `sansCitation`, `texteDe`, 8 000 caractères) ; tant qu'il ne l'est pas, les décisions du tri
  (`texte.trim().length < 12`, `texte.length < 400`) divergent de `releverCanal`.
- **Un seul passage à la fois par boîte** : verrou (état dans Supabase) ou idempotence par clé. Deux passages qui se chevauchent doivent déposer chacun le même `Message-ID`
  sous la même clé, que la contrainte unique du point 3(b) refuse.

## Le nœud réel — texte préparé, NON exécuté, NON testé

> À poser, par Benj, dans `lib-boite-lire` à la place de l'emplacement épinglé « boîte », après les gestes 1 à 3 et l'amendement R19-bis. Il rend exactement la forme que
> le contrat `lib-boite-lire@1` attend en entrée (`donnees.boite`) : `{ issue, messages: [{ uid, message_id, de_email, de_nom, sujet, texte, date }] }`.

```js
// connecteur: imap — lecture (imapflow). Modules : imapflow, mailparser, node:crypto, node:dns. Variable : BOITE_CLE_N8N.
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const crypto = require('node:crypto');
const dns = require('node:dns').promises;

const PORTS_IMAP = [993, 143];
const PRIVEE = /^(10\.|127\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|0\.|::1$|fc|fd|fe80)/i; // à compléter avec lib/hoteSur.ts, qui fait foi
function dechiffrer(stocke) {
  const k = Buffer.from($env.BOITE_CLE_N8N || '', 'base64');
  const p = String(stocke || '').split('.');
  if (k.length !== 32 || p.length !== 4 || p[0] !== 'v1') return null;
  try {
    const d = crypto.createDecipheriv('aes-256-gcm', k, Buffer.from(p[1], 'base64url'));
    d.setAuthTag(Buffer.from(p[2], 'base64url'));
    return Buffer.concat([d.update(Buffer.from(p[3], 'base64url')), d.final()]).toString('utf8');
  } catch { return null; }
}
async function hoteSur(hote, port) {
  if (!PORTS_IMAP.includes(port) || /^\d+(\.\d+){3}$/.test(hote) || hote.includes(':') || /(^|\.)(local|localhost|internal|lan)$/i.test(hote)) return null;
  const adresses = await dns.lookup(hote, { all: true });
  if (!adresses.length || adresses.some((a) => PRIVEE.test(a.address))) return null;
  return adresses[0].address; // on se connecte à l'adresse validée, le nom reste en SNI
}
return (await Promise.all($input.all().map(async (item) => {
  const { canal, connexion, hote, port, identifiant } = item.json; // lus en base par l'appelant : jamais d'hôte venu d'ailleurs
  const sortie = (issue, messages) => ({ json: { ...item.json, boite: { issue, messages: messages || [] } } });
  const mdp = dechiffrer(connexion.secret_n8n);
  if (!mdp) return sortie('identifiants_refuses');
  const adresse = await hoteSur(hote, port);
  if (!adresse) return sortie('serveur_refuse');
  const client = new ImapFlow({ host: adresse, servername: hote, port, secure: port === 993, auth: { user: identifiant || canal.adresse, pass: mdp }, logger: false });
  try {
    await client.connect();
    const verrou = await client.getMailboxLock('INBOX');
    try {
      const depuis = new Date(Math.max(canal.derniere_releve ? Date.parse(canal.derniere_releve) : 0, Date.now() - 7 * 86400000));
      const connus = new Set(item.json.message_ids_connus || []);
      const messages = [];
      for await (const m of client.fetch({ since: depuis }, { uid: true, envelope: true })) { // enveloppes d'abord
        if (!m.envelope.messageId || connus.has(m.envelope.messageId)) continue;
        if (messages.length >= 40) break;
        const brut = await client.download(m.uid, undefined, { uid: true });
        const lu = await simpleParser(brut.content);
        messages.push({ uid: m.uid, message_id: m.envelope.messageId, de_email: (lu.from?.value?.[0]?.address || '').toLowerCase() || null,
          de_nom: lu.from?.value?.[0]?.name || null, sujet: lu.subject || '', texte: String(lu.text || '').slice(0, 8000), date: lu.date ? lu.date.toISOString() : null });
      }
      return sortie('ok', messages);
    } finally { verrou.release(); }
  } catch (e) {
    return sortie(e.authenticationFailed ? 'identifiants_refuses' : 'injoignable'); // ni message brut, ni secret
  } finally { try { await client.logout(); } catch {} }
}))).filter(Boolean);
```

L'écriture du brouillon (Studio), même amendement, même contrôle d'hôte :

```js
// connecteur: imap — brouillon. Pour chaque effet `ajouter_brouillon_imap` de lib-boite-brouillon.
const liste = await client.list();
const dossier = (liste.find((d) => d.specialUse === '\\Drafts') || liste.find((d) => effet.dossier.repli.includes(d.path)))?.path;
if (!dossier) return { json: { ...effet, fait: false, motif: 'dossier_brouillons_introuvable' } };   // rien n'est créé : on ne devine pas
await client.append(dossier, Buffer.from(effet.message_brut, 'binary'), effet.drapeaux);               // drapeau \Draft ; aucun envoi
```

L'envoi (Signature), derrière la sortie « faux » de la porte « simulation », en remplacement du nœud désactivé :

```js
// connecteur: smtp — envoi. Hôte validé comme l'IMAP (ports 465 et 587), mot de passe déchiffré comme plus haut.
const t = nodemailer.createTransport({ host: adresse, servername: hote, port, secure: port === 465, requireTLS: port === 587, auth: { user: identifiant, pass: mdp } });
await t.sendMail({ from: effet.expediteur, replyTo: effet.reply_to, to: effet.destinataire, subject: effet.objet, text: effet.texte, inReplyTo: effet.in_reply_to, references: effet.references });
```

## Ce que ce lot ne fait pas, dit en toutes lettres

- Aucun appel réseau, aucune lecture ni écriture de Supabase, aucun envoi, aucun identifiant n8n créé ou modifié, aucune migration appliquée, aucun workflow publié.
- Le nœud réel ci-dessus n'a **jamais tourné** : seuls les workflows en simulation et leur juge sont prouvés.
- Les réseaux (Le Bon Coin, LinkedIn, etc.) restent à `releverCanal` : leur lecture exige la vérification DKIM (`lib/canaux/dkim.ts`), qui demande le DNS.
- `type_chantier` et `ville` d'une conversation neuve restent calculés par le code (`typeChantier`, `villeDe`) : l'effet `creer_conversation` les nomme dans `a_calculer_par_le_code`.
