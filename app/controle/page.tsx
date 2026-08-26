'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import HudGraph from '@/app/HudGraph'

type Activity = { kind: 'lead' | 'devis'; title: string; sub: string; artisan: string; statut: string; montant: number; at: string }
type DevisItem = { id: string; numero: string | null; client: string; objet: string; statut: string; montant: number; artisan: string; at: string }
type LeadItem = { id: string; nom: string; contact: string; message: string; statut: string; artisan: string; at: string }
type ClientItem = { nom: string; demandes: number; devis: number; total: number }
type Stats = {
  revenus: { accepte: number; pipeline: number; mois: number }
  devis: { total: number; brouillon: number; envoye: number; accepte: number; refuse: number }
  leads: { total: number; nouveau: number; repondu: number; gagne: number; semaine: number }
  clients: number; artisans: number; tauxReponse: number; tauxConversion: number
  activity: Activity[]; devisList: DevisItem[]; leadsList: LeadItem[]; clientsList: ClientItem[]
}

const eur = (n: number) => `${Math.round(n || 0).toLocaleString('fr-FR')} €`
const DEVIS_LABEL: Record<string, string> = { brouillon: 'Brouillon', envoye: 'Envoyé', accepte: 'Accepté', refuse: 'Refusé', expire: 'Expiré' }
const LEAD_LABEL: Record<string, string> = { nouveau: 'Nouveau', repondu: 'Répondu', gagne: 'Gagné', perdu: 'Perdu' }

function relTime(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (!Number.isFinite(d)) return ''
  if (d < 60) return `${Math.max(1, Math.floor(d))}s`
  if (d < 3600) return `${Math.floor(d / 60)}min`
  if (d < 86400) return `${Math.floor(d / 3600)}h`
  return `${Math.floor(d / 86400)}j`
}

function Bar({ label, value, max, money }: { label: string; value: number; max: number; money?: boolean }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="hud-bar">
      <div className="bl"><span>{label}</span><span>{money ? eur(value) : value}</span></div>
      <div className="bt"><div className="bf" style={{ width: `${pct}%` }} /></div>
    </div>
  )
}

const DevisIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
const LeadIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
const Chevron = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>

export default function Controle() {
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [ready, setReady] = useState(false)
  const [booting, setBooting] = useState(true)
  const [module, setModule] = useState<'overview' | 'demandes' | 'chiffrages' | 'clients' | 'revenus'>('overview')
  const [expanded, setExpanded] = useState<string | null>(null)
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

  const RAIL: { key: typeof module; label: string; count?: number; icon: ReactNode }[] = [
    { key: 'overview', label: "Vue d'ensemble", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></svg> },
    { key: 'demandes', label: 'Demandes', count: stats?.leads.total, icon: <LeadIcon /> },
    { key: 'chiffrages', label: 'Chiffrages', count: stats?.devis.total, icon: <DevisIcon /> },
    { key: 'clients', label: 'Clients', count: stats?.clients, icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-3.5 3.6-6 8-6s8 2.5 8 6" /></svg> },
    { key: 'revenus', label: 'Revenus', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg> },
  ]

  const chip = (statut: string, label: string) => <span className={`hud-chip chip-${statut}`}>{label}</span>

  return (
    <div className="hud">
      {booting && (
        <div className="hud-boot">
          <div>&gt; INITIALISATION DU SYSTÈME PRESTI…</div>
          <div>&gt; AUTHENTIFICATION FONDATEUR <b className="ok">✓ ACCÈS TOTAL</b></div>
          <div>&gt; CHARGEMENT DES MODULES <b>[ DEMANDES · CHIFFRAGES · CLIENTS · REVENUS ]</b></div>
          <div>&gt; SYNCHRONISATION DES DONNÉES…</div>
          <div><b className="ok">&gt; POSTE DE CONTRÔLE EN LIGNE</b></div>
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
          <div className="hud-shell">
            <div className="hud-rail">
              {RAIL.map((r) => (
                <button key={r.key} className={`hud-railbtn${module === r.key ? ' on' : ''}`} onClick={() => { setModule(r.key); setExpanded(null) }}>
                  {r.icon}{r.label}{typeof r.count === 'number' && <span className="c">{r.count}</span>}
                </button>
              ))}
            </div>

            <div className="hud-main">
              <div className="hud-main-inner" key={module}>

                {module === 'overview' && (
                  <>
                    <div className="hud-stage">
                      <HudGraph demandes={stats.leads.total} chiffrages={stats.devis.total} clients={stats.clients} revenus={stats.revenus.accepte} />
                      <div className="hud-corner tl">
                        <div className="cl">Revenus encaissés</div>
                        <div className="cbig">{eur(stats.revenus.accepte)}</div>
                        <div className="cr"><span>Pipeline</span><b>{eur(stats.revenus.pipeline)}</b></div>
                        <div className="cr"><span>Ce mois</span><b>{eur(stats.revenus.mois)}</b></div>
                      </div>
                      <div className="hud-corner tr">
                        <div className="cl">Génération de demandes</div>
                        <div className="cr"><span>Total</span><b>{stats.leads.total}</b></div>
                        <div className="cr"><span>Nouvelles</span><b>{stats.leads.nouveau}</b></div>
                        <div className="cr"><span>Cette semaine</span><b>{stats.leads.semaine}</b></div>
                        <div className="cr"><span>Gagnés</span><b>{stats.leads.gagne}</b></div>
                      </div>
                      <div className="hud-corner bl">
                        <div className="cl">Performance</div>
                        <div className="cr"><span>Conversion</span><b>{stats.tauxConversion}%</b></div>
                        <div className="cr"><span>Réponse</span><b>{stats.tauxReponse}%</b></div>
                        <div className="cr"><span>Devis acceptés</span><b>{stats.devis.accepte}</b></div>
                      </div>
                      <div className="hud-corner br">
                        <div className="cl">Réseau</div>
                        <div className="cr"><span>Clients</span><b>{stats.clients}</b></div>
                        <div className="cr"><span>Chiffrages</span><b>{stats.devis.total}</b></div>
                        <div className="cr"><span>Artisans</span><b>{stats.artisans}</b></div>
                      </div>
                    </div>

                    <div className="hud-panel" style={{ marginTop: 14 }}>
                      <div className="hud-lab">Flux d&apos;activité — temps réel</div>
                      <div className="hud-feed">
                        {stats.activity.length === 0 && <div className="hud-empty">Aucune activité — les nouvelles demandes et devis apparaîtront ici en direct.</div>}
                        {stats.activity.map((a, i) => (
                          <div className="hud-feed-row" key={i}>
                            <span className={`ic ${a.kind}`}>{a.kind === 'lead' ? <LeadIcon /> : <DevisIcon />}</span>
                            <span className="who"><b>{a.title}</b><span>{a.kind === 'lead' ? 'Demande' : 'Devis'} · {a.artisan}{a.sub ? ` · ${a.sub}` : ''}</span></span>
                            {a.kind === 'devis' && a.montant > 0 && <span className="mt">{eur(a.montant)}</span>}
                            <span className="rt">il y a {relTime(a.at)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {module === 'demandes' && (
                  <>
                    <div className="hud-mtitle">Toutes les demandes · {stats.leadsList.length}</div>
                    {stats.leadsList.length === 0 && <div className="hud-empty">Aucune demande.</div>}
                    {stats.leadsList.map((l) => (
                      <div key={l.id}>
                        <div className="hud-row" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>
                          <span className="rico"><LeadIcon /></span>
                          <span className="who"><b>{l.nom}</b><span>{l.artisan} · {l.contact}</span></span>
                          {chip(l.statut, LEAD_LABEL[l.statut] || l.statut)}
                          <span className="rt">il y a {relTime(l.at)}</span>
                          <span className="arr"><Chevron /></span>
                        </div>
                        {expanded === l.id && (
                          <div className="hud-detail">
                            <div className="k">Message du client</div>
                            <div style={{ whiteSpace: 'pre-wrap' }}>{l.message || '(aucun message)'}</div>
                            <div className="k" style={{ marginTop: 10 }}>Contact</div>
                            <div>{l.contact || '—'}</div>
                          </div>
                        )}
                      </div>
                    ))}
                  </>
                )}

                {module === 'chiffrages' && (
                  <>
                    <div className="hud-panel" style={{ marginBottom: 14 }}>
                      <div className="hud-lab">Répartition des chiffrages</div>
                      <Bar label="Brouillons" value={stats.devis.brouillon} max={stats.devis.total} />
                      <Bar label="Envoyés" value={stats.devis.envoye} max={stats.devis.total} />
                      <Bar label="Acceptés" value={stats.devis.accepte} max={stats.devis.total} />
                      <Bar label="Refusés" value={stats.devis.refuse} max={stats.devis.total} />
                    </div>
                    <div className="hud-mtitle">Tous les devis · {stats.devisList.length} — cliquez pour ouvrir</div>
                    {stats.devisList.length === 0 && <div className="hud-empty">Aucun devis.</div>}
                    {stats.devisList.map((d) => (
                      <div className="hud-row" key={d.id} onClick={() => router.push(`/devis/${d.id}`)}>
                        <span className="rico"><DevisIcon /></span>
                        <span className="who"><b>{d.client}</b><span>{d.numero} · {d.objet} · {d.artisan}</span></span>
                        {chip(d.statut, DEVIS_LABEL[d.statut] || d.statut)}
                        <span className="amt">{eur(d.montant)}</span>
                        <span className="arr"><Chevron /></span>
                      </div>
                    ))}
                  </>
                )}

                {module === 'clients' && (
                  <>
                    <div className="hud-mtitle">Clients · {stats.clientsList.length}</div>
                    {stats.clientsList.length === 0 && <div className="hud-empty">Aucun client.</div>}
                    {stats.clientsList.map((c, i) => (
                      <div className="hud-row" key={i} style={{ cursor: 'default' }}>
                        <span className="rico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-3.5 3.6-6 8-6s8 2.5 8 6" /></svg></span>
                        <span className="who"><b>{c.nom}</b><span>{c.demandes} demande{c.demandes > 1 ? 's' : ''} · {c.devis} devis</span></span>
                        <span className="amt">{eur(c.total)}</span>
                      </div>
                    ))}
                  </>
                )}

                {module === 'revenus' && (
                  <>
                    <div className="hud-grid" style={{ marginBottom: 14 }}>
                      <div className="hud-panel"><div className="hud-lab">Encaissé (accepté)</div><div className="hud-big">{eur(stats.revenus.accepte)}</div></div>
                      <div className="hud-panel"><div className="hud-lab">Pipeline en cours</div><div className="hud-big" style={{ color: '#9CEDF7' }}>{eur(stats.revenus.pipeline)}</div></div>
                      <div className="hud-panel"><div className="hud-lab">Encaissé ce mois</div><div className="hud-big">{eur(stats.revenus.mois)}</div></div>
                    </div>
                    {(() => { const max = Math.max(stats.revenus.accepte, stats.revenus.pipeline, 1); return (
                      <div className="hud-panel" style={{ marginBottom: 14 }}>
                        <div className="hud-lab">Encaissé vs pipeline</div>
                        <Bar label="Encaissé" value={stats.revenus.accepte} max={max} money />
                        <Bar label="Pipeline" value={stats.revenus.pipeline} max={max} money />
                        <Bar label="Ce mois" value={stats.revenus.mois} max={max} money />
                      </div>
                    ) })()}
                    <div className="hud-mtitle">Devis acceptés — cliquez pour ouvrir</div>
                    {stats.devisList.filter((d) => d.statut === 'accepte').map((d) => (
                      <div className="hud-row" key={d.id} onClick={() => router.push(`/devis/${d.id}`)}>
                        <span className="rico"><DevisIcon /></span>
                        <span className="who"><b>{d.client}</b><span>{d.numero} · {d.objet}</span></span>
                        <span className="amt">{eur(d.montant)}</span>
                        <span className="arr"><Chevron /></span>
                      </div>
                    ))}
                  </>
                )}

              </div>
            </div>
          </div>

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
