import { useEffect, useState } from 'react'
import { apiDirection } from './client'

type PackControle = {
  id: string
  artisan_id: string
  commande_le: string
  etat: 'commandee' | 'fabriquee' | 'livree'
  livre_le: string | null
  refaits: number
  brouillons: any
  apercus: Record<string, string> | null
  artisan_nom: string
  artisan_email: string
  verifications?: any
  paye_le?: string
  fabrique_le?: string
}

export default function Packs({ role, signaler }: { role: 'direction' | 'lecture' | null, signaler?: (m: { type: 'ok' | 'err'; text: string }) => void }) {
  const [packs, setPacks] = useState<PackControle[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)
  const [ouverte, setOuverte] = useState<string | null>(null)
  const [consignes, setConsignes] = useState<Record<string, string>>({})

  const charger = async () => {
    const r = await apiDirection<{ packs: PackControle[] }>('/api/controle/packs/', { method: 'GET' })
    if (r.ok) {
      setPacks(r.data.packs)
    } else {
      signaler?.({ type: 'err', text: 'Erreur au chargement des packs.' })
    }
  }

  useEffect(() => {
    void charger()
  }, [])

  const agirLivrer = async (id: string) => {
    if (!window.confirm('Le pack sera envoyé à l’artisan par courriel, avec des liens valables 30 jours.')) return
    setBusyId(id)
    try {
      const r = await apiDirection('/api/controle/packs/' + id, { method: 'POST', body: JSON.stringify({ action: 'livrer' }) }, true)
      if (r.ok) {
        signaler?.({ type: 'ok', text: 'Pack livré.' })
        void charger()
        setOuverte(null)
      } else {
        signaler?.({ type: 'err', text: (r.data as any).error ?? 'Action refusée.' })
      }
    } finally {
      setBusyId(null)
    }
  }

  const agirRefaire = async (id: string, consigneText?: string) => {
    if (!consigneText || consigneText.trim().length < 10) {
      signaler?.({ type: 'err', text: 'Une consigne d’au moins 10 signes est obligatoire.' })
      return
    }
    setBusyId(id)
    try {
      const r = await apiDirection('/api/controle/packs/' + id, { method: 'POST', body: JSON.stringify({ action: 'refaire', consigne: consigneText.trim() }) })
      if (r.ok) {
        signaler?.({ type: 'ok', text: 'Retouche demandée.' })
        void charger()
        setOuverte(null)
      } else {
        signaler?.({ type: 'err', text: (r.data as any).error ?? 'Action refusée.' })
      }
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div style={{ padding: '1rem', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1.5rem' }}>Packs pubs</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {packs.length === 0 && <p style={{ color: '#666' }}>Aucun pack.</p>}
        {packs.map(p => {
          const etatClair = p.etat === 'commandee' ? (p.paye_le ? 'Payé, à fabriquer sur le poste' : 'Commandé') :
                            p.etat === 'fabriquee' ? 'Fabriqué, à regarder' :
                            `Livré le ${p.livre_le ? new Date(p.livre_le).toLocaleDateString() : '?'}`
                            
          const estOuvert = ouverte === p.id
          
          return (
            <div key={p.id} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '1rem', background: '#fff' }}>
              <div 
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setOuverte(estOuvert ? null : p.id)}
              >
                <div>
                  <h3 style={{ fontWeight: 500 }}>{p.artisan_nom} ({p.artisan_email})</h3>
                  <div style={{ fontSize: '.85rem', color: '#666', marginTop: '.2rem' }}>
                    État : {etatClair} • {p.refaits} retouche(s)
                  </div>
                </div>
                <div>
                  {estOuvert ? '▲' : '▼'}
                </div>
              </div>
              
              {estOuvert && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                  
                  {p.etat === 'commandee' && p.paye_le && (
                    <p>À fabriquer sur le poste : exporter, fabriquer, déposer</p>
                  )}

                  {p.etat === 'fabriquee' && (
                    <>
                      {p.verifications && (
                        <div style={{ marginBottom: '1rem', fontSize: '.9rem' }}>
                          <h4 style={{ fontWeight: 600 }}>Vérifications :</h4>
                          <pre style={{ background: '#f5f5f5', padding: '.5rem', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                            {JSON.stringify(p.verifications, null, 2)}
                          </pre>
                        </div>
                      )}
                      
                      {p.apercus ? (
                        <div style={{ marginTop: '.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            {p.apercus['video-1.mp4'] && <video controls playsInline preload="metadata" src={p.apercus['video-1.mp4']} style={{ width: '200px', background: '#000' }} />}
                            {p.apercus['video-2.mp4'] && <video controls playsInline preload="metadata" src={p.apercus['video-2.mp4']} style={{ width: '200px', background: '#000' }} />}
                            {p.apercus['video-3.mp4'] && <video controls playsInline preload="metadata" src={p.apercus['video-3.mp4']} style={{ width: '200px', background: '#000' }} />}
                          </div>
                          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            {p.apercus['visuel-1.jpg'] && <img src={p.apercus['visuel-1.jpg']} alt="Visuel 1" style={{ width: '200px', objectFit: 'contain' }} />}
                            {p.apercus['visuel-2.jpg'] && <img src={p.apercus['visuel-2.jpg']} alt="Visuel 2" style={{ width: '200px', objectFit: 'contain' }} />}
                            {p.apercus['visuel-3.jpg'] && <img src={p.apercus['visuel-3.jpg']} alt="Visuel 3" style={{ width: '200px', objectFit: 'contain' }} />}
                          </div>
                        </div>
                      ) : (
                        <div style={{ margin: '1rem 0' }}>
                          <button type="button" className="btn btn--ghost" onClick={(e) => { e.stopPropagation(); void charger() }}>
                            Recharger
                          </button>
                        </div>
                      )}
                      
                      {role === 'direction' && (
                        <div style={{ marginTop: '.8rem', padding: '.6rem', background: 'rgba(0,0,0,0.03)', borderRadius: '6px' }}>
                          <button type="button" className="btn btn--primary" disabled={busyId === p.id} onClick={() => void agirLivrer(p.id)}>
                            {busyId === p.id ? 'Patientez…' : 'Livrer'}
                          </button>
                          
                          <div style={{ marginTop: '.5rem', display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
                            <label style={{ fontSize: '.8rem' }}>Refaire (consigne obligatoire) :</label>
                            <input
                              type="text"
                              className="input"
                              value={consignes[p.id] || ''}
                              onChange={(e) => setConsignes({ ...consignes, [p.id]: e.target.value })}
                            />
                            <button
                              type="button"
                              className="btn btn--ghost"
                              disabled={busyId === p.id || !consignes[p.id] || consignes[p.id].trim().length < 10}
                              onClick={() => void agirRefaire(p.id, consignes[p.id])}
                            >
                              {busyId === p.id ? 'Patientez…' : 'Refaire'}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {p.etat === 'livree' && role === 'direction' && p.refaits === 0 && (
                     <div style={{ marginTop: '.8rem', padding: '.6rem', background: 'rgba(0,0,0,0.03)', borderRadius: '6px' }}>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '.3rem' }}>
                          <input
                            type="text"
                            className="input"
                            placeholder="Consigne de l'artisan..."
                            value={consignes[p.id] || ''}
                            onChange={(e) => setConsignes({ ...consignes, [p.id]: e.target.value })}
                          />
                          <button
                            type="button"
                            className="btn btn--ghost"
                            disabled={busyId === p.id || !consignes[p.id] || consignes[p.id].trim().length < 10}
                            onClick={() => void agirRefaire(p.id, consignes[p.id])}
                          >
                            {busyId === p.id ? 'Patientez…' : 'Retouche demandée par l\'artisan'}
                          </button>
                       </div>
                     </div>
                  )}

                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
