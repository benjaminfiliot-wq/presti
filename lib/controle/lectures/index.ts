// lib/controle/lectures — les lectures du Poste de contrôle dont la station a aussi besoin (fiche 026-174).
// Une fonction par lecture, extraite telle quelle de la route du Poste qui la calculait : la route et la station
// appellent la MÊME fonction (« deux chiffres, un écran »), la sortie de la route ne change pas d'un octet.
// Une lecture rend des données, jamais une réponse HTTP. Elle ne garde rien : la garde et le drapeau restent à la route.
export { santeService } from '@/lib/controle/lectures/sante'
export { cronsDuService } from '@/lib/controle/lectures/crons'
export { audience } from '@/lib/controle/lectures/audience'
export { bans } from '@/lib/controle/lectures/bans'
export { clients } from '@/lib/controle/lectures/clients'
export { cerveaux, type Cerveau } from '@/lib/controle/lectures/cerveaux'
export { ticketsOuverts } from '@/lib/controle/lectures/tickets'
