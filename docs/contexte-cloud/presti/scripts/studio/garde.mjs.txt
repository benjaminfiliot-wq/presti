#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

// Toute lecture de contenu se fait dans le vault choisi. Les chemins internes
// sont vérifiés avant l'ouverture pour éviter qu'un lien sorte du vault.
function refuser(motif) {
  console.error(`Studio : ${motif}`)
  process.exit(3)
}

const argumentsRecus = process.argv.slice(2)
const options = new Map()
for (const argument of argumentsRecus) {
  const correspondance = /^--(marque|vault)=(.+)$/.exec(argument)
  if (!correspondance || options.has(correspondance[1])) refuser(`argument invalide : ${argument}`)
  options.set(correspondance[1], correspondance[2])
}
const cle = options.get('marque')
if (!cle || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(cle)) refuser('marque : clé invalide')
const vault = path.resolve(options.get('vault') || path.join(os.homedir(), 'presti-studio'))
const marque = path.join(vault, 'marques', cle)

function fichierSur(vise, libelle) {
  const relatif = path.relative(vault, vise)
  if (relatif.startsWith('..') || path.isAbsolute(relatif)) refuser(`${libelle} : hors vault`)
  let courant = vault
  for (const partie of relatif.split(path.sep)) {
    courant = path.join(courant, partie)
    let etat
    try { etat = fs.lstatSync(courant) }
    catch { refuser(`${libelle} manquant`) }
    if (etat.isSymbolicLink()) refuser(`${libelle} : lien symbolique interdit`)
  }
  return vise
}

function lire(vise, libelle) {
  fichierSur(vise, libelle)
  let etat
  try { etat = fs.statSync(vise) } catch { refuser(`${libelle} manquant`) }
  if (!etat.isFile()) refuser(`${libelle} : fichier attendu`)
  return fs.readFileSync(vise, 'utf8')
}

function dateValide(texte) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texte)
  if (!m) return false
  const jour = Number(m[1]), mois = Number(m[2]), annee = Number(m[3])
  const date = new Date(Date.UTC(annee, mois - 1, jour))
  return date.getUTCFullYear() === annee && date.getUTCMonth() === mois - 1 && date.getUTCDate() === jour && date.getTime() <= Date.now()
}

function exigerLigne(texte, debut) {
  const ligne = texte.split(/\r?\n/).find((l) => l.startsWith(debut))
  if (!ligne || !dateValide((ligne.slice(debut.length).match(/^\s*(\d{2}\/\d{2}\/\d{4})/) || [])[1])) refuser(`${debut} JJ/MM/AAAA manquant`)
  return ligne
}

try {
  fichierSur(marque, `marques/${cle}`)
  const prealables = lire(path.join(vault, 'prealables.md'), 'prealables.md')
  const chaine = prealables.split(/\r?\n/).find((l) => l.startsWith('Chaîne gratuite lue le'))
  if (!chaine && prealables.includes('Conditions ElevenLabs')) refuser('Conditions ElevenLabs : Chaîne gratuite lue le manquante')
  const ligneChaine = exigerLigne(prealables, 'Chaîne gratuite lue le')
  for (const element of ['Kokoro ff_siwis', 'FLUX.1 schnell', 'sorties de Cloudflare Workers AI']) {
    if (!ligneChaine.includes(element)) refuser(`Chaîne gratuite lue le : ${element} manquant`)
  }
  if (!/droit commercial\s*:\s*oui\b/i.test(ligneChaine)) refuser('droit commercial : non ou non attesté')
  exigerLigne(prealables, 'Fiche ARPP lue le')
  exigerLigne(prealables, 'Activité déclarée le')

  const accord = lire(path.join(marque, 'accord-photos.md'), 'accord-photos.md')
  if (!accord.trim()) refuser('accord-photos.md vide')
  if (!/Message-ID\s*:\**\s*<?[^\s<>]+@[^\s<>]+>?/i.test(accord)) refuser('accord-photos.md : Message-ID manquant')
  const dateAccord = accord.match(/(?:Reçu le|Date)\s*:?\**\s*(\d{2}\/\d{2}\/\d{4})/i)
  if (!dateAccord || !dateValide(dateAccord[1])) refuser('accord-photos.md : date manquante')

  const noms = fs.readdirSync(marque)
  const aujourdHui = Date.now()
  const pages = noms.filter((n) => /^page-produit-\d{4}-\d{2}-\d{2}\.html$/.test(n)).filter((n) => {
    const m = /^page-produit-(\d{4})-(\d{2})-(\d{2})\.html$/.exec(n)
    const date = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
    const exacte = new Date(date)
    return exacte.getUTCFullYear() === Number(m[1]) && exacte.getUTCMonth() + 1 === Number(m[2]) && exacte.getUTCDate() === Number(m[3]) && date <= aujourdHui && aujourdHui - date < 30 * 86_400_000 && lire(path.join(marque, n), n).trim().length > 0
  })
  if (!pages.length) refuser('page-produit-AAAA-MM-JJ.html de moins de 30 jours manquante')

  const registre = lire(path.join(vault, 'registre-refus.csv'), 'registre-refus.csv')
  if (registre.split(/\r?\n/).some((ligne) => ligne.split(',')[0].trim() === cle)) refuser('registre-refus.csv : marque refusée')

  for (const nom of noms.filter((n) => /^echantillon-\d+$/.test(n))) {
    const dossier = path.join(marque, nom)
    fichierSur(dossier, nom)
    if (!fs.statSync(dossier).isDirectory()) refuser(`${nom} : dossier attendu`)
    const statut = path.join(dossier, 'statut.txt')
    if (fs.existsSync(statut) && /\brefuse\b/i.test(lire(statut, `${nom}/statut.txt`))) refuser(`${nom}/statut.txt : refuse`)
  }

  let numero = 1
  while (noms.includes(`echantillon-${numero}`)) numero++
  const destination = path.join(marque, `echantillon-${numero}`)
  fs.mkdirSync(destination)
  fs.writeFileSync(path.join(destination, 'script.json'), JSON.stringify({ marque: cle, produit: '', lignes: [], allegations: [], presentateur_virtuel: false }, null, 2) + '\n', { flag: 'wx' })
  fs.writeFileSync(path.join(destination, 'CONSIGNES.md'), '# Consignes de l’échantillon\n\nDémonstration seulement. Chaque allégation vient de la page produit datée et porte son extrait exact. Écrire les nombres en lettres pour la voix. Annoncer tout présentateur virtuel. Aucun visage réel. Jamais publié.\n', { flag: 'wx' })
  console.log(destination)
} catch (erreur) {
  if (erreur?.code === 'EEXIST') refuser('echantillon : numéro déjà pris')
  refuser(erreur.message)
}
