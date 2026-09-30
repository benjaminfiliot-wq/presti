// scripts/fixtures/026-pilotage/k/juge-doublure-next.mjs — la doublure de `next/server` de CL-16 (fiche 026-170, écrite par le
// juge) : juste assez de NextResponse pour que proxy.ts s'exécute sous Node et rende ce qu'il décide (`next` ou `rewrite`).
export const NextResponse = {
  next: () => ({ type: 'next' }),
  rewrite: (url) => ({ type: 'rewrite', pathname: url.pathname }),
  redirect: (url) => ({ type: 'redirect', pathname: String(url?.pathname ?? url) }),
}
export class NextRequest {}
