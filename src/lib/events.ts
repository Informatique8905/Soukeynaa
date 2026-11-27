import { EventEmitter } from "events";

// Bus d'événements interne (déploiement mono-instance Railway) : les
// mutations de commandes/paiements y publient pour déclencher l'envoi
// « maj » sur les flux SSE ouverts. globalThis : un seul bus partagé
// entre les routes malgré le code-splitting et le HMR.
const g = globalThis as { __soukeynaBus?: EventEmitter };
export const bus = (g.__soukeynaBus ??= new EventEmitter());
bus.setMaxListeners(300); // plusieurs flux SSE simultanés par instance

export type Changement = {
  commandeId?: number;
  clientUserId?: number | null;
};

const EVT = "maj";

/** Publie un changement — à appeler APRÈS le commit de la transaction. */
export function signalerChangement(e: Changement = {}) {
  bus.emit(EVT, e);
}

/** Variante différée : sûre à appeler DANS un $transaction — l'émission
 * part sur le macrotask suivant, donc après la résolution (commit) du
 * transaction englobante. */
export function signalerChangementDiffere(e: Changement = {}) {
  setTimeout(() => bus.emit(EVT, e), 0);
}

export { EVT };
