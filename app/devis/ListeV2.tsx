'use client'

// La liste des devis de la console v2 (refonte 18/10, étape 5.4 ; ARCHITECTURE.md §2.4). Audit 18/10, défaut 8 : une carte
// de ~100 px par devis, un avatar « E » identique partout, pas de filtre « À relancer », pas de date ni de dernier geste.
// Ici : un tableau à lignes de 48 px (cartes compactes sur téléphone), filtres en pastilles dont « À relancer » (MÊME règle
// que Mes chiffres : lib/tableau-de-bord/calculer.ts), une colonne « Dernier geste », et l'action de la ligne :
// Relire (brouillon), Relancer (à relancer), Facturer (accepté, pas encore facturé : la facture se crée ici, après
// confirmation, par la même route que la fiche), Ouvrir sinon. Raccourcis : N nouveau devis, / chercher.
import '@/components/ui/ui.css'
import './liste-v2.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import { EtatVide, Squelette, Statut, TuileChiffre } from '@/components/ui/base'
import { toast } from '@/components/ui/Toasts'
import { Icone } from '@/components/ui/icones'
import { calculer } from '@/lib/tableau-de-bord/calculer'

type Devis = { id: string; artisan_id: string | null; numero: string | null; objet: string | null; client_nom: string | null; statut: string | null; total_ttc: number | null; date_emission: string | null; envoye_le: string | null; accepte_le: string | null; created_at: string | null; validite_jours: number | null }
type Filtre = 'tous' | 'brouillon' | 'relancer' | 'envoye' | 'accepte' | 'refuse' | 'expire'
const eur = (n: number) => `${(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
const STATUT: Record<string, { libelle: string; ton: 'neutre' | 'accent' | 'warn' | 'ok' | 'crit' }> = {
  brouillon: { libelle: 'Brouillon', ton: 'neutre' }, envoye: { libelle: 'Envoyé', ton: 'accent' }, relancer: { libelle: 'À relancer', ton: 'warn' },
  accepte: { libelle: 'Accepté', ton: 'ok' }, refuse: { libelle: 'Refusé', ton: 'crit' }, expire: { libelle: 'Expiré', ton: 'neutre' },
}
const joursDepuis = (iso: string | null) => (iso ? Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)) : null)
const ilYa = (j: number | null) => (j === null ? '' : j === 0 ? 'aujourd’hui' : j === 1 ? 'hier' : `il y a ${j} j`)
const jeton = async () => (await supabase.auth.getSession()).data.session?.access_token ?? null

export default function DevisV2() {
  const router = useRouter()
  const [devis, setDevis] = useState<Devis[] | null>(null)
  const [factures, setFactures] = useState<Map<string, string>>(new Map())
  const [erreur, setErreur] = useState(false)
  const [filtre, setFiltre] = useState<Filtre>('tous')
  const [q, setQ] = useState('')
  const [occupe, setOccupe] = useState<string | null>(null)
  const champ = useRef<HTMLInputElement>(null)

  const charger = useCallback(async () => {
    const { data: s } = await supabase.auth.getSession()
    if (!s.session) { router.replace('/login'); return }
    const uid = s.session.user.id
    // `.eq('artisan_id')` en plus de la RLS (même raison que la liste actuelle : deux verrous pour la même porte).
    const [d, f] = await Promise.all([
      supabase.from('devis').select('id, artisan_id, numero, objet, client_nom, statut, total_ttc, date_emission, envoye_le, accepte_le, created_at, validite_jours').eq('artisan_id', uid).order('created_at', { ascending: false }),
      supabase.from('factures').select('numero, devis_id').eq('artisan_id', uid).not('devis_id', 'is', null),
    ])
    if (d.error) { setErreur(true); return }
    setDevis((d.data as Devis[]) ?? [])
    setFactures(new Map(((f.data ?? []) as { numero: string | null; devis_id: string | null }[]).filter((x) => x.devis_id).map((x) => [x.devis_id as string, x.numero ?? 'facture'])))
  }, [router])
  useEffect(() => { void charger() }, [charger])

  // « À relancer » : la règle de Mes chiffres, appliquée aux mêmes champs.
  const aRelancer = useMemo(() => {
    if (!devis?.length) return new Set<string>()
    const i = calculer({ artisanId: devis[0].artisan_id ?? '', devis, factures: [], demandes: [], maintenant: new Date() })
    return new Set(i.aRelancer.liste.map((x) => x.id))
  }, [devis])
  const etat = useCallback((d: Devis): Filtre => (aRelancer.has(d.id) ? 'relancer' : ((d.statut ?? 'brouillon') as Filtre)), [aRelancer])

  // Raccourcis : N (nouveau devis), / (chercher). Jamais dans un champ de saisie.
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      const c = e.target as HTMLElement | null
      if (c && (c.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(c.tagName))) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'n' || e.key === 'N') { e.preventDefault(); router.push('/devis/nouveau') }
      else if (e.key === '/') { e.preventDefault(); champ.current?.focus() }
    }
    document.addEventListener('keydown', surTouche)
    return () => document.removeEventListener('keydown', surTouche)
  }, [router])

  async function facturer(d: Devis) {
    if (!confirm(`Créer la facture du devis ${d.numero ?? ''} (${eur(d.total_ttc ?? 0)}) ? Une facture émise se conserve : elle ne se supprime pas, elle s'annule par un avoir.`)) return
    setOccupe(d.id)
    const t = await jeton()
    const r = await fetch('/api/factures', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }, body: JSON.stringify({ devis_id: d.id }) }).catch(() => null)
    const corps = r ? await r.json().catch(() => ({})) as { error?: string } : {}
    setOccupe(null)
    if (!r?.ok) { toast(corps.error ?? 'La facture n’a pas pu être créée. Réessayez dans un instant.', 'crit'); return }
    toast(`Facture créée pour le devis ${d.numero ?? ''}`)
    void charger()
  }

  const visibles = useMemo(() => {
    const m = q.trim().toLowerCase()
    return (devis ?? []).filter((d) => (filtre === 'tous' || etat(d) === filtre) && (!m || `${d.numero ?? ''} ${d.client_nom ?? ''} ${d.objet ?? ''}`.toLowerCase().includes(m)))
  }, [devis, filtre, q, etat])

  const nouveau = <a className="ui-btn ui-btn--p" href="/devis/nouveau"><Icone nom="ajouter" /><span className="dv2-lib">Nouveau devis</span><span className="dv2-lib-court" aria-hidden="true">Nouveau</span> <span className="ui-kbd dv2-lib">N</span></a>

  if (erreur) return (
    <AppShell active="devis" title="Devis" crumb="Vos documents" actions={nouveau}>
      <div className="msg err" role="alert">Vos devis n’ont pas pu être chargés. Vérifiez votre connexion, puis <button type="button" className="ui-btn ui-btn--s ui-btn--xs" onClick={() => { setErreur(false); void charger() }}>réessayez</button></div>
    </AppShell>
  )
  if (!devis) return <AppShell active="devis" title="Devis" crumb="Vos documents" actions={nouveau}><Squelette variante="chiffres" lignes={3} /><Squelette variante="tableau" lignes={5} etiquette="Chargement de vos devis…" /></AppShell>
  if (devis.length === 0) return (
    <AppShell active="devis" title="Devis" crumb="Vos documents" actions={nouveau}>
      <EtatVide icone="devis" titre="Aucun devis pour l’instant" texte="Décrivez le chantier : l’IA le chiffre sur vos prix, vous ajustez, et vous envoyez un PDF conforme." action={{ href: '/devis/nouveau', libelle: 'Faire un premier devis' }} />
    </AppShell>
  )

  const somme = (l: Devis[]) => l.reduce((t, d) => t + (d.total_ttc ?? 0), 0)
  const enCours = devis.filter((d) => ['brouillon', 'envoye'].includes(d.statut ?? 'brouillon'))
  const acceptes = devis.filter((d) => d.statut === 'accepte')
  const envoyes = devis.filter((d) => ['envoye', 'accepte', 'refuse', 'expire'].includes(d.statut ?? ''))
  const compte = (f: Filtre) => devis.filter((d) => etat(d) === f).length
  const FILTRES: [Filtre, string][] = [['tous', 'Tous'], ['brouillon', 'Brouillons'], ['relancer', 'À relancer'], ['envoye', 'Envoyés'], ['accepte', 'Acceptés'], ['refuse', 'Refusés'], ['expire', 'Expirés']]

  const geste = (d: Devis) => {
    if (d.statut === 'accepte') return factures.has(d.id) ? `Facturé · ${factures.get(d.id)}` : `Accepté ${ilYa(joursDepuis(d.accepte_le))}`
    if (d.statut === 'envoye' || d.statut === 'refuse' || d.statut === 'expire') return `Envoyé ${ilYa(joursDepuis(d.envoye_le ?? d.date_emission))}`
    return `Créé ${ilYa(joursDepuis(d.created_at))}`
  }
  const action = (d: Devis) => {
    const e = etat(d)
    if (e === 'brouillon') return <a className="ui-btn ui-btn--s ui-btn--xs" href={`/devis/${d.id}`}>Relire</a>
    if (e === 'relancer') return <a className="ui-btn ui-btn--s ui-btn--xs" href={`/devis/${d.id}`}>Relancer</a>
    if (e === 'accepte' && !factures.has(d.id)) return <button type="button" className="ui-btn ui-btn--s ui-btn--xs" disabled={occupe === d.id} onClick={() => void facturer(d)}>{occupe === d.id ? 'Création…' : 'Facturer'}</button>
    return <a className="ui-btn ui-btn--s ui-btn--xs" href={`/devis/${d.id}`}>Ouvrir</a>
  }

  return (
    <AppShell active="devis" title="Devis" crumb="Vos documents" actions={nouveau} wide>
      <div className="ui-tuiles dv2-resume">
        <div className="ui-carte"><TuileChiffre libelle="En cours" valeur={somme(enCours)} format="euros" sous={`${enCours.length} devis en brouillon ou envoyés`} /></div>
        <div className="ui-carte"><TuileChiffre libelle="Acceptés" valeur={somme(acceptes)} format="euros" ton="ok" sous={`${acceptes.length} devis`} /></div>
        <div className="ui-carte"><TuileChiffre libelle="Taux de signature" valeur={envoyes.length ? (acceptes.length / envoyes.length) * 100 : null} format="pourcent" sous={envoyes.length ? `sur ${envoyes.length} devis envoyés` : 'aucun devis envoyé'} /></div>
      </div>
      <div className="dv2-barre">
        <div className="dv2-filtres" role="group" aria-label="Filtrer les devis">
          {FILTRES.filter(([f]) => f === 'tous' || compte(f) > 0).map(([f, libelle]) => (
            <button key={f} type="button" className="dv2-pil" aria-pressed={filtre === f} onClick={() => setFiltre(f)}>{libelle} <b className="ui-mono">{f === 'tous' ? devis.length : compte(f)}</b></button>
          ))}
        </div>
        <label className="dv2-cherche"><Icone nom="cherche" /><span className="ui-sr">Chercher un devis</span><input ref={champ} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Client, numéro, objet…" /><span className="ui-kbd dv2-kbd">/</span></label>
      </div>
      <div className="ui-carte dv2-cadre">
        <table className="dv2-tab">
          <thead><tr><th>Numéro</th><th>Client</th><th>Objet</th><th className="d">Montant TTC</th><th>Statut</th><th>Dernier geste</th><th className="d"><span className="ui-sr">Action</span></th></tr></thead>
          <tbody>
            {visibles.map((d) => {
              const s = STATUT[etat(d)] ?? STATUT.brouillon
              return (
                <tr key={d.id} onClick={(e) => { if (!(e.target as HTMLElement).closest('a,button')) router.push(`/devis/${d.id}`) }}>
                  <td className="ui-mono"><a href={`/devis/${d.id}`} className="dv2-num">{d.numero ?? '—'}</a></td>
                  <td className="dv2-client">{d.client_nom || 'Client'}</td>
                  <td className="dv2-objet">{d.objet || 'Sans objet'}</td>
                  <td className="d ui-mono">{eur(d.total_ttc ?? 0)}</td>
                  <td><Statut ton={s.ton}>{s.libelle}</Statut></td>
                  <td className="dv2-geste">{geste(d)}</td>
                  <td className="d">{action(d)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <ul className="dv2-cartes">
          {visibles.map((d) => {
            const s = STATUT[etat(d)] ?? STATUT.brouillon
            return (
              <li key={d.id} className="dv2-carte-bloc">
                <a href={`/devis/${d.id}`} className="dv2-carte">
                  <b>{d.client_nom || 'Client'}</b><span className="ui-mono dv2-m">{eur(d.total_ttc ?? 0)}</span>
                  <small>{d.numero ?? '—'} · {geste(d)}</small><Statut ton={s.ton}>{s.libelle}</Statut>
                </a>
                {['brouillon', 'relancer'].includes(etat(d)) || (etat(d) === 'accepte' && !factures.has(d.id)) ? <div className="dv2-carte-act">{action(d)}</div> : null}
              </li>
            )
          })}
        </ul>
        {visibles.length === 0 ? <p className="dv2-rien">Aucun devis ne correspond.</p> : null}
      </div>
      <p className="dv2-aide" aria-hidden="true"><span className="ui-kbd">N</span> nouveau devis · <span className="ui-kbd">/</span> chercher</p>
    </AppShell>
  )
}
