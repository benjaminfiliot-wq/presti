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
};
export default nextConfig;
