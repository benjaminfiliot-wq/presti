// scripts/fixtures/026-pilotage/t/lot.mjs — la fiche du lot t (026-171, partie HORS LIGNE), lue par
// scripts/juges-026-pilotage-preuve.mjs --lot=t. Contrat de tout lot.mjs : voir scripts/fixtures/026-pilotage/a/lot.mjs.
//
// Référence : le commit du lot k (1c87006), le seul de la série que ce clone contienne (le commit du lot a, 4041ec9, n'y est pas) ; il
// porte lib/pilotage/ (equipage.ts, barre.ts, fil.ts…) mais NI lib/pilotage/{theme,disposition,reglages}.ts, NI public/station/, NI
// docs/ecommerce/, NI le drapeau ecommerce. Premier critère attendu en échec sur elle : TH-1, TH-7 (les deux thèmes), EC-1.
//
// Témoin (./temoin) : l'IMPLÉMENTATION DE RÉFÉRENCE minimale et correcte, écrite par Claude Code (aucun de ces fichiers n'est un module livré) :
//   - lib/pilotage/{theme,disposition,reglages}.ts : ce que 026-173 devra livrer, au contrat de t/CONTRAT.md ;
//   - public/station/themes/{station,vaisseau}/ : deux thèmes minimaux mais conformes (theme.json, licence.json, atlas.png, fond.webp),
//     dérivés du thème d'essai de 026-170 par t/fabriquer-temoin.mjs ;
//   - lib/flags.ts et scripts/fermeture-e2e.mjs de la référence à leurs seules lignes près (drapeau ecommerce, ligne de la CARTE),
//     docs/ecommerce/LISEZMOI.md, et une migration bénigne (0998) dont un sabotage fait une table « ecommerce ».
// L'autre sous-agent du lot (station-reglages-qa, poste-extraction-qa) pose ses fichiers dans le même dossier ./temoin ; ce lot-ci
// n'en parle pas (t/lot-b.mjs) et ne juge que les trois juges hors ligne.
//
// Les sabotages : un texte du témoin devient une faute que le juge doit nommer (`tue`). Ceux dont le premier critère reste vert sont
// les sabotages de CONTENU : chaque juge en porte plus de deux critères distincts. La liste, avec le critère qui rougit, est reprise
// dans .orchestre/preuves/026-171/echecs-attendus.md (section « lot t (partie hors ligne) »).
export const fiche = '026-171'
export const reference = '1c87006aa35a152cb918ab368225e1976a1328da'
export const temoin = './temoin'
const absentsA = ['lib/pilotage/theme.ts', 'lib/pilotage/disposition.ts', 'lib/pilotage/reglages.ts', 'public/station/themes/', 'docs/ecommerce/']
const BASE = `--base=${reference}`

const P = 'lib/pilotage'
const TH = `${P}/theme.ts`, DI = `${P}/disposition.ts`, RG = `${P}/reglages.ts`
const S = 'public/station/themes/station', V = 'public/station/themes/vaisseau'
const FLAGS = 'lib/flags.ts', FERM = 'scripts/fermeture-e2e.mjs', DOC = 'docs/ecommerce/LISEZMOI.md', MIG = 'supabase/migrations/0998_reservee_note.sql'
const COMMENTAIRE_DRAPEAU = '  /** Branche réservée par Benj le 25/09 : rien n’est construit ; elle attend ses trois vidéos sources. */\n'
const LOURD = 'x'.repeat(720 * 1024)

// Les sabotages d'un thème (les mêmes pour la Station et le Vaisseau, au nom du thème près).
const sabotagesTheme = (D, cle, nom) => [
  { nom: 'cle-du-theme-changee', fichier: `${D}/theme.json`, avant: `"cle": "${cle}",`, apres: `"cle": "${cle === 'station' ? 'vaisseau' : 'station'}",`, tue: 'TH-7' },
  { nom: 'reservee-avec-un-poste', fichier: `${D}/theme.json`, avant: '"porte":{"x":408,"y":176},"poste":null', apres: '"porte":{"x":408,"y":176},"poste":{"x":416,"y":152}', tue: 'TH-7' },
  { nom: 'portrait-retire', fichier: `${D}/theme.json`, avant: '"portrait": {', apres: '"portrait_": {', tue: 'TH-7' },
  { nom: 'coursive-coupee-au-bureau', fichier: `${D}/theme.json`, avant: '{"de":"j-39-23","a":"j-47-23","largeur":16},', apres: '', tue: 'TH-8' },
  { nom: 'coursive-coupee-en-portrait', fichier: `${D}/theme.json`, avant: '{"de":"pj-39-23","a":"pj-47-23","largeur":16},', apres: '', tue: 'TH-8' },
  { nom: 'trace-du-tapis-rompu', fichier: `${D}/theme.json`, avant: '{"x":16,"y":0},', apres: '', tue: 'TH-8' },
  { nom: 'fond-retire', fichier: `${D}/fond.webp`, retirer: true, tue: 'TH-9' },
  { nom: 'atlas-retire', fichier: `${D}/atlas.png`, retirer: true, tue: 'TH-9' },
  { nom: 'pack-hors-du-lot-a', fichier: `${D}/licence.json`, avant: '"dossier":"05-zwonky-spacers"', apres: '"dossier":"11-pack-achete"', tue: 'TH-10' },
  { nom: 'licence-cc-by', fichier: `${D}/licence.json`, avant: '"adresse":"https://opengameart.org/content/spacers","licence":"CC0"', apres: '"adresse":"https://opengameart.org/content/spacers","licence":"CC-BY 4.0"', tue: 'TH-10' },
  { nom: 'pack-sans-auteur', fichier: `${D}/licence.json`, avant: '"auteur":"zwonky"', apres: '"auteur":""', tue: 'TH-10' },
  { nom: 'licence-retiree', fichier: `${D}/licence.json`, retirer: true, tue: 'TH-10' },
  { nom: 'starnet-dans-le-nom', fichier: `${D}/theme.json`, avant: `"nom": "${nom}",`, apres: `"nom": "${nom} StarNet",`, tue: 'TH-12' },
  { nom: 'starnet-dans-la-licence', fichier: `${D}/licence.json`, avant: '"titre":"Spacers"', apres: '"titre":"Spacers StarNet"', tue: 'TH-12' },
  { nom: 'adresse-dans-une-plaque', fichier: `${D}/theme.json`, avant: '"plaque":{"x":16,"y":8,"texte":"Tour du Crieur"}', apres: '"plaque":{"x":16,"y":8,"texte":"http://exemple.invalid/x"}', tue: 'TH-12' },
  { nom: 'champ-de-code', fichier: `${D}/theme.json`, avant: ' "nuit": false,', apres: ' "nuit": false, "onclick": "x()",', tue: 'TH-12' },
]

const jugesA = [
  {
    commande: 'scripts/station-themes-qa.mjs', arguments: ['--partie=modules'], loader: false, attendu: 'TH-1', criteresMin: 6,
    sabotages: [
      // TH-1 : la pureté (lue)
      { nom: 'import-supabase', fichier: RG, avant: "import type { Theme } from './theme'", apres: "import type { Theme } from './theme'\nimport { supabaseAdmin } from '@/lib/supabaseAdmin'\nvoid supabaseAdmin", tue: 'TH-1' },
      { nom: 'date-now', fichier: DI, avant: 'const refus = (raison: string): VerdictDisposition => ({ ok: false, raison })', apres: 'const refus = (raison: string): VerdictDisposition => (void Date.now(), { ok: false, raison })', tue: 'TH-1' },
      { nom: 'math-random', fichier: RG, avant: "const INTERDITES = new Set(['__proto__', 'constructor', 'prototype'])", apres: "const INTERDITES = new Set(['__proto__', 'constructor', 'prototype']); void Math.random()", tue: 'TH-1' },
      { nom: 'fetch-dans-le-theme', fichier: TH, avant: "const RE_AVATAR = /^[a-z][a-z0-9_]{0,31}$/", apres: "const RE_AVATAR = /^[a-z][a-z0-9_]{0,31}$/\nvoid fetch('https://exemple.invalid/x')", tue: 'TH-1' },
      { nom: 'disposition-retiree', fichier: DI, retirer: true, tue: 'TH-1' },
      // TH-2 : validerTheme suit le schéma (premier critère TH-1 resté vert)
      { nom: 'couleur-libre-dans-le-theme', fichier: TH, avant: 'const RE_COULEUR = /^#[0-9A-Fa-f]{6}$/', apres: 'const RE_COULEUR = /^.+$/', tue: 'TH-2' },
      { nom: 'reservee-avec-un-poste-toleree', fichier: TH, avant: 'if (estObjet(e) && e.poste !== null && e.poste !== undefined) raisons.push', apres: 'if (false) raisons.push', tue: 'TH-2' },
      { nom: 'champ-inconnu-tolere', fichier: TH, avant: 'if (!requis.includes(k) && !facultatifs.includes(k)) raisons.push(', apres: 'if (false) raisons.push(', tue: 'TH-2' },
      { nom: 'portrait-ignore', fichier: TH, avant: "if ('portrait' in t && fermé(t.portrait, 'portrait', ['grille', 'emplacements', 'coursives'], [], raisons)) {", apres: 'if (false) {', tue: 'TH-2' },
      { nom: 'liste-des-themes-ouverte', fichier: TH, avant: "export const CLES_THEME = ['station', 'vaisseau'] as const", apres: "export const CLES_THEME = ['station', 'vaisseau', 'essai'] as const", tue: 'TH-2' },
      { nom: 'tapis-qui-saute-tolere', fichier: TH, avant: '{ raisons.push(`tapis : le tracé saute entre les points ${i - 1} et ${i}`); break }', apres: '{ break }', tue: 'TH-2' },
      // TH-3 : validerDisposition
      { nom: 'reservee-deplacable', fichier: DI, avant: 'if (d.salles[SALLE_RESERVEE.cle] !== undefined && d.salles[SALLE_RESERVEE.cle] !== reservee.cle) return refus(', apres: 'if (false) return refus(', tue: 'TH-3' },
      { nom: 'reservee-renommable', fichier: DI, avant: 'if (d.plaques && d.plaques[SALLE_RESERVEE.cle] !== undefined && d.plaques[SALLE_RESERVEE.cle] !== SALLE_RESERVEE.plaque) return refus(', apres: 'if (false) return refus(', tue: 'TH-3' },
      { nom: 'deux-salles-dans-un-emplacement-tolere', fichier: DI, avant: 'if (deja) return refus(', apres: 'if (false) return refus(', tue: 'TH-3' },
      { nom: 'salle-sans-emplacement-toleree', fichier: DI, avant: 'if (cle === undefined) return refus(', apres: 'if (false) return refus(', tue: 'TH-3' },
      { nom: 'portrait-non-verifie', fichier: DI, avant: 'if (theme.portrait) {', apres: 'if (false && theme.portrait) {', tue: 'TH-3' },
      { nom: 'salle-debranchee-toleree', fichier: DI, avant: 'if (!cles || ![...cles].some((x) => depart.has(x))) return refus(', apres: 'if (false) return refus(', tue: 'TH-3' },
      { nom: 'tapis-rompu-tolere', fichier: DI, avant: 'if (dx > pas || dy > pas || (dx === 0 && dy === 0)) return refus(', apres: 'if (false) return refus(', tue: 'TH-3' },
      { nom: 'etape-hors-du-tapis-toleree', fichier: DI, avant: 'for (const e of tapis.etapes) if (!sur.has(`${e.x},${e.y}`)) return refus(', apres: 'for (const e of tapis.etapes) if (false) return refus(', tue: 'TH-3' },
      { nom: 'emplacement-inconnu-tolere', fichier: DI, avant: "if (!cles.has(cle)) return refus(`L'emplacement « ${String(cle)} » n'existe pas dans ce thème.`)", apres: 'void 0', tue: 'TH-3' },
      // TH-4 : validerReglages
      { nom: 'taille-non-bornee', fichier: RG, avant: 'if (JSON.stringify(brut).length > TAILLE_MAX)', apres: 'if (JSON.stringify(brut).length > TAILLE_MAX * 100)', tue: 'TH-4' },
      { nom: 'nom-de-17-signes', fichier: RG, avant: "const RE_NOM = /^[\\p{L}\\p{N} '’-]{2,16}$/u", apres: "const RE_NOM = /^[\\p{L}\\p{N} '’-]{2,17}$/u", tue: 'TH-4' },
      { nom: 'plaque-de-25-signes', fichier: RG, avant: "const RE_PLAQUE = /^[\\p{L}\\p{N} '’-]{2,24}$/u", apres: "const RE_PLAQUE = /^[\\p{L}\\p{N} '’-]{2,25}$/u", tue: 'TH-4' },
      { nom: 'titre-de-33-signes', fichier: RG, avant: "const RE_TITRE = /^[\\p{L}\\p{N} '’-]{2,32}$/u", apres: "const RE_TITRE = /^[\\p{L}\\p{N} '’-]{2,33}$/u", tue: 'TH-4' },
      { nom: 'couleur-libre-dans-les-reglages', fichier: RG, avant: 'const RE_COULEUR = /^#[0-9A-Fa-f]{6}$/', apres: 'const RE_COULEUR = /^.+$/', tue: 'TH-4' },
      { nom: 'cles-permises-non-rendues', fichier: RG, avant: 'clesPermises: [...CLES_REGLAGES] }', apres: 'clesPermises: [] }', tue: 'TH-4' },
      { nom: 'avatar-hors-liste-tolere', fichier: RG, avant: "if ('avatar' in a && !(typeof a.avatar === 'string' && avatars.has(a.avatar))) raisons.push(", apres: "if (false) raisons.push(", tue: 'TH-4' },
      { nom: 'surcharge-de-root-permise', fichier: RG, avant: "objetFerme(r.couleurs, 'couleurs', Object.keys(theme?.palette ?? {}), raisons)", apres: "objetFerme(r.couleurs, 'couleurs', [...Object.keys(theme?.palette ?? {}), ':root'], raisons)", tue: 'TH-4' },
      { nom: 'heure-de-nuit-24', fichier: RG, avant: '(n[k] as number) <= 23', apres: '(n[k] as number) <= 24', tue: 'TH-4' },
      { nom: 'disposition-oubliee', fichier: RG, avant: 'if (disposition && !raisons.length) {', apres: 'if (false) {', tue: 'TH-4' },
      // TH-5 : fusionner
      { nom: 'fusion-superficielle', fichier: RG, avant: '      if (estObjet(v) && estObjet(cible[k])) poser(cible[k] as Record<string, unknown>, v)\n      else cible[k] = copier(v)', apres: '      cible[k] = copier(v)', tue: 'TH-5' },
      { nom: 'fusion-qui-modifie-les-defauts', fichier: RG, avant: 'const sortie = copier(defauts) as Record<string, unknown>', apres: 'const sortie = defauts as Record<string, unknown>', tue: 'TH-5' },
      { nom: 'fusion-qui-pollue-les-prototypes', fichier: RG, avant: "const INTERDITES = new Set(['__proto__', 'constructor', 'prototype'])", apres: 'const INTERDITES = new Set<string>([])', tue: 'TH-5' },
      // TH-6 : appliquerReglages
      { nom: 'pose-sur-le-document', fichier: RG, avant: "  noeud.setAttribute?.('data-mise-en-page',", apres: "  ;(globalThis as any).document?.documentElement?.setAttribute?.('data-mise-en-page', 'x')\n  noeud.setAttribute?.('data-mise-en-page',", tue: 'TH-6' },
      { nom: 'titre-pose-en-html', fichier: RG, avant: "if (typeof reglages?.affichage?.titre === 'string') noeud.setAttribute?.('data-titre', reglages.affichage.titre)", apres: "if (typeof reglages?.affichage?.titre === 'string') (noeud as any).innerHTML = reglages.affichage.titre", tue: 'TH-6' },
      { nom: 'jeton-libre-pose', fichier: RG, avant: "  noeud.setAttribute?.('data-mise-en-page',", apres: "  for (const [k, x] of Object.entries(choisies)) noeud.style?.setProperty?.(k, String(x))\n  noeud.setAttribute?.('data-mise-en-page',", tue: 'TH-6' },
      { nom: 'mise-en-page-oubliee', fichier: RG, avant: "noeud.setAttribute?.('data-mise-en-page', String(reglages?.mise_en_page ?? theme.mise_en_page))", apres: 'void 0', tue: 'TH-6' },
      { nom: 'couleur-invalide-sans-repli', fichier: RG, avant: "const v = typeof voulue === 'string' && RE_COULEUR.test(voulue) ? voulue : (theme.palette as Record<string, string>)[jeton]", apres: "const v = typeof voulue === 'string' ? voulue : (theme.palette as Record<string, string>)[jeton]", tue: 'TH-6' },
    ],
  },
  {
    commande: 'scripts/station-themes-qa.mjs', arguments: ['--theme=station'], loader: false, attendu: 'TH-7', criteresMin: 6,
    sabotages: [
      ...sabotagesTheme(S, 'station', 'Station de test'),
      { nom: 'theme-trop-lourd', fichier: `${S}/licence.json`, avant: '"adresse":"https://opengameart.org/content/spacers","licence":"CC0","date":"2026-09-25"}', apres: `"adresse":"https://opengameart.org/content/spacers","licence":"CC0","date":"2026-09-25","note":"${LOURD}"}`, tue: 'TH-9' },
    ],
  },
  {
    commande: 'scripts/station-themes-qa.mjs', arguments: ['--theme=vaisseau'], loader: false, attendu: 'TH-7', criteresMin: 6,
    sabotages: [
      ...sabotagesTheme(V, 'vaisseau', 'Vaisseau de test'),
      { nom: 'deux-themes-trop-lourds', fichier: `${S}/licence.json`, avant: '"adresse":"https://opengameart.org/content/spacers","licence":"CC0","date":"2026-09-25"}', apres: `"adresse":"https://opengameart.org/content/spacers","licence":"CC0","date":"2026-09-25","note":"${'x'.repeat(1600 * 1024)}"}`, tue: 'TH-9' },
    ],
  },
  {
    commande: 'scripts/ecommerce-reservee-qa.mjs', arguments: [BASE], loader: false, attendu: 'EC-1', criteresMin: 5,
    sabotages: [
      // EC-1 : le drapeau et son commentaire
      { nom: 'drapeau-leve', fichier: FLAGS, avant: '  ecommerce: false,', apres: '  ecommerce: true,', tue: 'EC-1' },
      { nom: 'commentaire-retire', fichier: FLAGS, avant: COMMENTAIRE_DRAPEAU, apres: '', tue: 'EC-1' },
      { nom: 'commentaire-sans-les-videos', fichier: FLAGS, avant: 'elle attend ses trois vidéos sources', apres: 'elle attend', tue: 'EC-1' },
      { nom: 'drapeau-declare-deux-fois', fichier: FLAGS, avant: '  ecommerce: false,', apres: '  ecommerce: false,\n  ecommerce: true,', tue: 'EC-1' },
      // EC-2 : la CARTE (premier critère EC-1 resté vert)
      { nom: 'carte-en-lu', fichier: FERM, avant: "'ecommerce': ['note',", apres: "'ecommerce': ['lu',", tue: 'EC-2' },
      { nom: 'carte-sans-la-ligne', fichier: FERM, avant: "    'ecommerce': ['note', 'branche réservée : rien n’est construit, attend les trois vidéos sources de Benj'],\n", apres: '', tue: 'EC-2' },
      { nom: 'note-sans-reservee', fichier: FERM, avant: "'branche réservée : rien n’est construit, attend les trois vidéos sources de Benj'", apres: "'à voir plus tard, plus tard, plus tard'", tue: 'EC-2' },
      // EC-3 : le LISEZMOI
      { nom: 'lisez-moi-sans-rien-construit', fichier: DOC, avant: '**Rien n’est construit**', apres: '**Tout est construit**', tue: 'EC-3' },
      { nom: 'lisez-moi-sans-les-videos', fichier: DOC, avant: '**trois vidéos sources**', apres: '**vidéos**', tue: 'EC-3' },
      { nom: 'lisez-moi-sans-le-drapeau', fichier: DOC, avant: '**Le drapeau `ecommerce`**', apres: '**Le drapeau**', tue: 'EC-3' },
      { nom: 'lisez-moi-retire', fichier: DOC, retirer: true, tue: 'EC-3' },
      // EC-4 : rien n'est construit
      { nom: 'table-ecommerce', fichier: MIG, avant: 'select 1;', apres: 'create table public.ecommerce_produits (id bigint primary key);', tue: 'EC-4' },
      { nom: 'table-ecommerce-entre-guillemets', fichier: MIG, avant: 'select 1;', apres: 'create table public."ecommerce" (id bigint);', tue: 'EC-4' },
      // EC-5 : le diff se limite à ces lignes
      { nom: 'autre-drapeau-ajoute', fichier: FLAGS, avant: '  ecommerce: false,', apres: '  ecommerce: false,\n  boutique: false,', tue: 'EC-5' },
      { nom: 'autre-drapeau-leve', fichier: FLAGS, avant: '  landingVideo: false,', apres: '  landingVideo: true,', tue: 'EC-5' },
      { nom: 'ligne-de-carte-retiree', fichier: FERM, avant: "    'canauxWhatsapp': ['lu'],\n", apres: '', tue: 'EC-5' },
      { nom: 'ligne-de-carte-ajoutee', fichier: FERM, avant: "    'canauxReseaux': ['lu'],", apres: "    'canauxReseaux': ['lu'],\n    'boutique': ['lu'],", tue: 'EC-5' },
    ],
  },
]

const controlesA = [
  { id: 'JA-3', module: './controles.mjs', fonction: 'controleJeux' },
  { id: 'JA-4', module: './controles.mjs', fonction: 'controleSecrets' },
  { id: 'JA-6', module: './controles.mjs', fonction: 'controleAppels' },
]

// La partie B (t/lot-b.mjs : station-reglages-qa, poste-extraction-qa) est recopiée ici, dans son propre bloc (le lot doit tenir en un seul
// fichier : JA-6 le copie seul sous .orchestre/travail/). Même référence, même témoin (./temoin). lot-b.mjs reste jouable seul (--lot=tb).
const partieB = (() => {
const reference = '1c87006aa35a152cb918ab368225e1976a1328da'
const absents = ['app/api/controle/station/reglages/', 'lib/controle/lectures/']
const BASE = `--base=${reference}`

const R = 'app/api/controle/station/reglages/route.ts'
const J = 'lib/direction/journal.ts'
const CARTE = 'scripts/fermeture-e2e.mjs'
const C = 'app/api/controle'
const L = 'lib/controle/lectures'
const FAUX_TYPE = "const _faute: number = 'x'\nvoid _faute\n"

const juges = [
  {
    commande: 'scripts/station-reglages-qa.mjs', arguments: [BASE], loader: false, attendu: 'RX-1', criteresMin: 8,
    sabotages: [
      // RX-1 : le drapeau, première instruction
      { nom: 'put-drapeau-apres-la-garde', fichier: R, avant: "export async function PUT(req: Request) {\n  if (!actif('pilotage')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })\n  const f = await estDirection(req)\n", apres: "export async function PUT(req: Request) {\n  const f = await estDirection(req)\n  if (!actif('pilotage')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })\n", tue: 'RX-1' },
      { nom: 'get-sans-drapeau', fichier: R, avant: "export async function GET(req: Request) {\n  if (!actif('pilotage')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })\n", apres: 'export async function GET(req: Request) {\n', tue: 'RX-1' },
      // RX-2 : les gardes, les domaines, la forme de la lecture
      { nom: 'put-estfondateur', fichier: R, avant: 'const f = await estDirection(req)', apres: 'const f = await estFondateur(req)', tue: 'RX-2' },
      { nom: 'put-domaine-sante', fichier: R, avant: "exigerDomaine(f, 'reglages', 'ecrire')", apres: "exigerDomaine(f, 'sante', 'ecrire')", tue: 'RX-2' },
      { nom: 'get-verbe-ecrire', fichier: R, avant: "exigerDomaine(f, 'sante', 'voir')", apres: "exigerDomaine(f, 'sante', 'ecrire')", tue: 'RX-2' },
      { nom: 'get-panne-en-500', fichier: R, avant: "'Réglages indisponibles pour l’instant.' }, { status: 503 })", apres: "'Réglages indisponibles pour l’instant.' }, { status: 500 })", tue: 'RX-2' },
      { nom: 'get-sans-date', fichier: R, avant: ', modifie_par: ligne.modifie_par, modifie_le: ligne.modifie_le })', apres: ', modifie_par: ligne.modifie_par })', tue: 'RX-2' },
      // RX-3 : la validation côté serveur
      { nom: 'verdict-ignore', fichier: R, avant: 'const verdict = validerReglages(brut, theme)', apres: 'const verdict = (validerReglages(brut, theme), { ok: true, reglages: brut } as ReturnType<typeof validerReglages>)', tue: 'RX-3' },
      { nom: 'liste-des-cles-retiree', fichier: R, avant: ', clesPermises: verdict.clesPermises }, { status: 400 })', apres: ' }, { status: 400 })', tue: 'RX-3' },
      // RX-4 : version périmée, journal avant et après
      { nom: 'journal-false-ignore', fichier: R, avant: 'if (!avant) return refusJournal()', apres: 'if (!avant && (false as boolean)) return refusJournal()', tue: 'RX-4' },
      { nom: 'journal-apres-l-ecriture', fichier: R, avant: "  const avant = await journaliser({ acteur: f, action: 'station_reglages', cible_type: 'station_reglages', avant: { version } }, req)\n  if (!avant) return refusJournal()\n\n  const w = await supabaseAdmin.rpc('station_reglages_ecrire', { p_reglages: verdict.reglages, p_auteur: f.uid, p_version: version })\n", apres: "  const w = await supabaseAdmin.rpc('station_reglages_ecrire', { p_reglages: verdict.reglages, p_auteur: f.uid, p_version: version })\n  const avant = await journaliser({ acteur: f, action: 'station_reglages', cible_type: 'station_reglages', avant: { version } }, req)\n  if (!avant) return refusJournal()\n", tue: 'RX-4' },
      { nom: 'perimee-en-503', fichier: R, avant: "modifié ailleurs : recharge.' }, { status: 409 })", apres: "modifié ailleurs : recharge.' }, { status: 503 })", tue: 'RX-4' },
      { nom: 'journal-sans-version', fichier: R, avant: "cible_type: 'station_reglages', avant: { version } }, req)", apres: "cible_type: 'station_reglages' }, req)", tue: 'RX-4' },
      // RX-5 : 30 écritures par jour
      { nom: 'plafond-31', fichier: R, avant: 'const ECRITURES_PAR_JOUR = 30', apres: 'const ECRITURES_PAR_JOUR = 31', tue: 'RX-5' },
      { nom: 'compteur-par-appel', fichier: R, avant: '`station_reglages:${f.uid}:${FORMAT_JOUR.format(new Date())}`', apres: '`station_reglages:${f.uid}:${FORMAT_JOUR.format(new Date())}:${Math.random()}`', tue: 'RX-5' },
      // RX-6 : la carte de fermeture-e2e
      { nom: 'carte-sans-la-route', fichier: CARTE, avant: ", '" + R + "'],", apres: '],', tue: 'RX-6' },
      { nom: 'carte-ligne-en-trop', fichier: CARTE, avant: '  const CARTE = {\n', apres: "  const CARTE = {\n    'pilotage2': ['note', 'une ligne de plus que la fiche n\\'autorise pas'],\n", tue: 'RX-6' },
      // RX-7 : aucune écriture hors des fonctions SQL
      { nom: 'ecriture-directe', fichier: R, avant: "  const w = await supabaseAdmin.rpc('station_reglages_ecrire',", apres: "  await supabaseAdmin.from('station_reglages').upsert({ cle: 1 })\n  const w = await supabaseAdmin.rpc('station_reglages_ecrire',", tue: 'RX-7' },
      // RX-8 : le typage
      { nom: 'type-faux-dans-la-route', fichier: R, avant: 'const TAILLE_MAX = 65536 // 64 Ko', apres: "const TAILLE_MAX: number = '65536' // 64 Ko", tue: 'RX-8' },
      { nom: 'action-absente-de-l-union', fichier: J, avant: "  | 'station_reglages'\n", apres: '', tue: 'RX-8' },
      // le premier critère : la route retirée
      { nom: 'route-retiree', fichier: R, retirer: true, tue: 'RX-1' },
    ],
  },
  {
    commande: 'scripts/poste-extraction-qa.mjs', arguments: [BASE], loader: false, attendu: 'XT-1', criteresMin: 5,
    sabotages: [
      // XT-1 : les lectures, les routes qui les importent
      { nom: 'index-des-lectures-retire', fichier: `${L}/index.ts`, retirer: true, tue: 'XT-1' },
      { nom: 'route-recalcule-les-crons', fichier: `${C}/etat/route.ts`, avant: 'const ia = () => sourcer(', apres: "const _recalcul = () => supabaseAdmin.from('passages_cron').select('nom')\nvoid _recalcul\nconst ia = () => sourcer(", tue: 'XT-1' },
      // XT-2 : sorties inchangées, champ par champ
      { nom: 'barre-ordre-des-cles', fichier: `${C}/barre/route.ts`, avant: '    role: f.role,\n    roleInterne: f.roleInterne,\n', apres: '    roleInterne: f.roleInterne,\n    role: f.role,\n', tue: 'XT-2' },
      { nom: 'clients-un-credit-de-plus', fichier: `${L}/clients.ts`, avant: 'credits: a.credits, inscrit_le: a.created_at,', apres: 'credits: a.credits + 1, inscrit_le: a.created_at,', tue: 'XT-2' },
      { nom: 'audience-historique-inversee', fichier: `${L}/audience.ts`, avant: "periode === 'historique'", apres: "periode !== 'historique'", tue: 'XT-2' },
      { nom: 'bans-quatre-cents-abus', fichier: `${L}/bans.ts`, avant: '.limit(500)', apres: '.limit(400)', tue: 'XT-2' },
      { nom: 'cerveaux-premiere-entree', fichier: `${L}/cerveaux.ts`, avant: '.at(-1)', apres: '.at(0)', tue: 'XT-2' },
      { nom: 'crons-seuil-cent-fois', fichier: `${L}/crons.ts`, avant: 'age > c.maxHeures', apres: 'age > c.maxHeures * 100', tue: 'XT-2' },
      { nom: 'sante-sans-accent', fichier: `${L}/sante.ts`, avant: '`${verts} contrôles verts`', apres: '`${verts} controles verts`', tue: 'XT-2' },
      // XT-3 : un nombre, jamais un contenu
      { nom: 'tickets-le-sujet', fichier: `${L}/tickets.ts`, avant: ".select('id', { count: 'exact', head: true })", apres: ".select('id, sujet', { count: 'exact', head: true })", tue: 'XT-3' },
      { nom: 'tickets-les-fermes', fichier: `${L}/tickets.ts`, avant: ".is('ferme_le', null)", apres: ".not('ferme_le', 'is', null)", tue: 'XT-3' },
      { nom: 'tickets-toutes-les-colonnes', fichier: `${L}/tickets.ts`, avant: ".select('id', {", apres: ".select('*', {", tue: 'XT-3' },
      // XT-4 : chaque route garde sa lecture de drapeau
      { nom: 'audience-sans-drapeau', fichier: `${C}/audience/route.ts`, avant: "  if (!actif('audience')) return NextResponse.json({ error: 'Introuvable.' }, { status: 404 })\n", apres: '', tue: 'XT-4' },
      { nom: 'clients-ne-lit-plus-apports', fichier: `${C}/clients/route.ts`, avant: 'await clients({ q, offre: filtre, apports: actif(\'apports\') })', apres: 'await clients({ q, offre: filtre })', tue: 'XT-4' },
      // XT-5 : le typage
      { nom: 'type-faux-dans-une-lecture', fichier: `${L}/sante.ts`, avant: "type Etat = 'ok' | 'degrade' | 'incident'\n", apres: `type Etat = 'ok' | 'degrade' | 'incident'\n${FAUX_TYPE}`, tue: 'XT-5' },
    ],
  },
]

const controles = [
  { id: 'JA-3', module: './controles-b.mjs', fonction: 'controleJeuxB' },
]

  return { reference, absents, juges, controles }
})()
if (partieB.reference !== reference) throw new Error('la partie B doit avoir la référence de la partie A')
export const absents = [...absentsA, ...partieB.absents]
export const juges = [...jugesA, ...partieB.juges]
export const controles = [...controlesA, ...partieB.controles]
