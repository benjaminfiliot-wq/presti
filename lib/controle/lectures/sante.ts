// Vient de app/api/controle/barre/route.ts (const `service`) : le verdict de santé du service montré par la barre.
// La barre ne refait PAS sa propre mesure : elle demande le même verdict que le bandeau (/api/controle/etat).
import { sourcer } from '@/lib/direction/fraicheur'

type Etat = 'ok' | 'degrade' | 'incident'

export const santeService = (origine: string, jeton: string | null) =>
  sourcer('barre:service', 'app', async () => {
    const r = await fetch(`${origine}/api/controle/etat`, {
      cache: 'no-store', signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'presti-barre', ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}) },
    })
    if (!r.ok) throw new Error(`état ${r.status}`)
    const j = (await r.json()) as { niveau: Etat; controles: { cle: string; etat: string; libelle: string }[] }
    const verts = j.controles.filter((c) => c.etat === 'ok').length
    const soucis = j.controles.filter((c) => c.etat === 'crit' || c.etat === 'warn').map((c) => c.libelle)
    return {
      etat: j.niveau,
      detail: j.niveau === 'ok' ? `${verts} contrôles verts` : soucis.slice(0, 2).join(', ') || 'un contrôle en défaut',
    }
  }, 60_000)
