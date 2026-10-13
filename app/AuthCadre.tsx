import type { ReactNode } from 'react'
import '@/app/globals.css'
import Marque from '@/app/Marque'

// Cadre des pages d'accès (connexion, création de compte, mot de passe oublié) — refonte du 11/10/2026.
// Sur grand écran, un panneau de marque à gauche dit ce qu'on retrouve en entrant ; le formulaire, inchangé,
// est centré à droite. Sur téléphone, le panneau disparaît : le formulaire reste seul, en haut, prêt au clavier.
// Le panneau est décoratif pour la saisie : rien d'interactif, aucun script, rendu serveur.
// Variante « profil » (premiers pas après l'inscription, /onboarding) : même cadre, mais le panneau
// dit où l'on en est (le profil d'abord, le lien de contact juste après) et vouvoie, comme la page.
const CONTENUS = {
  acces: {
    titre: <>Vos demandes, vos devis, vos factures. <span>Au même endroit.</span></>,
    points: [
      'Chaque demande faite par votre lien a sa réponse prête en moins d’une minute : vous l’envoyez.',
      'Le devis se prépare sur vos prix, en PDF conforme.',
      'Trois relances (J+2, J+5, J+10) après la réponse au client, et la facture en un clic.',
    ],
    fiche: [
      { b: 'Demande entrante', em: 'Mme Garnier · robinets', ok: false },
      { b: 'Devis prêt', em: 'PDF conforme', ok: true },
      { b: 'Relance J+2', em: 'planifiée', ok: false },
    ],
    pied: 'Vos données sont isolées et chiffrées. Personne chez Presti n’ouvre un devis sans votre clic.',
  },
  profil: {
    titre: <>Votre profil d’abord. <span>Votre lien de contact juste après.</span></>,
    points: [
      'Votre nom et votre métier personnalisent chaque réponse.',
      'Le ton que vous écrivez ici, l’IA s’en inspire pour vous ressembler.',
      'Une fois enregistré, votre lien de contact est prêt à coller partout.',
    ],
    fiche: [
      { b: '1 · Votre profil', em: 'en cours', ok: true },
      { b: '2 · Votre lien de contact', em: 'juste après', ok: false },
      { b: '3 · Votre première demande', em: 'dès qu’un client écrit', ok: false },
    ],
    pied: 'Vos données sont isolées et chiffrées. Vous pourrez tout modifier ensuite dans vos paramètres.',
  },
}

export default function AuthCadre({ children, variante = 'acces' }: { children: ReactNode; variante?: keyof typeof CONTENUS }) {
  const c = CONTENUS[variante]
  return (
    <div className="auth">
      <aside className="auth-cote" aria-hidden="true">
        <span className="auth-grille" />
        <span className="auth-halo" />
        <div className="auth-cote-in">
          <span className="auth-marque"><Marque size={26} />Presti</span>
          <p className="auth-titre">{c.titre}</p>
          <ul className="auth-points">{c.points.map((p) => <li key={p}><i />{p}</li>)}</ul>
          <div className="auth-fiche">
            {c.fiche.map((l) => <div className="auth-fiche-l" key={l.b}><b>{l.b}</b><em className={l.ok ? 'ok' : undefined}>{l.em}</em></div>)}
          </div>
          <p className="auth-pied">{c.pied}</p>
        </div>
      </aside>
      <div className="auth-forme">{children}</div>
    </div>
  )
}
