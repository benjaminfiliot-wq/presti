'use client'
import '@/app/globals.css'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { slugBase, randomSuffix } from '@/lib/slug'
import Marque from '@/app/Marque'

const METIERS = [
  'Plombier', 'Chauffagiste', 'Électricien', 'Maçon', 'Menuisier', 'Charpentier', 'Couvreur', 'Peintre',
  'Carreleur', 'Plaquiste / Plâtrier', 'Serrurier / Métallier', 'Ferronnier', 'Vitrier', 'Solier / Moquettiste',
  'Façadier / Ravaleur', 'Étancheur', 'Isolation (ITE/ITI)', 'Climaticien / Frigoriste', 'Domoticien',
  'Cuisiniste', 'Ébéniste / Agenceur', 'Pisciniste', 'Paysagiste', 'Terrassier / Maçon VRD',
  'Ramoneur', 'Poêlier / Fumiste', 'Store & fermeture', 'Multiservices / Rénovation', 'Autre',
]

export default function Onboarding() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [nom, setNom] = useState('')
  const [metier, setMetier] = useState('Plombier')
  const [metierAutre, setMetierAutre] = useState('')
  const [tel, setTel] = useState('')
  const [ton, setTon] = useState(
    "Bonjour, merci pour votre demande ! Je reviens vers vous très vite avec un devis. À bientôt.",
  )
  // « Comment avez-vous connu Presti ? » (v11 §4.2). C'est la source INDÉPENDANTE de la preuve
  // d'apport : quand quelqu'un déclare avoir amené cet artisan, c'est la réponse de l'artisan
  // lui-même qui corrobore ou contredit. Elle est scellée en base dès qu'elle est donnée (0068), pour
  // qu'elle ne puisse pas être changée après coup sur demande insistante de celui qui réclame la
  // commission. D'où aussi la neutralité de la liste : aucun nom n'est soufflé.
  const [origine, setOrigine] = useState('')
  const [origineNom, setOrigineNom] = useState('')
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
    const slug = `${slugBase(nom)}-${randomSuffix()}`
    // Bornes (audit final, D-1.6) : la base les impose aussi (migration 0058), ici on évite l'erreur.
    const nomPropre = nom.trim().slice(0, 120)
    const telPropre = tel.replace(/[^0-9 .+()\-]/g, '').trim().slice(0, 30) || null
    const metierFinal = metier === 'Autre' ? (metierAutre.trim() || 'Artisan') : metier
    const { error } = await supabase
      .from('artisans')
      .upsert({
        id: userId, email, nom: nomPropre, metier: metierFinal.slice(0, 60), tel: telPropre, ton_style: ton, slug,
        origine_declaree: origine || null,
        origine_precision: origine === 'presente' ? (origineNom.trim().slice(0, 120) || null) : null,
      })
    setLoading(false)
    if (error) {
      setErr(error.message)
      return
    }
    // L'entreprise apprend qu'un artisan vient de s'inscrire (sprint J-1 §15). Sans attendre,
    // sans bloquer : si la notification échoue, l'artisan continue quand même.
    try {
      const { data } = await supabase.auth.getSession()
      const jeton = data.session?.access_token
      if (jeton) void fetch('/api/account/inscription', { method: 'POST', headers: { Authorization: `Bearer ${jeton}` } }).catch(() => {})
    } catch { /* jamais bloquant */ }
    router.push('/outils')
  }

  return (
    <main className="wrap">
      <div className="card">
        <div className="brand"><i className="marque" aria-hidden="true"><Marque size={24} /></i>Presti</div>
        <h1>Ton profil</h1>
        <p className="muted">Ça sert à personnaliser tes réponses et à créer ton lien de contact.</p>
        <form onSubmit={handleSubmit}>
          <label>Ton nom (ou nom de l'entreprise)</label>
          <input value={nom} onChange={(e) => setNom(e.target.value)} required maxLength={120} placeholder="Ex : Dupont Plomberie" />
          <label>Ton métier</label>
          <select value={metier} onChange={(e) => setMetier(e.target.value)}>
            {METIERS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          {metier === 'Autre' && (
            <input value={metierAutre} onChange={(e) => setMetierAutre(e.target.value)} required maxLength={60} placeholder="Précise ton métier (ex : Cordiste, Enduiseur, Cheministe…)" style={{ marginTop: '.5rem' }} />
          )}
          <label>Ton téléphone</label>
          <input value={tel} onChange={(e) => setTel(e.target.value)} type="tel" inputMode="tel" maxLength={30} pattern="[0-9 .+()\-]*" title="Chiffres, espaces, points, tirets, parenthèses et + seulement" placeholder="06 12 34 56 78" />
          <label htmlFor="origine">Comment as-tu connu Presti ?</label>
          <select id="origine" value={origine} onChange={(e) => setOrigine(e.target.value)} required>
            <option value="" disabled>Choisis une réponse</option>
            <option value="google">Recherche Google</option>
            <option value="reseaux">Réseaux sociaux</option>
            <option value="bouche_a_oreille">Bouche-à-oreille</option>
            <option value="presente">On m’a présenté Presti</option>
            <option value="autre">Autre</option>
          </select>
          {origine === 'presente' && (
            <input value={origineNom} onChange={(e) => setOrigineNom(e.target.value)} required maxLength={120}
              placeholder="Qui te l’a présenté ? (son nom)" style={{ marginTop: '.5rem' }} />
          )}
          <label>Le ton de tes réponses (l'IA s'en inspirera)</label>
          <textarea value={ton} onChange={(e) => setTon(e.target.value)} rows={3} style={{ width: '100%', padding: '.7rem .8rem', border: '1px solid var(--line)', borderRadius: '8px', fontSize: '1rem', fontFamily: 'inherit', resize: 'vertical' }} />
          <button disabled={loading}>{loading ? '…' : 'Enregistrer et continuer'}</button>
        </form>
        {err && <div className="msg err">{err}</div>}
      </div>
    </main>
  )
}
