'use client'

// Le mode EXEMPLE du CRM (demande de Benj, 13/10) : un seul interrupteur « Voir l'exemple / Voir mes données » en haut du
// CRM, d'office sur l'exemple quand le compte est vide. Ce module ne contient AUCUNE donnée (elles sont dans
// lib/crm/exemple.ts) : il dit seulement si l'écran montre l'exemple, et ce que deviennent les liens et les boutons.
//
// Trois barrières, de la plus visible à la plus profonde :
//   1. les écrans en mode exemple ne lisent rien au serveur : leurs données leur sont données (lib/crm/exemple.ts) ;
//   2. un lien vers un écran hors CRM (devis, factures, messages, inventaire) devient un texte inerte : il ouvrirait les
//      vraies données du compte au milieu de l'exemple ; un lien de fiche CRM garde le mode (« ?exemple=1 ») ;
//   3. `appel()` (app/crm/client.ts) refuse toute écriture tant que le mode exemple est posé : rien ne part, et le bouton
//      répond « Dans l'exemple, rien n'est envoyé ».
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export const BANDEAU_EXEMPLE = 'Exemple : données fictives, rien n’est enregistré.'
const CLE_CHOIX = 'presti-crm-exemple'

const Contexte = createContext(false)
export const ModeExemple = ({ actif, children }: { actif: boolean; children: ReactNode }) => <Contexte.Provider value={actif}>{children}</Contexte.Provider>
export const useExemple = () => useContext(Contexte)

/** Le choix de l'artisan pour cet onglet du navigateur (« exemple » / « donnees »), ou null s'il n'a rien choisi. */
export function lireChoix(): 'exemple' | 'donnees' | null {
  try { const v = sessionStorage.getItem(CLE_CHOIX); return v === 'exemple' || v === 'donnees' ? v : null } catch { return null }
}
export function ecrireChoix(v: 'exemple' | 'donnees') { try { sessionStorage.setItem(CLE_CHOIX, v) } catch { /* choix non retenu : l'écran revient à la règle par défaut */ } }

/** Où mène un lien en mode exemple : une fiche CRM garde le mode ; tout autre écran de l'application est fermé (null). */
export function lienExemple(href: string): string | null {
  if (/^\/crm(\/(chantiers|clients)\/[^?#]+)?([?#]|$)/.test(href)) return `${href}${href.includes('?') ? '&' : '?'}exemple=1`
  return null
}

/**
 * Les pages de fiche (/crm/chantiers/[id], /crm/clients/[ref]) : le mode se lit dans l'adresse (« ?exemple=1 ») AVANT
 * tout rendu de la fiche — sinon elle irait d'abord lire le serveur. null tant que ce n'est pas lu. En exemple, la page
 * vérifie seulement que le compte a accès au CRM (/api/essais), sans lire aucune donnée.
 */
export function useModeFiche(): boolean | null {
  const router = useRouter()
  const [exemple, setExemple] = useState<boolean | null>(null)
  useEffect(() => {
    const oui = new URLSearchParams(window.location.search).get('exemple') === '1'
    setExemple(oui)
    if (!oui) return
    void (async () => {
      const jeton = (await supabase.auth.getSession()).data.session?.access_token
      if (!jeton) { router.replace('/login'); return }
      const r = await fetch('/api/essais', { headers: { Authorization: `Bearer ${jeton}` } }).catch(() => null)
      const e = r?.ok ? await r.json().catch(() => ({})) as { crm?: boolean } : null
      if (e && e.crm !== true) router.replace('/dashboard')
    })()
  }, [router])
  return exemple
}

/** Le bandeau des fiches de l'exemple : on sait toujours qu'on regarde des données fictives, et on en sort d'un geste. */
export function BandeauFicheExemple() {
  return (
    <div className="crm-mode exemple" role="note" data-crm-mode="exemple">
      <p><b>{BANDEAU_EXEMPLE}</b> Cette fiche fait partie de l’exemple : ses boutons disent ce qu’ils feraient, sans rien envoyer.</p>
      <a className="psh-btn primary" href="/crm" onClick={() => ecrireChoix('donnees')}>Voir mes données</a>
    </div>
  )
}

/** Un lien qui respecte le mode exemple. */
export function Lien({ href, className, children, title, ...reste }: { href: string; className?: string; children: ReactNode; title?: string; 'data-crm-case'?: string }) {
  const exemple = useExemple()
  if (!exemple) return <a href={href} className={className} title={title} {...reste}>{children}</a>
  const vers = lienExemple(href)
  if (vers) return <a href={vers} className={className} title={title} {...reste}>{children}</a>
  return <span className={`${className ?? ''} crm-lien-inerte`.trim()} title="Dans l’exemple, ce lien ouvrirait vos vraies données : il est désactivé." {...reste}>{children}</span>
}
