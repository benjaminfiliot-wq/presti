// app/api/demandes/import/route.ts — l'IMPORT des prospects d'un formulaire publicitaire (TikTok, Facebook / Instagram Lead Ads,
// LinkedIn Lead Gen) depuis le CSV exporté du réseau (21/10/2026, drapeau importProspects ; offre Studio, plateforme.conversation).
//
// POST { reseau, csv, confirmer } : sans `confirmer`, l'APERÇU (colonnes reconnues, chaque ligne avec son état) — rien n'est écrit ;
// avec `confirmer: true`, le même fichier est RELU ici (jamais la liste du navigateur) et les lignes « à importer » deviennent des
// demandes : canal 'import', statut 'nouveau', origine = le réseau. AUCUN envoi : ni IA, ni e-mail au prospect, ni notification qui
// le cite, ni relance (lib/relances.ts), ni pilote (lib/canaux/regles.ts). L'uid vient de la session ; chaque écriture porte
// artisan_id = uid. Drapeau baissé : 404. Sans la colonne leads.origine (migration 0177) : 503, rien d'écrit.
import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { exigerCapacite } from '@/lib/accesOffreServeur'
import { consommerLimite } from '@/lib/limites'
import { typeChantier } from '@/lib/qualification'
import { villeDe } from '@/lib/ville'
import { analyserImport, cleContact, estReseauImport, MAX_OCTETS_IMPORT } from '@/lib/canaux/importProspects'
import { lireOrigine } from '@/lib/canaux/reseaux'
import { CANAL_IMPORT } from '@/lib/canaux/regles'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Les clés de contact (e-mail, téléphone normalisé) de TOUTES les demandes de l'espace (audit du 21/10 : au-delà de 5 000, des doublons
 * passaient), lues par pages de 1 000, jusqu'à 100 000. Erreur de lecture : null → l'import refuse (on ne promet pas « doublons
 * écartés » sans les avoir vus).
 */
async function contactsExistants(uid: string): Promise<Set<string> | null> {
  const s = new Set<string>()
  for (let debut = 0; debut < 100_000; debut += 1000) {
    const { data, error } = await supabaseAdmin.from('leads').select('contact').eq('artisan_id', uid).not('contact', 'is', null)
      .order('id', { ascending: true }).range(debut, debut + 999)
    if (error) return null
    for (const l of (data ?? []) as { contact: string | null }[]) { const c = cleContact(l.contact); if (c) s.add(c) }
    if ((data ?? []).length < 1000) break
  }
  return s
}

export async function POST(req: Request) {
  try {
    if (!actif('importProspects')) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })
    const g = await exigerCapacite(req, 'plateforme.conversation', 'L’import des prospects de vos publicités')
    if ('reponse' in g) return g.reponse
    const declare = Number(req.headers.get('content-length'))
    if (Number.isFinite(declare) && declare > MAX_OCTETS_IMPORT * 2 + 4096) return NextResponse.json({ error: 'Fichier trop lourd (1 Mo au plus).' }, { status: 413 })
    const b = await req.json().catch(() => null)
    const reseau = b?.reseau
    if (!estReseauImport(reseau)) return NextResponse.json({ error: 'Réseau inconnu.' }, { status: 400 })
    if (typeof b?.csv !== 'string') return NextResponse.json({ error: 'Fichier manquant.' }, { status: 400 })
    const confirmer = b?.confirmer === true
    // Plafonds horaires (audit du 21/10) : 3 imports écrits (3 000 prospects au plus) et 20 aperçus par heure et par compte.
    if (!(await consommerLimite(`import:${confirmer ? 'ecrire' : 'apercu'}:${g.uid}`, confirmer ? 3 : 20, 3600))) {
      return NextResponse.json({ error: 'Trop d’imports en une heure : réessayez plus tard.' }, { status: 429 })
    }

    const existants = await contactsExistants(g.uid)
    if (!existants) return NextResponse.json({ error: 'Vos demandes n’ont pas pu être relues pour écarter les doublons : réessayez dans un instant.' }, { status: 503 })
    const a = analyserImport(b.csv, reseau, existants)
    if (a.erreur) return NextResponse.json({ error: a.erreur, colonnes: a.colonnes }, { status: 400 })
    if (!confirmer) return NextResponse.json({ ok: true, apercu: true, colonnes: a.colonnes, prospects: a.prospects, a_importer: a.a_importer }, { headers: { 'Cache-Control': 'no-store' } })

    const { data: art } = await supabaseAdmin.from('artisans').select('metier').eq('id', g.uid).maybeSingle()
    const metier = (art?.metier as string | null | undefined) ?? null
    const origine = lireOrigine(reseau) // 'autre' n'est pas une origine : null
    const aImporter = a.prospects.filter((p) => p.etat === 'a_importer')
    let importes = 0
    for (let i = 0; i < aImporter.length; i += 100) {
      const lot = aImporter.slice(i, i + 100).map((p) => ({
        artisan_id: g.uid, canal: CANAL_IMPORT, origine, statut: 'nouveau', urgence: 'normal',
        nom_prospect: p.nom ?? (p.email ? p.email.split('@')[0] : 'Prospect'), contact: p.email ?? p.telephone, message: p.message,
        type_chantier: typeChantier(p.message, metier), ville: villeDe(p.message),
      }))
      const { data, error } = await supabaseAdmin.from('leads').insert(lot).select('id, message')
      if (error) {
        console.error('[demandes/import] écriture en échec :', /origine/i.test(error.message) ? 'colonne origine absente (0177 ?)' : 'erreur base')
        return NextResponse.json({ error: importes ? `Import interrompu après ${importes} prospect(s) : réessayez, les doublons seront écartés.` : 'L’import n’est pas encore disponible sur votre espace.' }, { status: 503 })
      }
      // Le premier message du fil : les réponses au formulaire (sens 'in' : c'est ce que la personne a écrit dans le formulaire).
      // Échec (audit du 21/10) : les demandes de CE lot sont retirées — pas de demande sans son fil — et l'import s'arrête là.
      const lignes = (data ?? []) as { id: string; message: string }[]
      const { error: eMsg } = await supabaseAdmin.from('messages').insert(lignes.map((l) => ({ lead_id: l.id, sens: 'in', type: CANAL_IMPORT, contenu: l.message })))
      if (eMsg) {
        await supabaseAdmin.from('leads').delete().in('id', lignes.map((l) => l.id)).eq('artisan_id', g.uid).eq('canal', CANAL_IMPORT)
        console.error('[demandes/import] premier message en échec : lot retiré')
        return NextResponse.json({ error: importes ? `Import interrompu après ${importes} prospect(s) : réessayez, les doublons seront écartés.` : 'L’import n’a pas pu être enregistré : réessayez dans un instant.' }, { status: 503 })
      }
      importes += lignes.length
    }
    return NextResponse.json({ ok: true, importes, ecartes: a.prospects.length - importes, message: `${importes} prospect${importes > 1 ? 's' : ''} ajouté${importes > 1 ? 's' : ''} à vos demandes, « à contacter ». Aucun message ne leur a été envoyé.` })
  } catch {
    console.error('[demandes/import] POST en échec')
    return NextResponse.json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}
