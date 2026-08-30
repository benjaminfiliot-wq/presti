import Script from 'next/script'

// Google Analytics 4 — inerte tant que NEXT_PUBLIC_GA_ID n'est pas défini (Vercel).
// Renseigne NEXT_PUBLIC_GA_ID = "G-XXXXXXXXXX" pour l'activer.
export default function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_ID
  if (!id) return null
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${id}');
      `}</Script>
    </>
  )
}
