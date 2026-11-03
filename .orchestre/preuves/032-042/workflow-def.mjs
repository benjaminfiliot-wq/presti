// La définition du workflow presti-reponse-seule, construite à partir des sources des nœuds Code (noeuds/*.js). Elle sert à deux choses :
// écrire le code du SDK n8n (generer.mjs --sdk) et écrire l'export (exporter.mjs). Rien ici ne parle à n8n.
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ICI = path.dirname(fileURLToPath(import.meta.url))
export const code = (n) => readFileSync(path.join(ICI, 'noeuds', n), 'utf8')
export const HOTE = 'https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/'
export const CRED = { supabaseApi: { id: 'dTewDK98MLrNckNG', name: 'Supabase account' } }
export const ERREUR_COMMUNE = 'AQeHiC58UgbMR4Kr'
const F = (c) => `$('Fenetre du passage').first().json.${c}`
const SURE = String.raw`/^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/`
export const NUL = '00000000-0000-0000-0000-000000000000'
const PAGINATION = { pagination: { paginationMode: 'updateAParameterInEachRequest', parameters: { parameters: [{ type: 'qs', name: 'offset', value: '={{ $pageCount * 1000 }}' }] },
  paginationCompleteWhen: 'other', completeExpression: '={{ !Array.isArray($response.body) || $response.body.length < 1000 }}', limitPagesFetched: true, maxRequests: 50 } }
export const fenetre = (a, b) => `={{ '(created_at.gte.' + ${F(a)} + ',created_at.lt.' + ${F(b)} + ')' }}`
export const ORDRE = ['order', 'created_at.asc,id.asc']
export const LIMITE = ['limit', '1000']
const dans = (colonne) => `={{ 'in.(' + ([...new Set($('Lire demandes').all().map(i => i.json.artisan_id).filter(Boolean))].join(',') || '${NUL}') + ')' }}`
const adresses = `={{ '(' + ([...new Set($('Lire demandes').all().map(i => String(i.json.contact || '').trim().toLowerCase()).filter(c => ${SURE}.test(c)))].map(c => 'contact.ilike.' + c).join(',') || 'contact.eq.-') + ')' }}`
// Les lectures : le juge relit ce tableau tel quel (nom, table, paramètres, envoi déclaré).
export const LECTURES = [
  { nom: 'Lire demandes du jour', table: 'leads', params: [['select', 'id,artisan_id,created_at'], ['and', fenetre('depuis_jour', 'fin')], ORDRE, LIMITE], envoi: null,
    notes: null },
  { nom: 'Lire demandes', table: 'leads', params: [['select', 'id,artisan_id,created_at,nom_prospect,contact,message'], ['and', fenetre('debut', 'fin')], ORDRE, LIMITE], envoi: 'Envoyer la reponse',
    notes: "Lue au moment d'envoyer seulement : le nom, l'adresse et le message du prospect, des demandes de la dernière minute. Le message sert à la décision (mots d'escalade), au modèle et à l'avis à l'artisan." },
  { nom: 'Lire comptes', table: 'artisans', params: [['select', 'id,nom,email,plan,leads_pause,notifications'], ['id', dans()], ['order', 'id'], LIMITE], envoi: 'Envoyer l avis',
    notes: "Lue au moment d'envoyer seulement : le nom et l'adresse de l'artisan (marque blanche et Reply-To), son offre (la réponse seule est vendue avec Signature), sa pause et ses préférences de notification (nouvelle_demande). Elle sert aussi la réponse au prospect (Envoyer la reponse)." },
  { nom: 'Lire reglages', table: 'plateforme_config', params: [['select', 'artisan_id,mode_reponse,auto_24_7,auto_debut,auto_fin,escalade_mots,limite_messages'], ['artisan_id', dans()], ['order', 'artisan_id'], LIMITE], envoi: 'Envoyer la reponse',
    notes: "Lue au moment d'envoyer seulement : les réglages de Ma plateforme qui décident si la réponse part seule (mode, plage horaire, mots d'escalade, limite de messages). Aucun réglage de style." },
  { nom: 'Lire rafale', table: 'leads', params: [['select', 'id,artisan_id,created_at'], ['and', `={{ '(created_at.gte.' + ${F('depuis_rafale')} + ',created_at.lt.' + ${F('fin')} + ')' }}`], ['artisan_id', dans()], ORDRE, LIMITE], envoi: null,
    notes: null },
  { nom: 'Lire doublons', table: 'leads', params: [['select', 'id,contact,created_at'], ['and', fenetre('depuis_doublons', 'fin')], ['or', adresses], ORDRE, LIMITE], envoi: 'Envoyer la reponse',
    notes: "Lue au moment d'envoyer seulement : les demandes des dernières 24 h faites avec les mêmes adresses, pour tenir le plafond par destinataire de lib/email.ts:81 que n8n contourne en envoyant lui-même." },
]
export const MENTION_NODE = 'Message rédigé et envoyé automatiquement par l’assistant'
const lecture = (l, pos) => ({ name: l.nom, type: 'n8n-nodes-base.httpRequest', typeVersion: 4.5, position: pos,
  parameters: { method: 'GET', url: HOTE + l.table, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendQuery: true, specifyQuery: 'keypair',
    queryParameters: { parameters: l.params.map(([name, value]) => ({ name, value })) }, options: { timeout: 30000, pagination: PAGINATION } },
  ...(l.envoi ? { notes: `lecture-pour-envoi: ${l.envoi}\n${l.notes}` } : {}), executeOnce: true, credentials: CRED })
const filtre = (name, pos, valeur) => ({ name, type: 'n8n-nodes-base.filter', typeVersion: 2.2, position: pos,
  parameters: { conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict' }, combinator: 'and', conditions: [{ leftValue: '={{ $json.courrier }}', operator: { type: 'string', operation: 'equals' }, rightValue: valeur }] } } })
const envoi = (name, pos, notes, texte) => ({ name, type: 'n8n-nodes-base.emailSend', typeVersion: 2.1, position: pos,
  parameters: { operation: 'send', fromEmail: '={{ $json.de }}', toEmail: '={{ $json.a }}', subject: '={{ $json.sujet }}', emailFormat: 'text', text: texte, options: { appendAttribution: false, replyTo: '={{ $json.repondre_a }}' } },
  disabled: true, notes })
export const TEXTE_REPONSE = '={{ $json.corps }}\n\n—\n' + MENTION_NODE + '{{ $json.de_artisan }}.'
export function noeuds() {
  const x = (i) => [i * 224, 0]
  return [
    { name: 'Toutes les minutes', type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.4, position: x(0), parameters: { rule: { interval: [{ field: 'cronExpression', expression: '0 * * * * *' }] } } },
    { name: 'Fenetre du passage', type: 'n8n-nodes-base.code', typeVersion: 2, position: x(1), parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: code('fenetre.js') } },
    ...LECTURES.map((l, i) => lecture(l, x(2 + i))),
    { name: 'Decider', type: 'n8n-nodes-base.code', typeVersion: 2, position: x(8), parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: code('decider.js') } },
    { name: 'Modele epingle', type: 'n8n-nodes-base.code', typeVersion: 2, position: x(9), notes: 'EPINGLE : aucun appel. Rend une réponse d’exemple fixe ; remplacé par le modèle à la publication (brief).', parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: code('modele.js') } },
    { name: 'Courriers a envoyer', type: 'n8n-nodes-base.code', typeVersion: 2, position: x(10), parameters: { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: code('courriers.js') } },
    filtre('Garder les reponses', [x(11)[0], -112], 'reponse'),
    envoi('Envoyer la reponse', [x(12)[0], -112], "pied: mention\nSIMULATION : nœud désactivé, sans identifiant SMTP (à poser par Benj). Réponse rédigée par le modèle et envoyée sans relecture, au nom de l'artisan, Reply-To = son adresse, avec la mention d'IA (lib/mentionAssistant.ts:14-17).", TEXTE_REPONSE),
    filtre('Garder les avis', [x(11)[0], 112], 'avis'),
    envoi('Envoyer l avis', [x(12)[0], 112], "pied: aucun\nSIMULATION : nœud désactivé, sans identifiant SMTP (à poser par Benj). Avis de Presti à l'artisan (« Nouveau lead », ou alerte « Demande sensible »), Reply-To = le prospect.", '={{ $json.texte }}'),
  ]
}
export const CHAINE = ['Toutes les minutes', 'Fenetre du passage', ...LECTURES.map((l) => l.nom), 'Decider', 'Modele epingle', 'Courriers a envoyer']
export const BRANCHES = [['Garder les reponses', 'Envoyer la reponse'], ['Garder les avis', 'Envoyer l avis']]
export const REGLAGES = { timezone: 'Europe/Paris', executionTimeout: 120, saveDataSuccessExecution: 'none', saveDataErrorExecution: 'all', errorWorkflow: ERREUR_COMMUNE, availableInMCP: true, executionOrder: 'v1' }
