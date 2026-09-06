import { estNatif } from '@/lib/natif'

// L'invitation d'installation du navigateur (`beforeinstallprompt`, Chrome/Edge sur Android ET sur ordinateur),
// captée UNE fois ici, pour que la carte de la console (app/InstallerApp.tsx) et l'écran Paramètres → Application
// puissent la rejouer au clic. Le navigateur ne l'émet que si le site est installable et pas encore installé.

type EvenementInstallation = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

let evenement: EvenementInstallation | null = null
const abonnes = new Set<() => void>()
const prevenir = () => { for (const f of abonnes) f() }

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); evenement = e as EvenementInstallation; prevenir() })
  window.addEventListener('appinstalled', () => { evenement = null; prevenir() })
}

/** Le navigateur a proposé l'installation : un bouton « Installer » peut la rejouer. */
export const peutInstaller = (): boolean => evenement !== null

/** Être prévenu quand l'invitation arrive ou disparaît. Rend la fonction de désabonnement. */
export const surChangement = (f: () => void): (() => void) => { abonnes.add(f); return () => { abonnes.delete(f) } }

/** Rejoue l'invitation du navigateur (au clic). */
export async function installer(): Promise<'accepte' | 'refuse' | 'indisponible'> {
  const e = evenement
  if (!e) return 'indisponible'
  try {
    await e.prompt()
    const choix = await e.userChoice.catch(() => ({ outcome: 'dismissed' as const }))
    if (choix.outcome === 'accepted') evenement = null
    prevenir()
    return choix.outcome === 'accepted' ? 'accepte' : 'refuse'
  } catch { return 'indisponible' }
}

/** Déjà installée : écran d'accueil (standalone), iOS, ou la coque native. */
export const estInstallee = (): boolean => {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { standalone?: boolean }
  return matchMedia('(display-mode: standalone)').matches || nav.standalone === true || estNatif()
}
