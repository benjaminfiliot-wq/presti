// La carte de vente du pack pubs locales sur le tableau de bord (fiche 026-144). Rendue sous actif('packPubVente').
// Trois phrases vraies, aucune promesse de résultat, de contacts ou de classement.
import Link from 'next/link'
import { PRIX_PACK_PUB_TEXTE } from '@/lib/packPub'

export default function CartePackPub() {
  return (
    <div className="tool-card">
      <h2>Vos pubs locales, faites avec vos photos</h2>
      <p className="muted" style={{ margin: '0 0 .4rem' }}>Vous recevez trois vidéos verticales, trois visuels carrés, les textes et une fiche pour lancer la pub.</p>
      <p className="muted" style={{ margin: '0 0 .4rem' }}>Tout est fait avec vos propres photos de chantier : aucune personne n’est inventée.</p>
      <p className="muted" style={{ margin: '0 0 .8rem' }}>{PRIX_PACK_PUB_TEXTE} une fois.</p>
      <Link className="btn btn--primary" href="/pubs/commander">Préparer mon pack</Link>
    </div>
  )
}
