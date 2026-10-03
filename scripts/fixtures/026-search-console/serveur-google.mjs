// Faux Google strictement loopback. Clé RSA et jeton factices restent en mémoire.
import http from 'node:http'
import { generateKeyPairSync, randomBytes, verify } from 'node:crypto'

export async function creerGoogleFactice() {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
  const cle = privateKey.export({ type: 'pkcs8', format: 'pem' })
  const clientEmail = 'compte-factice@projet.invalid'
  const acces = `factice-${randomBytes(16).toString('hex')}`
  const fichier = `google${randomBytes(8).toString('hex')}.html`
  const appels = [], erreurs = new Map()
  const maintenant = new Date('2026-10-03T12:00:00.000Z')
  let origine
  const serveur = http.createServer(async (req, res) => {
    const morceaux = []
    for await (const m of req) morceaux.push(m)
    const brut = Buffer.concat(morceaux).toString('utf8')
    const url = new URL(req.url, origine)
    const etape = url.pathname === '/token' ? 'oauth' : url.pathname.endsWith('/token') ? 'token' : url.pathname.includes('webResource') ? 'verification' : url.pathname.includes('/sitemaps/') ? 'sitemap' : 'site'
    const authValide = req.headers.authorization === `Bearer ${acces}`
    appels.push({ etape, methode: req.method, chemin: url.pathname, corps: etape === 'oauth' ? '[assertion masquée]' : brut, authValide })
    const rendre = (code, objet) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(objet)) }
    if (erreurs.has(etape)) return rendre(erreurs.get(etape), { error: 'panne synthétique' })
    if (etape === 'oauth') {
      try {
        if (req.method !== 'POST') throw Error('méthode')
        const form = new URLSearchParams(brut)
        if (form.get('grant_type') !== 'urn:ietf:params:oauth:grant-type:jwt-bearer') throw Error('grant')
        const assertion = form.get('assertion') || '', [h, p, signature] = assertion.split('.')
        const header = JSON.parse(Buffer.from(h, 'base64url')), claims = JSON.parse(Buffer.from(p, 'base64url'))
        if (header.alg !== 'RS256' || !verify('RSA-SHA256', Buffer.from(`${h}.${p}`), publicKey, Buffer.from(signature, 'base64url'))) throw Error('signature')
        const iat = Math.floor(maintenant.getTime() / 1000)
        if (claims.iss !== clientEmail || claims.aud !== `${origine}/token` || claims.iat !== iat || claims.exp !== iat + 3600 || claims.scope !== 'https://www.googleapis.com/auth/siteverification https://www.googleapis.com/auth/webmasters') throw Error('claims')
        return rendre(200, { access_token: acces, token_type: 'Bearer', expires_in: 3600 })
      } catch { return rendre(400, { error: 'assertion invalide' }) }
    }
    if (!authValide) return rendre(401, { error: 'jeton invalide' })
    if (etape === 'token' || etape === 'verification') {
      try {
        const c = JSON.parse(brut)
        if (req.method !== 'POST' || c.site?.type !== 'SITE' || c.site?.identifier !== 'https://artisan.invalid/' || (etape === 'token' ? c.verificationMethod !== 'FILE' : url.searchParams.get('verificationMethod') !== 'FILE')) throw Error('requête')
        return rendre(200, etape === 'token' ? { token: fichier } : { id: 'verification-factice' })
      } catch { return rendre(400, { error: 'requête invalide' }) }
    }
    const prefixe = `/webmasters/v3/sites/${encodeURIComponent('https://artisan.invalid/')}`
    const attendu = etape === 'site' ? prefixe : `${prefixe}/sitemaps/${encodeURIComponent('https://artisan.invalid/sitemap.xml')}`
    if (req.method !== 'PUT' || url.pathname !== attendu) return rendre(400, { error: 'plan/site invalide' })
    return rendre(200, {})
  })
  await new Promise(r => serveur.listen(0, '127.0.0.1', r))
  origine = `http://127.0.0.1:${serveur.address().port}`
  return {
    origine, maintenant, appels, erreurs, fichier,
    env: { GSC_COMPTE_SERVICE: Buffer.from(JSON.stringify({ client_email: clientEmail, private_key: cle })).toString('base64') },
    // Exclusivement pour assertion de non-fuite par la sonde, jamais sérialisés.
    canaris: { cle, acces },
    fermer: () => new Promise(r => serveur.close(r)),
  }
}
