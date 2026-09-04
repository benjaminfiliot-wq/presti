// Pilote l'API OVH avec un JETON limité — jamais avec le mot de passe du compte.
//
// Pourquoi un jeton : il ne donne accès qu'aux chemins qu'on lui autorise (ici la zone DNS et les
// comptes email du domaine), il ne permet ni de voir la facturation, ni de changer le mot de passe,
// ni de transférer le domaine, et il se révoque d'un clic. Un mot de passe, lui, donne tout.
//
//   node scripts/ovh.mjs etat                      → ce que le jeton peut voir
//   node scripts/ovh.mjs dmarc                     → pose l'enregistrement DMARC et rafraîchit la zone
//   node scripts/ovh.mjs boites                    → liste les comptes email du domaine
//   node scripts/ovh.mjs creer-boite contact <mdp> → crée contact@prestiapp.fr
//
// Identifiants attendus dans .env.local : OVH_APP_KEY, OVH_APP_SECRET, OVH_CONSUMER_KEY.
import fs from 'node:fs'
import crypto from 'node:crypto'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const AK = process.env.OVH_APP_KEY
const AS = process.env.OVH_APP_SECRET
const CK = process.env.OVH_CONSUMER_KEY
const BASE = process.env.OVH_ENDPOINT || 'https://eu.api.ovh.com/1.0'
const DOMAINE = 'prestiapp.fr'

if (!AK || !AS || !CK) {
  console.log('❌ Jeton OVH absent. Ajoute dans .env.local :\n   OVH_APP_KEY=…\n   OVH_APP_SECRET=…\n   OVH_CONSUMER_KEY=…')
  process.exit(1)
}

// L'heure vient du serveur OVH : une horloge locale décalée fait échouer toutes les signatures,
// avec un message qui ne dit pas pourquoi.
let ecart = 0
try {
  const t = Number(await (await fetch(`${BASE}/auth/time`)).text())
  ecart = t - Math.floor(Date.now() / 1000)
} catch { /* on garde l'heure locale */ }

async function api(methode, chemin, corps = null) {
  const url = `${BASE}${chemin}`
  const body = corps ? JSON.stringify(corps) : ''
  const ts = Math.floor(Date.now() / 1000) + ecart
  const signature = '$1$' + crypto.createHash('sha1').update([AS, CK, methode, url, body, ts].join('+')).digest('hex')
  const r = await fetch(url, {
    method: methode,
    headers: {
      'X-Ovh-Application': AK, 'X-Ovh-Consumer': CK,
      'X-Ovh-Timestamp': String(ts), 'X-Ovh-Signature': signature,
      'Content-Type': 'application/json',
    },
    ...(corps ? { body } : {}),
  })
  const texte = await r.text()
  let json = null
  try { json = JSON.parse(texte) } catch { /* réponse vide */ }
  if (!r.ok) throw new Error(`${r.status} ${json?.message ?? texte.slice(0, 160)}`)
  return json
}

const commande = process.argv[2] || 'etat'

if (commande === 'etat') {
  const moi = await api('GET', '/me')
  console.log(`Compte : ${moi.nichandle} · ${moi.email}`)
  const zones = await api('GET', '/domain/zone')
  console.log(`Zones DNS accessibles : ${zones.join(', ')}`)
  try {
    const d = await api('GET', `/email/domain/${DOMAINE}`)
    console.log(`Offre email : ${d.offer ?? '?'} · état ${d.status ?? '?'}`)
  } catch (e) {
    console.log(`Offre email : illisible — ${String(e.message).slice(0, 120)}`)
  }
} else if (commande === 'dmarc') {
  // On commence en surveillance (p=none) : rien n'est rejeté, on observe. Poser « reject »
  // d'emblée ferait disparaître de vrais messages sans que personne ne le sache.
  const valeur = 'v=DMARC1; p=none; rua=mailto:contact@prestiapp.fr'
  const existants = await api('GET', `/domain/zone/${DOMAINE}/record?fieldType=TXT&subDomain=_dmarc`)
  if (existants.length) {
    await api('PUT', `/domain/zone/${DOMAINE}/record/${existants[0]}`, { target: valeur, ttl: 3600 })
    console.log('♻️  DMARC mis à jour')
  } else {
    await api('POST', `/domain/zone/${DOMAINE}/record`, { fieldType: 'TXT', subDomain: '_dmarc', target: valeur, ttl: 3600 })
    console.log('✅ DMARC créé')
  }
  await api('POST', `/domain/zone/${DOMAINE}/refresh`)
  console.log('Zone rafraîchie. La propagation prend quelques minutes ; relance scripts/mail-verifier.mjs après.')
} else if (commande === 'boites') {
  const comptes = await api('GET', `/email/domain/${DOMAINE}/account`)
  console.log(comptes.length ? `Comptes existants : ${comptes.join(', ')}` : 'Aucun compte email sur ce domaine.')
} else if (commande === 'creer-boite') {
  const nom = process.argv[3]
  const mdp = process.argv[4]
  if (!nom || !mdp) { console.log('Usage : node scripts/ovh.mjs creer-boite <nom> <mot-de-passe>'); process.exit(1) }
  await api('POST', `/email/domain/${DOMAINE}/account`, { accountName: nom, password: mdp, description: 'Boîte de l’entreprise' })
  console.log(`✅ ${nom}@${DOMAINE} créée. Son activation prend quelques minutes chez OVH.`)
} else {
  console.log('Commandes : etat · dmarc · boites · creer-boite <nom> <mdp>')
}
