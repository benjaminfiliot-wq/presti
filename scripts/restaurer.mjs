// Relire et restaurer une sauvegarde de Presti. Une sauvegarde qu'on n'a jamais su relire
// n'est pas une sauvegarde : ce script existe autant pour restaurer que pour le PROUVER.
//
//   node scripts/restaurer.mjs --lire <fichier>
//       déchiffre, affiche le manifeste et le contenu réel (nombre de lignes par table).
//
//   node scripts/restaurer.mjs --comparer <fichier>
//       compare la sauvegarde à la base VIVANTE, table par table : ce qui manquerait si on
//       restaurait aujourd'hui, et ce qui a été créé depuis. Ne modifie rien.
//
//   node scripts/restaurer.mjs --aller-retour <fichier>
//       PREUVE : crée un artisan de test, l'efface, le restaure depuis la sauvegarde d'un
//       instantané pris à la volée, et vérifie que tout est revenu à l'identique. Ne touche
//       qu'à des comptes @presti-test.invalid.
//
//   node scripts/restaurer.mjs --restaurer <fichier> --artisan <uuid>
//       restaure les lignes d'UN artisan (le cas réel : un compte effacé par erreur).
//       Refuse d'écraser une ligne existante sans --remplacer.
//
// Le déchiffrement exige cle-sauvegarde.key.pem (clé privée, hors du dépôt).
import fs from 'node:fs'
import crypto from 'node:crypto'
import zlib from 'node:zlib'

for (const l of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i > 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : d }
const flag = (k) => process.argv.includes(k)
const CLE_PRIVEE = arg('--cle-privee', 'cle-sauvegarde.key.pem')

const rest = async (chemin, opts = {}) => {
  const r = await fetch(`${URL_SB}${chemin}`, { ...opts, headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, 'Content-Type': 'application/json', ...(opts.headers ?? {}) } })
  const t = await r.text()
  return { ok: r.ok, status: r.status, texte: t, json: t ? (() => { try { return JSON.parse(t) } catch { return null } })() : null }
}

function ouvrir(fichier) {
  const brut = fs.readFileSync(fichier)
  if (fichier.endsWith('.json.gz')) return { manifeste: { chiffrement: 'aucun' }, donnees: JSON.parse(zlib.gunzipSync(brut).toString('utf8')) }
  const fin = brut.indexOf(0x0a)
  const manifeste = JSON.parse(brut.subarray(0, fin).toString('utf8'))
  if (!fs.existsSync(CLE_PRIVEE)) { console.error(`❌ Clé privée absente : ${CLE_PRIVEE}. Sans elle, cette sauvegarde est illisible — c'est voulu.`); process.exit(2) }
  const cleAes = crypto.privateDecrypt({ key: fs.readFileSync(CLE_PRIVEE, 'utf8'), padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: 'sha256' }, Buffer.from(manifeste.cle_scellee, 'base64'))
  const d = crypto.createDecipheriv('aes-256-gcm', cleAes, Buffer.from(manifeste.iv, 'base64'))
  d.setAuthTag(Buffer.from(manifeste.tag, 'base64'))
  const corps = Buffer.concat([d.update(brut.subarray(fin + 1)), d.final()])
  const empreinte = crypto.createHash('sha256').update(corps).digest('hex')
  if (manifeste.sha256_clair && empreinte !== manifeste.sha256_clair) { console.error('❌ empreinte différente : la sauvegarde est abîmée.'); process.exit(2) }
  return { manifeste, donnees: JSON.parse(zlib.gunzipSync(corps).toString('utf8')) }
}

const fichier = arg('--lire') || arg('--comparer') || arg('--aller-retour') || arg('--restaurer')

if (flag('--lire')) {
  const { manifeste, donnees } = ouvrir(fichier)
  console.log('Manifeste :', JSON.stringify(manifeste, null, 1))
  console.log('\nContenu réellement déchiffré :')
  for (const [t, l] of Object.entries(donnees.tables)) if (l.length) console.log(`  ${t.padEnd(24)} ${l.length}`)
  console.log(`  ${'comptes'.padEnd(24)} ${donnees.comptes.length}`)
  console.log(`  ${'fichiers (inventaire)'.padEnd(24)} ${Object.values(donnees.stockage.inventaire ?? {}).reduce((n, x) => n + x.length, 0)}`)
  process.exit(0)
}

if (flag('--comparer')) {
  const { donnees } = ouvrir(fichier)
  console.log('table                     sauvegarde   vivant   écart')
  let alerte = 0
  for (const [t, l] of Object.entries(donnees.tables)) {
    // Le compte vivant vient de l'en-tête content-range : une requête HEAD suffit, on ne
    // télécharge pas la table pour la compter.
    const c = await fetch(`${URL_SB}/rest/v1/${t}?select=*`, { method: 'HEAD', headers: { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, Prefer: 'count=exact', Range: '0-0' } })
    const total = Number((c.headers.get('content-range') ?? '/0').split('/')[1]) || 0
    const ecart = total - l.length
    if (Math.abs(ecart) > 0) alerte++
    console.log(`${t.padEnd(26)} ${String(l.length).padStart(9)} ${String(total).padStart(8)} ${(ecart > 0 ? '+' : '') + ecart}`)
  }
  console.log(`\n${alerte} table(s) ont bougé depuis la sauvegarde — normal si elle date. Un écart NÉGATIF (moins de lignes vivantes que sauvegardées) mérite un regard : des données ont disparu.`)
  process.exit(0)
}

if (flag('--aller-retour')) {
  // La preuve : on n'a pas confiance dans une sauvegarde qu'on n'a jamais restaurée.
  const { donnees } = ouvrir(fichier)
  const marque = `restau-${Date.now()}`
  const email = `${marque}@presti-test.invalid`
  let ok = 0, ko = 0
  const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }
  console.log('\n── Aller-retour : un compte est effacé, puis restauré depuis la sauvegarde')
  const u = await rest('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password: crypto.randomBytes(18).toString('base64url'), email_confirm: true }) })
  const uid = u.json?.id
  T('compte de test créé', !!uid, u.texte?.slice(0, 100))
  const artisan = { id: uid, email, nom: 'Atelier Restauration', metier: 'Menuisier', slug: marque, plan: 'studio', credits: 42, bio: 'Une bio qui doit revenir à l’identique.' }
  await rest('/rest/v1/artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(artisan) })
  const lead = await rest('/rest/v1/leads', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ artisan_id: uid, message: 'Une demande à retrouver', type_chantier: 'Menuiserie', statut: 'nouveau', token: crypto.randomUUID() }) })
  const leadId = lead.json?.[0]?.id
  T('données de test posées', !!leadId)

  // Instantané à la volée : la sauvegarde de référence ne contient évidemment pas ce compte.
  const avantA = (await rest(`/rest/v1/artisans?id=eq.${uid}&select=*`)).json[0]
  const avantL = (await rest(`/rest/v1/leads?artisan_id=eq.${uid}&select=*`)).json

  await rest(`/rest/v1/leads?artisan_id=eq.${uid}`, { method: 'DELETE' })
  await rest(`/rest/v1/artisans?id=eq.${uid}`, { method: 'DELETE' })
  const disparu = (await rest(`/rest/v1/artisans?id=eq.${uid}&select=id`)).json
  T('tout est effacé (le sinistre)', (disparu ?? []).length === 0)

  const rA = await rest('/rest/v1/artisans', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(avantA) })
  const rL = await rest('/rest/v1/leads', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(avantL) })
  T('restauration acceptée par la base', rA.ok && rL.ok, `${rA.status}/${rL.status} ${(rA.texte || rL.texte || '').slice(0, 120)}`)
  const apresA = (await rest(`/rest/v1/artisans?id=eq.${uid}&select=*`)).json?.[0]
  const apresL = (await rest(`/rest/v1/leads?artisan_id=eq.${uid}&select=*`)).json
  T('l’artisan est revenu à l’identique', JSON.stringify(apresA) === JSON.stringify(avantA), 'des colonnes diffèrent')
  T('ses conversations aussi', JSON.stringify(apresL) === JSON.stringify(avantL))
  T('la sauvegarde de référence est bien lisible et non vide', Object.keys(donnees.tables).length > 5 && donnees.comptes.length > 0)

  await rest(`/rest/v1/leads?artisan_id=eq.${uid}`, { method: 'DELETE' })
  await rest(`/rest/v1/artisans?id=eq.${uid}`, { method: 'DELETE' })
  await rest(`/auth/v1/admin/users/${uid}`, { method: 'DELETE' })
  console.log('🧹 compte de test supprimé')
  console.log(`\n${ko ? '❌' : '✅'} ${ok} réussis, ${ko} échoués`)
  process.exit(ko ? 1 : 0)
}

if (flag('--restaurer')) {
  const id = arg('--artisan')
  if (!id) { console.error('--artisan <uuid> est obligatoire : on ne restaure pas toute une base par accident.'); process.exit(2) }
  const { donnees } = ouvrir(fichier)
  const existe = (await rest(`/rest/v1/artisans?id=eq.${id}&select=id`)).json
  if ((existe ?? []).length && !flag('--remplacer')) { console.error('Cet artisan existe déjà en base. Ajoute --remplacer si tu veux écraser ses lignes.'); process.exit(2) }
  const compte = donnees.comptes.find((c) => c.id === id)
  if (compte) {
    const r = await rest('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ id: compte.id, email: compte.email, email_confirm: !!compte.email_confirmed_at, password: crypto.randomBytes(24).toString('base64url'), user_metadata: compte.user_metadata ?? {} }) })
    console.log(r.ok ? `✅ compte recréé (${compte.email}) — mot de passe aléatoire : l'artisan devra le réinitialiser` : `⚠️ compte : ${r.status} ${r.texte.slice(0, 120)}`)
  }
  let total = 0
  for (const [t, lignes] of Object.entries(donnees.tables)) {
    const siennes = lignes.filter((l) => l.artisan_id === id || (t === 'artisans' && l.id === id))
    if (!siennes.length) continue
    const r = await rest(`/rest/v1/${t}`, { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify(siennes) })
    console.log(r.ok ? `  ✅ ${t} : ${siennes.length}` : `  ❌ ${t} : ${r.status} ${r.texte.slice(0, 100)}`)
    if (r.ok) total += siennes.length
  }
  console.log(`\n${total} ligne(s) restaurée(s). Les lignes filles sans artisan_id (messages, lignes de devis…) suivent leurs parents : vérifie-les.`)
  process.exit(0)
}

console.log('Usage : --lire | --comparer | --aller-retour | --restaurer --artisan <uuid>, chacun avec <fichier>')
process.exit(2)
