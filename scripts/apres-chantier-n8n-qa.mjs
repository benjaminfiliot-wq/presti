// Juge HORS LIGNE du workflow n8n `presti-apres-chantier` (chantier 4, lot L18 ; tâche 032-031) — pas 1 à 3 de la règle de remplacement
// (.claude/rules/migration-production.md) : le workflow refait-il ce que fait tourApresChantier (lib/apresChantierTour.ts, appelé par
// app/api/cron/relances/route.ts) ?
//
// Il relit l'export du workflow (.orchestre/preuves/032-031/presti-apres-chantier.workflow.json, tiré du n8n d'Oracle par le MCP), le
// brief (plans/011-cadrage-01-11/briefs/c4-n8n-apres-chantier.md) et l'essai n8n (.orchestre/preuves/032-031/essai-n8n.json), et :
//   1. STRUCTURE : inactif, sans version publiée ; fuseau Europe/Paris ; déclencheur à 8 h ; nœuds attendus, aux types attendus ; chaque
//      lecture HTTP en GET, sans corps, à l'adresse et aux paramètres EXACTS du brief ; colonnes lues dans les droits du rôle n8n_lecture
//      (supabase/migrations/0189_role_lecture_n8n.sql) ou dans les objets proposés par le brief ; chaîne des connexions exacte ; aucun
//      nœud d'écriture ni d'envoi ; la branche d'erreur reliée ; garde commune scripts/n8n-specs-qa.mjs verte sur l'export ;
//   2. COPIE FIGÉE : les constantes du nœud « Contexte du passage » égales à celles du code (lib/apresChantier.ts, lib/apresChantierTour.ts,
//      lib/plans.ts par `peut`, lib/flags.ts) ;
//   3. COMPARAISON, cas par cas : les mêmes données fictives données à tourApresChantier (doublure de base qui rejoue les requêtes de la
//      route) et aux nœuds Code de l'export (rejoués dans un contexte vm, sur les lectures qu'auraient rendues les requêtes du workflow) ;
//      les rappels obtenus doivent être identiques à ceux de l'ancien code, aux ÉCARTS ÉCRITS près (É1 texte sans nom, É2 opposition,
//      É4 signal absent ; brief, « Comparaison ») : chaque écart est rejoué par l'ancien code lui-même sur les données ajustées, puis
//      chaque ligne qui diffère doit relever d'un écart écrit — sinon rouge. Chaque cas porte aussi ses clés attendues, écrites ici ;
//   4. ESSAI : la pin data de l'essai n8n, rejouée hors ligne, rend exactement la sortie de n8n, et l'essai couvre les sept cas demandés ;
//   5. MUTANTS (opposition ignorée, clé changée, fuseau changé, et d'autres) : chacun doit faire rougir le juge.
//
// Aucun réseau, aucune base, aucun modèle, aucune écriture. Lancement :
//   node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/apres-chantier-n8n-qa.mjs
//   … scripts/apres-chantier-n8n-qa.mjs --pin=AAAA-MM-JJ   (imprime la pin data de l'essai pour ce jour, sans rien juger)
import { readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import vm from 'node:vm'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { tourApresChantier, MAX_POSES_PAR_PASSAGE } from '../lib/apresChantierTour.ts'
import { DELAI_AVIS_JOURS, RATTRAPAGE_JOURS, PREAVIS_JOURS, ENTRETIEN_ANS_MAX, EQUIPEMENTS, equipementDe, ajouterMois } from '../lib/apresChantier.ts'
import { ajouterJours } from '../lib/crm/rappels.ts'
import { peut } from '../lib/plans.ts'
import { FLAGS } from '../lib/flags.ts'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const CHEMINS = {
  export: '.orchestre/preuves/032-031/presti-apres-chantier.workflow.json',
  brief: 'plans/011-cadrage-01-11/briefs/c4-n8n-apres-chantier.md',
  essai: '.orchestre/preuves/032-031/essai-n8n.json',
  droits: 'supabase/migrations/0189_role_lecture_n8n.sql',
}
const lireTexte = (c) => readFileSync(path.join(RACINE, c), 'utf8')
const copie = (o) => JSON.parse(JSON.stringify(o))
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// ─── Ce que le workflow doit être (le brief le recopie) ───────────────────────────────────────────────────────────────────────
const HOTE = 'https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/'
const IDS = (champ) => `={{ 'in.(' + ($('Lire reglages').all().map(i => i.json.${champ}).filter(Boolean).join(',') || '00000000-0000-0000-0000-000000000000') + ')' }}`
const PAGE = [['order', 'id'], ['limit', '1000']]
const LECTURES = [
  { nom: 'Lire pause generale', chemin: 'rpc/n8n_pause_generale', objet: 'n8n_pause_generale', propose: true, pages: false, params: [['select', 'pause_generale']] },
  { nom: 'Lire reglages', chemin: 'crm_apres_chantier', objet: 'crm_apres_chantier', params: [['select', 'artisan_id,avis,entretien,actif_depuis'], ['or', '(avis.eq.true,entretien.eq.true)'], ['order', 'artisan_id'], ['limit', '1000']] },
  { nom: 'Lire comptes', chemin: 'artisans', objet: 'artisans', params: [['select', 'id,plan,is_founder'], ['id', IDS('artisan_id')], ...PAGE] },
  { nom: 'Lire chantiers', chemin: 'chantiers', objet: 'chantiers', params: [['select', 'id,artisan_id,statut,date_fin_reelle'], ['artisan_id', IDS('artisan_id')], ['statut', 'eq.termine'],
    ['date_fin_reelle', "={{ 'gte.' + $('Contexte du passage').first().json.depuis }}"], ...PAGE] },
  { nom: 'Lire signaux', chemin: 'apres_chantier_signaux', objet: 'apres_chantier_signaux', propose: true, params: [['select', 'artisan_id,chantier_id,equipement,oppose'], ['artisan_id', IDS('artisan_id')], ['order', 'chantier_id'], ['limit', '1000']] },
  { nom: 'Lire cles', chemin: 'crm_rappels', objet: 'crm_rappels', params: [['select', 'id,artisan_id,cle'], ['artisan_id', IDS('artisan_id')], ['or', '(cle.like.avis:*,cle.like.entretien:*)'], ...PAGE] },
]
const CHAINE = ['Déclencheur 8 h', 'Contexte du passage', ...LECTURES.map((l) => l.nom), 'Rappels a poser', 'Poser les rappels (simulation)']
const TYPES = { 'Déclencheur 8 h': 'n8n-nodes-base.scheduleTrigger', 'Contexte du passage': 'n8n-nodes-base.code', 'Rappels a poser': 'n8n-nodes-base.code',
  'Poser les rappels (simulation)': 'n8n-nodes-base.code', 'Échec du passage': 'n8n-nodes-base.errorTrigger', 'Message d echec': 'n8n-nodes-base.code',
  ...Object.fromEntries(LECTURES.map((l) => [l.nom, 'n8n-nodes-base.httpRequest'])) }
// L'équipement, tel que la vue proposée le rend (code court) ; le nom et la périodicité restent ceux de lib/apresChantier.ts:95-99.
const CODE_EQUIPEMENT = { 'chaudière': 'chaudiere', 'pompe à chaleur': 'pompe_a_chaleur', 'conduit de fumée': 'conduit_de_fumee' }
// Même formule que lib/crm/apresOpposition.ts:6 (empreinteAdresse ; ce module lit la base à l'import, d'où la copie, contrôlée plus bas).
const empreinte = (email) => createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 32)

// ─── Les droits du rôle de lecture de n8n (0189), par table ───────────────────────────────────────────────────────────────────
function droits0189() {
  const t = lireTexte(CHEMINS.droits), d = {}
  for (const m of t.matchAll(/grant select \(([^)]*)\) on public\.(\w+) to n8n_lecture/g)) d[m[2]] = new Set(m[1].split(',').map((c) => c.trim()))
  return d
}
const DROITS = droits0189()

// ─── Rejouer un nœud Code (contexte vm neuf : aucun objet de l'hôte hormis $, $input, $now) ─────────────────────────────────────
const jourDans = (instant, zone) => {
  const p = {}
  for (const x of new Intl.DateTimeFormat('en-GB', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(instant))) p[x.type] = x.value
  return `${p.year}-${p.month}-${p.day}`
}
function executer(jsCode, { instant, sorties = {}, entree = [{}] }) {
  const enItems = (l) => l.map((j) => ({ json: copie(j) }))
  const $ = (nom) => { if (!(nom in sorties)) throw new Error(`nœud inconnu ou pas encore exécuté : ${nom}`); const it = enItems(sorties[nom]); return { all: () => it, first: () => it[0] } }
  const ent = enItems(entree)
  const $input = { all: () => ent, first: () => ent[0] }
  const $now = { setZone: (z) => ({ toISODate: () => jourDans(instant, z) }) }
  const ctx = vm.createContext({ $, $input, $now }, { codeGeneration: { strings: false, wasm: false } })
  const r = vm.runInContext('(function () {\n' + jsCode + '\n})()', ctx, { timeout: 5000, filename: 'noeud-code.js' })
  if (!Array.isArray(r)) throw new Error("le code doit rendre une liste d'éléments")
  return JSON.parse(JSON.stringify(r)).map((i) => i.json)
}
const noeud = (wf, nom) => wf.nodes.find((n) => n.name === nom)
const codeDe = (wf, nom) => { const n = noeud(wf, nom); if (!n || typeof n.parameters?.jsCode !== 'string') throw new Error(`nœud Code absent : ${nom}`); return n.parameters.jsCode }

// ─── Les données fictives : un monde de base, et ce que chaque côté en lit ──────────────────────────────────────────────────────
// Monde : { pause, reglages, artisans, chantiers (avec titre, client_nom, devis_id), devis (objet, client_email), lignes, rappels, oppositions,
//           sansSignal (ids de chantiers absents de la vue) }. Identifiants fictifs, adresses en .invalid.
const ordre = (k) => (a, b) => (a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0)
const parId = ordre('id')
function textesDe(monde, c) {
  if (!c.devis_id) return []
  const d = monde.devis.find((x) => x.id === c.devis_id && x.artisan_id === c.artisan_id)
  if (!d) return []
  return [String(d.objet ?? ''), ...monde.lignes.filter((l) => l.devis_id === d.id).map((l) => String(l.designation ?? '').slice(0, 200))]
}
// L'ancien code, avec la doublure de base qui rejoue les requêtes de app/api/cron/relances/route.ts (lireReglages … poser).
async function ancien(monde, jour) {
  if (monde.pause !== false) return { lignes: [], bilan: 'fermé (pause générale)' } // route.ts : `!enPause && !interrompue`
  const poses = []
  const r = await tourApresChantier(jour, {
    lireReglages: async () => ({ data: copie(monde.reglages.filter((x) => x.avis === true || x.entretien === true)).sort(ordre('artisan_id')), error: null }),
    lirePlans: async (ids) => ({ data: monde.artisans.filter((a) => ids.includes(a.id)).map((a) => ({ id: a.id, plan: a.plan, is_founder: a.is_founder })), error: null }),
    lireChantiers: async (id, depuis) => ({ data: monde.chantiers.filter((c) => c.artisan_id === id && c.statut === 'termine' && c.date_fin_reelle && c.date_fin_reelle >= depuis).sort(parId)
      .map((c) => ({ id: c.id, titre: c.titre, statut: c.statut, date_fin_reelle: c.date_fin_reelle, client_nom: c.client_nom, textes: textesDe(monde, c) })), error: null }),
    lireCles: async (id) => ({ data: monde.rappels.filter((x) => x.artisan_id === id && (x.cle.startsWith('avis:') || x.cle.startsWith('entretien:'))).map((x) => x.cle), error: null }),
    poser: async (id, lignes) => { for (const p of lignes) poses.push({ artisan_id: id, chantier_id: p.chantier_id, type: p.type, echeance: p.echeance, origine: 'systeme', cle: p.cle, texte: p.texte }); return { error: null } },
  })
  return { lignes: poses, bilan: r }
}
// Ce que les requêtes du workflow rendraient sur le même monde (une table vide : un élément vide, comme alwaysOutputData dans n8n).
function lecturesN8n(monde, depuis) {
  const vide = (l) => (l.length ? l : [{}])
  const reg = monde.reglages.filter((x) => x.avis === true || x.entretien === true).sort(ordre('artisan_id'))
  const ids = new Set(reg.map((x) => x.artisan_id))
  const signal = (c) => {
    const eq = equipementDe([c.titre, ...textesDe(monde, c)])
    const d = c.devis_id ? monde.devis.find((x) => x.id === c.devis_id && x.artisan_id === c.artisan_id) : null
    const oppose = !!(d && typeof d.client_email === 'string' && d.client_email.trim() && monde.oppositions.some((o) => o.artisan_id === c.artisan_id && o.empreinte === empreinte(d.client_email)))
    return { artisan_id: c.artisan_id, chantier_id: c.id, equipement: eq ? CODE_EQUIPEMENT[eq.nom] : null, oppose }
  }
  return {
    'Lire pause generale': monde.pause === true || monde.pause === false ? [{ pause_generale: monde.pause }] : [{}],
    'Lire reglages': vide(reg.map((x) => ({ artisan_id: x.artisan_id, avis: x.avis, entretien: x.entretien, actif_depuis: x.actif_depuis }))),
    'Lire comptes': vide(monde.artisans.filter((a) => ids.has(a.id)).sort(parId).map((a) => ({ id: a.id, plan: a.plan, is_founder: a.is_founder }))),
    'Lire chantiers': vide(monde.chantiers.filter((c) => ids.has(c.artisan_id) && c.statut === 'termine' && c.date_fin_reelle && c.date_fin_reelle >= depuis).sort(parId)
      .map((c) => ({ id: c.id, artisan_id: c.artisan_id, statut: c.statut, date_fin_reelle: c.date_fin_reelle }))),
    'Lire signaux': vide([...(monde.signauxEnPlus ?? []), ...monde.chantiers.filter((c) => ids.has(c.artisan_id) && c.statut === 'termine' && !(monde.sansSignal ?? []).includes(c.id)).sort(ordre('id')).map(signal)]),
    'Lire cles': vide(monde.rappels.filter((x) => ids.has(x.artisan_id) && (x.cle.startsWith('avis:') || x.cle.startsWith('entretien:'))).map((x) => ({ id: x.id, artisan_id: x.artisan_id, cle: x.cle }))),
  }
}
function passageN8n(wf, monde, instant, lectures) {
  const ctx = executer(codeDe(wf, 'Contexte du passage'), { instant })
  const sorties = { 'Contexte du passage': ctx, ...(lectures ?? lecturesN8n(monde, ctx[0].depuis)) }
  const brut = executer(codeDe(wf, 'Rappels a poser'), { instant, sorties })
  const sortie = executer(codeDe(wf, 'Poser les rappels (simulation)'), { instant, sorties: { ...sorties, 'Rappels a poser': brut }, entree: brut })
  if (sortie.length !== 1) throw new Error('la simulation doit rendre un seul élément')
  return { contexte: ctx[0], sortie: sortie[0] }
}

// ─── Les cas ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const A = (n) => `00000000-0000-4000-a000-${String(n).padStart(12, '0')}` // comptes fictifs
const C = (n) => `00000000-0000-4000-c000-${String(n).padStart(12, '0')}` // chantiers fictifs
const D = (n) => `00000000-0000-4000-d000-${String(n).padStart(12, '0')}` // devis fictifs
const vide = () => ({ pause: false, reglages: [], artisans: [], chantiers: [], devis: [], lignes: [], rappels: [], oppositions: [], sansSignal: [] })
const reglage = (a, avis, entretien, actif_depuis) => ({ artisan_id: a, avis, entretien, texte_avis: null, texte_entretien: null, actif_depuis })
const compte = (a, plan, is_founder = false, extra = {}) => ({ id: a, plan, is_founder, est_demo: false, leads_pause: false, ...extra })
const chantier = (c, a, fin, titre, client_nom = 'Client Fictif', statut = 'termine', devis_id = null) => ({ id: c, artisan_id: a, titre, statut, date_fin_reelle: fin, client_nom, devis_id })
// Un monde par cas, construit autour du jour du passage (j) : les dates restent valables quel que soit le jour de l'essai.
function mondeEssai(j) {
  const m = vide(), J = (n) => ajouterJours(j, n), Mo = (n) => ajouterMois(j, n)
  // Signature, avis et entretien cochés le mois dernier.
  m.reglages.push(reglage(A(1), true, true, J(-30) + 'T09:00:00+00:00')); m.artisans.push(compte(A(1), 'signature'))
  m.chantiers.push(chantier(C(1), A(1), J(-1), 'Remplacement chaudière gaz'))                    // terminé hier : avis + entretien
  m.chantiers.push(chantier(C(2), A(1), Mo(-6), 'Pose pompe à chaleur air-eau', null))           // il y a 6 mois : entretien seul (avis hors rattrapage)
  m.chantiers.push(chantier(C(3), A(1), J(-5), 'Salle de bain', 'Client Oppose', 'termine', D(3)))  // avec opposition (0171)
  m.devis.push({ id: D(3), artisan_id: A(1), objet: 'Ramonage et tubage du poêle', client_email: 'oppose@exemple.invalid' })
  m.oppositions.push({ artisan_id: A(1), empreinte: empreinte('Oppose@Exemple.invalid ') })
  m.chantiers.push(chantier(C(4), A(1), J(-4), 'Entretien chaudière fioul'))                     // déjà rappelé
  m.rappels.push({ id: 'r4a', artisan_id: A(1), cle: `avis:${C(4)}` }, { id: 'r4b', artisan_id: A(1), cle: `entretien:${C(4)}:1` })
  // Compte en pause (ses demandes entrantes) : l'après-chantier ne lit pas cet état, ni avant ni après (même résultat).
  m.reglages.push(reglage(A(2), true, false, null)); m.artisans.push(compte(A(2), 'signature', false, { leads_pause: true }))
  m.chantiers.push(chantier(C(5), A(2), J(-2), 'Peinture du séjour'))
  // Offre Studio : le CRM est réservé à Signature (question 7) : rien.
  m.reglages.push(reglage(A(3), true, true, null)); m.artisans.push(compte(A(3), 'studio'))
  m.chantiers.push(chantier(C(6), A(3), J(-1), 'Chaudière à condensation'))
  return m
}
const cles = (l) => l.map((x) => x.cle).sort()
function cas(j) {
  const J = (n) => ajouterJours(j, n), Mo = (n) => ajouterMois(j, n)
  const l = []
  const ajouter = (nom, monde, attendu) => l.push({ nom, monde, attendu })
  const ess = mondeEssai(j)
  ajouter('essai (les sept cas demandés)', ess, [`avis:${C(1)}`, `entretien:${C(1)}:1`, `entretien:${C(2)}:1`, `avis:${C(5)}`])
  { const m = vide(); m.reglages.push(reglage(A(1), true, true, null)); m.artisans.push(compte(A(1), 'signature')); m.chantiers.push(chantier(C(1), A(1), J(-1), 'Chaudière'))
    ajouter('terminé hier, avis le surlendemain, entretien dans un an moins 15 jours', m, [`avis:${C(1)}`, `entretien:${C(1)}:1`]) }
  { const m = vide(); m.reglages.push(reglage(A(1), true, true, J(-3))); m.artisans.push(compte(A(1), 'signature'))
    m.chantiers.push(chantier(C(1), A(1), Mo(-6), 'Salle de bain neuve'), chantier(C(2), A(1), Mo(-6), 'Pose PAC'), chantier(C(3), A(1), J(-18), 'Carrelage'), chantier(C(4), A(1), J(-17), 'Carrelage'))
    ajouter('il y a 6 mois : pas d’avis (rattrapage de 14 jours), entretien de la PAC ; rattrapage à la limite (17 jours avant, activé il y a 3 jours)', m, [`entretien:${C(2)}:1`, `avis:${C(4)}`]) }
  { const m = vide(); m.reglages.push(reglage(A(1), true, true, null)); m.artisans.push(compte(A(1), 'signature'))
    m.chantiers.push(chantier(C(1), A(1), J(-3), 'Insert de cheminée', 'Mme Opposée', 'termine', D(1)))
    m.devis.push({ id: D(1), artisan_id: A(1), objet: 'Insert', client_email: 'refus@exemple.invalid' }); m.oppositions.push({ artisan_id: A(1), empreinte: empreinte('refus@exemple.invalid') })
    ajouter('avec opposition : l’ancien code pose, n8n non (É2)', m, []) }
  { const m = vide(); m.reglages.push(reglage(A(1), true, true, null)); m.artisans.push(compte(A(1), 'signature'))
    m.chantiers.push(chantier(C(1), A(1), J(-3), 'Chaudière', 'Mme Opposée', 'termine', D(1))); m.devis.push({ id: D(1), artisan_id: A(1), objet: 'Chaudière', client_email: 'refus@exemple.invalid' })
    m.oppositions.push({ artisan_id: A(1), empreinte: empreinte('refus@exemple.invalid') }); m.rappels.push({ id: 'r1', artisan_id: A(1), cle: `avis:${C(1)}` })
    ajouter('opposition posée depuis la demande d’avis (la route a retiré l’entretien) : l’ancien code le repose, n8n non (É2)', m, []) }
  { const m = vide(); m.reglages.push(reglage(A(1), true, true, null)); m.artisans.push(compte(A(1), 'signature'))
    m.chantiers.push(chantier(C(1), A(1), J(-2), 'Chaudière'), chantier(C(2), A(1), Mo(-24) , 'Chaudière murale'), chantier(C(3), A(1), J(-2), 'Chaudière'))
    m.rappels.push({ id: 'r1', artisan_id: A(1), cle: `avis:${C(1)}` }, { id: 'r2', artisan_id: A(1), cle: `entretien:${C(1)}:1` }, { id: 'r3', artisan_id: A(1), cle: `entretien:${C(2)}:3` })
    ajouter('déjà rappelé (clés existantes, et une clé d’entretien plus loin que le rang dû)', m, [`avis:${C(3)}`, `entretien:${C(3)}:1`]) }
  { const m = mondeEssai(j); m.pause = true; ajouter('pause générale active : rien des deux côtés', m, []) }
  { const m = mondeEssai(j); m.pause = null; ajouter('pause générale illisible : l’ancien code se tait (doute), n8n aussi', m, []) }
  { const m = vide(); m.reglages.push(reglage(A(1), true, true, null)); m.artisans.push(compte(A(1), 'studio')); m.chantiers.push(chantier(C(1), A(1), J(-1), 'Chaudière'))
    m.reglages.push(reglage(A(2), true, true, null)); m.artisans.push(compte(A(2), 'essentiel')); m.chantiers.push(chantier(C(2), A(2), J(-1), 'Chaudière'))
    m.reglages.push(reglage(A(3), true, true, null)); m.artisans.push(compte(A(3), null)); m.chantiers.push(chantier(C(3), A(3), J(-1), 'Chaudière'))
    ajouter('offre Studio, Essentiel ou sans offre : rien', m, []) }
  { const m = vide(); m.reglages.push(reglage(A(1), true, false, null)); m.artisans.push(compte(A(1), 'signature')); m.chantiers.push(chantier(C(1), A(1), J(-1), 'Chaudière'))
    m.reglages.push(reglage(A(2), false, true, null)); m.artisans.push(compte(A(2), 'entreprise')); m.chantiers.push(chantier(C(2), A(2), J(-1), 'Chaudière'))
    m.reglages.push(reglage(A(3), true, true, null)); m.artisans.push(compte(A(3), 'studio', true)); m.chantiers.push(chantier(C(3), A(3), J(-1), 'Salle d’eau'))
    m.reglages.push(reglage(A(4), false, false, null)); m.artisans.push(compte(A(4), 'signature')); m.chantiers.push(chantier(C(4), A(4), J(-1), 'Chaudière'))
    ajouter('offre Signature (avis seul), Entreprise (entretien seul), fondateur en Studio, réglages décochés', m, [`avis:${C(1)}`, `entretien:${C(2)}:1`, `avis:${C(3)}`]) }
  { const m = vide(); m.reglages.push(reglage(A(1), true, true, null)); m.artisans.push(compte(A(1), 'signature'))
    m.chantiers.push(chantier(C(1), A(1), J(-1), 'Chaudière', null, 'en_cours'), chantier(C(2), A(1), J(3), 'Chaudière'), chantier(C(3), A(1), Mo(-37), 'Chaudière'),
      chantier(C(4), A(1), null, 'Chaudière'), chantier(C(5), A(1), J(0), 'Toiture', null, 'termine', D(5)))
    m.devis.push({ id: D(5), artisan_id: A(1), objet: 'Réfection', client_email: null }); m.lignes.push({ devis_id: D(5), designation: 'Dépose et repose du conduit de fumée' })
    ajouter('en cours, fin future, plus de 3 ans, sans date ; équipement lu dans une ligne du devis, fini aujourd’hui', m, [`avis:${C(5)}`, `entretien:${C(5)}:1`]) }
  { const m = vide(); m.reglages.push(reglage(A(1), false, true, null)); m.artisans.push(compte(A(1), 'signature'))
    for (let i = 1; i <= 26; i++) m.chantiers.push(chantier(C(i), A(1), ajouterJours(Mo(-30), i), i % 2 ? 'Chaudière' : 'pompe à chaleur'))
    const attendu = []
    for (let i = 1; i <= 26; i++) { const fin = ajouterJours(Mo(-30), i), mois = i % 2 ? 12 : 24; let n = 1; while (ajouterJours(ajouterMois(fin, n * mois), -15) < j) n++
      attendu.push({ cle: `entretien:${C(i)}:${n}`, e: ajouterJours(ajouterMois(fin, n * mois), -15) }) }
    ajouter('plafond : 26 chantiers, 20 rappels au plus, les plus proches d’abord', m, attendu.sort((a, b) => a.e.localeCompare(b.e)).slice(0, 20).map((x) => x.cle)) }
  { const m = vide(); m.reglages.push(reglage(A(1), false, true, null)); m.artisans.push(compte(A(1), 'signature'))
    m.chantiers.push(chantier(C(1), A(1), J(-1), 'Pompe à chaleur'), chantier(C(2), A(1), J(-1), 'Installation PAC'))
    ajouter('« Pompe à chaleur » avec majuscule : le motif du code ne la reconnaît pas (lib/apresChantier.ts:97), n8n non plus (même résultat)', m, [`entretien:${C(2)}:1`]) }
  { const m = vide(); m.reglages.push(reglage(A(1), true, true, null)); m.artisans.push(compte(A(1), 'signature'))
    m.chantiers.push(chantier(C(1), A(1), J(-1), 'Chaudière'), chantier(C(2), A(1), J(-1), 'Chaudière')); m.sansSignal.push(C(2))
    ajouter('chantier absent de la vue des signaux : n8n ne pose rien pour lui (É4)', m, [`avis:${C(1)}`, `entretien:${C(1)}:1`]) }
  { const m = vide(); m.reglages.push(reglage(A(1), true, true, null)); m.artisans.push(compte(A(1), 'signature'))
    m.chantiers.push(chantier(C(1), A(1), J(-1), 'Chaudière', 'Mme Opposée', 'termine', D(1))); m.devis.push({ id: D(1), artisan_id: A(1), objet: 'Chaudière', client_email: 'refus@exemple.invalid' })
    m.oppositions.push({ artisan_id: A(1), empreinte: empreinte('refus@exemple.invalid') })
    m.signauxEnPlus = [{ artisan_id: A(2), chantier_id: C(1), equipement: 'chaudiere', oppose: false }] // une ligne d'un AUTRE compte sur le même identifiant
    ajouter('signal d’un autre compte sur le même chantier : seul celui du compte compte (M2 de 032-010)', m, []) }
  { const m = vide(); m.reglages.push(reglage(A(2), true, false, null), reglage(A(1), true, false, null)); m.artisans.push(compte(A(1), 'signature'), compte(A(2), 'signature'))
    m.chantiers.push(chantier(C(1), A(1), J(-1), 'Cuisine'), { ...chantier(C(2), A(2), J(-1), 'Cuisine') })
    m.rappels.push({ id: 'r9', artisan_id: A(2), cle: `avis:${C(1)}` }) // la clé d'un AUTRE compte ne vaut pas pour A(1)
    ajouter('deux comptes : la clé d’un autre compte ne compte pas', m, [`avis:${C(1)}`, `avis:${C(2)}`]) }
  return l
}

// ─── Comparer un cas ─────────────────────────────────────────────────────────────────────────────────────────────────────────
const tri = (l) => [...l].sort((a, b) => (a.artisan_id + a.cle).localeCompare(b.artisan_id + b.cle))
async function comparer(wf, k, instant) {
  const jour = jourDans(instant, 'Europe/Paris')
  const echecs = []
  const avant = await ancien(k.monde, jour)
  // La référence : l'ancien code lui-même, sur le monde ajusté des écarts écrits (É1 : aucun nom ; É2 : sans les chantiers opposés ;
  // É4 : sans les chantiers absents de la vue). Rien d'autre ne peut différer.
  const ctxN = executer(codeDe(wf, 'Contexte du passage'), { instant })[0]
  const lu = lecturesN8n(k.monde, ctxN.depuis ?? '0000-00-00')
  const exclus = new Set([...(k.monde.sansSignal ?? []), ...lu['Lire signaux'].filter((s) => s.oppose === true).map((s) => s.chantier_id)])
  const ajuste = copie(k.monde)
  ajuste.chantiers = ajuste.chantiers.filter((c) => !exclus.has(c.id)).map((c) => ({ ...c, client_nom: null }))
  const reference = await ancien(ajuste, jour)
  let n8n
  try { n8n = passageN8n(wf, k.monde, instant).sortie } catch (e) { return { echecs: [`${k.nom} : le workflow plante (${e.message})`], lignes: [] } }
  if (n8n.mode !== 'simulation' || n8n.ecrit !== false) echecs.push(`${k.nom} : la sortie n'est pas une simulation (mode ${n8n.mode}, ecrit ${n8n.ecrit})`)
  if (!egal(tri(n8n.lignes ?? []), tri(reference.lignes))) echecs.push(`${k.nom} : n8n ≠ ancien code (écarts écrits appliqués)\n        n8n : ${JSON.stringify(tri(n8n.lignes ?? []).map((x) => [x.cle, x.echeance, x.texte]))}\n        ancien : ${JSON.stringify(tri(reference.lignes).map((x) => [x.cle, x.echeance, x.texte]))}`)
  if (!egal(cles(n8n.lignes ?? []), [...k.attendu].sort())) echecs.push(`${k.nom} : clés de n8n ${JSON.stringify(cles(n8n.lignes ?? []))}, attendues ${JSON.stringify([...k.attendu].sort())}`)
  // Chaque ligne de l'ancien code qui n'est pas dans n8n, ou qui en diffère, doit relever d'un écart écrit.
  const ecarts = []
  const parCle = new Map((n8n.lignes ?? []).map((x) => [x.artisan_id + '|' + x.cle, x]))
  for (const x of avant.lignes) {
    const y = parCle.get(x.artisan_id + '|' + x.cle)
    if (!y) { if (exclus.has(x.chantier_id)) ecarts.push(`${(k.monde.sansSignal ?? []).includes(x.chantier_id) ? 'É4' : 'É2'} ${x.cle} posé par l'ancien code, pas par n8n`); else echecs.push(`${k.nom} : ${x.cle} posé par l'ancien code et pas par n8n, sans écart écrit`) ; continue }
    const diff = Object.keys(x).filter((c) => x[c] !== y[c])
    const ref = reference.lignes.find((z) => z.artisan_id === x.artisan_id && z.cle === x.cle)
    if (diff.length && !(diff.length === 1 && diff[0] === 'texte' && ref && y.texte === ref.texte)) echecs.push(`${k.nom} : ${x.cle} diffère (${diff.join(', ')}) sans écart écrit`)
    else if (diff.length) ecarts.push(`É1 ${x.cle} : « ${x.texte} » → « ${y.texte} »`)
  }
  for (const y of n8n.lignes ?? []) if (!avant.lignes.some((x) => x.artisan_id === y.artisan_id && x.cle === y.cle)) echecs.push(`${k.nom} : ${y.cle} posé par n8n, pas par l'ancien code`)
  return { echecs, ecarts, n: (n8n.lignes ?? []).length, nAncien: avant.lignes.length, jour }
}

// ─── Structure et copie figée ────────────────────────────────────────────────────────────────────────────────────────────────
function structure(wf, brief) {
  const e = []
  if (wf.active !== false) e.push('S1 le workflow doit être inactif')
  if (wf.activeVersionId) e.push('S1 aucune version publiée attendue')
  if (wf.name !== 'presti-apres-chantier') e.push(`S1 nom inattendu (${wf.name})`)
  if (wf.settings?.timezone !== 'Europe/Paris') e.push(`S2 fuseau du workflow : ${wf.settings?.timezone} (Europe/Paris attendu)`)
  const noms = wf.nodes.map((n) => n.name).sort(), attendus = Object.keys(TYPES).sort()
  if (!egal(noms, attendus)) e.push(`S3 nœuds ${JSON.stringify(noms)} ≠ ${JSON.stringify(attendus)}`)
  for (const n of wf.nodes) {
    if (TYPES[n.name] && n.type !== TYPES[n.name]) e.push(`S3 ${n.name} : type ${n.type}`)
    if (n.disabled) e.push(`S3 ${n.name} : nœud désactivé (la chaîne doit être entière)`)
    if (n.type === 'n8n-nodes-base.code') { const c = String(n.parameters?.jsCode ?? ''); if (/\$http|fetch\s*\(|helpers\.|require\s*\(|import\s*\(|\$env|process\./.test(c)) e.push(`S4 ${n.name} : le code appelle l'extérieur`) }
  }
  const dec = noeud(wf, 'Déclencheur 8 h')
  const r = dec?.parameters?.rule?.interval
  if (!(Array.isArray(r) && r.length === 1 && r[0].field === 'days' && (r[0].daysInterval ?? 1) === 1 && r[0].triggerAtHour === 8 && (r[0].triggerAtMinute ?? 0) === 0)) e.push(`S5 déclencheur : ${JSON.stringify(r)} (tous les jours à 8 h 00 attendu)`)
  for (const l of LECTURES) {
    const n = noeud(wf, l.nom)
    if (!n) continue
    const p = n.parameters ?? {}
    if (String(p.method ?? 'GET').toUpperCase() !== 'GET' || p.sendBody || p.sendHeaders) e.push(`S6 ${l.nom} : GET sans corps ni en-tête attendu`)
    if (p.url !== HOTE + l.chemin) e.push(`S6 ${l.nom} : adresse ${p.url}`)
    if (p.authentication !== 'predefinedCredentialType' || p.nodeCredentialType !== 'supabaseApi' || n.credentials?.supabaseApi?.name !== 'Supabase account') e.push(`S6 ${l.nom} : identifiant « Supabase account » attendu`)
    const q = (p.queryParameters?.parameters ?? []).map((x) => [x.name, x.value])
    if (!egal(q, l.params)) e.push(`S6 ${l.nom} : paramètres ${JSON.stringify(q)} ≠ ${JSON.stringify(l.params)}`)
    if (n.executeOnce !== true) e.push(`S6 ${l.nom} : executeOnce attendu (une seule lecture par passage)`)
    const pag = p.options?.pagination
    if (l.pages === false ? pag : !(pag?.pagination?.maxRequests === 50 && pag?.pagination?.completeExpression === '={{ !Array.isArray($response.body) || $response.body.length < 1000 }}')) e.push(`S6 ${l.nom} : pagination inattendue`)
    const extra = Object.keys(p.options ?? {}).filter((k) => !['timeout', 'pagination'].includes(k))
    if (extra.length) e.push(`S6 ${l.nom} : options en plus (${extra.join(', ')})`)
    const cols = String(q.find((x) => x[0] === 'select')?.[1] ?? '').split(',')
    if (l.propose) { if (!brief.includes(l.objet) || cols.some((c) => !new RegExp(`\\b${c}\\b`).test(brief.slice(brief.indexOf('## Avant la bascule'))))) e.push(`S7 ${l.nom} : objet ${l.objet} ou colonnes absents de la proposition du brief`) }
    else for (const c of cols) if (!DROITS[l.objet]?.has(c)) e.push(`S7 ${l.nom} : colonne ${l.objet}.${c} hors des droits de n8n_lecture (0189)`)
  }
  const suivant = (nom) => Object.values(wf.connections?.[nom] ?? {}).flat(2).filter(Boolean).map((x) => x.node)
  for (let i = 0; i < CHAINE.length - 1; i++) if (!egal(suivant(CHAINE[i]), [CHAINE[i + 1]])) e.push(`S8 ${CHAINE[i]} → ${JSON.stringify(suivant(CHAINE[i]))} (attendu ${CHAINE[i + 1]})`)
  if (suivant(CHAINE.at(-1)).length) e.push('S8 rien ne doit suivre la simulation de l’écriture')
  if (!egal(suivant('Échec du passage'), ['Message d echec'])) e.push("S9 branche d'erreur : Échec du passage → Message d echec attendu")
  const poser = String(noeud(wf, 'Poser les rappels (simulation)')?.parameters?.jsCode ?? '')
  if (!/ecrit: false/.test(poser) || !/mode: 'simulation'/.test(poser)) e.push('S10 la pose doit rester une simulation (ecrit: false)')
  return e
}
function copieFigee(wf) {
  const e = []
  let ctx
  try { ctx = executer(codeDe(wf, 'Contexte du passage'), { instant: '2026-07-14T10:00:00Z' })[0] } catch (err) { return [`C0 Contexte du passage : ${err.message}`] }
  const S = ctx.seuils ?? {}
  const v = { delai_avis_jours: DELAI_AVIS_JOURS, rattrapage_jours: RATTRAPAGE_JOURS, preavis_jours: PREAVIS_JOURS, entretien_ans_max: ENTRETIEN_ANS_MAX, max_poses_par_passage: MAX_POSES_PAR_PASSAGE }
  for (const [k, x] of Object.entries(v)) if (S[k] !== x) e.push(`C1 seuil ${k} : ${S[k]} dans n8n, ${x} dans le code`)
  if (ctx.depuis !== ajouterMois('2026-07-14', -12 * ENTRETIEN_ANS_MAX)) e.push(`C1 depuis : ${ctx.depuis}`)
  const eqN8n = ctx.equipements ?? {}
  const eqCode = Object.fromEntries(EQUIPEMENTS.map((x) => [CODE_EQUIPEMENT[x.nom], { nom: x.nom, mois: x.mois }]))
  if (!egal(Object.keys(eqN8n).sort(), Object.keys(eqCode).sort()) || Object.keys(eqCode).some((k) => !egal(eqN8n[k], eqCode[k]))) e.push(`C2 équipements ${JSON.stringify(eqN8n)} ≠ ${JSON.stringify(eqCode)}`)
  for (const plan of ['studio', 'signature', 'entreprise', 'essentiel', 'essai', 'gratuit', null, 'inconnu']) if ((ctx.offres_crm ?? []).includes(plan) !== peut(plan, 'crm')) e.push(`C3 offre ${plan} : crm ${peut(plan, 'crm')} dans le code, ${(ctx.offres_crm ?? []).includes(plan)} dans n8n`)
  if (ctx.drapeau_crmApresChantier !== FLAGS.crmApresChantier) e.push(`C4 drapeau crmApresChantier : ${ctx.drapeau_crmApresChantier} dans n8n, ${FLAGS.crmApresChantier} dans lib/flags.ts`)
  if (ctx.mode !== 'simulation') e.push('C5 mode simulation attendu')
  if (empreinte(' A@B.invalid') !== createHash('sha256').update('a@b.invalid').digest('hex').slice(0, 32) || !/createHash\('sha256'\)\.update\(email\.trim\(\)\.toLowerCase\(\)\)\.digest\('hex'\)\.slice\(0, 32\)/.test(lireTexte('lib/crm/apresOpposition.ts'))) e.push('C6 l’empreinte d’adresse du juge ne suit plus lib/crm/apresOpposition.ts')
  return e
}
// L'essai n8n : sa pin data, rejouée ici, rend la sortie de n8n ; et ce sont bien les données du cas « essai ».
function essai(wf) {
  const e = []
  if (!existsSync(path.join(RACINE, CHEMINS.essai))) return ['E0 essai-n8n.json absent']
  const x = JSON.parse(lireTexte(CHEMINS.essai))
  if (x.statut !== 'success') e.push(`E1 l'essai n8n n'a pas réussi (${x.statut})`)
  const pin = Object.fromEntries(Object.entries(x.pinData ?? {}).map(([k, v]) => [k, v.map((i) => i.json)]))
  for (const l of LECTURES) if (!pin[l.nom]) e.push(`E2 ${l.nom} n'est pas épinglé`)
  if (!pin['Déclencheur 8 h']) e.push('E2 déclencheur non épinglé')
  if (e.length) return e
  const instant = `${x.jour}T12:00:00Z`
  const lectures = Object.fromEntries(LECTURES.map((l) => [l.nom, pin[l.nom]]))
  let rejoue
  try { rejoue = passageN8n(wf, null, instant, lectures).sortie } catch (err) { return [`E3 rejeu de l'essai : ${err.message}`] }
  if (!egal(rejoue, x.sortie)) e.push(`E3 le rejeu hors ligne ≠ la sortie de n8n\n        rejeu : ${JSON.stringify(rejoue).slice(0, 400)}\n        n8n   : ${JSON.stringify(x.sortie).slice(0, 400)}`)
  const ctx = executer(codeDe(wf, 'Contexte du passage'), { instant })[0]
  if (!egal(lectures, lecturesN8n(mondeEssai(x.jour), ctx.depuis))) e.push('E4 la pin data de l’essai n’est pas celle du cas « essai » de ce juge (régénérer : --pin=' + x.jour + ')')
  return e
}

// ─── Tout le juge, sur un export ─────────────────────────────────────────────────────────────────────────────────────────────
// Deux instants : un après-midi ordinaire, et 23 h 30 UTC (déjà le lendemain à Paris) : un fuseau changé y rougit.
const INSTANTS = ['2026-11-02T14:00:00Z', '2026-11-02T23:30:00Z', '2027-02-28T23:30:00Z']
async function juger(wf, brief, { bavard = false } = {}) {
  const e = [...structure(wf, brief), ...copieFigee(wf)]
  for (const instant of INSTANTS) {
    for (const k of cas(jourDans(instant, 'Europe/Paris'))) {
      let r
      try { r = await comparer(wf, k, instant) } catch (err) { e.push(`${k.nom} : ${err.message}`); continue }
      e.push(...r.echecs)
      if (bavard && instant === INSTANTS[0]) {
        console.log(`  ${r.echecs.length ? '✗' : '✓'} ${k.nom} — ancien code : ${r.nAncien} rappel(s), n8n : ${r.n}${r.ecarts.length ? '' : ', mêmes rappels'}`)
        for (const x of r.ecarts) console.log(`      écart écrit ${x}`)
      }
    }
  }
  // Idempotence : un second passage le même jour, les rappels du premier posés, ne pose rien (des deux côtés).
  const instant = INSTANTS[0], jour = jourDans(instant, 'Europe/Paris')
  try {
    const m = mondeEssai(jour)
    const premier = passageN8n(wf, m, instant).sortie.lignes ?? []
    for (const [i, x] of premier.entries()) m.rappels.push({ id: 'p' + i, artisan_id: x.artisan_id, cle: x.cle })
    const second = passageN8n(wf, m, instant).sortie.lignes ?? []
    const secondAncien = (await ancien(m, jour)).lignes.filter((x) => x.chantier_id !== C(3)) // C(3) : opposé, l'ancien code le pose encore (É2)
    if (!premier.length || second.length) e.push(`I1 idempotence : premier passage ${premier.length}, second ${second.length} (0 attendu)`)
    if (secondAncien.length) e.push(`I1 idempotence de l'ancien code : ${secondAncien.length} au second passage`)
    if (bavard) console.log(`  ${!premier.length || second.length ? '✗' : '✓'} idempotence : ${premier.length} rappel(s) au premier passage, ${second.length} au second (clé artisan_id,cle)`)
  } catch (err) { e.push(`I1 idempotence : ${err.message}`) }
  return e
}

// ─── Les mutants : chacun doit faire rougir le juge ──────────────────────────────────────────────────────────────────────────
const remplacer = (nom, de, vers) => (wf) => { const n = noeud(wf, nom); const c = n.parameters.jsCode; if (!c.includes(de)) throw new Error(`motif absent dans ${nom} : ${de}`); n.parameters.jsCode = c.replace(de, vers) }
const MUTANTS = [
  ['opposition ignorée', remplacer('Rappels a poser', "if (sig.oppose !== false) { bilan.opposes++; continue; }", '')],
  ['clé de l’avis changée', remplacer('Rappels a poser', "const cle = 'avis:' + c.id;", "const cle = 'avis-' + c.id;")],
  ['clé de l’entretien sans son rang', remplacer('Rappels a poser', "const cle = 'entretien:' + c.id + ':' + n;", "const cle = 'entretien:' + c.id;")],
  ['fuseau changé (UTC)', remplacer('Contexte du passage', "setZone('Europe/Paris')", "setZone('UTC')")],
  ['fuseau du workflow changé', (wf) => { wf.settings.timezone = 'UTC' }],
  ['pause générale ignorée', remplacer('Rappels a poser', 'if (bilan.pause ||', 'if (false ||')],
  ['pause illisible prise pour levée', remplacer('Rappels a poser', "pause: !(pause.length === 1 && pause[0].pause_generale === false)", "pause: pause.length === 1 && pause[0].pause_generale === true")],
  ['offre Studio admise', remplacer('Contexte du passage', "offres_crm: ['signature', 'entreprise']", "offres_crm: ['studio', 'signature', 'entreprise']")],
  ['fondateur ignoré', remplacer('Rappels a poser', 'p.is_founder !== true && ', 'true && ')],
  ['plafond de 20 levé', remplacer('Contexte du passage', 'max_poses_par_passage: 20', 'max_poses_par_passage: 25')],
  ['délai de l’avis changé', remplacer('Contexte du passage', 'delai_avis_jours: 2', 'delai_avis_jours: 3')],
  ['rattrapage changé', remplacer('Contexte du passage', 'rattrapage_jours: 14', 'rattrapage_jours: 30')],
  ['préavis changé', remplacer('Contexte du passage', 'preavis_jours: 15', 'preavis_jours: 14')],
  ['périodicité de la PAC changée', remplacer('Contexte du passage', "pompe_a_chaleur: { nom: 'pompe à chaleur', mois: 24 }", "pompe_a_chaleur: { nom: 'pompe à chaleur', mois: 12 }")],
  ['clés existantes ignorées', remplacer('Rappels a poser', "if (!existantes.has(cle)) {", 'if (true) {')],
  ['clés lues tous comptes confondus', remplacer('Rappels a poser', 'const existantes = clesDe.get(reg.artisan_id) || new Set();', 'const existantes = new Set([...clesDe.values()].flatMap((s) => [...s]));')],
  ['signal joint par le seul chantier', remplacer('Rappels a poser', 'const sig = signaux.get(paire(reg.artisan_id, c.id));', 'const sig = [...signaux.values()].find((s) => s.chantier_id === c.id);')],
  ['fin à venir acceptée', remplacer('Rappels a poser', 'if (!fin || fin > JOUR) continue;', 'if (!fin) continue;')],
  ['drapeau baissé ignoré', (wf) => { remplacer('Contexte du passage', 'drapeau_crmApresChantier: true', 'drapeau_crmApresChantier: false')(wf) }],
  ['écriture réelle', remplacer('Poser les rappels (simulation)', 'ecrit: false', 'ecrit: true')],
  ['déclencheur à 9 h', (wf) => { noeud(wf, 'Déclencheur 8 h').parameters.rule.interval[0].triggerAtHour = 9 }],
  ['workflow actif', (wf) => { wf.active = true }],
  ['nom du client lu', (wf) => { noeud(wf, 'Lire chantiers').parameters.queryParameters.parameters[0].value += ',client_nom' }],
  ['titre lu', (wf) => { noeud(wf, 'Lire chantiers').parameters.queryParameters.parameters[0].value += ',titre' }],
  ['filtre « terminé » ôté de la lecture', (wf) => { const p = noeud(wf, 'Lire chantiers').parameters.queryParameters; p.parameters = p.parameters.filter((x) => x.name !== 'statut') }],
  ['lecture devenue POST', (wf) => { noeud(wf, 'Lire cles').parameters.method = 'POST' }],
  ['nœud d’écriture ajouté', (wf) => { wf.nodes.push({ id: 'x', name: 'Écrire', type: 'n8n-nodes-base.httpRequest', typeVersion: 4.5, position: [0, 0], parameters: { method: 'POST', url: HOTE + 'crm_rappels' } }); wf.connections['Poser les rappels (simulation)'] = { main: [[{ node: 'Écrire', type: 'main', index: 0 }]] } }],
  ['branche d’erreur ôtée', (wf) => { delete wf.connections['Échec du passage'] }],
]

// ─── Lancement ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
const argPin = process.argv.find((a) => a.startsWith('--pin='))
if (argPin) {
  const jour = argPin.slice(6), wfp = JSON.parse(lireTexte(CHEMINS.export)), wf0 = wfp.workflow ?? wfp
  const ctx = executer(codeDe(wf0, 'Contexte du passage'), { instant: `${jour}T12:00:00Z` })[0]
  const l = lecturesN8n(mondeEssai(jour), ctx.depuis)
  console.log(JSON.stringify({ 'Déclencheur 8 h': [{ json: { timestamp: `${jour}T08:00:00.000+01:00` } }], ...Object.fromEntries(Object.entries(l).map(([k, v]) => [k, v.map((json) => ({ json }))])) }))
  process.exit(0)
}
let echecs = 0
const brut = JSON.parse(lireTexte(CHEMINS.export))
const WF = brut.workflow ?? brut
const BRIEF = lireTexte(CHEMINS.brief)
console.log(`apres-chantier-n8n-qa : ${CHEMINS.export} (${WF.name}, id ${WF.id ?? '?'})`)
console.log('Comparaison à l’ancien code (tourApresChantier), cas par cas, au jour de Paris du ' + jourDans(INSTANTS[0], 'Europe/Paris') + ' (et rejouée aux instants ' + INSTANTS.slice(1).join(', ') + ') :')
const base = await juger(WF, BRIEF, { bavard: true })
for (const m of base) console.log(`  ✗ ${m}`)
if (base.length) echecs++
else console.log('  ✓ structure (S1-S10), copie figée (C1-C6) et comparaison : vertes')
const eEssai = essai(WF)
for (const m of eEssai) console.log(`  ✗ ${m}`)
if (eEssai.length) echecs++; else console.log('  ✓ essai n8n : la pin data rejouée hors ligne rend la sortie de n8n, et c’est celle du cas « essai »')
// La garde commune sur cet export.
const g = spawnSync(process.execPath, ['--experimental-strip-types', '--import', './scripts/ts-loader.mjs', 'scripts/n8n-specs-qa.mjs', CHEMINS.export], { cwd: RACINE, encoding: 'utf8' })
const ligneGarde = (g.stdout ?? '').split('\n').find((l) => l.includes('presti-apres-chantier')) ?? (g.stderr ?? '').slice(0, 300)
console.log(`  ${g.status === 0 ? '✓' : '✗'} garde commune n8n-specs-qa : ${ligneGarde.trim()}`)
if (g.status !== 0) echecs++
let tenaces = 0
for (const [titre, f] of MUTANTS) {
  const m = copie(WF)
  let e
  try { f(m); e = await juger(m, BRIEF) } catch (err) { e = []; console.log(`  ✗ mutant « ${titre} » inapplicable : ${err.message}`) }
  console.log(`  ${e.length ? '✓' : '✗'} mutant « ${titre} » ${e.length ? 'fait rougir le juge' : 'NE FAIT PAS rougir le juge'}${e.length ? '\n      → ' + e[0].split('\n')[0].slice(0, 170) : ''}`)
  if (!e.length) tenaces++
}
console.log(`apres-chantier-n8n-qa : ${cas('2026-11-02').length} cas × ${INSTANTS.length} instants, ${MUTANTS.length} mutants`)
if (echecs || tenaces) { if (tenaces) console.log(`  ✗ ${tenaces} mutant(s) laissent le juge vert`); console.log('ÉCHEC'); process.exit(1) }
console.log('OK')
