import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { ops_evenement_ajouter, ops_tache_creer } from '@/lib/agents/bus'
import { envoyerAlertes } from '@/lib/alertes'

type Charge = Record<string, unknown>
type Resultat = Record<string, unknown>
type MessageArgent = { msg_id: number; type: string; cle: string; charge: Charge | null }
export type GestionnaireArgent = (charge: Charge) => Promise<Resultat>

const IDENTIFIANT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const ETATS_LIVRABLES = ['payee', 'generee', 'validee', 'en_ligne']
const COLONNES_ARTISAN = 'id, email, nom, metier, slug, tel, tel_public, services, plan'

/** Le stockage est une aide à la livraison : son indisponibilité ne retarde jamais l'argent. */
export async function deposerEntreeUsine({ tache, commande_id, essai }: { tache: string; commande_id: string; essai: boolean }) {
  try {
    if (!IDENTIFIANT.test(tache) || !IDENTIFIANT.test(commande_id)) throw new Error('identifiant invalide')
    const usine = supabaseAdmin.storage.from('usine')
    const dossier = `${tache}/entree`
    const existante = await usine.exists(`${dossier}/commande.json`)
    if (existante.data === true) return { depose: false, deja: true }

    const { data: commande, error: erreurCommande } = await supabaseAdmin.from('sites_commandes').select('*').eq('id', commande_id).single()
    if (erreurCommande || !commande) throw new Error('commande illisible')
    const { data: artisan, error: erreurArtisan } = await supabaseAdmin.from('artisans').select(COLONNES_ARTISAN).eq('id', commande.artisan_id).single()
    if (erreurArtisan || !artisan) throw new Error('artisan illisible')

    const projet = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost').origin
    const matiere = (commande.matiere ?? {}) as { photos?: { url?: string }[]; logo_url?: string | null }
    const adresses = [...(matiere.photos ?? []).map((photo) => photo?.url), matiere.logo_url]
    for (const adresse of adresses) {
      if (typeof adresse !== 'string') continue
      let url: URL
      try { url = new URL(adresse) } catch { continue }
      if (url.origin !== projet || url.search || url.hash) continue
      const morceaux = url.pathname.match(/^\/storage\/v1\/object\/public\/artisan-media\/([^/]+)\/([^/]+)$/)
      if (!morceaux || morceaux[1] !== commande.artisan_id) continue
      let nom: string
      try { nom = decodeURIComponent(morceaux[2]) } catch { continue }
      if (!nom || nom === '.' || nom === '..' || /[/\\]/.test(nom)) continue
      const copie = await supabaseAdmin.storage.from('artisan-media').copy(`${commande.artisan_id}/${nom}`, `${dossier}/photos/${nom}`, { destinationBucket: 'usine' })
      if (copie.error) throw new Error('photo inaccessible')
    }

    const entree = { commande, artisan, ...(essai ? { essai: true } : {}) }
    const depot = await usine.upload(`${dossier}/commande.json`, JSON.stringify(entree), { contentType: 'application/json', upsert: false })
    if (depot.error) throw new Error('entrée non déposée')
    const index = await usine.upload(`commandes/${commande_id}.json`, JSON.stringify({ tache }), { contentType: 'application/json', upsert: true })
    if (index.error) throw new Error('index non déposé')
    return { depose: true, deja: false }
  } catch {
    try {
      await ops_evenement_ajouter({
        p_agent: 'systeme', p_type: 'entree_usine_absente', p_objet: `commande:${commande_id}`,
        p_resume: 'Entrée usine indisponible ; livraison à reprendre par Actions ou le poste.',
        p_tache: IDENTIFIANT.test(tache) ? tache : null,
      })
    } catch { /* L'observabilité ne doit pas bloquer la file argent. */ }
    return { depose: false, deja: false }
  }
}

async function commandePayee(charge: Charge): Promise<Resultat> {
  const id = typeof charge?.commande_id === 'string' ? charge.commande_id : ''
  if (!IDENTIFIANT.test(id)) return { ignore: 'commande_id absent' }
  const { data, error } = await supabaseAdmin.from('sites_commandes').select('id, etat').eq('id', id).maybeSingle()
  if (error) throw new Error('lecture de la commande impossible')
  if (!data) return { ignore: 'introuvable' }
  if (data.etat === 'brouillon') return { ignore: 'brouillon' }
  if (!ETATS_LIVRABLES.includes(data.etat)) return { ignore: `etat ${data.etat}` }

  const creation = await ops_tache_creer({
    p_agent: 'systeme', p_type: 'livrer_site', p_cle: `livrer_site:${id}`,
    p_capacite: 'livraison', p_charge: { commande_id: id }, p_origine: null, p_objet: `commande:${id}`,
  })
  if (!creation.ok) throw new Error(`création de la tâche refusée : ${creation.code}`)
  const ligne = (Array.isArray(creation.data) ? creation.data[0] : creation.data) as { id?: string; creee?: boolean } | null
  const tache = typeof ligne?.id === 'string' ? ligne.id : null
  if (!tache) throw new Error('identifiant de tâche absent')
  const entree = data.etat === 'payee' ? await deposerEntreeUsine({ tache, commande_id: id, essai: charge.essai === true }) : null
  return { tache, creee: ligne?.creee === true, entree: entree ? (entree.deja ? 'deja' : entree.depose ? 'deposee' : 'absente') : null }
}

async function essaiE2e(): Promise<Resultat> {
  const evenement = await ops_evenement_ajouter({
    p_agent: 'systeme', p_type: 'essai_e2e', p_objet: null,
    p_resume: 'Essai de la file argent.', p_tache: null,
  })
  if (!evenement.ok) throw new Error(`événement refusé : ${evenement.code}`)
  return { ok: true }
}

export const HANDLERS: Record<'commande_payee' | 'essai_e2e', GestionnaireArgent> = {
  commande_payee: commandePayee,
  essai_e2e: essaiE2e,
}

function sousDelai<T>(travail: Promise<T>, dureeMs: number): Promise<T> {
  let minuteur: ReturnType<typeof setTimeout> | undefined
  const limite = new Promise<never>((_, rejeter) => {
    minuteur = setTimeout(() => rejeter(new Error('budget épuisé')), Math.max(1, dureeMs))
  })
  return Promise.race([travail, limite]).finally(() => clearTimeout(minuteur))
}

/** Un message n'est acquitté qu'après la réussite du gestionnaire. */
export async function traiterFileArgent({ budgetMs = 12000, lot = 5, vtS = 120, handlers = HANDLERS as Record<string, GestionnaireArgent> } = {}) {
  const debut = Date.now()
  const visibilite = Math.min(3600, Math.max(5, Math.round(vtS)))
  const bilan = { lus: 0, faits: 0, echecs: 0, inconnus: 0, dureeMs: 0 }
  lecture: while (Date.now() - debut < budgetMs) {
    const { data, error } = await supabaseAdmin.rpc('ops_argent_lire', { p_vt_s: visibilite, p_n: lot })
    if (error) throw new Error('lecture de la file argent impossible')
    const messages = (Array.isArray(data) ? data : []) as MessageArgent[]
    if (!messages.length) break
    for (const message of messages) {
      const reste = budgetMs - (Date.now() - debut)
      if (reste <= 0) break lecture
      bilan.lus++
      const gestionnaire = Object.prototype.hasOwnProperty.call(handlers, message.type) ? handlers[message.type] : null
      if (!gestionnaire) {
        bilan.inconnus++
        try {
          await envoyerAlertes([{
            motif: 'paiement', a: 'entreprise', cle: `argent:type_inconnu:${message.cle}`,
            sujet: 'Type inconnu dans la file argent',
            corps: `Un message de type « ${String(message.type).slice(0, 40)} » attend un gestionnaire.`,
          }])
        } catch { bilan.echecs++ }
        continue
      }
      try {
        const resultat = await sousDelai(gestionnaire(message.charge ?? {}), reste)
        const fait = await supabaseAdmin.rpc('ops_argent_fait', {
          p_msg_id: message.msg_id, p_cle: message.cle, p_resultat: resultat ?? {},
        })
        if (fait.error) bilan.echecs++
        else bilan.faits++
      } catch { bilan.echecs++ }
    }
  }
  bilan.dureeMs = Date.now() - debut
  return bilan
}

export async function balayerCommandesPayees() {
  const depuis = new Date(Date.now() - 30 * 86_400_000).toISOString()
  const { data, error } = await supabaseAdmin.from('sites_commandes')
    .select('id, paye_le').eq('etat', 'payee').gte('paye_le', depuis)
    .order('paye_le', { ascending: true }).limit(100)
  if (error) throw new Error('lecture des commandes payées impossible')
  let envoyees = 0
  for (const commande of data ?? []) {
    const envoi = await supabaseAdmin.rpc('ops_argent_envoyer', {
      p_type: 'commande_payee', p_cle: `commande_payee:${commande.id}`,
      p_charge: { commande_id: commande.id }, p_delai_s: 0,
    })
    if (envoi.error) throw new Error('mise en file de la commande impossible')
    if (envoi.data !== null) envoyees++
  }
  return { vues: (data ?? []).length, envoyees }
}
