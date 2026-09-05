'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Info from '@/app/Info'
import { COUPLES } from '@/lib/siteStyle'
import { contrastRatio } from '@/lib/contrast'
import { FOND_THEME } from '@/lib/themeFonds'
import { resizeToBlob, uploadArtisanMedia } from '@/lib/media'
import {
  ACCENT_DEFAUT, ACCENT_VISIBILITE_MIN, STYLE_PLAT_DEFAUT, THEMES_PLAT, diffPlateformeStyle, encoderApercu, fondEffectif,
  resolvePlateformeStyle, type ApercuPayload, type PlateformeStyle,
} from '@/lib/plateformeStyle'

// Volet « Apparence » du poste de pilotage (sprint J-1 §9 G2).
// À gauche, les réglages ; à droite, LA page telle que le client la voit, en direct : le cadre
// charge /p/<slug>?apercu=1 et reçoit chaque changement par postMessage (même origine), sans
// recharger. Rien n'est enregistré avant « Enregistrer » — le serveur (route apparence) applique
// le verrou d'offre et corrige les couleurs illisibles. Vocabulaire sans jargon, comme StyleAvance.

type Etat = {
  slug: string
  theme: string
  accent: string
  style: PlateformeStyle
  avatar_url: string | null
  amorces: string[]
  message_accueil: string
  nom_assistant: string | null
  logo: string | null
  avance: boolean
  verrou: string
}

const THEMES: { id: (typeof THEMES_PLAT)[number]; nom: string }[] = [
  { id: 'atelier', nom: 'Atelier' }, { id: 'nuit', nom: 'Nuit' }, { id: 'epure', nom: 'Épuré' },
  { id: 'chantier', nom: 'Chantier' }, { id: 'bleu', nom: 'Bleu' }, { id: 'vitrine', nom: 'Vitrine' },
]
const DENSITES: { id: PlateformeStyle['densite']; nom: string }[] = [{ id: 'compacte', nom: 'Compacte' }, { id: 'normale', nom: 'Normale' }, { id: 'aeree', nom: 'Aérée' }]
const COMPOSEURS: { id: PlateformeStyle['composeur']; nom: string }[] = [{ id: 'classique', nom: 'Classique' }, { id: 'flottant', nom: 'Flottante' }, { id: 'carre', nom: 'Carrée' }]
const SCHEMAS: { id: PlateformeStyle['schema']; nom: string }[] = [{ id: 'theme', nom: 'Selon l’ambiance' }, { id: 'sombre', nom: 'Sombre' }, { id: 'auto', nom: 'Automatique' }]
type FondMode = 'theme' | 'couleur' | 'degrade' | 'image'

function Pastilles<T extends string>({ options, valeur, onPick }: { options: { id: T; nom: string }[]; valeur: T; onPick: (v: T) => void }) {
  return (
    <div className="sa-pills">
      {options.map((o) => <button key={o.id} type="button" className={`sa-pill${valeur === o.id ? ' on' : ''}`} onClick={() => onPick(o.id)}>{o.nom}</button>)}
    </div>
  )
}

export default function Apparence({ uid, slug }: { uid: string; slug: string }) {
  const [etat, setEtat] = useState<Etat | null>(null)
  const [mobile, setMobile] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [corr, setCorr] = useState<string | null>(null)
  const [upBusy, setUpBusy] = useState<'avatar' | 'fond' | null>(null)
  const frame = useRef<HTMLIFrameElement>(null)
  const [srcInit, setSrcInit] = useState<string | null>(null)

  const entetes = useCallback(async () => {
    const { data } = await supabase.auth.getSession()
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session?.access_token || ''}` }
  }, [])

  useEffect(() => {
    (async () => {
      const h = await entetes()
      const r = await fetch('/api/plateforme/apparence', { headers: h })
      const d = await r.json().catch(() => null)
      if (!r.ok || !d?.ok) { setMsg({ type: 'err', text: d?.error || 'Chargement impossible.' }); return }
      const e: Etat = {
        slug: d.slug || slug, theme: d.theme, accent: d.accent, style: resolvePlateformeStyle(d.apparence),
        avatar_url: d.avatar_url ?? null, amorces: Array.isArray(d.amorces) ? d.amorces : [],
        message_accueil: d.message_accueil ?? '', nom_assistant: d.nom_assistant ?? null,
        logo: d.logo ?? null, avance: !!d.avance, verrou: d.verrou || '',
      }
      setEtat(e)
      setSrcInit(`/p/${encodeURIComponent(e.slug)}?apercu=1&style=${encodeURIComponent(encoderApercu(payloadDe(e)))}`)
    })()
  }, [entetes, slug])

  // Ce que le cadre reçoit : exactement ce que le serveur enregistrerait.
  const payload = useMemo<ApercuPayload | null>(() => (etat ? payloadDe(etat) : null), [etat])
  const envoyerAuCadre = useCallback(() => {
    if (!payload) return
    try { frame.current?.contentWindow?.postMessage({ type: 'plat-apercu', payload }, window.location.origin) } catch { /* cadre pas prêt */ }
  }, [payload])
  useEffect(() => {
    // Réponse « en direct » : un court délai regroupe les curseurs, sans latence perceptible.
    const t = setTimeout(envoyerAuCadre, 90)
    return () => clearTimeout(t)
  }, [envoyerAuCadre])
  useEffect(() => {
    const onMsg = (e: MessageEvent) => { if (e.origin === window.location.origin && e.data?.type === 'plat-apercu-pret') envoyerAuCadre() }
    window.addEventListener('message', onMsg)
    return () => window.removeEventListener('message', onMsg)
  }, [envoyerAuCadre])

  if (!etat) return <div className="tool-card"><p className="muted">{msg?.type === 'err' ? msg.text : 'Chargement…'}</p></div>

  const set = (patch: Partial<Etat>) => setEtat((p) => (p ? { ...p, ...patch } : p))
  const setStyle = (patch: Partial<PlateformeStyle>) => setEtat((p) => (p ? { ...p, style: { ...p.style, ...patch } } : p))
  const fondMode: FondMode = etat.style.fond_image ? 'image' : etat.style.fond && etat.style.fond2 ? 'degrade' : etat.style.fond ? 'couleur' : 'theme'
  const fondReel = fondEffectif(etat.style, etat.theme)
  const ratioAccent = contrastRatio(etat.accent, fondReel)
  const ratioAccent2 = etat.style.accent2 ? contrastRatio(etat.style.accent2, fondReel) : null
  const lienClient = `/p/${encodeURIComponent(etat.slug)}`
  const off = etat.avance ? '' : ' apz-off'

  async function televerser(kind: 'avatar' | 'fond', f: File | undefined) {
    if (!f || !f.type.startsWith('image/')) return
    setUpBusy(kind); setMsg(null)
    try {
      const blob = await resizeToBlob(f, kind === 'avatar' ? 512 : 1800, 'image/webp', kind === 'avatar' ? 0.86 : 0.8)
      const url = await uploadArtisanMedia(uid, blob, 'webp')
      if (kind === 'avatar') set({ avatar_url: url })
      else setStyle({ fond_image: url })
    } catch (e) { setMsg({ type: 'err', text: e instanceof Error && e.message ? e.message : 'Envoi de l’image impossible.' }) }
    setUpBusy(null)
  }

  async function enregistrer() {
    if (saving) return
    setSaving(true); setMsg(null); setCorr(null)
    const h = await entetes()
    const r = await fetch('/api/plateforme/apparence', {
      method: 'POST', headers: h,
      body: JSON.stringify({
        theme: etat!.theme, accent: etat!.accent, apparence: diffPlateformeStyle(etat!.style),
        avatar_url: etat!.avatar_url, amorces: etat!.amorces, message_accueil: etat!.message_accueil,
      }),
    })
    const d = await r.json().catch(() => ({}))
    setSaving(false)
    if (!r.ok) { setMsg({ type: 'err', text: d.error || 'Enregistrement impossible.' }); return }
    const c = (d.corrections || {}) as Record<string, string>
    if (c.accent || c.accent2) {
      setEtat((p) => (p ? { ...p, accent: c.accent || p.accent, style: { ...p.style, accent2: c.accent2 || p.style.accent2 } } : p))
      setCorr(`Pour rester lisible sur votre fond, ${c.accent ? `l’accent a été ajusté en ${c.accent}` : ''}${c.accent && c.accent2 ? ' et ' : ''}${c.accent2 ? `la couleur secondaire en ${c.accent2}` : ''}.`)
    }
    setMsg({ type: 'ok', text: 'Apparence enregistrée.' }); setTimeout(() => setMsg(null), 2500)
  }

  return (
    <div className="apz">
      <div className="apz-form">
        {/* ── Ambiance + accent : toutes les offres */}
        <div className="tool-card">
          <h2>Ambiance</h2>
          <p className="muted" style={{ margin: '0 0 .9rem' }}>La même ambiance et la même couleur que votre site. Le reste de ce volet affine la page de conversation seulement.</p>
          <div className="apz-themes">
            {THEMES.map((t) => (
              <button key={t.id} type="button" className={`apz-theme${etat.theme === t.id ? ' on' : ''}`} onClick={() => set({ theme: t.id })}>
                <i style={{ background: `linear-gradient(135deg, ${FOND_THEME[t.id]} 62%, ${etat.accent})` }} />{t.nom}
              </button>
            ))}
          </div>
          <div className="sa-row" style={{ marginTop: '.9rem' }}>
            <label>Couleur d’accent</label>
            <label className="sa-color" style={{ background: etat.accent }}><input type="color" value={etat.accent} onChange={(e) => set({ accent: e.target.value.toUpperCase() })} /></label>
            <span className="sa-val">{etat.accent}</span>
            {etat.accent !== ACCENT_DEFAUT ? <button type="button" className="sa-reset" onClick={() => set({ accent: ACCENT_DEFAUT })}>Revenir au défaut</button> : null}
          </div>
          <p className={`sa-contrast ${ratioAccent < ACCENT_VISIBILITE_MIN ? 'ko' : ratioAccent < 3 ? 'warn' : 'ok'}`}>
            {ratioAccent < ACCENT_VISIBILITE_MIN
              ? `Cet accent se confond avec le fond (${ratioAccent.toFixed(1)}:1) : il sera assombri ou éclairci à l’enregistrement pour rester visible.`
              : `Visibilité ${ratioAccent.toFixed(1)}:1 — vos boutons et votre frise se voient sur ce fond ; les petits textes prennent automatiquement une teinte plus lisible.`}
          </p>
        </div>

        {!etat.avance ? (
          <p className="apz-verrou">🔒 <span>Avatar, polices, fond, formes et écran d’accueil : {etat.verrou} <a href="/abonnement">Voir les offres</a>. Vous gardez l’ambiance et la couleur.</span></p>
        ) : null}

        {/* ── Identité de l'assistant */}
        <div className={`tool-card${off}`} aria-disabled={!etat.avance}>
          <h2>L’assistant</h2>
          <div className="sa-row">
            <label>Avatar <Info cle="plateforme.apparence.avatar" /></label>
            <div className="apz-avatar">
              {etat.avatar_url || etat.logo
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={etat.avatar_url || (etat.logo as string)} alt="" />
                : <span className="ph">{(etat.nom_assistant || 'A').slice(0, 1).toUpperCase()}</span>}
              <label className="btn btn--ghost">
                <input type="file" accept="image/*" hidden disabled={upBusy !== null} onChange={(e) => televerser('avatar', e.target.files?.[0])} />
                {upBusy === 'avatar' ? 'Envoi…' : 'Choisir une image'}
              </label>
              {etat.avatar_url ? <button type="button" className="sa-reset" onClick={() => set({ avatar_url: null })}>Reprendre mon logo</button> : <span className="muted sa-val">votre logo, sans rien régler</span>}
            </div>
          </div>
          <div className="sa-row" style={{ marginTop: '.7rem' }}>
            <label>Nom affiché</label>
            <span className="muted sa-val" style={{ minWidth: 0 }}>{etat.nom_assistant || 'aucun'} — se règle dans <b>Réglages</b></span>
          </div>
        </div>

        {/* ── Écran d'accueil */}
        <div className={`tool-card${off}`} aria-disabled={!etat.avance}>
          <h2>Écran d’accueil</h2>
          <p className="muted" style={{ margin: '0 0 .8rem' }}>Ce que voit un client avant d’écrire. Rien d’inventé : sans amorces, ce sont vos prestations qui servent de départ.</p>
          <label htmlFor="apz-titre">Titre</label>
          <input id="apz-titre" value={etat.style.accueil_titre ?? ''} maxLength={60} placeholder="Bonjour 👋" onChange={(e) => setStyle({ accueil_titre: e.target.value || null })} />
          <label htmlFor="apz-sous">Sous-titre</label>
          <textarea id="apz-sous" rows={2} value={etat.message_accueil} maxLength={200} placeholder="Décrivez votre besoin en quelques mots — on vous répond." onChange={(e) => set({ message_accueil: e.target.value })} />
          <label>Amorces <Info cle="plateforme.apparence.amorces" /></label>
          <div className="apz-amorces">
            {[0, 1, 2, 3].map((i) => (
              <input key={i} value={etat.amorces[i] ?? ''} maxLength={80} placeholder={i === 0 ? 'Ex : Un devis pour une terrasse' : i === 1 ? 'Ex : Une fuite sous l’évier' : 'Facultatif'} aria-label={`Amorce ${i + 1}`}
                onChange={(e) => { const next = [...etat.amorces]; while (next.length < 4) next.push(''); next[i] = e.target.value; set({ amorces: next }) }} />
            ))}
          </div>
        </div>

        {/* ── Couleurs et fond */}
        <div className={`tool-card${off}`} aria-disabled={!etat.avance}>
          <h2>Couleurs et fond</h2>
          <div className="sa-row">
            <label>Couleur secondaire <Info cle="plateforme.apparence.accent2" /></label>
            <label className="sa-color" style={{ background: etat.style.accent2 || etat.accent }}><input type="color" value={etat.style.accent2 || etat.accent} onChange={(e) => setStyle({ accent2: e.target.value.toUpperCase() })} /></label>
            {etat.style.accent2 ? <button type="button" className="sa-reset" onClick={() => setStyle({ accent2: null })}>Revenir à l’automatique</button> : <span className="muted sa-val">dérivée de votre accent</span>}
          </div>
          {ratioAccent2 !== null ? (
            <p className={`sa-contrast ${ratioAccent2 < 3 ? 'ko' : ratioAccent2 < 4.5 ? 'warn' : 'ok'}`}>
              {ratioAccent2 < 4.5 ? `Trop pâle pour du texte (${ratioAccent2.toFixed(1)}:1) : elle sera ajustée à l’enregistrement, en gardant sa teinte.` : `Lisibilité ${ratioAccent2.toFixed(1)}:1 — convient aux petits textes.`}
            </p>
          ) : null}
          <div className="sa-row" style={{ marginTop: '.8rem' }}>
            <label>Fond <Info cle="plateforme.apparence.fond" /></label>
            <Pastilles<FondMode>
              options={[{ id: 'theme', nom: 'Celui de l’ambiance' }, { id: 'couleur', nom: 'Une couleur' }, { id: 'degrade', nom: 'Un dégradé' }, { id: 'image', nom: 'Une photo' }]}
              valeur={fondMode}
              onPick={(m) => {
                if (m === 'theme') setStyle({ fond: null, fond2: null, fond_image: null })
                else if (m === 'couleur') setStyle({ fond: etat.style.fond || FOND_THEME[etat.theme] || '#F5EFE4', fond2: null, fond_image: null })
                else if (m === 'degrade') setStyle({ fond: etat.style.fond || FOND_THEME[etat.theme] || '#F5EFE4', fond2: etat.style.fond2 || etat.accent, fond_image: null })
                else setStyle({ fond_image: etat.style.fond_image || null })
              }}
            />
          </div>
          {fondMode === 'couleur' || fondMode === 'degrade' ? (
            <div className="sa-row">
              <label>{fondMode === 'degrade' ? 'Du' : 'Couleur'}</label>
              <label className="sa-color" style={{ background: etat.style.fond || '#F5EFE4' }}><input type="color" value={etat.style.fond || '#F5EFE4'} onChange={(e) => setStyle({ fond: e.target.value.toUpperCase() })} /></label>
              {fondMode === 'degrade' ? (
                <>
                  <label style={{ flex: '0 0 auto' }}>au</label>
                  <label className="sa-color" style={{ background: etat.style.fond2 || etat.accent }}><input type="color" value={etat.style.fond2 || etat.accent} onChange={(e) => setStyle({ fond2: e.target.value.toUpperCase() })} /></label>
                </>
              ) : null}
              <span className="muted sa-val">{(() => { const l = contrastRatio(etat.style.fond || '#F5EFE4', '#1B1712'); return l < 4.5 ? 'fond sombre : texte en clair' : 'fond clair' })()}</span>
            </div>
          ) : null}
          {fondMode === 'image' ? (
            <div className="apz-avatar" style={{ marginTop: '.3rem' }}>
              {etat.style.fond_image
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={etat.style.fond_image} alt="" style={{ borderRadius: 10, width: 84 }} />
                : <span className="ph" style={{ borderRadius: 10, width: 84 }}>—</span>}
              <label className="btn btn--ghost">
                <input type="file" accept="image/*" hidden disabled={upBusy !== null} onChange={(e) => televerser('fond', e.target.files?.[0])} />
                {upBusy === 'fond' ? 'Envoi…' : etat.style.fond_image ? 'Changer la photo' : 'Choisir une photo'}
              </label>
              <span className="muted sa-val" style={{ minWidth: 0 }}>La conversation se lit sur un voile flouté par-dessus.</span>
            </div>
          ) : null}
          <div className="sa-row" style={{ marginTop: '.8rem' }}>
            <label>Clair ou sombre <Info cle="plateforme.apparence.schema" /></label>
            <Pastilles options={SCHEMAS} valeur={etat.style.schema} onPick={(schema) => setStyle({ schema })} />
          </div>
        </div>

        {/* ── Polices et formes */}
        <div className={`tool-card${off}`} aria-disabled={!etat.avance}>
          <h2>Polices et formes</h2>
          <div className="sa-row">
            <label>Polices <Info cle="plateforme.apparence.polices" /></label>
          </div>
          <div className="sa-couples">
            <button type="button" className={`sa-couple${!etat.style.couple ? ' on' : ''}`} onClick={() => setStyle({ couple: null })}>
              <span className="sa-couple-a">Aa</span><span className="sa-couple-t"><b>Celles de l’ambiance</b><small>sans rien régler</small></span>
            </button>
            {COUPLES.map((c) => (
              <button key={c.id} type="button" className={`sa-couple${etat.style.couple === c.id ? ' on' : ''}`} onClick={() => setStyle({ couple: c.id })}>
                <span className="sa-couple-a" style={{ fontFamily: c.display }}>Aa</span>
                <span className="sa-couple-t"><b>{c.nom}</b><small>{c.pour}</small></span>
              </button>
            ))}
          </div>
          <div className="sa-row" style={{ marginTop: '.8rem' }}>
            <label>Angles</label>
            <input type="range" min={0} max={24} step={2} value={etat.style.rayon ?? 16} onChange={(e) => setStyle({ rayon: Number(e.target.value) })} />
            <span className="sa-val">{etat.style.rayon === null ? 'ceux de l’ambiance' : etat.style.rayon === 0 ? 'carrés' : etat.style.rayon >= 20 ? 'très arrondis' : `${etat.style.rayon} px`}</span>
            {etat.style.rayon !== null ? <button type="button" className="sa-reset" onClick={() => setStyle({ rayon: null })}>Revenir à l’ambiance</button> : null}
          </div>
          <div className="sa-row">
            <label>Densité</label>
            <Pastilles options={DENSITES} valeur={etat.style.densite} onPick={(densite) => setStyle({ densite })} />
          </div>
          <div className="sa-row">
            <label>Zone de saisie <Info cle="plateforme.apparence.composeur" /></label>
            <Pastilles options={COMPOSEURS} valeur={etat.style.composeur} onPick={(composeur) => setStyle({ composeur })} />
          </div>
          <button type="button" className="sa-reset-all" onClick={() => setStyle({ ...STYLE_PLAT_DEFAUT })}>Tout remettre comme l’ambiance</button>
        </div>

        <div className="tool-card">
          <div className="apz-actions">
            <button type="button" className="btn btn--primary" disabled={saving} onClick={enregistrer}>{saving ? '…' : 'Enregistrer'}</button>
            <a className="btn btn--ghost" href={lienClient} target="_blank" rel="noopener">Voir comme un client</a>
            {msg ? <span className={msg.type === 'err' ? 'adr-msg err' : 'adr-msg ok'}>{msg.text}</span> : null}
          </div>
          {corr ? <p className="apz-corr">{corr}</p> : null}
          <p className="muted" style={{ margin: '.6rem 0 0', fontSize: '.8rem' }}>L’aperçu à droite montre vos changements avant enregistrement. Vos clients ne voient que ce qui est enregistré.</p>
        </div>
      </div>

      {/* ── Aperçu en direct */}
      <div className="apz-prev">
        <div className="apz-prev-bar">
          <div className="pcfg-seg" role="group" aria-label="Taille de l’aperçu">
            <button type="button" className={!mobile ? 'on' : ''} onClick={() => setMobile(false)}>Ordinateur</button>
            <button type="button" className={mobile ? 'on' : ''} onClick={() => setMobile(true)}>Téléphone</button>
          </div>
          <span className="spacer" />
          <span className="muted" style={{ fontSize: '.8rem' }}>Aperçu — rien n’est envoyé depuis ce cadre</span>
        </div>
        <div className={`apz-frame${mobile ? ' mobile' : ''}`}>
          {srcInit ? <iframe ref={frame} src={srcInit} title="Aperçu de votre page de conversation" onLoad={envoyerAuCadre} /> : null}
        </div>
      </div>
    </div>
  )
}

function payloadDe(e: Etat): ApercuPayload {
  return {
    theme: e.theme, accent: e.accent, apparence: diffPlateformeStyle(e.style),
    avatar_url: e.avatar_url, amorces: e.amorces.map((a) => a.trim()).filter(Boolean),
    message_accueil: e.message_accueil.trim() || null, nom_assistant: e.nom_assistant,
  }
}
