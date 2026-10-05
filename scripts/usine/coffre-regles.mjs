// scripts/usine/coffre-regles.mjs — les règles du coffre des agents de l'usine, en Node (fiche 026-050).
//
// La même règle existe en bash dans scripts/usine/presti-coffre.sh (l'assistant qui écrit le coffre sur l'usine) : les deux
// sont jugées sur la même table de cas (scripts/fixtures/026/usine-socle/coffre/cas-valeurs.json, usine-socle-qa CF-3 et
// CF-10). Qui change une règle ici la change là-bas, dans le même commit.
//
// Le coffre ne reçoit que des clés plafonnées : les jetons d'agents (026-040 : un jeton par agent, haché dans la base, limité
// à ses types et à ses tables) et ce dont le pont Telegram a besoin (026-195, 026-196). Jamais la clé de service Supabase,
// jamais une clé Stripe, jamais une clé de modèle, jamais .env.local. PRESTI_URL n'est pas un secret : il se pose dans
// l'unité systemd (Environment=), pas ici.
//
// validerNom et validerValeur rendent { ok: true } ou { ok: false, raison } ; la raison ne cite JAMAIS la valeur.

export const NOMS_PERMIS = Object.freeze([
  'PRESTI_JETON_CHEF',
  'PRESTI_JETON_USINE',
  'PRESTI_JETON_ATELIER', // l'agent atelier_maquettes (026-097 réécrite)
  'PRESTI_JETON_LIVREUR_USINE',
  'PRESTI_JETON_STUDIO', // le Studio pubs : packs locaux et échantillons (026-175, 026-200)
  'PRESTI_JETON_FACTEUR_USINE', // le porteur du formulaire (026-095, voie gratuite du 25/09)
  'PRESTI_JETON_TELEGRAM', // le pont Telegram (026-195)
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'PRESTI_JETON_STANDARDISTE', // le Standard (026-094)
  'PRESTI_JETON_FACTEUR', // le Facteur (026-094)
  'TELEGRAM_CODE_APPAIRAGE', // le code d'appairage à usage unique du pont (026-195, 026-196)
  'PRESTI_JETON_SAV', // le SAV (026-245, 026-251)
  'PRESTI_JETON_QUALITE', // le Contrôleur qualité des sites, agent qualite_sites (026-247, 026-251)
  'PRESTI_JETON_VIGILE', // le Vigile (026-249, 026-251)
  'FIRECRAWL_API_KEY', // la lecture web du Savoir (D-0510-I1) : clé plafonnée par crédits (réserve de 1 000, jamais plus que le solde restant), pas une clé de modèle
])

// Formes de clés connues, refusées quel que soit le nom sous lequel on essaie de les poser (les JWT à part, plus bas).
// sk-ant- couvre aussi les clés d'administration Anthropic : plus aucune clé de modèle n'entre au coffre (R16 annulée).
export const FORMES_REFUSEES = Object.freeze(['sb_secret_', 'sk_live_', 'sk_test_', 'rk_live_', 'whsec_', 'sk-ant-admin', 'sk-ant-'])
// Un JWT (clés anon et service de Supabase) : eyJ en tête, puis deux points au moins (en-tête.charge.signature).
const JWT = /^eyJ[^.]*\.[^.]*\./

// Les deux noms du bot Telegram ont leur propre forme, et le code d'appairage la sienne [à vérifier : forme actuelle des
// jetons de bot Telegram ; une seule constante à changer, ici et dans presti-coffre.sh].
export const FORME_TELEGRAM_BOT_TOKEN = /^\d{6,12}:[A-Za-z0-9_-]{30,}$/
export const FORME_TELEGRAM_CHAT_ID = /^-?\d{5,15}$/ // ou « aucun » tant que la conversation n'est pas appairée
export const FORME_CODE_APPAIRAGE = /^[A-HJ-NP-Z2-9]{8}$/ // ou « epuise » une fois l'appairage fait
// Une clé Firecrawl : « fc- » puis 32 signes [A-Za-z0-9] (la forme réelle est fc- + 32 hexadécimaux). Une forme propre, plus étroite que
// la règle générale : sous ce nom, une clé d'un autre fournisseur (sk-proj-…, par exemple) est refusée, jamais une clé de modèle ici.
export const FORME_FIRECRAWL = /^fc-[A-Za-z0-9]{32}$/
// Tout autre nom : 20 à 256 signes, sans blanc, guillemet, $, barre oblique inverse, accent grave ni retour à la ligne.
const SIGNES = /^[A-Za-z0-9._~+/=-]+$/
const LONGUEUR_MIN = 20
const LONGUEUR_MAX = 256

const refus = (raison) => ({ ok: false, raison })

export function validerNom(nom) {
  if (typeof nom !== 'string' || !NOMS_PERMIS.includes(nom)) return refus(`nom hors de la liste fermée du coffre (${NOMS_PERMIS.join(', ')})`)
  return { ok: true }
}

export function validerValeur(nom, valeur) {
  const n = validerNom(nom)
  if (!n.ok) return n
  if (typeof valeur !== 'string' || valeur === '') return refus('valeur vide')
  if (JWT.test(valeur)) return refus('un JWT (eyJ… à deux points) n\'entre jamais au coffre, quel que soit le nom')
  for (const forme of FORMES_REFUSEES) {
    if (valeur.startsWith(forme)) return refus(`une clé de forme « ${forme}… » n'entre jamais au coffre, quel que soit le nom`)
  }
  if (nom === 'TELEGRAM_BOT_TOKEN') {
    return FORME_TELEGRAM_BOT_TOKEN.test(valeur) ? { ok: true } : refus('TELEGRAM_BOT_TOKEN : 6 à 12 chiffres, deux-points, puis 30 signes au moins de [A-Za-z0-9_-]')
  }
  if (nom === 'TELEGRAM_CHAT_ID') {
    return FORME_TELEGRAM_CHAT_ID.test(valeur) || valeur === 'aucun' ? { ok: true } : refus('TELEGRAM_CHAT_ID : un entier de 5 à 15 chiffres (signe - permis), ou « aucun »')
  }
  if (nom === 'TELEGRAM_CODE_APPAIRAGE') {
    return FORME_CODE_APPAIRAGE.test(valeur) || valeur === 'epuise' ? { ok: true } : refus('TELEGRAM_CODE_APPAIRAGE : 8 signes de [A-HJ-NP-Z2-9], ou « epuise »')
  }
  if (nom === 'FIRECRAWL_API_KEY') {
    return FORME_FIRECRAWL.test(valeur) ? { ok: true } : refus('FIRECRAWL_API_KEY : « fc- » puis 32 signes de [A-Za-z0-9]')
  }
  if (valeur.length < LONGUEUR_MIN || valeur.length > LONGUEUR_MAX) return refus(`longueur hors de ${LONGUEUR_MIN} à ${LONGUEUR_MAX} signes`)
  if (!SIGNES.test(valeur)) return refus('signe interdit : seuls [A-Za-z0-9._~+/=-] sont permis (ni blanc, ni guillemet, ni $, ni barre oblique inverse, ni accent grave, ni retour à la ligne)')
  if (nom.startsWith('PRESTI_JETON_') && (valeur.startsWith('sk-') || valeur.startsWith('eyJ'))) return refus('un PRESTI_JETON_* ne commence ni par sk- ni par eyJ')
  return { ok: true }
}
