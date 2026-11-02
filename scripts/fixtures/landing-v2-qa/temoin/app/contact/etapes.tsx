// Témoin : « Ce qui se passe ensuite », LE SEUL module qui porte le texte imposé (plan du chantier 4, l.187-193) ; le bloc et sa suite l'importent.
export const TITRE_ENSUITE = 'Ce qui se passe ensuite'
export const ETAPES = [
  'Un premier échange : nous vous posons quelques questions sur votre équipe, vos outils et les tâches qui vous prennent du temps.',
  'Un second rendez-vous : une démonstration sur vos propres cas, puis une proposition sur devis.',
  'Vous décidez librement.',
]

export function Ensuite() {
  return (
    <div className="lp2-ensuite">
      <h3>{TITRE_ENSUITE}</h3>
      <ol>
        {ETAPES.map((e) => <li key={e}>{e}</li>)}
      </ol>
    </div>
  )
}
