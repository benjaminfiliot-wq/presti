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

type CleCourriel = 'payee' | 'generee' | 'en_ligne'
type CommandeLivraison = Omit<Commande, 'etat'> & { etat: Commande['etat'] | 'retiree'; courriels?: Partial<Record<CleCourriel, string>>; retiree_le?: string | null }
type Base = typeof supabaseAdmin
type Dependances = {
  base?: Base
  envoyer?: typeof sendEmail
  statutDomaine?: typeof getStatus
  maintenant?: () => Date
  enPause?: () => Promise<boolean>
}

const dependances = (d: Dependances) => ({
  base: d.base ?? supabaseAdmin,
  envoyer: d.envoyer ?? sendEmail,
  statutDomaine: d.statutDomaine ?? getStatus,
  maintenant: d.maintenant ?? (() => new Date()),
  enPause: d.enPause ?? (async () => false),
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

export async function tourLivraison(deps: Dependances = {}): Promise<{ courriels: number; retards: number; erreurs: number }> {
  const d = dependances(deps)
  const bilan = { courriels: 0, retards: 0, erreurs: 0 }
  const enPause = d.enPause
  if (process.env.GITHUB_DISPATCH_TOKEN && !(await enPause())) {
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
  try {
    if (!(await d.enPause())) bilan.retards = (await commandesEnRetard(deps)).length
  } catch (e) { bilan.erreurs++; console.error('[livraison] retards', e) }
  // Achat public (026-025) : les brouillons sans compte jamais payés s'effacent après 7 jours (minimisation des données).
  try { await purgerBrouillonsPublics({ base: d.base, maintenant: d.maintenant }) }
  catch (e) { bilan.erreurs++; console.error('[livraison] purge des brouillons publics', e) }
  try {
    if (!(await d.enPause())) {
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
  try { await veilleTresorerie() }
  catch (e) { bilan.erreurs++; console.error('[livraison] veille trésorerie', e) }
  await enregistrerPassage('livraison', bilan, bilan.erreurs === 0)
  return bilan
}
