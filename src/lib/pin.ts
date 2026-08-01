const KEY = "pos_admin_pin";
const DEFAULT_PIN = "1234";

export function getPin(): string {
  if (typeof window === "undefined") return DEFAULT_PIN;
  return window.localStorage.getItem(KEY) ?? DEFAULT_PIN;
}

export function setPin(pin: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, pin);
}

export function verifyPin(input: string): boolean {
  return input.trim() === getPin();
}
