#!/usr/bin/env node
// scripts/communes-generer.mjs — régénère la liste FERMÉE de communes de lib/ville.ts (la ville d'une demande, 06/10/2026).
//
// Source : Code officiel géographique de l'INSEE, servi par geo.api.gouv.fr (API publique de l'État, sans clé). Retenues :
// toutes les communes de la Charente-Maritime (17), de la Vendée (85) et des Deux-Sèvres (79), plus toutes les communes de
// France de 10 000 habitants et plus. Le script ne réécrit QUE la chaîne DONNEES et le décompte de l'en-tête de lib/ville.ts.
//
// Usage : node scripts/communes-generer.mjs   (puis node scripts/qualification-qa.mjs)
import fs from 'node:fs'
const VILLE = new URL('../lib/ville.ts', import.meta.url)
const all = await (await fetch('https://geo.api.gouv.fr/communes?fields=nom,code,codesPostaux,population,codeDepartement&format=json')).json()
if (!Array.isArray(all) || all.length < 30000) throw new Error(`relevé geo.api.gouv.fr incomplet : ${Array.isArray(all) ? all.length : typeof all}`)
const DEPS = ['17', '85', '79']
const sel = all.filter((c) => DEPS.includes(c.codeDepartement) || (c.population || 0) >= 10000)
const parNom = new Map()
for (const c of sel) {
  const e = parNom.get(c.nom) ?? new Set()
  for (const cp of c.codesPostaux || []) e.add(cp)
  parNom.set(c.nom, e)
}
const n = (x) => x.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
// Noms qui sont aussi des mots courants : la majuscule est exigée. Relu à la main sur la liste des noms courts du relevé.
const MAJ = new Set(['bois', 'bords', 'courant', 'doux', 'celles', 'angles', 'ballon', 'martinet', 'marnes', 'mortiers', 'surin', 'charron',
  'clavette', 'grues', 'tesson', 'taillant', 'cours', 'forges', 'fontaine', 'landes', 'salles', 'croix', 'contre', 'sens', 'orange',
  'plaisir', 'fosses', 'avion', 'tours', 'lattes', 'trappes', 'pantin', 'romans', 'colombes', 'cognac', 'ifs', 'bran', 'vienne',
  'pertuis', 'grasse', 'chambon', 'tulle', 'rom', 'muret', 'saintes', 'chives', 'lens', 'mana', 'sada', 'pia', 'hem', 'thors', 'fors',
  'le port', 'le moule', 'la possession', 'le tampon', 'la garde', 'les lilas', 'la madeleine', 'la riche', 'la fleche', 'la trinite',
  'la tronche', 'le robert', 'les abymes', 'le gosier', 'le lamentin', 'le francois', 'les mureaux'])
// Prénoms ou noms de personne : seulement avec leur code postal (« dites-le à Yves »).
const CP = new Set(['yves', 'anais', 'francois', 'benet', 'soubise', 'saint martin'])
const ARTICLE = /^(le|la|les|l) [a-z0-9]+$/
const pop = new Map()
for (const c of sel) pop.set(c.nom, Math.max(pop.get(c.nom) || 0, c.population || 0))
const drapeau = (nom) => {
  const k = n(nom)
  if (CP.has(k)) return '#'
  if (MAJ.has(k)) return '!'
  // « article + un mot » d'une petite commune : Le Tablier, La Ronde, Les Gonds, Le Pin, La Vallée, Le Givre… majuscule exigée.
  if (ARTICLE.test(k) && (pop.get(nom) || 0) < 10000) return '!'
  return ''
}
const lignes = [...parNom.entries()].sort((a, b) => a[0].localeCompare(b[0], 'fr')).map(([nom, cps]) => `${drapeau(nom)}${nom}|${[...cps].sort().join(',')}`)
const donnees = lignes.join(';')
if (/[`\$]/.test(donnees)) throw new Error('caractère interdit dans les données')
const code = fs.readFileSync(VILLE, 'utf8')
const re = /const DONNEES = `[^`]*`/
const reNb = /plus\. \d+ noms\./
if (!re.test(code) || !reNb.test(code)) throw new Error('lib/ville.ts : DONNEES ou le décompte introuvable')
// Remplacement par fonction : une chaîne de remplacement interpréterait $' et $& (memoire : replace-chaine-et-heredoc).
const sortie = code.replace(re, () => 'const DONNEES = `' + donnees + '`').replace(reNb, () => `plus. ${parNom.size} noms.`)
fs.writeFileSync(VILLE, sortie)
console.log('maj', lignes.filter(l=>l.startsWith('!')).length, 'cp', lignes.filter(l=>l.startsWith('#')).map(l=>l.split('|')[0]).join(','), 'communes', parNom.size, 'octets', Buffer.byteLength(sortie))
