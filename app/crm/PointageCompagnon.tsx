'use client'

import { useEffect, useState } from 'react'
import { appel, dateFr, estErreur } from './client'
import { useExemple } from './mode'

// Le LIEN DE POINTAGE pour un compagnon (décision B du 21/10, drapeau crmPointage, migration 0174) : une page mobile sans compte
// où il coche « fait » en fin de journée — l'avancement se met à jour sans ressaisie. Il ne voit que les tâches restantes de ce
// chantier (ni prix, ni adresse, ni client) et ne peut que cocher. Le lien ne s'affiche qu'une fois ; le renouveler tue l'ancien ;
// le révoquer coupe l'accès. En exemple : rien n'est créé.
type Message = { texte: string; erreur: boolean } | null
type Etat = { actif: boolean; cree_le: string | null; dernier_acces_le: string | null }

export default function PointageCompagnon({ chantierId }: { chantierId: string }) {
  const exemple = useExemple()
  const [etat, setEtat] = useState<Etat | null>(null)
  const [indispo, setIndispo] = useState<string | null>(null)
  const [adresse, setAdresse] = useState<string | null>(null)
  const [message, setMessage] = useState<Message>(null)
  const base = `/api/crm/chantiers/${chantierId}/pointage`
  useEffect(() => {
    if (exemple) return
    let vivant = true
    void appel<Etat>(base).then((r) => { if (!vivant) return; if (r.ok) setEtat(r.corps); else if (r.status === 503) setIndispo(r.erreur) })
    return () => { vivant = false }
  }, [exemple, base])
  async function creer() {
    if (etat?.actif && !confirm('Créer un NOUVEAU lien ? L’ancien cessera de fonctionner : il faudra donner le nouveau au compagnon.')) return
    setMessage(null)
    const r = await appel<{ adresse: string }>(base, { method: 'POST' })
    if (!r.ok) { setMessage({ texte: r.erreur, erreur: estErreur(r) }); return }
    setAdresse(r.corps.adresse); setEtat({ actif: true, cree_le: new Date().toISOString(), dernier_acces_le: null })
  }
  async function revoquer() {
    if (!confirm('Révoquer le lien ? Le compagnon ne pourra plus pointer ce chantier.')) return
    const r = await appel(base, { method: 'DELETE' })
    if (!r.ok) { setMessage({ texte: r.erreur, erreur: estErreur(r) }); return }
    setAdresse(null); setEtat({ actif: false, cree_le: null, dernier_acces_le: null })
  }
  return (
    <section className="psh-panel" aria-labelledby="crm-pointage">
      <header><h2 id="crm-pointage">Pointage du compagnon</h2></header>
      <div className="crm-corps">
        <p className="crm-vide">Donnez ce lien à votre compagnon : sur son téléphone, sans compte, il coche ce qui est fini en fin de journée et l’avancement se met à jour. Il ne voit que les tâches de ce chantier — ni prix, ni client — et ne peut que cocher « fait ».</p>
        {exemple ? <p className="crm-note">Dans l’exemple, aucun lien n’est créé.</p> : indispo ? <p className="crm-note">{indispo}</p> : (
          <>
            {adresse && (
              <div className="crm-agenda-lien">
                <label className="crm-champ">Le lien du compagnon (il ne s’affiche qu’une fois : copiez-le maintenant)<input readOnly value={adresse} onFocus={(e) => e.target.select()} /></label>
                <div className="crm-boutons"><button type="button" className="psh-btn primary" onClick={() => void navigator.clipboard?.writeText(adresse).then(() => setMessage({ texte: 'Lien copié.', erreur: false }), () => setMessage({ texte: 'Copie impossible : sélectionnez le lien et copiez-le.', erreur: true }))}>Copier le lien</button></div>
              </div>
            )}
            {etat && !adresse && <p className="muted">{etat.actif ? `Lien actif depuis le ${dateFr(etat.cree_le)}${etat.dernier_acces_le ? ` · ouvert le ${dateFr(etat.dernier_acces_le)}` : ' · pas encore ouvert'}.` : 'Aucun lien pour l’instant.'}</p>}
            <div className="crm-boutons">
              <button type="button" className="psh-btn ghost" onClick={() => void creer()}>{etat?.actif ? 'Nouveau lien' : 'Créer le lien de pointage'}</button>
              {etat?.actif && <button type="button" className="psh-btn ghost danger" onClick={() => void revoquer()}>Révoquer</button>}
            </div>
          </>
        )}
        {message && <p className={`crm-message${message.erreur ? ' erreur' : ''}`} role={message.erreur ? 'alert' : 'status'}>{message.texte}</p>}
      </div>
    </section>
  )
}
