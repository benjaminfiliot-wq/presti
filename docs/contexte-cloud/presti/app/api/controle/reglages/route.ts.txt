import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'
import { exigerReconfirmation } from '@/lib/direction/reconfirmation'
import { journaliser, refusJournal } from '@/lib/direction/journal'
import { FLAGS } from '@/lib/flags'
import { boiteEntrepriseResolue } from '@/lib/canaux'
import { EMAIL_ENTREPRISE } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Les réglages de l'entreprise (prompt v11 §3, J6).
//
//   GET  → valeurs modifiables, comptes connectés, rôles, drapeaux (en LECTURE).
//   POST → changer une valeur, changer un rôle.
//
// Trois décisions qui gouvernent ce fichier :
//
//   • les DRAPEAUX (`lib/flags.ts`) sont en lecture seule ici, et c'est délibéré. Un drapeau ouvre une
//     fonctionnalité qui suppose une migration collée et du code déployé ; le lever depuis un écran
//     ferait apparaître un espace vide ou des 503, sans que rien ne prévienne. Ils se lèvent par un
//     commit, où le changement est relu et versionné. L'écran les montre pour qu'on sache où on en est ;
//   • les VALEURS chiffrées (seuils de TVA, taux URSSAF, budget IA, plafonds) sont modifiables : elles
//     changent par décret ou par décision, et ni l'un ni l'autre ne devrait demander un déploiement ;
//   • un SECRET ne s'affiche jamais. Les comptes connectés disent s'ils répondent, pas ce qu'ils
//     contiennent — une clé lisible depuis un écran est une clé qui finit par fuiter.
type Reglage = { cle: string; valeur: unknown; description: string | null; maj_le: string }

/** Ce qui est modifiable depuis l'écran, avec ses bornes. Hors de cette liste : refusé. */
const MODIFIABLES: Record<string, { libelle: string; type: 'nombre' | 'texte'; min?: number; max?: number; options?: string[]; unite?: string }> = {
  tva_seuil_franchise_cents: { libelle: 'Seuil de franchise en base de TVA', type: 'nombre', min: 0, max: 100_000_00, unite: 'centimes' },
  tva_seuil_majore_cents: { libelle: 'Seuil majoré de TVA', type: 'nombre', min: 0, max: 100_000_00, unite: 'centimes' },
  tva_alerte_pourcent: { libelle: 'Alerter à ce pourcentage du seuil', type: 'nombre', min: 10, max: 100, unite: '%' },
  urssaf_taux_pourcent: { libelle: 'Taux de cotisations URSSAF', type: 'nombre', min: 0, max: 60, unite: '%' },
  urssaf_periodicite: { libelle: 'Périodicité URSSAF', type: 'texte', options: ['mensuel', 'trimestriel'] },
}

export async function GET(req: Request) {
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const perimetre = exigerDomaine(f, 'reglages', 'voir')
  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)

  const [{ data: reglages }, { data: roles }, { data: fondateurs }] = await Promise.all([
    supabaseAdmin.from('reglages_globaux').select('cle, valeur, description, maj_le').order('cle'),
    supabaseAdmin.from('direction_roles').select('user_id, role'),
    supabaseAdmin.from('artisans').select('id, nom, email, role_interne, is_founder').or('is_founder.eq.true,role_interne.not.is.null'),
  ])

  // Les comptes connectés : on dit si la CONFIGURATION existe, jamais ce qu'elle contient.
  const connectes = [
    { cle: 'stripe', nom: 'Stripe', configure: !!process.env.STRIPE_SECRET_KEY, detail: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live') ? 'clé réelle' : process.env.STRIPE_SECRET_KEY ? 'clé de test' : null },
    { cle: 'supabase', nom: 'Supabase', configure: !!process.env.SUPABASE_SERVICE_ROLE_KEY, detail: null },
    { cle: 'anthropic', nom: 'Anthropic (produit)', configure: !!process.env.ANTHROPIC_API_KEY, detail: process.env.ANTHROPIC_WORKSPACE_PRESTI ? 'espace de travail dédié' : 'espace par défaut' },
    { cle: 'anthropic_admin', nom: 'Anthropic (administration)', configure: !!process.env.ANTHROPIC_ADMIN_KEY, detail: 'lecture des coûts' },
    { cle: 'resend', nom: 'Resend', configure: !!process.env.RESEND_API_KEY, detail: null },
    // Branchée ne suffit pas : encore faut-il que ce soit la boîte où NOTRE courrier arrive. Si
    // l'adresse à laquelle Presti s'écrit n'est pas celle qu'on relève, la boîte relevée ne contient
    // aucune de nos notifications — et une boîte vide ressemble à une boîte calme.
    { cle: 'imap', nom: 'Boîte de l’entreprise', configure: !!boiteEntrepriseResolue(), detail: (() => {
      const b = boiteEntrepriseResolue()
      if (!b) return null
      const alignee = b.user.toLowerCase() === EMAIL_ENTREPRISE.toLowerCase()
      return `${b.hote}${b.devine ? ' (déduit de l’adresse)' : ''} · ${alignee ? 'c’est bien l’adresse où Presti s’écrit' : `⚠️ Presti écrit à ${EMAIL_ENTREPRISE}, on relève ${b.user} — nos propres messages n’arrivent pas ici`}`
    })() },
    { cle: 'vercel', nom: 'Vercel', configure: !!process.env.VERCEL_TOKEN, detail: 'déploiements' },
    { cle: 'firebase', nom: 'Firebase', configure: !!process.env.FIREBASE_SERVICE_ACCOUNT, detail: 'notifications natives' },
    { cle: 'vapid', nom: 'Notifications web', configure: !!process.env.VAPID_PRIVATE_KEY, detail: null },
  ]

  const parRole = new Map((roles ?? []).map((r) => [r.user_id, r.role]))
  return NextResponse.json({
    reglages: (reglages ?? []).map((r: Reglage) => ({ ...r, modifiable: !!MODIFIABLES[r.cle], ...(MODIFIABLES[r.cle] ?? {}) })),
    connectes,
    equipe: (fondateurs ?? []).map((a) => ({
      id: a.id, nom: a.nom, email: a.email,
      roleInterne: a.role_interne ?? (a.is_founder ? 'fondateur' : null),
      roleCentre: parRole.get(a.id) ?? (a.is_founder ? 'direction' : null),
    })),
    // Les drapeaux, en lecture : ils disent où on en est, ils ne se lèvent pas d'ici.
    drapeaux: Object.entries(FLAGS).map(([cle, actif]) => ({ cle, actif })),
    drapeauxLecture: 'Un drapeau se lève par un commit : il suppose une migration collée et du code déployé, et l’écran ne peut pas le savoir.',
    role: f.role,
    a: new Date().toISOString(),
  })
}

export async function POST(req: Request) {
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const perimetre = exigerDomaine(f, 'reglages', 'ecrire')
  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)

  const b = (await req.json().catch(() => null)) as { action?: unknown; cle?: unknown; valeur?: unknown; id?: unknown; role?: unknown } | null
  const action = typeof b?.action === 'string' ? b.action : ''

  if (action === 'reglage') {
    const cle = typeof b?.cle === 'string' ? b.cle : ''
    const regle = MODIFIABLES[cle]
    if (!regle) return NextResponse.json({ error: 'Ce réglage n’est pas modifiable depuis cet écran.' }, { status: 400 })

    let valeur: unknown
    if (regle.type === 'nombre') {
      const n = Number(String(b?.valeur ?? '').replace(',', '.'))
      if (!Number.isFinite(n)) return NextResponse.json({ error: 'Valeur illisible.' }, { status: 400 })
      if (regle.min !== undefined && n < regle.min) return NextResponse.json({ error: `Minimum : ${regle.min}.` }, { status: 400 })
      if (regle.max !== undefined && n > regle.max) return NextResponse.json({ error: `Maximum : ${regle.max}.` }, { status: 400 })
      valeur = n
    } else {
      const t = String(b?.valeur ?? '').trim()
      if (regle.options && !regle.options.includes(t)) return NextResponse.json({ error: `Valeurs possibles : ${regle.options.join(', ')}.` }, { status: 400 })
      valeur = t
    }

    // Un seuil ou un taux change des chiffres qui serviront à une déclaration : on re-confirme.
    const refus = await exigerReconfirmation(req, f.uid, 'reglages')
    if (refus) return refus

    const { data: avant } = await supabaseAdmin.from('reglages_globaux').select('valeur').eq('cle', cle).maybeSingle()
    const { error } = await supabaseAdmin.from('reglages_globaux')
      .upsert({ cle, valeur, maj_le: new Date().toISOString(), maj_par: f.uid }, { onConflict: 'cle' })
    if (error) { console.error('[reglages]', error.message); return NextResponse.json({ error: 'Rien n’a été fait.', code: 'transaction' }, { status: 503 }) }
    if (!(await journaliser({ acteur: f, action: 'reglage_modifie', cible_type: 'reglage', cible_id: cle, avant: { valeur: avant?.valeur }, apres: { valeur }, reconfirme: true }, req))) return refusJournal()
    return NextResponse.json({ ok: true, message: `${regle.libelle} : ${valeur}${regle.unite ? ' ' + regle.unite : ''}.` })
  }

  if (action === 'role') {
    const id = typeof b?.id === 'string' ? b.id : ''
    const role = typeof b?.role === 'string' ? b.role : ''
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Personne inconnue.' }, { status: 404 })
    if (!['fondateur', 'partenaire'].includes(role)) return NextResponse.json({ error: 'Rôle attendu : fondateur ou partenaire.' }, { status: 400 })
    // On ne se retire pas soi-même : un Poste de contrôle sans personne pour l'ouvrir est irrécupérable.
    if (id === f.uid && role !== 'fondateur') return NextResponse.json({ error: 'Vous ne pouvez pas retirer votre propre rôle de fondateur.' }, { status: 400 })

    const refus = await exigerReconfirmation(req, f.uid, 'reglages')
    if (refus) return refus

    const { data: avant } = await supabaseAdmin.from('artisans').select('nom, role_interne').eq('id', id).maybeSingle()
    if (!avant) return NextResponse.json({ error: 'Personne inconnue.' }, { status: 404 })
    const { error } = await supabaseAdmin.from('artisans').update({ role_interne: role }).eq('id', id)
    if (error) return NextResponse.json({ error: 'Rien n’a été fait.', code: 'transaction' }, { status: 503 })
    // Le rôle du Centre suit le rôle d'entreprise : deux sources pour une même vérité divergent
    // toujours, et c'est ce qui avait donné à Alexandre l'écriture partout (revue du 07/09).
    await supabaseAdmin.from('direction_roles').upsert({ user_id: id, role: role === 'partenaire' ? 'lecture' : 'direction' }, { onConflict: 'user_id' })
    if (!(await journaliser({ acteur: f, action: 'role_modifie', cible_type: 'artisan', cible_id: id, artisan_id: id, avant: { role: avant.role_interne }, apres: { role }, reconfirme: true }, req))) return refusJournal()
    return NextResponse.json({ ok: true, message: `${avant.nom ?? 'Cette personne'} est désormais ${role}.` })
  }

  return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
}
