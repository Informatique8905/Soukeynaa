"use client"  
  
import { useEffect, useLayoutEffect, useRef, useState, ViewTransition } from "react"  
import Link from "next/link"
import { gsap } from "gsap"
import { ArrowLeft, Heart, Share2, Check, ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react"
import { hauteurViewport } from "@/lib/viewport"  
import { ScrollTrigger } from "gsap/ScrollTrigger"  
  
gsap.registerPlugin(ScrollTrigger)  
  
/*  
 * Dish Orbit Carousel: a smart-kitchen-display menu. The plated dish sits on  
 * the left; changing dish swings it out over the top on a wide orbit while the  
 * next plate swings in from the other side. The two-weight title wipes out and  
 * back in (thin line from the right, heavy line from the left), the chef card  
 * and its coloured rating badge cross-fade, and a pastel arc behind the scene  
 * turns and takes the dish's colour. The page scroll drives it: the section  
 * pins and each stretch of scroll brings the next dish, endlessly both ways.  
 * Arrows, thumbnails, the side pager, arrow keys and swipes jump too.  
 */  
  
export type Dish = {  
  /** The thin first title line, e.g. "Char grill". */  
  title: string  
  /** The heavy second title line, e.g. "Ribeye". */  
  subtitle: string  
  /** Plate photo, ideally a top-down cut-out (transparent PNG/WebP), square. */  
  image: string  
  alt?: string  
  /** Small line above the title. Defaults to "#n de la sélection". */
  eyebrow?: string
  /** Two-line label under the thumbnail. Defaults to title + subtitle. */
  label?: string
  /** Prix affiché dans le badge (FCFA). */
  prix: number
  /** Prix barré si promotion. */
  prixBarre?: number
  /** Catégorie / collection du produit. */
  categorie: string
  /** Ligne sous la catégorie (marque/lieu). */
  boutique?: string
  /** Slug produit pour le lien « Voir le produit ». */
  slug?: string
  description: string
  /** Attributs affichés en pastilles (tailles, couleurs, matière…). */
  attributs?: string[]
  /** Pastille couleur représentée par cet article (hex). Active le sélecteur de couleur dans la carte. */
  swatch?: string
  /** Tailles ou pointures disponibles pour cet article, avec stock. */
  tailles?: { label: string; stock: number }[]
  /** Libellé du sélecteur (« Pointure », « Taille »…). */
  tailleLabel?: string
  /** Pastilles d'info sous la boutique (livraison, paiement…). */
  chips?: string[]
  /** « Ce qui est inclus » : points cochés dans l'onglet Aperçu. */
  checks?: string[]
  /** Badge and band colour: hex or rgb(), so the band can morph between dishes. */
  accent: string
}  
  
export type DishOrbitCarouselProps = {  
  dishes: Dish[]  
  /** Root height. A definite length: percentages collapse on a host page. */  
  height?: string  
  /** Optional photo behind the display, e.g. a kitchen wall. Washed by the theme background. */  
  backdrop?: string  
  /** Scroll on forever: past the last dish comes the first again, and up from the first, the last. */  
  loop?: boolean  
  /** Embedded display face (Outfit, OFL). Pass null to use the host's font. */  
  fontSrc?: string | null  
  onOrder?: (dish: Dish, index: number) => void  
  /** « Ajouter au panier » : reçoit l'article affiché et la taille/pointure choisie. */
  onAddToCart?: (dish: Dish, index: number, taille: string | null) => void | Promise<void>  
  /** Bouton retour flottant, en haut à gauche. */
  onRetour?: () => void
  /** Bouton partager flottant, en haut à droite. */
  onPartager?: (dish: Dish) => void
  /** Cœur favori flottant, en haut à droite. */
  favori?: { actif: boolean; onToggle: (dish: Dish) => void }
  /** Affichage « bibliothèque » : photo courante au centre, voisines en perspective 3D. */
  bibliotheque?: boolean
  /** view-transition-name de l'image courante (morphing partagé depuis la carte produit). */
  vtName?: string
  onChange?: (index: number) => void  
  className?: string  
}  
  
// #region carousel  
export function wrapIndex(i: number, n: number): number {  
  if (n <= 0) return 0  
  return ((Math.round(i) % n) + n) % n  
}  
  
/** Which way to swing when jumping from one dish to another: the shorter way round. */  
export function stepDirection(from: number, to: number, n: number): 1 | -1 {  
  if (n <= 0) return 1  
  const fwd = (((to - from) % n) + n) % n  
  return fwd <= n - fwd ? 1 : -1  
}  
  
/** Scroll stretches in the section: one per dish change, plus one back round to the first when looping. */  
export function scrollSteps(n: number, loop: boolean): number {  
  return Math.max(0, loop ? n : n - 1)  
}  
  
/** The scroll stretch for dish `i` nearest the current one (when looping, dish 0 is also the last stretch). */  
export function segmentFor(i: number, current: number, n: number, loop: boolean): number {  
  return loop && i === 0 && current > n / 2 ? n : i  
}  
  
/** First thumbnail shown in the strip window, keeping the current one in view. */  
export function stripStart(index: number, n: number, visible: number): number {  
  if (n <= visible) return 0  
  return Math.max(0, Math.min(index - 1, n - visible))  
}  
  
/** Title font size so a line of `chars` characters fits `width` px at `em` average glyph width. */  
export function fitSize(chars: number, max: number, width: number, em: number): number {  
  return Math.min(max, width / (Math.max(1, chars) * em))  
}  
/**  
 * The pastel band: a thick stroke along the plates' orbit circle, tapering at  
 * both ends. Angles in degrees, screen space (0 = right, 90 = straight down).  
 */  
export function arcPath(a0: number, a1: number, cx: number, cy: number, r: number, w: number, steps = 48): string {  
  const outer: string[] = []  
  const inner: string[] = []  
  for (let i = 0; i <= steps; i++) {  
    const t = i / steps  
    const a = ((a0 + (a1 - a0) * t) * Math.PI) / 180  
    const h = (w / 2) * Math.pow(Math.sin(Math.PI * t), 0.45)  
    const c = Math.cos(a)  
    const s = Math.sin(a)  
    outer.push((cx + c * (r + h)).toFixed(1) + " " + (cy + s * (r + h)).toFixed(1))  
    inner.push((cx + c * (r - h)).toFixed(1) + " " + (cy + s * (r - h)).toFixed(1))  
  }  
  return "M" + outer.join("L") + "L" + inner.reverse().join("L") + "Z"  
}  
  
/** Where the band rests for each dish, as [start, end] angles along the orbit. Measured off the reference. */  
export const ARC_REST = [[50, 98], [46, 124], [60, 126], [40, 100]]  
export function arcRest(index: number): number[] {  
  return ARC_REST[((index % ARC_REST.length) + ARC_REST.length) % ARC_REST.length]  
}  
  
/** The band mid-swap: it stretches to trail between the outgoing and incoming plate. */  
export const ARC_SWEEP = [38, 146]  
// #endregion  
  
// The plates' orbit: its pivot sits above the canvas (the .dsh-orbit transform-origin).  
const ORBIT_X = 299  
const ORBIT_Y = -450  
const ORBIT_R = 650  
const SCROLL_PER_DISH = 0.7 // stage heights of scroll per dish  
const SWING = 50 // degrees the plate travels round the orbit's pivot  
const ITEM = 118 // thumbnail pitch in canvas px  
const VISIBLE = 4  
  
// Couleurs dérivées de l'accent du produit : la pastille de prix épouse
// le montant et prend la teinte de l'article (pastel = toujours lisible).
function canaux(couleur: string): [number, number, number] | null {
  const hex = couleur.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const m = couleur.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
function teinter(couleur: string, alpha: number): string {
  const c = canaux(couleur);
  return c ? `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})` : couleur;
}
function assombrir(couleur: string, f = 0.62): string {
  const c = canaux(couleur);
  return c
    ? `rgb(${Math.round(c[0] * f)}, ${Math.round(c[1] * f)}, ${Math.round(c[2] * f)})`
    : couleur;
}

const FONT = "dsh-face"  
  
const CSS =  
  ".dsh-trk{position:relative;width:100%}" +  
  ".dsh-root{position:sticky;top:0;overflow:hidden;width:100%;background:var(--color-background);color:var(--color-foreground);" +  
  "font-family:" + FONT + ",ui-sans-serif,system-ui,sans-serif;container-type:inline-size;-webkit-tap-highlight-color:transparent}" +  
  ".dsh-root *{box-sizing:border-box}" +  
  ".dsh-bd{position:absolute;inset:0;width:100%;height:100%;max-width:none;object-fit:cover;pointer-events:none}" +  
  ".dsh-wash{position:absolute;inset:0;background:color-mix(in oklab,var(--color-background) 38%,transparent);pointer-events:none}" +  
  // multiply by the background: a no-op on a light theme, lights-off on a dark one  
  ".dsh-dim{position:absolute;inset:0;background:var(--color-background);mix-blend-mode:multiply;opacity:.72;pointer-events:none}" +  
  ".dsh-root:focus-visible{outline:2px solid var(--color-primary);outline-offset:-4px}" +  
  ".dsh-canvas{position:absolute;left:50%;top:50%;width:960px;height:520px;transform:translate(-50%,-50%) scale(var(--dsh-s,1));transform-origin:50% 50%}" +  
  ".dsh-arc{position:absolute;left:0;top:0;width:960px;height:520px;overflow:visible;pointer-events:none}" +  
  ".dsh-btn{appearance:none;border:0;background:none;color:inherit;font:inherit;padding:0;margin:0;cursor:pointer}" +  
  ".dsh-btn:focus-visible{outline:2px solid var(--color-primary);outline-offset:3px;border-radius:10px}" +  
  ".dsh-ico{width:22px;height:22px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}" +  
  ".dsh-top{position:absolute;left:56px;right:56px;top:52px;display:flex;justify-content:space-between;pointer-events:none}" +
  ".dsh-topg{display:flex;gap:12px;pointer-events:auto}" +
  ".dsh-top .dsh-btn{width:38px;height:38px;display:grid;place-items:center;border-radius:99px;background:color-mix(in oklab,var(--color-background) 78%,transparent);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:0 6px 18px -8px rgba(0,0,0,.3);transition:transform .2s,color .2s}" +
  ".dsh-top .dsh-btn:hover{transform:scale(1.07)}" +
  ".dsh-fav[aria-pressed=true]{color:#e11d48}" +
  ".dsh-fav[aria-pressed=true] .dsh-ico{fill:#e11d48}" +  
  ".dsh-pager{position:absolute;left:76px;top:172px;display:flex;flex-direction:column;align-items:center;gap:7px}" +  
  ".dsh-dot{width:14px;height:10px;display:grid;place-items:center}" +  
  ".dsh-dot i{display:block;width:3px;height:3px;border-radius:3px;background:var(--color-foreground);opacity:.45;transition:height .45s cubic-bezier(.3,.7,.2,1),opacity .3s}" +  
  ".dsh-dot[aria-current] i{height:22px;opacity:.9}" +  
  ".dsh-dot[aria-current]{height:26px}" +  
  ".dsh-dot{transition:height .45s cubic-bezier(.3,.7,.2,1)}" +  
  ".dsh-plates{position:absolute;left:130px;top:82px;width:245px;height:245px;touch-action:pan-y}" +  
  ".dsh-orbit{position:absolute;inset:0;transform-origin:69% -217%;will-change:transform}" +  
  ".dsh-orbit>img{display:block;width:245px;height:245px;max-width:none;object-fit:contain;user-select:none;-webkit-user-drag:none;" +  
  "filter:drop-shadow(0 16px 22px rgba(0,0,0,.2)) drop-shadow(0 3px 5px rgba(0,0,0,.12))}" +  
  ".dsh-head{position:absolute;left:388px;top:96px;width:330px;height:150px}" +  
  ".dsh-hd{position:absolute;inset:0}" +  
  ".dsh-eye{font-size:12.5px;font-weight:600;letter-spacing:.01em;margin:0 0 4px 2px}" +  
  ".dsh-t1,.dsh-t2{display:block;white-space:nowrap;line-height:1;text-transform:uppercase;margin:0}" +  
  ".dsh-t1{font-weight:200;letter-spacing:-.015em;margin-top:6px}" +  
  ".dsh-t2{font-weight:800;letter-spacing:-.025em;margin-top:6px;color:color-mix(in oklab,var(--color-foreground) 86%,transparent)}" +  
  ".dsh-acts{position:absolute;left:396px;top:280px;display:flex;gap:44px;font-size:12.5px;font-weight:500}" +
  ".dsh-acts .dsh-btn{border:1.5px solid color-mix(in oklab,var(--color-foreground) 22%,transparent);border-radius:99px;padding:10px 20px;font-weight:700;background:color-mix(in oklab,var(--color-background) 75%,transparent);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);transition:transform .2s,border-color .2s}" +
  ".dsh-acts .dsh-btn:hover{transform:translateY(-1px);border-color:var(--color-vert,#1e7b4f);color:var(--color-vert,#1e7b4f)}" +  
  ".dsh-acts .dsh-btn{display:flex;align-items:center;gap:9px;padding:4px 0}" +  
  ".dsh-acts .dsh-ico{width:13px;height:13px}" +  
  ".dsh-acts .dsh-fill{fill:currentColor;stroke:none}" +  
  ".dsh-card{position:absolute;left:716px;top:88px;width:229px;padding:16px 20px 18px;border-radius:20px;" +  
  "background:color-mix(in oklab,var(--color-background) 72%,transparent);-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);" +  
  "box-shadow:0 1px 0 color-mix(in oklab,var(--color-foreground) 6%,transparent) inset,0 18px 40px -24px rgba(0,0,0,.25)}" +  
  ".dsh-tabs{display:flex;justify-content:space-between;padding:0 6px 0 20px;font-size:12px;margin-bottom:12px}" +  
  ".dsh-tab{color:var(--color-muted-foreground);font-weight:500;padding:3px 0}" +  
  ".dsh-tab[aria-selected=true]{color:var(--color-foreground);font-weight:700;box-shadow:inset 0 -2px 0 var(--color-vert,#1e7b4f)}" +  
  ".dsh-bodies{display:grid}" +  
  ".dsh-body{grid-area:1/1}" +
  // Avant l'init GSAP (SSR, JS pas encore hydraté ou indisponible) : l'article courant reste visible, les autres masqués via aria-hidden.
  ".dsh-root:not([data-ready]) .dsh-orbit[aria-hidden=true]," +
  ".dsh-root:not([data-ready]) .dsh-hd[aria-hidden=true]," +
  ".dsh-root:not([data-ready]) .dsh-body[aria-hidden=true]{visibility:hidden}" +  
  ".dsh-rate{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;min-height:44px;margin:0 0 12px 6px}" +  
  ".dsh-badge{display:inline-flex;align-items:baseline;gap:4px;padding:8px 14px;border-radius:14px}" +  
  ".dsh-num{font-size:23px;font-weight:800;letter-spacing:-.03em;line-height:1;white-space:nowrap}" +
  ".dsh-num small{font-size:11px;font-weight:600;letter-spacing:0;margin-left:3px;opacity:.75}" +  
  ".dsh-chef{font-size:19px;font-weight:600;letter-spacing:-.01em;margin:0}" +  
  ".dsh-kit{font-size:10.5px;color:var(--color-muted-foreground);margin:3px 0 12px}" +  
  ".dsh-desc{font-size:12.5px;line-height:1.38;margin:0;min-height:52px;display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}" +  
  ".dsh-pick{margin:10px 0 0;padding-top:10px;border-top:1px solid color-mix(in oklab,var(--color-foreground) 10%,transparent)}" +  
  ".dsh-ing{display:flex;flex-wrap:wrap;gap:5px;margin:0;padding:0;list-style:none;min-height:52px}" +  
  ".dsh-ing li{font-size:11px;padding:4px 9px;border-radius:99px;background:color-mix(in oklab,var(--color-foreground) 7%,transparent)}" +  
  ".dsh-react{display:flex;gap:12px;margin-top:20px}" +  
  ".dsh-like{display:flex;align-items:center;gap:8px;height:34px;padding:0 14px 0 10px;border-radius:99px;font-size:10.5px;" +  
  "background:color-mix(in oklab,var(--color-foreground) 6%,transparent);transition:background .25s}" +  
  ".dsh-meh{width:34px;height:34px;display:grid;place-items:center;border-radius:99px;background:color-mix(in oklab,var(--color-foreground) 6%,transparent)}" +  
  ".dsh-react .dsh-ico{width:16px;height:16px}" +  
  ".dsh-react [aria-pressed=true] .dsh-ico{fill:currentColor}" +  
  ".dsh-strip{position:absolute;left:130px;top:362px;width:550px;height:122px;display:flex;align-items:center}" +  
  ".dsh-arrow{width:36px;height:36px;display:grid;place-items:center;flex:none}" +  
  ".dsh-arrow svg{width:12px;height:16px;fill:currentColor}" +  
  ".dsh-win{position:relative;width:" + ITEM * VISIBLE + "px;height:122px;overflow:hidden;flex:none;margin:0 2px;" +  
  "-webkit-mask-image:linear-gradient(90deg,#000 88%,transparent);mask-image:linear-gradient(90deg,#000 88%,transparent)}" +  
  ".dsh-track{position:absolute;left:0;top:0;display:flex;transition:transform .6s cubic-bezier(.65,0,.35,1)}" +  
  ".dsh-th{width:" + ITEM + "px;height:122px;display:flex;justify-content:center;padding-top:3px}" +  
  ".dsh-th .dsh-btn{width:80px;height:116px;border-radius:14px;display:flex;flex-direction:column;align-items:center;gap:7px;padding-top:9px;transition:background .45s}" +  
  ".dsh-th .dsh-btn[aria-current]{background:#fff;box-shadow:0 0 0 2px var(--color-vert,#1e7b4f),0 10px 24px -16px rgba(0,0,0,.3)}" +  
  ".dsh-th img{width:56px;height:56px;max-width:none;object-fit:contain;filter:drop-shadow(0 4px 6px rgba(0,0,0,.18));transition:transform .45s}" +  
  ".dsh-th .dsh-btn[aria-current] img{transform:scale(1.06)}" +  
  ".dsh-th span{font-size:10px;line-height:1.25;text-align:center;font-weight:500;color:color-mix(in oklab,var(--color-foreground) 78%,transparent);max-width:78px}" +  
  ".dsh-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}" +  
  ".dsh-swatches{display:flex;gap:8px;margin:0 0 8px}" +  
  ".dsh-sw{width:22px;height:22px;border-radius:99px;box-shadow:0 0 0 1px color-mix(in oklab,var(--color-foreground) 30%,transparent);transition:transform .2s,box-shadow .2s}" +  
  ".dsh-sw[aria-current]{box-shadow:0 0 0 2px var(--color-foreground);transform:scale(1.08)}" +  
  ".dsh-barre{font-size:11px;text-decoration:line-through;opacity:.55;margin:0 0 10px}" +
  ".dsh-save{display:flex;align-items:baseline;gap:7px;font-size:11px}" +
  ".dsh-save s{opacity:.5}" +
  ".dsh-save b{color:#1e7b4f;font-weight:700;white-space:nowrap}" +
  ".dsh-urgence{display:inline-flex;align-items:center;padding:5px 10px;border-radius:99px;font-size:10.5px;font-weight:700;background:#fef3c7;color:#92400e;white-space:nowrap}" +
  ".dsh-urgence--vide{background:#171512;color:#fff}" +
  ".dsh-chips{display:flex;flex-wrap:wrap;gap:5px;margin:0 0 10px}" +
  ".dsh-chip{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;padding:4px 9px;border-radius:99px;background:color-mix(in oklab,var(--color-foreground) 7%,transparent)}" +
  ".dsh-chip i{width:5px;height:5px;border-radius:99px;background:#1e7b4f}" +
  ".dsh-inct{font-size:11px;font-weight:700;margin:0 0 3px}" +
  ".dsh-checks{margin:7px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px}" +
  ".dsh-checks li{display:flex;align-items:center;gap:6px;font-size:11px;color:color-mix(in oklab,var(--color-foreground) 85%,transparent)}" +
  ".dsh-checks .dsh-ico{width:13px;height:13px;color:#1e7b4f;flex:none}" +  
  ".dsh-optlabel{font-size:10.5px;color:var(--color-muted-foreground);margin:0 0 6px}" +  
  ".dsh-opts{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}" +  
  ".dsh-opt{min-width:34px;height:28px;padding:0 10px;border-radius:9px;font-size:11.5px;font-weight:600;background:color-mix(in oklab,var(--color-foreground) 7%,transparent)}" +  
  ".dsh-opt[aria-pressed=true]{background:var(--color-foreground);color:var(--color-background)}" +  
  ".dsh-opt:disabled{opacity:.35;text-decoration:line-through;cursor:not-allowed}" +  
  ".dsh-add{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;height:42px;border-radius:99px;background:var(--color-vert,#1e7b4f);color:#fff;font-size:13px;font-weight:700;box-shadow:0 10px 22px -10px rgba(30,123,79,.55);transition:transform .2s,box-shadow .2s}" +
  ".dsh-add:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 14px 26px -10px rgba(30,123,79,.6)}" +  
  ".dsh-add:disabled{opacity:.4;cursor:not-allowed}" +  
  ".dsh-add .dsh-ico{width:14px;height:14px}" +  
  ".dsh-err{font-size:11px;color:#dc2626;margin:6px 0 0;text-align:center}" +
  ".dsh-spin{display:inline-block;width:14px;height:14px;border-radius:99px;border:2px solid rgba(255,255,255,.35);border-top-color:#fff;animation:dsh-rot .7s linear infinite}" +
  "@keyframes dsh-rot{to{transform:rotate(360deg)}}" +
  ".dsh-add--ok{background:#16a34a;box-shadow:0 10px 22px -10px rgba(22,163,74,.55);animation:dsh-pop .35s cubic-bezier(.3,1.6,.5,1)}" +
  "@keyframes dsh-pop{45%{transform:scale(1.06)}}" +
  ".dsh-count{position:absolute;right:14px;bottom:14px;z-index:6;padding:4px 10px;border-radius:99px;background:rgba(15,23,42,.72);color:#fff;font-size:11.5px;font-weight:600}" +
  "@container (max-width:639px){.dsh-count{right:12px;bottom:10px}}" +
  ".dsh-voirpanier{display:block;margin-top:8px;text-align:center;font-size:12px;font-weight:700;color:var(--color-vert,#1e7b4f);text-decoration:underline;text-underline-offset:2px;animation:dsh-vp .3s ease-out both}" +
  "@keyframes dsh-vp{from{opacity:0;transform:translateY(4px)}}" +  
  "@container (max-width:639px){" +
  // phone: colonne compacte bornée à la hauteur du stage — scroll interne si ça déborde
  ".dsh-canvas{position:relative;left:auto;top:auto;width:100%;height:auto;max-height:100%;transform:none;display:flex;flex-direction:column;align-items:center;padding:10px 14px 92px;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;scrollbar-width:none}" +
  ".dsh-canvas::-webkit-scrollbar{display:none}" +
  ".dsh-arc{width:200%;height:auto;left:-60%;top:-30px}" +
  ".dsh-top{position:relative;left:auto;right:auto;top:auto;width:100%;align-self:stretch;margin-bottom:4px;flex:none;order:-3}" +
  ".dsh-top .dsh-btn{width:42px;height:42px}" +
  ".dsh-pager{display:none}" +
  ".dsh-plates{position:relative;left:auto;top:auto;width:min(50vw,27vh);height:min(50vw,27vh);width:min(50vw,27svh);height:min(50vw,27svh);margin-top:4px;flex:none;touch-action:pan-y}" +
  ".dsh-orbit>img{width:100%;height:100%}" +
  ".dsh-head{position:relative;left:auto;top:auto;width:100%;height:112px;margin-top:0;flex:none;order:-1}" +
  ".dsh-hd{text-align:center;transform:scale(.74);transform-origin:50% 0}" +
  ".dsh-acts{position:relative;left:auto;top:auto;margin-top:2px;flex:none}" +
  ".dsh-card{position:relative;left:auto;top:auto;width:100%;max-width:420px;margin-top:10px;padding:12px 14px 14px;flex:none;order:3}" +
  ".dsh-strip{order:2}" +
  ".dsh-arrow{width:40px;height:40px}" +
  ".dsh-opt{min-width:40px;min-height:34px}" +
  ".dsh-add{height:46px}" +
  ".dsh-tabs{margin-bottom:8px}" +
  ".dsh-rate{height:48px;margin-bottom:6px}" +
  ".dsh-kit{margin:2px 0 8px}" +
  ".dsh-chips{display:none}" +
  ".dsh-desc{min-height:0;-webkit-line-clamp:3}" +
  ".dsh-ing{min-height:0}" +
  ".dsh-checks{margin-top:6px}" +
  ".dsh-pick{margin-top:8px;padding-top:8px}" +
  ".dsh-opts{margin-bottom:8px}" +
  ".dsh-strip{position:relative;left:auto;top:auto;width:100%;max-width:420px;height:86px;margin-top:8px;flex:none}" +
  ".dsh-win{flex:1 1 auto;width:auto;height:86px}" +
  ".dsh-th{height:86px;padding-top:0;align-items:center}" +
  ".dsh-th .dsh-btn{height:80px;gap:3px;padding-top:4px}" +
  ".dsh-th img{width:44px;height:44px}" +
  "}" +  
  // Bibliothèque 3D : la scène photo devient un cover-flow centré
  ".dsh-bib .dsh-plates{--esp:100px;left:10px;top:60px;width:420px;height:310px;perspective:1000px;-webkit-mask-image:linear-gradient(90deg,transparent,#000 11%,#000 74%,transparent 96%);mask-image:linear-gradient(90deg,transparent,#000 11%,#000 74%,transparent 96%)}" +
  ".dsh-bib .dsh-orbit{inset:auto;left:50%;top:50%;width:252px;height:252px;transform-origin:50% 50%;transition:transform .7s cubic-bezier(.22,1,.36,1),opacity .55s ease;will-change:transform;cursor:pointer;background:#fff;border-radius:20px;box-shadow:0 14px 34px -18px rgba(15,23,18,.3);overflow:hidden}" +
  ".dsh-bib .dsh-orbit>img{width:100%;height:100%;padding:10px;box-sizing:border-box}" +
  // Halo doux derrière la photo, teinté par l'accent de l'article
  ".dsh-glow{position:absolute;left:10px;top:0;width:560px;height:560px;border-radius:50%;filter:blur(90px);opacity:.5;pointer-events:none;transition:background-color 1.1s ease}" +
  "@container (max-width:639px){" +
  ".dsh-bib .dsh-plates{--esp:30vw;position:relative;left:auto;top:auto;width:100%;height:min(62vw,34vh);height:min(62vw,34svh);margin-top:0;flex:none}" +
  ".dsh-bib .dsh-orbit{width:min(54vw,30vh);height:min(54vw,30vh);width:min(54vw,30svh);height:min(54vw,30svh)}" +
  ".dsh-bib .dsh-glow{left:50%;top:40%;width:80vw;height:80vw;transform:translate(-50%,-50%)}" +
  "}" +
  "@media (prefers-reduced-motion:reduce){.dsh-bib .dsh-orbit{transition:none}.dsh-track,.dsh-dot,.dsh-dot i,.dsh-th .dsh-btn,.dsh-th img,.dsh-like{transition:none}}"
  
const HIDE_1 = "inset(0% 0% 0% 100%)" // thin line: wipes in from the right  
const HIDE_2 = "inset(0% 100% 0% 0%)" // heavy line: wipes in from the left  
const SHOW = "inset(0% 0% 0% 0%)"  
  
const Icon = {
  back: <ArrowLeft className="dsh-ico" aria-hidden="true" />,
  heart: <Heart className="dsh-ico" aria-hidden="true" />,
  share: <Share2 className="dsh-ico" aria-hidden="true" />,
  check: <Check className="dsh-ico" aria-hidden="true" />,
  prev: <ChevronLeft className="dsh-ico" aria-hidden="true" />,
  next: <ChevronRight className="dsh-ico" aria-hidden="true" />,
  panier: <ShoppingCart className="dsh-ico" aria-hidden="true" />,
};
export function DishOrbitCarousel({  
  dishes,  
  height = "100svh",  
  backdrop,  
  loop = true,  
  fontSrc = null,  
  onOrder,  
  onAddToCart,  
  onRetour,
  onPartager,
  favori,
  bibliotheque = false,
  vtName,
  onChange,
  className,  
}: DishOrbitCarouselProps) {  
  const n = dishes.length
  const h = hauteurViewport(height)  
  const [index, setIndex] = useState(0)  
  const [tab, setTab] = useState("overview")  
  const [choix, setChoix] = useState({} as Record<number, string>)  
  const [adding, setAdding] = useState(false)
  const [compact, setCompact] = useState(false)
  const [ajoute, setAjoute] = useState(-1)
  const [addErr, setAddErr] = useState("")
  // Taille/pointure retenue par article : choix explicite, sinon la première en stock.
  const choixPour = (i: number, d: Dish): string | null =>
    choix[i] ?? d.tailles?.find((t) => t.stock > 0)?.label ?? null  
  
  const trackRef = useRef(null as HTMLDivElement | null)  
  const rootRef = useRef(null as HTMLDivElement | null)  
  const stRef = useRef(null as ScrollTrigger | null)  
  const segRef = useRef(0)  
  const indexRef = useRef(0)  
  const onChangeRef = useRef(onChange)  
  useEffect(() => { onChangeRef.current = onChange })  
  const orbits = useRef([] as (HTMLDivElement | null)[])  
  const heads = useRef([] as (HTMLDivElement | null)[])  
  const bodies = useRef([] as (HTMLDivElement | null)[])  
  const arcRef = useRef(null as SVGPathElement | null)  
  const arc = useRef({ a0: 0, a1: 0 })  
  const shown = useRef(-1)  
  const dirRef = useRef(1 as 1 | -1)  
  const tlRef = useRef(null as gsap.core.Timeline | null)  
  const reducedRef = useRef(false)  
  const swipe = useRef(null as { x: number; y: number } | null)  
  
  // Fit the 960 x 520 design canvas to the root. Measured on resize only.  
  useLayoutEffect(() => {  
    const el = rootRef.current  
    if (!el) return  
    const fit = () => {  
      const w = el.clientWidth  
      const h = el.clientHeight  
      el.style.setProperty("--dsh-s", String(Math.min(w / 960, h / 520, 1.6)))
      setCompact(w < 640)  
    }  
    fit()  
    const ro = new ResizeObserver(fit)  
    ro.observe(el)  
    return () => ro.disconnect()  
  }, [])  
  
  useEffect(() => {  
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")  
    const on = () => (reducedRef.current = mq.matches)  
    on()  
    mq.addEventListener("change", on)  
    return () => mq.removeEventListener("change", on)  
  }, [])  
  
  // Confirmation « Ajouté » : s'efface seule après un court délai.
  useEffect(() => {
    if (ajoute < 0) return
    const t = window.setTimeout(() => setAjoute(-1), 2200)
    return () => window.clearTimeout(t)
  }, [ajoute])

  // The swap. Every dish is in the DOM; GSAP only moves the outgoing and incoming ones.  
  useLayoutEffect(() => {  
    // GSAP contrôle désormais la visibilité : le repli CSS pré-JS se désactive.
    if (rootRef.current) rootRef.current.dataset.ready = "1"  
    const from = shown.current  
    const to = index  
    const parts = (i: number) => {  
      const head = heads.current[i]  
      return {  
        orbit: orbits.current[i],  
        head,  
        eye: head && head.querySelector(".dsh-eye"),  
        t1: head && head.querySelector(".dsh-t1"),  
        t2: head && head.querySelector(".dsh-t2"),  
        body: bodies.current[i],  
      }  
    }  
    // Writes the band's path only; no layout is read.  
    const drawArc = () => arcRef.current?.setAttribute("d", arcPath(arc.current.a0, arc.current.a1, ORBIT_X, ORBIT_Y, ORBIT_R, 118))  
    const rest = arcRest(to)  
    const tint = dishes[to] ? dishes[to].accent : "transparent"  
    if (tlRef.current) tlRef.current.progress(1).kill()  
    const b = parts(to)  
    if (from === -1 || from === to || reducedRef.current) {  
      for (let i = 0; i < n; i++) if (i !== to) {
        const p = parts(i)
        gsap.set(bibliotheque ? [p.head, p.body] : [p.orbit, p.head, p.body], { autoAlpha: 0 })
      }
      gsap.set(bibliotheque ? [b.head, b.body, b.eye] : [b.orbit, b.head, b.body, b.eye], { autoAlpha: 1, rotation: 0, y: 0 })
      gsap.set(b.t1, { clipPath: SHOW })  
      gsap.set(b.t2, { clipPath: SHOW })  
      arc.current.a0 = rest[0]  
      arc.current.a1 = rest[1]  
      drawArc()  
      if (arcRef.current) gsap.set(arcRef.current, { fill: tint })  
      shown.current = to  
      return  
    }  
    const a = parts(from)  
    const d = dirRef.current  
    const tl = gsap.timeline({ onComplete: () => { tlRef.current = null } })  
    tlRef.current = tl
    // plate: out over the top on the orbit, the next one swings in from the far side
    // (mode bibliothèque : les photos sont positionnées par les styles — transition CSS)
    if (!bibliotheque) {
      tl.to(a.orbit, { rotation: SWING * d, duration: 0.62, ease: "power2.in" }, 0)
        .set(a.orbit, { autoAlpha: 0, rotation: 0 }, 0.62)
        .fromTo(b.orbit, { autoAlpha: 1, rotation: -SWING * d }, { rotation: 0, duration: 0.95, ease: "power3.out" }, 0.3)
    }
    // title: thin line clips away to the right, heavy line to the left, then the next wipes in  
    tl.to(a.t1, { clipPath: HIDE_1, duration: 0.42, ease: "power2.in" }, 0)  
      .to(a.t2, { clipPath: HIDE_2, duration: 0.42, ease: "power2.in" }, 0.06)  
      .to(a.eye, { autoAlpha: 0, duration: 0.25 }, 0)  
      .set(a.head, { autoAlpha: 0 }, 0.5)  
      .set(b.head, { autoAlpha: 1 }, 0.5)  
      .fromTo(b.eye, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out" }, 0.55)  
      .fromTo(b.t1, { clipPath: HIDE_1 }, { clipPath: SHOW, duration: 0.7, ease: "power3.out" }, 0.55)  
      .fromTo(b.t2, { clipPath: HIDE_2 }, { clipPath: SHOW, duration: 0.7, ease: "power3.out" }, 0.62)  
    // card: cross-fade, the incoming rows rise in turn  
    tl.to(a.body, { autoAlpha: 0, y: -6, duration: 0.3, ease: "power1.in" }, 0.05)  
      .set(b.body, { autoAlpha: 1, y: 0 }, 0.4)  
    if (b.body) tl.fromTo(b.body.children, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.06, ease: "power2.out" }, 0.4)  
    // the band stretches along the orbit with the plates, then settles into the next dish's span, morphing colour  
    tl.to(arc.current, { a0: ARC_SWEEP[0], a1: ARC_SWEEP[1], duration: 0.6, ease: "power2.inOut", onUpdate: drawArc }, 0)  
      .to(arc.current, { a0: rest[0], a1: rest[1], duration: 0.85, ease: "power3.out", onUpdate: drawArc }, 0.6)  
    if (arcRef.current) tl.to(arcRef.current, { fill: tint, duration: 1.1, ease: "power1.inOut" }, 0.1)  
    shown.current = to  
  }, [index, n, dishes, bibliotheque])
  
  useEffect(() => () => { tlRef.current?.kill() }, [])  
  
  const select = (next: number, dir: 1 | -1) => {  
    if (next === indexRef.current) return  
    dirRef.current = dir  
    indexRef.current = next  
    setIndex(next)  
    onChangeRef.current?.(next)  
  }  
  
  // The page scroll drives the dish: the stage pins, one stretch of scroll per dish, snapping between them.  
  const steps = scrollSteps(n, loop)  
  useEffect(() => {  
    const track = trackRef.current  
    // Sur téléphone : pas de piste de scroll épinglée (la page « bougeait »),
    // le changement se fait par swipe horizontal, puces, points et flèches.
    if (!track || steps < 1 || compact) return  
    const trigger = ScrollTrigger.create({  
      trigger: track,  
      start: "top top",  
      end: "bottom bottom",  
      snap: { snapTo: 1 / steps, duration: { min: 0.3, max: 0.8 }, delay: 0.08, ease: "power2.inOut" },  
      onUpdate: (self) => {  
        // Looping: the last stretch shows the first dish, so jump back to the top unseen.  
        if (loop && self.progress >= 1 && self.direction > 0) {  
          segRef.current = 0  
          self.scroll(self.start + 1)  
          select(0, 1)  
          return  
        }  
        const seg = Math.round(self.progress * steps)  
        if (seg === segRef.current) return  
        const dir = seg > segRef.current ? 1 : -1  
        segRef.current = seg  
        select(wrapIndex(seg, n), dir)  
      },  
    })  
    // At the very top no scroll is left to fire onUpdate, so scrolling up there wraps round to the last dish.  
    // Deferred a frame so the browser's own wheel scroll has landed first.  
    let raf = 0  
    const onWheel = (e: WheelEvent) => {  
      const y = trigger.scroll()  
      if (!loop || e.deltaY >= 0 || y < trigger.start - 1 || y > trigger.start + 1) return  
      cancelAnimationFrame(raf)  
      raf = requestAnimationFrame(() => {  
        segRef.current = n - 1  
        trigger.scroll(trigger.start + ((trigger.end - trigger.start) * (n - 1)) / steps)  
        select(n - 1, -1)  
      })  
    }  
    window.addEventListener("wheel", onWheel, { passive: true })  
    stRef.current = trigger  
    return () => {  
      cancelAnimationFrame(raf)  
      window.removeEventListener("wheel", onWheel)  
      trigger.kill()  
      stRef.current = null  
    }  
  }, [steps, loop, n, compact])  
  
  // Buttons, keys and swipes jump to a dish and move the scroll to its stretch, so the two stay in step.  
  const go = (to: number, dir?: 1 | -1) => {  
    if (n < 2) return  
    const next = wrapIndex(to, n)  
    if (next === index) return  
    const st = stRef.current  
    const y = st ? st.scroll() : 0  
    if (st && y >= st.start - 1 && y <= st.end + 1) {  
      const seg = segmentFor(next, segRef.current, n, loop)  
      segRef.current = seg  
      st.scroll(st.start + ((st.end - st.start) * seg) / steps)  
    }  
    select(next, dir ?? stepDirection(index, next, n))  
  }  
  const step = (d: 1 | -1) => go(index + d, d)  
  
  const onKeyDown = (e: React.KeyboardEvent) => {  
    if (e.key === "ArrowRight") { e.preventDefault(); step(1) }  
    else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1) }  
  }  
  const onPointerDown = (e: React.PointerEvent) => { swipe.current = { x: e.clientX, y: e.clientY } }  
  const onPointerUp = (e: React.PointerEvent) => {  
    const s = swipe.current  
    swipe.current = null  
    if (!s) return  
    const dx = e.clientX - s.x  
    const dy = e.clientY - s.y
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) step(dx < 0 ? 1 : -1)
    else if (!compact && Math.abs(dy) > 40 && Math.abs(dy) > Math.abs(dx) * 1.4) step(dy < 0 ? 1 : -1)  
  }  
  
  const start = stripStart(index, n, VISIBLE)  
  const dish = dishes[index]  
  
  return (  
    <div ref={trackRef} className={"dsh-trk" + (className ? " " + className : "")} style={{ height: compact ? h : "calc(" + h + " * " + (1 + steps * SCROLL_PER_DISH) + ")" }}>  
    <div  
      ref={rootRef}
      className={"dsh-root" + (bibliotheque ? " dsh-bib" : "")}
      style={{ height: h }}  
      role="region"  
      aria-roledescription="carousel"  
      aria-label="Articles"  
      tabIndex={0}  
      onKeyDown={onKeyDown}  
    >  
      <style>  
        {(fontSrc ? "@font-face{font-family:" + FONT + ";src:url(" + fontSrc + ") format('woff2');font-weight:100 900;font-display:swap}" : "") + CSS}  
      </style>  
      {backdrop ? <img className="dsh-bd" src={backdrop} alt="" width={1200} height={900} /> : null}  
      {backdrop ? <div className="dsh-dim" /> : null}  
      {backdrop ? <div className="dsh-wash" /> : null}  
  
      <div className="dsh-canvas">  
        {bibliotheque ? (
          <div className="dsh-glow" aria-hidden="true" style={{ backgroundColor: dish ? dish.accent : "transparent" }} />
        ) : (
          <svg className="dsh-arc" viewBox="0 0 960 520" aria-hidden="true">
            <path ref={arcRef} style={{ opacity: 0.34 }} />
          </svg>
        )}
  
        {(onRetour || onPartager || favori) && (
          <div className="dsh-top">
            <div className="dsh-topg">
              {onRetour && (
                <button type="button" className="dsh-btn" aria-label="Retour" onClick={onRetour}>{Icon.back}</button>
              )}
            </div>
            <div className="dsh-topg">
              {favori && (
                <button type="button" className="dsh-btn dsh-fav" aria-label="Favori" aria-pressed={favori.actif}
                  onClick={() => dish && favori.onToggle(dish)}>{Icon.heart}</button>
              )}
              {onPartager && (
                <button type="button" className="dsh-btn" aria-label="Partager"
                  onClick={() => dish && onPartager(dish)}>{Icon.share}</button>
              )}
            </div>
          </div>
        )}  
  
        <div className="dsh-pager" role="tablist" aria-label="Choisir un article">  
          {dishes.map((d, i) => (  
            <button key={i} type="button" role="tab" className="dsh-btn dsh-dot" aria-selected={i === index}  
              aria-current={i === index ? "true" : undefined} aria-label={d.title + " " + d.subtitle} onClick={() => go(i)}>  
              <i />  
            </button>  
          ))}  
        </div>  
  
        <div className="dsh-plates" onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={() => (swipe.current = null)}>
          {dishes.map((d, i) => {
            if (!bibliotheque) {
              return (
                <div key={i} ref={(el) => { orbits.current[i] = el }} className="dsh-orbit" aria-hidden={i !== index}>
                  <img src={d.image} alt={d.alt ?? d.title + " " + d.subtitle} width={245} height={245} draggable={false} />
                </div>
              )
            }
            const dist = i - index
            const ad = Math.abs(dist)
            const cache = ad > 2
            const rot = Math.min(ad * 42, 52) * (dist > 0 ? 1 : -1)
            return (
              <div key={i} ref={(el) => { orbits.current[i] = el }} className="dsh-orbit"
                role="button" tabIndex={-1}
                aria-label={i === index ? d.alt ?? d.title + " " + d.subtitle : "Voir " + (d.alt ?? d.title + " " + d.subtitle)}
                aria-hidden={cache}
                onClick={() => { if (i !== index) go(i) }}
                style={{
                  transform: "translate(-50%,-50%) translateX(calc(" + dist + " * var(--esp,118px))) translateZ(" + -ad * 110 + "px) rotateY(" + rot + "deg) scale(" + (1 - Math.min(ad * 0.08, 0.22)) + ")",
                  opacity: cache ? 0 : 1 - ad * 0.18,
                  zIndex: 20 - ad,
                  pointerEvents: cache ? "none" : "auto",
                }}>
                {vtName && i === index ? (
                  <ViewTransition name={vtName} default="none" share="morph">
                    <img src={d.image} alt="" width={245} height={245} draggable={false} />
                  </ViewTransition>
                ) : (
                  <img src={d.image} alt="" width={245} height={245} draggable={false} />
                )}
              </div>
            )
          })}
        </div>
  
        <div className="dsh-head" aria-live="polite">  
          {dishes.map((d, i) => (  
            <div key={i} ref={(el) => { heads.current[i] = el }} className="dsh-hd" aria-hidden={i !== index}>  
              <p className="dsh-eye">{d.eyebrow ?? "#" + (i + 1) + " de la sélection"}</p>  
              <h2 style={{ margin: 0, font: "inherit" }}>  
                <span className="dsh-t1" style={{ fontSize: fitSize(d.title.length, 56, 330, 0.56) + "px" }}>{d.title}</span>  
                <span className="dsh-t2" style={{ fontSize: fitSize(d.subtitle.length, 62, 320, 0.64) + "px" }}>{d.subtitle}</span>  
              </h2>  
            </div>  
          ))}  
        </div>  
  
        {onOrder ? (  
          <div className="dsh-acts">  
            <button type="button" className="dsh-btn" onClick={() => dish && onOrder(dish, index)}>Voir le produit</button>  
          </div>  
        ) : null}  
  
        <div className="dsh-card">  
          <div className="dsh-tabs" role="tablist" aria-label="Dish details">  
            {["overview", "ingredients"].map((t) => (  
              <button key={t} type="button" role="tab" className="dsh-btn dsh-tab" aria-selected={tab === t} onClick={() => setTab(t)}>  
                {t === "overview" ? "Aperçu" : "Détails"}  
              </button>  
            ))}  
          </div>  
          <div className="dsh-bodies">  
            {dishes.map((d, i) => (  
              <div key={i} ref={(el) => { bodies.current[i] = el }} className="dsh-body" aria-hidden={i !== index}>  
                <div className="dsh-rate">  
                  <span
                    className="dsh-badge pop"
                    style={{
                      background: teinter(d.accent, 0.16),
                      boxShadow: "inset 0 0 0 1.5px " + teinter(d.accent, 0.45),
                    }}
                  >
                    <span className="dsh-num" style={{ color: assombrir(d.accent) }} aria-label={"Prix " + d.prix + " FCFA"}>{d.prix.toLocaleString("fr-FR")}<small>FCFA</small></span>
                  </span>
                  {d.prixBarre != null && d.prixBarre > d.prix && (
                    <span className="dsh-save">
                      <s>{d.prixBarre.toLocaleString("fr-FR")} F</s>
                      <b>Économisez {(d.prixBarre - d.prix).toLocaleString("fr-FR")} F · −{Math.round((1 - d.prix / d.prixBarre) * 100)}%</b>
                    </span>
                  )}
                  {(() => {
                    const t = choixPour(i, d);
                    const st = d.tailles?.find((x) => x.label === t)?.stock;
                    return st !== undefined && st <= 5 ? (
                      <span className={"dsh-urgence" + (st === 0 ? " dsh-urgence--vide" : "")}>
                        {st === 0 ? "Épuisé" : "Plus que " + st}
                      </span>
                    ) : null;
                  })()}
                </div>
                <p className="dsh-chef">{d.categorie}</p>
                <p className="dsh-kit">{d.boutique ?? "SOUKEYNA"}</p>
                {d.chips?.length ? (
                  <div className="dsh-chips">
                    {d.chips.map((c) => <span key={c} className="dsh-chip"><i />{c}</span>)}
                  </div>
                ) : null}
                {tab === "overview" || !d.attributs?.length ? (
                  <>
                    <p className="dsh-inct">Ce qui est inclus</p>
                    <p className="dsh-desc">{d.description}</p>
                    {d.checks?.length ? (
                      <ul className="dsh-checks">{d.checks.map((x) => <li key={x}>{Icon.check}{x}</li>)}</ul>
                    ) : null}
                  </>
                ) : (
                  <ul className="dsh-ing">{d.attributs.map((x) => <li key={x}>{x}</li>)}</ul>
                )}  
              </div>  
            ))}  
          </div>  
          {dish && (dishes.some((x) => x.swatch) || dish.tailles?.length || onAddToCart) ? (  
            <div className="dsh-pick">  
              {dishes.some((x) => x.swatch) ? (  
                <div className="dsh-swatches" role="group" aria-label="Couleur">  
                  {dishes.map((c, j) =>  
                    c.swatch ? (  
                      <button key={j} type="button" className="dsh-btn dsh-sw" style={{ background: c.swatch }}  
                        aria-label={c.subtitle} aria-current={j === index ? "true" : undefined}  
                        onClick={() => go(j)} />  
                    ) : null,  
                  )}  
                </div>  
              ) : null}  
              {dish.tailles?.length ? (  
                <>  
                  <p className="dsh-optlabel">{dish.tailleLabel ?? "Taille"}</p>  
                  <div className="dsh-opts" role="group" aria-label={dish.tailleLabel ?? "Taille"}>  
                    {dish.tailles.map((t) => (  
                      <button key={t.label} type="button" className="dsh-btn dsh-opt" disabled={t.stock === 0}  
                        aria-pressed={choixPour(index, dish) === t.label}  
                        onClick={() => setChoix((s) => ({ ...s, [index]: t.label }))}>  
                        {t.label}  
                      </button>  
                    ))}  
                  </div>  
                </>  
              ) : null}  
              {onAddToCart ? (  
                <>
                <button type="button" className={"dsh-btn dsh-add" + (ajoute === index ? " dsh-add--ok" : "")}
                  disabled={adding || (dish.tailles?.length ? dish.tailles.every((t) => t.stock === 0) : false)}  
                  onClick={async () => {
                    if (adding) return
                    setAddErr("")
                    setAdding(true)
                    try {
                      await onAddToCart(dish, index, choixPour(index, dish))
                      setAjoute(index)
                      if (!reducedRef.current) navigator.vibrate?.(12)
                    } catch (e) {
                      setAddErr(e instanceof Error && e.message ? e.message : "Réessayez")
                    } finally {
                      setAdding(false)
                    }
                  }}>  
                  {adding ? (
                    <><span className="dsh-spin" aria-hidden="true" /> Ajout…</>
                  ) : ajoute === index ? (
                    <>{Icon.check} Ajouté au panier</>
                  ) : <>{Icon.panier} Ajouter au panier</>}  
                </button>  
                {addErr ? <p className="dsh-err">{addErr}</p> : null}
                {ajoute === index ? (
                  <Link href="/panier" className="dsh-voirpanier">Voir le panier →</Link>
                ) : null}
                </>
              ) : null}  
            </div>  
          ) : null}  
        </div>  
  
        <div className="dsh-strip">  
          <button type="button" className="dsh-btn dsh-arrow" aria-label="Article précédent" onClick={() => step(-1)}>  
            {Icon.prev}
          </button>  
          <div className="dsh-win">  
            <div className="dsh-track" style={{ transform: "translateX(" + -start * ITEM + "px)" }}>  
              {dishes.map((d, i) => (  
                <div key={i} className="dsh-th">  
                  <button type="button" className="dsh-btn" aria-current={i === index ? "true" : undefined} onClick={() => go(i)}>  
                    <img src={d.image} alt="" width={56} height={56} draggable={false} />  
                    <span>{d.label ?? d.title + " " + d.subtitle}</span>  
                  </button>  
                </div>  
              ))}  
            </div>  
          </div>  
          <button type="button" className="dsh-btn dsh-arrow" aria-label="Article suivant" onClick={() => step(1)}>  
            {Icon.next}
          </button>  
        </div>  
  
      </div>  
      {n > 1 && (
        <span className="dsh-count" aria-hidden="true">{index + 1} / {n}</span>
      )}
      <p className="dsh-sr" aria-live="polite">{dish ? "Article " + (index + 1) + " sur " + n + " : " + dish.title + " " + dish.subtitle : ""}</p>  
    </div>  
    </div>  
  )  
}  
  
export default DishOrbitCarousel  
  
// Outfit (c) 2021 The Outfit Project Authors, SIL Open Font License 1.1.  
// Variable weight 100-900, subset to Basic Latin.  