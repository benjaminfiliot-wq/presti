import PublicNav from './PublicNav'
import PublicPied from './PublicPied'

// Témoin : l'ancienne accueil (son empreinte : le h1 de app/page.tsx:183 à 1c6a6af6, et plus de 7 sections). Elle n'est jamais jugée.
export default function AccueilActuelle() {
  return (
    <div className="lp">
      <PublicNav />
      <main>
        <section><h1>Le premier qui répond <span className="g">décroche le chantier.</span></h1><p>Ancienne page d’accueil.</p><a className="lp-btn lp-btn--p" href="/signup">Essayer gratuitement</a></section>
        {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((k) => <section key={k} id={`ancienne-${k}`}><h2>Bloc {k}</h2></section>)}
      </main>
      <PublicPied />
    </div>
  )
}
