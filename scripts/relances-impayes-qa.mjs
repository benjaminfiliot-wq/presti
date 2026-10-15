// Les relances AUTOMATIQUES des factures impayées (lib/relancesImpayes.ts, lib/relancesImpayesTour.ts, migration 0159).
// Ce juge rejoue le passage quotidien avec une base EN MÉMOIRE (mêmes clés uniques que la migration) et un e-mail ESPIONNÉ :
// aucun envoi réel, aucune base distante, aucun compte créé (donc rien à nettoyer ; si une version future crée un compte de test,
// son ménage doit être dans un finally). Il vérifie : opt-in, calendrier, arrêt (payée, annulée, avoir, réponse du client, arrêt manuel),
// idempotence (rejeu, passages simultanés), jamais deux le même jour, plafond par compte, isolation entre comptes, pause générale,
// échec d'envoi, et les sources (cron, route, migration, écran, offre, comparatif). Il s'attaque aussi lui-même (mutations).
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/relances-impayes-qa.mjs
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const RACINE = process.cwd()
const imp = (rel) => import(pathToFileURL(path.join(RACINE, rel)).href)
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8')
const R = await imp('lib/relancesImpayes.ts')
const T = await imp('lib/relancesImpayesTour.ts')
const P = await imp('lib/plans.ts')
const F = await imp('lib/flags.ts')

const echecs = []
let n = 0
const ok = (c, m) => { n++; if (!c) echecs.push(m) }

// Aucun envoi réel, quoi qu'il arrive : toute tentative réseau fait échouer le juge.
let reseau = 0
globalThis.fetch = async () => { reseau++; throw new Error('réseau interdit dans ce juge') }

// ─── Le monde en mémoire ───────────────────────────────────────────────────────────────────────────────────────────────────
const MAINTENANT = new Date('2026-10-20T08:00:00Z') // 10 h à Paris
const jourIso = (d) => d.toISOString().slice(0, 10)
const il = (jours, base = MAINTENANT) => jourIso(new Date(base.getTime() - jours * 86_400_000))
const plus = (jours) => new Date(MAINTENANT.getTime() + jours * 86_400_000)
let seq = 0
const uuid = (p) => `${p}-${String(++seq).padStart(8, '0')}`

const facture = (art, o = {}) => ({
  id: uuid('fac'), artisan_id: art, numero: `F-2026-${String(seq).padStart(4, '0')}`, statut: 'emise', avoir_de: null,
  date_echeance: il(3), total_ttc: 1200, client_nom: 'M. Durand', client_email: `client${seq}@example.com`, devis_id: null, ...o,
})

function monde({ comptes, factures = [], messages = [], fuiteDans = null, casse = null, sansUnicite = false }) {
  const journal = []; const arrets = new Map(); const lectures = { n: 0 }
  const reg = new Map(comptes.map((c) => [c.id, c]))
  const m = {
    rows: journal, arretsBd: arrets, lectures, facturesBd: factures,
    async comptes() { lectures.n++; return comptes.filter((c) => c.reglages).map((c) => ({ artisan_id: c.id, reglages: c.reglages })) },
    async artisan(id) { lectures.n++; if (casse === id) throw new Error('base en panne pour ce compte'); const c = reg.get(id); return c ? { id, nom: c.nom ?? 'Dupont Rénovation', email: c.email === undefined ? `${id}@artisan.test` : c.email, plan: c.plan ?? 'studio', is_founder: !!c.fondateur, leads_pause: !!c.pause } : null },
    async suspendu(id) { return !!reg.get(id)?.suspendu },
    async factures(art) {
      lectures.n++
      const siennes = factures.filter((f) => f.artisan_id === art && f.statut === 'emise' && !f.avoir_de && f.date_echeance)
      // Un magasin défaillant qui rendrait la facture d'un autre compte : la ceinture du passage doit l'ignorer.
      return fuiteDans === art ? [...siennes, ...factures.filter((f) => f.artisan_id !== art && f.statut === 'emise')] : siennes
    },
    async facture(art, id) { lectures.n++; if (m.avantRelecture) m.avantRelecture(id); return factures.find((f) => f.id === id && f.artisan_id === art) ?? null },
    async journal(art) { return journal.filter((e) => e.artisan_id === art).map((e) => ({ ...e })) },
    async arrets(art) { return new Map([...(arrets.get(art) ?? new Map())].map(([k, v]) => [k, { ...v }])) },
    async reponseClient(art, f, depuis) { return messages.some((x) => x.artisan_id === art && x.contact.toLowerCase() === String(f.client_email).toLowerCase() && x.sens === 'in' && x.sent_at > depuis) },
    async prendre(e) {
      await Promise.resolve() // laisse passer un autre passage : la concurrence est réelle
      if (!sansUnicite && journal.some((x) => x.facture_id === e.facture_id && x.rang === e.rang)) return null
      if (!sansUnicite && journal.some((x) => x.artisan_id === e.artisan_id && x.destinataire === e.destinataire && x.jour === e.jour)) return null
      const id = uuid('rel'); journal.push({ id, ...e, statut: 'prise', envoyee_le: null }); return id
    },
    async confirmer(id, maintenant) { const e = journal.find((x) => x.id === id); e.statut = 'envoyee'; e.envoyee_le = maintenant.toISOString() },
    async relacher(id) { const i = journal.findIndex((x) => x.id === id && x.statut === 'prise'); if (i >= 0) journal.splice(i, 1) },
    async arreter(art, fid, raison, maintenant) { if (!arrets.has(art)) arrets.set(art, new Map()); arrets.get(art).set(fid, { raison, le: maintenant.toISOString(), reprise_le: null }) },
    avantRelecture: null,
  }
  return m
}
function espion(refus = null) {
  const envois = []
  const envoyer = async (x) => { if (refus && refus(x, envois.length)) return { ok: false, error: refus(x, envois.length) }; envois.push(x); return { ok: true } }
  return { envois, envoyer }
}
const REG = (o = {}) => ({ ...R.REGLAGES_RELANCES_PAR_DEFAUT, actif: true, ...o })
const tour = (m, e, o = {}) => T.tourRelancesImpayes({ actif: true, magasin: m, envoyer: e.envoyer, sortiePermise: async () => true, maintenant: MAINTENANT, ...o })

// ─── 1. Le calendrier et la décision (pure) ────────────────────────────────────────────────────────────────────────────────
ok(JSON.stringify(R.JOURS_PAR_DEFAUT) === '[3,10,21]', 'calendrier par défaut J+3, J+10, J+21')
ok(R.REGLAGES_RELANCES_PAR_DEFAUT.actif === false, 'désactivé par défaut (opt-in)')
const dec = (f, o = {}) => R.decider({ facture: f, reglages: REG(o.reglages), journal: o.journal ?? [], arretee: !!o.arretee, reponseClient: o.reponse, destinatairesDuJour: o.dest, maintenant: o.maintenant ?? MAINTENANT })
const A = 'art-A'
const rienPour = (f, raison, o) => { const d = dec(f, o); ok(d.action === 'rien' && d.raison === raison, `décision attendue « ${raison} », reçue ${JSON.stringify(d)}`) }
rienPour(facture(A, { date_echeance: il(-2) }), 'pas_echue')
rienPour(facture(A, { date_echeance: il(0) }), 'pas_echue')
rienPour(facture(A, { date_echeance: il(2) }), 'pas_encore')
{ const d = dec(facture(A, { date_echeance: il(3) })); ok(d.action === 'envoyer' && d.rang === 1 && d.joursRetard === 3, 'J+3 : première relance') }
rienPour(facture(A, { date_echeance: il(3) }), 'inactif', { reglages: { actif: false } })
rienPour(facture(A, { statut: 'payee' }), 'payee')
rienPour(facture(A, { statut: 'annulee' }), 'annulee')
rienPour(facture(A, { statut: 'brouillon' }), 'pas_emise')
rienPour(facture(A, { avoir_de: 'fac-x', total_ttc: -300 }), 'avoir')
rienPour(facture(A, { date_echeance: null }), 'sans_echeance')
rienPour(facture(A, { client_email: null }), 'sans_email')
rienPour(facture(A, { client_email: 'pas-une-adresse' }), 'sans_email')
rienPour(facture(A, { client_email: 'a@b.fr, c@d.fr' }), 'sans_email')
rienPour(facture(A, { total_ttc: 0 }), 'montant_nul')
rienPour(facture(A), 'arretee', { arretee: true })
rienPour(facture(A), 'client_a_repondu', { reponse: true })
{ // enchaînement J+3 → J+10 → J+21
  const f = facture(A, { date_echeance: il(3) })
  const j1 = [{ facture_id: f.id, rang: 1, jour: il(0), statut: 'envoyee', envoyee_le: `${il(0)}T08:00:00Z` }]
  rienPour({ ...f, date_echeance: il(10) }, 'trop_tot', { journal: [{ facture_id: f.id, rang: 1, jour: il(1), statut: 'envoyee' }] })
  rienPour(f, 'pas_encore', { journal: j1 })
  const f2 = { ...f, date_echeance: il(10) }
  const j1b = [{ facture_id: f.id, rang: 1, jour: il(7), statut: 'envoyee' }]
  const d2 = dec(f2, { journal: j1b }); ok(d2.action === 'envoyer' && d2.rang === 2, 'J+10 : deuxième relance')
  const f3 = { ...f, date_echeance: il(21) }
  const j2 = [...j1b, { facture_id: f.id, rang: 2, jour: il(11), statut: 'envoyee' }]
  const d3 = dec(f3, { journal: j2 }); ok(d3.action === 'envoyer' && d3.rang === 3, 'J+21 : troisième relance')
  rienPour(f3, 'termine', { journal: [...j2, { facture_id: f.id, rang: 3, jour: il(1), statut: 'envoyee' }] })
  rienPour(f2, 'pas_encore', { journal: j1b.concat([]).map((x) => ({ ...x })), maintenant: MAINTENANT, reglages: { jours: [3, 30] } })
}
{ // rattrapage : un retard de passage se rattrape, une vieille facture ne déclenche pas de rafale
  const d12 = dec(facture(A, { date_echeance: il(12) })); ok(d12.action === 'envoyer' && d12.rang === 1, 'J+12 sans rien envoyé : la 1re part encore (rattrapage)')
  const d25 = dec(facture(A, { date_echeance: il(25) })); ok(d25.action === 'envoyer' && d25.rang === 3, 'J+25 sans rien envoyé : seule la relance 3 est dans sa fenêtre')
  rienPour(facture(A, { date_echeance: il(60) }), 'trop_ancienne')
  rienPour(facture(A, { date_echeance: il(400) }), 'trop_ancienne')
}
{ const d = dec(facture(A, { date_echeance: il(1) }), { reglages: { jours: [1, 4] } }); ok(d.action === 'envoyer' && d.rang === 1, 'calendrier personnalisé [1,4] : J+1 part') }
{ const f = facture(A, { client_email: 'Client@Example.com' }); rienPour(f, 'deja_aujourdhui', { dest: new Set(['client@example.com']) }) }

// ─── 2. La validation des réglages et des textes ──────────────────────────────────────────────────────────────────────────
const lu = (b) => R.lireReglagesRelances(b)
ok(lu({ actif: true, jours: [3, 10, 21] }).ok, 'réglage par défaut accepté')
ok(lu({ actif: false, jours: [1] }).ok, '1 seule relance acceptée')
for (const [nom, b] of [
  ['actif non booléen', { actif: 'oui', jours: [3] }], ['pas de jours', { actif: true }], ['0 relance', { actif: true, jours: [] }], ['4 relances', { actif: true, jours: [3, 10, 21, 30] }],
  ['jour 0', { actif: true, jours: [0, 10] }], ['jour 91', { actif: true, jours: [3, 91] }], ['jour décimal', { actif: true, jours: [3.5] }], ['écart de 1 jour', { actif: true, jours: [3, 4] }],
  ['ordre inversé', { actif: true, jours: [10, 3] }], ['même jour', { actif: true, jours: [5, 5] }], ['texte avec lien', { actif: true, jours: [3], textes: { 1: 'Bonjour, payez sur https://exemple.com/payer merci beaucoup.' } }],
  ['texte avec www', { actif: true, jours: [3], textes: { 1: 'Bonjour, payez sur www.exemple.com merci beaucoup.' } }], ['variable inconnue', { actif: true, jours: [3], textes: { 1: 'Bonjour {prenom}, merci de régler votre facture.' } }],
  ['texte trop court', { actif: true, jours: [3], textes: { 1: 'Payez.' } }], ['texte trop long', { actif: true, jours: [3], textes: { 1: 'x'.repeat(1600) } }], ['clé de texte inconnue', { actif: true, jours: [3], textes: { 7: 'Bonjour, merci de régler votre facture rapidement.' } }],
  ['accolade seule', { actif: true, jours: [3], textes: { 1: 'Bonjour {client, merci de régler votre facture rapidement.' } }],
]) ok(!lu(b).ok, `réglage refusé attendu : ${nom}`)
{ const v = R.variablesDe({ client: 'M. Durand', numero: 'F-2026-0042', totalTtc: 1280, echeance: '2026-10-08', joursRetard: 12, artisan: 'Dupont Rénovation' })
  const corps = R.texteDeLaRelance(1, { textes: {} }, v)
  ok(corps.includes('M. Durand') && corps.includes('F-2026-0042') && corps.includes('08/10/2026') && /1\s?280/.test(corps) && corps.includes('Dupont Rénovation'), 'le texte par défaut se remplit (client, numéro, date, montant, artisan)')
  ok(!/\{[a-z]+\}/.test(corps), 'aucune variable laissée dans le texte')
  const perso = R.texteDeLaRelance(1, { textes: { 1: 'Bonjour {client}, ma facture {numero} attend toujours son règlement.' } }, v)
  ok(perso === 'Bonjour M. Durand, ma facture F-2026-0042 attend toujours son règlement.', 'le texte de l’artisan remplace le défaut')
  const msg = R.messageComplet(corps); ok(msg.endsWith(R.PIED_AUTOMATIQUE) && /automatiquement/.test(msg), 'le message dit qu’il est automatique')
  ok(!/https?:\/\//.test(msg), 'aucun lien dans le message par défaut')
  for (const r of [1, 2, 3]) ok(!R.erreurTexte(R.TEXTES_PAR_DEFAUT[r]), `texte par défaut ${r} valable`)
  ok(!/précédents messages/.test(R.TEXTES_PAR_DEFAUT[3]), 'le texte 3 ne prétend pas qu’il y a eu d’autres messages (il peut être le premier)')
  ok(R.sujetDeLaRelance('F-1', 'Dupont').includes('F-1') && !/[\r\n]/.test(R.sujetDeLaRelance('F-1\r\nBcc: x@y.z', 'Dupont')), 'sujet sans retour à la ligne')
}

// ─── 3. Le passage quotidien ───────────────────────────────────────────────────────────────────────────────────────────────
const compte = (id, o = {}) => ({ id, reglages: REG(), ...o })
{ // flag baissé : rien n'est lu
  const m = monde({ comptes: [compte(A)], factures: [facture(A)] }); const e = espion()
  const b = await T.tourRelancesImpayes({ actif: false, magasin: m, envoyer: e.envoyer, sortiePermise: async () => true, maintenant: MAINTENANT })
  ok(b.ferme === true && m.lectures.n === 0 && e.envois.length === 0, 'drapeau baissé : rien lu, rien envoyé')
}
{ // opt-in : un compte qui n'a pas activé n'est jamais relancé
  const m = monde({ comptes: [{ id: A, reglages: null }, compte('art-B', { reglages: REG({ actif: false }) })], factures: [facture(A), facture('art-B')] }); const e = espion()
  const b = await tour(m, e)
  ok(e.envois.length === 0 && m.rows.length === 0, 'opt-in : aucun envoi sans activation')
  ok(b.comptes <= 1, 'opt-in : seul un compte listé est lu')
}
{ // cas nominal
  const f = facture(A, { date_echeance: il(3), numero: 'F-2026-0042', total_ttc: 1280, client_nom: 'M. Durand', client_email: 'Durand@Example.com' })
  const m = monde({ comptes: [compte(A, { nom: 'Dupont Rénovation' })], factures: [f] }); const e = espion()
  const b = await tour(m, e)
  ok(b.envoyees === 1 && e.envois.length === 1, `cas nominal : 1 relance (reçu ${e.envois.length})`)
  const x = e.envois[0] ?? {}
  ok(x.to === 'durand@example.com', 'envoyée à l’adresse du client (normalisée)')
  ok(x.fromName === 'Dupont Rénovation' && x.replyTo === `${A}@artisan.test`, 'au nom de l’artisan, réponse vers l’artisan')
  ok(/F-2026-0042/.test(x.subject ?? '') && /F-2026-0042/.test(x.text ?? '') && /1\s?280/.test(x.text ?? ''), 'sujet et corps citent la facture et le montant')
  ok((x.text ?? '').endsWith(R.PIED_AUTOMATIQUE), 'le pied « rappel automatique » est dans le message')
  ok(m.rows.length === 1 && m.rows[0].statut === 'envoyee' && m.rows[0].rang === 1 && m.rows[0].jour === '2026-10-20' && !!m.rows[0].envoyee_le, 'le journal garde la relance confirmée')
  const etat = R.etatPourEcran({ facture: f, reglages: REG(), journal: m.rows, arret: null, maintenant: MAINTENANT })
  ok(etat === 'Relance 1 envoyée le 20/10/2026', `l’écran dit « Relance 1 envoyée le … » (reçu : ${etat})`)
  // idempotence : on rejoue le même jour
  const b2 = await tour(m, e); ok(b2.envoyees === 0 && e.envois.length === 1 && m.rows.length === 1, 'idempotence : le rejeu du même jour n’envoie rien')
  // lendemain : trop tôt pour la 2e ; J+10 : la 2e
  const b3 = await tour(m, e, { maintenant: plus(1) }); ok(b3.envoyees === 0, 'lendemain : pas de 2e relance (calendrier)')
  f.date_echeance = il(10)
  const b4 = await tour(m, e); ok(b4.envoyees === 0, 'J+10 le même jour que la 1re (sic) : rien ne part, une relance par jour et par client')
}
{ // idempotence sous concurrence : deux passages SIMULTANÉS
  const m = monde({ comptes: [compte(A)], factures: [facture(A)] }); const e = espion()
  await Promise.all([tour(m, e), tour(m, e), tour(m, e)])
  ok(e.envois.length === 1 && m.rows.length === 1, `trois passages simultanés : un seul e-mail (reçu ${e.envois.length})`)
  // mutation : sans les clés uniques, le juge DOIT voir le double envoi
  const m2 = monde({ comptes: [compte(A)], factures: [facture(A)], sansUnicite: true }); const e2 = espion()
  await Promise.all([tour(m2, e2), tour(m2, e2)])
  ok(e2.envois.length > 1, 'mutation : sans prise unique, le juge voit le double envoi (le juge détecte bien)')
}
{ // facture payée / annulée entre la lecture et l'envoi : rien ne part
  for (const statut of ['payee', 'annulee']) {
    const f = facture(A); const m = monde({ comptes: [compte(A)], factures: [f] }); const e = espion()
    m.avantRelecture = (id) => { if (id === f.id) f.statut = statut }
    const b = await tour(m, e)
    ok(e.envois.length === 0 && m.rows.length === 0, `facture passée « ${statut} » juste avant l’envoi : rien ne part`)
    ok(b.envoyees === 0, `bilan : 0 envoyée (${statut})`)
  }
  // payée dès le départ / avoir émis
  const fp = facture(A, { statut: 'payee' }); const fa = facture(A, { avoir_de: 'x', total_ttc: -100 }); const fv = facture(A, { statut: 'annulee' })
  const m = monde({ comptes: [compte(A)], factures: [fp, fa, fv] }); const e = espion(); await tour(m, e)
  ok(e.envois.length === 0, 'payée, avoir, annulée : jamais relancées')
}
{ // le client a répondu : arrêt, journalisé, définitif ; reprise par l'artisan
  const f = facture(A, { date_echeance: il(3), client_email: 'c@example.com' })
  const m = monde({ comptes: [compte(A)], factures: [f], messages: [{ artisan_id: A, contact: 'c@example.com', sens: 'in', sent_at: `${il(1)}T09:00:00Z` }] }); const e = espion()
  const b = await tour(m, e)
  ok(e.envois.length === 0 && b.arretees === 1, 'le client a répondu depuis l’échéance : aucune relance, facture arrêtée')
  const a = m.arretsBd.get(A)?.get(f.id); ok(a?.raison === 'reponse_client', 'l’arrêt garde sa raison (réponse du client)')
  ok(/Relances arrêtées : le client a répondu/.test(R.etatPourEcran({ facture: f, reglages: REG(), journal: [], arret: a, maintenant: MAINTENANT }) ?? ''), 'l’écran dit que le client a répondu')
  const b2 = await tour(m, e, { maintenant: plus(2) }); ok(e.envois.length === 0 && b2.envoyees === 0, 'arrêt définitif : rien ne repart les jours suivants')
  // reprise par l'artisan : une réponse ANTÉRIEURE à la reprise ne compte plus
  m.arretsBd.get(A).get(f.id).reprise_le = `${il(0)}T07:00:00Z`
  const b3 = await tour(m, e); ok(e.envois.length === 1 && b3.envoyees === 1, 'reprise par l’artisan : la relance repart')
  // une réponse d'un AUTRE client ou d'un autre compte n'arrête rien
  const f2 = facture(A, { client_email: 'autre@example.com' }); const m2 = monde({ comptes: [compte(A)], factures: [f2], messages: [{ artisan_id: A, contact: 'quelquun@example.com', sens: 'in', sent_at: `${il(1)}T09:00:00Z` }, { artisan_id: 'art-B', contact: 'autre@example.com', sens: 'in', sent_at: `${il(1)}T09:00:00Z` }, { artisan_id: A, contact: 'autre@example.com', sens: 'out', sent_at: `${il(1)}T09:00:00Z` }] }); const e2 = espion()
  await tour(m2, e2); ok(e2.envois.length === 1, 'un message sortant, d’un autre client ou d’un autre compte n’arrête pas la relance')
  // réponse AVANT l'échéance : ne compte pas
  const f3 = facture(A, { client_email: 'avant@example.com' }); const m3 = monde({ comptes: [compte(A)], factures: [f3], messages: [{ artisan_id: A, contact: 'avant@example.com', sens: 'in', sent_at: `${il(30)}T09:00:00Z` }] }); const e3 = espion()
  await tour(m3, e3); ok(e3.envois.length === 1, 'un message ancien (avant l’échéance) ne bloque pas')
}
{ // arrêt manuel de l'artisan
  const f = facture(A); const m = monde({ comptes: [compte(A)], factures: [f] }); const e = espion()
  m.arretsBd.set(A, new Map([[f.id, { raison: 'artisan', le: '2026-10-19T10:00:00Z', reprise_le: null }]]))
  await tour(m, e); ok(e.envois.length === 0, 'arrêt manuel : rien ne part')
  m.arretsBd.get(A).get(f.id).reprise_le = '2026-10-19T12:00:00Z'
  await tour(m, e); ok(e.envois.length === 1, 'reprise manuelle : la relance repart')
}
{ // jamais deux le même jour au même client ; le lendemain, la suivante
  const mail = 'meme@example.com'
  const f1 = facture(A, { client_email: mail, date_echeance: il(3), numero: 'F-A' }); const f2 = facture(A, { client_email: mail, date_echeance: il(4), numero: 'F-B' })
  const m = monde({ comptes: [compte(A)], factures: [f1, f2] }); const e = espion()
  await tour(m, e); ok(e.envois.length === 1, 'deux factures du même client le même jour : un seul message')
  await tour(m, e); ok(e.envois.length === 1, 'rejeu : toujours un seul message')
  await tour(m, e, { maintenant: plus(1) }); ok(e.envois.length === 2, 'le lendemain, l’autre facture est relancée')
  const parJour = {}; for (const x of m.rows) parJour[`${x.destinataire}|${x.jour}`] = (parJour[`${x.destinataire}|${x.jour}`] ?? 0) + 1
  ok(Object.values(parJour).every((v) => v === 1), 'le journal ne contient jamais deux relances le même jour au même client')
}
{ // plafond par compte et par jour
  const fs15 = Array.from({ length: 15 }, (_, i) => facture(A, { client_email: `c${i}@example.com`, numero: `F-${i}` }))
  const m = monde({ comptes: [compte(A)], factures: fs15 }); const e = espion()
  const b = await tour(m, e); ok(e.envois.length === R.MAX_PAR_COMPTE_JOUR && b.envoyees === R.MAX_PAR_COMPTE_JOUR, `plafond par compte et par jour : ${R.MAX_PAR_COMPTE_JOUR} (reçu ${e.envois.length})`)
  await tour(m, e); ok(e.envois.length === R.MAX_PAR_COMPTE_JOUR, 'rejeu le même jour : le plafond tient')
  await tour(m, e, { maintenant: plus(1) }); ok(e.envois.length === 15, 'le lendemain, le reste part')
}
{ // isolation entre comptes
  const B = 'art-B'; const C = 'art-C'
  const fa = facture(A, { client_email: 'ca@example.com', numero: 'F-A1' }); const fb = facture(B, { client_email: 'cb@example.com', numero: 'F-B1' }); const fc = facture(C, { client_email: 'cc@example.com', numero: 'F-C1' })
  const m = monde({ comptes: [compte(A, { nom: 'Artisan A' }), compte(B, { nom: 'Artisan B' }), { id: C, reglages: REG({ actif: false }) }], factures: [fa, fb, fc], fuiteDans: A }); const e = espion()
  await tour(m, e)
  const versA = e.envois.filter((x) => x.fromName === 'Artisan A'); const versB = e.envois.filter((x) => x.fromName === 'Artisan B')
  ok(versA.length === 1 && versA[0].to === 'ca@example.com' && /F-A1/.test(versA[0].text) && !/F-B1|F-C1/.test(versA[0].text), 'compte A : seulement ses factures')
  ok(versB.length === 1 && versB[0].to === 'cb@example.com' && /F-B1/.test(versB[0].text), 'compte B : seulement ses factures')
  ok(!e.envois.some((x) => x.to === 'cc@example.com'), 'compte C (non activé) : jamais relancé')
  ok(m.rows.every((j) => m.facturesBd.find((f) => f.id === j.facture_id)?.artisan_id === j.artisan_id), 'le journal ne mélange jamais deux comptes')
  ok(e.envois.length === 2, 'la fuite simulée du magasin (facture d’un autre compte dans la liste de A) est ignorée')
  // même destinataire chez deux artisans : les deux partent (la règle « un par jour » est PAR artisan)
  const g1 = facture(A, { client_email: 'partage@example.com' }); const g2 = facture(B, { client_email: 'partage@example.com' })
  const m2 = monde({ comptes: [compte(A), compte(B)], factures: [g1, g2] }); const e2 = espion(); await tour(m2, e2)
  ok(e2.envois.length === 2, 'un même client de deux artisans reçoit un message de chacun')
}
{ // pause générale
  const m = monde({ comptes: [compte(A)], factures: [facture(A), facture(A)] }); const e = espion()
  const b = await tour(m, e, { sortiePermise: async () => false }); ok(e.envois.length === 0 && b.interrompue === true, 'pause générale : rien ne part')
  let appels = 0
  const m2 = monde({ comptes: [compte(A)], factures: [facture(A), facture(A), facture(A)] }); const e2 = espion()
  const b2 = await tour(m2, e2, { sortiePermise: async () => ++appels <= 1 })
  ok(e2.envois.length === 1 && b2.interrompue === true, 'la pause posée en cours de passage arrête le lot (relue avant chaque envoi)')
}
{ // échec d'envoi : la prise est rendue, la relance repart au passage suivant
  const m = monde({ comptes: [compte(A)], factures: [facture(A)] }); const e = espion(() => 'Resend en panne')
  const b = await tour(m, e); ok(e.envois.length === 0 && m.rows.length === 0 && b.erreurs.length === 1, 'envoi refusé : prise rendue, rien dans le journal')
  const e2 = espion(); const b2 = await tour(m, e2); ok(e2.envois.length === 1 && b2.envoyees === 1, 'au passage suivant la relance repart')
  const m3 = monde({ comptes: [compte(A)], factures: [facture(A), facture(A), facture(A)] }); const e3 = espion(() => 'plafond quotidien d’envois atteint')
  const b3 = await tour(m3, e3); ok(b3.plafond === true && m3.rows.length === 0, 'plafond d’envois du produit atteint : le passage s’arrête sans rien noter')
}
{ // fondateurs, suspendus, en pause, sans e-mail, base en panne pour un compte
  const B = 'art-B'
  const m = monde({ comptes: [compte('f', { fondateur: true }), compte('s', { suspendu: true }), compte('p', { pause: true }), compte('x', { email: null }), compte('panne'), compte(B)], factures: ['f', 's', 'p', 'x', 'panne'].map((id) => facture(id)).concat([facture(B)]), casse: 'panne' }); const e = espion()
  const b = await tour(m, e)
  ok(e.envois.length === 1 && e.envois[0].fromName === 'Dupont Rénovation' && m.rows.length === 1 && m.rows[0].artisan_id === B, 'fondateur, suspendu, en pause, sans e-mail : ignorés ; la panne d’un compte n’arrête pas les autres')
  ok(b.erreurs.some((x) => /panne/.test(x)), 'la panne d’un compte est notée dans le bilan')
}
// 15/10 (Benj, « En Studio ») : un compte Essentiel (ou en essai) qui avait coché la case ne reçoit plus rien ; un Studio, si.
{
  const m = monde({ comptes: [compte('ess', { plan: 'essentiel' }), compte('ess2', { plan: 'gratuit' }), compte('stu', { plan: 'studio' }), compte('sig', { plan: 'signature' })], factures: ['ess', 'ess2', 'stu', 'sig'].map((id) => facture(id)) }); const e = espion()
  const b = await tour(m, e)
  const aQui = new Set(m.rows.map((r) => r.artisan_id))
  ok(e.envois.length === 2 && aQui.has('stu') && aQui.has('sig') && !aQui.has('ess') && !aQui.has('ess2'), 'Essentiel et Essai : aucune relance d’impayé ne part ; Studio et Signature : oui')
  ok(m.rows.every((r) => r.statut === 'envoyee'), 'les relances des comptes servis sont confirmées')
  ok(b.erreurs.length === 0, 'un compte non servi n’est pas une erreur')
}
ok(reseau === 0, `aucune tentative réseau pendant les tests (${reseau})`)

// ─── 4. Les sources : offre, drapeau, cron, route, migration, écran, comparatif ───────────────────────────────────────────────
ok(F.FLAGS.relancesImpayes === true && typeof F.FLAGS.relancesImpayes === 'boolean', 'drapeau relancesImpayes présent')
// 15/10 (Benj, « En Studio ») : Essai et Essentiel n'ont plus la capacité ; Studio, Signature et Business l'ont.
for (const id of ['studio', 'signature', 'business']) ok(P.peut(id, 'factures.relances') === true, `l’offre ${id} a la capacité factures.relances`)
for (const id of ['gratuit', 'essentiel']) ok(P.peut(id, 'factures.relances') === false, `l’offre ${id} n’a PAS la capacité factures.relances`)
ok(P.offreMinimale('factures.relances') === 'studio', 'capacité factures.relances : dès Studio')
// 15/10 (Benj, « Dans Essentiel il n'y a PAS de plateforme ») : les relances de CONVERSATION (J+2, J+5, J+10) font partie de la plateforme, dès Studio.
ok(P.peut('essentiel', 'relances') === false && P.peut('gratuit', 'relances') === false && P.peut('studio', 'relances') === true && P.offreMinimale('relances') === 'studio', 'les relances de CONVERSATION (plateforme) sont dès Studio')
const ligne = P.GRILLE_COMPLETE.find((l) => l.capacites.includes('factures.relances'))
ok(!!ligne && ligne.flag === 'relancesImpayes' && /impayées/.test(ligne.label), 'la grille des offres annonce les relances d’impayés (une ligne, drapeau relancesImpayes)')
ok(P.GRILLE.some((l) => l === ligne), 'la ligne est visible drapeau levé')
ok(!P.pointsForts('essentiel').some((t) => /factures impayées/.test(t)) && P.pointsForts('studio').some((t) => /factures impayées/.test(t)) && P.pointsForts('signature').some((t) => /factures impayées/.test(t)), 'la ligne est dans les points forts de Studio et de Signature, pas d’Essentiel')

const cron = lire('app/api/cron/relances/route.ts')
ok(/actif\('relancesImpayes'\)/.test(cron) && /tourRelancesImpayes\(/.test(cron), 'le cron appelle le passage derrière le drapeau')
ok(/!enPause && !interrompue && actif\('relancesImpayes'\)/.test(cron), 'jamais sous pause générale')
ok(/sortiePermise: async \(\) => \(await sortiePermise\(\)\)\.permise/.test(cron), 'la pause est relue avant chaque envoi')
ok(/transactionnel: true/.test(cron.slice(cron.indexOf('tourRelancesImpayes('), cron.indexOf('tourRelancesImpayes(') + 600)), 'les relances d’impayés puisent dans la part « produit » du plafond d’e-mails')
ok(/enregistrerPassage\('relances-impayes'/.test(cron), 'le passage est enregistré (visible dans le Poste)')
const tourSrc = lire('lib/relancesImpayesTour.ts')
ok(!/from '@\/lib\/(email|supabaseAdmin)'/.test(tourSrc) && !/sendEmail/.test(tourSrc.replace(/\/\/.*$/gm, '')), 'le passage n’importe ni l’e-mail ni la base : tout est injecté')

const mig = fs.readdirSync(path.join(RACINE, 'supabase/migrations')).filter((x) => x.startsWith('0159_'))
ok(mig.length === 1 && mig[0] === '0159_relances_impayes.sql', `une seule migration 0159 (${mig.join(', ')})`)
const sql = lire('supabase/migrations/0159_relances_impayes.sql').replace(/--.*$/gm, '')
ok(/actif\s+boolean not null default false/.test(sql), 'migration : désactivé par défaut')
ok(/default '\{3,10,21\}'/.test(sql), 'migration : calendrier par défaut {3,10,21}')
ok(/unique \(facture_id, rang\)/.test(sql) && /unique \(artisan_id, destinataire, jour\)/.test(sql), 'migration : clés uniques (un rang par facture, un message par client et par jour)')
for (const t of ['relances_impayes_reglages', 'relances_impayes', 'relances_impayes_arrets']) ok(new RegExp(`alter table public\\.${t} enable row level security`).test(sql), `migration : RLS sur ${t}`)
ok(/auth\.uid\(\) = artisan_id/.test(sql) && !/to anon|to public|grant/i.test(sql), 'migration : politiques limitées au propriétaire, aucun droit public')
ok(/relances_impayes_coherence/.test(sql) && /f\.artisan_id = new\.artisan_id/.test(sql), 'migration : déclencheur d’isolation (facture du même artisan)')
ok(!/drop table|truncate|delete from/i.test(sql), 'migration : aucune suppression de données')

const route = lire('app/api/factures/relances-auto/route.ts')
ok((route.match(/actif\('relancesImpayes'\)/g) ?? []).length >= 1 && (route.match(/if \(ferme\(\)\)/g) ?? []).length === 3, 'route : 404 drapeau baissé sur GET, PUT et POST')
ok((route.match(/authArtisan\(req\)/g) ?? []).length === 3, 'route : session exigée sur chaque méthode')
ok((route.match(/session.uid/g) ?? []).length >= 10, 'route : chaque lecture/écriture porte l’identifiant de la session')
ok(/eq\('artisan_id', session\.uid\)/.test(route.slice(route.indexOf('export async function POST'))), 'route : la facture visée doit être celle du compte')
ok(!/body\.artisan_id|b\.artisan_id|req\.json\(\)\)\.artisan/.test(route), 'route : jamais un identifiant de compte venu de la requête')

const ecran = lire('app/factures/RelancesAuto.tsx'); const page = lire('app/factures/page.tsx')
ok(/Relancer automatiquement mes factures échues/.test(ecran), 'écran : « Relancer automatiquement mes factures échues »')
ok(/checked=\{actif\}/.test(ecran) && /useState\(donnees\.reglages\.actif\)/.test(ecran), 'écran : la case reflète le réglage enregistré (désactivé par défaut)')
ok(/Aperçu/.test(ecran) && /textarea/.test(ecran) && /Rétablir le texte par défaut/.test(ecran), 'écran : texte prévisualisable, modifiable, rétablissable')
ok(/<RelancesAuto\b/.test(page) && /etatPourEcran/.test(page) && /Arrêter les relances/.test(page) && /Reprendre les relances/.test(page), 'page Factures : réglage, état par facture, arrêt et reprise')

const comp = await imp('lib/comparatifConcurrents.ts')
ok(/impay/i.test(comp.PRESTI.relances) && !/pas de relance automatique des impayés/.test(comp.PRESTI.relances), 'comparatif : la ligne relances de Presti parle des impayés automatiques (livrés)')

if (echecs.length) { console.log(`❌ relances-impayes-qa : ${echecs.length} échec(s) sur ${n}`); for (const e of echecs) console.log('  - ' + e); process.exit(1) }
console.log(`✅ relances-impayes-qa : ${n}/${n} contrôles — calendrier, opt-in, arrêts, idempotence, isolation, pause, plafond, sources`)
