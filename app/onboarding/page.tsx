'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { slugify, randomSuffix } from '@/lib/slug'

const METIERS = ['Plombier', 'Électricien', 'Maçon', 'Menuisier', 'Chauffagiste', 'Peintre', 'Carreleur', 'Couvreur', 'Autre']

export default function Onboarding() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [nom, setNom] = useState('')
  const [metier, setMetier] = useState('Plombier')
  const [tel, setTel] = useState('')
  const [ton, setTon] = useState(
    "Bonjour, merci pour votre demande ! Je reviens vers vous très vite avec un devis. À bientôt.",
  )
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) {
        router.replace('/login')
        return
      }
      setUserId(data.session.user.id)
      setEmail(data.session.user.email ?? null)
    })
  }, [router])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!userId) return
    setLoading(true)
    setErr(null)
    const slug = `${slugify(nom) || 'artisan'}-${randomSuffix()}`
    const { error } = await supabase
      .from('artisans')
      .upsert({ id: userId, email, nom, metier, tel, ton_style: ton, slug })
    setLoading(false)
    if (error) {
      setErr(error.message)
      return
    }
    router.push('/dashboard')
  }

  return (
    <main className="wrap">
      <div className="card">
        <div className="brand"><span className="dot" />Presti</div>
        <h1>Ton profil</h1>
        <p className="muted">Ça sert à personnaliser tes réponses et à créer ton lien de contact.</p>
        <form onSubmit={handleSubmit}>
          <label>Ton nom (ou nom de l'entreprise)</label>
          <input value={nom} onChange={(e) => setNom(e.target.value)} required placeholder="Ex : Dupont Plomberie" />
          <label>Ton métier</label>
          <select value={metier} onChange={(e) => setMetier(e.target.value)}>
            {METIERS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <label>Ton téléphone</label>
          <input value={tel} onChange={(e) => setTel(e.target.value)} placeholder="06 12 34 56 78" />
          <label>Le ton de tes réponses (l'IA s'en inspirera)</label>
          <textarea value={ton} onChange={(e) => setTon(e.target.value)} rows={3} style={{ width: '100%', padding: '.7rem .8rem', border: '1px solid var(--line)', borderRadius: '8px', fontSize: '1rem', fontFamily: 'inherit', resize: 'vertical' }} />
          <button disabled={loading}>{loading ? '…' : 'Enregistrer et continuer'}</button>
        </form>
        {err && <div className="msg err">{err}</div>}
      </div>
    </main>
  )
}
