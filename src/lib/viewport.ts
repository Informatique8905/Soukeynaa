// iOS < 15.4 / vieux Chrome ignorent svh/dvh/lvh : une déclaration en svh
// est abandonnée entièrement et la hauteur tombe à auto (composants
// écrasés). On rebascule sur vh quand l'unité n'est pas supportée.
export function hauteurViewport(h: string): string {
  if (typeof CSS === "undefined" || CSS.supports("height", "1svh")) return h;
  return h.replace(/svh|dvh|lvh/g, "vh");
}
