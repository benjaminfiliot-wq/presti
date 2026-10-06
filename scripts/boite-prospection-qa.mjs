#!/usr/bin/env node
// scripts/boite-prospection-qa.mjs — juge de la boîte d'envoi de la prospection (06/10/2026).
//
// POURQUOI : les variables PROSPECTION_GMAIL_* n'ont jamais été posées sur Vercel ; chaque passage du facteur rendait
// `en_attente_gmail`. Décision de Benj : la boîte Gmail de l'entreprise (IMAP_USER / IMAP_PASS) sert aussi à la prospection.
// Ce juge prouve l'ordre (boîte dédiée d'abord), le repli (Gmail seulement), et que les quatre routes passent par le module.
//
// Usage : node --import ./scripts/ts-loader.mjs scripts/boite-prospection-qa.mjs   (code 0 : PASS)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.join(ICI, '..')
const { boiteProspection, adresseReponseProspection } = await import('../lib/agents/acquisition/boiteProspection.ts')
const rouges = []
const ok = (nom, cond, detail = '') => { console.log(`${cond ? 'PASS' : 'FAIL'} ${nom}${cond || !detail ? '' : ' — ' + detail}`); if (!cond) rouges.push(nom) }

const gmailEntreprise = () => ({ hote: 'imap.gmail.com', port: 993, user: 'atelier.presti@gmail.com', pass: 'motdepasseapp', devine: true, passNettoye: false })
const autreEntreprise = () => ({ hote: 'imap.ionos.fr', port: 993, user: 'contact@exemple.fr', pass: 'x', devine: true, passNettoye: false })
const aucune = () => null

const b1 = boiteProspection({ PROSPECTION_GMAIL_USER: 'dedie@gmail.com', PROSPECTION_GMAIL_PASS: 'p1', ACQ_ADRESSE_REPONSE: 'rep@exemple.fr' }, gmailEntreprise)
ok('BP-1 les variables propres à la prospection passent en premier', b1?.user === 'dedie@gmail.com' && b1.pass === 'p1' && b1.adresse === 'rep@exemple.fr' && b1.source === 'prospection', JSON.stringify(b1 && { ...b1, pass: '…' }))
const b2 = boiteProspection({}, gmailEntreprise)
ok("BP-2 sans elles : la boîte Gmail de l'entreprise, l'adresse de réponse = la boîte elle-même", b2?.user === 'atelier.presti@gmail.com' && b2.pass === 'motdepasseapp' && b2.adresse === 'atelier.presti@gmail.com' && b2.source === 'entreprise', JSON.stringify(b2 && { ...b2, pass: '…' }))
ok("BP-3 une boîte d'entreprise qui n'est pas Gmail n'est jamais prise (le porteur envoie par le SMTP de Gmail)", boiteProspection({}, autreEntreprise) === null)
ok('BP-4 aucune boîte : null (le facteur reste « en_attente_gmail », rien ne part)', boiteProspection({}, aucune) === null)
ok('BP-5 un utilisateur dédié sans mot de passe ne masque pas le repli', boiteProspection({ PROSPECTION_GMAIL_USER: 'dedie@gmail.com' }, gmailEntreprise)?.source === 'entreprise')
ok("BP-6 adresse de réponse : celle posée d'abord, sinon celle de la boîte, sinon ''", adresseReponseProspection({ ACQ_ADRESSE_REPONSE: 'rep@exemple.fr' }, gmailEntreprise) === 'rep@exemple.fr' && adresseReponseProspection({}, gmailEntreprise) === 'atelier.presti@gmail.com' && adresseReponseProspection({}, aucune) === '')

const lire = (f) => fs.readFileSync(path.join(RACINE, f), 'utf8')
const facteur = lire('app/api/cron/facteur/route.ts'), standardiste = lire('app/api/cron/standardiste/route.ts'), repondeur = lire('app/api/cron/repondeur/route.ts'), redacteur = lire('app/api/cron/redacteur/route.ts')
ok('BP-7 le facteur envoie par boiteProspection() et ne lit plus les variables à la main', /boiteProspection\(\)/.test(facteur) && !/process\.env\.PROSPECTION_GMAIL/.test(facteur))
ok('BP-8 le standardiste relève par boiteProspection()', /boiteProspection\(\)/.test(standardiste) && !/process\.env\.PROSPECTION_GMAIL/.test(standardiste))
ok("BP-9 le répondeur et le rédacteur prennent l'adresse de réponse du module", /adresseReponseProspection\(\)/.test(repondeur) && /adresseReponseProspection\(\)/.test(redacteur) && !/process\.env\.ACQ_ADRESSE_REPONSE/.test(repondeur + redacteur))
const module = lire('lib/agents/acquisition/boiteProspection.ts')
ok('BP-10 le module ne journalise ni ne recopie le mot de passe', !/console\.|writeFile|fetch\(/.test(module))

console.log(rouges.length ? `boite-prospection-qa : ÉCHEC (${rouges.join(', ')})` : 'boite-prospection-qa : PASS (10 critères)')
process.exitCode = rouges.length ? 1 : 0
