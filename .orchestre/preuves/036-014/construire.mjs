// 036-014 — fabrique des trois gabarits OUTILLÉS de l'argent (prompt 6, outillage, lot 2 ; OUTILLAGE.md § 5, lignes 2 à 4) :
//   gabarit-artisan-devis · gabarit-artisan-suivi · gabarit-artisan-facturation
// Le geste des vidéos et des dépôts : un déclencheur, un agent IA (Claude, parseur, outils de LECTURE), puis les nœuds d'écriture des vrais outils, la porte
// « simulation » devant chaque effet. Tout est inactif et SANS identifiant (un gabarit n'a aucun compte : la copie du client reçoit les siens, branchés par lui).
// « Le code calcule les montants » : le modèle ne voit aucun prix et ne peut en écrire aucun (schéma strict, revalidation) ; un prix est LU dans les tarifs ou la base.
//   node .orchestre/preuves/036-014/construire.mjs --json <dossier>   → les trois exports attendus + empreintes-code.json
//   node .orchestre/preuves/036-014/construire.mjs --ops <dossier>    → les opérations update_workflow de chaque gabarit (par lots de 80)
import { writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { DEVIS, SUIVI, FACTURATION } from './codes.mjs'

const SUPA = 'https://gorcdvmueakcncsmrouo.supabase.co'
const REST = `${SUPA}/rest/v1`
export const ID_ERREUR_COMMUNE = 'yekMM9ewk03F9y2q' // lib-erreur-commune
export const ID = { devis: 'dNikTYPKKsivUbd3', conflit: 'F2son8oGwifPETg3' } // presti-dep-devis (036-005), lib-controler-conflit (036-004)
const MENTION = 'Message rédigé et envoyé automatiquement par l’assistant'
const hash = (...p) => createHash('sha1').update(p.join('|')).digest('hex')
const uuid = (...p) => { const h = hash(...p); return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}` }

// ─── Les briques ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const noeud = (type, typeVersion, name, parameters, extra = {}) => ({ type, typeVersion, name, parameters, ...extra })
const B = (t) => `n8n-nodes-base.${t}`, LC = (t) => `@n8n/n8n-nodes-langchain.${t}`
const code = (name, jsCode, notes) => noeud(B('code'), 2, name, { mode: 'runOnceForAllItems', language: 'javaScript', jsCode }, notes ? { notes } : {})
const planifie = (name, rule) => noeud(B('scheduleTrigger'), 1.2, name, { rule: { interval: [rule] } }, { notes: 'Déclencheur à intervalle : n8n d\'Oracle n\'est pas exposé à Internet, aucun webhook (R22).' })
const auth = { authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi' }
const filtre = () => [
  { name: 'organisation_id', value: `=eq.{{ $('Préparer').first().json.organisation_id }}` },
  { name: 'artisan_id', value: `=eq.{{ $('Préparer').first().json.organisation_id }}` },
]
/** Une lecture de la plateforme (API REST de Supabase) : colonnes nommées, filtre du compte, jamais de jointure. Lue une fois, même vide. */
const lire = (name, table, select, extra = [], notes) => noeud(B('httpRequest'), 4.2, name, {
  method: 'GET', url: `${REST}/${table}`, ...auth, sendQuery: true, specifyQuery: 'keypair',
  queryParameters: { parameters: [{ name: 'select', value: select }, ...filtre(), ...extra, { name: 'limit', value: '200' }] }, options: {},
}, { executeOnce: true, alwaysOutputData: true, ...(notes ? { notes } : {}) })
/** Une écriture dans la plateforme : idempotente (la clé est unique par compte), le compte dans le corps. */
const ecrire = (name, table, corps, notes, conflit = true) => noeud(B('httpRequest'), 4.2, name, {
  method: 'POST', url: `${REST}/${table}${conflit ? '?on_conflict=organisation_id,cle' : ''}`, ...auth, sendHeaders: true,
  headerParameters: { parameters: [{ name: 'Prefer', value: 'resolution=ignore-duplicates' }] }, sendBody: true, specifyBody: 'json', jsonBody: `={{ JSON.stringify(${corps}) }}`, options: {},
}, { notes })
const porte = (name, quoi, expr = '$json.simulation') => noeud(B('if'), 2.2, name, {
  conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
    conditions: [{ id: uuid('porte', name), leftValue: `={{ ${expr} }}`, rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, options: {},
}, { notes: `porte: simulation\nVrai : simulation, rien ne part (${quoi}). Faux : l'effet réel. Une simulation absente ou illisible est une erreur, jamais un « faux ».` })
const si = (name, expr, notes) => noeud(B('if'), 2.2, name, {
  conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
    conditions: [{ id: uuid('si', name), leftValue: expr, rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, options: {},
}, notes ? { notes } : {})
const aiguilleur = (name, expr, valeurs, notes) => noeud(B('switch'), 3.2, name, {
  rules: { values: valeurs.map((v) => ({ conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
    conditions: [{ id: uuid('sw', name, v), leftValue: expr, rightValue: v, operator: { type: 'string', operation: 'equals' } }], combinator: 'and' }, renameOutput: true, outputKey: v })) },
  options: { fallbackOutput: 'extra', renameFallbackOutput: 'autre' },
}, notes ? { notes } : {})
const agent = (name, texte, systeme, max = 4) => noeud(LC('agent'), 3.1, name, { promptType: 'define', text: texte, hasOutputParser: true,
  options: { systemMessage: systeme, maxIterations: max, passthroughBinaryImages: false } }, { notes: 'Un agent par spécialiste : Claude, un parseur à schéma strict, des outils de LECTURE seulement. Atteint par la sortie « faux » de la porte (appeler le modèle est un effet).' })
const claude = (name, modele) => noeud(LC('lmChatAnthropic'), 1.3, name, { model: { __rl: true, mode: 'list', value: modele }, options: { maxTokensToSample: 1200, temperature: 0.2 } })
const parseur = (name, schema) => noeud(LC('outputParserStructured'), 1.2, name, { schemaType: 'manual', inputSchema: JSON.stringify(schema), autoFix: false })
const outil = (type, version, name, parameters, notes) => noeud(type, version, name, parameters, { notes: `outil: lecture\n${notes}` })
const deplace = (name, id, notes) => noeud(B('executeWorkflow'), 1.2, name, { source: 'database', workflowId: { __rl: true, mode: 'id', value: id }, mode: 'once', options: { waitForSubWorkflow: true } }, { notes, onError: 'continueRegularOutput' })
const pied = (src) => `\n\n—\n${MENTION} de {{ ${src}.enseigne }}.`
const D = "$('Décider de la voie').first().json"
const DEST = "$('Lire le destinataire').first().json"

// Les champs d'un classeur, d'un dossier ou d'une feuille ne sont pas vides : n8n refuse de TESTER un workflow dont un paramètre requis est vide, même sur un nœud non joué.
// Chaque valeur « …_DU_CLIENT » est un REPÈRE à remplacer dans la copie du client ; ce n'est ni un identifiant ni un secret.
// ─── Les outils de l'artisan, par nœud natif (tous sans identifiant) ──────────────────────────────────────────────────────────
const gmailEnvoi = (name, texte, sujet, dest, pj) => noeud(B('gmail'), 2.2, name, { resource: 'message', operation: 'send', sendTo: `={{ ${dest} }}`, subject: `={{ ${sujet} }}`, emailType: 'text',
  message: `={{ ${texte} }}${pied(D)}`, options: { appendAttribution: false, senderName: `={{ ${D}.enseigne }}`, ...(pj ? { attachmentsUi: { attachmentsBinary: [{ property: 'data' }] } } : {}) } },
  { notes: 'pied: mention\nEnvoi depuis la boîte Gmail de l\'artisan, à son nom. Atteint par la sortie « faux » de la porte seulement.' })
const gmailBrouillon = (name, texte, sujet, dest) => noeud(B('gmail'), 2.2, name, { resource: 'draft', operation: 'create', subject: `={{ ${sujet} }}`, emailType: 'text',
  message: `={{ ${texte} }}${pied(D)}`, options: { sendTo: `={{ ${dest} }}`, attachmentsUi: { attachmentsBinary: [{ property: 'data' }] } } },
  { notes: 'pied: mention\nStudio : le brouillon est écrit dans la vraie boîte Gmail de l\'artisan, qui le relit et l\'envoie de chez lui.' })
const outlookEnvoi = (name, texte, sujet, dest, pj) => noeud(B('microsoftOutlook'), 2, name, { resource: 'message', operation: 'send', toRecipients: `={{ ${dest} }}`, subject: `={{ ${sujet} }}`,
  bodyContent: `={{ ${texte} }}${pied(D)}`, additionalFields: { bodyContentType: 'Text', saveToSentItems: true, ...(pj ? { attachments: { attachments: [{ binaryPropertyName: 'data' }] } } : {}) } },
  { notes: 'pied: mention\nEnvoi depuis la boîte Outlook de l\'artisan, à son nom.' })
const outlookBrouillon = (name, texte, sujet, dest) => noeud(B('microsoftOutlook'), 2, name, { resource: 'draft', operation: 'create', subject: `={{ ${sujet} }}`,
  bodyContent: `={{ ${texte} }}${pied(D)}`, additionalFields: { toRecipients: `={{ ${dest} }}`, bodyContentType: 'Text', attachments: { attachments: [{ binaryPropertyName: 'data' }] } } },
  { notes: 'pied: mention\nStudio : brouillon dans la boîte Outlook de l\'artisan.' })
const smtp = (name, texte, sujet, dest, exp) => noeud(B('emailSend'), 2.1, name, { resource: 'email', operation: 'send', fromEmail: `={{ ${exp} }}`, toEmail: `={{ ${dest} }}`, subject: `={{ ${sujet} }}`,
  emailFormat: 'text', text: `={{ ${texte} }}${pied(D)}`, options: { appendAttribution: false } }, { notes: 'pied: mention\nEnvoi par le SMTP de l\'artisan (ou de son hébergeur de messagerie).' })
const whatsapp = (name, texte, dest) => noeud(B('whatsApp'), 1.1, name, { operation: 'send', phoneNumberId: `={{ ${DEST}.whatsapp_numero_pro }}`, recipientPhoneNumber: `={{ ${dest} }}`,
  textBody: `={{ ${texte} }}${pied(D)}` }, { notes: 'pied: mention\nWhatsApp Business Cloud (Meta) : le client a déjà écrit sur ce canal ; un modèle de message validé par Meta est requis pour écrire en premier.' })
const telegram = (name, texte, dest) => noeud(B('telegram'), 1.2, name, { resource: 'message', operation: 'sendMessage', chatId: `={{ ${dest} }}`, text: `={{ ${texte} }}${pied(D)}`,
  additionalFields: { appendAttribution: false } }, { notes: 'pied: mention\nTelegram : le client a démarré la conversation avec le robot de l\'artisan (jamais un identifiant écrit ici).' })
const twilio = (name, texte, dest) => noeud(B('twilio'), 1, name, { resource: 'sms', operation: 'send', from: `={{ ${DEST}.sms_expediteur }}`, to: `={{ ${dest} }}`,
  message: `={{ ${texte} }} ${MENTION} de {{ ${D}.enseigne }}. Répondez STOP pour ne plus être relancé.` }, { notes: 'pied: mention\nSMS par l\'API Twilio, choisie par l\'artisan (sinon « SMS préparé », lib/sms/lien.ts:10). STOP dans chaque SMS, ni lien ni montant (lib/sms/encodage.ts).' })
const drive = (name) => noeud(B('googleDrive'), 3, name, { resource: 'file', operation: 'upload', inputDataFieldName: 'data', name: `={{ ${D}.numero }}.pdf`,
  driveId: { __rl: true, mode: 'list', value: 'My Drive' }, folderId: { __rl: true, mode: 'id', value: 'DOSSIER_DRIVE_DU_CLIENT' }, options: {} }, { notes: 'Le PDF rendu par l\'application est rangé dans le Drive de l\'artisan (un dossier par client et par chantier : à régler dans la copie).' })
const onedrive = (name) => noeud(B('microsoftOneDrive'), 1.1, name, { resource: 'file', operation: 'upload', binaryData: true, binaryPropertyName: 'data', fileName: `={{ ${D}.numero }}.pdf`, parentId: 'DOSSIER_ONEDRIVE_DU_CLIENT' },
  { notes: 'Le PDF rendu par l\'application est rangé dans le OneDrive de l\'artisan.' })
const pdf = (name, rpc) => noeud(B('httpRequest'), 4.2, name, { method: 'POST', url: `${REST}/rpc/${rpc}`, ...auth, sendBody: true, specifyBody: 'json',
  jsonBody: `={{ JSON.stringify({ organisation_id: ${D}.organisation_id, objet_id: ${D}.${rpc === 'n8n_pdf_devis' ? 'devis_id' : 'facture_id'} }) }}`, options: {} },
  { notes: `Le PDF est rendu par le CODE de l'application (lib/DevisPDF.tsx, lib/envoisPdfServeur.ts) : la fonction ${rpc} rend le fichier en base64, avec les montants déjà écrits. n8n ne compose aucun document. À écrire dans la base (hors de ce lot).` })
const enFichier = (name) => noeud(B('convertToFile'), 1.1, name, { operation: 'toBinary', sourceProperty: 'pdf_base64', binaryPropertyName: 'data', options: { fileName: `={{ ${D}.numero }}.pdf`, mimeType: 'application/pdf' } })
const destinataire = (name, table, cible) => lire(name, table, 'objet_id,client_email,client_telephone,telegram_chat,whatsapp_numero_pro,sms_expediteur',
  [{ name: 'objet_id', value: `=eq.{{ ${D}.${cible} }}` }], `lecture-pour-envoi: Envoyer par Gmail\nLue AU MOMENT d'envoyer, après la porte : le contact du client ne sert qu'à ce nœud d'envoi.`)

// ─── Le tissu : liens et mise en page ────────────────────────────────────────────────────────────────────────────────────────
function assembler(nom, noeuds, liens, description) {
  const parNom = new Map(noeuds.map((n) => [n.name, n]))
  const connexions = {}
  for (const [de, vers, sortie = 0, genre = 'main'] of liens) {
    if (!parNom.has(de) || !parNom.has(vers)) throw new Error(`${nom} : lien vers un nœud absent (${de} → ${vers})`)
    const c = (connexions[de] ??= {})
    const l = (c[genre] ??= [])
    while (l.length <= sortie) l.push([])
    l[sortie].push({ node: vers, type: genre, index: 0 })
  }
  // Mise en page : colonnes par profondeur sur le chemin principal, les sous-nœuds de l'agent en dessous de lui.
  const prof = new Map(), file = noeuds.filter((n) => !liens.some(([, v]) => v === n.name) && !liens.some(([d, , , g]) => d === n.name && g !== 'main')).map((n) => n.name)
  for (const n of file) prof.set(n, 0)
  for (let i = 0; i < file.length; i++) for (const [d, v, , g = 'main'] of liens) if (d === file[i] && g === 'main' && !prof.has(v)) { prof.set(v, prof.get(d) + 1); file.push(v) }
  const colonnes = new Map()
  for (const n of noeuds) {
    if (prof.has(n.name)) { const c = prof.get(n.name); const k = colonnes.get(c) ?? 0; colonnes.set(c, k + 1); n.position = [c * 260, k * 170] }
  }
  const sous = noeuds.filter((n) => !prof.has(n.name))
  sous.forEach((n, i) => { const cible = liens.find(([d, , , g]) => d === n.name && g !== 'main')?.[1]; const base = parNom.get(cible)?.position ?? [0, 0]; n.position = [base[0] + (i % 6) * 160 - 400, base[1] + 320 + Math.floor(i / 6) * 150] })
  return {
    name: nom, description, active: false,
    nodes: noeuds.map((n) => ({ id: uuid(nom, n.name), ...n, position: n.position ?? [0, 0] })),
    connections: connexions,
    settings: { executionOrder: 'v1', timezone: 'Europe/Paris', executionTimeout: 900, saveDataErrorExecution: 'all', saveDataSuccessExecution: 'none', saveExecutionProgress: false,
      saveManualExecutions: true, errorWorkflow: ID_ERREUR_COMMUNE, callerPolicy: 'none', availableInMCP: true },
  }
}
const schemaLignes = { type: 'object', additionalProperties: false, required: ['resume', 'lignes'], properties: { resume: { type: 'string', maxLength: 600 },
  lignes: { type: 'array', minItems: 1, maxItems: 40, items: { type: 'object', additionalProperties: false, required: ['designation', 'quantite', 'unite', 'reference_tarif', 'motif'],
    properties: { designation: { type: 'string', minLength: 1, maxLength: 120 }, quantite: { type: 'number', exclusiveMinimum: 0, maximum: 100000 }, unite: { type: 'string', maxLength: 20 },
      reference_tarif: { type: ['string', 'null'], maxLength: 60 }, motif: { type: 'string', maxLength: 200 } } } } } }
const schemaMessage = (max) => ({ type: 'object', additionalProperties: false, required: ['objet', 'texte'], properties: { objet: { type: 'string', minLength: 1, maxLength: 120 }, texte: { type: 'string', minLength: 20, maxLength: max } } })
const CONFIG_SEL = 'artisan_id,enseigne,ton,signature,offre,capacites,pilote,parties_depuis_24h,plafond_jour,interrupteur_general,interrupteur_departement,cles_existantes,maintenant,simulation,boite,stockage'

// ════════════════════════════ gabarit-artisan-devis ════════════════════════════
function devis() {
  const N = [
    planifie('Toutes les 10 minutes', { field: 'minutes', minutesInterval: 10 }),
    code('Préparer', DEVIS['Préparer']),
    lire('Relire la configuration', 'n8n_config_agents', `${CONFIG_SEL},signature_electronique`, [{ name: 'departement', value: 'eq.devis' }], 'Configuration du compte (offre, pilote, interrupteurs, simulation). Vue étroite à écrire (hors de ce lot).'),
    lire('Lire les demandes à chiffrer', 'n8n_demandes_a_chiffrer', 'lead_id,devis_id,qualifiee,escalade,resume_demande,delai_annulation_ecoule', [], 'Demandes qualifiées, déjà déposées dans la plateforme (une entrée = la même demande que la page /p). Vue étroite à écrire.'),
    lire('Lire les tarifs', 'n8n_tarifs_artisan', 'reference,designation,unite,prix_unitaire_ht_centimes,source_prix', [], 'Les tarifs de l\'artisan (lib/prix/) : la SEULE source d\'un prix sourcé. Entiers en centimes, rendus par la base.'),
    lire('Lire les devis prêts', 'n8n_devis_prets', 'artisan_id,devis_id,lead_id,numero,statut,total_ttc_centimes,total_ttc_affiche', [], 'Les devis que l\'application a chiffrés : total écrit par le code.'),
    lire('Lire les lignes des devis', 'n8n_devis_lignes', 'artisan_id,devis_id,rang,designation,quantite,prix_unitaire_ht_centimes,prix_affiche,source_prix,repere_affiche,repere_chantier_le', [], 'Les lignes chiffrées, avec la source de chaque prix et le repère d\'un ancien chantier (cité, jamais une source).'),
    lire('Lire les repères de prix', 'n8n_reperes_prix', 'reference,repere_affiche,repere_chantier_le', [], 'Prix déjà pratiqués par l\'artisan sur d\'anciens chantiers : un REPÈRE cité dans le devis (B9), jamais une source de prix. Le modèle ne les voit pas.'),
    code('Constituer le dossier', DEVIS['Constituer le dossier'], 'Un seul dossier par passage. Interrupteurs fermés ou lecture absente : rien.'),
    porte('Porte simulation (modèle)', 'le modèle n\'est pas appelé : sa sortie vient d\'un enregistrement daté'),
    code('Modèle enregistré (simulation)', DEVIS['Modèle enregistré (simulation)']),
    agent('Rédacteur de lignes', "={{ JSON.stringify({ demande: $json.resume_demande, tarifs: $json.tarifs.map((t) => ({ reference: t.reference, designation: t.designation, unite: t.unite })) }) }}",
      'Tu prépares les LIGNES d\'un devis pour un artisan français, à partir de la demande de son client et de la liste de ses tarifs. Pour chaque poste : une désignation claire, une quantité, une unité, et la référence du tarif de l\'artisan qui correspond ; si aucun tarif ne correspond, mets reference_tarif à null. Tu ne donnes JAMAIS un prix, un total, une TVA ni un délai : les montants sont lus dans les tarifs par le code. Tu n\'inventes ni fournisseur ni quantité que la demande ne dit pas. Réponds seulement par le schéma demandé.'),
    claude('Claude (Sonnet 5.5)', 'claude-sonnet-5-5'),
    parseur('Schéma des lignes', schemaLignes),
    outil(B('googleSheetsTool'), 4.7, 'Tarifs (Google Sheets)', { resource: 'sheet', operation: 'read', documentId: { __rl: true, mode: 'id', value: 'CLASSEUR_SHEETS_DU_CLIENT' }, sheetName: { __rl: true, mode: 'name', value: 'Tarifs' } }, 'Si l\'artisan tient ses tarifs dans Google Sheets : l\'agent lit les lignes, jamais ne les modifie.'),
    outil(B('microsoftExcelTool'), 2.2, 'Tarifs (Excel)', { resource: 'table', operation: 'lookup', workbook: { __rl: true, mode: 'id', value: 'CLASSEUR_EXCEL_DU_CLIENT' }, worksheet: { __rl: true, mode: 'id', value: '{00000000-0001-0000-0000-000000000001}' }, table: { __rl: true, mode: 'id', value: '{00000000-0002-0000-0000-000000000001}' }, lookupColumn: 'reference', lookupValue: "={{ $fromAI('reference', 'la référence de tarif cherchée', 'string') }}" }, 'Si l\'artisan tient ses tarifs dans Excel (OneDrive) : recherche d\'une référence.'),
    outil(B('gmailTool'), 2.2, 'Lire le fil (Gmail)', { resource: 'thread', operation: 'get', threadId: "={{ $fromAI('fil', 'identifiant du fil de discussion', 'string') }}" }, 'La demande reçue par e-mail : lecture du fil.'),
    outil(B('microsoftOutlookTool'), 2, 'Lire le message (Outlook)', { resource: 'message', operation: 'get', messageId: "={{ $fromAI('message', 'identifiant du message', 'string') }}" }, 'La demande reçue sur Outlook : lecture du message.'),
    outil(B('googleDriveTool'), 3, 'Pièces du chantier (Drive)', { resource: 'fileFolder', operation: 'search', searchMethod: 'name', queryString: "={{ $fromAI('nom', 'nom ou début du nom du fichier', 'string') }}", returnAll: false, limit: 10, filter: {}, options: {} }, 'Photos et plans déposés par le client dans le dossier du chantier.'),
    code('Revalider les lignes', DEVIS['Revalider les lignes'], 'R18 : hors schéma = rejet. Le prix de chaque ligne est LU dans les tarifs, jamais écrit par le modèle.'),
    code("Préparer l'appel du chef", DEVIS["Préparer l'appel du chef"]),
    deplace('Appeler presti-dep-devis (montants par le code)', ID.devis, 'Le chef Devis (036-005), inactif tant qu\'il n\'est pas publié : il lit le total écrit par le code de l\'application et la source de chaque prix, et prépare la carte « devis prêt ». Appelé avec la simulation du gabarit. Ses callerIds doivent contenir la copie du client.'),
    code('Décider de la voie', DEVIS['Décider de la voie'], 'Copie de decisionPilote pour envoi_devis (lib/pilote/regles.ts). Studio : brouillon et carte. Signature : envoi seul si TOUS les prix viennent des tarifs.'),
    porte('Porte simulation (effets)', 'seuls les effets prévus sont journalisés'),
    code('Effets prévus', DEVIS['Effets prévus']),
    aiguilleur('Choisir la voie', `={{ ${D}.voie }}`, ['envoi', 'brouillon'], 'Fallback = carte : la carte « devis prêt » est écrite par le chef, rien d\'autre à faire.'),
    destinataire('Lire le destinataire', 'n8n_destinataires', 'lead_id'),
    pdf('Lire le PDF du devis (rendu par le code)', 'n8n_pdf_devis'),
    enFichier('Convertir en fichier PDF'),
    aiguilleur('Choisir le stockage', `={{ ${D}.stockage }}`, ['drive', 'onedrive']),
    drive('Ranger le PDF dans Google Drive'),
    onedrive('Ranger le PDF dans OneDrive'),
    aiguilleur('Choisir la messagerie', `={{ ${D}.voie.concat(':', ${D}.boite) }}`, ['envoi:gmail', 'envoi:outlook', 'brouillon:gmail', 'brouillon:outlook']),
    gmailEnvoi('Envoyer par Gmail', `${D}.texte_mail`, `'Devis '.concat(${D}.numero)`, `${DEST}.client_email`, true),
    outlookEnvoi('Envoyer par Outlook', `${D}.texte_mail`, `'Devis '.concat(${D}.numero)`, `${DEST}.client_email`, true),
    gmailBrouillon('Brouillon Gmail', `${D}.texte_mail`, `'Devis '.concat(${D}.numero)`, `${DEST}.client_email`),
    outlookBrouillon('Brouillon Outlook', `${D}.texte_mail`, `'Devis '.concat(${D}.numero)`, `${DEST}.client_email`),
    aiguilleur('Choisir la signature électronique', `={{ ${D}.signature_electronique }}`, ['yousign', 'docusign'], 'Fallback = aucune signature demandée.'),
    noeud(B('httpRequest'), 4.2, 'Demander la signature (Yousign)', { method: 'POST', url: 'https://api.yousign.app/v3/signature_requests', authentication: 'genericCredentialType', genericAuthType: 'httpTemplatedCustomAuth',
      sendBody: true, specifyBody: 'json', jsonBody: `={{ JSON.stringify({ name: 'Devis '.concat(${D}.numero), delivery_mode: 'none', ordered_signers: false, external_id: ${D}.cle, timezone: 'Europe/Paris' }) }}`, options: {} },
      { notes: 'Signature électronique par l\'API Yousign (hôte écrit en dur). Crée la demande ; le document, le signataire et l\'activation sont les appels suivants de la fiche connecteur. La clé API est celle du client, branchée par lui dans la copie.' }),
    noeud(B('httpRequest'), 4.2, 'Demander la signature (DocuSign)', { method: 'POST', url: 'https://eu.docusign.net/restapi/v2.1/accounts/COMPTE_DOCUSIGN_DU_CLIENT/envelopes', authentication: 'genericCredentialType', genericAuthType: 'httpTemplatedCustomAuth',
      sendBody: true, specifyBody: 'json', jsonBody: `={{ JSON.stringify({ emailSubject: 'Devis '.concat(${D}.numero), status: 'created', customFields: { textCustomFields: [{ name: 'cle', value: ${D}.cle }] } }) }}`, options: {} },
      { notes: 'Signature électronique par l\'API DocuSign (hôte écrit en dur ; le COMPTE_DOCUSIGN_DU_CLIENT du chemin est remplacé dans la copie). Enveloppe créée en brouillon.' }),
    ecrire('Inscrire au registre', 'assistant_actions', `{ organisation_id: ${D}.organisation_id, cle: 'devis_outils:'.concat(${D}.cle), outil: ${D}.voie === 'envoi' ? 'envoyer_devis' : 'brouillon_devis', objet_type: 'devis', objet_id: ${D}.devis_id, statut: 'executee', mode: 'n8n' }`, 'Dépôt de chaque action dans la plateforme (registre commun : jamais deux envois pour le même devis). Idempotent.'),
    code('Bilan', DEVIS['Bilan']),
  ]
  const L = [
    ['Toutes les 10 minutes', 'Préparer'], ['Préparer', 'Relire la configuration'], ['Relire la configuration', 'Lire les demandes à chiffrer'], ['Lire les demandes à chiffrer', 'Lire les tarifs'],
    ['Lire les tarifs', 'Lire les devis prêts'], ['Lire les devis prêts', 'Lire les lignes des devis'], ['Lire les lignes des devis', 'Lire les repères de prix'], ['Lire les repères de prix', 'Constituer le dossier'], ['Constituer le dossier', 'Porte simulation (modèle)'],
    ['Porte simulation (modèle)', 'Modèle enregistré (simulation)', 0], ['Porte simulation (modèle)', 'Rédacteur de lignes', 1],
    ['Modèle enregistré (simulation)', 'Revalider les lignes'], ['Rédacteur de lignes', 'Revalider les lignes'],
    ['Claude (Sonnet 5.5)', 'Rédacteur de lignes', 0, 'ai_languageModel'], ['Schéma des lignes', 'Rédacteur de lignes', 0, 'ai_outputParser'],
    ...['Tarifs (Google Sheets)', 'Tarifs (Excel)', 'Lire le fil (Gmail)', 'Lire le message (Outlook)', 'Pièces du chantier (Drive)'].map((o) => [o, 'Rédacteur de lignes', 0, 'ai_tool']),
    ['Revalider les lignes', "Préparer l'appel du chef"], ["Préparer l'appel du chef", 'Appeler presti-dep-devis (montants par le code)'], ['Appeler presti-dep-devis (montants par le code)', 'Décider de la voie'],
    ['Décider de la voie', 'Porte simulation (effets)'], ['Porte simulation (effets)', 'Effets prévus', 0], ['Porte simulation (effets)', 'Choisir la voie', 1],
    ['Choisir la voie', 'Lire le destinataire', 0], ['Choisir la voie', 'Lire le destinataire', 1],
    ['Lire le destinataire', 'Lire le PDF du devis (rendu par le code)'], ['Lire le PDF du devis (rendu par le code)', 'Convertir en fichier PDF'],
    ['Convertir en fichier PDF', 'Choisir le stockage'], ['Choisir le stockage', 'Ranger le PDF dans Google Drive', 0], ['Choisir le stockage', 'Ranger le PDF dans OneDrive', 1],
    ['Convertir en fichier PDF', 'Choisir la messagerie'],
    ['Choisir la messagerie', 'Envoyer par Gmail', 0], ['Choisir la messagerie', 'Envoyer par Outlook', 1], ['Choisir la messagerie', 'Brouillon Gmail', 2], ['Choisir la messagerie', 'Brouillon Outlook', 3],
    ['Envoyer par Gmail', 'Choisir la signature électronique'], ['Envoyer par Outlook', 'Choisir la signature électronique'],
    ['Choisir la signature électronique', 'Demander la signature (Yousign)', 0], ['Choisir la signature électronique', 'Demander la signature (DocuSign)', 1], ['Choisir la signature électronique', 'Inscrire au registre', 2],
    ['Demander la signature (Yousign)', 'Inscrire au registre'], ['Demander la signature (DocuSign)', 'Inscrire au registre'],
    ['Brouillon Gmail', 'Inscrire au registre'], ['Brouillon Outlook', 'Inscrire au registre'], ['Inscrire au registre', 'Bilan'],
  ]
  return assembler('gabarit-artisan-devis', N, L, 'Gabarit outillé (036-014) : le département Devis d\'un artisan avec ses vrais outils (Gmail, Outlook, Drive, OneDrive, Sheets, Excel, Yousign, DocuSign). Inactif, simulation, sans identifiant.')
}

// ════════════════════════════ gabarit-artisan-suivi ════════════════════════════
function suivi() {
  const T = "$('Décider de la voie').first().json"
  const N = [
    planifie('Tous les jours à 9 h', { field: 'days', daysInterval: 1, triggerAtHour: 9 }),
    code('Préparer', SUIVI['Préparer']),
    lire('Relire la configuration', 'n8n_config_agents', `${CONFIG_SEL},sms_api,expediteur,mots_escalade_artisan,paliers_conversation_jours,paliers_devis_jours`, [{ name: 'departement', value: 'eq.suivi' }], 'Configuration du compte. Paliers : J+2, J+5, J+10 pour une conversation, 7 jours pour un devis (lib/relances.ts, lib/crm/assistants.ts:108).'),
    lire('Lire les relances dues', 'n8n_relances_dues', 'objet_type,objet_id,dossier_id,statut,canal,paliers_envoyes,jours_depuis_dernier,main_prise,exclu,stop,opposition,sensible,carte,ecartee_le,historique,delai_annulation_ecoule', [], 'Devis envoyés et conversations sans réponse, avec les drapeaux écrits par la base : STOP, opposition, main reprise, exclu, client sensible. Aucun texte de client.'),
    code('Constituer la relance due', SUIVI['Constituer la relance due'], 'STOP et opposition : rien ne part. Une valeur absente vaut « ne pas relancer ».'),
    code("Préparer l'appel du contrôleur", SUIVI["Préparer l'appel du contrôleur"]),
    deplace('Contrôler le conflit (lib-controler-conflit)', ID.conflit, 'A20 : dossier clos, client en discussion, main reprise, exclu, client sensible, déjà en cours, déjà relancé (registre commun, 3 jours). Lecture seule. Ses callerIds doivent contenir la copie du client.'),
    si('Le dossier peut-il être relancé ?', '={{ $json.resultat?.continuer === true }}', 'Faux ou réponse absente : rien (côté sûr).'),
    porte('Porte simulation (modèle)', 'le modèle n\'est pas appelé : sa sortie vient d\'un enregistrement daté', "$('Constituer la relance due').first().json.simulation"),
    code('Modèle enregistré (simulation)', SUIVI['Modèle enregistré (simulation)']),
    agent('Relanceur', "={{ JSON.stringify({ objet_type: $('Constituer la relance due').first().json.objet_type, rang: $('Constituer la relance due').first().json.rang, canal: $('Constituer la relance due').first().json.canal, statut: $('Constituer la relance due').first().json.statut }) }}",
      'Tu écris une relance courte, polie et humaine, au nom d\'un artisan français, pour un client qui n\'a pas répondu. Tu ne cites AUCUN montant, aucun lien, aucun délai ni promesse que tu ne connais pas. Tu ne relances jamais un client qui a dit STOP : si le contrôleur de conflit répond de ne pas continuer, tu le dis et tu t\'arrêtes. Tu peux lire le fil de la conversation pour situer le dernier échange. Réponds seulement par le schéma demandé.'),
    claude('Claude (Haiku 5.5)', 'claude-haiku-5-5'),
    parseur('Schéma de la relance', schemaMessage(600)),
    outil(LC('toolWorkflow'), 2.2, 'Contrôleur de conflit (lib-controler-conflit)', { description: 'Dit si le dossier peut être relancé (dossier clos, STOP, main reprise, client sensible, déjà relancé). Lecture seule.', workflowId: { __rl: true, mode: 'id', value: ID.conflit }, workflowInputs: { mappingMode: 'defineBelow', value: {} } }, 'Le même spécialiste que le chemin principal, offert à l\'agent en lecture.'),
    outil(B('gmailTool'), 2.2, 'Lire le fil (Gmail)', { resource: 'thread', operation: 'get', threadId: "={{ $fromAI('fil', 'identifiant du fil de discussion', 'string') }}" }, 'Dernier échange avec le client sur Gmail.'),
    outil(B('microsoftOutlookTool'), 2, 'Lire le message (Outlook)', { resource: 'message', operation: 'get', messageId: "={{ $fromAI('message', 'identifiant du message', 'string') }}" }, 'Dernier échange avec le client sur Outlook.'),
    outil(B('googleSheetsTool'), 4.7, 'Registre des relances (Google Sheets)', { resource: 'sheet', operation: 'read', documentId: { __rl: true, mode: 'id', value: 'CLASSEUR_SHEETS_DU_CLIENT' }, sheetName: { __rl: true, mode: 'name', value: 'Relances' } }, 'Si l\'artisan tient son suivi dans une feuille : lecture seule.'),
    code('Revalider le message', SUIVI['Revalider le message'], 'R18 : hors schéma = rejet. Aucun montant ni lien dans une relance.'),
    code('Décider de la voie', SUIVI['Décider de la voie'], 'Studio : carte, relance à valider. Signature : envoi seul (conversation : relances.auto ; devis : pilote relance_devis).'),
    porte('Porte simulation (effets)', 'seuls les effets prévus sont journalisés'),
    code('Effets prévus', SUIVI['Effets prévus']),
    aiguilleur('Choisir la voie', `={{ ${T}.voie }}`, ['envoi'], 'Fallback = carte : la relance préparée attend la validation de l\'artisan.'),
    ecrire('Déposer la carte', 'opportunites', `{ organisation_id: ${T}.organisation_id, cle: ${T}.cle, type_action: ${T}.objet_type === 'devis' ? 'relance_devis' : 'relance_conversation', objet_type: ${T}.objet_type, objet_id: ${T}.objet_id, apercu: ${T}.texte }`, 'Studio : la relance préparée devient une carte « À valider » dans la plateforme.'),
    lire('Lire le destinataire', 'n8n_destinataires', 'objet_id,client_email,client_telephone,telegram_chat,whatsapp_numero_pro,sms_expediteur', [{ name: 'objet_id', value: `=eq.{{ ${T}.objet_id }}` }], 'lecture-pour-envoi: Relance Gmail\nLue AU MOMENT d\'envoyer, après la porte : le contact ne sert qu\'au nœud d\'envoi du canal d\'origine.'),
    aiguilleur('Choisir le canal', `={{ ${T}.route }}`, ['gmail', 'outlook', 'smtp', 'whatsapp', 'telegram', 'twilio'], 'Le canal d\'origine du client. Fallback = SMS préparé.'),
    gmailEnvoi('Relance Gmail', `${T}.texte`, `${T}.objet`, `${DEST}.client_email`, false),
    outlookEnvoi('Relance Outlook', `${T}.texte`, `${T}.objet`, `${DEST}.client_email`, false),
    smtp('Relance SMTP', `${T}.texte`, `${T}.objet`, `${DEST}.client_email`, `${T}.expediteur`),
    whatsapp('Relance WhatsApp', `${T}.texte`, `${DEST}.client_telephone`),
    telegram('Relance Telegram', `${T}.texte`, `${DEST}.telegram_chat`),
    twilio('Relance SMS (Twilio)', `${T}.texte`, `${DEST}.client_telephone`),
    code('SMS préparé', SUIVI['SMS préparé'], 'Étape gratuite : un lien sms: que l\'artisan ouvre sur son téléphone (lib/sms/lien.ts:10). Rien ne part de ce gabarit.'),
    ecrire('Inscrire au registre', 'assistant_actions', `{ organisation_id: ${T}.organisation_id, cle: 'relance_outils:'.concat(${T}.cle), outil: ${T}.objet_type === 'devis' ? 'relancer_devis' : 'relancer_facture', objet_type: ${T}.objet_type, objet_id: ${T}.objet_id, statut: 'executee', mode: 'n8n' }`, 'Registre commun des relances (lib/relancesRegistre.ts) : jamais deux relances en 3 jours, par n\'importe quel chemin. Idempotent.'),
    ecrire('Déposer dans la conversation', 'messages', `{ organisation_id: ${T}.organisation_id, cle: 'relance_msg:'.concat(${T}.cle), lead_id: ${T}.dossier_id, sens: 'out', type: 'relance', contenu: ${T}.texte, canal: ${T}.route }`, 'Tout message sortant est déposé dans la même conversation par client, avec son canal d\'origine (p6 § 0.5).'),
  ]
  const L = [
    ['Tous les jours à 9 h', 'Préparer'], ['Préparer', 'Relire la configuration'], ['Relire la configuration', 'Lire les relances dues'], ['Lire les relances dues', 'Constituer la relance due'],
    ['Constituer la relance due', "Préparer l'appel du contrôleur"], ["Préparer l'appel du contrôleur", 'Contrôler le conflit (lib-controler-conflit)'],
    ['Contrôler le conflit (lib-controler-conflit)', 'Le dossier peut-il être relancé ?'], ['Le dossier peut-il être relancé ?', 'Porte simulation (modèle)', 0],
    ['Porte simulation (modèle)', 'Modèle enregistré (simulation)', 0], ['Porte simulation (modèle)', 'Relanceur', 1],
    ['Modèle enregistré (simulation)', 'Revalider le message'], ['Relanceur', 'Revalider le message'],
    ['Claude (Haiku 5.5)', 'Relanceur', 0, 'ai_languageModel'], ['Schéma de la relance', 'Relanceur', 0, 'ai_outputParser'],
    ...['Contrôleur de conflit (lib-controler-conflit)', 'Lire le fil (Gmail)', 'Lire le message (Outlook)', 'Registre des relances (Google Sheets)'].map((o) => [o, 'Relanceur', 0, 'ai_tool']),
    ['Revalider le message', 'Décider de la voie'], ['Décider de la voie', 'Porte simulation (effets)'], ['Porte simulation (effets)', 'Effets prévus', 0], ['Porte simulation (effets)', 'Choisir la voie', 1],
    ['Choisir la voie', 'Lire le destinataire', 0], ['Choisir la voie', 'Déposer la carte', 1],
    ['Lire le destinataire', 'Choisir le canal'],
    ['Choisir le canal', 'Relance Gmail', 0], ['Choisir le canal', 'Relance Outlook', 1], ['Choisir le canal', 'Relance SMTP', 2], ['Choisir le canal', 'Relance WhatsApp', 3], ['Choisir le canal', 'Relance Telegram', 4],
    ['Choisir le canal', 'Relance SMS (Twilio)', 5], ['Choisir le canal', 'SMS préparé', 6],
    ...['Relance Gmail', 'Relance Outlook', 'Relance SMTP', 'Relance WhatsApp', 'Relance Telegram', 'Relance SMS (Twilio)', 'SMS préparé'].map((n) => [n, 'Inscrire au registre']),
    ['Inscrire au registre', 'Déposer dans la conversation'],
  ]
  return assembler('gabarit-artisan-suivi', N, L, 'Gabarit outillé (036-014) : le département Suivi et relances d\'un artisan avec ses vrais outils (Gmail, Outlook, SMTP, WhatsApp, Telegram, Twilio). Inactif, simulation, sans identifiant.')
}

// ════════════════════════════ gabarit-artisan-facturation ════════════════════════════
function facturation() {
  const N = [
    planifie('Tous les jours à 8 h 30', { field: 'days', daysInterval: 1, triggerAtHour: 8, triggerAtMinute: 30 }),
    code('Préparer', FACTURATION['Préparer']),
    lire('Relire la configuration', 'n8n_config_agents', `${CONFIG_SEL},comptable,relances_impayes`, [{ name: 'departement', value: 'eq.facturation' }], 'Configuration du compte. relances_impayes.actif est l\'OPT-IN de l\'artisan (lib/relancesImpayes.ts) ; jours = J+3, J+10, J+21.'),
    lire('Lire les factures', 'n8n_factures_argent', 'facture_id,devis_id,numero,statut,emise,envoyee,total_ttc_centimes,total_ttc_affiche,echeance_affichee,retard_affiche,jours_retard,salutation,contestation,motif,paliers_envoyes,canal,stop,sensible,delai_annulation_ecoule', [], 'Factures telles que l\'application les a émises : montants écrits par le code. Une facture NON émise a emise = faux.'),
    lire('Lire les chantiers terminés', 'n8n_apercus_facture', 'devis_id,chantier_termine,deja_facturee,apercu_ok,apercu_type,apercu_total_ttc_affiche', [], 'Aperçu de la facture rendu par simulerFacture (lib/factureDepuisDevis.ts:64) : « la facture est prête quand le chantier est fini » (A14).'),
    noeud(B('stripe'), 1, 'Lire les paiements Stripe', { resource: 'charge', operation: 'getAll', returnAll: false, limit: 100 }, { executeOnce: true, alwaysOutputData: true, notes: 'LECTURE SEULE : les paiements reçus sur le Stripe de l\'artisan (contrôle quotidien des paiements, A14). Aucune opération d\'écriture (jamais de remboursement, ni de paiement, ni de client). Le code compare, il n\'additionne rien.' }),
    code('Constituer le dossier', FACTURATION['Constituer le dossier'], 'Un seul dossier par passage : paiement lu, facture émise à envoyer, impayé échu, chantier terminé.'),
    si('Faut-il rédiger ?', '={{ $json.rediger === true }}', 'Seule la relance d\'impayé est rédigée par le modèle.'),
    porte('Porte simulation (modèle)', 'le modèle n\'est pas appelé : sa sortie vient d\'un enregistrement daté'),
    code('Modèle enregistré (simulation)', FACTURATION['Modèle enregistré (simulation)']),
    agent("Relanceur d'impayés", "={{ JSON.stringify({ numero: $('Constituer le dossier').first().json.numero, rang: $('Constituer le dossier').first().json.rang, canal: $('Constituer le dossier').first().json.canal }) }}",
      'Tu rédiges un rappel poli pour une facture impayée, au nom d\'un artisan français. Tu n\'écris JAMAIS un montant, une date ni un lien : tu places les variables {client}, {numero}, {montant}, {echeance}, {retard}, {artisan}, que le code remplace par les valeurs de la facture. Le ton monte avec le rang (1 : simple oubli, 2 : précis, 3 : ferme mais courtois). Tu ne menaces pas. Tu peux lire un paiement ou un fil pour vérifier que la facture n\'est pas déjà réglée. Réponds seulement par le schéma demandé.'),
    claude('Claude (Haiku 5.5)', 'claude-haiku-5-5'),
    parseur('Schéma du rappel', schemaMessage(1500)),
    outil(B('stripeTool'), 1, 'Lire un paiement (Stripe)', { resource: 'charge', operation: 'get', chargeId: "={{ $fromAI('paiement', 'identifiant du paiement', 'string') }}" }, 'Lecture seule d\'un paiement du Stripe de l\'artisan.'),
    outil(B('gmailTool'), 2.2, 'Lire le fil (Gmail)', { resource: 'thread', operation: 'get', threadId: "={{ $fromAI('fil', 'identifiant du fil de discussion', 'string') }}" }, 'Le dernier échange avec le client sur Gmail (a-t-il dit avoir payé ?).'),
    outil(B('microsoftOutlookTool'), 2, 'Lire le message (Outlook)', { resource: 'message', operation: 'get', messageId: "={{ $fromAI('message', 'identifiant du message', 'string') }}" }, 'Le dernier échange avec le client sur Outlook.'),
    outil(LC('toolWorkflow'), 2.2, 'Contrôleur de conflit (lib-controler-conflit)', { description: 'Dit si le dossier peut être relancé (dossier clos, STOP, main reprise, client sensible, déjà relancé). Lecture seule.', workflowId: { __rl: true, mode: 'id', value: ID.conflit }, workflowInputs: { mappingMode: 'defineBelow', value: {} } }, 'Le contrôleur de conflit (A20) offert à l\'agent en lecture.'),
    code('Revalider le texte', FACTURATION['Revalider le texte'], 'R18 : hors schéma = rejet. Le modèle ne place que des variables ; le CODE les remplace par les valeurs lues.'),
    code('Décider de la voie', FACTURATION['Décider de la voie'], 'Une facture non émise ne part jamais ; l\'émission est toujours un clic (creer_facture ∈ OUTILS_JAMAIS_AUTO).'),
    porte('Porte simulation (effets)', 'seuls les effets prévus sont journalisés'),
    code('Effets prévus', FACTURATION['Effets prévus']),
    aiguilleur('Choisir la voie', `={{ ${D}.voie }}`, ['envoi', 'carte'], 'Fallback = aucune (facture non émise) : rien.'),
    ecrire('Déposer la carte', 'opportunites', `{ organisation_id: ${D}.organisation_id, cle: ${D}.cle, type_action: ${D}.kind === 'facture_prete' ? 'facture_prete' : ${D}.kind === 'paiement_lu' ? 'verifier_paiement' : ${D}.kind === 'relance_impaye' ? 'relance_impaye' : 'envoi_facture', objet_type: 'facture', objet_id: ${D}.facture_id ?? ${D}.devis_id, apercu: ${D}.texte }`, 'Facture prête (« Ask you »), paiement lu à vérifier, relance préparée (Studio), contestation à relire : toujours une carte.'),
    lire('Lire le destinataire', 'n8n_destinataires', 'objet_id,client_email,client_telephone,telegram_chat,whatsapp_numero_pro,sms_expediteur', [{ name: 'objet_id', value: `=eq.{{ ${D}.facture_id }}` }], 'lecture-pour-envoi: Envoyer la facture par Gmail\nLue AU MOMENT d\'envoyer, après la porte.'),
    aiguilleur('Quoi envoyer ?', `={{ ${D}.kind }}`, ['envoi_facture', 'relance_impaye']),
    pdf('Lire le PDF de la facture (rendu par le code)', 'n8n_pdf_facture'),
    enFichier('Convertir en fichier PDF'),
    aiguilleur('Choisir le stockage', `={{ ${D}.stockage }}`, ['drive', 'onedrive']),
    drive('Ranger le PDF dans Google Drive'),
    onedrive('Ranger le PDF dans OneDrive'),
    aiguilleur('Choisir l\'export comptable', `={{ ${D}.comptable }}`, ['sheets', 'excel']),
    noeud(B('googleSheets'), 4.7, 'Exporter vers Google Sheets', { resource: 'sheet', operation: 'append', documentId: { __rl: true, mode: 'id', value: 'CLASSEUR_SHEETS_DU_CLIENT' }, sheetName: { __rl: true, mode: 'name', value: 'Factures' },
      columns: { mappingMode: 'defineBelow', value: { numero: `={{ ${D}.numero }}`, total_ttc: `={{ ${D}.total_ttc_affiche }}`, facture_id: `={{ ${D}.facture_id }}`, envoyee_via: `={{ ${D}.boite }}` }, matchingColumns: [], schema: [] }, options: {} },
      { notes: 'Export au comptable : une ligne par facture envoyée, dans le classeur Google Sheets de l\'artisan. Les montants sont ceux de la base, recopiés.' }),
    noeud(B('microsoftExcel'), 2.2, 'Exporter vers Excel', { resource: 'table', operation: 'append', workbook: { __rl: true, mode: 'id', value: 'CLASSEUR_EXCEL_DU_CLIENT' }, worksheet: { __rl: true, mode: 'id', value: '{00000000-0001-0000-0000-000000000001}' }, table: { __rl: true, mode: 'id', value: '{00000000-0002-0000-0000-000000000001}' },
      dataMode: 'define', fieldsUi: { values: [{ column: 'numero', fieldValue: `={{ ${D}.numero }}` }, { column: 'total_ttc', fieldValue: `={{ ${D}.total_ttc_affiche }}` }, { column: 'facture_id', fieldValue: `={{ ${D}.facture_id }}` }] }, options: {} },
      { notes: 'Export au comptable dans le classeur Excel (OneDrive) de l\'artisan.' }),
    aiguilleur('Choisir la messagerie', `={{ ${D}.kind.concat(':', ${D}.route) }}`, ['envoi_facture:gmail', 'envoi_facture:outlook', 'relance_impaye:gmail', 'relance_impaye:outlook', 'relance_impaye:sms_prepare']),
    gmailEnvoi('Envoyer la facture par Gmail', `${D}.texte_mail`, `'Facture '.concat(${D}.numero)`, `${DEST}.client_email`, true),
    outlookEnvoi('Envoyer la facture par Outlook', `${D}.texte_mail`, `'Facture '.concat(${D}.numero)`, `${DEST}.client_email`, true),
    gmailEnvoi('Relance Gmail', `${D}.texte_mail`, `${D}.objet`, `${DEST}.client_email`, false),
    outlookEnvoi('Relance Outlook', `${D}.texte_mail`, `${D}.objet`, `${DEST}.client_email`, false),
    code('SMS préparé', FACTURATION['SMS préparé'], 'Étape gratuite : un lien sms: que l\'artisan ouvre sur son téléphone (lib/sms/lien.ts:10). Rien ne part de ce gabarit.'),
    ecrire('Inscrire au registre', 'assistant_actions', `{ organisation_id: ${D}.organisation_id, cle: 'facture_outils:'.concat(${D}.cle), outil: ${D}.kind === 'envoi_facture' ? 'envoyer_facture' : 'relancer_facture', objet_type: 'facture', objet_id: ${D}.facture_id, statut: 'executee', mode: 'n8n' }`, 'Registre commun (lib/relancesRegistre.ts). Idempotent.'),
    ecrire('Inscrire le palier', 'relances_impayes', `{ organisation_id: ${D}.organisation_id, cle: 'palier:'.concat(${D}.cle), facture_id: ${D}.facture_id, rang: ${D}.rang, statut: 'envoyee' }`, 'Le palier envoyé : la relance suivante attend son jour (J+3, J+10, J+21).'),
  ]
  // « Envoyer la facture par Gmail » : le destinataire est lu juste avant (lecture-pour-envoi) ; le nom de la note vise ce nœud.
  const L = [
    ['Tous les jours à 8 h 30', 'Préparer'], ['Préparer', 'Relire la configuration'], ['Relire la configuration', 'Lire les factures'], ['Lire les factures', 'Lire les chantiers terminés'],
    ['Lire les chantiers terminés', 'Lire les paiements Stripe'], ['Lire les paiements Stripe', 'Constituer le dossier'], ['Constituer le dossier', 'Faut-il rédiger ?'],
    ['Faut-il rédiger ?', 'Porte simulation (modèle)', 0], ['Faut-il rédiger ?', 'Revalider le texte', 1],
    ['Porte simulation (modèle)', 'Modèle enregistré (simulation)', 0], ['Porte simulation (modèle)', "Relanceur d'impayés", 1],
    ['Modèle enregistré (simulation)', 'Revalider le texte'], ["Relanceur d'impayés", 'Revalider le texte'],
    ['Claude (Haiku 5.5)', "Relanceur d'impayés", 0, 'ai_languageModel'], ['Schéma du rappel', "Relanceur d'impayés", 0, 'ai_outputParser'],
    ...['Lire un paiement (Stripe)', 'Lire le fil (Gmail)', 'Lire le message (Outlook)', 'Contrôleur de conflit (lib-controler-conflit)'].map((o) => [o, "Relanceur d'impayés", 0, 'ai_tool']),
    ['Revalider le texte', 'Décider de la voie'], ['Décider de la voie', 'Porte simulation (effets)'], ['Porte simulation (effets)', 'Effets prévus', 0], ['Porte simulation (effets)', 'Choisir la voie', 1],
    ['Choisir la voie', 'Lire le destinataire', 0], ['Choisir la voie', 'Déposer la carte', 1],
    ['Lire le destinataire', 'Quoi envoyer ?'], ['Quoi envoyer ?', 'Lire le PDF de la facture (rendu par le code)', 0], ['Quoi envoyer ?', 'Choisir la messagerie', 1],
    ['Lire le PDF de la facture (rendu par le code)', 'Convertir en fichier PDF'],
    ['Convertir en fichier PDF', 'Choisir le stockage'], ['Choisir le stockage', 'Ranger le PDF dans Google Drive', 0], ['Choisir le stockage', 'Ranger le PDF dans OneDrive', 1],
    ['Convertir en fichier PDF', "Choisir l'export comptable"], ["Choisir l'export comptable", 'Exporter vers Google Sheets', 0], ["Choisir l'export comptable", 'Exporter vers Excel', 1],
    ['Convertir en fichier PDF', 'Choisir la messagerie'],
    ['Choisir la messagerie', 'Envoyer la facture par Gmail', 0], ['Choisir la messagerie', 'Envoyer la facture par Outlook', 1], ['Choisir la messagerie', 'Relance Gmail', 2],
    ['Choisir la messagerie', 'Relance Outlook', 3], ['Choisir la messagerie', 'SMS préparé', 4],
    ...['Envoyer la facture par Gmail', 'Envoyer la facture par Outlook', 'Relance Gmail', 'Relance Outlook', 'SMS préparé'].map((n) => [n, 'Inscrire au registre']),
    ['Inscrire au registre', 'Inscrire le palier'],
  ]
  return assembler('gabarit-artisan-facturation', N, L, 'Gabarit outillé (036-014) : le département Facturation et encaissement d\'un artisan avec ses vrais outils (Stripe en lecture, Gmail, Outlook, Drive, OneDrive, Sheets, Excel). Inactif, simulation, sans identifiant.')
}

export const exports_ = () => ({ 'gabarit-artisan-devis': devis(), 'gabarit-artisan-suivi': suivi(), 'gabarit-artisan-facturation': facturation() })
export const empreintes = (E) => Object.fromEntries(Object.entries(E).map(([nom, w]) => [nom, Object.fromEntries(w.nodes.filter((n) => n.type === B('code')).map((n) => [n.name, createHash('sha256').update(n.parameters.jsCode, 'utf8').digest('hex')]))]))

if (import.meta.url === `file://${process.argv[1]}`) {
  const [mode, dossier = '.'] = process.argv.slice(2)
  const E = exports_()
  mkdirSync(dossier, { recursive: true })
  if (mode === '--json') {
    for (const [nom, w] of Object.entries(E)) writeFileSync(path.join(dossier, `${nom}.workflow.json`), JSON.stringify(w, null, 2) + '\n')
    writeFileSync(path.join(dossier, 'empreintes-code.json'), JSON.stringify(empreintes(E), null, 2) + '\n')
    console.log(Object.entries(E).map(([n, w]) => `${n} : ${w.nodes.length} nœuds`).join('\n'))
  } else if (mode === '--ops') {
    for (const [nom, w] of Object.entries(E)) {
      const ops = [...w.nodes.map((n) => ({ type: 'addNode', node: Object.fromEntries(Object.entries(n).filter(([k]) => ['id', 'name', 'type', 'typeVersion', 'position', 'parameters', 'notes'].includes(k))) })),
        ...Object.entries(w.connections).flatMap(([de, c]) => Object.entries(c).flatMap(([genre, sorties]) => sorties.flatMap((l, i) => l.map((x) => ({ type: 'addConnection', source: de, target: x.node, sourceIndex: i, connectionType: genre }))))),
        ...w.nodes.filter((n) => n.executeOnce || n.alwaysOutputData || n.onError).map((n) => ({ type: 'setNodeSettings', nodeName: n.name, settings: { ...(n.executeOnce ? { executeOnce: true } : {}), ...(n.alwaysOutputData ? { alwaysOutputData: true } : {}), ...(n.onError ? { onError: n.onError } : {}) } })),
        { type: 'setWorkflowSettings', settings: { executionTimeout: w.settings.executionTimeout, timezone: 'Europe/Paris', callerPolicy: 'none', saveDataSuccessExecution: 'none', saveDataErrorExecution: 'all', saveExecutionProgress: false } }] // errorWorkflow : posé à la création (SDK, settings) ; update_workflow le refuse tant que lib-erreur-commune n'est pas publié
      for (let i = 0; i * 80 < ops.length; i++) writeFileSync(path.join(dossier, `${nom}.ops-${i + 1}.json`), JSON.stringify(ops.slice(i * 80, i * 80 + 80)))
      console.log(`${nom} : ${ops.length} opérations`)
    }
  }
}
