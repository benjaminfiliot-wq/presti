#!/usr/bin/env node
// Juge proposé d'essai (026-121), variante « plantage » : il échoue (code ≠ 0), mais par une exception et sa trace de
// pile, sans aucune ligne en échec qui porte un identifiant de critère. verifier-fiche doit le refuser.
import fs from 'node:fs'

const modele = JSON.parse(fs.readFileSync('lib/relances/modele.json', 'utf8'))
console.log(modele.texte.length)
