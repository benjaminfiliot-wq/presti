// scripts/fixtures/026-garde/plafond/lot.mjs — le lot du juge garde-plafond-qa (plafond de 0 € par agent, mécanisé), lu par
// scripts/juges-026-pilotage-preuve.mjs (contrat : scripts/fixtures/026-pilotage/a/lot.mjs). Écrit par Claude Code.
//   node scripts/juges-026-pilotage-preuve.mjs --lot=gplafond --lot-fichier=scripts/fixtures/026-garde/plafond/lot.mjs
//
// Référence : 00f0ab51 (HEAD de la branche au 30/09, « Synthèse de la revue… »), l'arbre d'AVANT le correctif : il n'a ni
// lib/agents/depense.mjs ni la migration 0121. Le juge y est rouge sur GF-1 (engage_cents et montant_cents > 0 acceptés).
// Fiche : « 026-garde-plafond » (la preuve exige ^026-[\w-]+$ ; .orchestre/preuves/026-garde-plafond est un lien vers
// .orchestre/preuves/garde-plafond, le dossier de ce chantier).
//
// Témoin (./temoin, fabriqué par fabriquer-temoin.mjs) : les correctifs minimaux, en copies .temoin — GF-1 (commun.mjs), GF-2/GF-3
// (llm.ts, bus.ts, migration 0121), GF-4 (migration 0121), GF-5 (depense.mjs neuf et trois scripts gardés), GF-6 (orchestre.mjs), GF-7
// (pilotage-recette.mjs et quatre documents annotés), GF-8 (veilleur.ts). Chaque sabotage défait UN de ces correctifs.
export const fiche = '026-garde-plafond'
export const reference = '00f0ab51dab621a7043d3b57785c41ddd999c56e'
export const temoin = './temoin'
export const absents = ['lib/agents/depense.mjs', 'supabase/migrations/0121_plafond_avant_coup.sql']

const CO = 'scripts/chef/commun.mjs'
const LL = 'lib/agents/llm.ts'
const DE = 'lib/agents/depense.mjs'
const SQ = 'supabase/migrations/0121_plafond_avant_coup.sql'
const VE = 'lib/agents/veilleur.ts'
const OR = 'scripts/orchestre.mjs'
const RE = 'scripts/pilotage-recette.mjs'
const MA = 'scripts/agents/mesure-a-sec.mjs'
const CE = 'scripts/coentreprise.mjs'
const CH = 'scripts/savoir/chercher.mjs'
const PG = 'reprise-cloud/docs/Ecosysteme-Prospection-Gratuite-2026-09-24.md'
const GATE_PERPLEXITY = "    const garde = autoriserDepense({ agent: 'savoir', fournisseur: 'perplexity', cout_eur: coutEstimeDeLEnv(), jeton_depense: jetonDepenseDeLEnv() })\n    if (!garde.ok) return { refus: `depense_${garde.motif}` }\n    let r\n"
const VERIF_CREER = "      if (!(await plafondAutorise(verifierPlafondFn, agent, cout))) throw new Error('plafond de coût : appel refusé avant consommation')\n"

export const juges = [
  {
    commande: 'scripts/garde-plafond-qa.mjs', arguments: [], loader: false, attendu: 'GF-1', criteresMin: 10,
    sabotages: [
      // GF-1 : l'argent d'un agent
      { nom: 'engage-permis', fichier: CO, avant: 'op.engage_cents !== 0) f.push(', apres: 'op.engage_cents < 0) f.push(', tue: 'GF-1' },
      { nom: 'montant-permis', fichier: CO, avant: 'd.montant_cents !== 0) f.push(', apres: 'd.montant_cents < 0) f.push(', tue: 'GF-1' },
      // GF-2 : un coût inconnu n'est pas 0
      { nom: 'cout-zero-litteral-inscrit', fichier: LL, avant: 'enregistrerCoutFn(agent, cout, resultat.detail)', apres: 'enregistrerCoutFn(agent, 0, resultat.detail)', tue: 'GF-2' },
      { nom: 'cout-inconnu-accepte', fichier: LL, avant: "      if (!coutValide(cout)) throw new Error('coût inconnu : appel refusé')\n", apres: '', tue: 'GF-2' },
      { nom: 'inscription-sans-garde-de-montant', fichier: LL, avant: "  if (typeof montant !== 'number' || !Number.isFinite(montant) || montant < 0) return { coupe: true } // un coût inconnu n'est pas un coût nul\n", apres: '', tue: 'GF-2' },
      { nom: 'laya-cout-zero-litteral', fichier: LL, avant: "await enregistrerCoutFn('laya', coutJev,", apres: "await enregistrerCoutFn('laya', 0,", tue: 'GF-2' },
      { nom: 'voie-payante-declaree-gratuite', fichier: LL, avant: '{ codex: 0, freellmapi: 0, ollama_local: 0, laya: 0 }', apres: '{ codex: 0, freellmapi: 0, ollama_local: 0, laya: 0, perplexity: 0 }', tue: 'GF-2' },
      { nom: 'sql-montant-null-accepte', fichier: SQ, avant: "  if p_montant_eur is null or p_montant_eur = 'NaN'::numeric or p_montant_eur < 0 then\n    raise exception using message = 'ops:cout_inconnu', errcode = 'P0001';\n  end if;\n", apres: '', tue: 'GF-2' },
      { nom: 'depense-cout-chaine-avec-jeton', fichier: DE, avant: "if (typeof cout !== 'number' || !Number.isFinite(cout) || cout < 0) return refus('cout_inconnu')", apres: "if (cout === undefined) return refus('cout_inconnu')", tue: 'GF-2' },
      // GF-3 : vérifier → appeler → inscrire
      { nom: 'plafond-verdict-ignore', fichier: LL, avant: VERIF_CREER, apres: "      await plafondAutorise(verifierPlafondFn, agent, cout)\n", tue: 'GF-3' },
      { nom: 'plafond-verifie-apres-l-appel', fichier: LL, avant: VERIF_CREER + "      const resultat = await essayerUneVoie(id, systeme, donnees)\n", apres: "      const resultat = await essayerUneVoie(id, systeme, donnees)\n      if (!(await plafondAutorise(verifierPlafondFn, agent, cout))) throw new Error('plafond de coût : dépassé après coup')\n", tue: 'GF-3' },
      { nom: 'defaut-ouvert-en-panne', fichier: LL, avant: '    return r.ok === true && r.data === true\n', apres: '    return r.ok === true || r.data !== false\n', tue: 'GF-3' },
      { nom: 'defaut-catch-ouvert', fichier: LL, avant: '    return r.ok === true && r.data === true\n  } catch { return false }', apres: '    return r.ok === true && r.data === true\n  } catch { return true }', tue: 'GF-3' },
      { nom: 'entraide-sans-controle', fichier: LL, avant: "  if (!coutValide(coutConseil) || !(await plafondAutorise(verifierPlafondFn, 'entraide', coutConseil))) return null\n", apres: '', tue: 'GF-3' },
      { nom: 'sql-plafond-compare-apres', fichier: SQ, avant: "  if v_total + p_montant_eur > v_agent.plafond_euros_jour then\n    raise exception using message = 'ops:plafond', errcode = 'P0001';\n  end if;\n", apres: '', tue: 'GF-3' },
      // GF-4 : le plafond par défaut est 0
      { nom: 'plafond-defaut-un', fichier: SQ, avant: 'alter column plafond_euros_jour set default 0;', apres: 'alter column plafond_euros_jour set default 1;', tue: 'GF-4' },
      { nom: 'lignes-semees-gardent-un-euro', fichier: SQ, avant: 'update ops.agents set plafond_euros_jour = 0 where plafond_euros_jour <> 0;\n', apres: '', tue: 'GF-4' },
      // GF-5 : chaque voie payante passe par le point de contrôle
      { nom: 'gratuite-de-toute-voie-a-zero', fichier: DE, avant: 'if (GRATUITS.includes(fournisseur) && cout === 0)', apres: 'if (cout === 0)', tue: 'GF-5' },
      { nom: 'jeton-non-verifie', fichier: DE, avant: "    if (verifier(jeton) !== true) return refus('signature_refusee')\n", apres: '', tue: 'GF-5' },
      { nom: 'jeton-expire-accepte', fichier: DE, avant: 'expire <= maintenant || ', apres: '', tue: 'GF-5' },
      { nom: 'jeton-plafond-de-montant-ignore', fichier: DE, avant: "    if (cout > jeton.montant_max_eur) return refus('jeton_insuffisant')\n", apres: '', tue: 'GF-5' },
      { nom: 'jeton-emis-par-quiconque', fichier: DE, avant: "jeton.emis_par !== 'benj' || ", apres: '', tue: 'GF-5' },
      { nom: 'sans-secret-jeton-accepte', fichier: DE, avant: "if (typeof secret !== 'string' || secret.length < 32) return false", apres: "if (typeof secret !== 'string') return true", tue: 'GF-5' },
      { nom: 'firecrawl-verdict-jamais-lu', fichier: MA, avant: '  if (!garde.ok) return { statut: 403, corps: null }\n', apres: '', tue: 'GF-5' },
      { nom: 'anthropic-sans-import-du-controle', fichier: CE, avant: "import { autoriserDepense, jetonDepenseDeLEnv, coutEstimeDeLEnv } from '../lib/agents/depense.mjs'\n", apres: '', tue: 'GF-5' },
      { nom: 'perplexity-sans-garde', fichier: CH, avant: GATE_PERPLEXITY, apres: '    let r\n', tue: 'GF-5' },
      { nom: 'agent-importe-l-ia-du-produit', fichier: VE, avant: '  // 5. le coupe-circuit : tout euro de coût sans recette (plafond de 0 € par agent)\n', apres: "  // 5. le coupe-circuit : tout euro de coût sans recette (plafond de 0 € par agent)\n  void (await import('@/lib/ai'))\n", tue: 'GF-5' },
      // GF-6 : la quarantaine
      { nom: 'quarantaine-sans-tarif', fichier: OR, avant: 'argent|prix|tarif|pai(?:ement|e)', apres: 'argent|prix|pai(?:ement|e)', tue: 'GF-6' },
      { nom: 'quarantaine-sans-dollar', fichier: OR, avant: '|euro|dollar|usd|', apres: '|euro|usd|', tue: 'GF-6' },
      { nom: 'quarantaine-tout-refuse', fichier: OR, avant: '|[€$]/iu', apres: '|[€$]|/iu', tue: 'GF-6' },
      // GF-7 : aucun budget donné à un agent
      { nom: 'budget-d-essai-un-euro', fichier: RE, avant: 'p_plafond_euros_jour: 0 })', apres: 'p_plafond_euros_jour: 1 })', tue: 'GF-7' },
      { nom: 'document-prevoit-la-depense', fichier: PG, avant: ' (annulé le 25/09 : aucun achat, décision de Benj ; plafond de 0 € par agent)', apres: '', tue: 'GF-7' },
      // GF-8 : le coupe-circuit
      { nom: 'seuil-cent-cinquante', fichier: VE, avant: 'if (couts > 0) {', apres: 'if (couts > 150) {', tue: 'GF-8' },
      { nom: 'message-cent-cinquante', fichier: VE, avant: "'coupe-circuit : des euros dépensés sans recette'", apres: "'coupe-circuit : 150 € dépensés sans recette'", tue: 'GF-8' },
      // GF-9 : non-régression
      { nom: 'agent-lit-une-cle-payante', fichier: LL, avant: 'export const COUT_VOIE_EUROS', apres: 'void process.env.ANTHROPIC_API_KEY\nexport const COUT_VOIE_EUROS', tue: 'GF-9' },
      // le premier critère : le validateur du chef retiré
      { nom: 'validateur-du-chef-retire', fichier: CO, retirer: true, tue: 'GF-1' },
    ],
  },
]

export const controles = [
  { id: 'JA-3', module: './controles.mjs', fonction: 'controleJeuxGarde' },
]
