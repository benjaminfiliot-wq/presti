import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { exigerReconfirmation } from '@/lib/direction/reconfirmation'
import { journaliser, refusJournal } from '@/lib/direction/journal'
import { transitionPackValide, type EtatPack } from '@/lib/packPub'
import { courrielLivraison, DUREE_LIEN_S, FICHIERS_PACK } from '@/lib/packPubLivraison'
import { sendEmail } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Contexte = { params: Promise<{ id: string }> }

export async function POST(req: Request, ctx: Contexte) {
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const droit = exigerDomaine(f, 'clients', 'ecrire')
  if (domaineRefuse(droit)) return reponseRefus(droit)
  const { id } = await ctx.params
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    return NextResponse.json({ error: 'Identifiant invalide.' }, { status: 400 })
  const corps = await req.json().catch(() => ({})) as { action?: string; consigne?: unknown }
  if (corps.action !== 'livrer' && corps.action !== 'refaire')
    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
  const consigne = typeof corps.consigne === 'string' ? corps.consigne.replace(/<[^>]*>/g, '').trim().slice(0, 1000) : ''
  if (corps.action === 'refaire' && consigne.length < 10)
    return NextResponse.json({ error: 'Une consigne de 10 signes au moins est requise.' }, { status: 400 })
  if (corps.action === 'livrer') {
    const refus = await exigerReconfirmation(req, f.uid, 'artisan')
    if (refus) return refus
  }

  const { data: avant, error: erreurLecture } = await supabaseAdmin.from('packs_pubs')
    .select('id, artisan_id, email, etat, matiere, fabrique_le, livre_le, lien_expire_le, verifications, consigne, refaits')
    .eq('id', id).maybeSingle()
  if (erreurLecture) return NextResponse.json({ error: 'Pack indisponible.' }, { status: 503 })
  if (!avant) return NextResponse.json({ error: 'Pack introuvable.' }, { status: 404 })

  const vers: EtatPack = corps.action === 'livrer' ? 'livree' : 'payee'
  if (!transitionPackValide(avant.etat as EtatPack, vers))
    return NextResponse.json({ error: 'Transition impossible.' }, { status: 409 })
  if (corps.action === 'refaire' && avant.etat === 'livree' &&
    (avant.refaits > 0 || !avant.lien_expire_le || Date.parse(avant.lien_expire_le) <= Date.now()))
    return NextResponse.json({ error: 'Retouche déjà faite ou délai passé.' }, { status: 409 })

  const maintenant = new Date()
  const expireLe = new Date(maintenant.getTime() + DUREE_LIEN_S * 1000).toISOString()
  const journalise = await journaliser({
    acteur: f, action: corps.action === 'livrer' ? 'pack_livre' : 'pack_refaire',
    cible_type: 'pack_pub', cible_id: id, artisan_id: avant.artisan_id,
    avant: { etat: avant.etat, refaits: avant.refaits },
    apres: { etat: vers, refaits: corps.action === 'refaire' ? avant.refaits + 1 : avant.refaits },
    reconfirme: corps.action === 'livrer',
  }, req).catch(() => false)
  if (!journalise) return refusJournal()

  if (corps.action === 'livrer') {
    const { data: fichiers, error: erreurFichiers } = await supabaseAdmin.storage.from('packs-pubs')
      .list(`packs-pubs/${id}`, { limit: 100 })
    if (erreurFichiers) return NextResponse.json({ error: 'Fichiers du pack indisponibles.' }, { status: 503 })
    const presents = new Set((fichiers ?? []).map((fichier) => fichier.name))
    if (FICHIERS_PACK.some((fichier) => !presents.has(fichier)))
      return NextResponse.json({ error: 'Un fichier du pack manque.' }, { status: 409 })
    const chemins = FICHIERS_PACK.map((fichier) => `packs-pubs/${id}/${fichier}`)
    const { data: signes, error: erreurLiens } = await supabaseAdmin.storage.from('packs-pubs').createSignedUrls(chemins, DUREE_LIEN_S)
    if (erreurLiens || !signes || signes.length !== FICHIERS_PACK.length || signes.some((l) => l.error || !l.signedUrl))
      return NextResponse.json({ error: 'Un fichier du pack manque.' }, { status: 409 })
    const { data: artisan, error: erreurArtisan } = avant.artisan_id
      ? await supabaseAdmin.from('artisans').select('nom').eq('id', avant.artisan_id).maybeSingle()
      : { data: null, error: null }
    if (erreurArtisan) return NextResponse.json({ error: 'Artisan indisponible.' }, { status: 503 })
    const courriel = courrielLivraison({
      nom: artisan?.nom ?? '',
      liens: signes.map((l, i) => ({ fichier: FICHIERS_PACK[i], url: l.signedUrl! })),
      expireLe,
      voixSynthese: (avant.matiere as { voix?: string } | null)?.voix === 'synthese',
    })
    const envoi = await sendEmail({ to: avant.email, subject: courriel.sujet, text: courriel.texte, critique: true })
    if (!envoi.ok) return NextResponse.json({ error: 'Envoi impossible.' }, { status: 502 })
    const { data: passe, error: erreurMaj } = await supabaseAdmin.from('packs_pubs')
      .update({ etat: 'livree', livre_le: maintenant.toISOString(), lien_expire_le: expireLe, modifie_le: maintenant.toISOString() })
      .eq('id', id).eq('etat', 'fabriquee').select('id, etat, livre_le, lien_expire_le')
    if (erreurMaj) return NextResponse.json({ error: 'Livraison envoyée, état non enregistré.' }, { status: 503 })
    if (!passe?.length) return NextResponse.json({ error: 'Le pack a changé entre-temps : rechargez.' }, { status: 409 })
    return NextResponse.json({ ok: true, pack: passe[0] })
  }

  let requete = supabaseAdmin.from('packs_pubs').update({
    etat: 'payee', consigne, refaits: avant.refaits + 1, fabrique_le: null,
    verifications: null, modifie_le: maintenant.toISOString(),
  }).eq('id', id).eq('etat', avant.etat).eq('refaits', avant.refaits)
  if (avant.etat === 'livree') requete = requete.gt('lien_expire_le', maintenant.toISOString())
  const { data: passe, error: erreurMaj } = await requete.select('id, etat, refaits')
  if (erreurMaj) return NextResponse.json({ error: 'Retouche impossible.' }, { status: 503 })
  if (!passe?.length) return NextResponse.json({ error: 'Le pack a changé entre-temps : rechargez.' }, { status: 409 })
  return NextResponse.json({ ok: true, pack: passe[0] })
}
