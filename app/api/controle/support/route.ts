import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { actif } from '@/lib/flags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/controle/support?artisan=<uuid>
//
// Ce que le Poste de contrôle sait du support d'un artisan : ses demandes d'aide, l'état de chaque
// porte, et ce qui a été consulté. GET seulement — demander se fait ailleurs, lire aussi.
//
// Rien ici ne vient des données de ses clients. `element_titre` est le libellé que l'ARTISAN a vu
// en demandant de l'aide (« Devis n° 2026-041 ») : son numéro de devis, pas le nom de son client.
//
// Le verrou est rendu tel quel. Un fondateur qui ne saurait pas qu'un artisan a verrouillé
// essaierait de demander, recevrait un refus sec, et n'y comprendrait rien — alors que la bonne
// réaction est simplement de répondre par écrit.

export async function GET(req: Request) {
  if (!actif('supportArtisan')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  // Voir l'état d'une porte n'est pas lire ce qu'il y a derrière : un fondateur en lecture seule y a
  // droit. C'est `lire` qui exige le rôle direction, pas ce listage.
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const perimetre = exigerDomaine(f, 'support', 'voir')
  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)

  const artisan = new URL(req.url).searchParams.get('artisan') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(artisan)) return NextResponse.json({ error: 'Artisan inconnu.' }, { status: 400 })

  const [tickets, acces, lectures, verrou] = await Promise.all([
    supabaseAdmin.from('tickets')
      .select('id, sujet, ouvert_le, ferme_le, element_type, element_id, element_titre')
      .eq('artisan_id', artisan).order('ouvert_le', { ascending: false }).limit(20),
    supabaseAdmin.from('acces_support')
      .select('id, ticket_id, element_type, element_id, element_titre, motif, demande_le, notifie_le, ouvert_le, expire_le, refuse_le, refuse_motif, ferme_le, ferme_motif')
      .eq('artisan_id', artisan).order('demande_le', { ascending: false }).limit(50),
    supabaseAdmin.from('acces_support_lectures')
      .select('id, acces_id, vue, acteur_nom, lu_le')
      .eq('artisan_id', artisan).order('lu_le', { ascending: false }).limit(100),
    supabaseAdmin.from('support_verrou').select('pose_le').eq('artisan_id', artisan).maybeSingle(),
  ])

  // 0075 : un ticket sans élément désigné n'ouvre aucun accès. C'est calculé ici, une fois, pour que
  // l'écran n'ait pas à redeviner la règle — et pour qu'il ne propose pas un bouton voué au refus.
  const maintenant = Date.now()
  const lignes = (acces.data ?? []).map((a) => ({
    ...a,
    etat: a.refuse_le ? 'refuse'
      : a.ferme_le ? 'ferme'
      : a.ouvert_le && a.expire_le && Date.parse(a.expire_le) > maintenant ? 'ouvert'
      : a.ouvert_le ? 'expire'
      : a.notifie_le ? 'en_attente'
      : 'non_notifie',
    lectures: (lectures.data ?? []).filter((l) => l.acces_id === a.id).length,
  }))

  return NextResponse.json({
    verrou: verrou.data ? { pose_le: verrou.data.pose_le } : null,
    tickets: (tickets.data ?? []).map((t) => ({
      ...t,
      // Ce qui décide si le bouton « Demander à regarder » existe. Un ticket ouvert sans élément
      // désigné se règle en répondant, pas en regardant.
      demandable: !t.ferme_le && !!t.element_id && !verrou.data,
      acces: lignes.filter((a) => a.ticket_id === t.id),
    })),
    lectures: lectures.data ?? [],
    portee: 'États et libellés seulement. Le contenu des échanges, les coordonnées des clients et les photos ne passent jamais par ici.',
    a: new Date().toISOString(),
  })
}
