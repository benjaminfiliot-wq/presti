// Vérification EN PRODUCTION du parcours d'un artisan, de bout en bout (21/10/2026, demande du fondateur :
// « vérifie bien vraiment une dernière fois que tout fonctionne parfaitement, que tes tarifs sont bien enregistrés par l'IA
// pour faire les devis »). Script ponctuel : HORS LANCEUR (il appelle l'IA une dizaine de fois et attend le pilote ~12 min).
//
// Un seul compte de test (offre Signature, est_demo), créé par l'API admin, supprimé à la fin QUOI QU'IL ARRIVE
// (adresse basculée en @presti-test.invalid puis purger_compte_test, migration 0085). Aucun e-mail hors de @resend.dev.
//
// Usage : node scripts/verif-prod-2110-e2e.mjs [--preuves <fichier.json>]

import fs from 'node:fs'
import crypto from 'node:crypto'
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { verifierSessionTest, codeEmailSiDemande } from './lib/connexion-test.mjs'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const BASE = process.env.TEST_BASE || 'https://prestiapp.fr'
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const admin = createClient(SB, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const pi = process.argv.indexOf('--preuves')
const FICHIER_PREUVES = pi > -1 ? process.argv[pi + 1] : null

const preuves = []
let ok = 0, ko = 0
const T = (etape, nom, cond, preuve = '') => {
  const p = typeof preuve === 'string' ? preuve : JSON.stringify(preuve)
  preuves.push({ etape, nom, ok: !!cond, preuve: p.slice(0, 1500) })
  if (cond) { ok++; console.log(`  ✅ [${etape}] ${nom}${p ? ` — ${p.slice(0, 400)}` : ''}`) } else { ko++; console.log(`  ❌ [${etape}] ${nom}${p ? ` — ${p.slice(0, 600)}` : ''}`) }
}
const info = (...a) => console.log('     ·', ...a)
const pause = (ms) => new Promise((r) => setTimeout(r, ms))
const eur = (n) => Math.round(Number(n) * 100) / 100

// SIRET fictif mais valide (clé de Luhn) : aucune donnée réelle.
function siretFictif() {
  const d = ('99' + String(crypto.randomInt(10 ** 10, 10 ** 11 - 1))).slice(0, 13).split('').map(Number)
  for (let c = 0; c <= 9; c++) {
    const s = [...d, c].reverse().reduce((t, x, i) => { let y = i % 2 ? x * 2 : x; if (y > 9) y -= 9; return t + y }, 0)
    if (s % 10 === 0) return [...d, c].join('')
  }
}

const st = Date.now()
const EMAIL = 'delivered+verif2110@resend.dev'
const CLIENT = 'delivered+client2110@resend.dev'
const MDP = crypto.randomBytes(18).toString('base64url')
const SLUG = `verif-2110-${st}`
let uid = null
let H = null
let jeton = null

// Les tarifs : prix volontairement ATYPIQUES (centimes), pour qu'une coïncidence avec une moyenne du marché soit exclue.
const TARIFS = [
  { designation: 'Pose carrelage sol', unite: 'm²', prix_ht: 45.70, tva_taux: 10, cle: /pose/i, exclure: /d[ée]pose|plinthe|fourniture/i },
  { designation: 'Dépose ancien carrelage', unite: 'm²', prix_ht: 18.40, tva_taux: 10, cle: /d[ée]pose|démolition|depose/i, exclure: /plinthe/i },
  { designation: 'Plinthes carrelage', unite: 'ml', prix_ht: 12.15, tva_taux: 10, cle: /plinthe/i, exclure: /^$/ },
  { designation: 'Fourniture carrelage grès cérame 60x60', unite: 'm²', prix_ht: 31.90, tva_taux: 10, cle: /fourniture|grès|gres|carreaux/i, exclure: /plinthe|d[ée]pose/i },
]
const PRIX_TARIFS = new Set(TARIFS.map((t) => t.prix_ht.toFixed(2)))
const MESSAGE_B = 'Bonjour, je voudrais refaire le carrelage d’une salle de bain de 8 m², avec dépose de l’ancien carrelage et pose de plinthes. Il faudra aussi évacuer les gravats. Merci de me faire un devis.'

async function api(chemin, { methode = 'GET', corps, sansJeton = false, brut = false } = {}) {
  const r = await fetch(`${BASE}${chemin}`, {
    method: methode,
    headers: sansJeton ? { 'Content-Type': 'application/json' } : H,
    ...(corps !== undefined ? { body: JSON.stringify(corps) } : {}),
    redirect: 'manual',
  })
  if (brut) return r
  const texte = await r.text()
  let json = null
  try { json = JSON.parse(texte) } catch { /* pas du JSON */ }
  return { status: r.status, json, texte }
}

// Comparaison ligne à ligne : prix IA vs tarifs enregistrés.
function comparerLignes(etape, lignes, { libelleTarif }) {
  const tableau = lignes.map((l) => ({ designation: l.designation, qte: Number(l.quantite), unite: l.unite, pu: eur(l.prix_unitaire_ht), source: l.source_prix }))
  info(`${etape} lignes :`, JSON.stringify(tableau))
  const auTarif = lignes.filter((l) => libelleTarif(l.source_prix))
  T(etape, 'au moins 3 lignes marquées comme venant des tarifs', auTarif.length >= 3, `${auTarif.length} lignes au tarif sur ${lignes.length}`)
  // 1. Une ligne marquée « tarif » doit porter EXACTEMENT un prix de la bibliothèque.
  const fausses = auTarif.filter((l) => !PRIX_TARIFS.has(eur(l.prix_unitaire_ht).toFixed(2)))
  T(etape, 'toute ligne marquée « tarif » porte un prix de la bibliothèque, au centime', fausses.length === 0, fausses.length ? fausses.map((l) => `${l.designation} = ${l.prix_unitaire_ht} (${l.source_prix})`).join(' ; ') : `${auTarif.length} lignes conformes`)
  // 2. Chaque tarif attendu est repris, à son prix exact, sur la ligne qui lui correspond.
  for (const t of TARIFS) {
    const l = lignes.find((x) => t.cle.test(x.designation) && !t.exclure.test(x.designation) && libelleTarif(x.source_prix) && eur(x.prix_unitaire_ht) === t.prix_ht)
      ?? lignes.find((x) => eur(x.prix_unitaire_ht) === t.prix_ht)
    const proche = lignes.find((x) => t.cle.test(x.designation) && !t.exclure.test(x.designation))
    T(etape, `« ${t.designation} » ${t.prix_ht.toFixed(2)} €/${t.unite} repris au centime et marqué tarif`, !!l && eur(l.prix_unitaire_ht) === t.prix_ht && libelleTarif(l.source_prix),
      l ? `${l.designation} : ${l.prix_unitaire_ht} € × ${l.quantite} ${l.unite} (${l.source_prix})` : (proche ? `ligne la plus proche : ${proche.designation} : ${proche.prix_unitaire_ht} € (${proche.source_prix})` : 'aucune ligne correspondante'))
  }
  // 3. Une ligne qui ne vient pas des tarifs n'en a pas le libellé, et son prix n'est pas présenté comme sourcé.
  const hors = lignes.filter((l) => !libelleTarif(l.source_prix))
  return { auTarif, hors, tableau }
}

async function purger() {
  if (!uid) return
  console.log('\n── Nettoyage : suppression du compte de test et de toutes ses données')
  try {
    const poubelle = `verif2110-${st}@presti-test.invalid`
    const { error: e1 } = await admin.from('artisans').update({ email: poubelle }).eq('id', uid)
    if (e1) info('bascule e-mail artisans :', e1.message)
    const { error: e2 } = await admin.auth.admin.updateUserById(uid, { email: poubelle, email_confirm: true })
    if (e2) info('bascule e-mail auth :', e2.message)
    const { data, error } = await admin.rpc('purger_compte_test', { p_id: uid })
    if (error) {
      info('purger_compte_test a échoué :', error.message, '→ repli manuel')
      for (const t of ['actions_auto', 'pilote_reglages', 'chantier_pointage', 'chantier_suivi', 'chantier_taches', 'chantiers', 'assistant_actions', 'assistant_journal', 'assistant_conversations', 'prix_artisan']) await admin.from(t).delete().eq('artisan_id', uid)
      await admin.from('artisans').delete().eq('id', uid)
      await admin.auth.admin.deleteUser(uid)
    } else info('purger_compte_test :', JSON.stringify(data))
  } catch (e) { info('purge : exception', e.message) }
  // Contrôle : plus rien au nom de ce compte.
  const reste = {}
  for (const t of ['artisans', 'leads', 'devis', 'factures', 'prix_artisan', 'chantiers', 'chantier_taches', 'actions_auto', 'pilote_reglages', 'assistant_actions', 'assistant_journal', 'assistant_conversations']) {
    const col = t === 'artisans' ? 'id' : 'artisan_id'
    const { count, error } = await admin.from(t).select('*', { count: 'exact', head: true }).eq(col, uid)
    reste[t] = error ? `erreur ${error.message}` : count
  }
  const { data: u } = await admin.auth.admin.getUserById(uid)
  reste.auth_user = u?.user ? 'PRÉSENT' : 0
  const propre = Object.values(reste).every((v) => v === 0)
  T('nettoyage', 'compte de test et toutes ses données supprimés', propre, reste)
  uid = null
}

// ── Second passage (--complement) : ce que le premier n'a pas pu trancher.
//  · le pilote avec une adresse de prospect NEUVE (au 1er passage, la même adresse avait reçu 3 accusés « anonymes » : plafond
//    de 3 par jour et par destinataire, lib/email.ts:78 — la n°2 est tombée en « echec » pour cette raison) ;
//  · l'assistant avec UNE seule demande en base (au 1er passage il a demandé laquelle des trois, à raison) ;
//  · « Chiffrer avec l'IA » de l'éditeur de devis (/api/devis/generer) : prix ET TVA (régime réel) ;
//  · les lignes d'une facture créée depuis un devis (relues avec select('*')).
const COMPLEMENT = process.argv.includes('--complement')
async function complement() {
  console.log('\n── C. Complément : pilote (adresse neuve), assistant (une seule demande), /api/devis/generer, lignes de facture')
  const pr = await api('/api/pilote/reglages', { methode: 'PUT', corps: { actif: true, types: { reponse_prospect: true } } })
  T('C', 'pilote activé (reponse_prospect)', pr.status === 200, `HTTP ${pr.status}`)
  const adresse = `delivered+pilote2110-${st}@resend.dev`
  const lb = await api('/api/leads', { methode: 'POST', sansJeton: true, corps: { slug: SLUG, contact: adresse, nom_prospect: 'Client Vérif', message: MESSAGE_B } })
  const leadId = lb.json?.leadId
  const { data: m } = await admin.from('messages').select('id, etat').eq('lead_id', leadId).eq('sens', 'out').eq('type', 'reponse_auto').maybeSingle()
  const { data: fa } = await admin.from('actions_auto').select('id, statut, prete_le, part_le').eq('artisan_id', uid).eq('lead_id', leadId).maybeSingle()
  T('C', 'demande (adresse neuve) → proposition IA → en file a_partir, +10 min', lb.status === 200 && m?.etat === 'proposition' && fa?.statut === 'a_partir' && Date.parse(fa.part_le) - Date.parse(fa.prete_le) === 600_000, `HTTP ${lb.status}, message ${m?.etat}, file ${fa?.statut} prete_le=${fa?.prete_le} part_le=${fa?.part_le}`)

  // Assistant
  async function assistant(message, conversation_id, historique) {
    const r = await fetch(`${BASE}/api/assistant`, { method: 'POST', headers: H, body: JSON.stringify({ message, ...(conversation_id ? { conversation_id, historique } : {}) }) })
    const texte = await r.text()
    const evts = texte.split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return { brut: l } } })
    return { status: r.status, evts, fin: evts.find((e) => e.e === 'fin'), conv: evts.find((e) => e.e === 'conversation')?.id }
  }
  let a1 = await assistant('fais un devis pour la demande de ce matin')
  info('assistant :', `HTTP ${a1.status}`, (a1.fin?.texte ?? JSON.stringify(a1.evts).slice(0, 300)).slice(0, 700).replace(/\n/g, ' '))
  info('événements outils :', JSON.stringify(a1.evts.filter((e) => e.e && e.e !== 'fin' && e.e !== 'conversation').map((e) => e.nom ?? e.outil ?? e.e)).slice(0, 400))
  let { data: dv } = await admin.from('devis').select('id, numero, statut, total_ht, total_ttc, lead_id, client_email').eq('artisan_id', uid)
  if (!dv?.length && a1.fin) {
    const hist = [{ role: 'artisan', texte: 'fais un devis pour la demande de ce matin' }, { role: 'assistant', texte: a1.fin.texte, signature: a1.fin.signature }]
    const a2 = await assistant('Oui, fais le devis brouillon de cette demande de carrelage de salle de bain avec mes tarifs.', a1.conv, hist)
    info('assistant (tour 2) :', `HTTP ${a2.status}`, (a2.fin?.texte ?? '').slice(0, 700).replace(/\n/g, ' '))
    ;({ data: dv } = await admin.from('devis').select('id, numero, statut, total_ht, total_ttc, lead_id, client_email').eq('artisan_id', uid))
  }
  const { data: journal } = await admin.from('assistant_journal').select('*').eq('artisan_id', uid).limit(40)
  info('journal de l’assistant :', JSON.stringify((journal ?? []).map((j) => `${j.nom ?? j.outil}:${j.resultat}:${String(j.resume ?? '').slice(0, 90)}`)).slice(0, 1500))
  const da = dv?.[0]
  T('c', 'l’assistant a créé un devis brouillon pour la demande', !!da, da ? `${da.numero} HT ${da.total_ht} TTC ${da.total_ttc}, relié à la demande : ${da.lead_id === leadId ? 'oui' : 'NON'}, client_email ${da.client_email}` : 'aucun devis')
  let lignesA = []
  if (da) {
    const { data: l } = await admin.from('devis_lignes').select('*').eq('devis_id', da.id).order('ordre')
    lignesA = l ?? []
    const { hors } = comparerLignes('c', lignesA, { libelleTarif: (s) => s === 'tarif de l’artisan' })
    T('c', 'lignes hors tarifs : « à chiffrer » à 0 € (ou prix donné par l’artisan), jamais un prix deviné', hors.every((x) => (x.source_prix === 'à chiffrer' && Number(x.prix_unitaire_ht) === 0) || x.source_prix === 'prix donné par l’artisan'), hors.map((x) => `${x.designation}: ${x.prix_unitaire_ht} € (${x.source_prix})`).join(' ; ') || 'aucune')
    const unites = lignesA.map((x) => `${x.designation.slice(0, 25)}=${x.unite}`).join(' ; ')
    info('unités du devis de l’assistant :', unites)
  }

  // /api/devis/generer (« Chiffrer avec l'IA » dans l'éditeur de devis)
  const gn = await api('/api/devis/generer', { methode: 'POST', corps: { description: MESSAGE_B } })
  T('C', 'POST /api/devis/generer', gn.status === 200 && Array.isArray(gn.json?.lignes), `HTTP ${gn.status} ${gn.texte.slice(0, 160)}`)
  if (gn.json?.lignes) {
    comparerLignes('generer', gn.json.lignes, { libelleTarif: (s) => typeof s === 'string' && /^vos tarifs/.test(s) })
    const tva = gn.json.lignes.map((l) => l.tva_taux)
    T('generer', 'compte au régime RÉEL : les lignes portent une TVA (pas 0 % de franchise)', tva.every((t) => Number(t) > 0), `tva_taux = ${JSON.stringify(tva)}`)
    T('generer', 'unités m² conservées (pas transformées en ml)', gn.json.lignes.filter((l) => /pose carrelage|dépose|depose|fourniture/i.test(l.designation) && !/plinthe/i.test(l.designation)).every((l) => l.unite === 'm²'), gn.json.lignes.map((l) => `${l.designation.slice(0, 30)}=${l.unite}`).join(' ; '))
  }

  // Lignes d'une facture créée depuis un devis signé
  if (da && lignesA.length) {
    const { data: art } = await admin.from('artisans').select('id').eq('id', uid).single()
    await admin.from('devis').update({ statut: 'accepte', accepte_le: new Date().toISOString(), client_email: da.client_email ?? adresse }).eq('id', da.id)
    // Une facture se crée sur un devis dont toutes les lignes ont un prix : on donne un prix aux lignes « à chiffrer » s'il y en a.
    for (const l of lignesA.filter((x) => Number(x.prix_unitaire_ht) === 0)) await admin.from('devis_lignes').update({ prix_unitaire_ht: 100 }).eq('id', l.id)
    const fc = await api('/api/factures', { methode: 'POST', corps: { devis_id: da.id } })
    if (fc.json?.id) {
      const { data: fl, error } = await admin.from('factures_lignes').select('*').eq('facture_id', fc.json.id)
      T('d', 'la facture a ses lignes (relues avec select *)', (fl ?? []).length === lignesA.length, `${(fl ?? []).length} lignes / ${lignesA.length}${error ? ` erreur ${error.message}` : ''} ; colonnes : ${Object.keys(fl?.[0] ?? {}).join(', ')}`)
    } else T('d', 'facture depuis le devis de l’assistant', false, `HTTP ${fc.status} ${fc.texte.slice(0, 200)} (art ${!!art})`)
  }

  // Attente du pilote
  if (fa) {
    const limite = Date.parse(fa.part_le) + 4 * 60_000
    let f2 = null
    while (Date.now() < limite) {
      const { data } = await admin.from('actions_auto').select('statut, motif, traite_le').eq('id', fa.id).single()
      f2 = data
      if (!['a_partir', 'en_cours'].includes(f2.statut)) break
      await pause(20_000)
    }
    const { data: m2 } = await admin.from('messages').select('etat, sent_at, contenu').eq('id', m.id).single()
    T('f', 'pilote : la réponse est PARTIE seule après 10 min (statut « partie », message envoyé)', f2?.statut === 'partie' && m2?.etat === null && Date.parse(f2.traite_le) >= Date.parse(fa.part_le),
      `actions_auto.statut=${f2?.statut} motif=${f2?.motif} traite_le=${f2?.traite_le} (part_le ${fa.part_le}) ; messages.etat=${m2?.etat} sent_at=${m2?.sent_at} ; mention IA : ${/assistant/i.test(m2?.contenu ?? '') ? 'dans le message' : 'ajoutée à l’e-mail seulement'}`)
  }
}

let interrompu = false
process.on('SIGINT', async () => { if (interrompu) process.exit(1); interrompu = true; console.log('\nInterruption : nettoyage…'); await purger(); process.exit(1) })

let leadB = null, devisAuto = null, devisAssistant = null, facture = null, chantier = null
let leadP2 = null, leadP3 = null, file2 = null, file3 = null
const tarifsIds = {}

try {
  // ═══════════════════════════ 0. Compte de test ═══════════════════════════
  console.log('\n── 0. Compte de test (API admin, offre Signature, est_demo)')
  const { data: deja } = await admin.from('artisans').select('id').eq('email', EMAIL).maybeSingle()
  if (deja) throw new Error('un compte porte déjà cette adresse : arrêt (rien touché)')
  const { data: u, error } = await admin.auth.admin.createUser({ email: EMAIL, password: MDP, email_confirm: true })
  if (error) throw new Error('compte de test : ' + error.message)
  uid = u.user.id
  const { error: eIns } = await admin.from('artisans').insert({
    id: uid, email: EMAIL, nom: 'Carrelages Vérif Test', metier: 'Carreleur', slug: SLUG, plan: 'signature', est_demo: true, tva_regime: 'reel',
    forme_juridique: 'EI', siret: siretFictif(), adresse: '1 rue de l’Essai', code_postal: '17000', ville: 'La Rochelle',
    assurance_nom: 'Assureur Fictif Test', assurance_contrat: 'TEST-2110', assurance_activites: 'garantie décennale — carrelage (fictif)', zone_intervention: 'La Rochelle',
  })
  if (eIns) throw new Error('ligne artisan : ' + eIns.message)
  const pub = createClient(SB, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: s, error: eS } = await pub.auth.signInWithPassword({ email: EMAIL, password: MDP })
  if (eS) throw new Error('connexion : ' + eS.message)
  jeton = s.session.access_token
  await verifierSessionTest(jeton)
  H = { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}` }
  T('0', 'compte créé et session ouverte', !!uid, `uid ${uid.slice(0, 8)}…, slug ${SLUG}, plan signature, est_demo`)

  // ═══════════════════════════ a. Mes tarifs ═══════════════════════════
  console.log('\n── a. Mes tarifs : saisie de 4 tarifs, relecture en base et par l’API')
  for (const t of TARIFS) {
    const r = await api('/api/tarifs', { methode: 'POST', corps: { designation: t.designation, unite: t.unite, prix_ht: t.prix_ht, tva_taux: t.tva_taux } })
    T('a', `POST /api/tarifs « ${t.designation} »`, r.status === 200 && r.json?.ok, `HTTP ${r.status} ${r.texte.slice(0, 120)}`)
  }
  const { data: enBase } = await admin.from('prix_artisan').select('id, designation, unite, prix_ht, tva_taux, source, date_prix, actif').eq('artisan_id', uid)
  for (const t of TARIFS) {
    const l = (enBase ?? []).find((x) => x.designation === t.designation)
    if (l) tarifsIds[t.designation] = l.id
    T('a', `en base : ${t.designation}`, !!l && Number(l.prix_ht) === t.prix_ht && l.unite === t.unite && l.actif === true, l ? `prix_artisan.prix_ht=${l.prix_ht} unite=${l.unite} tva=${l.tva_taux} source=${l.source} date=${l.date_prix}` : 'absent')
  }
  const g = await api('/api/tarifs')
  T('a', 'GET /api/tarifs rend les 4 tarifs', g.status === 200 && g.json?.total === 4, `HTTP ${g.status}, total=${g.json?.total}`)

  if (COMPLEMENT) { await complement(); throw new Error('FIN_COMPLEMENT') }

  // ═══════════════════════════ b. Demande sur la page publique → réponse IA → devis IA ═══════════════════════════
  console.log('\n── b. Demande de devis sur /p/<slug> → réponse IA → devis chiffré par l’IA')
  const pPage = await fetch(`${BASE}/p/${SLUG}`, { redirect: 'manual' })
  const html = await pPage.text()
  T('b', `GET /p/${SLUG} (page publique)`, pPage.status === 200 && html.includes('Carrelages Vérif Test'), `HTTP ${pPage.status}, nom de l’artisan ${html.includes('Carrelages Vérif Test') ? 'présent' : 'ABSENT'}, « Presti » visible dans le texte : ${/>[^<]*Presti[^<]*</.test(html) ? 'OUI' : 'non'}`)
  const lb = await api('/api/leads', { methode: 'POST', sansJeton: true, corps: { slug: SLUG, contact: CLIENT, nom_prospect: 'Client Vérif', message: MESSAGE_B } })
  T('b', 'POST /api/leads (demande du prospect)', lb.status === 200 && lb.json?.ok && lb.json?.leadId, `HTTP ${lb.status} ${lb.texte.slice(0, 200)}`)
  leadB = { id: lb.json?.leadId, token: lb.json?.token }
  const { data: msgsB } = await admin.from('messages').select('id, sens, type, etat, contenu, modele').eq('lead_id', leadB.id).order('sent_at')
  const propB = (msgsB ?? []).find((m) => m.sens === 'out' && m.type === 'reponse_auto')
  T('b', 'la réponse IA est arrivée (proposition à valider, mode assistée par défaut)', !!propB && (propB.contenu ?? '').length > 40, propB ? `messages.etat=${propB.etat} modele=${propB.modele} : « ${propB.contenu.slice(0, 220).replace(/\n/g, ' ')}… »` : JSON.stringify(msgsB))
  if (propB) {
    const prixCites = (propB.contenu.match(/\d+(?:[.,]\d+)?\s?€/g) ?? [])
    T('b', 'la réponse au prospect n’annonce aucun prix', prixCites.length === 0, prixCites.length ? prixCites.join(', ') : 'aucun montant en €')
  }
  const { count: fileB } = await admin.from('actions_auto').select('id', { count: 'exact', head: true }).eq('artisan_id', uid)
  T('b', 'pilote coupé → rien en file (témoin)', (fileB ?? 0) === 0, `actions_auto = ${fileB}`)

  const da = await api('/api/devis/auto', { methode: 'POST', corps: { lead_id: leadB.id } })
  T('b', 'POST /api/devis/auto (devis chiffré par l’IA depuis la conversation)', da.status === 200 && da.json?.id, `HTTP ${da.status} ${da.texte.slice(0, 200)}`)
  if (da.json?.id) {
    const { data: d } = await admin.from('devis').select('id, numero, statut, total_ht, total_tva, total_ttc, client_email, lead_id, source, notes').eq('id', da.json.id).single()
    const { data: lignes } = await admin.from('devis_lignes').select('designation, quantite, unite, prix_unitaire_ht, tva_taux, source_prix, ordre').eq('devis_id', d.id).order('ordre')
    devisAuto = { ...d, lignes }
    info(`devis ${d.numero} : HT ${d.total_ht} / TVA ${d.total_tva} / TTC ${d.total_ttc}, client_email ${d.client_email}`)
    const libelleTarif = (s) => typeof s === 'string' && /^vos tarifs/.test(s)
    const { hors } = comparerLignes('b', lignes, { libelleTarif })
    const gravats = lignes.find((l) => /gravat|évacuation|evacuation|déchet|decheterie|benne/i.test(l.designation))
    T('b', 'la prestation SANS tarif (évacuation des gravats) est chiffrée mais marquée estimation / ordre de grandeur, pas « vos tarifs »', !!gravats && !libelleTarif(gravats.source_prix) && ['estimation', 'ordre de grandeur du marché'].includes(gravats.source_prix),
      gravats ? `${gravats.designation} : ${gravats.prix_unitaire_ht} € (${gravats.source_prix})` : 'aucune ligne gravats')
    T('b', 'aucune ligne hors tarifs ne cite un fournisseur', hors.every((l) => ['estimation', 'ordre de grandeur du marché'].includes(l.source_prix)), hors.map((l) => `${l.designation}: ${l.source_prix}`).join(' ; '))
    const pose = lignes.find((l) => /pose/i.test(l.designation) && !/d[ée]pose|plinthe/i.test(l.designation))
    T('b', 'quantité cohérente : pose ≈ 8 m²', !!pose && Number(pose.quantite) >= 7.5 && Number(pose.quantite) <= 9, pose ? `${pose.quantite} ${pose.unite}` : 'pas de ligne de pose')
    const totalCalc = eur(lignes.reduce((t, l) => t + Number(l.quantite) * Number(l.prix_unitaire_ht), 0))
    T('b', 'total HT du devis = somme des lignes', Math.abs(totalCalc - Number(d.total_ht)) < 0.02, `somme ${totalCalc} / total_ht ${d.total_ht}`)
  }

  // ═══════════════════════════ f (1/2). Pilote automatique ═══════════════════════════
  console.log('\n── f. Pilote automatique : activation « Réponses aux prospects », deux demandes')
  const pr = await api('/api/pilote/reglages', { methode: 'PUT', corps: { actif: true, types: { reponse_prospect: true } } })
  T('f', 'PUT /api/pilote/reglages (actif, reponse_prospect)', pr.status === 200 && pr.json?.ok, `HTTP ${pr.status} ${pr.texte.slice(0, 160)}`)
  const { data: reg } = await admin.from('pilote_reglages').select('actif, types').eq('artisan_id', uid).maybeSingle()
  T('f', 'réglages en base', reg?.actif === true && reg?.types?.reponse_prospect === true, reg)

  async function demandePilote(message, nom) {
    const r = await api('/api/leads', { methode: 'POST', sansJeton: true, corps: { slug: SLUG, contact: CLIENT, nom_prospect: nom, message } })
    const leadId = r.json?.leadId
    const { data: m } = await admin.from('messages').select('id, etat, type').eq('lead_id', leadId ?? '00000000-0000-0000-0000-000000000000').eq('sens', 'out').eq('type', 'reponse_auto').maybeSingle()
    const { data: fa } = await admin.from('actions_auto').select('id, type, source, ref_id, lead_id, statut, prete_le, part_le, motif, libelle').eq('artisan_id', uid).eq('lead_id', leadId ?? '00000000-0000-0000-0000-000000000000').maybeSingle()
    return { r, leadId, token: r.json?.token, message: m, file: fa }
  }
  const p2 = await demandePilote('Bonjour, je voudrais faire poser du carrelage dans ma cuisine, environ 12 m². Pouvez-vous me rappeler ?', 'Client Pilote Deux')
  leadP2 = p2.leadId; file2 = p2.file
  T('f', 'demande n°2 enregistrée, proposition IA créée', p2.r.status === 200 && p2.message?.etat === 'proposition', `HTTP ${p2.r.status}, message etat=${p2.message?.etat}`)
  const ecart2 = file2 ? (Date.parse(file2.part_le) - Date.parse(file2.prete_le)) / 60000 : null
  T('f', 'demande n°2 en file (actions_auto) : type reponse_prospect, statut a_partir, part_le = prete_le + 10 min', !!file2 && file2.type === 'reponse_prospect' && file2.statut === 'a_partir' && file2.ref_id === p2.message?.id && Math.abs(ecart2 - 10) < 0.01,
    file2 ? `statut=${file2.statut} source=${file2.source} prete_le=${file2.prete_le} part_le=${file2.part_le} (écart ${ecart2} min)` : 'aucune ligne en file')
  const p3 = await demandePilote('Bonjour, pouvez-vous refaire les joints de carrelage de ma douche ?', 'Client Pilote Trois')
  leadP3 = p3.leadId; file3 = p3.file
  T('f', 'demande n°3 en file (a_partir, +10 min)', !!file3 && file3.statut === 'a_partir', file3 ? `statut=${file3.statut} part_le=${file3.part_le}` : 'aucune ligne en file')
  const lf = await api('/api/pilote/file')
  T('f', 'GET /api/pilote/file montre les deux actions en attente', lf.status === 200 && (lf.json?.attente ?? []).length === 2, `HTTP ${lf.status}, attente=${(lf.json?.attente ?? []).length}, delai_min=${lf.json?.delai_min}`)
  if (file3) {
    const an = await api('/api/pilote/file', { methode: 'POST', corps: { id: file3.id, decision: 'annuler' } })
    const { data: f3 } = await admin.from('actions_auto').select('statut, motif, traite_le').eq('id', file3.id).single()
    const { data: m3 } = await admin.from('messages').select('etat').eq('id', p3.message?.id).single()
    T('f', 'annulation de la n°3 → statut « annulee », la proposition reste à valider', an.status === 200 && f3.statut === 'annulee' && m3.etat === 'proposition', `HTTP ${an.status}, actions_auto.statut=${f3.statut} motif=${f3.motif}, messages.etat=${m3.etat}`)
  }

  // ═══════════════════════════ c. Assistant de gestion ═══════════════════════════
  console.log('\n── c. Assistant de gestion : « fais un devis pour la demande de ce matin »')
  async function assistant(message, conversation_id, historique) {
    const r = await fetch(`${BASE}/api/assistant`, { method: 'POST', headers: H, body: JSON.stringify({ message, ...(conversation_id ? { conversation_id, historique } : {}) }) })
    const texte = await r.text()
    const evts = texte.split('\n').filter(Boolean).map((l) => { try { return JSON.parse(l) } catch { return { brut: l } } })
    return { status: r.status, evts, fin: evts.find((e) => e.e === 'fin'), conv: evts.find((e) => e.e === 'conversation')?.id }
  }
  const avant = new Set([devisAuto?.id].filter(Boolean))
  let a1 = await assistant('fais un devis pour la demande de ce matin')
  info('assistant :', `HTTP ${a1.status}`, (a1.fin?.texte ?? JSON.stringify(a1.evts).slice(0, 400)).slice(0, 600).replace(/\n/g, ' '))
  const chercherDevisAssistant = async () => {
    const { data } = await admin.from('devis').select('id, numero, statut, total_ht, total_ttc, client_email, lead_id').eq('artisan_id', uid).order('created_at')
    return (data ?? []).find((x) => !avant.has(x.id)) ?? null
  }
  devisAssistant = await chercherDevisAssistant()
  if (!devisAssistant && a1.status === 200 && a1.fin) {
    // L'assistant a demandé une confirmation au lieu d'agir : on la lui donne (deuxième et dernier tour).
    const hist = [{ role: 'artisan', texte: 'fais un devis pour la demande de ce matin' }, { role: 'assistant', texte: a1.fin.texte, signature: a1.fin.signature }]
    const a2 = await assistant('Oui, crée le devis brouillon avec mes tarifs.', a1.conv, hist)
    info('assistant (tour 2) :', `HTTP ${a2.status}`, (a2.fin?.texte ?? '').slice(0, 600).replace(/\n/g, ' '))
    a1 = a2
    devisAssistant = await chercherDevisAssistant()
  }
  const { data: journal } = await admin.from('assistant_journal').select('nom, resultat, resume').eq('artisan_id', uid).order('cree_le').limit(30)
  info('journal de l’assistant :', JSON.stringify((journal ?? []).map((j) => `${j.nom}:${j.resultat}:${(j.resume ?? '').slice(0, 80)}`)))
  T('c', 'l’assistant a créé un devis brouillon', !!devisAssistant, devisAssistant ? `${devisAssistant.numero} TTC ${devisAssistant.total_ttc}, lead_id ${devisAssistant.lead_id ? 'relié' : 'NON relié'}, client_email ${devisAssistant.client_email}` : `aucun devis — dernier texte : ${(a1.fin?.texte ?? '').slice(0, 300)}`)
  if (devisAssistant) {
    const { data: lignes } = await admin.from('devis_lignes').select('designation, quantite, unite, prix_unitaire_ht, tva_taux, source_prix, ordre').eq('devis_id', devisAssistant.id).order('ordre')
    devisAssistant.lignes = lignes
    const libelleTarif = (s) => s === 'tarif de l’artisan'
    const { hors } = comparerLignes('c', lignes, { libelleTarif })
    T('c', 'les lignes hors tarifs sont « à chiffrer » (0 €) ou un prix donné par l’artisan, jamais un prix deviné', hors.every((l) => (l.source_prix === 'à chiffrer' && Number(l.prix_unitaire_ht) === 0) || l.source_prix === 'prix donné par l’artisan'), hors.map((l) => `${l.designation}: ${l.prix_unitaire_ht} € (${l.source_prix})`).join(' ; ') || 'aucune ligne hors tarifs')
  }

  // ═══════════════════════════ d. Devis → PDF → envoi → acceptation → facture → encaissement → chiffres, CRM ═══════════════════════════
  console.log('\n── d. Le devis : PDF, envoi, acceptation par le lien, facture, encaissement, Mes chiffres, CRM')
  if (devisAuto) {
    const rp = await api(`/api/devis/${devisAuto.id}/pdf`, { brut: true })
    const buf = Buffer.from(await rp.arrayBuffer())
    T('d', 'PDF du devis généré', rp.status === 200 && /pdf/.test(rp.headers.get('content-type') ?? '') && buf.subarray(0, 4).toString() === '%PDF', `HTTP ${rp.status}, ${rp.headers.get('content-type')}, ${buf.length} octets, en-tête ${buf.subarray(0, 5).toString()}`)
    const pdfTexte = buf.toString('latin1')
    info('PDF contient « Presti » :', /Presti/.test(pdfTexte) ? 'OUI (à vérifier)' : 'non')
    const ev = await api(`/api/devis/${devisAuto.id}/envoyer`, { methode: 'POST' })
    const { data: dEnv } = await admin.from('devis').select('statut, envoye_le, client_email').eq('id', devisAuto.id).single()
    T('d', 'envoi au client (@resend.dev)', ev.status === 200 && dEnv.statut === 'envoye' && dEnv.client_email === CLIENT, `HTTP ${ev.status} ${ev.texte.slice(0, 120)} ; devis.statut=${dEnv.statut} envoye_le=${dEnv.envoye_le} client_email=${dEnv.client_email}`)
    const ac = await api('/api/conversation/devis', { methode: 'POST', sansJeton: true, corps: { token: leadB.token, action: 'accepter' } })
    const { data: dAcc } = await admin.from('devis').select('statut, accepte_le, accepte_canal').eq('id', devisAuto.id).single()
    const { data: lAcc } = await admin.from('leads').select('statut').eq('id', leadB.id).single()
    T('d', 'acceptation par le lien de conversation du client', ac.status === 200 && dAcc.statut === 'accepte' && lAcc.statut === 'gagne', `HTTP ${ac.status} ${ac.texte.slice(0, 120)} ; devis.statut=${dAcc.statut} accepte_le=${dAcc.accepte_le} canal=${dAcc.accepte_canal} ; lead.statut=${lAcc.statut}`)
    const fc = await api('/api/factures', { methode: 'POST', corps: { devis_id: devisAuto.id } })
    T('d', 'facture créée depuis le devis', fc.status === 200 && fc.json?.id, `HTTP ${fc.status} ${fc.texte.slice(0, 160)}`)
    if (fc.json?.id) {
      const { data: f } = await admin.from('factures').select('id, numero, statut, total_ht, total_ttc, verrouillee, devis_id, payee_le').eq('id', fc.json.id).single()
      facture = f
      T('d', 'montants de la facture = montants du devis', Number(f.total_ttc) === Number(devisAuto.total_ttc) && Number(f.total_ht) === Number(devisAuto.total_ht), `facture ${f.numero} HT ${f.total_ht} TTC ${f.total_ttc} / devis HT ${devisAuto.total_ht} TTC ${devisAuto.total_ttc} ; statut=${f.statut} verrouillee=${f.verrouillee}`)
      const { data: fl } = await admin.from('factures_lignes').select('designation, prix_unitaire_ht, quantite').eq('facture_id', f.id).order('ordre')
      const memes = (fl ?? []).length === devisAuto.lignes.length && (fl ?? []).every((l, i) => eur(l.prix_unitaire_ht) === eur(devisAuto.lignes[i].prix_unitaire_ht))
      T('d', 'lignes de la facture = lignes du devis (prix unitaires)', memes, `${(fl ?? []).length} lignes / ${devisAuto.lignes.length}`)
      const pf = await api(`/api/factures/${f.id}/pdf`, { brut: true })
      const bf = Buffer.from(await pf.arrayBuffer())
      T('d', 'PDF de la facture', pf.status === 200 && bf.subarray(0, 4).toString() === '%PDF', `HTTP ${pf.status}, ${bf.length} octets`)
      const en = await api(`/api/factures/${f.id}`, { methode: 'PATCH', corps: { statut: 'payee' } })
      const { data: fp } = await admin.from('factures').select('statut, payee_le').eq('id', f.id).single()
      T('d', 'encaissement (facture payée)', en.status === 200 && fp.statut === 'payee' && !!fp.payee_le, `HTTP ${en.status} ; statut=${fp.statut} payee_le=${fp.payee_le}`)
      const ch = await api('/api/compta/tableau')
      const fT = (ch.json?.factures ?? []).find((x) => x.id === f.id)
      const dT = (ch.json?.devis ?? []).find((x) => x.id === devisAuto.id)
      T('d', '« Mes chiffres » (/api/compta/tableau) reflète la facture payée et le devis accepté', ch.status === 200 && fT && Number(fT.total_ttc) === Number(f.total_ttc) && fT.statut === 'payee' && !!fT.payee_le && dT?.statut === 'accepte',
        `HTTP ${ch.status} ; facture ${fT ? `${fT.numero} ${fT.total_ttc} € ${fT.statut} payee_le=${fT.payee_le}` : 'ABSENTE'} ; devis ${dT ? `${dT.numero} ${dT.total_ttc} € ${dT.statut}` : 'ABSENT'} ; demandes=${(ch.json?.demandes ?? []).length}`)
    }
  }

  // ═══════════════════════════ e. CRM : chantier, tâches, avancement, pointage, suivi ═══════════════════════════
  console.log('\n── e. CRM : chantier depuis le devis signé, tâches, avancement, lien de pointage, lien de suivi')
  if (devisAuto) {
    const cc = await api('/api/crm/chantiers', { methode: 'POST', corps: { devis_id: devisAuto.id, generer_taches: true } })
    T('e', 'chantier créé depuis le devis signé (tâches générées)', (cc.status === 200 || cc.status === 201) && cc.json?.id, `HTTP ${cc.status} ${cc.texte.slice(0, 200)}`)
    chantier = cc.json?.id ? { id: cc.json.id } : null
    if (chantier) {
      const ta = await api(`/api/crm/chantiers/${chantier.id}/taches`, { methode: 'POST', corps: { libelle: 'Nettoyage de fin de chantier' } })
      T('e', 'tâche ajoutée à la main', ta.status === 200 || ta.status === 201, `HTTP ${ta.status} ${ta.texte.slice(0, 120)}`)
      const { data: taches } = await admin.from('chantier_taches').select('id, libelle, faite').eq('chantier_id', chantier.id).order('ordre')
      T('e', 'tâches en base (une par ligne du devis + la manuelle)', (taches ?? []).length === devisAuto.lignes.length + 1, `${(taches ?? []).length} tâches : ${(taches ?? []).map((t) => t.libelle).join(' | ').slice(0, 300)}`)
      const t0 = taches[0]
      const pt = await api(`/api/crm/taches/${t0.id}`, { methode: 'PATCH', corps: { faite: true } })
      const g1 = await api(`/api/crm/chantiers/${chantier.id}`)
      const av = (j) => { const s = JSON.stringify(j); const m = s.match(/"avancement"\s*:\s*(\d+|null)/); return m ? m[1] : null }
      const { data: tDb } = await admin.from('chantier_taches').select('faite').eq('chantier_id', chantier.id)
      const faites = (tDb ?? []).filter((t) => t.faite).length
      T('e', 'cocher une tâche → avancement', pt.status === 200 && faites === 1, `HTTP ${pt.status} ; ${faites}/${(tDb ?? []).length} faites (≈ ${Math.round(100 * faites / (tDb ?? []).length)} %) ; GET chantier ${g1.status}, avancement lu dans la réponse : ${av(g1.json)}`)
      info('clés de GET /api/crm/chantiers/[id] :', Object.keys(g1.json ?? {}).join(', '), '| chantier :', Object.keys(g1.json?.chantier ?? {}).join(', '))
      // Lien de pointage
      const lp = await api(`/api/crm/chantiers/${chantier.id}/pointage`, { methode: 'POST' })
      const adrP = lp.json?.adresse
      T('e', 'lien de pointage créé', lp.status === 201 && /\/pointage\//.test(adrP ?? ''), `HTTP ${lp.status} ${adrP ? adrP.replace(/[^/]+$/, '<jeton>') : lp.texte.slice(0, 120)}`)
      if (adrP) {
        const cheminP = new URL(adrP).pathname
        const op = await fetch(`${BASE}${cheminP}`)
        const hp = await op.text()
        const nonFaite = taches.find((t) => t.id !== t0.id)
        T('e', '/pointage/<jeton> s’ouvre sans session et liste les tâches', op.status === 200 && hp.includes(nonFaite.id), `HTTP ${op.status}, ${hp.length} octets, tâche ${nonFaite.id.slice(0, 8)} ${hp.includes(nonFaite.id) ? 'présente' : 'ABSENTE'}, « Presti » visible : ${/>[^<]*Presti[^<]*</.test(hp) ? 'OUI' : 'non'}, prix visible : ${/\d+[.,]\d{2}\s?€/.test(hp) ? 'OUI' : 'non'}`)
        const cp = await fetch(`${BASE}${cheminP}`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: `fait=${nonFaite.id}` })
        const { data: tN } = await admin.from('chantier_taches').select('faite, faite_le').eq('id', nonFaite.id).single()
        const { data: tDb2 } = await admin.from('chantier_taches').select('faite').eq('chantier_id', chantier.id)
        T('e', 'cocher depuis le pointage → tâche faite, avancement monte', cp.status === 200 && tN.faite === true, `HTTP ${cp.status} ; tâche faite=${tN.faite} ; ${(tDb2 ?? []).filter((t) => t.faite).length}/${(tDb2 ?? []).length} faites`)
        const rv = await api(`/api/crm/chantiers/${chantier.id}/pointage`, { methode: 'DELETE' })
        const op2 = await fetch(`${BASE}${cheminP}`)
        T('e', 'révocation du lien de pointage → 404', (rv.status === 200 || rv.status === 204) && op2.status === 404, `DELETE ${rv.status} ; GET après révocation ${op2.status}`)
      }
      // Lien de suivi
      const ls = await api(`/api/crm/chantiers/${chantier.id}/suivi`, { methode: 'POST' })
      const adrS = ls.json?.adresse
      T('e', 'lien de suivi créé', ls.status === 201 && /\/suivi\//.test(adrS ?? ''), `HTTP ${ls.status}`)
      if (adrS) {
        const cheminS = new URL(adrS).pathname
        const os = await fetch(`${BASE}${cheminS}`)
        const hs = await os.text()
        T('e', '/suivi/<jeton> s’ouvre sans session, sans prix', os.status === 200 && !/\d+[.,]\d{2}\s?€/.test(hs), `HTTP ${os.status}, ${hs.length} octets, « Presti » visible : ${/>[^<]*Presti[^<]*</.test(hs) ? 'OUI' : 'non'}`)
        const rs = await api(`/api/crm/chantiers/${chantier.id}/suivi`, { methode: 'DELETE' })
        const os2 = await fetch(`${BASE}${cheminS}`)
        T('e', 'révocation du lien de suivi → 404', os2.status === 404, `DELETE ${rs.status} ; GET après ${os2.status}`)
      }
      // CRM : le dossier et le pipeline reflètent les montants
      const total = Number(devisAuto.total_ttc)
      const contient = (j) => { const s = JSON.stringify(j ?? {}); return s.includes(String(total)) || s.includes(total.toFixed(2)) || s.includes(String(Math.round(total * 100))) }
      for (const chemin of ['/api/crm/vue', '/api/crm/pipeline', '/api/crm/clients']) {
        const r = await api(chemin)
        T('e', `${chemin} répond et cite le montant du dossier (${total} € TTC)`, r.status === 200 && contient(r.json), `HTTP ${r.status}, ${r.texte.length} octets, montant ${contient(r.json) ? 'présent' : 'ABSENT'} ; clés : ${Object.keys(r.json ?? {}).slice(0, 12).join(', ')}`)
      }
      const cl = await api('/api/crm/clients')
      const refs = JSON.stringify(cl.json ?? {}).match(/"ref"\s*:\s*"([^"]+)"/)
      if (refs) {
        const d1 = await api(`/api/crm/clients?ref=${encodeURIComponent(refs[1])}`)
        T('e', 'dossier client (/api/crm/clients?ref=…) cite le montant', d1.status === 200 && contient(d1.json), `HTTP ${d1.status}, montant ${contient(d1.json) ? 'présent' : 'ABSENT'}`)
      } else info('aucune ref de dossier trouvée dans /api/crm/clients')
    }
  }

  // ═══════════════════════════ g. Pages et routes ═══════════════════════════
  console.log('\n── g. Pages et routes principales (connecté / sans session)')
  const PAGES = ['/dashboard', '/messages', '/devis', '/factures', '/tarifs', '/inventaire', '/chiffres', '/crm', '/assistant', '/parametres', '/aide', '/plateforme', `/p/${SLUG}`]
  const nav = await chromium.launch()
  try {
    const ctx = await nav.newContext()
    const page = await ctx.newPage()
    const erreursConsole = []
    page.on('pageerror', (e) => erreursConsole.push(`${page.url()} : ${e.message.slice(0, 160)}`))
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
    await page.fill('input[type="email"]', EMAIL)
    await page.fill('input[type="password"]', MDP)
    await page.getByRole('button', { name: 'Se connecter' }).click()
    const issue = await codeEmailSiDemande(page, EMAIL, { uid })
    await page.waitForURL((u) => !/\/login/.test(u.pathname), { timeout: 30000 }).catch(() => {})
    T('g', 'connexion par l’écran /login (code e-mail posé par le service)', !/\/login/.test(new URL(page.url()).pathname), `issue=${issue}, arrivé sur ${new URL(page.url()).pathname}`)
    for (const p of PAGES) {
      const rep = await page.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' }).catch((e) => ({ status: () => `exception ${e.message}` }))
      await page.waitForTimeout(3500)
      const fin = new URL(page.url()).pathname
      const corps = (await page.locator('body').innerText().catch(() => '')).slice(0, 4000)
      const erreur = /Application error|Erreur inattendue|Something went wrong|404|introuvable/i.test(corps.slice(0, 600))
      T('g', `connecté ${p}`, rep.status() === 200 && fin === p && !erreur, `HTTP ${rep.status()}, URL finale ${fin}, ${corps.length} car., début : « ${corps.slice(0, 90).replace(/\s+/g, ' ')} »`)
    }
    if (erreursConsole.length) info('erreurs JavaScript de page :', erreursConsole.slice(0, 8).join(' | '))
    T('g', 'aucune erreur JavaScript non rattrapée sur ces pages', erreursConsole.length === 0, erreursConsole.slice(0, 5).join(' | ') || 'aucune')
    await ctx.close()
    const anon = await (await nav.newContext()).newPage()
    for (const p of PAGES.filter((x) => !x.startsWith('/p/') && x !== '/aide')) {
      const rep = await anon.goto(`${BASE}${p}`, { waitUntil: 'domcontentloaded' }).catch(() => null)
      await anon.waitForURL(/\/login|\/signup|\/$/, { timeout: 8000 }).catch(() => {})
      const fin = new URL(anon.url()).pathname
      T('g', `sans session ${p} → renvoyé à la connexion`, /\/login|\/signup/.test(fin) || fin === '/', `HTTP ${rep?.status?.()} puis ${fin}`)
    }
  } finally { await nav.close() }
  for (const chemin of ['/api/tarifs', '/api/devis', '/api/compta/tableau', '/api/crm/chantiers', '/api/pilote/file']) {
    const r = await api(chemin, { sansJeton: true })
    T('g', `API sans session ${chemin} → 401/404`, r.status === 401 || r.status === 404 || r.status === 405, `HTTP ${r.status}`)
  }

  // ═══════════════════════════ f (2/2). La n°2 part au passage du tic ═══════════════════════════
  console.log('\n── f. Attente du départ de la n°2 (tic minute, après part_le)')
  if (file2) {
    const limite = Date.parse(file2.part_le) + 4 * 60_000
    let f2 = null
    while (Date.now() < limite) {
      const { data } = await admin.from('actions_auto').select('statut, motif, traite_le').eq('id', file2.id).single()
      f2 = data
      if (!['a_partir', 'en_cours'].includes(f2.statut)) break
      await pause(20_000)
    }
    const { data: m2 } = await admin.from('messages').select('etat, contenu').eq('lead_id', leadP2).eq('sens', 'out').eq('type', 'reponse_auto').maybeSingle()
    const { data: tic } = await admin.from('passages_cron').select('dernier_passage, reussi, detail').eq('nom', 'tic').single()
    const avantPartLe = f2?.traite_le ? Date.parse(f2.traite_le) < Date.parse(file2.part_le) : null
    T('f', 'la n°2 est partie seule après le délai (statut « partie », message envoyé)', f2?.statut === 'partie' && m2 && m2.etat !== 'proposition' && avantPartLe === false,
      `actions_auto.statut=${f2?.statut} motif=${f2?.motif} traite_le=${f2?.traite_le} (part_le ${file2.part_le}) ; messages.etat=${m2?.etat} ; dernier tic ${tic?.dernier_passage} reussi=${tic?.reussi} pilote=${JSON.stringify(tic?.detail?.etapes?.pilote)}`)
    const { data: f3b } = await admin.from('actions_auto').select('statut').eq('id', file3?.id ?? '00000000-0000-0000-0000-000000000000').maybeSingle()
    const { data: m3b } = await admin.from('messages').select('etat').eq('lead_id', leadP3).eq('sens', 'out').eq('type', 'reponse_auto').maybeSingle()
    T('f', 'la n°3 annulée n’est pas partie', f3b?.statut === 'annulee' && m3b?.etat === 'proposition', `actions_auto.statut=${f3b?.statut}, messages.etat=${m3b?.etat}`)
  }
} catch (e) {
  if (e.message !== 'FIN_COMPLEMENT') {
    ko++; console.log('  ❌ exception :', e.stack?.split('\n').slice(0, 3).join(' | '))
    preuves.push({ etape: 'exception', nom: e.message, ok: false })
  }
} finally {
  await purger()
}

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués\n`)
if (FICHIER_PREUVES) fs.writeFileSync(FICHIER_PREUVES, JSON.stringify({ quand: new Date().toISOString(), ok, ko, preuves }, null, 2))
process.exit(ko === 0 ? 0 : 1)
