import assert from 'node:assert/strict'
import { createPrivateKey, sign } from 'node:crypto'
import { creerGoogleFactice } from './serveur-google.mjs'

const g = await creerGoogleFactice()
try {
  const c = JSON.parse(Buffer.from(g.env.GSC_COMPTE_SERVICE, 'base64'))
  const iat = Math.floor(g.maintenant.getTime() / 1000)
  const enc = x => Buffer.from(JSON.stringify(x)).toString('base64url')
  const h = enc({ alg: 'RS256', typ: 'JWT' })
  const p = enc({ iss: c.client_email, scope: 'https://www.googleapis.com/auth/siteverification https://www.googleapis.com/auth/webmasters', aud: g.origine + '/token', iat, exp: iat + 3600 })
  const assertion = `${h}.${p}.${sign('RSA-SHA256', Buffer.from(`${h}.${p}`), createPrivateKey(c.private_key)).toString('base64url')}`
  const oauth = a => fetch(g.origine + '/token', { method: 'POST', body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: a }) })
  assert.equal((await oauth(assertion.slice(0, -8) + 'AAAAAAAA')).status, 400)
  const claims = JSON.parse(Buffer.from(p, 'base64url'))
  for (const modification of [{ iss: 'autre@factice.invalid' }, { scope: 'portee-invalide' }, { aud: 'http://127.0.0.1/invalide' }, { exp: iat + 7200 }]) {
    const fautif = enc({ ...claims, ...modification })
    const signe = sign('RSA-SHA256', Buffer.from(`${h}.${fautif}`), createPrivateKey(c.private_key)).toString('base64url')
    assert.equal((await oauth(`${h}.${fautif}.${signe}`)).status, 400)
  }
  const debutPositif = g.appels.length
  const r = await oauth(assertion)
  assert.equal(r.status, 200)
  const jeton = (await r.json()).access_token
  const headers = { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' }
  const body = JSON.stringify({ site: { type: 'SITE', identifier: 'https://artisan.invalid/' }, verificationMethod: 'FILE' })
  const demande = await fetch(g.origine + '/siteVerification/v1/token', { method: 'POST', headers, body })
  assert.equal(demande.status, 200)
  assert.match((await demande.json()).token, /^google[0-9a-f]{16}\.html$/)
  assert.equal((await fetch(g.origine + '/siteVerification/v1/webResource?verificationMethod=FILE', { method: 'POST', headers, body })).status, 200)
  const site = '/webmasters/v3/sites/' + encodeURIComponent('https://artisan.invalid/')
  assert.equal((await fetch(g.origine + site, { method: 'PUT', headers })).status, 200)
  const plan = site + '/sitemaps/' + encodeURIComponent('https://artisan.invalid/sitemap.xml')
  assert.equal((await fetch(g.origine + plan, { method: 'PUT', headers })).status, 200)
  assert.equal((await fetch(g.origine + plan, { method: 'PUT' })).status, 401)
  g.erreurs.set('sitemap', 503)
  assert.equal((await fetch(g.origine + plan, { method: 'PUT', headers })).status, 503)
  assert.deepEqual(g.appels.slice(debutPositif, debutPositif + 5).map(a => a.etape), ['oauth', 'token', 'verification', 'site', 'sitemap'])
  const journal = JSON.stringify(g.appels)
  assert(!journal.includes(g.canaris.cle) && !journal.includes(g.canaris.acces))
  console.log(JSON.stringify({ verdict: 'PASS', appels: g.appels.length, rsa_2048_rs256_verifie: true, assertion_invalide_refusee: true, quatre_claims_fautifs_signes_refuses: true, jeton_invalide_refuse: true, panne_503_reelle: true, journal_sans_secret: true, uniquement_loopback: true }))
} finally { await g.fermer() }
