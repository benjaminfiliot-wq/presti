// TÉMOIN du juge usine-socle-qa (026-048) : une mise en œuvre minimale des règles du coffre, écrite par Claude Code pour
// prouver que le juge sait passer au vert. Ce n'est PAS le livrable de 026-050.
export const NOMS_PERMIS = Object.freeze(['PRESTI_JETON_CHEF', 'PRESTI_JETON_USINE', 'PRESTI_JETON_ATELIER', 'PRESTI_JETON_LIVREUR_USINE', 'PRESTI_JETON_FACTEUR_USINE', 'PRESTI_JETON_TELEGRAM', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'PRESTI_JETON_STANDARDISTE', 'PRESTI_JETON_FACTEUR', 'TELEGRAM_CODE_APPAIRAGE'])
const INTERDITS = ['sb_secret_', 'sk_live_', 'sk_test_', 'rk_live_', 'whsec_', 'sk-ant-']
const refus = (raison) => ({ ok: false, raison })
export function validerNom(nom) {
  return NOMS_PERMIS.includes(nom) ? { ok: true } : refus('nom hors de la liste fermée')
}
export function validerValeur(nom, valeur) {
  const n = validerNom(nom)
  if (!n.ok) return n
  if (typeof valeur !== 'string' || valeur === '') return refus('valeur vide')
  if (/^eyJ/.test(valeur) && valeur.split('.').length === 3) return refus('forme de JWT refusée')
  for (const p of INTERDITS) if (valeur.startsWith(p)) return refus('forme de clé interdite')
  if (nom === 'TELEGRAM_BOT_TOKEN') return /^\d{6,12}:[A-Za-z0-9_-]{30,}$/.test(valeur) ? { ok: true } : refus('jeton de bot mal formé')
  if (nom === 'TELEGRAM_CHAT_ID') return /^-?\d{5,15}$/.test(valeur) || valeur === 'aucun' ? { ok: true } : refus('identifiant de conversation mal formé')
  if (nom === 'TELEGRAM_CODE_APPAIRAGE') return /^[A-HJ-NP-Z2-9]{8}$/.test(valeur) || valeur === 'epuise' ? { ok: true } : refus('code d\'appairage mal formé')
  if (!/^[A-Za-z0-9._~+/=-]{20,256}$/.test(valeur)) return refus('valeur hors de la forme permise')
  if (nom.startsWith('PRESTI_JETON_') && /^(sk-|eyJ)/.test(valeur)) return refus('un jeton d\'agent ne commence ni par sk- ni par eyJ')
  return { ok: true }
}
