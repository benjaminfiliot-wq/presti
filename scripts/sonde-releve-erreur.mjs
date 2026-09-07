// Vérifie que l'erreur de relève dit vraiment quoi corriger — sans toucher à la vraie boîte.
//
// Le 07/09, la production répondait « Command failed » : six secondes d'attente pour un message qui
// ne distingue ni un mot de passe refusé, ni un serveur introuvable, ni une boîte absente. On rejoue
// ici les trois cas avec des identifiants FAUX, et on lit ce que la relève répond.
//
// Aucune de ces connexions ne peut aboutir : c'est le but. Rien n'est écrit en base.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/sonde-releve-erreur.mjs

import fs from 'node:fs'

const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
for (const [k, v] of Object.entries(env)) if (!process.env[k]) process.env[k] = v

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? `\n     → ${d}` : ''}`) } }

const { relever } = await import('../lib/direction/courriers.ts')

const cas = [
  {
    nom: 'serveur introuvable',
    env: { IMAP_HOST: 'imap.ce-serveur-nexiste-pas.invalid', IMAP_PORT: '993', IMAP_USER: 'contact@exemple.fr', IMAP_PASS: 'peu-importe' },
    attendu: /introuvable|ne répond pas|Connexion impossible/i,
  },
  {
    nom: 'identifiants refusés sur un vrai serveur',
    env: { IMAP_HOST: 'ssl0.ovh.net', IMAP_PORT: '993', IMAP_USER: 'compte-qui-nexiste-pas@prestiapp.fr', IMAP_PASS: 'mauvais-mot-de-passe' },
    attendu: /refusés|mot de passe|Connexion impossible/i,
  },
  {
    nom: 'boîte non configurée',
    env: { IMAP_HOST: '', IMAP_PORT: '', IMAP_USER: '', IMAP_PASS: '' },
    attendu: /n’est pas configurée|IMAP_USER/i,
  },
]

console.log('\n══ Ce que la relève répond quand elle échoue ══\n')
for (const c of cas) {
  const avant = {}
  for (const [k, v] of Object.entries(c.env)) { avant[k] = process.env[k]; if (v) process.env[k] = v; else delete process.env[k] }
  // `PRESTI_MAIL_IMAP_*` sert de repli dans `canalEntreprise()` : on l'écarte aussi, sinon le cas
  // « non configurée » ne peut pas se produire.
  const repli = [process.env.PRESTI_MAIL_IMAP_USER, process.env.PRESTI_MAIL_IMAP_PASS]
  delete process.env.PRESTI_MAIL_IMAP_USER; delete process.env.PRESTI_MAIL_IMAP_PASS

  const r = await relever(1)
  const msg = r.ok ? '(la relève a RÉUSSI — inattendu ici)' : r.erreur
  console.log(`  ── ${c.nom}\n     « ${msg} »`)
  T(`${c.nom} : message actionnable`, !r.ok && c.attendu.test(r.erreur), `attendu ${c.attendu}, reçu « ${msg} »`)
  if (c.nom !== 'boîte non configurée') T(`${c.nom} : l’erreur dit OÙ elle a essayé`, !r.ok && /ssl0\.ovh\.net|nexiste-pas\.invalid/.test(r.erreur), r.erreur)
  T(`${c.nom} : aucun mot de passe dans le message`, !r.ok && !/mauvais-mot-de-passe|peu-importe/.test(r.erreur), r.erreur)

  for (const [k, v] of Object.entries(avant)) { if (v === undefined) delete process.env[k]; else process.env[k] = v }
  if (repli[0]) process.env.PRESTI_MAIL_IMAP_USER = repli[0]
  if (repli[1]) process.env.PRESTI_MAIL_IMAP_PASS = repli[1]
}

console.log(`\n${ko ? '❌' : '✅'} ${ok} réussis, ${ko} échoués\n`)
process.exit(ko ? 1 : 0)
