import { soumettreSiteSearchConsole } from '@/lib/sites/searchConsole'
// Tour synthétique pour établir la sensibilité SC-6 avant l'exécutant201.
export async function tourLivraison(d) {
  if (await d.enPause()) return
  const { data } = await d.base.from('sites_commandes').select('*').eq('etat', 'en_ligne').is('search_console_le', null).order('en_ligne_le').limit(50)
  const eligibles = data.filter(c => c.domaine_mode !== 'aucun' && Number(c.verifications?.search_console_essais || 0) < 3)
  for (const c of eligibles.slice(0, 3)) {
    if (await d.enPause()) break
    const r = await soumettreSiteSearchConsole(c, d.searchConsole)
    if (!r.ok) await d.base.from('sites_commandes').update({ verifications: { ...c.verifications, search_console_essais: Number(c.verifications?.search_console_essais || 0) + 1 } }).eq('id', c.id)
  }
}
