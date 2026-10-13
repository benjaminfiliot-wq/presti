// Les formes renvoyées par GET /api/crm/vue (app/api/crm/vue/route.ts). Elles vivent dans lib/crm/vue.ts, le module qui
// les assemble (pour les routes comme pour l'atelier d'exemple). Types seulement : aucun code ne part au navigateur.
export type { ChantierListe, ClientListe, DevisSigne, FicheChantier, FicheClient, Membre, Vehicule, Vue } from '@/lib/crm/vue'
