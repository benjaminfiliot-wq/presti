import { supabaseAdmin } from '@/lib/supabaseAdmin'

type Rpc = typeof supabaseAdmin.rpc

// supabase-js lit `this.rest` dans rpc() : une référence nue (`rpc: Rpc = supabaseAdmin.rpc`) perd son `this` et lève un
// TypeError à chaque appel, que les `catch` ci-dessous avalaient : la pause était toujours « vraie » et les battements du
// livreur et du trésorier ne partaient jamais (constaté le 05/10 : livraison réussie, deux agents « jamais battus »).
// Le défaut est donc une fonction qui appelle supabaseAdmin.rpc en gardant son `this` ; une doublure reste injectable.
const rpcAdmin: Rpc = ((fn: string, args?: object, options?: object) => supabaseAdmin.rpc(fn, args as never, options as never)) as unknown as Rpc

export async function busEnPause(rpc: Rpc = rpcAdmin): Promise<boolean> {
  try {
    const { data, error } = await rpc('ops_interrupteur', { p_nom: 'pause_generale' })
    return !!error || data !== false
  } catch { return true }
}

export async function cloreTacheLivraison(commandeId: string, etat: string, rpc: Rpc = rpcAdmin): Promise<'faite' | 'absente' | 'erreur'> {
  try {
    const { data, error } = await rpc('ops_tache_clore', { p_agent: 'livreur', p_cle: `livrer_site:${commandeId}`, p_preuve_url: `supabase://sites_commandes/${commandeId}#${etat}` })
    return !error && (data === 'faite' || data === 'absente') ? data : 'erreur'
  } catch { return 'erreur' }
}

export async function battementLivreur(rpc: Rpc = rpcAdmin): Promise<void> {
  try { await rpc('ops_battement', { p_nom: 'livreur' }) } catch { /* Le veilleur constatera le silence. */ }
}

export async function battementTresorier(rpc: Rpc = rpcAdmin): Promise<void> {
  try { await rpc('ops_battement', { p_nom: 'tresorier' }) } catch { /* Le veilleur constatera le silence. */ }
}
