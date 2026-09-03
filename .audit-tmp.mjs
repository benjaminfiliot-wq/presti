import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z_0-9]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data: art, error } = await sb.from('artisans').select('id, nom, slug, plan, is_founder, site_active, plateforme_active, site_tier, siret, forme_juridique, adresse, code_postal, ville, assurance_nom, assurance_contrat, tva_regime, mention_tva_base, conditions_paiement, iban, compteur_devis, compteur_facture')
if (error) { console.log('ERR artisans', error.message) } else {
  console.log('artisans:', art.length)
  for (const a of art) console.log(JSON.stringify({...a, id: a.id.slice(0,8)}))
}
