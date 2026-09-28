#!/usr/bin/env node
// Juge proposé d'essai (026-121), variante « PASS puis code 1 » : chaque ligne porte un identifiant de critère, mais
// aucune n'est en échec (que des PASS), et il sort pourtant en code 1 (dépendance absente, plantage tardif, exit oublié).
// Ce n'est pas « rouge sur un critère identifié » : verifier-fiche doit le refuser (contre-vérification de 026-121, C4).
console.log('PASS RD-1 — rien à redire')
console.log('PASS RD-2 — rien à redire')
console.log('PASS RD-3 — rien à redire')
process.exit(1)
