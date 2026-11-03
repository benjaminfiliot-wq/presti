// 036-016 — écrit les quatre fiches `outillage/gabarits/ent-{accueil,leads,ventes,marketing}.md` : les listes (nœuds, tables, API, voies, espaces à remplir)
// sont TIRÉES DES EXPORTS, jamais recopiées à la main ; seuls les textes d'explication sont écrits ici.
//   node .orchestre/preuves/036-016/fiches.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const SORTIE = path.resolve(ICI, '../../../plans/011-cadrage-01-11/p6-signature/outillage/gabarits')
fs.mkdirSync(SORTIE, { recursive: true })
const charge = (n) => JSON.parse(fs.readFileSync(path.join(ICI, `${n}.workflow.json`), 'utf8'))
const court = (t) => t.replace('n8n-nodes-base.', '').replace('@n8n/n8n-nodes-langchain.', 'langchain.')
const aretes = (wf, nom) => Object.entries(wf.connections?.[nom] ?? {}).flatMap(([genre, l]) => (l ?? []).flatMap((s, i) => (s ?? []).map((x) => ({ vers: x.node, genre, sortie: i }))))

function faits(wf) {
  const noeuds = wf.nodes
  const parType = {}
  for (const n of noeuds) parType[court(n.type)] = (parType[court(n.type)] ?? 0) + 1
  const tables = { lues: new Set(), ecrites: new Set(), modifiees: new Set() }
  const hotes = new Set()
  for (const n of noeuds.filter((x) => x.type === 'n8n-nodes-base.httpRequest')) {
    const u = new URL(n.parameters.url), m = String(n.parameters.method).toUpperCase()
    if (u.host.includes('supabase')) (m === 'GET' ? tables.lues : m === 'POST' ? tables.ecrites : tables.modifiees).add(u.pathname.split('/').pop())
    else hotes.add(`${m} ${u.host}${u.pathname}`)
  }
  const agents = noeuds.filter((n) => n.type.endsWith('.agent')).map((a) => {
    const entrants = noeuds.flatMap((n) => aretes(wf, n.name).filter((x) => x.vers === a.name).map((x) => ({ ...x, n })))
    return { nom: a.name, outils: entrants.filter((x) => x.genre === 'ai_tool').map((x) => x.n.name), modele: entrants.filter((x) => x.genre === 'ai_languageModel').map((x) => x.n.name)[0], parseur: entrants.filter((x) => x.genre === 'ai_outputParser').map((x) => x.n.name)[0] }
  })
  const voies = (wf.nodes.find((n) => n.name === 'Quel effet ?')?.parameters.rules.values ?? []).map((v) => v.outputKey)
  const types = new Set(); const reservees = []
  for (const n of noeuds.filter((x) => x.name === 'Décider les effets')) for (const m of n.parameters.jsCode.matchAll(/poser\('([a-z_]+)', '([a-z_]+)'/g)) types.add(`${m[2]} → voie ${m[1]}`)
  for (const m of noeuds.find((x) => x.name === 'Décider les effets').parameters.jsCode.matchAll(/poser\(([^,]+), '([a-z_]+)'/g)) types.add(`${m[2]} → voie ${m[1].replace(/'/g, '')}`)
  const espaces = new Set()
  for (const n of noeuds.filter((x) => x.type !== 'n8n-nodes-base.code')) for (const m of JSON.stringify(n.parameters).matchAll(/\b([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)\b/g)) if (!/^(HTTP|JSON|GET|POST|PATCH|PULL_FROM_URL|MEDIA_UPLOAD|LAST_30_DAYS)/.test(m[1])) espaces.add(m[1])
  const codes = noeuds.filter((n) => n.type === 'n8n-nodes-base.code').map((n) => n.name)
  const portes = noeuds.filter((n) => /porte: simulation/.test(n.notes ?? '')).map((n) => n.name)
  return { n: noeuds.length, parType, tables, hotes, agents, voies, types, espaces, codes, portes, outilsNatifs: noeuds.filter((n) => /^n8n-nodes-base\./.test(n.type) && !/(code|if|set|switch|merge|filter|noOp|stickyNote|httpRequest|stopAndError|scheduleTrigger)$/.test(n.type)).map((n) => `${n.name} (${court(n.type)} ${n.typeVersion})`) }
}
const liste = (a) => [...a].map((x) => `\`${x}\``).join(', ') || '—'
const puces = (a) => [...a].map((x) => `- ${x}`).join('\n')

const COMMUN_REGLES = `## Ce que le gabarit ne fait JAMAIS (tenu par le juge \`scripts/gabarits-entreprise-qa.mjs\`)

- Aucun identifiant, même celui de la base : la copie du client branche les siens après son accord écrit et le « go » de Benj (OUTILLAGE.md § 4, O3) ; un agent n'en crée jamais.
- Aucun déclencheur à webhook : n8n d'Oracle n'est pas exposé (OUTILLAGE.md § 3). Les canaux à webhook (WhatsApp, Messenger, Instagram, SMS, page publique) arrivent chez la plateforme, qui les range en base ; n8n les relit.
- Aucun appel au modèle, aucune écriture, aucun envoi sans passer par la sortie « faux » d'une porte « simulation » (R15). Sans configuration lisible, c'est la simulation.
- Aucun montant, aucun score, aucune date limite écrit par le modèle : le schéma strict du modèle n'en a pas, le nœud Code qui revalide calcule (R18).
- Aucune donnée d'une autre organisation : chaque lecture et chaque écriture porte \`organisation_id\`, et chaque ligne lue est re-contrôlée dans le code (R14, C6).
- Aucun nom de la plateforme dans un message pour un tiers (marque blanche) ; la mention de l'assistant (« Message rédigé et envoyé automatiquement par l'assistant de … ») est en pied de tout texte du modèle qui part.
- Aucune collecte LinkedIn : LinkedIn sert à publier, sur le compte du client.
- Un effet n'a lieu qu'une fois : sa clé d'idempotence est réservée dans \`entreprise_actions\` AVANT l'effet ; un rejeu ou un plantage ne double rien.`

const COMMUN_AUTONOMIE = `## L'autonomie, type d'action par type d'action (annexe d'autonomie du contrat, p6:440)

Le nœud « Décider les effets » lit \`entreprise_autonomie\` (un niveau par \`type_action\`) :
- **niveau 1** : *préparer* — une carte « brouillon » dans la plateforme, rien ne sort ;
- **niveau 2** (**défaut pour tout type absent de l'annexe** : « par défaut, tout commence en carte à valider », \`kit/annexe-autonomie.md\`) : une carte **« À valider »** ; le membre du bon périmètre l'approuve (C6), puis la relève des cartes exécute l'effet sous la clé \`…:approuvee\` ;
- **niveau 3** : l'effet part seul, dans le plafond du jour de l'annexe (\`plafond_jour\`, 20 par défaut comme \`PLAFOND_AUTO_JOUR\`) **après la fenêtre d'annulation** (\`delai_annulation_min\`, 10 minutes par défaut comme le pilote automatique, \`lib/pilote/regles.ts:27\`) : c'est une carte « annulable » que la relève exécute à l'échéance, et que le membre peut annuler d'ici là. Au-delà du plafond : retour en carte.
- **Jamais en automatique, même réglé en 3** : la demande de signature (Yousign, DocuSign), une proposition dont un prix est estimé, une réponse à un message qui parle de litige, de sinistre, d'avocat, d'assureur ou de plainte, une publication tant que le format n'a pas ses 2-3 validations.
Seuls le dépôt dans la plateforme et la notification de l'équipe valent 3 sans annexe : ce sont des écritures internes. Même autonomie que Signature : « pas un niveau d'autonomie différent » (p6:440).`

const ENTETE = (nom, titre, surtitre) => `# ${nom} — ${titre}

> Fiche du gabarit, écrite par la tâche 036-016 (prompt 6, outillage, lot 4 ; prompt 2, Entreprise sur mesure) le 03/11/2026. Export : \`.orchestre/preuves/036-016/${nom}.workflow.json\`.
> ${surtitre}
> **Inactif, sans identifiant, en simulation.** On le copie en \`client-<slug>-<département>\` pour chaque entreprise cliente avec **ses** comptes (OUTILLAGE.md § 4, O1) ; le premier client est l'organisation de Benj, client zéro (p6:459-466).`

function fiche(nom, spec) {
  const wf = charge(nom), f = faits(wf)
  const md = `${ENTETE(nom, spec.titre, spec.surtitre)}

## Ce qu'il fait

${spec.fait}

## Chemin d'un passage

${spec.chemin}

## Les outils (nœuds réels, ${f.n} nœuds au total)

${spec.outils}

Nœuds natifs de l'export (type et version, tirés du fichier) :
${puces(f.outilsNatifs)}

API appelées par un nœud HTTP (hôte écrit en dur, jamais calculé : R7) :
${puces(f.hotes)}

## Les agents IA (Claude, parseur à schéma strict, outils de lecture seulement)

${f.agents.map((a) => `- **${a.nom}** — modèle \`${a.modele}\`, parseur \`${a.parseur}\`, outils : ${a.outils.map((o) => `\`${o}\``).join(', ')}.`).join('\n')}

${spec.agents}

## Les tables de la plateforme (noms indicatifs : la migration est celle du lot d'intégration 036-012, pas de ce lot)

- Lues : ${liste(f.tables.lues)}
- Écrites : ${liste(f.tables.ecrites)}
- Mises à jour : ${liste(f.tables.modifiees)}

${spec.tables}

## Les types d'action (une ligne de l'annexe d'autonomie chacun)

${puces(f.types)}

## Les voies d'effet (sortie de « Quel effet ? »)

${f.voies.map((v) => `\`${v}\``).join(', ')}.

${COMMUN_AUTONOMIE}

## Organisation multi-membres (C6)

Chaque carte porte son \`perimetre\` et ses \`approbateurs_roles\`, lus dans la configuration (\`perimetres\`, \`approbateurs\`) ; la relève des cartes n'exécute une carte approuvée que si le rôle de l'approbateur est dans la liste. ${spec.equipe}

## Ce que la copie du client remplace (espaces écrits en majuscules dans l'export)

${puces([...f.espaces].sort().map((e) => `\`${e}\``))}
Et les identifiants : Gmail/Outlook/IMAP, WhatsApp, Meta, LinkedIn, TikTok, X, YouTube, le CRM du client, l'outil de séquence, Slack ou Teams, la clé du modèle, la base de la plateforme. Un seul CRM : on garde sa branche du Switch « Quel CRM ? » et on débranche les sept autres.

## Les essais (hors ligne, données épinglées « Exemple. », rejeu des nœuds Code par le juge)

${spec.essais}

Le rejeu est celui du **code des nœuds Code** (bac à sable \`node:vm\`), pas une exécution dans n8n : \`test_workflow\` n'a pas été joué dans ce lot (le MCP n8n n'est pas branché sur l'hôte d'agents). La sortie complète est dans \`essais-n8n.json\`.

${COMMUN_REGLES}

## Limites et points à confirmer à l'essai de lecture du client

${spec.limites}

## Sources

- Dépôts n8n lus (forme seulement, aucun JSON importé) : \`.orchestre/preuves/036-016/depots-ouverts.md\`.
- Vidéos et fiches relues : \`.orchestre/preuves/036-016/videos-lues.md\` ; \`plans/analyse-videos.md\` ; \`plans/011-cadrage-01-11/p5-entreprise/fiches-videos-restructureai.md\`.
- Nœuds : \`.orchestre/preuves/036-016/squelettes-noeuds.json\` (MCP n8n-oracle \`get_node_types\`, \`search_nodes\`) ; bonnes pratiques : \`.orchestre/preuves/036-016/bonnes-pratiques-n8n.md\`.
- Cadre : \`plans/011-cadrage-01-11/p6-signature/outillage/OUTILLAGE.md\` § 4 à 8 ; prompt 6, § 2.1 à 2.6 (l.426-560).
`
  fs.writeFileSync(path.join(SORTIE, `${nom.replace('gabarit-', '')}.md`), md)
  return md.length
}

const SPECS = {
  'gabarit-ent-accueil': {
    titre: 'Accueil et qualification (Entreprise sur mesure)',
    surtitre: 'Département 1 du § 7 de OUTILLAGE.md : Gmail, Outlook, IMAP multi-boîtes ; WhatsApp ; Messenger et Instagram ; Typeform, Jotform, Tally ; Calendly et Cal.com.',
    fait: `Reçoit les messages de toutes les entrées du client, les trie en trois classes, qualifie les demandes réelles sur une **grille écrite avec le client**, dépose chaque message dans la conversation de la plateforme, crée **une seule fiche** dans le CRM du client et prépare (ou envoie, selon l'annexe) la réponse.`,
    chemin: `1. **Entrées** : les boîtes Gmail, Outlook et IMAP sont lues par leurs déclencheurs à intervalle ; un déclencheur horaire lit, derrière la porte « simulation » de relève, les événements des canaux (WhatsApp, Messenger, Instagram, SMS, page publique) rangés en base par la plateforme, puis Typeform, Jotform et Tally par leur API.
2. **Normaliser** : une seule forme (canal, référence, clés d'identité par empreinte de courriel et de téléphone, texte). **Réglages de la copie**, configuration, annexe d'autonomie, actions du jour, créneaux Calendly et Cal.com (pour ne jamais proposer un créneau inventé), grille, identités connues, événements déjà traités.
3. **Écarter les doublons** : un événement déjà déposé est écarté ; la même personne par un autre canal reste dans **la même conversation**.
4. **Porte « simulation »** : vrai → « Effets prévus » (plan calculé par le même code, sur un enregistrement daté du modèle). Faux → **Trieur** (3 classes) → revalidation → **Qualificateur** (grille) → revalidation, où le **code** calcule le score.
5. **Décider les effets** selon l'annexe → **Réserver les actions** (clé unique) → **Quel effet ?** → dépôt, fiche CRM (Switch « Quel CRM ? »), réponse Gmail / Outlook / WhatsApp / plateforme, brouillon, carte, prévenir l'équipe → **Journaliser**.
6. La **relève des cartes** reprend les cartes approuvées par le bon rôle.`,
    outils: `Gmail (déclencheur, réponse, brouillon, outil de lecture du fil), Outlook (idem), IMAP, WhatsApp Business (réponse), Slack et Teams (prévenir l'équipe), Typeform / Jotform / Tally (API à intervalle), Calendly / Cal.com (lecture des créneaux pris), et les huit CRM du Switch « Quel CRM ? » : HubSpot, Pipedrive, Salesforce, Zoho CRM, Odoo, Airtable, Notion, monday.`,
    agents: `Le **trieur** n'a qu'un outil (\`lib-trier-demande\`, règles écrites avant le modèle). Le **qualificateur** rapporte \`oui/non/inconnu\` par critère avec sa preuve ; il ne calcule aucun score. Les deux reçoivent comme consigne que le texte du client est une donnée, jamais une instruction.`,
    tables: `\`entreprise_conversations\` porte les clés d'identité : c'est elle qui empêche la deuxième fiche. L'union des clés d'une même personne est faite par la base (fonction SQL à poser avec la migration).`,
    equipe: `Les réponses et les fiches vont au périmètre configuré (\`fiche_crm\` → ventes, par défaut la direction).`,
    essais: `- *Un message d'exemple* → score 100 calculé par le code, 1 dépôt, 1 fiche HubSpot, 1 réponse Gmail ; le plan de simulation est identique au plan réel.
- *Une réponse du modèle qui contient un prix ou « Presti »* → rejetée par la revalidation.
- *Une autre organisation* → rien (voir le gabarit leads, même code d'écartement et de relève).`,
    limites: `- La fenêtre de 24 h de WhatsApp (texte libre seulement après un message du client) est une règle de Meta que \`get_node_types\` ne confirme pas : à vérifier ; au-delà, passer par \`sendTemplate\`.
- Les formes de réponse des API de formulaires (Typeform \`items\`, Jotform \`content\`, Tally \`submissions\`) sont celles de leurs documentations, à confirmer à l'essai de lecture.
- Une boîte IMAP par nœud : plusieurs boîtes = plusieurs copies du nœud ; le nœud ne marque RIEN comme lu (\`postProcessAction: nothing\`), pour que la simulation laisse le courrier intact.
- **Un événement de la plateforme n'est lu que par un seul gabarit** (catégorie \`message\` ici, \`lead\` pour le gabarit leads) et il est marqué « traité » même quand le trieur l'écarte : sinon il repasserait par le modèle à chaque relève.
- **Plafonds** : deux exécutions simultanées (un déclencheur de boîte et la relève de 10 minutes) lisent les mêmes « faits » avant d'écrire : le plafond du jour peut être dépassé de quelques unités. Le jour est celui de Paris.
- **Panne entre deux effets d'un même message** : le dépôt dans la conversation marque l'événement « traité » ; une panne juste après lui, avant la fiche ou la réponse, laisse une action « réservée » sans « faite » dans le journal. Rien n'est doublé, mais rien ne repart seul : un détecteur du lot d'intégration doit signaler les actions réservées depuis plus de 15 minutes.`,
  },
  'gabarit-ent-leads': {
    titre: 'Leads et acquisition (Entreprise sur mesure)',
    surtitre: 'Département 2 du § 7 de OUTILLAGE.md : Facebook Lead Ads (API Graph), LinkedIn (publication), Google Ads, Instagram ; séquences Brevo, Mailchimp, ActiveCampaign, Lemlist ; ManyChat ; chaque lead dans son CRM et dans la plateforme.',
    fait: `Lit les leads du client (Facebook Lead Ads par l'API Graph, réservations Cal.com, événements Instagram et Messenger rangés par la plateforme), calcule leur score **par le code**, les dédoublonne entre canaux, crée **une seule fiche** dans le CRM du client, rédige le premier message d'une séquence et l'inscrit **sur le compte d'envoi du client** (Brevo, Mailchimp, ActiveCampaign ou Lemlist) ou lance son flux ManyChat. Publie sur LinkedIn l'aimant à leads déjà validé. **Désinscription et quota sont lus avant chaque envoi.**`,
    chemin: `1. **Relève** (derrière la porte « simulation ») : Facebook Lead Ads par l'API Graph (nœud natif, lecture), Cal.com, rapport Google Ads (nombres seulement), événements des canaux, aimants à leads validés.
2. **Normaliser** → tronc (configuration, annexe, actions du jour, disponibilité Calendly, identités connues, événements traités) → **Écarter les doublons** (une personne = une conversation, quel que soit le canal) → **porte « simulation »**.
3. Faux → **Rédacteur de séquence** (rapports et aimants exclus) → revalidation (score calculé ici) → **Décider les effets** → **Réserver** → **Contrôler les envois** : un désinscrit est *exclu* et journalisé ; au-delà du plafond (celui du client et celui du compte), la suite part en **file pour le lendemain** — jamais perdue, jamais bloquée (\`email-brevo.md\`).
4. Voies : dépôt, fiche CRM (Switch \`Quel CRM ?\`), séquence Brevo / Mailchimp / ActiveCampaign / Lemlist, ManyChat, LinkedIn (publier), indicateur, carte, exclusion, file, prévenir l'équipe.`,
    outils: `Facebook Lead Ads / Graph, Cal.com, Calendly (créneaux pris), Google Ads (rapports), Brevo (lecture du contact, ajout, premier message), Mailchimp, ActiveCampaign, Lemlist, ManyChat (API), LinkedIn (publication seulement), Slack, Teams, et les huit CRM.`,
    agents: `Le **rédacteur de séquence** choisit le canal conseillé (courriel, ManyChat, aucun) et écrit le message ; il lit les fiches du CRM (HubSpot, Airtable, Notion) et contrôle les conflits (\`lib-controler-conflit\`). Son schéma n'a ni score ni montant. monday est lu par son nœud, pas en outil d'agent : le juge commun n'admet comme lecture d'outil que \`get\`, \`getAll\`, \`search\`… et monday nomme la sienne \`getItems\`.`,
    tables: `\`entreprise_desinscrits\` est la liste de désinscription du client, relue **avant chaque envoi** ; elle prime sur toute autre liste. La liste noire du fournisseur (Brevo) est relue en plus.`,
    equipe: `Les cartes de séquence vont au périmètre configuré pour \`inscrire_sequence\` ; le plafond d'envoi est une règle du client, jamais de la plateforme.`,
    essais: `- *Un lead Facebook* → 1 dépôt et 1 fiche HubSpot ; score 70 calculé par le code (urgence « sous un mois » 40 + budget 30) ; le score de 100 donné par le modèle est ignoré ; plan de simulation = plan réel.
- *Le même lead par deux canaux* (Facebook + Cal.com) → 2 dépôts, **1 fiche** ; reçu d'un lot à l'autre → 0 fiche.
- *Un désinscrit* → exclu, aucune séquence. *Un quota de 2 avec 1 envoi déjà fait* → 1 part, 2 en file ; le plafond du compte (1 crédit) borne aussi.
- *Une autre organisation* → ni conversation, ni carte, ni configuration ne passent.`,
    limites: `- **Calendly** : les invités se lisent par un chemin à identifiant (\`/scheduled_events/{uuid}/invitees\`), que la garde refuse (hôte et adresse écrits en dur, R7). Le gabarit lit donc seulement les créneaux pris ; les invités Calendly demandent un sous-workflow (lot d'intégration).
- **Google Ads** : la forme des lignes (\`campaign\`, \`metrics.cost_micros\`) est supposée d'après l'API ; à confirmer à l'essai de lecture.
- **Quota du compte** : la réponse de \`GET /v3/account\` est lue par \`creditsType\` ou \`type\` égal à \`sendLimit\` ; la forme est à vérifier à l'essai de lecture. Sans elle, le plafond du client (\`quota_jour\`) s'applique seul. Les relances de devis (gabarit ventes) ont leur propre plafond (\`quota_relances_jour\`) : elles ne consomment jamais le quota de prospection froide.
- **Désinscription** : le premier message nomme son expéditeur (\`expediteur_courriel\`), porte l'en-tête \`List-Unsubscribe\` et la ligne « répondez STOP ». Les réponses STOP et les désinscriptions du fournisseur doivent alimenter \`entreprise_desinscrits\` (Brevo Trigger ou lecture à intervalle, lot d'intégration) : c'est cette liste qui prime à l'envoi suivant. Sans ce circuit, la ligne STOP promet ce que rien ne tient.
- **Brevo, lecture du contact** : seule une réponse « pas en liste noire » ou « contact inconnu » (404) autorise l'envoi ; toute autre erreur l'arrête.
- **Panne entre deux effets** : même réserve que l'accueil (une action « réservée » sans « faite » est signalée, jamais rejouée à l'aveugle).
- Le Brevo gratuit porte sa propre marque, jamais celle de la plateforme ; la prospection de Presti (ADR-005) reste un système séparé et n'utilise pas ce gabarit.`,
  },
  'gabarit-ent-ventes': {
    titre: 'Ventes et CRM (Entreprise sur mesure)',
    surtitre: 'Département 3 du § 7 de OUTILLAGE.md : HubSpot, Pipedrive, Salesforce, Zoho CRM, Odoo, Airtable, Notion, monday ; signature Yousign ou DocuSign par l\'API.',
    fait: `Lit les affaires dans **le CRM du client** (un Switch « CRM du client », la copie garde le sien), rédige les propositions à partir des fiches du CRM et du tarif du client — **les montants sont calculés par le code** —, prépare la demande de signature, relance les propositions sans réponse et note l'intérêt du client.`,
    chemin: `1. **Relève** : Switch « Quel CRM lire ? » → lecture des affaires du CRM → mise en forme commune (référence, étape, contact par empreinte, jours sans réponse ; le nom des champs de chaque CRM vient de la configuration \`mapping_crm\`).
2. Tronc (configuration, annexe, actions du jour, **tarifs**, **propositions gagnées**) → **Router** (à proposer / à relancer) → **porte « simulation »**.
3. Faux → **Rédacteur de propositions** (réfs du tarif et quantités entières, aucun montant) → **Calculer les montants** ; **Relanceur** (relance + note d'intérêt froid / tiède / chaud) → revalidation. **Décider** → **Réserver** → **Contrôler les envois** (désinscription, plafond) → voies : proposition dans le CRM (Switch), Yousign ou DocuSign, relance Gmail ou Outlook, note d'intérêt, carte, exclusion, file, prévenir l'équipe.
4. **Un prix estimé ne part jamais seul** : si une référence manque au tarif, la proposition est « estimée », le montant est nul et tout passe en carte, même au niveau 3 de l'annexe.`,
    outils: `HubSpot, Pipedrive, Salesforce, Zoho CRM, Odoo, Airtable, Notion, monday (lecture des affaires, puis proposition), Yousign et DocuSign par l'API, Gmail et Outlook (relance, outil de lecture du fil), Slack et Teams.`,
    agents: `Le **rédacteur de propositions** lit les fiches du CRM par sept outils de lecture (HubSpot, Pipedrive, Salesforce, Zoho CRM, Odoo, Airtable, Notion) et contrôle les conflits ; les propositions déjà gagnées lui sont données en contexte. Le **relanceur** lit le fil Gmail ou Outlook. Aucun schéma ne contient de champ de montant : le juge le vérifie.`,
    tables: `\`entreprise_tarifs\` (références, prix HT en centimes, TVA en %) est la seule source des prix ; \`entreprise_notes_interet\` reçoit la note d'intérêt : elle ne remplace jamais une donnée du CRM du client.`,
    equipe: `Les propositions vont au périmètre « ventes » ; la signature à celui du gérant (configurable).`,
    essais: `- *Un devis* : 2 × 100 € + 1 × 50 € HT = 250 € HT, TVA 50 €, **300 € TTC (30000 centimes) calculés par le code** ; le « 1 » glissé dans la sortie du modèle est ignoré ; la simulation donne aussi 30000.
- *Un tarif inconnu* → proposition estimée, montant nul, aucune écriture dans le CRM ni demande de signature, des cartes à la place.
- *Une relance* → 1 relance Gmail et 1 note d'intérêt dans la plateforme.`,
    limites: `- **Yousign** : l'activation de la demande exige l'identifiant rendu, dans l'adresse ; la garde refuse une adresse calculée (R7). Le gabarit crée la demande en **brouillon** (aucun envoi au signataire) ; l'activation est un sous-workflow du lot d'intégration.
- **DocuSign** : l'enveloppe est créée au statut \`created\` (brouillon) ; le PDF de la proposition y est joint par l'étape documentaire du lot Devis.
- **monday** n'a pas d'outil d'agent admis par la garde (opération \`getItems\`) ; il reste lu et écrit par son nœud.
- **Filtres d'exemple** : les nœuds de lecture des affaires gardent les filtres du squelette (Odoo \`name like "Exemple."\`, Airtable \`{Nom} = 'Exemple.'\`, Salesforce \`Prospecting\`) : la copie les remplace, sinon la lecture ne ramène rien.
- **Relances** : trois au plus par proposition, une par rang (\`jours sans réponse ÷ jours avant relance\`, rang 1 à 3) ; au-delà, l'humain reprend. Le quota des relances est distinct de celui des séquences.
- **Étapes** : la copie traduit les étapes de son CRM vers \`proposition_a_faire\` et \`proposition_envoyee\` dans \`mapping_crm.<crm>.etapes\`, avec le nom de chaque champ ; sans cette traduction, rien n'est à proposer ni à relancer.
- Les paramètres de lecture des affaires de HubSpot, Pipedrive, Zoho CRM, Airtable, Notion et monday sont à confirmer à l'essai de lecture : ils dépendent des champs du client.`,
  },
  'gabarit-ent-marketing': {
    titre: 'Marketing et réseaux (Entreprise sur mesure)',
    surtitre: 'Département 4 du § 7 de OUTILLAGE.md : Instagram et Facebook (publication, messages, commentaires, API Graph), LinkedIn, TikTok (API), YouTube, X, Google Ads (rapports).',
    fait: `Rédige les contenus du client à partir de ses briefs et de sa charte, répond aux commentaires, suit quelques nombres (abonnés, coût, clics) et publie sur les comptes **du client**. **Tout ce qui se publie passe par la validation d'équipe** (Slack ou Teams, avec la carte « À valider » dans la plateforme) tant que les 2-3 premiers contenus de **chaque format** ne sont pas validés par un humain, et dès que la QA voit une anomalie (\`autonomie-abonnements.md\`).`,
    chemin: `1. **Relève** (derrière la porte) : briefs à produire, commentaires Facebook (API Graph) et Instagram, chaîne YouTube, mentions sur X, rapport Google Ads, compte TikTok — les rapports ne gardent que des nombres.
2. **Normaliser** → tronc (configuration, annexe, actions du jour, **formats validés**, **charte**) → **porte « simulation »**.
3. Faux → **Rédacteur de contenu** → **revalidation / QA** (longueur par réseau, aucun lien, au plus dix hashtags, ni prix ni nom de la plateforme) → **Décider** : une publication ne part seule que si le format a ses validations (2 à 3, \`validations_requises\`) **et** que la QA est propre ; sinon une **carte « À valider »** plus une **demande de validation d'équipe**.
4. **Valider par Slack / Teams** (envoyer et attendre) : approuvé → la carte passe à « approuvée » (le canal est propre au périmètre : ses membres sont les approbateurs) ; refusé ou délai → « refusée ». La publication est faite par la relève des cartes, jamais par la validation.
5. Voies de publication : Facebook (page), Instagram (conteneur puis publication), LinkedIn, TikTok (brouillon), YouTube (passage en public), X ; réponses aux commentaires Facebook et Instagram.`,
    outils: `Facebook et Instagram par l'API Graph (nœud natif), LinkedIn (publication seulement), TikTok (API de publication, brouillon dans la boîte du créateur), YouTube, X, Google Ads (rapports), Slack et Teams (envoyer et attendre), Notion et Airtable en outils de lecture (calendrier éditorial, contenus passés).`,
    agents: `Le **rédacteur de contenu** écrit un texte par réseau demandé, ou la réponse à un commentaire. Il ne publie rien. Une anomalie de texte (prix, nom de la plateforme, lien, trop long) ou une sortie manquante ne lève jamais d'erreur : elle devient une carte « À valider » marquée *à corriger* (que la relève n'exécute pas tant qu'un humain ne l'a pas réécrite). Un format que la voie automatique ne sait pas publier (carrousel, vidéo sans fichier, image manquante) devient aussi une carte. Les réponses aux commentaires restent à valider tant que l'annexe ne les passe pas au niveau 3 (aucune réponse automatique sans consentement), et un commentaire qui parle de litige, d'avocat, de plainte ou d'arnaque reste une carte même au niveau 3.`,
    tables: `\`entreprise_formats\` compte les validations positives de chaque format et porte l'écart de la QA ; \`entreprise_charte\` porte la charte écrite avec le client.`,
    equipe: `Le périmètre « marketing » a son canal Slack ou Teams et ses approbateurs (\`canaux_validation\`, \`approbateurs\`) : chaque membre n'approuve que son périmètre. Les outils de validation humaine de n8n (\`slackHitlTool\`, \`microsoftTeamsHitlTool\`) sont admis dans un \`gabarit-ent-*\` et refusés ailleurs — le juge le vérifie avec le juge commun ; ce gabarit emploie le nœud \`sendAndWait\` du chemin principal, parce qu'un outil de validation ne peut garder qu'un outil de lecture (R23) et que l'agent n'écrit rien.`,
    essais: `- *Un post Instagram d'exemple, aucune validation* → 3 cartes « À valider » (Instagram, Facebook, LinkedIn) et 3 demandes Slack vers le canal du périmètre ; **aucune publication**.
- *Le format a ses 3 validations et la QA est propre* → les 3 publications partent seules.
- *Écart de la QA, ou « Presti » dans un texte* → retour en cartes, aucune publication.`,
    limites: `- **sendAndWait** : le lien de réponse pointe vers n8n, qui n'est pas exposé à Internet (OUTILLAGE.md § 10) ; tant que Benj n'a pas tranché l'exposition, la carte « À valider » de la plateforme est la voie sûre, et la demande Slack ou Teams ne fait que prévenir.
- **YouTube** : le nœud ne lit pas les commentaires ; le gabarit ne lit que les vidéos et ne fait que passer en public une vidéo téléversée en privé par l'équipe.
- **Instagram** : le conteneur d'une vidéo se traite en asynchrone (attente avant la publication) : à ajouter dans la copie qui publie des vidéos. **TikTok** : la publication directe exige l'audit de l'application par TikTok ; le gabarit envoie en brouillon.
- **Après une reprise de \`sendAndWait\`**, le lien d'élément \`$('Quel effet ?').item\` utilisé par les nœuds d'approbation peut être perdu : à vérifier à l'essai dans n8n. L'approbation ne touche qu'une carte qui attend encore (\`statut = a_valider\`) : un clic tardif ne ressuscite pas une carte refusée. Le rôle noté est le premier de la liste du périmètre : c'est le canal de validation, propre au périmètre, qui garantit l'approbateur — pas un contrôle d'identité.
- **Commentaires** : le premier passage lit tout l'historique des dernières publications (25 Facebook, 10 Instagram) ; la copie borne par date si elle ne veut pas répondre à de vieux commentaires. Les commentaires propres de la page ne sont pas exclus.
- Une mention d'IA sur les contenus *publiés* est une décision du contrat avec le client ; ce gabarit ne l'ajoute pas (R20 ne vise que les envois à un tiers).`,
  },
}
for (const [nom, spec] of Object.entries(SPECS)) console.log(`${nom.replace('gabarit-', '')}.md : ${fiche(nom, spec)} caractères`)
