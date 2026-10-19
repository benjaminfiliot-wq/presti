import Marque from './Marque'

// Pied de page public (accueil, FAQ, contact, pages légales) — refonte du 11/10/2026.
// Le même pied partout : avant, seules l'accueil en avait un, et les autres pages s'arrêtaient net.
// `accueil` : sur la landing, les ancres restent locales (#tarifs) ; ailleurs elles ramènent à l'accueil (/#tarifs).
// v2 (refonte 18/10, landingV2) : le pied ne refait pas un bouton « Essayer gratuitement » (3 au plus sur la page) et mène aussi
// aux pages /offres et /comparatif, où sont partis le tableau des offres et le comparatif.
export default function PublicPied({ accueil = false, v2 = false }: { accueil?: boolean; v2?: boolean }) {
  const ancre = (id: string) => (accueil ? `#${id}` : `/#${id}`)
  return (
    <footer className="lp-foot">
      <div className="container">
        <div className="lp-foot-haut">
          <div className="lp-foot-marque">
            <span className="lp-brand"><i className="marque"><Marque size={22} /></i>Presti</span>
            <p>L&apos;assistant des artisans du bâtiment : des devis chiffrés par l&apos;IA et des factures, et avec la plateforme (dès l&apos;offre Studio), chaque demande faite par votre lien a sa réponse prête.</p>
            {v2 ? <a className="lp-foot-essai" href="/signup">Créer mon compte d’essai →</a> : <a className="lp-btn lp-btn--p" href="/signup">Essayer gratuitement</a>}
          </div>
          <nav aria-label="Produit"><b>Produit</b><a href={ancre('fonctionnalites')}>Fonctionnalités</a><a href={ancre('chiffres')}>Vos chiffres</a><a href={ancre('compta')}>Comptabilité</a><a href={ancre('tarifs')}>Tarifs</a>{v2 ? <><a href="/offres">Offres détaillées</a><a href="/comparatif">Comparatif</a></> : null}</nav>
          <nav aria-label="Aide"><b>Aide</b><a href="/faq">Questions fréquentes</a><a href="/contact">Nous écrire</a><a href="/login">Se connecter</a></nav>
          <nav aria-label="Informations légales"><b>Légal</b><a href="/cgu">Conditions générales</a><a href="/confidentialite">Confidentialité</a><a href="/mentions-legales">Mentions légales</a></nav>
        </div>
        <div className="lp-foot-bas"><span>© 2026 Presti · Fait pour les artisans.</span></div>
      </div>
      <div className="lp-foot-mot" aria-hidden="true">Presti</div>
    </footer>
  )
}
