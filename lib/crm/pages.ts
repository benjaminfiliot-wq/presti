// CRM — la lecture PAR PAGES d'une table. Module pur (aucun import) : rejoué par scripts/crm-qa.mjs, utilisé par lib/crm/serveur.ts.

const PAGE = 1000
// Les lignes restent « any » comme avec le client non typé : chaque appelant les type à sa façon (DossiersCrm, ClientCarnet…).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Page = { data: any[] | null; error: { code?: string; message: string } | null }
/** Lit une table PAR PAGES jusqu'à `plafond` lignes ; la première erreur arrête tout (jamais une lecture à moitié présentée comme complète). */
export async function lirePages(lire: (de: number, a: number) => PromiseLike<Page>, plafond: number): Promise<Page> {
  const tout: NonNullable<Page['data']> = []
  for (let de = 0; de < plafond; de += PAGE) {
    const r = await lire(de, Math.min(de + PAGE, plafond) - 1)
    if (r.error) return { data: null, error: r.error }
    tout.push(...(r.data ?? []))
    if ((r.data?.length ?? 0) < Math.min(PAGE, plafond - de)) break
  }
  return { data: tout, error: null }
}
