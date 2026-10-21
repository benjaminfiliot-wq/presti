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
// 21/10/2026 (audit offensif, E1) : une notification exige aussi une signature DKIM VÉRIFIÉE par nous (lib/canaux/dkim.ts, éprouvé par
// scripts/canaux-reseaux-qa.mjs avec de vraies signatures). Les fixtures ne sont pas signées : on part ici d'un e-mail dont la relève a
// vérifié la signature de leboncoin.fr ; `lireBrut` montre qu'un e-mail SANS cette vérification n'est jamais reconnu.
const lireBrut = (n) => lireMail(readFileSync(new URL(`./fixtures/leboncoin/${n}`, import.meta.url)))
const lire = (n) => ({ ...lireBrut(n), dkim_valides: ['leboncoin.fr'] })
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
// 21/10/2026 (audit offensif, E1) : une notification n'est reconnue qu'avec dkim=pass ALIGNÉ dans l'en-tête posé par le serveur de la boîte.
const AUTH_OK = 'mx.exemple-artisan.fr; spf=pass smtp.mailfrom=leboncoin.fr; dkim=pass header.d=leboncoin.fr'
const seulementPhishing = lireNotificationLeboncoin({ authentification: AUTH_OK, dkim_valides: ['leboncoin.fr'], de: { nom: 'lbc', email: 'messagerie@leboncoin.fr' }, sujet: 'Nouveau message de Paul', texte: 'Paul vous a envoyé un message.', html: '<a href="https://evil.exemple.invalid/messages/1">Répondre</a><a href="http://www.leboncoin.fr/messages/123456">http</a>' })
T('seuls des liens hors domaine ou en http → messagerie générale', seulementPhishing?.lien === LIEN_MESSAGERIE_LEBONCOIN, voir(seulementPhishing?.lien))
T('lienLeboncoinSur : identifiants dans l’adresse refusés', lienLeboncoinSur('https://user:pass@www.leboncoin.fr/messages') === null)
T('lienLeboncoinSur : &amp; décodé', lienLeboncoinSur('https://www.leboncoin.fr/messages?a=1&amp;b=2') === 'https://www.leboncoin.fr/messages?a=1&b=2')
T('authentification : spf=fail sans dkim=pass → forgé ; absent → on ne conclut rien', authentificationEchouee('spf=fail; dkim=none') && !authentificationEchouee('spf=fail; dkim=pass') && !authentificationEchouee(null))
T('sans lien dans l’e-mail : clé par annonce + prénom, stable', lireNotificationLeboncoin({ authentification: AUTH_OK, dkim_valides: ['leboncoin.fr'], de: { nom: 'lbc', email: 'no-reply@leboncoin.fr' }, sujet: 'Nouveau message concernant « Pose de parquet »', texte: 'Léa vous a envoyé un message.', html: '' })?.cle_conversation === 'lbc:a:pose-de-parquet|lea')

console.log('\n── 5. Authentification exigée (audit offensif du 21/10, E1)')
const sansEntete = { dkim_valides: ['leboncoin.fr'], de: { nom: 'lbc', email: 'no-reply@leboncoin.fr' }, sujet: 'Nouveau message concernant « Pose de parquet »', texte: 'Léa vous a envoyé un message.', html: '' }
T('sans Authentication-Results → ignoré (non vérifié : pas de pastille ni de réponse préparée)', lireNotificationLeboncoin(sansEntete) === null)
T('dmarc=pass seul, sans signature DKIM alignée → ignoré', lireNotificationLeboncoin({ ...sansEntete, authentification: 'mx; dmarc=pass header.from=leboncoin.fr' }) === null)
T('dkim=pass d’un AUTRE domaine → ignoré', lireNotificationLeboncoin({ ...sansEntete, authentification: 'mx; dkim=pass header.d=attaquant.example' }) === null)
const m92 = lire('92-forge-deux-entetes.eml')
T('deux en-têtes : on lit le PREMIER (celui du serveur de la boîte), pas celui que l’expéditeur a écrit plus bas', /dkim=none/.test(m92.authentification ?? '') && !/attaquant\.example; spf=pass/.test(m92.authentification ?? ''))
T('e-mail forgé avec un faux « dkim=pass header.d=leboncoin.fr » sous l’en-tête du serveur → ignoré', lireNotificationLeboncoin(m92) === null)
T('en-tête « dkim=pass » parfait mais signature NON vérifiée par nous (ou d’un autre domaine) → ignoré',
  lireNotificationLeboncoin(lireBrut('01-texte-recopie.eml')) === null && lireNotificationLeboncoin({ ...lireBrut('01-texte-recopie.eml'), dkim_valides: ['attaquant.example'] }) === null && !!lireNotificationLeboncoin(lire('01-texte-recopie.eml')))

console.log(`\n${ko === 0 ? '✅' : '❌'} ${ok} réussis, ${ko} en échec`)
process.exitCode = ko === 0 ? 0 : 1
