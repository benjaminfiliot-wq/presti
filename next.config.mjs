/** @type {import('next').NextConfig} */
const nextConfig = {
  // Dossier de build paramétrable : permet une compilation de vérification (PRESTI_DIST=.next-prod)
  // sans entrer en collision avec un serveur de dev qui écrit dans .next au même moment.
  ...(process.env.PRESTI_DIST ? { distDir: process.env.PRESTI_DIST } : {}),
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
    // Directives communes (hors frame-ancestors, qui varie selon la route).
    const cspBase = [
      "default-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https://gorcdvmueakcncsmrouo.supabase.co https://www.google-analytics.com", // médias bucket + data URL (legacy) + GA
      // Le joker `*.supabase.co` autorisait n'importe quel projet Supabase du monde :
      // c'est un canal d'exfiltration tout prêt pour un script injecté. On épingle le nôtre.
      "connect-src 'self' https://gorcdvmueakcncsmrouo.supabase.co wss://gorcdvmueakcncsmrouo.supabase.co https://api.stripe.com https://www.google-analytics.com https://*.analytics.google.com",
      "frame-src 'self' https://js.stripe.com https://checkout.stripe.com", // 'self' = aperçu du site dans la console (« Ma page »)
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      // Gestionnaires d'événements EN ATTRIBUT (`<img onerror=…>`, `<a onclick=…>`) : interdits.
      // C'est la moitié utile que `'unsafe-inline'` rendait sinon libre — et la forme d'XSS la
      // plus courante, parce qu'elle passe par un attribut là où une balise <script> serait
      // filtrée. React ne pose jamais de gestionnaire en attribut (il attache des écouteurs),
      // donc rien de légitime ne casse. `script-src-attr` retombe sinon sur `script-src`, donc
      // sans cette ligne explicite l'attribut restait autorisé.
      "script-src-attr 'none'",
    ]
    const common = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    ]
    // script-src : la console reste stricte ; le site/plateforme autorisent EN PLUS cdnjs
    // (three.js chargé en différé pour la signature 3D « matière », niveau Signature).
    // 'unsafe-eval' UNIQUEMENT en développement : Next y compile les modules avec eval (source
    // maps). Sans ça, aucun JavaScript client ne s'exécute en local — les pages restent non
    // hydratées et tout test navigateur local ment. En production, jamais.
    //
    // POURQUOI 'unsafe-inline' EST TOUJOURS LÀ, ET POURQUOI LE NONCE A ÉTÉ ÉCARTÉ (audit final, A/1).
    // Un nonce est fabriqué À CHAQUE REQUÊTE : il ne peut donc pas figurer dans un HTML
    // pré-calculé au build. Or presque toute la surface publique de Presti EST pré-calculée —
    // la landing, /faq, les pages légales, la 404, `/site/[slug]/infos-legales` (`revalidate =
    // 3600`), `/site/[slug]/[...reste]` et `/p/[slug]/[...reste]` (`force-static`). Poser un
    // nonce dans le middleware retirerait 'unsafe-inline' pour tout le monde tout en laissant
    // ces pages servir des scripts d'hydratation SANS nonce : elles seraient bloquées par la
    // CSP, donc mortes (HTML visible, plus aucune interaction). Les rendre dynamiques pour
    // sauver le nonce, c'est payer un rendu serveur par visite sur les pages les plus vues,
    // pour un risque déjà tenu ailleurs (React échappe, JSON-LD échappé). Décision : on garde
    // 'unsafe-inline' pour les BALISES <script>, et on ferme la porte des ATTRIBUTS
    // (`script-src-attr 'none'`, plus bas) — c'est le vecteur réellement exploitable.
    const scriptStrict = "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com" + (process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '')
    // cdnjs n'est plus autorisé : il ne servait qu'au cube 3D, supprimé (v5 §10 H1).
    const scriptEmbeddable = scriptStrict
    // Site vitrine (/site) et plateforme (/l) : embarquables par la console (aperçu « Ma page »),
    // mais jamais par un site tiers → SAMEORIGIN / frame-ancestors 'self' (anti-clickjacking préservé).
    const embeddableCsp = [scriptEmbeddable, ...cspBase, "frame-ancestors 'self'", 'upgrade-insecure-requests'].join('; ')
    const embeddable = [
      { key: 'Content-Security-Policy', value: embeddableCsp },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      ...common,
    ]
    // Tout le reste (console, auth, paiement…) : aucun embarquement.
    const strictCsp = [scriptStrict, ...cspBase, "frame-ancestors 'none'", 'upgrade-insecure-requests'].join('; ')
    const strict = [
      { key: 'Content-Security-Policy', value: strictCsp },
      { key: 'X-Frame-Options', value: 'DENY' },
      ...common,
    ]
    return [
      { source: '/site/:path*', headers: embeddable },
      { source: '/p/:path*', headers: embeddable },
      // Négatif look-ahead : exclut /site/ et /p/ du bloc strict pour éviter les doublons d'en-têtes.
      { source: '/((?!site/|p/).*)', headers: strict },
    ]
  },
  // La plateforme est passée de /l/[slug] à /p/[slug] (v4 §A1). Redirection PERMANENTE :
  // aucun lien déjà distribué par un artisan ne doit casser.
  async redirects() {
    return [
      { source: '/l/:slug', destination: '/p/:slug', permanent: true },
      { source: '/l/:slug/:path*', destination: '/p/:slug/:path*', permanent: true },
    ]
  },
};
export default nextConfig;
