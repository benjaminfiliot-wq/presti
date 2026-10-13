'use client'

import { useMemo, useState } from 'react'
import { dateFr } from './client'
import type { ClientListe } from './types'
import { Lien } from './mode'

// Les clients : regroupés à partir des pièces (devis, factures, demandes, chantiers), lib/crm/clients.ts. Chaque ligne
// ouvre la fiche 360°.
export default function ClientsVue({ clients }: { clients: ClientListe[] }) {
  const [q, setQ] = useState('')
  const filtres = useMemo(() => {
    const t = q.trim().toLowerCase()
    return t ? clients.filter((c) => [c.nom, c.email, c.telephone].some((x) => x?.toLowerCase().includes(t))) : clients
  }, [clients, q])
  return (
    <section className="psh-panel" aria-labelledby="crm-clients">
      <header>
        <h2 id="crm-clients">Clients</h2>
        <label className="crm-recherche"><span className="crm-sr">Chercher un client</span><input type="search" placeholder="Chercher…" value={q} onChange={(e) => setQ(e.target.value)} /></label>
      </header>
      {clients.length === 0 ? (
        <div className="psh-empty">Aucun client pour l’instant. Ils apparaissent avec vos demandes, devis et factures.</div>
      ) : filtres.length === 0 ? (
        <div className="psh-empty">Aucun client ne correspond.</div>
      ) : (
        <div className="psh-tablewrap">
          <table className="psh-dtable crm-table crm-table-cartes">
            <thead><tr><th>Client</th><th>Contact</th><th className="r">Demandes</th><th className="r">Devis</th><th className="r">Factures</th><th className="r">Chantiers</th><th>Dernière pièce</th></tr></thead>
            <tbody>
              {filtres.map((c) => (
                <tr key={c.id}>
                  <td className="crm-td-titre"><Lien className="obj" href={`/crm/clients/${c.id}`}>{c.nom ?? 'Client sans nom'}</Lien></td>
                  <td data-label="Contact" className="crm-contact">{c.email ?? c.telephone ?? '—'}</td>
                  <td data-label="Demandes" className="r tnum">{c.demandes}</td><td data-label="Devis" className="r tnum">{c.devis}</td><td data-label="Factures" className="r tnum">{c.factures}</td><td data-label="Chantiers" className="r tnum">{c.chantiers}</td>
                  <td data-label="Dernière pièce" className="tnum">{dateFr(c.derniere)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
