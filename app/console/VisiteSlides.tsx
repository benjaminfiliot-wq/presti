'use client'

// La visite guidée en SLIDES de la console v2 (refonte 18/10, étape 5.3 ; ARCHITECTURE.md §2.5). Cinq écrans plein cadre à la
// première connexion, éclairés par l'aube (seul endroit de la console avec « Découvrir »). Remplace, dans la coque v2 seulement,
// le projecteur de app/Visite.tsx (qui reste celui de la console actuelle). Même mémoire (artisans.aide_vues, repli local) : c'est
// AppShell qui la tient. Passable à tout moment (« Passer », Échap), clavier (← →), relançable depuis l'aide et Ctrl+K.
// Les textes reprennent ceux de la visite actuelle (app/Visite.tsx) et les promesses publiées ; chaque fonction qui commence
// avec une offre le dit.
import '@/components/ui/ui.css'
import './visite-slides.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Icone } from '@/components/ui/icones'
import { offreMinimale, PLANS } from '@/lib/plans'

const STUDIO = (() => { const o = offreMinimale('plateforme.conversation'); return o ? PLANS[o].label : 'Studio' })()
const CHIFFRES = (() => { const o = offreMinimale('chiffres'); return o ? PLANS[o].label : 'Studio' })()

type Diapo = { id: string; sur: string; titre: string; texte: string; visuel: string[] }
const DIAPOS: Diapo[] = [
  { id: 'bienvenue', sur: 'Bienvenue', titre: 'Votre journée, sur un seul écran', texte: 'L’accueil « Aujourd’hui » vous dit quoi faire d’abord : les demandes à répondre, les devis à relancer, les factures en retard. Un clic, et vous y êtes.', visuel: ['Demandes', 'Devis', 'Factures'] },
  { id: 'lien', sur: `Dès l’offre ${STUDIO}`, titre: 'Votre lien de contact', texte: 'Mettez-le sur votre fiche Google, votre page Facebook ou votre signature mail : chaque demande faite par ce lien arrive dans Presti, la réponse est prête en moins d’une minute, dans votre ton. Vous la relisez, vous l’envoyez.', visuel: ['Demande', 'Réponse prête', 'Envoyée'] },
  { id: 'devis', sur: 'Devis et factures', titre: 'Le devis, sur vos prix', texte: 'Décrivez le chantier, l’IA propose un chiffrage, sur vos prix dès que votre bibliothèque de tarifs est remplie. Vous ajustez, vous envoyez ; quand le client accepte, la facture se fait en un clic.', visuel: ['Brouillon', 'Envoyé', 'Facturé'] },
  { id: 'chiffres', sur: `Dès l’offre ${CHIFFRES}`, titre: 'Vos chiffres, sans tableur', texte: 'Ce que vous avez facturé, ce qui est encaissé, ce qui traîne : calculé à partir de vos devis et de vos factures, rien à saisir.', visuel: ['Facturé', 'Encaissé', 'En retard'] },
  { id: 'raccourcis', sur: 'Pour aller vite', titre: 'Tout est à une touche', texte: 'Ctrl K ouvre la recherche : une page, un client, un devis, « Nouveau devis ». Sur téléphone, la barre du bas mène à l’essentiel, « Plus » à tout le reste. Le bouton « ? » de chaque écran explique la page et relance cette visite.', visuel: ['Ctrl K', 'Barre du bas', '?'] },
]

export default function VisiteSlides({ onFin }: { onFin: (terminee: boolean) => void }) {
  const [i, setI] = useState(0)
  const boite = useRef<HTMLDivElement>(null)
  const avant = useRef<HTMLElement | null>(null)
  const n = DIAPOS.length
  const fin = useCallback((terminee: boolean) => { avant.current?.focus?.(); onFin(terminee) }, [onFin])

  useEffect(() => {
    avant.current = document.activeElement as HTMLElement | null
    boite.current?.querySelector<HTMLElement>('.vs-suivant')?.focus()
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); fin(false) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); setI((k) => Math.min(k + 1, n - 1)) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setI((k) => Math.max(k - 1, 0)) }
      else if (e.key === 'Tab') {
        const f = Array.from(boite.current?.querySelectorAll<HTMLElement>('button') ?? [])
        if (!f.length) return
        const premier = f[0], dernier = f[f.length - 1]
        if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus() }
        else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus() }
      }
    }
    document.addEventListener('keydown', surTouche)
    return () => document.removeEventListener('keydown', surTouche)
  }, [fin, n])

  const d = DIAPOS[i]
  const derniere = i === n - 1
  return (
    <div className="vs-voile">
      <div ref={boite} className="vs" role="dialog" aria-modal="true" aria-labelledby="vs-titre" aria-describedby="vs-texte" aria-roledescription="diaporama">
        <div className="vs-visuel" aria-hidden="true">
          {d.visuel.map((v, k) => <span key={v} className={k === 0 ? 'on' : ''} style={{ ['--k' as string]: k }}>{v}</span>)}
        </div>
        <div className="vs-corps">
          <span className="vs-sur">{d.sur}</span>
          <h2 id="vs-titre">{d.titre}</h2>
          <p id="vs-texte">{d.texte}</p>
        </div>
        <div className="vs-nav">
          <ol className="vs-pts" aria-label={`Écran ${i + 1} sur ${n}`}>
            {DIAPOS.map((x, k) => <li key={x.id} className={k === i ? 'on' : k < i ? 'vu' : ''} aria-current={k === i ? 'step' : undefined} />)}
          </ol>
          <button type="button" className="ui-btn ui-btn--g" onClick={() => fin(false)}>Passer</button>
          {i > 0 ? <button type="button" className="ui-btn ui-btn--s" onClick={() => setI(i - 1)} aria-label="Écran précédent"><Icone nom="gauche" /></button> : null}
          <button type="button" className="ui-btn ui-btn--p vs-suivant" onClick={() => (derniere ? fin(true) : setI(i + 1))}>{derniere ? 'C’est parti' : 'Suivant'}{derniere ? null : <Icone nom="droite" />}</button>
        </div>
        <p className="ui-sr" aria-live="polite">Écran {i + 1} sur {n} : {d.titre}</p>
      </div>
    </div>
  )
}
