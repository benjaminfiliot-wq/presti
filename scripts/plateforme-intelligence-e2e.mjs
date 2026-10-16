// Vérif B2-2 : l'écran « Ma plateforme → Intelligence » règle bien la configuration serveur.
import { chromium } from 'playwright'
import fs from 'fs'
import { codeEmailSiDemande } from './lib/connexion-test.mjs'
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
// Les aides partagées (connexion-test, etc.) lisent `process.env`, pas cet objet : sans cette
// ligne, leurs URL commencent par « undefined ». On ne remplace jamais une variable déjà posée.
for (const [cle, valeur] of Object.entries(env)) if (!process.env[cle]) process.env[cle] = valeur

const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY
const APP = process.argv[2] || 'https://prestiapp.fr'
const OUT = 'C:/Users/benja/AppData/Local/Temp/claude/C--Users-benja-Documents-ofm/f2774700-2996-4ee8-bfc0-5b67f39c3350/scratchpad'
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const fails = []
const ok = (c, m) => { console.log((c ? 'PASS' : 'FAIL') + ' — ' + m); if (!c) fails.push(m) }

// Le compte de test doit pouvoir etre PURGE : `purger_compte_test` n'accepte que le domaine
// @presti-test.invalid. Ces suites creaient des comptes en @x.fr, que la purge refusait — une
// execution interrompue laissait donc une ligne `artisans` en production, comptee comme un
// client. C'est exactement le compte que zero-demo-e2e a signale le 08/09.
const st = Date.now(), slug = `in-${st}`, email = `in.${st}@presti-test.invalid`, pw = 'Test123456!Aa9'
const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password: pw, email_confirm: true }) })).json()
await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
  id: u.id, email, nom: 'Atelier Vasseur', metier: 'Menuisier', slug, plan: 'business', plateforme_active: true, reponse_auto: true,
}) })
console.log('seed', slug)

const browser = await chromium.launch()
const p = await browser.newPage({ viewport: { width: 1280, height: 1100 } })
try {
  await p.goto(`${APP}/login`, { waitUntil: 'load' })
  await p.fill('input[type=email]', email); await p.fill('input[type=password]', pw)
  await p.getByRole('button', { name: /Se connecter/i }).click(); await codeEmailSiDemande(p, email); await p.waitForTimeout(3500)
  // `/plateforme` ouvre sur Conversations : l'écran Intelligence est le volet « reglages ». Taper
  // l'URL nue faisait attendre à cette suite un sélecteur qui n'était sur aucune page affichée.
  await p.goto(`${APP}/plateforme?volet=reglages`, { waitUntil: 'load' })
  await p.waitForSelector('.pcfg-modes', { timeout: 15000 })

  ok(await p.locator('.pcfg-mode').count() === 3, 'les 3 modes de réponse sont proposés')
  // Sans configuration, le mode est « Assistée », et c'est VOULU : depuis le v7 (bloc 1a),
  // `artisans.reponse_auto` n'est plus jamais lu, et un compte neuf ne laisse rien partir tout seul
  // tant que l'artisan n'a pas choisi. Cette assertion attendait « Automatique » — un héritage
  // d'avant cette règle : elle demandait au produit d'être MOINS prudent qu'il ne l'est (08/09).
  ok(await p.locator('.pcfg-mode.on b').innerText() === 'Assistée', 'sans config : mode « Assistée » — rien ne part sans l’artisan')

  // Et ce que l'écran montre doit être ce que le SERVEUR applique : c'est la phrase imprimée
  // au-dessus des boutons (« tout est appliqué côté serveur »). On le vérifie en base plutôt que
  // de croire l'écran sur parole — c'est le seul moyen que cette assertion puisse rougir.
  const [cfgAvant] = await (await rest(`plateforme_config?artisan_id=eq.${u.id}&select=mode_reponse`)).json()
  ok((cfgAvant?.mode_reponse ?? 'assistee') === 'assistee',
    `et le serveur applique la même chose (${cfgAvant?.mode_reponse ?? 'aucune ligne, donc assistee'})`)

  // L'adresse publique n'est pas sur cet écran : elle est dans « Apparence », sous « Voir comme un
  // client ». L'assertion visait `.prof-link`, qui vit dans /profil — elle ne pouvait pas passer ici.
  await p.goto(`${APP}/plateforme?volet=apparence`, { waitUntil: 'load' })
  // Le volet charge son état avant de connaître le slug : on attend le lien plutôt que de le
  // compter tout de suite, sinon on mesure la vitesse du réseau et pas la présence du lien.
  const lienPublic = p.locator(`a[href="/p/${slug}"]`)
  await lienPublic.first().waitFor({ timeout: 15000 }).catch(() => {})
  ok(await lienPublic.count() > 0, 'l’adresse publique est accessible depuis Ma plateforme')
  await p.goto(`${APP}/plateforme?volet=reglages`, { waitUntil: 'load' }); await p.waitForSelector('.pcfg-modes', { timeout: 15000 })
  await p.screenshot({ path: `${OUT}/b22-intelligence.png`, fullPage: true }); console.log('shot intelligence')

  // Régler : mode assistée + ton direct + plage horaire + plafond
  await p.locator('.pcfg-mode', { hasText: 'Assistée' }).click()
  await p.locator('.pcfg-seg button', { hasText: 'Direct' }).first().click()
  // La plage horaire, c'est la case « Répondre 24h/24 ». Elle était visée par un index — « la
  // première case de la page » — qui désigne en réalité la MISE EN PAUSE depuis que l'écran a été
  // réorganisé : la suite décochait autre chose que ce qu'elle croyait, puis vérifiait un champ
  // qu'elle n'avait pas touché. Un sélecteur par libellé désigne ce que l'artisan, lui, vise.
  await p.locator('label.prof-toggle', { hasText: 'Répondre' }).locator('input[type=checkbox]').uncheck()
  await p.waitForTimeout(300)
  // Le devis automatique n'est plus réglé ici : il a déménagé dans le volet « Automatisations »,
  // sous forme de case à cocher. La suite cliquait « Jamais » sur un bouton qui n'existe plus.
  const champMots = p.locator('input[placeholder*="urgence"]')
  await champMots.fill('urgence, fuite, gaz, dégât des eaux, sinistre')
  await p.getByRole('button', { name: /^Enregistrer$/ }).click()
  // La confirmation porte la classe `adr-msg`, pas `msg` — le sélecteur ne pouvait pas la voir.
  // On l'attend PAR SON TEXTE : l'écran porte deux `adr-msg` (celui du mode, celui du formulaire),
  // et un index les aurait confondus dès que l'un des deux s'efface.
  const confirmation = p.locator('.adr-msg', { hasText: /enregistr/i })
  await confirmation.first().waitFor({ timeout: 12000 })
  ok(await confirmation.count() > 0, 'enregistrement confirmé')
  await p.waitForTimeout(1200)

  const [row] = await (await rest(`plateforme_config?artisan_id=eq.${u.id}&select=*`)).json()
  ok(row?.mode_reponse === 'assistee', `mode persisté (${row?.mode_reponse})`)
  ok(row?.ton === 'direct', `ton persisté (${row?.ton})`)
  ok(row?.auto_24_7 === false, `plage horaire activée (auto_24_7=${row?.auto_24_7})`)
  ok(row?.devis_auto === 'brouillon', `devis auto reste à sa valeur par défaut, il se règle ailleurs (${row?.devis_auto})`)
  ok(Array.isArray(row?.escalade_mots) && row.escalade_mots.includes('sinistre'), `mots d'escalade persistés (${(row?.escalade_mots || []).length} mots)`)

  // Rechargement : l'écran relit bien la config
  await p.reload({ waitUntil: 'load' }); await p.waitForSelector('.pcfg-modes', { timeout: 15000 })
  ok(await p.locator('.pcfg-mode.on b').innerText() === 'Assistée', 'après rechargement, le mode enregistré est repris')
} catch (e) { ok(false, 'exception: ' + (e?.message || e)) } finally {
  await browser.close(); await rest('rpc/purger_compte_test', { method: 'POST', body: JSON.stringify({ p_id: u.id }) })
  await admin(`users/${u.id}`, { method: 'DELETE' })
  console.log('nettoyé —', fails.length ? `❌ ${fails.length} FAIL` : '✅ TOUT PASSE')
  process.exit(fails.length ? 1 : 0)
}
