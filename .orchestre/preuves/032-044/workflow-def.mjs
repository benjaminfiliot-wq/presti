// La définition du workflow presti-relances, construite à partir des sources des nœuds Code (noeuds/*.js). Elle sert à deux choses :
// écrire le code du SDK n8n (sdk.mjs) et écrire l'export (exporter.mjs). Rien ici ne parle à n8n.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ICI = path.dirname(fileURLToPath(import.meta.url))
export const code = (n) => readFileSync(path.join(ICI, 'noeuds', n), 'utf8')
export const HOTE = 'https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/'
export const CRED = { supabaseApi: { id: 'dTewDK98MLrNckNG', name: 'Supabase account' } }
export const ERREUR_COMMUNE = 'AQeHiC58UgbMR4Kr'
export const NUL = '00000000-0000-0000-0000-000000000000'
const UUID = String.raw`/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`
const PAGINATION = { pagination: { paginationMode: 'updateAParameterInEachRequest', parameters: { parameters: [{ type: 'qs', name: 'offset', value: '={{ $pageCount * 1000 }}' }] },
  paginationCompleteWhen: 'other', completeExpression: '={{ !Array.isArray($response.body) || $response.body.length < 1000 }}', limitPagesFetched: true, maxRequests: 50 } }
// Une liste d'identifiants lue dans la sortie d'un nœud, filtrée (uuid seulement : rien d'autre n'entre dans un filtre), sans doublon.
const col = (noeud, champ) => `$('${noeud}').all().map(i => i.json.${champ})`
const dans = (...sources) => `={{ 'in.(' + ([...new Set([${sources.map((s) => `...${s}`).join(', ')}].filter(v => ${UUID}.test(String(v))))].join(',') || '${NUL}') + ')' }}`
const LIMITE = ['limit', '1000']
const ORDRE = (o) => ['order', o]
// Les lectures : le juge relit ce tableau tel quel (nom, table, paramètres, envoi déclaré, pagination).
export const LECTURES = [
  { nom: 'Lire relances dues', table: 'relances', pagine: false,
    params: [['select', 'id,lead_id,rang,planifiee_le'], ['envoyee', 'eq.false'], ['planifiee_le', "={{ 'lte.' + $('Passage').first().json.passage }}"], ORDRE('planifiee_le.asc,id.asc'), ['limit', '100']], envoi: null, notes: null },
  { nom: 'Lire demandes', table: 'leads', pagine: true,
    params: [['select', 'id,nom_prospect,contact,message,statut,artisan_id,prise_en_main'], ['id', dans(col('Lire relances dues', 'lead_id'))], ORDRE('id'), LIMITE], envoi: 'Envoyer la relance',
    notes: "Lue au moment d'envoyer seulement : le nom, l'adresse et la demande d'origine des prospects dont une relance est due (le message décide : mots d'escalade). Statut et main prise décident si la relance est annulée." },
  { nom: 'Lire comptes', table: 'artisans', pagine: true,
    params: [['select', 'id,nom,email,plan,is_founder,leads_pause,notifications'], ['id', dans(col('Lire demandes', 'artisan_id'))], ORDRE('id'), LIMITE], envoi: 'Envoyer l avis',
    notes: "Lue au moment d'envoyer seulement : le nom et l'adresse de l'artisan (marque blanche, Reply-To, avis « Relance prête à valider »), son offre (Studio prépare, Signature envoie seul), compte de démonstration, pause et préférence de notification (proposition). Elle sert aussi la relance au prospect (Envoyer la relance)." },
  { nom: 'Lire reglages', table: 'plateforme_config', pagine: true,
    params: [['select', 'artisan_id,escalade_mots'], ['artisan_id', dans(col('Lire demandes', 'artisan_id'))], ORDRE('artisan_id'), LIMITE], envoi: null, notes: null },
  { nom: 'Lire suspensions', table: 'suspensions', pagine: true,
    params: [['select', 'id,artisan_id'], ['levee_le', 'is.null'], ['artisan_id', dans(col('Lire demandes', 'artisan_id'))], ORDRE('artisan_id.asc,id.asc'), LIMITE], envoi: null, notes: null },
  { nom: 'Lire messages entrants', table: 'messages', pagine: true,
    params: [['select', 'id,lead_id,contenu,sent_at'], ['sens', 'eq.in'], ['lead_id', dans(col('Lire relances dues', 'lead_id'))], ORDRE('sent_at.desc,id.desc'), LIMITE], envoi: 'Envoyer la relance',
    notes: "Lue au moment d'envoyer seulement : les messages ENTRANTS des conversations à relancer (les 10 derniers servent à repérer un sujet d'escalade : litige, avocat, fuite…). Le texte n'est jamais recopié dans un courrier." },
  { nom: 'Lire devis', table: 'devis', pagine: true,
    params: [['select', 'id,lead_id,client_id,artisan_id'], ['lead_id', dans(col('Lire relances dues', 'lead_id'))], ORDRE('id'), LIMITE], envoi: null, notes: null },
  { nom: 'Lire factures', table: 'factures', pagine: true,
    params: [['select', 'id,devis_id,artisan_id'], ['devis_id', dans(col('Lire devis', 'id'))], ORDRE('id'), LIMITE], envoi: null, notes: null },
  { nom: 'Lire actions assistant', table: 'assistant_actions', pagine: true,
    params: [['select', 'id,objet_id,maj_le'], ['outil', 'in.(relancer_devis,relancer_facture)'], ['statut', 'eq.executee'], ['objet_id', dans(col('Lire devis', 'id'), col('Lire factures', 'id'))], ORDRE('maj_le.desc,id.desc'), LIMITE], envoi: null, notes: null },
  { nom: 'Lire rappels CRM', table: 'crm_rappels', pagine: true,
    params: [['select', 'id,devis_id,envoye_le'], ['envoye_le', 'not.is.null'], ['devis_id', dans(col('Lire devis', 'id'))], ORDRE('id'), LIMITE], envoi: null, notes: null },
  { nom: 'Lire relances impayes', table: 'relances_impayes', pagine: true,
    params: [['select', 'id,facture_id,envoyee_le'], ['envoyee_le', 'not.is.null'], ['facture_id', dans(col('Lire factures', 'id'))], ORDRE('id'), LIMITE], envoi: null, notes: null },
  { nom: 'Lire exclusions', table: 'relances_exclusions', pagine: true,
    params: [['select', 'id,artisan_id,client_id,lead_id'], ['levee_le', 'is.null'], ['artisan_id', dans(col('Lire demandes', 'artisan_id'))], ORDRE('id'), LIMITE], envoi: null, notes: null },
]
export const MENTION_NODE = 'Message rédigé et envoyé automatiquement par l’assistant'
const lecture = (l, pos) => ({ name: l.nom, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.5, position: pos,
  parameters: { method: 'GET', url: HOTE + l.table, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendQuery: true, specifyQuery: 'keypair',
    queryParameters: { parameters: l.params.map(([name, value]) => ({ name, value })) }, options: l.pagine ? { timeout: 30000, ...PAGINATION } : { timeout: 30000 } },
  ...(l.envoi ? { notes: `lecture-pour-envoi: ${l.envoi}\n${l.notes}` } : {}), executeOnce: true, ...(l.nom === 'Lire relances dues' ? {} : { alwaysOutputData: true }), credentials: CRED })
const filtre = (name, pos, valeur) => ({ name, type: 'n8n-nodes-base.filter', typeVersion: 2.2, position: pos,
  parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, combinator: 'and', conditions: [{ leftValue: '={{ $json.courrier }}', operator: { type: 'string', operation: 'equals' }, rightValue: valeur }] } } })
const envoi = (name, pos, notes, texte) => ({ name, type: 'n8n-nodes-base.emailSend', typeVersion: 2.1, position: pos,
  parameters: { operation: 'send', fromEmail: '={{ $json.de }}', toEmail: '={{ $json.a }}', subject: '={{ $json.sujet }}', emailFormat: 'text', text: texte, options: { appendAttribution: false, replyTo: '={{ $json.repondre_a }}' } },
  disabled: true, notes })
export const TEXTE_RELANCE = '={{ $json.corps }}\n\n—\n' + MENTION_NODE + '{{ $json.de_artisan }}.'
export function noeuds() {
  const x = (i) => [i * 224, 0]
  const n = LECTURES.length
  return [
    { name: 'Chaque matin', type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.4, position: x(0), parameters: { rule: { interval: [{ field: 'cronExpression', expression: '0 0 8 * * *' }] } } },
    { name: 'Passage', type: 'n8n-nodes-base.code', typeVersion: 2, position: x(1), parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: code('passage.js') } },
    ...LECTURES.map((l, i) => lecture(l, x(2 + i))),
    { name: 'Decider', type: 'n8n-nodes-base.code', typeVersion: 2, position: x(2 + n), parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: code('decider.js') } },
    { name: 'Modele epingle', type: 'n8n-nodes-base.code', typeVersion: 2, position: x(3 + n), notes: 'EPINGLE : aucun appel. Rend un texte d’exemple fixe ; remplacé par le modèle à la publication (brief).', parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: code('modele.js') } },
    { name: 'Courriers a envoyer', type: 'n8n-nodes-base.code', typeVersion: 2, position: x(4 + n), parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: code('courriers.js') } },
    filtre('Garder les relances', [x(5 + n)[0], -112], 'relance'),
    envoi('Envoyer la relance', [x(6 + n)[0], -112], "pied: mention\nSIMULATION : nœud désactivé, sans identifiant SMTP (à poser par Benj). Relance de conversation (J+2, J+5, J+10) rédigée par le modèle et envoyée sans relecture, au nom de l'artisan (Signature seulement), Reply-To = son adresse, avec la mention d'IA (lib/mentionAssistant.ts:14-17).", TEXTE_RELANCE),
    filtre('Garder les avis', [x(5 + n)[0], 112], 'avis'),
    envoi('Envoyer l avis', [x(6 + n)[0], 112], "pied: aucun\nSIMULATION : nœud désactivé, sans identifiant SMTP (à poser par Benj). Avis de Presti à l'artisan Studio : « Relance prête à valider » (la relance attend son clic, rien n'est parti).", '={{ $json.texte }}'),
  ]
}
export const CHAINE = ['Chaque matin', 'Passage', ...LECTURES.map((l) => l.nom), 'Decider', 'Modele epingle', 'Courriers a envoyer']
export const BRANCHES = [['Garder les relances', 'Envoyer la relance'], ['Garder les avis', 'Envoyer l avis']]
export const REGLAGES = { timezone: 'Europe/Paris', executionTimeout: 120, saveDataSuccessExecution: 'none', saveDataErrorExecution: 'all', errorWorkflow: ERREUR_COMMUNE, availableInMCP: true, executionOrder: 'v1' }
