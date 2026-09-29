import '@/app/globals.css'
import { notFound } from 'next/navigation'
import { DELAI_LIVRAISON_JOURS_OUVRES, PRIX_PACK_STUDIO_TEXTE, VIDEOS_PACK_STUDIO, lireJetonCommande } from '@/lib/studio/offre'

// Page privée du lien de commande du Studio (fiche 026-166) : jamais indexée, 404 pour un jeton faux, altéré ou expiré.
export const metadata = {
  title: 'Votre pack de vidéos',
  robots: { index: false, follow: false },
}
export const dynamic = 'force-dynamic'

export default async function CommanderStudio({ params, searchParams }: { params: Promise<{ jeton: string }>; searchParams: Promise<{ paiement?: string }> }) {
  const { jeton } = await params
  const { paiement } = await searchParams
  const lu = lireJetonCommande(decodeURIComponent(jeton))
  if (!lu) notFound()

  return (
    <main className="legal-wrap">
      <h1>Votre pack de {VIDEOS_PACK_STUDIO} vidéos</h1>
      {paiement === 'ok' && <p className="legal-note">Merci : votre paiement est bien reçu. Vous recevez la facture par courriel, et nous revenons vers vous pour la suite.</p>}
      {paiement === 'annule' && <p className="legal-note">Le paiement a été annulé : rien n’a été débité. Vous pouvez reprendre quand vous le souhaitez.</p>}

      <h2>Ce qui est livré</h2>
      <ul>
        <li>{VIDEOS_PACK_STUDIO} vidéos de démonstration de votre produit, au format vertical.</li>
        <li>Chaque vidéo porte la mention « Vidéo générée par IA ». Aucun témoignage ni avis inventé.</li>
        <li>Vos photos ne sont utilisées qu’avec votre accord écrit ; rien n’est diffusé sans votre accord écrit.</li>
        <li>Livraison sous {DELAI_LIVRAISON_JOURS_OUVRES} jours ouvrés après le paiement.</li>
      </ul>

      <h2>Le prix</h2>
      <p><strong>{PRIX_PACK_STUDIO_TEXTE}</strong>, en une seule fois. TVA non applicable, art. 293 B du CGI.</p>
      <p>Conditions : <a href="/cgu#studio">article « Le pack vidéos du Studio » des conditions générales</a>.</p>

      <form method="post" action="/api/studio/commander">
        <input type="hidden" name="jeton" value={decodeURIComponent(jeton)} />
        <button type="submit" className="btn btn-primary">Payer {PRIX_PACK_STUDIO_TEXTE}</button>
      </form>
    </main>
  )
}
