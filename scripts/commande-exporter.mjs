// Exporte une commande payée vers le dossier source du générateur de sites.
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'
import { createClient } from '@supabase/supabase-js'
import { erreursFabrication } from '../lib/siteCommande.ts'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LARGEURS = [480, 960, 1600]
const USAGE = 'Usage : node --import ./scripts/ts-loader.mjs scripts/commande-exporter.mjs <commande_id> --sortie=<dossier> [--depuis=<fichier.json> --hote-photos=<url>]'

function refuser(code, message) {
  console.error(message)
  process.exit(code)
}

function option(nom, argumentsOptions) {
  return argumentsOptions.find((x) => x.startsWith(`--${nom}=`))?.slice(nom.length + 3)
}

function dans(parent, enfant) {
  const relatif = path.relative(parent, enfant)
  return relatif === '' || (!relatif.startsWith(`..${path.sep}`) && relatif !== '..' && !path.isAbsolute(relatif))
}

async function cheminPhysique(cible) {
  let courant = cible
  const suffixe = []
  while (true) {
    try { return path.join(await fs.realpath(courant), ...suffixe.reverse()) }
    catch (erreur) {
      if (erreur.code !== 'ENOENT') throw erreur
      const parent = path.dirname(courant)
      if (parent === courant) throw erreur
      suffixe.push(path.basename(courant))
      courant = parent
    }
  }
}

function nomFichier(url) {
  try { return decodeURIComponent(new URL(url).pathname.split('/').pop() || 'photo') }
  catch { return 'photo' }
}

function clePhoto(url, baseProjet, artisanId) {
  try {
    const source = new URL(url)
    const racine = new URL(baseProjet)
    const prefixe = `${racine.pathname.replace(/\/$/, '')}/storage/v1/object/public/artisan-media/${artisanId}/`
    if (source.origin !== racine.origin || source.search || source.hash || !source.pathname.startsWith(prefixe)) return null
    const chemin = decodeURIComponent(source.pathname.slice(prefixe.length))
    if (!chemin || chemin.split('/').some((morceau) => !morceau || morceau === '.' || morceau === '..' || morceau.includes('\\'))) return null
    return `${artisanId}/${chemin}`
  } catch { return null }
}

function basePhoto(url, utilisees) {
  const nom = nomFichier(url).replace(/\.[^.]+$/, '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'photo'
  let base = nom, numero = 2
  while (utilisees.has(base)) base = `${nom}-${numero++}`
  utilisees.add(base)
  return base
}

async function main() {
  const [id, ...options] = process.argv.slice(2)
  const sortieArg = option('sortie', options)
  const depuis = option('depuis', options)
  const hoteArg = option('hote-photos', options)
  if (!/^[0-9a-f-]{36}$/i.test(id || '') || !sortieArg || options.some((o) => !/^--(?:sortie|depuis|hote-photos)=.+$/.test(o)) || (hoteArg && !depuis)) refuser(2, USAGE)
  const sortie = await cheminPhysique(path.resolve(sortieArg))
  const racine = await fs.realpath(RACINE)
  const travail = path.join(racine, '.orchestre', 'travail')
  if (dans(path.join(racine, 'public'), sortie) || (dans(racine, sortie) && !dans(travail, sortie)) || sortie === travail) refuser(2, 'Sortie refusée : choisir un dossier hors public, ou sous .orchestre/travail/.')

  // Même chargement discret que site-deposer ; les variables déjà fournies prévalent.
  try {
    const lignes = (await fs.readFile(path.join(racine, '.env.local'), 'utf8')).split(/\r?\n/)
    for (const ligne of lignes) {
      const correspondance = ligne.match(/^\s*([A-Z0-9_]+)=(.*)$/)
      if (correspondance && !process.env[correspondance[1]]) process.env[correspondance[1]] = correspondance[2].trim().replace(/^["']|["']$/g, '')
    }
  } catch (erreur) { if (erreur.code !== 'ENOENT') throw erreur }
  const projet = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!projet) refuser(2, 'Configuration Supabase absente.')
  let hote = null
  if (hoteArg) {
    try {
      hote = new URL(hoteArg)
      if (!['127.0.0.1', 'localhost', '[::1]'].includes(hote.hostname) || !['http:', 'https:'].includes(hote.protocol)) throw new Error('hôte interdit')
    } catch { refuser(2, 'Hôte des photos invalide.') }
  }
  let admin
  if (!depuis) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) refuser(2, 'Configuration Supabase absente.')
    admin = createClient(projet, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
  }
  let commande, artisan
  if (depuis) {
    const fichier = JSON.parse(await fs.readFile(path.resolve(depuis), 'utf8'))
    commande = fichier.commande
    artisan = fichier.artisan
  } else {
    const resultat = await admin.from('sites_commandes').select('*').eq('id', id).maybeSingle()
    if (resultat.error) throw new Error('Lecture de la commande impossible')
    commande = resultat.data
    if (commande) {
      const profil = await admin.from('artisans').select('*').eq('id', commande.artisan_id).maybeSingle()
      if (profil.error) throw new Error('Lecture du profil impossible')
      artisan = profil.data
    }
  }
  if (!commande || commande.id !== id || !artisan || commande.artisan_id !== artisan.id || !['payee', 'generee'].includes(commande.etat)) refuser(3, 'Commande payée et profil correspondant requis.')
  const erreurs = erreursFabrication(commande)
  if (erreurs.length) refuser(3, erreurs.join('\n'))
  const telephone = artisan.tel_public || artisan.tel
  if (!telephone && !commande.email) refuser(3, 'Téléphone ou adresse de contact requis.')

  const photos = []
  const attributions = []
  const fichiers = []
  const refusees = []
  const bases = new Set()
  const stockage = admin?.storage.from('artisan-media')
  async function lire(cle) {
    if (hote) {
      const adresse = new URL(`${hote.href.replace(/\/$/, '')}/${cle.split('/').map(encodeURIComponent).join('/')}`)
      const reponse = await fetch(adresse, { redirect: 'error' })
      if (!reponse.ok) throw new Error('Photo inaccessible')
      return Buffer.from(await reponse.arrayBuffer())
    }
    const resultat = await stockage.download(cle)
    if (resultat.error || !resultat.data) throw new Error('Photo inaccessible')
    return Buffer.from(await resultat.data.arrayBuffer())
  }
  async function traiter(photo, logo = false) {
    const url = logo ? photo : photo?.url
    const cle = clePhoto(url, projet, artisan.id)
    if (!cle) { refusees.push(nomFichier(url)); return null }
    try {
      const source = await lire(cle)
      const meta = await sharp(source, { limitInputPixels: 100_000_000 }).metadata()
      if (!['jpeg', 'png', 'webp'].includes(meta.format) || !meta.width || !meta.height) throw new Error('Format refusé')
      const largeurs = LARGEURS.filter((l) => l <= meta.width)
      if (!largeurs.length) throw new Error('Image trop étroite')
      const base = logo ? basePhoto('logo', bases) : basePhoto(url, bases)
      const legende = logo ? 'Logo de l’artisan' : (photo.legende || 'Chantier de l’artisan')
      for (const largeur of largeurs) for (const extension of ['webp', 'avif']) {
        const resultat = await sharp(source).rotate().resize({ width: largeur, withoutEnlargement: true }).toFormat(extension).toBuffer({ resolveWithObject: true })
        const nom = `${base}-${largeur}.${extension}`
        fichiers.push({ nom, octets: resultat.data })
        attributions.push({ fichier: `images/${nom}`, base, largeur: resultat.info.width, hauteur: resultat.info.height, largeurs, legende, alt: legende, auteur: artisan.nom, licence: 'propriétaire', source: url, modifiee: 'Oui — recadrée et compressée par Presti' })
      }
      return logo ? true : { url, legende: photo.legende, role: photo.role, base }
    } catch { refusees.push(nomFichier(url)); return null }
  }
  for (const photo of commande.matiere.photos || []) {
    const valide = await traiter(photo)
    if (valide) photos.push(valide)
  }
  if (commande.matiere.logo_url) await traiter(commande.matiere.logo_url, true)
  if (refusees.length) console.error(`Photos refusées : ${refusees.join(', ')}`)
  if (photos.length < 3 || (commande.matiere.logo_url && refusees.includes(nomFichier(commande.matiere.logo_url)))) refuser(3, `Dossier incomplet : ${photos.length} photos valides.`)

  const matiere = commande.matiere
  const exporte = {
    id: commande.id, etat: commande.etat, slug: artisan.slug, nom: artisan.nom, email: commande.email,
    telephone, metier: commande.metier, metiers_secondaires: commande.metiers_secondaires,
    communes: commande.communes, domaine_mode: commande.domaine_mode, domaine: commande.domaine,
    devis: { projets: [...matiere.prestations, 'Autre ouvrage'], delais: ['Dans les trois mois', 'Dans trois à six mois', 'Plus tard, je me renseigne'] },
    matiere: { photos, logo_url: matiere.logo_url, adresse: matiere.adresse, siren: matiere.siren, horaires: matiere.horaires, decennale: matiere.decennale, avis_google: matiere.avis_google, artisan: matiere.artisan, prestations: matiere.prestations },
  }
  await fs.mkdir(path.join(sortie, 'photos'), { recursive: true })
  await fs.writeFile(path.join(sortie, 'commande.json'), JSON.stringify(exporte, null, 2) + '\n')
  for (const fichier of fichiers) await fs.writeFile(path.join(sortie, 'photos', fichier.nom), fichier.octets)
  await fs.writeFile(path.join(sortie, 'photos', 'attributions.json'), JSON.stringify(attributions, null, 2) + '\n')
  console.log(`Export terminé : ${photos.length} photos, ${fichiers.length} fichiers, ${sortie}`)
}

main().catch(() => refuser(1, 'Export impossible.'))
