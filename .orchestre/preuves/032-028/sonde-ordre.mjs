import { ordreGroupe, nommeDans } from '../../../lib/assistant/cartes.ts'
const essais = [
 'Relance les devis envoyés il y a plus de 5 jours',
 'Relance Dupont et Martin',
 'Relance le devis de Dupont et celui de Martin',
 'Relance tout le monde',
 'Relance tout ce qui est en attente',
 'Relance DEV-2026-0012 et 0013',
 'Relance DEV-2026-0012 puis DEV-2026-0013',
 'relance dupont, martin, durand',
 'Tous les devis en attente : relance',
 'relance chacun de mes clients',
 'relance l\'ensemble des devis',
 'relance la totalité des devis en attente',
 'Relancez les gens qui n\'ont pas répondu',
 'relance tous mes devis',
 'Relance le devis DEV-2026-0012',
 'relance le devis de Dupont',
 'relance Dupont. Et Martin aussi.',
 'Relance devis 12 et 13',
 'relance les 3 devis sans réponse',
 'relance les quatre vieux devis sans réponse',
]
for (const e of essais) console.log(ordreGroupe(e) ? 'GROUPE ' : 'SEUL   ', '|', e)
console.log('nommeDans DEV-2026-1000 dans "relance DEV-2026-10001":', nommeDans('relance DEV-2026-10001', 'DEV-2026-1000'))
console.log('nommeDans 12 dans "devis de plus de 12 jours":', nommeDans('relance les devis de plus de 12 jours', '12'))
