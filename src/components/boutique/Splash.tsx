"use client";

import { useEffect, useState } from "react";
import { LoaderBalles } from "./LoaderBalles";

// Animation du logo : zoom + netteté à l'entrée, puis flottement léger.
const SPLASH_CSS = `
.skl-logo{animation:skl-logo-in .8s cubic-bezier(.34,1.35,.64,1) both,skl-float 2.4s ease-in-out .9s infinite}
@keyframes skl-logo-in{
0%{opacity:0;transform:scale(.55) translateY(18px);filter:blur(8px)}
55%{opacity:1;transform:scale(1.04) translateY(0);filter:blur(0)}
100%{opacity:1;transform:scale(1)}
}
@keyframes skl-float{
0%,100%{transform:translateY(0)}
50%{transform:translateY(-8px)}
}
.skl-loader-in{animation:skl-fade .45s ease .55s both}
@keyframes skl-fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
`;

// Écran de démarrage : logo animé + balles rebondissantes (~1,4 s),
// puis fondu sortant. Une seule fois par session de navigation.
export function Splash() {
  const [fondu, setFondu] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("skl-splash")) return;
    sessionStorage.setItem("skl-splash", "1");
    setVisible(true);
    const fonduTimer = setTimeout(() => setFondu(true), 1100);
    const finTimer = setTimeout(() => setVisible(false), 1600);
    return () => {
      clearTimeout(fonduTimer);
      clearTimeout(finTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden={fondu}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-10 bg-blanc transition-opacity duration-500 ${
        fondu ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <style>{SPLASH_CSS}</style>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-soukeyna.png"
        alt="Soukeyna Styl'"
        className="skl-logo h-24 w-auto max-w-[75vw] object-contain"
      />
      <div className="skl-loader-in">
        <LoaderBalles />
      </div>
    </div>
  );
}
