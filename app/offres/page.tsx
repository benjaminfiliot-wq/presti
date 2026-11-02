import '@/app/globals.css'
import '@/app/accueil.css'
import Comparatif from '@/app/Comparatif'
import OffreDetail from '@/app/OffreDetail'
import PublicNav from '@/app/PublicNav'
import PublicPied from '@/app/PublicPied'
import { actif } from '@/lib/flags'
import { ESSAI_JOURS, OFFRES, PLANS, offreMinimale } from '@/lib/plans'
import { SITE_A_LA_DEMANDE } from '@/lib/siteCommande'
import { notFound } from 'next/navigation'

export const metadata = {
  alternates: { canonical: '/offres' },
  title: 'Offres',
  description: 'Comparez les offres Presti, leurs crédits, leurs fonctionnalités et leurs durées d’essai gratuit, sans carte.',
  // Pas de bloc `openGraph` : en redéclarer un remplacerait celui du layout racine,
  // image de partage comprise. Le titre et la description suffisent.
}

const OFFRE_PLATEFORME = (() => {
  const offre = offreMinimale('plateforme.conversation')
  return offre ? PLANS[offre].label : ''
})()

const ICONES = {
  generation: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>,
  expert: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 2l2.4 1.8 3 .2.2 3L19.4 9l-1.8 2.4 1.8 2.4-1.8 2.6-.2 3-3 .2L12 22l-2.4-1.8-3-.2-.2-3L4.6 14 6.4 12 4.6 9.6l1.8-2.6.2-3 3-.2z" /><path d="M9 12l2 2 4-4" /></svg>,
  recharge: <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></svg>,
}

export default function OffresPage() {
  if (!actif('landingV2') && process.env.VERCEL_ENV === 'production') notFound()

  return (
    <div className="lp">
      <PublicNav />
      <main>
        <section className="lp-blk">
          <div className="container">
            <header className="lp-hero">
              <span className="lp-kick">Abonnements</span>
              <h1>Simple : un forfait mensuel, avec des crédits inclus.</h1>
              <p className="lp-lede">Chaque formule vous donne des crédits chaque mois ; il n&apos;y a pas de recharge à l&apos;unité. Vous montez en formule quand votre activité grandit.</p>
            </header>

            <div className="lp-plans">
              {OFFRES.map((o) => (
                <div key={o.id} id={o.id} className={`lp-plan lp-spot${o.id === 'studio' ? ' lp-plan--feat' : ''}`}>
                  <div className="lp-pn">{o.label}</div>
                  <div className="lp-pp">{o.prix}€<small>par mois</small></div>
                  <div className="lp-credits"><b>{o.credits}</b>&nbsp;crédits / mois</div>
                  <div className="lp-essai" data-essai-gratuit={o.id}><b>{ESSAI_JOURS[o.id]} jours gratuits, sans carte</b></div>
                  <div className="lp-tva">TVA non applicable, art. 293 B du CGI</div>
                  <div className="lp-for">{o.accroche}</div>
                  <OffreDetail id={o.id} classe="lp-plist" />
                  <a className={`lp-btn ${o.id === 'studio' ? 'lp-btn--p' : 'lp-btn--g'}`} href="/signup">Essayer {ESSAI_JOURS[o.id]} jours gratuits</a>
                  <a className="lp-pay" href={`/signup?abonnement=${o.id}`} data-payer-direct={o.id}>Ou vous abonner directement, sans essai</a>
                </div>
              ))}
            </div>

            <div className="lp-trial">
              <b>Essai gratuit</b>
              <em>{PLANS.gratuit.creditsMois} crédits offerts ({PLANS.gratuit.creditsMois} devis chiffrés par l&apos;IA sur vos prix) pour juger la qualité avant de payer. Sans carte. L&apos;essai n&apos;inclut pas la plateforme de conversation, qui commence avec l&apos;offre {OFFRE_PLATEFORME}.</em>
              <a className="lp-btn lp-btn--g" href="/signup">Essayer</a>
            </div>

            <div className="lp-howcredits">
              <div className="lp-hc lp-spot"><span className="ic">{ICONES.generation}</span><b>1 crédit = 1 génération</b><span>Chaque réponse préparée pour un client (une par message qu&apos;il vous écrit), un devis chiffré par l&apos;IA ou un dépôt de fichiers de compta. Une recherche chez vos fournisseurs : 2 crédits (3 avec Expert).</span></div>
              <div className="lp-hc lp-spot"><span className="ic">{ICONES.expert}</span><b>Modèle Expert = 3 crédits</b><span>L&apos;IA la plus puissante consomme plus : réservez-la aux gros chantiers.</span></div>
              <div className="lp-hc lp-spot"><span className="ic">{ICONES.recharge}</span><b>Rechargés chaque mois</b><span>Vos crédits se réinitialisent à chaque renouvellement. Non reportés au mois suivant.</span></div>
            </div>

            <section className="lp-cmp" aria-labelledby="offres-comparatif">
              <div className="lp-head2 c">
                <h2 id="offres-comparatif">Qui a quoi, ligne par ligne</h2>
              </div>
              <Comparatif />
            </section>

            <p className="lp-pnote">1 crédit = 1 génération (réponse, devis, compta) · recherche fournisseurs = 2 crédits · Expert = 3 crédits · crédits rechargés chaque mois (non reportés) · sans engagement · essai gratuit : une fois par compte, crédits de l’essai proportionnels à sa durée</p>

            {actif('siteCommandeVente') && (
              <div className="lp-site lp-spot">
                <h3>{SITE_A_LA_DEMANDE.titre}</h3>
                {SITE_A_LA_DEMANDE.phrases.map((phrase, index) => <p key={index}>{phrase}</p>)}
                <div className="lp-site-cta">
                  <a className="lp-btn lp-btn--p" href={SITE_A_LA_DEMANDE.lien}>{SITE_A_LA_DEMANDE.bouton}</a>
                </div>
              </div>
            )}

            <div className="lp-cta">
              <a className="lp-btn lp-btn--g" href="/comparatif">Comparer avec les autres logiciels</a>
            </div>
          </div>
        </section>
      </main>
      <PublicPied />
    </div>
  )
}
