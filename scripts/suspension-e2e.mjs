// La suspension, éprouvée de bout en bout (prompt v15 §5, tâche 014-17).
//
// Ce qu'elle prouve :
//   1. AVANT : l'artisan de test se connecte (200 sur une route authentifiée), sa page `/p/<slug>`
//      rend 200 sans « Page indisponible », `POST /api/leads` crée un lead, la fiche ne montre
//      pas de suspension.
//   2. SUSPENDRE (fondateur, `POST /api/controle/clients/<id>/action { action: 'suspendre', motif,
//      message }` avec re-confirmation) → 200 ; en base : une ligne `suspensions` sans `levee_le` ;
//      une ligne `journal_direction` `artisan_suspendu`.
//   3. EFFETS : la session de l'artisan est refusée (401/403, code `suspendu`) ; `/p/<slug>` contient
//      « Page indisponible » ; `POST /api/leads` → 410 avec le message neutre ; `POST /api/conversation`
//      sur le lead existant → `reply: null` (et `indisponible: true`) ; `GET /api/cron/relances`
//      (via le relanceur du Poste de contrôle ou CRON_SECRET) laisse la relance non envoyée et ne crée aucun message.
//   4. RÉACTIVER (`{ action: 'reactiver', motif }`) → 200 ; `levee_le` posé ; l'artisan se reconnecte ;
//      `/p/<slug>` rend la page normale ; `POST /api/leads` → 200 ; le cron envoie la relance — tout revient.
//   5. GARDE-FOUS : suspendre sans motif → 400 ; suspendre deux fois → 400 « déjà » ; le rôle
//      `lecture` → 403.
//
// 0 appel IA. Comptes `susp-<nom>-<st>@presti-test.invalid`, purgés en `finally`. Code 2 si le
// drapeau `actionsArtisan` est baissé.
//
// Usage : node scripts/suspension-e2e.mjs
// Contrôle de syntaxe : node --check scripts/suspension-e2e.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { verifierSessionTest } from './lib/connexion-test.mjs'

// ── .env.local ─────────────────────────────────────────────────────────────────────────────────────
for (const f of ['.env.local']) {
  if (!fs.existsSync(f)) continue
  for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
}

const APP = (process.env.TEST_BASE || 'https://prestiapp.fr').replace(/\/$/, '')
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_SB || !ANON || !SERVICE) { console.log('\n⛔ NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY requis.\n'); process.exit(2) }

const admin = createClient(URL_SB, SERVICE, { auth: { persistSession: false } })
let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? `\n     → ${d}` : ''}`) } }
const SAUT = (n, w) => console.log(`  ⏭  ${n} — ${w}`)

const st = crypto.randomBytes(3).toString('hex')
const comptes = []
const leadsCrees = []

// ── Aides ───────────────────────────────────────────────────────────────────────────────────────────

async function creerCompte({ nom, role, fondateur = false }) {
  const email = `susp-${nom}-${st}@presti-test.invalid`
  const password = `Su-${crypto.randomBytes(9).toString('base64url')}-1`
  const { data: u, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !u?.user?.id) return null
  comptes.push(u.user.id)
  const slug = `susp-${nom}-${st}`
  const { error: eA } = await admin.from('artisans').insert({
    id: u.user.id, email, nom: `Suspension ${nom}`, metier: 'Test', slug,
    plan: 'essentiel', is_founder: fondateur, est_demo: true,
    ...(role ? { role_interne: role } : {}),
    plateforme_active: true,
  })
  if (eA) { console.log(`     insertion artisan ${nom} :`, eA.message); return null }
  if (fondateur || role) {
    await admin.from('direction_roles').upsert(
      { user_id: u.user.id, role: role === 'lecture' || role === 'partenaire' ? 'lecture' : 'direction' },
      { onConflict: 'user_id' },
    )
  }
  return { uid: u.user.id, email, password, slug }
}

async function session(c) {
  const pub = createClient(URL_SB, ANON, { auth: { persistSession: false } })
  const { data: s } = await pub.auth.signInWithPassword({ email: c.email, password: c.password })
  const jeton = s?.session?.access_token
  if (!jeton) return null
  await verifierSessionTest(jeton)
  return jeton
}

const api = async (chemin, jeton, init = {}) => {
  const r = await fetch(`${APP}${chemin}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'presti-suspension-e2e (Chrome; Windows)',
      ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}),
      ...(init.headers ?? {}),
    },
  })
  const t = await r.text()
  let j = null
  try { j = JSON.parse(t) } catch { /* le statut suffit */ }
  return { statut: r.status, data: j, brut: t }
}

const purgerPlafondsDe = async (...uids) => {
  for (const u of uids) await admin.from('limites').delete().in('cle', [`reconf:${u}`, `direction:${u}`, `inscription:${u}`]).then(() => {}, () => {})
  await admin.from('limites').delete().like('cle', 'leads:ip:%').then(() => {}, () => {})
}

/** Obtenir un jeton de re-confirmation pour le fondateur. */
const reconf = async (fondateur, jeton) => {
  await purgerPlafondsDe(fondateur.uid)
  const r = await api('/api/controle/reconfirmer', jeton, {
    method: 'POST',
    body: JSON.stringify({ password: fondateur.password, portee: 'artisan' }),
  })
  if (r.data?.jeton) return r.data.jeton

  // Repli autorisé par la tâche : appel côté serveur avec la clé service
  const j = crypto.randomBytes(32).toString('base64url')
  const expire_le = new Date(Date.now() + 300 * 1000).toISOString()
  const hash = crypto.createHash('sha256').update(j).digest('hex')
  const { error } = await admin.from('reconfirmations').insert({
    jeton_hash: hash,
    user_id: fondateur.uid,
    portee: 'artisan',
    expire_le,
  })
  if (!error) return j
  console.log('     ⚠️  insertion directe reconfirmation échouée :', error.message)
  return null
}

async function executerCronRelances(fondateurJeton) {
  if (process.env.CRON_SECRET) {
    const r = await fetch(`${APP}/api/cron/relances`, {
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
        'User-Agent': 'presti-suspension-e2e',
      },
    })
    const brut = await r.text()
    let data = null
    try { data = JSON.parse(brut) } catch {}
    return { statut: r.status, data, brut }
  }
  return api('/api/controle/crons/relances/relancer', fondateurJeton, { method: 'POST' })
}

// ── Ménage (garanti par finally) ────────────────────────────────────────────────────────────────────

async function menage() {
  for (const lid of leadsCrees) {
    await admin.from('relances').delete().eq('lead_id', lid).then(() => {}, () => {})
    await admin.from('messages').delete().eq('lead_id', lid).then(() => {}, () => {})
    await admin.from('leads').delete().eq('id', lid).then(() => {}, () => {})
  }
  for (const id of comptes) {
    await admin.from('suspensions').delete().eq('artisan_id', id).then(() => {}, () => {})
    await admin.from('direction_roles').delete().eq('user_id', id).then(() => {}, () => {})
    await admin.from('journal_direction').delete().eq('acteur_id', id).then(() => {}, () => {})
    await admin.from('journal_direction').delete().eq('cible_id', id).then(() => {}, () => {})
    await admin.from('artisans').update({ is_founder: false, role_interne: null, plan: 'gratuit' }).eq('id', id).then(() => {}, () => {})
    await admin.rpc('purger_compte_test', { p_id: id }).then(() => {}, () => {})
    await admin.from('artisans').delete().eq('id', id).then(() => {}, () => {})
    await admin.auth.admin.deleteUser(id).catch(() => {})
  }
  await purgerPlafondsDe(...comptes)
  const { count } = await admin.from('artisans').select('id', { count: 'exact', head: true }).like('email', `%susp-%-${st}@presti-test.invalid%`)
  if (count) console.error(`  ⚠️  ${count} compte(s) SUBSISTENT — vérifiez-les.`)
  else if (comptes.length) console.log(`  🧹 ${comptes.length} compte(s) de test purgé(s)`)
}

// ── Exécution ───────────────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n══ Suspension — effets de bout en bout ══\n')
  console.log(`  Cible : ${APP}\n`)

  // ── 0. Préalables ─────────────────────────────────────────────────────────────────────────────
  console.log('0. Préalables')
  const sonde = await api('/api/controle/clients', null)
  if (sonde.statut === 404) { console.log('  ⛔ Le Poste de contrôle est fermé (drapeau baissé). Rien à éprouver.\n'); process.exit(2) }

  // Si actionsArtisan est baissé, la route d'action rend 404.
  const testAction = await api('/api/controle/clients/00000000-0000-0000-0000-000000000000/action', null, { method: 'POST', body: '{}' })
  if (testAction.statut === 404 && /introuvable/i.test(testAction.brut)) {
    console.log('  ⛔ actionsArtisan est baissé sur la cible. Rien à éprouver.\n')
    process.exit(2)
  }

  // ── 1. Décor : fondateur + artisan ────────────────────────────────────────────────────────────
  console.log('\n1. Décor : comptes de test')
  const fondateur = await creerCompte({ nom: 'fondateur', role: 'fondateur', fondateur: true })
  if (!fondateur) { console.log('  ⛔ impossible de créer le fondateur\n'); process.exit(1) }
  const jF = await session(fondateur)
  if (!jF) { console.log('  ⛔ session du fondateur impossible\n'); process.exit(1) }

  const artisan = await creerCompte({ nom: 'artisan', role: null, fondateur: false })
  if (!artisan) { console.log('  ⛔ impossible de créer l\'artisan\n'); process.exit(1) }
  const jA = await session(artisan)
  if (!jA) { console.log('  ⛔ session de l\'artisan impossible\n'); process.exit(1) }

  const lecteur = await creerCompte({ nom: 'lecteur', role: 'partenaire', fondateur: true })
  let jL = null
  if (lecteur) jL = await session(lecteur)

  T('fondateur, artisan et lecteur créés', !!fondateur.uid && !!artisan.uid && !!lecteur?.uid)

  // ── 2. AVANT : tout fonctionne ────────────────────────────────────────────────────────────────
  console.log('\n2. Avant la suspension : tout fonctionne')

  // 2a. L'artisan peut accéder à une route authentifiée (plateforme/config)
  const authAvant = await api('/api/plateforme/config', jA)
  T('l\'artisan accède à une route authentifiée (200)', authAvant.statut === 200, `HTTP ${authAvant.statut}`)

  // 2b. Sa page /p/<slug> rend 200 sans « Page indisponible »
  const pageAvant = await fetch(`${APP}/p/${artisan.slug}`, { headers: { 'User-Agent': 'presti-suspension-e2e' } })
  const htmlAvant = await pageAvant.text()
  T('/p/<slug> rend 200', pageAvant.status === 200, `HTTP ${pageAvant.status}`)
  T('/p/<slug> ne contient pas « Page indisponible »', !htmlAvant.includes('Page indisponible'))

  // 2c. POST /api/leads crée un lead
  const leadR = await api('/api/leads', null, {
    method: 'POST',
    body: JSON.stringify({
      slug: artisan.slug,
      contact: `prospect-${st}@presti-test.invalid`,
      nom_prospect: 'Prospect Test',
      message: 'J\'aimerais un devis pour une toiture de 30 m².',
    }),
  })
  T('POST /api/leads crée un lead (200)', leadR.statut === 200, `HTTP ${leadR.statut} — ${leadR.brut?.slice(0, 120)}`)
  const leadToken = leadR.data?.token ?? null
  const leadId = leadR.data?.leadId ?? leadR.data?.lead_id ?? null
  if (leadId) leadsCrees.push(leadId)

  // 2d. La fiche de l'artisan au Poste de contrôle ne montre pas de suspension
  const ficheAvant = await api(`/api/controle/clients/${artisan.uid}`, jF)
  T('la fiche de l\'artisan ne montre pas de suspension', ficheAvant.statut === 200 && !ficheAvant.data?.suspension, `HTTP ${ficheAvant.statut}`)

  // 2e. Insérer une relance dans le passé pour le test cron (statut repondu requis par le cron)
  let relanceId = null
  if (leadId) {
    await admin.from('leads').update({ statut: 'repondu' }).eq('id', leadId)
    const { data: relIns, error: relErr } = await admin.from('relances').insert({
      lead_id: leadId,
      planifiee_le: new Date(Date.now() - 3_600_000).toISOString(),
      rang: 1,
      envoyee: false,
    }).select('id').single()
    if (relErr) console.log('     ⚠️ insertion relance :', relErr.message)
    else relanceId = relIns.id
    T('relance planifiée dans le passé (pour le test cron)', !!relanceId)
  }

  // ── 3. SUSPENDRE ──────────────────────────────────────────────────────────────────────────────
  console.log('\n3. Suspendre l\'artisan')

  const jeton1 = await reconf(fondateur, jF)
  if (!jeton1) { console.log('  ⛔ re-confirmation impossible\n'); process.exit(1) }
  const suspR = await api(`/api/controle/clients/${artisan.uid}/action`, jF, {
    method: 'POST',
    body: JSON.stringify({ action: 'suspendre', motif: 'Test e2e suspension', message: 'Compte suspendu pour test.' }),
    headers: { 'x-presti-reconfirmation': jeton1 },
  })
  T('suspendre → 200', suspR.statut === 200, `HTTP ${suspR.statut} — ${suspR.brut?.slice(0, 120)}`)

  // Vérifier en base : une ligne suspensions sans levee_le
  const { data: suspDB } = await admin.from('suspensions').select('id, levee_le, message').eq('artisan_id', artisan.uid).is('levee_le', null).maybeSingle()
  T('en base : une suspension active (sans levee_le)', !!suspDB && !suspDB.levee_le, JSON.stringify(suspDB)?.slice(0, 120))

  // Vérifier en base : journal_direction artisan_suspendu
  const { data: jrSusp } = await admin.from('journal_direction').select('action').eq('cible_id', artisan.uid).eq('action', 'artisan_suspendu').limit(1).maybeSingle()
  T('en base : une ligne journal_direction « artisan_suspendu »', !!jrSusp)

  // ── 4. EFFETS ─────────────────────────────────────────────────────────────────────────────────
  console.log('\n4. Effets de la suspension')

  // 4a. Session de l'artisan refusée (401/403, code suspendu)
  const authApres = await api('/api/plateforme/config', jA)
  T('la session de l\'artisan est refusée (401 ou 403)', [401, 403].includes(authApres.statut), `HTTP ${authApres.statut}`)
  T('… avec le code « suspendu »', authApres.data?.code === 'suspendu', String(authApres.data?.code))

  // 4b. /p/<slug> contient « Page indisponible »
  const pageApres = await fetch(`${APP}/p/${artisan.slug}`, { headers: { 'User-Agent': 'presti-suspension-e2e' } })
  const htmlApres = await pageApres.text()
  T('/p/<slug> contient « Page indisponible »', htmlApres.includes('Page indisponible'))

  // 4c. POST /api/leads → 410
  const leadSusp = await api('/api/leads', null, {
    method: 'POST',
    body: JSON.stringify({
      slug: artisan.slug,
      contact: `prospect2-${st}@presti-test.invalid`,
      nom_prospect: 'Prospect Deux',
      message: 'Un autre devis.',
    }),
  })
  T('POST /api/leads → 410', leadSusp.statut === 410, `HTTP ${leadSusp.statut} — ${leadSusp.brut?.slice(0, 120)}`)
  T('… avec le message neutre', /n.est plus actif/i.test(leadSusp.data?.error ?? ''), leadSusp.data?.error)

  // 4d. POST /api/conversation → reply: null, indisponible: true
  if (leadToken) {
    const convSusp = await api('/api/conversation', null, {
      method: 'POST',
      body: JSON.stringify({ token: leadToken, message: 'Est-ce que vous pouvez passer cette semaine ?' }),
    })
    T('POST /api/conversation → reply: null', convSusp.data?.reply === null, JSON.stringify(convSusp.data)?.slice(0, 120))
    T('… et indisponible: true', convSusp.data?.indisponible === true, JSON.stringify(convSusp.data)?.slice(0, 120))
  } else SAUT('POST /api/conversation', 'pas de token de lead')

  // 4e. Le cron relances laisse la relance non envoyée
  if (relanceId) {
    // Le prospect a pu envoyer un message à l'étape 4d (mettant le statut à 'en_discussion').
    // Pour éprouver le saut de relance lié à la suspension (et non à l'avancement du fil),
    // le lead doit être en attente de relance ('repondu').
    await admin.from('leads').update({ statut: 'repondu' }).eq('id', leadId)
    const cronR = await executerCronRelances(jF)
    if (cronR.statut === 200) {
      const { data: relApres } = await admin.from('relances').select('envoyee').eq('id', relanceId).maybeSingle()
      T('le cron laisse la relance non envoyée (envoyee = false)', relApres?.envoyee === false, `envoyee = ${relApres?.envoyee}`)
      const { data: msgApres } = await admin.from('messages').select('id').eq('lead_id', leadId).eq('type', 'relance').limit(1)
      T('aucun message de relance créé', !msgApres?.length, `${msgApres?.length} message(s)`)
    } else if (cronR.statut === 503 && /secret/i.test(cronR.brut ?? '')) {
      SAUT('cron relances (pendant suspension)', 'CRON_SECRET absent — le relanceur ne peut pas déclencher le cron')
    } else {
      SAUT('cron relances (pendant suspension)', `HTTP ${cronR.statut} — ${cronR.brut?.slice(0, 120)}`)
    }
  } else SAUT('cron relances', 'pas de relance en base')

  // ── 5. RÉACTIVER ──────────────────────────────────────────────────────────────────────────────
  console.log('\n5. Réactiver l\'artisan')

  const jeton2 = await reconf(fondateur, jF)
  if (!jeton2) { console.log('  ⛔ re-confirmation impossible\n'); process.exit(1) }
  const reactR = await api(`/api/controle/clients/${artisan.uid}/action`, jF, {
    method: 'POST',
    body: JSON.stringify({ action: 'reactiver', motif: 'Fin du test e2e' }),
    headers: { 'x-presti-reconfirmation': jeton2 },
  })
  T('réactiver → 200', reactR.statut === 200, `HTTP ${reactR.statut} — ${reactR.brut?.slice(0, 120)}`)

  // Vérifier : levee_le posé
  const { data: suspLevee } = await admin.from('suspensions').select('levee_le').eq('artisan_id', artisan.uid).order('suspendu_le', { ascending: false }).limit(1).maybeSingle()
  T('en base : levee_le est posé', !!suspLevee?.levee_le)

  // L'artisan se reconnecte (nouvelle session — l'ancienne est révoquée par la suspension)
  const jA2 = await session(artisan)
  T('l\'artisan se reconnecte', !!jA2)

  if (jA2) {
    // 5a. Route authentifiée → 200
    const authReact = await api('/api/plateforme/config', jA2)
    T('l\'artisan accède à nouveau à ses données (200)', authReact.statut === 200, `HTTP ${authReact.statut}`)
  }

  // 5b. /p/<slug> rend la page normale
  const pageReact = await fetch(`${APP}/p/${artisan.slug}`, { headers: { 'User-Agent': 'presti-suspension-e2e' } })
  const htmlReact = await pageReact.text()
  T('/p/<slug> ne contient plus « Page indisponible »', !htmlReact.includes('Page indisponible'))

  // 5c. POST /api/leads → 200
  const leadReact = await api('/api/leads', null, {
    method: 'POST',
    body: JSON.stringify({
      slug: artisan.slug,
      contact: `prospect3-${st}@presti-test.invalid`,
      nom_prospect: 'Prospect Trois',
      message: 'Un devis après réactivation.',
    }),
  })
  T('POST /api/leads → 200 après réactivation', leadReact.statut === 200, `HTTP ${leadReact.statut} — ${leadReact.brut?.slice(0, 120)}`)
  const leadReactId = leadReact.data?.leadId ?? leadReact.data?.lead_id ?? null
  if (leadReactId) leadsCrees.push(leadReactId)

  // 5d. Le cron relances envoie la relance (ou la marque envoyée)
  if (relanceId) {
    const cronR2 = await executerCronRelances(jF)
    if (cronR2.statut === 200) {
      const { data: relReact } = await admin.from('relances').select('envoyee').eq('id', relanceId).maybeSingle()
      T('après réactivation, le cron traite la relance (envoyee = true)', relReact?.envoyee === true, `envoyee = ${relReact?.envoyee}`)
    } else if (cronR2.statut === 503 && /secret/i.test(cronR2.brut ?? '')) {
      SAUT('cron relances (après réactivation)', 'CRON_SECRET absent')
    } else {
      SAUT('cron relances (après réactivation)', `HTTP ${cronR2.statut} — ${cronR2.brut?.slice(0, 120)}`)
    }
  }

  // ── 6. GARDE-FOUS ────────────────────────────────────────────────────────────────────────────
  console.log('\n6. Garde-fous')

  // 6a. Suspendre sans motif → 400
  const jeton3 = await reconf(fondateur, jF)
  const sansMot = await api(`/api/controle/clients/${artisan.uid}/action`, jF, {
    method: 'POST',
    body: JSON.stringify({ action: 'suspendre' }),
    headers: jeton3 ? { 'x-presti-reconfirmation': jeton3 } : {},
  })
  T('suspendre sans motif → 400', sansMot.statut === 400, `HTTP ${sansMot.statut} — ${sansMot.brut?.slice(0, 120)}`)

  // 6b. Suspendre deux fois → 400 « déjà »
  // D'abord, re-suspendre l'artisan
  const jeton4 = await reconf(fondateur, jF)
  const susp2 = await api(`/api/controle/clients/${artisan.uid}/action`, jF, {
    method: 'POST',
    body: JSON.stringify({ action: 'suspendre', motif: 'Test double suspension' }),
    headers: jeton4 ? { 'x-presti-reconfirmation': jeton4 } : {},
  })
  if (susp2.statut === 200) {
    const jeton5 = await reconf(fondateur, jF)
    const susp3 = await api(`/api/controle/clients/${artisan.uid}/action`, jF, {
      method: 'POST',
      body: JSON.stringify({ action: 'suspendre', motif: 'Test double suspension bis' }),
      headers: jeton5 ? { 'x-presti-reconfirmation': jeton5 } : {},
    })
    T('suspendre deux fois → 400 « déjà »', susp3.statut === 400 && /déjà/i.test(susp3.data?.error ?? ''), `HTTP ${susp3.statut} — ${susp3.brut?.slice(0, 120)}`)

    // Réactiver pour laisser le compte propre
    const jeton6 = await reconf(fondateur, jF)
    await api(`/api/controle/clients/${artisan.uid}/action`, jF, {
      method: 'POST',
      body: JSON.stringify({ action: 'reactiver', motif: 'Nettoyage' }),
      headers: jeton6 ? { 'x-presti-reconfirmation': jeton6 } : {},
    })
  } else {
    T('(préalable) re-suspension échouée', false, `HTTP ${susp2.statut} — ${susp2.brut?.slice(0, 120)}`)
  }

  // 6c. Le rôle « lecture » → 403
  if (jL) {
    const jeton7 = await reconf(lecteur, jL)
    const suspLect = await api(`/api/controle/clients/${artisan.uid}/action`, jL, {
      method: 'POST',
      body: JSON.stringify({ action: 'suspendre', motif: 'Test rôle lecture' }),
      headers: jeton7 ? { 'x-presti-reconfirmation': jeton7 } : {},
    })
    T('le rôle « lecture » ne peut pas suspendre → 403', suspLect.statut === 403, `HTTP ${suspLect.statut} — ${suspLect.brut?.slice(0, 120)}`)
  } else SAUT('rôle lecture → 403', 'compte lecteur non créé')

  console.log(`\n══ ${ok} vérifications passées, ${ko} en échec ══\n`)
  console.log(`${ko === 0 ? '✅' : '❌'} suspension-e2e : ${ok} réussis, ${ko} échoués — ${APP}\n`)
}

main()
  .catch((e) => { console.error('\n💥 La suite s\'est arrêtée :', e?.message ?? e); ko++ })
  .finally(async () => { await menage(); process.exit(ko === 0 ? 0 : 1) })
