import { timingSafeEqual } from 'node:crypto'

// Audit du 20/10 : `auth !== \`Bearer ${secret}\`` s'arrête au premier octet différent — le temps de réponse
// renseigne, très faiblement, sur la longueur du préfixe juste. Ce helper compare en temps constant
// (`timingSafeEqual` exige des tampons de même longueur : une longueur différente est refusée d'emblée, la longueur
// d'un secret d'environnement n'étant pas ce qu'on protège ici).

/** Vrai seulement si `fourni` et `attendu` sont deux chaînes identiques. Faux pour tout le reste (null, vide compris). */
export function secretEgal(fourni: string | null | undefined, attendu: string | null | undefined): boolean {
  if (typeof fourni !== 'string' || typeof attendu !== 'string' || attendu === '') return false
  const a = Buffer.from(fourni, 'utf8')
  const b = Buffer.from(attendu, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/** L'en-tête `Authorization` vaut-il exactement `Bearer <secret>` ? Le remplaçant direct des comparaisons `!==` des routes à secret. */
export function bearerEgal(entete: string | null | undefined, secret: string | null | undefined): boolean {
  return typeof secret === 'string' && secret !== '' && secretEgal(entete, `Bearer ${secret}`)
}
