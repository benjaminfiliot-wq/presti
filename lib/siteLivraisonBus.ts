import { supabaseAdmin } from '@/lib/supabaseAdmin'

type Rpc = typeof supabaseAdmin.rpc

export async function busEnPause(rpc: Rpc = supabaseAdmin.rpc): Promise<boolean> {
  try {
    const { data, error } = await rpc('ops_interrupteur', { p_nom: 'pause_generale' })
    return !!error || data !== false
  } catch { return true }
}

export async function cloreTacheLivraison(commandeId: string, etat: string, rpc: Rpc = supabaseAdmin.rpc): Promise<'faite' | 'absente' | 'erreur'> {
  try {
    const { data, error } = await rpc('ops_tache_clore', { p_agent: 'livreur', p_cle: `livrer_site:${commandeId}`, p_preuve_url: `supabase://sites_commandes/${commandeId}#${etat}` })
    return !error && (data === 'faite' || data === 'absente') ? data : 'erreur'
  } catch { return 'erreur' }
}

export async function battementLivreur(rpc: Rpc = supabaseAdmin.rpc): Promise<void> {
  try { await rpc('ops_battement', { p_nom: 'livreur' }) } catch { /* Le veilleur constatera le silence. */ }
}

export async function battementTresorier(rpc: Rpc = supabaseAdmin.rpc): Promise<void> {
  try { await rpc('ops_battement', { p_nom: 'tresorier' }) } catch { /* Le veilleur constatera le silence. */ }
}
