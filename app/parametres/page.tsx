'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'
import { mentionFranchise, type BaseMention } from '@/lib/facturation'
import { mentionsManquantes } from '@/lib/legalArtisan'

// Paramètres à onglets (v4 §C2). Choix assumé : on n'a PAS rasé /profil qui fonctionne.
// Cette page porte les sections qui n'existaient nulle part (entreprise & légal, sécurité,
// données) et renvoie vers les écrans déjà en place pour le reste.

type Onglet = 'legal' | 'securite' | 'donnees' | 'raccourcis'
const ONGLETS: { id: Onglet; label: string }[] = [
  { id: 'legal', label: 'Entreprise & légal' },
  { id: 'securite', label: 'Sécurité' },
  { id: 'donnees', label: 'Données & confidentialité' },
  { id: 'raccourcis', label: 'Le reste' },
]

type Legal = { siret: string; tva_num: string; iban: string; forme_juridique: string; adresse: string; code_postal: string; ville: string; assurance_nom: string; assurance_contrat: string; assurance_zone: string; assurance_activites: string; mediateur_nom: string; mediateur_url: string }
const LEGAL_VIDE: Legal = { siret: '', tva_num: '', iban: '', forme_juridique: '', adresse: '', code_postal: '', ville: '', assurance_nom: '', assurance_contrat: '', assurance_zone: '', assurance_activites: '', mediateur_nom: '', mediateur_url: '' }

function ParametresInner() {
  const router = useRouter()
  const params = useSearchParams()
  const [onglet, setOnglet] = useState<Onglet>('legal')
  const [ready, setReady] = useState(false)
  const [uid, setUid] = useState('')
  const [legal, setLegal] = useState<Legal>(LEGAL_VIDE)
  const [aTva, setATva] = useState(false)
  const [mentionBase, setMentionBase] = useState<BaseMention>('auto')
  const [saving, setSaving] = useState(false)
  const [mdp, setMdp] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    const o = params.get('onglet') as Onglet | null
    if (o && ONGLETS.some((x) => x.id === o)) setOnglet(o)
  }, [params])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const id = data.session.user.id
      setUid(id)
      const { data: a } = await supabase.from('artisans').select('*').eq('id', id).maybeSingle()
      if (!a) { router.replace('/onboarding'); return }
      setLegal({
        siret: a.siret ?? '', tva_num: a.tva_num ?? '', iban: a.iban ?? '',
        forme_juridique: a.forme_juridique ?? '', adresse: a.adresse ?? '', code_postal: a.code_postal ?? '', ville: a.ville ?? '',
        mediateur_nom: a.mediateur_nom ?? '', mediateur_url: a.mediateur_url ?? '',
        assurance_nom: a.assurance_nom ?? '', assurance_contrat: a.assurance_contrat ?? '',
        assurance_zone: a.assurance_zone ?? '', assurance_activites: a.assurance_activites ?? '',
      })
      setATva(!!a.tva_num)
      setMentionBase((a.mention_tva_base as BaseMention) ?? 'auto')
      setReady(true)
    })
  }, [router])

  // Même source de vérité que la page de mentions légales : ce qui manque ici est
  // exactement ce qui s'affichera « non communiqué » sur le site de l'artisan.
  const manquantes = mentionsManquantes({
    nom: null, metier: null,
    forme_juridique: legal.forme_juridique || null, siret: legal.siret || null,
    adresse: legal.adresse || null, code_postal: legal.code_postal || null, ville: legal.ville || null,
    tel_public: null, email_public: null, tva_num: legal.tva_num || null,
    assurance_nom: legal.assurance_nom || null, assurance_contrat: legal.assurance_contrat || null,
    assurance_activites: legal.assurance_activites || null, assurance_zone: legal.assurance_zone || null,
    zone_intervention: null,
    mediateur_nom: legal.mediateur_nom || null, mediateur_url: legal.mediateur_url || null,
  }).filter((m) => m !== 'Dénomination' && m !== 'Contact') // renseignés dans « Ma page »

  function setL<K extends keyof Legal>(k: K, v: string) { setLegal((p) => ({ ...p, [k]: v })) }

  async function enregistrerLegal() {
    if (saving) return
    setSaving(true); setMsg(null)
    const { error } = await supabase.from('artisans').update({
      siret: legal.siret.trim() || null,
      forme_juridique: legal.forme_juridique.trim() || null,
      adresse: legal.adresse.trim() || null,
      code_postal: legal.code_postal.trim() || null,
      ville: legal.ville.trim() || null,
      mediateur_nom: legal.mediateur_nom.trim() || null,
      mediateur_url: legal.mediateur_url.trim() || null,
      tva_num: aTva ? (legal.tva_num.trim() || null) : null,
      // Cette ligne manquait : la case « assujetti à la TVA » n'écrivait que le NUMÉRO,
      // jamais le RÉGIME. Un artisan qui cochait la case et saisissait son n° de TVA
      // continuait donc à émettre des devis et factures à 0 % avec la mention
      // « TVA non applicable ». TVA non collectée sur chaque chantier, mention fausse
      // sur chaque pièce. Trouvé par l'audit indépendant du 2026-09-03.
      tva_regime: aTva ? 'reel' : 'franchise',
      mention_tva_base: mentionBase,
      iban: legal.iban.replace(/\s+/g, '').toUpperCase() || null,
      assurance_nom: legal.assurance_nom.trim() || null,
      assurance_contrat: legal.assurance_contrat.trim() || null,
      assurance_zone: legal.assurance_zone.trim() || null,
      assurance_activites: legal.assurance_activites.trim() || null,
    }).eq('id', uid)
    setSaving(false)
    setMsg(error ? { type: 'err', text: 'Enregistrement impossible.' } : { type: 'ok', text: 'Informations enregistrées ✅' })
    setTimeout(() => setMsg(null), 2600)
  }

  async function changerMdp() {
    if (busy) return
    if (mdp.length < 8) { setMsg({ type: 'err', text: 'Choisissez au moins 8 caractères.' }); return }
    setBusy(true); setMsg(null)
    const { error } = await supabase.auth.updateUser({ password: mdp })
    setBusy(false); setMdp('')
    setMsg(error ? { type: 'err', text: 'Changement impossible.' } : { type: 'ok', text: 'Mot de passe modifié ✅' })
  }

  async function deconnecterAutres() {
    if (busy) return
    setBusy(true); setMsg(null)
    // On passe par le serveur : `signOut({ scope: 'others' })` seul ne révoque que les
    // jetons de rafraîchissement, et un jeton d'accès déjà copié continuait de fonctionner
    // jusqu'à une heure. La route pose une date de révocation que toutes les routes de
    // Presti vérifient — l'effet est immédiat (v4 §11).
    const t = (await supabase.auth.getSession()).data.session?.access_token
    const r = await fetch('/api/securite/sessions', { method: 'POST', headers: { Authorization: `Bearer ${t}` } })
    setBusy(false)
    if (!r.ok) { setMsg({ type: 'err', text: 'Action impossible.' }); return }
    setMsg({ type: 'ok', text: 'Toutes vos sessions sont fermées. Reconnexion…' })
    await supabase.auth.signOut()
    setTimeout(() => router.replace('/login'), 1200)
  }

  async function exporter() {
    const t = (await supabase.auth.getSession()).data.session?.access_token
    const res = await fetch('/api/donnees/export', { headers: { Authorization: `Bearer ${t}` } })
    if (!res.ok) { setMsg({ type: 'err', text: 'Export impossible.' }); return }
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `mes-donnees-presti-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
  }

  if (!ready) return <AppShell active="parametres" title="Paramètres"><div className="tool-card"><p className="muted">Chargement…</p></div></AppShell>

  return (
    <AppShell active="parametres" title="Paramètres">
      <div className="param-onglets" role="tablist">
        {ONGLETS.map((o) => (
          <button key={o.id} role="tab" aria-selected={onglet === o.id} className={onglet === o.id ? 'on' : ''} onClick={() => setOnglet(o.id)}>{o.label}</button>
        ))}
      </div>

      <div className="prof-grid">
        {onglet === 'legal' ? (
          <div className="tool-card">
            <h2>Entreprise &amp; légal</h2>
            <p className="muted" style={{ margin: '0 0 1rem' }}>Ces informations apparaissent sur vos devis, vos factures et vos mentions légales — elles sont obligatoires pour qu’ils soient conformes.</p>

            {/* L'audit a constaté que 10 comptes sur 10 n'avaient pas de SIRET. Un artisan
                ne peut pas deviner qu'il lui manque une mention obligatoire : on le lui dit,
                avec ce qui manque exactement. */}
            {manquantes.length > 0 ? (
              <div className="par-manque">
                <b>Il vous manque {manquantes.length} mention{manquantes.length > 1 ? 's' : ''} obligatoire{manquantes.length > 1 ? 's' : ''}</b>
                <span>{manquantes.join(' · ')}</span>
                <em>
                  Sans elles, vos devis et factures ne sont pas conformes (amende de 15 € par mention manquante),
                  et vos mentions légales affichent « non communiqué ».
                </em>
              </div>
            ) : null}
            <label>SIRET</label>
            <input value={legal.siret} onChange={(e) => setL('siret', e.target.value)} placeholder="14 chiffres" maxLength={20} />
            <label>Forme juridique</label>
            <input value={legal.forme_juridique} onChange={(e) => setL('forme_juridique', e.target.value)} placeholder="Ex : SARL au capital de 10 000 € · EI · Auto-entrepreneur" maxLength={120} />
            <label>Adresse de l’entreprise</label>
            <input value={legal.adresse} onChange={(e) => setL('adresse', e.target.value)} placeholder="Numéro et rue" maxLength={160} />
            <div className="par-cp">
              <input value={legal.code_postal} onChange={(e) => setL('code_postal', e.target.value)} placeholder="Code postal" maxLength={10} />
              <input value={legal.ville} onChange={(e) => setL('ville', e.target.value)} placeholder="Ville" maxLength={80} />
            </div>
            <label className="prof-toggle" style={{ marginTop: '.9rem' }}>
              <input type="checkbox" checked={aTva} onChange={(e) => setATva(e.target.checked)} />
              <span>Je suis <b>assujetti à la TVA</b>{aTva ? '' : ' — sinon la mention de franchise ci-dessous est portée sur vos documents'}</span>
            </label>
            {aTva ? (<><label>Numéro de TVA intracommunautaire</label><input value={legal.tva_num} onChange={(e) => setL('tva_num', e.target.value)} placeholder="FR…" maxLength={20} /></>) : (
              <div className="par-mention">
                {/* La référence légale a changé : la TVA du CGI a été recodifiée vers le CIBS
                    au 01/09/2026, l'ancienne référence restant admise jusqu'au 31/12/2027.
                    D'où un choix, et pas une chaîne figée dans le code. */}
                <label>Référence légale de la mention</label>
                <div className="sa-pills">
                  {([['auto', 'Automatique'], ['cibs', 'CIBS (nouvelle)'], ['cgi', 'CGI (ancienne)']] as const).map(([id, nom]) => (
                    <button key={id} type="button" className={`sa-pill${mentionBase === id ? ' on' : ''}`} onClick={() => setMentionBase(id)}>{nom}</button>
                  ))}
                </div>
                <p className="muted par-apercu">
                  Portée sur vos devis et factures : <b>{mentionFranchise(mentionBase)}</b>
                </p>
                <p className="muted" style={{ fontSize: '.8rem', margin: '.3rem 0 0' }}>
                  La référence au CGI a été remplacée par le CIBS le 1<sup>er</sup> septembre 2026. L’ancienne reste acceptée
                  jusqu’au 31 décembre 2027 — gardez-la si votre comptable la préfère, « Automatique » suit la date.
                </p>
              </div>
            )}
            <label>IBAN (pour le règlement de vos factures)</label>
            <input value={legal.iban} onChange={(e) => setL('iban', e.target.value)} placeholder="FR76…" maxLength={40} />
            <h3 style={{ margin: '1.6rem 0 .2rem', fontSize: '1rem' }}>Assurance professionnelle</h3>
            <p className="muted" style={{ margin: '0 0 .6rem', fontSize: '.85rem' }}>Obligatoire sur les devis et factures du bâtiment (garantie décennale).</p>
            <label>Assureur</label>
            <input value={legal.assurance_nom} onChange={(e) => setL('assurance_nom', e.target.value)} placeholder="Ex : AXA" />
            <label>N° de contrat</label>
            <input value={legal.assurance_contrat} onChange={(e) => setL('assurance_contrat', e.target.value)} />
            <label>Zone géographique couverte</label>
            <input value={legal.assurance_zone} onChange={(e) => setL('assurance_zone', e.target.value)} placeholder="Ex : France métropolitaine" />
            <label>Activités couvertes</label>
            <input value={legal.assurance_activites} onChange={(e) => setL('assurance_activites', e.target.value)} placeholder="Ex : menuiserie, agencement" />

            <h3 style={{ margin: '1.6rem 0 .2rem', fontSize: '1rem' }}>Médiateur de la consommation</h3>
            <p className="muted" style={{ margin: '0 0 .6rem', fontSize: '.85rem' }}>
              Obligatoire dès que vous travaillez pour des particuliers (art. L.616-1 du code de la consommation) :
              vous devez adhérer à un dispositif de médiation et en indiquer les coordonnées. Tant que ce n’est pas
              renseigné, vos mentions légales ne peuvent pas l’afficher — je ne l’invente pas.
            </p>
            <label>Nom du médiateur</label>
            <input value={legal.mediateur_nom} onChange={(e) => setL('mediateur_nom', e.target.value)} placeholder="Ex : CM2C — Centre de la médiation de la consommation de conciliateurs de justice" maxLength={160} />
            <label>Site du médiateur</label>
            <input value={legal.mediateur_url} onChange={(e) => setL('mediateur_url', e.target.value)} placeholder="https://…" maxLength={300} />

            <button className="btn btn--primary" style={{ width: 'auto', marginTop: '1.2rem' }} disabled={saving} onClick={enregistrerLegal}>{saving ? '…' : 'Enregistrer'}</button>
          </div>
        ) : null}

        {onglet === 'securite' ? (
          <div className="tool-card">
            <h2>Sécurité</h2>
            <p className="muted" style={{ margin: '0 0 1rem' }}>Votre mot de passe est stocké haché : personne, pas même nous, ne peut le lire. On ne peut que le remplacer.</p>
            <label>Nouveau mot de passe</label>
            <input type="password" value={mdp} onChange={(e) => setMdp(e.target.value)} placeholder="8 caractères minimum" autoComplete="new-password" />
            <button className="btn btn--primary" style={{ width: 'auto', marginTop: '.9rem' }} disabled={busy || !mdp} onClick={changerMdp}>{busy ? '…' : 'Changer mon mot de passe'}</button>
            <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '1.4rem 0' }} />
            <h3 style={{ margin: '0 0 .3rem', fontSize: '1rem' }}>Vos autres appareils</h3>
            <p className="muted" style={{ margin: '0 0 .8rem', fontSize: '.88rem' }}>Vous avez utilisé un ordinateur qui n’est pas le vôtre ? Fermez toutes les autres sessions — elles seront réellement invalidées, pas seulement oubliées.</p>
            <button className="btn btn--ghost" style={{ width: 'auto' }} disabled={busy} onClick={deconnecterAutres}>Fermer toutes mes sessions</button>
          </div>
        ) : null}

        {onglet === 'donnees' ? (
          <div className="tool-card">
            <h2>Données &amp; confidentialité</h2>
            <p className="muted" style={{ margin: '0 0 1rem' }}>Vos données vous appartiennent. Vous pouvez les emporter à tout moment, et supprimer chaque partie séparément.</p>
            <button className="btn btn--primary" style={{ width: 'auto' }} onClick={exporter}>Exporter toutes mes données</button>
            <p className="muted" style={{ margin: '.6rem 0 1.4rem', fontSize: '.85rem' }}>Fichier JSON : profil, conversations, messages, devis, factures, clients.</p>
            <hr style={{ border: 0, borderTop: '1px solid var(--line)', margin: '0 0 1.2rem' }} />
            <h3 style={{ margin: '0 0 .3rem', fontSize: '1rem' }}>Supprimer une partie</h3>
            <p className="muted" style={{ margin: '0 0 .8rem', fontSize: '.88rem' }}>Site, plateforme ou conversation — chacun se supprime séparément, sans toucher à votre compte. Les devis envoyés et factures émises sont conservés : la loi l’impose.</p>
            <a className="btn btn--ghost" style={{ width: 'auto', display: 'inline-flex' }} href="/profil#donnees">Ouvrir les suppressions</a>
          </div>
        ) : null}

        {onglet === 'raccourcis' ? (
          <div className="tool-card">
            <h2>Le reste de vos réglages</h2>
            <p className="muted" style={{ margin: '0 0 1rem' }}>Ces écrans existent déjà et fonctionnent — on ne les a pas déplacés pour le plaisir de déplacer.</p>
            <div className="dz-actions">
              <a className="btn btn--ghost" style={{ width: 'auto' }} href="/profil">Ma page<small>Profil, site, apparence, publication</small></a>
              <a className="btn btn--ghost" style={{ width: 'auto' }} href="/plateforme">Ma plateforme<small>Lien, assistant, automatisations</small></a>
              <a className="btn btn--ghost" style={{ width: 'auto' }} href="/abonnement">Abonnement<small>Formule, crédits, facturation</small></a>
            </div>
          </div>
        ) : null}

        {msg && <div className={`msg ${msg.type === 'err' ? 'err' : ''}`}>{msg.text}</div>}
      </div>
    </AppShell>
  )
}

export default function ParametresPage() {
  return <Suspense fallback={<AppShell active="parametres" title="Paramètres"><div className="tool-card"><p className="muted">Chargement…</p></div></AppShell>}><ParametresInner /></Suspense>
}
