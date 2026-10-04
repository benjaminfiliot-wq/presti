import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendEmail } from '@/lib/email'
import { getStatus, type DnsRecord } from '@/lib/vercelDomains'
import { DELAI_TEXTE, PRIX_SITE_TEXTE, erreursAvantPaiement, type Commande } from '@/lib/siteCommande'
import { envoyerAlertes, enregistrerPassage, type Alerte } from '@/lib/alertes'
import { purgerBrouillonsPublics } from '@/lib/siteAchatPublic'
import { retraitsDus, retirer } from '@/lib/siteRetrait'
import { purgerFichiersExpires } from '@/lib/siteDossier'
import { veilleTresorerie } from '@/lib/direction/veilleTresorerie'
import { demanderGeneration } from '@/lib/siteGenerationDistante'
import { busEnPause, cloreTacheLivraison, battementLivreur, battementTresorier } from '@/lib/siteLivraisonBus'
import { consommerSortiesUsine } from '@/lib/siteLivraisonUsine'
import { soumettreSiteSearchConsole, type DependancesSearchConsole } from '@/lib/sites/searchConsole'
import { pauseGenerale } from '@/lib/agents/pause'

type CleCourriel = 'payee' | 'generee' | 'en_ligne'
type CommandeLivraison = Omit<Commande, 'etat'> & { etat: Commande['etat'] | 'retiree'; courriels?: Partial<Record<CleCourriel, string>>; retiree_le?: string | null; search_console_le?: string | null; verifications?: Record<string, unknown> | null }
type Base = typeof supabaseAdmin
type Dependances = {
  base?: Base
  envoyer?: typeof sendEmail
  statutDomaine?: typeof getStatus
  maintenant?: () => Date
  enPause?: () => Promise<boolean>
  searchConsole?: DependancesSearchConsole
}

const dependances = (d: Dependances) => ({
  base: d.base ?? supabaseAdmin,
  envoyer: d.envoyer ?? sendEmail,
  statutDomaine: d.statutDomaine ?? getStatus,
  maintenant: d.maintenant ?? (() => new Date()),
  enPause: d.enPause ?? busEnPause,
})

export function courrielsDus(commande: CommandeLivraison): CleCourriel[] {
  if (commande.etat === 'brouillon' || commande.etat === 'retiree') return []
  const c = commande.courriels ?? {}
  const dus: CleCourriel[] = []
  if (!c.payee) dus.push('payee')
  if ((commande.etat === 'generee' || commande.etat === 'validee') && !c.generee) dus.push('generee')
  if (commande.etat === 'en_ligne' && !c.en_ligne) dus.push('en_ligne')
  return dus
}

export function courrielPayee(_commande: CommandeLivraison) {
  return {
    subject: 'Votre commande de site est payée',
    text: `Bonjour,\n\nNous avons reçu votre paiement de ${PRIX_SITE_TEXTE} pour votre site. TVA non applicable, art. 293 B du CGI.\n\nNous préparons votre site à partir de votre dossier. ${DELAI_TEXTE}\n\nNous vous écrirons dès que l’aperçu sera prêt.\n\nL’équipe Presti`,
  }
}

export function courrielGeneree(_commande: CommandeLivraison) {
  return {
    subject: 'Votre site est prêt pour notre relecture',
    text: 'Bonjour,\n\nVotre site a été généré. Notre équipe vérifie le contenu et les informations de votre dossier avant la mise en ligne, après validation par Presti.\n\nNous vous écrirons dès qu’il sera en ligne.\n\nL’équipe Presti',
  }
}

export function courrielEnLigne(commande: CommandeLivraison, enregistrements: DnsRecord[] = []) {
  let guide: string
  if (commande.domaine_mode === 'existant') {
    guide = `Pour relier ${commande.domaine ?? 'votre domaine'} à votre site, posez ces enregistrements chez votre registrar :\n${enregistrements.map((r) => `- ${r.type} — nom : ${r.name} — valeur : ${r.value}`).join('\n') || 'Répondez à ce message pour recevoir les enregistrements DNS.'}`
  } else if (commande.domaine_mode === 'a_prendre') {
    guide = 'Si vous souhaitez un domaine, réservez-le à votre nom chez le registrar de votre choix (environ 10 € par an), puis répondez-nous avec le nom exact. Presti ne l’achète pas pour vous.'
  } else {
    guide = `Votre adresse est https://prestiapp.fr/site-genere/${commande.id}/`
  }
  return { subject: 'Votre site est en ligne', text: `Bonjour,\n\nVotre site est en ligne, après validation par Presti.\n\n${guide}\n\nL’équipe Presti` }
}

const lireCommande = async (base: Base, id: string): Promise<CommandeLivraison | null> => {
  const { data, error } = await base.from('sites_commandes').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`Lecture de la commande impossible : ${error.message}`)
  return data as CommandeLivraison | null
}

export async function envoyerCourrielsDus(commandeId: string, deps: Dependances = {}): Promise<number> {
  const d = dependances(deps)
  let nombre = 0
  const premiere = await lireCommande(d.base, commandeId)
  if (!premiere) return 0
  for (const cle of courrielsDus(premiere)) {
    const commande = await lireCommande(d.base, commandeId)
    if (!commande || !courrielsDus(commande).includes(cle)) continue
    const date = d.maintenant().toISOString()
    const courriels = { ...(commande.courriels ?? {}), [cle]: date }
    const { data: prises, error } = await d.base.from('sites_commandes').update({ courriels }).eq('id', commandeId).is(`courriels->${cle}`, null).select('id')
    if (error) throw new Error(`Réservation du courriel impossible : ${error.message}`)
    if (!prises?.length) continue
    try {
      const modele = cle === 'payee' ? courrielPayee(commande) : cle === 'generee' ? courrielGeneree(commande) : courrielEnLigne(commande, commande.domaine_mode === 'existant' && commande.domaine ? (await d.statutDomaine(commande.domaine)).records : [])
      const envoi = await d.envoyer({ to: commande.email, ...modele, critique: true })
      if (!envoi.ok) throw new Error(envoi.error ?? 'Envoi refusé')
      nombre++
    } catch (erreur) {
      const actuel = await lireCommande(d.base, commandeId)
      if (actuel?.courriels?.[cle] === date) {
        const remis = { ...actuel.courriels }
        delete remis[cle]
        const { error: eRemise } = await d.base.from('sites_commandes').update({ courriels: remis }).eq('id', commandeId).eq(`courriels->>${cle}`, date)
        if (eRemise) throw new Error(`Libération du courriel impossible : ${eRemise.message}`)
      }
      console.error('[livraison] courriel non envoyé', commandeId, cle, erreur)
    }
  }
  return nombre
}

const jourParis = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Paris', weekday: 'short' })

/** Chaque heure civile du lundi au vendredi compte ; les jours fériés ne sont pas décomptés. */
export function heuresOuvreesEntre(a: Date, b: Date): number {
  if (b <= a) return 0
  let somme = 0
  for (let instant = a.getTime(); instant < b.getTime();) {
    const borne = Math.min(b.getTime(), (Math.floor(instant / 3_600_000) + 1) * 3_600_000)
    const jour = jourParis.format(new Date(instant))
    if (jour !== 'Sat' && jour !== 'Sun') somme += (borne - instant) / 3_600_000
    instant = borne
  }
  return somme
}

export async function commandesEnRetard(deps: Dependances = {}): Promise<Alerte[]> {
  const d = dependances(deps)
  const { data, error } = await d.base.from('sites_commandes').select('*').in('etat', ['payee', 'generee', 'validee']).limit(500)
  if (error) throw new Error(`Lecture des retards impossible : ${error.message}`)
  const alertes: Alerte[] = []
  for (const commande of (data ?? []) as CommandeLivraison[]) {
    const origine = commande.etat === 'payee' ? commande.paye_le : commande.etat === 'generee' ? commande.genere_le : commande.valide_le
    const seuil = commande.etat === 'validee' ? 48 : 24
    if (!origine || (commande.etat === 'payee' && erreursAvantPaiement(commande).length) || heuresOuvreesEntre(new Date(origine), d.maintenant()) <= seuil) continue
    alertes.push({ motif: 'paiement', a: 'entreprise', cle: `retard:${commande.id}:${commande.etat}`, sujet: `Commande de site en retard — ${commande.etat}`, corps: `Commande ${commande.id}, état ${commande.etat} : plus de ${seuil} h ouvrées depuis l’étape précédente. Vérifier le dossier et la livraison.` })
  }
  if (alertes.length) await envoyerAlertes(alertes)
  return alertes
}

// Search Console (026-201) : le plan d'un site en ligne se soumet seul, trois sites au plus par tour, trois essais par site.
// Un site refusé (le domaine ne pointe pas encore chez nous, par exemple) n'est pas une panne du tour : il compte un essai
// dans `verifications`, jamais une erreur du bilan. Sans compte de service, rien ne s'essaie ni ne se compte. Au 3e essai,
// plus d'essai automatique : la ligne « À faire » du Poste (commande en ligne sans search_console_le) et son bouton
// « Plan soumis » restent le repli — aucun motif d'alerte nouveau.
const ESSAIS_SEARCH_CONSOLE = 3
const SITES_SEARCH_CONSOLE_PAR_TOUR = 3
const BUDGET_SEARCH_CONSOLE_MS = 12_000 // la route de livraison a 60 s : on ne commence pas un site passé ce délai
const essaisSearchConsole = (commande: Pick<CommandeLivraison, 'verifications'>): number => Number(commande.verifications?.search_console_essais || 0)

async function soumettrePlansDus(d: ReturnType<typeof dependances>, config: DependancesSearchConsole | undefined, bilan: { erreurs: number }): Promise<void> {
  if (!(config?.env ?? process.env).GSC_COMPTE_SERVICE) return
  const { data, error } = await d.base.from('sites_commandes').select('id, etat, domaine_mode, domaine, search_console_le, verifications, en_ligne_le').eq('etat', 'en_ligne').is('search_console_le', null).order('en_ligne_le', { ascending: false }).limit(50)
  if (error) throw new Error('Lecture des commandes à soumettre impossible')
  const dues = ((data ?? []) as CommandeLivraison[])
    .filter((c) => c.domaine_mode !== 'aucun' && c.domaine && essaisSearchConsole(c) < ESSAIS_SEARCH_CONSOLE)
    .slice(0, SITES_SEARCH_CONSOLE_PAR_TOUR)
  const debut = Date.now()
  for (const commande of dues) {
    if (Date.now() - debut > BUDGET_SEARCH_CONSOLE_MS) break
    // La lecture commune de la pause (lib/agents/pause.ts), juste avant chaque sortie : elle peut tomber en cours de tour.
    if ((await pauseGenerale()).active) break
    const rendu = await soumettreSiteSearchConsole(commande, {
      mettreAJour: async (id, patch) => {
        const { error: ePose } = await d.base.from('sites_commandes').update(patch).eq('id', id)
        if (ePose) throw new Error('Pose de search_console_le impossible')
      },
      ...config,
    })
    if (rendu.ok || rendu.raison === 'sans_compte') continue
    const { error: eEssai } = await d.base.from('sites_commandes')
      .update({ verifications: { ...(commande.verifications ?? {}), search_console_essais: essaisSearchConsole(commande) + 1 } })
      .eq('id', commande.id).eq('etat', 'en_ligne')
    if (eEssai) { bilan.erreurs++; console.error('[livraison] essai Search Console non compté', commande.id) }
  }
}

export async function tourLivraison(deps: Dependances = {}): Promise<{ courriels: number; retards: number; erreurs: number }> {
  const d = dependances(deps)
  const bilan = { courriels: 0, retards: 0, erreurs: 0 }
  const pause = await d.enPause()
  if (process.env.GITHUB_DISPATCH_TOKEN && !pause) {
    try {
      const { data, error } = await d.base.from('sites_commandes').select('*').eq('etat', 'payee').order('paye_le', { ascending: true }).limit(5)
      if (error) throw new Error('Lecture des commandes payées impossible')
      for (const commande of (data ?? []) as CommandeLivraison[]) {
        try { await demanderGeneration(commande as Commande, { base: d.base, maintenant: d.maintenant }) }
        catch (e) { bilan.erreurs++; console.error('[livraison] génération distante', commande.id, e) }
      }
    } catch (e) { bilan.erreurs++; console.error('[livraison] demandes de génération', e) }
  }
  try {
    const { data, error } = await d.base.from('sites_commandes').select('id').in('etat', ['payee', 'generee', 'validee', 'en_ligne']).order('paye_le', { ascending: true }).limit(50)
    if (error) throw new Error(`Lecture des commandes impossible : ${error.message}`)
    for (const commande of data ?? []) {
      try { bilan.courriels += await envoyerCourrielsDus(commande.id, deps) }
      catch (e) { bilan.erreurs++; console.error('[livraison] commande', commande.id, e) }
    }
  } catch (e) { bilan.erreurs++; console.error('[livraison] courriels', e) }
  if (!pause) try { await consommerSortiesUsine({ stockage: d.base.storage, maintenant: d.maintenant }) }
  catch (e) { bilan.erreurs++; console.error('[livraison] sorties usine', e) }
  try {
    const { data, error } = await d.base.from('sites_commandes').select('id, etat, genere_le, valide_le, en_ligne_le').in('etat', ['generee', 'validee', 'en_ligne']).order('modifie_le', { ascending: false }).limit(100)
    if (error) throw new Error('Lecture des commandes livrées impossible')
    let traitees = 0
    const limiteDate = d.maintenant().getTime() - 30 * 24 * 60 * 60 * 1000
    for (const commande of data ?? []) {
      const date = commande.etat === 'generee' ? commande.genere_le : commande.etat === 'validee' ? commande.valide_le : commande.en_ligne_le
      if (!date || new Date(date).getTime() < limiteDate || traitees >= 20) continue
      traitees++
      try { if (await cloreTacheLivraison(commande.id, commande.etat) === 'erreur') bilan.erreurs++ }
      catch { bilan.erreurs++ }
    }
  } catch (e) { bilan.erreurs++; console.error('[livraison] clôture des tâches', e) }
  try {
    if (!pause) bilan.retards = (await commandesEnRetard(deps)).length
  } catch (e) { bilan.erreurs++; console.error('[livraison] retards', e) }
  // Achat public (026-025) : les brouillons sans compte jamais payés s'effacent après 7 jours (minimisation des données).
  try { await purgerBrouillonsPublics({ base: d.base, maintenant: d.maintenant }) }
  catch (e) { bilan.erreurs++; console.error('[livraison] purge des brouillons publics', e) }
  try {
    if (!pause) {
      try {
        const commandes = await retraitsDus({ base: d.base, maintenant: d.maintenant })
        for (const commande of commandes.slice(0, 10)) {
          try { await retirer(commande) }
          catch (e) { bilan.erreurs++; console.error('[livraison] retrait', commande.id, e) }
        }
      } catch (e) { bilan.erreurs++; console.error('[livraison] retraits dus', e) }
      try { await purgerFichiersExpires({ base: d.base, maintenant: d.maintenant }) }
      catch (e) { bilan.erreurs++; console.error('[livraison] fichiers expirés', e) }
    }
  } catch (e) { bilan.erreurs++; console.error('[livraison] pause du retrait', e) }
  try { if (!pause) await soumettrePlansDus(d, deps.searchConsole, bilan) }
  catch (e) { bilan.erreurs++; console.error('[livraison] Search Console', e instanceof Error ? e.message : 'erreur') }
  let tresorerieOk = false
  try { await veilleTresorerie(); tresorerieOk = true }
  catch (e) { bilan.erreurs++; console.error('[livraison] veille trésorerie', e) }
  if (tresorerieOk) await battementTresorier()
  if (bilan.erreurs === 0) await battementLivreur()
  await enregistrerPassage('livraison', bilan, bilan.erreurs === 0)
  return bilan
}
