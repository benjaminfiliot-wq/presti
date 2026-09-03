'use client'

import { useRef, useState } from 'react'
import { preparerPhoto, uploadArtisanMedia } from '@/lib/media'

export type AvantApres = { avant: string; apres: string; titre: string }

const MAX = 4

// Upload des paires avant/après (Signature). Chaque paire = 2 photos (brut + fini) + titre.
export default function AvantApresUpload({ uid, value, onChange }: { uid: string; value: AvantApres[]; onChange: (v: AvantApres[]) => void }) {
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const refs = useRef<Record<string, HTMLInputElement | null>>({})

  async function upload(file: File): Promise<string | null> {
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) { setErr('Formats acceptés : JPG, PNG, WebP.'); return null }
    if (file.size > 12 * 1024 * 1024) { setErr('Photo trop lourde (12 Mo max).'); return null }
    // Même traitement que les réalisations : master large en WebP, EXIF (donc géolocalisation)
    // retiré au ré-encodage. Une paire avant/après s'affiche en grand, elle mérite la même qualité.
    const p = await preparerPhoto(file, 'galerie')
    return uploadArtisanMedia(uid, p.blob, p.ext)
  }

  async function pick(i: number, side: 'avant' | 'apres', e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setErr(''); setBusy(`${i}-${side}`)
    try {
      const url = await upload(file)
      if (url) onChange(value.map((p, j) => (j === i ? { ...p, [side]: url } : p)))
    } catch { setErr('Import impossible.') } finally { setBusy('') }
  }

  function addPair() { if (value.length < MAX) onChange([...value, { avant: '', apres: '', titre: '' }]) }
  function remove(i: number) { onChange(value.filter((_, j) => j !== i)) }
  function setTitre(i: number, t: string) { onChange(value.map((p, j) => (j === i ? { ...p, titre: t } : p))) }

  const slot = (i: number, side: 'avant' | 'apres') => {
    const p = value[i]; const url = side === 'avant' ? p.avant : p.apres
    const k = `${i}-${side}`
    return (
      <div className={`aa-slot${url ? ' filled' : ''}`}>
        <span className="aa-slot-lab">{side === 'avant' ? 'Avant' : 'Après'}</span>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={side} />
        ) : null}
        <button type="button" className="aa-slot-btn" disabled={busy === k} onClick={() => refs.current[k]?.click()}>
          {busy === k ? 'Import…' : url ? 'Changer' : '+ Photo'}
        </button>
        <input ref={(el) => { refs.current[k] = el }} type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => pick(i, side, e)} style={{ display: 'none' }} />
      </div>
    )
  }

  return (
    <div className="aa-up">
      <div className="aa-pairs">
        {value.map((p, i) => (
          <div className="aa-pair" key={i}>
            <div className="aa-pair-slots">{slot(i, 'avant')}{slot(i, 'apres')}</div>
            <div className="aa-pair-foot">
              <input className="aa-titre" value={p.titre} onChange={(e) => setTitre(i, e.target.value)} placeholder="Titre (ex : Rénovation d’un escalier)" maxLength={80} />
              <button type="button" className="aa-del" onClick={() => remove(i)} aria-label="Retirer la paire">Retirer</button>
            </div>
          </div>
        ))}
      </div>
      {value.length < MAX ? (
        <button type="button" className="aa-add" onClick={addPair}>+ Ajouter une transformation</button>
      ) : null}
      <p className="muted" style={{ margin: '.55rem 0 0', fontSize: '.82rem' }}>
        {err ? <span style={{ color: '#e5735a' }}>{err}</span> : `Une photo brute et une photo finie de la même pièce — jusqu’à ${MAX} transformations, révélées en 3D sur votre site.`}
      </p>
    </div>
  )
}
