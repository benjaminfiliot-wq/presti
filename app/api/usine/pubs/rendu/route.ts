// app/api/usine/pubs/rendu/route.ts — POST : le tourneur de l'usine rend son travail ; SEULE cette route change l'état d'un pack ou d'une décision (fiche 026-200).
//
// Mêmes gardes que `travail` (identité `studio` seule ; pause générale ou pause de l'agent → 423, rien ne change). Corps :
//   { travail, ok, fichiers: [{ chemin, sha256 }], juge: { nom, code, empreinte_journal }, raison? }.
//
// `ok: true` : la route ne croit rien de ce qu'on lui annonce. Elle exige le bon juge (pub-locale-qa pour un pack, pub-qa pour un échantillon) au code 0
// avec l'empreinte de son journal, les fichiers EXACTS du travail (les six d'un pack, l'unique MP4 d'un échantillon), puis RELIT chaque fichier dans le
// stockage : présent, de la taille permise, au SHA-256 annoncé, aux octets magiques de son type. C'est seulement alors que l'état change :
//   - pack : `payee` → `fabriquee` (écriture conditionnelle id et etat = payee), fabrique_le, verifications { juge, verdict, … } comme deposer.mjs ; le bail tombe
//     avec l'ancienne valeur de `verifications` ;
//   - échantillon : la décision `studio_echantillon` est tranchée en `depose` (le même effet que deposer-echantillon.mjs), SAUF pour le premier du Studio :
//     une décision « regarder le premier échantillon » (options envoyer et refaire, aperçu par un lien signé de 10 min) est ouverte pour Benj, la
//     route répond ok sans trancher, et `depose` n'est tranché qu'au rendu qui suit son « envoyer ». Un « refaire » ferme la tentative : le rendu suivant en
//     ouvre une nouvelle, avec l'aperçu du nouvel échantillon.
// `ok: false` (annoncé) ou une vérification qui échoue : rien ne change hors le compteur d'échecs du pack (dans `verifications`) ; au 3e échec le pack n'est
// plus repris, reste `payee`, visible avec ses échecs dans l'écran Packs du Poste (026-147), et le repli du poste s'applique (026-157). Réponse : { ok: false, raison }.
// Le compteur d'échecs d'un échantillon n'existe pas : la décision n'a pas de champ libre (contrat du bus).
import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { actif } from '@/lib/flags'
import { authAgent, estRefusAgent, reponseRefusAgent } from '@/lib/agents/garde'
import { ops_battement, ops_decision_creer, ops_decision_trancher, ops_decisions_tranchees } from '@/lib/agents/bus'
import { pauseGenerale } from '@/lib/agents/pause'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import {
  AGENT, APERCU_S, BUCKET, LIMITES, avecEchec, cleRegarder, codeRaison, estCleMarque, estObjet, estPremierEchantillon, estUuid, jugeVert, octetsMagiques,
  sousBail, suiteDuRegard, validerAnnonces,
} from '@/lib/pubs/usinePubs'
import type { Annonce, DecisionTranchee, Travail } from '@/lib/pubs/usinePubs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60 // la relecture des six fichiers d'un pack

const entetes = { 'cache-control': 'no-store' }
const repondre = (corps: object, status = 200) => NextResponse.json(corps, { status, headers: entetes })
const erreur = (status: number, code: string) => repondre({ error: code, code }, status)
const CORPS_MAX = 20_000

type Detenu = { travail: Travail; verifications: unknown }

async function detenu(id: string): Promise<Detenu | null> {
  const p = await supabaseAdmin.from('packs_pubs').select('id, etat, verifications').eq('id', id).maybeSingle()
  if (p.error) throw new Error('packs_pubs')
  if (p.data) {
    const l = p.data as { etat?: unknown; verifications?: unknown }
    return l.etat === 'payee' && sousBail(l.verifications, Date.now()) ? { travail: { genre: 'pack', id }, verifications: l.verifications } : null
  }
  const r = await supabaseAdmin.rpc('acq_studio_a_fabriquer', { p_limite: 50 })
  if (r.error || !Array.isArray(r.data)) return null
  const m = (r.data as Record<string, unknown>[]).find((x) => x.decision_id === id && x.opposition !== true && x.refus !== true)
  return m && estCleMarque(m.marque_cle) ? { travail: { genre: 'studio', id, marque: m.marque_cle }, verifications: null } : null
}

/** Un échec : seul le compteur du pack bouge (verifications, sous la même condition id et etat = payee) ; l'échantillon n'a rien à compter. */
async function echec(d: Detenu, raison: string, status: number) {
  if (d.travail.genre === 'pack') {
    await supabaseAdmin.from('packs_pubs').update({ verifications: avecEchec(d.verifications, raison, Date.now()) }).eq('id', d.travail.id).eq('etat', 'payee')
  }
  return repondre({ ok: false, raison }, status)
}

/** Relit chaque fichier annoncé dans le stockage : présent, de la taille permise, au SHA-256 annoncé, aux octets magiques de son type. null si tout tient. */
async function relire(travail: Travail, annonces: Annonce[]): Promise<string | null> {
  const maximum = travail.genre === 'pack' ? LIMITES.pack.octetsMax : LIMITES.studio.octetsMax
  for (const a of annonces) {
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(a.objet)
    if (error || !data) return 'fichier_absent'
    const octets = new Uint8Array(await data.arrayBuffer())
    if (octets.length === 0 || octets.length > maximum) return 'taille_hors_limite'
    if (createHash('sha256').update(octets).digest('hex') !== a.sha256) return 'empreinte_fausse'
    if (!octetsMagiques(a.type, octets.subarray(0, 16))) return 'octets_magiques'
  }
  return null
}

/** Les décisions tranchées d'un agent, page par page (50 au plus par appel, les plus anciennes d'abord) ; null si le bus ne répond pas. */
async function tranchees(agent: string): Promise<DecisionTranchee[] | null> {
  const tout: DecisionTranchee[] = []
  let depuis: string | null = null
  for (let page = 0; page < 6; page++) {
    const r = await ops_decisions_tranchees({ p_agent: agent, p_depuis: depuis })
    if (!r.ok || !Array.isArray(r.data)) return page === 0 ? null : tout
    tout.push(...r.data)
    if (r.data.length < 50) break
    const dernier: unknown = r.data[r.data.length - 1]?.tranchee_le
    if (typeof dernier !== 'string' || dernier === depuis) break
    depuis = dernier
  }
  return tout
}

async function rendrePack(d: Detenu, annonces: Annonce[], empreinteJournal: string) {
  if (d.travail.genre !== 'pack') return echec(d, 'travail_inconnu', 409)
  const maintenant = Date.now()
  const maj = await supabaseAdmin.from('packs_pubs')
    .update({
      etat: 'fabriquee',
      fabrique_le: new Date(maintenant).toISOString(),
      verifications: { juge: 'pub-locale-qa', verdict: 'PASS', source: 'usine', empreinte_journal: empreinteJournal, fichiers: annonces.map((a) => ({ chemin: a.chemin, sha256: a.sha256 })) },
    })
    .eq('id', d.travail.id).eq('etat', 'payee').select('id')
  if (maj.error || !maj.data?.length) return echec(d, 'pack_plus_payee', 409)
  return repondre({ ok: true })
}

async function rendreEchantillon(d: Detenu, annonces: Annonce[]) {
  if (d.travail.genre !== 'studio') return echec(d, 'travail_inconnu', 409)
  const t = d.travail
  const fond = await supabaseAdmin.from('artisans').select('id').eq('is_founder', true).order('id').limit(1)
  const fondateur = Array.isArray(fond.data) && estObjet(fond.data[0]) && typeof fond.data[0].id === 'string' ? fond.data[0].id : null
  if (fond.error || !fondateur) return echec(d, 'fondateur_illisible', 409)
  const standard = await tranchees('standardiste')
  if (!standard) return echec(d, 'decisions_illisibles', 409)
  if (estPremierEchantillon(standard)) {
    const siens = await tranchees(AGENT)
    if (!siens) return echec(d, 'decisions_illisibles', 409)
    const suite = suiteDuRegard(siens, t.id)
    if (suite.action === 'ouvrir') {
      const lien = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(annonces[0].objet, APERCU_S)
      if (lien.error || !lien.data?.signedUrl) return echec(d, 'apercu_indisponible', 409)
      const c = await ops_decision_creer({
        p_agent: AGENT,
        p_question: `Regarder le premier échantillon du Studio (${t.marque}) avant de l'envoyer${suite.tentative > 1 ? ` — refait, essai ${suite.tentative}` : ''}.`,
        p_contexte: `Aperçu (10 min) : ${lien.data.signedUrl}`,
        p_options: [{ cle: 'envoyer', libelle: 'Envoyer cet échantillon', recommandee: true }, { cle: 'refaire', libelle: 'Refaire l\'échantillon', recommandee: false }],
        p_defaut: 'refaire',
        p_echeance: new Date(Date.now() + 3 * 86_400_000).toISOString(),
        p_cle: cleRegarder(t.id, suite.tentative),
      })
      if (!c.ok) return echec(d, 'decision_non_ouverte', 409)
      return repondre({ ok: true, en_attente: 'regarder_premier_echantillon' })
    }
    // « envoyer » : on tranche ci-dessous
  }
  const tranche = await ops_decision_trancher({ p_id: t.id, p_choix: 'depose', p_auteur: fondateur })
  if (!tranche.ok) return echec(d, 'decision_non_tranchee', 409)
  return repondre({ ok: true })
}

export async function POST(req: Request) {
  if (!actif('busAgents')) return erreur(404, 'introuvable')
  const agent = await authAgent(req)
  if (estRefusAgent(agent)) return reponseRefusAgent(agent)
  if (agent.nom !== AGENT) return erreur(403, 'agent')
  try { await ops_battement({ p_nom: AGENT }) } catch { /* un battement manqué ne change pas le travail */ }
  if ((await pauseGenerale()).active) return erreur(423, 'pause')

  let corps: unknown
  try {
    const texte = await req.text()
    if (texte.length > CORPS_MAX) return erreur(400, 'corps_invalide')
    corps = JSON.parse(texte)
  } catch { return erreur(400, 'corps_invalide') }
  if (!estObjet(corps) || !estUuid(corps.travail) || typeof corps.ok !== 'boolean') return erreur(400, 'corps_invalide')

  try {
    const d = await detenu(corps.travail.toLowerCase())
    if (!d) return erreur(404, 'travail_introuvable')
    if (corps.ok === false) return await echec(d, codeRaison(corps.raison), 200)
    if (!jugeVert(d.travail, corps.juge)) return await echec(d, 'juge_non_vert', 409)
    const a = validerAnnonces(d.travail, corps.fichiers)
    if (!a.ok) return a.forme ? erreur(400, a.raison) : await echec(d, a.raison, 409)
    const raison = await relire(d.travail, a.annonces)
    if (raison) return await echec(d, raison, 409)
    const empreinte = String((corps.juge as Record<string, unknown>).empreinte_journal).toLowerCase()
    return d.travail.genre === 'pack' ? await rendrePack(d, a.annonces, empreinte) : await rendreEchantillon(d, a.annonces)
  } catch {
    return erreur(503, 'indisponible')
  }
}
