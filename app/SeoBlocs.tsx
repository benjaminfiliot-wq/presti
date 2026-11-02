import Link from 'next/link'
import { PAGES_DEVIS, METIERS_DEVIS, SOURCES, jsonLd, type CleSource } from '@/lib/seoDevis'
import { ESSAI_JOURS, PLANS } from '@/lib/plans'

// Blocs communs des pages « devis » (générateur, modèles, guide, logiciel) — 27/10/2026. Rendus serveur, sans JS.

/** Un bloc de données structurées. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />
}

/** Renvoi vers un texte officiel, toujours dans un nouvel onglet. */
export function Source({ cle }: { cle: CleSource }) {
  const s = SOURCES[cle]
  return <a className="res-src" href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a>
}

/** L'appel à l'essai : les durées et les prix se lisent dans lib/plans.ts. */
export function AppelPresti({ titre, texte }: { titre: string; texte: string }) {
  return (
    <aside className="res-appel res-noprint" aria-label="Essayer Presti">
      <div>
        <b>{titre}</b>
        <p>{texte}</p>
        <p className="res-appel-petit">
          Essai sans carte : {ESSAI_JOURS.studio} jours en {PLANS.studio.label} ({PLANS.studio.prixMois} € par mois ensuite), {ESSAI_JOURS.signature} jours en {PLANS.signature.label} ({PLANS.signature.prixMois} € par mois). Sans engagement.
        </p>
      </div>
      <div className="pub-actions">
        <a className="lp-btn lp-btn--p" href="/signup">Essayer gratuitement</a>
        <Link className="lp-btn lp-btn--g" href="/logiciel-devis-artisan">Voir comment ça marche</Link>
      </div>
    </aside>
  )
}

/** Le maillage interne de la rubrique : les quatre pages et les modèles par métier. */
export function PourAllerPlusLoin({ courant }: { courant: string }) {
  return (
    <nav className="res-plus res-noprint" aria-label="Pour aller plus loin">
      <h2>Pour aller plus loin</h2>
      <ul className="res-cartes">
        {PAGES_DEVIS.filter((p) => p.path !== courant).map((p) => (
          <li key={p.path}><Link href={p.path}><b>{p.label}</b><span>{p.texte}</span></Link></li>
        ))}
      </ul>
      <p className="res-metiers">
        <span>Modèles par métier :</span>
        {METIERS_DEVIS.map((m) => {
          const path = `/modele-devis/${m.slug}`
          return path === courant ? <b key={m.slug}>{m.titre}</b> : <Link key={m.slug} href={path}>{m.titre}</Link>
        })}
      </p>
    </nav>
  )
}
