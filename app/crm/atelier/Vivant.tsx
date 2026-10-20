'use client'

import { useMemo } from 'react'
import { salleAttente, type ActionLigne } from '@/lib/crm/accueil'
import { REGLE_ASSISTANTS, type PosteAssistants } from '@/lib/crm/assistants'
import type { Vue } from '@/lib/crm/vue'
import { Lien } from '../mode'

// Les deux panneaux de « l'atelier vivant » (drapeau crmAtelierVivant) : la SALLE D'ATTENTE de l'accueil et le POSTE DES ASSISTANTS.
// Ils ne font que montrer ce que calculent lib/crm/accueil.ts et lib/crm/assistants.ts, et renvoyer vers un écran qui EXISTE déjà :
// aucun envoi, aucune écriture ici. Un lien vers un autre onglet du CRM (« /crm?vue=… ») change d'onglet sans recharger la page ;
// tout autre lien passe par <Lien>, qui reste inerte dans l'exemple (app/crm/mode.tsx).

/** « /crm?vue=tableau » → « tableau » : un onglet du CRM, atteint sans quitter la page. */
const vueDe = (href: string): string | null => /^\/crm\?vue=([a-z]+)$/.exec(href)?.[1] ?? null

function Aller({ action, onVue2D }: { action: ActionLigne; onVue2D: (vue: string) => void }) {
  const vue = vueDe(action.href)
  return vue
    ? <button type="button" className="psh-btn ghost" onClick={() => onVue2D(vue)}>{action.libelle}</button>
    : <Lien className="psh-btn ghost" href={action.href}>{action.libelle}</Lien>
}

/** Le panneau de l'accueil : trois files, une action par ligne. */
export function SalleAttentePanneau({ vue, jour, onVue2D }: { vue: Vue; jour: string; onVue2D: (vue: string) => void }) {
  const salle = useMemo(() => salleAttente(vue, jour), [vue, jour])
  return (
    <div className="atl-pile" data-atelier-salle>
      <p className="crm-note" role="note">{salle.total ? 'Ce qui attend, ou qui attend de vous une réponse, rangé en trois files.' : 'Personne n’attend pour le moment.'}</p>
      {salle.files.map((f) => (
        <section key={f.cle} aria-labelledby={`atl-sa-${f.cle}`} data-atelier-file={f.cle}>
          <h3 className="crm-sous" id={`atl-sa-${f.cle}`}>{f.titre}<span className="tnum"> · {f.total}</span></h3>
          {f.lignes.length === 0 ? <p className="crm-vide">{f.vide}</p> : (
            <ul className="atl-liste">
              {f.lignes.map((l) => (
                <li key={l.cle}>
                  <span>
                    <b>{l.client}</b><br />
                    <span className="muted">{l.detail}</span>
                    {(l.quand || l.relance) && <><br /><span className="muted">{[l.quand, l.relance].filter(Boolean).join(' · ')}</span></>}
                  </span>
                  <Aller action={l.action} onVue2D={onVue2D} />
                </li>
              ))}
            </ul>
          )}
          {f.reste > 0 && <p className="atl-faites">+ {f.reste} autre{f.reste > 1 ? 's' : ''} dans le pipeline</p>}
        </section>
      ))}
    </div>
  )
}

/** Le panneau du poste : la règle du produit en tête, puis les quatre assistants (compteur, trois éléments au plus, un lien). */
export function PosteAssistantsPanneau({ poste, onVue2D }: { poste: PosteAssistants; onVue2D: (vue: string) => void }) {
  return (
    <div className="atl-pile" data-atelier-assistants>
      <p className="crm-note" role="note"><b>{REGLE_ASSISTANTS}</b></p>
      {poste.assistants.map((a) => (
        <section key={a.cle} className="atl-assistant" aria-labelledby={`atl-as-${a.cle}`} data-atelier-assistant={a.cle}>
          <h3 className="crm-sous" id={`atl-as-${a.cle}`}>{a.nom}<span className="tnum"> · {a.total}</span></h3>
          <p className="muted">{a.role}</p>
          {a.elements.length === 0 ? <p className="crm-vide">{a.vide}</p> : (
            <ul className="atl-liste">
              {a.elements.map((e) => (
                <li key={e.cle}>
                  <span>{e.href ? <Lien href={e.href}>{e.libelle}</Lien> : <b>{e.libelle}</b>}<br /><span className="muted">{e.detail}</span></span>
                </li>
              ))}
            </ul>
          )}
          {a.reste > 0 && <p className="atl-faites">+ {a.reste} autre{a.reste > 1 ? 's' : ''}</p>}
          <div className="crm-boutons"><Aller action={a.lien} onVue2D={onVue2D} /></div>
        </section>
      ))}
    </div>
  )
}
