# 🎬 Prompt — Animation vitrine « SOUKEYNA » (démo mobile de la boutique)

> **Mode d'emploi (FR)**
> 1. Vérifie la section `0. PARAMÈTRES` (déjà pré-remplie d'après le cahier des charges v1.2 et le code existant).
> 2. Donne **tout ce fichier** à ton agent IA (ou copie à partir de `=== DÉBUT DU PROMPT ===`).
> 3. Le prompt est volontairement en anglais (les agents de code sont plus précis ainsi) ; tout le contenu affiché dans la démo reste **en français**, en FCFA.
> 4. **Périmètre strict : espace utilisateur uniquement.** Rien dans `src/app/admin` ne doit être touché, imité ou mentionné.

---

=== DÉBUT DU PROMPT ===

## 0. PARAMÈTRES

```yaml
STACK: "Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4"   # stack réelle du projet
TARGET_FILE: "src/components/boutique/DemoVitrine.tsx"                     # un seul composant client
SITE_BRAND_NAME: "SOUKEYNA"                                                 # boutique mono-vendeur, Abidjan
CURRENCY: "FCFA"                                                            # prix entiers, ex. "18 500 FCFA"
PRODUCT_IMAGES: "placeholders"                                              # ou URLs Cloudinary du vrai catalogue
DEFAULT_MODE: "autoplay"                                                    # "autoplay" (démo scriptée) | "interactive"
```

---

## 1. ROLE & MISSION

You are a senior **UI engineer / motion designer** working inside an **existing Next.js e-commerce codebase** (single-vendor fashion shop "SOUKEYNA", Abidjan, Côte d'Ivoire, currency FCFA, language French).

Build a **looping, scripted product demo** displayed inside a phone frame — it showcases the shop's **real user-facing screens**: home, product page, universe/category browsing and add-to-cart. A fake touch indicator shows what the "finger" does.

**Scope (strict): storefront only.** Nothing related to the admin space (`src/app/admin`, `src/components/admin`). Every screen, word and price must come from the real shop's design system and catalogue vocabulary described below — not from a generic template.

Quality bar: it must feel like the real app — smooth 60 fps, shared-element transitions, staggered reveals, springy sheets, no jank, no layout thrash.

## 2. DELIVERABLE (STRICT)

- **ONE client component file** (`TARGET_FILE`), self-contained: markup, styles and timeline logic in that single file. `"use client"` at the top. No new npm dependency — use the **Web Animations API** (`element.animate`) or CSS transitions driven by one small async timeline function. (GSAP exists in the project but is **not required** here.)
- Tailwind classes for layout; **CSS variables on a `:root`-scoped wrapper** for every duration, delay, easing, color and radius, so values can be tuned ±20 % without touching logic.
- Animate **only `transform` and `opacity`** (plus `clip-path` / `border-radius` where noted). Exception: the universe pill stretch (§7.6).
- All demo text in **French**, all prices **FCFA** (e.g. `18 500 FCFA`).
- Respond with: (1) a 10-line plan, (2) the file in one code block, (3) a 5-line list of the main tuning variables. Then run the QA checklist in §12 and fix anything that fails **before** answering.

## 3. WHAT THE DEMO SHOWS

Canonical cycle (~14 s), reconstructed from the shop's real user journey:

```
ACCUEIL ──tap carte produit──▶ FICHE PRODUIT ──tap "Ajouter au panier"──▶ (badge panier pops + toast)
   ▲                                  │
   └────────── swipe-back ◀───────────┘
ACCUEIL ──tap pilule univers "Femmes"──▶ SHEET CATÉGORIES rises
SHEET ──barre "Boubous" rises──▶ swipe up ──▶ PANNEAU PRODUITS expands
PANNEAU ──swipe down──▶ collapse ──tap flèche retour──▶ sheet exits right ──▶ ACCUEIL (loop)
```

This mirrors the real app: `src/app/(boutique)/page.tsx` (accueil), `/produit/[slug]` (fiche), `NavBas` (barre liquide), the 4 univers of the spec (§4.1: **ENFANTS, HOMMES, FEMMES, ACCESSOIRES**).

## 4. DESIGN TOKENS

Reference device: **390 × 844** (iPhone-like). Build with `container-type: inline-size` and `cqw` units so it scales to any width; cap at `max-height: 92vh`. All sizes at 390 px width, ±10 %.

### 4.1 Colors — the real SOUKEYNA palette (from `globals.css`, do not substitute)

```css
.dv-root{
  --page-bg:   #f1eff0;  /* page behind the phone (neutral) */
  --surface:   #ffffff;  /* cards / sheets (--color-blanc) */
  --bg-app:    #f7f8f6;  /* app background (--color-blanc-casse) */
  --ink:       #171512;  /* near-black (--color-noir): footer, dark bars, text */
  --accent:    #1e7b4f;  /* brand green (--color-vert): pills, CTA, touch indicator */
  --accent-dk: #15613d;  /* --color-vert-fonce */
  --accent-bg: #e3f0e9;  /* --color-vert-clair: chips, badges */
  --gold:      #e3b341;  /* promo underline / star accents (used on HeroPromo) */
  --photo-bg:  #eef0ec;  /* --color-gris: image placeholders */
  --muted:     #5f6660;  /* --color-gris-fonce: captions */
  --glass:     rgba(255,255,255,.55);
}
```

### 4.2 Typography

- Family: inherit the app font (`var(--font-geist-sans)`, fallback system-ui). Weights 400/500/600/700/800.
- Scale (px @390): hero word `NOUVEAUTÉS` 40/800 uppercase · section titles 13–15/700 (`Offres du moment`, `Fraîchement arrivés`) · product name 9/600 uppercase letter-spacing .06em `--muted` · price 12/700 · `Ajouter au panier` 12/700 · detail title 34/800 · sheet titles 17/700 and 15/500 · tab labels 12/500 (active 700) · prices always like `18 500 FCFA`.

### 4.3 Radii, shadows, spacing

```css
.dv-root{
  --r-device: 44px;   --r-sheet: 28px;   --r-card: 16px;   /* real app uses rounded-2xl/3xl */
  --r-hero-br:48px;   --r-pill: 999px;   --pad: 16px;
  --shadow-device: 0 30px 60px -20px rgba(0,0,0,.25);
  --shadow-card:   0 14px 24px -10px rgba(23,21,18,.14);
}
```

### 4.4 Motion tokens

```css
.dv-root{
  --ease-sheet:  cubic-bezier(.22,1,.36,1);
  --ease-inout:  cubic-bezier(.65,0,.35,1);
  --ease-pill:   cubic-bezier(.7,0,.2,1);
  --ease-pop:    cubic-bezier(.34,1.56,.64,1);   /* same family as the app's .pop badge */
  --ease-out:    cubic-bezier(.16,1,.3,1);
  --d-fast: 200ms; --d-mid: 450ms; --d-slow: 800ms; --stagger: 60ms;
}
```

## 5. SCREEN ANATOMY

All screens live in one `.dv-screen` (overflow hidden, radius `--r-device`) as **absolutely stacked layers**: `#home` (z1) · `#fiche` (z3) · `#univers` (z4) · `#boubous-bar` + `#footer` (z5) · `#panel` (z6) · `#touch` (z99, `pointer-events:none`).

### 5.1 ACCUEIL (mirrors the real `/`)

- **Header strip**: small logo block `SOUKEYNA` left; right: round `Panier` button (`--accent` pill) with a **badge dot** (this is where §7.3 pops).
- **Greeting**: `Bienvenue` (13, `--muted`) then `Chez SOUKEYNA` (20/800).
- **Search pill**: full-width rounded bar `Rechercher un article, une catégorie…` (like the real link to `/recherche`).
- **Promo banner** (`HeroPromo`-style): `--accent` → `--accent-dk` gradient card, badge `-30%`, headline `Les prix fondent,` + `le style reste` underlined in `--gold`, dark pill `Voir les offres`.
- **Marquee** (scrolling strip): `Livraison dans tout Abidjan • Paiement à la livraison • Wave · Orange Money · MTN · Moov` — duplicated ×2, infinite scroll.
- **Universe pills row** (replaces the video's Women|Men|Kids tabs): `Femmes | Hommes | Enfants | Accessoires`, active item in an `--accent` pill (white bold text).
- **`Fraîchement arrivés`** section: horizontal carousel of product cards — image ≈ 150×160 `--photo-bg` radius 16, name uppercase `--muted`, price `X XXX FCFA`; 3rd card cut by the right edge (peek). Soft `--shadow-card` under images.
- **Bottom nav** (mirrors the real `NavBas`, 5 items): `Accueil · Recherche · Panier · Commandes · Compte` — icon bar with a round bubble on the active item; the `Panier` icon carries the badge too.

### 5.2 FICHE PRODUIT (mirrors `/produit/[slug]`)

- **Hero photo** (top ≈ 58 %), `--photo-bg` with a simple garment silhouette, **only bottom-right corner rounded** (`--r-hero-br`).
- Top bar over the hero: back chevron (left) + heart outline (right, the real favori).
- **3 glass chips** at the hero's bottom (`backdrop-filter: blur(14px)`, `--glass`): `COULEUR` + swatch dot · `PRIX 25 000 F` · `TAILLE M ⌄`.
- Below (white): product name `Boubou Brodé` (34/800) · `Femmes › Boubous` (14, `--muted`) · price row `25 000 FCFA` (700) with a struck `35 000 FCFA` (`--muted`) and a `-30%` `--gold` chip · 2 lines of grey description (11px) · info chips `Livraison Abidjan` / `Paiement sécurisé` (`--accent-bg` pills).
- **Sticky bottom CTA**: full-width `--accent` pill `Ajouter au panier` (white 12/700) — replaces the video's split heart|bag CTA, since the real app has a single add-to-cart button.

### 5.3 SHEET UNIVERS (full-height white sheet, mirrors universe browsing)

- Header: back chevron · centered `Femmes` (17/700).
- Sub-tabs row: `Nouveautés` (bold, **green dot underneath**) · `Populaires` · `Promos`.
- **2×2 product grid**: image `--photo-bg` radius 16, heart outline top-right — one card shows a **filled green heart**, name, price FCFA, `+ Panier` green link. Products: `Robe Wax` 18 500 FCFA · `Boubou Bazin` 32 000 FCFA · `Sac Tissé` 12 000 FCFA · `Ensemble 2pcs` 24 000 FCFA.

### 5.4 BARRE "BOUBOUS" + FOOTER (collapsed state, over the sheet)

- **Black bar** (`--ink`, ≈ 52 px, top radius 26): centered `Boubous` (white 15/500) + small `--gold` ▸ at right.
- **Footer card** (white, ≈ 48 px, top radius 22): logo chip + `SOUKEYNA` (12/600) left, `Abidjan · Côte d'Ivoire` (11, `--muted`) right — mirrors the real footer's contact block.

### 5.5 PANNEAU "BOUBOUS" (expanded state)

- Same black panel grows upward to cover ≈ **61 %** of the phone (top radius 28); `Boubous ▸` stays pinned at its top edge.
- **Featured block** (≈ 170 px): left ≈ 42 % close-up fabric photo (wax pattern gradient, radius 12); right: white card (radius 12, slight overlap) with `Boubou Bazin Royal` (14/600), 2 grey description lines (8px), `32 000 FCFA` (13/700), `+ Panier` (green 9/700).
- **Thumbnail grid 3 × 2**: each ≈ 100×88, gap 8, radius 10, bg `--photo-bg`, garment placeholder inside.
- Footer card stays visible beneath.

## 6. STATE MACHINE & STORYBOARD (canonical cycle ≈ 14 s)

Implement as one `async` timeline: `await step(...)` with Promises from `animation.finished`. Pause when off-screen (`IntersectionObserver`) or `document.hidden`. Times relative to loop start, ±100 ms.

| # | t (s) | Event | What moves |
|---|-------|-------|-----------|
| 1 | 0.00–0.80 | **ACCUEIL idle** | Marquee scrolls (the only ambient motion). Universe pill on `Femmes`. |
| 2 | 0.80 | **TAP** first product card | Touch dot; card presses `scale(.96)` 120 ms. |
| 3 | 0.95–1.55 | **Card → Hero expand** (shared element) | §7.1 |
| 4 | 1.45–2.40 | **Fiche content stagger-in** | §7.2 |
| 5 | 2.40–3.60 | Fiche idle | — |
| 6 | 3.65 | **TAP** `Ajouter au panier` | Button presses `scale(.94)`; touch dot; at 3.85 the **panier badge pops** + toast `Article ajouté au panier` slides up 300 ms (§7.3). |
| 7 | 4.20–5.10 | Fiche idle | Toast fades out at 4.6 s. |
| 8 | 5.20–5.65 | **Swipe-back** (left-edge swipe) | §7.4 |
| 9 | 5.75–6.30 | **Tap pilule `Femmes`** | Touch dot on the pill; stretch §7.6. |
| 10 | 6.60–7.50 | **Sheet catégories rises** | §7.5 |
| 11 | 7.50–8.10 | **Barre "Boubous" + footer rise** | §7.7 |
| 12 | 8.30 | **SWIPE UP** on the bar | Vertical pill indicator travels up ~120 px in 300 ms. |
| 13 | 8.40–9.00 | **Panneau expands** | §7.8 |
| 14 | 9.00–10.60 | Panel hold | — |
| 15 | 10.60–11.10 | **SWIPE DOWN** → panel collapses | Reverse of §7.8, 500 ms `--ease-inout`; content fades in first 200 ms. |
| 16 | 11.30 | **TAP back arrow** | Touch dot on the chevron. |
| 17 | 11.50–12.00 | **Sheet exits right** | `translateX(0→100%)` 450 ms; bar + footer leave with it; ACCUEIL underneath `translateX(-6%) scale(.98)` → `0/1`. Silently reset the badge and pill. |
| 18 | 12.00–14.00 | ACCUEIL idle → **loop** to step 2 | — |

## 7. TRANSITION SPECS

### 7.1 Card → Hero expand (shared-element / FLIP)
1. Measure the tapped card's image rect `A` and the hero rect `B` (`getBoundingClientRect`).
2. Clone the image above everything; animate **only `transform`** (translate+scale A→B) and `clip-path: inset(... round R)` from `round 16px` to `round 0 0 var(--r-hero-br) 0`. 600 ms `--ease-inout`. `object-fit: cover` — never non-uniform stretch.
3. In parallel: rest of ACCUEIL `opacity 1→0` + `scale 1→.96` 250 ms; bottom nav `translateY(0→24px)` + fade 250 ms.
4. Swap clone for real `#fiche` hero at the end (no visible jump).

### 7.2 Fiche stagger-in (start ≈ 1.45 s, `--ease-out`, `--stagger` apart)
Back/heart icons fade 200 ms → glass chips ×3 `translateY(16px)→0` 380 ms → product name **slides in from the left inside an `overflow:hidden` mask** (`translateX(-40%)→0`, 450 ms) → category line, price row (+ `-30%` chip pop), description (fade only) → CTA pill `translateY(100%)→0` 400 ms.

### 7.3 Ajouter au panier tap
- Button: `scale(1→.94→1)` 220 ms.
- **Panier badge** (header pill AND nav icon): dot `scale(0→1.25→1)` + fade, 320 ms `--ease-pop`, at +200 ms — same overshoot feel as the app's `.pop` utility.
- Toast `Article ajouté au panier` (`--ink` pill, white text): `translateY(16px)+opacity 0 → 0` 300 ms, holds ~800 ms, fades out.

### 7.4 Swipe-back (fiche → accueil)
- Horizontal pill indicator travels left→right ~70 % width in 350 ms.
- `#fiche`: `translateX(0→100%)` 400 ms `--ease-inout` + faint left shadow. ACCUEIL underneath: `translateX(-6%) scale(.98) → 0/1`. Nothing else animates on the fiche.

### 7.5 Sheet catégories rises
- `#univers`: `translateY(100%)→0` ~900 ms `--ease-sheet`; top corners interpolate `--r-sheet`→`--r-device` over the last 30 %.
- **Parallax**: inner content starts `translateY(60px)` → 0 with 120 ms delay. Header + tabs fade in first 40 %. Grid cards stagger from `translateY(30px)+opacity 0`, 45 ms apart. Green dot under `Nouveautés` pops (`scale 0→1`, 250 ms).

### 7.6 Universe pill "liquid stretch"
Same two-phase stretch-contract as the reference (left edge fixed then right edge fixed, `--ease-pill`, ~420 ms total). This echoes the real `LiquidTabBar` feel — the pill must **stretch then contract**, never slide rigidly. Labels cross-fade to white where the pill overlaps (stacked label layers clipped by the pill, or color toggle at midpoint). Only place where animating layout (`left`/`width`) is accepted.

### 7.7 Barre + footer
Black `Boubous` bar `translateY(100%)→0` 500 ms `--ease-sheet`; footer card same, +120 ms delay, 450 ms. They end stacked.

### 7.8 Panneau expand
Full-height black layer `translateY` from "bar position" to "panel top" 600 ms `--ease-sheet`; header text counter-translated to stay pinned. Featured block `translateY(40px)+opacity 0→0` 450 ms (delay 120 ms, card text +200 ms). Thumbnails `translateY(30px) scale(.9) opacity 0→rest` 350 ms each, **row-major stagger 40 ms** from +250 ms.

## 8. TOUCH INDICATOR (`#touch`)

Green (`--accent`), above everything, `pointer-events:none`, phone coordinates. Three variants:
1. **Tap**: filled circle 28 px at ~90 % opacity inside a 44 px ring (25 %). Enter `scale(.4→1)` 150 ms `--ease-pop`; hold 250 ms; exit `scale(1→1.4)` + fade 250 ms.
2. **Swipe horizontal**: outlined rounded rect, 2 px `--accent` stroke, ≈ 46×14, radius 7 — travels with the gesture (same duration/easing as the dragged layer).
3. **Swipe vertical**: same pill rotated 90° (≈ 14×46).

The indicator moves **in sync** with whatever it drags.

## 9. IMPLEMENTATION GUIDELINES

- **Layout**: `.dv-device` (390×844 ratio, radius `--r-device`, `--shadow-device`) centered on `--page-bg`; `cqw` for all dimensions.
- **Engine**: one `timeline()` async function; each step = `Promise.all([...animate(...).finished])`; a `reset()` restores every layer so the loop is seamless.
- **Modes**: `data-mode="autoplay"` (scripted cycle + indicator, `aria-hidden`, decorative) | `data-mode="interactive"` (no indicator; real handlers reusing the same animation functions). Default = `DEFAULT_MODE`.
- **Images**: `PRODUCT_IMAGES = "placeholders"` → inline SVG garments on `--photo-bg` (boubou, robe, sac, chemise) + wax-pattern gradients for featured shots. If Cloudinary URLs are provided, use plain `<img>` with `loading="lazy"`.
- **Icons**: inline SVG matching the app's lucide set (chevron, heart, bag, search, ▸, star).
- **Performance**: `will-change` only while animating; no `box-shadow`/blur animation; the glass `backdrop-filter` is static.
- **Accessibility**: `prefers-reduced-motion` → replace the loop with 150 ms cross-fades between states; visible **Pause/Play** control outside the phone for autoplay; real `<button>`s + `:focus-visible` in interactive mode.
- **Robustness**: measure rects after mount/fonts ready; recompute on resize; the loop must never desync after tab-hidden/visible.
- **Fit with the codebase**: the component must be droppable into `src/app/(boutique)/page.tsx` or any marketing section as `<DemoVitrine />` with no other change; export it as a named export.

## 10. AMBIGUITIES → DEFAULT DECISIONS

| Unclear | Decision |
|---|---|
| Which universe to feature | `Femmes` → category `Boubous` (signature ivoirienne, matches CDC §4.4). |
| Split CTA (heart|bag) from the reference video | Replaced by the real single CTA `Ajouter au panier`; the favori heart lives on the fiche top bar. |
| Bottom nav in the demo | The real `NavBas` 5 items (Accueil/Recherche/Panier/Commandes/Compte), static icons + active bubble — no need to reproduce the liquid sink animation inside a demo. |
| Checkout / payment screens | Out of the loop (cycle stays ~14 s); payment methods only appear in the marquee copy. |
| Prices | Whole FCFA amounts with thin-space thousands (`25 000 FCFA`). |

## 11. DO NOT

- Do **not** touch or imitate anything from `src/app/admin` / `src/components/admin` — storefront scope only.
- Do not add features absent from the spec: **no promo codes** (CDC §6.4), no wishlist page, no reviews module, no online returns form (returns are by phone/WhatsApp, CDC §9.7).
- Do not show prices in €/£/$ — FCFA only. No English copy in the demo.
- Do not use jQuery, new animation libraries, or animate `top/left/width/height/margin` (except §7.6).
- Do not commit real Cloudinary URLs or secrets; placeholders by default.
- Do not leave debug borders, console logs, or TODO comments.

## 12. QA CHECKLIST (verify each, fix, then answer)

- [ ] Single component file, `"use client"`, typechecks (`npx tsc --noEmit`), no console errors.
- [ ] Loop runs ≈ 14 s and restarts **seamlessly** (badge reset, pill back on `Femmes`, no flash).
- [ ] Card → hero expansion is a true shared-element motion (image never stretched or jumping).
- [ ] Product name reveals through a left mask; stagger order matches §7.2.
- [ ] `Ajouter au panier` tap → badge pops with overshoot on header pill + nav icon; toast appears then leaves.
- [ ] Swipe-back slides the fiche right while ACCUEIL returns from `translateX(-6%)`.
- [ ] Universe pill **stretches then contracts**; labels recolor correctly.
- [ ] Sheet rises ≈ 900 ms with inner parallax, then cards stagger in.
- [ ] Barre → panneau expands to ≈ 61 % height; featured block then thumbnails cascade row by row.
- [ ] Panel collapse → back-tap → sheet exits right → ACCUEIL.
- [ ] Touch indicator: tap dot / horizontal pill / vertical pill, in sync with each gesture.
- [ ] Palette matches SOUKEYNA tokens (green accent, gold promo, noir footer) — no orange leftover from the reference.
- [ ] All copy is French, all prices FCFA.
- [ ] 60 fps (transform/opacity only); `prefers-reduced-motion` handled; Pause/Play works.
- [ ] Scales 320 px → 1440 px; all tuning values are CSS variables on the root wrapper.

=== FIN DU PROMPT ===

---

### Notes d'adaptation (hors prompt)

Ce qui a été changé par rapport au prompt d'origine (`prompt_animation_mobile_shop.md`) :

- **Périmètre** : 100 % espace utilisateur ; l'admin est explicitement exclu (§1, §11).
- **Stack** : composant client Next.js/Tailwind au lieu d'un fichier HTML vanilla — cohérent avec le projet réel (GSAP déjà présent mais non requis).
- **Palette** : orange `#FA4B17` → vert SOUKEYNA `#1e7b4f` + doré `#e3b341`, fond `#f7f8f6` (les vrais tokens de `globals.css`).
- **Écrans** : mappés sur l'app existante — accueil (salutation, pilule recherche, HeroPromo, marquee avantages, nouveautés), fiche produit (chips verre, CTA unique « Ajouter au panier », favori), navigation par univers (Femmes → Boubous), barre du bas façon `NavBas` 5 onglets.
- **Contenu** : français, prix FCFA entiers, produits adaptés (Boubou Bazin, Robe Wax, Sac Tissé…), moyens de paiement réels dans le marquee (Wave, Orange Money, MTN, Moov, paiement à la livraison).
- **Conformité CDC** : pas de codes promo (§6.4), retours par téléphone/WhatsApp (§9.7), univers Enfants/Hommes/Femmes/Accessoires (§4.1), animations « fluides, élégantes et légères » (§7.6), mobile-first (§7.7).
- **Améliorations** : étape « ajout panier » avec badge + toast (le vrai comportement du site), cycle allongé à ~14 s pour respirer, sections DO NOT/QA renforcées, tableau des décisions par défaut.
