'use client'

// Le banc : chaque composant du moteur, seul, dans les conditions de la landing (fond nuit chaude, sections, défilement).
import { PALETTE, PixelChantier, PixelTrail, PixelTransition, type NomScene } from '..'
import './banc.css'

const SURFACE = '#141319'
const SCENES: { nom: NomScene; titre: string; texte: string }[] = [
  { nom: 'mur', titre: 'Le mur', texte: 'Les briques se posent une à une, rangée par rangée, avec un petit rebond ; le niveau vient dessus.' },
  { nom: 'maison', titre: 'La maison', texte: "L'échafaudage, les murs, le toit en marches, puis la fenêtre qui s'allume." },
  { nom: 'outils', titre: 'Les outils', texte: "Marteau, truelle, clé, niveau : chaque case arrive d'ailleurs et se pose." },
  { nom: 'aube', titre: "L'aube du chantier", texte: 'La lumière monte derrière la grue, bande par bande, en marches.' },
]

export default function Banc() {
  return (
    <main className="banc">
      <header className="banc-tete">
        <strong>Banc des pixels</strong>
        <span>développement seulement · 033-008</span>
        <nav>
          <a href="#traine">Traînée</a>
          <a href="#defilement">Au défilement</a>
          <a href="#boucles">En boucle</a>
        </nav>
      </header>

      <section id="traine" className="banc-section banc-traine">
        <PixelTrail />
        <div className="banc-texte">
          <p className="banc-sur">PixelTrail</p>
          <h1>Bougez la souris sur le fond.</h1>
          <p>Une ligne de pixels se construit sur le trajet du pointeur, puis s&apos;éteint. Au doigt : une onde courte au toucher.</p>
        </div>
      </section>

      <PixelTransition de={PALETTE.nuit} vers={SURFACE} />

      <section id="defilement" className="banc-section banc-surface">
        <p className="banc-sur">PixelChantier · mode « defilement »</p>
        <h2>Les scènes se construisent au défilement.</h2>
        {SCENES.map((s) => (
          <article key={s.nom} id={`defilement-${s.nom}`} className="banc-scene">
            <PixelChantier scene={s.nom} className="banc-toile" />
            <div>
              <h3>{s.titre}</h3>
              <p>{s.texte}</p>
            </div>
          </article>
        ))}
      </section>

      <PixelTransition de={SURFACE} vers={PALETTE.ivoire} hauteur={112} />

      <section id="ivoire" className="banc-section banc-ivoire">
        <p className="banc-sur">Sur fond ivoire</p>
        <h2>La même grammaire, de jour.</h2>
        <PixelChantier scene="mur" mode="boucle" className="banc-toile banc-toile--etroite" />
      </section>

      <PixelTransition de={PALETTE.ivoire} vers={PALETTE.nuit} hauteur={112} sens="descend" />

      <section id="boucles" className="banc-section">
        <p className="banc-sur">PixelChantier · mode « boucle »</p>
        <h2>Jouées quand elles entrent à l&apos;écran.</h2>
        <div className="banc-grille">
          {SCENES.map((s) => (
            <figure key={s.nom} id={`boucle-${s.nom}`}>
              <PixelChantier scene={s.nom} mode="boucle" />
              <figcaption>{s.titre}</figcaption>
            </figure>
          ))}
        </div>
      </section>
      <div className="banc-fin" />
    </main>
  )
}
