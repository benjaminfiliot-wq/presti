// Les emails du produit — chaque point d'envoi est connu, nommé, et dit quelque chose de vrai.
//
// Sans IA, sans envoi : on lit le code. Vingt-neuf endroits envoient un email ; ce test refuse
// (1) un envoi sans sujet, (2) un envoi vers la boîte morte contact@prestiapp.fr, (3) un type de
// notification artisan inconnu des préférences (l'artisan ne pourrait pas le couper), et
// (4) un point d'envoi qui apparaîtrait sans être ajouté ici — la liste ci-dessous est la
// carte des emails, tenue à jour à la main (prompt v6 §2.2).
//
// Usage : node scripts/emails-e2e.mjs
import fs from 'node:fs'
import path from 'node:path'

let ok = 0, ko = 0
const T = (n, c, d = '') => { if (c) { ok++; console.log(`  ✅ ${n}`) } else { ko++; console.log(`  ❌ ${n}${d ? ` — ${d}` : ''}`) } }

/** La carte : fichier → ce que l'email fait. Un nouveau point d'envoi doit s'y inscrire. */
const CARTE = {
  'app/api/account/inscription/route.ts': 'entreprise : un artisan vient de s’inscrire',
  'app/api/auth/reset-request/route.ts': 'artisan : lien de réinitialisation du mot de passe',
  'app/api/auth/code/route.ts': 'artisan : code de connexion à 6 chiffres (v7 bloc 2, critique : jamais bloqué par le plafond)',
  'app/api/contact/route.ts': 'entreprise : message du formulaire /contact',
  'app/api/conversation/route.ts': 'artisan : nouveau message / réponse envoyée / demande sensible',
  'app/api/conversation/stream/route.ts': 'artisan : nouveau message sur le fil',
  'app/api/conversation/devis/route.ts': 'artisan : devis accepté ou modification demandée',
  'app/api/cron/relances/route.ts': 'prospect : relance J+2/5/10 au nom de l’artisan',
  'app/api/devis/[id]/envoyer/route.ts': 'prospect : le devis PDF, au nom de l’artisan',
  'app/api/leads/contact/route.ts': 'artisan + prospect : coordonnées laissées après coup',
  'app/api/leads/route.ts': 'artisan : nouvelle demande ; prospect : première réponse',
  'app/api/messages/route.ts': 'prospect : réponse de l’artisan depuis sa boîte',
  'app/api/p/auth/route.ts': 'client : lien magique de connexion',
  'app/api/report-error/route.ts': 'entreprise : erreur signalée par le navigateur',
  'app/api/stripe/webhook/route.ts': 'entreprise : paiement / résiliation / webhook en erreur',
  'lib/alertes.ts': 'entreprise et artisan : les huit motifs d’alerte',
  'lib/purgeComptes.ts': 'entreprise : compte purgé ou anonymisé',
  'lib/reglesServeur.ts': 'artisan : devis préparé ou envoyé par une règle',
}
const TYPES = (fs.readFileSync('lib/notifications.ts', 'utf8').match(/export type TypeNotification = ([^\n]+)/) || ['', ''])[1].match(/'([a-z_]+)'/g)?.map((t) => t.replace(/'/g, '')) ?? []
T('les types de notification artisan sont lus', TYPES.length >= 3, TYPES.join(','))

function* fichiers(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name).replace(/\\/g, '/')
    if (e.isDirectory()) yield* fichiers(p); else if (/\.(ts|tsx)$/.test(p)) yield p
  }
}
const sites = []
for (const p of [...fichiers('app'), ...fichiers('lib')]) {
  if (/^lib\/(email|notifications|alerteService)\.ts$/.test(p)) continue
  const src = fs.readFileSync(p, 'utf8')
  for (const m of src.matchAll(/(sendEmail|notifierArtisan|notifierEntreprise)\(/g)) {
    const bloc = src.slice(m.index, m.index + 900)
    const ligne = src.slice(0, m.index).split('\n').length
    const sujet = (bloc.match(/subject:\s*(`[^`]*`|'[^']*'|"[^"]*")/) || [])[1] ?? (m[1] === 'notifierEntreprise' ? (bloc.match(/notifierEntreprise\(\s*(`[^`]*`|'[^']*'|"[^"]*")/) || [])[1] ?? '' : '')
    const type = (bloc.match(/notifierArtisan\([^,]+,\s*'([^']+)'/) || [])[1] ?? ''
    sites.push({ fichier: p, ligne, fonction: m[1], sujet, type, bloc })
  }
}
console.log(`\n── ${sites.length} points d’envoi trouvés`)
const parFichier = new Set(sites.map((s) => s.fichier))
for (const f of parFichier) T(`${f} est sur la carte — ${CARTE[f] ?? '???'}`, !!CARTE[f], 'ajoutez-le à CARTE avec ce qu’il envoie')
for (const f of Object.keys(CARTE)) if (!parFichier.has(f)) console.log(`  ⏭  ${f} : plus aucun envoi (à retirer de la carte)`)

console.log('\n── Chaque envoi a un sujet, un destinataire vivant, un type connu')
for (const s of sites) {
  const ou = `${s.fichier}:${s.ligne}`
  // Un sujet peut être une expression (`artisan?.nom ? … : …`) : on exige qu'il soit posé, pas qu'il soit littéral.
  const sujetOk = s.fonction === 'notifierEntreprise' ? /notifierEntreprise\(\s*\S/.test(s.bloc) : /subject:\s*\S/.test(s.bloc)
  T(`${ou} ${s.fonction}${s.type ? ` (${s.type})` : ''} — sujet`, sujetOk, 'aucun sujet trouvé')
  if (s.type) T(`${ou} — type « ${s.type} » connu des préférences`, TYPES.includes(s.type), `types : ${TYPES.join(', ')}`)
  T(`${ou} — pas de boîte morte`, !/contact@prestiapp\.fr/.test(s.bloc))
}

console.log(`\n${ko ? '❌' : '✅'} ${ok} réussis, ${ko} échoués`)
process.exit(ko ? 1 : 0)
