'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import { urlPlateforme } from '@/lib/urls'
import Info from '@/app/Info'
import CartePackPub from '@/app/pubs/CartePackPub'; import { actif } from '@/lib/flags'
import { peut } from '@/lib/plans'

type Artisan = { id: string; nom: string | null; metier: string | null; slug: string | null; domaine?: string | null; domaine_verifie?: boolean | null }
type Lead = { id: string; nom_prospect: string | null; contact: string | null; message: string | null; statut: string | null; created_at: string }
type Message = { lead_id: string; sens: string | null; type: string | null; contenu: string | null }

const STATUTS: { value: string; label: string; pill: string }[] = [
  { value: 'nouveau', label: 'Nouveau', pill: 'warn' },
  { value: 'repondu', label: 'Répondu', pill: 'info' },
  { value: 'gagne', label: 'Gagné 🎉', pill: 'ok' },
  { value: 'perdu', label: 'Perdu', pill: 'muted' },
]
// « devis » est posé par le serveur quand un devis est préparé pour la demande (lib/devisAuto.ts) :
// il s'affiche, mais ne se choisit pas dans la liste — l'artisan ne le pose pas à la main.
const AFFICHES = [...STATUTS, { value: 'devis', label: 'Devis préparé', pill: 'info' }]
const statutMeta = (v: string | null) => AFFICHES.find((s) => s.value === v) ?? { value: v ?? '', label: v ?? '—', pill: 'muted' }

function formatDate(iso: string) {
  try { return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return iso }
}
const initials = (n: string | null) => (n ? n.trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join('') : '?')

// Compteur animé (0 → valeur) au montage — donne vie aux KPI. Respecte reduced-motion.
function CountUp({ value }: { value: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || value <= 0) { setN(value > 0 ? value : 0); return }
    let raf = 0; const dur = 650; const t0 = performance.now()
    const tick = (t: number) => { const p = Math.min(1, (t - t0) / dur); setN(Math.round(value * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{n}</>
}

export default function Dashboard() {
  const router = useRouter()
  const [artisan, setArtisan] = useState<Artisan | null>(null)
  const [ready, setReady] = useState(false)
  const [copied, setCopied] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])
  const [replies, setReplies] = useState<Record<string, string>>({})
  const [open, setOpen] = useState<string | null>(null)
  // 15/10 (Benj) : la plateforme (lien de conversation, demandes, réponses de l'IA) commence avec Studio. Offre sans plateforme : tableau de bord réduit.
  const [plan, setPlan] = useState<string | null>(null)
  // Une lecture qui échoue se dit : « Aucune demande » sur une panne réseau était un mensonge (audit du 11/10).
  const [erreur, setErreur] = useState<string | null>(null)

  async function loadLeads(artisanId: string) {
    const { data: ls, error: eLeads } = await supabase.from('leads').select('id, nom_prospect, contact, message, statut, created_at').eq('artisan_id', artisanId).order('created_at', { ascending: false })
    if (eLeads) throw eLeads
    setLeads((ls as Lead[]) ?? [])
    // `.is('etat', null)` : une proposition en attente porte `etat: 'proposition'`, une proposition
    // refusée `etat: 'rejete'` — ni l'une ni l'autre n'est jamais partie chez le client. Sans ce
    // filtre, l'écran annonçait « Réponse envoyée » pour un message que l'artisan
    // avait lui-même rejeté : il croyait son prospect servi et ne rappelait pas.
    // `.order` : sans lui, « la première trouvée » n'était pas la dernière envoyée.
    const { data: ms } = await supabase.from('messages').select('lead_id, sens, type, contenu, sent_at')
      .eq('sens', 'out').eq('type', 'reponse_auto').is('etat', null)
      .order('sent_at', { ascending: false })
    const map: Record<string, string> = {}
    for (const m of (ms as Message[]) ?? []) if (m.lead_id && m.contenu && !map[m.lead_id]) map[m.lead_id] = m.contenu
    setReplies(map)
  }

  const charger = useCallback(async () => {
    setErreur(null)
    try {
      const { data } = await supabase.auth.getSession()
      if (!data.session) { router.replace('/login'); return }
      const { data: prof, error: eProf } = await supabase.from('artisans').select('id, nom, metier, slug, domaine, domaine_verifie, plan').eq('id', data.session.user.id).maybeSingle()
      if (eProf) throw eProf
      if (!prof) { router.replace('/onboarding'); return }
      setArtisan(prof as Artisan)
      const planCompte = ((prof as { plan?: string | null }).plan ?? null)
      setPlan(planCompte)
      if (peut(planCompte, 'plateforme.conversation')) await loadLeads((prof as Artisan).id)
    } catch {
      setErreur('Vos demandes n’ont pas pu être chargées. Vérifiez votre connexion, puis réessayez.')
    }
    setReady(true)
  }, [router])

  useEffect(() => { void charger() }, [charger])

  async function changeStatut(leadId: string, statut: string) {
    const avant = leads
    setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, statut } : l)))
    const { error } = await supabase.from('leads').update({ statut, updated_at: new Date().toISOString() }).eq('id', leadId)
    if (error) { setLeads(avant); setErreur('Le statut n’a pas été enregistré. Réessayez.') }
  }

  function copyLink() {
    if (!artisan?.slug) return
    navigator.clipboard?.writeText(urlPlateforme(artisan))
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const prenom = artisan?.nom ? artisan.nom.split(/\s+/)[0] : ''
  const link = artisan ? urlPlateforme(artisan) : ''
  const nouveaux = leads.filter((l) => l.statut === 'nouveau').length
  const gagnes = leads.filter((l) => l.statut === 'gagne').length
  const repondus = Object.keys(replies).length
  const sansPlateforme = ready && !peut(plan, 'plateforme.conversation')

  return (
    <AppShell active="dashboard" title={ready && prenom ? `Bonjour ${prenom}` : 'Tableau de bord'} crumb={artisan?.metier || 'Votre espace'}>
      {erreur && <div className="msg err" role="alert" style={{ display: 'flex', gap: '.8rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>{erreur}<button type="button" className="btn" style={{ width: 'auto', margin: 0 }} onClick={() => { setReady(false); void charger() }}>Réessayer</button></div>}
      {!ready ? (
        <p className="muted">Chargement…</p>
      ) : sansPlateforme ? (
        <>
          <div className="tool-card" data-sans-plateforme="1">
            <h2>Ce que fait votre offre</h2>
            <p className="muted" style={{ margin: '0 0 .8rem' }}>L’IA chiffre vos devis sur vos prix ; vous les relisez, les envoyez par e-mail et facturez, avec l’export Factur-X. Vos clients, vos tarifs et vos crédits sont dans votre espace.</p>
            <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
              <a className="btn btn--primary" style={{ width: 'auto' }} href="/devis">Nouveau devis</a>
              <a className="btn btn--ghost" style={{ width: 'auto' }} href="/factures">Factures</a>
              <a className="btn btn--ghost" style={{ width: 'auto' }} href="/tarifs">Mes tarifs</a>
            </div>
          </div>
          <div className="tool-card">
            <h2>La plateforme commence avec l’offre Studio</h2>
            <p className="muted" style={{ margin: '0 0 .8rem' }}>Votre page de conversation à votre marque, l’assistant qui répond à vos clients, leurs comptes et votre nom de domaine : tout cela se débloque avec Studio.</p>
            <a className="btn btn--primary" style={{ width: 'auto' }} href="/abonnement">Voir l’offre Studio</a>
          </div>
        </>
      ) : (
        <>
          <section className="psh-kpis">
            <div className="psh-kpi">
              <div className="lab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>Demandes reçues</div>
              <div className="val tnum"><CountUp value={leads.length} /></div>
              <div className="sub">au total</div>
            </div>
            <div className="psh-kpi">
              <div className="lab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9" /><path d="M12 8v4l2 2" /></svg>À traiter</div>
              <div className="val tnum"><CountUp value={nouveaux} /></div>
              <div className="sub">{nouveaux > 0 ? <span className="pill warn"><span className="pdot" />à répondre</span> : 'tout est à jour'}</div>
            </div>
            <div className="psh-kpi">
              <div className="lab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m5 12 4 4L19 6" /></svg>Chantiers gagnés</div>
              <div className="val tnum"><CountUp value={gagnes} /></div>
              <div className="sub">signés via Presti</div>
            </div>
            <div className="psh-kpi">
              <div className="lab"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M13 2 3 14h7l-1 8 10-12h-7z" /></svg>Réponses IA</div>
              <div className="val tnum"><CountUp value={repondus} /></div>
              <div className="sub">envoyées à vos clients</div>
            </div>
          </section>

          <div className="tool-card">
            <h2>Votre lien de contact</h2>
            <p className="muted" style={{ margin: '0 0 .6rem' }}>À mettre sur votre fiche Google, votre page Facebook, votre signature mail (pas dans une annonce Le Bon Coin : ses règles interdisent les liens vers un autre site). Chaque demande faite par ce lien arrive dans Presti. La réponse est prête en moins d’une minute : Presti la prépare dans votre ton, vous l’envoyez.</p>
            <div className="linkbox">
              <span className="linkbox-url">{link}</span>
              <button type="button" className="linkbox-btn" onClick={copyLink}>{copied ? '✓ Copié' : 'Copier'}</button>
            </div>
          </div>

          {actif('packPubVente') && <CartePackPub />}
          <div className="psh-panel">
            <header>
              <h2>Vos demandes</h2>
              {nouveaux > 0 && <span className="tag"><span className="pill warn"><span className="pdot" />{nouveaux} nouvelle{nouveaux > 1 ? 's' : ''}</span></span>}
            </header>

            {leads.length === 0 && !erreur && (
              <div className="psh-empty">Aucune demande pour l’instant. Dès qu’un client remplira votre lien, elle apparaîtra ici.</div>
            )}

            {leads.map((l) => {
              const meta = statutMeta(l.statut)
              const isOpen = open === l.id
              const isMail = typeof l.contact === 'string' && l.contact.includes('@')
              return (
                <div key={l.id} className={`psh-item lead${isOpen ? ' ouvert' : ''}`} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '.5rem' }}>
                  <div className="lead-ligne">
                    <span className="psh-iava">{initials(l.nom_prospect)}</span>
                    <div className="lead-corps">
                      <div className="lead-tete">
                        <b>{l.nom_prospect || 'Client'}</b>
                        <span className="lead-date">{formatDate(l.created_at)}</span>
                      </div>
                      <div className="lead-contact">
                        {isMail
                          ? <a href={`mailto:${l.contact}`}>{l.contact}</a>
                          : <a href={`tel:${l.contact}`}>{l.contact}</a>}
                      </div>
                      {l.message && !isOpen ? <p className="lead-apercu">{l.message}</p> : null}
                    </div>
                    <div className="lead-cote">
                      <span className={`pill ${meta.pill}`}><span className="pdot" />{meta.label}</span>
                      <button type="button" className="lead-voir" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : l.id)}>
                        {isOpen ? 'Masquer' : 'Détail'}
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div style={{ borderTop: '1px solid var(--line)', paddingTop: '.7rem' }}>
                      <p style={{ margin: '0 0 .3rem', fontSize: '.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Sa demande</p>
                      <p style={{ margin: '0 0 .9rem', whiteSpace: 'pre-wrap' }}>{l.message || <span className="muted">(aucun message)</span>}</p>
                      <p style={{ margin: '0 0 .3rem', fontSize: '.78rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Réponse envoyée</p>
                      {replies[l.id]
                        ? <p style={{ margin: '0 0 .9rem', whiteSpace: 'pre-wrap', background: 'var(--accent-tint)', border: '1px solid var(--accent-tint-2)', borderRadius: 10, padding: '.7rem' }}>{replies[l.id]}</p>
                        : <p className="muted" style={{ margin: '0 0 .9rem' }}>Pas encore de réponse envoyée pour cette demande.</p>}
                      <label style={{ fontSize: '.8rem' }}>Statut <Info cle="dashboard.statut" /></label>
                      <select value={l.statut ?? 'nouveau'} onChange={(e) => changeStatut(l.id, e.target.value)} style={{ maxWidth: '16rem' }}>
                        {STATUTS.some((s) => s.value === (l.statut ?? 'nouveau')) ? null : <option value={l.statut ?? ''} disabled>{meta.label}</option>}
                        {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}
    </AppShell>
  )
}
