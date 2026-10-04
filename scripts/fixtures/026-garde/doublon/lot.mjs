// scripts/fixtures/026-garde/doublon/lot.mjs — le lot « gdoublon » de scripts/juges-026-pilotage-preuve.mjs (contrat : 026-pilotage/a/lot.mjs),
// écrit par Claude Code : la preuve du juge garde-doublon-qa (GD-1 à GD-8). Elle se joue seule :
//   node scripts/juges-026-pilotage-preuve.mjs --lot=gdoublon --lot-fichier=scripts/fixtures/026-garde/doublon/lot.mjs
//
// Référence : 00f0ab51 (HEAD du 30/09 : « Synthèse de la revue … »). Elle ne porte NI lib/agents/acquisition/facteur.ts (le Facteur décrit par
// la fiche 026-089 n'est pas dans cet arbre : son `executerFacteur` n'existe qu'à l'état de fiche et dans le juge facteur-qa) NI la migration
// de réservation : GD-1 y est donc rouge, « facteur.ts absent ». Sur l'arbre de Benj, où facteur.ts existe, GD-1 rougit pour ce que le
// correctif doit changer (aucun reserverEnvoi avant gmail.envoyer).
//
// Fiche : `026-garde-doublon` — la preuve exige ^026-[\w-]+$ et écrit .orchestre/preuves/<fiche>/echecs-attendus.md ; la copie des sorties est
// aussi déposée sous .orchestre/preuves/garde-doublon/ (le chemin confié à cette tâche).
//
// Témoin (./temoin, suffixe .temoin) : le chemin d'envoi du Facteur avec réservation (facteur.ts), la déclaration de la réservation au
// contrat du magasin et son appel RPC (contrat.ts, magasinSupabase.ts : deux méthodes et le contrôle de { ok:false } de marquerEnvoye), et
// un BROUILLON de la migration 0121 (réservation, clé unique, garde envoye, incertain, réconciliation) — une étude pour les critères SQL,
// pas la migration livrée.
export const fiche = '026-garde-doublon'
export const reference = '00f0ab51dab621a7043d3b57785c41ddd999c56e'
export const temoin = './temoin'
export const absents = ['lib/agents/acquisition/facteur.ts', 'supabase/migrations/0121_reservation_envoi.sql']

const F = 'lib/agents/acquisition/facteur.ts'
const C = 'lib/agents/acquisition/contrat.ts'
const M = 'lib/agents/acquisition/magasinSupabase.ts'
const Q = 'supabase/migrations/0121_reservation_envoi.sql'
const RESERVER = "  try { res = await deps.magasin.reserverEnvoi(e.id, cle) } catch { return 'refus_reservation' }"
const REFUS = "  if (!res.ok) { bilan.refus_reservation[res.raison] = (bilan.refus_reservation[res.raison] ?? 0) + 1; return 'refus_reservation' }"
const ENVOYER = "  try { sortie = await lancer() } catch { sortie = { ok: false, erreur: 'injoignable', definitif: false } }"

export const juges = [
  {
    commande: 'scripts/garde-doublon-qa.mjs', arguments: [], loader: true, attendu: 'GD-1', criteresMin: 8,
    sabotages: [
      // GD-1 : réserver AVANT d'envoyer, et ne rien envoyer sans réservation
      { nom: 'reservation-absente', fichier: F, avant: RESERVER, apres: '  res = { ok: true }', tue: 'GD-1' },
      { nom: 'reservation-apres-envoi', fichier: F, avant: `  let res: ResReservation\n${RESERVER}\n${REFUS}\n\n  let sortie: SortieGmail | SortieMeta\n${ENVOYER}\n`, apres: `  let sortie: SortieGmail | SortieMeta\n${ENVOYER}\n  let res: ResReservation\n${RESERVER}\n${REFUS}\n`, tue: 'GD-1' },
      { nom: 'reservation-en-panne-on-envoie', fichier: F, avant: RESERVER, apres: "  try { res = await deps.magasin.reserverEnvoi(e.id, cle) } catch { res = { ok: true } }", tue: 'GD-1' },
      { nom: 'facteur-retire', fichier: F, retirer: true, tue: 'GD-1' },
      // GD-2 : l'issue incertaine ne rend jamais l'envoi au renvoi
      { nom: 'ecriture-envoye-relache', fichier: F, avant: "catch { await aReconcilier(deps, e, 'ecriture_envoye'); bilan.incertains++; return 'incertain' }", apres: "catch { await deps.magasin.marquerEchec(e.id, 'ecriture_envoye'); return 'echec' }", tue: 'GD-2' },
      { nom: 'injoignable-pris-pour-un-refus-net', fichier: F, avant: "if (motif === 'injoignable' || motif === 'autre') {", apres: "if (motif === 'autre') {", tue: 'GD-2' },
      { nom: 'carte-avec-le-destinataire', fichier: F, avant: "resume: `Envoi incertain (${e.canal}, ${e.type}) : à réconcilier, aucun renvoi automatique.`", apres: "resume: `Envoi incertain vers ${e.destinataire} : à réconcilier.`", tue: 'GD-2' },
      { nom: 'magasin-tait-ok-false', fichier: M, avant: "    if (r && r.ok === false) throw new Error(`[magasinSupabase] acq_envoi_envoye : ${r.raison}`)\n", apres: '', tue: 'GD-2' },
      // GD-3 : une seule tentative gagne
      { nom: 'refus-de-reservation-ignore', fichier: F, avant: REFUS, apres: "  if (!res.ok) { bilan.refus_reservation[res.raison] = (bilan.refus_reservation[res.raison] ?? 0) + 1 }", tue: 'GD-3' },
      { nom: 'reservation-sql-non-conditionnelle', fichier: Q, avant: "where id = p_envoi and statut = 'approuve';\n  exception when unique_violation", apres: "where id = p_envoi;\n  exception when unique_violation", tue: 'GD-3' },
      // GD-4 : la clé
      { nom: 'cle-au-hasard', fichier: F, avant: "const source = `${e.destinataire.trim().toLowerCase()}|${e.modele_id}|${e.fait_id ?? 'sans_fait'}`", apres: "const source = `${e.destinataire.trim().toLowerCase()}|${e.modele_id}|${e.fait_id ?? 'sans_fait'}|${Math.random()}`", tue: 'GD-4' },
      { nom: 'cle-sans-normalisation', fichier: F, avant: "const source = `${e.destinataire.trim().toLowerCase()}|", apres: "const source = `${e.destinataire}|", tue: 'GD-4' },
      { nom: 'cle-non-unique-en-base', fichier: Q, avant: 'create unique index if not exists envois_cle_envoi_unique on ops.envois (cle_envoi) where cle_envoi is not null;', apres: 'create index if not exists envois_cle_envoi on ops.envois (cle_envoi);', tue: 'GD-4' },
      // GD-5 : les trois envoyeurs, une seule réservation
      { nom: 'meta-sans-reservation', fichier: F, avant: "      const issue = await envoyerUn(deps, e, bilan, () => (canal === 'messagerie'\n        ? meta.message({ meta_id: e.destinataire, texte: e.texte })\n        : meta.reponsePrivee({ commentaire_id: conv?.commentaire_id ?? '', texte: e.texte })))\n", apres: "      const sortie = await (canal === 'messagerie' ? meta.message({ meta_id: e.destinataire, texte: e.texte }) : meta.reponsePrivee({ commentaire_id: conv?.commentaire_id ?? '', texte: e.texte }))\n      try { await deps.magasin.marquerEnvoye(e.id, { id_externe: sortie.ok ? sortie.id : '', entetes: {} }) } catch { /* rien */ }\n      const issue: Issue = 'envoye'\n", tue: 'GD-5' },
      { nom: 'formulaire-sans-reservation', fichier: Q, avant: "set statut = 'en_cours_envoi', reserve_le = now(), cle_envoi = ops.cle_envoi(e.destinataire, e.modele_id, e.fait_id)", apres: 'set reserve_le = now()', tue: 'GD-5' },
      { nom: 'contrat-sans-reserverEnvoi', fichier: C, avant: '  reserverEnvoi(id: string, cle: string): Promise<ResultatRegle>\n', apres: '', tue: 'GD-5' },
      // GD-6 : la base refuse envoye hors réservation
      { nom: 'envoye-sans-reservation-permis', fichier: Q, avant: "        raise exception using message = 'ops:envoye_sans_reservation', errcode = 'P0001';", apres: '        null;', tue: 'GD-6' },
      { nom: 'essai-e2e-non-borne', fichier: Q, avant: " and lower(coalesce(new.destinataire, '')) like '%.invalid'", apres: '', tue: 'GD-6' },
      // GD-7 : la pause est lue à la réservation
      { nom: 'reservation-sans-pause', fichier: Q, avant: "  if public.ops_interrupteur('pause_generale') then\n    return jsonb_build_object('ok', false, 'raison', 'pause');\n  end if;\n", apres: '', tue: 'GD-7' },
      // GD-8 : le plafond du jour, tenu à la réservation
      { nom: 'reservation-sans-plafond', fichier: Q, avant: "    if v_n >= v_plafond then\n      return jsonb_build_object('ok', false, 'raison', 'plafond');\n    end if;\n", apres: '', tue: 'GD-8' },
      { nom: 'plafond-brule-un-echec', fichier: F, avant: REFUS, apres: "  if (!res.ok) { bilan.refus_reservation[res.raison] = (bilan.refus_reservation[res.raison] ?? 0) + 1; try { await deps.magasin.marquerEchec(e.id, res.raison) } catch { /* rien */ } return 'refus_reservation' }", tue: 'GD-8' },
    ],
  },
]

export const controles = [
  { id: 'JA-3', module: './controles.mjs', fonction: 'controleJeuxGD' },
]
