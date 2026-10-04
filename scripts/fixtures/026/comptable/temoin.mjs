// Auto-contrôle indépendant ; ce témoin n'est jamais installé dans lib/.
function calculRapprochement(periode, d) {
  const vus = new Set(), recettes = [], orphelins = [], ecarts = []
  for (const p of d.evenements.filter(e => e.type === 'paiement' && e.status === 'succeeded')) {
    if (vus.has(p.id)) continue
    vus.add(p.id)
    const vente = [...d.ventes.commandes, ...d.ventes.abonnements].find(v => v.paiement_id === p.id)
    if (!vente) { orphelins.push(p); continue }
    if (vente.prix_cents !== p.amount) { ecarts.push(p); continue }
    const rembourse = d.evenements.filter(e => e.type === 'remboursement' && e.charge === p.id).reduce((s, e) => s + e.amount, 0)
    const recette = { id: p.id, montant: p.amount - rembourse, date: p.created }
    recettes.push(recette)
  }
  return { recettes, orphelins, ecarts }
}
export function rapprocher(periode, d) {
  const resultat = calculRapprochement(periode, d)
  for (const recette of resultat.recettes) {
    const p = { id: recette.id }
    d.journal.ajouter({ cle: `${periode}:${p.id}`, type: 'rapprochement', montant: recette.montant })
  }
  return resultat
}
function totalRecettes(periode, d) { return calculRapprochement(periode, d).recettes.reduce((s, r) => s + r.montant, 0) }
export function recettesTuile(periode, d) { return totalRecettes(periode, d) }
export function preparerDeclaration(periode, d) { return { periode, recettes: totalRecettes(periode, d), tva: 0, source: 'rapprochement', prepare_le: d.maintenant } }
export function seuilFranchise(periode, d) {
  if (!d.seuil.source || !d.seuil.date_source) throw Error('source datée requise')
  const rs = rapprocher(periode, d).recettes.filter(r => r.date.startsWith(periode.slice(0, 4))).sort((a, b) => a.date.localeCompare(b.date))
  let cumul = 0, franchi_le = null
  for (const r of rs) { cumul += r.montant; if (cumul > d.seuil.valeur_cents && !franchi_le) franchi_le = r.date }
  return { cumul, seuil: d.seuil.valeur_cents, pourcentage: cumul / d.seuil.valeur_cents * 100, alerte: cumul > d.seuil.valeur_cents ? 'seuil_depasse' : cumul >= d.seuil.valeur_cents * .9 ? 'approche_seuil' : null, franchi_le }
}
export async function libelle(e, d) {
  const cfg = d.MOTEUR_DE.comptable
  if (cfg?.personnelles === true && (cfg.moteur === 'codex' || cfg.moteur === 'ollama_local') && !cfg.modele.includes(':cloud')) {
    try { return await d.moteur(e, cfg) } catch { /* repli fixe */ }
  }
  return 'Encaissement rapproché'
}
