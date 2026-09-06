import { supabase } from '@/lib/supabaseClient'
import type { Notifications } from '@/lib/notificationsTypes'

// Ce que chaque section de /parametres reçoit (sprint J-1 §6).

export type Artisan = {
  id: string
  nom: string | null
  email: string | null
  slug: string | null
  domaine: string | null
  domaine_verifie: boolean | null
  logo_url: string | null
  plan: string | null
  is_founder: boolean | null
  credits: number | null
  credits_reset_le: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  notifications: Notifications | null
  suppression_demandee_le: string | null
  site_active: boolean | null
  plateforme_active: boolean | null
  siret: string | null; tva_num: string | null; iban: string | null; forme_juridique: string | null
  adresse: string | null; code_postal: string | null; ville: string | null
  assurance_nom: string | null; assurance_contrat: string | null; assurance_zone: string | null; assurance_activites: string | null
  mediateur_nom: string | null; mediateur_url: string | null
  mention_tva_base: string | null
}

export type Message = { type: 'ok' | 'err'; text: string } | null

export type SectionProps = {
  a: Artisan
  /** Applique une modification locale (après un enregistrement réussi). */
  patch: (p: Partial<Artisan>) => void
  signaler: (m: Message) => void
}

/** Le jeton courant, pour les routes serveur. */
export const jeton = async () => (await supabase.auth.getSession()).data.session?.access_token

/**
 * La route a exigé le second facteur (lib/authArtisan : `code: 'mfa_requise'`) : l'artisan a
 * activé la 2FA mais cette session n'a que le mot de passe. On l'envoie taper son code, et
 * on le ramène ici ensuite. Les routes qui ne relaient pas le code renvoient le message.
 */
export function mfaRequise(status: number, data: { error?: string; code?: string }): boolean {
  return status === 401 && (data.code === 'mfa_requise' || /double authentification requise/i.test(data.error ?? ''))
}
export function versSecondFacteur() {
  const retour = window.location.pathname + window.location.search
  window.location.assign(`/login?mfa=1&retour=${encodeURIComponent(retour)}`)
}

/**
 * La route a refusé une session qui n'a pas passé le code email (v7 bloc 2 : `code_requis`) —
 * une session d'avant la mise en place, ou obtenue sans le code. On la ferme et l'artisan se
 * reconnecte : un code lui sera envoyé.
 */
export function codeRequis(status: number, data: { error?: string; code?: string }): boolean {
  return status === 401 && data.code === 'code_requis'
}
export async function versVerification() {
  const retour = window.location.pathname + window.location.search
  await supabase.auth.signOut().catch(() => {})
  window.location.assign(`/login?verif=1&retour=${encodeURIComponent(retour)}`)
}

/** Appel authentifié d'une route de Presti. */
export async function api<T = Record<string, unknown>>(chemin: string, init: RequestInit = {}): Promise<{ ok: boolean; status: number; data: T & { error?: string } }> {
  const t = await jeton()
  const r = await fetch(chemin, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}`, ...(init.headers || {}) } })
  const data = (await r.json().catch(() => ({}))) as T & { error?: string; code?: string }
  if (mfaRequise(r.status, data)) versSecondFacteur()
  else if (codeRequis(r.status, data)) versVerification()
  return { ok: r.ok, status: r.status, data }
}

export const dateFr = (iso: string | null | undefined, heure = false) =>
  iso ? new Date(iso).toLocaleString('fr-FR', heure ? { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'long', year: 'numeric' }) : ''
