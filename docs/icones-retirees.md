# Icônes et illustrations retirées (mémoire)

Toutes les icônes `lucide-react`, les SVG dessinés à la main et les
illustrations ont été retirés de l'interface (demande de la propriétaire :
le site ne doit pas sembler « fait par une IA »). Ce fichier garde la
trace de chaque emplacement pour pouvoir remettre **de vraies icônes**
plus tard — c'est-à-dire `lucide-react` (seule source autorisée par le
CDC) ou des fichiers de marque officiels dans `public/images/`.

Règle de remise en place : `import { Nom } from "lucide-react"` avec le
nom exact d'une icône existante ; jamais de `<path>` écrit à la main,
jamais d'emoji.

## Boutique — en-tête (`src/app/(boutique)/layout.tsx`)

| Emplacement | Remplacement actuel | Icône lucide d'origine |
| --- | --- | --- |
| Bouton recherche (desktop + mobile) | texte « Recherche » | `Search` |
| Bouton panier | texte « Panier » + badge compteur | `ShoppingBag` |
| Bouton compte | texte « Compte » | `User` |

## Navigation mobile (`src/components/boutique/NavBas.tsx`)

| Onglet | Remplacement actuel | Icône lucide d'origine |
| --- | --- | --- |
| Accueil | lettre « A » (TabMarque) | `House` |
| Univers | lettre « U » | `Sparkles` |
| Recherche | lettre « R » | `Search` |
| Panier | lettre « P » + badge | `ShoppingBag` |
| Commandes | lettre « C » | `Package` |
| Compte | lettre « C » | `User` |

`TabMarque` dans `liquid-tab-bar.tsx` affiche `label.charAt(0)` —
remplacer par un rendu d'icône si besoin.

## Fiche produit (`dish-orbit-carousel.tsx` via `FicheProduit`)

| Emplacement | Remplacement actuel | Icône d'origine |
| --- | --- | --- |
| Retour | « ← » | chevron SVG |
| Favori | « ♥ » | cœur SVG |
| Partager | « ↗ » | flèche SVG |
| « Voir le produit » / « Ajouter au panier » | texte seul | `order` (icône plat) |
| Badge prix | pastille couleur | étiquette (tag) SVG |
| Puces « inclus » | « ✓ » | `check` SVG |
| Flèches du rail | « ‹ » / « › » | triangles SVG |

## Tunnel de commande (`CheckoutForm.tsx`)

| Emplacement | Remplacement actuel | Icône lucide d'origine |
| --- | --- | --- |
| Titre d'étape | texte | prop `Icon` (lucide) |
| Choix « Paiement en ligne » | texte | `Smartphone` |
| Choix « À la livraison » | texte | `Banknote` |
| Puces de confirmation | « ✓ » | `Check` |
| Bouton « Commander » | texte + « → » | `ArrowRight`, `Loader2` |
| Mention sécurité | texte | `Lock` |
| Mention livraison | texte | `Truck` |
| Champ recherche commune | texte | `Search` |
| Indicateur mode de paiement | **supprimé** (composant `IconePaiement.tsx`, morph téléphone ⇄ billet) | — |

## États et composants motion

| Fichier | Avant | Maintenant |
| --- | --- | --- |
| `EtatVide.tsx` | illustration SVG dessinée (sac/loupe/boîte/colis, DrawSVG) | état vide typographique |
| `SuccesAnime.tsx` | coche + halo + confettis animés | disque vert + « ✓ » |
| `TrajetLivraison.tsx` | route SVG + camion (MotionPath) | stepper texte |
| `FondAnime.tsx` | blobs décoratifs MorphSVG | **fichier supprimé** (inutilisé) |
| `IconePaiement.tsx` | morph téléphone ⇄ billet | **fichier supprimé** (inutilisé) |
| `HeroPromo.tsx` | vagues morphées, soulignement tracé, étoiles | dégradé radial + soulignement CSS |

## Composants supprimés (inutilisés ou entièrement illustrés)

- `src/components/ui/product-rail-gallery.tsx` — portant de vêtements
  dessinés en SVG (utilisé par `OffresRail`, lui-même inutilisé →
  `OffresRail.tsx` supprimé aussi). Source d'origine :
  `Downloads/docs-a-ajouter/docs/references-ui/03-fiche-vehicule/product-rail-gallery.tsx`
- `src/components/ui/sneaker-product-hero.tsx` — héros produit avec
  nombreuses icônes SVG dessinées (étoiles, flèches…). Inutilisé dans
  cette version du projet.
- `src/components/ui/product-rail-gallery.tsx` et `sneaker-product-hero.tsx`
  existent en copie de référence dans `C:\Users\PC\Downloads\` si jamais
  la propriétaire veut les réintégrer avec de vraies icônes.

## Authentification

| Emplacement | Remplacement actuel | Icône lucide d'origine |
| --- | --- | --- |
| Champs connexion (e-mail, mot de passe) | texte | `Mail`, `Lock` |
| Champs inscription | texte | `User`, `Mail`, `Phone`, `Lock` |
| Boutons submit | texte | `LogIn`, `UserPlus` |
| Lien retour boutique | « ← Boutique » | `ChevronLeft` |
| Fond animé auth | **retiré** (`FondAnime`) | — |

## Administration

| Emplacement | Remplacement actuel | Icône lucide d'origine |
| --- | --- | --- |
| Rail latéral (8 entrées) | libellés courts en texte | `LayoutDashboard`, `FolderTree`, `Package`, `Percent`, `MapPin`, `ShoppingBag`, `CreditCard`, `BarChart3` |
| Pied de sidebar | « Boutique » / « Quitter » | `Store`, `LogOut` |
| En-tête admin | lien « Paiements » + badge | `Bell` |
| Dashboard : tendance | « ▲ » / « ▼ » | `TrendingUp`, `TrendingDown` |
| Dashboard : indicateurs cartes | pastille colorée | `ClipboardList`, `CreditCard`, `PackageX`, `Nfc` |
| Dashboard : liens d'action | « → » | `ArrowUpRight` |
| Catégories : active/inactive | « ✓ » / « × » | `Check`, `X` |
| Commandes : paiement livraison | badge texte | `Banknote` |
| Détail commande | texte + pastille ambre | `Banknote`, `CreditCard`, `Wallet`, `User`, `Truck`, `Package` |
| Paiements : alerte | pastille ambre | `AlertTriangle` |
| Compte client : déconnexion | texte | `LogOut` |

## UI générique (`src/components/ui/`)

| Fichier | Avant | Maintenant |
| --- | --- | --- |
| `sheet.tsx` | `X` (fermeture panneau) | « × » |
| `sidebar.tsx` | `PanelLeft` (déclencheur) | « ≡ » |
| `runway-lookbook.tsx` | loupe, cœur, sac, plus SVG | « Recherche », « Favoris », « Panier », « + » |

## Éléments conservés volontairement

- Le chemin SVG de la `liquid-tab-bar` (la forme de la barre elle-même —
  c'est la structure du composant, pas une icône).
- L'arc d'orbite du carrousel produit (`dsh-arc`) — élément de mise en
  page de l'animation.
- Les graphiques Recharts du dashboard (visualisation de données).
- Le logo `public/images/logo.jpeg` (seule « image de marque » autorisée).
- Les caractères typographiques dans le texte (« → », « ✓ », « × »,
  « ♥ », « ▲/▼ », « ↳ ») — ce sont des glyphes de police, pas des icônes.
