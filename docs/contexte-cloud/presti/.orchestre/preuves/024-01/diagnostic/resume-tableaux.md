| Profil | Écran | CSS.supports view() (page / natif) | @supports du CSSOM | Mouvement réduit | Arrêts | Hauteur page | Animations (type/timeline : nombre distinct) |
|---|---|---|---|---|---|---|---|
| android | 412×839 dpr 2.625, tactile true | true / true | styles.css (animation-timeline: scroll()) → true ×3<br>styles.css (animation-timeline: view()) → true ×10<br>bureau.css (animation-timeline: view()) → true ×2 | false | 20 | 8422 px | CSSAnimation/DocumentTimeline : 2<br>CSSAnimation/ViewTimeline : 33<br>CSSAnimation/ScrollTimeline : 3 |
| iphone | 390×844 dpr 3, tactile true | false / true | styles.css (animation-timeline: non-supporte()) → false ×13<br>bureau.css (animation-timeline: non-supporte()) → false ×2 | false | 20 | 8341 px | CSSAnimation/DocumentTimeline : 2 |
| iphone-litteral | 390×844 dpr 3, tactile true | false / true | styles.css (animation-timeline: --non-supporte()) → true ×13<br>bureau.css (animation-timeline: --non-supporte()) → true ×2 | false | 20 | 8425 px | CSSAnimation/DocumentTimeline : 2<br>CSSAnimation/ViewTimeline : 33<br>CSSAnimation/ScrollTimeline : 3 |

#### heros
| Profil | Au temps (boucles) | Liées au défilement (y départ → y plein, pas de 40 px) | Transitions à l’arrêt | « vu » (y) | JS hors « vu » | Énergie hors défilement (max / moyenne, part > 8 max, arrêts) |
|---|---|---|---|---|---|---|
| android | signature-projecteur @ div.hero__media::before (9000 ms, infinite, running)<br>signature-tourne-2 @ img (10000 ms, infinite, running) | — | — | — | — | 3.621 / 3.233, 0.14511, 2 |
| iphone | signature-projecteur @ div.hero__media::before (9000 ms, infinite, running)<br>signature-tourne-2 @ img (10000 ms, infinite, running) | — | — | — | — | 4.083 / 3.413, 0.16283, 2 |
| iphone-litteral | signature-projecteur @ div.hero__media::before (9000 ms, infinite, running)<br>signature-tourne-2 @ img (10000 ms, infinite, running) | — | — | — | — | 4.017 / 3.413, 0.15604, 2 |

#### plateau
| Profil | Au temps (boucles) | Liées au défilement (y départ → y plein, pas de 40 px) | Transitions à l’arrêt | « vu » (y) | JS hors « vu » | Énergie hors défilement (max / moyenne, part > 8 max, arrêts) |
|---|---|---|---|---|---|---|
| android | — | telephone-mot (ViewTimeline) ×15 : 80 → 720 | 4 cibles : opacity, transform | figure.plateau__citation 160<br>div.chiffre 480<br>div.chiffre:2 560<br>div.chiffre:3 640<br>div.plateau__photo 800 | — | 0.001 / 0, 0, 3 |
| iphone | — | — | 5 cibles : opacity, transform | figure.plateau__citation 200<br>div.chiffre 520<br>div.chiffre:2 600<br>div.chiffre:3 680<br>div.plateau__photo 800 | — | 0.001 / 0, 0, 3 |
| iphone-litteral | — | telephone-mot (ViewTimeline) ×15 : 80 → 720 | 4 cibles : opacity, transform | figure.plateau__citation 160<br>div.chiffre 520<br>div.chiffre:2 600<br>div.chiffre:3 680<br>div.plateau__photo 800 | — | 0.001 / 0, 0, 3 |

#### prestations
| Profil | Au temps (boucles) | Liées au défilement (y départ → y plein, pas de 40 px) | Transitions à l’arrêt | « vu » (y) | JS hors « vu » | Énergie hors défilement (max / moyenne, part > 8 max, arrêts) |
|---|---|---|---|---|---|---|
| android | — | jauge (ScrollTimeline) ×1 : jamais → jamais plein | 1 cibles : opacity, transform | div.scene__tete.scene__tete--deux 1120<br>li.presta__ligne 1280<br>li.presta__ligne:2 1840 | — | 0 / 0, 0, 4 |
| iphone | — | — | 1 cibles : opacity, transform | div.scene__tete.scene__tete--deux 1120<br>li.presta__ligne 1360<br>li.presta__ligne:2 1840 | — | 0 / 0, 0, 4 |
| iphone-litteral | — | jauge (ScrollTimeline) ×1 : jamais → jamais plein | 1 cibles : opacity, transform | div.scene__tete.scene__tete--deux 1120<br>li.presta__ligne 1360<br>li.presta__ligne:2 1840 | — | 0 / 0, 0, 4 |

#### atelier
| Profil | Au temps (boucles) | Liées au défilement (y départ → y plein, pas de 40 px) | Transitions à l’arrêt | « vu » (y) | JS hors « vu » | Énergie hors défilement (max / moyenne, part > 8 max, arrêts) |
|---|---|---|---|---|---|---|
| android | — | telephone-verbe (ViewTimeline) ×4 : 2320 → 2600 | 2 cibles : opacity, transform | h2.atelier__titre 2120<br>p.atelier__phrase 2240 | — | 0 / 0, 0, 3 |
| iphone | — | — | 2 cibles : opacity, transform | h2.atelier__titre 2120<br>p.atelier__phrase 2240 | — | 0 / 0, 0, 3 |
| iphone-litteral | — | telephone-verbe (ViewTimeline) ×4 : 2360 → 2640 | 2 cibles : opacity, transform | h2.atelier__titre 2120<br>p.atelier__phrase 2280 | — | 0 / 0, 0, 3 |

#### realisations
| Profil | Au temps (boucles) | Liées au défilement (y départ → y plein, pas de 40 px) | Transitions à l’arrêt | « vu » (y) | JS hors « vu » | Énergie hors défilement (max / moyenne, part > 8 max, arrêts) |
|---|---|---|---|---|---|---|
| android | — | jauge (ScrollTimeline) ×1 : jamais → jamais plein | 4 cibles : opacity, transform, clip-path | div.scene__tete.galerie__tete 2920<br>figure.galerie__item.galerie__item--portrait 2960<br>figure.galerie__item 2960 | — | 0 / 0, 0, 3 |
| iphone | — | — | 4 cibles : opacity, transform, clip-path | div.scene__tete.galerie__tete 2920<br>figure.galerie__item.galerie__item--portrait 2960<br>figure.galerie__item 2960 | — | 0 / 0, 0, 3 |
| iphone-litteral | — | jauge (ScrollTimeline) ×1 : jamais → jamais plein | 4 cibles : opacity, transform, clip-path | div.scene__tete.galerie__tete 2960<br>figure.galerie__item.galerie__item--portrait 3000<br>figure.galerie__item 3000 | — | 0 / 0, 0, 3 |

#### communes
| Profil | Au temps (boucles) | Liées au défilement (y départ → y plein, pas de 40 px) | Transitions à l’arrêt | « vu » (y) | JS hors « vu » | Énergie hors défilement (max / moyenne, part > 8 max, arrêts) |
|---|---|---|---|---|---|---|
| android | — | — | 5 cibles : opacity, transform | div.scene__tete.scene__tete--deux 3800<br>a.commune 3920<br>a.commune:2 3960<br>a.commune:3 4000<br>a.commune:4 4080 | — | 0 / 0, 0, 2 |
| iphone | — | — | 5 cibles : opacity, transform | div.scene__tete.scene__tete--deux 3800<br>a.commune 3880<br>a.commune:2 3960<br>a.commune:3 4000<br>a.commune:4 4040 | — | 0 / 0, 0, 2 |
| iphone-litteral | — | — | 5 cibles : opacity, transform | div.scene__tete.scene__tete--deux 3840<br>a.commune 3960<br>a.commune:2 4000<br>a.commune:3 4040<br>a.commune:4 4120 | — | 0 / 0, 0, 2 |

#### etapes
| Profil | Au temps (boucles) | Liées au défilement (y départ → y plein, pas de 40 px) | Transitions à l’arrêt | « vu » (y) | JS hors « vu » | Énergie hors défilement (max / moyenne, part > 8 max, arrêts) |
|---|---|---|---|---|---|---|
| android | — | jauge (ScrollTimeline) ×1 : jamais → jamais plein<br>telephone-apparait (ViewTimeline) ×9 : 4200 → 4640<br>telephone-eclate (ViewTimeline) ×4 : 4200 → 4600<br>telephone-efface (ViewTimeline) ×1 : 4200 → 4200 | 2 cibles : opacity, transform | div.etapes__tete 4280<br>li.etape 4760<br>li.etape:2 4840 | ol.etapes__liste [style] ×2 | 0 / 0, 0, 3 |
| iphone | — | — | 2 cibles : opacity, transform | div.etapes__tete 4280<br>li.etape 4720<br>li.etape:2 4800 | ol.etapes__liste [style] ×2 | 0 / 0, 0, 3 |
| iphone-litteral | — | jauge (ScrollTimeline) ×1 : jamais → jamais plein<br>telephone-apparait (ViewTimeline) ×9 : 4240 → 4680<br>telephone-eclate (ViewTimeline) ×4 : 4240 → 4640<br>telephone-efface (ViewTimeline) ×1 : 4240 → 4240 | 2 cibles : opacity, transform | div.etapes__tete 4320<br>li.etape 4760<br>li.etape:2 4880 | ol.etapes__liste [style] ×2 | 0 / 0, 0, 4 |

#### questions
| Profil | Au temps (boucles) | Liées au défilement (y départ → y plein, pas de 40 px) | Transitions à l’arrêt | « vu » (y) | JS hors « vu » | Énergie hors défilement (max / moyenne, part > 8 max, arrêts) |
|---|---|---|---|---|---|---|
| android | — | — | 3 cibles : opacity, transform | div.faq-scene__tete 5400<br>p.faq-scene__intro 5440<br>div.faq 5560 | — | 0 / 0, 0, 4 |
| iphone | — | — | 3 cibles : opacity, transform | div.faq-scene__tete 5320<br>p.faq-scene__intro 5360<br>div.faq 5480 | — | 0 / 0, 0, 4 |
| iphone-litteral | — | — | 3 cibles : opacity, transform | div.faq-scene__tete 5400<br>p.faq-scene__intro 5440<br>div.faq 5560 | — | 0 / 0, 0, 4 |

#### contact
| Profil | Au temps (boucles) | Liées au défilement (y départ → y plein, pas de 40 px) | Transitions à l’arrêt | « vu » (y) | JS hors « vu » | Énergie hors défilement (max / moyenne, part > 8 max, arrêts) |
|---|---|---|---|---|---|---|
| android | — | — | 1 cibles : opacity, transform | div.contact__tete 6040 | — | 0 / 0, 0, 4 |
| iphone | — | — | 1 cibles : opacity, transform | div.contact__tete 5960 | — | 0 / 0, 0, 5 |
| iphone-litteral | — | — | 1 cibles : opacity, transform | div.contact__tete 6040 | — | 0 / 0, 0, 4 |

#### pied
| Profil | Au temps (boucles) | Liées au défilement (y départ → y plein, pas de 40 px) | Transitions à l’arrêt | « vu » (y) | JS hors « vu » | Énergie hors défilement (max / moyenne, part > 8 max, arrêts) |
|---|---|---|---|---|---|---|
| android | — | — | — | — | — | 0 / 0, 0, 1 |
| iphone | — | — | — | — | — | 0 / 0, 0, 1 |
| iphone-litteral | — | — | — | — | — | 0 / 0, 0, 1 |

#### nav
| Profil | Au temps (boucles) | Liées au défilement (y départ → y plein, pas de 40 px) | Transitions à l’arrêt | « vu » (y) | JS hors « vu » | Énergie hors défilement (max / moyenne, part > 8 max, arrêts) |
|---|---|---|---|---|---|---|
| android | — | — | 7 cibles : color, opacity, background-color | — | header.nav.nav--claire [class] ×13<br>header.nav.nav--claire [style] ×33 | — |
| iphone | — | — | 7 cibles : color, opacity, background-color | — | header.nav.nav--claire [style] ×36<br>header.nav.nav--claire [class] ×10 | — |
| iphone-litteral | — | — | 7 cibles : color, opacity, background-color | — | header.nav.nav--claire [class] ×11<br>header.nav.nav--claire [style] ×35 | — |

#### Rails horizontaux (un geste de 85 % de largeur)
| Profil | Rail | Défilable | Jauge affichée | Jauge avant → après (transform) | Animation de la jauge (progression après) |
|---|---|---|---|---|---|
| android | prestations | true (2122/412 px, décalé de 350) | true | matrix(0.17, 0, 0, 1, 0, 0) → matrix(0.339883, 0, 0, 1, 0, 0) | jauge ScrollTimeline 0.205 |
| android | realisations | true (1491/412 px, décalé de 367) | true | matrix(0.17, 0, 0, 1, 0, 0) → matrix(0.452308, 0, 0, 1, 0, 0) | jauge ScrollTimeline 0.34 |
| android | etapes | true (1343/412 px, décalé de 330) | true | matrix(0.17, 0, 0, 1, 0, 0) → matrix(0.4642, 0, 0, 1, 0, 0) | jauge ScrollTimeline 0.354 |
| iphone | prestations | true (2009/390 px, décalé de 332) | false | none → none | aucune |
| iphone | realisations | true (1412/390 px, décalé de 347) | false | none → none | aucune |
| iphone | etapes | true (1271/390 px, décalé de 312) | false | none → none | aucune |
| iphone-litteral | prestations | true (2009/390 px, décalé de 332) | true | matrix(0.17, 0, 0, 1, 0, 0) → matrix(0.340204, 0, 0, 1, 0, 0) | jauge ScrollTimeline 0.205 |
| iphone-litteral | realisations | true (1412/390 px, décalé de 347) | true | matrix(0.17, 0, 0, 1, 0, 0) → matrix(0.45181, 0, 0, 1, 0, 0) | jauge ScrollTimeline 0.34 |
| iphone-litteral | etapes | true (1271/390 px, décalé de 312) | true | matrix(0.17, 0, 0, 1, 0, 0) → matrix(0.463939, 0, 0, 1, 0, 0) | jauge ScrollTimeline 0.354 |

#### Films
| Profil | Fichiers | Images rAF | Durée mesurée | Images/s rAF | Pas médian | Intervalle médian / p95 | y début → fin |
|---|---|---|---|---|---|---|---|
| android | film-haut.webm, film-haut.mp4 | 873 | 15023.4 ms | 58.1 | 8 px | 16.699999999999818 / 16.800000000000182 ms | 4 → 7200 |
| iphone | film-haut.webm, film-haut.mp4 | 897 | 15005.8 ms | 59.8 | 8 px | 16.699999999999818 / 16.700000000000728 ms | 3 → 7200 |
