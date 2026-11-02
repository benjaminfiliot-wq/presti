// Les relances AUTOMATIQUES des factures impayées (lib/relancesImpayes.ts, lib/relancesImpayesTour.ts, migration 0159).
// Ce juge rejoue le passage quotidien avec une base EN MÉMOIRE (mêmes clés uniques que la migration) et un e-mail ESPIONNÉ :
// aucun envoi réel, aucune base distante, aucun compte créé (donc rien à nettoyer ; si une version future crée un compte de test,
// son ménage doit être dans un finally). Il vérifie : opt-in, calendrier, arrêt (payée, annulée, avoir, réponse du client, arrêt manuel),
// idempotence (rejeu, passages simultanés), jamais deux le même jour, plafond par compte, isolation entre comptes, pause générale,
// échec d'envoi, et les sources (cron, route, migration, écran, offre, comparatif). Il s'attaque aussi lui-même (mutations).
// 25/10 (Benj, deux offres) : SIGNATURE — la relance part seule (comptes de ce juge par défaut) ; STUDIO — rien ne part, la relance
// est gardée « a_valider » (sujet, texte), l'artisan est notifié (espionné), et elle n'est pas reproposée tant qu'il ne l'a pas traitée.
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

function monde({ comptes, factures = [], messages = [], fuiteDans = null, casse = null, sansUnicite = false, ailleurs = new Set(), contestations = new Map() }) {
  const journal = []; const arrets = new Map(); const lectures = { n: 0 }; const notifs = []
  const reg = new Map(comptes.map((c) => [c.id, c]))
  const m = {
    rows: journal, arretsBd: arrets, lectures, facturesBd: factures, notifs, casseAValider: false, casseContestation: false,
    async comptes() { lectures.n++; return comptes.filter((c) => c.reglages).map((c) => ({ artisan_id: c.id, reglages: c.reglages })) },
    async artisan(id) { lectures.n++; if (casse === id) throw new Error('base en panne pour ce compte'); const c = reg.get(id); return c ? { id, nom: c.nom ?? 'Dupont Rénovation', email: c.email === undefined ? `${id}@artisan.test` : c.email, plan: c.plan ?? 'signature', is_founder: !!c.fondateur, leads_pause: !!c.pause } : null },
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
    // 02/11 (S4) : le registre commun, en mémoire — `ailleurs` : les factures dont le client vient d'être relancé par un autre chemin.
    async relanceAilleurs(art, f) { lectures.n++; return ailleurs.has(f.id) },
    // 02/11 (R1, 032-015) : `contestations` — les factures dont le client conteste (sujet trouvé dans ses messages depuis l'émission).
    async contestation(art, f) { lectures.n++; if (m.casseContestation) throw new Error('messages du client illisibles'); return contestations.get(f.id) ?? null },
    async reponseClient(art, f, depuis) { return messages.some((x) => x.artisan_id === art && x.contact.toLowerCase() === String(f.client_email).toLowerCase() && x.sens === 'in' && x.sent_at > depuis) },
    async prendre(e) {
      await Promise.resolve() // laisse passer un autre passage : la concurrence est réelle
      if (!sansUnicite && journal.some((x) => x.facture_id === e.facture_id && x.rang === e.rang)) return null
      if (!sansUnicite && journal.some((x) => x.artisan_id === e.artisan_id && x.destinataire === e.destinataire && x.jour === e.jour)) return null
      const id = uuid('rel'); journal.push({ id, ...e, statut: 'prise', envoyee_le: null }); return id
    },
    async confirmer(id, maintenant) { const e = journal.find((x) => x.id === id); e.statut = 'envoyee'; e.envoyee_le = maintenant.toISOString() },
    async relacher(id) { const i = journal.findIndex((x) => x.id === id && x.statut === 'prise'); if (i >= 0) journal.splice(i, 1) },
    async aValider(id, c) {
      if (m.casseAValider) throw new Error('contrainte de statut (0181 non appliquée)')
      const e = journal.find((x) => x.id === id && x.statut === 'prise'); if (!e) throw new Error('préparation : la relance prise a disparu')
      e.statut = 'a_valider'; e.sujet = c.sujet; e.texte = c.texte
    },
    async notifierPreparee(art, n) { notifs.push({ artisan_id: art.id, email: art.email, type: 'proposition', ...n }) },
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
const dec = (f, o = {}) => R.decider({ facture: f, reglages: REG(o.reglages), journal: o.journal ?? [], arretee: !!o.arretee, reponseClient: o.reponse, destinatairesDuJour: o.dest, relanceeAilleurs: o.ailleurs, maintenant: o.maintenant ?? MAINTENANT })
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
// 02/11 (S4) : relancé par un AUTRE chemin depuis moins de 3 jours (registre commun) : rien ; sans cela, la relance part.
{ const f = facture(A); rienPour(f, 'deja_relancee_ailleurs', { ailleurs: true }); ok(dec(f, { ailleurs: false }).action === 'envoyer', 'sans relance ailleurs, la même facture part') }
ok(/autre chemin/.test(R.LIBELLE_RAISON.deja_relancee_ailleurs ?? ''), 'la raison « deja_relancee_ailleurs » a son libellé')

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
{ // 02/11 (S4) : le client vient d'être relancé par un AUTRE chemin (assistant, pilote, CRM, conversation) — registre commun
  const f = facture(A); const ailleurs = new Set([f.id])
  const m = monde({ comptes: [compte(A)], factures: [f], ailleurs }); const e = espion()
  const b = await tour(m, e)
  ok(b.envoyees === 0 && e.envois.length === 0 && m.rows.length === 0, `relancé ailleurs depuis moins de 3 jours : rien ne part, rien n’est pris (reçu ${e.envois.length} envoi(s), ${m.rows.length} prise(s))`)
  ailleurs.clear()
  const b2 = await tour(m, e, { maintenant: plus(1) })
  ok(b2.envoyees === 1 && e.envois.length === 1, 'le registre libre, la relance due part au passage suivant (rien n’est perdu)')
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
  ok(aQui.has('stu') && aQui.has('sig') && !aQui.has('ess') && !aQui.has('ess2'), 'Essentiel et Essai : aucune relance d’impayé (ni envoyée ni préparée) ; Studio et Signature : servis')
  // 25/10 (Benj, deux offres) : Signature — elle part seule ; Studio — elle est préparée, rien ne part.
  ok(e.envois.length === 1 && e.envois[0].replyTo === 'sig@artisan.test', `seul le compte Signature envoie (reçu ${e.envois.length} envoi(s))`)
  ok(m.rows.find((r) => r.artisan_id === 'sig')?.statut === 'envoyee' && m.rows.find((r) => r.artisan_id === 'stu')?.statut === 'a_valider', 'Signature : confirmée « envoyee » ; Studio : « a_valider »')
  ok(b.envoyees === 1 && b.preparees === 1, `bilan : 1 envoyée, 1 préparée (reçu ${b.envoyees}/${b.preparees})`)
  ok(b.erreurs.length === 0, 'un compte non servi n’est pas une erreur')
}

// ─── 3 bis. Offre STUDIO (décision du 25/10) : tout est préparé, RIEN ne part sans la validation de l'artisan ────────────────
ok(P.peut('studio', 'factures.relances') === true && P.peut('studio', 'factures.relances.auto') === false, 'Studio : relances préparées, pas automatiques')
for (const id of ['signature', 'business']) ok(P.peut(id, 'factures.relances.auto') === true, `${id} : les relances d’impayés partent seules`)
for (const id of ['gratuit', 'essentiel']) ok(P.peut(id, 'factures.relances.auto') === false, `${id} : pas de relance automatique`)
{
  const S = 'art-studio'
  const f = facture(S, { date_echeance: il(3), numero: 'F-2026-0777', total_ttc: 1280, client_nom: 'Mme Martin', client_email: 'Martin@Example.com' })
  const m = monde({ comptes: [compte(S, { plan: 'studio', nom: 'Martin Plomberie' })], factures: [f] }); const e = espion()
  const b = await tour(m, e)
  ok(e.envois.length === 0 && b.envoyees === 0, `Studio : AUCUNE relance envoyée au client (reçu ${e.envois.length})`)
  ok(b.preparees === 1, `Studio : le bilan compte 1 relance préparée (reçu ${b.preparees})`)
  const r = m.rows[0] ?? {}
  ok(m.rows.length === 1 && r.statut === 'a_valider' && r.rang === 1 && r.jour === '2026-10-20' && !r.envoyee_le, 'Studio : une relance « a_valider » au journal, rang 1, jamais marquée envoyée')
  ok(r.destinataire === 'martin@example.com', 'Studio : le destinataire est gardé (normalisé)')
  ok(/F-2026-0777/.test(r.sujet ?? '') && /Martin Plomberie/.test(r.sujet ?? ''), 'Studio : le sujet est gardé (numéro, artisan)')
  ok(/Mme Martin/.test(r.texte ?? '') && /F-2026-0777/.test(r.texte ?? '') && /1\s?280/.test(r.texte ?? ''), 'Studio : le texte est gardé, rempli (client, numéro, montant)')
  ok((r.texte ?? '').endsWith(R.PIED_VALIDE) && !/automatiquement/.test(r.texte ?? ''), 'Studio : le message préparé ne prétend pas être « envoyé automatiquement »')
  ok(R.lireRelanceRetouchee(r.sujet, r.texte).ok === true, 'Studio : le message préparé passe la validation de la route (envoyable tel quel)')
  // La notification à l'artisan : espionnée, type « proposition », sujet imposé.
  ok(m.notifs.length === 1, `Studio : l’artisan est notifié une fois (reçu ${m.notifs.length})`)
  const n = m.notifs[0] ?? {}
  ok(n.artisan_id === S && n.email === `${S}@artisan.test` && n.type === 'proposition', 'Studio : notification à l’artisan du compte, type « proposition »')
  ok(n.sujet === 'Relance de facture prête à valider — F-2026-0777', `Studio : sujet de la notification (reçu « ${n.sujet} »)`)
  ok(/Factures/.test(n.texte ?? '') && /valid/.test(n.texte ?? ''), 'Studio : la notification invite à valider dans Factures')
  ok(R.etatPourEcran({ facture: f, reglages: REG(), journal: m.rows, arret: null, maintenant: MAINTENANT }) === 'Relance 1 prête à valider (préparée le 20/10/2026)', 'Studio : l’écran dit « Relance 1 prête à valider »')
  // Pas de reproposition : ni le même jour, ni plus tard, ni la suivante (J+10) tant qu'elle attend.
  const b2 = await tour(m, e); ok(b2.preparees === 0 && m.rows.length === 1 && m.notifs.length === 1 && e.envois.length === 0, 'Studio : rejeu le même jour — rien de plus')
  const b3 = await tour(m, e, { maintenant: plus(3) }); ok(b3.preparees === 0 && m.rows.length === 1 && m.notifs.length === 1, 'Studio : 3 jours plus tard — pas de reproposition')
  f.date_echeance = il(10)
  const b4 = await tour(m, e, { maintenant: plus(3) }); ok(b4.preparees === 0 && m.rows.length === 1 && e.envois.length === 0, 'Studio : J+10 atteint — la relance 2 attend que la 1 soit traitée')
  // L'artisan l'envoie (simulé : ce que fait la route a-valider) → la suivante vient à son heure, préparée à son tour.
  m.rows[0].statut = 'envoyee'; m.rows[0].envoyee_le = `${il(0)}T09:00:00Z`; m.rows[0].jour = il(0)
  const b5 = await tour(m, e, { maintenant: plus(7) }); ok(b5.preparees === 1 && m.rows.length === 2 && m.rows[1].rang === 2 && m.rows[1].statut === 'a_valider' && e.envois.length === 0, 'Studio : après validation de la 1, la 2 est PRÉPARÉE (pas envoyée) à son heure')
  // L'artisan l'écarte → son rang n'est pas reproposé ; la 3 viendra à son heure.
  m.rows[1].statut = 'rejetee'
  const b6 = await tour(m, e, { maintenant: plus(9) }); ok(b6.preparees === 0 && m.rows.length === 2, 'Studio : une relance écartée n’est pas reproposée')
  f.date_echeance = il(21)
  const b7 = await tour(m, e, { maintenant: plus(9) }); ok(b7.preparees === 1 && m.rows.at(-1).rang === 3 && m.rows.at(-1).statut === 'a_valider' && e.envois.length === 0, 'Studio : après un écart, la relance suivante est préparée à son heure')
}
{ // Studio : la décision pure — une relance à valider bloque la facture ; une écartée occupe son rang
  const f = facture(A, { date_echeance: il(10) })
  rienPour(f, 'a_valider', { journal: [{ facture_id: f.id, rang: 1, jour: il(7), statut: 'a_valider' }] })
  rienPour(f, 'a_valider', { journal: [{ facture_id: f.id, rang: 1, jour: il(20), statut: 'a_valider' }] })
  const d = dec(f, { journal: [{ facture_id: f.id, rang: 1, jour: il(7), statut: 'rejetee' }] }); ok(d.action === 'envoyer' && d.rang === 2, 'rang 1 écarté : la relance 2 vient à son heure')
  rienPour({ ...f, statut: 'payee' }, 'payee', { journal: [{ facture_id: f.id, rang: 1, jour: il(7), statut: 'a_valider' }] })
  const autre = facture(A, { date_echeance: il(3) }); const d2 = dec(autre, { journal: [{ facture_id: f.id, rang: 1, jour: il(7), statut: 'a_valider' }] }); ok(d2.action === 'envoyer', 'une relance à valider ne bloque que SA facture')
  ok(!!R.LIBELLE_RAISON.a_valider && /validation/.test(R.LIBELLE_RAISON.a_valider), 'la raison « a_valider » a son libellé')
}
{ // Studio : sans 0181 (la base refuse « a_valider ») — la prise est rendue, rien ne part, l'erreur est notée
  const S = 'art-studio2'
  const m = monde({ comptes: [compte(S, { plan: 'studio' })], factures: [facture(S)] }); m.casseAValider = true; const e = espion()
  const b = await tour(m, e)
  ok(e.envois.length === 0 && m.rows.length === 0 && b.preparees === 0 && m.notifs.length === 0, 'Studio sans 0181 : rien ne part, rien n’est gardé, personne n’est notifié (fail-closed)')
  ok(b.erreurs.some((x) => /non préparée/.test(x)), 'Studio sans 0181 : l’erreur est notée au bilan')
  m.casseAValider = false; const b2 = await tour(m, e); ok(b2.preparees === 1 && e.envois.length === 0, 'Studio : 0181 posée, la relance est préparée au passage suivant')
}
{ // Studio : plafond par compte et par jour — les préparées comptent
  const S = 'art-studio3'
  const fs15 = Array.from({ length: 15 }, (_, i) => facture(S, { client_email: `s${i}@example.com` }))
  const m = monde({ comptes: [compte(S, { plan: 'studio' })], factures: fs15 }); const e = espion()
  const b = await tour(m, e); ok(b.preparees === R.MAX_PAR_COMPTE_JOUR && e.envois.length === 0 && m.notifs.length === R.MAX_PAR_COMPTE_JOUR, `Studio : au plus ${R.MAX_PAR_COMPTE_JOUR} relances préparées par jour, aucune envoyée`)
}
{ // Studio : la pause générale arrête aussi la préparation ; Signature reste inchangée dans le même passage
  const S = 'art-studio4'
  const m = monde({ comptes: [compte(S, { plan: 'studio' })], factures: [facture(S)] }); const e = espion()
  const b = await tour(m, e, { sortiePermise: async () => false }); ok(b.interrompue && m.rows.length === 0 && m.notifs.length === 0, 'Studio : sous pause générale, rien n’est préparé ni notifié')
  const m2 = monde({ comptes: [compte('s5', { plan: 'studio' }), compte('g5', { plan: 'signature' })], factures: [facture('s5'), facture('g5')] }); const e2 = espion()
  const b2 = await tour(m2, e2); ok(b2.envoyees === 1 && b2.preparees === 1 && e2.envois.every((x) => x.replyTo === 'g5@artisan.test') && m2.notifs.every((x) => x.artisan_id === 's5'), 'même passage : Signature envoie, Studio prépare — chacun pour son compte')
}
{ // la validation d'une relance retouchée (règle partagée par l'écran et la route)
  const L = R.lireRelanceRetouchee
  const corps = 'Bonjour, la facture F-1 reste à régler. Merci.'
  ok(L('Rappel — facture F-1', corps).ok, 'retouche valable acceptée')
  ok(!L('', corps).ok, 'sujet vide refusé')
  const inj = L('Rappel\r\nBcc: x@y.z', corps); ok(inj.ok && !/[\r\n]/.test(inj.sujet), 'sujet : retours à la ligne retirés (pas d’en-tête injecté)')
  ok(!L('x'.repeat(151), corps).ok, 'sujet trop long refusé')
  ok(!L('Rappel', 'Payez.').ok, 'message trop court refusé')
  ok(!L('Rappel', 'x'.repeat(R.MESSAGE_VALIDE_MAX + 1)).ok, 'message trop long refusé')
  ok(!L('Rappel', 'Bonjour, payez sur https://exemple.com/payer merci beaucoup.').ok, 'lien refusé dans le message')
  ok(!L(42, null).ok, 'types illisibles refusés')
}
{ // 02/11 (cinquième audit 032-007, voisin moyen) : une contestation écrite AVANT l'échéance arrête les relances — la règle pure
  const CONTESTE = ['Je conteste cette facture, les travaux ne sont pas finis', 'Litige : je ne paierai pas tant que la fuite n’est pas réparée',
    'Mon avocat vous contactera', 'Je refuse de payer ce montant', 'Vous avez abîmé mon parquet, c’est un dégât']
  const rates = CONTESTE.filter((t) => R.contestationDuClient([t], []) === null)
  ok(rates.length === 0, `contestation (032-007) : les ${CONTESTE.length} contestations sont lues quelle qu’en soit la date — manquées : ${rates.join(' | ')}`)
  ok(R.contestationDuClient(['Merci pour la facture, je règle la semaine prochaine', 'Bien reçu'], []) === null, 'contestation : un message ordinaire du client n’en est pas une')
  ok(R.contestationDuClient(['Le carrelage est fissuré'], ['carrelage']) === 'carrelage' && R.contestationDuClient(['Je conteste'], []) !== null, 'contestation : les mots de l’artisan comptent, et le plancher reste sans eux')
  ok(R.contestationDuClient([null, 42, '', 'Je conteste la facture'], null) !== null, 'contestation : les contenus illisibles sont ignorés, les autres lus')
  ok(R.MESSAGES_CONTESTATION_RELUS >= 10, 'contestation : au moins 10 messages entrants relus, toutes dates')
}
{ // 02/11 (R1, audit 032-015) : une contestation ne coupe plus la relance, elle la rend en CARTE — même en Signature ; rien ne part seul.
  const G = 'art-sig-conteste'
  const f = facture(G, { date_echeance: il(3), numero: 'F-2026-0888', client_email: 'conteste@example.com' })
  const m = monde({ comptes: [compte(G, { plan: 'signature' })], factures: [f], contestations: new Map([[f.id, 'conteste']]) }); const e = espion()
  const b = await tour(m, e)
  ok(e.envois.length === 0 && b.envoyees === 0 && b.preparees === 1 && b.arretees === 0, `R1 : Signature, client qui conteste — rien ne part, la relance est préparée, aucun arrêt (reçu ${JSON.stringify(b)})`)
  ok(m.rows.length === 1 && m.rows[0].statut === 'a_valider' && !m.arretsBd.get(G)?.has(f.id), 'R1 : la relance contestée est « a_valider » au journal ; la facture n’est pas arrêtée (« le client a répondu » n’est pas écrit)')
  ok(m.notifs.length === 1 && m.notifs[0].texte.includes(R.MOTIF_SENSIBLE), 'R1 : l’artisan est prévenu avec le motif « le client conteste ou parle d’un sujet sensible : à relire »')
  const b2 = await tour(m, e, { maintenant: plus(3) }); ok(b2.preparees === 0 && e.envois.length === 0 && m.rows.length === 1, 'R1 : la carte bloque la facture tant qu’elle attend (ni renvoyée, ni reproposée)')
  const S = 'art-stu-conteste'; const fs2 = facture(S, { date_echeance: il(3) })
  const ms = monde({ comptes: [compte(S, { plan: 'studio' })], factures: [fs2], contestations: new Map([[fs2.id, 'litige']]) }); const es = espion()
  const bs = await tour(ms, es); ok(bs.preparees === 1 && es.envois.length === 0 && ms.notifs[0]?.texte.includes(R.MOTIF_SENSIBLE), 'R1 : Studio, client qui conteste — la relance reste préparée, avec le motif')
  const P = 'art-sig-panne'; const fp = facture(P, { date_echeance: il(3) })
  const mp = monde({ comptes: [compte(P, { plan: 'signature' })], factures: [fp] }); mp.casseContestation = true; const ep = espion()
  const bp = await tour(mp, ep); ok(ep.envois.length === 0 && bp.envoyees === 0 && bp.preparees === 0 && mp.rows.length === 0 && bp.erreurs.length === 1, 'R1 : messages du client illisibles — rien ne part, rien n’est pris, l’erreur est dite (côté sûr)')
  const Q = 'art-sig-ordinaire'; const fq = facture(Q, { date_echeance: il(3) })
  const mq = monde({ comptes: [compte(Q, { plan: 'signature' })], factures: [fq] }); const eq = espion()
  const bq = await tour(mq, eq); ok(bq.envoyees === 1 && eq.envois.length === 1 && mq.notifs.length === 0, 'R1 témoin : Signature sans contestation — la relance part seule, personne n’est dérangé')
  ok(R.debutContestation({ date_emission: '2026-10-01', emise_le: null }) === '2026-09-30T22:00:00.000Z' && R.debutContestation({ date_emission: '2026-10-01', emise_le: '2026-09-29T09:00:00Z' }) === '2026-09-29T09:00:00.000Z'
    && R.debutContestation({ date_emission: null, emise_le: null }) === null && R.debutContestation({ date_emission: 'n’importe quoi', emise_le: 'pas une date' }) === null,
    'R1 : debutContestation — le plus tôt de emise_le et du jour d’émission (minuit à Paris, pris large) ; illisible : null (lecture sans borne)')
  const n0 = R.notificationPreparee({ numero: 'F-1', client: null, rang: 1 }); const n1 = R.notificationPreparee({ numero: 'F-1', client: null, rang: 1, motif: R.MOTIF_SENSIBLE })
  ok(!n0.texte.includes('Attention') && n1.texte.includes(`Attention : ${R.MOTIF_SENSIBLE}.`) && n0.sujet === n1.sujet, 'R1 : la notification dit le motif seulement quand il y en a un ; le sujet imposé ne change pas')
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
// 25/10 : l'Essentiel n'est plus vendu — pointsForts ne prend plus que 'studio' | 'signature' (PlanPayant) ; la ligne dit la vérité de chaque offre.
ok(P.pointsForts('studio').some((t) => /factures impayées/.test(t) && /vous les validez/.test(t)) && P.pointsForts('signature').some((t) => /factures impayées/.test(t) && /partent seules/.test(t)), 'la ligne est dans les points forts de Studio (préparées, vous validez) et de Signature (partent seules)')

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

// 25/10 — offre Studio : le passage choisit sur la capacité, la migration 0181 élargit le journal, la route a-valider envoie ou écarte.
ok(/peut\(art\.plan, 'factures\.relances\.auto'\)/.test(tourSrc) && /if \(!auto \|\| sensible\)/.test(tourSrc), 'le passage distingue Signature (auto) et Studio (à valider) sur la capacité factures.relances.auto ; une contestation rend la carte même en Signature')
const mig181 = fs.readdirSync(path.join(RACINE, 'supabase/migrations')).filter((x) => x.startsWith('0181_'))
ok(mig181.length === 1 && mig181[0] === '0181_relances_impayes_a_valider.sql', `une seule migration 0181 (${mig181.join(', ')})`)
ok(fs.existsSync(path.join(RACINE, 'supabase/migrations/_A_COLLER_sql_editor_0181_NU.sql')), 'migration 0181 : son jumeau à coller existe')
{
  const s181 = lire('supabase/migrations/0181_relances_impayes_a_valider.sql').replace(/--.*$/gm, '')
  ok(/add column if not exists sujet text;/.test(s181) && /add column if not exists texte text;/.test(s181), 'migration 0181 : colonnes sujet et texte, nullables')
  ok(/check \(statut in \('prise', 'envoyee', 'a_valider', 'rejetee'\)\)/.test(s181), 'migration 0181 : statuts prise, envoyee, a_valider, rejetee')
  ok(/statut <> 'a_valider' or \(sujet is not null and texte is not null\)/.test(s181), 'migration 0181 : une relance à valider porte son sujet et son texte')
  ok(!/drop table|truncate|delete from|grant|to anon|disable row level security/i.test(s181), 'migration 0181 : additive, aucun droit ajouté, RLS intacte')
}
const routeAV = lire('app/api/factures/relances-auto/a-valider/route.ts')
ok(/if \(ferme\(\)\) return NextResponse\.json\(\{ error: 'Introuvable' \}, \{ status: 404 \}\)/.test(routeAV) && /actif\('relancesImpayes'\)/.test(routeAV), 'route a-valider : 404 drapeau baissé')
ok(/authArtisan\(req\)/.test(routeAV) && (routeAV.match(/eq\('artisan_id', session\.uid\)/g) ?? []).length >= 8, 'route a-valider : session exigée, chaque lecture/écriture filtrée sur le compte de la session')
ok(!/b\??\.artisan_id|body\.artisan_id/.test(routeAV), 'route a-valider : jamais un identifiant de compte venu de la requête')
ok(/update\(\{ statut: 'rejetee' \}\)[^\n]*eq\('statut', 'a_valider'\)/.test(routeAV), 'route a-valider : écarter = a_valider → rejetee, conditionnel')
ok(/update\(\{ statut: 'prise', jour: aujourdhui/.test(routeAV) && routeAV.indexOf("statut: 'prise', jour") < routeAV.indexOf('await sendEmail('), 'route a-valider : la relance est PRISE (conditionnellement) AVANT l’envoi')
ok(/update\(\{ statut: 'a_valider', jour: ligne\.jour \}\)/.test(routeAV) && /update\(\{ statut: 'envoyee', envoyee_le/.test(routeAV), 'route a-valider : envoi refusé → rendue à valider ; envoi réussi → envoyee')
ok(/fromName: art\.data\.nom/.test(routeAV) && /replyTo: art\.data\.email/.test(routeAV) && /transactionnel: true/.test(routeAV), 'route a-valider : au nom de l’artisan, réponse vers lui')
ok(/f\.data\.statut !== 'emise'/.test(routeAV) && /relances_impayes_arrets/.test(routeAV) && /lireRelanceRetouchee/.test(routeAV), 'route a-valider : facture relue (toujours impayée, non arrêtée), retouche validée')
// 02/11 (audit 032-001, D6) : préparée le matin, la relance part au clic parfois des jours plus tard — le registre commun est relu AU DÉPART.
ok(/relanceRecente\(await historiqueRelances\(session\.uid, \{ type: 'facture', id: ligne\.facture_id \}\), new Date\(\), \{ sauf: 'impayes' \}\)/.test(routeAV)
  && routeAV.indexOf('historiqueRelances(session.uid') > 0 && routeAV.indexOf('historiqueRelances(session.uid') < routeAV.indexOf("statut: 'prise', jour")
  && /reg\.raison === 'illisible' \? NextResponse\.json\(\{ error: phrase \}, \{ status: 503 \}\)/.test(routeAV) && /code: 'deja_relance' \}, \{ status: 409 \}/.test(routeAV),
  'route a-valider : le registre commun des relances est relu AVANT la prise (sauf les impayés eux-mêmes) ; déjà relancé ailleurs = 409, illisible = 503 (audit 032-001, D6)')

const ecran = lire('app/factures/RelancesAuto.tsx'); const page = lire('app/factures/page.tsx')
ok(/À valider/.test(ecran) && />\{enCours === 'envoyer' \? 'Envoi…' : 'Envoyer'\}</.test(ecran) && /'Écarter'/.test(ecran) && /relances-auto\/a-valider/.test(ecran), 'écran : section « À valider » avec Envoyer et Écarter')
ok(/préparées automatiquement/.test(ecran) && /rien ne part sans vous/.test(ecran) && /partent seules/.test(ecran) && /donnees\.auto === true/.test(ecran), 'écran : Studio « préparées automatiquement, rien ne part sans vous » ; Signature « partent seules » ; Studio par défaut')
ok(/Relancer automatiquement mes factures échues/.test(ecran), 'écran : « Relancer automatiquement mes factures échues »')
ok(/checked=\{actif\}/.test(ecran) && /useState\(donnees\.reglages\.actif\)/.test(ecran), 'écran : la case reflète le réglage enregistré (désactivé par défaut)')
ok(/Aperçu/.test(ecran) && /textarea/.test(ecran) && /Rétablir le texte par défaut/.test(ecran), 'écran : texte prévisualisable, modifiable, rétablissable')
ok(/<RelancesAuto\b/.test(page) && /etatPourEcran/.test(page) && /Arrêter les relances/.test(page) && /Reprendre les relances/.test(page), 'page Factures : réglage, état par facture, arrêt et reprise')

// 02/11 (cinquième audit 032-007, puis R1 de l'audit 032-015) : le magasin lit la contestation dans les SEULS messages entrants du client,
// écrits depuis l'émission de la facture, avec les mots de l'artisan — jamais la demande d'origine (leads.message).
{
  const mag = lire('lib/relancesImpayesMagasin.ts')
  const corps = mag.slice(mag.indexOf('async contestation('), mag.indexOf('async prendre('))
  const repond = mag.slice(mag.indexOf('async reponseClient('), mag.indexOf('async contestation('))
  ok(/supabaseAdmin\.from\('messages'\)\.select\('contenu'\)\.in\('lead_id', ids\)\.eq\('sens', 'in'\)/.test(corps) && /const debut = debutContestation\(facture\)/.test(corps)
    && /if \(debut\) q = q\.gte\('sent_at', debut\)/.test(corps) && /\.limit\(MESSAGES_CONTESTATION_RELUS\)/.test(corps)
    && /return contestationDuClient\(textes, cfg\.escalade_mots\)\n/.test(corps) && /getPlateformeConfigStrict\(artisanId\)/.test(corps),
    'magasin : contestation lit les messages entrants du client depuis l’émission, avec les mots de l’artisan (contestationDuClient)')
  ok(!/select\('message'\)|from\('leads'\)\.select\('[^']*message/.test(corps + repond) && !/contestationDuClient/.test(repond),
    'magasin (R1, 032-015) : ni la contestation ni la réponse ne relisent la demande d’origine (leads.message) ; la réponse ne lit pas le lexique')
  ok(/date_emission, emise_le/.test(mag.match(/const COLONNES = '[^']*'/)?.[0] ?? ''), 'magasin : la facture lue porte son émission (date_emission, emise_le), borne de la contestation')
  ok(/import \{ sujetEscalade \} from '\.\/pilote\/regles\.ts'/.test(lire('lib/relancesImpayes.ts')) && !/'litige'|'avocat'/.test(lire('lib/relancesImpayes.ts')), 'contestation : le lexique est celui du pilote (sujetEscalade), aucune liste recopiée')
}

const comp = await imp('lib/comparatifConcurrents.ts')
ok(/impay/i.test(comp.PRESTI.relances) && !/pas de relance automatique des impayés/.test(comp.PRESTI.relances), 'comparatif : la ligne relances de Presti parle des impayés automatiques (livrés)')

if (echecs.length) { console.log(`❌ relances-impayes-qa : ${echecs.length} échec(s) sur ${n}`); for (const e of echecs) console.log('  - ' + e); process.exit(1) }
console.log(`✅ relances-impayes-qa : ${n}/${n} contrôles — calendrier, opt-in, arrêts, idempotence, isolation, pause, plafond, sources`)
