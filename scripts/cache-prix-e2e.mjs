// Cache mutualisé des prix (migration 0056) — vérifications qui ne coûtent AUCUN crédit d'IA.
//
// Ce que ce fichier protège, dans l'ordre d'importance :
//  1. Un artisan ne peut pas empoisonner le cache des autres (liste blanche de domaines).
//  2. La date d'observation traverse le cache sans être réécrite (sinon le serveur signerait
//     une date fausse, qui s'écrirait ensuite dans les observations de prix de l'artisan).
//  3. Le sceau est bien refait pour l'artisan qui lit, sinon son clic « Retenir » ne fait rien.
//  4. Deux références voisines (BA13, BA18) ne se confondent jamais dans la clé.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/cache-prix-e2e.mjs
import fs from 'node:fs'
import { createClient } from '@supabase/supabase-js'

for (const l of fs.readFileSync('.env.local', 'utf8').split('\n')) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}

const { normaliserRequete, DOMAINES_PARTAGEABLES, domainePartageable, lireCache, ecrireCache, HEURES_VALIDITE, VERSION_CACHE } =
  await import('../lib/inventaire/cachePrix.ts')
const { sceller, sceauValide } = await import('../lib/recherche-fournisseurs.ts')
const { COUT_RECHERCHE, CREDIT_COST } = await import('../lib/plans.ts')

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }

console.log('\n── 1. La clé de cache')
T('les accents et la casse ne comptent pas', normaliserRequete('Plaque de plâtre BA13') === 'plaque de platre ba13')
T('la ponctuation devient une espace (BA-13 rejoint BA 13)', normaliserRequete('BA-13') === normaliserRequete('BA 13'))
T('deux références voisines ne se confondent PAS', normaliserRequete('ba13') !== normaliserRequete('ba18'))
T('le texte n’est jamais tronqué au point de perdre la référence', normaliserRequete('tube per 16 nu couronne 50 m').includes('16'))
T('une requête vide donne une clé vide (aucune écriture possible)', normaliserRequete('   ') === '')
T('la clé respecte la contrainte SQL (minuscules, sans espaces aux bords)', (() => {
  const k = normaliserRequete('  Plaque   de PLÂTRE, BA13 !  ')
  return k === k.toLowerCase() && k === k.trim() && !k.includes('  ')
})(), normaliserRequete('  Plaque   de PLÂTRE, BA13 !  '))

console.log('\n── 2. La liste blanche : un artisan ne peut pas empoisonner le cache des autres')
T('les trois enseignes vérifiées à la main sont partageables', ['castorama.fr', 'bricodepot.fr', 'toutfaire.fr'].every((d) => DOMAINES_PARTAGEABLES.has(d)))
T('un site à prix masqués n’est PAS partageable', !DOMAINES_PARTAGEABLES.has('rexel.fr'))
T('un domaine inventé par un artisan n’est pas partageable', !domainePartageable('https://mes-prix-a-moi.example'))
T('le « www. » ne trompe pas la liste blanche', domainePartageable('https://www.castorama.fr/un-produit'))
T('une URL vide n’est pas partageable', !domainePartageable(null) && !domainePartageable(''))

console.log('\n── 3. Le sceau est refait pour l’artisan qui lit')
const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const vuLeOrigine = '2026-09-01T09:30:00.000Z'
const base = {
  fournisseur: 'Castorama', fournisseur_id: 'aaaaaaaa-1111-4111-8111-111111111111',
  designation_vue: 'Plaque de plâtre BA13', reference: null, prix_vu: 6.2, ht_ou_ttc: 'TTC',
  unite: 'plaque', conditionnement: null, disponibilite_vue: null,
  url: 'https://www.castorama.fr/x', vu_le: vuLeOrigine, extrait: '6,20 € / plaque',
}
const pourA = { ...base, sceau: sceller(A, base) }
T('le sceau de A est valide pour A', sceauValide(A, pourA))
T('le sceau de A est REFUSÉ pour B (d’où la nécessité de re-sceller)', !sceauValide(B, pourA))
const baseB = { ...base, fournisseur: 'Casto du 12', fournisseur_id: 'bbbbbbbb-2222-4222-8222-222222222222' }
const pourB = { ...baseB, sceau: sceller(B, baseB) }
T('re-scellé avec le nom et la fiche de B, il devient valide pour B', sceauValide(B, pourB))
T('la date d’origine traverse le re-scellement sans être réécrite', pourB.vu_le === vuLeOrigine)
const menteur = { ...baseB, vu_le: new Date().toISOString() }
T('re-dater change le sceau : une date fausse ne peut pas se faire passer pour l’ancienne',
  sceller(B, menteur) !== sceller(B, baseB))

console.log('\n── 4. Le tarif')
T('une recherche coûte plus qu’une génération de texte', COUT_RECHERCHE.standard > CREDIT_COST.standard)
T('Standard et Pro sont au même tarif', COUT_RECHERCHE.standard === COUT_RECHERCHE.pro)
T('la durée de validité est de trois jours', HEURES_VALIDITE === 72)

console.log('\n── 5. Aller-retour en base (sauté si la migration 0056 n’est pas posée)')
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const requeteTest = `zzz test cache ${Date.now()}`
const { error: sonde } = await admin.from('recherche_cache').select('domaine').limit(1)
if (sonde) {
  console.log(`  ⏭  table absente (${sonde.message.slice(0, 60)}) — colle _A_COLLER_sql_editor_0056.sql`)
} else {
  const resultats = [{ ...base, sceau: sceller(A, base) }]
  const n = await ecrireCache(requeteTest, [
    { domaine: 'castorama.fr', prixPublics: true, resultats, raisonNonVu: null },
    { domaine: 'mes-prix-a-moi.example', prixPublics: true, resultats, raisonNonVu: null },
    { domaine: 'bricodepot.fr', prixPublics: false, resultats, raisonNonVu: null },
  ], 'standard')
  T('seul le domaine de la liste blanche est écrit', n === 1, `écrits : ${n}`)

  const lu = await lireCache(requeteTest, ['castorama.fr', 'mes-prix-a-moi.example', 'bricodepot.fr'])
  T('l’entrée écrite se relit', lu.has('castorama.fr'))
  T('le domaine hors liste n’a rien écrit ni rien à lire', !lu.has('mes-prix-a-moi.example'))
  T('un fournisseur à prix masqués n’entre pas dans le cache partagé', !lu.has('bricodepot.fr'))
  const e = lu.get('castorama.fr')
  T('la date de lecture d’origine est conservée', e?.resultats?.[0]?.vu_le === vuLeOrigine, e?.resultats?.[0]?.vu_le)
  T('le sceau n’est PAS stocké (il est refait à chaque lecture)', e?.resultats?.[0] && !('sceau' in e.resultats[0]))
  T('ni le nom du fournisseur ni sa fiche ne sont stockés (ils appartiennent à l’artisan)',
    e?.resultats?.[0] && !('fournisseur' in e.resultats[0]) && !('fournisseur_id' in e.resultats[0]))
  T('le prix vu est intact', e?.resultats?.[0]?.prix_vu === 6.2)

  const rien = await lireCache(`${requeteTest} inexistant`, ['castorama.fr'])
  T('une requête jamais faite ne renvoie rien', rien.size === 0)

  // Une entrée périmée ne doit plus être servie.
  await admin.from('recherche_cache')
    .update({ expire_le: new Date(Date.now() - 3_600_000).toISOString() })
    .eq('requete_norm', normaliserRequete(requeteTest)).eq('version', VERSION_CACHE)
  const perime = await lireCache(requeteTest, ['castorama.fr'])
  T('une entrée périmée n’est plus servie', perime.size === 0)

  await admin.from('recherche_cache').delete().eq('requete_norm', normaliserRequete(requeteTest))
  console.log('  🧹 entrées de test retirées')
}

console.log(`\n${ko ? '❌' : '✅'} ${ok} réussis, ${ko} échoués`)
process.exit(ko ? 1 : 0)
