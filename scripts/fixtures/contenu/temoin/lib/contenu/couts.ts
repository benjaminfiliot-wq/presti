// scripts/fixtures/contenu/temoin/lib/contenu/couts.ts — TÉMOIN de `lib/contenu/couts.ts` (026-218, partie
// « couts »). Un champ absent reste `connu:false` (« non mesuré »), jamais un zéro inventé. Un appel Laya (jev) ne se
// mélange jamais avec un coût facturé ou des jetons : il est compté à part.
export type LigneCoutBrute = { agent: string; moteur: string; montant?: number | null; jetons_entree?: number; jetons_sortie?: number }
export type LigneCout = LigneCoutBrute & { connu: boolean }

export function normaliserCout(brut: LigneCoutBrute): LigneCout {
  if (brut.montant === undefined || brut.montant === null) return { ...brut, montant: null, connu: false }
  return { ...brut, connu: true }
}

export type Agrege = { agent: string; moteur: string; connuEur: number; inconnu: number; appelsLaya: number }
export function agregerParModele(lignes: LigneCoutBrute[]): Record<string, Agrege> {
  const par: Record<string, Agrege> = {}
  for (const brut of lignes) {
    const l = normaliserCout(brut)
    const cle = `${l.agent}:${l.moteur}`
    par[cle] ??= { agent: l.agent, moteur: l.moteur, connuEur: 0, inconnu: 0, appelsLaya: 0 }
    if (l.moteur === 'laya') par[cle].appelsLaya++
    else if (l.connu) par[cle].connuEur += l.montant || 0
    else par[cle].inconnu++
  }
  return par
}
