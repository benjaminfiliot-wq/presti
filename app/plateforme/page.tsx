'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import AppShell from '@/app/AppShell'

// « Ma plateforme → Intelligence » (v4 §A4) : l'artisan règle ici comment son assistant
// se comporte avec ses clients. Tous les réglages sont APPLIQUÉS CÔTÉ SERVEUR
// (lib/plateformeConfig) — cet écran n'est que la commande.

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
}
const DEFAUT: Cfg = {
  mode_reponse: 'auto', modele: null, auto_24_7: true, auto_debut: 18, auto_fin: 8,
  devis_auto: 'brouillon', devis_auto_seuil: null, facture_auto: 'jamais', ton: 'chaleureux',
  escalade_mots: ['urgence', 'fuite', 'degat des eaux', 'inondation', 'gaz', 'assurance'],
  limite_messages: 8, nom_assistant: null, message_accueil: null,
}

const MODES: { id: Mode; nom: string; desc: string }[] = [
  { id: 'auto', nom: 'Automatique', desc: 'L’assistant répond tout de suite, à votre place. Vous reprenez la main quand vous voulez.' },
  { id: 'assistee', nom: 'Assistée', desc: 'Rien ne part sans vous : l’assistant prépare, vous validez depuis Messages.' },
  { id: 'manuelle', nom: 'Manuelle', desc: 'Aucune réponse automatique. Vous écrivez tout vous-même.' },
]
const TONS: { id: Cfg['ton']; nom: string }[] = [
  { id: 'sobre', nom: 'Sobre' }, { id: 'chaleureux', nom: 'Chaleureux' }, { id: 'direct', nom: 'Direct' },
]
const MODELES: { id: string; nom: string }[] = [{ id: 'standard', nom: 'Standard' }, { id: 'pro', nom: 'Pro' }, { id: 'expert', nom: 'Expert' }]

export default function PlateformePage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [uid, setUid] = useState('')
  const [slug, setSlug] = useState('')
  const [active, setActive] = useState(true)
  const [cfg, setCfg] = useState<Cfg>(DEFAUT)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      const id = data.session.user.id
      setUid(id)
      const { data: a } = await supabase.from('artisans').select('slug, plateforme_active, reponse_auto').eq('id', id).maybeSingle()
      if (!a) { router.replace('/onboarding'); return }
      setSlug(a.slug ?? ''); setActive(a.plateforme_active !== false)
      const { data: c } = await supabase.from('plateforme_config').select('*').eq('artisan_id', id).maybeSingle()
      // Sans configuration, on part du comportement actuel de l'artisan (aucune surprise).
      setCfg(c ? { ...DEFAUT, ...(c as Partial<Cfg>) } : { ...DEFAUT, mode_reponse: a.reponse_auto === false ? 'manuelle' : 'auto' })
      setReady(true)
    })
  }, [router])

  function set<K extends keyof Cfg>(k: K, v: Cfg[K]) { setCfg((p) => ({ ...p, [k]: v })) }

  async function enregistrer() {
    if (saving) return
    setSaving(true); setMsg(null)
    // On envoie TOUS les champs : l'upsert écrit une ligne complète et cohérente.
    const { error } = await supabase.from('plateforme_config').upsert({
      artisan_id: uid,
      mode_reponse: cfg.mode_reponse,
      modele: cfg.modele,
      auto_24_7: cfg.auto_24_7,
      auto_debut: cfg.auto_24_7 ? null : cfg.auto_debut,
      auto_fin: cfg.auto_24_7 ? null : cfg.auto_fin,
      devis_auto: cfg.devis_auto,
      devis_auto_seuil: cfg.devis_auto === 'seuil' ? cfg.devis_auto_seuil : null,
      facture_auto: cfg.facture_auto,
      ton: cfg.ton,
      escalade_mots: cfg.escalade_mots,
      limite_messages: Math.max(0, Math.min(40, Number(cfg.limite_messages) || 0)),
      nom_assistant: cfg.nom_assistant?.trim() || null,
      message_accueil: cfg.message_accueil?.trim() || null,
      maj_le: new Date().toISOString(),
    }, { onConflict: 'artisan_id' })
    setSaving(false)
    if (error) { setMsg({ type: 'err', text: 'Enregistrement impossible.' }); return }
    setMsg({ type: 'ok', text: 'Réglages enregistrés ✅' })
    setTimeout(() => setMsg(null), 2500)
  }

  async function copier() {
    try { await navigator.clipboard.writeText(`https://prestiapp.fr/p/${slug}`); setCopied(true); setTimeout(() => setCopied(false), 1800) } catch { /* ignore */ }
  }

  if (!ready) return <AppShell active="plateforme" title="Ma plateforme"><div className="tool-card"><p className="muted">Chargement…</p></div></AppShell>

  return (
    <AppShell active="plateforme" title="Ma plateforme" actions={<button className="btn btn--primary" style={{ width: 'auto' }} disabled={saving} onClick={enregistrer}>{saving ? '…' : 'Enregistrer'}</button>}>
      <div className="prof-grid">

        {/* Le lien à partager */}
        <div className="tool-card">
          <h2>Votre espace de conversation</h2>
          <p className="muted" style={{ margin: '0 0 .9rem' }}>C’est le lien que vos clients ouvrent pour vous écrire. Il porte votre marque, pas la nôtre.</p>
          {slug ? (
            <div className="site-publish-share">
              <div className="prof-link" style={{ margin: 0, flex: '1 1 240px' }}>
                <span>prestiapp.fr/p/{slug}</span>
                <button type="button" className="btn btn--ghost" style={{ width: 'auto' }} onClick={copier}>{copied ? 'Copié ✅' : 'Copier le lien'}</button>
              </div>
              <a className="btn btn--ghost" style={{ width: 'auto' }} href={`/p/${slug}`} target="_blank" rel="noopener">Ouvrir ↗</a>
            </div>
          ) : null}
          {!active ? <p className="muted" style={{ marginTop: '.8rem', fontSize: '.85rem' }}>⚠️ Votre plateforme est désactivée : le lien affiche un message poli. Réactivez-la depuis <a href="/profil" style={{ color: 'var(--accent-ink)' }}>Ma page</a>.</p> : null}
        </div>

        {/* Intelligence */}
        <div className="tool-card">
          <h2>Intelligence</h2>
          <p className="muted" style={{ margin: '0 0 1rem' }}>Comment votre assistant se comporte avec vos clients. Tout est appliqué côté serveur — ce que vous réglez ici fait foi.</p>

          <label className="pcfg-lab">Mode de réponse</label>
          <div className="pcfg-modes">
            {MODES.map((m) => (
              <button type="button" key={m.id} className={`pcfg-mode${cfg.mode_reponse === m.id ? ' on' : ''}`} onClick={() => set('mode_reponse', m.id)}>
                <b>{m.nom}</b><span>{m.desc}</span>
              </button>
            ))}
          </div>

          <label className="pcfg-lab">Modèle utilisé</label>
          <div className="pcfg-seg">
            {MODELES.map((m) => (
              <button type="button" key={m.id} className={cfg.modele === m.id ? 'on' : ''} onClick={() => set('modele', m.id)}>{m.nom}</button>
            ))}
            <button type="button" className={!cfg.modele ? 'on' : ''} onClick={() => set('modele', null)}>Selon ma formule</button>
          </div>

          <label className="pcfg-lab">Ton</label>
          <div className="pcfg-seg">
            {TONS.map((t) => <button type="button" key={t.id} className={cfg.ton === t.id ? 'on' : ''} onClick={() => set('ton', t.id)}>{t.nom}</button>)}
          </div>

          <label className="prof-toggle" style={{ marginTop: '1rem' }}>
            <input type="checkbox" checked={cfg.auto_24_7} onChange={(e) => set('auto_24_7', e.target.checked)} />
            <span>Répondre <b>{cfg.auto_24_7 ? '24h/24' : 'seulement sur une plage'}</b> {cfg.auto_24_7 ? '— l’assistant est disponible en permanence' : '— en dehors, vous répondez vous-même'}</span>
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

          <label className="pcfg-lab">Devis automatique</label>
          <div className="pcfg-seg">
            <button type="button" className={cfg.devis_auto === 'jamais' ? 'on' : ''} onClick={() => set('devis_auto', 'jamais')}>Jamais</button>
            <button type="button" className={cfg.devis_auto === 'brouillon' ? 'on' : ''} onClick={() => set('devis_auto', 'brouillon')}>Brouillon (vous validez)</button>
            <button type="button" className={cfg.devis_auto === 'seuil' ? 'on' : ''} onClick={() => set('devis_auto', 'seuil')}>Envoi auto sous un seuil</button>
          </div>
          {cfg.devis_auto === 'seuil' ? (
            <div className="pcfg-heures">
              <span>Envoyer seul si le total est inférieur à</span>
              <input type="number" min={0} step={50} value={cfg.devis_auto_seuil ?? 500} onChange={(e) => set('devis_auto_seuil', Number(e.target.value))} style={{ width: 110 }} />
              <span>€ TTC</span>
            </div>
          ) : null}

          <label className="pcfg-lab">Facture automatique</label>
          <div className="pcfg-seg">
            <button type="button" className={cfg.facture_auto === 'jamais' ? 'on' : ''} onClick={() => set('facture_auto', 'jamais')}>Jamais</button>
            <button type="button" className={cfg.facture_auto === 'acceptation' ? 'on' : ''} onClick={() => set('facture_auto', 'acceptation')}>À l’acceptation du devis</button>
          </div>

          <label className="pcfg-lab">Mots qui coupent l’assistant et vous alertent</label>
          <input
            value={(cfg.escalade_mots || []).join(', ')}
            onChange={(e) => set('escalade_mots', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
            placeholder="urgence, fuite, dégât des eaux…"
          />
          <p className="muted" style={{ margin: '.35rem 0 0', fontSize: '.8rem' }}>Si le client emploie l’un de ces mots, l’assistant se tait et vous recevez une alerte — c’est vous qui répondez.</p>

          <label className="pcfg-lab">Reprise humaine après</label>
          <div className="pcfg-heures">
            <input type="number" min={0} max={40} value={cfg.limite_messages} onChange={(e) => set('limite_messages', Number(e.target.value))} style={{ width: 90 }} />
            <span>réponses de l’assistant dans une même conversation</span>
          </div>
        </div>

        {/* Personnalisation de l'assistant */}
        <div className="tool-card">
          <h2>L’assistant</h2>
          <p className="muted" style={{ margin: '0 0 .9rem' }}>Votre client voit toujours qu’il parle à un assistant — c’est une obligation de loyauté, et ça vous protège.</p>
          <label>Nom affiché (facultatif)</label>
          <input value={cfg.nom_assistant ?? ''} onChange={(e) => set('nom_assistant', e.target.value)} placeholder="Ex : L’atelier" maxLength={40} />
          <label>Message d’accueil (facultatif)</label>
          <textarea rows={2} value={cfg.message_accueil ?? ''} onChange={(e) => set('message_accueil', e.target.value)} placeholder="Ex : Décrivez votre projet, je vous réponds tout de suite." maxLength={200} />
        </div>

        {msg && <div className={`msg ${msg.type === 'err' ? 'err' : ''}`}>{msg.text}</div>}
      </div>
    </AppShell>
  )
}
