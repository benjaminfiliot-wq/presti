// lib/sms/numero.ts — le numéro mobile de MÉTROPOLE, en E.164 (+33 6… / +33 7…), ou rien.
//
// Acceptés : « 07 35 46 00 01 », « 0735460001 », « +33 7 35 46 00 01 », « 0033 7 35 46 00 01 », « +33 (0)7 35 46 00 01 ».
// Refusés : fixes (01-05, 09), numéros spéciaux (08), étranger, outre-mer (les mobiles 0639, 0690-0694, 0696-0697 se composent en
// 06 mais se joignent par +262, +269, +590, +594, +596 : plage à revérifier auprès de l'ARCEP, fermée dans le doute), « 070 » (non mobile).
// Aucun numéro réel dans les tests : la plage de fiction annoncée par l'ARCEP pour les mobiles est 07 35 46 xx xx (à revérifier).

const OUTRE_MER = /^(639|69[0-4]|69[67])/

/** `+33735460001` ou `null`. */
export function normaliserMobileMetropole(brut: unknown): string | null {
  if (typeof brut !== 'string') return null
  let s = brut.trim().replace(/[\s.\-]/g, '')
  if (!/^[+0-9()]+$/.test(s)) return null
  s = s.replace(/^\+33\(0\)/, '+33').replace(/^0033\(0\)/, '0033').replace(/[()]/g, '')
  let national: string
  if (s.startsWith('+33')) national = '0' + s.slice(3)
  else if (s.startsWith('0033')) national = '0' + s.slice(4)
  else national = s
  if (!/^0[67][0-9]{8}$/.test(national)) return null
  if (national.startsWith('070')) return null
  if (national.startsWith('06') && OUTRE_MER.test(national.slice(1))) return null
  return '+33' + national.slice(1)
}

export const estMobileMetropole = (brut: unknown): boolean => normaliserMobileMetropole(brut) !== null
