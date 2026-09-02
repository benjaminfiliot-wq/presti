// Vérif B3-2 : comptes clients de la plateforme (§6/§D4) — lien magique à usage unique,
// session en cookie httpOnly, RÉVOCATION SERVEUR réelle, anti-énumération, cloisonnement.
import crypto from 'crypto'
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY
const APP = process.argv[2] || 'https://prestiapp.fr'
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const fails = []
const ok = (c, m) => { console.log((c ? 'PASS' : 'FAIL') + ' — ' + m); if (!c) fails.push(m) }
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')
const auth = (body, cookie) => fetch(`${APP}/api/p/auth`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) })

const st = Date.now()
const mk = async (n) => {
  const email = `ca${n}.${st}@x.fr`, slug = `ca${n}-${st}`
  const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password: 'Test123456!', email_confirm: true }) })).json()
  await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: u.id, email, nom: `Atelier ${n}`, metier: 'Menuisier', slug, plan: 'business', plateforme_active: true }) })
  return { id: u.id, slug }
}
const A = await mk(1), B = await mk(2)
const clientEmail = `client.${st}@example.com`
// On pose nous-mêmes un lien magique (le jeton en clair n'existe que dans l'email).
const poseLien = async (artisanId, email, minutes = 20) => {
  const jeton = crypto.randomBytes(32).toString('base64url')
  await rest('clients_liens', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ artisan_id: artisanId, email: email.toLowerCase(), token_hash: sha(jeton), expire_le: new Date(Date.now() + minutes * 60000).toISOString() }) })
  return jeton
}
console.log('seed', A.slug, B.slug)

try {
  // 1) ANTI-ÉNUMÉRATION : slug inconnu et slug connu → réponse identique
  const r1 = await auth({ action: 'demande', slug: A.slug, email: clientEmail })
  const r2 = await auth({ action: 'demande', slug: `inconnu-${st}`, email: clientEmail })
  ok(r1.status === r2.status && JSON.stringify(await r1.json()) === JSON.stringify(await r2.json()), 'réponse identique pour un compte existant ou non (aucune énumération)')

  // 2) CONNEXION par lien magique
  const jeton = await poseLien(A.id, clientEmail)
  const v = await auth({ action: 'verifier', token: jeton })
  const setCookie = v.headers.get('set-cookie') || ''
  ok(v.status === 200, `lien magique accepté (${v.status})`)
  ok(/httponly/i.test(setCookie) && /samesite/i.test(setCookie) && /secure/i.test(setCookie), 'cookie de session httpOnly + Secure + SameSite (jamais lisible en JS)')
  const cookie = setCookie.split(';')[0]
  const [cl] = await (await rest(`clients_plateforme?artisan_id=eq.${A.id}&select=id,email,derniere_connexion`)).json()
  ok(cl?.email === clientEmail && !!cl.derniere_connexion, 'compte client créé et connexion horodatée')

  // 3) La session fonctionne
  const me = await (await fetch(`${APP}/api/p/auth`, { headers: { Cookie: cookie } })).json()
  ok(me.connecte === true && me.client?.email === clientEmail, 'session valide (le client est reconnu)')

  // 4) USAGE UNIQUE : rejouer le même lien échoue
  const rejoue = await auth({ action: 'verifier', token: jeton })
  ok(rejoue.status === 400, `un lien magique ne sert qu'une fois (${rejoue.status})`)

  // 5) ⭑ RÉVOCATION SERVEUR : on copie le cookie, on se déconnecte, on rejoue le cookie copié
  const copie = cookie
  await auth({ action: 'deconnexion' }, copie)
  const apres = await (await fetch(`${APP}/api/p/auth`, { headers: { Cookie: copie } })).json()
  ok(apres.connecte === false, '⭑ un cookie copié AVANT la déconnexion est refusé APRÈS (révocation serveur réelle)')

  // 6) LIEN EXPIRÉ refusé
  const vieux = await poseLien(A.id, clientEmail, -5)
  const exp = await auth({ action: 'verifier', token: vieux })
  ok(exp.status === 400, `un lien expiré est refusé (${exp.status})`)

  // 7) CLOISONNEMENT : le même email chez deux artisans = deux comptes distincts
  const jetonB = await poseLien(B.id, clientEmail)
  await auth({ action: 'verifier', token: jetonB })
  const chezA = await (await rest(`clients_plateforme?artisan_id=eq.${A.id}&select=id`)).json()
  const chezB = await (await rest(`clients_plateforme?artisan_id=eq.${B.id}&select=id`)).json()
  ok(chezA.length === 1 && chezB.length === 1 && chezA[0].id !== chezB[0].id, 'même email chez 2 artisans = 2 comptes étanches')

  // 8) Les tables clients ne sont pas lisibles par un navigateur anonyme (RLS)
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const fuite = await (await fetch(`${SB}/rest/v1/clients_sessions?select=*`, { headers: { apikey: anon, Authorization: `Bearer ${anon}` } })).json()
  ok(Array.isArray(fuite) && fuite.length === 0, `RLS : les sessions clients ne fuient pas (${Array.isArray(fuite) ? fuite.length : 'err'})`)
} catch (e) { ok(false, 'exception: ' + (e?.message || e)) } finally {
  await admin(`users/${A.id}`, { method: 'DELETE' }); await admin(`users/${B.id}`, { method: 'DELETE' })
  console.log('nettoyé —', fails.length ? `❌ ${fails.length} FAIL` : '✅ TOUT PASSE')
  process.exit(fails.length ? 1 : 0)
}
