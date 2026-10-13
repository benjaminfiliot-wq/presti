// lib/crm/empreinte.ts — SERVEUR SEULEMENT : l'identifiant public d'un client du CRM (l'adresse de sa fiche, la colonne
// crm_notes.client_cle). Audit d'attaque du 12/10 : l'ancien sha-256 à préfixe FIXE se recalculait depuis n'importe quelle
// adresse e-mail devinée (« ce client est-il chez cet artisan ? »). C'est maintenant un HMAC-SHA-256 :
//   • clé : PRESTI_SECRET_CRM s'il est posé, sinon dérivée de la clé de service (même motif que lib/connexion.ts) ;
//   • message : l'artisan ET la clé de regroupement — le même client chez deux artisans a deux identifiants.
// Compatibilité : crm_notes était VIDE en production quand ce calcul a changé (lu le 13/10) ; aucune note n'est orpheline.
// Attention : changer le secret (ou la clé de service sans PRESTI_SECRET_CRM) change tous les identifiants — les notes
// client existantes ne retrouveraient plus leur fiche, et la purge les traiterait comme orphelines. Poser
// PRESTI_SECRET_CRM une fois pour toutes le découple de la clé de service.
import { createHmac } from 'node:crypto'

function secret(): Buffer {
  const explicite = process.env.PRESTI_SECRET_CRM
  if (explicite && explicite.length >= 32) return Buffer.from(explicite, 'utf8')
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!service) throw new Error('crm : aucun secret serveur (PRESTI_SECRET_CRM ou SUPABASE_SERVICE_ROLE_KEY) pour l’empreinte client')
  return createHmac('sha256', service).update('presti:crm-client:v2').digest()
}

/** L'empreinte (64 hex) d'une clé de regroupement, pour UN artisan. */
export function empreinteClient(artisanId: string, cle: string): string {
  return createHmac('sha256', secret()).update(`presti-crm-client:${artisanId}:${cle}`).digest('hex')
}

/** La fonction `idDe` de regrouperClients (lib/crm/clients.ts) pour un artisan. */
export const idClientPour = (artisanId: string) => (cle: string): string => empreinteClient(artisanId, cle)
