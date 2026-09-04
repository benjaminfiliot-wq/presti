import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const { rechercherChezFournisseurs } = await import('../lib/recherche-fournisseurs.ts')
const { resolveModel } = await import('../lib/models.ts')
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: a } = await admin.from('artisans').select('id, plan').eq('email', 'alexandremesroua@gmail.com').maybeSingle()
const { data: f } = await admin.from('fournisseurs').select('*').eq('artisan_id', a.id).order('ordre').order('nom')
const requete = process.argv[2] || 'radiateur électrique 1500 W'
const { model, tier } = resolveModel(process.argv[3] || 'standard', a.plan)
console.log(`recherche « ${requete} » — ${f.length} fournisseurs — ${tier} (${model})`)
const t0 = Date.now()
const s = await rechercherChezFournisseurs({ artisanId: a.id, requete, quantite: null, fournisseurs: f, tier, model })
console.log(`→ ${s.resultats.length} résultat(s) en ${Math.round((Date.now() - t0) / 1000)} s, non vus : ${s.nonVus.length}`)
for (const r of s.resultats) console.log('  ·', r.fournisseur, '—', r.designation, '—', r.prix, '—', r.lien)
for (const n of s.nonVus) console.log('  ∅', n.fournisseur ?? n.nom, '—', String(n.raison ?? n.pourquoi ?? JSON.stringify(n)).slice(0, 140))
for (const t of (s.trace ?? []).slice(0, 25)) console.log('  ∙', typeof t === 'string' ? t.slice(0, 160) : JSON.stringify(t).slice(0, 160))
