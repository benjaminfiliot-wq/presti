'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'

type Devis = { id: string; numero: string | null; objet: string | null; client_nom: string | null; statut: string | null; total_ttc: number | null; date_emission: string | null }

const BADGE: Record<string, { label: string; pill: string }> = {
  brouillon: { label: 'Brouillon', pill: 'muted' },
  envoye: { label: 'Envoyé', pill: 'info' },
  accepte: { label: 'Accepté', pill: 'ok' },
  refuse: { label: 'Refusé', pill: 'crit' },
  expire: { label: 'Expiré', pill: 'muted' },
}
const eur = (n: number) => `${(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
const initiales = (n: string | null) => (n ? n.replace(/^(M\.|Mme|Mlle)\s+(et\s+(M\.|Mme)\s+)?/i, '').trim().split(/\s+/).slice(0, 2).map((x) => x[0]?.toUpperCase()).join('') : '?')
const somme = (l: Devis[]) => l.reduce((t, d) => t + (d.total_ttc ?? 0), 0)
const statutDe = (d: Devis) => d.statut ?? 'brouillon'
// Les filtres : « Tous », puis chaque statut présent dans la liste (un filtre vide ne s'affiche pas).
const FILTRES: [string, string][] = [['brouillon', 'Brouillons'], ['envoye', 'Envoyés'], ['accepte', 'Acceptés'], ['refuse', 'Refusés'], ['expire', 'Expirés']]

export default function DevisList() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [devis, setDevis] = useState<Devis[]>([])
  const [busy, setBusy] = useState<string | null>(null)
  const [filtre, setFiltre] = useState<string>('tous')
  // Une lecture qui échoue se dit : « Aucun devis » sur une panne réseau était un mensonge (audit du 11/10).
  const [erreur, setErreur] = useState(false)

  // Le filtre est ici EN PLUS de la RLS, pas à sa place : la migration 0074 a retiré aux
  // fondateurs la vue sur les lignes des autres, et cette ligne dit la même chose une seconde
  // fois. Deux verrous pour la même porte, parce que celui du navigateur se lit plus vite.
  async function load() {
    const { data: ds, error } = await supabase.from('devis').select('id, numero, objet, client_nom, statut, total_ttc, date_emission').eq('artisan_id', (await supabase.auth.getUser()).data.user?.id ?? '').order('created_at', { ascending: false })
    if (error) throw error
    setDevis((ds as Devis[]) ?? [])
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const { data: prof, error: eProf } = await supabase.from('artisans').select('id').eq('id', data.session.user.id).maybeSingle()
      if (eProf) throw eProf
      if (!prof) { router.replace('/onboarding'); return }
      await load()
      setReady(true)
    }).catch(() => { setErreur(true); setReady(true) })
  }, [router])

  async function supprimer(d: Devis) {
    if (!confirm(`Supprimer le devis ${d.numero || ''} ? Cette action est définitive.`)) return
    setBusy(d.id)
    const { data } = await supabase.auth.getSession()
    const res = await fetch(`/api/devis/${d.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${data.session?.access_token}` } })
    if (res.ok) await load().catch(() => setErreur(true))
    else alert('Suppression impossible. Réessayez dans un instant.')
    setBusy(null)
  }

  const envoyes = devis.filter((d) => statutDe(d) === 'envoye')
  const acceptes = devis.filter((d) => statutDe(d) === 'accepte')
  // Un filtre qui ne vise plus rien (le dernier brouillon vient d'être supprimé) retombe sur « Tous ».
  const vue = filtre !== 'tous' && devis.some((d) => statutDe(d) === filtre) ? filtre : 'tous'

  const nouveau = (
    <a className="psh-btn primary" href="/devis/nouveau">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
      Nouveau devis
    </a>
  )

  return (
    <AppShell active="devis" title="Devis" crumb="Vos documents" actions={nouveau}>
      {!ready ? (
        <p className="muted">Chargement…</p>
      ) : erreur ? (
        <div className="msg err" role="alert">Vos devis n’ont pas pu être chargés. Vérifiez votre connexion, puis <button type="button" className="btn" style={{ width: 'auto', margin: '0 0 0 .4rem', display: 'inline-block' }} onClick={() => window.location.reload()}>réessayez</button></div>
      ) : devis.length === 0 ? (
        <div className="psh-panel">
          <div className="psh-empty">Aucun devis pour l’instant.<br />Cliquez sur « Nouveau devis » : décrivez le chantier, l’IA le chiffre, vous ajustez, et vous envoyez un PDF conforme.</div>
        </div>
      ) : (
        <>
          {/* Le résumé se calcule sur la liste affichée ci-dessous : rien d'autre n'est lu. */}
          <section className="docs-resume" aria-label="Résumé de vos devis">
            <div className="docs-tuile">
              <span className="lab">En attente de réponse</span>
              <b className="tnum">{eur(somme(envoyes))}</b>
              <span className="sub">{envoyes.length} devis envoyé{envoyes.length > 1 ? 's' : ''} · TTC</span>
            </div>
            <div className="docs-tuile ok">
              <span className="lab">Acceptés</span>
              <b className="tnum">{eur(somme(acceptes))}</b>
              <span className="sub">{acceptes.length} devis · TTC</span>
            </div>
            <div className="docs-tuile">
              <span className="lab">Brouillons</span>
              <b className="tnum">{devis.filter((d) => statutDe(d) === 'brouillon').length}</b>
              <span className="sub">à finir et envoyer</span>
            </div>
          </section>

          <div className="docs-filtres" role="group" aria-label="Filtrer les devis">
            <button type="button" aria-pressed={vue === 'tous'} onClick={() => setFiltre('tous')}>Tous <em>{devis.length}</em></button>
            {FILTRES.filter(([f]) => devis.some((d) => statutDe(d) === f)).map(([f, libelle]) => (
              <button type="button" key={f} aria-pressed={vue === f} onClick={() => setFiltre(f)}>{libelle} <em>{devis.filter((d) => statutDe(d) === f).length}</em></button>
            ))}
          </div>

        <div className="psh-panel">
          <div className="doc-list doc-list--grille">
            {devis.filter((d) => vue === 'tous' || statutDe(d) === vue).map((d) => {
              const b = BADGE[d.statut ?? 'brouillon'] ?? BADGE.brouillon
              return (
                <div className="doc-card" key={d.id}>
                  <span className="dc-ava" aria-hidden="true">{initiales(d.client_nom)}</span>
                  <div className="dc-main" onClick={() => router.push(`/devis/${d.id}`)} title="Ouvrir le devis">
                    <div className="dc-top">
                      <span className="dc-num">{d.numero ?? '—'}</span>
                      <span className={`pill ${b.pill}`}><span className="pdot" />{b.label}</span>
                    </div>
                    <span className="dc-cli">{d.client_nom || 'Client'}</span>
                    <span className="dc-obj">{d.objet || 'Sans objet'}</span>
                  </div>
                  <span className="dc-amt">{eur(d.total_ttc ?? 0)}</span>
                  <div className="dc-actions">
                    <button className="btn btn--ghost" onClick={() => router.push(`/devis/${d.id}`)}>Ouvrir</button>
                    {/* Un devis parti chez le client se conserve (art. L. 123-22 c. com.) : le bouton
                        n'existe pas, plutôt que d'exister et de répondre 409. */}
                    {(d.statut ?? 'brouillon') === 'brouillon'
                      ? <button className="btn btn--ghost danger" disabled={busy === d.id} onClick={() => supprimer(d)}>Supprimer</button>
                      : <span className="dc-garde" title="La loi impose de conserver un devis envoyé"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>Conservé</span>}
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
