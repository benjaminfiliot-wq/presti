import crypto from 'node:crypto'

// Push NATIVES (Android, iOS) par Firebase Cloud Messaging, API HTTP v1 (prompt v9 §3.3, §4.3).
//
// Sans compte de service (variable Vercel `FIREBASE_SERVICE_ACCOUNT` = le JSON du compte de service Firebase
// Admin, M3), ce module est inerte et le dit : les jetons natifs restent en base, rien ne part. Dès que la
// variable existe, tout marche sans redéploiement de la coque.
//
// La charge est la même que pour le web (lib/push.ts) : titre, ligne neutre, adresse Presti, tag — jamais le
// contenu d'un message. FCM la porte en `notification` (affichage) et en `data` (l'adresse, pour le tap).
//
// Jeton d'accès Google : un JWT RS256 signé avec la clé privée du compte de service, échangé contre un
// jeton OAuth2 (50 min de cache). Aucune bibliothèque : `crypto` de Node suffit.

export type ChargeNative = { titre: string; ligne: string; url: string; tag: string }
export type ResultatNatif = { ok: true } | { ok: false; statut: number; code?: string; disparu: boolean }

type CompteService = { project_id: string; client_email: string; private_key: string; token_uri?: string }

let compte: CompteService | null | undefined
let jetonOAuth: { valeur: string; expire: number } | null = null

function lireCompte(): CompteService | null {
  if (compte !== undefined) return compte
  const brut = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!brut) { compte = null; return null }
  try {
    const j = JSON.parse(brut) as Partial<CompteService>
    compte = j.project_id && j.client_email && j.private_key ? { project_id: j.project_id, client_email: j.client_email, private_key: j.private_key.replace(/\\n/g, '\n'), token_uri: j.token_uri } : null
    if (!compte) console.error('[push natif] FIREBASE_SERVICE_ACCOUNT incomplet (project_id, client_email, private_key attendus)')
  } catch (e) {
    // Pas le message de l'analyseur : il cite un extrait de la valeur, donc du secret (revue du 07/09).
    console.error('[push natif] FIREBASE_SERVICE_ACCOUNT illisible : ce n’est pas un JSON valide', e instanceof SyntaxError ? '(syntaxe)' : '')
    compte = null
  }
  return compte
}

/** Les push natives sont-elles possibles ici ? */
export const firebasePret = (): boolean => !!lireCompte()

const b64u = (b: Buffer | string) => Buffer.from(b).toString('base64url')

async function jetonAcces(c: CompteService): Promise<string> {
  const maintenant = Math.floor(Date.now() / 1000)
  if (jetonOAuth && jetonOAuth.expire > maintenant + 60) return jetonOAuth.valeur
  const uri = c.token_uri || 'https://oauth2.googleapis.com/token'
  const entete = b64u(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const corps = b64u(JSON.stringify({ iss: c.client_email, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: uri, iat: maintenant, exp: maintenant + 3600 }))
  const signature = crypto.sign('RSA-SHA256', Buffer.from(`${entete}.${corps}`), c.private_key)
  const assertion = `${entete}.${corps}.${b64u(signature)}`
  const r = await fetch(uri, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }), signal: AbortSignal.timeout(5000) })
  const j = (await r.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string }
  if (!r.ok || !j.access_token) throw new Error(`jeton Google refusé (${r.status}) ${j.error ?? ''}`)
  jetonOAuth = { valeur: j.access_token, expire: maintenant + (j.expires_in ?? 3600) }
  return j.access_token
}

/** Envoie UNE notification à UN appareil natif. Ne jette pas : renvoie ce qui s'est passé. */
export async function envoyerPushNatif(jeton: string, plateforme: 'android' | 'ios', c: ChargeNative): Promise<ResultatNatif> {
  const cs = lireCompte()
  if (!cs) return { ok: false, statut: 0, code: 'firebase_absent', disparu: false }
  try {
    const acces = await jetonAcces(cs)
    const message = {
      token: jeton,
      notification: { title: c.titre, body: c.ligne },
      data: { url: c.url, tag: c.tag },
      android: { priority: 'high', notification: { tag: c.tag, channel_id: 'presti', color: '#D97757' } },
      apns: { headers: { 'apns-priority': '10' }, payload: { aps: { sound: 'default', 'thread-id': c.tag } } },
    }
    void plateforme
    const r = await fetch(`https://fcm.googleapis.com/v1/projects/${cs.project_id}/messages:send`, {
      method: 'POST', headers: { Authorization: `Bearer ${acces}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ message }),
      signal: AbortSignal.timeout(5000), // un service muet ne retient jamais une route
    })
    if (r.ok) return { ok: true }
    const j = (await r.json().catch(() => ({}))) as { error?: { status?: string; details?: { errorCode?: string }[] } }
    const code = j.error?.details?.find((d) => d.errorCode)?.errorCode ?? j.error?.status
    // Jeton inconnu ou périmé : l'appareil a désinstallé l'app ou révoqué la permission — on l'oublie.
    const disparu = r.status === 404 || code === 'UNREGISTERED' || code === 'NOT_FOUND' || (r.status === 400 && code === 'INVALID_ARGUMENT')
    return { ok: false, statut: r.status, code, disparu }
  } catch (e) {
    return { ok: false, statut: 0, code: (e as Error).message.slice(0, 80), disparu: false }
  }
}
