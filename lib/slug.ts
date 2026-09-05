export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, 40)
    // Après la coupe, pas avant : couper à 40 pouvait laisser un tiret en fin, que l'onboarding
    // prolongeait en « --xxxx » — une adresse que le validateur refusait ensuite (audit final, D-1.7).
    .replace(/(^-+|-+$)/g, '')
}

/** Base d'adresse à laquelle l'onboarding ajoute « -xxxx » : 35 caractères au plus, pour rester ≤ 40. */
export function slugBase(input: string, max = 35): string {
  return slugify(input).slice(0, max).replace(/-+$/, '') || 'artisan'
}

export function randomSuffix(n = 4): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  for (let i = 0; i < n; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}
