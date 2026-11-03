// 036-015 — écrit les trois fiches plans/011-cadrage-01-11/p6-signature/outillage/gabarits/{apres,operations,direction}.md depuis les EXPORTS (la table des nœuds est lue, jamais retapée).
//   node .orchestre/preuves/036-015/fiches.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.resolve(ICI, '../../..')
const SORTIE = path.join(RACINE, 'plans/011-cadrage-01-11/p6-signature/outillage/gabarits')
const ESSAIS = JSON.parse(readFileSync(path.join(ICI, 'essais-n8n.json'), 'utf8'))
const LECTURES = /^(get|getAll|getMany|search|list|lookup|download|read|availability|getAvailability|getFreeBusy|getProfile|getStatus)$/i
const court = (t) => t.replace(/^n8n-nodes-base\./, '').replace(/^@n8n\/n8n-nodes-langchain\./, 'ia:')
const aretes = (wf, nom) => Object.entries(wf.connections?.[nom] ?? {}).flatMap(([genre, liste]) => (liste || []).flatMap((s, i) => (s || []).map((l) => ({ vers: l.node, genre, sortie: i }))))
function table(wf) {
  const porte = wf.nodes.find((n) => /^\s*porte\s*:\s*simulation\s*$/m.test(String(n.notes ?? ''))).name
  const vus = new Set(), file = wf.nodes.filter((n) => /Trigger$/.test(n.type)).map((n) => n.name)
  while (file.length) { const x = file.shift(); if (vus.has(x)) continue; vus.add(x); for (const a of aretes(wf, x)) if (a.genre === 'main' && !(x === porte && a.sortie === 1)) file.push(a.vers) }
  const sousNoeuds = new Set(wf.nodes.flatMap((n) => aretes(wf, n.name).filter((a) => a.genre.startsWith('ai_')).map(() => n.name)))
  const ordre = ['scheduleTrigger', 'googleDriveTrigger']
  const lignes = []
  for (const n of wf.nodes.filter((x) => x.type !== 'n8n-nodes-base.stickyNote')) {
    const op = n.parameters?.operation, res = n.parameters?.resource
    let acte = ''
    if (/Trigger$/.test(n.type)) acte = 'déclenche (relève à intervalle)'
    else if (n.type.endsWith('.code')) acte = 'calcule'
    else if (n.type.endsWith('.if')) acte = 'aiguille'
    else if (n.type.endsWith('.agent')) acte = 'appelle le modèle'
    else if (/lmChatAnthropic|outputParser/.test(n.type)) acte = 'sous-nœud'
    else if (n.type.endsWith('.httpRequest')) acte = String(n.parameters.method).toUpperCase() === 'GET' ? `lit ${n.parameters.url.split('/').pop()}` : `écrit ${n.parameters.url.split('/').pop()}`
    else acte = typeof op === 'string' && LECTURES.test(op) ? 'lit' : 'ÉCRIT'
    const emplacement = sousNoeuds.has(n.name) && !n.type.endsWith('.agent') ? 'sous-nœud de l’agent (lecture seule)' : /Trigger$/.test(n.type) ? 'entrée' : n.name === porte ? 'PORTE' : vus.has(n.name) ? 'avant la porte, ou sur sa sortie « simulation »' : 'derrière la porte (sortie « faux »)'
    const note = String(n.notes ?? '').split('\n').filter((l) => !/^\s*(pied|porte|lecture-pour-envoi|outil)\s*:/.test(l)).join(' ').replace(/\|/g, '/').slice(0, 170)
    lignes.push(`| ${n.name} | ${court(n.type)}${res ? ` · ${res} · ${op}` : op ? ` · ${op}` : ''} | ${acte} | ${emplacement} | ${note} |`)
  }
  return ['| Nœud | Type · ressource · opération | Fait | Place | Note |', '|---|---|---|---|---|', ...lignes].join('\n')
}
const essais = (nom) => ESSAIS.filter((e) => e.workflow === nom).map((e) => `- n8n #${e.execution} (${e.statut_n8n}) : ${e.etiquette}.`).join('\n')

const FICHES = {
  apres: {
    titre: 'gabarit-artisan-apres — Après-chantier et réputation', id: 'xPPNohf5XkDoAk7g',
    chapeau: 'Ligne 5 de la matrice de `OUTILLAGE.md` § 5 : avis lus sur la fiche Google (nœud Business Profile), Préparateur de réponses (agent Claude, parseur, outils de lecture), demande d’avis par un canal consenti (Gmail, SMTP, WhatsApp ; SMS préparé en carte), réponse sur la fiche Google derrière la porte, rappel d’entretien proposé.',
    geste: `Chaque jour à 8 h (Europe/Paris), le gabarit lit la configuration du compte, les clés déjà traitées, les avis de la fiche et les chantiers terminés. Un nœud Code **décide**, le modèle ne décide de rien :

- **avis de 3 étoiles ou moins** : toujours une carte « À valider » pour l’artisan, avec un brouillon. Jamais une publication, en Studio comme en Signature, pilote actif ou non ;
- **avis de 4 ou 5 étoiles** : une réponse prévue sur la fiche **seulement** si l’offre est Signature, le pilote actif **et** le type \`reponse_avis_positif\` activé ; sinon une carte. Si le brouillon du modèle contient un engagement (euros, remboursement, remise, geste commercial, gratuit), la route repasse à la carte ;
- **demande d’avis** : 2 jours après la fin réelle du chantier, 14 jours de rattrapage au plus, 20 par passage (\`lib/apresChantier.ts:23-24\`), **seulement** pour un client qui a donné un canal et ne s’est pas opposé. Envoyée seule en Signature avec le type \`demande_avis\` activé ; sinon une carte. Le SMS reste une carte (SMS préparé, ouvert d’un geste sur le téléphone de l’artisan) ;
- **rappel d’entretien** : préavis de 15 jours, **proposé** en carte, jamais envoyé seul.

Toute réponse du modèle repasse un nœud Code qui revalide le schéma (clé connue, longueur, pas le nom de la plateforme) ; la route vient du Code qui a décidé, jamais du modèle. Le texte d’un avis est une **donnée de tiers** : la consigne le dit à l’agent, et le schéma ne laisse passer que \`cle\` et \`reponse\`.`,
    plus: `## Ce que la copie du client doit renseigner (rien de tout cela n’est dans le gabarit)
- ses comptes, branchés **par lui** : Google Business Profile (accès à l’API sur demande auprès de Google : à vérifier avant le premier branchement), Gmail, WhatsApp Business Cloud, SMTP, Claude, Supabase ;
- \`Compte et mode\` : \`organisation_id\` du client, \`simulation\` (vrai tant que Benj n’a pas écrit « go »), \`numero_whatsapp_id\`, \`expediteur\` ;
- le compte et la fiche Google (\`accounts/000000000000\`, \`locations/000000000000\` : repères neutres exigés par n8n pour tester) ;
- WhatsApp : écrire en premier exige un modèle validé par Meta (\`sendTemplate\`) ; le nœud \`send\` du gabarit ne vaut que dans la fenêtre de 24 h.`,
    valider: `- **Types nouveaux du pilote** : \`reponse_avis_positif\` et \`demande_avis\` ne sont pas dans la liste fermée \`OUTIL_TYPE\` de \`lib/pilote/regles.ts:53-63\` ; \`demander_avis\` et \`envoyer_rappel_entretien\` n’y sont pas exécutables (\`OUTILS_EXECUTABLES_PILOTE\`, \`:70\`). Les ajouter exige des tests et l’accord de Benj (prompt 6 § 1.2, ligne 5).
- **Tables et colonnes** : \`pilote_reglages\` (colonnes \`offre\`, \`types\`), \`evenements_metier\`, \`chantiers\`, \`clients\`, \`assistant_actions\` sont nommées comme dans les migrations, mais la garde commune (R14) exige \`organisation_id=eq.…\` alors que ces tables filtrent par \`artisan_id\` (\`organisations.id\` = \`artisans.id\`, \`0183_organisations.sql:84-86\`). À trancher à l’intégration (036-012) : vues étroites \`n8n_*\` comme celles des autres lots.
- **Appelants** : \`lib-avis-lire\` (\`ScpXQIH54wmmuuel\`) est appelé en outil par identifiant ; sa liste d’appelants (\`callerIds\`) ne contient pas le gabarit (interdit de la modifier dans ce lot).`,
  },
  operations: {
    titre: 'gabarit-artisan-operations — Opérations : agenda, chantiers, stock', id: '1Z8e8h5ePVa6t4Np',
    chapeau: 'Ligne 6 de la matrice de `OUTILLAGE.md` § 5 : Planificateur (agent Claude ; outils : disponibilité de Google Agenda ou événements d’Outlook), rendez-vous posé dans l’Agenda après le choix du client, rappel de la veille (Telegram, WhatsApp, Twilio), Gardien du stock (commande en brouillon Gmail ou Outlook), Archiviste (Drive ou OneDrive, un dossier par client et par chantier), import Sheets ou Excel par le circuit contrôlé.',
    geste: `Trois entrées, toutes à intervalle (aucun webhook) : toutes les 15 minutes (rendez-vous, imports), chaque jour à 17 h 05 (rappel de la veille et stock ; 17 h 05 pour ne jamais tomber sur le quart d’heure), un nouveau document dans Drive. Le Code **compte et choisit** :

- **un créneau vient de l’agenda lu** : le Code fabrique des créneaux *candidats* (9 h, 11 h, 14 h, 16 h, hors dimanche) ; ils partent lire l’agenda (Google : \`availability\`, une réponse par candidat ; Outlook : les événements, un créneau qui en chevauche un n’est pas libre). Un créneau n’est libre que si l’agenda le dit. Au plus 3 créneaux, 2 par jour. **Aucun créneau libre : aucun rendez-vous, une carte.** Une lecture qui ne rend pas autant de réponses que de candidats ne libère rien ;
- **le modèle choisit des numéros, jamais une date** : le Planificateur rend \`indices\` parmi les créneaux lus ; toute heure citée dans son message doit être celle d’un créneau offert, sinon rejet ;
- **un rendez-vous ne se pose qu’après le choix du client** : l’événement \`creneau_choisi\` doit venir du client, viser un créneau *proposé*, encore libre à la relecture, et être validé (clic de l’artisan, ou Signature avec le type \`rendez_vous\` activé). Sinon une carte ;
- **rappel de la veille** : consentement et aucune opposition ; texte fixe (aucun modèle), STOP dans chaque SMS ; envoyé seul en Signature avec le type \`rappel_rendez_vous\`, sinon une carte ;
- **stock** : un article au seuil, avec un fournisseur désigné par l’artisan et sans commande ouverte. La **quantité est calculée par le code** (\`2 × seuil − quantité\`) ; le modèle rédige l’e-mail, tout nombre étranger est rejeté, aucun prix. La commande reste un **brouillon** Gmail ou Outlook : une commande envoyée est une validation ;
- **document reçu** : l’Archiviste choisit le type et le chantier dans la liste lue ; un chantier hors liste ne range rien. Classement en Signature avec le type \`classement_documents\`, sinon une carte ;
- **import** : lecture du classeur (Sheets ou Excel), aperçu, carte de validation. Aucune écriture avant la validation (\`lib-synchroniser-outil\`).`,
    plus: `## Ce que la copie du client doit renseigner
- ses comptes, branchés **par lui** : Google Agenda ou Outlook, Drive ou OneDrive, Sheets ou Excel, Gmail ou Outlook, Telegram, WhatsApp, Twilio (seulement si l’API SMS est choisie et son coût montré à Benj), Claude, Supabase ;
- \`Compte et mode\` : \`organisation_id\`, \`agenda_id\` (jamais une adresse écrite dans le gabarit), \`simulation\`, \`numero_whatsapp_id\`, \`numero_sms\` ; ses outils dans \`pilote_reglages\` (\`outil_agenda\`, \`outil_courrier\`, \`outil_fichiers\`, \`outil_tableur\`) ;
- Outlook : la période des événements lus (le filtre est vide dans le gabarit), l’identifiant du calendrier ; Drive : le dossier surveillé ; Excel : le classeur et la feuille ; Sheets : le tableur de stock.`,
    valider: `- **Types nouveaux du pilote** : \`rendez_vous\`, \`rappel_rendez_vous\`, \`classement_documents\` n’existent pas dans \`OUTIL_TYPE\` (« type nouveau, à ajouter à la liste fermée seulement après tests et accord de Benj », prompt 6 § 1.2, ligne 6).
- **Vues à écrire** : \`articles_sous_seuil\` (inventaire, \`lib/inventaire/\`), \`rendez_vous\`, \`chantiers\`, \`clients\`, et la même question \`organisation_id\` / \`artisan_id\` que pour l’Après-chantier.
- **Outlook** : pas d’opération « disponibilité » dans le nœud ; le gabarit lit les événements et calcule le chevauchement.
- **Heure de Paris** : les créneaux sont écrits avec le décalage de l’heure de lancement ; un changement d’heure d’été à hiver entre la lecture et la pose se règle à l’intégration.`,
  },
  direction: {
    titre: 'gabarit-artisan-direction — Direction de l’artisan', id: '8KOicif7Wjzhk5VM',
    chapeau: 'Ligne 7 de la matrice de `OUTILLAGE.md` § 5 : la page du matin à 7 h, le rapport du lundi à 8 h, envoi par Telegram, WhatsApp, Gmail, Slack ou Teams, export du rapport dans Sheets, compteur du coût IA (`lib-cout-ia`). Le rédacteur est un agent, mais **le code compte**.',
    geste: `Deux déclencheurs à intervalle : chaque jour à 7 h, le lundi à 8 h. Le gabarit lit la configuration (canal et destination **de l’artisan lui-même**), les chiffres du jour (ce que \`lib/assistant/briefing.ts\` calcule par le code), le rapport de la semaine et le coût IA des sept derniers jours. Le nœud « Compter » écrit **toutes les lignes chiffrées**, avec leur libellé :

- l’argent d’abord (impayés échus, devis sans réponse, demandes sans réponse, rendez-vous du jour, coût IA), puis les cartes à valider ; le rapport du lundi : encaissé, signé, en cours, relances ayant précédé une signature, coût IA de la semaine ;
- **une lecture absente se dit « non lu », jamais un zéro** ; un vrai zéro s’écrit « 0 € » ;
- aucun chiffre de gain ni d’économie.

Le **modèle ne compte rien** : il écrit une phrase d’ouverture (ou un commentaire) **sans aucun chiffre** et choisit jusqu’à trois priorités par leur *numéro* dans la liste que le code propose. Le nœud de revalidation rejette toute phrase qui contient un chiffre, un « € » ou, pour le rapport, un mot de gain, d’économie ou de rentabilité. La page envoyée est « phrase du modèle + lignes du code + priorités de la liste ». Elle porte la mention de l’assistant. Rien n’y part chez un client de l’artisan : la page est pour l’artisan.`,
    plus: `## Ce que la copie du client doit renseigner
- ses comptes, branchés **par lui** : Telegram, WhatsApp, Gmail, Slack (authentification OAuth2, voir ci-dessous), Teams, Sheets, Claude, Supabase ;
- \`Compte et mode\` : \`organisation_id\`, \`simulation\`, \`numero_whatsapp_id\` ; \`pilote_reglages\` : \`canal_direction\` (telegram, whatsapp, slack, teams ou gmail) et \`destination_direction\` ; le tableur « Rapports ».

**Slack.** Le MCP n8n a rattaché de lui-même un identifiant Slack existant (« Slack account ») à la création du nœud. Il a été retiré (nœud recréé) et le nœud est en authentification OAuth2, pour qu’aucun identifiant d’un autre compte ne s’y rattache : la copie branche le sien. Le même rattachement automatique peut toucher les autres lots (036-013, 036-014, 036-016) : relire leurs exports.`,
    valider: `- **Vues à écrire** : \`briefing_organisation\`, \`rapport_hebdo_organisation\` (colonnes en centimes entiers), \`couts_ia_jour\` (existe, migration 0193), et la question \`organisation_id\` / \`artisan_id\`.
- **Appelants** : \`lib-alerte-liste\` (\`v2wfT9qB5e0LHtFI\`) et \`lib-cout-ia\` (\`JtGOKOG1ssFP5z1u\`) sont appelés en outils par identifiant ; leurs listes d’appelants ne contiennent pas le gabarit (interdit de les modifier dans ce lot).
- **Teams** n’est pas dans la liste des nœuds d’envoi de la garde (pas de « pied » exigé) ; la mention de l’assistant figure pourtant dans son texte.`,
  },
}
const SOURCES = `## Sources
- \`plans/011-cadrage-01-11/p6-signature/outillage/OUTILLAGE.md\` (O1 à O6, § 5 lignes 5 à 7, R21 à R23) ;
- \`plans/011-cadrage-01-11/prompts-benj/p6-signature-et-sur-mesure-0311.md\` § 0.4, § 0.5, § 0.6, § 1.2 (l.336-338) ;
- vidéos : \`fiches-videos-restructureai.md\` section 11 (« Review Response » : lecteur, rédacteur, « Approval Desk » avant « Reply Poster », l.368-373) ; \`premiere-reponse.md\` A7, A8, A9, A13, A16, A18, B8, B10, D3 ; \`plans/analyse-videos.md\` l.1442-1443 (barre « à valider » et trois priorités) ;
- dépôts (la forme seulement, aucun JSON importé) : Zie619 \`Aggregate/1430_Aggregate_Schedule_Send_Scheduled.json\`, enescingoz « AI Agent : Google calendar assistant using OpenAI », « LINE Assistant with Google Calendar and Gmail Integration », « Daily meetings summarization with Gemini AI », « Effortless Email Management with AI-Powered Summarization & Review » ;
- n8n : \`get_workflow_sdk_reference\`, \`get_workflow_best_practices\` (scheduling, notification), \`search_nodes\`, \`get_node_types\` (Business Profile, Google Agenda, Gmail).`
for (const [cle, f] of Object.entries(FICHES)) {
  const nom = `gabarit-artisan-${cle}`
  const wf = JSON.parse(readFileSync(path.join(ICI, `${nom}.workflow.json`), 'utf8'))
  const txt = `# ${f.titre}

Fiche du gabarit outillé (tâche 036-015, prompt 6, outillage, lot 3). ${f.chapeau}

**Inactif, en simulation, sans identifiant.** Identifiant n8n d’Oracle : \`${f.id}\` (jamais publié, jamais activé). ${wf.nodes.length} nœuds. Export : \`.orchestre/preuves/036-015/${nom}.workflow.json\`. Juges : \`scripts/n8n-specs-qa.mjs\` (R1 à R23) et \`scripts/gabarits-terrain-qa.mjs\`. Générateur : \`.orchestre/preuves/036-015/construire.mjs ${cle}\`.

## Le geste

${f.geste}

**La porte « simulation » est unique et se place devant chaque effet** : sa sortie « vrai » ne fait que journaliser l’effet prévu (le modèle n’est pas appelé, la réponse vient d’un enregistrement daté) ; tout nœud qui écrit, envoie, publie, pose un rendez-vous ou appelle le modèle n’est atteint que par sa sortie « faux ». Le gabarit pose \`simulation: true\` : la copie ne le lève qu’avec le « go » écrit de Benj.

## Les nœuds (table lue dans l’export)

${table(wf)}

${f.plus}

## Les essais (\`test_workflow\`, simulation, données épinglées « Exemple. »)
${essais(nom)}

Les cas hors ligne (créneau choisi par l’artisan, opposition, Studio avec types activés par erreur, sortie de modèle piégée…) sont joués par le juge sur les Code des exports, **pas par n8n**.

## À valider / non fait
${f.valider}
- Le modèle n’a **jamais été appelé** (aucun identifiant, aucun appel réel) : les agents sont vérifiés pour leur forme et leurs revalidations, pas pour leur rédaction.
- Les nœuds du canevas ne sont pas encore regroupés (avertissement du MCP : plus de 7 boîtes au premier niveau) ; sans effet sur l’exécution.

${SOURCES}
`
  writeFileSync(path.join(SORTIE, `${cle}.md`), txt)
  console.log(`${cle}.md : ${txt.split('\n').length} lignes`)
}
