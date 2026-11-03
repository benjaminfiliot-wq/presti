'use client'
import Link from 'next/link'
import type { ReactNode } from 'react'

// La coque des cinq écrans (maquettes 036-010) : barre sobre, colonne de travail, barre du bas au doigt. Le nom « Presti » n'y
// figure que parce que c'est la console de l'artisan ; aucune surface que voit un client n'est dans ce dossier.
export type Ecran = 'accueil' | 'fait' | 'clients' | 'departements' | 'connexions'

const SYMBOLES = (
  <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
    <symbol id="i-accueil" viewBox="0 0 24 24"><path d="M3 11l9-7 9 7" /><path d="M5 10v10h14V10" /></symbol>
    <symbol id="i-valider" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-6" /></symbol>
    <symbol id="i-fait" viewBox="0 0 24 24"><path d="M4 5h16M4 12h16M4 19h10" /></symbol>
    <symbol id="i-clients" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5" /><path d="M16 4.5a3.5 3.5 0 010 7M18 14.8c1.8.8 3 2.5 3.5 5.2" /></symbol>
    <symbol id="i-doc" viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4M9 13h6M9 17h6" /></symbol>
    <symbol id="i-euro" viewBox="0 0 24 24"><path d="M17 6.5A6.5 6.5 0 007.5 12 6.5 6.5 0 0017 17.5M5 10h8M5 14h8" /></symbol>
    <symbol id="i-stock" viewBox="0 0 24 24"><path d="M3 8l9-5 9 5-9 5z" /><path d="M3 8v8l9 5 9-5V8" /></symbol>
    <symbol id="i-dep" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></symbol>
    <symbol id="i-prise" viewBox="0 0 24 24"><path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 01-12 0zM12 17v4" /></symbol>
    <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></symbol>
    <symbol id="i-envoi" viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6" /></symbol>
    <symbol id="i-cadenas" viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></symbol>
  </svg>
)

export const Icone = ({ nom }: { nom: string }) => <svg className="i" aria-hidden="true"><use href={`#i-${nom}`} /></svg>

export default function Coque({ ecran, aValider, signature, nom, metier, children }: {
  ecran: Ecran; aValider?: number | null; signature?: boolean | null; nom?: string | null; metier?: string | null; children: ReactNode
}) {
  const cur = (e: Ecran) => (ecran === e ? ({ 'aria-current': 'page' } as const) : {})
  const initiales = (nom ?? '').split(/\s+/).filter(Boolean).slice(0, 2).map((m) => m[0]!.toUpperCase()).join('') || '·'
  return (
    <>
      {SYMBOLES}
      <header className="haut-mobile">
        <span className="marque-mobile"><i aria-hidden="true" />Presti</span>
      </header>
      <div className="coque">
        <nav className="barre" aria-label="Navigation principale">
          <div className="marque"><i aria-hidden="true" />Presti</div>
          <Link className="nouvelle" href="/assistant"><span className="rond"><Icone nom="plus" /></span>Nouvelle demande</Link>
          <ul className="nav">
            <li><Link href="/systeme" {...cur('accueil')}><Icone nom="accueil" />Accueil</Link></li>
            <li><Link href="/systeme#a-valider"><Icone nom="valider" />À valider{aValider ? <><span className="sr"> : </span><span className="compte chaud">{aValider}</span></> : null}</Link></li>
            <li><Link href="/systeme/fait" {...cur('fait')}><Icone nom="fait" />Ce qui a été fait</Link></li>
            <li><Link href="/systeme/clients" {...cur('clients')}><Icone nom="clients" />Clients et chantiers</Link></li>
            <li><Link href="/devis"><Icone nom="doc" />Devis</Link></li>
            <li><Link href="/factures"><Icone nom="euro" />Factures</Link></li>
            <li><Link href="/inventaire"><Icone nom="stock" />Stock</Link></li>
          </ul>
          <div className="nav-titre">Réglages</div>
          <ul className="nav">
            <li><Link href="/systeme/departements" {...cur('departements')}><Icone nom="dep" />Mes départements</Link></li>
            <li><Link href="/systeme/connexions" {...cur('connexions')}><Icone nom="prise" />Connexions</Link></li>
          </ul>
          <div className="barre-pied">
            <span className="avatar" aria-hidden="true">{initiales}</span>
            <span>{nom ?? 'Votre compte'}{metier ? <small>{metier}</small> : null}</span>
            {signature != null ? <span className="pastille-offre">{signature ? 'Signature' : 'Studio'}</span> : null}
          </div>
        </nav>
        <main className="travail">{children}</main>
      </div>
      <nav className="bas-mobile" aria-label="Navigation mobile">
        <Link href="/systeme" {...cur('accueil')}><Icone nom="accueil" />Accueil</Link>
        <Link href="/systeme#a-valider"><Icone nom="valider" />À valider{aValider ? <><span className="sr"> : </span><span className="compte">{aValider}</span></> : null}</Link>
        <Link href="/systeme/clients" {...cur('clients')}><Icone nom="clients" />Clients</Link>
        <Link href="/systeme/fait" {...cur('fait')}><Icone nom="fait" />Fait</Link>
        <Link href="/systeme/departements" {...cur('departements')}><Icone nom="dep" />Départements</Link>
        <Link href="/systeme/connexions" {...cur('connexions')}><Icone nom="prise" />Connexions</Link>
      </nav>
    </>
  )
}

/** Un état de lecture partagé par les cinq écrans. */
export function Lecture({ etat, message }: { etat: 'chargement' | 'erreur'; message?: string }) {
  return etat === 'chargement'
    ? <p className="carte lecture" role="status">Lecture de vos données…</p>
    : <p className="carte lecture erreur" role="alert">{message}</p>
}

export function PasEncore({ children }: { children: ReactNode }) {
  return <p className="pas-encore" role="status">{children}</p>
}
