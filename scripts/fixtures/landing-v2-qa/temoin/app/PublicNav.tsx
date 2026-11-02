import Link from 'next/link'

// Témoin : la barre de navigation publique, sans « Essayer gratuitement ».
export default function PublicNav() {
  return (
    <header className="lp-nav">
      <Link href="/">Presti</Link>
      <nav aria-label="Navigation">
        <Link href="/#fonctionnalites">Fonctionnalités</Link>
        <Link href="/offres">Offres</Link>
        <Link href="/faq">Questions</Link>
        <Link href="/login">Se connecter</Link>
        <Link className="lp-btn lp-btn--p" href="/signup">Essayer Presti</Link>
      </nav>
    </header>
  )
}
