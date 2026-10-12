'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Info from '@/app/Info'
import { peut, offreMinimale, PLANS } from '@/lib/plans'

// Volet « Réglages » du poste de pilotage — l'ancien formulaire de /plateforme, tel quel.
// Tous les réglages sont APPLIQUÉS CÔTÉ SERVEUR (lib/plateformeConfig) — cet écran n'est que la commande.

type Mode = 'auto' | 'assistee' | 'manuelle'
type Cfg = {
  mode_reponse: Mode
  modele: string | null
  auto_24_7: boolean
  auto_debut: number | null
  auto_fin: number | null
  devis_auto: 'jamais' | 'brouillon' | 'seuil'
  devis_auto_seuil: number | null
  facture_auto: 'jamais' | 'acceptation'
  ton: 'sobre' | 'chaleureux' | 'direct'
  escalade_mots: string[]
  limite_messages: number
  nom_assistant: string | null
  message_accueil: string | null
  // Persona (§9 G2, migration 0053) — le TON, jamais des faits.
  style_exemples: string[]
  formule_ouverture: string | null
  formule_cloture: string | null
  vouvoiement: boolean
  emojis: boolean
  longueur: 'courte' | 'moyenne' | 'longue'
}
const DEFAUT: Cfg = {
  mode_reponse: 'assistee', modele: null, auto_24_7: true, auto_debut: 18, auto_fin: 8,
  devis_auto: 'brouillon', devis_auto_seuil: null, facture_auto: 'jamais', ton: 'chaleureux',
  escalade_mots: ['urgence', 'fuite', 'degat des eaux', 'inondation', 'gaz', 'assurance'],
  limite_messages: 8, nom_assistant: null, message_accueil: null,
  style_exemples: [], formule_ouverture: null, formule_cloture: null, vouvoiement: true, emojis: false, longueur: 'moyenne',
}
const LONGUEURS: { id: Cfg['longueur']; nom: string; desc: string }[] = [
  { id: 'courte', nom: 'Courte', desc: '1 à 2 phrases' }, { id: 'moyenne', nom: 'Moyenne', desc: '2 à 5 phrases' }, { id: 'longue', nom: 'Longue', desc: 'prend le temps d’expliquer' },
]

const MODES: { id: Mode; nom: string; desc: string }[] = [
  { id: 'auto', nom: 'Automatique', desc: 'L’assistant répond tout de suite, à votre place. Vous reprenez la main quand vous voulez.' },
  { id: 'assistee', nom: 'Assistée', desc: 'Rien ne part sans vous : l’assistant prépare, vous validez depuis Conversations.' },
  { id: 'manuelle', nom: 'Manuelle', desc: 'Aucune réponse automatique. Vous écrivez tout vous-même.' },
]
const TONS: { id: Cfg['ton']; nom: string }[] = [
  { id: 'sobre', nom: 'Sobre' }, { id: 'chaleureux', nom: 'Chaleureux' }, { id: 'direct', nom: 'Direct' },
]
const MODELES: { id: string; nom: string }[] = [{ id: 'standard', nom: 'Standard' }, { id: 'pro', nom: 'Pro' }, { id: 'expert', nom: 'Expert' }]

export default function Reglages({ uid, plan, pause, onPause }: { uid: string; plan: string | null; pause: boolean; onPause: (v: boolean) => void }) {
  const [cfg, setCfg] = useState<Cfg>(DEFAUT)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  // Ce que le serveur applique VRAIMENT (v7, 1e) : peut différer du mode choisi (verrou d'offre).
  const [effectif, setEffectif] = useState<{ mode_effectif: Mode; motif: string | null } | null>(null)
  const [modeMsg, setModeMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const verrouAuto = !peut(plan, 'plateforme.ia.auto')
  const offreAuto = offreMinimale('plateforme.ia.auto')
  const libelleOffre = offreAuto ? PLANS[offreAuto].label : 'supérieure'

  async function lireEffectif() {
    const { data } = await supabase.auth.getSession()
    const t = data.session?.access_token
    if (!t) return
    const r = await fetch('/api/plateforme/config', { headers: { Authorization: `Bearer ${t}` } })
    if (r.ok) setEffectif(await r.json())
  }

  // Le mode s'enregistre AU CLIC (v7, 1e) : avant, il fallait trouver le bouton « Enregistrer »
  // plus bas, et un re-rendu pouvait écraser le choix entre-temps. Retour visuel immédiat, et
  // relecture du mode que le serveur applique.
  async function choisirMode(id: Mode) {
    if (id === 'auto' && verrouAuto) return
    set('mode_reponse', id); setModeMsg(null)
    const { error } = await supabase.from('plateforme_config').upsert({ artisan_id: uid, mode_reponse: id, maj_le: new Date().toISOString() }, { onConflict: 'artisan_id' })
    if (error) { setModeMsg({ type: 'err', text: 'Non enregistré — réessayez.' }); return }
    setModeMsg({ type: 'ok', text: 'Enregistré.' }); setTimeout(() => setModeMsg(null), 2000)
    await lireEffectif()
  }

  useEffect(() => {
    supabase.from('plateforme_config').select('*').eq('artisan_id', uid).maybeSingle().then(({ data: c }) => {
      // Sans ligne de config (compte tout neuf) : « assistée », comme le serveur (CONFIG_DEFAUT).
      setCfg(c ? { ...DEFAUT, ...(c as Partial<Cfg>) } : { ...DEFAUT })
    })
    lireEffectif()
    // Au montage seulement : un re-rendu du parent ne doit pas écraser un choix en cours (v7, 1e).
  }, [uid])

  function set<K extends keyof Cfg>(k: K, v: Cfg[K]) { setCfg((p) => ({ ...p, [k]: v })) }

  async function enregistrer() {
    if (saving) return
    setSaving(true); setMsg(null)
    const { error } = await supabase.from('plateforme_config').upsert({
      artisan_id: uid,
      mode_reponse: cfg.mode_reponse, modele: cfg.modele, auto_24_7: cfg.auto_24_7,
      auto_debut: cfg.auto_24_7 ? null : cfg.auto_debut, auto_fin: cfg.auto_24_7 ? null : cfg.auto_fin,
      devis_auto: cfg.devis_auto, devis_auto_seuil: cfg.devis_auto === 'seuil' ? cfg.devis_auto_seuil : null,
      facture_auto: cfg.facture_auto, ton: cfg.ton, escalade_mots: cfg.escalade_mots,
      limite_messages: Math.max(0, Math.min(40, Number(cfg.limite_messages) || 0)),
      nom_assistant: cfg.nom_assistant?.trim() || null, message_accueil: cfg.message_accueil?.trim() || null,
      style_exemples: (cfg.style_exemples || []).map((e) => e.trim()).filter((e) => e.length >= 10).slice(0, 5),
      formule_ouverture: cfg.formule_ouverture?.trim().slice(0, 120) || null,
      formule_cloture: cfg.formule_cloture?.trim().slice(0, 120) || null,
      vouvoiement: cfg.vouvoiement !== false, emojis: cfg.emojis === true,
      longueur: cfg.longueur === 'courte' || cfg.longueur === 'longue' ? cfg.longueur : 'moyenne',
      maj_le: new Date().toISOString(),
    }, { onConflict: 'artisan_id' })
    await supabase.from('artisans').update({ leads_pause: pause }).eq('id', uid)
    setSaving(false)
    if (error) { setMsg({ type: 'err', text: 'Enregistrement impossible.' }); return }
    setMsg({ type: 'ok', text: 'Réglages enregistrés.' }); setTimeout(() => setMsg(null), 2500)
  }

  return (
    <div className="prof-grid">
      <div className="tool-card">
        <h2>Intelligence</h2>
        <p className="muted" style={{ margin: '0 0 1rem' }}>Comment votre assistant se comporte avec vos clients. Tout est appliqué côté serveur — ce que vous réglez ici fait foi.</p>

        <label className="prof-toggle" style={{ marginBottom: '1.1rem' }}>
          <input type="checkbox" checked={pause} onChange={(e) => onPause(e.target.checked)} />
          <span>Demandes <Info cle="plateforme.demandes_pause" /> <b>{pause ? 'en pause' : 'ouvertes'}</b> {pause ? '— votre page enregistre les demandes mais n’envoie plus rien (congés, surcharge). Rien n’est perdu.' : '— vous recevez et traitez les nouvelles demandes normalement'}</span>
        </label>

        <label className="pcfg-lab">Mode de réponse <Info cle="plateforme.mode_reponse" /></label>
        <div className="pcfg-modes">
          {MODES.map((m) => {
            // Le verrou d'offre est VISIBLE (v7, 1c) : avant, « Automatique » se laissait choisir en
            // Essai/Essentiel et le serveur appliquait « assistée » sans le dire.
            const verrou = m.id === 'auto' && verrouAuto
            return (
              <button type="button" key={m.id} className={`pcfg-mode${cfg.mode_reponse === m.id ? ' on' : ''}${verrou ? ' verrou' : ''}`}
                aria-disabled={verrou} disabled={verrou} onClick={() => choisirMode(m.id)}
                title={verrou ? `Disponible avec l’offre ${libelleOffre}` : undefined}>
                <b>{m.nom}{verrou ? ' 🔒' : ''}</b><span>{verrou ? `Disponible avec l’offre ${libelleOffre} — d’ici là, l’assistant prépare et vous validez.` : m.desc}</span>
              </button>
            )
          })}
        </div>
        <p className="muted pcfg-effectif" aria-live="polite">
          {effectif
            ? <>Mode appliqué par le serveur : <b>{MODES.find((m) => m.id === effectif.mode_effectif)?.nom ?? effectif.mode_effectif}</b>{effectif.motif === 'verrou_offre' ? ` — l’assistant autonome est réservé à l’offre ${libelleOffre}` : ''}.</>
            : <>Mode appliqué par le serveur : lecture…</>}
          {modeMsg ? <span className={modeMsg.type === 'err' ? 'adr-msg err' : 'adr-msg ok'} style={{ marginLeft: '.6rem' }}>{modeMsg.text}</span> : null}
        </p>

        <label className="pcfg-lab">Modèle utilisé <Info cle="plateforme.modele" /></label>
        <div className="pcfg-seg">
          {MODELES.map((m) => <button type="button" key={m.id} className={cfg.modele === m.id ? 'on' : ''} onClick={() => set('modele', m.id)}>{m.nom}</button>)}
          <button type="button" className={!cfg.modele ? 'on' : ''} onClick={() => set('modele', null)}>Par défaut (Standard)</button>
        </div>

        <label className="pcfg-lab">Ton <Info cle="plateforme.ton" /></label>
        <div className="pcfg-seg">
          {TONS.map((t) => <button type="button" key={t.id} className={cfg.ton === t.id ? 'on' : ''} onClick={() => set('ton', t.id)}>{t.nom}</button>)}
        </div>

        <label className="prof-toggle" style={{ marginTop: '1rem' }}>
          <input type="checkbox" checked={cfg.auto_24_7} onChange={(e) => set('auto_24_7', e.target.checked)} />
          <span>Répondre <Info cle="plateforme.auto_24_7" /> <b>{cfg.auto_24_7 ? '24h/24' : 'seulement sur une plage'}</b> {cfg.auto_24_7 ? '— l’assistant est disponible en permanence' : '— en dehors, vous répondez vous-même'}</span>
        </label>
        {!cfg.auto_24_7 ? (
          <div className="pcfg-heures">
            <span>De</span>
            <select value={cfg.auto_debut ?? 18} onChange={(e) => set('auto_debut', Number(e.target.value))}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}h</option>)}</select>
            <span>à</span>
            <select value={cfg.auto_fin ?? 8} onChange={(e) => set('auto_fin', Number(e.target.value))}>{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}h</option>)}</select>
            <small className="muted">heure française</small>
          </div>
        ) : null}

        <label className="pcfg-lab">Mots qui coupent l’assistant et vous alertent <Info cle="plateforme.escalade_mots" /></label>
        <input value={(cfg.escalade_mots || []).join(', ')} onChange={(e) => set('escalade_mots', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} placeholder="urgence, fuite, dégât des eaux…" />
        <p className="muted" style={{ margin: '.35rem 0 0', fontSize: '.8rem' }}>Si le client emploie l’un de ces mots, l’assistant se tait et vous recevez une alerte — c’est vous qui répondez.</p>

        <label className="pcfg-lab">Reprise humaine après <Info cle="plateforme.limite_messages" /></label>
        <div className="pcfg-heures">
          <input type="number" min={0} max={40} value={cfg.limite_messages} onChange={(e) => set('limite_messages', Number(e.target.value))} style={{ width: 90 }} />
          <span>réponses de l’assistant dans une même conversation</span>
        </div>
        <p className="muted" style={{ margin: '.6rem 0 0', fontSize: '.8rem' }}>Le devis brouillon automatique (offre Signature) et la facture d’acompte à l’acceptation se règlent dans l’onglet <b>Automatisations</b>.</p>
      </div>

      <div className="tool-card">
        <h2>L’assistant</h2>
        <p className="muted" style={{ margin: '0 0 .9rem' }}>Votre client voit toujours qu’il parle à un assistant — c’est une obligation de loyauté, et ça vous protège.</p>
        <label htmlFor="nom-assistant">Nom affiché (facultatif) <Info cle="plateforme.nom_assistant" /></label>
        <input id="nom-assistant" value={cfg.nom_assistant ?? ''} onChange={(e) => set('nom_assistant', e.target.value)} placeholder="Ex : L’atelier" maxLength={40} />
        <label htmlFor="accueil-assistant">Message d’accueil (facultatif) <Info cle="plateforme.message_accueil" /></label>
        <textarea id="accueil-assistant" rows={2} value={cfg.message_accueil ?? ''} onChange={(e) => set('message_accueil', e.target.value)} placeholder="Ex : Décrivez votre projet, je vous réponds tout de suite." maxLength={200} />

        {/* ── Persona (§9 G2) : comment l'assistant ÉCRIT. Rien ici n'est un fait sur une demande. */}
        <label className="pcfg-lab">Votre façon d’écrire <Info cle="plateforme.style_exemples" /></label>
        <p className="muted" style={{ margin: '0 0 .5rem', fontSize: '.82rem' }}>Collez jusqu’à trois messages que vous avez vraiment écrits à des clients. L’assistant en imite le ton — jamais un prix, un délai ou un détail.</p>
        <div className="pcfg-exemples">
          {[0, 1, 2].map((i) => (
            <textarea key={i} rows={2} maxLength={600} value={cfg.style_exemples[i] ?? ''} placeholder={['Ex : Bonjour Madame, je passe jeudi matin jeter un œil, ça vous va ?', 'Ex : Merci pour les photos, c’est clair. Je vous prépare ça.', 'Ex : Pas de souci, on cale ça ensemble par téléphone.'][i]} aria-label={`Message ${i + 1} écrit par vous`}
              onChange={(e) => { const next = [...cfg.style_exemples]; while (next.length < 3) next.push(''); next[i] = e.target.value; set('style_exemples', next) }} />
          ))}
        </div>

        <label className="pcfg-lab">Vous ou tu <Info cle="plateforme.vouvoiement" /></label>
        <div className="pcfg-seg">
          <button type="button" className={cfg.vouvoiement !== false ? 'on' : ''} onClick={() => set('vouvoiement', true)}>Vous</button>
          <button type="button" className={cfg.vouvoiement === false ? 'on' : ''} onClick={() => set('vouvoiement', false)}>Tu</button>
        </div>

        <label className="pcfg-lab">Longueur des réponses <Info cle="plateforme.longueur" /></label>
        <div className="pcfg-seg">
          {LONGUEURS.map((l) => <button type="button" key={l.id} className={cfg.longueur === l.id ? 'on' : ''} title={l.desc} onClick={() => set('longueur', l.id)}>{l.nom}</button>)}
        </div>

        <label className="prof-toggle" style={{ marginTop: '1rem' }}>
          <input type="checkbox" checked={cfg.emojis === true} onChange={(e) => set('emojis', e.target.checked)} />
          <span>Émojis <Info cle="plateforme.emojis" /> <b>{cfg.emojis ? 'autorisés' : 'jamais'}</b> {cfg.emojis ? '— un de temps en temps, jamais dans un message sérieux' : '— l’assistant n’en met aucun'}</span>
        </label>

        <label className="pcfg-lab">Formules <Info cle="plateforme.formules" /></label>
        <div className="pcfg-formules">
          <input value={cfg.formule_ouverture ?? ''} onChange={(e) => set('formule_ouverture', e.target.value)} placeholder="Ouverture, au premier message — ex : Bonjour et merci pour votre message" maxLength={120} aria-label="Formule d’ouverture" />
          <input value={cfg.formule_cloture ?? ''} onChange={(e) => set('formule_cloture', e.target.value)} placeholder="Clôture, quand il propose la suite — ex : Je reste à votre disposition" maxLength={120} aria-label="Formule de clôture" />
        </div>
        <p className="muted" style={{ margin: '.6rem 0 0', fontSize: '.8rem' }}>L’avatar, les couleurs, les polices et l’écran d’accueil se règlent dans l’onglet <b>Apparence</b>.</p>
        <div style={{ display: 'flex', gap: '.6rem', alignItems: 'center', marginTop: '1rem' }}>
          <button type="button" className="btn btn--primary" style={{ width: 'auto', margin: 0 }} disabled={saving} onClick={enregistrer}>{saving ? '…' : 'Enregistrer'}</button>
          {msg ? <span className={msg.type === 'err' ? 'adr-msg err' : 'adr-msg ok'}>{msg.text}</span> : null}
        </div>
      </div>
    </div>
  )
}
