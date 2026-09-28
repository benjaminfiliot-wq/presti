// TÉMOIN du juge routes-acquisition-qa (026-037) : scripts/agents/jeton-meta-poser.mjs [--sec] (026-077, point 4).
// N'affiche jamais le jeton, ni un morceau, ni sa longueur.
import fs from 'node:fs'
import path from 'node:path'

const sec = process.argv.includes('--sec')
const dossier = process.env.PRESTI_SECRETS_DIR || 'C:/Users/benja/Documents/presti-secrets'
const fichier = path.join(dossier, 'meta-bibliotheque-pubs.txt')
let jeton = ''
try { jeton = fs.readFileSync(fichier, 'utf8').replace(/\s+/g, '') } catch { jeton = '' }
if (!jeton) { console.log('colle le jeton dans C:/Users/benja/Documents/presti-secrets/meta-bibliotheque-pubs.txt, puis dis « collé »'); process.exit(2) }
if (sec) { console.log('jeton présent (--sec : rien vérifié chez Meta, rien posé)'); process.exit(0) }
const u = new URL('https://graph.facebook.com/debug_token')
u.searchParams.set('input_token', jeton)
u.searchParams.set('access_token', jeton)
const r = await fetch(u, { signal: AbortSignal.timeout(10_000) })
const d = (await r.json())?.data ?? {}
if (!d.is_valid) { console.log('jeton refusé par Meta : en générer un nouveau'); process.exit(1) }
const { createClient } = await import('@supabase/supabase-js')
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
const expire = d.expires_at > 0 ? new Date(d.expires_at * 1000).toISOString() : null
const { error } = await sb.rpc('acq_jeton_meta_poser', { p_jeton: jeton, p_expire_le: expire })
if (error) { console.log('pose refusée par la base'); process.exit(1) }
console.log(`jeton posé · valide · ${expire ? `expire le ${expire.slice(0, 10)}` : 'sans expiration'}`)
