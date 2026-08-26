'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import JarvisHub, { type Stats } from '@/app/JarvisHub'

const eur = (n: number) => `${Math.round(n || 0).toLocaleString('fr-FR')} €`

export default function Controle() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [ready, setReady] = useState(false)
  const [booting, setBooting] = useState(true)
  const [clock, setClock] = useState('')
  const [dateStr, setDateStr] = useState('')

  useEffect(() => {
    const tick = () => { const d = new Date(); setClock(d.toLocaleTimeString('fr-FR', { hour12: false })); setDateStr(d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })) }
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t)
  }, [])

  useEffect(() => { const t = setTimeout(() => setBooting(false), 1900); return () => clearTimeout(t) }, [])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getSession()
      if (!data.session) { router.replace('/login'); return }
      const res = await fetch('/api/control/stats', { headers: { Authorization: `Bearer ${data.session.access_token}` } })
      if (res.status === 403) { router.replace('/dashboard'); return }
      if (res.ok) setStats(await res.json())
      setReady(true)
    }
    load(); const t = setInterval(load, 20000); return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="hud">
      {booting && (
        <div className="hud-boot">
          <div>&gt; INITIALISATION DU SYSTÈME PRESTI…</div>
          <div>&gt; AUTHENTIFICATION FONDATEUR <b className="ok">✓ ACCÈS TOTAL</b></div>
          <div>&gt; INTERFACE DE COMMANDEMENT <b>[ EN LIGNE ]</b></div>
          <div>&gt; SYNCHRONISATION DES DONNÉES…</div>
          <div><b className="ok">&gt; POSTE DE CONTRÔLE PRÊT</b></div>
        </div>
      )}

      <div className="hud-top">
        <div className="hud-mark" aria-hidden="true" />
        <div className="hud-title">POSTE DE CONTRÔLE<small>PRESTI · CENTRE D&apos;OPÉRATIONS</small></div>
        <div className="hud-status"><span className="d" />SYSTÈME EN LIGNE</div>
        <div className="hud-clock"><b>{clock}</b><span style={{ textTransform: 'capitalize' }}>{dateStr}</span></div>
        <a className="hud-back" href="/dashboard">← RETOUR</a>
      </div>

      {!ready ? (
        <div className="hud-empty">Connexion au système…</div>
      ) : !stats ? (
        <div className="hud-empty">Données indisponibles.</div>
      ) : (
        <>
          <JarvisHub stats={stats} onOpenDevis={(id) => router.push(`/devis/${id}`)} />

          <div className="hud-ticker">
            <div className="track">
              {[0, 1].map((k) => (
                <span key={k}>
                  <i>◆</i><b>REVENUS</b> {eur(stats.revenus.accepte)}<i>◆</i><b>PIPELINE</b> {eur(stats.revenus.pipeline)}<i>◆</i><b>CONVERSION</b> {stats.tauxConversion}%<i>◆</i><b>RÉPONSE</b> {stats.tauxReponse}%<i>◆</i><b>DEMANDES</b> {stats.leads.total}<i>◆</i><b>CHIFFRAGES</b> {stats.devis.total}<i>◆</i><b>CLIENTS</b> {stats.clients}<i>◆</i><b>ARTISANS</b> {stats.artisans}<i>◆</i>
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
