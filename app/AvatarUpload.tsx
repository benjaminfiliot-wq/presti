'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { uploadArtisanMedia } from '@/lib/media'

// Avatar de l'artisan (sprint J-1 §6 — Paramètres → Profil).
//
// Même mécanisme que le logo (bucket `artisan-media`, un dossier par artisan), avec un
// recadrage carré fait ici, dans un canvas : l'artisan choisit une photo, la cadre au
// curseur (zoom) et voit exactement ce qui sera enregistré. Le passage par canvas retire
// l'EXIF au passage — donc la géolocalisation d'une photo prise au téléphone.
//
// La colonne écrite est `logo_url` : c'est elle que la console affiche en avatar (AppShell)
// et que les documents reprennent en logo. Une seule image, un seul endroit pour la changer.

const TAILLE = 512

export default function AvatarUpload({ uid, value, nom, onChange }: { uid: string; value: string | null; nom: string | null; onChange: (v: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const initiales = (nom || '').trim().split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase() ?? '').join('') || 'P'

  // Aperçu : recadrage carré centré, « cover », puis zoom autour du centre.
  useEffect(() => {
    const c = canvasRef.current
    if (!c || !img) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    const cote = Math.min(img.width, img.height) / zoom
    const sx = (img.width - cote) / 2, sy = (img.height - cote) / 2
    ctx.clearRect(0, 0, TAILLE, TAILLE)
    ctx.drawImage(img, sx, sy, cote, cote, 0, 0, TAILLE, TAILLE)
  }, [img, zoom])

  function choisir(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    setErr('')
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) { setErr('Format non reconnu : PNG, JPG ou WebP.'); return }
    if (file.size > 8 * 1024 * 1024) { setErr('Image trop lourde (8 Mo max).'); return }
    const url = URL.createObjectURL(file)
    const i = new Image()
    i.onload = () => { setImg(i); setZoom(1); URL.revokeObjectURL(url) }
    i.onerror = () => { setErr('Image illisible.'); URL.revokeObjectURL(url) }
    i.src = url
  }

  async function enregistrer() {
    const c = canvasRef.current
    if (!c || busy) return
    setBusy(true); setErr('')
    try {
      const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('blob'))), 'image/webp', 0.86))
      const publicUrl = await uploadArtisanMedia(uid, blob, 'webp')
      const { error } = await supabase.from('artisans').update({ logo_url: publicUrl }).eq('id', uid)
      if (error) throw error
      onChange(publicUrl)
      setImg(null)
    } catch {
      setErr('Enregistrement impossible. Réessayez.')
    } finally { setBusy(false) }
  }

  async function retirer() {
    onChange(null); setErr('')
    await supabase.from('artisans').update({ logo_url: null }).eq('id', uid)
  }

  return (
    <div className="ava-up">
      <div className="ava-prev" aria-hidden={!img}>
        {img
          ? <canvas ref={canvasRef} width={TAILLE} height={TAILLE} />
          // eslint-disable-next-line @next/next/no-img-element
          : value ? <img src={value} alt="" /> : <span>{initiales}</span>}
      </div>
      <div className="ava-ctrl">
        {img ? (
          <>
            <label htmlFor="ava-zoom" style={{ margin: '0 0 .3rem' }}>Cadrage</label>
            <input id="ava-zoom" type="range" min={1} max={2.5} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
            <div className="ava-actions">
              <button type="button" className="btn btn--primary" disabled={busy} onClick={enregistrer}>{busy ? 'Envoi…' : 'Utiliser cette photo'}</button>
              <button type="button" className="btn btn--ghost" disabled={busy} onClick={() => setImg(null)}>Annuler</button>
            </div>
          </>
        ) : (
          <div className="ava-actions">
            <button type="button" className="btn btn--ghost" onClick={() => inputRef.current?.click()}>{value ? 'Changer la photo' : 'Ajouter une photo'}</button>
            {value ? <button type="button" className="btn btn--ghost" onClick={retirer}>Retirer</button> : null}
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={choisir} style={{ display: 'none' }} />
        <p className="logo-hint" style={{ margin: '.4rem 0 0' }}>
          {err ? <span style={{ color: 'var(--crit, #c0392b)' }}>{err}</span> : 'Carrée, 512 px. Elle apparaît dans votre console, sur vos devis et vos factures.'}
        </p>
      </div>
    </div>
  )
}
