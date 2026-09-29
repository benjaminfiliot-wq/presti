// lib/siteLivraisonUsine.ts — le serveur consomme ce que le livreur de l'usine a déposé sous usine/<tache>/sortie/.
import crypto from 'node:crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import limites from '@/lib/agents/usineLimites.json' with { type: 'json' }

type Stockage = typeof supabaseAdmin.storage
type Base = typeof supabaseAdmin
type Options = { stockage?: Stockage; base?: Base; maintenant?: () => Date; limite?: number }
type Entree = { nom: string; type: string }

const USINE = 'usine', SITES = 'sites'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const NOM = /^[a-z0-9][a-z0-9._/-]{0,119}$/
const DEUX_HEURES = 2 * 3_600_000
// Les types de scripts/site-deposer.mjs (mêmes Content-Type au dépôt).
const TYPES: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webmanifest': 'application/manifest+json' }
const extension = (nom: string) => (nom.match(/\.[a-z0-9]+$/i)?.[0] ?? '').toLowerCase()
const LIVRAISON = (limites as Record<string, { fichiers_max: number; octets_fichier_max: number; octets_total_max: number; types: string[] }>).livraison

function magiqueJuste(type: string, o: Buffer): boolean {
  const debut = (octets: number[]) => octets.every((x, i) => o[i] === x)
  if (type === 'image/jpeg') return debut([0xff, 0xd8]) && o[o.length - 2] === 0xff && o[o.length - 1] === 0xd9
  if (type === 'image/png') return debut([0x89, 0x50, 0x4e, 0x47])
  if (type === 'image/webp') return o.subarray(0, 4).toString('latin1') === 'RIFF' && o.subarray(8, 12).toString('latin1') === 'WEBP'
  if (type === 'image/avif') return o.subarray(4, 8).toString('latin1') === 'ftyp'
  if (type === 'font/woff2') return o.subarray(0, 4).toString('latin1') === 'wOF2'
  if (type === 'application/json') { try { JSON.parse(o.toString('utf8')); return true } catch { return false } }
  try { new TextDecoder('utf-8', { fatal: true }).decode(o); return true } catch { return false }
}

async function evenement(type: string, tache: string, resume: string) {
  await supabaseAdmin.rpc('ops_evenement_ajouter', { p_agent: 'livreur', p_type: type, p_objet: `usine:${tache}`, p_resume: resume, p_tache: tache })
}
async function listerTout(stockage: Stockage, seau: string, prefixe: string): Promise<string[]> {
  const out: string[] = []
  const { data, error } = await stockage.from(seau).list(prefixe, { limit: 1000 })
  if (error) throw new Error('liste du bucket illisible')
  for (const e of data ?? []) { const p = `${prefixe}/${e.name}`; if (e.id === null) out.push(...await listerTout(stockage, seau, p)); else out.push(p) }
  return out
}
async function lire(stockage: Stockage, chemin: string): Promise<Buffer | null> {
  const { data, error } = await stockage.from(USINE).download(chemin)
  return error || !data ? null : Buffer.from(await data.arrayBuffer())
}
async function effacerTache(stockage: Stockage, tache: string, commande: string | null) {
  const chemins = await listerTout(stockage, USINE, tache)
  if (commande) chemins.push(`commandes/${commande}.json`)
  if (chemins.length) {
    const { error } = await stockage.from(USINE).remove(chemins)
    if (error) throw new Error('effacement usine impossible')
  }
}

export async function consommerSortiesUsine(o: Options = {}): Promise<{ consommees: number; ignorees: number; refusees: number; attente: number }> {
  const stockage = o.stockage ?? supabaseAdmin.storage, base = o.base ?? supabaseAdmin
  const maintenant = o.maintenant ?? (() => new Date()), limite = o.limite ?? 3
  const bilan = { consommees: 0, ignorees: 0, refusees: 0, attente: 0 }
  const { data: dossiers, error } = await stockage.from(USINE).list('', { limit: 1000 })
  if (error) throw new Error('bucket usine illisible')
  let traitees = 0
  for (const d of dossiers ?? []) {
    if (d.id !== null || !UUID.test(d.name)) continue
    const tache = d.name
    const { data: sortie, error: eSortie } = await stockage.from(USINE).list(`${tache}/sortie`, { limit: 100, search: 'manifeste.json' })
    if (eSortie) throw new Error('sortie usine illisible')
    const manifesteObjet = (sortie ?? []).find((f) => f.name === 'manifeste.json' && f.id !== null)
    if (!manifesteObjet) continue
    if (traitees++ >= limite) break
    const brut = await lire(stockage, `${tache}/entree/commande.json`)
    let entree: { commande?: string; id?: string; essai?: boolean } = {}
    try { entree = brut ? JSON.parse(brut.toString('utf8')) : {} } catch { entree = {} }
    if (entree.essai === true) continue
    const commandeId = String(entree.commande ?? entree.id ?? '')
    if (!UUID.test(commandeId)) { bilan.refusees++; await evenement('sortie_usine_refusee', tache, 'entree:commande'); continue }
    const { data: commande, error: eCommande } = await base.from('sites_commandes').select('id, etat, apercu_jeton').eq('id', commandeId).maybeSingle()
    if (eCommande) throw new Error('commande illisible')
    if (!commande || commande.etat !== 'payee') {
      await effacerTache(stockage, tache, commandeId)
      bilan.ignorees++
      await evenement('sortie_usine_ignoree', tache, commande ? `commande:${commande.etat}` : 'commande:absente')
      continue
    }
    // Tout avant la moindre copie.
    let manifeste: { fichiers?: Entree[] } = {}
    try { manifeste = JSON.parse((await lire(stockage, `${tache}/sortie/manifeste.json`))?.toString('utf8') ?? '') } catch { manifeste = {} }
    const fichiers = Array.isArray(manifeste.fichiers) ? manifeste.fichiers : null
    let raison: string | null = null
    const noms = new Set<string>()
    if (!fichiers || !fichiers.length || fichiers.length > LIVRAISON.fichiers_max) raison = 'sortie:manifeste'
    const contenus = new Map<string, Buffer>()
    let manquant = false, total = 0
    for (const f of fichiers ?? []) {
      if (raison) break
      if (typeof f?.nom !== 'string' || !NOM.test(f.nom) || f.nom.includes('..') || f.nom.includes('//')) { raison = 'sortie:nom'; break }
      if (noms.has(f.nom)) { raison = 'sortie:doublon'; break }
      noms.add(f.nom)
      if (!LIVRAISON.types.includes(f.type) || !(TYPES[extension(f.nom)] ?? '').startsWith(f.type)) { raison = 'sortie:type'; break }
      const octets = await lire(stockage, `${tache}/sortie/${f.nom}`)
      if (!octets) { manquant = true; continue }
      total += octets.length
      if (octets.length > LIVRAISON.octets_fichier_max || total > LIVRAISON.octets_total_max) { raison = 'sortie:taille'; break }
      if (!magiqueJuste(f.type, octets)) { raison = 'sortie:type'; break }
      contenus.set(f.nom, octets)
    }
    if (!raison && manquant) {
      const depot = new Date(manifesteObjet.created_at ?? maintenant().toISOString()).getTime()
      bilan.attente++
      if (maintenant().getTime() - depot > DEUX_HEURES) await evenement('sortie_usine_incomplete', tache, 'sortie:incomplete')
      continue
    }
    let rapport: { commande?: string; verdict?: string; criteres?: { passe?: boolean }[] } = {}
    if (!raison) {
      try { rapport = JSON.parse(contenus.get('rapport-qa.json')?.toString('utf8') ?? '') } catch { rapport = {} }
      if (rapport.verdict !== 'PASS' || rapport.commande !== commandeId || !Array.isArray(rapport.criteres) || rapport.criteres.some((c) => c.passe !== true)) raison = 'sortie:rapport'
    }
    if (raison) { bilan.refusees++; await evenement('sortie_usine_refusee', tache, raison); continue }
    // La copie, puis la commande (comme scripts/site-deposer.mjs), puis l'effacement.
    for (const [nom, octets] of contenus) {
      if (!nom.startsWith('site/')) continue
      const { error: eU } = await stockage.from(SITES).upload(`${commandeId}/${nom.slice(5)}`, octets, { contentType: TYPES[extension(nom)] ?? 'application/octet-stream', upsert: true, cacheControl: '3600' })
      if (eU) throw new Error('dépôt dans le bucket sites impossible')
    }
    const quand = maintenant().toISOString()
    const { data: passe, error: eMaj } = await base.from('sites_commandes')
      .update({ etat: 'generee', genere_le: quand, modifie_le: quand, apercu_jeton: commande.apercu_jeton || crypto.randomBytes(24).toString('base64url'), verifications: rapport, scores: null })
      .eq('id', commandeId).eq('etat', 'payee').select('id')
    if (eMaj) throw new Error('mise à jour de la commande impossible')
    if (!passe?.length) continue
    await effacerTache(stockage, tache, commandeId)
    bilan.consommees++
  }
  return bilan
}
