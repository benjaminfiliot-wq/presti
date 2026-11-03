// JUGE du catalogue de gabarits OUTILLÉS de l'Entreprise sur mesure, première moitié (tâche 036-016 ; prompt 6, OUTILLAGE.md § 7, lignes 1 à 4) :
// gabarit-ent-accueil, gabarit-ent-leads, gabarit-ent-ventes, gabarit-ent-marketing. HORS LIGNE : aucun réseau, aucune base, aucun modèle, aucun n8n.
// Il lit les exports `.workflow.json` du dossier de preuve (par défaut .orchestre/preuves/036-016) et leur registre `empreintes-code.json`.
//
// TROIS ÉTAGES :
//   1. STRUCTURE — les outils des lignes 1 à 4 du § 7 sont présents ; agents conformes (modèle Claude, UN parseur, outils en lecture seule notés) ;
//      aucun identifiant (même pas celui de Supabase), aucun webhook ; chaque lecture et chaque écriture de la base porte l'organisation ;
//      jamais le nom de la plateforme dans ce que reçoit un client ; LinkedIn en publication seulement ; la mention de l'assistant en pied.
//   2. REJEU — les nœuds Code des exports sont REJOUÉS sur les essais (données épinglées « Exemple. »), dans un bac à sable `node:vm` :
//      un lead Facebook donne une fiche CRM et une conversation · le même lead par deux canaux ne donne qu'une fiche · un désinscrit : aucune séquence ·
//      un post Instagram donne une carte de validation · un devis donne un montant tiré du code · une autre organisation : rien.
//   3. MUTANTS — chaque faute ci-dessous DOIT faire rougir le juge pour sa raison : un lead en double, un désinscrit relancé, un quota d'envoi ignoré,
//      une publication sans validation, une collecte LinkedIn, un montant du modèle, une organisation lue sans filtre, un identifiant branché,
//      « Presti » dans un message du client, le nœud Facebook Graph retiré (et d'autres).
// Il lance aussi le juge commun (scripts/n8n-specs-qa.mjs) sur un gabarit à outil de validation humaine : permis dans gabarit-ent-*, refusé ailleurs.
//   node scripts/gabarits-entreprise-qa.mjs [dossier]
import { readFileSync, writeFileSync, existsSync, mkdtempSync, mkdirSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DOSSIER = path.resolve(RACINE, process.argv.slice(2).find((a) => !a.startsWith('--')) ?? '.orchestre/preuves/036-016')
const NOMS = ['gabarit-ent-accueil', 'gabarit-ent-leads', 'gabarit-ent-ventes', 'gabarit-ent-marketing']
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

// ─── Ce que chaque gabarit doit porter (OUTILLAGE.md § 7, lignes 1 à 4 ; tâche 036-016) ───────────────────────────────────────────
const CRM = ['hubspot', 'pipedrive', 'salesforce', 'zohoCrm', 'odoo', 'airtable', 'notion', 'mondayCom'].map(B)
const REQUIS = {
  'gabarit-ent-accueil': {
    types: [B('gmailTrigger'), B('microsoftOutlookTrigger'), B('emailReadImap'), B('gmail'), B('microsoftOutlook'), B('whatsApp'), B('slack'), B('microsoftTeams'), ...CRM.filter((t) => t !== B('mondayCom')), B('mondayCom')],
    hotes: ['api.typeform.com', 'eu-api.jotform.com', 'api.tally.so', 'api.calendly.com', 'api.cal.com'], agents: 2,
  },
  'gabarit-ent-leads': {
    types: [B('facebookGraphApi'), B('linkedIn'), B('googleAds'), B('sendInBlue'), B('mailchimp'), B('activeCampaign'), B('lemlist'), B('slack'), B('microsoftTeams'), ...CRM],
    hotes: ['api.cal.com', 'api.calendly.com', 'api.brevo.com', 'api.manychat.com'], agents: 1,
  },
  'gabarit-ent-ventes': {
    types: [...CRM, B('gmail'), B('microsoftOutlook'), B('slack'), B('microsoftTeams'), B('hubspotTool'), B('airtableTool'), B('notionTool')],
    hotes: ['api.yousign.app', 'eu.docusign.net'], agents: 2,
  },
  'gabarit-ent-marketing': {
    types: [B('facebookGraphApi'), B('linkedIn'), B('youTube'), B('twitter'), B('googleAds'), B('slack'), B('microsoftTeams')],
    hotes: ['graph.facebook.com', 'open.tiktokapis.com'], agents: 1,
  },
}
const TYPES_WEBHOOK = /webhook|formTrigger|chatTrigger|facebookTrigger|facebookLeadAdsTrigger|telegramTrigger|whatsAppTrigger|calendlyTrigger|typeformTrigger|jotformTrigger|stripeTrigger|hubspotTrigger|sendInBlueTrigger/i
const DECLENCHEURS_PERMIS = new Set([B('scheduleTrigger'), B('errorTrigger'), B('gmailTrigger'), B('microsoftOutlookTrigger'), B('emailReadImap'), B('googleCalendarTrigger'), B('executeWorkflowTrigger')])
const TYPES_ENVOI = new Set([B('gmail'), B('microsoftOutlook'), B('whatsApp'), B('slack'), B('microsoftTeams'), B('emailSend'), B('sendInBlue'), B('twilio'), B('telegram')])
const PUBLICATIONS = (n) => (n.type === B('linkedIn')) || (n.type === B('twitter') && n.parameters?.operation === 'create') || (n.type === B('facebookGraphApi') && String(n.parameters?.httpRequestMethod).toUpperCase() === 'POST')
  || (n.type === B('youTube') && n.parameters?.operation === 'update') || (n.type === B('httpRequest') && /open\.tiktokapis\.com/.test(String(n.parameters?.url)))

const aretes = (wf, nom) => Object.entries(wf.connections?.[nom] ?? {}).flatMap(([genre, liste]) => (Array.isArray(liste) ? liste : []).flatMap((s, i) => (Array.isArray(s) ? s : []).filter(Boolean).map((l) => ({ vers: l.node, genre, sortie: i }))))
const hoteDe = (n) => { try { return new URL(String(n.parameters?.url)).host } catch { return '' } }

// ─── 1. STRUCTURE ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function structure(wf) {
  const e = [], ko = (r, m) => e.push(`${r} ${m}`)
  const nom = String(wf.name ?? ''), req = REQUIS[nom]
  if (!req) return [`S0 nom inattendu « ${nom} »`]
  if (wf.active !== false || wf.activeVersionId) ko('S1', 'le gabarit doit être inactif et sans version publiée')
  const noeuds = wf.nodes ?? [], types = new Set(noeuds.map((n) => n.type)), hotes = new Set(noeuds.map(hoteDe).filter(Boolean))
  // Outils présents
  for (const t of req.types) if (!types.has(t)) ko('S2', `outil absent : ${t}`)
  for (const h of req.hotes) if (!hotes.has(h)) ko('S2', `API absente : ${h}`)
  // Aucun identifiant, même pas celui de Supabase : la copie du client branche les siens, l'identifiant de la base est posé par le déploiement
  for (const n of noeuds) if (n.credentials !== undefined) ko('S3', `${n.name} : identifiant branché dans un gabarit (« y a pas besoin de connexion », Benj 03/11)`)
  // Aucun webhook : n8n d'Oracle n'est pas exposé
  for (const n of noeuds) if ((TYPES_WEBHOOK.test(n.type) || (/Trigger$/.test(n.type) && !DECLENCHEURS_PERMIS.has(n.type)))) ko('S4', `${n.name} : déclencheur à webhook (${n.type})`)
  // Les deux portes « simulation » (relève, effets) et leur forme
  const portes = noeuds.filter((n) => /^\s*porte\s*:\s*simulation\s*$/m.test(String(n.notes ?? '')))
  if (portes.length < 2) ko('S5', `${portes.length} porte(s) « simulation » : deux attendues (devant la relève, devant le modèle et les effets)`)
  for (const p of portes) if (!/simulation/.test(String(p.parameters?.conditions?.conditions?.[0]?.leftValue)) || !/!== false/.test(String(p.parameters?.conditions?.conditions?.[0]?.leftValue))) ko('S5', `${p.name} : la porte doit échouer fermée (simulation !== false)`)
  // Agents : un modèle Claude, UN parseur, outils en lecture seule et notés
  const agents = noeuds.filter((n) => n.type === '@n8n/n8n-nodes-langchain.agent')
  if (agents.length !== req.agents) ko('S6', `${agents.length} agent(s), ${req.agents} attendu(s)`)
  for (const a of agents) {
    const entrants = noeuds.flatMap((n) => aretes(wf, n.name).filter((x) => x.vers === a.name).map((x) => ({ ...x, noeud: n })))
    const modeles = entrants.filter((x) => x.genre === 'ai_languageModel'), parseurs = entrants.filter((x) => x.genre === 'ai_outputParser'), outils = entrants.filter((x) => x.genre === 'ai_tool')
    if (modeles.length !== 1 || modeles[0].noeud.type !== '@n8n/n8n-nodes-langchain.lmChatAnthropic') ko('S6', `${a.name} : un seul modèle Claude attendu`)
    if (parseurs.length !== 1 || parseurs[0].noeud.type !== '@n8n/n8n-nodes-langchain.outputParserStructured') ko('S6', `${a.name} : un seul parseur structuré attendu`)
    if (!outils.length) ko('S6', `${a.name} : aucun outil de lecture branché`)
    for (const o of outils) if (!/^\s*outil\s*:\s*lecture\s*$/m.test(String(o.noeud.notes ?? '')) || String(o.noeud.notes).length < 40) ko('S6', `${o.noeud.name} : un outil d'agent doit déclarer « outil: lecture » et dire ce qu'il lit`)
    if (a.parameters?.options?.passthroughBinaryImages !== false || !Number.isInteger(a.parameters?.options?.maxIterations)) ko('S6', `${a.name} : images non transmises et itérations bornées attendues`)
    if (/presti/i.test(JSON.stringify(a.parameters))) ko('S9', `${a.name} : le nom de la plateforme est dans l'agent (marque blanche)`)
    const montants = /montant|prix_ttc|total_ttc|score/i.test(String(parseurs[0]?.noeud?.parameters?.inputSchema))
    if (montants && nom !== 'gabarit-ent-leads') ko('S6', `${a.name} : le schéma du modèle porte un montant ou un score : le code calcule`)
  }
  // Base de Presti : jamais un nœud Supabase, toujours l'organisation (R14 refait ici : le juge ne dépend pas d'un autre)
  for (const n of noeuds.filter((x) => x.type === B('httpRequest') && /supabase\.co/.test(String(x.parameters?.url)))) {
    const m = String(n.parameters?.method ?? 'GET').toUpperCase()
    const filtres = (n.parameters?.queryParameters?.parameters ?? []).filter((q) => q.name === 'organisation_id')
    if (m === 'POST') { if (!/\borganisation_id\s*:/.test(String(n.parameters?.jsonBody))) ko('S7', `${n.name} : écriture sans la clé organisation_id dans le corps`) }
    else if (filtres.length !== 1 || !/^=?eq\./.test(String(filtres[0].value))) ko('S7', `${n.name} : requête sans filtre organisation (organisation_id=eq.…)`)
    if (m === 'GET' && !/^organisation_id,/.test(String((n.parameters?.queryParameters?.parameters ?? []).find((q) => q.name === 'select')?.value))) ko('S7', `${n.name} : la lecture ne ramène pas organisation_id (le code ne peut pas écarter la ligne d'une autre organisation)`)
  }
  if (noeuds.some((n) => n.type === B('supabase'))) ko('S7', 'nœud Supabase : le filtre ne se lirait pas dans la requête')
  // Marque blanche et mention d'IA : ce que reçoit un client
  for (const n of noeuds) {
    const sort = TYPES_ENVOI.has(n.type) && !/^(get|getAll|search|read)$/.test(String(n.parameters?.operation))
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
  // LinkedIn : publication seulement
  for (const n of noeuds) {
    const url = String(n.parameters?.url ?? '')
    if (/linkedin\.com/i.test(url) || /linkedin/i.test(n.type) && !(n.type === B('linkedIn') && n.parameters?.resource === 'post' && n.parameters?.operation === 'create')) ko('S8', `${n.name} : LinkedIn ne sert qu'à publier (collecte de profils interdite par ses conditions)`)
    if (/linkedin/i.test(n.name) && !/publier/i.test(n.name)) ko('S8', `${n.name} : un nœud LinkedIn s'appelle « publier »`)
  }
  // Marketing : toute publication part d'un effet décidé ; les 2-3 premiers contenus de chaque format sont validés par un humain
  if (nom === 'gabarit-ent-marketing') {
    const sw = noeuds.filter((n) => n.type === B('slack') && n.parameters?.operation === 'sendAndWait'), te = noeuds.filter((n) => n.type === B('microsoftTeams') && n.parameters?.operation === 'sendAndWait')
    if (!sw.length || !te.length) ko('S11', 'la validation d’équipe (Slack et Teams, envoyer et attendre) est absente')
    for (const nomN of ['Slack', 'Teams']) for (const verbe of ['Approuver', 'Refuser']) {
      const pat = noeuds.find((n) => n.name === `${verbe} la carte (${nomN})`)
      if (!(pat?.parameters?.queryParameters?.parameters ?? []).some((q) => q.name === 'statut' && /a_valider/.test(String(q.value)))) ko('S11', `${verbe} la carte (${nomN}) : doit filtrer statut=a_valider (un clic tardif ne ressuscite pas une carte refusée)`)
    }
    const decider = noeuds.find((n) => n.name === 'Décider les effets')
    if (!/VALIDES\(e\.format\)/.test(String(decider?.parameters?.jsCode)) || !/Math\.min\(3, Math\.max\(2/.test(String(decider?.parameters?.jsCode))) ko('S11', 'la règle « 2-3 validations par format » n’est pas dans la décision')
    for (const n of noeuds.filter(PUBLICATIONS)) if (!aretes(wf, 'Quel effet ?').some((a) => a.vers === n.name) && !noeuds.some((x) => aretes(wf, x.name).some((a) => a.vers === n.name && x.type !== '@n8n/n8n-nodes-langchain.agent'))) ko('S11', `${n.name} : publication qui ne vient pas de l'aiguillage des effets`)
  }
  // L'autonomie est lue en configuration, par type d'action
  const decideur = noeuds.find((n) => n.name === 'Décider les effets')
  if (!noeuds.some((n) => n.name === 'Lire l’annexe d’autonomie') || !/annexe\[/.test(String(decideur?.parameters?.jsCode))) ko('S12', 'l’autonomie par type d’action n’est pas lue dans l’annexe')
  if (!noeuds.some((n) => n.name === 'Réserver les actions')) ko('S12', 'les actions ne sont pas réservées avant l’effet (idempotence)')
  // Relecture croisée (036-016) : ce qu'un essai de code ne voit pas dans le graphe
  const imap = noeuds.find((n) => n.type === B('emailReadImap'))
  if (imap && imap.parameters?.postProcessAction !== 'nothing') ko('S14', `${imap.name} : marque le courrier comme lu même en simulation (postProcessAction: nothing attendu)`)
  const evts = noeuds.find((n) => n.name === 'Lire les événements des canaux')
  if (evts) {
    const cat = (evts.parameters.queryParameters.parameters.find((q) => q.name === 'categorie') ?? {}).value
    if (cat !== (nom === 'gabarit-ent-leads' ? 'eq.lead' : 'eq.message')) ko('S14', `${evts.name} : un événement de la plateforme n'est lu que par un seul gabarit (categorie ${cat ?? 'absente'})`)
    if (!noeuds.some((n) => n.name === 'Marquer l’événement lu') || !/traite: true/.test(String(noeuds.find((n) => n.name === 'Marquer l’événement lu').parameters.jsonBody))) ko('S14', 'les événements lus ne sont jamais marqués « traités »')
  }
  if (nom === 'gabarit-ent-leads') {
    const lit = noeuds.find((n) => n.name === 'Brevo : lire le contact'), ok = noeuds.find((n) => n.name === 'Brevo : contact autorisé ?'), env = noeuds.find((n) => n.name === 'Brevo : envoyer le premier message')
    if (lit?.parameters?.operation !== 'get' || !/destinataire/.test(String(lit?.parameters?.identifier))) ko('S14', 'Brevo : le contact doit être lu par « get » avec son adresse (getAll renvoie 50 autres contacts)')
    if (!/emailBlacklisted === false/.test(JSON.stringify(ok?.parameters)) || /!== true/.test(JSON.stringify(ok?.parameters))) ko('S14', 'Brevo : une erreur (clé refusée, panne) ne doit pas valoir « contact autorisé » (échec fermé)')
    const corps = String(env?.parameters?.jsonBody)
    if (!/sender:/.test(corps) || !/List-Unsubscribe/.test(corps) || !/STOP/.test(corps)) ko('S14', 'Brevo : le message doit nommer son expéditeur et porter la désinscription (en-tête List-Unsubscribe et ligne STOP)')
  }
  // Notes sur chaque nœud d'outil
  for (const n of noeuds) if (/Tool$/.test(n.type) || n.type.endsWith('toolWorkflow')) if (String(n.notes ?? '').length < 40) ko('S13', `${n.name} : note d'outil manquante ou trop courte`)
  return e
}

// ─── 2. REJEU : un bac à sable pour les nœuds Code ───────────────────────────────────────────────────────────────────────────────
const it = (j) => ({ json: j })
function executer(wf, nom, { entrees = [], noeuds = {} } = {}) {
  const n = wf.nodes.find((x) => x.name === nom)
  if (!n || n.type !== B('code')) throw new Error(`nœud Code absent : ${nom}`)
  const dollar = (k) => {
    const v = noeuds[k]
    if (v === undefined) return { isExecuted: false, all: () => { throw new Error('nœud non exécuté : ' + k) }, first: () => { throw new Error('nœud non exécuté : ' + k) }, last: () => { throw new Error('nœud non exécuté : ' + k) } }
    return { isExecuted: true, all: () => v, first: () => v[0], last: () => v[v.length - 1], item: v[0] }
  }
  const bac = { $: dollar, $input: { all: () => entrees, first: () => entrees[0], last: () => entrees[entrees.length - 1] }, String, Number, Math, JSON, Date, Array, Object, Set, Map, Error, RegExp, parseInt, parseFloat, isNaN, Boolean }
  const fonction = vm.runInNewContext('(function(){' + String(n.parameters.jsCode) + '\n})', bac, { timeout: 3000 })
  return JSON.parse(JSON.stringify(fonction()))
}
const ORG = 'ORG_A', AUTRE = 'ORG_B'
const CONFIG = { organisation_id: ORG, simulation: true, crm_choisi: 'hubspot', boite_client: 'gmail', outil_equipe: 'slack', raison_affichee: 'Exemple. Entreprise', quota_jour: 2, validations_requises: 3, seuil_qualifie: 60,
  perimetres: { publier_instagram: 'marketing', publier_facebook: 'marketing', publier_linkedin: 'marketing', fiche_crm: 'ventes' }, approbateurs: { marketing: ['associe'], ventes: ['gerant'], direction: ['gerant'] }, canaux_validation: { marketing: 'CANAL_MARKETING_EXEMPLE' }, canal_alertes: 'CANAL_EXEMPLE',
  regles_score: { urgence: { sous_un_mois: 40 }, budget: { moyen: 30 }, seuil_chaud: 60, seuil_tiede: 30 }, sequence_outil: 'brevo', liste_id: '7', flux_manychat: 'flux_exemple', jours_avant_relance: 5, signature_outil: 'yousign', delai_annulation_min: 0 }
const annexe = (types, niveau = 3) => types.map((t) => it({ organisation_id: ORG, type_action: t, niveau, plafond_jour: 20 }))
const BASE = (extra = {}) => ({ 'Réglages de la copie': [it({ organisation_id: ORG })], 'Lire la configuration': [it(CONFIG)], 'Lire les actions du jour': [it({})], ...extra })
const signe = (plan) => plan.map((p) => `${p.json.effet}|${p.json.type_action}|${p.json.mode}|${p.json.cle_idempotence}`).sort()
const effets = (plan, e) => plan.filter((p) => p.json.effet === e)
const courrielDe = (x) => x + AROBASE + 'exemple.invalid'
const GRILLE = [it({ organisation_id: ORG, critere_id: 'zone', libelle_court: 'Exemple. Dans la zone', poids: 50, eliminatoire: false }), it({ organisation_id: ORG, critere_id: 'delai', libelle_court: 'Exemple. Délai réaliste', poids: 50, eliminatoire: false })]
const TARIFS = [it({ organisation_id: ORG, ref_tarif: 'exemple-intervention', libelle_court: 'Exemple. Intervention', prix_ht_centimes: 10000, tva_pct: 20 }), it({ organisation_id: ORG, ref_tarif: 'exemple-fourniture', libelle_court: 'Exemple. Fourniture', prix_ht_centimes: 5000, tva_pct: 20 }),
  it({ organisation_id: AUTRE, ref_tarif: 'exemple-intervention', libelle_court: 'Exemple. Autre organisation', prix_ht_centimes: 1, tva_pct: 0 })]

// Chaque essai rend { nom, ok, details, sorties } ; il lève s'il ne peut même pas s'exécuter (une faute du code = un essai rouge).
function essais(w) {
  const sorties = [], resultats = []
  const essai = (workflow, nom, f) => {
    try { const r = f(); resultats.push({ workflow, nom, ok: r.ok, details: r.details }); sorties.push({ workflow, nom, epingles: r.epingles ?? 'Exemple.', sortie: r.sortie }) }
    catch (err) { resultats.push({ workflow, nom, ok: false, details: `exception : ${err.message}` }) }
  }
  const { 'gabarit-ent-accueil': acc, 'gabarit-ent-leads': led, 'gabarit-ent-ventes': ven, 'gabarit-ent-marketing': mkt } = w
  // ── LEADS : un lead Facebook donne une fiche CRM et une conversation, en simulation comme en réel
  const chaineLeads = (extraConnus = [], brut = null) => {
    const ex = brut ?? executer(led, 'Entrée d’exemple')
    const norm = executer(led, 'Normaliser les leads', { entrees: ex })
    const ecart = executer(led, 'Écarter les doublons', { noeuds: { 'Normaliser les leads': norm, 'Lire les événements traités': [it({})], 'Lire les identités connues': extraConnus.length ? extraConnus : [it({})], 'Réglages de la copie': [it({ organisation_id: ORG })] } })
    return { norm, ecart }
  }
  const baseLeads = (ecart, extra = {}) => BASE({ 'Écarter les doublons': ecart, 'Lire l’annexe d’autonomie': annexe(['deposer_conversation', 'fiche_crm', 'inscrire_sequence', 'message_manychat']), ...extra })
  essai('gabarit-ent-leads', 'un lead Facebook donne une fiche CRM et une conversation (simulation, puis réel : même plan)', () => {
    const { norm, ecart } = chaineLeads()
    const sim = executer(led, 'Effets prévus', { noeuds: baseLeads(ecart) })
    const cle = ecart[0].json.cle_idempotence
    const rev = executer(led, 'Revalider le rédacteur', { entrees: [it({ output: { cle_idempotence: cle, canal_conseille: 'courriel', objet: 'Exemple. Merci pour votre demande', texte: 'Exemple. Bonjour, merci pour votre demande.', score: 100 } })], noeuds: BASE({ 'Écarter les doublons': ecart }) })
    const reel = executer(led, 'Décider les effets', { noeuds: baseLeads(ecart, { 'Revalider le rédacteur': rev }) })
    const crm = effets(reel, 'crm_fiche')
    const bon = norm.length === 1 && effets(sim, 'deposer').length === 1 && effets(sim, 'crm_fiche').length === 1 && crm.length === 1 && crm[0].json.crm === 'hubspot' && crm[0].json.score === 70 && crm[0].json.qualification === 'chaud'
      && JSON.stringify(signe(sim.map((p) => p))) === JSON.stringify(signe(reel)) && sim.every((p) => p.json.simulation === true)
    return { ok: bon, details: bon ? 'fiche HubSpot + dépôt dans la conversation ; score 70 calculé par le code (le 100 du modèle est ignoré) ; plan de simulation = plan réel' : `plan simulé ${signe(sim)} / réel ${signe(reel)} / score ${crm[0]?.json?.score}`, sortie: { simulation: signe(sim), reel: signe(reel) } }
  })
  essai('gabarit-ent-leads', 'le même lead reçu par deux canaux ne donne qu’une fiche (dans le lot, puis d’un lot à l’autre)', () => {
    const ex = executer(led, 'Entrée d’exemple')
    const reservation = it({ source: 'calcom', uid: 'exemple-reservation-1', title: 'Exemple. Rendez-vous', attendees: [{ email: courrielDe('prospect'), name: 'Exemple. Prospect' }] })
    const { ecart } = chaineLeads([], [...ex, reservation])
    const plan = executer(led, 'Effets prévus', { noeuds: baseLeads(ecart) })
    const dansLot = ecart.filter((e) => e.json.nouveau_lead).length === 1 && ecart.length === 2 && effets(plan, 'crm_fiche').length === 1 && effets(plan, 'deposer').length === 2
    const cles = ecart[0].json.cles_identite
    const connu = it({ organisation_id: ORG, cle_conversation: 'conversation-connue', cles_identite: cles, crm_ref: 'ref-crm-1' })
    const suivant = chaineLeads([connu])
    const plan2 = executer(led, 'Effets prévus', { noeuds: baseLeads(suivant.ecart) })
    const dEnLot = suivant.ecart[0].json.nouveau_lead === false && effets(plan2, 'crm_fiche').length === 0 && effets(plan2, 'deposer').length === 1
    return { ok: dansLot && dEnLot, details: dansLot && dEnLot ? 'deux canaux dans un lot : 1 fiche, 2 dépôts ; lead déjà connu d’un lot précédent : 0 fiche, 1 dépôt' : `dans le lot : ${dansLot} ; d'un lot à l'autre : ${dEnLot}`, sortie: { lot: signe(plan), suivant: signe(plan2) } }
  })
  const controle = (plan, { desinscrits = [], envoyes = 0, quota = 10, autres = [] } = {}) => executer(led, 'Contrôler les envois', { noeuds: { 'Garder les actions réservées': plan.map(it),
    'Lire les désinscrits': desinscrits.length ? desinscrits.map((c) => it({ organisation_id: ORG, cles_identite: c })) : [it({})], 'Lire les règles d’envoi': [it({ organisation_id: ORG, quota_jour: quota })],
    'Lire les envois du jour': [...Array.from({ length: envoyes }, () => it({ organisation_id: ORG, type_action: 'inscrire_sequence', statut: 'faite', effet: 'sequence_brevo' })), ...Array.from({ length: 3 }, () => it({ organisation_id: ORG, type_action: 'inscrire_sequence', statut: 'reserve', effet: 'sequence_brevo' })), ...autres, it({})], 'Lire le quota du compte': [it({})] } })
  const sequence = (n, cles) => ({ organisation_id: ORG, effet: 'sequence_brevo', type_action: 'inscrire_sequence', cle_idempotence: `facebook:exemple-${n}:inscrire_sequence`, cles_identite: cles, charge: { effet: 'sequence_brevo' } })
  essai('gabarit-ent-leads', 'un désinscrit : aucune séquence', () => {
    const sortie = controle([sequence(1, ['cdesinscrit1']), sequence(2, ['cautre2'])], { desinscrits: [['cdesinscrit1']] })
    const bon = sortie.length === 2 && sortie[0].json.effet === 'exclu' && sortie[0].json.motif_exclusion === 'desinscrit' && sortie[1].json.effet === 'sequence_brevo'
    return { ok: bon, details: bon ? 'le désinscrit est exclu (journalisé), l’autre passe' : `effets ${sortie.map((s) => s.json.effet)}`, sortie: sortie.map((s) => s.json.effet) }
  })
  essai('gabarit-ent-leads', 'le quota d’envoi est lu avant chaque lot : le surplus part en file pour demain, rien n’est perdu', () => {
    const plan = [sequence(1, ['c1']), sequence(2, ['c2']), sequence(3, ['c3'])]
    const sortie = controle(plan, { envoyes: 1, quota: 2 })
    const bon = sortie.map((s) => s.json.effet).join() === 'sequence_brevo,file_demain,file_demain' && sortie[1].json.charge_demain?.effet === 'sequence_brevo'
    const compte = executer(led, 'Contrôler les envois', { noeuds: { 'Garder les actions réservées': plan.map(it), 'Lire les désinscrits': [it({})], 'Lire les règles d’envoi': [it({ organisation_id: ORG, quota_jour: 300 })], 'Lire les envois du jour': [it({})], 'Lire le quota du compte': [it({ plan: [{ type: 'sendLimit', credits: 1 }] })] } })
    const bonCompte = compte.map((s) => s.json.effet).join() === 'sequence_brevo,file_demain,file_demain'
    return { ok: bon && bonCompte, details: bon && bonCompte ? '1 reste sur 2 (1 déjà parti) : 1 part, 2 en file ; le plafond du compte (1 crédit) borne aussi' : `quota client ${sortie.map((s) => s.json.effet)} / compte ${compte.map((s) => s.json.effet)}`, sortie: sortie.map((s) => s.json.effet) }
  })
  essai('gabarit-ent-leads', 'le plafond du jour de l’annexe : au-delà, une carte ; une carte déjà faite ne compte pas comme un effet', () => {
    const { ecart } = chaineLeads()
    const cle = ecart[0].json.cle_idempotence
    const rev = executer(led, 'Revalider le rédacteur', { entrees: [it({ output: { cle_idempotence: cle, canal_conseille: 'aucun', objet: 'Exemple. Merci', texte: 'Exemple. Bonjour, merci pour votre demande.' } })], noeuds: BASE({ 'Écarter les doublons': ecart }) })
    const annexePlafond = [it({ organisation_id: ORG, type_action: 'deposer_conversation', niveau: 3, plafond_jour: 20 }), it({ organisation_id: ORG, type_action: 'fiche_crm', niveau: 3, plafond_jour: 1 })]
    const run = (noeud, actions) => executer(led, noeud, { noeuds: { ...baseLeads(ecart, { 'Revalider le rédacteur': rev }), 'Lire l’annexe d’autonomie': annexePlafond, 'Lire les actions du jour': actions } })
    const lignes = {
      atteint: [it({ organisation_id: ORG, type_action: 'fiche_crm', statut: 'faite', effet: 'crm_fiche' })],
      cartePasEffet: [it({ organisation_id: ORG, type_action: 'fiche_crm', statut: 'faite', effet: 'carte' }), it({ organisation_id: ORG, type_action: 'fiche_crm', statut: 'reserve', effet: 'crm_fiche' })],
    }
    const verdicts = ['Effets prévus', 'Décider les effets'].map((noeud) => {
      const atteint = run(noeud, lignes.atteint), pasEffet = run(noeud, lignes.cartePasEffet)
      return effets(atteint, 'crm_fiche').length === 0 && effets(atteint, 'carte').some((c) => c.json.pour_effet === 'crm_fiche' && c.json.statut_carte === 'a_valider') && effets(pasEffet, 'crm_fiche').length === 1
    })
    const bon = verdicts.every(Boolean)
    return { ok: bon, details: bon ? 'plafond 1 atteint par une fiche faite : la suivante devient une carte (simulation et réel) ; une carte faite ou une action seulement réservée ne compte pas' : `simulation ${verdicts[0]} / réel ${verdicts[1]}`, sortie: { verdicts } }
  })
  essai('gabarit-ent-leads', 'l’autonomie par défaut est la carte à valider ; un effet automatique attend la fenêtre d’annulation (10 min) avant de sortir', () => {
    const { ecart } = chaineLeads()
    const cle = ecart[0].json.cle_idempotence
    const rev = executer(led, 'Revalider le rédacteur', { entrees: [it({ output: { cle_idempotence: cle, canal_conseille: 'aucun', objet: 'Exemple. Merci', texte: 'Exemple. Bonjour, merci pour votre demande.' } })], noeuds: BASE({ 'Écarter les doublons': ecart }) })
    const run = (noeud, extra) => executer(led, noeud, { noeuds: { ...baseLeads(ecart, { 'Revalider le rédacteur': rev }), ...extra } })
    const verdicts = ['Effets prévus', 'Décider les effets'].map((noeud) => {
      const sansAnnexe = run(noeud, { 'Lire l’annexe d’autonomie': [it({})] })
      const defaut = effets(sansAnnexe, 'crm_fiche').length === 0 && effets(sansAnnexe, 'carte').some((c) => c.json.pour_effet === 'crm_fiche' && c.json.statut_carte === 'a_valider') && effets(sansAnnexe, 'deposer').length === 1
      const plan = run(noeud, { 'Lire la configuration': [it({ ...CONFIG, delai_annulation_min: 10 })] })
      const diff = effets(plan, 'carte').find((c) => c.json.pour_effet === 'crm_fiche')?.json
      const dans = diff ? Date.parse(diff.execute_apres) - Date.now() : 0
      const differe = !!diff && diff.statut_carte === 'annulable' && dans > 9 * 60000 && dans <= 10 * 60000 + 5000 && effets(plan, 'crm_fiche').length === 0 && effets(plan, 'deposer').length === 1
      return { defaut, differe }
    })
    const carte = (statut, quand) => it({ organisation_id: ORG, cle_idempotence: 'facebook:x:fiche_crm:carte', statut, execute_apres: quand, charge: { effet: 'crm_fiche', organisation_id: ORG }, approbateurs_roles: [] })
    const rejeu = (c) => executer(led, 'Cartes en effets', { noeuds: { 'Réglages de la copie (relève)': [it({ organisation_id: ORG })], 'Relève des cartes': [c] } })
    const echue = rejeu(carte('annulable', new Date(Date.now() - 1000).toISOString())), future = rejeu(carte('annulable', new Date(Date.now() + 600000).toISOString()))
    const reprise = echue.length === 1 && /:differee$/.test(echue[0].json.cle_idempotence) && future.length === 0
    const bon = verdicts.every((v) => v.defaut && v.differe) && reprise
    return { ok: bon, details: bon ? 'sans annexe : carte « À valider » (le dépôt reste interne) ; niveau 3 + 10 min : carte « annulable » exécutable dans 10 min (simulation et réel) ; la relève ne l’exécute qu’une fois la fenêtre écoulée' : `simulation ${JSON.stringify(verdicts[0])} réel ${JSON.stringify(verdicts[1])} reprise ${reprise}`, sortie: { verdicts } }
  })
  essai('gabarit-ent-leads', 'relecture croisée : deux plafonds distincts (séquences / relances), ManyChat sans désinscrit, rapport du jour, score à l’épreuve du prototype', () => {
    const rel = (n) => ({ organisation_id: ORG, effet: 'relance_gmail', type_action: 'relance_vente', cle_idempotence: `opp:${n}:r1:relance_vente`, cles_identite: [`cr${n}`], charge: {} })
    const faitesRelances = Array.from({ length: 5 }, () => it({ organisation_id: ORG, type_action: 'relance_vente', statut: 'faite', effet: 'relance_gmail' }))
    const seq = controle([sequence(1, ['c1']), sequence(2, ['c2'])], { quota: 2, autres: faitesRelances })
    const sequencesIntactes = seq.map((s) => s.json.effet).join() === 'sequence_brevo,sequence_brevo'
    const relances = executer(led, 'Contrôler les envois', { noeuds: { 'Garder les actions réservées': [it(rel(1)), it(rel(2))], 'Lire les désinscrits': [it({})], 'Lire les règles d’envoi': [it({ organisation_id: ORG, quota_jour: 0, quota_relances_jour: 1 })], 'Lire les envois du jour': [it({})], 'Lire le quota du compte': [it({})] } })
    const relancesPlafonnees = relances.map((s) => s.json.effet).join() === 'relance_gmail,file_demain'
    const mc = { organisation_id: ORG, effet: 'manychat', type_action: 'message_manychat', cle_idempotence: 'facebook:x:message_manychat', cles_identite: ['cdes'], charge: {} }
    const manychat = controle([mc, { ...mc, cle_idempotence: 'facebook:y:message_manychat', cles_identite: ['cautre'] }], { desinscrits: [['cdes']], quota: 0 })
    const manychatOk = manychat[0].json.effet === 'exclu' && manychat[1].json.effet === 'manychat'
    const rapport = executer(led, 'Normaliser les leads', { entrees: [it({ source: 'rapport_ads', id: 'campagne-1', campaign: { id: 'campagne-1' }, metrics: { cost_micros: 1234, clicks: 5 } })] })
    const aujourdhui = new Date().toISOString().slice(0, 10)
    const rapportDuJour = rapport.length === 1 && rapport[0].json.cle_idempotence.endsWith(':' + aujourdhui)
    const { ecart } = chaineLeads()
    const piege = (urgence) => { const e = ecart.map((x) => ({ json: { ...x.json, urgence, budget: 'toString' } })); const cle = e[0].json.cle_idempotence
      const rev = executer(led, 'Revalider le rédacteur', { entrees: [it({ output: { cle_idempotence: cle, canal_conseille: 'aucun', objet: 'Exemple. Merci', texte: 'Exemple. Bonjour.' } })], noeuds: BASE({ 'Écarter les doublons': e }) }); return rev[0].json.score }
    const prototype = [piege('constructor'), piege('toString'), piege('__proto__')].every((s) => s === 0)
    const bon = sequencesIntactes && relancesPlafonnees && manychatOk && rapportDuJour && prototype
    return { ok: bon, details: bon ? 'cinq relances faites ne coupent pas les séquences ; les relances ont leur plafond (1 puis la file) ; ManyChat respecte la désinscription ; le rapport du jour a une clé datée ; urgence « constructor » ou « toString » vaut 0 point' : `séquences ${sequencesIntactes} relances ${relancesPlafonnees} manychat ${manychatOk} rapport ${rapportDuJour} prototype ${prototype}`, sortie: { seq: seq.map((s) => s.json.effet), relances: relances.map((s) => s.json.effet) } }
  })
  essai('gabarit-ent-ventes', 'relecture croisée : tarif invalide = estimé, relance par rang (trois au plus, une par rang), rien ne repart au modèle si déjà réservé', () => {
    const ex = executer(ven, 'Entrée d’exemple')
    const norm = executer(ven, 'Normaliser les opportunités', { entrees: ex })
    const router = (jours, vus = []) => executer(ven, 'Router les opportunités', { noeuds: { 'Normaliser les opportunités': norm.map((n) => ({ json: { ...n.json, jours_sans_reponse: n.json.etape === 'proposition_envoyee' ? jours : 0 } })), 'Réglages de la copie': [it({ organisation_id: ORG })], 'Lire la configuration': [it(CONFIG)], 'Lire les clés déjà réservées': vus.length ? vus.map((c) => it({ organisation_id: ORG, cle_idempotence: c })) : [it({})] } })
    const rangs = [4, 6, 11, 16, 21, 26].map((j) => { const r = router(j).find((x) => x.json.etape === 'proposition_envoyee').json; return `${j}:${r.rang}:${r.a_relancer}` }).join()
    const rangsOk = rangs === '4:0:false,6:1:true,11:2:true,16:3:true,21:4:false,26:5:false'
    const cleRelance = router(6).find((x) => x.json.a_relancer).json.cle_idempotence
    const dejaRelance = router(6, [`${cleRelance}:r1:relance_vente`]).every((x) => !x.json.a_relancer) && router(11, [`${cleRelance}:r1:relance_vente:carte`]).some((x) => x.json.a_relancer)
    const cleProp = router(6).find((x) => x.json.a_proposer).json.cle_idempotence
    const dejaPropose = router(6, [`${cleProp}:proposition_crm:carte`]).every((x) => !x.json.a_proposer)
    const route = router(6)
    const aProposer = route.filter((r) => r.json.a_proposer)
    const montants = (tarifs) => executer(ven, 'Calculer les montants', { entrees: [it({ output: { cle_idempotence: aProposer[0].json.cle_idempotence, introduction: 'Exemple. Voici notre proposition.', lignes: [{ ref_tarif: 'exemple-intervention', quantite: 1 }] } })], noeuds: { 'Entrées à proposer': aProposer, 'Lire les tarifs': tarifs, 'Réglages de la copie': [it({ organisation_id: ORG })] } })
    const invalide = (patch) => { const m = montants([it({ organisation_id: ORG, ref_tarif: 'exemple-intervention', libelle_court: 'Exemple. Intervention', prix_ht_centimes: 10000, tva_pct: 20, ...patch })]); return m[0].json.estime === true && m[0].json.total_ttc_centimes === null }
    const tarifs = invalide({ prix_ht_centimes: null }) && invalide({ prix_ht_centimes: 0 }) && invalide({ prix_ht_centimes: 10.5 }) && invalide({ tva_pct: null }) && invalide({ tva_pct: 7 }) && invalide({ tva_pct: 'vingt' })
    const bon = rangsOk && dejaRelance && dejaPropose && tarifs
    return { ok: bon, details: bon ? 'rangs 0 à 5 : relance aux rangs 1 à 3 seulement ; un rang déjà réservé (ou en carte) ne repart pas ; une proposition déjà réservée non plus ; un prix nul, non entier ou une TVA hors des taux français rend la proposition estimée' : `rangs ${rangs} / relance ${dejaRelance} / proposition ${dejaPropose} / tarifs ${tarifs}`, sortie: { rangs } }
  })
  essai('gabarit-ent-marketing', 'relecture croisée : un brief ou un commentaire déjà réservé ne repart pas au modèle ; un rapport du jour reste', () => {
    const norm = executer(mkt, 'Normaliser les entrées', { entrees: [...executer(mkt, 'Entrée d’exemple'), it({ source: 'facebook', data: [{ id: 'pub-1', comments: { data: [{ id: 'com-1', message: 'Exemple. Bravo !' }] } }] }), it({ source: 'googleads', id: 'campagne-1', metrics: { cost_micros: 1, clicks: 1 } })] })
    const genres = norm.map((n) => n.json.genre).join()
    const ecarter = (vus) => executer(mkt, 'Écarter ce qui est déjà traité', { noeuds: { 'Réglages de la copie': [it({ organisation_id: ORG })], 'Normaliser les entrées': norm, 'Lire les clés déjà réservées': vus.length ? vus.map((c) => it({ organisation_id: ORG, cle_idempotence: c })) : [it({})] } }).map((n) => n.json.genre).join()
    const cleBrief = norm.find((n) => n.json.genre === 'brief').json.cle_idempotence, cleCom = norm.find((n) => n.json.genre === 'commentaire').json.cle_idempotence
    const rien = ecarter([]) === genres
    const briefFait = ecarter([`${cleBrief}:publier_instagram:carte`]) === 'commentaire,rapport'
    const tous = ecarter([`${cleBrief}:publier_instagram`, `${cleCom}:repondre_commentaire:carte`]) === 'rapport'
    const autreOrg = executer(mkt, 'Écarter ce qui est déjà traité', { noeuds: { 'Réglages de la copie': [it({ organisation_id: ORG })], 'Normaliser les entrées': norm, 'Lire les clés déjà réservées': [it({ organisation_id: AUTRE, cle_idempotence: `${cleBrief}:publier_instagram` })] } }).length === norm.length
    const bon = genres === 'brief,commentaire,rapport' && rien && briefFait && tous && autreOrg
    return { ok: bon, details: bon ? 'rien de réservé : tout passe ; brief réservé : écarté ; brief et commentaire réservés : seul le rapport reste ; la réservation d’une autre organisation ne compte pas' : `genres ${genres} rien ${rien} brief ${briefFait} tous ${tous} autre ${autreOrg}`, sortie: { genres } }
  })
  essai('gabarit-ent-marketing', 'relecture croisée : une anomalie devient une carte « à corriger » (jamais d’exception), un format non géré une carte, un litige en commentaire une carte ; la validation montre le texte', () => {
    const brief = (format, extra = {}) => ({ source: 'brief', ref: 'exemple-brief-' + format, format, reseaux: ['instagram'], sujet: 'Exemple. Sujet', image_url: 'https://exemple.invalid/image.jpg', ...extra })
    const norm = executer(mkt, 'Normaliser les entrées', { entrees: [it(brief('post_image')), it(brief('carrousel')), it(brief('texte')), it({ source: 'facebook', data: [{ id: 'pub-9', comments: { data: [{ id: 'com-9', message: 'Exemple. Je préviens mon avocat, c’est une arnaque.' }, { id: 'com-10', message: 'Exemple. Bravo, merci !' }] } }] })] })
    const formats = [it({ organisation_id: ORG, format: 'post_image', validations_positives: 3, ecart_qa: false }), it({ organisation_id: ORG, format: 'carrousel', validations_positives: 3, ecart_qa: false }), it({ organisation_id: ORG, format: 'texte', validations_positives: 3, ecart_qa: false })]
    const cles = norm.map((n) => n.json.cle_idempotence)
    const sortie = (cle, extra) => ({ output: { cle_idempotence: cle, ...extra } })
    const rev = executer(mkt, 'Revalider le rédacteur', { entrees: [it(sortie(cles[0], { textes: { instagram: 'Exemple. Un tarif de 1200 € pour tous.' } })), it(sortie(cles[1], { textes: { instagram: 'Exemple. Une journée avec l’équipe.' } })), it(sortie('cle-modifiee', { textes: { instagram: 'Exemple. Un autre texte.' } })), it(sortie(cles[3], { reponse: 'Exemple. Nous sommes désolés, écrivez-nous.' })), it(sortie(cles[4], { reponse: 'Exemple. Merci pour votre message !' }))], noeuds: { 'Entrées à rédiger': norm } })
    const sansException = rev.length === 5 && rev[0].json.qa_ok === false && rev[1].json.qa_ok === true && rev[2].json.qa_ok === false && rev[3].json.qa_ok === true
    const plan = executer(mkt, 'Décider les effets', { noeuds: BASE({ 'Écarter ce qui est déjà traité': norm, 'Revalider le rédacteur': rev, 'Lire les formats validés': formats, 'Lire l’annexe d’autonomie': annexe(['publier_instagram', 'repondre_commentaire']) }) })
    const cartes = effets(plan, 'carte')
    const aCorriger = cartes.find((c) => c.json.pour_effet === 'publier_instagram' && c.json.charge.a_corriger === true && c.json.charge.texte === '') && !plan.some((p) => p.json.effet === 'publier_instagram')
    const direct = effets(plan, 'repondre_commentaire_facebook').map((p) => p.json.commentaire_id)
    const litige = cartes.some((c) => c.json.pour_effet === 'repondre_commentaire_facebook' && c.json.charge.commentaire_id === 'com-9') && !direct.includes('com-9')
    const ordinaire = direct.join() === 'com-10'
    const valider = effets(plan, 'valider_slack').some((v) => /ANOMALIE/.test(v.json.texte)) && effets(plan, 'valider_slack').some((v) => /Une journée avec l’équipe/.test(v.json.texte))
    const rejeu = executer(mkt, 'Cartes en effets', { noeuds: { 'Réglages de la copie (relève)': [it({ organisation_id: ORG })], 'Relève des cartes': cartes.filter((c) => c.json.statut_carte === 'a_valider').map((c) => it({ ...c.json, statut: 'approuvee', approuvee_par_role: 'associe', approbateurs_roles: ['associe'] })) } })
    const pasRejoue = !rejeu.some((r) => r.json.a_corriger === true)
    const carrousel = cartes.some((c) => /format non géré/.test(String(c.json.resume)) && c.json.charge.format === 'carrousel')
    const bon = sansException && aCorriger && litige && ordinaire && valider && pasRejoue && carrousel
    return { ok: bon, details: bon ? 'des sorties défectueuses (prix, clé modifiée) deviennent des anomalies sans exception ; la carte « à corriger » a un texte vide et la relève ne la rejoue pas ; le carrousel part en carte (format non géré) ; un litige en commentaire reste une carte alors que le commentaire ordinaire part seul (niveau 3) ; la validation d’équipe montre le texte' : `sans exception ${sansException} à corriger ${!!aCorriger} litige ${litige} ordinaire ${ordinaire} validation ${valider} non rejouée ${pasRejoue} carrousel ${carrousel} plan ${JSON.stringify(signe(plan))}`, sortie: { cartes: cartes.map((c) => c.json.resume) } }
  })
  essai('gabarit-ent-accueil', 'relecture croisée : l’événement de la plateforme est marqué lu (même écarté) ; le dépôt interne ne consomme pas le plafond ; un geste forcé en carte ne consomme pas le sien', () => {
    const ex = executer(acc, 'Entrée d’exemple')
    const wa = it({ source: 'plateforme', canal: 'whatsapp', cle_evenement: 'wa-1', charge_utile: { telephone: '0600000009', corps: 'Exemple. Publicité reçue.' } })
    const litige = (n) => it({ source: 'exemple', canal: 'courriel', ref: `litige-${n}`, courriel: courrielDe(`litige${n}`), libelle: 'Exemple.', sujet: 'Exemple.', corps: 'Exemple. Je préviens mon avocat.' })
    const norm = executer(acc, 'Normaliser les entrées', { entrees: [wa, litige(1), litige(2), ...ex] })
    const ecart = executer(acc, 'Écarter les doublons', { noeuds: { 'Normaliser les entrées': norm, 'Lire les événements traités': [it({})], 'Lire les identités connues': [it({})], 'Réglages de la copie': [it({ organisation_id: ORG })] } })
    const classe = (e) => (e.json.source === 'plateforme' ? 'a_ecarter' : 'a_traiter')
    const tri = ecart.map((e) => ({ json: { ...e.json, classe: classe(e) } }))
    const qual = ecart.filter((e) => classe(e) === 'a_traiter').map((e) => ({ json: { cle_idempotence: e.json.cle_idempotence, qualification: 'qualifie', score: 100, besoin: 'Exemple.', reponse_proposee: 'Exemple. Bonjour, merci.', rendez_vous_souhaite: false } }))
    const annexePlafond = [it({ organisation_id: ORG, type_action: 'deposer_conversation', niveau: 3, plafond_jour: 1 }), it({ organisation_id: ORG, type_action: 'reponse_prospect', niveau: 3, plafond_jour: 1 }), it({ organisation_id: ORG, type_action: 'marquer_evenement', niveau: 3, plafond_jour: 1 })]
    const plan = executer(acc, 'Décider les effets', { noeuds: BASE({ 'Revalider le tri': tri, 'Revalider la qualification': qual, 'Lire l’annexe d’autonomie': annexePlafond }) })
    const marque = effets(plan, 'marquer_evenement').length === 1 && effets(plan, 'marquer_evenement')[0].json.ref === 'wa-1'
    const depots = effets(plan, 'deposer').length === 3 && plan.filter((p) => p.json.type_action === 'deposer_conversation').every((p) => p.json.mode === 'auto')
    const reponses = effets(plan, 'repondre_gmail').length === 1 && effets(plan, 'carte').filter((c) => c.json.pour_effet === 'repondre_gmail').length === 2
    const bon = marque && depots && reponses
    return { ok: bon, details: bon ? 'la publicité WhatsApp est marquée lue sans être déposée ; 3 dépôts avec un plafond de 1 (interne, hors plafond) ; 2 litiges restent en carte et la réponse ordinaire part (plafond 1 intact)' : `marqué ${marque} dépôts ${depots} réponses ${reponses}`, sortie: { plan: signe(plan) } }
  })
  essai('gabarit-ent-leads', 'relecture croisée : une carte dont la charge porte une autre organisation est rejetée ; l’organisation de la charge est celle de la copie', () => {
    const rejeu = (charge) => executer(led, 'Cartes en effets', { noeuds: { 'Réglages de la copie (relève)': [it({ organisation_id: ORG })], 'Relève des cartes': [it({ organisation_id: ORG, cle_idempotence: 'facebook:x:fiche_crm:carte', statut: 'approuvee', charge, approbateurs_roles: ['gerant'], approuvee_par_role: 'gerant' })] } })
    const etrangere = rejeu({ effet: 'crm_fiche', type_action: 'fiche_crm', organisation_id: AUTRE }).length === 0
    const sans = rejeu({ effet: 'crm_fiche', type_action: 'fiche_crm' })
    const propre = sans.length === 1 && sans[0].json.organisation_id === ORG
    return { ok: etrangere && propre, details: etrangere && propre ? 'une charge d’une autre organisation est rejetée ; sans organisation dans la charge, c’est celle de la copie qui s’écrit' : `étrangère ${etrangere} propre ${propre}`, sortie: { sans } }
  })
  // ── ACCUEIL
  essai('gabarit-ent-accueil', 'un message d’exemple : tri, qualification notée par le code, fiche CRM une fois, réponse ; le plan simulé = le plan réel ; jamais de prix ni « Presti »', () => {
    const ex = executer(acc, 'Entrée d’exemple')
    const norm = executer(acc, 'Normaliser les entrées', { entrees: ex })
    const ecart = executer(acc, 'Écarter les doublons', { noeuds: { 'Normaliser les entrées': norm, 'Lire les événements traités': [it({})], 'Lire les identités connues': [it({})], 'Réglages de la copie': [it({ organisation_id: ORG })] } })
    const base = (extra = {}) => BASE({ 'Écarter les doublons': ecart, 'Lire la grille': GRILLE, 'Lire l’annexe d’autonomie': annexe(['deposer_conversation', 'fiche_crm', 'reponse_prospect', 'brouillon_boite']), ...extra })
    const sim = executer(acc, 'Effets prévus', { noeuds: base() })
    const cle = ecart[0].json.cle_idempotence
    const tri = executer(acc, 'Revalider le tri', { entrees: [it({ output: { cle_idempotence: cle, classe: 'a_traiter', motif: 'Exemple. Demande réelle.' } })], noeuds: { 'Écarter les doublons': ecart } })
    const sortieQ = (texte) => ({ output: { cle_idempotence: cle, besoin: 'Exemple. Renseignements', reponses_grille: [{ critere_id: 'zone', valeur: 'oui' }, { critere_id: 'delai', valeur: 'oui' }], reponse_proposee: texte, rendez_vous_souhaite: true } })
    const qual = (texte) => executer(acc, 'Revalider la qualification', { entrees: [it(sortieQ(texte))], noeuds: { 'Revalider le tri': tri, 'Lire la grille': GRILLE, 'Réglages de la copie': [it({ organisation_id: ORG })], 'Lire la configuration': [it(CONFIG)] } })
    const q = qual('Exemple. Bonjour, merci pour votre message. Nous revenons vers vous.')
    const reel = executer(acc, 'Décider les effets', { noeuds: base({ 'Revalider le tri': tri, 'Revalider la qualification': q }) })
    const escalade = (() => {
      const exa = [{ json: { ...ex[0].json, ref: 'exemple-litige', corps: 'Exemple. Je vais contacter mon avocat au sujet du sinistre.' } }]
      const nrm = executer(acc, 'Normaliser les entrées', { entrees: exa })
      const ecr = executer(acc, 'Écarter les doublons', { noeuds: { 'Normaliser les entrées': nrm, 'Lire les événements traités': [it({})], 'Lire les identités connues': [it({})], 'Réglages de la copie': [it({ organisation_id: ORG })] } })
      const sim2 = executer(acc, 'Effets prévus', { noeuds: { ...base(), 'Écarter les doublons': ecr } })
      return effets(sim2, 'repondre_gmail').length === 0 && effets(sim2, 'carte').some((c) => c.json.pour_effet === 'repondre_gmail' && c.json.statut_carte === 'a_valider')
    })()
    const refuse = (texte) => { try { qual(texte); return false } catch { return true } }
    const bon = effets(reel, 'crm_fiche').length === 1 && effets(reel, 'deposer').length === 1 && effets(reel, 'repondre_gmail').length === 1 && q[0].json.score === 100 && q[0].json.qualification === 'qualifie'
      && JSON.stringify(signe(sim)) === JSON.stringify(signe(reel)) && refuse('Exemple. Le prix est de 1 200 € TTC.') && refuse('Exemple. Écrit par Presti.') && escalade
    return { ok: bon, details: bon ? 'score 100 calculé par le code ; 1 fiche, 1 dépôt, 1 réponse ; plan simulé = plan réel ; un prix ou « Presti » dans la réponse du modèle est rejeté ; un message qui parle d’avocat ou de sinistre reste une carte, même au niveau 3' : `plan réel ${signe(reel)} / simulé ${signe(sim)}`, sortie: { reel: signe(reel) } }
  })
  // ── MARKETING
  const chaineMkt = (formats, annexeTypes) => {
    const norm = executer(mkt, 'Normaliser les entrées', { entrees: executer(mkt, 'Entrée d’exemple') })
    const ecarte = executer(mkt, 'Écarter ce qui est déjà traité', { noeuds: { 'Réglages de la copie': [it({ organisation_id: ORG })], 'Lire les clés déjà réservées': [it({})], 'Normaliser les entrées': norm } })
    return { norm, ecarte, base: BASE({ 'Normaliser les entrées': norm, 'Écarter ce qui est déjà traité': ecarte, 'Lire les formats validés': formats.length ? formats : [it({})], 'Lire l’annexe d’autonomie': annexe(annexeTypes) }) }
  }
  const PUBS = ['publier_instagram', 'publier_facebook', 'publier_linkedin']
  essai('gabarit-ent-marketing', 'un post Instagram donne une carte de validation : rien ne se publie tant que le format n’a pas ses 3 validations ou si la QA voit une anomalie', () => {
    const a = chaineMkt([], PUBS)
    const planA = executer(mkt, 'Effets prévus', { noeuds: a.base })
    const cartes = effets(planA, 'carte'), valider = effets(planA, 'valider_slack')
    const sansPublier = !planA.some((p) => /^publier_/.test(p.json.effet))
    const b = chaineMkt([it({ organisation_id: ORG, format: 'post_image', validations_positives: 3, ecart_qa: false })], PUBS)
    const planB = executer(mkt, 'Effets prévus', { noeuds: b.base })
    const auto = ['publier_instagram', 'publier_facebook', 'publier_linkedin'].every((e) => effets(planB, e).length === 1 && effets(planB, e)[0].json.mode === 'auto') && effets(planB, 'carte').length === 0
    const c = chaineMkt([it({ organisation_id: ORG, format: 'post_image', validations_positives: 3, ecart_qa: true })], PUBS)
    const planC = executer(mkt, 'Effets prévus', { noeuds: c.base })
    const anomalie = effets(planC, 'carte').length === 3 && !planC.some((p) => /^publier_/.test(p.json.effet))
    const rapport = executer(mkt, 'Normaliser les entrées', { entrees: [it({ source: 'googleads', id: 'campagne-1', campaign: { id: 'campagne-1' }, metrics: { cost_micros: 1234, clicks: 5 } })] })
    const planR = executer(mkt, 'Effets prévus', { noeuds: { ...a.base, 'Écarter ce qui est déjà traité': [...a.ecarte, ...rapport] } })
    const unIndicateur = (p) => effets(p, 'indicateur').length === 1 && effets(p, 'indicateur')[0].json.indicateur.clics === 5 && effets(p, 'indicateur')[0].json.mode === 'auto'
    const cle = a.norm[0].json.cle_idempotence
    const rev = executer(mkt, 'Revalider le rédacteur', { entrees: [it({ output: { cle_idempotence: cle, textes: { instagram: 'Exemple. Une journée avec l’équipe.', facebook: 'Exemple. Une journée avec l’équipe.', linkedin: 'Exemple. Un projet signé Presti.' } } })], noeuds: { 'Entrées à rédiger': a.norm } })
    const planD = executer(mkt, 'Décider les effets', { noeuds: { ...b.base, 'Revalider le rédacteur': rev } })
    const qa = rev[0].json.qa_ok === false && !planD.some((p) => /^publier_/.test(p.json.effet))
    const planE = executer(mkt, 'Décider les effets', { noeuds: { ...b.base, 'Écarter ce qui est déjà traité': [...a.ecarte, ...rapport], 'Revalider le rédacteur': rev } })
    const indicateur = unIndicateur(planR) && unIndicateur(planE)
    const bon = cartes.length === 3 && cartes.every((c2) => c2.json.statut_carte === 'a_valider' && c2.json.approbateurs_roles.join() === 'associe') && valider.length === 3 && valider.every((v) => v.json.canal_equipe === 'CANAL_MARKETING_EXEMPLE') && sansPublier && auto && anomalie && qa && indicateur
    return { ok: bon, details: bon ? '0 validation : 3 cartes « À valider » + 3 demandes Slack, aucune publication ; 3 validations et QA propre : publication seule ; anomalie ou « Presti » dans un texte : retour en validation' : `A cartes ${cartes.length} valider ${valider.length} sans publier ${sansPublier} ; B auto ${auto} ; C anomalie ${anomalie} ; D qa ${qa} ; rapport ${indicateur}`, sortie: { sansValidation: signe(planA), formatValide: signe(planB) } }
  })
  // ── VENTES : le montant vient du code
  essai('gabarit-ent-ventes', 'un devis donne un montant tiré du code (et du tarif du client), jamais du modèle ; un prix estimé ne part pas seul', () => {
    const ex = executer(ven, 'Entrée d’exemple')
    const norm = executer(ven, 'Normaliser les opportunités', { entrees: ex })
    const route = executer(ven, 'Router les opportunités', { noeuds: { 'Normaliser les opportunités': norm, 'Réglages de la copie': [it({ organisation_id: ORG })], 'Lire la configuration': [it(CONFIG)], 'Lire les clés déjà réservées': [it({})] } })
    const aProposer = route.filter((r) => r.json.a_proposer), aRelancer = route.filter((r) => r.json.a_relancer)
    const cle = aProposer[0].json.cle_idempotence
    const sortie = (lignes) => [it({ output: { cle_idempotence: cle, introduction: 'Exemple. Voici notre proposition.', lignes, montant_ttc_centimes: 1, total_ttc_centimes: 1 } })]
    const montants = (lignes, tarifs = TARIFS) => executer(ven, 'Calculer les montants', { entrees: sortie(lignes), noeuds: { 'Entrées à proposer': aProposer, 'Lire les tarifs': tarifs, 'Réglages de la copie': [it({ organisation_id: ORG })] } })
    const m = montants([{ ref_tarif: 'exemple-intervention', quantite: 2 }, { ref_tarif: 'exemple-fourniture', quantite: 1 }])
    const exact = m[0].json.total_ht_centimes === 25000 && m[0].json.total_tva_centimes === 5000 && m[0].json.total_ttc_centimes === 30000 && m[0].json.estime === false
    const inconnu = montants([{ ref_tarif: 'inconnue', quantite: 1 }])
    const estime = inconnu[0].json.estime === true && inconnu[0].json.total_ttc_centimes === null
    const rev = executer(ven, 'Revalider le relanceur', { entrees: [it({ output: { cle_idempotence: aRelancer[0].json.cle_idempotence, interet: 'tiede', motif_interet: 'Exemple. Une relance suffit.', objet: 'Exemple. Votre proposition', texte: 'Exemple. Bonjour, avez-vous pu la regarder ?' } })], noeuds: { 'Entrées à relancer': aRelancer } })
    const dec = (mm) => executer(ven, 'Décider les effets', { noeuds: BASE({ 'Router les opportunités': route, 'Calculer les montants': mm, 'Revalider le relanceur': rev, 'Lire l’annexe d’autonomie': annexe(['proposition_crm', 'demande_signature', 'relance_vente', 'note_interet']) }) })
    const plan = dec(m), planEstime = dec(inconnu)
    const crm = effets(plan, 'crm_proposition')[0]?.json
    const signe2 = effets(plan, 'signature_yousign').length === 0 && effets(plan, 'carte').some((c) => c.json.pour_effet === 'signature_yousign' && c.json.statut_carte === 'a_valider')
    const carteEstime = effets(planEstime, 'crm_proposition').length === 0 && effets(planEstime, 'signature_yousign').length === 0 && effets(planEstime, 'carte').length >= 2
    const sim = executer(ven, 'Effets prévus', { noeuds: BASE({ 'Router les opportunités': route, 'Lire les tarifs': TARIFS, 'Lire l’annexe d’autonomie': annexe(['proposition_crm', 'demande_signature', 'relance_vente', 'note_interet']) }) })
    const simOk = effets(sim, 'crm_proposition')[0]?.json?.total_ttc_centimes === 30000
    const relance = effets(plan, 'relance_gmail').length === 1 && effets(plan, 'note_plateforme').length === 1
    const bon = exact && estime && crm?.total_ttc_centimes === 30000 && signe2 && carteEstime && simOk && relance
    return { ok: bon, details: bon ? '2×100 € + 1×50 € HT = 250 € HT, TVA 50 €, 300 € TTC calculés par le code en centimes (le « 1 » du modèle est ignoré) ; la demande de signature reste une carte, même au niveau 3 ; tarif inconnu : estimé, tout passe en carte ; simulation = 30000 aussi' : `exact ${exact} estimé ${estime} crm ${crm?.total_ttc_centimes} signature ${signe2} carteEstime ${carteEstime} sim ${simOk} relance ${relance}`, sortie: { montants: m, plan: signe(plan) } }
  })
  // ── UNE AUTRE ORGANISATION : rien
  essai('gabarit-ent-leads', 'une autre organisation : rien (lignes lues, cartes approuvées, configuration)', () => {
    const ex = executer(led, 'Entrée d’exemple')
    const norm = executer(led, 'Normaliser les leads', { entrees: ex })
    const cles = norm[0].json.cles_identite
    const etranger = it({ organisation_id: AUTRE, cle_conversation: 'conversation-etrangere', cles_identite: cles, crm_ref: 'ref-etrangere' })
    const { ecart } = chaineLeads([etranger])
    const pasConnu = ecart[0].json.nouveau_lead === true
    const cartes = (liste) => executer(led, 'Cartes en effets', { noeuds: { 'Réglages de la copie (relève)': [it({ organisation_id: ORG })], 'Relève des cartes': liste } })
    const charge = { effet: 'crm_fiche', type_action: 'fiche_crm', organisation_id: ORG, crm: 'hubspot' }
    const carte = (o) => it({ organisation_id: ORG, cle_idempotence: 'facebook:x:fiche_crm:carte', statut: 'approuvee', charge, approbateurs_roles: ['gerant'], approuvee_par_role: 'gerant', ...o })
    const etrangere = cartes([carte({ organisation_id: AUTRE })]).length === 0
    const mauvaisRole = cartes([carte({ approuvee_par_role: 'compagnon' })]).length === 0 && cartes([carte({ approuvee_par_role: null })]).length === 0
    const bonneCarte = cartes([carte({})])
    const bonRole = bonneCarte.length === 1 && /:approuvee$/.test(bonneCarte[0].json.cle_idempotence) && bonneCarte[0].json.carte_cle === 'facebook:x:fiche_crm:carte'
    const enFile = cartes([carte({ statut: 'file_demain', approuvee_par_role: null, approbateurs_roles: [] })])
    const file = enFile.length === 1 && /:file$/.test(enFile[0].json.cle_idempotence)
    const autreOrg = { 'Lire la configuration': [it({ ...CONFIG, organisation_id: AUTRE })], 'Lire l’annexe d’autonomie': annexe(['deposer_conversation', 'fiche_crm']).map((r) => ({ json: { ...r.json, organisation_id: AUTRE } })) }
    const cle = ecart[0].json.cle_idempotence
    const rev = executer(led, 'Revalider le rédacteur', { entrees: [it({ output: { cle_idempotence: cle, canal_conseille: 'courriel', objet: 'Exemple. Merci', texte: 'Exemple. Bonjour, merci pour votre demande.' } })], noeuds: BASE({ 'Écarter les doublons': ecart }) })
    const simAutre = executer(led, 'Effets prévus', { noeuds: { ...baseLeads(ecart), ...autreOrg } })
    const reelAutre = executer(led, 'Décider les effets', { noeuds: { ...baseLeads(ecart, { 'Revalider le rédacteur': rev }), ...autreOrg } })
    const rien = [simAutre, reelAutre].every((plan) => effets(plan, 'crm_fiche').length === 0 && plan.every((p) => p.json.mode !== 'auto' || p.json.type_action === 'deposer_conversation'))
    const bon = pasConnu && etrangere && mauvaisRole && bonRole && file && rien
    return { ok: bon, details: bon ? 'la conversation d’une autre organisation ne dédoublonne pas ; sa carte approuvée est ignorée ; un rôle hors de la liste (C6) est ignoré ; la bonne carte rejoue sous une clé « :approuvee » ; la configuration d’une autre organisation ne donne aucune fiche' : `inconnu ${pasConnu} étrangère ${etrangere} rôle ${mauvaisRole} bonne ${bonRole} file ${file} config ${rien}`, sortie: { bonneCarte } }
  })
  return { resultats, sorties }
}

// ─── Le juge commun sur un gabarit à validation humaine native : permis dans gabarit-ent-*, refusé ailleurs ─────────────────────────────
function jugeCommunHitl(accueilWf, registre) {
  const sortie = []
  for (const [nomFichier, nomWf, attendu] of [['ent', 'gabarit-ent-accueil', true], ['hors', 'gabarit-accueil', false]]) {
    const wf = copie(accueilWf); wf.name = nomWf
    wf.nodes.push({ id: 'hitl', name: 'Demander l’accord de l’équipe', type: B('slackHitlTool'), typeVersion: 2.7, position: [0, 0], notes: 'outil: lecture\nValidation d’équipe par Slack avant un appel d’outil.',
      parameters: { resource: 'message', operation: 'sendAndWait', select: 'channel', channelId: { __rl: true, mode: 'id', value: 'CANAL_EXEMPLE' }, message: 'Exemple. {{ $tool.name }}', responseType: 'approval', options: { appendAttribution: false } } })
    wf.connections['Demander l’accord de l’équipe'] = { ai_tool: [[{ node: 'Qualificateur', type: 'ai_tool', index: 0 }]] }
    const dir = mkdtempSync(path.join(tmpdir(), 'gabarits-ent-'))
    try {
      mkdirSync(path.join(dir, nomFichier))
      writeFileSync(path.join(dir, nomFichier, `${nomWf}.workflow.json`), JSON.stringify(wf))
      writeFileSync(path.join(dir, nomFichier, 'empreintes-code.json'), JSON.stringify({ [nomWf]: registre['gabarit-ent-accueil'] }))
      const r = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--import', './scripts/ts-loader.mjs', 'scripts/n8n-specs-qa.mjs', path.join(dir, nomFichier)], { cwd: RACINE, encoding: 'utf8', timeout: 120000 })
      const ligne = (r.stdout.split('\n').find((l) => /^[✓✗] .*\.workflow\.json/.test(l)) ?? '')
      const hitl = r.stdout.split('\n').filter((l) => /R23 .*validation humaine/.test(l))
      sortie.push({ nom: nomWf, attendu, bon: attendu ? ligne.startsWith('✓') : ligne.startsWith('✗') && hitl.length > 0, ligne: ligne.slice(0, 160) })
    } finally { rmSync(dir, { recursive: true, force: true }) }
  }
  return sortie
}

// ─── 3. MUTANTS ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const noeud = (wf, nom) => { const n = wf.nodes.find((x) => x.name === nom); if (!n) throw new Error('nœud absent : ' + nom); return n }
const remplacer = (wf, nom, avant, apres) => { const n = noeud(wf, nom); if (!n.parameters.jsCode.includes(avant)) throw new Error(`mutant inapplicable : « ${avant.slice(0, 50)} » absent de ${nom}`); n.parameters.jsCode = n.parameters.jsCode.replace(avant, apres) }
const MUTANTS = [
  ['un lead en double (le même contact par deux canaux crée deux fiches)', 'gabarit-ent-leads', (wf) => remplacer(wf, 'Écarter les doublons', 'nouveau_lead: !connu && pareil === undefined', 'nouveau_lead: true'), /deux canaux/],
  ['un désinscrit relancé', 'gabarit-ent-leads', (wf) => remplacer(wf, 'Contrôler les envois', "if ((p.cles_identite ?? []).some((k) => desinscrits.has(k)))", 'if (false)'), /désinscrit/],
  ['un quota d’envoi ignoré', 'gabarit-ent-leads', (wf) => remplacer(wf, 'Contrôler les envois', 'if (restes[p.type_action] <= 0)', 'if (false)'), /quota/],
  ['une publication sans validation (le format n’a aucune validation)', 'gabarit-ent-marketing', (wf) => remplacer(wf, 'Décider les effets', 'const exigeHumain = !VALIDES(e.format) || !r.qa_ok || formatNonGere;', 'const exigeHumain = false;'), /carte de validation/],
  ['une publication sans validation (la QA voit une anomalie)', 'gabarit-ent-marketing', (wf) => remplacer(wf, 'Décider les effets', 'const exigeHumain = !VALIDES(e.format) || !r.qa_ok || formatNonGere;', 'const exigeHumain = !VALIDES(e.format) || formatNonGere;'), /carte de validation/],
  ['une collecte LinkedIn (lecture de profils)', 'gabarit-ent-leads', (wf) => { wf.nodes.push({ id: 'lk', name: 'Lire les profils', type: B('httpRequest'), typeVersion: 4.5, position: [0, 0], parameters: { method: 'GET', url: 'https://api.linkedin.com/v2/people', options: {} } }) }, /S8 .*LinkedIn/],
  ['une collecte LinkedIn (le nœud LinkedIn lit)', 'gabarit-ent-marketing', (wf) => { noeud(wf, 'LinkedIn : publier').parameters.operation = 'getAll' }, /S8 .*LinkedIn/],
  ['un montant du modèle', 'gabarit-ent-ventes', (wf) => remplacer(wf, 'Calculer les montants', 'total_ttc_centimes: estime ? null : ht + tva', 'total_ttc_centimes: s.montant_ttc_centimes ?? (estime ? null : ht + tva)'), /devis donne un montant/],
  ['un score donné par le modèle', 'gabarit-ent-leads', (wf) => remplacer(wf, 'Revalider le rédacteur', 'score: n.score', 'score: s.score ?? n.score'), /lead Facebook/],
  ['une organisation lue sans filtre (la requête)', 'gabarit-ent-leads', (wf) => { const q = noeud(wf, 'Lire les désinscrits').parameters.queryParameters; q.parameters = q.parameters.filter((p) => p.name !== 'organisation_id') }, /S7 .*Lire les désinscrits.*filtre organisation/],
  ['une organisation lue sans filtre (la ligne d’une autre organisation passe dans le code)', 'gabarit-ent-leads', (wf) => remplacer(wf, 'Écarter les doublons', ".filter((x) => x.organisation_id === org)) for", ') for'), /autre organisation/],
  ['une organisation lue sans filtre (la configuration d’une autre organisation)', 'gabarit-ent-leads', (wf) => remplacer(wf, 'Décider les effets', 'const mien = (r) => !!r && r.organisation_id === org;', 'const mien = (r) => !!r;'), /autre organisation/],
  ['une écriture sans organisation', 'gabarit-ent-accueil', (wf) => { const n = noeud(wf, 'Déposer le message'); n.parameters.jsonBody = n.parameters.jsonBody.replace('organisation_id: ', 'autre_id: ') }, /S7 .*Déposer le message/],
  ['un identifiant branché', 'gabarit-ent-accueil', (wf) => { noeud(wf, 'Répondre par Gmail').credentials = { gmailOAuth2: { id: 'IdentifiantFictif09', name: 'Gmail du client' } } }, /S3 .*Répondre par Gmail/],
  ['un identifiant de la base branché', 'gabarit-ent-ventes', (wf) => { noeud(wf, 'Lire les tarifs').credentials = { supabaseApi: { id: 'IdentifiantFictif01', name: 'Supabase account' } } }, /S3 .*Lire les tarifs/],
  ['« Presti » dans un message du client (le texte envoyé)', 'gabarit-ent-accueil', (wf) => { noeud(wf, 'Répondre par Gmail').parameters.message += ' — envoyé avec Presti' }, /S9 .*Répondre par Gmail/],
  ['« Presti » dans un message du client (la revalidation le laisse passer)', 'gabarit-ent-accueil', (wf) => remplacer(wf, 'Revalider la qualification', "if (/presti/i.test(t)) throw new Error('nom de la plateforme dans un texte pour un tiers (marque blanche)');", ''), /lead|message d’exemple/],
  ['« Presti » dans un message du client (le message de la plateforme)', 'gabarit-ent-leads', (wf) => { noeud(wf, 'Brevo : envoyer le premier message').parameters.jsonBody += ' Presti' }, /S9 .*Brevo/],
  ['la mention de l’assistant ôtée d’un envoi', 'gabarit-ent-ventes', (wf) => { const n = noeud(wf, 'Répondre par Outlook'); n.parameters.bodyContent = n.parameters.bodyContent.replace(MENTION, 'Cordialement') }, /S10 .*Répondre par Outlook/],
  ['le nœud Facebook Graph retiré', 'gabarit-ent-leads', (wf) => { wf.nodes = wf.nodes.filter((n) => n.type !== B('facebookGraphApi')) }, /S2 .*facebookGraphApi/],
  ['le nœud Brevo retiré', 'gabarit-ent-leads', (wf) => { wf.nodes = wf.nodes.filter((n) => n.type !== B('sendInBlue')) }, /S2 .*sendInBlue/],
  ['un webhook ajouté', 'gabarit-ent-accueil', (wf) => { wf.nodes.push({ id: 'wh', name: 'Entrée publique', type: B('webhook'), typeVersion: 2, position: [0, 0], parameters: { path: 'exemple' } }) }, /S4 .*Entrée publique/],
  ['un déclencheur Facebook Lead Ads à webhook (à lire par l’API Graph)', 'gabarit-ent-leads', (wf) => { wf.nodes.push({ id: 'fl', name: 'Nouveau lead', type: B('facebookLeadAdsTrigger'), typeVersion: 1, position: [0, 0], parameters: {} }) }, /S4 .*Nouveau lead/],
  ['un outil d’agent sans note de lecture', 'gabarit-ent-accueil', (wf) => { delete noeud(wf, 'Lire le fil Gmail').notes }, /S6 .*Lire le fil Gmail/],
  ['un schéma du modèle qui porte un montant', 'gabarit-ent-ventes', (wf) => { const p = noeud(wf, 'Schéma : Rédacteur de propositions').parameters; const s = JSON.parse(p.inputSchema); s.properties.montant_ttc = { type: 'number' }; p.inputSchema = JSON.stringify(s) }, /S6 .*montant/],
  ['la porte de la relève retirée de la vérification (échec ouvert)', 'gabarit-ent-marketing', (wf) => { noeud(wf, 'Porte simulation').parameters.conditions.conditions[0].leftValue = "={{ $('Lire la configuration').first()?.json?.simulation === true }}" }, /S5 .*fermée/],
  ['la validation d’équipe retirée', 'gabarit-ent-marketing', (wf) => { wf.nodes = wf.nodes.filter((n) => n.name !== 'Valider par Teams') }, /S11 .*validation/],
  ['une carte approuvée par un rôle qui n’est pas le sien (C6)', 'gabarit-ent-leads', (wf) => remplacer(wf, 'Cartes en effets', "&& Array.isArray(c.approbateurs_roles) && !!c.approuvee_par_role && c.approbateurs_roles.includes(c.approuvee_par_role)", ''), /autre organisation/],
  ['le plan réel qui s’écarte du plan simulé (un effet perdu)', 'gabarit-ent-leads', (wf) => remplacer(wf, 'Décider les effets', "if (l.nouveau_lead && crm !== 'aucun')", "if (false && crm !== 'aucun')"), /lead Facebook/],
  ['une action seulement réservée compte comme un envoi parti', 'gabarit-ent-leads', (wf) => remplacer(wf, 'Contrôler les envois', "i.json.statut === 'faite'", "i.json.statut !== 'refusee'"), /quota/],
  ['une carte faite compte dans le plafond du jour', 'gabarit-ent-leads', (wf) => remplacer(wf, 'Décider les effets', " && r.json.effet !== 'carte'", ''), /plafond du jour/],
  ['le plafond du jour de l’annexe ignoré', 'gabarit-ent-leads', (wf) => remplacer(wf, 'Décider les effets', 'if (restes[t] <= 0) return \'carte\';', ''), /plafond du jour/],
  ['un rapport publicitaire perdu en route (marketing)', 'gabarit-ent-marketing', (wf) => remplacer(wf, 'Décider les effets', "if (e.genre === 'rapport') {", "if (false) {"), /carte de validation/],
  ['l’autonomie par défaut devient « part seul »', 'gabarit-ent-leads', (wf) => remplacer(wf, 'Décider les effets', 'DEFAUTS[t] ?? 2', 'DEFAUTS[t] ?? 3'), /autonomie par défaut/],
  ['la fenêtre d’annulation ignorée', 'gabarit-ent-leads', (wf) => remplacer(wf, 'Décider les effets', 'if (m === \'auto\' && delai > 0 && !INTERNES.includes(type))', 'if (false)'), /autonomie par défaut/],
  ['la demande de signature part seule', 'gabarit-ent-ventes', (wf) => remplacer(wf, 'Décider les effets', "const JAMAIS_AUTO = ['demande_signature'];", 'const JAMAIS_AUTO = [];'), /devis donne un montant/],
  ['une réponse automatique à un litige', 'gabarit-ent-accueil', (wf) => { for (const nom of ['Décider les effets', 'Effets prévus']) remplacer(wf, nom, 'ESCALADE.test(t.sujet + \' \' + t.corps)', 'false') }, /un message d’exemple/],
  ['la file du lendemain rejouée tout de suite', 'gabarit-ent-leads', (wf) => remplacer(wf, 'Cartes en effets', "const enFile = c.statut === 'file_demain';", "const enFile = c.statut === 'file_demain';\n  if (c.statut === 'annulable') rendu.push({ json: { ...c.charge, mode: 'auto', cle_idempotence: 'x:differee' } });"), /autonomie par défaut/],
  ['les relances consomment le quota des séquences', 'gabarit-ent-leads', (wf) => remplacer(wf, 'Contrôler les envois', 'relance_vente: Math.max(0, Math.floor(Number(regles.quota_relances_jour ?? 50)))', 'relance_vente: 0'), /deux plafonds distincts|devis|quota/],
  ['ManyChat échappe à la désinscription', 'gabarit-ent-leads', (wf) => remplacer(wf, 'Contrôler les envois', '/^(sequence_|relance_|manychat)/', '/^(sequence_|relance_)/'), /deux plafonds distincts/],
  ['un rapport publicitaire sans date dans sa clé', 'gabarit-ent-leads', (wf) => remplacer(wf, 'Normaliser les leads', " + ':' + new Date().toISOString().slice(0, 10)), cles_identite: [], indicateur", "), cles_identite: [], indicateur"), /deux plafonds distincts/],
  ['le score d’un lead lit le prototype', 'gabarit-ent-leads', (wf) => remplacer(wf, 'Revalider le rédacteur', 'Object.prototype.hasOwnProperty.call(t, k) ? Math.floor(Number(t[k]) || 0) : 0', 'Math.floor(Number(t[k]))'), /deux plafonds distincts/],
  ['une relance par semaine, sans fin (plus de rang)', 'gabarit-ent-ventes', (wf) => remplacer(wf, 'Router les opportunités', 'rang >= 1 && rang <= 3', 'rang >= 1'), /relance par rang/],
  ['une proposition déjà réservée repart au modèle', 'gabarit-ent-ventes', (wf) => remplacer(wf, 'Router les opportunités', "!pris(o.cle_idempotence + ':proposition_crm')", 'true'), /relance par rang/],
  ['un prix nul accepté dans le tarif', 'gabarit-ent-ventes', (wf) => { for (const nom of ['Calculer les montants']) remplacer(wf, nom, 't.prix_ht_centimes > 0 && ', '') }, /relance par rang/],
  ['une TVA hors des taux français acceptée', 'gabarit-ent-ventes', (wf) => remplacer(wf, 'Calculer les montants', '&& TVA.includes(Number(t.tva_pct))', ''), /relance par rang/],
  ['un commentaire déjà réservé repart au modèle', 'gabarit-ent-marketing', (wf) => remplacer(wf, 'Écarter ce qui est déjà traité', "i.json.genre === 'rapport' || !traite(i.json.cle_idempotence)", 'true'), /déjà réservé ne repart pas/],
  ['l’événement de la plateforme n’est plus marqué lu', 'gabarit-ent-accueil', (wf) => remplacer(wf, 'Décider les effets', "if (t.source === 'plateforme') poser('marquer_evenement'", "if (false) poser('marquer_evenement'"), /marqué lu/],
  ['le dépôt interne consomme le plafond', 'gabarit-ent-accueil', (wf) => remplacer(wf, 'Décider les effets', "  if (INTERNES.includes(t)) return 'auto';\n", ''), /marqué lu/],
  ['un geste forcé en carte consomme le plafond', 'gabarit-ent-accueil', (wf) => remplacer(wf, 'Décider les effets', "if (forcer && m0 === 'auto' && restes[type] !== undefined) restes[type] += 1;", ''), /marqué lu/],
  ['une carte avec la charge d’une autre organisation', 'gabarit-ent-leads', (wf) => remplacer(wf, 'Cartes en effets', "if (c.charge.organisation_id !== undefined && c.charge.organisation_id !== org) continue;", ''), /charge porte une autre organisation/],
  ['le contact Brevo lu par getAll', 'gabarit-ent-leads', (wf) => { noeud(wf, 'Brevo : lire le contact').parameters.operation = 'getAll' }, /S14 .*Brevo/],
  ['une erreur Brevo vaut « autorisé »', 'gabarit-ent-leads', (wf) => { noeud(wf, 'Brevo : contact autorisé ?').parameters.conditions.conditions[0].leftValue = '={{ $json.emailBlacklisted !== true }}' }, /S14 .*échec fermé|S14 .*Brevo/],
  ['le message Brevo sans désinscription', 'gabarit-ent-leads', (wf) => { const n = noeud(wf, 'Brevo : envoyer le premier message'); n.parameters.jsonBody = n.parameters.jsonBody.replace('List-Unsubscribe', 'X-Autre') }, /S14 .*désinscription/],
  ['le courrier IMAP marqué lu en simulation', 'gabarit-ent-accueil', (wf) => { noeud(wf, 'Boîte IMAP du client').parameters.postProcessAction = 'read' }, /S14 .*IMAP|S14 .*lu/],
  ['un événement lu par deux gabarits', 'gabarit-ent-leads', (wf) => { const q = noeud(wf, 'Lire les événements des canaux').parameters.queryParameters.parameters; q.find((p) => p.name === 'categorie').value = 'eq.message' }, /S14 .*un seul gabarit/],
  ['les événements ne sont jamais marqués lus', 'gabarit-ent-accueil', (wf) => { wf.nodes = wf.nodes.filter((n) => n.name !== 'Marquer l’événement lu') }, /S14 .*jamais marqués/],
  ['une anomalie de texte lève une exception au lieu d’une carte', 'gabarit-ent-marketing', (wf) => remplacer(wf, 'Revalider le rédacteur', "const s = sorties[i] && sorties[i].cle_idempotence === e.cle_idempotence ? sorties[i] : null;", "if (!sorties[i] || sorties[i].cle_idempotence !== e.cle_idempotence) throw new Error('sortie hors ordre');\n  const s = sorties[i];"), /anomalie devient une carte/],
  ['une carte « à corriger » est rejouée', 'gabarit-ent-marketing', (wf) => remplacer(wf, 'Cartes en effets', 'if (c.charge.a_corriger === true) continue;', ''), /anomalie devient une carte/],
  ['un format non géré publié quand même', 'gabarit-ent-marketing', (wf) => remplacer(wf, 'Décider les effets', 'const exigeHumain = !VALIDES(e.format) || !r.qa_ok || formatNonGere;', 'const exigeHumain = !VALIDES(e.format) || !r.qa_ok;'), /anomalie devient une carte|carte de validation/],
  ['un litige en commentaire répondu seul', 'gabarit-ent-marketing', (wf) => remplacer(wf, 'Décider les effets', " || ESCALADE.test(e.texte_recu ?? '')", ''), /anomalie devient une carte/],
  ['la validation d’équipe sans le texte à valider', 'gabarit-ent-marketing', (wf) => remplacer(wf, 'Décider les effets', " + (c.json.charge && c.json.charge.texte ? '\\n\\n' + c.json.charge.texte : '')", ''), /anomalie devient une carte/],
  ['l’approbation écrase une carte déjà refusée', 'gabarit-ent-marketing', (wf) => { const p = noeud(wf, 'Approuver la carte (Slack)').parameters.queryParameters; p.parameters = p.parameters.filter((q) => q.name !== 'statut') }, /S11 .*a_valider/],
  ['les actions ne sont plus réservées avant l’effet', 'gabarit-ent-accueil', (wf) => { wf.nodes = wf.nodes.filter((n) => n.name !== 'Réserver les actions') }, /S12 .*réservées/],
]

// ─── Lancement ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
let echecs = 0
const dire = (ok, m) => { console.log(`${ok ? '✓' : '✗'} ${m}`); if (!ok) echecs++ }
const charger = () => Object.fromEntries(NOMS.map((n) => { const f = path.join(DOSSIER, `${n}.workflow.json`); if (!existsSync(f)) throw new Error('export absent : ' + f); return [n, JSON.parse(readFileSync(f, 'utf8'))] }))
const evaluer = (w) => ({ structure: NOMS.flatMap((n) => structure(w[n]).map((m) => `${n} : ${m}`)), ...essais(w) })

const base = charger()
const registre = JSON.parse(readFileSync(path.join(DOSSIER, 'empreintes-code.json'), 'utf8'))
console.log(`mention d'IA relue dans lib/mentionAssistant.ts : « ${MENTION} »`)
// Les empreintes : le registre doit dire vrai (le juge commun le contrôle aussi ; ici pour que les mutants ne soient pas jugés sur du faux)
for (const n of NOMS) for (const c of base[n].nodes.filter((x) => x.type === B('code'))) {
  const h = createHash('sha256').update(c.parameters.jsCode, 'utf8').digest('hex')
  if (registre[n]?.[c.name] !== h) dire(false, `${n} : l'empreinte de « ${c.name} » ne correspond pas au registre`)
}
const e0 = evaluer(base)
for (const m of e0.structure) dire(false, m)
dire(e0.structure.length === 0, `structure des 4 gabarits (${NOMS.map((n) => `${n.replace('gabarit-ent-', '')} ${base[n].nodes.length} nœuds`).join(', ')})`)
for (const r of e0.resultats) dire(r.ok, `essai ${r.workflow} : ${r.nom}\n      → ${r.details}`)
const hitl = jugeCommunHitl(base['gabarit-ent-accueil'], registre)
for (const h of hitl) dire(h.bon, `validation humaine native (slackHitlTool) ${h.attendu ? 'permise dans' : 'refusée hors de'} ${h.nom} par le juge commun : ${h.ligne}`)

// Les essais sont rangés à côté des exports : épingles « Exemple. », sortie de chaque rejeu.
const essaisJson = e0.sorties.map((s, i) => ({ ...s, verdict: e0.resultats[i]?.ok ? 'vert' : 'rouge', mode: 'rejeu hors ligne des nœuds Code des exports (node:vm), épingles « Exemple. » ; test_workflow de n8n non joué par ce juge' }))
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
  console.log(`gabarits-entreprise-qa : ${NOMS.length} gabarits, ${e0.resultats.length} essais, ${MUTANTS.length} mutants`)
  if (verts) { console.log(`✗ ${verts} mutant(s) laissent le juge vert`); echecs++ }
} else console.log('mutants non joués : la base n’est pas verte, ils ne prouveraient rien')
if (echecs) { console.log('ÉCHEC'); process.exit(1) }
console.log('OK')
