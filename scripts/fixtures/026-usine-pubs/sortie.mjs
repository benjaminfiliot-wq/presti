// La sortie de usine-pubs-qa (026-199) : une ligne « PASS UP-n — … » ou « FAIL UP-n — … » par critère DÉCLARÉ, puis « usine-pubs-qa : PASS » ou
// « usine-pubs-qa : FAIL — ids ». Un critère jamais évalué (exception, oubli) est un échec : un juge muet ne passe pas.

/** Les constats d'UN critère : v(condition, texte si vrai, texte si faux) ; rendre(s, id, b) en tire une ligne. */
export function Bilan() {
  const ko = [], ok = []
  return { ko, ok, v: (cond, bien, mal) => { (cond ? ok : ko).push(cond ? bien : mal) } }
}
export function rendre(s, id, b) {
  const ko = [...new Set(b.ko.filter(Boolean))], ok = [...new Set(b.ok.filter(Boolean))]
  if (ko.length) s.echoue(id, ko.slice(0, 3).join(' ; ') + (ko.length > 3 ? ` (+${ko.length - 3})` : ''))
  else s.passe(id, ok.slice(0, 5).join(' ; '))
}
export function creerSortie(nom, ids, { racine = '', temoin = false, ecrire = (t) => console.log(t) } = {}) {
  const etat = new Map(ids.map((id) => [id, { passes: [], echecs: [] }]))
  const notes = []
  const entree = (id) => { if (!etat.has(id)) etat.set(id, { passes: [], echecs: [], horsListe: true }); return etat.get(id) }
  const s = {
    nom, ids,
    passe(id, detail = '') { entree(id).passes.push(String(detail)) },
    echoue(id, detail) { entree(id).echecs.push(String(detail || 'échec sans détail')) },
    note(t) { notes.push(String(t)) },
    evalue: (id) => { const e = etat.get(id); return !!e && e.passes.length + e.echecs.length > 0 },
    enEchec: (id) => (etat.get(id)?.echecs.length ?? 0) > 0,
    lignes() {
      const sortie = []
      for (const [id, e] of etat) {
        if (e.horsListe) sortie.push(`FAIL ${id} — critère non déclaré par le juge`)
        else if (e.echecs.length) sortie.push(`FAIL ${id} — ${e.echecs.slice(0, 3).join(' ; ')}${e.echecs.length > 3 ? ` (+${e.echecs.length - 3})` : ''}`)
        else if (e.passes.length) sortie.push(`PASS ${id} — ${e.passes.filter(Boolean).join(' ; ') || 'conforme'}`)
        else sortie.push(`FAIL ${id} — non évalué`)
      }
      return sortie
    },
    /** Imprime et rend le code : 0 seulement si chaque critère déclaré est évalué et vert. */
    fin() {
      const lignes = s.lignes()
      const rouges = lignes.filter((l) => l.startsWith('FAIL ')).map((l) => l.split(' ')[1])
      ecrire(`${nom}${racine ? ` — racine ${racine}` : ''}${temoin ? ' — témoin' : ''}`)
      for (const n of notes) ecrire(`  · ${n}`)
      for (const l of lignes) ecrire(l)
      ecrire(rouges.length ? `${nom} : FAIL — ${rouges.join(', ')}` : `${nom} : PASS`)
      return { code: rouges.length ? 1 : 0, rouges, lignes }
    },
  }
  return s
}
