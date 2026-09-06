import type { CapacitorConfig } from '@capacitor/cli'

// La coque native Presti (prompt v9 §4.1) : une WebView qui charge la console DÉPLOYÉE. Le Next.js est en
// SSR (routes API, auth, Supabase) — pas d'export statique embarqué. Une mise à jour web est une mise à
// jour de l'app sans passer par les stores ; la coque, elle, ne change qu'avec les plugins.
//
// Prod : rien ici ne dépend de l'environnement. Pour tester une prévisualisation Vercel ou un serveur local :
//   PRESTI_MOBILE_URL=https://presti-git-xxx.vercel.app/dashboard PRESTI_MOBILE_DEBUG=1 npx cap sync android
// (jamais committé : ce sont des variables de la machine qui compile).
//
// White-label : l'app est la console de l'artisan, point. `allowNavigation` ne couvre que nos hôtes ; tout lien
// vers un autre hôte (site d'un artisan sur son domaine, Stripe, fournisseurs) s'ouvre dans le navigateur.
const url = process.env.PRESTI_MOBILE_URL || 'https://qg.prestiapp.fr/dashboard'
const debug = !!process.env.PRESTI_MOBILE_DEBUG

const config: CapacitorConfig = {
  appId: 'fr.prestiapp.app',
  appName: 'Presti',
  webDir: 'www', // uniquement la page de secours hors-ligne : l'app charge `server.url`
  server: {
    url,
    cleartext: false,
    allowNavigation: ['qg.prestiapp.fr', 'prestiapp.fr', ...(debug ? ['*.vercel.app', 'localhost', '10.0.2.2'] : [])],
    errorPath: 'hors-ligne.html', // servie par la coque quand la console ne répond pas (réseau coupé)
  },
  ios: { contentInset: 'automatic', scheme: 'Presti', limitsNavigationsToAppBoundDomains: true },
  android: { allowMixedContent: false, captureInput: true, webContentsDebuggingEnabled: debug },
  plugins: {
    SplashScreen: { launchAutoHide: true, launchShowDuration: 4000, launchFadeOutDuration: 200, backgroundColor: '#0A0C11', androidScaleType: 'CENTER_CROP', showSpinner: false },
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
    Keyboard: { resize: 'body' },
    StatusBar: { style: 'DARK', backgroundColor: '#0A0C11', overlaysWebView: false },
  },
}

export default config
