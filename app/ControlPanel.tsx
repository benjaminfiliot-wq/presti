'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Ban = { ip: string; raison: string | null; auto: boolean; created_at: string; expires_le: string | null; actif: boolean }
type Abus = { ip: string; count: number; raison: string; dernier: string }
type Health = { agent: string; at: string; items: { k: string; ok: boolean | 'warn'; v: string }[] }

async function tok() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

// Coentreprise : 4 catégories × 3 agents (+ IA transverse). Les agents « côté serveur »
// (bilan en direct) sont runnable ; ceux qui lisent le dépôt tournent en session dev.
const CATS: { cat: string; agents: { key: string; nom: string; desc: string; runnable: boolean }[] }[] = [
  { cat: 'Audit', agents: [
    { key: 'auditeur', nom: 'Auditeur', desc: 'Vue d\'ensemble sécu & qualité', runnable: false },
    { key: 'audit-attaque', nom: 'Audit offensif', desc: 'Pentest — rejoue les exploits', runnable: false },
    { key: 'audit-conformite', nom: 'Conformité', desc: 'RGPD + légal devis/facture', runnable: false },
  ] },
  { cat: 'Animation', agents: [
    { key: 'animateur', nom: 'Animateur', desc: 'Motion craft (Apple/Emil)', runnable: false },
    { key: 'anim-accessibilite', nom: 'Accessibilité', desc: 'a11y, contraste, perf', runnable: false },
    { key: 'anim-marque', nom: 'Direction artistique', desc: 'White-label + accent', runnable: false },
  ] },
  { cat: 'Gestion', agents: [
    { key: 'gestion', nom: 'Gestion', desc: 'Bilan santé (site, base, bans, emails)', runnable: true },
    { key: 'gestion-donnees', nom: 'Données', desc: 'Tunnel & métriques', runnable: true },
    { key: 'gestion-fiabilite', nom: 'Fiabilité', desc: 'Coûts IA, quotas, robustesse', runnable: false },
  ] },
  { cat: 'Mails', agents: [
    { key: 'mails', nom: 'Mails', desc: 'Qualité sortante', runnable: false },
    { key: 'mails-delivrabilite', nom: 'Délivrabilité', desc: 'Resend, DNS, anti-spam', runnable: true },
    { key: 'mails-cycle', nom: 'Cycle & copy', desc: 'Séquences, relances, ton FR', runnable: false },
  ] },
]
const NB_AGENTS = CATS.reduce((n, c) => n + c.agents.length, 0)

export default function ControlPanel() {
  const [bans, setBans] = useState<Ban[]>([])
  const [abus, setAbus] = useState<Abus[]>([])
  const [banIp, setBanIp] = useState('')
  const [banRaison, setBanRaison] = useState('')
  const [health, setHealth] = useState<Health | null>(null)
  const [running, setRunning] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const t = await tok(); if (!t) return
    const r = await fetch('/api/control/security', { headers: { Authorization: `Bearer ${t}` } })
    if (r.ok) { const d = await r.json(); setBans(d.bans ?? []); setAbus(d.abus24h ?? []) }
  }, [])

  useEffect(() => { load() }, [load])

  async function banner(ip: string, raison: string, dureeH?: number) {
    if (!ip.trim()) return
    setBusy(true)
    const t = await tok()
    await fetch('/api/control/security', { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ip: ip.trim(), raison, dureeH }) })
    setBanIp(''); setBanRaison(''); await load(); setBusy(false)
  }
  async function debannir(ip: string) {
    setBusy(true)
    const t = await tok()
    await fetch('/api/control/security', { method: 'DELETE', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ ip }) })
    await load(); setBusy(false)
  }
  async function runAgent(key: string) {
    setRunning(key); setHealth(null)
    const t = await tok()
    const r = await fetch('/api/control/agents', { method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ agent: key }) })
    if (r.ok) setHealth(await r.json())
    setRunning(null)
  }

  const dot = (ok: boolean | 'warn') => (ok === true ? 'ok' : ok === 'warn' ? 'warn' : 'crit')

  return (
    <div className="cp">
      {/* ===== SÉCURITÉ ===== */}
      <section className="cp-card">
        <h3 className="cp-h">SÉCURITÉ · BANNISSEMENT D&apos;IP <span className="cp-tag">{bans.filter((b) => b.actif).length} actifs</span></h3>

        <div className="cp-form">
          <input placeholder="IP à bannir (ex. 1.2.3.4)" value={banIp} onChange={(e) => setBanIp(e.target.value)} />
          <input placeholder="Raison (optionnel)" value={banRaison} onChange={(e) => setBanRaison(e.target.value)} />
          <button disabled={busy || !banIp.trim()} onClick={() => banner(banIp, banRaison || 'Ban manuel', undefined)}>Bannir (permanent)</button>
        </div>

        {abus.length > 0 && (
          <>
            <div className="cp-sub">Abus détectés (24h) — clique pour bannir</div>
            <div className="cp-rows">
              {abus.map((a) => (
                <div className="cp-row" key={a.ip}>
                  <span className="cp-ip">{a.ip}</span>
                  <span className="cp-mut">{a.count}× · {a.raison}</span>
                  <button className="cp-mini" disabled={busy} onClick={() => banner(a.ip, `Abus : ${a.raison}`, 24)}>Bannir 24h</button>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="cp-sub">IP bannies</div>
        {bans.length === 0 ? <div className="cp-empty">Aucune IP bannie. 🛡️</div> : (
          <div className="cp-rows">
            {bans.map((b) => (
              <div className={`cp-row${b.actif ? '' : ' off'}`} key={b.ip}>
                <span className="cp-ip">{b.ip}</span>
                <span className="cp-mut">{b.auto ? 'AUTO' : 'manuel'} · {b.raison || '—'}{b.expires_le ? ` · exp. ${new Date(b.expires_le).toLocaleString('fr-FR')}` : ' · permanent'}</span>
                <button className="cp-mini danger" disabled={busy} onClick={() => debannir(b.ip)}>Débannir</button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ===== AGENTS ===== */}
      <section className="cp-card">
        <h3 className="cp-h">COENTREPRISE D&apos;AGENTS <span className="cp-tag">{NB_AGENTS} agents · 4 pôles</span></h3>
        <p className="cp-note">Mémoire de domaine partagée + journal d&apos;apprentissage par pôle (voir <code>.claude/agents/knowledge</code>). Les agents « en direct » tournent côté serveur ; les autres lisent le dépôt (session dev).</p>
        {CATS.map((c) => (
          <div key={c.cat}>
            <div className="cp-sub">{c.cat}</div>
            <div className="cp-agents">
              {c.agents.map((a) => (
                <div className="cp-agent" key={a.key}>
                  <div><b>{a.nom}</b><span>{a.desc}</span></div>
                  {a.runnable
                    ? <button disabled={!!running} onClick={() => runAgent(a.key)}>{running === a.key ? '…' : 'Lancer'}</button>
                    : <span className="cp-badge">session dev</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
        {health && (
          <div className="cp-health">
            <div className="cp-sub">Bilan « {health.agent} » · {new Date(health.at).toLocaleTimeString('fr-FR')}</div>
            {health.items.map((it, i) => (
              <div className="cp-hrow" key={i}><span className={`cp-d ${dot(it.ok)}`} /><span className="cp-hk">{it.k}</span><span className="cp-hv">{it.v}</span></div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
