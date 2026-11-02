// GARDE COMMUNE de tout export de workflow n8n de Presti (chantier 4, lot L12, tâche 032-019). Hors ligne : aucun réseau, aucune base,
// aucun modèle. Elle juge un ou plusieurs exports (le JSON rendu par le MCP `get_workflow_details`, ou son objet `workflow`) contre les
// « Règles communes à tout workflow n8n du chantier » (plans/011-cadrage-01-11/chantier-4-assistant-plan.md, §0 bis, l.127-158 ; rang 26,
// l.108) et la règle n8n-first (.claude/rules/architecture-outils.md) :
//   R1  inactif : `active: false`, aucune version publiée (« Mise en service », §0 bis) ;
//   R2  aucun secret dans l'export : motifs de scripts/garde-commit.mjs:16-26, jeton porteur, champ `data` d'un identifiant ;
//   R3  une branche d'erreur (rang 26) : un Error Trigger relié à au moins un nœud, ou `settings.errorWorkflow` = un identifiant nu ;
//   R4  chaque nœud d'envoi DÉCLARE son pied dans ses notes (`pied: mention | PIED_AUTOMATIQUE | PIED_APRES | aucun`) et porte ce pied-là,
//       et aucun autre : la mention d'IA (lib/mentionAssistant.ts:14-17) pour un texte du modèle envoyé au nom d'un artisan sans sa relecture,
//       PIED_AUTOMATIQUE (lib/relancesImpayes.ts:62) pour un rappel d'impayé, PIED_APRES (lib/apresChantier.ts:51) pour l'après-chantier,
//       rien pour un texte fixe ou un message de Presti. Jamais « Presti » dans un envoi au nom d'un artisan (marque blanche) ;
//   R5  lectures GET seulement : HTTP Request en GET, sans corps ; Supabase en get/getAll ; aucun type de nœud hors liste blanche ;
//   R6  identifiants nommés : chaque identifiant d'un nœud = exactement `{ id, name }`, deux textes non vides, jamais une expression ;
//   R7  ce que n8n lit (§0 bis) : hôte écrit en dur et permis ; `select=` présent, sans `*`, sans jointure, sans alias, sans colonne qui
//       contient nom, email, contact, adresse, message, contenu ou texte. Seule exception (§0 bis) : une lecture faite AU MOMENT d'envoyer,
//       qui le déclare dans ses notes (`lecture-pour-envoi: <nœud d'envoi>`) et alimente ce nœud d'envoi.
// Elle prouve qu'elle sait rougir : chaque MUTANT (sur l'export de presti-detecteurs et sur un workflow d'envoi FICTIF construit ici) doit
// la faire échouer pour sa raison. Elle sert aussi à 032-013 et 032-014 : `node … scripts/n8n-specs-qa.mjs <export.json> [<export.json>…]`.
//
// Lancement (sans argument : l'export de presti-detecteurs du lot L12) :
//   node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/n8n-specs-qa.mjs [exports…]
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PIED_AUTOMATIQUE } from '../lib/relancesImpayes.ts'
import { PIED_APRES } from '../lib/apresChantier.ts'
import { mentionAssistant } from '../lib/mentionAssistant.ts'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PAR_DEFAUT = ['.orchestre/preuves/032-019/presti-detecteurs.workflow.json']

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
// Les hôtes qu'une lecture HTTP peut joindre : l'API REST du projet Supabase (architecture-outils.md, « Supabase »).
const HOTES_PERMIS = new Set(['gorcdvmueakcncsmrouo.supabase.co'])
const INTERDIT = /nom|e-?mail|contact|adresse|message|contenu|texte/i
// Motifs de scripts/garde-commit.mjs:16-26 (formats de clés), plus un jeton porteur et une clé privée.
const SECRETS = [
  /sk_live_[A-Za-z0-9]{8,}/, /rk_live_[A-Za-z0-9]{8,}/, /sk-ant-[A-Za-z0-9_-]{12,}/, /sb_secret_[A-Za-z0-9_-]{12,}/,
  /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{20,}/, /\bBearer\s+[A-Za-z0-9._-]{20,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
]
const ID_NU = /^[A-Za-z0-9_-]{6,64}$/

const texteDe = (o) => JSON.stringify(o ?? {})
const piedDeclare = (n) => { const m = /^\s*pied\s*:\s*(\S+)\s*$/m.exec(String(n.notes ?? '')); return m ? m[1] : null }
const lecturePourEnvoi = (n) => { const m = /^\s*lecture-pour-envoi\s*:\s*(.+?)\s*$/m.exec(String(n.notes ?? '')); return m ? m[1] : null }
const sorties = (wf, nom) => Object.values(wf.connections?.[nom] ?? {}).flat(2).filter(Boolean).map((l) => l.node)
function atteint(wf, de, vers) {
  const vus = new Set(), file = [de]
  while (file.length) { const x = file.shift(); if (x === vers) return true; if (vus.has(x)) continue; vus.add(x); file.push(...sorties(wf, x)) }
  return false
}

// ─── La garde ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function verifier(brut) {
  const e = []
  const wf = brut && brut.workflow && Array.isArray(brut.workflow.nodes) ? brut.workflow : brut
  const ko = (regle, m) => e.push(`${regle} ${m}`)
  if (!wf || !Array.isArray(wf.nodes)) return ['export illisible : aucun tableau `nodes`']
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
    // R5 : types
    if (!TYPES_PERMIS.has(n.type)) ko('R5', `${n.name} : type de nœud hors liste blanche (${n.type})`)
    // R6 : identifiants
    for (const [genre, c] of Object.entries(n.credentials ?? {})) {
      const nom = c && typeof c === 'object' ? c.name : null
      if (!c || typeof c !== 'object' || Object.keys(c).sort().join(',') !== 'id,name' || typeof c.id !== 'string' || !c.id || typeof nom !== 'string' || !nom.trim()
        || String(c.id).startsWith('=') || String(nom).startsWith('=')) ko('R6', `${n.name} : identifiant ${genre} non nommé ou hors forme { id, name } (${texteDe(c).slice(0, 60)})`)
    }
    // R5 : lectures seulement
    const p = n.parameters ?? {}
    if (n.type === 'n8n-nodes-base.supabase' && !['get', 'getAll'].includes(p.operation)) ko('R5', `${n.name} : Supabase en ${p.operation} (get ou getAll seulement)`)
    if (n.type === 'n8n-nodes-base.httpRequest') {
      const methode = String(p.method ?? 'GET').toUpperCase()
      if (methode !== 'GET') ko('R5', `${n.name} : HTTP ${methode} (lectures GET seulement)`)
      if (p.sendBody) ko('R5', `${n.name} : corps de requête interdit`)
      // R7 : hôte et colonnes
      let hote = null
      if (typeof p.url !== 'string' || p.url.includes('{{') || p.url.startsWith('=')) ko('R7', `${n.name} : adresse calculée (expression) : l'hôte doit être écrit en dur`)
      else { try { const u = new URL(p.url); hote = u.host; if (u.protocol !== 'https:') ko('R7', `${n.name} : https attendu`) } catch { ko('R7', `${n.name} : adresse illisible`) } }
      if (hote && !HOTES_PERMIS.has(hote)) ko('R7', `${n.name} : hôte non permis (${hote})`)
      const params = p.queryParameters?.parameters ?? []
      const select = params.filter((q) => q?.name === 'select')
      if (hote && select.length !== 1) ko('R7', `${n.name} : un seul select= attendu (aucune lecture de toutes les colonnes)`)
      const exception = lecturePourEnvoi(n)
      if (exception && !(noms.has(exception) && TYPES_ENVOI.has(wf.nodes.find((x) => x.name === exception)?.type) && atteint(wf, n.name, exception))) ko('R7', `${n.name} : « lecture-pour-envoi » vers ${exception}, qui n'est pas un nœud d'envoi alimenté par cette lecture`)
      for (const s of select) {
        const v = String(s.value ?? '')
        if (/[*()]/.test(v) || v.includes(':')) ko('R7', `${n.name} : select= avec *, jointure ou alias (${v.slice(0, 80)})`)
        for (const col of v.split(',').map((c) => c.trim())) if (INTERDIT.test(col) && !exception) ko('R7', `${n.name} : colonne interdite lue (${col})`)
      }
    }
    // R4 : pieds
    if (TYPES_ENVOI.has(n.type)) {
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
  return e
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
const muter = (f) => (wf) => { const m = copie(wf); f(m); return m }
const noeud = (wf, nom) => { const n = wf.nodes.find((x) => x.name === nom); if (!n) throw new Error(`nœud absent : ${nom}`); return n }
// Une clé fictive, assemblée ici pour que ce fichier ne porte aucun motif de secret (scripts/garde-commit.mjs).
const CLE_FICTIVE = 'sb_' + 'secret_' + 'x'.repeat(24)
const MUTANTS_DETECTEURS = [
  ['workflow actif', muter((w) => { w.active = true }), /^R1 /],
  ['version publiée', muter((w) => { w.activeVersionId = 'v1' }), /^R1 /],
  ['branche d’erreur ôtée (rang 26)', muter((w) => { w.nodes = w.nodes.filter((n) => n.type !== 'n8n-nodes-base.errorTrigger') }), /^R3 /],
  ['Error Trigger relié à rien', muter((w) => { for (const n of w.nodes) if (n.type === 'n8n-nodes-base.errorTrigger') delete w.connections[n.name] }), /^R3 /],
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

// ─── Lancement ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const chemins = (args.length ? args : PAR_DEFAUT).map((c) => path.resolve(RACINE, c))
let echecs = 0
const lire = (c) => { try { return JSON.parse(readFileSync(c, 'utf8')) } catch (err) { return { illisible: err.message } } }
const exports = chemins.map((c) => [c, lire(c)])
for (const [c, wf] of exports) {
  const e = wf.illisible ? [`export illisible : ${wf.illisible}`] : verifier(wf)
  const nom = (wf.workflow ?? wf).name ?? '?'
  console.log(`${e.length ? '✗' : '✓'} ${path.relative(RACINE, c)} (${nom}) : ${e.length ? e.length + ' manquement(s)' : 'R1 à R7 tenues'}`)
  for (const m of e) console.log(`    ✗ ${m}`)
  if (e.length) echecs++
}
// Le fictif doit passer : une garde rouge sur tout ne prouverait rien.
const eFictif = verifier(FICTIF)
console.log(`${eFictif.length ? '✗' : '✓'} workflow d'envoi fictif (4 pieds, lecture au moment d'envoyer) : ${eFictif.length ? eFictif.join(' ; ') : 'passe la garde'}`)
if (eFictif.length) echecs++
// Les mutants : sur l'export de presti-detecteurs (le premier jugé, ou celui du lot L12), puis sur le fictif.
const base = exports.find(([, w]) => (w.workflow ?? w).name === 'presti-detecteurs')?.[1] ?? lire(path.resolve(RACINE, PAR_DEFAUT[0]))
let verts = 0, total = 0
for (const [lot, wf, liste] of [['presti-detecteurs', base, MUTANTS_DETECTEURS], ['fictif', FICTIF, MUTANTS_FICTIF]]) {
  if (verifier(wf).length) { console.log(`  ✗ mutants sur ${lot} : la base n'est pas verte, ils ne prouveraient rien`); echecs++; continue }
  for (const [titre, f, attendu] of liste) {
    total++
    let e
    try { e = verifier(f(wf)) } catch (err) { e = []; console.log(`  ✗ mutant « ${titre} » inapplicable : ${err.message}`) }
    const bon = e.filter((m) => attendu.test(m))
    console.log(`  ${bon.length ? '✓' : '✗'} mutant « ${titre} » (${lot}) ${bon.length ? 'fait rougir la garde' : 'NE FAIT PAS rougir la garde pour sa raison'}\n      → ${(bon[0] ?? e[0] ?? 'aucun manquement').slice(0, 180)}`)
    if (!bon.length) verts++
  }
}
console.log(`n8n-specs-qa : ${exports.length} export(s), ${total} mutants (${MUTANTS_DETECTEURS.length} sur presti-detecteurs, ${MUTANTS_FICTIF.length} sur le fictif)`)
if (echecs || verts) { if (verts) console.log(`  ✗ ${verts} mutant(s) laissent la garde verte`); console.log('ÉCHEC'); process.exit(1) }
console.log('OK')
