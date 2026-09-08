// Les droits du mode support, éprouvés sans réseau et sans base.
//
// Ce fichier teste la FONCTION que toutes les routes appellent, pas une route. C'est ce qui compte :
// une route qu'on oublie de protéger existe toujours ; une matrice fausse rend toutes les routes
// fausses en même temps, et une matrice juste protège même celles qu'on écrira demain.
//
// Ce qu'il prouve, dans l'ordre où ça compte :
//   1. le partenaire est refusé sur le support, AVEC une phrase française — `RAISONS` est un
//      `Partial<>`, donc un oubli y est silencieux et se lit « Ce n'est pas dans votre périmètre » ;
//   2. aucun domaine refusé au partenaire n'a été oublié dans `RAISONS` ;
//   3. le verdict est un objet et non un booléen : `borne` ne peut pas se laisser oublier ;
//   4. un domaine inventé est refusé, pas autorisé par défaut.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/support-droits-unit.mjs

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? `\n     → ${d}` : ''}`) } }

const { peutFaire, autorise } = await import('../lib/controle/droits.ts')

console.log('\n══ Les droits du mode support (sans réseau, sans base) ══\n')

console.log('1. Le partenaire n’a rien à faire ici, jamais')
const vuePartenaire = peutFaire('partenaire', 'support', 'voir')
T('le partenaire ne VOIT pas le support', vuePartenaire.permis === false, JSON.stringify(vuePartenaire))
T('… et pas non plus « ses » accès : il n’y a pas de version bornée ici',
  vuePartenaire.permis === false && !('borne' in vuePartenaire), JSON.stringify(vuePartenaire))
const ecrirePartenaire = peutFaire('partenaire', 'support', 'ecrire')
T('le partenaire ne DEMANDE pas d’accès', ecrirePartenaire.permis === false, JSON.stringify(ecrirePartenaire))
T('le refus est une phrase française qui dit pourquoi, pas « accès refusé »',
  vuePartenaire.permis === false && /Benjamin|artisans|confient/.test(vuePartenaire.raison ?? ''),
  vuePartenaire.permis === false ? vuePartenaire.raison : '(permis)')

console.log('\n2. Aucune raison oubliée — `RAISONS` est un Partial, l’oubli y est silencieux')
// Les domaines viennent du TYPE, pas d'une recopie : ce fichier affirme qu'aucun domaine n'a été
// oublié dans `RAISONS`, et une liste tapée à la main ne peut pas soutenir cette affirmation — elle
// prouve ce qu'on y a mis. Un domaine ajouté demain sans sa raison fait rougir ce test.
const source = await (await import('node:fs/promises')).readFile(new URL('../lib/controle/droits.ts', import.meta.url), 'utf8')
const bloc = /export type Domaine[^=]*=([\s\S]*?)\n\n/.exec(source)?.[1] ?? ''
const DOMAINES = [...bloc.matchAll(/'([a-z][a-z._]*)'/g)].map((m) => m[1])

T(`la liste des domaines vient du type source (${DOMAINES.length} trouvés)`, DOMAINES.length >= 10, DOMAINES.join(', '))
const sansRaison = []
for (const d of DOMAINES) {
  for (const v of ['voir', 'ecrire']) {
    const r = peutFaire('partenaire', d, v)
    if (r.permis === false && (!r.raison || r.raison === 'Ce n’est pas dans votre périmètre.')) sansRaison.push(`${d}.${v}`)
  }
}
T(`chaque refus opposé au partenaire porte sa raison${sansRaison.length ? ` — manquent : ${sansRaison.join(', ')}` : ''}`, sansRaison.length === 0)

console.log('\n3. Le fondateur peut demander — mais la porte n’est pas ici')
const vueFondateur = peutFaire('fondateur', 'support', 'voir')
T('le fondateur passe la matrice', vueFondateur.permis === true, JSON.stringify(vueFondateur))
T('… sans être borné (la borne d’un fondateur n’a pas de sens)', vueFondateur.permis === true && vueFondateur.borne === false)
console.log('     (ce que la matrice autorise, c’est de DEMANDER et de lire SOUS une fenêtre ouverte.')
console.log('      La fenêtre, elle, est vérifiée en base par `lire_sous_support`, à chaque lecture.)')

console.log('\n4. Le verdict est un objet, et un domaine inventé est refusé')
const inconnu = peutFaire('partenaire', 'domaine-invente', 'voir')
T('un domaine inconnu est REFUSÉ, pas autorisé par défaut', inconnu.permis === false, JSON.stringify(inconnu))
T('le raccourci `autorise` dit la même chose que le verdict complet',
  autorise('partenaire', 'support', 'voir') === false && autorise('fondateur', 'support', 'voir') === true)

console.log('\n5. Le reste de la matrice n’a pas bougé')
T('le partenaire garde la lecture des clients', peutFaire('partenaire', 'clients', 'voir').permis === true)
T('… bornée à personne (il voit la liste)', peutFaire('partenaire', 'clients', 'voir').borne === false)
T('le partenaire garde ses apports, bornés aux siens',
  peutFaire('partenaire', 'apports', 'voir').permis === true && peutFaire('partenaire', 'apports', 'voir').borne === true)
T('le partenaire n’a toujours pas les actions sur un artisan', peutFaire('partenaire', 'artisan.actions', 'ecrire').permis === false)
T('le partenaire n’a toujours pas la comptabilité', peutFaire('partenaire', 'comptabilite', 'voir').permis === false)

console.log(`\n${ko ? '❌' : '✅'} ${ok} réussis, ${ko} échoués\n`)
process.exitCode = ko ? 1 : 0
setTimeout(() => process.exit(process.exitCode), 100)
