import { actif } from '@/lib/flags'
import AccueilActuelle from './AccueilActuelle'
import LandingV2 from './LandingV2'

// Témoin : la porte du drapeau. Baissé, l'accueil reste l'ancienne page ; levé, la v2.
export function generateMetadata() {
  return actif('landingV2')
    ? { title: { absolute: 'Presti — l’assistant des artisans du bâtiment' }, description: 'Presti prépare vos réponses, vos devis et vos relances ; vous validez, ou Signature envoie seul.', alternates: { canonical: '/' } }
    : { title: { absolute: 'Presti — logiciel de devis pour artisans' }, description: 'Devis chiffrés par l’IA sur vos prix.', alternates: { canonical: '/' } }
}

export default function Page() {
  return actif('landingV2') ? <LandingV2 /> : <AccueilActuelle />
}
