// 036-004 — les jeux d'essai FICTIFS du Suivi (« Exemple. » devant tout nom, aucune adresse, aucun numéro) : la source des pins de l'essai n8n et du banc.
// Le juge scripts/suivi-n8n-qa.mjs a ses PROPRES cas, écrits à part ; il ne lit jamais ce fichier.
import { codeEntree, codeSortie } from '../035-003/construire.mjs'
import { sortieModele } from '../035-005/construire.mjs'
import { SCHEMAS, INTERET_DEFAUT, lireConstantes, codeConflit, reglagesEnfant, ERREUR, IDS, specChef, exportLocal, ETAPES } from './construire.mjs'
const J = JSON.stringify
export const MAINTENANT = '2026-11-09T09:00:00+01:00' // lundi 9 novembre 2026, 9 h à Paris
export const MARDI = '2026-11-10T09:00:00+01:00'
export const COMPTE = { A: '00000000-0000-4000-8000-0000000000a4', B: '00000000-0000-4000-8000-0000000000b4' }
const id = (c, k, n) => `${k}0000000-0000-4000-8000-${c === 'A' ? 'a' : 'b'}${String(n).padStart(11, '0')}`
export const CAPACITES = {
  A: ['canaux.email', 'relances', 'factures.relances', 'assistant'],
  B: ['canaux.email', 'relances', 'factures.relances', 'assistant', 'plateforme.ia.auto', 'relances.auto', 'factures.relances.auto', 'crm', 'assistant.pilote'],
}
export const configSuivi = (c) => ({ nom_artisan: 'Exemple. Bâti-Démo', offre: c === 'A' ? 'studio' : 'signature', capacites: CAPACITES[c],
  pilote: c === 'A' ? { drapeau: true, actif: false, types: {} } : { drapeau: true, actif: true, types: { relance_devis: true, reponse_prospect: true } },
  parties_depuis_24h: 0, plafond_jour: 20, interrupteur_general: true, interrupteur_departement: true, pause_generale: false, mots_escalade_artisan: ['stop'], fournisseurs: [],
  horaires: { jours_permis: [1, 2, 3, 4, 5, 6, 7], heures_permises: { debut: '00:00', fin: '23:59' } }, paliers_conversation_jours: [2, 5, 10], paliers_devis_jours: [7], jour_du_lot: 1,
  ton: 'Exemple. cordial et simple, vouvoiement', signature: 'Exemple. L’équipe Bâti-Démo', interet: INTERET_DEFAUT })
const base = (c, n, o) => ({ objet_type: 'devis', objet_id: id(c, '0', n), dossier_id: id(c, 'd', n), statut: 'envoye', depuis_le: '2026-10-31T09:00:00+01:00', paliers_envoyes: [], main_prise: false, exclu: false, carte: 'aucune', ecartee_le: null,
  stop: false, historique: { ok: true, traces: [], ignorees: [] }, messages_entrants: [], canal: 'email', destinataire: { opposition: false, consentement_sms: true },
  faits: { numero: null, objet: null, client: null, montant_ttc_centimes: null, emis_le: null }, signaux: { consulte: false, question_posee: false, expire_dans_jours: null, relances_sans_reponse: 0 }, ...o })
const devis = (c, n, numero, jours, o = {}, f = {}, s = {}) => { const depuis = new Date(Date.parse('2026-11-09T09:00:00+01:00') - jours * 86400000 - 3600000).toISOString().replace('.000Z', '+00:00')
  return base(c, n, { depuis_le: depuis, ...o, faits: { numero, objet: 'Exemple. ' + (f.objet || 'Salle de bain'), client: 'Exemple. Client ' + String(n).padStart(3, '0'), montant_ttc_centimes: f.montant ?? 150000, emis_le: depuis.slice(0, 10) },
    signaux: { consulte: false, question_posee: false, expire_dans_jours: null, relances_sans_reponse: 0, ...s } }) }
const conv = (c, n, jours, o = {}) => { const depuis = new Date(Date.parse('2026-11-09T09:00:00+01:00') - jours * 86400000 - 3600000).toISOString().replace('.000Z', '+00:00')
  return base(c, n, { objet_type: 'conversation', statut: 'repondu', depuis_le: depuis, faits: { numero: null, objet: null, client: 'Exemple. Client ' + String(n).padStart(3, '0'), montant_ttc_centimes: null, emis_le: null }, ...o }) }
export const objetsDe = (c) => [
  devis(c, 1, 'DEV-2026-0101', 9, {}, { montant: 234000 }, { consulte: true, question_posee: true }),
  devis(c, 2, 'DEV-2026-0102', 8, {}, { montant: 118000 }, { consulte: true }),
  devis(c, 3, 'DEV-2026-0103', 10, {}, { montant: 56000 }, { relances_sans_reponse: 2, expire_dans_jours: 20 }),
  devis(c, 4, 'DEV-2026-0104', 9, { statut: 'accepte' }),
  devis(c, 5, 'DEV-2026-0105', 9, { ecartee_le: '2026-11-06T10:00:00+01:00' }),
  devis(c, 6, 'DEV-2026-0106', 9, { historique: { ok: true, traces: [{ chemin: 'crm', le: '2026-11-08T10:00:00+01:00' }], ignorees: [] } }),
  devis(c, 7, 'DEV-2026-0107', 9, { messages_entrants: ['Bonjour, je vais prendre un avocat pour ce devis.'] }),
  conv(c, 8, 2), conv(c, 9, 5, { paliers_envoyes: [1] }), conv(c, 10, 2, { statut: 'en_discussion' }),
  conv(c, 11, 2, { dossier_id: id(c, 'd', 1) }),
  devis(c, 12, 'DEV-2026-0112', 3),
  devis(c, 13, 'DEV-2026-0113', 9, { carte: 'en_attente' }),
]
export const evenements = (c) => objetsDe(c).map((o, i) => ({ id: id(c, 'e', i + 1), artisan_id: COMPTE[c], type: 'relance_due', cle: `rd:${c}:${i + 1}`, donnees: o }))
export const enveloppeSuivi = (c, maintenant = MAINTENANT, cles = [], evs = evenements(c)) => ({ contrat: 'presti-dep-suivi@1', organisation_id: COMPTE[c], simulation: true, cle_idempotence: `exemple:essai:suivi:${c}`,
  trace: { execution_parent: 'presti-cerveau:2026-11-09T0900', declencheur: 'presti-cerveau', tentative: 0 }, config: configSuivi(c), donnees: { evenements: evs, maintenant, cles_existantes: cles } })

// Un export local de lib-controler-conflit (pour calculer les pins avant que n8n le rende) : même code, même graphe que le SDK.
export function specConflitLocal(c, id = 'ConflitLocal0001') {
  const n = (nom, type, v, parameters, pos, extra = {}) => ({ id: nom, name: nom, type, typeVersion: v, position: pos, parameters, ...extra })
  const IFP = (g) => ({ conditions: { options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 }, conditions: [{ id: 'x', leftValue: '={{ ' + g + ' }}', rightValue: '', operator: { type: 'boolean', operation: 'true', singleValue: true } }], combinator: 'and' }, looseTypeValidation: false, options: {} })
  const nodes = [n('Appelé par un chef', 'n8n-nodes-base.executeWorkflowTrigger', 1.3, { inputSource: 'passthrough' }, [0, 0]),
    n("Contrat d'entrée", 'n8n-nodes-base.code', 2, { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: codeEntree('lib-controler-conflit@1', SCHEMAS['lib-controler-conflit']) }, [1, 0]),
    n('Entrée conforme ?', 'n8n-nodes-base.if', 2.2, IFP('$json.conforme'), [2, 0]), n('Porte simulation', 'n8n-nodes-base.if', 2.2, IFP('$json.enveloppe.simulation'), [3, 0]),
    n('Hors simulation : non branché', 'n8n-nodes-base.stopAndError', 1, { errorType: 'errorMessage', errorMessage: 'x' }, [4, 1]),
    n('Contrôler le conflit', 'n8n-nodes-base.code', 2, { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: codeConflit(c) }, [4, 0]),
    n('Contrat de sortie', 'n8n-nodes-base.code', 2, { mode: 'runOnceForAllItems', language: 'javaScript', jsCode: codeSortie('lib-controler-conflit@1') }, [5, 0])]
  const l = (a, b, i = 0) => [a, b, i]
  const connections = {}
  for (const [a, b, i] of [l('Appelé par un chef', "Contrat d'entrée"), l("Contrat d'entrée", 'Entrée conforme ?'), l('Entrée conforme ?', 'Porte simulation'), l('Entrée conforme ?', 'Contrat de sortie', 1), l('Porte simulation', 'Contrôler le conflit'), l('Porte simulation', 'Hors simulation : non branché', 1), l('Contrôler le conflit', 'Contrat de sortie')]) {
    connections[a] = connections[a] || { main: [] }; (connections[a].main[i] = connections[a].main[i] || []).push({ node: b, type: 'main', index: 0 }) }
  return { id, name: 'lib-controler-conflit', active: false, activeVersionId: null, nodes, connections, settings: reglagesEnfant('x') }
}
// Le monde du rejeu : les lib-* de 035-003 à 035-005 (leurs exports), le contrôleur, le chef.
export async function monde(idsReels = {}) {
  const { readFileSync, readdirSync } = await import('node:fs'), path = await import('node:path')
  const racine = path.resolve(import.meta.dirname, '../../..')
  const W = {}
  for (const d of ['035-003', '035-004', '035-005']) for (const f of readdirSync(path.join(racine, '.orchestre/preuves', d)).filter((x) => x.endsWith('.workflow.json'))) { const w = JSON.parse(readFileSync(path.join(racine, '.orchestre/preuves', d, f), 'utf8')); W[w.name] = w }
  const k = lireConstantes()
  const idConflit = idsReels['lib-controler-conflit'] || 'ConflitLocal0001'
  W['lib-controler-conflit'] = specConflitLocal(k, idConflit); W['lib-controler-conflit'].settings.callerPolicy = 'workflowsFromAList'; W['lib-controler-conflit'].settings.callerIds = IDS['presti-dep-suivi']
  const ids = { ...IDS, 'lib-controler-conflit': idConflit, ...idsReels }
  const spec = specChef(ids, k)
  W['presti-dep-suivi'] = exportLocal(IDS['presti-dep-suivi'], 'presti-dep-suivi', spec, { callerPolicy: 'workflowsFromAList', callerIds: IDS['presti-cerveau'] })
  return { W, k, spec, ids }
}
// Le modèle ÉPINGLÉ (aucun appel) : la sortie que lib-rediger-message recevrait, par la clé de l'action.
export const modeleEpingle = (envs, W, executer) => (j) => {
  const f = j.enveloppe ? j.enveloppe.donnees.faits : null
  if (f && f.type_relance === 'relance_conversation') return { objet: 'Exemple. Où en est votre demande ?', texte: '{{salutation}}\n\nNous revenons vers vous au sujet de votre demande. Si vous avez une question, il vous suffit de répondre à ce message.\n\nBien cordialement,\nExemple. L’équipe Bâti-Démo', faits_cites: [], champs_inconnus: [] }
  return f ? sortieModele('x', { ...f, numero: f.numero || null, objet: f.objet || null, montant_ttc_centimes: f.montant_ttc_centimes ?? null }, f.palier) : undefined
}
