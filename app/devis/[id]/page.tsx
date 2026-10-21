'use client'

import { Fragment, useEffect, useState } from 'react'
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
import { tauxTvaLu } from '@/lib/lignes'
import { actif } from '@/lib/flags'
import { grouperParLots, regrouperLignes, lotsDe, metierParLots, normaliserLot, lirePct, LIBELLES_FACTURE, HORS_LOT, type TypeDevis, type TypeFacture } from '@/lib/facturesTypes'

// 0176 — drapeaux de la demande du 21/10 (entreprises tous corps d'état, chantiers longs). Baissés : l'écran est celui d'avant.
const LOTS = actif('devisLots')
const TYPES_FACTURE_ECRAN = actif('facturesSituation')

// source_prix : la PROVENANCE du prix (lib/lignes.ts), gardée à la lecture et renvoyée à l'enregistrement (audit du 21/10, E1 : sans elle,
// un prix estimé par l'IA perdait sa mention une fois le devis enregistré). Un prix tapé par l'artisan devient « prix donné par l'artisan ».
type Ligne = { key: string; designation: string; quantite: string; unite: string; prix_unitaire_ht: string; tva_taux: number; lot?: string; source_prix?: string }
const SOURCE_ARTISAN = 'prix donné par l’artisan'

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
  // Devis simple ou PAR LOTS (drapeau devisLots, 0176).
  const [typeDevis, setTypeDevis] = useState<TypeDevis>('simple')
  // Le choix du TYPE de facture (drapeau facturesSituation, 0176) : ouvert par « Créer la facture ».
  const [choixFacture, setChoixFacture] = useState(false)
  const [typeFacture, setTypeFacture] = useState<TypeFacture>('standard')
  const [pctAcompte, setPctAcompte] = useState('30')
  const [pctSituation, setPctSituation] = useState('')
  const [pctLots, setPctLots] = useState<Record<string, string>>({})
  const [situationParLots, setSituationParLots] = useState(false)
  const [historique, setHistorique] = useState<{ numero: string; objet: string; pct: number | null }[]>([])
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
      // Un nouveau devis d'une entreprise tous corps d'état ou de rénovation multi-lots part « par lots » (l'artisan peut changer).
      if (isNew && LOTS && metierParLots(a.metier)) setTypeDevis('lots')

      if (!isNew) {
        const { data: d } = await supabase.from('devis').select('*').eq('id', rawId).maybeSingle()
        if (d) {
          setNumero(d.numero); setStatut(d.statut ?? 'brouillon'); setStatutBase(d.statut ?? 'brouillon')
          setClientNom(d.client_nom ?? ''); setClientEmail(d.client_email ?? ''); setClientAdresse(d.client_adresse ?? '')
          setObjet(d.objet ?? ''); setValidite(String(d.validite_jours ?? 90)); setRemise(String(d.remise_pct ?? 0)); setAcompte(String(d.acompte_pct ?? 0))
          if (LOTS) setTypeDevis(d.type_devis === 'lots' ? 'lots' : 'simple')
          const { data: ls } = await supabase.from('devis_lignes').select('*').eq('devis_id', rawId).order('ordre')
          if (ls && ls.length) setLignes(ls.map((l) => ({ key: k(), ...(LOTS && typeof l.lot === 'string' && l.lot ? { lot: l.lot } : {}), designation: l.designation ?? '', quantite: String(l.quantite ?? 1), unite: l.unite ?? 'u', prix_unitaire_ht: String(l.prix_unitaire_ht ?? 0), tva_taux: tauxTvaLu(l.tva_taux, 20), ...(typeof l.source_prix === 'string' && l.source_prix ? { source_prix: l.source_prix } : {}) })))
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
    const res = await fetch('/api/devis/generer', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` }, body: JSON.stringify({ description, model: tier, ...(LOTS && typeDevis === 'lots' ? { par_lots: true } : {}) }) })
    setGenerating(false)
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'Erreur de génération.' }); return }
    const nouvelles: Ligne[] = (d.lignes ?? []).map((l: { designation: string; quantite: number; unite: string; prix_unitaire_ht: number; tva_taux: number; lot?: string; source_prix?: string }) => ({ key: k(), designation: l.designation, quantite: String(l.quantite), unite: l.unite, prix_unitaire_ht: String(l.prix_unitaire_ht), tva_taux: tauxTvaLu(l.tva_taux, 10), source_prix: typeof l.source_prix === 'string' && l.source_prix ? l.source_prix : 'estimation', ...(LOTS && typeDevis === 'lots' && typeof l.lot === 'string' && l.lot ? { lot: l.lot } : {}) }))
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
      ...(LOTS ? { type_devis: typeDevis } : {}),
      lignes: lignes.filter((l) => l.designation.trim()).map((l) => ({ ...(LOTS && typeDevis === 'lots' && normaliserLot(l.lot) ? { lot: normaliserLot(l.lot) } : {}), designation: l.designation, quantite: Number(l.quantite) || 0, unite: l.unite, prix_unitaire_ht: Number(l.prix_unitaire_ht) || 0, tva_taux: l.tva_taux, ...(l.source_prix ? { source_prix: l.source_prix } : {}) })),
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

  // 0176 (drapeau facturesSituation) : « Créer la facture » ouvre d'abord le choix du type ; les factures déjà émises sur le devis
  // disent où en est la facturation (dernière situation, son avancement cumulé, lot par lot).
  async function ouvrirChoixFacture() {
    if (!savedId) { setMsg({ type: 'err', text: 'Enregistrez le devis avant de créer la facture.' }); return }
    setChoixFacture(true); setMsg(null)
    const { data: fs } = await supabase.from('factures').select('*').eq('devis_id', savedId).order('created_at')
    const toutes = (fs ?? []) as { id: string; numero: string | null; objet: string | null; statut: string | null; avoir_de: string | null; situation_numero?: number | null; avancement_pct?: number | string | null; avancement_lots?: Record<string, number> | null }[]
    const annulees = new Set(toutes.map((f) => f.avoir_de).filter(Boolean))
    const vivantes = toutes.filter((f) => !f.avoir_de && !annulees.has(f.id) && (f.statut === 'emise' || f.statut === 'payee'))
    setHistorique(vivantes.map((f) => ({ numero: f.numero ?? '', objet: f.objet ?? '', pct: f.avancement_pct === null || f.avancement_pct === undefined ? null : Number(f.avancement_pct) })))
    const derniere = [...vivantes].filter((f) => f.situation_numero).sort((a, b) => (b.situation_numero ?? 0) - (a.situation_numero ?? 0))[0]
    if (derniere?.avancement_lots) { setSituationParLots(true); setPctLots(Object.fromEntries(Object.entries(derniere.avancement_lots).map(([lot, v]) => [lot, String(v)]))) }
    setPctAcompte(String(Number(acompte) > 0 && Number(acompte) < 100 ? acompte : 30))
    setTypeFacture(vivantes.some((f) => f.situation_numero) ? 'situation' : 'standard')
  }

  async function creerFacture() {
    if (!savedId) { setMsg({ type: 'err', text: 'Enregistrez le devis avant de créer la facture.' }); return }
    // Une saisie d'avancement illisible est SIGNALÉE ici, jamais envoyée comme « inchangé » (audit argent du 21/10).
    if (TYPES_FACTURE_ECRAN && typeFacture === 'situation') {
      const illisibles = situationParLots ? Object.entries(pctLots).filter(([, v]) => v.trim() && lirePct(v) === null).map(([lot]) => lot) : (lirePct(pctSituation) === null ? ['avancement cumulé'] : [])
      if (illisibles.length) { setMsg({ type: 'err', text: `Pourcentage illisible : ${illisibles.join(', ')}. Saisissez un nombre, par exemple 70.` }); return }
    }
    setSaving(true); setMsg(null)
    const { data } = await supabase.auth.getSession()
    const corpsFacture = !TYPES_FACTURE_ECRAN ? { devis_id: savedId } : {
      devis_id: savedId, type: typeFacture,
      ...(typeFacture === 'acompte' ? { acompte_pct: lirePct(pctAcompte) } : {}),
      ...(typeFacture === 'situation' ? { avancement: situationParLots ? { lots: Object.fromEntries(Object.entries(pctLots).filter(([, v]) => v.trim()).map(([lot, v]) => [lot, lirePct(v)])) } : { global: lirePct(pctSituation) } } : {}),
    }
    const res = await fetch('/api/factures', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` }, body: JSON.stringify(corpsFacture) })
    const d = await res.json().catch(() => ({})); setSaving(false)
    if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'Création de la facture échouée.' }); return }
    router.push('/factures')
  }

  // Devis PAR LOTS : affecter (champ « Lot » de chaque ligne), renommer (toutes les lignes du lot), regrouper (chaque lot d'un
  // seul tenant, dans l'ordre de première apparition), ajouter un lot (une ligne vide qui le porte).
  const lotsEnCours = LOTS && typeDevis === 'lots' ? lotsDe(lignes) : []
  function renommerLot(ancien: string, nouveau: string) {
    const n = normaliserLot(nouveau)
    if (!n || n === ancien) return
    setLignes((prev) => prev.map((l) => (normaliserLot(l.lot) === ancien ? { ...l, lot: n } : l)))
  }
  function ajouterLot() {
    setLignes((prev) => [...prev, { ...emptyLigne(), lot: `Lot ${lotsDe(prev).length + 1}` }])
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

  if (!ready) return <AppShell active="devis" title="Devis" crumb="Chargement…"><p className="muted">Chargement…</p></AppShell>

  const actions = (
    <>
      <button className="psh-btn ghost" onClick={downloadPdf}>Télécharger PDF</button>
      <button className="psh-btn ghost" onClick={partagerPdf} data-partager>Partager</button>
      <button className="psh-btn ghost" onClick={envoyer}>Envoyer au client</button>
      <button className="psh-btn ghost" onClick={TYPES_FACTURE_ECRAN ? ouvrirChoixFacture : creerFacture} disabled={!factureOuverte} title={factureOuverte ? undefined : raisonFacture}>Créer la facture</button>
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
            {TYPES_FACTURE_ECRAN && choixFacture && (
              <div className="tool-card" data-choix-facture>
                <h2>Créer une facture</h2>
                <p className="muted" style={{ margin: '0 0 .6rem' }}>Une facture est émise et scellée dès sa création : numéro définitif, une erreur se corrige par un avoir.</p>
                <div className="inbox-model" role="radiogroup" aria-label="Type de facture" style={{ flexWrap: 'wrap' }}>
                  {(['standard', 'acompte', 'situation', 'solde'] as const).map((t) => (
                    <button key={t} type="button" role="radio" aria-checked={typeFacture === t} className={`inbox-model-b${typeFacture === t ? ' on' : ''}`} onClick={() => setTypeFacture(t)}>{LIBELLES_FACTURE[t]}</button>
                  ))}
                </div>
                {historique.length > 0 && (
                  <ul className="muted" style={{ margin: '.6rem 0 0', paddingLeft: '1.1rem', fontSize: '.85rem' }}>
                    {historique.map((h) => <li key={h.numero}>{h.numero} — {h.objet}{h.pct !== null ? ` (avancement cumulé ${String(h.pct).replace('.', ',')} %)` : ''}</li>)}
                  </ul>
                )}
                {typeFacture === 'standard' && <p className="muted" style={{ margin: '.6rem 0 0', fontSize: '.85rem' }}>Tout le devis. Si des acomptes ou des situations sont déjà facturés, c’est la facture de solde qui les déduit.</p>}
                {typeFacture === 'acompte' && (
                  <div style={{ marginTop: '.6rem' }}><label htmlFor="fx-acompte">Acompte (% du devis)</label><input id="fx-acompte" inputMode="decimal" value={pctAcompte} onChange={(e) => setPctAcompte(e.target.value)} /></div>
                )}
                {typeFacture === 'situation' && (
                  <div style={{ marginTop: '.6rem' }}>
                    <p className="muted" style={{ margin: '0 0 .4rem', fontSize: '.85rem' }}>Avancement CUMULÉ à date, depuis le début du chantier. Montant = cumul × devis − tout ce qui est déjà facturé (situations et acomptes). Il ne peut pas reculer.</p>
                    {lotsDe(lignes).length > 0 && (
                      <label style={{ display: 'flex', gap: '.4rem', alignItems: 'center', fontSize: '.88rem' }}><input type="checkbox" checked={situationParLots} onChange={(e) => setSituationParLots(e.target.checked)} style={{ width: 'auto' }} /> Lot par lot</label>
                    )}
                    {situationParLots && lotsDe(lignes).length > 0
                      ? lotsDe(lignes).map((lot) => (
                        <div key={lot} style={{ display: 'flex', gap: '.4rem', alignItems: 'center', marginTop: '.3rem' }}>
                          <span style={{ flex: 1, fontSize: '.88rem' }}>{lot}</span>
                          <input aria-label={`Avancement cumulé du lot ${lot} (%)`} inputMode="decimal" value={pctLots[lot] ?? ''} onChange={(e) => setPctLots((p) => ({ ...p, [lot]: e.target.value }))} style={{ width: '5rem' }} placeholder="%" />
                        </div>
                      ))
                      : <div><label htmlFor="fx-situation">Avancement cumulé (%)</label><input id="fx-situation" inputMode="decimal" value={pctSituation} onChange={(e) => setPctSituation(e.target.value)} placeholder="ex. 70" /></div>}
                  </div>
                )}
                {typeFacture === 'solde' && <p className="muted" style={{ margin: '.6rem 0 0', fontSize: '.85rem' }}>La dernière facture du devis : ses lignes, moins chaque acompte et chaque situation déjà facturés.</p>}
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginTop: '.8rem' }}>
                  <button type="button" className="psh-btn primary" disabled={saving} onClick={creerFacture}>{saving ? 'Émission…' : `Émettre : ${LIBELLES_FACTURE[typeFacture]}`}</button>
                  <button type="button" className="psh-btn ghost" onClick={() => setChoixFacture(false)}>Annuler</button>
                </div>
              </div>
            )}
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
              {LOTS && (
                <div className="inbox-model" role="radiogroup" aria-label="Type de devis" data-type-devis style={{ marginBottom: '.6rem' }}>
                  {(['simple', 'lots'] as const).map((t) => (
                    <button key={t} type="button" role="radio" aria-checked={typeDevis === t} className={`inbox-model-b${typeDevis === t ? ' on' : ''}`} onClick={() => setTypeDevis(t)}>{t === 'simple' ? 'Devis simple' : 'Devis par lots'}</button>
                  ))}
                </div>
              )}
              {LOTS && typeDevis === 'lots' && (
                <div data-lots style={{ marginBottom: '.6rem' }}>
                  <p className="muted" style={{ margin: '0 0 .4rem', fontSize: '.85rem' }}>Chaque ligne porte son lot ; le PDF titre chaque lot avec son sous-total HT. Les totaux ne changent pas.</p>
                  {lotsEnCours.map((lot) => (
                    <div key={lot} style={{ display: 'flex', gap: '.4rem', alignItems: 'center', marginTop: '.3rem' }}>
                      <input aria-label={`Renommer le lot ${lot}`} defaultValue={lot} onBlur={(e) => renommerLot(lot, e.target.value)} style={{ flex: 1 }} />
                      <span className="muted" style={{ fontSize: '.8rem', whiteSpace: 'nowrap' }}>{lignes.filter((l) => normaliserLot(l.lot) === lot).length} ligne(s)</span>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginTop: '.5rem' }}>
                    <button type="button" className="btn btn--ghost" style={{ width: 'auto' }} onClick={ajouterLot}>+ Nouveau lot</button>
                    <button type="button" className="btn btn--ghost" style={{ width: 'auto' }} onClick={() => setLignes((prev) => regrouperLignes(prev))}>Regrouper les lignes par lot</button>
                  </div>
                  <datalist id="lots-devis">{lotsEnCours.map((lot) => <option key={lot} value={lot} />)}</datalist>
                </div>
              )}
              {lignes.map((l) => (
                <div className="eline" key={l.key}>
                  {LOTS && typeDevis === 'lots' && <input className="desig" list="lots-devis" value={l.lot ?? ''} onChange={(e) => setLigne(l.key, { lot: e.target.value })} placeholder="Lot (ex. Lot 1 — Démolition)" aria-label="Lot de la ligne" />}
                  <input className="desig" value={l.designation} onChange={(e) => setLigne(l.key, { designation: e.target.value })} placeholder="Désignation de la prestation" />
                  <div className="lrow">
                    <input className="q" inputMode="decimal" value={l.quantite} onChange={(e) => setLigne(l.key, { quantite: e.target.value })} title="Quantité" />
                    <input className="u" list="unites" value={l.unite} onChange={(e) => setLigne(l.key, { unite: e.target.value })} title="Unité" />
                    <input className="pu" inputMode="decimal" value={l.prix_unitaire_ht} onChange={(e) => setLigne(l.key, { prix_unitaire_ht: e.target.value, source_prix: SOURCE_ARTISAN })} title="Prix unitaire HT" />
                    <select className="tv" value={l.tva_taux} onChange={(e) => setLigne(l.key, { tva_taux: Number(e.target.value) })} title="TVA">
                      <option value={20}>20%</option><option value={10}>10%</option><option value={5.5}>5,5%</option>
                      {/* 0 % : franchise de TVA (art. 293 B du CGI), ou un 0 déjà enregistré — jamais remplacé en silence. */}
                      {(tvaRegime === 'franchise' || l.tva_taux === 0) && <option value={0}>0%</option>}
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
                  {(LOTS && typeDevis === 'lots' ? grouperParLots(lignesPleines) : [{ lot: null, lignes: lignesPleines, sousTotalHt: 0 }]).map((g, gi) => (
                    <Fragment key={`g-${gi}`}>
                      {LOTS && typeDevis === 'lots' && <tr data-lot-titre><td colSpan={5} style={{ fontWeight: 700, paddingTop: '.6rem' }}>{g.lot ?? HORS_LOT}</td></tr>}
                      {g.lignes.map((l) => (
                        <tr key={l.key}>
                          <td>{l.designation}</td>
                          <td className="num">{(Number(l.quantite) || 0).toLocaleString('fr-FR')} {l.unite}</td>
                          <td className="num">{eur(Number(l.prix_unitaire_ht) || 0)}</td>
                          <td className="num">{String(l.tva_taux).replace('.', ',')}%</td>
                          <td className="num">{eur((Number(l.quantite) || 0) * (Number(l.prix_unitaire_ht) || 0))}</td>
                        </tr>
                      ))}
                      {LOTS && typeDevis === 'lots' && <tr data-lot-sous-total><td colSpan={4} className="num" style={{ fontWeight: 600 }}>Sous-total {g.lot ?? HORS_LOT} HT</td><td className="num" style={{ fontWeight: 700 }}>{eur(g.sousTotalHt)}</td></tr>}
                    </Fragment>
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
