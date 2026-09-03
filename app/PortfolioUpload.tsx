'use client'

import { useRef, useState } from 'react'
import { preparerPhoto, uploadArtisanMedia } from '@/lib/media'
import { analyserImage, CONSEILS_PHOTO, type Alerte } from '@/lib/imageQualite'

export type Realisation = { image: string; titre: string; specialite: string; blur?: string }

const MAX = 12

// Import des réalisations (v4 §7/E3).
// Deux changements de fond par rapport à avant :
//  • le master est conservé en grand (2400 px pour la photo de hero) : la première
//    réalisation sert de fond plein écran, on ne peut pas la stocker en 1100 px ;
//  • chaque photo est ANALYSÉE avant publication (netteté, exposition, résolution) et
//    l'artisan est prévenu en français, au lieu de voir son site se dégrader en silence.
export default function PortfolioUpload({ uid, value, onChange }: { uid: string; value: Realisation[]; onChange: (v: Realisation[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [alertes, setAlertes] = useState<{ nom: string; liste: Alerte[] }[]>([])
  const [guide, setGuide] = useState(false)

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (inputRef.current) inputRef.current.value = ''
    if (!files.length) return
    setErr(''); setAlertes([]); setBusy(true)
    const remontees: { nom: string; liste: Alerte[] }[] = []
    try {
      const room = MAX - value.length
      const added: Realisation[] = []
      for (const [n, file] of files.slice(0, Math.max(0, room)).entries()) {
        if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) { setErr('Formats acceptés : JPG, PNG, WebP.'); continue }
        if (file.size > 12 * 1024 * 1024) { setErr('Photo trop lourde (12 Mo max).'); continue }

        const a = await analyserImage(file)
        if (a?.alertes.length) remontees.push({ nom: file.name, liste: a.alertes })
        // Une seule chose bloque : une photo si petite qu'elle sera floue partout.
        if (a?.alertes.some((x) => x.gravite === 'bloquant')) continue

        // La toute première photo devient le fond du hero : elle mérite le master le plus large.
        const role = value.length + added.length + n === 0 ? 'hero' : (a?.role ?? 'galerie')
        const p = await preparerPhoto(file, role)
        const image = await uploadArtisanMedia(uid, p.blob, p.ext)
        added.push({ image, titre: '', specialite: '', ...(p.blur ? { blur: p.blur } : {}) })
      }
      if (added.length) onChange([...value, ...added])
      if (files.length > room) setErr(`Maximum ${MAX} photos.`)
      setAlertes(remontees)
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
              {i === 0 ? <span className="pf-role">Photo principale</span> : null}
              <button type="button" className="pf-del" onClick={() => remove(i)} aria-label="Retirer">✕</button>
            </div>
            <input className="pf-in" value={r.titre} onChange={(e) => patch(i, { titre: e.target.value })} placeholder="Titre (ex : Rénovation salle de bain)" maxLength={80} />
            <input className="pf-in sm" value={r.specialite} onChange={(e) => patch(i, { specialite: e.target.value })} placeholder="Spécialité (ex : Carrelage)" maxLength={50} />
          </div>
        ))}
        {value.length < MAX && (
          <button type="button" className="pf-add" disabled={busy} onClick={() => inputRef.current?.click()}>
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            <span>{busy ? 'Analyse et import…' : 'Ajouter des photos'}</span>
          </button>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={pick} style={{ display: 'none' }} />

      {alertes.length > 0 ? (
        <div className="pf-alertes">
          {alertes.map((a, i) => (
            <div key={i} className="pf-alerte">
              <b>{a.nom}</b>
              <ul>{a.liste.map((x, j) => <li key={j} className={x.gravite === 'bloquant' ? 'ko' : ''}>{x.message}</li>)}</ul>
            </div>
          ))}
          <button type="button" className="pf-alerte-x" onClick={() => setAlertes([])}>J’ai compris</button>
        </div>
      ) : null}

      <p className="muted" style={{ margin: '.5rem 0 0', fontSize: '.82rem' }}>
        {err ? <span style={{ color: '#e5735a' }}>{err}</span> : <>Vos réalisations, par image et par spécialité — jusqu’à {MAX} photos. La première sert de photo principale. </>}
        <button type="button" className="pf-guide-t" onClick={() => setGuide((g) => !g)}>{guide ? 'Masquer les conseils' : 'Réussir vos photos'}</button>
      </p>

      {guide ? (
        <div className="pf-guide">
          {CONSEILS_PHOTO.map((c, i) => (
            <div key={i}><b>{c.titre}</b><span>{c.detail}</span></div>
          ))}
          <p className="muted">Vos photos comptent plus que le design : c’est ce que le client regarde en premier.</p>
        </div>
      ) : null}
    </div>
  )
}
