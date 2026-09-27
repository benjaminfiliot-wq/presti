import { servirDossier } from '@/lib/siteDossier'

export async function GET(req: Request, ctx: { params: Promise<{ commande: string }> }): Promise<Response> {
  const { commande } = await ctx.params
  return servirDossier(req, commande)
}
