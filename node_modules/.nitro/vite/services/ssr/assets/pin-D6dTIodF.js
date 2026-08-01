//#region src/lib/pin.ts
var KEY = "pos_admin_pin";
var DEFAULT_PIN = "1234";
function getPin() {
	if (typeof window === "undefined") return DEFAULT_PIN;
	return window.localStorage.getItem(KEY) ?? DEFAULT_PIN;
}
function setPin(pin) {
	if (typeof window === "undefined") return;
	window.localStorage.setItem(KEY, pin);
}
function verifyPin(input) {
	return input.trim() === getPin();
}
//#endregion
export { verifyPin as n, setPin as t };
