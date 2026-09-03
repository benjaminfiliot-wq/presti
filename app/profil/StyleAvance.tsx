'use client'

import { useState } from 'react'
import { COUPLES, PRESETS_METIER, STYLE_DEFAUT, type SiteStyle } from '@/lib/siteStyle'
import { contrastRatio } from '@/lib/contrast'
import Info from '@/app/Info'

// Mode avancé du site vitrine (v4 §7/E1) — replié par défaut : le thème reste l'entrée simple.
// Règle de vocabulaire : aucun jargon. Pas de « letter-spacing », pas de « border-radius ».
// L'artisan lit « Espacement des titres » et « Angles », et voit le résultat tout de suite.

type Props = {
  valeur: SiteStyle
  onChange: (s: SiteStyle) => void
  metier: string | null
  accent: string
  onPreset: (theme: string, accent: string) => void
}

const ECHELLES: { id: SiteStyle['echelle']; nom: string }[] = [
  { id: 'compacte', nom: 'Compacte' }, { id: 'normale', nom: 'Normale' }, { id: 'ample', nom: 'Ample' },
]
const RYTHMES: { id: SiteStyle['rythme']; nom: string }[] = [
  { id: 'serre', nom: 'Serré' }, { id: 'normal', nom: 'Normal' }, { id: 'aere', nom: 'Aéré' },
]
const BOUTONS: { id: SiteStyle['bouton']; nom: string }[] = [
  { id: 'plein', nom: 'Plein' }, { id: 'contour', nom: 'Contour' }, { id: 'souligne', nom: 'Souligné' },
]
const TEXTURES: { id: SiteStyle['texture']; nom: string }[] = [
  { id: 'aucune', nom: 'Aucune' }, { id: 'grain', nom: 'Grain photo' }, { id: 'papier', nom: 'Papier' }, { id: 'bruit', nom: 'Bruit fin' },
]
const MOTIONS: { id: SiteStyle['motion']; nom: string; desc: string }[] = [
  { id: 'aucune', nom: 'Aucune', desc: 'Tout s’affiche immédiatement' },
  { id: 'sobre', nom: 'Sobre', desc: 'Apparitions douces au défilement' },
  { id: 'cinematique', nom: 'Cinématique', desc: 'Mouvements plus amples et plus lents' },
]

function Pastilles<T extends string>({ options, valeur, onPick }: { options: { id: T; nom: string }[]; valeur: T; onPick: (v: T) => void }) {
  return (
    <div className="sa-pills">
      {options.map((o) => (
        <button key={o.id} type="button" className={`sa-pill${valeur === o.id ? ' on' : ''}`} onClick={() => onPick(o.id)}>{o.nom}</button>
      ))}
    </div>
  )
}

export default function StyleAvance({ valeur, onChange, metier, accent, onPreset }: Props) {
  const [ouvert, setOuvert] = useState(false)
  const set = (patch: Partial<SiteStyle>) => onChange({ ...valeur, ...patch })

  // Garde-fou de lisibilité : on ne laisse pas l'artisan choisir un fond sur lequel
  // son propre texte devient illisible sans le lui dire.
  const fond = valeur.fond || '#F5EFE4'
  const ratio = contrastRatio(fond, '#1B1712')
  const niveau = ratio >= 7 ? 'AAA' : ratio >= 4.5 ? 'AA' : ratio >= 3 ? 'limite' : 'insuffisant'

  // Le métier de l'artisan d'abord : c'est son preset qui doit être proposé en premier.
  const presets = [...PRESETS_METIER].sort((a, b) =>
    (b.id === (metier || '').toLowerCase() ? 1 : 0) - (a.id === (metier || '').toLowerCase() ? 1 : 0))

  return (
    <div className="tool-card">
      <div className="sa-head">
        <div>
          <h2 style={{ margin: 0 }}>Réglages fins</h2>
          <p className="muted" style={{ margin: '.3rem 0 0' }}>
            Pour aller plus loin que l’ambiance : polices, formes, espacements. Tout est facultatif — sans y toucher, votre site ne change pas.
          </p>
        </div>
        <button type="button" className="sa-toggle" onClick={() => setOuvert((v) => !v)} aria-expanded={ouvert}>
          {ouvert ? 'Replier' : 'Ouvrir'}
        </button>
      </div>

      {!ouvert ? null : (
        <div className="sa-body">
          {/* ── Départ rapide : un métier, un style complet. */}
          <section className="sa-sec">
            <h3>Partir d’un style tout fait</h3>
            <p className="muted">Un clic applique une combinaison complète (ambiance, couleur, polices, formes). Vous ajustez ensuite ce que vous voulez.</p>
            <div className="sa-presets">
              {presets.map((p) => (
                <button key={p.id} type="button" className="sa-preset" onClick={() => { onPreset(p.theme, p.accent); set({ ...STYLE_DEFAUT, ...p.style }) }}>
                  <span className="sa-preset-sw" style={{ background: p.accent }} />
                  <b>{p.nom}</b>
                  {p.id === (metier || '').toLowerCase() ? <em>votre métier</em> : null}
                </button>
              ))}
            </div>
          </section>

          {/* ── Typographie */}
          <section className="sa-sec">
            <h3>Polices</h3>
            <div className="sa-couples">
              {COUPLES.map((c) => (
                <button key={c.id} type="button" className={`sa-couple${valeur.couple === c.id ? ' on' : ''}`} onClick={() => set({ couple: c.id })}>
                  <span className="sa-couple-a" style={{ fontFamily: c.display }}>Aa</span>
                  <span className="sa-couple-t"><b>{c.nom}</b><small>{c.pour}</small></span>
                </button>
              ))}
            </div>
            <div className="sa-row">
              <label>Taille du texte <Info cle="profil.style.taille" /></label>
              <input type="range" min={15} max={19} step={1} value={valeur.taille} onChange={(e) => set({ taille: Number(e.target.value) })} />
              <span className="sa-val">{valeur.taille} px</span>
            </div>
            <div className="sa-row">
              <label>Taille des titres <Info cle="profil.style.echelle" /></label>
              <Pastilles options={ECHELLES} valeur={valeur.echelle} onPick={(echelle) => set({ echelle })} />
            </div>
            <div className="sa-row">
              <label>Espacement des lettres, dans les titres <Info cle="profil.style.interlettrage" /></label>
              <input type="range" min={-4} max={2} step={1} value={Math.round(valeur.interlettrage * 100)} onChange={(e) => set({ interlettrage: Number(e.target.value) / 100 })} />
              <span className="sa-val">{valeur.interlettrage === 0 ? 'normal' : valeur.interlettrage < 0 ? 'resserré' : 'aéré'}</span>
            </div>
          </section>

          {/* ── Couleurs */}
          <section className="sa-sec">
            <h3>Couleurs</h3>
            <div className="sa-row">
              <label>Couleur secondaire <Info cle="profil.style.accent2" /></label>
              <label className="sa-color" style={{ background: valeur.accent2 || accent }}>
                <input type="color" value={valeur.accent2 || accent} onChange={(e) => set({ accent2: e.target.value })} />
              </label>
              {valeur.accent2 ? <button type="button" className="sa-reset" onClick={() => set({ accent2: null })}>Revenir à l’automatique</button> : <span className="muted sa-val">dérivée de votre accent</span>}
            </div>
            <div className="sa-row">
              <label>Fond de page <Info cle="profil.style.fond" /></label>
              <label className="sa-color" style={{ background: fond }}>
                <input type="color" value={fond} onChange={(e) => set({ fond: e.target.value })} />
              </label>
              {valeur.fond ? <button type="button" className="sa-reset" onClick={() => set({ fond: null })}>Revenir à celui de l’ambiance</button> : <span className="muted sa-val">celui de l’ambiance</span>}
            </div>
            <p className={`sa-contrast ${niveau === 'insuffisant' ? 'ko' : niveau === 'limite' ? 'warn' : 'ok'}`}>
              {niveau === 'insuffisant'
                ? `Lisibilité insuffisante (${ratio.toFixed(1)}:1). Sur ce fond, votre texte sera difficile à lire — choisissez un fond plus clair ou plus foncé.`
                : niveau === 'limite'
                  ? `Lisibilité limite (${ratio.toFixed(1)}:1). Convient aux grands titres, pas aux paragraphes.`
                  : `Lisibilité ${niveau} (${ratio.toFixed(1)}:1) — le texte reste confortable à lire.`}
            </p>
          </section>

          {/* ── Formes */}
          <section className="sa-sec">
            <h3>Formes</h3>
            <div className="sa-row">
              <label>Angles <Info cle="profil.style.rayon" /></label>
              <input type="range" min={0} max={24} step={2} value={valeur.rayon} onChange={(e) => set({ rayon: Number(e.target.value) })} />
              <span className="sa-val">{valeur.rayon === 0 ? 'carrés' : valeur.rayon >= 20 ? 'très arrondis' : `${valeur.rayon} px`}</span>
            </div>
            <div className="sa-row">
              <label>Épaisseur des traits <Info cle="profil.style.filet" /></label>
              <input type="range" min={1} max={3} step={1} value={valeur.filet} onChange={(e) => set({ filet: Number(e.target.value) })} />
              <span className="sa-val">{valeur.filet === 1 ? 'fins' : valeur.filet === 2 ? 'marqués' : 'épais'}</span>
            </div>
            <div className="sa-row">
              <label>Boutons <Info cle="profil.style.bouton" /></label>
              <Pastilles options={BOUTONS} valeur={valeur.bouton} onPick={(bouton) => set({ bouton })} />
            </div>
          </section>

          {/* ── Rythme */}
          <section className="sa-sec">
            <h3>Rythme</h3>
            <div className="sa-row">
              <label>Hauteur des sections <Info cle="profil.style.rythme" /></label>
              <Pastilles options={RYTHMES} valeur={valeur.rythme} onPick={(rythme) => set({ rythme })} />
            </div>
            <div className="sa-row">
              <label>Largeur du contenu <Info cle="profil.style.largeur" /></label>
              <input type="range" min={900} max={1400} step={20} value={valeur.largeur} onChange={(e) => set({ largeur: Number(e.target.value) })} />
              <span className="sa-val">{valeur.largeur <= 1000 ? 'étroite' : valeur.largeur >= 1300 ? 'très large' : `${valeur.largeur} px`}</span>
            </div>
          </section>

          {/* ── Matière et mouvement */}
          <section className="sa-sec">
            <h3>Matière</h3>
            <div className="sa-row">
              <label>Texture de fond <Info cle="profil.style.texture" /></label>
              <Pastilles options={TEXTURES} valeur={valeur.texture} onPick={(texture) => set({ texture })} />
            </div>
            {valeur.texture !== 'aucune' ? (
              <div className="sa-row">
                <label>Intensité <Info cle="profil.style.texture_force" /></label>
                <input type="range" min={0} max={100} step={5} value={valeur.texture_force} onChange={(e) => set({ texture_force: Number(e.target.value) })} />
                <span className="sa-val">{valeur.texture_force} %</span>
              </div>
            ) : null}
          </section>

          <section className="sa-sec">
            <h3>Mouvement</h3>
            <div className="sa-motions">
              {MOTIONS.map((m) => (
                <button key={m.id} type="button" className={`sa-motion${valeur.motion === m.id ? ' on' : ''}`} onClick={() => set({ motion: m.id })}>
                  <b>{m.nom}</b><small>{m.desc}</small>
                </button>
              ))}
            </div>
            <p className="muted sa-note">
              Quel que soit ce réglage, les visiteurs qui ont demandé à leur appareil de limiter les animations n’en verront aucune.
            </p>
          </section>

          <button type="button" className="sa-reset-all" onClick={() => onChange({ ...STYLE_DEFAUT })}>
            Tout remettre par défaut
          </button>
        </div>
      )}
    </div>
  )
}
