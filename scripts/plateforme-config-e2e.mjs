// Vérif B2-1 : le panneau de contrôle IA décide vraiment côté serveur (§A4),
// et un artisan SANS configuration garde son comportement actuel (non-régression).
import fs from 'fs'
const env = Object.fromEntries(fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split(/\r?\n/).filter(Boolean).map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, '')] }))
// Les aides partagées (connexion-test, etc.) lisent `process.env`, pas cet objet : sans cette
// ligne, leurs URL commencent par « undefined ». On ne remplace jamais une variable déjà posée.
for (const [cle, valeur] of Object.entries(env)) if (!process.env[cle]) process.env[cle] = valeur

const SB = env.NEXT_PUBLIC_SUPABASE_URL, SVC = env.SUPABASE_SERVICE_ROLE_KEY
const APP = process.argv[2] || 'https://prestiapp.fr'
const admin = (p, o = {}) => fetch(`${SB}/auth/v1/admin/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const rest = (p, o = {}) => fetch(`${SB}/rest/v1/${p}`, { ...o, headers: { apikey: SVC, Authorization: `Bearer ${SVC}`, 'Content-Type': 'application/json', ...(o.headers || {}) } })
const fails = []
const ok = (c, m) => { console.log((c ? 'PASS' : 'FAIL') + ' — ' + m); if (!c) fails.push(m) }

const st = Date.now(), slug = `cf-${st}`, email = `cf.${st}@x.fr`
const u = await (await admin('users', { method: 'POST', body: JSON.stringify({ email, password: 'Test123456!', email_confirm: true }) })).json()
await rest('artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({
  id: u.id, email, nom: 'Atelier Vasseur', metier: 'Menuisier', slug, plan: 'business',
  plateforme_active: true, reponse_auto: true, is_founder: true,
}) })
const nouvelleConv = async (msg) => (await (await fetch(`${APP}/api/leads`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, message: msg, variant: 'B', deferContact: true }) })).json()).token
const parler = async (token, message) => {
  const r = await fetch(`${APP}/api/conversation/stream`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, message }) })
  const sse = (r.headers.get('content-type') || '').includes('text/event-stream')
  if (!sse) return { sse, ...(await r.json().catch(() => ({}))) }
  const txt = await r.text() // on consomme le flux
  return { sse, longueur: txt.length }
}
// NB : l upsert PostgREST REMPLACE la ligne — on renvoie donc tous les champs dont on depend.
const setCfg = (patch) => rest('plateforme_config?on_conflict=artisan_id', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ artisan_id: u.id, ...patch }) })

try {
  // 1) SANS configuration → l'IA répond comme avant (non-régression)
  const t1 = await nouvelleConv('Bonjour, un escalier en chêne serait possible ?')
  const r1 = await parler(t1, 'Quelle essence me conseillez-vous pour un escalier ?')
  ok(r1.sse === true, 'sans config : l’IA répond en streaming (comportement inchangé)')

  // 2) Mode MANUELLE → l'IA se tait
  await setCfg({ mode_reponse: 'manuelle' })
  const r2 = await parler(t1, 'Et pour les délais ?')
  ok(r2.sse === false && r2.raison === 'manuelle', `mode manuelle : l’IA se tait (raison=${r2.raison})`)

  // 3) Mode ASSISTÉE → l'IA ne répond pas au prospect (l'artisan valide dans la console)
  await setCfg({ mode_reponse: 'assistee' })
  const r3 = await parler(t1, 'Vous êtes disponible quand ?')
  ok(r3.sse === false && r3.raison === 'assistee', `mode assistée : pas d’envoi automatique (raison=${r3.raison})`)

  // 4) ESCALADE → un mot sensible coupe l'IA même en mode auto
  await setCfg({ mode_reponse: 'auto' })
  const r4 = await parler(t1, 'Au secours, j’ai une grosse fuite chez moi !')
  ok(r4.sse === false && r4.raison === 'escalade', `escalade : « fuite » coupe l’IA (raison=${r4.raison})`)

  // 5) PLAFOND de messages IA
  await setCfg({ mode_reponse: 'auto', limite_messages: 0 })
  const r5 = await parler(t1, 'Une dernière question sur le bois.')
  ok(r5.sse === false && r5.raison === 'limite', `plafond atteint : reprise humaine (raison=${r5.raison})`)

  // 6) PLAGE HORAIRE fermée — sur un fil NEUF (6 messages sur le meme fil declencheraient l anti-flood)
  const t2 = await nouvelleConv('Bonjour, une question sur un plan de travail.')
  const h = parseInt(new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',hour12:false}).format(new Date()),10)
  await setCfg({ mode_reponse: 'auto', limite_messages: 8, auto_24_7: false, auto_debut: (h + 2) % 24, auto_fin: (h + 3) % 24 })
  const r6 = await parler(t2, 'Et pour la pose ?')
  ok(r6.sse === false && r6.raison === 'horaire', `hors plage horaire : l'IA ne répond pas (raison=${r6.raison})`)

  // 7) La RLS protège la config d'un autre artisan
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const vol = await fetch(`${SB}/rest/v1/plateforme_config?select=*`, { headers: { apikey: anon, Authorization: `Bearer ${anon}` } })
  const lignes = await vol.json().catch(() => [])
  ok(Array.isArray(lignes) && lignes.length === 0, `RLS : un anonyme ne lit aucune config (${Array.isArray(lignes) ? lignes.length : 'err'} ligne)`)
} catch (e) { ok(false, 'exception: ' + (e?.message || e)) } finally {
  await admin(`users/${u.id}`, { method: 'DELETE' })
  console.log('nettoyé —', fails.length ? `❌ ${fails.length} FAIL` : '✅ TOUT PASSE')
  process.exit(fails.length ? 1 : 0)
}
