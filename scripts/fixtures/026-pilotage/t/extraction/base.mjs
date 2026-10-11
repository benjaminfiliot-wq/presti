// scripts/fixtures/026-pilotage/t/extraction/base.mjs — la base d'essai de poste-extraction-qa (fiche 026-171, partie B, écrite par
// Claude Code) : les tables et les fonctions que lisent les six routes du Poste (barre, etat, audience, securite/bans, clients,
// cerveaux) et le compte des tickets. Des lignes FICTIVES (adresses en .invalid), aucune donnée réelle.
//   baseExtraction({ pannes, surcharges }) → { rpc(nom, args), table(nom, requete) }
//   pannes : « table:<nom> » ou « rpc:<nom> » ; surcharges : { tables: { nom: lignes }, rpc: { nom: valeur } }.
// Les deux arbres jugés (la référence et l'état jugé) reçoivent EXACTEMENT ce jeu : c'est ce qui rend leur comparaison juste.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const X = path.dirname(fileURLToPath(import.meta.url))
export const lireJson = (nom) => JSON.parse(fs.readFileSync(path.join(X, nom), 'utf8'))
const BRUT = lireJson('tickets-essai.json')
// La sentinelle de t/tickets.json (l'autre partie du lot t), si elle est là : une ligne FERMÉE de plus, dont seul le contenu porte le
// piège — elle ne change pas le compte des ouverts (ferme_le nul : 0074, la table n'a pas de colonne statut) et ne doit sortir nulle part.
let SENTINELLE = null
try { const a = JSON.parse(fs.readFileSync(path.join(X, '..', 'tickets.json'), 'utf8')); if (typeof a.sentinelle === 'string' && a.sentinelle) SENTINELLE = a.sentinelle } catch { /* absent : le jeu de cette partie suffit */ }
export const TICKETS = {
  ...BRUT,
  pieges: SENTINELLE ? [...BRUT.pieges, SENTINELLE] : BRUT.pieges,
  lignes: SENTINELLE ? [...BRUT.lignes, { id: 't5', artisan_id: 'a0000000-0000-4000-8000-000000000003', sujet: `${SENTINELLE} : sujet`, corps: `${SENTINELLE} : corps`, element_titre: SENTINELLE, ouvert_le: '2026-09-10T09:00:00Z', ferme_le: '2026-09-11T09:00:00Z' }] : BRUT.lignes,
  ouverts: BRUT.lignes.filter((l) => l.ferme_le === null).length,
}
export const INSTANT = '2026-09-30T10:00:00Z'

const A = (n) => `a0000000-0000-4000-8000-00000000000${n}`
export const ARTISANS = [
  { id: A(1), nom: 'Atelier Témoin Un', email: 'un@exemple.invalid', metier: 'Plombier', plan: 'essentiel', credits: 40, credits_reset_le: '2026-10-01T00:00:00Z', stripe_customer_id: 'cus_essai1', stripe_subscription_id: 'sub_essai1', created_at: '2026-06-01T08:00:00Z', suppression_demandee_le: null, is_founder: false, est_demo: false },
  { id: A(2), nom: 'Atelier Témoin Deux', email: 'deux@exemple.invalid', metier: 'Menuisier', plan: 'studio', credits: 120, credits_reset_le: '2026-10-01T00:00:00Z', stripe_customer_id: 'cus_essai2', stripe_subscription_id: 'sub_essai2', created_at: '2026-07-15T08:00:00Z', suppression_demandee_le: null, is_founder: false, est_demo: false },
  { id: A(3), nom: 'Atelier Témoin Trois', email: 'trois@exemple.invalid', metier: 'Électricien', plan: 'gratuit', credits: 5, credits_reset_le: null, stripe_customer_id: null, stripe_subscription_id: null, created_at: '2026-09-30T06:30:00Z', suppression_demandee_le: '2026-09-29T12:00:00Z', is_founder: false, est_demo: false },
  { id: A(4), nom: 'Fondateur Témoin', email: 'fondateur@exemple.invalid', metier: 'Direction', plan: 'signature', credits: 999, credits_reset_le: null, stripe_customer_id: null, stripe_subscription_id: null, created_at: '2026-01-01T08:00:00Z', suppression_demandee_le: null, is_founder: true, est_demo: false },
  { id: A(5), nom: 'Compte Démo Témoin', email: 'demo@exemple.invalid', metier: 'Démo', plan: 'studio', credits: 10, credits_reset_le: null, stripe_customer_id: null, stripe_subscription_id: null, created_at: '2026-02-01T08:00:00Z', suppression_demandee_le: null, is_founder: false, est_demo: true },
  { id: A(6), nom: 'Compte Suite Témoin', email: 'suite@presti-test.invalid', metier: 'Test', plan: 'gratuit', credits: 3, credits_reset_le: null, stripe_customer_id: null, stripe_subscription_id: null, created_at: '2026-09-30T07:00:00Z', suppression_demandee_le: null, is_founder: false, est_demo: false },
]
const LEADS = [
  { artisan_id: A(1), created_at: '2026-09-29T10:00:00Z' }, { artisan_id: A(1), created_at: '2026-09-20T10:00:00Z' }, { artisan_id: A(2), created_at: '2026-09-25T10:00:00Z' },
]
const APPORTEURS = [
  { id: 'p0000000-0000-4000-8000-000000000001', code: 'JEAN', nom: 'Jean Apporteur Témoin', artisan_id: null, actif: true, cree_le: '2026-05-01T00:00:00Z', canal: false },
  { id: 'p0000000-0000-4000-8000-000000000002', code: 'facebook', nom: 'Facebook', artisan_id: null, actif: true, cree_le: '2026-05-02T00:00:00Z', canal: true },
]
const REGISTRE = [
  { artisan_id: A(1), statut: 'prouve', piece: 'facture-essai.pdf', motif: null, apporteur_id: APPORTEURS[0].id },
  { artisan_id: A(2), statut: 'saisi', piece: null, motif: null, apporteur_id: APPORTEURS[1].id },
]
export const PASSAGES = [
  { nom: 'relances', dernier_passage: '2026-09-30T08:00:00Z', reussi: true },
  { nom: 'canaux-relever', dernier_passage: '2026-09-27T07:00:00Z', reussi: false },
]
const BANS = [
  { ip: '203.0.113.7', raison: 'Ban manuel (direction)', auto: false, created_at: '2026-09-29T10:00:00Z', expires_le: null },
  { ip: '203.0.113.8', raison: 'Abus automatique', auto: true, created_at: '2026-09-28T10:00:00Z', expires_le: '2026-09-29T10:00:00Z' },
  { ip: '203.0.113.9', raison: 'Ban à durée', auto: false, created_at: '2026-09-30T09:00:00Z', expires_le: '2026-10-05T09:00:00Z' },
]
const ABUS = [
  { ip: '203.0.113.20', raison: 'trop de leads', at: '2026-09-30T09:30:00Z' }, { ip: '203.0.113.20', raison: 'trop de leads', at: '2026-09-30T09:31:00Z' },
  { ip: '203.0.113.21', raison: 'sondage', at: '2026-09-30T09:40:00Z' }, { ip: '203.0.113.22', raison: 'ancien', at: '2026-09-28T09:40:00Z' },
  // 04/10 (contre-vérif de 026-174) : 31 IP distinctes de plus dans les 24 h. Avec trois IP seulement, le plafond de 30 de la liste
  // `abus24h` (lib/controle/lectures/bans.ts, .slice(0, 30)) ne se voyait pas : un plafond ramené à 29 passait XT-2.
  ...Array.from({ length: 31 }, (_, i) => ({ ip: `198.51.100.${i + 1}`, raison: 'sondage de masse', at: `2026-09-30T08:${String(i).padStart(2, '0')}:00Z` })),
]
const ALERTES = [{ id: 1, acquittee_le: null }, { id: 2, acquittee_le: null }, { id: 3, acquittee_le: '2026-09-29T00:00:00Z' }]
const COURRIERS = [{ id: 1, statut: 'a_traiter' }, { id: 2, statut: 'traite' }]
const AUDIENCE_DIRECT = { vues_minute: 12, visiteurs_jour: 340, pages: [{ page: '/', vues: 200 }, { page: '/tarifs', vues: 40 }], arrivees: [{ source: 'direct', n: 100 }] }
const AUDIENCE_HISTORIQUE = { jours: 30, serie: [{ jour: '2026-09-29', vues: 900 }, { jour: '2026-09-30', vues: 340 }] }

export function baseExtraction({ pannes = [], surcharges = {} } = {}) {
  const tables = { artisans: ARTISANS, leads: LEADS, apporteurs: APPORTEURS, registre_apports: REGISTRE, passages_cron: PASSAGES, ip_bans: BANS, ip_abus: ABUS, alertes: ALERTES, courriers: COURRIERS, tickets: TICKETS.lignes, ...(surcharges.tables ?? {}) }
  const rpcs = { audience_direct: AUDIENCE_DIRECT, audience_historique: AUDIENCE_HISTORIQUE, ...(surcharges.rpc ?? {}) }
  return {
    rpc(nom) {
      if (pannes.includes(`rpc:${nom}`)) return new Error(typeof surcharges.messages?.[`rpc:${nom}`] === 'string' ? surcharges.messages[`rpc:${nom}`] : `panne d’essai : ${nom}`)
      return nom in rpcs ? rpcs[nom] : undefined
    },
    table(nom) {
      if (pannes.includes(`table:${nom}`)) return new Error(typeof surcharges.messages?.[`table:${nom}`] === 'string' ? surcharges.messages[`table:${nom}`] : `panne d’essai : ${nom}`)
      return tables[nom] ?? []
    },
  }
}
