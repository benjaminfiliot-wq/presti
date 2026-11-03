// 036-036 — juge hors ligne : faits, relevé, branchements et cartes de l'ombre.
// Aucun compte, réseau, modèle, sous-processus ou écriture en production.
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const R = path.resolve(import.meta.dirname, '..')
const lire = (p) => fs.readFileSync(path.join(R, p), 'utf8')
const P = '.orchestre/preuves/036-036/noeuds/'
const sources = {
  ecrivain: lire('lib/evenements/ecrivain.ts'),
  devis: lire('app/api/devis/route.ts'),
  cron: lire('app/api/cron/relances/route.ts'),
  releve: lire('lib/evenements/departements.ts'),
  feries: lire('lib/evenements/joursFeries.ts'),
  aiguiller: lire(P + 'aiguiller.js'),
  lectures: lire(P + 'preparer-lectures.js'),
  cartes: lire(P + 'cartes.js'),
  lanceur: lire('scripts/tout-verifier.mjs'),
}
const A = '00000000-0000-4000-8000-0000000000a1'
const ids = Object.fromEntries(['lead', 'devis', 'facture', 'chantier', 'materiau', 'evenement'].map((k, i) => [k, `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`]))
const TYPES = { devis_a_preparer: 'devis', relance_due: 'suivi', impaye_echu: 'facturation', chantier_termine: 'apres', stock_sous_le_seuil: 'operations', page_du_matin: 'direction' }
const TMP = fs.mkdtempSync(path.join(R, '.orchestre/preuves/036-036/.qa-'))
const D = await import(pathToFileURL(path.join(R, 'lib/evenements/departements.ts')).href)
const F = await import(pathToFileURL(path.join(R, 'lib/evenements/joursFeries.ts')).href)
let n = 0
async function chargerEcrivain(texte) {
  const fichier = path.join(TMP, `ecrivain-${++n}.ts`)
  fs.writeFileSync(fichier, texte)
  return import(pathToFileURL(fichier).href)
}
function blocDrapeau(texte, appel) {
  const i = texte.indexOf(appel)
  if (i < 0) return ''
  const debut = texte.lastIndexOf("if (actif('systemeAgents')) {", i)
  if (debut < 0) return ''
  const fin = texte.indexOf('\n    }', i)
  return fin < 0 ? '' : texte.slice(debut, fin)
}
function executer(code, sorties) {
  const $ = (nom) => ({ isExecuted: Object.hasOwn(sorties, nom), all: (branche = 0) => (sorties[nom]?.[branche] || []).map((json) => ({ json })), first: () => ({ json: sorties[nom]?.[0]?.[0] }) })
  return new Function('$', code)($).map((x) => x.json)
}
async function juger(S) {
  const fautes = []
  const exiger = (v, raison) => { if (!v) fautes.push(raison) }
  let E
  try { E = await chargerEcrivain(S.ecrivain) } catch (e) { return ['écrivain illisible : ' + e.message] }
  const tests = [
    E.evenementDevisAPreparer({ artisanId: A, devisId: ids.devis, lignes: 2 }),
    E.evenementRelanceDue({ artisanId: A, leadId: ids.lead, rang: 1, canal: 'email', registreLu: true, pauseGenerale: false }),
    E.evenementImpayeEchu({ artisanId: A, factureId: ids.facture, dateEcheance: '2026-10-28', montantTtcCentimes: 12000, maintenant: new Date('2026-11-03T08:00:00Z'), contestation: false }),
    E.evenementChantierTermine({ artisanId: A, chantierId: ids.chantier, dateFinReelle: '2026-11-01', opposition: false, litige: false }),
    E.evenementStockSousLeSeuil({ artisanId: A, materiauId: ids.materiau, quantite: 2, seuil: 3, jour: '2026-11-03' }),
    E.evenementPageDuMatin({ artisanId: A, jour: '2026-11-03' }),
  ]
  exiger(tests.every((e, i) => e && e.type === Object.keys(TYPES)[i] && e.artisan_id === A), 'six faits typés absents')
  exiger(tests.every((e) => e && Object.values(e.faits).every((v) => v === null || typeof v !== 'string' || /^([a-z][a-z0-9_:.-]{0,63}|[0-9a-f-]{36}|\d{4}-\d{2}-\d{2}.*)$/.test(v))), 'texte libre dans les faits')
  const injection = E.evenementRelanceDue({ artisanId: A, leadId: ids.lead, rang: 1, echeance: 'Appelez moi au 0600000000' })
  exiger(injection && !Object.values(injection.faits).includes('Appelez moi au 0600000000'), 'texte libre non retiré')
  const appels = [], vus = new Set()
  const client = { from: (table) => ({ upsert: async (lignes, options) => { appels.push({ table, options }); for (const e of [lignes].flat()) vus.add(e.artisan_id + ':' + e.cle); return { error: null } } }) }
  const e1 = await E.ecrireEvenement(client, tests[0])
  const e2 = await E.ecrireEvenement(client, tests[0])
  const lot = await E.ecrireEvenements(client, [tests[0], tests[0], ...tests.slice(1)])
  exiger(e1.ok && e2.ok && lot.ok && lot.nombre === 6 && vus.size === 6 && appels.every((x) => x.table === 'evenements_metier' && x.options.onConflict === 'artisan_id,cle' && x.options.ignoreDuplicates === true), 'doublon non empêché')
  const nombreuses = Array.from({ length: 501 }, (_, i) => E.construireEvenement({ artisanId: A, type: 'page_du_matin', objetType: null, objetId: null, cle: 'page_du_matin:2026-11-03:' + i }))
  const lotsVus = []
  const gros = await E.ecrireEvenements({ from: () => ({ upsert: async (l) => { lotsVus.push(l.length); return { error: null } } }) }, nombreuses)
  exiger(gros.ok && gros.nombre === 501 && lotsVus.length === 2 && lotsVus.reduce((a, b) => a + b, 0) === 501, 'les événements au-delà de 500 sont perdus')
  const panne = await E.ecrireEvenement({ from: () => ({ upsert: () => { throw Error('panne') } }) }, tests[0], 10)
  const lente = await E.ecrireEvenement({ from: () => ({ upsert: () => new Promise(() => {}) }) }, tests[0], 10)
  exiger(!panne.ok && !lente.ok, 'écrivain bloquant ou exception')

  const bd = blocDrapeau(S.devis, 'ecrireEvenement(supabaseAdmin, evenementDevisAPreparer(')
  const bc = blocDrapeau(S.cron, 'evenementsRelance.push(ecrireEvenement(')
  exiger(bd && bc && !/\b(return|throw)\b/.test(bd + bc), 'événement hors drapeau ou route bloquante')
  exiger(S.devis.indexOf('ecrireEvenement(supabaseAdmin, evenementDevisAPreparer(') > S.devis.indexOf("from('devis_lignes').insert(") && S.cron.indexOf('evenementsRelance.push(ecrireEvenement(') > S.cron.indexOf(".eq('envoyee', false).select('id')"), 'événement rangé avant la prise réussie')
  exiger(S.cron.includes('releverEvenementsDuMatin(supabaseAdmin') && S.cron.includes("if (actif('systemeAgents'))"), 'relevé des quatre départements non branché')
  exiger(S.cron.includes("jourFerie.etat === 'ouvre'") && S.feries.includes('calendrier.api.gouv.fr/jours-feries/metropole.json') && !S.feries.includes('ANTHROPIC_API_KEY'), 'jours fériés publics non branchés')
  let appelPublic = null
  const lectureFerie = async (url, options) => { appelPublic = { url, options }; return { ok: true, json: async () => ({ '2026-01-01': '1er janvier', '2026-11-03': 'Jour fictif' }) } }
  const ferie = await F.jourFerieMetropole('2026-11-03', lectureFerie)
  const ouvre = await F.jourFerieMetropole('2026-11-04', lectureFerie)
  const inconnu = await F.jourFerieMetropole('2026-11-04', async () => { throw Error('hors ligne') })
  exiger(ferie.etat === 'ferie' && ouvre.etat === 'ouvre' && inconnu.etat === 'inconnu' && appelPublic.url === F.SOURCE_JOURS_FERIES && !appelPublic.options.body && !appelPublic.options.headers.authorization, 'API publique : date, panne ou fuite de données')
  exiger(S.releve.includes(".eq('en_marche', true)") && S.releve.includes("['simulation', 'ombre']") && S.releve.includes('ecrireEvenements(client, evs'), 'relevé hors interrupteur ou non idempotent')
  exiger(S.releve.includes('MAX_COMPTES = 200') && S.releve.includes('MAX_LIGNES = 2000') && S.releve.includes('Promise.race'), 'lectures non bornées')
  // Rejeu du relevé avec quatre tables fictives : les lectures sont réellement exécutées,
  // et deux passages du même jour gardent les quatre mêmes clés.
  const tables = {
    departements_reglages: [{ artisan_id: A, departement: 'tous', en_marche: true, palier: 'ombre' }],
    factures: [{ id: ids.facture, artisan_id: A, statut: 'emise', avoir_de: null, date_echeance: '2026-10-28', total_ttc: '120.00' }],
    chantiers: [{ id: ids.chantier, artisan_id: A, statut: 'termine', date_fin_reelle: '2026-11-01', devis_id: null }],
    materiaux: [{ id: ids.materiau, artisan_id: A, seuil_alerte: 3, stock: [{ quantite: 2 }] }],
  }
  const faitsReleves = new Set()
  const releverClient = { from: (table) => {
    const filtres = []
    const q = {
      select: () => q, limit: () => q,
      eq: (col, val) => { filtres.push((r) => r[col] === val); return q },
      in: (col, vals) => { filtres.push((r) => vals.includes(r[col])); return q },
      is: (col, val) => { filtres.push((r) => r[col] === val); return q },
      gt: (col, val) => { filtres.push((r) => r[col] > val); return q },
      lt: (col, val) => { filtres.push((r) => r[col] < val); return q },
      gte: (col, val) => { filtres.push((r) => r[col] >= val); return q },
      lte: (col, val) => { filtres.push((r) => r[col] <= val); return q },
      then: (resolve) => Promise.resolve({ data: (tables[table] || []).filter((r) => filtres.every((f) => f(r))), error: null }).then(resolve),
      upsert: async (lignes) => { for (const e of [lignes].flat()) faitsReleves.add(e.artisan_id + ':' + e.cle); return { error: null } },
    }
    return q
  } }
  const matin1 = await D.releverEvenementsDuMatin(releverClient, new Date('2026-11-03T08:00:00Z'))
  const matin2 = await D.releverEvenementsDuMatin(releverClient, new Date('2026-11-03T08:00:00Z'))
  exiger(matin1.ok && matin2.ok && Object.values(matin1.evenements).every((n) => n === 1) && faitsReleves.size === 4, 'relevé réel du matin ou rejeu incorrect')

  const match = S.aiguiller.match(/const ROUTES = (\{[^;]+\});/)
  let routes = null
  try { routes = JSON.parse(match?.[1] || '') } catch { /* faute ci-dessous */ }
  exiger(routes && Object.entries(TYPES).every(([type, dep]) => routes[type] === dep), 'département non aiguillé')
  exiger(S.aiguiller.includes("const SERVIS = ['simulation', 'ombre']") && S.aiguiller.includes('simulation: true'), 'palier réel ou porte simulation ouverte')
  exiger(S.lectures.includes("artisan_id: dans(") && S.lectures.includes("select:") && !S.lectures.includes('client_email') && !S.lectures.includes('nom_prospect'), 'lecture n8n non bornée ou données de contact')
  const routesIds = {}, sorties = { Aiguiller: [[{ contrat: 'aucun', routes_ids: routesIds }]] }
  for (const [type, dep] of Object.entries(TYPES)) {
    const objet = type === 'page_du_matin' ? null : ids[type === 'relance_due' ? 'lead' : type === 'impaye_echu' ? 'facture' : type === 'stock_sous_le_seuil' ? 'materiau' : type === 'chantier_termine' ? 'chantier' : 'devis']
    routesIds[A + '|' + dep] = { artisan_id: A, departement: dep, palier: 'ombre', ids: [ids.evenement], objets: [{ id: ids.evenement, type, objet_id: objet }] }
    const cle = dep === 'direction' ? 'point_du_matin:2026-11-03' : 'carte:' + dep + ':' + ids.evenement
    const effet = dep === 'direction' ? { effet: 'deposer_page', organisation_id: A, cle }
      : dep === 'apres' ? { effet: 'preparer_carte_lot', organisation_id: A, cle, type_action: 'demande_avis_lot', objet_id: objet }
        : dep === 'operations' ? { effet: 'preparer_carte', organisation_id: A, cle, type_action: 'commande_fournisseur', objet_id: objet }
          : { effet: 'ecrire_carte', corps: { organisation_id: A, cle, type_action: dep === 'suivi' ? 'relance_prospect' : dep === 'facturation' ? 'relance_impaye' : 'devis_pret', objet_id: objet } }
    sorties['Appeler presti-dep-' + dep] = [[{ contrat: 'presti-dep-' + dep + '@1', cle_idempotence: 'dep:' + dep + ':' + A.slice(24) + ':essai', effets_prevus: [effet] }], []]
  }
  let cartes = []
  try { cartes = executer(S.cartes, sorties)[0]?.lignes || [] } catch (e) { fautes.push('cartes illisibles : ' + e.message) }
  exiger(cartes.length === 6 && cartes.every((c) => c.artisan_id === A && c.mode === 'confirmation' && c.origine === 'agent' && c.sources?.some((s) => s.fait === 'evenement') && c.sources?.some((s) => s.fait === 'objet') && c.sources?.some((s) => s.fait === 'palier')), 'carte manquante ou sans source')
  exiger(S.lanceur.includes("args: ['scripts/evenements-departements-qa.mjs']"), 'suite absente de tout-verifier')
  return fautes
}

const fautes = await juger(sources)
const mutants = {
  sans_drapeau: { devis: sources.devis.replace("if (actif('systemeAgents')) {", 'if (true) {') },
  double_ecriture: { ecrivain: sources.ecrivain.replaceAll('ignoreDuplicates: true', 'ignoreDuplicates: false') },
  texte_libre: { ecrivain: sources.ecrivain.replace('faits: faitsSansTexte(e.faits ?? {})', 'faits: e.faits ?? {}') },
  route_bloquante: { devis: sources.devis.replace("if (!ev.ok) console.warn('[devis] événement devis_a_preparer non rangé :', ev.raison)", "if (!ev.ok) throw new Error('événement')") },
  cron_bloquant: { cron: sources.cron.replace("if (actif('systemeAgents')) {", "if (actif('systemeAgents')) { throw new Error('événement')") },
  sans_aiguillage: { aiguiller: sources.aiguiller.replace('"stock_sous_le_seuil":"operations"', '"stock_sous_le_seuil":"inconnu"') },
  carte_sans_source: { cartes: sources.cartes.replace('sources: sources, cle: k.cle', 'sources: [], cle: k.cle') },
}
for (const [nom, mutation] of Object.entries(mutants)) {
  const rouges = await juger({ ...sources, ...mutation })
  if (!rouges.length) fautes.push('mutant non vu : ' + nom)
}
fs.rmSync(TMP, { recursive: true, force: true })
if (fautes.length) { for (const f of fautes) console.error('ROUGE : ' + f); process.exitCode = 1 }
else console.log('VERT : six événements, drapeau, idempotence, panne, six routes, six cartes sourcées, API publique ; 7/7 mutants vus (hors ligne)')
