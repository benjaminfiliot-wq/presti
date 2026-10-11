import type { ReactNode } from 'react'
import '@/app/globals.css'
import Marque from '@/app/Marque'

// Cadre des pages d'accès (connexion, création de compte, mot de passe oublié) — refonte du 11/10/2026.
// Sur grand écran, un panneau de marque à gauche dit ce qu'on retrouve en entrant ; le formulaire, inchangé,
// est centré à droite. Sur téléphone, le panneau disparaît : le formulaire reste seul, en haut, prêt au clavier.
// Le panneau est décoratif pour la saisie : rien d'interactif, aucun script, rendu serveur.
const POINTS = [
  'Chaque demande a sa réponse prête en moins d’une minute : vous l’envoyez.',
  'Le devis se prépare sur vos prix, en PDF conforme.',
  'Trois relances (J+2, J+5, J+10), puis la facture en un clic.',
]

export default function AuthCadre({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <aside className="auth-cote" aria-hidden="true">
        <span className="auth-grille" />
        <span className="auth-halo" />
        <div className="auth-cote-in">
          <span className="auth-marque"><Marque size={26} />Presti</span>
          <p className="auth-titre">Vos demandes, vos devis, vos factures. <span>Au même endroit.</span></p>
          <ul className="auth-points">{POINTS.map((p) => <li key={p}><i />{p}</li>)}</ul>
          <div className="auth-fiche">
            <div className="auth-fiche-l"><b>Demande entrante</b><em>Mme Garnier · robinets</em></div>
            <div className="auth-fiche-l"><b>Devis prêt</b><em className="ok">PDF conforme</em></div>
            <div className="auth-fiche-l"><b>Relance J+2</b><em>planifiée</em></div>
          </div>
          <p className="auth-pied">Vos données sont isolées et chiffrées. Personne chez Presti n’ouvre un devis sans votre clic.</p>
        </div>
      </aside>
      <div className="auth-forme">{children}</div>
    </div>
  )
}
