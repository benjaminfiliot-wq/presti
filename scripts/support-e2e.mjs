// Test permanent — le mode support (migration 0074, prompt v11 §3 et §5).
//
// Ce que cette suite prouve, dans l'ordre où ça compte :
//
//   A. UN TICKET N'AUTORISE RIEN. Le fondateur ouvre un ticket, demande un accès : tant que
//      l'artisan n'a pas cliqué, la lecture est refusée. C'est le cœur du dispositif — la condition
//      du v11 §5 (« sauf ticket support ouvert ») est nécessaire, jamais suffisante.
//   B. PAS D'EMAIL, PAS DE PORTE. Une fenêtre non notifiée ne s'ouvre pas, même avec le bon jeton.
//   C. L'ARTISAN OUVRE, ET LUI SEUL. Le fondateur n'a aucun chemin vers l'ouverture.
//   D. CHAQUE LECTURE LAISSE DEUX TRACES, dont une que l'artisan peut lire.
//   E. LA FORME, JAMAIS LE FOND. On vérifie mot par mot qu'aucun contenu, coordonnée ou désignation
//      ne sort — c'est la promesse la plus facile à casser par accident.
//   F. FERMER, EXPIRER, REFUSER, VERROUILLER : les quatre façons dont la porte se referme.
//   G. LE PARTENAIRE est refusé partout, jeton en main.
//
// Aucun appel IA. Aucun email réel : les comptes sont en @presti-test.invalid, que lib/email.ts
// accepte sans rien envoyer — c'est ce qui permet de prouver « pas d'email, pas de porte » sans
// écrire à personne.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/support-e2e.mjs

import crypto from 'node:crypto'
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { verifierSessionTest } from './lib/connexion-test.mjs'

const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
for (const [k, v] of Object.entries(env)) if (!process.env[k]) process.env[k] = v

const BASE = process.argv[2] || 'https://prestiapp.fr'
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? `\n     → ${d}` : ''}`) } }
const SAUT = (n, w) => console.log(`  ⏭  ${n} — ${w}`)

const marque = `support-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`
const comptes = []
const sortir = (code) => { process.exitCode = code; setTimeout(() => process.exit(code), 200) }

async function compte(role) {
  const email = `${marque}-${role}@presti-test.invalid`
  const password = `Sup-${crypto.randomBytes(9).toString('base64url')}-1`
  const { data: u, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !u?.user?.id) throw new Error(`création ${role} : ${error?.message}`)
  comptes.push(u.user.id)
  const { error: eA } = await admin.from('artisans').insert({
    id: u.user.id, email, nom: `Support ${role}`, metier: 'Test', slug: `${marque}-${role}`, plan: 'gratuit',
    is_founder: role !== 'artisan', role_interne: role === 'partenaire' ? 'partenaire' : role === 'fondateur' ? 'fondateur' : null,
  })
  if (eA) throw new Error(`fiche ${role} : ${eA.message}`)
  const pub = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: s } = await pub.auth.signInWithPassword({ email, password })
  if (!s?.session?.access_token) throw new Error(`session ${role}`)
  await verifierSessionTest(s.session.access_token)
  return { uid: u.user.id, email, jeton: s.session.access_token }
}

const api = async (chemin, jeton, init = {}) => {
  const r = await fetch(`${BASE}${chemin}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jeton}`, ...(init.headers ?? {}) } })
  const t = await r.text()
  let j = null
  try { j = JSON.parse(t) } catch { /* le statut reste lisible sans JSON */ }
  return { statut: r.status, data: j, brut: t.slice(0, 200) }
}

/** Le ménage, garanti : ces comptes portent `is_founder`. Privilèges retirés d'abord. */
async function menage() {
  // Les traces ne se suppriment plus une par une (0076) : elles partent avec le compte, en cascade,
  // par le même chemin qu'un vrai artisan qui demande son effacement. Le ménage éprouve donc lui
  // aussi la production, au lieu d'emprunter une porte de service.
  await admin.from('acces_support').delete().in('artisan_id', comptes).then(() => {}, () => {})
  await admin.from('tickets').delete().in('artisan_id', comptes).then(() => {}, () => {})
  await admin.from('support_verrou').delete().in('artisan_id', comptes).then(() => {}, () => {})
  await admin.from('courriers').delete().like('message_id', `%${marque}%`).then(() => {}, () => {})
  for (const id of comptes) {
    await admin.from('direction_roles').delete().eq('user_id', id).then(() => {}, () => {})
    await admin.from('artisans').update({ is_founder: false, role_interne: null }).eq('id', id).then(() => {}, () => {})
    await admin.from('journal_direction').delete().eq('acteur_id', id).then(() => {}, () => {})
    await admin.from('journal_direction').delete().eq('artisan_id', id).then(() => {}, () => {})
    await admin.rpc('purger_compte_test', { p_id: id }).then(() => {}, () => {})
    await admin.from('artisans').delete().eq('id', id).then(() => {}, () => {})
    await admin.auth.admin.deleteUser(id).catch(() => {})
  }
  const { count } = await admin.from('artisans').select('id', { count: 'exact', head: true }).like('email', `%${marque}%`)
  if (count) console.error(`\n⚠️  ${count} compte(s) de test SUBSISTENT — ils portent des privilèges, à vérifier à la main.`)
  else if (comptes.length) console.log(`\n  🧹 ${comptes.length} compte(s) de test purgé(s)`)
}

async function main() {
  console.log('\n══ Le mode support : une porte que seul l’artisan ouvre ══\n')

  // La migration est-elle collée ? Sans elle, rien de ce qui suit ne peut jouer — et ce n'est ni un
  // échec ni un succès : c'est un préalable qui n'appartient qu'à un humain.
  const { error: sonde } = await admin.from('acces_support').select('id').limit(1)
  if (sonde && /does not exist|schema cache|PGRST205/i.test(sonde.message)) {
    console.log('⛔ La migration 0074 n’est pas collée : la porte ne peut pas être vérifiée.')
    console.log('   À faire : coller supabase/migrations/_A_COLLER_sql_editor_0074_NU.sql dans le SQL Editor.\n')
    sortir(2); return
  }
  // 0075 ajoute les colonnes d'élément sur `tickets`. Sans elles, `demander_acces_support` refuse
  // TOUT (« ticket_sans_element ») : la suite serait rouge partout pour une seule et même raison.
  const { error: sonde75 } = await admin.from('tickets').select('element_id').limit(1)
  if (sonde75 && /does not exist|schema cache|column/i.test(sonde75.message)) {
    console.log('⛔ La migration 0075 n’est pas collée : sans elle, aucune demande ne peut aboutir.')
    console.log('   À faire : coller supabase/migrations/_A_COLLER_sql_editor_0075_NU.sql dans le SQL Editor.')
    sortir(2); return
  }

  const artisan = await compte('artisan')
  const fondateur = await compte('fondateur')
  const partenaire = await compte('partenaire')

  // Un élément qui appartient à l'artisan : une demande, avec un message dont on connaît le texte.
  const SECRET = `phrase-temoin-${marque}`
  const { data: lead } = await admin.from('leads').insert({
    artisan_id: artisan.uid, nom_prospect: 'Client Témoin', contact: 'temoin@exemple.fr',
    message: SECRET, statut: 'nouveau', token: crypto.randomUUID(),
  }).select('id').single()
  await admin.from('messages').insert({ lead_id: lead.id, sens: 'in', type: 'texte', contenu: SECRET })

  console.log('A zero. La porte d’entrée existe : l’artisan crée son ticket lui-même')
  // La suite fabriquait ses tickets en base. Elle était donc verte pendant que le mode support
  // était inatteignable, faute d'écran pour en créer un. Un test qui contourne l'entrée ne prouve
  // pas qu'il y en a une.
  {
    const dem = await api('/api/support/demande', artisan.jeton, {
      method: 'POST',
      body: JSON.stringify({ sujet: 'Test de la porte', message: 'Mon devis ne part pas, je ne comprends pas pourquoi.', element: { type: 'lead', id: lead.id } }),
    })
    T('⭑ l’artisan crée un ticket depuis SON espace', dem.statut === 200, `HTTP ${dem.statut} — ${dem.brut.slice(0, 140)}`)
    const { data: t0 } = await admin.from('tickets').select('id, element_type, element_id, element_titre').eq('artisan_id', artisan.uid).order('ouvert_le', { ascending: false }).limit(1).maybeSingle()
    T('… et l’élément qu’il a désigné est porté par le ticket',
      t0?.element_id === lead.id && t0?.element_type === 'lead', JSON.stringify(t0))
    T('… avec un titre résolu par le SERVEUR, pas recopié du navigateur',
      !!t0?.element_titre && /Conversation du/.test(t0.element_titre), t0?.element_titre ?? '(vide)')
  }

  console.log('A. Un ticket n’autorise rien par lui-même')
  const { data: ticket } = await admin.from('tickets').insert({
    artisan_id: artisan.uid, fil: `<${marque}@presti-test.invalid>`, sujet: 'Demande de test',
    // 0075 — le ticket porte l'élément que l'ARTISAN a désigné. Sans lui, rien n'est demandable.
    element_type: 'lead', element_id: lead.id, element_titre: 'Conversation de test',
  }).select('id').single()
  T('le ticket existe', !!ticket?.id)

  const dem = await api('/api/controle/support/demander', fondateur.jeton, {
    method: 'POST', body: JSON.stringify({ ticket: ticket.id, type: 'lead', element: lead.id, titre: 'Conversation de test', motif: 'Le client dit ne pas recevoir les réponses.' }),
  })
  // La re-confirmation est exigée : c'est attendu, et ça prouve que la demande n'est pas gratuite.
  if (dem.statut === 401 && /reconfirmation/i.test(JSON.stringify(dem.data))) {
    SAUT('la demande exige une re-confirmation au mot de passe', 'attendu : la porte n’est pas gratuite')
  } else T('la demande passe ou exige une re-confirmation', [200, 401, 403].includes(dem.statut), `HTTP ${dem.statut} ${dem.brut}`)

  // On crée la demande directement en base pour éprouver la suite sans jouer la re-confirmation.
  const { data: dAcces } = await admin.rpc('demander_acces_support', {
    p_acteur: fondateur.uid, p_acteur_email: fondateur.email, p_ticket: ticket.id, p_type: 'lead',
    p_element: lead.id, p_titre: 'Conversation de test', p_motif: 'Test automatisé', p_ip: '127.0.0.1', p_agent: 'suite',
  })
  const acces = dAcces?.acces
  T('la demande est enregistrée', dAcces?.etat === 'ok' && !!acces, JSON.stringify(dAcces))

  const avantClic = await api(`/api/controle/support/lire?acces=${acces}&vue=forme`, fondateur.jeton)
  T('⭑ sans le clic de l’artisan, la lecture est REFUSÉE', avantClic.statut === 403, `HTTP ${avantClic.statut} ${avantClic.brut}`)

  console.log('\nB. Pas d’email, pas de porte')
  const ouvertureSansNotif = await admin.rpc('ouvrir_acces_support', {
    p_acces: acces, p_artisan: artisan.uid, p_artisan_email: artisan.email, p_ip: '127.0.0.1', p_agent: 'suite',
  })
  T('une fenêtre non notifiée ne s’ouvre pas, même par son propriétaire',
    ouvertureSansNotif.data?.etat === 'non_notifie', JSON.stringify(ouvertureSansNotif.data))

  await admin.rpc('notifier_acces_support', { p_acces: acces, p_envoi: 'test' })

  console.log('\nC. L’artisan ouvre, et lui seul')
  const parUnAutre = await admin.rpc('ouvrir_acces_support', {
    p_acces: acces, p_artisan: fondateur.uid, p_artisan_email: fondateur.email, p_ip: '127.0.0.1', p_agent: 'suite',
  })
  T('⭑ le fondateur ne peut pas ouvrir la fenêtre à la place de l’artisan',
    parUnAutre.data?.etat === 'inconnu', JSON.stringify(parUnAutre.data))

  const ouverture = await api('/api/securite/acces-support', artisan.jeton, {
    method: 'POST', body: JSON.stringify({ acces, decision: 'ouvrir' }),
  })
  T('l’artisan ouvre depuis son espace', ouverture.statut === 200 && !!ouverture.data?.expire_le, `HTTP ${ouverture.statut} ${ouverture.brut}`)

  console.log('\nD. Chaque lecture laisse deux traces')
  const lu = await api(`/api/controle/support/lire?acces=${acces}&vue=forme`, fondateur.jeton)
  T('la lecture passe une fois la porte ouverte', lu.statut === 200, `HTTP ${lu.statut} ${lu.brut}`)
  const { count: nJournal } = await admin.from('journal_direction')
    .select('id', { count: 'exact', head: true }).eq('action', 'support_vu_comme').eq('artisan_id', artisan.uid)
  T('une ligne dans le journal de Presti', (nJournal ?? 0) >= 1, `${nJournal}`)
  const { data: vues } = await admin.from('acces_support_lectures').select('vue, acteur_nom').eq('acces_id', acces)
  T('une ligne LISIBLE PAR L’ARTISAN, avec le nom de la personne',
    (vues ?? []).length >= 1 && vues[0].vue === 'forme' && !!vues[0].acteur_nom, JSON.stringify(vues))

  console.log('\nE. La forme, jamais le fond')
  const brut = JSON.stringify(lu.data ?? {})
  T('⭑ le contenu du message ne sort PAS', !brut.includes(SECRET), brut.slice(0, 160))
  T('⭑ le nom du client ne sort pas', !brut.includes('Client Témoin'))
  T('⭑ l’adresse du client ne sort pas en clair', !brut.includes('temoin@exemple.fr'))
  T('… mais son domaine, oui : une non-remise est une affaire de domaine', brut.includes('exemple.fr'), brut.slice(0, 200))
  T('la longueur du message sort, elle', /"longueur":\s*\d+/.test(brut), brut.slice(0, 200))
  const { data: leadLu } = await admin.from('leads').select('token').eq('id', lead.id).maybeSingle()
  T('⭑ le jeton de la conversation ne sort jamais — c’est une CLÉ, pas une donnée', !brut.includes(leadLu?.token ?? 'jamais'))

  console.log('\nF. Les quatre façons de refermer')
  const fermeture = await api('/api/securite/acces-support', artisan.jeton, {
    method: 'POST', body: JSON.stringify({ acces, decision: 'fermer' }),
  })
  T('l’artisan ferme sans confirmation', fermeture.statut === 200, `HTTP ${fermeture.statut} ${fermeture.brut}`)
  const apresFermeture = await api(`/api/controle/support/lire?acces=${acces}&vue=forme`, fondateur.jeton)
  T('⭑ après fermeture, la lecture est refusée immédiatement', apresFermeture.statut === 403, `HTTP ${apresFermeture.statut}`)

  // Expiration : on recule l'heure de fin d'une fenêtre ouverte.
  const { data: d2 } = await admin.rpc('demander_acces_support', {
    p_acteur: fondateur.uid, p_acteur_email: fondateur.email, p_ticket: ticket.id, p_type: 'lead',
    p_element: lead.id, p_titre: 'Deuxième', p_motif: 'Test expiration', p_ip: '127.0.0.1', p_agent: 'suite',
  })
  await admin.rpc('notifier_acces_support', { p_acces: d2.acces, p_envoi: 'test' })
  await admin.rpc('ouvrir_acces_support', { p_acces: d2.acces, p_artisan: artisan.uid, p_artisan_email: artisan.email, p_ip: '127.0.0.1', p_agent: 'suite' })
  await admin.from('acces_support').update({ expire_le: new Date(Date.now() - 60_000).toISOString() }).eq('id', d2.acces)
  const expire = await api(`/api/controle/support/lire?acces=${d2.acces}&vue=forme`, fondateur.jeton)
  T('⭑ une fenêtre expirée ne lit plus rien', expire.statut === 403 && /expiré/i.test(JSON.stringify(expire.data)), `HTTP ${expire.statut} ${expire.brut}`)

  // Refus, puis le refroidissement de 24 h sur le même élément.
  const { data: d3 } = await admin.rpc('demander_acces_support', {
    p_acteur: fondateur.uid, p_acteur_email: fondateur.email, p_ticket: ticket.id, p_type: 'lead',
    p_element: lead.id, p_titre: 'Troisième', p_motif: 'Test refus', p_ip: '127.0.0.1', p_agent: 'suite',
  })
  await admin.rpc('notifier_acces_support', { p_acces: d3.acces, p_envoi: 'test' })
  const refus = await api('/api/securite/acces-support', artisan.jeton, {
    method: 'POST', body: JSON.stringify({ acces: d3.acces, decision: 'refuser', motif: 'non merci' }),
  })
  T('l’artisan refuse, sans avoir à se justifier', refus.statut === 200, `HTTP ${refus.statut} ${refus.brut}`)
  const { data: d4 } = await admin.rpc('demander_acces_support', {
    p_acteur: fondateur.uid, p_acteur_email: fondateur.email, p_ticket: ticket.id, p_type: 'lead',
    p_element: lead.id, p_titre: 'Quatrième', p_motif: 'Test redemande', p_ip: '127.0.0.1', p_agent: 'suite',
  })
  T('⭑ on ne redemande pas le même élément dans les 24 h — un refus est une réponse',
    d4?.etat === 'refuse_recemment', JSON.stringify(d4))

  // Le verrou personnel.
  await admin.from('support_verrou').insert({ artisan_id: artisan.uid })
  const { data: d5 } = await admin.rpc('demander_acces_support', {
    p_acteur: fondateur.uid, p_acteur_email: fondateur.email, p_ticket: ticket.id, p_type: 'lead',
    p_element: lead.id, p_titre: 'Cinquième', p_motif: 'Test verrou', p_ip: '127.0.0.1', p_agent: 'suite',
  })
  T('⭑ le verrou de l’artisan bloque la demande AVANT qu’elle l’atteigne', d5?.etat === 'verrouille', JSON.stringify(d5))
  await admin.from('support_verrou').delete().eq('artisan_id', artisan.uid)

  console.log('\nF bis. Ce que l’artisan a désigné, et rien d’autre (0075)')
  // Un ticket sans élément n'ouvre aucun accès. « Je n'arrive pas à me connecter » se règle en
  // parlant, pas en regardant les affaires de ses clients.
  const { data: tNu } = await admin.from('tickets').insert({
    artisan_id: artisan.uid, fil: `<${marque}-nu@presti-test.invalid>`, sujet: 'Sans élément',
  }).select('id').single()
  const { data: dNu } = await admin.rpc('demander_acces_support', {
    p_acteur: fondateur.uid, p_acteur_email: fondateur.email, p_ticket: tNu.id, p_type: 'lead',
    p_element: lead.id, p_titre: 'Tentative', p_motif: 'Test 0075', p_ip: '127.0.0.1', p_agent: 'suite',
  })
  T('⭑ un ticket sans élément désigné n’ouvre AUCUN accès', dNu?.etat === 'ticket_sans_element', JSON.stringify(dNu))

  // Et sur un ticket qui désigne un élément, on ne peut pas en demander un autre — même à lui.
  const { data: autre } = await admin.from('leads').insert({
    artisan_id: artisan.uid, nom_prospect: 'Autre Client', contact: 'autre@exemple.fr',
    message: 'autre message', statut: 'nouveau', token: crypto.randomUUID(),
  }).select('id').single()
  const { data: dAutre } = await admin.rpc('demander_acces_support', {
    p_acteur: fondateur.uid, p_acteur_email: fondateur.email, p_ticket: ticket.id, p_type: 'lead',
    p_element: autre.id, p_titre: 'Substitution', p_motif: 'Test 0075', p_ip: '127.0.0.1', p_agent: 'suite',
  })
  T('⭑ on ne peut pas demander un AUTRE élément que celui qu’il a désigné',
    dAutre?.etat === 'element_non_designe', JSON.stringify(dAutre))

  console.log('\nF ter. Le verrou se pose par l’artisan, et ferme ce qui était ouvert')
  // Une fenêtre ouverte, puis le verrou : « personne ne peut me demander » ne doit pas cohabiter
  // avec quelqu'un en train de regarder.
  // Son PROPRE ticket, sur son PROPRE élément : le ticket précédent porte un refus de moins de 24 h,
  // et la demande serait écartée pour cette raison-là — on ne saurait plus ce qu'on éprouve.
  const { data: tVerrou } = await admin.from('tickets').insert({
    artisan_id: artisan.uid, fil: `<${marque}-verrou@presti-test.invalid>`, sujet: 'Verrou',
    element_type: 'lead', element_id: autre.id, element_titre: 'Autre conversation',
  }).select('id').single()
  const { data: aOuvert } = await admin.rpc('demander_acces_support', {
    p_acteur: fondateur.uid, p_acteur_email: fondateur.email, p_ticket: tVerrou.id, p_type: 'lead',
    p_element: autre.id, p_titre: 'Autre conversation', p_motif: 'Test verrou', p_ip: '127.0.0.1', p_agent: 'suite',
  })
  if (aOuvert?.etat === 'ok') {
    await admin.rpc('notifier_acces_support', { p_acces: aOuvert.acces, p_envoi: 'test' })
    await admin.rpc('ouvrir_acces_support', {
      p_acces: aOuvert.acces, p_artisan: artisan.uid, p_artisan_email: artisan.email, p_ip: '127.0.0.1', p_agent: 'suite',
    })
    const pose = await api('/api/securite/acces-support', artisan.jeton, {
      method: 'POST', body: JSON.stringify({ decision: 'verrouiller' }),
    })
    T('l’artisan pose son verrou depuis SON espace', pose.statut === 200, `HTTP ${pose.statut} ${pose.brut}`)
    const { data: apres } = await admin.from('acces_support').select('ferme_le, ferme_motif').eq('id', aOuvert.acces).maybeSingle()
    T('⭑ poser le verrou FERME la fenêtre encore ouverte', !!apres?.ferme_le, JSON.stringify(apres))
    const relire = await api(`/api/controle/support/lire?acces=${aOuvert.acces}&vue=forme`, fondateur.jeton)
    T('… et la lecture est refusée immédiatement après', relire.statut === 403, `HTTP ${relire.statut} ${relire.brut}`)
    const leve = await api('/api/securite/acces-support', artisan.jeton, {
      method: 'POST', body: JSON.stringify({ decision: 'deverrouiller' }),
    })
    T('le verrou se lève aussi facilement qu’il se pose', leve.statut === 200, `HTTP ${leve.statut} ${leve.brut}`)
    const { data: reste } = await admin.from('support_verrou').select('artisan_id').eq('artisan_id', artisan.uid).maybeSingle()
    T('… et il ne reste rien en base', !reste)
  } else SAUT('le verrou ferme les fenêtres ouvertes', `la demande préalable a rendu ${aOuvert?.etat}`)

  console.log('\nG. Le partenaire est refusé, jeton en main')
  const pDemande = await api('/api/controle/support/demander', partenaire.jeton, {
    method: 'POST', body: JSON.stringify({ ticket: ticket.id, type: 'lead', element: lead.id, motif: 'Je regarde juste' }),
  })
  T('le partenaire ne peut pas demander d’accès', [403, 404].includes(pDemande.statut), `HTTP ${pDemande.statut} ${pDemande.brut}`)
  const pLire = await api(`/api/controle/support/lire?acces=${acces}&vue=forme`, partenaire.jeton)
  T('le partenaire ne peut pas lire sous support', [403, 404].includes(pLire.statut), `HTTP ${pLire.statut} ${pLire.brut}`)
  T('… et le refus lui dit pourquoi, en français', /Benjamin|périmètre|confient/i.test(JSON.stringify(pLire.data)), pLire.brut)

  console.log('\nH. La trace ne se réécrit pas')
  const { data: trace } = await admin.from('acces_support_lectures').select('id').eq('acces_id', acces).limit(1).maybeSingle()
  if (trace?.id) {
    const { error: eMod } = await admin.from('acces_support_lectures').update({ vue: 'chiffres' }).eq('id', trace.id)
    T('⭑ une trace de lecture ne se modifie pas, même en service_role', !!eMod, eMod?.message ?? '(modification acceptée)')
    // Une trace SEULE ne se supprime pas — y compris sur un compte de test. L'ancienne version
    // tolérait la suppression « pour un compte de test » : c'était l'anesthésiant qui a caché
    // pendant une journée qu'un VRAI compte devenait indestructible (0076).
    const { error: eSup } = await admin.from('acces_support_lectures').delete().eq('id', trace.id)
    T('⭑ une trace SEULE ne se supprime pas, même en service_role, même sur un compte de test',
      !!eSup && /conservation 24 mois/i.test(eSup.message ?? ''), eSup?.message ?? '(suppression acceptée)')

    // Et le chemin qui compte vraiment : l'artisan s'en va, ses traces partent avec lui. Sans ça,
    // une seule consultation de support suffisait à rendre son compte impossible à supprimer,
    // pendant que son écran affichait « Votre compte sera supprimé le… ».
    const { data: jetable } = await admin.auth.admin.createUser({
      email: `${marque}-purge@presti-test.invalid`, password: `Pg-${crypto.randomBytes(9).toString('base64url')}-1`, email_confirm: true,
    })
    if (jetable?.user?.id) {
      const u = jetable.user.id
      await admin.from('artisans').insert({ id: u, email: `${marque}-purge@presti-test.invalid`, nom: 'Purge', metier: 'Test', slug: `${marque}-purge`, plan: 'gratuit' })
      await admin.from('acces_support_lectures').insert({
        artisan_id: u, acces_id: acces, vue: 'forme', element_type: 'lead', acteur_nom: 'Sonde', acteur_id: fondateur.uid,
      }).then(() => {}, () => {})
      const { error: ePurge } = await admin.from('artisans').delete().eq('id', u)
      T('⭑ supprimer le compte de l’artisan emporte ses traces (droit à l’effacement)', !ePurge, ePurge?.message)
      const { count: reste } = await admin.from('acces_support_lectures').select('id', { count: 'exact', head: true }).eq('artisan_id', u)
      T('… et il n’en reste aucune', !reste, `${reste} trace(s) survivante(s)`)
      await admin.auth.admin.deleteUser(u).catch(() => {})
    } else SAUT('la suppression du compte emporte les traces', 'compte jetable non créé')
  } else SAUT('immuabilité de la trace', 'aucune trace à éprouver')
}

main()
  .catch((e) => { console.error('\n💥 La suite s’est arrêtée :', e?.message ?? e); ko++ })
  .finally(async () => {
    if (process.exitCode === 2) return
    await menage()
    console.log(`\n${ko ? '❌' : '✅'} ${ok} réussis, ${ko} échoués\n`)
    sortir(ko ? 1 : 0)
  })
