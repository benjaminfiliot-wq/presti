# Brief des sous-agents — tâche 035-014 (colonne « Ce qui s'applique à Presti »)

Tu es architecte produit de Presti (SaaS pour artisans français du bâtiment : le prospect écrit sur la page de l'artisan, l'IA prépare la
réponse, chiffre un devis, relance ; **Studio prépare et l'artisan valide, Signature envoie seul** ; l'offre **Entreprise sur mesure** =
workflows n8n par client). Tu lis des vidéos TikTok d'un tiers (@restructureai) pour en tirer ce qui sert, **sans rien recopier ni rien inventer**.

## Ta mission
Pour chaque fiche de ton lot (fichier Markdown, une fiche par « ## N. »), écrite par Hermes sur la seule transcription :
1. REGARDE la planche d'images de la vidéo : `/home/usine/agents/videos/references-2026-11-02/restructureai/<id>.planche.jpg` (3 × 3 cases,
   lues ligne par ligne ; case k de 1 à 9). **Le hook de lecture refuse les images sans `offset` et `limit` : appelle Read avec
   `offset: 0, limit: 2000`.** Une image par seconde existe aussi dans `<id>-images/NNN.jpg` si tu dois lire un écran de près (même astuce).
2. Numéro d'image d'une case : `image = 1 + (k-1) × ⌊N/9⌋`, N = nombre de fichiers de `<id>-images/`. Le tableau est prêt :
   `.orchestre/preuves/035-014/carte-planches.txt` (fiche, id, N, pas, images des 9 cases). Vérifié par comparaison de pixels sur 4 vidéos.
3. Écris le champ **« Ce qui s'applique à Presti / à ce client »** : 3 à 8 lignes, chacune reliée à ce qui EXISTE ou est PRÉVU, au fichier ou
   à la tâche près (voir « Références vérifiées »). Chaque ligne dit : ce que la vidéo fait (avec horodatage `[mm:ss]` ou `image NNN`),
   ce que Presti en retient ou en refuse, et à quoi cela se relie. Si une idée est nouvelle, écris « à proposer à Benj, dans n8n ».
4. **Corrige « Ce qu'elle montre »** si la planche montre un écran que la transcription ne dit pas : AJOUTE une ligne « - Planche, images
   NN, NN… : … » (le champ doit rester entre 3 et 8 lignes ; fusionne si besoin). Cite les numéros d'image réels. Dis ce qui est écrit à
   l'écran (noms d'outils lus, boutons, listes, « Take over », badge « AI ASSISTANT », etc.). Ne recopie JAMAIS plus de 15 mots d'affilée de la
   transcription ; ne mets aucun chiffre dans « Ce qu'elle montre » qui ne soit déjà marqué dans « Chiffres annoncés » (sinon, ajoute-le
   là avec « : lu sur une maquette, non vérifié »). Les écrans sont des maquettes : ils illustrent, ils ne prouvent rien.
5. Pour une vidéo **sans parole** (images seules : fiches 38, 43, 48, 52, 56, 63) la planche EST la source : lis-la avec soin, et si besoin
   les images une à une ; corrige « Ce qu'elle montre » en conséquence (les horodatages de ces fiches sont des `image NNN`).

## Comment écrire dans les fiches (obligatoire)
Écris un fichier JSON puis lance l'outil (il ne modifie que ton fichier de lot, et refuse un champ déjà écrit) :
```
node .orchestre/preuves/035-014/appliquer.mjs <lot 2|3> /tmp/lotN-X.json
```
Format : `{ "30": { "montre": ["- Planche, images …"], "applique": ["- …", "- …"] }, "31": { … } }` (`montre` facultatif ; les lignes
commencent par « - »). Écris par paquets de 3 à 5 fiches. Puis vérifie : `node scripts/fiches-videos-qa.mjs <fichier de ton lot>` doit
rester vert (code 0). Un rouge = à corriger dans le fichier (Edit), sans toucher à une autre fiche.
Interdits : tout autre fichier que ton fichier de lot et `/tmp` ; commit, push, build, migration, réseau, secrets ; `git restore/checkout/stash/reset/clean`.

## Règles de fond à tenir
- Aucun chiffre de gain présenté comme vérifié ; aucun chiffre sans source. Aucune donnée inventée.
- Presti ne reprend PAS : appel téléphonique par l'IA, rendez-vous pris seul, créneau inventé, paiement/acompte pris par l'IA, publicité payante
  sans accord de Benj, collecte LinkedIn, modèle gratuit en ligne avec des données de client, clonage de voix sans accord. Dis-le quand la vidéo le fait.
- L'artisan ne parle qu'à l'assistant de Presti ; jamais « agent », « workflow », « n8n », « Hermes », « Orca », nom de modèle, devant lui.
  L'orchestrateur Entreprise n'est pas un agent : c'est un workflow parent qui route sans modèle.
- Toute automatisation = n8n (ADR-001), jamais du code en dur ; Studio = rien ne part sans le clic ; Signature = envoie seul les types prévus.
- Presti n'a aucun accès bancaire ni comptable. Une décision d'argent est calculée par le code, pas par un modèle.
- Vocabulaire : « Jeff » / « Jev » = outil de tri/décision de l'auteur, non identifié (les écrans le nomment « Jev »).

## Références vérifiées (cite-les ; n'en invente pas d'autres)
Modèle d'écriture : `plans/011-cadrage-01-11/p5-entreprise/fiches-compte-restructureai-lot1.md` (fiches 12 à 29, déjà jugées : relis-en 4 ou 5
pour le ton et le niveau de détail) et `fiches-videos-restructureai.md` (les 11 premières).
- Lots du chantier 4 (plan `plans/011-cadrage-01-11/chantier-4-assistant-plan.md`) : L5 accueil « Aujourd'hui » (032-041 ; « À valider, l'argent
  d'abord ») ; L15 `presti-briefing-matin` (résumé du matin, n8n, inactif, ne déclenche jamais le pilote) ; L16 carte de lot (`lib/assistant/cartes.ts`,
  retenus/exclus/motif, un geste) ; L18 « après-chantier » (facture préparée puis entretien proposé, `lib/apresChantier.ts`) ; L12 n8n détecteurs 11
  (réponse à une relance d'impayé) et 12 (entretien) ; L3 n8n détecteurs (6 = demandes sans réponse, 1 = impayé) ; L13/L14 mise en route (« Décrire mon
  entreprise », A6) ; L21 marge estimée sur matériaux (A7) ; A8 solde de crédits ; B4 briefing ; rang 10 : aucune relance ne culpabilise ni n'invente
  une urgence ; §7 vocabulaire interdit ; §9 détecteurs classés par argent récupéré.
- Entreprise (`plans/011-cadrage-01-11/p5-entreprise/premiere-reponse.md`) : `ent-exemple-parent` (workflow parent, 035-007) ; gabarits `lib-*`
  (035-003 à 035-005) : `lib-capturer-lead`, `lib-dedoublonner`, `lib-qualifier-lead` (note+priorité par le code), `lib-decider`, `lib-relancer`,
  `lib-rediger-message`, `lib-porte-conformite` (veto), `lib-executer`, `lib-journaliser`, `lib-alerter`, `lib-erreur-commune`, `lib-disjoncteur`,
  `lib-battement`, `lib-rapport-hebdo` (un chiffre sans source est refusé), `gabarit-synchroniser-outil` (rang 3, liste d'accès signée) ; hiérarchie §4.2
  (rang 0 gérant, rang 1 orchestrateur et conformité, rang 2 qualification/alerte/reporting/relance/rédaction) ; fiche de découverte 035-002 (§5.2) ;
  entreprise fictive Bâti-Démo (§5.1) ; bibliothèque §5.5 ; phases §7.2 ; KPIs §7.3 ; contrats p5:159-162 ; `lib-*` recopiés d'un client à l'autre, jamais les données (p5:158).
- Code et base : `lib/ai.ts` (+ `routerModele`, `lib/ai/routage`), `lib/plans.ts` (`:11` Studio prépare), `lib/pilote/regles.ts` (`:191` escalade, perte d'eau
  urgente), `lib/relancesRegistre.ts` (`:18` jamais deux relances en 3 jours), `lib/relances.ts` (J+2, J+5, J+10), `lib/relancesImpayes.ts`, `lib/apresChantier.ts`,
  `lib/email.ts:6-11` (e-mails au nom de l'artisan, Reply-To), `leads.origine` (`0177_canaux_reseaux.sql`), `/p/[slug]` et `/site/[slug]` (pages de l'artisan),
  `/api/canaux/relever` (cron), `scripts/persona-e2e.mjs` (ton de l'artisan prouvé), tables 0185 : `assistant_journal`, `passages_detecteurs`,
  `relances_exclusions`, `opportunites_decisions` ; `0189_role_lecture_n8n.sql` (n8n lit en lecture seule) ; `lib/sms/` (SMS, liste fermée, consentement) ; capacités `crm`,
  `chiffres` (`lib/plans.ts`).
- Règles : `.claude/rules/autonomie-abonnements.md` (tout auto par défaut ; vidéos et carrousels : 2-3 premiers validés par Benj puis auto sous QA),
  `email-brevo.md` (300/jour, plafond, opt-out), `securite.md`, `architecture-outils.md` (collecte LinkedIn interdite ; Firecrawl en ligne, Apify, WaveSpeed interdits ;
  SearXNG, Firecrawl auto-hébergé, Crawlee, ScrapeGraphAI sur Oracle), `migration-production.md`. Prospection de Presti = chantier 3 ; contenus/vidéos/carrousels = chantier 5.
- Réseau neuronal (MCP `cerveau`) : `regles_pour`, `chercher`, `lire` en lecture seule si tu doutes d'une règle (ne rien écrire dans le vault).

## Rapport final (court, dans ta réponse)
Pour chaque fiche : une ligne « écran vu que la transcription ne disait pas » (ou « rien de plus »). Puis 5 à 8 puces « motifs transverses » que
tu as vus dans ton lot (utiles pour la synthèse : workflows n8n, interface, offre Entreprise, ce que Presti ne reprend pas) avec fiche + image. Signale toute
fiche où la planche contredit la transcription ou le texte de Hermes.
