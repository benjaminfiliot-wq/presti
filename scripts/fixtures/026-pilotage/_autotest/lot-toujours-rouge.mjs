// scripts/fixtures/026-pilotage/_autotest/lot-toujours-rouge.mjs — lot FACTICE de l'autotest JA-10 de juges-026-pilotage-preuve
// (026-012), lu seulement par la preuve elle-même (JUGES_026_PILOTAGE_AUTOTEST=1 : JA-1, JA-7, JA-8, JA-9). Les quatre lots
// factices partagent la référence, le témoin (./temoin : un fichier de règles) et les sabotages ; seul le juge change.
export const fiche = '026-012'
export const reference = '4041ec9b41432576037dbc0b45e0647bd60a0347'
export const absents = ['docs/autotest-026/']
export const temoin = './temoin'
const F = 'docs/autotest-026/regles.json'
export const juges = [
  {
    commande: 'scripts/fixtures/026-pilotage/_autotest/juge-toujours-rouge.mjs', arguments: [], loader: false, attendu: 'ZT-1', criteresMin: 4,
    sabotages: [
      { nom: 'plafond-hors-bornes', fichier: F, avant: '"plafond": 12', apres: '"plafond": 120', tue: 'ZT-2' },
      { nom: 'canal-en-double', fichier: F, avant: '"messagerie"]', apres: '"messagerie", "messagerie"]', tue: 'ZT-3' },
      { nom: 'phrase-changee', fichier: F, avant: 'par Benj.', apres: 'par Benjamin.', tue: 'ZT-4' },
      { nom: 'fichier-retire', fichier: F, retirer: true, tue: 'ZT-1' },
    ],
  },
]
