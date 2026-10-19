'use client'

import type { ReactNode } from 'react'
import type { Indicateurs as IndicateursT } from '@/lib/crm/chantier'
import { euros } from './client'
import { Lien } from './mode'

// La colonne d'indicateurs d'un chantier (plan du 18/10, n°2) : l'argent du devis, la matière sortie du stock, la marge
// ESTIMÉE sur matériaux, l'avancement et le retard. Tout vient de lib/crm/chantier.ts (indicateurs), calculé côté serveur.
// Toucher un indicateur ouvre la pièce derrière : le devis, les factures, la liste des matériaux sortis.
// La marge dit toujours ce qu'elle est : « sur matériaux, estimée » — la main-d'œuvre n'est pas comptée, ce n'est pas un bénéfice.
export default function Indicateurs({ ind, chantierId, dansLaFiche }: { ind: IndicateursT; chantierId: string; dansLaFiche: boolean }) {
  const devisId = ind.devisId
  const a = ind.argent
  const ancre = (cible: string) => (dansLaFiche ? `#${cible}` : `/crm/chantiers/${chantierId}#${cible}`)
  const m = ind.matiere
  return (
    <ul className={`crm-indic${dansLaFiche ? '' : ' compacte'}`} aria-label="Indicateurs du chantier">
      <Case lab="Devis" href={devisId ? `/devis/${devisId}` : null} val={a.devis !== null ? euros(a.devis) : '—'}
        sub={a.devis === null ? 'Chantier sans devis' : `${ind.devisHt !== null ? `${euros(ind.devisHt)} HT · ` : ''}${a.signe ? 'signé' : 'non signé'}`} />
      <Case lab="Facturé" href={ancre('crm-historique')} val={a.devis === null ? '—' : euros(a.facture)}
        sub={a.devis === null ? 'Factures non reliées' : a.acompteDouble ? <span className="crm-indic-alerte">Acompte de {euros(a.acompteDouble)} aussi compté dans la facture du solde : émettez un avoir (compté une seule fois ici)</span> : a.resteAFacturer ? `${euros(a.resteAFacturer)} restent à facturer` : a.nbFactures ? `${a.nbFactures} facture${a.nbFactures > 1 ? 's' : ''}` : 'Rien de facturé'} />
      <Case lab="Encaissé" href="/factures" val={a.devis === null ? '—' : euros(a.encaisse)}
        sub={a.acompte.pct !== null ? `Acompte ${a.acompte.pct} % : ${a.acompte.recu ? `${euros(a.acompte.recu)} reçu` : a.acompte.facture ? 'facturé, pas encore réglé' : 'pas encore demandé'}` : 'Factures payées'} />
      <Case lab="Reste à encaisser" href="/factures" ton={a.resteAEncaisser > 0 ? 'warn' : ''} val={a.devis === null ? '—' : euros(a.resteAEncaisser)}
        sub={a.devis === null ? '—' : a.factureNonRegle ? `dont ${euros(a.factureNonRegle)} facturés non réglés` : a.resteAEncaisser ? 'Le reste n’est pas encore facturé' : 'Tout est encaissé'} />
      <Case lab="Matière sortie" href={ancre('crm-materiaux')} val={m.lignes || m.sansPrix ? `${euros(m.sortie)} HT` : '—'}
        sub={!m.lignes && !m.sansPrix ? 'Rien de sorti du stock' : `Au dernier prix vu${m.sansPrix ? ` · ${m.sansPrix} sortie${m.sansPrix > 1 ? 's' : ''} sans prix` : ''}`} />
      <Case lab="Marge sur matériaux, estimée" href={ancre('crm-materiaux')} val={ind.marge ? `${ind.marge.pct} %` : '—'}
        sub={ind.marge ? `${euros(ind.marge.montant)} HT · main-d’œuvre non comptée${ind.marge.partielle ? ' · partielle (prix manquants)' : ''}` : ind.devisHt ? 'Aucune sortie chiffrée' : 'Sans devis HT'} />
      <Case lab="Avancement" href={ancre('crm-taches')} val={ind.avancement.pct !== null ? `${ind.avancement.pct} %` : '—'}
        sub={ind.avancement.total ? `${ind.avancement.faites} tâche${ind.avancement.faites > 1 ? 's' : ''} sur ${ind.avancement.total}` : 'Aucune tâche'} />
      <Case lab="Retard" href={null} ton={ind.retard ? 'crit' : ''} val={ind.retard ? `${ind.retard} j` : ind.retard === 0 ? 'Aucun' : '—'}
        sub={ind.retard === null ? 'Pas de fin prévue' : ind.retard ? 'Fin prévue dépassée' : 'Dans les temps'} />
    </ul>
  )
}

function Case({ lab, val, sub, href, ton = '' }: { lab: string; val: string; sub: ReactNode; href: string | null; ton?: string }) {
  const corps = <><span className="lab">{lab}</span><span className="val tnum">{val}</span><span className="sub">{sub}</span></>
  if (!href) return <li className={`crm-indic-case ${ton}`}>{corps}</li>
  // Une ancre de la même page reste un lien simple (rien ne quitte l'écran) ; sinon, le lien respecte le mode exemple.
  return <li className={`crm-indic-case ${ton}`}>{href.startsWith('#') ? <a className="lien" href={href}>{corps}</a> : <Lien className="lien" href={href}>{corps}</Lien>}</li>
}
