import { NextResponse } from 'next/server'
import { recupererDepuisHibp } from '@/lib/motDePasse'
import { getIp, isBanned, recordAbuse } from '@/lib/security'

export const runtime = 'nodejs'

// Relais vers Have I Been Pwned pour la vérification des mots de passe fuités.
//
// Pourquoi un relais plutôt qu'un appel direct depuis le navigateur : l'audit a
// resserré la CSP pour qu'aucune page ne puisse contacter un domaine extérieur
// (c'était un canal d'exfiltration tout prêt). On ne rouvre pas cette porte pour
// une seule fonctionnalité — le navigateur parle à notre serveur, notre serveur
// parle à HIBP.
//
// Ce que ce serveur voit : cinq caractères hexadécimaux. Pas le mot de passe, pas
// son empreinte complète, pas l'email. Ces cinq caractères correspondent à des
// centaines de milliers de mots de passe possibles : ils n'identifient rien.
// Rien n'est journalisé.

const PREFIXE_VALIDE = /^[0-9A-F]{5}$/

export async function POST(req: Request) {
  try {
    const ip = getIp(req)
    if (await isBanned(ip)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

    const body = await req.json().catch(() => null)
    const prefixe = typeof body?.prefixe === 'string' ? body.prefixe.toUpperCase() : ''

    // Validation stricte : sans elle, cette route deviendrait un proxy ouvert vers
    // n'importe quelle URL de pwnedpasswords.com. Cinq caractères hexadécimaux, rien d'autre.
    if (!PREFIXE_VALIDE.test(prefixe)) {
      await recordAbuse(ip, 'mdp-fuite : préfixe invalide')
      return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
    }

    const liste = await recupererDepuisHibp(prefixe)

    return new NextResponse(liste, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        // Les fuites ne bougent pas d'une heure à l'autre : on laisse le CDN servir
        // la même tranche à tout le monde. Cache public sans risque — le contenu est
        // le même pour la planète entière et ne dit rien de personne.
        'Cache-Control': 'public, max-age=3600, s-maxage=86400',
      },
    })
  } catch {
    // HIBP indisponible : on le dit franchement plutôt que de renvoyer une liste vide,
    // qui ferait croire au navigateur que le mot de passe est sain.
    return NextResponse.json({ error: 'Service de vérification indisponible.' }, { status: 503 })
  }
}
