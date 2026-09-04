// Lève le bannissement automatique de MON adresse IP et purge ses abus enregistrés.
//
// Pourquoi : les suites de test et les auditeurs frappent la production depuis une seule adresse,
// et l'anti-abus fait exactement son travail — il bannit. Entre deux suites, on remet le compteur
// à zéro pour que la suivante ne teste pas « suis-je banni ? » au lieu de ce qu'elle doit tester.
// Ne touche qu'à l'adresse depuis laquelle le script tourne : jamais celle d'un vrai visiteur.
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'
for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const ip = (await (await fetch('https://api.ipify.org')).text()).trim()
const a = await admin.from('ip_abus').delete().eq('ip', ip).select('id')
const b = await admin.from('ip_bans').delete().eq('ip', ip).select('ip')
console.log(`🧹 abus purgés pour cette adresse : ${a.data?.length ?? 0} abus, ${b.data?.length ?? 0} bannissement`)
