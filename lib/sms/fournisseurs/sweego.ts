// lib/sms/fournisseurs/sweego.ts — Sweego, le fournisseur par défaut du plan §11 (choix de Benj encore à confirmer). AUCUN TEST NE L'APPELLE.
//
// Fermé à triple tour tant que Benj n'a pas ouvert un compte, approuvé le prix d'un segment et donné son « go » :
//  1. `FORME_VERIFIEE = false` : l'adresse et la forme du corps ci-dessous sont PROVISOIRES, relevées de mémoire, non vérifiées contre la
//     documentation (questions au support, R5 S8). Tant qu'elle est `false`, ce fournisseur refuse d'émettre, même avec une clé ;
//  2. la clé vient de l'environnement à l'appel (`SWEEGO_API_KEY`), jamais d'un fichier ; absente → refus ;
//  3. l'adaptateur (`envoyer.ts`) ne l'atteint qu'en mode « reel », drapeau levé, coût approuvé.
// Le `fetch` est INJECTÉ : le module n'en appelle aucun à l'import et ne touche à aucun global.
import type { Fournisseur, MessageFournisseur, ReponseFournisseur } from '../contrat'

export const FORME_VERIFIEE = false
export const URL_API_PROVISOIRE = 'https://api.sweego.io/send'
const DELAI_MS = 8000

type Fetch = (url: string, init: { method: string; headers: Record<string, string>; body: string; signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

export function creerFournisseurSweego(options: { fetch: Fetch; cle?: string | undefined }): Fournisseur {
  return {
    nom: 'sweego',
    async envoyer(message: MessageFournisseur): Promise<ReponseFournisseur> {
      if (!FORME_VERIFIEE) return { etat: 'refuse', raison: 'forme_non_verifiee' }
      const cle = options.cle?.trim()
      if (!cle) return { etat: 'refuse', raison: 'cle_absente' }
      const arret = new AbortController()
      const minuteur = setTimeout(() => arret.abort(), DELAI_MS)
      try {
        const r = await options.fetch(URL_API_PROVISOIRE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Api-Key': cle },
          body: JSON.stringify({
            channel: 'sms', provider: 'sweego', campaign_type: 'transac',
            recipients: [{ num: message.destinataire }], message_txt: message.texte,
            from: message.expediteur, campaign_id: message.cleIdempotence,
          }),
          signal: arret.signal,
        })
        if (r.status >= 400 && r.status < 500) return { etat: 'refuse', raison: `http_${r.status}` }
        if (!r.ok) return { etat: 'incertain', raison: `http_${r.status}` }
        const corps = (await r.json()) as { swg_uuid?: unknown } | null
        const id = corps && typeof corps === 'object' ? corps.swg_uuid : undefined
        return typeof id === 'string' && id ? { etat: 'accepte', idFournisseur: id } : { etat: 'incertain', raison: 'reponse_illisible' }
      } catch {
        return { etat: 'incertain', raison: 'exception_ou_delai' } // le SMS est peut-être parti : jamais renvoyé
      } finally {
        clearTimeout(minuteur)
      }
    },
  }
}
