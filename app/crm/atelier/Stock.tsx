'use client'

import { useMemo, useState } from 'react'
import type { DonneesAtelier, MateriauA } from '@/lib/crm/atelier'
import { appel } from '../client'
import { useSansEcriture } from './contexte'

// REMPLIR LE STOCK depuis l'atelier (lot 4, Benj : « les stocks, on ne peut pas les remplir »). Le stock de l'atelier EST l'inventaire de
// l'artisan (tables `materiaux`, `stock`, `mouvements_stock`) : on n'écrit que par les routes d'inventaire QUI EXISTENT, les mêmes que
// l'écran /inventaire et que l'assistant de gestion lisent :
//   • ajouter un article        → POST /api/inventaire/materiaux (fiche : nom, unité, catégorie, seuil, fournisseur préféré) ;
//   • quantité de départ        → POST /api/inventaire { mouvement: entrée } (fonction SQL appliquer_mouvement : mouvement + stock ensemble) ;
//   • entrée / sortie / comptage→ POST /api/inventaire { mouvement } ;
//   • seuil d'alerte            → GET puis POST /api/inventaire/materiaux { id, … } (la fiche relue, seul le seuil change).
// Chaque route garde la session, l'offre et artisan_id = uid. Après écriture, l'écran relit (onChange) ; le temps réel fait le reste.
// Dans l'exemple et la démonstration : le formulaire s'affiche, rien ne part, et on le dit.

const UNITES = ['u', 'm', 'm²', 'm³', 'kg', 'L', 'sac', 'palette', 'rouleau', 'boîte', 'plaque', 'bobine']
type Mode = null | 'ajout' | 'mouvement'

export default function StockRapide({ donnees, articles, famille, suggestions, onChange }: {
  donnees: DonneesAtelier
  /** Les articles que montre ce panneau (une catégorie, une famille de la structure, ou tout le stock). */
  articles: readonly MateriauA[]
  /** La catégorie proposée pour un nouvel article. */
  famille: string | null
  /** Les catégories typiques du métier (proposées quand le stock est vide). */
  suggestions: readonly string[]
  onChange: () => void
}) {
  const sansEcriture = useSansEcriture()
  const [mode, setMode] = useState<Mode>(null)
  const [note, setNote] = useState<{ ok: boolean; texte: string } | null>(null)
  const [occupe, setOccupe] = useState(false)
  const categories = useMemo(() => [...new Set([...donnees.materiaux.map((m) => (m.categorie ?? '').trim()).filter(Boolean), ...suggestions])].sort((a, b) => a.localeCompare(b, 'fr')), [donnees.materiaux, suggestions])
  // — l'ajout —
  const [nom, setNom] = useState(''), [unite, setUnite] = useState('u'), [categorie, setCategorie] = useState(famille ?? ''), [qte, setQte] = useState(''), [seuil, setSeuil] = useState(''), [fournisseur, setFournisseur] = useState('')
  // — le mouvement —
  const [article, setArticle] = useState(articles[0]?.id ?? ''), [type, setType] = useState<'entree' | 'sortie' | 'inventaire'>('entree'), [qteM, setQteM] = useState(''), [seuilM, setSeuilM] = useState('')

  const ouvrirAjout = (cat?: string) => { setMode('ajout'); setNote(null); if (cat) setCategorie(cat) }
  const nombre = (v: string) => { const n = Number(v.replace(',', '.')); return v.trim() === '' ? 0 : Number.isFinite(n) && n >= 0 ? n : NaN }

  async function ajouter(e: React.FormEvent) {
    e.preventDefault()
    const q = nombre(qte), s = nombre(seuil)
    if (!nom.trim()) { setNote({ ok: false, texte: 'Il faut un nom d’article.' }); return }
    if (Number.isNaN(q) || Number.isNaN(s)) { setNote({ ok: false, texte: 'Quantité et seuil : des nombres positifs.' }); return }
    if (sansEcriture) { setNote({ ok: true, texte: `Exemple : « ${nom.trim()} » serait ajouté à votre inventaire${q ? ` avec ${q} ${unite}` : ''}. Rien n’est enregistré ici.` }); return }
    setOccupe(true)
    const r = await appel<{ id: string }>('/api/inventaire/materiaux', { method: 'POST', body: { nom: nom.trim(), unite, categorie: categorie.trim() || null, seuil_alerte: s, fournisseur_prefere: fournisseur.trim() || null } })
    if (r.ok && q > 0) {
      const m = await appel('/api/inventaire', { method: 'POST', body: { mouvement: { materiau_id: r.corps.id, type: 'entree', quantite: q, source: 'manuel', note: 'Saisi depuis l’atelier' } } })
      if (!m.ok) { setOccupe(false); setNote({ ok: false, texte: `Article créé, mais la quantité n’a pas été enregistrée : ${m.erreur}` }); onChange(); return }
    }
    setOccupe(false)
    if (!r.ok) { setNote({ ok: false, texte: r.erreur }); return }
    setNote({ ok: true, texte: `« ${nom.trim()} » est dans votre inventaire (visible aussi dans l’écran Inventaire et pour l’assistant).` })
    setNom(''); setQte(''); setSeuil(''); setFournisseur('')
    onChange()
  }

  async function mouvement(e: React.FormEvent) {
    e.preventDefault()
    const m = articles.find((x) => x.id === article)
    if (!m) { setNote({ ok: false, texte: 'Choisissez un article.' }); return }
    // Une quantité SAISIE (même 0 : un comptage à zéro est légitime), pas une quantité non nulle (audit du 20/10).
    const aQte = qteM.trim() !== '', q = nombre(qteM), s = seuilM.trim() === '' ? null : nombre(seuilM)
    if ((aQte && Number.isNaN(q)) || (s !== null && Number.isNaN(s))) { setNote({ ok: false, texte: 'Quantité et seuil : des nombres positifs.' }); return }
    if (!aQte && s === null) { setNote({ ok: false, texte: 'Indiquez une quantité, ou un nouveau seuil.' }); return }
    if (aQte && q === 0 && type !== 'inventaire') { setNote({ ok: false, texte: 'Une entrée ou une sortie de 0 ne change rien.' }); return }
    const quoi = [aQte ? `${type === 'entree' ? 'entrée' : type === 'sortie' ? 'sortie' : 'comptage'} de ${q} ${m.unite}` : null, s !== null ? `seuil à ${s}` : null].filter(Boolean).join(', ')
    if (sansEcriture) { setNote({ ok: true, texte: `Exemple : ${quoi} pour « ${m.nom} ». Rien n’est enregistré ici.` }); return }
    setOccupe(true)
    if (aQte) {
      const r = await appel('/api/inventaire', { method: 'POST', body: { mouvement: { materiau_id: m.id, type, quantite: q, source: 'manuel', note: 'Saisi depuis l’atelier', refuser_negatif: true } } })
      if (!r.ok) { setOccupe(false); setNote({ ok: false, texte: r.erreur }); return }
    }
    if (s !== null) {
      // Seuil SEUL : la route ne touche qu'à cette colonne (audit du 20/10 ; avant, la fiche relue puis renvoyée entière).
      const r = await appel('/api/inventaire/materiaux', { method: 'POST', body: { id: m.id, seuil_alerte: s } })
      if (!r.ok) { setOccupe(false); setNote({ ok: false, texte: r.erreur }); onChange(); return }
    }
    setOccupe(false)
    setNote({ ok: true, texte: `Enregistré : ${quoi} pour « ${m.nom} ».` })
    setQteM(''); setSeuilM('')
    onChange()
  }

  return (
    <div className="atl-stock" data-atelier-stock>
      {articles.length === 0 && (
        <div className="atl-stock-vide" data-atelier-stock-vide>
          <p><b>{famille ? `Aucun article « ${famille} » pour l’instant.` : 'Votre stock est vide pour l’instant.'}</b> Ce que vous ajoutez ici va dans votre inventaire.</p>
          <div className="crm-boutons">
            <button type="button" className="psh-btn primary" onClick={() => ouvrirAjout()}>Ajouter mon premier article</button>
          </div>
          {suggestions.length > 0 && <p className="atl-stock-puces">{suggestions.map((c) => <button key={c} type="button" onClick={() => ouvrirAjout(c)}>{c}</button>)}</p>}
        </div>
      )}
      {articles.length > 0 && (
        <div className="crm-boutons">
          <button type="button" className="psh-btn primary" aria-pressed={mode === 'mouvement'} onClick={() => { setMode(mode === 'mouvement' ? null : 'mouvement'); setNote(null) }}>Entrée · sortie · seuil</button>
          <button type="button" className="psh-btn ghost" aria-pressed={mode === 'ajout'} onClick={() => (mode === 'ajout' ? setMode(null) : ouvrirAjout())}>Ajouter un article</button>
        </div>
      )}
      {mode === 'ajout' && (
        <form className="atl-stock-form" onSubmit={ajouter} data-atelier-stock-ajout>
          <label>Nom de l’article<input value={nom} onChange={(e) => setNom(e.target.value)} maxLength={200} required placeholder="ex. Sac de ciment 35 kg" /></label>
          <div className="atl-stock-ligne">
            <label>Unité<select value={unite} onChange={(e) => setUnite(e.target.value)}>{UNITES.map((u) => <option key={u} value={u}>{u}</option>)}</select></label>
            <label>Catégorie<input value={categorie} onChange={(e) => setCategorie(e.target.value)} list="atl-stock-categories" maxLength={80} /></label>
          </div>
          <datalist id="atl-stock-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          <div className="atl-stock-ligne">
            <label>Quantité en stock<input inputMode="decimal" value={qte} onChange={(e) => setQte(e.target.value)} placeholder="0" /></label>
            <label>Seuil d’alerte<input inputMode="decimal" value={seuil} onChange={(e) => setSeuil(e.target.value)} placeholder="0" /></label>
          </div>
          <label>Fournisseur préféré<input value={fournisseur} onChange={(e) => setFournisseur(e.target.value)} maxLength={120} placeholder="facultatif" /></label>
          <div className="crm-boutons"><button type="submit" className="psh-btn primary" disabled={occupe}>{occupe ? 'Enregistrement…' : 'Ajouter à mon stock'}</button></div>
        </form>
      )}
      {mode === 'mouvement' && articles.length > 0 && (
        <form className="atl-stock-form" onSubmit={mouvement} data-atelier-stock-mouvement>
          <label>Article<select value={article} onChange={(e) => setArticle(e.target.value)}>{articles.map((m) => <option key={m.id} value={m.id}>{`${m.nom} — ${m.reste} ${m.unite}`}</option>)}</select></label>
          <div className="atl-stock-ligne">
            <label>Mouvement<select value={type} onChange={(e) => setType(e.target.value as typeof type)}><option value="entree">Entrée (livraison, achat)</option><option value="sortie">Sortie (chantier)</option><option value="inventaire">Comptage (stock réel)</option></select></label>
            <label>Quantité<input inputMode="decimal" value={qteM} onChange={(e) => setQteM(e.target.value)} placeholder="0" /></label>
          </div>
          <label>Nouveau seuil d’alerte<input inputMode="decimal" value={seuilM} onChange={(e) => setSeuilM(e.target.value)} placeholder={`actuel : ${articles.find((x) => x.id === article)?.seuil ?? 0}`} /></label>
          <div className="crm-boutons"><button type="submit" className="psh-btn primary" disabled={occupe}>{occupe ? 'Enregistrement…' : 'Enregistrer'}</button></div>
        </form>
      )}
      {note && <p className={`crm-note${note.ok ? '' : ' atl-stock-erreur'}`} role="status">{note.texte}</p>}
      {sansEcriture && mode && !note && <p className="crm-note" role="note">Exemple : le formulaire montre ce que vous pourrez faire ; rien n’est enregistré.</p>}
    </div>
  )
}
