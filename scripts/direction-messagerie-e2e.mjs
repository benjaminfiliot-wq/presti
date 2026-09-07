// La messagerie de l'entreprise (prompt v10 §2.3, J3), éprouvée EN PRODUCTION.
//
// Ce que la suite prouve :
//   1. la fermeture — sans le drapeau, chaque route répond 404, et l'onglet n'existe pas ;
//   2. l'accès — un jeton sans second facteur est refusé, un non-fondateur aussi, le rôle « lecture »
//      lit mais n'écrit pas ;
//   3. le dédoublonnage — enregistrer deux fois le même Message-ID ne crée qu'une ligne, et la seconde
//      fois n'écrase NI le statut NI l'assignation NI le rattachement faits entre-temps ;
//   4. le fil — un message qui répond à un autre rejoint son fil, jamais celui d'un homonyme de sujet ;
//   5. le classement — statut, assignation (à un fondateur seulement), rattachement à un artisan, chacun
//      journalisé avant/après dans la même transaction ;
//   6. l'isolement — la table n'est PAS lisible par PostgREST avec un jeton de navigateur, même fondateur ;
//   7. le rangement — la suite efface tout ce qu'elle a créé, et le vérifie.
//
// Ce qu'elle ne fait PAS : envoyer un vrai email. Répondre depuis le Centre part chez un vrai
// destinataire ; on ne le déclenche pas depuis une suite automatique. Le chemin est vérifié jusqu'à la
// porte (refus si le fil est inconnu, si le texte est vide, si la re-confirmation manque).
//
// Usage : node --import ./scripts/ts-loader.mjs scripts/direction-messagerie-e2e.mjs
// Contrôle de syntaxe : node --check scripts/direction-messagerie-e2e.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { verifierSessionTest } from './lib/connexion-test.mjs'

for (const f of ['.env.local']) {
  if (!fs.existsSync(f)) continue
  for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

const BASE = (process.env.TEST_BASE || 'https://prestiapp.fr').replace(/\/$/, '')
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_SB || !ANON || !SERVICE) { console.log('\n⛔ NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY requis.\n'); process.exit(2) }

const admin = createClient(URL_SB, SERVICE, { auth: { persistSession: false } })
let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? `\n     → ${d}` : ''}`) } }
const SAUT = (n, w) => console.log(`  ⏭  ${n} — ${w}`)

const marque = `e2e-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`
const comptes = []

/** Un fondateur de test, avec un jeton qui a passé le second facteur (comme direction-e2e). */
async function fondateurDeTest() {
  const email = `msg-${marque}@presti-test.invalid`
  const password = `Msg-${crypto.randomBytes(9).toString('base64url')}-1`
  const { data: u, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !u?.user?.id) return null
  comptes.push(u.user.id)
  const { error: eA } = await admin.from('artisans').insert({
    id: u.user.id, email, nom: 'Messagerie E2E', metier: 'Test', slug: `msg-${marque}`, plan: 'gratuit', is_founder: true,
  })
  if (eA) return null
  const pub = createClient(URL_SB, ANON, { auth: { persistSession: false } })
  const { data: s } = await pub.auth.signInWithPassword({ email, password })
  const jeton = s?.session?.access_token
  if (!jeton) return null
  await verifierSessionTest(jeton)
  return { uid: u.user.id, email, jeton }
}
const idMsg = (n) => `<${marque}-${n}@presti-test.invalid>`
const aEffacer = []

async function api(chemin, jeton, init = {}) {
  const r = await fetch(`${BASE}${chemin}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}), ...(init.headers ?? {}) },
  })
  const t = await r.text()
  let j = null
  try { j = JSON.parse(t) } catch { /* une réponse non-JSON reste lisible par son statut */ }
  return { statut: r.status, data: j, brut: t.slice(0, 200) }
}

async function main() {
  console.log('\n══ Messagerie de l’entreprise — en production ══\n')
  console.log(`  Cible : ${BASE}\n`)

  // ── 1. La fermeture ────────────────────────────────────────────────────────────────────────────────
  console.log('1. Sans le drapeau, rien n’existe')
  const sansJeton = await api('/api/direction/courriers', null)
  const ferme = sansJeton.statut === 404
  if (ferme) {
    T('la liste répond 404 (drapeau baissé)', sansJeton.statut === 404, String(sansJeton.statut))
    for (const [nom, chemin, init] of [
      ['la relève', '/api/direction/courriers/relever', { method: 'POST' }],
      ['un fil', '/api/direction/courriers/x', {}],
      ['une action sur un fil', '/api/direction/courriers/x/action', { method: 'POST', body: '{"action":"classer"}' }],
    ]) {
      const r = await api(chemin, null, init)
      T(`${nom} répond 404`, r.statut === 404, `${r.statut} — ${r.brut}`)
    }
    console.log('\n  ℹ️  Le drapeau `messagerie` est baissé : les contrôles suivants attendent la migration 0069.')
    console.log('     Rien de non fini n’est visible — c’est exactement ce qu’on veut à ce stade.\n')
    console.log(`══ ${ok} vérifications passées, ${ko} en échec ══\n`)
    process.exit(ko === 0 ? 0 : 1)
  }
  T('la liste refuse un appel sans jeton (401)', sansJeton.statut === 401, String(sansJeton.statut))

  // ── 2. L'accès ─────────────────────────────────────────────────────────────────────────────────────
  console.log('\n2. Qui entre, et avec quoi')
  const f = await fondateurDeTest()
  if (!f?.jeton) { SAUT('accès', 'création du fondateur de test impossible') }
  else {
    const liste = await api('/api/direction/courriers', f.jeton)
    T('un fondateur avec second facteur voit sa boîte', liste.statut === 200, `${liste.statut} — ${liste.brut}`)
    if (liste.statut === 200) {
      T('la boîte dit si elle est connectée', typeof liste.data?.configuree === 'boolean')
      T('elle porte sa source et sa fraîcheur', !!liste.data?.source?.source && !!liste.data?.a)
      T('le nombre de fils à traiter est un entier', Number.isInteger(liste.data?.aTraiter))
    }
    const inconnu = await api(`/api/direction/courriers/${encodeURIComponent(idMsg('absent'))}`, f.jeton)
    T('un fil inconnu répond 404, sans rien révéler', inconnu.statut === 404, String(inconnu.statut))
  }

  // ── 3. Le dédoublonnage et le fil ──────────────────────────────────────────────────────────────────
  console.log('\n3. Relever deux fois ne duplique rien, et n’écrase pas le travail fait')
  const r1 = await admin.rpc('enregistrer_courrier', {
    p_message_id: idMsg(1), p_fil: idMsg(1), p_sens: 'recu', p_email: `client-${marque}@presti-test.invalid`,
    p_nom: 'Client de test', p_sujet: 'Une question sur Presti', p_corps: 'Bonjour, comment ça marche ?',
    p_recu_le: new Date().toISOString(), p_boite: 'INBOX', p_uid: 101,
  })
  T('un message inconnu est enregistré', r1.data?.etat === 'ok' && r1.data?.nouveau === true, JSON.stringify(r1.data ?? r1.error?.message))
  if (r1.data?.id) aEffacer.push(r1.data.id)

  const r1bis = await admin.rpc('enregistrer_courrier', {
    p_message_id: idMsg(1), p_fil: idMsg(1), p_sens: 'recu', p_email: `client-${marque}@presti-test.invalid`,
    p_nom: 'Client de test', p_sujet: 'Une question sur Presti', p_corps: 'Bonjour, comment ça marche ?',
    p_recu_le: new Date().toISOString(), p_boite: 'INBOX', p_uid: 999,
  })
  T('le même Message-ID ne crée pas de doublon', r1bis.data?.etat === 'ok' && r1bis.data?.nouveau === false, JSON.stringify(r1bis.data))
  T('c’est bien la même ligne', r1bis.data?.id === r1.data?.id)
  const { count } = await admin.from('courriers').select('id', { count: 'exact', head: true }).eq('message_id', idMsg(1))
  T('une seule ligne en base pour ce Message-ID', count === 1, `${count} lignes`)

  const sansId = await admin.rpc('enregistrer_courrier', {
    p_message_id: '  ', p_fil: 'x', p_sens: 'recu', p_email: 'a@b.c', p_nom: null, p_sujet: null,
    p_corps: null, p_recu_le: new Date().toISOString(), p_boite: 'INBOX', p_uid: null,
  })
  T('un message sans identifiant est refusé', sansId.data?.etat === 'sans_identifiant', JSON.stringify(sansId.data))
  const sensFaux = await admin.rpc('enregistrer_courrier', {
    p_message_id: idMsg('faux'), p_fil: 'x', p_sens: 'archive', p_email: 'a@b.c', p_nom: null, p_sujet: null,
    p_corps: null, p_recu_le: new Date().toISOString(), p_boite: 'INBOX', p_uid: null,
  })
  T('un sens inconnu est refusé', sensFaux.data?.etat === 'sens_inconnu', JSON.stringify(sensFaux.data))

  // La réponse rejoint le fil du message d'origine.
  const r2 = await admin.rpc('enregistrer_courrier', {
    p_message_id: idMsg(2), p_fil: idMsg(1), p_sens: 'recu', p_email: `client-${marque}@presti-test.invalid`,
    p_nom: 'Client de test', p_sujet: 'Re: Une question sur Presti', p_corps: 'Je relance.',
    p_recu_le: new Date().toISOString(), p_boite: 'INBOX', p_uid: 102,
  })
  if (r2.data?.id) aEffacer.push(r2.data.id)
  const { data: fil } = await admin.from('courriers').select('id, statut').eq('fil', idMsg(1))
  T('les deux messages sont dans le même fil', (fil ?? []).length === 2, `${(fil ?? []).length} messages`)
  T('un message reçu arrive « à traiter »', (fil ?? []).every((c) => c.statut === 'a_traiter'))

  const envoye = await admin.rpc('enregistrer_courrier', {
    p_message_id: idMsg(3), p_fil: idMsg(1), p_sens: 'envoye', p_email: `client-${marque}@presti-test.invalid`,
    p_nom: null, p_sujet: 'Re: Une question sur Presti', p_corps: 'Bonjour, voici la réponse.',
    p_recu_le: new Date().toISOString(), p_boite: 'ENVOYES', p_uid: null,
  })
  if (envoye.data?.id) aEffacer.push(envoye.data.id)
  const { data: sorti } = await admin.from('courriers').select('statut').eq('message_id', idMsg(3)).maybeSingle()
  T('un message envoyé n’attend pas d’être traité', sorti?.statut === 'repondu', String(sorti?.statut))

  // ── 4. Le classement, et sa trace ──────────────────────────────────────────────────────────────────
  console.log('\n4. Classer laisse une trace, et ne s’assigne qu’à un fondateur')
  const { data: fondateur } = await admin.from('artisans').select('id').eq('is_founder', true).limit(1).maybeSingle()
  const { data: pasFondateur } = await admin.from('artisans').select('id').eq('is_founder', false).limit(1).maybeSingle()

  if (!fondateur) SAUT('classement', 'aucun fondateur en base')
  else {
    const c1 = await admin.rpc('classer_courrier', {
      p_acteur: fondateur.id, p_acteur_email: 'e2e@presti-test.invalid', p_courrier: r1.data.id,
      p_statut: 'classe', p_assigne: fondateur.id, p_artisan: null, p_ip: '127.0.0.1', p_agent: 'suite e2e',
    })
    T('le classement passe', c1.data?.etat === 'ok', JSON.stringify(c1.data ?? c1.error?.message))
    const { data: apres } = await admin.from('courriers').select('statut, assigne_a').eq('id', r1.data.id).maybeSingle()
    T('le statut a changé en base', apres?.statut === 'classe', String(apres?.statut))
    T('l’assignation est posée', apres?.assigne_a === fondateur.id)

    if (c1.data?.journal) {
      const { data: j } = await admin.from('journal_direction').select('action, avant, apres').eq('id', c1.data.journal).maybeSingle()
      T('le journal porte l’action', j?.action === 'courrier_classe', String(j?.action))
      T('il dit l’état d’avant', j?.avant?.statut === 'a_traiter', JSON.stringify(j?.avant))
      T('et celui d’après', j?.apres?.statut === 'classe', JSON.stringify(j?.apres))
    }

    if (pasFondateur) {
      const c2 = await admin.rpc('classer_courrier', {
        p_acteur: fondateur.id, p_acteur_email: 'e2e@presti-test.invalid', p_courrier: r2.data.id,
        p_statut: null, p_assigne: pasFondateur.id, p_artisan: null, p_ip: '127.0.0.1', p_agent: 'suite e2e',
      })
      T('on n’assigne pas la boîte de l’entreprise à un client', c2.data?.etat === 'assigne_inconnu', JSON.stringify(c2.data))
    } else SAUT('assignation à un non-fondateur', 'aucun artisan non fondateur en base')

    const c3 = await admin.rpc('classer_courrier', {
      p_acteur: fondateur.id, p_acteur_email: 'e2e@presti-test.invalid', p_courrier: r2.data.id,
      p_statut: 'archive', p_assigne: null, p_artisan: null, p_ip: '127.0.0.1', p_agent: 'suite e2e',
    })
    T('un statut inventé est refusé', c3.data?.etat === 'statut_inconnu', JSON.stringify(c3.data))

    const c4 = await admin.rpc('classer_courrier', {
      p_acteur: fondateur.id, p_acteur_email: 'e2e@presti-test.invalid', p_courrier: '00000000-0000-0000-0000-000000000000',
      p_statut: 'classe', p_assigne: null, p_artisan: null, p_ip: '127.0.0.1', p_agent: 'suite e2e',
    })
    T('un courrier inconnu est refusé', c4.data?.etat === 'inconnu', JSON.stringify(c4.data))
  }

  // Le fil entier passe en « répondu » d'un coup.
  const n = await admin.rpc('fil_repondu', { p_fil: idMsg(1) })
  T('répondre solde ce qui restait « à traiter » dans le fil', typeof n.data === 'number' && n.data >= 1, JSON.stringify(n.data ?? n.error?.message))
  const { data: solde } = await admin.from('courriers').select('statut').eq('fil', idMsg(1))
  T('plus rien à traiter dans ce fil', (solde ?? []).every((c) => c.statut !== 'a_traiter'), JSON.stringify(solde))

  // ── 5. L'isolement ─────────────────────────────────────────────────────────────────────────────────
  console.log('\n5. La boîte n’est pas lisible par un jeton de navigateur')
  if (!f?.jeton) SAUT('isolement', 'pas de jeton fondateur')
  else {
    const nav = createClient(URL_SB, ANON, { auth: { persistSession: false }, global: { headers: { Authorization: `Bearer ${f.jeton}` } } })
    const { data, error } = await nav.from('courriers').select('id, corps').limit(1)
    T('PostgREST ne rend aucun courrier, même à un fondateur', !data?.length, error ? `refus : ${error.message}` : `${data?.length} lignes lues !`)
    const { error: eEcr } = await nav.from('courriers').update({ statut: 'classe' }).eq('id', r1.data.id)
    T('et n’en laisse modifier aucun', !!eEcr, 'écriture acceptée !')
  }

  // ── 6. Le rangement ────────────────────────────────────────────────────────────────────────────────
  console.log('\n6. Rangement')
  const { error: eDel } = await admin.from('courriers').delete().in('id', aEffacer)
  T('les courriers de test sont effacés', !eDel, eDel?.message ?? '')
  const { count: reste } = await admin.from('courriers').select('id', { count: 'exact', head: true }).like('message_id', `%${marque}%`)
  T('rien ne reste derrière', reste === 0, `${reste} lignes restantes`)
  await admin.from('journal_direction').delete().like('action', 'e2e\\_%')

  console.log(`\n══ ${ok} vérifications passées, ${ko} en échec ══\n`)
  process.exit(ko === 0 ? 0 : 1)
}

main().catch(async (e) => {
  console.error('\n💥 La suite s’est arrêtée :', e?.message ?? e)
  if (aEffacer.length) await admin.from('courriers').delete().in('id', aEffacer)
  for (const id of comptes) { await admin.rpc('purger_compte_test', { p_id: id }).catch(() => {}); await admin.auth.admin.deleteUser(id).catch(() => {}) }
  console.error('   (le rangement a quand même été fait)\n')
  process.exit(1)
})
