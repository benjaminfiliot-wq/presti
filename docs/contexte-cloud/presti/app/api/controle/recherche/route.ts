import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estFondateur, estRefus, reponseRefus } from '@/lib/direction/garde'
import { peutFaire, borneAuxSiennes } from '@/lib/controle/droits'
import { seulsLesVrais } from '@/lib/direction/perimetre'
import { actif } from '@/lib/flags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/controle/recherche?q=… — tout se trouve en trois lettres (prompt v11 §1).
//
// Un artisan, un apport, un email, une alerte, une ligne de journal. Une seule requête, une seule
// réponse, triée par ce qui a le plus de chances d'être cherché.
//
// Trois choix qui méritent d'être dits :
//
//   • le PÉRIMÈTRE s'applique ici comme ailleurs. Un partenaire qui tape trois lettres ne doit pas
//     découvrir par la recherche ce que les écrans lui refusent — ce serait la plus bête des fuites ;
//   • on ne cherche QUE dans ce qui appartient à l'entreprise. Jamais dans les conversations d'un
//     artisan avec ses clients, ni dans ses devis : ils ne sont pas à nous ;
//   • les comptes marqués « démo » sont exclus comme partout, sauf si on les cherche par leur nom
//     exact — sinon on ne pourrait plus les retrouver pour les nettoyer.
type Resultat = {
  type: 'artisan' | 'apport' | 'courrier' | 'alerte' | 'journal'
  id: string
  titre: string
  detail: string
  onglet: string
  cible?: string
}

const MIN = 2
const LIMITE = 6

export async function GET(req: Request) {
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().slice(0, 60)
  if (q.length < MIN) return NextResponse.json({ resultats: [], q, message: `Tapez au moins ${MIN} caractères.` })

  const voit = (d: Parameters<typeof peutFaire>[1]) => peutFaire(f.roleInterne, d, 'voir')
  const motif = `%${q.replace(/[%_]/g, (c) => `\\${c}`)}%`
  const resultats: Resultat[] = []

  // ── Les artisans ────────────────────────────────────────────────────────────────────────────────
  if (voit('clients').permis) {
    const { data } = await seulsLesVrais(supabaseAdmin.from('artisans')
      .select('id, nom, email, metier, plan'))
      .or(`nom.ilike.${motif},email.ilike.${motif},metier.ilike.${motif}`)
      .limit(LIMITE)
    for (const a of data ?? []) {
      resultats.push({
        type: 'artisan', id: a.id, titre: a.nom || a.email || 'Sans nom',
        detail: [a.metier, a.plan].filter(Boolean).join(' · '),
        onglet: 'clients', cible: a.id,
      })
    }
  }

  // ── Les apports ─────────────────────────────────────────────────────────────────────────────────
  if (actif('apports') && voit('apports').permis) {
    // Le partenaire ne cherche que dans SES apports : le même filtre que la liste, pas un autre.
    const mesCodes = borneAuxSiennes(f.roleInterne, 'apports')
      ? ((await supabaseAdmin.from('apporteurs').select('id').eq('artisan_id', f.uid)).data ?? []).map((x) => x.id)
      : null
    let r = supabaseAdmin.from('registre_apports').select('id, artisan_id, statut, motif, piece').limit(LIMITE)
    if (mesCodes) r = r.in('apporteur_id', mesCodes.length ? mesCodes : ['00000000-0000-0000-0000-000000000000'])
    const { data } = await r.or(`motif.ilike.${motif},piece.ilike.${motif}`)
    const ids = [...new Set((data ?? []).map((x) => x.artisan_id))]
    const { data: noms } = ids.length ? await supabaseAdmin.from('artisans').select('id, nom').in('id', ids) : { data: [] }
    const parId = new Map((noms ?? []).map((x) => [x.id, x.nom]))
    for (const l of data ?? []) {
      resultats.push({
        type: 'apport', id: l.id, titre: `Apport — ${parId.get(l.artisan_id) ?? 'artisan'}`,
        detail: [l.statut, l.motif].filter(Boolean).join(' · ').slice(0, 90),
        onglet: 'apports',
      })
    }
  }

  // ── La messagerie de l'entreprise ───────────────────────────────────────────────────────────────
  if (actif('messagerie') && voit('messagerie').permis) {
    let r = supabaseAdmin.from('courriers')
      .select('id, fil, sujet, correspondant_nom, correspondant_email, apercu, statut, recu_le')
      .order('recu_le', { ascending: false }).limit(LIMITE)
    if (borneAuxSiennes(f.roleInterne, 'messagerie')) r = r.eq('assigne_a', f.uid)
    const { data } = await r.or(`sujet.ilike.${motif},correspondant_email.ilike.${motif},correspondant_nom.ilike.${motif},apercu.ilike.${motif}`)
    for (const c of data ?? []) {
      resultats.push({
        type: 'courrier', id: c.id, titre: c.sujet || '(sans objet)',
        detail: `${c.correspondant_nom || c.correspondant_email} · ${c.statut === 'a_traiter' ? 'à traiter' : c.statut}`,
        onglet: 'messagerie', cible: c.fil,
      })
    }
  }

  // ── Les alertes et le journal ───────────────────────────────────────────────────────────────────
  if (voit('sante').permis) {
    const { data } = await supabaseAdmin.from('alertes').select('id, sujet, gravite, acquittee_le, cree_le')
      .ilike('sujet', motif).order('cree_le', { ascending: false }).limit(LIMITE)
    for (const a of data ?? []) {
      resultats.push({
        type: 'alerte', id: a.id, titre: a.sujet ?? 'Alerte',
        detail: `${a.gravite}${a.acquittee_le ? ' · acquittée' : ' · à traiter'}`,
        onglet: 'aujourdhui',
      })
    }
  }

  if (voit('journal').permis) {
    let r = supabaseAdmin.from('journal_direction').select('id, action, acteur_email, cible_id, cree_le')
      .order('cree_le', { ascending: false }).limit(LIMITE)
    if (borneAuxSiennes(f.roleInterne, 'journal')) r = r.eq('acteur_id', f.uid)
    const { data } = await r.ilike('action', motif)
    for (const j of data ?? []) {
      resultats.push({
        type: 'journal', id: j.id, titre: j.action.replace(/_/g, ' '),
        detail: `${j.acteur_email ?? 'fondateur'} · ${new Date(j.cree_le).toLocaleDateString('fr-FR')}`,
        onglet: 'journal',
      })
    }
  }

  // Un artisan d'abord : c'est ce qu'on cherche neuf fois sur dix depuis cet écran.
  const ordre: Resultat['type'][] = ['artisan', 'courrier', 'apport', 'alerte', 'journal']
  resultats.sort((a, b) => ordre.indexOf(a.type) - ordre.indexOf(b.type))

  return NextResponse.json({ resultats: resultats.slice(0, 20), q, a: new Date().toISOString() })
}
