// app/api/usine/pubs/travail/route.ts — GET : le prochain travail de fabrication des pubs pour le tourneur de l'usine (fiche 026-200).
//
// L'identité est `studio` (décision du 27/09, 026-175) : un seul jeton, un seul tourneur pour les packs locaux (A6) et les échantillons (A9). Tout autre
// jeton, `livreur_usine` compris, est refusé (403). Dans cet ordre : le drapeau `busAgents` baissé → 404 AVANT toute identité ; la garde des agents ;
// le battement de `studio` ; la pause générale (ou la pause de l'agent, 423 de la garde) → { travail: null }.
//
// Puis, dans cet ordre, UN travail ou rien :
//   1. le plus ancien pack `payee` (paye_le) qui n'est pas sous bail et n'a pas échoué trois fois : le bail de 90 min est posé par une mise à jour
//      CONDITIONNELLE (id et etat = payee) dans `verifications` ; le pack garde l'état `payee` jusqu'au rendu. Le pack est celui de exporter.mjs
//      ({ pack_id, matiere, site }) : ni courriel du client, ni téléphone ; les photos sont signées (lecture, 600 s) et SEULES celles du dossier de
//      l'artisan, dans le bucket des photos, le sont ;
//   2. sinon la plus ancienne décision `studio_echantillon` accordée (acq_studio_a_fabriquer), pour une marque sans opposition ni refus, et son bail
//      (acq_studio_bail_poser) : { type: 'studio', decision, marque_cle, page_produit, accord, echantillons_refuses } et rien d'autre.
// Aucune de ces deux fonctions SQL n'existe encore dans une migration (026-200 ne touche pas supabase/**) : absentes, le Studio n'a aucun travail à
// rendre et le reste continue.
import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authAgent, estRefusAgent, reponseRefusAgent } from '@/lib/agents/garde'
import { ops_battement } from '@/lib/agents/bus'
import { pauseGenerale } from '@/lib/agents/pause'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { AGENT, BAIL_S, BUCKET_PHOTOS, SIGNATURE_LECTURE_S, avecBail, estCleMarque, estObjet, estUuid, extraitAccord, nomDePhoto, objetPhoto, reprenable } from '@/lib/pubs/usinePubs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const entetes = { 'cache-control': 'no-store' }
const repondre = (corps: object, status = 200) => NextResponse.json(corps, { status, headers: entetes })
const rien = () => repondre({ travail: null })

type Objet = Record<string, unknown>

/** Les photos du pack : { nom, url } signées pour la lecture, seulement celles du dossier de l'artisan ; null si une signature manque. */
async function photosSignees(artisanId: string, matiere: Objet): Promise<{ nom: string; url: string }[] | null> {
  const photos = Array.isArray(matiere.photos) ? matiere.photos : []
  const objets: string[] = []
  for (const p of photos) {
    const objet = estObjet(p) ? objetPhoto(p.url, artisanId) : null
    if (objet) objets.push(objet)
  }
  if (!objets.length) return []
  const { data, error } = await supabaseAdmin.storage.from(BUCKET_PHOTOS).createSignedUrls(objets, SIGNATURE_LECTURE_S)
  if (error || !Array.isArray(data) || data.length !== objets.length) return null
  const sortie: { nom: string; url: string }[] = []
  for (const [i, d] of data.entries()) {
    if (!d || typeof d.signedUrl !== 'string' || !d.signedUrl) return null
    sortie.push({ nom: nomDePhoto(objets[i]), url: d.signedUrl })
  }
  return sortie
}

async function packAPrendre(): Promise<Objet | null> {
  const { data, error } = await supabaseAdmin.from('packs_pubs').select('id, artisan_id, type, matiere, verifications').eq('etat', 'payee').eq('type', 'locale').order('paye_le', { ascending: true }).limit(20)
  if (error) throw new Error('packs_pubs')
  for (const l of (data ?? []) as Objet[]) {
    const maintenant = Date.now()
    if (!estUuid(l.id) || l.type !== 'locale' || typeof l.artisan_id !== 'string' || !estObjet(l.matiere) || !reprenable(l.verifications, maintenant)) continue
    const a = await supabaseAdmin.from('artisans').select('slug, domaine, domaine_verifie').eq('id', l.artisan_id).maybeSingle()
    const artisan = a.data as { slug?: unknown; domaine?: unknown; domaine_verifie?: unknown } | null
    if (a.error || !artisan || typeof artisan.slug !== 'string' || !artisan.slug) continue
    const photos = await photosSignees(l.artisan_id, l.matiere)
    if (!photos) continue
    const pris = await supabaseAdmin.from('packs_pubs').update({ verifications: avecBail(l.verifications, maintenant) }).eq('id', l.id).eq('etat', 'payee').select('id')
    if (pris.error || !pris.data?.length) continue
    // le même site que scripts/pack-pub/exporter.mjs
    const site = typeof artisan.domaine === 'string' && artisan.domaine && artisan.domaine_verifie
      ? `https://${artisan.domaine.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
      : `https://prestiapp.fr/p/${artisan.slug}`
    return { type: 'pack', id: l.id, pack: { pack_id: l.id, matiere: l.matiere, site }, photos }
  }
  return null
}

async function echantillonAPrendre(): Promise<Objet | null> {
  const r = await supabaseAdmin.rpc('acq_studio_a_fabriquer', { p_limite: 10 })
  if (r.error || !Array.isArray(r.data)) return null // fonction absente (pas encore migrée) ou illisible : pas de travail pour le Studio
  for (const m of r.data as Objet[]) {
    if (m.opposition === true || m.refus === true) continue
    const recu = typeof m.accord_recu_le === 'string' ? Date.parse(m.accord_recu_le) : Number.NaN
    if (!estUuid(m.decision_id) || !estCleMarque(m.marque_cle) || typeof m.page_produit !== 'string' || !/^https?:\/\//i.test(m.page_produit) || m.page_produit.length > 500
      || typeof m.accord_message_id !== 'string' || !m.accord_message_id || !Number.isFinite(recu)) continue
    const bail = await supabaseAdmin.rpc('acq_studio_bail_poser', { p_decision: m.decision_id, p_bail_s: BAIL_S })
    if (bail.error || bail.data !== true) continue
    return {
      type: 'studio',
      decision: m.decision_id,
      marque_cle: m.marque_cle,
      page_produit: m.page_produit,
      accord: { message_id: m.accord_message_id, recu_le: new Date(recu).toISOString(), extrait: extraitAccord(String(m.accord_texte ?? '')) },
      echantillons_refuses: Array.isArray(m.echantillons_refuses) ? m.echantillons_refuses.filter((n): n is number => Number.isInteger(n) && n > 0 && n < 100) : [],
    }
  }
  return null
}

export async function GET(req: Request) {
  if (!actif('busAgents')) return repondre({ error: 'introuvable', code: 'introuvable' }, 404)
  const agent = await authAgent(req)
  if (estRefusAgent(agent)) return agent.status === 423 ? rien() : reponseRefusAgent(agent)
  if (agent.nom !== AGENT) return repondre({ error: 'agent', code: 'agent' }, 403)
  try { await ops_battement({ p_nom: AGENT }) } catch { /* un battement manqué ne change pas le travail */ }
  if ((await pauseGenerale()).active) return rien()
  try {
    return repondre((await packAPrendre()) ?? (await echantillonAPrendre()) ?? { travail: null })
  } catch {
    return repondre({ error: 'indisponible', code: 'indisponible' }, 503)
  }
}
