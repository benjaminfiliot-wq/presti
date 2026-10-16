// Vérif §9 G2 — persona, apparence avancée, aperçu, frise « Où en est ma demande ».
//
//  1. style résolu : sans réglage, la page n'émet AUCUNE variable avancée (octets identiques
//     avec un réglage explicitement égal au défaut) ;
//  2. verrou d'offre : Essentiel → 403 sur l'apparence avancée, mais garde thème + accent ;
//  3. accent illisible → corrigé côté serveur (renvoyé dans `corrections`) ;
//  4. aperçu `?apercu=1&style=…` : noindex + style appliqué ; sans `apercu`, rien n'est appliqué ;
//  5. Studio : enregistrement, colonne figée côté navigateur (déclencheur 0053), rendu réel ;
//  6. frise : lead `nouveau` → 1 étape, devis `envoye` → 3, `accepte` → 4, jamais 5-6 sans donnée ;
//  7. ton : des `style_exemples` au tutoiement changent réellement la réponse (1 appel IA).
//
// Usage : node scripts/persona-e2e.mjs [https://prestiapp.fr | http://localhost:3115]
// Les vérifications qui exigent les colonnes de la migration 0053 sont SAUTÉES (SKIP, pas FAIL)
// tant qu'elle n'est pas appliquée ; elles se rabattent, quand elle existe, sur la route de test
// `/api/test-persona` de la copie isolée (jamais dans le dépôt).
import fs from 'fs'
import { verifierSessionTest } from './lib/connexion-test.mjs'
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
// Les aides partagees (connexion-test, etc.) lisent `process.env`, pas cet objet : sans cette
// ligne, leurs URL commencent par « undefined » — la suite ne tournait que lancee par
// `tout-verifier`, jamais seule, et l'echec ne disait pas pourquoi. On ne remplace jamais une
// variable deja posee.
for (const [cle, valeur] of Object.entries(env)) if (!process.env[cle]) process.env[cle] = valeur

const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const APP = process.argv[2] || 'http://localhost:3115'
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const fails = [], skips = []
const ok = (c, m) => { console.log((c ? 'PASS' : 'FAIL') + ' — ' + m); if (!c) fails.push(m) }
const skip = (m) => { console.log('SKIP — ' + m); skips.push(m) }
const b64url = (o) => Buffer.from(JSON.stringify(o), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const extraireMain = (html) => (html.match(/<main[^>]*class="plat plat-app"[^>]*>/) || [''])[0]
// Contraste WCAG local (même formule que lib/contrast.ts) pour juger la correction sans importer du TS.
const lum = (hex) => { const n = parseInt(hex.slice(1), 16); const c = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * c((n >> 16) & 255) + 0.7152 * c((n >> 8) & 255) + 0.0722 * c(n & 255) }
const contraste = (a, b) => { const [h, l] = lum(a) > lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)]; return (h + 0.05) / (l + 0.05) }

// Le compte de test doit pouvoir etre PURGE : `purger_compte_test` n'accepte que le domaine
// @presti-test.invalid. Ces suites creaient des comptes en @x.fr, que la purge refusait — une
// execution interrompue laissait donc une ligne `artisans` en production, comptee comme un
// client. C'est exactement le compte que zero-demo-e2e a signale le 08/09.
const st = Date.now(), slug = `pe-${st}`, email = `pe.${st}@presti-test.invalid`, pwd = 'Test123456!Aa9'
const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password: pwd, email_confirm: true }) })).json()
if (!u?.id) { console.error('création utilisateur impossible', u); process.exit(1) }
await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
  id: u.id, email, nom: 'Atelier Vasseur', metier: 'Menuisier', slug, plan: 'essentiel', theme: 'atelier', accent: '#D97757',
  plateforme_active: true, reponse_auto: true, is_founder: true,
}) })
const session = await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pwd }) })).json()
await verifierSessionTest(session.access_token)
const jwt = session.access_token
const api = (p, o = {}) => fetch(`${APP}${p}`, { ...o, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}`, ...(o.headers || {}) } })
const page = async (q = '') => extraireMain(await (await fetch(`${APP}/p/${slug}${q}`)).text())
const helper = async (body) => { const r = await fetch(`${APP}/api/test-persona`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return r.ok ? r.json() : null }

// La migration 0053 est-elle appliquée ? (colonnes `apparence` / `style_exemples`)
const migr = (await rest('plateforme_config?select=apparence,style_exemples&limit=1')).ok
if (!migr) console.log('ℹ migration 0053 non appliquée : les vérifications en base sont sautées ou passent par la route de test')

try {
  // ── 1) Non-régression par construction
  const main0 = await page()
  ok(!!main0, 'la page /p/<slug> répond (main.plat trouvé)')
  ok(main0 && !/--prad|--pfd|--pfb|--pgap|--pbg|--pc2|data-fond|data-schema|data-composeur/.test(main0), 'sans réglage : aucune variable avancée n’est émise')
  if (migr) {
    await rest('plateforme_config?on_conflict=artisan_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ artisan_id: u.id, apparence: { densite: 'normale', composeur: 'classique', schema: 'theme', rayon: 16, couple: null } }) })
    const main1 = await page()
    ok(main1 === main0, 'réglages explicitement égaux au défaut → octets identiques de <main>')
    await rest('plateforme_config?on_conflict=artisan_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ artisan_id: u.id, apparence: {} }) })
  } else {
    const h = await helper({ action: 'style', apparence: { densite: 'normale', composeur: 'classique', schema: 'theme', rayon: 16, couple: null, accueil_titre: '' }, theme: 'atelier' })
    if (h) ok(Object.keys(h.css).length === 0 && Object.keys(h.data).length === 0, 'style résolu (route de test) : réglages égaux au défaut → rien émis')
    else skip('octets identiques avec une ligne apparence (migration 0053 absente, pas de route de test)')
  }

  // ── 2) Verrou d'offre — Essentiel
  const r1 = await api('/api/plateforme/apparence', { method: 'POST', body: JSON.stringify({ apparence: { couple: 'chantier' } }) })
  const d1 = await r1.json().catch(() => ({}))
  ok(r1.status === 403 && /Studio/.test(d1.error || ''), `Essentiel : apparence avancée → 403 (${r1.status} « ${d1.error} »)`)
  const r2 = await api('/api/plateforme/apparence', { method: 'POST', body: JSON.stringify({ amorces: ['Un devis pour une terrasse'] }) })
  ok(r2.status === 403, `Essentiel : amorces → 403 (${r2.status})`)
  const r3 = await api('/api/plateforme/apparence', { method: 'POST', body: JSON.stringify({ theme: 'bleu', accent: '#1E6FA8' }) })
  const d3 = await r3.json().catch(() => ({}))
  const art3 = await (await rest(`artisans?id=eq.${u.id}&select=theme,accent`)).json()
  ok(r3.status === 200 && art3?.[0]?.theme === 'bleu' && art3?.[0]?.accent === '#1E6FA8', `Essentiel garde thème + accent (${r3.status}, ${art3?.[0]?.theme}/${art3?.[0]?.accent})`)
  ok(!Object.keys(d3.corrections || {}).length, 'accent lisible : aucune correction')

  // ── 3) Accent illisible → corrigé
  const r4 = await api('/api/plateforme/apparence', { method: 'POST', body: JSON.stringify({ theme: 'atelier', accent: '#EDE7DC' }) })
  const d4 = await r4.json().catch(() => ({}))
  const corr = d4.corrections?.accent
  ok(r4.status === 200 && !!corr && corr !== '#EDE7DC' && contraste(corr, '#ECE6DC') >= 3, `accent #EDE7DC illisible sur Atelier → corrigé en ${corr} (${corr ? contraste(corr, '#ECE6DC').toFixed(1) : '?'}:1)`)
  const art4 = await (await rest(`artisans?id=eq.${u.id}&select=accent`)).json()
  ok(art4?.[0]?.accent === corr, 'la couleur enregistrée est la couleur corrigée')
  await api('/api/plateforme/apparence', { method: 'POST', body: JSON.stringify({ accent: '#D97757' }) })

  // ── 4) Aperçu : style appliqué UNIQUEMENT avec ?apercu=1, page noindex
  const styleAp = b64url({ theme: 'nuit', accent: '#E8B93B', apparence: { rayon: 4, couple: 'epure', composeur: 'flottant' }, nom_assistant: 'Léa' })
  const htmlAp = await (await fetch(`${APP}/p/${slug}?apercu=1&style=${styleAp}`)).text()
  const mainAp = extraireMain(htmlAp)
  ok(/<meta name="robots" content="noindex/.test(htmlAp), 'aperçu : robots noindex')
  ok(/--prad:4px/.test(mainAp) && /data-theme="nuit"/.test(mainAp) && /data-composeur="flottant"/.test(mainAp) && /data-apercu="1"/.test(mainAp), 'aperçu : style de la query appliqué (rayon, thème, composeur)')
  ok(/Léa/.test(htmlAp) && /Aperçu — vos clients écriront ici/.test(htmlAp), 'aperçu : nom d’assistant de la query affiché + bandeau « Aperçu »')
  const mainSans = await page(`?style=${styleAp}`)
  ok(mainSans && !/--prad:4px/.test(mainSans) && !/data-theme="nuit"/.test(mainSans), 'sans ?apercu=1 : la query est ignorée')
  const mainMauvais = await page(`?apercu=1&style=${encodeURIComponent('%%%pas-du-base64')}`)
  ok(mainMauvais.replace(' data-apercu="1"', '') === main0, `aperçu avec un style illisible → page inchangée (hors marqueur d’aperçu)${mainMauvais.replace(' data-apercu="1"', '') === main0 ? '' : `
   attendu ${main0}
   obtenu  ${mainMauvais}`}`)

  // ── 5) Studio : enregistrement réel, colonne figée, rendu
  await rest(`artisans?id=eq.${u.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ plan: 'studio' }) })
  const r5 = await api('/api/plateforme/apparence', { method: 'POST', body: JSON.stringify({ apparence: { couple: 'chantier', rayon: 4, accent2: '#F3E9DD', densite: 'compacte' }, amorces: ['Un devis pour une terrasse', ''] , message_accueil: 'Dites-nous tout.' }) })
  const d5 = await r5.json().catch(() => ({}))
  if (migr) {
    ok(r5.status === 200, `Studio : apparence avancée enregistrée (${r5.status} ${d5.error || ''})`)
    ok(!!d5.corrections?.accent2 && contraste(d5.corrections.accent2, '#ECE6DC') >= 4.5, `couleur secondaire trop pâle → corrigée en ${d5.corrections?.accent2}`)
    const g = await (await api('/api/plateforme/apparence')).json()
    ok(g.apparence?.couple === 'chantier' && g.apparence?.rayon === 4 && g.apparence?.densite === 'compacte' && !('composeur' in g.apparence), 'GET : seuls les écarts au défaut sont stockés')
    ok(Array.isArray(g.amorces) && g.amorces.length === 1 && g.message_accueil === 'Dites-nous tout.', 'amorces (vides retirées) + sous-titre enregistrés')
    const main5 = await page()
    ok(/--prad:4px/.test(main5) && /--pfd:/.test(main5) && /--pgap/.test(main5), 'rendu réel : variables émises pour ce qui est réglé')
    const html5 = await (await fetch(`${APP}/p/${slug}`)).text()
    ok(/Un devis pour une terrasse/.test(html5) && /Dites-nous tout\./.test(html5), 'rendu réel : amorces et sous-titre de l’artisan affichés')
    // Colonne figée : un jeton d'artisan ne peut pas écrire `apparence` directement dans PostgREST.
    const vol = await fetch(`${SB}/rest/v1/plateforme_config?artisan_id=eq.${u.id}`, { method: 'PATCH', headers: { apikey: ANON, Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify({ apparence: { couple: 'solide' }, amorces: ['pirate'] }) })
    const apres = await (await rest(`plateforme_config?artisan_id=eq.${u.id}&select=apparence,amorces`)).json()
    ok(apres?.[0]?.apparence?.couple === 'chantier' && apres?.[0]?.amorces?.[0] !== 'pirate', `colonnes figées côté navigateur (PATCH direct ${vol.status}, apparence intacte)`)
    // Retour au défaut → rendu identique à la page d'origine (rien d'émis).
    await api('/api/plateforme/apparence', { method: 'POST', body: JSON.stringify({ apparence: {}, amorces: [], message_accueil: '' }) })
    ok((await page()) === main0, 'tout remettre par défaut → <main> identique à l’origine')
  } else {
    skip(`Studio : enregistrement de l’apparence (migration 0053 absente, statut ${r5.status})`)
  }

  // ── 6) Frise « Où en est ma demande » — états réels seulement
  const lead = await (await fetch(`${APP}/api/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, message: 'Bonjour, un escalier en chêne serait possible ?', variant: 'B', deferContact: true }) })).json()
  const token = lead.token
  ok(!!token, 'demande créée (lead nouveau)')
  const suivi = async () => (await (await fetch(`${APP}/api/conversation?token=${token}`)).json())
  const leadRow = (await (await rest(`leads?token=eq.${token}&select=id,statut`)).json())?.[0]
  // La réponse automatique du premier contact passe le lead en `repondu` : on repart de `nouveau`
  // pour vérifier chaque marche, puis on remet `repondu`.
  await rest(`leads?id=eq.${leadRow.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ statut: 'nouveau' }) })
  const s1 = await suivi()
  ok(s1.statut === 'nouveau' && s1.suivi?.etape === 1 && s1.suivi?.etapes?.length === 6, `lead nouveau → étape 1/6 (statut=${s1.statut}, etape=${s1.suivi?.etape})`)
  await rest(`leads?id=eq.${leadRow.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ statut: leadRow.statut || 'repondu' }) })
  const s2 = await suivi()
  ok(s2.suivi?.etape === 2, `lead ${leadRow.statut} (l’assistant a répondu) → étape 2 (etape=${s2.suivi?.etape})`)
  const dv = await (await rest('devis', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ artisan_id: u.id, lead_id: leadRow.id, numero: 'D-TEST', objet: 'Escalier chêne', statut: 'envoye', total_ttc: 1200 }) })).json()
  const s3 = await suivi()
  ok(s3.suivi?.etape === 3 && s3.suivi?.preuve === 'devis_envoye', `devis envoyé → étape 3 (etape=${s3.suivi?.etape}, preuve=${s3.suivi?.preuve})`)
  await rest(`devis?id=eq.${dv[0].id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ statut: 'accepte', accepte_le: new Date().toISOString() }) })
  const s4 = await suivi()
  ok(s4.suivi?.etape === 4 && s4.suivi?.preuve === 'devis_accepte', `devis accepté → étape 4 (etape=${s4.suivi?.etape})`)
  ok(s4.suivi?.etape < 5, 'jamais « planifié » ni « terminé » sans donnée qui les porte')
  await rest(`leads?id=eq.${leadRow.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ statut: 'perdu' }) })
  const s5 = await suivi()
  ok(s5.suivi?.classee === true && s5.suivi?.etape === 4, 'lead perdu → « demande classée », étapes atteintes conservées')
  await rest(`leads?id=eq.${leadRow.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ statut: 'nouveau' }) })

  // ── 7) Le TON change vraiment (1 appel IA) — tutoiement par exemples
  const exemples = ['Salut ! Merci pour ton message, je regarde ça et je te rappelle dans la journée.', 'Pas de souci, envoie-moi une photo de ton escalier et je te dis ce qui est possible.', 'Ok je passe jeudi matin chez toi jeter un œil, ça te va ?']
  const tutoie = (t) => /\b(tu|te|t'|ton|ta|tes|toi)\b/i.test(t) && !/\bvous\b/i.test(t)
  if (migr) {
    await rest('plateforme_config?on_conflict=artisan_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ artisan_id: u.id, mode_reponse: 'auto', vouvoiement: false, style_exemples: exemples, limite_messages: 8 }) })
    const t2 = (await (await fetch(`${APP}/api/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, message: 'Bonjour, une question sur un plan de travail.', variant: 'B', deferContact: true }) })).json()).token
    const r = await fetch(`${APP}/api/conversation/stream`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: t2, message: 'Est-ce que c’est possible en chêne massif, et vous passez quand ?' }) })
    const sse = (r.headers.get('content-type') || '').includes('text/event-stream')
    let texte = ''
    if (sse) for (const b of (await r.text()).split('\n\n')) { const l = b.trim(); if (l.startsWith('data:')) { try { const o = JSON.parse(l.slice(5)); if (o.t === 'delta') texte += o.v } catch { /* fragment */ } } }
    ok(sse && texte.length > 0, `réponse IA reçue en streaming (${texte.length} car.)`)
    ok(tutoie(texte), `persona tutoiement + exemples → la réponse TUTOIE : « ${texte.slice(0, 140).replace(/\s+/g, ' ')} »`)
  } else {
    const h = await helper({ action: 'ton', persona: { vouvoiement: false, style_exemples: exemples, longueur: 'courte' }, message: 'Est-ce que c’est possible en chêne massif, et vous passez quand ?' })
    if (h) {
      ok(h.sansPersona === true, 'sans persona : le prompt système est inchangé (bloc TON vide)')
      ok(/EXEMPLES DE TON/.test(h.bloc) && /TUTOIES/.test(h.bloc) && /PAS des faits/.test(h.bloc), 'bloc TON : exemples injectés comme TON, jamais comme faits')
      ok(h.texte.length > 0 && tutoie(h.texte), `persona tutoiement + exemples → la réponse TUTOIE : « ${(h.texte || '').slice(0, 140).replace(/\s+/g, ' ')} »`)
    } else skip('ton par exemples (migration 0053 absente, pas de route de test)')
  }
} catch (e) { ok(false, 'exception: ' + (e?.stack || e?.message || e)) } finally {
  await rest(`devis?artisan_id=eq.${u.id}`, { method: 'DELETE' }).catch(() => {})
  await rest(`leads?artisan_id=eq.${u.id}`, { method: 'DELETE' }).catch(() => {})
  await rest('rpc/purger_compte_test', { method: 'POST', body: JSON.stringify({ p_id: u.id }) })
  await admin(`users/${u.id}`, { method: 'DELETE' })
  console.log('nettoyé —', fails.length ? `❌ ${fails.length} FAIL` : '✅ TOUT PASSE', skips.length ? `(${skips.length} sauté·s : migration 0053)` : '')
  process.exit(fails.length ? 1 : 0)
}
