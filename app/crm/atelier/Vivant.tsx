'use client'

import { useMemo, useState } from 'react'
import { salleAttente, type ActionLigne, type LigneAttente } from '@/lib/crm/accueil'
import { REGLE_ASSISTANTS, type PosteAssistants } from '@/lib/crm/assistants'
import type { Vue } from '@/lib/crm/vue'
import { Lien, lienExemple } from '../mode'
import { useSansEcriture } from './contexte'

// Les deux panneaux de « l'atelier vivant » (drapeau crmAtelierVivant) : la SALLE D'ATTENTE de l'accueil et le POSTE DES ASSISTANTS.
// Ils ne font que montrer ce que calculent lib/crm/accueil.ts et lib/crm/assistants.ts, et renvoyer vers un écran qui EXISTE déjà :
// aucun envoi, aucune écriture ici. Un lien vers un autre onglet du CRM (« /crm?vue=… ») change d'onglet sans recharger la page ;
// tout autre lien passe par <Lien>, qui reste inerte dans l'exemple (app/crm/mode.tsx).

/** « /crm?vue=tableau » → « tableau » : un onglet du CRM, atteint sans quitter la page. */
const vueDe = (href: string): string | null => /^\/crm\?vue=([a-z]+)$/.exec(href)?.[1] ?? null

// Lot 4 (Benj : « Répondre ne marche pas ») : AUCUNE action ne reste morte. Sur un vrai compte, chaque lien mène à l'écran qui existe
// (« Répondre » ouvre LA conversation : /messages?lead=<id>). Dans l'EXEMPLE et la démonstration, un lien qui sortirait des données
// fictives ouvre un dialogue : pour « Répondre », un vrai dialogue d'exemple (message du client fictif, réponse proposée par l'assistant,
// « Valider et envoyer » qui montre l'effet sans rien envoyer) ; pour le reste, ce que le bouton ferait sur vos données.
function Aller({ action, onVue2D, ligne, classe = 'psh-btn ghost' }: { action: ActionLigne; onVue2D: (vue: string) => void; ligne?: LigneAttente; classe?: string }) {
  const sansEcriture = useSansEcriture()
  const [ouvert, setOuvert] = useState(false)
  const vue = vueDe(action.href)
  if (vue) return <button type="button" className={classe} onClick={() => onVue2D(vue)}>{action.libelle}</button>
  if (!sansEcriture || lienExemple(action.href)) return <Lien className={classe} href={action.href}>{action.libelle}</Lien>
  return (
    <>
      <button type="button" className={classe} onClick={() => setOuvert(true)} data-atelier-action-exemple={action.libelle}>{action.libelle}</button>
      {ouvert && <DialogueExemple action={action} ligne={ligne} onFermer={() => setOuvert(false)} />}
    </>
  )
}

/** Ce que ferait chaque lien sur un vrai compte (dit dans l'exemple, au lieu d'un lien mort). */
function ceQueFerait(href: string): string {
  if (href.startsWith('/messages')) return 'ouvrirait la conversation avec ce client, dans Messages.'
  if (href.startsWith('/devis/nouveau')) return 'ouvrirait un nouveau devis, pré-rempli avec la demande du client.'
  if (href.startsWith('/devis/')) return 'ouvrirait ce devis dans l’éditeur de devis.'
  if (href.startsWith('/factures')) return 'ouvrirait vos factures, pour relancer celle qui est échue.'
  if (href.startsWith('/crm/')) return 'ouvrirait la fiche du dossier.'
  return 'ouvrirait l’écran correspondant, sur vos vraies données.'
}

/** Le dialogue de l'exemple. Rien n'est lu ni envoyé : tout est fictif, et c'est écrit. */
function DialogueExemple({ action, ligne, onFermer }: { action: ActionLigne; ligne?: LigneAttente; onFermer: () => void }) {
  const repondre = action.libelle === 'Répondre'
  const client = ligne?.client ?? 'votre client'
  const sujet = ligne?.detail ?? 'votre demande'
  // La réponse proposée : aucun prix, aucun délai, aucun créneau inventés (règle anti-fabrication) — une question pour avancer.
  const [texte, setTexte] = useState(`Bonjour, merci pour votre message concernant « ${sujet} ». Pour vous faire un devis juste, pouvez-vous m’envoyer une ou deux photos et me dire quand une visite serait possible ? Je vous recontacte dès réception.`)
  const [envoye, setEnvoye] = useState(false)
  return (
    <div className="atl-dialogue-fond" onClick={onFermer} data-atelier-dialogue>
      <div className="atl-dialogue" role="dialog" aria-modal="true" aria-labelledby="atl-dialogue-titre" onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); onFermer() } }}>
        <span className="atl-exemple">Exemple · données fictives</span>
        <h2 id="atl-dialogue-titre">{repondre ? `Conversation avec ${client}` : action.libelle}</h2>
        {repondre ? (
          <>
            <p className="atl-bulle-client"><b>{client}</b><br />Bonjour, je vous contacte pour : {sujet}. Pouvez-vous me rappeler ? Merci.</p>
            <p className="muted" style={{ margin: 0 }}>Réponse proposée par l’assistant — vous la relisez, vous la modifiez, vous validez :</p>
            {envoye
              ? <p className="atl-bulle-reponse" role="status" data-atelier-envoye><b>Envoyé (exemple).</b> Sur vos données, cette réponse partirait à {client} depuis votre adresse, à votre nom. Ici, rien n’est parti.<br /><br />{texte}</p>
              : <textarea value={texte} onChange={(e) => setTexte(e.target.value)} aria-label="Réponse proposée" />}
            <div className="crm-boutons">
              {!envoye && <button type="button" className="psh-btn primary" onClick={() => setEnvoye(true)}>Valider et envoyer</button>}
              <button type="button" className="psh-btn ghost" onClick={onFermer}>{envoye ? 'Fermer' : 'Annuler'}</button>
            </div>
          </>
        ) : (
          <>
            <p className="atl-bulle-client">Sur vos données, ce bouton {ceQueFerait(action.href)}</p>
            <p className="muted" style={{ margin: 0 }}>Dans l’exemple, il ne quitte pas les données fictives : rien n’est lu ni modifié.</p>
            <div className="crm-boutons"><button type="button" className="psh-btn primary" onClick={onFermer}>Compris</button></div>
          </>
        )}
      </div>
    </div>
  )
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
                  <Aller action={l.action} onVue2D={onVue2D} ligne={l} />
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
                  <span>{e.href ? <Aller action={{ libelle: e.libelle, href: e.href }} onVue2D={onVue2D} classe="atl-lien" /> : <b>{e.libelle}</b>}<br /><span className="muted">{e.detail}</span></span>
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
