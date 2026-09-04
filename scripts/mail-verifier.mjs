// Vérifie la chaîne d'envoi et de réception des emails de Presti, de bout en bout.
//
// Pourquoi ce script : un email qui part en indésirable ne prévient personne. Le devis n'arrive
// pas, l'artisan croit que le client ne répond pas, et rien dans les journaux ne le dit. Les
// quatre enregistrements ci-dessous sont ce qui décide qu'un message est accepté ou jeté.
//
//   node scripts/mail-verifier.mjs
//
// Lecture seule. Aucun email n'est envoyé, aucun mot de passe n'est affiché.
import fs from 'node:fs'
import net from 'node:net'
import tls from 'node:tls'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const DOMAINE = 'prestiapp.fr'
const aFaire = []

async function dns(nom, type) {
  const r = await fetch(`https://dns.google/resolve?name=${nom}&type=${type}`)
  const d = await r.json()
  return (d.Answer ?? []).map((a) => String(a.data ?? ''))
}

console.log(`\nChaîne mail de ${DOMAINE}\n`)

// ── 1. Réception : où arrive le courrier envoyé à contact@
const mx = await dns(DOMAINE, 'MX')
if (mx.length) console.log(`Réception  ✅ ${mx.length} serveur(s) : ${mx.map((x) => x.split(' ').pop()).join(', ')}`)
else { console.log('Réception  ❌ aucun serveur de courrier'); aFaire.push('Aucun enregistrement MX : personne ne peut t’écrire. Active l’offre email du domaine chez OVH.') }

// ── 2. Envoi : qui a le droit d'écrire en ton nom
const txt = await dns(DOMAINE, 'TXT')
const spf = txt.find((t) => t.includes('v=spf1'))
console.log(spf ? `SPF        ✅ ${spf.replace(/"/g, '').slice(0, 80)}` : 'SPF        ❌ absent')
if (!spf) aFaire.push('Aucun SPF : n’importe qui peut écrire en se faisant passer pour toi.')

// Presti envoie par Resend, qui signe avec sa propre clé sur le domaine : c'est cette signature
// qui fait passer les messages, pas le SPF du domaine racine.
const dkim = await dns(`resend._domainkey.${DOMAINE}`, 'TXT')
console.log(dkim.length ? 'DKIM       ✅ signature Resend publiée' : 'DKIM       ❌ absente')
if (!dkim.length) aFaire.push('La signature DKIM de Resend n’est pas publiée : les devis et réponses partiront sans signature.')

// ── 3. DMARC : ce qu'un serveur doit faire d'un message qui échoue les deux contrôles
const dmarc = (await dns(`_dmarc.${DOMAINE}`, 'TXT')).find((t) => t.includes('v=DMARC1'))
if (dmarc) {
  const politique = (dmarc.match(/p=(\w+)/) || [])[1] ?? '?'
  console.log(`DMARC      ✅ politique « ${politique} »${/rua=/.test(dmarc) ? ' · rapports activés' : ' · sans rapports'}`)
  if (politique === 'none') console.log('           (surveillance seule : rien n’est encore rejeté — c’est la bonne première étape)')
  if (!/rua=/.test(dmarc)) aFaire.push('DMARC sans adresse de rapports : tu ne sauras jamais qui usurpe ton domaine. Ajoute rua=mailto:contact@prestiapp.fr.')
} else {
  console.log('DMARC      ❌ absent')
  aFaire.push('Aucun DMARC : rien ne dit aux serveurs quoi faire d’un message qui se fait passer pour toi. C’est le maillon manquant.')
}

// ── 4. La boîte de l'entreprise, si ses identifiants sont là
const user = process.env.PRESTI_MAIL_IMAP_USER
const pass = process.env.PRESTI_MAIL_IMAP_PASS
if (!user || !pass) {
  console.log('Boîte      ⏭  identifiants absents (PRESTI_MAIL_IMAP_USER / PRESTI_MAIL_IMAP_PASS)')
  aFaire.push('La boîte contact@ n’est pas branchée : crée-la chez OVH, puis pose ses identifiants. Sans elle, les alertes de panne partent dans le vide.')
} else {
  const hote = process.env.PRESTI_MAIL_IMAP_HOST || 'ssl0.ovh.net'
  const ok = await new Promise((res) => {
    const s = tls.connect({ host: hote, port: 993, servername: hote }, () => {
      let vu = ''
      s.on('data', (d) => {
        vu += d.toString()
        if (vu.includes('* OK')) { s.write('a1 LOGIN "' + user.replace(/"/g, '') + '" "' + pass.replace(/"/g, '') + '"\r\n'); vu = '' }
        if (/a1 OK/i.test(vu)) { s.write('a2 LOGOUT\r\n'); s.end(); res(true) }
        else if (/a1 (NO|BAD)/i.test(vu)) { s.end(); res(false) }
      })
    })
    s.on('error', () => res(false))
    s.setTimeout(12_000, () => { s.destroy(); res(false) })
  })
  console.log(ok ? `Boîte      ✅ connexion réussie sur ${hote}` : `Boîte      ❌ connexion refusée sur ${hote}`)
  if (!ok) aFaire.push('Les identifiants de la boîte ne passent pas : vérifie l’adresse complète comme nom d’utilisateur et le mot de passe.')
}

// ── 5. Là où les alertes de panne arrivent
const alerte = process.env.EMAIL_ENTREPRISE
console.log(alerte ? `Alertes    ✅ vers ${alerte}` : 'Alertes    ⚠️  vers contact@prestiapp.fr (valeur par défaut)')

console.log(aFaire.length ? `\n${aFaire.length} chose(s) à régler :` : '\n✅ La chaîne mail est complète.')
aFaire.forEach((x, i) => console.log(`  ${i + 1}. ${x}`))
