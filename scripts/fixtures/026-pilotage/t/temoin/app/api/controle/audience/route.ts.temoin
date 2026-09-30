import { NextResponse } from 'next/server'
import { estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { PLAFOND_JOUR_AUDIENCE } from '@/lib/audienceServeur'
import { audience } from '@/lib/controle/lectures'
import { actif } from '@/lib/flags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/controle/audience[?historique=1] — l'onglet Visiteurs (migrations 0090 à 0092).
//
// Des VISITES, et aucun compte nommé. La première version rendait dans la même réponse les vues à la seconde et
// les connexions et inscriptions avec le nom de l'artisan : par faible trafic, deux lignes voisines disaient qui était
// qui — le recoupement que l'exemption de consentement de la CNIL exclut et que /confidentialite promet de ne jamais
// faire (revue adversariale du 14/09). Masquer les attributs sur /login et /signup seulement ne suffisait pas : la ligne
// d'accueil du même visiteur les gardait (contre-revue). Le flux ne porte donc plus que page, minute et arrivée ; les
// attributs vivent dans les agrégats sur 7 jours ; les inscriptions du jour sont un NOMBRE ; aucune empreinte ne sort.
//
// `saturee` : le plafond du jour de la route publique est-il atteint ? Sans ce signal, une mesure coupée par un
// tiers se lisait comme un jour calme.
//
// La garde passe AVANT le drapeau : un inconnu reçoit 401 et un partenaire 403, mesure levée ou non
// (fermeture-e2e, controle-droits-e2e) ; seul un fondateur apprend qu'elle n'existe pas encore.
export async function GET(req: Request) {
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const perimetre = exigerDomaine(f, 'audience', 'voir')
  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)
  if (!actif('audience')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })

  const avecHistorique = new URL(req.url).searchParams.get('historique') === '1'
  const { direct, inscriptions, historique, saturee } = await audience(avecHistorique ? 'historique' : 'jour')
  // La table absente n'est pas « zéro visiteur » : c'est une migration à appliquer, et l'écran doit le dire.
  if (direct.erreur && /does not exist|could not find|schema cache/i.test(direct.erreur)) {
    return NextResponse.json({ error: 'La mesure d’audience n’a pas encore ses tables : les migrations 0090 à 0092 sont à appliquer.', code: 'indisponible' }, { status: 503 })
  }
  return NextResponse.json({ direct, inscriptions, historique, saturee, plafondJour: PLAFOND_JOUR_AUDIENCE, role: f.role, a: new Date().toISOString() })
}
