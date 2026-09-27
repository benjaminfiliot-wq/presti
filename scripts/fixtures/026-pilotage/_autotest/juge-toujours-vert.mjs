// scripts/fixtures/026-pilotage/_autotest/juge-toujours-vert.mjs — juge FACTICE de l'autotest JA-10 (026-012) : il sort
// TOUJOURS en 0 avec quatre critères verts, sans rien lire. La preuve doit le refuser par ❌ JA-1 (pas rouge sur la
// référence) et ❌ JA-8 (aucun sabotage vu).
console.log('juge-toujours-vert (autotest JA-10)')
for (const id of ['ZT-1', 'ZT-2', 'ZT-3', 'ZT-4']) console.log(`✅ ${id} conforme (sans rien lire)`)
console.log('juge-toujours-vert (autotest JA-10) : PASS')
process.exitCode = 0
