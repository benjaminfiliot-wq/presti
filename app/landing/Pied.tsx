// Le pied de la landing v2 (sorti de LandingV2.tsx en 033-005) : servi aussi par /contact au motif « entreprise » (033-004, défaut 10),
// pour que la page de démo porte la même barre et le même pied que la page qui y mène, sans « Essayer gratuitement ».
import Marque from '@/app/Marque'

export default function Pied() {
  return (
    <footer className="lp3-pied">
      <div className="lp3-c lp3-pied-in">
        <a className="lp-brand lp3-marque" href="/"><i className="marque"><Marque size={22} /></i>Presti</a>
        <nav aria-label="Pied de page">
          <a href="/offres">Offres</a><a href="/faq">Questions</a><a href="/contact">Contact</a>
          <a href="/confidentialite">Confidentialité</a><a href="/mentions-legales">Mentions légales</a><a href="/cgu">Conditions générales</a>
        </nav>
        <p className="lp3-pied-note">Les captures de cette page montrent le vrai produit, avec des données d’exemple fictives. © 2026 Presti</p>
      </div>
    </footer>
  )
}
