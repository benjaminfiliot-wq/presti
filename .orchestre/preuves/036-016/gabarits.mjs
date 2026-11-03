// 036-016 — fabrique les quatre gabarits OUTILLÉS de l'Entreprise sur mesure (première moitié) et écrit leurs exports + le registre des empreintes.
//   node .orchestre/preuves/036-016/gabarits.mjs
// Inactifs, sans identifiant (R21), sans webhook (R22), porte « simulation » devant chaque effet (R15). Exemple. Données fictives.
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import * as K from './codes.mjs'
import * as B from './construire.mjs'

const { WF, lire, ecrire, modifier, externe, porte, si, aiguille, source, agentIA, outilLecture, outilWorkflow, noeudDe, crmFiche, crmProposition, releve, tronc, actions, voieCarte,
  voieDeposer, voiesMessages, voiesEquipe, fermer, lisezMoi, MENTION, IT, ORGR, HTTP, SUPA } = B

const MAIL_PIED = `\n\n—\n${MENTION}{{ ${IT}.entreprise ? ' de ' + ${IT}.entreprise : '' }}.`
const fusion = (w, nom, n) => w.add(nom, 'n8n-nodes-base.merge', 3.2, { numberInputs: n }, { notes: 'Réunit les voies avant la décision : la décision ne tourne qu’une fois par passage.' })
const brancher = (w, de, vers, entree, sortie = 0) => { w.link(de, vers, { out: sortie }); const l = w.conn[de].main[sortie]; l[l.length - 1].index = entree }

// Le noyau commun après la décision : réserver, garder, (contrôler), aiguiller, journaliser.
function noyauEffets(w, { lanes, fins, extraFins = [], controle = false }) {
  const garder = actions(w, { avantSwitch: 'Décider les effets' })
  let dernier = garder
  if (controle) {
    lire(w, 'Lire les règles d’envoi', 'entreprise_configuration', 'quota_jour,quota_relances_jour', [], { notes: 'Le plafond d’envoi du client, relu juste avant chaque lot d’envois (email-brevo.md : quota vérifié).' })
    lire(w, 'Lire les désinscrits', 'entreprise_desinscrits', 'cles_identite',
      [{ name: 'cles_identite', value: `=ov.{{ '{' + $('Garder les actions réservées').all().flatMap((i) => i.json.cles_identite ?? []).join(',') + '}' }}` }], { notes: 'La liste de désinscription du client, relue AVANT chaque envoi : un désinscrit ne reçoit jamais de séquence ni de relance.' })
    lire(w, 'Lire les envois du jour', 'entreprise_actions', 'type_action,statut,effet', [{ name: 'cree_le', value: '=gte.{{ new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" }) }}' }], { notes: 'Ce qui est déjà PARTI aujourd’hui (statut « faite » seulement : une action réservée ou en file ne compte pas), pour tenir le plafond.' })
    externe(w, 'Lire le quota du compte', 'GET', 'https://api.brevo.com/v3/account', { notes: 'Le plafond réel du compte d’envoi du client (Brevo gratuit : 300 par jour), lu avant chaque lot. La forme de la réponse (plan, sendLimit) est à vérifier à l’essai de lecture.', once: true })
    w.code('Contrôler les envois', K.CONTROLER_ENVOIS, 'Désinscrit : jamais de séquence. Plafond atteint : la suite part en file pour le lendemain, jamais perdue, jamais bloquée.')
    w.chaine(garder, 'Lire les règles d’envoi', 'Lire les désinscrits', 'Lire les envois du jour', 'Lire le quota du compte', 'Contrôler les envois')
    dernier = 'Contrôler les envois'
  }
  fermer(w, lanes, fins, extraFins)
  w.link(dernier, 'Quel effet ?')
}
// La voie « carte » et la voie « dépôt » existent partout.
function voiesCommunes(w, lanes, fins) {
  lanes.carte = voieCarte(w); fins.push(lanes.carte)
  const d = voieDeposer(w); lanes.deposer = d.entree; fins.push(...d.fin)
}

// ═════════════════════════════════════════════ gabarit-ent-accueil ═══════════════════════════════════════════════════════════════
function accueil() {
  const w = new WF('gabarit-ent-accueil')
  lisezMoi(w, 'Accueil et qualification', ['Boîtes Gmail, Outlook, IMAP ; WhatsApp, Messenger, Instagram (événements de la plateforme) ; Typeform, Jotform, Tally lus à intervalle.', 'Trieur à trois classes, puis qualificateur à grille écrite avec le client : le code calcule le score.', 'Chaque message est déposé dans la plateforme, puis la fiche du CRM du client se crée UNE fois, même si le contact écrit par deux canaux.'])
  noeudDe(w, 'Boîte Gmail du client', 'n8n-nodes-base.gmailTrigger', 'n8n-nodes-base.gmailTrigger', { simple: false }, { notes: 'Boîte du client, lue à intervalle (jamais par webhook).' })
  noeudDe(w, 'Boîte Outlook du client', 'n8n-nodes-base.microsoftOutlookTrigger', 'n8n-nodes-base.microsoftOutlookTrigger', {}, { notes: 'Boîte Outlook du client, lue à intervalle.' })
  noeudDe(w, 'Boîte IMAP du client', 'n8n-nodes-base.emailReadImap', 'n8n-nodes-base.emailReadImap', { postProcessAction: 'nothing' }, { notes: 'Boîte IMAP du client (plusieurs boîtes : une copie de ce nœud par boîte). Ne marque RIEN comme lu (postProcessAction: nothing) : en simulation, le courrier reste intact ; le suivi du dernier message évite de relire.' })
  source(w, 'Source : Gmail', 'gmail'); source(w, 'Source : Outlook', 'outlook'); source(w, 'Source : IMAP', 'imap')
  w.link('Boîte Gmail du client', 'Source : Gmail'); w.link('Boîte Outlook du client', 'Source : Outlook'); w.link('Boîte IMAP du client', 'Source : IMAP')
  const r = releve(w, 'ent-accueil')
  w.code('Entrée d’exemple', K.ACC_EXEMPLE, 'Exemple. Simulation : une entrée fictive remplace toute lecture.')
  w.link(r.porteA, 'Entrée d’exemple', { out: 0 })
  lire(w, 'Lire les événements des canaux', 'entreprise_evenements_canaux', 'cle_evenement,canal,charge_utile,recu_le', [{ name: 'traite', value: 'eq.false' }, { name: 'categorie', value: 'eq.message' }], { org: ORGR, notes: 'Catégorie « message » seulement (les leads sont ceux du gabarit leads : un événement n’est lu que par un gabarit). WhatsApp, Messenger, Instagram, SMS et page publique arrivent par webhook chez la plateforme, qui les range en base : n8n les relit ici (O2). Le nœud natif sert à répondre, jamais à recevoir.' })
  externe(w, 'Lire les réponses Typeform', 'GET', 'https://api.typeform.com/forms/FORMULAIRE_TYPEFORM/responses', { query: [{ name: 'page_size', value: '50' }, { name: 'since', value: '={{ new Date(Date.now() - 3600000).toISOString() }}' }], notes: 'Typeform lu par son API à intervalle (pas de webhook). La copie remplace FORMULAIRE_TYPEFORM par son formulaire et branche son jeton.', once: true })
  externe(w, 'Lire les réponses Jotform', 'GET', 'https://eu-api.jotform.com/form/FORMULAIRE_JOTFORM/submissions', { query: [{ name: 'limit', value: '50' }, { name: 'orderby', value: 'created_at' }], notes: 'Jotform lu par son API à intervalle. La copie remplace FORMULAIRE_JOTFORM.', once: true })
  externe(w, 'Lire les réponses Tally', 'GET', 'https://api.tally.so/forms/FORMULAIRE_TALLY/submissions', { query: [{ name: 'limit', value: '50' }], notes: 'Tally lu par son API à intervalle. La copie remplace FORMULAIRE_TALLY.', once: true })
  source(w, 'Source : plateforme', 'plateforme'); source(w, 'Source : Typeform', 'typeform'); source(w, 'Source : Jotform', 'jotform'); source(w, 'Source : Tally', 'tally')
  fusion(w, 'Réunir les relèves', 4)
  ;[['Lire les événements des canaux', 'Source : plateforme'], ['Lire les réponses Typeform', 'Source : Typeform'], ['Lire les réponses Jotform', 'Source : Jotform'], ['Lire les réponses Tally', 'Source : Tally']].forEach(([l, s], i) => {
    w.link(r.porteA, l, { out: 1 }); w.link(l, s); brancher(w, s, 'Réunir les relèves', i)
  })
  w.code('Normaliser les entrées', K.ACC_NORMALISER, 'Une seule forme pour tous les canaux : canal, référence, clés d’identité (empreintes), texte. Rien ne sort de n8n.')
  w.link('Réunir les relèves', 'Normaliser les entrées'); w.link('Entrée d’exemple', 'Normaliser les entrées')
  for (const s of ['Source : Gmail', 'Source : Outlook', 'Source : IMAP']) w.link(s, 'Normaliser les entrées')
  externe(w, 'Lire la disponibilité Calendly', 'GET', 'https://api.calendly.com/scheduled_events', { query: [{ name: 'min_start_time', value: '={{ new Date().toISOString() }}' }, { name: 'status', value: 'active' }, { name: 'count', value: '50' }], notes: 'Les créneaux déjà pris, lus pour que le qualificateur ne propose jamais un créneau inventé. Lecture seule.', once: true })
  externe(w, 'Lire les créneaux Cal.com', 'GET', 'https://api.cal.com/v2/bookings', { query: [{ name: 'status', value: 'upcoming' }], notes: 'Les réservations à venir sur Cal.com (lecture seule), pour la même raison.', once: true })
  lire(w, 'Lire la grille', 'entreprise_grille', 'critere_id,libelle_court,poids,eliminatoire', [], { notes: 'La grille écrite avec le client : critères, poids, critère éliminatoire. Le code calcule le score, jamais le modèle.' })
  const fin = tronc(w, { contextes: ['Lire la disponibilité Calendly', 'Lire les créneaux Cal.com', 'Lire la grille'], identites: true, entreeNormaliser: 'Normaliser les entrées', nomNormaliser: 'Normaliser les entrées' })
  w.code('Écarter les doublons', K.ECARTER('Normaliser les entrées'), 'Même événement déjà déposé : écarté. Même personne par un autre canal : même conversation, pas de seconde fiche.')
  porte(w, 'Porte simulation', "={{ $('Lire la configuration').first()?.json?.simulation !== false }}", 'Devant le modèle et devant tout effet.')
  w.code('Effets prévus', K.ACC_PREVUS, 'Simulation : le plan d’effets est calculé par le même code que le réel, à partir d’un enregistrement daté du modèle. Rien ne part.')
  w.chaine(fin, 'Écarter les doublons', 'Porte simulation'); w.link('Porte simulation', 'Effets prévus', { out: 0 })
  // Agents
  const fGm = outilLecture(w, 'Lire le fil Gmail', 'gmail', 'n8n-nodes-base.gmailTool', {}, 'les derniers messages de la boîte Gmail du client')
  const fOu = outilLecture(w, 'Lire le fil Outlook', 'microsoftOutlook', 'n8n-nodes-base.microsoftOutlookTool', {}, 'les derniers messages de la boîte Outlook du client')
  const tTri = outilWorkflow(w, 'Trier la demande', 'SrT4QJJmb6LLM1FK', 'Classe une demande (urgence, peut attendre, curieux, spam, client existant) avec des règles écrites, avant tout modèle.', 'lib-trier-demande : règles écrites d’abord, modèle ensuite.')
  const tPhoto = outilWorkflow(w, 'Lire la photo', 'UWjCdC5kv3CXt6jm', 'Décrit une photo jointe à la demande, sans rien conclure sur un prix.', 'lib-lire-photo : décrit la photo, ne chiffre rien.')
  agentIA(w, { nom: 'Trieur', prompt: '={{ JSON.stringify({ cle_idempotence: $json.cle_idempotence, canal: $json.canal, sujet: $json.sujet, corps: $json.corps }) }}',
    systeme: `Tu es le trieur de l’entreprise. Classe le message en trois classes : a_traiter (demande réelle d’un client ou d’un prospect), a_surveiller (information ou relance sans action immédiate), a_ecarter (publicité, spam, message automatique). ${B.REGLES_AGENT}`,
    schema: { type: 'object', additionalProperties: false, required: ['cle_idempotence', 'classe', 'motif'], properties: { cle_idempotence: { type: 'string' }, classe: { type: 'string', enum: ['a_traiter', 'a_surveiller', 'a_ecarter'] }, motif: { type: 'string', maxLength: 200 } } },
    outils: [tTri], note: 'Trieur à trois classes (modèle Claude, parseur, un outil de lecture). Appelé seulement derrière la porte.' })
  w.code('Revalider le tri', K.ACC_REV_TRI, 'La sortie du modèle repasse le schéma : classe, ordre et clé contrôlés.')
  w.link('Porte simulation', 'Trieur', { out: 1 }); w.link('Trieur', 'Revalider le tri')
  si(w, 'À qualifier ?', "={{ $json.classe === 'a_traiter' }}", 'Seuls les messages classés « à traiter » passent au qualificateur.')
  w.link('Revalider le tri', 'À qualifier ?')
  agentIA(w, { nom: 'Qualificateur', prompt: "={{ JSON.stringify({ cle_idempotence: $json.cle_idempotence, canal: $json.canal, sujet: $json.sujet, corps: $json.corps, grille: $('Lire la grille').all().map((g) => ({ critere_id: g.json.critere_id, libelle: g.json.libelle_court })).filter((g) => g.critere_id), creneaux_pris: ($('Lire la disponibilité Calendly').first()?.json?.collection ?? []).slice(0, 20).map((e) => e.start_time) }) }}",
    systeme: `Tu qualifies une demande avec la grille écrite avec l’entreprise : pour chaque critère, réponds oui, non ou inconnu et cite la preuve (une phrase courte du message). Tu ne calcules aucun score. Propose une réponse courte, sans prix ni délai précis, qui indique la prochaine étape concrète. ${B.REGLES_AGENT}`,
    schema: { type: 'object', additionalProperties: false, required: ['cle_idempotence', 'besoin', 'reponses_grille', 'reponse_proposee', 'rendez_vous_souhaite'], properties: { cle_idempotence: { type: 'string' }, besoin: { type: 'string', maxLength: 300 }, reponses_grille: { type: 'array', maxItems: 30, items: { type: 'object', additionalProperties: false, required: ['critere_id', 'valeur'], properties: { critere_id: { type: 'string' }, valeur: { type: 'string', enum: ['oui', 'non', 'inconnu'] }, preuve: { type: 'string', maxLength: 160 } } } }, reponse_proposee: { type: 'string', maxLength: 1200 }, rendez_vous_souhaite: { type: 'boolean' } } },
    outils: [fGm, fOu, tTri, tPhoto], note: 'Qualificateur à grille (modèle Claude, parseur, quatre outils de lecture). Il rapporte, le code note.' })
  w.code('Revalider la qualification', K.ACC_REV_QUAL, 'Le score est calculé ICI, par le code, sur la grille du client. Aucun prix, aucun nom de la plateforme dans le texte.')
  w.link('À qualifier ?', 'Qualificateur', { out: 0 }); w.link('Qualificateur', 'Revalider la qualification')
  fusion(w, 'Réunir les voies', 2)
  brancher(w, 'Revalider la qualification', 'Réunir les voies', 0); w.link('À qualifier ?', 'Réunir les voies', { out: 1 }); w.conn['À qualifier ?'].main[1][0].index = 1
  w.code('Décider les effets', K.ACC_DECIDER, 'L’autonomie de l’annexe décide pour chaque type d’action : préparer, carte à valider, ou part seul dans le plafond du jour.')
  w.link('Réunir les voies', 'Décider les effets')
  // Voies d'effets
  const lanes = {}, fins = []
  voiesCommunes(w, lanes, fins)
  const noter = modifier(w, 'Noter la référence du CRM', 'entreprise_conversations', [['cle_conversation', `${IT}.cle_conversation`]], "crm_ref: String($json.id ?? $json.Id ?? $json.data?.id ?? ''), statut: 'avec_fiche'", { notes: 'La référence rendue par le CRM est notée sur la conversation : la fiche existe, le prochain message du même contact n’en crée pas une autre.' })
  modifier(w, 'Marquer l’événement lu', 'entreprise_evenements_canaux', [['cle_evenement', `${IT}.ref`]], 'traite: true', { notes: 'L’événement de la plateforme est marqué lu, qu’il soit écarté ou traité : il ne revient pas à chaque relève.' })
  lanes.marquer_evenement = 'Marquer l’événement lu'; fins.push('Marquer l’événement lu')

  lanes.crm_fiche = crmFiche(w, null, noter); fins.push(noter)
  const m = voiesMessages(w, fins)
  Object.assign(lanes, { repondre_gmail: m.gm, repondre_outlook: m.ou, repondre_whatsapp: m.wa, repondre_plateforme: m.pl, brouillon_gmail: m.gb, brouillon_outlook: m.ob })
  const e = voiesEquipe(w, fins); Object.assign(lanes, { prevenir_slack: e.sl, prevenir_teams: e.te })
  noyauEffets(w, { lanes, fins })
  return w
}

// ═════════════════════════════════════════════ gabarit-ent-leads ═════════════════════════════════════════════════════════════════
function leads() {
  const w = new WF('gabarit-ent-leads')
  lisezMoi(w, 'Leads et acquisition', ['Facebook Lead Ads lu par l’API Graph à intervalle ; Cal.com ; rapports Google Ads ; LinkedIn en PUBLICATION seulement (jamais de collecte).', 'Séquences Brevo, Mailchimp, ActiveCampaign ou Lemlist sur le compte du CLIENT ; ManyChat par l’API.', 'Désinscription et quota lus avant chaque envoi ; plafond atteint = file du lendemain ; chaque lead arrive UNE fois dans le CRM et dans la plateforme.'])
  const r = releve(w, 'ent-leads')
  w.code('Entrée d’exemple', K.LEADS_EXEMPLE, 'Exemple. Lead Facebook fictif : en simulation, aucune lecture d’un outil du client.')
  w.link(r.porteA, 'Entrée d’exemple', { out: 0 })
  noeudDe(w, 'Lire les leads Facebook', 'n8n-nodes-base.facebookGraphApi', 'n8n-nodes-base.facebookGraphApi#GET leads', {}, { alwaysOutputData: true, executeOnce: true, notes: 'Facebook Lead Ads lu par l’API Graph à intervalle (pas de webhook). Lecture des leads du formulaire du client, derrière la porte. La copie remplace ID_FORMULAIRE_EXEMPLE.' })
  w.nodes.find((n) => n.name === 'Lire les leads Facebook').parameters.node = 'ID_FORMULAIRE_LEAD_ADS'
  externe(w, 'Lire les réservations Cal.com', 'GET', 'https://api.cal.com/v2/bookings', { query: [{ name: 'status', value: 'upcoming' }], notes: 'Les réservations Cal.com du client (invités compris), lues par l’API à intervalle.', once: true })
  noeudDe(w, 'Lire le rapport Google Ads', 'n8n-nodes-base.googleAds', 'n8n-nodes-base.googleAds#campaign.getAll', {}, { alwaysOutputData: true, executeOnce: true, notes: 'Rapport des campagnes du client (lecture seule) : seul des nombres sont gardés (coût, clics).' })
  lire(w, 'Lire les événements des canaux', 'entreprise_evenements_canaux', 'cle_evenement,canal,charge_utile,recu_le', [{ name: 'traite', value: 'eq.false' }, { name: 'categorie', value: 'eq.lead' }], { org: ORGR, notes: 'Catégorie « lead » seulement (les messages sont ceux du gabarit accueil). Instagram, Messenger, SMS et page publique arrivent par webhook chez la plateforme : n8n les relit ici.' })
  lire(w, 'Lire les aimants à leads', 'entreprise_contenus', 'cle_idempotence,corps_valide', [{ name: 'type', value: 'eq.aimant_a_leads' }, { name: 'publie', value: 'eq.false' }], { org: ORGR, notes: 'Les textes d’aimants à leads DÉJÀ validés par l’équipe, à publier sur LinkedIn (publication seulement, aucune lecture de profils).' })
  source(w, 'Source : Facebook', 'facebook'); source(w, 'Source : Cal.com', 'calcom'); source(w, 'Source : Google Ads', 'rapport_ads'); source(w, 'Source : plateforme', 'plateforme'); source(w, 'Source : aimant', 'aimant')
  fusion(w, 'Réunir les relèves', 5)
  ;[['Lire les leads Facebook', 'Source : Facebook'], ['Lire les réservations Cal.com', 'Source : Cal.com'], ['Lire le rapport Google Ads', 'Source : Google Ads'], ['Lire les événements des canaux', 'Source : plateforme'], ['Lire les aimants à leads', 'Source : aimant']].forEach(([l, s], i) => {
    w.link(r.porteA, l, { out: 1 }); w.link(l, s); brancher(w, s, 'Réunir les relèves', i)
  })
  w.code('Normaliser les leads', K.LEADS_NORMALISER, 'Une seule forme pour tous les canaux de leads : clés d’identité (empreintes), urgence, budget déclaré. Les rapports et les aimants passent sans identité.')
  w.link('Réunir les relèves', 'Normaliser les leads'); w.link('Entrée d’exemple', 'Normaliser les leads')
  externe(w, 'Lire la disponibilité Calendly', 'GET', 'https://api.calendly.com/scheduled_events', { query: [{ name: 'min_start_time', value: '={{ new Date().toISOString() }}' }, { name: 'status', value: 'active' }, { name: 'count', value: '50' }], notes: 'Calendly : créneaux déjà pris (lecture seule). Les invités se lisent par un chemin dynamique, refusé par la garde (R7) : à confier à un sous-workflow, lot d’intégration.', once: true })
  const fin = tronc(w, { contextes: ['Lire la disponibilité Calendly'], identites: true, entreeNormaliser: 'Normaliser les leads', nomNormaliser: 'Normaliser les leads' })
  w.code('Écarter les doublons', K.ECARTER('Normaliser les leads'), 'Même lead par deux canaux = une seule fiche : on compare les empreintes de courriel et de téléphone, dans le lot et dans la plateforme.')
  porte(w, 'Porte simulation', "={{ $('Lire la configuration').first()?.json?.simulation !== false }}", 'Devant le modèle et devant tout effet.')
  w.code('Effets prévus', K.LEADS_PREVUS, 'Simulation : le plan est calculé par le même code que le réel, sur un enregistrement daté du modèle. Rien ne part.')
  w.chaine(fin, 'Écarter les doublons', 'Porte simulation'); w.link('Porte simulation', 'Effets prévus', { out: 0 })
  const crmHub = outilLecture(w, 'Fiche CRM : HubSpot', 'hubspot', 'n8n-nodes-base.hubspotTool#contact.search', {}, 'la fiche du lead dans HubSpot')
  const crmAir = outilLecture(w, 'Fiche CRM : Airtable', 'airtable', 'n8n-nodes-base.airtableTool#record.search', {}, 'la fiche du lead dans Airtable')
  const crmNot = outilLecture(w, 'Fiche CRM : Notion', 'notion', 'n8n-nodes-base.notionTool#databasePage.getAll', {}, 'la fiche du lead dans Notion')
  const tConf = outilWorkflow(w, 'Contrôler les conflits', 'F2son8oGwifPETg3', 'Dit si le contact est déjà en cours de traitement ailleurs (conflit à éviter).', 'lib-controler-conflit : évite deux relances simultanées au même contact.')
  agentIA(w, { nom: 'Rédacteur de séquence', prompt: '={{ JSON.stringify({ cle_idempotence: $json.cle_idempotence, canal: $json.canal, libelle: $json.libelle, urgence: $json.urgence, corps: $json.corps }) }}',
    systeme: `Tu écris le premier message d’une séquence pour un lead de l’entreprise, en trois à cinq phrases, avec une seule prochaine étape. Choisis le canal conseillé : courriel (si une adresse existe), manychat (conversation Instagram ou Messenger), aucun (si le lead est déjà suivi). ${B.REGLES_AGENT}`,
    schema: { type: 'object', additionalProperties: false, required: ['cle_idempotence', 'canal_conseille', 'objet', 'texte'], properties: { cle_idempotence: { type: 'string' }, canal_conseille: { type: 'string', enum: ['courriel', 'manychat', 'aucun'] }, objet: { type: 'string', maxLength: 120 }, texte: { type: 'string', maxLength: 900 } } },
    outils: [crmHub, crmAir, crmNot, tConf], note: 'Rédacteur de séquence (modèle Claude, parseur, quatre outils de lecture ; monday n’a aucune opération de lecture que la garde admette en outil). Le score du lead est calculé par le code.' })
  w.add('Leads à rédiger', 'n8n-nodes-base.filter', 2.2, { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ id: 'ia', leftValue: '={{ ["rapport_ads", "aimant"].includes($json.canal) }}', rightValue: '', operator: { type: 'boolean', operation: 'false', singleValue: true } }], combinator: 'and' }, options: {} }, { notes: 'Les rapports et les aimants n’ont pas besoin du modèle.' })
  w.code('Revalider le rédacteur', K.LEADS_REV_REDACTEUR, 'Le score du lead est calculé ICI, par le code, sur les règles de la configuration. Texte sans prix ni nom de la plateforme.')
  w.link('Porte simulation', 'Leads à rédiger', { out: 1 }); w.chaine('Leads à rédiger', 'Rédacteur de séquence', 'Revalider le rédacteur')
  fusion(w, 'Réunir les voies', 2)
  brancher(w, 'Revalider le rédacteur', 'Réunir les voies', 0); w.link('Porte simulation', 'Réunir les voies', { out: 1 }); w.conn['Porte simulation'].main[1][w.conn['Porte simulation'].main[1].length - 1].index = 1
  w.code('Décider les effets', K.LEADS_DECIDER, 'L’autonomie de l’annexe décide pour chaque type d’action. Une séquence ou un message ManyChat ne part seul qu’au niveau 3 de l’annexe.')
  w.link('Réunir les voies', 'Décider les effets')
  const lanes = {}, fins = [], termine = []
  voiesCommunes(w, lanes, fins)
  const noter = modifier(w, 'Noter la référence du CRM', 'entreprise_conversations', [['cle_conversation', `${IT}.cle_conversation`]], "crm_ref: String($json.id ?? $json.Id ?? $json.data?.id ?? ''), statut: 'avec_fiche'", { notes: 'La référence rendue par le CRM est notée sur la conversation : la fiche existe, un second lead identique n’en crée pas une autre.' })
  modifier(w, 'Marquer l’événement lu', 'entreprise_evenements_canaux', [['cle_evenement', `${IT}.ref`]], 'traite: true', { notes: 'L’événement de la plateforme est marqué lu, qu’il soit écarté ou traité : il ne revient pas à chaque relève.' })
  lanes.marquer_evenement = 'Marquer l’événement lu'; fins.push('Marquer l’événement lu')

  lanes.crm_fiche = crmFiche(w, null, noter); fins.push(noter)
  // Séquences sur le compte du client
  noeudDe(w, 'Brevo : lire le contact', 'n8n-nodes-base.sendInBlue', 'n8n-nodes-base.sendInBlue#contact.get', { identifier: `={{ ${IT}.destinataire }}` }, { alwaysOutputData: true, onError: 'continueRegularOutput', notes: 'Brevo, compte du client : on relit le contact (liste noire, désinscription) avant tout envoi.' })
  si(w, 'Brevo : contact autorisé ?', '={{ $json.emailBlacklisted === false || /404|not.?found/i.test(String($json.error?.message ?? $json.error ?? "")) }}', 'Autorisé seulement si Brevo répond « pas en liste noire » ou « contact inconnu » (404). Toute autre erreur (clé refusée, panne) arrête l’envoi : échec fermé.')
  externe(w, 'Brevo : ajouter le contact', 'POST', 'https://api.brevo.com/v3/contacts', { corps: `={{ JSON.stringify({ email: ${IT}.destinataire, attributes: { PRENOM: ${IT}.libelle }, listIds: [Number(${IT}.liste_id)], updateEnabled: true }) }}`, notes: 'Brevo, compte du client : le contact est ajouté à SA liste (le Brevo gratuit porte sa propre marque, jamais celle de la plateforme).' })
  externe(w, 'Brevo : envoyer le premier message', 'POST', 'https://api.brevo.com/v3/smtp/email', { corps: `={{ JSON.stringify({ sender: { name: ${IT}.entreprise, email: ${IT}.expediteur }, to: [{ email: ${IT}.destinataire }], subject: ${IT}.objet, headers: { 'List-Unsubscribe': '<mailto:' + ${IT}.expediteur + '?subject=STOP>' }, textContent: ${IT}.texte + ${JSON.stringify('\n\n—\n' + MENTION)} + (${IT}.entreprise ? ' de ' + ${IT}.entreprise : '') + '.\nPour ne plus recevoir ces messages, répondez STOP.' }) }}`, notes: 'sortie-client: oui\ntexte-modele: oui\nPremier message au nom du client, depuis son compte Brevo. Mention de l’assistant en pied (le texte vient du modèle). Désinscription et quota ont été lus avant.' })
  w.chaine('Brevo : lire le contact', 'Brevo : contact autorisé ?'); w.link('Brevo : contact autorisé ?', 'Brevo : ajouter le contact', { out: 0 }); w.chaine('Brevo : ajouter le contact', 'Brevo : envoyer le premier message')
  lanes.sequence_brevo = 'Brevo : lire le contact'; fins.push('Brevo : envoyer le premier message')
  noeudDe(w, 'Mailchimp : inscrire', 'n8n-nodes-base.mailchimp', 'n8n-nodes-base.mailchimp#member.create', { list: `={{ ${IT}.liste_id }}`, email: `={{ ${IT}.destinataire }}`, status: 'pending', mergeFieldsUi: { mergeFieldsValues: [{ name: 'FNAME', value: `={{ ${IT}.libelle }}` }] } }, { notes: 'Mailchimp, compte du client : inscription en double adhésion ; la séquence est l’automatisation Mailchimp du client.' })
  lanes.sequence_mailchimp = 'Mailchimp : inscrire'; fins.push('Mailchimp : inscrire')
  noeudDe(w, 'ActiveCampaign : contact', 'n8n-nodes-base.activeCampaign', 'n8n-nodes-base.activeCampaign#contact.create', { email: `={{ ${IT}.destinataire }}`, additionalFields: { firstName: `={{ ${IT}.libelle }}` } }, { notes: 'ActiveCampaign, compte du client : contact créé ou mis à jour.' })
  noeudDe(w, 'ActiveCampaign : liste', 'n8n-nodes-base.activeCampaign', 'n8n-nodes-base.activeCampaign#contactList.add', { listId: `={{ Number(${IT}.liste_id) }}`, contactId: '={{ $json.id }}' }, { notes: 'ActiveCampaign : ajout à la liste de la séquence du client.' })
  w.chaine('ActiveCampaign : contact', 'ActiveCampaign : liste'); lanes.sequence_activecampaign = 'ActiveCampaign : contact'; fins.push('ActiveCampaign : liste')
  noeudDe(w, 'Lemlist : ajouter le lead', 'n8n-nodes-base.lemlist', 'n8n-nodes-base.lemlist#lead.create', { campaignId: `={{ ${IT}.liste_id }}`, email: `={{ ${IT}.destinataire }}`, additionalFields: { firstName: `={{ ${IT}.libelle }}`, deduplicate: true } }, { notes: 'Lemlist, compte du client : lead ajouté à sa campagne, sans doublon.' })
  lanes.sequence_lemlist = 'Lemlist : ajouter le lead'; fins.push('Lemlist : ajouter le lead')
  externe(w, 'ManyChat : retrouver l’abonné', 'GET', 'https://api.manychat.com/fb/subscriber/findByEmail', { query: [{ name: 'email', value: `={{ ${IT}.destinataire }}` }], notes: 'ManyChat par l’API : on retrouve l’abonné du client par son courriel (lecture).' })
  externe(w, 'ManyChat : lancer le flux', 'POST', 'https://api.manychat.com/fb/sending/sendFlow', { corps: `={{ JSON.stringify({ subscriber_id: $json.data?.id, flow_ns: ${IT}.flux }) }}`, notes: 'sortie-client: oui\nLe flux ManyChat du client est lancé pour cet abonné : le contenu du flux est écrit par le client dans son compte.' })
  w.chaine('ManyChat : retrouver l’abonné', 'ManyChat : lancer le flux'); lanes.manychat = 'ManyChat : retrouver l’abonné'; fins.push('ManyChat : lancer le flux')
  noeudDe(w, 'LinkedIn : publier', 'n8n-nodes-base.linkedIn', 'n8n-nodes-base.linkedIn#post.create (personne)', { text: `={{ ${IT}.texte }}` }, { notes: 'LinkedIn : PUBLICATION seulement, sur le compte du client. Aucune lecture de profils, aucune collecte (conditions de LinkedIn).' })
  lanes.publier_linkedin = 'LinkedIn : publier'; fins.push('LinkedIn : publier')
  ecrire(w, 'Écrire l’indicateur', 'entreprise_indicateurs', `cle_idempotence: ${IT}.cle_idempotence, indicateur: ${IT}.indicateur`, { notes: 'Le rapport publicitaire du jour (nombres seulement) est rangé dans la plateforme.' })
  lanes.indicateur = 'Écrire l’indicateur'; fins.push('Écrire l’indicateur')
  const m = voiesEquipe(w, fins); Object.assign(lanes, { prevenir_slack: m.sl, prevenir_teams: m.te })
  // Exclu et file du lendemain : terminent chacune par leur propre mise à jour (pas de « faite » par-dessus)
  modifier(w, 'Marquer l’exclusion', 'entreprise_actions', [['cle_idempotence', `${IT}.cle_idempotence`]], "statut: 'exclu', motif: 'desinscrit'", { notes: 'Un désinscrit est exclu et journalisé : aucune séquence, aucune relance.' })
  ecrire(w, 'Mettre en file pour demain', 'entreprise_cartes', `gabarit: 'ent-leads', cle_idempotence: ${IT}.cle_idempotence + ':carte', statut: 'file_demain', pour_le: new Date(Date.now() + 86400000).toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" }), type_action: ${IT}.type_action, pour_effet: ${IT}.pour_effet, charge: ${IT}.charge_demain`, { notes: 'Plafond atteint : la suite part en file pour le lendemain, jamais perdue ni bloquée.' })
  modifier(w, 'Marquer la mise en file', 'entreprise_actions', [['cle_idempotence', `${IT}.cle_idempotence`]], "statut: 'en_file'", { notes: 'L’action est journalisée « en file » ; la relève des cartes la reprend à l’échéance.' })
  w.chaine('Mettre en file pour demain', 'Marquer la mise en file')
  lanes.exclu = 'Marquer l’exclusion'; lanes.file_demain = 'Mettre en file pour demain'
  noyauEffets(w, { lanes, fins, controle: true })
  return w
}

// ═════════════════════════════════════════════ gabarit-ent-ventes ════════════════════════════════════════════════════════════════
function ventes() {
  const w = new WF('gabarit-ent-ventes')
  lisezMoi(w, 'Ventes et CRM', ['CRM au choix (HubSpot, Pipedrive, Salesforce, Zoho CRM, Odoo, Airtable, Notion, monday) derrière un Switch « CRM du client » ; la copie garde le sien.', 'Rédacteur de propositions (fiches du CRM, tarif du client) : les MONTANTS viennent du code, jamais du modèle. Un prix estimé ne part jamais seul.', 'Signature Yousign ou DocuSign par l’API ; relanceur et noteur d’intérêt.'])
  const r = releve(w, 'ent-ventes')
  w.code('Entrée d’exemple', K.VENTES_EXEMPLE, 'Exemple. Deux opportunités fictives : en simulation, aucune lecture du CRM du client.')
  w.link(r.porteA, 'Entrée d’exemple', { out: 0 })
  const lectures = {
    hubspot: noeudDe(w, 'Lire les affaires HubSpot', 'n8n-nodes-base.hubspot', 'n8n-nodes-base.hubspot#contact.search', { resource: 'deal', operation: 'getAll', returnAll: false, limit: 50 }, {}),
    pipedrive: noeudDe(w, 'Lire les affaires Pipedrive', 'n8n-nodes-base.pipedrive', 'n8n-nodes-base.pipedrive#person.search', { resource: 'deal', operation: 'getAll', returnAll: false, limit: 50 }, {}),
    salesforce: noeudDe(w, 'Lire les opportunités Salesforce', 'n8n-nodes-base.salesforce', 'n8n-nodes-base.salesforce#opportunity.getAll', {}, {}),
    zoho: noeudDe(w, 'Lire les affaires Zoho CRM', 'n8n-nodes-base.zohoCrm', 'n8n-nodes-base.zohoCrm#contact.getAll', { resource: 'deal', operation: 'getAll', returnAll: false, limit: 50 }, {}),
    odoo: noeudDe(w, 'Lire les opportunités Odoo', 'n8n-nodes-base.odoo', 'n8n-nodes-base.odoo#opportunity.getAll', {}, {}),
    airtable: noeudDe(w, 'Lire les affaires Airtable', 'n8n-nodes-base.airtable', 'n8n-nodes-base.airtable#record.search', {}, {}),
    notion: noeudDe(w, 'Lire les affaires Notion', 'n8n-nodes-base.notion', 'n8n-nodes-base.notion#databasePage.getAll', {}, {}),
    monday: noeudDe(w, 'Lire les affaires monday', 'n8n-nodes-base.mondayCom', 'n8n-nodes-base.mondayCom#item.getItems', {}, {}),
  }
  // Lecture des AFFAIRES : les trois squelettes empruntés à une autre opération sont réécrits sans reste de l'ancienne.
  w.nodes.find((n) => n.name === 'Lire les affaires HubSpot').parameters = { resource: 'deal', operation: 'getAll', authentication: 'oAuth2', returnAll: false, limit: 50 }
  w.nodes.find((n) => n.name === 'Lire les affaires Pipedrive').parameters = { resource: 'deal', operation: 'getAll', authentication: 'apiToken', returnAll: false, limit: 50 }
  w.nodes.find((n) => n.name === 'Lire les affaires Zoho CRM').parameters = { resource: 'deal', operation: 'getAll', returnAll: false, limit: 50 }
  for (const n of w.nodes) if (Object.values(lectures).includes(n.name)) { n.alwaysOutputData = true; n.executeOnce = true; n.notes = 'Lecture des affaires dans le CRM du client (lecture seule). Les champs propres à chaque CRM sont nommés dans la configuration de la copie (mapping_crm). Paramètres à confirmer à l’essai de lecture.' }
  const aig = aiguille(w, 'Quel CRM lire ?', "={{ $('Lire la configuration (relève)').first()?.json?.crm_choisi }}", Object.keys(lectures), 'Le CRM du client : la copie garde la branche de son CRM et débranche les autres.')
  w.link(r.porteA, aig, { out: 1 })
  Object.keys(lectures).forEach((c, i) => { w.link(aig, lectures[c], { out: i }); source(w, `Source : ${c}`, c); w.link(lectures[c], `Source : ${c}`) })
  w.code('Normaliser les opportunités', K.VENTES_NORMALISER, 'Une seule forme pour tous les CRM : référence, étape, contact (empreintes), jours sans réponse. Le nom des champs de chaque CRM vient de la configuration.')
  w.link('Entrée d’exemple', 'Normaliser les opportunités')
  Object.keys(lectures).forEach((c) => w.link(`Source : ${c}`, 'Normaliser les opportunités'))
  lire(w, 'Lire les tarifs', 'entreprise_tarifs', 'ref_tarif,libelle_court,prix_ht_centimes,tva_pct', [], { notes: 'Le tarif du client : un prix vient de ses données, sinon il est « estimé » et la proposition passe par une carte.' })
  lire(w, 'Lire les propositions gagnées', 'entreprise_propositions', 'ref_tarif,quantite,libelle_court', [{ name: 'statut', value: 'eq.gagnee' }, { name: 'limit', value: '20' }], { notes: 'Les propositions déjà gagnées, comme exemples de forme pour le rédacteur (lecture seule).' })
  lire(w, 'Lire les clés déjà réservées', 'entreprise_actions', 'cle_idempotence', [{ name: 'cle_idempotence', value: 'like.opp:*' }, { name: 'order', value: 'cree_le.desc' }, { name: 'limit', value: '1000' }], { notes: 'Les propositions et relances qui ont déjà une action réservée : elles ne repartent pas au modèle (pas d’appel inutile, pas de doublon).' })
  const fin = tronc(w, { contextes: ['Lire les tarifs', 'Lire les propositions gagnées', 'Lire les clés déjà réservées'], identites: false, entreeNormaliser: 'Normaliser les opportunités', nomNormaliser: 'Normaliser les opportunités' })
  w.code('Router les opportunités', K.VENTES_ROUTER, 'Marque ce qui est à proposer et ce qui est à relancer (jours sans réponse lus en configuration).')
  porte(w, 'Porte simulation', "={{ $('Lire la configuration').first()?.json?.simulation !== false }}", 'Devant le modèle et devant tout effet.')
  w.code('Effets prévus', K.VENTES_PREVUS, 'Simulation : le plan est calculé par le même code que le réel (montants compris), sur un enregistrement daté du modèle. Rien ne part.')
  w.chaine(fin, 'Router les opportunités', 'Porte simulation'); w.link('Porte simulation', 'Effets prévus', { out: 0 })
  // Outils de lecture des 8 CRM
  const outilsCrm = [
    outilLecture(w, 'Fiche CRM : HubSpot', 'hubspot', 'n8n-nodes-base.hubspotTool#contact.search', {}, 'la fiche du contact dans HubSpot'),
    outilLecture(w, 'Fiche CRM : Pipedrive', 'pipedrive', 'n8n-nodes-base.pipedrive#person.search', {}, 'la fiche du contact dans Pipedrive'),
    outilLecture(w, 'Fiche CRM : Salesforce', 'salesforce', 'n8n-nodes-base.salesforce#opportunity.getAll', {}, 'les opportunités du contact dans Salesforce'),
    outilLecture(w, 'Fiche CRM : Zoho CRM', 'zohoCrm', 'n8n-nodes-base.zohoCrm#contact.getAll', {}, 'la fiche du contact dans Zoho CRM'),
    outilLecture(w, 'Fiche CRM : Odoo', 'odoo', 'n8n-nodes-base.odoo#opportunity.getAll', {}, 'les opportunités du contact dans Odoo'),
    outilLecture(w, 'Fiche CRM : Airtable', 'airtable', 'n8n-nodes-base.airtableTool#record.search', {}, 'la fiche du contact dans Airtable'),
    outilLecture(w, 'Fiche CRM : Notion', 'notion', 'n8n-nodes-base.notionTool#databasePage.getAll', {}, 'la fiche du contact dans Notion'),
  ]
  const tConf = outilWorkflow(w, 'Contrôler les conflits', 'F2son8oGwifPETg3', 'Dit si le contact est déjà en cours de traitement ailleurs (conflit à éviter).', 'lib-controler-conflit : évite deux relances simultanées au même contact.')
  const fGm = outilLecture(w, 'Lire le fil Gmail', 'gmail', 'n8n-nodes-base.gmailTool', {}, 'les derniers échanges avec le contact dans la boîte Gmail')
  const fOu = outilLecture(w, 'Lire le fil Outlook', 'microsoftOutlook', 'n8n-nodes-base.microsoftOutlookTool', {}, 'les derniers échanges avec le contact dans la boîte Outlook')
  w.add('Entrées à proposer', 'n8n-nodes-base.filter', 2.2, { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ id: 'p', leftValue: '={{ $json.a_proposer }}', rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, options: {} }, { notes: 'Seules les opportunités « proposition à faire » passent au rédacteur.' })
  w.add('Entrées à relancer', 'n8n-nodes-base.filter', 2.2, { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ id: 'r', leftValue: '={{ $json.a_relancer }}', rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, options: {} }, { notes: 'Seules les propositions sans réponse depuis N jours passent au relanceur.' })
  agentIA(w, { nom: 'Rédacteur de propositions', prompt: "={{ JSON.stringify({ cle_idempotence: $json.cle_idempotence, besoin: $json.besoin, tarif: $('Lire les tarifs').all().map((t) => ({ ref_tarif: t.json.ref_tarif, libelle: t.json.libelle_court })).filter((t) => t.ref_tarif), gagnees: $('Lire les propositions gagnées').all().map((g) => g.json).filter((g) => g.ref_tarif).slice(0, 10) }) }}",
    systeme: `Tu prépares la proposition commerciale à partir du besoin du client et des propositions déjà gagnées. Tu choisis des références du tarif (ref_tarif) et des quantités entières ; tu n’écris AUCUN montant, AUCUN prix, AUCUNE remise : le code les calcule avec le tarif du client. Si aucune référence ne convient, utilise la référence « a_confirmer ». ${B.REGLES_AGENT}`,
    schema: { type: 'object', additionalProperties: false, required: ['cle_idempotence', 'introduction', 'lignes'], properties: { cle_idempotence: { type: 'string' }, introduction: { type: 'string', maxLength: 900 }, lignes: { type: 'array', minItems: 1, maxItems: 40, items: { type: 'object', additionalProperties: false, required: ['ref_tarif', 'quantite'], properties: { ref_tarif: { type: 'string', maxLength: 40 }, quantite: { type: 'integer', minimum: 1, maximum: 100000 }, designation: { type: 'string', maxLength: 160 } } } } } },
    outils: [...outilsCrm, tConf], note: 'Rédacteur de propositions (modèle Claude, parseur, huit outils de lecture : sept CRM et le contrôle de conflit ; monday est lu par son nœud, pas en outil). Le schéma n’a aucun champ de montant.' })
  w.code('Calculer les montants', K.VENTES_MONTANTS, 'LES MONTANTS SONT CALCULÉS ICI, en centimes entiers, avec le tarif du client. Une référence inconnue rend la proposition « estimée » : elle ne part jamais sans l’humain.')
  w.link('Porte simulation', 'Entrées à proposer', { out: 1 }); w.chaine('Entrées à proposer', 'Rédacteur de propositions', 'Calculer les montants')
  agentIA(w, { nom: 'Relanceur', prompt: '={{ JSON.stringify({ cle_idempotence: $json.cle_idempotence, besoin: $json.besoin, jours_sans_reponse: $json.jours_sans_reponse }) }}',
    systeme: `Tu relances une proposition restée sans réponse : deux à quatre phrases, polies, une seule question. Tu notes aussi l’intérêt du client : froid, tiede ou chaud, avec le motif en une phrase. Aucun prix, aucun délai nouveau. ${B.REGLES_AGENT}`,
    schema: { type: 'object', additionalProperties: false, required: ['cle_idempotence', 'interet', 'motif_interet', 'objet', 'texte'], properties: { cle_idempotence: { type: 'string' }, interet: { type: 'string', enum: ['froid', 'tiede', 'chaud'] }, motif_interet: { type: 'string', maxLength: 200 }, objet: { type: 'string', maxLength: 120 }, texte: { type: 'string', maxLength: 900 } } },
    outils: [fGm, fOu, tConf], note: 'Relanceur et noteur d’intérêt (modèle Claude, parseur, trois outils de lecture).' })
  w.code('Revalider le relanceur', K.VENTES_REV_RELANCEUR, 'Note d’intérêt dans l’énumération, texte sans prix ni nom de la plateforme.')
  w.link('Porte simulation', 'Entrées à relancer', { out: 1 }); w.chaine('Entrées à relancer', 'Relanceur', 'Revalider le relanceur')
  fusion(w, 'Réunir les voies', 3)
  brancher(w, 'Calculer les montants', 'Réunir les voies', 0); brancher(w, 'Revalider le relanceur', 'Réunir les voies', 1); w.link('Porte simulation', 'Réunir les voies', { out: 1 }); w.conn['Porte simulation'].main[1][w.conn['Porte simulation'].main[1].length - 1].index = 2
  w.code('Décider les effets', K.VENTES_DECIDER, 'Une proposition dont un tarif manque devient une carte, même au niveau 3 de l’annexe. La relance et la signature suivent l’annexe.')
  w.link('Réunir les voies', 'Décider les effets')
  const lanes = {}, fins = [], termine = []
  lanes.carte = voieCarte(w); fins.push(lanes.carte)
  const crmSw = crmProposition(w, null, null)
  lanes.crm_proposition = crmSw
  const finCrm = w.add('Proposition notée', 'n8n-nodes-base.noOp', 1, {}, { notes: 'Fin de la voie CRM.' })
  for (const c of Object.keys(lectures)) { const nom = { hubspot: 'HubSpot', pipedrive: 'Pipedrive', salesforce: 'Salesforce', zoho: 'Zoho CRM', odoo: 'Odoo', airtable: 'Airtable', notion: 'Notion', monday: 'monday' }[c]; w.link(`${nom} : proposition`, finCrm) }
  fins.push(finCrm)
  externe(w, 'Yousign : préparer la demande', 'POST', 'https://api.yousign.app/v3/signature_requests', { corps: `={{ JSON.stringify({ name: 'Proposition ' + ${IT}.libelle, delivery_mode: 'none', timezone: 'Europe/Paris', external_id: ${IT}.cle_idempotence }) }}`, notes: 'sortie-client: oui\nYousign par l’API : la demande de signature est créée en brouillon (aucun envoi au signataire). L’activation exige l’identifiant rendu, dans l’adresse : à faire par un sous-workflow du lot d’intégration (la garde refuse une adresse calculée, R7).' })
  lanes.signature_yousign = 'Yousign : préparer la demande'; fins.push('Yousign : préparer la demande')
  externe(w, 'DocuSign : préparer l’enveloppe', 'POST', 'https://eu.docusign.net/restapi/v2.1/accounts/COMPTE_DOCUSIGN/envelopes', { corps: `={{ JSON.stringify({ emailSubject: 'Proposition ' + ${IT}.libelle, status: 'created', recipients: { signers: [{ email: ${IT}.destinataire, name: ${IT}.libelle, recipientId: '1', routingOrder: '1' }] } }) }}`, notes: 'sortie-client: oui\nDocuSign par l’API : l’enveloppe est créée en brouillon (status created), sans envoi. Le PDF de la proposition y est joint par l’étape documentaire (lot Devis) ; la copie remplace COMPTE_DOCUSIGN.' })
  lanes.signature_docusign = 'DocuSign : préparer l’enveloppe'; fins.push('DocuSign : préparer l’enveloppe')
  const m = voiesMessages(w, fins)
  Object.assign(lanes, { relance_gmail: m.gm, relance_outlook: m.ou })
  fins.splice(fins.indexOf(m.wa), 1); fins.splice(fins.indexOf(m.pl), 1); fins.splice(fins.indexOf(m.gb), 1); fins.splice(fins.indexOf(m.ob), 1)
  for (const x of [m.wa, m.pl, m.gb, m.ob]) { w.nodes.splice(w.nodes.findIndex((n) => n.name === x), 1); w.noms.delete(x) }
  ecrire(w, 'Écrire la note d’intérêt', 'entreprise_notes_interet', `cle_idempotence: ${IT}.cle_idempotence, ref_opportunite: ${IT}.ref_opportunite, interet: ${IT}.interet, motif_interet: ${IT}.motif_interet`, { notes: 'L’intérêt noté par le relanceur est rangé dans la plateforme (jamais dans le CRM à la place du client).' })
  lanes.note_plateforme = 'Écrire la note d’intérêt'; fins.push('Écrire la note d’intérêt')
  const e = voiesEquipe(w, fins); Object.assign(lanes, { prevenir_slack: e.sl, prevenir_teams: e.te })
  modifier(w, 'Marquer l’exclusion', 'entreprise_actions', [['cle_idempotence', `${IT}.cle_idempotence`]], "statut: 'exclu', motif: 'desinscrit'", { notes: 'Un désinscrit est exclu et journalisé : aucune relance.' })
  ecrire(w, 'Mettre en file pour demain', 'entreprise_cartes', `gabarit: 'ent-ventes', cle_idempotence: ${IT}.cle_idempotence + ':carte', statut: 'file_demain', pour_le: new Date(Date.now() + 86400000).toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" }), type_action: ${IT}.type_action, pour_effet: ${IT}.pour_effet, charge: ${IT}.charge_demain`, { notes: 'Plafond atteint : la relance part en file pour le lendemain, jamais perdue ni bloquée.' })
  modifier(w, 'Marquer la mise en file', 'entreprise_actions', [['cle_idempotence', `${IT}.cle_idempotence`]], "statut: 'en_file'", { notes: 'L’action est journalisée « en file ».' })
  w.chaine('Mettre en file pour demain', 'Marquer la mise en file')
  lanes.exclu = 'Marquer l’exclusion'; lanes.file_demain = 'Mettre en file pour demain'
  noyauEffets(w, { lanes, fins, controle: true })
  return w
}

// ═════════════════════════════════════════════ gabarit-ent-marketing ═════════════════════════════════════════════════════════════
function marketing() {
  const w = new WF('gabarit-ent-marketing')
  lisezMoi(w, 'Marketing et réseaux', ['Instagram et Facebook (API Graph), LinkedIn, TikTok (API), YouTube, X ; rapports Google Ads.', 'TOUT ce qui se publie passe par la validation d’équipe (Slack ou Teams, ou la carte « À valider ») tant que les 2-3 premiers contenus de CHAQUE format ne sont pas validés par un humain, et dès que la QA voit une anomalie.', 'Les réponses aux commentaires et messages restent à valider (aucune réponse automatique sans consentement).'])
  const r = releve(w, 'ent-marketing')
  w.code('Entrée d’exemple', K.MKT_EXEMPLE, 'Exemple. Brief fictif : en simulation, aucune lecture d’un réseau du client.')
  w.link(r.porteA, 'Entrée d’exemple', { out: 0 })
  lire(w, 'Lire les contenus à produire', 'entreprise_contenus', 'cle_idempotence,ref,format,reseaux,sujet,image_url,video_id', [{ name: 'statut', value: 'eq.a_rediger' }], { org: ORGR, notes: 'Les briefs de contenu posés par l’équipe (ou par le planning éditorial) : un par sujet et par format.' })
  noeudDe(w, 'Lire les commentaires Facebook', 'n8n-nodes-base.facebookGraphApi', 'n8n-nodes-base.facebookGraphApi#GET leads', {}, { alwaysOutputData: true, executeOnce: true, notes: 'Facebook par l’API Graph : les publications récentes de la page du client et leurs commentaires (lecture, derrière la porte).' })
  Object.assign(w.nodes.find((n) => n.name === 'Lire les commentaires Facebook').parameters, { node: 'PAGE_DU_CLIENT', edge: 'feed', options: { fields: { field: [{ name: 'id' }, { name: 'comments{id,message}' }] } } })
  externe(w, 'Lire les commentaires Instagram', 'GET', 'https://graph.facebook.com/v21.0/COMPTE_INSTAGRAM_DU_CLIENT/media', { query: [{ name: 'fields', value: 'id,comments{id,text}' }, { name: 'limit', value: '10' }], notes: 'Instagram par l’API Graph : les médias récents du compte du client et leurs commentaires (lecture). La copie remplace COMPTE_INSTAGRAM_DU_CLIENT.', once: true })
  noeudDe(w, 'Lire la chaîne YouTube', 'n8n-nodes-base.youTube', 'n8n-nodes-base.youTube#video.getAll', {}, { alwaysOutputData: true, executeOnce: true, notes: 'YouTube : les vidéos récentes de la chaîne du client (lecture). Le nœud ne lit pas les commentaires.' })
  noeudDe(w, 'Lire les mentions sur X', 'n8n-nodes-base.twitter', 'n8n-nodes-base.twitter#tweet.search', {}, { alwaysOutputData: true, executeOnce: true, notes: 'X : recherche des mentions du compte du client (lecture, nombres gardés seulement).' })
  noeudDe(w, 'Lire le rapport Google Ads', 'n8n-nodes-base.googleAds', 'n8n-nodes-base.googleAds#campaign.getAll', {}, { alwaysOutputData: true, executeOnce: true, notes: 'Rapport des campagnes (lecture seule) : coût et clics.' })
  externe(w, 'Lire le compte TikTok', 'GET', 'https://open.tiktokapis.com/v2/user/info/', { query: [{ name: 'fields', value: 'follower_count' }], notes: 'TikTok par l’API : nombre d’abonnés du compte du client (lecture).', once: true })
  const sources = [['Lire les contenus à produire', 'brief'], ['Lire les commentaires Facebook', 'facebook'], ['Lire les commentaires Instagram', 'instagram'], ['Lire la chaîne YouTube', 'youtube'], ['Lire les mentions sur X', 'x'], ['Lire le rapport Google Ads', 'googleads'], ['Lire le compte TikTok', 'tiktok']]
  fusion(w, 'Réunir les relèves', sources.length)
  sources.forEach(([l, s], i) => { source(w, `Source : ${s}`, s); w.link(r.porteA, l, { out: 1 }); w.link(l, `Source : ${s}`); brancher(w, `Source : ${s}`, 'Réunir les relèves', i) })
  w.code('Normaliser les entrées', K.MKT_NORMALISER, 'Briefs, commentaires et rapports en une seule forme. Les rapports ne gardent que des nombres : aucun profil, aucun nom.')
  w.link('Réunir les relèves', 'Normaliser les entrées'); w.link('Entrée d’exemple', 'Normaliser les entrées')
  lire(w, 'Lire les formats validés', 'entreprise_formats', 'format,validations_positives,ecart_qa', [], { notes: 'Combien de contenus de chaque format ont déjà été validés par un humain (2-3 puis automatique, autonomie-abonnements.md), et si la QA a vu une anomalie.' })
  lire(w, 'Lire la charte', 'entreprise_charte', 'regle_id,consigne', [], { notes: 'La charte éditoriale écrite avec le client : ton, mots à éviter, mentions obligatoires.' })
  lire(w, 'Lire les clés déjà réservées', 'entreprise_actions', 'cle_idempotence', [{ name: 'or', value: '=(cle_idempotence.like.brief:*,cle_idempotence.like.commentaire:*)' }, { name: 'order', value: 'cree_le.desc' }, { name: 'limit', value: '1000' }], { notes: 'Les briefs et les commentaires qui ont déjà une action réservée : ils ne repartent pas au modèle à chaque relève.' })
  const fin = tronc(w, { contextes: ['Lire les formats validés', 'Lire la charte', 'Lire les clés déjà réservées'], identites: false, entreeNormaliser: 'Normaliser les entrées', nomNormaliser: 'Normaliser les entrées' })
  w.code('Écarter ce qui est déjà traité', K.MKT_ECARTER, 'Redonne les entrées normalisées, sans celles qui ont déjà une action réservée (un commentaire ou un brief ne coûte pas un appel au modèle à chaque relève).')
  porte(w, 'Porte simulation', "={{ $('Lire la configuration').first()?.json?.simulation !== false }}", 'Devant le modèle et devant toute publication.')
  w.code('Effets prévus', K.MKT_PREVUS, 'Simulation : le plan (publications, cartes, validations d’équipe) est calculé par le même code que le réel, sur un enregistrement daté du modèle. Rien ne se publie.')
  w.chaine(fin, 'Écarter ce qui est déjà traité', 'Porte simulation'); w.link('Porte simulation', 'Effets prévus', { out: 0 })
  const idees = outilLecture(w, 'Idées et calendrier (Notion)', 'notion', 'n8n-nodes-base.notionTool#databasePage.getAll', {}, 'le calendrier éditorial et les idées de contenu dans Notion')
  const passes = outilLecture(w, 'Contenus passés (Airtable)', 'airtable', 'n8n-nodes-base.airtableTool#record.search', {}, 'les contenus déjà publiés, pour ne pas se répéter')
  w.add('Entrées à rédiger', 'n8n-nodes-base.filter', 2.2, { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ id: 'g', leftValue: '={{ $json.genre }}', rightValue: 'rapport', operator: { type: 'string', operation: 'notEquals' } }], combinator: 'and' }, options: {} }, { notes: 'Les rapports n’ont pas besoin du modèle.' })
  agentIA(w, { nom: 'Rédacteur de contenu', prompt: "={{ JSON.stringify({ cle_idempotence: $json.cle_idempotence, genre: $json.genre, format: $json.format, reseaux: $json.reseaux, sujet: $json.sujet, reseau: $json.reseau, commentaire: $json.texte_recu, charte: $('Lire la charte').all().map((c) => c.json.consigne).filter(Boolean).slice(0, 20) }) }}",
    systeme: `Tu rédiges, pour chaque réseau demandé, le texte de la publication (Instagram 2200 caractères au plus, Facebook, LinkedIn, TikTok, YouTube, X 280), ou la réponse à un commentaire. Tu respectes la charte. Aucun lien, au plus dix hashtags. ${B.REGLES_AGENT}`,
    schema: { type: 'object', additionalProperties: false, required: ['cle_idempotence'], properties: { cle_idempotence: { type: 'string' }, textes: { type: 'object', additionalProperties: false, properties: { instagram: { type: 'string', maxLength: 2200 }, facebook: { type: 'string', maxLength: 5000 }, linkedin: { type: 'string', maxLength: 3000 }, tiktok: { type: 'string', maxLength: 2200 }, youtube: { type: 'string', maxLength: 5000 }, x: { type: 'string', maxLength: 280 } } }, reponse: { type: 'string', maxLength: 2200 } } },
    outils: [idees, passes], note: 'Rédacteur de contenu (modèle Claude, parseur, deux outils de lecture). Il écrit, il ne publie rien.' })
  w.code('Revalider le rédacteur', K.MKT_REV_REDACTEUR, 'Contrôle qualité avant tout : longueur par réseau, nom de la plateforme, prix, lien, hashtags. Une anomalie impose la validation d’équipe.')
  w.link('Porte simulation', 'Entrées à rédiger', { out: 1 }); w.chaine('Entrées à rédiger', 'Rédacteur de contenu', 'Revalider le rédacteur')
  fusion(w, 'Réunir les voies', 2)
  brancher(w, 'Revalider le rédacteur', 'Réunir les voies', 0); w.link('Porte simulation', 'Réunir les voies', { out: 1 }); w.conn['Porte simulation'].main[1][w.conn['Porte simulation'].main[1].length - 1].index = 1
  w.code('Décider les effets', K.MKT_DECIDER, 'Une publication ne part seule que si le format a ses 2-3 validations ET si la QA est propre ; sinon une carte, doublée d’une validation d’équipe.')
  w.link('Réunir les voies', 'Décider les effets')
  const lanes = {}, fins = []
  lanes.carte = voieCarte(w); fins.push(lanes.carte)
  noeudDe(w, 'Facebook : publier sur la page', 'n8n-nodes-base.facebookGraphApi', 'n8n-nodes-base.facebookGraphApi#POST feed', { node: 'PAGE_DU_CLIENT', options: { queryParameters: { parameter: [{ name: 'message', value: `={{ ${IT}.texte }}` }] } } }, { notes: 'Publication sur la page Facebook du client (API Graph), seulement après validation ou format validé.' })
  lanes.publier_facebook = 'Facebook : publier sur la page'; fins.push('Facebook : publier sur la page')
  noeudDe(w, 'Instagram : créer le média', 'n8n-nodes-base.facebookGraphApi', 'n8n-nodes-base.facebookGraphApi#POST Instagram media (conteneur)', { node: 'COMPTE_INSTAGRAM_DU_CLIENT', options: { queryParameters: { parameter: [{ name: 'image_url', value: `={{ ${IT}.image_url }}` }, { name: 'caption', value: `={{ ${IT}.texte }}` }] } } }, { notes: 'Instagram par l’API Graph : le conteneur du média (image par adresse). Une vidéo se traite en asynchrone : à ajouter dans la copie.' })
  noeudDe(w, 'Instagram : publier le média', 'n8n-nodes-base.facebookGraphApi', 'n8n-nodes-base.facebookGraphApi#POST Instagram media_publish', { node: 'COMPTE_INSTAGRAM_DU_CLIENT', options: { queryParameters: { parameter: [{ name: 'creation_id', value: '={{ $json.id }}' }] } } }, { notes: 'Instagram : publication du média créé juste avant.' })
  w.chaine('Instagram : créer le média', 'Instagram : publier le média'); lanes.publier_instagram = 'Instagram : créer le média'; fins.push('Instagram : publier le média')
  noeudDe(w, 'LinkedIn : publier', 'n8n-nodes-base.linkedIn', 'n8n-nodes-base.linkedIn#post.create (personne)', { text: `={{ ${IT}.texte }}` }, { notes: 'LinkedIn : PUBLICATION seulement, sur le compte du client. Aucune lecture de profils, aucune collecte (conditions de LinkedIn).' })
  lanes.publier_linkedin = 'LinkedIn : publier'; fins.push('LinkedIn : publier')
  externe(w, 'TikTok : envoyer le brouillon', 'POST', 'https://open.tiktokapis.com/v2/post/publish/content/init/', { corps: `={{ JSON.stringify({ post_info: { title: ${IT}.texte.slice(0, 90) }, source_info: { source: 'PULL_FROM_URL', photo_images: [${IT}.image_url], photo_cover_index: 0 }, post_mode: 'MEDIA_UPLOAD', media_type: 'PHOTO' }) }}`, notes: 'TikTok par l’API de publication : le contenu arrive en brouillon dans la boîte du créateur (MEDIA_UPLOAD), qui finit la publication. La publication directe exige l’audit de l’application par TikTok.' })
  lanes.publier_tiktok = 'TikTok : envoyer le brouillon'; fins.push('TikTok : envoyer le brouillon')
  noeudDe(w, 'YouTube : mettre en ligne la vidéo', 'n8n-nodes-base.youTube', 'n8n-nodes-base.youTube#video.getAll', { resource: 'video', operation: 'update', videoId: `={{ ${IT}.video_id }}`, title: `={{ ${IT}.texte.slice(0, 90) }}`, updateFields: { description: `={{ ${IT}.texte }}`, privacyStatus: 'public' } }, { notes: 'YouTube : la vidéo, téléversée en privé par l’équipe, passe en public avec son titre et sa description validés.' })
  const yt = w.nodes.find((n) => n.name === 'YouTube : mettre en ligne la vidéo'); delete yt.parameters.returnAll; delete yt.parameters.limit; delete yt.parameters.filters; delete yt.parameters.options
  lanes.publier_youtube = 'YouTube : mettre en ligne la vidéo'; fins.push('YouTube : mettre en ligne la vidéo')
  noeudDe(w, 'X : publier', 'n8n-nodes-base.twitter', 'n8n-nodes-base.twitter#tweet.create', { text: `={{ ${IT}.texte }}` }, { notes: 'X : publication sur le compte du client (280 caractères contrôlés en amont).' })
  lanes.publier_x = 'X : publier'; fins.push('X : publier')
  noeudDe(w, 'Facebook : répondre au commentaire', 'n8n-nodes-base.facebookGraphApi', 'n8n-nodes-base.facebookGraphApi#POST feed', { node: `={{ ${IT}.commentaire_id }}`, edge: 'comments', options: { queryParameters: { parameter: [{ name: 'message', value: `={{ ${IT}.texte }}` }] } } }, { notes: 'Réponse à un commentaire de la page (API Graph), après validation seulement.' })
  noeudDe(w, 'Instagram : répondre au commentaire', 'n8n-nodes-base.facebookGraphApi', 'n8n-nodes-base.facebookGraphApi#POST feed', { node: `={{ ${IT}.commentaire_id }}`, edge: 'replies', options: { queryParameters: { parameter: [{ name: 'message', value: `={{ ${IT}.texte }}` }] } } }, { notes: 'Réponse à un commentaire Instagram (API Graph), après validation seulement.' })
  lanes.repondre_commentaire_facebook = 'Facebook : répondre au commentaire'; lanes.repondre_commentaire_instagram = 'Instagram : répondre au commentaire'
  fins.push('Facebook : répondre au commentaire', 'Instagram : répondre au commentaire')
  ecrire(w, 'Écrire l’indicateur', 'entreprise_indicateurs', `cle_idempotence: ${IT}.cle_idempotence, reseau: ${IT}.reseau, indicateur: ${IT}.indicateur`, { notes: 'Le rapport du jour (nombres seulement) est rangé dans la plateforme.' })
  lanes.indicateur = 'Écrire l’indicateur'; fins.push('Écrire l’indicateur')
  // La validation d'équipe : Slack ou Teams, un canal par périmètre (C6) ; le résultat approuve ou refuse la carte.
  const validation = (nom, type, cle, surcharge, outil) => {
    noeudDe(w, `Valider par ${nom}`, type, cle, surcharge, { notes: `pied: mention\nValidation d’équipe (${nom}) : le message attend la réponse d’un membre du canal du périmètre (C6). Valider ou refuser. Rien ne se publie ici : la carte approuvée est reprise par la relève.` })
    si(w, `Validation ${nom} reçue ?`, '={{ $json.data?.approved === true }}', 'Approuvé : la carte passe à « approuvée ». Sinon (refus ou délai) : « refusée ».')
    modifier(w, `Approuver la carte (${nom})`, 'entreprise_cartes', [['cle_idempotence', `${IT}.carte_a_valider`], ['statut', "'a_valider'"]], `statut: 'approuvee', approuvee_par_role: (${IT}.approbateurs_roles ?? [])[0] ?? null`, { notes: 'Le canal de validation est propre au périmètre : ses membres sont les approbateurs du périmètre.' })
    modifier(w, `Refuser la carte (${nom})`, 'entreprise_cartes', [['cle_idempotence', `${IT}.carte_a_valider`], ['statut', "'a_valider'"]], "statut: 'refusee'")
    w.link(`Valider par ${nom}`, `Validation ${nom} reçue ?`); w.link(`Validation ${nom} reçue ?`, `Approuver la carte (${nom})`, { out: 0 }); w.link(`Validation ${nom} reçue ?`, `Refuser la carte (${nom})`, { out: 1 })
    fins.push(`Approuver la carte (${nom})`, `Refuser la carte (${nom})`)
    return `Valider par ${nom}`
  }
  lanes.valider_slack = validation('Slack', 'n8n-nodes-base.slack', 'n8n-nodes-base.slack#message.sendAndWait', { channelId: { __rl: true, mode: 'id', value: `={{ ${IT}.canal_equipe }}` }, message: `={{ ${IT}.texte }}${MAIL_PIED}` })
  lanes.valider_teams = validation('Teams', 'n8n-nodes-base.microsoftTeams', 'n8n-nodes-base.microsoftTeams#chatMessage.sendAndWait', { chatId: { __rl: true, mode: 'id', value: `={{ ${IT}.canal_equipe }}` }, message: `={{ ${IT}.texte }}${MAIL_PIED}` })
  noyauEffets(w, { lanes, fins })
  return w
}

// ═════════════════════════════════════════════ écriture ══════════════════════════════════════════════════════════════════════════
export const FABRIQUES = { 'gabarit-ent-accueil': accueil, 'gabarit-ent-leads': leads, 'gabarit-ent-ventes': ventes, 'gabarit-ent-marketing': marketing }
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
