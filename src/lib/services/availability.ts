// An outage is latched until the user explicitly reloads to try the service again.
let unavailable = false;
const listeners = new Set<() => void>();
export class ServiceUnavailableError extends Error {
  constructor() {
    super("The live service is temporarily unavailable.");
    this.name = "ServiceUnavailableError";
  }
}
export const isServiceUnavailable = () => unavailable;
export function subscribeToService(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
export function markServiceUnavailable() {
  if (unavailable) return;
  unavailable = true;
  for (const listener of listeners) listener();
}
