import { ViewTransition } from "react";

// Re-monté à chaque navigation : fondu d'entrée de page + glissé
// directionnel (les liens typés nav-forward/nav-back glissent le contenu
// dans le sens de la navigation ; les autres transitions restent un fondu).
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <ViewTransition
      enter={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        default: "none",
      }}
      exit={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        default: "none",
      }}
      default="none"
    >
      <div className="page-fade">{children}</div>
    </ViewTransition>
  );
}
