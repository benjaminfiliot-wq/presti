export type SurfaceDomaine = 'site' | 'site_genere' | 'contact'

export function surfaceDuDomaine(p: { siteActif: boolean | null | undefined; commandeEnLigne: boolean }): SurfaceDomaine {
  if (p.commandeEnLigne) return 'site_genere'
  return p.siteActif === true ? 'site' : 'contact'
}

export function libelleDomaineActif(surface: SurfaceDomaine): string {
  return surface === 'contact'
    ? 'Actif — votre page de contact est servie sur ce domaine'
    : 'Actif — votre site est servi sur ce domaine'
}
