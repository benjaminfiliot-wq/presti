import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { estDirection, estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { journaliser, refusJournal } from '@/lib/direction/journal'
import { creerDemande, lireDemandes, texteDemande, TEXTE_MAX, TEXTE_MIN, QUOTA_JOUR } from '@/lib/agents/demandes'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Les demandes de Benj à l'écosystème (0117) : un texte libre, envoyé depuis le Poste quand la limite de Claude Code
// est atteinte. L'écosystème (le moteur de l'usine) la traite sans Claude Code ; le Poste montre l'état.
// Levé le 29/09/2026 (drapeau demandesEcosysteme). Baissé : 404.
const REFUS_STATUT: Record<string, string> = {
  quota: `${QUOTA_JOUR} demandes par jour au plus : rien n'a été envoyé.`,
  auteur: 'Accès refusé.',
  texte: `La demande fait de ${TEXTE_MIN} à ${TEXTE_MAX} signes.`,
  indisponible: "Rien n'a été envoyé : la base ne répond pas pour l'instant.",
}

export async function POST(req: Request) {
  if (!actif('demandesEcosysteme')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const f = await estDirection(req)
  if (estRefus(f)) return reponseRefus(f)
  const domaine = exigerDomaine(f, 'sante', 'ecrire')
  if (domaineRefuse(domaine)) return reponseRefus(domaine)
  const b = await req.json().catch(() => null) as { texte?: unknown } | null
  const texte = texteDemande(b?.texte)
  if (texte === null) return NextResponse.json({ error: REFUS_STATUT.texte, code: 'texte' }, { status: 400 })
  // Le journal d'abord : une demande qui ne peut pas être journalisée n'est pas envoyée (jamais le texte dans le journal).
  const journalOk = await journaliser({ acteur: f, action: 'consigne_transmise', cible_type: 'demande', apres: { longueur: texte.length } }, req)
  if (!journalOk) return refusJournal()
  const r = await creerDemande(texte, f.uid)
  if (!r.ok) return NextResponse.json({ error: REFUS_STATUT[r.code] ?? "Rien n'a été envoyé.", code: r.code }, { status: r.status })
  return NextResponse.json({ message: "Demande envoyée à l'écosystème.", id: r.data }, { status: 201 })
}

export async function GET(req: Request) {
  if (!actif('demandesEcosysteme')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const domaine = exigerDomaine(f, 'sante', 'voir')
  if (domaineRefuse(domaine)) return reponseRefus(domaine)
  const r = await lireDemandes(null, 30)
  if (!r.ok) return NextResponse.json({ error: REFUS_STATUT[r.code] ?? 'Illisible pour le moment.', code: r.code }, { status: r.status })
  return NextResponse.json({ demandes: r.data, role: f.role }, { headers: { 'cache-control': 'no-store' } })
}
