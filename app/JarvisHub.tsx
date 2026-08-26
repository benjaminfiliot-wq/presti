'use client'

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import HudGraph from '@/app/HudGraph'

export type Activity = { kind: 'lead' | 'devis'; title: string; sub: string; artisan: string; statut: string; montant: number; at: string }
export type DevisItem = { id: string; numero: string | null; client: string; objet: string; statut: string; montant: number; artisan: string; at: string }
export type LeadItem = { id: string; nom: string; contact: string; message: string; statut: string; artisan: string; at: string }
export type ClientItem = { nom: string; demandes: number; devis: number; total: number }
export type Stats = {
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

const I: Record<string, ReactNode> = {
  revenus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
  demandes: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  chiffrages: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>,
  clients: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-3.5 3.6-6 8-6s8 2.5 8 6" /></svg>,
  perf: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M3 12h4l2 5 4-14 2 9h6" /></svg>,
  config: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.9 1.14V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 6 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H4.5a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 6 9.4l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 12 4.6a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 3.4 1.14l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 12v.09z" /></svg>,
}
const Chevron = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>

function Gauge({ pct, label, color }: { pct: number; label: string; color: string }) {
  const r = 42, C = 2 * Math.PI * r
  const off = C * (1 - Math.max(0, Math.min(100, pct)) / 100)
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="104" height="104" viewBox="0 0 104 104" style={{ filter: `drop-shadow(0 0 6px ${color}88)` }}>
        <circle cx="52" cy="52" r={r} fill="none" stroke="rgba(255,255,255,.08)" strokeWidth="7" />
        <circle cx="52" cy="52" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off} transform="rotate(-90 52 52)" style={{ transition: 'stroke-dashoffset 1s cubic-bezier(.2,.7,.25,1)' }} />
        <text x="52" y="58" textAnchor="middle" fontWeight="800" fontSize="22" fill="#eafcff" style={{ fontFamily: 'var(--font-display)' }}>{pct}%</text>
      </svg>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--cy-soft)', marginTop: 4 }}>{label}</div>
    </div>
  )
}
function Bar({ label, value, max, color, money }: { label: string; value: number; max: number; color: string; money?: boolean }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="hud-bar">
      <div className="bl"><span>{label}</span><span>{money ? eur(value) : value}</span></div>
      <div className="bt"><div className="bf" style={{ width: `${pct}%`, background: `linear-gradient(90deg,${color},#6C8CFF)`, boxShadow: `0 0 12px ${color}99` }} /></div>
    </div>
  )
}

type SegKey = 'revenus' | 'demandes' | 'chiffrages' | 'clients' | 'perf' | 'config'
type Integrations = { paypal: string; stripe: string; iban: string; entreprise: string; siret: string }
const EMPTY_INT: Integrations = { paypal: '', stripe: '', iban: '', entreprise: '', siret: '' }

export default function JarvisHub({ stats, onOpenDevis }: { stats: Stats; onOpenDevis: (id: string) => void }) {
  const [active, setActive] = useState<SegKey | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [cfg, setCfg] = useState<Integrations>(EMPTY_INT)
  const [cfgSaved, setCfgSaved] = useState(false)

  useEffect(() => {
    try { const raw = localStorage.getItem('presti_integrations'); if (raw) setCfg({ ...EMPTY_INT, ...JSON.parse(raw) }) } catch {}
  }, [])
  const saveCfg = () => {
    try { localStorage.setItem('presti_integrations', JSON.stringify(cfg)) } catch {}
    setCfgSaved(true); setTimeout(() => setCfgSaved(false), 2200)
  }
  const setF = (k: keyof Integrations, v: string) => setCfg((c) => ({ ...c, [k]: v }))
  const nInt = [cfg.paypal, cfg.stripe, cfg.iban].filter(Boolean).length

  const SEGS: { key: SegKey; label: string; color: string; value: string }[] = [
    { key: 'revenus', label: 'Revenus', color: '#38CD8C', value: eur(stats.revenus.accepte) },
    { key: 'demandes', label: 'Demandes', color: '#F5B301', value: String(stats.leads.total) },
    { key: 'chiffrages', label: 'Chiffrages', color: '#6C8CFF', value: String(stats.devis.total) },
    { key: 'clients', label: 'Clients', color: '#3EE0F0', value: String(stats.clients) },
    { key: 'perf', label: 'Perf.', color: '#8A6BFF', value: `${stats.tauxConversion}%` },
    { key: 'config', label: 'Config', color: '#F0567A', value: `${nInt}/3` },
  ]
  const cur = SEGS.find((s) => s.key === active)
  const chip = (statut: string, label: string) => <span className={`hud-chip chip-${statut}`}>{label}</span>

  return (
    <div className={`jarvis${active ? ' has-active' : ''}`}>
      <div className="jv-frame">
        <div className="hud-corner tl">
          <div className="cl">Revenus · Cash</div>
          <div className="cbig">{eur(stats.revenus.accepte)}</div>
          <div className="cr"><span>Pipeline</span><b>{eur(stats.revenus.pipeline)}</b></div>
          <div className="cr"><span>Ce mois</span><b>{eur(stats.revenus.mois)}</b></div>
          <div className="cr"><span>Conversion</span><b>{stats.tauxConversion}%</b></div>
        </div>
        <div className="hud-corner tr">
          <div className="cl">Lead Gen</div>
          <div className="cr"><span>Demandes</span><b>{stats.leads.total}</b></div>
          <div className="cr"><span>Nouvelles</span><b>{stats.leads.nouveau}</b></div>
          <div className="cr"><span>Semaine</span><b>{stats.leads.semaine}</b></div>
          <div className="cr"><span>Gagnés</span><b>{stats.leads.gagne}</b></div>
          <div className="cr"><span>Réponse</span><b>{stats.tauxReponse}%</b></div>
        </div>
        <div className="hud-corner bl">
          <div className="cl">Portfolio · Devis</div>
          <div className="cr"><span>Total</span><b>{stats.devis.total}</b></div>
          <div className="cr"><span>Envoyés</span><b>{stats.devis.envoye}</b></div>
          <div className="cr"><span>Acceptés</span><b>{stats.devis.accepte}</b></div>
          <div className="cr"><span>Brouillons</span><b>{stats.devis.brouillon}</b></div>
        </div>
        <div className="hud-corner br">
          <div className="cl">Réseau</div>
          <div className="cr"><span>Clients</span><b>{stats.clients}</b></div>
          <div className="cr"><span>Artisans</span><b>{stats.artisans}</b></div>
          <div className="cr"><span>Intégrations</span><b>{nInt}/3</b></div>
          <div className="cr"><span>Statut</span><b style={{ color: '#5FE0A8' }}>LIVE</b></div>
        </div>

        <div className="jv-rings">
          <HudGraph density={0.8 + Math.min(1, (stats.leads.total + stats.devis.total) / 30)} />
          <svg className="jv-svg" viewBox="0 0 400 400" fill="none" aria-hidden="true">
            <circle cx="200" cy="200" r="196" stroke="rgba(62,224,240,.1)" />
            <g className="jv-rot-slow"><circle cx="200" cy="200" r="178" stroke="rgba(62,224,240,.3)" strokeWidth="1" strokeDasharray="2 9" /></g>
            <circle cx="200" cy="200" r="150" stroke="rgba(62,224,240,.08)" />
            <g className="jv-rot-med"><circle cx="200" cy="200" r="132" stroke="rgba(108,140,255,.32)" strokeWidth="2" strokeDasharray="34 22" /></g>
            <circle cx="200" cy="200" r="104" stroke="rgba(62,224,240,.1)" />
            <g className="jv-rot-fast"><circle cx="200" cy="200" r="92" stroke="rgba(62,224,240,.4)" strokeWidth="1" strokeDasharray="1 7" /></g>
          </svg>

          {SEGS.map((s, i) => {
            const ang = (-90 + i * (360 / SEGS.length)) * (Math.PI / 180)
            const R = 43
            const left = 50 + R * Math.cos(ang)
            const top = 50 + R * Math.sin(ang)
            return (
              <button key={s.key} className={`jv-seg${active === s.key ? ' on' : ''}`} style={{ left: `${left}%`, top: `${top}%`, '--sc': s.color } as CSSProperties}
                onClick={() => { setActive(active === s.key ? null : s.key); setExpanded(null) }}>
                <span className="si">{I[s.key]}</span>
                <span className="sl">{s.label}</span>
                <span className="sv">{s.value}</span>
              </button>
            )
          })}

          <div className="jv-core">
            <div className="cbrand">PRESTI</div>
            <div className="csub">{active ? '● ' + (cur?.label.toUpperCase()) : 'POSTE DE CONTRÔLE'}</div>
          </div>
        </div>
      </div>

      {active && cur && (
        <div className="jv-panel" style={{ '--sc': cur.color } as CSSProperties}>
          <div className="jv-phead">
            <span className="pi">{I[active]}</span>
            <h3>{cur.label}</h3>
            <button className="close" onClick={() => setActive(null)}>✕ Fermer</button>
          </div>

          {active === 'revenus' && (() => { const max = Math.max(stats.revenus.accepte, stats.revenus.pipeline, 1); return (
            <div>
              <Bar label="Encaissé (accepté)" value={stats.revenus.accepte} max={max} color={cur.color} money />
              <Bar label="Pipeline en cours" value={stats.revenus.pipeline} max={max} color={cur.color} money />
              <Bar label="Encaissé ce mois" value={stats.revenus.mois} max={max} color={cur.color} money />
              <div className="jv-mt">Devis acceptés — cliquez pour ouvrir</div>
              {stats.devisList.filter((d) => d.statut === 'accepte').map((d) => (
                <div className="hud-row" key={d.id} onClick={() => onOpenDevis(d.id)}>
                  <span className="who"><b>{d.client}</b><span>{d.numero} · {d.objet}</span></span>
                  <span className="amt">{eur(d.montant)}</span><span className="arr"><Chevron /></span>
                </div>
              ))}
              {stats.devisList.filter((d) => d.statut === 'accepte').length === 0 && <div className="hud-empty">Aucun encaissement pour l&apos;instant.</div>}
            </div>
          ) })()}

          {active === 'demandes' && (
            <div>
              {stats.leadsList.length === 0 && <div className="hud-empty">Aucune demande — les nouvelles arrivent ici en direct.</div>}
              {stats.leadsList.map((l) => (
                <div key={l.id}>
                  <div className="hud-row" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>
                    <span className="who"><b>{l.nom}</b><span>{l.artisan} · {l.contact}</span></span>
                    {chip(l.statut, LEAD_LABEL[l.statut] || l.statut)}<span className="rt">il y a {relTime(l.at)}</span><span className="arr"><Chevron /></span>
                  </div>
                  {expanded === l.id && <div className="hud-detail"><div className="k">Message</div><div style={{ whiteSpace: 'pre-wrap' }}>{l.message || '(aucun message)'}</div></div>}
                </div>
              ))}
            </div>
          )}

          {active === 'chiffrages' && (
            <div>
              {stats.devisList.length === 0 && <div className="hud-empty">Aucun chiffrage — ils apparaîtront ici.</div>}
              {stats.devisList.map((d) => (
                <div className="hud-row" key={d.id} onClick={() => onOpenDevis(d.id)}>
                  <span className="who"><b>{d.client}</b><span>{d.numero} · {d.objet} · {d.artisan}</span></span>
                  {chip(d.statut, DEVIS_LABEL[d.statut] || d.statut)}<span className="amt">{eur(d.montant)}</span><span className="arr"><Chevron /></span>
                </div>
              ))}
            </div>
          )}

          {active === 'clients' && (
            <div>
              {stats.clientsList.length === 0 && <div className="hud-empty">Aucun client pour l&apos;instant.</div>}
              {stats.clientsList.map((c, i) => (
                <div className="hud-row" key={i} style={{ cursor: 'default' }}>
                  <span className="who"><b>{c.nom}</b><span>{c.demandes} demande(s) · {c.devis} devis</span></span>
                  <span className="amt">{eur(c.total)}</span>
                </div>
              ))}
            </div>
          )}

          {active === 'perf' && (
            <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap', justifyContent: 'center', padding: '10px 0' }}>
              <Gauge pct={stats.tauxConversion} label="Conversion devis" color={cur.color} />
              <Gauge pct={stats.tauxReponse} label="Taux de réponse" color="#3EE0F0" />
              <div style={{ alignSelf: 'center', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--muted)', lineHeight: 1.9 }}>
                <div>Devis acceptés : <b style={{ color: '#eafcff' }}>{stats.devis.accepte}</b></div>
                <div>Devis envoyés : <b style={{ color: '#eafcff' }}>{stats.devis.envoye}</b></div>
                <div>Chantiers gagnés : <b style={{ color: '#eafcff' }}>{stats.leads.gagne}</b></div>
              </div>
            </div>
          )}

          {active === 'config' && (
            <div className="jv-form">
              <div className="jv-mt" style={{ marginTop: 0 }}>Intégrations &amp; encaissement — saisissez vos accès</div>
              <div className="jv-field"><label>Compte PayPal (email ou marchand)</label><input value={cfg.paypal} onChange={(e) => setF('paypal', e.target.value)} placeholder="paiements@votre-entreprise.fr" /></div>
              <div className="jv-field"><label>Clé Stripe (pk_live…)</label><input value={cfg.stripe} onChange={(e) => setF('stripe', e.target.value)} placeholder="pk_live_…" /></div>
              <div className="jv-field"><label>IBAN (virements)</label><input value={cfg.iban} onChange={(e) => setF('iban', e.target.value)} placeholder="FR76 …" /></div>
              <div className="jv-2">
                <div className="jv-field"><label>Entreprise</label><input value={cfg.entreprise} onChange={(e) => setF('entreprise', e.target.value)} placeholder="Presti SAS" /></div>
                <div className="jv-field"><label>SIRET</label><input value={cfg.siret} onChange={(e) => setF('siret', e.target.value)} placeholder="000 000 000 00000" /></div>
              </div>
              <button className="jv-save" onClick={saveCfg}>{cfgSaved ? '✓ Enregistré' : 'Enregistrer les accès'}</button>
              <p className="jv-note">Le branchement réel des paiements (encaissement en 1 clic) arrive avec la facturation — ici vous préparez déjà vos accès.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
