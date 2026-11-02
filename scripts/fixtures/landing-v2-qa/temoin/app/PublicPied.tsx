import Link from 'next/link'

// Témoin : le pied de page public.
export default function PublicPied() {
  return (
    <footer>
      <Link href="/confidentialite">Confidentialité</Link>
      <Link href="/mentions-legales">Mentions légales</Link>
      <Link href="/cgu">Conditions d’utilisation</Link>
    </footer>
  )
}
