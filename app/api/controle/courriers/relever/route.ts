import { NextResponse } from 'next/server'
import { estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { relever } from '@/lib/direction/courriers'
import { actif } from '@/lib/flags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// POST /api/controle/courriers/relever — aller chercher ce qui est arrivé.
//
// Pas de re-confirmation : relever une boîte ne modifie rien chez personne, ça ne fait qu'inscrire ce
// que le serveur de messagerie contient déjà. Pas de journal non plus, pour la même raison — le journal
// de direction sert à retracer des DÉCISIONS, pas des rafraîchissements.
export async function POST(req: Request) {
  if (!actif('messagerie')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const perimetre = exigerDomaine(f, 'messagerie', 'ecrire')
  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)
  const r = await relever(40)
  if (!r.ok) return NextResponse.json({ error: r.erreur }, { status: 503 })
  // « Il en reste » n'est pas un détail : la relève est bornée par passage, et un retard qu'on ne
  // dit pas s'accumule sans que personne ne le sache.
  const suite = r.reste ? ' Il en reste à relever : relancez.' : ''
  return NextResponse.json({
    ...r,
    message: (r.nouveaux === 0 ? `Rien de nouveau (${r.lus} message${r.lus > 1 ? 's' : ''} examiné${r.lus > 1 ? 's' : ''}).`
      : `${r.nouveaux} nouveau${r.nouveaux > 1 ? 'x' : ''} message${r.nouveaux > 1 ? 's' : ''}.`) + suite,
  })
}
