'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { compterParType, LIBELLES_PIECE, TYPES_PIECE, type Piece, type TypePiece } from '@/lib/crm/pieces'
import { resizeToBlob } from '@/lib/media'
import { appel, dateHeureFr, estErreur } from './client'
import { useExemple } from './mode'

// Les PHOTOS et PIÈCES du chantier (plan du 18/10, n°5) : état des lieux avant travaux, pendant, après, problème constaté, facture
// fournisseur, plan. Bucket PRIVÉ : chaque image s'affiche par une adresse signée de 10 minutes (GET /api/crm/pieces). Une photo est
// réduite et ré-encodée dans le téléphone AVANT l'envoi (lib/media.ts, resizeToBlob : 2 000 px, WebP) — ce qui retire aussi ses
// métadonnées EXIF (position GPS, appareil). Les photos envoyées par le client avec sa demande s'affichent à part (POST /api/leads/photos).
// En mode exemple : aucune lecture, aucun envoi (appel() les refuse), et l'écran le dit.
type Message = { texte: string; erreur: boolean } | null

export default function Pieces({ chantierId, leadId, clos }: { chantierId: string; leadId: string | null; clos: boolean }) {
  const id = useId()
  const exemple = useExemple()
  const [pieces, setPieces] = useState<Piece[] | null>(exemple ? [] : null)
  const [indispo, setIndispo] = useState<string | null>(null)
  const [demande, setDemande] = useState<string[]>([])
  const [filtre, setFiltre] = useState<TypePiece | 'tout'>('tout')
  const [type, setType] = useState<TypePiece>('pendant')
  const [legende, setLegende] = useState('')
  const [envoi, setEnvoi] = useState<{ fait: number; total: number } | null>(null)
  const [message, setMessage] = useState<Message>(null)
  // Décision B du 21/10 : une photo « Après » d'une pièce propose de cocher ses tâches (le serveur les rend, l'artisan confirme).
  const [proposition, setProposition] = useState<{ piece: string; taches: { id: string; libelle: string }[] } | null>(null)
  const champ = useRef<HTMLInputElement>(null)

  const charger = useCallback(async () => {
    if (exemple) return
    const r = await appel<{ pieces: Piece[] }>(`/api/crm/pieces?chantier_id=${encodeURIComponent(chantierId)}`)
    if (!r.ok) { if (r.status === 503) setIndispo(r.erreur); else setMessage({ texte: r.erreur, erreur: true }); setPieces([]); return }
    setIndispo(null); setPieces(r.corps.pieces)
  }, [chantierId, exemple])
  useEffect(() => { void charger() }, [charger])
  useEffect(() => {
    if (exemple || !leadId) return
    // Lecture seule (POST pour porter l'identifiant) : les photos jointes par le client à sa demande, adresses signées d'une heure.
    void appel<{ urls: string[] }>('/api/leads/photos', { method: 'POST', body: { lead: leadId } }).then((r) => { if (r.ok) setDemande(r.corps.urls ?? []) })
  }, [leadId, exemple])

  async function envoyer(fichiers: FileList | null) {
    if (!fichiers?.length) return
    setMessage(null)
    const liste = [...fichiers].slice(0, 10)
    setEnvoi({ fait: 0, total: liste.length })
    let ok = 0
    for (const [i, f] of liste.entries()) {
      // Une image : réduite et ré-encodée ici (sans EXIF) ; un PDF : tel quel (4 Mo au plus, vérifié par le serveur).
      const blob = f.type === 'application/pdf' ? f : await resizeToBlob(f, 2000, 'image/webp', 0.8).catch(() => null)
      if (!blob) { setMessage({ texte: `« ${f.name} » n’est pas une image lisible.`, erreur: true }); continue }
      const form = new FormData()
      form.append('chantier_id', chantierId)
      form.append('fichier', blob, f.type === 'application/pdf' ? 'piece.pdf' : 'photo.webp')
      form.append('type', type)
      if (legende.trim()) form.append('legende', legende.trim())
      if (f.lastModified) form.append('pris_le', new Date(Math.min(f.lastModified, Date.now())).toISOString())
      const r = await appel<{ avancement_propose?: { piece: string; taches: { id: string; libelle: string }[] } }>('/api/crm/pieces', { method: 'POST', body: form })
      if (!r.ok) { setMessage({ texte: r.erreur, erreur: estErreur(r) }); break }
      if (r.corps.avancement_propose?.taches?.length) setProposition(r.corps.avancement_propose)
      ok++
      setEnvoi({ fait: i + 1, total: liste.length })
    }
    setEnvoi(null)
    if (ok) { setMessage({ texte: `${ok} fichier${ok > 1 ? 's' : ''} ajouté${ok > 1 ? 's' : ''}.`, erreur: false }); setLegende('') }
    if (champ.current) champ.current.value = ''
    await charger()
  }
  async function cocherProposees() {
    if (!proposition) return
    let n = 0
    for (const t of proposition.taches) {
      const r = await appel(`/api/crm/taches/${t.id}`, { method: 'PATCH', body: { faite: true } })
      if (!r.ok) { setMessage({ texte: r.erreur, erreur: estErreur(r) }); break }
      n++
    }
    setProposition(null)
    if (n) setMessage({ texte: `${n} tâche${n > 1 ? 's' : ''} de la pièce « ${proposition.piece} » cochée${n > 1 ? 's' : ''}.`, erreur: false })
  }
  async function modifier(p: Piece, champs: { type?: TypePiece; legende?: string | null }) {
    const r = await appel(`/api/crm/pieces/${p.id}`, { method: 'PATCH', body: champs })
    if (!r.ok) { setMessage({ texte: r.erreur, erreur: estErreur(r) }); return }
    await charger()
  }
  async function supprimer(p: Piece) {
    if (!confirm('Supprimer ce fichier ? Il est retiré pour de bon.')) return
    const r = await appel(`/api/crm/pieces/${p.id}`, { method: 'DELETE' })
    if (!r.ok) { setMessage({ texte: r.erreur, erreur: estErreur(r) }); return }
    await charger()
  }

  const nb = compterParType(pieces ?? [])
  const vues = (pieces ?? []).filter((p) => filtre === 'tout' || p.type === filtre)
  return (
    <section className="psh-panel" aria-labelledby={`${id}-t`} id="crm-photos">
      <header><h2 id={`${id}-t`}>Photos et pièces</h2><span className="tag tnum">{pieces?.length ?? 0}</span></header>
      <div className="crm-corps">
        {exemple ? <p className="crm-vide">Dans l’exemple, aucune photo : sur vos chantiers, prenez l’état des lieux avant travaux, les étapes et le résultat, d’un toucher.</p>
          : indispo ? <p className="crm-vide">{indispo}</p>
          : (
            <>
              {!clos && (
                <div className="crm-pieces-envoi">
                  <div className="crm-form-ligne">
                    <label className="crm-champ">Étiquette<select value={type} onChange={(e) => setType(e.target.value as TypePiece)}>{TYPES_PIECE.map((t) => <option key={t} value={t}>{LIBELLES_PIECE[t]}</option>)}</select></label>
                    <label className="crm-champ crm-large">Légende (facultatif)<input maxLength={200} value={legende} onChange={(e) => setLegende(e.target.value)} placeholder="Ex. : fuite sous le receveur" /></label>
                  </div>
                  <label className={`psh-btn primary crm-pieces-bouton${envoi ? ' occupe' : ''}`}>
                    {envoi ? `Envoi ${envoi.fait} / ${envoi.total}…` : 'Prendre une photo ou ajouter un fichier'}
                    <input ref={champ} type="file" accept="image/*,application/pdf" capture="environment" multiple disabled={!!envoi} className="crm-sr" onChange={(e) => void envoyer(e.target.files)} />
                  </label>
                  <p className="crm-aide">Les photos sont réduites dans votre téléphone et privées (jamais publiques). Évitez de photographier des personnes ou des documents personnels du client.</p>
                </div>
              )}
              {pieces === null ? <p className="muted" role="status">Lecture des photos…</p> : (
                <>
                  {pieces.length > 0 && (
                    <div className="crm-filtres-fil" role="group" aria-label="Filtrer par étiquette">
                      {(['tout', ...TYPES_PIECE] as const).filter((t) => t === 'tout' || nb[t] > 0).map((t) => (
                        <button key={t} type="button" className={filtre === t ? 'on' : ''} aria-pressed={filtre === t} onClick={() => setFiltre(t)}>{t === 'tout' ? 'Tout' : LIBELLES_PIECE[t]} <span className="tnum">{nb[t]}</span></button>
                      ))}
                    </div>
                  )}
                  {vues.length === 0 ? <p className="crm-vide">{pieces.length ? 'Rien sous cette étiquette.' : 'Aucune photo pour l’instant.'}</p> : (
                    <ul className="crm-galerie">
                      {vues.map((p) => (
                        <li key={p.id}>
                          {p.url ? (
                            <a href={p.url} target="_blank" rel="noopener noreferrer" className="crm-galerie-vue" aria-label={`Ouvrir ${p.mime === 'application/pdf' ? 'le document' : 'la photo'} ${p.legende ?? LIBELLES_PIECE[p.type]}`}>
                              {p.mime === 'application/pdf' ? <span className="crm-galerie-pdf" aria-hidden="true">PDF</span> : <img src={p.url} alt={p.legende ?? LIBELLES_PIECE[p.type]} loading="lazy" decoding="async" />}
                            </a>
                          ) : <span className="crm-galerie-vue crm-galerie-manque">Fichier manquant</span>}
                          <div className="crm-galerie-info">
                            <select aria-label="Étiquette" value={p.type} onChange={(e) => void modifier(p, { type: e.target.value as TypePiece })}>{TYPES_PIECE.map((t) => <option key={t} value={t}>{LIBELLES_PIECE[t]}</option>)}</select>
                            <span className="muted tnum">{dateHeureFr(p.pris_le)}</span>
                            {p.legende && <span className="crm-galerie-legende">{p.legende}</span>}
                            <button type="button" className="psh-btn ghost danger" aria-label="Supprimer ce fichier" onClick={() => void supprimer(p)}>×</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
              {demande.length > 0 && (
                <>
                  <h3 className="crm-sous">Envoyées par le client avec sa demande</h3>
                  <ul className="crm-galerie">{demande.map((u, i) => <li key={u}><a href={u} target="_blank" rel="noopener noreferrer" className="crm-galerie-vue"><img src={u} alt={`Photo ${i + 1} jointe à la demande`} loading="lazy" decoding="async" /></a></li>)}</ul>
                </>
              )}
            </>
          )}
        {proposition && (
          <div className="crm-message" role="status">
            <p>Photo « Après » de la pièce <strong>{proposition.piece}</strong> : cocher {proposition.taches.length > 1 ? `ces ${proposition.taches.length} tâches` : 'cette tâche'} comme faite{proposition.taches.length > 1 ? 's' : ''} ?</p>
            <ul>{proposition.taches.slice(0, 8).map((t) => <li key={t.id}>{t.libelle}</li>)}{proposition.taches.length > 8 && <li>et {proposition.taches.length - 8} autre(s)</li>}</ul>
            <div className="crm-boutons">
              <button type="button" className="psh-btn primary" onClick={() => void cocherProposees()}>Cocher</button>
              <button type="button" className="psh-btn ghost" onClick={() => setProposition(null)}>Pas encore</button>
            </div>
          </div>
        )}
        {message && <p className={`crm-message${message.erreur ? ' erreur' : ''}`} role={message.erreur ? 'alert' : 'status'}>{message.texte}</p>}
      </div>
    </section>
  )
}
