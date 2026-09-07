// Ranger `.env.local` quand une valeur y a été collée sans son nom (troisième fois — 05/09, 07/09 ×2).
//
// Une clé collée seule sur sa ligne est invisible : `NOM=valeur` est la seule forme que lisent Node,
// Vercel et tous les scripts d'ici. Elle traîne donc en clair sans servir à rien, ce qui est le pire
// des deux mondes.
//
// Ce script identifie chaque valeur orpheline auprès de son fournisseur (Anthropic par l'API
// d'administration, Stripe par la forme de la clé), la range sous le bon nom quand elle est la
// meilleure candidate, et retire les autres du fichier. Il n'affiche JAMAIS une valeur : seulement
// son nom, son espace et son indice public.
//
// Usage : node scripts/ranger-env.mjs            (dit ce qu'il ferait)
//         node scripts/ranger-env.mjs --ecrire   (le fait, après sauvegarde)

import fs from 'node:fs'

const FICHIER = '.env.local'
const ECRIRE = process.argv.includes('--ecrire')
if (!fs.existsSync(FICHIER)) { console.log(`\n⛔ ${FICHIER} introuvable.\n`); process.exit(2) }

const brut = fs.readFileSync(FICHIER, 'utf8')
const lignes = brut.split(/\r?\n/)
const env = Object.fromEntries(lignes.map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].trim()]))
const indice = (v) => `${v.slice(0, 16)}…${v.slice(-4)}`

// Une ligne qui n'est qu'une valeur : ni commentaire, ni NOM=…, mais qui ressemble à un secret.
const orphelines = lignes
  .map((l, i) => ({ i, v: l.trim() }))
  .filter(({ v }) => v && !v.startsWith('#') && !/^[A-Z0-9_]+=/.test(v) && /^(sk-ant-|sk_|rk_|pk_|whsec_|eyJ)/.test(v))

if (!orphelines.length) { console.log('\n✅ Rien à ranger : aucune valeur sans son nom.\n'); process.exit(0) }

console.log(`\n══ ${orphelines.length} valeur(s) collée(s) sans leur nom ══\n`)

// ── Les clés Anthropic : on demande à l'organisation qui elles sont ────────────────────────────────
const anthropiques = orphelines.filter((o) => o.v.startsWith('sk-ant-'))
let garder = null
if (anthropiques.length) {
  if (!env.ANTHROPIC_ADMIN_KEY) console.log('  ⚠️  ANTHROPIC_ADMIN_KEY absente : impossible d’identifier les clés Anthropic.')
  else {
    const r = await fetch('https://api.anthropic.com/v1/organizations/api_keys?limit=100', {
      headers: { 'x-api-key': env.ANTHROPIC_ADMIN_KEY, 'anthropic-version': '2023-06-01' },
    })
    const k = await r.json()
    const espace = env.ANTHROPIC_WORKSPACE_PRESTI
    const identifiees = anthropiques.map((o) => {
      const tete = 'sk-ant-api03-' + o.v.slice(13, 16)
      const queue = o.v.slice(-4)
      const c = (k.data ?? []).find((x) => (x.partial_key_hint ?? '').startsWith(tete) && (x.partial_key_hint ?? '').endsWith(queue))
      return { ...o, cle: c }
    })
    for (const x of identifiees) {
      const c = x.cle
      console.log(`  ligne ${x.i + 1} · ${indice(x.v)} → ${c ? `« ${c.name} », ${c.workspace_id === espace ? 'ESPACE PRESTI' : 'espace par défaut'}, ${c.status}, créée le ${String(c.created_at).slice(0, 16).replace('T', ' à ')}` : 'inconnue de l’organisation'}`)
    }
    // La bonne : celle de l'espace Presti, active, la plus récente.
    const candidates = identifiees.filter((x) => x.cle?.workspace_id === espace && x.cle?.status === 'active')
      .sort((a, b) => String(b.cle.created_at).localeCompare(String(a.cle.created_at)))
    garder = candidates[0] ?? null
    console.log(garder
      ? `\n  → à ranger sous ANTHROPIC_API_KEY : « ${garder.cle.name} » (${indice(garder.v)})`
      : '\n  ⚠️  aucune de ces clés n’appartient à l’espace Presti et n’est active.')
  }
}

// ── Les autres : on ne devine pas, on signale ─────────────────────────────────────────────────────
const autres = orphelines.filter((o) => !o.v.startsWith('sk-ant-'))
if (autres.length) {
  console.log('\n  Autres valeurs orphelines — je ne les range pas moi-même, leur nom dépend de leur usage :')
  for (const o of autres) {
    const quoi = o.v.startsWith('rk_live') ? 'clé Stripe restreinte RÉELLE' : o.v.startsWith('rk_test') ? 'clé Stripe restreinte de test'
      : o.v.startsWith('sk_live') ? 'clé Stripe secrète RÉELLE' : o.v.startsWith('sk_test') ? 'clé Stripe secrète de test'
      : o.v.startsWith('whsec_') ? 'secret de webhook Stripe' : o.v.startsWith('eyJ') ? 'jeton JWT' : 'valeur inconnue'
    console.log(`    ligne ${o.i + 1} · ${indice(o.v)} · ${quoi}`)
  }
  console.log('    ⚠️  Une clé réelle qui traîne en clair sans servir devrait être RÉVOQUÉE chez son fournisseur,')
  console.log('       pas seulement effacée d’ici — on ne sait pas où elle est passée entre-temps.')
}

if (!ECRIRE) { console.log('\n(Rien n’a été modifié. Relancez avec --ecrire pour ranger.)\n'); process.exit(0) }

// ── L'écriture, après sauvegarde ───────────────────────────────────────────────────────────────────
const sauvegarde = `${FICHIER}.avant-rangement`
fs.writeFileSync(sauvegarde, brut, 'utf8')

const aRetirer = new Set(orphelines.map((o) => o.i))
let sortie = lignes.filter((_, i) => !aRetirer.has(i))
if (garder) {
  const dejaLa = sortie.findIndex((l) => /^ANTHROPIC_API_KEY=/.test(l))
  const ligne = `ANTHROPIC_API_KEY=${garder.v}`
  if (dejaLa >= 0) sortie[dejaLa] = ligne
  else sortie.push('# Clé du PRODUIT, dans l’espace de travail Presti (le coût de Presti, séparé du reste).', ligne)
}
fs.writeFileSync(FICHIER, sortie.join('\n'), 'utf8')
console.log(`\n✅ ${FICHIER} rangé. Sauvegarde : ${sauvegarde}`)
console.log(`   ${orphelines.length} ligne(s) orpheline(s) retirée(s)${garder ? ', la bonne clé rangée sous son nom' : ''}.`)
console.log('\n   ⚠️  La sauvegarde contient les valeurs en clair : effacez-la une fois la clé posée.\n')
