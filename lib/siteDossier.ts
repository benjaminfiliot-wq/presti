// Dossier exportable d'un site déposé dans le bucket privé « sites ».
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { consommerLimite } from '@/lib/limites'
import { getIp, ipPseudonyme } from '@/lib/security'
import { BUCKET_SITES } from '@/lib/sitesGeneres'
import { ZipFlux } from '@/lib/zip'

type Dependances = {
  base?: typeof supabaseAdmin
  stockage?: typeof supabaseAdmin.storage
  maintenant?: () => Date
}

const jourMs = 86_400_000
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const empreinte = (jeton: string) => createHash('sha256').update(jeton).digest('hex')
const baseDe = (deps: Dependances) => deps.base ?? supabaseAdmin
const stockageDe = (deps: Dependances) => (deps.stockage ?? deps.base?.storage ?? supabaseAdmin.storage).from(BUCKET_SITES)
const maintenantDe = (deps: Dependances) => (deps.maintenant ?? (() => new Date()))()

/** Crée un lien temporaire ; seule l'empreinte du secret est conservée. */
export async function creerJetonDossier(commandeId: string, jours = 90, deps: Dependances = {}): Promise<string> {
  if (!uuid.test(commandeId) || !Number.isFinite(jours) || jours <= 0) throw new Error('Paramètres du dossier invalides')
  const jeton = randomBytes(32).toString('base64url')
  const expiration = new Date(maintenantDe(deps).getTime() + jours * jourMs).toISOString()
  const { error } = await baseDe(deps).from('sites_commandes').update({
    dossier_jeton_hash: empreinte(jeton), dossier_expire_le: expiration,
  }).eq('id', commandeId)
  if (error) throw error
  return jeton
}

/** Vérifie le secret en temps constant et sa date limite. */
export async function verifierJetonDossier(commandeId: string, jeton: string, deps: Dependances = {}): Promise<boolean> {
  if (!uuid.test(commandeId) || !/^[A-Za-z0-9_-]{43}$/.test(jeton)) return false
  const { data, error } = await baseDe(deps).from('sites_commandes')
    .select('dossier_jeton_hash, dossier_expire_le').eq('id', commandeId).maybeSingle()
  if (error || !data?.dossier_jeton_hash || !data.dossier_expire_le) return false
  if (!/^[0-9a-f]{64}$/i.test(data.dossier_jeton_hash)) return false
  const attendu = Buffer.from(data.dossier_jeton_hash, 'hex')
  const recu = Buffer.from(empreinte(jeton), 'hex')
  return timingSafeEqual(attendu, recu) && new Date(data.dossier_expire_le).getTime() > maintenantDe(deps).getTime()
}

/** Parcourt aussi les dossiers que list() ne descend pas spontanément. */
export async function listerSite(commandeId: string, deps: Dependances = {}): Promise<string[]> {
  if (!uuid.test(commandeId)) throw new Error('Identifiant de commande invalide')
  const seau = stockageDe(deps)
  const fichiers: string[] = []
  async function parcourir(prefixe: string): Promise<void> {
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await seau.list(prefixe, { limit: 100, offset })
      if (error) throw error
      for (const entree of data ?? []) {
        if (!entree.name || entree.name === '.' || entree.name === '..' || entree.name.includes('/') || entree.name.includes('\\')) continue
        const chemin = `${prefixe}/${entree.name}`
        if (entree.id == null) await parcourir(chemin)
        else fichiers.push(chemin.slice(commandeId.length + 1))
      }
      if ((data?.length ?? 0) < 100) break
    }
  }
  await parcourir(commandeId)
  return fichiers.sort()
}

const notice = `Dossier de votre site\n\nCe site est statique : vous pouvez l'héberger tel quel chez un nouvel hébergeur.\nLe formulaire de contact écrivait à Presti. Désormais, si l'envoi échoue, il affiche le téléphone et l'adresse de l'artisan.\nPour utiliser votre domaine, faites-le pointer vers le nouvel hébergeur.\n`

/** Ajoute les octets originaux de chaque objet, puis ferme l'archive ZIP. */
export async function archiveDuSite(commandeId: string, deps: Dependances = {}): Promise<ZipFlux> {
  const fichiers = await listerSite(commandeId, deps)
  const zip = new ZipFlux()
  const seau = stockageDe(deps)
  try {
    for (const chemin of fichiers) {
      const { data, error } = await seau.download(`${commandeId}/${chemin}`)
      if (error || !data) throw error ?? new Error('Fichier du site introuvable')
      zip.ajouter(chemin, new Uint8Array(await data.arrayBuffer()))
    }
    zip.ajouter('LISEZ-MOI.txt', notice)
    zip.terminer()
  } catch (erreur) {
    zip.echouer(erreur)
    throw erreur
  }
  return zip
}

/** Efface les dossiers expirés après retrait, une seule fois par commande. */
export async function purgerFichiersExpires(deps: Dependances = {}): Promise<void> {
  const date = maintenantDe(deps).toISOString()
  const { data: commandes, error } = await baseDe(deps).from('sites_commandes')
    .select('id').eq('etat', 'retiree').lt('dossier_expire_le', date).is('fichiers_purges_le', null)
  if (error) throw error
  const seau = stockageDe(deps)
  for (const commande of commandes ?? []) {
    const fichiers = await listerSite(commande.id, deps)
    for (let debut = 0; debut < fichiers.length; debut += 100) {
      const { error: erreur } = await seau.remove(fichiers.slice(debut, debut + 100).map((chemin) => `${commande.id}/${chemin}`))
      if (erreur) throw erreur
    }
    const { error: erreur } = await baseDe(deps).from('sites_commandes').update({
      fichiers_purges_le: date, email: `retire-${commande.id.slice(0, 8)}@anonyme.invalid`,
    }).eq('id', commande.id).is('fichiers_purges_le', null)
    if (erreur) throw erreur
  }
}

const introuvable = () => new Response('Introuvable', {
  status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' },
})

/** Point d'entrée injectable de la route publique. */
export async function servirDossier(req: Request, commandeId: string, deps: Dependances = {}): Promise<Response> {
  if (!uuid.test(commandeId)) return introuvable()
  const ip = ipPseudonyme(getIp(req)) ?? 'inconnue'
  if (!await consommerLimite(`site-dossier:${ip}`, 10, 3600)) return new Response('Trop de demandes', {
    status: 429, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' },
  })
  const jeton = new URL(req.url).searchParams.get('j') ?? ''
  try {
    if (!await verifierJetonDossier(commandeId, jeton, deps)) return introuvable()
    const { data, error } = await baseDe(deps).from('sites_commandes').select('domaine').eq('id', commandeId).maybeSingle()
    if (error || !data) return introuvable()
    const domaine = typeof data.domaine === 'string' && /^[a-z0-9.-]+$/i.test(data.domaine) ? data.domaine : commandeId.slice(0, 8)
    const zip = await archiveDuSite(commandeId, deps)
    return new Response(zip.flux, { headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="site-${domaine}.zip"`,
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    } })
  } catch {
    return introuvable()
  }
}
