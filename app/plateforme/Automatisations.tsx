'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { MAILLONS_DEFAUT, PREREGLAGES, normaliserMaillons, phraseRegle, type Maillons, type Prereglage } from '@/lib/regles'
import { peut, offreMinimale, PLANS } from '@/lib/plans'

// Le constructeur de règles (v5 §9 G1) : une phrase dont chaque maillon est un réglage.
// L'artisan applique un préréglage, puis ajuste. La phrase se réécrit sous ses yeux —
// c'est elle qu'il lit, pas une liste de cases.

type Props = { uid: string; plan: string | null }

export default function Automatisations({ uid, plan }: Props) {
  // Les règles (devis brouillon automatique, envoi du devis) ne s'exécutent qu'avec l'offre qui a la capacité
  // `plateforme.regles` — Signature (lib/reglesServeur.ts). Jusqu'au 12/10 cet écran les ouvrait dès Studio : un abonné
  // réglait « Tout auto », l'enregistrait, et rien ne se passait jamais (audit des promesses, produit, ligne 69). L'écran
  // suit maintenant le serveur, et le dit. Seule la facture d'acompte à l'acceptation s'applique avec toutes les formules
  // (app/api/conversation/devis) : elle reste réglable.
  const reglesOk = peut(plan, 'plateforme.regles')
  const [m, setM] = useState<Maillons>(reglesOk ? MAILLONS_DEFAUT : PREREGLAGES.prudent.maillons)
  const [pre, setPre] = useState<Prereglage>(reglesOk ? 'equilibre' : 'prudent')
  const [actif, setActif] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const expertOk = peut(plan, 'plateforme.ia.expert')
  const offreRegles = offreMinimale('plateforme.regles')
  const nomOffreRegles = offreRegles ? PLANS[offreRegles].label : 'supérieure'
  const verrou = `Réservé à l’offre ${nomOffreRegles}.`

  useEffect(() => {
    supabase.from('regles_automatisation').select('prereglage, maillons, actif').eq('artisan_id', uid).maybeSingle().then(({ data }) => {
      if (!data) return
      setM(normaliserMaillons(data.maillons)); setPre((data.prereglage as Prereglage) || 'perso'); setActif(data.actif !== false)
    })
  }, [uid])

  function appliquer(p: Exclude<Prereglage, 'perso'>) { setPre(p); setM({ ...PREREGLAGES[p].maillons }) }
  function set<K extends keyof Maillons>(k: K, v: Maillons[K]) { setPre('perso'); setM((prev) => ({ ...prev, [k]: v })) }

  async function enregistrer() {
    if (saving) return
    setSaving(true); setMsg(null)
    const { error } = await supabase.from('regles_automatisation').upsert({ artisan_id: uid, prereglage: pre, maillons: m, actif, maj_le: new Date().toISOString() }, { onConflict: 'artisan_id' })
    setSaving(false)
    if (error) { setMsg({ type: 'err', text: 'Enregistrement impossible.' }); return }
    setMsg({ type: 'ok', text: 'Règle enregistrée.' }); setTimeout(() => setMsg(null), 2500)
  }

  const Maillon = ({ on, children, off }: { on: boolean; children: React.ReactNode; off?: boolean }) => (
    <span className={`regle-maillon${on ? ' on' : ''}${off ? ' off' : ''}`}>{children}</span>
  )

  return (
    <div className="prof-grid">
      <div className="tool-card">
        <h2>Ce qui se passe tout seul</h2>
        <p className="muted" style={{ margin: '0 0 1rem' }}>Le lien entre la réponse automatique et le devis : quand l’assistant a compris le besoin, que fait-on ? Choisissez un réglage, puis ajustez chaque maillon.</p>
        {!reglesOk ? (
          <p className="regle-alerte" role="note" style={{ margin: '0 0 1rem' }}>🔒 Le devis brouillon automatique et son envoi sont des règles d’automatisation, réservées à l’offre {nomOffreRegles}. Avec votre formule, le serveur ne les applique pas — vous lancez le devis vous-même (« Devis auto » dans la conversation). Seule la facture d’acompte à l’acceptation, plus bas, fonctionne avec toutes les formules.</p>
        ) : null}

        <div className="regle-pre">
          {(Object.keys(PREREGLAGES) as Exclude<Prereglage, 'perso'>[]).map((k) => (
            <button key={k} type="button" className={`regle-pre-b${pre === k ? ' on' : ''}`} onClick={() => appliquer(k)} disabled={!reglesOk && k !== 'prudent'}
              title={!reglesOk && k !== 'prudent' ? verrou : undefined}>
              <b>{PREREGLAGES[k].nom}</b><span>{PREREGLAGES[k].phrase}</span>
            </button>
          ))}
        </div>

        {reglesOk ? <p className="regle-phrase" aria-live="polite">{phraseRegle(m)}</p> : null}

        <label className="prof-toggle">
          <input type="checkbox" checked={actif} onChange={(e) => setActif(e.target.checked)} />
          <span>Règle <b>{actif ? 'active' : 'en pause'}</b></span>
        </label>

        <div className="regle-liste">
          <label className="prof-toggle"><input type="checkbox" checked={reglesOk && m.devis_auto} disabled={!reglesOk} onChange={(e) => set('devis_auto', e.target.checked)} /><span><Maillon on={reglesOk && m.devis_auto}>Créer un devis brouillon</Maillon> dès que le besoin est qualifié{!reglesOk ? <em className="muted"> — réservé à l’offre {nomOffreRegles}</em> : null}</span></label>
          <label className="prof-toggle"><input type="checkbox" checked={m.photo_requise} disabled={!reglesOk} onChange={(e) => set('photo_requise', e.target.checked)} /><span>Attendre <Maillon on={m.photo_requise}>au moins une photo</Maillon> du client avant de chiffrer</span></label>
          <div className="prof-toggle" style={{ alignItems: 'center' }}>
            <span>Chiffrer avec le modèle</span>
            <span className="pcfg-seg" style={{ marginLeft: '.6rem' }}>
              {(['standard', 'pro', 'expert'] as const).map((t) => (
                <button key={t} type="button" className={m.modele === t ? 'on' : ''} disabled={!reglesOk || (t === 'expert' && !expertOk)} onClick={() => set('modele', t)} title={t === 'expert' && !expertOk ? 'Disponible avec l’offre Signature.' : undefined}>{t === 'standard' ? 'Standard' : t === 'pro' ? 'Pro' : 'Expert'}</button>
              ))}
            </span>
          </div>
          <label className="prof-toggle"><input type="checkbox" checked={m.notifier} disabled={!reglesOk} onChange={(e) => set('notifier', e.target.checked)} /><span><Maillon on={m.notifier}>Me notifier</Maillon> quand le brouillon est prêt</span></label>
          <label className="prof-toggle"><input type="checkbox" checked={m.validation} disabled={!reglesOk} onChange={(e) => set('validation', e.target.checked)} /><span><Maillon on={m.validation}>Attendre ma validation</Maillon> avant que le devis parte{!m.validation ? <em className="regle-alerte"> — sans ce maillon, le devis part seul dans la conversation</em> : null}</span></label>
          <label className="prof-toggle"><input type="checkbox" checked={m.envoyer_apres_validation} disabled={!reglesOk} onChange={(e) => set('envoyer_apres_validation', e.target.checked)} /><span><Maillon on={m.envoyer_apres_validation}>L’envoyer dans la conversation</Maillon>{m.validation ? ' une fois validé' : ' immédiatement'}</span></label>
          <div className="prof-toggle" style={{ alignItems: 'center' }}>
            <input type="checkbox" checked={m.acompte_pct != null} onChange={(e) => set('acompte_pct', e.target.checked ? 30 : null)} />
            <span>Quand le client accepte, <Maillon on={m.acompte_pct != null}>créer la facture d’acompte</Maillon> de
              <input type="number" min={5} max={100} step={5} value={m.acompte_pct ?? 30} disabled={m.acompte_pct == null} onChange={(e) => set('acompte_pct', Math.max(5, Math.min(100, Number(e.target.value) || 30)))} style={{ width: 70, margin: '0 .4rem', display: 'inline-block' }} /> %</span>
          </div>
        </div>

        <p className="muted" style={{ fontSize: '.82rem', margin: '1rem 0 0' }}>Garde-fous, quoi que vous régliez : jamais deux devis automatiques pour une même conversation ; rien ne part jamais sans les mentions obligatoires (SIRET, assurance) ; si vous prenez la main sur une conversation, la règle s’y tait.</p>

        <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', marginTop: '1rem' }}>
          <button type="button" className="btn btn--primary" style={{ width: 'auto', margin: 0 }} disabled={saving} onClick={enregistrer}>{saving ? '…' : 'Enregistrer la règle'}</button>
          {msg ? <span className={msg.type === 'err' ? 'adr-msg err' : 'adr-msg ok'}>{msg.text}</span> : null}
        </div>
      </div>
    </div>
  )
}
