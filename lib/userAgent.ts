// Lecture du User-Agent, sans bibliothèque : on ne cherche pas l'exhaustivité, juste de
// quoi reconnaître « mon téléphone » de « l'ordinateur du bureau ». Ce qu'on ne sait pas
// lire s'affiche « Appareil inconnu », jamais une valeur devinée.
// Partagé par la liste des sessions (api/securite/sessions) et les appareils de confiance (v7, bloc 2).
export function lireUserAgent(ua: string | null | undefined): { appareil: string; navigateur: string } {
  const s = ua || ''
  let appareil = 'Appareil inconnu'
  if (/iPhone/i.test(s)) appareil = 'iPhone'
  else if (/iPad/i.test(s)) appareil = 'iPad'
  else if (/Android/i.test(s)) appareil = /Mobile/i.test(s) ? 'Téléphone Android' : 'Tablette Android'
  else if (/Windows/i.test(s)) appareil = 'Ordinateur Windows'
  else if (/Macintosh|Mac OS X/i.test(s)) appareil = 'Mac'
  else if (/CrOS/i.test(s)) appareil = 'Chromebook'
  else if (/Linux/i.test(s)) appareil = 'Ordinateur Linux'
  let navigateur = 'Navigateur inconnu'
  if (/Edg\//i.test(s)) navigateur = 'Edge'
  else if (/OPR\//i.test(s)) navigateur = 'Opera'
  else if (/SamsungBrowser/i.test(s)) navigateur = 'Samsung Internet'
  else if (/Firefox\//i.test(s)) navigateur = 'Firefox'
  else if (/Chrome\//i.test(s)) navigateur = 'Chrome'
  else if (/Safari\//i.test(s) && /Version\//i.test(s)) navigateur = 'Safari'
  else if (/Playwright|HeadlessChrome/i.test(s)) navigateur = 'Chrome (test)'
  return { appareil, navigateur }
}
