const KEY = "pos_admin_pin";
const DEFAULT_PIN = "1234";

export function verifyPin(input: string): boolean {
  if (typeof window === "undefined") return input.trim() === DEFAULT_PIN;
  const stored = window.localStorage.getItem(KEY);
  return input.trim() === (stored ?? DEFAULT_PIN);
}
