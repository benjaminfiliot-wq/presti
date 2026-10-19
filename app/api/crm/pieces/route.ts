import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { chantierDe, erreur, gardeCrm, INDISPONIBLE, json, nonPermise, statutErreurBase } from '@/lib/crm/serveur'
import { estUuid } from '@/lib/crm/valider'
import { lirePages } from '@/lib/crm/pages'
import { cheminPiece, DUREE_LIEN_SIGNE, TAILLE_MAX_PIECE, typeReel, validerChampsPiece, verdictQuotaPieces } from '@/lib/crm/pieces'
import { consommerLimite } from '@/lib/limites'

export const runtime = 'nodejs'
export const maxDuration = 30
const BUCKET = 'chantier-pieces'
const MANQUE_0163 = 'Les photos de chantier ne sont pas encore installées sur cette base (migration 0163).'
const absente = (e: { code?: string } | null | undefined) => !!e && ['42P01', 'PGRST205'].includes(String(e.code))

// Les photos et pièces d'un chantier (plan du 18/10, n°5 ; table chantier_pieces, bucket PRIVÉ chantier-pieces, migration 0163).
// GET  /api/crm/pieces?chantier_id=<uuid> → les pièces du chantier, chacune avec une adresse SIGNÉE valable 10 minutes.
// POST /api/crm/pieces (multipart : chantier_id, fichier, type?, legende?, pris_le?) → envoie UN fichier :
//   • le chantier doit être celui de la session ; le TYPE RÉEL est lu dans les octets (image JPEG/PNG/WebP ou PDF, rien d'autre) ;
//   • 4 Mo au plus (sous la limite de l'hébergeur) ; quota du compte selon l'offre (lib/plans.ts, PLAFOND_PIECES_CHANTIER_MO) ;
//   • le chemin est fabriqué par le serveur (<artisan>/<chantier>/<identifiant>.<ext>) ; 60 envois par heure et par compte ;
//   • si l'enregistrement en base échoue après l'envoi, le fichier est retiré (jamais un fichier orphelin compté nulle part).
export async function GET(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmPieces' })
  if ('reponse' in g) return g.reponse
  const chantierId = new URL(req.url).searchParams.get('chantier_id')
  if (!estUuid(chantierId)) return erreur('Chantier introuvable.', 404)
  const { data, error } = await supabaseAdmin.from('chantier_pieces').select('id, chemin, type, legende, pris_le, taille, mime').eq('artisan_id', g.uid).eq('chantier_id', chantierId).order('pris_le', { ascending: false }).limit(500)
  if (error) { console.error('[crm/pieces] lecture :', error.message); return erreur(absente(error) ? MANQUE_0163 : INDISPONIBLE, 503) }
  const lignes = data ?? []
  const signees = lignes.length ? await supabaseAdmin.storage.from(BUCKET).createSignedUrls(lignes.map((l) => l.chemin), DUREE_LIEN_SIGNE) : { data: [], error: null }
  if (signees.error) console.error('[crm/pieces] signature :', signees.error.message)
  const url = new Map((signees.data ?? []).map((s) => [s.path, s.signedUrl]))
  return json({ pieces: lignes.map(({ chemin, ...l }) => ({ ...l, url: url.get(chemin) ?? null })) })
}

export async function POST(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmPieces' })
  if ('reponse' in g) return g.reponse
  const annoncee = Number(req.headers.get('content-length') ?? 0)
  if (annoncee > TAILLE_MAX_PIECE + 64 * 1024) return erreur('Fichier trop lourd : 4 Mo au plus.', 413)
  if (!/^multipart\/form-data/i.test(req.headers.get('content-type') ?? '')) return erreur('Envoi invalide (formulaire de fichier attendu).', 415)
  const form = await req.formData().catch(() => null)
  if (!form) return erreur('Envoi illisible.', 400)
  const permis = ['chantier_id', 'fichier', 'type', 'legende', 'pris_le']
  const inconnus = [...new Set([...form.keys()])].filter((k) => !permis.includes(k))
  if (inconnus.length) return erreur(`Champ inconnu : ${inconnus.slice(0, 3).join(', ')}.`, 400)
  const chantierId = String(form.get('chantier_id') ?? '')
  if (!estUuid(chantierId)) return erreur('Chantier introuvable.', 404)
  const fichier = form.get('fichier')
  if (!(fichier instanceof Blob) || fichier.size === 0) return erreur('Aucun fichier.', 400)
  if (fichier.size > TAILLE_MAX_PIECE) return erreur('Fichier trop lourd : 4 Mo au plus.', 413)
  const champs = validerChampsPiece(Object.fromEntries(['type', 'legende', 'pris_le'].filter((k) => form.has(k)).map((k) => [k, String(form.get(k))])), new Date(), true)
  if (!champs.ok) return erreur(champs.erreur, 400)

  const { chantier, error: ec } = await chantierDe(g.uid, chantierId)
  if (ec) return erreur(INDISPONIBLE, 503)
  if (!chantier) return erreur('Chantier introuvable.', 404)
  const octets = new Uint8Array(await fichier.arrayBuffer())
  const t = typeReel(octets)
  if (!t) return erreur('Format refusé : photo JPEG, PNG ou WebP, ou document PDF.', 415)

  const [{ data: art }, deja] = await Promise.all([
    supabaseAdmin.from('artisans').select('plan').eq('id', g.uid).maybeSingle(),
    lirePages((de, a) => supabaseAdmin.from('chantier_pieces').select('taille').eq('artisan_id', g.uid).order('id').range(de, a), 50_000),
  ])
  if (deja.error) { console.error('[crm/pieces] quota :', deja.error.message); return erreur(absente(deja.error) ? MANQUE_0163 : INDISPONIBLE, 503) }
  const utilise = (deja.data ?? []).reduce((s, l) => s + Number((l as { taille: number }).taille || 0), 0)
  const q = verdictQuotaPieces((art?.plan as string | null) ?? null, utilise, octets.byteLength)
  if (!q.ok) return erreur(q.message, 413, { code: 'quota' })
  if (!(await consommerLimite(`crm-pieces:${g.uid}`, 60, 3600))) return erreur('Trop d’envois d’un coup : patientez quelques minutes.', 429, { code: 'debit' })

  const id = crypto.randomUUID()
  const chemin = cheminPiece(g.uid, chantierId, id, t.ext)
  const envoi = await supabaseAdmin.storage.from(BUCKET).upload(chemin, octets, { contentType: t.mime, upsert: false, cacheControl: '0' })
  if (envoi.error) { console.error('[crm/pieces] envoi :', envoi.error.message); return erreur(/bucket not found/i.test(envoi.error.message) ? MANQUE_0163 : 'Le fichier n’a pas pu être enregistré. Réessayez dans un instant.', 503) }
  const { error } = await supabaseAdmin.from('chantier_pieces').insert({
    id, artisan_id: g.uid, chantier_id: chantierId, chemin, type: champs.valeur.type ?? 'pendant', legende: champs.valeur.legende ?? null,
    ...(champs.valeur.pris_le ? { pris_le: champs.valeur.pris_le } : {}), taille: octets.byteLength, mime: t.mime,
  })
  if (error) {
    await supabaseAdmin.storage.from(BUCKET).remove([chemin]).catch(() => {})
    const s = statutErreurBase(error); console.error('[crm/pieces] enregistrement :', error.message)
    return erreur(s.status === 503 ? MANQUE_0163 : s.message, s.status)
  }
  return json({ ok: true, id }, 201)
}

// Méthodes non servies : la garde d'abord (drapeau, session, essai : 404 comme partout), puis 405 pour qui a accès.
export async function PUT(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmPieces' })
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, POST')
}
export async function PATCH(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmPieces' })
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, POST')
}
export async function DELETE(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmPieces' })
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, POST')
}
export async function OPTIONS(req: Request) {
  const g = await gardeCrm(req, { drapeau: 'crmPieces' })
  if ('reponse' in g) return g.reponse
  return nonPermise('GET, POST')
}
