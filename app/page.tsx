export default function Home() {
  return (
    <main className="wrap">
      <div className="brand"><span className="dot" />Presti</div>
      <h1>Ne perds plus jamais un chantier.</h1>
      <p className="muted">Espace artisan. Connecte-toi ou crée ton compte pour commencer.</p>
      <div className="row">
        <a className="ghost" href="/login">Se connecter</a>
        <a className="primary" href="/signup">Créer un compte</a>
      </div>
    </main>
  )
}
