// Connexion à l'espace artisan, pour les tests (v4 §15).
//
// Pourquoi ce fichier : chaque test réécrivait sa propre séquence de connexion, et elle
// échouait par intermittence — un test qui rate une fois sur cinq est un test auquel
// plus personne ne croit, et qu'on finit par ignorer quand il a raison.
//
// Trois causes réelles d'échec, traitées ici :
//  • la page de connexion n'est pas encore hydratée quand on remplit les champs ;
//  • Supabase limite le débit d'authentification quand les tests enchaînent les comptes ;
//  • le démarrage à froid d'une fonction Vercel dépasse le délai par défaut.
// D'où : on attend le champ, on laisse plus de temps, on réessaie une fois — et surtout
// on REMONTE le message d'erreur affiché plutôt qu'un « timeout » qui n'apprend rien.
//
// Utilisé par les tests qui enchaînent PLUSIEURS connexions (c'est là que la limitation
// de débit frappe). Les tests qui n'ouvrent qu'une session gardent leur séquence : elle
// marche, et la remuer sans raison serait un risque pour rien.

/**
 * Ouvre un contexte de navigateur PROPRE et s'y connecte.
 * Un contexte par compte : le localStorage est partagé entre les pages d'un contexte,
 * donc deux connexions successives dans le même contexte écraseraient la première.
 */
export async function connexion(nav, { email, motDePasse, base = 'https://prestiapp.fr', viewport }) {
  let derniereErreur = null

  for (let essai = 1; essai <= 2; essai++) {
    const ctx = await nav.newContext(viewport ? { viewport } : {})
    const page = await ctx.newPage()
    try {
      await page.goto(`${base}/login`, { waitUntil: 'networkidle', timeout: 45000 })
      await page.waitForSelector('input[type="email"]', { timeout: 20000 })
      await page.fill('input[type="email"]', email)
      await page.fill('input[type="password"]', motDePasse)
      await page.getByRole('button', { name: 'Se connecter' }).click()
      await page.waitForURL(/outils|dashboard|profil|onboarding/, { timeout: 45000 })
      return { ctx, page }
    } catch (e) {
      // Le message affiché à l'écran vaut cent fois mieux qu'un « timeout ».
      const affiche = await page.locator('.msg, [role="alert"], form p').first().innerText().catch(() => '')
      derniereErreur = new Error(
        `connexion impossible (essai ${essai}/2)${affiche ? ` — message affiché : « ${affiche.trim()} »` : ''} · url ${page.url()} · ${e.message.split('\n')[0]}`)
      await ctx.close()
      // Un deuxième essai après une pause : c'est exactement ce que fait la limitation
      // de débit de Supabase quand les tests enchaînent les créations de comptes.
      if (essai === 1) await new Promise((s) => setTimeout(s, 4000))
    }
  }
  throw derniereErreur
}

/** Appelle une route de l'API avec le vrai jeton de la session ouverte dans cette page. */
export function appelApi(page, base = 'https://prestiapp.fr') {
  return async (chemin, init = {}) => page.evaluate(async ([url, opts]) => {
    const k = Object.keys(localStorage).find((x) => x.includes('auth-token'))
    const t = k ? JSON.parse(localStorage.getItem(k))?.access_token : null
    const r = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}`, ...(opts.headers || {}) } })
    return { statut: r.status, corps: await r.json().catch(() => null) }
  }, [`${base}${chemin}`, init])
}
