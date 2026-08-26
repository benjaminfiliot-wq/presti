'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Activity = { kind: 'lead' | 'devis'; title: string; sub: string; artisan: string; statut: string; montant: number; at: string }
type Stats = {
  revenus: { accepte: number; pipeline: number; mois: number }
  devis: { total: number; brouillon: number; envoye: number; accepte: number; refuse: number }
  leads: { total: number; nouveau: number; repondu: number; gagne: number; semaine: number }
  clients: number
  artisans: number
  tauxReponse: number
  tauxConversion: number
  activity: Activity[]
}

const eur = (n: number) => `${Math.round(n || 0).toLocaleString('fr-FR')} €`

function relTime(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (!Number.isFinite(d)) return ''
  if (d < 60) return `il y a ${Math.max(1, Math.floor(d))}s`
  if (d < 3600) return `il y a ${Math.floor(d / 60)}min`
  if (d < 86400) return `il y a ${Math.floor(d / 3600)}h`
  return `il y a ${Math.floor(d / 86400)}j`
}

function Gauge({ pct, label, gid }: { pct: number; label: string; gid: string }) {
  const r = 48
  const C = 2 * Math.PI * r
  const off = C * (1 - Math.max(0, Math.min(100, pct)) / 100)
  return (
    <div className="gauge">
      <svg width="116" height="116" viewBox="0 0 118 118" role="img" aria-label={`${label} ${pct}%`}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3EE0F0" /><stop offset="1" stopColor="#6C8CFF" />
          </linearGradient>
        </defs>
        <circle cx="59" cy="59" r={r} fill="none" stroke="rgba(62,224,240,.12)" strokeWidth="8" />
        <circle cx="59" cy="59" r={r} fill="none" stroke={`url(#${gid})`} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={off} transform="rotate(-90 59 59)"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.2,.7,.25,1)' }} />
        <text x="59" y="65" textAnchor="middle" fontWeight="800" fontSize="25" fill="#eafcff" style={{ fontFamily: 'var(--font-display)' }}>{pct}%</text>
      </svg>
      <div className="gl">{label}</div>
    </div>
  )
}

export default function Controle() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [ready, setReady] = useState(false)
  const [clock, setClock] = useState('')
  const [dateStr, setDateStr] = useState('')

  useEffect(() => {
    const tick = () => {
      const d = new Date()
      setClock(d.toLocaleTimeString('fr-FR', { hour12: false }))
      setDateStr(d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' }))
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  const load = async () => {
    const { data } = await supabase.auth.getSession()
    if (!data.session) { router.replace('/login'); return }
    const res = await fetch('/api/control/stats', { headers: { Authorization: `Bearer ${data.session.access_token}` } })
    if (res.status === 403) { router.replace('/dashboard'); return }
    if (res.ok) setStats(await res.json())
    setReady(true)
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 20000) // rafraîchissement live
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="hud">
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
        <div className="hud-grid">
          {/* REVENUS */}
          <div className="hud-panel">
            <div className="hud-lab">Revenus encaissés</div>
            <div className="hud-big">{eur(stats.revenus.accepte)}</div>
            <div className="hud-sub">
              <div className="r"><span>Pipeline en cours</span><b>{eur(stats.revenus.pipeline)}</b></div>
              <div className="r"><span>Encaissé ce mois</span><b>{eur(stats.revenus.mois)}</b></div>
            </div>
          </div>

          {/* PERFORMANCE */}
          <div className="hud-panel">
            <div className="hud-lab">Performance</div>
            <div className="hud-gauges">
              <Gauge pct={stats.tauxConversion} label="Conversion devis" gid="gConv" />
              <Gauge pct={stats.tauxReponse} label="Taux de réponse" gid="gRep" />
            </div>
          </div>

          {/* SIGNAUX */}
          <div className="hud-panel">
            <div className="hud-lab">Signaux</div>
            <div className="hud-tiles">
              <div className="hud-tile"><div className="n">{stats.leads.total}</div><div className="l">Demandes</div></div>
              <div className="hud-tile"><div className="n">{stats.clients}</div><div className="l">Clients</div></div>
              <div className="hud-tile"><div className="n">{stats.devis.total}</div><div className="l">Chiffrages</div></div>
              <div className="hud-tile"><div className="n">{stats.artisans}</div><div className="l">Artisans</div></div>
            </div>
          </div>

          {/* RÉPARTITION */}
          <div className="hud-panel c5">
            <div className="hud-lab">Répartition</div>
            <div className="hud-sub" style={{ fontSize: 12.5, gap: 9 }}>
              <div className="r"><span>◵ Demandes nouvelles</span><b>{stats.leads.nouveau}</b></div>
              <div className="r"><span>◷ Demandes cette semaine</span><b>{stats.leads.semaine}</b></div>
              <div className="r"><span>◶ Chantiers gagnés</span><b>{stats.leads.gagne}</b></div>
              <div className="r"><span>▤ Devis envoyés</span><b>{stats.devis.envoye}</b></div>
              <div className="r"><span>▣ Devis acceptés</span><b>{stats.devis.accepte}</b></div>
              <div className="r"><span>▢ Brouillons</span><b>{stats.devis.brouillon}</b></div>
            </div>
          </div>

          {/* FLUX D'ACTIVITÉ */}
          <div className="hud-panel c7">
            <div className="hud-lab">Flux d&apos;activité — temps réel</div>
            <div className="hud-feed">
              {stats.activity.length === 0 && <div className="hud-empty">Aucune activité pour l&apos;instant.</div>}
              {stats.activity.map((a, i) => (
                <div className="hud-feed-row" key={i}>
                  <span className={`ic ${a.kind}`}>
                    {a.kind === 'lead' ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
                    )}
                  </span>
                  <span className="who">
                    <b>{a.title}</b>
                    <span>{a.kind === 'lead' ? 'Demande' : 'Devis'} · {a.artisan} {a.sub ? `· ${a.sub}` : ''}</span>
                  </span>
                  {a.kind === 'devis' && a.montant > 0 && <span className="mt">{eur(a.montant)}</span>}
                  <span className="rt">{relTime(a.at)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
