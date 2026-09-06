import React from 'react'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { authArtisan as verifierSession, estEchec } from '@/lib/authArtisan'
import { ZipFlux } from '@/lib/zip'
import { DevisPDF } from '@/lib/DevisPDF'
import { buildPdfData } from '@/lib/devisPdfData'
import { renderPdfToBuffer } from '@/lib/renderPdf'

// Export de TOUTES ses données (RGPD, droit à la portabilité — §C3, sprint J-1 §6).
//
// Une archive ZIP servie en flux : les tables de l'artisan en JSON (une par fichier) et les
// PDF de ses devis et factures, régénérés depuis la base avec le même moteur que
// /api/devis/[id]/pdf. `?format=json` conserve l'ancien export d'un seul bloc (les
// intégrations et le test historique en dépendent).
export const runtime = 'nodejs'
export const maxDuration = 60

type Ligne = Record<string, unknown>
const nomFichier = (numero: unknown, id: unknown) => String(numero || id || 'sans-numero').replace(/[^\w.-]+/g, '_')

async function collecter(uid: string) {
  const [artisan, leads, devis, factures, clients, tarifs, inventaire, appareils] = await Promise.all([
    supabaseAdmin.from('artisans').select('*').eq('id', uid).maybeSingle(),
    // Sans `ip` : donnée d'un tiers, finalité anti-abus, elle n'a rien à faire dans l'export de l'artisan (C7).
    supabaseAdmin.from('leads').select('*').eq('artisan_id', uid).order('created_at', { ascending: true }).then((r) => ({ ...r, data: (r.data ?? []).map(({ ip: _ip, ...l }: Record<string, unknown>) => l) })),
    supabaseAdmin.from('devis').select('*').eq('artisan_id', uid).order('created_at', { ascending: true }),
    supabaseAdmin.from('factures').select('*').eq('artisan_id', uid).order('created_at', { ascending: true }).then((r) => r, () => ({ data: [] })),
    supabaseAdmin.from('clients_plateforme').select('*').eq('artisan_id', uid).then((r) => r, () => ({ data: [] })),
    supabaseAdmin.from('prix_artisan').select('*').eq('artisan_id', uid).then((r) => r, () => ({ data: [] })),
    supabaseAdmin.from('inventaire').select('*').eq('artisan_id', uid).then((r) => r, () => ({ data: [] })),
    // v9 J2 — appareils abonnés aux notifications : libellé, dates, état (pas les clés de chiffrement ni l'adresse du service).
    supabaseAdmin.from('push_abonnements').select('type, appareil, actif, cree_le, dernier_succes').eq('artisan_id', uid).then((r) => r, () => ({ data: [] })),
  ])
  // Messages de toutes ses conversations (par lots, pour ne pas charger l'univers).
  const ids = (leads.data ?? []).map((l) => l.id)
  let messages: Ligne[] = []
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await supabaseAdmin.from('messages').select('*').in('lead_id', ids.slice(i, i + 100)).order('sent_at', { ascending: true })
    messages = messages.concat((data ?? []) as Ligne[])
  }
  const l = (r: unknown) => ((r as { data?: Ligne[] }).data ?? []) as Ligne[]
  return {
    profil: (artisan.data ?? null) as Ligne | null,
    conversations: l(leads), messages, devis: l(devis), factures: l(factures),
    clients_plateforme: l(clients), tarifs: l(tarifs), inventaire: l(inventaire), appareils_notifications: l(appareils),
  }
}

export async function GET(req: Request) {
  const session = await verifierSession(req)
  if (estEchec(session)) return NextResponse.json({ error: session.error }, { status: session.status })
  const uid = session.uid
  const jour = new Date().toISOString().slice(0, 10)

  let d: Awaited<ReturnType<typeof collecter>>
  try { d = await collecter(uid) } catch (e) {
    console.error('[donnees/export]', e)
    return NextResponse.json({ error: 'Export impossible pour le moment.' }, { status: 500 })
  }

  if (new URL(req.url).searchParams.get('format') === 'json') {
    const paquet = { genere_le: new Date().toISOString(), a_propos: 'Export complet de vos données Presti (format JSON). Les documents à valeur légale sont inclus.', ...d }
    return new NextResponse(JSON.stringify(paquet, null, 2), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="mes-donnees-presti-${jour}.json"` },
    })
  }

  const zip = new ZipFlux()
  // Le contenu se génère APRÈS le retour de la réponse : le flux part tout de suite.
  ;(async () => {
    try {
      const nbDocs = d.devis.length + d.factures.length
      zip.ajouter('LISEZ-MOI.txt',
        `Export de vos données Presti — ${jour}\n\n` +
        `donnees/ : vos tables au format JSON (profil, conversations, messages, devis, factures, clients, tarifs, inventaire).\n` +
        `devis/ et factures/ : vos documents en PDF, régénérés depuis la base (${nbDocs} document${nbDocs > 1 ? 's' : ''}).\n\n` +
        `Les devis envoyés et factures émises font partie de vos obligations de conservation (10 ans pour les pièces comptables).\n`)
      for (const [nom, valeur] of Object.entries(d)) zip.ajouter(`donnees/${nom}.json`, JSON.stringify(valeur, null, 2))

      const artisan = d.profil ?? {}
      for (const [type, docs, table, cle] of [['devis', d.devis, 'devis_lignes', 'devis_id'], ['facture', d.factures, 'factures_lignes', 'facture_id']] as const) {
        for (const doc of docs) {
          try {
            const { data: lignes } = await supabaseAdmin.from(table).select('*').eq(cle, doc.id as string).order('ordre')
            const pdf = await renderPdfToBuffer(React.createElement(DevisPDF, {
              d: buildPdfData(doc as Parameters<typeof buildPdfData>[0], (lignes ?? []) as Parameters<typeof buildPdfData>[1], artisan as Parameters<typeof buildPdfData>[2], type),
            }))
            zip.ajouter(`${type === 'devis' ? 'devis' : 'factures'}/${nomFichier(doc.numero, doc.id)}.pdf`, new Uint8Array(pdf))
          } catch (e) {
            // Un PDF qui échoue ne prive pas l'artisan du reste : on le dit dans l'archive.
            zip.ajouter(`${type === 'devis' ? 'devis' : 'factures'}/${nomFichier(doc.numero, doc.id)}.ERREUR.txt`, `PDF non généré : ${e instanceof Error ? e.message : 'erreur'}. Les données de ce document sont dans donnees/${type === 'devis' ? 'devis' : 'factures'}.json.`)
          }
        }
      }
      zip.terminer()
    } catch (e) {
      console.error('[donnees/export] zip:', e)
      zip.echouer(e)
    }
  })()

  return new Response(zip.flux, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="mes-donnees-presti-${jour}.zip"`,
      'Cache-Control': 'no-store',
    },
  })
}
