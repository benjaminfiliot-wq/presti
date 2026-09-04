// Branche la boîte de l'ENTREPRISE (contact@prestiapp.fr, OVH) comme canal du compte
// fondateur (sprint J-1 §15) : ce qu'un prospect, un artisan ou un partenaire écrit à
// l'entreprise apparaît dans /messages, à côté des demandes de la plateforme.
//
// Identifiants : PRESTI_MAIL_IMAP_USER / PRESTI_MAIL_IMAP_PASS, lus dans l'environnement
// (ou .env.local). ABSENTS → le script le dit et s'arrête proprement (code 0) : rien à
// faire tant que Benj n'a pas créé la boîte chez OVH et posé les variables.
// PRÉSENTS → test IMAP réel, puis création/mise à jour de la ligne `canaux` du fondateur,
// mot de passe CHIFFRÉ (AES-256-GCM, CANAUX_KEY) — jamais en clair, ni en base, ni ici.
//
// Usage : node scripts/canal-entreprise.mjs

import fs from 'node:fs'
import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const FONDATEUR_EMAIL = 'benjaminfiliot@gmail.com'
const BOITE = { adresse: 'contact@prestiapp.fr', imap_hote: 'ssl0.ovh.net', imap_port: 993, smtp_hote: 'ssl0.ovh.net', smtp_port: 465, libelle: 'Presti — contact@prestiapp.fr' }

const user = (process.env.PRESTI_MAIL_IMAP_USER || '').trim()
const pass = process.env.PRESTI_MAIL_IMAP_PASS || ''
if (!user || !pass) {
  console.log('ℹ️  PRESTI_MAIL_IMAP_USER / PRESTI_MAIL_IMAP_PASS absents — rien à brancher pour l’instant.')
  console.log('   Quand la boîte contact@prestiapp.fr existe chez OVH : poser les deux variables (Vercel + .env.local), puis relancer.')
  process.exit(0)
}

// Chiffrement identique à lib/secretBox.ts (le script ne passe pas par le bundler Next).
const K = Buffer.from(process.env.CANAUX_KEY || '', 'base64')
if (K.length !== 32) { console.error('❌ CANAUX_KEY absente ou invalide (32 octets base64 attendus) — refus de stocker un mot de passe.'); process.exit(1) }
const chiffrer = (clair) => {
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', K, iv)
  const d = Buffer.concat([c.update(clair, 'utf8'), c.final()])
  return ['v1', iv.toString('base64url'), c.getAuthTag().toString('base64url'), d.toString('base64url')].join('.')
}

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

// 1) Le compte fondateur.
const { data: fondateur } = await sb.from('artisans').select('id, nom, email').eq('is_founder', true).ilike('email', FONDATEUR_EMAIL).maybeSingle()
if (!fondateur) { console.error(`❌ Aucun artisan fondateur avec l’email ${FONDATEUR_EMAIL}.`); process.exit(1) }
console.log(`Compte fondateur : ${fondateur.nom || fondateur.email} (${fondateur.id})`)

// 2) Test IMAP réel AVANT d'enregistrer : jamais de canal fantôme.
try {
  const { ImapFlow } = await import('imapflow')
  const client = new ImapFlow({ host: BOITE.imap_hote, port: BOITE.imap_port, secure: true, auth: { user, pass }, logger: false })
  await client.connect()
  await client.logout()
  console.log(`✅ Connexion IMAP ${BOITE.imap_hote}:${BOITE.imap_port} acceptée pour ${user}`)
} catch (e) {
  const m = (e instanceof Error ? e.message : String(e)).toLowerCase()
  console.error('❌ Connexion IMAP refusée :', m.includes('auth') || m.includes('login') ? 'identifiants refusés' : m.slice(0, 120))
  process.exit(1)
}

// 3) Créer / mettre à jour la ligne `canaux` (une seule pour cette adresse).
const ligne = {
  artisan_id: fondateur.id, type: 'email', libelle: BOITE.libelle, adresse: BOITE.adresse,
  imap_hote: BOITE.imap_hote, imap_port: BOITE.imap_port, smtp_hote: BOITE.smtp_hote, smtp_port: BOITE.smtp_port,
  identifiant: user, secret: chiffrer(pass), actif: true, derniere_erreur: null,
}
const { data: existant } = await sb.from('canaux').select('id').eq('artisan_id', fondateur.id).eq('adresse', BOITE.adresse).maybeSingle()
const r = existant
  ? await sb.from('canaux').update(ligne).eq('id', existant.id)
  : await sb.from('canaux').insert(ligne)
if (r.error) { console.error('❌ Écriture du canal :', r.error.message); process.exit(1) }

// Vérification : le mot de passe n'est nulle part en clair.
const { data: relu } = await sb.from('canaux').select('*').eq('artisan_id', fondateur.id).eq('adresse', BOITE.adresse).single()
if (JSON.stringify(relu).includes(pass)) { console.error('❌ Le mot de passe apparaît en clair en base — canal retiré.'); await sb.from('canaux').delete().eq('id', relu.id); process.exit(1) }
console.log(`✅ Canal ${existant ? 'mis à jour' : 'créé'} : ${BOITE.adresse} (secret chiffré v1.*, relève par /api/canaux/relever)`)
