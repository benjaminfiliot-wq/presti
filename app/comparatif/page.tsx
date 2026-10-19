import '@/app/globals.css'
import '@/app/accueil.css'
import ComparatifConcurrents from '@/app/ComparatifConcurrents'
import PublicNav from '@/app/PublicNav'
import PublicPied from '@/app/PublicPied'
import { actif } from '@/lib/flags'
import { notFound } from 'next/navigation'

export const metadata = {
  alternates: { canonical: '/comparatif' },
  title: 'Comparatif',
  description: 'Comparatif de Presti et des logiciels de devis et factures, selon les mêmes critères pour tous, lus sur le site de chaque éditeur.',
  // Pas de bloc `openGraph` : en redéclarer un remplacerait celui du layout racine,
  // image de partage comprise. Le titre et la description suffisent.
}

export default function ComparatifPage() {
  if (!actif('landingV2') && process.env.VERCEL_ENV === 'production') notFound()

  return (
    <div className="lp">
      <PublicNav />
      <main>
        <section className="lp-blk">
          <div className="container">
            <header className="lp-hero">
              <span className="lp-kick">Comparatif</span>
              <h1>Presti et les autres logiciels de devis et factures.</h1>
              <p className="lp-lede">Les mêmes critères pour tous, lus sur le site de chaque éditeur. Les autres font très bien les devis et les factures ; Presti s&apos;occupe en plus de la demande qui arrive et de la gestion par la conversation.</p>
            </header>

            <ComparatifConcurrents />

            <div className="lp-cta">
              <a className="lp-btn lp-btn--p" href="/offres">Voir le détail des offres</a>
            </div>
          </div>
        </section>
      </main>
      <PublicPied />
    </div>
  )
}
