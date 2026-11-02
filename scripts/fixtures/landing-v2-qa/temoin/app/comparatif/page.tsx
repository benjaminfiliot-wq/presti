import '@/app/globals.css'
import '@/app/landing-v2.css'
import PublicNav from '@/app/PublicNav'
import PublicPied from '@/app/PublicPied'
import { actif } from '@/lib/flags'
import { notFound } from 'next/navigation'

export const metadata = { title: 'Comparatif', description: 'Les mêmes critères pour tous les logiciels de devis.', alternates: { canonical: '/comparatif' } }

// Témoin : /comparatif, en 404 en production tant que le drapeau est baissé.
export default function ComparatifPage() {
  if (!actif('landingV2') && process.env.VERCEL_ENV === 'production') notFound()
  return (
    <div className="lp lp2">
      <PublicNav />
      <main>
        <section>
          <h1>Presti et les autres logiciels de devis.</h1>
          <p>Les mêmes critères pour tous, lus sur le site de chaque éditeur.</p>
          <table>
            <thead><tr><th>Critère</th><th>Presti</th></tr></thead>
            <tbody>
              <tr><td>La demande arrive dans l’outil</td><td>Oui</td></tr>
              <tr><td>Le devis est préparé sur vos prix</td><td>Oui</td></tr>
            </tbody>
          </table>
        </section>
      </main>
      <PublicPied />
    </div>
  )
}
