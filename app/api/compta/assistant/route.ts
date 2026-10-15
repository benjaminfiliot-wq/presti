import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getUserRevocable } from '@/lib/authArtisan'
import { consumeCredit, rendreCredit } from '@/lib/credits'
import { signalerPanneIA } from '@/lib/alerteService'
import { resolveModel } from '@/lib/models'
import { demanderPlanCompta } from '@/lib/ai/compta'
import { decisionPourEcran } from '@/lib/accesOffre'
import { LIMITES_ECHANTILLON, validerPlanIA, type Echantillon } from '@/lib/comptaAssistant'

export const runtime = 'nodejs'
export const maxDuration = 60

// L'assistant comptable : reçoit la forme des fichiers (jamais un montant, voir lib/comptaAssistant)
// et rend le plan de rangement que l'IA propose, déjà revalidé. Un crédit Standard par rangement,
// rendu si l'IA échoue. En cas d'échec, le navigateur range quand même avec ses règles : l'artisan
// n'est jamais bloqué par une panne du modèle.
const TAILLE_MAX = 120_000

function lireEchantillon(brut: unknown): Echantillon | null {
  const L = LIMITES_ECHANTILLON
  const b = brut as { feuilles?: unknown }
  if (!b || !Array.isArray(b.feuilles) || b.feuilles.length === 0 || b.feuilles.length > L.feuilles) return null
  const chaine = (v: unknown) => (typeof v === 'string' ? v.slice(0, L.longueur) : null)
  const grille = (v: unknown, lignes: number, colonnes: number) => {
    if (!Array.isArray(v) || v.length > lignes) return null
    const sortie: string[][] = []
    for (const r of v) {
      if (!Array.isArray(r) || r.length > colonnes) return null
      const ligne = r.map(chaine)
      if (ligne.some((x) => x === null)) return null
      sortie.push(ligne as string[])
    }
    return sortie
  }
  const feuilles = []
  for (const f of b.feuilles) {
    const o = f as Record<string, unknown>
    const apercu = grille(o?.apercu, L.lignesApercu, L.colonnes)
    const valeurs = grille(o?.valeurs, L.colonnes, L.valeursParColonne)
    if (typeof o?.nom !== 'string' || typeof o?.lignes !== 'number' || !apercu || !valeurs) return null
    // Les chiffres doivent arriver masqués : un montant en clair n'a rien à faire ici.
    if ([...apercu.flat(), ...valeurs.flat()].some((x) => /[0-8]/.test(x))) return null
    feuilles.push({ nom: o.nom.slice(0, 80), lignes: Math.max(0, Math.floor(o.lignes)), apercu, valeurs })
  }
  return { feuilles }
}

export async function POST(req: Request) {
  let aRendre: { uid: string; fondateur: boolean } | null = null
  try {
    const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    const { data: userData, error: uErr } = await getUserRevocable(token)
    if (uErr || !userData?.user) return NextResponse.json({ error: 'Session expirée, reconnectez-vous.' }, { status: 401 })

    const texte = await req.text()
    if (texte.length > TAILLE_MAX) return NextResponse.json({ error: 'Fichiers trop volumineux pour l’assistant.' }, { status: 413 })
    let corps: unknown
    try { corps = JSON.parse(texte) } catch { return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 }) }
    const echantillon = lireEchantillon((corps as { echantillon?: unknown })?.echantillon)
    if (!echantillon) return NextResponse.json({ error: 'Requête illisible.' }, { status: 400 })

    const { data: artisan } = await supabaseAdmin.from('artisans').select('plan, is_founder').eq('id', userData.user.id).maybeSingle()
    if (!artisan) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 })
    // 15/10 : le rangement des fichiers fait partie de « Mes chiffres », écran de l'offre Studio et au-dessus — avant tout crédit.
    const acces = decisionPourEcran(artisan.plan, 'chiffres')
    if (!acces.ok) return NextResponse.json({ error: acces.erreur, code: acces.code, offre: acces.offre }, { status: acces.statut })

    const credit = await consumeCredit(userData.user.id, 'standard', !!artisan.is_founder)
    if (!credit.ok) return NextResponse.json({ error: credit.error, outOfCredits: true }, { status: 402 })
    aRendre = { uid: userData.user.id, fondateur: !!artisan.is_founder }

    const { model } = resolveModel('standard', artisan.plan)
    const brut = await demanderPlanCompta(echantillon, model)
    // Une feuille mal décrite revient à `null` : le navigateur lui applique ses propres règles.
    const plan = validerPlanIA(brut, echantillon)
    if (!plan) throw new Error('Plan de l’IA invalide')
    return NextResponse.json({ ok: true, plan })
  } catch (e) {
    console.error('[compta/assistant] IA:', e instanceof Error ? e.message : 'erreur')
    await signalerPanneIA('assistant comptable (/api/compta/assistant)', e)
    if (aRendre) await rendreCredit(aRendre.uid, 'standard', aRendre.fondateur)
    return NextResponse.json({ error: 'L’assistant n’a pas répondu : rangement fait avec les règles de base.' }, { status: 502 })
  }
}
