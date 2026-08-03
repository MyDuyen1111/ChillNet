// sockjs-client references the Node `global` object, which does not exist in the
// browser build. Aliasing it to `window` avoids a runtime ReferenceError.
// This module is imported BEFORE sockjs-client so the shim runs first.
if (typeof window !== "undefined" && typeof window.global === "undefined") {
	window.global = window;
}
