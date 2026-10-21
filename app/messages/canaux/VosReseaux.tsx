'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { urlPlateforme } from '@/lib/urls'
import { ficheReseau, lienAvecSource, LIBELLE_ORIGINE, RESEAUX_AFFICHES, type Origine } from '@/lib/canaux/reseaux'
import { cheminSvg, qrCode } from '@/lib/qr'

// Messages → Canaux → « Vos réseaux » (21/10/2026, drapeau canauxLiens ; rendu SEULEMENT drapeau levé, voir page.tsx).
// La voie SANS API, utilisable aujourd'hui sur tous les réseaux : un lien vers la page de conversation de l'artisan (SON adresse :
// lib/urls.ts, marque blanche) marqué de la source, le texte prêt à coller, un QR code fabriqué dans le navigateur (lib/qr.ts, aucun
// service externe), et un bouton « Copier ». La demande arrive dans Messages avec la pastille du réseau.

type Artisan = { slug: string | null; nom: string | null; domaine: string | null; domaine_verifie: boolean | null }

function Qr({ texte, titre }: { texte: string; titre: string }) {
  const q = useMemo(() => qrCode(texte), [texte])
  if (!q) return null
  const cote = q.taille + 8
  return (
    <svg viewBox={`0 0 ${cote} ${cote}`} width="168" height="168" role="img" aria-label={titre} shapeRendering="crispEdges" style={{ background: '#fff', borderRadius: 8, display: 'block' }}>
      <path d={cheminSvg(q, 4)} fill="#000" />
    </svg>
  )
}

function Copier({ texte, libelle = 'Copier' }: { texte: string; libelle?: string }) {
  const [fait, setFait] = useState(false)
  return (
    <button type="button" className="btn btn--ghost" style={{ width: 'auto' }} disabled={!texte}
      onClick={async () => { const ok = await navigator.clipboard?.writeText(texte).then(() => true, () => false); setFait(!!ok); if (ok) setTimeout(() => setFait(false), 1600) }}>
      {fait ? 'Copié' : libelle}
    </button>
  )
}

/** Télécharger le QR en SVG (imprimable sans perte : carte de visite, flyer, véhicule). */
function telechargerQr(texte: string, nom: string) {
  const q = qrCode(texte)
  if (!q) return
  const cote = q.taille + 8
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${cote} ${cote}" width="${cote * 10}" height="${cote * 10}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/><path d="${cheminSvg(q, 4)}" fill="#000"/></svg>`
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
  const a = document.createElement('a')
  a.href = url; a.download = `qr-${nom}.svg`; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function VosReseaux() {
  const [artisan, setArtisan] = useState<Artisan | null>(null)
  const [choisi, setChoisi] = useState<Origine>('whatsapp')

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user.id
      if (!uid) return
      const { data: a } = await supabase.from('artisans').select('slug, nom, domaine, domaine_verifie').eq('id', uid).maybeSingle()
      if (a) setArtisan(a as Artisan)
    })
  }, [])

  if (!artisan?.slug) return null
  const base = urlPlateforme(artisan)
  const lien = lienAvecSource(base, choisi)
  const f = ficheReseau(choisi, artisan.nom, lien)

  return (
    <div className="tool-card">
      <h2>Vos réseaux</h2>
      <p className="muted" style={{ margin: '0 0 1rem' }}>
        Sur chaque réseau où vos clients vous trouvent, mettez <b>votre lien de demande</b> : leur message arrive ici, avec le nom du réseau, et l’assistant y répond comme à toute demande de votre page. Rien n’indique Presti : vos clients voient votre nom.
      </p>
      <div className="pil-filtres" role="tablist" aria-label="Réseau">
        {RESEAUX_AFFICHES.map((o) => (
          <button key={o} type="button" role="tab" aria-selected={choisi === o} className={choisi === o ? 'on' : ''} onClick={() => setChoisi(o)}>{LIBELLE_ORIGINE[o]}</button>
        ))}
      </div>

      <div style={{ marginTop: '1rem', display: 'grid', gap: '.9rem' }}>
        {f.bio ? (
          <div>
            <label>Votre lien {LIBELLE_ORIGINE[choisi]}</label>
            <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input readOnly value={lien} onFocus={(e) => e.currentTarget.select()} style={{ flex: '1 1 260px', minWidth: 0 }} />
              <Copier texte={lien} libelle="Copier le lien" />
            </div>
          </div>
        ) : null}

        <p className="muted" style={{ margin: 0, fontSize: '.88rem' }}><b>Où le mettre :</b> {f.ou}</p>

        {f.bio ? (
          <div>
            <label>Texte à coller (bio, description)</label>
            <textarea readOnly rows={2} value={f.bio} style={{ width: '100%' }} />
            <Copier texte={f.bio} />
          </div>
        ) : null}

        {f.accueil ? (
          <div>
            <label>Message d’accueil / réponse automatique</label>
            <textarea readOnly rows={4} value={f.accueil} style={{ width: '100%' }} />
            <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <Copier texte={f.accueil} />
              {f.ouAccueil ? <span className="muted" style={{ fontSize: '.84rem' }}>{f.ouAccueil}</span> : null}
            </div>
          </div>
        ) : null}

        {f.note ? <p className="muted" style={{ margin: 0, fontSize: '.84rem' }}>{f.note}</p> : null}

        {f.bio ? (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <Qr texte={lien} titre={`QR code du lien ${LIBELLE_ORIGINE[choisi]}`} />
            <div style={{ display: 'grid', gap: '.4rem' }}>
              <span className="muted" style={{ fontSize: '.84rem' }}>Le QR code mène à votre page, marqué « {LIBELLE_ORIGINE[choisi]} ».</span>
              <button type="button" className="btn btn--ghost" style={{ width: 'auto' }} onClick={() => telechargerQr(lien, choisi)}>Télécharger le QR code</button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
