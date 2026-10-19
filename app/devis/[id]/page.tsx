'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { partagerFichier, vibrer, estNatif } from '@/lib/natif'
import { computeTotals } from '@/lib/devisTotals'
import AppShell from '@/app/AppShell'
import ModelSelect from '@/app/ModelSelect'
import Info from '@/app/Info'
import type { Tier } from '@/lib/models'
import { mentionFranchise, type BaseMention } from '@/lib/facturation'
import { mentionsManquantesEmission, OU_REMPLIR } from '@/lib/legalArtisan'
// Refonte 18/10 (étape 5.4, drapeau consoleV2) : un devis parti s'ouvre en LECTURE (FicheLecture) ; l'éditeur reste à un clic.
import { useConsoleV2 } from '@/lib/consoleV2Client'
import { Squelette } from '@/components/ui/base'
import FicheLecture from './FicheLecture'

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

  const v2 = useConsoleV2()
  const [edition, setEdition] = useState(false)
  const [dates, setDates] = useState<{ cree: string | null; envoye: string | null; accepte: string | null }>({ cree: null, envoye: null, accepte: null })
  const [ready, setReady] = useState(false)
  const [uid, setUid] = useState('')
  const [savedId, setSavedId] = useState<string | null>(isNew ? null : rawId)
  const [numero, setNumero] = useState<string | null>(null)
  const [statut, setStatut] = useState('brouillon')
  // Le statut ENREGISTRÉ (celui que le serveur connaît) : « Créer la facture » ne s'ouvre que sur un devis accepté (C6, audit du 18/10).
  const [statutBase, setStatutBase] = useState('brouillon')
  // La demande d'où vient ce devis (« Créer un devis » depuis Messages ou le CRM) : envoyée à la création pour RATTACHER le devis (C2).
  const [leadId, setLeadId] = useState<string | null>(null)
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
  // Ce qui manque pour émettre ce devis — calculé comme le serveur le fera au moment d'envoyer.
  const mentionsEmissionManquantes = mentionsManquantesEmission({
    nom: entNom || null, metier: metier || null, forme_juridique: forme || null, siret: siret || null,
    adresse: entAdresse.split(',')[0]?.trim() || null, code_postal: entAdresse.split(',')[1]?.trim() || null, ville: entAdresse.split(',').slice(2).join(',').trim() || null,
    tel_public: null, email_public: null, tva_num: null,
    assurance_nom: assNom || null, assurance_contrat: assContrat || null, assurance_activites: assActivites || null, assurance_zone: assZone || null,
    zone_intervention: null, mediateur_nom: null, mediateur_url: null,
  })
  const mentionTva = mentionFranchise(mentionBase)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

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
          setNumero(d.numero); setStatut(d.statut ?? 'brouillon'); setStatutBase(d.statut ?? 'brouillon')
          setDates({ cree: d.created_at ?? null, envoye: d.envoye_le ?? null, accepte: d.accepte_le ?? null })
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
            setLeadId(leadId)
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

  async function chiffrerIA() {
    if (!description.trim()) { setMsg({ type: 'err', text: 'Décrivez le chantier pour que l\'IA le chiffre.' }); return }
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
      // C2 (audit du 18/10) : sans ce lien, le devis né d'une demande restait détaché d'elle (deux cartes au pipeline, pas de
      // relances J+2/5/10, pas d'acceptation possible dans la conversation). Seulement à la création : le serveur vérifie la demande.
      ...(!savedId && leadId ? { lead_id: leadId } : {}),
      lignes: lignes.filter((l) => l.designation.trim()).map((l) => ({ designation: l.designation, quantite: Number(l.quantite) || 0, unite: l.unite, prix_unitaire_ht: Number(l.prix_unitaire_ht) || 0, tva_taux: l.tva_taux })),
    }
    const { data } = await supabase.auth.getSession()
    const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` }
    if (!savedId) {
      const res = await fetch('/api/devis', { method: 'POST', headers, body: JSON.stringify(payload) })
      const d = await res.json().catch(() => ({})); setSaving(false)
      if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'Erreur.' }); return }
      setStatutBase('brouillon')
      setSavedId(d.id); setNumero(d.numero); router.replace(`/devis/${d.id}`)
      setMsg({ type: 'ok', text: `Devis ${d.numero} enregistré ✅` })
    } else {
      const res = await fetch(`/api/devis/${savedId}`, { method: 'POST', headers, body: JSON.stringify(payload) })
      const d = await res.json().catch(() => ({})); setSaving(false)
      if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'Erreur.' }); return }
      if (newStatut) setStatut(newStatut)
      setStatutBase(payload.statut)
      setMsg({ type: 'ok', text: 'Devis enregistré ✅' })
    }
  }

  async function downloadPdf() {
    if (!savedId) { setMsg({ type: 'err', text: 'Enregistrez le devis avant de télécharger le PDF.' }); return }
    if (estNatif()) return partagerPdf() // la coque : pas d'onglet ni de dossier Téléchargements — la feuille de partage (Fichiers, Mail…)
    const win = window.open('', '_blank') // dans le geste utilisateur (anti-blocage, mobile)
    const { data } = await supabase.auth.getSession()
    const res = await fetch(`/api/devis/${savedId}/pdf`, { headers: { Authorization: `Bearer ${data.session?.access_token}` } })
    if (!res.ok) { win?.close(); setMsg({ type: 'err', text: 'PDF indisponible, réessayez.' }); return }
    const url = URL.createObjectURL(await res.blob())
    if (win) win.location.href = url
    else { const a = document.createElement('a'); a.href = url; a.download = `${numero || 'devis'}.pdf`; a.click() }
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  /** Partager le PDF (v9 J3) : feuille native dans l'app (WhatsApp, Mail, AirDrop…), Web Share sur téléphone, sinon téléchargement. */
  async function partagerPdf() {
    if (!savedId) { setMsg({ type: 'err', text: 'Enregistrez le devis avant de le partager.' }); return }
    const { data } = await supabase.auth.getSession()
    const res = await fetch(`/api/devis/${savedId}/pdf`, { headers: { Authorization: `Bearer ${data.session?.access_token}` } })
    if (!res.ok) { setMsg({ type: 'err', text: 'PDF indisponible, réessayez.' }); return }
    const resultat = await partagerFichier(`${numero || 'devis'}.pdf`, await res.blob(), { titre: `Devis ${numero || ''}`.trim(), texte: 'Votre devis, en pièce jointe.' })
    if (resultat === 'natif' || resultat === 'web') void vibrer('leger')
    if (resultat === 'aucun') setMsg({ type: 'err', text: 'Partage impossible sur cet appareil : téléchargez le PDF.' })
  }

  async function envoyer() {
    if (!savedId) { setMsg({ type: 'err', text: 'Enregistrez le devis avant de l\'envoyer.' }); return }
    if (!clientEmail.trim()) { setMsg({ type: 'err', text: 'Renseignez l\'email du client pour l\'envoyer.' }); return }
    setSaving(true); setMsg(null)
    const { data } = await supabase.auth.getSession()
    const res = await fetch(`/api/devis/${savedId}/envoyer`, { method: 'POST', headers: { Authorization: `Bearer ${data.session?.access_token}` } })
    const d = await res.json().catch(() => ({})); setSaving(false)
    if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'Envoi échoué.' }); return }
    setStatut('envoye'); setStatutBase('envoye'); setMsg({ type: 'ok', text: 'Devis envoyé au client ✅' }); void vibrer('succes')
  }

  async function creerFacture() {
    if (!savedId) { setMsg({ type: 'err', text: 'Enregistrez le devis avant de créer la facture.' }); return }
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
    if (res.ok) { router.push('/devis'); return }
    // Le serveur dit POURQUOI (obligation de conservation, et ce qu'on peut faire à la place) :
    // « Suppression impossible » laissait l'artisan croire à une panne.
    const corps = await res.json().catch(() => ({} as { error?: string }))
    setMsg({ type: 'err', text: corps.error ?? 'Suppression impossible.' })
  }

  const lignesPleines = lignes.filter((l) => l.designation.trim())
  const totals = computeTotals(lignes.map((l) => ({ quantite: Number(l.quantite) || 0, prix_unitaire_ht: Number(l.prix_unitaire_ht) || 0, tva_taux: l.tva_taux })), Number(remise) || 0)
  const totalBrut = lignes.reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(l.prix_unitaire_ht) || 0), 0)
  const remiseMontant = totalBrut - (totals.total_ht)
  const acompteMontant = (totals.total_ttc * (Number(acompte) || 0)) / 100
  const today = new Date()
  const validiteDate = new Date(today.getTime() + (Number(validite) || 90) * 86400000)

  // C6 (audit du 18/10) : une facture est scellée dès sa création — on ne la propose que sur un devis accepté ET enregistré.
  const factureOuverte = !!savedId && statutBase === 'accepte'
  const raisonFacture = !savedId ? 'Enregistrez le devis, puis faites-le accepter par le client.' : 'On ne facture qu’un devis accepté : passez son statut à « Accepté » et enregistrez.'

  if (!ready) return <AppShell active="devis" title="Devis" crumb="Chargement…">{v2 ? <Squelette variante="tableau" lignes={4} etiquette="Chargement du devis…" /> : <p className="muted">Chargement…</p>}</AppShell>

  // v2 : un devis PARTI (envoyé, accepté, refusé, expiré) s'ouvre en lecture. « Modifier » rouvre l'éditeur ci-dessous.
  if (v2 && savedId && statutBase !== 'brouillon' && !edition) {
    const actionsLecture = (
      <>
        <button className="ui-btn ui-btn--g" onClick={partagerPdf} data-partager>Partager</button>
        <button className="ui-btn ui-btn--s" onClick={downloadPdf}>Télécharger le PDF</button>
        <button className="ui-btn ui-btn--s" onClick={() => setEdition(true)}>Modifier</button>
        {statutBase === 'accepte'
          ? <button className="ui-btn ui-btn--p" disabled={saving || !factureOuverte} onClick={creerFacture}>{saving ? 'Création…' : 'Créer la facture'}</button>
          : statutBase === 'envoye' ? <button className="ui-btn ui-btn--p" disabled={saving} onClick={() => { if (confirm(`Renvoyer ce devis par e-mail à ${clientNom || 'votre client'} (${clientEmail || 'adresse manquante'}) ?`)) void envoyer() }}>{saving ? 'Envoi…' : 'Renvoyer au client'}</button> : null}
      </>
    )
    return (
      <AppShell active="devis" title={numero ? numero : 'Devis'} crumb="Devis" actions={actionsLecture} wide>
        {msg && <div className={`msg ${msg.type === 'err' ? 'err' : ''}`} role={msg.type === 'err' ? 'alert' : 'status'} style={{ marginTop: 0 }}>{msg.text}</div>}
        <FicheLecture statut={statutBase} objet={objet} client={{ nom: clientNom, email: clientEmail, adresse: clientAdresse }}
          lignes={lignes} totaux={totals} remisePct={Number(remise) || 0} remiseMontant={remiseMontant} acomptePct={Number(acompte) || 0} acompteMontant={acompteMontant}
          validiteJours={Number(validite) || 90} dates={dates} mentionTva={mentionTva} franchise={tvaRegime === 'franchise'} />
      </AppShell>
    )
  }

  const actions = (
    <>
      <button className="psh-btn ghost" onClick={downloadPdf}>Télécharger PDF</button>
      <button className="psh-btn ghost" onClick={partagerPdf} data-partager>Partager</button>
      <button className="psh-btn ghost" onClick={envoyer}>Envoyer au client</button>
      <button className="psh-btn ghost" onClick={creerFacture} disabled={!factureOuverte} title={factureOuverte ? undefined : raisonFacture}>Créer la facture</button>
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
                <div><label>Nom du client <Info cle="devis.client_nom" /></label><input value={clientNom} onChange={(e) => setClientNom(e.target.value)} placeholder="Marie Dupont" /></div>
                <div><label>Email <Info cle="devis.client_email" /></label><input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="marie@email.fr" /></div>
              </div>
              <label>Adresse du chantier <Info cle="devis.client_adresse" /></label>
              <input value={clientAdresse} onChange={(e) => setClientAdresse(e.target.value)} placeholder="12 rue des Lilas, 75011 Paris" />
              <label>Objet du devis <Info cle="devis.objet" /></label>
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
                <div><label htmlFor="dv-validite">Validité (jours) <Info cle="devis.validite" /></label><input id="dv-validite" inputMode="numeric" value={validite} onChange={(e) => setValidite(e.target.value)} /></div>
                <div><label htmlFor="dv-remise">Remise globale (%) <Info cle="devis.remise" /></label><input id="dv-remise" inputMode="decimal" value={remise} onChange={(e) => setRemise(e.target.value)} /></div>
                <div><label htmlFor="dv-acompte">Acompte (%) <Info cle="devis.acompte" /></label><input id="dv-acompte" inputMode="decimal" value={acompte} onChange={(e) => setAcompte(e.target.value)} /></div>
                <div><label htmlFor="dv-statut">Statut <Info cle="devis.statut" /></label>
                  <select id="dv-statut" value={statut} onChange={(e) => setStatut(e.target.value)}>
                    <option value="brouillon">Brouillon</option><option value="envoye">Envoyé</option><option value="accepte">Accepté</option><option value="refuse">Refusé</option><option value="expire">Expiré</option>
                  </select>
                  {savedId && !factureOuverte && <p className="muted" data-raison-facture style={{ margin: '.35rem 0 0', fontSize: '.8rem' }}>{raisonFacture}</p>}
                </div>
              </div>
            </div>

            {/* Sprint J-1 §6 — les informations de l'entreprise se renseignent à UN seul
                endroit : Paramètres → Entreprise & légal. Avant, ce panneau avait son propre
                formulaire et son propre « Enregistrer », et les deux écrans se contredisaient. */}
            <div className="devis-infos-rappel">
              <div>
                <b>Informations de l’entreprise</b>
                <span className="muted">SIRET, forme juridique, adresse, TVA, assurance, IBAN, conditions de paiement — reprises automatiquement sur ce devis.</span>
                {mentionsEmissionManquantes.length ? (
                  <span className="devis-infos-manque">Manque pour émettre : {mentionsEmissionManquantes.join(', ')}.</span>
                ) : null}
              </div>
              <a className="btn btn--ghost" href="/parametres?onglet=legal">{OU_REMPLIR.label} →</a>
            </div>
          </div>

          {/* ---------------- APERÇU LIVE (droite) ---------------- */}
          <div className="preview-wrap blueprint">
            {/* « conforme » seulement quand rien ne manque pour émettre : jusqu'au 12/10 il s'affichait aussi à côté de « Manque pour
                émettre », sur un devis que le serveur refusera d'envoyer (audit des promesses, produit, ligne 74). */}
            <div className="live-flag"><span className="b" />{mentionsEmissionManquantes.length ? 'Aperçu en direct — mentions obligatoires manquantes' : 'Aperçu en direct — mentions obligatoires présentes'}</div>
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
                  {assNom ? `${assNom}, contrat n° ${assContrat || '—'}${assActivites ? `, ${assActivites}` : ''}${assZone ? `, ${assZone}` : ''}.` : <span className="doc-todo">à renseigner dans Paramètres → Entreprise & légal (obligatoire).</span>}
                </p>
              </div>
            </div>
          </div>
        </div>
    </AppShell>
  )
}
