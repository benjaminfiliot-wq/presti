// Référence synthétique du contrat injecté ; aucun module production livré.
import { sign, createPrivateKey } from 'node:crypto'
export async function jetonCompteService(env, d) {
  if (!env.GSC_COMPTE_SERVICE) return { ok: false, raison: 'sans_compte' }
  const compte = JSON.parse(Buffer.from(env.GSC_COMPTE_SERVICE, 'base64'))
  const iat = Math.floor(d.maintenant().getTime() / 1000)
  const enc = x => Buffer.from(JSON.stringify(x)).toString('base64url')
  const h = enc({ alg: 'RS256', typ: 'JWT' })
  const p = enc({ iss: compte.client_email, scope: 'https://www.googleapis.com/auth/siteverification https://www.googleapis.com/auth/webmasters', aud: d.jetonUrl, iat, exp: iat + 3600 })
  const assertion = `${h}.${p}.${sign('RSA-SHA256', Buffer.from(`${h}.${p}`), createPrivateKey(compte.private_key)).toString('base64url')}`
  const r = await d.fetch(d.jetonUrl, { method: 'POST', body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) })
  if (!r.ok) return { ok: false, raison: 'jeton_refuse' }
  return { ok: true, jeton: (await r.json()).access_token }
}
export async function soumettreSiteSearchConsole(c, d) {
  if (c.domaine_mode === 'aucun' || c.search_console_le) return { ok: true, etape: 'sans_objet' }
  let etape = 'jeton'
  try {
    const t = await jetonCompteService(d.env, d)
    if (!t.ok) return { ok: false, etape, raison: t.raison }
    const headers = { Authorization: `Bearer ${t.jeton}`, 'Content-Type': 'application/json' }
    const site = `https://${c.domaine}/`
    etape = 'token'
    const r = await d.fetch(d.verificationBase + '/token', { method: 'POST', headers, body: JSON.stringify({ site: { type: 'SITE', identifier: site }, verificationMethod: 'FILE' }) })
    if (!r.ok) throw Error('refuse')
    const nom = (await r.json()).token
    etape = 'fichier'
    await d.stockage.ecrire('sites', `${c.id}/${nom}`, `google-site-verification: ${nom}`)
    etape = 'verification'
    const v = await d.fetch(d.verificationBase + '/webResource?verificationMethod=FILE', { method: 'POST', headers, body: JSON.stringify({ site: { type: 'SITE', identifier: site } }) })
    if (!v.ok) throw Error('refuse')
    etape = 'site'
    const endpoint = `${d.searchBase}/sites/${encodeURIComponent(site)}`
    if (!(await d.fetch(endpoint, { method: 'PUT', headers })).ok) throw Error('refuse')
    etape = 'sitemap'
    if (!(await d.fetch(`${endpoint}/sitemaps/${encodeURIComponent(site + 'sitemap.xml')}`, { method: 'PUT', headers })).ok) throw Error('refuse')
    await d.mettreAJour(c.id, { search_console_le: d.maintenant().toISOString() })
    return { ok: true, etape }
  } catch { return { ok: false, etape, raison: 'refus_externe' } }
}
