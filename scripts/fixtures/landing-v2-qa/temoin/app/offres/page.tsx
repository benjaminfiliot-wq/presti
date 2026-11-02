import '@/app/globals.css'
import '@/app/landing-v2.css'
import PublicNav from '@/app/PublicNav'
import PublicPied from '@/app/PublicPied'
import { actif } from '@/lib/flags'
import { ESSAI_JOURS, OFFRES } from '@/lib/plans'
import { notFound } from 'next/navigation'

export const metadata = { title: 'Offres', description: 'Comparez les offres Presti et leurs durées d’essai, sans carte.', alternates: { canonical: '/offres' } }

// Témoin : /offres, prix et essais lus dans lib/plans.ts, en 404 en production tant que le drapeau est baissé.
export default function OffresPage() {
  if (!actif('landingV2') && process.env.VERCEL_ENV === 'production') notFound()
  return (
    <div className="lp lp2">
      <PublicNav />
      <main>
        <section>
          <h1>Un forfait mensuel, avec des crédits inclus.</h1>
          <p>Vous montez en formule quand votre activité grandit.</p>
          <div>
            {OFFRES.map((o) => (
              <article key={o.id} id={o.id} className="lp2-carte">
                <h2>{o.label}</h2>
                <p>{o.prix} € par mois, {o.credits} crédits.</p>
                <p>{o.label} : {ESSAI_JOURS[o.id]} jours gratuits, sans carte.</p>
                <a className="lp-btn lp-btn--p" href="/signup">Essayer Presti</a>
              </article>
            ))}
          </div>
        </section>
      </main>
      <PublicPied />
    </div>
  )
}
