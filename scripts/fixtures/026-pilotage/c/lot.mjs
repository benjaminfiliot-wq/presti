// scripts/fixtures/026-pilotage/c/lot.mjs — la fiche du lot c (026-104), lue par scripts/juges-026-pilotage-preuve.mjs --lot=c.
// Contrat de tout lot.mjs : voir scripts/fixtures/026-pilotage/a/lot.mjs. Ce fichier n'importe rien.
//
// Référence : la même que le lot a (4041ec9) ; elle ne porte ni app/controle/station/, ni lib/pilotage/. Premier critère
// attendu en échec sur elle, SANS navigateur : ST-1, VU-1, SA-1, SB-1, FL-1, EG-1, EX-1 (fichiers de la station absents) et
// RE-0 (pilotage-recette.mjs, critères statiques seulement). Jamais --reel ni --constat.
//
// Témoin (./temoin) : l'IMPLÉMENTATION DE RÉFÉRENCE de la station écrite par Claude Code pour ce lot, qui n'est aucun écran
// livré : app/controle/station/** (le squelette de 026-111, les vues de 026-113, les salles de 026-120 et 026-164, le
// journal de 026-123, les gestes de 026-117, l'expérience de 026-125), lib/pilotage/equipage.ts (SALLES de 026-070) ; ce
// qu'il DÉRIVE de la référence (lib/flags.ts avec `pilotage: false,`, app/controle/page.tsx avec l'entrée Station et la
// redirection) et les routes que RE-0 exige (recopiées des témoins des lots b et s) se refont par
// `node scripts/fixtures/026-pilotage/c/fabriquer-temoin.mjs` ; le contrôle JA-3 vérifie qu'ils sont à jour.
//
// Chaque juge d'écran tourne sur le banc (c/banc.mjs : Chromium, 127.0.0.1, sans réseau), ses scénarios quatre à la fois.
// Les sabotages de contenu sont DÉTERMINISTES (ils cassent l'écran quel que soit le tirage au hasard du juge) : chacun laisse
// le premier critère vert et en tue un autre, qu'un juge de présence ne verrait pas ; un retrait de fichier tue le premier.
// fil-toutes-les-2-s, nouvelles-a-zero et les autres rejouent des fautes réelles (le témoin lui-même portait celle de
// nouvelles-a-zero : le juge l'a trouvée le 27/09).
export const fiche = '026-104'
export const reference = '4041ec9b41432576037dbc0b45e0647bd60a0347'
export const temoin = './temoin'
export const absents = ['app/controle/station/', 'lib/pilotage/']
const S = 'app/controle/station'
const ecran = (partie) => ({ commande: 'scripts/pilotage-ecran-qa.mjs', arguments: [`--partie=${partie}`], loader: false })
export const juges = [
  {
    ...ecran('station'), attendu: 'ST-1', criteresMin: 19,
    sabotages: [
      { nom: 'libelle-encaisse', fichier: `${S}/Barre.tsx`, avant: "argent('encaisse_mois', 'ENCAISSÉ · MOIS'", apres: "argent('encaisse_mois', 'ENCAISSE · MOIS'", tue: 'ST-4' },
      { nom: 'fil-toutes-les-2-s', fichier: `${S}/Station.tsx`, avant: 'window.setInterval(() => void lireFil(), 5_000)', apres: 'window.setInterval(() => void lireFil(), 2_000)', tue: 'ST-14' },
      // Contre-vérification du 28/09 : une carte Attention plus large que l'écran, coupée par `overflow: hidden` (le juge
      // d'avant la comptait « dans un conteneur à défilement ») ; un suffixe « · lecture n » posé sur le bandeau à chaque
      // vue=direct (le juge d'avant ne servait jamais de seconde lecture identique).
      { nom: 'debordement-tel-attention', fichier: `${S}/station.css`, avant: '.mc [data-carte-attention] { display: flex;', apres: '.mc [data-carte-attention] { min-width: 560px; display: flex;', tue: 'ST-10' },
      { nom: 'compteur-par-lecture', fichier: `${S}/Station.tsx`, avant: '    setDirect(r)', apres: '    const lecture = ((globalThis as any).__lecturesDirect = ((globalThis as any).__lecturesDirect ?? 0) + 1)\n    if (r.ok) for (const e of (r.data as any).valeur?.bandeau?.valeur?.elements ?? []) e.texte = `${e.texte} · lecture ${lecture}`\n    setDirect(r)', tue: 'ST-16' },
      { nom: 'station-retiree', fichier: `${S}/Station.tsx`, retirer: true, tue: 'ST-1' },
    ],
  },
  {
    ...ecran('vues'), attendu: 'VU-1', criteresMin: 9,
    sabotages: [
      { nom: 'barre-cible', fichier: `${S}/vues/Missions.tsx`, avant: 'aria-valuenow={m.valeur}', apres: 'aria-valuenow={m.cible}', tue: 'VU-2' },
      { nom: 'origine-cle', fichier: `${S}/vues/Aide.tsx`, avant: '{c.libelle} · {c.source}', apres: '{c.libelle} · {c.cle}', tue: 'VU-4' },
      // Contre-vérification du 28/09 : une mission plus large que la feuille du téléphone ; une feuille translucide (la
      // station se lit à travers le texte de la vue, elementFromPoint rend quand même la feuille).
      { nom: 'debordement-tel-missions', fichier: `${S}/vues/vues.css`, avant: '.mc .mc-mission { margin: 8px 0; }', apres: '.mc .mc-mission { margin: 8px 0; min-width: 560px; }', tue: 'VU-5' },
      { nom: 'feuille-translucide', fichier: `${S}/vues/vues.css`, avant: 'left: 0; background: var(--mc-fond); }', apres: 'left: 0; background: var(--mc-panneau); }', tue: 'VU-5' },
      { nom: 'aide-retiree', fichier: `${S}/vues/Aide.tsx`, retirer: true, tue: 'VU-1' },
    ],
  },
  {
    ...ecran('salles'), attendu: 'SA-1', criteresMin: 20,
    sabotages: [
      { nom: 'cout-ia-plus-un', fichier: `${S}/salles/Machines.tsx`, avant: '<div data-ia-cout className="mc-mono">{euros(ia.cout_jour_eur)}</div>', apres: '<div data-ia-cout className="mc-mono">{euros(ia.cout_jour_eur + 1)}</div>', tue: 'SA-20' },
      { nom: 'frais-recopie-net', fichier: `${S}/salles/Recettes.tsx`, avant: "frais <span data-frais>{mois ? euros(mois.frais) : '—'}</span>", apres: "frais <span data-frais>{mois ? euros(mois.net) : '—'}</span>", tue: 'SA-3' },
      // Contre-vérification du 28/09 : une fenêtre translucide au téléphone ; un panneau lu à l'ouverture puis plus jamais
      // (la cadence de useLecture multipliée par 1 000) ; un traceur vers un autre hôte dans le Standard.
      { nom: 'fenetre-translucide', fichier: `${S}/station.css`, avant: 'left: 0; background: var(--mc-fond); }', apres: 'left: 0; background: var(--mc-panneau); }', tue: 'SA-11' },
      { nom: 'panneau-fige', fichier: `${S}/outils.ts`, avant: 'const t = window.setInterval(() => ref.current(), ms)', apres: 'const t = window.setInterval(() => ref.current(), ms * 1000)', tue: 'SA-10' },
      { nom: 'traceur-externe', fichier: `${S}/salles/Standard.tsx`, avant: '<div className="mc-classes">', apres: '<img src="https://exemple.invalid/pixel.gif" alt="" width={1} height={1} /><div className="mc-classes">', tue: 'SA-12' },
      { nom: 'standard-retire', fichier: `${S}/salles/Standard.tsx`, retirer: true, tue: 'SA-1' },
    ],
  },
  {
    ...ecran('salles-suite'), attendu: 'SB-1', criteresMin: 8,
    sabotages: [
      { nom: 'studio-second-lien', fichier: `${S}/salles/Studio.tsx`, avant: '<Link href="/controle?onglet=packs" data-lien-packs>Ouvrir l’onglet Packs</Link>', apres: '<Link href="/controle?onglet=packs" data-lien-packs>Ouvrir l’onglet Packs</Link><a href="/controle?onglet=sites">Sites</a>', tue: 'SB-4' },
      { nom: 'chantier-toutes-les-10-s', fichier: `${S}/salles/Chantier.tsx`, avant: "useVue(['/api/controle/pilotage?bloc=code'], 60_000, visible)", apres: "useVue(['/api/controle/pilotage?bloc=code'], 10_000, visible)", tue: 'SB-5' },
      { nom: 'chantier-retire', fichier: `${S}/salles/Chantier.tsx`, retirer: true, tue: 'SB-1' },
    ],
  },
  {
    ...ecran('fil'), attendu: 'FL-1', criteresMin: 14,
    sabotages: [
      { nom: 'texte-non-rogne', fichier: `${S}/journal/Transmettre.tsx`, avant: 'body: JSON.stringify({ texte: net })', apres: 'body: JSON.stringify({ texte })', tue: 'FL-5' },
      { nom: 'nouvelles-a-zero', fichier: `${S}/Journal.tsx`, avant: '{ const plus = n - vues.current; setNouvelles((x) => x + plus) }', apres: 'setNouvelles((x) => x + (n - vues.current))', tue: 'FL-9' },
      { nom: 'transmettre-retire', fichier: `${S}/journal/Transmettre.tsx`, retirer: true, tue: 'FL-1' },
    ],
  },
  {
    ...ecran('gestes'), attendu: 'EG-1', criteresMin: 15,
    sabotages: [
      { nom: 'boite-sans-enjeu', fichier: `${S}/Gestes.tsx`, avant: 'portee: c.portee, action: c.question', apres: "portee: c.portee ?? 'securite', action: c.question", tue: 'EG-3' },
      // Plus de date d'ouverture (05/10/2026) : chaque preuve qui reste est sabotée, et le retour d'une date aussi.
      { nom: 'ouverture-sans-mesure', fichier: `${S}/Gestes.tsx`, avant: "if (!g.mesure_a_sec) return 'La mesure à sec n’a pas réussi.'", apres: "if (false) return 'La mesure à sec n’a pas réussi.'", tue: 'EG-13' },
      { nom: 'ouverture-sans-epreuve', fichier: `${S}/Gestes.tsx`, avant: "if (!g.epreuve_passee) return 'L’épreuve de bout en bout n’a pas encore réussi.'", apres: "if (false) return 'L’épreuve de bout en bout n’a pas encore réussi.'", tue: 'EG-13' },
      { nom: 'ouverture-notice-perimee', fichier: `${S}/Gestes.tsx`, avant: 'Date.now() - Date.parse(g.notice_verifiee_le) > 7 * 86_400_000', apres: 'Date.now() - Date.parse(g.notice_verifiee_le) > 700 * 86_400_000', tue: 'EG-13' },
      { nom: 'date-d-ouverture-revient', fichier: `${S}/Gestes.tsx`, avant: 'function raisonFermee(g: Gestes): string | null {\n', apres: "function raisonFermee(g: Gestes): string | null {\n  if (Date.now() < Date.parse('2026-10-12T00:00:00+02:00')) return 'Pas avant le lundi 12/10.'\n", tue: 'EG-13' },
      { nom: 'gestes-css-retire', fichier: `${S}/gestes.css`, retirer: true, tue: 'EG-1' },
    ],
  },
  {
    ...ecran('experience'), attendu: 'EX-1', criteresMin: 9,
    sabotages: [
      { nom: 'progression-sur', fichier: `${S}/salles/Experience.tsx`, avant: 'aria-valuenow={v.jour}', apres: 'aria-valuenow={v.sur}', tue: 'EX-4' },
      { nom: 'panne-cachee', fichier: `${S}/salles/Experience.tsx`, avant: '<Contenu rep={vue} source="Salle Expérience">', apres: "<Contenu rep={vue && !vue.ok ? ({ ok: true, status: 200, data: { valeur: { texte: '', statut: 'fermee' } } } as any) : vue} source=\"Salle Expérience\">", tue: 'EX-6' },
      { nom: 'experience-css-retire', fichier: `${S}/salles/experience.css`, retirer: true, tue: 'EX-1' },
    ],
  },
  {
    commande: 'scripts/pilotage-recette.mjs', arguments: [], loader: false, attendu: 'RE-0', criteresMin: 5,
    sabotages: [
      { nom: 'carte-sans-attente', fichier: `${S}/Carte.tsx`, avant: 'La carte de la station arrive avec sa fiche.', apres: 'La carte de la station.', tue: 'RE-0-CARTE' },
      { nom: 'drapeau-renomme', fichier: 'lib/flags.ts', avant: '  pilotage: false,', apres: '  pilote: false,', tue: 'RE-0-DRAPEAU' },
      { nom: 'reunion-retiree', fichier: 'app/api/agents/reunion/route.ts', retirer: true, tue: 'RE-0' },
    ],
  },
]
export const controles = [
  { id: 'JA-3', module: './controles.mjs', fonction: 'controleJeux' },
  { id: 'JA-6', module: './controles.mjs', fonction: 'controleAppels' },
]
