'use client'

// L'accueil « Aujourd'hui » de la console v2 (refonte 18/10, étape 5.2 ; ARCHITECTURE.md §2.3).
// Tout vient de GET /api/aujourdhui (vraies pièces du compte, même calcul que Mes chiffres, verrou d'offre côté serveur).
// Ordre : bonjour → les 3 actions du jour → chiffres du mois + fil d'activité → « Découvrir » (slides, aube) → votre lien.
// Une lecture ratée ne s'affiche jamais en zéros : message + « Réessayer ». Pendant le chargement : des squelettes.
import '@/components/ui/ui.css'
import './aujourdhui.css'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { PLANS, type PlanPayant } from '@/lib/plans'
import { urlPlateforme } from '@/lib/urls'
import AppShell from '@/app/AppShell'
import { Carte, EtatVide, PastilleOffre, Squelette, TuileChiffre } from '@/components/ui/base'
import Carrousel from '@/components/ui/Carrousel'
import { toast } from '@/components/ui/Toasts'
import { Icone } from '@/components/ui/icones'

type Donnees = {
  maintenant: string
  artisan: { nom: string | null; metier: string | null; plan: string | null; slug: string | null; domaine: string | null; domaine_verifie: boolean | null }
  actions: {
    repondre: { total: number; liste: { id: string; nom: string }[] } | null
    relancer: { total: number; seuilJours: number; liste: { id: string; numero: string | null; client: string | null; montant: number; jours: number }[] }
    retard: { total: number; liste: { id: string; numero: string | null; client: string | null; jours: number; montant: number }[] }
  }
  chiffres: null | { moisLibelle: string; moisPrecedentLibelle: string; caMois: number; variationMois: number | null; enAttente: number; nbEnAttente: number; enRetard: number; nbEnRetard: number; tauxAcceptation: number | null; devisEnvoyes: number; mois: { libelle: string; ca: number }[] }
  verrouChiffres: PlanPayant | null
  fil: { quand: string; type: string; titre: string; detail: string; href: string }[]
  decouvrir: { id: string; inclus: boolean; offre: PlanPayant | null }[]
}

// Les textes de « Découvrir » : chacun reprend une promesse déjà publiée (landing, comparatif, FAQ) — rien de neuf ici.
const DECOUVRIR: Record<string, { titre: string; texte: string; href: string; bouton: string; visuel: string[] }> = {
  relances: { titre: 'Les impayés se relancent seuls', texte: 'Une case à cocher : jusqu’à trois relances par e-mail après l’échéance (J+3, J+10, J+21 par défaut), dans un texte que vous avez relu. Elles s’arrêtent dès que la facture est payée ou annulée, ou que le client répond.', href: '/factures', bouton: 'Régler les relances', visuel: ['J+3', 'J+10', 'J+21'] },
  plateforme: { titre: 'Votre lien de contact', texte: 'Sur votre fiche Google, votre page Facebook ou votre signature mail : chaque demande faite par ce lien arrive dans Presti, et la réponse est prête en moins d’une minute, dans votre ton. Vous l’envoyez.', href: '/plateforme', bouton: 'Ouvrir Ma plateforme', visuel: ['Demande', 'Réponse prête', 'Envoyée'] },
  assistant: { titre: 'L’assistant de gestion', texte: 'Une phrase suffit : il prépare le devis ou la facture, relance un impayé, met à jour le stock, les tarifs ou le CRM. Tout ce qui part chez un client attend votre confirmation.', href: '/assistant', bouton: 'Essayer l’assistant', visuel: ['« Fais le devis… »', 'Brouillon', 'Vous confirmez'] },
  crm: { titre: 'Vos chantiers sur une carte', texte: 'Les demandes, les chantiers, l’équipe et les véhicules au même endroit, et la carte Atelier qui se met à jour seule : retards, livraisons, stock bas.', href: '/crm', bouton: 'Ouvrir le CRM', visuel: ['À planifier', 'En cours', 'Terminé'] },
  inventaire: { titre: 'Votre stock, par lieu', texte: 'Vos matériaux à l’atelier et dans le camion, avec un seuil pour chacun et le scan, au même endroit que vos devis.', href: '/inventaire', bouton: 'Ouvrir l’inventaire', visuel: ['Atelier', 'Camion', 'Seuil'] },
}

const jetonSession = async () => (await supabase.auth.getSession()).data.session?.access_token ?? null
const eur = (n: number) => `${n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`
const pluriel = (n: number, un: string, plusieurs: string) => (n > 1 ? plusieurs : un)
const heure = (iso: string, maintenant: Date) => {
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)
  if (Number.isNaN(d.getTime())) return ''
  const memeJour = d.toDateString() === maintenant.toDateString()
  if (memeJour && iso.length > 10) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const hier = new Date(maintenant); hier.setDate(hier.getDate() - 1)
  if (d.toDateString() === hier.toDateString()) return 'hier'
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

export default function Aujourdhui() {
  const router = useRouter()
  const [d, setD] = useState<Donnees | null>(null)
  const [erreur, setErreur] = useState('')

  const charger = useCallback(async () => {
    setErreur('')
    const jeton = await jetonSession()
    if (!jeton) { router.replace('/login'); return }
    const r = await fetch('/api/aujourdhui', { headers: { Authorization: `Bearer ${jeton}` }, cache: 'no-store' }).catch(() => null)
    const j = r ? await r.json().catch(() => null) : null
    if (!r?.ok || !j || !j.actions) { setErreur((j && j.error) || 'Votre journée n’a pas pu être chargée. Vérifiez votre connexion, puis réessayez.'); return }
    setD(j as Donnees)
  }, [router])
  useEffect(() => { void charger() }, [charger])

  const maintenant = d ? new Date(d.maintenant) : new Date()
  const date = maintenant.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
  const titreDate = date.charAt(0).toUpperCase() + date.slice(1)

  return (
    <AppShell active="dashboard" title="Aujourd’hui" crumb={titreDate} wide
      actions={<a className="ui-btn ui-btn--p" href="/devis/nouveau"><Icone nom="ajouter" /><span className="aj-lib-btn">Nouveau devis</span></a>}>
      {erreur ? (
        <div className="msg err aj-erreur" role="alert"><span>{erreur}</span><button type="button" className="ui-btn ui-btn--s" onClick={() => { setD(null); void charger() }}>Réessayer</button></div>
      ) : !d ? (
        <div className="aj" aria-busy="true">
          <Squelette lignes={2} etiquette="Chargement de votre journée…" />
          <div className="aj-prio">{[0, 1, 2].map((k) => <div key={k} className="ui-carte"><Squelette lignes={3} /></div>)}</div>
          <div className="aj-grille"><div className="ui-carte"><Squelette variante="chiffres" lignes={4} /></div><div className="ui-carte"><Squelette variante="tableau" lignes={4} /></div></div>
        </div>
      ) : <Contenu d={d} maintenant={maintenant} />}
    </AppShell>
  )
}

function Contenu({ d, maintenant }: { d: Donnees; maintenant: Date }) {
  const a = d.actions
  const nbActions = (a.repondre && a.repondre.total > 0 ? 1 : 0) + (a.relancer.total > 0 ? 1 : 0) + (a.retard.total > 0 ? 1 : 0)
  const nom = d.artisan.nom?.trim() || ''
  const lien = d.artisan.slug ? urlPlateforme({ slug: d.artisan.slug, domaine: d.artisan.domaine, domaine_verifie: d.artisan.domaine_verifie }) : null
  const c = d.chiffres

  return (
    <div className="aj">
      <section className="aj-bonjour" aria-labelledby="aj-bonjour-t">
        <h2 id="aj-bonjour-t">{nom ? `Bonjour, ${nom}` : 'Bonjour'}</h2>
        <p>{nbActions === 0 ? 'Rien d’urgent aujourd’hui.' : `${nbActions} ${pluriel(nbActions, 'chose', 'choses')} à faire aujourd’hui.`}</p>
      </section>

      <section className="aj-prio" aria-label="À faire aujourd’hui">
        {a.repondre ? (
          <a className={`aj-action aj-a-demande${a.repondre.total ? '' : ' calme'}`} href="/messages">
            <span className="aj-n ui-mono">{a.repondre.total}</span>
            <span className="aj-t">{a.repondre.total === 0 ? 'Aucune demande en attente' : `${pluriel(a.repondre.total, 'demande', 'demandes')} à répondre`}</span>
            <span className="aj-s">{a.repondre.liste.length ? a.repondre.liste.map((x) => x.nom).join(', ') : 'Les nouvelles demandes arrivent ici, avec leur réponse prête.'}</span>
            <span className="aj-go">{a.repondre.total ? 'Relire et envoyer' : 'Voir les messages'}<Icone nom="fleche" /></span>
          </a>
        ) : (
          <div className="aj-action calme">
            <span className="aj-t">Les demandes de vos clients</span>
            <span className="aj-s">La plateforme (votre lien, la réponse prête en moins d’une minute) commence avec Studio.</span>
            <PastilleOffre plan={d.artisan.plan} capacite="plateforme.conversation" />
          </div>
        )}
        <a className={`aj-action aj-a-relance${a.relancer.total ? '' : ' calme'}`} href={a.relancer.liste[0] ? `/devis/${a.relancer.liste[0].id}` : '/devis'}>
          <span className="aj-n ui-mono">{a.relancer.total}</span>
          <span className="aj-t">{a.relancer.total === 0 ? 'Aucun devis à relancer' : `${pluriel(a.relancer.total, 'devis', 'devis')} à relancer`}</span>
          <span className="aj-s">{a.relancer.liste.length ? a.relancer.liste.map((x) => `${x.numero ?? 'Devis'} · ${x.jours} j`).join(' · ') : `Un devis sans réponse depuis plus de ${a.relancer.seuilJours} jours apparaîtra ici.`}</span>
          <span className="aj-go">{a.relancer.total ? 'Relancer' : 'Voir les devis'}<Icone nom="fleche" /></span>
        </a>
        <a className={`aj-action aj-a-retard${a.retard.total ? '' : ' calme'}`} href="/factures">
          <span className="aj-n ui-mono">{a.retard.total}</span>
          <span className="aj-t">{a.retard.total === 0 ? 'Aucune facture en retard' : `${pluriel(a.retard.total, 'facture', 'factures')} en retard`}</span>
          <span className="aj-s">{a.retard.liste.length ? a.retard.liste.map((x) => `${x.numero ?? 'Facture'} · ${x.jours} j`).join(' · ') : 'Une facture dont l’échéance est passée apparaîtra ici.'}</span>
          <span className="aj-go">Voir les factures<Icone nom="fleche" /></span>
        </a>
      </section>

      <div className="aj-grille">
        {c ? (
          <Carte titre={c.moisLibelle.charAt(0).toUpperCase() + c.moisLibelle.slice(1)} action={{ href: '/chiffres', libelle: 'Mes chiffres' }} className="aj-chiffres">
            <div className="ui-tuiles">
              <TuileChiffre libelle="Facturé ce mois" valeur={c.caMois} format="euros" ton={c.variationMois !== null && c.variationMois >= 0 ? 'ok' : undefined}
                sous={c.variationMois === null ? `vs ${c.moisPrecedentLibelle} : —` : `${c.variationMois >= 0 ? '+' : ''}${c.variationMois} % vs ${c.moisPrecedentLibelle}`} />
              <TuileChiffre libelle="En attente" valeur={c.enAttente} format="euros" sous={`${c.nbEnAttente} ${pluriel(c.nbEnAttente, 'facture', 'factures')}`} />
              <TuileChiffre libelle="En retard" valeur={c.enRetard} format="euros" ton={c.nbEnRetard > 0 ? 'crit' : undefined} sous={c.nbEnRetard ? `${c.nbEnRetard} ${pluriel(c.nbEnRetard, 'facture', 'factures')}` : 'aucune'} />
              <TuileChiffre libelle="Devis acceptés" valeur={c.tauxAcceptation} format="pourcent" sous={c.devisEnvoyes ? `sur ${c.devisEnvoyes} envoyés` : 'aucun devis envoyé'} />
            </div>
            <Barres mois={c.mois} />
          </Carte>
        ) : (
          <Carte titre="Vos chiffres du mois" className="aj-chiffres">
            <EtatVide icone="chiffres" titre="Facturé, encaissé, en retard : sans tableur" texte="Mes chiffres calcule tout à partir de vos devis et de vos factures." />
            {d.verrouChiffres ? <p className="aj-verrou"><PastilleOffre plan={d.artisan.plan} capacite="chiffres" /> <a href="/abonnement">Voir les offres</a></p> : null}
          </Carte>
        )}
        <Carte titre="Fil d’activité" className="aj-fil">
          {d.fil.length === 0 ? (
            <EtatVide icone="jour" titre="Rien pour l’instant" texte="Vos demandes, devis et factures s’afficheront ici au fil de la journée." action={{ href: '/devis/nouveau', libelle: 'Faire un premier devis' }} />
          ) : (
            <ol className="aj-fil-liste">
              {d.fil.map((e, k) => (
                <li key={`${e.type}-${k}`}>
                  <time className="ui-mono" dateTime={e.quand}>{heure(e.quand, maintenant)}</time>
                  <a href={e.href}><b>{e.titre}</b>{e.detail ? <span> · {e.detail}</span> : null}</a>
                </li>
              ))}
            </ol>
          )}
        </Carte>
      </div>

      {d.decouvrir.length ? (
        <Carte titre="Découvrir" className="aj-decouvrir" etiquette="Découvrir ce que vous n’utilisez pas encore">
          <Carrousel etiquette="Fonctionnalités à découvrir" diapos={d.decouvrir.filter((x) => DECOUVRIR[x.id]).map((x) => {
            const t = DECOUVRIR[x.id]
            return {
              id: x.id, titre: t.titre,
              contenu: (
                <div className="aj-diapo">
                  <div className="aj-diapo-texte">
                    {x.inclus ? <span className="ui-offre ui-offre--inclus"><Icone nom="ok" />Inclus dans votre offre</span> : x.offre ? <span className="ui-offre"><Icone nom="cadenas" />Disponible avec {PLANS[x.offre].label}</span> : null}
                    <h3>{t.titre}</h3>
                    <p>{t.texte}</p>
                    <a className="ui-btn ui-btn--s" href={x.inclus ? t.href : '/abonnement'}>{x.inclus ? t.bouton : `Voir l’offre ${x.offre ? PLANS[x.offre].label : ''}`}</a>
                  </div>
                  <div className="aj-diapo-visuel" aria-hidden="true">
                    {t.visuel.map((v, k) => <span key={v} className={k === 0 ? 'on' : ''}>{v}</span>)}
                  </div>
                </div>
              ),
            }
          })} />
        </Carte>
      ) : null}

      {lien ? (
        <Carte titre="Votre lien de contact" niveau={2} className="aj-lien">
          <div className="aj-lien-rang">
            <code className="ui-mono">{lien}</code>
            <button type="button" className="ui-btn ui-btn--s ui-btn--xs" onClick={() => { void navigator.clipboard?.writeText(lien); toast('Lien copié') }}>Copier</button>
          </div>
          <p className="aj-lien-aide">À mettre sur votre fiche Google, votre page Facebook ou votre signature mail (pas dans une annonce Le Bon Coin : ses règles interdisent les liens vers un autre site).</p>
        </Carte>
      ) : null}
    </div>
  )
}

/** Six mois de chiffre d'affaires (même série que Mes chiffres), en barres ; le mois en cours en corail. */
function Barres({ mois }: { mois: { libelle: string; ca: number }[] }) {
  if (!mois.length) return null
  const max = Math.max(1, ...mois.map((m) => m.ca))
  return (
    <figure className="aj-barres">
      <figcaption className="ui-sr">Facturé par mois : {mois.map((m) => `${m.libelle} ${eur(m.ca)}`).join(', ')}</figcaption>
      <div className="aj-barres-zone" aria-hidden="true">
        {mois.map((m, k) => (
          <div key={m.libelle} className={`aj-barre${k === mois.length - 1 ? ' on' : ''}`}>
            <span style={{ height: `${Math.max(2, (m.ca / max) * 100)}%` }} title={`${m.libelle} : ${eur(m.ca)}`} />
            <small>{m.libelle}</small>
          </div>
        ))}
      </div>
    </figure>
  )
}

