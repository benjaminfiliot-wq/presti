// lib/sms/expediteur.ts — l'expéditeur est le NOM DE L'ARTISAN, validé (white-label : jamais « Presti », jamais le numéro court du fournisseur).
//
// Un identifiant alphanumérique d'expéditeur tient en 11 caractères au plus, lettres et chiffres sans accent (règle générale des
// opérateurs ; les règles françaises d'alias restent à vérifier auprès du fournisseur — plan §11, ⚠ R5 S8).

export type ExpediteurValide = { ok: true; valeur: string } | { ok: false; raison: 'vide' | 'marque_presti' | 'trop_court' | 'numerique' }

const sansAccent = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/œ/gi, 'oe').replace(/æ/gi, 'ae')

export function validerExpediteur(nomArtisan: unknown): ExpediteurValide {
  if (typeof nomArtisan !== 'string' || nomArtisan.trim() === '') return { ok: false, raison: 'vide' }
  const nu = sansAccent(nomArtisan).replace(/[^A-Za-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
  // « Presti » dans le nom, même collé, espacé ou à moitié accentué, ferme la porte (l'artisan n'est jamais présenté sous la marque de l'éditeur).
  if (/p\s*r\s*e\s*s\s*t\s*i/i.test(nu)) return { ok: false, raison: 'marque_presti' }
  const valeur = nu.slice(0, 11).trim()
  if (valeur.length < 3) return { ok: false, raison: 'trop_court' }
  if (/^[0-9 ]+$/.test(valeur)) return { ok: false, raison: 'numerique' }
  return { ok: true, valeur }
}
