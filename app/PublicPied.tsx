import Marque from './Marque'

// Pied de page public (accueil, FAQ, contact, pages légales) — refonte du 11/10/2026.
// Le même pied partout : avant, seules l'accueil en avait un, et les autres pages s'arrêtaient net.
// `accueil` : sur la landing, les ancres restent locales (#tarifs) ; ailleurs elles ramènent à l'accueil (/#tarifs).
export default function PublicPied({ accueil = false }: { accueil?: boolean }) {
  const ancre = (id: string) => (accueil ? `#${id}` : `/#${id}`)
  return (
    <footer className="lp-foot">
      <div className="container">
        <div className="lp-foot-haut">
          <div className="lp-foot-marque">
            <span className="lp-brand"><i className="marque"><Marque size={22} /></i>Presti</span>
            <p>L&apos;assistant des artisans du bâtiment : des devis chiffrés par l&apos;IA et des factures, et avec la plateforme (dès l&apos;offre Studio), chaque demande faite par votre lien a sa réponse prête.</p>
            <a className="lp-btn lp-btn--p" href="/signup">Essayer gratuitement</a>
          </div>
          <nav aria-label="Produit"><b>Produit</b><a href={ancre('fonctionnalites')}>Fonctionnalités</a><a href={ancre('chiffres')}>Vos chiffres</a><a href={ancre('compta')}>Comptabilité</a><a href={ancre('tarifs')}>Tarifs</a></nav>
          <nav aria-label="Ressources"><b>Ressources</b><a href="/generateur-devis">Générateur de devis</a><a href="/modele-devis">Modèles de devis</a><a href="/comment-faire-un-devis">Faire un devis</a><a href="/logiciel-devis-artisan">Logiciel de devis</a></nav>
          <nav aria-label="Aide"><b>Aide</b><a href="/faq">Questions fréquentes</a><a href="/contact">Nous écrire</a><a href="/login">Se connecter</a></nav>
          <nav aria-label="Informations légales"><b>Légal</b><a href="/cgu">Conditions générales</a><a href="/confidentialite">Confidentialité</a><a href="/mentions-legales">Mentions légales</a></nav>
        </div>
        <div className="lp-foot-bas"><span>© 2026 Presti · Fait pour les artisans.</span></div>
      </div>
      <div className="lp-foot-mot" aria-hidden="true">Presti</div>
    </footer>
  )
}
