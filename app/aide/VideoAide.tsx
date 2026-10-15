'use client'

// Une entrée vidéo du centre d'aide : la capture de l'écran réel, les étapes écrites dessous (le même texte que les cartons
// d'étape de la vidéo), l'offre qui donne accès à l'écran, et le lien vers l'écran. Le <video> n'est monté qu'à la
// première ouverture et reste en preload="none" : rien ne se télécharge tant que l'artisan n'appuie pas sur lecture.
import { useState } from 'react'
import { PLANS } from '@/lib/plans'
import { dureeTexte, urlAffiche, urlVideo, type AideVideo } from '@/lib/aideVideos'

export default function VideoAide({ video: v, ouvert }: { video: AideVideo; ouvert: boolean }) {
  const [vu, setVu] = useState(ouvert)
  return (
    <details className="aide-art aide-vid" id={`video-${v.id}`} open={ouvert} onToggle={(e) => { if ((e.currentTarget as HTMLDetailsElement).open) setVu(true) }}>
      <summary>
        <svg className="aide-vid-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m10 9.5 4.5 2.5-4.5 2.5z" fill="currentColor" /></svg>
        <span>{v.titre}</span>
        {v.offre !== 'essentiel' && <span className="aide-vid-offre">Offre {PLANS[v.offre].label}</span>}
        {v.duree ? <span className="pg"><span className="aide-sr">Durée </span>{dureeTexte(v.duree)}</span> : null}
      </summary>
      <div className="aide-art-b aide-vid-b">
        <p className="aide-vid-resume">{v.resume}</p>
        {v.offre !== 'essentiel' && (
          <p className="aide-vid-plan">
            <span className="aide-plan">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              Disponible avec l’offre {PLANS[v.offre].label}
            </span>
          </p>
        )}
        {v.note && <p className="aide-vid-note">{v.note}</p>}
        <div className="aide-vid-cadre">
          {vu ? (
            <video controls preload="none" playsInline poster={urlAffiche(v)} aria-label={`Vidéo : ${v.titre}`} aria-describedby={`etapes-${v.id}`}>
              <source src={urlVideo(v)} type="video/mp4" />
              Votre navigateur ne sait pas lire cette vidéo : suivez les étapes écrites ci-dessous.
            </video>
          ) : null}
        </div>
        <h3 className="aide-vid-h">Les étapes, par écrit</h3>
        <ol id={`etapes-${v.id}`} className="aide-vid-etapes">
          {v.etapes.map((e, i) => <li key={i}>{e}</li>)}
        </ol>
        <a className="psh-btn primary aide-vid-go" href={v.route}>
          Ouvrir « {v.titre} »
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </a>
      </div>
    </details>
  )
}
