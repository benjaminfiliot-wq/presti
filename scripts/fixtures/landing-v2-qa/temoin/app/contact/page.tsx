import '@/app/globals.css'
import PublicNav from '@/app/PublicNav'
import PublicPied from '@/app/PublicPied'
import BlocEntreprise from '@/app/contact/BlocEntreprise'
import { actif } from '@/lib/flags'

export const metadata = { title: 'Nous écrire', description: 'Une question sur Presti ? Écrivez-nous.', alternates: { canonical: '/contact' } }

// Témoin : /contact. Le bloc de démo Entreprise est derrière le drapeau landingV2.
export default function Contact() {
  return (
    <div className="lp">
      <PublicNav />
      <main>
        <h1>Nous écrire</h1>
        <p>Une question avant de vous abonner : écrivez-nous.</p>
        {actif('landingV2') ? <BlocEntreprise /> : null}
      </main>
      <PublicPied />
    </div>
  )
}
