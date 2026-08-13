import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321'
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'anon-key-placeholder'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  // eslint-disable-next-line no-console
  console.warn('⚠️ Clés Supabase manquantes — copie .env.local.example en .env.local et remplis tes valeurs.')
}

export const supabase = createClient(url, anon)
