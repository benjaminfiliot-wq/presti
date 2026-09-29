import fs from 'node:fs'
import path from 'node:path'

const dossier = process.argv[2]
const optionMeta = process.argv.slice(3).find((argument) => argument.startsWith('--meta-logement='))
if (!dossier || process.argv.slice(3).some((argument) => !argument.startsWith('--meta-logement='))) {
  console.error('Usage : textes.mjs <dossier-pack> [--meta-logement=<fichier>]')
  process.exit(1)
}

function propre(valeur) {
  return typeof valeur === 'string' ? valeur.replace(/\s+/g, ' ').trim() : ''
}

function choisir(morceaux, limite) {
  const retenus = morceaux.filter(Boolean)
  while (retenus.join(' ').length > limite && retenus.length > 1) retenus.splice(retenus.length - 2, 1)
  if (retenus.join(' ').length <= limite) return retenus.join(' ')
  const mots = retenus[0].split(' ')
  while (mots.join(' ').length > limite) mots.pop()
  return mots.join(' ')
}

function terminer(texte) {
  return /[.!?]$/.test(texte) ? texte : `${texte}.`
}

try {
  const pack = JSON.parse(fs.readFileSync(path.join(dossier, 'pack.json'), 'utf8'))
  const faits = pack.matiere?.faits ?? pack.matiere ?? {}
  const metier = propre(faits.metier)
  const ville = propre(faits.ville)
  if (!metier || !ville) throw new Error('Métier et ville requis dans pack.json')
  const communes = Array.isArray(faits.communes) ? faits.communes.map(propre).filter((commune) => commune && commune !== ville) : []
  const duree = propre(faits.duree_travaux)
  const materiaux = propre(faits.materiaux)
  const telephone = propre(faits.telephone)
  const cta = faits.cta === 'appel' && telephone ? `Appelez le ${telephone}` : faits.cta === 'message' ? 'Écrivez-nous' : 'Demandez votre devis'
  const amorces = {
    artisan_de_confiance: `Votre projet de ${metier} à ${ville} ?`,
    avant_apres: `Un projet de ${metier} à ${ville} ?`,
    proximite_locale: `${metier} à ${ville} et aux alentours.`,
    reactivite: `Un projet de ${metier} à ${ville} ?`,
    garantie_decennale: `Un projet de ${metier} à ${ville} ?`,
    avis_clients: `Votre projet de ${metier} à ${ville} ?`,
    savoir_faire: `${metier} à ${ville} : parlons de votre projet.`,
    intervention_rapide: `Besoin de ${metier} à ${ville} ?`,
  }
  const accroche = propre(pack.matiere?.accroche)
  const introduction = amorces[accroche] ?? `Un projet de ${metier} à ${ville} ?`
  const garantie = faits.decennale === true ? 'Garantie décennale.' : ''
  const lieu = communes.length ? `Aussi à ${communes.join(', ')}.` : ''
  const variantes = [
    {
      texte: choisir([introduction, materiaux && `Matériaux : ${materiaux}.`, garantie, terminer(cta)], 125),
      titre: choisir([metier, `à ${ville}`], 40),
      description: choisir([terminer(cta)], 30),
    },
    {
      texte: choisir([`Besoin de ${metier} à ${ville} ?`, lieu, duree && `Durée des travaux : ${duree}.`, terminer(cta)], 125),
      titre: choisir([`Votre projet à ${ville}`], 40),
      description: choisir([terminer(cta)], 30),
    },
    {
      texte: choisir([`${metier} à ${ville}.`, duree && `Travaux : ${duree}.`, materiaux && `Matériaux : ${materiaux}.`, terminer(cta)], 125),
      titre: choisir([`${metier} à ${ville}`], 40),
      description: choisir([terminer(cta)], 30),
    },
  ]
  const sortie = path.join(dossier, 'sortie')
  fs.mkdirSync(sortie, { recursive: true })
  const lignes = variantes.map((variante, indice) => `## Variante ${indice + 1}\nTexte : ${variante.texte}\nTitre : ${variante.titre}\nDescription : ${variante.description}`)
  fs.writeFileSync(path.join(sortie, 'textes.md'), `${lignes.join('\n\n')}\n`, 'utf8')

  const fichierMeta = optionMeta ? optionMeta.slice('--meta-logement='.length) : 'docs/pubs/meta-logement.json'
  let statut = 'a_verifier'
  try { statut = JSON.parse(fs.readFileSync(fichierMeta, 'utf8')).statut } catch { /* Sans constat, la catégorie reste à vérifier. */ }
  const fichierFiche = path.join(sortie, 'fiche-10-min.md')
  if (statut !== 'oui' && statut !== 'non') {
    if (fs.existsSync(fichierFiche)) fs.unlinkSync(fichierFiche)
    console.error('catégorie Logement non vérifiée : geste de Benj')
    process.exit(3)
  }

  const etapes = [
    'Ouvrez le Gestionnaire de publicités depuis la Page Facebook de votre entreprise. Choisissez l’objectif « Messages » ou « Prospects ». ',
    statut === 'oui'
      ? `Cochez la catégorie spéciale « Logement ». Ciblez par rayon autour de ${ville}. Ne réglez ni l’âge ni le genre.`
      : `Ciblez par rayon autour de ${ville}.`,
    'Importez les trois vidéos au format 1080×1920, 15 s, et les trois visuels. Collez les variantes de textes.md.',
    ...(pack.matiere?.voix === 'synthese' ? ['Gardez la mention « Voix générée par IA » à l’écran. Si Meta propose « Infos IA », acceptez de déclarer ce contenu IA.'] : []),
    'Choisissez vous-même le budget et la durée de la campagne.',
    ...(propre(pack.site) ? [`Renseignez votre adresse de destination : ${propre(pack.site)}`] : []),
    'Le lien pour récupérer vos fichiers expire dans 30 jours.',
  ]
  fs.writeFileSync(fichierFiche, `# Lancer votre publicité en 10 min\n\n${etapes.map((etape, indice) => `${indice + 1}. ${etape.trim()}`).join('\n')}\n`, 'utf8')
} catch (erreur) {
  console.error(erreur.message)
  process.exit(1)
}
