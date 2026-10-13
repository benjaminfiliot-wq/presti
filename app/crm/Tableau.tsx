'use client'

import type { TableauCrm } from '@/lib/crm/tableau'
import { euros } from './client'
import { Lien, useExemple } from './mode'

// Le tableau de bord du CRM. Chaque case vient de lib/crm/tableau.ts (données réelles du compte) ; une case sans donnée
// affiche « — » et dit pourquoi. Jamais un chiffre d'exemple.
export default function TableauCrmVue({ t }: { t: TableauCrm }) {
  const exemple = useExemple()
  const retard = t.chantiers?.enRetard ?? null
  const cases = [
    {
      cle: 'signe', label: 'Signé ce mois',
      val: t.signeMois ? euros(t.signeMois.montant) : '—',
      sub: t.signeMois ? `${t.signeMois.nombre} devis signé${t.signeMois.nombre > 1 ? 's' : ''}` : 'Aucun devis pour l’instant',
      href: '/devis', ton: '',
    },
    {
      cle: 'attente', label: 'Devis en attente',
      val: t.devisEnAttente ? String(t.devisEnAttente.nombre) : '—',
      sub: t.devisEnAttente ? (t.devisEnAttente.nombre ? `${euros(t.devisEnAttente.montant)} envoyés, encore valables` : 'Aucun devis envoyé en attente') : 'Aucun devis pour l’instant',
      href: '/devis', ton: '',
    },
    {
      cle: 'relances', label: 'Relances dues',
      val: t.relancesDues ? String(t.relancesDues.nombre) : '—',
      sub: t.relancesDues ? `Devis envoyés sans réponse depuis plus de ${t.relancesDues.seuilJours} jours` : 'Aucun devis pour l’instant',
      href: '/chiffres', ton: t.relancesDues?.nombre ? 'warn' : '',
    },
    {
      cle: 'retard', label: 'Chantiers en retard',
      val: retard ? String(retard.nombre) : '—',
      sub: !t.chantiers ? 'Aucun chantier pour l’instant' : !retard ? 'Aucune fin prévue saisie sur les chantiers ouverts' : `${t.chantiers.actifs} chantier${t.chantiers.actifs > 1 ? 's' : ''} ouvert${t.chantiers.actifs > 1 ? 's' : ''}${t.chantiers.sansDate ? ` · ${t.chantiers.sansDate} sans fin prévue` : ''}`,
      href: '/crm?vue=chantiers', ton: retard?.nombre ? 'crit' : '',
    },
    {
      cle: 'stock', label: 'Stock bas',
      val: t.stockBas ? String(t.stockBas.nombre) : '—',
      sub: t.stockBas ? 'Matériaux sous leur seuil d’alerte' : 'Aucun seuil d’alerte réglé dans l’inventaire',
      href: '/inventaire', ton: t.stockBas?.nombre ? 'warn' : '',
    },
  ]
  return (
    <div className="crm-tdb">
      <div className="crm-kpis">
        {cases.map((c) => (
          <Lien key={c.cle} className={`crm-kpi ${c.ton}`} href={c.href} data-crm-case={c.cle}>
            <span className="lab">{c.label}</span>
            <span className="val tnum">{c.val}</span>
            <span className="sub">{c.sub}</span>
          </Lien>
        ))}
      </div>
      <div className="crm-grille2">
        <section className="psh-panel" aria-labelledby="crm-retards">
          <header><h2 id="crm-retards">Chantiers en retard</h2></header>
          <div className="crm-corps">
            {!retard?.liste.length
              ? <p className="crm-vide">{!t.chantiers ? 'Aucun chantier pour l’instant.' : !retard ? 'Saisissez une fin prévue sur vos chantiers pour voir les retards.' : 'Aucun chantier en retard.'}</p>
              : <ul className="crm-liste">{retard.liste.map((c) => <li key={c.id}><Lien href={`/crm/chantiers/${c.id}`}>{c.titre}</Lien><span className="pill crit">{c.jours} j de retard</span></li>)}</ul>}
          </div>
        </section>
        <section className="psh-panel" aria-labelledby="crm-stock">
          <header><h2 id="crm-stock">Stock bas</h2><Lien className="tag" href="/inventaire">Inventaire</Lien></header>
          <div className="crm-corps">
            {!t.stockBas?.liste.length
              ? <p className="crm-vide">{!t.stockBas ? 'Réglez un seuil d’alerte sur vos matériaux pour être prévenu.' : 'Aucun matériau sous son seuil.'}</p>
              : <ul className="crm-liste">{t.stockBas.liste.map((m) => <li key={m.id}><span>{m.nom}</span><span className="pill warn tnum">{m.reste} / {m.seuil} {m.unite}</span></li>)}</ul>}
          </div>
        </section>
      </div>
      <p className="crm-note">Chiffres du {t.jour.split('-').reverse().join('/')}, calculés sur {exemple ? 'les devis, factures, chantiers et inventaire de l’exemple' : 'vos devis, factures, chantiers et inventaire'}.{exemple ? ' Ils sont calculés exactement comme le seront les vôtres.' : ' « Signé ce mois » et « Devis en attente » sont les mêmes chiffres que dans Mes chiffres.'}</p>
    </div>
  )
}
