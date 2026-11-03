// JUGE du catalogue de gabarits OUTILLÉS de l'Entreprise sur mesure, seconde moitié (tâche 036-018 ; prompt 6, OUTILLAGE.md § 7, lignes 5 à 9) :
// gabarit-ent-operations, -administratif, -finance, -apres-vente, -direction. HORS LIGNE : aucun réseau, aucune base, aucun modèle, aucun n8n.
// Il lit les exports `.workflow.json` du dossier de preuve (par défaut .orchestre/preuves/036-018) et leur registre `empreintes-code.json`.
//
// TROIS ÉTAGES (même méthode que scripts/gabarits-entreprise-qa.mjs, 036-016) :
//   1. STRUCTURE — les outils du § 7 sont présents ; agents conformes (modèle Claude, UN parseur, outils en lecture seule notés, aucun montant ni date dans
//      le schéma) ; aucun identifiant, aucun webhook ; chaque lecture et écriture de la base porte l'organisation ; jamais « Presti » dans ce que reçoit un
//      client ; la mention de l'assistant en pied ; AUCUNE écriture dans la banque ni la compta (Qonto, Pennylane, QuickBooks, Xero, Stripe : lecture seule).
//   2. REJEU — les nœuds Code des exports sont REJOUÉS sur des essais (données « Exemple. », horloge figée au 03/11/2026) dans un bac à sable `node:vm` :
//      une attestation qui expire donne une relance prévue · un paiement lu donne un impayé arrêté · un avis à 1 étoile donne une carte · un rapport du
//      lundi aux chiffres du code · une autre organisation ne donne rien (et d'autres, voir plus bas).
//   3. MUTANTS — chaque faute DOIT faire rougir le juge pour sa raison : une écriture dans la banque ou la compta, un montant du modèle, un avis négatif
//      publié, une relance de document sans destinataire connu, une organisation lue sans filtre, un identifiant branché, un outil d'agent qui écrit,
//      « Presti » dans un message, le nœud Agenda retiré (et d'autres).
//   node scripts/gabarits-entreprise-2-qa.mjs [dossier]
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOSSIER = path.resolve(RACINE, process.argv.slice(2).find((a) => !a.startsWith('--')) ?? '.orchestre/preuves/036-018')
const NOMS = ['gabarit-ent-operations', 'gabarit-ent-administratif', 'gabarit-ent-finance', 'gabarit-ent-apres-vente', 'gabarit-ent-direction']
const copie = (o) => JSON.parse(JSON.stringify(o))
const B = (t) => `n8n-nodes-base.${t}`
const AROBASE = String.fromCharCode(64)

// La mention d'IA : relue dans le code du produit, jamais recopiée de mémoire (lib/mentionAssistant.ts).
const MENTION = (() => {
  const src = readFileSync(path.join(RACINE, 'lib/mentionAssistant.ts'), 'utf8')
  const m = /return `(Message rédigé et envoyé automatiquement par l’assistant)\$\{/.exec(src)
  if (!m) throw new Error('lib/mentionAssistant.ts : la mention a changé de forme, le juge ne sait plus la relire')
  return m[1]
})()

// ─── Ce que chaque gabarit doit porter (OUTILLAGE.md § 7, lignes 5 à 9 ; tâche 036-018) ─────────────────────────────────────────────
const REQUIS = {
  'gabarit-ent-operations': { types: ['googleCalendar', 'microsoftOutlook', 'clickUp', 'mondayCom', 'notion', 'googleDrive', 'microsoftOneDrive', 'googleSheets', 'microsoftExcel', 'slack', 'microsoftTeams', 'googleCalendarTool', 'clickUpTool', 'microsoftOutlookTool', 'googleSheetsTool'].map(B), hotes: [], agents: 1 },
  'gabarit-ent-administratif': { types: ['googleDrive', 'microsoftOneDrive', 'gmail', 'microsoftOutlook', 'googleCalendar', 'googleDocs', 'slack', 'microsoftTeams', 'gmailTool', 'microsoftOutlookTool', 'googleDriveTool', 'googleSheetsTool'].map(B), hotes: [], agents: 2 },
  'gabarit-ent-finance': { types: ['stripe', 'quickbooks', 'xero', 'convertToFile', 'googleDrive', 'microsoftOneDrive', 'gmail', 'microsoftOutlook', 'slack', 'microsoftTeams', 'stripeTool', 'quickbooksTool', 'xeroTool'].map(B), hotes: ['thirdparty.qonto.com', 'app.pennylane.com'], agents: 1 },
  'gabarit-ent-apres-vente': { types: ['googleBusinessProfile', 'zendesk', 'gmail', 'microsoftOutlook', 'slack', 'microsoftTeams', 'googleBusinessProfileTool', 'zendeskTool'].map(B), hotes: ['api.trustpilot.com'], agents: 1 },
  'gabarit-ent-direction': { types: ['slack', 'microsoftTeams', 'googleChat', 'gmail', 'googleDocs', 'googleSheets', 'slackHitlTool', 'microsoftTeamsHitlTool', 'googleSheetsTool', 'googleDriveTool'].map(B), hotes: [], agents: 1 },
}
const TYPES_WEBHOOK = /webhook|formTrigger|chatTrigger|facebookTrigger|telegramTrigger|whatsAppTrigger|calendlyTrigger|typeformTrigger|jotformTrigger|stripeTrigger|hubspotTrigger|sendInBlueTrigger|zendeskTrigger|clickUpTrigger/i
const DECLENCHEURS_PERMIS = new Set([B('scheduleTrigger'), B('errorTrigger'), B('gmailTrigger'), B('microsoftOutlookTrigger'), B('emailReadImap'), B('googleCalendarTrigger'), B('executeWorkflowTrigger')])
const TYPES_ENVOI = new Set([B('gmail'), B('microsoftOutlook'), B('whatsApp'), B('slack'), B('microsoftTeams'), B('googleChat'), B('emailSend'), B('sendInBlue'), B('twilio'), B('telegram')])
const LECTURES = /^(get|getAll|getMany|search|list|lookup|download|read|readRows|availability)$/
const COMPTA_BANQUE = [B('stripe'), B('quickbooks'), B('xero'), B('stripeTool'), B('quickbooksTool'), B('xeroTool')]
const HOTES_COMPTA_BANQUE = /thirdparty\.qonto\.com|app\.pennylane\.com|api\.qonto\.com|quickbooks\.api\.intuit\.com|api\.xero\.com|api\.sage\.com|api\.tiime/i

const aretes = (wf, nom) => Object.entries(wf.connections?.[nom] ?? {}).flatMap(([genre, liste]) => (Array.isArray(liste) ? liste : []).flatMap((s, i) => (Array.isArray(s) ? s : []).filter(Boolean).map((l) => ({ vers: l.node, genre, sortie: i }))))
const hoteDe = (n) => { try { return new URL(String(n.parameters?.url)).host } catch { return '' } }

// ─── 1. STRUCTURE ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function structure(wf) {
  const e = [], ko = (r, m) => e.push(`${r} ${m}`)
  const nom = String(wf.name ?? ''), req = REQUIS[nom]
  if (!req) return [`S0 nom inattendu « ${nom} »`]
  if (wf.active !== false || wf.activeVersionId) ko('S1', 'le gabarit doit être inactif et sans version publiée')
  const noeuds = wf.nodes ?? [], types = new Set(noeuds.map((n) => n.type)), hotes = new Set(noeuds.map(hoteDe).filter(Boolean))
  for (const t of req.types) if (!types.has(t)) ko('S2', `outil absent : ${t}`)
  for (const h of req.hotes) if (!hotes.has(h)) ko('S2', `API absente : ${h}`)
  for (const n of noeuds) if (n.credentials !== undefined) ko('S3', `${n.name} : identifiant branché dans un gabarit (« y a pas besoin de connexion », Benj 03/11)`)
  for (const n of noeuds) if (TYPES_WEBHOOK.test(n.type) || (/Trigger$/.test(n.type) && !DECLENCHEURS_PERMIS.has(n.type))) ko('S4', `${n.name} : déclencheur à webhook (${n.type})`)
  const portes = noeuds.filter((n) => /^\s*porte\s*:\s*simulation\s*$/m.test(String(n.notes ?? '')))
  if (portes.length < 2) ko('S5', `${portes.length} porte(s) « simulation » : deux attendues (devant la relève, devant le modèle et les effets)`)
  for (const p of portes) if (!/!== false/.test(String(p.parameters?.conditions?.conditions?.[0]?.leftValue))) ko('S5', `${p.name} : la porte doit échouer fermée (simulation !== false)`)
  // Agents : un modèle Claude, UN parseur, outils en lecture seule et notés ; ni montant, ni date, ni créneau dans le schéma : le code calcule
  const agents = noeuds.filter((n) => n.type === '@n8n/n8n-nodes-langchain.agent')
  if (agents.length !== req.agents) ko('S6', `${agents.length} agent(s), ${req.agents} attendu(s)`)
  for (const a of agents) {
    const entrants = noeuds.flatMap((n) => aretes(wf, n.name).filter((x) => x.vers === a.name).map((x) => ({ ...x, noeud: n })))
    const modeles = entrants.filter((x) => x.genre === 'ai_languageModel'), parseurs = entrants.filter((x) => x.genre === 'ai_outputParser'), outils = entrants.filter((x) => x.genre === 'ai_tool')
    if (modeles.length !== 1 || modeles[0].noeud.type !== '@n8n/n8n-nodes-langchain.lmChatAnthropic') ko('S6', `${a.name} : un seul modèle Claude attendu`)
    if (parseurs.length !== 1 || parseurs[0].noeud.type !== '@n8n/n8n-nodes-langchain.outputParserStructured') ko('S6', `${a.name} : un seul parseur structuré attendu`)
    if (!outils.length) ko('S6', `${a.name} : aucun outil de lecture branché`)
    for (const o of outils) {
      if (!/^\s*outil\s*:\s*lecture\s*$/m.test(String(o.noeud.notes ?? '')) || String(o.noeud.notes).length < 40) ko('S6', `${o.noeud.name} : un outil d'agent doit déclarer « outil: lecture » et dire ce qu'il lit`)
      const hitl = /HitlTool$/.test(o.noeud.type)
      if (!hitl && o.noeud.type.endsWith('Tool') && o.noeud.type.startsWith('n8n-nodes-base.') && !LECTURES.test(String(o.noeud.parameters?.operation))) ko('S6', `${o.noeud.name} : outil d'agent qui écrit ou envoie (${o.noeud.parameters?.operation}) : l'écriture se fait après la porte`)
    }
    if (a.parameters?.options?.passthroughBinaryImages !== false || !Number.isInteger(a.parameters?.options?.maxIterations)) ko('S6', `${a.name} : images non transmises et itérations bornées attendues`)
    if (/presti/i.test(JSON.stringify(a.parameters))) ko('S9', `${a.name} : le nom de la plateforme est dans l'agent (marque blanche)`)
    if (/montant|prix|total|ttc|score|date|creneau|debut/i.test(String(parseurs[0]?.noeud?.parameters?.inputSchema))) ko('S6', `${a.name} : le schéma du modèle porte un montant, une date ou un créneau : le code calcule`)
  }
  for (const n of noeuds.filter((x) => x.type === B('httpRequest') && /supabase\.co/.test(String(x.parameters?.url)))) {
    const m = String(n.parameters?.method ?? 'GET').toUpperCase()
    const filtres = (n.parameters?.queryParameters?.parameters ?? []).filter((q) => q.name === 'organisation_id')
    if (m === 'POST') { if (!/\borganisation_id\s*:/.test(String(n.parameters?.jsonBody))) ko('S7', `${n.name} : écriture sans la clé organisation_id dans le corps`) }
    else if (filtres.length !== 1 || !/^=?eq\./.test(String(filtres[0].value))) ko('S7', `${n.name} : requête sans filtre organisation (organisation_id=eq.…)`)
    if (m === 'GET' && !/^organisation_id,/.test(String((n.parameters?.queryParameters?.parameters ?? []).find((q) => q.name === 'select')?.value))) ko('S7', `${n.name} : la lecture ne ramène pas organisation_id (le code ne peut pas écarter la ligne d'une autre organisation)`)
  }
  if (noeuds.some((n) => n.type === B('supabase'))) ko('S7', 'nœud Supabase : le filtre ne se lirait pas dans la requête')
  // Marque blanche et mention d'IA
  for (const n of noeuds) {
    const sort = TYPES_ENVOI.has(n.type) && !LECTURES.test(String(n.parameters?.operation))
    const horsEnvoi = /^\s*sortie-client\s*:\s*oui\s*$/m.test(String(n.notes ?? ''))
    const texteModele = /^\s*texte-modele\s*:\s*oui\s*$/m.test(String(n.notes ?? ''))
    if (sort || horsEnvoi || texteModele) {
      const texte = JSON.stringify(n.parameters)
      if (/presti/i.test(texte)) ko('S9', `${n.name} : « Presti » dans un message qui part chez un client (marque blanche)`)
      if (n.parameters?.options?.appendAttribution === true) ko('S9', `${n.name} : la phrase « envoyé avec n8n » serait ajoutée`)
      if (sort && !/^\s*pied\s*:\s*mention\s*$/m.test(String(n.notes ?? ''))) ko('S10', `${n.name} : envoi sans « pied: mention »`)
      if ((sort || texteModele) && !texte.includes(MENTION)) ko('S10', `${n.name} : la mention de l'assistant n'est pas dans le texte envoyé`)
    }
  }
  // AUCUNE écriture dans la banque ni la compta : lecture seule
  for (const n of noeuds) {
    if (COMPTA_BANQUE.includes(n.type) && !LECTURES.test(String(n.parameters?.operation))) ko('S14', `${n.name} : écriture dans la compta ou la banque du client (${n.type} ${n.parameters?.operation}) : lecture seule`)
    if (n.type === B('httpRequest') && HOTES_COMPTA_BANQUE.test(String(n.parameters?.url)) && String(n.parameters?.method ?? 'GET').toUpperCase() !== 'GET') ko('S14', `${n.name} : écriture HTTP dans la banque ou la compta (${hoteDe(n)}) : lecture seule`)
  }
  // L'autonomie est lue en annexe, par type d'action ; les actions sont réservées avant l'effet
  const decideur = noeuds.find((n) => n.name === 'Décider les effets')
  if (!noeuds.some((n) => n.name === 'Lire l’annexe d’autonomie') || !/annexe\[/.test(String(decideur?.parameters?.jsCode))) ko('S12', 'l’autonomie par type d’action n’est pas lue dans l’annexe')
  if (!noeuds.some((n) => n.name === 'Réserver les actions')) ko('S12', 'les actions ne sont pas réservées avant l’effet (idempotence)')
  for (const n of noeuds) if (/Tool$/.test(n.type) || n.type.endsWith('toolWorkflow')) if (String(n.notes ?? '').length < 40) ko('S13', `${n.name} : note d'outil manquante ou trop courte`)
  // Propres à chaque gabarit
  if (nom === 'gabarit-ent-apres-vente') {
    if (!/forcerCarte|, true\);/.test(String(decideur?.parameters?.jsCode)) || !/repondre_avis_negatif/.test(String(decideur?.parameters?.jsCode))) ko('S15', 'l’avis négatif ne passe pas par une carte forcée')
    const lecture = noeuds.find((n) => n.name === 'Lire les conversations Chatwoot')
    if (!lecture || !/eq\.chatwoot/.test(JSON.stringify(lecture.parameters))) ko('S2', 'Chatwoot n’est pas lu par les événements de la plateforme')
  }
  if (nom === 'gabarit-ent-direction') {
    const agent = agents[0]
    const outils = noeuds.flatMap((n) => aretes(wf, n.name).filter((x) => x.vers === agent?.name && x.genre === 'ai_tool').map(() => n.type))
    if (!outils.includes(B('slackHitlTool')) || !outils.includes(B('microsoftTeamsHitlTool'))) ko('S11', 'les outils de validation humaine de n8n (Slack et Teams) ne sont pas branchés sur l’agent')
    const sw = noeuds.filter((n) => n.type === B('slack') && n.parameters?.operation === 'sendAndWait'), te = noeuds.filter((n) => n.type === B('microsoftTeams') && n.parameters?.operation === 'sendAndWait')
    if (!sw.length || !te.length) ko('S11', 'la validation d’équipe (Slack et Teams, envoyer et attendre) est absente')
    if (!noeuds.some((n) => n.name === 'Mode privé ?' && n.type === B('if'))) ko('S16', 'le mode privé (aucun texte vers un modèle externe) est absent')
    if (!/documents_par_modele_externe/.test(String(decideur?.parameters?.jsCode))) ko('S16', 'le compteur de ce qui sort vers un modèle externe est absent')
  }
  if (nom === 'gabarit-ent-finance') {
    if (!noeuds.some((n) => n.type === B('convertToFile'))) ko('S14', 'l’export au comptable doit être un fichier')
  }
  return e
}

// ─── 2. REJEU : un bac à sable pour les nœuds Code, horloge figée ─────────────────────────────────────────────────────────────────
const it = (j) => ({ json: j })
const FIGE = Date.parse('2026-11-03T12:00:00Z') // un mardi
const dateFigee = (ms) => class extends Date { constructor(...a) { if (a.length === 0) super(ms); else super(...a) } static now() { return ms } }
function executer(wf, nom, { entrees = [], noeuds = {}, maintenant = FIGE } = {}) {
  const n = wf.nodes.find((x) => x.name === nom)
  if (!n || n.type !== B('code')) throw new Error(`nœud Code absent : ${nom}`)
  const dollar = (k) => {
    const v = noeuds[k]
    if (v === undefined) return { isExecuted: false, all: () => { throw new Error('nœud non exécuté : ' + k) }, first: () => { throw new Error('nœud non exécuté : ' + k) }, last: () => { throw new Error('nœud non exécuté : ' + k) }, get item() { throw new Error('nœud non exécuté : ' + k) } }
    return { isExecuted: true, all: () => v, first: () => v[0], last: () => v[v.length - 1], item: v[0] }
  }
  const bac = { $: dollar, $input: { all: () => entrees, first: () => entrees[0], last: () => entrees[entrees.length - 1] }, String, Number, Math, JSON, Date: dateFigee(maintenant), Array, Object, Set, Map, Error, RegExp, parseInt, parseFloat, isNaN, Boolean, Intl }
  const fonction = vm.runInNewContext('(function(){' + String(n.parameters.jsCode) + '\n})', bac, { timeout: 3000 })
  return JSON.parse(JSON.stringify(fonction()))
}
const ORG = 'ORG_A', AUTRE = 'ORG_B'
const CONFIG = (extra = {}) => ({ organisation_id: ORG, simulation: true, boite_client: 'gmail', outil_equipe: 'slack', raison_affichee: 'Exemple. Entreprise', agenda_id: 'AGENDA_EXEMPLE', outil_agenda: 'google', outil_projets: 'clickup', outil_dossiers: 'drive', canal_direction: 'slack', canal_alertes: 'CANAL_EXEMPLE', jours_echeance: 30, seuil_avis: 3, validations_requises: 3, delai_annulation_min: 0,
  courriel_comptable: 'comptable' + AROBASE + 'exemple.invalid', courriel_direction: 'direction' + AROBASE + 'exemple.invalid', horaires: { debut: 8, fin: 18 },
  perimetres: { repondre_avis_negatif: 'relation_client', diffuser_equipe: 'direction' }, approbateurs: { relation_client: ['associe'], direction: ['gerant'] }, canaux_validation: { relation_client: 'CANAL_RELATION', direction: 'CANAL_DIRECTION' }, ...extra })
const annexe = (types, niveau = 3, org = ORG) => types.map((t) => it({ organisation_id: org, type_action: t, niveau, plafond_jour: 20 }))
const BASE = (extra = {}, cfg = CONFIG()) => ({ 'Réglages de la copie': [it({ organisation_id: ORG })], 'Lire la configuration': [it(cfg)], 'Lire les actions du jour': [it({})], ...extra })
const signe = (plan) => plan.map((p) => `${p.json.effet}|${p.json.type_action}|${p.json.mode}|${p.json.cle_idempotence}`).sort()
const effets = (plan, e) => plan.filter((p) => p.json.effet === e)
const courrielDe = (x) => x + AROBASE + 'exemple.invalid'
const REL = { 'Réglages de la copie (relève)': [it({ organisation_id: ORG })] }
const JOUR = '2026-11-03', DEMAIN = '2026-11-04'
const dans = (k) => new Date(FIGE + k * 86400000).toISOString().slice(0, 10)
const TOUS = ['planifier_chantier', 'creer_tache_projet', 'creer_dossier', 'import_ligne', 'prevenir_equipe', 'relance_piece', 'echeance_agenda', 'attestation_docs', 'relance_impaye', 'solder_facture', 'facturer_chantier', 'envoyer_facture', 'indicateur_encaissements', 'export_comptable', 'repondre_avis', 'repondre_avis_negatif', 'repondre_ticket', 'proposer_entretien', 'diffuser_direction', 'diffuser_equipe', 'rapport_docs', 'journal_sheets', 'compteur_ia', 'alerte_cout_ia', 'validation_equipe']

function essais(w) {
  const sorties = [], resultats = []
  const essai = (workflow, nom, f) => {
    try { const r = f(); resultats.push({ workflow, nom, ok: r.ok, details: r.details }); sorties.push({ workflow, nom, epingles: r.epingles ?? 'Exemple.', sortie: r.sortie }) }
    catch (err) { resultats.push({ workflow, nom, ok: false, details: `exception : ${err.message}` }) }
  }
  const { 'gabarit-ent-operations': ops, 'gabarit-ent-administratif': adm, 'gabarit-ent-finance': fin, 'gabarit-ent-apres-vente': av, 'gabarit-ent-direction': dir } = w
  const INTERNES = ['deposer_conversation', 'prevenir_equipe', 'indicateur_ads', 'note_interet', 'validation_equipe', 'marquer_evenement', 'indicateur_encaissements', 'compteur_ia', 'import_ligne']
  const sansAuto = (plan) => plan.every((p) => p.json.mode !== 'auto' || INTERNES.includes(p.json.type_action))
  const leve = (f) => { try { f(); return false } catch { return true } }

  // ═════ OPÉRATIONS
  const chaineOps = ({ cfg = CONFIG(), equipes, brut, annexeTypes = ['planifier_chantier', 'creer_tache_projet', 'creer_dossier', 'import_ligne', 'prevenir_equipe'], org = ORG } = {}) => {
    const donnees = brut ?? [
      it({ source: 'plateforme', organisation_id: ORG, chantier_ref: 'c1', libelle_court: 'Exemple. Chantier A', duree_min: 120, competence: 'general' }),
      it({ source: 'plateforme', organisation_id: AUTRE, chantier_ref: 'c-autre', libelle_court: 'Exemple. Chantier d’une autre organisation', duree_min: 60, competence: 'general' }),
      it({ source: 'exemple', genre: 'evenement', ref: 'e1', membre_ref: 'm1', debut: `${DEMAIN}T08:00:00+01:00`, fin: `${DEMAIN}T10:00:00+01:00` }),
      it({ source: 'clickup', id: 't1', name: 'Exemple. Une autre tâche' }),
      it({ source: 'sheets', ref: 'L1', libelle: 'Exemple. Pièce', quantite: 3 }),
      it({ source: 'sheets', ref: 'L2', libelle: '', quantite: -4 }),
    ]
    const norm = executer(ops, 'Normaliser les entrées', { entrees: donnees, noeuds: REL })
    const eq = equipes ?? [it({ organisation_id: ORG, membre_ref: 'm1', libelle_court: 'Exemple. Membre 1', competence: 'general' }), it({ organisation_id: ORG, membre_ref: 'm2', libelle_court: 'Exemple. Membre 2', competence: 'general' }), it({ organisation_id: AUTRE, membre_ref: 'm3', libelle_court: 'Exemple. Autre', competence: 'general' })]
    const prep = executer(ops, 'Préparer le planning', { noeuds: BASE({ 'Normaliser les entrées': norm, 'Lire les équipes': eq }, cfg) })
    const base = (extra = {}) => BASE({ 'Normaliser les entrées': norm, 'Préparer le planning': prep, 'Lire l’annexe d’autonomie': annexe(annexeTypes, 3, org), ...extra }, cfg)
    const rev = (n) => { const e = prep.filter((x) => x.json.genre === 'chantier' && x.json.propositions.length >= 2); return executer(ops, 'Revalider le répartiteur', { entrees: e.map((x) => it({ output: { cle_idempotence: x.json.cle_idempotence, proposition: n, motif: 'Exemple. Le premier libre.' } })), noeuds: { 'Chantiers à répartir': e } }) }
    return { norm, prep, base, rev }
  }
  essai('gabarit-ent-operations', 'le planificateur lit l’agenda réel : le code trouve les créneaux libres de chaque membre, le modèle choisit un numéro, l’agenda reçoit le chantier, avec sa tâche et son dossier', () => {
    const { norm, prep, base, rev } = chaineOps()
    const c1 = prep.find((p) => p.json.ref === 'c1')?.json
    const props = c1?.propositions ?? []
    const ok1 = norm.every((n) => n.json.ref !== 'c-autre') && props.length === 2 && props[0].membre_ref === 'm1' && props[0].debut === `${DEMAIN}T10:00:00` && props[1].membre_ref === 'm2' && props[1].debut === `${DEMAIN}T08:00:00` && props[1].fin === `${DEMAIN}T10:00:00`
    const reel = executer(ops, 'Décider les effets', { noeuds: base({ 'Revalider le répartiteur': rev(1) }) })
    const carteP = reel.filter((p) => p.json.effet === 'carte' && p.json.type_action === 'planifier_chantier')
    const ag = carteP[0]?.json?.charge
    // Prendre un rendez-vous seul est « jamais en automatique » (annexe d’autonomie) : l’agenda ne reçoit le chantier que par une carte approuvée
    const ok2 = carteP.length === 1 && carteP[0].json.pour_effet === 'planifier_google' && carteP[0].json.statut_carte === 'a_valider' && ag.membre_ref === 'm2' && ag.debut === `${DEMAIN}T08:00:00` && ag.agenda_id === 'AGENDA_EXEMPLE' && effets(reel, 'planifier_google').length === 0 && effets(reel, 'tache_clickup').length === 1 && effets(reel, 'dossier_drive').length === 1
    const sim = executer(ops, 'Effets prévus', { noeuds: base() })
    const reel0 = executer(ops, 'Décider les effets', { noeuds: base({ 'Revalider le répartiteur': rev(0) }) })
    const ok3 = JSON.stringify(signe(sim)) === JSON.stringify(signe(reel0)) && sim.every((p) => p.json.simulation === true)
    const ok4 = leve(() => rev(5)) && leve(() => executer(ops, 'Revalider le répartiteur', { entrees: [it({ output: { cle_idempotence: c1.cle_idempotence, proposition: 0, motif: 'Exemple. Écrit par Presti.' } })], noeuds: { 'Chantiers à répartir': prep.filter((x) => x.json.genre === 'chantier') } }))
    return { ok: ok1 && ok2 && ok3 && ok4, details: ok1 && ok2 && ok3 && ok4 ? 'm1 occupé de 8 h à 10 h : proposé à 10 h ; m2 libre : proposé à 8 h (créneaux du code) ; le choix du modèle donne une carte « À valider » pour l’agenda (jamais de rendez-vous pris seul) + tâche + dossier ; plan simulé = plan réel ; un numéro hors liste ou « Presti » est rejeté' : `props ${JSON.stringify(props.map((p) => p.membre_ref + p.debut))} ; ok2 ${ok2} ; ok3 ${ok3} ; ok4 ${ok4}`, sortie: { propositions: props, plan: signe(reel) } }
  })
  essai('gabarit-ent-operations', 'une ligne d’import en anomalie ne s’importe jamais : l’équipe est prévenue ; la tâche déjà connue du projet n’est pas recréée', () => {
    const { base, rev } = chaineOps()
    const plan = executer(ops, 'Décider les effets', { noeuds: base({ 'Revalider le répartiteur': rev(0) }) })
    const imp = effets(plan, 'import_ligne'), infos = plan.filter((p) => p.json.effet === 'carte' && p.json.statut_carte === 'information' && p.json.type_action === 'import_ligne')
    const alerte = effets(plan, 'prevenir_slack')[0]?.json?.texte ?? ''
    const ok1 = imp.length === 1 && imp[0].json.ref === 'L1' && infos.length === 1 && /L2/.test(infos[0].json.resume) && /L2/.test(alerte)
    const c = chaineOps({ brut: [it({ source: 'plateforme', organisation_id: ORG, chantier_ref: 'c1', libelle_court: 'Exemple. Chantier A', duree_min: 120, competence: 'general' }), it({ source: 'clickup', id: 't9', name: 'Exemple. Chantier A' })] })
    const plan2 = executer(ops, 'Décider les effets', { noeuds: c.base({ 'Revalider le répartiteur': c.rev(0) }) })
    const ok2 = effets(plan2, 'tache_clickup').length === 0 && plan2.filter((p) => p.json.type_action === 'planifier_chantier').length === 1
    return { ok: ok1 && ok2, details: ok1 && ok2 ? 'L1 importée, L2 (libellé absent, quantité négative) refusée avec une carte d’information et une alerte ; la tâche déjà dans ClickUp n’est pas recréée' : `import ${imp.length} infos ${infos.length} alerte « ${alerte} » ; tâche ${effets(plan2, 'tache_clickup').length}`, sortie: signe(plan) }
  })
  essai('gabarit-ent-operations', 'une autre organisation ne donne rien : ni chantier, ni membre, ni action automatique', () => {
    const c = chaineOps({ equipes: [it({ organisation_id: AUTRE, membre_ref: 'm3', libelle_court: 'Exemple. Autre', competence: 'general' })] })
    const sansMembre = c.prep.find((p) => p.json.ref === 'c1')?.json?.propositions?.length === 0 && c.norm.every((n) => n.json.ref !== 'c-autre') && !c.prep.some((p) => p.json.ref === 'c-autre')
    const plan = executer(ops, 'Décider les effets', { noeuds: c.base({ 'Revalider le répartiteur': c.rev(0) }) })
    const aucun = !plan.some((p) => p.json.type_action === 'planifier_chantier' && p.json.statut_carte !== 'information') && effets(plan, 'tache_clickup').length === 0 && effets(plan, 'dossier_drive').length === 0
    const autre = chaineOps({ cfg: CONFIG({ organisation_id: AUTRE }), org: AUTRE })
    const planAutre = executer(ops, 'Décider les effets', { noeuds: autre.base({ 'Revalider le répartiteur': autre.rev(0) }, CONFIG({ organisation_id: AUTRE })) })
    const rien = sansAuto(planAutre)
    return { ok: sansMembre && aucun && rien, details: sansMembre && aucun && rien ? 'les membres d’une autre organisation ne reçoivent aucun chantier (aucun créneau, alerte à l’équipe) ; la configuration et l’annexe d’une autre organisation ne donnent aucune action automatique' : `sansMembre ${sansMembre} aucun ${aucun} rien ${rien}`, sortie: signe(plan) }
  })

  // ═════ ADMINISTRATIF
  const chaineAdm = ({ brut, cfg = CONFIG(), relances = [], org = ORG, maintenant = FIGE } = {}) => {
    const donnees = brut ?? [it({ source: 'exemple', genre: 'echeance', ref: 'att-assurance', libelle: 'Exemple. Attestation d’assurance', type_echeance: 'attestation', date_echeance: dans(10), tiers_courriel: courrielDe('assureur') })]
    const norm = executer(adm, 'Normaliser les entrées', { entrees: donnees, noeuds: REL, maintenant })
    const croises = executer(adm, 'Croiser les sources', { noeuds: BASE({ 'Normaliser les entrées': norm, 'Lire les relances faites': relances.length ? relances : [it({})] }, cfg), maintenant })
    const base = (extra = {}) => BASE({ 'Croiser les sources': croises, 'Lire l’annexe d’autonomie': annexe(['relance_piece', 'echeance_agenda', 'attestation_docs', 'prevenir_equipe'], 3, org), ...extra }, cfg)
    const rel = (objets) => executer(adm, 'Revalider les relances', { entrees: objets.map((c) => it({ output: { cle_idempotence: c, objet: 'Exemple. Document attendu', texte: 'Exemple. Bonjour, pourriez-vous nous transmettre le document ?' } })), noeuds: { 'Relances à rédiger': croises.filter((x) => objets.includes(x.json.cle_idempotence)).map((x) => ({ json: x.json })) } })
    return { norm, croises, base, rel, maintenant }
  }
  essai('gabarit-ent-administratif', 'une attestation qui expire donne une relance prévue et une échéance dans l’agenda, au nom du client, une seule fois par palier', () => {
    const { croises, base, rel } = chaineAdm()
    const e = croises.find((x) => x.json.genre === 'echeance')?.json
    const sim = executer(adm, 'Effets prévus', { noeuds: base() })
    const reel = executer(adm, 'Décider les effets', { noeuds: base({ 'Revalider les relances': rel([e.cle_idempotence]), 'Revalider les attestations': [it({})] }) })
    const relance = effets(reel, 'relance_gmail')[0]?.json
    const ok1 = e.proche === true && e.jours === 10 && effets(sim, 'relance_gmail').length === 1 && effets(sim, 'echeance_agenda_google').length === 1 && effets(sim, 'echeance_agenda_google')[0].json.date === dans(10) && relance?.palier === 1 && relance?.destinataire === courrielDe('assureur')
      && JSON.stringify(signe(sim)) === JSON.stringify(signe(reel))
    // trop loin : rien ; expirée : l’échéance et la relance ; trois relances faites : plus de relance ; relance d’hier : pas encore
    const loin = chaineAdm({ brut: [it({ source: 'exemple', genre: 'echeance', ref: 'att-loin', libelle: 'Exemple. Loin', type_echeance: 'attestation', date_echeance: dans(90), tiers_courriel: courrielDe('assureur') })] })
    const expiree = chaineAdm({ brut: [it({ source: 'exemple', genre: 'echeance', ref: 'att-exp', libelle: 'Exemple. Expirée', type_echeance: 'attestation', date_echeance: dans(-4), tiers_courriel: courrielDe('assureur') })] })
    const trois = chaineAdm({ relances: [1, 2, 3].map((k) => it({ organisation_id: ORG, objet_ref: 'att-assurance', type_objet: 'echeance', palier: k, envoyee_le: `${dans(-20 + k)}T08:00:00Z` })) })
    const hier = chaineAdm({ relances: [it({ organisation_id: ORG, objet_ref: 'att-assurance', type_objet: 'echeance', palier: 1, envoyee_le: `${dans(-1)}T08:00:00Z` })] })
    const nbRelances = (c) => effets(executer(adm, 'Effets prévus', { noeuds: c.base() }), 'relance_gmail').length
    const ok2 = nbRelances(loin) === 0 && effets(executer(adm, 'Effets prévus', { noeuds: loin.base() }), 'echeance_agenda_google').length === 0 && nbRelances(expiree) === 1 && nbRelances(trois) === 0 && nbRelances(hier) === 0
    const deja = chaineAdm({ brut: [it({ source: 'exemple', genre: 'echeance', ref: 'att-assurance', libelle: 'Exemple. Attestation d’assurance', type_echeance: 'attestation', date_echeance: dans(10), tiers_courriel: courrielDe('assureur') }), it({ source: 'agenda', id: 'ev1', summary: 'Échéance : Exemple. Attestation d’assurance [att-assurance]' })] })
    const ok3 = effets(executer(adm, 'Effets prévus', { noeuds: deja.base() }), 'echeance_agenda_google').length === 0
    return { ok: ok1 && ok2 && ok3, details: ok1 && ok2 && ok3 ? 'échéance à 10 jours : 1 relance de palier 1 au bon destinataire + 1 événement d’agenda (plan simulé = plan réel) ; à 90 jours rien ; expirée : relancée ; trois relances faites ou une hier : aucune ; échéance déjà dans l’agenda : pas de doublon' : `ok1 ${ok1} (proche ${e.proche}) ; ok2 ${ok2} ; ok3 ${ok3}`, sortie: { simulation: signe(sim), reel: signe(reel) } }
  })
  essai('gabarit-ent-administratif', 'une pièce manquante est relancée à qui doit le document, JAMAIS sans destinataire connu : l’équipe est informée à la place', () => {
    const donnees = [
      it({ source: 'plateforme_piece', organisation_id: ORG, piece_ref: 'kbis', libelle_court: 'Exemple. Extrait', tiers_courriel: courrielDe('tiers1') }),
      it({ source: 'plateforme_piece', organisation_id: ORG, piece_ref: 'rib', libelle_court: 'Exemple. Relevé d’identité', tiers_courriel: courrielDe('tiers2') }),
      it({ source: 'plateforme_piece', organisation_id: ORG, piece_ref: 'urssaf', libelle_court: 'Exemple. Attestation de vigilance', tiers_courriel: null }),
      it({ source: 'plateforme_piece', organisation_id: AUTRE, piece_ref: 'autre', libelle_court: 'Exemple. Pièce d’une autre organisation', tiers_courriel: courrielDe('tiers3') }),
      it({ source: 'drive', id: 'f1', name: 'KBIS-2026.pdf' }),
      it({ source: 'gmail', id: 'm1', Subject: 'Exemple. Votre RIB en pièce jointe' }),
    ]
    const c = chaineAdm({ brut: donnees })
    const manquantes = c.croises.filter((x) => x.json.genre === 'piece' && x.json.manquante).map((x) => x.json.ref).sort()
    const plan = executer(adm, 'Effets prévus', { noeuds: c.base() })
    const relances = effets(plan, 'relance_gmail')
    const sansDest = plan.filter((p) => p.json.effet === 'carte' && p.json.statut_carte === 'information' && /urssaf|vigilance/i.test(p.json.resume))
    const bon = manquantes.join() === 'urssaf' && relances.length === 0 && sansDest.length === 1 && !c.croises.some((x) => x.json.ref === 'autre')
    // Variante : la pièce du RIB est introuvable, une relance part
    const d2 = chaineAdm({ brut: [donnees[1], donnees[2], donnees[4]] })
    const plan2 = executer(adm, 'Effets prévus', { noeuds: d2.base() })
    const r2 = effets(plan2, 'relance_gmail')
    const bon2 = r2.length === 1 && r2[0].json.destinataire === courrielDe('tiers2') && r2.every((r) => !!r.json.destinataire) && plan2.filter((p) => p.json.statut_carte === 'information').length === 1
    return { ok: bon && bon2, details: bon && bon2 ? 'Kbis lu dans le Drive et RIB lu dans un courrier : présents ; seule l’attestation de vigilance manque, sans destinataire connu : aucune relance, une carte d’information ; la pièce introuvable avec un destinataire est relancée ; la pièce d’une autre organisation est ignorée' : `manquantes ${manquantes} relances ${relances.length} sansDest ${sansDest.length} ; r2 ${r2.length}`, sortie: { manquantes, plan: signe(plan), plan2: signe(plan2) } }
  })
  essai('gabarit-ent-administratif', 'une attestation ne dit que les faits du dossier : un nombre inventé, un fait manquant, un prix ou « Presti » sont rejetés', () => {
    const faits = { beneficiaire: 'Exemple. Personne A', date_debut: '2026-10-01', date_fin: '2026-10-31' }
    const entree = it({ genre: 'attestation', cle_idempotence: 'attestation:a1', faits })
    const rev = (corps, titre = 'Exemple. Attestation') => executer(adm, 'Revalider les attestations', { entrees: [it({ output: { cle_idempotence: 'attestation:a1', titre, corps } })], noeuds: { 'Attestations à rédiger': [entree] } })
    const bonCorps = 'Exemple. Nous attestons que Exemple. Personne A a été présent du 2026-10-01 au 2026-10-31.'
    const ok = rev(bonCorps)[0].json.corps === bonCorps
    const refus = leve(() => rev('Exemple. Nous attestons que Exemple. Personne A a été présent du 2026-10-01 au 2026-10-31, soit 45 heures.')) && leve(() => rev('Exemple. Nous attestons que Exemple. Personne A a été présent du 2026-10-01.')) && leve(() => rev(bonCorps + ' Montant : 120 €.')) && leve(() => rev(bonCorps + ' Signé Presti.'))
    return { ok: ok && refus, details: ok && refus ? 'tous les faits présents : accepté ; « 45 heures » inventé, date de fin manquante, prix, « Presti » : rejetés' : `ok ${ok} refus ${refus}`, sortie: { accepte: ok } }
  })
  essai('gabarit-ent-administratif', 'une autre organisation ne donne rien (pièces, échéances, relances, configuration)', () => {
    const donnees = [it({ source: 'plateforme_piece', organisation_id: AUTRE, piece_ref: 'autre', libelle_court: 'Exemple. Autre', tiers_courriel: courrielDe('t') }), it({ source: 'plateforme_echeance', organisation_id: AUTRE, echeance_ref: 'autre-e', libelle_court: 'Exemple. Autre', type_echeance: 'attestation', date_echeance: dans(5), tiers_courriel: courrielDe('t') })]
    const c = chaineAdm({ brut: donnees })
    const rien = c.norm.length === 0 && executer(adm, 'Effets prévus', { noeuds: c.base() }).length === 0
    const propre = chaineAdm({ cfg: CONFIG({ organisation_id: AUTRE }), org: AUTRE })
    const planAutre = executer(adm, 'Effets prévus', { noeuds: propre.base() })
    const aucuneAuto = sansAuto(planAutre)
    return { ok: rien && aucuneAuto, details: rien && aucuneAuto ? 'les lignes d’une autre organisation ne produisent aucune entrée ; sa configuration ne donne aucune action automatique' : `rien ${rien} sansAuto ${aucuneAuto}`, sortie: signe(planAutre) }
  })

  // ═════ FINANCE
  const TARIFS = [it({ organisation_id: ORG, ref_tarif: 'exemple-intervention', libelle_court: 'Exemple. Intervention', prix_ht_centimes: 10000, tva_pct: 20 }), it({ organisation_id: ORG, ref_tarif: 'exemple-fourniture', libelle_court: 'Exemple. Fourniture', prix_ht_centimes: 5000, tva_pct: 20 }), it({ organisation_id: AUTRE, ref_tarif: 'exemple-intervention', libelle_court: 'Exemple. Autre', prix_ht_centimes: 1, tva_pct: 0 })]
  const facture = (ref, total, retard, extra = {}) => it({ source: 'plateforme_facture', organisation_id: ORG, facture_ref: ref, libelle_court: 'Exemple. Client ' + ref, total_ttc_centimes: total, echeance: dans(-retard), statut: 'envoyee', tiers_courriel: courrielDe('client-' + ref), ...extra })
  const chaineFin = ({ brut, cfg = CONFIG(), relances = [], org = ORG, maintenant = FIGE } = {}) => {
    const norm = executer(fin, 'Normaliser les entrées', { entrees: brut, noeuds: REL, maintenant })
    const rap = executer(fin, 'Rapprocher', { noeuds: BASE({ 'Normaliser les entrées': norm, 'Lire les tarifs': TARIFS, 'Lire les relances faites': relances.length ? relances : [it({})] }, cfg), maintenant })
    const base = (extra = {}) => BASE({ Rapprocher: rap, 'Lire l’annexe d’autonomie': annexe(['solder_facture', 'relance_impaye', 'facturer_chantier', 'indicateur_encaissements', 'export_comptable', 'prevenir_equipe'], 3, org), ...extra }, cfg)
    const rel = (clefs, plus = {}) => executer(fin, 'Revalider les relances', { entrees: clefs.map((c) => it({ output: { cle_idempotence: c, objet: 'Exemple. Facture en attente', texte: 'Exemple. Bonjour, sauf erreur de notre part, votre règlement est attendu.', ...plus } })), noeuds: { 'Relances à rédiger': rap.filter((x) => clefs.includes(x.json.cle_idempotence)) } })
    return { norm, rap, base, rel, maintenant }
  }
  essai('gabarit-ent-finance', 'un paiement lu donne un impayé arrêté : la facture soldée n’est plus relancée ; le reste dû est celui du code, pas celui du modèle', () => {
    const brut = [facture('F001', 120000, 10), facture('F002', 60000, 5), facture('F004', 90000, 3, { statut: 'payee', payee_le: dans(-1) }),
      it({ source: 'stripe', id: 'ch_1', paid: true, refunded: false, amount: 60000, amount_refunded: 0, metadata: { facture_ref: 'F002' } }),
      it({ source: 'qonto', transactions: [{ transaction_id: 'q1', side: 'credit', status: 'completed', amount_cents: 20000, reference: 'Virement F001 acompte', label: 'Exemple. Client' }] }),
      facture('F900', 5000, 4, { organisation_id: AUTRE })]
    const c = chaineFin({ brut })
    const f1 = c.rap.find((x) => x.json.facture_ref === 'F001')?.json, f2 = c.rap.find((x) => x.json.facture_ref === 'F002')?.json
    const ok1 = f2?.etat === 'soldee' && f1?.etat === 'en_retard' && f1.paye_centimes === 20000 && f1.reste_centimes === 100000 && !c.rap.some((x) => x.json.facture_ref === 'F900')
    const sim = executer(fin, 'Effets prévus', { noeuds: c.base() })
    const reel = executer(fin, 'Décider les effets', { noeuds: c.base({ 'Revalider les relances': c.rel([f1.cle_idempotence], { montant: '999,99', montant_centimes: 1 }) }) })
    const solde = reel.filter((p) => p.json.effet === 'carte' && p.json.type_action === 'solder_facture'), rel = effets(reel, 'courriel_gmail')
    // Marquer une facture payée est une carte, toujours (annexe : « les gestes du code, toujours des cartes ») ; mais plus AUCUNE relance ne part pour elle
    const ok2 = solde.length === 1 && solde[0].json.pour_effet === 'facture_payee' && solde[0].json.statut_carte === 'a_valider' && solde[0].json.charge.facture_ref === 'F002' && rel.length === 1 && rel[0].json.objet_ref === 'F001' && /Montant restant dû : 1000,00 € TTC \(facture F001\)/.test(rel[0].json.texte) && !/999/.test(rel[0].json.texte)
      && !rel.some((r) => r.json.objet_ref === 'F002') && !reel.some((p) => p.json.charge?.facture_ref === 'F004') && JSON.stringify(signe(sim)) === JSON.stringify(signe(reel))
    const ok3 = effets(reel, 'indicateur')[0]?.json?.indicateur?.encaisse_jour_centimes === 80000
    const ok4 = leve(() => c.rel([f1.cle_idempotence], {}).length && executer(fin, 'Revalider les relances', { entrees: [it({ output: { cle_idempotence: f1.cle_idempotence, objet: 'Exemple. Facture', texte: 'Exemple. Vous devez 1 000 € avant demain.' } })], noeuds: { 'Relances à rédiger': c.rap.filter((x) => x.json.cle_idempotence === f1.cle_idempotence) } }))
    return { ok: ok1 && ok2 && ok3 && ok4, details: ok1 && ok2 && ok3 && ok4 ? 'F002 payée (Stripe) : soldée, relances arrêtées ; F001 payée en partie (Qonto, 200 €) : reste 1 000,00 € calculé par le code (le « 999,99 » du modèle est ignoré) ; F004 déjà payée : rien ; une autre organisation : ignorée ; encaissé du jour 800 € ; un prix écrit par le modèle est rejeté' : `ok1 ${ok1} (${f1?.etat}/${f2?.etat}) ; ok2 ${ok2} ; ok3 ${ok3} ; ok4 ${ok4} ; texte « ${rel[0]?.json?.texte} »`, sortie: { simulation: signe(sim), reel: signe(reel), reste: f1?.reste_centimes } }
  })
  essai('gabarit-ent-finance', 'le facturier « quand c’est fini » : le chantier terminé est chiffré par le code avec le tarif du client ; un tarif manquant ne devient jamais une facture', () => {
    const chantier = (lignes) => it({ source: 'plateforme_chantier', organisation_id: ORG, chantier_ref: 'ch1', libelle_court: 'Exemple. Chantier terminé', lignes, tiers_courriel: courrielDe('client-c') })
    const ok = chaineFin({ brut: [chantier([{ ref_tarif: 'exemple-intervention', quantite: 2 }, { ref_tarif: 'exemple-fourniture', quantite: 1 }])] })
    const plan = executer(fin, 'Effets prévus', { noeuds: ok.base() })
    const carteF = plan.find((p) => p.json.effet === 'carte' && p.json.type_action === 'facturer_chantier')?.json
    const f = carteF?.charge
    const bon = carteF?.pour_effet === 'facture_creer' && carteF.statut_carte === 'a_valider' && f?.total_ht_centimes === 25000 && f.total_tva_centimes === 5000 && f.total_ttc_centimes === 30000 && effets(plan, 'facture_creer').length === 0
    const inconnu = chaineFin({ brut: [chantier([{ ref_tarif: 'inconnue', quantite: 1 }])] })
    const planI = executer(fin, 'Effets prévus', { noeuds: inconnu.base() })
    const estime = !planI.some((p) => p.json.type_action === 'facturer_chantier' && p.json.statut_carte !== 'information') && planI.filter((p) => p.json.effet === 'carte' && p.json.statut_carte === 'information').length === 1
    const vide = chaineFin({ brut: [chantier([])] })
    const sansLigne = !executer(fin, 'Effets prévus', { noeuds: vide.base() }).some((p) => p.json.type_action === 'facturer_chantier' && p.json.statut_carte !== 'information')
    return { ok: bon && estime && sansLigne, details: bon && estime && sansLigne ? '2×100 € + 1×50 € HT = 250 € HT, TVA 50 €, 300 € TTC en centimes entiers (tarif du client) ; tarif inconnu ou aucune ligne : pas de facture, une carte d’information' : `bon ${bon} (${f?.total_ttc_centimes}) estimé ${estime} sansLigne ${sansLigne}`, sortie: { facture: f } }
  })
  essai('gabarit-ent-finance', 'l’export au comptable est un fichier : factures réglées du mois dernier, pas celles que le comptable a déjà, jamais avant le début du mois', () => {
    const maintenant = Date.parse('2026-12-02T09:00:00Z')
    const brut = [facture('F010', 12000, 20, { statut: 'payee', payee_le: '2026-11-12' }), facture('F011', 8000, 20, { statut: 'payee', payee_le: '2026-11-20' }), facture('F012', 5000, 20, { statut: 'payee', payee_le: '2026-10-30' }),
      it({ source: 'pennylane', items: [{ invoice_number: 'F011' }] })]
    const c = chaineFin({ brut, maintenant })
    const plan = executer(fin, 'Effets prévus', { noeuds: c.base(), maintenant })
    const ex = effets(plan, 'export_comptable')[0]?.json
    const bon = ex?.mois === '2026-11' && ex.lignes.length === 1 && ex.lignes[0].facture_ref === 'F010' && ex.destinataire === courrielDe('comptable')
    const csv = executer(fin, 'Fabriquer le CSV', { noeuds: { 'Quel effet ?': [it({ mois: '2026-11', lignes: [{ facture_ref: 'F010', total_ttc_centimes: 12000, payee_le: '2026-11-12' }] })] } })
    const bonCsv = csv.length === 1 && csv[0].json.numero === 'F010' && csv[0].json.total_ttc === '120,00'
    const tard = chaineFin({ brut, maintenant: Date.parse('2026-12-15T09:00:00Z') })
    const pasDuTout = effets(executer(fin, 'Effets prévus', { noeuds: tard.base(), maintenant: Date.parse('2026-12-15T09:00:00Z') }), 'export_comptable').length === 0
    return { ok: bon && bonCsv && pasDuTout, details: bon && bonCsv && pasDuTout ? 'le 2 décembre : une ligne (F010) ; F011 est déjà chez le comptable, F012 est d’octobre ; le CSV porte 120,00 calculé par le code ; le 15 décembre : pas d’export' : `bon ${bon} csv ${bonCsv} tard ${pasDuTout}`, sortie: { export: ex, csv } }
  })
  essai('gabarit-ent-finance', 'une autre organisation ne donne rien (factures, tarifs, configuration)', () => {
    const c = chaineFin({ brut: [facture('F900', 5000, 4, { organisation_id: AUTRE }), it({ source: 'plateforme_chantier', organisation_id: AUTRE, chantier_ref: 'chx', libelle_court: 'Exemple. Autre', lignes: [{ ref_tarif: 'exemple-intervention', quantite: 1 }] })] })
    const plan = executer(fin, 'Effets prévus', { noeuds: c.base() })
    const rien = !plan.some((p) => ['facture_payee', 'courriel_gmail', 'facture_creer', 'export_comptable'].includes(p.json.effet) || ['solder_facture', 'facturer_chantier'].includes(p.json.type_action))
    const autre = chaineFin({ brut: [facture('F001', 120000, 10)], cfg: CONFIG({ organisation_id: AUTRE }), org: AUTRE })
    const planAutre = executer(fin, 'Effets prévus', { noeuds: autre.base({}, CONFIG({ organisation_id: AUTRE })) })
    const aucuneAuto = sansAuto(planAutre)
    return { ok: rien && aucuneAuto, details: rien && aucuneAuto ? 'une facture et un chantier d’une autre organisation ne donnent rien ; sa configuration ne donne aucune action automatique' : `rien ${rien} sansAuto ${aucuneAuto}`, sortie: signe(plan) }
  })

  // ═════ APRÈS-VENTE
  const REVS = (c, sentiment = 'neutre') => executer(av, 'Revalider le rédacteur', { entrees: c.qual.filter((x) => ['avis', 'ticket'].includes(x.json.genre)).map((x) => it({ output: { cle_idempotence: x.json.cle_idempotence, sentiment: typeof sentiment === 'function' ? sentiment(x.json) : sentiment, reponse: 'Exemple. Merci pour votre retour.', probleme: 'Exemple. Aucun.' } })), noeuds: { 'Retours à traiter': c.qual.filter((x) => ['avis', 'ticket'].includes(x.json.genre)) } })
  const chaineAv = ({ brut, cfg = CONFIG(), relances = [], org = ORG, niveaux } = {}) => {
    const donnees = brut ?? executer(av, 'Entrée d’exemple').map((x) => x)
    const norm = executer(av, 'Normaliser les entrées', { entrees: donnees.map((x) => (x.json ? x : it(x))), noeuds: REL })
    const qual = executer(av, 'Qualifier les retours', { noeuds: BASE({ 'Normaliser les entrées': norm, 'Lire les relances faites': relances.length ? relances : [it({})] }, cfg) })
    const base = (extra = {}) => BASE({ 'Qualifier les retours': qual, 'Lire l’annexe d’autonomie': niveaux ?? annexe(['repondre_avis', 'repondre_avis_negatif', 'repondre_ticket', 'proposer_entretien', 'prevenir_equipe'], 3, org), ...extra }, cfg)
    return { norm, qual, base }
  }
  essai('gabarit-ent-apres-vente', 'un avis à 1 étoile donne une carte : jamais une publication, même au niveau le plus autonome de l’annexe ; l’équipe est alertée ; l’avis à 5 étoiles est publié selon l’annexe', () => {
    const c = chaineAv()
    const a1 = c.qual.find((x) => x.json.ref === 'exemple-avis-1')?.json, a5 = c.qual.find((x) => x.json.ref === 'exemple-avis-2')?.json
    const sim = executer(av, 'Effets prévus', { noeuds: c.base() })
    const reel = executer(av, 'Décider les effets', { noeuds: c.base({ 'Revalider le rédacteur': REVS(c, 'positif') }) })
    const cartes = reel.filter((p) => p.json.effet === 'carte' && p.json.type_action === 'repondre_avis_negatif')
    const publi = effets(reel, 'repondre_google')
    const ok1 = a1.negatif_code === true && a5.negatif_code === false && cartes.length === 1 && cartes[0].json.statut_carte === 'a_valider' && cartes[0].json.pour_effet === 'repondre_google' && cartes[0].json.approbateurs_roles.join() === 'associe' && cartes[0].json.canal_equipe === 'CANAL_RELATION'
      && publi.length === 1 && publi[0].json.avis_ref === 'exemple-avis-2' && /^Message|—/.test(publi[0].json.texte) === false
      && effets(reel, 'prevenir_slack').length === 1 && /1 étoile/.test(effets(reel, 'prevenir_slack')[0].json.texte)
    const ok2 = !sim.some((p) => p.json.effet === 'repondre_google' && p.json.avis_ref === 'exemple-avis-1' && p.json.mode === 'auto')
    // niveau 1 : brouillon ; le modèle aggrave : un avis à 5 étoiles jugé « très mécontent » va aussi à un humain ; le modèle ne peut pas adoucir un 1 étoile
    const n1 = chaineAv({ niveaux: annexe(['repondre_avis_negatif'], 1) })
    const brouillon = executer(av, 'Décider les effets', { noeuds: n1.base({ 'Revalider le rédacteur': REVS(n1, 'positif') }) }).filter((p) => p.json.type_action === 'repondre_avis_negatif')
    const ok3 = brouillon.length === 1 && brouillon[0].json.statut_carte === 'brouillon'
    const agg = executer(av, 'Décider les effets', { noeuds: c.base({ 'Revalider le rédacteur': REVS(c, (x) => (x.ref === 'exemple-avis-2' ? 'tres_mecontent' : 'positif')) }) })
    const ok4 = agg.filter((p) => p.json.effet === 'carte' && p.json.type_action === 'repondre_avis_negatif').length === 2 && effets(agg, 'repondre_google').length === 0
    const refus = leve(() => executer(av, 'Revalider le rédacteur', { entrees: [it({ output: { cle_idempotence: a1.cle_idempotence, sentiment: 'negatif', reponse: 'Exemple. Désolé, voici un geste de 50 €.', probleme: 'Exemple. Intervention décevante.' } })], noeuds: { 'Retours à traiter': [it(a1)] } })) && leve(() => executer(av, 'Revalider le rédacteur', { entrees: [it({ output: { cle_idempotence: a1.cle_idempotence, sentiment: 'furieux', reponse: 'Exemple. Désolé.', probleme: 'Exemple. Aucun.' } })], noeuds: { 'Retours à traiter': [it(a1)] } }))
    // Une réponse qui part seule attend la fenêtre d’annulation du pilote automatique (10 minutes) : une carte « annulable » que la relève exécute à l’échéance
    const c10 = chaineAv({ cfg: CONFIG({ delai_annulation_min: 10 }) })
    const diff = executer(av, 'Décider les effets', { noeuds: c10.base({ 'Revalider le rédacteur': REVS(c10, 'positif') }, CONFIG({ delai_annulation_min: 10 })) }).find((p) => p.json.type_action === 'repondre_avis' && p.json.statut_carte === 'annulable')?.json
    const ok5 = !!diff && diff.pour_effet === 'repondre_google' && diff.execute_apres === new Date(FIGE + 600000).toISOString() && diff.approbateurs_roles.length === 0
    return { ok: ok1 && ok2 && ok3 && ok4 && refus && ok5, details: ok1 && ok2 && ok3 && ok4 && refus && ok5 ? '1 étoile : 1 carte « À valider » pour le rôle associé + alerte Slack, aucune réponse automatique, même avec l’annexe au niveau 3 ; 5 étoiles : réponse publiée avec l’annexe ; niveau 1 : brouillon ; le modèle aggrave (5 étoiles « très mécontent » : carte) ; un prix ou un sentiment hors énumération est rejeté ; avec le délai de 10 minutes, la réponse à 5 étoiles devient une carte « annulable » exécutée à l’échéance' : `ok1 ${ok1} ok2 ${ok2} ok3 ${ok3} ok4 ${ok4} refus ${refus} ok5 ${ok5}`, sortie: { simulation: signe(sim), reel: signe(reel) } }
  })
  essai('gabarit-ent-apres-vente', 'l’entretien d’un contrat est proposé une fois, au bon destinataire ; sans destinataire : l’équipe est informée', () => {
    const contrat = (ref, mail) => it({ source: 'plateforme_contrat', organisation_id: ORG, contrat_ref: ref, libelle_court: 'Exemple. Entretien ' + ref, prochaine_visite: dans(20), tiers_courriel: mail })
    const c = chaineAv({ brut: [contrat('c1', courrielDe('client-d')), contrat('c2', null), { ...contrat('c3', courrielDe('x')).json, organisation_id: AUTRE }].map((x) => (x.json ? x : it(x))) })
    const plan = executer(av, 'Effets prévus', { noeuds: c.base() })
    const mails = effets(plan, 'courriel_gmail')
    const bon = mails.length === 1 && mails[0].json.destinataire === courrielDe('client-d') && mails[0].json.texte.includes('23/11/2026') && plan.filter((p) => p.json.statut_carte === 'information').length === 1 && !c.qual.some((x) => x.json.contrat_ref === 'c3')
    const deja = chaineAv({ brut: [contrat('c1', courrielDe('client-d'))], relances: [it({ organisation_id: ORG, objet_ref: 'c1:' + dans(20), type_objet: 'contrat', palier: 1, envoyee_le: `${dans(-2)}T08:00:00Z` })] })
    const unefois = effets(executer(av, 'Effets prévus', { noeuds: deja.base() }), 'courriel_gmail').length === 0
    return { ok: bon && unefois, details: bon && unefois ? 'visite dans 20 jours : 1 proposition (date 23/11/2026 écrite par le code) ; sans destinataire : une carte d’information ; déjà proposée : rien ; un contrat d’une autre organisation est ignoré' : `bon ${bon} unefois ${unefois}`, sortie: signe(plan) }
  })
  essai('gabarit-ent-apres-vente', 'une autre organisation ne donne rien (avis, tickets Chatwoot, configuration)', () => {
    const c = chaineAv({ brut: [it({ source: 'plateforme', organisation_id: AUTRE, canal: 'chatwoot', cle_evenement: 'ev-autre', charge_utile: { sujet: 'Exemple. Autre', content: 'Exemple.' } }), it({ source: 'plateforme', organisation_id: ORG, canal: 'chatwoot', cle_evenement: 'ev-1', charge_utile: { sujet: 'Exemple. Question', content: 'Exemple. Une question.' } })] })
    const seul = c.qual.length === 1 && c.qual[0].json.ref === 'ev-1'
    const autre = chaineAv({ cfg: CONFIG({ organisation_id: AUTRE }), org: AUTRE })
    const plan = executer(av, 'Effets prévus', { noeuds: autre.base({}, CONFIG({ organisation_id: AUTRE })) })
    const aucuneAuto = sansAuto(plan)
    return { ok: seul && aucuneAuto, details: seul && aucuneAuto ? 'l’événement Chatwoot d’une autre organisation est ignoré ; sa configuration ne donne aucune action automatique' : `seul ${seul} sansAuto ${aucuneAuto}`, sortie: signe(plan) }
  })

  // ═════ DIRECTION
  const chaineDir = ({ timestamp, rapports = [], couts = [], chiffres = [], cfg = CONFIG(), org = ORG, modePrive = false } = {}) => {
    const passage = executer(dir, 'Préparer le passage', { noeuds: { 'Relève à intervalle': [it({ timestamp })] } })
    const jour = passage[0].json.jour
    const compter = executer(dir, 'Compter', { noeuds: BASE({ 'Préparer le passage': passage, 'Lire les chiffres du jour': chiffres.length ? chiffres : [it({})], 'Lire les rapports': rapports.length ? rapports : [it({})], 'Lire le coût IA': couts.length ? couts : [it({})] }, cfg) })
    const base = (extra = {}) => BASE({ Compter: compter, 'Lire le coût IA': couts.length ? couts : [it({})], 'Lire l’annexe d’autonomie': annexe(TOUS, 3, org), ...extra }, cfg)
    const rev = (intro = 'Exemple. Voici les chiffres.', priorites = [], via = undefined) => executer(dir, 'Revalider les documents', { entrees: compter.map((d) => it({ output: { cle_idempotence: d.json.cle_idempotence, intro, priorites, ...(via ? { via } : {}) } })), noeuds: { 'Documents à rédiger': compter } })
    return { passage, compter, base, rev, jour, modePrive }
  }
  essai('gabarit-ent-direction', 'un rapport du lundi aux chiffres du code : le code compte, le modèle ne rédige qu’une phrase sans chiffre ; envoi, document et journal ; rien avant 8 h', () => {
    const rapports = [it({ organisation_id: ORG, periode: 'semaine', encaisse_centimes: 1234500, signe_centimes: 800000, en_cours_centimes: 250000, impayes_centimes: 40000 }), it({ organisation_id: AUTRE, periode: 'semaine', encaisse_centimes: 99999999, signe_centimes: 1, en_cours_centimes: 1, impayes_centimes: 1 })]
    const couts = [it({ organisation_id: ORG, jour: '2026-11-09', appels_modele: 4, appels_prives: 1, cout_centimes: 120 }), it({ organisation_id: ORG, jour: '2026-11-05', appels_modele: 6, appels_prives: 0, cout_centimes: 80 })]
    const c = chaineDir({ timestamp: '2026-11-09T08:15:00.000+01:00', rapports, couts })
    const lundi = c.compter.find((d) => d.json.kind === 'lundi')?.json
    const chiffres = (lundi?.lignes ?? []).join(' | ')
    const ok1 = !!lundi && /Encaissé cette semaine : 12 345 €/.test(chiffres) && /Signé cette semaine : 8 000 €/.test(chiffres) && /En cours : 2 500 €/.test(chiffres) && /Impayés : 400 €/.test(chiffres) && /Coût IA de la semaine : 2,00 €/.test(chiffres) && /externe cette semaine : 10/.test(chiffres) && !/99/.test(chiffres)
    const sim = executer(dir, 'Effets prévus', { noeuds: c.base() })
    const reel = executer(dir, 'Décider les effets', { noeuds: c.base({ 'Revalider les documents': c.rev() }) })
    const diff = effets(reel, 'diffuser_slack')
    const ok2 = diff.length >= 2 && diff.some((d) => /12 345 €/.test(d.json.texte)) && effets(reel, 'rapport_docs').length === 1 && effets(reel, 'journal_sheets').length === 1 && JSON.stringify(signe(sim)) === JSON.stringify(signe(reel))
    const ok3 = leve(() => c.rev('Exemple. Encaissé : 12 345 euros.')) && leve(() => c.rev('Exemple. Écrit par Presti.')) && leve(() => c.rev('Exemple. Voici les chiffres.', [7])) && leve(() => c.rev('Exemple. Voici les chiffres.', [0, 0]))
    const tot = chaineDir({ timestamp: '2026-11-09T07:30:00.000+01:00', rapports })
    const ok4 = !tot.compter.some((d) => d.json.kind === 'lundi') && tot.compter.some((d) => d.json.kind === 'matin')
    const rien = chaineDir({ timestamp: '2026-11-09T06:00:00.000+01:00' })
    const ok5 = rien.compter.length === 0
    return { ok: ok1 && ok2 && ok3 && ok4 && ok5, details: ok1 && ok2 && ok3 && ok4 && ok5 ? 'lundi 8 h 15 : encaissé 12 345 €, signé 8 000 €, en cours 2 500 €, impayés 400 €, coût IA 2,00 € (chiffres du code, ceux d’une autre organisation ignorés) ; envoi Slack + document Docs + ligne Sheets ; un chiffre, « Presti » ou une priorité hors liste dans la phrase du modèle sont rejetés ; à 7 h 30 seule la page du matin ; avant 7 h rien' : `ok1 ${ok1} (${chiffres}) ok2 ${ok2} ok3 ${ok3} ok4 ${ok4} ok5 ${ok5}`, sortie: { lignes: lundi?.lignes, simulation: signe(sim), reel: signe(reel) } }
  })
  essai('gabarit-ent-direction', 'le point mensuel passe par la validation d’équipe : une carte « À valider » du périmètre direction et une demande Slack ; rien ne part avant ; le bilan à un mois suit la date de déploiement', () => {
    const c = chaineDir({ timestamp: '2026-12-01T08:30:00.000+01:00', rapports: [it({ organisation_id: ORG, periode: 'mois', encaisse_centimes: 5000000, signe_centimes: 3000000, impayes_centimes: 100000 })], cfg: CONFIG({ deploye_le: '2026-11-01' }) })
    const kinds = c.compter.map((d) => d.json.kind).sort().join()
    const reel = executer(dir, 'Décider les effets', { noeuds: c.base({ 'Revalider les documents': c.rev() }, CONFIG({ deploye_le: '2026-11-01' })) })
    const cartes = reel.filter((p) => p.json.effet === 'carte' && p.json.statut_carte === 'a_valider')
    const valider = effets(reel, 'valider_slack')
    const bon = kinds === 'bilan_1_mois,matin,point_mensuel' && cartes.length === 2 && cartes.every((x) => x.json.approbateurs_roles.join() === 'gerant' && x.json.canal_equipe === 'CANAL_DIRECTION' && x.json.pour_effet === 'diffuser_slack') && valider.length === 2 && valider.every((v) => v.json.canal_equipe === 'CANAL_DIRECTION')
      && effets(reel, 'diffuser_slack').length === 1 && /Page du matin/.test(effets(reel, 'diffuser_slack')[0].json.objet)
    const approuvee = executer(dir, 'Cartes en effets', { noeuds: { 'Réglages de la copie (relève)': [it({ organisation_id: ORG })], 'Relève des cartes': [it({ organisation_id: ORG, cle_idempotence: cartes[0].json.cle_idempotence, statut: 'approuvee', charge: cartes[0].json.charge, approbateurs_roles: ['gerant'], approuvee_par_role: 'gerant' }), it({ organisation_id: ORG, cle_idempotence: cartes[1].json.cle_idempotence, statut: 'approuvee', charge: cartes[1].json.charge, approbateurs_roles: ['gerant'], approuvee_par_role: 'compagnon' })] } })
    const reprise = approuvee.length === 1 && approuvee[0].json.effet === 'diffuser_slack'
    return { ok: bon && reprise, details: bon && reprise ? '1er du mois, 8 h 30 : page du matin (envoyée), point mensuel et bilan à un mois (30 jours après le déploiement) en cartes « À valider » du périmètre direction, avec une demande Slack chacune ; la carte approuvée par le gérant est reprise, celle d’un rôle hors liste est ignorée' : `kinds ${kinds} cartes ${cartes.length} valider ${valider.length} reprise ${reprise}`, sortie: { reel: signe(reel) } }
  })
  essai('gabarit-ent-direction', 'le compteur dit ce qui sort vers un modèle externe : le mode privé rédige sans modèle ; le plafond du coût IA alerte', () => {
    const couts = [it({ organisation_id: ORG, jour: '2026-11-03', appels_modele: 3, appels_prives: 0, cout_centimes: 250 })]
    const c = chaineDir({ timestamp: '2026-11-03T08:00:00.000+01:00', couts, cfg: CONFIG({ plafond_ia_centimes: 200 }) })
    const externe = executer(dir, 'Décider les effets', { noeuds: c.base({ 'Revalider les documents': c.rev() }, CONFIG({ plafond_ia_centimes: 200 })) })
    const ind = effets(externe, 'indicateur')[0]?.json?.indicateur
    const alerte = externe.some((p) => p.json.type_action === 'alerte_cout_ia')
    const sans = executer(dir, 'Rédiger sans modèle', { entrees: c.compter })
    const revPrive = executer(dir, 'Revalider les documents', { entrees: sans, noeuds: { 'Documents à rédiger': c.compter } })
    const prive = executer(dir, 'Décider les effets', { noeuds: c.base({ 'Revalider les documents': revPrive }) })
    const indP = effets(prive, 'indicateur')[0]?.json?.indicateur
    const bon = ind?.documents_par_modele_externe === 1 && ind?.documents_en_mode_prive === 0 && alerte && indP?.documents_par_modele_externe === 0 && indP?.documents_en_mode_prive === 1 && /Voici les chiffres/.test(revPrive[0].json.message)
    const faux = leve(() => executer(dir, 'Revalider les documents', { entrees: [it({ output: { cle_idempotence: c.compter[0].json.cle_idempotence, intro: 'Exemple. Voici les chiffres.', priorites: [], via: 'code' } })], noeuds: { 'Documents à rédiger': c.compter } })) === false
    return { ok: bon && faux, details: bon && faux ? 'rédigé par le modèle : 1 document externe, 0 privé, plafond de 2,00 € dépassé (2,50 €) : alerte ; en mode privé : 0 externe, 1 privé, la phrase est celle du code' : `externe ${JSON.stringify(ind)} privé ${JSON.stringify(indP)} alerte ${alerte}`, sortie: { externe: ind, prive: indP } }
  })
  essai('gabarit-ent-direction', 'une autre organisation ne donne rien (chiffres, rapports, configuration)', () => {
    const c = chaineDir({ timestamp: '2026-11-09T08:15:00.000+01:00', rapports: [it({ organisation_id: AUTRE, periode: 'semaine', encaisse_centimes: 99999999 })], chiffres: [it({ organisation_id: AUTRE, jour: '2026-11-09', impayes_echus_centimes: 99999999, devis_a_relancer: 77 })] })
    const txt = c.compter.flatMap((d) => d.json.lignes).join(' | ')
    const nonLu = /Encaissé cette semaine : non lu/.test(txt) && /Impayés échus : non lu/.test(txt) && !/99|77/.test(txt)
    const autre = chaineDir({ timestamp: '2026-11-09T08:15:00.000+01:00', cfg: CONFIG({ organisation_id: AUTRE }), org: AUTRE })
    const plan = executer(dir, 'Décider les effets', { noeuds: autre.base({ 'Revalider les documents': autre.rev() }, CONFIG({ organisation_id: AUTRE })) })
    const aucuneAuto = sansAuto(plan)
    return { ok: nonLu && aucuneAuto, details: nonLu && aucuneAuto ? 'les chiffres et rapports d’une autre organisation donnent « non lu », jamais leurs valeurs ; sa configuration ne donne aucune action automatique' : `nonLu ${nonLu} sansAuto ${aucuneAuto} : ${txt.slice(0, 200)}`, sortie: signe(plan) }
  })
  return { resultats, sorties }
}

// ─── 3. MUTANTS ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const noeud = (wf, nom) => { const n = wf.nodes.find((x) => x.name === nom); if (!n) throw new Error('nœud absent : ' + nom); return n }
const remplacer = (wf, nom, avant, apres) => { const n = noeud(wf, nom); if (!n.parameters.jsCode.includes(avant)) throw new Error(`mutant inapplicable : « ${avant.slice(0, 60)} » absent de ${nom}`); n.parameters.jsCode = n.parameters.jsCode.replace(avant, apres) }
// La décision est écrite deux fois (le réel et la simulation, qui rejoue le même corps) : un mutant de décision vise les deux.
const remplacerDecision = (wf, avant, apres) => { let n = 0; for (const nom of ['Décider les effets', 'Effets prévus']) { const x = noeud(wf, nom); if (x.parameters.jsCode.includes(avant)) { x.parameters.jsCode = x.parameters.jsCode.replace(avant, apres); n++ } } if (!n) throw new Error(`mutant inapplicable : « ${avant.slice(0, 60)} » absent de la décision`) }
const MUTANTS = [
  ['une écriture dans la banque (POST vers Qonto)', 'gabarit-ent-finance', (wf) => { wf.nodes.push({ id: 'qw', name: 'Écrire un virement', type: B('httpRequest'), typeVersion: 4.5, position: [0, 0], parameters: { method: 'POST', url: 'https://thirdparty.qonto.com/v2/external_transfers', options: {} } }) }, /S14 .*banque ou la compta/],
  ['une écriture dans la compta (QuickBooks crée une facture)', 'gabarit-ent-finance', (wf) => { noeud(wf, 'Lire les factures QuickBooks').parameters.operation = 'create' }, /S14 .*compta ou la banque/],
  ['une écriture dans la compta (POST vers Pennylane)', 'gabarit-ent-finance', (wf) => { noeud(wf, 'Lire les factures Pennylane').parameters.method = 'POST' }, /S14 .*Pennylane|S14 .*app\.pennylane\.com/],
  ['un montant du modèle (le reste dû)', 'gabarit-ent-finance', (wf) => { remplacer(wf, 'Revalider les relances', 'objet: verifierTexte(s.objet, 120)', 'montant: s.montant, objet: verifierTexte(s.objet, 120)'); remplacer(wf, 'Décider les effets', "'\\n\\nMontant restant dû : ' + eur(f.reste_centimes)", "'\\n\\nMontant restant dû : ' + (r.montant ?? eur(f.reste_centimes))") }, /paiement lu/],
  ['un montant du modèle (le schéma porte un montant)', 'gabarit-ent-finance', (wf) => { const p = noeud(wf, 'Schéma : Rédacteur d’impayés').parameters; const s = JSON.parse(p.inputSchema); s.properties.montant_du = { type: 'number' }; p.inputSchema = JSON.stringify(s) }, /S6 .*montant/],
  ['un montant du modèle (le total d’une facture)', 'gabarit-ent-finance', (wf) => remplacer(wf, 'Rapprocher', 'total_ttc_centimes: estime || vide ? null : ht + tva', 'total_ttc_centimes: 1'), /facturier/],
  ['une relance sans paiement lu (la facture soldée est relancée)', 'gabarit-ent-finance', (wf) => remplacer(wf, 'Rapprocher', "const soldee = reste <= 0 || e.statut === 'payee';", 'const soldee = false;'), /paiement lu/],
  ['un avis négatif publié (le brouillon part sans carte)', 'gabarit-ent-apres-vente', (wf) => remplacerDecision(wf, "+ e.canal + ')' }, true);", "+ e.canal + ')' }, false);"), /1 étoile/],
  ['un avis négatif publié (le seuil du code ignoré)', 'gabarit-ent-apres-vente', (wf) => remplacer(wf, 'Qualifier les retours', 'negatif_code: e.etoiles <= seuil', 'negatif_code: false'), /1 étoile/],
  ['un avis négatif publié (le modèle peut adoucir le verdict)', 'gabarit-ent-apres-vente', (wf) => remplacerDecision(wf, 'const sentiment = r && gravite[r.sentiment] > gravite[code] ? r.sentiment : code;', 'const sentiment = r ? r.sentiment : code;'), /1 étoile/],
  ['une relance de document sans destinataire connu', 'gabarit-ent-administratif', (wf) => remplacerDecision(wf, 'if (!e.tiers_courriel) {', 'if (false) {'), /pièce manquante/],
  ['une relance sans limite (plus de trois relances)', 'gabarit-ent-administratif', (wf) => remplacer(wf, 'Croiser les sources', 'nbDe(ref) < 3 && ', ''), /attestation qui expire/],
  ['une relance sans écart (le même jour)', 'gabarit-ent-administratif', (wf) => remplacer(wf, 'Croiser les sources', '|| joursEntre(derniere(ref), aujourdhui) >= 3', '|| true'), /attestation qui expire/],
  ['un nombre inventé dans une attestation', 'gabarit-ent-administratif', (wf) => remplacer(wf, 'Revalider les attestations', "for (const n of (corps.match(/\\d+/g) ?? [])) if (!permis.includes(n)) throw new Error('nombre inventé dans l’attestation : ' + n);", ''), /attestation ne dit que/],
  ['une organisation lue sans filtre (la requête)', 'gabarit-ent-administratif', (wf) => { const q = noeud(wf, 'Lire les relances faites').parameters.queryParameters; q.parameters = q.parameters.filter((p) => p.name !== 'organisation_id') }, /S7 .*Lire les relances faites.*filtre organisation/],
  ['une organisation lue sans filtre (les chantiers d’une autre organisation passent)', 'gabarit-ent-operations', (wf) => remplacer(wf, 'Normaliser les entrées', "case 'plateforme': if (mien(e) && e.chantier_ref)", "case 'plateforme': if (e.chantier_ref)"), /autre organisation/],
  ['une organisation lue sans filtre (les membres d’une autre organisation)', 'gabarit-ent-operations', (wf) => remplacer(wf, 'Préparer le planning', ".filter((r) => mien(r) && r.membre_ref)", ".filter((r) => r.membre_ref)"), /autre organisation/],
  ['une organisation lue sans filtre (la configuration d’une autre organisation)', 'gabarit-ent-finance', (wf) => remplacerDecision(wf, 'const mien = (r) => !!r && r.organisation_id === org;', 'const mien = (r) => !!r;'), /autre organisation/],
  ['une organisation lue sans filtre (les chiffres d’une autre organisation)', 'gabarit-ent-direction', (wf) => remplacer(wf, 'Compter', '.find((r) => mien(r) && r.jour === p.jour)', '.find((r) => r.jour === p.jour)'), /autre organisation/],
  ['une organisation lue sans filtre (les rapports d’une autre organisation)', 'gabarit-ent-direction', (wf) => remplacer(wf, 'Compter', ".filter(mien);\nconst rap", ";\nconst rap"), /autre organisation/],
  ['une écriture sans organisation', 'gabarit-ent-apres-vente', (wf) => { const n = noeud(wf, 'Répondre par la plateforme'); n.parameters.jsonBody = n.parameters.jsonBody.replace('organisation_id: ', 'autre_id: ') }, /S7 .*Répondre par la plateforme/],
  ['un identifiant branché', 'gabarit-ent-apres-vente', (wf) => { noeud(wf, 'Fiche Google : répondre à l’avis').credentials = { googleBusinessProfileOAuth2Api: { id: 'IdentifiantFictif09', name: 'Fiche du client' } } }, /S3 .*Fiche Google/],
  ['un identifiant de la base branché', 'gabarit-ent-direction', (wf) => { noeud(wf, 'Lire les rapports').credentials = { supabaseApi: { id: 'IdentifiantFictif01', name: 'Supabase account' } } }, /S3 .*Lire les rapports/],
  ['un outil d’agent qui écrit (l’agenda crée un événement)', 'gabarit-ent-operations', (wf) => { noeud(wf, 'Lire l’agenda Google (outil)').parameters.operation = 'create' }, /S6 .*outil d'agent qui écrit/],
  ['un outil d’agent qui écrit (le Drive crée un fichier)', 'gabarit-ent-administratif', (wf) => { noeud(wf, 'Chercher dans le Drive (outil)').parameters.operation = 'upload' }, /S6 .*outil d'agent qui écrit/],
  ['un outil d’agent sans note de lecture', 'gabarit-ent-finance', (wf) => { delete noeud(wf, 'Paiement Stripe (outil)').notes }, /S6 .*Paiement Stripe/],
  ['« Presti » dans un message du client (le texte envoyé)', 'gabarit-ent-finance', (wf) => { noeud(wf, 'Envoyer par Gmail').parameters.message += ' — envoyé avec Presti' }, /S9 .*Envoyer par Gmail/],
  ['« Presti » dans un message du client (la réponse à un avis)', 'gabarit-ent-apres-vente', (wf) => { noeud(wf, 'Fiche Google : répondre à l’avis').parameters.reply += ' Presti' }, /S9 .*Fiche Google/],
  ['« Presti » dans un message du client (la revalidation le laisse passer)', 'gabarit-ent-operations', (wf) => remplacer(wf, 'Revalider le répartiteur', "if (/presti/i.test(t)) throw new Error('nom de la plateforme dans un texte pour un tiers (marque blanche)');", ''), /planificateur/],
  ['« Presti » dans un message du client (une attestation)', 'gabarit-ent-administratif', (wf) => remplacer(wf, 'Revalider les attestations', "if (/presti/i.test(t)) throw new Error('nom de la plateforme dans un texte pour un tiers (marque blanche)');", ''), /attestation ne dit que/],
  ['la mention de l’assistant ôtée d’un envoi', 'gabarit-ent-direction', (wf) => { const n = noeud(wf, 'Diffuser par Teams'); n.parameters.message = n.parameters.message.replace(MENTION, 'Cordialement') }, /S10 .*Diffuser par Teams/],
  ['le nœud Agenda retiré', 'gabarit-ent-operations', (wf) => { wf.nodes = wf.nodes.filter((n) => n.type !== B('googleCalendar')) }, /S2 .*googleCalendar/],
  ['le nœud Outlook retiré', 'gabarit-ent-operations', (wf) => { wf.nodes = wf.nodes.filter((n) => n.type !== B('microsoftOutlook')) }, /S2 .*microsoftOutlook/],
  ['le nœud Stripe retiré', 'gabarit-ent-finance', (wf) => { wf.nodes = wf.nodes.filter((n) => n.type !== B('stripe')) }, /S2 .*stripe/],
  ['l’API Qonto retirée', 'gabarit-ent-finance', (wf) => { wf.nodes = wf.nodes.filter((n) => !/qonto/.test(String(n.parameters?.url))) }, /S2 .*thirdparty\.qonto\.com/],
  ['le nœud Zendesk retiré', 'gabarit-ent-apres-vente', (wf) => { wf.nodes = wf.nodes.filter((n) => n.type !== B('zendesk')) }, /S2 .*zendesk/],
  ['Chatwoot lu par une adresse tierce (hors plateforme)', 'gabarit-ent-apres-vente', (wf) => { noeud(wf, 'Lire les conversations Chatwoot').parameters.queryParameters.parameters = noeud(wf, 'Lire les conversations Chatwoot').parameters.queryParameters.parameters.filter((p) => p.value !== 'eq.chatwoot') }, /S2 .*Chatwoot/],
  ['Google Chat retiré', 'gabarit-ent-direction', (wf) => { wf.nodes = wf.nodes.filter((n) => n.type !== B('googleChat')) }, /S2 .*googleChat/],
  ['la validation d’équipe retirée (Teams)', 'gabarit-ent-direction', (wf) => { wf.nodes = wf.nodes.filter((n) => n.name !== 'Valider par Teams') }, /S11 .*validation/],
  ['l’outil de validation humaine de n8n retiré de l’agent', 'gabarit-ent-direction', (wf) => { wf.nodes = wf.nodes.filter((n) => n.type !== B('slackHitlTool')) }, /S11 .*validation humaine|S2 .*slackHitlTool/],
  ['le mode privé retiré', 'gabarit-ent-direction', (wf) => { wf.nodes = wf.nodes.filter((n) => n.name !== 'Mode privé ?') }, /S16 .*mode privé/],
  ['un chiffre écrit par le modèle (la phrase de la direction)', 'gabarit-ent-direction', (wf) => remplacer(wf, 'Revalider les documents', "|| /\\d/.test(s.intro) ||", '||'), /rapport du lundi/],
  ['une priorité hors de la liste du code', 'gabarit-ent-direction', (wf) => remplacer(wf, 'Revalider les documents', 'n < d.candidats.length', 'n < 99'), /rapport du lundi/],
  ['un point mensuel envoyé sans validation d’équipe', 'gabarit-ent-direction', (wf) => remplacerDecision(wf, 'resume: d.titre }, d.validation_equipe);', 'resume: d.titre });'), /point mensuel passe par la validation/],
  ['un créneau du modèle (le numéro n’est plus contrôlé)', 'gabarit-ent-operations', (wf) => remplacer(wf, 'Revalider le répartiteur', 's.proposition < 0 || s.proposition >= e.propositions.length', 'false'), /planificateur/],
  ['un créneau occupé proposé', 'gabarit-ent-operations', (wf) => remplacer(wf, 'Préparer le planning', 'if (occ.some((o) => (o.membre === membre || o.membre === \'equipe\') && o.a < b && a < o.b)) continue;', ''), /planificateur/],
  ['une ligne d’import en anomalie importée', 'gabarit-ent-operations', (wf) => remplacerDecision(wf, 'if (it.anomalies.length) {', 'if (false) {'), /ligne d’import en anomalie/],
  ['la porte de la relève retirée de la vérification (échec ouvert)', 'gabarit-ent-direction', (wf) => { noeud(wf, 'Porte simulation').parameters.conditions.conditions[0].leftValue = "={{ $('Lire la configuration').first()?.json?.simulation === true }}" }, /S5 .*fermée/],
  ['un webhook ajouté', 'gabarit-ent-finance', (wf) => { wf.nodes.push({ id: 'wh', name: 'Entrée publique', type: B('webhook'), typeVersion: 2, position: [0, 0], parameters: { path: 'exemple' } }) }, /S4 .*Entrée publique/],
  ['les actions ne sont plus réservées avant l’effet', 'gabarit-ent-administratif', (wf) => { wf.nodes = wf.nodes.filter((n) => n.name !== 'Réserver les actions') }, /S12 .*réservées/],
  ['l’annexe d’autonomie n’est plus lue', 'gabarit-ent-apres-vente', (wf) => { wf.nodes = wf.nodes.filter((n) => n.name !== 'Lire l’annexe d’autonomie') }, /S12 .*annexe/],
]

// ─── Lancement ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
let echecs = 0
const dire = (ok, m) => { console.log(`${ok ? '✓' : '✗'} ${m}`); if (!ok) echecs++ }
const charger = () => Object.fromEntries(NOMS.map((n) => { const f = path.join(DOSSIER, `${n}.workflow.json`); if (!existsSync(f)) throw new Error('export absent : ' + f); return [n, JSON.parse(readFileSync(f, 'utf8'))] }))
const evaluer = (w) => ({ structure: NOMS.flatMap((n) => structure(w[n]).map((m) => `${n} : ${m}`)), ...essais(w) })

const base = charger()
const registre = JSON.parse(readFileSync(path.join(DOSSIER, 'empreintes-code.json'), 'utf8'))
console.log(`mention d'IA relue dans lib/mentionAssistant.ts : « ${MENTION} »`)
for (const n of NOMS) for (const c of base[n].nodes.filter((x) => x.type === B('code'))) {
  const h = createHash('sha256').update(c.parameters.jsCode, 'utf8').digest('hex')
  if (registre[n]?.[c.name] !== h) dire(false, `${n} : l'empreinte de « ${c.name} » ne correspond pas au registre`)
}
const e0 = evaluer(base)
for (const m of e0.structure) dire(false, m)
dire(e0.structure.length === 0, `structure des 5 gabarits (${NOMS.map((n) => `${n.replace('gabarit-ent-', '')} ${base[n].nodes.length} nœuds`).join(', ')})`)
for (const r of e0.resultats) dire(r.ok, `essai ${r.workflow} : ${r.nom}\n      → ${r.details}`)
if (process.env.DEBUG_JUGE) e0.sorties.forEach((s, i) => { if (!e0.resultats[i].ok) console.log('   DEBUG', JSON.stringify(s.sortie).slice(0, 1800)) })

const essaisJson = e0.sorties.map((s, i) => ({ ...s, verdict: e0.resultats[i]?.ok ? 'vert' : 'rouge', mode: 'rejeu hors ligne des nœuds Code des exports (node:vm), horloge figée au 03/11/2026, épingles « Exemple. » ; test_workflow de n8n non joué par ce juge' }))
writeFileSync(path.join(DOSSIER, 'essais-n8n.json'), JSON.stringify(essaisJson, null, 2) + '\n')

if (echecs === 0) {
  let verts = 0
  for (const [titre, nomWf, muter, attendu] of MUTANTS) {
    const w = copie(base)
    let e
    try { muter(w[nomWf]); const r = evaluer(w); e = [...r.structure, ...r.resultats.filter((x) => !x.ok).map((x) => `essai ${x.workflow} : ${x.nom} → ${x.details}`)] }
    catch (err) { console.log(`✗ mutant « ${titre} » inapplicable : ${err.message}`); verts++; continue }
    const bon = e.filter((m) => attendu.test(m))
    console.log(`  ${bon.length ? '✓' : '✗'} mutant « ${titre} » (${nomWf.replace('gabarit-ent-', '')}) ${bon.length ? 'fait rougir le juge' : 'NE FAIT PAS rougir le juge pour sa raison'}\n      → ${(bon[0] ?? e[0] ?? 'aucun manquement').slice(0, 170)}`)
    if (!bon.length) verts++
  }
  console.log(`gabarits-entreprise-2-qa : ${NOMS.length} gabarits, ${e0.resultats.length} essais, ${MUTANTS.length} mutants`)
  if (verts) { console.log(`✗ ${verts} mutant(s) laissent le juge vert`); echecs++ }
} else console.log('mutants non joués : la base n’est pas verte, ils ne prouveraient rien')
if (echecs) { console.log('ÉCHEC'); process.exit(1) }
console.log('OK')
