/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@react-pdf/renderer', 'imapflow'],
  // Médias artisan servis depuis le bucket Supabase Storage (logos, réalisations) → autorisés pour next/image.
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: 'gorcdvmueakcncsmrouo.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
  // Force l'inclusion des polices standard de pdfkit (require dynamique non tracé par défaut)
  // sinon la génération PDF échoue en serverless (Vercel).
  outputFileTracingIncludes: {
    '/api/devis/**': [
      './node_modules/pdfkit/js/standard-fonts/**/*',
      './node_modules/pdfkit/js/**/*.afm',
    ],
  },
  // En-têtes de sécurité HTTP (audit) — anti-clickjacking, anti-sniffing, HSTS, CSP.
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com", // Next inline + GA (optionnel)
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://gorcdvmueakcncsmrouo.supabase.co https://www.google-analytics.com", // médias bucket + data URL (legacy) + GA
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com https://www.google-analytics.com https://*.analytics.google.com",
      "frame-src https://js.stripe.com https://checkout.stripe.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join('; ')
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ]
  },
};
export default nextConfig;
