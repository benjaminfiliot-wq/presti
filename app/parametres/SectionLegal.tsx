'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Info from '@/app/Info'
import { mentionFranchise, type BaseMention } from '@/lib/facturation'
import { mentionsManquantes } from '@/lib/legalArtisan'
import type { SectionProps } from './commun'

// Entreprise & légal — LA source de vérité des informations qui figurent sur les devis, les
// factures et les mentions légales. L'éditeur de devis n'a plus son propre formulaire : il
// renvoie ici. Contenu repris de l'ancien onglet, plus le ⓘ sur chaque réglage (§4 B2).

type Legal = { siret: string; tva_num: string; iban: string; forme_juridique: string; adresse: string; code_postal: string; ville: string; assurance_nom: string; assurance_contrat: string; assurance_zone: string; assurance_activites: string; mediateur_nom: string; mediateur_url: string }

export default function SectionLegal({ a, patch, signaler }: SectionProps) {
  const [legal, setLegal] = useState<Legal>({
    siret: a.siret ?? '', tva_num: a.tva_num ?? '', iban: a.iban ?? '',
    forme_juridique: a.forme_juridique ?? '', adresse: a.adresse ?? '', code_postal: a.code_postal ?? '', ville: a.ville ?? '',
    mediateur_nom: a.mediateur_nom ?? '', mediateur_url: a.mediateur_url ?? '',
    assurance_nom: a.assurance_nom ?? '', assurance_contrat: a.assurance_contrat ?? '',
    assurance_zone: a.assurance_zone ?? '', assurance_activites: a.assurance_activites ?? '',
  })
  const [aTva, setATva] = useState(!!a.tva_num)
  const [mentionBase, setMentionBase] = useState<BaseMention>((a.mention_tva_base as BaseMention) ?? 'auto')
  const [saving, setSaving] = useState(false)

  // Même source de vérité que la page de mentions légales : ce qui manque ici est
  // exactement ce qui s'affichera « non communiqué » sur le site de l'artisan.
  const manquantes = mentionsManquantes({
    nom: null, metier: null,
    forme_juridique: legal.forme_juridique || null, siret: legal.siret || null,
    adresse: legal.adresse || null, code_postal: legal.code_postal || null, ville: legal.ville || null,
    tel_public: null, email_public: null, tva_num: legal.tva_num || null,
    assurance_nom: legal.assurance_nom || null, assurance_contrat: legal.assurance_contrat || null,
    assurance_activites: legal.assurance_activites || null, assurance_zone: legal.assurance_zone || null,
    zone_intervention: null,
    mediateur_nom: legal.mediateur_nom || null, mediateur_url: legal.mediateur_url || null,
  }).filter((m) => m !== 'Dénomination' && m !== 'Contact') // renseignés dans « Ma page »

  function setL<K extends keyof Legal>(k: K, v: string) { setLegal((p) => ({ ...p, [k]: v })) }

  async function enregistrer() {
    if (saving) return
    setSaving(true)
    const valeurs = {
      siret: legal.siret.trim() || null,
      forme_juridique: legal.forme_juridique.trim() || null,
      adresse: legal.adresse.trim() || null,
      code_postal: legal.code_postal.trim() || null,
      ville: legal.ville.trim() || null,
      mediateur_nom: legal.mediateur_nom.trim() || null,
      mediateur_url: legal.mediateur_url.trim() || null,
      tva_num: aTva ? (legal.tva_num.trim() || null) : null,
      // La case « assujetti à la TVA » écrit le RÉGIME, pas seulement le numéro — sinon les
      // devis restent à 0 % avec une mention fausse (défaut trouvé par l'audit du 2026-09-03).
      tva_regime: aTva ? 'reel' : 'franchise',
      mention_tva_base: mentionBase,
      iban: legal.iban.replace(/\s+/g, '').toUpperCase() || null,
      assurance_nom: legal.assurance_nom.trim() || null,
      assurance_contrat: legal.assurance_contrat.trim() || null,
      assurance_zone: legal.assurance_zone.trim() || null,
      assurance_activites: legal.assurance_activites.trim() || null,
    }
    const { error } = await supabase.from('artisans').update(valeurs).eq('id', a.id)
    setSaving(false)
    if (error) { signaler({ type: 'err', text: 'Enregistrement impossible.' }); return }
    patch(valeurs)
    signaler({ type: 'ok', text: 'Informations enregistrées ✅' })
  }

  return (
    <div className="tool-card">
      <h2>Entreprise &amp; légal</h2>
      <p className="muted" style={{ margin: '0 0 1rem' }}>Ces informations apparaissent sur vos devis, vos factures et vos mentions légales — elles sont obligatoires pour qu’ils soient conformes. C’est ici, et seulement ici, qu’on les renseigne.</p>

      {manquantes.length > 0 ? (
        <div className="par-manque">
          <b>Il vous manque {manquantes.length} mention{manquantes.length > 1 ? 's' : ''} obligatoire{manquantes.length > 1 ? 's' : ''}</b>
          <span>{manquantes.join(' · ')}</span>
          <em>Sans elles, vos devis et factures ne sont pas conformes (amende de 15 € par mention manquante), et vos mentions légales affichent « non communiqué ».</em>
        </div>
      ) : null}
      <label>SIRET <Info cle="parametres.siret" /></label>
      <input value={legal.siret} onChange={(e) => setL('siret', e.target.value)} inputMode="numeric" autoComplete="off" placeholder="14 chiffres" maxLength={20} />
      <label>Forme juridique <Info cle="parametres.forme_juridique" /></label>
      <input value={legal.forme_juridique} onChange={(e) => setL('forme_juridique', e.target.value)} placeholder="Ex : SARL au capital de 10 000 € · EI · Auto-entrepreneur" maxLength={120} />
      <label>Adresse de l’entreprise <Info cle="parametres.adresse" /></label>
      <input value={legal.adresse} onChange={(e) => setL('adresse', e.target.value)} placeholder="Numéro et rue" maxLength={160} />
      <div className="par-cp">
        <input value={legal.code_postal} onChange={(e) => setL('code_postal', e.target.value)} inputMode="numeric" autoComplete="postal-code" placeholder="Code postal" maxLength={10} />
        <input value={legal.ville} onChange={(e) => setL('ville', e.target.value)} placeholder="Ville" maxLength={80} />
      </div>
      <label className="prof-toggle" style={{ marginTop: '.9rem' }}>
        <input type="checkbox" checked={aTva} onChange={(e) => setATva(e.target.checked)} />
        <span>Je suis <b>assujetti à la TVA</b>{aTva ? '' : ' — sinon la mention de franchise ci-dessous est portée sur vos documents'} <Info cle="parametres.assujetti_tva" /></span>
      </label>
      {aTva ? (<><label>Numéro de TVA intracommunautaire <Info cle="parametres.tva_num" /></label><input value={legal.tva_num} onChange={(e) => setL('tva_num', e.target.value)} placeholder="FR…" maxLength={20} /></>) : (
        <div className="par-mention">
          <label>Référence légale de la mention <Info cle="parametres.mention_base" /></label>
          <div className="sa-pills">
            {([['auto', 'Automatique'], ['cibs', 'CIBS (nouvelle)'], ['cgi', 'CGI (ancienne)']] as const).map(([id, nom]) => (
              <button key={id} type="button" className={`sa-pill${mentionBase === id ? ' on' : ''}`} onClick={() => setMentionBase(id)}>{nom}</button>
            ))}
          </div>
          <p className="muted par-apercu">Portée sur vos devis et factures : <b>{mentionFranchise(mentionBase)}</b></p>
          <p className="muted" style={{ fontSize: '.8rem', margin: '.3rem 0 0' }}>
            La référence au CGI a été remplacée par le CIBS le 1<sup>er</sup> septembre 2026. L’ancienne reste acceptée jusqu’au 31 décembre 2027 — gardez-la si votre comptable la préfère, « Automatique » suit la date.
          </p>
        </div>
      )}
      <label>IBAN (pour le règlement de vos factures) <Info cle="parametres.iban" /></label>
      <input value={legal.iban} onChange={(e) => setL('iban', e.target.value)} autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="FR76…" maxLength={40} />

      <h3 style={{ margin: '1.6rem 0 .2rem', fontSize: '1rem' }}>Assurance professionnelle</h3>
      <p className="muted" style={{ margin: '0 0 .6rem', fontSize: '.85rem' }}>Obligatoire sur les devis et factures du bâtiment (garantie décennale).</p>
      <label>Assureur <Info cle="parametres.assurance_nom" /></label>
      <input value={legal.assurance_nom} onChange={(e) => setL('assurance_nom', e.target.value)} placeholder="Ex : AXA" />
      <label>N° de contrat <Info cle="parametres.assurance_contrat" /></label>
      <input value={legal.assurance_contrat} onChange={(e) => setL('assurance_contrat', e.target.value)} />
      <label>Zone géographique couverte <Info cle="parametres.assurance_zone" /></label>
      <input value={legal.assurance_zone} onChange={(e) => setL('assurance_zone', e.target.value)} placeholder="Ex : France métropolitaine" />
      <label>Activités couvertes <Info cle="parametres.assurance_activites" /></label>
      <input value={legal.assurance_activites} onChange={(e) => setL('assurance_activites', e.target.value)} placeholder="Ex : menuiserie, agencement" />

      <h3 style={{ margin: '1.6rem 0 .2rem', fontSize: '1rem' }}>Médiateur de la consommation</h3>
      <p className="muted" style={{ margin: '0 0 .6rem', fontSize: '.85rem' }}>
        Obligatoire dès que vous travaillez pour des particuliers (art. L.616-1 du code de la consommation) : vous devez adhérer à un dispositif de médiation et en indiquer les coordonnées. Tant que ce n’est pas renseigné, vos mentions légales ne peuvent pas l’afficher — on ne l’invente pas.
      </p>
      <label>Nom du médiateur <Info cle="parametres.mediateur_nom" /></label>
      <input value={legal.mediateur_nom} onChange={(e) => setL('mediateur_nom', e.target.value)} placeholder="Ex : CM2C — Centre de la médiation de la consommation de conciliateurs de justice" maxLength={160} />
      <label>Site du médiateur <Info cle="parametres.mediateur_url" /></label>
      <input value={legal.mediateur_url} onChange={(e) => setL('mediateur_url', e.target.value)} placeholder="https://…" maxLength={300} />

      <button type="button" className="btn btn--primary" style={{ marginTop: '1.2rem' }} disabled={saving} onClick={enregistrer}>{saving ? '…' : 'Enregistrer'}</button>
    </div>
  )
}
