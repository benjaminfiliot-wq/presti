'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { computeTotals } from '@/lib/devisTotals'

type Ligne = { key: string; designation: string; quantite: string; unite: string; prix_unitaire_ht: string; tva_taux: number }

const k = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
const emptyLigne = (): Ligne => ({ key: k(), designation: '', quantite: '1', unite: 'u', prix_unitaire_ht: '0', tva_taux: 10 })

export default function DevisEditor() {
  const router = useRouter()
  const params = useParams()
  const rawId = String(params?.id ?? 'nouveau')
  const isNew = rawId === 'nouveau'

  const [ready, setReady] = useState(false)
  const [savedId, setSavedId] = useState<string | null>(isNew ? null : rawId)
  const [numero, setNumero] = useState<string | null>(null)
  const [statut, setStatut] = useState('brouillon')

  const [clientNom, setClientNom] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientAdresse, setClientAdresse] = useState('')
  const [objet, setObjet] = useState('')
  const [validite, setValidite] = useState('90')
  const [remise, setRemise] = useState('0')
  const [acompte, setAcompte] = useState('30')
  const [conditions, setConditions] = useState('')

  const [description, setDescription] = useState('')
  const [lignes, setLignes] = useState<Ligne[]>([emptyLigne()])
  const [aiNote, setAiNote] = useState('')

  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const { data: prof } = await supabase.from('artisans').select('id').eq('id', data.session.user.id).maybeSingle()
      if (!prof) { router.replace('/onboarding'); return }

      if (!isNew) {
        const { data: d } = await supabase.from('devis').select('*').eq('id', rawId).maybeSingle()
        if (d) {
          setNumero(d.numero); setStatut(d.statut ?? 'brouillon')
          setClientNom(d.client_nom ?? ''); setClientEmail(d.client_email ?? ''); setClientAdresse(d.client_adresse ?? '')
          setObjet(d.objet ?? ''); setValidite(String(d.validite_jours ?? 90))
          setRemise(String(d.remise_pct ?? 0)); setAcompte(String(d.acompte_pct ?? 0)); setConditions(d.conditions ?? '')
          const { data: ls } = await supabase.from('devis_lignes').select('*').eq('devis_id', rawId).order('ordre')
          if (ls && ls.length) {
            setLignes(ls.map((l) => ({ key: k(), designation: l.designation ?? '', quantite: String(l.quantite ?? 1), unite: l.unite ?? 'u', prix_unitaire_ht: String(l.prix_unitaire_ht ?? 0), tva_taux: Number(l.tva_taux) || 20 })))
          }
        }
      }
      setReady(true)
    })
  }, [router, isNew, rawId])

  function setLigne(key: string, patch: Partial<Ligne>) {
    setLignes((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  async function chiffrerIA() {
    if (!description.trim()) { setMsg({ type: 'err', text: 'Décris le chantier pour que l\'IA le chiffre.' }); return }
    setGenerating(true); setMsg(null); setAiNote('')
    const { data } = await supabase.auth.getSession()
    const res = await fetch('/api/devis/generer', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` },
      body: JSON.stringify({ description }),
    })
    setGenerating(false)
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'Erreur de génération.' }); return }
    const nouvelles: Ligne[] = (d.lignes ?? []).map((l: { designation: string; quantite: number; unite: string; prix_unitaire_ht: number; tva_taux: number }) => ({
      key: k(), designation: l.designation, quantite: String(l.quantite), unite: l.unite, prix_unitaire_ht: String(l.prix_unitaire_ht), tva_taux: Number(l.tva_taux) || 10,
    }))
    // remplace les lignes vides par défaut, sinon on ajoute à la suite
    setLignes((prev) => {
      const nonVides = prev.filter((l) => l.designation.trim() || Number(l.prix_unitaire_ht) > 0)
      return [...nonVides, ...nouvelles]
    })
    if (d.note) setAiNote(d.note)
  }

  async function save(newStatut?: string) {
    setSaving(true); setMsg(null)
    const payload = {
      objet, client_nom: clientNom, client_email: clientEmail, client_adresse: clientAdresse,
      validite_jours: Number(validite) || 90, remise_pct: Number(remise) || 0, acompte_pct: Number(acompte) || 0,
      conditions, statut: newStatut ?? statut,
      lignes: lignes.filter((l) => l.designation.trim()).map((l) => ({
        designation: l.designation, quantite: Number(l.quantite) || 0, unite: l.unite,
        prix_unitaire_ht: Number(l.prix_unitaire_ht) || 0, tva_taux: l.tva_taux,
      })),
    }
    const { data } = await supabase.auth.getSession()
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` }

    if (!savedId) {
      const res = await fetch('/api/devis', { method: 'POST', headers, body: JSON.stringify(payload) })
      const d = await res.json().catch(() => ({}))
      setSaving(false)
      if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'Erreur d\'enregistrement.' }); return }
      setSavedId(d.id); setNumero(d.numero)
      router.replace(`/devis/${d.id}`)
      setMsg({ type: 'ok', text: `Devis ${d.numero} enregistré ✅` })
    } else {
      const res = await fetch(`/api/devis/${savedId}`, { method: 'POST', headers, body: JSON.stringify(payload) })
      const d = await res.json().catch(() => ({}))
      setSaving(false)
      if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'Erreur d\'enregistrement.' }); return }
      if (newStatut) setStatut(newStatut)
      setMsg({ type: 'ok', text: 'Devis enregistré ✅' })
    }
  }

  async function logout() { await supabase.auth.signOut(); router.replace('/login') }

  const totals = computeTotals(
    lignes.map((l) => ({ quantite: Number(l.quantite) || 0, prix_unitaire_ht: Number(l.prix_unitaire_ht) || 0, tva_taux: l.tva_taux })),
    Number(remise) || 0,
  )
  const acompteMontant = (totals.total_ttc * (Number(acompte) || 0)) / 100

  if (!ready) return <main className="app-wrap"><p className="muted">Chargement…</p></main>

  return (
    <>
      <div className="appbar">
        <div className="appbar-in">
          <span className="brand"><span className="dot" />Presti</span>
          <div className="appbar-links">
            <a className="applink" href="/outils">Générateurs</a>
            <a className="applink active" href="/devis">Devis</a>
            <a className="applink" href="/dashboard">Mes demandes</a>
            <button className="applink" onClick={logout}>Déconnexion</button>
          </div>
        </div>
      </div>

      <main className="app-wrap">
        <div style={{ display: 'flex', alignItems: 'center', gap: '.8rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
          <a className="applink" href="/devis">← Devis</a>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>{numero ? numero : 'Nouveau devis'}</h1>
          <span className="muted" style={{ marginLeft: 'auto', fontSize: '.85rem' }}>{savedId ? 'Enregistré' : 'Brouillon (non enregistré)'}</span>
        </div>

        {/* Client */}
        <div className="tool-card">
          <h2>Client</h2>
          <div className="grid2">
            <div><label>Nom du client</label><input value={clientNom} onChange={(e) => setClientNom(e.target.value)} placeholder="Ex : Marie Dupont" /></div>
            <div><label>Email (pour l&apos;envoi)</label><input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="client@email.fr" /></div>
          </div>
          <label>Adresse du chantier</label>
          <input value={clientAdresse} onChange={(e) => setClientAdresse(e.target.value)} placeholder="12 rue des Lilas, 75011 Paris" />
          <label>Objet du devis</label>
          <input value={objet} onChange={(e) => setObjet(e.target.value)} placeholder="Ex : Rénovation électrique appartement" />
        </div>

        {/* Chiffrage IA */}
        <div className="tool-card" style={{ marginTop: '1.2rem' }}>
          <h2>Chiffrer avec l&apos;IA</h2>
          <p className="muted" style={{ margin: '0 0 .6rem' }}>Décrivez le chantier — Presti propose les lignes, vous ajustez tout ensuite.</p>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex : remplacement du tableau électrique, 12 prises, 6 points lumineux, mise aux normes d'un appartement 3 pièces" />
          <button disabled={generating} onClick={chiffrerIA}>{generating ? 'Presti chiffre…' : '⚡ Chiffrer avec l\'IA'}</button>
          {aiNote && <div className="ai-note"><strong>Note de Presti :</strong> {aiNote}</div>}
        </div>

        {/* Lignes */}
        <div className="tool-card" style={{ marginTop: '1.2rem' }}>
          <h2>Lignes du devis</h2>
          <div className="lignes-head">
            <span>Désignation</span><span>Qté</span><span>Unité</span><span>PU HT</span><span>TVA</span><span style={{ textAlign: 'right' }}>Total HT</span><span></span>
          </div>
          {lignes.map((l) => {
            const t = (Number(l.quantite) || 0) * (Number(l.prix_unitaire_ht) || 0)
            return (
              <div className="ligne" key={l.key}>
                <input className="desig" value={l.designation} onChange={(e) => setLigne(l.key, { designation: e.target.value })} placeholder="Désignation" />
                <input inputMode="decimal" value={l.quantite} onChange={(e) => setLigne(l.key, { quantite: e.target.value })} />
                <input list="unites" value={l.unite} onChange={(e) => setLigne(l.key, { unite: e.target.value })} />
                <input inputMode="decimal" value={l.prix_unitaire_ht} onChange={(e) => setLigne(l.key, { prix_unitaire_ht: e.target.value })} />
                <select value={l.tva_taux} onChange={(e) => setLigne(l.key, { tva_taux: Number(e.target.value) })}>
                  <option value={20}>20%</option><option value={10}>10%</option><option value={5.5}>5,5%</option>
                </select>
                <span className="lt">{t.toFixed(2)} €</span>
                <button className="del" onClick={() => setLignes((prev) => prev.filter((x) => x.key !== l.key))} title="Supprimer">✕</button>
              </div>
            )
          })}
          <datalist id="unites"><option value="u" /><option value="ml" /><option value="m²" /><option value="m³" /><option value="h" /><option value="forfait" /><option value="ens." /></datalist>
          <button className="btn btn--ghost" style={{ width: 'auto', marginTop: '1rem' }} onClick={() => setLignes((prev) => [...prev, emptyLigne()])}>+ Ajouter une ligne</button>

          {/* Totaux */}
          <div className="totals">
            <div className="t-row"><span className="t-lbl">Total HT</span><span className="t-val">{totals.total_ht.toFixed(2)} €</span></div>
            <div className="t-row"><span className="t-lbl">TVA</span><span className="t-val">{totals.total_tva.toFixed(2)} €</span></div>
            <div className="t-row grand"><span className="t-lbl">Total TTC</span><span className="t-val">{totals.total_ttc.toFixed(2)} €</span></div>
            {Number(acompte) > 0 && <div className="t-row"><span className="t-lbl">Acompte {acompte}%</span><span className="t-val">{acompteMontant.toFixed(2)} €</span></div>}
          </div>
        </div>

        {/* Paramètres */}
        <div className="tool-card" style={{ marginTop: '1.2rem' }}>
          <h2>Paramètres</h2>
          <div className="grid2">
            <div><label>Validité (jours)</label><input inputMode="numeric" value={validite} onChange={(e) => setValidite(e.target.value)} /></div>
            <div><label>Remise globale (%)</label><input inputMode="decimal" value={remise} onChange={(e) => setRemise(e.target.value)} /></div>
            <div><label>Acompte demandé (%)</label><input inputMode="decimal" value={acompte} onChange={(e) => setAcompte(e.target.value)} /></div>
            <div><label>Statut</label>
              <select value={statut} onChange={(e) => setStatut(e.target.value)}>
                <option value="brouillon">Brouillon</option><option value="envoye">Envoyé</option><option value="accepte">Accepté</option><option value="refuse">Refusé</option><option value="expire">Expiré</option>
              </select>
            </div>
          </div>
          <label>Conditions particulières</label>
          <textarea rows={2} value={conditions} onChange={(e) => setConditions(e.target.value)} placeholder="Ex : acompte de 30% à la commande, solde à la fin des travaux." />
        </div>

        {msg && <div className={`msg ${msg.type === 'err' ? 'err' : ''}`} style={{ marginTop: '1rem' }}>{msg.text}</div>}

        <div style={{ display: 'flex', gap: '.7rem', marginTop: '1.4rem', flexWrap: 'wrap' }}>
          <button className="btn btn--primary" style={{ width: 'auto' }} disabled={saving} onClick={() => save()}>{saving ? 'Enregistrement…' : 'Enregistrer le devis'}</button>
          <span className="muted" style={{ alignSelf: 'center', fontSize: '.85rem' }}>Aperçu PDF + envoi au client → nouveauté suivante</span>
        </div>
      </main>
    </>
  )
}
