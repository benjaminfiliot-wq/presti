// GARDE COMMUNE de tout export de workflow n8n de Presti (chantier 4, lot L12, tâche 032-019 ; étendue aux familles `ent-*` et `lib-*`
// par la tâche 035-001). Hors ligne : aucun réseau, aucune base, aucun modèle. Elle juge un ou plusieurs exports (le JSON rendu par le MCP
// `get_workflow_details`, ou son objet `workflow`), ou tous les `*.workflow.json` d'un dossier.
//
// LES FAMILLES (tirées du nom du workflow) :
//   « c4 »  tout ce qui ne commence ni par `ent-` ni par `lib-`/`gabarit-` : les workflows du chantier 4 (`presti-*`). Règles R1 à R7,
//           À L'IDENTIQUE de 032-019 : R5 « lectures GET seulement » n'y est jamais assouplie (détecteurs en lecture seule).
//   « ent » `ent-<client>-*` : les workflows d'une entreprise cliente (prompt 5). « lib » `lib-*` et `gabarit-*` : la bibliothèque partagée.
//           Mêmes R1 à R4, R6 et R7 (R7 sur les lectures), R5 réglée par famille, et en plus R8 à R20.
//
// Règles communes (plans/011-cadrage-01-11/chantier-4-assistant-plan.md, §0 bis, l.127-158 ; rang 26, l.108 ; .claude/rules/architecture-outils.md) :
//   R1  inactif : `active: false`, aucune version publiée (« Mise en service », §0 bis) ;
//   R2  aucun secret dans l'export : motifs de scripts/garde-commit.mjs:16-26, jeton porteur, champ `data` d'un identifiant ;
//   R3  une branche d'erreur (rang 26) : un Error Trigger relié à au moins un nœud, ou `settings.errorWorkflow` = un identifiant nu ;
//   R4  chaque nœud d'envoi DÉCLARE son pied dans ses notes (`pied: mention | PIED_AUTOMATIQUE | PIED_APRES | aucun`) et porte ce pied-là,
//       et aucun autre : la mention d'IA (lib/mentionAssistant.ts:14-17) pour un texte du modèle envoyé au nom d'un artisan sans sa relecture,
//       PIED_AUTOMATIQUE (lib/relancesImpayes.ts:62) pour un rappel d'impayé, PIED_APRES (lib/apresChantier.ts:51) pour l'après-chantier,
//       rien pour un texte fixe ou un message de Presti. Jamais « Presti » dans un envoi au nom d'un artisan (marque blanche) ;
//   R5  c4 : lectures GET seulement : HTTP Request en GET, sans corps ; Supabase en get/getAll ; aucun type de nœud hors liste blanche.
//       ent/lib : HTTP en GET, POST ou PATCH (un corps seulement hors GET), nœud Supabase exclu (R14), liste blanche propre ; l'écriture
//       n'est permise que derrière la porte « simulation » (R15) ;
//   R6  identifiants nommés : chaque identifiant d'un nœud = exactement `{ id, name }`, deux textes non vides, jamais une expression ;
//   R7  ce que n8n lit (§0 bis) : hôte écrit en dur et permis ; `select=` présent, sans `*`, sans jointure, sans alias, sans colonne qui
//       contient nom, email, contact, adresse, message, contenu ou texte. Seule exception (§0 bis) : une lecture faite AU MOMENT d'envoyer,
//       qui le déclare dans ses notes (`lecture-pour-envoi: <nœud d'envoi>`) et alimente ce nœud d'envoi. En ent/lib, `select=` sur les GET.
// Règles neuves des familles ent/lib (sources : p5 = plans/011-cadrage-01-11/prompts-benj/p5-entreprise-sur-mesure.md ; PR = la première
// réponse, plans/011-cadrage-01-11/p5-entreprise/premiere-reponse.md, ligne 035-001 l.934, § 4.6 l.397-430, § 5.5 l.619-759 ;
// FM = plans/011-cadrage-01-11/p5-entreprise/fiche-methode-n8n.md) :
//   R8  ni `chat_id` ni adresse e-mail écrits dans l'export (PR:934 ; p5:247, aucune donnée de client dans une alerte) ;
//   R9  workflow d'erreur DÉSIGNÉ : `settings.errorWorkflow` = l'identifiant de `lib-erreur-commune` ; une branche interne ne suffit pas.
//       `lib-erreur-commune` lui-même porte son Error Trigger relié, et ne se désigne pas (PR § 4.6 « Les réglages » ; FM:917-924) ;
//   R10 fuseau `Europe/Paris` (PR § 4.6 ; FM:166, New York par défaut) ;
//   R11 politique d'appel en liste : un enfant (Execute Workflow Trigger) en `workflowsFromAList` avec `callerIds` non vide ; un
//       workflow que personne n'appelle en `none` ou en liste ; jamais `any` (PR § 4.6) ;
//   R12 délai maximal d'exécution : `settings.executionTimeout` entier de 1 à 3 600 s (PR § 4.6 ; FM:933) ;
//   R13 ent-* : succès non sauvés (`saveDataSuccessExecution: none`), progression non sauvée (PR § 4.6 ; FM:45, :914, :1038). Le masquage
//       des données de production n'est PAS contrôlé : le nom de son réglage dans n8n 2.45.7 n'est lu nulle part (preuve de 035-001) ;
//   R14 filtre organisation sur chaque requête : `organisation_id=eq.…` en paramètre (GET, PATCH), `organisation_id` dans le corps
//       (POST) ; nœud Supabase exclu, car son filtre ne se lit pas dans la requête (PR § 4.6 « Les lectures » ; FM:41-43, point 8) ;
//   R15 porte « simulation » avant tout effet : un nœud If déclaré (`porte: simulation`), une seule condition booléenne « vrai » sur
//       `simulation`, typage strict ; tout effet (envoi, HTTP hors GET) n'est atteignable que par la sortie « faux » d'une porte (p5:318 ;
//       PR § 5.5 `lib-executer` : « aucun nœud d'écriture n'est atteignable » en simulation) ;
//   R16 contrats d'entrée et de sortie : un enfant commence par « Contrat d'entrée » (Code, notes `contrat: <nom>@N`, contrôle des 7 clés
//       de l'enveloppe@1) et finit par un seul « Contrat de sortie » (Code, les 9 clés de la sortie), seul bout de chemin (PR § 4.6
//       « La structure », § 5.5 « Les contrats » ; FM:837-849) ;
//   R17 compatible 3.0 : aucun nœud retiré en 3.0 ni Execute Command ; Execute Sub-workflow en source `database`, identifiant fixe ;
//       AI Agent 3.x (PR § 4.6 ; FM:73-81) ;
//   R18 modèles : AI Agent avec `passthroughBinaryImages` à faux, `maxIterations` de 1 à 10, un Structured Output Parser en JSON Schema
//       saisi (`manual`), `autoFix` à faux, puis une revalidation en Code (PR § 4.6 « Les modèles » ; FM:292-313) ;
//   R19 nœuds Code : aucun module, ni réseau, ni environnement ; empreinte SHA-256 du code tenue par le registre `empreintes-code.json`
//       posé à côté de l'export (PR § 4.6 « Les nœuds Code », parade à É3) ;
//   R20 mention d'IA sur les workflows visés : un envoi en aval d'un nœud de modèle déclare `pied: mention` (R4 contrôle alors le texte)
//       (PR:934 ; lib/mentionAssistant.ts:14-17).
// Elle prouve qu'elle sait rougir : chaque MUTANT (sur l'export de presti-detecteurs, sur un workflow d'envoi FICTIF construit ici, et
// sur les trois exports fictifs de scripts/fixtures/n8n-specs-qa/) doit la faire échouer pour sa raison.
//
// Lancement (sans argument : l'export de presti-detecteurs du lot L12 et les trois exports fictifs) :
//   node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/n8n-specs-qa.mjs [exports… | dossiers…]
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PIED_AUTOMATIQUE } from '../lib/relancesImpayes.ts'
import { PIED_APRES } from '../lib/apresChantier.ts'
import { mentionAssistant } from '../lib/mentionAssistant.ts'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DETECTEURS = '.orchestre/preuves/032-019/presti-detecteurs.workflow.json'
const DOSSIER_FICTIFS = 'scripts/fixtures/n8n-specs-qa'
const FICTIFS = ['lib-exemple-executer', 'ent-exemple-relance', 'ent-exemple-parent', 'gabarit-exemple-outils'].map((n) => `${DOSSIER_FICTIFS}/${n}.workflow.json`)
const PAR_DEFAUT = [DETECTEURS, ...FICTIFS]

// ─── Les listes de la garde ──────────────────────────────────────────────────────────────────────────────────────────────────
// Le début de la mention, sans le nom de l'artisan (qui vient d'une expression dans n8n) ; l'apostrophe typographique ou droite.
const MENTION = mentionAssistant('').replace(/\.$/, '') // « Message rédigé et envoyé automatiquement par l’assistant »
const aMention = (t) => t.includes(MENTION) || t.includes(MENTION.replace('’', "'"))
const PIEDS = ['mention', 'PIED_AUTOMATIQUE', 'PIED_APRES', 'aucun']
// Nœuds qui envoient un message hors de n8n (e-mail, messagerie, SMS). Un nœud d'envoi DOIT déclarer son pied.
const TYPES_ENVOI = new Set([
  'n8n-nodes-base.emailSend', 'n8n-nodes-base.gmail', 'n8n-nodes-base.microsoftOutlook', 'n8n-nodes-base.sendGrid', 'n8n-nodes-base.mailgun',
  'n8n-nodes-base.mailjet', 'n8n-nodes-base.sendInBlue', 'n8n-nodes-base.brevo', 'n8n-nodes-base.slack', 'n8n-nodes-base.telegram',
  'n8n-nodes-base.twilio', 'n8n-nodes-base.whatsApp', 'n8n-nodes-base.discord', 'n8n-nodes-base.mattermost',
])
// Les seuls autres types admis : déclencheurs, lecture, logique, notes. Tout type neuf (un modèle, une base, un fichier, une commande)
// rougit : on l'ajoute ici en connaissance de cause, avec sa règle.
const TYPES_PERMIS = new Set([
  'n8n-nodes-base.scheduleTrigger', 'n8n-nodes-base.errorTrigger', 'n8n-nodes-base.httpRequest', 'n8n-nodes-base.supabase',
  'n8n-nodes-base.code', 'n8n-nodes-base.stickyNote', 'n8n-nodes-base.if', 'n8n-nodes-base.filter', 'n8n-nodes-base.set',
  'n8n-nodes-base.merge', 'n8n-nodes-base.splitInBatches', 'n8n-nodes-base.noOp', ...TYPES_ENVOI,
])
// Familles ent/lib : la même liste, SANS le nœud Supabase (R14), plus les sous-workflows, le routage, l'arrêt en erreur et le modèle
// (AI Agent 3.x, Claude, parseur structuré). Un autre fournisseur de modèle s'ajoute ici en connaissance de cause.
const SOUS_TRIGGER = 'n8n-nodes-base.executeWorkflowTrigger'
const SOUS_APPEL = 'n8n-nodes-base.executeWorkflow'
// 03/11 (prompt 6, § 1.4) : le Cerveau `presti-cerveau` appelle ses chefs `presti-dep-*`, qui sont des sous-workflows. Cette famille du
// chantier 4 garde R1 à R7 (lecture seule comprise) et gagne la liste blanche de la bibliothèque `lib-*` (sous-workflows, routeur, arrêt).
const P6_ORCHESTRE = /^presti-(cerveau$|dep-|banc-|boite$)/ // le banc d'essai et la relève de la boîte (036-003) appellent aussi des sous-workflows
const AGENT = '@n8n/n8n-nodes-langchain.agent'
const PARSEUR = '@n8n/n8n-nodes-langchain.outputParserStructured'
const CODE = 'n8n-nodes-base.code'
const TYPES_PERMIS_NEUFS = new Set([
  ...[...TYPES_PERMIS].filter((t) => t !== 'n8n-nodes-base.supabase'),
  SOUS_TRIGGER, SOUS_APPEL, 'n8n-nodes-base.switch', 'n8n-nodes-base.stopAndError', AGENT, '@n8n/n8n-nodes-langchain.lmChatAnthropic', PARSEUR,
])
// Nœuds retirés en 3.0 (page des changements cassants, FM:73-76), plus Execute Command, exclu (PR § 4.6).
const RETIRES_3 = new Map([
  ['n8n-nodes-base.function', 'Function'], ['n8n-nodes-base.functionItem', 'Function Item'], ['n8n-nodes-base.workflowTrigger', 'Workflow Trigger'],
  ['n8n-nodes-base.htmlExtract', 'HTML Extract'], ['@n8n/n8n-nodes-langchain.code', 'LangChain Code'], ['n8n-nodes-base.aiTransform', 'AI Transform'],
  ['n8n-nodes-base.executeCommand', 'Execute Command'],
])
// Les hôtes qu'une lecture HTTP peut joindre : l'API REST du projet Supabase (architecture-outils.md, « Supabase »).
const HOTES_PERMIS = new Set(['gorcdvmueakcncsmrouo.supabase.co'])
// 03/11 (prompt 6, outillage, plans/011-cadrage-01-11/p6-signature/outillage/OUTILLAGE.md) : les GABARITS (`gabarit-*`, sans identifiant)
// et leurs copies par client (`client-*`) portent les vrais nœuds des outils, comme les vidéos et les 2 669 workflows des dépôts. Liste
// vérifiée au catalogue n8n le 03/11 (MCP search_nodes). Un nœud natif ne sert qu'un compte (identifiants dynamiques = licence Enterprise) :
// d'où une copie par client. Les déclencheurs à webhook n'y sont pas : n8n d'Oracle n'est pas exposé (p6:225-227).
const OUTILLE = /^(gabarit|client)-/
const B = (t) => `n8n-nodes-base.${t}`, LC = (t) => `@n8n/n8n-nodes-langchain.${t}`
const DECLENCHEURS_INTERVALLE = new Set(['gmailTrigger', 'microsoftOutlookTrigger', 'emailReadImap', 'googleCalendarTrigger', 'googleDriveTrigger',
  'googleSheetsTrigger', 'microsoftOneDriveTrigger', 'notionTrigger', 'airtableTrigger'].map(B))
const OUTILS_NATIFS = ['gmail', 'microsoftOutlook', 'emailSend', 'googleCalendar', 'googleDrive', 'googleDocs', 'googleSheets', 'googleChat', 'googleBusinessProfile',
  'googleAds', 'microsoftOneDrive', 'microsoftExcel', 'microsoftTeams', 'whatsApp', 'telegram', 'twilio', 'slack', 'sendInBlue', 'mailchimp', 'activeCampaign',
  'lemlist', 'facebookGraphApi', 'linkedIn', 'youTube', 'twitter', 'hubspot', 'pipedrive', 'salesforce', 'zohoCrm', 'odoo', 'airtable', 'notion', 'mondayCom',
  'clickUp', 'stripe', 'quickbooks', 'xero', 'zendesk', 'shopify', 'wooCommerce']
// Les mêmes en outil d'agent (« …Tool ») : branchés sur un agent, ils ne font que LIRE (R23).
const OUTILS_AGENT = new Set([...OUTILS_NATIFS.map((t) => B(`${t}Tool`)), LC('toolWorkflow'), LC('toolHttpRequest'), LC('agentTool')])
// Validation humaine native de n8n (« Request human approval for tools ») : réservée aux validations d'équipe Entreprise (p6:253).
const OUTILS_VALIDATION = new Set(['gmail', 'microsoftOutlook', 'emailSend', 'slack', 'telegram', 'whatsApp', 'microsoftTeams', 'googleChat'].map((t) => B(`${t}HitlTool`)))
// Les nœuds qui appellent le modèle : des effets (coût, données envoyées), derrière la porte comme un envoi.
const APPELS_MODELE = new Set([AGENT, LC('chainLlm'), LC('anthropic'), LC('informationExtractor'), LC('textClassifier')])
const TYPES_OUTILS = new Set([...DECLENCHEURS_INTERVALLE, ...OUTILS_NATIFS.map(B), ...OUTILS_AGENT, ...OUTILS_VALIDATION, ...APPELS_MODELE,
  B('extractFromFile'), B('convertToFile')])
// Les API sans nœud natif, appelées par un nœud HTTP d'un gabarit (OUTILLAGE.md § 3) : l'hôte est écrit en dur, jamais calculé.
const HOTES_OUTILS = new Set(['graph.facebook.com', 'graph.instagram.com', 'open.tiktokapis.com', 'business-api.tiktok.com', 'api.yousign.app', 'api-sandbox.yousign.app',
  'eu.docusign.net', 'demo.docusign.net', 'app.pennylane.com', 'thirdparty.qonto.com', 'api.manychat.com', 'api.tally.so', 'api.calendly.com', 'api.cal.com',
  'api.typeform.com', 'eu-api.jotform.com', 'api.trustpilot.com', 'recherche-entreprises.api.gouv.fr', 'api.insee.fr', 'api.brevo.com'])
// Une opération qui ne fait que lire. Sans opération écrite, n8n prend celle par défaut (Gmail : envoyer) : c'est donc un effet.
const LECTURES = /^(get|getAll|getMany|search|list|lookup|download|read|availability|getAvailability|getFreeBusy|getProfile|getStatus)$/i
const estLecture = (n) => typeof n.parameters?.operation === 'string' && LECTURES.test(n.parameters.operation)
// Un nœud d'envoi qui ne fait que lire (Gmail en getAll) n'envoie rien, dans un gabarit : ni pied (R4) ni porte (R15) pour lui.
const estEnvoi = (n, outille) => TYPES_ENVOI.has(n.type) && !(outille && estLecture(n))
const INTERDIT = /nom|e-?mail|contact|adresse|message|contenu|texte/i
// Motifs de scripts/garde-commit.mjs:16-26 (formats de clés), plus un jeton porteur et une clé privée.
const SECRETS = [
  /sk_live_[A-Za-z0-9]{8,}/, /rk_live_[A-Za-z0-9]{8,}/, /sk-ant-[A-Za-z0-9_-]{12,}/, /sb_secret_[A-Za-z0-9_-]{12,}/,
  /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{20,}/, /\bBearer\s+[A-Za-z0-9._-]{20,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
]
const ID_NU = /^[A-Za-z0-9_-]{6,64}$/
const COURRIEL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/
const CHAT_ID_EN_DUR = /chat_?id['"\\]*\s*[:=]\s*['"\\]*-?\d{5,}/i
const MODULE_OU_RESEAU = /\brequire\s*\(|\bimport\s*\(|^\s*import\s|\bhelpers\s*\.\s*(?:httpRequest|request)|\bfetch\s*\(|\bprocess\s*\.|\$env\b|\bXMLHttpRequest\b|\bWebSocket\b/m
const CONTRAT_FORME = /^(lib|gabarit|ent)-[a-z0-9-]+@[0-9]+$/
// L'enveloppe@1 (PR § 5.5, « Les contrats ») : les clés obligatoires de l'entrée et de la sortie.
const CLES_ENTREE = ['contrat', 'organisation_id', 'simulation', 'cle_idempotence', 'trace', 'config', 'donnees']
const CLES_SORTIE = ['contrat', 'statut', 'cle_idempotence', 'simulation', 'resultat', 'effets_prevus', 'effets_faits', 'journal', 'erreurs']

const texteDe = (o) => JSON.stringify(o ?? {})
const piedDeclare = (n) => { const m = /^\s*pied\s*:\s*(\S+)\s*$/m.exec(String(n.notes ?? '')); return m ? m[1] : null }
const lecturePourEnvoi = (n) => { const m = /^\s*lecture-pour-envoi\s*:\s*(.+?)\s*$/m.exec(String(n.notes ?? '')); return m ? m[1] : null }
const sorties = (wf, nom) => Object.values(wf.connections?.[nom] ?? {}).flat(2).filter(Boolean).map((l) => l.node)
function atteint(wf, de, vers) {
  const vus = new Set(), file = [de]
  while (file.length) { const x = file.shift(); if (x === vers) return true; if (vus.has(x)) continue; vus.add(x); file.push(...sorties(wf, x)) }
  return false
}
// Les arêtes d'un nœud, avec leur genre (main, ai_languageModel…) et leur numéro de sortie (0 = « vrai » d'un If, 1 = « faux »).
const aretes = (wf, nom) => Object.entries(wf.connections?.[nom] ?? {}).flatMap(([genre, liste]) =>
  (Array.isArray(liste) ? liste : []).flatMap((sortie, i) => (Array.isArray(sortie) ? sortie : []).filter(Boolean).map((l) => ({ vers: l.node, genre, sortie: i }))))
const famille = (wf) => { const n = String(wf.name ?? ''); return /^ent-/.test(n) ? 'ent' : /^(lib|gabarit|client)-/.test(n) ? 'lib' : 'c4' }
const empreinte = (t) => createHash('sha256').update(String(t), 'utf8').digest('hex')
function* clesProfondes(o, chemin = '') {
  if (!o || typeof o !== 'object') return
  for (const [k, v] of Object.entries(o)) { yield [k, v, `${chemin}${k}`]; if (v && typeof v === 'object') yield* clesProfondes(v, `${chemin}${k}.`) }
}
const methodeDe = (n) => String(n.parameters?.method ?? 'GET').toUpperCase()
const estEffet = (n, outille = false) => estEnvoi(n, outille) || (n.type === 'n8n-nodes-base.httpRequest' && methodeDe(n) !== 'GET')
  || (n.type === 'n8n-nodes-base.supabase' && !['get', 'getAll'].includes(n.parameters?.operation))
  // Gabarit : appeler le modèle, et toute opération d'un outil qui n'est pas une lecture (écrire, publier, poser un rendez-vous, payer).
  || (outille && (APPELS_MODELE.has(n.type) || (OUTILS_NATIFS.includes(n.type.replace(/^n8n-nodes-base\./, '')) && !estLecture(n))))

// ─── La garde ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function verifier(brut, registre = {}) {
  const e = []
  const wf = brut && brut.workflow && Array.isArray(brut.workflow.nodes) ? brut.workflow : brut
  const ko = (regle, m) => e.push(`${regle} ${m}`)
  if (!wf || !Array.isArray(wf.nodes)) return ['export illisible : aucun tableau `nodes`']
  const fam = famille(wf)
  const neuf = fam !== 'c4'
  const outille = OUTILLE.test(String(wf.name ?? ''))
  // R1
  if (wf.active !== false) ko('R1', 'le workflow doit être inactif (active: false)')
  if (wf.activeVersionId) ko('R1', 'le workflow ne doit avoir aucune version publiée (activeVersionId)')
  // R2
  const tout = texteDe(brut)
  for (const re of SECRETS) if (re.test(tout)) ko('R2', `secret dans l'export (motif ${re.source.slice(0, 24)}…)`)
  // R3
  const erreurs = wf.nodes.filter((n) => n.type === 'n8n-nodes-base.errorTrigger')
  const errorWorkflow = wf.settings?.errorWorkflow
  const brancheInterne = erreurs.some((n) => sorties(wf, n.name).length > 0)
  if (errorWorkflow !== undefined && !(typeof errorWorkflow === 'string' && ID_NU.test(errorWorkflow))) ko('R3', `settings.errorWorkflow doit être un identifiant nu, jamais une expression (${String(errorWorkflow).slice(0, 40)})`)
  const brancheExterne = typeof errorWorkflow === 'string' && ID_NU.test(errorWorkflow)
  if (!brancheInterne && !brancheExterne) ko('R3', "aucune branche d'erreur (rang 26) : un Error Trigger relié à un nœud, ou settings.errorWorkflow")
  const noms = new Set(wf.nodes.map((n) => n.name))
  for (const n of wf.nodes) {
    // R5 : types (liste blanche de la famille)
    const orchestreP6 = !neuf && P6_ORCHESTRE.test(String(wf.name ?? ''))
    if (!(neuf ? TYPES_PERMIS_NEUFS : TYPES_PERMIS).has(n.type) && !(orchestreP6 && TYPES_PERMIS_NEUFS.has(n.type)) && !(outille && TYPES_OUTILS.has(n.type))) ko('R5', `${n.name} : type de nœud hors liste blanche (${n.type})`)
    // R6 : identifiants
    for (const [genre, c] of Object.entries(n.credentials ?? {})) {
      const nom = c && typeof c === 'object' ? c.name : null
      if (!c || typeof c !== 'object' || Object.keys(c).sort().join(',') !== 'id,name' || typeof c.id !== 'string' || !c.id || typeof nom !== 'string' || !nom.trim()
        || String(c.id).startsWith('=') || String(nom).startsWith('=')) ko('R6', `${n.name} : identifiant ${genre} non nommé ou hors forme { id, name } (${texteDe(c).slice(0, 60)})`)
    }
    // R5 : lectures seulement (c4) ; écriture permise derrière la porte (ent/lib, R15), jamais par le nœud Supabase (R14)
    const p = n.parameters ?? {}
    if (n.type === 'n8n-nodes-base.supabase') {
      if (neuf) ko('R14', `${n.name} : nœud Supabase exclu d'un ${fam}-* : le filtre organisation doit se lire dans la requête (HTTP Request)`)
      else if (!['get', 'getAll'].includes(p.operation)) ko('R5', `${n.name} : Supabase en ${p.operation} (get ou getAll seulement)`)
    }
    if (n.type === 'n8n-nodes-base.httpRequest') {
      const methode = methodeDe(n)
      if (!neuf && methode !== 'GET') ko('R5', `${n.name} : HTTP ${methode} (lectures GET seulement)`)
      if (neuf && !['GET', 'POST', 'PATCH'].includes(methode)) ko('R5', `${n.name} : HTTP ${methode} (GET, POST ou PATCH seulement dans un ${fam}-*)`)
      if (p.sendBody && (!neuf || methode === 'GET')) ko('R5', `${n.name} : corps de requête interdit`)
      const lecture = methode === 'GET'
      // R7 : hôte et colonnes
      let hote = null
      if (typeof p.url !== 'string' || p.url.includes('{{') || p.url.startsWith('=')) ko('R7', `${n.name} : adresse calculée (expression) : l'hôte doit être écrit en dur`)
      else { try { const u = new URL(p.url); hote = u.host; if (u.protocol !== 'https:') ko('R7', `${n.name} : https attendu`) } catch { ko('R7', `${n.name} : adresse illisible`) } }
      if (hote && !HOTES_PERMIS.has(hote) && !(outille && HOTES_OUTILS.has(hote))) ko('R7', `${n.name} : hôte non permis (${hote})`)
      const params = p.queryParameters?.parameters ?? []
      const select = params.filter((q) => q?.name === 'select')
      if (hote && HOTES_PERMIS.has(hote) && select.length !== 1 && (!neuf || lecture)) ko('R7', `${n.name} : un seul select= attendu (aucune lecture de toutes les colonnes)`)
      const exception = lecturePourEnvoi(n)
      if (exception && !(noms.has(exception) && TYPES_ENVOI.has(wf.nodes.find((x) => x.name === exception)?.type) && atteint(wf, n.name, exception))) ko('R7', `${n.name} : « lecture-pour-envoi » vers ${exception}, qui n'est pas un nœud d'envoi alimenté par cette lecture`)
      for (const s of select) {
        const v = String(s.value ?? '')
        if (/[*()]/.test(v) || v.includes(':')) ko('R7', `${n.name} : select= avec *, jointure ou alias (${v.slice(0, 80)})`)
        for (const col of v.split(',').map((c) => c.trim())) if (INTERDIT.test(col) && !exception) ko('R7', `${n.name} : colonne interdite lue (${col})`)
      }
      // R14 : filtre organisation sur chaque requête (ent/lib)
      if (neuf && hote && HOTES_PERMIS.has(hote)) {
        if (methode === 'POST') {
          if (!/organisation_id/.test(texteDe([p.jsonBody, p.bodyParameters, p.body]))) ko('R14', `${n.name} : écriture sans organisation_id dans le corps`)
        } else {
          const filtres = params.filter((q) => q?.name === 'organisation_id')
          if (filtres.length !== 1 || !/^=?eq\./.test(String(filtres[0].value ?? ''))) ko('R14', `${n.name} : requête sans filtre organisation (un seul organisation_id=eq.… attendu)`)
        }
      }
    }
    // R4 : pieds
    if (estEnvoi(n, outille)) {
      const pied = piedDeclare(n)
      const t = texteDe(p)
      const porte = { mention: aMention(t), PIED_AUTOMATIQUE: t.includes(PIED_AUTOMATIQUE), PIED_APRES: t.includes(PIED_APRES) }
      if (!pied || !PIEDS.includes(pied)) { ko('R4', `${n.name} : nœud d'envoi sans pied déclaré (notes : « pied: ${PIEDS.join(' | ')} »)`); continue }
      for (const [k, oui] of Object.entries(porte)) {
        if (k === pied && !oui) ko('R4', `${n.name} : pied « ${pied} » déclaré mais absent du texte envoyé`)
        if (k !== pied && oui) ko('R4', `${n.name} : porte le pied « ${k} », qui n'est pas le sien (${pied})`)
      }
      if (pied !== 'aucun' && /presti/i.test(t)) ko('R4', `${n.name} : « Presti » dans un envoi au nom d'un artisan (marque blanche)`)
    }
  }
  if (neuf) reglesNeuves(wf, fam, tout, brancheInterne, registre, ko)
  return e
}

// ─── Les règles neuves des familles ent/lib (R8 à R20) ──────────────────────────────────────────────────────────────────────
function reglesNeuves(wf, fam, tout, brancheInterne, registre, ko) {
  const s = wf.settings ?? {}
  const parNom = new Map(wf.nodes.map((n) => [n.name, n]))
  // R8 : ni chat_id ni e-mail en dur
  const courriel = COURRIEL.exec(tout)
  if (courriel) ko('R8', `adresse e-mail écrite dans l'export (${courriel[0].replace(/^[^@]{0,2}[^@]*@/, '…@')})`)
  if (CHAT_ID_EN_DUR.test(tout)) ko('R8', 'chat_id écrit en dur dans l\'export')
  for (const n of wf.nodes) for (const [k, v, chemin] of clesProfondes(n.parameters)) {
    if (/^chat_?id$/i.test(k) && (typeof v === 'number' || (typeof v === 'string' && v.trim() && !v.startsWith('=')))) ko('R8', `${n.name} : ${chemin} écrit en dur (une expression qui lit la configuration, jamais une valeur)`)
  }
  // R9 : workflow d'erreur désigné
  const ew = s.errorWorkflow
  if (wf.name === 'lib-erreur-commune') {
    if (!brancheInterne) ko('R9', 'lib-erreur-commune doit porter son Error Trigger relié à un nœud')
    if (ew !== undefined) ko('R9', 'lib-erreur-commune ne désigne pas de workflow d\'erreur : il est celui des autres')
  } else if (!(typeof ew === 'string' && ID_NU.test(ew))) ko('R9', 'aucun workflow d\'erreur désigné (settings.errorWorkflow = l\'identifiant de lib-erreur-commune) : une branche interne ne suffit pas')
  else if (wf.id && ew === wf.id) ko('R9', 'le workflow se désigne lui-même comme workflow d\'erreur')
  // R10 : fuseau
  if (s.timezone !== 'Europe/Paris') ko('R10', `fuseau ${s.timezone ?? 'absent (New York par défaut)'} : Europe/Paris attendu`)
  // R11 : politique d'appel en liste
  const enfant = wf.nodes.some((n) => n.type === SOUS_TRIGGER)
  const ids = String(s.callerIds ?? '').split(',').map((x) => x.trim()).filter(Boolean)
  const enListe = s.callerPolicy === 'workflowsFromAList' && ids.length > 0 && ids.every((i) => ID_NU.test(i))
  if (enfant && !enListe) ko('R11', `politique d'appel ${s.callerPolicy ?? 'absente'} : un enfant n'est appelé que par une liste (workflowsFromAList et callerIds)`)
  if (!enfant && !enListe && s.callerPolicy !== 'none') ko('R11', `politique d'appel ${s.callerPolicy ?? 'absente'} : none ou une liste, jamais any`)
  // R12 : délai maximal
  if (!Number.isInteger(s.executionTimeout) || s.executionTimeout < 1 || s.executionTimeout > 3600) ko('R12', `délai maximal d'exécution ${s.executionTimeout ?? 'absent'} : un entier de 1 à 3600 s attendu`)
  // R13 : ent-* : ce que n8n garde
  if (fam === 'ent') {
    if (s.saveDataSuccessExecution !== 'none') ko('R13', `succès sauvés (${s.saveDataSuccessExecution ?? 'défaut de l\'instance'}) : saveDataSuccessExecution none attendu sur un ent-*`)
    if (s.saveExecutionProgress === true) ko('R13', 'progression des exécutions sauvée sur un ent-*')
  }
  // R15 : la porte « simulation » avant tout effet
  const outilleR15 = OUTILLE.test(String(wf.name ?? ''))
  const portes = new Set()
  for (const n of wf.nodes.filter((x) => /^\s*porte\s*:\s*simulation\s*$/m.test(String(x.notes ?? '')))) {
    const c = n.parameters?.conditions ?? {}
    const liste = Array.isArray(c.conditions) ? c.conditions : []
    const op = liste[0]?.operator ?? {}
    const bonne = n.type === 'n8n-nodes-base.if' && liste.length === 1 && /simulation/.test(String(liste[0].leftValue ?? ''))
      && op.type === 'boolean' && op.operation === 'true' && c.options?.typeValidation === 'strict' && n.parameters?.looseTypeValidation !== true
    if (bonne) portes.add(n.name)
    else ko('R15', `${n.name} : porte « simulation » mal formée (un If, une seule condition booléenne « vrai » sur simulation, typage strict)`)
  }
  const entrants = new Set(wf.nodes.flatMap((n) => aretes(wf, n.name).map((a) => a.vers)))
  const racines = wf.nodes.filter((n) => n.type !== 'n8n-nodes-base.stickyNote' && !entrants.has(n.name)).map((n) => n.name)
  const sansPorte = new Set(), file = [...racines]
  while (file.length) {
    const x = file.shift(); if (sansPorte.has(x)) continue; sansPorte.add(x)
    for (const a of aretes(wf, x)) if (!(portes.has(x) && a.genre === 'main' && a.sortie === 1) && !(outilleR15 && a.genre !== 'main')) file.push(a.vers)
  }
  for (const n of wf.nodes) if (estEffet(n, outilleR15) && sansPorte.has(n.name)) ko('R15', `${n.name} : effet atteignable sans passer par la sortie « faux » d'une porte « simulation »`)
  // R16 : contrats d'entrée et de sortie (enfants)
  if (enfant) {
    const declencheurs = wf.nodes.filter((n) => n.type === SOUS_TRIGGER)
    if (declencheurs.length !== 1) ko('R16', `${declencheurs.length} Execute Workflow Trigger : un seul attendu`)
    const d = declencheurs[0]
    const suivants = aretes(wf, d.name).filter((a) => a.genre === 'main').map((a) => a.vers)
    const entree = parNom.get("Contrat d'entrée")
    if (suivants.length !== 1 || suivants[0] !== "Contrat d'entrée" || entree?.type !== CODE) ko('R16', "l'enfant doit commencer par un seul nœud Code « Contrat d'entrée »")
    const contrat = /^\s*contrat\s*:\s*(\S+)\s*$/m.exec(String(entree?.notes ?? ''))?.[1]
    if (!contrat || !CONTRAT_FORME.test(contrat) || contrat.split('@')[0] !== wf.name) ko('R16', `contrat d'entrée : notes « contrat: ${wf.name}@N » attendues (${contrat ?? 'absentes'})`)
    const codeEntree = String(entree?.parameters?.jsCode ?? '')
    if (contrat && !codeEntree.includes(`'${contrat}'`)) ko('R16', `« Contrat d'entrée » ne vérifie pas le contrat ${contrat}`)
    for (const k of CLES_ENTREE) if (!codeEntree.includes(`'${k}'`)) ko('R16', `« Contrat d'entrée » ne contrôle pas la clé « ${k} » de l'enveloppe@1`)
    const fins = wf.nodes.filter((n) => n.name === 'Contrat de sortie')
    if (fins.length !== 1 || fins[0].type !== CODE) ko('R16', 'un seul nœud Code « Contrat de sortie » attendu')
    else {
      if (aretes(wf, 'Contrat de sortie').length) ko('R16', '« Contrat de sortie » doit être le dernier nœud')
      const codeSortie = String(fins[0].parameters?.jsCode ?? '')
      if (contrat && !codeSortie.includes(`'${contrat}'`)) ko('R16', `« Contrat de sortie » ne rend pas le contrat ${contrat}`)
      for (const k of CLES_SORTIE) if (!codeSortie.includes(`'${k}'`)) ko('R16', `« Contrat de sortie » ne rend pas la clé « ${k} »`)
      const vus = new Set(), f = d ? [d.name] : []
      while (f.length) { const x = f.shift(); if (vus.has(x)) continue; vus.add(x); f.push(...aretes(wf, x).filter((a) => a.genre === 'main').map((a) => a.vers)) }
      for (const x of vus) {
        const n = parNom.get(x)
        if (n && x !== 'Contrat de sortie' && n.type !== 'n8n-nodes-base.stopAndError' && !aretes(wf, x).some((a) => a.genre === 'main')) ko('R16', `${x} : bout de chemin hors du « Contrat de sortie » (une seule sortie)`)
      }
    }
  }
  for (const n of wf.nodes) {
    const p = n.parameters ?? {}
    // R17 : compatible 3.0
    if (RETIRES_3.has(n.type)) ko('R17', `${n.name} : nœud ${RETIRES_3.get(n.type)} (retiré en 3.0 ou exclu)`)
    if (n.type === SOUS_APPEL) {
      if (p.source !== 'database') ko('R17', `${n.name} : Execute Sub-workflow en source ${p.source ?? 'absente'} (database attendue)`)
      const w = p.workflowId
      if (!(w && typeof w === 'object' && w.__rl === true && ['list', 'id'].includes(w.mode) && ID_NU.test(String(w.value)))) ko('R17', `${n.name} : sous-workflow désigné par un identifiant fixe, jamais une expression`)
    }
    if (n.type === AGENT && !(Number(n.typeVersion) >= 3)) ko('R17', `${n.name} : AI Agent ${n.typeVersion} (3.x attendu)`)
    // R18 : modèles
    if (n.type === AGENT) {
      const o = p.options ?? {}
      if (o.passthroughBinaryImages !== false) ko('R18', `${n.name} : passthroughBinaryImages doit valoir faux (vrai par défaut)`)
      if (!Number.isInteger(o.maxIterations) || o.maxIterations < 1 || o.maxIterations > 10) ko('R18', `${n.name} : maxIterations borné de 1 à 10 attendu (${o.maxIterations ?? 'absent'})`)
      const parseurs = wf.nodes.filter((x) => aretes(wf, x.name).some((a) => a.genre === 'ai_outputParser' && a.vers === n.name))
      if (p.hasOutputParser !== true || parseurs.length !== 1 || parseurs[0].type !== PARSEUR) ko('R18', `${n.name} : un seul Structured Output Parser branché attendu`)
      const apres = aretes(wf, n.name).filter((a) => a.genre === 'main').map((a) => parNom.get(a.vers))
      if (!apres.length || !apres.every((x) => x?.type === CODE)) ko('R18', `${n.name} : la sortie du modèle doit être revalidée par un nœud Code`)
    }
    if (n.type === PARSEUR) {
      if (p.schemaType !== 'manual') ko('R18', `${n.name} : schéma ${p.schemaType ?? 'fromJson (défaut)'} : JSON Schema saisi (manual) attendu`)
      if (p.autoFix === true) ko('R18', `${n.name} : autoFix doit valoir faux (hors schéma = rejet)`)
    }
    // R19 : nœuds Code
    if (n.type === CODE) {
      const js = String(p.jsCode ?? p.pythonCode ?? '')
      if (MODULE_OU_RESEAU.test(js)) ko('R19', `${n.name} : module, réseau ou environnement dans un nœud Code`)
      const h = empreinte(js), attendu = registre?.[wf.name]?.[n.name]
      if (!attendu) ko('R19', `${n.name} : empreinte inconnue (${h.slice(0, 12)}…) : à inscrire dans empreintes-code.json, à côté de l'export`)
      else if (attendu !== h) ko('R19', `${n.name} : empreinte changée (${h.slice(0, 12)}… au lieu de ${String(attendu).slice(0, 12)}…)`)
    }
  }
  // R20 : mention d'IA sur un envoi en aval d'un modèle
  const modeles = wf.nodes.filter((n) => String(n.type).startsWith('@n8n/n8n-nodes-langchain.'))
  for (const n of wf.nodes) if (estEnvoi(n, outilleR15) && modeles.some((m) => atteint(wf, m.name, n.name)) && piedDeclare(n) !== 'mention') ko('R20', `${n.name} : envoi en aval d'un modèle sans « pied: mention »`)
  if (outilleR15) reglesOutils(wf, ko)
}

// ─── Les règles des gabarits outillés et de leurs copies par client (R21 à R23, OUTILLAGE.md § 8) ─────────────────────────────
function reglesOutils(wf, ko) {
  const nom = String(wf.name ?? '')
  const gabarit = /^gabarit-/.test(nom)
  const entreprise = /^(gabarit|client)-ent-/.test(nom)
  for (const n of wf.nodes) {
    // R21 : un gabarit ne porte aucun identifiant de client ; seule l'API REST de Supabase (le compte de Presti, filtré par R14) en a un
    const versSupabase = n.type === B('httpRequest') && typeof n.parameters?.url === 'string' && (() => { try { return HOTES_PERMIS.has(new URL(n.parameters.url).host) } catch { return false } })()
    if (gabarit && Object.keys(n.credentials ?? {}).length && !versSupabase) ko('R21', `${n.name} : identifiant branché dans un gabarit (${Object.keys(n.credentials).join(', ')}) : seule la copie du client en reçoit, branché par lui`)
    // R22 : aucun déclencheur à webhook : n8n d'Oracle n'est pas exposé (p6:225-227) ; les canaux à webhook arrivent par Presti et la base
    if ((n.type === B('webhook') || n.type === B('formTrigger') || n.type === LC('chatTrigger') || /Trigger$/.test(n.type))
      && !DECLENCHEURS_INTERVALLE.has(n.type) && ![B('scheduleTrigger'), B('errorTrigger'), B('executeWorkflowTrigger'), B('manualTrigger')].includes(n.type))
      ko('R22', `${n.name} : déclencheur à webhook (${n.type}) : n8n n'est pas exposé, l'entrée passe par Presti et la base`)
  }
  // R23 : ce qui est branché sur un agent en outil ne fait que lire ; la validation humaine native est réservée à l'Entreprise
  for (const n of wf.nodes) for (const a of aretes(wf, n.name)) {
    if (a.genre !== 'ai_tool') continue
    if (OUTILS_VALIDATION.has(n.type)) { if (!entreprise) ko('R23', `${n.name} : validation humaine de n8n hors d'un gabarit Entreprise (la validation d'un artisan est une carte « À valider »)`); continue }
    if (!OUTILS_AGENT.has(n.type)) { ko('R23', `${n.name} : outil d'agent non admis (${n.type})`); continue }
    if (n.type === LC('toolHttpRequest') && methodeDe(n) !== 'GET') ko('R23', `${n.name} : outil HTTP en ${methodeDe(n)} (lecture GET seulement)`)
    if (n.type.endsWith('Tool') && n.type.startsWith('n8n-nodes-base.') && !estLecture(n)) ko('R23', `${n.name} : outil d'agent qui écrit ou envoie (${n.parameters?.operation ?? 'opération par défaut'}) : l'écriture se fait après la porte, sur le chemin principal`)
    if (n.type === LC('toolWorkflow') && !/^\s*outil\s*:\s*lecture\s*$/m.test(String(n.notes ?? ''))) ko('R23', `${n.name} : sous-workflow en outil sans « outil: lecture » déclaré`)
  }
}

// ─── Un workflow d'envoi FICTIF, pour éprouver R4 (aucun workflow d'envoi n'existe encore dans n8n) ─────────────────────────────
const IDENT = { supabaseApi: { id: 'IdentifiantFictif01', name: 'Supabase account' } }
const lecture = (name, url, select, extra = {}) => ({ id: name, name, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.5, position: [0, 0], credentials: IDENT,
  parameters: { method: 'GET', url, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendQuery: true, specifyQuery: 'keypair', queryParameters: { parameters: [{ name: 'select', value: select }] }, options: {} }, ...extra })
const envoi = (name, type, pied, texte, credentials) => ({ id: name, name, type, typeVersion: 2, position: [0, 0], notes: `pied: ${pied}`, credentials, parameters: { subject: 'Votre dossier', text: texte } })
const FICTIF = {
  name: 'essai-garde-envois (fictif, jamais dans n8n)', active: false, activeVersionId: null, settings: { executionOrder: 'v1', timezone: 'Europe/Paris' },
  nodes: [
    { id: 'd', name: 'Déclencheur', type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2, position: [0, 0], parameters: {} },
    lecture('Lire relances', 'https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/relances_impayes', 'id,artisan_id,facture_id,rang,statut'),
    lecture('Lire destinataire', 'https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/factures', 'id,client_email', { notes: 'lecture-pour-envoi: Rappel d impayé' }),
    { id: 'p', name: 'Préparer', type: 'n8n-nodes-base.code', typeVersion: 2, position: [0, 0], parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: 'return $input.all();' } },
    envoi('Réponse seule', 'n8n-nodes-base.emailSend', 'mention', 'Bonjour,\n{{ $json.corps }}\n\n—\nMessage rédigé et envoyé automatiquement par l’assistant de {{ $json.artisan }}.', { smtp: { id: 'IdentifiantFictif02', name: 'SMTP essai' } }),
    envoi('Rappel d impayé', 'n8n-nodes-base.emailSend', 'PIED_AUTOMATIQUE', `Bonjour,\n{{ $json.corps }}\n\n—\n${PIED_AUTOMATIQUE}`, { smtp: { id: 'IdentifiantFictif02', name: 'SMTP essai' } }),
    envoi('Proposer l entretien', 'n8n-nodes-base.emailSend', 'PIED_APRES', `Bonjour,\n{{ $json.corps }}\n\n—\n${PIED_APRES}`, { smtp: { id: 'IdentifiantFictif02', name: 'SMTP essai' } }),
    envoi('Alerte à Benj', 'n8n-nodes-base.slack', 'aucun', 'Un workflow de Presti a échoué : {{ $json.noeud }}', { slackApi: { id: 'IdentifiantFictif03', name: 'Slack essai' } }),
    { id: 'e', name: 'Échec', type: 'n8n-nodes-base.errorTrigger', typeVersion: 1, position: [0, 0], parameters: {} },
  ],
  connections: {
    'Déclencheur': { main: [[{ node: 'Lire relances', type: 'main', index: 0 }]] },
    'Lire relances': { main: [[{ node: 'Préparer', type: 'main', index: 0 }]] },
    'Préparer': { main: [[{ node: 'Réponse seule', type: 'main', index: 0 }, { node: 'Lire destinataire', type: 'main', index: 0 }, { node: 'Proposer l entretien', type: 'main', index: 0 }]] },
    'Lire destinataire': { main: [[{ node: 'Rappel d impayé', type: 'main', index: 0 }]] },
    'Échec': { main: [[{ node: 'Alerte à Benj', type: 'main', index: 0 }]] },
  },
}

// ─── Les mutants : chacun doit faire rougir la garde, pour la raison nommée ─────────────────────────────────────────────────────
const copie = (o) => JSON.parse(JSON.stringify(o))
const muter = (f) => (wf) => { const m = copie(wf); f(m.workflow && Array.isArray(m.workflow.nodes) ? m.workflow : m); return m }
const noeud = (wf, nom) => { const n = wf.nodes.find((x) => x.name === nom); if (!n) throw new Error(`nœud absent : ${nom}`); return n }
const lien = (vers, i = 0) => ({ node: vers, type: 'main', index: i })
// Une clé fictive, assemblée ici pour que ce fichier ne porte aucun motif de secret (scripts/garde-commit.mjs).
const CLE_FICTIVE = 'sb_' + 'secret_' + 'x'.repeat(24)
const MUTANTS_DETECTEURS = [
  ['workflow actif', muter((w) => { w.active = true }), /^R1 /],
  ['version publiée', muter((w) => { w.activeVersionId = 'v1' }), /^R1 /],
  // Depuis 032-033, l'export porte aussi settings.errorWorkflow : ôter la seule branche interne ne prouvait plus rien. Les deux branches partent.
  ['branche d’erreur ôtée (rang 26) : Error Trigger et workflow d’erreur', muter((w) => { w.nodes = w.nodes.filter((n) => n.type !== 'n8n-nodes-base.errorTrigger'); delete w.settings.errorWorkflow }), /^R3 /],
  ['Error Trigger relié à rien, sans workflow d’erreur', muter((w) => { for (const n of w.nodes) if (n.type === 'n8n-nodes-base.errorTrigger') delete w.connections[n.name]; delete w.settings.errorWorkflow }), /^R3 /],
  ['workflow d’erreur en expression', muter((w) => { w.settings.errorWorkflow = '={{ $json.id }}' }), /^R3 /],
  ['colonne `nom` lue', muter((w) => { noeud(w, 'Lire comptes').parameters.queryParameters.parameters[0].value += ',nom' }), /^R7 .*colonne interdite/],
  ['select=* ', muter((w) => { noeud(w, 'Lire devis').parameters.queryParameters.parameters[0].value = '*' }), /^R7 .*select=/],
  ['jointure dans select=', muter((w) => { noeud(w, 'Lire devis').parameters.queryParameters.parameters[0].value += ',devis_lignes(designation)' }), /^R7 .*jointure/],
  ['select= retiré (toutes les colonnes)', muter((w) => { const p = noeud(w, 'Lire factures').parameters.queryParameters; p.parameters = p.parameters.filter((q) => q.name !== 'select') }), /^R7 .*un seul select/],
  ['hôte tiers', muter((w) => { noeud(w, 'Lire tarifs').parameters.url = 'https://exemple.invalid/rest/v1/prix_artisan' }), /^R7 .*hôte non permis/],
  ['hôte calculé par une expression', muter((w) => { noeud(w, 'Lire tarifs').parameters.url = "={{ 'https://' + $json.hote + '/rest/v1/prix_artisan' }}" }), /^R7 .*expression/],
  ['lecture devenue POST', muter((w) => { noeud(w, 'Lire chantiers').parameters.method = 'POST' }), /^R5 .*POST/],
  ['corps de requête', muter((w) => { noeud(w, 'Lire chantiers').parameters.sendBody = true }), /^R5 .*corps/],
  ['Supabase qui écrit', muter((w) => { noeud(w, 'Lecture de connexion (regles_automatisation)').parameters.operation = 'update' }), /^R5 .*Supabase/],
  ['nœud Postgres ajouté', muter((w) => { w.nodes.push({ id: 'pg', name: 'Écrire', type: 'n8n-nodes-base.postgres', typeVersion: 2, position: [0, 0], parameters: { operation: 'executeQuery' } }) }), /^R5 .*hors liste blanche/],
  ['modèle ajouté (OpenAI)', muter((w) => { w.nodes.push({ id: 'ia', name: 'Rédiger', type: '@n8n/n8n-nodes-langchain.openAi', typeVersion: 1, position: [0, 0], parameters: {} }) }), /^R5 .*hors liste blanche/],
  ['identifiant sans nom', muter((w) => { delete noeud(w, 'Lire stock').credentials.supabaseApi.name }), /^R6 /],
  ['identifiant en expression', muter((w) => { noeud(w, 'Lire stock').credentials.supabaseApi.id = '={{ $json.cle }}' }), /^R6 /],
  ['clé en clair dans un identifiant', muter((w) => { noeud(w, 'Lire stock').credentials.supabaseApi.data = { serviceRole: CLE_FICTIVE } }), /^R2 |^R6 /],
  ['clé de service collée dans un paramètre', muter((w) => { noeud(w, 'Lire stock').parameters.queryParameters.parameters.push({ name: 'apikey', value: CLE_FICTIVE }) }), /^R2 /],
  ['nœud Slack sans pied déclaré', muter((w) => { w.nodes.push({ id: 's', name: 'Avertir', type: 'n8n-nodes-base.slack', typeVersion: 2, position: [0, 0], credentials: { slackApi: { id: 'IdentifiantFictif03', name: 'Slack essai' } }, parameters: { text: 'x' } }) }), /^R4 .*sans pied/],
  // 035-001 : la porte « simulation » des ent/lib ne rouvre JAMAIS l'écriture d'un workflow du chantier 4 (détecteurs en lecture seule).
  ['c4 : écriture POST derrière une porte « simulation » bien formée', muter((w) => {
    const pt = { id: 'pt', name: 'Porte simulation', type: 'n8n-nodes-base.if', typeVersion: 2.2, position: [0, 0], notes: 'porte: simulation',
      parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ leftValue: '={{ $json.simulation }}', rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' } } }
    w.nodes.push(pt); noeud(w, 'Lire chantiers').parameters.method = 'POST'
    for (const [de, c] of Object.entries(w.connections)) for (const sortie of c.main ?? []) for (const l of sortie ?? []) if (l?.node === 'Lire chantiers') { l.node = 'Porte simulation'; void de }
    w.connections['Porte simulation'] = { main: [[], [lien('Lire chantiers')]] }
  }), /^R5 .*Lire chantiers.*POST/],
  ['c4 : nœud de sous-workflow ajouté (hors liste blanche du chantier 4)', muter((w) => { w.nodes.push({ id: 'sw', name: 'Appeler', type: SOUS_APPEL, typeVersion: 1.4, position: [0, 0], parameters: { source: 'database', workflowId: { __rl: true, mode: 'id', value: 'Inconnu0001' } } }) }), /^R5 .*hors liste blanche/],
]
const MUTANTS_FICTIF = [
  ['mention ôtée d’un workflow visé (réponse seule)', muter((w) => { noeud(w, 'Réponse seule').parameters.text = 'Bonjour,\n{{ $json.corps }}' }), /^R4 .*Réponse seule.*absent/],
  ['pied d’un envoi non déclaré', muter((w) => { delete noeud(w, 'Réponse seule').notes }), /^R4 .*sans pied/],
  ['pied inconnu déclaré', muter((w) => { noeud(w, 'Réponse seule').notes = 'pied: libre' }), /^R4 .*sans pied/],
  ['rappel d’impayé sans PIED_AUTOMATIQUE', muter((w) => { noeud(w, 'Rappel d impayé').parameters.text = 'Bonjour,\n{{ $json.corps }}' }), /^R4 .*Rappel d impayé.*absent/],
  ['rappel d’impayé qui porte la mention en plus', muter((w) => { noeud(w, 'Rappel d impayé').parameters.text += '\nMessage rédigé et envoyé automatiquement par l’assistant de X.' }), /^R4 .*n'est pas le sien/],
  ['après-chantier avec le pied des impayés', muter((w) => { noeud(w, 'Proposer l entretien').parameters.text = `Bonjour,\n\n—\n${PIED_AUTOMATIQUE}` }), /^R4 .*Proposer l entretien/],
  ['alerte de Presti qui porte la mention', muter((w) => { noeud(w, 'Alerte à Benj').parameters.text += ' — Message rédigé et envoyé automatiquement par l’assistant.' }), /^R4 .*Alerte à Benj.*n'est pas le sien/],
  ['« Presti » dans un envoi au nom d’un artisan', muter((w) => { noeud(w, 'Réponse seule').parameters.text = noeud(w, 'Réponse seule').parameters.text.replace('de {{ $json.artisan }}', 'de Presti') }), /^R4 .*Presti/],
  ['lecture pour envoi sans la déclaration (client_email)', muter((w) => { delete noeud(w, 'Lire destinataire').notes }), /^R7 .*colonne interdite/],
  ['lecture pour envoi déclarée vers un nœud qui n’envoie pas', muter((w) => { noeud(w, 'Lire destinataire').notes = 'lecture-pour-envoi: Préparer' }), /^R7 .*lecture-pour-envoi/],
  ['lecture pour envoi déclarée mais qui n’alimente pas l’envoi', muter((w) => { w.connections['Lire destinataire'] = { main: [[]] } }), /^R7 .*lecture-pour-envoi/],
  ['branche d’erreur ôtée du workflow d’envoi', muter((w) => { delete w.connections['Échec'] }), /^R3 /],
]
// Les mutants des règles neuves, chacun sur l'export fictif qui porte la règle (scripts/fixtures/n8n-specs-qa/).
const telegram = (chatId) => ({ id: 'tg', name: 'Alerter Benj', type: 'n8n-nodes-base.telegram', typeVersion: 1.2, position: [0, 0], notes: 'pied: aucun', credentials: { telegramApi: { id: 'IdentifiantFictif05', name: 'Telegram essai' } }, parameters: { chatId, text: 'Exemple. Un agent est à l’arrêt.' } })
const MUTANTS_LIB = [
  ['R8 adresse e-mail écrite dans un nœud', muter((w) => { noeud(w, 'Écrire la carte').parameters.headerParameters.parameters.push({ name: 'X-Contact', value: 'gerant@exemple.invalid' }) }), /^R8 .*e-mail/],
  ['R8 chat_id Telegram écrit en dur', muter((w) => { w.nodes.push(telegram('123456789')); w.connections['Effets prévus'].main[0].push(lien('Alerter Benj')) }), /^R8 .*chat/i],
  ['R9 branche d’erreur interne à la place du workflow d’erreur désigné', muter((w) => {
    delete w.settings.errorWorkflow
    w.nodes.push({ id: 'et', name: 'Échec', type: 'n8n-nodes-base.errorTrigger', typeVersion: 1, position: [0, 0], parameters: {} }, { id: 'no', name: 'Rien', type: 'n8n-nodes-base.noOp', typeVersion: 1, position: [0, 0], parameters: {} })
    w.connections['Échec'] = { main: [[lien('Rien')]] }
  }), /^R9 .*aucun workflow d'erreur désigné/],
  ['R9 le workflow se désigne lui-même', muter((w) => { w.id = 'LibExecuterFictif01'; w.settings.errorWorkflow = 'LibExecuterFictif01' }), /^R9 .*lui-même/],
  ['R10 fuseau New York', muter((w) => { w.settings.timezone = 'America/New_York' }), /^R10 /],
  ['R10 fuseau absent', muter((w) => { delete w.settings.timezone }), /^R10 /],
  ['R11 enfant appelable par tout workflow (any)', muter((w) => { w.settings.callerPolicy = 'any' }), /^R11 /],
  ['R11 liste d’appelants vide', muter((w) => { w.settings.callerIds = '' }), /^R11 /],
  ['R12 délai maximal retiré', muter((w) => { delete w.settings.executionTimeout }), /^R12 /],
  ['R12 délai maximal de 2 h', muter((w) => { w.settings.executionTimeout = 7200 }), /^R12 /],
  ['R14 lecture sans filtre organisation', muter((w) => { const q = noeud(w, "Relire l'interrupteur").parameters.queryParameters; q.parameters = q.parameters.filter((x) => x.name !== 'organisation_id') }), /^R14 .*filtre organisation/],
  ['R14 filtre organisation sans eq.', muter((w) => { noeud(w, "Relire l'interrupteur").parameters.queryParameters.parameters.find((x) => x.name === 'organisation_id').value = 'not.is.null' }), /^R14 .*filtre organisation/],
  ['R14 écriture sans organisation_id', muter((w) => { const p = noeud(w, 'Écrire la carte').parameters; p.jsonBody = p.jsonBody.replace(/organisation_id: [^,]+, /, '') }), /^R14 .*organisation_id dans le corps/],
  ['R14 nœud Supabase dans un lib-*', muter((w) => { w.nodes.push({ id: 'sb', name: 'Lire en direct', type: 'n8n-nodes-base.supabase', typeVersion: 1, position: [0, 0], credentials: { supabaseApi: { id: 'IdentifiantFictif01', name: 'Supabase account' } }, parameters: { resource: 'row', operation: 'getAll', tableId: 'configuration_organisation' } }) }), /^R14 .*Supabase/],
  ['R15 la porte « simulation » retirée (p5:318)', muter((w) => { w.nodes = w.nodes.filter((n) => n.name !== 'Porte simulation'); delete w.connections['Porte simulation']; w.connections["Relire l'interrupteur"].main = [[lien('Écrire la carte'), lien('Effets prévus')]] }), /^R15 .*Écrire la carte.*effet atteignable/],
  ['R15 l’écriture branchée sur la sortie « vrai » (simulation)', muter((w) => { w.connections['Porte simulation'].main = [[lien('Effets prévus'), lien('Écrire la carte')], []] }), /^R15 .*Écrire la carte.*effet atteignable/],
  ['R15 porte inversée (condition « faux »)', muter((w) => { noeud(w, 'Porte simulation').parameters.conditions.conditions[0].operator.operation = 'false' }), /^R15 .*mal formée/],
  ['R15 porte en typage souple', muter((w) => { noeud(w, 'Porte simulation').parameters.conditions.options.typeValidation = 'loose' }), /^R15 .*mal formée/],
  ['R15 porte sur un autre champ que simulation', muter((w) => { noeud(w, 'Porte simulation').parameters.conditions.conditions[0].leftValue = '={{ $json.interrupteur_general }}' }), /^R15 .*mal formée/],
  ['R15 l’erreur de la porte mène à l’écriture', muter((w) => { noeud(w, 'Porte simulation').onError = 'continueErrorOutput'; w.connections['Porte simulation'].main.push([lien('Écrire la carte')]) }), /^R15 .*Écrire la carte.*effet atteignable/],
  ['R15 un second déclencheur qui contourne la porte', muter((w) => { w.nodes.push({ id: 'ma', name: 'Essai manuel', type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2, position: [0, 0], parameters: {} }); w.connections['Essai manuel'] = { main: [[lien('Écrire la carte')]] } }), /^R15 .*Écrire la carte.*effet atteignable/],
  ['R16 contrat d’entrée contourné', muter((w) => { w.connections['Appelé par la chaîne'].main = [[lien("Relire l'interrupteur")]] }), /^R16 .*commencer/],
  ['R16 contrat d’entrée qui ne contrôle plus simulation', muter((w) => { const n = noeud(w, "Contrat d'entrée"); n.parameters.jsCode = n.parameters.jsCode.replace(", 'simulation',", ',') }), /^R16 .*« simulation »/],
  ['R16 contrat déclaré pour un autre gabarit', muter((w) => { noeud(w, "Contrat d'entrée").notes = 'contrat: lib-relancer@1' }), /^R16 .*notes « contrat/],
  ['R16 deuxième fin de chemin hors du contrat de sortie', muter((w) => { w.connections['Écrire la carte'].main = [[]] }), /^R16 .*Écrire la carte.*bout de chemin/],
  ['R16 contrat de sortie sans effets_faits', muter((w) => { const n = noeud(w, 'Contrat de sortie'); n.parameters.jsCode = n.parameters.jsCode.replace("'effets_faits': effetsFaits,", '') }), /^R16 .*« effets_faits »/],
  ['R17 nœud Execute Command', muter((w) => { w.nodes.push({ id: 'ex', name: 'Commande', type: 'n8n-nodes-base.executeCommand', typeVersion: 1, position: [0, 0], parameters: { command: 'true' } }) }), /^R17 .*Execute Command/],
  ['R17 nœud Function (retiré en 3.0)', muter((w) => { w.nodes.push({ id: 'fn', name: 'Ancien code', type: 'n8n-nodes-base.function', typeVersion: 1, position: [0, 0], parameters: { functionCode: 'return items;' } }) }), /^R17 .*Function/],
  ['R19 nœud Code modifié après revue (empreinte)', muter((w) => { noeud(w, 'Effets prévus').parameters.jsCode += '\n// ajout' }), /^R19 .*Effets prévus.*empreinte changée/],
  ['R19 nœud Code inconnu du registre', muter((w) => { w.nodes.push({ id: 'cx', name: 'Code neuf', type: CODE, typeVersion: 2, position: [0, 0], parameters: { jsCode: 'return $input.all();' } }) }), /^R19 .*Code neuf.*empreinte inconnue/],
  ['R19 module chargé dans un nœud Code', muter((w) => { noeud(w, 'Effets prévus').parameters.jsCode = "const fs = require('fs');\n" + noeud(w, 'Effets prévus').parameters.jsCode }), /^R19 .*module/],
  ['R19 réseau sortant depuis un nœud Code', muter((w) => { noeud(w, 'Effets prévus').parameters.jsCode += "\nawait this.helpers.httpRequest({ url: 'https://exemple.invalid' });" }), /^R19 .*réseau/],
  ['famille : le lib-* renommé hors famille retombe sous R5 (lecture seule)', muter((w) => { w.name = 'presti-exemple-executer' }), /^R5 .*Écrire la carte.*POST/],
]
const MUTANTS_RELANCE = [
  ['R13 succès sauvés sur un ent-*', muter((w) => { w.settings.saveDataSuccessExecution = 'all' }), /^R13 .*succès/],
  ['R13 réglage de sauvegarde des succès ôté', muter((w) => { delete w.settings.saveDataSuccessExecution }), /^R13 .*succès/],
  ['R13 progression sauvée sur un ent-*', muter((w) => { w.settings.saveExecutionProgress = true }), /^R13 .*progression/],
  ['R15 l’envoi branché sans porte', muter((w) => { w.connections['Revalider le message'].main = [[lien('Envoyer la relance')]] }), /^R15 .*Envoyer la relance.*effet atteignable/],
  ['R17 AI Agent v1 (retiré en 3.0)', muter((w) => { noeud(w, 'Rédiger la relance').typeVersion = 1.9 }), /^R17 .*AI Agent/],
  ['R18 passthroughBinaryImages laissé à vrai', muter((w) => { noeud(w, 'Rédiger la relance').parameters.options.passthroughBinaryImages = true }), /^R18 .*passthroughBinaryImages/],
  ['R18 maxIterations non borné', muter((w) => { delete noeud(w, 'Rédiger la relance').parameters.options.maxIterations }), /^R18 .*maxIterations/],
  ['R18 parseur débranché', muter((w) => { delete w.connections['Schéma du message'] }), /^R18 .*Structured Output Parser/],
  ['R18 parseur en exemple JSON', muter((w) => { noeud(w, 'Schéma du message').parameters.schemaType = 'fromJson' }), /^R18 .*JSON Schema/],
  ['R18 autoFix activé', muter((w) => { noeud(w, 'Schéma du message').parameters.autoFix = true }), /^R18 .*autoFix/],
  ['R18 sortie du modèle sans revalidation en Code', muter((w) => { w.connections['Rédiger la relance'].main = [[lien('Porte simulation')]]; w.nodes = w.nodes.filter((n) => n.name !== 'Revalider le message'); delete w.connections['Revalider le message'] }), /^R18 .*revalidée/],
  ['R20 envoi du texte du modèle déclaré sans pied et sans mention', muter((w) => { const n = noeud(w, 'Envoyer la relance'); n.notes = 'pied: aucun'; n.parameters.text = '={{ $json.texte }}' }), /^R20 .*Envoyer la relance/],
  ['R4 mention ôtée d’un envoi qui la déclare', muter((w) => { noeud(w, 'Envoyer la relance').parameters.text = '={{ $json.texte }}' }), /^R4 .*Envoyer la relance.*absent/],
]
const MUTANTS_PARENT = [
  ['R11 parent appelable par tout workflow (any)', muter((w) => { w.settings.callerPolicy = 'any' }), /^R11 .*jamais any/],
  ['R11 politique d’appel absente', muter((w) => { delete w.settings.callerPolicy }), /^R11 /],
  ['R14 filtre organisation retiré du parent', muter((w) => { const q = noeud(w, 'Lire la configuration').parameters.queryParameters; q.parameters = q.parameters.filter((x) => x.name !== 'organisation_id') }), /^R14 /],
  ['R17 sous-workflow en source parameter (JSON collé)', muter((w) => { const p = noeud(w, 'Appeler la relance').parameters; p.source = 'parameter'; p.workflowJson = '{}' }), /^R17 .*source parameter/],
  ['R17 sous-workflow désigné par une expression', muter((w) => { noeud(w, 'Appeler la relance').parameters.workflowId = '={{ $json.enfant }}' }), /^R17 .*identifiant fixe/],
  ['R8 chat_id écrit en dur dans un nœud Telegram', muter((w) => { w.nodes.push(telegram('@canal_exemple')); w.connections['Bilan'] = { main: [[lien('Alerter Benj')]] } }), /^R8 .*chatId/],
  ['R13 succès sauvés sur le parent', muter((w) => { w.settings.saveDataSuccessExecution = 'all' }), /^R13 /],
]

// Les mutants des gabarits outillés (03/11, prompt 6, OUTILLAGE.md § 8), sur l'export fictif gabarit-exemple-outils.
const outilAgent = (w, nom, type, parameters, notes) => { w.nodes.push({ id: nom, name: nom, type, typeVersion: 1, position: [0, 0], parameters, ...(notes ? { notes } : {}) }); w.connections[nom] = { ai_tool: [[{ node: 'Rédacteur', type: 'ai_tool', index: 0 }]] } }
const MUTANTS_GABARIT = [
  ['R15 l’agent IA atteint par la sortie « vrai » (simulation)', muter((w) => { w.connections['Porte simulation'].main = [[lien('Effets prévus'), lien('Rédacteur')], []] }), /^R15 .*Rédacteur.*effet atteignable/],
  ['R15 l’agent IA branché avant la porte', muter((w) => { w.connections['Relire la configuration'].main[0].push(lien('Rédacteur')) }), /^R15 .*Rédacteur.*effet atteignable/],
  ['R15 le brouillon Gmail posé avant la porte', muter((w) => { w.connections['Préparer'].main[0].push(lien('Brouillon Gmail')) }), /^R15 .*Brouillon Gmail.*effet atteignable/],
  ['R15 un rendez-vous posé dans l’Agenda sans porte', muter((w) => { w.nodes.push({ id: 'rv', name: 'Poser le rendez-vous', type: 'n8n-nodes-base.googleCalendar', typeVersion: 1.3, position: [0, 0], parameters: { resource: 'event', operation: 'create' } }); w.connections['Préparer'].main[0].push(lien('Poser le rendez-vous')) }), /^R15 .*Poser le rendez-vous.*effet atteignable/],
  ['R15 un outil sans opération (celle par défaut écrit) sans porte', muter((w) => { w.nodes.push({ id: 'sh', name: 'Classeur', type: 'n8n-nodes-base.googleSheets', typeVersion: 4.7, position: [0, 0], parameters: {} }); w.connections['Préparer'].main[0].push(lien('Classeur')) }), /^R15 .*Classeur.*effet atteignable/],
  ['R21 identifiant Gmail branché dans le gabarit', muter((w) => { noeud(w, 'Brouillon Gmail').credentials = { gmailOAuth2: { id: 'IdentifiantFictif09', name: 'Gmail du client' } } }), /^R21 .*Brouillon Gmail/],
  ['R21 identifiant du modèle branché dans le gabarit', muter((w) => { noeud(w, 'Claude').credentials = { anthropicApi: { id: 'IdentifiantFictif08', name: 'Anthropic' } } }), /^R21 .*Claude/],
  ['R21 identifiant sur un nœud HTTP qui ne vise pas Supabase', muter((w) => { w.nodes.push({ id: 'ig', name: 'Lire Instagram', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [0, 0], credentials: { facebookGraphApi: { id: 'IdentifiantFictif07', name: 'Meta du client' } }, parameters: { method: 'GET', url: 'https://graph.facebook.com/v21.0/me/conversations', options: {} } }); w.connections['Préparer'].main[0].push(lien('Lire Instagram')) }), /^R21 .*Lire Instagram/],
  ['R22 déclencheur Telegram (webhook)', muter((w) => { w.nodes.push({ id: 'tt', name: 'Message Telegram', type: 'n8n-nodes-base.telegramTrigger', typeVersion: 1.2, position: [0, 0], parameters: { updates: ['message'] } }); w.connections['Message Telegram'] = { main: [[lien('Préparer')]] } }), /^R22 .*Message Telegram/],
  ['R22 webhook générique', muter((w) => { w.nodes.push({ id: 'wh', name: 'Entrée publique', type: 'n8n-nodes-base.webhook', typeVersion: 2, position: [0, 0], parameters: { path: 'exemple' } }); w.connections['Entrée publique'] = { main: [[lien('Préparer')]] } }), /^R22 .*Entrée publique/],
  ['R22 Facebook Lead Ads en webhook (à lire par l’API Graph)', muter((w) => { w.nodes.push({ id: 'fl', name: 'Nouveau lead', type: 'n8n-nodes-base.facebookLeadAdsTrigger', typeVersion: 1, position: [0, 0], parameters: {} }); w.connections['Nouveau lead'] = { main: [[lien('Préparer')]] } }), /^R22 .*Nouveau lead/],
  ['R23 outil d’agent qui envoie (Gmail send)', muter((w) => { Object.assign(noeud(w, 'Lire le fil').parameters, { resource: 'message', operation: 'send' }) }), /^R23 .*Lire le fil.*écrit ou envoie/],
  ['R23 outil d’agent sans opération (envoi par défaut)', muter((w) => { delete noeud(w, 'Lire le fil').parameters.operation }), /^R23 .*Lire le fil.*écrit ou envoie/],
  ['R23 outil Agenda qui pose un rendez-vous', muter((w) => { outilAgent(w, 'Poser en outil', 'n8n-nodes-base.googleCalendarTool', { resource: 'event', operation: 'create' }) }), /^R23 .*Poser en outil.*écrit ou envoie/],
  ['R23 validation humaine native hors Entreprise', muter((w) => { outilAgent(w, 'Demander l’accord', 'n8n-nodes-base.gmailHitlTool', { operation: 'sendAndWait' }) }), /^R23 .*validation humaine/],
  ['R23 outil de code branché sur l’agent', muter((w) => { outilAgent(w, 'Code libre', '@n8n/n8n-nodes-langchain.toolCode', { jsCode: 'return 1' }) }), /^R23 .*non admis/],
  ['R23 outil HTTP en POST', muter((w) => { outilAgent(w, 'Appel libre', '@n8n/n8n-nodes-langchain.toolHttpRequest', { method: 'POST', url: 'https://graph.facebook.com/v21.0/me/messages' }) }), /^R23 .*HTTP en POST/],
  ['R23 sous-workflow en outil sans « outil: lecture »', muter((w) => { delete noeud(w, 'Trier la demande').notes }), /^R23 .*outil: lecture/],
  ['R20 brouillon en aval du modèle sans mention', muter((w) => { const n = noeud(w, 'Brouillon Gmail'); n.notes = 'pied: aucun'; n.parameters.message = '={{ $json.reponse }}' }), /^R20 .*Brouillon Gmail/],
  ['R18 parseur structuré débranché de l’agent', muter((w) => { delete w.connections['Schéma de la réponse'] }), /^R18 .*Structured Output Parser/],
  ['R7 API hors de la liste des hôtes des gabarits', muter((w) => { w.nodes.push({ id: 'hx', name: 'API inconnue', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.2, position: [0, 0], parameters: { method: 'GET', url: 'https://api.exemple.invalid/v1/x', options: {} } }); w.connections['Préparer'].main[0].push(lien('API inconnue')) }), /^R7 .*hôte non permis/],
  ['famille : le gabarit renommé presti-* perd ses outils (R5)', muter((w) => { w.name = 'presti-exemple-outils' }), /^R5 .*Nouvel e-mail.*hors liste blanche/],
]

// ─── Lancement ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
function deplier(c) {
  if (!existsSync(c) || !statSync(c).isDirectory()) return [c]
  return readdirSync(c, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap((d) =>
    d.isDirectory() ? deplier(path.join(c, d.name)) : d.name.endsWith('.workflow.json') ? [path.join(c, d.name)] : [])
}
const chemins = (args.length ? args : PAR_DEFAUT).map((c) => path.resolve(RACINE, c)).flatMap(deplier)
let echecs = 0
const lire = (c) => { try { return JSON.parse(readFileSync(c, 'utf8')) } catch (err) { return { illisible: err.message } } }
// Le registre des empreintes des nœuds Code (R19) : `empreintes-code.json`, dans le dossier de l'export.
const registreDe = (c) => { const f = path.join(path.dirname(c), 'empreintes-code.json'); if (!existsSync(f)) return {}; const r = lire(f); return r.illisible ? {} : r }
const exports = chemins.map((c) => [c, lire(c), registreDe(c)])
if (!exports.length) { console.log('✗ aucun export à juger'); echecs++ }
for (const [c, wf, reg] of exports) {
  const e = wf.illisible ? [`export illisible : ${wf.illisible}`] : verifier(wf, reg)
  const w = wf.workflow ?? wf
  const fam = w.nodes ? famille(w) : '?'
  console.log(`${e.length ? '✗' : '✓'} ${path.relative(RACINE, c)} (${w.name ?? '?'}, famille ${fam}) : ${e.length ? e.length + ' manquement(s)' : fam === 'c4' ? 'R1 à R7 tenues' : 'R1 à R23 tenues'}`)
  for (const m of e) console.log(`    ✗ ${m}`)
  if (e.length) echecs++
}
// Le fictif doit passer : une garde rouge sur tout ne prouverait rien.
const eFictif = verifier(FICTIF)
console.log(`${eFictif.length ? '✗' : '✓'} workflow d'envoi fictif (4 pieds, lecture au moment d'envoyer) : ${eFictif.length ? eFictif.join(' ; ') : 'passe la garde'}`)
if (eFictif.length) echecs++
// Les mutants : sur l'export de presti-detecteurs (le premier vert parmi ceux jugés, sinon celui du lot L12), sur le fictif d'envoi, puis sur
// les trois exports fictifs des familles neuves (toujours lus dans scripts/fixtures/n8n-specs-qa/, avec leur registre).
const cheminDet = path.resolve(RACINE, DETECTEURS)
const base = exports.find(([, w, r]) => (w.workflow ?? w).name === 'presti-detecteurs' && !verifier(w, r).length)?.[1] ?? lire(cheminDet)
const fictif = (n) => { const c = path.resolve(RACINE, `${DOSSIER_FICTIFS}/${n}.workflow.json`); return [lire(c), registreDe(c)] }
const [lib, regLib] = fictif('lib-exemple-executer')
const [relance, regRelance] = fictif('ent-exemple-relance')
const [parent, regParent] = fictif('ent-exemple-parent')
const [gabarit, regGabarit] = fictif('gabarit-exemple-outils')
const LOTS = [
  ['presti-detecteurs', base, {}, MUTANTS_DETECTEURS], ['fictif', FICTIF, {}, MUTANTS_FICTIF],
  ['lib-exemple-executer', lib, regLib, MUTANTS_LIB], ['ent-exemple-relance', relance, regRelance, MUTANTS_RELANCE], ['ent-exemple-parent', parent, regParent, MUTANTS_PARENT],
  ['gabarit-exemple-outils', gabarit, regGabarit, MUTANTS_GABARIT],
]
let verts = 0, total = 0
for (const [lot, wf, reg, liste] of LOTS) {
  if (wf.illisible || verifier(wf, reg).length) { console.log(`  ✗ mutants sur ${lot} : la base n'est pas verte, ils ne prouveraient rien`); echecs++; continue }
  for (const [titre, f, attendu] of liste) {
    total++
    let e
    try { e = verifier(f(wf), reg) } catch (err) { e = []; console.log(`  ✗ mutant « ${titre} » inapplicable : ${err.message}`) }
    const bon = e.filter((m) => attendu.test(m))
    console.log(`  ${bon.length ? '✓' : '✗'} mutant « ${titre} » (${lot}) ${bon.length ? 'fait rougir la garde' : 'NE FAIT PAS rougir la garde pour sa raison'}\n      → ${(bon[0] ?? e[0] ?? 'aucun manquement').slice(0, 180)}`)
    if (!bon.length) verts++
  }
}
console.log(`n8n-specs-qa : ${exports.length} export(s), ${total} mutants (${LOTS.map(([l, , , m]) => `${m.length} sur ${l}`).join(', ')})`)
if (echecs || verts) { if (verts) console.log(`  ✗ ${verts} mutant(s) laissent la garde verte`); console.log('ÉCHEC'); process.exit(1) }
console.log('OK')
