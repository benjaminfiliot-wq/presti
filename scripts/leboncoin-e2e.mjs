// Test permanent, HORS LIGNE — les notifications Le Bon Coin lues dans la relève de la boîte branchée (lib/canaux/leboncoin.ts).
// Les e-mails de scripts/fixtures/leboncoin/ sont INVENTÉS (aucun e-mail réel n'était disponible) : réalistes dans leur forme
// (multipart, quoted-printable, HTML seul, en-têtes encodés), mais le gabarit réel de Le Bon Coin reste à confronter au premier
// vrai e-mail reçu, caviardé. Le test vérifie aussi ce qui ne doit PAS passer : une alerte, un e-mail forgé, un lien d'un autre domaine.
// Usage : node scripts/leboncoin-e2e.mjs
import { readFileSync } from 'node:fs'
import { lireMail } from '../lib/mailLite.ts'
import { lireNotificationLeboncoin, lienLeboncoinSur, authentificationEchouee, contenuEntrantLeboncoin, LIEN_MESSAGERIE_LEBONCOIN } from '../lib/canaux/leboncoin.ts'

let ok = 0, ko = 0
const T = (nom, cond, detail = '') => { if (cond) { ok++; console.log(`  ✅ ${nom}`) } else { ko++; console.log(`  ❌ ${nom}${detail ? ` — ${detail}` : ''}`) } }
const lire = (n) => lireMail(readFileSync(new URL(`./fixtures/leboncoin/${n}`, import.meta.url)))
const voir = (x) => JSON.stringify(x)

console.log('\n── 1. Texte recopié, multipart quoted-printable (01)')
const m1 = lire('01-texte-recopie.eml')
const n1 = lireNotificationLeboncoin(m1)
T('reconnue', !!n1)
T('annonce tirée de l’objet encodé', n1?.annonce === 'Pose de carrelage salle de bain', voir(n1?.annonce))
T('prénom', n1?.prenom === 'Camille', voir(n1?.prenom))
T('texte du message complet (coupures QP recollées)', n1?.texte?.startsWith('Bonjour, je refais ma salle de bain') && n1.texte.endsWith('Vous seriez disponible en novembre ?'), voir(n1?.texte))
T('le texte s’arrête avant le bouton « Répondre »', !/R[ée]pondre au message/.test(n1?.texte ?? ''))
T('lien de réponse : leboncoin.fr/messages/…', n1?.lien.startsWith('https://www.leboncoin.fr/messages/id/7f3c2a91'), voir(n1?.lien))
T('le lien d’un autre domaine présent dans l’e-mail n’est pas retenu', !n1?.lien.includes('exemple.invalid'))
T('clé de conversation tirée du lien', n1?.cle_conversation === 'lbc:c:7f3c2a91-0b4e-4c1a-9d2f-fixture00001', voir(n1?.cle_conversation))
T('mailLite expose l’HTML et Authentication-Results', m1.html.includes('<a href="https://www.leboncoin.fr/messages') && /dkim=pass/.test(m1.authentification ?? ''))

console.log('\n── 2. HTML seul, texte NON recopié, lien de suivi (02)')
const n2 = lireNotificationLeboncoin(lire('02-sans-texte-html.eml'))
T('reconnue (objet « Vous avez reçu un nouveau message » encodé en base64)', !!n2)
T('prénom composé', n2?.prenom === 'Jean-Marc', voir(n2?.prenom))
T('annonce entre &laquo; &raquo; (entités décodées)', n2?.annonce === 'Dépannage chauffe-eau', voir(n2?.annonce))
T('texte absent → null (pas de texte inventé)', n2?.texte === null, voir(n2?.texte))
T('lien : le bouton « Voir le message », sur un sous-domaine leboncoin.fr', n2?.lien.startsWith('https://click.leboncoin.fr/track/abc'), voir(n2?.lien))
T('contenu rangé : renvoie vers Le Bon Coin, cite l’annonce', /ouvrez-le sur Le Bon Coin/.test(contenuEntrantLeboncoin(n2)) && contenuEntrantLeboncoin(n2).includes('Dépannage chauffe-eau'))

console.log('\n── 3. Texte entre guillemets, texte brut 8 bits (03)')
const n3 = lireNotificationLeboncoin(lire('03-texte-guillemets.eml'))
T('reconnue (« a répondu à votre annonce »)', !!n3)
T('prénom accentué', n3?.prenom === 'Théo', voir(n3?.prenom))
T('annonce entre guillemets droits', n3?.annonce === 'Fabrication escalier bois sur mesure', voir(n3?.annonce))
T('texte entre « »', n3?.texte === "Bonsoir, l'escalier serait pour une maison à Niort, hauteur sous plafond 2,50 m. Vous pouvez passer voir ?", voir(n3?.texte))
T('lien messagerie/conversation et clé stable', n3?.lien === 'https://www.leboncoin.fr/messagerie/conversation/fixture-conv-3333' && n3?.cle_conversation === 'lbc:c:fixture-conv-3333', voir(n3))

console.log('\n── 4. Ce qui ne doit pas passer')
T('alerte « Votre annonce est en ligne » → ignorée', lireNotificationLeboncoin(lire('90-alerte-pas-un-message.eml')) === null)
T('e-mail forgé (dmarc=fail) → ignoré', lireNotificationLeboncoin(lire('91-forge-dmarc-fail.eml')) === null)
T('« nouveau message » venant d’un autre domaine → ignoré', lireNotificationLeboncoin({ de: { nom: 'x', email: 'messagerie@leboncoin.fr.exemple.invalid' }, sujet: 'Nouveau message de Paul', texte: 'Paul vous a envoyé un message', html: '' }) === null)
T('domaine ressemblant (faux-leboncoin.fr) → ignoré', lireNotificationLeboncoin({ de: { nom: 'x', email: 'a@faux-leboncoin.fr' }, sujet: 'Nouveau message', texte: 'Paul vous a envoyé un message', html: '' }) === null)
T('e-mail sans expéditeur → ignoré, sans exception', lireNotificationLeboncoin({ de: { nom: null, email: null }, sujet: '', texte: '', html: null }) === null)
const seulementPhishing = lireNotificationLeboncoin({ de: { nom: 'lbc', email: 'messagerie@leboncoin.fr' }, sujet: 'Nouveau message de Paul', texte: 'Paul vous a envoyé un message.', html: '<a href="https://evil.exemple.invalid/messages/1">Répondre</a><a href="http://www.leboncoin.fr/messages/123456">http</a>' })
T('seuls des liens hors domaine ou en http → messagerie générale', seulementPhishing?.lien === LIEN_MESSAGERIE_LEBONCOIN, voir(seulementPhishing?.lien))
T('lienLeboncoinSur : identifiants dans l’adresse refusés', lienLeboncoinSur('https://user:pass@www.leboncoin.fr/messages') === null)
T('lienLeboncoinSur : &amp; décodé', lienLeboncoinSur('https://www.leboncoin.fr/messages?a=1&amp;b=2') === 'https://www.leboncoin.fr/messages?a=1&b=2')
T('authentification : spf=fail sans dkim=pass → forgé ; absent → on ne conclut rien', authentificationEchouee('spf=fail; dkim=none') && !authentificationEchouee('spf=fail; dkim=pass') && !authentificationEchouee(null))
T('sans lien dans l’e-mail : clé par annonce + prénom, stable', lireNotificationLeboncoin({ de: { nom: 'lbc', email: 'no-reply@leboncoin.fr' }, sujet: 'Nouveau message concernant « Pose de parquet »', texte: 'Léa vous a envoyé un message.', html: '' })?.cle_conversation === 'lbc:a:pose-de-parquet|lea')

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} en échec`)
process.exitCode = ko === 0 ? 0 : 1
