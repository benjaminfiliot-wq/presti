#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const dossier = process.env.PRESTI_SECRETS_DIR || 'C:/Users/benja/Documents/presti-secrets'
const fichier = path.join(dossier, 'meta-bibliotheque-pubs.txt')
const manque = 'colle le jeton dans C:/Users/benja/Documents/presti-secrets/meta-bibliotheque-pubs.txt, puis dis « collé »'
let jeton = ''
try { jeton = fs.readFileSync(fichier, 'utf8').trim() } catch { /* absent */ }
if (!jeton) { console.error(manque); process.exit(2) }
if (process.argv.includes('--sec')) { console.log('jeton présent (--sec : rien vérifié chez Meta, rien posé)'); process.exit(0) }

let expiration
try {
  const url = new URL('https://graph.facebook.com/debug_token')
  url.searchParams.set('input_token', jeton)
  url.searchParams.set('access_token', jeton)
  const reponse = await fetch(url, { signal: AbortSignal.timeout(10_000), redirect: 'error' })
  const corps = await reponse.json()
  if (!reponse.ok || corps.data?.is_valid !== true || !Number.isFinite(corps.data?.expires_at)) throw new Error('refus')
  expiration = corps.data.expires_at === 0 ? null : corps.data.expires_at > 0 ? new Date(corps.data.expires_at * 1000).toISOString() : undefined
  if (expiration === undefined) throw new Error('refus')
} catch { console.error('jeton refusé par Meta : en générer un nouveau'); process.exit(1) }

for (const l of fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8').split(/\r?\n/) : []) { const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '') }
const url = process.env.NEXT_PUBLIC_SUPABASE_URL, cle = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !cle) { console.error('Configuration de la base absente'); process.exit(2) }
const admin = createClient(url, cle, { auth: { persistSession: false } })
const { error } = await admin.rpc('acq_jeton_meta_poser', { p_jeton: jeton, p_expire_le: expiration })
if (error) { console.error('Coffre indisponible'); process.exit(1) }
const jours = expiration ? Math.max(0, Math.ceil((new Date(expiration).getTime() - Date.now()) / 86_400_000)) : null
console.log(expiration ? `jeton posé · valide · expire le ${expiration.slice(0, 10)} (J-${jours})` : 'jeton posé · valide · sans expiration')
