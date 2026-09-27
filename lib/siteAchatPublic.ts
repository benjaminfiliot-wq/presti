// lib/siteAchatPublic.ts — l'achat du site SANS compte (fiche 026-025, plan §6.4), côté serveur SEULEMENT (service_role).
//
// L'ordre est la règle : un visiteur paie sans compte (/api/site/commander/public) ; le compte n'est créé qu'APRÈS le
// paiement, depuis le webhook, par auth.admin.createUser SANS mot de passe ; le lien de connexion part par Resend
// (lib/email.ts), jamais par l'envoi par défaut de Supabase. On ne garde de generateLink que properties.hashed_token :
// l'action_link de Supabase (qui ouvrirait une session sur le domaine de Supabase) n'est jamais envoyé ni journalisé.
// Rien ici n'emprunte à lib/clientAuth.ts, qui sert les clients d'un artisan : l'acheteur deviendra un artisan.
//
// Les dépendances sont injectables (base, envoi, horloge) : les juges et la tournée de livraison passent les leurs.
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { sendEmail } from '@/lib/email'

export type DependancesAchat = {
  base?: typeof supabaseAdmin
  envoyer?: typeof sendEmail
  maintenant?: () => Date
}

/** Le lien de connexion : l'hôte est fixe (jamais l'origine d'une requête), le jeton est le hachage rendu par generateLink. */
const HOTE_LIEN = 'https://prestiapp.fr'
/** Durée de vie d'un brouillon public jamais payé (minimisation des données : une adresse saisie puis abandonnée). */
export const JOURS_BROUILLON_PUBLIC = 7

/** « Adresse déjà inscrite » n'est pas un échec : l'acheteur a déjà un compte, le lien suffit à l'y conduire. */
function dejaInscrit(e: { code?: string; status?: number; message?: string } | null | undefined): boolean {
  if (!e) return false
  if (e.code === 'email_exists' || e.code === 'user_already_exists') return true
  return /already (been )?registered|already exists/i.test(e.message ?? '')
}

/** Le message à l'acheteur : un seul lien, ni mot de passe, ni SIREN, ni adresse postale. */
function courrielLien(lien: string) {
  return {
    subject: 'Votre site Presti : votre accès',
    text: `Bonjour,

Merci pour votre commande : votre paiement est bien reçu.

Pour ouvrir votre espace Presti et compléter le dossier de votre site, cliquez sur ce lien personnel :
${lien}

Ce lien ne sert qu’une fois et expire vite. S’il ne fonctionne plus, la page de confirmation de votre commande vous permet d’en recevoir un nouveau.

Vous avez demandé que Presti commence la réalisation de votre site avant la fin du délai de rétractation de 14 jours, et reconnu perdre ce droit une fois le site entièrement livré (article L221-28 du Code de la consommation, article 3 ter de nos conditions générales).

Si vous n’êtes pas à l’origine de cette commande, ne cliquez pas et répondez à ce message.

L’équipe Presti`,
  }
}

/**
 * Après le paiement d'un achat public : crée le compte de l'acheteur (sans mot de passe, adresse confirmée — il vient de
 * payer avec), obtient un lien magique, l'envoie par Resend, puis marque lien_envoye_le et lien_envois + 1.
 * Ne fait rien (rend false) si la commande n'est pas payée, pas publique, ou déjà rattachée à un compte.
 * Si l'envoi échoue, l'erreur remonte et RIEN n'est marqué : le webhook répond 500 et Stripe rejoue.
 */
export async function ouvrirCompteAcheteur(commandeId: string, deps: DependancesAchat = {}): Promise<boolean> {
  const base = deps.base ?? supabaseAdmin
  const envoyer = deps.envoyer ?? sendEmail
  const maintenant = deps.maintenant ?? (() => new Date())

  const { data: c, error } = await base.from('sites_commandes').select('id, email, etat, achat_public, artisan_id, lien_envois').eq('id', commandeId).maybeSingle()
  if (error) throw new Error(`lecture de la commande ${commandeId} impossible : ${error.message}`)
  if (!c || c.etat !== 'payee' || c.achat_public !== true || c.artisan_id) return false
  const destinataire = String(c.email ?? '').trim()
  const email = destinataire.toLowerCase()
  if (!email) throw new Error(`commande ${commandeId} payée sans adresse`)

  // Le compte : sans mot de passe (l'acheteur n'en a choisi aucun), adresse confirmée par le paiement.
  const { error: eCompte } = await base.auth.admin.createUser({ email, email_confirm: true })
  if (eCompte && !dejaInscrit(eCompte)) throw new Error(`création du compte impossible : ${eCompte.message}`)

  // Le lien : seul le jeton haché sert ; l'action_link de Supabase ne quitte jamais cette fonction.
  const { data: lien, error: eLien } = await base.auth.admin.generateLink({ type: 'magiclink', email })
  const jeton = lien?.properties?.hashed_token
  if (eLien || !jeton) throw new Error(`lien de connexion impossible : ${eLien?.message ?? 'jeton absent'}`)
  const url = `${HOTE_LIEN}/connexion/lien?th=${encodeURIComponent(jeton)}&commande=${encodeURIComponent(commandeId)}`

  const envoi = await envoyer({ to: destinataire, ...courrielLien(url), critique: true })
  if (!envoi.ok) throw new Error(`envoi du lien de connexion impossible : ${envoi.error ?? 'refusé'}`)

  const le = maintenant().toISOString()
  const { error: eMaj } = await base.from('sites_commandes').update({ lien_envoye_le: le, lien_envois: (Number(c.lien_envois) || 0) + 1, modifie_le: le }).eq('id', commandeId)
  if (eMaj) throw new Error(`marquage du lien impossible : ${eMaj.message}`)
  return true
}

/** Minimisation des données : efface les brouillons publics jamais payés (sans compte) créés il y a plus de 7 jours. */
export async function purgerBrouillonsPublics(deps: DependancesAchat = {}): Promise<number> {
  const base = deps.base ?? supabaseAdmin
  const maintenant = deps.maintenant ?? (() => new Date())
  const limite = new Date(maintenant().getTime() - JOURS_BROUILLON_PUBLIC * 86_400_000).toISOString()
  const { data, error } = await base.from('sites_commandes').delete().eq('etat', 'brouillon').eq('achat_public', true).is('artisan_id', null).lt('cree_le', limite).select('id')
  if (error) throw new Error(`purge des brouillons publics impossible : ${error.message}`)
  return data?.length ?? 0
}
