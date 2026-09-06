'use client'

import { useEffect, useState } from 'react'
import { estNatif, plateforme } from '@/lib/natif'
import { estInstallee, installer, peutInstaller, surChangement } from '@/lib/installation'
import type { SectionProps } from './commun'

// Paramètres → Application : Presti sur le téléphone, la tablette et l'ordinateur — depuis la même adresse.
//  • Android : l'app (APK signé, publié par le workflow de release ; le Play Store suivra M2) ou l'installation
//    depuis Chrome ;
//  • iPhone / iPad : Safari → Partager → « Sur l'écran d'accueil » (l'App Store suivra M1 + M5) ;
//  • ordinateur (Windows, Mac) : Chrome ou Edge → « Installer Presti » ; Safari sur Mac → Fichier → Ajouter au Dock.
// Le bouton « Installer » n'apparaît que si le navigateur a proposé l'installation (lib/installation).

const APK_URL = 'https://gorcdvmueakcncsmrouo.supabase.co/storage/v1/object/public/presti-app/presti.apk'

const estIos = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
const estAndroid = () => /Android/i.test(navigator.userAgent)
const estMac = () => /Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints <= 1

export default function SectionApplication({ signaler }: SectionProps) {
  const [ici, setIci] = useState<'natif' | 'installee' | 'android' | 'ios' | 'mac' | 'pc'>('pc')
  const [invite, setInvite] = useState(false)
  const [apk, setApk] = useState<'inconnu' | 'oui' | 'non'>('inconnu')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setIci(estNatif() ? 'natif' : estInstallee() ? 'installee' : estAndroid() ? 'android' : estIos() ? 'ios' : estMac() ? 'mac' : 'pc')
    setInvite(peutInstaller())
    const off = surChangement(() => setInvite(peutInstaller()))
    // L'APK signé n'existe qu'après la première release publiée : on ne montre pas un lien mort.
    fetch(APK_URL, { method: 'HEAD' }).then((r) => setApk(r.ok ? 'oui' : 'non')).catch(() => setApk('non'))
    return off
  }, [])

  async function installerIci() {
    setBusy(true)
    const r = await installer()
    setBusy(false)
    if (r === 'accepte') signaler({ type: 'ok', text: 'Presti est installée ✅ Ouvrez-la depuis son icône.' })
    else if (r === 'refuse') signaler({ type: 'err', text: 'Installation annulée. Le bouton reste là.' })
  }

  // La coque (stores) : ni lien de téléchargement hors store, ni annonce d'un store « à venir » (critique des fiches, 07/09).
  if (ici === 'natif') {
    return (
      <div className="tool-card" data-application>
        <h2>Presti, partout</h2>
        <p className="notif-etat" data-etat="natif">✅ Vous êtes dans l’application Presti ({plateforme() === 'ios' ? 'iPhone' : 'Android'}).</p>
        <p className="muted" style={{ margin: '.6rem 0 0' }}>La même console, la même adresse, sur votre tablette et votre ordinateur aussi. Vos données restent les mêmes d’un appareil à l’autre.</p>
      </div>
    )
  }

  return (
    <>
      <div className="tool-card" data-application>
        <h2>Presti, partout</h2>
        <p className="muted" style={{ margin: '0 0 .9rem' }}>
          La même console, la même adresse, sur votre téléphone, votre tablette et votre ordinateur. Vos données restent les mêmes d’un appareil à l’autre.
        </p>
        {ici === 'installee' ? <p className="notif-etat" data-etat="installee">✅ Presti est installée sur cet appareil.</p>
          : invite ? (
            <div className="app-ligne">
              <span><b>Installer Presti sur {ici === 'android' ? 'ce téléphone' : 'cet ordinateur'}</b><small>Dans sa propre fenêtre, sans onglets, avec ses notifications.</small></span>
              <button type="button" className="btn btn--primary" data-installer disabled={busy} onClick={installerIci}>{busy ? '…' : 'Installer'}</button>
            </div>
          ) : null}
      </div>

      <div className="tool-card" data-application-android>
        <h2>Sur Android</h2>
        <div className="app-ligne">
          <span><b>L’application Presti</b><small>{apk === 'oui' ? 'Téléchargez, ouvrez le fichier, autorisez l’installation depuis votre navigateur. Le Play Store suivra.' : 'Bientôt sur le Play Store. En attendant, Chrome installe Presti depuis le navigateur.'}</small></span>
          {apk === 'oui' ? <a className="btn btn--ghost" href={APK_URL} data-apk>Télécharger (APK)</a> : null}
        </div>
        <p className="muted" style={{ margin: '.6rem 0 0', fontSize: '.86rem' }}>Ou depuis Chrome : menu ⋮ → « Installer l’application ». Les notifications marchent dans les deux cas.</p>
      </div>

      <div className="tool-card" data-application-ios>
        <h2>Sur iPhone et iPad</h2>
        <p className="muted" style={{ margin: 0 }}>
          Dans <b>Safari</b> : touchez Partager (le carré avec la flèche), puis « Sur l’écran d’accueil », puis « Ajouter ». Presti s’ouvre ensuite depuis son icône, plein écran, avec ses notifications. L’App Store suivra.
        </p>
      </div>

      <div className="tool-card" data-application-pc>
        <h2>Sur ordinateur (Windows, Mac)</h2>
        <p className="muted" style={{ margin: 0 }}>
          Dans <b>Chrome</b> ou <b>Edge</b> : l’icône « Installer » dans la barre d’adresse, ou menu ⋮ → « Installer Presti ». Sur Mac dans <b>Safari</b> : Fichier → « Ajouter au Dock ». Presti s’ouvre alors dans sa propre fenêtre, comme un logiciel.
        </p>
      </div>
    </>
  )
}
