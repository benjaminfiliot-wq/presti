// 026-178 — la Tour du Crieur : la mémoire du Crieur (crieur_posts, 0104), colonnes d'état seulement — jamais le texte d'une
// publication. Une publication partie (programmée ou externe dont l'heure est passée) est « publiée » ; une dont l'heure est devant
// est « programmée » ; un brouillon Publora attend le geste de Benj. La jauge Publora, elle, se lit sur GET /api/controle/jauges
// (026-064), seule source des jauges. Sous `sante`.
import type { Contexte } from '../station'
import { lignes } from './outils'

async function postsDuMois(c: Contexte) {
  const r = await c.deps.db.from('crieur_posts').select('id, canal, statut, programmee_pour, cree_le').gte('cree_le', c.debutDuMois).order('cree_le', { ascending: false })
  if (r.error) throw new Error(`crieur_posts : ${r.error.message}`)
  return lignes(r.data)
}
const partie = (c: Contexte, p: { statut: string; programmee_pour: string | null }) => (p.statut === 'programmee' || p.statut === 'externe') && !!p.programmee_pour && Date.parse(p.programmee_pour) <= c.maintenant.getTime()

export async function lire(c: Contexte) {
  const posts = await postsDuMois(c)
  let publiees = 0, programmees = 0, brouillons = 0, erreurs = 0
  for (const p of posts) {
    if (p.statut === 'brouillon_publora') brouillons++
    else if (p.statut === 'erreur') erreurs++
    else if (partie(c, p)) publiees++
    else if (p.statut === 'programmee' || p.statut === 'externe') programmees++
  }
  return { publie_mois: publiees, programmees, brouillons, erreurs, derniere: posts[0] ? { canal: posts[0].canal, statut: posts[0].statut, le: posts[0].programmee_pour ?? posts[0].cree_le } : null }
}
/** La ligne « contenu » de la carte : programmée et publiée par la mémoire du Crieur ; une étape sans source reste absente. */
export async function etapesContenu(c: Contexte) {
  const posts = await postsDuMois(c)
  let programmee = 0, publiee = 0
  for (const p of posts) { if (partie(c, p)) publiee++; else if (p.statut === 'programmee' || p.statut === 'externe') programmee++ }
  return [{ etape: 'programmee', jour: programmee }, { etape: 'publiee', jour: publiee }]
}
