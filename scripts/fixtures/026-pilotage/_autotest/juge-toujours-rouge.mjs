// scripts/fixtures/026-pilotage/_autotest/juge-toujours-rouge.mjs — juge FACTICE de l'autotest JA-10 (026-012) : il sort
// TOUJOURS en 1, quel que soit l'arbre, comme les juges de 400 à 767 octets refusés sur 026-066. Rouge sur la référence, il
// passait l'ancienne preuve ; la preuve durcie doit le refuser par ❌ JA-7 (il ne sait pas être vert sur le témoin).
console.log('juge-toujours-rouge (autotest JA-10)')
console.log('❌ ZT-1 toujours en échec, quoi qu’on lui donne')
console.log('juge-toujours-rouge (autotest JA-10) : FAIL — ZT-1')
process.exitCode = 1
