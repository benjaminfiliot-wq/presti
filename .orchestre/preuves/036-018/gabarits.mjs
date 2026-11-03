// 036-018 — fabrique les cinq gabarits OUTILLÉS de l'Entreprise sur mesure (seconde moitié) et écrit leurs exports + le registre des empreintes.
//   node .orchestre/preuves/036-018/gabarits.mjs
// gabarit-ent-operations, -administratif, -finance, -apres-vente, -direction. Inactifs, sans identifiant (R21), sans webhook (R22), porte « simulation » devant
// chaque effet (R15). Même méthode que 036-016 (briques copiées dans base-construire.mjs). Exemple. Données fictives.
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import * as K from './codes.mjs'
import * as B from './base-construire.mjs'

const { WF, lire, ecrire, modifier, externe, porte, si, aiguille, source, agentIA, outilLecture, noeudDe, releve, tronc, actions, voieCarte, voiesEquipe, fermer, lisezMoi, MENTION, IT, MAIL, sq } = B

const IT1 = "$('Quel effet ?').first().json"
const fusion = (w, nom, n) => w.add(nom, 'n8n-nodes-base.merge', 3.2, { numberInputs: n }, { notes: 'Réunit les voies avant la décision : la décision ne tourne qu’une fois par passage.' })
const brancher = (w, de, vers, entree, sortie = 0) => { w.link(de, vers, { out: sortie }); const l = w.conn[de].main[sortie]; l[l.length - 1].index = entree }
const nd = (w, nom, type, version, parameters, extra = {}) => w.add(nom, type, version, parameters, extra)
const rl = (value, mode = 'id') => ({ __rl: true, mode, value })
const CFG_R = (col) => `={{ $('Lire la configuration (relève)').first()?.json?.${col} }}`
const lecture = (notes) => ({ alwaysOutputData: true, executeOnce: true, notes })
const filtreVrai = (w, nom, expr, notes) => w.add(nom, 'n8n-nodes-base.filter', 2.2, { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ id: nom, leftValue: expr, rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, options: {} }, { notes })

// Le choix de l'outil du client : un Switch sur la configuration ; « aucun » ne branche rien (un outil absent ne fait pas échouer le passage).
function choix(w, nom, colonne, valeurs, entree, notes) {
  const sw = aiguille(w, nom, CFG_R(colonne), [...valeurs, 'aucun'], notes)
  const vide = w.add(`Sans ${nom.toLowerCase()}`, 'n8n-nodes-base.noOp', 1, {}, { notes: 'Le client n’utilise aucun outil pour ce rôle : rien n’est lu.' })
  w.link(sw, vide, { out: valeurs.length })
  w.link(entree, sw, { out: 1 })
  return sw
}
// Un outil de lecture du catalogue, hors squelettes : même note que les autres (R23).
const outil = (w, nom, type, version, parameters, ce, plus = '') => w.add(nom, type, version, parameters, { notes: `outil: lecture\nL’agent lit seulement : ${ce}. Il n’écrit rien : l’écriture se fait après la porte, sur le chemin principal (R23).${plus}` })
const AGENDA_OUTIL = (w) => outil(w, 'Lire l’agenda Google (outil)', 'n8n-nodes-base.googleCalendarTool', 1.3, { resource: 'calendar', operation: 'availability', calendar: rl('AGENDA_DU_CLIENT'), timeMin: "={{ $fromAI('debut', 'début de la plage, date ISO', 'string') }}", timeMax: "={{ $fromAI('fin', 'fin de la plage, date ISO', 'string') }}", options: { outputFormat: 'availability' } }, 'les disponibilités de l’agenda Google du client')
const OUTLOOK_AGENDA_OUTIL = (w) => outil(w, 'Lire l’agenda Outlook (outil)', 'n8n-nodes-base.microsoftOutlookTool', 2, { resource: 'event', operation: 'getAll', fromAllCalendars: true, returnAll: false, limit: 20 }, 'les événements de l’agenda Outlook du client')
const SHEETS_OUTIL = (w, ce = 'une feuille du classeur Sheets du client') => outil(w, 'Lire le classeur Sheets (outil)', 'n8n-nodes-base.googleSheetsTool', 4.7, { resource: 'sheet', operation: 'read', documentId: rl('CLASSEUR_SHEETS_DU_CLIENT'), sheetName: rl('Feuille 1', 'name') }, ce)
const DRIVE_OUTIL = (w, ce = 'les fichiers du Drive du client (recherche par nom)', sfx = '') => outil(w, 'Chercher dans le Drive (outil)' + sfx, 'n8n-nodes-base.googleDriveTool', 3, { resource: 'fileFolder', operation: 'search', searchMethod: 'name', queryString: "={{ $fromAI('nom', 'nom ou début du nom du fichier', 'string') }}", returnAll: false, limit: 10, filter: {}, options: {} }, ce)
const GMAIL_OUTIL = (w, ce) => outilLecture(w, 'Lire le fil Gmail', 'gmail', 'n8n-nodes-base.gmailTool#message.getAll (outil d\'agent)', {}, ce)
const OUTLOOK_OUTIL = (w, ce) => outilLecture(w, 'Lire le fil Outlook', 'microsoftOutlook', 'n8n-nodes-base.microsoftOutlookTool#message.getAll (outil d\'agent)', {}, ce)

// Écrire à quelqu'un par la boîte du client : un seul endroit, avec la mention de l'assistant ; l'envoi est noté (la relance suivante en tient compte).
function voieCourriel(w, fins, lanes, [cleGmail, cleOutlook]) {
  const gm = noeudDe(w, 'Envoyer par Gmail', 'n8n-nodes-base.gmail', 'n8n-nodes-base.gmail#message.send', { sendTo: `={{ ${IT}.destinataire }}`, subject: `={{ ${IT}.objet }}`, message: MAIL(`={{ ${IT}.texte }}`), options: { appendAttribution: false } }, { notes: 'pied: mention\nEnvoi au nom du client, depuis sa boîte, une seule fois (clé d’action réservée avant). Mention de l’assistant en pied.' })
  const ou = noeudDe(w, 'Envoyer par Outlook', 'n8n-nodes-base.microsoftOutlook', 'n8n-nodes-base.microsoftOutlook#message.send', { toRecipients: `={{ ${IT}.destinataire }}`, subject: `={{ ${IT}.objet }}`, bodyContent: MAIL(`={{ ${IT}.texte }}`) }, { notes: 'pied: mention\nEnvoi au nom du client, depuis sa boîte Outlook, une seule fois. Mention de l’assistant en pied.' })
  const noter = ecrire(w, 'Noter l’envoi', 'entreprise_relances', `cle_idempotence: ${IT}.cle_idempotence, objet_ref: ${IT}.objet_ref, type_objet: ${IT}.type_objet, palier: ${IT}.palier, envoyee_le: new Date().toISOString()`, { notes: 'Chaque envoi est une ligne : la prochaine passe compte les envois et leur date (jamais deux relances le même jour, un nombre borné).' })
  w.link(gm, noter); w.link(ou, noter)
  lanes[cleGmail] = gm; lanes[cleOutlook] = ou; fins.push(noter)
}
// Le noyau commun après la décision : réserver, garder, aiguiller, journaliser.
function noyau(w, { lanes, fins }) {
  const garder = actions(w, { avantSwitch: 'Décider les effets' })
  fermer(w, lanes, fins)
  w.link(garder, 'Quel effet ?')
}
function voiesCommunes(w, lanes, fins) { lanes.carte = voieCarte(w); fins.push(lanes.carte) }
// Passage avec un agent : la porte (faux) → filtre → agent → revalidation → fusion avec le chemin direct → décision.
function merge2(w, porteNom, revalider, entree = 0) {
  fusion(w, 'Réunir les voies', 2)
  brancher(w, revalider, 'Réunir les voies', 0); brancher(w, porteNom, 'Réunir les voies', 1, 1)
  w.code('Décider les effets', '', '')
}
const decider = (w, code, notes) => { const n = w.nodes.find((x) => x.name === 'Décider les effets'); n.parameters.jsCode = code; n.notes = notes }
// Les validations d'équipe par Slack ou Teams : le résultat approuve ou refuse la carte (comme le marketing de 036-016).
function validations(w, lanes, fins) {
  const v = (nom, type, cle, surcharge) => {
    noeudDe(w, `Valider par ${nom}`, type, cle, surcharge, { notes: `pied: mention\nValidation d’équipe (${nom}) : le message attend la réponse d’un membre du canal du périmètre (C6). Valider ou refuser. Rien ne part ici : la carte approuvée est reprise par la relève.` })
    si(w, `Validation ${nom} reçue ?`, '={{ $json.data?.approved === true }}', 'Approuvé : la carte passe à « approuvée ». Sinon (refus ou délai) : « refusée ».')
    modifier(w, `Approuver la carte (${nom})`, 'entreprise_cartes', [['cle_idempotence', `${IT}.carte_a_valider`]], `statut: 'approuvee', approuvee_par_role: (${IT}.approbateurs_roles ?? [])[0] ?? null`, { notes: 'Le canal de validation est propre au périmètre : ses membres sont les approbateurs du périmètre.' })
    modifier(w, `Refuser la carte (${nom})`, 'entreprise_cartes', [['cle_idempotence', `${IT}.carte_a_valider`]], "statut: 'refusee'")
    w.link(`Valider par ${nom}`, `Validation ${nom} reçue ?`); w.link(`Validation ${nom} reçue ?`, `Approuver la carte (${nom})`, { out: 0 }); w.link(`Validation ${nom} reçue ?`, `Refuser la carte (${nom})`, { out: 1 })
    fins.push(`Approuver la carte (${nom})`, `Refuser la carte (${nom})`)
    return `Valider par ${nom}`
  }
  const pied = `\n\n—\n${MENTION}{{ ${IT}.entreprise ? ' de ' + ${IT}.entreprise : '' }}.`
  lanes.valider_slack = v('Slack', 'n8n-nodes-base.slack', 'n8n-nodes-base.slack#message.sendAndWait', { channelId: rl(`={{ ${IT}.canal_equipe }}`), message: `={{ ${IT}.texte }}${pied}` })
  lanes.valider_teams = v('Teams', 'n8n-nodes-base.microsoftTeams', 'n8n-nodes-base.microsoftTeams#chatMessage.sendAndWait', { chatId: rl(`={{ ${IT}.canal_equipe }}`), message: `={{ ${IT}.texte }}${pied}` })
}
// Docs : créer le document puis y écrire le texte validé par le code.
function voieDocs(w, fins, lanes, cle, dossier) {
  nd(w, `Docs : créer (${cle})`, 'n8n-nodes-base.googleDocs', 2, { resource: 'document', operation: 'create', title: `={{ ${IT}.titre }}`, folderId: dossier }, { notes: 'Un document vide dans le dossier du client (écriture, derrière la porte).' })
  nd(w, `Docs : écrire (${cle})`, 'n8n-nodes-base.googleDocs', 2, { resource: 'document', operation: 'update', documentURL: '={{ $json.id }}', simple: true, actionsUi: { actionFields: [{ object: 'text', action: 'insert', locationChoice: 'endOfSegmentLocation', text: `={{ ${IT}.corps }}` }] } }, { notes: 'Le texte vient du code (chiffres) ou d’un texte revalidé : jamais d’une sortie brute du modèle.' })
  w.link(`Docs : créer (${cle})`, `Docs : écrire (${cle})`)
  lanes[cle] = `Docs : créer (${cle})`; fins.push(`Docs : écrire (${cle})`)
}

// ═════════════════════════════════════════════ gabarit-ent-operations ═══════════════════════════════════════════════════════════════
function operations() {
  const w = new WF('gabarit-ent-operations')
  lisezMoi(w, 'Opérations', ['Planificateur sur l’agenda RÉEL du client (Google Agenda ou Outlook, en lecture) : le CODE cherche les créneaux libres par membre, dans les heures de travail, sur dix jours ; le modèle ne choisit qu’un NUMÉRO dans cette liste.', 'Projets dans ClickUp, monday ou Notion ; dossiers dans Drive ou OneDrive ; import Sheets ou Excel par le circuit contrôlé (ligne vérifiée par le code, jamais importée en anomalie).', 'Rien ne s’écrit sans passer par l’annexe d’autonomie du contrat, type d’action par type d’action.'])
  const r = releve(w, 'ent-operations')
  w.code('Entrée d’exemple', K.OPS_EXEMPLE, 'Exemple. Un chantier, un créneau déjà pris, une ligne : en simulation, aucune lecture d’un outil du client.')
  w.link(r.porteA, 'Entrée d’exemple', { out: 0 })
  fusion(w, 'Réunir les relèves', 4)
  const src = (lecteur, s, entree, etiquette = s) => { source(w, `Source : ${etiquette}`, s); w.link(lecteur, `Source : ${etiquette}`); brancher(w, `Source : ${etiquette}`, 'Réunir les relèves', entree) }
  // Agenda
  const sa = choix(w, 'Quel agenda ?', 'outil_agenda', ['google', 'outlook'], r.porteA, 'Le client a UN agenda : la copie garde la branche de son outil.')
  nd(w, 'Lire l’agenda Google', 'n8n-nodes-base.googleCalendar', 1.3, { resource: 'event', operation: 'getAll', calendar: rl('AGENDA_DU_CLIENT'), returnAll: false, limit: 100, timeMin: '={{ $now }}', timeMax: '={{ $now.plus({ days: 10 }) }}', options: {} }, lecture('Les événements des dix prochains jours dans l’agenda Google du client (lecture seule) : ce sont les créneaux déjà pris.'))
  nd(w, 'Lire l’agenda Outlook', 'n8n-nodes-base.microsoftOutlook', 2, { resource: 'event', operation: 'getAll', fromAllCalendars: true, returnAll: false, limit: 100 }, lecture('Les événements de l’agenda Outlook du client (lecture seule) : ce sont les créneaux déjà pris. Paramètres à confirmer à l’essai de lecture.'))
  w.link(sa, 'Lire l’agenda Google', { out: 0 }); w.link(sa, 'Lire l’agenda Outlook', { out: 1 })
  src('Lire l’agenda Google', 'google_agenda', 0); src('Lire l’agenda Outlook', 'outlook_agenda', 0)
  // Projets
  const sp = choix(w, 'Quel outil de projets ?', 'outil_projets', ['clickup', 'monday', 'notion'], r.porteA, 'Le client a UN outil de projets : la copie garde la branche de son outil.')
  nd(w, 'Lire les tâches ClickUp', 'n8n-nodes-base.clickUp', 1, { resource: 'task', operation: 'getAll', team: 'EQUIPE_CLICKUP', space: 'ESPACE_CLICKUP', folderless: true, list: 'LISTE_CLICKUP', returnAll: false, limit: 100 }, lecture('Les tâches de la liste ClickUp du client (lecture seule) : pour ne jamais créer une tâche en double. La copie remplace les trois identifiants de liste.'))
  noeudDe(w, 'Lire les éléments monday', 'n8n-nodes-base.mondayCom', 'n8n-nodes-base.mondayCom#item.getItems', {}, lecture('Les éléments du tableau monday du client (lecture seule) : pour ne jamais créer un élément en double.'))
  noeudDe(w, 'Lire les pages Notion', 'n8n-nodes-base.notion', 'n8n-nodes-base.notion#databasePage.getAll', {}, lecture('Les pages de la base Notion du client (lecture seule) : pour ne jamais créer une page en double.'))
  ;['Lire les éléments monday', 'Lire les pages Notion'].forEach((n) => { const x = w.nodes.find((y) => y.name === n); x.alwaysOutputData = true; x.executeOnce = true })
  w.link(sp, 'Lire les tâches ClickUp', { out: 0 }); w.link(sp, 'Lire les éléments monday', { out: 1 }); w.link(sp, 'Lire les pages Notion', { out: 2 })
  src('Lire les tâches ClickUp', 'clickup', 1); src('Lire les éléments monday', 'monday', 1); src('Lire les pages Notion', 'notion', 1)
  // Import par le circuit contrôlé
  const st = choix(w, 'Quel tableur ?', 'outil_tableur', ['sheets', 'excel'], r.porteA, 'Le client a UN tableur d’import : la copie garde la branche de son outil.')
  nd(w, 'Lire le classeur Sheets', 'n8n-nodes-base.googleSheets', 4.7, { resource: 'sheet', operation: 'read', documentId: rl('CLASSEUR_SHEETS_DU_CLIENT'), sheetName: rl('A_IMPORTER', 'name'), filtersUI: {}, combineFilters: 'AND', options: {} }, lecture('Les lignes à importer dans le classeur Sheets du client (lecture seule). Chaque ligne passera le contrôle du code avant toute écriture.'))
  nd(w, 'Lire le classeur Excel', 'n8n-nodes-base.microsoftExcel', 2.2, { resource: 'worksheet', operation: 'readRows', workbook: rl('CLASSEUR_EXCEL_DU_CLIENT'), worksheet: rl('{00000000-0001-0000-0000-000000000000}'), dataProperty: 'data', filters: {}, options: {} }, lecture('Les lignes à importer dans le classeur Excel du client (lecture seule). Chaque ligne passera le contrôle du code avant toute écriture.'))
  w.link(st, 'Lire le classeur Sheets', { out: 0 }); w.link(st, 'Lire le classeur Excel', { out: 1 })
  src('Lire le classeur Sheets', 'sheets', 2); src('Lire le classeur Excel', 'excel', 2)
  // La plateforme : les chantiers à planifier
  lire(w, 'Lire les chantiers à planifier', 'entreprise_chantiers', 'chantier_ref,libelle_court,duree_min,competence', [{ name: 'statut', value: 'eq.a_planifier' }], { org: B.ORGR, notes: 'Les chantiers que l’équipe a posés à planifier : un par ligne, avec sa durée et la compétence demandée.' })
  w.link(r.porteA, 'Lire les chantiers à planifier', { out: 1 }); src('Lire les chantiers à planifier', 'plateforme', 3)
  w.code('Normaliser les entrées', K.OPS_NORMALISER, 'Une seule forme pour tous les outils : événements (créneaux pris), tâches, chantiers, lignes d’import vérifiées. Une ligne en anomalie ne s’importe jamais.')
  w.link('Réunir les relèves', 'Normaliser les entrées'); w.link('Entrée d’exemple', 'Normaliser les entrées')
  lire(w, 'Lire les équipes', 'entreprise_equipes', 'membre_ref,libelle_court,competence', [], { notes: 'Les membres de l’équipe du client et leur compétence : le planificateur ne propose jamais quelqu’un qui n’y figure pas.' })
  const fin = tronc(w, { contextes: ['Lire les équipes'], identites: false, entreeNormaliser: 'Normaliser les entrées', nomNormaliser: 'Normaliser les entrées' })
  w.code('Préparer le planning', K.OPS_PREPARER, 'Le CODE cherche les créneaux libres de chaque membre compétent (heures de travail du client, dix jours) et numérote les propositions. Le modèle ne verra que cette liste.')
  porte(w, 'Porte simulation', "={{ $('Lire la configuration').first()?.json?.simulation !== false }}", 'Devant le modèle et devant tout effet.')
  w.code('Effets prévus', K.OPS_PREVUS, 'Simulation : le plan est calculé par le même code que le réel, sur un enregistrement daté du modèle. Rien ne s’écrit.')
  w.chaine(fin, 'Préparer le planning', 'Porte simulation'); w.link('Porte simulation', 'Effets prévus', { out: 0 })
  // L'agent
  const tools = [AGENDA_OUTIL(w), OUTLOOK_AGENDA_OUTIL(w),
    outil(w, 'Tâches ClickUp (outil)', 'n8n-nodes-base.clickUpTool', 1, { resource: 'task', operation: 'getAll', team: 'EQUIPE_CLICKUP', space: 'ESPACE_CLICKUP', folderless: true, list: 'LISTE_CLICKUP', returnAll: false, limit: 20 }, 'les tâches en cours de la liste ClickUp du client'),
    SHEETS_OUTIL(w, 'la feuille de charge de l’équipe dans le classeur Sheets du client'),
    outilLecture(w, 'Pages Notion (outil)', 'notion', 'n8n-nodes-base.notionTool#databasePage.getAll (outil d\'agent)', {}, 'les pages de projet dans Notion')]
  filtreVrai(w, 'Chantiers à répartir', "={{ $json.genre === 'chantier' && $json.propositions.length >= 2 }}", 'Un chantier qui n’a qu’une proposition n’a pas besoin du modèle : le code la prend.')
  agentIA(w, { nom: 'Répartiteur', prompt: '={{ JSON.stringify({ cle_idempotence: $json.cle_idempotence, chantier: $json.libelle, competence: $json.competence, duree_min: $json.duree_min, propositions: $json.propositions }) }}',
    systeme: `Tu répartis un chantier entre les membres de l’équipe. Le code te donne une liste NUMÉROTÉE de propositions (membre, créneau) déjà libres dans l’agenda : tu choisis UN numéro de cette liste et tu dis pourquoi en une phrase. Tu n’inventes ni créneau, ni date, ni membre. ${B.REGLES_AGENT}`,
    schema: { type: 'object', additionalProperties: false, required: ['cle_idempotence', 'proposition', 'motif'], properties: { cle_idempotence: { type: 'string' }, proposition: { type: 'integer', minimum: 0, maximum: 9 }, motif: { type: 'string', maxLength: 200 } } },
    outils: tools, note: 'Répartiteur (modèle Claude, parseur, cinq outils de lecture : agendas, projets, charge). Il choisit un numéro dans la liste du code ; le code recalcule le créneau.' })
  w.code('Revalider le répartiteur', K.OPS_REVALIDER, 'Le numéro choisi doit être dans la liste du code ; le créneau est celui du code.')
  w.link('Porte simulation', 'Chantiers à répartir', { out: 1 }); w.chaine('Chantiers à répartir', 'Répartiteur', 'Revalider le répartiteur')
  merge2(w, 'Porte simulation', 'Revalider le répartiteur'); decider(w, K.OPS_DECIDER, 'L’annexe d’autonomie décide pour chaque type d’action : préparer, carte à valider, ou part seul dans le plafond du jour. Un conflit de créneau ou une ligne en anomalie devient une carte d’information.')
  w.link('Réunir les voies', 'Décider les effets')
  // Les voies d'effets
  const lanes = {}, fins = []
  voiesCommunes(w, lanes, fins)
  nd(w, 'Agenda Google : poser le chantier', 'n8n-nodes-base.googleCalendar', 1.3, { resource: 'event', operation: 'create', calendar: rl(`={{ ${IT}.agenda_id }}`), start: `={{ ${IT}.debut }}`, end: `={{ ${IT}.fin }}`, useDefaultReminders: true, additionalFields: { summary: `={{ ${IT}.libelle }}`, sendUpdates: 'none' } }, { notes: 'Rendez-vous posé dans l’agenda Google du client, sans invitation envoyée. Créneau choisi par le code.' })
  lanes.planifier_google = 'Agenda Google : poser le chantier'; fins.push(lanes.planifier_google)
  nd(w, 'Agenda Outlook : poser le chantier', 'n8n-nodes-base.microsoftOutlook', 2, { resource: 'event', operation: 'create', subject: `={{ ${IT}.libelle }}`, startDateTime: `={{ ${IT}.debut }}`, endDateTime: `={{ ${IT}.fin }}`, additionalFields: { timeZone: 'Europe/Paris', body: MAIL(`=Chantier : {{ ${IT}.libelle }}`) } }, { notes: 'pied: mention\nRendez-vous posé dans l’agenda Outlook du client. Créneau choisi par le code ; mention de l’assistant dans la description.' })
  lanes.planifier_outlook = 'Agenda Outlook : poser le chantier'; fins.push(lanes.planifier_outlook)
  nd(w, 'ClickUp : créer la tâche', 'n8n-nodes-base.clickUp', 1, { resource: 'task', operation: 'create', team: 'EQUIPE_CLICKUP', space: 'ESPACE_CLICKUP', folderless: true, list: 'LISTE_CLICKUP', name: `={{ ${IT}.libelle }}`, additionalFields: { dueDate: `={{ new Date(${IT}.echeance).getTime() }}`, dueDateTime: false } }, { notes: 'Tâche créée dans la liste ClickUp du client, une seule fois (la clé d’action est réservée avant).' })
  lanes.tache_clickup = 'ClickUp : créer la tâche'; fins.push(lanes.tache_clickup)
  noeudDe(w, 'monday : créer l’élément', 'n8n-nodes-base.mondayCom', 'n8n-nodes-base.mondayCom#item.createItem', { name: `={{ ${IT}.libelle }}`, columnValuesJson: `={{ JSON.stringify({ echeance: ${IT}.echeance }) }}` }, { notes: 'Élément créé dans le tableau monday du client, une seule fois.' })
  lanes.tache_monday = 'monday : créer l’élément'; fins.push(lanes.tache_monday)
  noeudDe(w, 'Notion : créer la page', 'n8n-nodes-base.notion', 'n8n-nodes-base.notion#databasePage.create', { title: `={{ ${IT}.libelle }}`, markdown: `={{ ${IT}.libelle }}` }, { notes: 'Page créée dans la base Notion du client, une seule fois.' })
  lanes.tache_notion = 'Notion : créer la page'; fins.push(lanes.tache_notion)
  nd(w, 'Drive : créer le dossier', 'n8n-nodes-base.googleDrive', 3, { resource: 'folder', operation: 'create', name: `={{ ${IT}.dossier }}`, driveId: rl('My Drive', 'list'), folderId: rl('root', 'list'), options: {} }, { notes: 'Dossier du chantier dans le Drive du client (écriture, derrière la porte).' })
  lanes.dossier_drive = 'Drive : créer le dossier'; fins.push(lanes.dossier_drive)
  nd(w, 'OneDrive : créer le dossier', 'n8n-nodes-base.microsoftOneDrive', 1.1, { resource: 'folder', operation: 'create', name: `={{ ${IT}.dossier }}`, options: {} }, { notes: 'Dossier du chantier dans le OneDrive du client (écriture, derrière la porte).' })
  lanes.dossier_onedrive = 'OneDrive : créer le dossier'; fins.push(lanes.dossier_onedrive)
  ecrire(w, 'Importer la ligne', 'entreprise_imports', `cle_idempotence: ${IT}.cle_idempotence, ref: ${IT}.ref, libelle: ${IT}.libelle, quantite: ${IT}.quantite`, { notes: 'Ligne importée dans la plateforme APRÈS le contrôle du code (circuit contrôlé) et la carte de l’annexe. Une seule fois par clé.' })
  lanes.import_ligne = 'Importer la ligne'; fins.push(lanes.import_ligne)
  const e = voiesEquipe(w, fins); Object.assign(lanes, { prevenir_slack: e.sl, prevenir_teams: e.te })
  noyau(w, { lanes, fins })
  return w
}

// ═════════════════════════════════════════════ gabarit-ent-administratif ═════════════════════════════════════════════════════════════
function administratif() {
  const w = new WF('gabarit-ent-administratif')
  lisezMoi(w, 'Administratif', ['Pièce manquante : le code croise les sources (Drive ou OneDrive, Gmail ou Outlook) et relance qui doit le document, si son adresse est connue ; trois relances au plus, à trois jours d’écart.', 'Échéances (assurances, attestations, contrôles) posées dans l’Agenda du client avant la date ; attestations rédigées dans Docs à partir des seuls faits du dossier.', 'Sans destinataire connu, rien n’est écrit à personne : l’équipe est informée.'])
  const r = releve(w, 'ent-administratif')
  w.code('Entrée d’exemple', K.ADM_EXEMPLE, 'Exemple. Une pièce attendue, une attestation qui expire, une attestation à rédiger : aucune lecture d’un outil du client.')
  w.link(r.porteA, 'Entrée d’exemple', { out: 0 })
  fusion(w, 'Réunir les relèves', 6)
  const src = (lecteur, s, entree, etiquette = s) => { source(w, `Source : ${etiquette}`, s); w.link(lecteur, `Source : ${etiquette}`); brancher(w, `Source : ${etiquette}`, 'Réunir les relèves', entree) }
  const sd = choix(w, 'Quel espace de fichiers ?', 'outil_dossiers', ['drive', 'onedrive'], r.porteA, 'Le client a UN espace de fichiers : la copie garde la branche de son outil.')
  nd(w, 'Chercher dans Drive', 'n8n-nodes-base.googleDrive', 3, { resource: 'fileFolder', operation: 'search', searchMethod: 'name', queryString: '', returnAll: false, limit: 100, filter: { folderId: rl('DOSSIER_DES_PIECES_DU_CLIENT'), whatToSearch: 'files' }, options: {} }, lecture('Les fichiers du dossier des pièces dans le Drive du client (lecture seule) : une pièce est présente si sa référence se lit dans un nom de fichier.'))
  nd(w, 'Chercher dans OneDrive', 'n8n-nodes-base.microsoftOneDrive', 1.1, { resource: 'file', operation: 'search', query: '*' }, lecture('Les fichiers du OneDrive du client (lecture seule) : une pièce est présente si sa référence se lit dans un nom de fichier.'))
  w.link(sd, 'Chercher dans Drive', { out: 0 }); w.link(sd, 'Chercher dans OneDrive', { out: 1 })
  src('Chercher dans Drive', 'drive', 0); src('Chercher dans OneDrive', 'onedrive', 0)
  const sb = choix(w, 'Quelle boîte ?', 'boite_client', ['gmail', 'outlook'], r.porteA, 'Le client a UNE boîte : la copie garde la branche de son outil.')
  nd(w, 'Chercher dans Gmail', 'n8n-nodes-base.gmail', 2.2, { resource: 'message', operation: 'getAll', returnAll: false, limit: 100, simple: true, filters: { q: 'newer_than:60d has:attachment' } }, lecture('Les courriers récents avec pièce jointe dans la boîte Gmail du client (lecture seule) : une pièce est présente si sa référence se lit dans le sujet.'))
  nd(w, 'Chercher dans Outlook', 'n8n-nodes-base.microsoftOutlook', 2, { resource: 'message', operation: 'getAll', returnAll: false, limit: 100, output: 'simple' }, lecture('Les courriers récents dans la boîte Outlook du client (lecture seule) : une pièce est présente si sa référence se lit dans le sujet.'))
  w.link(sb, 'Chercher dans Gmail', { out: 0 }); w.link(sb, 'Chercher dans Outlook', { out: 1 })
  src('Chercher dans Gmail', 'gmail', 1); src('Chercher dans Outlook', 'outlook', 1)
  const sa = choix(w, 'Quel agenda ?', 'outil_agenda', ['google', 'outlook'], r.porteA, 'Le client a UN agenda : la copie garde la branche de son outil.')
  nd(w, 'Lire l’agenda Google', 'n8n-nodes-base.googleCalendar', 1.3, { resource: 'event', operation: 'getAll', calendar: rl('AGENDA_DU_CLIENT'), returnAll: false, limit: 200, timeMin: '={{ $now }}', timeMax: '={{ $now.plus({ days: 120 }) }}', options: {} }, lecture('Les événements des quatre prochains mois (lecture seule) : pour ne jamais poser deux fois la même échéance.'))
  nd(w, 'Lire l’agenda Outlook', 'n8n-nodes-base.microsoftOutlook', 2, { resource: 'event', operation: 'getAll', fromAllCalendars: true, returnAll: false, limit: 200 }, lecture('Les événements de l’agenda Outlook (lecture seule) : pour ne jamais poser deux fois la même échéance. Paramètres à confirmer à l’essai de lecture.'))
  w.link(sa, 'Lire l’agenda Google', { out: 0 }); w.link(sa, 'Lire l’agenda Outlook', { out: 1 })
  src('Lire l’agenda Google', 'agenda', 2, 'agenda Google'); src('Lire l’agenda Outlook', 'agenda', 2, 'agenda Outlook')
  const plat = (nom, table, cols, filtres, s, i, notes) => { lire(w, nom, table, cols, filtres, { org: B.ORGR, notes }); w.link(r.porteA, nom, { out: 1 }); src(nom, s, i) }
  plat('Lire les pièces attendues', 'entreprise_pieces_attendues', 'piece_ref,libelle_court,tiers_courriel', [{ name: 'statut', value: 'eq.attendue' }], 'plateforme_piece', 3, 'Les pièces que l’équipe attend, avec la personne qui doit les fournir (si son adresse est connue).')
  plat('Lire les échéances', 'entreprise_echeances', 'echeance_ref,libelle_court,type_echeance,date_echeance,tiers_courriel', [{ name: 'actif', value: 'eq.true' }], 'plateforme_echeance', 4, 'Les échéances suivies : assurances, attestations, contrôles, avec leur date.')
  plat('Lire les attestations demandées', 'entreprise_attestations', 'attestation_ref,libelle_court,faits_cles', [{ name: 'statut', value: 'eq.a_rediger' }], 'plateforme_attestation', 5, 'Les attestations à rédiger, avec les seuls faits du dossier.')
  w.code('Normaliser les entrées', K.ADM_NORMALISER, 'Une seule forme pour tous les outils : pièces attendues, échéances, attestations, noms de fichiers, sujets de courriers, titres d’agenda.')
  w.link('Réunir les relèves', 'Normaliser les entrées'); w.link('Entrée d’exemple', 'Normaliser les entrées')
  lire(w, 'Lire les relances faites', 'entreprise_relances', 'objet_ref,type_objet,palier,envoyee_le', [], { notes: 'Les relances déjà envoyées : le code les compte et compte les jours écoulés (trois relances au plus, trois jours d’écart).' })
  const fin = tronc(w, { contextes: ['Lire les relances faites'], identites: false, entreeNormaliser: 'Normaliser les entrées', nomNormaliser: 'Normaliser les entrées' })
  w.code('Croiser les sources', K.ADM_CROISER, 'Le code croise : une pièce est manquante si sa référence ne se lit nulle part ; une échéance est proche dans la fenêtre du client ; une relance est due selon le nombre et la date des précédentes.')
  porte(w, 'Porte simulation', "={{ $('Lire la configuration').first()?.json?.simulation !== false }}", 'Devant le modèle et devant tout effet.')
  w.code('Effets prévus', K.ADM_PREVUS, 'Simulation : le plan est calculé par le même code que le réel, sur un enregistrement daté des rédacteurs. Rien ne part.')
  w.chaine(fin, 'Croiser les sources', 'Porte simulation'); w.link('Porte simulation', 'Effets prévus', { out: 0 })
  const tRel = [GMAIL_OUTIL(w, 'les derniers échanges avec la personne dans la boîte Gmail'), OUTLOOK_OUTIL(w, 'les derniers échanges avec la personne dans la boîte Outlook'), DRIVE_OUTIL(w)]
  const tAtt = [DRIVE_OUTIL(w, 'les modèles d’attestation et les pièces du dossier dans le Drive du client', ' (attestations)'), SHEETS_OUTIL(w, 'le registre des attestations déjà délivrées')]
  tAtt[0] = tAtt[0]
  filtreVrai(w, 'Relances à rédiger', "={{ (($json.genre === 'piece' && $json.manquante === true) || ($json.genre === 'echeance' && $json.proche === true)) && $json.relance_due === true && !!$json.tiers_courriel }}", 'Seules les pièces manquantes et les échéances proches, dues, avec un destinataire connu, passent au rédacteur.')
  filtreVrai(w, 'Attestations à rédiger', "={{ $json.genre === 'attestation' }}", 'Seules les attestations demandées passent au rédacteur.')
  agentIA(w, { nom: 'Rédacteur de relances', prompt: '={{ JSON.stringify({ cle_idempotence: $json.cle_idempotence, genre: $json.genre, libelle: $json.libelle, palier: $json.palier, jours: $json.jours ?? null }) }}',
    systeme: `Tu rédiges la relance d’une personne qui doit fournir un document (pièce ou renouvellement d’une attestation), en deux à quatre phrases, polies, avec une seule demande claire. Le palier (1, 2 ou 3) dit le ton : de plus en plus ferme. Aucune date précise, aucun prix, aucune menace. ${B.REGLES_AGENT}`,
    schema: { type: 'object', additionalProperties: false, required: ['cle_idempotence', 'objet', 'texte'], properties: { cle_idempotence: { type: 'string' }, objet: { type: 'string', maxLength: 120 }, texte: { type: 'string', maxLength: 900 } } },
    outils: tRel, note: 'Rédacteur de relances de pièces (modèle Claude, parseur, trois outils de lecture). Le code a décidé s’il faut relancer, qui, et combien de fois.' })
  w.code('Revalider les relances', K.ADM_REV_RELANCE, 'Texte sans prix ni nom de la plateforme ; objet et texte bornés.')
  w.link('Porte simulation', 'Relances à rédiger', { out: 1 }); w.chaine('Relances à rédiger', 'Rédacteur de relances', 'Revalider les relances')
  agentIA(w, { nom: 'Rédacteur d’attestations', prompt: '={{ JSON.stringify({ cle_idempotence: $json.cle_idempotence, libelle: $json.libelle, faits: $json.faits }) }}',
    systeme: `Tu rédiges une attestation à partir des SEULS faits du dossier : chaque fait doit apparaître mot pour mot, et aucun autre nombre, date ou nom ne doit paraître. Ton neutre, trois à six phrases. ${B.REGLES_AGENT}`,
    schema: { type: 'object', additionalProperties: false, required: ['cle_idempotence', 'titre', 'corps'], properties: { cle_idempotence: { type: 'string' }, titre: { type: 'string', maxLength: 120 }, corps: { type: 'string', maxLength: 2500 } } },
    outils: tAtt, note: 'Rédacteur d’attestations (modèle Claude, parseur, deux outils de lecture). Le code vérifie que chaque fait y figure et qu’aucun nombre n’est inventé.' })
  w.code('Revalider les attestations', K.ADM_REV_ATTESTATION, 'Chaque fait du dossier est dans le texte ; aucun nombre ne paraît qui ne soit pas un fait ; pas de prix, pas de nom de la plateforme.')
  w.link('Porte simulation', 'Attestations à rédiger', { out: 1 }); w.chaine('Attestations à rédiger', 'Rédacteur d’attestations', 'Revalider les attestations')
  fusion(w, 'Réunir les voies', 3)
  brancher(w, 'Revalider les relances', 'Réunir les voies', 0); brancher(w, 'Revalider les attestations', 'Réunir les voies', 1); brancher(w, 'Porte simulation', 'Réunir les voies', 2, 1)
  w.code('Décider les effets', K.ADM_DECIDER, 'Une relance ne part que si le destinataire est connu ; sinon l’équipe est informée. L’annexe d’autonomie décide ensuite pour chaque type d’action.')
  w.link('Réunir les voies', 'Décider les effets')
  const lanes = {}, fins = []
  voiesCommunes(w, lanes, fins)
  nd(w, 'Agenda Google : poser l’échéance', 'n8n-nodes-base.googleCalendar', 1.3, { resource: 'event', operation: 'create', calendar: rl(`={{ ${IT}.agenda_id }}`), start: `={{ ${IT}.date }}`, end: `={{ ${IT}.date_fin }}`, useDefaultReminders: true, additionalFields: { allday: 'yes', summary: `={{ 'Échéance : ' + ${IT}.libelle + ' [' + ${IT}.ref + ']' }}`, sendUpdates: 'none' } }, { notes: 'Échéance posée en journée entière dans l’agenda Google du client, sans invitation. La référence entre crochets évite tout doublon.' })
  nd(w, 'Agenda Outlook : poser l’échéance', 'n8n-nodes-base.microsoftOutlook', 2, { resource: 'event', operation: 'create', subject: `={{ 'Échéance : ' + ${IT}.libelle + ' [' + ${IT}.ref + ']' }}`, startDateTime: `={{ ${IT}.date }}`, endDateTime: `={{ ${IT}.date_fin }}`, additionalFields: { isAllDay: true, timeZone: 'Europe/Paris', body: MAIL(`=Échéance : {{ ${IT}.libelle }}`) } }, { notes: 'pied: mention\nÉchéance posée en journée entière dans l’agenda Outlook du client. La référence entre crochets évite tout doublon.' })
  lanes.echeance_agenda_google = 'Agenda Google : poser l’échéance'; lanes.echeance_agenda_outlook = 'Agenda Outlook : poser l’échéance'; fins.push(lanes.echeance_agenda_google, lanes.echeance_agenda_outlook)
  voieDocs(w, fins, lanes, 'attestation_docs', 'DOSSIER_ATTESTATIONS_DU_CLIENT')
  voieCourriel(w, fins, lanes, ['relance_gmail', 'relance_outlook'])
  const e = voiesEquipe(w, fins); Object.assign(lanes, { prevenir_slack: e.sl, prevenir_teams: e.te })
  noyau(w, { lanes, fins })
  return w
}

// ═════════════════════════════════════════════ gabarit-ent-finance ═══════════════════════════════════════════════════════════════
function finance() {
  const w = new WF('gabarit-ent-finance')
  lisezMoi(w, 'Finance', ['Encaissements LUS dans Stripe, QuickBooks, Xero ou Qonto (par l’API, lecture seule) : le code rapproche chaque paiement d’une facture ; une facture soldée arrête ses relances.', 'Facturier « quand c’est fini » : le chantier terminé est chiffré par le code avec le tarif du client ; un tarif manquant = pas de facture. Relanceur d’impayés : le montant restant dû est celui du code, jamais celui du modèle.', 'Export au comptable : un FICHIER (jamais une écriture dans sa compta). AUCUNE écriture bancaire. Pennylane, Tiime, Sage : le format d’import est à confirmer avec le comptable.'])
  const r = releve(w, 'ent-finance')
  w.code('Entrée d’exemple', K.FIN_EXEMPLE, 'Exemple. Deux factures (une réglée), un paiement lu, un chantier terminé : aucune lecture d’un outil du client.')
  w.link(r.porteA, 'Entrée d’exemple', { out: 0 })
  fusion(w, 'Réunir les relèves', 5)
  const src = (lecteur, s, entree, etiquette = s) => { source(w, `Source : ${etiquette}`, s); w.link(lecteur, `Source : ${etiquette}`); brancher(w, `Source : ${etiquette}`, 'Réunir les relèves', entree) }
  const sc = choix(w, 'Quel outil d’encaissement ?', 'outil_compta', ['stripe', 'quickbooks', 'xero'], r.porteA, 'Le client lit ses encaissements dans UN outil : la copie garde la branche de son outil.')
  nd(w, 'Lire les paiements Stripe', 'n8n-nodes-base.stripe', 1, { resource: 'charge', operation: 'getAll', returnAll: false, limit: 100 }, lecture('Les paiements récents du compte Stripe du client (lecture seule). Le numéro de facture se lit dans les métadonnées du paiement.'))
  nd(w, 'Lire les factures QuickBooks', 'n8n-nodes-base.quickbooks', 1, { resource: 'invoice', operation: 'getAll', returnAll: false, limit: 100, filters: { query: 'select * from Invoice orderby MetaData.LastUpdatedTime desc' } }, lecture('Les factures de QuickBooks (lecture seule) : une facture au solde nul est un paiement lu. La requête est à confirmer à l’essai de lecture.'))
  nd(w, 'Lire les factures Xero', 'n8n-nodes-base.xero', 1, { resource: 'invoice', operation: 'getAll', organizationId: 'ORGANISATION_XERO_DU_CLIENT', returnAll: false, limit: 100, options: {} }, lecture('Les factures de Xero (lecture seule) : une facture au statut payé est un paiement lu.'))
  w.link(sc, 'Lire les paiements Stripe', { out: 0 }); w.link(sc, 'Lire les factures QuickBooks', { out: 1 }); w.link(sc, 'Lire les factures Xero', { out: 2 })
  src('Lire les paiements Stripe', 'stripe', 0); src('Lire les factures QuickBooks', 'quickbooks', 0); src('Lire les factures Xero', 'xero', 0)
  const sq2 = choix(w, 'Quelle banque ?', 'outil_banque', ['qonto'], r.porteA, 'Banque lue en LECTURE SEULE. Qonto par l’API ; un agrégateur bancaire reste à étudier (gratuit d’abord).')
  externe(w, 'Lire les virements Qonto', 'GET', 'https://thirdparty.qonto.com/v2/transactions', { query: [{ name: 'iban', value: 'IBAN_DU_CLIENT' }, { name: 'side', value: 'credit' }, { name: 'status[]', value: 'completed' }, { name: 'per_page', value: '100' }], notes: 'Qonto par l’API, LECTURE SEULE : les virements reçus. Aucune écriture bancaire dans ce gabarit. La copie remplace IBAN_DU_CLIENT et branche son jeton.', once: true })
  w.link(sq2, 'Lire les virements Qonto', { out: 0 }); src('Lire les virements Qonto', 'qonto', 1)
  externe(w, 'Lire les factures Pennylane', 'GET', 'https://app.pennylane.com/api/external/v2/customer_invoices', { query: [{ name: 'limit', value: '100' }], notes: 'Pennylane par l’API, LECTURE SEULE : ce que le comptable a déjà. Sert à ne pas exporter deux fois. La forme de la réponse est à confirmer à l’essai de lecture.', once: true })
  w.link(r.porteA, 'Lire les factures Pennylane', { out: 1 }); src('Lire les factures Pennylane', 'pennylane', 2)
  lire(w, 'Lire les factures', 'entreprise_factures', 'facture_ref,libelle_court,total_ttc_centimes,echeance,statut,payee_le,tiers_courriel', [{ name: 'statut', value: 'in.(envoyee,relancee,partielle,payee)' }], { org: B.ORGR, notes: 'Les factures du client dans la plateforme : montant, échéance, état.' })
  w.link(r.porteA, 'Lire les factures', { out: 1 }); src('Lire les factures', 'plateforme_facture', 3)
  lire(w, 'Lire les chantiers terminés', 'entreprise_chantiers', 'chantier_ref,libelle_court,lignes,tiers_courriel', [{ name: 'statut', value: 'eq.termine' }, { name: 'facture_ref', value: 'is.null' }], { org: B.ORGR, notes: 'Les chantiers terminés qui n’ont pas encore de facture : le facturier « quand c’est fini ».' })
  w.link(r.porteA, 'Lire les chantiers terminés', { out: 1 }); src('Lire les chantiers terminés', 'plateforme_chantier', 4)
  w.code('Normaliser les entrées', K.FIN_NORMALISER, 'Une seule forme pour tous les outils : factures, paiements (montants entiers en centimes), chantiers terminés, ce que le comptable a déjà.')
  w.link('Réunir les relèves', 'Normaliser les entrées'); w.link('Entrée d’exemple', 'Normaliser les entrées')
  lire(w, 'Lire les tarifs', 'entreprise_tarifs', 'ref_tarif,libelle_court,prix_ht_centimes,tva_pct', [], { notes: 'Le tarif du client : un prix vient de ses données, sinon la facture n’est pas chiffrée.' })
  lire(w, 'Lire les relances faites', 'entreprise_relances', 'objet_ref,type_objet,palier,envoyee_le', [], { notes: 'Les relances déjà envoyées : le code les compte et compte les jours écoulés (quatre au plus, sept jours d’écart).' })
  const fin = tronc(w, { contextes: ['Lire les tarifs', 'Lire les relances faites'], identites: false, entreeNormaliser: 'Normaliser les entrées', nomNormaliser: 'Normaliser les entrées' })
  w.code('Rapprocher', K.FIN_RAPPROCHER, 'LE CODE rapproche chaque paiement d’une facture (numéro ou référence libre), calcule le reste dû en centimes, le retard et le palier, et chiffre les chantiers terminés avec le tarif du client.')
  porte(w, 'Porte simulation', "={{ $('Lire la configuration').first()?.json?.simulation !== false }}", 'Devant le modèle et devant tout effet.')
  w.code('Effets prévus', K.FIN_PREVUS, 'Simulation : le plan est calculé par le même code que le réel (montants compris), sur un enregistrement daté du rédacteur. Rien ne part.')
  w.chaine(fin, 'Rapprocher', 'Porte simulation'); w.link('Porte simulation', 'Effets prévus', { out: 0 })
  const tools = [outil(w, 'Paiement Stripe (outil)', 'n8n-nodes-base.stripeTool', 1, { resource: 'charge', operation: 'get', chargeId: "={{ $fromAI('paiement', 'identifiant du paiement', 'string') }}" }, 'un paiement du compte Stripe du client'),
    outil(w, 'Facture QuickBooks (outil)', 'n8n-nodes-base.quickbooksTool', 1, { resource: 'invoice', operation: 'get', invoiceId: "={{ $fromAI('facture', 'identifiant de la facture', 'string') }}" }, 'une facture de QuickBooks', ' Paramètres à confirmer à l’essai de lecture.'),
    outil(w, 'Facture Xero (outil)', 'n8n-nodes-base.xeroTool', 1, { resource: 'invoice', operation: 'get', organizationId: 'ORGANISATION_XERO_DU_CLIENT', invoiceId: "={{ $fromAI('facture', 'identifiant de la facture', 'string') }}" }, 'une facture de Xero', ' Paramètres à confirmer à l’essai de lecture.'),
    GMAIL_OUTIL(w, 'les derniers échanges avec le client dans la boîte Gmail'), OUTLOOK_OUTIL(w, 'les derniers échanges avec le client dans la boîte Outlook')]
  filtreVrai(w, 'Relances à rédiger', "={{ $json.genre === 'facture' && $json.etat === 'en_retard' && $json.relance_due === true }}", 'Seules les factures en retard, dues, avec un destinataire connu, passent au rédacteur.')
  agentIA(w, { nom: 'Rédacteur d’impayés', prompt: '={{ JSON.stringify({ cle_idempotence: $json.cle_idempotence, palier: $json.palier, jours_retard: $json.jours_retard, libelle: $json.libelle }) }}',
    systeme: `Tu rédiges la relance d’une facture impayée, au palier donné par le code (1 : rappel courtois ; 2 : relance ferme ; 3 : dernier avis avant le recouvrement). Deux à quatre phrases, une seule demande. Tu n’écris AUCUN montant, AUCUNE date, AUCUN numéro de facture : le code les ajoute après ton texte. ${B.REGLES_AGENT}`,
    schema: { type: 'object', additionalProperties: false, required: ['cle_idempotence', 'objet', 'texte'], properties: { cle_idempotence: { type: 'string' }, objet: { type: 'string', maxLength: 120 }, texte: { type: 'string', maxLength: 900 } } },
    outils: tools, note: 'Rédacteur d’impayés (modèle Claude, parseur, cinq outils de lecture). Le schéma n’a aucun champ de montant ; le code ajoute le reste dû.' })
  w.code('Revalider les relances', K.FIN_REV_RELANCE, 'Texte sans prix ni nom de la plateforme. Le montant restant dû est ajouté PAR LE CODE à la décision.')
  w.link('Porte simulation', 'Relances à rédiger', { out: 1 }); w.chaine('Relances à rédiger', 'Rédacteur d’impayés', 'Revalider les relances')
  merge2(w, 'Porte simulation', 'Revalider les relances'); decider(w, K.FIN_DECIDER, 'Paiement lu = facture soldée = relances arrêtées. Un reste dû relance au palier du code avec le montant du code. Un tarif manquant ne devient jamais une facture. L’annexe d’autonomie décide ensuite.')
  w.link('Réunir les voies', 'Décider les effets')
  const lanes = {}, fins = []
  voiesCommunes(w, lanes, fins)
  ecrire(w, 'Créer la facture', 'entreprise_factures', `cle_idempotence: ${IT}.cle_idempotence, chantier_ref: ${IT}.chantier_ref, libelle_court: ${IT}.libelle, lignes: ${IT}.lignes, total_ht_centimes: ${IT}.total_ht_centimes, total_tva_centimes: ${IT}.total_tva_centimes, total_ttc_centimes: ${IT}.total_ttc_centimes, statut: 'brouillon'`, { notes: 'Facture en brouillon dans la plateforme, chiffrée par le code avec le tarif du client. Aucune écriture dans la compta du client.' })
  lanes.facture_creer = 'Créer la facture'; fins.push('Créer la facture')
  modifier(w, 'Solder la facture', 'entreprise_factures', [['facture_ref', `${IT}.facture_ref`]], "statut: 'payee', payee_le: new Date().toISOString().slice(0, 10), relances_arretees: true", { notes: 'Un paiement lu arrête les relances : la facture passe à « payée » dans la plateforme (jamais dans la compta ni la banque du client).' })
  lanes.facture_payee = 'Solder la facture'; fins.push('Solder la facture')
  voieCourriel(w, fins, lanes, ['courriel_gmail', 'courriel_outlook'])
  ecrire(w, 'Écrire l’indicateur', 'entreprise_indicateurs', `cle_idempotence: ${IT}.cle_idempotence, indicateur: ${IT}.indicateur`, { notes: 'Les encaissements lus aujourd’hui (nombres seulement, calculés par le code) sont rangés dans la plateforme.' })
  lanes.indicateur = 'Écrire l’indicateur'; fins.push('Écrire l’indicateur')
  // L'export au comptable : un fichier, déposé chez le client, envoyé à son comptable.
  w.code('Fabriquer le CSV', K.FIN_CSV, 'Une ligne par facture réglée du mois, montants en euros calculés par le code. Format générique : la mise en forme propre à Pennylane, Tiime ou Sage est à confirmer avec le comptable.')
  nd(w, 'Convertir en fichier', 'n8n-nodes-base.convertToFile', 1.2, { operation: 'csv', binaryPropertyName: 'data', options: { fileName: `={{ 'export-' + ${IT1}.mois + '.csv' }}`, delimiter: ';', headerRow: true } }, { notes: 'Le CSV du mois, en fichier.' })
  si(w, 'Boîte Outlook ?', `={{ ${IT1}.boite === 'outlook' }}`, 'Vrai : OneDrive et Outlook. Faux : Drive et Gmail.')
  nd(w, 'Drive : déposer l’export', 'n8n-nodes-base.googleDrive', 3, { resource: 'file', operation: 'upload', inputDataFieldName: 'data', name: `={{ 'export-' + ${IT1}.mois + '.csv' }}`, driveId: rl('My Drive', 'list'), folderId: rl('DOSSIER_EXPORTS_DU_CLIENT'), options: {} }, { notes: 'Copie de l’export dans le Drive du client (écriture, derrière la porte).' })
  nd(w, 'OneDrive : déposer l’export', 'n8n-nodes-base.microsoftOneDrive', 1.1, { resource: 'file', operation: 'upload', binaryData: true, binaryPropertyName: 'data', fileName: `={{ 'export-' + ${IT1}.mois + '.csv' }}`, parentId: 'DOSSIER_EXPORTS_DU_CLIENT' }, { notes: 'Copie de l’export dans le OneDrive du client (écriture, derrière la porte).' })
  noeudDe(w, 'Envoyer l’export par Gmail', 'n8n-nodes-base.gmail', 'n8n-nodes-base.gmail#message.send', { sendTo: `={{ ${IT1}.destinataire }}`, subject: `={{ ${IT1}.objet }}`, message: MAIL('Bonjour,\n\nVoici l’export du mois (fichier joint).'), options: { appendAttribution: false, attachmentsUi: { attachmentsBinary: [{ property: 'data' }] } } }, { notes: 'pied: mention\nL’export au comptable du client, en pièce jointe. Un fichier, jamais une écriture dans sa compta.' })
  noeudDe(w, 'Envoyer l’export par Outlook', 'n8n-nodes-base.microsoftOutlook', 'n8n-nodes-base.microsoftOutlook#message.send', { toRecipients: `={{ ${IT1}.destinataire }}`, subject: `={{ ${IT1}.objet }}`, bodyContent: MAIL('Bonjour,\n\nVoici l’export du mois (fichier joint).'), additionalFields: { attachments: { attachments: [{ binaryPropertyName: 'data' }] } } }, { notes: 'pied: mention\nL’export au comptable du client, en pièce jointe. Un fichier, jamais une écriture dans sa compta.' })
  w.chaine('Fabriquer le CSV', 'Convertir en fichier', 'Boîte Outlook ?')
  w.link('Boîte Outlook ?', 'OneDrive : déposer l’export', { out: 0 }); w.link('OneDrive : déposer l’export', 'Envoyer l’export par Outlook')
  w.link('Boîte Outlook ?', 'Drive : déposer l’export', { out: 1 }); w.link('Drive : déposer l’export', 'Envoyer l’export par Gmail')
  lanes.export_comptable = 'Fabriquer le CSV'; fins.push('Envoyer l’export par Outlook', 'Envoyer l’export par Gmail')
  const e = voiesEquipe(w, fins); Object.assign(lanes, { prevenir_slack: e.sl, prevenir_teams: e.te })
  noyau(w, { lanes, fins })
  return w
}

// ═════════════════════════════════════════════ gabarit-ent-apres-vente ═══════════════════════════════════════════════════════════
function apresVente() {
  const w = new WF('gabarit-ent-apres-vente')
  lisezMoi(w, 'Après-vente et réputation', ['Avis lus sur la fiche Google et sur Trustpilot (API) ; support Zendesk (nœud) ou Chatwoot (les conversations arrivent par la plateforme, qui les range en base).', 'UN AVIS NÉGATIF OU UN CLIENT MÉCONTENT VA TOUJOURS À UN HUMAIN : le code compte les étoiles, le modèle ne peut qu’aggraver le verdict ; jamais de publication automatique, même au niveau le plus autonome de l’annexe. L’équipe est alertée.', 'Entretien et contrats : le code repère les visites à venir et propose le rendez-vous au client.'])
  const r = releve(w, 'ent-apres-vente')
  w.code('Entrée d’exemple', K.AV_EXEMPLE, 'Exemple. Un avis à 1 étoile, un avis à 5 étoiles, un ticket, un contrat : aucune lecture d’un outil du client.')
  w.link(r.porteA, 'Entrée d’exemple', { out: 0 })
  fusion(w, 'Réunir les relèves', 3)
  const src = (lecteur, s, entree, etiquette = s) => { source(w, `Source : ${etiquette}`, s); w.link(lecteur, `Source : ${etiquette}`); brancher(w, `Source : ${etiquette}`, 'Réunir les relèves', entree) }
  const sv = choix(w, 'Quelle plateforme d’avis ?', 'outil_avis', ['google', 'trustpilot'], r.porteA, 'Le client lit ses avis sur UNE plateforme : la copie garde la branche de son outil.')
  nd(w, 'Lire les avis de la fiche Google', 'n8n-nodes-base.googleBusinessProfile', 1, { resource: 'review', operation: 'getAll', returnAll: false, limit: 20, account: rl('accounts/COMPTE_GOOGLE_DU_CLIENT', 'name'), location: rl('locations/FICHE_DU_CLIENT', 'name') }, lecture('Les avis récents de la fiche Google du client (lecture seule). La copie remplace le compte et la fiche.'))
  externe(w, 'Lire les avis Trustpilot', 'GET', 'https://api.trustpilot.com/v1/private/business-units/UNITE_TRUSTPILOT/reviews', { query: [{ name: 'perPage', value: '50' }], notes: 'Trustpilot par l’API, LECTURE SEULE : les avis récents. La copie remplace UNITE_TRUSTPILOT et branche sa clé. Répondre à un avis demande une adresse propre à chaque avis, refusée par la garde (R7) : la réponse part par la plateforme (lot d’intégration).', once: true })
  w.link(sv, 'Lire les avis de la fiche Google', { out: 0 }); w.link(sv, 'Lire les avis Trustpilot', { out: 1 })
  src('Lire les avis de la fiche Google', 'google', 0); src('Lire les avis Trustpilot', 'trustpilot', 0)
  const ss = choix(w, 'Quel support ?', 'outil_support', ['zendesk', 'chatwoot'], r.porteA, 'Le client a UN support : la copie garde la branche de son outil.')
  nd(w, 'Lire les tickets Zendesk', 'n8n-nodes-base.zendesk', 1, { resource: 'ticket', operation: 'getAll', ticketType: 'regular', returnAll: false, limit: 50, options: { query: 'status<solved' } }, lecture('Les tickets ouverts de Zendesk (lecture seule).'))
  lire(w, 'Lire les conversations Chatwoot', 'entreprise_evenements_canaux', 'cle_evenement,canal,charge_utile,recu_le', [{ name: 'canal', value: 'eq.chatwoot' }, { name: 'traite', value: 'eq.false' }], { org: B.ORGR, notes: 'Chatwoot : ses événements arrivent par webhook chez la plateforme (n8n n’est pas exposé), qui les range en base ; n8n les relit ici. L’hôte d’un Chatwoot est propre à chaque installation : pas de nœud HTTP vers lui dans un gabarit.' })
  w.link(ss, 'Lire les tickets Zendesk', { out: 0 }); w.link(ss, 'Lire les conversations Chatwoot', { out: 1 })
  src('Lire les tickets Zendesk', 'zendesk', 1); src('Lire les conversations Chatwoot', 'plateforme', 1)
  lire(w, 'Lire les contrats', 'entreprise_contrats', 'contrat_ref,libelle_court,prochaine_visite,tiers_courriel', [{ name: 'actif', value: 'eq.true' }], { org: B.ORGR, notes: 'Les contrats d’entretien du client, avec la date de la prochaine visite.' })
  w.link(r.porteA, 'Lire les contrats', { out: 1 }); src('Lire les contrats', 'plateforme_contrat', 2)
  w.code('Normaliser les entrées', K.AV_NORMALISER, 'Une seule forme : avis (étoiles entières), tickets, contrats. Le texte du client est une donnée, jamais une consigne.')
  w.link('Réunir les relèves', 'Normaliser les entrées'); w.link('Entrée d’exemple', 'Normaliser les entrées')
  lire(w, 'Lire les relances faites', 'entreprise_relances', 'objet_ref,type_objet,palier,envoyee_le', [], { notes: 'Les propositions d’entretien déjà envoyées : une visite n’est proposée qu’une fois.' })
  const fin = tronc(w, { contextes: ['Lire les relances faites'], identites: false, entreeNormaliser: 'Normaliser les entrées', nomNormaliser: 'Normaliser les entrées' })
  w.code('Qualifier les retours', K.AV_QUALIFIER, 'Le CODE note chaque avis (étoiles contre le seuil du client) et repère les visites d’entretien à proposer.')
  porte(w, 'Porte simulation', "={{ $('Lire la configuration').first()?.json?.simulation !== false }}", 'Devant le modèle et devant tout effet.')
  w.code('Effets prévus', K.AV_PREVUS, 'Simulation : le plan est calculé par le même code que le réel, sur un enregistrement daté du modèle. Rien ne part.')
  w.chaine(fin, 'Qualifier les retours', 'Porte simulation'); w.link('Porte simulation', 'Effets prévus', { out: 0 })
  const tools = [outil(w, 'Avis de la fiche Google (outil)', 'n8n-nodes-base.googleBusinessProfileTool', 1, { resource: 'review', operation: 'getAll', returnAll: false, limit: 20, account: rl('accounts/COMPTE_GOOGLE_DU_CLIENT', 'name'), location: rl('locations/FICHE_DU_CLIENT', 'name') }, 'les avis de la fiche Google du client'),
    outil(w, 'Ticket Zendesk (outil)', 'n8n-nodes-base.zendeskTool', 1, { resource: 'ticket', operation: 'get', ticketType: 'regular', id: "={{ $fromAI('ticket', 'identifiant du ticket', 'string') }}" }, 'un ticket de Zendesk', ' Paramètres à confirmer à l’essai de lecture.'),
    GMAIL_OUTIL(w, 'les derniers échanges avec le client dans la boîte Gmail'), OUTLOOK_OUTIL(w, 'les derniers échanges avec le client dans la boîte Outlook')]
  filtreVrai(w, 'Retours à traiter', "={{ ['avis', 'ticket'].includes($json.genre) }}", 'Seuls les avis et les tickets passent au rédacteur : les contrats sont traités par le code.')
  agentIA(w, { nom: 'Rédacteur de réponses', prompt: '={{ JSON.stringify({ cle_idempotence: $json.cle_idempotence, canal: $json.canal, genre: $json.genre, etoiles: $json.etoiles ?? null, sujet: $json.sujet ?? null, texte_du_client: $json.corps_avis }) }}',
    systeme: `Tu lis un avis ou un message de client et tu proposes une réponse courte, humble, sans excuse excessive ni promesse de geste commercial. Tu classes aussi le sentiment (positif, neutre, negatif, tres_mecontent) et tu résumes le problème en une phrase. Ta réponse ne sera jamais publiée seule si le client est mécontent. ${B.REGLES_AGENT}`,
    schema: { type: 'object', additionalProperties: false, required: ['cle_idempotence', 'sentiment', 'reponse', 'probleme'], properties: { cle_idempotence: { type: 'string' }, sentiment: { type: 'string', enum: ['positif', 'neutre', 'negatif', 'tres_mecontent'] }, reponse: { type: 'string', maxLength: 900 }, probleme: { type: 'string', maxLength: 200 } } },
    outils: tools, note: 'Rédacteur de réponses (modèle Claude, parseur, quatre outils de lecture). Le sentiment retenu est le pire de celui du code et du sien.' })
  w.code('Revalider le rédacteur', K.AV_REVALIDER, 'Sentiment dans l’énumération ; réponse sans prix ni nom de la plateforme.')
  w.link('Porte simulation', 'Retours à traiter', { out: 1 }); w.chaine('Retours à traiter', 'Rédacteur de réponses', 'Revalider le rédacteur')
  merge2(w, 'Porte simulation', 'Revalider le rédacteur'); decider(w, K.AV_DECIDER, 'Un avis négatif ou un client mécontent est TOUJOURS une carte pour un humain (brouillon ou à valider), jamais une publication ; l’équipe est alertée. Les autres réponses suivent l’annexe d’autonomie.')
  w.link('Réunir les voies', 'Décider les effets')
  const lanes = {}, fins = []
  voiesCommunes(w, lanes, fins)
  const pied = `\n\n—\n${MENTION}{{ ${IT}.entreprise ? ' de ' + ${IT}.entreprise : '' }}.`
  nd(w, 'Fiche Google : répondre à l’avis', 'n8n-nodes-base.googleBusinessProfile', 1, { resource: 'review', operation: 'reply', review: rl(`={{ ${IT}.avis_ref }}`, 'name'), reply: `={{ ${IT}.texte }}${pied}`, account: rl('accounts/COMPTE_GOOGLE_DU_CLIENT', 'name'), location: rl('locations/FICHE_DU_CLIENT', 'name') }, { notes: 'sortie-client: oui\ntexte-modele: oui\nRéponse publique à un avis de la fiche Google, jamais pour un avis négatif sans qu’un humain l’ait approuvée. Mention de l’assistant en pied.' })
  lanes.repondre_google = 'Fiche Google : répondre à l’avis'; fins.push(lanes.repondre_google)
  ecrire(w, 'Répondre par la plateforme', 'entreprise_messages_sortants', `cle_idempotence: ${IT}.cle_idempotence, canal: ${IT}.canal, cle_conversation: ${IT}.avis_ref, texte: ${IT}.texte + ${JSON.stringify('\n\n—\n' + MENTION)} + (${IT}.entreprise ? ' de ' + ${IT}.entreprise : '') + '.'`, { notes: 'sortie-client: oui\ntexte-modele: oui\nTrustpilot et Chatwoot : la plateforme envoie la réponse (hôte propre à chaque avis ou installation). Mention de l’assistant ajoutée.' })
  lanes.reponse_plateforme = 'Répondre par la plateforme'; fins.push(lanes.reponse_plateforme)
  nd(w, 'Zendesk : répondre au ticket', 'n8n-nodes-base.zendesk', 1, { resource: 'ticket', operation: 'update', id: `={{ ${IT}.avis_ref }}`, updateFields: { publicReply: `={{ ${IT}.texte }}${pied}` } }, { notes: 'sortie-client: oui\ntexte-modele: oui\nRéponse publique au ticket Zendesk du client. Mention de l’assistant en pied.' })
  lanes.repondre_zendesk = 'Zendesk : répondre au ticket'; fins.push(lanes.repondre_zendesk)
  modifier(w, 'Marquer l’événement lu', 'entreprise_evenements_canaux', [['cle_evenement', `${IT}.ref`]], 'traite: true', { notes: 'L’événement Chatwoot de la plateforme est marqué lu, qu’il soit traité ou non : il ne revient pas à chaque relève.' })
  lanes.marquer_evenement = 'Marquer l’événement lu'; fins.push('Marquer l’événement lu')
  voieCourriel(w, fins, lanes, ['courriel_gmail', 'courriel_outlook'])
  const e = voiesEquipe(w, fins); Object.assign(lanes, { prevenir_slack: e.sl, prevenir_teams: e.te })
  noyau(w, { lanes, fins })
  return w
}

// ═════════════════════════════════════════════ gabarit-ent-direction ═════════════════════════════════════════════════════════════
function direction() {
  const w = new WF('gabarit-ent-direction')
  lisezMoi(w, 'Direction et équipe', ['Page du matin de direction, rapport du lundi, point mensuel et bilan à un mois : LE CODE COMPTE (chaque chiffre vient de la plateforme, « non lu » sinon), le modèle ne rédige qu’une phrase SANS chiffre.', 'Envoi par Slack, Teams, Google Chat ou Gmail ; le point mensuel et le bilan passent par la VALIDATION D’ÉQUIPE (Slack ou Teams, et les outils de validation humaine de n8n sur l’agent). Rapport du lundi en Docs, ligne du lundi en Sheets.', 'Compteur du coût IA et de ce qui sort vers un modèle externe ; MODE PRIVÉ : aucun texte ne part vers un modèle externe, la phrase est celle du code.'])
  const r = releve(w, 'ent-direction')
  w.code('Entrée d’exemple', K.DIR_EXEMPLE, 'Exemple. Un passage d’exemple : l’heure et le jour viennent du déclencheur.')
  w.link(r.porteA, 'Entrée d’exemple', { out: 0 })
  w.code('Préparer le passage', K.DIR_PASSAGE, 'Quel jour, quelle heure : lus sur le déclencheur (heure de Paris).')
  w.link('Entrée d’exemple', 'Préparer le passage'); w.link(r.porteA, 'Préparer le passage', { out: 1 })
  lire(w, 'Lire les chiffres du jour', 'entreprise_chiffres', 'jour,impayes_echus_centimes,devis_a_relancer,demandes_sans_reponse,rendez_vous_jour,cartes_a_valider', [{ name: 'order', value: 'jour.desc' }, { name: 'limit', value: '3' }], { notes: 'Les chiffres du jour calculés par la plateforme (en base) : le code les recopie avec leur libellé.' })
  lire(w, 'Lire les rapports', 'entreprise_rapports', 'periode,encaisse_centimes,signe_centimes,en_cours_centimes,impayes_centimes,demandes_traitees,devis_envoyes', [], { notes: 'Les rapports de période (semaine, mois, bilan) calculés par la plateforme.' })
  lire(w, 'Lire le coût IA', 'entreprise_cout_ia', 'jour,appels_modele,appels_prives,cout_centimes', [{ name: 'order', value: 'jour.desc' }, { name: 'limit', value: '40' }], { notes: 'Le coût du modèle et le nombre d’appels par jour, dont ceux qui sont partis vers un modèle externe : le compteur de la direction.' })
  const fin = tronc(w, { contextes: ['Lire les chiffres du jour', 'Lire les rapports', 'Lire le coût IA'], identites: false, entreeNormaliser: 'Préparer le passage', nomNormaliser: 'Préparer le passage' })
  w.code('Compter', K.DIR_COMPTER, 'LE CODE COMPTE : chaque chiffre vient d’une lecture, avec son libellé ; absent = « non lu », jamais zéro. Il décide aussi quels documents sont dus aujourd’hui et lesquels passent par la validation d’équipe.')
  porte(w, 'Porte simulation', "={{ $('Lire la configuration').first()?.json?.simulation !== false }}", 'Devant le modèle et devant tout effet.')
  w.code('Effets prévus', K.DIR_PREVUS, 'Simulation : le plan est calculé par le même code que le réel, sur un enregistrement daté de la phrase du modèle. Rien ne part.')
  w.chaine(fin, 'Compter', 'Porte simulation'); w.link('Porte simulation', 'Effets prévus', { out: 0 })
  filtreVrai(w, 'Documents à rédiger', '={{ $json.lignes.length > 0 }}', 'Seuls les documents qui ont des lignes passent à la rédaction.')
  si(w, 'Mode privé ?', "={{ $('Lire la configuration').first()?.json?.mode_prive === true }}", 'Vrai : mode privé, AUCUN texte ne part vers un modèle externe (la phrase est celle du code). Faux : le modèle rédige une phrase sans chiffre.')
  w.code('Rédiger sans modèle', K.DIR_SANS_MODELE, 'Mode privé : la phrase et les priorités viennent du code ; rien n’est envoyé à un modèle externe. Les modèles locaux sur Oracle sont un lot ultérieur.')
  w.link('Porte simulation', 'Documents à rédiger', { out: 1 }); w.link('Documents à rédiger', 'Mode privé ?')
  const tools = [SHEETS_OUTIL(w, 'le journal des lundis précédents dans le classeur Sheets du client'), DRIVE_OUTIL(w, 'les rapports précédents dans le Drive du client'),
    outilLecture(w, 'Demander l’accord de l’équipe (Slack)', 'slackHitl', 'n8n-nodes-base.slackHitlTool#message.sendAndWait (validation humaine)', { channelId: rl('CANAL_VALIDATION_DU_CLIENT'), message: 'Validation d’équipe demandée : {{ $tool.name }}' }, 'rien : cet outil demande l’accord d’un membre de l’équipe sur Slack avant que l’agent ne propose des priorités pour un point mensuel ou un bilan'),
    outilLecture(w, 'Demander l’accord de l’équipe (Teams)', 'microsoftTeamsHitl', 'n8n-nodes-base.microsoftTeamsHitlTool#chatMessage.sendAndWait (validation humaine)', { chatId: rl('CHAT_VALIDATION_DU_CLIENT'), message: 'Validation d’équipe demandée : {{ $tool.name }}' }, 'rien : cet outil demande l’accord d’un membre de l’équipe sur Teams avant que l’agent ne propose des priorités pour un point mensuel ou un bilan')]
  agentIA(w, { nom: 'Rédacteur de la direction', prompt: "={{ JSON.stringify({ cle_idempotence: $json.cle_idempotence, genre: $json.kind, priorites_possibles: $json.candidats.map((c, i) => i + ' = ' + c) }) }}",
    systeme: `Tu écris la phrase d’ouverture d’un document de direction (page du matin, rapport du lundi, point mensuel, bilan) : une phrase sobre, SANS AUCUN CHIFFRE, ni montant, ni date, et tu choisis jusqu’à trois NUMÉROS parmi les priorités que le code propose. Pour un point mensuel ou un bilan, demande d’abord l’accord de l’équipe avec l’outil de validation. ${B.REGLES_AGENT}`,
    schema: { type: 'object', additionalProperties: false, required: ['cle_idempotence', 'intro', 'priorites'], properties: { cle_idempotence: { type: 'string' }, intro: { type: 'string', maxLength: 240 }, priorites: { type: 'array', maxItems: 3, items: { type: 'integer', minimum: 0, maximum: 9 } } } },
    outils: tools, note: 'Rédacteur de la direction (modèle Claude, parseur, deux outils de lecture et les outils de validation humaine de n8n : Slack et Teams). Il ne rend aucun chiffre.' })
  w.code('Revalider les documents', K.DIR_REVALIDER, 'La phrase ne porte aucun chiffre ; les priorités sont des numéros de la liste du code ; les chiffres du document sont ceux du code. Un document sait s’il a été rédigé par un modèle ou par le code.')
  w.link('Mode privé ?', 'Rédiger sans modèle', { out: 0 }); w.link('Mode privé ?', 'Rédacteur de la direction', { out: 1 })
  w.link('Rédiger sans modèle', 'Revalider les documents'); w.link('Rédacteur de la direction', 'Revalider les documents')
  w.code('Décider les effets', K.DIR_DECIDER, 'Le code compte ce qui est parti vers un modèle externe et ce qui a été rédigé en mode privé. Le point mensuel et le bilan passent par la validation d’équipe. L’annexe d’autonomie décide pour le reste.')
  w.link('Revalider les documents', 'Décider les effets')
  const lanes = {}, fins = []
  voiesCommunes(w, lanes, fins)
  const pied = `\n\n—\n${MENTION}{{ ${IT}.entreprise ? ' de ' + ${IT}.entreprise : '' }}.`
  noeudDe(w, 'Diffuser par Slack', 'n8n-nodes-base.slack', 'n8n-nodes-base.slack#message.post', { channelId: rl(`={{ ${IT}.canal_equipe }}`), text: `={{ ${IT}.texte }}${pied}` }, { notes: 'pied: mention\nLe document de direction dans le canal Slack du client. Chiffres du code.' })
  noeudDe(w, 'Diffuser par Teams', 'n8n-nodes-base.microsoftTeams', 'n8n-nodes-base.microsoftTeams#chatMessage.create', { chatId: rl(`={{ ${IT}.canal_equipe }}`), message: `={{ ${IT}.texte }}${pied}` }, { notes: 'pied: mention\nLe document de direction dans le canal Teams du client. Chiffres du code.' })
  nd(w, 'Diffuser par Google Chat', 'n8n-nodes-base.googleChat', 1, { resource: 'message', operation: 'create', spaceId: `={{ ${IT}.canal_equipe }}`, jsonParameters: false, messageUi: { text: `={{ ${IT}.texte }}${pied}` } }, { notes: 'pied: mention\nLe document de direction dans l’espace Google Chat du client. Chiffres du code.' })
  noeudDe(w, 'Diffuser par Gmail', 'n8n-nodes-base.gmail', 'n8n-nodes-base.gmail#message.send', { sendTo: `={{ ${IT}.destinataire }}`, subject: `={{ ${IT}.objet }}`, message: MAIL(`={{ ${IT}.texte }}`), options: { appendAttribution: false } }, { notes: 'pied: mention\nLe document de direction par courriel, depuis la boîte du client, à la direction. Chiffres du code.' })
  Object.assign(lanes, { diffuser_slack: 'Diffuser par Slack', diffuser_teams: 'Diffuser par Teams', diffuser_googlechat: 'Diffuser par Google Chat', diffuser_gmail: 'Diffuser par Gmail' })
  fins.push('Diffuser par Slack', 'Diffuser par Teams', 'Diffuser par Google Chat', 'Diffuser par Gmail')
  voieDocs(w, fins, lanes, 'rapport_docs', 'DOSSIER_RAPPORTS_DU_CLIENT')
  nd(w, 'Sheets : ajouter la ligne du lundi', 'n8n-nodes-base.googleSheets', 4.7, { resource: 'sheet', operation: 'append', documentId: rl('CLASSEUR_SHEETS_DU_CLIENT'), sheetName: rl('Journal des lundis', 'name'), columns: { mappingMode: 'defineBelow', value: { jour: `={{ ${IT}.ligne.jour }}`, rapport: `={{ ${IT}.ligne.rapport }}`, lignes: `={{ ${IT}.ligne.lignes }}` }, matchingColumns: [], schema: [] }, options: {} }, { notes: 'Une ligne par lundi dans le journal du client, chiffres du code.' })
  lanes.journal_sheets = 'Sheets : ajouter la ligne du lundi'; fins.push(lanes.journal_sheets)
  ecrire(w, 'Écrire l’indicateur', 'entreprise_indicateurs', `cle_idempotence: ${IT}.cle_idempotence, indicateur: ${IT}.indicateur`, { notes: 'Le compteur du jour : combien de documents ont été rédigés par un modèle externe, combien en mode privé.' })
  lanes.indicateur = 'Écrire l’indicateur'; fins.push('Écrire l’indicateur')
  validations(w, lanes, fins)
  noyau(w, { lanes, fins })
  return w
}

// ═════════════════════════════════════════════ écriture ══════════════════════════════════════════════════════════════════════════
export const FABRIQUES = { 'gabarit-ent-operations': operations, 'gabarit-ent-administratif': administratif, 'gabarit-ent-finance': finance, 'gabarit-ent-apres-vente': apresVente, 'gabarit-ent-direction': direction }
if (import.meta.url === `file://${process.argv[1]}`) {
  const registre = { _lisez_moi: 'Empreintes SHA-256 (texte jsCode en UTF-8) des nœuds Code des gabarits gabarit-ent-* (R19 de scripts/n8n-specs-qa.mjs). Exemple. Gabarits inactifs, sans identifiant.' }
  for (const [nom, f] of Object.entries(FABRIQUES)) {
    const w = f()
    const wf = w.exporter()
    fs.writeFileSync(path.join(B.ICI, `${nom}.workflow.json`), JSON.stringify(wf, null, 2) + '\n')
    registre[nom] = Object.fromEntries(wf.nodes.filter((n) => n.type === 'n8n-nodes-base.code').map((n) => [n.name, createHash('sha256').update(n.parameters.jsCode, 'utf8').digest('hex')]))
    console.log(`${nom} : ${wf.nodes.length} nœuds, ${Object.keys(registre[nom]).length} nœuds Code`)
  }
  fs.writeFileSync(path.join(B.ICI, 'empreintes-code.json'), JSON.stringify(registre, null, 2) + '\n')
}
