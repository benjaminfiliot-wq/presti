import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendEmail, notifierEntreprise } from '@/lib/email'
import { removeDomain } from '@/lib/vercelDomains'
import { creerJetonDossier } from '@/lib/siteDossier'

export const ETAT_RETIRE = 'retiree'
export const LIBELLE_RETIRE = 'Retiré — dossier envoyé'

type Base = typeof supabaseAdmin
type CommandeRetrait = { id: string; email: string; etat: string; domaine?: string | null; compte_supprime_le?: string | null }
type Dependances = {
  base?: Base
  envoyer?: typeof sendEmail
  detacherDomaine?: typeof removeDomain
  creerJeton?: typeof creerJetonDossier
  notifier?: typeof notifierEntreprise
  maintenant?: () => Date
}

const dependances = (deps: Dependances) => ({
  base: deps.base ?? supabaseAdmin,
  envoyer: deps.envoyer ?? sendEmail,
  detacherDomaine: deps.detacherDomaine ?? removeDomain,
  creerJeton: deps.creerJeton ?? creerJetonDossier,
  notifier: deps.notifier ?? notifierEntreprise,
  maintenant: deps.maintenant ?? (() => new Date()),
})

const dateLisible = (date: Date) => new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date)

/** Même jour douze mois plus tard, ou le dernier jour de février. */
export function dateRetrait(compteSupprimeLe: string | Date): Date {
  const origine = new Date(compteSupprimeLe)
  const annee = origine.getUTCFullYear() + 1
  const mois = origine.getUTCMonth()
  const jour = Math.min(origine.getUTCDate(), new Date(Date.UTC(annee, mois + 1, 0)).getUTCDate())
  return new Date(Date.UTC(annee, mois, jour, origine.getUTCHours(), origine.getUTCMinutes(), origine.getUTCSeconds(), origine.getUTCMilliseconds()))
}

export async function commandesEnLigneDe(artisanId: string, deps: Dependances = {}): Promise<string[]> {
  const { data, error } = await dependances(deps).base.from('sites_commandes').select('id').eq('artisan_id', artisanId).eq('etat', 'en_ligne')
  if (error) throw error
  return (data ?? []).map((commande) => commande.id)
}

export async function marquerSuppression(ids: string[], deps: Dependances = {}): Promise<void> {
  if (!ids.length) return
  const d = dependances(deps)
  const maintenant = d.maintenant().toISOString()
  const { data, error } = await d.base.from('sites_commandes').select('id, email').in('id', ids).eq('etat', 'en_ligne').is('compte_supprime_le', null)
  if (error) throw error
  for (const commande of data ?? []) {
    const { data: marquees, error: ecriture } = await d.base.from('sites_commandes').update({ compte_supprime_le: maintenant })
      .eq('id', commande.id).eq('etat', 'en_ligne').is('compte_supprime_le', null).select('id')
    if (ecriture) throw ecriture
    if (!marquees?.length) continue
    const resultat = await d.envoyer({
      to: commande.email,
      subject: 'Votre site après la suppression de votre compte',
      text: `Bonjour,\n\nVotre compte Presti a été supprimé. Votre site commandé reste en ligne douze mois, jusqu’au ${dateLisible(dateRetrait(maintenant))}. À l’issue de ce délai, ou avant sur simple demande en répondant à ce message, vous recevrez le dossier complet de votre site. Passé ce délai, le site sera retiré.\n\nL’équipe Presti`,
      critique: true,
    })
    if (!resultat.ok) console.error('[retrait-site] avis de suppression non envoyé', commande.id, resultat.error)
  }
}

export async function retraitsDus(deps: Dependances = {}): Promise<CommandeRetrait[]> {
  const d = dependances(deps)
  const { data, error } = await d.base.from('sites_commandes').select('id, email, etat, domaine, compte_supprime_le')
    .eq('etat', 'en_ligne').not('compte_supprime_le', 'is', null).order('compte_supprime_le', { ascending: true }).limit(500)
  if (error) throw error
  return ((data ?? []) as CommandeRetrait[]).filter((commande) => commande.compte_supprime_le && dateRetrait(commande.compte_supprime_le).getTime() <= d.maintenant().getTime())
}

export async function retirer(commande: CommandeRetrait, deps: Dependances = {}): Promise<void> {
  const d = dependances(deps)
  const { data: actuelle, error: lecture } = await d.base.from('sites_commandes').select('id, email, etat, domaine').eq('id', commande.id).maybeSingle()
  if (lecture) throw lecture
  if (!actuelle || actuelle.etat !== 'en_ligne') return

  const jeton = await d.creerJeton(commande.id, 90)
  const date = d.maintenant()
  const expiration = new Date(date.getTime() + 90 * 86_400_000)
  const envoi = await d.envoyer({
    to: actuelle.email,
    subject: 'Dossier de votre site et retrait',
    text: `Bonjour,\n\nVotre site arrive au terme des douze mois suivant la suppression de votre compte. Voici le lien pour télécharger le dossier complet de votre site :\nhttps://prestiapp.fr/api/site-dossier/${commande.id}?j=${encodeURIComponent(jeton)}\n\nCe lien expire le ${dateLisible(expiration)}. Votre site est retiré.\n\nL’équipe Presti`,
    critique: true,
  })
  if (!envoi.ok) throw new Error(`Envoi du dossier impossible : ${envoi.error ?? 'refusé'}`)

  const { data: retirees, error: ecriture } = await d.base.from('sites_commandes').update({
    etat: ETAT_RETIRE, retiree_le: date.toISOString(), dossier_envoye_le: date.toISOString(),
  }).eq('id', commande.id).eq('etat', 'en_ligne').select('id')
  if (ecriture) throw ecriture
  if (!retirees?.length) return

  if (actuelle.domaine) {
    try {
      if (!(await d.detacherDomaine(actuelle.domaine))) throw new Error('Détachement refusé')
    } catch (erreur) {
      await d.notifier('Détachement du domaine en échec', `Commande ${commande.id}, domaine ${actuelle.domaine} : ${erreur instanceof Error ? erreur.message : erreur}`)
    }
  }
  await d.notifier('Site retiré — dossier envoyé', `Commande ${commande.id} retirée ; dossier envoyé à l’artisan.`)
}
