// 036-015 — gabarit-artisan-direction : page du matin (7 h), rapport du lundi (8 h) (OUTILLAGE.md § 5, ligne 7). LE CODE COMPTE ; le modèle ne rédige qu'une phrase, sans aucun chiffre.
import { J, MENTION, LIB, code, si, porte, lire, deposer, outil, outilWorkflow, specialiste, note, programme } from './commun.mjs'

export const NOM = 'gabarit-artisan-direction'

export const CODE_COMPTE = String.raw`// gabarit-artisan-direction · Compte et mode (036-015) : le compte de la COPIE du client, le mode à blanc, quelle page aujourd'hui (matin 7 h, lundi 8 h).
const t = $input.first().json || {};
const maintenant = String(t.timestamp || '');
if (!maintenant) throw new Error('horloge absente');
const heure = Number(maintenant.slice(11, 13));
const lundi = new Date(maintenant.slice(0, 10) + 'T12:00:00Z').getUTCDay() === 1 && heure === 8;
return [{ json: { organisation_id: 'A_REMPLACER_PAR_LA_COPIE', simulation: true, maintenant: maintenant, jour: maintenant.slice(0, 10), declencheur: lundi ? 'lundi' : 'matin' } }];`

export const CODE_COMPTER = String.raw`// gabarit-artisan-direction · Compter (036-015) : LE CODE COMPTE. Chaque chiffre vient d'une lecture de la plateforme, avec son libellé ; une lecture absente se dit « non lu », jamais un zéro.
// Le modèle ne reçoit aucun montant à calculer : il rédige une phrase sans chiffre et choisit des numéros de priorités parmi celles que le code propose.
const ctx = $('Compte et mode').first().json;
const cfg = $('Lire la configuration').first().json || {};
const b = $('Lire les chiffres du jour').first().json || {};
const r = $('Lire le rapport de la semaine').first().json || {};
const couts = $('Lire le coût IA').all().map((i) => i.json).filter((x) => x && x.jour);
const entier = (n) => (Number.isInteger(n) && n >= 0 ? n : null);
const eur = (c) => (Number.isInteger(c) && c >= 0 ? Math.round(c / 100) : null);
const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const ligne = (libelle, v, unite) => libelle + ' : ' + (v === null ? 'non lu' : fmt(v) + (unite || ''));
const dernier = couts.length ? couts[couts.length - 1] : null;
const cout = dernier && Number.isInteger(dernier.cout_centimes) ? (dernier.cout_centimes / 100).toFixed(2).replace('.', ',') + ' €' : 'non lu';
const lignes = [];
const candidats = [];
if (ctx.declencheur === 'matin') {
  const imp = eur(b.impayes_echus_centimes);
  lignes.push(ligne('Impayés échus', imp, ' €'), ligne('Devis sans réponse', entier(b.devis_a_relancer)), ligne('Demandes sans réponse', entier(b.demandes_sans_reponse)), ligne('Rendez-vous du jour', entier(b.rendez_vous_jour)), 'Coût IA du jour : ' + cout);
  if (imp !== null && imp > 0) candidats.push('Relancer les impayés échus');
  if (entier(b.devis_a_relancer) > 0) candidats.push('Relancer les devis sans réponse');
  if (entier(b.demandes_sans_reponse) > 0) candidats.push('Répondre aux demandes en attente');
  if (entier(b.cartes_a_valider) > 0) candidats.push('Valider les cartes en attente');
  lignes.push(ligne('Cartes à valider', entier(b.cartes_a_valider)));
} else {
  lignes.push(ligne('Encaissé cette semaine', eur(r.encaisse_centimes), ' €'), ligne('Signé cette semaine', eur(r.signe_centimes), ' €'), ligne('En cours', eur(r.en_cours_centimes), ' €'), ligne('Relances ayant précédé une signature', entier(r.relances_creditees)), 'Coût IA de la semaine : ' + cout);
}
const cle = 'page:' + ctx.declencheur + ':' + ctx.jour;
const consigne = (ctx.declencheur === 'matin' ? 'Page du matin. Priorités possibles (numérotées de 0) : ' + candidats.map((c, i) => i + ' = ' + c).join(' ; ') + '. ' : 'Rapport du lundi. ') + 'Écris une phrase sobre, SANS AUCUN CHIFFRE. Recopie cette clé telle quelle : ' + cle;
return [{ json: { simulation: ctx.simulation, organisation_id: ctx.organisation_id, kind: ctx.declencheur, cle: cle, lignes: lignes, candidats: candidats, canal: ['telegram', 'whatsapp', 'slack', 'teams', 'gmail'].includes(cfg.canal_direction) ? cfg.canal_direction : 'aucun', destination: cfg.destination_direction || null, consigne: consigne, semaine: String(r.semaine || ctx.jour), chiffres: { encaisse_eur: eur(r.encaisse_centimes), signe_eur: eur(r.signe_centimes), en_cours_eur: eur(r.en_cours_centimes) } } }];`

export const CODE_REVALIDER_MATIN = String.raw`// gabarit-artisan-direction · Revalider la page (036-015) : la phrase du modèle ne porte AUCUN chiffre ; les chiffres de la page sont ceux du code. Les priorités sont des numéros de la liste du code.
const d = $('Compter').first().json;
return $input.all().map((it, i) => {
  const r = (it.json && it.json.output) || {};
  if (r.cle !== d.cle) throw new Error('clé inconnue : hors schéma');
  if (typeof r.intro !== 'string' || r.intro.trim().length < 10 || r.intro.length > 240 || /\d/.test(r.intro) || /presti|€/i.test(r.intro)) throw new Error('phrase hors schéma : un chiffre ne vient jamais du modèle');
  const ix = Array.isArray(r.priorites) ? r.priorites : [];
  if (ix.length > 3 || new Set(ix).size !== ix.length || !ix.every((n) => Number.isInteger(n) && n >= 0 && n < d.candidats.length)) throw new Error('priorité hors liste');
  const faire = ix.length ? '\n\nÀ faire :\n' + ix.map((n) => '• ' + d.candidats[n]).join('\n') : '';
  return { json: Object.assign({}, d, { message: r.intro.trim() + '\n\n' + d.lignes.join('\n') + faire }), pairedItem: { item: i } };
});`

export const CODE_REVALIDER_LUNDI = String.raw`// gabarit-artisan-direction · Revalider le rapport (036-015) : le commentaire du modèle ne porte AUCUN chiffre, aucun mot de gain ni d'économie ; les chiffres sont ceux du code.
const d = $('Compter').first().json;
return $input.all().map((it, i) => {
  const r = (it.json && it.json.output) || {};
  if (r.cle !== d.cle) throw new Error('clé inconnue : hors schéma');
  if (typeof r.commentaire !== 'string' || r.commentaire.trim().length < 10 || r.commentaire.length > 300 || /\d/.test(r.commentaire) || /presti|€|gain|économi|rentab/i.test(r.commentaire)) throw new Error('commentaire hors schéma : un chiffre ne vient jamais du modèle');
  return { json: Object.assign({}, d, { message: r.commentaire.trim() + '\n\n' + d.lignes.join('\n') }), pairedItem: { item: i } };
});`

export const CODE_EFFETS_PREVUS = String.raw`// gabarit-artisan-direction · Effets prévus (036-015) : la branche « simulation ». Rien n'est envoyé, rien n'est exporté ; la page prévue est celle du CODE (chiffres du code, phrase enregistrée datée).
const d = $input.first().json;
const jour = String(d.jour || d.cle.slice(-10));
const envoi = d.canal === 'aucun' ? 'aucun_canal_choisi' : 'envoi_' + d.canal;
const prevus = [{ cle: d.cle, kind: d.kind, effet: envoi, lignes: d.lignes, phrase: 'Exemple. Phrase enregistrée le ' + jour + ' (modèle non appelé).' }];
if (d.kind === 'lundi') prevus.push({ cle: d.cle, kind: d.kind, effet: 'export_sheets', lignes: d.lignes });
return [{ json: { simulation: true, effets_prevus: prevus, effets_faits: [] } }];`

export const NOEUDS_CODE = { 'Compte et mode': CODE_COMPTE, 'Compter': CODE_COMPTER, 'Revalider la page': CODE_REVALIDER_MATIN, 'Revalider le rapport': CODE_REVALIDER_LUNDI, 'Effets prévus': CODE_EFFETS_PREVUS }

const COMMUN = " Vouvoie. Sois sobre, direct, sans compliment. Tu ne comptes rien et tu n’écris AUCUN chiffre : les chiffres sont écrits par le code, sous ta phrase. N’invente aucun fait. N’écris jamais le nom de la plateforme. Tes outils lisent seulement. Rends exactement le schéma."
const S_MATIN = { type: 'object', additionalProperties: false, required: ['cle', 'intro', 'priorites'], properties: { cle: { type: 'string', maxLength: 80 }, intro: { type: 'string', maxLength: 240 }, priorites: { type: 'array', maxItems: 3, items: { type: 'integer', minimum: 0, maximum: 3 } } } }
const S_LUNDI = { type: 'object', additionalProperties: false, required: ['cle', 'commentaire'], properties: { cle: { type: 'string', maxLength: 80 }, commentaire: { type: 'string', maxLength: 300 } } }
const FEUILLE = { documentId: { __rl: true, mode: 'id', value: 'A_REMPLACER_PAR_LA_COPIE' }, sheetName: { __rl: true, mode: 'name', value: 'Rapports' } }
const texte = (nom) => `{{ $json.message }}\n\n— ${MENTION}.`

export function sdkDirection() {
  const dec = [
    note("## gabarit-artisan-direction (036-015)\nDirection de l’artisan avec les VRAIS nœuds : page du matin à 7 h (l’argent d’abord, se termine par des cartes), rapport du lundi à 8 h exporté dans Google Sheets, envoi par Telegram, WhatsApp, Gmail, Slack ou Teams, coût IA lu dans la plateforme (lib-cout-ia en outil).\nLE CODE COMPTE : chaque chiffre vient d’une lecture de la plateforme avec son libellé ; le modèle écrit une phrase SANS chiffre et choisit des numéros de priorités. Une lecture absente se dit « non lu », jamais un zéro. Aucun chiffre de gain ni d’économie.\nGABARIT : INACTIF, sans aucun identifiant, porte « simulation » devant chaque effet. Une copie par client reçoit ses comptes, branchés par lui. Rien n’y part chez un client de l’artisan : la page est pour l’artisan.\nSources : OUTILLAGE.md § 5 ligne 7 ; vidéos A7, A8, A9, A16, D3 ; lib/assistant/briefing.ts ; dépôt « Daily meetings summarization » (déclencheur horaire, agent, Slack)."),
    `const t1 = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { name: 'Chaque jour à 7 h', notes: 'Page du matin. Le lundi, 8 h : le rapport (déclencheur suivant).', parameters: { rule: { interval: [{ field: 'days', triggerAtHour: 7 }] } } } });`,
    `const t2 = trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { name: 'Le lundi à 8 h', notes: 'Rapport du lundi.', parameters: { rule: { interval: [{ field: 'weeks', triggerAtDay: [1], triggerAtHour: 8 }] } } } });`,
    `const compte = ${code('Compte et mode', CODE_COMPTE, 'Le compte de la copie du client, le mode à blanc, la page du jour.')};`,
    `const config = ${lire('Lire la configuration', 'pilote_reglages', 'actif,offre,canal_direction,destination_direction', [], "Canal choisi par l'artisan pour sa propre page (jamais un client). Colonnes exactes à fournir à l'intégration (036-012).")};`,
    `const chiffres = ${lire('Lire les chiffres du jour', 'briefing_organisation', 'impayes_echus_centimes,devis_a_relancer,demandes_sans_reponse,rendez_vous_jour,cartes_a_valider,lu_le', [], "Les chiffres que lib/assistant/briefing.ts calcule par le code (devis sans réponse 7 jours, impayé 30 jours, stock). Lecture seule.")};`,
    `const rapport = ${lire('Lire le rapport de la semaine', 'rapport_hebdo_organisation', 'semaine,encaisse_centimes,signe_centimes,en_cours_centimes,relances_creditees', [['order', 'semaine.desc'], ['limit', '1']], 'Encaissé, signé, en cours : une relance n’est créditée que si elle précède la signature. Aucun chiffre de gain.')};`,
    `const cout = ${lire('Lire le coût IA', 'couts_ia_jour', 'jour,cout_centimes,part_externe_centimes', [['order', 'jour.desc'], ['limit', '7']], 'Coût IA par compte et par jour, calculé par le code (couts_ia_jour, migration 0193 ; lib-cout-ia). Un appel sans tarif daté reste inconnu.')};`,
    `const compter = ${code('Compter', CODE_COMPTER)};`,
    `const porte = ${porte()};`,
    `const effets = ${code('Effets prévus', CODE_EFFETS_PREVUS, 'Branche simulation : la page prévue part au journal, rien ne part, rien n’est exporté.')};`,
    `const siMatin = ${si('Page du matin ?', "$json.kind === 'matin'")};`,
    specialiste('Ma', 'Rédacteur de la page', "Tu rédiges la phrase d’ouverture de la page du matin d’un artisan français, puis tu choisis jusqu’à trois priorités par leur NUMÉRO dans la liste donnée par le code." + COMMUN, S_MATIN, [
      outilWorkflow('Outil : alertes ouvertes', LIB['lib-alerte-liste'], 'Liste fermée des alertes (prix ferme demandé, client mécontent, litige, urgence le soir, panne, coût qui dérive, impayé au-dessus du seuil). Lecture seule.'),
      outilWorkflow('Outil : coût IA', LIB['lib-cout-ia'], 'Coût IA par compte et par jour, compté par le code. Lecture seule.'),
    ]),
    `const revM = ${code('Revalider la page', CODE_REVALIDER_MATIN)};`,
    specialiste('Ra', 'Rédacteur du rapport', "Tu rédiges le commentaire d’une phrase du rapport du lundi d’un artisan français. Aucun mot de gain, d’économie ni de rentabilité." + COMMUN, S_LUNDI, [
      outil('n8n-nodes-base.googleSheetsTool', 4.7, 'Outil : relire les rapports passés', { resource: 'sheet', operation: 'read', ...FEUILLE }, 'Google Sheets · sheet · read (lecture seule).\nL’agent relit l’historique des rapports pour garder le même ton ; il n’écrit jamais.'),
      outilWorkflow('Outil : coût IA (rapport)', LIB['lib-cout-ia'], 'Coût IA par compte et par jour, compté par le code. Lecture seule.'),
    ]),
    `const revR = ${code('Revalider le rapport', CODE_REVALIDER_LUNDI)};`,
    `const siTg = ${si('Page par Telegram ?', "$json.canal === 'telegram'")};`,
    `const siWa = ${si('Page par WhatsApp ?', "$json.canal === 'whatsapp'")};`,
    `const siSl = ${si('Page par Slack ?', "$json.canal === 'slack'")};`,
    `const siTe = ${si('Page par Teams ?', "$json.canal === 'teams'")};`,
    `const tg = node({ type: 'n8n-nodes-base.telegram', version: 1.2, config: { name: 'Page par Telegram', notes: ${J('pied: mention\nTelegram · message · sendMessage, à l’artisan lui-même (sa page), jamais à un client. Atteint après la porte.')}, parameters: { resource: 'message', operation: 'sendMessage', chatId: expr("{{ $json.destination }}"), text: expr(${J(texte())}), additionalFields: { appendAttribution: false } } } });`,
    `const wa = node({ type: 'n8n-nodes-base.whatsApp', version: 1.1, config: { name: 'Page par WhatsApp', notes: ${J('pied: mention\nWhatsApp Business Cloud · message · send, à l’artisan lui-même. Atteint après la porte.')}, parameters: { resource: 'message', operation: 'send', phoneNumberId: expr("{{ $('Compte et mode').first().json.numero_whatsapp_id }}"), recipientPhoneNumber: expr("{{ $json.destination }}"), textBody: expr(${J(texte())}) } } });`,
    `const sl = node({ type: 'n8n-nodes-base.slack', version: 2.3, config: { name: 'Page par Slack', notes: ${J('pied: mention\nSlack · message · post, dans le canal de l’artisan ou de son équipe. Atteint après la porte. Authentification OAuth2 : la copie du client branche la sienne.')}, parameters: { authentication: 'oAuth2', resource: 'message', operation: 'post', select: 'channel', channelId: { __rl: true, mode: 'id', value: expr("{{ $json.destination }}") }, messageType: 'text', text: expr(${J(texte())}), otherOptions: {} } } });`,
    `const te = node({ type: 'n8n-nodes-base.microsoftTeams', version: 2, config: { name: 'Page par Teams', notes: ${J('Microsoft Teams · chatMessage · create, dans le chat de l’artisan ou de son équipe. Atteint après la porte. La mention de l’assistant figure dans le texte.')}, parameters: { resource: 'chatMessage', operation: 'create', chatId: expr("{{ $json.destination }}"), messageType: 'text', message: expr(${J(texte())}), options: {} } } });`,
    `const gm = node({ type: 'n8n-nodes-base.gmail', version: 2.2, config: { name: 'Page par Gmail', notes: ${J('pied: mention\nGmail · message · send, de la boîte de l’artisan vers lui-même. Atteint après la porte.')}, parameters: { resource: 'message', operation: 'send', sendTo: expr("{{ $json.destination }}"), subject: expr("{{ $json.kind === 'lundi' ? 'Votre rapport du lundi' : 'Votre page du matin' }}"), emailType: 'text', message: expr(${J(texte())}), options: { appendAttribution: false } } } });`,
    `const feuille = node({ type: 'n8n-nodes-base.googleSheets', version: 4.7, config: { name: 'Exporter le rapport dans Sheets', notes: ${J('Google Sheets · sheet · append : une ligne par rapport du lundi (semaine, encaissé, signé, en cours), clé de semaine. Chiffres du CODE seulement. Atteint après la porte.')}, parameters: { resource: 'sheet', operation: 'append', ${J(FEUILLE).slice(1, -1)}, columns: { mappingMode: 'defineBelow', value: { semaine: expr("{{ $json.semaine }}"), encaisse_eur: expr("{{ $json.chiffres.encaisse_eur }}"), signe_eur: expr("{{ $json.chiffres.signe_eur }}"), en_cours_eur: expr("{{ $json.chiffres.en_cours_eur }}") }, matchingColumns: [], schema: [] }, options: {} } } });`,
    `const journal = ${deposer('Journaliser la page', 'evenements_metier', "{ organisation_id: $('Compter').first().json.organisation_id, type: 'page_direction', cle: $('Compter').first().json.cle + ':fait', faits: {} }", 'Une ligne par page envoyée, clé unique par jour : une page ne part jamais deux fois.')};`,
  ]
  const envoi = 'siTg.onTrue(tg.to(journal)).onFalse(siWa.onTrue(wa.to(journal)).onFalse(siSl.onTrue(sl.to(journal)).onFalse(siTe.onTrue(te.to(journal)).onFalse(gm.to(journal)))))'
  const chaine = [
    '  .add(t1).to(compte)', '  .add(t2).to(compte)',
    '  .add(compte).to(config).to(chiffres).to(rapport).to(cout).to(compter).to(porte.onTrue(effets).onFalse(siMatin.onTrue(agMa.to(revM)).onFalse(agRa.to(revR))))',
    `  .add(revM).to(${envoi})`,
    '  .add(revR).to(siTg)', '  .add(revR).to(feuille.to(journal))',
    '  .add(note);',
  ]
  return programme(NOM, '', dec, chaine)
}
