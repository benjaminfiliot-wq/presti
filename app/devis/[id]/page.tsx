'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { computeTotals } from '@/lib/devisTotals'
import AppShell from '@/app/AppShell'
import ModelSelect from '@/app/ModelSelect'
import LogoUpload from '@/app/LogoUpload'
import type { Tier } from '@/lib/models'
import { mentionFranchise, type BaseMention } from '@/lib/facturation'

type Ligne = { key: string; designation: string; quantite: string; unite: string; prix_unitaire_ht: string; tva_taux: number }

const k = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const emptyLigne = (): Ligne => ({ key: k(), designation: '', quantite: '1', unite: 'u', prix_unitaire_ht: '0', tva_taux: 10 })
const eur = (n: number) => `${(Number.isFinite(n) ? n : 0).toFixed(2).replace('.', ',')} €`
const dateFr = (d: Date) => d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })

export default function DevisEditor() {
  const router = useRouter()
  const params = useParams()
  const rawId = String(params?.id ?? 'nouveau')
  const isNew = rawId === 'nouveau'

  const [ready, setReady] = useState(false)
  const [uid, setUid] = useState('')
  const [savedId, setSavedId] = useState<string | null>(isNew ? null : rawId)
  const [numero, setNumero] = useState<string | null>(null)
  const [statut, setStatut] = useState('brouillon')
  const [plan, setPlan] = useState('gratuit')
  const [tier, setTier] = useState<Tier>('standard')

  // artisan / entreprise
  const [entNom, setEntNom] = useState('')
  const [metier, setMetier] = useState('')
  const [siret, setSiret] = useState('')
  const [forme, setForme] = useState('')
  const [entAdresse, setEntAdresse] = useState('')
  const [assNom, setAssNom] = useState('')
  const [assContrat, setAssContrat] = useState('')
  const [assActivites, setAssActivites] = useState('')
  const [assZone, setAssZone] = useState('')
  const [iban, setIban] = useState('')
  const [condPaiement, setCondPaiement] = useState('')
  const [tvaRegime, setTvaRegime] = useState('franchise')
  // La référence légale de la mention de franchise suit la date et le choix de l'artisan
  // (recodification CGI → CIBS au 01/09/2026, tolérance jusqu'au 31/12/2027).
  const [mentionBase, setMentionBase] = useState<BaseMention>('auto')
  const mentionTva = mentionFranchise(mentionBase)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [savingInfos, setSavingInfos] = useState(false)
  const [infosMsg, setInfosMsg] = useState('')

  // client / devis
  const [clientNom, setClientNom] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientAdresse, setClientAdresse] = useState('')
  const [objet, setObjet] = useState('')
  const [validite, setValidite] = useState('90')
  const [remise, setRemise] = useState('0')
  const [acompte, setAcompte] = useState('30')

  const [description, setDescription] = useState('')
  const [lignes, setLignes] = useState<Ligne[]>([emptyLigne()])
  const [aiNote, setAiNote] = useState('')

  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const id = data.session.user.id
      setUid(id)
      const { data: a } = await supabase.from('artisans').select('*').eq('id', id).maybeSingle()
      if (!a) { router.replace('/onboarding'); return }
      setEntNom(a.nom ?? ''); setMetier(a.metier ?? ''); setSiret(a.siret ?? ''); setForme(a.forme_juridique ?? '')
      setEntAdresse([a.adresse, a.code_postal, a.ville].filter(Boolean).join(', '))
      setAssNom(a.assurance_nom ?? ''); setAssContrat(a.assurance_contrat ?? ''); setAssActivites(a.assurance_activites ?? ''); setAssZone(a.assurance_zone ?? '')
      setIban(a.iban ?? ''); setCondPaiement(a.conditions_paiement ?? ''); setTvaRegime(a.tva_regime ?? 'franchise'); setMentionBase((a.mention_tva_base as BaseMention) ?? 'auto'); setPlan(a.plan ?? 'gratuit'); setLogoUrl(a.logo_url ?? null)

      if (!isNew) {
        const { data: d } = await supabase.from('devis').select('*').eq('id', rawId).maybeSingle()
        if (d) {
          setNumero(d.numero); setStatut(d.statut ?? 'brouillon')
          setClientNom(d.client_nom ?? ''); setClientEmail(d.client_email ?? ''); setClientAdresse(d.client_adresse ?? '')
          setObjet(d.objet ?? ''); setValidite(String(d.validite_jours ?? 90)); setRemise(String(d.remise_pct ?? 0)); setAcompte(String(d.acompte_pct ?? 0))
          const { data: ls } = await supabase.from('devis_lignes').select('*').eq('devis_id', rawId).order('ordre')
          if (ls && ls.length) setLignes(ls.map((l) => ({ key: k(), designation: l.designation ?? '', quantite: String(l.quantite ?? 1), unite: l.unite ?? 'u', prix_unitaire_ht: String(l.prix_unitaire_ht ?? 0), tva_taux: Number(l.tva_taux) || 20 })))
        }
      }

      // Pré-remplissage depuis une conversation (bouton « Créer un devis » de la boîte de réception).
      if (isNew && typeof window !== 'undefined') {
        const leadId = new URLSearchParams(window.location.search).get('lead')
        if (leadId) {
          const { data: lead } = await supabase.from('leads').select('nom_prospect, contact, message').eq('id', leadId).maybeSingle()
          if (lead) {
            setClientNom(lead.nom_prospect ?? '')
            if (lead.contact && lead.contact.includes('@')) setClientEmail(lead.contact)
            const { data: ms } = await supabase.from('messages').select('sens, contenu, sent_at').eq('lead_id', leadId).order('sent_at')
            const dits = (ms ?? []).filter((m) => m.sens === 'in').map((m) => (m.contenu ?? '').trim()).filter(Boolean)
            const desc = dits.length ? dits.join('\n') : (lead.message ?? '')
            if (desc) setDescription(desc)
          }
        }
      }
      setReady(true)
    })
  }, [router, isNew, rawId])

  function setLigne(key: string, patch: Partial<Ligne>) {
    setLignes((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  async function saveInfos() {
    setSavingInfos(true); setInfosMsg('')
    const [adr, cp, ville] = (() => {
      const parts = entAdresse.split(',').map((s) => s.trim())
      return [parts[0] ?? '', parts[1] ?? '', parts.slice(2).join(', ')]
    })()
    await supabase.from('artisans').update({
      siret, forme_juridique: forme, adresse: adr, code_postal: cp, ville,
      assurance_nom: assNom, assurance_contrat: assContrat, assurance_activites: assActivites, assurance_zone: assZone,
      iban, conditions_paiement: condPaiement, tva_regime: tvaRegime,
    }).eq('id', uid)
    setSavingInfos(false); setInfosMsg('Enregistré ✅')
    setTimeout(() => setInfosMsg(''), 2500)
  }

  async function chiffrerIA() {
    if (!description.trim()) { setMsg({ type: 'err', text: 'Décris le chantier pour que l\'IA le chiffre.' }); return }
    setGenerating(true); setMsg(null); setAiNote('')
    const { data } = await supabase.auth.getSession()
    const res = await fetch('/api/devis/generer', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` }, body: JSON.stringify({ description, model: tier }) })
    setGenerating(false)
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'Erreur de génération.' }); return }
    const nouvelles: Ligne[] = (d.lignes ?? []).map((l: { designation: string; quantite: number; unite: string; prix_unitaire_ht: number; tva_taux: number }) => ({ key: k(), designation: l.designation, quantite: String(l.quantite), unite: l.unite, prix_unitaire_ht: String(l.prix_unitaire_ht), tva_taux: Number(l.tva_taux) || 10 }))
    setLignes((prev) => [...prev.filter((l) => l.designation.trim() || Number(l.prix_unitaire_ht) > 0), ...nouvelles])
    if (d.note) setAiNote(d.note)
  }

  async function save(newStatut?: string) {
    setSaving(true); setMsg(null)
    const payload = {
      objet, client_nom: clientNom, client_email: clientEmail, client_adresse: clientAdresse,
      validite_jours: Number(validite) || 90, remise_pct: Number(remise) || 0, acompte_pct: Number(acompte) || 0,
      statut: newStatut ?? statut,
      lignes: lignes.filter((l) => l.designation.trim()).map((l) => ({ designation: l.designation, quantite: Number(l.quantite) || 0, unite: l.unite, prix_unitaire_ht: Number(l.prix_unitaire_ht) || 0, tva_taux: l.tva_taux })),
    }
    const { data } = await supabase.auth.getSession()
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` }
    if (!savedId) {
      const res = await fetch('/api/devis', { method: 'POST', headers, body: JSON.stringify(payload) })
      const d = await res.json().catch(() => ({})); setSaving(false)
      if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'Erreur.' }); return }
      setSavedId(d.id); setNumero(d.numero); router.replace(`/devis/${d.id}`)
      setMsg({ type: 'ok', text: `Devis ${d.numero} enregistré ✅` })
    } else {
      const res = await fetch(`/api/devis/${savedId}`, { method: 'POST', headers, body: JSON.stringify(payload) })
      const d = await res.json().catch(() => ({})); setSaving(false)
      if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'Erreur.' }); return }
      if (newStatut) setStatut(newStatut)
      setMsg({ type: 'ok', text: 'Devis enregistré ✅' })
    }
  }

  async function downloadPdf() {
    if (!savedId) { setMsg({ type: 'err', text: 'Enregistre le devis avant de télécharger le PDF.' }); return }
    const win = window.open('', '_blank') // dans le geste utilisateur (anti-blocage, mobile)
    const { data } = await supabase.auth.getSession()
    const res = await fetch(`/api/devis/${savedId}/pdf`, { headers: { Authorization: `Bearer ${data.session?.access_token}` } })
    if (!res.ok) { win?.close(); setMsg({ type: 'err', text: 'PDF indisponible, réessaie.' }); return }
    const url = URL.createObjectURL(await res.blob())
    if (win) win.location.href = url
    else { const a = document.createElement('a'); a.href = url; a.download = `${numero || 'devis'}.pdf`; a.click() }
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  async function envoyer() {
    if (!savedId) { setMsg({ type: 'err', text: 'Enregistre le devis avant de l\'envoyer.' }); return }
    if (!clientEmail.trim()) { setMsg({ type: 'err', text: 'Renseigne l\'email du client pour l\'envoyer.' }); return }
    setSaving(true); setMsg(null)
    const { data } = await supabase.auth.getSession()
    const res = await fetch(`/api/devis/${savedId}/envoyer`, { method: 'POST', headers: { Authorization: `Bearer ${data.session?.access_token}` } })
    const d = await res.json().catch(() => ({})); setSaving(false)
    if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'Envoi échoué.' }); return }
    setStatut('envoye'); setMsg({ type: 'ok', text: 'Devis envoyé au client ✅' })
  }

  async function creerFacture() {
    if (!savedId) { setMsg({ type: 'err', text: 'Enregistre le devis avant de créer la facture.' }); return }
    setSaving(true); setMsg(null)
    const { data } = await supabase.auth.getSession()
    const res = await fetch('/api/factures', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` }, body: JSON.stringify({ devis_id: savedId }) })
    const d = await res.json().catch(() => ({})); setSaving(false)
    if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'Création de la facture échouée.' }); return }
    router.push('/factures')
  }

  function recommencer() {
    if (!confirm('Effacer toutes les lignes et recommencer le chiffrage ?')) return
    setLignes([emptyLigne()]); setAiNote(''); setMsg(null)
  }

  async function supprimerDevis() {
    if (!savedId) { router.push('/devis'); return }
    if (!confirm('Supprimer définitivement ce devis ?')) return
    const { data } = await supabase.auth.getSession()
    const res = await fetch(`/api/devis/${savedId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${data.session?.access_token}` } })
    if (res.ok) router.push('/devis')
    else setMsg({ type: 'err', text: 'Suppression impossible.' })
  }

  const lignesPleines = lignes.filter((l) => l.designation.trim())
  const totals = computeTotals(lignes.map((l) => ({ quantite: Number(l.quantite) || 0, prix_unitaire_ht: Number(l.prix_unitaire_ht) || 0, tva_taux: l.tva_taux })), Number(remise) || 0)
  const totalBrut = lignes.reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(l.prix_unitaire_ht) || 0), 0)
  const remiseMontant = totalBrut - (totals.total_ht)
  const acompteMontant = (totals.total_ttc * (Number(acompte) || 0)) / 100
  const today = new Date()
  const validiteDate = new Date(today.getTime() + (Number(validite) || 90) * 86400000)

  if (!ready) return <AppShell active="devis" title="Devis" crumb="Chargement…"><p className="muted">Chargement…</p></AppShell>

  const actions = (
    <>
      <button className="psh-btn ghost" onClick={downloadPdf}>Télécharger PDF</button>
      <button className="psh-btn ghost" onClick={envoyer}>Envoyer au client</button>
      <button className="psh-btn ghost" onClick={creerFacture}>Créer la facture</button>
      {savedId && <button className="psh-btn ghost danger" onClick={supprimerDevis}>Supprimer</button>}
      <button className="psh-btn primary" disabled={saving} onClick={() => save()}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
    </>
  )

  return (
    <AppShell active="devis" title={numero ? numero : 'Nouveau devis'} crumb={savedId ? 'Devis · enregistré' : 'Devis · brouillon'} actions={actions} wide>
      {msg && <div className={`msg ${msg.type === 'err' ? 'err' : ''}`} style={{ marginTop: 0, marginBottom: '1.1rem' }}>{msg.text}</div>}

      <div className="editor">
          {/* ---------------- FORM (gauche) ---------------- */}
          <div className="editor-form">
            <div className="tool-card">
              <h2>Client</h2>
              <div className="grid2">
                <div><label>Nom du client</label><input value={clientNom} onChange={(e) => setClientNom(e.target.value)} placeholder="Marie Dupont" /></div>
                <div><label>Email</label><input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="marie@email.fr" /></div>
              </div>
              <label>Adresse du chantier</label>
              <input value={clientAdresse} onChange={(e) => setClientAdresse(e.target.value)} placeholder="12 rue des Lilas, 75011 Paris" />
              <label>Objet du devis</label>
              <input value={objet} onChange={(e) => setObjet(e.target.value)} placeholder="Rénovation électrique appartement" />
            </div>

            <div className="tool-card">
              <h2>Chiffrer avec l&apos;IA</h2>
              <p className="muted" style={{ margin: '0 0 .6rem' }}>Décrivez le chantier — Presti propose les lignes, vous ajustez.</p>
              <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex : remplacement du tableau, 12 prises, 6 points lumineux, mise aux normes d'un 3 pièces" />
              <div style={{ marginTop: '.7rem' }}><ModelSelect plan={plan} value={tier} onChange={setTier} /></div>
              <button disabled={generating} onClick={chiffrerIA}>{generating ? 'Presti chiffre…' : '⚡ Chiffrer avec l\'IA'}</button>
              {aiNote && <div className="ai-note"><strong>Note de Presti :</strong> {aiNote}</div>}
            </div>

            <div className="tool-card">
              <h2>Lignes</h2>
              {lignes.map((l) => (
                <div className="eline" key={l.key}>
                  <input className="desig" value={l.designation} onChange={(e) => setLigne(l.key, { designation: e.target.value })} placeholder="Désignation de la prestation" />
                  <div className="lrow">
                    <input className="q" inputMode="decimal" value={l.quantite} onChange={(e) => setLigne(l.key, { quantite: e.target.value })} title="Quantité" />
                    <input className="u" list="unites" value={l.unite} onChange={(e) => setLigne(l.key, { unite: e.target.value })} title="Unité" />
                    <input className="pu" inputMode="decimal" value={l.prix_unitaire_ht} onChange={(e) => setLigne(l.key, { prix_unitaire_ht: e.target.value })} title="Prix unitaire HT" />
                    <select className="tv" value={l.tva_taux} onChange={(e) => setLigne(l.key, { tva_taux: Number(e.target.value) })} title="TVA">
                      <option value={20}>20%</option><option value={10}>10%</option><option value={5.5}>5,5%</option>
                    </select>
                    <span className="lt">{eur((Number(l.quantite) || 0) * (Number(l.prix_unitaire_ht) || 0))}</span>
                    <button className="del" onClick={() => setLignes((prev) => prev.filter((x) => x.key !== l.key))} title="Supprimer">✕</button>
                  </div>
                </div>
              ))}
              <datalist id="unites"><option value="u" /><option value="ml" /><option value="m²" /><option value="m³" /><option value="h" /><option value="forfait" /><option value="ens." /></datalist>
              <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginTop: '.9rem' }}>
                <button className="btn btn--ghost" style={{ width: 'auto' }} onClick={() => setLignes((prev) => [...prev, emptyLigne()])}>+ Ajouter une ligne</button>
                <button className="btn btn--ghost danger" style={{ width: 'auto' }} onClick={recommencer}>Tout effacer &amp; recommencer</button>
              </div>
            </div>

            <div className="tool-card">
              <h2>Paramètres</h2>
              <div className="grid2">
                <div><label>Validité (jours)</label><input inputMode="numeric" value={validite} onChange={(e) => setValidite(e.target.value)} /></div>
                <div><label>Remise globale (%)</label><input inputMode="decimal" value={remise} onChange={(e) => setRemise(e.target.value)} /></div>
                <div><label>Acompte (%)</label><input inputMode="decimal" value={acompte} onChange={(e) => setAcompte(e.target.value)} /></div>
                <div><label>Statut</label>
                  <select value={statut} onChange={(e) => setStatut(e.target.value)}>
                    <option value="brouillon">Brouillon</option><option value="envoye">Envoyé</option><option value="accepte">Accepté</option><option value="refuse">Refusé</option><option value="expire">Expiré</option>
                  </select>
                </div>
              </div>
            </div>

            <details className="collapse">
              <summary>Vos informations (entreprise & assurance)</summary>
              <div className="collapse-body">
                <p className="muted" style={{ marginTop: 0 }}>Remplies une fois, reprises sur tous vos devis pour la conformité légale.</p>
                <div className="grid2">
                  <div><label>SIRET</label><input value={siret} onChange={(e) => setSiret(e.target.value)} placeholder="123 456 789 00012" /></div>
                  <div><label>Forme juridique</label><input value={forme} onChange={(e) => setForme(e.target.value)} placeholder="Micro-entreprise" /></div>
                </div>
                <label>Adresse de l&apos;entreprise</label>
                <input value={entAdresse} onChange={(e) => setEntAdresse(e.target.value)} placeholder="3 rue du Marché, 75011, Paris" />
                <label>Régime de TVA</label>
                <select value={tvaRegime} onChange={(e) => setTvaRegime(e.target.value)}>
                  <option value="franchise">Franchise en base (pas de TVA facturée)</option>
                  <option value="reel">Assujetti à la TVA</option>
                </select>
                <div style={{ marginTop: '.6rem', borderTop: '1px solid var(--line)', paddingTop: '.6rem' }}>
                  <div className="mini-label">Assurance décennale (obligatoire sur les devis)</div>
                  <div className="grid2">
                    <div><label>Assureur</label><input value={assNom} onChange={(e) => setAssNom(e.target.value)} placeholder="Ex : MAAF Pro" /></div>
                    <div><label>N° de contrat</label><input value={assContrat} onChange={(e) => setAssContrat(e.target.value)} placeholder="Ex : 123456789" /></div>
                    <div><label>Activités garanties</label><input value={assActivites} onChange={(e) => setAssActivites(e.target.value)} placeholder="Ex : électricité" /></div>
                    <div><label>Zone géographique</label><input value={assZone} onChange={(e) => setAssZone(e.target.value)} placeholder="Ex : France métropolitaine" /></div>
                  </div>
                </div>
                <div style={{ marginTop: '.4rem' }}>
                  <label>Logo de l&apos;entreprise</label>
                  {uid && <LogoUpload uid={uid} value={logoUrl} onChange={setLogoUrl} />}
                </div>
                <div className="grid2" style={{ marginTop: '.4rem' }}>
                  <div><label>IBAN (pour le règlement)</label><input value={iban} onChange={(e) => setIban(e.target.value)} placeholder="FR76 …" /></div>
                  <div><label>Conditions de paiement</label><input value={condPaiement} onChange={(e) => setCondPaiement(e.target.value)} placeholder="Acompte 30%, solde à la fin" /></div>
                </div>
                <button className="btn btn--ghost" style={{ width: 'auto', marginTop: '.9rem' }} disabled={savingInfos} onClick={saveInfos}>{savingInfos ? 'Enregistrement…' : 'Enregistrer mes informations'}</button>
                {infosMsg && <span className="muted" style={{ marginLeft: '.7rem' }}>{infosMsg}</span>}
              </div>
            </details>
          </div>

          {/* ---------------- APERÇU LIVE (droite) ---------------- */}
          <div className="preview-wrap blueprint">
            <div className="live-flag"><span className="b" />Aperçu en direct — conforme</div>
            <div className="doc">
              <div className="doc-head">
                <div className="doc-brand">
                  {logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img className="doc-logo" src={logoUrl} alt="" />
                  )}
                  <div>
                  <div className="doc-artisan-nom">{entNom || 'Votre entreprise'}</div>
                  <div className="doc-artisan-sub">
                    {metier}{forme ? ` · ${forme}` : ''}<br />
                    {entAdresse || <span className="doc-todo">Adresse à compléter</span>}<br />
                    {siret ? `SIRET ${siret}` : <span className="doc-todo">SIRET à compléter</span>}
                  </div>
                  </div>
                </div>
                <div className="doc-meta">
                  <div className="doc-title">DEVIS</div>
                  <div className="doc-meta-line">{numero || 'N° à l\'enregistrement'}</div>
                  <div className="doc-meta-line">Le {dateFr(today)}</div>
                  <div className="doc-meta-line">Valable jusqu&apos;au {dateFr(validiteDate)}</div>
                </div>
              </div>

              <div className="doc-grid">
                <div style={{ maxWidth: '55%' }}>
                  <div className="doc-label">Adressé à</div>
                  <div className="doc-block">
                    <strong>{clientNom || 'Client'}</strong><br />
                    {clientAdresse || <span className="doc-todo">Adresse du chantier</span>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', maxWidth: '45%' }}>
                  <div className="doc-label">Objet</div>
                  <div className="doc-block">{objet || <span className="doc-todo">Objet du devis</span>}</div>
                </div>
              </div>

              <table className="doc-table">
                <thead>
                  <tr><th>Désignation</th><th className="num">Qté</th><th className="num">PU HT</th><th className="num">TVA</th><th className="num">Total HT</th></tr>
                </thead>
                <tbody>
                  {lignesPleines.length === 0 && <tr><td className="empty" colSpan={5}>Vos lignes apparaîtront ici au fur et à mesure.</td></tr>}
                  {lignesPleines.map((l) => (
                    <tr key={l.key}>
                      <td>{l.designation}</td>
                      <td className="num">{(Number(l.quantite) || 0).toLocaleString('fr-FR')} {l.unite}</td>
                      <td className="num">{eur(Number(l.prix_unitaire_ht) || 0)}</td>
                      <td className="num">{String(l.tva_taux).replace('.', ',')}%</td>
                      <td className="num">{eur((Number(l.quantite) || 0) * (Number(l.prix_unitaire_ht) || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="doc-totals">
                {remiseMontant > 0.001 && <div className="doc-tot-row"><span className="l">Sous-total HT</span><span>{eur(totalBrut)}</span></div>}
                {remiseMontant > 0.001 && <div className="doc-tot-row"><span className="l">Remise {remise}%</span><span>− {eur(remiseMontant)}</span></div>}
                <div className="doc-tot-row"><span className="l">Total HT</span><span>{eur(totals.total_ht)}</span></div>
                {Object.entries(totals.tva_par_taux).map(([taux, mt]) => (
                  <div className="doc-tot-row" key={taux}><span className="l">TVA {taux.replace('.', ',')}%</span><span>{eur(mt)}</span></div>
                ))}
                <div className="doc-tot-row grand"><span className="l">Total TTC</span><span>{eur(totals.total_ttc)}</span></div>
                {Number(acompte) > 0 && <div className="doc-tot-row acompte"><span className="l">Acompte {acompte}% à la commande</span><span>{eur(acompteMontant)}</span></div>}
              </div>

              <div className="doc-sign">
                <div className="doc-sign-box">
                  Bon pour accord — le client précède sa signature de la mention manuscrite<br /><strong>« Devis reçu avant l&apos;exécution des travaux »</strong>.<br />Date et signature :
                </div>
              </div>

              <div className="doc-legal">
                <div className="l-title">Mentions</div>
                <p style={{ margin: '0 0 .35rem' }}>Devis gratuit, valable {validite} jours à compter du {dateFr(today)}.{condPaiement ? ` Conditions de paiement : ${condPaiement}.` : ''}{iban ? ` Règlement par virement — IBAN ${iban}.` : ''}</p>
                {tvaRegime === 'franchise' && <p style={{ margin: '0 0 .35rem' }}>{mentionTva}</p>}
                <p style={{ margin: 0 }}>
                  <strong>Assurance professionnelle</strong> :{' '}
                  {assNom ? `${assNom}, contrat n° ${assContrat || '—'}${assActivites ? `, ${assActivites}` : ''}${assZone ? `, ${assZone}` : ''}.` : <span className="doc-todo">à renseigner dans « Vos informations » (obligatoire).</span>}
                </p>
              </div>
            </div>
          </div>
        </div>
    </AppShell>
  )
}
