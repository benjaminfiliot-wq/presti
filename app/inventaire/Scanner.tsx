'use client'

import { useEffect, useRef, useState } from 'react'
import { estNatif, scannerCodeBarres, vibrer } from '@/lib/natif'

// Scan de code-barres (v4 §9/G2 ; natif v9 J3).
//
// La raison d'être de ce composant : un artisan ne saisira jamais son stock au clavier.
// C'est la seule raison pour laquelle les logiciels d'inventaire échouent chez lui.
// Le scan doit marcher en trois secondes, une main sur le téléphone, l'autre sur le carton.
//
// On utilise le détecteur NATIF du navigateur (BarcodeDetector, présent sur Android/Chrome).
// Quand il n'existe pas — iOS Safari notamment — on ne fait pas semblant : on le dit et on
// propose la saisie du code à la main, ce qui reste plus rapide que tout réécrire.

type Props = { onCode: (code: string) => void; onFermer: () => void }

type Detecteur = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> }
type FenetreAvecDetecteur = Window & {
  BarcodeDetector?: new (opts?: { formats?: string[] }) => Detecteur
}

export default function Scanner({ onCode, onFermer }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const [etat, setEtat] = useState<'demarrage' | 'scan' | 'indisponible' | 'refus'>('demarrage')
  const [manuel, setManuel] = useState('')

  useEffect(() => {
    // Dans l'application (coque Capacitor) : le lecteur natif ML Kit, plein écran, qui marche aussi sur iPhone.
    // Annulé ou refusé → on ferme, sans faire semblant ; hors coque → le détecteur du navigateur ci-dessous.
    if (estNatif()) {
      let vivant = true
      scannerCodeBarres().then((code) => {
        if (!vivant) return
        if (code === undefined) { setEtat('indisponible'); return }
        if (code === 'refus') { setEtat('refus'); return }
        if (code) { void vibrer('succes'); onCode(code) } else onFermer()
      })
      return () => { vivant = false }
    }
    const W = window as FenetreAvecDetecteur
    if (typeof W.BarcodeDetector !== 'function') { setEtat('indisponible'); return }

    let flux: MediaStream | null = null
    let boucle = 0
    let vivant = true

    ;(async () => {
      try {
        flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (!vivant) { flux.getTracks().forEach((t) => t.stop()); return }
        if (video.current) { video.current.srcObject = flux; await video.current.play() }
        setEtat('scan')
        const detecteur = new W.BarcodeDetector!({
          formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf'],
        })
        const lire = async () => {
          if (!vivant || !video.current) return
          try {
            const codes = await detecteur.detect(video.current)
            const v = codes[0]?.rawValue?.trim()
            if (v) { vivant = false; onCode(v); return }
          } catch { /* image illisible sur cette frame : on retente à la suivante */ }
          boucle = requestAnimationFrame(lire)
        }
        boucle = requestAnimationFrame(lire)
      } catch {
        setEtat('refus')
      }
    })()

    return () => {
      vivant = false
      cancelAnimationFrame(boucle)
      flux?.getTracks().forEach((t) => t.stop())
    }
    // onFermer n'est lu qu'à l'annulation du lecteur natif : le relancer à chaque rendu du parent rouvrirait la caméra.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCode])

  return (
    <div className="inv-scan" role="dialog" aria-modal="true" aria-label="Scanner un code-barres">
      <div className="inv-scan-in">
        <button type="button" className="inv-scan-x" onClick={onFermer} aria-label="Fermer">✕</button>

        {etat === 'scan' || etat === 'demarrage' ? (
          <>
            <video ref={video} className="inv-scan-v" muted playsInline />
            <span className="inv-scan-viseur" aria-hidden="true" />
            <p className="inv-scan-t">{etat === 'demarrage' ? 'Ouverture de la caméra…' : 'Placez le code-barres dans le cadre'}</p>
          </>
        ) : null}

        {etat === 'refus' ? (
          <p className="inv-scan-t">
            {estNatif() ? 'L’accès à la caméra est refusé pour Presti. Autorisez-le dans les réglages du téléphone (Applications → Presti → Autorisations), ou saisissez le code ci-dessous.' : 'L’accès à la caméra a été refusé. Autorisez-le dans les réglages de votre navigateur, ou saisissez le code ci-dessous.'}
          </p>
        ) : null}

        {etat === 'indisponible' ? (
          <p className="inv-scan-t">
            Votre navigateur ne sait pas lire un code-barres (c’est le cas de Safari sur iPhone).
            Saisissez le code à la main — c’est encore le plus rapide.
          </p>
        ) : null}

        <form
          className="inv-scan-manuel"
          onSubmit={(e) => { e.preventDefault(); if (manuel.trim()) onCode(manuel.trim()) }}
        >
          <input value={manuel} onChange={(e) => setManuel(e.target.value)} placeholder="Code-barres" inputMode="numeric" autoComplete="off" />
          <button type="submit" className="btn btn--primary" style={{ width: 'auto', margin: 0 }} disabled={!manuel.trim()}>Valider</button>
        </form>
      </div>
    </div>
  )
}
