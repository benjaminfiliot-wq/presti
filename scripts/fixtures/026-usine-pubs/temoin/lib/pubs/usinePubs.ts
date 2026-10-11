// TÉMOIN de usine-pubs-qa (026-199) : une référence qui passe UP-1 à UP-5, posée dans les fixtures du juge, jamais déployée.
// Elle montre UNE forme conforme au CONTRAT.md voisin ; 026-200 écrit la vraie, sous app/ et lib/, et le juge la juge à son tour.
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { ops_decision_creer, ops_decision_trancher, ops_decisions_tranchees, ops_stockage_octets } from '@/lib/agents/bus'

export const AGENT = 'studio'
export const BUCKET = 'packs-pubs'
const BUCKET_PHOTOS = 'artisan-media'
export const BAIL_S = 5400 // 90 min
const SIGNATURE_LECTURE_S = 600
const GO = 1_073_741_824
const MO = 1024 * 1024
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SHA256 = /^[0-9a-f]{64}$/
const CLE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export type Fichier = { chemin: string; type: string; taille: number }
export type Reponse = { status: number; body: Record<string, unknown> }
type Objet = Record<string, unknown>
const objet = (v: unknown): v is Objet => !!v && typeof v === 'object' && !Array.isArray(v)
const refus = (status: number, error: string): Reponse => ({ status, body: { error, code: error } })
export const ECHECS_MAX = 3
const refusRendu = (raison: string): Reponse => ({ status: 409, body: { ok: false, raison } })
export const estUuid = (v: unknown): v is string => typeof v === 'string' && UUID.test(v)

// ── ce que le tourneur prend ─────────────────────────────────────────────────────────────────────────────────────────────
async function artisanDe(id: unknown) {
  const { data } = await supabaseAdmin.from('artisans').select('slug, domaine, domaine_verifie').eq('id', id).maybeSingle()
  return data as { slug?: string; domaine?: string | null; domaine_verifie?: boolean } | null
}

/** Les adresses de lecture des SEULES photos de ce pack : 600 s, bucket des photos, dossier de l'artisan. */
async function photosSignees(artisanId: string, matiere: Objet) {
  const photos = Array.isArray(matiere.photos) ? matiere.photos : []
  const chemins: string[] = []
  for (const p of photos) {
    const m = objet(p) && typeof p.url === 'string' ? new RegExp(`/object/public/${BUCKET_PHOTOS}/(.+)$`).exec(p.url) : null
    if (m && m[1].startsWith(`${artisanId}/`) && !m[1].includes('..')) chemins.push(m[1])
  }
  if (!chemins.length) return []
  const { data, error } = await supabaseAdmin.storage.from(BUCKET_PHOTOS).createSignedUrls(chemins, SIGNATURE_LECTURE_S)
  if (error || !data) return null
  const sortie: { nom: string; url: string }[] = []
  for (const d of data) if (d.signedUrl) sortie.push({ nom: String(d.path).split('/').pop() ?? '', url: d.signedUrl })
  return sortie.length === chemins.length ? sortie : null
}

async function travailPack(): Promise<Objet | null> {
  const { data } = await supabaseAdmin.from('packs_pubs').select('id, artisan_id, matiere, verifications').eq('etat', 'payee').order('paye_le', { ascending: true }).limit(20)
  for (const l of (data ?? []) as Objet[]) {
    const v = objet(l.verifications) ? l.verifications : {}
    if (typeof v.usine_bail_jusqua === 'string' && Date.parse(v.usine_bail_jusqua) > Date.now()) continue
    if (Number(v.usine_echecs ?? 0) >= ECHECS_MAX) continue // au 3e échec : plus de reprise automatique, le pack reste payee
    if (!estUuid(l.id) || typeof l.artisan_id !== 'string' || !objet(l.matiere)) continue
    const artisan = await artisanDe(l.artisan_id)
    if (!artisan?.slug) continue
    const photos = await photosSignees(l.artisan_id, l.matiere)
    if (!photos) continue
    const pris = await supabaseAdmin.from('packs_pubs').update({ verifications: { ...v, usine_bail_jusqua: new Date(Date.now() + BAIL_S * 1000).toISOString() } }).eq('id', l.id).eq('etat', 'payee').select('id')
    if (pris.error || !pris.data?.length) continue
    const site = artisan.domaine && artisan.domaine_verifie ? `https://${artisan.domaine.replace(/^https?:\/\//, '').replace(/\/$/, '')}` : `https://prestiapp.fr/p/${artisan.slug}`
    return { type: 'pack', id: l.id, pack: { pack_id: l.id, matiere: l.matiere, site }, photos }
  }
  return null
}

/** La phrase d'accord de la réponse de la marque : adresses et numéros masqués, 400 signes au plus. */
export function extraitAccord(texte: string): string {
  const net = texte.replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, '[adresse]').replace(/(?:\+?\d[\d .-]{6,}\d)/g, '[numéro]').replace(/\s+/g, ' ').trim()
  const phrases = net.split(/(?<=[.!?])\s+/)
  const accord = phrases.find((p) => /\b(oui|d'accord|accord|avec plaisir|ok)\b/i.test(p)) ?? phrases[0] ?? ''
  return accord.slice(0, 400)
}

async function travailStudio(): Promise<Objet | null> {
  const { data, error } = await supabaseAdmin.rpc('acq_studio_a_fabriquer', { p_limite: 10 })
  if (error || !Array.isArray(data)) return null
  for (const m of data as Objet[]) {
    if (m.opposition === true || m.refus === true || !estUuid(m.decision_id) || typeof m.marque_cle !== 'string' || !CLE.test(m.marque_cle)) continue
    const bail = await supabaseAdmin.rpc('acq_studio_bail_poser', { p_decision: m.decision_id, p_bail_s: BAIL_S })
    if (bail.error || bail.data !== true) continue
    return {
      type: 'studio', decision: m.decision_id, marque_cle: m.marque_cle, page_produit: m.page_produit,
      accord: { message_id: m.accord_message_id, recu_le: m.accord_recu_le, extrait: extraitAccord(String(m.accord_texte ?? '')) },
      echantillons_refuses: Array.isArray(m.echantillons_refuses) ? m.echantillons_refuses : [],
    }
  }
  return null
}

export async function prendreTravail(): Promise<Objet | null> {
  try { return (await travailPack()) ?? (await travailStudio()) } catch { return null }
}

// ── le travail que le tourneur dit détenir ──────────────────────────────────────────────────────────────────────────────
type Detenu = { genre: 'pack'; id: string; ligne: Objet } | { genre: 'studio'; decision: string; marque: string }
async function detenu(id: string): Promise<Detenu | null> {
  const { data } = await supabaseAdmin.from('packs_pubs').select('id, etat, verifications').eq('id', id).maybeSingle()
  if (data) {
    const l = data as Objet
    const v = objet(l.verifications) ? l.verifications : {}
    return l.etat === 'payee' && typeof v.usine_bail_jusqua === 'string' && Date.parse(v.usine_bail_jusqua) > Date.now() ? { genre: 'pack', id, ligne: l } : null
  }
  const r = await supabaseAdmin.rpc('acq_studio_a_fabriquer', { p_limite: 50 })
  const m = Array.isArray(r.data) ? (r.data as Objet[]).find((x) => x.decision_id === id && x.opposition !== true && x.refus !== true) : null
  return m && typeof m.marque_cle === 'string' ? { genre: 'studio', decision: id, marque: m.marque_cle } : null
}

// ── dépôt ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const NOMS_PACK = [/^video-[1-3]\.mp4$/, /^visuel-[1-3]\.(jpg|png)$/]
const TYPE_PACK: Record<string, string> = { mp4: 'video/mp4', jpg: 'image/jpeg', png: 'image/png' }

export async function deposer(id: string, corps: Objet): Promise<Reponse> {
  const t = await detenu(id)
  if (!t) return refus(404, 'travail_introuvable')
  const fichiers = corps.fichiers
  if (!Array.isArray(fichiers) || fichiers.length < 1 || fichiers.length > (t.genre === 'pack' ? 6 : 1)) return refus(400, 'fichiers_invalides')
  const vus = new Set<string>()
  const prefixe = t.genre === 'pack' ? `${BUCKET}/${t.id}/livraison/` : `${BUCKET}/studio/${t.marque}/`
  for (const f of fichiers) {
    if (!objet(f) || typeof f.chemin !== 'string' || typeof f.type !== 'string' || !Number.isSafeInteger(f.taille) || (f.taille as number) <= 0) return refus(400, 'fichier_invalide')
    if (!f.chemin.startsWith(prefixe) || vus.has(f.chemin)) return refus(400, 'chemin_invalide')
    const nom = f.chemin.slice(prefixe.length)
    if (t.genre === 'pack') {
      const ext = nom.split('.').pop() ?? ''
      if (!NOMS_PACK.some((re) => re.test(nom)) || TYPE_PACK[ext] !== f.type) return refus(400, 'fichier_invalide')
      if ((f.taille as number) > 60 * MO) return refus(400, 'fichier_trop_gros')
    } else {
      if (!/^echantillon-[1-9][0-9]?\.mp4$/.test(nom) || f.type !== 'video/mp4') return refus(400, 'fichier_invalide')
      if ((f.taille as number) > 3 * MO) return refus(400, 'fichier_trop_gros')
    }
    vus.add(f.chemin)
  }
  const mesure = await ops_stockage_octets()
  if (!mesure.ok || typeof mesure.data !== 'number' || !Number.isFinite(mesure.data) || mesure.data < 0) return refus(507, 'stockage')
  if (mesure.data > GO * 0.6) return refus(507, 'stockage')
  const depots: { chemin: string; url: string }[] = []
  for (const f of fichiers as Fichier[]) {
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).createSignedUploadUrl(f.chemin.slice(BUCKET.length + 1))
    if (error || !data?.signedUrl) return refus(502, 'stockage_indisponible')
    depots.push({ chemin: f.chemin, url: data.signedUrl })
  }
  return { status: 200, body: { ok: true, depots } }
}

// ── rendu ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const magiques = (ext: string, b: Uint8Array) =>
  ext === 'mp4' ? b.length > 12 && String.fromCharCode(...b.subarray(4, 8)) === 'ftyp'
  : ext === 'jpg' ? b.length > 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff
  : ext === 'png' ? b.length > 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((x, i) => b[i] === x) : false

async function relire(fichiers: { chemin: string; sha256: string }[]): Promise<string | null> {
  const { createHash } = await import('node:crypto')
  for (const f of fichiers) {
    const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(f.chemin.slice(BUCKET.length + 1))
    if (error || !data) return 'fichier_absent'
    const octets = new Uint8Array(await data.arrayBuffer())
    if (createHash('sha256').update(octets).digest('hex') !== f.sha256) return 'empreinte_fausse'
    if (!magiques(f.chemin.split('.').pop() ?? '', octets)) return 'octets_magiques'
  }
  return null
}

export async function rendre(id: string, corps: Objet): Promise<Reponse> {
  const t = await detenu(id)
  if (!t) return refus(404, 'travail_introuvable')
  if (typeof corps.ok !== 'boolean') return refus(400, 'corps_invalide')
  // un échec (annoncé par le tourneur, ou constaté ici) ne change rien hors le compteur d'échecs du pack (dans `verifications`)
  const echec = async (raison: string): Promise<Reponse> => {
    if (t.genre === 'pack') {
      const v = objet(t.ligne.verifications) ? t.ligne.verifications : {}
      await supabaseAdmin.from('packs_pubs').update({ verifications: { ...v, usine_echecs: Number(v.usine_echecs ?? 0) + 1, usine_echec: { raison: raison.slice(0, 120), le: new Date().toISOString() } } }).eq('id', t.id).eq('etat', 'payee')
    }
    return refusRendu(raison)
  }
  if (corps.ok === false) return { ...(await echec(String(corps.raison ?? '') || 'echec_annonce')), status: 200 }
  const j = corps.juge
  const nomJuge = t.genre === 'pack' ? 'pub-locale-qa' : 'pub-qa'
  if (!objet(j) || j.nom !== nomJuge || j.code !== 0 || typeof j.empreinte_journal !== 'string' || !SHA256.test(j.empreinte_journal)) return await echec('juge_non_vert')
  const annonces = corps.fichiers
  if (!Array.isArray(annonces) || !annonces.every((f) => objet(f) && typeof f.chemin === 'string' && typeof f.sha256 === 'string' && SHA256.test(f.sha256))) return refus(400, 'fichiers_invalides')
  const liste = annonces as { chemin: string; sha256: string }[]
  const noms = liste.map((f) => f.chemin).sort()
  if (t.genre === 'pack') {
    const attendus = ['video-1.mp4', 'video-2.mp4', 'video-3.mp4'].map((n) => `${BUCKET}/${t.id}/livraison/${n}`)
    const visuels = noms.filter((n) => /\/livraison\/visuel-[1-3]\.(jpg|png)$/.test(n))
    const videos = noms.filter((n) => attendus.includes(n))
    if (liste.length !== 6 || videos.length !== 3 || visuels.length !== 3 || new Set(visuels.map((n) => n.replace(/\.(jpg|png)$/, ''))).size !== 3 || !noms.every((n) => n.startsWith(`${BUCKET}/${t.id}/livraison/`))) return await echec('fichiers_incomplets')
    const raison = await relire(liste)
    if (raison) return await echec(raison)
    const maj = await supabaseAdmin.from('packs_pubs')
      .update({ etat: 'fabriquee', fabrique_le: new Date().toISOString(), verifications: { juge: 'pub-locale-qa', verdict: 'PASS', empreinte_journal: j.empreinte_journal, fichiers: liste } })
      .eq('id', t.id).eq('etat', 'payee').select('id')
    if (maj.error || !maj.data?.length) return await echec('pack_plus_payee')
    return { status: 200, body: { ok: true } }
  }
  // Studio : un seul MP4, sous studio/<marque>/
  const m = liste.length === 1 ? /^packs-pubs\/studio\/([a-z0-9-]+)\/echantillon-[1-9][0-9]?\.mp4$/.exec(liste[0].chemin) : null
  if (!m || m[1] !== t.marque) return await echec('fichiers_incomplets')
  const raison = await relire(liste)
  if (raison) return await echec(raison)
  const { data: fond } = await supabaseAdmin.from('artisans').select('id').eq('is_founder', true).order('id').limit(1)
  const fondateur = Array.isArray(fond) && fond[0] && typeof fond[0].id === 'string' ? fond[0].id : null
  if (!fondateur) return await echec('fondateur_illisible')
  const anterieures = await ops_decisions_tranchees({ p_agent: 'standardiste' })
  const premier = !(anterieures.ok && Array.isArray(anterieures.data) && anterieures.data.some((d) => String(d.cle_idempotence ?? '').startsWith('acq:studio_echantillon:') && d.choix === 'depose'))
  if (premier) {
    const cle = `studio:regarder_premier:${t.decision}`
    const connue = await ops_decisions_tranchees({ p_agent: AGENT })
    const ok = connue.ok && Array.isArray(connue.data) ? connue.data.find((d) => d.cle_idempotence === cle) : undefined
    if (!ok) {
      const lien = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(liste[0].chemin.slice(BUCKET.length + 1), 600)
      const c = await ops_decision_creer({
        p_agent: AGENT, p_question: `Regarder le premier échantillon du Studio (${t.marque}) avant de l'envoyer.`, p_contexte: `Aperçu (10 min) : ${lien.data?.signedUrl ?? 'indisponible'}`,
        p_options: [{ cle: 'envoyer', libelle: 'Envoyer cet échantillon', recommandee: true }, { cle: 'refaire', libelle: 'Refaire l\'échantillon', recommandee: false }],
        p_defaut: 'refaire', p_echeance: new Date(Date.now() + 3 * 86_400_000).toISOString(), p_cle: cle,
      })
      if (!c.ok) return await echec('decision_non_ouverte')
      return { status: 200, body: { ok: true, en_attente: 'regarder_premier_echantillon' } }
    }
    if (ok.choix !== 'envoyer') return { status: 200, body: { ok: true, en_attente: 'refaire' } }
  }
  const t2 = await ops_decision_trancher({ p_id: t.decision, p_choix: 'depose', p_auteur: fondateur })
  if (!t2.ok) return await echec('decision_non_tranchee')
  return { status: 200, body: { ok: true } }
}
