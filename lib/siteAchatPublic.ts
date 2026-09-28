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
import { notifierEntreprise, sendEmail } from '@/lib/email'
import { consommerLimite } from '@/lib/limites'

export type DependancesAchat = {
  base?: typeof supabaseAdmin
  envoyer?: typeof sendEmail
  notifier?: typeof notifierEntreprise
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

/** Les états d'une commande payée ou au-delà (ETATS de lib/siteCommande.ts) ; 'brouillon' et 'retiree' ne se rattachent pas. */
const ETATS_RATTACHABLES = ['payee', 'generee', 'validee', 'en_ligne']

/**
 * Motif ILIKE qui contient au moins l'adresse, casse comprise : chaque caractère joker de LIKE ou de PostgREST
 * (% _ * \) devient « un caractère quelconque ». Ce n'est qu'un préfiltre : l'égalité exacte est jugée ensuite, en clair.
 */
const motifLarge = (email: string) => email.replace(/[%_*\\]/g, '_')

/**
 * Rattache au compte `uid` les commandes publiques payées (ou au-delà), encore sans compte, passées avec la MÊME adresse
 * que celle de sa session (sans tenir compte de la casse). Rend les identifiants des commandes rattachées.
 *
 * `emailSession` est l'adresse de la session vérifiée (authArtisan), JAMAIS une adresse venue du corps d'une requête :
 * c'est la session qui prouve l'accès à la boîte, donc le droit sur la commande.
 * - mise à jour CONDITIONNELLE (artisan_id is null) : deux appels simultanés ne rattachent qu'une fois ;
 * - une commande déjà rattachée une fois (rattachee_le), ou dont le compte a été supprimé (compte_supprime_le), n'est
 *   jamais reprise par un autre compte ;
 * - pas encore de profil (ligne artisans absente) : rien, la commande attend la fin de l'inscription ;
 * - compte fondateur : rien (règle de app/api/site/commander/route.ts), et l'entreprise est prévenue (au plus une fois
 *   par jour et par compte) pour décider à la main.
 */
export async function rattacherCommandesParEmail(uid: string, emailSession: string | null | undefined, deps: DependancesAchat = {}): Promise<string[]> {
  const base = deps.base ?? supabaseAdmin
  const notifier = deps.notifier ?? notifierEntreprise
  const maintenant = deps.maintenant ?? (() => new Date())
  const email = String(emailSession ?? '').trim().toLowerCase()
  if (!uid || !email || !email.includes('@')) return []

  const { data: candidates, error } = await base.from('sites_commandes').select('id, email')
    .eq('achat_public', true).is('artisan_id', null).is('rattachee_le', null).is('compte_supprime_le', null)
    .in('etat', ETATS_RATTACHABLES).ilike('email', motifLarge(email))
  if (error) throw new Error(`lecture des commandes à rattacher impossible : ${error.message}`)
  const memeAdresse = (candidates ?? []).filter((c) => String(c.email ?? '').trim().toLowerCase() === email)
  if (!memeAdresse.length) return []

  const { data: artisan, error: eArtisan } = await base.from('artisans').select('id, is_founder').eq('id', uid).maybeSingle()
  if (eArtisan) throw new Error(`lecture du compte ${uid} impossible : ${eArtisan.message}`)
  if (!artisan) return []
  if (artisan.is_founder) {
    if (await consommerLimite(`rattachement:fondateur:${uid}`, 1, 86_400)) {
      const ids = memeAdresse.map((c) => c.id).join(', ')
      const r = await notifier(
        'Commande publique à l’adresse d’un compte fondateur',
        `Une commande de site payée sans compte porte l’adresse d’un compte fondateur (${uid}). Elle n’a PAS été rattachée : un fondateur ne commande pas de site depuis son propre compte (app/api/site/commander/route.ts).\n\nCommande(s) : ${ids}\n\nÀ rattacher ou à rembourser à la main si c’est voulu.`,
      ).catch((e: unknown) => ({ ok: false, error: e instanceof Error ? e.message : String(e) }))
      if (!r.ok) console.error('[siteAchatPublic] notification du rattachement refusé (fondateur) :', r.error ?? 'refusée')
    }
    return []
  }

  const le = maintenant().toISOString()
  const rattachees: string[] = []
  for (const c of memeAdresse) {
    const { data: faites, error: eMaj } = await base.from('sites_commandes')
      .update({ artisan_id: uid, rattachee_le: le, modifie_le: le })
      .eq('id', c.id).eq('achat_public', true).is('artisan_id', null).is('rattachee_le', null)
      .select('id')
    if (eMaj) throw new Error(`rattachement de la commande ${c.id} impossible : ${eMaj.message}`)
    for (const f of faites ?? []) rattachees.push(String(f.id))
  }
  return rattachees
}
