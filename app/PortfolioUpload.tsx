'use client'

import { useRef, useState } from 'react'

export type Realisation = { image: string; titre: string; specialite: string }

// Redimensionne une PHOTO en data URL JPEG (léger : photos → JPEG ~0.72, max 1100px).
function resizePhoto(file: File, max: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      const ctx = c.getContext('2d')
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error('canvas')); return }
      ctx.drawImage(img, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.72))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image')) }
    img.src = url
  })
}

const MAX = 12

export default function PortfolioUpload({ value, onChange }: { value: Realisation[]; onChange: (v: Realisation[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (inputRef.current) inputRef.current.value = ''
    if (!files.length) return
    setErr('')
    setBusy(true)
    try {
      const room = MAX - value.length
      const added: Realisation[] = []
      for (const file of files.slice(0, Math.max(0, room))) {
        if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) { setErr('Formats acceptés : JPG, PNG, WebP.'); continue }
        if (file.size > 12 * 1024 * 1024) { setErr('Photo trop lourde (12 Mo max).'); continue }
        const image = await resizePhoto(file, 1100)
        added.push({ image, titre: '', specialite: '' })
      }
      if (added.length) onChange([...value, ...added])
      if (files.length > room) setErr(`Maximum ${MAX} photos.`)
    } catch {
      setErr('Lecture d’une image impossible.')
    } finally {
      setBusy(false)
    }
  }

  function patch(i: number, p: Partial<Realisation>) {
    onChange(value.map((r, j) => (j === i ? { ...r, ...p } : r)))
  }
  function remove(i: number) {
    onChange(value.filter((_, j) => j !== i))
  }

  return (
    <div className="pf-up">
      <div className="pf-grid">
        {value.map((r, i) => (
          <div className="pf-item" key={i}>
            <div className="pf-thumb">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.image} alt={r.titre || 'Réalisation'} />
              <button type="button" className="pf-del" onClick={() => remove(i)} aria-label="Retirer">✕</button>
            </div>
            <input className="pf-in" value={r.titre} onChange={(e) => patch(i, { titre: e.target.value })} placeholder="Titre (ex : Rénovation salle de bain)" maxLength={80} />
            <input className="pf-in sm" value={r.specialite} onChange={(e) => patch(i, { specialite: e.target.value })} placeholder="Spécialité (ex : Carrelage)" maxLength={50} />
          </div>
        ))}
        {value.length < MAX && (
          <button type="button" className="pf-add" disabled={busy} onClick={() => inputRef.current?.click()}>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            <span>{busy ? 'Import…' : 'Ajouter des photos'}</span>
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={pick} style={{ display: 'none' }} />
      <p className="muted" style={{ margin: '.5rem 0 0', fontSize: '.82rem' }}>{err ? <span style={{ color: '#e5735a' }}>{err}</span> : `Vos réalisations, par image et par spécialité — jusqu’à ${MAX} photos. Elles s’affichent sur votre page.`}</p>
    </div>
  )
}
