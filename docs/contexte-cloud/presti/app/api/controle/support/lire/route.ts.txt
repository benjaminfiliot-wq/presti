import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { actif } from '@/lib/flags'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// GET /api/controle/support/lire?acces=<uuid>&vue=<forme|chiffres|photos|envoi>
//
// LA SEULE ROUTE DU POSTE DE CONTRÔLE QUI TOUCHE UNE DONNÉE DE CLIENT D'ARTISAN.
//
// Il n'y a pas de POST, pas de PATCH, pas de DELETE ici. Pas « ils refusent » : ils n'existent pas.
// C'est la façon la plus solide de tenir « lecture seule » — on ne peut pas oublier d'interdire un
// verbe qu'on n'a pas écrit.
//
// Cette route ne décide rien. Elle transmet à `lire_sous_support`, qui vérifie la porte ET écrit les
// deux traces DANS LA MÊME TRANSACTION que la donnée qu'elle rend. Une route future qui
// « oublierait » de journaliser n'aurait rien à lire : c'est le même appel.
//
// Ce qui sort : la FORME. Un statut, une longueur, un état d'envoi, des nombres. Jamais un mot de
// conversation, jamais une désignation, jamais une adresse, jamais une photo, jamais une coordonnée
// de client. L'artisan peut consentir pour lui ; il ne peut pas consentir pour son client.

export async function GET(req: Request) {
  if (!actif('supportArtisan')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })
  // Le périmètre AVANT le rôle : un partenaire doit s'entendre dire que le support n'est pas dans son
  // périmètre, et non « votre rôle est en lecture seule » — qui laisserait croire qu'un rôle
  // supérieur lui ouvrirait la porte. Il n'y a pas de rôle qui la lui ouvre.
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const perimetre = exigerDomaine(f, 'support', 'voir')
  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)
  if (f.role !== 'direction') return reponseRefus({ error: 'Votre rôle est en lecture seule.', status: 403, code: 'lecture_seule' })

  const url = new URL(req.url)
  const acces = url.searchParams.get('acces') ?? ''
  const vue = url.searchParams.get('vue') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(acces)) return NextResponse.json({ error: 'Accès inconnu.' }, { status: 400 })
  if (!['forme', 'chiffres', 'photos', 'envoi'].includes(vue)) return NextResponse.json({ error: 'Vue inconnue.' }, { status: 400 })

  const { data: moi } = await supabaseAdmin.from('artisans').select('nom').eq('id', f.uid).maybeSingle()

  const { data, error } = await supabaseAdmin.rpc('lire_sous_support', {
    p_acteur: f.uid, p_acteur_email: f.email, p_acteur_nom: moi?.nom ?? f.email,
    p_acces: acces, p_vue: vue, p_ip: f.ip, p_agent: 'poste de contrôle',
  })
  if (error) { console.error('[support] lire :', error.message); return NextResponse.json({ error: 'Lecture impossible.' }, { status: 503 }) }

  const r = data as { etat?: string; donnees?: unknown; titre?: string; expire_le?: string }
  // Chaque refus dit la vérité sur l'état de la porte : « pas encore ouverte » et « expirée » ne se
  // corrigent pas de la même façon, et confondre les deux fait perdre du temps aux deux côtés.
  const REFUS: Record<string, string> = {
    inconnu: 'Cet accès n’existe pas.',
    refuse: 'L’artisan a refusé cette demande.',
    pas_ouvert: 'L’artisan n’a pas encore ouvert cet accès.',
    ferme: 'Cet accès a été fermé.',
    expire: 'Cet accès a expiré. Une heure de plus est une nouvelle demande, et un nouvel email.',
    ticket_ferme: 'Le ticket est clos : la fenêtre s’est fermée avec lui.',
    vue_inconnue: 'Cette vue ne s’applique pas à cet élément.',
    element_introuvable: 'L’élément n’existe plus.',
  }
  if (r?.etat !== 'ok') return NextResponse.json({ error: REFUS[r?.etat ?? ''] ?? 'Lecture refusée.', etat: r?.etat }, { status: 403 })

  return NextResponse.json({
    vue, titre: r.titre, expire_le: r.expire_le, donnees: r.donnees,
    // Rappelé à chaque réponse, pour que ça reste vrai dans la tête de celui qui lit : ce qu'il voit
    // est volontairement incomplet, et le reste ne s'obtient pas en insistant.
    portee: 'Forme seulement. Le contenu des échanges, les coordonnées des clients et les photos ne passent jamais par cette porte.',
    a: new Date().toISOString(),
  })
}
