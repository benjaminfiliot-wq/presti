import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = Object.fromEntries(
  fs.readFileSync('.env.local', 'utf8')
    .split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '')]
    })
)

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data, error } = await admin.from('limites').select('cle, compteur').like('cle', 'leads:ip:%')
console.log('limites leads:ip:% ->', data, error)
const { error: dErr } = await admin.from('limites').delete().like('cle', 'leads:ip:%')
console.log('delete error:', dErr)
