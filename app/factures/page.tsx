'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import { estNatif, partagerFichier, vibrer } from '@/lib/natif'
import { actif as drapeau } from '@/lib/flags'
import { etatPourEcran, type FactureRelancable } from '@/lib/relancesImpayes'
import RelancesAuto, { type DonneesRelances } from './RelancesAuto'

type Facture = { id: string; numero: string | null; objet: string | null; client_nom: string | null; statut: string | null; total_ttc: number | null; date_echeance: string | null; avoir_de: string | null }

const BADGE: Record<string, { label: string; pill: string }> = {
  emise: { label: 'Émise', pill: 'info' },
  payee: { label: 'Payée', pill: 'ok' },
  annulee: { label: 'Annulée', pill: 'crit' },
}
const eur = (n: number) => `${(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
const initiales = (n: string | null) => (n ? n.replace(/^(M\.|Mme|Mlle)\s+(et\s+(M\.|Mme)\s+)?/i, '').trim().split(/\s+/).slice(0, 2).map((x) => x[0]?.toUpperCase()).join('') : '?')
const somme = (l: Facture[]) => l.reduce((t, f) => t + (f.total_ttc ?? 0), 0)
// Les familles du résumé et des filtres. Un avoir et la facture qu'il annule sortent des deux montants :
// l'argent n'est ni à encaisser ni encaissé.
const famille = (f: Facture) => (f.avoir_de || f.statut === 'annulee' ? 'avoirs' : f.statut === 'payee' ? 'payees' : 'a_encaisser')
const FILTRES: [string, string][] = [['a_encaisser', 'À encaisser'], ['payees', 'Payées'], ['avoirs', 'Avoirs et annulées']]

export default function FacturesList() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [factures, setFactures] = useState<Facture[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [filtre, setFiltre] = useState<string>('toutes')
  // Relances automatiques des impayés : null tant que le serveur ne répond pas (drapeau, offre, migration) — alors rien n'est montré.
  const [rel, setRel] = useState<DonneesRelances | null>(null)
  const [nomArtisan, setNomArtisan] = useState<string | null>(null)

  // Le filtre est ici EN PLUS de la RLS, pas à sa place : la migration 0074 a retiré aux
  // fondateurs la vue sur les lignes des autres, et cette ligne dit la même chose une seconde
  // fois. Deux verrous pour la même porte, parce que celui du navigateur se lit plus vite.
  async function load() {
    const { data: fs } = await supabase.from('factures').select('id, numero, objet, client_nom, statut, total_ttc, date_echeance, avoir_de').eq('artisan_id', (await supabase.auth.getUser()).data.user?.id ?? '').order('created_at', { ascending: false })
    setFactures((fs as Facture[]) ?? [])
  }

  const jeton = async () => (await supabase.auth.getSession()).data.session?.access_token ?? null
  async function chargerRelances() {
    if (!drapeau('relancesImpayes')) return
    const t = await jeton()
    const rep = t ? await fetch('/api/factures/relances-auto', { headers: { Authorization: `Bearer ${t}` }, cache: 'no-store' }).catch(() => null) : null
    setRel(rep?.ok ? ((await rep.json().catch(() => null)) as DonneesRelances | null) : null)
  }
  async function arretRelances(f: Facture, action: 'arreter' | 'reprendre') {
    setBusy(f.id)
    const t = await jeton()
    const rep = t ? await fetch('/api/factures/relances-auto', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ facture_id: f.id, action }) }).catch(() => null) : null
    if (!rep?.ok) alert('Action impossible. Réessayez dans un instant.')
    await chargerRelances(); setBusy(null)
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const { data: prof } = await supabase.from('artisans').select('id').eq('id', data.session.user.id).maybeSingle()
      if (!prof) { router.replace('/onboarding'); return }
      setNomArtisan(((await supabase.from('artisans').select('nom').eq('id', data.session.user.id).maybeSingle()).data as { nom?: string | null } | null)?.nom ?? null)
      await Promise.all([load(), chargerRelances()])
      setReady(true)
    })
  }, [router])

  async function pdf(f: Facture) {
    if (estNatif()) return pdfNatif(f) // la coque (v9) : pas d'onglet ni de dossier Téléchargements — la feuille de partage
    // Ouvre un onglet DANS le geste utilisateur (sinon bloqué par le navigateur, surtout mobile).
    const win = window.open('', '_blank')
    setBusy(f.id)
    const { data } = await supabase.auth.getSession()
    const res = await fetch(`/api/factures/${f.id}/pdf`, { headers: { Authorization: `Bearer ${data.session?.access_token}` } })
    setBusy(null)
    if (!res.ok) { win?.close(); alert('Impossible d’ouvrir le PDF. Réessayez dans un instant.'); return }
    const url = URL.createObjectURL(await res.blob())
    if (win) win.location.href = url
    else { const a = document.createElement('a'); a.href = url; a.download = `${f.numero || 'facture'}.pdf`; a.click() }
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  /** Le XML Factur-X : la même pièce que le PDF, dans le format que réclament les comptables et
   *  les donneurs d'ordre publics. Téléchargé plutôt qu'ouvert : aucun navigateur ne sait l'afficher. */
  async function facturx(f: Facture) {
    setBusy(f.id)
    const { data } = await supabase.auth.getSession()
    const res = await fetch(`/api/factures/${f.id}/facturx`, { headers: { Authorization: `Bearer ${data.session?.access_token}` } })
    setBusy(null)
    if (!res.ok) {
      const corps = await res.json().catch(() => ({} as { error?: string }))
      alert(corps.error ?? 'Impossible de produire le fichier XML Factur-X pour l’instant.')
      return
    }
    const url = URL.createObjectURL(await res.blob())
    const a = document.createElement('a')
    a.href = url; a.download = `${f.numero || 'facture'}.xml`; a.click()
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  /** Dans l'application : le PDF part par la feuille native (Fichiers, Mail, WhatsApp…). */
  async function pdfNatif(f: Facture) {
    setBusy(f.id)
    const { data } = await supabase.auth.getSession()
    const res = await fetch(`/api/factures/${f.id}/pdf`, { headers: { Authorization: `Bearer ${data.session?.access_token}` } })
    setBusy(null)
    if (!res.ok) { alert('Impossible d’ouvrir le PDF. Réessayez dans un instant.'); return }
    const r = await partagerFichier(`${f.numero || 'facture'}.pdf`, await res.blob(), { titre: `Facture ${f.numero || ''}`.trim(), texte: 'Votre facture, en pièce jointe.' })
    if (r === 'natif' || r === 'web') void vibrer('leger')
    if (r === 'aucun') alert('Partage impossible sur cet appareil.')
  }

  async function setStatut(f: Facture, statut: string) {
    setBusy(f.id)
    const { data } = await supabase.auth.getSession()
    const res = await fetch(`/api/factures/${f.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` }, body: JSON.stringify({ statut }) })
    if (!res.ok) alert('Action impossible. Réessayez dans un instant.')
    await load(); setBusy(null)
  }

  async function annuler(f: Facture) {
    // Une facture émise s'annule par un AVOIR : pièce négative, numérotée dans la même séquence,
    // conservée comme la facture (art. 289 CGI). Le statut « annulée » est posé par l'avoir.
    if (!confirm(`Émettre un avoir qui annule la facture ${f.numero || ''} ? L'avoir est une pièce négative, numérotée et conservée comme la facture — rien n'est supprimé.`)) return
    setBusy(f.id)
    const { data } = await supabase.auth.getSession()
    const res = await fetch(`/api/factures/${f.id}/avoir`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token}` }, body: '{}' })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) alert(d.error || 'Avoir impossible. Réessayez dans un instant.')
    await load(); setBusy(null)
  }

  /** Ce que le journal des relances dit de cette facture, et le geste d'arrêt ou de reprise. */
  function ligneRelance(f: Facture) {
    const a = rel!.arrets.find((x) => x.facture_id === f.id && !x.reprise_le) ?? null
    const fr: FactureRelancable = { id: f.id, artisan_id: '', numero: f.numero, statut: f.statut, avoir_de: f.avoir_de, date_echeance: f.date_echeance, total_ttc: f.total_ttc, client_nom: f.client_nom, client_email: null }
    const texte = etatPourEcran({ facture: fr, reglages: rel!.reglages, journal: rel!.journal.filter((j) => j.facture_id === f.id), arret: a, maintenant: new Date() })
    const relancable = f.statut === 'emise' && !f.avoir_de
    if (!texte && !relancable) return null
    if (!texte && !(rel!.reglages.actif)) return null
    return (
      <span className="dc-relance" data-relance-facture={f.id}>
        {texte ?? 'Relances automatiques : aucune relance prévue pour le moment'}
        {relancable && (a
          ? <button type="button" className="rel-lien" disabled={busy === f.id} onClick={(e) => { e.stopPropagation(); void arretRelances(f, 'reprendre') }}>Reprendre les relances</button>
          : rel!.reglages.actif && <button type="button" className="rel-lien" disabled={busy === f.id} onClick={(e) => { e.stopPropagation(); void arretRelances(f, 'arreter') }}>Arrêter les relances</button>)}
      </span>
    )
  }

  const aEncaisser = factures.filter((f) => famille(f) === 'a_encaisser')
  const payees = factures.filter((f) => famille(f) === 'payees')
  const vue = filtre !== 'toutes' && factures.some((f) => famille(f) === filtre) ? filtre : 'toutes'

  return (
    <AppShell active="factures" title="Factures" crumb="Vos documents">
      {!ready ? (
        <p className="muted">Chargement…</p>
      ) : factures.length === 0 ? (
        <>
        {rel && <RelancesAuto donnees={rel} obtenirJeton={jeton} nomArtisan={nomArtisan} apresEnregistrement={chargerRelances} />}
        <div className="psh-panel">
          <div className="psh-empty">Aucune facture pour l’instant.<br />Ouvrez un devis et cliquez « Créer la facture » : Presti reprend les lignes, applique la bonne numérotation et sort un PDF conforme.</div>
        </div>
        </>
      ) : (
        <>
          {rel && <RelancesAuto donnees={rel} obtenirJeton={jeton} nomArtisan={nomArtisan} apresEnregistrement={chargerRelances} />}
          {/* Le résumé se calcule sur la liste affichée ci-dessous : rien d'autre n'est lu. */}
          <section className="docs-resume" aria-label="Résumé de vos factures">
            <div className="docs-tuile">
              <span className="lab">À encaisser</span>
              <b className="tnum">{eur(somme(aEncaisser))}</b>
              <span className="sub">{aEncaisser.length} facture{aEncaisser.length > 1 ? 's' : ''} · TTC</span>
            </div>
            <div className="docs-tuile ok">
              <span className="lab">Encaissé</span>
              <b className="tnum">{eur(somme(payees))}</b>
              <span className="sub">{payees.length} facture{payees.length > 1 ? 's' : ''} payée{payees.length > 1 ? 's' : ''} · TTC</span>
            </div>
            <div className="docs-tuile">
              <span className="lab">Pièces émises</span>
              <b className="tnum">{factures.length}</b>
              <span className="sub">factures et avoirs</span>
            </div>
          </section>

          <div className="docs-filtres" role="group" aria-label="Filtrer les factures">
            <button type="button" aria-pressed={vue === 'toutes'} onClick={() => setFiltre('toutes')}>Toutes <em>{factures.length}</em></button>
            {FILTRES.filter(([f]) => factures.some((x) => famille(x) === f)).map(([f, libelle]) => (
              <button type="button" key={f} aria-pressed={vue === f} onClick={() => setFiltre(f)}>{libelle} <em>{factures.filter((x) => famille(x) === f).length}</em></button>
            ))}
          </div>

        <div className="psh-panel">
          <div className="doc-list doc-list--grille doc-list--factures">
            {factures.filter((f) => vue === 'toutes' || famille(f) === vue).map((f) => {
              const b = BADGE[f.statut ?? 'emise'] ?? BADGE.emise
              const active = f.statut !== 'annulee' && !f.avoir_de
              return (
                <div className="doc-card" key={f.id}>
                  <span className="dc-ava" aria-hidden="true">{initiales(f.client_nom)}</span>
                  <div className="dc-main" onClick={() => pdf(f)} title="Voir le PDF">
                    <div className="dc-top">
                      <span className="dc-num">{f.numero ?? '—'}</span>
                      <span className={`pill ${b.pill}`}><span className="pdot" />{f.avoir_de ? 'Avoir' : b.label}</span>
                    </div>
                    <span className="dc-cli">{f.client_nom || 'Client'}</span>
                    <span className="dc-obj">{f.objet || 'Sans objet'}</span>
                    {rel && ligneRelance(f)}
                  </div>
                  <span className="dc-amt">{eur(f.total_ttc ?? 0)}</span>
                  <div className="dc-actions">
                    <button className="btn btn--ghost" disabled={busy === f.id} onClick={() => pdf(f)}>PDF</button>
                    {/* Factur-X : vendu dans les trois offres, et jusqu'au 08/09 aucun écran ne
                        permettait de l'obtenir. Seulement sur une facture émise : un brouillon
                        n'a pas de pièce électronique à produire. */}
                    {f.statut && f.statut !== 'brouillon'
                      ? <button className="btn btn--ghost" disabled={busy === f.id} onClick={() => facturx(f)} title="Fichier XML Factur-X à télécharger, pour votre comptable ou un donneur d'ordre public">XML</button>
                      : null}
                    {active && f.statut !== 'payee' && (
                      <button className="btn btn--ghost" disabled={busy === f.id} onClick={() => setStatut(f, 'payee')}>Marquer payée</button>
                    )}
                    {active && (
                      <button className="btn btn--ghost danger" disabled={busy === f.id} onClick={() => annuler(f)}>Émettre un avoir</button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        </>
      )}
    </AppShell>
  )
}
