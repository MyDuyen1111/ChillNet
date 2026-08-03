import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// ChillNet web client. Talks to the API gateway at :8080 through a dev proxy so
// the browser never has to deal with CORS during local development.
export default defineConfig({
	plugins: [react(), tailwindcss()],
	// These two are reached only from the lazy chat chunk, so Vite's dep scanner
	// misses them at startup and re-optimises the first time /messages is opened.
	// That invalidates the hash on the chunks the page already holds and the lazy
	// import rejects, blanking the app. Pre-bundling them up front avoids it.
	optimizeDeps: {
		include: ["sockjs-client", "@stomp/stompjs"],
	},
	server: {
		port: 5174,
		proxy: {
			"/api": {
				target: "http://localhost:8080",
				changeOrigin: true,
			},
			// STOMP-over-WebSocket endpoint for chat-service (through the gateway).
			"/ws": {
				target: "http://localhost:8086",
				changeOrigin: true,
				ws: true,
			},
		},
	},
});
