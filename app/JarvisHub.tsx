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
const eurShort = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k€` : `${Math.round(n)}€`)
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
  paiements: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>,
  demandes: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>,
  mails: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 6 10 7L22 6" /></svg>,
  chiffrages: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>,
  clients: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-3.5 3.6-6 8-6s8 2.5 8 6" /></svg>,
  config: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.9 1.14V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 6 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H4.5a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 6 9.4l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 12 4.6a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 3.4 1.14l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 12v.09z" /></svg>,
}
const Chevron = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>

function Bar({ label, value, max, color, money }: { label: string; value: number; max: number; color: string; money?: boolean }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="hud-bar">
      <div className="bl"><span>{label}</span><span>{money ? eur(value) : value}</span></div>
      <div className="bt"><div className="bf" style={{ width: `${pct}%`, background: `linear-gradient(90deg,${color},#6C8CFF)`, boxShadow: `0 0 12px ${color}99` }} /></div>
    </div>
  )
}

export type StripeData = { configured: boolean; solde?: number; totalEncaisse?: number; nbPaiements?: number; transactions?: { id: string; montant: number; desc: string; at: string }[]; error?: string }
export type MailData = { configured: boolean; messages?: { id: string; from: string; fromName: string; subject: string; at: string; seen: boolean }[]; total?: number; error?: string }
type HubKey = 'demandes' | 'mails' | 'chiffrages' | 'clients' | 'revenus' | 'paiements' | 'config'
type Leaf = { id: string; kind: 'lead' | 'devis' | 'client' | 'tx' | 'mail'; name: string }
type Integrations = { paypal: string; stripe: string; iban: string; entreprise: string; siret: string }
const EMPTY_INT: Integrations = { paypal: '', stripe: '', iban: '', entreprise: '', siret: '' }

export default function JarvisHub({ stats, stripe, mails, onOpenDevis }: { stats: Stats; stripe: StripeData | null; mails: MailData | null; onOpenDevis: (id: string) => void }) {
  const [active, setActive] = useState<HubKey | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [cfg, setCfg] = useState<Integrations>(EMPTY_INT)
  const [cfgSaved, setCfgSaved] = useState(false)

  useEffect(() => { try { const raw = localStorage.getItem('presti_integrations'); if (raw) setCfg({ ...EMPTY_INT, ...JSON.parse(raw) }) } catch {} }, [])
  const saveCfg = () => { try { localStorage.setItem('presti_integrations', JSON.stringify(cfg)) } catch {}; setCfgSaved(true); setTimeout(() => setCfgSaved(false), 2200) }
  const setF = (k: keyof Integrations, v: string) => setCfg((c) => ({ ...c, [k]: v }))
  const nInt = [cfg.paypal, cfg.stripe, cfg.iban].filter(Boolean).length

  const HUBS: { key: HubKey; label: string; color: string; count: string; leaves: Leaf[] }[] = [
    { key: 'demandes', label: 'DEMANDES', color: '#F5B301', count: String(stats.leads.total), leaves: stats.leadsList.slice(0, 7).map((l) => ({ id: l.id, kind: 'lead', name: l.nom })) },
    { key: 'mails', label: 'MAILS', color: '#2FD3B5', count: mails?.configured ? String(mails.total || 0) : '—', leaves: (mails?.messages || []).slice(0, 7).map((m) => ({ id: m.id, kind: 'mail' as const, name: m.subject })) },
    { key: 'chiffrages', label: 'CHIFFRAGES', color: '#6C8CFF', count: String(stats.devis.total), leaves: stats.devisList.slice(0, 7).map((d) => ({ id: d.id, kind: 'devis', name: d.client })) },
    { key: 'clients', label: 'CLIENTS', color: '#3EE0F0', count: String(stats.clients), leaves: stats.clientsList.slice(0, 7).map((c) => ({ id: c.nom, kind: 'client', name: c.nom })) },
    { key: 'revenus', label: 'REVENUS', color: '#38CD8C', count: eurShort(stats.revenus.accepte), leaves: stats.devisList.filter((d) => d.statut === 'accepte').slice(0, 7).map((d) => ({ id: d.id, kind: 'devis', name: d.client })) },
    { key: 'paiements', label: 'PAIEMENTS', color: '#7A6CFF', count: stripe?.configured ? eurShort(stripe.totalEncaisse || 0) : '—', leaves: (stripe?.transactions || []).slice(0, 7).map((t) => ({ id: t.id, kind: 'tx' as const, name: t.desc || `${Math.round(t.montant)} €` })) },
    { key: 'config', label: 'CONFIG', color: '#F0567A', count: `${nInt}/3`, leaves: [] },
  ]
  const COLOR: Record<HubKey, string> = { demandes: '#F5B301', mails: '#2FD3B5', chiffrages: '#6C8CFF', clients: '#3EE0F0', revenus: '#38CD8C', paiements: '#7A6CFF', config: '#F0567A' }
  const LABEL: Record<HubKey, string> = { demandes: 'Demandes', mails: 'Mails', chiffrages: 'Chiffrages', clients: 'Clients', revenus: 'Revenus', paiements: 'Paiements', config: 'Config' }

  const hubClick = (k: HubKey) => { setActive(active === k ? null : k); setExpanded(null) }
  const leafClick = (h: HubKey, l: Leaf) => {
    if (l.kind === 'devis') { onOpenDevis(l.id); return }
    if (l.kind === 'lead') { setActive('demandes'); setExpanded(l.id); return }
    setActive(h)
  }
  const chip = (statut: string, label: string) => <span className={`hud-chip chip-${statut}`}>{label}</span>
  const curColor = active ? COLOR[active] : '#3EE0F0'

  return (
    <div className={`jarvis${active ? ' has-active' : ''}`}>
      <div className="jv-frame">
        <div className="hud-corner tl">
          <div className="cl">Revenus · Cash</div><div className="cbig">{eur(stats.revenus.accepte)}</div>
          <div className="cr"><span>Pipeline</span><b>{eur(stats.revenus.pipeline)}</b></div>
          <div className="cr"><span>Ce mois</span><b>{eur(stats.revenus.mois)}</b></div>
          <div className="cr"><span>Conversion</span><b>{stats.tauxConversion}%</b></div>
        </div>
        <div className="hud-corner tr">
          <div className="cl">Lead Gen</div>
          <div className="cr"><span>Demandes</span><b>{stats.leads.total}</b></div>
          <div className="cr"><span>Nouvelles</span><b>{stats.leads.nouveau}</b></div>
          <div className="cr"><span>Semaine</span><b>{stats.leads.semaine}</b></div>
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

        <div className="jv-net-wrap">
          <HudGraph density={0.7} />
          <svg className="jv-net" viewBox="0 0 700 700" preserveAspectRatio="xMidYMid meet">
            <defs><radialGradient id="jvCore" cx="50%" cy="45%" r="55%"><stop offset="0" stopColor="rgba(62,224,240,.45)" /><stop offset="1" stopColor="rgba(9,12,18,.96)" /></radialGradient></defs>
            <g className="jv-rot-slow"><circle cx="350" cy="350" r="332" stroke="rgba(62,224,240,.14)" fill="none" strokeDasharray="2 11" /></g>
            <circle cx="350" cy="350" r="300" stroke="rgba(62,224,240,.06)" fill="none" />
            <g className="jv-rot-med"><circle cx="350" cy="350" r="250" stroke="rgba(108,140,255,.18)" fill="none" strokeDasharray="34 26" /></g>

            {HUBS.map((h, i) => {
              const ang = (-90 + i * (360 / HUBS.length)) * (Math.PI / 180)
              const hx = 350 + 200 * Math.cos(ang), hy = 350 + 200 * Math.sin(ang)
              return (
                <g key={h.key}>
                  <line x1="350" y1="350" x2={hx} y2={hy} stroke={h.color + '66'} strokeWidth="1.6" />
                  {h.leaves.map((l, j) => {
                    const la = ang + (j - (h.leaves.length - 1) / 2) * 0.2
                    const lx = 350 + 288 * Math.cos(la), ly = 350 + 288 * Math.sin(la)
                    return (
                      <g key={j} className="jv-leaf" onClick={() => leafClick(h.key, l)}>
                        <line x1={hx} y1={hy} x2={lx} y2={ly} stroke={h.color + '44'} strokeWidth="1" />
                        <circle cx={lx} cy={ly} r="7" fill={h.color} stroke="rgba(5,7,12,.6)"><title>{l.name}</title></circle>
                      </g>
                    )
                  })}
                  <g className={`jv-hub${active === h.key ? ' on' : ''}`} onClick={() => hubClick(h.key)} style={{ ['--sc']: h.color } as CSSProperties}>
                    <circle cx={hx} cy={hy} r="27" fill="rgba(9,12,18,.92)" stroke={h.color} strokeWidth="2" />
                    <text x={hx} y={hy - 39} textAnchor="middle" className="jv-hlabel" fill={h.color}>{h.label}</text>
                    <text x={hx} y={hy + 7} textAnchor="middle" className="jv-hcount">{h.count}</text>
                  </g>
                </g>
              )
            })}

            <g className="jv-core-node" onClick={() => setActive(null)}>
              <circle cx="350" cy="350" r="54" fill="url(#jvCore)" stroke="rgba(62,224,240,.5)" strokeWidth="1.5" />
              <text x="350" y="345" textAnchor="middle" className="jv-cbrand">PRESTI</text>
              <text x="350" y="365" textAnchor="middle" className="jv-csub">{active ? '● ' + LABEL[active].toUpperCase() : 'CONTRÔLE'}</text>
            </g>
          </svg>
        </div>
      </div>

      {active && (
        <div className="jv-panel" style={{ ['--sc']: curColor } as CSSProperties}>
          <div className="jv-phead">
            <span className="pi">{I[active]}</span>
            <h3>{LABEL[active]}</h3>
            <button className="close" onClick={() => setActive(null)}>✕ Fermer</button>
          </div>

          {active === 'revenus' && (() => { const max = Math.max(stats.revenus.accepte, stats.revenus.pipeline, 1); return (
            <div>
              <Bar label="Encaissé (accepté)" value={stats.revenus.accepte} max={max} color={curColor} money />
              <Bar label="Pipeline en cours" value={stats.revenus.pipeline} max={max} color={curColor} money />
              <Bar label="Encaissé ce mois" value={stats.revenus.mois} max={max} color={curColor} money />
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
              <div className="jv-mt" style={{ marginTop: 0 }}>Toutes les demandes reçues · {stats.leadsList.length}</div>
              {stats.leadsList.length === 0 && <div className="hud-empty">Aucune demande — chaque nouvelle demande reçue arrivera ici en direct.</div>}
              {stats.leadsList.map((l) => (
                <div key={l.id}>
                  <div className="hud-row" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>
                    <span className="who"><b>{l.nom}</b><span>{l.artisan} · {l.contact}</span></span>
                    {chip(l.statut, LEAD_LABEL[l.statut] || l.statut)}<span className="rt">il y a {relTime(l.at)}</span><span className="arr"><Chevron /></span>
                  </div>
                  {expanded === l.id && <div className="hud-detail"><div className="k">Message reçu</div><div style={{ whiteSpace: 'pre-wrap' }}>{l.message || '(aucun message)'}</div></div>}
                </div>
              ))}
            </div>
          )}

          {active === 'chiffrages' && (
            <div>
              <div className="jv-mt" style={{ marginTop: 0 }}>Tous les devis créés · {stats.devisList.length} — cliquez pour ouvrir</div>
              {stats.devisList.length === 0 && <div className="hud-empty">Aucun chiffrage — chaque devis créé apparaîtra ici.</div>}
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
              <div className="jv-mt" style={{ marginTop: 0 }}>Tous les clients · {stats.clientsList.length}</div>
              {stats.clientsList.length === 0 && <div className="hud-empty">Aucun client pour l&apos;instant.</div>}
              {stats.clientsList.map((c, i) => (
                <div className="hud-row" key={i} style={{ cursor: 'default' }}>
                  <span className="who"><b>{c.nom}</b><span>{c.demandes} demande(s) · {c.devis} devis</span></span>
                  <span className="amt">{eur(c.total)}</span>
                </div>
              ))}
            </div>
          )}

          {active === 'mails' && (
            mails?.configured ? (
              <div>
                <div className="jv-mt" style={{ marginTop: 0 }}>Boîte de réception · {mails.total || 0} derniers mails</div>
                {mails.error && <div className="hud-empty">Connexion mail : {mails.error}</div>}
                {!mails.error && (mails.messages || []).length === 0 && <div className="hud-empty">Aucun mail récent.</div>}
                {(mails.messages || []).map((m) => (
                  <div className="hud-row" key={m.id} style={{ cursor: 'default' }}>
                    <span className="who"><b>{m.subject}</b><span>{m.fromName || m.from}</span></span>
                    {!m.seen && <span className="hud-chip chip-nouveau">Non lu</span>}
                    <span className="rt">il y a {relTime(m.at)}</span>
                  </div>
                ))}
              </div>
            ) : <div className="hud-empty">Boîte mail pas encore connectée sur ce déploiement.</div>
          )}

          {active === 'paiements' && (
            stripe?.configured ? (
              <div>
                <div className="jv-mt" style={{ marginTop: 0 }}>Stripe · encaissements réels</div>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontFamily: 'var(--font-mono)', fontSize: 13, marginBottom: 12 }}>
                  <div>Solde : <b style={{ color: '#eafcff' }}>{eur(stripe.solde || 0)}</b></div>
                  <div>Total encaissé : <b style={{ color: '#eafcff' }}>{eur(stripe.totalEncaisse || 0)}</b></div>
                  <div>Paiements : <b style={{ color: '#eafcff' }}>{stripe.nbPaiements || 0}</b></div>
                </div>
                {(stripe.transactions || []).length === 0 && <div className="hud-empty">Aucun paiement encore — dès qu&apos;un client paie par carte, ça apparaît ici en direct.</div>}
                {(stripe.transactions || []).map((t) => (
                  <div className="hud-row" key={t.id} style={{ cursor: 'default' }}>
                    <span className="who"><b>{t.desc || 'Paiement'}</b><span>Stripe</span></span>
                    <span className="amt">{eur(t.montant)}</span><span className="rt">il y a {relTime(t.at)}</span>
                  </div>
                ))}
              </div>
            ) : <div className="hud-empty">Stripe pas encore actif sur ce déploiement.</div>
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
              <p className="jv-note">Le branchement réel des paiements arrive avec la facturation — ici vous préparez déjà vos accès.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
