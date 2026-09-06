import { createClient, type SupportedStorage } from '@supabase/supabase-js'
import { estNatif, plugin } from '@/lib/natif'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321'
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'anon-key-placeholder'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  // eslint-disable-next-line no-console
  console.warn('⚠️ Clés Supabase manquantes — copie .env.local.example en .env.local et remplis tes valeurs.')
}

// Dans la coque native (prompt v9 §4.3/§4.6), la session — et donc le jeton de rafraîchissement — vit dans le
// TROUSSEAU du téléphone (Keychain iOS, Keystore Android via capacitor-secure-storage-plugin), jamais dans le
// localStorage de la WebView. Dans un navigateur, rien ne change : supabase-js garde son stockage habituel.
// `window.Capacitor` est injecté par la coque avant tout script de page : le choix se fait ici, une fois.
function stockageNatif(): SupportedStorage | null {
  const sur = plugin('SecureStoragePlugin')
  if (!sur?.get || !sur.set || !sur.remove) return null
  // Une session posée avant ce stockage (ancienne version de l'app) ne doit pas traîner dans la WebView.
  try { for (const k of Object.keys(localStorage)) if (/^sb-.*-auth-token/.test(k)) localStorage.removeItem(k) } catch { /* stockage indisponible */ }
  return {
    getItem: async (key) => { try { const r = (await sur.get({ key })) as { value?: string }; return r?.value ?? null } catch { return null } },
    setItem: async (key, value) => { try { await sur.set({ key, value }) } catch { /* trousseau indisponible : la session ne survivra pas à la fermeture, c'est le comportement sûr */ } },
    removeItem: async (key) => { try { await sur.remove({ key }) } catch { /* déjà absente */ } },
  }
}

const stockage = typeof window !== 'undefined' && estNatif() ? stockageNatif() : null

export const supabase = createClient(url, anon, stockage ? { auth: { storage: stockage } } : undefined)
