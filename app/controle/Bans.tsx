'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiDirection, reconfirmationValide } from './client'
import Reconfirmer, { type Portee } from './Reconfirmer'

// Poste de contrôle → Réglages → les adresses bannies.
//
// La route existait depuis le J1 : gardée, re-confirmée, journalisée — et aucun écran ne l'appelait.
// Ce n'était pas du code mort à supprimer, c'était un écran manquant, et le geste qui manquait le
// plus est le DÉBANNISSEMENT : le bannissement, lui, se fait tout seul (lib/security.ts) et peut
// donc frapper un artisan légitime derrière une IP partagée — un chantier, une box, un hôtel.
// Sans cet écran, personne ne pouvait le débloquer.
//
// L'adresse est affichée EN CLAIR : c'est la seule table où elle l'est, parce que c'est la preuve
// qu'on oppose à une source abusive, et parce qu'on ne peut pas débannir ce qu'on ne peut pas lire.
// Le registre des traitements le dit désormais aussi (§2).

type Ban = { ip: string; raison: string | null; cree_le: string; expires_le: string | null; actif: boolean }
type Abus = { ip: string; n: number; raison: string; dernier: string }
type Etat = { bans: Ban[]; abus24h: Abus[] }

const quand = (iso: string | null) => (iso ? new Date(iso).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'jamais')

export default function Bans({ role, signaler }: {
  role: 'direction' | 'lecture'
  signaler: (m: { type: 'ok' | 'err'; text: string }) => void
}) {
  const [e, setE] = useState<Etat | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [aConfirmer, setAConfirmer] = useState<{ action: string; faire: () => Promise<void> } | null>(null)

  const charger = useCallback(async () => {
    const r = await apiDirection<Etat>('/api/controle/securite/bans')
    setE(r.ok ? r.data : { bans: [], abus24h: [] })
  }, [])
  useEffect(() => { charger() }, [charger])

  const debannir = useCallback(async (ip: string): Promise<void> => {
    setBusy(ip)
    try {
      const r = await apiDirection<{ message?: string; code?: string }>('/api/controle/securite/bans', {
        method: 'DELETE', body: JSON.stringify({ ip }),
      }, true)
      if (r.ok) { signaler({ type: 'ok', text: r.data.message ?? `${ip} n’est plus bannie.` }); void charger(); return }
      if (['reconfirmation_requise', 'expire', 'rejoue', 'portee'].includes(r.data.code ?? '')) {
        setAConfirmer({ action: `lever le bannissement de ${ip}`, faire: () => debannir(ip) })
        return
      }
      signaler({ type: 'err', text: r.data.error ?? 'Rien n’a été fait.' })
    } finally { setBusy(null) }
  }, [charger, signaler])

  if (!e) return null

  const actifs = e.bans.filter((b) => b.actif)

  return (
    <div className="tool-card" data-bans>
      <h2>Adresses bannies</h2>
      <p className="muted" style={{ margin: '0 0 .8rem' }}>
        Le bannissement est automatique : une adresse qui dépasse les plafonds est écartée toute seule.
        Ce qui ne l’est pas, c’est le retour en arrière — et une IP peut être partagée par tout un chantier.
      </p>

      {actifs.length === 0
        ? <p className="muted" data-bans-vide>Aucune adresse bannie en ce moment.</p>
        : (
          <ul className="sess">
            {actifs.map((b) => (
              <li key={b.ip}>
                <span className="sess-txt">
                  <b style={{ fontVariantNumeric: 'tabular-nums' }}>{b.ip}</b>
                  <small>
                    {b.raison || 'sans motif'} · depuis le {quand(b.cree_le)}
                    {b.expires_le ? ` · jusqu’au ${quand(b.expires_le)}` : ' · sans échéance'}
                  </small>
                </span>
                {role === 'direction'
                  ? <button type="button" className="btn btn--ghost" disabled={!!busy} onClick={() => void debannir(b.ip)} data-action="debannir">
                      {busy === b.ip ? '…' : 'Lever'}
                    </button>
                  : null}
              </li>
            ))}
          </ul>
        )}

      {/* Ce qui a été écarté sans bannissement : utile pour voir venir, inutile à décider. */}
      {e.abus24h.length ? (
        <details style={{ marginTop: '.8rem' }}>
          <summary className="muted" style={{ cursor: 'pointer', fontSize: '.85rem' }}>
            {e.abus24h.length} adresse{e.abus24h.length > 1 ? 's' : ''} signalée{e.abus24h.length > 1 ? 's' : ''} ces 24 h, sans bannissement
          </summary>
          <ul className="sup-lectures" style={{ marginTop: '.5rem' }}>
            {e.abus24h.map((a) => (
              <li key={a.ip}><b>{a.ip}</b> — {a.n} signalement{a.n > 1 ? 's' : ''} · {a.raison}</li>
            ))}
          </ul>
        </details>
      ) : null}

      {aConfirmer ? (
        <Reconfirmer portee={'securite' as Portee} action={aConfirmer.action}
          onConfirme={() => { const f = aConfirmer.faire; setAConfirmer(null); void f() }}
          onAnnule={() => setAConfirmer(null)} />
      ) : null}
    </div>
  )
}
