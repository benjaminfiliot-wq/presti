// Smoke de la coque Android en CI (prompt v9 §7) — joué par le job `smoke` de .github/workflows/android.yml dans un
// émulateur (reactivecircus/android-emulator-runner). Personne ici n'a de SDK Android : c'est la seule preuve
// AUTOMATIQUE que l'APK ouvre la console et que le pont natif est branché — sans attendre le téléphone de Benj.
//
//  1. installe l'APK de debug, lance l'app, vérifie qu'elle a le focus, capture l'écran (artefact) ;
//  2. lit le logcat : aucune exception fatale de fr.prestiapp.app ;
//  3. par le protocole DevTools de la WebView (debug seulement : webContentsDebuggingEnabled) :
//     – la page chargée est bien la console (qg.prestiapp.fr → /login sans session), pas la page de secours ;
//     – `Capacitor.isNativePlatform()` est vrai et chaque plugin natif attendu est disponible côté natif ;
//     – la console a ENREGISTRÉ des plugins (`Capacitor.Plugins` non vide : revue du 07/09 — c'était la cause du
//       scan mort) ; le lecteur de codes-barres et le trousseau répondent vraiment depuis le natif.
//  Sortie : mobile/smoke/ (captures, logcat, rapport.json) ; code 1 si une vérification échoue.
//
// Usage (CI) : node mobile/scripts/smoke-android.mjs presti-debug-apk/app-debug.apk
import fs from 'node:fs'
import { execSync } from 'node:child_process'

const APK = process.argv[2] || 'presti-debug-apk/app-debug.apk'
const PAQUET = 'fr.prestiapp.app'
const OUT = 'mobile/smoke'
const PLUGINS = ['App', 'Preferences', 'SplashScreen', 'StatusBar', 'PushNotifications', 'Camera', 'BarcodeScanner', 'Share', 'Filesystem', 'Haptics', 'Network', 'Browser', 'Keyboard', 'BiometricAuthNative', 'SecureStoragePlugin']
fs.mkdirSync(OUT, { recursive: true })
const rapport = { ok: 0, ko: 0, lignes: [] }
const T = (nom, cond, detail = '') => { rapport[cond ? 'ok' : 'ko']++; rapport.lignes.push({ nom, ok: !!cond, detail }); console.log(`  ${cond ? '✅' : '❌'} ${nom}${!cond && detail ? ` — ${detail}` : ''}`) }
const sh = (c, opt = {}) => { try { return execSync(c, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opt }).trim() } catch (e) { return `ERREUR ${e.stderr || e.message}` } }
const dormir = (ms) => new Promise((r) => setTimeout(r, ms))

console.log(`\nsmoke-android — ${APK}\n`)
console.log('1. Installation et lancement')
sh('adb wait-for-device')
const inst = sh(`adb install -r "${APK}"`)
T('APK installé', /Success/.test(inst), inst.slice(0, 200))
sh('adb logcat -c')
const start = sh(`adb shell am start -W -n ${PAQUET}/.MainActivity`)
T('activité lancée', /Status: ok/.test(start), start.slice(0, 200))
await dormir(25000) // écran de lancement + chargement de la console par le réseau de l'émulateur
sh(`adb exec-out screencap -p > ${OUT}/ecran-1.png`)
const focus = sh('adb shell dumpsys window | grep -E "mCurrentFocus|mFocusedApp"')
T("l'app a le focus", focus.includes(PAQUET), focus.slice(0, 200))

console.log('\n2. Journal système')
const logcat = sh('adb logcat -d')
fs.writeFileSync(`${OUT}/logcat.txt`, logcat)
const fatales = logcat.split('\n').filter((l) => /FATAL EXCEPTION|AndroidRuntime.*Process: fr\.prestiapp/.test(l))
T('aucune exception fatale', fatales.length === 0, fatales.slice(0, 3).join(' | '))
T('Capacitor a démarré (logcat)', /Capacitor/.test(logcat))
const chargement = logcat.split('\n').filter((l) => /Capacitor.*(Unable to|Failed|ERR_)/i.test(l))
T('aucune erreur de chargement Capacitor', chargement.length === 0, chargement.slice(0, 3).join(' | '))

console.log('\n3. La WebView, par DevTools')
let pid = null
for (let i = 0; i < 10 && !pid; i++) { pid = (sh('adb shell cat /proc/net/unix').match(/webview_devtools_remote_(\d+)/) || [])[1] || null; if (!pid) await dormir(3000) }
T('socket DevTools de la WebView trouvée', !!pid)
let page = null
if (pid) {
  sh(`adb forward tcp:9222 localabstract:webview_devtools_remote_${pid}`)
  for (let i = 0; i < 10 && !page; i++) {
    const pages = await fetch('http://127.0.0.1:9222/json').then((r) => r.json()).catch(() => [])
    page = pages.find((p) => p.type === 'page' && p.webSocketDebuggerUrl) || null
    if (!page) await dormir(3000)
  }
}
T('page de la WebView joignable', !!page, page ? page.url : '')

/** Runtime.evaluate par WebSocket (Node 22 : WebSocket global), promesses attendues, valeur rendue par valeur. */
const evaluer = (expression) => new Promise((resolve) => {
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  const fin = (v) => { try { ws.close() } catch { /* déjà fermée */ } resolve(v) }
  const garde = setTimeout(() => fin({ erreur: 'délai' }), 20000)
  ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }))
  ws.onmessage = (m) => { const d = JSON.parse(String(m.data)); if (d.id !== 1) return; clearTimeout(garde); if (d.result?.exceptionDetails) fin({ erreur: d.result.exceptionDetails.exception?.description || d.result.exceptionDetails.text }); else fin({ valeur: d.result?.result?.value }) }
  ws.onerror = () => { clearTimeout(garde); fin({ erreur: 'websocket' }) }
})
const lire = async (expr) => { const r = await evaluer(expr); if (r.erreur) return { erreur: r.erreur }; try { return JSON.parse(r.valeur) } catch { return { brut: r.valeur } } }

if (page) {
  const etat = await lire(`JSON.stringify({ url: location.href, titre: document.title, natif: !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()), plateforme: window.Capacitor && Capacitor.getPlatform ? Capacitor.getPlatform() : null, secours: !!document.querySelector('[data-presti-hors-ligne]'), connexion: !!document.querySelector('input[type=password]'), enregistres: Object.keys((window.Capacitor && Capacitor.Plugins) || {}) })`)
  rapport.etat = etat
  T('la console est chargée (qg.prestiapp.fr, pas la page de secours)', /^https:\/\/qg\.prestiapp\.fr\//.test(etat.url || '') && !etat.secours, etat.url || etat.erreur)
  T('sans session : la page de connexion (mot de passe)', /\/login/.test(etat.url || '') && etat.connexion === true, etat.url || etat.erreur)
  T('Capacitor.isNativePlatform() = true, plateforme android', etat.natif === true && etat.plateforme === 'android', JSON.stringify({ natif: etat.natif, plateforme: etat.plateforme }))
  T('la console a enregistré des plugins (Capacitor.Plugins non vide : App, SplashScreen…)', Array.isArray(etat.enregistres) && etat.enregistres.includes('App') && etat.enregistres.includes('SplashScreen'), (etat.enregistres || []).join(' ') || etat.erreur)
  const dispo = await lire(`JSON.stringify(${JSON.stringify(PLUGINS)}.map((n) => [n, Capacitor.isPluginAvailable(n)]))`)
  const manquants = Array.isArray(dispo) ? dispo.filter(([, ok]) => !ok).map(([n]) => n) : PLUGINS
  T(`les ${PLUGINS.length} plugins natifs attendus sont disponibles côté natif`, manquants.length === 0, 'manquants : ' + manquants.join(' '))
  const lecteur = await lire(`(async () => { const p = Capacitor.registerPlugin('BarcodeScanner'); const r = await p.isGoogleBarcodeScannerModuleAvailable(); return JSON.stringify(r) })()`)
  T('BarcodeScanner répond depuis le natif (isGoogleBarcodeScannerModuleAvailable)', lecteur && typeof lecteur.available === 'boolean', JSON.stringify(lecteur))
  const trousseau = await lire(`(async () => { const p = Capacitor.registerPlugin('SecureStoragePlugin'); const r = await p.keys(); return JSON.stringify(r) })()`)
  T('SecureStoragePlugin répond depuis le natif (keys)', trousseau && Array.isArray(trousseau.value), JSON.stringify(trousseau))
  const bio = await lire(`(async () => { const p = Capacitor.registerPlugin('BiometricAuthNative'); const r = await p.checkBiometry(); return JSON.stringify(r) })()`)
  T('BiometricAuthNative répond depuis le natif (checkBiometry)', bio && typeof bio.isAvailable === 'boolean', JSON.stringify(bio))
  const reseau = await lire(`(async () => { const p = Capacitor.registerPlugin('Network'); const r = await p.getStatus(); return JSON.stringify(r) })()`)
  T('Network répond depuis le natif (connecté)', reseau && reseau.connected === true, JSON.stringify(reseau))
  // white-label : rien du site public dans la coque ; l'écran de connexion est celui de Presti
  const marque = await lire(`JSON.stringify({ presti: /Presti/.test(document.body.innerText), site: !!document.querySelector('a[href^="/site/"], a[href^="/p/"]') })`)
  T("l'écran est celui de Presti, sans lien vers une surface d'artisan", marque.presti === true && marque.site === false, JSON.stringify(marque))
}
sh(`adb exec-out screencap -p > ${OUT}/ecran-2.png`)
fs.writeFileSync(`${OUT}/rapport.json`, JSON.stringify(rapport, null, 2))
console.log(`\n${rapport.ko ? '❌' : '✅'} smoke-android : ${rapport.ok}/${rapport.ok + rapport.ko}`)
process.exitCode = rapport.ko ? 1 : 0
