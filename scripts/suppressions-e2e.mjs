// Vérif B3-1 : suppression granulaire (§C3) — chaque brique séparément, récapitulatif
// préalable, confirmation obligatoire, compte jamais touché, documents légaux conservés.
import fs from 'fs'
import { verifierSessionTest } from './lib/connexion-test.mjs'
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY, ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const APP = process.argv[2] || 'https://prestiapp.fr'
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const fails = []
const ok = (c, m) => { console.log((c ? 'PASS' : 'FAIL') + ' — ' + m); if (!c) fails.push(m) }

const st = Date.now(), slug = `sp-${st}`, email = `sp.${st}@x.fr`, pw = 'Test123456!'
const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password: pw, email_confirm: true }) })).json()
await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
  id: u.id, email, nom: 'Atelier Vasseur', metier: 'Menuisier', slug, plan: 'business',
  site_active: true, site_tier: 3, plateforme_active: true, theme: 'nuit',
  site_contenu: { hero_accroche: 'Le bois travaillé', hero_lede: 'x', apropos: 'y', prestations_intro: '', realisations_intro: '', cta_titre: '', cta_texte: '', meta_description: '', manifeste: '', mots_cles: [] },
  site_layout: { v: 2, sections: [{ id: 'hero', on: true }] },
  realisations: [{ image: 'https://x/y.webp', titre: 'Escalier', specialite: 'Escalier' }],
  avant_apres: [{ avant: 'https://x/a.webp', apres: 'https://x/b.webp', titre: 'Cuisine' }],
}) })
await rest('plateforme_config', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ artisan_id: u.id, mode_reponse: 'auto' }) })
const lead = (await (await rest('leads', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ artisan_id: u.id, nom_prospect: 'Marc Petit', contact: 'marc@example.com', message: 'Un escalier', ip: '1.2.3.4', photos: ['https://x/lead-media/abc/0.webp'], canal: 'formulaire', statut: 'nouveau' }) })).json())[0]
await rest('messages', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ lead_id: lead.id, sens: 'in', type: 'manuel', contenu: 'Bonjour, un escalier en chêne' }) })
const dv = (await (await rest('devis', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ artisan_id: u.id, lead_id: lead.id, numero: 'DEV-2026-0009', statut: 'envoye', total_ttc: 3600 }) })).json())[0]
console.log('seed', slug)

const jwt = (await (await fetch(`${SB}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: pw }) })).json()).access_token
await verifierSessionTest(jwt)
const H = { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` }
const recap = async (action, extra = '') => (await (await fetch(`${APP}/api/donnees?action=${action}${extra}`, { headers: H })).json())
const agir = async (body) => { const r = await fetch(`${APP}/api/donnees`, { method: 'POST', headers: H, body: JSON.stringify(body) }); return { status: r.status, ...(await r.json().catch(() => ({}))) } }
const artisan = async () => (await (await rest(`artisans?id=eq.${u.id}&select=*`)).json())[0]

try {
  // 0) Confirmation obligatoire
  const sansConfirm = await agir({ action: 'site_supprimer' })
  ok(sansConfirm.status === 400, `suppression refusée sans confirmation (${sansConfirm.status})`)

  // 1) Récapitulatif préalable
  const r1 = await recap('site_supprimer')
  ok(Array.isArray(r1.disparait) && r1.disparait.length >= 2, `récapitulatif : ${r1.disparait?.length} élément(s) listés`)
  ok((r1.conserve || []).some((x) => /compte/i.test(x)), 'le récapitulatif annonce que le compte est conservé')
  const rc = await recap('conversation_supprimer', `&lead_id=${lead.id}`)
  ok((rc.conserve || []).some((x) => /devis/i.test(x) && /conserv|archiv|loi/i.test(x)), 'le récap annonce que les devis envoyés sont conservés (obligation légale)')

  // 2) Réinitialiser le site : textes effacés, IMAGES conservées
  const a1 = await agir({ action: 'site_reinitialiser' })
  ok(a1.ok === true, 'réinitialisation du site acceptée')
  let A = await artisan()
  ok(A.site_contenu === null && A.site_layout === null, 'textes et composition effacés')
  ok(Array.isArray(A.realisations) && A.realisations.length === 1, 'les réalisations (images) sont conservées')
  ok(A.site_active === true, 'le site reste publié après une simple réinitialisation')

  // 3) Supprimer le site : dépublié + images effacées, COMPTE INTACT
  const a2 = await agir({ action: 'site_supprimer', confirm: 'SUPPRIMER' })
  ok(a2.ok === true, 'suppression du site acceptée')
  A = await artisan()
  ok(A.site_active === false && (A.realisations || []).length === 0 && (A.avant_apres || []).length === 0, 'site dépublié et médias effacés')
  ok(!!A.id && A.email === email, '⭑ le COMPTE Presti est intact')

  // 4) Supprimer la plateforme : config effacée, CONVERSATIONS conservées
  const a3 = await agir({ action: 'plateforme_supprimer', confirm: 'SUPPRIMER' })
  ok(a3.ok === true, 'suppression de la plateforme acceptée')
  const cfg = await (await rest(`plateforme_config?artisan_id=eq.${u.id}&select=artisan_id`)).json()
  ok(cfg.length === 0, 'réglages de la plateforme effacés')
  const leads = await (await rest(`leads?artisan_id=eq.${u.id}&select=id`)).json()
  ok(leads.length === 1, 'les conversations sont conservées (elles font preuve)')

  // 5) Anonymiser une conversation : données personnelles effacées, DEVIS ENVOYÉ conservé
  const a4 = await agir({ action: 'conversation_supprimer', lead_id: lead.id, confirm: 'SUPPRIMER' })
  ok(a4.ok === true, 'anonymisation de la conversation acceptée')
  const [L] = await (await rest(`leads?id=eq.${lead.id}&select=nom_prospect,contact,ip,photos,message`)).json()
  ok(L.contact === null && L.ip === null && L.photos === null && /supprim/i.test(L.nom_prospect || ''), 'données personnelles effacées (nom, contact, IP, photos)')
  const msgs = await (await rest(`messages?lead_id=eq.${lead.id}&select=contenu`)).json()
  ok(msgs.every((m) => /supprimé/i.test(m.contenu || '')), 'contenu des messages effacé')
  const [D] = await (await rest(`devis?id=eq.${dv.id}&select=id,statut`)).json()
  ok(!!D && D.statut === 'envoye', '⭑ le DEVIS ENVOYÉ est toujours là (obligation de conservation)')

  // 6) On ne touche pas aux données d'un autre artisan
  const autre = await agir({ action: 'conversation_supprimer', lead_id: '00000000-0000-0000-0000-000000000000', confirm: 'SUPPRIMER' })
  ok(autre.status === 404, `une conversation qui ne vous appartient pas est refusée (${autre.status})`)
} catch (e) { ok(false, 'exception: ' + (e?.message || e)) } finally {
  await admin(`users/${u.id}`, { method: 'DELETE' })
  console.log('nettoyé —', fails.length ? `❌ ${fails.length} FAIL` : '✅ TOUT PASSE')
  process.exit(fails.length ? 1 : 0)
}
