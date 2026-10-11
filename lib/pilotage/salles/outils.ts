// 026-178 — petites aides pures partagées par les lecteurs de salle : aucune E/S, aucun calcul métier.
export const lignes = (x: unknown): any[] => (Array.isArray(x) ? x : x ? [x] : [])
export const premiere = (x: unknown): any => (Array.isArray(x) ? x[0] ?? null : x ?? null)
export const nombre = (x: unknown): number => (typeof x === 'number' && Number.isFinite(x) ? x : Number.isFinite(Number(x)) ? Number(x) : 0)
