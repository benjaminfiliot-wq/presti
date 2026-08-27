/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@react-pdf/renderer', 'imapflow'],
  // Force l'inclusion des polices standard de pdfkit (require dynamique non tracé par défaut)
  // sinon la génération PDF échoue en serverless (Vercel).
  outputFileTracingIncludes: {
    '/api/devis/**': [
      './node_modules/pdfkit/js/standard-fonts/**/*',
      './node_modules/pdfkit/js/**/*.afm',
    ],
  },
  // En-têtes de sécurité HTTP (recommandation audit) — anti-clickjacking, anti-sniffing, HSTS, etc.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ]
  },
};
export default nextConfig;
