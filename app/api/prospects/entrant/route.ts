import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { getIp, isBanned, recordAbuse } from '@/lib/security'
import { consommerLimiteStricte } from '@/lib/limites'
// Audit du 20/10 : plafond FAIL-CLOSED (consommerLimiteStricte) — cette route dépense de l'IA ou écrit à un tiers ; base muette = refus, pas « tout passe ».
import { normaliserDemandeEntrante } from '@/lib/agents/acquisition/entrant'
import { magasinSupabase } from '@/lib/agents/acquisition/magasinSupabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUCCES = {
  ok: true,
  // Sans délai (audit des promesses du 12/10, site, ligne 54) : la maquette est fabriquée et envoyée par la chaîne de l'usine
  // (recenseur, atelier, rédacteur, facteur), hors de cette application ; rien ici ne garantit ni ne mesure « 48 h ouvrées ».
  message: "Merci : votre demande est enregistrée. L'assistant IA de Presti vous écrira à cette adresse avec votre maquette, sans délai garanti.",
}

const MESSAGES: Record<string, string> = {
  metier_inconnu: 'Indiquez un métier valide.',
  commune_invalide: 'Indiquez une commune valide.',
  site_absent: 'Indiquez votre site ou votre compte Instagram.',
  site_invalide: 'Indiquez un site ou un compte Instagram valide.',
  email_invalide: 'Indiquez une adresse e-mail valide.',
}

export async function POST(req: Request) {
  if (!actif('prospectsEntrant')) return NextResponse.json({ error: 'Page introuvable.' }, { status: 404 })

  const ip = getIp(req)
  if (await isBanned(ip)) return NextResponse.json({ error: 'Accès refusé.' }, { status: 403 })

  let corps: Record<string, unknown>
  try {
    const texte = await req.text()
    if (Buffer.byteLength(texte, 'utf8') > 8192) throw new Error('corps trop grand')
    const valeur: unknown = JSON.parse(texte)
    if (!valeur || typeof valeur !== 'object' || Array.isArray(valeur)) throw new Error('corps invalide')
    corps = valeur as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Le formulaire est invalide.' }, { status: 400 })
  }

  if (typeof corps.societe === 'string' && corps.societe.trim()) {
    await recordAbuse(ip, 'honeypot /api/prospects/entrant')
    return NextResponse.json(SUCCES)
  }

  if (!(await consommerLimiteStricte(`prospects-entrant:${ip}`, 3, 3600)) ||
      !(await consommerLimiteStricte('prospects-entrant:tous', 50, 86400))) {
    return NextResponse.json({ error: 'Nous avons déjà reçu plusieurs demandes : réessayez demain.' }, { status: 429 })
  }

  if (typeof corps.entreprise !== 'string' || corps.entreprise.trim().length < 2 || corps.entreprise.trim().length > 120) {
    return NextResponse.json({ error: 'Indiquez un nom d’entreprise de 2 à 120 signes.' }, { status: 400 })
  }
  if (typeof corps.email !== 'string' || !corps.email.trim()) {
    return NextResponse.json({ error: "Indiquez l'adresse où recevoir votre maquette." }, { status: 400 })
  }
  if (corps.accord !== true) {
    return NextResponse.json({ error: 'Cochez la case pour demander votre maquette et être recontacté.' }, { status: 400 })
  }

  const resultat = normaliserDemandeEntrante({
    entreprise: corps.entreprise,
    metier: corps.metier as string,
    commune: corps.commune as string,
    site_ou_instagram: corps.site_ou_instagram as string,
    email: corps.email,
  })
  if (!resultat.ok) {
    return NextResponse.json({ error: resultat.erreurs.map((erreur) => MESSAGES[erreur] ?? 'Le formulaire est invalide.').join(' ') }, { status: 400 })
  }

  const candidat = {
    ...resultat.candidat,
    canaux: resultat.candidat.canaux.map((canal) => ({ ...canal, case_cochee_le: new Date().toISOString() })),
  }
  try {
    await magasinSupabase.enregistrerCandidats([candidat])
  } catch {
    return NextResponse.json({ error: "Votre demande n'a pas pu être enregistrée. Réessayez dans un moment." }, { status: 503 })
  }
  return NextResponse.json(SUCCES)
}
