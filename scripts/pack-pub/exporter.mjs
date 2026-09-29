#!/usr/bin/env node
// Repli du poste : sortir une commande payée sans modifier la base ni envoyer de courriel.
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const [packId, dossierArg, ...options] = process.argv.slice(2)
const optionFichier = options.find((o) => o.startsWith('--depuis-fichier='))
if (!packId || !dossierArg || options.length > 1 || (options.length && !optionFichier) || optionFichier === '--depuis-fichier=') {
  console.error('Usage : node scripts/pack-pub/exporter.mjs <pack_id> <dossier> [--depuis-fichier=<ligne.json>]')
  process.exit(2)
}

async function lireEntree() {
  if (optionFichier) {
    const contenu = JSON.parse(fs.readFileSync(optionFichier.slice('--depuis-fichier='.length), 'utf8'))
    return contenu.ligne ? contenu : { ligne: contenu, artisan: { slug: contenu.site_slug, domaine: contenu.site_domaine, domaine_verifie: !!contenu.site_domaine } }
  }
  for (const l of fs.existsSync('.env.local') ? fs.readFileSync('.env.local', 'utf8').split(/\r?\n/) : []) {
    const m = l.match(/^\s*([A-Z0-9_]+)=(.*)$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !cle) throw new Error('configuration Supabase absente')
  const admin = createClient(url, cle, { auth: { persistSession: false } })
  const { data: ligne, error } = await admin.from('packs_pubs').select('id, artisan_id, etat, matiere').eq('id', packId).maybeSingle()
  if (error || !ligne) throw new Error(error?.message || 'pack introuvable')
  if (ligne.etat !== 'payee') return { ligne, artisan: null }
  const { data: artisan, error: erreurArtisan } = await admin.from('artisans').select('slug, domaine, domaine_verifie').eq('id', ligne.artisan_id).maybeSingle()
  if (erreurArtisan || !artisan) throw new Error(erreurArtisan?.message || 'artisan introuvable')
  return { ligne, artisan }
}

try {
  const { ligne, artisan } = await lireEntree()
  if (ligne.id !== packId || ligne.etat !== 'payee') {
    console.error('✗ pack absent ou état différent de payee')
    process.exit(1)
  }
  if (!artisan?.slug) throw new Error('slug artisan absent')
  const dossier = path.resolve(dossierArg)
  const site = optionFichier ? artisan.slug : artisan.domaine && artisan.domaine_verifie
    ? `https://${artisan.domaine.replace(/^https?:\/\//, '').replace(/\/$/, '')}`
    : `https://prestiapp.fr/p/${artisan.slug}`
  fs.mkdirSync(dossier, { recursive: true })
  fs.writeFileSync(path.join(dossier, 'pack.json'), JSON.stringify({ pack_id: packId, matiere: ligne.matiere, site }, null, 2) + '\n')
  if (ligne.matiere?.voix === 'synthese' && !fs.existsSync(path.join(dossier, 'voix.mp3'))) {
    fs.writeFileSync(path.join(dossier, 'voix-a-produire.txt'), `voix à produire : ff_siwis\n${ligne.matiere.texte_voix ?? ''}\n`)
    console.log('Voix à produire : ff_siwis')
    process.exit(4)
  }
  console.log(`Pack ${packId} exporté`)
} catch (e) {
  console.error(`✗ export impossible : ${e.message}`)
  process.exit(1)
}
