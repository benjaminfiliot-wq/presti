export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Diagnostic temporaire : montre les NOMS des variables d'env présentes (jamais les valeurs).
export async function GET() {
  const keys = Object.keys(process.env).filter((k) => /STRIPE|SUPABASE|ANTHROPIC|RESEND|PAYPAL|IMAP/i.test(k)).sort()
  return new Response(JSON.stringify({
    hasStripeSecret: !!process.env.STRIPE_SECRET_KEY,
    stripeSecretLen: (process.env.STRIPE_SECRET_KEY || '').length,
    relevantKeys: keys,
  }, null, 2), { headers: { 'Content-Type': 'application/json' } })
}
