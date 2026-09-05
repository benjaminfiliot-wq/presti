'use client'

import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { resizeToBlob, uploadArtisanMedia } from '@/lib/media'

export default function LogoUpload({ uid, value, onChange }: { uid: string; value: string | null; onChange: (v: string | null) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (inputRef.current) inputRef.current.value = ''
    if (!file) return
    setErr('')
    if (!/^image\/(png|jpe?g|webp|svg\+xml)$/.test(file.type)) { setErr('Format image non reconnu (PNG, JPG, WebP, SVG).'); return }
    if (file.size > 4 * 1024 * 1024) { setErr('Image trop lourde (4 Mo max).'); return }
    setBusy(true)
    try {
      // Logo en PNG (transparence) → fichier dans le bucket, plus de base64 en DB.
      const blob = await resizeToBlob(file, 320, 'image/png')
      const publicUrl = await uploadArtisanMedia(uid, blob, 'png')
      onChange(publicUrl)
      const { error } = await supabase.from('artisans').update({ logo_url: publicUrl }).eq('id', uid)
      if (error) setErr('Enregistrement du logo impossible.')
    } catch (e) {
      setErr(e instanceof Error && e.message ? e.message : 'Import de l’image impossible.')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    onChange(null)
    setErr('')
    await supabase.from('artisans').update({ logo_url: null }).eq('id', uid)
  }

  return (
    <div className="logo-up">
      <div className={`logo-prev${value ? ' has' : ''}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {value ? <img src={value} alt="Logo" /> : <span className="logo-ph">Logo</span>}
      </div>
      <div className="logo-actions">
        <button type="button" className="btn btn--ghost" style={{ width: 'auto' }} disabled={busy} onClick={() => inputRef.current?.click()}>
          {busy ? 'Import…' : value ? 'Changer le logo' : 'Ajouter un logo'}
        </button>
        {value && <button type="button" className="btn btn--ghost" style={{ width: 'auto' }} onClick={remove}>Retirer</button>}
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={pick} style={{ display: 'none' }} />
      </div>
      <p className="logo-hint">{err ? <span style={{ color: 'var(--crit, #c0392b)' }}>{err}</span> : 'Apparaît sur vos devis, factures et votre espace. PNG conseillé (fond transparent).'}</p>
    </div>
  )
}
