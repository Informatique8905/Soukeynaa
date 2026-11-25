"use client";

// LiquidTabBar (web) — portage HTML/SVG/rAF de la version Flutter/RN.
// La bulle plonge dans la barre, le creux glisse comme un liquide
// (ressort amorti + sillage), puis la bulle ressort sous le nouvel onglet.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export const LIQUID_DEFAULT_CFG = {
  R: 24, gap: 5, lift: 4, shoulder: 0.75, barH: 62,
  zeta: 0.7, omega: 14.66,
  sinkMs: 180, moveDelayMs: 90, emergeAfterMs: 210, emergeMs: 340, settleMs: 250,
  troughR: 1.05, troughD: 0.9, stretch: 0.3, squash: 0.2,
  wake: 0.22, ripple: 0.2, iconFloat: 0.35,
};
export type LiquidCfg = typeof LIQUID_DEFAULT_CFG;

export type LiquidTab = { label: string; href?: string; badge?: number; icon?: ReactNode };

/* ============================ CORE (fonctions pures) ============================ */
type Layout = { W: number; H: number; barTop: number; slotW: number; xs: number[] };
type Snap = { c: number; cv: number; scale: number; by: number; m: number; icon: number; iconAlpha: number };
type Anim = { toIndex: number; toX: number; from: Snap };
type Ripple = { x: number; a: number; s: number };
type Frame = {
  c: number; cv: number; m: number; rho: number; cy: number; theta: number; sw: number;
  sx: number; sy: number; hw: number; ripples: Ripple[];
  bubble: { x: number; y: number; scale: number; icon: number; iconAlpha: number }; done: boolean;
};

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const easeInCubic = (t: number) => t * t * t;
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOutBack = (t: number, s: number) => {
  const u = t - 1;
  return 1 + (s + 1) * u * u * u + s * u * u;
};

function spring(t: number, x0: number, v0: number, target: number, zeta: number, omega: number) {
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  const a = zeta * omega;
  const A = x0 - target;
  const B = (v0 + a * A) / wd;
  const e = Math.exp(-a * t), c = Math.cos(wd * t), s = Math.sin(wd * t);
  return { x: target + e * (A * c + B * s), v: e * ((B * wd - a * A) * c - (A * wd + a * B) * s) };
}

export function timeline(anim: Anim, cfg: LiquidCfg) {
  const s0 = anim.from.scale;
  const sinkDur = cfg.sinkMs * s0;
  const moveStart = s0 < 0.01 || Math.abs(anim.from.cv) > 1 ? 0 : cfg.moveDelayMs * s0;
  const emergeStart = moveStart + cfg.emergeAfterMs;
  return { sinkDur, moveStart, emergeStart, end: emergeStart + cfg.emergeMs + cfg.settleMs };
}

function computeFrame(t: number, anim: Anim, cfg: LiquidCfg, L: Layout): Frame {
  const tl = timeline(anim, cfg);
  const R = cfg.R, f = anim.from;
  const done = t >= tl.end;

  // a) position du creux = ressort amorti
  let c = f.c, cv = 0;
  if (done) c = anim.toX;
  else if (t > tl.moveStart) {
    const sp = spring((t - tl.moveStart) / 1000, f.c, f.cv, anim.toX, cfg.zeta, cfg.omega);
    c = sp.x; cv = sp.v;
  }

  // b) morph berceau (m=0) <-> creux liquide (m=1)
  const e = clamp01((t - tl.emergeStart) / cfg.emergeMs);
  const mIn = lerp(f.m, 1, easeInOutCubic(clamp01((t - 0.35 * cfg.sinkMs) / (0.65 * cfg.sinkMs + 60))));
  const m = done ? 0 : mIn * (1 - easeInOutCubic(e));

  // c) forme : arc + épaules en S, étirée selon la vitesse ; sillage derrière
  const vn = done ? 0 : clamp01(Math.abs(cv) / (9 * L.slotW));
  const rho = lerp(R + cfg.gap, R * cfg.troughR, m);
  const cy = lerp(-cfg.lift, R * cfg.troughD - R * cfg.troughR, m);
  const theta = (lerp(52, 50, m) * Math.PI) / 180;
  const sw = R * lerp(cfg.shoulder, cfg.shoulder * 1.2, m);
  const sx = 1 + cfg.stretch * vn;
  const sy = 1 - cfg.squash * vn;
  const hw = (rho * Math.sin(theta) + sw) * sx;
  const dir = anim.toX >= f.c ? 1 : -1;
  const dist = clamp01(Math.abs(anim.toX - f.c) / L.slotW);
  const wp = clamp01((t - tl.moveStart) / (cfg.emergeAfterMs + 0.7 * cfg.emergeMs));
  const env = done ? 0 : Math.pow(Math.sin(Math.PI * wp), 0.8) * dist;
  const ripples = [
    { x: c - dir * (hw + R * 0.25), a: -R * cfg.wake * env, s: R * 0.6 },
    { x: c - dir * (hw + R * 1.4), a: R * cfg.ripple * env, s: R * 0.5 },
  ];

  // d) bulle : plonge -> cachée -> ressort
  const restY = L.barTop - cfg.lift;
  const lowY = L.barTop + R * 1.2;
  let scale: number, by: number, icon: number, iconAlpha: number;
  if (done) {
    scale = 1; by = restY; icon = anim.toIndex; iconAlpha = 1;
  } else if (t < tl.emergeStart) {
    const s = tl.sinkDur > 0 ? clamp01(t / tl.sinkDur) : 1;
    scale = f.scale * (1 - easeInCubic(s));
    by = lerp(f.by, lowY, s * s);
    icon = f.icon;
    iconAlpha = f.iconAlpha * (1 - clamp01((s - 0.3) / 0.5));
  } else {
    scale = easeOutBack(e, 1.4);
    by = lerp(lowY, restY, easeOutBack(e, 1.1));
    icon = anim.toIndex;
    iconAlpha = clamp01((e - 0.1) / 0.3);
  }
  return { c, cv, m, rho, cy, theta, sw, sx, sy, hw, ripples, bubble: { x: c, y: by, scale, icon, iconAlpha }, done };
}

function notchDepth(dx: number, F: Frame) {
  const u = Math.abs(dx) / F.sx;
  const xt = F.rho * Math.sin(F.theta);
  let d = 0;
  if (u <= xt) d = F.cy + Math.sqrt(F.rho * F.rho - u * u);
  else if (u < xt + F.sw) {
    const s = (u - xt) / F.sw;
    const dt = F.cy + F.rho * Math.cos(F.theta);
    const m0 = -Math.tan(F.theta) * F.sw;
    d = (2 * s * s * s - 3 * s * s + 1) * dt + (s * s * s - 2 * s * s + s) * m0;
  }
  return Math.max(0, d) * F.sy;
}

function edgeDepth(x: number, F: Frame) {
  let d = notchDepth(x - F.c, F);
  for (const r of F.ripples) {
    if (r.a !== 0) d += r.a * Math.exp(-Math.pow((x - r.x) / r.s, 2));
  }
  return d;
}

function barPath(F: Frame, L: Layout) {
  const l = F.c - F.hw - 2, r = F.c + F.hw + 2;
  let d = `M0,${L.H}`;
  for (let x = 0; x < L.W; x += x >= l && x <= r ? 1 : 3) d += `L${x},${(L.barTop + edgeDepth(x, F)).toFixed(2)}`;
  d += `L${L.W},${(L.barTop + edgeDepth(L.W, F)).toFixed(2)}L${L.W},${L.H}Z`;
  return d;
}

function makeLayout(W: number, n: number, cfg: LiquidCfg, bottomInset: number): Layout {
  const barTop = cfg.R + cfg.lift + 16;
  const slotW = W / n;
  return { W, H: barTop + cfg.barH + bottomInset, barTop, slotW, xs: Array.from({ length: n }, (_, i) => slotW * (i + 0.5)) };
}

function restAnim(i: number, L: Layout, cfg: LiquidCfg): Anim {
  return { toIndex: i, toX: L.xs[i], from: { c: L.xs[i], cv: 0, scale: 1, by: L.barTop - cfg.lift, m: 0, icon: i, iconAlpha: 1 } };
}

/* ============================ Composant ============================ */

const CSS =
  ".ltb{position:relative;width:100%}" +
  ".ltb>svg{position:absolute;left:0;top:0;filter:drop-shadow(0 -8px 18px rgba(15,23,18,.10));pointer-events:none}" +
  ".ltb-rect{position:absolute;left:0;right:0;bottom:0;box-shadow:0 -8px 18px rgba(15,23,18,.07)}" +
  ".ltb-ico{position:absolute;left:0;top:0;width:24px;height:24px;pointer-events:none;will-change:transform,opacity;display:flex;align-items:center;justify-content:center}" +
  ".ltb-slots{position:absolute;left:0;right:0;bottom:0;display:flex}" +
  ".ltb-slot{position:relative;flex:1;min-width:0}" +
  ".ltb-hit{position:absolute;inset:0;display:block;width:100%;height:100%;-webkit-tap-highlight-color:transparent}" +
  ".ltb-fico{position:absolute;left:50%;top:16px;transform:translateX(-50%);pointer-events:none;color:var(--ltb-ico,#9aa1a8)}" +
  ".ltb-label{position:absolute;left:0;right:0;bottom:9px;text-align:center;font-size:10px;font-weight:500;color:var(--ltb-ico,#9aa1a8);pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
  ".ltb-label.on{color:var(--ltb-act,#141414);font-weight:600}" +
  ".ltb-badge{position:absolute;left:50%;top:8px;margin-left:8px;min-width:16px;height:16px;padding:0 4px;border-radius:99px;background:#141414;color:#fff;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;pointer-events:none}";

function TabMarque({ tab }: { tab: LiquidTab }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-6 place-items-center text-[13px] font-bold leading-none [&>svg]:size-[18px]"
    >
      {tab.icon ?? tab.label.charAt(0)}
    </span>
  );
}

export type LiquidTabBarProps = {
  items: LiquidTab[];
  /** Onglet actif (contrôlé par le parent, ex. pathname). */
  index: number;
  /** Appelé au tap sur un onglet (le parent navigue). */
  onSelect?: (i: number) => void;
  /** Zone cliquable custom (ex. <Link>) — reçoit item/index/active/onPress. */
  renderSlot?: (slot: { item: LiquidTab; i: number; active: boolean; onPress: () => void }) => ReactNode;
  barColor?: string;
  iconColor?: string;
  activeIconColor?: string;
  /** Marge basse intégrée à la barre (px). Gérer plutôt la safe-area en CSS parent. */
  bottomInset?: number;
  config?: Partial<LiquidCfg>;
  className?: string;
};

export function LiquidTabBar({
  items,
  index,
  onSelect,
  renderSlot,
  barColor = "#ffffff",
  iconColor = "#9aa1a8",
  activeIconColor = "#141414",
  bottomInset = 0,
  config,
  className,
}: LiquidTabBarProps) {
  const cfg = useMemo(() => ({ ...LIQUID_DEFAULT_CFG, ...config }), [config]);
  const [L, setL] = useState<Layout | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const circRef = useRef<SVGCircleElement>(null);
  const barRefs = useRef([] as (HTMLDivElement | null)[]);
  const bubRefs = useRef([] as (HTMLDivElement | null)[]);
  const layoutRef = useRef<Layout | null>(null);
  const anim = useRef<Anim | null>(null);
  const tRef = useRef(1e9);
  const t0Ref = useRef(0);
  const rafRef = useRef(0);
  const reduced = useRef(false);
  const iconY = cfg.barH / 2 - 6;

  const paint = useCallback(() => {
    const a = anim.current, l = layoutRef.current;
    if (!a || !l) return;
    const F = computeFrame(tRef.current, a, cfg, l);
    pathRef.current?.setAttribute("d", barPath(F, l));
    if (circRef.current) {
      circRef.current.setAttribute("cx", F.bubble.x.toFixed(2));
      circRef.current.setAttribute("cy", F.bubble.y.toFixed(2));
      circRef.current.setAttribute("r", Math.max(0, cfg.R * F.bubble.scale).toFixed(2));
    }
    for (let i = 0; i < items.length; i++) {
      const el = barRefs.current[i];
      if (el) {
        const near = clamp01(1 - Math.abs(F.bubble.x - l.xs[i]) / (l.slotW * 0.5));
        const dy = edgeDepth(l.xs[i], F) * cfg.iconFloat;
        el.style.opacity = String(1 - Math.min(1, F.bubble.scale) * near);
        el.style.transform = `translate(${(l.xs[i] - 12).toFixed(2)}px,${(l.barTop + iconY + dy - 12).toFixed(2)}px)`;
      }
      const b = bubRefs.current[i];
      if (b) {
        const show = F.bubble.icon === i && F.bubble.scale > 0.01;
        b.style.opacity = show ? String(F.bubble.iconAlpha) : "0";
        b.style.transform = `translate(${(F.bubble.x - 12).toFixed(2)}px,${(F.bubble.y - 12).toFixed(2)}px) scale(${F.bubble.scale.toFixed(3)})`;
      }
    }
  }, [cfg, items.length, iconY]);

  const startRaf = useCallback(() => {
    if (rafRef.current) return;
    t0Ref.current = performance.now();
    function step(now: number) {
      tRef.current = now - t0Ref.current;
      paint();
      const a = anim.current, l = layoutRef.current;
      if (a && l && tRef.current >= timeline(a, cfg).end) {
        tRef.current = 1e9;
        rafRef.current = 0;
        paint();
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
  }, [cfg, paint]);

  const go = useCallback((i: number) => {
    const a = anim.current, l = layoutRef.current;
    if (!a || !l || i === a.toIndex) return;
    const F = computeFrame(tRef.current, a, cfg, l);
    const from: Snap = F.done
      ? restAnim(a.toIndex, l, cfg).from
      : { c: F.c, cv: F.cv, scale: F.bubble.scale, by: F.bubble.y, m: F.m, icon: F.bubble.icon, iconAlpha: F.bubble.iconAlpha };
    anim.current = { toIndex: i, toX: l.xs[i], from };
    if (reduced.current) {
      tRef.current = 1e9;
      paint();
      return;
    }
    tRef.current = 0;
    startRaf();
  }, [cfg, paint, startRaf]);

  const indexRef = useRef(index);

  // Mesure + re-mesure (resize, changement du nombre d'onglets)
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rebuild = (W: number) => {
      const nl = makeLayout(W, items.length, cfg, bottomInset);
      layoutRef.current = nl;
      anim.current = restAnim(Math.max(0, Math.min(indexRef.current, items.length - 1)), nl, cfg);
      tRef.current = 1e9;
      setL(nl);
      paint();
    };
    rebuild(el.clientWidth);
    const ro = new ResizeObserver(() => rebuild(el.clientWidth));
    ro.observe(el);
    return () => { ro.disconnect(); if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length, cfg, bottomInset]);

  // index contrôlé par le parent → rejoue la transition
  useEffect(() => {
    indexRef.current = index;
    go(index);
  }, [index, go]);

  // pression immédiate (avant que le parent ne remonte le nouvel index)
  const [presse, setPresse] = useState<{ i: number; n: number } | null>(null);
  useEffect(() => {
    if (presse !== null) go(presse.i);
  }, [presse, go]);

  const height = cfg.R + cfg.lift + 16 + cfg.barH + bottomInset;

  return (
    <div
      ref={hostRef}
      className={"ltb" + (className ? " " + className : "")}
      style={{ height, ["--ltb-ico" as string]: iconColor, ["--ltb-act" as string]: activeIconColor }}
    >
      <style>{CSS}</style>
      {!L && <div className="ltb-rect" style={{ height: cfg.barH + bottomInset, background: barColor }} />}
      {L && (
        <svg width={L.W} height={L.H} viewBox={`0 0 ${L.W} ${L.H}`} aria-hidden="true">
          <path ref={pathRef} fill={barColor} />
          <circle ref={circRef} fill={barColor} />
        </svg>
      )}
      {L && items.map((it, i) => (
        <div key={`b${i}`} ref={(el) => { barRefs.current[i] = el }} className="ltb-ico" style={{ color: iconColor }}>
          <TabMarque tab={it} />
        </div>
      ))}
      {L && items.map((it, i) => (
        <div key={`a${i}`} ref={(el) => { bubRefs.current[i] = el }} className="ltb-ico" style={{ color: activeIconColor, opacity: 0 }}>
          <TabMarque tab={it} />
        </div>
      ))}
      <div className="ltb-slots" style={{ height: cfg.barH + bottomInset }}>
        {items.map((it, i) => {
          const active = i === index;
          const press = () => { setPresse((p) => ({ i, n: (p?.n ?? 0) + 1 })); onSelect?.(i); };
          return (
            <div key={`s${i}`} className="ltb-slot">
              {renderSlot ? (
                renderSlot({ item: it, i, active, onPress: press })
              ) : (
                <button type="button" className="ltb-hit" aria-label={it.label}
                  aria-current={active ? "page" : undefined} onClick={press} />
              )}
              {!L && <span className="ltb-fico"><TabMarque tab={it} /></span>}
              <span className={"ltb-label" + (active ? " on" : "")}>{it.label}</span>
              {typeof it.badge === "number" && it.badge > 0 && (
                <span className="ltb-badge">{it.badge > 9 ? "9+" : it.badge}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default LiquidTabBar;
