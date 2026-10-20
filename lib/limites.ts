import crypto from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// Compteurs de limitation ATOMIQUES (audit v4 §3, migration 0049).
//
// Avant : `select count(*)` puis `insert` dans chaque route. En rafale parallèle, toutes
// les requêtes lisaient le même compte et passaient toutes (11 réponses IA + 11 emails
// là où 6 étaient permis). Maintenant : UN appel SQL, `consommer_limite`, qui incrémente
// et décide dans la même instruction — c'est Postgres qui sérialise, pas nous.
//
// Sémantique : `consommerLimite('leads:ip:1.2.3.4', 6, 600)` renvoie true pour les 6
// premiers appels d'un créneau de 10 minutes, false ensuite. Exactement 6, quel que soit
// le parallélisme.
//
// Fail-open assumé, comme les garde-fous qu'il remplace et comme `consumeCredit` : si la
// base ne répond pas (ou si la migration 0049 n'est pas encore appliquée), on ne bloque
// pas un vrai prospect — et on le dit en console.error, fort.
//
// Audit du 20/10 : ce fail-open a un prix. Panne ou migration absente = plus AUCUN plafond, donc des appels IA
// et des e-mails à des tiers sans limite (le coût et la réputation d'envoi, pas la disponibilité, sont alors
// l'enjeu). Les routes qui dépensent de l'IA ou écrivent à un inconnu utilisent `consommerLimiteStricte`
// (fail-closed : false en cas d'erreur) ; `consommerLimite` reste pour tout ce dont le refus ferait plus de mal
// que l'excès (lecture publique, journaux, dédoublonnage d'alertes). `isBanned` (lib/security.ts) reste
// volontairement fail-open : un faux positif y coûterait l'accès à un vrai client.

export async function consommerLimite(cle: string, max: number, fenetreSec: number): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.rpc('consommer_limite', { p_cle: cle, p_max: max, p_fenetre_s: fenetreSec })
    if (error) { console.error('[limites] rpc consommer_limite:', error.message, '— clé', cle, '(fail-open)'); return true }
    return data === true
  } catch (e) {
    console.error('[limites] consommer_limite indisponible (fail-open):', e instanceof Error ? e.message : e)
    return true
  }
}

/** Même contrat que `consommerLimite`, mais FAIL-CLOSED : si la base ne répond pas, la réponse est false (refus). */
export async function consommerLimiteStricte(cle: string, max: number, fenetreSec: number): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.rpc('consommer_limite', { p_cle: cle, p_max: max, p_fenetre_s: fenetreSec })
    if (error) { console.error('[limites] rpc consommer_limite:', error.message, '— clé', cle, '(fail-closed)'); return false }
    return data === true
  } catch (e) {
    console.error('[limites] consommer_limite indisponible (fail-closed):', e instanceof Error ? e.message : e)
    return false
  }
}

/** Clé dérivée d'un email : on ne stocke jamais l'adresse en clair dans la table des compteurs. */
export function cleEmail(prefixe: string, email: string): string {
  return `${prefixe}:${crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex').slice(0, 32)}`
}

/**
 * Le plafond est-il DÉJÀ atteint ? Lecture seule : rien n'est consommé.
 * Sert quand la dépense n'est connue qu'après coup — on vérifie avant d'engager, on décompte
 * une fois la dépense faite. En cas de panne du comptage, on laisse passer (comme `consommerLimite`) :
 * un compteur cassé ne doit pas fermer le service.
 */
export async function limiteAtteinte(cle: string, max: number, fenetreSec: number): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.rpc('limite_atteinte', { p_cle: cle, p_max: max, p_fenetre_s: fenetreSec })
    if (error) { console.error('[limites] rpc limite_atteinte:', error.message, '— clé', cle, '(on laisse passer)'); return false }
    return data === true
  } catch (e) {
    console.error('[limites] limite_atteinte indisponible (on laisse passer):', e instanceof Error ? e.message : e)
    return false
  }
}
