#!/usr/bin/env node
// scripts/juges-026-pubs-contenu-mutations.mjs — contre-vérification indépendante des juges du domaine « pubs et
// contenu » (fiche 026-159). Un juge qu'on n'a jamais vu échouer sur une vraie faute ne prouve rien : pour chaque
// juge, une copie du dépôt reçoit UNE faute plantée (un remplacement de texte exact, jamais l'arbre réel), le juge
// est relancé sur la copie et doit sortir en code 1 en nommant le critère visé ; un témoin intact doit passer.
//
// Contrat du rapport lu par le méta-juge scripts/juges-026-mutations-preuve.mjs (--rapport) :
//   { "mutations": [{ juge, commande, fichier, avant, apres, critere, extrait, duree_s }] }
// `commande` écrit la copie {racine}. Le méta-juge relance la commande sur SA copie (sans .git, sans .orchestre/preuves) :
// la commande passe donc par le relais de ce script (`--relais=<groupe>`), qui prépare la copie puis lance le juge.
//
// Le relais fabrique ce que l'arbre réel porte et que la copie n'a pas (il n'écrit JAMAIS hors de la copie) :
//   - un dépôt git dans la copie dont HEAD est l'état d'AVANT les ajouts que plusieurs juges relisent par `git diff HEAD`
//     (dashboard, journal.ts, page du Poste, cron des relances) : ces juges sont écrits pour un arbre non encore commité ;
//     sur un arbre commité leur diff est vide et ils échoueraient sur le témoin. Le texte retiré est celui des commits
//     026-144, 026-137, 026-147 et 026-149 (voir BASES) ; si un retrait ne s'applique plus, le relais s'arrête (code 2) ;
//   - le compte rendu d'essai à sec de 026-114 (.orchestre/preuves/026-114/essai-a-sec.txt), relu par pack-pub-base-qa PB-8.
//
// NON COUVERT (relevé du 04/10, cloud Linux ; aucune mutation inventée sans l'avoir vue mordre) :
//   - studio-garde-qa : scripts/studio/garde.mjs, docs/studio/modeles-messages.md et seance.md absents (fiche 026-155 non faite) ;
//   - pub-qa, socle-pubs-qa (donc video-qa et visages-qa mutés eux-mêmes) : le témoin se fabrique avec PowerShell/SAPI (Windows) ;
//   - pub-locale-qa --partie=gabarit|complet (PL-G3 à G5, PL-3, PL-7, PL-12) et pack-pub-livraison-qa --partie=depot (LV-1, LV-10) :
//     hyperframes charge gsap depuis cdn.jsdelivr.net (refusé par l'accès réseau de l'environnement) et PL-8 exige faster-whisper ;
//   - PL-T5 : « âge » dans la fiche ne peut pas rougir, la condition de pub-locale-qa.mjs:353-355 a un corps vide ;
//   - crieur-qa --partie=route : le témoin est rouge (CR-17) depuis que la route du Crieur n'appelle plus pauseGenerale ; CR-5, CR-7 et
//     CR-16 y sont écrits et pris sur l'ancienne base, mais le témoin intact échoue.
// Usage :
//   node scripts/juges-026-pubs-contenu-mutations.mjs [--seul=<motif>] [--garder] [--liste]
//   node scripts/juges-026-pubs-contenu-mutations.mjs --relais=<groupe> --racine=<copie>     (interne)
// Code 0 : chaque témoin passe et chaque mutation échoue sur son critère. Code 1 sinon (mutation non prise, témoin rouge,
// juge injouable ici). Code 3 : --seul (sélection partielle, jamais une preuve).
// N'écrit que sous .orchestre/travail/026-159/ et .orchestre/preuves/026-159/.
import fs from 'node:fs'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const FICHE = '026-159'
const TRAVAIL = path.join(RACINE, '.orchestre', 'travail', FICHE)
const PREUVES = path.join(RACINE, '.orchestre', 'preuves', FICHE)
const argv = process.argv.slice(2)
const option = (nom) => argv.find((x) => x.startsWith(`--${nom}=`))?.slice(nom.length + 3)
const GARDER = argv.includes('--garder')
const SEUL = option('seul')
const RELAIS = option('relais')
const SELF = 'scripts/juges-026-pubs-contenu-mutations.mjs'

// ── Les groupes : un juge, une partie, une copie partagée entre ses mutations ─────────────────────────────────────────
const GROUPES = {
  base: { juge: 'scripts/pack-pub-base-qa.mjs', args: [] },
  'paiement-noyau': { juge: 'scripts/pack-pub-paiement-qa.mjs', args: ['--partie=noyau'] },
  'paiement-route': { juge: 'scripts/pack-pub-paiement-qa.mjs', args: ['--partie=route'] },
  cgu: { juge: 'scripts/cgu-pack-pub-qa.mjs', args: [] },
  'dossier-api': { juge: 'scripts/pack-pub-dossier-qa.mjs', args: ['--partie=api'] },
  'dossier-page': { juge: 'scripts/pack-pub-dossier-qa.mjs', args: ['--partie=page'] },
  // crieur-qa : le dépôt tel quel pour git (CR-NR compare quatre fichiers à HEAD, dont le cron des relances : pas de base reculée)
  // PUBLORA_API_KEY : la sonde de CR-7 lance publora.ts avec l'environnement ambiant et la clé y est exigée ; valeur d'essai, rien de réel.
  'crieur-composer': { juge: 'scripts/crieur-qa.mjs', args: ['--partie=composer'], base: false },
  'crieur-route': { juge: 'scripts/crieur-qa.mjs', args: ['--partie=route'], base: false, env: { PUBLORA_API_KEY: 'cle-essai-du-juge' } },
  'crieur-horloge': { juge: 'scripts/crieur-qa.mjs', args: ['--partie=horloge'], base: false },
  'locale-textes': { juge: 'scripts/pub-locale-qa.mjs', args: ['--partie=textes'] },
  'livraison-route': { juge: 'scripts/pack-pub-livraison-qa.mjs', args: ['--partie=route'] },
  'livraison-poste': { juge: 'scripts/pack-pub-livraison-qa.mjs', args: ['--partie=poste'] },
  'livraison-purge': { juge: 'scripts/pack-pub-livraison-qa.mjs', args: ['--partie=purge'] },
}

// ── Les mutations : { groupe, critere, fichier, avant, apres, nom } — `avant` présent une seule fois dans `fichier` ──────
const mutations = []
const muter = (groupe, critere, fichier, avant, apres, nom) => mutations.push({ groupe, critere, fichier, avant, apres, nom })

const MIG = 'supabase/migrations/0102_packs_pubs.sql'
const NU = 'supabase/migrations/_A_COLLER_sql_editor_0102_NU.sql'
// pack-pub-base-qa (026-114)
muter('base', 'PB-3', MIG,
  'create policy "packs pubs : l artisan lit ses packs" on public.packs_pubs for select using (auth.uid() = artisan_id);',
  'create policy "packs pubs : l artisan lit ses packs" on public.packs_pubs for select using (auth.uid() = artisan_id);\ncreate policy "packs pubs : ecriture" on public.packs_pubs for insert with check (auth.uid() = artisan_id);',
  'politique d’écriture ajoutée')
muter('base', 'PB-3', MIG, 'revoke all on public.packs_pubs from public, anon, authenticated;\n', '', 'revoke retiré')
muter('base', 'PB-4', MIG,
  "values ('packs-pubs', 'packs-pubs', false, 20971520)\non conflict (id) do update set public = false, file_size_limit = 20971520;",
  "values ('packs-pubs', 'packs-pubs', true, 20971520)\non conflict (id) do update set public = true, file_size_limit = 20971520;",
  'bucket rendu public')
muter('base', 'PB-2', MIG, "check (etat in ('brouillon', 'payee', 'fabriquee', 'livree'))", "check (etat in ('brouillon', 'payee', 'fabriquee'))", "'livree' retiré de la contrainte d’état")
muter('base', 'PB-8', NU, 'artisan_id uuid references public.artisans(id) on delete set null,', 'artisan_id uuid references public.artisans(id)  on delete set null,', 'jumeau nu changé d’un caractère après l’essai à sec')

// pack-pub-paiement-qa (026-112 noyau, 026-118 route)
const PUB = 'lib/packPub.ts'
muter('paiement-noyau', 'PP-3', 'lib/stripeAiguillage.ts', "if (s.mode === 'payment' && s.metadata?.type === 'pack_pub' && s.metadata?.pack_id) {", "if (s.metadata?.type === 'pack_pub' && s.metadata?.pack_id) {", 'aiguiller rend pack_pub en mode abonnement')
muter('paiement-noyau', 'PP-4', 'app/api/stripe/webhook/route.ts', 'throw new Error(`paiement de pack pubs sans dossier : session ${s.id}`)', 'console.error(`paiement de pack pubs sans dossier : session ${s.id}`)', 'throw retiré sur introuvable')
muter('paiement-noyau', 'PP-5', 'lib/packPubServeur.ts', ".update(maj).eq('id', packId).eq('etat', 'brouillon').select('id')", ".update(maj).eq('id', packId).select('id')", ".eq('etat', 'brouillon') retiré d’encaisserPackPub")
muter('paiement-noyau', 'PP-6', PUB, "    invoice_creation: { enabled: true, invoice_data: { description: 'Pack pubs locales — Presti', ...(taxeAuto ? {} : { footer: mentionFranchise('auto') }) } },\n", '', 'invoice_creation retiré')
muter('paiement-noyau', 'PP-6', PUB, 'payment_intent_data: { metadata: { ...metadata } },', 'payment_intent_data: {},', 'métadonnées absentes de payment_intent_data')
muter('paiement-noyau', 'PP-7', 'lib/stripe.ts', 'return !enBase || enBase === evenement', 'return !enBase || enBase === evenement || false', 'une ligne changée dans lib/stripe.ts')
muter('paiement-route', 'PP-9', 'lib/flags.ts', '  packPub: false,', '  packPub: true,', 'packPub levé (true)')

// cgu-pack-pub-qa (026-131)
muter('cgu', 'CG-3', 'app/cgu/page.tsx', 'signalée « Voix générée par IA » à l’écran pendant toute la vidéo.', 'signalée à l’écran pendant toute la vidéo.', '« Voix générée par IA » retirée')
muter('cgu', 'CG-4', 'app/cgu/page.tsx', 'Aucun résultat n’est garanti : ni nombre de contacts, ni chantiers.', 'Aucun résultat n’est garanti : ni nombre de contacts, ni chantiers ; résultats assurés.', '« résultats assurés » ajouté')
muter('cgu', 'CG-2', 'app/cgu/page.tsx', 'Les textes et photos qu’il fournit restent les siens', 'Les textes et photos qu’il fournit restent les leurs', 'un mot du 3 bis changé')

// pack-pub-dossier-qa (026-135 api, 026-144 page)
const DOS = 'lib/packPubDossier.ts'
muter('dossier-api', 'PD-1', DOS, '/storage/v1/object/public/artisan-media/${contexte.uid}/`', '/storage/v1/object/public/artisan-media/`', 'photo d’un autre artisan acceptée')
muter('dossier-api', 'PD-1', DOS, "    if (personnes && !accord_personnes) erreur(`${champ}.accord_personnes`, 'L’accord des personnes visibles est nécessaire.')\n", '', 'contrôle de l’accord des personnes retiré')
muter('dossier-api', 'PD-1', DOS, "    if (/\\d/.test(texte_voix)) erreur('texte_voix', 'Écrivez les nombres en lettres.')\n", '', 'chiffres admis dans texte_voix')
muter('dossier-page', 'PD-5', 'app/pubs/commander/page.tsx', '<p><b>{PRIX_PACK_PUB_TEXTE}</b> une fois,', '<p><b>149 €</b> une fois,', '« 149 € » écrit en dur dans la page')
muter('dossier-page', 'PD-7', 'app/dashboard/page.tsx', "{actif('packPubVente') && <CartePackPub />}", '<CartePackPub />', 'carte rendue hors drapeau')

// pack-pub-livraison-qa (026-137 route, 026-147 poste, 026-149 purge)
const ROUTE_PACKS = 'app/api/controle/packs/[id]/route.ts'
muter('livraison-route', 'LV-3', 'lib/packPubLivraison.ts', 'export const DUREE_LIEN_S = 2592000', 'export const DUREE_LIEN_S = 5184000', 'DUREE_LIEN_S à 60 jours')
muter('livraison-route', 'LV-4', ROUTE_PACKS, "    const refus = await exigerReconfirmation(req, f.uid, 'artisan')\n    if (refus) return refus\n", '', 'reconfirmation retirée de livrer')
muter('livraison-route', 'LV-4', ROUTE_PACKS, '  const maintenant = new Date()\n', "  const maintenant = new Date()\n  await supabaseAdmin.from('packs_pubs').update({ modifie_le: maintenant.toISOString() }).eq('id', id)\n", 'mise à jour écrite avant le journal')
muter('livraison-poste', 'LV-8', 'app/controle/page.tsx', "import Sites from './Sites'", "import Sites from './Sites' // modifié", 'une ligne de plus changée dans app/controle/page.tsx')
// Le simple élargissement de l'état (['livree', 'fabriquee']) n'est PAS pris : le jeu purge/fabriquee.json porte lien_expire_le = null,
// que le test « lien_expire_le !== null » écarte seul. La mutation retire donc aussi ce test, sans quoi elle ne mordrait pas.
muter('livraison-purge', 'LV-12', 'lib/packPubPurge.ts', ".filter((pack) => pack.etat === 'livree'\n      && pack.fichiers_effaces_le === null\n      && pack.lien_expire_le !== null\n", ".filter((pack) => pack.fichiers_effaces_le === null\n", 'purge qui retient aussi un pack fabriquee (filtres d’état et de lien retirés)')
muter('livraison-purge', 'LV-13', 'lib/packPubPurge.ts', '    bilan.erreurs.push(`purge : ${e instanceof Error ? e.message : String(e)}`)', '    throw e', 'purge qui lève au lieu de compter')

// pub-locale-qa --partie=textes (026-126) : la fabrique réelle scripts/pack-pub/textes.mjs écrit textes.md et la fiche
muter('locale-textes', 'PL-T4', 'scripts/pack-pub/textes.mjs', 'const cta = faits.cta === \'appel\' && telephone ? `Appelez le ${telephone}`', 'const cta = faits.cta === \'appel\' && telephone ? `Appelez le ${telephone}, entreprise RGE`', '« RGE » dans textes.md')
// Non retenue : « âge » dans la fiche avec le statut oui (PL-T5) — la condition de pub-locale-qa.mjs:353-355 a un corps vide, elle ne peut pas rougir.
// muter('locale-textes', 'PL-T5', 'scripts/pack-pub/textes.mjs', 'Ne réglez ni l’âge ni le genre.', 'Ciblez par âge.', '« âge » dans la fiche, statut oui')

// crieur-qa (026-116 ; 026-119 composer, 026-122 route, 026-134 horloge). La fiche nomme CR-10 « battement appelé en mode à sec » :
// dans le juge actuel CR-10 est l'unicité du numéro de migration, le battement est jugé par CR-16 — les deux sont éprouvés.
muter('crieur-composer', 'CR-1', 'lib/crieur/faits.ts', "motif: 'CADENCE_RELANCES = [2, 5, 10]'", "motif: 'CADENCE_RELANCES = [2, 5, 11]'", 'un fait dont le motif n’existe pas')
muter('crieur-composer', 'CR-2', 'lib/crieur/faits.ts', "texte: 'Exportez vos données depuis Presti.'", "texte: 'Presti répond à vos prospects.'", '« Presti répond » seul dans un fait')
muter('crieur-composer', 'CR-3', 'lib/crieur/composer.ts', '  return resultat\n}', '  return [...resultat, ...resultat.slice(0, 1)]\n}', 'composerLot rend 4 publications')
muter('crieur-route', 'CR-5', 'app/api/cron/crieur/route.ts', "  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })\n", '', 'route sans contrôle du jeton')
muter('crieur-route', 'CR-7', 'lib/crieur/publora.ts', 'const corps = { content: publication.contenu,', 'const corps = { scheduledTime: new Date().toISOString(), content: publication.contenu,', 'scheduledTime dans le corps envoyé')
muter('crieur-route', 'CR-16', 'app/api/cron/crieur/route.ts', "    if (aSec) return NextResponse.json({ semaine, lot })", "    if (aSec) { await ops_battement({ p_nom: 'crieur' }); return NextResponse.json({ semaine, lot }) }", 'battement crieur appelé aussi en mode à sec')
muter('crieur-horloge', 'CR-10', 'supabase/migrations/0104_crieur.sql', '-- Rejouable : la table et les index en `if not exists`,', '-- [DOUBLON-0104] Rejouable : la table et les index en `if not exists`,', 'deux migrations portent le numéro 0104 (le relais crée le doublon)')
muter('crieur-horloge', 'CR-11', 'supabase/migrations/0104_crieur.sql', 'revoke all on public.crieur_posts from public, anon, authenticated;', 'revoke all on public.crieur_posts from public, anon, authenticated;\ncreate policy "crieur : lecture" on public.crieur_posts for select using (true);', 'politique ajoutée à crieur_posts')
muter('crieur-horloge', 'CR-12', 'supabase/migrations/0104_crieur.sql', "'Bearer ' || v_secret", "'Bearer abcdefghijklmnopqrstuvwxyz012345'", 'jeton en clair dans l’appel planifié')

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Utilitaires
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const lire = (p) => fs.readFileSync(p, 'utf8')
const ecrire = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s) }
const court = (t, n = 200) => { const x = String(t ?? '').replace(/\s+/g, ' ').trim(); return x.length > n ? `${x.slice(0, n - 1)}…` : x }
const JONCTIONS = ['node_modules', 'public']
const DOSSIERS_COPIE = ['app', 'lib', 'scripts', 'supabase', 'docs', '.github', 'gabarits-pubs', '.orchestre/brouillons-ecosysteme']
const FICHIERS_RACINE = ['package.json', 'tsconfig.json', 'next.config.mjs', 'next-env.d.ts', 'vercel.json', 'proxy.ts', 'middleware.ts']

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Le relais : prépare la copie (git de référence, compte rendu d'essai à sec) puis lance le juge
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const sansLigne = (texte, morceau) => {
  const lignes = texte.split('\n')
  const k = lignes.map((l, i) => (l.includes(morceau) ? i : -1)).filter((i) => i >= 0)
  if (k.length !== 1) throw new Error(`« ${court(morceau, 60)} » présent sur ${k.length} ligne(s), une seule attendue`)
  lignes.splice(k[0], 1)
  return lignes.join('\n')
}
const remplacerUne = (texte, avant, apres) => {
  const n = texte.split(avant).length - 1
  if (n !== 1) throw new Error(`« ${court(avant, 60)} » présent ${n} fois, une seule attendue`)
  return texte.replace(avant, () => apres)
}
/** L'état d'AVANT les ajouts des fiches 026-144, 026-137, 026-147 et 026-149 : ce que `git diff HEAD` doit montrer. */
const BASES = {
  'app/dashboard/page.tsx': (t) => sansLigne(sansLigne(t, "import CartePackPub from '@/app/pubs/CartePackPub'"), '<CartePackPub />'),
  'lib/direction/journal.ts': (t) => sansLigne(sansLigne(t, "// Livraison et retouche du pack pubs locales"), "| 'pack_livre' | 'pack_refaire'"),
  'app/controle/page.tsx': (t) => {
    let x = sansLigne(t, "import Packs from './Packs'")
    x = sansLigne(x, "...(actif('packPub') ? (['packs'] as const) : []),")
    x = sansLigne(x, "{ id: 'packs', label: 'Packs pubs'")
    x = sansLigne(x, "onglet === 'packs' ? <Packs")
    x = remplacerUne(x, " | 'demandes' | 'packs'", " | 'demandes'")
    return remplacerUne(x, ", packs: 'Packs pubs' }", ' }')
  },
  'app/api/cron/relances/route.ts': (t) => {
    const bloc = "  try {\n    const r = await purgerPacksExpires()\n    await enregistrerPassage('purge-packs', r, r.erreurs.length === 0)\n  } catch (e) {\n    await enregistrerPassage('purge-packs', { erreur: e instanceof Error ? e.message : String(e) }, false)\n  }\n\n"
    return sansLigne(remplacerUne(t, bloc, ''), "import { purgerPacksExpires } from '@/lib/packPubPurge'")
  },
}
function gitCopie(racine, args) {
  return spawnSync('git', ['-c', 'user.email=juge@exemple.invalid', '-c', 'user.name=juge', '-c', 'commit.gpgsign=false', '-c', 'core.autocrlf=false', '-c', 'core.safecrlf=false', ...args], { cwd: racine, encoding: 'utf8', maxBuffer: 1 << 28 })
}
const PREUVES_A_COPIER = ['026-114', '026-134'] // les comptes rendus d'essai à sec relus par pack-pub-base-qa (PB-8) et crieur-qa (CR-13)
const MARQUE_DOUBLON = '[DOUBLON-0104]' // voir le groupe crieur-horloge : la marque demande au relais de créer un second fichier de migration 0104
function preparerCopie(racine, g) {
  if (!fs.existsSync(path.join(racine, '.git'))) {
    const vrais = new Map()
    if (g.base !== false) {
      for (const [f, reverser] of Object.entries(BASES)) {
        const p = path.join(racine, f)
        if (!fs.existsSync(p)) throw new Error(`${f} absent de la copie`)
        const ici = lire(p)
        vrais.set(p, ici)
        fs.writeFileSync(p, reverser(ici))
      }
    }
    for (const etape of [['init', '-q'], ['add', '-A'], ['commit', '-q', '-m', g.base !== false ? 'base : avant les ajouts des fiches 026-144, 026-137, 026-147, 026-149' : 'base : le dépôt tel quel']]) {
      const r = gitCopie(racine, etape)
      if (r.status !== 0) throw new Error(`git ${etape[0]} : ${court(r.stderr || r.stdout, 200)}`)
    }
    for (const [p, ici] of vrais) fs.writeFileSync(p, ici)
  }
  // Les comptes rendus d'essai à sec : cherchés en remontant vers le dépôt qui porte la copie.
  for (const fiche of PREUVES_A_COPIER) {
    const cible = path.join(racine, '.orchestre', 'preuves', fiche, 'essai-a-sec.txt')
    if (fs.existsSync(cible)) continue
    let d = path.dirname(racine)
    for (let i = 0; i < 8 && d !== path.dirname(d); i++, d = path.dirname(d)) {
      const s = path.join(d, '.orchestre', 'preuves', fiche, 'essai-a-sec.txt')
      if (fs.existsSync(s)) { fs.mkdirSync(path.dirname(cible), { recursive: true }); fs.copyFileSync(s, cible); break }
    }
  }
  // plans/promesses.md : preuve de plusieurs faits du Crieur (CR-1), absent de la copie du méta-juge.
  for (const rel of ['plans/promesses.md']) {
    const cible = path.join(racine, rel)
    if (fs.existsSync(cible)) continue
    let d = path.dirname(racine)
    for (let i = 0; i < 8 && d !== path.dirname(d); i++, d = path.dirname(d)) {
      if (fs.existsSync(path.join(d, rel))) { fs.mkdirSync(path.dirname(cible), { recursive: true }); fs.copyFileSync(path.join(d, rel), cible); break }
    }
  }
  // Mutation « deux migrations portent le numéro 0104 » : un remplacement de texte ne crée pas de fichier ; la marque posée
  // dans 0104_crieur.sql demande donc au relais de copier la migration sous un second nom (le juge doit le refuser, CR-10).
  const crieur = path.join(racine, 'supabase', 'migrations', '0104_crieur.sql')
  const doublon = path.join(racine, 'supabase', 'migrations', '0104_crieur_doublon.sql')
  if (fs.existsSync(crieur) && lire(crieur).includes(MARQUE_DOUBLON)) fs.copyFileSync(crieur, doublon)
  else if (fs.existsSync(doublon)) fs.unlinkSync(doublon)
}
if (RELAIS) {
  const g = GROUPES[RELAIS]
  const racine = option('racine') && path.resolve(option('racine'))
  if (!g || !racine || !fs.existsSync(racine)) { console.error(`relais : groupe ou --racine invalide (${RELAIS})`); process.exit(2) }
  try { preparerCopie(racine, g) } catch (e) { console.error(`relais : préparation de la copie impossible — ${e.message}`); process.exit(2) }
  const r = spawnSync(process.execPath, [path.join(racine, g.juge), ...g.args, `--racine=${racine}`], { cwd: racine, stdio: 'inherit', env: { ...process.env, ...(g.env || {}), FORCE_COLOR: '0', NO_COLOR: '1' } })
  process.exit(r.status ?? 128)
}

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Le jugement des mutations
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
function retirerCopie(dir) {
  if (!fs.existsSync(dir)) return
  const rel = path.relative(TRAVAIL, dir)
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) throw new Error('suppression hors de .orchestre/travail/026-159 refusée')
  for (const j of JONCTIONS) { try { if (fs.lstatSync(path.join(dir, j)).isSymbolicLink()) fs.unlinkSync(path.join(dir, j)) } catch { /* absent */ } }
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })
}
function copier(dir) {
  fs.mkdirSync(dir, { recursive: true })
  const liste = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...DOSSIERS_COPIE], { cwd: RACINE, encoding: 'utf8', maxBuffer: 1 << 28 })
  if (liste.status !== 0) throw new Error(`git ls-files : ${court(liste.stderr, 200)}`)
  for (const f of [...liste.stdout.split('\0').filter(Boolean), ...FICHIERS_RACINE]) {
    const s = path.join(RACINE, f)
    let st
    try { st = fs.lstatSync(s) } catch { continue }
    if (!st.isFile()) continue
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true })
    fs.copyFileSync(s, path.join(dir, f))
  }
  for (const j of JONCTIONS) if (fs.existsSync(path.join(RACINE, j))) fs.symlinkSync(path.join(RACINE, j), path.join(dir, j), 'junction')
}
const commandeDe = (cle) => `node ${SELF} --relais=${cle} --racine={racine}`
function lancer(commande, cwd, delaiMs) {
  return new Promise((resoudre) => {
    const enfant = spawn('bash', ['-c', commande], { cwd, detached: true, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' } })
    let sortie = '', expire = false
    const minuterie = setTimeout(() => { expire = true; try { process.kill(-enfant.pid, 'SIGKILL') } catch { /* déjà mort */ } }, delaiMs)
    for (const flux of [enfant.stdout, enfant.stderr]) flux.on('data', (d) => { if (sortie.length < 4_000_000) sortie += d.toString() })
    const debut = Date.now()
    enfant.on('close', (code) => { clearTimeout(minuterie); resoudre({ code: expire ? 124 : code ?? 128, sortie, duree_s: (Date.now() - debut) / 1000, expire }) })
    enfant.on('error', (e) => { clearTimeout(minuterie); resoudre({ code: 127, sortie: `${sortie}${e.message}`, duree_s: (Date.now() - debut) / 1000, expire }) })
  })
}
/** La ligne « FAIL <critere> — … » (une seule) et le bilan « <juge> : FAIL — ids » qui nomme le critère : la même lecture que le méta-juge. */
function verdict(sortie, critere) {
  const L = sortie.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').split(/\r?\n/)
  const siennes = L.map((l) => ({ l, m: /^(PASS|FAIL|SAUTE) (\S+)(?: — |$)/.exec(l) })).filter((x) => x.m && x.m[2] === critere)
  const bilan = L.map((l) => /^(\S+(?: --\S+)*) : (PASS|FAIL)(?: — (.*))?$/.exec(l)).filter(Boolean).at(-1)
  if (siennes.length !== 1 || !siennes[0].l.startsWith(`FAIL ${critere} — `)) return null
  if (!bilan || bilan[2] !== 'FAIL' || !(bilan[3] || '').split(/,\s*/).map((x) => x.trim()).includes(critere)) return null
  return siennes[0].l
}
const cles = (m) => [m.groupe, m.critere, m.nom].join(' ')

async function principal() {
  fs.mkdirSync(PREUVES, { recursive: true })
  fs.mkdirSync(TRAVAIL, { recursive: true })
  const retenues = SEUL ? mutations.filter((m) => cles(m).includes(SEUL)) : mutations
  if (argv.includes('--liste')) { for (const m of mutations) console.log(`${m.groupe} ${m.critere} ${m.nom}`); return }
  const groupes = [...new Set(retenues.map((m) => m.groupe))]
  const lignes = [], rapport = [], defauts = []
  try {
    for (const cle of groupes) {
      const dir = path.join(TRAVAIL, cle)
      retirerCopie(dir)
      copier(dir)
      const commande = commandeDe(cle).replace('{racine}', dir)
      const t = await lancer(commande, dir, 12 * 60_000)
      const brut = t.sortie.split(/\r?\n/).filter(Boolean)
      console.log(`TÉMOIN ${GROUPES[cle].juge} ${GROUPES[cle].args.join(' ')} : code ${t.code} (${t.duree_s.toFixed(1)} s)`)
      if (t.code !== 0) { defauts.push(`TÉMOIN ${cle} en code ${t.code}${t.expire ? ' (délai dépassé)' : ''} : ${court(brut.filter((l) => /FAIL|✗|Error/.test(l)).slice(0, 4).join(' | ') || brut.at(-1), 400)}`); continue }
      for (const m of retenues.filter((x) => x.groupe === cle)) {
        const fichier = path.join(dir, m.fichier)
        if (!fs.existsSync(fichier)) { defauts.push(`${m.critere} ${m.nom} : ${m.fichier} introuvable dans la copie`); continue }
        const original = lire(fichier)
        const n = original.split(m.avant).length - 1
        if (n !== 1) { defauts.push(`${m.critere} ${m.nom} : texte « avant » présent ${n} fois dans ${m.fichier}`); continue }
        fs.writeFileSync(fichier, original.replace(m.avant, () => m.apres))
        let r
        try { r = await lancer(commande, dir, 12 * 60_000) } finally { fs.writeFileSync(fichier, original) }
        const extrait = verdict(r.sortie, m.critere)
        const ok = r.code === 1 && !r.expire && extrait && extrait.trim().length >= 20
        const ligne = `${ok ? 'PASS' : 'FAIL'} ${m.critere} — ${m.nom} ; ${m.fichier} ; ${ok ? extrait : `code ${r.code}, ${court(r.sortie.split(/\r?\n/).filter((l) => /FAIL|PASS|✗/.test(l)).join(' | ') || r.sortie.slice(-300), 500)}`}`
        lignes.push(ligne); console.log(court(ligne, 400))
        if (!ok) defauts.push(ligne)
        else rapport.push({ juge: GROUPES[cle].juge, commande: commandeDe(cle), fichier: m.fichier, avant: m.avant, apres: m.apres, critere: m.critere, extrait: extrait.trim(), duree_s: Number(r.duree_s.toFixed(1)) })
      }
    }
    ecrire(path.join(PREUVES, 'mutations.md'), `${defauts.length ? `# ÉCHECS (${defauts.length})\n${defauts.map((d) => `- ${d}`).join('\n')}\n\n` : ''}# Mutations prises (${rapport.length})\n${lignes.join('\n')}\n`)
    if (!SEUL) ecrire(path.join(PREUVES, 'mutations.json'), `${JSON.stringify({ mutations: rapport }, null, 2)}\n`)
    console.log(`${FICHE} : ${defauts.length ? 'FAIL' : 'PASS'} — ${rapport.length}/${retenues.length} mutations prises`)
    process.exitCode = defauts.length ? 1 : SEUL ? 3 : 0
  } finally {
    if (!GARDER) for (const cle of groupes) retirerCopie(path.join(TRAVAIL, cle))
  }
}
principal().catch((e) => { console.error(e.stack || e); process.exitCode = 1 })
