// Test permanent — lecture des emails entrants (v4 §B2).
// Un email réel n'est presque jamais du texte simple : accents encodés dans l'objet,
// corps en quoted-printable, multipart texte + HTML, citation du message précédent.
// Si ce parseur se trompe, l'artisan voit du charabia dans sa boîte de réception.
// Usage : node scripts/maillite-e2e.mjs

import { lireMail, sansCitation } from '../lib/mailLite.ts'

let ok = 0, ko = 0
const T = (nom, cond, detail = '') => { if (cond) { ok++; console.log(`  ✅ ${nom}`) } else { ko++; console.log(`  ❌ ${nom}${detail ? ` — ${detail}` : ''}`) } }

console.log('\n── 1. Email simple, accents en quoted-printable')
const simple = [
  'From: "Marie Dupont" <marie.dupont@exemple.fr>',
  'Subject: =?UTF-8?B?RGV2aXMgcG91ciByw6lub3ZhdGlvbg==?=',
  'Message-ID: <abc123@exemple.fr>',
  'Date: Tue, 02 Sep 2026 10:12:00 +0200',
  'Content-Type: text/plain; charset=UTF-8',
  'Content-Transfer-Encoding: quoted-printable',
  '',
  "Bonjour, je souhaite refaire la salle de bain =C3=A0 Lille. C'est urgent.",
].join('\r\n')
const a = lireMail(simple)
T('nom de l’expéditeur', a.de.nom === 'Marie Dupont', a.de.nom ?? '(null)')
T('email de l’expéditeur', a.de.email === 'marie.dupont@exemple.fr', a.de.email ?? '(null)')
T('objet décodé (accents)', a.sujet === 'Devis pour rénovation', a.sujet)
T('corps décodé (accents)', a.texte.includes('salle de bain à Lille'), a.texte.slice(0, 60))
T('Message-ID', a.messageId === '<abc123@exemple.fr>', a.messageId ?? '(null)')
T('date lue', a.date instanceof Date && !isNaN(a.date), String(a.date))

console.log('\n── 2. Multipart : on prend le texte, pas le HTML')
const mp = [
  'From: jean@exemple.fr',
  'Subject: Fuite',
  'Message-ID: <m2@exemple.fr>',
  'Content-Type: multipart/alternative; boundary="XY"',
  '',
  '--XY',
  'Content-Type: text/plain; charset=UTF-8',
  '',
  'Fuite sous l’évier depuis ce matin.',
  '--XY',
  'Content-Type: text/html; charset=UTF-8',
  '',
  '<html><body><p>Fuite sous l&rsquo;évier depuis ce matin.</p></body></html>',
  '--XY--',
].join('\r\n')
const b = lireMail(mp)
T('partie texte retenue', b.texte.includes('Fuite sous') && !b.texte.includes('<html'), b.texte.slice(0, 60))

console.log('\n── 3. HTML seul : détagué proprement')
const html = [
  'From: paul@exemple.fr', 'Subject: Volets', 'Message-ID: <m3@exemple.fr>',
  'Content-Type: text/html; charset=UTF-8', '',
  '<div><p>Bonjour,</p><p>Je veux changer <b>4 volets</b>.</p></div>',
].join('\r\n')
const c = lireMail(html)
T('balises retirées', !c.texte.includes('<'), c.texte)
T('contenu conservé', c.texte.includes('4 volets'), c.texte)

console.log('\n── 4. Citation du message précédent retirée')
const cite = 'Oui, jeudi me va très bien.\n\nLe 2 septembre 2026, Presti a écrit :\n> Est-ce que jeudi vous convient ?'
T('seule la nouvelle réponse est gardée', sansCitation(cite) === 'Oui, jeudi me va très bien.', JSON.stringify(sansCitation(cite)))
T('chevrons de citation coupés', !sansCitation('Ok.\n> ancien message').includes('ancien message'))

console.log('\n── 5. Cas tordus (on ne doit jamais planter)')
for (const [nom, brut] of [['vide', ''], ['sans en-têtes', 'juste du texte'], ['From nu', 'From: x@y.fr\n\nsalut']]) {
  try { const r = lireMail(brut); T(`${nom} ⇒ pas d’exception`, typeof r.texte === 'string') }
  catch (e) { T(`${nom} ⇒ pas d’exception`, false, e.message) }
}

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} échoués\n`)
process.exit(ko === 0 ? 0 : 1)
