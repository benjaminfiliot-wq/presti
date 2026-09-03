import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { chiffrementDisponible, chiffrer } from '@/lib/secretBox'
import { devineFournisseur, testerImap } from '@/lib/canaux'

// Canaux de l'artisan (v4 §B2) — voie IMAP/SMTP, universelle (OVH, Gmail, Orange…),
// sans dépendre d'une application OAuth tierce.
// Règles tenues :
//  • le mot de passe est CHIFFRÉ (AES-256-GCM) avant d'entrer en base, jamais en clair ;
//  • l'API ne renvoie JAMAIS le secret, même masqué côté serveur ;
//  • on TESTE la connexion avant d'enregistrer : pas de canal fantôme qui échoue en silence.

export const runtime = 'nodejs'
export const maxDuration = 30

async function auth(req: Request) {
  const token = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return { error: 'Non authentifié', status: 401 as const }
  const { data, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !data?.user) return { error: 'Session expirée, reconnecte-toi.', status: 401 as const }
  return { uid: data.user.id }
}

// ── GET : la liste des canaux. Le secret n'est JAMAIS renvoyé.
export async function GET(req: Request) {
  const a = await auth(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const { data } = await supabaseAdmin.from('canaux')
    .select('id, type, libelle, adresse, imap_hote, imap_port, smtp_hote, smtp_port, actif, derniere_releve, derniere_erreur, cree_le')
    .eq('artisan_id', a.uid).order('cree_le', { ascending: true })
  return NextResponse.json({ ok: true, canaux: data ?? [], chiffrement: chiffrementDisponible() })
}

// ── POST : brancher (ou re-tester) un canal email.
export async function POST(req: Request) {
  try {
    const a = await auth(req)
    if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
    if (!chiffrementDisponible()) {
      // On refuse plutôt que de stocker un mot de passe en clair.
      return NextResponse.json({ error: 'Stockage sécurisé indisponible côté serveur. Canal non enregistré.' }, { status: 503 })
    }
    const b = await req.json().catch(() => null)
    const adresse = String(b?.adresse || '').trim().toLowerCase()
    const motDePasse = String(b?.mot_de_passe || '')
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(adresse) || !motDePasse) {
      return NextResponse.json({ error: 'Adresse email et mot de passe requis.' }, { status: 400 })
    }
    const auto = devineFournisseur(adresse)
    const imap_hote = String(b?.imap_hote || auto?.imap_hote || '').trim()
    const smtp_hote = String(b?.smtp_hote || auto?.smtp_hote || '').trim()
    const imap_port = Number(b?.imap_port) || 993
    const smtp_port = Number(b?.smtp_port) || 465
    if (!imap_hote) return NextResponse.json({ error: 'Serveur IMAP inconnu pour cette adresse — indiquez-le à la main.' }, { status: 400 })

    // On teste AVANT d'enregistrer : jamais de canal qui échoue en silence.
    const test = await testerImap(imap_hote, imap_port, adresse, motDePasse)
    if (!test.ok) return NextResponse.json({ error: test.erreur }, { status: 400 })

    const ligne = {
      artisan_id: a.uid, type: 'email', libelle: String(b?.libelle || auto?.fournisseur || 'Ma boîte email').slice(0, 80),
      adresse, imap_hote, imap_port, smtp_hote: smtp_hote || null, smtp_port,
      identifiant: adresse, secret: chiffrer(motDePasse), actif: true, derniere_erreur: null,
    }
    const { data: existant } = await supabaseAdmin.from('canaux').select('id').eq('artisan_id', a.uid).eq('adresse', adresse).maybeSingle()
    if (existant) await supabaseAdmin.from('canaux').update(ligne).eq('id', existant.id)
    else await supabaseAdmin.from('canaux').insert(ligne)

    return NextResponse.json({ ok: true, message: 'Boîte connectée — la connexion a été vérifiée.' })
  } catch (e) {
    console.error('[canaux] POST:', e)
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}

// ── DELETE : déconnecter un canal (l'historique des messages reste).
export async function DELETE(req: Request) {
  const a = await auth(req)
  if ('error' in a) return NextResponse.json({ error: a.error }, { status: a.status })
  const id = new URL(req.url).searchParams.get('id') || ''
  if (!id) return NextResponse.json({ error: 'Canal manquant' }, { status: 400 })
  await supabaseAdmin.from('canaux').delete().eq('id', id).eq('artisan_id', a.uid)
  return NextResponse.json({ ok: true, message: 'Canal déconnecté. Vos messages restent dans votre boîte de réception.' })
}

