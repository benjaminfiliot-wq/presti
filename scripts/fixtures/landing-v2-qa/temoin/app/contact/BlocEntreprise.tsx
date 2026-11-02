'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Ensuite } from './etapes'

// Témoin : le bloc de démonstration Entreprise de /contact, lu au motif « entreprise ». La confirmation (après l'envoi) reprend le même module.
export default function BlocEntreprise() {
  const motif = useSearchParams().get('motif')
  const [fait, setFait] = useState(false)
  if (motif !== 'entreprise') return null
  if (fait) {
    return (
      <section className="lp2-demo-entreprise" role="status">
        <h2>Votre demande est bien partie</h2>
        <Ensuite />
      </section>
    )
  }
  return (
    <section className="lp2-demo-entreprise">
      <h2>Demande de démonstration pour votre entreprise</h2>
      <Ensuite />
      <form onSubmit={(e) => { e.preventDefault(); setFait(true) }}>
        <label>Votre prénom<input name="prenom" required /></label>
        <label>Votre e-mail<input name="email" type="email" required /></label>
        <button type="submit">Envoyer ma demande</button>
      </form>
    </section>
  )
}
