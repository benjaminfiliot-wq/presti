// Un titre découpé en mots (033-009) : chaque mot monte derrière son propre masque, l'un après l'autre (--m), quand le bloc .reveal qui
// le contient entre à l'écran (Motion.tsx pose .in). Rien n'est caché sans script ni en mouvement réduit (le masquage attend
// .reveal-armed). Les espaces restent de vrais espaces : le titre se lit et se copie normalement.
import type { CSSProperties } from 'react'

export default function Mots({ texte, depart = 0 }: { texte: string; depart?: number }) {
  return (
    <>
      {texte.split(' ').map((m, i) => (
        <span key={i}>
          {i > 0 ? ' ' : null}
          <span className="lp3-mot"><span style={{ '--m': depart + i } as CSSProperties}>{m}</span></span>
        </span>
      ))}
    </>
  )
}
