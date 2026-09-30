import { createHash, randomBytes } from 'node:crypto'
import { EXPIRATION_MAQUETTE_JOURS } from './contrat'

type Maquette = {
  id?: string
  prospect_id?: string
  objet?: string | null
  objets?: Record<string, unknown> | null
  entreprise?: string | null
  expire_le?: string | null
  purgee_le?: string | null
  etat?: string
}
type Magasin = {
  maquetteParJeton(jetonHache: string): Promise<Maquette | null>
  maquettesAPurger(limite: number): Promise<Maquette[]>
  marquerMaquettePurgee(id: string): Promise<void>
  lireProspect?: (id: string) => { entreprise?: string } | null
}
type Stockage = {
  lire(chemin: string): Promise<Uint8Array | null>
  retirer(chemin: string): Promise<void>
}
type Deps = { magasin: Magasin; stockage: Stockage }
type Reponse = { statut: number; entetes: Record<string, string>; corps: string | Uint8Array }

const COMMUN = {
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Cache-Control': 'private, no-store',
  'Referrer-Policy': 'no-referrer',
}
const introuvable = (): Reponse => ({ statut: 404, entetes: { ...COMMUN, 'Content-Type': 'text/plain; charset=utf-8' }, corps: 'Page introuvable.' })
const echapper = (texte: string) => texte.replace(/[&<>"']/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[s]!)

export function creerJeton(): string { return randomBytes(32).toString('base64url') }
export function hacherJeton(jeton: string): string { return createHash('sha256').update(jeton).digest('hex') }
export function expiration(maintenant: number | Date): string {
  return new Date(new Date(maintenant).getTime() + EXPIRATION_MAQUETTE_JOURS * 86_400_000).toISOString()
}

function prefixe(m: Maquette): string | null {
  const objet = m.objet ?? (typeof m.objets?.objet === 'string' ? m.objets.objet : null)
  return typeof objet === 'string' && objet.length > 0 && !objet.includes('..') ? objet.replace(/\/$/, '') : null
}

function cheminFichier(m: Maquette, fichier: 'capture.jpg' | 'video.mp4'): string | null {
  const objets = m.objets ?? {}
  const cles = fichier === 'capture.jpg'
    ? ['capture.jpg', 'capture-telephone.jpg', 'capture_telephone', 'telephone', 'capture']
    : ['video.mp4', 'video']
  for (const cle of cles) {
    const valeur = objets[cle]
    if (typeof valeur === 'string' && valeur.length > 0 && !valeur.startsWith('/') && !valeur.split('/').includes('..')) return valeur
  }
  const objet = prefixe(m)
  return objet ? `${objet}/${fichier}` : null
}

function plageDemandee(plage: string, taille: number): { debut: number; fin: number } | 'invalide' | null {
  if (!plage) return null
  const m = /^bytes=(\d*)-(\d*)$/.exec(plage)
  if (!m || (!m[1] && !m[2]) || taille === 0) return 'invalide'
  let debut: number
  let fin: number
  if (!m[1]) {
    const suffixe = Number(m[2])
    if (!Number.isSafeInteger(suffixe) || suffixe <= 0) return 'invalide'
    debut = Math.max(0, taille - suffixe)
    fin = taille - 1
  } else {
    debut = Number(m[1])
    fin = m[2] ? Number(m[2]) : taille - 1
    if (!Number.isSafeInteger(debut) || !Number.isSafeInteger(fin) || debut >= taille || fin < debut) return 'invalide'
    fin = Math.min(fin, taille - 1)
  }
  return { debut, fin }
}

export async function servirMaquette(jeton: string, fichier: string | undefined, deps: Deps, plage?: string | null): Promise<Reponse> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(jeton) || (fichier !== undefined && fichier !== 'capture.jpg' && fichier !== 'video.mp4')) return introuvable()
  const m = await deps.magasin.maquetteParJeton(hacherJeton(jeton))
  if (!m || m.etat === 'purgee' || m.purgee_le || !m.expire_le || Date.parse(m.expire_le) <= Date.now()) return introuvable()
  const captureChemin = cheminFichier(m, 'capture.jpg')
  const videoChemin = cheminFichier(m, 'video.mp4')
  if (!captureChemin) return introuvable()

  if (fichier) {
    const chemin = fichier === 'capture.jpg' ? captureChemin : videoChemin
    const octets = chemin ? await deps.stockage.lire(chemin) : null
    if (!octets) return introuvable()
    if (fichier === 'capture.jpg') return { statut: 200, entetes: { ...COMMUN, 'Content-Type': 'image/jpeg' }, corps: octets }
    const entetes = { ...COMMUN, 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes' }
    const demandee = plageDemandee(plage ?? '', octets.length)
    if (demandee === 'invalide') return { statut: 416, entetes: { ...entetes, 'Content-Range': `bytes */${octets.length}` }, corps: '' }
    if (demandee) return {
      statut: 206,
      entetes: { ...entetes, 'Content-Range': `bytes ${demandee.debut}-${demandee.fin}/${octets.length}`, 'Content-Length': String(demandee.fin - demandee.debut + 1) },
      corps: octets.subarray(demandee.debut, demandee.fin + 1),
    }
    return { statut: 200, entetes: { ...entetes, 'Content-Length': String(octets.length) }, corps: octets }
  }

  const capture = await deps.stockage.lire(captureChemin)
  if (!capture) return introuvable()
  const video = videoChemin ? await deps.stockage.lire(videoChemin) : null
  const entreprise = m.entreprise ?? (m.prospect_id ? deps.magasin.lireProspect?.(m.prospect_id)?.entreprise : null) ?? 'cette entreprise'
  const date = new Date(m.expire_le).toISOString().slice(0, 10)
  const corps = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow,noarchive"><title>Maquette privée</title><style>body{font:16px system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;color:#17212b}video,img{display:block;width:100%;height:auto;margin:1rem 0;border-radius:8px}</style></head><body><main><h1>Maquette privée</h1><p>Maquette privée préparée par Presti pour ${echapper(entreprise)}. Rien n'est publié. Ce lien s'arrête le ${date}.</p>${video ? '<video controls playsinline muted preload="metadata" poster="capture.jpg" src="video.mp4"></video>' : ''}<img src="capture.jpg" alt="Capture de la maquette"></main></body></html>`
  return { statut: 200, entetes: { ...COMMUN, 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'" }, corps }
}

export async function executerPurge(deps: Deps): Promise<{ purgees: number }> {
  const maquettes = await deps.magasin.maquettesAPurger(50)
  let purgees = 0
  for (const m of maquettes) {
    const captureChemin = cheminFichier(m, 'capture.jpg')
    const videoChemin = cheminFichier(m, 'video.mp4')
    if (!captureChemin || !m.id) continue
    try {
      await deps.stockage.retirer(captureChemin)
      if (videoChemin) await deps.stockage.retirer(videoChemin)
      const ordinateur = m.objets?.['capture-ordinateur.jpg'] ?? m.objets?.capture_ordinateur
      if (typeof ordinateur === 'string' && ordinateur.length > 0 && !ordinateur.startsWith('/') && !ordinateur.split('/').includes('..')) {
        await deps.stockage.retirer(ordinateur)
      }
      await deps.magasin.marquerMaquettePurgee(m.id)
      purgees++
    } catch { /* La ligne reste à reprendre au prochain passage. */ }
  }
  return { purgees }
}
