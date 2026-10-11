#!/usr/bin/env node
// Quatre sabotages réversibles de la production (fiche 026-152, contre-vérification du 04/10) : pour chacun, le sha256 du fichier
// avant, la faute plantée (un remplacement de texte exact, présent une seule fois), le juge lancé sur l'arbre saboté, le verdict
// lu (la ligne « FAIL <critère> — … » et le bilan), le fichier rétabli octet pour octet, le sha256 après. Lancé dans un bac
// jetable de l'usine (node scripts/usine.mjs executer) : jamais sur l'arbre du PC, où d'autres sessions écrivent.
// Code 0 si les quatre sont pris sur le critère attendu ET les quatre fichiers sont revenus à leur empreinte.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawnSync } from 'node:child_process'

const RACINE = process.cwd()
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex')
const SABOTAGES = [
  { juge: 'tresorerie', critere: 'TR-4', fichier: 'lib/direction/tresorerie.ts', avant: 'marge: (recettesNettesCents - depensesCents) / 100', apres: 'marge: (recettesNettesCents + depensesCents) / 100', nom: 'la marge du mois additionne les dépenses au lieu de les soustraire' },
  { juge: 'lien-connexion', critere: 'LC-2', fichier: 'app/api/auth/lien/route.ts', avant: "  if (await isBanned(ip)) return refus('Accès refusé.', 403)", apres: '', nom: 'le contrôle des adresses bannies retiré de la route du lien de connexion' },
  { juge: 'dossier-zip', critere: 'DZ-2', fichier: 'lib/siteDossier.ts', avant: 'jours = 90, deps: Dependances = {}', apres: 'jours = 3650, deps: Dependances = {}', nom: 'le lien du dossier valable dix ans au lieu de 90 jours' },
  { juge: 'complement-dossier', critere: 'CD-4', fichier: 'lib/siteCommandeServeur.ts', avant: ".eq('id', commandeId).eq('artisan_id', uid).eq('etat', 'payee').is('genere_le', null)", apres: ".eq('id', commandeId).eq('etat', 'payee').is('genere_le', null)", nom: "la mise à jour du dossier n'est plus bornée à l'artisan propriétaire" },
]
const bilans = []
let ok = true
for (const s of SABOTAGES) {
  const f = path.join(RACINE, s.fichier)
  const original = fs.readFileSync(f)
  const avantSha = sha(original)
  const texte = original.toString('utf8')
  const n = texte.split(s.avant).length - 1
  let verdict = '', code = null, ligne = null, bilan = null, apresSha = null, restaure = false
  try {
    if (n !== 1) throw new Error(`« avant » présent ${n} fois dans ${s.fichier}`)
    fs.writeFileSync(f, Buffer.from(texte.replace(s.avant, () => s.apres), 'utf8'))
    const r = spawnSync(process.execPath, ['--import', './scripts/ts-loader.mjs', `scripts/${s.juge}-qa.mjs`], { cwd: RACINE, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } })
    code = r.status
    const L = `${r.stdout}\n${r.stderr}`.split(/\r?\n/)
    ligne = L.filter((l) => l.startsWith(`FAIL ${s.critere} — `))
    bilan = L.filter((l) => /^[\w.-]+(?: --[\w=.-]+)* : (PASS|FAIL)/.test(l)).at(-1) ?? null
  } catch (e) { verdict = `erreur : ${e.message}` }
  finally {
    fs.writeFileSync(f, original)
    apresSha = sha(fs.readFileSync(f))
    restaure = apresSha === avantSha
  }
  const pris = code === 1 && ligne?.length === 1 && bilan?.includes(s.critere)
  if (!pris || !restaure) ok = false
  bilans.push({ ...s, code, pris: Boolean(pris), restaure, avantSha, apresSha, ligne: ligne?.[0] ?? null, bilan, verdict })
  console.log(`${pris ? 'PRIS    ' : 'NON PRIS'} ${s.critere} (${s.juge}) — ${s.nom} : code ${code} · sha256 ${restaure ? 'restauré' : 'DIFFÉRENT'} (${avantSha.slice(0, 8)}…) · ${ligne?.[0]?.slice(0, 200) ?? verdict}`)
}
fs.mkdirSync(path.join(RACINE, '.orchestre/preuves/026-152'), { recursive: true })
fs.writeFileSync(path.join(RACINE, '.orchestre/preuves/026-152/sabotages-reversibles.json'), `${JSON.stringify(bilans, null, 2)}\n`)
console.log(`sabotages-reversibles : ${ok ? 'PASS' : 'FAIL'} — ${bilans.filter((b) => b.pris).length}/${bilans.length} pris, ${bilans.filter((b) => b.restaure).length}/${bilans.length} fichiers restaurés`)
process.exitCode = ok ? 0 : 1
