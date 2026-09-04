// 404 d'une surface artisan — SANS marque Presti (audit v4 : une sous-page d'un site artisan
// servait la 404 aux couleurs de Presti ; fuite white-label sur domaine perso). Vrai code 404 :
// plus de « page fantôme » en 200 indexable.
export default function SiteIntrouvable() {
  return (
    <main className="site" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        <p style={{ fontSize: '.8rem', letterSpacing: '.18em', textTransform: 'uppercase', opacity: .6, margin: 0 }}>Erreur 404</p>
        <h1 style={{ fontSize: '1.6rem', margin: '.6rem 0' }}>Cette page n’existe pas</h1>
        <p style={{ opacity: .75, margin: 0 }}>Le lien est peut-être incomplet, ou la page n’est plus en ligne.</p>
      </div>
    </main>
  )
}
