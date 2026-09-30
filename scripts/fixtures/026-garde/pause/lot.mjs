// scripts/fixtures/026-garde/pause/lot.mjs — le lot du juge garde-pause-qa (la pause générale coupe TOUTE sortie), écrit par Claude
// Code. La preuve se joue ainsi :
//   node scripts/juges-026-pilotage-preuve.mjs --lot=gpause --lot-fichier=scripts/fixtures/026-garde/pause/lot.mjs
//
// Référence : 00f0ab51 (HEAD de la branche au 30/09) : elle ne porte ni lib/agents/sortie.ts ni lib/crieur/pauseProgrammees.ts. Le
// juge y sort en code 1, GP-1 en tête (la route cron/relances ne lit pas la pause générale).
//
// Témoin (./temoin) : les correctifs minimaux, en copies .temoin des fichiers touchés, à reporter tels quels :
//   - lib/agents/sortie.ts (neuf)       : sortiePermise(), la porte de toute sortie automatique, fail-closed à la forme ;
//   - lib/email.ts                      : un e-mail non critique refuse de partir quand la sortie n'est pas permise (point de passage
//                                         de toutes les voies e-mail : relances, accusés, alertes aux artisans, notifications) ;
//   - app/api/cron/relances/route.ts    : pause lue avant toute lecture de contact puis relue à chaque relance, prise conditionnelle de
//                                         la relance avant envoi, un mail par prospect et par passage, arrêt au plafond, 100 au plus ;
//   - app/api/cron/crieur/route.ts      : sortiePermise au lieu de pauseGenerale, relue à chaque publication, publications déjà
//                                         programmées signalées, registre illisible ⇒ 503 ;
//   - lib/crieur/pauseProgrammees.ts (neuf) : compte et signale les publications déjà programmées dans Publora.
export const fiche = '026-garde-pause'
export const reference = '00f0ab51dab621a7043d3b57785c41ddd999c56e'
export const temoin = './temoin'
export const absents = ['lib/agents/sortie.ts', 'lib/crieur/pauseProgrammees.ts']

const EM = 'lib/email.ts'
const SO = 'lib/agents/sortie.ts'
const RE = 'app/api/cron/relances/route.ts'
const CR = 'app/api/cron/crieur/route.ts'
const PP = 'lib/crieur/pauseProgrammees.ts'

export const juges = [
  {
    commande: 'scripts/garde-pause-qa.mjs', arguments: [], loader: false, attendu: 'GP-1', criteresMin: 7,
    sabotages: [
      // GP-1 : la route des relances
      { nom: 'relances-ne-lit-pas-la-pause', fichier: RE, avant: 'const enPause = !(await sortiePermise()).permise', apres: 'const enPause = false', tue: 'GP-1' },
      { nom: 'relances-lit-les-contacts-sous-pause', fichier: RE, avant: '  if (!enPause) {\n    const lecture', apres: '  if (true as boolean) {\n    const lecture', tue: 'GP-1' },
      { nom: 'porte-retiree', fichier: SO, retirer: true, tue: 'GP-1' },
      // GP-2 : l'inventaire et le point de passage des e-mails
      { nom: 'email-garde-neutralisee', fichier: EM, avant: 'if (!opts.critique) {\n    const sortie', apres: 'if (!opts.critique && Date.now() < 0) {\n    const sortie', tue: 'GP-2' },
      { nom: 'email-bloque-aussi-le-critique', fichier: EM, avant: 'if (!opts.critique) {\n    const sortie', apres: 'if (true as boolean) {\n    const sortie', tue: 'GP-2' },
      // GP-3 : fail-closed
      { nom: 'porte-ouverte-sur-valeur-inattendue', fichier: SO, avant: 'p.active === false ? { permise: true }', apres: 'p.active !== true ? { permise: true }', tue: 'GP-3' },
      { nom: 'porte-ouverte-quand-la-lecture-leve', fichier: SO, avant: "} catch {\n    return { permise: false, raison: 'doute' }", apres: '} catch {\n    return { permise: true }', tue: 'GP-3' },
      // GP-4 : le Crieur
      { nom: 'crieur-sans-signalement', fichier: CR, avant: "const bilan = await signalerProgrammees()\n    if (!bilan.ok) return NextResponse.json({ pause: true, erreur: bilan.raison }, { status: 503 })\n    return NextResponse.json({ pause: true, programmees_a_signaler: bilan.programmees, signalees: bilan.signalees })", apres: 'return NextResponse.json({ pause: true })', tue: 'GP-4' },
      { nom: 'registre-illisible-compte-zero', fichier: PP, avant: "if (lecture.error) return { ok: false, raison:", apres: 'if (lecture.error) return { ok: true, programmees: 0, signalees: false, raison:', tue: 'GP-4' },
      // GP-5 : l'idempotence
      { nom: 'prise-non-conditionnelle', fichier: RE, avant: ".eq('id', r.id).eq('envoyee', false).select('id')", apres: ".eq('id', r.id).select('id')", tue: 'GP-5' },
      { nom: 'meme-prospect-deux-fois', fichier: RE, avant: 'if (contactes.has(lead.id)) { skipped++; continue }', apres: 'if (false as boolean) { skipped++; continue }', tue: 'GP-5' },
      // GP-6 : le plafond par passage et la limite de débit
      { nom: 'plafond-de-cinq-cents', fichier: RE, avant: 'const MAX_PAR_PASSAGE = 100', apres: 'const MAX_PAR_PASSAGE = 500', tue: 'GP-6' },
      { nom: 'insiste-apres-le-plafond-du-jour', fichier: RE, avant: '{ plafond = true; break }', apres: '{ plafond = true }', tue: 'GP-6' },
      // GP-7 : la pause relue à chaque élément
      { nom: 'relances-pause-lue-une-fois', fichier: RE, avant: 'if (!(await sortiePermise()).permise) { interrompue = true; break }', apres: 'if (false as boolean) { interrompue = true; break }', tue: 'GP-7' },
      { nom: 'crieur-pause-lue-une-fois', fichier: CR, avant: 'if (!(await sortiePermise()).permise) { interrompue = true; incidents.push(', apres: 'if (false as boolean) { interrompue = true; incidents.push(', tue: 'GP-7' },
    ],
  },
]

export const controles = [
  { id: 'JA-3', module: './controles.mjs', fonction: 'controleJeuxGP' },
]
