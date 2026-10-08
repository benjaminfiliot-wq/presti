// Liste d'appels : artisans RGE (données ouvertes ADEME, B2B) autour de Marans/La Rochelle, SANS site internet, avec téléphone.
import fs from 'node:fs'
const B = 'https://data.ademe.fr/data-fair/api/v1/datasets/liste-des-entreprises-rge-2/lines'
const DEPS = ['17', '85', '79', '16']
const brut = []
for (const d of DEPS) {
  let url = `${B}?size=1000&select=${encodeURIComponent('siret,nom_entreprise,adresse,code_postal,commune,telephone,site_internet,email,domaine,nom_qualification,nom_certificat')}&qs=${encodeURIComponent(`code_postal:${d}*`)}`
  for (let page = 0; page < 20 && url; page++) {
    const r = await fetch(url, { headers: { 'user-agent': 'Presti-liste (contact fondateur)' } })
    if (!r.ok) { console.log('HTTP', r.status, d); break }
    const j = await r.json()
    brut.push(...(j.results || []))
    url = j.next || null
    await new Promise((s) => setTimeout(s, 600))
  }
}
const par = new Map()
for (const x of brut) {
  const k = x.siret || `${x.nom_entreprise}|${x.code_postal}`
  const e = par.get(k) || { ...x, domaines: new Set() }
  if (x.domaine) e.domaines.add(x.domaine)
  par.set(k, e)
}
const tel = (s) => String(s || '').replace(/[^0-9+]/g, '')
const sans = [...par.values()].filter((e) => !String(e.site_internet || '').trim() && tel(e.telephone).length >= 9)
// proximité : Charente-Maritime d'abord, 17230 (Marans) en tête
const rang = (e) => (String(e.code_postal).startsWith('172') ? 0 : String(e.code_postal).startsWith('17') ? 1 : 2)
sans.sort((a, b) => rang(a) - rang(b) || String(a.commune).localeCompare(String(b.commune)))
const ligne = (e) => [e.nom_entreprise, e.commune, e.code_postal, e.telephone, [...e.domaines].join(' / '), e.adresse, e.siret].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')
fs.writeFileSync('appels-sans-site.csv', '﻿' + ['Entreprise;Commune;CP;Téléphone;Métier(s) RGE;Adresse;SIRET', ...sans.map(ligne)].join('\n'), 'utf8')
console.log('lignes ADEME lues', brut.length, '· entreprises distinctes', par.size, '· SANS site avec téléphone', sans.length, '· dont 17 :', sans.filter((e) => rang(e) < 2).length)
